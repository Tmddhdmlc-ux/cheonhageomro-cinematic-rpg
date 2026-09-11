(function (W) {
  "use strict";
  const U = W.util;
  const TAU = Math.PI * 2;
  const basePose = () => ({
    crouch: 8, hipX: 0, torso: -.035, head: .02,
    frontFoot: 34, backFoot: -38, frontLift: 0, backLift: 0,
    arm: -.12, elbow: .22, reach: .72, sword: -.08, swordPull: 0,
    offArm: .38, offElbow: -.35, cape: 0, rootLift: 0, twist: 0
  });
  const salpungsePose = () => ({
    ...basePose(),crouch:28,hipX:-14,torso:-.22,head:-.04,
    frontFoot:21,backFoot:-66,arm:-.66,elbow:.32,reach:.88,
    sword:-.4,swordPull:.38,offArm:2.66,offElbow:.14,cape:.52
  });
  const cheolsansePose = () => ({
    ...basePose(),crouch:30,hipX:-17,torso:-.18,head:-.04,
    frontFoot:19,backFoot:-72,arm:.42,elbow:.38,reach:.64,
    sword:.62,swordPull:.08,offArm:.18,offElbow:.24,cape:.22
  });
  const stancePose=stance=>stance==="salpungse"?salpungsePose():stance==="cheolsanse"?cheolsansePose():basePose();
  const mixPose=(a,b,t)=>{const out={};t=U.smooth(U.clamp(t,0,1));for(const key of Object.keys(Object.assign({},a,b)))out[key]=U.lerp(a[key]??0,b[key]??0,t);return out;};
  const openingPose=id=>{
    const poses={
      crossGuard:{...basePose(),crouch:18,hipX:-10,torso:-.16,head:-.02,frontFoot:21,backFoot:-61,arm:-.48,elbow:.42,reach:.72,sword:-.42,swordPull:.18,offArm:2.42,offElbow:.22,cape:.32},
      needlePoint:{...basePose(),crouch:14,hipX:8,torso:.13,head:.01,frontFoot:27,backFoot:-31,arm:-.04,elbow:.08,reach:.94,sword:-.01,swordPull:.35,offArm:.2,offElbow:.06,cape:-.18},
      flowingShadow:{...basePose(),crouch:31,hipX:-18,torso:-.24,head:-.07,frontFoot:48,backFoot:-69,arm:.34,elbow:.34,reach:.68,sword:.58,offArm:2.72,offElbow:.18,cape:.68},
      emptyGate:{...salpungsePose(),crouch:23,hipX:-12,torso:-.29,head:-.05,frontFoot:17,backFoot:-68,arm:-1.05,elbow:.5,reach:.56,sword:-1.18,swordPull:.12,offArm:-.42,offElbow:.42,cape:.58},
      openGate:{...basePose(),crouch:11,hipX:-3,torso:.15,head:.06,frontFoot:39,backFoot:-43,arm:.72,elbow:.44,reach:.55,sword:.9,offArm:2.24,offElbow:.35,cape:.12},
      ultimateCharge:{...salpungsePose(),crouch:39,hipX:-21,torso:-.34,head:-.1,frontFoot:15,backFoot:-73,arm:-.86,elbow:.46,reach:.72,sword:-.65,swordPull:.3,offArm:2.85,offElbow:.24,cape:.76},
      middleGateSweep:{...cheolsansePose(),crouch:34,hipX:-22,torso:-.28,frontFoot:12,backFoot:-78,arm:-.38,elbow:.5,reach:.7,sword:-.42,offArm:-.18,offElbow:.32,cape:.38},
      raisedSaber:{...cheolsansePose(),crouch:38,hipX:-20,torso:-.2,frontFoot:16,backFoot:-75,arm:-1.02,elbow:.34,reach:.86,sword:-1.08,swordPull:.18,offArm:-.72,offElbow:.25,cape:.3},
      ironWallClose:{...cheolsansePose(),crouch:40,hipX:-24,torso:-.34,frontFoot:8,backFoot:-76,arm:-.58,elbow:.24,reach:.78,sword:-.55,swordPull:.05,offArm:-.46,offElbow:.14,cape:.2},
      hiddenSaber:{...cheolsansePose(),crouch:43,hipX:-27,torso:-.31,frontFoot:7,backFoot:-84,arm:-.86,elbow:.44,reach:.58,sword:-.91,swordPull:.05,offArm:-.58,offElbow:.28,cape:.28}
    };
    return poses[id]||basePose();
  };

  class Character {
    constructor(data, x, y) {
      Object.assign(this, JSON.parse(JSON.stringify(data)));
      this.hp=this.maxHp; this.mp=this.maxMp; this.x=x; this.y=y; this.baseX=x; this.baseY=y;
      this.poise=this.maxPoise;this.broken=false;this.breakPending=false;this.guard=null;this.stance=this.idleStance||null;
      this.pose=basePose(); this.poseOverride=null; this.time=Math.random()*4; this.hitTime=0; this.hitPower=0; this.knock=0; this.down=0;this.deadTime=0;this.alpha=1;
      this.openingId=null;this.openingFrom=stancePose(this.stance);this.openingBlend=1;this.openingReactTime=0;this.combatBusy=false;
    }
    reset() { this.hp=this.maxHp; this.mp=this.maxMp;this.poise=this.maxPoise;this.broken=false;this.breakPending=false;this.guard=null;this.stance=this.idleStance||null;this.x=this.baseX; this.y=this.baseY; this.poseOverride=null; this.hitTime=0; this.knock=0; this.down=0;this.deadTime=0;this.alpha=1;this.openingId=null;this.openingFrom=stancePose(this.stance);this.openingBlend=1;this.openingReactTime=0;this.combatBusy=false; }
    setPose(p) { this.poseOverride=Object.assign(basePose(),p||{}); }
    clearPose() { this.poseOverride=null; }
    setOpening(opening) { const next=opening?.id||null;if(next===this.openingId)return;this.openingFrom=this.openingId?openingPose(this.openingId):stancePose(this.stance);this.openingId=next;this.openingBlend=0; }
    reactOpening(){this.openingReactTime=.18;}
    canUseOpeningPose(){return !!this.openingId&&!this.combatBusy&&!this.poseOverride&&!this.broken&&this.hp>0&&this.down<=0&&this.hitTime<=0;}
    react(power=1, knock=0, down=false) { this.hitTime=.24+power*.08; this.hitPower=power; this.knock+=knock; if(down)this.down=Math.max(this.down,1.35); }
    update(dt, busy=false, combatBusy=busy) {
      this.time+=dt;
      this.combatBusy=combatBusy;this.openingBlend=Math.min(1,this.openingBlend+dt/.22);this.openingReactTime=Math.max(0,this.openingReactTime-dt);
      if(this.hitTime>0)this.hitTime=Math.max(0,this.hitTime-dt);
      if(this.hp<=0)this.deadTime+=dt;else if(this.down>0)this.down=Math.max(0,this.down-dt);
      if(Math.abs(this.knock)>.1){this.x+=this.knock*dt;this.knock*=Math.pow(.045,dt);} else this.knock=0;
      if(!busy && !this.poseOverride) this.x=U.lerp(this.x,this.baseX,1-Math.pow(.025,dt));
    }
    currentPose() {
      const phaseIdle=!!this.stance&&!this.broken&&this.hp>0&&this.down<=0&&this.hitTime<=0;
      const baseIdle=phaseIdle?stancePose(this.stance):basePose();
      const idle=this.canUseOpeningPose()?mixPose(this.openingFrom,openingPose(this.openingId),this.openingBlend):baseIdle, breath=Math.sin(this.time*2.15), shift=Math.sin(this.time*.83+1.4);
      idle.crouch+=breath*2.2; idle.torso+=breath*.012+shift*.009; idle.sword+=Math.sin(this.time*1.7)*.012; idle.frontFoot+=Math.sin(this.time*.7)*1.5; idle.cape=Math.sin(this.time*1.2)*.12;
      const poiseRatio=this.poise/this.maxPoise,hpRatio=this.hp/this.maxHp;
      if(poiseRatio<.7){const strain=(.7-poiseRatio)/.7;idle.crouch+=strain*7;idle.torso-=strain*.055;idle.sword+=Math.sin(this.time*3.3)*.025*strain;idle.cape+=Math.sin(this.time*2.6)*.08*strain;}
      if(poiseRatio<.3){const strain=(.3-poiseRatio)/.3;idle.crouch+=strain*8;idle.hipX-=strain*5;idle.head+=Math.sin(this.time*3.8)*.035*strain;}
      if(hpRatio<.25){idle.crouch+=5;idle.torso-=.045;idle.arm+=.06;}
      if(this.broken&&!this.poseOverride){idle.crouch+=22;idle.torso-=.25;idle.arm+=.45;idle.sword+=.55;idle.frontFoot-=9;}
      const p=this.poseOverride||idle;
      const out=Object.assign({},p);
      if(this.openingReactTime>0&&!this.poseOverride){const q=Math.sin((this.openingReactTime/.18)*Math.PI);out.crouch+=5*q;out.hipX-=6*q;out.torso-=.11*q;out.arm+=.16*q;out.sword+=.22*q;out.frontFoot-=4*q;}
      if(this.hitTime>0){const q=this.hitTime/.5;out.torso-=this.hitPower*.14*Math.sin(q*Math.PI);out.head-=this.hitPower*.17*Math.sin(q*Math.PI);out.arm-=.18;}
      return out;
    }
    anatomy(pose=this.currentPose()){
      const p=pose,upper=this.bodyScale||1,hip={x:p.hipX,y:-94+p.crouch-p.rootLift},torsoA=p.torso;
      const shoulder={x:hip.x+Math.sin(-torsoA)*8+Math.sin(torsoA)*-72,y:hip.y-Math.cos(torsoA)*72};
      const neck={x:shoulder.x+3,y:shoulder.y-4},head={x:neck.x+Math.sin(p.head)*10,y:neck.y-24};
      const sh={x:shoulder.x+8*upper,y:shoulder.y+9},armAngle=p.arm;
      const el={x:sh.x+Math.cos(armAngle)*43,y:sh.y+Math.sin(armAngle)*43};
      const handAngle=armAngle+p.elbow*(1-p.reach*.6);
      const hand={x:el.x+Math.cos(handAngle)*(38+20*p.reach),y:el.y+Math.sin(handAngle)*(38+20*p.reach)};
      const weaponLength=this.weaponStyle==="heavySaber"?90:102,tip={x:hand.x+Math.cos(p.sword)*(weaponLength+p.swordPull*16),y:hand.y+Math.sin(p.sword)*(weaponLength+p.swordPull*16)};
      const world=q=>({x:this.x+this.side*q.x,y:this.y+q.y});
      return{hip:world(hip),torso:world({x:(hip.x+shoulder.x)/2,y:(hip.y+shoulder.y)/2}),shoulder:world(shoulder),hand:world(hand),head:world(head),swordTip:world(tip)};
    }
    getSwordTip(){return this.anatomy().swordTip;}
    getHandPosition(){return this.anatomy().hand;}
    getHeadPosition(){return this.anatomy().head;}
    getTorsoPosition(){return this.anatomy().torso;}
    snapshot(){return{x:this.x,y:this.y,side:this.side,color:this.color,darkColor:this.darkColor,accent:this.accent,weaponStyle:this.weaponStyle,bodyScale:this.bodyScale||1,pose:Object.assign({},this.currentPose()),alpha:this.alpha,down:this.down,deadTime:this.deadTime};}
    draw(ctx){Character.drawSnapshot(ctx,this.snapshot(),false);}

    static limb(ctx,a,b,w1,w2,color,edge){
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
      ctx.fillStyle=color;ctx.strokeStyle=edge;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a.x+nx*w1,a.y+ny*w1);ctx.lineTo(b.x+nx*w2,b.y+ny*w2);ctx.lineTo(b.x-nx*w2,b.y-ny*w2);ctx.lineTo(a.x-nx*w1,a.y-ny*w1);ctx.closePath();ctx.fill();ctx.stroke();
    }
    static ik(hip,foot,l1,l2,bend=1){
      const dx=foot.x-hip.x,dy=foot.y-hip.y,d=U.clamp(Math.hypot(dx,dy),10,l1+l2-1),a=Math.atan2(dy,dx),c=Math.acos(U.clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
      return{x:hip.x+Math.cos(a-bend*c)*l1,y:hip.y+Math.sin(a-bend*c)*l1};
    }
    static drawSnapshot(ctx,s,ghost){
      const p=s.pose, hit=s.deadTime>0?U.clamp((s.deadTime-.5)/.35,0,1):(s.down>0?Math.min(1,s.down*2):0);
      ctx.save();ctx.globalAlpha*=s.alpha;ctx.translate(s.x,s.y);ctx.scale(s.side,1);
      if(hit){ctx.translate(12*hit,-6*hit);ctx.rotate(-1.25*hit);ctx.translate(0,50*hit);}
      const edge=ghost?s.accent:"#091012", cloth=ghost?s.accent:s.color, dark=ghost?s.accent:(s.darkColor||"#243033"), accent=s.accent,upper=s.bodyScale||1;
      const hip={x:p.hipX,y:-94+p.crouch-p.rootLift};
      const fFoot={x:p.frontFoot,y:-p.frontLift}, bFoot={x:p.backFoot,y:-p.backLift};
      const fk=Character.ik(hip,fFoot,48,50,-1),bk=Character.ik({x:hip.x-5,y:hip.y+1},bFoot,49,49,1);

      // Grounded feet and legs make the weight transfer readable.
      Character.limb(ctx,{x:hip.x-5,y:hip.y+2},bk,11,8,dark,edge);Character.limb(ctx,bk,bFoot,9,6,cloth,edge);
      ctx.fillStyle="#11191a";ctx.strokeStyle=edge;ctx.lineWidth=1.2;ctx.beginPath();ctx.roundRect(bFoot.x-10,bFoot.y-5,34,9,3);ctx.fill();ctx.stroke();
      Character.limb(ctx,hip,fk,12,8,cloth,edge);Character.limb(ctx,fk,fFoot,9,6,cloth,edge);
      ctx.beginPath();ctx.roundRect(fFoot.x-10,fFoot.y-5,35,9,3);ctx.fill();ctx.stroke();

      const torsoA=p.torso, shoulder={x:hip.x+Math.sin(-torsoA)*8+Math.sin(torsoA)*-72,y:hip.y-Math.cos(torsoA)*72};
      const neck={x:shoulder.x+3,y:shoulder.y-4}, head={x:neck.x+Math.sin(p.head)*10,y:neck.y-24};

      // trailing robe/cape
      ctx.fillStyle=ghost?accent:"#182628";ctx.strokeStyle=edge;ctx.beginPath();ctx.moveTo(hip.x-15,hip.y-36);ctx.quadraticCurveTo(-45-p.cape*25,-67,-66-p.cape*35,-28);ctx.quadraticCurveTo(-28,-44,hip.x+8,hip.y+5);ctx.closePath();ctx.fill();ctx.stroke();
      // split lower robe
      ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(hip.x-19*upper,hip.y-20);ctx.lineTo(hip.x+18*upper,hip.y-20);ctx.lineTo(hip.x+31*upper,-37);ctx.lineTo(hip.x+4,-48);ctx.lineTo(hip.x-30*upper,-35);ctx.closePath();ctx.fill();ctx.stroke();
      // torso with twist
      ctx.save();ctx.translate(hip.x,hip.y);ctx.rotate(torsoA);ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(-20*upper,2);ctx.lineTo(20*upper,0);ctx.lineTo(25*upper,-61);ctx.lineTo(-20*upper,-67);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle=accent;ctx.globalAlpha*=.75;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-14,-54);ctx.lineTo(19,-17);ctx.stroke();ctx.restore();

      // rear arm first
      const rearShoulder={x:shoulder.x-8*upper,y:shoulder.y+12};
      const ra=p.offArm, re={x:rearShoulder.x+Math.cos(ra)*38,y:rearShoulder.y+Math.sin(ra)*38}, rh={x:re.x+Math.cos(ra+p.offElbow)*37,y:re.y+Math.sin(ra+p.offElbow)*37};
      Character.limb(ctx,rearShoulder,re,8*upper,6.5,dark,edge);Character.limb(ctx,re,rh,6.5,4,dark,edge);

      const sh={x:shoulder.x+8*upper,y:shoulder.y+9}, armAngle=p.arm;
      const el={x:sh.x+Math.cos(armAngle)*43,y:sh.y+Math.sin(armAngle)*43};
      const handAngle=armAngle+p.elbow*(1-p.reach*.6);
      const hand={x:el.x+Math.cos(handAngle)*(38+20*p.reach),y:el.y+Math.sin(handAngle)*(38+20*p.reach)};
      Character.limb(ctx,sh,el,9*upper,6.5,cloth,edge);Character.limb(ctx,el,hand,7,4,cloth,edge);
      ctx.fillStyle=ghost?accent:"#c8b89b";ctx.beginPath();ctx.arc(hand.x,hand.y,5,0,TAU);ctx.fill();

      // Every weapon is coupled to the live hand and shares the collision tip API.
      const sa=p.sword,weaponLength=s.weaponStyle==="heavySaber"?90:102,pom={x:hand.x-Math.cos(sa)*13,y:hand.y-Math.sin(sa)*13}, tip={x:hand.x+Math.cos(sa)*(weaponLength+p.swordPull*16),y:hand.y+Math.sin(sa)*(weaponLength+p.swordPull*16)};
      ctx.shadowColor=accent;ctx.shadowBlur=ghost?14:5;
      if(s.weaponStyle==="heavySaber"){
        const nx=-Math.sin(sa),ny=Math.cos(sa),bladeStart={x:hand.x+Math.cos(sa)*10,y:hand.y+Math.sin(sa)*10},wide=ghost?7:10;
        ctx.fillStyle=ghost?accent:"#303a3d";ctx.strokeStyle=ghost?accent:"#0b1113";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bladeStart.x+nx*wide,bladeStart.y+ny*wide);ctx.lineTo(tip.x+nx*3,tip.y+ny*3);ctx.lineTo(tip.x,tip.y);ctx.lineTo(bladeStart.x-nx*(wide*.65),bladeStart.y-ny*(wide*.65));ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle=ghost?accent:"#c7e3e5";ctx.lineWidth=ghost?3:2.4;ctx.beginPath();ctx.moveTo(bladeStart.x-nx*(wide*.45),bladeStart.y-ny*(wide*.45));ctx.lineTo(tip.x,tip.y);ctx.stroke();
      }else{
        ctx.strokeStyle=ghost?accent:"#e9f2ec";ctx.lineWidth=ghost?5:4;ctx.beginPath();ctx.moveTo(pom.x,pom.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
      }
      ctx.shadowBlur=0;
      ctx.strokeStyle="#aa8b50";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(hand.x-Math.sin(sa)*10,hand.y+Math.cos(sa)*10);ctx.lineTo(hand.x+Math.sin(sa)*10,hand.y-Math.cos(sa)*10);ctx.stroke();

      // head, topknot, loose hair
      ctx.fillStyle=ghost?accent:"#d0bea0";ctx.strokeStyle=edge;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(head.x,head.y,14,18,p.head,0,TAU);ctx.fill();ctx.stroke();
      ctx.fillStyle=ghost?accent:"#101719";ctx.beginPath();ctx.arc(head.x-3,head.y-9,14,Math.PI,TAU);ctx.quadraticCurveTo(head.x-17,head.y+20,head.x-23-p.cape*8,head.y+43);ctx.lineTo(head.x-5,head.y+17);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.arc(head.x-4,head.y-23,7,0,TAU);ctx.fill();
      ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(head.x+8,head.y-1);ctx.lineTo(head.x+13,head.y);ctx.stroke();

      if(!ghost){ctx.globalAlpha=.35;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(0,5,62,10,0,0,TAU);ctx.fill();}
      ctx.restore();
    }
  }
  W.Character=Character; W.basePose=basePose;W.cheolsansePose=cheolsansePose;
})(window.Wuxia);
