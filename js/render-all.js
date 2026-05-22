// ============================================
// 렌더링 - 전체 목록 탭 + 히스토리 탭
// ============================================

/**
 * 할일 서브뷰 전환
 */
function setAllTasksSubView(view) {
  appState.allTasksSubView = view;
  renderStatic();
}

// safeCatId is defined in utils.js (single source — shared with render-action.js / render-life.js / render.js)

if (typeof appState !== 'undefined' && appState.allTasksSearch === undefined) {
  appState.allTasksSearch = '';
}

function setAllTasksSearch(value) {
  appState.allTasksSearch = value || '';
  renderStatic();
}
window.setAllTasksSearch = setAllTasksSearch;

function getStableAnchorsData() {
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const pending = (appState.tasks || []).filter(t => !t.completed);
  return {
    todayDeadline: pending.filter(t => {
      if (!t.deadline) return false;
      return getLocalDateStr(new Date(t.deadline)) === todayStr;
    }).length,
    inbox: pending.filter(t => !t.deadline).length,
    streak: (appState.streak && appState.streak.current) || 0
  };
}
window.getStableAnchorsData = getStableAnchorsData;

function _allTasksIcon(name, size = 14) {
  const paths = {
    'alert-triangle': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'package': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    circle: '<circle cx="12" cy="12" r="6"/>'
  };
  if (name === 'search' || name === 'check' || name === 'plus') return svgIcon(name, size);
  const path = paths[name];
  if (!path) return '';
  return '<svg class="svg-icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
}

function _getAllTasksSearchQuery() {
  return String(appState.allTasksSearch || '').trim().toLowerCase();
}

function _matchesAllTasksSearch(task, query) {
  if (!query) return true;
  return String(task.title || '').toLowerCase().includes(query);
}

function _isCompletedRepeatingToday(task) {
  if (!task.completed || !task.completedAt) return false;
  if (!task.repeatType || task.repeatType === 'none') return false;
  const completedAt = new Date(task.completedAt);
  if (isNaN(completedAt.getTime())) return false;
  return getLocalDateStr(completedAt) === getLocalDateStr(new Date());
}

function _getColumnTasks(category, query) {
  return (appState.tasks || []).filter(task => {
    if (task.category !== category) return false;
    if (!_matchesAllTasksSearch(task, query)) return false;
    if (!task.completed) return true;
    return _isCompletedRepeatingToday(task);
  });
}

function _getColumnPendingCount(category, query) {
  return (appState.tasks || []).filter(task =>
    task.category === category &&
    !task.completed &&
    _matchesAllTasksSearch(task, query)
  ).length;
}

