# Token Tracker

Active per-turn token-usage tracker. Reports every model turn, appends to a durable JSONL log, and rolls up trends for the long-term optimization plan. All estimates assume `charsPerToken: 4` (heuristic, not a tokenizer).

## What it costs (per turn, estimated)

| Operation | Size | Tokens |
|-----------|------|--------|
| Append one JSONL line (~180 chars) | ~180 chars | ~45 |
| One-line report (≤200 chars) | ≤200 chars | ~50 |
| Rollup (on demand, ≤50 entries) | bounded | ~2,250 max read + ~small render |

## Design decisions

- **JSONL, not MD**: `.opencode/token-tracker/usage.jsonl` is never matched by `opencode.jsonc` `instructions: [".opencode/memory/*.md"]`, so the log never auto-loads into context.
- **O(1) append, no read on write**: `appendEntry` only appends; reads happen on demand via `readRecent(n=50)`.
- **Bounded reads and renders**: `readRecent` defaults to 50; rollup renders at most `TOP_N=5` consumer lines.
- **Heuristic stub**: `HeuristicEstimator` avoids provider API calls; live wiring is future E2E work.

## Pruning / archiving

`maybeRotate` archives to `usage-YYYYMMDD-HHmm.jsonl` at 500 entries or 100KB. `readRecent` default 50 mirrors the `.opencode/memory` 50-entry convention.

## Do-not-regress warning

Never add the log path to `opencode.jsonc` `instructions` or import the log into prompts. Never call `readRecent(Infinity)` in product code.

## Test command

```powershell
node --test tools/token-tracker/estimator.test.js
node --test tools/token-tracker/entry.test.js
node --test tools/token-tracker/store.test.js
node --test tools/token-tracker/rollup.test.js
node --test tools/token-tracker/selfcost.test.js
```
