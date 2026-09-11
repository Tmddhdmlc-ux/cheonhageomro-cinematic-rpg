(function(W){
  "use strict";
  const U=W.util;
  const base=W.basePose;
  const mix=(a,b,t)=>{const o={};t=U.smooth(U.clamp(t,0,1));for(const k of Object.keys(Object.assign({},a,b)))o[k]=U.lerp(a[k]??0,b[k]??0,t);return o;};
  const ph=(t,a,b)=>U.clamp((t-a)/(b-a),0,1);
  const POSES={
    breathe:{...base(),crouch:18,torso:-.08,frontFoot:28,backFoot:-43,arm:.95,elbow:.42,reach:.42,sword:1.28,offArm:2.4,offElbow:-.3,cape:.1},
    evade:{...base(),crouch:29,hipX:-18,torso:-.25,frontFoot:18,backFoot:-62,frontLift:5,arm:-.6,elbow:.45,reach:.58,sword:-.76,offArm:2.7,offElbow:.25,cape:.55},
    evadeCaught:{...base(),crouch:35,hipX:-28,torso:-.38,frontFoot:5,backFoot:-70,frontLift:3,arm:-.82,elbow:.35,reach:.55,sword:-.52,offArm:2.92,offElbow:.35,cape:.82},
    guard:{...base(),crouch:19,hipX:-8,torso:-.13,frontFoot:30,backFoot:-55,arm:-.47,elbow:.14,reach:.98,sword:-.55,offArm:-.3,offElbow:.1,cape:.28},
    counterPierced:{...base(),crouch:26,hipX:-20,torso:-.34,head:-.12,frontFoot:12,backFoot:-68,arm:-.9,elbow:.38,reach:.72,sword:-.82,offArm:2.78,offElbow:.25,cape:.72},
    overwhelmed:{...base(),crouch:31,hipX:-25,torso:-.42,head:-.1,frontFoot:5,backFoot:-73,frontLift:2,arm:-.72,elbow:.3,reach:.78,sword:-.64,offArm:2.8,offElbow:.3,cape:.88},
    impactCollapse:{...base(),crouch:46,hipX:-18,torso:-.52,head:-.18,frontFoot:8,backFoot:-66,frontLift:4,arm:.34,elbow:.5,reach:.48,sword:.55,offArm:2.75,offElbow:.45,cape:.95},
    counter:{...base(),crouch:7,hipX:16,torso:.24,frontFoot:60,backFoot:-20,arm:.12,elbow:.02,reach:1,sword:.18,swordPull:1,offArm:.18,offElbow:.06,cape:-.75},
    darkWind:{...base(),crouch:20,hipX:-14,torso:-.24,frontFoot:18,backFoot:-60,arm:-1.2,elbow:.55,reach:.48,sword:-1.34,offArm:-.5,offElbow:.5,cape:.62},
    darkSlash:{...base(),crouch:9,hipX:19,torso:.31,frontFoot:65,backFoot:-18,arm:.48,elbow:.02,reach:1,sword:.58,offArm:.2,offElbow:.1,cape:-.85},
    darkBack:{...base(),crouch:12,hipX:5,torso:-.3,frontFoot:42,backFoot:-42,arm:-.62,elbow:.05,reach:.98,sword:-.72,offArm:-.15,offElbow:.22,cape:.7},
    darkOver:{...base(),crouch:8,hipX:18,torso:.38,frontFoot:68,backFoot:-15,arm:1.0,elbow:.03,reach:1,sword:1.08,offArm:.65,offElbow:.15,cape:-1},
    ghostCoil:{...base(),crouch:50,hipX:-30,torso:-.38,frontFoot:8,backFoot:-72,arm:.05,elbow:.62,reach:.42,sword:.02,offArm:.08,offElbow:.2,cape:.8},
    ghostDrive:{...base(),crouch:7,hipX:30,torso:.5,frontFoot:84,backFoot:-3,backLift:12,arm:-.02,elbow:.01,reach:1,sword:-.01,swordPull:1,offArm:.02,offElbow:.02,cape:-1.25},
    darkJump:{...base(),crouch:2,rootLift:0,frontFoot:18,backFoot:-18,frontLift:25,backLift:30,torso:.15,arm:-1.7,elbow:.08,reach:1,sword:-1.72,offArm:-1.3,offElbow:.1,cape:-.85},
    darkDive:{...base(),crouch:3,frontFoot:28,backFoot:-20,frontLift:18,backLift:20,torso:.48,arm:1.2,elbow:.03,reach:1,sword:1.25,swordPull:1,offArm:.9,offElbow:.15,cape:-1.2},
    darkLand:{...base(),crouch:48,hipX:18,frontFoot:62,backFoot:-45,torso:.5,arm:1.25,elbow:.02,reach:1,sword:1.28,swordPull:1,offArm:.9,offElbow:.2,cape:-1.1},
    ironLoad:{...base(),crouch:38,hipX:-27,torso:-.42,head:-.08,frontFoot:7,backFoot:-86,arm:-1.02,elbow:.52,reach:.56,sword:-1.14,offArm:-.76,offElbow:.34,cape:.4},
    ironSweep:{...base(),crouch:25,hipX:25,torso:.42,frontFoot:70,backFoot:-34,arm:.28,elbow:.06,reach:1,sword:.34,swordPull:.55,offArm:.12,offElbow:.08,cape:-.52},
    peakGather:{...base(),crouch:49,hipX:-18,torso:-.25,head:-.08,frontFoot:11,backFoot:-79,arm:-1.48,elbow:.28,reach:.9,sword:-1.5,swordPull:.2,offArm:-1.2,offElbow:.18,cape:.32},
    peakStrike:{...base(),crouch:30,hipX:22,torso:.48,head:.08,frontFoot:68,backFoot:-42,arm:1.38,elbow:.02,reach:1,sword:1.42,swordPull:.72,offArm:1.12,offElbow:.08,cape:-.7},
    ironWall:{...base(),crouch:44,hipX:-24,torso:-.38,head:-.08,frontFoot:4,backFoot:-78,arm:-.58,elbow:.2,reach:.82,sword:-.56,swordPull:.08,offArm:-.5,offElbow:.18,cape:.16},
    ironDrive:{...base(),crouch:29,hipX:26,torso:.28,head:.05,frontFoot:62,backFoot:-30,backLift:5,arm:-.18,elbow:.08,reach:.94,sword:-.15,swordPull:.28,offArm:-.12,offElbow:.08,cape:-.38},
    ironRecover:{...base(),crouch:35,hipX:-18,torso:-.18,frontFoot:16,backFoot:-72,arm:.72,elbow:.4,reach:.48,sword:.98,offArm:.38,offElbow:.18,cape:.18}
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
    constructor(combat,attacker,target,skill){this.c=combat;this.a=attacker;this.b=target;this.s=skill;this.heavy=!!skill.heavy;this.t=0;this.done=false;this.events=new Set();this.ax=attacker.x;this.ay=attacker.y;this.aside=attacker.side;this.bx=target.x;this.by=target.y;this.guard=target.guard;this.startPoise=target.poise;this.failureReason="";this.responseRule=null;this.outcome=this.resolveOutcome();this.c.showSkillTitle(skill);if(skill.id==="darkFall")this.c.cinematic(true);}
    once(id,fn){if(!this.events.has(id)){this.events.add(id);fn();}}
    resolveOutcome(){
      if(!this.guard||this.s.attackType==="RECOVER")return"hit";
      const rule=this.s.responses?.[this.guard];
      if(!rule)return"hit";
      this.responseRule=rule;
      if(rule.minPoise!=null&&this.startPoise<rule.minPoise){
        this.failureReason=rule.reason||"기세 조건을 충족하지 못했습니다";
        return rule.failureOutcome||"guardFail";
      }
      if(rule.outcome?.includes("Fail"))this.failureReason=rule.reason||"대응이 공격 특성을 이기지 못했습니다";
      return rule.outcome;
    }
    pose(a,b,x,y){this.a.setPose(mix(a,b,ph(this.t,x,y)));}
    clashPose(){return this.s.id==="fallingPeak"?POSES.peakStrike:this.s.id==="ironAdvance"?POSES.ironDrive:this.heavy?POSES.ironSweep:POSES.darkSlash;}
    update(dt){this.t+=dt;(this[this.s.id]||this.darkSlash).call(this,this.t);if(this.t>=this.s.duration)this.finish();}
    impact(opt={}){
      this.b.guard=null;
      if(this.outcome==="parry"){this.parry();return;}
      if(this.outcome==="evade"){this.evade();return;}
      if(this.outcome==="guardFail")this.once("failureCallout",()=>this.c.callout("破防",`반격 실패 · ${this.failureReason}`,"break"));
      if(this.outcome==="evadeFail")this.once("failureCallout",()=>this.c.callout("失步",`회피 실패 · ${this.failureReason}`,"break"));
      const poiseScale=(this.outcome==="guardFail"?1.35:this.outcome==="evadeFail"?1.18:1)*(opt.poiseScale||1);
      this.c.hit(this.a,this.b,this.s,{...opt,poiseScale});
    }
    parry(){
      this.once("parry",()=>{
        this.b.setPose(POSES.guard);this.a.setPose(this.heavy?this.clashPose():{...POSES.darkSlash,sword:-.55,arm:-.47});
        let at=this.a.getSwordTip(),bt=this.b.getSwordTip();this.a.x+=bt.x-at.x;at=this.a.getSwordTip();const clash={x:(at.x+bt.x)/2,y:(at.y+bt.y)/2};
        this.c.hitStop=Math.max(this.c.hitStop,this.heavy?.145:.11);this.c.camera.focusBetween(this.a,this.b,this.heavy?1.2:1.28);this.c.camera.punch(this.aside,this.heavy?18:14);this.c.camera.shake(this.heavy?22:18,this.heavy?.27:.22);this.c.audio.clash();this.c.effects.spark(clash.x,clash.y,"#fff0b2",this.heavy?38:32,this.heavy?1.65:1.4);this.c.effects.shockwave(clash.x,clash.y,"#fff1c4",this.heavy?88:72,this.heavy?.36:.3);this.c.callout("破招","파훼","parry");
        if(this.responseRule?.poiseCost){const cost=this.responseRule.poiseCost;this.b.poise=Math.max(1,this.b.poise-cost);this.c.effects.poise(this.b.x,this.b.y-98,cost,"cost");this.c.game.updateUI();}
        this.c.defer(.2,()=>{this.b.setPose(POSES.counter);this.c.effects.slash(this.a.getTorsoPosition().x,this.a.getTorsoPosition().y,.15,"#dffff6",125,.22);this.c.hit(this.b,this.a,{damage:[430,570],poiseDamage:18},{hitStop:.07,power:.8,knock:95,final:false});});
      });
    }
    evade(){
      this.once("evade",()=>{this.c.effects.afterimage(this.b,.3);this.b.x-=this.b.side*105;this.b.setPose({...POSES.evade,rootLift:9});this.c.audio.dash();this.c.camera.focusBetween(this.a,this.b,1.13);this.c.callout("回避","회피","evade");});
    }
    failedClash(){
      this.once("failedClash",()=>{this.b.setPose(POSES.guard);this.a.setPose(this.heavy?this.clashPose():{...POSES.darkSlash,sword:-.55,arm:-.47});let at=this.a.getSwordTip(),bt=this.b.getSwordTip();this.a.x+=bt.x-at.x;at=this.a.getSwordTip();const clash={x:(at.x+bt.x)/2,y:(at.y+bt.y)/2};this.c.hitStop=Math.max(this.c.hitStop,this.heavy?.12:.085);this.c.camera.focusBetween(this.a,this.b,1.2);this.c.audio.clash();this.c.effects.spark(clash.x,clash.y,"#ffd6b0",this.heavy?28:20,this.heavy?1.35:1.05);this.c.effects.shockwave(clash.x,clash.y,"#ffd0aa",this.heavy?70:52,this.heavy?.3:.24);});
    }
    trackedEvade(){
      this.once("trackedEvade",()=>{this.c.effects.afterimage(this.b,.28);this.c.audio.dash();this.c.camera.focusBetween(this.a,this.b,1.12);});
    }
    darkSlash(t){
      const evadeEnd=this.bx-this.b.side*92;
      if(this.outcome==="evadeFail"){
        if(t<.54){this.b.x=U.lerp(this.bx,evadeEnd,U.ease(ph(t,.22,.54)));this.b.setPose(mix(POSES.guard,POSES.evade,ph(t,.22,.5)));if(t>=.22)this.trackedEvade();}
        else if(t<.73){this.b.x=evadeEnd;this.b.setPose(POSES.evadeCaught);}
        else{this.b.x=U.lerp(evadeEnd,this.bx,U.ease(ph(t,.73,1.01)));this.b.setPose(mix(POSES.evadeCaught,base(),ph(t,.73,1.01)));}
      }
      if(t<.28)this.pose(base(),POSES.darkWind,0,.28);
      else if(t<.58){this.pose(POSES.darkWind,POSES.darkSlash,.28,.58);const targetX=this.outcome==="evadeFail"?evadeEnd:this.bx;this.a.x=U.lerp(this.ax,targetX-this.aside*158,U.ease(ph(t,.28,.58)));this.once("dash",()=>this.c.audio.dash());}
      else if(t<.73)this.a.setPose(POSES.darkSlash);else{this.pose(POSES.darkSlash,base(),.73,1.02);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,.73,1.02)));}
      const hitAt=this.outcome==="evadeFail"?.64:.56;
      if(t>=hitAt)this.once("hit",()=>{if(this.outcome==="hit"||this.outcome.includes("Fail"))this.c.effects.slash(this.b.x,this.b.y-105,.62,"#ffc4b8",120,.22);this.impact({hitStop:.055,power:.75,knock:75});});
    }
    darkChain(t){
      const evadeEnd=this.bx-this.b.side*108,guardEnd=this.bx-this.b.side*46;
      if(this.outcome==="evadeFail"){
        if(t<.48){this.b.x=U.lerp(this.bx,evadeEnd,U.ease(ph(t,.18,.48)));this.b.setPose(mix(POSES.guard,POSES.evade,ph(t,.18,.46)));if(t>=.2)this.trackedEvade();}
        else if(t<1.42){this.b.x=evadeEnd;this.b.setPose(t<.68?POSES.evade:POSES.evadeCaught);}
        else{this.b.x=U.lerp(evadeEnd,this.bx,U.ease(ph(t,1.42,1.68)));this.b.setPose(mix(POSES.evadeCaught,base(),ph(t,1.42,1.68)));}
      }else if(this.outcome==="guardFail"){
        if(t<.48)this.b.setPose(POSES.guard);
        else if(t<1.42){this.b.x=U.lerp(this.bx,guardEnd,U.ease(ph(t,.48,.82)));this.b.setPose(mix(POSES.guard,POSES.overwhelmed,ph(t,.48,.78)));}
        else{this.b.x=U.lerp(guardEnd,this.bx,U.ease(ph(t,1.42,1.68)));this.b.setPose(mix(POSES.overwhelmed,base(),ph(t,1.42,1.68)));}
      }
      if(t<.25)this.pose(base(),POSES.darkWind,0,.25);else if(t<.45){this.pose(POSES.darkWind,POSES.darkSlash,.25,.45);this.a.x=U.lerp(this.ax,this.bx-this.aside*160,U.ease(ph(t,.25,.45)));}
      else if(t<1.35){const q=(t-.45)% .3/.3,idx=Math.floor((t-.45)/.3);this.a.setPose(mix(idx%2?POSES.darkBack:POSES.darkSlash,idx%2?POSES.darkSlash:POSES.darkBack,q));const tracking=this.outcome==="evadeFail"&&t>=.58||this.outcome==="guardFail"&&t>=.48;this.a.x=(tracking?this.b.x:this.bx)-this.aside*(150+(idx%2?18:-12));}
      else{this.pose(POSES.darkOver,base(),1.35,1.72);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,1.35,1.72)));}
      [.48,.79,1.18].forEach((at,i)=>{if(t>=at)this.once("hit"+i,()=>{
        if(i===0){if(["parry","evade"].includes(this.outcome)){this.impact({});return;}if(this.outcome==="guardFail"){this.failedClash();return;}if(this.outcome==="evadeFail"){this.trackedEvade();return;}}
        if(i>0&&["parry","evade"].includes(this.outcome))return;
        this.a.setPose(i===2?POSES.darkOver:i%2?POSES.darkBack:POSES.darkSlash);this.c.effects.slash(this.b.x,this.b.y-105,i===1?-.65:i===2?1.05:.55,"#ffb8ad",105+i*18,.2);this.impact({hitStop:i===2?.075:.035,power:i===2?1.05:.45,knock:i===2?130:25,damageScale:i===2?1.05:.48,poiseScale:i===2?.46:.27,multi:true});
      });});
    }
    ghostThrust(t){
      if(t<.4)this.pose(base(),POSES.ghostCoil,0,.4);
      else if(t<.76){this.pose(POSES.ghostCoil,POSES.ghostDrive,.4,.76);this.a.x=U.lerp(this.ax,this.bx-this.aside*122,U.ease(ph(t,.4,.76)));this.once("dash",()=>{this.c.audio.dash();this.c.effects.dust(this.ax,this.ay,this.aside,15);this.c.effects.afterimage(this.a,.28);});}
      else if(t<.96)this.a.setPose(POSES.ghostDrive);else{this.pose(POSES.ghostDrive,base(),.96,1.36);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,.96,1.36)));}
      if(this.outcome==="guardFail"){
        if(t>=.44&&t<.96){this.b.setPose(mix(POSES.guard,POSES.counterPierced,ph(t,.44,.78)));this.once("breachFocus",()=>this.c.camera.focusBetween(this.a,this.b,1.18));}
        if(t>=.62&&t<.83){this.a.setPose(POSES.ghostDrive);const tip=this.a.getSwordTip(),torso=this.b.getTorsoPosition(),depth=U.lerp(-18,28,ph(t,.62,.8));this.a.x+=torso.x+this.aside*depth-tip.x;}
        if(t>=.96){this.ghostReturnX??=this.b.x;this.b.x=U.lerp(this.ghostReturnX,this.bx,U.ease(ph(t,.96,1.26)));this.b.setPose(mix(POSES.counterPierced,base(),ph(t,.96,1.26)));}
      }
      const hitAt=this.outcome==="guardFail"?.8:.75;
      if(t>=hitAt)this.once("hit",()=>{if(this.outcome!=="evade")this.c.effects.shockwave(this.b.x,this.b.y-105,"#ffb0a5",105,.3);this.impact({hitStop:.095,power:1.35,knock:185,final:true});this.c.camera.punch(this.aside,20);});
    }
    ironSweep(t){
      const evadeEnd=this.bx-this.b.side*96,guardEnd=this.bx-this.b.side*38;
      if(this.outcome==="evadeFail"){
        if(t<.64){this.b.x=U.lerp(this.bx,evadeEnd,U.ease(ph(t,.2,.6)));this.b.setPose(mix(POSES.evade,POSES.evadeCaught,ph(t,.36,.64)));if(t>=.22)this.trackedEvade();}
        else if(t<1.02){this.b.x=evadeEnd;this.b.setPose(POSES.evadeCaught);}else{this.b.x=U.lerp(evadeEnd,this.bx,U.ease(ph(t,1.02,1.42)));this.b.setPose(mix(POSES.evadeCaught,base(),ph(t,1.02,1.42)));}
      }else if(this.outcome==="guardFail"){
        if(t<.72)this.b.setPose(POSES.guard);else if(t<1.03){this.b.x=U.lerp(this.bx,guardEnd,U.ease(ph(t,.72,.92)));this.b.setPose(mix(POSES.guard,POSES.overwhelmed,ph(t,.68,.94)));}else{this.b.x=U.lerp(guardEnd,this.bx,U.ease(ph(t,1.03,1.42)));this.b.setPose(mix(POSES.overwhelmed,base(),ph(t,1.03,1.42)));}
      }
      if(t<.46)this.pose(base(),POSES.ironLoad,0,.46);
      else if(t<.84){this.pose(POSES.ironLoad,POSES.ironSweep,.46,.84);this.a.x=U.lerp(this.ax,(this.outcome==="evadeFail"?evadeEnd:this.bx)-this.aside*142,U.ease(ph(t,.46,.84)));}
      else if(t<1.02)this.a.setPose(POSES.ironSweep);else{this.pose(POSES.ironSweep,base(),1.02,1.45);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,1.02,1.45)));}
      if(t>=.8)this.once("hit",()=>{if(this.outcome==="guardFail")this.failedClash();if(this.outcome!=="parry")this.c.effects.slash(this.b.x,this.b.y-78,.2,"#d8e7df",165,.3);this.impact({hitStop:.12,power:1.25,knock:165,final:true});this.c.camera.shake(18,.22);});
    }
    fallingPeak(t){
      if(this.outcome==="guardFail"){
        if(t<.7)this.b.setPose(POSES.guard);else if(t<1.18)this.b.setPose(mix(POSES.guard,POSES.impactCollapse,ph(t,.7,1.02)));else this.b.setPose(mix(POSES.impactCollapse,base(),ph(t,1.18,1.72)));
      }
      if(t<.62)this.pose(base(),POSES.peakGather,0,.62);
      else if(t<1.02){this.pose(POSES.peakGather,POSES.peakStrike,.62,1.02);this.a.x=U.lerp(this.ax,this.bx-this.aside*108,U.ease(ph(t,.62,1.02)));}
      else if(t<1.2)this.a.setPose(POSES.peakStrike);else{this.pose(POSES.peakStrike,base(),1.2,1.75);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,1.2,1.75)));}
      if(t>=1)this.once("hit",()=>{const groundX=this.bx,groundY=this.by-5;if(this.outcome==="guardFail")this.failedClash();this.c.effects.slash(groundX,groundY-70,1.48,"#dbe8e2",178,.34);this.c.effects.shockwave(groundX,groundY,"#b9c9c3",158,.48);this.c.effects.dust(groundX,groundY,1,22);this.impact({hitStop:.145,power:1.7,knock:210,down:this.outcome!=="evade",final:true});this.c.camera.shake(27,.34);});
    }
    ironAdvance(t){
      const evadeEnd=this.bx-this.b.side*92,crushEnd=this.bx-this.b.side*45;
      if(this.outcome==="evadeFail"){
        if(t<.62){this.b.x=U.lerp(this.bx,evadeEnd,U.ease(ph(t,.22,.52)));this.b.setPose(mix(POSES.evade,POSES.evadeCaught,ph(t,.34,.62)));if(t>=.22)this.trackedEvade();}else if(t<.92){this.b.x=U.lerp(evadeEnd,crushEnd,U.ease(ph(t,.62,.88)));this.b.setPose(POSES.overwhelmed);}else{this.b.x=U.lerp(crushEnd,this.bx,U.ease(ph(t,.92,1.26)));this.b.setPose(mix(POSES.overwhelmed,base(),ph(t,.92,1.26)));}
      }else if(this.outcome==="guardFail"){
        if(t<.62)this.b.setPose(POSES.guard);else if(t<.93){this.b.x=U.lerp(this.bx,crushEnd,U.ease(ph(t,.62,.86)));this.b.setPose(mix(POSES.guard,POSES.impactCollapse,ph(t,.58,.88)));}else{this.b.x=U.lerp(crushEnd,this.bx,U.ease(ph(t,.93,1.26)));this.b.setPose(mix(POSES.impactCollapse,base(),ph(t,.93,1.26)));}
      }
      if(t<.38)this.pose(base(),POSES.ironWall,0,.38);
      else if(t<.72){this.pose(POSES.ironWall,POSES.ironDrive,.38,.72);const target=this.outcome==="evadeFail"?crushEnd:this.bx;this.a.x=U.lerp(this.ax,target-this.aside*126,U.ease(ph(t,.38,.72)));this.once("driveDust",()=>this.c.effects.dust(this.ax,this.ay,this.aside,14));}
      else if(t<.9)this.a.setPose(POSES.ironDrive);else{this.pose(POSES.ironDrive,base(),.9,1.28);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,.9,1.28)));}
      if(t>=.7)this.once("hit",()=>{if(this.outcome==="guardFail")this.failedClash();this.c.effects.shockwave(this.b.x,this.b.y-92,"#b7d4d6",105,.32);this.impact({hitStop:.125,power:1.45,knock:120,final:true});this.c.camera.punch(this.aside,18);});
      if(t>=.84)this.once("pommel",()=>{if(!["parry","evade"].includes(this.outcome))this.c.effects.spark(this.b.x,this.b.y-112,"#a9cbd0",10,.6);});
    }
    ironBreath(t){
      this.a.setPose(t<.3?mix(base(),POSES.ironRecover,ph(t,0,.3)):t<.76?POSES.ironRecover:mix(POSES.ironRecover,base(),ph(t,.76,1.05)));
      if(t>.5)this.once("recover",()=>{this.a.poise=Math.min(this.a.maxPoise,this.a.poise+28);this.c.audio.charge();this.c.effects.dust(this.a.x,this.a.y,this.a.side,8);this.c.game.setMessage("무진이 철산의 중심을 다시 세웁니다",900);this.c.game.updateUI();});
    }
    darkFall(t){
      if(t<.38)this.pose(base(),POSES.darkWind,0,.38);
      else if(t<.95){const q=U.ease(ph(t,.38,.95));this.a.setPose(mix(POSES.darkWind,POSES.darkJump,q));this.a.y=this.ay-360*q;this.a.x=this.ax+this.aside*55*q;this.c.camera.follow(this.a,1.2);}
      else if(t<1.38){this.a.setPose(POSES.darkJump);this.a.y=this.ay-360;this.c.camera.release();this.c.camera.pan(this.bx,this.by-90,1.18);}
      else if(t<1.86){const q=U.ease(ph(t,1.38,1.86));this.a.setPose(mix(POSES.darkJump,POSES.darkDive,q));this.a.x=U.lerp(this.ax+this.aside*55,this.bx-this.aside*15,q);this.a.y=U.lerp(this.ay-360,this.ay,q);}
      else if(t<2.18){this.a.setPose(POSES.darkLand);}else{this.pose(POSES.darkLand,base(),2.18,2.48);this.a.x=U.lerp(this.a.x,this.ax,U.ease(ph(t,2.18,2.48)));}
      if(this.outcome.includes("Fail")){
        const ready=this.guard==="counter"?POSES.guard:POSES.evade;
        if(t>=1.52&&t<2.18){this.b.setPose(mix(ready,POSES.impactCollapse,ph(t,1.52,1.82)));this.once("collapseFocus",()=>this.c.camera.focusBetween(this.a,this.b,1.08));}
        else if(t>=2.18)this.b.setPose(mix(POSES.impactCollapse,base(),ph(t,2.18,2.46)));
      }
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
