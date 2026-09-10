(function (W) {
  "use strict";

  W.CONFIG = { width: 1280, height: 720, stageBottom: 540 };

  W.SKILLS = [
    {
      id: "basic", key: "1", rank: "일반 · ORDINARY", name: "기본검", hanja: "基本劍",
      cost: 0, power: 92, duration: 0.72, damage: [760, 930],
      desc: "한 걸음 파고들어 허리 회전으로 이어지는 빠른 횡베기. 짧은 히트스톱과 함께 안정적인 피해를 줍니다."
    },
    {
      id: "meteor", key: "2", rank: "상급 · SUPERIOR", name: "유성일섬", hanja: "流星一閃",
      cost: 18, power: 145, duration: 1.55, damage: [1180, 1470],
      desc: "몸을 낮추고 기세를 모은 뒤 적을 관통합니다. 한 박자 늦게 터지는 검흔이 큰 피해를 줍니다."
    },
    {
      id: "plum", key: "3", rank: "절학 · LOST ART", name: "매화십삼검", hanja: "梅花十三劍",
      cost: 38, power: 238, duration: 2.62, damage: [245, 335],
      desc: "적의 사방을 넘나들며 일곱 번 베고, 마지막 매화 검광으로 마무리하는 연속 절학입니다."
    },
    {
      id: "heaven", key: "4", rank: "절학 · LOST ART", name: "파천일검", hanja: "破天一劍",
      cost: 30, power: 210, duration: 1.76, damage: [1920, 2350],
      desc: "발로 지면을 밀고 골반·허리·어깨의 힘을 검 끝에 모아 중심선을 꿰뚫는 전신 찌르기입니다."
    },
    {
      id: "thunder", key: "5", rank: "오의 · ULTIMATE", name: "천뢰파천검", hanja: "天雷破天劍",
      cost: 62, power: 420, duration: 3.75, damage: [3850, 4680],
      desc: "천뢰를 검에 받아 허공으로 도약한 뒤 지상에 내리꽂습니다. 짧은 무협 컷신으로 펼쳐지는 오의입니다."
    }
  ];

  W.PLAYER_DATA = {
    name: "설화검객 연휘", maxHp: 9800, maxMp: 100, attack: 112, defense: 64,
    crit: 0.16, speed: 112, staggerResist: 72, side: 1, color: "#bcd8d0", accent: "#63d4c1"
  };
  W.ENEMY_DATA = {
    name: "흑풍검 염라", maxHp: 16800, maxMp: 80, attack: 96, defense: 72,
    crit: 0.12, speed: 98, staggerResist: 84, side: -1, color: "#c9b4ad", accent: "#dc5749"
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
