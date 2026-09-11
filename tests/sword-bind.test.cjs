const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const bar={parentElement:{classList:{add(){},remove(){}}}};
const context=vm.createContext({console,setTimeout(){},clearTimeout(){},document:{getElementById(){return bar;}}});context.window=context;
for(const file of ["js/data.js","js/character.js","js/enemy-defense.js","js/boss-phase.js","js/mujin.js","js/skills.js","js/defense.js","js/combat.js"])vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});
const W=context.Wuxia,noop=()=>{};

function makeGame(enemyId="yama"){
  const config=W.ENEMIES[enemyId],calls={poise:[],damage:[],sparks:[],labels:[],slashes:[],callouts:[],messages:[],clashes:0,finished:0};
  const game={mode:"duel",enemyConfig:config,calls,camera:{update:noop,reset:noop,release:noop,focusBetween:noop,punch:noop,shake:noop,pan:noop,follow:noop,slowPush:noop},effects:{update:noop,clear:noop,trackSword:noop,shockwave:noop,afterimage:noop,add:noop,dust:noop,poise(x,y,n){calls.poise.push(n);},damage(x,y,n,crit){calls.damage.push({n,crit});},spark(x,y,color){calls.sparks.push({x,y,color});},reactionLabel(x,y,hanja,label,type){calls.labels.push({hanja,label,type});},slash(x,y,angle,color,length){calls.slashes.push({angle,length});}},audio:{unlock:noop,tone:noop,slash:noop,hit:noop,breakPoise:noop,dash:noop,charge:noop,clash(){calls.clashes++;}},shell:{classList:{add:noop,remove:noop,toggle:noop}},updateUI:noop,beginBindDisplay:noop,showBindResult:noop,setMessage(message){calls.messages.push(message);},showSkillTitle:noop,callout(hanja,label,kind){calls.callouts.push({hanja,label,kind});},finishDuel:noop,cinematic:noop,flash:noop};
  game.player=new W.Character(W.PLAYER_DATA,335,476);game.enemy=new W.Character(config.character,945,476);game.combat=new W.Combat(game);game.combat.ai=false;game.combat.turn="player";return game;
}
function skill(game,id){return game.enemyConfig.skills.find(item=>item.id===id);}
function fixedNumbers(game,crit=.99){const old=W.util.rand;W.util.rand=a=>a;game.player.attack=100;game.player.crit=0;game.enemy.defense=0;game.combat.random=()=>crit;return()=>{W.util.rand=old;};}
function enterBind(game,intentId=game.enemyConfig.id==="mujin"?"ironAdvance":"darkSlash"){
  game.combat.setEnemyIntent(skill(game,intentId));const restore=fixedNumbers(game);assert.equal(game.combat.useSkill("basic"),true);const runner=game.combat.runner;runner.update(.35);restore();return runner;
}
function resolveBind(game,choice){const runner=game.combat.runner;assert.equal(game.combat.chooseSwordBind(choice),true);runner.update(.11);runner.update(.5);return runner;}

test("bind config and both block openings expose the exact shared numbers",()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(W.SWORD_BIND.enemyChoices)),["guard","lure"]);assert.deepEqual(JSON.parse(JSON.stringify(W.SWORD_BIND.eligibleOpenings)),["crossGuard","ironWallClose"]);assert.equal(W.SWORD_BIND.revealDelay,.1);assert.equal(W.SWORD_BIND.resolveDuration,.4);assert.equal(W.SWORD_BIND.pressPoiseDamage,26);assert.equal(W.SWORD_BIND.lossPoiseDamage,18);assert.equal(W.SWORD_BIND.shiftDamageScale,.55);assert.equal(W.SWORD_BIND.shiftPoiseScale,.5);assert.equal(W.SWORD_BIND.shiftCritBonus,.15);
  assert.equal(W.ENEMY_OPENINGS.darkSlash.id,"crossGuard");assert.equal(W.ENEMY_OPENINGS.darkSlash.reactionType,"block");assert.equal(W.MUJIN_OPENINGS.ironAdvance.id,"ironWallClose");assert.equal(W.MUJIN_OPENINGS.ironAdvance.reactionType,"block");
});

test("an unchained resisted basic applies its first hit before opening one live-tip bind",()=>{
  for(const enemyId of ["yama","mujin"]){const game=makeGame(enemyId);game.enemy.hp=12000;game.enemy.poise=100;const runner=enterBind(game);assert.equal(game.enemy.hp,11544);assert.equal(game.enemy.poise,93);assert.equal(game.combat.awaitingBind,true);assert.equal(runner.bindStarted,true);assert.equal(runner.opening.reactionShown,true);assert.equal(game.calls.clashes,1);assert.equal(game.calls.labels[0].hanja,"合劍");const a=game.player.getSwordTip(),b=game.enemy.getSwordTip();assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<30,enemyId);runner.update(20);assert.equal(game.combat.awaitingBind,true);assert.equal(runner.bindTime,0);assert.equal(game.calls.clashes,1);}
});

