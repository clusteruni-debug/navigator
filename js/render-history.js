// ============================================
// 렌더링 - 히스토리 탭
// ============================================

const HISTORY_SUB_TABS = [
  { id: 'calendar', label: '캘린더', icon: 'calendar' },
  { id: 'list', label: '리스트', icon: 'list' },
  { id: 'stats', label: '통계', icon: 'bar-chart' }
];

const HISTORY_CATEGORIES = ['전체', '본업', '부업', '일상', '가족', '이벤트'];
const HISTORY_SOURCES = [
  { id: 'all', label: '전체' },
  { id: 'task', label: '일반' },
  { id: 'project', label: '프로젝트' },
  { id: 'event', label: '이벤트' },
  { id: 'log', label: '수동기록' }
];

function _historyIcon(name, size = 14) {
  return typeof svgIcon === 'function' ? svgIcon(name, size) : '';
}

function _ensureHistoryState() {
  if (!appState.historyState) {
    const now = new Date();
    appState.historyState = {
      viewingYear: now.getFullYear(),
      viewingMonth: now.getMonth(),
      selectedDate: null,
      expandedDates: {}
    };
  }
  if (!appState.historyState.expandedDates) appState.historyState.expandedDates = {};
  if (!HISTORY_SUB_TABS.some(tab => tab.id === appState.historyState.subTab)) {
    appState.historyState.subTab = HISTORY_SUB_TABS.some(tab => tab.id === appState.historyView)
      ? appState.historyView
      : 'calendar';
  }
  if (!HISTORY_CATEGORIES.includes(appState.historyState.categoryFilter)) appState.historyState.categoryFilter = '전체';
  if (!HISTORY_SOURCES.some(source => source.id === appState.historyState.sourceFilter)) appState.historyState.sourceFilter = 'all';
  if (typeof appState.historyState.search !== 'string') appState.historyState.search = '';
  if (typeof appState.historyState.page !== 'number') appState.historyState.page = 0;
}

function setHistorySubTab(tabId) {
  _ensureHistoryState();
  appState.historyState.subTab = HISTORY_SUB_TABS.some(tab => tab.id === tabId) ? tabId : 'calendar';
  appState.historyView = appState.historyState.subTab;
  appState.historyState.page = 0;
  renderStatic();
}
window.setHistorySubTab = setHistorySubTab;

function setHistorySearch(value) {
  _ensureHistoryState();
  appState.historyState.search = value || '';
  appState.historyState.page = 0;
  renderStatic();
}
window.setHistorySearch = setHistorySearch;

function setHistoryCategoryFilter(category) {
  _ensureHistoryState();
  appState.historyState.categoryFilter = HISTORY_CATEGORIES.includes(category) ? category : '전체';
  appState.historyState.page = 0;
  renderStatic();
}
window.setHistoryCategoryFilter = setHistoryCategoryFilter;

function setHistorySourceFilter(source) {
  _ensureHistoryState();
  appState.historyState.sourceFilter = HISTORY_SOURCES.some(item => item.id === source) ? source : 'all';
  appState.historyState.page = 0;
  renderStatic();
}
window.setHistorySourceFilter = setHistorySourceFilter;

function prevMonth() {
  _ensureHistoryState();
  appState.historyState.viewingMonth--;
  if (appState.historyState.viewingMonth < 0) {
    appState.historyState.viewingMonth = 11;
    appState.historyState.viewingYear--;
  }
  appState.historyState.selectedDate = null;
  renderStatic();
}
window.prevMonth = prevMonth;

function nextMonth() {
  _ensureHistoryState();
  appState.historyState.viewingMonth++;
  if (appState.historyState.viewingMonth > 11) {
    appState.historyState.viewingMonth = 0;
    appState.historyState.viewingYear++;
  }
  appState.historyState.selectedDate = null;
  renderStatic();
}
window.nextMonth = nextMonth;

function selectDate(dateStr) {
  _ensureHistoryState();
  appState.historyState.selectedDate = appState.historyState.selectedDate === dateStr ? null : dateStr;
  renderStatic();
}
window.selectDate = selectDate;

function _isHistoryDateExpanded(dateStr, index) {
  _ensureHistoryState();
  if (Object.prototype.hasOwnProperty.call(appState.historyState.expandedDates, dateStr)) {
    return !!appState.historyState.expandedDates[dateStr];
  }
  return index < 3;
}

