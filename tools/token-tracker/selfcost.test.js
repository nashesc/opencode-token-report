const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { estimateSelfCost, SELF_COST_BUDGET } = require('./selfcost');

describe('selfcost', () => {
  it('estimates report + summary + read costs', () => {
    const r = estimateSelfCost({ reportText: 'abcd', summaryText: 'abcdefgh', entriesRead: 2 });
    assert.equal(r.reportTokens, 1);   // 4 chars / 4
    assert.equal(r.summaryTokens, 2);  // 8 chars / 4
    assert.ok(r.readTokens > 0);
    assert.equal(r.total, r.reportTokens + r.summaryTokens + r.readTokens);
  });
  it('withinBudget true for small usage', () => {
    const r = estimateSelfCost({ reportText: 'x'.repeat(100), summaryText: 'l\n'.repeat(10), entriesRead: 50 });
    assert.equal(r.withinBudget, true);
  });
  it('withinBudget false with explanatory notes on breach', () => {
    const r = estimateSelfCost({ reportText: 'x'.repeat(500), summaryText: 'l\n'.repeat(50), entriesRead: 500 });
    assert.equal(r.withinBudget, false);
    assert.ok(r.notes.length > 0);
  });
  it('budget constants match design doc values', () => {
    assert.equal(SELF_COST_BUDGET.maxReportChars, 200);
    assert.equal(SELF_COST_BUDGET.maxSummaryLines, 30);
    assert.equal(SELF_COST_BUDGET.maxReadEntries, 50);
  });
  it('end-to-end: real report + entry sizes fit budget', () => {
    const { formatReport, buildEntry } = require('./entry');
    const entry = buildEntry({ turnId: 't1', inputTokens: 120, outputTokens: 340, note: 'short' });
    const r = estimateSelfCost({ reportText: formatReport(entry), entriesRead: 1 });
    assert.equal(r.withinBudget, true);
  });
});
