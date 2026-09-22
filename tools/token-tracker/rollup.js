const TOP_N = 5;

function summarize(entries) {
  const list = Array.isArray(entries) ? entries.slice() : [];
  const count = list.length;
  let totalInput = 0;
  let totalOutput = 0;
  const byRole = {};
  for (const e of list) {
    totalInput += e.inputTokens;
    totalOutput += e.outputTokens;
    const r = byRole[e.role] || { count: 0, total: 0 };
    r.count += 1;
    r.total += e.totalTokens;
    byRole[e.role] = r;
  }
  const total = totalInput + totalOutput;
  const avgTotal = count === 0 ? 0 : total / count;
  const sorted = list.slice().sort((a, b) => b.totalTokens - a.totalTokens);
  const topConsumers = sorted.slice(0, TOP_N).map((e) => ({
    turnId: e.turnId,
    role: e.role,
    totalTokens: e.totalTokens,
    note: e.note,
  }));
  let trend = 'insufficient-data';
  if (count >= 4) {
    const byTs = list.slice().sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    const half = Math.floor(byTs.length / 2);
    const older = byTs.slice(0, half);
    const newer = byTs.slice(half);
    const avg = (arr) => arr.reduce((s, e) => s + e.totalTokens, 0) / arr.length;
    const o = avg(older);
    const n = avg(newer);
    if (o === 0 && n === 0) {
      trend = 'stable';
    } else if (o === 0) {
      trend = 'increasing';
    } else {
      const delta = (n - o) / o;
      trend = delta > 0.1 ? 'increasing' : delta < -0.1 ? 'decreasing' : 'stable';
    }
  }
  const recommendations = [];
  if (count > 0) {
    const max = sorted[0];
    if (max && max.totalTokens > 2 * avgTotal) {
      recommendations.push(`largest turn ${max.turnId} (${max.totalTokens} tokens) — review note/context field`);
    }
    if (total > 0) {
      const outShare = totalOutput / total;
      const inShare = totalInput / total;
      if (outShare > 0.7) {
        recommendations.push(`output dominates (${Math.round(outShare * 100)}%) — consider shorter responses/summarization`);
      }
      if (inShare > 0.7) {
        recommendations.push(`input dominates (${Math.round(inShare * 100)}%) — consider context trimming`);
      }
    }
    if (trend === 'increasing') {
      recommendations.push('trend increasing — audit recent notes for repeated heavy turns');
    }
    recommendations.push('review top consumers above for prompt/context trims');
  }
  return { count, totalInput, totalOutput, total, avgTotal, byRole, topConsumers, trend, recommendations };
}

function renderSummary(s) {
  if (!s || s.count === 0) {
    return 'No usage data yet.';
  }
  const lines = ['## Token usage summary', `- Turns: ${s.count} | Total: ${s.total} (in=${s.totalInput} out=${s.totalOutput} avg=${Math.round(s.avgTotal)})`, '## By role'];
  for (const [role, r] of Object.entries(s.byRole)) {
    lines.push(`- ${role}: ${r.count} turns, ${r.total} tokens`);
  }
  lines.push('## Top consumers');
  for (const c of s.topConsumers.slice(0, TOP_N)) {
    lines.push(`- ${c.turnId} (${c.role}) ${c.totalTokens} tokens${c.note ? ` — ${c.note}` : ''}`);
  }
  lines.push(`## Trend: ${s.trend}`, '## Recommended actions');
  for (const r of s.recommendations) {
    lines.push(`- ${r}`);
  }
  return lines.join('\n');
}

module.exports = { summarize, renderSummary, TOP_N };
