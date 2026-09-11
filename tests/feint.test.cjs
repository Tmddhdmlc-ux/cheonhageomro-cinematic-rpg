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
  const calls={callouts:[],titles:[],messages:[]};
  const game={mode:"duel",enemyConfig:config,calls,camera:{update:noop,reset:noop,release:noop,focusBetween:noop,punch:noop,shake:noop,pan:noop,follow:noop,slowPush:noop},effects:{update:noop,clear:noop,trackSword:noop,spark:noop,poise:noop,damage:noop,shockwave:noop,slash:noop,dust:noop,afterimage:noop,add:noop},audio:{unlock:noop,tone:noop,slash:noop,hit:noop,breakPoise:noop,clash:noop,dash:noop,charge:noop},shell:{classList:{add:noop,remove:noop,toggle:noop}},updateUI:noop,setMessage(message){calls.messages.push(message);},showSkillTitle(skill){calls.titles.push(skill.id);},callout(hanja,label){calls.callouts.push({hanja,label});},cinematic:noop,flash:noop};
  game.player=new W.Character(W.PLAYER_DATA,335,476);game.enemy=new W.Character(config.character,945,476);game.combat=new W.Combat(game);game.combat.ai=false;return game;
}
const find=(game,id)=>game.combat.enemySkills.find(skill=>skill.id===id);
function reserve(game,id){const skill=find(game,id);game.combat.setEnemyIntent(skill);return skill;}
function start(game,id){const skill=reserve(game,id),runner=new W.EnemySkillRunner(game.combat,game.enemy,game.player,skill);game.combat.runner=runner;return runner;}

test("feint packages expose exact candidates, timings, and neutral preparation openings",()=>{
  const cases=[[W.ENEMIES.yama,"darkFeint",["darkSlash","ghostThrust"],.42,.52,"emptyGate"],[W.ENEMIES.mujin,"ironFeint",["fallingPeak","ironAdvance"],.48,.58,"hiddenSaber"]];
  for(const [config,id,branches,decision,response,openingId] of cases){const skill=config.skills.find(item=>item.id===id),opening=W.openingForIntent(id,config.openings);assert.deepEqual(Array.from(skill.feint.branches),branches);assert.equal(skill.feint.decisionCue,decision);assert.equal(skill.responseCue,response);assert.equal(opening.id,openingId);for(const type of ["SLASH","THRUST","MULTI"])assert.equal(W.evaluateOpening(opening,type).result,"neutral");}
});

test("two repeated responses select their counter-branch while mixed history alternates without random",()=>{
  for(const [config,id] of [[W.ENEMIES.yama,"darkFeint"],[W.ENEMIES.mujin,"ironFeint"]]){
    const skill=config.skills.find(item=>item.id===id);
    let game=makeGame(config);game.combat.responseHistory=["counter","counter"];reserve(game,id);assert.equal(game.combat.feintBranch,skill.feint.punishCounter);assert.equal(game.combat.branchReason,"punish-counter");
    game=makeGame(config);game.combat.responseHistory=["evade","evade"];reserve(game,id);assert.equal(game.combat.feintBranch,skill.feint.punishEvade);assert.equal(game.combat.branchReason,"punish-evade");
    game=makeGame(config);game.combat.responseHistory=["counter","evade"];reserve(game,id);const first=game.combat.feintBranch;game.combat.setEnemyIntent(config.skills.find(item=>!item.feint));reserve(game,id);assert.deepEqual([first,game.combat.feintBranch],Array.from(skill.feint.branches));assert.equal(game.combat.branchReason,"alternate");
  }
});

test("a branch commits before input, reveals before the unlimited response pause, and survives input",()=>{
  const game=makeGame(),runner=start(game,"darkFeint"),committed=game.combat.feintBranch;assert.equal(game.combat.branchCommitted,true);assert.equal(game.combat.feintRevealed,false);assert.equal(game.combat.chooseResponse("counter"),false);runner.update(.41);assert.equal(runner.branchRevealed,false);assert.equal(runner.awaitingResponse,false);runner.update(.5);assert.equal(runner.t,.52);assert.equal(runner.branchRevealed,true);assert.equal(game.combat.feintRevealed,true);assert.equal(game.combat.visibleIntent().id,committed);assert.equal(runner.awaitingResponse,true);const held=runner.t;runner.update(20);assert.equal(runner.t,held);assert.equal(game.combat.chooseResponse("counter"),true);game.combat.responseHistory=["evade","evade"];runner.update(.2);assert.equal(game.combat.feintBranch,committed);assert.equal(runner.responseSkill.id,committed);assert.equal(game.combat.chooseResponse("evade"),false);
});

