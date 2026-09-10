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

  class Character {
    constructor(data, x, y) {
      Object.assign(this, JSON.parse(JSON.stringify(data)));
      this.hp=this.maxHp; this.mp=this.maxMp; this.x=x; this.y=y; this.baseX=x; this.baseY=y;
      this.pose=basePose(); this.poseOverride=null; this.time=Math.random()*4; this.hitTime=0; this.hitPower=0; this.knock=0; this.down=0; this.alpha=1;
    }
    reset() { this.hp=this.maxHp; this.mp=this.maxMp; this.x=this.baseX; this.y=this.baseY; this.poseOverride=null; this.hitTime=0; this.knock=0; this.down=0; this.alpha=1; }
    setPose(p) { this.poseOverride=Object.assign(basePose(),p||{}); }
    clearPose() { this.poseOverride=null; }
    react(power=1, knock=0, down=false) { this.hitTime=.24+power*.08; this.hitPower=power; this.knock+=knock; if(down)this.down=Math.max(this.down,1.35); }
    update(dt, busy=false) {
      this.time+=dt;
      if(this.hitTime>0)this.hitTime=Math.max(0,this.hitTime-dt);
      if(this.down>0)this.down=Math.max(0,this.down-dt);
      if(Math.abs(this.knock)>.1){this.x+=this.knock*dt;this.knock*=Math.pow(.045,dt);} else this.knock=0;
      if(!busy && !this.poseOverride) this.x=U.lerp(this.x,this.baseX,1-Math.pow(.025,dt));
    }
    currentPose() {
      const idle=basePose(), breath=Math.sin(this.time*2.15), shift=Math.sin(this.time*.83+1.4);
      idle.crouch+=breath*2.2; idle.torso+=breath*.012+shift*.009; idle.sword+=Math.sin(this.time*1.7)*.012; idle.frontFoot+=Math.sin(this.time*.7)*1.5; idle.cape=Math.sin(this.time*1.2)*.12;
      const p=this.poseOverride||idle;
      const out=Object.assign({},p);
      if(this.hitTime>0){const q=this.hitTime/.5;out.torso-=this.hitPower*.14*Math.sin(q*Math.PI);out.head-=this.hitPower*.17*Math.sin(q*Math.PI);out.arm-=.18;}
      return out;
    }
    snapshot(){return{x:this.x,y:this.y,side:this.side,color:this.color,accent:this.accent,pose:Object.assign({},this.currentPose()),alpha:this.alpha,down:this.down};}
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
      const p=s.pose, hit=s.down>0?Math.min(1,s.down*2):0;
      ctx.save();ctx.globalAlpha*=s.alpha;ctx.translate(s.x,s.y);ctx.scale(s.side,1);
      if(hit){ctx.translate(12*hit,-6*hit);ctx.rotate(-1.25*hit);ctx.translate(0,50*hit);}
      const edge=ghost?s.accent:"#091012", cloth=ghost?s.accent:s.color, dark=ghost?s.accent:"#243033", accent=s.accent;
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
      ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(hip.x-19,hip.y-20);ctx.lineTo(hip.x+18,hip.y-20);ctx.lineTo(hip.x+31,-37);ctx.lineTo(hip.x+4,-48);ctx.lineTo(hip.x-30,-35);ctx.closePath();ctx.fill();ctx.stroke();
      // torso with twist
      ctx.save();ctx.translate(hip.x,hip.y);ctx.rotate(torsoA);ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(-20,2);ctx.lineTo(20,0);ctx.lineTo(25,-61);ctx.lineTo(-20,-67);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle=accent;ctx.globalAlpha*=.75;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-14,-54);ctx.lineTo(19,-17);ctx.stroke();ctx.restore();

      // rear arm first
      const rearShoulder={x:shoulder.x-8,y:shoulder.y+12};
      const ra=p.offArm, re={x:rearShoulder.x+Math.cos(ra)*38,y:rearShoulder.y+Math.sin(ra)*38}, rh={x:re.x+Math.cos(ra+p.offElbow)*37,y:re.y+Math.sin(ra+p.offElbow)*37};
      Character.limb(ctx,rearShoulder,re,8,6,dark,edge);Character.limb(ctx,re,rh,6,4,dark,edge);

      const sh={x:shoulder.x+8,y:shoulder.y+9}, armAngle=p.arm;
      const el={x:sh.x+Math.cos(armAngle)*43,y:sh.y+Math.sin(armAngle)*43};
      const handAngle=armAngle+p.elbow*(1-p.reach*.6);
      const hand={x:el.x+Math.cos(handAngle)*(38+20*p.reach),y:el.y+Math.sin(handAngle)*(38+20*p.reach)};
      Character.limb(ctx,sh,el,9,6,cloth,edge);Character.limb(ctx,el,hand,7,4,cloth,edge);
      ctx.fillStyle=ghost?accent:"#c8b89b";ctx.beginPath();ctx.arc(hand.x,hand.y,5,0,TAU);ctx.fill();

      // sword is coupled to the forward hand, never a detached arm-only prop.
      const sa=p.sword, pom={x:hand.x-Math.cos(sa)*13,y:hand.y-Math.sin(sa)*13}, tip={x:hand.x+Math.cos(sa)*(102+p.swordPull*16),y:hand.y+Math.sin(sa)*(102+p.swordPull*16)};
      ctx.strokeStyle=ghost?accent:"#e9f2ec";ctx.shadowColor=accent;ctx.shadowBlur=ghost?14:5;ctx.lineWidth=ghost?5:4;ctx.beginPath();ctx.moveTo(pom.x,pom.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.shadowBlur=0;
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
  W.Character=Character; W.basePose=basePose;
})(window.Wuxia);
