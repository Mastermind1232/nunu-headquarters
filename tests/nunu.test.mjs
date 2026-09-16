import {test} from "node:test";
import assert from "node:assert/strict";
import {ID, state, claim, PRESETS, slugify, desiredSituational, effectChanges, effectFlags, practiceLimit, STARTER_IP} from "../scripts/rules.mjs";

test("slugify matches the system's skill keys", () => {
  assert.equal(slugify("Human Perception"), "humanPerception");
  assert.equal(slugify("Paint/Draw/Sculpt"), "paintOrDrawOrSculpt");
  assert.equal(slugify("Photography/Film"), "photographyAndFilm");
  assert.equal(slugify("Melee Weapon"), "meleeWeapon");
  assert.equal(slugify("Library Search"), "librarySearch");
  assert.equal(slugify("Language (Streetslang)"), "languageStreetslang");
});
test("claiming a preset fills the place, builds in its Improvement and grants the starter IP", () => {
  for (const p of PRESETS) {
    const {s, preset} = claim(state(), p.id);
    assert.equal(preset.id, p.id);
    assert.equal(s.rent, p.rent); assert.equal(s.beds, p.beds); assert.equal(s.location, p.location);
    assert.equal(s.improvements[p.starter], 1); assert.equal(s.ip, STARTER_IP); assert.equal(s.spent, 0);
  }
  const twice = claim(claim(state(), "tripleg").s, "tripleg");
  assert.equal(twice.s.improvements.training, 1, "claiming again does not stack the free Improvement");
  assert.throws(() => claim(state(), "nowhere"));
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
