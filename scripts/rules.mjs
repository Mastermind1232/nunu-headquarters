export const ID = "nunu-headquarters";
export const SYSTEM = "cyberpunk-red-core";
export const STARTER_IP = 40;
export const COST = 40;
// Rank 0 = absent, 1 = improvement, 2+ = improvement plus upgrades.
export const CATALOG = [
  ["evidence", "Evidence Wall", 3, "Lawmen and Medias: +2 to investigation-related Composition, Criminology, Cryptography, Deduction, Education, Forgery, Library Search and Photograph/Film.", "Lawmen: bonus becomes +3. Medias retain +2 and gain +1 effective Credibility Rank for Believability on a story developed here."],
  ["garage", "Garage", 3, "Crew Compact Groundcar; cannot be sold or benefit from Moto. Vehicle upgrades can be purchased separately. If destroyed beyond repair, lose this improvement and its upgrade without refund.", "A Nomad with all vehicles fully repaired and operational can spend one week reassigning Moto vehicle and upgrade choices."],
  ["lockup", "Lockup", 3, "One soundproof cell. A prisoner needs BODY 13+ to break out; outside rescue remains possible.", "Three separate cells. Lawmen gain +2 Interrogation against a prisoner held for at least one day."],
  ["lounge", "Lounge", 4, "Fixers gain +2 Bribery, Bureaucracy, Business, Conversation, Human Perception, Persuasion and Trading during meetings held here.", "Fixers and Medias gain +2 to checks arranging an in-person meeting within their Contacts/Clients or Access/Sources, as the GM decides."],
  ["medbay", "Medbay", 4, "Crew natural healing uses BODY +2. Medtechs gain +2 First Aid, Paramedic and Surgery here.", "Medtechs can use Science (Chemistry) for Maker-style street-drug upgrading, fabrication and invention; expertise equals Medical Tech skill level."],
  ["morale", "Morale Boost", 4, "Recreation or decoration that reduces each crew member's monthly Lifestyle cost by 50eb.", "Ten upgrades, in order: 1, everyone restores 1d6/2 Humanity each month. 2, natural healing as if BODY were 1 higher. 3, the crew gains 1 LUCK. 4, monthly Humanity becomes 1d6. 5, Fixers +2 Trading when negotiating pay; others can haggle 20% more. 6, Hustle twice and keep the better. 7, another 1 LUCK. 8, Hustle twice and keep both. 9, monthly Humanity becomes the best of 2d6. 10, a unique benefit agreed with the GM."],
  ["rent", "Rent Reduction", 4, "The HQ's rent drops one row on the housing table (a Cube Hotel drops to 100eb). The GM edits the rent box to match.", "Each upgrade adds one bed without raising rent, up to twice the original bed count."],
  ["server", "Server Room", 4, "Build an HQ NET Architecture/security system with a 20,000eb allocation using Home Security 2045. Purchased assets cannot be removed or resold; leftover funds are forfeited.", "Netrunners use Electronics/Security Tech for Maker-style cyberdeck, hardware and program projects; expertise equals Interface Rank."],
  ["studio", "Studio", 5, "Rockerboys gain +2 Acting, Composition, Play Instrument, Paint/Draw/Sculpt and Photograph/Film while here.", "A Rockerboy can refine an art project for one week per cumulative +2 on required art checks. Failure allows another week; completion, abandonment or a natural 1 ends the refinement bonus. Fumble Recovery cannot prevent its loss."],
  ["training", "Training Area", 6, "One week practices one skill for +1: Athletics, Archery, Autofire, Brawling, Evasion, Handgun, Heavy Weapons, Martial Arts, Melee Weapon or Shoulder Arms. Expires on the next Group IP award or new practice.", "Solos may practice two different eligible skills at once."],
  ["workshop", "Workshop", 6, "A Tech using Upgrade, Fabrication or Invention Expertise here can credit the same time toward a second project.", "The same time can also be credited toward a third project."],
  ["workstation", "Workstation", 6, "Choose one Exec Team Member. They become a crew member, gain IP when their Exec does, receive a share of gig pay, and follow their Exec to a new employer. GM spends their IP/cash. Losing access stops new awards, not past gains.", "The selected Team Member stays loyal unless betrayed. If this upgraded workstation is lost, restore it before other HQ purchases or the Team Member leaves." ]
].map(([id, name, page, base, upgrade]) => ({id, name, page, base, upgrade}));

