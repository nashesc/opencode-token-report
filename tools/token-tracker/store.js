const fs = require('node:fs');
const path = require('node:path');

const MAX_ENTRIES = 500;
const DEFAULT_LOG_PATH = path.join(__dirname, '..', '..', '.opencode', 'token-tracker', 'usage.jsonl');

function ensureDir(logPath) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
}

function appendEntry(entry, logPath = DEFAULT_LOG_PATH) {
  ensureDir(logPath);
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logPath, line, 'utf8');
  return Buffer.byteLength(line);
}

function readRecent(n = 50, logPath = DEFAULT_LOG_PATH) {
  let raw;
  try {
    raw = fs.readFileSync(logPath, 'utf8');
  } catch {
    return [];
  }
  const entries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return entries.slice(-n);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function maybeRotate(logPath = DEFAULT_LOG_PATH, { maxEntries = MAX_ENTRIES, maxBytes = 100 * 1024 } = {}) {
  let stat;
  try {
    stat = fs.statSync(logPath);
  } catch {
    return { rotated: false };
  }
  let lines = 0;
  try {
    const raw = fs.readFileSync(logPath, 'utf8');
    lines = raw.split('\n').filter((l) => l.trim().length > 0).length;
  } catch {
    return { rotated: false };
  }
  if (lines <= maxEntries && stat.size <= maxBytes) {
    return { rotated: false };
  }
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const archivePath = path.join(path.dirname(logPath), `usage-${stamp}.jsonl`);
  fs.renameSync(logPath, archivePath);
  return { rotated: true, archivePath };
}

module.exports = { appendEntry, readRecent, maybeRotate, DEFAULT_LOG_PATH, MAX_ENTRIES };
