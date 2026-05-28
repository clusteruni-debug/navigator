// ============================================
// 데이터 인사이트 함수
// ============================================

/**
 * 시간대별 생산성 분석
 */
function getHourlyProductivity() {
  const hourlyData = {};
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = 0;
  }

  // completionLog 기반 시간대별 집계
  for (const entries of Object.values(appState.completionLog || {})) {
    (entries || []).forEach(e => {
      if (e._summary) return; // 압축된 데이터는 시간 정보 없음
      const hour = parseInt(e.at.split(':')[0], 10);
      if (hour >= 0 && hour < 24) hourlyData[hour]++;
    });
  }

  // 가장 생산적인 시간대 찾기
  let maxHour = 0;
  let maxCount = 0;
  for (let i = 0; i < 24; i++) {
    if (hourlyData[i] > maxCount) {
      maxCount = hourlyData[i];
      maxHour = i;
    }
  }

  // 시간대별 그룹화 (아침/점심/오후/저녁/밤)
  const periods = {
    morning: { name: '아침 (6-11시)', count: 0, hours: [6, 7, 8, 9, 10, 11] },
    lunch: { name: '점심 (11-14시)', count: 0, hours: [11, 12, 13, 14] },
    afternoon: { name: '오후 (14-18시)', count: 0, hours: [14, 15, 16, 17, 18] },
    evening: { name: '저녁 (18-22시)', count: 0, hours: [18, 19, 20, 21, 22] },
    night: { name: '밤 (22-6시)', count: 0, hours: [22, 23, 0, 1, 2, 3, 4, 5] }
  };

  for (let i = 0; i < 24; i++) {
    if (i >= 6 && i < 11) periods.morning.count += hourlyData[i];
    else if (i >= 11 && i < 14) periods.lunch.count += hourlyData[i];
    else if (i >= 14 && i < 18) periods.afternoon.count += hourlyData[i];
    else if (i >= 18 && i < 22) periods.evening.count += hourlyData[i];
    else periods.night.count += hourlyData[i];
  }

  // 가장 생산적인 시간대
  let bestPeriod = 'morning';
  let bestCount = 0;
  Object.keys(periods).forEach(key => {
    if (periods[key].count > bestCount) {
      bestCount = periods[key].count;
      bestPeriod = key;
    }
  });

  return {
    hourlyData,
    peakHour: maxHour,
    peakCount: maxCount,
    periods,
    bestPeriod: periods[bestPeriod],
    totalCompleted: Object.values(hourlyData).reduce((a, b) => a + b, 0)
  };
}

/**
 * 카테고리별 완료 분배
 */
function getCategoryDistribution() {
  const distribution = {};
  let total = 0;

  // completionLog 기반 카테고리 분포
  for (const entries of Object.values(appState.completionLog || {})) {
    (entries || []).forEach(e => {
      if (e._summary) {
        // 압축된 데이터 — 카테고리별 count 사용
        if (e.categories) {
          Object.entries(e.categories).forEach(([cat, cnt]) => {
            distribution[cat] = (distribution[cat] || 0) + cnt;
            total += cnt;
          });
        }
        return;
      }
      const cat = e.c || '기타';
      distribution[cat] = (distribution[cat] || 0) + 1;
      total++;
    });
  }
  const result = Object.keys(distribution).map(cat => ({
    category: cat,
    count: distribution[cat],
    percentage: total > 0 ? Math.round((distribution[cat] / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  return { distribution: result, total };
}

/**
 * 요일별 생산성 분석
 */
function getDayOfWeekProductivity() {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayData = [0, 0, 0, 0, 0, 0, 0];

  // completionLog 기반 요일별 집계
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    const day = new Date(dateKey + 'T12:00:00').getDay(); // UTC 시차 방지
    let count = 0;
    (entries || []).forEach(e => {
      count += (e._summary && e.count) ? e.count : 1;
    });
    dayData[day] += count;
  }

  const maxDay = dayData.indexOf(Math.max(...dayData));

  return {
    data: dayNames.map((name, i) => ({ name, count: dayData[i] })),
    bestDay: dayNames[maxDay],
    bestDayCount: dayData[maxDay]
  };
}