export function defaults() {
  return {schema: 1, purchaseCost: COST, image: "", crewSlots: [], residents: [], sceneId: "", votes: {}, garageUuid: "", stashUuid: "", ip: 0, spent: 0, location: "", description: "", notes: "", crew: "", rent: 0, reducedRent: 0, beds: 1, access: true, faction: false, workstationDebt: false, improvements: Object.fromEntries(CATALOG.map(x => [x.id, 0])), log: []};
}
export function state(raw = {}) {
  const d = defaults();
  const customImprovements = (raw.customImprovements ?? []).map(c => ({...c, upgrades: [...c.upgrades]}));
  return {...d, ...raw, customImprovements, votes: {...(raw.votes ?? {})}, improvements: {...d.improvements, ...Object.fromEntries(customImprovements.map(c => [c.id, 0])), ...raw.improvements}, log: [...(raw.log ?? [])]};
}
export function catalog(s) { return [...CATALOG, ...(s.customImprovements ?? []).map(c => ({...c, custom: true}))]; }
export function saveCustom(raw, entry) {
  const s = state(raw);
  if (!/^custom_[A-Za-z0-9]+$/.test(entry.id)) throw new Error("Invalid custom improvement ID.");
  const name = String(entry.name ?? '').trim(), base = String(entry.base ?? '').trim();
  const upgrades = Array.isArray(entry.upgrades) ? entry.upgrades.map(x => String(x).trim()).filter(Boolean) : [];
  if (!name || name.length > 100 || !base || base.length > 4000) throw new Error("Enter a name (up to 100 characters) and benefit (up to 4000 characters).");
  if (upgrades.length > 50 || upgrades.some(x => x.length > 4000)) throw new Error("Use at most 50 upgrades, each up to 4000 characters.");
  if (upgrades.length < (s.improvements[entry.id] ?? 0) - 1) throw new Error("Cannot remove already purchased upgrade tiers. Record the improvement as lost first.");
  const index = s.customImprovements.findIndex(c => c.id === entry.id);
  const value = {id: entry.id, name, base, upgrades};
  if (index < 0) s.customImprovements.push(value); else s.customImprovements[index] = value;
  s.improvements[entry.id] ??= 0;
  return s;
}
export function limit(s, id) { const custom = (s.customImprovements ?? []).find(c => c.id === id); return custom ? 1 + custom.upgrades.length : id === "morale" ? 11 : id === "rent" ? 1 + s.beds : 2; }
export function purchaseError(s, id) {
  const cost = s.purchaseCost === undefined ? COST : s.purchaseCost;
  if (!Number.isSafeInteger(cost) || cost < 0) return "Purchase cost must be a non-negative whole number of HQ IP.";
  if (!catalog(s).some(x => x.id === id)) return "Unknown improvement.";
  if (s.faction) return "Crew HQ IP cannot be spent on a faction HQ.";
  if (!s.access) return "Restore access before making purchases.";
  if (s.workstationDebt && id !== "workstation") return "Restore the upgraded Workstation first, or resolve the Team Member's departure.";
  if (s.improvements[id] >= limit(s, id)) return "Maximum upgrades reached.";
  if (id === "rent" && s.rent <= 0) return "Rent Reduction requires a monthly rent cost.";
  if (s.ip < cost) return `Not enough HQ IP (${cost} required).`;
  return "";
}
export function purchase(raw, id) {
  const s = state(raw), error = purchaseError(s, id);
  if (error) throw new Error(error);
  s.ip -= s.purchaseCost; s.spent += s.purchaseCost; s.improvements[id]++;
  if (id === "workstation" && s.improvements[id] === 2) s.workstationDebt = false;
  return s;
}
export function lose(raw, id) {
  const s = state(raw);
  if (!catalog(s).some(x => x.id === id)) throw new Error("Unknown improvement.");
  if (id === "workstation" && s.improvements[id] >= 2) s.workstationDebt = true;
  s.improvements[id] = 0;
  return s;
}
export function benefits(raw) {
  const s = state(raw), m = Math.max(0, s.improvements.morale - 1), active = s.access;
  return {
    healing: active ? (s.improvements.medbay ? 2 : 0) + (m >= 2 ? 1 : 0) : 0,
    luck: active ? Number(m >= 3) + Number(m >= 7) : 0,
    lifestyle: active && s.improvements.morale ? 50 : 0,
    beds: s.beds + Math.max(0, s.improvements.rent - 1),
    monthlyRent: Math.max(0, s.rent),
    humanity: !active || m < 1 ? "None" : m >= 9 ? "2d6, keep highest" : m >= 4 ? "1d6" : "1d6 / 2 (round down)",
    hustle: !active || m < 6 ? "Normal" : m >= 8 ? "Roll twice; earn both" : "Roll twice; choose one",
    negotiation: active && m >= 5,
    custom: active && m >= 10
  };
}

