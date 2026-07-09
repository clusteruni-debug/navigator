// ============================================
// 수신 이벤트 — Supabase fetch/cache/render
// render-events.js에서 분리 (코드 분할 규칙: 500줄 이하)
// ============================================

// D-day 계산 (로컬 섹션에서도 사용)
function getDaysLeft(deadline) {
  if (!deadline) return null;
  const todayKey = typeof getLogicalDate === 'function' ? getLogicalDate() : getLocalDateStr();
  const today = new Date(todayKey + 'T00:00:00');
  const raw = String(deadline);
  const d = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function formatDday(days) {
  if (days === null) return '';
  if (days < 0) return 'D+' + Math.abs(days);
  if (days === 0) return 'D-Day';
  if (days <= 3) return 'D-' + days;
  return 'D-' + days;
}

function getEffectiveSupabaseEventStatus(event) {
  if (event.status === 'skipped') return 'skipped';
  if (event.status === 'done') return 'done';
  return 'pending';
}

let _supabaseHighlightRetryId = null;
let _supabaseHighlightFrame = null;
const SUPABASE_EVENT_CACHE_STORAGE_KEY = 'navigator-supabase-events-cache-v2'; // v2: rewardCurrency 필드 추가 — v1 캐시는 통화 없이 '원' 오표기

function _hydrateSupabaseEventCache() {
  try {
    localStorage.removeItem('navigator-supabase-events-cache-v1'); // v1 잔존 엔트리 1회성 정리
    const cached = safeParseJSON(SUPABASE_EVENT_CACHE_STORAGE_KEY, null);
    if (!cached || !Array.isArray(cached.data)) return;
    _supabaseEventCache.data = cached.data.map(event => ({
      ...event,
      effectiveStatus: event.effectiveStatus || getEffectiveSupabaseEventStatus(event)
    }));
    _supabaseEventCache.fetchedAt = typeof cached.fetchedAt === 'number' ? cached.fetchedAt : null;
  } catch (error) {
    console.warn('Supabase 이벤트 캐시 복원 실패:', error);
  }
}

function _persistSupabaseEventCache() {
  try {
    localStorage.setItem(SUPABASE_EVENT_CACHE_STORAGE_KEY, JSON.stringify({
      data: _supabaseEventCache.data || [],
      fetchedAt: _supabaseEventCache.fetchedAt || Date.now()
    }));
  } catch (error) {
    console.warn('Supabase 이벤트 캐시 저장 실패:', error);
  }
}

function _installSupabaseEventRevalidator() {
  if (window._supabaseEventRevalidatorInstalled) return;
  window._supabaseEventRevalidatorInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (appState.currentTab !== 'events') return;
    if (_needsSupabaseFetch()) refreshSupabaseEvents();
  });
}

_hydrateSupabaseEventCache();
_installSupabaseEventRevalidator();

function _syncSupabaseHighlightCard() {
  const highlightId = _supabaseEventCache.highlightId ? String(_supabaseEventCache.highlightId) : null;

  if (!highlightId || appState.currentTab !== 'events') {
    _supabaseHighlightRetryId = null;
    if (_supabaseHighlightFrame !== null) {
      cancelAnimationFrame(_supabaseHighlightFrame);
      _supabaseHighlightFrame = null;
    }
    return;
  }

  const hasCachedMatch = (_supabaseEventCache.data || []).some(event => String(event.supabaseId) === highlightId);
  if (!hasCachedMatch) {
    if (!_supabaseEventCache.loading && _supabaseHighlightRetryId !== highlightId) {
      _supabaseHighlightRetryId = highlightId;
      refreshSupabaseEvents();
    }
    return;
  }

  _supabaseHighlightRetryId = null;
  if (_supabaseHighlightFrame !== null) {
    cancelAnimationFrame(_supabaseHighlightFrame);
  }

  _supabaseHighlightFrame = requestAnimationFrame(() => {
    _supabaseHighlightFrame = null;
    if (appState.currentTab !== 'events' || String(_supabaseEventCache.highlightId || '') !== highlightId) return;

    const targetCard = Array.from(document.querySelectorAll('.supabase-event-card'))
      .find(card => card.dataset.eventId === highlightId);

    if (!targetCard) return;

    targetCard.classList.add('event-card--highlight');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    targetCard.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });
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
      'select=id,content,original_channel,deadline,urls,analysis,starred,status,date',
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
        rewardCurrency: analysis.reward_usd ? 'USD' : null, // reward_usd는 달러 — 표시 단위 구분용
        channel: msg.original_channel,
        project: analysis.project || null,
        organizer: analysis.organizer || null,
        type: analysis.type || null,
        starred: msg.starred,
        status: msg.status || null,
        effectiveStatus: getEffectiveSupabaseEventStatus(msg),
        date: msg.date
      };
    });
    if (typeof backfillSupabaseEventCompletionLog === "function") backfillSupabaseEventCompletionLog(_supabaseEventCache.data);
    _supabaseEventCache.fetchedAt = Date.now();
    _persistSupabaseEventCache();
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

