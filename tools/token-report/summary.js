"use strict";
const fs = require("node:fs");
// prompt:/cost: groups are optional so legacy per-message lines (pre
// per-prompt format) still parse — each becomes its own single-step group.
// Leading group captures the entry date (YYYY-MM-DD) so date windows work.
const ENTRY_RE = /^(\d{4}-\d{2}-\d{2})\s+[—-]\s+(?:(\d{2}:\d{2}:\d{2})\s+)?(?:agent:(\S+)\s+)?session:(\S+)\s+msg:(\S+)(?: prompt:(\S+))?(?: cost:([\d.]+))?\s+model:(\S+)\s+total:(\d+)\s+\(in:(\d+)\s+out:(\d+)\s+reason:(\d+)\s+cache-read:(\d+)\s+cache-write:(\d+)\)/;

// Rows are capped so header + rows + rollup + flag stay under 15 lines.
const MAX_ROWS = 10;
const DBL_TOLERANCE = 0.01;

function parseLine(line) {
  const m = ENTRY_RE.exec(line.trim());
  if (!m) return null;
  const [, date, time, agent, sessionID, messageID, promptID, cost, model, total, input, output, reasoning, cacheRead, cacheWrite] = m;
  return { date, time: time || null, at: time ? `${date} ${time}` : date,
    agent: agent || "unknown", sessionID, messageID,
    promptID: promptID || null, cost: cost === undefined ? 0 : +cost,
    model, total: +total, input: +input, output: +output, reasoning: +reasoning,
    cacheRead: +cacheRead, cacheWrite: +cacheWrite, raw: line.trim() };
}

function cutoffDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

// in ≈ cache-read means one side may be reported twice; 1% tolerance so
// rounding noise doesn't trip the flag.
function possibleDoubleCount(g) {
  const hi = Math.max(g.input, g.cacheRead);
  return hi > 0 && Math.abs(g.input - g.cacheRead) / hi <= DBL_TOLERANCE;
}

const fmt = (n) => Math.round(n).toLocaleString("en-US");
const pad = (s, w) => String(s).padEnd(w);
const padL = (s, w) => String(s).padStart(w);

function getTokensSummary(vaultPath, { limit = 300, kind = "last", n = MAX_ROWS } = {}) {
  try {
    if (typeof vaultPath !== "string" || vaultPath.includes("\0")) throw new Error("invalid vault path");
    let text;
    try { text = fs.readFileSync(vaultPath, "utf8"); } catch { return "No token data yet."; }
    const entries = text.split("\n").map(parseLine).filter(Boolean).slice(0, limit);
    if (entries.length === 0) return "No token data yet.";
    // Window: newest N prompt groups, or every request dated within N days.
    // Group steps per prompt (newest-first by first appearance). Legacy lines
    // without prompt attribution each form their own single-step group.
    const inWindow = kind === "days"
      ? entries.filter((e) => e.date >= cutoffDate(n))
      : entries;
    const groups = [];
    const byKey = new Map();
    for (const e of inWindow) {
      const key = e.promptID && e.promptID !== "unknown"
        ? `${e.sessionID} ${e.promptID}`
        : `${e.sessionID} msg:${e.messageID}`;
      let g = byKey.get(key);
      if (!g) { g = { key, prompt: e.promptID && e.promptID !== "unknown" ? e.promptID : e.messageID, head: e, steps: 0, total: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }; byKey.set(key, g); groups.push(g); }
      g.steps += 1;
      g.total += e.total; g.input += e.input; g.output += e.output; g.reasoning += e.reasoning;
      g.cacheRead += e.cacheRead; g.cacheWrite += e.cacheWrite; g.cost += e.cost;
    }
    if (groups.length === 0) return "No token data yet.";
    // For "last N" the window is the row count; for "days" rows are capped.
    const rows = kind === "days" ? groups.slice(0, MAX_ROWS) : groups.slice(0, n);
    const flagged = rows.filter(possibleDoubleCount);
    const lines = rows.map((g) => {
      const id = g.prompt.replace(/^msg_/, "").slice(0, 8);
      return `${pad(g.head.at, 19)} ${pad(id, 8)} steps:${padL(g.steps, 2)} total:${padL(fmt(g.total), 9)} cache-read/step:${padL(fmt(g.cacheRead / g.steps), 8)} fresh-in/step:${padL(fmt(g.input / g.steps), 8)}${possibleDoubleCount(g) ? " !dbl" : ""}`;
    });
    // Rollup covers every request of the newest session inside the window,
    // not just the displayed rows.
    const newest = rows[0].head.sessionID;
    const mine = groups.filter((g) => g.head.sessionID === newest);
    const roll = mine.reduce((a, g) => ({
      steps: a.steps + g.steps, total: a.total + g.total,
      input: a.input + g.input, cacheRead: a.cacheRead + g.cacheRead,
    }), { steps: 0, total: 0, input: 0, cacheRead: 0 });
    const sessions = new Set(groups.map((g) => g.head.sessionID)).size;
    const model = rows[0].head.model;
    const span = `${groups[groups.length - 1].head.at} → ${rows[0].head.at}`;
    const scope = kind === "days" ? `last ${n} days` : `last ${n} requests`;
    const header = [
      `window: ${scope} | ${span} | ${sessions} session${sessions === 1 ? "" : "s"} | model ${model}`,
      `total = sum across all steps, not context size | rows ${rows.length} of ${groups.length} requests | scanned ${entries.length} of ${entries.length === limit ? `${limit}+` : entries.length} retained entries`,
    ].join("\n");
    const rollup = `rollup ${newest}: requests:${mine.length} steps:${roll.steps} total(sum of steps):${fmt(roll.total)} cache-read/step:${fmt(roll.cacheRead / roll.steps)} fresh-in/step:${fmt(roll.input / roll.steps)}`;
    const out = [header, ...lines, rollup];
    if (flagged.length > 0) out.push(`flag: possible double-count — in within 1% of cache-read on ${flagged.length} request(s): ${flagged.map((g) => g.head.at).join(", ")}`);
    return out.join("\n");
  } catch (err) {
    return `Token summary unavailable: ${err && err.message}`;
  }
}

if (require.main === module) {
  const { resolveVaultPath } = require("./vault-log.js");
  const argv = process.argv.slice(2);
  const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? +argv[i + 1] : dflt;
  };
  const kind = argv.includes("--days") ? "days" : "last";
  const n = Math.max(1, (kind === "days" ? opt("--days", 7) : opt("--last", MAX_ROWS)) || (kind === "days" ? 7 : MAX_ROWS));
  const positional = argv.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  process.stdout.write(getTokensSummary(resolveVaultPath(positional[0]), { kind, n }) + "\n");
}

module.exports = { getTokensSummary, parseLine };