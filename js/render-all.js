// ============================================
// 렌더링 - 전체 목록 탭 + 히스토리 탭
// ============================================

const ALL_TASK_CATEGORIES = ['본업', '부업', '일상', '가족'];
const ALL_TASK_TIME_GROUPS = [
  { id: 'today', label: '오늘', empty: '오늘 마감인 진행 중 할일이 없습니다.' },
  { id: 'week', label: '이번 주', empty: '이번 주 마감 할일이 없습니다.' },
  { id: 'next', label: '다음 주', empty: '다음 주 마감 할일이 없습니다.' },
  { id: 'later', label: '나중', empty: '2주 이후 할일이 없습니다.' },
  { id: 'inbox', label: 'inbox', empty: '마감 없는 inbox 할일이 없습니다.' }
];

// safeCatId is defined in utils.js (single source, shared across render files)

function _ensureAllTasksState() {
  if (typeof appState === 'undefined') return;
  if (appState.allTasksSearch === undefined) appState.allTasksSearch = '';
  if (appState.allTasksView !== 'category' && appState.allTasksView !== 'time') appState.allTasksView = 'time';
  if (!ALL_TASK_CATEGORIES.includes(appState.allTasksCategoryFilter)) appState.allTasksCategoryFilter = '전체';
}

_ensureAllTasksState();

function setAllTasksSubView(view) {
  appState.allTasksSubView = view;
  appState.allTasksView = view === 'all' ? 'category' : 'time';
  renderStatic();
}

function setAllTasksView(view) {
  appState.allTasksView = view === 'category' ? 'category' : 'time';
  renderStatic();
}
window.setAllTasksView = setAllTasksView;

function setAllTasksSearch(value) {
  appState.allTasksSearch = value || '';
  renderStatic();
}
window.setAllTasksSearch = setAllTasksSearch;

function setAllTasksCategoryFilter(category) {
  appState.allTasksCategoryFilter = ALL_TASK_CATEGORIES.includes(category) ? category : '전체';
  renderStatic();
}
window.setAllTasksCategoryFilter = setAllTasksCategoryFilter;

function _allTasksIcon(name, size = 14) {
  return typeof svgIcon === 'function' ? svgIcon(name, size) : '';
}

function _todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function _parseAllTaskDeadline(value) {
  if (!value) return null;
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(text + 'T23:59:59') : new Date(text);
  return isNaN(date.getTime()) ? null : date;
}

function _daysFromToday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d - _todayStart()) / 86400000);
}

function _getAllTasksSearchQuery() {
  return String(appState.allTasksSearch || '').trim().toLowerCase();
}

