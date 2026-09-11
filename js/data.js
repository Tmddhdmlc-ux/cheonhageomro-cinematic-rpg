(function (W) {
  "use strict";

  W.CONFIG = { width: 1280, height: 720, stageBottom: 540 };
  W.normalizeCombatKey = key => key===" "||key==="Spacebar"?"SPACE":String(key||"").toUpperCase();
  W.BASIC_CHAIN = { baseChance:.25, exploitBonus:.25, pityMisses:2, damageScale:.55, poiseScale:.50, initiativeCritBonus:.20, duration:1.08 };
  W.SWORD_BIND = {
    enemyChoices:["guard","lure"],eligibleOpenings:["crossGuard","ironWallClose"],revealDelay:.10,resolveDuration:.40,
    pressPoiseDamage:26,lossPoiseDamage:18,shiftDamageScale:.55,shiftPoiseScale:.50,shiftCritBonus:.15,
    choices:{
      press:{key:"E",hanja:"壓",name:"압검",hint:"고수를 누름 · 유인에 패배"},
      shift:{key:"W",hanja:"變",name:"변검",hint:"유인을 벰 · 고수에 패배"},
      recall:{key:"SPACE",hanja:"回",name:"회검",hint:"안전 종료 · 추가 이득 없음"}
    },
    responses:{guard:{hanja:"固守",name:"고수"},lure:{hanja:"誘引",name:"유인"}}
  };

  W.SKILLS = [
    {
      id: "basic", key: "1", rank: "일반 · ORDINARY", name: "기본검", hanja: "基本劍",
      cost: 0, power: 92, duration: 0.72, damage: [760, 930], poiseDamage: 14, attackType: "SLASH",
      desc: "한 걸음 파고드는 횡베기. 검세·누적 실패·선기에 따라 역방향 두 번째 검격이 이어집니다."
    },
    {
      id: "meteor", key: "2", rank: "상급 · SUPERIOR", name: "유성일섬", hanja: "流星一閃",
      cost: 18, power: 145, duration: 1.55, damage: [1180, 1470], poiseDamage: 23, attackType: "THRUST",
      desc: "몸을 낮추고 기세를 모은 뒤 적을 관통합니다. 한 박자 늦게 터지는 검흔이 큰 피해를 줍니다."
    },
    {
      id: "plum", key: "3", rank: "절학 · LOST ART", name: "매화십삼검", hanja: "梅花十三劍",
      cost: 38, power: 238, duration: 2.62, damage: [245, 335], poiseDamage: 32, attackType: "MULTI",
      desc: "적의 사방을 넘나들며 일곱 번 베고, 마지막 매화 검광으로 마무리하는 연속 절학입니다."
    },
    {
      id: "heaven", key: "4", rank: "절학 · LOST ART", name: "파천일검", hanja: "破天一劍",
      cost: 30, power: 210, duration: 1.76, damage: [1920, 2350], poiseDamage: 48, attackType: "THRUST",
      desc: "발로 지면을 밀고 골반·허리·어깨의 힘을 검 끝에 모아 중심선을 꿰뚫는 전신 찌르기입니다."
    },
    {
      id: "thunder", key: "5", rank: "오의 · ULTIMATE", name: "천뢰파천검", hanja: "天雷破天劍",
      cost: 62, power: 420, duration: 3.75, damage: [3850, 4680], poiseDamage: 65, attackType: "ULTIMATE",
      desc: "천뢰를 검에 받아 허공으로 도약한 뒤 지상에 내리꽂습니다. 짧은 무협 컷신으로 펼쳐지는 오의입니다."
    }
  ];

  W.ENEMY_SKILLS = [
    {
      id:"darkSlash", name:"흑풍참", hanja:"黑風斬", attackType:"SLASH", duration:1.02, responseCue:.33, damage:[620,820], poiseDamage:13,
      intent:"빠른 대각선 베기", threat:"기세 피해 낮음", responseHint:"권장: 반격세",
      responses:{
        counter:{outcome:"parry"},
        evade:{outcome:"evadeFail",reason:"대각선 검 궤적이 보법의 끝을 잡았습니다"}
      }
    },
    {
      id:"darkChain", name:"흑풍연환검", hanja:"黑風連環劍", attackType:"MULTI", duration:1.72, responseCue:.44, damage:[235,315], poiseDamage:27,
      intent:"발을 바꾸는 삼연격", threat:"연속 공격", responseHint:"조건: 반격세 · 기세 50+",
      responses:{
        counter:{outcome:"parry",minPoise:50,poiseCost:20,failureOutcome:"guardFail",reason:"기세가 부족해 연환검을 버티지 못했습니다"},
        evade:{outcome:"evadeFail",reason:"연속 검격이 보법을 추적했습니다"}
      }
    },
    {
      id:"ghostThrust", name:"귀영돌", hanja:"鬼影突", attackType:"THRUST", duration:1.36, responseCue:.46, damage:[1150,1460], poiseDamage:39,
      intent:"방어선을 비집는 고속 찌르기", threat:"기세 피해 높음", responseHint:"권장: 유운보",
      responses:{
        counter:{outcome:"guardFail",reason:"찌르기가 검 안쪽을 관통했습니다"},
        evade:{outcome:"evade"}
      }
    },
    {
      id:"darkFeint", name:"흑풍허초", hanja:"黑風虛招", attackType:"FEINT", duration:1.38, responseCue:.52, damage:[0,0], poiseDamage:0,
      intent:"검을 외측에 둔 채 두 갈래를 감춤", threat:"허초 · 변초 가능", responseHint:"결정 자세를 읽으십시오 · W/E/Space",
      feint:{decisionCue:.42,responseCue:.52,stance:"허문세",branches:["darkSlash","ghostThrust"],punishCounter:"ghostThrust",punishEvade:"darkSlash",branchStarts:{darkSlash:.48,ghostThrust:.56}}
    },
    {
      id:"darkFall", name:"흑천낙검", hanja:"黑天落劍", attackType:"ULTIMATE", duration:2.48, damage:[1900,2450], poiseDamage:52,
      intent:"공중 회전 후 광역 내려찍기", threat:"광역 내려찍기", responseHint:"대응 전술 불가 · 공격으로 기세를 0까지 끊어라",
      responses:{
        counter:{outcome:"guardFail",reason:"착지 충격파가 반격 자세를 무너뜨렸습니다"},
        evade:{outcome:"evadeFail",reason:"착지 충격파의 범위를 벗어나지 못했습니다"}
      }
    },
    {
      id:"darkBreath", name:"사기조식", hanja:"邪氣調息", attackType:"RECOVER", duration:.95, damage:[0,0], poiseDamage:0,
      intent:"사기를 가다듬어 기세 회복", threat:"회복 행동", responseHint:"대응 불필요 · 회복 행동", responses:{}
    }
  ];

  W.MUJIN_SKILLS = [
    {
      id:"ironSweep", name:"철산횡도", hanja:"鐵山橫刀", attackType:"SLASH", duration:1.45, responseCue:.52, damage:[720,900], poiseDamage:28, heavy:true,
      intent:"뒷발과 허리를 감는 낮은 횡도", threat:"묵직한 기세 압박", responseHint:"반격세: 기세 65+ · 유운보 실패",
      responses:{
        counter:{outcome:"parry",minPoise:65,poiseCost:25,failureOutcome:"guardFail",reason:"기세가 부족해 중도의 무게에 눌렸습니다"},
        evade:{outcome:"evadeFail",reason:"넓은 횡궤적이 보법의 끝을 잡았습니다"}
      }
    },
    {
      id:"fallingPeak", name:"낙봉개산", hanja:"落峰開山", attackType:"HEAVY", duration:1.75, responseCue:.64, damage:[1120,1380], poiseDamage:46, heavy:true,
      intent:"낮춘 골반에서 시작하는 수직 내려베기", threat:"매우 높은 기세 피해", responseHint:"권장: 유운보 · 반격세 실패",
      responses:{
        counter:{outcome:"guardFail",reason:"도의 무게가 검과 무릎을 함께 눌렀습니다"},
        evade:{outcome:"evade"}
      }
    },
    {
      id:"ironAdvance", name:"철벽진", hanja:"鐵壁進", attackType:"IMPACT", duration:1.28, responseCue:.40, damage:[650,820], poiseDamage:52, heavy:true,
      intent:"도면과 어깨를 붙인 짧은 전진", threat:"최고 기세 피해", responseHint:"반격세: 기세 45+ · 유운보 실패",
      responses:{
        counter:{outcome:"parry",minPoise:45,poiseCost:15,failureOutcome:"guardFail",reason:"기세가 부족해 도면의 전진을 비틀지 못했습니다"},
        evade:{outcome:"evadeFail",reason:"무진이 짧게 방향을 고쳐 보법을 추적했습니다"}
      }
    },
    {
      id:"ironFeint", name:"철산변도", hanja:"鐵山變刀", attackType:"FEINT", duration:1.61, responseCue:.58, damage:[0,0], poiseDamage:0, heavy:true,
      intent:"도를 세워 중심을 닫고 두 갈래를 감춤", threat:"허초 · 변초 가능", responseHint:"결정 자세를 읽으십시오 · W/E/Space",
      feint:{decisionCue:.48,responseCue:.58,stance:"잠도세",branches:["fallingPeak","ironAdvance"],punishCounter:"fallingPeak",punishEvade:"ironAdvance",branchStarts:{fallingPeak:.72,ironAdvance:.48}}
    },
    {
      id:"ironBreath", name:"철산가세", hanja:"鐵山架勢", attackType:"RECOVER", duration:1.05, damage:[0,0], poiseDamage:0, heavy:true, skipPassivePoiseRecovery:true,
      intent:"도끝을 낮추고 뒷발과 골반을 다시 세움", threat:"기세 회복", responseHint:"공격 기회 · 모든 일반 초식 유효", responses:{}
    }
  ];

  W.ATTACK_TYPE_LABELS = {
    SLASH: "베기", THRUST: "찌르기", MULTI: "연격", HEAVY:"중격", IMPACT:"충격", FEINT:"허초", RECOVER:"조식", ULTIMATE: "오의"
  };
  W.OPENING_MULTIPLIERS = {
    exploit: { damage: 1.10, poise: 1.50 },
    resisted: { damage: .60, poise: .50 },
    neutral: { damage: 1, poise: 1 }
  };

  W.ENEMY_OPENINGS = {
    darkSlash: {
      id: "crossGuard", name: "횡봉세", hanja: "橫封勢", weakTo: ["THRUST"], resists: ["SLASH"], reactionType: "block",
      damageMultiplier: 1.10, poiseMultiplier: 1.50
    },
    ghostThrust: {
      id: "needlePoint", name: "직침세", hanja: "直針勢", weakTo: ["SLASH"], resists: ["THRUST"], reactionType: "deflect",
      damageMultiplier: 1.10, poiseMultiplier: 1.50
    },
    darkChain: {
      id: "flowingShadow", name: "유영세", hanja: "流影勢", weakTo: ["MULTI"], resists: ["SLASH", "THRUST"], reactionType: "sidestep",
      damageMultiplier: 1.10, poiseMultiplier: 1.50
    },
    darkFeint: {
      id:"emptyGate",name:"허문세",hanja:"虛門勢",weakTo:[],resists:[],reactionType:null,damageMultiplier:1,poiseMultiplier:1
    },
    darkBreath: {
      id: "openGate", name: "기문개방", hanja: "氣門開放", weakTo: ["SLASH", "THRUST", "MULTI"], resists: [], reactionType: null,
      damageMultiplier: 1.10, poiseMultiplier: 1.50
    },
    darkFall: {
      id: "ultimateCharge", name: "절기축세", hanja: "絶技蓄勢", weakTo: ["SLASH", "THRUST", "MULTI"], resists: [], reactionType: null,
      damageMultiplier: 1.00, poiseMultiplier: 1.50
    }
  };

  W.MUJIN_OPENINGS = {
    ironSweep:{id:"middleGateSweep",name:"중문횡도",hanja:"中門橫刀",weakTo:["THRUST"],resists:["SLASH"],reactionType:"block",damageMultiplier:1.10,poiseMultiplier:1.50},
    fallingPeak:{id:"raisedSaber",name:"거도상세",hanja:"擧刀上勢",weakTo:["SLASH"],resists:["THRUST"],reactionType:"deflect",damageMultiplier:1.10,poiseMultiplier:1.50},
    ironAdvance:{id:"ironWallClose",name:"철벽근세",hanja:"鐵壁近勢",weakTo:["MULTI"],resists:["SLASH","THRUST"],reactionType:"block",damageMultiplier:1.10,poiseMultiplier:1.50},
    ironFeint:{id:"hiddenSaber",name:"잠도세",hanja:"潛刀勢",weakTo:[],resists:[],reactionType:null,damageMultiplier:1,poiseMultiplier:1},
    ironBreath:null
  };
  W.MUJIN_OPENINGS.ironBreath=W.ENEMY_OPENINGS.darkBreath;

  W.BAEKRIN_SKILLS = [
    {id:"spearThrust",name:"설맥직관",hanja:"雪脈直貫",attackType:"THRUST",duration:1.34,responseCue:.47,damage:[880,1120],poiseDamage:34,weaponStyle:"spear",intent:"뒷발을 고정하고 중심선을 꿰뚫는 창끝",threat:"직선 기세 압박",responseHint:"권장: 유운보",responses:{counter:{outcome:"guardFail",reason:"창끝이 반격선 안쪽을 찔렀습니다"},evade:{outcome:"evade"}}},
    {id:"spearChain",name:"연빙쇄창",hanja:"連氷鎖槍",attackType:"MULTI",duration:1.86,responseCue:.56,damage:[260,340],poiseDamage:25,weaponStyle:"spear",intent:"두 번 회수한 창대가 세 번째 중심을 닫습니다",threat:"연속 창격",responseHint:"반격세: 기세 52+",responses:{counter:{outcome:"parry",minPoise:52,poiseCost:18,failureOutcome:"guardFail",reason:"기세가 부족해 연빙쇄를 끊지 못했습니다"},evade:{outcome:"evadeFail",reason:"겹친 창날이 보법의 끝을 잡았습니다"}}},
    {id:"spearSweep",name:"설화횡류",hanja:"雪花橫流",attackType:"SLASH",duration:1.16,responseCue:.36,damage:[670,860],poiseDamage:20,weaponStyle:"spear",intent:"창대가 큰 원호를 그리며 보법의 끝을 잡습니다",threat:"넓은 횡격",responseHint:"반격세: 기세 42+",responses:{counter:{outcome:"parry",minPoise:42,poiseCost:14,failureOutcome:"guardFail",reason:"기세가 부족해 설화의 원호에 밀렸습니다"},evade:{outcome:"evadeFail",reason:"창끝의 원호가 회피선을 따라붙었습니다"}}},
    {id:"snowRecover",name:"설원토납",hanja:"雪原吐納",attackType:"RECOVER",duration:.92,damage:[0,0],poiseDamage:0,weaponStyle:"spear",intent:"창을 세워 숨을 고르고 기세를 되찾습니다",threat:"기세 회복",responseHint:"공격 기회 · 응수 불필요",responses:{}}
  ];
  W.BAEKRIN_OPENINGS = {spearThrust:{...W.ENEMY_OPENINGS.ghostThrust,id:"needlePoint"},spearChain:{...W.ENEMY_OPENINGS.darkChain,id:"flowingShadow"},spearSweep:{...W.ENEMY_OPENINGS.darkSlash,id:"crossGuard"},snowRecover:{...W.ENEMY_OPENINGS.darkBreath,id:"openGate"}};

  W.openingForIntent = (intent, openings=W.ENEMY_OPENINGS) => openings?.[typeof intent === "string" ? intent : intent?.id] || null;
  W.evaluateOpening = (opening, attackType, active = true) => {
    const normal = ["SLASH", "THRUST", "MULTI"].includes(attackType);
    let result="neutral";
    if(active&&opening&&normal){if(opening.weakTo.includes(attackType))result="exploit";else if(opening.resists?.includes(attackType))result="resisted";}
    const matched=result==="exploit",resisted=result==="resisted";
    return {
      openingId: opening?.id || null,
      attackType,
      result,
      matched,
      resisted,
      reactionType: resisted ? opening.reactionType : null,
      damageMultiplier: matched ? opening.damageMultiplier : resisted ? W.OPENING_MULTIPLIERS.resisted.damage : 1,
      poiseMultiplier: matched ? opening.poiseMultiplier : resisted ? W.OPENING_MULTIPLIERS.resisted.poise : 1,
      feedbackShown: false,
      reactionShown: false
    };
  };

  W.BOSS_PHASE = {
    threshold: .5,
    name: "살풍세",
    hanja: "殺風勢",
    duration: 1.62,
    routes: {
      counter: ["ghostThrust", "darkChain", "darkFeint", "darkFall"],
      evade: ["darkSlash", "darkChain", "darkFeint", "darkFall"]
    }
  };

  W.TACTICS = [
    { id:"breathe", key:"Q", name:"운기조식", hanja:"運氣調息", desc:"한 턴을 사용해 내력 +28, 기세 +20, HP를 소량 회복합니다." },
    { id:"evade", key:"W", name:"유운보", hanja:"流雲步", desc:"귀영돌의 중심선 찌르기를 측면 보법으로 확정 회피합니다. 흑풍참·연환검·낙검에는 실패합니다." },
    { id:"counter", key:"E", name:"반격세", hanja:"反擊勢", desc:"흑풍참을 확정 파훼합니다. 흑풍연환검은 기세 50 이상에서 기세 20을 써서 파훼합니다." }
  ];

  W.PLAYER_DATA = {
    name: "설화검객 연휘", maxHp: 9800, maxMp: 100, attack: 112, defense: 64,
    crit: 0.16, speed: 112, maxPoise: 100, poiseRecovery: 12, side: 1, color: "#bcd8d0", accent: "#63d4c1"
  };
  W.ENEMY_DATA = {
    name: "흑풍검 염라", maxHp: 16800, maxMp: 80, attack: 96, defense: 72,
    crit: 0.12, speed: 98, maxPoise: 100, poiseRecovery: 10, side: -1, color: "#c9b4ad", accent: "#dc5749"
  };
  W.MUJIN_DATA = {
    name:"철산도객 무진", hanja:"鐵山刀客 武震", maxHp:13200, maxMp:60, attack:102, defense:86,
    crit:.08, speed:86, maxPoise:130, poiseRecovery:8, side:-1, color:"#928a70", darkColor:"#353b3c", accent:"#9fc7cf",
    weaponStyle:"heavySaber", bodyScale:1.1, idleStance:"cheolsanse"
  };
  W.BAEKRIN_DATA = {id:"baekrin",name:"빙설창객 백린",hanja:"氷雪槍客 白麟",maxHp:14600,maxMp:70,attack:100,defense:70,crit:.10,speed:104,maxPoise:115,poiseRecovery:9,side:-1,color:"#b9d7e4",darkColor:"#29414b",accent:"#8bd5ef",weaponStyle:"spear",idleStance:"spearReady"};

  W.ARENAS = {
    moonSummit:{id:"moonSummit",name:"월하 산정 비무장"},
    bluestoneGate:{id:"bluestoneGate",name:"청석관문"},
    snowBridge:{id:"snowBridge",name:"설죽잔도"}
  };
  W.ENEMIES = {
    yama:{
      id:"yama",name:"흑풍검 염라",hanja:"黑風劍 閻羅",title:"쾌검 · 변칙 · 살풍세 2페이즈",traits:["쾌검","변칙","살풍세"],difficulty:"보스",arenaId:"moonSummit",arenaName:"월하 산정 비무장",
      character:W.ENEMY_DATA,skills:W.ENEMY_SKILLS,openings:W.ENEMY_OPENINGS,aiType:"yama",ai:{type:"yamaAdaptive"},bossPhase:true,badge:"1식",
      victoryMessage:"승리 — 검로가 열렸습니다",defeatMessage:"패배 — 호흡을 가다듬으십시오",breakMessage:"파세 위기 · 염라의 연격"
    },
    mujin:{
      id:"mujin",name:"철산도객 무진",hanja:"鐵山刀客 武震",title:"중도 · 기세 압박 · 묵직한 고정 패턴",traits:["중도","기세 압박","고정 3수"],difficulty:"정예",arenaId:"bluestoneGate",arenaName:"청석관문",
      character:W.MUJIN_DATA,skills:W.MUJIN_SKILLS,openings:W.MUJIN_OPENINGS,aiType:"mujin",ai:{type:"fixedCycle",defaultOrder:["ironSweep","fallingPeak","ironFeint"],pressureOrder:["ironAdvance","ironSweep","ironFeint"],recoveryThreshold:35,pressureThreshold:40},bossPhase:false,badge:"정예 · 철산도",
      victoryMessage:"승리 — 철산의 문이 열렸습니다",defeatMessage:"패배 — 무거운 도세를 다시 읽으십시오",breakMessage:"파세 위기 · 무진의 중도 압박"
    },
    baekrin:{
      id:"baekrin",name:"빙설창객 백린",hanja:"氷雪槍客 白麟",title:"장창 · 냉정한 거리 · 고정 3수",traits:["장창","설원","고정 3수"],difficulty:"정예",arenaId:"snowBridge",arenaName:"설죽잔도",character:W.BAEKRIN_DATA,skills:W.BAEKRIN_SKILLS,openings:W.BAEKRIN_OPENINGS,aiType:"baekrin",ai:{type:"baekrinCycle",order:["spearThrust","spearChain","spearSweep"],recoveryThreshold:32},bossPhase:false,badge:"설원창 · 1/3",victoryMessage:"승리 — 설원에 창끝이 멎었습니다",defeatMessage:"패배 — 창끝의 거리를 다시 읽으십시오",breakMessage:"파세 위기 · 백린의 연빙쇄"
    }
  };

  W.util = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    ease: t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3),
    easeInOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    smooth: t => t * t * (3 - 2 * t),
    ping: t => 1 - Math.abs((t % 2) - 1),
    rand: (a, b) => a + Math.random() * (b - a),
    angleLerp: (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t
  };
})(window.Wuxia = window.Wuxia || {});
