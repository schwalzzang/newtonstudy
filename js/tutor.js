// AI 튜터 "뉴턴 선생님" — Claude Messages API 브라우저 직접 호출
import { state } from './state.js';
import { $, toast, showOverlay } from './ui.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';

let history = [];        // [{role, content}]
let getContext = () => '';
let busy = false;

export function initTutor(contextFn) {
  getContext = contextFn;

  $('btn-tutor-close').onclick = closeTutor;
  $('btn-tutor-send').onclick = send;
  $('tutor-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) send();
  });
}

export function openTutor() {
  if (!state.apiKey) {
    showOverlay('ov-key');
    toast('먼저 Claude API 키를 등록해 주세요.');
    return;
  }
  $('tutor-drawer').classList.add('open');
  if (!$('tutor-msgs').children.length) {
    addMsg('sys', '지금 하고 있는 실험을 제가 보고 있어요.\n"방금 왜 그렇게 됐어요?" 같은 질문도 좋습니다.');
  }
  $('tutor-input').focus();
}
export function closeTutor() { $('tutor-drawer').classList.remove('open'); }
export function resetTutorSession() { history = []; }

function addMsg(cls, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + cls;
  el.textContent = text;
  $('tutor-msgs').appendChild(el);
  $('tutor-msgs').scrollTop = $('tutor-msgs').scrollHeight;
  return el;
}

function systemPrompt() {
  return `당신은 "뉴턴 선생님"입니다. 과학과 수학이 어렵게 느껴지는 한국의 일반 성인에게 물리를 가르치는, 옆자리의 친절한 과외 선생님입니다.

지금 학습자는 "뉴턴 아카데미"라는 물리 시뮬레이션 학습 앱을 사용 중입니다. 아래는 학습자의 현재 상황입니다:

${getContext()}

대화 원칙:
- 존댓말을 쓰되 딱딱하지 않게, 따뜻하고 차분하게.
- 수식과 전문용어는 꼭 필요할 때만, 쓰더라도 반드시 일상 언어로 풀어서 함께 설명.
- 일상 경험(운전, 버스, 스포츠, 놀이공원 등)의 비유를 적극 활용.
- 답은 3~6문장 정도로 간결하게. 마지막에 가볍게 생각해볼 거리를 하나 던져도 좋음.
- 학습자가 틀린 직관을 말해도 절대 무안 주지 않기. "많은 분들이 그렇게 생각해요"처럼 안전하게 받아주고 바로잡기.
- 현재 실험 상황과 관련지어 설명할 수 있으면 반드시 그렇게 하기.`;
}

async function send() {
  const input = $('tutor-input');
  const text = input.value.trim();
  if (!text || busy) return;
  input.value = '';
  addMsg('user', text);
  history.push({ role: 'user', content: text });
  if (history.length > 16) history = history.slice(-16);

  const aiEl = addMsg('ai', '…');
  busy = true;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        stream: true,
        system: systemPrompt(),
        messages: history,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        aiEl.textContent = 'API 키가 올바르지 않은 것 같습니다. 🔑 설정에서 키를 다시 확인해 주세요.';
      } else if (res.status === 429) {
        aiEl.textContent = '요청이 너무 잦았어요. 잠시 후 다시 시도해 주세요.';
      } else {
        aiEl.textContent = '연결에 문제가 생겼습니다: ' + (err?.error?.message ?? res.status);
      }
      history.pop();
      return;
    }

    // SSE 스트리밍 파싱
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '', buf = '';
    aiEl.textContent = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
            full += ev.delta.text;
            aiEl.textContent = full;
            $('tutor-msgs').scrollTop = $('tutor-msgs').scrollHeight;
          }
        } catch {}
      }
    }
    history.push({ role: 'assistant', content: full || '(응답 없음)' });
  } catch (e) {
    aiEl.textContent = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
    history.pop();
  } finally {
    busy = false;
  }
}
