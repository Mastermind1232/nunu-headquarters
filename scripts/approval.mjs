import {ID} from "./rules.mjs";
import {escapeHTML} from "./custom-improvements.mjs";

/* Player buttons do not act. They send a request to the active GM, who approves or denies it in a popup.
   The GM's own clicks run at once. Handlers receive the requesting User so ownership is checked as them. */
const SOCKET = `module.${ID}`;
const handlers = {};
export function registerAction(action, fn) { handlers[action] = fn; }
export const activeGM = () => Array.from(game.users ?? []).filter((u) => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))[0];

async function perform(hq, action, payload, requester) {
  const fn = handlers[action];
  if (!fn) throw new Error("Unknown action.");
  return fn(hq, payload, requester);
}

/** Runs an action as the GM, or sends it to the GM for approval. `summary` is the sentence the GM reads. */
export async function run(hq, action, payload, summary) {
  if (game.user.isGM) return perform(hq, action, payload, game.user);
  const gm = activeGM();
  if (!gm) throw new Error("No GM is online to approve this.");
  game.socket.emit(SOCKET, {type: "request", hqUuid: hq.uuid, action, payload, summary, userId: game.user.id});
  ui.notifications.info(`Sent to the GM for approval: ${summary}`);
  return null;
}

const reply = (userId, ok, text) => game.socket.emit(SOCKET, {type: "reply", userId, ok, text});

export function installApprovalHooks() {
  Hooks.once("ready", () => {
    game.socket.on(SOCKET, async (msg) => {
      if (msg?.type === "reply") { if (msg.userId === game.user.id) ui.notifications[msg.ok ? "info" : "warn"](msg.text, {permanent: !msg.ok}); return; }
      if (msg?.type !== "request" || activeGM()?.id !== game.user.id) return;
      const hq = await fromUuid(msg.hqUuid).catch(() => null);
      const user = game.users.get(msg.userId);
      if (!hq || !user) return;
      if (!hq.testUserPermission(user, "OBSERVER")) return reply(user.id, false, "You no longer have access to this HQ.");
      const ok = await Dialog.confirm({title: `${user.name} asks`, content: `<p>${escapeHTML(msg.summary)}</p><p>Approve?</p>`, defaultYes: true});
      if (!ok) return reply(user.id, false, `Denied by the GM: ${msg.summary}`);
      try {
        const text = await perform(hq, msg.action, msg.payload, user);
        reply(user.id, true, typeof text === "string" && text ? text : `Approved: ${msg.summary}`);
      } catch (e) {
        ui.notifications.error(e.message);
        reply(user.id, false, `Could not apply (${e.message}): ${msg.summary}`);
      }
    });
  });
}
