import {test} from "node:test";
import assert from "node:assert/strict";
import {ID, state, claim, slugify, benefits, vote, votersFor, TIPS, CATALOG, desiredSituational, effectChanges, effectFlags, practiceLimit, STARTER_IP} from "../scripts/rules.mjs";

test("slugify matches the system's skill keys", () => {
  assert.equal(slugify("Human Perception"), "humanPerception");
  assert.equal(slugify("Paint/Draw/Sculpt"), "paintOrDrawOrSculpt");
  assert.equal(slugify("Photography/Film"), "photographyAndFilm");
  assert.equal(slugify("Melee Weapon"), "meleeWeapon");
  assert.equal(slugify("Library Search"), "librarySearch");
  assert.equal(slugify("Language (Streetslang)"), "languageStreetslang");
});
test("claiming needs a scene, sets the place, builds in the starting Improvement and grants the starting IP", () => {
  const s = claim(state(), {sceneId: "S1", starter: "training", ip: 40, rent: 5000, beds: 6});
  assert.equal(s.sceneId, "S1"); assert.equal(s.rent, 5000); assert.equal(s.beds, 6);
  assert.equal(s.improvements.training, 1); assert.equal(s.ip, 40); assert.equal(s.spent, 0);
  const again = claim(s, {sceneId: "S1", starter: "training", ip: 0, rent: 5000, beds: 6});
  assert.equal(again.improvements.training, 1, "claiming again does not stack the free Improvement");
  assert.equal(claim(state(), {sceneId: "S2"}).ip, STARTER_IP, "starting IP defaults to 40");
  assert.equal(claim(state(), {sceneId: "S2", starter: ""}).improvements.training, 0);
  assert.throws(() => claim(state(), {}), /scene/);
  assert.throws(() => claim(state(), {sceneId: "S1", starter: "nowhere"}), /Unknown/);
  assert.throws(() => claim(state(), {sceneId: "S1", beds: 0}), /beds/);
});
test("situational bonuses depend on ownership, role and presence", () => {
  const s = state({improvements: {lounge: 1, medbay: 1, evidence: 2}});
  assert.deepEqual(desiredSituational(s, ["fixer"], false), []);
  const fixer = desiredSituational(s, ["fixer"], true);
  assert.equal(fixer.length, 1); assert.equal(fixer[0].improvement, "lounge"); assert.equal(fixer[0].bonus, 2);
  const lawman = desiredSituational(s, ["lawman"], true);
  assert.equal(lawman[0].improvement, "evidence"); assert.equal(lawman[0].bonus, 3, "upgraded Evidence Wall gives Lawmen +3");
  assert.equal(desiredSituational(s, ["media"], true)[0].bonus, 2);
  assert.equal(desiredSituational(s, ["solo"], true).length, 0);
  assert.equal(desiredSituational({...s, access: false}, ["fixer"], true).length, 0);
});
test("effect data uses system keys, ADD mode and the skill category flag per change", () => {
  const changes = effectChanges(["First Aid", "Surgery"], 2);
  assert.deepEqual(changes, [{key: "bonuses.firstAid", mode: 2, value: "2"}, {key: "bonuses.surgery", mode: 2, value: "2"}]);
  const flags = effectFlags(2, {practice: "J.1"});
  assert.deepEqual(flags["cyberpunk-red-core"].changes.cats, {0: "skill", 1: "skill"});
  assert.equal(flags[ID].practice, "J.1");
});
test("practice limit is one skill, two for Solos with the upgraded Training Area", () => {
  assert.equal(practiceLimit(state({improvements: {training: 1}}), ["solo"]), 1);
  assert.equal(practiceLimit(state({improvements: {training: 2}}), ["solo"]), 2);
  assert.equal(practiceLimit(state({improvements: {training: 2}}), ["fixer"]), 1);
});

test("rent is a plain number the GM edits; Rent Reduction changes nothing automatically", () => {
  assert.equal(benefits(state({rent: 5000})).monthlyRent, 5000);
  assert.equal(benefits(state({rent: 5000, improvements: {rent: 1}})).monthlyRent, 5000);
});

test("votes: one per user, toggled off by voting again, listed per improvement", () => {
  let s = vote(state(), "u1", "lounge"); s = vote(s, "u2", "lounge"); s = vote(s, "u3", "medbay");
  assert.deepEqual(votersFor(s, "lounge"), ["u1", "u2"]); assert.deepEqual(votersFor(s, "medbay"), ["u3"]);
  s = vote(s, "u1", "medbay"); assert.deepEqual(votersFor(s, "lounge"), ["u2"]);
  s = vote(s, "u1", "medbay"); assert.deepEqual(votersFor(s, "medbay"), ["u3"], "voting again removes the vote");
  assert.throws(() => vote(s, "u1", "nowhere"), /Unknown/);
});

test("every improvement has tooltip content: a basic tier, and an upgrade or the Morale ladder", () => {
  for (const c of CATALOG) {
    const tip = TIPS[c.id]; assert.ok(tip?.basic?.head, c.id);
    assert.ok(tip.ladder ? tip.ladder.length === 10 : tip.up?.head, c.id);
    if (tip.basic.list) assert.ok(tip.basic.plus && tip.basic.list.length > 0, c.id);
  }
});
