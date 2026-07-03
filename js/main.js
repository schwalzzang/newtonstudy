// 뉴턴 아카데미 — 부트스트랩 & 미션 흐름 오케스트레이션
import { state, save, setApiKey, recordMission, earnBadge } from './state.js';
import { $, toast, showOverlay, hideOverlay, showScreen, starHtml } from './ui.js';
import { createSim, attachMouse, make, W, H, GROUND_TOP, PXM } from './physics.js';
import { CHAPTERS, MISSIONS, BADGES, byId, nextMission } from './missions.js';
import { MiniChart } from './graphs.js';
import { askPrediction, askQuiz } from './quiz.js';
import { initTutor, openTutor, resetTutorSession } from './tutor.js';

const MODE_DESC = {
  feel: '수식 없이, 눈과 손으로만 탐험합니다.',
  concept: '힘 화살표와 그래프로 원리를 봅니다.',
  math: '측정값과 수식까지 — 차근차근 풀어서 보여드립니다.',
};

/* ═══════════ 시뮬레이션 준비 ═══════════ */
const sim = createSim($('stage'));
const chartSpeed = new MiniChart($('graph-speed'), [{ key: 'v', color: '#e0a35c' }]);
const chartEnergy = new MiniChart($('graph-energy'), [{ key: 'pe', color: '#6aa9e0' }, { key: 'ke', color: '#e0a35c' }]);

let cur = null;   // { ms, params, predictIdx, resultKey }
let tick = 0;

sim.onTickHook = (s) => {
  const f = s.scene?.focus;
  if (!f) return;
  tick++;
  if (tick % 3 === 0) {
    const spd = Math.hypot(f.velocity.x, f.velocity.y) * 60 / PXM;
    const pe = Math.max(0, (GROUND_TOP - f.position.y)) * f.mass;
    const ke = 0.5 * f.mass * Math.pow(Math.hypot(f.velocity.x, f.velocity.y) * 4, 2);
    chartSpeed.push([spd]); chartSpeed.draw();
    chartEnergy.push([pe, ke]); chartEnergy.draw();
  }
  if (tick % 8 === 0) updateReadout(s);
};

function updateReadout(s) {
  if (state.mode !== 'math' || !s.scene?.readout) return;
  const rows = s.scene.readout(s);
  $('readout-rows').innerHTML = rows.map(r =>
    `<div class="readout-row"><span>${r.label}</span><b>${r.value}</b></div>`).join('');
}

/* ═══════════ 모드 ═══════════ */
function setMode(mode) {
  state.mode = mode; save();
  document.querySelectorAll('#home-mode .seg-btn, #play-mode .seg-btn')
    .forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  $('mode-desc').textContent = MODE_DESC[mode];
  applyModeToPlay();
}
function applyModeToPlay() {
  const mode = state.mode;
  $('graphs').classList.toggle('hidden', mode === 'feel');
  $('graph-energy-block').classList.toggle('hidden', mode !== 'math');
  $('readout').classList.toggle('hidden', mode !== 'math' || !cur?.msHasReadout);
  const vec = mode !== 'feel';
  sim.showVectors = vec;
  $('btn-vectors').classList.toggle('on', vec);
}
document.querySelectorAll('#home-mode .seg-btn, #play-mode .seg-btn').forEach(b => {
  b.onclick = () => setMode(b.dataset.mode);
});

/* ═══════════ 홈 화면 렌더 ═══════════ */
function renderHome() {
  const done = MISSIONS.filter(ms => state.progress[ms.id]?.done).length;
  const stars = MISSIONS.reduce((s, ms) => s + (state.progress[ms.id]?.stars ?? 0), 0);
  $('progress-summary').innerHTML =
    done === 0
      ? '아직 시작 전입니다. 1장 첫 미션부터 가볍게 — 한 미션에 10분이면 충분합니다.'
      : `지금까지 <b>${done}/${MISSIONS.length}</b>개 미션 완료 · 별 <b>${stars}</b>개 · 오개념 <b>${state.badges.length}/${BADGES.length}</b>개 격파`;

  const box = $('chapters');
  box.innerHTML = '';
  CHAPTERS.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.innerHTML = `<div class="chapter-head">
      <span class="ch-num">제${ch.n}장</span><h2>${ch.title}</h2><span class="ch-sub">${ch.sub}</span>
    </div><div class="mission-list"></div>`;
    const list = card.querySelector('.mission-list');
    MISSIONS.filter(ms => ms.ch === ch.n).forEach(ms => {
      const p = state.progress[ms.id];
      const b = document.createElement('button');
      b.className = 'mission-btn' + (p?.done ? ' done' : '');
      b.innerHTML = `<span class="m-title">${ms.title}</span>
        <span class="m-stars">${p?.done ? starHtml(p.stars) : '<span class="off">★★★</span>'}</span>
        ${ms.badge ? '<span class="m-badge">오개념 깨기</span>' : ''}`;
      b.onclick = () => startMission(ms.id);
      list.appendChild(b);
    });
    box.appendChild(card);
  });

  const br = $('badges-row');
  br.innerHTML = '';
  BADGES.forEach(bd => {
    const chip = document.createElement('span');
    const earned = state.badges.includes(bd.id);
    chip.className = 'badge-chip' + (earned ? ' earned' : '');
    chip.textContent = earned ? bd.label : '🔒 아직 깨트리지 않은 오개념';
    br.appendChild(chip);
  });
}

