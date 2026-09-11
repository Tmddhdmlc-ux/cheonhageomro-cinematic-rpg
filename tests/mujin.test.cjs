const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root=path.resolve(__dirname,"..");
const context=vm.createContext({console,setTimeout(){},clearTimeout(){},document:{getElementById(){return{parentElement:{classList:{add(){},remove(){}}}};}}});context.window=context;
for(const file of ["js/data.js","js/character.js","js/enemy-defense.js","js/boss-phase.js","js/mujin.js","js/skills.js","js/defense.js","js/combat.js"]){vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});}
const W=context.Wuxia,noop=()=>{};

function makeGame(){
  const calls={sparks:[],poise:[],clashes:0,damage:[],titles:[],messages:[]};
  const game={mode:"duel",enemyConfig:W.ENEMIES.mujin,calls,camera:{update:noop,reset:noop,release:noop,focusBetween:noop,punch:noop,shake:noop,pan:noop,follow:noop,slowPush:noop},effects:{clear:noop,update:noop,trackSword:noop,slash:noop,shockwave:noop,dust:noop,afterimage:noop,add:noop,reactionLabel:noop,spark(x,y,color){calls.sparks.push({x,y,color});},poise(x,y,value,kind){calls.poise.push({value,kind});},damage(...args){calls.damage.push(args);}},audio:{unlock:noop,tone:noop,slash:noop,hit:noop,breakPoise:noop,dash:noop,charge:noop,clash(){calls.clashes++;}},shell:{classList:{add:noop,remove:noop,toggle:noop}},updateUI:noop,setMessage(message){calls.messages.push(message);},showSkillTitle(skill){calls.titles.push(skill.id);},callout:noop,cinematic:noop,flash:noop};
  game.player=new W.Character(W.PLAYER_DATA,335,476);game.enemy=new W.Character(W.MUJIN_DATA,945,476);game.combat=new W.Combat(game);game.combat.ai=false;game.combat.reset();return game;
}
const skill=id=>W.MUJIN_SKILLS.find(item=>item.id===id);

test("Mujin stats, weapon, and all four actions match the specification",()=>{
  const m=W.MUJIN_DATA;assert.deepEqual([m.maxHp,m.attack,m.defense,m.crit,m.speed,m.maxPoise,m.poiseRecovery],[13200,102,86,.08,86,130,8]);assert.equal(m.weaponStyle,"heavySaber");assert.equal(m.bodyScale,1.1);assert.equal(m.idleStance,"cheolsanse");
  const expected={ironSweep:["SLASH",1.45,720,900,28],fallingPeak:["HEAVY",1.75,1120,1380,46],ironAdvance:["IMPACT",1.28,650,820,52],ironBreath:["RECOVER",1.05,0,0,0]};
  for(const [id,row] of Object.entries(expected)){const s=skill(id);assert.deepEqual([s.attackType,s.duration,...s.damage,s.poiseDamage],row,id);}
});

test("three-step AI, pressure cycle, recovery insertion, and F8 are deterministic",()=>{
  const game=makeGame(),ai=game.combat.mujin;assert.deepEqual(Array.from(ai.order),["ironSweep","fallingPeak","ironAdvance"]);assert.equal(game.combat.intent.id,"ironSweep");assert.equal(ai.label,"철산도 1/3");
  ai.advanceAfter(skill("ironSweep"));assert.equal(game.combat.intent.id,"fallingPeak");ai.advanceAfter(skill("fallingPeak"));assert.equal(game.combat.intent.id,"ironAdvance");
  game.player.poise=39;ai.advanceAfter(skill("ironAdvance"));assert.deepEqual(Array.from(ai.order),["ironAdvance","ironSweep","fallingPeak"]);assert.equal(game.combat.intent.id,"ironAdvance");
  ai.forceNext();assert.equal(game.combat.intent.id,"ironSweep");assert.equal(ai.label,"철산도 2/3");
  game.enemy.poise=34;ai.prepareNext();assert.equal(game.combat.intent.id,"ironBreath");assert.equal(ai.label,"기세 회복");const heldStep=ai.step;ai.advanceAfter(skill("ironBreath"));assert.equal(ai.step,heldStep);assert.equal(game.combat.intent.id,"ironSweep");ai.prepareNext();assert.notEqual(game.combat.intent.id,"ironBreath","recovery cannot repeat immediately");
});

