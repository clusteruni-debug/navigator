/**
 * 라이프 리듬 통계 모듈
 * rhythm.js에서 분리 — 7일/30일 통계 계산 및 렌더링
 *
 * 의존성 (메인 HTML / 다른 모듈에서 제공):
 *   appState, renderStatic, escapeHtml, getLocalDateStr,
 *   getMedicationSlots (rhythm-medication.js)
 *
 * rhythm.js에서 제공:
 *   _rhythmStatsVisible (모듈 변수)
 */

// ============================================
// 라이프 리듬 통계
// ============================================

/**
 * 라이프 리듬 통계 계산 (최근 7일)
 */
function getLifeRhythmStats() {
  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const sleepData = [];
  const homeDepartTimes = [];
  const workArriveTimes = [];
  const workDepartTimes = [];
  const homeArriveTimes = [];
  const workHours = [];
  const commuteToWorkTimes = [];
  const commuteToHomeTimes = [];
  const totalOutTimes = [];
  const wakeUpTimes = [];
  const bedtimes = [];

  // 시간을 분으로 변환하는 헬퍼
  const toMins = function(t) { if (!t || typeof t !== 'string') return null; const p = t.split(':'); if (p.length !== 2) return null; const h = parseInt(p[0], 10), m = parseInt(p[1], 10); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };

  // 최근 7일 데이터 수집
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateStr(date);

    let dayData;
    if (appState.lifeRhythm.today.date === dateStr) {
      dayData = appState.lifeRhythm.today;
    } else {
      dayData = appState.lifeRhythm.history[dateStr] || {};
    }

    // 기존 데이터 마이그레이션 (workStart -> workArrive, workEnd -> workDepart)
    if (dayData.workStart && !dayData.workArrive) dayData.workArrive = dayData.workStart;
    if (dayData.workEnd && !dayData.workDepart) dayData.workDepart = dayData.workEnd;

    // 수면 시간 계산 (전날 취침 ~ 당일 기상)
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = getLocalDateStr(prevDate);
    const prevData = appState.lifeRhythm.history[prevDateStr] || {};
    let sleepHours = null;

    if (prevData.sleep && dayData.wakeUp) {
      const sleepTime = toMins(prevData.sleep);
      const wakeTime = toMins(dayData.wakeUp);
      let duration = wakeTime + (24 * 60 - sleepTime);
      if (sleepTime < 12 * 60) duration = wakeTime - sleepTime;
      if (duration > 0 && duration < 16 * 60) {
        sleepHours = duration / 60;
      }
    }

    sleepData.push({
      date: dateStr,
      dayLabel: dayNames[date.getDay()],
      hours: sleepHours,
      isToday: i === 0
    });

    // 시간 수집
    if (dayData.homeDepart) homeDepartTimes.push(toMins(dayData.homeDepart));
    if (dayData.workArrive) workArriveTimes.push(toMins(dayData.workArrive));
    if (dayData.workDepart) workDepartTimes.push(toMins(dayData.workDepart));
    if (dayData.homeArrive) homeArriveTimes.push(toMins(dayData.homeArrive));
    if (dayData.wakeUp) wakeUpTimes.push(toMins(dayData.wakeUp));
    // 취침: 자정 넘김 처리 (00:00~05:00은 +24시간)
    if (dayData.sleep) {
      let sleepMins = toMins(dayData.sleep);
      if (sleepMins < 5 * 60) sleepMins += 24 * 60;
      bedtimes.push(sleepMins);
    }

    // 근무 시간 계산
    if (dayData.workArrive && dayData.workDepart) {
      const dur = toMins(dayData.workDepart) - toMins(dayData.workArrive);
      if (dur > 0) workHours.push(dur / 60);
    }

    // 출근 통근 시간
    if (dayData.homeDepart && dayData.workArrive) {
      const dur = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
      if (dur > 0 && dur < 180) commuteToWorkTimes.push(dur);
    }

    // 퇴근 통근 시간
    if (dayData.workDepart && dayData.homeArrive) {
      const dur = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
      if (dur > 0 && dur < 180) commuteToHomeTimes.push(dur);
    }

    // 총 외출 시간
    if (dayData.homeDepart && dayData.homeArrive) {
      const dur = toMins(dayData.homeArrive) - toMins(dayData.homeDepart);
      if (dur > 0) totalOutTimes.push(dur / 60);
    }
  }

  // 평균 계산 헬퍼
  const calcAvg = function(arr) { return arr.length > 0 ? arr.reduce(function(a, b) { return a + b; }, 0) / arr.length : null; };

  const validSleepData = sleepData.filter(function(d) { return d.hours !== null; });
  const avgSleep = calcAvg(validSleepData.map(function(d) { return d.hours; })) || 0;

  const avgHomeDepart = calcAvg(homeDepartTimes);
  const avgWorkArrive = calcAvg(workArriveTimes);
  const avgWorkDepart = calcAvg(workDepartTimes);
  const avgHomeArrive = calcAvg(homeArriveTimes);
  const avgWorkHrs = calcAvg(workHours);
  const avgCommuteToWork = calcAvg(commuteToWorkTimes);
  const avgCommuteToHome = calcAvg(commuteToHomeTimes);
  const avgTotalOut = calcAvg(totalOutTimes);

  // 집출발 시간 편차 계산
  let homeDepartDeviation = null;
  if (homeDepartTimes.length >= 2) {
    const mean = calcAvg(homeDepartTimes);
    const variance = homeDepartTimes.reduce(function(sum, t) { return sum + Math.pow(t - mean, 2); }, 0) / homeDepartTimes.length;
    homeDepartDeviation = Math.round(Math.sqrt(variance));
  }

  // 기상/취침 평균 및 목표 대비 계산
  const avgWakeUpMins = calcAvg(wakeUpTimes);
  const avgBedtimeMins = calcAvg(bedtimes);

  const targetWakeMins = (function() {
    const t = appState.settings.targetWakeTime || '07:00';
    const parts = t.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  })();
  const targetBedMins = (function() {
    const t = appState.settings.targetBedtime || '23:00';
    const parts = t.split(':').map(Number);
    // 자정 넘김 기준 통일 (목표가 00:00~05:00이면 +24시간)
    return (parts[0] < 5) ? parts[0] * 60 + parts[1] + 24 * 60 : parts[0] * 60 + parts[1];
  })();

  // 목표 대비 차이 (양수 = 늦음, 음수 = 일찍)
  const wakeTimeDiff = avgWakeUpMins !== null ? Math.round(avgWakeUpMins - targetWakeMins) : null;
  const bedtimeDiff = avgBedtimeMins !== null ? Math.round(avgBedtimeMins - targetBedMins) : null;

  // 인사이트 생성
  const insights = [];

  // 수면 vs 완료율 상관관계
  const completionByDay = {};
  appState.tasks.forEach(function(task) {
    if (task.completed && task.completedAt) {
      const completedDate = task.completedAt.split('T')[0];
      completionByDay[completedDate] = (completionByDay[completedDate] || 0) + 1;
    }
  });

  const goodSleepDays = sleepData.filter(function(d) { return d.hours && d.hours >= 7; });
  const badSleepDays = sleepData.filter(function(d) { return d.hours && d.hours < 6; });

  if (goodSleepDays.length >= 2 && badSleepDays.length >= 1) {
    const goodSleepCompletion = goodSleepDays.reduce(function(sum, d) { return sum + (completionByDay[d.date] || 0); }, 0) / goodSleepDays.length;
    const badSleepCompletion = badSleepDays.reduce(function(sum, d) { return sum + (completionByDay[d.date] || 0); }, 0) / badSleepDays.length;

    if (goodSleepCompletion > badSleepCompletion * 1.2) {
      const diff = Math.round((goodSleepCompletion / Math.max(badSleepCompletion, 0.1) - 1) * 100);
      insights.push({
        type: 'positive',
        icon: '\u{1F4C8}',
        text: '7시간 이상 수면한 날, 작업 완료가 ' + diff + '% 더 많았어요'
      });
    }
  }

  if (avgSleep > 0 && avgSleep < 6) {
    insights.push({
      type: 'warning',
      icon: '\u26A0\uFE0F',
      text: '평균 수면이 6시간 미만이에요. 충분한 수면이 생산성에 도움됩니다'
    });
  }

  if (homeDepartDeviation !== null && homeDepartDeviation <= 15) {
    insights.push({
      type: 'positive',
      icon: '\u2728',
      text: '출발 시간이 일정해요! 규칙적인 루틴이 유지되고 있습니다'
    });
  }

  // 통근시간 인사이트
  if (avgCommuteToWork && avgCommuteToHome) {
    const totalCommute = avgCommuteToWork + avgCommuteToHome;
    if (totalCommute > 120) {
      insights.push({
        type: 'info',
        icon: '\u{1F68C}',
        text: '하루 평균 통근 ' + Math.round(totalCommute) + '분. 이동 중 팟캐스트나 독서를 해보세요'
      });
    }
  }

  // 시간 포맷팅 헬퍼
  const formatTime = function(mins) {
    if (mins === null) return null;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  };

  const formatDur = function(mins) {
    if (mins === null) return null;
    return Math.round(mins) + '분';
  };

  return {
    hasData: validSleepData.length > 0 || homeDepartTimes.length > 0,
    sleepData: sleepData,
    avgSleep: avgSleep,
    avgHomeDepart: formatTime(avgHomeDepart),
    avgWorkArrive: formatTime(avgWorkArrive),
    avgWorkDepart: formatTime(avgWorkDepart),
    avgHomeArrive: formatTime(avgHomeArrive),
    avgWorkHours: avgWorkHrs,
    avgCommuteToWork: formatDur(avgCommuteToWork),
    avgCommuteToHome: formatDur(avgCommuteToHome),
    avgTotalOut: avgTotalOut ? avgTotalOut.toFixed(1) + '시간' : null,
    homeDepartDeviation: homeDepartDeviation,
    avgWakeUp: formatTime(avgWakeUpMins),
    avgBedtime: formatTime(avgBedtimeMins !== null && avgBedtimeMins >= 24 * 60 ? avgBedtimeMins - 24 * 60 : avgBedtimeMins),
    wakeTimeDiff: wakeTimeDiff,
    bedtimeDiff: bedtimeDiff,
    targetSleepHours: (function() {
      // 설정 기반 목표 수면 시간 (기상 - 취침, 자정 넘김 처리)
      const dur = targetWakeMins - targetBedMins;
      return (dur <= 0 ? dur + 24 * 60 : dur) / 60;
    })(),
    insights: insights
  };
}

