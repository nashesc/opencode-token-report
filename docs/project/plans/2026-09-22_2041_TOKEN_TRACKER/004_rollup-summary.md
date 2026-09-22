### Task 004: Rollup / long-term optimization summary

**Goal (Spec §7 AC3):** Tracker output feeds a long-term optimization plan — a rollup artifact/section surfacing top consumers, trends, and recommended actions. Operates on a bounded entry slice so it never pulls full history into context.

**Files:**
- Create: `tools/token-tracker/rollup.js`
- Test: `tools/token-tracker/rollup.test.js`
- Modify: none (imports entry shape from Task 002; consumes `readRecent` output from Task 003 — depends on 002 + 003)

**Contract:**
```js
// rollup.js exports: { summarize, renderSummary, TOP_N }
// TOP_N = 5
// summarize(entries) -> {
//   count, totalInput, totalOutput, total,
//   avgTotal, byRole: { <role>: { count, total } },
//   topConsumers: Entry[] (top TOP_N by totalTokens desc, trimmed to { turnId, role, totalTokens, note }),
//   trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient-data',
//     (split slice into older/newer halves by ts order; compare avg total; ±10% threshold; <4 entries -> 'insufficient-data'),
//   recommendations: string[] (rule-based, deterministic, e.g.:
//     'largest turn <id> (<n> tokens) — review note/context field' when max > 2×avg,
//     'output dominates (x%) — consider shorter responses/summarization' when output share > 70%,
//     'input dominates (x%) — consider context trimming' when input share > 70%,
//     'trend increasing — audit recent notes for repeated heavy turns' when trend === 'increasing',
//     always includes 'review top consumers above for prompt/context trims')
// }
// renderSummary(summary) -> markdown string with sections: Totals, By role, Top consumers, Trend, Recommended actions.
//   Must be bounded: renders at most TOP_N consumer lines. Empty input renders "No usage data yet." (asserted).
```

- [ ] **Step 1: Write the failing test**

Create `tools/token-tracker/rollup.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { summarize, renderSummary } = require('./rollup');
const { buildEntry } = require('./entry');

function e(turnId, inputTokens, outputTokens, extra = {}) {
  return buildEntry({ turnId, inputTokens, outputTokens, ...extra });
}

describe('rollup', () => {
  it('summarize totals and byRole', () => {
    const s = summarize([e('t1', 10, 20, { role: 'assistant' }), e('t2', 30, 0, { role: 'user', kind: 'user-only' })]);
    assert.equal(s.count, 2);
    assert.equal(s.total, 60);
    assert.equal(s.byRole.assistant.total, 30);
    assert.equal(s.byRole.user.total, 30);
  });
  it('topConsumers capped and sorted desc', () => {
    const entries = Array.from({ length: 8 }, (_, i) => e(`t${i}`, i + 1, 0));
    const s = summarize(entries);
    assert.equal(s.topConsumers.length, 5);
    assert.ok(s.topConsumers[0].totalTokens >= s.topConsumers[4].totalTokens);
  });
  it('trend insufficient-data under 4 entries', () => {
    assert.equal(summarize([e('t1', 1, 1)]).trend, 'insufficient-data');
  });
  it('recommendations flag output dominance', () => {
    const s = summarize([e('t1', 10, 90), e('t2', 10, 90), e('t3', 10, 90), e('t4', 10, 90)]);
    assert.ok(s.recommendations.some((r) => r.includes('output dominates')));
  });
  it('renderSummary bounded and handles empty', () => {
    assert.match(renderSummary(summarize([])), /No usage data yet/);
    const many = Array.from({ length: 20 }, (_, i) => e(`t${i}`, 5, 5));
    const lines = renderSummary(summarize(many)).split('\n').filter((l) => l.includes('t'));
    assert.ok(lines.length <= 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
node --test tools/token-tracker/rollup.test.js
```
Expected: FAIL with `Cannot find module './rollup'`.

- [ ] **Step 3: Write minimal implementation**

Create `tools/token-tracker/rollup.js` (pure functions, no fs, no deps). Sort a copy (do not mutate input). Trend: sort by `ts`, split halves, compare averages with 10% band. Recommendations: deterministic string rules above; always include the generic review action so the array is never empty for non-empty input (empty input → `[]`). `renderSummary` caps consumer lines at `TOP_N`; keep markdown minimal (`##`, `-`) so the artifact stays small enough to paste into the long-term optimization plan without context bloat.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
node --test tools/token-tracker/rollup.test.js
```
Expected: PASS (5 tests). Then:
```powershell
node --test tools/token-tracker/
```
Expected: all green (Tasks 001–004).

- [ ] **Step 5: Commit (ask first)**

```powershell
git status
git add tools/token-tracker/rollup.js tools/token-tracker/rollup.test.js
# ASK USER FOR CONFIRMATION BEFORE COMMITTING
git commit -m "feat(token-tracker): rollup summary with top consumers trends and actions"
```

**Overhead note (feeds AC4):** `summarize` is O(n) over a ≤50-entry bounded slice; `renderSummary` output capped at TOP_N lines — never render the raw log. Integration into the long-term plan doc (where the rendered section gets pasted) is a manual/ops step, not code in this task.
