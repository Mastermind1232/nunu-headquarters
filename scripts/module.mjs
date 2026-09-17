import {ID, catalog, saveCustom, state, purchase, purchaseError, lose, benefits, limit, CATALOG, claim, SITUATIONAL, practiceLimit, STARTER_IP} from "./rules.mjs";
import {customDialog, escapeHTML} from "./custom-improvements.mjs";
import {runBenefit, ownedCharacters, moraleMode, clearPractice} from "./character-benefits.mjs";
import {installApprovalHooks} from "./approval.mjs";
import {installPresenceHooks, actorRoles} from "./presence.mjs";
import {assetData, openLink, saveDrop, setCrewSlot, createStash, syncStashOwnership, moneyDialog} from "./hq-assets.mjs";
import {crewIPDialog} from "./crew-ip.mjs";
import {workshopView, bindWorkshop} from './workshop-ui.mjs';
import {installWorkshopHooks} from './workshop-service.mjs';

export class HeadquartersSheet extends DocumentSheet {
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
    assets.crew = assets.crew.map((c) => ({...c, resident: Boolean(s.residents?.[c.index])}));
    const w = await workshopView(this.document);
    const scenes = (game.scenes?.contents ?? []).map((sc) => ({id: sc.id, name: sc.name, selected: sc.id === s.sceneId}));
    const situational = Object.entries(SITUATIONAL).filter(([id]) => s.improvements[id] > 0).map(([id, def]) => ({
      name: CATALOG.find((c) => c.id === id).name, roles: def.roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", "),
      bonus: s.improvements[id] >= 2 && def.upgraded ? Object.values(def.upgraded)[0] : def.bonus, skills: def.skills.join(", ")}));
    const soloTwo = ownedCharacters().some((a) => practiceLimit(s, actorRoles(a)) > 1);
    return {name: this.document.name, s, b: benefits(s), assets, w, editable: this.isEditable,
      scenes, sceneName: scenes.find((x) => x.selected)?.name ?? "", residentCount: assets.crew.filter((c) => c.resident && c.linked).length,
      showWorkshop: w.hasTech, situational, soloTwo,
      canUseBenefits, canRecoverHumanity: canUseBenefits && Boolean(moraleMode(s).humanityFormula),
      customBenefits: s.access ? s.customImprovements.filter(c => s.improvements[c.id] > 0).map(c => ({...c, acquiredUpgrades: c.upgrades.slice(0, s.improvements[c.id] - 1)})) : [],
      cards: catalog(s).map(c => ({...c, customUpgrades: c.custom ? c.upgrades : [], rank: s.improvements[c.id], owned: s.improvements[c.id] > 0,
        upgraded: s.improvements[c.id] > 1, upgrades: Math.max(0, s.improvements[c.id] - 1),
        maxUpgrades: limit(s, c.id) - 1, error: purchaseError(s, c.id)})),
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
    if (!this.isEditable) return;
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
    if (data.residents !== undefined) updates[`flags.${ID}.hq.residents`] = Array.from({length: 6}, (_, i) => Boolean(Array.isArray(data.residents) ? data.residents[i] : data.residents?.[i]));
    if (data.sceneId !== undefined) updates[`flags.${ID}.hq.sceneId`] = String(data.sceneId ?? "");
    for (const key of ["location", "description", "notes", "crew", "rent", "reducedRent", "beds", "access", "faction", "purchaseCost"]) {
      if (!(key in data)) continue;
      let value = data[key];
      if (["rent", "reducedRent", "beds", "purchaseCost"].includes(key)) {
        value = Number(value);
        if (!Number.isSafeInteger(value) || value < (key === "beds" ? 1 : 0)) throw new Error("Enter a valid non-negative whole number; original beds must be at least 1.");
        if (key === "beds" && value < s.improvements.rent - 1) throw new Error("Original beds cannot be lower than the purchased extra beds.");
      }
      updates[`flags.${ID}.hq.${key}`] = value;
    }
    if (data.name !== undefined) updates.name = String(data.name).trim() || "Headquarters";
    await this.document.update(updates);
  }
  async act(action, id) {
    if (!this.isEditable) return;
    const award = Number(this.element.find("[data-award]").val());
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
      const starter = picked.starter ? catalog(s).find((c) => c.id === picked.starter)?.name : null;
      label = `Claimed ${scene.name}` + (starter ? `: ${starter} built in` : "") + (picked.ip ? `, +${picked.ip} HQ IP` : "");
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

async function createHQ() {
  if (!game.user.isGM) return ui.notifications.warn("Ask your GM to create a Headquarters.");
  const doc = await JournalEntry.create({name: "New Headquarters", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
    flags: {core: {sheetClass: `${ID}.HeadquartersSheet`}, [ID]: {hq: state()}}});
  doc.sheet.render(true);
  return doc;
}
Hooks.once("init", () => {
  installWorkshopHooks();
  installApprovalHooks();
  installPresenceHooks();
  DocumentSheetConfig.registerSheet(JournalEntry, ID, HeadquartersSheet, {label: "NuNu Headquarters", makeDefault: false});
});
Hooks.once("ready", () => { game.modules.get(ID).api = {createHQ}; });
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
Hooks.on("renderJournalDirectory", (app, html) => {
  if (!game.user.isGM || html.find(".nplh-create").length) return;
  const button = $('<button type="button" class="nplh-create"><i class="fas fa-house"></i> Create Headquarters</button>');
  button.on("click", () => createHQ().catch(e => ui.notifications.error(e.message)));
  html.find(".directory-header").append(button);
});
