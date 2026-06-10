// ============================================
// 렌더링 - 이벤트 탭 오케스트레이터 + 내 이벤트 (로컬)
// Supabase 수신 이벤트는 render-events-supabase.js에서 처리
// ============================================

/**
 * 이벤트 탭 HTML — 수신 이벤트 + 내 이벤트 합성
 */
function renderEventsTab() {
  // 비동기 fetch 트리거 (캐시 만료 시)
  if (_needsSupabaseFetch()) {
    fetchSupabaseEvents();
  }

  const supabaseEvents = _supabaseEventCache.data || [];
  const isLoading = _supabaseEventCache.loading;
  const error = _supabaseEventCache.error;

  const localEvents = _getLocalEventTasks();
  const events = _filterEventsBySource(_buildUnifiedEvents(supabaseEvents, localEvents));
  const pendingEvents = events.filter(event => event.status === 'pending');
  const completedEvents = events.filter(event => event.status === 'done');
  const summary = _getEventsSummary(events);
  _syncSupabaseHighlightCard();

  return `
    <div class="events-shell">
      <div class="events-header">
        <div>
          <div class="events-title">${svgIcon('dollar', 18)} 이벤트</div>
          <div class="events-subtitle">오늘 / 이번 주 / 다음 주 / 나중</div>
        </div>
        <button class="events-refresh-btn" type="button" onclick="refreshSupabaseEvents()" title="수신 이벤트 새로고침" aria-label="수신 이벤트 새로고침">
          ${svgIcon('clock', 16)} 새로고침
        </button>
      </div>

      ${_renderEventsSummary(summary)}
      ${_renderEventsToolbar(isLoading, error)}
      ${_renderLocalEventsSection(localEvents.filter(t => !t.completed))}
      ${_renderEventTimeAxis(pendingEvents)}
      ${_renderCompletedLog(completedEvents)}
    </div>
  `;
}

var _eventSourceFilter = window._eventSourceFilter || 'all';

const EVENT_SOURCE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'received', label: '수신' },
  { id: 'local', label: '로컬' }
];

const EVENT_TIME_GROUPS = [
  { id: 'today', label: '오늘', icon: 'clock' },
  { id: 'this_week', label: '이번 주', icon: 'calendar' },
  { id: 'next_week', label: '다음 주', icon: 'calendar' },
  { id: 'later', label: '나중', icon: 'list' }
];

function _getLocalEventTasks() {
  return (appState.tasks || []).filter(t => t.category === '부업' && !(t.source && t.source.type === 'telegram-event'));
}

function _buildUnifiedEvents(supabaseEvents, localEvents) {
  const received = (supabaseEvents || []).map(event => ({
    id: 'sb_' + String(event.supabaseId),
    rawId: String(event.supabaseId),
    source: 'received',
    sourceLabel: '수신',
    status: event.effectiveStatus || getEffectiveSupabaseEventStatus(event),
    title: event.title || '제목 없음',
    description: event.description || '',
    deadline: event.deadline || '',
    link: event.link || '',
    organizer: event.organizer || event.channel || '',
    type: event.type || event.project || '',
    reward: event.expectedRevenue || '',
    rewardCurrency: event.rewardCurrency || null,
    date: event.date || '',
    raw: event
  }));

  const local = (localEvents || []).map(task => ({
    id: 'local_' + String(task.id),
    rawId: String(task.id),
    source: 'local',
    sourceLabel: '로컬',
    status: task.completed ? 'done' : 'pending',
    title: task.title || '제목 없음',
    description: task.description || '',
    deadline: task.deadline || '',
    startDate: task.startDate || '',
    link: task.link || '',
    organizer: task.organizer || '',
    type: task.eventType || '',
    reward: task.expectedRevenue || '',
    date: task.completedAt || task.updatedAt || '',
    raw: task
  }));

  return [...received, ...local].sort(_sortEventsByDeadline);
}

