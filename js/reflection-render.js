// ============================================
// 매일 자문 — UI Render
// (Phase 4 modal/tab/history + 5.5 multi-device + 8 quarterly UI + 9.5 onboarding + 10.5 a11y)
// ============================================

let _activeReflectionListenerUnsub = null;

/**
 * Phase 4 — 자문 modal 노출 (bottom-sheet, 70vh, slide-up)
 * @param {'evening'|'morning'} timeOfDay
 */
function showReflectionModal(timeOfDay = 'evening') {
  if (document.querySelector('.reflection-modal-overlay')) return;

  const settings = appState.dailyReflection.settings;
  const questions = settings.questions[timeOfDay] || [];
  if (questions.length === 0) return;

  const today = getReflectionToday();
  const existing = today[timeOfDay];

  const overlay = document.createElement('div');
  overlay.className = 'reflection-modal-overlay';
  // Phase 10.5 — A11y
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reflection-modal-title');

  const titleText = timeOfDay === 'evening' ? '🌙 저녁 자문 (3분)' : '☀️ 아침 자문 (3분)';
  const streakBadge = appState.dailyReflection.streak.current > 0
    ? `<span class="reflection-streak-badge">🔥 ${appState.dailyReflection.streak.current}일</span>`
    : '';

  const cardsHtml = questions.map((q, i) => `
    <label class="reflection-question-card">
      <span class="reflection-question-text">${_refEscapeHtml(q)}</span>
      <textarea
        class="reflection-answer-input"
        data-q-idx="${i}"
        rows="3"
        maxlength="200"
        placeholder="30초 안에 답이 나오는 만큼만"
        ${i === 0 ? 'autofocus' : ''}
      >${_refEscapeHtml(existing?.[`q${i+1}`] || '')}</textarea>
    </label>
  `).join('');

  overlay.innerHTML = `
    <div class="reflection-modal" role="document">
      <header class="reflection-modal-header">
        <h2 id="reflection-modal-title">${titleText} ${streakBadge}</h2>
      </header>
      <div class="reflection-modal-body">${cardsHtml}</div>
      <div class="reflection-actions">
        <button type="button" class="reflection-btn-skip">건너뛰기</button>
        <button type="button" class="reflection-btn-close">닫기</button>
        <button type="button" class="reflection-btn-save reflection-btn-primary">저장 (Ctrl+Enter)</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Phase 10.5 — keyboard shortcuts (Esc / Cmd-Ctrl+Enter)
  overlay._reflectionKeyHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeReflectionModal();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitReflection(timeOfDay, false);
    }
  };
  document.addEventListener('keydown', overlay._reflectionKeyHandler);

  overlay.querySelector('.reflection-btn-save').addEventListener('click', () => submitReflection(timeOfDay, false));
  overlay.querySelector('.reflection-btn-skip').addEventListener('click', () => submitReflection(timeOfDay, true));
  overlay.querySelector('.reflection-btn-close').addEventListener('click', closeReflectionModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeReflectionModal(); });

  requestAnimationFrame(() => overlay.classList.add('reflection-modal-open'));

  // Phase 5.5 — Firebase realtime listener (다른 기기 답 감지)
  if (
    appState.user
    && typeof window.firebaseOnSnapshot === 'function'
    && typeof window.firebaseDoc === 'function'
    && typeof window.firebaseDb !== 'undefined'
  ) {
    try {
      const userDoc = window.firebaseDoc(window.firebaseDb, 'users', appState.user.uid);
      _activeReflectionListenerUnsub = window.firebaseOnSnapshot(userDoc, (snap) => {
        const data = snap.data();
        if (!data || !data.dailyReflection) return;
        const todayKey = getLocalDateStr();
        const cloudDay = data.dailyReflection.history?.[todayKey];
        if (cloudDay && cloudDay[timeOfDay] && !cloudDay[timeOfDay].skipped) {
          if (typeof showToast === 'function') {
            showToast('다른 기기에서 답 완료됨', 'info');
          }
          closeReflectionModal();
        }
      });
    } catch (e) {
      console.warn('[reflection] multi-device listener 등록 실패:', e);
    }
  }
}

function closeReflectionModal() {
  const overlay = document.querySelector('.reflection-modal-overlay');
  if (!overlay) return;

  if (_activeReflectionListenerUnsub) {
    try { _activeReflectionListenerUnsub(); } catch (e) { /* noop */ }
    _activeReflectionListenerUnsub = null;
  }
  if (overlay._reflectionKeyHandler) {
    document.removeEventListener('keydown', overlay._reflectionKeyHandler);
  }

  overlay.classList.remove('reflection-modal-open');
  setTimeout(() => overlay.remove(), 220);
}

function submitReflection(timeOfDay, skipped = false) {
  const overlay = document.querySelector('.reflection-modal-overlay');
  if (!overlay) return;

  let answers;
  if (skipped) {
    answers = { q1: '', q2: '', q3: '', skipped: true };
  } else {
    const inputs = overlay.querySelectorAll('.reflection-answer-input');
    answers = {
      q1: (inputs[0]?.value || '').trim(),
      q2: (inputs[1]?.value || '').trim(),
      q3: (inputs[2]?.value || '').trim(),
      skipped: false
    };
  }

  saveReflectionAnswer(timeOfDay, answers);
  closeReflectionModal();

  if (typeof showToast === 'function') {
    showToast(skipped ? '🌙 건너뛰기 기록됨' : '🌙 자문 답 저장됨', 'success');
  }

  if (appState.currentTab === 'reflection' && typeof renderReflectionTab === 'function') {
    renderReflectionTab();
  }
}

/**
 * Phase 4 — 자문 탭 메인 화면
 */
function renderReflectionTab() {
  const today = getReflectionToday();
  const settings = appState.dailyReflection.settings;
  const streak = appState.dailyReflection.streak;
  const recent = getReflectionHistory(7);

  const todayHtml = renderTodayReflectionCard(today);
  const recentHtml = renderReflectionHistoryList(recent);
  const eveningLabel = today.evening && !today.evening.skipped ? '저녁 자문 다시' : '저녁 자문 시작';
  const morningLabel = today.morning && !today.morning.skipped ? '아침 자문 다시' : '아침 자문 시작';

  const html = `
    <div class="reflection-tab">
      <header class="reflection-tab-header">
        <h2>🌙 매일 자문</h2>
        <div class="reflection-streak-row">
          <span class="reflection-streak-badge">🔥 ${streak.current || 0}일 연속</span>
          <span class="reflection-streak-best">최고 ${streak.best || 0}일</span>
        </div>
      </header>
      <section class="reflection-today-section">
        <h3>오늘</h3>
        ${todayHtml}
        <div class="reflection-today-actions">
          <button type="button" onclick="showReflectionModal('evening')">${eveningLabel}</button>
          ${settings.morningTime ? `<button type="button" onclick="showReflectionModal('morning')">${morningLabel}</button>` : ''}
        </div>
      </section>
      <section class="reflection-recent-section">
        <h3>최근 7일</h3>
        ${recentHtml}
      </section>
      <section class="reflection-quarterly-section">
        <h3>분기 회고</h3>
        <button type="button" class="reflection-quarterly-btn" onclick="showQuarterlyRetrospective()">📋 90일 패턴 + 클립보드 복사</button>
      </section>
    </div>
  `;

  const container = document.getElementById('tab-content-reflection');
  if (container) container.innerHTML = html;
  return html;
}

function renderTodayReflectionCard(today) {
  if (!today.evening && !today.morning) {
    return '<p class="reflection-empty">오늘 답한 자문이 없어요.</p>';
  }
  const parts = [];
  if (today.evening) parts.push(renderReflectionAnswerBlock('🌙 저녁', today.evening));
  if (today.morning) parts.push(renderReflectionAnswerBlock('☀️ 아침', today.morning));
  return parts.join('');
}

function renderReflectionAnswerBlock(label, answer) {
  if (answer.skipped) {
    return `<div class="reflection-answer-block reflection-answer-skipped">${label} — 건너뜀</div>`;
  }
  return `
    <div class="reflection-answer-block">
      <div class="reflection-answer-label">${label}</div>
      <ol class="reflection-answer-list">
        <li>${_refEscapeHtml(answer.q1 || '(빈 답)')}</li>
        <li>${_refEscapeHtml(answer.q2 || '(빈 답)')}</li>
        <li>${_refEscapeHtml(answer.q3 || '(빈 답)')}</li>
      </ol>
    </div>
  `;
}

function renderReflectionHistoryList(items) {
  if (items.length === 0) {
    return '<p class="reflection-empty">기록 없음</p>';
  }
  return `
    <ul class="reflection-history">
      ${items.map(({ date, day }) => {
        const eveningAnswered = day.compact ? !!day.eveningAnswered : !!(day.evening && !day.evening.skipped);
        const status = eveningAnswered ? '✅' : '⊘';
        const tag = day.compact ? ' <span class="reflection-history-compact">(압축)</span>' : '';
        return `
          <li class="reflection-history-item">
            <span class="reflection-history-date">${date}</span>
            <span class="reflection-history-status">${status}${tag}</span>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

/**
 * Phase 8 — 분기 회고 modal
 */
function showQuarterlyRetrospective() {
  if (document.querySelector('.reflection-quarterly-modal-overlay')) return;

  const markdown = exportQuarterlyMarkdown(90);
  const overlay = document.createElement('div');
  overlay.className = 'reflection-quarterly-modal-overlay reflection-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="reflection-modal reflection-quarterly-modal" role="document">
      <header class="reflection-modal-header">
        <h2>📋 분기 회고 (90일)</h2>
      </header>
      <div class="reflection-modal-body">
        <pre class="reflection-quarterly-preview">${_refEscapeHtml(markdown)}</pre>
      </div>
      <div class="reflection-actions">
        <button type="button" class="reflection-btn-close">닫기</button>
        <button type="button" class="reflection-btn-copy reflection-btn-primary">📋 클립보드 복사</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeQ = () => {
    overlay.classList.remove('reflection-modal-open');
    document.removeEventListener('keydown', keyHandler);
    setTimeout(() => overlay.remove(), 220);
  };
  const keyHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeQ(); } };
  document.addEventListener('keydown', keyHandler);

  overlay.querySelector('.reflection-btn-close').addEventListener('click', closeQ);
  overlay.querySelector('.reflection-btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      if (typeof showToast === 'function') {
        showToast('✅ 클립보드 복사 완료 — Obsidian roadmap.md / life_compass.md에 paste', 'success');
      }
    } catch (e) {
      console.error('clipboard 복사 실패:', e);
      if (typeof showToast === 'function') {
        showToast('클립보드 복사 실패 — 텍스트 직접 선택해서 복사하세요', 'error');
      }
    }
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeQ(); });

  requestAnimationFrame(() => overlay.classList.add('reflection-modal-open'));
}

/**
 * Phase 9.5 — 첫 사용자 onboarding modal
 */
function showReflectionOnboarding() {
  if (localStorage.getItem('navigator-reflection-onboarded')) return;
  if (document.querySelector('.reflection-onboarding-modal-overlay')) return;
  // review fix Phase 9.5: plan §329 — history 비어있고 autoModalEnabled=true 일 때만 노출
  // 기존 user (history 있음) 가 새 기기에서 들어왔거나 cloud sync 늦은 경우 잘못된 onboarding 차단
  const settings = appState.dailyReflection?.settings;
  const history = appState.dailyReflection?.history || {};
  if (Object.keys(history).length > 0) {
    // 기존 사용자 — onboarding 자동 mark
    localStorage.setItem('navigator-reflection-onboarded', 'true');
    return;
  }
  if (!settings?.autoModalEnabled) return;

  const overlay = document.createElement('div');
  overlay.className = 'reflection-onboarding-modal-overlay reflection-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="reflection-modal reflection-onboarding-modal" role="document">
      <header class="reflection-modal-header">
        <h2>🌙 매일 자문이 추가됐어요</h2>
      </header>
      <div class="reflection-modal-body">
        <p>저녁 22시에 3분 자문 modal이 자동으로 떠요. 답하면 streak이 쌓입니다.</p>
        <p><strong>샘플 질문</strong></p>
        <ol>
          <li>오늘 30분 룰 깬 충동 있었나? 무엇이었나?</li>
          <li>오늘 과잉 약속 / 압력솥 발현 있었나?</li>
          <li>내일 한 가지 완성할 작은 약속은?</li>
        </ol>
        <p class="reflection-onboard-note">시각·질문은 settings에서 변경 가능.</p>
      </div>
      <div class="reflection-actions">
        <button type="button" class="reflection-btn-close">나중에</button>
        <button type="button" class="reflection-btn-onboard-start reflection-btn-primary">지금 시작</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const finish = (autoModalOn) => {
    appState.dailyReflection.settings.autoModalEnabled = autoModalOn;
    if (typeof saveState === 'function') saveState();
    localStorage.setItem('navigator-reflection-onboarded', 'true');
    overlay.classList.remove('reflection-modal-open');
    setTimeout(() => overlay.remove(), 220);
  };
  overlay.querySelector('.reflection-btn-close').addEventListener('click', () => finish(false));
  overlay.querySelector('.reflection-btn-onboard-start').addEventListener('click', () => finish(true));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });

  requestAnimationFrame(() => overlay.classList.add('reflection-modal-open'));
}

// 자체 escape (navigator escapeHtml 충돌 회피)
function _refEscapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
