const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const context=vm.createContext({console,setTimeout(){},clearTimeout(){},document:{getElementById(){return{parentElement:{classList:{add(){},remove(){}}}};}}});context.window=context;
for(const file of ["js/data.js","js/character.js","js/enemy-defense.js","js/boss-phase.js","js/mujin.js","js/skills.js","js/defense.js","js/combat.js"])vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});
const W=context.Wuxia,noop=()=>{};

function makeGame(config=W.ENEMIES.yama){
  const calls={cameraUpdates:0,effectUpdates:0,messages:[]};
  const game={mode:"duel",enemyConfig:config,calls,
    camera:{update(){calls.cameraUpdates++;},reset:noop,release:noop,focusBetween:noop,punch:noop,shake:noop,pan:noop,follow:noop},
    effects:{update(){calls.effectUpdates++;},clear:noop,trackSword:noop,spark:noop,poise:noop,damage:noop,shockwave:noop,slash:noop,dust:noop,afterimage:noop,add:noop},
    audio:{unlock:noop,tone:noop,slash:noop,hit:noop,breakPoise:noop,clash:noop,dash:noop,charge:noop,thunder:noop},shell:{classList:{add:noop,remove:noop,toggle:noop}},updateUI:noop,setMessage(message){calls.messages.push(message);},showSkillTitle:noop,callout:noop,cinematic:noop,flash:noop};
  game.player=new W.Character(W.PLAYER_DATA,335,476);game.enemy=new W.Character(config.character,945,476);game.combat=new W.Combat(game);return game;
}
function start(game,id){const skill=game.combat.enemySkills.find(item=>item.id===id);const runner=new W.EnemySkillRunner(game.combat,game.enemy,game.player,skill);game.combat.runner=runner;return runner;}

test("all six attack cues stop exactly once even when a frame skips past them",()=>{
  for(const [config,id,cue] of [
    [W.ENEMIES.yama,"darkSlash",.33],[W.ENEMIES.yama,"darkChain",.44],[W.ENEMIES.yama,"ghostThrust",.46],
    [W.ENEMIES.mujin,"ironSweep",.52],[W.ENEMIES.mujin,"fallingPeak",.64],[W.ENEMIES.mujin,"ironAdvance",.40]
  ]){
    const game=makeGame(config),runner=start(game,id);runner.update(cue+.45);assert.equal(runner.awaitingResponse,true,id);assert.equal(runner.t,cue,id);assert.equal(game.combat.awaitingResponse,true,id);runner.update(2);assert.equal(runner.t,cue,id);assert.equal(game.combat.chooseResponse(null),true,id);assert.equal(game.combat.chooseResponse("counter"),false,id);runner.update(.2);assert.ok(runner.t>cue,id);assert.equal(runner.cueHandled,true,id);
  }
});

test("ultimate and recovery actions never open a response window",()=>{
  for(const [config,id] of [[W.ENEMIES.yama,"darkFall"],[W.ENEMIES.yama,"darkBreath"],[W.ENEMIES.mujin,"ironBreath"]]){
    const game=makeGame(config),runner=start(game,id);runner.update(.8);assert.equal(runner.awaitingResponse,false,id);assert.equal(game.combat.awaitingResponse,false,id);assert.equal(game.combat.chooseResponse("counter"),false,id);
  }
});

test("browser space key values normalize to the no-response command",()=>{
  assert.equal(W.normalizeCombatKey(" "),"SPACE");assert.equal(W.normalizeCombatKey("Spacebar"),"SPACE");assert.equal(W.normalizeCombatKey("w"),"W");
});

test("counter and evade cannot be queued during the player turn",()=>{
  const game=makeGame();assert.equal(game.combat.useTactic("counter"),false);assert.equal(game.combat.useTactic("evade"),false);assert.equal(game.player.guard,null);assert.equal(game.combat.playerHabits.counter,0);assert.equal(game.combat.playerHabits.evade,0);
});

test("the paused runner keeps world updates alive while enemy timeline time is frozen",()=>{
  const game=makeGame(),runner=start(game,"darkSlash");runner.update(1);const held=runner.t;game.combat.update(.5);assert.equal(runner.t,held);assert.equal(game.calls.cameraUpdates,1);assert.equal(game.calls.effectUpdates,1);
});

test("first response input snapshots poise and outcome and alone updates habits",()=>{
  const game=makeGame(),runner=start(game,"darkChain");game.player.poise=50;runner.update(1);assert.equal(game.combat.playerHabits.counter,0);assert.equal(game.combat.playerHabits.evade,0);assert.equal(game.combat.chooseResponse("counter"),true);assert.equal(runner.startPoise,50);assert.equal(runner.outcome,"parry");assert.equal(game.combat.resolvedOutcome,"parry");assert.equal(game.combat.playerHabits.counter,1);game.player.poise=0;runner.s.responses.counter.outcome="guardFail";assert.equal(runner.outcome,"parry");assert.equal(game.combat.chooseResponse("evade"),false);assert.equal(game.combat.playerHabits.evade,0);
});

test("parry and evade grant one initiative only when their outcome actually begins",()=>{
  const parryGame=makeGame(),parry=start(parryGame,"darkSlash");parry.update(1);parryGame.combat.chooseResponse("counter");assert.equal(parryGame.combat.initiative,0);parry.parry();assert.equal(parryGame.combat.initiative,1);parry.parry();assert.equal(parryGame.combat.initiative,1);
  const failedGame=makeGame(),failed=start(failedGame,"darkSlash");failed.update(1);failedGame.combat.chooseResponse("evade");assert.equal(failed.outcome,"evadeFail");failed.impact();assert.equal(failedGame.combat.initiative,0);
  const noneGame=makeGame(),none=start(noneGame,"ghostThrust");none.update(1);noneGame.combat.chooseResponse(null);assert.equal(none.outcome,"hit");none.impact();assert.equal(noneGame.combat.initiative,0);
});

test("reset and dispose clear response pause, initiative, pity, and temporary poses",()=>{
  const game=makeGame(),runner=start(game,"darkSlash");runner.update(1);game.combat.initiative=1;game.combat.basicChainPity=2;game.combat.reset();assert.equal(game.combat.awaitingResponse,false);assert.equal(game.combat.initiative,0);assert.equal(game.combat.basicChainPity,0);assert.equal(game.combat.runner,null);assert.equal(game.player.poseOverride,null);
  const runner2=start(game,"darkSlash");runner2.update(1);game.combat.initiative=1;game.combat.dispose();assert.equal(game.combat.awaitingResponse,false);assert.equal(game.combat.initiative,0);assert.equal(game.combat.turn,"inactive");assert.equal(game.player.poseOverride,null);
});
