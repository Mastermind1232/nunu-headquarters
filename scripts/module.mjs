import {ID, catalog, saveCustom, state, purchase, purchaseError, lose, benefits, limit, CATALOG, claim, SITUATIONAL, practiceLimit, STARTER_IP, vote, votersFor, SUMMARY, TIPS} from "./rules.mjs";
import {run, registerAction} from "./approval.mjs";
import {customDialog, escapeHTML} from "./custom-improvements.mjs";
import {runBenefit, ownedCharacters, moraleMode, clearPractice} from "./character-benefits.mjs";
import {installApprovalHooks} from "./approval.mjs";
import {installPresenceHooks, actorRoles} from "./presence.mjs";
import {assetData, openLink, saveDrop, setCrewSlot, createStash, syncStashOwnership, moneyDialog} from "./hq-assets.mjs";
import {crewIPDialog} from "./crew-ip.mjs";
import {workshopView, bindWorkshop} from './workshop-ui.mjs';
import {installWorkshopHooks} from './workshop-service.mjs';

export class HeadquartersSheet extends DocumentSheet {
  async _render(force, options = {}) {
    if (this.isEditable) await autoCrew(this.document);
    await super._render(force, options);
    if (options.tab) this._tabs?.[0]?.activate(options.tab);
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["nplh", "sheet"], template: `modules/${ID}/templates/hq.hbs`,
      width: 850, height: 800, resizable: true, submitOnChange: true, closeOnSubmit: false,
      scrollY: [".hq-body"],
      tabs: [{navSelector: ".hq-tabs", contentSelector: ".hq-body", initial: "info"}]
    });
  }
  get isEditable() { return game.user.isGM && super.isEditable; }
  async getData() {
    const s = state(this.document.getFlag(ID, "hq"));
    const canUseBenefits = s.access && ownedCharacters().length > 0;
    const assets = await assetData(this.document);
    const w = await workshopView(this.document);
    const scenes = (game.scenes?.contents ?? []).map((sc) => ({id: sc.id, name: sc.name, selected: sc.id === s.sceneId}));
    const situational = Object.entries(SITUATIONAL).filter(([id]) => s.improvements[id] > 0).map(([id, def]) => ({
      name: CATALOG.find((c) => c.id === id).name, roles: def.roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", "),
      bonus: s.improvements[id] >= 2 && def.upgraded ? Object.values(def.upgraded)[0] : def.bonus, skills: def.skills.join(", ")}));
    const soloTwo = ownedCharacters().some((a) => practiceLimit(s, actorRoles(a)) > 1);
    return {name: this.document.name, s, b: benefits(s), assets, w, editable: this.isEditable,
      scenes, sceneName: scenes.find((x) => x.selected)?.name ?? "",
      districts: ["", "Financial District", "Midtown", "The Flats"].map((d) => ({value: d, label: d || "Pick a district", selected: d === s.location})),
      showWorkshop: w.hasTech, situational, soloTwo,
      canUseBenefits, canRecoverHumanity: canUseBenefits && Boolean(moraleMode(s).humanityFormula),
      customBenefits: s.access ? s.customImprovements.filter(c => s.improvements[c.id] > 0).map(c => ({...c, acquiredUpgrades: c.upgrades.slice(0, s.improvements[c.id] - 1)})) : [],
      canVote: !game.user.isGM && s.access,
      cards: catalog(s).map(c => {
        const rank = s.improvements[c.id], max = limit(s, c.id) - 1, ups = Math.max(0, rank - 1), error = purchaseError(s, c.id);
        const voters = votersFor(s, c.id).map((uid) => { const u = game.users?.get(uid); return u ? {name: u.character?.name ?? u.name, img: u.character?.img || u.avatar || "icons/svg/mystery-man.svg"} : null; }).filter(Boolean);
        return {...c, customUpgrades: c.custom ? c.upgrades : [], rank, owned: rank > 0, upgraded: rank > 1, upgrades: ups, maxUpgrades: max, error,
          multi: max > 1, upgradeLabel: max > 1 ? `${ups} of ${max}` : "", upgradeDone: max > 0 && ups >= max, noUpgrade: max === 0,
          canBuyBase: !error && rank === 0, canBuyUpgrade: !error && rank > 0 && ups < max,
          voters, mine: s.votes[game.user?.id] === c.id, buyable: !error, next: rank === 0 ? "base" : "upgrade",
          tooltip: `<div class="nplh-tip prose"><p><b>Basic.</b> ${escapeHTML(c.base)}</p>${c.custom ? `<ol>${(c.upgrades ?? []).map((u) => `<li>${escapeHTML(u)}</li>`).join("") || "<li>No upgrades defined.</li>"}</ol>` : `<p><b>Upgraded.</b> ${escapeHTML(c.upgrade)}</p>`}</div>`};
      }),
      log: [...s.log].reverse().slice(0, 30)};
  }
  activateListeners(html) {
    super.activateListeners(html);
    bindWorkshop(this, html);
    html.find('.hq-tabs .item').on('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); }
    });
    this._enableBenefitButtons(html);
    html.find('[data-open]').on('click', event => {
      event.preventDefault(); openLink(event.currentTarget.dataset.open).catch(e => ui.notifications.error(e.message));
    });
    html.find('[data-money]').on('click', async event => {
      event.preventDefault(); if (this._moneyBusy) return; this._moneyBusy = true;
      try { if (this.isEditable) await this.submit(); await moneyDialog(this.document, event.currentTarget.dataset.money); this.render(false); }
      catch (e) { ui.notifications.error(e.message); } finally { this._moneyBusy = false; }
    });
    html.find("button[data-benefit]").on("click", async event => {
      event.preventDefault();
      if (this._benefitBusy) return;
      this._benefitBusy = true;
      html.find("button[data-benefit]").prop("disabled", true);
      try {
        if (this.isEditable) await this.submit();
        await runBenefit(this.document, event.currentTarget.dataset.benefit);
      } catch (e) { ui.notifications.error(e.message); }
      finally { this._benefitBusy = false; this._enableBenefitButtons(this.element); }
    });
    html.find("button[data-vote]").on("click", async (event) => {
      event.preventDefault();
      const id = event.currentTarget.dataset.vote, name = catalog(state(this.document.getFlag(ID, "hq"))).find((c) => c.id === id)?.name ?? id;
      try { await run(this.document, "vote", {improvement: id}, `${game.user.name} votes for ${name}.`, {silent: true}); }
      catch (e) { ui.notifications.error(e.message); }
    });
    if (!this.isEditable) return;
    html.find("[data-award-ip]").on("click", async () => {
      const amount = await new Promise((resolve) => new Dialog({title: "Award HQ IP",
        content: `<div class="nplh-benefit-dialog"><label>HQ IP to award<input name="ip" type="number" min="1" step="1" value="40"></label><p>Once per crew, equal to the mission's Group IP. Practice bonuses expire.</p></div>`,
        buttons: {award: {label: "Award", callback: (h) => resolve(Number(h.find('[name=ip]').val()))}, cancel: {label: "Cancel", callback: () => resolve(null)}},
        default: "award", close: () => resolve(null)}, {width: 360}).render(true));
      if (amount === null) return;
      this._queue = (this._queue ?? Promise.resolve()).then(() => this.act("award", null, amount)).catch((e) => ui.notifications.error(e.message));
    });
    html.find("[data-edit-rent]").on("click", async () => {
      const s = state(this.document.getFlag(ID, "hq"));
      const value = await new Promise((resolve) => new Dialog({title: "Monthly rent",
        content: `<div class="nplh-benefit-dialog"><label>Monthly rent (eb)<input name="rent" type="number" min="0" step="1" value="${s.rent}"></label><p>One number for the whole crew, split evenly and paid from their own sheets.</p></div>`,
        buttons: {save: {label: "Save", callback: (h) => resolve(Number(h.find('[name=rent]').val()))}, cancel: {label: "Cancel", callback: () => resolve(null)}},
        default: "save", close: () => resolve(null)}, {width: 360}).render(true));
      if (value === null) return;
      if (!Number.isSafeInteger(value) || value < 0) return ui.notifications.error("Enter a whole number of eddies.");
      await this.document.update({[`flags.${ID}.hq.rent`]: value});
    });
    html.find('[data-crew-ip], [data-crew-money]').on('click', async event => {
      event.preventDefault();
      if (this._crewIPBusy) return;
      this._crewIPBusy = true; html.find('[data-crew-ip], [data-crew-money]').prop('disabled', true);
      try { await crewIPDialog(this.document, 'crewMoney' in event.currentTarget.dataset); }
      catch (e) { ui.notifications.error(e.message); }
      finally { this._crewIPBusy = false; this.element.find('[data-crew-ip], [data-crew-money]').prop('disabled', false); }
    });
    html.find('[data-asset-action]').on('click', event => {
      event.preventDefault();
      this._queue = (this._queue ?? Promise.resolve()).then(() => this.assetAction(event.currentTarget.dataset)).catch(e => ui.notifications.error(e.message));
    });
    html.find('[data-drop-zone]').on('dragover', event => event.preventDefault()).on('drop', event => {
      event.preventDefault(); event.stopPropagation();
      const {dropZone, slot} = event.currentTarget.dataset;
      const data = TextEditor.getDragEventData(event.originalEvent ?? event);
      this._queue = (this._queue ?? Promise.resolve()).then(() => saveDrop(this.document, dropZone, Number(slot), data)).catch(e => ui.notifications.error(e.message));
    });
    html.find("button[data-action]").on("click", event => {
      event.preventDefault();
      const {action, id} = event.currentTarget.dataset;
      this._queue = (this._queue ?? Promise.resolve()).then(() => this.act(action, id)).catch(e => ui.notifications.error(e.message));
    });
  }
  _disableFields(form) {
    super._disableFields(form);
    $(form).find('[data-workshop]').prop('disabled', false);
    this._enableBenefitButtons($(form));
    $(form).find('[data-open], [data-money]').each((i, button) => { button.disabled = button.dataset.available !== 'true'; });
  }
  async assetAction({assetAction, slot}) {
    if (!this.isEditable) return;
    const s = state(this.document.getFlag(ID, 'hq'));
    if (assetAction === 'image') new FilePicker({type: 'image', current: s.image,
      callback: path => this.document.update({[`flags.${ID}.hq.image`]: path}).catch(e => ui.notifications.error(e.message))}).browse();
    if (assetAction === 'clear-image') await this.document.update({[`flags.${ID}.hq.image`]: ''});
    if (assetAction === 'clear-crew') await this.document.update({[`flags.${ID}.hq.crewSlots`]: setCrewSlot(s.crewSlots, Number(slot), '')});
    if (assetAction === 'clear-garage') await this.document.update({[`flags.${ID}.hq.garageUuid`]: ''});
    if (assetAction === 'create-stash') { const stash = await createStash(this.document); stash.sheet.render(true); }
    if (assetAction === 'sync-stash') { await syncStashOwnership(this.document); ui.notifications.info('Stash access updated from HQ journal permissions.'); }
  }
  _enableBenefitButtons(html) {
    const s = state(this.document.getFlag(ID, "hq"));
    const available = s.access && ownedCharacters().length > 0 && !this._benefitBusy;
    html.find("button[data-benefit]").each((i, button) => {
      button.disabled = !available || (button.dataset.benefit === "humanity" && !moraleMode(s).humanityFormula);
    });
  }
  async _updateObject(event, data) {
    if (!this.isEditable) return;
    const s = state(this.document.getFlag(ID, "hq"));
    const updates = {};
    if (data.sceneId !== undefined) updates[`flags.${ID}.hq.sceneId`] = String(data.sceneId ?? "");
    for (const key of ["location", "description", "notes", "rent", "beds", "access", "purchaseCost"]) {
      if (!(key in data)) continue;
      let value = data[key];
      if (["rent", "beds", "purchaseCost"].includes(key)) {
        value = Number(value);
        if (!Number.isSafeInteger(value) || value < (key === "beds" ? 1 : 0)) throw new Error("Enter a valid non-negative whole number; original beds must be at least 1.");
        if (key === "beds" && value < s.improvements.rent - 1) throw new Error("Original beds cannot be lower than the purchased extra beds.");
      }
      updates[`flags.${ID}.hq.${key}`] = value;
    }
    if (data.name !== undefined) updates.name = String(data.name).trim() || "Headquarters";
    await this.document.update(updates);
  }
  async act(action, id, extra) {
    if (!this.isEditable) return;
    const award = Number(extra);
    await this.submit();
    let s = state(this.document.getFlag(ID, "hq"));
    let label;
    if (action === "custom-add" || action === "custom-edit") {
      const entry = s.customImprovements.find(c => c.id === id);
      if (action === "custom-edit" && !entry) throw new Error("Custom improvement no longer exists.");
      const data = await customDialog(entry);
      if (!data || !this.isEditable) return;
      s = state(this.document.getFlag(ID, "hq"));
      if (entry && !s.customImprovements.some(c => c.id === id)) throw new Error("Custom improvement was removed while editing.");
      s = saveCustom(s, {...data, id: entry?.id ?? `custom_${foundry.utils.randomID()}`});
      label = `${entry ? 'Edited' : 'Added'} custom improvement: ${data.name}`;
    } else if (action === "custom-delete") {
      const entry = s.customImprovements.find(c => c.id === id);
      if (!entry) return;
      if (!await Dialog.confirm({title: "Delete custom improvement", content: `<p>Delete ${escapeHTML(entry.name)} and its acquired upgrades without an HQ IP refund?</p>`})) return;
      if (!this.isEditable) return;
      s = state(this.document.getFlag(ID, "hq"));
      s.customImprovements = s.customImprovements.filter(c => c.id !== id);
      s.improvements[id] = 0;
      label = `Deleted custom improvement: ${entry.name}; no refund`;
    } else if (action === "buy") {
      const error = purchaseError(s, id);
      if (error) throw new Error(error);
      const name = catalog(s).find(c => c.id === id).name;
      const cost = s.purchaseCost;
      if (!await Dialog.confirm({title: "Crew purchase", content: `<p>Spend ${cost} HQ IP on ${escapeHTML(name)}? Confirm that the crew agrees.</p>`})) return;
      const latest = state(this.document.getFlag(ID, "hq"));
      if (latest.purchaseCost !== cost) throw new Error("The purchase cost changed. Please review the new price and try again.");
      s = purchase(latest, id);
      label = `Purchased ${name} (-${cost} HQ IP)`;
    } else if (action === "claim") {
      const scenes = (game.scenes?.contents ?? []).slice().sort((x, y) => x.name.localeCompare(y.name));
      if (!scenes.length) throw new Error("There are no scenes to claim.");
      const sceneOpts = scenes.map((sc) => `<option value="${sc.id}"${sc.id === s.sceneId ? " selected" : ""}>${escapeHTML(sc.name)}</option>`).join("");
      const starterOpts = `<option value="">None</option>` + catalog(s).map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("");
      const picked = await new Promise((resolve) => new Dialog({title: "Claim a place",
        content: `<div class="nplh-benefit-dialog"><label>Scene<select name="sceneId">${sceneOpts}</select></label>
          <label>Starting Improvement (built in, free)<select name="starter">${starterOpts}</select></label>
          <label>Starting HQ IP<input name="ip" type="number" min="0" step="1" value="${STARTER_IP}"></label>
          <label>Monthly rent (eb)<input name="rent" type="number" min="0" step="1" value="${s.rent}"></label>
          <label>Beds<input name="beds" type="number" min="1" step="1" value="${s.beds}"></label>
          <p>The scene's name and picture become the HQ's, and it becomes the HQ scene for the at-home bonuses.</p></div>`,
        buttons: {claim: {label: "Claim", callback: (html) => resolve({sceneId: html.find('[name="sceneId"]').val(), starter: html.find('[name="starter"]').val(),
          ip: Number(html.find('[name="ip"]').val()), rent: Number(html.find('[name="rent"]').val()), beds: Number(html.find('[name="beds"]').val())})},
          cancel: {label: "Cancel", callback: () => resolve(null)}}, default: "claim", close: () => resolve(null)}, {width: 460}).render(true));
      if (!picked || !this.isEditable) return;
      const scene = game.scenes.get(picked.sceneId);
      if (!scene) throw new Error("That scene no longer exists.");
      s = claim(state(this.document.getFlag(ID, "hq")), picked);
      s.image = scene.thumb || scene.background?.src || s.image || "";
      await this.document.update({name: scene.name});
      await pinOnScene(scene, this.document).catch((e) => ui.notifications.warn(`HQ claimed, but no pin was placed: ${e.message}`));
      const starter = picked.starter ? catalog(s).find((c) => c.id === picked.starter)?.name : null;
      label = `Claimed ${scene.name}` + (starter ? `: ${starter} built in` : "") + (picked.ip ? `, +${picked.ip} HQ IP` : "");
    } else if (action === "lockin") {
      const error = purchaseError(s, id);
      if (error) throw new Error(error);
      const name = catalog(s).find(c => c.id === id).name, cost = s.purchaseCost, voters = votersFor(s, id).length;
      if (!await Dialog.confirm({title: "Lock in the crew's vote", content: `<p>Buy <b>${escapeHTML(name)}</b> for ${cost} HQ IP? ${voters} vote(s) for it. All votes are cleared afterwards.</p>`})) return;
      s = purchase(state(this.document.getFlag(ID, "hq")), id);
      s.votes = {};
      label = `Locked in ${name} from the crew's vote (-${cost} HQ IP)`;
    } else if (action === "award") {
      const amount = award;
      if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(s.ip + amount)) throw new Error("Enter a positive whole HQ IP award.");
      s.ip += amount;
      const cleared = await clearPractice(this.document);
      label = `Awarded ${amount} HQ IP` + (cleared ? `; ${cleared} practice bonus(es) expired` : "");
    } else if (action === "lose") {
      const name = catalog(s).find(c => c.id === id)?.name;
      if (!name || !s.improvements[id]) return;
      if (!await Dialog.confirm({title: "Lose improvement", content: `<p>Remove ${escapeHTML(name)} and all its upgrades without an HQ IP refund?</p>`})) return;
      s = lose(state(this.document.getFlag(ID, "hq")), id); label = `Lost ${name}; no refund`;
    } else if (action === "departure") {
      if (!await Dialog.confirm({title: "Team Member departure", content: "<p>Resolve the Workstation obligation by having the Improved Team Member leave?</p>"})) return;
      s = state(this.document.getFlag(ID, "hq")); s.workstationDebt = false; label = "Improved Team Member departed; Workstation obligation cleared";
    } else if (action === "destroy") {
      if (!await Dialog.confirm({title: "HQ destroyed", content: "<p>Lose every improvement and upgrade without refund? Unspent HQ IP remains available for the crew's next HQ.</p>"})) return;
      s = state(this.document.getFlag(ID, "hq"));
      for (const c of catalog(s)) s = lose(s, c.id);
      s.access = false; label = "HQ destroyed; improvements lost without refund";
    } else return;
    if (!this.isEditable) return;
    s.log.push({date: new Date().toLocaleString(), user: game.user.name, label});
    await this.document.setFlag(ID, "hq", s);
  }
}

