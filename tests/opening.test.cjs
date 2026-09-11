const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  console,
  setTimeout() {},
  clearTimeout() {},
  document: { getElementById() { return { parentElement: { classList: { add() {}, remove() {} } } }; } }
});
context.window = context;
for (const file of ["js/data.js", "js/character.js", "js/boss-phase.js", "js/skills.js", "js/defense.js", "js/combat.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const W = context.Wuxia;

function makeGame(ai = false) {
  const noop = () => {};
  const calls = { callouts: [], messages: [], sparks: 0 };
  const game = {
    calls,
    camera: { reset: noop, release: noop, focusBetween: noop, punch: noop, shake: noop, pan: noop, follow: noop, slowPush: noop },
    effects: {
      clear: noop, update: noop, trackSword: noop, poise: noop, damage: noop, shockwave: noop,
      spark() { calls.sparks += 1; }, slash: noop, dust: noop, petal: noop, lightning: noop, afterimage: noop
    },
    audio: { unlock: noop, tone: noop, slash: noop, hit: noop, breakPoise: noop, charge: noop, dash: noop, thunder: noop },
    shell: { classList: { add: noop, remove: noop, toggle: noop } },
    updateUI: noop,
    setMessage(message) { calls.messages.push(message); },
    showSkillTitle: noop,
    callout(hanja, label, kind) { calls.callouts.push({ hanja, label, kind }); },
    cinematic: noop,
    flash: noop
  };
  game.player = new W.Character(W.PLAYER_DATA, 335, 476);
  game.enemy = new W.Character(W.ENEMY_DATA, 945, 476);
  game.combat = new W.Combat(game);
  game.combat.ai = ai;
  game.combat.reset();
  return game;
}

test("all five intents map deterministically to the specified opening", () => {
  const expected = {
    darkSlash: ["crossGuard", "THRUST", 1.1, 1.5],
    ghostThrust: ["needlePoint", "SLASH", 1.1, 1.5],
    darkChain: ["flowingShadow", "MULTI", 1.1, 1.5],
    darkBreath: ["openGate", "SLASH", 1.1, 1.5],
    darkFall: ["ultimateCharge", "SLASH", 1, 1.5]
  };
  for (const [intent, [id, sampleType, hp, poise]] of Object.entries(expected)) {
    const openings = Array.from({ length: 10 }, () => W.openingForIntent(intent));
    assert.ok(openings.every(opening => opening === openings[0]), intent);
    assert.equal(openings[0].id, id);
    const result = W.evaluateOpening(openings[0], sampleType);
    assert.equal(result.matched, true);
    assert.equal(result.damageMultiplier, hp);
    assert.equal(result.poiseMultiplier, poise);
  }
});

test("regular matchups, special openings, mismatches, and ultimate remain exact", () => {
  const slashOpening = W.openingForIntent("ghostThrust");
  assert.deepEqual(
    ["SLASH", "THRUST", "MULTI"].map(type => W.evaluateOpening(slashOpening, type).matched),
    [true, false, false]
  );
  for (const intent of ["darkBreath", "darkFall"]) {
    const opening = W.openingForIntent(intent);
    for (const type of ["SLASH", "THRUST", "MULTI"]) assert.equal(W.evaluateOpening(opening, type).matched, true);
    const ultimate = W.evaluateOpening(opening, "ULTIMATE");
    assert.equal(ultimate.matched, false);
    assert.equal(ultimate.damageMultiplier, 1);
    assert.equal(ultimate.poiseMultiplier, 1);
  }
});

test("reset, F8 cycling, and phase synchronization update intent and opening together", () => {
  const game = makeGame();
  assert.equal(game.combat.opening, W.openingForIntent(game.combat.intent));
  assert.equal(game.enemy.openingId, game.combat.opening.id);
  const cycled = [];
  for (let i = 0; i < W.ENEMY_SKILLS.length; i++) {
    game.combat.forceIntent();
    cycled.push(game.combat.intent.id);
    assert.equal(game.combat.opening, W.openingForIntent(game.combat.intent));
    assert.equal(game.enemy.openingId, game.combat.opening.id);
  }
  assert.deepEqual(new Set(cycled), new Set(W.ENEMY_SKILLS.map(skill => skill.id)));
  game.enemy.hp = game.enemy.maxHp / 2;
  game.combat.phase.armIfEligible();
  game.combat.phase.beginTransition();
  assert.equal(game.combat.opening, W.openingForIntent(game.combat.intent));
  game.combat.phase.forceNext();
  assert.equal(game.combat.opening, W.openingForIntent(game.combat.intent));
});

test("SkillRunner snapshots the opening and applies each multiplier once", () => {
  const game = makeGame();
  const combat = game.combat;
  combat.setEnemyIntent(W.ENEMY_SKILLS.find(skill => skill.id === "darkSlash"));
  const skill = { id: "probe", attackType: "THRUST", damage: [1000, 1000], poiseDamage: 20, duration: 1 };
  const runner = new W.SkillRunner(combat, game.player, game.enemy, skill);
  combat.setEnemyIntent(W.ENEMY_SKILLS.find(item => item.id === "ghostThrust"));
  assert.equal(runner.opening.openingId, "crossGuard");
  assert.equal(runner.opening.matched, true);

  game.player.attack = 100;
  game.player.crit = 0;
  game.enemy.defense = 0;
  game.enemy.hp = 5000;
  game.enemy.poise = 100;
  const originalRand = W.util.rand;
  W.util.rand = (a, b) => a;
  runner.fxHit();
  W.util.rand = originalRand;
  assert.equal(game.enemy.hp, 3900, "HP receives exactly one 1.10 multiplier");
  assert.equal(game.enemy.poise, 70, "poise receives exactly one 1.50 multiplier");
  assert.equal(game.calls.callouts.filter(call => call.hanja === "破隙").length, 1);
});

test("multi-hit distribution reuses one snapshot without stacking or repeated feedback", () => {
  const game = makeGame();
  const combat = game.combat;
  combat.setEnemyIntent(W.ENEMY_SKILLS.find(skill => skill.id === "darkChain"));
  const plum = W.SKILLS.find(skill => skill.id === "plum");
  const runner = new W.SkillRunner(combat, game.player, game.enemy, plum);
  game.enemy.poise = 200;
  game.enemy.hp = 100000;
  game.player.crit = 0;
  const originalRand = W.util.rand;
  W.util.rand = (a, b) => a;
  for (let i = 0; i < 7; i++) runner.fxHit({ damageScale: .36, poiseScale: .07, multi: true });
  runner.fxHit({ damageScale: 2.15, poiseScale: .51, final: true });
  W.util.rand = originalRand;
  assert.equal(game.enemy.poise, 155, "per-hit rounding is preserved and 1.50 never compounds");
  assert.equal(game.calls.callouts.filter(call => call.hanja === "破隙").length, 1);
});

test("enemy attacks and counter damage do not inherit the player opening bonus", () => {
  const game = makeGame();
  const combat = game.combat;
  combat.setEnemyIntent(W.ENEMY_SKILLS.find(skill => skill.id === "darkSlash"));
  game.player.attack = 100;
  game.player.crit = 0;
  game.enemy.defense = 0;
  game.enemy.hp = 5000;
  game.enemy.poise = 100;
  const probe = { damage: [1000, 1000], poiseDamage: 20 };
  const originalRand = W.util.rand;
  W.util.rand = (a, b) => a;
  combat.hit(game.player, game.enemy, probe, {});
  W.util.rand = originalRand;
  assert.equal(game.enemy.hp, 4000);
  assert.equal(game.enemy.poise, 80);
  assert.equal(game.calls.callouts.length, 0);
});

test("a matched hit that breaks poise keeps break feedback authoritative", () => {
  const game = makeGame();
  const combat = game.combat;
  combat.setEnemyIntent(W.ENEMY_SKILLS.find(skill => skill.id === "ghostThrust"));
  game.enemy.poise = 10;
  game.enemy.hp = 5000;
  game.enemy.defense = 0;
  game.player.attack = 100;
  game.player.crit = 0;
  const skill = { id: "probe", attackType: "SLASH", damage: [100, 100], poiseDamage: 14, duration: 1 };
  const runner = new W.SkillRunner(combat, game.player, game.enemy, skill);
  const originalRand = W.util.rand;
  W.util.rand = (a, b) => a;
  runner.fxHit();
  W.util.rand = originalRand;
  assert.equal(game.enemy.poise, 0);
  assert.equal(game.enemy.breakPending, true);
  assert.equal(game.calls.callouts.some(call => call.hanja === "破隙"), false);
  assert.equal(game.calls.callouts.at(-1).hanja, "破勢");
  assert.ok(game.calls.messages.includes("허점 +50% 기세"));
});

test("opening idle poses yield to timelines and reset without residue", () => {
  const enemy = new W.Character(W.ENEMY_DATA, 945, 476);
  enemy.setOpening(W.openingForIntent("darkChain"));
  enemy.update(.22, false, false);
  const openingPose = enemy.currentPose();
  assert.ok(openingPose.crouch >= 28);
  assert.ok(openingPose.frontFoot >= 45);
  enemy.update(.01, false, true);
  assert.equal(enemy.canUseOpeningPose(), false);
  enemy.setPose({ crouch: 51, sword: 1.1 });
  const override = enemy.currentPose();
  assert.equal(override.crouch, 51);
  assert.equal(override.sword, 1.1);
  enemy.reset();
  assert.equal(enemy.openingId, null);
  assert.equal(enemy.poseOverride, null);
  assert.equal(enemy.openingReactTime, 0);
});
