const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const context=vm.createContext({console,setTimeout(){},clearTimeout(){},document:{getElementById(){return{parentElement:{classList:{add(){},remove(){}}}};}}});context.window=context;
for(const file of ["js/data.js","js/character.js","js/enemy-defense.js","js/boss-phase.js","js/mujin.js","js/skills.js","js/defense.js","js/combat.js"])vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});
const W=context.Wuxia,noop=()=>{};

function makeGame(){
  const calls={hits:[],slashes:[],messages:[],finished:0};
  const game={mode:"duel",enemyConfig:W.ENEMIES.yama,calls,camera:{update:noop,reset:noop,release:noop,focusBetween:noop,punch:noop,shake:noop,pan:noop,follow:noop},effects:{update:noop,clear:noop,trackSword:noop,spark:noop,poise:noop,damage:noop,shockwave:noop,dust:noop,afterimage:noop,add:noop,slash(x,y,angle,color,length){calls.slashes.push({angle,length});}},audio:{unlock:noop,tone:noop,slash:noop,hit:noop,breakPoise:noop,clash:noop,dash:noop,charge:noop},shell:{classList:{add:noop,remove:noop,toggle:noop}},updateUI:noop,setMessage(message){calls.messages.push(message);},showSkillTitle:noop,callout:noop,cinematic:noop,flash:noop};
  game.player=new W.Character(W.PLAYER_DATA,335,476);game.enemy=new W.Character(W.ENEMY_DATA,945,476);game.combat=new W.Combat(game);game.combat.opening=W.ENEMY_OPENINGS.darkSlash;return game;
}
const snapshot=result=>({result,damageMultiplier:1,poiseMultiplier:1,reactionType:null,matched:false});

test("basic chain preview is resisted 0%, neutral 25%, exploit 50%, pity 100%, then initiative 100%",()=>{
  const c=makeGame().combat;let plan=c.previewBasicChain(snapshot("resisted"));assert.equal(plan.chance,0);assert.equal(plan.reason,"검세에 막힘 · 0%");plan=c.previewBasicChain(snapshot("neutral"));assert.equal(plan.chance,.25);assert.equal(plan.reason,"연격 25%");plan=c.previewBasicChain(snapshot("exploit"));assert.equal(plan.chance,.5);assert.equal(plan.reason,"연격 50%");c.basicChainPity=2;assert.equal(c.previewBasicChain(snapshot("neutral")).reason,"누적 확정");c.initiative=1;assert.equal(c.previewBasicChain(snapshot("resisted")).reason,"선기 확정");
});

test("injected random values reproduce misses, pity reset, and opening bonuses",()=>{
  const c=makeGame().combat;c.random=()=>.25;let plan=c.planBasicChain(snapshot("neutral"));assert.equal(plan.triggered,false);assert.equal(c.basicChainPity,1);plan=c.planBasicChain(snapshot("neutral"));assert.equal(plan.triggered,false);assert.equal(c.basicChainPity,2);plan=c.planBasicChain(snapshot("neutral"));assert.equal(plan.triggered,true);assert.equal(c.basicChainPity,0);
  c.random=()=>.49;assert.equal(c.planBasicChain(snapshot("exploit")).triggered,true);c.random=()=>.5;assert.equal(c.planBasicChain(snapshot("exploit")).triggered,false);const pity=c.basicChainPity;c.random=()=>0;assert.equal(c.planBasicChain(snapshot("resisted")).triggered,false);assert.equal(c.basicChainPity,pity);
});

test("initiative is consumed only by basic and gives its second hit +20%p crit",()=>{
  const game=makeGame(),c=game.combat;c.initiative=1;new W.SkillRunner(c,game.player,game.enemy,W.SKILLS.find(s=>s.id==="meteor"));assert.equal(c.initiative,1);c.hit(game.enemy,game.player,{damage:[1,1],poiseDamage:0});assert.equal(c.initiative,1);const runner=new W.SkillRunner(c,game.player,game.enemy,W.SKILLS.find(s=>s.id==="basic"));assert.equal(c.initiative,0);assert.equal(runner.chain.triggered,true);assert.equal(runner.chain.critBonus,.2);assert.equal(runner.duration,1.08);
});

test("triggered chain keeps the opening snapshot and emits exact second-hit scales",()=>{
  const game=makeGame(),c=game.combat;c.initiative=1;c.hit=(a,b,s,opt)=>game.calls.hits.push(opt);const runner=new W.SkillRunner(c,game.player,game.enemy,W.SKILLS[0]);while(!runner.done)runner.update(.02);assert.equal(game.calls.hits.length,2);assert.equal(game.calls.hits[0].openingSnapshot,runner.opening);assert.equal(game.calls.hits[1].openingSnapshot,runner.opening);assert.equal(game.calls.hits[1].damageScale,.55);assert.equal(game.calls.hits[1].poiseScale,.5);assert.equal(game.calls.hits[1].critChance,Math.min(1,game.player.crit+.2));assert.deepEqual(game.calls.slashes.map(s=>s.length),[115,92]);assert.ok(game.calls.slashes[0].angle*game.calls.slashes[1].angle<0);assert.ok(game.calls.messages.includes("先機連斬"));assert.equal(game.player.poseOverride,null);
});

test("first-hit death cancels the second hit while first-hit poise break does not",()=>{
  const dead=makeGame();dead.combat.initiative=1;dead.combat.hit=(a,b,s,opt)=>{dead.calls.hits.push(opt);b.hp=0;};let runner=new W.SkillRunner(dead.combat,dead.player,dead.enemy,W.SKILLS[0]);runner.update(.3);runner.update(1);assert.equal(dead.calls.hits.length,1);assert.equal(runner.done,true);
  const broken=makeGame();broken.combat.initiative=1;broken.combat.hit=(a,b,s,opt)=>{broken.calls.hits.push(opt);if(broken.calls.hits.length===1)b.broken=true;};runner=new W.SkillRunner(broken.combat,broken.player,broken.enemy,W.SKILLS[0]);while(!runner.done)runner.update(.02);assert.equal(broken.calls.hits.length,2);
});

test("combat hit applies second-hit damage, poise, and independent injected critical chance once",()=>{
  const game=makeGame(),c=game.combat,target=game.enemy,skill={damage:[1000,1000],poiseDamage:20};game.player.attack=100;target.defense=0;target.hp=5000;target.poise=100;c.random=()=>.27;c.hit(game.player,target,skill,{damageScale:.55,poiseScale:.5,critChance:.28});assert.equal(target.hp,4092);assert.equal(target.poise,90);
});
