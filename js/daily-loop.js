// ============================================
// Daily Loop Revival (P1-P3, P7 measurement)
// ============================================

const LOOP_STATS_STORAGE_KEY = 'navigator-loop-stats';
const DAILY_LOOP_STORAGE_KEY = 'navigator-daily-loop';
const LOOP_STATS_RETENTION_DAYS = 56;

function normalizeTop3TimestampMap(value, pruneExpired) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const cutoff = Date.now() - (LOOP_STATS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const normalized = {};
  Object.entries(source).forEach(([taskId, timestamp]) => {
    if (typeof timestamp !== 'string') return;
    const time = Date.parse(timestamp);
    if (!Number.isFinite(time)) return;
    if (pruneExpired && time < cutoff) return;
    normalized[String(taskId)] = timestamp;
  });
  return normalized;
}

function getDailyLoopDate(date) {
  if (typeof getLogicalDate === 'function') return getLogicalDate(date);
  if (typeof getLocalDateStr === 'function') return getLocalDateStr(date || new Date());
  return new Date(date || Date.now()).toISOString().slice(0, 10);
}

function normalizeLoopStats(stats) {
  const normalized = {};
  const source = stats && typeof stats === 'object' ? stats : {};
  Object.keys(source).forEach(dateKey => {
    const item = source[dateKey] || {};
    normalized[dateKey] = {
      morningOpen: !!item.morningOpen,
      captures: Math.max(0, Number(item.captures || 0)),
      shutdown: !!item.shutdown
    };
  });
  return pruneLoopStats(normalized);
}

function pruneLoopStats(stats) {
  const source = stats && typeof stats === 'object' ? stats : {};
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOP_STATS_RETENTION_DAYS);
  const cutoffKey = getDailyLoopDate(cutoff);
  const pruned = {};
  Object.keys(source).sort().forEach(dateKey => {
    if (dateKey >= cutoffKey) pruned[dateKey] = source[dateKey];
  });
  return pruned;
}

function normalizeDailyLoopState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const tomorrowTop3 = Array.isArray(source.tomorrowTop3) ? source.tomorrowTop3.map(String).slice(0, 3) : [];
  const rawUpdatedAt = normalizeTop3TimestampMap(source.tomorrowTop3UpdatedAt, false);
  const tomorrowTop3UpdatedAt = {};
  tomorrowTop3.forEach(taskId => {
    if (rawUpdatedAt[taskId]) tomorrowTop3UpdatedAt[taskId] = rawUpdatedAt[taskId];
  });
  return {
    tomorrowTop3,
    tomorrowTop3Tombstones: normalizeTop3TimestampMap(source.tomorrowTop3Tombstones, true),
    tomorrowTop3UpdatedAt,
    shutdownNotes: source.shutdownNotes && typeof source.shutdownNotes === 'object' ? source.shutdownNotes : {},
    lastMorningOpenDate: source.lastMorningOpenDate || null,
    lastShutdownDate: source.lastShutdownDate || null,
    shutdownDraft: source.shutdownDraft || ''
  };
}

function ensureLoopStatsDay(dateKey) {
  const key = dateKey || getDailyLoopDate();
  if (!appState.loopStats || typeof appState.loopStats !== 'object') appState.loopStats = {};
  if (!appState.loopStats[key]) {
    appState.loopStats[key] = { morningOpen: false, captures: 0, shutdown: false };
  }
  return appState.loopStats[key];
}

function persistLoopLocalOnly() {
  try {
    appState.loopStats = pruneLoopStats(appState.loopStats || {});
    localStorage.setItem(LOOP_STATS_STORAGE_KEY, JSON.stringify(appState.loopStats || {}));
    localStorage.setItem(DAILY_LOOP_STORAGE_KEY, JSON.stringify(normalizeDailyLoopState(appState.dailyLoop)));
  } catch (error) {
    console.warn('Daily loop local save failed:', error);
  }
}