/**
 * 라이프 리듬 30일 통계 계산
 */
function calculateRhythmStats(days) {
  if (days === undefined) days = 30;
  const toMins = function(t) { if (!t || typeof t !== 'string') return null; const p = t.split(':'); if (p.length !== 2) return null; const h = parseInt(p[0], 10), m = parseInt(p[1], 10); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };
  const today = new Date();
  const history = appState.lifeRhythm.history || {};
  const todayStr = getLogicalDate();
  const medSlots = getMedicationSlots();

  // 데이터 수집
  const data = { wakeUp: [], sleep: [], homeDepart: [], workArrive: [], workDepart: [], homeArrive: [], commuteToWork: [], commuteToHome: [], sleepDuration: [], workDuration: [] };
  const weekday = { wakeUp: [], sleep: [], commuteToWork: [], commuteToHome: [] };
  const weekend = { wakeUp: [], sleep: [] };
  const medStats = {}; // slotId -> { total, taken, required }
  medSlots.forEach(function(s) { medStats[s.id] = { total: 0, taken: 0, required: s.required, label: s.label, icon: s.icon }; });

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateStr(date);
    const dayOfWeek = date.getDay(); // 0=일, 6=토
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let dayData;
    if (appState.lifeRhythm.today.date === dateStr) {
      dayData = appState.lifeRhythm.today;
    } else {
      dayData = history[dateStr];
    }
    if (!dayData) continue;

    // 시간 데이터 수집
    if (dayData.wakeUp) {
      const m = toMins(dayData.wakeUp);
      data.wakeUp.push(m);
      if (isWeekend) weekend.wakeUp.push(m); else weekday.wakeUp.push(m);
    }
    if (dayData.sleep) {
      let sm = toMins(dayData.sleep);
      // 자정 넘긴 취침 보정 (00:00~05:00 -> +24h)
      if (sm < 5 * 60) sm += 24 * 60;
      data.sleep.push(sm);
      if (isWeekend) weekend.sleep.push(sm); else weekday.sleep.push(sm);
    }
    if (dayData.homeDepart) data.homeDepart.push(toMins(dayData.homeDepart));
    if (dayData.workArrive) data.workArrive.push(toMins(dayData.workArrive));
    if (dayData.workDepart) data.workDepart.push(toMins(dayData.workDepart));
    if (dayData.homeArrive) data.homeArrive.push(toMins(dayData.homeArrive));

    // 통근 시간
    if (dayData.homeDepart && dayData.workArrive) {
      const dur = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
      if (dur > 0 && dur < 180) {
        data.commuteToWork.push(dur);
        if (!isWeekend) weekday.commuteToWork.push(dur);
      }
    }
    if (dayData.workDepart && dayData.homeArrive) {
      const dur = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
      if (dur > 0 && dur < 180) {
        data.commuteToHome.push(dur);
        if (!isWeekend) weekday.commuteToHome.push(dur);
      }
    }

    // 수면 시간 (전날 취침 ~ 오늘 기상)
    if (i < days - 1 && dayData.wakeUp) {
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevStr = getLocalDateStr(prevDate);
      const prevData = history[prevStr] || {};
      if (prevData.sleep) {
        const sleepTime = toMins(prevData.sleep);
        const wakeTime = toMins(dayData.wakeUp);
        let duration = wakeTime + (24 * 60 - sleepTime);
        if (sleepTime < 12 * 60) duration = wakeTime - sleepTime;
        if (duration > 0 && duration < 16 * 60) {
          data.sleepDuration.push(duration);
        }
      }
    }

    // 근무 시간
    if (dayData.workArrive && dayData.workDepart) {
      const dur = toMins(dayData.workDepart) - toMins(dayData.workArrive);
      if (dur > 0) data.workDuration.push(dur);
    }

    // 복약 통계
    const meds = dayData.medications || {};
    medSlots.forEach(function(s) {
      medStats[s.id].total++;
      if (meds[s.id]) medStats[s.id].taken++;
    });
  }

  // 평균 계산 헬퍼
  const avg = function(arr) { return arr.length ? Math.round(arr.reduce(function(a, b) { return a + b; }, 0) / arr.length) : null; };
  const minsToTime = function(m) {
    if (m === null || m === undefined || isNaN(m)) return '--:--';
    const adjusted = Math.round(m) % (24 * 60);
    return String(Math.floor(adjusted / 60)).padStart(2, '0') + ':' + String(adjusted % 60).padStart(2, '0');
  };
  const minsToHM = function(m) {
    if (m === null || m === undefined || isNaN(m)) return '--';
    const rounded = Math.round(m);
    const h = Math.floor(rounded / 60);
    const min = rounded % 60;
    return h > 0 ? h + 'h ' + min + 'm' : min + '분';
  };

  return {
    days: days,
    dataPoints: Math.max(data.wakeUp.length, data.sleep.length, 1),
    avgWakeUp: minsToTime(avg(data.wakeUp)),
    avgSleep: minsToTime(avg(data.sleep)),
    avgHomeDepart: minsToTime(avg(data.homeDepart)),
    avgWorkArrive: minsToTime(avg(data.workArrive)),
    avgWorkDepart: minsToTime(avg(data.workDepart)),
    avgHomeArrive: minsToTime(avg(data.homeArrive)),
    avgCommuteToWork: minsToHM(avg(data.commuteToWork)),
    avgCommuteToHome: minsToHM(avg(data.commuteToHome)),
    avgSleepDuration: minsToHM(avg(data.sleepDuration)),
    avgWorkDuration: minsToHM(avg(data.workDuration)),
    commuteToWorkCount: data.commuteToWork.length,
    commuteToHomeCount: data.commuteToHome.length,
    // 주중 vs 주말
    weekdayWakeUp: minsToTime(avg(weekday.wakeUp)),
    weekendWakeUp: minsToTime(avg(weekend.wakeUp)),
    weekdaySleep: minsToTime(avg(weekday.sleep)),
    weekendSleep: minsToTime(avg(weekend.sleep)),
    weekdayCommuteToWork: minsToHM(avg(weekday.commuteToWork)),
    weekdayCommuteToHome: minsToHM(avg(weekday.commuteToHome)),
    // 복약
    medStats: medStats
  };
}

