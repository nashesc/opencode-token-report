# SPIKE-VERDICT.md — `experimental.text.complete` display spike (Task 001)

## Mechanism tested
`experimental.text.complete` output mutation:
`if (output && typeof output.text === "string") output.text += "\n`tokens: 999 (spike)`"`.
Spike plugin: `.opencode/plugins/spike-text-complete.js` (DELETED after observation).

## Observed behavior — POSITIVE
- Appended `` `tokens: 999 (spike)` `` line appears at the end of finished assistant
  replies, for both a one-word reply ("mango") and a multi-part reply (numbered
  list + paragraph). No corruption or duplication observed.
- Load-timing caveat: first attempt showed NOTHING because OpenCode had not
  reloaded the plugin; the append appeared only after a full restart. E2E must
  account for plugin-load timing.

## Alternatives
- `experimental.chat.messages.transform`: NOT NEEDED, not tested.
- TUI toast path: NOT NEEDED, not tested.

## Branch decision
→ **Proceed to Task 005 as designed** (thin ESM shim appends the total line via
`experimental.text.complete`). STOP-branch NOT triggered.

## Open thread (carried to Task 003 + E2E)
This spike proved the DISPLAY path only. The token-source half (does
`message.updated` deliver final `AssistantMessage.tokens` per finished turn?)
still needs live confirmation. Task 003 codes defensively (assistant-role gate +
finite-numbers gate + skip-and-flag); E2E confirms against a real session.
