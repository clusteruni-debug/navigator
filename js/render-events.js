// ============================================
// 렌더링 - 이벤트 탭 오케스트레이터 + 📌 내 이벤트 (로컬)
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

  // 로컬 이벤트: 부업 카테고리 중 telegram 소스가 아닌 것
  const localEvents = appState.tasks.filter(t => t.category === '부업' && !(t.source && t.source.type === 'telegram-event'));
  const localPending = localEvents.filter(t => !t.completed);
  const localSubmitted = localEvents.filter(t => t.completed);

  // 수신 이벤트 통계
  const sbPending = supabaseEvents.filter(e => e.effectiveStatus !== 'done' && e.effectiveStatus !== 'skipped');
  const sbParticipated = supabaseEvents.filter(e => e.effectiveStatus === 'done');
  const sbUrgent = sbPending.filter(e => { const d = getDaysLeft(e.deadline); return d !== null && d <= 1; });

  return `
    <div class="events-header">
      <div class="events-title">💰 이벤트</div>
      <button class="btn btn-secondary" onclick="refreshSupabaseEvents()" style="font-size:13px;padding:4px 10px;" title="수신 이벤트 새로고침">🔄 새로고침</button>
    </div>

    <div class="events-summary">
      <div class="events-summary-item">
        <div class="events-summary-value" style="color: ${sbUrgent.length > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)'}">${sbPending.length + localPending.length}</div>
        <div class="events-summary-label">미제출</div>
      </div>
      <div class="events-summary-item">
        <div class="events-summary-value" style="color: var(--accent-warning)">${sbUrgent.length}</div>
        <div class="events-summary-label">긴급</div>
      </div>
      <div class="events-summary-item">
        <div class="events-summary-value" style="color: var(--accent-success)">${sbParticipated.length + localSubmitted.length}</div>
        <div class="events-summary-label">참여완료</div>
      </div>
    </div>

    ${_renderSupabaseSection(sbPending, sbParticipated, isLoading, error)}
    ${_renderLocalEventsSection(localPending)}
    ${_renderCompletedLog(sbParticipated, localSubmitted)}
  `;
}

// ============================================
// ✅ 참여 완료 통합 로그 (수신 + 로컬, 페이지네이션)
// ============================================

function _renderCompletedLog(sbParticipated, localSubmitted) {
  // 통합 리스트: source 표시 + 날짜 정렬
  const all = [
    ...sbParticipated.map(e => ({
      title: e.title,
      date: e.deadline || e.date,
      source: '📡',
      id: 'sb_' + e.supabaseId,
      supabaseId: e.supabaseId
    })),
    ...localSubmitted.map(t => ({
      title: t.title,
      date: t.completedAt || t.deadline,
      source: '📌',
      id: 'local_' + t.id,
      localId: t.id
    }))
  ].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  if (all.length === 0) return '';

  const isCollapsed = _collapsedEventGroups.has('completed_log');
  const totalPages = Math.ceil(all.length / COMPLETED_LOG_PAGE_SIZE);
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
      ? `<button class="completed-log-undo" onclick="event.stopPropagation(); uncompleteSupabaseEvent('${escapeAttr(String(item.supabaseId))}')" title="참여 취소">↩</button>`
      : `<button class="completed-log-undo" onclick="event.stopPropagation(); uncompleteTask('${escapeAttr(item.localId)}')" title="완료 취소">↩</button>` +
        `<button class="completed-log-undo" onclick="event.stopPropagation(); deleteTask('${escapeAttr(item.localId)}')" title="삭제">✕</button>`;
    return `<div class="completed-log-row">
      <span class="completed-log-check">✓</span>
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
    <div class="events-section completed-log-section">
      <div class="events-group-header" onclick="toggleEventGroup('completed_log')">
        <span>✅ 참여 완료 (${all.length})</span>
        <span class="toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
      </div>
      <div class="${isCollapsed ? 'collapsed' : ''}">
        ${rows}
        ${pagination}
      </div>
    </div>
  `;
}

function changeCompletedLogPage(page) {
  const sbParticipated = (_supabaseEventCache.data || []).filter(e => e.effectiveStatus === 'done');
  const localSubmitted = appState.tasks.filter(t => t.category === '부업' && !(t.source && t.source.type === 'telegram-event') && t.completed);
  const total = sbParticipated.length + localSubmitted.length;
  const maxPage = Math.max(0, Math.ceil(total / COMPLETED_LOG_PAGE_SIZE) - 1);
  _completedLogPage = Math.max(0, Math.min(page, maxPage));
  renderStatic();
}
window.changeCompletedLogPage = changeCompletedLogPage;

