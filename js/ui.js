// 공통 UI 유틸: 토스트, 오버레이, 화면 전환
export const $ = (id) => document.getElementById(id);

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function showOverlay(id) { $(id).classList.add('show'); }
export function hideOverlay(id) { $(id).classList.remove('show'); }
export function hideAllOverlays() {
  document.querySelectorAll('.overlay.show').forEach(el => el.classList.remove('show'));
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $(id).classList.add('active');
}

export function starHtml(n, total = 3) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<span class="${i < n ? '' : 'off'}">★</span>`;
  return s;
}
