(function(W){
  "use strict";
  const U=W.util;
  class Combat{
    constructor(game){this.game=game;this.camera=game.camera;this.effects=game.effects;this.audio=game.audio;this.player=game.player;this.enemy=game.enemy;this.runner=null;this.turn="player";this.ai=true;this.slow=false;this.wait=0;this.hitStop=0;this.over=false;this.round=1;}
    reset(){this.player.reset();this.enemy.reset();this.effects.clear();this.runner=null;this.hitStop=0;this.wait=0;this.over=false;this.turn=this.player.speed>=this.enemy.speed?"player":"enemy";this.camera.reset(true);this.cinematic(false);this.game.updateUI();this.game.setMessage("비무를 시작합니다",850);if(this.turn==="enemy")this.wait=.7;}
    useSkill(id){if(this.over||this.runner||this.turn!=="player")return false;const s=W.SKILLS.find(x=>x.id===id);if(!s)return false;if(this.player.mp<s.cost){this.game.setMessage("내력이 부족합니다",800);this.audio.tone("square",90,70,.12,.08);return false;}this.audio.unlock();this.player.mp-=s.cost;this.runner=new W.SkillRunner(this,this.player,this.enemy,s);this.game.updateUI();return true;}
    enemyAttack(){if(this.over||this.runner||!this.ai)return;const s=Object.assign({},W.SKILLS[0],{name:"흑풍참",hanja:"黑風斬",duration:.82,damage:[620,850]});this.runner=new W.SkillRunner(this,this.enemy,this.player,s);}
    hit(attacker,target,skill,opt={}){
      const range=skill.damage||[500,700],scale=opt.damageScale||1,atk=attacker.attack/100,def=100/(100+target.defense*.45);
      let amount=Math.round(U.rand(range[0],range[1])*atk*def*scale);const crit=Math.random()<attacker.crit;if(crit)amount=Math.round(amount*1.65);
      target.hp=Math.max(0,target.hp-amount);target.react(opt.power||1,(opt.knock||0)*attacker.side,opt.down);
      this.effects.damage(target.x,target.y-130,amount,crit,opt.final);this.effects.spark(target.x-attacker.side*24,target.y-105,crit?"#ffd586":"#eafff8",Math.round(8+(opt.power||1)*6),opt.power||1);
      this.audio.slash(!!opt.multi);this.audio.hit(opt.power||1,crit);this.hitStop=Math.max(this.hitStop,opt.hitStop||.05);this.game.updateUI();
    }
    update(realDt){
      const rate=this.slow?.36:1;let dt=realDt*rate;
      this.camera.update(realDt);this.effects.update(realDt*(this.slow?.55:1));
      if(this.hitStop>0){this.hitStop-=realDt;dt=0;}
      const busy=!!this.runner;this.player.update(dt,busy&&this.runner.a===this.player);this.enemy.update(dt,busy&&this.runner.a===this.enemy);
      if(this.runner)this.runner.update(dt);
      else if(this.wait>0){this.wait-=dt;if(this.wait<=0&&this.turn==="enemy")this.enemyAttack();}
    }
    skillFinished(r){
      this.runner=null;if(r.b.hp<=0){this.over=true;this.turn="over";this.game.setMessage(r.b===this.enemy?"승리 — 검로가 열렸습니다":"패배 — 호흡을 가다듬으십시오",2600);this.game.updateUI();return;}
      if(r.a===this.player){if(this.ai){this.turn="enemy";this.wait=.68;}else{this.turn="player";this.player.mp=Math.min(this.player.maxMp,this.player.mp+7);}}
      else{this.turn="player";this.player.mp=Math.min(this.player.maxMp,this.player.mp+12);this.round++;}
      this.game.updateUI();
    }
    toggleAI(){this.ai=!this.ai;if(!this.ai&&this.turn==="enemy"&&!this.runner){this.turn="player";this.wait=0;}this.game.updateUI();this.game.setMessage(`적 AI ${this.ai?"ON":"OFF"}`,700);}
    toggleSlow(){this.slow=!this.slow;this.game.updateUI();this.game.setMessage(`슬로모션 ${this.slow?"ON":"OFF"}`,700);}
    showSkillTitle(s){this.game.showSkillTitle(s);}
    cinematic(on){this.game.shell.classList.toggle("cinematic",on);}
    flash(){this.game.flash();}
  }
  W.Combat=Combat;
})(window.Wuxia);
