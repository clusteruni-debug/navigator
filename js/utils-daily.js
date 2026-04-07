// ============================================
// 일일 리셋 / 스트릭 계산
// (utils.js에서 분리)
// ============================================

/**
 * 논리적 날짜 계산 (하루 시작 시각 기반)
 * 설정된 dayStartHour(기본 05:00) 이전이면 아직 "어제"로 취급
 * → 새벽 1시에 활동해도 리셋되지 않음, 5시 이후에 리셋됨
 */
function getLogicalDate(d) {
  const dt = d || new Date();
  if (isNaN(dt.getTime())) return getLocalDateStr(new Date());
  const dayStartHour = (appState.settings && appState.settings.dayStartHour) || 5;

  if (dt.getHours() < dayStartHour) {
    // 하루 시작 시각 이전 → 아직 "어제"
    const adjusted = new Date(dt);
    adjusted.setDate(adjusted.getDate() - 1);
    return getLocalDateStr(adjusted);
  }
  return getLocalDateStr(dt);
}

/**
 * 반복 태스크 일일 초기화 (논리적 날짜 변경 시 자동 실행)
 * - dayStartHour(기본 05:00) 기준으로 "하루"를 판단
 * - daily/weekdays 태스크: 완료 상태를 리셋하여 매일 새로 시작
 * - weekdays 태스크: 주말에는 초기화하지 않음 (금요일 완료 → 월요일에 리셋)
 * - 기존 createNextRepeatTask로 생긴 중복 태스크도 정리
 * - 스트릭: 어제 모든 반복 태스크 완료 시 유지, 아니면 리셋
 * - 트리거: 앱 로딩, visibilitychange, setInterval(1분), 기상 버튼
 */
