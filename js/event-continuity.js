// ============================================
// TGEventBot / Supabase event continuity (P4)
// ============================================

const PENDING_EVENT_SYNC_STORAGE_KEY = 'navigator-pending-event-status-sync';

function getTelegramEventIdFromTask(task) {
  if (!task) return null;
  if (task.source && task.source.type === 'telegram-event' && task.source.eventId) {
    return String(task.source.eventId);
  }
  if (task.telegramEventId) return String(task.telegramEventId);
  return null;
}

function getCompletionLogEventKey(eventId) {
  return eventId ? 'event:' + String(eventId) : '';
}

function getCompletionLogEventTombstone(eventId) {
  const eventKey = getCompletionLogEventKey(eventId);
  if (!eventKey) return '';
  const deleted = (appState.deletedIds && appState.deletedIds.completionLog) || {};
  return Object.entries(deleted).reduce((latest, [key, timestamp]) => {
    if (key !== eventKey && !key.endsWith('|' + eventKey)) return latest;
    return typeof timestamp === 'string' && timestamp > latest ? timestamp : latest;
  }, '');
}

function getCompletionLogKey(dateKey, entry) {
  if (entry && entry.eventId) return getCompletionLogEventKey(entry.eventId);
  return dateKey + '|' + ((entry && entry.t) || '') + '|' + ((entry && entry.at) || '');
}

function hasCompletionLogEventTombstone(eventId) {
  return !!getCompletionLogEventTombstone(eventId);
}

function clearCompletionLogEventTombstones(eventId) {
  const eventKey = getCompletionLogEventKey(eventId);
  if (!eventKey) return;
  if (!appState.deletedIds) appState.deletedIds = {};
  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
  const deleted = appState.deletedIds.completionLog;
  Object.keys(deleted).forEach(key => {
    if (key === eventKey || key.endsWith('|' + eventKey)) delete deleted[key];
  });
}

function isCompletionLogEntryDeleted(dateKey, entry) {
  const deleted = (appState.deletedIds && appState.deletedIds.completionLog) || {};
  if (entry && entry.eventId) {
    const tombstone = getCompletionLogEventTombstone(entry.eventId);
    if (tombstone && (!entry.eventUpdatedAt || entry.eventUpdatedAt <= tombstone)) return true;
  }
  const legacyKey = dateKey + '|' + ((entry && entry.t) || '') + '|' + ((entry && entry.at) || '');
  return !!deleted[legacyKey];
}

function hasCompletionLogEvent(eventId) {
  if (!eventId) return false;
  const target = String(eventId);
  for (const entries of Object.values(appState.completionLog || {})) {
    if ((entries || []).some(entry => String(entry.eventId || '') === target)) return true;
  }
  return false;
}

function addCompletionLogForEvent(event, completedAt, options) {
  if (!event || !event.supabaseId) return false;
  const eventId = String(event.supabaseId);
  if (hasCompletionLogEvent(eventId)) return false;
  const respectEventTombstone = !!(options && options.respectEventTombstone);
  if (respectEventTombstone && hasCompletionLogEventTombstone(eventId)) return false;

  const when = completedAt ? new Date(completedAt) : new Date();
  const dateKey = typeof getLocalDateStr === 'function' ? getLocalDateStr(when) : when.toISOString().slice(0, 10);
  const timeStr = when.toTimeString().slice(0, 5);
  const rv = typeof event.expectedRevenue === 'number'
    ? event.expectedRevenue
    : (parseFloat(String(event.expectedRevenue || '').replace(/[^0-9.]/g, '')) || 0);
  const entry = {
    eventId: eventId,
    t: event.title || '이벤트',
    c: '부업',
    at: timeStr
  };
  if (!respectEventTombstone) entry.eventUpdatedAt = when.toISOString();
  if (rv) entry.rv = rv;
  if (respectEventTombstone && isCompletionLogEntryDeleted(dateKey, entry)) return false;
  clearCompletionLogEventTombstones(eventId);
  if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
  appState.completionLog[dateKey].push(entry);
  return true;
}

function removeCompletionLogForEvent(eventId, fallbackTitle) {
  const target = String(eventId || '');
  let removed = false;
  if (!appState.deletedIds) appState.deletedIds = {};
  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};

  if (target) {
    appState.deletedIds.completionLog[getCompletionLogEventKey(target)] = new Date().toISOString();
    for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
      const kept = (entries || []).filter(entry => {
        const matches = String(entry.eventId || '') === target;
        if (matches) removed = true;
        return !matches;
      });
      if (kept.length > 0) appState.completionLog[dateKey] = kept;
      else delete appState.completionLog[dateKey];
    }
    if (removed || !fallbackTitle) return removed;
  }

  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    const idx = (entries || []).findIndex(entry => !entry.eventId && fallbackTitle && entry.t === fallbackTitle && entry.c === '부업');
    if (idx === -1) continue;
    const entry = entries[idx];
    appState.deletedIds.completionLog[getCompletionLogKey(dateKey, entry)] = new Date().toISOString();
    entries.splice(idx, 1);
    if (entries.length === 0) delete appState.completionLog[dateKey];
    return true;
  }
  return removed;
}

function queueEventStatusSync(eventId, status) {
  if (!eventId) return;
  const now = new Date().toISOString();
  if (!Array.isArray(appState.pendingEventStatusSync)) appState.pendingEventStatusSync = [];
  appState.pendingEventStatusSync = appState.pendingEventStatusSync
    .filter(item => String(item.eventId) !== String(eventId))
    .concat({ eventId: String(eventId), status: status, queuedAt: now, tries: 0 });
  persistPendingEventStatusSync();
}