/**
 * 라이프 리듬 통계 토글
 */
function toggleRhythmStats() {
  _rhythmStatsVisible = !_rhythmStatsVisible;
  renderStatic();
}
window.toggleRhythmStats = toggleRhythmStats;

/**
 * 라이프 리듬 통계 섹션 렌더링 — 카드형 그리드
 */
function renderRhythmStats() {
  if (!_rhythmStatsVisible) return '';

  const stats = calculateRhythmStats(30);

  // 카드 생성 헬퍼
  const makeCard = function(icon, label, value, sub1, sub2) {
    let subHtml = '';
    if (sub1 || sub2) {
      subHtml = '<div class="rhythm-stat-sub">';
      if (sub1) subHtml += '<span class="rhythm-stat-sub-item">주중 ' + sub1 + '</span>';
      if (sub2) subHtml += '<span class="rhythm-stat-sub-item">주말 ' + sub2 + '</span>';
      subHtml += '</div>';
    }
    return '<div class="rhythm-stat-card">' +
      '<div class="rhythm-stat-icon">' + icon + '</div>' +
      '<div class="rhythm-stat-label">' + label + '</div>' +
      '<div class="rhythm-stat-value">' + value + '</div>' +
      subHtml +
    '</div>';
  };

  // 핵심 3개 카드 (기상/취침/수면)
  const topCards = makeCard('☀️', '기상', stats.avgWakeUp, stats.weekdayWakeUp, stats.weekendWakeUp) +
    makeCard('🌙', '취침', stats.avgSleep, stats.weekdaySleep, stats.weekendSleep) +
    makeCard('💤', '수면', stats.avgSleepDuration, null, null);

  // 하단 3개 카드 (근무/출근통근/퇴근통근)
  const bottomCards = makeCard('💼', '근무', stats.avgWorkDuration, null, null) +
    makeCard('🚌', '출근', stats.avgCommuteToWork, stats.weekdayCommuteToWork, null) +
    makeCard('🏠', '퇴근', stats.avgCommuteToHome, null, null);

  // 복약 준수율 카드
  let medCard = '';
  const medEntries = Object.values(stats.medStats);
  if (medEntries.length > 0) {
    const medItems = medEntries.map(function(s) {
      const rate = s.total > 0 ? Math.round((s.taken / s.total) * 100) : 0;
      const color = rate >= 80 ? 'var(--accent-success)' : rate >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';
      return '<span class="rhythm-med-stat-item" style="color: ' + color + ';">' + s.icon + ' ' + escapeHtml(s.label) + ': ' + rate + '%</span>';
    }).join(' · ');
    medCard = '<div class="rhythm-stat-card rhythm-stat-card-wide">' +
      '<div class="rhythm-stat-icon">💊</div>' +
      '<div class="rhythm-stat-label">복약 준수율</div>' +
      '<div class="rhythm-stat-med-items">' + medItems + '</div>' +
    '</div>';
  }

  return '<div class="rhythm-stats-container">' +
    '<div class="rhythm-stats-header">📊 30일 통계 <span class="rhythm-stats-meta">(' + stats.dataPoints + '일 데이터)</span></div>' +
    '<div class="rhythm-stat-grid">' + topCards + '</div>' +
    '<div class="rhythm-stat-grid">' + bottomCards + '</div>' +
    (medCard ? '<div class="rhythm-stat-grid-wide">' + medCard + '</div>' : '') +
  '</div>';
}
