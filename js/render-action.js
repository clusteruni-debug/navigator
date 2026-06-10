// ============================================
// 렌더링 - 실행 탭 (오늘)
// ============================================

/**
 * 실행(오늘) 탭 HTML을 반환한다.
 * 핵심: "지금 할 것" 중심 — 나머지는 최소화
 */
// safeCatId is defined in utils.js (single source — shared across render files)

const ACTION_SVG_ICONS = {
  check: '<polyline points="20 6 9 17 4 12"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  'circle-fill': '<circle cx="12" cy="12" r="6"/>',
  'clipboard-list': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  'bar-chart-3': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  'rotate-ccw': '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/>',
  'alert-triangle': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  timer: '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
  coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h11z"/><path d="M18 8h1a3 3 0 0 1 0 6h-1"/><path d="M6 2v2"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  square: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>'
};

function _renderActionIcon(name, size = 16, className = 'action-svg-icon') {
  const path = ACTION_SVG_ICONS[name];
  if (!path) return '';
  if (name === 'circle-fill') {
    return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${path}</svg>`;
  }
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function _getActionUrgencyText(urgencyClass) {
  const labels = {
    urgent: '긴급',
    warning: '주의',
    expired: '마감 지남',
    normal: '지금 할 것'
  };
  return labels[urgencyClass] || labels.normal;
}

function _renderDeadlineMeta(deadline, isRepeat) {
  const text = formatDeadline(deadline, isRepeat);
  if (!text) return '';
  const now = new Date();
  const d = new Date(deadline);
  const hoursLeft = (d - now) / (1000 * 60 * 60);
  const warningClass = (hoursLeft < 24 && !(isRepeat && hoursLeft < 0)) ? ' warning' : '';
  return `<span class="meta-chip${warningClass}">${_renderActionIcon('alert-triangle', 13)}${escapeHtml(text)}</span>`;
}

function _getMedicationSlotShortLabel(slot) {
  const match = String(slot.label || '').match(/\(([^)]+)\)/);
  if (match) return match[1];
  return String(slot.label || '').replace(/^ADHD약\s*/, '').replace(/^영양제\s*/, '');
}

function _renderActionSectionTitle(label, countText) {
  return `
    <div class="section-title action-section-title">
      <span>${escapeHtml(label)}</span>
      ${countText ? `<span class="count">${escapeHtml(countText)}</span>` : ''}
    </div>
  `;
}

function _getActionAnchors(filteredTasks, completedToday) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const pending = (filteredTasks || []).filter(t => !t.completed);
  const withDeadline = pending.filter(t => t.deadline);

  return {
    todayDeadline: withDeadline.filter(t => {
      const d = new Date(t.deadline);
      return !isNaN(d.getTime()) && d >= todayStart && d < todayEnd;
    }).length,
    thisWeek: withDeadline.filter(t => {
      const d = new Date(t.deadline);
      return !isNaN(d.getTime()) && d >= todayStart && d < weekEnd;
    }).length,
    completed: completedToday || 0,
    streak: (appState.streak && appState.streak.current) || 0
  };
}

function _renderActionAnchors(filteredTasks, completedToday) {
  const anchors = _getActionAnchors(filteredTasks, completedToday);
  return `
    <div class="anchors action-anchors tab-anchor-row" aria-label="오늘 안정 앵커">
      <div class="anchor urgent tab-anchor">
        <span class="anchor-label">오늘 마감</span>
        <span class="anchor-value">${anchors.todayDeadline}</span>
      </div>
      <div class="anchor warn tab-anchor">
        <span class="anchor-label">이번 주</span>
        <span class="anchor-value">${anchors.thisWeek}</span>
      </div>
      <div class="anchor success tab-anchor">
        <span class="anchor-label">완료</span>
        <span class="anchor-value">${anchors.completed}</span>
      </div>
      <div class="anchor celebration tab-anchor">
        <span class="anchor-label">연속</span>
        <span class="anchor-value">${_renderActionIcon('flame', 15)}${anchors.streak}</span>
      </div>
    </div>
  `;
}

function _getResolutionSortTime(resolution) {
  const dateValue = resolution.deadline || resolution.dueDate || resolution.targetDate || resolution.endDate || resolution.startDate || resolution.createdAt;
  if (!dateValue) return Number.MAX_SAFE_INTEGER;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function _getResolutionDayCount(resolution, now) {
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startValue = resolution.startDate || resolution.createdAt;
  const start = startValue ? new Date(startValue) : now;
  const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  if (isNaN(startMs)) return 0;
  return Math.max(0, Math.floor((todayMs - startMs) / 86400000));
}

function _formatResolutionNumber(value, prefix) {
  if (value === undefined || value === null || value === '') return null;
  const text = typeof value === 'number' ? Number(value).toLocaleString() : String(value);
  if (!prefix || text.startsWith(prefix)) return text;
  return prefix + text;
}

function _formatResolutionMiniItem(resolution, now) {
  const title = resolution.title || resolution.name || '결심';
  const current = resolution.doneAmount ?? resolution.doneCount ?? resolution.current ?? resolution.progress ?? resolution.count ?? null;
  const target = resolution.targetAmount ?? resolution.target ?? resolution.goal ?? resolution.total ?? null;
  const currencyPrefix = resolution.currency === 'USD' || resolution.unit === '$' || String(title).includes('$') ? '$' : '';

  if (target !== null && target !== undefined && target !== '') {
    const currentText = _formatResolutionNumber(current === null ? 0 : current, currencyPrefix);
    const targetText = _formatResolutionNumber(target, currencyPrefix);
    return `${title} ${currentText}/${targetText}`;
  }

  return `${title} ${_getResolutionDayCount(resolution, now)}일째`;
}

function _renderResolutionsMini() {
  const now = new Date();
  const activeResolutions = (appState.resolutions || [])
    .filter(r => r && r.active !== false)
    .slice()
    .sort((a, b) => _getResolutionSortTime(a) - _getResolutionSortTime(b))
    .slice(0, 3);

  const listText = activeResolutions.length > 0
    ? activeResolutions.map(r => _formatResolutionMiniItem(r, now)).join(' · ')
    : '기록할 결심을 일상 탭에서 추가하세요';

  return `
    <div class="resolutions-mini">
      <span class="resolutions-mini-label">오늘 결심</span>
      <span class="resolutions-mini-list">${escapeHtml(listText)}</span>
      <button class="resolutions-mini-btn" type="button" onclick="openResolutionRecordModal()" title="일상 탭에서 결심 기록">
        ${_renderActionIcon('plus', 13)}
        <span>일상에서 기록 ▸</span>
      </button>
    </div>
  `;
}

function openResolutionRecordModal() {
  if (typeof switchTab === 'function') {
    switchTab('life');
    requestAnimationFrame(() => {
      const section = document.querySelector('.resolution-section');
      if (section) section.scrollIntoView({ block: 'start' });
    });
  }
  if (typeof showToast === 'function') {
    showToast('일상 탭 → 결심 트래커 에서 기록', 'info');
  }
}
window.openResolutionRecordModal = openResolutionRecordModal;

function _getPreviewDeadlineChip(task) {
  if (!task.deadline) return '';
  const isRepeat = task.repeatType && task.repeatType !== 'none';
  const text = formatDeadline(task.deadline, isRepeat);
  if (!text) return '';
  const urgency = getUrgencyLevel(task);
  let cls = urgency === 'expired' || urgency === 'urgent' ? 'urgent' : urgency === 'warning' ? 'warn' : '';
  if (isRepeat && text === '오늘') cls = 'warn'; // 반복 '오늘'은 빨강 대신 주의 톤
  return `<span class="dday-chip ${cls}">${escapeHtml(text)}</span>`;
}

function _renderTodayPreviewTask(task) {
  const urgency = getUrgencyLevel(task);
  const rowUrgency = urgency === 'expired' || urgency === 'urgent' ? 'urgent' : urgency === 'warning' ? 'warn' : '';
  const category = safeCatId(task.category);
  return `
    <div class="task-row action-task-preview-row cat-${category} ${rowUrgency}" style="--task-cat-color: var(--cat-${category})" data-task-id="${escapeAttr(task.id)}">
      <button class="action-preview-check" type="button" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')" aria-label="${escapeAttr(task.title)} 완료">
        ${_renderActionIcon('check', 14)}
      </button>
      <div class="task-main">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <span class="task-meta">
          <span class="cat-tag cat-${category}">${escapeHtml(category)}</span>
          ${task.repeatType && task.repeatType !== 'none' ? `<span class="repeat-mark">${_renderActionIcon('repeat', 12)}${escapeHtml(getRepeatLabel(task.repeatType, task))}</span>` : ''}
          ${task.estimatedTime ? `<span>${_renderActionIcon('clock', 12)}${Number(task.estimatedTime)}분</span>` : ''}
        </span>
      </div>
      ${_getPreviewDeadlineChip(task)}
    </div>
  `;
}

function _renderTodayTaskPreview(filteredTasks) {
  const pendingTasks = (filteredTasks || []).filter(t => !t.completed);
  if (pendingTasks.length === 0) return '';
  const previewTasks = pendingTasks.slice(0, 3);
  return `
    ${_renderActionSectionTitle('오늘 미리보기', `상위 ${previewTasks.length} / 진행 중 ${pendingTasks.length}`)}
    <div class="today-task-preview">
      ${previewTasks.map(task => _renderTodayPreviewTask(task)).join('')}
    </div>
  `;
}

(function initActionToastFixedBehavior() {
  if (window.__navigatorActionToastFixedBehavior) return;
  window.__navigatorActionToastFixedBehavior = true;

  function markToast(node) {
    if (!node || !node.classList) return;
    if (node.classList.contains('toast') || node.classList.contains('toast-undo')) {
      node.classList.add('toast-fixed', 'active');
    }
  }

  function scanToasts() {
    document.querySelectorAll('.toast, .toast-undo').forEach(markToast);
  }

  function startObserver() {
    scanToasts();
    if (typeof MutationObserver === 'function' && document.body) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(markToast);
        });
      });
      observer.observe(document.body, { childList: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

  document.addEventListener('keydown', event => {
    const target = event.target;
    const isEditable = target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]');
    if (isEditable) return;

    if (event.key === 'Escape') {
      document.querySelectorAll('.toast-fixed.active, .toast-undo, .toast').forEach(toast => toast.remove());
      return;
    }

    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'z') {
      const undoButton = document.querySelector('.toast-undo .toast-undo-btn');
      if (undoButton) {
        event.preventDefault();
        undoButton.click();
      }
    }
  });
})();

function renderActionTab(ctx) {
  var now = ctx.now;
  var hour = ctx.hour;
  var filteredTasks = ctx.filteredTasks;
  var nextAction = ctx.nextAction;
  var mode = ctx.mode;
  var urgencyClass = ctx.urgencyClass;

  // 오늘 작업 수
  const pendingCount = filteredTasks.filter(t => !t.completed).length;
  const completedToday = (ctx.completedTasks && ctx.completedTasks.length) || (appState.todayStats && appState.todayStats.completedToday) || 0;
  const noTasks = !appState.tasks || appState.tasks.length === 0;
  const medicationCompact = (typeof renderActionMedicationCompact === 'function')
    ? renderActionMedicationCompact()
    : _renderMedicationCompact();

  // TODO(routing): _renderResolutionSection() - move to dashboard or settings.
  // TODO(routing): other pending/completed action sections now belong in all/history tabs.

  return `
        <!-- 컴팩트 상단 바: 시간 + 모드 + 진행률 -->
        <div class="today-status-bar">
          <div class="today-status-left">
            <span class="today-clock" id="current-clock">${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="today-mode ${mode}">${mode}</span>
            <span class="today-remaining" id="mode-time-remaining">${getModeTimeRemaining(mode, hour, now)}</span>
          </div>
          <div class="today-status-right">
            <span class="today-progress-mini" aria-label="오늘 완료 ${completedToday}개, 남은 작업 ${pendingCount}개">
              ${_renderActionIcon('check', 14)} ${completedToday} / ${_renderActionIcon('clipboard-list', 14)} ${pendingCount}
            </span>
            ${(appState.streak && appState.streak.current > 0) ? `<span class="today-streak">${_renderActionIcon('flame', 14)}${appState.streak.current}</span>` : ''}
          </div>
        </div>

        ${_renderActionAnchors(filteredTasks, completedToday)}
        ${_renderResolutionsMini()}
        ${_renderRhythmCompact()}
        ${medicationCompact}

        <!-- ▶ 지금 할 것 (메인 히어로) - moved back to position 6 (task preview 위까지) per user 2026-05-23 -->
        ${nextAction ? `
          <div class="action-section-label">지금 할 것</div>
          <div class="next-action ${urgencyClass}" style="--task-cat-color: var(--cat-${safeCatId(nextAction.category)})">
            <div class="next-action-label">
              <span class="next-action-label-main">
                ${urgencyClass === 'normal' ? _renderActionIcon('target', 13) : _renderActionIcon('alert-triangle', 13)}
                ${_getActionUrgencyText(urgencyClass)}
              </span>
              ${nextAction.deadline ? `<span class="next-action-deadline">${escapeHtml(formatDeadline(nextAction.deadline, nextAction.repeatType && nextAction.repeatType !== 'none'))}</span>` : ''}
            </div>
            <div class="next-action-title">${escapeHtml(nextAction.title)}</div>
            <div class="next-action-meta">
              <span class="meta-chip category">${_renderActionIcon('circle-fill', 13)}${escapeHtml(nextAction.category)}</span>
              ${nextAction.repeatType && nextAction.repeatType !== 'none' ? `<span class="meta-chip">${_renderActionIcon('repeat', 13)}${escapeHtml(getRepeatLabel(nextAction.repeatType, nextAction))}</span>` : ''}
              ${nextAction.estimatedTime ? `<span class="meta-chip">${_renderActionIcon('clock', 13)}${nextAction.estimatedTime}분</span>` : ''}
              ${nextAction.deadline ? _renderDeadlineMeta(nextAction.deadline, nextAction.repeatType && nextAction.repeatType !== 'none') : ''}
              ${nextAction.expectedRevenue ? `<span class="meta-chip">${_renderActionIcon('dollar', 13)}${Number(nextAction.expectedRevenue).toLocaleString()}원</span>` : ''}
            </div>
            ${Array.isArray(nextAction.subtasks) && nextAction.subtasks.length > 0 ? `
              <div class="next-action-subtasks">
                ${nextAction.subtasks.slice(0, 5).map((st, idx) => `
                  <div class="next-action-subtask ${st.completed ? 'completed' : ''}"
                    role="button" tabindex="0" aria-pressed="${st.completed ? 'true' : 'false'}"
                    aria-label="${escapeAttr(st.text)} ${st.completed ? '완료 해제' : '완료'} (길게 누르면 과거 날짜 선택)"
                    onclick="if(this._longPressed){this._longPressed=false;return;}toggleSubtaskComplete('${escapeAttr(nextAction.id)}', ${idx})"
                    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSubtaskComplete('${escapeAttr(nextAction.id)}', ${idx});}"
                    onpointerdown="this._lpTimer = setTimeout(() => { this._longPressed = true; showSubtaskBackdateMenu('${escapeAttr(nextAction.id)}', ${idx}, this); }, 500)"
                    onpointerup="clearTimeout(this._lpTimer)"
                    onpointerleave="clearTimeout(this._lpTimer)">
                    <span class="next-action-subtask-check">${st.completed ? _renderActionIcon('check', 14) : _renderActionIcon('circle', 14)}</span>
                    <span class="next-action-subtask-label">${escapeHtml(st.text)}</span>
                    <span class="next-action-subtask-hint" title="길게 눌러서 과거 날짜로 기록" aria-hidden="true">⋯</span>
                  </div>
                `).join('')}
                ${nextAction.subtasks.length > 5 ? `<div class="next-action-subtask-more">${nextAction.subtasks.length - 5}개 더</div>` : ''}
              </div>
            ` : ''}
            <div class="next-action-buttons">
              ${nextAction.link ? `<button class="btn btn-primary" onclick="handleGo('${escapeAttr(nextAction.link)}')">${_renderActionIcon('rocket', 15)} GO</button>` : ''}
              <button class="btn btn-success" onclick="completeTask('${escapeAttr(nextAction.id)}')">${_renderActionIcon('check', 15)} 완료</button>
              <button class="btn btn-secondary btn-sm" onclick="postponeTask('${escapeAttr(nextAction.id)}')">${_renderActionIcon('rotate-ccw', 14)} 내일로</button>
              <button class="btn btn-secondary btn-sm" onclick="editTask('${escapeAttr(nextAction.id)}')">${_renderActionIcon('edit', 14)} 수정</button>
            </div>
          </div>
        ` : ''}

        ${_renderTodayTaskPreview(filteredTasks)}

        <!-- 빠른 추가 -->
        <div class="quick-add-simple">
          <input
            type="text"
            id="quick-add-input"
            class="quick-add-input"
            placeholder="+ 새 작업 추가 (#본업 #부업 #자기계발 #일상 #가족 #이벤트)"
            value="${escapeHtml(appState.quickAddValue)}"
            onkeypress="if(event.key==='Enter') quickAdd()"
          >
          <button class="quick-add-btn" onclick="quickAdd()" aria-label="빠른 작업 추가">${_renderActionIcon('plus', 18)}</button>
        </div>

        ${!nextAction ? (noTasks ? _renderNoTasksEmptyState() : _renderTodayEmptyState(completedToday)) : ''}

        <!-- 포모도로 (활성 시에만) -->
        ${_renderPomodoroIfActive()}
        `;
}

/**
 * 빈 상태 (NavigatorZero)
 */
function _renderTodayEmptyState(completedToday) {
  const rest = getRestActivity();
  const streak = (appState.streak && appState.streak.current) || 0;
  const messages = [
    '오늘의 할 일을 모두 끝냈어요!',
    '깔끔하게 정리됐어요!',
    '완벽한 하루!',
    '오늘도 해냈어요!'
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  return `
    <div class="empty-state-enhanced todoist-zero" id="todoist-zero">
      <div class="empty-state-icon-large">${_renderActionIcon('trophy', 42)}</div>
      <div class="empty-state-title">#NavigatorZero</div>
      <div class="empty-state-subtitle">
        ${msg}<br>
        오늘 <strong>${completedToday}개</strong> 완료
        ${streak > 1 ? ` · <span class="today-streak inline">${_renderActionIcon('flame', 14)}${streak}일 연속</span>` : ''}
      </div>
      <div class="empty-state-actions">
        <button class="empty-state-btn" onclick="showToast('${escapeAttr(rest.text)}: ${escapeAttr(rest.desc)}', 'success')" title="${escapeAttr(rest.desc)}">
          ${escapeHtml(rest.text)} ▸
        </button>
      </div>
    </div>
  `;
}

function _renderNoTasksEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${_renderActionIcon('clipboard-list', 34)}</div>
      <div>작업이 없습니다</div>
      <div class="empty-state-helper">위 입력창에서 새 작업을 추가해보세요</div>
    </div>
  `;
}

/**
 * 리듬 트래커 (컴팩트)
 */
function _renderRhythmCompact() {
  const today = getLogicalDate();
  const lifeRhythm = appState.lifeRhythm || {};
  const todayRhythm = lifeRhythm.today || {};
  const rhythm = (todayRhythm.date === today) ? todayRhythm : { wakeUp: null, homeDepart: null, workArrive: null, workDepart: null, homeArrive: null, sleep: null, medications: {} };
  const rhythmItems = [
    { key: 'wakeUp', label: '기상', icon: 'sun', value: rhythm.wakeUp },
    { key: 'homeDepart', label: '집에서 출발', icon: 'arrow-right', value: rhythm.homeDepart },
    { key: 'workArrive', label: '출근', icon: 'briefcase', value: rhythm.workArrive },
    { key: 'workDepart', label: '퇴근', icon: 'clock', value: rhythm.workDepart },
    { key: 'homeArrive', label: '집 도착', icon: 'home', value: rhythm.homeArrive },
    { key: 'sleep', label: '취침', icon: 'moon', value: rhythm.sleep }
  ];
  const recordedCount = rhythmItems.filter(item => item.value).length;

  return `
    ${_renderActionSectionTitle('라이프 리듬', `${recordedCount} / ${rhythmItems.length}`)}
    <div class="rhythm-strip">
      ${rhythmItems.map(item => `
        <button class="rhythm-btn ${item.value ? 'recorded' : ''}"
                onclick="handleLifeRhythmClick('${item.key}', ${item.value ? 'true' : 'false'}, event)">
          ${_renderActionIcon(item.icon, 18)}
          <span class="rhythm-label">${item.label}</span>
          <span class="rhythm-time">${item.value || '--:--'}</span>
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * 복약 트래커 (컴팩트)
 */
function _renderMedicationCompact() {
  const allSlots = getMedicationSlots();
  if (!allSlots || allSlots.length === 0) return '';

  const todayStr = getLogicalDate();
  const lifeRhythm = appState.lifeRhythm || {};
  const todayBlock = lifeRhythm.today || {};
  const todayRhythm = (todayBlock.date === todayStr) ? todayBlock : {};
  const todayMeds = (todayRhythm.medications) || {};
  const slotsWithIndex = allSlots.map((slot, idx) => ({ slot, idx }));
  const requiredSlots = slotsWithIndex.filter(item => item.slot.required);
  const optionalSlots = slotsWithIndex.filter(item => !item.slot.required);

  return `
    <div class="action-section-label">복약</div>
    ${_renderMedicationGroup('ADHD약 (필수)', requiredSlots, true, todayMeds)}
    ${_renderMedicationGroup('영양제 (선택)', optionalSlots, false, todayMeds)}
  `;
}

function _renderMedicationGroup(label, indexedSlots, requiredGroup, todayMeds) {
  const takenCount = indexedSlots.filter(item => todayMeds[item.slot.id]).length;
  const totalCount = indexedSlots.length;
  const complete = totalCount > 0 && takenCount === totalCount;
  const streak = (requiredGroup && typeof getMedicationStreak === 'function') ? getMedicationStreak() : 0;
  const iconName = requiredGroup ? 'pill' : 'leaf';
  const slotsClass = totalCount >= 3 ? 'medication-group-slots three' : 'medication-group-slots';

  return `
    <div class="medication-group ${requiredGroup ? 'required-group' : 'optional-group'}">
      <div class="medication-group-header">
        <span class="medication-group-label ${requiredGroup ? 'required' : ''}">
          ${_renderActionIcon(iconName, 14)}
          ${label}
        </span>
        <div class="medication-group-header-right">
          <span class="medication-group-count ${complete ? 'complete' : ''}">
            ${takenCount}/${totalCount}${requiredGroup && streak > 0 ? ` · ${_renderActionIcon('flame', 13)}${streak}` : ''}
          </span>
          <button class="medication-add-btn" type="button" onclick="addMedicationSlot()" title="슬롯 추가" aria-label="${escapeAttr(label)} 슬롯 추가">
            ${_renderActionIcon('plus', 12)}
          </button>
        </div>
      </div>
      <div class="${slotsClass}">
        ${indexedSlots.map(item => _renderMedicationSlot(item.slot, item.idx, requiredGroup, todayMeds)).join('')}
      </div>
    </div>
  `;
}

function _renderMedicationSlot(slot, originalIndex, requiredGroup, todayMeds) {
  const taken = !!todayMeds[slot.id];
  const timeVal = todayMeds[slot.id] || '--:--';
  const shortLabel = _getMedicationSlotShortLabel(slot);
  const deleteLabel = slot.label + ' 슬롯 삭제';

  return `
    <button class="medication-btn ${taken ? 'taken' : ''} ${requiredGroup ? 'required' : ''}"
            onclick="handleMedicationClick('${escapeAttr(slot.id)}', ${taken}, event)">
      ${taken ? _renderActionIcon('check', 14, 'medication-icon-lucide') : ''}
      <span class="medication-btn-label">${escapeHtml(shortLabel)}</span>
      <span class="medication-btn-time">${escapeHtml(timeVal)}</span>
      ${taken ? '' : '<span class="medication-btn-edit-hint">탭하여 기록</span>'}
      <span class="medication-btn-delete"
            tabindex="0"
            title="슬롯 삭제"
            aria-label="${escapeAttr(deleteLabel)}"
            onclick="event.stopPropagation(); deleteMedicationSlot(${originalIndex})"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();deleteMedicationSlot(${originalIndex})}">
        ${_renderActionIcon('x', 10)}
      </span>
    </button>
  `;
}

/**
 * 포모도로 (활성 시에만)
 */
function _renderPomodoroIfActive() {
  const pomo = appState.pomodoro;
  const currentTask = pomo.currentTaskId ? (appState.tasks || []).find(t => t.id === pomo.currentTaskId) : null;
  if (!pomo.isRunning && !pomo.isBreak && pomo.completedPomodoros === 0) {
    return '';
  }
  return `
    <div class="pomodoro-section ${pomo.isRunning ? 'active' : ''} ${pomo.isBreak ? 'break' : ''}">
      <div class="pomodoro-title">${_renderActionIcon(pomo.isBreak ? 'coffee' : 'timer', 16)}${pomo.isBreak ? '휴식 중' : '포모도로'}</div>
      <div class="pomodoro-time" id="pomodoro-time">${formatPomodoroTime(pomo.timeLeft)}</div>
      ${currentTask ? `<div class="pomodoro-task">${_renderActionIcon('target', 14)}${escapeHtml(currentTask.title)}</div>` : ''}
      <div class="pomodoro-controls">
        ${pomo.isRunning ? `
          <button class="pomodoro-btn pause" onclick="pausePomodoro()">${_renderActionIcon('pause', 14)} 일시정지</button>
        ` : `
          <button class="pomodoro-btn start" onclick="resumePomodoro()">${_renderActionIcon('play', 14)} 재개</button>
        `}
        <button class="pomodoro-btn stop" onclick="stopPomodoro()">${_renderActionIcon('square', 14)} 중지</button>
      </div>
    </div>
  `;
}

/**
 * 상세 추가 폼 (수정 모드)
 */
function _renderDetailedAddForm(categoryFields) {
  return `
    <div class="add-task-section">
      <h3>${appState.editingTaskId ? svgIcon('edit', 16) + ' 작업 수정' : svgIcon('plus', 16) + ' 상세 추가'}</h3>
      <div class="form-group">
        <label class="form-label">카테고리</label>
        <select class="form-select" id="detailed-category" onchange="updateDetailedTaskCategory(this.value)">
          <option value="본업" ${appState.detailedTask.category === '본업' ? 'selected' : ''}>본업</option>
          <option value="부업" ${appState.detailedTask.category === '부업' ? 'selected' : ''}>부업</option>
          <option value="자기계발" ${appState.detailedTask.category === '자기계발' ? 'selected' : ''}>자기계발</option>
          <option value="일상" ${appState.detailedTask.category === '일상' ? 'selected' : ''}>일상</option>
          <option value="가족" ${appState.detailedTask.category === '가족' ? 'selected' : ''}>가족</option>
          <option value="이벤트" ${appState.detailedTask.category === '이벤트' ? 'selected' : ''}>이벤트</option>
        </select>
      </div>

      ${appState.detailedTask.category === '본업' && appState.workProjects.filter(p => !p.archived).length > 0 ? `
        <div class="work-project-link-section" style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label">프로젝트 연결 (선택)</label>
            <select class="form-select" id="detailed-work-project" onchange="updateWorkProjectLink(this.value)">
              <option value="">연결 안함 (일반 할일)</option>
              ${appState.workProjects.filter(p => !p.archived).map(p => `
                <option value="${p.id}" ${appState.detailedTask.workProjectId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>
              `).join('')}
            </select>
          </div>
          ${appState.detailedTask.workProjectId ? `
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label">단계</label>
              <select class="form-select" id="detailed-work-stage" onchange="updateWorkStageLink(this.value)">
                ${appState.workProjectStages.map((stage, idx) => `
                  <option value="${idx}" ${appState.detailedTask.workStageIdx === idx ? 'selected' : ''}>${idx + 1}. ${stage}</option>
                `).join('')}
              </select>
            </div>
            ${(() => {
              const proj = appState.workProjects.find(p => p.id === appState.detailedTask.workProjectId);
              const stageIdx = appState.detailedTask.workStageIdx || 0;
              const subcats = proj?.stages[stageIdx]?.subcategories || [];
              if (subcats.length > 0) {
                return `
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">중분류</label>
                    <select class="form-select" id="detailed-work-subcat" onchange="updateWorkSubcatLink(this.value)">
                      ${subcats.map((sub, idx) => `
                        <option value="${idx}" ${appState.detailedTask.workSubcatIdx === idx ? 'selected' : ''}>${escapeHtml(sub.name)}</option>
                      `).join('')}
                    </select>
                  </div>
                `;
              } else {
                return '<div style="color: var(--text-muted); font-size: 14px;">이 단계에 중분류가 없습니다.</div>';
              }
            })()}
          ` : ''}
        </div>
      ` : ''}

      <div class="form-group">
        <label class="form-label">제목</label>
        <input type="text" class="form-input" id="detailed-title" placeholder="작업 제목" value="${escapeHtml(appState.detailedTask.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">설명 (선택)</label>
        <textarea class="form-input form-textarea" id="detailed-description" placeholder="작업 내용, 메모 등" rows="2">${escapeHtml(appState.detailedTask.description || '')}</textarea>
      </div>
      ${categoryFields[appState.detailedTask.category]}

      <!-- 태그 -->
      <div class="form-group">
        <label class="form-label">태그</label>
        <div class="tags-input-container">
          <div class="selected-tags">
            ${(appState.detailedTask.tags || []).map(tag => `
              <span class="tag selected" onclick="removeTagFromTask('${escapeAttr(tag)}')">${escapeHtml(tag)} ×</span>
            `).join('')}
          </div>
          <div class="available-tags">
            ${appState.availableTags.filter(tag => !(appState.detailedTask.tags || []).includes(tag)).map(tag => `
              <span class="tag" onclick="addTagToTask('${escapeAttr(tag)}')">${escapeHtml(tag)}</span>
            `).join('')}
          </div>
          <div class="new-tag-input">
            <input type="text" class="form-input tag-input" id="new-tag-input" placeholder="새 태그 입력 후 Enter">
          </div>
        </div>
      </div>

      <!-- 서브태스크 -->
      <div class="form-group">
        <label class="form-label">서브태스크</label>
        <div class="subtasks-container">
          ${(appState.detailedTask.subtasks || []).map((subtask, index) => `
            <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
              <button class="subtask-list-check" onclick="toggleDetailedSubtask(${index})" aria-label="서브태스크 ${index + 1} 토글">${subtask.completed ? _renderActionIcon('check', 12) : index + 1}</button>
              <span class="subtask-text ${subtask.completed ? 'completed' : ''}" style="${subtask.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(subtask.text)}</span>
              <button class="subtask-remove" onclick="removeSubtask(${index})" aria-label="서브태스크 삭제">${_renderActionIcon('x', 12)}</button>
            </div>
          `).join('')}
          <div class="subtask-add">
            <textarea class="form-input subtask-input" id="new-subtask-input" rows="1" placeholder="서브태스크 추가 후 Enter (여러 줄 붙여넣기 가능)"></textarea>
          </div>
        </div>
      </div>

      ${appState.editingTaskId ? `
        <button class="btn btn-primary" onclick="detailedAdd()">${_renderActionIcon('check', 14)} 수정 완료</button>
        <button class="btn btn-secondary" onclick="cancelEdit()">${_renderActionIcon('x', 14)} 취소</button>
      ` : `
        <button class="btn btn-primary" onclick="detailedAdd()">추가하기</button>
      `}
    </div>
  `;
}
