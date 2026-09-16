import {ID, CATALOG, state, desiredSituational, effectChanges, effectFlags} from "./rules.mjs";
import {roleTable} from "./character-benefits.mjs";
import {activeGM} from "./approval.mjs";

/* Situational Improvement bonuses (Lounge, Medbay, Studio, Evidence Wall) live on the actor as Active Effects
   while the actor has a token in the HQ's scene and that scene is the active one. The active GM keeps them in sync. */
const ABILITY = {operator: "fixer", medicine: "medtech", "charismatic impact": "rockerboy", backup: "lawman", credibility: "media",
  "combat awareness": "solo", maker: "tech", interface: "netrunner", moto: "nomad", teamwork: "exec"};
export function actorRoles(actor) {
  const items = Array.from(actor.items?.values?.() ?? actor.items ?? []).filter((i) => i.type === "role");
  return [...new Set(items.map((i) => roleTable(i) || ABILITY[String(i.system?.mainRoleAbility ?? "").trim().toLowerCase()] || "").filter(Boolean))];
}
export const hqJournals = () => game.journal.filter((j) => j.getFlag(ID, "hq"));
export const presentIn = (scene, actor) => Boolean(scene?.active) && scene.tokens.some((t) => t.actorId === actor.id);
export function effectDoc(hq, w) {
  const name = CATALOG.find((c) => c.id === w.improvement)?.name ?? w.improvement;
  return {name: `HQ: ${name}`, img: "icons/svg/house.svg", origin: hq.uuid, changes: effectChanges(w.skills, w.bonus),
    flags: effectFlags(w.skills.length, {situational: hq.uuid, improvement: w.improvement})};
}
export async function reconcile(hq) {
  if (activeGM()?.id !== game.user.id) return;
  const s = state(hq.getFlag(ID, "hq"));
  const scene = s.sceneId ? game.scenes.get(s.sceneId) : null;
  const tagged = game.actors.filter((a) => a.type === "character" && a.effects.some((e) => e.getFlag(ID, "situational") === hq.uuid));
  const inScene = scene ? scene.tokens.map((t) => t.actor).filter((a) => a?.type === "character") : [];
  for (const actor of new Set([...tagged, ...inScene])) {
    const want = desiredSituational(s, actorRoles(actor), presentIn(scene, actor));
    const have = actor.effects.filter((e) => e.getFlag(ID, "situational") === hq.uuid);
    const keep = new Set(), create = [];
    for (const w of want) {
      const match = have.find((e) => e.getFlag(ID, "improvement") === w.improvement && Number(e.changes[0]?.value) === w.bonus && e.changes.length === w.skills.length);
      if (match) keep.add(match.id); else create.push(effectDoc(hq, w));
    }
    const remove = have.filter((e) => !keep.has(e.id)).map((e) => e.id);
    if (remove.length) await actor.deleteEmbeddedDocuments("ActiveEffect", remove);
    if (create.length) await actor.createEmbeddedDocuments("ActiveEffect", create);
  }
}
export async function reconcileAll() { for (const hq of hqJournals()) await reconcile(hq).catch((e) => console.error(`${ID} | presence`, e)); }
let timer = null;
const bump = () => { clearTimeout(timer); timer = setTimeout(() => reconcileAll(), 250); };
export function installPresenceHooks() {
  Hooks.once("ready", bump);
  Hooks.on("createToken", bump);
  Hooks.on("deleteToken", bump);
  Hooks.on("updateToken", (doc, changes) => { if ("actorId" in changes) bump(); });
  Hooks.on("updateScene", (scene, changes) => { if ("active" in changes) bump(); });
  Hooks.on("updateJournalEntry", (doc, changes) => { if (foundry.utils.getProperty(changes, `flags.${ID}.hq`) !== undefined) bump(); });
  Hooks.on("createItem", (item) => { if (item.type === "role" && item.parent) bump(); });
  Hooks.on("deleteItem", (item) => { if (item.type === "role" && item.parent) bump(); });
}
