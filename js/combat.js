(function(W){
  "use strict";
  const U=W.util;
  class Combat{
    constructor(game){
      this.game=game;this.camera=game.camera;this.effects=game.effects;this.audio=game.audio;this.player=game.player;this.enemy=game.enemy;
      this.enemyConfig=game.enemyConfig||W.ENEMIES?.yama||{skills:W.ENEMY_SKILLS,openings:W.ENEMY_OPENINGS,bossPhase:true};this.enemySkills=this.enemyConfig.skills||W.ENEMY_SKILLS;this.enemyOpenings=this.enemyConfig.openings||W.ENEMY_OPENINGS;
      this.runner=null;this.turn="player";this.ai=true;this.slow=false;this.wait=0;this.hitStop=0;this.over=false;this.round=1;this.intent=null;this.intentIndex=0;this.opening=null;this.deferred=[];
      this.playerHabits={counter:0,evade:0,breathe:0};
      this.awaitingResponse=false;this.responseSkillId=null;this.selectedResponse=null;this.resolvedOutcome=null;this.initiative=0;this.basicChainPity=0;this.basicChainChance=W.BASIC_CHAIN.baseChance;this.basicChainTriggered=false;this.random=()=>Math.random();
      this.phase=new W.BossPhaseController(this);
      this.mujin=this.enemyConfig.ai?.type==="fixedCycle"&&W.MujinIntentController?new W.MujinIntentController(this):null;
      this.enemyDefense=new W.EnemyDefenseController(this);
    }
    reset(){
      this.enemyDefense.cancel();this.player.reset();this.enemy.reset();this.effects.clear();this.runner=null;this.hitStop=0;this.wait=0;this.deferred=[];this.over=false;this.round=1;this.intent=null;this.opening=null;this.playerHabits={counter:0,evade:0,breathe:0};this.clearMindgameState();
      this.phase.reset();this.mujin?.reset();this.game.shell.classList.remove?.("phase-transition");this.turn=this.player.speed>=this.enemy.speed?"player":"enemy";this.camera.reset(true);this.cinematic(false);this.selectEnemyIntent(true);this.game.updateUI();this.game.setMessage("비무를 시작합니다",850);if(this.turn==="enemy")this.wait=.7;
    }
    dispose(){this.enemyDefense.cancel();this.runner?.a?.clearPose?.();this.runner?.b?.clearPose?.();this.runner=null;this.deferred=[];this.wait=0;this.hitStop=0;this.over=true;this.turn="inactive";this.clearMindgameState();this.effects.clear();this.camera.release?.();this.camera.reset(true);this.cinematic(false);}
    useSkill(id){
      if((this.game.mode&&this.game.mode!=="duel")||this.over||this.runner||this.turn!=="player")return false;const s=W.SKILLS.find(x=>x.id===id);if(!s)return false;if(this.player.mp<s.cost){this.game.setMessage("내력이 부족합니다",800);this.audio.tone("square",90,70,.12,.08);return false;}
      this.audio.unlock();this.player.mp-=s.cost;if(id!=="basic")this.basicChainTriggered=false;this.runner=new W.SkillRunner(this,this.player,this.enemy,s);this.game.updateUI();return true;
    }
    useTactic(id){
      if(id==="counter"||id==="evade")return this.chooseResponse(id);
      if((this.game.mode&&this.game.mode!=="duel")||this.over||this.runner||this.turn!=="player"||id!=="breathe")return false;const t=W.TACTICS.find(x=>x.id===id);if(!t)return false;this.audio.unlock();this.playerHabits.breathe++;this.runner=new W.TacticRunner(this,this.player,this.enemy,t);this.game.updateUI();return true;
    }
    clearMindgameState(){this.awaitingResponse=false;this.responseSkillId=null;this.selectedResponse=null;this.resolvedOutcome=null;this.initiative=0;this.basicChainPity=0;this.basicChainChance=W.BASIC_CHAIN.baseChance;this.basicChainTriggered=false;this.player.guard=null;}
    openResponse(r){if(this.over||this.runner!==r)return false;this.awaitingResponse=true;this.responseSkillId=r.s.id;this.selectedResponse=null;this.resolvedOutcome=null;this.game.updateUI();return true;}
    chooseResponse(id){if(!this.awaitingResponse||this.over||this.runner?.a!==this.enemy)return false;return this.runner.acceptResponse(id);}
    onResponseSelected(r){if(this.runner!==r)return;this.awaitingResponse=false;this.responseSkillId=r.s.id;this.selectedResponse=r.selectedResponse;this.resolvedOutcome=r.resolvedOutcome;if(r.guard)this.playerHabits[r.guard]=(this.playerHabits[r.guard]||0)+1;this.audio.unlock();this.game.updateUI();}
    closeResponse(r){if(r&&this.runner!==r)return;this.awaitingResponse=false;this.responseSkillId=null;this.selectedResponse=null;this.resolvedOutcome=null;this.player.guard=null;}
    responsePreview(id){const r=this.runner;if(!this.awaitingResponse||!r?.s?.responses)return"응수 구간에서 선택";const rule=r.s.responses[id];if(!rule)return"효과 없음";if(rule.minPoise!=null&&this.player.poise<rule.minPoise)return`기세 ${rule.minPoise} 필요 · 현재 ${Math.floor(this.player.poise)}`;if(rule.outcome==="parry")return"확정 파훼";if(rule.outcome==="evade")return"확정 회피";return id==="evade"?"회피 실패":"반격 실패";}
    grantInitiative(){this.initiative=1;this.game.setMessage("先機 · 다음 기본검 연격 확정",950);this.audio.tone?.("sine",760,1180,.16,.05);this.game.updateUI();}
    previewBasicChain(opening){const cfg=W.BASIC_CHAIN,eligible=opening?.result!=="resisted";if(this.initiative)return{chance:1,reason:"선기 확정",initiative:true};if(eligible&&this.basicChainPity>=cfg.pityMisses)return{chance:1,reason:"누적 확정",initiative:false};if(!eligible)return{chance:0,reason:"검세에 막힘 · 0%",initiative:false};const chance=cfg.baseChance+(opening?.result==="exploit"?cfg.exploitBonus:0);return{chance,reason:`연격 ${Math.round(chance*100)}%`,initiative:false};}
    planBasicChain(opening){const plan=this.previewBasicChain(opening),triggered=plan.chance>=1||plan.chance>0&&this.random()<plan.chance;this.basicChainChance=plan.chance;this.basicChainTriggered=triggered;if(plan.initiative)this.initiative=0;if(triggered)this.basicChainPity=0;else if(plan.chance>0)this.basicChainPity++;return{...plan,triggered,critBonus:plan.initiative?W.BASIC_CHAIN.initiativeCritBonus:0};}
    setEnemyIntent(skill){this.intent=skill||null;this.intentIndex=skill?this.enemySkills.indexOf(skill):0;this.opening=W.openingForIntent(skill,this.enemyOpenings);this.enemy.setOpening(this.opening);return skill;}
    selectEnemyIntent(forceCycle=false){
      if(this.mujin)return this.mujin.sync();
      if(this.phase.active)return this.phase.syncIntent();
      const skills=this.enemySkills,e=this.enemy,p=this.player;
      if(forceCycle&&this.intent){this.intentIndex=(this.intentIndex+1)%4;this.setEnemyIntent(skills[this.intentIndex]);this.game.updateUI();return this.intent;}
      const weighted=[];
      const add=(id,w)=>{for(let i=0;i<Math.max(0,Math.round(w));i++)weighted.push(skills.find(s=>s.id===id));};
      add("darkSlash",4);add("darkChain",3+(this.playerHabits.evade||0)*.7);add("ghostThrust",2+(p.poise<38?4:0)+(this.playerHabits.counter||0)*1.4);
      if(e.hp/e.maxHp<=.4)add("darkFall",3+(this.playerHabits.evade||0)*1.3);
      if(e.poise<28)add("darkBreath",4);
      this.setEnemyIntent(weighted[Math.floor(Math.random()*weighted.length)]||skills[0]);this.game.updateUI();return this.intent;
    }
    forceIntent(){
      if(this.game.mode&&this.game.mode!=="duel")return false;
      if(this.mujin){const skill=this.mujin.forceNext();if(skill)this.game.setMessage(`${this.mujin.label} · ${skill.name}`,700);return skill;}
      if(this.phase.active){const skill=this.phase.forceNext();if(skill)this.game.setMessage(`살풍세 ${this.phase.phaseStep}/4 · ${skill.name}`,700);return;}
      this.intentIndex=(this.intentIndex+1)%this.enemySkills.length;this.setEnemyIntent(this.enemySkills[this.intentIndex]);this.game.updateUI();this.game.setMessage(`다음 초식: ${this.intent.name}`,700);
    }
    enemyAttack(){
      if(this.over||this.runner||!this.ai)return;
      this.enemyDefense.cancel(this.enemy);this.player.guard=null;
      if(this.enemy.broken){this.enemy.broken=false;this.enemy.poise=Math.max(42,this.enemy.poise);}
      this.mujin?.prepareNext();const s=this.intent||this.selectEnemyIntent();this.phase.beforeEnemyAttack(s);this.runner=new W.EnemySkillRunner(this,this.enemy,this.player,s);this.game.updateUI();
    }
    hit(attacker,target,skill,opt={}){
      const opening=attacker===this.player&&target===this.enemy?opt.openingSnapshot:null;
      const resisted=opening?.result==="resisted",damageMultiplier=opening?.damageMultiplier??1,poiseMultiplier=opening?.poiseMultiplier??1,firstReaction=resisted&&!opening.reactionShown;
      const alreadyBroken=target.broken,range=skill.damage||[500,700],scale=(opt.damageScale||1)*damageMultiplier,atk=attacker.attack/100;
      const effectiveDefense=target.defense*(alreadyBroken ? .65 : 1),def=100/(100+effectiveDefense*.45),breakBonus=alreadyBroken?1.3:1;
      let amount=Math.round(U.rand(range[0],range[1])*atk*def*scale*breakBonus);const crit=this.random()<(opt.critChance??attacker.crit);if(crit)amount=Math.round(amount*1.65);
      target.hp=Math.max(0,target.hp-amount);
      const poiseHit=Math.max(0,Math.round((skill.poiseDamage||0)*(opt.poiseScale??1)*poiseMultiplier));
      if(poiseHit>0&&!target.broken){target.poise=Math.max(0,target.poise-poiseHit);if(target.poise>0)this.effects.poise(target.x,target.y-92,poiseHit);}
      const terminal=target.hp<=0||target.poise<=0&&!target.broken;
      if(resisted&&firstReaction&&terminal)opening.reactionShown=true;
      if(resisted&&!terminal)this.enemyDefense.start(target,attacker,opening);else target.react(opt.power||1,(opt.knock||0)*attacker.side,opt.down);
      if(target.hp<=0){this.enemyDefense.cancel(target);target.deadTime=.001;}
      if(opening?.matched&&!opening.feedbackShown){opening.feedbackShown=true;target.reactOpening?.();const torso=target.getTorsoPosition();this.effects.spark(torso.x,torso.y,"#f2cf72",18,1.05);this.audio.tone?.("sine",920,1280,.13,.055);if(target.poise<=0&&!target.broken)this.game.setMessage("허점 +50% 기세",700);else this.callout("破隙","허점 파훼","opening");}
      const showDamage=()=>this.effects.damage(target.x,target.y-130,amount,crit,opt.final,resisted,firstReaction);if(opt.delayNumber)this.defer(opt.delayNumber,showDamage);else showDamage();if(!resisted)this.effects.spark(target.getTorsoPosition().x,target.getTorsoPosition().y,crit?"#ffd586":"#eafff8",Math.round(8+(opt.power||1)*6),opt.power||1);
      this.audio.slash(!!opt.multi);if(!resisted)this.audio.hit(opt.power||1,crit);if(!resisted)this.hitStop=Math.max(this.hitStop,(opt.hitStop||.05)+(target.poise<=0&&!target.broken ? .035 : 0));
      if(target.poise<=0&&!target.broken)this.breakPoise(target,attacker);
      this.game.updateUI();
    }
    breakPoise(target,attacker){
      this.enemyDefense.cancel(target);target.broken=true;target.breakPending=true;target.react(1.8,130*attacker.side,false);this.hitStop=Math.max(this.hitStop,.13);this.audio.breakPoise();
      const torso=target.getTorsoPosition();this.effects.shockwave(torso.x,torso.y,"#ffdaa0",155,.52);this.effects.spark(torso.x,torso.y,"#ffe0a1",30,1.45);this.camera.focusBetween(attacker,target,1.18);this.camera.punch(attacker.side,18);this.camera.shake(23,.28);this.callout("破勢","파세","break");
      this.phase.handleEnemyPoiseBreak(target,attacker);
      const bar=target===this.enemy?document.getElementById("enemy-poise").parentElement:document.getElementById("player-poise").parentElement;bar?.classList.add("breaking");setTimeout(()=>bar?.classList.remove("breaking"),750);
    }
    defer(delay,fn){this.deferred.push({time:delay,fn});}
    updateDeferred(dt){for(const d of this.deferred)d.time-=dt;const due=this.deferred.filter(d=>d.time<=0);this.deferred=this.deferred.filter(d=>d.time>0);due.forEach(d=>d.fn());}
    update(realDt){
      const rate=(this.slow?.36:1)*(this.cinematicRate||1);let dt=realDt*rate;this.camera.update(realDt);this.effects.update(realDt*(this.hitStop>0?.18:(this.slow?.55:1)));this.updateDeferred(realDt);
      if(this.hitStop>0){this.hitStop-=realDt;dt=0;}
      this.enemyDefense.update(dt);const busy=!!this.runner,playerActing=busy&&this.runner.a===this.player,enemyActing=busy&&this.runner.a===this.enemy;this.player.update(dt,playerActing,playerActing);this.enemy.update(dt,enemyActing,enemyActing);
      this.effects.trackSword(this.player,Math.max(realDt,.001),busy);this.effects.trackSword(this.enemy,Math.max(realDt,.001),busy);
      if(this.runner)this.runner.update(dt);else if(this.wait>0){this.wait-=dt;if(this.wait<=0&&this.turn==="enemy")this.enemyAttack();}
    }
    skillFinished(r){
      this.runner=null;
      if(r.a===this.enemy)this.closeResponse();
      if(r.b.hp<=0){this.enemyDefense.cancel(r.b);this.over=true;this.turn="over";this.awaitingResponse=false;this.initiative=0;this.basicChainPity=0;this.basicChainChance=W.BASIC_CHAIN.baseChance;this.basicChainTriggered=false;const won=r.b===this.enemy,finisher=r.s?.id==="thunder"&&r.b.broken;if(finisher)this.defer(.5,()=>this.callout("勝","승리","parry"));if(this.game.finishDuel)this.game.finishDuel(won);else this.game.setMessage(won?(this.enemyConfig.victoryMessage||"승리 — 검로가 열렸습니다"):(this.enemyConfig.defeatMessage||"패배 — 호흡을 가다듬으십시오"),2600);this.game.updateUI();return;}
      const earnedExtra=!!r.b.breakPending;
      if(r.a===this.player&&r.b===this.enemy)this.phase.armIfEligible();
      if(r.a===this.player){
        this.mujin?.prepareNext();
        if(!this.player.broken)this.player.poise=Math.min(this.player.maxPoise,this.player.poise+this.player.poiseRecovery);
        if(r.s?.id==="breathe")this.player.guard=null;
        if(r.b.breakPending){r.b.breakPending=false;this.turn="player";this.player.mp=Math.min(this.player.maxMp,this.player.mp+5);this.game.setMessage("파세 기회 · 추가 행동",900);}
        else if(this.ai){this.turn="enemy";this.wait=.68;}
        else{this.turn="player";this.player.mp=Math.min(this.player.maxMp,this.player.mp+7);}
      }else{
        if(!this.enemy.broken&&!r.s?.skipPassivePoiseRecovery)this.enemy.poise=Math.min(this.enemy.maxPoise,this.enemy.poise+this.enemy.poiseRecovery);
        if(this.mujin)this.mujin.advanceAfter(r.s);else if(this.phase.active)this.phase.advanceAfterEnemySkill(r.s);
        if(r.b.breakPending){r.b.breakPending=false;this.turn="enemy";this.wait=.62;this.game.setMessage(this.enemyConfig.breakMessage||"파세 위기 · 적의 연격",900);}
        else{this.turn="player";this.player.mp=Math.min(this.player.maxMp,this.player.mp+12);this.player.poise=Math.min(this.player.maxPoise,this.player.poise+this.player.poiseRecovery);this.round++;this.selectEnemyIntent();}
      }
      if(r.a===this.player&&r.b.broken&&!r.b.breakPending&&this.turn==="enemy"){r.b.broken=false;r.b.poise=Math.max(42,r.b.poise);}
      if(r.a===this.enemy&&r.b.broken&&!r.b.breakPending&&this.turn==="player"){r.b.broken=false;r.b.poise=Math.max(42,r.b.poise);}
      if(r.a===this.player&&this.phase.transitionPending&&!earnedExtra)this.phase.beginTransition();
      this.game.updateUI();
    }
    phaseTransitionFinished(r){
      if(this.runner!==r)return;
      this.enemyDefense.cancel(this.enemy);this.runner=null;this.enemy.broken=false;this.enemy.breakPending=false;this.enemy.poise=this.enemy.maxPoise;this.turn=this.ai?"enemy":"player";this.wait=this.ai?.42:0;this.game.updateUI();
    }
    toggleAI(){this.ai=!this.ai;if(!this.ai&&this.turn==="enemy"&&!this.runner){this.turn="player";this.wait=0;}this.game.updateUI();this.game.setMessage(`적 AI ${this.ai?"ON":"OFF"}`,700);}
    toggleSlow(){this.slow=!this.slow;this.game.updateUI();this.game.setMessage(`슬로모션 ${this.slow?"ON":"OFF"}`,700);}
    showSkillTitle(s){this.game.showSkillTitle(s);}
    callout(hanja,label,kind){this.game.callout(hanja,label,kind);}
    cinematic(on){this.game.shell.classList.toggle("cinematic",on);}
    flash(){this.game.flash();}
  }
  W.Combat=Combat;
})(window.Wuxia);
