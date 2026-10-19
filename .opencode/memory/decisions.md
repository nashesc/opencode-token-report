# Decisions

Entries are prepended at the top (newest first), auto-archived after 25 entries.

2026-10-20 — Token audit: the auto-loaded instruction set was half the fixed prompt floor (6,701 of ~13,400 tokens) and the memory logs grew unbounded at +147 tok/day; the live logs now hold 25 entries and `memory.js recall` searches the local `*_archive.md` siblings so archiving hides nothing — why: every request re-sends the whole instruction set, so a standing prompt cost compounds forever; 21 decisions moved to decisions_archive.md, 0 lost

2026-10-20 — The auto-loaded context is now guarded by `scripts/context-budget.test.js` (byte budgets for instruction files, skill and agent descriptions; ≤25 entries per memory log; no `*_archive.md` in any instructions list) — why: the leak was silent — a 46-entry log and a 1,016-char skill description had accumulated without any test noticing

2026-10-20 — Compaction moved to the v2 keys (`keep.tokens` 15000, `buffer` 8000); the v1 `prune`/`reserved` keys are inert in v2.0.26, so dead tool output is never pruned away and a long chat now needs an explicit `/compact` past ~60k context — why: v2 replaced tail-turn/pruning with summaries, so the old assumption no longer holds

2026-10-20 — `opencode run` (CLI) applies no `instructions` array, global or project, although the desktop session applies both; the CLI probe therefore sees only the AGENTS.md files — why: found while building the before/after probe, so a CLI-only measurement would have missed the memory-log saving entirely; the desktop path was measured from the instruction set instead

2026-10-19 — a feature that leaves the report takes its code with it: the !dbl marker left the 22-line report, so stepDoubleCount, DBL_TOLERANCE and the per-step pairs array had no call sites and no tests, and were removed — why: dead code misleads the next reader; verified inert by a byte-identical report from a fixed vault snapshot; be34f1b

2026-10-19 — /tokens findings changed: the 91%-re-read "already efficient" line is gone; chat advice is one rule (restart → new chat per task, not mid-task; heaviest chat → new chat when a task changes, needs 2+ chats); the fresh-text finding says % of tokens, not % of cost — why: praise is not a fix, "keep reusing chats" contradicted "split it in two", and the finding counts tokens; 374cd31

2026-10-19 — the /tokens cold-start note reads "restarted from scratch, 169K re-sent" instead of "(+169K)" — why: the legend that explained the number was cut, so the row has to say what the number means; 374cd31

2026-10-19 — the distro's project-template keeps empty .opencode/memory scaffolds and the publisher manifest deliberately excludes .opencode/memory/*.md — why: the live decision log is this project's personal history, and a template user must start with their own log; the earlier "stale copies" reading was wrong; recorded in Publish-Workflow.ps1 and publish-workflow.md; 9cef77b

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

