(function(W){
  "use strict";
  const U=W.util;
  const base=W.basePose;
  const mix=(a,b,t)=>{const o={};t=U.smooth(U.clamp(t,0,1));for(const k of Object.keys(Object.assign({},a,b)))o[k]=U.lerp(a[k]??0,b[k]??0,t);return o;};
  const ph=(t,a,b)=>U.clamp((t-a)/(b-a),0,1);
  const POSES={
    breathe:{...base(),crouch:18,torso:-.08,frontFoot:28,backFoot:-43,arm:.95,elbow:.42,reach:.42,sword:1.28,offArm:2.4,offElbow:-.3,cape:.1},
    evade:{...base(),crouch:29,hipX:-18,torso:-.25,frontFoot:18,backFoot:-62,frontLift:5,arm:-.6,elbow:.45,reach:.58,sword:-.76,offArm:2.7,offElbow:.25,cape:.55},
    guard:{...base(),crouch:19,hipX:-8,torso:-.13,frontFoot:30,backFoot:-55,arm:-.47,elbow:.14,reach:.98,sword:-.55,offArm:-.3,offElbow:.1,cape:.28},
    counter:{...base(),crouch:7,hipX:16,torso:.24,frontFoot:60,backFoot:-20,arm:.12,elbow:.02,reach:1,sword:.18,swordPull:1,offArm:.18,offElbow:.06,cape:-.75},
    darkWind:{...base(),crouch:20,hipX:-14,torso:-.24,frontFoot:18,backFoot:-60,arm:-1.2,elbow:.55,reach:.48,sword:-1.34,offArm:-.5,offElbow:.5,cape:.62},
    darkSlash:{...base(),crouch:9,hipX:19,torso:.31,frontFoot:65,backFoot:-18,arm:.48,elbow:.02,reach:1,sword:.58,offArm:.2,offElbow:.1,cape:-.85},
    darkBack:{...base(),crouch:12,hipX:5,torso:-.3,frontFoot:42,backFoot:-42,arm:-.62,elbow:.05,reach:.98,sword:-.72,offArm:-.15,offElbow:.22,cape:.7},
    darkOver:{...base(),crouch:8,hipX:18,torso:.38,frontFoot:68,backFoot:-15,arm:1.0,elbow:.03,reach:1,sword:1.08,offArm:.65,offElbow:.15,cape:-1},
    ghostCoil:{...base(),crouch:50,hipX:-30,torso:-.38,frontFoot:8,backFoot:-72,arm:.05,elbow:.62,reach:.42,sword:.02,offArm:.08,offElbow:.2,cape:.8},
    ghostDrive:{...base(),crouch:7,hipX:30,torso:.5,frontFoot:84,backFoot:-3,backLift:12,arm:-.02,elbow:.01,reach:1,sword:-.01,swordPull:1,offArm:.02,offElbow:.02,cape:-1.25},
    darkJump:{...base(),crouch:2,rootLift:0,frontFoot:18,backFoot:-18,frontLift:25,backLift:30,torso:.15,arm:-1.7,elbow:.08,reach:1,sword:-1.72,offArm:-1.3,offElbow:.1,cape:-.85},
    darkDive:{...base(),crouch:3,frontFoot:28,backFoot:-20,frontLift:18,backLift:20,torso:.48,arm:1.2,elbow:.03,reach:1,sword:1.25,swordPull:1,offArm:.9,offElbow:.15,cape:-1.2},
    darkLand:{...base(),crouch:48,hipX:18,frontFoot:62,backFoot:-45,torso:.5,arm:1.25,elbow:.02,reach:1,sword:1.28,swordPull:1,offArm:.9,offElbow:.2,cape:-1.1}
  };

  class TacticRunner{
    constructor(combat,actor,target,tactic){this.c=combat;this.a=actor;this.b=target;this.s={id:tactic.id,name:tactic.name,duration:.86};this.tactic=tactic;this.t=0;this.done=false;this.events=new Set();this.ax=actor.x;}
    once(id,fn){if(!this.events.has(id)){this.events.add(id);fn();}}
    update(dt){
      this.t+=dt;const p=this.tactic.id==="breathe"?POSES.breathe:this.tactic.id==="evade"?POSES.evade:POSES.guard;
      this.a.setPose(this.t<.25?mix(base(),p,ph(this.t,0,.25)):this.t<.62?p:mix(p,base(),ph(this.t,.62,.86)));
      if(this.tactic.id==="breathe"){
        if(this.t>.16)this.once("sound",()=>this.c.audio.charge());
        if(this.t>.26&&this.t<.68&&Math.random()<.18)this.c.effects.add("particle",{x:this.a.x+U.rand(-45,45),y:this.a.y+U.rand(-15,5),vx:U.rand(-12,12),vy:U.rand(-65,-28),gravity:0,r:U.rand(2,4),color:"#8fe4c9",life:.55});
        if(this.t>.52)this.once("recover",()=>{this.a.mp=Math.min(this.a.maxMp,this.a.mp+28);this.a.poise=Math.min(this.a.maxPoise,this.a.poise+20);this.a.hp=Math.min(this.a.maxHp,this.a.hp+Math.round(this.a.maxHp*.045));this.c.game.setMessage("운기조식 · 내력과 기세 회복",850);this.c.game.updateUI();});
      }
      if(this.t>=.86)this.finish();
    }
    finish(){if(this.done)return;this.done=true;this.a.x=this.ax;this.a.clearPose();if(this.tactic.id!=="breathe")this.a.guard=this.tactic.id;this.c.skillFinished(this);}
  }

  class EnemySkillRunner{
    constructor(combat,attacker,target,skill){this.c=combat;this.a=attacker;this.b=target;this.s=skill;this.t=0;this.done=false;this.events=new Set();this.ax=attacker.x;this.ay=attacker.y;this.aside=attacker.side;this.bx=target.x;this.by=target.y;this.guard=target.guard;this.outcome=this.resolveOutcome();this.c.showSkillTitle(skill);if(skill.id==="darkFall")this.c.cinematic(true);}
    once(id,fn){if(!this.events.has(id)){this.events.add(id);fn();}}
    resolveOutcome(){
      if(!this.guard)return"hit";const type=this.s.attackType;
      if(this.guard==="counter"){
        if(type==="SLASH")return"parry";
        if(type==="MULTI")return Math.random()<.72?"parry":"guardFail";
        return"guardFail";
      }
      if(this.guard==="evade"){
        if(type==="THRUST")return"evade";
        if(type==="SLASH")return Math.random()<.62?"evade":"evadeFail";
        if(type==="MULTI")return Math.random()<.4?"evade":"evadeFail";
        return"evadeFail";
      }
      return"hit";
    }
    pose(a,b,x,y){this.a.setPose(mix(a,b,ph(this.t,x,y)));}
    update(dt){this.t+=dt;(this[this.s.id]||this.darkSlash).call(this,this.t);if(this.t>=this.s.duration)this.finish();}
    impact(opt={}){
      this.b.guard=null;
      if(this.outcome==="parry"){this.parry();return;}
      if(this.outcome==="evade"){this.evade();return;}
      if(this.outcome==="guardFail")this.c.callout("破防","반격 실패","break");
      if(this.outcome==="evadeFail")this.c.callout("失步","회피 실패","break");
      const poiseScale=(this.outcome==="guardFail"?1.35:this.outcome==="evadeFail"?1.18:1)*(opt.poiseScale||1);
      this.c.hit(this.a,this.b,this.s,{...opt,poiseScale});
    }
    parry(){
      this.once("parry",()=>{
        this.b.setPose(POSES.guard);this.a.setPose({...POSES.darkSlash,sword:-.55,arm:-.47});
        let at=this.a.getSwordTip(),bt=this.b.getSwordTip();this.a.x+=bt.x-at.x;at=this.a.getSwordTip();const clash={x:(at.x+bt.x)/2,y:(at.y+bt.y)/2};
        this.c.hitStop=Math.max(this.c.hitStop,.11);this.c.camera.focusBetween(this.a,this.b,1.28);this.c.camera.punch(this.aside,14);this.c.camera.shake(18,.22);this.c.audio.clash();this.c.effects.spark(clash.x,clash.y,"#fff0b2",32,1.4);this.c.effects.shockwave(clash.x,clash.y,"#fff1c4",72,.3);this.c.callout("破招","파훼","parry");
        this.c.defer(.2,()=>{this.b.setPose(POSES.counter);this.c.effects.slash(this.a.getTorsoPosition().x,this.a.getTorsoPosition().y,.15,"#dffff6",125,.22);this.c.hit(this.b,this.a,{damage:[430,570],poiseDamage:18},{hitStop:.07,power:.8,knock:95,final:false});});
      });
    }
    evade(){
      this.once("evade",()=>{this.c.effects.afterimage(this.b,.3);this.b.x-=this.b.side*105;this.b.setPose({...POSES.evade,rootLift:9});this.c.audio.dash();this.c.camera.focusBetween(this.a,this.b,1.13);this.c.callout("回避","회피","evade");});
    }
    darkSlash(t){
      if(t<.28)this.pose(base(),POSES.darkWind,0,.28);
      else if(t<.58){this.pose(POSES.darkWind,POSES.darkSlash,.28,.58);this.a.x=U.lerp(this.ax,this.bx-this.aside*158,U.ease(ph(t,.28,.58)));this.once("dash",()=>this.c.audio.dash());}
      else if(t<.73)this.a.setPose(POSES.darkSlash);else{this.pose(POSES.darkSlash,base(),.73,1.02);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,.73,1.02)));}
      if(t>=.56)this.once("hit",()=>{if(this.outcome==="hit"||this.outcome.includes("Fail"))this.c.effects.slash(this.b.x,this.b.y-105,.62,"#ffc4b8",120,.22);this.impact({hitStop:.055,power:.75,knock:75});});
    }
    darkChain(t){
      if(t<.25)this.pose(base(),POSES.darkWind,0,.25);else if(t<.45){this.pose(POSES.darkWind,POSES.darkSlash,.25,.45);this.a.x=U.lerp(this.ax,this.bx-this.aside*160,U.ease(ph(t,.25,.45)));}
      else if(t<1.35){const q=(t-.45)% .3/.3,idx=Math.floor((t-.45)/.3);this.a.setPose(mix(idx%2?POSES.darkBack:POSES.darkSlash,idx%2?POSES.darkSlash:POSES.darkBack,q));this.a.x=this.bx-this.aside*(150+(idx%2?18:-12));}
      else{this.pose(POSES.darkOver,base(),1.35,1.72);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,1.35,1.72)));}
      [.48,.79,1.18].forEach((at,i)=>{if(t>=at)this.once("hit"+i,()=>{if(i===0&&["parry","evade"].includes(this.outcome)){this.impact({});return;}if(i>0&&["parry","evade"].includes(this.outcome))return;this.a.setPose(i===2?POSES.darkOver:i%2?POSES.darkBack:POSES.darkSlash);this.c.effects.slash(this.b.x,this.b.y-105,i===1?-.65:i===2?1.05:.55,"#ffb8ad",105+i*18,.2);this.impact({hitStop:i===2?.075:.035,power:i===2?1.05:.45,knock:i===2?130:25,damageScale:i===2?1.05:.48,poiseScale:i===2?.46:.27,multi:true});});});
    }
    ghostThrust(t){
      if(t<.4)this.pose(base(),POSES.ghostCoil,0,.4);
      else if(t<.76){this.pose(POSES.ghostCoil,POSES.ghostDrive,.4,.76);this.a.x=U.lerp(this.ax,this.bx-this.aside*122,U.ease(ph(t,.4,.76)));this.once("dash",()=>{this.c.audio.dash();this.c.effects.dust(this.ax,this.ay,this.aside,15);this.c.effects.afterimage(this.a,.28);});}
      else if(t<.96)this.a.setPose(POSES.ghostDrive);else{this.pose(POSES.ghostDrive,base(),.96,1.36);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,.96,1.36)));}
      if(t>=.75)this.once("hit",()=>{if(this.outcome!=="evade")this.c.effects.shockwave(this.b.x,this.b.y-105,"#ffb0a5",105,.3);this.impact({hitStop:.095,power:1.35,knock:185,final:true});this.c.camera.punch(this.aside,20);});
    }
    darkFall(t){
      if(t<.38)this.pose(base(),POSES.darkWind,0,.38);
      else if(t<.95){const q=U.ease(ph(t,.38,.95));this.a.setPose(mix(POSES.darkWind,POSES.darkJump,q));this.a.y=this.ay-360*q;this.a.x=this.ax+this.aside*55*q;this.c.camera.follow(this.a,1.2);}
      else if(t<1.38){this.a.setPose(POSES.darkJump);this.a.y=this.ay-360;this.c.camera.release();this.c.camera.pan(this.bx,this.by-90,1.18);}
      else if(t<1.86){const q=U.ease(ph(t,1.38,1.86));this.a.setPose(mix(POSES.darkJump,POSES.darkDive,q));this.a.x=U.lerp(this.ax+this.aside*55,this.bx-this.aside*15,q);this.a.y=U.lerp(this.ay-360,this.ay,q);}
      else if(t<2.18){this.a.setPose(POSES.darkLand);}else{this.pose(POSES.darkLand,base(),2.18,2.48);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,2.18,2.48)));}
      if(t>=1.84)this.once("hit",()=>{this.c.flash();this.c.effects.shockwave(this.b.x,this.by-12,"#ffb5a8",235,.62);this.c.effects.dust(this.b.x,this.by,1,24);this.impact({hitStop:.13,power:1.85,knock:260,down:true,final:true});this.c.camera.shake(31,.4);});
    }
    darkBreath(t){
      this.a.setPose(t<.25?mix(base(),POSES.breathe,ph(t,0,.25)):t<.7?POSES.breathe:mix(POSES.breathe,base(),ph(t,.7,.95)));
      if(t>.45)this.once("recover",()=>{this.a.poise=Math.min(this.a.maxPoise,this.a.poise+34);this.a.mp=Math.min(this.a.maxMp,this.a.mp+20);this.c.game.setMessage("염라가 사기를 가다듬습니다",850);this.c.game.updateUI();});
    }
    finish(){if(this.done)return;this.done=true;this.a.x=this.ax;this.a.y=this.ay;this.a.side=this.aside;this.b.x=this.b.baseX;this.b.y=this.b.baseY;this.a.clearPose();this.b.clearPose();this.c.camera.release();this.c.camera.reset();this.c.cinematic(false);this.c.skillFinished(this);}
  }
  W.TacticRunner=TacticRunner;W.EnemySkillRunner=EnemySkillRunner;
})(window.Wuxia);
