### Task 002: Usage-entry model + per-message report formatter

**Goal (Spec §7 AC1, AC2-field-contract):** Every model turn produces a token-consumption report (input, output, total at minimum) and a persistable entry carrying all trend-analysis fields. Defines the entry contract that Tasks 003 (store) and 004 (rollup) share — no drift allowed.

**Files:**
- Create: `tools/token-tracker/entry.js`
- Test: `tools/token-tracker/entry.test.js`
- Modify: none (imports `./estimator` from Task 001 — depends on 001 being committed)

**Contract (FROZEN — Tasks 003/004 must use this shape verbatim):**
```js
// buildEntry({ turnId, msgId, role, kind, inputTokens, outputTokens, model, sessionId, note, ts }) -> entry
// entry = { v:1, ts, turnId, msgId, role, kind, inputTokens, outputTokens, totalTokens, model, sessionId, note }
//   ts defaults to new Date().toISOString(); role defaults 'assistant'; kind defaults 'model-turn';
//   model/sessionId/note default to '' ; totalTokens = inputTokens + outputTokens (computed, never passed in).
//   Throws on negative/non-numeric token counts; throws if turnId missing.
// formatReport(entry) -> single-line string, e.g.:
//   "[turn abc123] assistant | in=120 out=340 total=460 | model=x session=s1 | note=…"
//   Must contain "in=", "out=", "total=" substrings (asserted in tests).
// buildTurnEntry({ turnId, userText, assistantText, estimator, model, sessionId, note }) -> entry
//   Uses HeuristicEstimator-compatible { measure } to count userText (input) + assistantText (output).
//   role='assistant', kind = estimator is HeuristicEstimator ? 'heuristic-estimate' : 'model-turn'.
```

**Definition of "every message" (assumption, restated for implementer):** one entry per model turn; `turnId` shared across the triggering user message and assistant response. Pure user-only messages (no model call) are logged with `outputTokens: 0`, `kind: 'user-only'` via `buildEntry` directly.

- [ ] **Step 1: Write the failing test**

Create `tools/token-tracker/entry.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildEntry, formatReport, buildTurnEntry } = require('./entry');
const { HeuristicEstimator } = require('./estimator');

describe('entry', () => {
  it('buildEntry computes total and defaults', () => {
    const e = buildEntry({ turnId: 't1', inputTokens: 10, outputTokens: 20 });
    assert.equal(e.totalTokens, 30);
    assert.equal(e.v, 1);
    assert.equal(e.role, 'assistant');
    assert.ok(e.ts);
  });
  it('buildEntry carries all AC2 analysis fields', () => {
    const e = buildEntry({ turnId: 't1', msgId: 'm1', role: 'user', kind: 'user-only',
      inputTokens: 5, outputTokens: 0, model: 'm', sessionId: 's', note: 'n' });
    for (const f of ['ts','turnId','msgId','role','kind','inputTokens','outputTokens','totalTokens','model','sessionId','note'])
      assert.ok(f in e, `missing ${f}`);
  });
  it('buildEntry rejects negative counts and missing turnId', () => {
    assert.throws(() => buildEntry({ turnId: 't', inputTokens: -1, outputTokens: 0 }));
    assert.throws(() => buildEntry({ inputTokens: 1, outputTokens: 1 }));
  });
  it('formatReport includes in/out/total', () => {
    const e = buildEntry({ turnId: 'abc123', inputTokens: 120, outputTokens: 340 });
    const r = formatReport(e);
    assert.match(r, /in=120/); assert.match(r, /out=340/); assert.match(r, /total=460/);
    assert.match(r, /abc123/);
  });
  it('buildTurnEntry splits user/assistant text via estimator', () => {
    const e = buildTurnEntry({ turnId: 't9', userText: 'abcdefgh', assistantText: 'abcd',
      estimator: new HeuristicEstimator({ charsPerToken: 4 }) });
    assert.equal(e.inputTokens, 2);
    assert.equal(e.outputTokens, 1);
    assert.equal(e.totalTokens, 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
node --test tools/token-tracker/entry.test.js
```
Expected: FAIL with `Cannot find module './entry'`.

- [ ] **Step 3: Write minimal implementation**

Create `tools/token-tracker/entry.js` (CommonJS, requires `./estimator` only for `instanceof`/duck-typing `kind` — accept any `{ measure }` object so tests can inject fakes). Validate: `Number.isInteger` non-negative for token counts; `turnId` non-empty string. `formatReport` is pure string interpolation, no I/O, no padding libraries.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
node --test tools/token-tracker/entry.test.js
```
Expected: PASS (5 tests). Then:
```powershell
node --test tools/token-tracker/
```
Expected: all green (Tasks 001 + 002).

- [ ] **Step 5: Commit (ask first)**

```powershell
git status
git add tools/token-tracker/entry.js tools/token-tracker/entry.test.js
# ASK USER FOR CONFIRMATION BEFORE COMMITTING
git commit -m "feat(token-tracker): usage entry model and per-message report formatter"
```

**Overhead note (feeds AC4):** `buildEntry`/`formatReport` are pure functions, no I/O — report rendering cost is one string concat per turn. Do not add color/markdown rendering here.
