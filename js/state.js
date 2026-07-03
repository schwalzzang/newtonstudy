// 전역 상태 + localStorage 저장
const LS_KEY = 'na_state_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? {}; }
  catch { return {}; }
}

const saved = load();

export const state = {
  mode: saved.mode ?? 'feel',          // feel | concept | math
  progress: saved.progress ?? {},      // {missionId: {stars, done, predictOk, quizOk}}
  badges: saved.badges ?? [],          // earned badge ids
  apiKey: localStorage.getItem('na_claude_key') ?? '',
};

export function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      mode: state.mode, progress: state.progress, badges: state.badges,
    }));
  } catch {}
}

export function setApiKey(key) {
  state.apiKey = key;
  try {
    if (key) localStorage.setItem('na_claude_key', key);
    else localStorage.removeItem('na_claude_key');
  } catch {}
}

export function recordMission(id, { stars, predictOk, quizOk }) {
  const prev = state.progress[id] ?? { stars: 0 };
  state.progress[id] = {
    done: true,
    stars: Math.max(prev.stars, stars),
    predictOk, quizOk,
  };
  save();
}

export function earnBadge(id) {
  if (!state.badges.includes(id)) { state.badges.push(id); save(); return true; }
  return false;
}