/* ---------- At-a-glance text ---------- */
const hiLite = (t) => escapeHTML(t).replace(/(\+\d+|−\d+eb|BODY \+\d+|BODY \d+|\d+,\d+eb|\d+ of \d+|1d6\/2|1d6|2d6)/g, "<b>$1</b>");
function summaryHtml(c, rank) {
  const [basic, up] = SUMMARY[c.id] ?? [c.base ?? "", c.custom ? (c.upgrades?.[rank - 2] ?? "") : (c.upgrade ?? "")];
  let text = basic ?? "";
  if (rank > 1 && up) text += ` · upgraded: ${String(up).replace("{n}", String(rank - 1))}`;
  return hiLite(text);
}
function chips(list) { return `<span class="chips">${list.map((b) => `<span class="chip">${hiLite(b)}</span>`).join("")}</span>`; }
function rows(t) {
  return `<div class="row"><span class="lab">Who</span><span class="who">${escapeHTML(t.who)}</span></div>` +
    `<div class="row"><span class="lab">Bonus</span>${chips(t.bonus)}</div>` +
    (t.when ? `<div class="row"><span class="lab">When</span><span>${escapeHTML(t.when)}</span></div>` : "");
}
function tooltipHtml(c, rank) {
  const t = TIPS[c.id];
  if (!t) return `<div class="nplh-tip"><p><b>Basic.</b> ${escapeHTML(c.base)}</p>${c.custom ? `<ol>${(c.upgrades ?? []).map((u) => `<li>${escapeHTML(u)}</li>`).join("") || "<li>No upgrades defined.</li>"}</ol>` : `<p><b>Upgraded.</b> ${escapeHTML(c.upgrade)}</p>`}</div>`;
  let html = `<div class="nplh-tip">${rows(t)}`;
  if (t.ladder) {
    const step = Math.max(0, rank - 1);
    html += `<div class="lab ladder-title">Upgrades, in order${step ? ` · crew is on step ${step}` : ""}</div><table class="ladder">${t.ladder.map((x, i) => `<tr class="${i + 1 === step ? "now" : ""}${i + 1 < step ? " done" : ""}"><td>${i + 1}</td><td>${hiLite(x)}</td></tr>`).join("")}</table>`;
  } else if (t.up) {
    html += `<hr><div class="row"><span class="lab">Upgraded</span><span class="who">${escapeHTML(t.up.who)}</span></div><div class="row"><span class="lab">Bonus</span>${chips(t.up.bonus)}</div>` + (t.up.when ? `<div class="row"><span class="lab">When</span><span>${escapeHTML(t.up.when)}</span></div>` : "");
  }
  return html + "</div>";
}

