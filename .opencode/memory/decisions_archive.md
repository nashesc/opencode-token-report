# decisions Archive

Archived entries (oldest first, append-only). This file is never auto-loaded.

2026-10-11 — P2 hardening: vault patch/tag/frontmatter denied (write_note kept, memory workflow requires it), 6 key shapes added plus whole-tree scan, small_model out of distro default — pushed bc32a1d

2026-10-11 — P1 config bundle: limit.context/output on 9 documented models, edit default back to allow, over-broad bash filename denies dropped, concise.md tracked with publisher fail-closed check — pushed c173ead

2026-10-11 — Distro re-flattened to repo root (52 pure renames, byte-verified identical copies), publisher -DestRoot now defaults to root — pushed 9b93ddd

2026-10-11 — Gitleaks gate made functional: git --pre-commit --staged with distinct findings exit code, findings block, tool errors stay capture-only — verified 10/10 tests plus real-commit block on js/ps1 paths, pushed 658ebb1

2026-10-11 — Brevity enforced in 4 layers: measurable concise.md budget plus AGENTS.md block plus per-call plugin plus agent footers — single vague instruction drifts under compaction and thoroughness conflicts

2026-10-11 — Never set agent.prompt to a style file alone: custom prompt replaces the provider base prompt and drops tool-use instructions; use append-mode plugin instead — planner overlay dropped for this reason

2026-10-11 — Hook is node-first with gitleaks soft-gate (warns when absent, never blocks); .git hook BOM broke git spawning, rewritten BOM-free — hook can't silently die and secrets get a second layer

2026-10-11 — Distro project-template/tools/ was an unsynced fossil; manifest now mirrors tools/token-report/*.js — template/plugin versions can't drift again

2026-10-11 — Review claims disproved, not implemented: limit blocks are billing metadata, write:deny is schema-inert, concise.md exists — record, don't build

2026-10-11 — Encoding rule: no-BOM .md/.jsonc, BOM kept on pattern-bearing ps1/psm1 — PS 5.1 reads BOM-less scripts as ANSI and misparses non-ASCII (bisect-proven)

2026-10-11 — Provider apiKeys moved to {env:} indirections, unused token_router deleted — no literal keys in live config; publish fails closed otherwise

2026-10-11 — P0+P1 review pass completed, verified live, pushed (distro through c594442, project db062a6) — sanitizer/drift-guard/planner-depth-0/token-gate/hook all green

2026-10-10 — Distro re-nested under opencode-workflow/ in local tree only (git mv, uncommitted); GitHub flat at 0921452 — local-only layout diverges from remote until a move commit is approved

2026-10-10 — Distro published and pushed (34 files, secret sweep clean); sanitizer now asserts pre-redact with broadened key classes — publish stays manual, never auto-commit

2026-10-10 — Harness hardened per audit: bash allowlist trimmed, planner deny-edit plus depth 2, provider schema fixes, token vault update-in-place — verified fixes only, no rewrites

2026-10-10 — Token reporting is vault-log-only; footer polling removed — text.complete pull loop raced render-finalization, vault log plus /tokens covers the need, shim tests rewritten to lock the contract (26/26 green)

2026-10-10 — Distro sync is /publish-workflow (global command plus Publish-Workflow.ps1), manual per change — fail-closed sanitize, fixed manifest, no auto-commit; published 8d70bef and a53d9e6

2026-10-10 — Authoritative config.json schema keeps permission-object and compaction reserved/prune; V2 permissions-array migration rejected — schema fetch disproved the docs-based plan, user prefers literal keys in live global config over env indirection, both experiments fully rewound

2026-10-03 — opencode-workflow/ subfolder is the sole GitHub distro copy; workflow edits mirror there sanitized, siblings untouched — why: single pushable copy prevents drift between live config and published harness.

2026-09-20 — Adopted hybrid auto-logging — balances automatic error capture with user approval prompts.

2026-09-04 — VERIFY-PROBE instructions-load check — temporary entry to test `.opencode/memory/*.md` auto-load in a fresh session; delete after verification.
2026-10-12 — Profile README rebuilt backend-first: internship dropped (finished), AI-workflow focus leads, contribution snake plus dark-themed stats cards, real contacts merged from a GitHub-side edit — NASH\nashesc pushed through 93066ee

2026-10-12 — Default Project cleanup: removed docs/qa screenshots, AGENTS.md.bak, and all docs/project/plans history (7 tracked deletions staged, rest untracked); plugin-shim.test.js kept as active contract, suite 31/31 green — backup zip in Temp\opencode

2026-10-12 — Clarification-by-default: consequential uncertainty asks via question tool (batched, plain words), trivial assumptions proceed stated-inline; questions exempt from concise budget — live instructions/clarify.md plus planner route, pushed distro 6d40369

2026-10-11 — P3 docs batch: tester/plan/README statements corrected, helpers resolve absolute paths, delete_note deduped; subagent_depth 2 kept and token gate untouched with recorded reasons — pushed 84083db