function markLoopMorningOpen() {
  const dateKey = getDailyLoopDate();
  const stats = ensureLoopStatsDay(dateKey);
  if (!stats.morningOpen) {
    stats.morningOpen = true;
    if (!appState.dailyLoop) appState.dailyLoop = normalizeDailyLoopState(null);
    appState.dailyLoop.lastMorningOpenDate = dateKey;
    persistLoopLocalOnly();
  }
}

function recordLoopCapture(dateKey) {
  const stats = ensureLoopStatsDay(dateKey || getDailyLoopDate());
  stats.captures = Math.max(0, Number(stats.captures || 0)) + 1;
  persistLoopLocalOnly();
}

function markLoopShutdownComplete(dateKey) {
  const key = dateKey || getDailyLoopDate();
  const stats = ensureLoopStatsDay(key);
  stats.shutdown = true;
  if (!appState.dailyLoop) appState.dailyLoop = normalizeDailyLoopState(null);
  appState.dailyLoop.lastShutdownDate = key;
  persistLoopLocalOnly();
}

function getInboxTasks() {
  return (appState.tasks || []).filter(task => !task.completed && (task.category || '미분류') === '미분류');
}

function getDailyLoopTop3Tasks() {
  const state = normalizeDailyLoopState(appState.dailyLoop);
  const pending = (appState.tasks || []).filter(task => !task.completed);
  const byId = new Map(pending.map(task => [String(task.id), task]));
  const selected = state.tomorrowTop3.map(id => byId.get(String(id))).filter(Boolean);
  const fallback = pending
    .filter(task => !selected.some(item => String(item.id) === String(task.id)))
    .slice(0, Math.max(0, 3 - selected.length));
  return selected.concat(fallback).slice(0, 3);
}

function renderGlobalCaptureBar() {
  const value = appState.globalCaptureValue || '';
  return '' +
    '<div class="global-capture-bar" role="search">' +
      '<div class="global-capture-inner">' +
        '<span class="global-capture-icon">' + (typeof svgIcon === 'function' ? svgIcon('plus', 16) : '+') + '</span>' +
        '<input id="global-capture-input" class="global-capture-input" type="text" ' +
          'placeholder="빠른 캡처: 해야 할 일을 적고 Enter" value="' + escapeHtml(value) + '" ' +
          'onkeydown="if(event.key===\'Enter\'){event.preventDefault();addGlobalCapture();}">' +
        '<button class="global-capture-submit" type="button" onclick="addGlobalCapture()" aria-label="캡처 추가">' +
          (typeof svgIcon === 'function' ? svgIcon('check', 15) : '✓') +
        '</button>' +
      '</div>' +
    '</div>';
}

function updateGlobalCaptureValue(value) {
  appState.globalCaptureValue = value || '';
}

function addGlobalCapture() {
  const input = document.getElementById('global-capture-input');
  const rawInput = ((input && input.value) || appState.globalCaptureValue || '').trim();
  if (!rawInput) {
    showToast('캡처할 내용을 입력하세요', 'error');
    return;
  }

  const parsed = typeof parseCategoryPrefix === 'function'
    ? parseCategoryPrefix(rawInput)
    : { category: '미분류', title: rawInput };
  const title = (parsed.title || '').trim();
  if (!title) {
    showToast('제목을 입력하세요', 'error');
    return;
  }

  const now = new Date().toISOString();
  const category = parsed.category || '미분류';
  appState.tasks.unshift({
    id: generateId(),
    title: title,
    category: category,
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    completed: false,
    capturedAt: now,
    createdAt: now,
    updatedAt: now
  });

  appState.globalCaptureValue = '';
  if (input) input.value = '';   // clear DOM before renderStatic — else _snapshotInputs restores the old text
  recordLoopCapture();
  saveState();
  renderStatic();
  showToast(category === '미분류' ? '인박스에 캡처됨' : '[' + category + '] 작업이 추가됨', 'success');
  requestAnimationFrame(() => {
    const nextInput = document.getElementById('global-capture-input');
    if (nextInput) nextInput.focus();
  });
}

function focusGlobalCapture() {
  const input = document.getElementById('global-capture-input');
  if (input) {
    input.focus();
    input.select();
  }
}

