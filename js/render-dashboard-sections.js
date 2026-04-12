// ============================================
// 대시보드 섹션 렌더링 헬퍼
// (render-dashboard.js에서 분리)
// ============================================

/**
 * 수익 대시보드 섹션 HTML 반환
 */
function _renderDashRevenue(revenueStats) {
  if (revenueStats.totalRevenue === 0) return '';

  const formatRevenue = (amount) => {
    if (amount >= 10000) return Math.round(amount / 10000) + '만';
    if (amount >= 1000) return Math.round(amount / 1000) + '천';
    return amount.toLocaleString();
  };

  return `
    <div class="dashboard-section revenue-dashboard">
      <div class="dashboard-header">
        <div class="dashboard-title">💰 수익 대시보드</div>
        <button class="btn-export-asset" onclick="exportToAssetManager()" title="자산관리로 내보내기">
          📤 자산관리
        </button>
      </div>
      <div class="revenue-summary">
        <div class="revenue-card total">
          <div class="revenue-card-label">총 수익</div>
          <div class="revenue-card-value">${revenueStats.totalRevenue.toLocaleString()}원</div>
          <div class="revenue-card-sub">${revenueStats.taskCount}개 완료</div>
        </div>
        <div class="revenue-card month">
          <div class="revenue-card-label">이번 달</div>
          <div class="revenue-card-value">${revenueStats.thisMonthRevenue.toLocaleString()}원</div>
        </div>
      </div>

      <div class="revenue-chart-section">
        <div class="revenue-chart-title">📊 월별 수익 추이</div>
        <div class="revenue-bar-chart">
          ${revenueStats.monthlyData.map(m => `
            <div class="revenue-bar-item">
              <div class="revenue-bar-wrapper">
                <div class="revenue-bar" style="height: ${Math.max((m.revenue / revenueStats.maxMonthlyRevenue) * 100, 5)}%">
                  ${m.revenue > 0 ? `<span class="revenue-bar-value">${formatRevenue(m.revenue)}</span>` : ''}
                </div>
              </div>
              <div class="revenue-bar-label">${m.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${revenueStats.categoryData.length > 0 ? `
        <div class="revenue-category-section">
          <div class="revenue-chart-title">📂 카테고리별 수익</div>
          <div class="revenue-category-list">
            ${revenueStats.categoryData.map(c => `
              <div class="revenue-category-item">
                <div class="revenue-category-header">
                  <span class="category ${c.category}">${c.category}</span>
                  <span class="revenue-category-amount">${c.revenue.toLocaleString()}원</span>
                </div>
                <div class="revenue-category-bar">
                  <div class="revenue-category-bar-fill ${c.category}" style="width: ${c.percentage}%"></div>
                </div>
                <div class="revenue-category-percent">${c.percentage}%</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * 라이프 리듬 통계 섹션 HTML 반환
 */
function _renderDashLifeRhythm() {
  const rhythmStats = getLifeRhythmStats();
  if (!rhythmStats.hasData) return '';

  return `
    <div class="dashboard-section life-rhythm-stats">
      <div class="dashboard-title">😴 라이프 리듬 (최근 7일)</div>

      <!-- 수면 패턴 차트 -->
      <div class="rhythm-chart-section">
        <div class="rhythm-chart-title">💤 수면 패턴</div>
        <div class="rhythm-bar-chart">
          ${rhythmStats.sleepData.map(d => `
            <div class="rhythm-bar-item">
              <div class="rhythm-bar-wrapper">
                <div class="rhythm-bar ${d.hours >= 7 ? 'good' : d.hours >= 6 ? 'ok' : 'bad'}"
                     style="height: ${d.hours ? Math.max((d.hours / 10) * 100, 10) : 0}%"
                     title="${d.date}: ${d.hours ? d.hours.toFixed(1) + '시간' : '기록없음'}">
                  ${d.hours ? '<span class="rhythm-bar-value">' + d.hours.toFixed(1) + 'h</span>' : ''}
                </div>
              </div>
              <div class="rhythm-bar-label ${d.isToday ? 'today' : ''}">${d.dayLabel}</div>
            </div>
          `).join('')}
        </div>
        <div class="rhythm-summary-row">
          <span>평균 수면: <strong>${rhythmStats.avgSleep.toFixed(1)}시간</strong></span>
          <span>목표 대비: <strong class="${rhythmStats.avgSleep >= rhythmStats.targetSleepHours ? 'good' : 'bad'}">${rhythmStats.avgSleep >= rhythmStats.targetSleepHours ? '+' : ''}${(rhythmStats.avgSleep - rhythmStats.targetSleepHours).toFixed(1)}시간</strong></span>
        </div>
        ${rhythmStats.avgWakeUp || rhythmStats.avgBedtime ? `
        <div class="rhythm-summary-row">
          ${rhythmStats.avgWakeUp ? `<span>평균 기상: <strong>${rhythmStats.avgWakeUp}</strong> ${rhythmStats.wakeTimeDiff !== null ? '<strong class="' + (Math.abs(rhythmStats.wakeTimeDiff) <= 15 ? 'good' : 'bad') + '">' + (rhythmStats.wakeTimeDiff > 0 ? '+' : '') + rhythmStats.wakeTimeDiff + '분</strong>' : ''}</span>` : ''}
          ${rhythmStats.avgBedtime ? `<span>평균 취침: <strong>${rhythmStats.avgBedtime}</strong> ${rhythmStats.bedtimeDiff !== null ? '<strong class="' + (Math.abs(rhythmStats.bedtimeDiff) <= 15 ? 'good' : 'bad') + '">' + (rhythmStats.bedtimeDiff > 0 ? '+' : '') + rhythmStats.bedtimeDiff + '분</strong>' : ''}</span>` : ''}
        </div>
        ` : ''}
      </div>

      <!-- 근무 패턴 -->
      <div class="rhythm-work-section">
        <div class="rhythm-chart-title">💼 근무 패턴</div>
        <div class="rhythm-work-stats">
          <div class="rhythm-work-stat">
            <span class="rhythm-work-label">평균 출근</span>
            <span class="rhythm-work-value">${rhythmStats.avgWorkArrive || '--:--'}</span>
          </div>
          <div class="rhythm-work-stat">
            <span class="rhythm-work-label">평균 퇴근</span>
            <span class="rhythm-work-value">${rhythmStats.avgWorkDepart || '--:--'}</span>
          </div>
          <div class="rhythm-work-stat">
            <span class="rhythm-work-label">평균 근무</span>
            <span class="rhythm-work-value">${rhythmStats.avgWorkHours ? rhythmStats.avgWorkHours.toFixed(1) + 'h' : '--'}</span>
          </div>
          <div class="rhythm-work-stat">
            <span class="rhythm-work-label">출근 편차</span>
            <span class="rhythm-work-value ${rhythmStats.homeDepartDeviation <= 30 ? 'good' : ''}">${rhythmStats.homeDepartDeviation ? '±' + rhythmStats.homeDepartDeviation + '분' : '--'}</span>
          </div>
        </div>
      </div>

      <!-- 인사이트 -->
      ${rhythmStats.insights.length > 0 ? `
        <div class="rhythm-insights">
          <div class="rhythm-chart-title">💡 인사이트</div>
          ${rhythmStats.insights.map(insight => `
            <div class="rhythm-insight-item ${insight.type}">
              <span class="rhythm-insight-icon">${insight.icon}</span>
              <span class="rhythm-insight-text">${insight.text}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- 복약 통계 (7일/30일) -->
      ${(() => {
        const medSlots = getMedicationSlots();
        if (!medSlots || medSlots.length === 0) return '';

        const today = new Date();
        // 7일 / 30일 통계 함수
        function calcMedStats(days) {
          let tReq = 0, takenReq = 0, tOpt = 0, takenOpt = 0;
          const todayStr = getLogicalDate();
          for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const ds = getLocalDateStr(d);
            let dayMeds;
            if (appState.lifeRhythm.today.date === ds) {
              dayMeds = appState.lifeRhythm.today.medications || {};
            } else {
              const hist = appState.lifeRhythm.history[ds];
              dayMeds = hist ? (hist.medications || {}) : {};
            }
            // 복약 기록이 1개라도 있는 날 또는 오늘만 분모에 포함
            const hasMedActivity = Object.values(dayMeds).some(function(v) { return v; });
            if (!hasMedActivity && ds !== todayStr) continue;
            medSlots.forEach(s => {
              if (s.required) { tReq++; if (dayMeds[s.id]) takenReq++; }
              else { tOpt++; if (dayMeds[s.id]) takenOpt++; }
            });
          }
          return {
            reqRate: tReq > 0 ? Math.round((takenReq / tReq) * 100) : 0,
            optRate: tOpt > 0 ? Math.round((takenOpt / tOpt) * 100) : 0
          };
        }

        const w7 = calcMedStats(7);
        const w30 = calcMedStats(30);
        const streak = getMedicationStreak();

        return `
          <div class="rhythm-work-section" style="margin-top: 16px;">
            <div class="rhythm-chart-title">💊 복약 통계</div>
            <div class="rhythm-work-stats">
              <div class="rhythm-work-stat">
                <span class="rhythm-work-label">필수 7일</span>
                <span class="rhythm-work-value ${w7.reqRate >= 80 ? 'good' : ''}">${w7.reqRate}%</span>
              </div>
              <div class="rhythm-work-stat">
                <span class="rhythm-work-label">필수 30일</span>
                <span class="rhythm-work-value ${w30.reqRate >= 80 ? 'good' : ''}">${w30.reqRate}%</span>
              </div>
              <div class="rhythm-work-stat">
                <span class="rhythm-work-label">선택 7일</span>
                <span class="rhythm-work-value">${w7.optRate}%</span>
              </div>
              <div class="rhythm-work-stat">
                <span class="rhythm-work-label">연속일</span>
                <span class="rhythm-work-value ${streak >= 7 ? 'good' : ''}">${streak}일</span>
              </div>
            </div>
          </div>
        `;
      })()}
    </div>
  `;
}

/**
 * 생산성 인사이트 섹션 HTML 반환
 */
function _renderDashProductivityInsights() {
  const hourlyProd = getHourlyProductivity();
  const catDist = getCategoryDistribution();
  const dayProd = getDayOfWeekProductivity();

  if (hourlyProd.totalCompleted < 3) return '';

  // 시간대별 바 차트 데이터 (주요 시간대만)
  const timeSlots = [
    { label: '아침', count: hourlyProd.periods.morning.count },
    { label: '점심', count: hourlyProd.periods.lunch.count },
    { label: '오후', count: hourlyProd.periods.afternoon.count },
    { label: '저녁', count: hourlyProd.periods.evening.count },
    { label: '밤', count: hourlyProd.periods.night.count }
  ];
  const maxSlot = Math.max(...timeSlots.map(s => s.count), 1);

  // 파이 차트 그라디언트 계산
  const colors = {
    '본업': 'var(--cat-본업)',
    '부업': 'var(--cat-부업)',
    '일상': 'var(--cat-일상)',
    '가족': 'var(--cat-가족)',
    '기타': 'var(--text-muted)'
  };
  let gradientParts = [];
  let currentDeg = 0;
  catDist.distribution.forEach(item => {
    const deg = (item.percentage / 100) * 360;
    const color = colors[item.category] || 'var(--text-muted)';
    gradientParts.push(color + ' ' + currentDeg + 'deg ' + (currentDeg + deg) + 'deg');
    currentDeg += deg;
  });
  const pieGradient = gradientParts.length > 0
    ? 'conic-gradient(' + gradientParts.join(', ') + ')'
    : 'var(--bg-secondary)';

  // 시간대 바 HTML 생성
  const timeBarsHtml = timeSlots.map(slot =>
    '<div class="insight-bar ' + (slot.count === maxSlot ? 'peak' : '') + '" ' +
    'style="height: ' + Math.max((slot.count / maxSlot) * 100, 8) + '%" ' +
    'title="' + slot.label + ': ' + slot.count + '개"></div>'
  ).join('');

  const timeLabelsHtml = timeSlots.map(slot =>
    '<div class="insight-bar-label">' + slot.label + '</div>'
  ).join('');

  // 요일 바 HTML 생성
  const maxD = Math.max(...dayProd.data.map(x => x.count), 1);
  const dayBarsHtml = dayProd.data.map(d =>
    '<div class="insight-bar ' + (d.count === maxD && d.count > 0 ? 'peak' : '') + '" ' +
    'style="height: ' + Math.max((d.count / maxD) * 100, 8) + '%" ' +
    'title="' + d.name + ': ' + d.count + '개"></div>'
  ).join('');

  const dayLabelsHtml = dayProd.data.map(d =>
    '<div class="insight-bar-label">' + d.name + '</div>'
  ).join('');

  // 카테고리 레전드 HTML 생성
  const legendHtml = catDist.distribution.map(item =>
    '<div class="pie-legend-item">' +
    '<div class="pie-legend-color ' + item.category + '"></div>' +
    '<span>' + item.category + '</span>' +
    '<span class="pie-legend-value">' + item.count + '개 (' + item.percentage + '%)</span>' +
    '</div>'
  ).join('');

  return '<div class="dashboard-section insights-section">' +
    '<div class="insights-title">🔍 나의 생산성 패턴</div>' +

    '<div class="insight-card">' +
    '<div class="insight-header">' +
    '<span class="insight-label">가장 생산적인 시간대</span>' +
    '<span class="insight-value">' + hourlyProd.bestPeriod.name + '</span>' +
    '</div>' +
    '<div class="insight-bar-container">' + timeBarsHtml + '</div>' +
    '<div class="insight-bar-labels">' + timeLabelsHtml + '</div>' +
    '</div>' +

    '<div class="insight-card">' +
    '<div class="insight-header">' +
    '<span class="insight-label">가장 활발한 요일</span>' +
    '<span class="insight-value">' + dayProd.bestDay + '요일 (' + dayProd.bestDayCount + '개)</span>' +
    '</div>' +
    '<div class="insight-bar-container">' + dayBarsHtml + '</div>' +
    '<div class="insight-bar-labels">' + dayLabelsHtml + '</div>' +
    '</div>' +

    (catDist.total > 0 ?
      '<div class="insight-card">' +
      '<div class="insight-header">' +
      '<span class="insight-label">카테고리 분배</span>' +
      '<span class="insight-value">총 ' + catDist.total + '개 완료</span>' +
      '</div>' +
      '<div class="pie-chart-container">' +
      '<div class="pie-chart" style="background: ' + pieGradient + '"></div>' +
      '<div class="pie-legend">' + legendHtml + '</div>' +
      '</div>' +
      '</div>'
    : '') +

    '</div>';
}

/**
 * 주간/월간 리포트 섹션 HTML 반환
 */
function _renderDashWeeklyMonthly() {
  // 주간/월간/90일 리포트 (completionLog 기반)
  const today = new Date();
  const todayStr = getLocalDateStr(today);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = getLocalDateStr(weekAgo);
  const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = getLocalDateStr(monthAgo);
  const q90Ago = new Date(today); q90Ago.setDate(q90Ago.getDate() - 90);
  const q90AgoStr = getLocalDateStr(q90Ago);
  const tomorrowStr = getLocalDateStr(new Date(today.getTime() + 86400000));

  const weekEntries = getCompletionLogEntries(weekAgoStr, tomorrowStr);
  const monthEntries = getCompletionLogEntries(monthAgoStr, tomorrowStr);
  const q90Entries = getCompletionLogEntries(q90AgoStr, tomorrowStr);

  const weekRevenue = weekEntries.reduce((sum, e) => sum + (e.rv || 0), 0);
  const monthRevenue = monthEntries.reduce((sum, e) => sum + (e.rv || 0), 0);

  // 카테고리별 분포
  const weekCats = {};
  weekEntries.forEach(e => { weekCats[e.c || '기타'] = (weekCats[e.c || '기타'] || 0) + 1; });

  const formatKRW = (n) => n >= 10000 ? Math.round(n/10000) + '만원' : n.toLocaleString() + '원';

  // 월별 트렌드 (최근 3개월)
  const monthlyTrend = [];
  for (let m = 2; m >= 0; m--) {
    const mStart = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const mEnd = new Date(today.getFullYear(), today.getMonth() - m + 1, 1);
    const mEntries = getCompletionLogEntries(getLocalDateStr(mStart), getLocalDateStr(mEnd));
    const mName = `${mStart.getMonth() + 1}월`;
    monthlyTrend.push({ name: mName, count: mEntries.length, revenue: mEntries.reduce((s, e) => s + (e.rv || 0), 0) });
  }
  const maxMonthCount = Math.max(...monthlyTrend.map(m => m.count), 1);

  return `
    <div class="dashboard-section">
      <div class="dashboard-title">📋 주간/월간 리포트</div>
      <div class="stats" style="margin-bottom: 12px;">
        <div class="stat-card">
          <div class="stat-value" style="color: var(--accent-primary)">${weekEntries.length}</div>
          <div class="stat-label">주간 완료</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--accent-success)">${monthEntries.length}</div>
          <div class="stat-label">월간 완료</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--cat-부업)">${weekRevenue > 0 ? formatKRW(weekRevenue) : '-'}</div>
          <div class="stat-label">주간 수익</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--accent-danger)">${monthRevenue > 0 ? formatKRW(monthRevenue) : '-'}</div>
          <div class="stat-label">월간 수익</div>
        </div>
      </div>
      ${Object.keys(weekCats).length > 0 ? `
        <div style="font-size: 15px; color: var(--text-secondary); margin-top: 8px;">
          <strong>주간 카테고리:</strong>
          ${Object.entries(weekCats).map(([cat, cnt]) => `<span class="category ${cat}" style="margin-left:6px;">${cat} ${cnt}건</span>`).join('')}
        </div>
      ` : ''}
      <div style="font-size: 14px; color: var(--text-muted); margin-top: 6px;">
        일평균: ${(weekEntries.length / 7).toFixed(1)}건/일 (주간) · ${(monthEntries.length / 30).toFixed(1)}건/일 (월간)${q90Entries.length > 0 ? ` · ${(q90Entries.length / 90).toFixed(1)}건/일 (90일)` : ''}
      </div>

      <!-- 월별 트렌드 바 차트 -->
      <div style="margin-top: 12px;">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">📊 월별 완료 트렌드</div>
        ${monthlyTrend.map(m => `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="width: 30px; font-size: 14px; color: var(--text-secondary);">${m.name}</span>
            <div style="flex: 1; height: 16px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
              <div style="width: ${Math.round((m.count / maxMonthCount) * 100)}%; height: 100%; background: var(--accent-primary); border-radius: 4px; transition: width 0.3s;"></div>
            </div>
            <span style="width: 50px; font-size: 14px; text-align: right; color: var(--text-secondary);">${m.count}건</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
