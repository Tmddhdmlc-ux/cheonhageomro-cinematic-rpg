(function(W){
  "use strict";
  const U=W.util,base=W.basePose;
  const mix=(a,b,t)=>{const out={};t=U.smooth(U.clamp(t,0,1));for(const key of Object.keys(Object.assign({},a,b)))out[key]=U.lerp(a[key]??0,b[key]??0,t);return out;};
  const POSES={
    block:{...base(),crouch:25,hipX:-13,torso:-.2,head:-.04,frontFoot:18,backFoot:-74,arm:-.42,elbow:.48,reach:.76,sword:-.39,swordPull:.25,offArm:2.48,offElbow:.26,cape:.42},
    deflect:{...base(),crouch:19,hipX:-8,torso:-.31,head:-.08,frontFoot:48,backFoot:-43,arm:-.68,elbow:.2,reach:.9,sword:-.61,swordPull:.28,offArm:2.75,offElbow:.2,cape:.58},
    sidestep:{...base(),crouch:29,hipX:-18,torso:-.26,head:-.06,frontFoot:12,frontLift:5,backFoot:-63,arm:.5,elbow:.3,reach:.62,sword:.68,offArm:2.7,offElbow:.17,cape:.92},
    heavyBlock:{...base(),crouch:42,hipX:-25,torso:-.32,head:-.08,frontFoot:6,backFoot:-82,arm:-.53,elbow:.38,reach:.82,sword:-.5,swordPull:.1,offArm:-.42,offElbow:.24,cape:.2},
    heavyDeflect:{...base(),crouch:36,hipX:-18,torso:-.22,head:-.05,frontFoot:28,backFoot:-76,arm:-.82,elbow:.24,reach:.9,sword:-.78,swordPull:.18,offArm:-.66,offElbow:.18,cape:.3}
  };
  const META={
    block:{duration:.28,hanja:"擋",label:"받아냄"},
    deflect:{duration:.25,hanja:"卸",label:"흘리기"},
    sidestep:{duration:.32,hanja:"閃",label:"보법"}
  };

  class EnemyDefenseController{
    constructor(combat){this.c=combat;this.active=null;}
    startBind(target,attacker,snapshot,runner){
      if(this.active)this.cancel();
      const poses=W.SWORD_BIND_POSES,heavy=target.weaponStyle==="heavySaber",targetPose=heavy?poses.heavyBind:poses.enemyBind;
      const r={type:"bind",target,attacker,snapshot,runner,targetFrom:target.currentPose(),attackerFrom:attacker.currentPose(),targetOriginX:target.x,targetOriginY:target.y,attackerOriginX:runner?.ax??attacker.baseX,attackerOriginY:runner?.ay??attacker.baseY,targetPose,enemyChoice:null};
      attacker.setPose(poses.playerBind);target.setPose(targetPose);this.active=r;this.alignBind(r);
      const point=this.bindPoint(r);this.c.effects.spark(point.x,point.y,"#f4d59a",26,1.12);this.c.effects.reactionLabel?.(point.x,point.y-34,"合劍","다음 수를 고르십시오","bind");this.c.audio.clash?.();this.c.hitStop=Math.max(this.c.hitStop,.09);this.c.camera.focusBetween?.(attacker,target,1.08);
      return true;
    }
    alignBind(r){
      const a=r.attacker.getSwordTip(),b=r.target.getSwordTip(),dx=b.x-a.x,dy=b.y-a.y;
      r.attacker.x+=dx*.5;r.target.x-=dx*.5;r.attacker.y+=dy*.5;r.target.y-=dy*.5;r.bindAttackerX=r.attacker.x;r.bindAttackerY=r.attacker.y;r.bindTargetX=r.target.x;r.bindTargetY=r.target.y;
    }
    bindPoint(r=this.active){const a=r.attacker.getSwordTip(),b=r.target.getSwordTip();return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
    revealBind(enemyChoice){
      const r=this.active;if(!r||r.type!=="bind")return false;r.enemyChoice=enemyChoice;const poses=W.SWORD_BIND_POSES,heavy=r.target.weaponStyle==="heavySaber";r.revealPose=heavy?(enemyChoice==="guard"?poses.heavyGuard:poses.heavyLure):(enemyChoice==="guard"?poses.enemyGuard:poses.enemyLure);r.target.setPose(r.revealPose);return true;
    }
    animateBind(playerChoice,outcome,progress){
      const r=this.active;if(!r||r.type!=="bind")return false;const poses=W.SWORD_BIND_POSES,strike=U.ease(U.clamp(progress/.48,0,1)),recover=U.ease(U.clamp((progress-.46)/.54,0,1));
      const playerPose=playerChoice==="press"?poses.playerPress:playerChoice==="shift"?poses.playerShift:poses.playerRecall,enemyPose=r.revealPose||r.targetPose;
      const playerDrive=playerChoice==="recall"?-30:outcome==="win"?(playerChoice==="press"?28:20):-16;
      const enemyYield=playerChoice==="recall"?0:outcome==="win"?22:-8;
      r.attacker.x=U.lerp(r.bindAttackerX+r.attacker.side*playerDrive*strike,r.attackerOriginX,recover);r.attacker.y=U.lerp(r.bindAttackerY,r.attackerOriginY,recover);
      r.target.x=U.lerp(r.bindTargetX+r.attacker.side*enemyYield*strike,r.targetOriginX,recover);r.target.y=U.lerp(r.bindTargetY,r.targetOriginY,recover);
      r.attacker.setPose(mix(playerPose,r.attackerFrom,recover));r.target.setPose(mix(enemyPose,r.targetFrom,recover));return true;
    }
    start(target,attacker,snapshot){
      const type=snapshot?.reactionType,meta=META[type];
      if(!meta||snapshot.reactionShown||target.hp<=0||target.broken)return false;
      snapshot.reactionShown=true;
      const from=target.currentPose(),originX=target.x,originY=target.y,offset=type==="sidestep"?-target.side*(snapshot.attackType==="SLASH"?72:60):0,heavy=target.weaponStyle==="heavySaber",to=heavy&&type==="block"?POSES.heavyBlock:heavy&&type==="deflect"?POSES.heavyDeflect:POSES[type];
      this.active={target,attacker,snapshot,type,meta,from,to,originX,originY,offset,t:0};
      if(type==="sidestep"){
        this.c.effects.afterimage?.(target,.2);target.x=originX+offset;target.setPose(POSES.sidestep);this.c.effects.dust?.(originX,originY,target.side,8);this.c.audio.dash?.();this.c.camera.punch?.(target.side,4);
        this.c.effects.reactionLabel?.(originX,originY-126,meta.hanja,meta.label,type);
      }else{
        target.setPose(to);const a=attacker.getSwordTip(),b=target.getSwordTip(),point={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        this.c.effects.spark(point.x,point.y,type==="block"?"#f2d39a":"#c6eef0",type==="block"?22:15,type==="block"?1.05:.82);this.c.audio.clash?.();
        if(type==="block"){this.c.hitStop=Math.max(this.c.hitStop,.095);this.c.camera.punch?.(attacker.side,6);}
        else{this.c.hitStop=Math.max(this.c.hitStop,.065);this.c.camera.focusBetween?.(attacker,target,1.04);this.c.effects.slash?.(point.x,point.y,attacker.side*.36,"#c9f5f3",82,.2);}
        this.c.effects.reactionLabel?.(point.x,point.y-30,meta.hanja,meta.label,type);
      }
      return true;
    }
    update(dt){
      const r=this.active;if(!r)return;
      if(r.type==="bind"){if(this.c.over||this.c.runner!==r.runner)this.cancel();return;}
      if(this.c.over||r.target.hp<=0||r.target.broken||r.target.down>0||r.target.hitTime>0||this.c.runner?.a===r.target){this.cancel(r.target);return;}
      r.t+=dt;const q=U.clamp(r.t/r.meta.duration,0,1),recover=U.clamp((q-.38)/.62,0,1);
      if(r.type==="sidestep")r.target.x=r.originX+r.offset*(1-U.ease(recover));
      else r.target.x=r.originX-r.target.side*(r.type==="block"?5:3)*(1-U.ease(recover));
      r.target.y=r.originY;r.target.setPose(mix(r.to,r.from,recover));
      if(q>=1)this.cancel(r.target);
    }
    cancel(target=null){
      const r=this.active;if(!r||target&&r.target!==target)return false;
      if(r.type==="bind"){
        r.attacker.x=r.attackerOriginX;r.attacker.y=r.attackerOriginY;r.target.x=r.targetOriginX;r.target.y=r.targetOriginY;r.attacker.clearPose();r.target.clearPose();this.c.camera.release?.();this.c.camera.reset?.();this.active=null;return true;
      }
      r.target.x=r.originX;r.target.y=r.originY;r.target.clearPose();this.active=null;return true;
    }
  }

  W.ENEMY_DEFENSE_POSES=POSES;W.EnemyDefenseController=EnemyDefenseController;
})(window.Wuxia);
