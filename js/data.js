(function (W) {
  "use strict";

  W.CONFIG = { width: 1280, height: 720, stageBottom: 540 };

  W.SKILLS = [
    {
      id: "basic", key: "1", rank: "일반 · ORDINARY", name: "기본검", hanja: "基本劍",
      cost: 0, power: 92, duration: 0.72, damage: [760, 930], poiseDamage: 14, attackType: "SLASH",
      desc: "한 걸음 파고들어 허리 회전으로 이어지는 빠른 횡베기. 짧은 히트스톱과 함께 안정적인 피해를 줍니다."
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
      id:"darkSlash", name:"흑풍참", hanja:"黑風斬", attackType:"SLASH", duration:1.02, damage:[620,820], poiseDamage:13,
      intent:"빠른 대각선 베기", threat:"기세 피해 낮음", responseHint:"권장: 반격세",
      responses:{
        counter:{outcome:"parry"},
        evade:{outcome:"evadeFail",reason:"대각선 검 궤적이 보법의 끝을 잡았습니다"}
      }
    },
    {
      id:"darkChain", name:"흑풍연환검", hanja:"黑風連環劍", attackType:"MULTI", duration:1.72, damage:[235,315], poiseDamage:27,
      intent:"발을 바꾸는 삼연격", threat:"연속 공격", responseHint:"조건: 반격세 · 기세 50+",
      responses:{
        counter:{outcome:"parry",minPoise:50,poiseCost:20,failureOutcome:"guardFail",reason:"기세가 부족해 연환검을 버티지 못했습니다"},
        evade:{outcome:"evadeFail",reason:"연속 검격이 보법을 추적했습니다"}
      }
    },
    {
      id:"ghostThrust", name:"귀영돌", hanja:"鬼影突", attackType:"THRUST", duration:1.36, damage:[1150,1460], poiseDamage:39,
      intent:"방어선을 비집는 고속 찌르기", threat:"기세 피해 높음", responseHint:"권장: 유운보",
      responses:{
        counter:{outcome:"guardFail",reason:"찌르기가 검 안쪽을 관통했습니다"},
        evade:{outcome:"evade"}
      }
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

  W.BOSS_PHASE = {
    threshold: .5,
    name: "살풍세",
    hanja: "殺風勢",
    duration: 1.62,
    routes: {
      counter: ["ghostThrust", "darkChain", "darkSlash", "darkFall"],
      evade: ["darkSlash", "darkChain", "ghostThrust", "darkFall"]
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