/* ---------------- NuNu additions ---------------- */

/** Claims a place: the scene is the HQ's identity; everything else is typed at claim time. */
export function claim(raw, {sceneId, starter = "", ip = STARTER_IP, rent = 0, beds = 1} = {}) {
  const s = state(raw);
  if (!sceneId) throw new Error("Pick the scene of the place being claimed.");
  for (const [k, v, min] of [["ip", ip, 0], ["rent", rent, 0], ["beds", beds, 1]]) {
    if (!Number.isSafeInteger(v) || v < min) throw new Error(`Enter a whole number for ${k}${min ? ` (at least ${min})` : ""}.`);
  }
  if (starter && !catalog(s).some((c) => c.id === starter)) throw new Error("Unknown starting Improvement.");
  Object.assign(s, {sceneId, rent, reducedRent: 0, beds, access: true, faction: false});
  if (starter && !s.improvements[starter]) s.improvements[starter] = 1;
  s.ip += ip;
  return s;
}

/** Same rule the system uses to turn a skill name into its bonus key (cpr-systemUtils.slugify, 0.92.4). */
export function slugify(name) {
  const noSpace = String(name).split(" ").join("");
  let joined;
  if (["Conceal/Reveal Object", "Paint/Draw/Sculpt", "Resist Torture/Drugs"].includes(name)) joined = noSpace.split("/").join("Or");
  else if (name === "Language (Streetslang)") joined = noSpace.split("(").join("").split(")").join("");
  else joined = noSpace.split("/").join("And").split("&").join("And");
  return joined.charAt(0).toLowerCase() + joined.slice(1);
}

/** Bonuses that apply while a crew member's token is in the HQ scene and that scene is active. */
export const SITUATIONAL = {
  lounge: {roles: ["fixer"], bonus: 2, skills: ["Bribery", "Bureaucracy", "Business", "Conversation", "Human Perception", "Persuasion", "Trading"]},
  medbay: {roles: ["medtech"], bonus: 2, skills: ["First Aid", "Paramedic", "Surgery"]},
  studio: {roles: ["rockerboy"], bonus: 2, skills: ["Acting", "Composition", "Play Instrument", "Paint/Draw/Sculpt", "Photography/Film"]},
  evidence: {roles: ["lawman", "media"], bonus: 2, upgraded: {lawman: 3}, skills: ["Composition", "Criminology", "Cryptography", "Deduction", "Education", "Forgery", "Library Search", "Photography/Film"]},
};
export const PRACTICE_SKILLS = ["Athletics", "Archery", "Autofire", "Brawling", "Evasion", "Handgun", "Heavy Weapons", "Martial Arts", "Melee Weapon", "Shoulder Arms"];

export function effectChanges(skills, bonus) { return skills.map((n) => ({key: `bonuses.${slugify(n)}`, mode: 2, value: String(bonus)})); }
export function effectFlags(count, extra = {}) {
  return {[SYSTEM]: {changes: {cats: Object.fromEntries(Array.from({length: count}, (_, i) => [String(i), "skill"]))}}, [ID]: extra};
}
/** Which situational bonuses an actor with these roles should carry right now. */
export function desiredSituational(raw, roles, present) {
  const s = state(raw);
  if (!s.access || !present) return [];
  return Object.entries(SITUATIONAL).filter(([id, def]) => s.improvements[id] > 0 && def.roles.some((r) => roles.includes(r))).map(([id, def]) => {
    const rank = s.improvements[id];
    const bonus = Math.max(...def.roles.filter((r) => roles.includes(r)).map((r) => (rank >= 2 && def.upgraded?.[r]) ? def.upgraded[r] : def.bonus));
    return {improvement: id, bonus, skills: def.skills};
  });
}
/** How many skills a practice covers: Solos with the upgrade get two. */
export function practiceLimit(raw, roles) { const s = state(raw); return s.improvements.training >= 2 && roles.includes("solo") ? 2 : 1; }

/** Records or clears a user's vote for the next purchase. Voting for the same row again removes the vote. */
export function vote(raw, userId, improvementId) {
  const s = state(raw);
  if (improvementId && !catalog(s).some((c) => c.id === improvementId)) throw new Error("Unknown improvement.");
  if (!improvementId || s.votes[userId] === improvementId) delete s.votes[userId]; else s.votes[userId] = improvementId;
  return s;
}
export const votersFor = (raw, improvementId) => Object.entries(state(raw).votes).filter(([, id]) => id === improvementId).map(([userId]) => userId);

