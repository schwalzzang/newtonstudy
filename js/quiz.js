// 예측 질문 + O/X 확인 퀴즈 오버레이 흐름
import { $, showOverlay, hideOverlay } from './ui.js';

// 예측 질문: 선택하면 resolve(선택 인덱스)
export function askPrediction(predict) {
  return new Promise((resolve) => {
    $('predict-q').textContent = predict.q;
    const box = $('predict-choices');
    box.innerHTML = '';
    predict.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choice-btn';
      b.innerHTML = `<span class="c-num">${i + 1}</span>${c}`;
      b.onclick = () => { hideOverlay('ov-predict'); resolve(i); };
      box.appendChild(b);
    });
    showOverlay('ov-predict');
  });
}

// O/X 퀴즈: resolve(정답 여부)
export function askQuiz(quiz) {
  return new Promise((resolve) => {
    $('quiz-q').textContent = quiz.q;
    $('quiz-why').classList.add('hidden');
    $('quiz-next-row').classList.add('hidden');
    $('quiz-btns').classList.remove('hidden');

    const answer = (picked) => {
      const ok = picked === quiz.a;
      $('quiz-btns').classList.add('hidden');
      const why = $('quiz-why');
      why.classList.remove('hidden');
      why.innerHTML = `<span class="verdict ${ok ? 'ok' : 'no'}">${ok ? '정확합니다!' : '아쉽지만, 많은 분들이 그렇게 생각해요.'}</span>${quiz.why}`;
      $('quiz-next-row').classList.remove('hidden');
      $('btn-quiz-next').onclick = () => { hideOverlay('ov-quiz'); resolve(ok); };
    };
    $('btn-quiz-o').onclick = () => answer(true);
    $('btn-quiz-x').onclick = () => answer(false);
    showOverlay('ov-quiz');
  });
}
