const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
context.window = context;
for (const file of ["js/data.js", "js/character.js", "js/enemy-defense.js", "js/boss-phase.js", "js/skills.js", "js/defense.js", "js/combat.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const W = context.Wuxia;

function makeCombat() {
  const calls = { hits: 0, callouts: [], poise: [], sparks: [], finished: 0, cinematic: false };
  const noop = () => {};
  return {
    calls,
    hitStop: 0,
    game: { updateUI: noop, setMessage: noop },
    camera: { focusBetween: noop, punch: noop, shake: noop, follow: noop, release: noop, pan: noop, reset: noop },
    audio: { clash: noop, dash: noop, charge: noop, thunder: noop },
    effects: {
      add: noop, afterimage: noop, dust: noop, slash: noop, shockwave: noop, petal: noop, lightning: noop,
      spark(x, y) { calls.sparks.push({ x, y }); },
      poise(x, y, value, kind) { calls.poise.push({ value, kind }); }
    },
    showSkillTitle: noop,
    cinematic(on) { calls.cinematic = on; },
    flash: noop,
    defer: noop,
    skillFinished() { calls.finished += 1; },
    callout(hanja, label) { calls.callouts.push({ hanja, label }); },
    hit() { calls.hits += 1; }
  };
}

function makeRunner(skillId, guard, poise = 100) {
  const combat = makeCombat();
  const enemy = new W.Character(W.ENEMY_DATA, 945, 476);
  const player = new W.Character(W.PLAYER_DATA, 335, 476);
  player.guard = guard;
  player.poise = poise;
  const skill = W.ENEMY_SKILLS.find(item => item.id === skillId);
  return { combat, enemy, player, runner: new W.EnemySkillRunner(combat, enemy, player, skill) };
}

test("all enemy intent hints and explicit response rules are present", () => {
  for (const skill of W.ENEMY_SKILLS) assert.ok(skill.responseHint, skill.id);
  for (const skill of W.ENEMY_SKILLS.filter(item => item.attackType !== "RECOVER")) {
    assert.ok(skill.responses.counter, `${skill.id} counter`);
    assert.ok(skill.responses.evade, `${skill.id} evade`);
  }
});

test("same skill, tactic, and visible poise always resolve identically", () => {
  const cases = [
    ["darkSlash", "counter", 100, "parry"],
    ["darkSlash", "evade", 100, "evadeFail"],
    ["ghostThrust", "counter", 100, "guardFail"],
    ["ghostThrust", "evade", 100, "evade"],
    ["darkChain", "counter", 50, "parry"],
    ["darkChain", "counter", 49, "guardFail"],
    ["darkChain", "evade", 100, "evadeFail"],
    ["darkFall", "counter", 100, "guardFail"],
    ["darkFall", "evade", 100, "evadeFail"]
  ];
  for (const [skill, guard, poise, expected] of cases) {
    const outcomes = Array.from({ length: 10 }, () => makeRunner(skill, guard, poise).runner.outcome);
    assert.deepEqual(outcomes, Array(10).fill(expected), `${skill}/${guard}/${poise}`);
  }
});

test("resolveOutcome contains no random branch", () => {
  const source = fs.readFileSync(path.join(root, "js/defense.js"), "utf8");
  for (const candidate of [source, source.replace(/\r?\n/g, "\r\n")]) {
    const method = candidate.match(/resolveOutcome\(\)\{([\s\S]*?)\r?\n\s*\}\r?\n\s*pose\(/)?.[1];
    assert.ok(method);
    assert.doesNotMatch(method, /Math\.random|U\.rand/);
  }
});

test("darkChain snapshots starting poise and gives its clash cost distinct feedback", () => {
  const { combat, player, runner } = makeRunner("darkChain", "counter", 50);
  player.poise = 1;
  runner.update(.49);
  assert.equal(runner.outcome, "parry");
  assert.equal(player.poise, 1, "the cost never forces current poise below one");
  assert.deepEqual(combat.calls.poise, [{ value: 20, kind: "cost" }]);

  const normal = makeRunner("darkChain", "counter", 70);
  normal.runner.update(.49);
  assert.equal(normal.player.poise, 50);
  assert.deepEqual(normal.combat.calls.poise, [{ value: 20, kind: "cost" }]);
});

test("failed darkChain tactics avoid damage on the first beat, then take the follow-up", () => {
  for (const [guard, poise, reason] of [
    ["counter", 49, "기세가 부족해"],
    ["evade", 100, "보법을 추적"]
  ]) {
    const { combat, runner } = makeRunner("darkChain", guard, poise);
    runner.update(.49);
    assert.equal(combat.calls.hits, 0, `${guard} first beat`);
    runner.update(.31);
    assert.equal(combat.calls.hits, 1, `${guard} follow-up`);
    assert.match(combat.calls.callouts[0].label, new RegExp(reason));
  }
});

test("successful clash feedback is emitted from the midpoint of both sword tips", () => {
  const { combat, enemy, player, runner } = makeRunner("darkSlash", "counter", 100);
  runner.update(.57);
  const a = enemy.getSwordTip();
  const b = player.getSwordTip();
  const spark = combat.calls.sparks[0];
  assert.ok(spark);
  assert.ok(Math.abs(spark.x - (a.x + b.x) / 2) < .001);
  assert.ok(Math.abs(spark.y - (a.y + b.y) / 2) < .001);
  assert.ok(runner.c.hitStop >= .08 && runner.c.hitStop <= .12);
});

test("every enemy response timeline finishes with positions, poses, camera, and turn callback restored", () => {
  const cases = [
    ["darkSlash", "counter", 100], ["darkSlash", "evade", 100],
    ["ghostThrust", "counter", 100], ["ghostThrust", "evade", 100],
    ["darkChain", "counter", 50], ["darkChain", "counter", 49], ["darkChain", "evade", 100],
    ["darkFall", "counter", 100], ["darkFall", "evade", 100]
  ];
  for (const [skill, guard, poise] of cases) {
    const { combat, enemy, player, runner } = makeRunner(skill, guard, poise);
    while (!runner.done) runner.update(.02);
    assert.equal(enemy.x, enemy.baseX, `${skill}/${guard} enemy x`);
    assert.equal(enemy.y, enemy.baseY, `${skill}/${guard} enemy y`);
    assert.equal(player.x, player.baseX, `${skill}/${guard} player x`);
    assert.equal(player.y, player.baseY, `${skill}/${guard} player y`);
    assert.equal(enemy.poseOverride, null, `${skill}/${guard} enemy pose`);
    assert.equal(player.poseOverride, null, `${skill}/${guard} player pose`);
    assert.equal(combat.calls.cinematic, false, `${skill}/${guard} cinematic`);
    assert.equal(combat.calls.finished, 1, `${skill}/${guard} finish callback`);
  }
});

test("darkBreath produces no damage or defensive success/failure callout", () => {
  const { combat, runner } = makeRunner("darkBreath", "counter", 100);
  while (!runner.done) runner.update(.02);
  assert.equal(combat.calls.hits, 0);
  assert.deepEqual(combat.calls.callouts, []);
});

test("all five existing player skill timelines still complete and restore the attacker", () => {
  for (const skill of W.SKILLS) {
    const combat = makeCombat();
    const player = new W.Character(W.PLAYER_DATA, 335, 476);
    const enemy = new W.Character(W.ENEMY_DATA, 945, 476);
    const runner = new W.SkillRunner(combat, player, enemy, skill);
    while (!runner.done) runner.update(.02);
    assert.equal(player.x, player.baseX, skill.id);
    assert.equal(player.y, player.baseY, skill.id);
    assert.equal(player.side, W.PLAYER_DATA.side, skill.id);
    assert.equal(player.poseOverride, null, skill.id);
    assert.equal(combat.calls.finished, 1, skill.id);
  }
});

test("combat reset clears active response state, deferred effects, and visible character state", () => {
  const noop = () => {};
  const game = {
    camera: { reset: noop }, effects: { clear: noop }, audio: {},
    player: new W.Character(W.PLAYER_DATA, 335, 476), enemy: new W.Character(W.ENEMY_DATA, 945, 476),
    shell: { classList: { toggle: noop } }, updateUI: noop, setMessage: noop
  };
  const combat = new W.Combat(game);
  combat.runner = { active: true }; combat.deferred = [{ time: 1, fn: noop }]; combat.hitStop = 1;
  game.player.guard = "counter"; game.player.x -= 80; game.player.setPose({ crouch: 50 }); game.player.poise = 5;
  game.enemy.x += 90; game.enemy.setPose({ crouch: 40 }); game.enemy.hp = 5;
  combat.reset();
  assert.equal(combat.runner, null);
  assert.equal(combat.deferred.length, 0);
  assert.equal(combat.hitStop, 0);
  assert.equal(game.player.guard, null);
  assert.equal(game.player.x, game.player.baseX);
  assert.equal(game.player.poseOverride, null);
  assert.equal(game.player.poise, game.player.maxPoise);
  assert.equal(game.enemy.x, game.enemy.baseX);
  assert.equal(game.enemy.poseOverride, null);
  assert.equal(game.enemy.hp, game.enemy.maxHp);
});
