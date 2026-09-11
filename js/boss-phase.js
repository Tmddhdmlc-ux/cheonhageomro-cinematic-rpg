(function(W){
  "use strict";
  const U=W.util,base=W.basePose,META=W.BOSS_PHASE;
  const ph=(t,a,b)=>U.clamp((t-a)/(b-a),0,1);
  const mix=(a,b,t)=>{const out={};t=U.smooth(U.clamp(t,0,1));for(const key of Object.keys(Object.assign({},a,b)))out[key]=U.lerp(a[key]??0,b[key]??0,t);return out;};
  const POSES={
    retreat:{...base(),crouch:13,hipX:-5,frontFoot:18,backFoot:-66,backLift:5,torso:-.08,arm:-.35,elbow:.35,reach:.62,sword:-.3,cape:.28},
    sink:{...base(),crouch:29,hipX:-14,frontFoot:17,backFoot:-70,torso:-.22,head:-.04,arm:-.62,elbow:.38,reach:.78,sword:-.46,offArm:2.62,offElbow:.18,cape:.55},
    stance:{...base(),crouch:31,hipX:-16,frontFoot:20,backFoot:-68,torso:-.27,head:-.05,arm:-.7,elbow:.31,reach:.9,sword:-.43,swordPull:.42,offArm:2.7,offElbow:.12,cape:.62},
    signatureBreak:{...base(),crouch:49,hipX:-19,frontFoot:7,backFoot:-72,frontLift:3,torso:-.56,head:-.2,arm:.66,elbow:.58,reach:.43,sword:.82,offArm:2.82,offElbow:.42,cape:.96}
  };

  class PhaseTransitionRunner{
    constructor(combat){
      this.c=combat;this.a=combat.enemy;this.b=combat.player;this.s={id:"salpungse",name:META.name,hanja:META.hanja,duration:META.duration};this.t=0;this.done=false;this.events=new Set();this.ax=this.a.x;this.ay=this.a.y;
      this.c.cinematic(true);this.c.game.shell.classList.add("phase-transition");this.c.camera.slowPush(this.a.x+this.a.side*18,this.a.y-105,1.13);
    }
    once(id,fn){if(!this.events.has(id)){this.events.add(id);fn();}}
    update(dt){
      this.t+=dt;
      if(this.t<.22){const q=U.ease(ph(this.t,0,.22));this.a.x=this.ax-this.a.side*22*q;this.a.setPose(mix(base(),POSES.retreat,q));}
      else if(this.t<.55)this.a.setPose(mix(POSES.retreat,POSES.sink,ph(this.t,.22,.55)));
      else if(this.t<1.18)this.a.setPose(mix(POSES.sink,POSES.stance,ph(this.t,.55,.86)));
      else this.a.setPose(POSES.stance);
      if(this.t>=.66)this.once("reveal",()=>{
        this.c.audio.clash();this.c.callout(META.hanja,META.name,"phase");
        const tip=this.a.getSwordTip(),footY=this.a.y-5;
        for(let i=0;i<26;i++){
          const aroundSword=i<15,x=aroundSword?U.lerp(this.a.getHandPosition().x,tip.x,U.rand(0,1)):this.a.x+U.rand(-62,62),y=aroundSword?U.lerp(this.a.getHandPosition().y,tip.y,U.rand(0,1)):footY+U.rand(-18,4);
          this.c.effects.add("particle",{x,y,vx:U.rand(-34,34)+this.a.side*22,vy:U.rand(-78,-20),gravity:20,r:U.rand(1.5,3.8),color:i%7===0?"#d55a51":"#4aa5a5",life:U.rand(.42,.78)});
        }
        this.c.effects.slash(tip.x,tip.y,-.48,"#5fb7b5",92,.34);
        this.c.effects.shockwave(this.a.x,footY,"#3d8f91",105,.5);
      });
      if(this.t>=META.duration)this.finish();
    }
    finish(){if(this.done)return;this.done=true;this.a.x=this.ax;this.a.y=this.ay;this.a.clearPose();this.c.game.shell.classList.remove("phase-transition");this.c.camera.release();this.c.camera.reset();this.c.cinematic(false);this.c.phaseTransitionFinished(this);}
  }

  class BossPhaseController{
    constructor(combat){this.c=combat;this.reset();}
    reset(){this.phase=1;this.transitionPending=false;this.transitioned=false;this.step=-1;this.route=null;this.signatureArmed=false;this.signatureCanceled=false;}
    get active(){return this.phase===2;}
    get phaseStep(){return this.active?this.step+1:0;}
    routeForHabits(){return(this.c.playerHabits.counter||0)>=(this.c.playerHabits.evade||0)?"counter":"evade";}
    skillForStep(){const id=this.route&&META.routes[this.route][this.step];return W.ENEMY_SKILLS.find(skill=>skill.id===id)||null;}
    syncIntent(){
      if(!this.active)return null;
      const skill=this.skillForStep();this.c.setEnemyIntent(skill);this.signatureArmed=skill?.id==="darkFall";this.c.game.updateUI();return skill;
    }
    startCycle(){this.route=this.routeForHabits();this.step=0;this.signatureCanceled=false;return this.syncIntent();}
    armIfEligible(){
      const enemy=this.c.enemy;
      if(this.phase===1&&!this.transitioned&&enemy.hp>0&&enemy.hp/enemy.maxHp<=META.threshold)this.transitionPending=true;
      return this.transitionPending;
    }
    beginTransition(){
      if(!this.transitionPending||this.transitioned||this.c.over||this.c.runner)return false;
      this.transitionPending=false;this.transitioned=true;this.phase=2;this.c.turn="transition";this.c.wait=0;this.c.enemy.broken=false;this.c.enemy.breakPending=false;this.c.enemy.poise=this.c.enemy.maxPoise;this.c.enemy.stance="salpungse";this.startCycle();this.c.runner=new PhaseTransitionRunner(this.c);this.c.game.updateUI();return true;
    }
    advanceAfterEnemySkill(skill){
      if(!this.active||!this.route||skill?.id!==this.skillForStep()?.id)return this.syncIntent();
      if(this.step===META.routes[this.route].length-1)return this.startCycle();
      this.step+=1;this.signatureCanceled=false;return this.syncIntent();
    }
    forceNext(){
      if(!this.active||!this.route)return null;
      this.step=(this.step+1)%META.routes[this.route].length;this.signatureCanceled=false;return this.syncIntent();
    }
    beforeEnemyAttack(skill){if(this.active&&skill?.id==="darkFall")this.signatureArmed=false;}
    handleEnemyPoiseBreak(target,attacker){
      if(!this.active||!this.signatureArmed||this.c.intent?.id!=="darkFall"||target!==this.c.enemy||attacker!==this.c.player||target.poise!==0)return false;
      this.signatureArmed=false;this.signatureCanceled=true;target.setPose(POSES.signatureBreak);this.startCycle();this.signatureCanceled=true;
      this.c.defer(.58,()=>{if(this.active&&this.signatureCanceled){target.clearPose();this.signatureCanceled=false;}});
      this.c.defer(.72,()=>{if(!this.c.over&&this.active)this.c.callout("破絶","절기 파훼","signature");});
      return true;
    }
  }

  W.BOSS_PHASE_POSES=POSES;W.PhaseTransitionRunner=PhaseTransitionRunner;W.BossPhaseController=BossPhaseController;
})(window.Wuxia);
