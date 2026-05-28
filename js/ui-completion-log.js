// ============================================
// completionLog 관리 + 습관 트래커
// ============================================

/**
 * completionLog localStorage 저장
 */
function saveCompletionLog() {
  try {
    if (!appState.user) {
      localStorage.setItem('navigator-completion-log', JSON.stringify(appState.completionLog));
    }
    // 로그인 사용자는 syncToFirebase()로 Firestore에 저장됨 (_doSaveState 경유)
  } catch (e) {
    console.error('완료 로그 저장 실패:', e);
  }
}

/**
 * completionLog localStorage 로드 + 기존 데이터 마이그레이션
 */
function loadCompletionLog() {
  const parsed = safeParseJSON('navigator-completion-log', null);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    appState.completionLog = parsed;
  }

  // 기존 사용자 마이그레이션: appState.tasks에 남아있는 완료 태스크를 completionLog로 이전
  if (Object.keys(appState.completionLog).length === 0) {
    let migrated = 0;
    appState.tasks.forEach(t => {
      if (t.completed && t.completedAt) {
        const d = new Date(t.completedAt);
        const dateKey = getLocalDateStr(d);
        const timeStr = d.toTimeString().slice(0, 5);
        if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
        const entry = { t: t.title, c: t.category || '기타', at: timeStr };
        if (t.repeatType && t.repeatType !== 'none') entry.r = t.repeatType;
        if (t.expectedRevenue) entry.rv = Number(t.expectedRevenue);
        appState.completionLog[dateKey].push(entry);
        migrated++;
      }
    });
    // 기존 completion-history도 마이그레이션
    const oldHistory = safeParseJSON('navigator-completion-history', []);
    oldHistory.forEach(h => {
      if (h.completedAt) {
        const d = new Date(h.completedAt);
        const dateKey = getLocalDateStr(d);
        const timeStr = d.toTimeString().slice(0, 5);
        if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
        // 중복 방지 (title+time 기준)
        const exists = appState.completionLog[dateKey].some(e => e.t === h.title && e.at === timeStr);
        if (!exists) {
          appState.completionLog[dateKey].push({
            t: h.title, c: h.category || '기타', at: timeStr
          });
          migrated++;
        }
      }
    });
    if (migrated > 0) {
      saveCompletionLog();
      console.log(`[migration] completionLog에 ${migrated}건 마이그레이션 완료`);
    }
  }
}

/**
 * completionLog 병합 (Firebase 동기화용)
 * 날짜별 합집합, title+at 기준 중복 제거
 */
function mergeCompletionLog(local, cloud) {
  const merged = {};
  const deletedLog = (appState.deletedIds && appState.deletedIds.completionLog) || {};

  // 삭제 여부 확인 헬퍼
  const isDeleted = (date, entry) => {
    const key = date + '|' + (entry.t || '') + '|' + (entry.at || '');
    return !!deletedLog[key];
  };

  // 로컬 데이터 먼저 복사 (삭제된 항목 제외)
  for (const date of Object.keys(local || {})) {
    const filtered = (local[date] || []).filter(e => e._summary || !isDeleted(date, e));
    if (filtered.length > 0) merged[date] = filtered;
  }
  // 클라우드 데이터 병합
  for (const date of Object.keys(cloud || {})) {
    const cloudEntries = (cloud[date] || []).filter(e => e._summary || !isDeleted(date, e));
    if (cloudEntries.length === 0) continue;

    if (!merged[date]) {
      merged[date] = [...cloudEntries];
    } else {
      // 한쪽이 압축 데이터(_summary)면 더 많은 데이터를 가진 쪽 우선
      const localIsSummary = merged[date].length === 1 && merged[date][0]?._summary;
      const cloudIsSummary = cloudEntries.length === 1 && cloudEntries[0]?._summary;

      if (localIsSummary && !cloudIsSummary && cloudEntries.length > 0) {
        // 클라우드에 상세 데이터가 있으면 클라우드 우선
        merged[date] = [...cloudEntries];
      } else if (!localIsSummary && cloudIsSummary) {
        // 로컬에 상세 데이터가 있으면 로컬 유지
      } else {
        // 둘 다 일반 데이터이거나 둘 다 압축 — 기존 로직
        const existing = new Set(merged[date].map(e => (e.t || '') + '|' + (e.at || '')));
        for (const entry of cloudEntries) {
          if (entry._summary) continue; // 압축 항목은 병합하지 않음
          if (!existing.has((entry.t || '') + '|' + (entry.at || ''))) {
            merged[date].push(entry);
          }
        }
      }
    }
  }
  return merged;
}

/**
 * completionLog 데이터 보존 정책:
 * - 최근 365일: 전체 상세 기록 유지
 * - 1년 이상: 일별 요약으로 압축 { count, categories: {본업:2}, totalRevenue: 150000 }
 * 앱 시작 시 1일 1회 자동 실행
 */
function compactOldCompletionLog() {
  const lastCompact = localStorage.getItem('navigator-completion-log-compact-date');
  const todayStr = getLocalDateStr();
  if (lastCompact === todayStr) return; // 오늘 이미 실행

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = getLocalDateStr(cutoff);

  let compacted = 0;
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (dateKey >= cutoffStr) continue; // 1년 이내는 유지
    if (!Array.isArray(entries)) continue;
    // 이미 압축된 형태인지 확인 (배열 길이 1 + _summary 플래그)
    if (entries.length === 1 && entries[0]._summary) continue;

    // 일별 요약으로 압축
    const cats = {};
    let totalRev = 0;
    entries.forEach(e => {
      cats[e.c || '기타'] = (cats[e.c || '기타'] || 0) + 1;
      if (e.rv) totalRev += e.rv;
    });

    appState.completionLog[dateKey] = [{
      _summary: true,
      count: entries.length,
      categories: cats,
      totalRevenue: totalRev
    }];
    compacted++;
  }

  if (compacted > 0) {
    saveCompletionLog();
    console.log(`[compact] completionLog ${compacted}일 압축 완료`);
  }

  localStorage.setItem('navigator-completion-log-compact-date', todayStr);
}