/* ═══════════ 미션 흐름 ═══════════ */
function startMission(id) {
  const ms = byId[id];
  cur = { ms, params: {}, predictIdx: null, resultKey: null, scene: null, msHasReadout: false };
  (ms.sliders ?? []).forEach(s => { cur.params[s.key] = s.init; });

  $('play-tag').textContent = ms.tag;
  $('play-title').textContent = ms.title;
  $('goal-text').textContent = ms.goal;
  $('mission-note').textContent = '';
  buildSliders(ms);
  resetTutorSession();
  showScreen('screen-play');
  loadMissionScene();
  applyModeToPlay();

  $('intro-tag').textContent = ms.tag;
  $('intro-title').textContent = ms.title;
  $('intro-scene').textContent = ms.scene;
  showOverlay('ov-intro');
}

$('btn-intro-next').onclick = async () => {
  hideOverlay('ov-intro');
  cur.predictIdx = await askPrediction(cur.ms.predict);
  toast('예측을 기억해 뒀습니다. 이제 ▶ 실행으로 확인해 보세요!');
};

function buildSliders(ms) {
  const box = $('sliders');
  box.innerHTML = '';
  (ms.sliders ?? []).forEach(sl => {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl';
    wrap.innerHTML = `<div class="ctrl-label"><span>${sl.label}</span><span class="ctrl-val"></span></div>
      <input type="range" min="${sl.min}" max="${sl.max}" step="${sl.step}" value="${sl.init}">
      ${sl.hint ? `<div class="ctrl-hint">${sl.hint}</div>` : ''}`;
    const input = wrap.querySelector('input');
    const val = wrap.querySelector('.ctrl-val');
    const fmt = sl.fmt ?? (v => v);
    val.textContent = fmt(sl.init);
    input.oninput = () => {
      const v = parseFloat(input.value);
      cur.params[sl.key] = v;
      val.textContent = fmt(v);
      if (sim.phase === 'ready') loadMissionScene();
    };
    box.appendChild(wrap);
  });
}

function loadMissionScene() {
  const scene = cur.ms.build(cur.params);
  cur.scene = scene;
  cur.msHasReadout = !!scene.readout;
  sim.loadScene(scene);
  sim.onFinish = (key) => showResult(key);
  chartSpeed.reset(); chartEnergy.reset();
  $('readout-rows').innerHTML = '';
  setRunButtons('ready');
  applyModeToPlay();
}

function setRunButtons(phase) {
  $('btn-run').disabled = phase !== 'ready';
  $('btn-pause').disabled = phase === 'ready' || phase === 'done';
  document.querySelectorAll('#sliders input').forEach(i => { i.disabled = phase === 'running' || phase === 'paused'; });
}

$('btn-run').onclick = () => {
  if (sim.phase !== 'ready') return;
  sim.run();
  cur.scene?.onStart?.(sim);
  setRunButtons('running');
};
$('btn-pause').onclick = () => { sim.pause(); };
$('btn-reset').onclick = () => { loadMissionScene(); };
$('btn-slow').onclick = () => {
  sim.setSlow(!sim.slow);
  $('btn-slow').classList.toggle('on', sim.slow);
};
$('btn-vectors').onclick = () => {
  sim.showVectors = !sim.showVectors;
  $('btn-vectors').classList.toggle('on', sim.showVectors);
};
$('btn-finish').onclick = () => { if (sim.phase !== 'ready') sim.finish('manual'); };
$('btn-back').onclick = () => { renderHome(); showScreen('screen-home'); };

/* ── 결과 → 설명 → 퀴즈 → 완료 ── */
function safeResult(key) {
  try {
    const r = cur.ms.result(key, cur.scene?.data ?? {}, cur.params);
    if (r && r.title) return r;
  } catch {}
  return { title: '실험을 마쳤습니다', body: '결과를 관찰하셨나요? 아래 설명과 함께 정리해 봅시다.' };
}

