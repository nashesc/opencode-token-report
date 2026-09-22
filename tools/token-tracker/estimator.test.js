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
