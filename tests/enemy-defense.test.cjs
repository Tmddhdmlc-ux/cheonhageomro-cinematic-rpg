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
for (const file of ["js/data.js", "js/character.js", "js/enemy-defense.js", "js/boss-phase.js", "js/skills.js", "js/defense.js", "js/combat.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const W = context.Wuxia;

function makeGame() {
  const noop = () => {};
  const calls = { sparks: [], labels: [], damage: [], poise: [], clashes: 0, dashes: 0, afterimages: 0, dust: 0, callouts: [], messages: [] };
  const game = {
    calls,
    camera: { update: noop, reset: noop, release: noop, focusBetween: noop, punch: noop, shake: noop, pan: noop, follow: noop, slowPush: noop },
    effects: {
      clear: noop, update: noop, trackSword: noop, slash: noop, shockwave: noop, petal: noop, lightning: noop,
      spark(x, y, color) { calls.sparks.push({ x, y, color }); },
      reactionLabel(x, y, hanja, label, reactionType) { calls.labels.push({ x, y, hanja, label, reactionType }); },
      damage(x, y, value, crit, final, mitigated, mitigatedLabel) { calls.damage.push({ value, crit, final, mitigated, mitigatedLabel }); },
      poise(x, y, value) { calls.poise.push(value); },
      afterimage() { calls.afterimages += 1; },
      dust() { calls.dust += 1; }
    },
    audio: { unlock: noop, tone: noop, slash: noop, hit: noop, breakPoise: noop, charge: noop, thunder: noop, clash() { calls.clashes += 1; }, dash() { calls.dashes += 1; } },
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
  game.combat.ai = false;
  game.combat.reset();
  return game;
}

function setIntent(game, id) {
  game.combat.setEnemyIntent(W.ENEMY_SKILLS.find(skill => skill.id === id));
}

function fixedDamage(game) {
  game.player.attack = 100;
  game.player.crit = 0;
  game.enemy.defense = 0;
  const previous = W.util.rand;
  W.util.rand = a => a;
  return () => { W.util.rand = previous; };
}

test("general opening matrix has exact exploit, resisted, and neutral outcomes", () => {
  const cases = {
    crossGuard: { THRUST: ["exploit", null], SLASH: ["resisted", "block"], MULTI: ["neutral", null] },
    needlePoint: { SLASH: ["exploit", null], THRUST: ["resisted", "deflect"], MULTI: ["neutral", null] },
    flowingShadow: { MULTI: ["exploit", null], SLASH: ["resisted", "sidestep"], THRUST: ["resisted", "sidestep"] }
  };
  for (const [openingId, matrix] of Object.entries(cases)) {
    const opening = Object.values(W.ENEMY_OPENINGS).find(item => item.id === openingId);
    for (const [type, [result, reaction]] of Object.entries(matrix)) {
      const verdict = W.evaluateOpening(opening, type);
      assert.equal(verdict.result, result, `${openingId}/${type}`);
      assert.equal(verdict.reactionType, reaction, `${openingId}/${type}`);
    }
  }
});

test("special openings stay exploitable, while ultimate and broken targets are neutral", () => {
  for (const id of ["darkBreath", "darkFall"]) {
    for (const type of ["SLASH", "THRUST", "MULTI"]) assert.equal(W.evaluateOpening(W.openingForIntent(id), type).result, "exploit");
    assert.equal(W.evaluateOpening(W.openingForIntent(id), "ULTIMATE").result, "neutral");
  }
  const game = makeGame();
  setIntent(game, "darkSlash");
  game.enemy.broken = true;
  const runner = new W.SkillRunner(game.combat, game.player, game.enemy, W.SKILLS.find(skill => skill.id === "basic"));
  assert.equal(runner.opening.result, "neutral");
  assert.equal(runner.opening.damageMultiplier, 1);
  assert.equal(runner.opening.poiseMultiplier, 1);
});

test("resisted damage and poise multipliers apply exactly once and preserve critical order", () => {
  const game = makeGame();
  setIntent(game, "darkSlash");
  game.enemy.hp = 5000;
  game.enemy.poise = 100;
  const restore = fixedDamage(game);
  const skill = { id: "probe", attackType: "SLASH", damage: [1000, 1000], poiseDamage: 20, duration: 1 };
  const runner = new W.SkillRunner(game.combat, game.player, game.enemy, skill);
  runner.fxHit();
  restore();
  assert.equal(runner.opening.result, "resisted");
  assert.equal(game.enemy.hp, 4400);
  assert.equal(game.enemy.poise, 90);
  assert.equal(game.calls.damage[0].mitigated, true);
  assert.equal(game.calls.damage[0].mitigatedLabel, true);

  const critical = makeGame();
  setIntent(critical, "darkSlash");
  critical.enemy.hp = 5000;
  critical.enemy.poise = 100;
  const restoreCritical = fixedDamage(critical);
  critical.player.crit = 1;
  const criticalRunner = new W.SkillRunner(critical.combat, critical.player, critical.enemy, skill);
  criticalRunner.fxHit();
  restoreCritical();
  assert.equal(critical.enemy.hp, 4010, "1000 × 0.60 × 1.65 critical order");
});

test("block and deflect collide at the live sword-tip midpoint exactly once", () => {
  for (const [intent, type, reaction, maxStop] of [
    ["darkSlash", "SLASH", "block", .11],
    ["ghostThrust", "THRUST", "deflect", .08]
  ]) {
    const game = makeGame();
    setIntent(game, intent);
    const snapshot = W.evaluateOpening(game.combat.opening, type);
    assert.equal(game.combat.enemyDefense.start(game.enemy, game.player, snapshot), true);
    const a = game.player.getSwordTip(), b = game.enemy.getSwordTip(), spark = game.calls.sparks[0];
    assert.ok(Math.abs(spark.x - (a.x + b.x) / 2) < .001, `${reaction} x`);
    assert.ok(Math.abs(spark.y - (a.y + b.y) / 2) < .001, `${reaction} y`);
    assert.equal(game.calls.clashes, 1);
    assert.equal(game.calls.labels[0].reactionType, reaction);
    assert.ok(game.combat.hitStop <= maxStop);
    assert.equal(game.combat.enemyDefense.start(game.enemy, game.player, snapshot), false);
    assert.equal(game.calls.clashes, 1);
    assert.equal(game.calls.labels.length, 1);
  }
});

test("sidestep uses deterministic movement without metal collision and restores by 0.35 seconds", () => {
  for (const type of ["SLASH", "THRUST"]) {
    const game = makeGame();
    setIntent(game, "darkChain");
    const snapshot = W.evaluateOpening(game.combat.opening, type), startX = game.enemy.x;
    game.combat.enemyDefense.start(game.enemy, game.player, snapshot);
    const expected = type === "SLASH" ? 72 : 60;
    assert.equal(game.enemy.x, startX + expected);
    assert.equal(game.calls.sparks.length, 0);
    assert.equal(game.calls.clashes, 0);
    assert.equal(game.calls.dashes, 1);
    assert.equal(game.calls.afterimages, 1);
    assert.equal(game.calls.dust, 1);
    for (let t = 0; t < .36; t += .02) game.combat.enemyDefense.update(.02);
    assert.equal(game.enemy.x, game.enemy.baseX);
    assert.equal(game.enemy.poseOverride, null);
    assert.equal(game.combat.enemyDefense.active, null);
  }
});

test("a resisted skill snapshots its reaction and never repeats feedback across hits", () => {
  const game = makeGame();
  setIntent(game, "darkSlash");
  game.enemy.hp = 10000;
  game.enemy.poise = 100;
  const restore = fixedDamage(game);
  const skill = { id: "probe", attackType: "SLASH", damage: [100, 100], poiseDamage: 2, duration: 1 };
  const runner = new W.SkillRunner(game.combat, game.player, game.enemy, skill);
  setIntent(game, "ghostThrust");
  runner.fxHit();
  runner.fxHit();
  runner.fxHit();
  restore();
  assert.equal(runner.opening.openingId, "crossGuard");
  assert.equal(runner.opening.result, "resisted");
  assert.equal(game.calls.labels.length, 1);
  assert.equal(game.calls.clashes, 1);
  assert.equal(game.calls.damage.filter(item => item.mitigatedLabel).length, 1);
});

test("poise break, death, reset, and enemy timeline clear defense residue", () => {
  const broken = makeGame();
  setIntent(broken, "darkSlash");
  broken.enemy.hp = 5000;
  broken.enemy.poise = 5;
  const restoreBreak = fixedDamage(broken);
  const skill = { id: "probe", attackType: "SLASH", damage: [100, 100], poiseDamage: 10, duration: 1 };
  const breakRunner = new W.SkillRunner(broken.combat, broken.player, broken.enemy, skill);
  breakRunner.fxHit();
  restoreBreak();
  assert.equal(broken.enemy.broken, true);
  assert.equal(broken.combat.enemyDefense.active, null);
  assert.equal(broken.calls.labels.length, 0);
  assert.equal(breakRunner.opening.reactionShown, true);

  const defeated = makeGame();
  setIntent(defeated, "darkSlash");
  defeated.enemy.hp = 50;
  defeated.enemy.poise = 100;
  const restoreDeath = fixedDamage(defeated);
  const deathRunner = new W.SkillRunner(defeated.combat, defeated.player, defeated.enemy, skill);
  deathRunner.fxHit();
  restoreDeath();
  assert.equal(defeated.enemy.hp, 0);
  assert.equal(defeated.combat.enemyDefense.active, null);
  assert.equal(defeated.enemy.poseOverride, null);

  const reset = makeGame();
  setIntent(reset, "darkChain");
  const snapshot = W.evaluateOpening(reset.combat.opening, "SLASH");
  reset.combat.enemyDefense.start(reset.enemy, reset.player, snapshot);
  assert.notEqual(reset.enemy.x, reset.enemy.baseX);
  reset.combat.reset();
  assert.equal(reset.enemy.x, reset.enemy.baseX);
  assert.equal(reset.enemy.poseOverride, null);
  assert.equal(reset.combat.enemyDefense.active, null);
});
