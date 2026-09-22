const SELF_COST_BUDGET = {
  maxReportChars: 200,
  maxSummaryLines: 30,
  maxReadEntries: 50,
  estimateCharsPerToken: 4,
};

const AVG_ENTRY_CHARS = 180;

function ceilDiv(n, d) {
  return Math.ceil(n / d);
}

function estimateSelfCost({ reportText = '', summaryText = '', entriesRead = 0 } = {}, charsPerToken = 4) {
  const reportTokens = ceilDiv(reportText.length, charsPerToken);
  const summaryTokens = ceilDiv(summaryText.length, charsPerToken);
  const readTokens = ceilDiv(entriesRead * AVG_ENTRY_CHARS, charsPerToken);
  const total = reportTokens + summaryTokens + readTokens;
  const notes = [];
  if (reportText.length > SELF_COST_BUDGET.maxReportChars) {
    notes.push(`report exceeds ${SELF_COST_BUDGET.maxReportChars} chars — trim note field`);
  }
  const summaryLines = summaryText === '' ? 0 : summaryText.split('\n').length;
  if (summaryLines > SELF_COST_BUDGET.maxSummaryLines) {
    notes.push(`summary exceeds ${SELF_COST_BUDGET.maxSummaryLines} lines — reduce TOP_N or detail`);
  }
  if (entriesRead > SELF_COST_BUDGET.maxReadEntries) {
    notes.push(`reads exceed ${SELF_COST_BUDGET.maxReadEntries} entries — use readRecent cap`);
  }
  return { reportTokens, summaryTokens, readTokens, total, withinBudget: notes.length === 0, notes };
}

module.exports = { estimateSelfCost, SELF_COST_BUDGET };
