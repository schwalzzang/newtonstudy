// 커리큘럼 데이터: 5챕터 15미션
// 각 미션: 일상 장면 → 예측 → 시뮬레이션 → 결과/설명 → 확인 퀴즈
import { make, W, H, GROUND_TOP, PXM, COLORS } from './physics.js';

const M = window.Matter;
const { Bodies, Body, Composite } = M;

const m = (px) => (px / PXM).toFixed(1);   // px → m 표시

// 두 점을 잇는 경사면
function rampFromTo(x0, y0, x1, y1, thick = 18) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const len = Math.hypot(x1 - x0, y1 - y0) + thick;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  return Bodies.rectangle(cx, cy, len, thick,
    { isStatic: true, angle, label: 'terrain', friction: 0.02, render: { fillStyle: COLORS.ground } });
}

// 곡선 지형: y = fn(x)를 겹치는 원들로 근사.
// 원은 모서리가 없어 사각형 세그먼트의 "미세 계단 턱" 문제(공이 오르막에서
// 턱에 부딪혀 에너지를 잃는 문제)가 생기지 않는다.
function terrainCurve(fn, x0, x1, step = 10, r = 22) {
  const parts = [];
  for (let x = x0; x <= x1 + 0.1; x += step) {
    parts.push(Bodies.circle(x, fn(x) + r, r,
      { isStatic: true, friction: 0.02, label: 'terrain', render: { fillStyle: COLORS.ground } }));
  }
  return parts;
}

export const CHAPTERS = [
  { n: 1, title: '관성의 법칙', sub: '버스에서 몸이 쏠리는 이유' },
  { n: 2, title: '힘과 가속도 (F=ma)', sub: '빈 카트와 가득 찬 카트의 차이' },
  { n: 3, title: '작용과 반작용', sub: '로켓은 무엇을 밀고 날아갈까' },
  { n: 4, title: '마찰과 포물선', sub: '빗길 운전이 위험한 진짜 이유' },
  { n: 5, title: '에너지', sub: '롤러코스터는 왜 첫 언덕이 가장 높을까' },
];

export const BADGES = [
  { id: 'b_inertia', label: '“계속 움직이려면 힘이 계속 필요하다” → 아니었다' },
  { id: 'b_heavy',   label: '“무거운 것이 먼저 떨어진다” → 아니었다' },
  { id: 'b_rocket',  label: '“로켓은 공기를 밀어서 난다” → 아니었다' },
  { id: 'b_brake',   label: '“속도 2배면 제동거리도 2배” → 아니었다 (4배!)' },
  { id: 'b_energy',  label: '“기세 좋게 구르면 더 높은 언덕도 넘는다” → 아니었다' },
];

