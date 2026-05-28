// ============================================
// 히스토리 / 캘린더 관련 함수
// ============================================

/**
 * 특정 날짜의 완료된 작업 목록 가져오기
 */
function getCompletedTasksByDate(dateStr) {
  const results = [];
  const seen = new Set();

  // 1. completionLog에서 조회 (영구 기록) — 동일 제목+시간도 각각 표시
  const logEntries = (appState.completionLog || {})[dateStr] || [];
  logEntries.forEach((e, idx) => {
    if (e._summary) return; // 압축된 요약 데이터 건너뛰기
    const key = 'log|' + idx + '|' + e.t + '|' + e.at;
    seen.add(key);
    // tasks 중복 체크용 별도 키도 등록
    const dedupKey = e.t + '|' + e.at;
    seen.add(dedupKey);
    results.push({
      title: e.t,
      category: e.c,
      completedAt: dateStr + 'T' + e.at,
      repeatType: e.r || null,
      expectedRevenue: e.rv || 0,
      estimatedTime: 0,
      subtaskDone: e.st || 0,
      fromLog: true,
      logIndex: idx  // completionLog 내 원래 인덱스 (수정/삭제용)
    });
  });

  // 2. appState.tasks에서 보완 (completionLog에 없는 항목)
  const deletedLog = (appState.deletedIds && appState.deletedIds.completionLog) || {};
  (appState.tasks || []).forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const completedDate = getLocalDateStr(new Date(t.completedAt));
    if (completedDate !== dateStr) return;
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    // Soft-Delete: completionLog에서 삭제된 항목이면 tasks에서도 표시하지 않음
    const delKey = dateStr + '|' + (t.title || '') + '|' + timeStr;
    if (deletedLog[delKey]) return;
    const key = t.title + '|' + timeStr;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(t);
    }
  });

  return results.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
}

/**
 * 날짜별 완료 작업 수 맵 생성
 * @param {string} [habitTitle] - 특정 습관만 필터 (없으면 전체)
 */
function getCompletionMap(habitTitle) {
  const map = {};
  // completionLog 기반 (과거 영구 기록 포함)
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    (entries || []).forEach(e => {
      if (habitTitle && e.t !== habitTitle) return;
      if (e._summary) {
        if (!habitTitle) map[dateKey] = (map[dateKey] || 0) + (e.count || 0);
      } else {
        map[dateKey] = (map[dateKey] || 0) + 1;
      }
    });
  }
  // appState.tasks 현재 데이터로 보완 (completionLog와 중복되지 않는 항목만 추가)
  const deletedLog = (appState.deletedIds && appState.deletedIds.completionLog) || {};
  (appState.tasks || []).forEach(t => {
    if (habitTitle && t.title !== habitTitle) return;
    if (t.completed && t.completedAt) {
      const dateKey = getLocalDateStr(new Date(t.completedAt));
      const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
      // Soft-Delete: completionLog에서 삭제된 항목이면 카운트하지 않음
      const delKey = dateKey + '|' + (t.title || '') + '|' + timeStr;
      if (deletedLog[delKey]) return;
      const logEntries = (appState.completionLog || {})[dateKey] || [];
      // completionLog에 같은 제목+시간 항목이 없는 경우만 카운트
      const isDuplicate = logEntries.some(e => e.t === t.title && e.at === timeStr);
      if (!isDuplicate) {
        map[dateKey] = (map[dateKey] || 0) + 1;
      }
    }
  });
  return map;
}

/**
 * 주간 통계 계산
 */
function getWeeklyStats() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // 이번 주 일요일
  weekStart.setHours(0, 0, 0, 0);

  // completionLog 기반 일별 완료 수 계산
  const completionMap = getCompletionMap();
  const dailyCounts = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayStr = getLocalDateStr(day);
    dailyCounts.push(completionMap[dayStr] || 0);
  }

  const totalCompleted = dailyCounts.reduce((a, b) => a + b, 0);
  const daysWithActivity = dailyCounts.filter(c => c > 0).length;
  const avgPerDay = daysWithActivity > 0 ? (totalCompleted / daysWithActivity).toFixed(1) : 0;

  return {
    total: totalCompleted,
    avgPerDay: avgPerDay,
    activeDays: daysWithActivity,
    dailyCounts: dailyCounts
  };
}

/**
 * completionLog + task fallback을 같은 shape로 묶는다.
 */
function getHistoryGroupedEntries() {
  const grouped = {};

  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (!Array.isArray(entries)) continue;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    entries.forEach((e, idx) => {
      if (e._summary) return;
      grouped[dateKey].push({
        title: e.t,
        category: e.c,
        completedAt: dateKey + 'T' + e.at,
        expectedRevenue: e.rv || 0,
        subtaskDone: e.st || 0,
        repeatType: e.r || null,
        fromLog: true,
        logIndex: idx,
        _logDate: dateKey,
        _logIndex: idx
      });
    });
  }

  const deletedLog = (appState.deletedIds && appState.deletedIds.completionLog) || {};
  (appState.tasks || []).forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const dateKey = getLocalDateStr(new Date(t.completedAt));
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const delKey = dateKey + '|' + (t.title || '') + '|' + timeStr;
    if (deletedLog[delKey]) return;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    const exists = grouped[dateKey].some(e => {
      const eTime = new Date(e.completedAt).toTimeString().slice(0, 5);
      return e.title === t.title && eTime === timeStr;
    });
    if (!exists) {
      grouped[dateKey].push(t);
    }
  });

  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey] = grouped[dateKey].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  });

  return grouped;
}

function getHistoryFlatEntries() {
  const grouped = getHistoryGroupedEntries();
  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .flatMap(dateKey => grouped[dateKey].map(entry => ({ ...entry, _dateKey: dateKey })));
}

window.getCompletedTasksByDate = getCompletedTasksByDate;
window.getCompletionMap = getCompletionMap;
window.getWeeklyStats = getWeeklyStats;
window.getHistoryGroupedEntries = getHistoryGroupedEntries;
window.getHistoryFlatEntries = getHistoryFlatEntries;
