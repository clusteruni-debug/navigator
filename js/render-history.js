// ============================================
// 렌더링 - 히스토리 탭
// ============================================

const HISTORY_SUB_TABS = [
  { id: "list", label: "리스트", icon: "list" }
];

const HISTORY_CATEGORIES = ['전체', '본업', '부업', '자기계발', '일상', '가족', '이벤트', '미분류'];
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
      : 'list';
  }
  if (!HISTORY_CATEGORIES.includes(appState.historyState.categoryFilter)) appState.historyState.categoryFilter = '전체';
  if (!HISTORY_SOURCES.some(source => source.id === appState.historyState.sourceFilter)) appState.historyState.sourceFilter = 'all';
  if (typeof appState.historyState.search !== 'string') appState.historyState.search = '';
  if (typeof appState.historyState.page !== 'number') appState.historyState.page = 0;
}

function setHistorySubTab(tabId) {
  _ensureHistoryState();
  appState.historyState.subTab = HISTORY_SUB_TABS.some(tab => tab.id === tabId) ? tabId : 'list';
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
          <details class="history-manage">
            <summary class="history-action" aria-label="기록 관리 메뉴">${_historyIcon('more', 16)}<span>관리</span></summary>
            <div class="history-manage-menu" role="menu">
              <button class="history-manage-item" type="button" role="menuitem" onclick="showClearLogRangeModal()">${_historyIcon('trash', 14)}<span>기간 삭제</span></button>
              <button class="history-manage-item danger" type="button" role="menuitem" onclick="clearAllCompletionLog()">${_historyIcon('trash', 14)}<span>전체 삭제</span></button>
            </div>
          </details>
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
        ${_renderHistoryListSubTab()}
      </div>
    </section>`;
}
window.renderHistoryTab = renderHistoryTab;

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