/** Fills empty crew slots with the party: every character a player owns, up to six. Runs once, when no slot is filled. */
async function autoCrew(doc) {
  const s = state(doc.getFlag(ID, "hq"));
  if ((s.crewSlots ?? []).some(Boolean)) return;
  const party = game.actors.filter((a) => a.type === "character" && game.users.some((u) => !u.isGM && a.testUserPermission(u, "OWNER")))
    .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 6).map((a) => a.uuid);
  if (!party.length) return;
  await doc.update({[`flags.${ID}.hq.crewSlots`]: Array.from({length: 6}, (_, i) => party[i] ?? "")});
}

/** Drops a journal pin for the HQ on its scene, once, at the centre of the map. Opening the pin opens the sheet. */
async function pinOnScene(scene, doc) {
  if (scene.notes.some((n) => n.entryId === doc.id)) return;
  const d = scene.dimensions;
  await scene.createEmbeddedDocuments("Note", [{entryId: doc.id, x: Math.round(d.sceneX + d.sceneWidth / 2), y: Math.round(d.sceneY + d.sceneHeight / 2),
    texture: {src: "icons/svg/house.svg"}, iconSize: 48, text: doc.name, fontSize: 24, global: true}]);
}

async function createHQ() {
  if (!game.user.isGM) return ui.notifications.warn("Ask your GM to create a Headquarters.");
  const doc = await JournalEntry.create({name: "New Headquarters", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
    flags: {core: {sheetClass: `${ID}.HeadquartersSheet`}, [ID]: {hq: state()}}});
  doc.sheet.render(true);
  return doc;
}
registerAction("vote", async (hq, {improvement}, user) => {
  await hq.setFlag(ID, "hq", vote(state(hq.getFlag(ID, "hq")), user.id, improvement));
});