test("response thresholds and costs resolve at exact starting poise boundaries",()=>{
  for(const [id,boundary,cost] of [["ironSweep",65,25],["ironAdvance",45,15]]){
    const success=makeGame();success.player.guard="counter";success.player.poise=boundary;const good=new W.EnemySkillRunner(success.combat,success.enemy,success.player,skill(id));assert.equal(good.outcome,"parry");good.parry();assert.equal(success.player.poise,boundary-cost);assert.equal(success.calls.poise[0].value,cost);
    const failure=makeGame();failure.player.guard="counter";failure.player.poise=boundary-1;const bad=new W.EnemySkillRunner(failure.combat,failure.enemy,failure.player,skill(id));assert.equal(bad.outcome,"guardFail");assert.match(bad.failureReason,/기세가 부족/);
  }
  const peakEvade=makeGame();peakEvade.player.guard="evade";assert.equal(new W.EnemySkillRunner(peakEvade.combat,peakEvade.enemy,peakEvade.player,skill("fallingPeak")).outcome,"evade");const peakCounter=makeGame();peakCounter.player.guard="counter";assert.equal(new W.EnemySkillRunner(peakCounter.combat,peakCounter.enemy,peakCounter.player,skill("fallingPeak")).outcome,"guardFail");
});

test("Mujin openings preserve v0.6 exploit, resist, and neutral multipliers",()=>{
  const matrix={ironSweep:{THRUST:"exploit",SLASH:"resisted",MULTI:"neutral"},fallingPeak:{SLASH:"exploit",THRUST:"resisted",MULTI:"neutral"},ironAdvance:{MULTI:"exploit",SLASH:"resisted",THRUST:"resisted"},ironBreath:{SLASH:"exploit",THRUST:"exploit",MULTI:"exploit"}};
  for(const [id,cases] of Object.entries(matrix))for(const [type,result] of Object.entries(cases)){const verdict=W.evaluateOpening(W.openingForIntent(id,W.MUJIN_OPENINGS),type);assert.equal(verdict.result,result,`${id}/${type}`);assert.equal(verdict.damageMultiplier,result==="exploit"?1.1:result==="resisted"?.6:1);assert.equal(verdict.poiseMultiplier,result==="exploit"?1.5:result==="resisted"?.5:1);assert.notEqual(verdict.reactionType,"sidestep");}
});

test("heavy saber tip stays hand-coupled and heavy parry sparks at the live midpoint",()=>{
  const game=makeGame(),enemy=game.enemy;enemy.setPose({...W.basePose(),sword:-.4,swordPull:.25});const hand=enemy.getHandPosition(),tip=enemy.getSwordTip();assert.ok(Math.abs(Math.hypot(tip.x-hand.x,tip.y-hand.y)-(90+4))<.001);
  game.player.guard="counter";game.player.poise=65;const runner=new W.EnemySkillRunner(game.combat,enemy,game.player,skill("ironSweep"));runner.parry();const a=enemy.getSwordTip(),b=game.player.getSwordTip(),spark=game.calls.sparks[0];assert.ok(Math.abs(spark.x-(a.x+b.x)/2)<.001);assert.ok(Math.abs(spark.y-(a.y+b.y)/2)<.001);assert.equal(game.calls.clashes,1);assert.ok(game.combat.hitStop>=.14);
});

test("all Mujin timelines finish with positions, poses, and camera state restored",()=>{
  for(const id of ["ironSweep","fallingPeak","ironAdvance","ironBreath"]){const game=makeGame(),combat=game.combat,enemy=game.enemy,player=game.player;player.guard=id==="fallingPeak"?"evade":null;const runner=new W.EnemySkillRunner(combat,enemy,player,skill(id));combat.runner=runner;let finished=false;combat.skillFinished=()=>{finished=true;combat.runner=null;};for(let elapsed=0;elapsed<2.2&&!finished;elapsed+=.02)runner.update(.02);assert.equal(finished,true,id);assert.equal(enemy.x,enemy.baseX,id);assert.equal(enemy.y,enemy.baseY,id);assert.equal(enemy.side,-1,id);assert.equal(enemy.poseOverride,null,id);assert.equal(player.x,player.baseX,id);assert.equal(player.y,player.baseY,id);assert.equal(player.poseOverride,null,id);}
});

test("ironBreath restores exactly 28 poise and does not damage the player",()=>{
  const game=makeGame();game.enemy.poise=20;const runner=new W.EnemySkillRunner(game.combat,game.enemy,game.player,skill("ironBreath")),hp=game.player.hp;for(let t=0;t<1.1;t+=.02)runner.update(.02);assert.equal(game.enemy.poise,48);assert.equal(game.player.hp,hp);assert.equal(game.calls.damage.length,0);
});
