### Task 003: Append-only JSONL store with bounded read + rotation

**Goal (Spec §7 AC2):** Each usage entry is appended to durable storage that supports trend analysis without ever loading full history into context. Justifies and implements the storage choice; adds rotation/archiving consistent with the existing 50-entry memory convention.

**Files:**
- Create: `tools/token-tracker/store.js`
- Create: `.opencode/token-tracker/.gitkeep` (so the directory exists in git while log lines stay ignored)
- Test: `tools/token-tracker/store.test.js`
- Modify: `.gitignore` — append lines ignoring `usage*.jsonl` under `.opencode/token-tracker/` (keep `.gitkeep` tracked). Read `.gitignore` first before editing.

**Storage decision (for implementer — do not revisit without planner approval):** append-only **JSONL** at `.opencode/token-tracker/usage.jsonl`. Why JSONL over CSV/MD: (1) extensible per-entry fields without header migrations; (2) one `fs.appendFileSync(line + '\n')` per turn — O(1), no read-modify-write; (3) streamable/bounded reads; (4) `.jsonl` is NOT matched by `opencode.jsonc` `instructions: [".opencode/memory/*.md"]`, so the log is never auto-loaded into context (a `.md` log would regress the ~1,980-token baseline). Not under `docs/project/`: operational log does not belong in the human-docs tree.

**Contract:**
```js
// store.js exports: { appendEntry, readRecent, maybeRotate, DEFAULT_LOG_PATH, MAX_ENTRIES }
// DEFAULT_LOG_PATH = <repo>/.opencode/token-tracker/usage.jsonl (resolve via path.join(__dirname, '..','..','.opencode','token-tracker','usage.jsonl'))
// appendEntry(entry, logPath = DEFAULT_LOG_PATH) -> writes JSON.stringify(entry) + '\n' via appendFileSync, creating dirs as needed. Returns bytes written.
// readRecent(n = 50, logPath = DEFAULT_LOG_PATH) -> Entry[] of last n valid entries (skips blank/corrupt lines, never throws on corrupt line). Missing file -> []. Never reads more than needed for large files (read file, split lines, slice(-n) — acceptable for <1MB logs; document that >1MB triggers rotation).
// maybeRotate(logPath = DEFAULT_LOG_PATH, { maxEntries = 500, maxBytes = 100*1024 } = {}) -> { rotated: boolean, archivePath? }
//   If line count > maxEntries OR size > maxBytes: rename to usage-YYYYMMDD-HHmm.jsonl alongside, return { rotated:true, archivePath }. Else { rotated:false }.
// MAX_ENTRIES = 500 (hard rotate); readRecent default n=50 mirrors the .opencode/memory 50-entry archive convention.
```

- [ ] **Step 1: Write the failing test**

Create `tools/token-tracker/store.test.js` (uses temp dirs only — never the real log):
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { appendEntry, readRecent, maybeRotate } = require('./store');
const { buildEntry } = require('./entry');

function tmpLog() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tt-')), 'usage.jsonl'); }

describe('store', () => {
  it('appendEntry persists and readRecent returns entries in order', () => {
    const p = tmpLog();
    appendEntry(buildEntry({ turnId: 't1', inputTokens: 1, outputTokens: 2 }), p);
    appendEntry(buildEntry({ turnId: 't2', inputTokens: 3, outputTokens: 4 }), p);
    const got = readRecent(10, p);
    assert.equal(got.length, 2);
    assert.equal(got[1].turnId, 't2');
    assert.equal(got[1].totalTokens, 7);
  });
  it('readRecent caps to last n and tolerates corrupt lines', () => {
    const p = tmpLog();
    for (let i = 0; i < 5; i++) appendEntry(buildEntry({ turnId: `t${i}`, inputTokens: 1, outputTokens: 1 }), p);
    fs.appendFileSync(p, 'NOT-JSON{{{\n\n');
    const got = readRecent(2, p);
    assert.equal(got.length, 2);
    assert.equal(got[1].turnId, 't4');
  });
  it('readRecent on missing file returns []', () => {
    assert.deepEqual(readRecent(10, path.join(os.tmpdir(), 'tt-nope-' + Date.now(), 'x.jsonl')), []);
  });
  it('maybeRotate archives when over maxEntries', () => {
    const p = tmpLog();
    for (let i = 0; i < 6; i++) appendEntry(buildEntry({ turnId: `t${i}`, inputTokens: 1, outputTokens: 1 }), p);
    const r = maybeRotate(p, { maxEntries: 5 });
    assert.equal(r.rotated, true);
    assert.ok(r.archivePath);
    assert.deepEqual(readRecent(10, p), []);
  });
  it('maybeRotate no-ops under threshold', () => {
    const p = tmpLog();
    appendEntry(buildEntry({ turnId: 't1', inputTokens: 1, outputTokens: 1 }), p);
    assert.equal(maybeRotate(p, { maxEntries: 500 }).rotated, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
node --test tools/token-tracker/store.test.js
```
Expected: FAIL with `Cannot find module './store'`.

- [ ] **Step 3: Write minimal implementation**

Create `tools/token-tracker/store.js` (requires `node:fs`, `node:path` only). Corrupt-line tolerance: `try { JSON.parse } catch { skip }`. Rotation: `fs.renameSync(logPath, archivePath)` with `usage-YYYYMMDD-HHmm.jsonl` name. Also create `.opencode/token-tracker/.gitkeep` (empty) and append to `.gitignore`:
```
# token-tracker log (durable, never in diffs or context)
.opencode/token-tracker/usage*.jsonl
!.opencode/token-tracker/.gitkeep
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
node --test tools/token-tracker/store.test.js
```
Expected: PASS (5 tests). Then:
```powershell
node --test tools/token-tracker/
```
Expected: all green (Tasks 001–003). Verify the real log was NOT created: `Test-Path .opencode/token-tracker/usage.jsonl` should be `False`.

- [ ] **Step 5: Commit (ask first)**

```powershell
git status
git add tools/token-tracker/store.js tools/token-tracker/store.test.js .gitignore .opencode/token-tracker/.gitkeep
# ASK USER FOR CONFIRMATION BEFORE COMMITTING
git commit -m "feat(token-tracker): append-only JSONL store with bounded read and rotation"
```

**Overhead note (feeds AC4):** one O(1) append per turn, no read on write path; reads capped at 50 by default; rotation is amortized. Never call `readRecent(Infinity)` in product code.
