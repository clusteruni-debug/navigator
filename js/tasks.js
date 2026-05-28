// ============================================
// 우선순위 계산 로직
// ============================================

/**
 * 작업의 우선순위 점수 계산
 * 점수가 높을수록 우선순위 높음
 */
function calculatePriority(task) {
  let score = 0;
  const now = new Date();
  const hasDeadline = !!task.deadline;

  // 1. 마감시간 기반 점수 (가장 중요)
  if (hasDeadline) {
    const deadline = new Date(task.deadline);
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);

    if (hoursLeft < 0) score -= 100;      // 이미 지남: 패널티
    else if (hoursLeft < 3) score += 100; // 3시간 내: 최우선
    else if (hoursLeft < 24) score += 70; // 하루 내: 높은 우선순위
    else if (hoursLeft < 72) score += 40; // 3일 내: 중간 우선순위
    else score += 20;                     // 마감 있지만 여유 있음
  }

  // 2. 카테고리 기본 점수 (마감 유무에 따라 차등)
  if (task.category === '본업') {
    score += hasDeadline ? 40 : 15;  // 마감 없으면 하단으로
  } else if (task.category === '부업') {
    score += hasDeadline ? 35 : 12;
  } else if (task.category === '일상') {
    score += hasDeadline ? 25 : 10;
  } else if (task.category === '가족') {
    score += hasDeadline ? 25 : 10;
  }

  // 3. 부업의 경우 ROI 계산 (수익/시간)
  if (task.category === '부업' && task.expectedRevenue) {
    const roi = task.expectedRevenue / task.estimatedTime;
    score += Math.min(roi * 0.1, 30); // 최대 30점까지
  }

  // 4. 짧은 작업 우대 (빠른 성취감)
  if (task.estimatedTime <= 10) score += 10;

  return score;
}

/**
 * 작업의 긴급도 레벨 반환
 */
function getUrgencyLevel(task) {
  if (!task.deadline) return 'normal';

  const now = new Date();
  const deadline = new Date(task.deadline);
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return 'expired';   // 마감 지남
  if (hoursLeft < 3) return 'urgent';    // 긴급 (빨강)
  if (hoursLeft < 24) return 'warning';  // 주의 (주황)
  return 'normal';                       // 일반
}

// ============================================
// 모드 및 필터링
// ============================================

/**
 * 시간 문자열(HH:MM)을 시간(hour)으로 변환
 */
function parseTimeToHour(timeStr) {
  const [hour] = timeStr.split(':').map(Number);
  return hour;
}

/**
 * 현재 시간대 기반 모드 결정
 * 설정된 시간 기준으로 계산
 */
function getCurrentMode() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=일, 6=토
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const settings = appState.settings;

  const workStart = parseTimeToHour(settings.workStartTime);
  const workEnd = parseTimeToHour(settings.workEndTime);
  const bedtime = parseTimeToHour(settings.targetBedtime);
  const wakeTime = parseTimeToHour(settings.targetWakeTime);

  // 주말은 휴식 모드 (단, 취침 시간 가까우면 생존 모드)
  if (isWeekend) {
    if (!appState.shuttleSuccess && hour >= bedtime - 2 && hour < bedtime + 1) return '생존';
    return '주말';
  }

  // 회사 시간 (평일만)
  if (hour >= workStart && hour < workEnd) return '회사';

  // 셔틀 성공 시 여유 모드 (퇴근 후 ~ 취침)
  if (appState.shuttleSuccess && hour >= workEnd - 1 && hour < bedtime) return '여유';

  // 셔틀 실패 시 생존 모드 (취침 2시간 전부터)
  if (!appState.shuttleSuccess && hour >= bedtime - 2 && hour < bedtime + 1) return '생존';

  // 출근 전 시간 (기상 ~ 회사 시작)
  if (hour >= wakeTime && hour < workStart) return '출근';

  // 그 외는 휴식
  return '휴식';
}

/**
 * 모드별 시간 레이블 반환
 */
function getModeTimeLabel(mode, hour) {
  switch(mode) {
    case '회사': return '퇴근까지';
    case '여유': return '취침까지';
    case '생존': return '취침까지';
    case '출근': return '출근까지';
    case '주말': return '오늘 남은 시간';
    case '휴식': return '기상까지';
    default: return '남은 시간';
  }
}

/**
 * 모드별 남은 시간 계산 (설정 기반)
 */
