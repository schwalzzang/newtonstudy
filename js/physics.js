// Matter.js 시뮬레이션 코어
// createSim(canvas) — 미션 화면과 자유 실험실이 각각 하나씩 만든다.
const M = window.Matter;
const { Engine, Render, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint } = M;

export const W = 1000, H = 600;
export const GROUND_TOP = 560;      // 기본 바닥 윗면 y
export const PXM = 50;              // 50px = 1m (표시용 환산)

export const COLORS = {
  ground: '#2b3242', body: '#8fa3c0', ball: '#e0a35c', ball2: '#6aa9e0',
  danger: '#dd7a72', good: '#5fc08f', wall: '#3a4358', cloth: '#b56576',
};

// ── 공용 몸체 팩토리 ──
export const make = {
  ground(y = GROUND_TOP, w = 3000, opts = {}) {
    return Bodies.rectangle(W / 2, y + 20, w, 40,
      { isStatic: true, label: 'ground', friction: 0.4, render: { fillStyle: COLORS.ground }, ...opts });
  },
  platform(x, y, w, h = 20, angle = 0, opts = {}) {
    return Bodies.rectangle(x, y, w, h,
      { isStatic: true, angle, label: 'terrain', friction: 0.4, render: { fillStyle: COLORS.ground }, ...opts });
  },
  wall(x, y, w = 30, h = 200, opts = {}) {
    return Bodies.rectangle(x, y, w, h,
      { isStatic: true, label: 'wall', render: { fillStyle: COLORS.wall }, ...opts });
  },
  ball(x, y, r = 18, opts = {}) {
    return Bodies.circle(x, y, r,
      { label: 'ball', friction: 0.05, frictionAir: 0, restitution: 0.2,
        render: { fillStyle: COLORS.ball }, ...opts });
  },
  box(x, y, w = 44, h = 44, opts = {}) {
    return Bodies.rectangle(x, y, w, h,
      { label: 'box', friction: 0.3, frictionAir: 0, restitution: 0.05,
        render: { fillStyle: COLORS.body }, ...opts });
  },
};

export function createSim(canvas) {
  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.y = 1;

  const render = Render.create({
    canvas, engine,
    options: {
      width: W, height: H, wireframes: false, background: 'transparent',
      showVelocity: false, pixelRatio: 1,
    },
  });
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  const sim = {
    engine, render, runner,
    scene: null,            // {bodies, focus, onTick, vectors, markers}
    phase: 'ready',         // ready | running | done
    slow: false,
    showVectors: false,
    time: 0,                // 실행 후 경과 시간(s)
    onFinish: null,         // (resultKey) => void
    onTickHook: null,       // (sim) => void  (그래프 샘플링 등)
    _finished: false,
  };

  engine.timing.timeScale = 0;   // ready 상태: 정지

  function applyTimeScale() {
    if (sim.phase === 'running') engine.timing.timeScale = sim.slow ? 0.3 : 1;
    else engine.timing.timeScale = 0;
  }

  sim.loadScene = (sceneObj) => {
    Composite.clear(engine.world, false);
    sim.scene = sceneObj;
    sim.phase = 'ready';
    sim.time = 0;
    sim._finished = false;
    Composite.add(engine.world, sceneObj.bodies);
    applyTimeScale();
    // ready 상태에서도 한 프레임 그려지도록 렌더는 항상 돈다
  };

  sim.run = () => { if (sim.phase === 'ready') { sim.phase = 'running'; applyTimeScale(); } };
  sim.pause = () => {
    if (sim.phase === 'running') { sim.phase = 'paused'; }
    else if (sim.phase === 'paused') { sim.phase = 'running'; }
    engine.timing.timeScale = (sim.phase === 'running') ? (sim.slow ? 0.3 : 1) : 0;
  };
  sim.setSlow = (v) => { sim.slow = v; applyTimeScale(); };
  sim.finish = (key) => {
    if (sim._finished) return;
    sim._finished = true;
    sim.phase = 'done';
    // 결과 화면 전에 잠깐 여운
    setTimeout(() => { engine.timing.timeScale = 0; sim.onFinish?.(key); }, 650);
  };
  sim.live = () => { sim.phase = 'running'; applyTimeScale(); };  // 자유 실험실: 항상 흐름

  // 미션 로직 tick
  Events.on(engine, 'beforeUpdate', () => {
    if (sim.phase !== 'running' || !sim.scene) return;
    sim.time += (1 / 60) * engine.timing.timeScale;
    sim.scene.onTick?.(sim);
    sim.onTickHook?.(sim);
  });

  // ── 오버레이 드로잉: 힘 화살표, 마커 ──
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    const sc = sim.scene;
    if (!sc) return;

    // 마커(제동선, 목표 깃발 등)
    sc.markers?.forEach(mk => drawMarker(ctx, mk));

    if (!sim.showVectors) return;
    const arrows = [];
    // 기본: focus 물체들의 속도 + 중력 화살표
    (sc.vectorBodies ?? (sc.focus ? [sc.focus] : [])).forEach(b => {
      if (!b || b.isStatic) return;
      const v = b.velocity, sp = Math.hypot(v.x, v.y);
      if (sp > 0.25) {
        arrows.push({ x: b.position.x, y: b.position.y, dx: v.x * 6, dy: v.y * 6,
          color: '#6aa9e0', label: '속도' });
      }
      arrows.push({ x: b.position.x, y: b.position.y, dx: 0, dy: Math.min(b.mass * 6, 70),
        color: '#dd7a72', label: '중력' });
    });
    sc.extraVectors?.(sim).forEach(a => arrows.push(a));
    arrows.forEach(a => drawArrow(ctx, a));
  });

  return sim;
}