function showResult(key) {
  cur.resultKey = key;
  setRunButtons('done');
  const ms = cur.ms;
  const r = safeResult(key);
  $('result-title').textContent = r.title;
  $('result-body').textContent = r.body;

  // 내 예측과 비교
  const pc = $('result-predict');
  if (cur.predictIdx != null) {
    const mine = ms.predict.choices[cur.predictIdx];
    const ok = cur.predictIdx === ms.predict.correct;
    pc.innerHTML = `내 예측 — “${mine}”<br>` + (ok
      ? '<span class="ok">✓ 실험 결과와 일치했습니다. 직관이 정확하시네요.</span>'
      : '<span class="no">실험은 다르게 말하네요. 괜찮습니다 — 예측이 빗나간 순간이 가장 많이 배우는 순간입니다.</span>');
    pc.classList.remove('hidden');
  } else {
    pc.classList.add('hidden');
  }

  // 설명 (모드에 따라 점진 공개)
  const ex = ms.explain;
  const blocks = [`<div class="explain-item"><span class="ex-label">감각으로</span><p>${ex.feel}</p></div>`];
  if (state.mode !== 'feel') {
    blocks.push(`<div class="explain-item"><span class="ex-label">원리로</span><p>${ex.concept}</p></div>`);
  }
  if (ex.formula) {
    blocks.push(`<details class="formula" ${state.mode === 'math' ? 'open' : ''}>
      <summary>수식으로 보고 싶다면</summary>
      <div class="f-expr">${ex.formula.expr}</div><p>${ex.formula.text}</p></details>`);
  }
  $('result-explain').innerHTML = blocks.join('');

  $('btn-result-retry').textContent = r.retry ? '↺ 다시 실험 (추천)' : '↺ 다시 실험';
  showOverlay('ov-result');
}

$('btn-result-retry').onclick = () => { hideOverlay('ov-result'); loadMissionScene(); };
$('btn-result-next').onclick = async () => {
  hideOverlay('ov-result');
  const quizOk = await askQuiz(cur.ms.quiz);
  completeMission(quizOk);
};

function completeMission(quizOk) {
  const ms = cur.ms;
  const predictOk = cur.predictIdx === ms.predict.correct;
  const stars = 1 + (predictOk ? 1 : 0) + (quizOk ? 1 : 0);
  recordMission(ms.id, { stars, predictOk, quizOk });

  $('complete-title').textContent = ms.title;
  $('complete-stars').innerHTML = starHtml(stars);
  const badgeEl = $('complete-badge');
  if (ms.badge) {
    const isNew = earnBadge(ms.badge);
    const label = BADGES.find(b => b.id === ms.badge)?.label ?? '';
    badgeEl.textContent = (isNew ? '🏅 오개념 격파! ' : '🏅 ') + label;
    badgeEl.classList.remove('hidden');
  } else {
    badgeEl.classList.add('hidden');
  }
  $('complete-msg').textContent =
    stars === 3 ? '완벽합니다. 예측도 퀴즈도 모두 맞히셨어요.'
    : stars === 2 ? '좋습니다. 빗나간 부분이 오히려 오래 기억에 남습니다.'
    : '완주가 가장 중요합니다. 언제든 다시 실험해 보세요.';

  const nx = nextMission(ms.id);
  $('btn-complete-next').classList.toggle('hidden', !nx);
  $('btn-complete-next').onclick = () => { hideOverlay('ov-complete'); startMission(nx.id); };
  $('btn-complete-home').onclick = () => { hideOverlay('ov-complete'); renderHome(); showScreen('screen-home'); };
  showOverlay('ov-complete');
}

