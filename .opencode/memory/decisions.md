# Decisions

Entries are prepended at the top (newest first), auto-archived after 50 entries.

2026-10-19 — the /tokens report drops the cut-short disclosure and the (dup?) warning; the header counts what was counted ("31 requests counted, latest 10 shown") — why: brevity over two honesty lines, so totals can read low by one request and stepDoubleCount now has no visible output; user-approved; ec7143

2026-10-19 — /tokens renders a fenced 22-line plain-language report: TOKEN USAGE header, TOTAL, WHAT TO FIX (max 3 numbered findings), SPLIT, LATEST 10 table (Time/Rounds/Tokens/Note), one-line Round definition; totals still cover the newest 50 requests while the table stays at 10 rows — why: jargon rows and a 38-line wall hid the three numbers a person acts on; presentation only, no calculation touched; supersedes the 15-line and 45-line layouts; 4bff27a

2026-10-19 — `!dbl` fires only when a single step has nonzero in within 1% of its own cache-read; a row is marked `cold:K` when its first step reads under 5% of that step's own context, K = that step's in — why: cold-start-then-warm requests look like double counts in the sums, and per-step pairs plus earliest-step values are what separate a repeat from a cold miss; the marker rides the row line so the 15-line budget is unchanged; 2b97fd

2026-10-18 — Days mode reports a scan cut as "window truncated at scan limit (N requests read)"; the "N of M requested" form is last-mode only, and hidden rollups pluralize ("+1 session not shown") — why: days mode compared itself against maxPrompts, a count the user never asked for, so an ordinary 7-day window could report a bogus shortfall; qualifies 8f381d; cbbb90

2026-10-18 — `/tokens` header counts window sessions, not printed rows, and prints "+K sessions not shown" for cap-dropped rollups; a last-mode scan short of maxPrompts widens to SCAN_CEIL or says "truncated at scan limit: N of M" — why: header claimed 10 requests while printing 3; 8f381d

2026-10-18 — Rollups aggregate only window requests; days mode scans to SCAN_CEIL; a request cut by the scan limit is marked ~partial and excluded from rollup totals — why: rolling up every scanned group made `--last 3` report requests:5 with a range starting before the header's, and a 7-day window never scanned past the request-window limit; 2375e0f

2026-10-18 — A request row is labelled with its LAST step time and rows sort newest-first; the header range is min→max over the window, session count over printed rows — why: TokenUsage.md is newest-first but TokenUsage_archive.md is oldest-first, so first/last step time must come from the values, not file position; 8410a04, session-count clause superseded by 8f381d

2026-10-18 — `/tokens` summary reshaped into per-request rows (steps, total, cache-read/step, fresh-in/step), a 2-line window header, one rollup line per session, and a hard 15-line budget — why: message-level lines covered only ~8 requests per session, so per-step context growth was invisible; rows stay scannable in a TUI; 88aa303, corrected by 8410a04 + 2375e0f

2026-10-18 — Memory v3 file-direct memory deployed: profile.md auto-load, dedupe/supersede, recall, lint; patch committed 761eaa6 — why: MCP-off made the vault write-only, so prefs never loaded and had to be restated every session; 5a-5d verified live, 31/31 tests

2026-10-15 — Per-prompt token grouping: user-event observe + prompt:stamping, 300-line vault (~50 prompts), grouped summary rows with SDK cost, plain-language 4-line footer — why: 50 message-lines covered only ~8 prompts so trends vanished mid-session; suite 40/40, published + pushed 638034a

2026-10-15 — Context Budget in global AGENTS.md (lazy reads, 40-line slices, SVG-first) plus tool_output caps (200 lines/8KB) plus service port 49374→49474 — why: marathon sessions averaged 83k context with ~19k fresh-in per step; stats unblocked for billed baseline (97 prompts, 68m tokens/7d)

2026-10-15 — Token-efficiency pass: /tokens split-view (context=in+cache-read, hit-rate, generation total alongside legacy sum), vault read budgets (outline-first, never full archive), obsidian MCP off by default (per-task enable); tests 32→35 green, distro synced (49 files, logo-design skipped) — why: context/input dominates spend (generation <1%), archive full-reads cost ~100k each, MCP schemas stay resident

2026-10-15 — UVE Hammock logo kit delivered (concept B: coder at rest between brackets, Ultraviolet #5B50E6 on Night LoFi #171430); finals plus guidelines in assets/logo/, working files gitignored in design/logo/ — why: first real run of the /logo pipeline, wordmark still needs outlining plus trademark search before commercial use

2026-10-15 — logo-design skill integrated (pinned 0ecf52e, ask-gated in both configs, publisher skips multi-file skill dirs with notice, /logo command added, distro README plus template gitignore updated) — why: 14MB trademarked library must never ship in the distro; skill stays global-only while the workflow ships

2026-10-14 — Web-research skill added (global skills/web-research/SKILL.md, 39 lines): built-ins first, yt-dlp 2026.8.19 subtitles into %TEMP%\subs, login-backed platforms declined; mirrored to distro and pushed ed3aa49 — why: minimal zero-login research path without Agent Reach; baseline passed so Exa/mcporter, Jina, gh all excluded

2026-10-14 — yt-dlp subtitle truth: --print suppresses subtitle file output (silent pass, no error), --js-runtimes is unnecessary for subs (no-runtime warning harmless, 95KB vtt downloads fine) — why: controlled with/without runs isolated --print as the true cause after first misattributing to the missing JS runtime

2026-10-14 — RTK v1.0.0 source-built (--locked, tag v1.0.0 over develop) plus OpenCode plugin installed with telemetry blocked (RTK_TELEMETRY_DISABLED=1, consent never asked); --opencode also drops Claude-side RTK.md/CLAUDE.md ref/filter template, kept as harmless with hook inactive — why: token savings on tool output with fail-open shim verified byte-identical plus user-confirmed compaction

2026-10-12 — Profile README rebuilt backend-first: internship dropped (finished), AI-workflow focus leads, contribution snake plus dark-themed stats cards, real contacts merged from a GitHub-side edit — NASH\nashesc pushed through 93066ee

2026-10-12 — Default Project cleanup: removed docs/qa screenshots, AGENTS.md.bak, and all docs/project/plans history (7 tracked deletions staged, rest untracked); plugin-shim.test.js kept as active contract, suite 31/31 green — backup zip in Temp\opencode

2026-10-12 — Clarification-by-default: consequential uncertainty asks via question tool (batched, plain words), trivial assumptions proceed stated-inline; questions exempt from concise budget — live instructions/clarify.md plus planner route, pushed distro 6d40369

2026-10-11 — P3 docs batch: tester/plan/README statements corrected, helpers resolve absolute paths, delete_note deduped; subagent_depth 2 kept and token gate untouched with recorded reasons — pushed 84083db

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
