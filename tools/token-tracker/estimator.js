class TokenProvider {
  measure() {
    throw new Error('not implemented');
  }
}

function countTokens(text, charsPerToken = 4) {
  // Offline fallback, not a tokenizer.
  const len = (typeof text === 'string' ? text : '').length;
  return Math.ceil(len / charsPerToken);
}

class HeuristicEstimator extends TokenProvider {
  constructor({ charsPerToken = 4 } = {}) {
    super();
    this.charsPerToken = charsPerToken;
  }

  measure({ text, role } = {}) {
    const tokens = countTokens(text, this.charsPerToken);
    if (role === 'user') {
      return { inputTokens: tokens, outputTokens: 0 };
    }
    return { inputTokens: 0, outputTokens: tokens };
  }
}

module.exports = { TokenProvider, HeuristicEstimator, countTokens };