function persistPendingEventStatusSync() {
  try {
    localStorage.setItem(PENDING_EVENT_SYNC_STORAGE_KEY, JSON.stringify(appState.pendingEventStatusSync || []));
  } catch (error) {
    console.warn('Event status queue save failed:', error);
  }
}

async function patchSupabaseEventStatus(eventId, status) {
  const encodedId = encodeURIComponent(String(eventId));
  const res = await fetch(
    TG_SUPABASE_URL + '/rest/v1/telegram_messages?id=eq.' + encodedId,
    {
      method: 'PATCH',
      headers: {
        'apikey': TG_SUPABASE_KEY,
        'Authorization': 'Bearer ' + TG_SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: status })
    }
  );
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return true;
}

function markSupabaseEventStatusLocal(eventId, status) {
  const event = (_supabaseEventCache.data || []).find(item => String(item.supabaseId) === String(eventId));
  if (!event) return null;
  event.status = status;
  event.effectiveStatus = status;
  if (typeof _persistSupabaseEventCache === 'function') _persistSupabaseEventCache();
  return event;
}

async function syncLinkedEventStatus(task, participated) {
  const eventId = getTelegramEventIdFromTask(task);
  if (!eventId) return;
  const status = participated ? 'done' : 'pending';
  markSupabaseEventStatusLocal(eventId, status);
  if (!navigator.onLine) {
    queueEventStatusSync(eventId, status);
    return;
  }
  try {
    await patchSupabaseEventStatus(eventId, status);
  } catch (error) {
    console.warn('Telegram event status queued:', error.message);
    queueEventStatusSync(eventId, status);
  }
}

async function flushPendingEventStatusSync() {
  if (!navigator.onLine || !Array.isArray(appState.pendingEventStatusSync) || appState.pendingEventStatusSync.length === 0) return;
  const remaining = [];
  for (const item of appState.pendingEventStatusSync) {
    try {
      await patchSupabaseEventStatus(item.eventId, item.status);
      markSupabaseEventStatusLocal(item.eventId, item.status);
    } catch (error) {
      remaining.push({ ...item, tries: Number(item.tries || 0) + 1 });
    }
  }
  appState.pendingEventStatusSync = remaining;
  persistPendingEventStatusSync();
  if (remaining.length === 0 && typeof showToast === 'function') {
    showToast('대기 중이던 이벤트 상태 동기화 완료', 'success');
  }
}

function backfillSupabaseEventCompletionLog(events) {
  let added = 0;
  (events || []).forEach(event => {
    if ((event.effectiveStatus || event.status) !== 'done') return;
    // Dating = detection time (this fetch), never event.date/msg.date. A weeks-old
    // message date would corrupt completionLog history + streak math (PLAN P4 finding #13).
    if (addCompletionLogForEvent(event, new Date().toISOString(), { respectEventTombstone: true })) added++;
  });
  if (added > 0) {
    saveCompletionLog();
    saveState();
  }
  return added;
}

function createTaskFromSupabaseEvent(supabaseId) {
  const event = (_supabaseEventCache.data || []).find(item => String(item.supabaseId) === String(supabaseId));
  if (!event) {
    showToast('수신 이벤트를 찾을 수 없습니다', 'error');
    return;
  }
  const eventId = String(event.supabaseId);
  const existing = (appState.tasks || []).find(task => getTelegramEventIdFromTask(task) === eventId);
  if (existing) {
    showToast('이미 할 일로 연결된 이벤트입니다', 'info');
    if (typeof switchTab === 'function') switchTab('all');
    return;
  }

  const now = new Date().toISOString();
  appState.tasks.unshift({
    id: generateId(),
    title: event.title || '이벤트',
    category: '부업',
    deadline: event.deadline || '',
    estimatedTime: 10,
    link: event.link || '',
    expectedRevenue: event.expectedRevenue || '',
    description: event.description || '',
    organizer: event.organizer || event.channel || '',
    eventType: event.type || event.project || '',
    completed: false,
    source: { type: 'telegram-event', eventId: eventId },
    createdAt: now,
    updatedAt: now
  });
  saveState();
  renderStatic();
  showToast('이벤트를 할 일로 연결했습니다', 'success');
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    PENDING_EVENT_SYNC_STORAGE_KEY,
    getTelegramEventIdFromTask,
    getCompletionLogEventKey,
    getCompletionLogKey,
    hasCompletionLogEventTombstone,
    clearCompletionLogEventTombstones,
    isCompletionLogEntryDeleted,
    addCompletionLogForEvent,
    removeCompletionLogForEvent,
    queueEventStatusSync,
    persistPendingEventStatusSync,
    patchSupabaseEventStatus,
    markSupabaseEventStatusLocal,
    syncLinkedEventStatus,
    flushPendingEventStatusSync,
    backfillSupabaseEventCompletionLog,
    createTaskFromSupabaseEvent
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getTelegramEventIdFromTask,
    getCompletionLogEventKey,
    getCompletionLogKey,
    hasCompletionLogEventTombstone,
    clearCompletionLogEventTombstones,
    isCompletionLogEntryDeleted,
    hasCompletionLogEvent,
    addCompletionLogForEvent,
    removeCompletionLogForEvent,
    backfillSupabaseEventCompletionLog
  };
}