function getModeTimeRemaining(mode, hour, now) {
  const settings = appState.settings;
  const workEnd = parseTimeToHour(settings.workEndTime);
  const bedtime = parseTimeToHour(settings.targetBedtime);
  const wakeTime = parseTimeToHour(settings.targetWakeTime);
  const workStart = parseTimeToHour(settings.workStartTime);

  var endHour;
  switch(mode) {
    case '회사': endHour = workEnd; break;
    case '여유': endHour = bedtime; break;
    case '생존': endHour = bedtime; break;
    case '출근': endHour = workStart; break;
    case '주말': endHour = bedtime; break;
    case '휴식': endHour = wakeTime; break;
    default: endHour = 24;
  }

  var hoursLeft, minutesLeft;

  // 휴식 모드: 기상 시간까지 계산
  if (mode === '휴식') {
    if (hour >= 0 && hour < wakeTime) {
      // 자정 이후 ~ 기상시간 전
      hoursLeft = wakeTime - hour - 1;
      minutesLeft = 60 - now.getMinutes();
      if (minutesLeft === 60) { minutesLeft = 0; hoursLeft++; }
    } else {
      // 자정 이전
      hoursLeft = (24 - hour) + wakeTime - 1;
      minutesLeft = 60 - now.getMinutes();
      if (minutesLeft === 60) { minutesLeft = 0; hoursLeft++; }
    }
  } else {
    hoursLeft = endHour - hour - 1;
    minutesLeft = 60 - now.getMinutes();
    if (minutesLeft === 60) { minutesLeft = 0; hoursLeft++; }
  }

  if (hoursLeft < 0) hoursLeft = 0;
  if (minutesLeft < 0) minutesLeft = 0;

  return `${hoursLeft}시간 ${minutesLeft}분`;
}

/**
 * 현재 모드에 맞게 작업 필터링 및 정렬
 */
function getFilteredTasks() {
  const mode = getCurrentMode();
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  var filtered = appState.tasks.filter(t => {
    // 완료된 작업 제외
    if (t.completed) return false;

    // 반복 작업 중 미래 마감일(내일 이후)인 작업 제외
    // 이렇게 해야 오늘 완료한 반복 작업의 "다음 회차"가 오늘 목록에 안 나옴
    if (t.deadline && t.repeatType && t.repeatType !== 'none') {
      var deadline = new Date(t.deadline);
      if (deadline > todayEnd) {
        return false; // 내일 이후 마감인 반복 작업은 숨김
      }
    }

    return true;
  });

  // 우선순위와 긴급도 계산
  filtered = filtered.map(t => ({
    ...t,
    priority: calculatePriority(t),
    urgency: getUrgencyLevel(t)
  }));

  // 우선순위 기준 정렬 (높은 순)
  filtered.sort((a, b) => b.priority - a.priority);

  // 모드별 필터링
  if (mode === '회사') {
    filtered = filtered.filter(t => t.category === '본업');
  } else if (mode === '생존') {
    // 생존 모드: 짧고 긴급한 것만
    filtered = filtered.filter(t => t.estimatedTime <= 15 || t.priority > 90);
  }

  // 검색 및 카테고리 필터 적용
  filtered = getSearchFilteredTasks(filtered);

  // 퀵 필터 적용
  if (appState.quickFilter) {
    switch (appState.quickFilter) {
      case '2min':
        filtered = filtered.filter(t => t.estimatedTime && t.estimatedTime <= 2);
        break;
      case '5min':
        filtered = filtered.filter(t => t.estimatedTime && t.estimatedTime <= 5);
        break;
      case 'urgent':
        filtered = filtered.filter(t => {
          if (!t.deadline) return false;
          var hoursLeft = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60);
          return hoursLeft <= 24 && hoursLeft > 0;
        });
        break;
    }
  }

  return filtered;
}

/**
 * 카테고리별 통계 계산
 */
function getCategoryStats() {
  const categories = ['본업', '부업', '일상'];
  return categories.map(cat => {
    const allTasks = appState.tasks.filter(t => t.category === cat);
    const completed = allTasks.filter(t => t.completed).length;
    const total = allTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      category: cat,
      total: total - completed,  // 남은 작업
      completed,
      percentage
    };
  });
}

/**
 * 긴급 작업 목록 반환
 */
function getUrgentTasks() {
  return appState.tasks
    .filter(t => !t.completed && t.deadline)
    .map(t => ({
      ...t,
      urgency: getUrgencyLevel(t)
    }))
    .filter(t => t.urgency === 'urgent' || t.urgency === 'warning')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}