/** The Actors sidebar: rename Wizards' "Improvement" to "Player Improvement" and add "HQ Improvement" under it. */
function decorateActorDirectory(html) {
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root || root.querySelector(".nunu-hq-improvement")) return;
  const wizards = Array.from(root.querySelectorAll("button")).find((b) => b.textContent.trim() === "Improvement");
  if (wizards) wizards.innerHTML = wizards.innerHTML.replace(/Improvement\s*$/, "Player Improvement");
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "nunu-hq-improvement";
  btn.innerHTML = '<i class="fas fa-house"></i> HQ Improvement';
  btn.addEventListener("click", () => {
    const hqs = game.journal.filter((j) => j.getFlag(ID, "hq") && j.testUserPermission(game.user, "OBSERVER"));
    if (!hqs.length) return ui.notifications.warn("No headquarters has been shared with you yet.");
    hqs[0].sheet.render(true, {tab: "improvements"});
  });
  if (wizards?.parentElement) wizards.parentElement.insertBefore(btn, wizards.nextSibling);
  else (root.querySelector(".directory-footer") ?? root).appendChild(btn);
}

Hooks.once("init", () => {
  installWorkshopHooks();
  installApprovalHooks();
  installPresenceHooks();
  DocumentSheetConfig.registerSheet(JournalEntry, ID, HeadquartersSheet, {label: "NuNu Headquarters", makeDefault: false});
});
/** What other modules (the calendar) need to know: the crew's healing bonus and Hustle mode from the HQ they have access to. */
function crewHQ() { return game.journal.find((j) => j.getFlag(ID, "hq") && state(j.getFlag(ID, "hq")).access) ?? null; }
function healingBonus() { const hq = crewHQ(); return hq ? benefits(state(hq.getFlag(ID, "hq"))).healing : 0; }
function hustleMode() { const hq = crewHQ(); return hq ? moraleMode(state(hq.getFlag(ID, "hq"))).hustle : "single"; }
Hooks.once("ready", () => { game.modules.get(ID).api = {createHQ, healingBonus, hustleMode}; });
Hooks.on('updateJournalEntry', (doc, changes) => {
  if (!changes.ownership || game.users.find(u => u.isGM && u.active)?.id !== game.user.id) return;
  syncStashOwnership(doc).catch(e => ui.notifications.error(e.message));
});
Hooks.on('updateActor', actor => {
  for (const journal of game.journal) {
    if (state(journal.getFlag(ID, 'hq')).stashUuid !== actor.uuid) continue;
    for (const app of Object.values(journal.apps)) if (app instanceof HeadquartersSheet && app.rendered) app.render(false);
  }
});
Hooks.on("renderActorDirectory", (app, html) => { setTimeout(() => decorateActorDirectory(html), 60); });
Hooks.on("renderJournalDirectory", (app, html) => {
  if (!game.user.isGM || html.find(".nplh-create").length) return;
  const button = $('<button type="button" class="nplh-create"><i class="fas fa-house"></i> Create Headquarters</button>');
  button.on("click", () => createHQ().catch(e => ui.notifications.error(e.message)));
  html.find(".directory-header").append(button);
});
