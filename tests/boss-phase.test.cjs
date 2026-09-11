const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const noop = () => {};
const barClassList = { add: noop, remove: noop, toggle: noop };
const context = vm.createContext({
  console,
  setTimeout: fn => fn(),
  document: { getElementById: () => ({ parentElement: { classList: barClassList } }) }
});
context.window = context;
for (const file of ["js/data.js", "js/character.js", "js/enemy-defense.js", "js/boss-phase.js", "js/combat.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const W = context.Wuxia;

function makeGame(ai = true) {
  const calls = { callouts: [], messages: [], cinematic: false };
  const shellClasses = new Set();
  const game = {
    calls,
    camera: { reset: noop, release: noop, slowPush: noop, focusBetween: noop, punch: noop, shake: noop },
    effects: { clear: noop, shockwave: noop, spark: noop, slash: noop, add: noop },
    audio: { breakPoise: noop, clash: noop },
    shell: {
      classList: {
        add: value => shellClasses.add(value),
        remove: value => shellClasses.delete(value),
        toggle: (value, on) => on ? shellClasses.add(value) : shellClasses.delete(value)
      }
    },
    updateUI: noop,
    setMessage: message => calls.messages.push(message),
    showSkillTitle: noop,
    callout: (hanja, label) => calls.callouts.push({ hanja, label }),
    flash: noop
  };
  game.player = new W.Character(W.PLAYER_DATA, 335, 476);
  game.enemy = new W.Character(W.ENEMY_DATA, 945, 476);
  game.combat = new W.Combat(game);
  game.combat.ai = ai;
  game.combat.reset();
  return game;
}

function playerResult(game, skillId = "basic") {
  return { a: game.player, b: game.enemy, s: { id: skillId } };
}

function enterPhaseTwo(game, counter = 0, evade = 0) {
  game.combat.playerHabits.counter = counter;
  game.combat.playerHabits.evade = evade;
  game.enemy.hp = game.enemy.maxHp / 2;
  assert.equal(game.combat.phase.armIfEligible(), true);
  assert.equal(game.combat.phase.beginTransition(), true);
  return game.combat.phase;
}

test("phase transition is armed only for a living enemy at or below half HP", () => {
  const game = makeGame();
  game.enemy.hp = game.enemy.maxHp * .5001;
  assert.equal(game.combat.phase.armIfEligible(), false);
  game.enemy.hp = game.enemy.maxHp * .5;
  assert.equal(game.combat.phase.armIfEligible(), true);

  const defeated = makeGame();
  defeated.enemy.hp = 0;
  assert.equal(defeated.combat.phase.armIfEligible(), false);
});

test("victory wins over phase transition when the threshold attack also defeats Yama", () => {
  const game = makeGame();
  game.enemy.hp = 0;
  game.combat.skillFinished(playerResult(game));
  assert.equal(game.combat.over, true);
  assert.equal(game.combat.turn, "over");
  assert.equal(game.combat.phase.phase, 1);
  assert.equal(game.combat.phase.transitionPending, false);
  assert.equal(game.combat.runner, null);
});

test("a threshold poise break grants the extra action before the transition", () => {
  const game = makeGame();
  game.enemy.hp = game.enemy.maxHp / 2;
  game.enemy.poise = 0;
  game.enemy.broken = true;
  game.enemy.breakPending = true;

  game.combat.skillFinished(playerResult(game));
  assert.equal(game.combat.phase.phase, 1);
  assert.equal(game.combat.phase.transitionPending, true);
  assert.equal(game.combat.turn, "player");
  assert.equal(game.combat.runner, null);

  game.combat.skillFinished(playerResult(game));
  assert.equal(game.combat.phase.phase, 2);
  assert.equal(game.combat.turn, "transition");
  assert.ok(game.combat.runner instanceof W.PhaseTransitionRunner);
  assert.equal(game.enemy.poise, game.enemy.maxPoise);

  const transition = game.combat.runner;
  assert.ok(transition.s.duration >= 1.4 && transition.s.duration <= 1.8);
  transition.update(.82);
  assert.ok(game.enemy.poseOverride.crouch >= 25, "the stance lowers the knees and hips");
  assert.ok(game.enemy.poseOverride.backFoot <= -65, "the retreat begins at the feet");
  assert.ok(game.enemy.poseOverride.torso <= -.2, "the torso coils behind the planted feet");
  assert.ok(game.enemy.poseOverride.sword <= -.4, "the sword settles diagonally in front");
  while (!transition.done) transition.update(.02);
  assert.equal(game.combat.runner, null);
  assert.equal(game.combat.turn, "enemy");
  assert.equal(game.enemy.stance, "salpungse");
  assert.equal(game.enemy.poseOverride, null);
  assert.equal(game.enemy.poise, game.enemy.maxPoise);
  assert.equal(game.combat.phase.armIfEligible(), false, "the transition cannot be armed twice");
});

test("AI OFF still updates the phase presentation without launching an enemy attack", () => {
  const game = makeGame(false);
  game.enemy.hp = game.enemy.maxHp / 2;
  game.combat.skillFinished(playerResult(game));
  assert.ok(game.combat.runner instanceof W.PhaseTransitionRunner);
  const transition = game.combat.runner;
  while (!transition.done) transition.update(.02);
  assert.equal(game.combat.phase.phase, 2);
  assert.equal(game.combat.turn, "player");
  assert.equal(game.combat.wait, 0);
  assert.equal(game.combat.intent.id, "ghostThrust");
});

test("phase routes are selected from the counter and evade habit snapshot", () => {
  const counterGame = makeGame();
  const counterPhase = enterPhaseTwo(counterGame, 2, 2);
  assert.equal(counterPhase.route, "counter");
  assert.deepEqual(
    Array.from(W.BOSS_PHASE.routes[counterPhase.route]),
    ["ghostThrust", "darkChain", "darkSlash", "darkFall"]
  );

  const evadeGame = makeGame();
  const evadePhase = enterPhaseTwo(evadeGame, 1, 2);
  assert.equal(evadePhase.route, "evade");
  assert.deepEqual(
    Array.from(W.BOSS_PHASE.routes[evadePhase.route]),
    ["darkSlash", "darkChain", "ghostThrust", "darkFall"]
  );
});

test("the four-step phase pattern is deterministic, excludes recovery, and re-reads habits per cycle", () => {
  const game = makeGame();
  const phase = enterPhaseTwo(game, 0, 0);
  const seen = [];
  for (let step = 0; step < 4; step++) {
    seen.push(game.combat.intent.id);
    const executed = game.combat.intent;
    if (step === 3) {
      game.combat.playerHabits.evade = 3;
      game.combat.playerHabits.counter = 0;
    }
    phase.advanceAfterEnemySkill(executed);
  }
  assert.deepEqual(seen, ["ghostThrust", "darkChain", "darkSlash", "darkFall"]);
  assert.equal(seen.includes("darkBreath"), false);
  assert.equal(phase.route, "evade");
  assert.equal(phase.phaseStep, 1);
  assert.equal(game.combat.intent.id, "darkSlash");
});

test("F8-style cycling advances only to the next legal phase step", () => {
  const game = makeGame();
  const phase = enterPhaseTwo(game, 4, 0);
  const route = phase.route;
  assert.equal(phase.forceNext().id, "darkChain");
  assert.equal(phase.phaseStep, 2);
  assert.equal(phase.route, route);
  assert.equal(phase.forceNext().id, "darkSlash");
  assert.equal(phase.forceNext().id, "darkFall");
  assert.equal(phase.signatureArmed, true);
  assert.equal(phase.forceNext().id, "ghostThrust");
  assert.equal(phase.phaseStep, 1);
  assert.equal(phase.route, route);
});

test("visible poise zero cancels an armed darkFall and preserves the break extra action", () => {
  const game = makeGame();
  const phase = enterPhaseTwo(game, 3, 0);
  phase.forceNext();
  phase.forceNext();
  phase.forceNext();
  assert.equal(game.combat.intent.id, "darkFall");
  assert.equal(phase.signatureArmed, true);

  game.enemy.poise = 0;
  game.combat.breakPoise(game.enemy, game.player);
  assert.equal(game.enemy.breakPending, true);
  assert.equal(phase.signatureArmed, false);
  assert.equal(phase.phaseStep, 1);
  assert.equal(game.combat.intent.id, "ghostThrust");

  game.combat.skillFinished(playerResult(game));
  assert.equal(game.combat.turn, "player", "the existing poise-break extra action remains available");
  game.combat.skillFinished(playerResult(game));
  assert.equal(game.combat.turn, "enemy");
  assert.equal(game.combat.intent.id, "ghostThrust", "the enemy resumes at the new cycle's first art");
});

test("darkFall remains armed while at least one visible poise point remains", () => {
  const game = makeGame();
  const phase = enterPhaseTwo(game);
  phase.forceNext();
  phase.forceNext();
  phase.forceNext();
  game.enemy.poise = 1;
  assert.equal(phase.handleEnemyPoiseBreak(game.enemy, game.player), false);
  assert.equal(phase.signatureArmed, true);
  assert.equal(game.combat.intent.id, "darkFall");
});

test("reset clears every phase, transition, route, and signature flag", () => {
  const game = makeGame();
  const phase = enterPhaseTwo(game, 2, 0);
  phase.forceNext();
  phase.signatureCanceled = true;
  game.combat.reset();
  assert.equal(game.combat.phase.phase, 1);
  assert.equal(game.combat.phase.phaseStep, 0);
  assert.equal(game.combat.phase.route, null);
  assert.equal(game.combat.phase.transitionPending, false);
  assert.equal(game.combat.phase.signatureArmed, false);
  assert.equal(game.combat.phase.signatureCanceled, false);
  assert.equal(game.enemy.stance, null);
  assert.equal(game.enemy.poseOverride, null);
  assert.equal(game.combat.runner, null);
});