function installDailyLoopKeyboard() {
  if (window._dailyLoopKeyboardInstalled) return;
  window._dailyLoopKeyboardInstalled = true;
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    if (editable || event.ctrlKey || event.metaKey || event.altKey) return;
    if (String(event.key).toLowerCase() === 'n') {
      event.preventDefault();
      focusGlobalCapture();
    }
  });
}

function renderDailyLoopActionTab(ctx) {
  markLoopMorningOpen();
  const now = ctx.now || new Date();
  const filteredTasks = ctx.filteredTasks || [];
  const pendingCount = filteredTasks.filter(task => !task.completed).length;
  const completedToday = (ctx.completedTasks && ctx.completedTasks.length) || (appState.todayStats && appState.todayStats.completedToday) || 0;
  const top3 = getDailyLoopTop3Tasks();
  const inboxTasks = getInboxTasks();
  const stats = ensureLoopStatsDay(getDailyLoopDate());
  const medicationCompact = (typeof renderActionMedicationCompact === 'function')
    ? renderActionMedicationCompact()
    : (typeof _renderMedicationCompact === 'function' ? _renderMedicationCompact() : '');

  return '' +
    '<section class="action-status" aria-label="오늘 상태">' +
      '<div class="today-status-bar">' +
        '<div class="today-status-left">' +
          '<span class="today-clock" id="current-clock">' + now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + '</span>' +
          '<span class="today-mode ' + escapeAttr(ctx.mode || '') + '">' + escapeHtml(ctx.mode || 'today') + '</span>' +
          '<span class="today-remaining" id="mode-time-remaining">' + escapeHtml(getModeTimeRemaining(ctx.mode, ctx.hour, now)) + '</span>' +
        '</div>' +
        '<div class="today-status-right">' +
          '<span class="today-progress-mini">' + (typeof _renderActionIcon === 'function' ? _renderActionIcon('check', 14) : '✓') + ' ' + completedToday + ' / ' + (typeof _renderActionIcon === 'function' ? _renderActionIcon('clipboard-list', 14) : '□') + ' ' + pendingCount + '</span>' +
          '<span class="loop-stat-chip">캡처 ' + Number(stats.captures || 0) + '</span>' +
        '</div>' +
      '</div>' +
      (typeof _renderActionAnchors === 'function' ? _renderActionAnchors(filteredTasks, completedToday) : '') +
      (typeof _renderRhythmCompact === 'function' ? _renderRhythmCompact() : '') +
      medicationCompact +
    '</section>' +
    '<section class="action-top3-hero" aria-label="오늘 Top 3">' +
      '<div class="action-loop-section-head"><h2>오늘 Top 3</h2><button type="button" class="loop-text-btn" onclick="switchTab(\'reflection\')">저녁 종료</button></div>' +
      '<div class="top3-list">' + (top3.length ? top3.map(renderTop3TaskCard).join('') : '<div class="loop-empty">인박스에서 오늘 할 일을 골라보세요</div>') + '</div>' +
    '</section>' +
    '<section class="action-today-list" aria-label="오늘 할 일">' +
      '<div class="action-loop-section-head"><h2>오늘 할 일</h2><span>' + pendingCount + '개</span></div>' +
      (typeof _renderTodayTaskPreview === 'function' ? _renderTodayTaskPreview(filteredTasks) : '') +
      (!filteredTasks.length ? '<div class="loop-empty">오늘 표시할 일이 없습니다</div>' : '') +
    '</section>' +
    '<section class="action-inbox-review" aria-label="인박스 정리">' +
      '<div class="action-loop-section-head"><h2>인박스</h2><span>' + inboxTasks.length + '개</span></div>' +
      (inboxTasks.length ? inboxTasks.slice(0, 8).map(renderInboxReviewItem).join('') : '<div class="loop-empty">미분류 캡처 없음</div>') +
    '</section>';
}

