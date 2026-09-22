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