/* ---------------- Tooltip content: the bonus said once, the skills as a list, the condition as one line ---------------- */
export const TIPS = {
  lounge: {basic: {head: "Fixers, +2 to:", plus: "+2", list: ["Bribery", "Bureaucracy", "Business", "Conversation", "Human Perception", "Persuasion", "Trading"], cond: "In-person meetings held at the HQ."},
    up: {head: "Fixers and Medias, +2 to get a meeting", cond: "On the roll to set up an in-person meeting with one of their own Contacts, Clients, Access or Sources."}},
  medbay: {basic: {head: "Crew heals as if BODY were 2 higher. Medtechs, +2 to:", plus: "+2", list: ["First Aid", "Paramedic", "Surgery"], cond: "Skill bonus while at the HQ."},
    up: {head: "Medtechs Upgrade, Fabricate and Invent Street Drugs", cond: "With Science (Chemistry), as a Tech with Maker would. Their Medical Tech counts as the expertise level."}},
  studio: {basic: {head: "Rockerboys, +2 to:", plus: "+2", list: ["Acting", "Composition", "Play Instrument", "Paint/Draw/Sculpt", "Photography/Film"], cond: "While at the HQ."},
    up: {head: "Rockerboys refine a project for +2", cond: "A week of downtime adds +2 to that project's checks; each failed week stacks another +2. Ends when the project is done or abandoned. A natural 1 wipes the bonus."}},
  evidence: {basic: {head: "Lawmen and Medias, +2 to:", plus: "+2", list: ["Composition", "Criminology", "Cryptography", "Deduction", "Education", "Forgery", "Library Search", "Photography/Film"], cond: "Checks for an ongoing investigation, while at the HQ."},
    up: {head: "Lawmen +3 instead; a Media's Credibility counts one rank higher", cond: "For Believability on a story worked on at the wall."}},
  training: {basic: {head: "Anyone, +1 to one of:", plus: "+1", list: ["Athletics", "Archery", "Autofire", "Brawling", "Evasion", "Handgun", "Heavy Weapons", "Martial Arts", "Melee Weapon", "Shoulder Arms"], cond: "A week of downtime. Lasts until the crew's next Group IP award, or until they practice again."},
    up: {head: "Solos practice two skills at once"}},
  morale: {basic: {head: "Whole crew: −50eb off each member's monthly Lifestyle"},
    ladder: ["Restore 1d6/2 Humanity each month", "Heal as if BODY were 1 higher; stacks with the Medbay", "Crew gains 1 LUCK", "Monthly Humanity becomes 1d6", "Fixers +2 Trading when negotiating pay; others can haggle 20% more", "Hustle twice, keep the better", "Another 1 LUCK", "Hustle twice, keep both", "Monthly Humanity: best of 2d6", "A unique benefit agreed with the GM"]},
  rent: {basic: {head: "Rent drops one row on the housing table", cond: "The GM edits the rent to match."}, up: {head: "+1 bed per upgrade", cond: "Up to double the original beds, rent unchanged."}},
  garage: {basic: {head: "A crew Compact Groundcar", cond: "Can take Vehicle Upgrades. Can't be sold, no Moto bonus. Wrecked beyond repair means buying the Improvement again."},
    up: {head: "Nomads re-spec Moto", cond: "A week of downtime with every vehicle at full HP."}},
  lockup: {basic: {head: "One soundproof cell", cond: "A prisoner needs BODY 13 or more to break out."}, up: {head: "Three cells; Lawmen +2 Interrogation", cond: "Against a prisoner held at least a day."}},
  server: {basic: {head: "The HQ's own NET Architecture", cond: "Built with 20,000eb of Home Security 2045. Nothing bought with it can be resold or removed; unspent funds are lost."},
    up: {head: "Netrunners Upgrade, Fabricate and Invent cyberdecks, hardware and programs", cond: "With Electronics/Security Tech, as a Tech with Maker would. Their Interface rank counts as the expertise level."}},
  workshop: {basic: {head: "Techs bank the same time toward a second project", cond: "Upgrade, Fabrication or Invention work done at the HQ."}, up: {head: "A third project"}},
  workstation: {basic: {head: "An Exec's Team Member becomes a full crew member", cond: "Gains IP with the Exec and an equal share of pay. Loyal to the Exec, not the corp."},
    up: {head: "They stay unless the Exec betrays them", cond: "If this upgrade is lost, restore it before any other HQ spending, or they leave."}},
};