function _getCompactTaskDeadline(task, isCompletedRepeating) {
  if (isCompletedRepeating) {
    if (!task.completedAt) return { label: '완료', className: '' };
    const completedAt = new Date(task.completedAt);
    if (isNaN(completedAt.getTime())) return { label: '완료', className: '' };
    return {
      label: String(completedAt.getHours()).padStart(2, '0') + ':' + String(completedAt.getMinutes()).padStart(2, '0'),
      className: ''
    };
  }

  if (!task.deadline) return { label: '—', className: '' };

  const now = new Date();
  const deadline = new Date(task.deadline);
  if (isNaN(deadline.getTime())) return { label: '—', className: '' };

  const today = getLocalDateStr(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getLocalDateStr(tomorrowDate);
  const deadlineDate = getLocalDateStr(deadline);
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return { label: '지남', className: 'urgent' };
  if (hoursLeft < 3) return { label: Math.max(1, Math.ceil(hoursLeft)) + 'h', className: 'urgent' };
  if (deadlineDate === today) return { label: Math.ceil(hoursLeft) + 'h', className: 'warning' };
  if (deadlineDate === tomorrow) return { label: '내일', className: 'warning' };
  return { label: (deadline.getMonth() + 1) + '/' + deadline.getDate(), className: '' };
}

function _renderCompactCategoryTask(task) {
  const isCompletedRepeating = _isCompletedRepeatingToday(task);
  const deadline = _getCompactTaskDeadline(task, isCompletedRepeating);
  const urgency = getUrgencyLevel(task);
  const urgentClass = urgency === 'urgent' || urgency === 'expired' ? ' urgent' : '';
  const repeatingClass = isCompletedRepeating ? ' completed-repeating' : '';
  const timeClass = deadline.className ? ' ' + deadline.className : '';
  return `
    <div class="cat-column-task${urgentClass}${repeatingClass}" onclick="editTask('${escapeAttr(task.id)}')">
      ${isCompletedRepeating ? _allTasksIcon('check', 12).replace('class="svg-icon"', 'class="cat-column-task-check"') : ''}
      <span class="cat-column-task-title">${escapeHtml(task.title)}</span>
      <span class="cat-column-task-time${timeClass}">${escapeHtml(deadline.label)}</span>
    </div>
  `;
}

function _renderCategoryColumn(category, query) {
  const tasks = _getColumnTasks(category, query);
  const pendingCount = _getColumnPendingCount(category, query);
  const isEmpty = tasks.length === 0;

  return `
    <div class="cat-column ${isEmpty ? 'empty' : ''}" style="--task-cat-color: var(--cat-${safeCatId(category)});">
      <div class="cat-column-head">
        <span class="cat-column-name">
          ${_allTasksIcon('circle', 12)}
          ${escapeHtml(category)}
        </span>
        <span class="cat-column-count">${pendingCount}</span>
        <button class="cat-column-navigate" type="button" onclick="event.stopPropagation(); navigateAllTasksCategory('${escapeAttr(category)}')" aria-label="${escapeAttr(category)} 섹션 열기">
          ${_allTasksIcon(isEmpty ? 'plus' : 'arrow-right', 13)}
        </button>
      </div>
      <div class="cat-column-task-list">
        ${tasks.length > 0 ? tasks.map(task => _renderCompactCategoryTask(task)).join('') : `
          <button class="cat-column-empty" type="button" onclick="openAllTasksCategoryAdd('${escapeAttr(category)}')" aria-label="${escapeAttr(category)} task 추가">
            <span class="cat-column-empty-icon">${_allTasksIcon('plus', 13)}</span>
            <span>task 없음</span>
            <span class="cat-column-empty-action">추가</span>
          </button>
        `}
      </div>
    </div>
  `;
}

function navigateAllTasksCategory(category) {
  if (category === '본업') {
    switchTab('work');
    return;
  }
  if (category === '부업') {
    switchTab('events');
    return;
  }
  switchTab('life');
}
window.navigateAllTasksCategory = navigateAllTasksCategory;

function openAllTasksCategoryAdd(category) {
  appState.detailedTask = {
    title: '',
    category: category,
    startDate: '',
    deadline: '',
    estimatedTime: category === '본업' ? 30 : category === '일상' || category === '가족' ? 15 : 10,
    link: '',
    expectedRevenue: '',
    description: '',
    repeatType: 'none',
    repeatDays: [],
    repeatMonthDay: null,
    repeatInterval: null,
    organizer: '',
    eventType: '',
    tags: [],
    subtasks: [],
    workProjectId: null,
    workStageIdx: null,
    workSubcatIdx: null
  };
  appState.showDetailedAdd = true;
  appState.editingTaskId = null;
  appState._detailedShowDeadline = undefined;
  appState.currentTab = 'action';
  renderStatic();
  setTimeout(() => {
    const form = document.querySelector('.detailed-add');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}
window.openAllTasksCategoryAdd = openAllTasksCategoryAdd;

/**
 * 서브뷰에 맞는 작업 필터링
 */
function _getSubViewTasks(view) {
  const pending = (appState.tasks || []).filter(t => !t.completed);
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);

  switch (view) {
    case 'today': {
      return pending.filter(t => {
        if (!t.deadline) return false;
        const dStr = getLocalDateStr(new Date(t.deadline));
        return dStr === todayStr || dStr < todayStr; // 오늘 + 지난 마감
      });
    }
    case 'upcoming': {
      return pending.filter(t => {
        if (!t.deadline) return false;
        const dStr = getLocalDateStr(new Date(t.deadline));
        return dStr >= tomorrowStr;
      }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }
    case 'inbox': {
      return pending.filter(t => !t.deadline);
    }
    default:
      return pending;
  }
}

/**
 * 작업 아이템 HTML 렌더 (재사용)
 */
function _renderTaskItem(task) {
  const urgency = getUrgencyLevel(task);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const doneCount = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? task.subtasks.length : 0;
  const allDone = hasSubtasks && doneCount === totalCount;
  return `
    <div class="all-task-item ${urgency === 'urgent' ? 'urgent' : ''} ${urgency === 'warning' ? 'warning' : ''}" style="--task-cat-color: var(--cat-${safeCatId(task.category)})">
      <div class="all-task-content">
        <div class="all-task-title">${escapeHtml(task.title)}</div>
        <div class="all-task-meta">
          <span class="category ${task.category}" style="font-size:12px;">${task.category}</span>
          ${hasSubtasks ? `<button class="subtask-progress-indicator${allDone ? ' all-done' : ''}" onclick="event.stopPropagation(); toggleSubtaskChips('${escapeAttr(task.id)}')" title="서브태스크 접기/펼치기" aria-label="서브태스크 ${doneCount}/${totalCount} 접기/펼치기">${doneCount}/${totalCount} ${appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[task.id] ? '▶' : '▼'}</button>` : ''}
          ${task.repeatType && task.repeatType !== 'none' ? `<span>🔄 ${getRepeatLabel(task.repeatType, task)}</span>` : ''}
          ${task.estimatedTime ? `<span>⏱️ ${task.estimatedTime}분</span>` : ''}
          ${task.deadline ? formatDeadlineChip(task.deadline) : ''}
          ${task.expectedRevenue ? `<span>💰 ${Number(task.expectedRevenue).toLocaleString()}원</span>` : ''}
          ${task.organizer ? `<span>👤 ${escapeHtml(task.organizer)}</span>` : ''}
        </div>
        ${hasSubtasks && !(appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[task.id]) ? `
          <div class="subtask-chips" onclick="event.stopPropagation();">
            ${task.subtasks.map((st, idx) => `
              <span class="subtask-chip ${st.completed ? 'done' : ''}" onclick="if(this._longPressed){this._longPressed=false;return;}toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})"
                onpointerdown="this._lpTimer = setTimeout(() => { this._longPressed = true; showSubtaskBackdateMenu('${escapeAttr(task.id)}', ${idx}, this); }, 500)"
                onpointerup="clearTimeout(this._lpTimer)"
                onpointerleave="clearTimeout(this._lpTimer)">
                <span class="subtask-chip-check">${st.completed ? '✓' : '○'}</span>${escapeHtml(st.text)}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="all-task-actions">
        ${task.link ? `<button class="btn-small go" onclick="handleGo('${escapeAttr(task.link)}')">GO</button>` : ''}
        <button class="btn-small complete" onclick="if(this._longPressed){this._longPressed=false;return;}completeTask('${escapeAttr(task.id)}')"
          onpointerdown="this._lpTimer = setTimeout(() => { this._longPressed = true; showBackdateMenu('${escapeAttr(task.id)}', this); }, 500)"
          onpointerup="clearTimeout(this._lpTimer)"
          onpointerleave="clearTimeout(this._lpTimer)"
          aria-label="작업 완료 (길게 누르면 날짜 선택)">✓</button>
        <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
        <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
      </div>
    </div>
  `;
}

/**
 * 전체 목록 탭 HTML을 반환한다.
 */
function renderAllTasksTab() {
  const tasks = appState.tasks || [];
  const pending = tasks.filter(t => !t.completed);
  const completedToday = getTodayCompletedTasks(tasks).length;
  const anchors = getStableAnchorsData();
  const searchValue = appState.allTasksSearch || '';
  const query = _getAllTasksSearchQuery();
  const filteredVisibleCount = ['본업', '부업', '일상', '가족'].reduce((sum, category) => sum + _getColumnTasks(category, query).length, 0);

  return `
        <div class="all-overview-header">
          <div>
            <h2 class="all-overview-title">전체 작업 조망</h2>
            <div class="all-tasks-summary">
              총 <strong>${tasks.length}</strong>개 · 진행 중 <strong>${pending.length}</strong>개 · 오늘 완료 <strong>${completedToday}</strong>개${query ? ` · 검색 <strong>${filteredVisibleCount}</strong>개` : ''}
            </div>
          </div>
          <label class="all-overview-search" aria-label="할일 제목 검색">
            ${_allTasksIcon('search', 14)}
            <input id="all-overview-search-input" type="search" placeholder="제목 검색" value="${escapeAttr(searchValue)}" oninput="setAllTasksSearch(this.value)">
          </label>
        </div>

        <div class="stable-anchors" aria-label="할일 고정 지표">
          <div class="anchor-widget ${anchors.todayDeadline > 0 ? 'urgent' : ''}">
            <span class="anchor-icon">${_allTasksIcon('alert-triangle', 14)}</span>
            <div class="anchor-body">
              <div class="anchor-num">${anchors.todayDeadline}</div>
              <div class="anchor-label">오늘 마감</div>
            </div>
          </div>
          <div class="anchor-widget">
            <span class="anchor-icon">${_allTasksIcon('package', 14)}</span>
            <div class="anchor-body">
              <div class="anchor-num">${anchors.inbox}</div>
              <div class="anchor-label">마감 없음 (inbox)</div>
            </div>
          </div>
          <div class="anchor-widget streak">
            <span class="anchor-icon">${_allTasksIcon('flame', 14)}</span>
            <div class="anchor-body">
              <div class="anchor-num">${anchors.streak}일</div>
              <div class="anchor-label">연속 달성</div>
            </div>
          </div>
        </div>

        <div class="category-columns">
          <div class="row-label">일</div>
          ${_renderCategoryColumn('본업', query)}
          ${_renderCategoryColumn('부업', query)}
          <div class="row-label">생활</div>
          ${_renderCategoryColumn('일상', query)}
          ${_renderCategoryColumn('가족', query)}
        </div>
        `;
}

/**
 * 전체 뷰 (카테고리별 그룹)
 */
function _renderAllView() {
  return ['본업', '부업', '일상', '가족'].map(category => {
    const categoryTasks = (appState.tasks || []).filter(t => t.category === category);
    const pendingTasks = categoryTasks.filter(t => !t.completed);
    const completedTasks = categoryTasks.filter(t => t.completed);

    if (categoryTasks.length === 0) return '';

    return `
      <div class="all-category-section">
        <div class="all-category-header ${category}">
          <span class="all-category-title">${category}</span>
          <span class="all-category-count">${pendingTasks.length}개 진행 중 / ${completedTasks.length}개 완료</span>
        </div>

        ${pendingTasks.length > 0 ? `
          <div class="all-task-list">
            ${pendingTasks.map(task => _renderTaskItem(task)).join('')}
          </div>
        ` : ''}

        ${completedTasks.length > 0 ? `
          <div class="all-completed-section">
            <div class="all-completed-toggle" onclick="toggleCompletedCategory('${category}')">
              ✅ 완료 (${completedTasks.length}개) ${appState.showCompletedByCategory && appState.showCompletedByCategory[category] ? '▲' : '▼'}
            </div>
            <div class="all-task-list completed-list ${appState.showCompletedByCategory && appState.showCompletedByCategory[category] ? 'show' : ''}">
              ${completedTasks.slice(0, 5).map(task => `
                <div class="all-task-item completed" style="--task-cat-color: var(--cat-${safeCatId(task.category)})">
                  <div class="all-task-content">
                    <div class="all-task-title completed">${escapeHtml(task.title)}</div>
                  </div>
                  <div class="all-task-actions">
                    <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                    <button class="btn-small uncomplete" onclick="uncompleteTask('${escapeAttr(task.id)}')" aria-label="완료 되돌리기">↩️</button>
                    <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
                  </div>
                </div>
              `).join('')}
              ${completedTasks.length > 5 ? `
                <div class="all-task-more" onclick="setAllTasksSubView('completed')" style="cursor:pointer;">+${completedTasks.length - 5}개 더 →</div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * 필터된 뷰 (오늘/예정/인박스)
 */
function _renderFilteredView(view) {
  const tasks = _getSubViewTasks(view);
  const viewLabels = { today: '오늘 할 일', upcoming: '예정된 작업', inbox: '마감 없는 작업' };
  const viewIcons = { today: '🎯', upcoming: '📅', inbox: '📥' };
  const emptyMessages = {
    today: '오늘 마감인 작업이 없어요!',
    upcoming: '예정된 작업이 없어요!',
    inbox: '마감 없는 작업이 없어요!'
  };

  if (tasks.length === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px;">
        <div class="empty-state-icon">${viewIcons[view]}</div>
        <div>${emptyMessages[view]}</div>
      </div>
    `;
  }

  // 오늘 뷰: 지난 마감과 오늘 마감 분리
  if (view === 'today') {
    const todayStr = getLocalDateStr(new Date());
    const overdue = tasks.filter(t => getLocalDateStr(new Date(t.deadline)) < todayStr);
    const dueToday = tasks.filter(t => getLocalDateStr(new Date(t.deadline)) === todayStr);

    return `
      ${overdue.length > 0 ? `
        <div class="all-category-section">
          <div class="all-category-header" style="border-left-color: var(--accent-danger);">
            <span class="all-category-title" style="color: var(--accent-danger);">❌ 마감 지남</span>
            <span class="all-category-count">${overdue.length}개</span>
          </div>
          <div class="all-task-list">
            ${overdue.map(task => _renderTaskItem(task)).join('')}
          </div>
        </div>
      ` : ''}
      ${dueToday.length > 0 ? `
        <div class="all-category-section">
          <div class="all-category-header" style="border-left-color: var(--accent-warning);">
            <span class="all-category-title">🎯 오늘 마감</span>
            <span class="all-category-count">${dueToday.length}개</span>
          </div>
          <div class="all-task-list">
            ${dueToday.map(task => _renderTaskItem(task)).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  // 예정 뷰: 날짜별 그룹
  if (view === 'upcoming') {
    const groups = {};
    tasks.forEach(t => {
      const dStr = getLocalDateStr(new Date(t.deadline));
      if (!groups[dStr]) groups[dStr] = [];
      groups[dStr].push(t);
    });

    return Object.entries(groups).map(([date, dateTasks]) => {
      const d = new Date(date + 'T00:00:00');
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`;
      return `
        <div class="all-category-section">
          <div class="all-category-header" style="border-left-color: var(--accent-primary);">
            <span class="all-category-title">📅 ${dayLabel}</span>
            <span class="all-category-count">${dateTasks.length}개</span>
          </div>
          <div class="all-task-list">
            ${dateTasks.map(task => _renderTaskItem(task)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // 인박스 뷰: 플랫 리스트
  return `
    <div class="all-task-list">
      ${tasks.map(task => _renderTaskItem(task)).join('')}
    </div>
  `;
}

/**
 * 히스토리 탭 HTML을 반환한다.
 */
function renderHistoryTab() {
          const weeklyStats = getWeeklyStats();
          const totalCompleted = (appState.tasks || []).filter(t => t.completed).length;

          return `
            <div class="history-header">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <h2 style="margin:0;">📅 활동 히스토리</h2>
                <span style="display:flex;gap:6px">
                  <button class="btn btn-secondary" onclick="showClearLogRangeModal()" style="font-size:14px;padding:4px 10px;">🗑️ 기간 삭제</button>
                  <button class="btn btn-secondary" onclick="clearAllCompletionLog()" style="font-size:14px;padding:4px 10px;color:var(--accent-danger)">🗑️ 전체 삭제</button>
                </span>
              </div>
              <div class="history-summary">총 ${totalCompleted}개 완료</div>
            </div>

            <!-- 뷰 전환 탭 -->
            <div class="history-view-tabs">
              <button class="history-view-tab ${appState.historyView !== 'rhythm' ? 'active' : ''}" onclick="setHistoryView('tasks')">
                📋 작업 기록
              </button>
              <button class="history-view-tab ${appState.historyView === 'rhythm' ? 'active' : ''}" onclick="setHistoryView('rhythm')">
                😴 라이프 리듬
              </button>
            </div>

            ${appState.historyView === 'rhythm' ? renderLifeRhythmHistory() : `
            <!-- 주간 요약 -->
            <div class="week-summary">
              <div class="week-summary-title">📊 이번 주 요약</div>
              <div class="week-summary-stats">
                <div class="week-stat">
                  <div class="week-stat-value">${weeklyStats.total}</div>
                  <div class="week-stat-label">완료</div>
                </div>
                <div class="week-stat">
                  <div class="week-stat-value">${weeklyStats.avgPerDay}</div>
                  <div class="week-stat-label">일 평균</div>
                </div>
                <div class="week-stat">
                  <div class="week-stat-value">${weeklyStats.activeDays}/7</div>
                  <div class="week-stat-label">활동일</div>
                </div>
              </div>

              <!-- 주간 바 차트 -->
              ${(() => {
                const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
                const todayIndex = new Date().getDay();
                const maxCount = Math.max(...weeklyStats.dailyCounts, 1);

                return `
                  <div class="weekly-chart">
                    ${weeklyStats.dailyCounts.map((count, i) => {
                      const height = (count / maxCount) * 80;
                      const isToday = i === todayIndex;
                      return `
                        <div class="weekly-chart-bar">
                          <div class="weekly-chart-value">${count > 0 ? count : ''}</div>
                          <div class="weekly-chart-fill ${isToday ? 'today' : ''} ${count === 0 ? 'empty' : ''}" style="height: ${height}px"></div>
                          <div class="weekly-chart-label ${isToday ? 'today' : ''}">${dayLabels[i]}</div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `;
              })()}
            </div>

            <!-- 캘린더 -->
            ${renderCalendar()}

            <!-- 선택된 날짜 상세 -->
            ${renderDayDetail()}

            <!-- 최근 기록 -->
            <div class="dashboard-section">
              <div class="dashboard-title">📜 최근 기록</div>
              ${renderRecentHistory()}
            </div>
            `}
          `;
}

/**
 * "다한 것" 서브뷰 — 완료 작업을 날짜별로 탐색
 * TODO: no longer called from renderAllTasksTab(); relocate completed browse into history/category surfaces in a future task.
 */
function _renderCompletedBrowse() {
  const state = appState.completedBrowseState || { page: 0, expandedDates: {} };
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // completionLog의 날짜 키 수집 (_summary-only 제외) + appState.tasks의 completedAt 날짜 보완
  const dateSet = new Set();
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (Array.isArray(entries) && entries.some(e => !e._summary)) dateSet.add(dateKey);
  }
  (appState.tasks || []).forEach(t => {
    if (t.completed && t.completedAt) {
      const d = new Date(t.completedAt);
      if (!isNaN(d.getTime())) dateSet.add(getLocalDateStr(d));
    }
  });

  const allDates = [...dateSet].sort((a, b) => b.localeCompare(a)); // newest first
  const perPage = 7;
  const totalPages = Math.ceil(allDates.length / perPage);
  const page = Math.min(state.page || 0, Math.max(0, totalPages - 1));
  const pagedDates = allDates.slice(page * perPage, (page + 1) * perPage);

  if (allDates.length === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px;">
        <div class="empty-state-icon">✅</div>
        <div>완료된 작업이 없어요!</div>
      </div>
    `;
  }

  return `
    <div class="completed-browse">
      ${pagedDates.map(dateStr => {
        const tasks = getCompletedTasksByDate(dateStr);
        if (tasks.length === 0) return '';
        const d = new Date(dateStr + 'T00:00:00');
        const dayLabel = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`;
        const isExpanded = state.expandedDates[dateStr];
        const dayRevenue = tasks.reduce((sum, t) => sum + (t.expectedRevenue || 0), 0);

        return `
          <div class="all-category-section">
            <div class="all-category-header" style="border-left-color: var(--accent-success); cursor: pointer;" onclick="toggleCompletedBrowseDate('${escapeAttr(dateStr)}')">
              <span class="all-category-title">✅ ${dayLabel}</span>
              <span class="all-category-count">
                ${tasks.length}개 완료${dayRevenue > 0 ? ' · 💰' + dayRevenue.toLocaleString() : ''} ${isExpanded ? '▲' : '▼'}
              </span>
            </div>
            <div class="all-task-list completed-list ${isExpanded ? 'show' : ''}">
              ${tasks.map(task => {
                const timeStr = task.completedAt ? new Date(task.completedAt).toTimeString().slice(0, 5) : '';
                return `
                  <div class="all-task-item completed" style="--task-cat-color: var(--cat-${safeCatId(task.category)})">
                    <div class="all-task-content">
                      <div class="all-task-title completed">
                        <span style="color: var(--text-muted); font-size: 12px; margin-right: 6px;">${escapeHtml(timeStr)}</span>
                        ${escapeHtml(task.title)}
                      </div>
                      <div class="all-task-meta">
                        <span class="category ${task.category || ''}" style="font-size:12px;">${task.category || ''}</span>
                        ${task.subtaskDone ? '<span>📋 ' + task.subtaskDone + '개</span>' : ''}
                        ${task.expectedRevenue ? '<span>💰 ' + Number(task.expectedRevenue).toLocaleString() + '원</span>' : ''}
                        ${task.repeatType && task.repeatType !== 'none' ? '<span>🔄</span>' : ''}
                      </div>
                    </div>
                    <div class="all-task-actions">
                      ${task.fromLog && task.logIndex !== undefined ? `
                        <button class="btn-small edit" onclick="editCompletionLogEntry('${escapeAttr(dateStr)}', ${task.logIndex})" aria-label="수정">${svgIcon('edit', 14)}</button>
                        <button class="btn-small delete" onclick="deleteCompletionLogEntry('${escapeAttr(dateStr)}', ${task.logIndex})" aria-label="삭제">×</button>
                      ` : task.id ? `
                        <button class="btn-small uncomplete" onclick="uncompleteTask('${escapeAttr(task.id)}')" aria-label="완료 되돌리기">↩️</button>
                        <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="수정">${svgIcon('edit', 14)}</button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}

      ${totalPages > 1 ? `
        <div style="display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px 0;">
          ${page > 0 ? `<button class="btn btn-secondary" style="font-size:14px;padding:4px 12px;" onclick="navigateCompletedBrowsePage(${page - 1})">◀ 이전</button>` : '<span style="width:60px;"></span>'}
          <span style="font-size: 14px; color: var(--text-muted);">${page + 1} / ${totalPages}</span>
          ${page < totalPages - 1 ? `<button class="btn btn-secondary" style="font-size:14px;padding:4px 12px;" onclick="navigateCompletedBrowsePage(${page + 1})">다음 ▶</button>` : '<span style="width:60px;"></span>'}
        </div>
      ` : ''}
    </div>
  `;
}

function toggleCompletedBrowseDate(dateStr) {
  if (!appState.completedBrowseState) appState.completedBrowseState = { page: 0, expandedDates: {} };
  appState.completedBrowseState.expandedDates[dateStr] = !appState.completedBrowseState.expandedDates[dateStr];
  renderStatic();
}
window.toggleCompletedBrowseDate = toggleCompletedBrowseDate;

function navigateCompletedBrowsePage(page) {
  if (!appState.completedBrowseState) appState.completedBrowseState = { page: 0, expandedDates: {} };
  appState.completedBrowseState.page = page;
  renderStatic();
}
window.navigateCompletedBrowsePage = navigateCompletedBrowsePage;