/**
 * completionLog에서 날짜 범위 내 엔트리 조회
 * @param {string} startDateStr - YYYY-MM-DD (포함)
 * @param {string} endDateStr - YYYY-MM-DD (미포함)
 * @returns {Array} [{t, c, at, r?, rv?, dateKey}, ...]
 */
function getCompletionLogEntries(startDateStr, endDateStr) {
  const entries = [];
  for (const [dateKey, dayEntries] of Object.entries(appState.completionLog || {})) {
    if (dateKey >= startDateStr && dateKey < endDateStr) {
      (dayEntries || []).forEach(e => {
        if (e._summary) {
          // 압축된 데이터: 카테고리별 가상 엔트리 생성
          for (const [cat, cnt] of Object.entries(e.categories || {})) {
            for (let i = 0; i < cnt; i++) {
              entries.push({ t: '(요약)', c: cat, at: '00:00', rv: 0, dateKey });
            }
          }
        } else {
          entries.push({ ...e, dateKey });
        }
      });
    }
  }
  return entries;
}

function getWeeklyReport() {
  const now = new Date();

  // 이번 주 시작 (일요일)
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const thisWeekStartStr = getLocalDateStr(thisWeekStart);

  // 지난 주 시작/끝
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = getLocalDateStr(lastWeekStart);

  // 내일 (이번 주 종료 기준)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  // completionLog 기반 이번 주 / 지난 주 완료 작업 조회
  const thisWeekEntries = getCompletionLogEntries(thisWeekStartStr, tomorrowStr);
  const lastWeekEntries = getCompletionLogEntries(lastWeekStartStr, thisWeekStartStr);

  // 요일별 완료 수 계산
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayData = [0, 0, 0, 0, 0, 0, 0];

  thisWeekEntries.forEach(e => {
    const day = new Date(e.dateKey).getDay();
    dayData[day]++;
  });

  // 가장 생산적인 요일
  const maxDayIdx = dayData.indexOf(Math.max(...dayData));
  const bestDay = dayData[maxDayIdx] > 0 ? dayNames[maxDayIdx] : '-';
  const bestDayCount = dayData[maxDayIdx];

  // 카테고리별 완료 수
  const categoryData = {};
  thisWeekEntries.forEach(e => {
    const cat = e.c || '기타';
    categoryData[cat] = (categoryData[cat] || 0) + 1;
  });

  // 가장 많이 완료한 카테고리
  let topCategory = '-';
  let topCategoryCount = 0;
  Object.keys(categoryData).forEach(cat => {
    if (categoryData[cat] > topCategoryCount) {
      topCategoryCount = categoryData[cat];
      topCategory = cat;
    }
  });

  // 변화량 계산
  const change = thisWeekEntries.length - lastWeekEntries.length;

  return {
    thisWeekCount: thisWeekEntries.length,
    lastWeekCount: lastWeekEntries.length,
    change: change,
    bestDay: bestDay,
    bestDayCount: bestDayCount,
    topCategory: topCategory,
    topCategoryCount: topCategoryCount,
    dayData: dayData.map((count, i) => ({ day: dayNames[i], count })),
    streak: appState.streak.current
  };
}

/**
 * 습관 트래커 데이터 생성 (최근 12주)
 * @param {string} [habitTitle] - 특정 습관 필터 (없으면 전체)
 */
function getHabitTrackerData(habitTitle) {
  const now = new Date();
  const weeks = 12;
  const data = [];

  // 오늘 날짜 문자열
  const todayStr = getLocalDateStr(now);

  // 완료 맵 생성 (습관 필터 전달)
  const completionMap = getCompletionMap(habitTitle);

  // per-habit은 1일 1회이므로 레벨 기준 조정
  const isPerHabit = habitTitle && habitTitle !== 'all';

  // 12주 전부터 시작
  for (let week = weeks - 1; week >= 0; week--) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (week * 7 + (6 - day)) - now.getDay());
      const dateStr = getLocalDateStr(date);
      const count = completionMap[dateStr] || 0;

      // 레벨 계산 (per-habit: 완료=level 4, 전체: 기존 기준)
      let level = 0;
      if (isPerHabit) {
        if (count >= 1) level = 4;
      } else {
        if (count >= 1) level = 1;
        if (count >= 3) level = 2;
        if (count >= 5) level = 3;
        if (count >= 7) level = 4;
      }

      weekData.push({
        date: dateStr,
        count: count,
        level: level,
        isToday: dateStr === todayStr
      });
    }
    data.push(weekData);
  }

  return data;
}

/**
 * 반복 습관(daily/weekdays) 목록 추출 — 트래커 필터용
 */
function getRecurringHabits() {
  const habits = new Set();
  // 현재 반복 작업에서 추출
  appState.tasks.forEach(t => {
    if (t.repeatType && t.repeatType !== 'none') {
      habits.add(t.title);
    }
  });
  // completionLog에서 자주 등장하는 제목도 추출 (최근 30일)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = getLocalDateStr(cutoff);
  const titleCounts = {};
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (dateKey < cutoffStr) continue;
    (entries || []).forEach(e => {
      if (e.t && !e._summary) {
        titleCounts[e.t] = (titleCounts[e.t] || 0) + 1;
      }
    });
  }
  // 5회 이상 완료된 것도 습관으로 간주
  Object.entries(titleCounts).forEach(([title, count]) => {
    if (count >= 5) habits.add(title);
  });
  return [...habits].sort();
}