test("neutral, deflect, sidestep, reserved chain, terminal, and transition states never bind",()=>{
  const cases=[
    ["yama","darkSlash",()=>{},"meteor"],
    ["yama","ghostThrust",()=>{},"basic"],
    ["yama","darkChain",()=>{},"basic"],
    ["yama","darkSlash",g=>{g.combat.initiative=1;},"basic"],
    ["yama","darkSlash",g=>{g.enemy.hp=100;},"basic"],
    ["yama","darkSlash",g=>{g.enemy.poise=5;},"basic"],
    ["yama","darkSlash",g=>{g.enemy.hp=g.enemy.maxHp/2;},"basic"],
    ["mujin","ironSweep",()=>{},"basic"]
  ];
  for(const [enemyId,intentId,prepare,skillId] of cases){const game=makeGame(enemyId);game.combat.setEnemyIntent(skill(game,intentId));prepare(game);const restore=fixedNumbers(game);game.combat.useSkill(skillId);game.combat.runner.update(.9);restore();assert.equal(game.combat.awaitingBind,false,`${intentId}/${skillId}`);}
});

test("enemy response commits before input, punishes repeats, and alternates mixed history per enemy",()=>{
  for(const enemyId of ["yama","mujin"]){const c=makeGame(enemyId).combat;assert.equal(c.commitBindEnemyChoice(),"guard");assert.equal(c.commitBindEnemyChoice(),"lure");c.bindHistory=["press","press"];assert.equal(c.commitBindEnemyChoice(),"lure");c.bindHistory=["shift","shift"];assert.equal(c.commitBindEnemyChoice(),"guard");c.bindHistory=["press","shift"];assert.equal(c.commitBindEnemyChoice(),"guard");}
});

test("only the first E/W/Space choice is atomic and other combat commands stay locked",()=>{
  const game=makeGame(),runner=enterBind(game),committed=game.combat.bindEnemyChoice;game.combat.bindHistory=["shift","shift"];assert.equal(game.combat.useSkill("basic"),false);assert.equal(game.combat.useTactic("breathe"),false);assert.equal(game.combat.chooseResponse("counter"),false);assert.equal(game.combat.chooseSwordBind("press"),true);assert.equal(game.combat.chooseSwordBind("shift"),false);assert.equal(runner.bindChoice,"press");assert.equal(game.combat.bindEnemyChoice,committed);assert.equal(game.combat.bindHistory.join(","),"shift,press");assert.equal(game.combat.bindResolved,false);runner.update(.11);assert.equal(game.combat.bindResolved,true);
});

test("press wins against guard for 26 poise and loses against lure for 18 player poise",()=>{
  const win=makeGame();win.enemy.hp=12000;win.enemy.poise=100;enterBind(win);const hp=win.enemy.hp;resolveBind(win,"press");assert.equal(win.enemy.hp,hp);assert.equal(win.enemy.poise,67);assert.equal(win.player.poise,100);assert.deepEqual(win.calls.callouts.at(-1),{hanja:"壓",label:"중심을 눌렀다",kind:"bind"});assert.equal(win.combat.initiative,0);
  const lose=makeGame();lose.combat.bindAlternate.yama=1;const loseRunner=enterBind(lose),enemyPoise=lose.enemy.poise;assert.equal(lose.combat.chooseSwordBind("press"),true);loseRunner.update(.11);assert.equal(lose.enemy.poise,enemyPoise);assert.equal(lose.player.poise,82);assert.deepEqual(lose.calls.callouts.at(-1),{hanja:"制",label:"수가 읽혔다",kind:"bind"});loseRunner.update(.5);
});

test("shift re-evaluates THRUST with exact scales and +15%p crit without touching pity or initiative",()=>{
  const yama=makeGame();yama.combat.bindAlternate.yama=1;yama.enemy.hp=12000;yama.enemy.poise=100;const old=W.util.rand;W.util.rand=a=>a;yama.player.attack=100;yama.player.crit=.2;yama.enemy.defense=0;yama.combat.random=()=>.34;yama.combat.setEnemyIntent(skill(yama,"darkSlash"));yama.combat.useSkill("basic");yama.combat.runner.update(.35);const pity=yama.combat.basicChainPity;resolveBind(yama,"shift");W.util.rand=old;assert.equal(yama.enemy.hp,10785,"456 first hit + 759 critical shifted thrust");assert.equal(yama.enemy.poise,82,"7 first hit + 11 shifted thrust");assert.equal(yama.combat.basicChainPity,pity);assert.equal(yama.combat.initiative,0);assert.deepEqual(yama.calls.callouts.at(-1),{hanja:"變",label:"칼길을 바꿨다",kind:"bind"});
  const mujin=makeGame("mujin");mujin.combat.bindAlternate.mujin=1;mujin.enemy.hp=12000;mujin.enemy.poise=100;const restore=fixedNumbers(mujin);mujin.combat.setEnemyIntent(skill(mujin,"ironAdvance"));mujin.combat.useSkill("basic");mujin.combat.runner.update(.35);resolveBind(mujin,"shift");restore();assert.equal(mujin.enemy.hp,11293,"456 first hit + 251 resisted shifted thrust");assert.equal(mujin.enemy.poise,89,"7 first hit + 4 shifted thrust");
  const broken=makeGame();broken.combat.bindAlternate.yama=1;broken.enemy.poise=18;enterBind(broken);resolveBind(broken,"shift");assert.equal(broken.enemy.broken,true);assert.equal(broken.calls.callouts.at(-1).hanja,"破勢");
});

