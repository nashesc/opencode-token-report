# Decisions

Entries are prepended at the top (newest first), auto-archived after 50 entries.

2026-10-10 — Token reporting is vault-log-only; footer polling removed — text.complete pull loop raced render-finalization, vault log plus /tokens covers the need, shim tests rewritten to lock the contract (26/26 green)

2026-10-10 — Distro sync is /publish-workflow (global command plus Publish-Workflow.ps1), manual per change — fail-closed sanitize, fixed manifest, no auto-commit; published 8d70bef and a53d9e6

2026-10-10 — Authoritative config.json schema keeps permission-object and compaction reserved/prune; V2 permissions-array migration rejected — schema fetch disproved the docs-based plan, user prefers literal keys in live global config over env indirection, both experiments fully rewound

2026-10-03 — opencode-workflow/ subfolder is the sole GitHub distro copy; workflow edits mirror there sanitized, siblings untouched — why: single pushable copy prevents drift between live config and published harness.

2026-09-20 — Adopted hybrid auto-logging — balances automatic error capture with user approval prompts.

2026-09-04 — VERIFY-PROBE instructions-load check — temporary entry to test `.opencode/memory/*.md` auto-load in a fresh session; delete after verification.