function renderTop3TaskCard(task) {
  return '' +
    '<article class="top3-task-card" data-task-id="' + escapeAttr(task.id) + '">' +
      '<button type="button" class="top3-check" onclick="completeTask(\'' + escapeAttr(task.id) + '\')" aria-label="' + escapeAttr(task.title) + ' 완료">' +
        (typeof _renderActionIcon === 'function' ? _renderActionIcon('check', 15) : '✓') +
      '</button>' +
      '<div><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(task.category || '미분류') + '</span></div>' +
      '<button type="button" class="top3-edit" onclick="editTask(\'' + escapeAttr(task.id) + '\')" aria-label="' + escapeAttr(task.title) + ' 수정">' +
        (typeof _renderActionIcon === 'function' ? _renderActionIcon('edit', 14) : 'edit') +
      '</button>' +
    '</article>';
}

function renderInboxReviewItem(task) {
  const cats = ['본업', '부업', '일상', '가족', '이벤트'];
  return '' +
    '<article class="inbox-review-item" data-task-id="' + escapeAttr(task.id) + '">' +
      '<div class="inbox-review-title">' + escapeHtml(task.title) + '</div>' +
      '<div class="inbox-review-actions">' +
        cats.map(cat => '<button type="button" onclick="setInboxTaskCategory(\'' + escapeAttr(task.id) + '\', \'' + cat + '\')">' + escapeHtml(cat) + '</button>').join('') +
        '<button type="button" onclick="moveInboxTaskToToday(\'' + escapeAttr(task.id) + '\')">오늘</button>' +
      '</div>' +
    '</article>';
}

function setInboxTaskCategory(taskId, category) {
  const now = new Date().toISOString();
  appState.tasks = (appState.tasks || []).map(task => String(task.id) === String(taskId)
    ? { ...task, category: category, updatedAt: now }
    : task
  );
  saveState();
  renderStatic();
}

function moveInboxTaskToToday(taskId) {
  const today = getDailyLoopDate();
  const now = new Date().toISOString();
  appState.tasks = (appState.tasks || []).map(task => String(task.id) === String(taskId)
    ? { ...task, deadline: today, updatedAt: now }
    : task
  );
  saveState();
  renderStatic();
}

function toggleTomorrowTop3(taskId) {
  if (!appState.dailyLoop) appState.dailyLoop = normalizeDailyLoopState(null);
  const state = normalizeDailyLoopState(appState.dailyLoop);
  const id = String(taskId);
  const now = new Date().toISOString();
  if (state.tomorrowTop3.includes(id)) {
    state.tomorrowTop3 = state.tomorrowTop3.filter(item => item !== id);
    state.tomorrowTop3Tombstones[id] = now;
    delete state.tomorrowTop3UpdatedAt[id];
  } else {
    if (state.tomorrowTop3.length >= 3) {
      showToast('내일 Top 3는 3개까지 선택할 수 있어요', 'info');
      return;
    }
    state.tomorrowTop3 = state.tomorrowTop3.concat(id);
    state.tomorrowTop3UpdatedAt[id] = now;
    delete state.tomorrowTop3Tombstones[id];
  }
  appState.dailyLoop = state;
  persistLoopLocalOnly();
  saveState();
  renderStatic();
}

function renderDailyShutdownPanel() {
  const today = getDailyLoopDate();
  const state = normalizeDailyLoopState(appState.dailyLoop);
  const selected = new Set(state.tomorrowTop3.map(String));
  const pending = (appState.tasks || []).filter(task => !task.completed).slice(0, 12);
  const complete = !!(appState.loopStats && appState.loopStats[today] && appState.loopStats[today].shutdown);
  return '' +
    '<section class="daily-shutdown-panel" aria-labelledby="daily-shutdown-title">' +
      '<div class="daily-shutdown-head"><div><span class="reflection-kicker">Daily loop</span><h3 id="daily-shutdown-title">저녁 종료</h3></div><span class="shutdown-state ' + (complete ? 'done' : '') + '">' + (complete ? '완료' : '대기') + '</span></div>' +
      '<textarea id="daily-shutdown-notes" class="daily-shutdown-notes" rows="3" placeholder="오늘 정리와 내일 시작 메모" oninput="updateShutdownDraft(this.value)">' + escapeHtml(state.shutdownNotes[today] || state.shutdownDraft || '') + '</textarea>' +
      '<div class="shutdown-top3-picker" aria-label="내일 Top 3 선택">' +
        (pending.length ? pending.map(task => '<button type="button" class="shutdown-task-pill ' + (selected.has(String(task.id)) ? 'selected' : '') + '" onclick="toggleTomorrowTop3(\'' + escapeAttr(task.id) + '\')" aria-pressed="' + (selected.has(String(task.id)) ? 'true' : 'false') + '">' + escapeHtml(task.title) + '</button>').join('') : '<div class="loop-empty compact">선택할 미완료 작업이 없습니다</div>') +
      '</div>' +
      '<button type="button" class="daily-shutdown-save" onclick="saveDailyShutdown()">종료 저장</button>' +
    '</section>';
}