// ============================================
// 📌 내 이벤트 섹션 (로컬)
// ============================================

function _renderLocalEventsSection(pendingEvents) {
  const localPendingSorted = [...pendingEvents].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const urgent = localPendingSorted.filter(t => { const d = getDaysLeft(t.deadline); return d !== null && d <= 1; });
  const approaching = localPendingSorted.filter(t => { const d = getDaysLeft(t.deadline); return d !== null && d >= 2 && d <= 5; });
  const pending = localPendingSorted.filter(t => { const d = getDaysLeft(t.deadline); return d === null || d > 5; });

  const renderGroup = (groupId, title, icon, events) => {
    if (events.length === 0) return '';
    const isCollapsed = _collapsedEventGroups.has('local_' + groupId);
    return `
      <div class="events-group">
        <div class="events-group-header" onclick="toggleEventGroup('local_${groupId}')">
          <span>
            ${_eventBulkSelectMode ? '<input type="checkbox" ' + (events.every(e => _eventBulkSelectedIds.has(e.id)) ? 'checked' : '') + ' onclick="event.stopPropagation(); toggleEventGroupSelect([\'' + events.map(e => escapeAttr(e.id)).join("','") + '\'])" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;cursor:pointer;accent-color:var(--accent-primary)">' : ''}
            ${icon} ${title} (${events.length})
          </span>
          <span class="toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
        </div>
        <div class="events-list ${isCollapsed ? 'collapsed' : ''}">
          ${events.map(_renderLocalEventCard).join('')}
        </div>
      </div>
    `;
  };

  let pendingContent = '';
  if (localPendingSorted.length > 0) {
    pendingContent = renderGroup('urgent', '긴급', '🚨', urgent) +
      renderGroup('approaching', '마감 전', '⚡', approaching) +
      renderGroup('pending', '미제출', '📅', pending);
  }

  // 제출완료는 renderEventsTab()의 통합 로그에서 렌더링

  // 휴지통
  const eventTrash = appState.trash.filter(t => t.category === '부업');
  let trashContent = '';
  if (eventTrash.length > 0) {
    const isCollapsed = _collapsedEventGroups.has('local_trash');
    trashContent = `
      <div class="events-group" style="margin-top:16px">
        <div class="events-group-header" onclick="toggleEventGroup('local_trash')" style="color:var(--text-muted)">
          <span>🗑 휴지통 (${eventTrash.length})</span>
          <span style="display:flex;align-items:center;gap:8px">
            <button onclick="event.stopPropagation(); emptyTrash()" style="font-size:14px;padding:3px 8px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:var(--text-muted);cursor:pointer;min-height:44px" aria-label="휴지통 비우기">비우기</button>
            <span class="toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
          </span>
        </div>
        <div class="events-list ${isCollapsed ? 'collapsed' : ''}">
          ${[...eventTrash].sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')).map(task => {
            const deletedDate = task.deletedAt ? new Date(task.deletedAt) : null;
            const deletedStr = deletedDate ? deletedDate.toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) + ' 삭제' : '';
            const daysLeft = task.deletedAt ? Math.max(0, 30 - Math.floor((Date.now() - new Date(task.deletedAt).getTime()) / (1000*60*60*24))) : 30;
            return '<div class="event-card" style="opacity:0.7">' +
              '<div class="event-card-main">' +
                '<div class="event-title">' + escapeHtml(task.title) + '</div>' +
                '<div class="event-meta-info" style="font-size:14px;color:var(--text-muted)">' + deletedStr + ' · ' + daysLeft + '일 후 영구삭제</div>' +
              '</div>' +
              '<div class="event-actions">' +
                '<button class="btn btn-small btn-undo" onclick="restoreFromTrash(\'' + escapeAttr(task.id) + '\')" aria-label="복원">↩</button>' +
                '<button class="btn btn-small btn-delete" onclick="permanentDeleteFromTrash(\'' + escapeAttr(task.id) + '\')" aria-label="영구삭제">✕</button>' +
              '</div>' +
            '</div>';
          }).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="events-section">
      <div class="events-section-header">
        <span>📌 내 이벤트</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="event-bulk-select-btn ${_eventBulkSelectMode ? 'active' : ''}" onclick="toggleEventBulkSelect()">☑ 선택</button>
        </div>
      </div>

      ${_eventBulkSelectMode ? `
      <div class="event-bulk-actions">
        <button onclick="toggleEventSelectAll()">전체</button>
        <button class="bulk-delete-btn" onclick="bulkDeleteEvents()" ${_eventBulkSelectedIds.size === 0 ? 'disabled' : ''}>🗑 삭제 (${_eventBulkSelectedIds.size})</button>
        <button class="bulk-cancel-btn" onclick="toggleEventBulkSelect()">취소</button>
        <span class="event-bulk-count">${_eventBulkSelectedIds.size}개 선택</span>
      </div>
      ` : ''}

      <div class="events-quick-add">
        <input type="text" class="events-quick-input" placeholder="이벤트명 입력 후 Enter" id="event-quick-input" onkeypress="if(event.key==='Enter') quickAddEvent()">
        <button class="events-quick-btn" onclick="quickAddEvent()">+</button>
        <button class="events-detail-btn" onclick="addNewEvent()" title="상세 입력">📝</button>
      </div>

      ${pendingContent}
      ${trashContent}
    </div>
  `;
}

function _renderLocalEventCard(task) {
  const days = getDaysLeft(task.deadline);
  const startDateStr = task.startDate ? new Date(task.startDate + (task.startDate.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : '';
  const deadlineStr = task.deadline ? new Date(task.deadline + (task.deadline.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : '';
  let dateDisplay = '';
  if (startDateStr && deadlineStr) dateDisplay = startDateStr + '~' + deadlineStr;
  else if (deadlineStr) dateDisplay = '~' + deadlineStr;
  else if (startDateStr) dateDisplay = startDateStr + '~';

  const metaItems = [];
  if (task.organizer) metaItems.push(task.organizer);
  if (task.eventType) metaItems.push(task.eventType);
  if (task.expectedRevenue) metaItems.push('💰 ' + Number(task.expectedRevenue).toLocaleString() + '원');
  const metaStr = metaItems.join(' · ');

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const stDone = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
  const stTotal = hasSubtasks ? task.subtasks.length : 0;

  return `
    <div class="event-card ${days !== null && days <= 1 ? 'urgent' : (days !== null && days <= 3 ? 'warning' : '')}" style="${_eventBulkSelectMode ? 'display:flex;align-items:center' : ''}">
      ${_eventBulkSelectMode ? '<div class="event-check-col"><input type="checkbox" ' + (_eventBulkSelectedIds.has(task.id) ? 'checked' : '') + ' onchange="toggleEventSelection(\'' + escapeAttr(task.id) + '\')"></div>' : ''}
      <div style="flex:1;min-width:0">
        <div class="event-card-main">
          <div class="event-title">${escapeHtml(task.title)}${hasSubtasks ? ' <span class="event-subtask-badge">' + stDone + '/' + stTotal + '</span>' : ''}</div>
          ${metaStr ? '<div class="event-meta-info">' + escapeHtml(metaStr) + '</div>' : ''}
          ${task.description ? '<div class="event-description" title="' + escapeAttr(task.description) + '">' + escapeHtml(task.description) + '</div>' : ''}
        </div>
        ${dateDisplay ? '<span class="event-compact-date">' + dateDisplay + '</span>' : ''}
        ${_eventBulkSelectMode ? '' : `<div class="event-actions">
          ${sanitizeUrl(task.link) ? '<a href="' + escapeHtml(sanitizeUrl(task.link)) + '" target="_blank" rel="noopener" class="btn btn-small btn-link">🔗</a>' : ''}
          <button class="btn btn-small btn-submit" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="완료">✓</button>
          <button class="btn btn-small btn-edit" onclick="editTask('${escapeAttr(task.id)}')">${svgIcon('edit', 14)}</button>
          <button class="btn btn-small btn-delete" onclick="deleteTask('${escapeAttr(task.id)}')">${svgIcon('trash', 14)}</button>
        </div>`}
        <div class="event-dday">${formatDday(days)}</div>
        ${hasSubtasks ? `
        <div onclick="event.stopPropagation();">
          <button class="subtask-progress-indicator${task.subtasks.filter(s=>s.completed).length === task.subtasks.length ? ' all-done' : ''}" onclick="toggleSubtaskChips('${escapeAttr(task.id)}')" style="display:inline-block; margin: 4px 0 2px 0;" title="서브태스크 접기/펼치기" aria-label="서브태스크 ${task.subtasks.filter(s=>s.completed).length}/${task.subtasks.length} 접기/펼치기">${task.subtasks.filter(s=>s.completed).length}/${task.subtasks.length} ${appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[task.id] ? '▶' : '▼'}</button>
          ${!(appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[task.id]) ? `
            <div class="subtask-chips event-subtask-chips">
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
        ` : ''}
      </div>
    </div>
  `;
}
