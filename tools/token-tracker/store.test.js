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
