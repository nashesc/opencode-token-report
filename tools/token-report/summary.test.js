const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { appendReport } = require("./vault-log.js");
const { getTokensSummary } = require("./summary.js");

const rep = (i, extra = {}) => ({ sessionID: "ses_abc", messageID: `m${i}`, model: "openai/gpt-5", total: 100 + i,
  vaultFields: { input: 50 + i, output: 30, reasoning: 10, cacheRead: 5, cacheWrite: 5 }, ...extra });
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-sum-")); return path.join(d, "TokenUsage.md"); };
// Raw lines let a test place entries on a chosen date (appendReport always
// stamps today) without going through the vault writer.
const line = (date, i, { session = "ses_abc", prompt = "p1", input = 100, cacheRead = 900 } = {}) =>
  `${date} — 10:00:00 agent:build session:${session} msg:msg_${i} prompt:${prompt} cost:0 model:openai/gpt-5 total:${input + cacheRead + 40} (in:${input} out:30 reason:10 cache-read:${cacheRead} cache-write:0)`;

test("empty/missing vault → friendly message, never throws", () => {
  assert.equal(getTokensSummary(path.join(os.tmpdir(), `nope-${Date.now()}.md`)), "No token data yet.");
});

test("default window is the newest 10 requests, window printed in header", () => {
  const p = tmp();
  for (let i = 0; i < 15; i++) appendReport(rep(i), p);
  const out = getTokensSummary(p);
  assert.match(out, /window: last 10 requests/);
  assert.match(out, /rows 10 of 15 requests/);
  assert.ok(out.includes("m14"), "newest present");
  assert.ok(!out.includes("m4 "), "oldest excluded");
});

test("--last N narrows rows, --days N filters by entry date", () => {
  const p = tmp();
  for (let i = 0; i < 15; i++) appendReport(rep(i), p);
  assert.match(getTokensSummary(p, { n: 3 }), /window: last 3 requests \|/);
  assert.match(getTokensSummary(p, { n: 3 }), /rows 3 of 15 requests/);
  const q = tmp();
  fs.writeFileSync(q, [line("2026-10-18", 1, { prompt: "new" }), line("2026-09-01", 2, { prompt: "old" })].join("\n"), "utf8");
  const days = getTokensSummary(q, { kind: "days", n: 7 });
  assert.match(days, /window: last 7 days/);
  assert.match(days, /rows 1 of 1 requests/);
  assert.ok(!days.includes("old"), "pre-window entry excluded");
});

test("each row reports steps, per-step cache-read and per-step fresh-in", () => {
  const p = tmp();
  const base = rep(1);
  appendReport({ ...base, messageID: "s1", promptID: "u9", total: 100,
    vaultFields: { input: 50, output: 30, reasoning: 10, cacheRead: 5, cacheWrite: 5 } }, p);
  appendReport({ ...base, messageID: "s2", promptID: "u9", total: 200,
    vaultFields: { input: 60, output: 40, reasoning: 20, cacheRead: 6, cacheWrite: 6 } }, p);
  const out = getTokensSummary(p);
  assert.match(out, /steps:\s*2 total:\s*300/, "steps summed into one row");
  assert.match(out, /cache-read\/step:\s*6 /, "cacheRead 11 over 2 steps rounds to 6");
  assert.match(out, /fresh-in\/step:\s*55/, "input 110 over 2 steps");
});

test("rollup covers every request of the newest session, not just shown rows", () => {
  const p = tmp();
  fs.writeFileSync(p, [
    line("2026-10-18", 1, { session: "ses_new", prompt: "a", cacheRead: 900 }),
    line("2026-10-18", 2, { session: "ses_new", prompt: "b", cacheRead: 800 }),
    line("2026-10-18", 3, { session: "ses_old", prompt: "c", cacheRead: 700 }),
  ].join("\n"), "utf8");
  const out = getTokensSummary(p, { n: 1 });
  assert.match(out, /rollup ses_new: requests:2 steps:2/);
  assert.match(out, /rollup ses_new:.*total\(sum of steps\):1,980/, "row totals 1040 + 940, older ses_old row excluded");
  assert.ok(!out.includes("ses_old"), "other sessions excluded from rollup");
});

test("in within 1% of cache-read flags a possible double-count", () => {
  const p = tmp();
  fs.writeFileSync(p, line("2026-10-18", 1, { prompt: "x", input: 1000, cacheRead: 1005 }), "utf8");
  const out = getTokensSummary(p);
  assert.match(out, /!dbl/, "row marked");
  assert.match(out, /flag: possible double-count — in within 1% of cache-read on 1 request/);
  assert.ok(out.split("\n").length <= 15, "flag fits the line budget");
});

test("rows near but not within 1% are not flagged", () => {
  const p = tmp();
  fs.writeFileSync(p, line("2026-10-18", 1, { prompt: "x", input: 1000, cacheRead: 950 }), "utf8");
  const out = getTokensSummary(p);
  assert.ok(!out.includes("dbl"), "5% apart is not a double-count");
});

test("output stays under 15 lines with a full window plus flag", () => {
  const p = tmp();
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push(line("2026-10-18", i, { prompt: `p${i}`, input: 1000, cacheRead: 1001 }));
  fs.writeFileSync(p, rows.join("\n"), "utf8");
  const out = getTokensSummary(p);
  assert.ok(out.split("\n").length <= 15, `${out.split("\n").length} lines`);
  assert.equal(out.split("\n").filter((l) => /steps:\s*\d+ total:/.test(l)).length, 10, "10 rows");
});

test("total is labelled as a step sum, never as context size", () => {
  const p = tmp();
  appendReport(rep(1), p);
  assert.match(getTokensSummary(p), /total = sum across all steps, not context size/);
});

test("unparseable lines are skipped, summary still renders", () => {
  const p = tmp();
  appendReport(rep(1), p);
  fs.appendFileSync(p, "this is not an entry line\n");
  const out = getTokensSummary(p);
  assert.ok(out.includes("m1"));
  assert.ok(!out.includes("not an entry"));
});

test("old date-only lines still parse (backward compat)", () => {
  const p = tmp();
  fs.writeFileSync(p, "# TokenUsage\n\n2026-10-14 — session:ses_old msg:m_old model:openai/gpt-5 total:100 (in:50 out:30 reason:10 cache-read:5 cache-write:5)\n", "utf8");
  const out = getTokensSummary(p);
  assert.match(out, /window: last 10 requests/);
  assert.match(out, /rows 1 of 1 requests/);
  assert.match(out, /2026-10-14\s+m_old/);
});

test("unreadable path never throws", () => {
  assert.ok(getTokensSummary("Z:\\\0\\nope.md").startsWith("Token summary unavailable"));
});