function saveDailyShutdown() {
  const today = getDailyLoopDate();
  const input = document.getElementById('daily-shutdown-notes');
  if (!appState.dailyLoop) appState.dailyLoop = normalizeDailyLoopState(null);
  const state = normalizeDailyLoopState(appState.dailyLoop);
  state.shutdownNotes[today] = input ? input.value.trim() : '';
  state.shutdownDraft = '';
  appState.dailyLoop = state;
  markLoopShutdownComplete(today);
  saveState();
  renderStatic();
  showToast('저녁 종료 저장됨', 'success');
}

// Keep the shutdown note alive across re-renders (aspect-tab switches call
// renderReflectionTab directly, bypassing renderStatic's snapshot/restore net).
function updateShutdownDraft(value) {
  if (!appState.dailyLoop) appState.dailyLoop = normalizeDailyLoopState(null);
  appState.dailyLoop.shutdownDraft = value || '';
}

function getLoopGateSummary(days) {
  const horizon = days || 14;
  const stats = normalizeLoopStats(appState.loopStats || {});
  const dates = Object.keys(stats).sort().slice(-horizon);
  const total = dates.length;
  const morning = dates.filter(date => stats[date].morningOpen).length;
  const shutdown = dates.filter(date => stats[date].shutdown).length;
  const captures = dates.reduce((sum, date) => sum + Number(stats[date].captures || 0), 0);
  return { days: total, morningOpen: morning, shutdown: shutdown, captures: captures };
}

function renderLoopGatePanel() {
  const summary = getLoopGateSummary(14);
  return '' +
    '<section class="loop-gate-panel" aria-label="Daily loop measurement">' +
      '<div><span>최근 14일</span><strong>' + summary.days + '일 기록</strong></div>' +
      '<div><span>아침 진입</span><strong>' + summary.morningOpen + '</strong></div>' +
      '<div><span>캡처</span><strong>' + summary.captures + '</strong></div>' +
      '<div><span>종료</span><strong>' + summary.shutdown + '</strong></div>' +
    '</section>';
}

function renderStartTriggerGuide() {
  const shutdownTime = (appState.settings && appState.settings.shutdownTime) || '22:30';
  return '' +
    '<div class="start-trigger-guide">' +
      '<div><strong>시작 트리거</strong><span>홈 화면에 설치하고 N 키로 캡처</span></div>' +
      '<div><strong>종료 시각</strong><span>' + escapeHtml(shutdownTime) + '</span></div>' +
    '</div>';
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    LOOP_STATS_STORAGE_KEY,
    DAILY_LOOP_STORAGE_KEY,
    normalizeLoopStats,
    pruneLoopStats,
    normalizeDailyLoopState,
    markLoopMorningOpen,
    recordLoopCapture,
    markLoopShutdownComplete,
    renderGlobalCaptureBar,
    updateGlobalCaptureValue,
    addGlobalCapture,
    focusGlobalCapture,
    installDailyLoopKeyboard,
    renderDailyLoopActionTab,
    renderDailyShutdownPanel,
    saveDailyShutdown,
    updateShutdownDraft,
    toggleTomorrowTop3,
    setInboxTaskCategory,
    moveInboxTaskToToday,
    getLoopGateSummary,
    renderLoopGatePanel,
    renderStartTriggerGuide
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeLoopStats,
    pruneLoopStats,
    normalizeDailyLoopState,
    getLoopGateSummary
  };
}
