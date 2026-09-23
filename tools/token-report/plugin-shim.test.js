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

const assistantEvent = (tokens, time = { created: 1, completed: 2 }) => ({ event: {
  type: "message.updated",
  properties: { info: {
    id: "msg_def", sessionID: "ses_abc", role: "assistant",
    modelID: "gpt-5", providerID: "openai", cost: 0.001,
    time, tokens,
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
    await plugin["experimental.text.complete"]({}, output); // unknown ids → untouched, must not throw
    assert.equal(output.text, "hello");
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("second part of the same message gets no second footer (append-once)", async () => {
  withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now() + 2}`);
    const plugin = await mod.TokenReport({ client: { app: { log: async () => {} } }, project: {}, directory: process.cwd() });
    await plugin.event(assistantEvent({ input: 800, output: 300, reasoning: 100, cache: { read: 30, write: 4 } }));
    const part1 = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, part1);
    const part2 = { text: "world" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_2" }, part2);
    assert.ok(part1.text.includes("`tokens: 1234`"));
    assert.equal(part2.text, "world");
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("interim (streaming) event leaves later text untouched — no zero footer", async () => {
  withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now() + 3}`);
    const plugin = await mod.TokenReport({ client: { app: { log: async () => {} } }, project: {}, directory: process.cwd() });
    await plugin.event(assistantEvent(
      { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      { created: 1 } // no completed -> interim
    ));
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, output);
    assert.equal(output.text, "hello");
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("zero snapshot then real totals → footer shows the LATEST (last-wins)", async () => {
  const dir = withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now() + 4}`);
    const plugin = await mod.TokenReport({ client: { app: { log: async () => {} } }, project: {}, directory: process.cwd() });
    await plugin.event(assistantEvent(
      { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      { created: 1 }
    ));
    await plugin.event(assistantEvent(
      { input: 800, output: 300, reasoning: 100, cache: { read: 30, write: 4 } },
      { created: 1 }
    ));
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, output);
    assert.ok(output.text.includes("`tokens: 1234`"), `got: ${output.text}`);
    const lines = fs.readFileSync(path.join(dir, "TokenUsage.md"), "utf8").split("\n").filter((l) => l.includes("msg_def"));
    assert.equal(lines.length, 1);
    assert.ok(lines[0].includes("total:1234"));
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("identical redelivery (dual subscription) writes exactly one vault line", async () => {
  const dir = withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now() + 5}`);
    const plugin = await mod.TokenReport({ client: { app: { log: async () => {} } }, project: {}, directory: process.cwd() });
    const ev = assistantEvent({ input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } });
    await plugin.event(ev);
    await plugin.event(ev);
    const lines = fs.readFileSync(path.join(dir, "TokenUsage.md"), "utf8").split("\n").filter((l) => l.includes("msg_def"));
    assert.equal(lines.length, 1);
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

const pulledClient = (tokens, log = async () => {}) => ({
  app: { log },
  session: { message: async () => ({ data: { info: { tokens } } }) },
});

test("pull-hit appends fresh total with NO prior event (race fix proof)", async () => {
  withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now() + 6}`);
    const plugin = await mod.TokenReport({ client: pulledClient({ input: 100, output: 20, reasoning: 5, cache: { read: 1, write: 0 } }), project: {}, directory: process.cwd() });
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, output);
    assert.ok(output.text.includes("`tokens: 126`"), `got: ${output.text}`);
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("pull-zero falls back to pending event data", async () => {
  withTempVault();
  try {
    const mod = await import(SHIM + `?t=${Date.now() + 7}`);
    const plugin = await mod.TokenReport({ client: pulledClient({ input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }), project: {}, directory: process.cwd() });
    await plugin.event(assistantEvent({ input: 800, output: 300, reasoning: 100, cache: { read: 30, write: 4 } }));
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, output);
    assert.ok(output.text.includes("`tokens: 1234`"), `got: ${output.text}`);
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});

test("pull-throws falls back to pending; all-missing leaves text untouched", async () => {
  withTempVault();
  try {
    const throwing = { app: { log: async () => {} }, session: { message: async () => { throw new Error("down"); } } };
    const mod = await import(SHIM + `?t=${Date.now() + 8}`);
    const plugin = await mod.TokenReport({ client: throwing, project: {}, directory: process.cwd() });
    await plugin.event(assistantEvent({ input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } }));
    const output = { text: "hello" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_abc", messageID: "msg_def", partID: "prt_1" }, output);
    assert.ok(output.text.includes("`tokens: 15`"), `got: ${output.text}`);
    const bare = { text: "world" };
    await plugin["experimental.text.complete"]({ sessionID: "ses_x", messageID: "msg_unknown", partID: "prt_9" }, bare);
    assert.equal(bare.text, "world");
  } finally { delete process.env.TOKEN_USAGE_PATH; }
});