export const MISSIONS = [

/* ═══════════════ Ch.1 관성 ═══════════════ */
{
  id: 'c1m1', ch: 1, title: '급브레이크와 안전벨트', tag: '관성 · 급정거',
  scene: '퇴근길 버스. 앞차가 갑자기 끼어들어 기사님이 급브레이크를 밟습니다. 손잡이를 안 잡고 있던 당신의 몸은 어떻게 될까요?\n\n버스(큰 상자)와 승객(작은 상자)으로 그 순간을 재현해 봅니다.',
  goal: '▶ 실행을 누르면 버스가 달리다가 빨간 선 앞에서 급브레이크를 밟습니다. 승객이 어떻게 되는지 지켜보세요.',
  predict: {
    q: '버스가 급브레이크를 밟는 순간, 승객의 몸은?',
    choices: ['버스와 함께 그 자리에 딱 멈춘다', '앞으로 쏠린다', '뒤로 쏠린다'],
    correct: 1,
  },
  sliders: [
    { key: 'seat', label: '좌석의 미끄러움', min: 0.02, max: 0.5, step: 0.02, init: 0.06,
      fmt: v => v < 0.12 ? '미끄러운 좌석' : v < 0.3 ? '보통' : '꺼끌한 좌석', hint: '미끄러울수록 몸이 크게 쏠립니다' },
  ],
  build(p) {
    const ground = make.ground(GROUND_TOP, 3000, { friction: 0.5 });
    const busBase = Bodies.rectangle(190, GROUND_TOP - 26, 240, 52, { render: { fillStyle: '#4a6a8a' } });
    const lip = Bodies.rectangle(300, GROUND_TOP - 66, 14, 32, { render: { fillStyle: '#4a6a8a' } });
    const bus = Body.create({ parts: [busBase, lip], friction: 0.02, frictionAir: 0, label: 'bus' });
    const pas = make.box(160, GROUND_TOP - 52 - 26, 34, 52,
      { friction: p.seat, frictionAir: 0, render: { fillStyle: COLORS.ball }, label: 'passenger' });
    const offset0 = pas.position.x - bus.position.x;
    const st = { braking: false, calm: 0 };
    const data = {};
    return {
      bodies: [ground, bus, pas],
      focus: pas, vectorBodies: [pas],
      markers: [{ type: 'vline', x: 700, label: '급브레이크!', color: '#dd7a72' }],
      data,
      onStart(sim) { Body.setVelocity(bus, { x: 9, y: 0 }); Body.setVelocity(pas, { x: 9, y: 0 }); },
      onTick(sim) {
        if (!st.braking && bus.position.x > 560) st.braking = true;
        if (st.braking && Math.abs(bus.velocity.x) > 0.1) {
          Body.applyForce(bus, bus.position, { x: -bus.mass * 0.0045, y: 0 });
        } else if (st.braking) {
          Body.setVelocity(bus, { x: 0, y: 0 });
        }
        if (st.braking && Math.abs(pas.velocity.x) < 0.15 && Math.abs(bus.velocity.x) < 0.1) st.calm++;
        else st.calm = 0;
        if (st.calm > 35 || pas.position.y > H || pas.position.x > 950 || sim.time > 9) {
          data.shift = Math.max(0, (pas.position.x - bus.position.x) - offset0);
          sim.finish('done');
        }
      },
    };
  },
  result(key, data) {
    const sh = data.shift ?? 0;
    if (sh > 180) return {
      title: '승객이 앞으로 튕겨 나갔습니다',
      body: '버스는 멈췄지만 승객의 몸은 원래 속도 그대로 나아가려 해서, 앞턱을 넘어 버스 밖까지 날아갔습니다.\n브레이크는 버스 바퀴를 잡을 뿐, 승객의 몸을 잡아주는 것은 아무것도 없었기 때문입니다. 안전벨트가 하는 일이 바로 이 "몸을 잡아주기"입니다.',
    };
    return {
      title: '몸은 앞으로 쏠렸습니다',
      body: `버스는 멈췄지만, 승객의 몸은 버스 안에서 앞으로 약 ${m(sh)}m 미끄러졌습니다.\n브레이크는 버스 바퀴를 잡을 뿐, 승객의 몸을 잡아주는 것은 아무것도 없었기 때문입니다. 움직이던 몸은 하던 대로 계속 앞으로 가려고 합니다.`,
    };
  },
  explain: {
    feel: '움직이던 것은 계속 움직이려 하고, 멈춰 있던 것은 계속 멈춰 있으려 합니다. 이 “하던 대로 하려는 고집”이 관성입니다.',
    concept: '급브레이크는 버스에만 작용하는 힘입니다. 승객에게는 좌석의 마찰 말고는 멈추게 할 힘이 없어서, 몸은 원래 속도 그대로 앞으로 나아가려 합니다. 안전벨트는 바로 그 “멈추게 할 힘”을 몸에 걸어주는 장치입니다.',
    formula: { expr: '힘이 0이면, 속도는 그대로 (뉴턴 제1법칙)',
      text: '외부에서 힘이 작용하지 않으면 물체의 속도(빠르기와 방향)는 변하지 않습니다. 승객을 멈추게 할 힘이 없었으니, 승객의 속도는 그대로였던 것입니다.' },
  },
  quiz: { q: '달리는 지하철 안에서 제자리 점프를 해도 제자리에 착지한다. 이것도 관성 때문이다.', a: true,
    why: '맞습니다. 점프한 내 몸도 지하철과 같은 속도로 이미 움직이고 있어서, 공중에서도 그 속도를 유지한 채 함께 이동합니다.' },
},

{
  id: 'c1m2', ch: 1, title: '식탁보 빼기의 비밀', tag: '관성 · 정지 관성',
  scene: '식탁보를 확 잡아당겨도 그릇은 그대로 남는 마술, 본 적 있으시죠? 손재주가 아니라 물리입니다.\n\n천을 빼는 속도를 직접 조절하면서 언제 성공하고 언제 실패하는지 실험해 보세요.',
  goal: '당기는 속도를 정한 뒤 ▶ 실행. 컵이 제자리에 남으면 성공입니다. 속도를 바꿔가며 여러 번 실험해 보세요.',
  predict: {
    q: '식탁보를 아주 빠르게 확 당기면, 그 위의 컵은?',
    choices: ['컵도 같이 끌려온다', '컵은 거의 제자리에 남는다', '컵이 위로 튀어오른다'],
    correct: 1,
  },
  sliders: [
    { key: 'speed', label: '당기는 속도', min: 3, max: 24, step: 1, init: 20,
      fmt: v => v < 8 ? '살살…' : v < 15 ? '보통' : '확!', hint: '천천히 당기면 어떻게 될까요?' },
  ],
  build(p) {
    const ground = make.ground();
    const table = make.platform(400, 470, 320, 18);
    const legL = make.platform(270, 515, 16, 76);
    const legR = make.platform(530, 515, 16, 76);
    const cloth = Bodies.rectangle(400, 452, 320, 9,
      { friction: 0.08, frictionAir: 0, label: 'cloth', render: { fillStyle: COLORS.cloth } });
    const cup = make.box(400, 425, 30, 44, { friction: 0.4, render: { fillStyle: '#d8dee9' } });
    const cup0 = cup.position.x;
    const st = { pulling: false, wait: 0 };
    const data = {};
    return {
      bodies: [ground, table, legL, legR, cloth, cup],
      focus: cup, vectorBodies: [cup],
      data,
      onStart() { st.pulling = true; },
      onTick(sim) {
        if (st.pulling) {
          Body.setVelocity(cloth, { x: p.speed, y: 0 });
          if (cloth.position.x > 400 + 380) st.pulling = false;
        } else {
          st.wait++;
          if (st.wait > 90 || sim.time > 8) {
            data.dx = Math.abs(cup.position.x - cup0);
            data.fell = cup.position.y > 500;
            sim.finish(data.fell || data.dx > 60 ? 'drag' : (data.dx < 26 ? 'stay' : 'drag'));
          }
        }
      },
    };
  },
  result(key, data) {
    if (key === 'stay') return {
      title: '컵이 제자리에 남았습니다',
      body: `컵은 겨우 ${Math.round(data.dx)}px 움직였을 뿐입니다.\n천이 워낙 빨리 빠져나가서, 마찰이 컵을 끌고 갈 시간이 없었습니다. 멈춰 있던 컵은 “멈춰 있으려는 고집(정지 관성)”을 지킨 것입니다.`,
    };
    return {
      title: '컵이 끌려왔습니다',
      body: `천이 천천히 움직이는 동안 마찰이 컵을 계속 끌고 갈 시간이 있었습니다.\n속도를 더 올려서 다시 실험해 보세요 — 빠를수록 마찰이 작용할 시간이 짧아집니다.`,
      retry: true,
    };
  },
  explain: {
    feel: '멈춰 있는 물체는 갑작스러운 변화에 바로 따라가지 못합니다. 변화가 빠를수록 “하던 대로” 남습니다.',
    concept: '컵을 움직이게 하는 유일한 힘은 천과의 마찰입니다. 힘이 물체의 속도를 바꾸려면 “작용하는 시간”이 필요한데, 천을 확 빼면 그 시간이 거의 0이 됩니다. 그래서 컵은 거의 그대로 남습니다.',
    formula: { expr: '속도 변화 = (힘 ÷ 질량) × 시간',
      text: '같은 마찰력이라도 작용 시간이 짧으면 속도 변화가 작습니다. 당기는 시간을 줄이는 것이 이 마술의 전부입니다.' },
  },
  quiz: { q: '식탁보를 천천히 빼면 컵도 함께 끌려온다.', a: true,
    why: '맞습니다. 천천히 빼면 마찰력이 컵에 오래 작용해서, 컵의 속도를 천의 속도까지 끌어올릴 시간이 생깁니다.' },
},

{
  id: 'c1m3', ch: 1, title: '멈추지 않는 공', tag: '관성 · 오개념 깨기', badge: 'b_inertia',
  scene: '“움직이는 물체는 힘이 떨어지면 결국 멈춘다.” 우리 일상 경험은 분명 그렇게 말합니다. 굴린 공은 언젠가 멈추니까요.\n\n그런데 정말 “힘이 다해서” 멈추는 걸까요? 바닥의 거칠기를 점점 줄여보며 확인해 봅시다.',
  goal: '바닥 거칠기를 바꿔가며 공을 굴려 보세요(항상 같은 세기로 굴립니다). 얼음판에 가까울수록 어떻게 되나요?',
  predict: {
    q: '만약 마찰이 완벽하게 0인 바닥이라면, 굴러가는 공은?',
    choices: ['그래도 언젠가는 저절로 멈춘다', '속도를 유지하며 계속 굴러간다'],
    correct: 1,
  },
  sliders: [
    { key: 'rough', label: '바닥의 거칠기', min: 0.0005, max: 0.03, step: 0.0005, init: 0.012,
      fmt: v => v < 0.003 ? '얼음판' : v < 0.015 ? '마룻바닥' : '카펫', hint: '왼쪽 끝이 거의 마찰 0' },
  ],
  build(p) {
    const ground = make.ground();
    const ball = make.ball(90, GROUND_TOP - 18, 18, { frictionAir: p.rough, friction: 0.05 });
    const data = {};
    return {
      bodies: [ground, ball],
      focus: ball, vectorBodies: [ball],
      markers: [{ type: 'vline', x: 90, label: '출발', color: '#5fc08f' }],
      data,
      onStart() { Body.setVelocity(ball, { x: 13, y: 0 }); },
      onTick(sim) {
        if (ball.position.x > 955) { data.dist = ball.position.x - 90; sim.finish('forever'); }
        else if (sim.time > 0.5 && Math.hypot(ball.velocity.x, ball.velocity.y) < 0.15) {
          data.dist = ball.position.x - 90; sim.finish('stop');
        }
      },
    };
  },
  result(key, data) {
    if (key === 'forever') return {
      title: '화면 끝까지, 멈출 기미가 없습니다',
      body: `공은 ${m(data.dist)}m를 지나 화면을 벗어났습니다. 마찰을 거의 없앴더니 공은 속도를 그대로 유지합니다.\n일상에서 공이 멈추는 건 힘이 “다 떨어져서”가 아니라, 마찰이라는 힘이 계속 브레이크를 걸기 때문이었습니다.`,
    };
    return {
      title: `${m(data.dist)}m 굴러가고 멈췄습니다`,
      body: '공을 멈춘 범인은 마찰입니다. 거칠기를 더 낮춰서 다시 실험해 보세요 — 마찰이 줄어들수록 공은 점점 더 멀리, 얼음판에서는 거의 끝없이 굴러갑니다.',
      retry: true,
    };
  },
  explain: {
    feel: '물체가 멈추는 것은 “자연스러운 일”이 아니라, 마찰이라는 힘이 한 “일”입니다.',
    concept: '2천 년 동안 인류는 “움직임에는 힘이 계속 필요하다”(아리스토텔레스)고 믿었습니다. 갈릴레이와 뉴턴이 뒤집었죠: 힘이 필요 없는 것이 등속 운동이고, 힘이 필요한 것은 속도를 바꿀 때뿐입니다. 실제로 우주 탐사선 보이저호는 엔진을 끈 채 수십 년째 날아가고 있습니다.',
    formula: { expr: 'F = 0  →  v = 일정',
      text: '알짜힘이 0이면 속도는 변하지 않습니다. 마찰을 0으로 만드는 것은 현실에서 어려울 뿐, 원리적으로 공은 영원히 굴러갑니다.' },
  },
  quiz: { q: '우주 탐사선은 엔진을 끄면 곧 멈춘다.', a: false,
    why: '아닙니다. 우주 공간에는 마찰이 거의 없어서, 엔진을 꺼도 탐사선은 같은 속도로 계속 날아갑니다. 보이저 1호가 그 증거입니다.' },
},

/* ═══════════════ Ch.2 F=ma ═══════════════ */
{
  id: 'c2m1', ch: 2, title: '빈 카트 vs 가득 찬 카트', tag: 'F=ma · 질량',
  scene: '마트에서 빈 카트는 슬쩍 밀어도 쑥 나가지만, 생수 두 팩을 실은 카트는 같은 힘으로 밀어도 굼뜹니다.\n\n위 레인엔 가벼운 카트, 아래 레인엔 무거운 카트. 정확히 같은 힘으로 동시에 밀어 경주를 시켜봅니다.',
  goal: '무거운 카트의 질량을 정하고 ▶ 실행. 같은 힘으로 미는데 어느 쪽이 먼저 결승선에 도착하는지 보세요.',
  predict: {
    q: '완전히 같은 힘으로 동시에 밀면?',
    choices: ['동시에 도착한다 — 힘이 같으니까', '가벼운 카트가 먼저 도착한다', '무거운 카트가 먼저 도착한다'],
    correct: 1,
  },
  sliders: [
    { key: 'heavy', label: '무거운 카트의 질량', min: 2, max: 8, step: 1, init: 4,
      fmt: v => `가벼운 카트의 ${v}배`, hint: '차이를 키우면 결과가 더 확실해집니다' },
  ],
  build(p) {
    const lane1 = make.platform(500, 300, 940, 16, 0, { friction: 0.001 });
    const lane2 = make.platform(500, 520, 940, 16, 0, { friction: 0.001 });
    const light = make.box(80, 300 - 8 - 20, 54, 40, { friction: 0.001, frictionAir: 0.004, render: { fillStyle: COLORS.ball } });
    const heavy = make.box(80, 520 - 8 - 20, 54, 40, { friction: 0.001, frictionAir: 0.004, density: 0.001 * p.heavy, render: { fillStyle: COLORS.ball2 } });
    const F = 0.0006;
    const data = {};
    return {
      bodies: [lane1, lane2, light, heavy],
      focus: light, vectorBodies: [light, heavy],
      markers: [
        { type: 'vline', x: 880, label: '결승선', color: '#5fc08f' },
        { type: 'text', x: 30, y: 260, label: '가벼운 카트', color: '#e0a35c' },
        { type: 'text', x: 30, y: 478, label: `무거운 카트 (×${p.heavy})`, color: '#6aa9e0' },
      ],
      data,
      onTick(sim) {
        if (light.position.x < 880) Body.applyForce(light, light.position, { x: F, y: 0 });
        if (heavy.position.x < 880) Body.applyForce(heavy, heavy.position, { x: F, y: 0 });
        if (data.tLight == null && light.position.x >= 880) data.tLight = sim.time;
        if (data.tHeavy == null && heavy.position.x >= 880) data.tHeavy = sim.time;
        if ((data.tLight != null && data.tHeavy != null) || sim.time > 14) sim.finish('done');
      },
    };
  },
  result(key, data) {
    const t1 = data.tLight?.toFixed(1) ?? '—', t2 = data.tHeavy?.toFixed(1) ?? '(시간 초과)';
    return {
      title: '가벼운 카트의 완승',
      body: `가벼운 카트 ${t1}초, 무거운 카트 ${t2}초.\n힘은 완전히 같았습니다. 다른 것은 질량뿐 — 질량이 클수록 같은 힘으로도 속도가 붙는 정도(가속도)가 작아집니다.`,
    };
  },
  explain: {
    feel: '무거울수록 “밀리는 반응”이 둔합니다. 질량은 물체가 속도 변화에 저항하는 정도입니다.',
    concept: '같은 힘을 주어도 질량이 4배면 가속도는 1/4이 됩니다. 무거운 카트가 느린 게 아니라, 속도가 “붙는 속도”가 느린 것입니다. 시간이 충분하면 무거운 카트도 같은 속도에 도달할 수 있습니다.',
    formula: { expr: 'F = m × a   →   a = F ÷ m',
      text: '"미는 힘 = 질량 × 속도가 붙는 정도". 힘(F)이 같을 때 질량(m)이 커지면 가속도(a)는 그만큼 작아집니다. 뉴턴 제2법칙입니다.' },
  },
  quiz: { q: '같은 힘이면, 질량이 클수록 속도가 붙는 것이 느리다.', a: true,
    why: '맞습니다. a = F ÷ m — 질량이 분모에 있으니, 질량이 클수록 가속도는 작아집니다.' },
},

{
  id: 'c2m2', ch: 2, title: '더 세게 밀면 어떻게 될까', tag: 'F=ma · 힘',
  scene: '이번엔 카트는 그대로 두고, 미는 힘을 바꿔봅니다.\n\n힘을 키우면 정확히 무엇이 달라질까요? “빨라진다”는 건 알지만, 어떻게 빨라지는 걸까요?',
  goal: '미는 힘을 바꿔가며 실행해 보세요. 오른쪽 속도 그래프의 기울기가 어떻게 변하는지가 관전 포인트입니다.',
  predict: {
    q: '미는 힘을 2배로 키우면?',
    choices: ['속도가 붙는 빠르기(가속도)가 2배가 된다', '최고 속도만 2배가 되고, 붙는 빠르기는 같다', '아무 것도 달라지지 않는다'],
    correct: 0,
  },
  sliders: [
    { key: 'force', label: '미는 힘', min: 4, max: 20, step: 2, init: 8,
      fmt: v => `${v} (임의 단위)`, hint: '그래프의 기울기를 비교해 보세요' },
  ],
  build(p) {
    const ground = make.ground(GROUND_TOP, 3000, { friction: 0.001 });
    const crate = make.box(80, GROUND_TOP - 24, 52, 48, { friction: 0.001, frictionAir: 0, render: { fillStyle: COLORS.ball } });
    const data = {};
    return {
      bodies: [ground, crate],
      focus: crate, vectorBodies: [crate],
      markers: [{ type: 'vline', x: 880, label: '측정선', color: '#5fc08f' }],
      data,
      extraVectors(sim) {
        if (sim.phase === 'running' && crate.position.x < 880)
          return [{ x: crate.position.x - 40, y: crate.position.y, dx: 34 + p.force * 2, dy: 0, color: '#5fc08f', label: '미는 힘' }];
        return [];
      },
      onTick(sim) {
        if (crate.position.x < 880) {
          Body.applyForce(crate, crate.position, { x: p.force * 0.00006, y: 0 });
        } else if (data.t == null) {
          data.t = sim.time;
          data.v = Math.abs(crate.velocity.x);
          sim.finish('done');
        }
        if (sim.time > 14) sim.finish('done');
      },
      readout(sim) {
        return [
          { label: '현재 속도', value: (Math.abs(crate.velocity.x) * 60 / PXM).toFixed(1) + ' m/s' },
          { label: '경과 시간', value: sim.time.toFixed(1) + ' s' },
        ];
      },
    };
  },
  result(key, data) {
    return {
      title: `${data.t?.toFixed(1) ?? '—'}초 만에 측정선 통과`,
      body: `도달 속도는 약 ${((data.v ?? 0) * 60 / PXM).toFixed(1)}m/s.\n힘을 바꿔 다시 실험해 보세요. 힘이 2배면 같은 시간에 속도가 2배로 붙습니다 — 즉 변하는 것은 “속도가 붙는 빠르기”, 가속도입니다.`,
      retry: true,
    };
  },
  explain: {
    feel: '힘은 속도가 아니라 “속도의 변화”를 만듭니다. 세게 밀수록 그래프가 가파르게 올라갑니다.',
    concept: '엑셀을 밟는 것은 자동차에 힘을 가하는 일입니다. 밟는 순간 속도가 정해지는 게 아니라, 속도가 “차오르는 기울기”가 정해집니다. 그래서 힘을 오래 가할수록 속도는 계속 쌓입니다.',
    formula: { expr: 'a = F ÷ m,   v = a × t',
      text: '가속도(a)는 힘에 비례합니다. 힘 2배 → 가속도 2배 → 같은 시간 뒤 속도도 2배. 그래프의 기울기가 정확히 가속도입니다.' },
  },
  quiz: { q: '힘을 두 배로 하면 (질량이 같을 때) 가속도도 두 배가 된다.', a: true,
    why: '맞습니다. F = ma에서 m이 고정이면 F와 a는 정비례합니다.' },
},

{
  id: 'c2m3', ch: 2, title: '볼링공과 테니스공, 동시에 떨어뜨리면', tag: '자유낙하 · 오개념 깨기', badge: 'b_heavy',
  scene: '옥상에서 볼링공과 테니스공을 동시에 놓는다면? 대부분 “무거운 볼링공이 먼저”라고 답합니다. 아리스토텔레스도 그렇게 믿었고, 2천 년간 상식이었습니다.\n\n갈릴레이가 피사의 사탑에서 했다고 전해지는 그 실험, 직접 해봅시다. (공기 저항은 없다고 가정합니다.)',
  goal: '높이를 정하고 ▶ 실행. 두 공이 바닥에 닿는 시각을 비교합니다.',
  predict: {
    q: '(공기 저항이 없을 때) 어느 쪽이 먼저 땅에 닿을까요?',
    choices: ['무거운 볼링공', '가벼운 테니스공', '거의 정확히 동시에'],
    correct: 2,
  },
  sliders: [
    { key: 'h', label: '떨어뜨리는 높이', min: 150, max: 440, step: 10, init: 380,
      fmt: v => (v / PXM).toFixed(1) + ' m', hint: '높이가 높을수록 차이가 나야 할 텐데…?' },
  ],
  build(p) {
    const ground = make.ground();
    const y0 = GROUND_TOP - p.h;
    const tennis = make.ball(420, y0, 13, { density: 0.0004, frictionAir: 0, render: { fillStyle: '#b8e07a' } });
    const bowling = make.ball(580, y0, 27, { density: 0.006, frictionAir: 0, render: { fillStyle: '#8fa3c0' } });
    const data = {};
    return {
      bodies: [ground, tennis, bowling],
      focus: bowling, vectorBodies: [tennis, bowling],
      markers: [
        { type: 'text', x: 395, y: y0 - 40, label: '테니스공', color: '#b8e07a' },
        { type: 'text', x: 552, y: y0 - 52, label: '볼링공', color: '#8fa3c0' },
      ],
      data,
      onTick(sim) {
        if (data.t1 == null && tennis.position.y > GROUND_TOP - 13 - 3) data.t1 = sim.time;
        if (data.t2 == null && bowling.position.y > GROUND_TOP - 27 - 3) data.t2 = sim.time;
        if ((data.t1 != null && data.t2 != null) || sim.time > 8) sim.finish('same');
      },
    };
  },
  result(key, data) {
    const d = Math.abs((data.t1 ?? 0) - (data.t2 ?? 0));
    return {
      title: '거의 완벽하게 동시',
      body: `착지 시각 차이: ${d.toFixed(2)}초.\n무게가 15배 가까이 차이 나는데도 동시에 떨어집니다. 1971년 아폴로 15호 우주인은 공기 없는 달에서 망치와 깃털을 동시에 떨어뜨렸고 — 정말 동시에 닿았습니다.`,
    };
  },
  explain: {
    feel: '무거운 물체는 당기는 중력도 크지만, 그만큼 움직이기도 어렵습니다(질량). 두 효과가 정확히 상쇄됩니다.',
    concept: '볼링공은 중력을 15배 세게 받지만, 가속시키기도 15배 어렵습니다. 나누면 똑같아지죠. 일상에서 깃털이 늦게 떨어지는 것은 무게 때문이 아니라 공기 저항 때문입니다.',
    formula: { expr: 'a = F ÷ m = (m × g) ÷ m = g',
      text: '중력(F)은 질량에 비례(m×g)하는데, 가속도는 힘을 질량으로 나눈 값. 질량이 약분되어 모든 물체의 낙하 가속도는 똑같이 g(약 9.8m/s²)가 됩니다.' },
  },
  quiz: { q: '공기가 없는 달에서는 망치와 깃털이 동시에 떨어진다.', a: true,
    why: '맞습니다. 아폴로 15호에서 실제로 실험했고, 정확히 동시에 떨어졌습니다. 유튜브에 영상도 남아 있습니다.' },
},

/* ═══════════════ Ch.3 작용-반작용 ═══════════════ */
{
  id: 'c3m1', ch: 3, title: '스케이트장에서 벽 밀기', tag: '작용-반작용',
  scene: '스케이트를 신고 빙판 위에서 벽을 힘껏 밀어봅니다. 벽은 꿈쩍도 하지 않는데… 내 몸은?\n\n마찰이 거의 없는 얼음판이라 힘의 효과가 그대로 드러납니다.',
  goal: '미는 힘을 정하고 ▶ 실행. 벽을 미는 순간 나에게 무슨 일이 일어나는지 화살표를 켜고 보세요.',
  predict: {
    q: '움직이지 않는 벽을 밀면, 나는?',
    choices: ['아무 일도 일어나지 않는다 — 벽이 안 움직였으니까', '뒤로 밀려난다', '벽 쪽으로 끌려간다'],
    correct: 1,
  },
  sliders: [
    { key: 'push', label: '미는 힘', min: 3, max: 11, step: 1, init: 6,
      fmt: v => v < 5 ? '살짝' : v < 9 ? '힘껏' : '온 힘을 다해', hint: '' },
  ],
  build(p) {
    const ground = make.ground(GROUND_TOP, 3000, { friction: 0.0005 });
    const person = make.box(618, GROUND_TOP - 36, 40, 72, { friction: 0.0005, frictionAir: 0.005, render: { fillStyle: COLORS.ball } });
    const wall = make.wall(680, GROUND_TOP - 110, 36, 220);
    const st = { pushed: false, showArrows: 0 };
    const data = {};
    return {
      bodies: [ground, person, wall],
      focus: person, vectorBodies: [person],
      markers: [{ type: 'text', x: 660, y: 300, label: '벽', color: '#98a3b6' }],
      data,
      onStart(sim) { st.showArrows = 50; },
      extraVectors() {
        if (st.showArrows > 0) return [
          { x: 645, y: 470, dx: 46, dy: 0, color: '#e0a35c', label: '내가 벽을 민다' },
          { x: 662, y: 505, dx: -46, dy: 0, color: '#6aa9e0', label: '벽이 나를 민다' },
        ];
        return [];
      },
      onTick(sim) {
        if (st.showArrows > 0) st.showArrows--;
        if (!st.pushed && sim.time > 0.35) {
          st.pushed = true;
          Body.setVelocity(person, { x: -p.push, y: 0 });
        }
        if (person.position.x < 110 || (st.pushed && Math.abs(person.velocity.x) < 0.08) || sim.time > 10) {
          data.dist = 618 - person.position.x;
          sim.finish('recoil');
        }
      },
    };
  },
  result(key, data) {
    return {
      title: '내가 뒤로 밀려났습니다',
      body: `벽은 1mm도 움직이지 않았지만, 나는 ${m(data.dist ?? 0)}m나 뒤로 밀려났습니다.\n내가 벽을 미는 순간, 벽도 정확히 같은 크기의 힘으로 나를 되밀었기 때문입니다. 힘은 언제나 쌍으로 존재합니다.`,
    };
  },
  explain: {
    feel: '민다는 것은 일방적인 행동이 아닙니다. 미는 순간, 나도 정확히 같은 힘으로 밀리고 있습니다.',
    concept: '벽이 안 움직인 건 벽이 건물에 단단히 붙어 있기 때문이지, 힘을 안 받아서가 아닙니다. 반면 나는 얼음판 위라 붙잡아줄 마찰이 없으니, 되미는 힘이 고스란히 내 몸을 움직입니다. 걷기, 수영, 헤엄 모두 이 원리입니다 — 바닥을 뒤로 밀어야 몸이 앞으로 갑니다.',
    formula: { expr: 'F(내가 벽에) = −F(벽이 나에게)',
      text: '뉴턴 제3법칙. 두 힘은 크기가 같고 방향이 반대이며, 서로 다른 물체에 작용합니다. 그래서 상쇄되지 않고 각자의 물체를 밀어냅니다.' },
  },
  quiz: { q: '내가 벽을 미는 힘과 벽이 나를 되미는 힘은 크기가 같다.', a: true,
    why: '맞습니다. 세게 밀수록 되미는 힘도 정확히 그만큼 커집니다. 그래서 세게 밀수록 내가 더 빨리 밀려납니다.' },
},

{
  id: 'c3m2', ch: 3, title: '얼음판에서 공 던지기', tag: '작용-반작용 · 운동량',
  scene: '이번에도 빙판 위. 손에 든 공을 앞으로 힘껏 던지면, 내 몸은 어떻게 될까요?\n\n노 젓기, 수영, 총의 반동이 모두 이 실험 안에 들어 있습니다.',
  goal: '공의 무게를 바꿔가며 던져 보세요. 공이 무거울수록 내 몸이 어떻게 되는지 관찰하세요.',
  predict: {
    q: '더 무거운 공을 던질수록, 나는?',
    choices: ['더 세게 뒤로 밀려난다', '밀려나는 정도는 공 무게와 상관없다', '오히려 앞으로 딸려간다'],
    correct: 0,
  },
  sliders: [
    { key: 'bm', label: '공의 무게', min: 1, max: 10, step: 1, init: 3,
      fmt: v => v <= 2 ? '야구공쯤' : v <= 6 ? '볼링공쯤' : '메디신볼', hint: '' },
  ],
  build(p) {
    const ground = make.ground(GROUND_TOP, 3000, { friction: 0.0005 });
    const person = make.box(400, GROUND_TOP - 36, 40, 72, { friction: 0.0005, frictionAir: 0.004, density: 0.004, render: { fillStyle: COLORS.ball } });
    const ball = make.ball(440, GROUND_TOP - 90, 15, { density: 0.001 * p.bm, frictionAir: 0.002, render: { fillStyle: COLORS.ball2 } });
    const st = { thrown: false };
    const data = {};
    return {
      bodies: [ground, person, ball],
      focus: person, vectorBodies: [person, ball],
      data,
      onTick(sim) {
        if (!st.thrown && sim.time > 0.3) {
          st.thrown = true;
          const v = 11;
          Body.setVelocity(ball, { x: v, y: -1.5 });
          const recoil = v * ball.mass / person.mass;
          Body.setVelocity(person, { x: -recoil, y: 0 });
          data.recoil = recoil;
        }
        if (sim.time > 4.5 || person.position.x < 60) sim.finish('done');
      },
      readout() {
        return [
          { label: '공 속도', value: (Math.abs(ball.velocity.x) * 60 / PXM).toFixed(1) + ' m/s' },
          { label: '내 반동 속도', value: (Math.abs(person.velocity.x) * 60 / PXM).toFixed(1) + ' m/s' },
        ];
      },
    };
  },
  result(key, data) {
    return {
      title: '던진 만큼 밀려납니다',
      body: `공을 앞으로 던지는 순간, 몸은 초속 약 ${((data.recoil ?? 0) * 60 / PXM).toFixed(1)}m로 뒤로 밀려났습니다.\n공을 미는 내 힘과, 공이 나를 되미는 힘이 정확히 같기 때문입니다. 공이 무거울수록 반동도 커집니다 — 다시 실험으로 확인해 보세요.`,
      retry: true,
    };
  },
  explain: {
    feel: '무언가를 앞으로 밀어내면, 나는 반드시 뒤로 밀립니다. 내보내는 것이 무겁고 빠를수록 반동도 큽니다.',
    concept: '노를 저으면 물을 뒤로 밀고, 물이 배를 앞으로 밉니다. 수영도 걷기도 같습니다. 우리가 앞으로 가는 모든 방법은 사실 “무언가를 뒤로 밀기”입니다.',
    formula: { expr: 'm₁v₁ = m₂v₂ (운동량 보존)',
      text: '(공의 질량 × 공의 속도) = (내 질량 × 내 반동 속도). 내가 공보다 20배 무겁다면 반동 속도는 공의 1/20이 됩니다.' },
  },
  quiz: { q: '노를 뒤로 저으면, 물이 배를 앞으로 밀어준다.', a: true,
    why: '맞습니다. 배를 앞으로 미는 것은 노가 아니라 물입니다. 노는 물을 뒤로 밀고, 물이 그 반작용으로 배를 앞으로 밉니다.' },
},

{
  id: 'c3m3', ch: 3, title: '로켓은 무엇을 밀고 나는가', tag: '작용-반작용 · 오개념 깨기', badge: 'b_rocket',
  scene: '“로켓은 내뿜은 가스가 공기를 밀어서 난다”는 설명, 어딘가 그럴듯합니다. 실제로 20세기 초 뉴욕타임스는 “공기가 없는 우주에서 로켓은 날 수 없다”며 로켓 과학자를 비웃는 사설을 냈습니다.\n\n(달 착륙 다음 날, 신문은 공식 정정 기사를 실었습니다.)',
  goal: '분사 세기를 바꿔가며 발사해 보세요. 로켓을 띄우려면 분사가 얼마나 세야 할까요?',
  predict: {
    q: '공기가 전혀 없는 우주에서, 로켓은 날 수 있을까요?',
    choices: ['못 난다 — 밀어낼 공기가 없으니까', '날 수 있다 — 내뿜는 가스 자체가 로켓을 민다'],
    correct: 1,
  },
  sliders: [
    { key: 'thrust', label: '가스 분사 세기', min: 0.5, max: 2.4, step: 0.1, init: 1.6,
      fmt: v => v < 1 ? '약함 (중력보다 작음)' : v < 1.3 ? '중력과 비슷' : '강함', hint: '1.0이 로켓 무게와 같은 힘' },
  ],
  build(p) {
    const ground = make.ground();
    const pad = make.platform(500, GROUND_TOP - 8, 120, 16);
    const rocket = make.box(500, GROUND_TOP - 16 - 40, 34, 80, { frictionAir: 0.008, render: { fillStyle: '#d8dee9' } });
    const particles = [];
    const st = { fuel: 2.4, emitTick: 0, maxRise: 0 };
    const data = {};
    return {
      bodies: [ground, pad, rocket],
      focus: rocket, vectorBodies: [rocket],
      data,
      extraVectors(sim) {
        if (st.fuel > 0 && sim.phase === 'running')
          return [{ x: rocket.position.x + 30, y: rocket.position.y + 40, dx: 0, dy: 40, color: '#e0a35c', label: '가스를 아래로' },
                  { x: rocket.position.x - 30, y: rocket.position.y - 10, dx: 0, dy: -40, color: '#6aa9e0', label: '가스가 로켓을 위로' }];
        return [];
      },
      onTick(sim) {
        if (st.fuel > 0) {
          st.fuel -= 1 / 60;
          Body.applyForce(rocket, rocket.position, { x: 0, y: -rocket.mass * 0.001 * p.thrust });
          if (++st.emitTick % 3 === 0) {
            const pt = Bodies.circle(rocket.position.x + (Math.random() * 16 - 8), rocket.position.y + 46, 3, {
              frictionAir: 0.03, collisionFilter: { mask: 0 },
              render: { fillStyle: Math.random() > 0.5 ? '#e0a35c' : '#dd7a72' },
            });
            Body.setVelocity(pt, { x: Math.random() * 2 - 1, y: 5 + Math.random() * 3 });
            particles.push({ b: pt, life: 40 });
            Composite.add(sim.engine.world, pt);
          }
        }
        particles.forEach(o => o.life--);
        while (particles.length && particles[0].life <= 0) Composite.remove(sim.engine.world, particles.shift().b);
        st.maxRise = Math.max(st.maxRise, (GROUND_TOP - 56) - rocket.position.y);
        if ((st.fuel <= 0 && rocket.velocity.y >= 0 && sim.time > 1) || rocket.position.y < 60 || sim.time > 8) {
          data.rise = st.maxRise;
          sim.finish(st.maxRise > 60 ? 'fly' : 'nofly');
        }
      },
      readout() {
        return [
          { label: '남은 연료', value: Math.max(0, st.fuel).toFixed(1) + ' s' },
          { label: '상승 높이', value: m(Math.max(0, st.maxRise)) + ' m' },
        ];
      },
    };
  },
  result(key, data) {
    if (key === 'fly') return {
      title: `이륙! 최고 ${m(data.rise)}m 상승`,
      body: '로켓을 띄운 것은 공기가 아니라, 내뿜은 가스의 반작용입니다.\n로켓이 가스를 아래로 힘껏 밀어내면, 가스도 로켓을 위로 되밉니다. 밀어낼 “대상”을 로켓이 직접 싣고 다니는 셈이라, 진공인 우주에서 오히려 더 잘 납니다.',
    };
    return {
      title: '분사가 약해서 뜨지 못했습니다',
      body: '가스가 로켓을 위로 미는 힘이 로켓을 아래로 당기는 중력보다 커야 이륙합니다.\n분사 세기를 1.0 이상으로 올려 다시 발사해 보세요.',
      retry: true,
    };
  },
  explain: {
    feel: '풍선을 불었다 놓으면 공기를 내뿜으며 날아갑니다. 로켓은 정교하게 만든 풍선입니다.',
    concept: '앞 미션의 “얼음판에서 공 던지기”와 정확히 같은 원리입니다. 공(가스)을 아래로 던지면 나(로켓)는 위로 밀려납니다. 공기는 필요 없습니다 — 오히려 공기는 로켓을 방해하는 저항일 뿐입니다.',
    formula: { expr: '추력 > 무게 (mg) 일 때 이륙',
      text: '가스를 내뿜어 얻는 힘(추력)이 로켓 무게보다 커야 위로 가속됩니다. 슬라이더의 1.0이 정확히 그 경계였습니다.' },
  },
  quiz: { q: '로켓은 내뿜은 가스로 지구의 공기를 밀어내며 난다.', a: false,
    why: '아닙니다. 로켓은 가스를 밀고, 가스가 로켓을 됩니다. 공기가 없는 우주에서 로켓이 나는 이유입니다.' },
},

/* ═══════════════ Ch.4 마찰과 포물선 ═══════════════ */
{
  id: 'c4m1', ch: 4, title: '빗길 제동거리의 진실', tag: '마찰 · 오개념 깨기', badge: 'b_brake',
  scene: '운전면허 교재의 단골 문제. “속도가 2배가 되면 제동거리는 몇 배가 될까?”\n\n감으로는 2배일 것 같지만… 자동차를 직접 세워보며 확인합시다. 노면 상태도 바꿔볼 수 있습니다.',
  goal: '속도와 노면을 정하고 ▶ 실행. 빨간 선에서 브레이크가 작동합니다. 속도 60→120으로 바꿔 거리를 비교해 보세요.',
  predict: {
    q: '속도를 2배로 올리면, 제동거리는?',
    choices: ['2배가 된다', '4배가 된다', '속도와 상관없이 같다'],
    correct: 1,
  },
  sliders: [
    { key: 'v', label: '주행 속도', min: 6, max: 20, step: 1, init: 10, fmt: v => Math.round(v * 6) + ' km/h', hint: '' },
    { key: 'surf', label: '노면 상태', min: 0, max: 2, step: 1, init: 0,
      fmt: v => ['마른 도로', '빗길', '빙판길'][v], hint: '빗길 마찰은 마른 도로의 절반 이하' },
  ],
  build(p) {
    const MU = [0.0020, 0.0008, 0.00025][p.surf];
    const ground = make.ground(GROUND_TOP, 3000, { friction: 0.9 });
    const car = make.box(70, GROUND_TOP - 18, 62, 32, { friction: 0.001, frictionAir: 0, render: { fillStyle: COLORS.ball } });
    const st = { braking: false };
    const data = { dist: 0 };
    return {
      bodies: [ground, car],
      focus: car, vectorBodies: [car],
      markers: [{ type: 'vline', x: 300, label: '브레이크!', color: '#dd7a72' }],
      data,
      onStart() { Body.setVelocity(car, { x: p.v, y: 0 }); },
      onTick(sim) {
        if (!st.braking && car.position.x >= 300) st.braking = true;
        if (st.braking) {
          data.dist = car.position.x - 300;
          if (car.velocity.x > 0.1) {
            Body.applyForce(car, car.position, { x: -car.mass * MU, y: 0 });
          } else {
            Body.setVelocity(car, { x: 0, y: 0 });
            sim.finish('stopped');
          }
        }
        if (car.position.x > 965) sim.finish('crash');
      },
      readout() {
        return [
          { label: '속도', value: Math.round(Math.abs(car.velocity.x) * 6) + ' km/h' },
          { label: '제동거리', value: st.braking ? m(data.dist) + ' m' : '—' },
        ];
      },
    };
  },
  result(key, data) {
    if (key === 'crash') return {
      title: '멈추지 못하고 화면을 벗어났습니다',
      body: '이 노면과 속도로는 화면 안에서 정지가 불가능했습니다. 빗길·빙판에서 감속이 왜 필수인지 몸으로 보여주는 결과입니다. 속도를 낮추거나 노면을 바꿔 다시 실험해 보세요.',
      retry: true,
    };
    return {
      title: `제동거리 ${m(data.dist)}m`,
      body: `기록해 두세요: 이 조건에서 ${m(data.dist)}m.\n이제 속도만 2배로 올려 다시 실험해 보면 — 거리는 2배가 아니라 4배 가까이 늘어납니다. 속도의 “제곱”이 문제이기 때문입니다.`,
      retry: true,
    };
  },
  explain: {
    feel: '속도를 조금만 올려도 제동거리는 훨씬 크게 늘어납니다. 과속이 위험한 이유는 “조금 더 빨라서”가 아니라 “제곱으로 위험해져서”입니다.',
    concept: '멈춘다는 것은 자동차의 운동에너지를 마찰(브레이크)로 전부 없애는 일입니다. 그런데 운동에너지는 속도의 제곱에 비례합니다. 속도 2배 → 없애야 할 에너지 4배 → 거리 4배. 빗길은 마찰 자체가 절반이라 여기에 다시 2배가 곱해집니다.',
    formula: { expr: '제동거리 = v² ÷ (2μg)',
      text: '분자에 v²(속도의 제곱)이 있습니다. 60→120km/h면 거리 4배, 60→180km/h면 9배. μ(마찰계수)는 분모라서, 빗길(μ 절반)이면 거리는 다시 2배.' },
  },
  quiz: { q: '속도가 3배가 되면 제동거리는 9배가 된다.', a: true,
    why: '맞습니다. 제동거리는 속도의 제곱에 비례합니다. 3² = 9배. 고속도로에서 차간거리를 훨씬 크게 잡아야 하는 이유입니다.' },
},

{
  id: 'c4m2', ch: 4, title: '눈썰매장의 과학', tag: '마찰 · 경사면',
  scene: '같은 미끄럼틀에서 내려왔는데 어떤 썰매는 저 멀리까지 가고, 어떤 썰매는 바로 앞에 멈춥니다.\n\n출발 높이는 똑같이 두고, 바닥 표면만 바꿔가며 어디까지 가는지 실험해 봅니다.',
  goal: '표면을 바꿔가며 공을 굴려 보세요. 도착 거리가 어떻게 달라지는지, 에너지 그래프(수식 모드)도 함께 보세요.',
  predict: {
    q: '같은 높이에서 출발했는데 멈추는 지점이 다른 이유는?',
    choices: ['썰매의 무게가 달라서', '표면 마찰이 운동에너지를 조금씩 빼앗아서', '내려오는 자세가 달라서'],
    correct: 1,
  },
  sliders: [
    { key: 'rough', label: '바닥 표면', min: 0.001, max: 0.02, step: 0.001, init: 0.008,
      fmt: v => v < 0.004 ? '반질반질한 눈' : v < 0.012 ? '보통 눈' : '질척한 눈', hint: '' },
  ],
  build(p) {
    const ground = make.ground();
    const ramp = rampFromTo(120, 240, 430, GROUND_TOP - 6);
    const ball = make.ball(140, 215, 17, { frictionAir: p.rough, friction: 0.03 });
    const data = {};
    return {
      bodies: [ground, ramp, ball],
      focus: ball, vectorBodies: [ball],
      markers: [{ type: 'vline', x: 430, label: '경사 끝', color: '#98a3b6' }],
      data,
      onTick(sim) {
        if (ball.position.x > 955) { data.dist = ball.position.x - 430; sim.finish('far'); }
        else if (sim.time > 1 && Math.hypot(ball.velocity.x, ball.velocity.y) < 0.15) {
          data.dist = Math.max(0, ball.position.x - 430); sim.finish('stop');
        }
      },
    };
  },
  result(key, data) {
    if (key === 'far') return {
      title: '화면 끝까지 미끄러졌습니다',
      body: '마찰이 작으니 경사에서 얻은 운동에너지가 거의 줄지 않고 유지됐습니다. 스키 왁싱을 하는 이유가 바로 이것입니다.',
    };
    return {
      title: `경사 끝에서 ${m(data.dist)}m 더 가고 멈춤`,
      body: '내려오며 얻은 에너지를 마찰이 열로 바꿔가며 조금씩 빼앗았습니다. 표면을 더 매끄럽게 해서 다시 실험해 보세요 — 같은 높이인데 거리가 확 달라집니다.',
      retry: true,
    };
  },
  explain: {
    feel: '미끄러지다 멈추는 모든 것은 에너지를 마찰에게 “요금”처럼 내고 있습니다. 요금이 싼 표면일수록 멀리 갑니다.',
    concept: '경사에서 내려오며 높이(위치에너지)가 속도(운동에너지)로 바뀝니다. 평지에서는 마찰이 그 운동에너지를 열로 바꿔 없앱니다. 겨울에 손을 비비면 따뜻해지는 것과 같은 원리로, 사라진 에너지는 실제로 바닥과 썰매를 살짝 데웁니다.',
    formula: { expr: '마찰이 없앤 에너지 = 마찰력 × 미끄러진 거리',
      text: '가진 운동에너지가 다 없어질 때까지 미끄러집니다. 마찰력이 절반이면 같은 에너지로 2배 거리를 갈 수 있습니다.' },
  },
  quiz: { q: '마찰로 사라진 운동에너지는 주로 열이 된다.', a: true,
    why: '맞습니다. 에너지는 사라지지 않고 형태만 바뀝니다. 브레이크 디스크가 뜨거워지고, 성냥이 마찰로 불붙는 것이 그 증거입니다.' },
},

{
  id: 'c4m3', ch: 4, title: '3점슛의 각도', tag: '포물선 운동',
  scene: '버저비터 3점슛. 공은 손을 떠나는 순간부터 오직 중력만 받으며 포물선을 그립니다.\n\n각도와 세기를 조절해 링에 공을 넣어보세요. 몇 번 실패해도 괜찮습니다 — NBA 선수들도 절반은 놓칩니다.',
  goal: '각도와 세기를 조절해 초록 링에 공을 통과시키세요. 힘 화살표를 켜면 속도의 방향 변화가 보입니다.',
  predict: {
    q: '(같은 세기로 던질 때) 공을 가장 멀리 보내는 각도는?',
    choices: ['30도쯤 — 낮고 빠르게', '45도쯤 — 중간', '60도쯤 — 높이 띄워서'],
    correct: 1,
  },
  sliders: [
    { key: 'ang', label: '발사 각도', min: 20, max: 75, step: 1, init: 50, fmt: v => v + '°', hint: '' },
    { key: 'pow', label: '던지는 세기', min: 10, max: 21, step: 0.5, init: 15, fmt: v => v.toFixed(1), hint: '' },
  ],
  build(p) {
    const ground = make.ground();
    const stand = make.platform(140, GROUND_TOP - 20, 60, 40);
    const board = make.wall(806, 262, 12, 110);
    const ball = make.ball(140, GROUND_TOP - 40 - 16, 15, { restitution: 0.5, frictionAir: 0.0015 });
    const hoop = { x: 758, y: 282 };
    const data = {};
    return {
      bodies: [ground, stand, board, ball],
      focus: ball, vectorBodies: [ball],
      markers: [
        { type: 'ring', x: hoop.x, y: hoop.y, r: 27, label: '링' },
        { type: 'text', x: 100, y: 480, label: '발사대', color: '#98a3b6' },
      ],
      data,
      onStart() {
        const a = p.ang * Math.PI / 180;
        Body.setVelocity(ball, { x: Math.cos(a) * p.pow, y: -Math.sin(a) * p.pow });
      },
      onTick(sim) {
        const d = Math.hypot(ball.position.x - hoop.x, ball.position.y - hoop.y);
        if (d < 22 && ball.velocity.y > 0) sim.finish('goal');
        else if ((ball.position.y > GROUND_TOP - 24 && Math.hypot(ball.velocity.x, ball.velocity.y) < 1) ||
                 ball.position.x > 990 || ball.position.x < 5 || sim.time > 9) sim.finish('miss');
      },
    };
  },
  result(key) {
    if (key === 'goal') return {
      title: '🏀 깨끗하게 들어갔습니다!',
      body: '공이 그린 곡선이 포물선입니다. 손을 떠난 뒤 공의 옆 방향 속도는 그대로 유지되고(관성!), 위아래 속도만 중력이 계속 바꿉니다. 이 둘이 합쳐져 포물선이 됩니다.',
    };
    return {
      title: '아깝게 빗나갔습니다',
      body: '각도나 세기를 조금씩 조정해 다시 던져 보세요.\n팁: 너무 낮게 깔리면 세기를 줄이고 각도를 올려보세요. 링에 가까워질수록 미세 조정이 통합니다.',
      retry: true,
    };
  },
  explain: {
    feel: '던져진 공은 “앞으로는 하던 대로, 아래로는 점점 빠르게”. 두 움직임이 섞여 포물선이 됩니다.',
    concept: '공중의 공에 작용하는 힘은 (공기저항을 빼면) 중력 하나뿐입니다. 그래서 가로 속도는 일정하고 세로 속도만 변합니다. 45°가 (같은 세기일 때) 가로와 세로에 에너지를 딱 절반씩 나눠주는 최적의 타협점이라 가장 멀리 갑니다.',
    formula: { expr: '도달 거리 R = v² × sin(2θ) ÷ g',
      text: 'sin(2θ)는 θ=45°에서 최댓값 1이 됩니다. 30°와 60°는 sin값이 같아서 같은 거리에 떨어집니다 — 시험해 보세요.' },
  },
  quiz: { q: '공중에 뜬 공에는 (공기저항을 빼면) 아래로 당기는 중력만 작용한다.', a: true,
    why: '맞습니다. “앞으로 나아가는 힘”이 계속 작용하는 게 아니라, 관성으로 앞으로 가는 중에 중력이 아래로 당길 뿐입니다.' },
},

/* ═══════════════ Ch.5 에너지 ═══════════════ */
{
  id: 'c5m1', ch: 5, title: '롤러코스터 첫 언덕의 비밀', tag: '에너지 보존 · 오개념 깨기', badge: 'b_energy',
  scene: '롤러코스터는 처음에만 모터로 끌어올리고, 그 뒤로는 엔진 없이 끝까지 달립니다. 그래서 첫 언덕이 항상 제일 높습니다.\n\n출발 높이를 바꿔가며, 앞에 있는 언덕(높이 4.4m)을 넘을 수 있는지 실험해 보세요.',
  goal: '출발 높이를 정하고 ▶ 실행. 언덕 너머 깃발까지 도달하면 성공. 언덕보다 낮게 출발하면 어떻게 될까요?',
  predict: {
    q: '언덕(4.4m)보다 낮은 곳에서 출발하면, 빠르게 내려온 기세로 언덕을 넘을 수 있을까요?',
    choices: ['기세가 붙으면 넘을 수 있다', '마찰이 없어도 절대 못 넘는다'],
    correct: 1,
  },
  sliders: [
    { key: 'h', label: '출발 높이', min: 120, max: 400, step: 10, init: 180,
      fmt: v => (v / PXM).toFixed(1) + ' m', hint: '언덕 높이는 4.4m입니다' },
  ],
  build(p) {
    const ground = make.ground();
    const base = GROUND_TOP - 4, hillH = 220;
    // 부드러운 곡선 트랙: 내리막(코사인) → 골짜기 → 언덕(사인 범프) → 평지
    const f = (x) => {
      if (x < 430) { const t = (x - 90) / 340; return base - p.h * Math.cos(t * Math.PI / 2) ** 2; }
      if (x < 540) return base;
      if (x < 800) { const t = (x - 540) / 260; return base - hillH * Math.sin(t * Math.PI) ** 2; }
      return base;
    };
    const terrain = terrainCurve(f, 90, 950);
    const ball = make.ball(140, f(140) - 24, 16, { friction: 0.0002, frictionAir: 0.0002, restitution: 0 });
    const st = { slowTicks: 0 };
    const data = {};
    return {
      bodies: [ground, ...terrain, ball],
      focus: ball, vectorBodies: [ball],
      markers: [
        { type: 'flag', x: 880, y: GROUND_TOP, label: '도착' },
        { type: 'text', x: 618, y: GROUND_TOP - 236, label: '언덕 4.4m', color: '#98a3b6' },
      ],
      data,
      onStart() { Body.setVelocity(ball, { x: 1.5, y: 0 }); },
      onTick(sim) {
        if (ball.position.x > 855) sim.finish('clear');
        const sp = Math.hypot(ball.velocity.x, ball.velocity.y);
        if (sim.time > 2 && sp < 0.15) st.slowTicks++; else st.slowTicks = 0;
        if (st.slowTicks > 45 || sim.time > 15) sim.finish('stuck');
      },
    };
  },
  result(key, data, p) {
    if (key === 'clear') return {
      title: '언덕을 넘었습니다!',
      body: '출발 높이가 언덕보다 높았기에 가능했습니다. 높이는 “에너지 저금통”입니다. 출발점에서 저금한 에너지(위치에너지)보다 높은 곳으로는, 어떤 재주로도 올라갈 수 없습니다.',
    };
    return {
      title: '언덕 앞에서 되돌아왔습니다',
      body: '내려오며 얻은 속도(운동에너지)는 정확히 출발 높이만큼의 가치뿐입니다. 언덕을 오르며 그 에너지를 도로 높이로 바꾸다가, 출발 높이 근처에서 바닥나 되돌아온 것입니다.\n출발 높이를 언덕(4.4m)보다 높게 올려 다시 실험해 보세요.',
      retry: true,
    };
  },
  explain: {
    feel: '내리막에서 얻은 기세는 공짜가 아니라, 출발 높이에서 “인출”한 것입니다. 잔고 이상은 못 씁니다.',
    concept: '높이에 저장된 에너지(위치에너지)가 내려오며 속도(운동에너지)로 바뀌고, 언덕을 오르며 다시 높이로 바뀝니다. 총량은 (마찰 손실 빼고) 일정합니다. 그래서 롤러코스터의 모든 언덕은 첫 언덕보다 낮게 설계됩니다.',
    formula: { expr: 'mgh (높이 에너지) = ½mv² (속도 에너지)',
      text: '출발 높이 h가 도달 가능한 최대 높이를 결정합니다. 질량 m은 양변에서 약분됩니다 — 무거운 열차든 가벼운 열차든 같은 높이까지만 갑니다.' },
  },
  quiz: { q: '롤러코스터 첫 언덕이 가장 높은 이유는, 이후 모든 구간에 쓸 에너지를 처음에 저축해 두기 위해서다.', a: true,
    why: '맞습니다. 첫 언덕에서 저장한 위치에너지가 전체 코스의 “예산”입니다. 그 뒤의 어떤 언덕도 첫 언덕보다 높을 수 없습니다.' },
},

{
  id: 'c5m2', ch: 5, title: '그네는 왜 저절로 멈출까', tag: '에너지 손실',
  scene: '아이를 태운 그네, 한 번 밀어주면 한동안 왔다 갔다 하지만 결국 멈춥니다. 왕복할 때마다 조금씩 낮아지죠.\n\n골짜기에 공을 놓아 그네처럼 왕복시키며, 최고점이 어떻게 변하는지 지켜봅니다.',
  goal: '▶ 실행 후 공이 왕복하는 모습을 관찰하세요. 수식 모드에서 에너지 그래프를 보면 에너지가 “새는” 것이 보입니다.',
  predict: {
    q: '반대편으로 올라간 공은, 처음 출발한 높이보다 더 높이 올라갈 수 있을까요?',
    choices: ['탄력을 받으면 가능하다', '절대 불가능하다 — 잘해야 같은 높이'],
    correct: 1,
  },
  sliders: [
    { key: 'loss', label: '공기 저항·마찰', min: 0.0005, max: 0.008, step: 0.0005, init: 0.003,
      fmt: v => v < 0.002 ? '거의 없음' : v < 0.005 ? '보통' : '큼', hint: '값을 줄이면 훨씬 오래 왕복합니다' },
  ],
  build(p) {
    const ground = make.ground();
    const base = GROUND_TOP - 4, depth = 320;
    // 매끄러운 U자 골짜기 (포물선)
    const f = (x) => base - depth * (1 - Math.pow((x - 500) / 360, 2));
    const terrain = terrainCurve(f, 140, 860);
    const ball = make.ball(190, f(190) - 24, 16, { friction: 0.001, frictionAir: p.loss, restitution: 0 });
    const data = { peaks: [] };
    let lastVy = 0;
    return {
      bodies: [ground, ...terrain, ball],
      focus: ball, vectorBodies: [ball],
      markers: [{ type: 'text', x: 130, y: 205, label: '출발 높이', color: '#98a3b6' }],
      data,
      onTick(sim) {
        // 정점 감지: 위로 가다가 아래로 방향이 바뀌는 순간
        if (lastVy < -0.3 && ball.velocity.y >= 0) {
          data.peaks.push(GROUND_TOP - ball.position.y);
        }
        lastVy = ball.velocity.y;
        if (sim.time > 11 || (sim.time > 2 && Math.hypot(ball.velocity.x, ball.velocity.y) < 0.1)) sim.finish('decay');
      },
    };
  },
  result(key, data) {
    const peaks = data.peaks.slice(0, 4).map(h => m(h) + 'm').join(' → ');
    return {
      title: '왕복할 때마다 조금씩 낮아졌습니다',
      body: `정점 기록: ${peaks || '측정 중'}\n마찰과 공기 저항이 매 왕복마다 에너지를 조금씩 열로 가져갑니다. 그래서 그네는 저절로 멈추고, 절대 처음보다 높이 올라가지 못합니다. “영구기관”이 불가능한 이유이기도 합니다.`,
    };
  },
  explain: {
    feel: '에너지는 쓸수록 형태를 바꾸며 조금씩 “새어나갑니다”. 새는 곳은 언제나 마찰과 저항입니다.',
    concept: '높이 에너지와 속도 에너지가 서로 변환되며 왕복하지만, 매번 마찰이 수수료를 뗍니다. 그네를 계속 타려면 발을 구르거나 밀어주며 에너지를 보충해야 하죠. 참고로 진짜 진자시계는 태엽이 이 보충을 담당합니다.',
    formula: { expr: '이번 정점 높이 < 지난 정점 높이',
      text: '(높이E + 속도E)의 총합이 마찰이 가져간 만큼 매 왕복 줄어듭니다. 마찰이 0이면 총합이 보존되어 영원히 같은 높이로 왕복합니다.' },
  },
  quiz: { q: '마찰이 전혀 없다면, 그네는 영원히 같은 높이로 왕복한다.', a: true,
    why: '맞습니다. 에너지가 샐 곳이 없으니 총량이 보존됩니다. 실제로 마찰이 거의 없는 우주에서 지구는 46억 년째 태양을 돌고 있습니다.' },
},

{
  id: 'c5m3', ch: 5, title: '당구공의 운동량 전달', tag: '운동량 보존',
  scene: '당구에서 흰 공이 목적구를 정면으로 맞히면, 흰 공은 그 자리에 딱 멈추고 목적구가 대신 굴러갑니다. 마치 움직임을 “건네주는” 것처럼요.\n\n맞는 공의 무게를 바꿔가며 무엇이 전달되는지 실험해 봅니다.',
  goal: '먼저 같은 무게로 실행해 보세요. 그다음 상대 공을 무겁게 바꾸면 결과가 어떻게 달라질까요?',
  predict: {
    q: '같은 무게의 공을 정면으로 맞히면, 치고 간 공(주황)은?',
    choices: ['둘이 함께 굴러간다', '거의 멈추고, 맞은 공이 대신 굴러간다', '튕겨서 뒤로 되돌아온다'],
    correct: 1,
  },
  sliders: [
    { key: 'bm', label: '맞는 공(파랑)의 무게', min: 1, max: 6, step: 1, init: 1,
      fmt: v => v === 1 ? '같은 무게' : `${v}배 무거움`, hint: '무겁게 바꾸면 재미있는 일이…' },
  ],
  build(p) {
    const ground = make.ground(GROUND_TOP, 3000, { friction: 0.0005 });
    const a = make.ball(250, GROUND_TOP - 18, 18, { friction: 0.0005, frictionAir: 0.001, restitution: 0.95 });
    const b = make.ball(600, GROUND_TOP - 18, 18, { friction: 0.0005, frictionAir: 0.001, restitution: 0.95,
      density: 0.001 * p.bm, render: { fillStyle: COLORS.ball2 } });
    const data = {};
    return {
      bodies: [ground, a, b],
      focus: a, vectorBodies: [a, b],
      data,
      onStart() { Body.setVelocity(a, { x: 10, y: 0 }); },
      onTick(sim) {
        if (sim.time > 4 || b.position.x > 970) {
          data.va = a.velocity.x; data.vb = b.velocity.x;
          const key = Math.abs(data.va) < 1.2 ? 'transfer' : (data.va < -1 ? 'bounce' : 'both');
          sim.finish(key);
        }
      },
      readout() {
        return [
          { label: '주황 공 속도', value: (a.velocity.x * 60 / PXM).toFixed(1) + ' m/s' },
          { label: '파랑 공 속도', value: (b.velocity.x * 60 / PXM).toFixed(1) + ' m/s' },
        ];
      },
    };
  },
  result(key) {
    if (key === 'transfer') return {
      title: '움직임이 통째로 건너갔습니다',
      body: '주황 공은 거의 멈추고, 파랑 공이 거의 같은 속도로 굴러갑니다.\n무게가 같은 두 공의 정면 충돌에서는 운동량이 통째로 전달됩니다. 뉴턴의 요람(책상 위 쇠구슬 진자 장난감)이 바로 이 원리입니다.',
    };
    if (key === 'bounce') return {
      title: '주황 공이 튕겨 되돌아왔습니다',
      body: '상대가 훨씬 무거우면 운동량을 다 넘기지 못하고 일부를 “되돌려” 받습니다. 벽에 공을 던지면 되돌아오는 것의 부드러운 버전입니다. 무게를 같게 바꿔 다시 실험해 보세요.',
      retry: true,
    };
    return {
      title: '둘 다 앞으로 굴러갑니다',
      body: '상대가 가벼우면 밀어내고도 운동량이 남아 함께 앞으로 갑니다. 볼링공이 핀을 뚫고 지나가는 장면을 떠올려 보세요.',
      retry: true,
    };
  },
  explain: {
    feel: '움직임(운동량)은 사라지지 않고 물체 사이를 “이사”다닙니다. 충돌은 그 이사 과정입니다.',
    concept: '충돌 전 주황 공이 가진 운동량과, 충돌 후 두 공이 나눠 가진 운동량의 합은 같습니다. 무게가 같으면 통째로 전달, 상대가 무거우면 튕겨 나오고, 가벼우면 함께 갑니다 — 모두 같은 법칙의 세 가지 얼굴입니다.',
    formula: { expr: '충돌 전 (m×v)의 합 = 충돌 후 (m×v)의 합',
      text: '운동량 보존 법칙. 사실 작용-반작용(3법칙)의 다른 표현입니다 — 충돌하는 짧은 순간 두 공이 서로에게 준 힘이 정확히 같았기 때문입니다.' },
  },
  quiz: { q: '흰 공이 멈추고 목적구가 굴러간 것은, 운동량이 옮겨간 것이다.', a: true,
    why: '맞습니다. 움직임의 양(운동량)은 보존되며, 충돌을 통해 물체 사이를 이동할 수 있습니다.' },
},

];

export const byId = Object.fromEntries(MISSIONS.map(ms => [ms.id, ms]));
export function nextMission(id) {
  const i = MISSIONS.findIndex(ms => ms.id === id);
  return MISSIONS[i + 1] ?? null;
}
