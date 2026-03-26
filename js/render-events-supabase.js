// ============================================
// 📡 수신 이벤트 — Supabase fetch/cache/render
// render-events.js에서 분리 (코드 분할 규칙: 500줄 이하)
// ============================================

// D-day 계산 (로컬 섹션에서도 사용)
function getDaysLeft(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const d = new Date(deadline);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

function formatDday(days) {
  if (days === null) return '';
  if (days < 0) return '<span style="color:var(--accent-danger)">D+' + Math.abs(days) + '</span>';
  if (days === 0) return '<span style="color:var(--accent-danger)">D-Day</span>';
  if (days <= 3) return '<span style="color:var(--accent-warning)">D-' + days + '</span>';
  return 'D-' + days;
}

// ============================================
// Supabase fetch + 캐시
// ============================================

function _needsSupabaseFetch() {
  if (_supabaseEventCache.loading) return false;
  if (!_supabaseEventCache.fetchedAt) return true;
  return Date.now() - _supabaseEventCache.fetchedAt > SUPABASE_CACHE_TTL;
}

async function fetchSupabaseEvents() {
  if (_supabaseEventCache.loading) return;
  if (!navigator.onLine) {
    _supabaseEventCache.error = '오프라인 상태입니다';
    renderStatic();
    return;
  }

  _supabaseEventCache.loading = true;
  _supabaseEventCache.error = null;
  renderStatic(); // loading=true 상태에서 렌더 — _needsSupabaseFetch()가 false 반환하므로 재진입 방지

  try {
    const query = [
      'select=id,content,original_channel,deadline,urls,analysis,starred,participated,date',
      'archived_date=is.null',
      'or=(starred.eq.true,deadline.not.is.null)',
      'order=deadline.asc.nullslast,date.desc',
      'limit=100'
    ].join('&');

    const response = await fetch(
      `${TG_SUPABASE_URL}/rest/v1/telegram_messages?${query}`,
      {
        headers: {
          'apikey': TG_SUPABASE_KEY,
          'Authorization': `Bearer ${TG_SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const messages = await response.json();

    _supabaseEventCache.data = messages.map(msg => {
      const analysis = msg.analysis || {};
      const firstLine = (msg.content || '').split('\n')[0].trim();
      return {
        supabaseId: msg.id,
        title: analysis.title || (firstLine.length > 50 ? firstLine.substring(0, 50) : firstLine) || '제목 없음',
        description: analysis.summary || (msg.content || '').substring(0, 200),
        deadline: msg.deadline,
        link: (msg.urls || [])[0] || null,
        expectedRevenue: analysis.reward_usd || analysis.reward || null,
        channel: msg.original_channel,
        project: analysis.project || null,
        organizer: analysis.organizer || null,
        type: analysis.type || null,
        starred: msg.starred,
        participated: msg.participated || false,
        date: msg.date
      };
    });
    _supabaseEventCache.fetchedAt = Date.now();
  } catch (error) {
    console.error('Supabase 이벤트 조회 실패:', error);
    _supabaseEventCache.error = '이벤트를 불러올 수 없습니다';
    _supabaseEventCache.fetchedAt = Date.now(); // 실패 시에도 TTL 적용 — 무한 재시도 방지
  } finally {
    _supabaseEventCache.loading = false;
    renderStatic();
  }
}

function refreshSupabaseEvents() {
  _supabaseEventCache.fetchedAt = null;
  fetchSupabaseEvents();
}
window.refreshSupabaseEvents = refreshSupabaseEvents;

// ============================================
// Supabase 이벤트 완료/취소
// ============================================

async function completeSupabaseEvent(supabaseId) {
  const event = (_supabaseEventCache.data || []).find(e => String(e.supabaseId) === String(supabaseId));
  if (!event) return;

  try {
    const res = await fetch(
      `${TG_SUPABASE_URL}/rest/v1/telegram_messages?id=eq.${supabaseId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': TG_SUPABASE_KEY,
          'Authorization': `Bearer ${TG_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ participated: true })
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // completionLog에 수익 기록
    const now = new Date();
    const dateKey = getLocalDateStr(now);
    const timeStr = now.toTimeString().slice(0, 5);
    const rv = typeof event.expectedRevenue === 'number' ? event.expectedRevenue : (parseFloat(String(event.expectedRevenue || '').replace(/[^0-9.]/g, '')) || 0);
    if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
    appState.completionLog[dateKey].push({ t: event.title, c: '부업', at: timeStr, rv: rv || undefined });
    saveCompletionLog();

    // 캐시 로컬 업데이트
    event.participated = true;
    showToast('✅ 참여 완료!', 'success');
    renderStatic();
  } catch (error) {
    console.error('Supabase 이벤트 완료 실패:', error);
    showToast('완료 처리 실패', 'error');
  }
}
window.completeSupabaseEvent = completeSupabaseEvent;

async function uncompleteSupabaseEvent(supabaseId) {
  const event = (_supabaseEventCache.data || []).find(e => String(e.supabaseId) === String(supabaseId));
  if (!event) return;

  try {
    const res = await fetch(
      `${TG_SUPABASE_URL}/rest/v1/telegram_messages?id=eq.${supabaseId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': TG_SUPABASE_KEY,
          'Authorization': `Bearer ${TG_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ participated: false })
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    event.participated = false;

    // completionLog에서 해당 엔트리 soft-delete
    const now = new Date();
    const dateKey = getLocalDateStr(now);
    const delKey = dateKey + '|' + (event.title || '') + '|' + now.toTimeString().slice(0, 5);
    if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
    appState.deletedIds.completionLog[delKey] = now.toISOString();
    saveCompletionLog();

    showToast('참여 완료 취소됨', 'info');
    renderStatic();
  } catch (error) {
    console.error('Supabase 이벤트 완료 취소 실패:', error);
    showToast('취소 처리 실패', 'error');
  }
}
window.uncompleteSupabaseEvent = uncompleteSupabaseEvent;

// ============================================
// 📡 수신 이벤트 섹션 렌더링
// ============================================

function _renderSupabaseSection(pending, participated, isLoading, error) {
  const staleMinutes = _supabaseEventCache.fetchedAt ? Math.floor((Date.now() - _supabaseEventCache.fetchedAt) / 60000) : null;
  const staleText = staleMinutes !== null ? `<span style="font-size:12px;color:var(--text-muted);margin-left:8px;">(${staleMinutes}분 전 동기화)</span>` : '';

  let content = '';

  if (isLoading && pending.length === 0) {
    content = '<div class="events-empty"><div class="events-empty-icon">⏳</div><div class="events-empty-text">수신 이벤트 불러오는 중...</div></div>';
  } else if (error && pending.length === 0 && participated.length === 0) {
    content = `<div class="events-empty"><div class="events-empty-icon">📴</div><div class="events-empty-text">${escapeHtml(error)}</div><button class="btn btn-secondary" onclick="refreshSupabaseEvents()" style="margin-top:8px;">🔄 다시 시도</button></div>`;
  } else {
    const urgent = pending.filter(e => { const d = getDaysLeft(e.deadline); return d !== null && d <= 1; });
    const approaching = pending.filter(e => { const d = getDaysLeft(e.deadline); return d !== null && d >= 2 && d <= 5; });
    const rest = pending.filter(e => { const d = getDaysLeft(e.deadline); return d === null || d > 5; });

    const renderGroup = (groupId, title, icon, events) => {
      if (events.length === 0) return '';
      const isCollapsed = _collapsedEventGroups.has('sb_' + groupId);
      return `
        <div class="events-group">
          <div class="events-group-header" onclick="toggleEventGroup('sb_${groupId}')">
            <span>${icon} ${title} (${events.length})</span>
            <span class="toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
          </div>
          <div class="events-list ${isCollapsed ? 'collapsed' : ''}">
            ${events.map(_renderSupabaseCard).join('')}
          </div>
        </div>
      `;
    };

    content = renderGroup('urgent', '긴급', '🚨', urgent) +
      renderGroup('approaching', '마감 전', '⚡', approaching) +
      renderGroup('pending', '미제출', '📅', rest);

    if (pending.length === 0 && !isLoading) {
      content = '<div class="events-empty" style="padding:20px"><div class="events-empty-text">미제출 수신 이벤트 없음</div></div>';
    }

    if (participated.length > 0) {
      const isCollapsed = _collapsedEventGroups.has('sb_participated');
      content += `
        <div class="events-group">
          <div class="events-group-header" onclick="toggleEventGroup('sb_participated')">
            <span>✅ 참여완료 (${participated.length})</span>
            <span class="toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
          </div>
          <div class="events-list ${isCollapsed ? 'collapsed' : ''}">
            ${participated.map(e => `
              <div class="event-card supabase-event-card completed">
                <div style="flex:1;min-width:0">
                  <div class="event-title"><span class="supabase-badge">📡</span>${escapeHtml(e.title)}</div>
                </div>
                <div class="event-actions">
                  <button class="btn btn-small btn-undo" onclick="uncompleteSupabaseEvent('${escapeAttr(String(e.supabaseId))}')" aria-label="참여 취소">↩</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="events-section">
      <div class="events-section-header">
        <span>📡 수신 이벤트${staleText}</span>
      </div>
      ${content}
    </div>
    <div class="events-section-divider"></div>
  `;
}

function _renderSupabaseCard(event) {
  const days = getDaysLeft(event.deadline);
  const deadlineStr = event.deadline ? new Date(event.deadline + 'T00:00:00').toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : '';
  const metaItems = [];
  if (event.project) metaItems.push(event.project);
  if (event.organizer) metaItems.push(event.organizer);
  if (event.channel) metaItems.push(event.channel);
  if (event.type) metaItems.push(event.type);
  if (event.expectedRevenue) metaItems.push('💰 ' + event.expectedRevenue);
  const metaStr = metaItems.join(' · ');

  return `
    <div class="event-card supabase-event-card ${days !== null && days <= 1 ? 'urgent' : (days !== null && days <= 3 ? 'warning' : '')}">
      <div style="flex:1;min-width:0">
        <div class="event-card-main">
          <div class="event-title"><span class="supabase-badge">📡</span>${escapeHtml(event.title)}</div>
          ${metaStr ? '<div class="event-meta-info">' + escapeHtml(metaStr) + '</div>' : ''}
          ${event.description ? '<div class="event-description" title="' + escapeAttr(event.description) + '">' + escapeHtml(event.description) + '</div>' : ''}
        </div>
        ${deadlineStr ? '<span class="event-compact-date">~' + deadlineStr + '</span>' : ''}
        <div class="event-actions">
          ${event.link ? '<a href="' + escapeHtml(sanitizeUrl(event.link) || '') + '" target="_blank" rel="noopener" class="btn btn-small btn-link">🔗</a>' : ''}
          <button class="btn btn-small btn-submit" onclick="completeSupabaseEvent('${escapeAttr(String(event.supabaseId))}')" aria-label="참여 완료">✓</button>
        </div>
        <div class="event-dday">${formatDday(days)}</div>
      </div>
    </div>
  `;
}
