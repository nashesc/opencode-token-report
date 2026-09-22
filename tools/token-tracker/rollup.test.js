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
    const lines = renderSummary(summarize(many)).split('\n').filter((l) => /^- t\d/.test(l));
    assert.ok(lines.length <= 5);
  });
});