test("recall is safe and unrecorded while bind wins and losses preserve normal break turn rules",()=>{
  const safe=makeGame();enterBind(safe);const before=[safe.enemy.hp,safe.enemy.poise,safe.player.poise];resolveBind(safe,"recall");assert.deepEqual([safe.enemy.hp,safe.enemy.poise,safe.player.poise],before);assert.equal(safe.combat.bindHistory.length,0);assert.deepEqual(safe.calls.callouts.at(-1),{hanja:"回",label:"검을 거두었다",kind:"bind"});
  const enemyBreak=makeGame();enemyBreak.enemy.poise=33;enterBind(enemyBreak);resolveBind(enemyBreak,"press");assert.equal(enemyBreak.enemy.broken,true);assert.equal(enemyBreak.enemy.breakPending,false);assert.equal(enemyBreak.combat.turn,"player");assert.equal(enemyBreak.calls.callouts.at(-1).hanja,"破勢");
  const playerBreak=makeGame();playerBreak.combat.bindAlternate.yama=1;playerBreak.combat.ai=true;playerBreak.player.poise=18;enterBind(playerBreak);resolveBind(playerBreak,"press");assert.equal(playerBreak.player.broken,true);assert.equal(playerBreak.combat.turn,"enemy");
});

test("large deltas cannot skip bind entry or double-resolve, and reset clears all bind residue",()=>{
  const game=makeGame();game.combat.setEnemyIntent(skill(game,"darkSlash"));const restore=fixedNumbers(game);game.combat.useSkill("basic");const runner=game.combat.runner;runner.update(3);restore();assert.equal(game.combat.awaitingBind,true);assert.equal(runner.done,false);game.combat.chooseSwordBind("press");runner.update(3);assert.equal(game.calls.callouts.filter(item=>item.hanja==="壓").length,1);assert.equal(game.combat.runner,null);assert.equal(game.player.x,game.player.baseX);assert.equal(game.enemy.x,game.enemy.baseX);assert.equal(game.player.poseOverride,null);assert.equal(game.enemy.poseOverride,null);
  const waiting=makeGame();enterBind(waiting);assert.notEqual(waiting.player.x,waiting.player.baseX);waiting.combat.reset();assert.equal(waiting.player.x,waiting.player.baseX);assert.equal(waiting.enemy.x,waiting.enemy.baseX);assert.equal(waiting.player.poseOverride,null);assert.equal(waiting.enemy.poseOverride,null);assert.equal(waiting.combat.awaitingBind,false);assert.equal(waiting.combat.bindEnemyChoice,null);assert.equal(waiting.combat.bindPlayerChoice,null);assert.equal(waiting.combat.bindOutcome,null);assert.equal(waiting.combat.bindHistory.length,0);assert.equal(waiting.combat.bindAlternate.yama,0);assert.equal(waiting.combat.bindOpeningId,null);assert.equal(waiting.combat.bindResolved,false);assert.equal(waiting.combat.enemyDefense.active,null);
});

test("whole-body bind poses and UI/debug contracts expose distinct feet, hips, shoulders, and weapon lines",()=>{
  const poses=W.SWORD_BIND_POSES;for(const [a,b] of [[poses.playerPress,poses.playerShift],[poses.enemyGuard,poses.enemyLure],[poses.heavyGuard,poses.heavyLure]]){for(const key of ["frontFoot","hipX","torso","sword"])assert.notEqual(a[key],b[key],key);}
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8"),main=fs.readFileSync(path.join(root,"js/main.js"),"utf8");for(const text of ["合劍 · 다음 수를 고르십시오","data-bind-choice=\"press\"","data-bind-choice=\"shift\"","data-bind-choice=\"recall\"","고수를 누름 · 유인에 패배","유인을 벰 · 고수에 패배","안전 종료 · 추가 이득 없음"])assert.match(html,new RegExp(text));for(const field of ["awaitingBind","bindEnemyChoice","bindPlayerChoice","bindOutcome","bindHistory","bindAlternate","bindOpeningId","bindResolved"])assert.match(main,new RegExp(field+":"));
});
