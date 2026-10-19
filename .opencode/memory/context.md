# Context

Project preferences and constraints. Auto-loaded; keep entries short.

## Constraints
- 2026-10-19 — the auto-loaded context is capped and the cap is enforced by a test: 25 entries per memory log, 26,000 bytes of instruction files, 1,600 chars of skill descriptions, 1,200 of agent descriptions; scripts/context-budget.test.js fails when any cap is exceeded
- 2026-10-19 — any number in the /tokens report must be readable without a legend — the legend was cut, so '(+169K)' became 'restarted from scratch, 169K re-sent'
- 2026-10-19 — every /tokens WHAT TO FIX finding must name one concrete action, and no two findings may give conflicting advice — the 2026-10-19 review rejected both a praise-only finding and 'keep reusing chats' against 'split it in two'
- 2026-10-19 — for any /tokens report change: run the script, paste the real output, and confirm the printed totals equal the sum of the underlying rows
- 2026-10-18 — the memory.js bash allow rule must be node *memory.js*, not *memory.js*, so quoted/backslash paths still match while cat/type on the script prompts
