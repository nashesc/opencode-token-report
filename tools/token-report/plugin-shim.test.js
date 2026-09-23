const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const SHIM = pathToFileURL(path.join(__dirname, "..", "..", ".opencode", "plugins", "token-report.js")).href;

function withTempVault() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shim-vault-"));
  process.env.TOKEN_USAGE_PATH = path.join(dir, "TokenUsage.md");
  return dir;
}

const assistantEvent = (tokens) => ({ event: {
  type: "message.updated",
  properties: { info: {
    id: "msg_def", sessionID: "ses_abc", role: "assistant",
    modelID: "gpt-5", providerID: "openai", cost: 0.001,
    time: { created: 1 }, tokens,
  } } } });

test("shim appends TOTAL line via text.complete after a tokened event", async () => {
  const dir = withTempVault();
  try {
    const logs = [];
    const mod = await import(SHIM);
    const plugin = await mod.TokenReport({ client: { app: { log: async (e) => logs.push(e) } }, project: {}, directory: process.cwd() });
    await plugin.event(assistantEvent({ input: 800, output: 300, reasoning: 100, cache: { read: 30, write: 4 } }));
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, output);
    assert.ok(output.text.includes("`tokens: 1234`"), `got: ${output.text}`);
    assert.ok(fs.readFileSync(path.join(dir, "TokenUsage.md"), "utf8").includes("msg_def"));
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("missing tokens → visible flag, never throws, never estimates", async () => {
  const dir = withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now()}`);
    const plugin = await mod.TokenReport({ client: { app: { log: async () => {} } }, project: {}, directory: process.cwd() });
    await plugin.event(assistantEvent(undefined));
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, output);
    assert.ok(output.text.includes("tokens unavailable"));
    assert.ok(!output.text.match(/charsPerToken|heuristic/i));
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("broken client.log never breaks the session", async () => {
  withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now() + 1}`);
    const plugin = await mod.TokenReport({ client: { app: { log: async () => { throw new Error("down"); } } }, project: {}, directory: process.cwd() });
    await plugin.event(null); // must not throw
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({}, output); // unknown ids → flag path, must not throw
    assert.ok(typeof output.text === "string");
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});
