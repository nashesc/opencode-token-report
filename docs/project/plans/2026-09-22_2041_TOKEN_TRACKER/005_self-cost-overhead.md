### Task 005: Self-cost accounting + overhead design doc

**Goal (Spec §7 AC4):** The tracker's own token cost (storage writes, report rendering, analysis) is measured/estimated and documented, with design decisions keeping overhead minimal while prioritizing measurement value.

**Files:**
- Create: `tools/token-tracker/selfcost.js`
- Create: `tools/token-tracker/README.md` (overhead design doc — the AC4 evidence artifact)
- Test: `tools/token-tracker/selfcost.test.js`
- Modify: none (measures code from Tasks 001–004 — depends on 001–004)

**Contract:**
```js
// selfcost.js exports: { estimateSelfCost, SELF_COST_BUDGET }
// SELF_COST_BUDGET = { maxReportChars: 200, maxSummaryLines: 30, maxReadEntries: 50, estimateCharsPerToken: 4 }
// estimateSelfCost({ reportText = '', summaryText = '', entriesRead = 0 } = {}, charsPerToken = 4) -> {
//   reportTokens, summaryTokens, readTokens, total,
//   withinBudget: boolean, notes: string[]
// }
//   reportTokens = ceil(reportText.length / charsPerToken); summaryTokens likewise;
//   readTokens = entriesRead * AVG_ENTRY_CHARS(≈180) / charsPerToken, ceil;
//   withinBudget = reportText.length <= maxReportChars && summaryText.split('\n').length <= maxSummaryLines && entriesRead <= maxReadEntries;
//   notes[] explains any breach, e.g. 'report exceeds 200 chars — trim note field'.
```

**README.md must document (short, bounded — itself low-overhead):** per-turn cost table (append ≈ 1 line JSON ~180 chars ≈ 45 tokens; report ≈ 1 line ≤200 chars ≈ 50 tokens; rollup amortized — runs on demand over ≤50 entries, not per turn); the four design decisions (JSONL-not-MD so never auto-loaded; O(1) append, no read on write; bounded reads TOP_N caps; heuristic stub avoids provider API calls); pruning rule (rotate at 500 entries / 100KB → `usage-YYYYMMDD-HHmm.jsonl`; `readRecent` default 50); and the warning "never add the log path to `opencode.jsonc` instructions or import the log into prompts."

- [ ] **Step 1: Write the failing test**

Create `tools/token-tracker/selfcost.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { estimateSelfCost, SELF_COST_BUDGET } = require('./selfcost');

describe('selfcost', () => {
  it('estimates report + summary + read costs', () => {
    const r = estimateSelfCost({ reportText: 'abcd', summaryText: 'abcdefgh', entriesRead: 2 });
    assert.equal(r.reportTokens, 1);   // 4 chars / 4
    assert.equal(r.summaryTokens, 2);  // 8 chars / 4
    assert.ok(r.readTokens > 0);
    assert.equal(r.total, r.reportTokens + r.summaryTokens + r.readTokens);
  });
  it('withinBudget true for small usage', () => {
    const r = estimateSelfCost({ reportText: 'x'.repeat(100), summaryText: 'l\n'.repeat(10), entriesRead: 50 });
    assert.equal(r.withinBudget, true);
  });
  it('withinBudget false with explanatory notes on breach', () => {
    const r = estimateSelfCost({ reportText: 'x'.repeat(500), summaryText: 'l\n'.repeat(50), entriesRead: 500 });
    assert.equal(r.withinBudget, false);
    assert.ok(r.notes.length > 0);
  });
  it('budget constants match design doc values', () => {
    assert.equal(SELF_COST_BUDGET.maxReportChars, 200);
    assert.equal(SELF_COST_BUDGET.maxSummaryLines, 30);
    assert.equal(SELF_COST_BUDGET.maxReadEntries, 50);
  });
  it('end-to-end: real report + entry sizes fit budget', () => {
    const { formatReport, buildEntry } = require('./entry');
    const entry = buildEntry({ turnId: 't1', inputTokens: 120, outputTokens: 340, note: 'short' });
    const r = estimateSelfCost({ reportText: formatReport(entry), entriesRead: 1 });
    assert.equal(r.withinBudget, true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
node --test tools/token-tracker/selfcost.test.js
```
Expected: FAIL with `Cannot find module './selfcost'`.

- [ ] **Step 3: Write minimal implementation**

Create `tools/token-tracker/selfcost.js` (pure, no deps) per contract. Then create `tools/token-tracker/README.md` (~60 lines max) with sections: What it costs (table), Design decisions (4 bullets), Pruning/archiving, Do-not-regress warning, Test command. Derive numbers from `estimateSelfCost` semantics (state the `charsPerToken: 4` assumption explicitly; do not claim tokenizer accuracy).

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
node --test tools/token-tracker/selfcost.test.js
```
Expected: PASS (5 tests). Then final full suite:
```powershell
node --test tools/token-tracker/
```
Expected: all green (Tasks 001–005, ~24 tests). Also sanity-check README exists: `Test-Path tools/token-tracker/README.md` → `True`.

- [ ] **Step 5: Commit (ask first)**

```powershell
git status
git add tools/token-tracker/selfcost.js tools/token-tracker/selfcost.test.js tools/token-tracker/README.md
# ASK USER FOR CONFIRMATION BEFORE COMMITTING
git commit -m "feat(token-tracker): self-cost accounting and overhead design doc"
```

**AC4 done-when:** `estimateSelfCost` quantifies storage-write + report-render + analysis-read costs in unit tests, and README documents budgets + pruning + the never-auto-load rule. Future live-provider swap (Task 001 stub → real API) must re-run the Task 005 end-to-end budget test.
