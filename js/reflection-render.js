// ============================================
// 매일 자문 - UI Render
// Tab-primary surface + bottom-sheet trigger
// ============================================

let _activeReflectionListenerUnsub = null;
let _reflectionActiveAspect = 'evening';
let _reflectionLastFocusedEl = null;

function setReflectionAspect(aspect) {
  _reflectionActiveAspect = normalizeReflectionAspect(aspect);
  renderReflectionTab();
}

/**
 * 자문 modal 노출. Tab 화면이 기본 입력면이고, modal은 알림/빠른 입력 trigger.
 * @param {'evening'|'morning'|'weekly'} aspect
 */
function showReflectionModal(aspect = 'evening') {
  if (document.querySelector('.reflection-modal-overlay')) return;

  const activeAspect = normalizeReflectionAspect(aspect);
  const questions = getReflectionQuestions(activeAspect);
  if (questions.length === 0) return;

  const today = getReflectionToday();
  const existing = today[activeAspect];
  const meta = _getReflectionAspectMeta(activeAspect);

  _reflectionLastFocusedEl = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'reflection-modal-overlay';
  overlay.dataset.reflectionModal = 'entry';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reflection-modal-title');
  overlay.setAttribute('aria-describedby', 'reflection-modal-desc');

  const cardsHtml = questions.map((q, i) => {
    const inputId = `reflection-modal-${activeAspect}-q${i + 1}`;
    const helpId = `${inputId}-help`;
    return `
      <div class="reflection-question-card">
        <label id="${inputId}-label" class="reflection-question-text" for="${inputId}">${_refEscapeHtml(q)}</label>
        <textarea
          id="${inputId}"
          class="reflection-answer-input"
          data-q-idx="${i}"
          rows="3"
          maxlength="240"
          aria-describedby="${helpId}"
          placeholder="짧게 남기기"
          ${i === 0 ? 'autofocus' : ''}
        >${_refEscapeHtml(existing?.[`q${i + 1}`] || '')}</textarea>
        <span id="${helpId}" class="reflection-input-meta">${i + 1} / ${questions.length}</span>
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="reflection-modal" role="document">
      <header class="reflection-modal-header">
        <div>
          <p class="reflection-modal-kicker">${meta.kicker}</p>
          <h2 id="reflection-modal-title">${meta.label} 자문</h2>
        </div>
        <span class="reflection-streak-badge" aria-live="polite">${appState.dailyReflection.streak.current || 0}일</span>
      </header>
      <p id="reflection-modal-desc" class="reflection-modal-desc">${meta.desc}</p>
      <div class="reflection-modal-body">${cardsHtml}</div>
      <div class="reflection-actions">
        <button type="button" class="reflection-btn-skip">건너뛰기</button>
        <button type="button" class="reflection-btn-close">닫기</button>
        <button type="button" class="reflection-btn-save reflection-btn-primary">저장</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay._reflectionKeyHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeReflectionModal();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitReflection(activeAspect, false);
    } else if (e.key === 'Tab') {
      _trapReflectionFocus(overlay, e);
    }
  };
  document.addEventListener('keydown', overlay._reflectionKeyHandler);

  overlay.querySelector('.reflection-btn-save').addEventListener('click', () => submitReflection(activeAspect, false));
  overlay.querySelector('.reflection-btn-skip').addEventListener('click', () => submitReflection(activeAspect, true));
  overlay.querySelector('.reflection-btn-close').addEventListener('click', closeReflectionModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeReflectionModal(); });

  requestAnimationFrame(() => {
    overlay.classList.add('reflection-modal-open');
    const firstInput = overlay.querySelector('[autofocus]') || overlay.querySelector('textarea, button');
    if (firstInput) firstInput.focus();
  });

  if (
    activeAspect !== 'weekly'
    && appState.user
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
        if (cloudDay && cloudDay[activeAspect] && !cloudDay[activeAspect].skipped) {
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
  const overlay = document.querySelector('.reflection-modal-overlay[data-reflection-modal="entry"]');
  if (!overlay) return;

  if (_activeReflectionListenerUnsub) {
    try { _activeReflectionListenerUnsub(); } catch (e) { /* noop */ }
    _activeReflectionListenerUnsub = null;
  }
  if (overlay._reflectionKeyHandler) {
    document.removeEventListener('keydown', overlay._reflectionKeyHandler);
  }

  overlay.classList.remove('reflection-modal-open');
  setTimeout(() => {
    overlay.remove();
    _restoreReflectionFocus();
  }, 220);
}

function submitReflection(aspect, skipped = false) {
  const activeAspect = normalizeReflectionAspect(aspect);
  const overlay = document.querySelector('.reflection-modal-overlay[data-reflection-modal="entry"]');
  if (!overlay) return;

  const answers = skipped
    ? { q1: '', q2: '', q3: '', skipped: true }
    : _readReflectionInputs(overlay.querySelectorAll('.reflection-answer-input'));

  saveReflectionAnswer(activeAspect, answers);
  closeReflectionModal();

  if (typeof showToast === 'function') {
    showToast(skipped ? '자문 건너뛰기 기록됨' : '자문 답 저장됨', 'success');
  }

  if (appState.currentTab === 'reflection' && typeof renderReflectionTab === 'function') {
    renderReflectionTab();
  }
}

/**
 * 자문 탭 메인 화면.
 * Decision: tab-primary, modal trigger secondary.
 */
function renderReflectionTab() {
  const today = getReflectionToday();
  const activeAspect = normalizeReflectionAspect(_reflectionActiveAspect);
  _reflectionActiveAspect = activeAspect;

  const html = `
    <div class="reflection-tab" aria-labelledby="reflection-tab-title">
      <header class="reflection-tab-header">
        <div>
          <p class="reflection-tab-kicker">Reflection</p>
          <h2 id="reflection-tab-title">매일 자문</h2>
        </div>
      </header>

      ${renderReflectionOverview()}
      ${renderReflectionAspectTabs(today, activeAspect)}
      ${renderReflectionEntryPanel(today, activeAspect)}

      <section class="reflection-today-section" aria-labelledby="reflection-today-title">
        <h3 id="reflection-today-title">오늘 기록</h3>
        ${renderTodayReflectionCard(today)}
      </section>

      <section class="reflection-recent-section" aria-labelledby="reflection-history-title">
        <h3 id="reflection-history-title">최근 기록</h3>
        ${renderReflectionHistoryList(getReflectionHistory(14))}
      </section>

      <section class="reflection-quarterly-section" aria-labelledby="reflection-quarterly-title">
        <h3 id="reflection-quarterly-title">90일 회고</h3>
        <button type="button" class="reflection-quarterly-btn" onclick="showQuarterlyRetrospective()">패턴 보기 / 복사</button>
      </section>
    </div>
  `;

  const container = document.getElementById('tab-content-reflection');
  if (container) container.innerHTML = html;
  return html;
}

function renderReflectionOverview() {
  const streak = appState.dailyReflection.streak || {};
  const recent = getReflectionHistory(7);
  const eveningCount = recent.filter(({ day }) => _isReflectionAspectDone(day, 'evening')).length;
  const weeklyCount = getReflectionHistory(30).filter(({ day }) => _isReflectionAspectDone(day, 'weekly')).length;

  return `
    <section class="reflection-overview tab-anchor-row" aria-label="자문 현황">
      <div class="reflection-stat tab-anchor">
        <span class="reflection-stat-label">현재</span>
        <strong aria-live="polite">${streak.current || 0}일</strong>
      </div>
      <div class="reflection-stat tab-anchor">
        <span class="reflection-stat-label">최고</span>
        <strong>${streak.best || 0}일</strong>
      </div>
      <div class="reflection-stat tab-anchor">
        <span class="reflection-stat-label">7일 저녁</span>
        <strong>${eveningCount}/7</strong>
      </div>
      <div class="reflection-stat tab-anchor">
        <span class="reflection-stat-label">30일 주간</span>
        <strong>${weeklyCount}</strong>
      </div>
    </section>
  `;
}

function renderReflectionAspectTabs(today, activeAspect) {
  return `
    <div class="reflection-aspect-tabs" role="tablist" aria-label="자문 종류">
      ${['evening', 'morning', 'weekly'].map((aspect) => {
        const meta = _getReflectionAspectMeta(aspect);
        const selected = aspect === activeAspect;
        return `
          <button
            type="button"
            id="reflection-tab-${aspect}"
            class="reflection-aspect-tab ${selected ? 'active' : ''}"
            role="tab"
            aria-selected="${selected ? 'true' : 'false'}"
            aria-controls="reflection-entry-panel"
            tabindex="${selected ? '0' : '-1'}"
            onclick="setReflectionAspect('${aspect}')"
          >
            <span>${meta.label}</span>
            <small>${_getReflectionAspectState(today, aspect)}</small>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderReflectionEntryPanel(today, aspect) {
  const meta = _getReflectionAspectMeta(aspect);
  const questions = getReflectionQuestions(aspect);
  const existing = today[aspect];

  const questionHtml = questions.map((question, index) => {
    const inputId = `reflection-inline-${aspect}-q${index + 1}`;
    return `
      <div class="reflection-inline-question">
        <label for="${inputId}">${_refEscapeHtml(question)}</label>
        <textarea
          id="${inputId}"
          class="reflection-inline-answer-input"
          data-q-idx="${index}"
          rows="3"
          maxlength="240"
          placeholder="답을 남기기"
        >${_refEscapeHtml(existing?.[`q${index + 1}`] || '')}</textarea>
      </div>
    `;
  }).join('');

  return `
    <section
      id="reflection-entry-panel"
      class="reflection-entry-panel"
      role="tabpanel"
      aria-labelledby="reflection-tab-${aspect}"
      data-reflection-inline-aspect="${aspect}"
    >
      <div class="reflection-entry-head">
        <div>
          <p class="reflection-entry-kicker">${meta.kicker}</p>
          <h3>${meta.label} Q&A</h3>
        </div>
        <span class="reflection-entry-state">${_getReflectionAspectState(today, aspect)}</span>
      </div>
      <p class="reflection-entry-desc">${meta.desc}</p>
      <div class="reflection-inline-questions">${questionHtml}</div>
      <div class="reflection-entry-actions">
        <button type="button" class="reflection-btn-secondary" onclick="submitReflectionInline('${aspect}', true)">건너뛰기</button>
        <button type="button" class="reflection-btn-secondary" onclick="showReflectionModal('${aspect}')">모달로 입력</button>
        <button type="button" class="reflection-btn-primary" onclick="submitReflectionInline('${aspect}', false)">저장</button>
      </div>
    </section>
  `;
}

function submitReflectionInline(aspect, skipped = false) {
  const activeAspect = normalizeReflectionAspect(aspect);
  const panel = document.querySelector(`[data-reflection-inline-aspect="${activeAspect}"]`);
  if (!panel) return;

  const answers = skipped
    ? { q1: '', q2: '', q3: '', skipped: true }
    : _readReflectionInputs(panel.querySelectorAll('.reflection-inline-answer-input'));

  saveReflectionAnswer(activeAspect, answers);
  if (typeof showToast === 'function') {
    showToast(skipped ? '자문 건너뛰기 기록됨' : '자문 답 저장됨', 'success');
  }
  renderReflectionTab();
}

function renderTodayReflectionCard(today) {
  const blocks = ['evening', 'morning', 'weekly']
    .filter(aspect => today[aspect])
    .map(aspect => renderReflectionAnswerBlock(aspect, today[aspect]));

  if (blocks.length === 0) {
    return '<p class="reflection-empty">오늘 기록 없음</p>';
  }
  return `<div class="reflection-answer-stack">${blocks.join('')}</div>`;
}

function renderReflectionAnswerBlock(aspect, answer) {
  const meta = _getReflectionAspectMeta(aspect);
  if (answer.skipped) {
    return `<div class="reflection-answer-block reflection-answer-skipped"><strong>${meta.label}</strong><span>건너뜀</span></div>`;
  }
  const questions = getReflectionQuestions(aspect);
  return `
    <div class="reflection-answer-block">
      <div class="reflection-answer-label">${meta.label}</div>
      <ol class="reflection-answer-list">
        ${[0, 1, 2].map(i => `
          <li>
            <span class="reflection-answer-q">${_refEscapeHtml(questions[i] || `${i + 1}번 질문`)}</span>
            <span class="reflection-answer-a">${_refEscapeHtml(answer[`q${i + 1}`] || '(빈 답)')}</span>
          </li>
        `).join('')}
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
      ${items.map(({ date, day }) => `
        <li class="reflection-history-item">
          <span class="reflection-history-date">${date}</span>
          <span class="reflection-history-status">
            ${['evening', 'morning', 'weekly'].map(aspect => _renderReflectionHistoryChip(day, aspect)).join('')}
            ${day.compact ? '<span class="reflection-history-compact">압축</span>' : ''}
          </span>
        </li>
      `).join('')}
    </ul>
  `;
}

function showQuarterlyRetrospective() {
  if (document.querySelector('.reflection-quarterly-modal-overlay')) return;

  const markdown = exportQuarterlyMarkdown(90);
  const overlay = document.createElement('div');
  overlay.className = 'reflection-quarterly-modal-overlay reflection-modal-overlay';
  overlay.dataset.reflectionModal = 'quarterly';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reflection-quarterly-modal-title');
  overlay.innerHTML = `
    <div class="reflection-modal reflection-quarterly-modal" role="document">
      <header class="reflection-modal-header">
        <div>
          <p class="reflection-modal-kicker">Retrospective</p>
          <h2 id="reflection-quarterly-modal-title">90일 회고</h2>
        </div>
      </header>
      <div class="reflection-modal-body">
        <pre class="reflection-quarterly-preview">${_refEscapeHtml(markdown)}</pre>
      </div>
      <div class="reflection-actions">
        <button type="button" class="reflection-btn-close">닫기</button>
        <button type="button" class="reflection-btn-copy reflection-btn-primary">클립보드 복사</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeQ = () => {
    overlay.classList.remove('reflection-modal-open');
    document.removeEventListener('keydown', keyHandler);
    setTimeout(() => overlay.remove(), 220);
  };
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeQ();
    } else if (e.key === 'Tab') {
      _trapReflectionFocus(overlay, e);
    }
  };
  document.addEventListener('keydown', keyHandler);

  overlay.querySelector('.reflection-btn-close').addEventListener('click', closeQ);
  overlay.querySelector('.reflection-btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      if (typeof showToast === 'function') {
        showToast('클립보드 복사 완료', 'success');
      }
    } catch (e) {
      console.error('clipboard 복사 실패:', e);
      if (typeof showToast === 'function') {
        showToast('클립보드 복사 실패', 'error');
      }
    }
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeQ(); });

  requestAnimationFrame(() => {
    overlay.classList.add('reflection-modal-open');
    const firstButton = overlay.querySelector('button');
    if (firstButton) firstButton.focus();
  });
}

