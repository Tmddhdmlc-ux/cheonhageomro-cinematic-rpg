(function (W) {
  "use strict";
  const U=W.util;
  function mix(a,b,t){const o={};for(const k of Object.keys(Object.assign({},a,b)))o[k]=U.lerp(a[k]??0,b[k]??0,U.smooth(U.clamp(t,0,1)));return o;}
  function phase(t,a,b){return U.clamp((t-a)/(b-a),0,1);}

  const P={
    idle: W.basePose(),
    basicWind:{crouch:16,hipX:-9,torso:-.13,frontFoot:25,backFoot:-50,arm:-1.05,elbow:.65,reach:.45,sword:-1.18,offArm:-.25,offElbow:.5,cape:.2},
    basicHit:{crouch:5,hipX:15,torso:.18,frontFoot:57,backFoot:-28,arm:.08,elbow:.03,reach:1,sword:.13,offArm:.12,offElbow:.15,cape:-.4},
    basicChainWind:{crouch:22,hipX:-16,torso:-.3,frontFoot:38,backFoot:-54,arm:.82,elbow:.22,reach:.72,sword:.9,offArm:-.4,offElbow:.28,cape:.62},
    basicChainHit:{crouch:8,hipX:19,torso:.29,frontFoot:66,backFoot:-22,backLift:5,arm:-.48,elbow:.03,reach:1,sword:-.56,offArm:.22,offElbow:.08,cape:-.72},
    meteorCharge:{crouch:31,hipX:-15,torso:-.2,frontFoot:24,backFoot:-58,arm:2.8,elbow:.35,reach:.48,sword:3.02,offArm:2.55,offElbow:.2,cape:.5},
    meteorDash:{crouch:13,hipX:18,torso:.38,frontFoot:72,backFoot:-15,backLift:14,arm:-.05,elbow:.02,reach:1,sword:-.04,swordPull:1,offArm:.1,offElbow:.05,cape:-.9},
    plumReady:{crouch:26,hipX:-10,torso:-.22,frontFoot:21,backFoot:-58,arm:-1.45,elbow:.55,reach:.55,sword:-1.58,offArm:-.8,offElbow:.4,cape:.45},
    plumCutA:{crouch:10,hipX:12,torso:.23,frontFoot:55,backFoot:-23,arm:-.38,elbow:.02,reach:1,sword:-.45,offArm:.18,offElbow:.12,cape:-.65},
    plumCutB:{crouch:8,hipX:4,torso:-.18,frontFoot:47,backFoot:-34,arm:.62,elbow:.08,reach:.96,sword:.72,offArm:-.1,offElbow:.3,cape:.55},
    thrustAim:{crouch:13,hipX:-4,torso:-.06,frontFoot:30,frontLift:17,backFoot:-48,arm:-.03,elbow:.25,reach:.7,sword:-.02,offArm:.02,offElbow:.1,cape:.15},
    thrustCoil:{crouch:45,hipX:-24,torso:-.3,frontFoot:18,frontLift:2,backFoot:-65,arm:-.03,elbow:.5,reach:.5,sword:-.02,offArm:.06,offElbow:.16,cape:.55},
    thrustDrive:{crouch:8,hipX:25,torso:.38,frontFoot:78,backFoot:-8,backLift:10,arm:-.015,elbow:.01,reach:1,sword:-.01,swordPull:1,offArm:.02,offElbow:.02,cape:-1.1},
    thunderCharge:{crouch:19,hipX:-4,torso:-.08,frontFoot:30,backFoot:-48,arm:-1.5,elbow:.08,reach:.9,sword:-1.57,offArm:-1.4,offElbow:.12,cape:.35},
    jump:{crouch:3,hipX:7,torso:.08,frontFoot:18,backFoot:-18,frontLift:24,backLift:29,arm:-1.5,elbow:.05,reach:1,sword:-1.57,offArm:-1.4,offElbow:.1,cape:-.7},
    dive:{crouch:4,hipX:16,torso:.42,frontFoot:25,backFoot:-22,frontLift:16,backLift:22,arm:1.08,elbow:.04,reach:1,sword:1.08,swordPull:1,offArm:1.1,offElbow:.1,cape:-1.2},
    land:{crouch:47,hipX:12,torso:.44,frontFoot:54,backFoot:-42,arm:1.16,elbow:.02,reach:1,sword:1.16,swordPull:1,offArm:.9,offElbow:.2,cape:-1}
  };

  class SkillRunner{
    constructor(combat,attacker,target,skill){this.c=combat;this.a=attacker;this.b=target;this.s=skill;this.t=0;this.done=false;this.events=new Set();this.ax=attacker.x;this.ay=attacker.y;this.aside=attacker.side;this.bx=target.x;this.by=target.y;const active=target===combat.enemy&&target.hp>0&&!target.broken&&!!combat.opening;this.opening=W.evaluateOpening(combat.opening,skill.attackType,active);this.chain=skill.id==="basic"&&combat.planBasicChain?combat.planBasicChain(this.opening):{triggered:false,initiative:false,critBonus:0,reason:"연격 25%"};this.duration=this.chain.triggered?W.BASIC_CHAIN.duration:skill.duration;this.setup();}
    once(id,fn){if(!this.events.has(id)){this.events.add(id);fn();}}
    setup(){
      this.a.clearPose();
      if(["plum","heaven","thunder"].includes(this.s.id))this.c.showSkillTitle(this.s);
      if(this.s.id==="plum")this.c.camera.pan(this.ax,this.ay-105,1.14);
      if(this.s.id==="thunder"){this.c.cinematic(true);this.c.camera.pan(this.ax,this.ay-120,1.42);this.c.audio.charge();}
    }
    update(dt){this.t+=dt;const fn=this[this.s.id]||this.basic;fn.call(this,this.t);if(!this.done&&this.t>=this.duration)this.finish();}
    fxHit(opts={}){this.c.hit(this.a,this.b,this.s,{...opts,openingSnapshot:this.opening});}
    poseSegment(a,b,x,y){this.a.setPose(mix(a,b,phase(this.t,x,y)));}
    basic(t){
      if(t<.14)this.poseSegment(P.idle,P.basicWind,0,.14);
      else if(t<.31){this.poseSegment(P.basicWind,P.basicHit,.14,.31);this.a.x=U.lerp(this.ax,this.bx-this.aside*165,U.ease(phase(t,.14,.31)));this.once("dash",()=>{this.c.audio.dash();this.c.effects.dust(this.ax,this.ay,this.aside,6);});}
      else if(!this.chain.triggered&&t<.45)this.poseSegment(P.basicHit,Object.assign({},P.basicHit,{torso:.28,sword:.3,frontFoot:64}),.31,.45);
      else if(!this.chain.triggered){this.poseSegment(P.basicHit,P.idle,.45,.72);this.a.x=U.lerp(this.a.x,this.ax,U.ease(phase(t,.45,.72)));}
      else if(t<.48)this.poseSegment(P.basicHit,P.basicChainWind,.31,.48);
      else if(t<.7){this.poseSegment(P.basicChainWind,P.basicChainHit,.48,.7);this.a.x=U.lerp(this.a.x,this.bx-this.aside*145,U.ease(phase(t,.48,.7)));}
      else if(t<.8)this.a.setPose(P.basicChainHit);
      else{this.poseSegment(P.basicChainHit,P.idle,.8,W.BASIC_CHAIN.duration);this.a.x=U.lerp(this.a.x,this.ax,U.ease(phase(t,.8,W.BASIC_CHAIN.duration)));}
      if(t>=.29)this.once("hit",()=>{this.c.effects.slash(this.b.x,this.b.y-103,.12,"#d9fff5",115,.2);this.fxHit({hitStop:.055,power:.75,knock:70});if(this.b.hp<=0)this.finish();});
      if(!this.done&&this.chain.triggered&&t>=.69)this.once("chainHit",()=>{this.c.game.setMessage(this.chain.initiative?"先機連斬":"연격",620);this.c.effects.slash(this.b.x,this.b.y-105,-.48,"#c9f5ed",92,.18);this.fxHit({hitStop:.052,power:.68,knock:55,damageScale:W.BASIC_CHAIN.damageScale,poiseScale:W.BASIC_CHAIN.poiseScale,critChance:Math.min(1,this.a.crit+this.chain.critBonus),multi:true});});
    }
    meteor(t){
      if(t<.2)this.poseSegment(P.idle,P.meteorCharge,0,.2);
      else if(t<.38){this.a.setPose(P.meteorCharge);this.once("charge",()=>this.c.audio.charge());}
      else if(t<.68){this.poseSegment(P.meteorCharge,P.meteorDash,.38,.55);const q=U.ease(phase(t,.38,.68));this.a.x=U.lerp(this.ax,this.bx+this.aside*145,q);if(t>.43)this.once("after1",()=>this.c.effects.afterimage(this.a,.3));if(t>.5)this.once("after2",()=>this.c.effects.afterimage(this.a,.24));if(t>.57)this.once("after3",()=>this.c.effects.afterimage(this.a,.18));this.once("dash",()=>{this.c.audio.dash();this.c.effects.dust(this.ax,this.ay,this.aside,12);});}
      else if(t<1.05){this.a.setPose(P.meteorDash);}
      else {this.poseSegment(P.meteorDash,P.idle,1.05,1.55);this.a.x=U.lerp(this.a.x,this.ax,U.ease(phase(t,1.13,1.55)));}
      if(t>=.87)this.once("scar",()=>{this.c.effects.slash(this.b.x,this.b.y-102,-.74,"#efffff",185,.38);this.c.effects.shockwave(this.b.x,this.b.y-100,"#9df4e8",100,.38);this.fxHit({hitStop:.09,power:1.2,knock:125,final:true});this.c.camera.shake(14,.18);});
    }
    plum(t){
      if(t<.42)this.poseSegment(P.idle,P.plumReady,0,.42);
      else if(t<.65){this.poseSegment(P.plumReady,P.plumCutA,.42,.65);this.a.x=U.lerp(this.ax,this.bx-this.aside*145,U.ease(phase(t,.42,.65)));this.once("dash",()=>this.c.audio.dash());}
      else if(t<1.9){
        const cuts=[.68,.87,1.06,1.25,1.44,1.63,1.82];let idx=0;while(idx<cuts.length&&t>=cuts[idx]){const i=idx;this.once("cut"+i,()=>{const angles=[-.55,.62,-.18,.9,-.82,.35,-.32];this.c.effects.slash(this.b.x+U.rand(-25,25),this.b.y-105+U.rand(-28,28),angles[i],i===6?"#ffd9e1":"#dffff4",105+i*4,.18);this.fxHit({hitStop:.035,power:.35,knock:12,multi:true,damageScale:.36,poiseScale:.07});this.c.effects.petal(this.b.x,this.b.y-100,2);});idx++;}
        const slice=Math.floor((t-.65)/.18), local=((t-.65)%.18)/.18;this.a.setPose(mix(slice%2?P.plumCutB:P.plumCutA,slice%2?P.plumCutA:P.plumCutB,local));
        const offsets=[-145,120,-110,105,-130,90,-155];const oi=Math.min(offsets.length-1,Math.floor((t-.65)/.18));this.a.x=this.bx+this.aside*offsets[oi];this.a.y=this.ay-Math.sin(local*Math.PI)*18;this.a.side=this.a.x<this.b.x?1:-1;
      } else if(t<2.12){this.a.setPose(P.plumReady);this.a.x=this.bx-this.aside*155;this.a.y=this.ay;this.a.side=this.aside;}
      else if(t<2.32){this.poseSegment(P.plumReady,Object.assign({},P.basicHit,{sword:.08,arm:.03,reach:1}),2.12,2.32);this.a.x=U.lerp(this.bx-this.aside*155,this.bx-this.aside*118,U.ease(phase(t,2.12,2.32)));}
      else {this.poseSegment(P.basicHit,P.idle,2.32,2.62);this.a.x=U.lerp(this.a.x,this.ax,U.ease(phase(t,2.32,2.62)));}
      if(t>=2.28)this.once("final",()=>{this.c.flash();this.c.effects.slash(this.b.x,this.b.y-112,.05,"#fff1f5",240,.42);this.c.effects.shockwave(this.b.x,this.b.y-95,"#f5a9ba",145,.5);this.c.effects.petal(this.b.x,this.b.y-100,18);this.fxHit({hitStop:.115,power:1.5,knock:235,final:true,damageScale:2.15,poiseScale:.51});this.c.camera.shake(25,.28);});
    }
    heaven(t){
      // Deliberately readable whole-body chain: aim → lift → coil → rear-foot drive → full extension.
      if(t<.2)this.poseSegment(P.idle,P.thrustAim,0,.2);
      else if(t<.5)this.poseSegment(P.thrustAim,P.thrustCoil,.2,.5);
      else if(t<.82){const q=U.ease(phase(t,.5,.82));this.poseSegment(P.thrustCoil,P.thrustDrive,.5,.82);this.a.x=U.lerp(this.ax,this.bx-this.aside*137,q);this.once("launch",()=>{this.c.audio.dash();this.c.effects.dust(this.ax-this.aside*25,this.ay,this.aside,16);this.c.camera.follow(this.a,1.18);});if(t>.59)this.once("after",()=>this.c.effects.afterimage(this.a,.24));}
      else if(t<1.08){this.a.setPose(P.thrustDrive);this.a.x=U.lerp(this.a.x,this.bx-this.aside*116,U.ease(phase(t,.82,1.08))*.45);}
      else {this.poseSegment(P.thrustDrive,P.idle,1.08,1.76);this.a.x=U.lerp(this.a.x,this.ax,U.ease(phase(t,1.19,1.76)));}
      if(t>=.795)this.once("hit",()=>{this.c.effects.shockwave(this.b.x-this.aside*20,this.b.y-105,"#dffffb",145,.42);this.c.effects.slash(this.b.x-this.aside*15,this.b.y-103,0,"#eaffff",135,.25);this.fxHit({hitStop:.12,power:1.7,knock:285,final:true});this.c.camera.shake(22,.24);});
      if(t>=1.16)this.once("release",()=>{this.c.camera.release();this.c.camera.reset();});
    }
    thunder(t){
      if(t<.65){this.poseSegment(P.idle,P.thunderCharge,0,.55);if(t>.18)this.once("bolt1",()=>this.c.effects.lightning(this.a.x-20,this.a.y-220,this.a.x+15,this.a.y-105,.35));if(t>.4)this.once("bolt2",()=>this.c.effects.lightning(this.a.x+40,this.a.y-250,this.a.x+5,this.a.y-130,.3));}
      else if(t<1.38){const q=U.ease(phase(t,.65,1.38));this.poseSegment(P.thunderCharge,P.jump,.65,.86);this.a.y=this.ay-U.lerp(0,470,q);this.a.x=this.ax+this.aside*70*q;this.c.camera.follow(this.a,1.25);this.once("jump",()=>{this.c.audio.dash();this.c.effects.dust(this.ax,this.ay,this.aside,20);});}
      else if(t<2.03){this.a.setPose(P.jump);this.a.y=this.ay-470;this.c.camera.release();this.c.camera.pan(this.bx,this.by-105,1.22);if(t>1.62)this.once("thunder",()=>this.c.audio.thunder());}
      else if(t<2.55){const finisher=this.b.broken;if(finisher&&t>2.22)this.c.cinematicRate=.38;const q=U.ease(phase(t,2.03,2.55));this.a.setPose(mix(P.jump,P.dive,q));this.a.x=U.lerp(this.ax+this.aside*70,this.bx-this.aside*20,q);this.a.y=U.lerp(this.ay-470,this.ay-8,q);if(t>2.12)this.once("trail",()=>this.c.effects.lightning(this.a.x,this.a.y-210,this.bx,this.by-40,.45));}
      else if(t<3.15){this.a.setPose(P.land);this.a.x=this.bx-this.aside*20;this.a.y=this.ay;}
      else {this.poseSegment(P.land,P.idle,3.15,3.75);this.a.x=U.lerp(this.a.x,this.ax,U.ease(phase(t,3.15,3.75)));this.c.camera.reset();}
      if(t>=2.54)this.once("impact",()=>{const finisher=this.b.broken;this.c.cinematicRate=1;this.c.flash();this.c.audio.thunder();this.c.effects.shockwave(this.b.x,this.by-12,"#d6fbff",finisher?380:310,.8);this.c.effects.shockwave(this.b.x,this.by-14,"#84def5",finisher?230:190,.55);for(let i=0;i<(finisher?8:5);i++)this.c.effects.lightning(this.b.x+U.rand(-150,150),this.by-U.rand(180,330),this.b.x+U.rand(-55,55),this.by-15,.24);this.c.effects.spark(this.b.x,this.by-50,"#c9f9ff",finisher?48:35,1.6);this.fxHit({hitStop:finisher?.16:.155,power:finisher?2.65:2.25,knock:finisher?430:370,down:true,final:true,delayNumber:finisher?.22:0});this.c.camera.shake(finisher?46:38,.48);});
    }
    finish(){if(this.done)return;this.done=true;this.c.cinematicRate=1;this.a.x=this.ax;this.a.y=this.ay;this.a.side=this.aside;this.a.clearPose();this.c.camera.release();this.c.camera.reset();this.c.cinematic(false);this.c.skillFinished(this);}
  }
  W.SkillRunner=SkillRunner;
})(window.Wuxia);