// Supabase 이벤트 완료/취소 — eventId-aware + offline PATCH queue (P4)
async function completeSupabaseEvent(supabaseId) {
  const event = (_supabaseEventCache.data || []).find(item => String(item.supabaseId) === String(supabaseId));
  if (!event) return;
  try {
    if (navigator.onLine && typeof patchSupabaseEventStatus === "function") {
      await patchSupabaseEventStatus(supabaseId, "done");
    } else if (typeof queueEventStatusSync === "function") {
      queueEventStatusSync(supabaseId, "done");
    }
    if (typeof markSupabaseEventStatusLocal === "function") markSupabaseEventStatusLocal(supabaseId, "done");
    else { event.status = "done"; event.effectiveStatus = "done"; _persistSupabaseEventCache(); }
    if (typeof addCompletionLogForEvent === "function" && addCompletionLogForEvent(event)) saveCompletionLog();
    saveState();
    showToast(navigator.onLine ? "참여 완료" : "오프라인 큐에 저장됨", navigator.onLine ? "success" : "warning");
    renderStatic();
  } catch (error) {
    console.warn("Supabase 이벤트 완료 큐 저장:", error.message);
    if (typeof queueEventStatusSync === "function") queueEventStatusSync(supabaseId, "done");
    if (typeof markSupabaseEventStatusLocal === "function") markSupabaseEventStatusLocal(supabaseId, "done");
    if (typeof addCompletionLogForEvent === "function" && addCompletionLogForEvent(event)) saveCompletionLog();
    saveState();
    showToast("완료 상태를 오프라인 큐에 저장했습니다", "warning");
    renderStatic();
  }
}
window.completeSupabaseEvent = completeSupabaseEvent;

async function uncompleteSupabaseEvent(supabaseId) {
  const event = (_supabaseEventCache.data || []).find(item => String(item.supabaseId) === String(supabaseId));
  if (!event) return;
  try {
    if (navigator.onLine && typeof patchSupabaseEventStatus === "function") {
      await patchSupabaseEventStatus(supabaseId, "pending");
    } else if (typeof queueEventStatusSync === "function") {
      queueEventStatusSync(supabaseId, "pending");
    }
    if (typeof markSupabaseEventStatusLocal === "function") markSupabaseEventStatusLocal(supabaseId, "pending");
    else { event.status = "pending"; event.effectiveStatus = "pending"; _persistSupabaseEventCache(); }
    if (typeof removeCompletionLogForEvent === "function" && removeCompletionLogForEvent(supabaseId, event.title)) saveCompletionLog();
    saveState();
    showToast("참여 완료 취소됨", "info");
    renderStatic();
  } catch (error) {
    console.warn("Supabase 이벤트 취소 큐 저장:", error.message);
    if (typeof queueEventStatusSync === "function") queueEventStatusSync(supabaseId, "pending");
    if (typeof markSupabaseEventStatusLocal === "function") markSupabaseEventStatusLocal(supabaseId, "pending");
    if (typeof removeCompletionLogForEvent === "function" && removeCompletionLogForEvent(supabaseId, event.title)) saveCompletionLog();
    saveState();
    showToast("취소 상태를 오프라인 큐에 저장했습니다", "warning");
    renderStatic();
  }
}
window.uncompleteSupabaseEvent = uncompleteSupabaseEvent;
