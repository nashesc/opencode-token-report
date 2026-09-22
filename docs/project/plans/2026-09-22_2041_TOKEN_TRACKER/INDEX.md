# Token Tracker Implementation Plan

**Goal:** Implement an active, low-overhead token-usage tracker that reports per-message consumption, persists an analyzable log, and feeds a long-term optimization summary including its own cost.

**Problem:** Token baseline work (~1,980 tokens/session after AGENTS.md + vault cleanup) has no active measurement. Without per-message reporting and a durable record, regressions in prompt/context size go undetected and optimization opportunities cannot be prioritized. The tracker itself must not regress those gains via context bloat or heavy dependencies.

**Architecture:** Single dependency-free Node module (`tools/token-tracker/`, CommonJS) + append-only JSONL log under `.opencode/token-tracker/` (deliberately outside `opencode.jsonc` `instructions` glob so it is never auto-loaded into context) + bounded rollup reader that never loads full history. A `TokenProvider` / estimator interface decouples measurement from any model-provider token API; a heuristic stub keeps unit tests offline. Reporter formats one-line human reports; store appends; rollup summarizes top consumers/trends/actions; self-cost module estimates tracker overhead.

**Tech Stack:** Node.js 18+ built-in `node:test` + `node:assert/strict` (zero new dependencies, zero install, works on win32 PowerShell via `node --test`). CommonJS (`require`) to avoid ESM/`package.json` `"type"` friction in a greenfield repo with no `package.json` at root.

## Tasks

| # | Task file | Task | Dependencies | Acceptance Criteria |
|---|-----------|------|-------------|-------------------|
| 001 | `001_estimator-interface.md` | TokenProvider interface + heuristic stub estimator | none | AC1 (foundation), AC4 (foundation: stub cost baseline) |
| 002 | `002_entry-and-report.md` | Usage-entry model + per-message report formatter | 001 | AC1, AC2 (field contract) |
| 003 | `003_append-only-store.md` | Append-only JSONL store with bounded read + rotation | 002 | AC2 |
| 004 | `004_rollup-summary.md` | Rollup / optimization summary artifact | 002, 003 | AC3 |
| 005 | `005_self-cost-overhead.md` | Self-cost accounting + overhead design doc | 001–004 | AC4 |

Dependency chain: `001 → 002 → 003 → 004 → 005` (004 needs entry shape from 002 and store read API from 003; 005 measures the real code from 001–004).

## Files (final state)

- Create: `tools/token-tracker/estimator.js` — `TokenProvider` interface + `HeuristicEstimator` stub + `countTokens()` fallback.
- Create: `tools/token-tracker/entry.js` — `buildEntry()` + `formatReport()` + entry field contract.
- Create: `tools/token-tracker/store.js` — `appendEntry()`, `readRecent(n)`, `maybeRotate()` over `.opencode/token-tracker/usage.jsonl`.
- Create: `tools/token-tracker/rollup.js` — `summarize(entries)` → `{ totals, byRole, topConsumers, trend, recommendations[] }` + `renderSummary()`.
- Create: `tools/token-tracker/selfcost.js` — `estimateSelfCost()` + `SELF_COST_BUDGET` constants.
- Create: `tools/token-tracker/README.md` (in Task 005) — overhead design doc: budgets, pruning rule, "never auto-load" warning.
- Create: `tools/token-tracker/*.test.js` (one per task, co-located) — unit tests only, `node:test`, no network, no E2E.
- Create (at runtime, gitignored except `.gitkeep`): `.opencode/token-tracker/usage.jsonl` — append-only log; `.opencode/token-tracker/usage-*.jsonl` — rotated archives.
- Modify: `.gitignore` (in Task 003) — ignore `usage*.jsonl` but keep `.gitkeep` so the log never pollutes diffs/context.
- Explicitly NOT modified: `opencode.jsonc`, `AGENTS.md`, `.opencode/memory/*.md` — tracker must not regress token gains or alter auto-load behavior.

## Conventions (implementer must know)

