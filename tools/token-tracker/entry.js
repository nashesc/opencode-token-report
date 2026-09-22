const { HeuristicEstimator } = require('./estimator');

function assertTokens(name, value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`invalid token count for ${name}: ${value}`);
  }
}

function buildEntry({ turnId, msgId = '', role = 'assistant', kind = 'model-turn', inputTokens, outputTokens, model = '', sessionId = '', note = '', ts } = {}) {
  if (typeof turnId !== 'string' || turnId.length === 0) {
    throw new Error('turnId is required');
  }
  assertTokens('inputTokens', inputTokens);
  assertTokens('outputTokens', outputTokens);
  return {
    v: 1,
    ts: ts || new Date().toISOString(),
    turnId,
    msgId,
    role,
    kind,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    model,
    sessionId,
    note,
  };
}

function formatReport(entry) {
  return `[turn ${entry.turnId}] ${entry.role} | in=${entry.inputTokens} out=${entry.outputTokens} total=${entry.totalTokens} | model=${entry.model} session=${entry.sessionId} | note=${entry.note}`;
}

function buildTurnEntry({ turnId, userText = '', assistantText = '', estimator, model = '', sessionId = '', note = '', msgId = '' } = {}) {
  if (!estimator || typeof estimator.measure !== 'function') {
    throw new Error('estimator with measure() is required');
  }
  const input = estimator.measure({ text: userText, role: 'user' });
  const output = estimator.measure({ text: assistantText, role: 'assistant' });
  const kind = estimator instanceof HeuristicEstimator ? 'heuristic-estimate' : 'model-turn';
  return buildEntry({
    turnId,
    msgId,
    role: 'assistant',
    kind,
    inputTokens: input.inputTokens,
    outputTokens: output.outputTokens,
    model,
    sessionId,
    note,
  });
}

module.exports = { buildEntry, formatReport, buildTurnEntry };
