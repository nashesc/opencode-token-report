### Task 001: TokenProvider interface + heuristic stub estimator

**Goal (Sections 1, 7):** Define how token counts are obtained without assuming any model-provider API, so AC1 reporting works offline and unit tests never need network. Lays the foundation for AC4 self-cost baselines.

**Files:**
- Create: `tools/token-tracker/estimator.js`
- Test: `tools/token-tracker/estimator.test.js`
- Modify: none

**Contract (shared with Tasks 002, 005):**
```js
// estimator.js exports:
{ TokenProvider, HeuristicEstimator, countTokens }
// TokenProvider: base class / interface with method:
//   measure({ text, role }) -> { inputTokens, outputTokens }
//   Default implementation throws Error('not implemented').
// HeuristicEstimator extends TokenProvider:
//   constructor({ charsPerToken = 4 } = {})
//   measure({ text, role }) -> { inputTokens, outputTokens }
//     inputTokens = ceil(text.length / charsPerToken); outputTokens = 0 for role 'user', else same formula.
//     Non-string text -> treats as '' (0 tokens), never throws on missing input.
// countTokens(text, charsPerToken = 4) -> Math.ceil((text || '').length / charsPerToken)
```

**Assumption for implementer:** "Every message" = one model turn (see INDEX.md Notes). This task does not log turns; it only counts text. Live provider adapters are future E2E work — do NOT add network code here.

- [ ] **Step 1: Write the failing test**

Create `tools/token-tracker/estimator.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TokenProvider, HeuristicEstimator, countTokens } = require('./estimator');

describe('estimator', () => {
  it('TokenProvider base throws not-implemented', () => {
    assert.throws(() => new TokenProvider().measure({ text: 'hi' }), /not implemented/);
  });
  it('countTokens uses ceil(len/4)', () => {
    assert.equal(countTokens('abcd'), 1);
    assert.equal(countTokens('abcde'), 2);
    assert.equal(countTokens(''), 0);
    assert.equal(countTokens(undefined), 0);
  });
  it('HeuristicEstimator splits user input vs assistant output', () => {
    const est = new HeuristicEstimator({ charsPerToken: 4 });
    assert.deepEqual(est.measure({ text: 'abcdefgh', role: 'user' }), { inputTokens: 2, outputTokens: 0 });
    assert.deepEqual(est.measure({ text: 'abcdefgh', role: 'assistant' }), { inputTokens: 0, outputTokens: 2 });
  });
  it('never throws on missing text', () => {
    const est = new HeuristicEstimator();
    assert.doesNotThrow(() => est.measure({ role: 'user' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from repo root `C:\Users\Lenovo\Documents\Default Project`):
```powershell
node --test tools/token-tracker/estimator.test.js
```
Expected: FAIL with `Cannot find module './estimator'` (file does not exist yet). If Node is missing, install Node 18+ first and record version with `node --version`.

- [ ] **Step 3: Write minimal implementation**

Create `tools/token-tracker/estimator.js` with exactly the contract above (CommonJS, no dependencies). Keep it under ~40 lines. Heuristic formula is intentionally crude — document in a one-line comment that it is an offline fallback, not a tokenizer.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
node --test tools/token-tracker/estimator.test.js
```
Expected: PASS (4 tests). Then run full suite so far:
```powershell
node --test tools/token-tracker/
```
Expected: all green (only this file exists so far).

- [ ] **Step 5: Commit (ask first — commit gate is non-negotiable)**

```powershell
git status
git add tools/token-tracker/estimator.js tools/token-tracker/estimator.test.js
# ASK USER FOR CONFIRMATION BEFORE COMMITTING
git commit -m "feat(token-tracker): TokenProvider interface and heuristic stub estimator"
```

**Overhead note (feeds AC4/Task 005):** this module is pure arithmetic, zero I/O, zero deps — self-cost ≈ `countTokens` call only. Do not add caching or tokenizer libraries here.