function _filterEventsBySource(events) {
  if (_eventSourceFilter === 'received') return events.filter(event => event.source === 'received');
  if (_eventSourceFilter === 'local') return events.filter(event => event.source === 'local');
  return events;
}

function _sortEventsByDeadline(a, b) {
  const aDate = _parseEventDate(a.deadline);
  const bDate = _parseEventDate(b.deadline);
  if (aDate && bDate) return aDate - bDate;
  if (aDate) return -1;
  if (bDate) return 1;
  return String(b.date || '').localeCompare(String(a.date || ''));
}

function _parseEventDate(value) {
  if (!value) return null;
  const raw = String(value);
  const normalized = raw.length === 10 ? raw + 'T00:00:00' : raw;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

function _getEventBucket(event) {
  const deadline = _parseEventDate(event.deadline);
  if (!deadline) return 'later';

  const todayKey = typeof getLogicalDate === 'function' ? getLogicalDate() : getLocalDateStr();
  const today = _parseEventDate(todayKey) || new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(deadline);
  eventDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((eventDay - today) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'today';
  if (diffDays <= 6) return 'this_week';
  if (diffDays <= 13) return 'next_week';
  return 'later';
}

function _getEventsSummary(events) {
  const pending = events.filter(event => event.status === 'pending');
  const urgent = pending.filter(event => {
    const days = getDaysLeft(event.deadline);
    return days !== null && days <= 1;
  });
  return {
    pending: pending.length,
    urgent: urgent.length,
    done: events.filter(event => event.status === 'done').length
  };
}

function _renderEventsSummary(summary) {
  const items = [
    { label: '미제출', value: summary.pending, tone: 'primary', icon: 'list' },
    { label: '긴급', value: summary.urgent, tone: 'urgent', icon: 'clock' },
    { label: '참여완료', value: summary.done, tone: 'success', icon: 'check' }
  ];
  return `
    <div class="events-summary tab-anchor-row" role="status" aria-label="이벤트 요약">
      ${items.map(item => `
        <div class="events-summary-item ${item.tone}">
          <div class="events-summary-label">${svgIcon(item.icon, 15)} ${item.label}</div>
          <div class="events-summary-value">${item.value}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function _renderEventsToolbar(isLoading, error) {
  const staleMinutes = _supabaseEventCache.fetchedAt ? Math.floor((Date.now() - _supabaseEventCache.fetchedAt) / 60000) : null;
  const staleText = staleMinutes === null ? '수신 이벤트 미동기화' : `${staleMinutes}분 전 동기화`;
  return `
    <div class="events-toolbar">
      <div class="events-source-filters" role="group" aria-label="이벤트 출처 필터">
        ${EVENT_SOURCE_FILTERS.map(filter => `
          <button class="events-filter-chip ${_eventSourceFilter === filter.id ? 'active' : ''}" type="button" aria-pressed="${_eventSourceFilter === filter.id ? 'true' : 'false'}" onclick="setEventSourceFilter('${filter.id}')">
            ${escapeHtml(filter.label)}
          </button>
        `).join('')}
      </div>
      <div class="events-sync-state ${error ? 'error' : ''}" aria-live="polite">
        ${isLoading ? '수신 이벤트 동기화 중' : escapeHtml(error || staleText)}
      </div>
    </div>
  `;
}

function _renderEventTimeAxis(events) {
  const groups = EVENT_TIME_GROUPS.reduce((acc, group) => {
    acc[group.id] = [];
    return acc;
  }, {});

  events.forEach(event => {
    const bucket = _getEventBucket(event);
    groups[bucket].push(event);
  });

  return `
    <div class="events-time-axis" aria-label="이벤트 시간축">
      ${EVENT_TIME_GROUPS.map(group => _renderEventTimeGroup(group, groups[group.id] || [])).join('')}
    </div>
  `;
}

function _renderEventTimeGroup(group, events) {
  const groupId = 'time_' + group.id;
  const isCollapsed = _collapsedEventGroups.has(groupId);
  return `
    <section class="events-time-group" aria-labelledby="event-group-${group.id}">
      <button class="events-time-header ${group.id}" type="button" onclick="toggleEventGroup('${groupId}')" aria-expanded="${isCollapsed ? 'false' : 'true'}">
        <span id="event-group-${group.id}" class="events-time-title">${svgIcon(group.icon, 16)} ${escapeHtml(group.label)} <span class="count">(${events.length})</span></span>
        <span class="toggle-icon" aria-hidden="true">${svgIcon(isCollapsed ? 'chevron-right' : 'chevron-down', 14)}</span>
      </button>
      <div class="events-list ${isCollapsed ? 'collapsed' : ''}">
        ${events.length ? events.map(_renderUnifiedEventCard).join('') : '<div class="events-empty compact">해당 구간 이벤트 없음</div>'}
      </div>
    </section>
  `;
}

function _renderUnifiedEventCard(event) {
  const days = getDaysLeft(event.deadline);
  const urgency = days !== null && days <= 1 ? 'urgent' : (days !== null && days <= 3 ? 'warning' : '');
  const ddayClass = days !== null && days <= 1 ? 'urgent' : (days !== null && days <= 3 ? 'warn' : 'neutral');
  const dateText = _formatEventDateRange(event);
  const rewardText = _formatEventReward(event.reward, event.rewardCurrency);
  const meta = [event.organizer, event.type, dateText].filter(Boolean).join(' · ');
  const safeLink = sanitizeUrl(event.link);
  const ariaTitle = escapeAttr(event.title);
  const action = event.source === 'received'
    ? `completeSupabaseEvent('${escapeAttr(event.rawId)}')`
    : `completeTask('${escapeAttr(event.rawId)}')`;
  const sourceClass = event.source === 'received' ? 'supabase-event-card' : 'local-event-card';
  const showBulkCheck = event.source === 'local' && _eventBulkSelectMode;
  const bulkCheck = showBulkCheck
    ? `<div class="event-check-col"><input type="checkbox" ${_eventBulkSelectedIds.has(event.rawId) ? 'checked' : ''} onchange="toggleEventSelection('${escapeAttr(event.rawId)}')" aria-label="${ariaTitle} 선택"></div>`
    : '';

  return `
    <article class="event-card ${sourceClass} event-source-${event.source} ${urgency} ${showBulkCheck ? 'bulk-selecting' : ''}" data-event-id="${escapeAttr(event.rawId)}" data-event-source="${escapeAttr(event.source)}">
      ${bulkCheck}
      <div class="event-card-main">
        <div class="event-card-row">
          <span class="event-source-pill ${event.source}">${escapeHtml(event.sourceLabel)}</span>
          ${event.type ? `<span class="event-type-pill">${escapeHtml(event.type)}</span>` : ''}
        </div>
        <div class="event-title" title="${ariaTitle}">${escapeHtml(event.title)}</div>
        ${meta ? `<div class="event-meta-info">${escapeHtml(meta)}</div>` : ''}
        ${event.description ? `<div class="event-description" title="${escapeAttr(event.description)}">${escapeHtml(event.description)}</div>` : ''}
        ${rewardText ? `<div class="event-reward">${escapeHtml(rewardText)}</div>` : ''}
      </div>
      <div class="event-card-side">
        <span class="event-dday ${ddayClass}">${escapeHtml(formatDday(days) || '마감 없음')}</span>
        <div class="event-actions">
          ${safeLink ? `<a href="${escapeAttr(safeLink)}" target="_blank" rel="noopener" class="event-action-btn primary" aria-label="${ariaTitle} 링크 열기">참여</a>` : ''}
          <button class="event-action-btn success" type="button" onclick="${action}" aria-label="${ariaTitle} 참여 완료">${svgIcon('check', 14)}</button>
          ${event.source === 'local' ? `<button class="event-action-btn" type="button" onclick="editTask('${escapeAttr(event.rawId)}')" aria-label="${ariaTitle} 편집">${svgIcon('edit', 14)}</button>` : ''}
          ${event.source === 'local' ? `<button class="event-action-btn danger" type="button" onclick="deleteTask('${escapeAttr(event.rawId)}')" aria-label="${ariaTitle} 삭제">${svgIcon('trash', 14)}</button>` : ''}
        </div>
      </div>
      ${event.source === 'local' ? _renderEventSubtasks(event.raw) : ''}
    </article>
  `;
}

function _renderEventSubtasks(task) {
  const subtasks = task && task.subtasks ? task.subtasks : [];
  if (!subtasks.length) return '';
  const done = subtasks.filter(st => st.completed).length;
  const collapsed = appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[task.id];
  return `
    <div class="event-subtasks" onclick="event.stopPropagation();">
      <button class="subtask-progress-indicator${done === subtasks.length ? ' all-done' : ''}" onclick="toggleSubtaskChips('${escapeAttr(task.id)}')" title="서브태스크 접기/펼치기" aria-label="서브태스크 ${done}/${subtasks.length} 접기/펼치기">${done}/${subtasks.length} ${svgIcon(collapsed ? 'chevron-right' : 'chevron-down', 12)}</button>
      ${collapsed ? '' : `
        <div class="subtask-chips event-subtask-chips">
          ${subtasks.map((st, idx) => `
            <span class="subtask-chip ${st.completed ? 'done' : ''}" onclick="if(this._longPressed){this._longPressed=false;return;}toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})"
              onpointerdown="this._lpTimer = setTimeout(() => { this._longPressed = true; showSubtaskBackdateMenu('${escapeAttr(task.id)}', ${idx}, this); }, 500)"
              onpointerup="clearTimeout(this._lpTimer)"
              onpointerleave="clearTimeout(this._lpTimer)"
              onpointercancel="clearTimeout(this._lpTimer)">
              <span class="subtask-chip-check">${svgIcon(st.completed ? 'check' : 'circle', 12)}</span>${escapeHtml(st.text)}
            </span>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function _formatEventDateRange(event) {
  const start = _formatShortDate(event.startDate);
  const deadline = _formatShortDate(event.deadline);
  if (start && deadline) return start + '~' + deadline;
  if (deadline) return '~' + deadline;
  return start ? start + '~' : '';
}

function _formatShortDate(value) {
  const date = _parseEventDate(value);
  return date ? date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
}

function _formatEventReward(value, currency) {
  if (value === null || value === undefined || value === '') return '';
  // EventBot 수신 이벤트는 reward_usd(달러) — '원' 단위로 잘못 붙이면 "3.7원" 류 오표기
  if (typeof value === 'number') {
    if (currency === 'USD') return '$' + value.toLocaleString();
    return value.toLocaleString() + '원';
  }
  return String(value);
}

function setEventSourceFilter(filter) {
  if (!EVENT_SOURCE_FILTERS.some(item => item.id === filter)) return;
  _eventSourceFilter = filter;
  window._eventSourceFilter = filter;
  _completedLogPage = 0;
  renderStatic();
}
window.setEventSourceFilter = setEventSourceFilter;

// ============================================
// 참여 완료 통합 로그 (수신 + 로컬, 페이지네이션)
// ============================================

function _renderCompletedLog(completedEvents, localSubmitted) {
  const all = Array.isArray(localSubmitted) ? [
    ...completedEvents.map(e => ({
      title: e.title,
      date: e.deadline || e.date,
      source: '수신',
      id: 'sb_' + e.supabaseId,
      supabaseId: e.supabaseId
    })),
    ...localSubmitted.map(t => ({
      title: t.title,
      date: t.completedAt || t.deadline,
      source: '로컬',
      id: 'local_' + t.id,
      localId: t.id
    }))
  ] : completedEvents.map(event => ({
    title: event.title,
    date: event.date || event.deadline,
    source: event.sourceLabel,
    id: event.id,
    supabaseId: event.source === 'received' ? event.rawId : null,
    localId: event.source === 'local' ? event.rawId : null
  }));

  all.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  const isCollapsed = _collapsedEventGroups.has('completed_log');
  const totalPages = Math.max(1, Math.ceil(all.length / COMPLETED_LOG_PAGE_SIZE));
  const page = Math.min(_completedLogPage, totalPages - 1);
  const pageItems = all.slice(page * COMPLETED_LOG_PAGE_SIZE, (page + 1) * COMPLETED_LOG_PAGE_SIZE);

  const rows = pageItems.map(item => {
    let dateStr = '';
    if (item.date) {
      const raw = String(item.date);
      const d = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw);
      if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
    const undoBtn = item.supabaseId
      ? `<button class="completed-log-undo" type="button" onclick="event.stopPropagation(); uncompleteSupabaseEvent('${escapeAttr(String(item.supabaseId))}')" aria-label="${escapeAttr(item.title)} 참여 취소">${svgIcon('x', 14)}</button>`
      : `<button class="completed-log-undo" type="button" onclick="event.stopPropagation(); uncompleteTask('${escapeAttr(item.localId)}')" aria-label="${escapeAttr(item.title)} 완료 취소">${svgIcon('x', 14)}</button>` +
        `<button class="completed-log-undo" type="button" onclick="event.stopPropagation(); deleteTask('${escapeAttr(item.localId)}')" aria-label="${escapeAttr(item.title)} 삭제">${svgIcon('trash', 14)}</button>`;
    return `<div class="completed-log-row">
      <span class="completed-log-check">${svgIcon('check', 13)}</span>
      <span class="completed-log-source">${item.source}</span>
      <span class="completed-log-title" title="${escapeAttr(item.title)}">${escapeHtml(item.title)}</span>
      ${dateStr ? `<span class="completed-log-date">${dateStr}</span>` : ''}
      ${undoBtn}
    </div>`;
  }).join('');

  const pagination = totalPages > 1 ? `
    <div class="completed-log-pagination">
      <button onclick="changeCompletedLogPage(${page - 1})" ${page === 0 ? 'disabled' : ''}>‹</button>
      <span>${page + 1} / ${totalPages}</span>
      <button onclick="changeCompletedLogPage(${page + 1})" ${page >= totalPages - 1 ? 'disabled' : ''}>›</button>
    </div>
  ` : '';

  return `
    <section class="events-archive-section completed-log-section" aria-label="참여 완료">
      <button class="events-archive-header" type="button" onclick="toggleEventGroup('completed_log')" aria-expanded="${isCollapsed ? 'false' : 'true'}">
        <span>${svgIcon('check', 15)} 참여 완료 (${all.length})</span>
        <span class="toggle-icon" aria-hidden="true">${svgIcon(isCollapsed ? 'chevron-right' : 'chevron-down', 14)}</span>
      </button>
      <div class="events-archive-body ${isCollapsed ? 'collapsed' : ''}">
        ${rows || '<div class="events-empty compact">참여 완료 이벤트 없음</div>'}
        ${pagination}
      </div>
    </section>
  `;
}

function changeCompletedLogPage(page) {
  const localEvents = _getLocalEventTasks();
  const total = _filterEventsBySource(_buildUnifiedEvents(_supabaseEventCache.data || [], localEvents))
    .filter(event => event.status === 'done').length;
  const maxPage = Math.max(0, Math.ceil(total / COMPLETED_LOG_PAGE_SIZE) - 1);
  _completedLogPage = Math.max(0, Math.min(page, maxPage));
  renderStatic();
}
window.changeCompletedLogPage = changeCompletedLogPage;

// ============================================
// 내 이벤트 섹션 (로컬)
// ============================================

function _renderLocalEventsSection(pendingEvents) {
  if (_eventSourceFilter === 'received') return '';
  const localIds = pendingEvents.map(event => String(event.id));
  const visibleSelectArgs = localIds.map(id => "'" + escapeAttr(id) + "'").join(',');
  const eventTrash = (appState.trash || []).filter(t => t.category === '부업');
  let trashContent = '';
  if (eventTrash.length > 0) {
    const isCollapsed = _collapsedEventGroups.has('local_trash');
    trashContent = `
      <section class="events-archive-section events-trash-section" aria-label="휴지통">
        <div class="events-archive-header events-trash-header">
          <button class="events-archive-toggle" type="button" onclick="toggleEventGroup('local_trash')" aria-expanded="${isCollapsed ? 'false' : 'true'}">
            <span>${svgIcon('trash', 15)} 휴지통 (${eventTrash.length})</span>
            <span class="toggle-icon" aria-hidden="true">${svgIcon(isCollapsed ? 'chevron-right' : 'chevron-down', 14)}</span>
          </button>
          <button class="events-empty-trash" type="button" onclick="emptyTrash()" aria-label="휴지통 비우기">비우기</button>
        </div>
        <div class="events-list events-archive-body ${isCollapsed ? 'collapsed' : ''}">
          ${[...eventTrash].sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')).map(task => {
            const deletedDate = task.deletedAt ? new Date(task.deletedAt) : null;
            const deletedStr = deletedDate ? deletedDate.toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) + ' 삭제' : '';
            const daysLeft = task.deletedAt ? Math.max(0, 30 - Math.floor((Date.now() - new Date(task.deletedAt).getTime()) / (1000*60*60*24))) : 30;
            return '<div class="event-card event-trash-card">' +
              '<div class="event-card-main">' +
                '<div class="event-title">' + escapeHtml(task.title) + '</div>' +
                '<div class="event-meta-info">' + escapeHtml(deletedStr + ' · ' + daysLeft + '일 후 영구삭제') + '</div>' +
              '</div>' +
              '<div class="event-actions">' +
                '<button class="event-action-btn" type="button" onclick="restoreFromTrash(\'' + escapeAttr(task.id) + '\')" aria-label="복원">' + svgIcon('check', 14) + '</button>' +
                '<button class="event-action-btn danger" type="button" onclick="permanentDeleteFromTrash(\'' + escapeAttr(task.id) + '\')" aria-label="영구삭제">' + svgIcon('trash', 14) + '</button>' +
              '</div>' +
            '</div>';
          }).join('')}
        </div>
      </section>
    `;
  }

  return `
    <section class="events-local-controls" aria-label="로컬 이벤트 관리">
      ${_eventBulkSelectMode ? `
      <div class="event-bulk-actions">
        <button type="button" onclick="toggleEventGroupSelect([${visibleSelectArgs}])" ${localIds.length === 0 ? 'disabled' : ''}>현재 화면</button>
        <button class="bulk-delete-btn" type="button" onclick="bulkDeleteEvents()" ${_eventBulkSelectedIds.size === 0 ? 'disabled' : ''}>삭제 (${_eventBulkSelectedIds.size})</button>
        <button class="bulk-cancel-btn" type="button" onclick="toggleEventBulkSelect()">취소</button>
        <span class="event-bulk-count">${_eventBulkSelectedIds.size}개 선택</span>
      </div>
      ` : ''}

      <div class="events-quick-add">
        <input type="text" class="events-quick-input" placeholder="로컬 이벤트 추가" id="event-quick-input" aria-label="로컬 이벤트 빠른 추가" onkeypress="if(event.key==='Enter') quickAddEvent()">
        <button class="events-quick-btn" type="button" onclick="quickAddEvent()" aria-label="로컬 이벤트 추가">${svgIcon('plus', 16)}</button>
        <button class="events-detail-btn" type="button" onclick="addNewEvent()" title="상세 입력" aria-label="이벤트 상세 입력">${svgIcon('edit', 16)}</button>
        <button class="event-bulk-select-btn ${_eventBulkSelectMode ? 'active' : ''}" type="button" onclick="toggleEventBulkSelect()" aria-pressed="${_eventBulkSelectMode ? 'true' : 'false'}">선택</button>
      </div>

      ${trashContent}
    </section>
  `;
}

