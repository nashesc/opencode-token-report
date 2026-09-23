import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function loadTracker(root) {
  const base = path.join(root, "tools", "token-report");
  return {
    handleMessageUpdated: require(path.join(base, "handler.js")).handleMessageUpdated,
    appendReport: require(path.join(base, "vault-log.js")).appendReport,
    resolveVaultPath: require(path.join(base, "vault-log.js")).resolveVaultPath,
  };
}

export const TokenReport = async (ctx) => {
  const seen = new Set();
  const log = async (level, message) => {
    try { await ctx.client.app.log({ service: "token-report", level, message }); } catch {}
  };
  const candidateId = (event) => {
    try { return event?.properties?.info?.id ?? null; } catch { return null; }
  };
  const dispatch = (eventName) => async (event) => {
    try {
      const root = ctx?.directory ?? process.cwd();
      const { handleMessageUpdated, appendReport, resolveVaultPath } = loadTracker(root);
      const preId = candidateId(event);
      if (preId && seen.has(preId)) return; // dual-subscription dedup: pre-check BEFORE append
      const r = handleMessageUpdated(event, { log: (l, m) => log(l, m) });
      if (!r || !r.ok) {
        if (r && r.reason === "missing-tokens" && r.messageID) {
          if (seen.has(r.messageID)) return;
          seen.add(r.messageID);
          pending.set(r.messageID, r.line); // visible flag, appended once by text.complete
        }
        return;
      }
      if (seen.has(r.messageID)) return;
      seen.add(r.messageID);
      if (seen.size > 1000) seen.clear();
      try { appendReport(r, resolveVaultPath()); } catch (e) { await log("warn", `vault write failed: ${e?.message}`); }
      await log("info", `tokens:${r.total} session=${r.sessionID} msg=${r.messageID}`);
      pending.set(r.messageID, r.line);
    } catch (e) { await log("warn", `event failed: ${e?.message}`); }
  };
  const pending = new Map();
  const appended = new Set(); // messageIDs already footered: text.complete fires per PART
  return {
    event: async (input) => { await dispatch("message.updated")((input && input.event) || null); },
    "message.updated": dispatch("message.updated"),
    "session.idle": dispatch("session.idle"),
    "experimental.text.complete": async (input, output) => {
      try {
        const id = input?.messageID;
        // Append exactly once per message. No pending data (interim phase or
        // unknown ids) -> leave text untouched, NEVER a placeholder flag.
        if (!id || !pending.has(id) || appended.has(id)) return;
        if (output && typeof output.text === "string") {
          output.text += `\n${pending.get(id)}`;
          appended.add(id);
          if (appended.size > 1000) appended.clear();
        }
        pending.delete(id);
      } catch (e) { await log("warn", `text.complete failed: ${e?.message}`); }
    },
  };
};
