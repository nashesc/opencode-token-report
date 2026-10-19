# Token-efficiency audit — 2026-10-20

Measured, implemented and verified. Every number below is measured, not
estimated: token counts come from a real provider's `usage.prompt_tokens`
against the exact file contents, and the end-to-end numbers come from real
`opencode run` sessions measured in the token vault.

## The finding

Every request re-sends the whole instruction set. On this machine the fixed
prompt floor of a fresh session was **15,022 fresh tokens**, of which the
files this workflow controls were **8,011 (55%)**:

| Component | Before | After | Δ |
|---|---:|---:|---:|
| Instruction set (8 files) | 6,701 tok / 27,762 B | 5,922 tok / 24,372 B | **−779** |
| Skill descriptions (8) | 856 tok | 679 tok | **−177** |
| Agent descriptions (9) | 333 tok | 287 tok | **−46** |
| `brevity.js` STYLE (pushed every LLM call) | 121 tok | 69 tok | **−52** |
| **Controllable per-request prompt** | **8,011 tok** | **6,957 tok** | **−1,054 (−13.2%)** |
| End-to-end probe (real model, identical prompt) | 7,911 prompt tok | 7,620 prompt tok | **−291 (−3.7%)** |

The end-to-end probe is smaller than the instruction-set delta because
`opencode run` (CLI) applies **no** `instructions` array — global or project —
while the desktop session applies both. The CLI number therefore measures only
the AGENTS.md + skills + agents + plugin part; the desktop path carries the
full −1,054.

## The unbounded growth term

`decisions.md` grew 372 B → 12,617 B in 28 days (+437 B/day) and `errors.md`
+156 B/day — **+147 tokens per day, forever, in every prompt of every chat**,
because both are auto-loaded. Nothing capped them: the 50-entry archive
threshold was in the commands, and 46 of 50 entries had accumulated.

Now both logs are a **25-entry window**; the rest lives in `*_archive.md`,
which the `instructions` list never names. `memory.js recall` searches the
live files **and** their archive siblings, so archiving hides nothing —
verified: the 2026-09-04 `VERIFY-PROBE` decision exists nowhere else and is
still returned.

## What changed

| # | Change | Where |
|---|---|---|
| C1 | Archive threshold 50 → 25; `decisions.md` 46 → 25 entries, 21 archived (0 lost) | `commands/log-decision.md`, `commands/log-error.md`, `MemoryHelpers.psm1` |
| C2 | `memory.js recall` now searches project-local `*_archive.md` | `scripts/memory.js` (+ test) |
| C3 | Global `AGENTS.md` compressed; CLI detail moved out of the hot path | `AGENTS.md`, `instructions/memory-cli.md` (new, on-demand) |
| C4 | `concise.md` / `clarify.md` de-duplicated; `brevity.js` STYLE shortened | `instructions/*.md`, `plugins/brevity.js` |
| C5 | Project `AGENTS.md` template scaffolding trimmed | `AGENTS.md` |
| C6 | 8 skill + 9 agent descriptions tightened, every "load when" trigger kept | `skills/*/SKILL.md`, `agents/*.md` |
| C7 | V1 compaction keys → V2 (`keep.tokens` 15000, `buffer` 8000) | `opencode.jsonc` |
| C8 | Regression guard for the context floor | `scripts/context-budget.test.js` (new) |
| C9 | Published to the distro (58 files), sanitizer green | `NASH\AI Workflow\global\` |

## Why C7 mattered

OpenCode v2.0.26's schema deprecates the V1 `prune` and `reserved` keys. The
resolved config before the change was `{"auto":true,"buffer":8000}` — `prune`
silently dropped (old tool output is never pruned away), `reserved` migrated
to `buffer`. The v2 docs are explicit: *"V1 used tail-turn and pruning
behavior. V2 uses summaries and `compaction.keep.tokens`."* The heaviest
observed request ran 78 rounds to a 109,265-token context with every dead
tool output still in it. The workflow now keeps `keep.tokens` explicit and
the global `AGENTS.md` suggests `/compact` past ~60k context instead of
~100k.

## Verification

| Check | Result |
|---|---|
| Project suite `tools/token-report/*.test.js` | **56/56** |
| `scripts/memory.test.js` | **19/19** (1 new test for the local archive) |
| `scripts/pre-commit.test.js` | **10/10** |
| `scripts/context-budget.test.js` (new guard) | **4/4** |
| `scripts/skills.test.js` | 3/4 — see below |
| Rule-by-rule marker check over the 4 rewritten files | 69 markers, **0 rules lost** |
| `memory.js recall` — archived / live / error entries | all reachable |
| `Invoke-MemoryArchive` roundtrip (30 entries) | 25 live + 5 archived, no BOM |
| `memory.js lint` | 5 warnings, all pre-existing and vault-side |
| Guard proven to fail | 2 probes: over-budget file and 30-entry log both fail it |
| Publisher | 58 files published, `SANITIZER-TEST: green`, no home-path leaks |

## Open item (pre-existing, not a regression)

`skills.test.js` was already failing before this audit — 2 of 4 tests. The
description trims fixed both (logo-design's description was 1,016 chars, and
the total description budget was 2,161 against a 1,600 limit). The remaining
failure is the logo-design **body** at 218 lines against a 60-line limit.

That body is a deliberate router-plus-references design: it summarises
14 `references/*.md` files and 9 scripts, and costs ~4,100 tokens whenever
the (ask-gated) skill loads. Restructuring a working creative pipeline to
satisfy a lint threshold was out of scope here. The guard needs a decision —
raise the limit for router-style skills, or split the body — not a rewrite.
