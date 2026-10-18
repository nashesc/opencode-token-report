"use strict";
const fs = require("node:fs");
// prompt:/cost: groups are optional so legacy per-message lines (pre
// per-prompt format) still parse — each becomes its own single-step group.
// Leading group captures the entry date (YYYY-MM-DD) so date windows work.
const ENTRY_RE = /^(\d{4}-\d{2}-\d{2})\s+[—-]\s+(?:(\d{2}:\d{2}:\d{2})\s+)?(?:agent:(\S+)\s+)?session:(\S+)\s+msg:(\S+)(?: prompt:(\S+))?(?: cost:([\d.]+))?\s+model:(\S+)\s+total:(\d+)\s+\(in:(\d+)\s+out:(\d+)\s+reason:(\d+)\s+cache-read:(\d+)\s+cache-write:(\d+)\)/;

// Hard output budget: 2 header lines + rows + one rollup per session with a
// printed row + 1 double-count flag line. Rows are dropped oldest-first until
// the budget holds for every flag combination.
const MAX_LINES = 15;
const HEADER_LINES = 2;
const FLAG_LINES = 1;
// in ≈ cache-read means one side may be reported twice; 1% tolerance so
// rounding noise doesn't trip the flag.
const DBL_TOLERANCE = 0.01;
const DEFAULT_ROWS = 10;
// Historical scan floor: never read fewer than this many entries, and never
// more than the window can use.
const SCAN_FLOOR = 50;
const SCAN_CEIL = 300;

