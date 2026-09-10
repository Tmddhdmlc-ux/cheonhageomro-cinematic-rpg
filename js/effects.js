(function (W) {
  "use strict";
  const U = W.util;
  class Effects {
    constructor() { this.items = []; this.numbers = []; this.tipHistory=new WeakMap(); }
    clear() { this.items.length = 0; this.numbers.length = 0; this.tipHistory=new WeakMap(); }
    add(type, data) { this.items.push(Object.assign({ type, age: 0, life: .4 }, data)); }
    slash(x, y, angle, color = "#dffff8", size = 150, life = .28) { this.add("slash", { x, y, angle, color, size, life }); }
    shockwave(x, y, color = "#dffff8", size = 110, life = .45) { this.add("shock", { x, y, color, size, life }); }
    spark(x, y, color = "#fff2c2", count = 12, power = 1) {
      for (let i = 0; i < count; i++) {
        const a = U.rand(0, Math.PI * 2), s = U.rand(70, 260) * power;
        this.add("particle", { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, r: U.rand(1, 4), gravity: 120, life: U.rand(.18, .46) });
      }
    }
    dust(x, y, dir = 1, count = 9) {
      for (let i = 0; i < count; i++) this.add("dust", { x: x + U.rand(-18,18), y: y + U.rand(-4,5), vx: U.rand(-35,35) - dir * U.rand(15,70), vy: U.rand(-55,-12), r: U.rand(7,18), life: U.rand(.35,.7), color: "#9b9680" });
    }
    afterimage(character, alpha = .28) { this.add("after", { snapshot: character.snapshot(), life: .22, alpha }); }
    petal(x, y, count = 8) {
      for (let i = 0; i < count; i++) this.add("petal", { x: x + U.rand(-80,80), y: y + U.rand(-100,40), vx: U.rand(-50,60), vy: U.rand(-50,25), spin: U.rand(-6,6), rot: U.rand(0,6), r: U.rand(3,7), life: U.rand(.6,1.25) });
    }
    lightning(x1, y1, x2, y2, life = .12) { this.add("lightning", { x1,y1,x2,y2, life, seed: Math.random() }); }
    damage(x, y, value, crit = false, final = false) { this.numbers.push({ x,y, value, crit, final, age:0, life: crit || final ? 1.05 : .72, drift: U.rand(-13,13) }); }
    poise(x,y,value){this.numbers.push({x,y,value,poise:true,age:0,life:.62,drift:U.rand(-8,8)});}
    trackSword(character,dt,active){
      const now=character.getSwordTip(),prev=this.tipHistory.get(character);this.tipHistory.set(character,now);
      if(!active||!prev||dt<=0)return;const d=Math.hypot(now.x-prev.x,now.y-prev.y),speed=d/dt;
      if(speed>520&&d<185)this.add("trail",{x1:prev.x,y1:prev.y,x2:now.x,y2:now.y,color:character.accent,life:.16,width:U.clamp(speed/130,4,13)});
    }
    update(dt) {
      for (const p of this.items) {
        p.age += dt;
        if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity || 0) * dt; }
        if (p.rot != null) p.rot += p.spin * dt;
      }
      for (const n of this.numbers) n.age += dt;
      this.items = this.items.filter(p => p.age < p.life);
      this.numbers = this.numbers.filter(n => n.age < n.life);
    }
    draw(ctx, characterDraw) {
      ctx.save(); ctx.globalCompositeOperation = "screen";
      for (const p of this.items) {
        const t = p.age / p.life, a = 1 - U.smooth(t);
        ctx.save(); ctx.globalAlpha = a;
        if (p.type === "slash") {
          ctx.translate(p.x,p.y); ctx.rotate(p.angle); ctx.strokeStyle=p.color; ctx.lineCap="round";
          ctx.shadowColor=p.color; ctx.shadowBlur=18; ctx.lineWidth=2 + 9*(1-t);
          ctx.beginPath(); ctx.arc(0,0,p.size*(.68+.32*t),-.68,.68); ctx.stroke();
          ctx.globalAlpha*=.45; ctx.lineWidth=18*(1-t); ctx.stroke();
        } else if (p.type === "shock") {
          ctx.translate(p.x,p.y); ctx.strokeStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=20;
          ctx.lineWidth=7*(1-t); ctx.beginPath(); ctx.ellipse(0,0,p.size*t,p.size*.32*t,0,0,Math.PI*2); ctx.stroke();
        } else if (p.type === "particle") {
          ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(1-t),0,7); ctx.fill();
        } else if (p.type === "dust") {
          ctx.globalCompositeOperation="source-over"; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(.5+t),0,7); ctx.fill();
        } else if (p.type === "petal") {
          ctx.globalCompositeOperation="source-over"; ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle="#e99aa8"; ctx.beginPath(); ctx.ellipse(0,0,p.r,p.r*.45,.5,0,7); ctx.fill();
        } else if (p.type === "after") {
          ctx.globalAlpha=a*p.alpha; characterDraw(ctx,p.snapshot,true);
        } else if (p.type === "lightning") {
          const seg=8; ctx.strokeStyle="#c7f7ff"; ctx.shadowColor="#79eaff"; ctx.shadowBlur=15; ctx.lineWidth=U.rand(1,4);
          ctx.beginPath(); ctx.moveTo(p.x1,p.y1);
          for(let i=1;i<seg;i++){const q=i/seg;ctx.lineTo(U.lerp(p.x1,p.x2,q)+U.rand(-18,18)*(1-Math.abs(q-.5)),U.lerp(p.y1,p.y2,q)+U.rand(-8,8));}
          ctx.lineTo(p.x2,p.y2); ctx.stroke();
        } else if (p.type === "trail") {
          ctx.strokeStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=12*(1-t);ctx.lineCap="round";ctx.lineWidth=p.width*(1-t);ctx.beginPath();ctx.moveTo(p.x1,p.y1);ctx.lineTo(p.x2,p.y2);ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
    drawNumbers(ctx) {
      for (const n of this.numbers) {
        const t=n.age/n.life, appear=Math.min(1,t*8), fade=1-Math.max(0,(t-.62)/.38), scale=(n.final?1.65:n.crit?1.35:1)*(1+.35*Math.exp(-t*12));
        ctx.save(); ctx.translate(n.x+n.drift*t,n.y-48*U.ease(t)); ctx.scale(scale,scale); ctx.globalAlpha=appear*fade; ctx.textAlign="center";
        if(n.poise){ctx.font="800 14px serif";ctx.strokeStyle="#241b08";ctx.lineWidth=4;ctx.strokeText(`勢 -${n.value}`,0,0);ctx.fillStyle="#efd77f";ctx.fillText(`勢 -${n.value}`,0,0);ctx.restore();continue;}
        if(n.crit){ctx.fillStyle="#ffd47a";ctx.strokeStyle="#4a170b";ctx.lineWidth=5;ctx.font="800 12px system-ui";ctx.strokeText("CRITICAL",0,-17);ctx.fillText("CRITICAL",0,-17);}
        ctx.font=`900 ${n.final?30:n.crit?25:20}px system-ui`; ctx.strokeStyle="#150909"; ctx.lineWidth=6; ctx.strokeText(n.value.toLocaleString(),0,0); ctx.fillStyle=n.final?"#fff3bd":n.crit?"#ffcf66":"#f5f2e7"; ctx.fillText(n.value.toLocaleString(),0,0); ctx.restore();
      }
    }
  }
  W.Effects = Effects;
})(window.Wuxia);
