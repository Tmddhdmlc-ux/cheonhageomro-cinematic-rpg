(function(W){
  "use strict";
  const U=W.util;
  class Game{
    constructor(){
      this.shell=document.getElementById("game-shell");this.canvas=document.getElementById("game");this.ctx=this.canvas.getContext("2d");
      this.camera=new W.Camera();this.audio=new W.AudioEngine();this.effects=new W.Effects();
      this.player=new W.Character(W.PLAYER_DATA,335,476);this.enemy=new W.Character(W.ENEMY_DATA,945,476);
      this.combat=new W.Combat(this);this.time=0;this.last=performance.now();this.motes=Array.from({length:28},()=>({x:U.rand(0,1280),y:U.rand(80,500),s:U.rand(.15,.65),a:U.rand(.08,.35),r:U.rand(1,3)}));
      this.cacheDom();this.buildSkills();this.bind();this.combat.reset();requestAnimationFrame(t=>this.loop(t));
    }
    cacheDom(){
      const ids=["player-hp","player-mp","enemy-hp","enemy-stagger","player-hp-text","player-mp-text","enemy-hp-text","player-state","enemy-state","turn-orb","turn-hint","ai-state","slow-state","tooltip","skill-title","flash","message","audio-toggle"];
      this.el={};for(const id of ids)this.el[id]=document.getElementById(id);
    }
    buildSkills(){
      const box=document.getElementById("skills");
      W.SKILLS.forEach(s=>{const b=document.createElement("button");b.type="button";b.className="skill-btn "+(s.id==="thunder"?"ultimate":"");b.dataset.id=s.id;b.dataset.key=s.key;b.innerHTML=`<span class="rank">${s.rank}</span><strong>${s.name}</strong><span class="meta"><i class="cost">내력 ${s.cost}</i><i>위력 ${s.power}</i></span><i class="seal">${s.hanja[0]}</i>`;b.addEventListener("click",()=>this.combat.useSkill(s.id));b.addEventListener("mouseenter",e=>this.tip(e,s));b.addEventListener("mousemove",e=>this.moveTip(e));b.addEventListener("mouseleave",()=>this.el.tooltip.style.display="none");box.appendChild(b);});
    }
    bind(){
      window.addEventListener("keydown",e=>{if(e.repeat)return;const s=W.SKILLS.find(x=>x.key===e.key);if(s){this.combat.useSkill(s.id);return;}const k=e.key.toUpperCase();if(["F1","F2","F3","F4","F5"].includes(k))e.preventDefault();if(k==="F1"){this.player.hp=this.player.maxHp;this.setMessage("HP 전체 회복",650);}else if(k==="F2"){this.player.mp=this.player.maxMp;this.setMessage("내력 전체 회복",650);}else if(k==="F3"){this.enemy.hp=this.enemy.maxHp;this.combat.over=false;if(this.combat.turn==="over")this.combat.turn="player";this.setMessage("적 HP 회복",650);}else if(k==="F4")this.combat.toggleAI();else if(k==="F5")this.combat.toggleSlow();else if(k==="R")this.combat.reset();this.updateUI();});
      this.el["audio-toggle"].addEventListener("click",()=>{const on=this.audio.toggle();this.el["audio-toggle"].querySelector("span").textContent=on?"ON":"OFF";});
      window.addEventListener("pointerdown",()=>this.audio.unlock(),{once:true});
    }
    tip(e,s){this.el.tooltip.innerHTML=`<b>「${s.hanja}」 ${s.name}</b>${s.desc}<br><span>내력 ${s.cost} · 예상 위력 ${s.power}</span>`;this.el.tooltip.style.display="block";this.moveTip(e);}
    moveTip(e){const x=Math.min(innerWidth-265,e.clientX+15),y=Math.max(8,e.clientY-105);this.el.tooltip.style.left=x+"px";this.el.tooltip.style.top=y+"px";}
    setMessage(text,ms=700){clearTimeout(this.msgTimer);this.el.message.textContent=text;this.el.message.classList.add("show");this.msgTimer=setTimeout(()=>this.el.message.classList.remove("show"),ms);}
    showSkillTitle(s){const el=this.el["skill-title"];el.classList.remove("show");void el.offsetWidth;el.querySelector("small").textContent=s.rank.split("·")[0];el.querySelector("strong").textContent=`「${s.hanja}」`;el.querySelector("em").textContent=s.name;el.classList.add("show");}
    flash(){const f=this.el.flash;f.classList.remove("fire");void f.offsetWidth;f.classList.add("fire");}
    updateUI(){
      const p=this.player,e=this.enemy,c=this.combat;this.el["player-hp"].style.width=100*p.hp/p.maxHp+"%";this.el["player-mp"].style.width=100*p.mp/p.maxMp+"%";this.el["enemy-hp"].style.width=100*e.hp/e.maxHp+"%";this.el["enemy-stagger"].style.width=100*e.staggerResist/100+"%";
      this.el["player-hp-text"].textContent=`${Math.ceil(p.hp).toLocaleString()} / ${p.maxHp.toLocaleString()}`;this.el["player-mp-text"].textContent=`내력 ${Math.ceil(p.mp)} / ${p.maxMp}`;this.el["enemy-hp-text"].textContent=`${Math.ceil(e.hp).toLocaleString()} / ${e.maxHp.toLocaleString()}`;
      const orb=this.el["turn-orb"];if(c.over){orb.innerHTML="<span>DUEL END</span><b>勝敗已決</b>";}else if(c.runner){orb.innerHTML="<span>EXECUTING</span><b>劍勢如虹</b>";}else if(c.turn==="player"){orb.innerHTML="<span>PLAYER</span><b>你的回合</b>";}else{orb.innerHTML="<span>ENEMY</span><b>敵方回合</b>";}
      this.el["turn-hint"].textContent=c.runner?"무공 전개 중":c.turn==="player"?"기술을 선택하십시오":"적의 기세를 살피는 중";this.el["player-state"].textContent=c.runner&&c.runner.a===p?"공격":"준비";this.el["enemy-state"].textContent=c.runner&&c.runner.a===e?"공격":c.turn==="enemy"?"주시":"대기";this.el["ai-state"].textContent=c.ai?"ON":"OFF";this.el["slow-state"].textContent=c.slow?"ON":"OFF";
      document.querySelectorAll(".skill-btn").forEach((b,i)=>b.disabled=c.turn!=="player"||!!c.runner||c.over||p.mp<W.SKILLS[i].cost);
    }
    loop(now){let dt=Math.min(.034,(now-this.last)/1000);this.last=now;this.time+=dt;this.combat.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t));}
    draw(){
      const ctx=this.ctx;ctx.clearRect(0,0,1280,720);ctx.save();this.camera.apply(ctx);this.drawWorld(ctx);this.player.draw(ctx);this.enemy.draw(ctx);this.effects.draw(ctx,(c,s)=>W.Character.drawSnapshot(c,s,true));this.effects.drawNumbers(ctx);ctx.restore();this.drawOverlay(ctx);
    }
    drawWorld(ctx){
      const t=this.time;
      let g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,"#111f25");g.addColorStop(.43,"#26383b");g.addColorStop(1,"#857b61");ctx.fillStyle=g;ctx.fillRect(-400,-300,2100,950);
      // Moon and ink-wash mountain silhouettes.
      const moon=ctx.createRadialGradient(985,104,5,985,104,85);moon.addColorStop(0,"#f4edceaa");moon.addColorStop(.35,"#d9d1b077");moon.addColorStop(1,"#d9d1b000");ctx.fillStyle=moon;ctx.beginPath();ctx.arc(985,104,85,0,7);ctx.fill();
      this.mountain(ctx,-140,315,240,"#17262b",.96);this.mountain(ctx,95,290,185,"#1d2d31",.92);this.mountain(ctx,360,340,235,"#223438",.86);this.mountain(ctx,690,280,215,"#1a2c31",.92);this.mountain(ctx,1010,330,260,"#1b2a2e",.9);
      // Distant pines and a pavilion.
      ctx.globalAlpha=.45;for(let i=0;i<18;i++){const x=35+i*78+Math.sin(i*8)*20,h=U.rand(45,90);ctx.fillStyle="#102024";ctx.beginPath();ctx.moveTo(x,382);ctx.lineTo(x+18,382-h*.65);ctx.lineTo(x+5,382-h*.58);ctx.lineTo(x+12,382-h);ctx.lineTo(x-12,382-h*.55);ctx.lineTo(x-4,382-h*.62);ctx.closePath();ctx.fill();}ctx.globalAlpha=1;
      ctx.fillStyle="#111b1e";ctx.fillRect(1020,278,8,101);ctx.fillRect(1112,278,8,101);ctx.beginPath();ctx.moveTo(986,280);ctx.lineTo(1070,244);ctx.lineTo(1155,280);ctx.lineTo(1127,274);ctx.lineTo(1012,274);ctx.closePath();ctx.fill();
      // drifting mist
      for(let i=0;i<5;i++){const x=((t*14+i*290)%1650)-220,y=320+i%2*38;const fog=ctx.createRadialGradient(x,y,0,x,y,190);fog.addColorStop(0,"#d6ddd92a");fog.addColorStop(1,"#d6ddd900");ctx.fillStyle=fog;ctx.fillRect(x-210,y-55,420,110);}
      // arena
      g=ctx.createLinearGradient(0,380,0,560);g.addColorStop(0,"#756e5b");g.addColorStop(.25,"#514f43");g.addColorStop(1,"#22282a");ctx.fillStyle=g;ctx.fillRect(-300,378,1900,300);
      ctx.strokeStyle="#a8a0841c";ctx.lineWidth=1;for(let y=390;y<570;y+=24){ctx.beginPath();ctx.moveTo(-300,y);ctx.lineTo(1600,y);ctx.stroke();}for(let x=-200;x<1500;x+=110){ctx.beginPath();ctx.moveTo(x,380);ctx.lineTo(x-80,570);ctx.stroke();}
      ctx.fillStyle="#192326";ctx.fillRect(-300,511,1900,80);
      // foreground reeds/bamboo
      this.bamboo(ctx,48,400,1.05,-.08);this.bamboo(ctx,1210,430,.92,.1);
      for(const m of this.motes){const x=(m.x+t*12*m.s)%1280,y=m.y+Math.sin(t*m.s*2+m.x)*8;ctx.globalAlpha=m.a;ctx.fillStyle="#e5d8ac";ctx.beginPath();ctx.arc(x,y,m.r,0,7);ctx.fill();}ctx.globalAlpha=1;
    }
    mountain(ctx,x,base,h,color,a){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-180,base);ctx.quadraticCurveTo(x-80,base-h*.18,x,base-h);ctx.quadraticCurveTo(x+55,base-h*.48,x+130,base-h*.32);ctx.quadraticCurveTo(x+210,base-h*.12,x+300,base);ctx.closePath();ctx.fill();ctx.restore();}
    bamboo(ctx,x,y,s,lean){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(lean);ctx.strokeStyle="#0b1718";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,90);ctx.lineTo(12,-245);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle="#314640";for(let yy=65;yy>-235;yy-=48){ctx.beginPath();ctx.moveTo(3,yy);ctx.lineTo(11,yy);ctx.stroke();ctx.fillStyle="#142724";for(const dir of[-1,1]){ctx.beginPath();ctx.ellipse(9+dir*24,yy-22,29,6,dir*.55,0,7);ctx.fill();}}ctx.restore();}
    drawOverlay(ctx){
      let v=ctx.createRadialGradient(640,315,180,640,315,690);v.addColorStop(0,"#0000");v.addColorStop(.72,"#00000016");v.addColorStop(1,"#000000b8");ctx.fillStyle=v;ctx.fillRect(0,0,1280,720);
      ctx.fillStyle="#d8c98a22";ctx.fillRect(0,538,1280,1);
    }
  }
  window.__WUXIA_GAME__=new Game();
  Object.defineProperty(window,"__WUXIA_DEBUG__",{get(){const g=window.__WUXIA_GAME__;return{turn:g.combat.turn,running:g.combat.runner?.s.id||null,playerHp:g.player.hp,playerMp:g.player.mp,enemyHp:g.enemy.hp,ai:g.combat.ai,slow:g.combat.slow};}});
})(window.Wuxia);
