(function(W){
  "use strict";

  const DEFAULT_ORDER=["ironSweep","fallingPeak","ironAdvance"];
  const PRESSURE_ORDER=["ironAdvance","ironSweep","fallingPeak"];

  class MujinIntentController{
    constructor(combat){this.c=combat;this.rules=combat.enemyConfig.ai||{};this.reset();}
    reset(){this.order=this.chooseOrder();this.step=0;this.recovering=false;this.lastSkillId=null;}
    chooseOrder(){const threshold=this.rules.pressureThreshold??40,normal=this.rules.defaultOrder||DEFAULT_ORDER,pressure=this.rules.pressureOrder||PRESSURE_ORDER;return this.c.player.poise<threshold?pressure.slice():normal.slice();}
    get active(){return this.c.enemyConfig?.ai?.type==="fixedCycle";}
    get phaseStep(){return this.recovering?0:this.step+1;}
    get label(){return this.recovering?"기세 회복":`철산도 ${this.phaseStep}/3`;}
    skill(id){return this.c.enemySkills.find(item=>item.id===id)||null;}
    current(){return this.recovering?this.skill("ironBreath"):this.skill(this.order[this.step]);}
    sync(){const skill=this.current();this.c.setEnemyIntent(skill);return skill;}
    prepareNext(){
      if(!this.active||this.recovering||this.lastSkillId==="ironBreath"||this.c.enemy.poise>=(this.rules.recoveryThreshold??35))return this.current();
      this.recovering=true;
      return this.sync();
    }
    startCycle(){this.order=this.chooseOrder();this.step=0;this.recovering=false;return this.sync();}
    advanceAfter(skill){
      if(!this.active||!skill)return this.sync();
      this.lastSkillId=skill.id;
      if(skill.id==="ironBreath"){this.recovering=false;return this.sync();}
      if(skill.id===this.order[this.step]){
        if(this.step===this.order.length-1)return this.startCycle();
        this.step+=1;
      }
      return this.sync();
    }
    forceNext(){
      if(!this.active)return null;
      if(this.recovering)this.recovering=false;
      else this.step=(this.step+1)%this.order.length;
      return this.sync();
    }
  }

  W.MUJIN_DEFAULT_ORDER=DEFAULT_ORDER;W.MUJIN_PRESSURE_ORDER=PRESSURE_ORDER;W.MujinIntentController=MujinIntentController;
})(window.Wuxia);