test("response history keeps only counter and evade, ignores Space, and resets with feint state",()=>{
  const game=makeGame(),c=game.combat;for(const guard of ["counter",null,"evade","counter"]){const runner={s:{id:"test"},responseSkill:{id:"test"},selectedResponse:guard||"none",resolvedOutcome:"hit",guard};c.runner=runner;c.onResponseSelected(runner);}assert.deepEqual(Array.from(c.responseHistory),["evade","counter"]);reserve(game,"darkFeint");c.awaitingResponse=true;c.reset();assert.deepEqual(Array.from(c.responseHistory),[]);assert.equal(c.feintAlternate.yama,0);assert.equal(c.feintArmed,false);assert.equal(c.feintId,null);assert.equal(c.feintBranch,null);assert.equal(c.branchReason,null);assert.equal(c.branchCommitted,false);assert.equal(c.awaitingResponse,false);
});

test("only the correct feint response grants initiative and uses feint feedback",()=>{
  const success=makeGame();success.combat.responseHistory=["evade","evade"];let runner=start(success,"darkFeint");runner.update(1);assert.equal(runner.responseSkill.id,"darkSlash");success.combat.chooseResponse("counter");runner.parry();assert.equal(success.combat.initiative,1);assert.ok(success.calls.callouts.some(call=>call.label==="간파 — 변초를 꺾었다"));
  const wrong=makeGame();wrong.combat.responseHistory=["evade","evade"];runner=start(wrong,"darkFeint");runner.update(1);wrong.combat.chooseResponse("evade");runner.impact();assert.equal(wrong.combat.initiative,0);assert.ok(wrong.calls.callouts.some(call=>call.label==="읽혔다 — 변초에 걸렸다"));
  const none=makeGame();runner=start(none,"darkFeint");runner.update(1);none.combat.chooseResponse(null);runner.impact();assert.equal(none.combat.initiative,0);assert.deepEqual(Array.from(none.combat.responseHistory),[]);
});

test("iron feint preserves the existing ironAdvance poise threshold and cost",()=>{
  for(const [poise,outcome,remaining] of [[44,"guardFail",44],[45,"parry",30]]){const game=makeGame(W.ENEMIES.mujin);game.combat.responseHistory=["evade","evade"];game.player.poise=poise;const runner=start(game,"ironFeint");runner.update(1);assert.equal(runner.responseSkill.id,"ironAdvance");game.combat.chooseResponse("counter");assert.equal(runner.outcome,outcome);if(outcome==="parry")runner.parry();assert.equal(game.player.poise,remaining);assert.equal(game.combat.initiative,outcome==="parry"?1:0);}
});

test("Yama phase one excludes feints, phase two slot three uses one, and Mujin recovery preserves its feint slot",()=>{
  const yama=makeGame();for(let i=0;i<30;i++)assert.notEqual(yama.combat.selectEnemyIntent().id,"darkFeint");yama.combat.phase.phase=2;yama.combat.phase.route="counter";yama.combat.phase.step=2;yama.combat.phase.syncIntent();assert.equal(yama.combat.intent.id,"darkFeint");assert.equal(yama.combat.phase.phaseStep,3);
  const mujin=makeGame(W.ENEMIES.mujin),ai=mujin.combat.mujin;ai.advanceAfter(find(mujin,"ironSweep"));ai.advanceAfter(find(mujin,"fallingPeak"));assert.equal(mujin.combat.intent.id,"ironFeint");const held=ai.step,branch=mujin.combat.feintBranch,alternate=mujin.combat.feintAlternate.mujin;mujin.enemy.poise=34;ai.prepareNext();assert.equal(mujin.combat.intent.id,"ironBreath");ai.advanceAfter(find(mujin,"ironBreath"));assert.equal(ai.step,held);assert.equal(mujin.combat.intent.id,"ironFeint");assert.equal(mujin.combat.feintBranch,branch);assert.equal(mujin.combat.feintAlternate.mujin,alternate);
});

test("the two revealed branches use visibly different feet, torso, shoulder, and weapon poses",()=>{
  for(const [config,id,histories] of [[W.ENEMIES.yama,"darkFeint",[["evade","evade"],["counter","counter"]]],[W.ENEMIES.mujin,"ironFeint",[["counter","counter"],["evade","evade"]]]]){const poses=histories.map(history=>{const game=makeGame(config);game.combat.responseHistory=history;const runner=start(game,id);runner.update(1);return game.enemy.poseOverride;});for(const key of ["frontFoot","backFoot","torso","arm","sword"])assert.notEqual(poses[0][key],poses[1][key],`${id}/${key}`);}
});
