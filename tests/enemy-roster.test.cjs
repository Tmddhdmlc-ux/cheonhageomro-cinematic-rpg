const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root=path.resolve(__dirname,"..");
const context=vm.createContext({console,setTimeout(){},clearTimeout(){},document:{getElementById(){return{parentElement:{classList:{add(){},remove(){}}}};}}});context.window=context;
for(const file of ["js/data.js","js/character.js","js/enemy-defense.js","js/boss-phase.js","js/mujin.js","js/skills.js","js/defense.js","js/combat.js"]){vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});}
const W=context.Wuxia,noop=()=>{};

function makeGame(config=W.ENEMIES.yama,mode="duel"){
  const game={mode,enemyConfig:config,camera:{update:noop,reset:noop,release:noop,focusBetween:noop,punch:noop,shake:noop,pan:noop,follow:noop,slowPush:noop},effects:{clear:noop,update:noop,trackSword:noop,spark:noop,poise:noop,damage:noop,shockwave:noop,slash:noop,dust:noop,afterimage:noop,add:noop},audio:{unlock:noop,tone:noop,slash:noop,hit:noop,breakPoise:noop,clash:noop,dash:noop,charge:noop},shell:{classList:{add:noop,remove:noop,toggle:noop}},updateUI:noop,setMessage:noop,showSkillTitle:noop,callout:noop,cinematic:noop,flash:noop};
  game.player=new W.Character(W.PLAYER_DATA,335,476);game.enemy=new W.Character(config.character,945,476);game.combat=new W.Combat(game);return game;
}

test("enemy registry exposes two distinct complete duel definitions",()=>{
  assert.deepEqual(Object.keys(W.ENEMIES),["yama","mujin"]);
  const yama=W.ENEMIES.yama,mujin=W.ENEMIES.mujin;
  assert.notEqual(yama.character,mujin.character);assert.notEqual(yama.skills,mujin.skills);assert.notEqual(yama.openings,mujin.openings);assert.notEqual(yama.arenaId,mujin.arenaId);
  assert.equal(yama.bossPhase,true);assert.equal(mujin.bossPhase,false);assert.equal(mujin.arenaId,"bluestoneGate");assert.equal(yama.ai.type,"yamaAdaptive");assert.equal(mujin.ai.type,"fixedCycle");assert.deepEqual(Array.from(mujin.ai.defaultOrder),["ironSweep","fallingPeak","ironAdvance"]);assert.equal(W.ENEMY_DATA,yama.character);assert.equal(W.ENEMY_SKILLS,yama.skills);
});

test("combat injects only the selected enemy skill and opening set",()=>{
  const yama=makeGame(W.ENEMIES.yama);yama.combat.reset();assert.equal(yama.combat.phase.enabled,true);assert.ok(yama.combat.enemySkills.some(skill=>skill.id==="darkFall"));assert.equal(yama.combat.mujin,null);
  const mujin=makeGame(W.ENEMIES.mujin);mujin.combat.reset();assert.equal(mujin.combat.phase.enabled,false);assert.equal(mujin.combat.phase.active,false);assert.deepEqual(Array.from(mujin.combat.enemySkills,skill=>skill.id),["ironSweep","fallingPeak","ironAdvance","ironBreath"]);assert.ok(!mujin.combat.enemySkills.some(skill=>skill.id==="darkFall"));assert.equal(mujin.combat.intent.id,"ironSweep");assert.equal(mujin.combat.opening.id,"middleGateSweep");
});

test("selection mode rejects combat and debug intent inputs",()=>{
  const game=makeGame(W.ENEMIES.yama,"selecting");game.combat.reset();const intent=game.combat.intent;
  assert.equal(game.combat.useSkill("basic"),false);assert.equal(game.combat.useTactic("counter"),false);assert.equal(game.combat.forceIntent(),false);assert.equal(game.combat.intent,intent);assert.equal(game.player.mp,game.player.maxMp);assert.equal(game.player.guard,null);
});

test("disposing before an opponent swap clears old references and transient state",()=>{
  const game=makeGame(W.ENEMIES.yama);game.combat.reset();const old=game.combat,snapshot=W.evaluateOpening(old.opening,"SLASH");old.enemyDefense.start(game.enemy,game.player,snapshot);old.defer(2,noop);old.dispose();
  assert.equal(old.enemyDefense.active,null);assert.equal(old.deferred.length,0);assert.equal(old.runner,null);assert.equal(old.turn,"inactive");
  const oldEnemy=game.enemy;game.enemyConfig=W.ENEMIES.mujin;game.player=new W.Character(W.PLAYER_DATA,335,476);game.enemy=new W.Character(W.MUJIN_DATA,945,476);game.combat=new W.Combat(game);game.combat.reset();
  assert.notEqual(game.enemy,oldEnemy);assert.equal(game.combat.enemy,game.enemy);assert.equal(game.combat.enemyConfig.id,"mujin");assert.equal(game.combat.phase.enabled,false);assert.equal(game.combat.deferred.length,0);assert.equal(game.camera.tx,undefined);
});
