# Errors

Entries are prepended at the top (newest first), auto-archived after 25 entries; resolving one means editing its Status field in place, not moving or deleting it.

2026-10-20 — `skills.test.js` was already failing before the token audit (2 of 4 tests: the logo-design description was 1,016 chars and the total description budget was 2,161 > 1,600) — Status: Open — the description trims fixed both; the remaining failure is the logo-design body at 218 lines vs the 60-line limit, which is a deliberate router-plus-references design (14 reference files), not bloat — why: restructuring a working creative pipeline to satisfy a lint threshold was out of scope for the audit; the guard needs a decision, not a rewrite

2026-10-19 — the distro's project-template/.opencode/memory/*.md are empty scaffolds ("No decisions logged yet."), not stale copies of the live log — Status: Resolved — the publisher manifest omits them on purpose; reading them as stale would have shipped this project's log into every template clone; 9cef77b

2026-10-19 — PowerShell Get-Content -Raw / Set-Content corrupted a UTF-8 source file: em-dashes and arrows became mojibake, a BOM was added, and the mangled ENTRY_RE silently returned "No token data yet." — Status: Resolved — the ANSI read is the root cause; reverted via git checkout and re-applied with the edit tool; 2377d7

2026-10-19 — `!dbl` false-positived on cold-then-warm requests: prompt msg_15258e0d1001OAMYpdkRYK3pcK summed in 62,474 vs cache-read 61,956 (0.8% apart) with no repeated step — Status: Resolved — the check compared request-level sums, which a cold first step plus a warm second step makes deceptively similar; now evaluated per step; 2d7162

2026-10-18 — `memory.js add decision|error` writes only to the vault `OpenCode/Decisions.md`, never `.opencode/memory/decisions.md`, so the entry is invisible to the session that auto-loads the project file — Status: Open — target() hardcodes the vault for those two types and `sync` only rebuilds index+profile, so the project mirror needs a hand copy; 0507c2

2026-10-18 — `node --test tools/token-report/` fails with MODULE_NOT_FOUND on Node 24; use a glob (`node --test "tools/token-report/*.test.js"`) — Status: Open — a directory argument is resolved as a module path, so it reports a fake test failure that costs a re-diagnosis

2026-10-18 — Project instructions array replaces the global one, so global concise/clarify/profile.md never reached a session; repeated them as absolute paths — Status: Resolved — verified by injection audit: only AGENTS.md + the two project memory files arrived

2026-10-18 — Instructions and permissions are snapshotted at server start, so edits to the instructions LIST or bash rules in opencode.jsonc need a desktop restart — Status: Resolved — no watcher on opencode.jsonc (only AGENTS.md and skills/); file contents themselves are re-read per prompt; cost three failed verification sessions

2026-10-15 — Orphaned opencode serve --service squatted on managed port 49374 while service status reported stopped; service restart killed my own shell host mid-call (recovered, retry showed 49474 live) — Status: Resolved — moved service to 49474 via set-port + restart; verify CWD-independent PIDs with parent-chain check before touching serve processes

2026-10-14 — Cited wrong repo SHA in skill: ran git rev-parse HEAD in Default Project instead of the fresh clone, pasted its HEAD 6b1f0f6 as agent-reach's — Status: Resolved — re-cloned and recorded real HEAD 94f06c1; always pass -C or set workdir and verify CWD when recording SHAs

2026-10-14 — RTK release build failed: msvc linker link.exe not found (rustup MSVC toolchain without VS prerequisites) — Status: Resolved — installed VS 2022 BuildTools with VCTools workload via winget (MSVC 14.44), rebuild finished in ~14min

2026-10-12 — Snake workflow outputs must be a whitespace-separated block list (comma form wrote one mangled filename); profile images are camo-cached by URL so stale cards/snake need a query-param bump — Status: Resolved — fixed in c45a41f plus v2/v3 cache-busters

2026-10-11 — First block-probe commit slipped through: git-sh PATH lacked gitleaks (skip-notice path), unpushed probe reset plus gc — Status: Resolved — refreshed-PATH repro blocks correctly, restart shells to propagate User PATH

2026-10-11 — Pre-commit hook: gitleaks found possible secret(s) in staged changes, commit blocked — Status: Open — verify whether true positive or false hit before recommitting

2026-10-11 — Stale opencode server served pre-swap config, mimicked key failure and TUI send error — Status: Resolved — taskkill discipline plus fresh debug config before diagnosing

2026-10-11 — Sanitizer corpus test tripped its own live sweep — Status: Resolved — *.test.ps1 excluded from manifest, literals split at runtime

2026-10-11 — token_router deletion dropped a closing brace, broke opencode.jsonc — Status: Resolved — drift-guard JSON check caught it, repaired and parse-verified

2026-09-20 — Test failure: test_memory_archive — Status: Open — threshold boundary off by 1
