(function(W){
  "use strict";
  class BaekrinIntentController{
    constructor(combat){this.c=combat;this.rules=combat.enemyConfig.ai||{};this.reset();}
    reset(){this.order=(this.rules.order||["spearThrust","spearChain","spearSweep"]).slice();this.step=0;this.recovering=false;this.lastSkillId=null;this.resumeStep=0;}
    get active(){return this.c.enemyConfig?.ai?.type==="baekrinCycle";}
    get phaseStep(){return this.recovering?0:this.step+1;}
    get label(){return this.recovering?"기세 회복":`설원창 ${this.phaseStep}/3`;}
    skill(id){return this.c.enemySkills.find(item=>item.id===id)||null;}
    current(){return this.recovering?this.skill("snowRecover"):this.skill(this.order[this.step]);}
    sync(){return this.c.setEnemyIntent(this.current());}
    prepareNext(){
      if(!this.active||this.recovering||this.c.enemy.poise>=((this.rules.recoveryThreshold??32)))return this.current();
      this.resumeStep=this.step;this.recovering=true;return this.sync();
    }
    startCycle(){this.step=0;this.recovering=false;return this.sync();}
    advanceAfter(skill){
      if(!this.active||!skill)return this.sync();this.lastSkillId=skill.id;
      if(skill.id==="snowRecover"){this.recovering=false;this.step=this.resumeStep;return this.sync();}
      if(skill.id===this.order[this.step]){this.step+=1;if(this.step>=this.order.length)return this.startCycle();}
      return this.sync();
    }
    forceNext(){if(!this.active)return null;if(this.recovering)this.recovering=false;else this.step=(this.step+1)%this.order.length;return this.sync();}
  }
  W.BaekrinIntentController=BaekrinIntentController;
})(window.Wuxia);