function toggleHistoryDate(dateStr) {
  _ensureHistoryState();
  appState.historyState.expandedDates[dateStr] = !_isHistoryDateExpanded(dateStr, 0);
  renderStatic();
}
window.toggleHistoryDate = toggleHistoryDate;

function navigateHistoryPage(page) {
  _ensureHistoryState();
  appState.historyState.page = Math.max(0, page);
  renderStatic();
}
window.navigateHistoryPage = navigateHistoryPage;

function _historySource(task) {
  if (task && task.workProjectId) return 'project';
  if (task && task.source && task.source.type === 'telegram-event') return 'event';
  if (task && task.category === '부업' && (task.eventType || task.organizer || task.link)) return 'event';
  if (task && task.fromLog) return 'log';
  return 'task';
}

function _historySourceLabel(source) {
  const found = HISTORY_SOURCES.find(item => item.id === source);
  return found ? found.label : '일반';
}

function _historyDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

function _historyDateTitle(dateStr) {
  const date = _historyDate(dateStr);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  if (dateStr === getLocalDateStr()) return '오늘';
  if (dateStr === getLocalDateStr(new Date(Date.now() - 86400000))) return '어제';
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`;
}

function _historyTime(entry) {
  const d = new Date(entry.completedAt);
  if (!isNaN(d.getTime())) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return String(entry.completedAt || '').slice(11, 16);
}

function _historyTimeKey(entry) {
  const d = new Date(entry.completedAt);
  if (!isNaN(d.getTime())) return d.toTimeString().slice(0, 5);
  return String(entry.completedAt || '').slice(11, 16);
}

function _historyCategoryPill(category) {
  const safeCat = safeCatId(category);
  return `<span class="history-pill cat-${safeCat}" style="--task-cat-color: var(--cat-${safeCat})">${escapeHtml(safeCat)}</span>`;
}

function _historyMatches(entry) {
  _ensureHistoryState();
  const query = appState.historyState.search.trim().toLowerCase();
  const category = appState.historyState.categoryFilter;
  const source = appState.historyState.sourceFilter;

  if (category !== '전체' && entry.category !== category) return false;
  if (source !== 'all' && _historySource(entry) !== source) return false;
  if (!query) return true;

  const haystack = [
    entry.title,
    entry.category,
    entry.organizer,
    entry.description,
    entry.eventType
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function _getFilteredHistoryGroups() {
  const grouped = getHistoryGroupedEntries();
  const filtered = {};
  Object.keys(grouped).forEach(dateStr => {
    const entries = grouped[dateStr].filter(_historyMatches);
    if (entries.length) filtered[dateStr] = entries;
  });
  return filtered;
}

function _historyMetric(label, value, icon, tone) {
  return `
    <div class="history-metric ${tone || ''}">
      <span class="history-metric-icon">${_historyIcon(icon, 15)}</span>
      <div>
        <div class="history-metric-value">${escapeHtml(String(value))}</div>
        <div class="history-metric-label">${escapeHtml(label)}</div>
      </div>
    </div>`;
}

function _historyAllEntries() {
  return getHistoryFlatEntries();
}

function _historyStats() {
  const entries = _historyAllEntries();
  const grouped = getHistoryGroupedEntries();
  const weekly = getWeeklyStats();
  const totalRevenue = entries.reduce((sum, entry) => sum + (Number(entry.expectedRevenue) || 0), 0);
  const categoryCounts = {};
  const sourceCounts = {};
  const timeCounts = { morning: 0, day: 0, evening: 0, night: 0 };
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

  entries.forEach(entry => {
    const cat = safeCatId(entry.category);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    const source = _historySource(entry);
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    const d = new Date(entry.completedAt);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      if (h >= 6 && h < 11) timeCounts.morning++;
      else if (h >= 11 && h < 18) timeCounts.day++;
      else if (h >= 18 && h < 22) timeCounts.evening++;
      else timeCounts.night++;
      weekdayCounts[d.getDay()]++;
    }
  });

  return {
    entries,
    grouped,
    weekly,
    total: entries.length,
    activeDays: Object.keys(grouped).length,
    totalRevenue,
    categoryCounts,
    sourceCounts,
    timeCounts,
    weekdayCounts,
    streak: appState.streak || { current: 0, best: 0 }
  };
}

function _renderHistorySubTabs(active) {
  return `
    <div class="history-subtabs" role="tablist" aria-label="히스토리 보기">
      ${HISTORY_SUB_TABS.map(tab => `
        <button class="history-subtab ${active === tab.id ? 'active' : ''}" type="button" role="tab"
          id="history-tab-${tab.id}"
          aria-controls="history-panel-${tab.id}"
          aria-selected="${active === tab.id}"
          tabindex="${active === tab.id ? '0' : '-1'}"
          onclick="setHistorySubTab('${tab.id}')">
          ${_historyIcon(tab.icon, 14)}<span>${escapeHtml(tab.label)}</span>
        </button>`).join('')}
    </div>`;
}

function renderHistoryTab() {
  _ensureHistoryState();
  const active = appState.historyState.subTab;
  const stats = _historyStats();

  return `
    <section class="history-redesign" aria-label="히스토리">
      <div class="history-topbar">
        <div>
          <h2 class="history-title"><span>${_historyIcon('calendar', 18)}</span>히스토리</h2>
          <div class="history-summary">완료 ${stats.total}개 · 활동일 ${stats.activeDays}일 · 연속 ${Number(stats.streak.current) || 0}일</div>
        </div>
        <div class="history-actions">
          <button class="history-action" type="button" onclick="showClearLogRangeModal()">${_historyIcon('trash', 14)}<span>기간 삭제</span></button>
          <button class="history-action danger" type="button" onclick="clearAllCompletionLog()">${_historyIcon('trash', 14)}<span>전체 삭제</span></button>
        </div>
      </div>

      ${_renderHistorySubTabs(active)}

      <div class="history-metrics-row" aria-label="히스토리 요약">
        ${_historyMetric('이번 주', stats.weekly.total, 'calendar', stats.weekly.total ? 'active' : '')}
        ${_historyMetric('일 평균', stats.weekly.avgPerDay, 'bar-chart')}
        ${_historyMetric('활동일', stats.weekly.activeDays + '/7', 'target')}
        ${_historyMetric('수익', stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() + '원' : '0원', 'dollar')}
      </div>

      <div id="history-panel-${active}" role="tabpanel" aria-labelledby="history-tab-${active}" tabindex="0">
        ${active === 'list' ? _renderHistoryListSubTab() : active === 'stats' ? _renderHistoryStatsSubTab(stats) : _renderHistoryCalendarSubTab(stats)}
      </div>
    </section>`;
}
window.renderHistoryTab = renderHistoryTab;

function renderHistoryCalendarWidget() {
  _ensureHistoryState();
  const year = appState.historyState.viewingYear;
  const month = appState.historyState.viewingMonth;
  const completionMap = getCompletionMap();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const todayStr = getLocalDateStr();
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  let daysHtml = '';

  for (let i = 0; i < startDayOfWeek; i++) {
    daysHtml += '<button class="calendar-day empty" type="button" tabindex="-1" aria-hidden="true"></button>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = completionMap[dateStr] || 0;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === appState.historyState.selectedDate;
    let level = 0;
    if (count > 0) level = 1;
    if (count >= 3) level = 2;
    if (count >= 5) level = 3;
    if (count >= 7) level = 4;
    const classes = [
      'calendar-day',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      count > 0 ? 'has-activity' : '',
      count > 0 ? `level-${level}` : ''
    ].filter(Boolean).join(' ');
    daysHtml += `
      <button class="${classes}" type="button" onclick="selectDate('${dateStr}')" aria-label="${dateStr} 완료 ${count}개">
        <span class="calendar-day-number">${day}</span>
        ${count > 0 ? `<span class="calendar-day-count">${count}</span>` : ''}
      </button>`;
  }

  return `
    <div class="calendar-container history-calendar-widget">
      <div class="calendar-header">
        <div class="calendar-title">${year}년 ${monthNames[month]}</div>
        <div class="calendar-nav">
          <button class="calendar-nav-btn" type="button" onclick="prevMonth()" aria-label="이전 달">&lt;</button>
          <button class="calendar-nav-btn" type="button" onclick="nextMonth()" aria-label="다음 달">&gt;</button>
        </div>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">
        ${['일', '월', '화', '수', '목', '금', '토'].map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
      </div>
      <div class="calendar-days">${daysHtml}</div>
      <div class="calendar-legend">
        <div class="legend-item"><span class="legend-box empty"></span>없음</div>
        <div class="legend-item"><span class="legend-box level-1"></span>1-2</div>
        <div class="legend-item"><span class="legend-box level-2"></span>3-4</div>
        <div class="legend-item"><span class="legend-box level-3"></span>5-6</div>
        <div class="legend-item"><span class="legend-box level-4"></span>7+</div>
      </div>
    </div>`;
}
window.renderHistoryCalendarWidget = renderHistoryCalendarWidget;

function renderCalendar() {
  return renderHistoryCalendarWidget();
}
window.renderCalendar = renderCalendar;

function _renderHistoryCalendarSubTab(stats) {
  return `
    <div class="history-calendar-layout">
      <div class="history-calendar-main">
        ${renderHistoryCalendarWidget()}
        ${renderDayDetail()}
      </div>
      <aside class="history-retro-panel">
        <div class="history-panel-title">이번 주</div>
        ${_renderWeeklyBars(stats.weekly.dailyCounts)}
        <div class="history-panel-title">카테고리</div>
        ${_renderBreakdownBars(stats.categoryCounts, stats.total, HISTORY_CATEGORIES.filter(c => c !== '전체'))}
      </aside>
    </div>`;
}

function renderDayDetail() {
  _ensureHistoryState();
  const selectedDate = appState.historyState.selectedDate;
  if (!selectedDate) return '<div class="day-detail empty"><div class="day-empty">날짜를 선택하면 상세 기록이 표시됩니다.</div></div>';

  const tasks = getCompletedTasksByDate(selectedDate);
  const date = _historyDate(selectedDate);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dateTitle = `${date.getMonth() + 1}월 ${date.getDate()}일 ${dayNames[date.getDay()]}요일`;
  const totalTime = tasks.reduce((sum, task) => sum + (Number(task.estimatedTime) || 0), 0);
  const totalRevenue = tasks.reduce((sum, task) => sum + (Number(task.expectedRevenue) || 0), 0);
  const rhythmData = (appState.lifeRhythm && appState.lifeRhythm.history || {})[selectedDate];
  const medsData = rhythmData ? (rhythmData.medications || {}) : {};
  const medSlots = typeof getMedicationSlots === 'function' ? getMedicationSlots() : [];

  return `
    <div class="day-detail">
      <div class="day-detail-header">
        <div>
          <div class="day-detail-date">${dateTitle}</div>
          <div class="day-detail-stats">
            <span>${tasks.length}개 완료</span>
            ${totalRevenue > 0 ? `<span>${totalRevenue.toLocaleString()}원</span>` : ''}
            ${totalTime > 0 ? `<span>${totalTime}분</span>` : ''}
          </div>
        </div>
        <div class="day-detail-actions">
          <button class="history-action" type="button" onclick="addCompletionLogEntry('${selectedDate}')">${_historyIcon('plus', 14)}<span>추가</span></button>
          ${((appState.completionLog || {})[selectedDate] || []).length > 0 ? `<button class="history-action danger" type="button" onclick="clearCompletionLogDate('${selectedDate}')">${_historyIcon('trash', 14)}<span>전체 삭제</span></button>` : ''}
        </div>
      </div>
      ${rhythmData ? `
        <div class="day-detail-rhythm">
          ${rhythmData.wakeUp ? `<span>기상 ${escapeHtml(rhythmData.wakeUp)}</span>` : ''}
          ${rhythmData.homeDepart ? `<span>집출발 ${escapeHtml(rhythmData.homeDepart)}</span>` : ''}
          ${rhythmData.workArrive ? `<span>근무시작 ${escapeHtml(rhythmData.workArrive)}</span>` : ''}
          ${rhythmData.workDepart ? `<span>근무종료 ${escapeHtml(rhythmData.workDepart)}</span>` : ''}
          ${rhythmData.homeArrive ? `<span>귀가 ${escapeHtml(rhythmData.homeArrive)}</span>` : ''}
          ${rhythmData.sleep ? `<span>취침 ${escapeHtml(rhythmData.sleep)}</span>` : ''}
          ${Object.keys(medsData).length > 0 ? medSlots.map(slot => {
            const taken = medsData[slot.id];
            return `<span>${escapeHtml(slot.label)} ${taken ? escapeHtml(taken) : '-'}</span>`;
          }).join('') : ''}
        </div>` : ''}
      ${tasks.length > 0 ? `
        <div class="day-detail-list">
          ${tasks.map(task => _renderHistoryEntryRow(task, selectedDate, true)).join('')}
        </div>` : `
        <div class="day-empty">
          <div>이 날 완료한 작업이 없습니다</div>
          <button class="history-action" type="button" onclick="addCompletionLogEntry('${selectedDate}')">${_historyIcon('plus', 14)}<span>기록 추가</span></button>
        </div>`}
    </div>`;
}
window.renderDayDetail = renderDayDetail;

function _renderHistoryEntryRow(entry, dateStr, showDateActions) {
  const source = _historySource(entry);
  const hasLog = entry._logDate !== undefined && entry._logIndex !== undefined;
  const logDate = entry._logDate || dateStr;
  const logIndex = entry._logIndex ?? entry.logIndex;
  const timeKey = _historyTimeKey(entry);
  const actionHtml = hasLog || entry.fromLog
    ? `<button class="history-row-action" type="button" onclick="editCompletionLogEntry('${escapeAttr(logDate)}', ${logIndex})" aria-label="기록 수정">${_historyIcon('edit', 14)}</button>
       <button class="history-row-action danger" type="button" onclick="deleteCompletionLogEntry('${escapeAttr(logDate)}', ${logIndex})" aria-label="기록 삭제">${_historyIcon('trash', 14)}</button>`
    : `<button class="history-row-action danger" type="button" onclick="hideTaskFromHistory('${escapeAttr(dateStr)}', '${escapeAttr(entry.title || '')}', '${escapeAttr(timeKey)}')" aria-label="기록 숨기기">${_historyIcon('trash', 14)}</button>`;

  return `
    <div class="history-task">
      <span class="history-task-check">${_historyIcon('check', 14)}</span>
      <div class="history-task-main">
        <div class="history-task-title">${escapeHtml(entry.title || '제목 없음')}</div>
        <div class="history-task-meta">
          ${_historyCategoryPill(entry.category)}
          <span>${escapeHtml(_historySourceLabel(source))}</span>
          ${entry.subtaskDone ? `<span>서브태스크 ${Number(entry.subtaskDone)}개</span>` : ''}
          ${entry.expectedRevenue ? `<span>${Number(entry.expectedRevenue).toLocaleString()}원</span>` : ''}
          ${entry.estimatedTime ? `<span>${Number(entry.estimatedTime)}분</span>` : ''}
        </div>
      </div>
      <span class="history-task-time">${_historyTime(entry)}</span>
      ${showDateActions ? `<div class="history-task-actions">${actionHtml}</div>` : actionHtml}
    </div>`;
}

function _renderHistoryToolbar() {
  _ensureHistoryState();
  const category = appState.historyState.categoryFilter;
  const source = appState.historyState.sourceFilter;
  return `
    <div class="history-toolbar">
      <label class="history-search" aria-label="히스토리 검색">
        ${_historyIcon('search', 14)}
        <input type="search" value="${escapeAttr(appState.historyState.search)}" placeholder="검색" oninput="setHistorySearch(this.value)">
      </label>
      <div class="history-filter-row" role="group" aria-label="카테고리 필터">
        ${HISTORY_CATEGORIES.map(item => `<button class="chip history-chip ${category === item ? 'active' : ''}" type="button" onclick="setHistoryCategoryFilter('${escapeAttr(item)}')" aria-pressed="${category === item}">${escapeHtml(item)}</button>`).join('')}
      </div>
      <div class="history-filter-row" role="group" aria-label="출처 필터">
        ${HISTORY_SOURCES.map(item => `<button class="chip history-chip ${source === item.id ? 'active' : ''}" type="button" onclick="setHistorySourceFilter('${escapeAttr(item.id)}')" aria-pressed="${source === item.id}">${escapeHtml(item.label)}</button>`).join('')}
      </div>
    </div>`;
}

function _renderHistoryListSubTab() {
  _ensureHistoryState();
  const grouped = _getFilteredHistoryGroups();
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const page = appState.historyState.page || 0;
  const perPage = 7;
  const totalPages = Math.max(1, Math.ceil(sortedDates.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const pagedDates = sortedDates.slice(safePage * perPage, (safePage + 1) * perPage);

  if (page !== safePage) appState.historyState.page = safePage;

  return `
    ${_renderHistoryToolbar()}
    ${sortedDates.length === 0 ? '<div class="day-empty">표시할 기록이 없습니다.</div>' : `
      <div class="history-list">
        ${pagedDates.map((dateStr, index) => _renderHistoryDateGroup(dateStr, grouped[dateStr], index)).join('')}
      </div>
      ${totalPages > 1 ? `
        <div class="history-pagination">
          <button class="history-page-btn" type="button" onclick="navigateHistoryPage(${safePage - 1})" ${safePage <= 0 ? 'disabled' : ''}>이전</button>
          <span>${safePage + 1} / ${totalPages}</span>
          <button class="history-page-btn" type="button" onclick="navigateHistoryPage(${safePage + 1})" ${safePage >= totalPages - 1 ? 'disabled' : ''}>다음</button>
        </div>` : ''}`}
  `;
}

function renderRecentHistory() {
  return _renderHistoryListSubTab();
}
window.renderRecentHistory = renderRecentHistory;

function _renderHistoryDateGroup(dateStr, entries, index) {
  const isExpanded = _isHistoryDateExpanded(dateStr, index);
  const dayRevenue = entries.reduce((sum, entry) => sum + (Number(entry.expectedRevenue) || 0), 0);
  return `
    <div class="history-date-group">
      <button class="history-date-header" type="button" onclick="toggleHistoryDate('${dateStr}')" aria-expanded="${isExpanded}">
        <span class="history-date-title">${_historyDateTitle(dateStr)}</span>
        <span class="history-date-count">${entries.length}개${dayRevenue > 0 ? ` · ${dayRevenue.toLocaleString()}원` : ''} ${_historyIcon('chevron-down', 14)}</span>
      </button>
      <div class="history-date-tasks ${isExpanded ? 'show' : ''}">
        ${entries.map(entry => _renderHistoryEntryRow(entry, dateStr, false)).join('')}
      </div>
    </div>`;
}

function _renderHistoryStatsSubTab(stats) {
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const calendarWidget = renderHistoryCalendarWidget().replace(
    'calendar-container history-calendar-widget',
    'calendar-container history-calendar-widget history-stat-panel history-stat-calendar'
  );
  return `
    <div class="history-stats-grid">
      ${calendarWidget}
      <section class="history-stat-panel">
        <div class="history-panel-title">주간 완료</div>
        ${_renderWeeklyBars(stats.weekly.dailyCounts)}
      </section>
      <section class="history-stat-panel">
        <div class="history-panel-title">카테고리</div>
        ${_renderBreakdownBars(stats.categoryCounts, stats.total, HISTORY_CATEGORIES.filter(c => c !== '전체'))}
      </section>
      <section class="history-stat-panel">
        <div class="history-panel-title">시간대</div>
        ${_renderBreakdownBars(stats.timeCounts, stats.total, [
          { key: 'morning', label: '아침' },
          { key: 'day', label: '낮' },
          { key: 'evening', label: '저녁' },
          { key: 'night', label: '밤' }
        ])}
      </section>
      <section class="history-stat-panel">
        <div class="history-panel-title">요일</div>
        ${_renderBreakdownBars(Object.fromEntries(stats.weekdayCounts.map((count, i) => [weekdayLabels[i], count])), stats.total, weekdayLabels)}
      </section>
      <section class="history-stat-panel">
        <div class="history-panel-title">출처</div>
        ${_renderBreakdownBars(stats.sourceCounts, stats.total, HISTORY_SOURCES.filter(s => s.id !== 'all').map(s => ({ key: s.id, label: s.label })))}
      </section>
      <section class="history-stat-panel">
        <div class="history-panel-title">연속 기록</div>
        <div class="history-streak-panel">
          <div><strong>${Number(stats.streak.current) || 0}</strong><span>현재</span></div>
          <div><strong>${Number(stats.streak.best) || 0}</strong><span>최고</span></div>
          <div><strong>${stats.activeDays}</strong><span>활동일</span></div>
        </div>
      </section>
    </div>`;
}

function _renderWeeklyBars(counts) {
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const todayIndex = new Date().getDay();
  const maxCount = Math.max(...counts, 1);
  return `
    <div class="history-week-bars">
      ${counts.map((count, i) => `
        <div class="history-week-bar">
          <span class="history-week-value">${count || ''}</span>
          <span class="history-week-fill ${i === todayIndex ? 'today' : ''}" style="height:${Math.max(8, (count / maxCount) * 78)}%"></span>
          <span class="history-week-label ${i === todayIndex ? 'today' : ''}">${dayLabels[i]}</span>
        </div>`).join('')}
    </div>`;
}

function _renderBreakdownBars(counts, total, items) {
  const normalizedItems = items.map(item => typeof item === 'string' ? { key: item, label: item } : item);
  const max = Math.max(...normalizedItems.map(item => counts[item.key] || 0), 1);
  return `
    <div class="history-breakdown">
      ${normalizedItems.map(item => {
        const value = counts[item.key] || 0;
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return `
          <div class="history-breakdown-row">
            <span>${escapeHtml(item.label)}</span>
            <div class="history-breakdown-track"><span style="width:${Math.max(value ? 6 : 0, (value / max) * 100)}%"></span></div>
            <strong>${value}</strong>
            <em>${pct}%</em>
          </div>`;
      }).join('')}
    </div>`;
}

function _renderCompletedBrowse() {
  if (!appState.completedBrowseState) appState.completedBrowseState = { page: 0, expandedDates: {} };
  const state = appState.completedBrowseState;
  const grouped = getHistoryGroupedEntries();
  const allDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const perPage = 7;
  const totalPages = Math.max(1, Math.ceil(allDates.length / perPage));
  const page = Math.min(state.page || 0, totalPages - 1);
  const pagedDates = allDates.slice(page * perPage, (page + 1) * perPage);

  if (allDates.length === 0) return '<div class="empty-state" style="padding:40px 20px;">완료된 작업이 없습니다.</div>';

  return `
    <div class="completed-browse">
      ${pagedDates.map(dateStr => {
        const tasks = grouped[dateStr];
        const isExpanded = !!state.expandedDates[dateStr];
        const dayRevenue = tasks.reduce((sum, task) => sum + (Number(task.expectedRevenue) || 0), 0);
        return `
          <div class="history-date-group">
            <button class="history-date-header" type="button" onclick="toggleCompletedBrowseDate('${dateStr}')">
              <span class="history-date-title">${_historyDateTitle(dateStr)}</span>
              <span class="history-date-count">${tasks.length}개 완료${dayRevenue > 0 ? ' · ' + dayRevenue.toLocaleString() + '원' : ''}</span>
            </button>
            <div class="history-date-tasks ${isExpanded ? 'show' : ''}">
              ${tasks.map(task => _renderHistoryEntryRow(task, dateStr, false)).join('')}
            </div>
          </div>`;
      }).join('')}
      ${totalPages > 1 ? `
        <div class="history-pagination">
          <button class="history-page-btn" type="button" onclick="navigateCompletedBrowsePage(${page - 1})" ${page <= 0 ? 'disabled' : ''}>이전</button>
          <span>${page + 1} / ${totalPages}</span>
          <button class="history-page-btn" type="button" onclick="navigateCompletedBrowsePage(${page + 1})" ${page >= totalPages - 1 ? 'disabled' : ''}>다음</button>
        </div>` : ''}
    </div>`;
}

function toggleCompletedBrowseDate(dateStr) {
  if (!appState.completedBrowseState) appState.completedBrowseState = { page: 0, expandedDates: {} };
  appState.completedBrowseState.expandedDates[dateStr] = !appState.completedBrowseState.expandedDates[dateStr];
  renderStatic();
}
window.toggleCompletedBrowseDate = toggleCompletedBrowseDate;

function navigateCompletedBrowsePage(page) {
  if (!appState.completedBrowseState) appState.completedBrowseState = { page: 0, expandedDates: {} };
  appState.completedBrowseState.page = Math.max(0, page);
  renderStatic();
}
window.navigateCompletedBrowsePage = navigateCompletedBrowsePage;