function drawArrow(ctx, { x, y, dx, dy, color, label }) {
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const x1 = x + dx, y1 = y + dy;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.stroke();
  const a = Math.atan2(dy, dx), s = 9;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - s * Math.cos(a - 0.45), y1 - s * Math.sin(a - 0.45));
  ctx.lineTo(x1 - s * Math.cos(a + 0.45), y1 - s * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill();
  if (label) {
    ctx.font = '12px Pretendard, sans-serif';
    ctx.fillText(label, x1 + 6, y1 + 4);
  }
  ctx.restore();
}

function drawMarker(ctx, mk) {
  ctx.save();
  if (mk.type === 'vline') {
    ctx.strokeStyle = mk.color ?? '#dd7a72';
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mk.x, mk.y0 ?? 60); ctx.lineTo(mk.x, mk.y1 ?? GROUND_TOP); ctx.stroke();
    ctx.setLineDash([]);
    if (mk.label) { ctx.fillStyle = mk.color ?? '#dd7a72'; ctx.font = '13px Pretendard, sans-serif'; ctx.fillText(mk.label, mk.x + 6, (mk.y0 ?? 60) + 14); }
  } else if (mk.type === 'flag') {
    ctx.strokeStyle = '#5fc08f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mk.x, mk.y); ctx.lineTo(mk.x, mk.y - 46); ctx.stroke();
    ctx.fillStyle = '#5fc08f';
    ctx.beginPath(); ctx.moveTo(mk.x, mk.y - 46); ctx.lineTo(mk.x + 26, mk.y - 38); ctx.lineTo(mk.x, mk.y - 30); ctx.closePath(); ctx.fill();
    if (mk.label) { ctx.font = '13px Pretendard, sans-serif'; ctx.fillText(mk.label, mk.x - 12, mk.y + 18); }
  } else if (mk.type === 'ring') {
    ctx.strokeStyle = mk.color ?? '#5fc08f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mk.x, mk.y, mk.r ?? 28, 0, Math.PI * 2); ctx.stroke();
    if (mk.label) { ctx.fillStyle = mk.color ?? '#5fc08f'; ctx.font = '13px Pretendard, sans-serif'; ctx.fillText(mk.label, mk.x - 14, mk.y - (mk.r ?? 28) - 8); }
  } else if (mk.type === 'text') {
    ctx.fillStyle = mk.color ?? '#98a3b6'; ctx.font = (mk.size ?? 13) + 'px Pretendard, sans-serif';
    ctx.fillText(mk.label, mk.x, mk.y);
  }
  ctx.restore();
}

// 자유 실험실용 마우스 드래그
export function attachMouse(sim, canvas) {
  const mouse = Mouse.create(canvas);
  const mc = MouseConstraint.create(sim.engine, {
    mouse, constraint: { stiffness: 0.15, render: { visible: false } },
  });
  Composite.add(sim.engine.world, mc);
  // 캔버스 CSS 크기와 논리 크기 보정
  const fix = () => {
    const r = canvas.getBoundingClientRect();
    mouse.pixelRatio = r.width / W;
  };
  new ResizeObserver(fix).observe(canvas);
  fix();
  return mc;
}