function checkDailyReset() {
  const now = new Date();
  const dayStartHour = (appState.settings && appState.settings.dayStartHour) || 5;

  // 하루 시작 시각 이전이면 리셋하지 않음 (새벽 활동 보호)
  if (now.getHours() < dayStartHour) return false;

  const logicalToday = getLogicalDate();
  const lastResetDate = localStorage.getItem('navigator-last-reset-date');

  if (lastResetDate === logicalToday) return false; // 이미 오늘 초기화됨

  // 논리적 "오늘"의 요일 (dayStartHour 이후이므로 now의 요일이 정확)
  const todayDay = now.getDay(); // 0=일, 6=토
  const isWeekday = todayDay !== 0 && todayDay !== 6;

  let changed = false;

  // 1단계: 반복 태스크 완료 상태 초기화
  appState.tasks.forEach(task => {
    if (task.repeatType !== 'daily' && task.repeatType !== 'weekdays') return;

    // weekdays 태스크: 주말(토/일)에는 초기화하지 않음
    if (task.repeatType === 'weekdays' && !isWeekday) return;

    if (task.completed && task.completedAt) {
      // 완료 시점의 논리적 날짜와 오늘의 논리적 날짜 비교
      const completedLogicalDate = getLogicalDate(new Date(task.completedAt));
      if (completedLogicalDate !== logicalToday) {
        // 이전 논리적 날짜에 완료된 태스크 → 초기화
        task.lastCompletedAt = task.completedAt; // 히스토리 보존
        task.completed = false;
        task.completedAt = null;
        task.updatedAt = new Date().toISOString();
        changed = true;
      }
    }

    // 서브태스크 완료 상태도 초기화 (각 서브태스크의 논리적 완료일 기준)
    if (task.subtasks && task.subtasks.length > 0) {
      let subtaskChanged = false;
      task.subtasks.forEach(st => {
        if (!st.completed) return;
        if (!st.completedAt) {
          // completedAt 없는 레거시 데이터 → 리셋
          st.completed = false;
          subtaskChanged = true;
          return;
        }
        const stLogicalDate = getLogicalDate(new Date(st.completedAt));
        if (stLogicalDate !== logicalToday) {
          st.completed = false;
          st.completedAt = null;
          subtaskChanged = true;
        }
      });
      if (subtaskChanged) {
        task.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
  });

  // 2단계: 중복 반복 태스크 정리 (같은 제목+카테고리+반복타입 태스크가 여러 개면 하나만 남김)
  // 완료 여부 상관없이 중복 정리하되, 완료된 것을 우선 유지
  const seen = new Map();
  const toRemove = [];

  appState.tasks.forEach(task => {
    if (task.repeatType !== 'daily' && task.repeatType !== 'weekdays') return;

    const key = `${task.title}|${task.repeatType}|${task.category}`;
    if (seen.has(key)) {
      // 중복 발견: 우선순위 결정 (완료된 것 > 미완료 / 최신 생성)
      const existing = seen.get(key);

      // 완료 상태 우선 비교
      if (task.completed && !existing.completed) {
        // 현재 태스크가 완료됨 → 기존 것 제거
        toRemove.push(existing.id);
        seen.set(key, task);
      } else if (!task.completed && existing.completed) {
        // 기존 것이 완료됨 → 현재 것 제거
        toRemove.push(task.id);
      } else {
        // 둘 다 같은 상태 → 더 최근에 생성된 것 유지
        const existingTime = new Date(existing.createdAt || 0).getTime();
        const currentTime = new Date(task.createdAt || 0).getTime();
        if (currentTime > existingTime) {
          toRemove.push(existing.id);
          seen.set(key, task);
        } else {
          toRemove.push(task.id);
        }
      }
    } else {
      seen.set(key, task);
    }
  });

  if (toRemove.length > 0) {
    appState.tasks = appState.tasks.filter(t => !toRemove.includes(t.id));
    changed = true;
    console.log(`[daily-reset] 중복 반복 태스크 ${toRemove.length}개 정리`);
  }

  // 3단계: 반복 태스크 스트릭 체크 (어제 모든 반복 태스크 완료 여부)
  if (lastResetDate) {
    checkDailyRepeatStreak();
  }

  localStorage.setItem('navigator-last-reset-date', logicalToday);

  if (changed) {
    console.log(`[daily-reset] 반복 태스크 초기화 완료 (하루 시작: ${dayStartHour}시)`);
  }

  return changed;
}

/**
 * 반복 태스크 스트릭 체크
 * 어제(논리적) 모든 daily/weekdays 태스크를 완료했으면 스트릭 유지, 아니면 리셋
 */
function checkDailyRepeatStreak() {
  // "어제"를 논리적 날짜로 계산 (dayStartHour 기준)
  const logicalToday = getLogicalDate();
  const todayDate = new Date(logicalToday + 'T12:00:00'); // 정오 기준으로 Date 생성
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterdayDate);
  const yesterdayDay = yesterdayDate.getDay();
  const wasWeekday = yesterdayDay !== 0 && yesterdayDay !== 6;

  // daily + weekdays(어제가 평일인 경우만) 태스크 필터링
  const repeatTasks = appState.tasks.filter(t => {
    if (t.repeatType === 'daily') return true;
    if (t.repeatType === 'weekdays' && wasWeekday) return true;
    return false;
  });

  if (repeatTasks.length === 0) return; // 반복 태스크 없으면 무시

  // 어제 모든 반복 태스크가 완료되었는지 확인
  // (lastCompletedAt 또는 completedAt의 논리적 날짜가 어제인지)
  const allCompleted = repeatTasks.every(t => {
    const completedDateRaw = t.lastCompletedAt || t.completedAt;
    if (!completedDateRaw) return false;
    return getLogicalDate(new Date(completedDateRaw)) === yesterdayStr;
  });

  if (!allCompleted) {
    // 어제 반복 태스크를 전부 완료하지 못함 → 스트릭 리셋
    appState.streak.current = 0;
    if (!appState.user) {
      localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
    }
    console.log('[daily-reset] 어제 미완료 반복 태스크 있음 → 스트릭 리셋');
  }
}