function _matchesAllTasksSearch(task, query) {
  if (!query) return true;
  const haystack = [
    task.title,
    task.description,
    task.organizer,
    task.eventType,
    Array.isArray(task.tags) ? task.tags.join(' ') : ''
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function _getPendingAllTasks() {
  return (appState.tasks || []).filter(task => !task.completed);
}

function _getAllTasksCategoryFilter() {
  return ALL_TASK_CATEGORIES.includes(appState.allTasksCategoryFilter) ? appState.allTasksCategoryFilter : '전체';
}

function _getFilteredAllTasks(query, categoryFilter) {
  return _getPendingAllTasks().filter(task => {
    if (categoryFilter !== '전체' && task.category !== categoryFilter) return false;
    return _matchesAllTasksSearch(task, query);
  });
}

function _sortAllTasksByDeadline(tasks) {
  return tasks.slice().sort((a, b) => {
    const ad = _parseAllTaskDeadline(a.deadline);
    const bd = _parseAllTaskDeadline(b.deadline);
    if (ad && bd && ad.getTime() !== bd.getTime()) return ad - bd;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

function getStableAnchorsData() {
  const pending = _getPendingAllTasks();
  return {
    todayDeadline: pending.filter(t => {
      const d = _parseAllTaskDeadline(t.deadline);
      return d && _daysFromToday(d) <= 0;
    }).length,
    thisWeek: pending.filter(t => {
      const d = _parseAllTaskDeadline(t.deadline);
      const days = d ? _daysFromToday(d) : 999;
      return days >= 0 && days <= 6;
    }).length,
    inbox: pending.filter(t => !_parseAllTaskDeadline(t.deadline)).length,
    streak: (appState.streak && appState.streak.current) || 0
  };
}
window.getStableAnchorsData = getStableAnchorsData;

function _getAllTaskDday(task) {
  const deadline = _parseAllTaskDeadline(task.deadline);
  if (!deadline) return { label: 'inbox', className: 'none' };
  const days = _daysFromToday(deadline);
  const hoursLeft = (deadline - new Date()) / 3600000;
  if (days < 0) return { label: 'D+' + Math.abs(days), className: 'urgent' };
  if (days === 0 && hoursLeft <= 24) return { label: hoursLeft > 1 ? Math.ceil(hoursLeft) + 'h' : 'D-Day', className: 'urgent' };
  if (days === 0) return { label: 'D-Day', className: 'urgent' };
  if (days === 1) return { label: '내일', className: 'warn' };
  if (days <= 3) return { label: 'D-' + days, className: 'warn' };
  return { label: 'D-' + days, className: '' };
}

function _taskTimeGroupId(task) {
  const deadline = _parseAllTaskDeadline(task.deadline);
  if (!deadline) return 'inbox';
  const days = _daysFromToday(deadline);
  if (days <= 0) return 'today';
  if (days <= 6) return 'week';
  if (days <= 13) return 'next';
  return 'later';
}

function _getAllTaskTimeGroups(query, categoryFilter) {
  const groups = { today: [], week: [], next: [], later: [], inbox: [] };
  _getFilteredAllTasks(query, categoryFilter).forEach(task => groups[_taskTimeGroupId(task)].push(task));
  Object.keys(groups).forEach(key => { groups[key] = _sortAllTasksByDeadline(groups[key]); });
  return groups;
}

function _renderAllTaskCategoryPill(category) {
  const safeCat = safeCatId(category);
  return `<span class="cat-pill cat-${safeCat}" style="--task-cat-color: var(--cat-${safeCat})">${escapeHtml(safeCat)}</span>`;
}

function _renderAllTaskMeta(task) {
  const meta = [_renderAllTaskCategoryPill(task.category)];
  if (task.workProjectId) meta.push('<span>본업 프로젝트</span>');
  if (task.repeatType && task.repeatType !== 'none' && typeof getRepeatLabel === 'function') meta.push(`<span>${escapeHtml(getRepeatLabel(task.repeatType, task))}</span>`);
  if (task.estimatedTime) meta.push(`<span>${Number(task.estimatedTime)}분</span>`);
  if (task.organizer) meta.push(`<span>${escapeHtml(task.organizer)}</span>`);
  if (task.expectedRevenue) meta.push(`<span>${Number(task.expectedRevenue).toLocaleString()}원</span>`);
  if (task.subtasks && task.subtasks.length) {
    const done = task.subtasks.filter(st => st.completed).length;
    meta.push(`<span>${done}/${task.subtasks.length}</span>`);
  }
  return meta.join('');
}

function _renderAllTimeTaskRow(task, compact = false) {
  const safeCat = safeCatId(task.category);
  const dday = _getAllTaskDday(task);
  const stateClass = dday.className === 'urgent' ? 'urgent' : dday.className === 'warn' ? 'warn' : '';
  const rowClass = compact ? 'task-row all-time-task-row compact' : 'task-row all-time-task-row';
  const actions = compact ? '' : `
    <div class="task-row-actions">
      ${task.link ? `<button class="all-row-action" type="button" onclick="event.stopPropagation(); handleGo('${escapeAttr(task.link)}')" aria-label="${escapeAttr(task.title)} 링크 열기">GO</button>` : ''}
      <button class="all-row-action" type="button" onclick="event.stopPropagation(); editTask('${escapeAttr(task.id)}')" aria-label="${escapeAttr(task.title)} 수정">${_allTasksIcon('edit', 14)}</button>
      <button class="all-row-action danger" type="button" onclick="event.stopPropagation(); deleteTask('${escapeAttr(task.id)}')" aria-label="${escapeAttr(task.title)} 삭제">${_allTasksIcon('trash', 14)}</button>
    </div>`;
  return `
    <div class="${rowClass} cat-${safeCat} ${stateClass}" style="--task-cat-color: var(--cat-${safeCat})" data-task-category="${escapeAttr(safeCat)}" onclick="editTask('${escapeAttr(task.id)}')">
      <button class="check-btn cat-${safeCat}" type="button" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')" aria-label="${escapeAttr(task.title)} 완료"></button>
      <div class="task-main">
        <span class="task-title">${escapeHtml(task.title || '제목 없음')}</span>
        <span class="task-meta">${_renderAllTaskMeta(task)}</span>
      </div>
      <div class="task-tail">
        <span class="dday-chip ${dday.className}">${escapeHtml(dday.label)}</span>
        ${actions}
      </div>
    </div>`;
}

function _renderAllTimeGroup(group, tasks) {
  return `
    <section class="time-group all-time-group" data-time-group="${escapeAttr(group.id)}">
      <div class="time-group-header">
        <span class="time-group-title ${group.id}">${escapeHtml(group.label)}</span>
        <span class="count">${tasks.length}</span>
      </div>
      <div class="time-group-list">
        ${tasks.length ? tasks.map(task => _renderAllTimeTaskRow(task)).join('') : `<div class="time-group-empty">${escapeHtml(group.empty)}</div>`}
      </div>
    </section>`;
}

function _getColumnTasks(category, query) {
  return _sortAllTasksByDeadline(_getPendingAllTasks().filter(task => task.category === category && _matchesAllTasksSearch(task, query)));
}

function _getColumnPendingCount(category, query) {
  return _getColumnTasks(category, query).length;
}

function _renderCompactCategoryTask(task) {
  return _renderAllTimeTaskRow(task, true);
}

function _renderCategoryColumn(category, query) {
  const safeCat = safeCatId(category);
  const tasks = _getColumnTasks(category, query);
  return `
    <div class="cat-column ${tasks.length ? '' : 'empty'}" style="--task-cat-color: var(--cat-${safeCat});" data-kanban-category="${escapeAttr(safeCat)}">
      <div class="cat-column-head">
        <span class="cat-column-name">${escapeHtml(safeCat)}</span>
        <span class="cat-column-count">${tasks.length}</span>
        <button class="cat-column-navigate" type="button" onclick="event.stopPropagation(); openAllTasksCategoryAdd('${escapeAttr(safeCat)}')" aria-label="${escapeAttr(safeCat)} 할일 추가">${_allTasksIcon('plus', 13)}</button>
      </div>
      <div class="cat-column-task-list">
        ${tasks.length ? tasks.map(_renderCompactCategoryTask).join('') : `<button class="cat-column-empty" type="button" onclick="openAllTasksCategoryAdd('${escapeAttr(safeCat)}')" aria-label="${escapeAttr(safeCat)} 할일 추가"><span>진행 중 없음</span><span class="cat-column-empty-action">추가</span></button>`}
      </div>
    </div>`;
}

function _renderAllTaskToolbar(query, categoryFilter) {
  const chips = ['전체'].concat(ALL_TASK_CATEGORIES).map(category => {
    const active = categoryFilter === category;
    const safeCat = category === '전체' ? '' : safeCatId(category);
    return `<button class="chip all-filter-chip ${active ? 'active' : ''} ${safeCat ? 'cat-' + safeCat : ''}" type="button" onclick="setAllTasksCategoryFilter('${escapeAttr(category)}')" aria-pressed="${active}" data-filter-chip="${escapeAttr(category)}">${safeCat ? `<span class="swatch" style="background: var(--cat-${safeCat})"></span>` : ''}${escapeHtml(category)}</button>`;
  }).join('');
  return `
    <div class="toolbar all-task-toolbar">
      <div class="chips all-filter-chips" role="group" aria-label="할일 카테고리 필터">${chips}</div>
      <label class="search all-task-search" aria-label="할일 검색">
        ${_allTasksIcon('search', 14)}
        <input id="all-overview-search-input" type="search" placeholder="검색" value="${escapeAttr(appState.allTasksSearch || '')}" oninput="setAllTasksSearch(this.value)">
      </label>
      ${query ? `<span class="search-results-count">검색어: ${escapeHtml(query)}</span>` : ''}
    </div>`;
}

function _renderAllViewToggle(view) {
  const timeActive = view !== 'category';
  return `
    <div class="view-toggle all-view-toggle" role="tablist" aria-label="할일 view 선택">
      <button id="all-view-tab-time" class="view-tab ${timeActive ? 'active' : ''}" type="button" role="tab" aria-selected="${timeActive}" aria-controls="all-tasks-view-time" onclick="setAllTasksView('time')" data-all-view-tab="time">${_allTasksIcon('clock', 14)} 시간순</button>
      <button id="all-view-tab-category" class="view-tab ${!timeActive ? 'active' : ''}" type="button" role="tab" aria-selected="${!timeActive}" aria-controls="all-tasks-view-category" onclick="setAllTasksView('category')" data-all-view-tab="category">${_allTasksIcon('list', 14)} 카테고리</button>
    </div>`;
}

function _renderAllAnchor(kind, icon, label, value) {
  return `
    <div class="anchor-widget ${kind}" data-all-anchor="${escapeAttr(kind)}">
      <span class="anchor-icon">${_allTasksIcon(icon, 14)}</span>
      <div class="anchor-body">
        <div class="anchor-num">${escapeHtml(String(value))}</div>
        <div class="anchor-label">${escapeHtml(label)}</div>
      </div>
    </div>`;
}

function _renderAllTimeView(query, categoryFilter) {
  const groups = _getAllTaskTimeGroups(query, categoryFilter);
  return ALL_TASK_TIME_GROUPS.map(group => _renderAllTimeGroup(group, groups[group.id])).join('');
}

function _renderAllCategoryBoard(query) {
  return `<div class="category-columns all-category-kanban">${ALL_TASK_CATEGORIES.map(category => _renderCategoryColumn(category, query)).join('')}</div>`;
}

function navigateAllTasksCategory(category) {
  if (category === '본업') return switchTab('work');
  if (category === '부업') return switchTab('events');
  switchTab('life');
}
window.navigateAllTasksCategory = navigateAllTasksCategory;

function openAllTasksCategoryAdd(category) {
  const safeCat = safeCatId(category);
  appState.detailedTask = {
    title: '', category: safeCat, startDate: '', deadline: '',
    estimatedTime: safeCat === '본업' ? 30 : safeCat === '부업' ? 10 : 15,
    link: '', expectedRevenue: '', description: '', repeatType: 'none',
    repeatDays: [], repeatMonthDay: null, repeatInterval: null, organizer: '',
    eventType: '', tags: [], subtasks: [], workProjectId: null, workStageIdx: null, workSubcatIdx: null
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

function _getSubViewTasks(view) {
  const groups = _getAllTaskTimeGroups(_getAllTasksSearchQuery(), _getAllTasksCategoryFilter());
  if (view === 'today') return groups.today;
  if (view === 'upcoming') return groups.week.concat(groups.next, groups.later);
  if (view === 'inbox') return groups.inbox;
  return _getFilteredAllTasks(_getAllTasksSearchQuery(), _getAllTasksCategoryFilter());
}

function _renderTaskItem(task) {
  return _renderAllTimeTaskRow(task);
}

function _renderAllView() {
  return _renderAllCategoryBoard(_getAllTasksSearchQuery());
}

function _renderFilteredView(view) {
  const tasks = _getSubViewTasks(view);
  return tasks.length ? tasks.map(_renderTaskItem).join('') : '<div class="empty-state" style="padding: 40px 20px;">표시할 진행 중 할일이 없습니다.</div>';
}

/**
 * 전체 목록 탭 HTML을 반환한다.
 */
function renderAllTasksTab() {
  _ensureAllTasksState();
  const tasks = appState.tasks || [];
  const pending = _getPendingAllTasks();
  const query = _getAllTasksSearchQuery();
  const categoryFilter = _getAllTasksCategoryFilter();
  const visibleCount = _getFilteredAllTasks(query, categoryFilter).length;
  const anchors = getStableAnchorsData();
  const view = appState.allTasksView === 'category' ? 'category' : 'time';

  return `
    <section class="all-redesign" aria-label="할일">
      <div class="all-overview-header">
        <div>
          <h2 class="all-overview-title"><span class="all-title-bars"><span style="background: var(--cat-본업)"></span><span style="background: var(--cat-부업)"></span><span style="background: var(--cat-일상)"></span><span style="background: var(--cat-가족)"></span></span>할일</h2>
          <div class="all-tasks-summary">총 <strong>${tasks.length}</strong>개 · 진행 중 <strong>${pending.length}</strong>개 · 표시 <strong>${visibleCount}</strong>개</div>
        </div>
        <button class="all-add-btn" type="button" onclick="openAllTasksCategoryAdd('${escapeAttr(categoryFilter === '전체' ? '일상' : categoryFilter)}')">${_allTasksIcon('plus', 14)} 할일 추가</button>
      </div>

      ${_renderAllViewToggle(view)}

      <div class="stable-anchors all-anchor-row" aria-label="할일 고정 지표">
        ${_renderAllAnchor(anchors.todayDeadline ? 'urgent' : 'neutral', 'clock', '오늘 마감', anchors.todayDeadline)}
        ${_renderAllAnchor(anchors.thisWeek ? 'warn' : 'neutral', 'calendar', '이번 주', anchors.thisWeek)}
        ${_renderAllAnchor('neutral', 'list', 'inbox', anchors.inbox)}
        ${_renderAllAnchor('streak', 'target', '연속 달성', anchors.streak + '일')}
      </div>

      ${_renderAllTaskToolbar(query, categoryFilter)}

      <div id="all-tasks-view-time" class="view-content all-view-panel ${view === 'time' ? 'active' : ''}" role="tabpanel" aria-labelledby="all-view-tab-time" ${view === 'time' ? '' : 'hidden'}>
        ${_renderAllTimeView(query, categoryFilter)}
      </div>
      <div id="all-tasks-view-category" class="view-content all-view-panel ${view === 'category' ? 'active' : ''}" role="tabpanel" aria-labelledby="all-view-tab-category" ${view === 'category' ? '' : 'hidden'}>
        ${_renderAllCategoryBoard(query)}
      </div>
    </section>`;
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