- **Test runner:** `node --test tools/token-tracker/<name>.test.js` from repo root (`C:\Users\Lenovo\Documents\Default Project`). No `package.json`, no install, no pytest/Pester. Requires Node 18+ (`node --version`). All tests use `node:test` (`describe/it`) + `node:assert/strict`. No network, no filesystem outside temp dirs except via injected paths.
- **Module style:** CommonJS (`const x = require('./estimator')`, `module.exports = {...}`). LF or CRLF both fine; UTF-8 without BOM.
- **TDD per task:** Step 1 write failing test → Step 2 run and verify FAIL → Step 3 minimal implementation → Step 4 run and verify PASS (+ full suite green) → Step 5 ask user then commit (commit/push gate is non-negotiable per global AGENTS.md — never commit without explicit confirmation).
- **Commit scope:** `feat(token-tracker): <task description>` for all five tasks (feature scope, consistent for `git log --grep` filtering).
- **Storage contract (cross-layer, Tasks 002–004 share this):** one JSON object per line, fields: `{ v:1, ts, turnId, msgId, role, kind, inputTokens, outputTokens, totalTokens, model, sessionId, note }`. `totalTokens === inputTokens + outputTokens` (invariant asserted in tests). `role ∈ {user, assistant, system}`. `kind` = measurement source, e.g. `model-turn`, `heuristic-estimate`.
- **Never load full history:** store exposes only `readRecent(n)` with default cap (e.g. 50, mirroring the 50-entry memory convention); rollup operates on a bounded slice. Full-file reads in tests use small temp fixtures only.
- **Windows paths:** use `path.join()` in code; in docs write repo-relative paths with `/` plus the absolute root `C:\Users\Lenovo\Documents\Default Project` where the implementer needs it.

## Test Plan (unit only)

- Each task has its own `*.test.js` run via `node --test`. Full suite: `node --test tools/token-tracker/`.
- Temp-dir fixtures (`fs.mkdtempSync(os.tmpdir())`) for store/rotation tests — never touch the real `.opencode/token-tracker/usage.jsonl` in tests.
- E2E / integration (provider API wiring, live session hook, cross-session trend validation) is explicitly out of scope and planned separately after implementation.

## Rollback

- Each task commits independently; rollback is `git log --grep="feat(token-tracker)" --oneline` then `git revert <sha>` in reverse order (005 → 001). No migrations, no schema, no external state: deleting `tools/token-tracker/` + `.opencode/token-tracker/usage*.jsonl` fully removes the feature. `.gitignore` change (Task 003) reverts cleanly with the same revert.
- If rotation misbehaves, the log is plain JSONL — safe to truncate to last 50 lines or delete; rollup degrades to empty summary (tested in Task 004).

## Evidence

- Workspace `C:\Users\Lenovo\Documents\Default Project` (win32): root contains only `AGENTS.md` (24 lines), `opencode.jsonc` (`instructions: [".opencode/memory/*.md"]`, no stack permissions), `.gitignore`, `docs/project/plans/` (empty pre-plan), `.opencode/{package.json (@opencode-ai/plugin 1.18.27), memory/decisions.md, memory/errors.md}`. No root `package.json`, no test runner, no app source — greenfield, hence zero-dependency Node harness.
- Global harness: token baseline ~1,980 tokens/session; recent trims to global `AGENTS.md` 141→56 lines and project `AGENTS.md` 64→35 lines — tracker must not regress these (hence JSONL-not-MD storage + bounded reads + self-cost budget).
- Existing convention reused: 50-entry threshold from `.opencode/memory/` archive rule → mirrored as default `readRecent` cap and summary top-N cap.

## Notes / Deviations

- **Definition of "every message" (open question, assumption documented):** one trackable unit = one **model turn** (`turnId` shared by the triggering user message + assistant response). User-only messages with no model call are logged with `kind: "user-only"` and `outputTokens: 0` via the estimator. Each task file states this; if the requester means literally every keystroke/message including unsubmitted drafts, Tasks 002–003 need a contract amendment (flagged as open question below, does not block this plan).
- **Storage location (assumption, justified):** `.opencode/token-tracker/usage.jsonl` (JSONL, not CSV: extensible fields, one-line-per-entry append, trivially streamable; not MD: avoids `instructions` auto-load glob; not `docs/project/`: keeps durable operational log out of human-docs tree). Justification is restated in Task 003 for the implementer.
- **No provider token API exists in-repo:** Task 001 defines the interface + offline stub. Live provider wiring is E2E/future work, not in this plan.
- No spec deviation: all four ACs trace to ≥1 task (see table). AC4 is fully covered by Task 005 plus per-task overhead notes.