function showReflectionOnboarding() {
  if (localStorage.getItem('navigator-reflection-onboarded')) return;
  if (document.querySelector('.reflection-onboarding-modal-overlay')) return;

  const settings = appState.dailyReflection?.settings;
  const history = appState.dailyReflection?.history || {};
  if (Object.keys(history).length > 0) {
    localStorage.setItem('navigator-reflection-onboarded', 'true');
    return;
  }
  if (!settings?.autoModalEnabled) return;

  const overlay = document.createElement('div');
  overlay.className = 'reflection-onboarding-modal-overlay reflection-modal-overlay';
  overlay.dataset.reflectionModal = 'onboarding';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reflection-onboarding-title');
  overlay.innerHTML = `
    <div class="reflection-modal reflection-onboarding-modal" role="document">
      <header class="reflection-modal-header">
        <div>
          <p class="reflection-modal-kicker">New</p>
          <h2 id="reflection-onboarding-title">매일 자문</h2>
        </div>
      </header>
      <div class="reflection-modal-body">
        <p>저녁 자문은 자동으로 열리고, 전체 기록은 자문 탭에서 관리합니다.</p>
        <ol>
          <li>오늘 충동과 압력을 짧게 적기</li>
          <li>내일 작게 완료할 약속 하나 남기기</li>
          <li>주간 자문으로 반복 패턴 확인하기</li>
        </ol>
      </div>
      <div class="reflection-actions">
        <button type="button" class="reflection-btn-close">나중에</button>
        <button type="button" class="reflection-btn-onboard-start reflection-btn-primary">시작</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const finish = (autoModalOn) => {
    appState.dailyReflection.settings.autoModalEnabled = autoModalOn;
    if (typeof saveState === 'function') saveState();
    localStorage.setItem('navigator-reflection-onboarded', 'true');
    document.removeEventListener('keydown', keyHandler);
    overlay.classList.remove('reflection-modal-open');
    setTimeout(() => overlay.remove(), 220);
  };
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    } else if (e.key === 'Tab') {
      _trapReflectionFocus(overlay, e);
    }
  };
  document.addEventListener('keydown', keyHandler);

  overlay.querySelector('.reflection-btn-close').addEventListener('click', () => finish(false));
  overlay.querySelector('.reflection-btn-onboard-start').addEventListener('click', () => finish(true));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });

  requestAnimationFrame(() => {
    overlay.classList.add('reflection-modal-open');
    const firstButton = overlay.querySelector('button');
    if (firstButton) firstButton.focus();
  });
}

function _getReflectionAspectMeta(aspect) {
  const activeAspect = normalizeReflectionAspect(aspect);
  if (activeAspect === 'morning') {
    return {
      label: '아침',
      kicker: appState.dailyReflection.settings.morningTime || '수동',
      desc: '오늘의 분기 목표, 신체 베이스라인, 어제의 충동 패턴을 확인합니다.'
    };
  }
  if (activeAspect === 'weekly') {
    return {
      label: '주간',
      kicker: 'Weekly',
      desc: '일주일 단위로 반복된 압력과 다음 주 한계선을 남깁니다.'
    };
  }
  return {
    label: '저녁',
    kicker: appState.dailyReflection.settings.eveningTime || '22:00',
    desc: '하루를 닫으며 충동, 과잉 약속, 내일의 작은 약속을 남깁니다.'
  };
}

function _getReflectionAspectState(day, aspect) {
  const activeAspect = normalizeReflectionAspect(aspect);
  if (day.compact) {
    return day[`${activeAspect}Answered`] ? '완료' : '미기록';
  }
  const answer = day[activeAspect];
  if (!answer) return '미기록';
  return answer.skipped ? '건너뜀' : '완료';
}

function _isReflectionAspectDone(day, aspect) {
  const activeAspect = normalizeReflectionAspect(aspect);
  if (day.compact) return !!day[`${activeAspect}Answered`];
  return !!(day[activeAspect] && !day[activeAspect].skipped);
}

function _renderReflectionHistoryChip(day, aspect) {
  const meta = _getReflectionAspectMeta(aspect);
  const done = _isReflectionAspectDone(day, aspect);
  const skipped = !day.compact && day[aspect]?.skipped;
  const className = done ? 'done' : skipped ? 'skipped' : 'empty';
  const text = done ? meta.label : skipped ? `${meta.label} 건너뜀` : `${meta.label} -`;
  return `<span class="reflection-history-chip ${className}">${text}</span>`;
}

function _readReflectionInputs(inputs) {
  return {
    q1: (inputs[0]?.value || '').trim(),
    q2: (inputs[1]?.value || '').trim(),
    q3: (inputs[2]?.value || '').trim(),
    skipped: false
  };
}

function _getReflectionFocusable(container) {
  return Array.from(container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.disabled && el.getAttribute('aria-hidden') !== 'true');
}

function _trapReflectionFocus(container, event) {
  const focusable = _getReflectionFocusable(container);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function _restoreReflectionFocus() {
  if (_reflectionLastFocusedEl && document.contains(_reflectionLastFocusedEl)) {
    try { _reflectionLastFocusedEl.focus(); } catch (e) { /* noop */ }
  }
  _reflectionLastFocusedEl = null;
}

function _refEscapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