/* ═══════════ 자유 실험실 ═══════════ */
let lab = null;
function openLab() {
  showScreen('screen-lab');
  if (!lab) {
    lab = createSim($('stage-lab'));
    attachMouse(lab, $('stage-lab'));
    buildLabSliders();
  }
  resetLab();
}
function resetLab() {
  const ground = make.ground();
  const wallL = make.wall(-10, 300, 40, 700);
  const wallR = make.wall(1010, 300, 40, 700);
  lab.loadScene({ bodies: [ground, wallL, wallR], focus: null });
  lab.live();
}
const labParams = { g: 1, bounce: 0.4 };
function buildLabSliders() {
  const box = $('lab-sliders');
  const defs = [
    { key: 'g', label: '중력', min: 0.05, max: 2, step: 0.05, init: 1,
      fmt: v => v < 0.2 ? '달 근처' : v < 0.9 ? '약함' : v <= 1.1 ? '지구' : '무거운 행성' },
    { key: 'bounce', label: '새 물체의 탱탱함', min: 0, max: 0.95, step: 0.05, init: 0.4, fmt: v => v.toFixed(2) },
  ];
  defs.forEach(sl => {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl';
    wrap.innerHTML = `<div class="ctrl-label"><span>${sl.label}</span><span class="ctrl-val"></span></div>
      <input type="range" min="${sl.min}" max="${sl.max}" step="${sl.step}" value="${sl.init}">`;
    const input = wrap.querySelector('input');
    const val = wrap.querySelector('.ctrl-val');
    val.textContent = sl.fmt(sl.init);
    input.oninput = () => {
      const v = parseFloat(input.value);
      labParams[sl.key] = v;
      val.textContent = sl.fmt(v);
      if (sl.key === 'g') lab.engine.gravity.y = v;
    };
    box.appendChild(wrap);
  });
}
document.querySelectorAll('.lab-palette .btn').forEach(b => {
  b.onclick = () => {
    if (!lab) return;
    const M = window.Matter;
    const x = 200 + Math.random() * 600, y = 80 + Math.random() * 120;
    let body;
    if (b.dataset.add === 'ball') body = make.ball(x, y, 14 + Math.random() * 14, { restitution: labParams.bounce });
    else if (b.dataset.add === 'box') body = make.box(x, y, 30 + Math.random() * 30, 30 + Math.random() * 30, { restitution: labParams.bounce });
    else if (b.dataset.add === 'bouncy') body = make.ball(x, y, 16, { restitution: 0.92, render: { fillStyle: '#b8e07a' } });
    else body = make.platform(x, 300 + Math.random() * 150, 180, 14, (Math.random() * 50 - 25) * Math.PI / 180);
    M.Composite.add(lab.engine.world, body);
  };
});
$('btn-lab-reset').onclick = () => resetLab();
$('btn-lab-back').onclick = () => { renderHome(); showScreen('screen-home'); };
$('btn-lab').onclick = openLab;

/* ═══════════ API 키 모달 ═══════════ */
$('btn-key').onclick = () => { $('key-input').value = state.apiKey; showOverlay('ov-key'); };
$('btn-key-cancel').onclick = () => hideOverlay('ov-key');
$('btn-key-clear').onclick = () => { setApiKey(''); $('key-input').value = ''; toast('키를 삭제했습니다.'); };
$('btn-key-save').onclick = () => {
  const k = $('key-input').value.trim();
  if (!k.startsWith('sk-ant-')) { toast('sk-ant- 로 시작하는 Claude API 키를 입력해 주세요.'); return; }
  setApiKey(k);
  hideOverlay('ov-key');
  toast('저장했습니다. 이제 뉴턴 선생님과 대화할 수 있어요!');
};

/* ═══════════ AI 튜터 컨텍스트 ═══════════ */
function tutorContext() {
  if ($('screen-lab').classList.contains('active')) {
    return '학습자는 지금 "자유 실험실"에서 물체를 자유롭게 떨어뜨리고 던지며 놀고 있습니다. 중력과 탱탱함(반발)을 조절할 수 있는 샌드박스입니다.';
  }
  if (!cur) return '학습자는 홈 화면에서 챕터를 둘러보는 중입니다.';
  const ms = cur.ms;
  const lines = [
    `현재 미션: 제${ms.ch}장 「${ms.title}」 (주제: ${ms.tag})`,
    `미션의 장면 설명: ${ms.scene.replace(/\n+/g, ' ')}`,
    `학습 모드: ${{ feel: '체험(수식 없이)', concept: '개념', math: '수식까지' }[state.mode]}`,
  ];
  (ms.sliders ?? []).forEach(sl => lines.push(`현재 설정 — ${sl.label}: ${cur.params[sl.key]}`));
  if (cur.predictIdx != null) {
    lines.push(`학습자의 예측: "${ms.predict.choices[cur.predictIdx]}" (물리적으로 맞는 답: "${ms.predict.choices[ms.predict.correct]}")`);
  }
  if (cur.resultKey) {
    const r = safeResult(cur.resultKey);
    lines.push(`방금 실험 결과: ${r.title} — ${r.body.replace(/\n+/g, ' ')}`);
  } else {
    lines.push('아직 실험을 실행하기 전입니다.');
  }
  return lines.join('\n');
}

/* ═══════════ 부트스트랩 ═══════════ */
initTutor(tutorContext);
$('btn-tutor').onclick = openTutor;
$('btn-tutor-lab').onclick = openTutor;

sim.onFinish = () => {};
setMode(state.mode);
renderHome();
showScreen('screen-home');