function parseLine(line) {
  const m = ENTRY_RE.exec(line.trim());
  if (!m) return null;
  const [, date, time, agent, sessionID, messageID, promptID, cost, model, total, input, output, reasoning, cacheRead, cacheWrite] = m;
  return { date, time: time || null, at: time ? `${date} ${time}` : date,
    sortKey: `${date} ${time || "00:00:00"}`,
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

// Newest last-step first. sortKey is "YYYY-MM-DD HH:MM:SS", so a plain string
// compare is chronological regardless of the order lines sit in the file.
const newestFirst = (a, b) => (a.lastKey < b.lastKey ? 1 : a.lastKey > b.lastKey ? -1 : 0);

// One rollup per session that has at least one printed row, covering all of
// that session's requests in the window (not just the printed ones).
function rollupFor(rows, groups) {
  const agg = new Map();
  for (const g of rows) {
    if (!agg.has(g.session)) agg.set(g.session, { session: g.session, requests: 0, steps: 0, total: 0, input: 0, cacheRead: 0, loKey: null, loAt: null, hiKey: null, hiAt: null });
  }
  for (const g of groups) {
    const a = agg.get(g.session);
    if (!a) continue;
    a.requests += 1;
    a.steps += g.steps; a.total += g.total; a.input += g.input; a.cacheRead += g.cacheRead;
    if (a.loKey === null || g.firstKey < a.loKey) { a.loKey = g.firstKey; a.loAt = g.firstAt; }
    if (a.hiKey === null || g.lastKey > a.hiKey) { a.hiKey = g.lastKey; a.hiAt = g.lastAt; }
  }
  return [...agg.values()].sort((a, b) => (a.hiKey < b.hiKey ? 1 : a.hiKey > b.hiKey ? -1 : 0));
}

function getTokensSummary(vaultPath, opts = {}) {
  const o = opts || {};
  const { limit = SCAN_CEIL, kind = "last", days = 7 } = o;
  const maxPrompts = Math.max(1, o.maxPrompts || o.n || DEFAULT_ROWS);
  try {
    if (typeof vaultPath !== "string" || vaultPath.includes("\0")) throw new Error("invalid vault path");
    let text;
    try { text = fs.readFileSync(vaultPath, "utf8"); } catch { return "No token data yet."; }
    const entries = text.split("\n").map(parseLine).filter(Boolean).slice(0, limit);
    if (entries.length === 0) return "No token data yet.";
    // Window: newest N requests, or every request dated within N days.
    const inWindow = kind === "days"
      ? entries.filter((e) => e.date >= cutoffDate(days))
      : entries;
    // Group steps per prompt. Legacy lines without prompt attribution each
    // form their own single-step group. A group's first/last step time is
    // derived from the values, not from file order, so an ascending vault
    // (the archive) groups identically to a newest-first one.
    const groups = [];
    const byKey = new Map();
    for (const e of inWindow) {
      const key = e.promptID && e.promptID !== "unknown"
        ? `${e.sessionID} ${e.promptID}`
        : `${e.sessionID} msg:${e.messageID}`;
      let g = byKey.get(key);
      if (!g) {
        g = { key, prompt: e.promptID && e.promptID !== "unknown" ? e.promptID : e.messageID,
          session: e.sessionID, model: e.model,
          firstKey: e.sortKey, firstAt: e.at, lastKey: e.sortKey, lastAt: e.at,
          steps: 0, total: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
        byKey.set(key, g); groups.push(g);
      }
      g.steps += 1;
      g.total += e.total; g.input += e.input; g.output += e.output; g.reasoning += e.reasoning;
      g.cacheRead += e.cacheRead; g.cacheWrite += e.cacheWrite;
      if (e.sortKey < g.firstKey) { g.firstKey = e.sortKey; g.firstAt = e.at; }
      if (e.sortKey > g.lastKey) { g.lastKey = e.sortKey; g.lastAt = e.at; }
    }
    if (groups.length === 0) return "No token data yet.";
    groups.sort(newestFirst);
    const wanted = kind === "days" ? groups.length : Math.min(maxPrompts, groups.length);
    let rows = groups.slice(0, wanted);
    let roll = rollupFor(rows, groups);
    // Fit the budget: dropping a row can also drop a whole session's rollup,
    // so the cost is recomputed until it settles.
    while (rows.length > 1 &&
      HEADER_LINES + rows.length + roll.length + FLAG_LINES + (rows.length < wanted ? 1 : 0) > MAX_LINES) {
      rows = rows.slice(0, rows.length - 1);
      roll = rollupFor(rows, groups);
    }
    const flagged = rows.filter(possibleDoubleCount);
    const rowLines = rows.map((g) =>
      `${pad(g.lastAt, 19)} ${pad(g.prompt, 30)} steps:${padL(g.steps, 2)} total:${padL(fmt(g.total), 11)} cache-read/step:${padL(fmt(g.cacheRead / g.steps), 9)} fresh-in/step:${padL(fmt(g.input / g.steps), 9)}${possibleDoubleCount(g) ? " !dbl" : ""}`);
    if (rows.length < wanted) rowLines.push(`+${wanted - rows.length} more rows (oldest of ${groups.length} requests)`);
    // Header range comes from the printed rows only, min → max, so it can
    // never come out reversed.
    let lo = rows[0];
    let hi = rows[0];
    for (const g of rows) {
      if (g.firstKey < lo.firstKey) lo = g;
      if (g.lastKey > hi.lastKey) hi = g;
    }
    const sessions = new Set(rows.map((g) => g.session)).size;
    const scope = kind === "days" ? `last ${days} days` : `last ${maxPrompts} requests`;
    const header = [
      `window: ${scope} | ${lo.firstAt} → ${hi.lastAt} | ${sessions} session${sessions === 1 ? "" : "s"} | model ${rows[0].model}`,
      `total = sum across all steps, not context size | rows ${rows.length} of ${groups.length} requests | scanned ${entries.length}${entries.length === limit ? "+" : ""} entries (limit ${limit})`,
    ].join("\n");
    const rollLines = roll.map((a) =>
      `rollup ${a.session}: requests:${a.requests} steps:${a.steps} total(sum of steps):${fmt(a.total)} cache-read/step:${fmt(a.cacheRead / a.steps)} fresh-in/step:${fmt(a.input / a.steps)} ${a.loAt} → ${a.hiAt}`);
    const out = [header, ...rowLines, ...rollLines];
    if (flagged.length > 0) out.push(`flag: possible double-count — in within 1% of cache-read on ${flagged.length} request(s): ${flagged.map((g) => g.lastAt).join(", ")}`);
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
  const days = Math.max(1, opt("--days", 7) || 7);
  const maxPrompts = Math.max(1, opt("--last", DEFAULT_ROWS) || DEFAULT_ROWS);
  // Read only as much as the window needs, never below the historical floor.
  const limit = Math.min(SCAN_CEIL, Math.max(SCAN_FLOOR, 8 * maxPrompts));
  const positional = argv.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  process.stdout.write(getTokensSummary(resolveVaultPath(positional[0]), { kind, days, maxPrompts, limit }) + "\n");
}

module.exports = { getTokensSummary, parseLine };
