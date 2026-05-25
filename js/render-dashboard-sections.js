// ============================================
// 대시보드 섹션 렌더링 헬퍼
// ============================================

const DASHBOARD_VIEWS = ['전체', '수익', '건강', '패턴'];
const DASHBOARD_CATEGORIES = ['본업', '부업', '자기계발', '일상', '가족', '이벤트'];
const DASHBOARD_PERIODS = [
  { key: 'morning', label: '아침' },
  { key: 'lunch', label: '점심' },
  { key: 'afternoon', label: '오후' },
  { key: 'evening', label: '저녁' },
  { key: 'night', label: '밤' }
];

function _num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback || 0);
}

function _clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function _safeTasks() {
  return Array.isArray(appState.tasks) ? appState.tasks : [];
}

function _safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function _safeText(value) {
  return escapeHtml(String(value || ''));
}

function _formatKRW(amount) {
  const value = Math.round(_num(amount));
  if (value >= 100000000) return (value / 100000000).toFixed(1).replace('.0', '') + '억원';
  if (value >= 10000) return Math.round(value / 10000).toLocaleString() + '만원';
  return value.toLocaleString() + '원';
}

function _formatOneDecimal(value, unit) {
  const n = _num(value);
  return n ? n.toFixed(1).replace('.0', '') + (unit || '') : '--';
}

function _timeToMinutes(timeStr, fallbackHour) {
  if (!timeStr || typeof timeStr !== 'string') return (fallbackHour || 0) * 60;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return (fallbackHour || 0) * 60;
  return parts[0] * 60 + parts[1];
}

function _minutesToClock(minutes) {
  const adjusted = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return String(Math.floor(adjusted / 60)).padStart(2, '0') + ':' + String(adjusted % 60).padStart(2, '0');
}

function _durationLabel(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return h + '시간 ' + m + '분';
  if (h > 0) return h + '시간';
  return m + '분';
}

function _sectionLabel(text) {
  return '<div class="section-label">' + _safeText(text) + '</div>';
}

function _dashIcon(name, size) {
  const paths = {
    'layout-grid': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    dollar: '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    activity: '<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>',
    'bar-chart': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    flame: '<path d="M8.5 14.5A4.5 4.5 0 1 0 16 11c0-2-1-3.5-3-5 .2 2-1 3.1-2.2 4.2-1 .9-2.3 2-2.3 4.3Z"/><path d="M12 22c-2.5-1.2-3-3.6-1.5-5.5.6.9 1.4 1.5 2.5 1.5 1.4 0 2.4-.8 3-2 1 2.5-.4 5-4 6Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
  };
  const path = paths[name] || paths.info;
  const s = size || 16;
  return '<svg class="dash-svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
}

function _getDashboardSubView() {
  if (DASHBOARD_VIEWS.includes(appState.dashboardSubView)) return appState.dashboardSubView;
  try {
    const saved = localStorage.getItem('navigator-dashboard-sub-view');
    if (DASHBOARD_VIEWS.includes(saved)) return saved;
  } catch (_) {}
  return '전체';
}

function setDashboardSubView(view) {
  if (!DASHBOARD_VIEWS.includes(view)) view = '전체';
  appState.dashboardSubView = view;
  try { localStorage.setItem('navigator-dashboard-sub-view', view); } catch (_) {}
  if (typeof saveState === 'function') saveState();
  if (typeof renderStatic === 'function') renderStatic();
}

// Sub-tab badges removed — static component counts are user-noise (ADHD target reads them as "unfinished items").
function _getDashboardSubTabCounts(ctx) {
  return { '전체': '', '수익': '', '건강': '', '패턴': '' };
}

function _getModeRanges() {
  const settings = appState.settings || {};
  const wake = _timeToMinutes(settings.targetWakeTime, 7) / 60;
  const workStart = _timeToMinutes(settings.workStartTime, 11) / 60;
  const workEnd = _timeToMinutes(settings.workEndTime, 20) / 60;
  const bedRaw = _timeToMinutes(settings.targetBedtime, 23) / 60;
  // Bedtime earlier than wake means next-day (cross-midnight) — cap at end-of-day to avoid zone collapse + wide leisure overlay.
  // Covers 00:00~06:00 post-midnight + any 6:01~wake-1 edge user inputs.
  const bed = bedRaw < wake ? 24 : bedRaw;
  const survivalStart = Math.max(workEnd, bed - 2);
  const isWeekend = [0, 6].includes(new Date().getDay());

  const raw = isWeekend
    ? [
        { name: '휴식', type: 'leisure', startHour: 0, endHour: survivalStart },
        { name: '생존', type: 'survival', startHour: survivalStart, endHour: bed },
        { name: '휴식', type: 'leisure', startHour: bed, endHour: 24 }
      ]
    : [
        { name: '휴식', type: 'leisure', startHour: 0, endHour: wake },
        { name: '출근', type: 'commute', startHour: wake, endHour: workStart },
        { name: '회사', type: 'work', startHour: workStart, endHour: workEnd },
        { name: appState.shuttleSuccess ? '여유' : '휴식', type: 'leisure', startHour: workEnd, endHour: survivalStart },
        { name: '생존', type: 'survival', startHour: survivalStart, endHour: bed },
        { name: '휴식', type: 'leisure', startHour: bed, endHour: 24 }
      ];

  return raw
    .map(zone => ({
      name: zone.name,
      type: zone.type,
      startHour: _clamp(zone.startHour, 0, 24),
      endHour: _clamp(zone.endHour, 0, 24)
    }))
    .filter(zone => zone.endHour > zone.startHour);
}

function _getModeProgress(now) {
  const current = now || new Date();
  const minuteOfDay = current.getHours() * 60 + current.getMinutes();
  const ranges = _getModeRanges();
  const active = ranges.find(zone => {
    const start = zone.startHour * 60;
    const end = zone.endHour * 60;
    return minuteOfDay >= start && minuteOfDay < end;
  }) || ranges[0] || { name: getCurrentMode(), startHour: 0, endHour: 24 };

  const start = active.startHour * 60;
  const end = active.endHour * 60;
  const duration = Math.max(end - start, 1);
  const elapsed = _clamp(minuteOfDay - start, 0, duration);

  return {
    mode: getCurrentMode(),
    progress: Math.round((elapsed / duration) * 100),
    remaining: _durationLabel(Math.max(end - minuteOfDay, 0)),
    endTime: _minutesToClock(end)
  };
}

function getDayTimelineData() {
  const today = getLocalDateStr();
  const now = new Date();
  const tasks = _safeTasks()
    .map(task => {
      const doneDate = _safeDate(task.completedAt);
      const deadlineDate = _safeDate(task.deadline);
      const sourceDate = doneDate && getLocalDateStr(doneDate) === today ? doneDate : deadlineDate;
      if (!sourceDate || getLocalDateStr(sourceDate) !== today) return null;
      return {
        time: sourceDate.getHours() + sourceDate.getMinutes() / 60,
        status: task.completed ? 'done' : 'pending',
        category: task.category || '기타',
        urgent: !task.completed && getUrgencyLevel(task) === 'urgent',
        title: task.title || ''
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
    .slice(0, 30);

  const ranges = _getModeRanges();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  let nextRange = ranges.find(zone => zone.startHour * 60 > nowMinute);
  let diff = 0;
  if (nextRange) {
    diff = nextRange.startHour * 60 - nowMinute;
  } else if (ranges.length > 0) {
    nextRange = ranges[0];
    diff = 1440 - nowMinute + nextRange.startHour * 60;
  }

  return {
    tasks,
    modeZones: ranges,
    nowPercent: _clamp((nowMinute / 1440) * 100, 0, 100),
    nextMode: nextRange ? {
      name: nextRange.name,
      time: _minutesToClock(nextRange.startHour * 60),
      diff: _durationLabel(diff)
    } : null
  };
}

function getMonthlyGoal(revenueStats) {
  const stats = revenueStats || getRevenueStats();
  const goal = _num((appState.settings || {}).monthlyRevenueGoal, 0);
  const current = _num(stats.thisMonthRevenue);
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(lastDay - now.getDate() + 1, 1);
  const remaining = Math.max(goal - current, 0);

  return {
    goal,
    current,
    remaining,
    percent: goal > 0 ? Math.min(Math.round((current / goal) * 100), 999) : 0,
    dailyNeeded: goal > 0 ? Math.ceil(remaining / daysLeft) : 0,
    daysLeft
  };
}

function getROIBreakdown(limit) {
  const maxItems = limit || 4;
  return _safeTasks()
    .filter(task => task.category === '부업' && _num(task.expectedRevenue) > 0 && _num(task.estimatedTime) > 0)
    .map(task => ({
      id: task.id,
      title: task.title || '부업 작업',
      revenue: _num(task.expectedRevenue),
      minutes: _num(task.estimatedTime),
      roi: _num(task.expectedRevenue) / Math.max(_num(task.estimatedTime), 1) * 60
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, maxItems);
}

function _getRhythmDay(dateStr) {
  const rhythm = appState.lifeRhythm || {};
  if (rhythm.today && rhythm.today.date === dateStr) return rhythm.today;
  return (rhythm.history || {})[dateStr] || {};
}

function _sleepHoursForDate(date) {
  const dayData = _getRhythmDay(getLocalDateStr(date));
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  const prevData = _getRhythmDay(getLocalDateStr(prev));
  if (!dayData.wakeUp || !prevData.sleep) return null;
  const sleep = _timeToMinutes(prevData.sleep, 23);
  const wake = _timeToMinutes(dayData.wakeUp, 7);
  let duration = wake + (24 * 60 - sleep);
  if (sleep < 12 * 60) duration = wake - sleep;
  return duration > 0 && duration < 16 * 60 ? duration / 60 : null;
}

function _completionCountForDate(dateStr) {
  const entries = (appState.completionLog || {})[dateStr];
  if (Array.isArray(entries) && entries.length > 0) {
    return entries.reduce((sum, entry) => sum + (entry._summary ? _num(entry.count, 0) : 1), 0);
  }
  return _safeTasks().filter(task => task.completedAt && getLocalDateStr(new Date(task.completedAt)) === dateStr).length;
}

function getSleepCompletionCorrelation() {
  const bands = [
    { key: 'lt5', label: '<5h', min: 0, max: 5 },
    { key: '5to6', label: '5-6h', min: 5, max: 6 },
    { key: '6to7', label: '6-7h', min: 6, max: 7 },
    { key: '7to8', label: '7-8h', min: 7, max: 8, optimal: true },
    { key: 'gt8', label: '8h+', min: 8, max: 24 }
  ].map(b => ({ ...b, days: 0, totalRate: 0 }));

  const today = new Date();
  const dailyGoal = Math.max(_num((appState.settings || {}).dailyGoal, 5), 1);
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const hours = _sleepHoursForDate(date);
    if (hours === null) continue;
    const count = _completionCountForDate(getLocalDateStr(date));
    const rate = Math.min((count / dailyGoal) * 100, 100);
    const band = bands.find(item => hours >= item.min && hours < item.max) || bands[bands.length - 1];
    band.days++;
    band.totalRate += rate;
  }

  return bands.map(band => ({
    label: band.label,
    days: band.days,
    averageRate: band.days > 0 ? Math.round(band.totalRate / band.days) : 0,
    optimal: !!band.optimal
  }));
}

function getSleepDebt(days, targetHours) {
  const totalDays = days || 7;
  const target = targetHours || _num((appState.settings || {}).targetSleepHours, 7) || 7;
  let actual = 0;
  let recorded = 0;
  const today = new Date();

  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const hours = _sleepHoursForDate(date);
    if (hours !== null) {
      actual += hours;
      recorded++;
    }
  }

  const expected = target * totalDays;
  const debt = expected - actual;
  return {
    days: totalDays,
    target,
    actual,
    recorded,
    expected,
    debt,
    recommendedTonight: target + Math.max(debt, 0) / totalDays
  };
}

function _periodKeyFromHour(hour) {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function getCategoryTimeHeatmap() {
  const rows = DASHBOARD_CATEGORIES.map(category => ({
    category,
    cells: DASHBOARD_PERIODS.map(period => ({ key: period.key, label: period.label, count: 0 }))
  }));
  const rowMap = Object.fromEntries(rows.map(row => [row.category, row]));

  const loggedDates = new Set();
  Object.entries(appState.completionLog || {}).forEach(([dateKey, entries]) => {
    if (!Array.isArray(entries) || entries.length === 0) return;
    let hasDetailedEntry = false;
    (entries || []).forEach(entry => {
      if (entry._summary || !entry.at) return;
      hasDetailedEntry = true;
      const category = DASHBOARD_CATEGORIES.includes(entry.c) ? entry.c : '일상';
      const hour = parseInt(String(entry.at).split(':')[0], 10);
      const periodKey = _periodKeyFromHour(hour);
      const cell = rowMap[category].cells.find(item => item.key === periodKey);
      if (cell) cell.count++;
    });
    if (hasDetailedEntry) loggedDates.add(dateKey);
  });

  _safeTasks().forEach(task => {
    if (!task.completedAt || !DASHBOARD_CATEGORIES.includes(task.category)) return;
    const d = _safeDate(task.completedAt);
    if (!d) return;
    if (loggedDates.has(getLocalDateStr(d))) return;
    const periodKey = _periodKeyFromHour(d.getHours());
    const cell = rowMap[task.category].cells.find(item => item.key === periodKey);
    if (cell) cell.count++;
  });

  const max = Math.max(...rows.flatMap(row => row.cells.map(cell => cell.count)), 1);
  let peak = null;
  rows.forEach(row => {
    row.cells.forEach(cell => {
      cell.level = cell.count === 0 ? 0 : Math.max(1, Math.ceil((cell.count / max) * 4));
      cell.peak = cell.count === max && max > 0;
      if (!peak || cell.count > peak.count) peak = { category: row.category, label: cell.label, count: cell.count };
    });
  });

  return {
    rows,
    periods: DASHBOARD_PERIODS,
    max,
    hint: peak && peak.count > 0
      ? peak.category + '은 ' + peak.label + ' 시간대에 가장 많이 완료됐어요.'
      : '완료 기록이 쌓이면 카테고리별 집중 시간대가 표시됩니다.'
  };
}

function getDeferredTasks(limit) {
  const maxItems = limit || 3;
  return _safeTasks()
    .map(task => ({
      id: task.id,
      title: task.title || '작업',
      category: task.category || '기타',
      count: Math.max(_num(task.postponeCount), _num(task.postponedCount))
    }))
    .filter(task => task.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
}

function _renderDashOverview(ctx) {
  const urgentTasks = ctx.urgentTasks || [];
  return `
    <div class="dash-panel active">
      ${_renderDashHero(ctx)}
      ${_renderDashUrgent(urgentTasks)}
      ${_renderDashCategoryStatus(ctx)}
      ${_renderDashWeeklySummary()}
      ${_renderDayTimeline()}
      <!-- ADHD attention order: 긴급 → 카테고리 → 주간 → 타임라인. Action-tab-owned next action, completed chips, resolution tracker intentionally routed out of dashboard. -->
    </div>
  `;
}

function _renderDashHero(ctx) {
  const stats = ctx.stats || { total: 0, completed: 0, remaining: 0 };
  const urgentTasks = ctx.urgentTasks || [];
  const now = new Date();
  const mode = _getModeProgress(now);
  const totalGoal = Math.max(_num((appState.settings || {}).dailyGoal, 5), 1);
  const pct = Math.min(Math.round((stats.completed / totalGoal) * 100), 100);
  const streak = appState.streak || { current: 0, best: 0 };

  return `
    <div class="dashboard-section dash-hero dash-hero-clean primary-tier">
      <div class="dash-hero-row-top">
        <div>
          <div class="dash-hero-clock">${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="dash-hero-mode-line">
            <span class="dash-hero-mode-pill">${_safeText(mode.mode)} 모드</span>
            <span>${_safeText(mode.endTime)}까지 ${_safeText(mode.remaining)}</span>
          </div>
        </div>
        ${urgentTasks.length > 0 ? `<button type="button" class="dash-hero-alert-pill" onclick="setDashboardSubView('전체'); setTimeout(() => document.getElementById('dash-urgent-section')?.scrollIntoView({behavior:'smooth', block:'start'}), 100);" aria-label="긴급 작업 ${urgentTasks.length}개로 이동">
          ${_dashIcon('alert', 14)}
          <span>긴급 ${urgentTasks.length}</span>
        </button>` : ''}
      </div>
      <div class="dash-hero-mode-bar" aria-label="현재 모드 진행률 ${mode.progress}%">
        <div class="dash-hero-mode-bar-fill" style="width: ${_clamp(mode.progress, 0, 100)}%"></div>
      </div>
      <div class="dash-hero-completion">
        <span class="dash-hero-completion-num">${stats.completed}/${totalGoal}</span>
        <div class="dash-hero-completion-bar" aria-hidden="true">
          <div class="dash-hero-completion-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="dash-hero-completion-percent">${pct}%</span>
      </div>
      <div class="dash-hero-streak-line">
        ${_dashIcon('flame', 13)}
        <span>연속 ${_num(streak.current)}일</span>
        ${_num(streak.best) > 0 ? `<span class="dash-hero-streak-best">최고 ${_num(streak.best)}일</span>` : ''}
      </div>
    </div>
  `;
}

function _renderDayTimeline() {
  const timeline = getDayTimelineData();
  return `
    <div class="dashboard-section">
      ${_sectionLabel('TODAY TIMELINE')}
      <div class="dashboard-title">하루 타임라인</div>
      <div class="day-timeline-axis">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
      <div class="day-timeline-track" aria-label="오늘 24시간 타임라인">
        ${timeline.modeZones.map(zone => `
          <span class="day-timeline-zone ${zone.type}"
            style="left: ${(zone.startHour / 24) * 100}%; width: ${((zone.endHour - zone.startHour) / 24) * 100}%"
            title="${_safeText(zone.name)} ${_minutesToClock(zone.startHour * 60)}-${_minutesToClock(zone.endHour * 60)}"></span>
        `).join('')}
        ${timeline.tasks.map(task => `
          <span class="day-timeline-task ${task.status} ${task.urgent ? 'urgent' : ''} ${task.category}"
            style="left: ${(task.time / 24) * 100}%"
            title="${_safeText(task.title)}"></span>
        `).join('')}
        <span class="day-timeline-now" style="left: ${timeline.nowPercent}%"></span>
      </div>
      <div class="day-timeline-legend">
        <span><i class="legend-dot mode-work"></i>회사</span>
        <span><i class="legend-dot mode-leisure"></i>여유/휴식</span>
        <span><i class="legend-dot mode-survival"></i>생존</span>
        <span><i class="legend-dot task-done"></i>완료</span>
        <span><i class="legend-dot task-urgent"></i>긴급</span>
      </div>
      ${timeline.nextMode ? `
        <div class="day-timeline-next-mode">
          <span>다음 모드: ${_safeText(timeline.nextMode.name)} ${_safeText(timeline.nextMode.time)}</span>
          <span class="day-timeline-next-mode-time">${_safeText(timeline.nextMode.diff)}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function _renderDashWeeklySummary() {
  const report = getWeeklyReport();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const formatDate = d => (d.getMonth() + 1) + '/' + d.getDate();

  return `
    <div class="dashboard-section weekly-report">
      ${_sectionLabel('WEEKLY SUMMARY')}
      <div class="weekly-report-header">
        <div class="dashboard-title">이번 주 요약</div>
        <div class="weekly-report-period">${formatDate(weekStart)} - ${formatDate(weekEnd)}</div>
      </div>
      <div class="weekly-report-stats">
        <div class="weekly-stat">
          <div class="weekly-stat-value">${report.thisWeekCount}</div>
          <div class="weekly-stat-label">완료한 작업</div>
          ${report.change !== 0 ? `<div class="weekly-stat-change ${report.change > 0 ? 'positive' : 'negative'}">${report.change > 0 ? '+' : '-'}${Math.abs(report.change)} vs 지난주</div>` : ''}
        </div>
        <div class="weekly-stat">
          <div class="weekly-stat-value positive">${_safeText(report.bestDay)}요일</div>
          <div class="weekly-stat-label">생산적인 요일</div>
          <div class="weekly-stat-change">${_num(report.bestDayCount)}개 완료</div>
        </div>
        <div class="weekly-stat">
          <div class="weekly-stat-value">${_safeText(report.topCategory)}</div>
          <div class="weekly-stat-label">많이 한 카테고리</div>
          <div class="weekly-stat-change">${_num(report.topCategoryCount)}개</div>
        </div>
        <div class="weekly-stat">
          <div class="weekly-stat-value positive">${_num(report.streak)}일</div>
          <div class="weekly-stat-label">연속 달성</div>
        </div>
      </div>
    </div>
  `;
}

function _getCategoryStatusRows() {
  return DASHBOARD_CATEGORIES.map(category => {
    const tasks = _safeTasks().filter(task => task.category === category);
    const completed = tasks.filter(task => task.completed).length;
    const total = tasks.length;
    return {
      category,
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });
}

function _renderDashCategoryStatus(ctx) {
  const rows = _getCategoryStatusRows(ctx);
  return `
    <div class="dashboard-section">
      ${_sectionLabel('CATEGORY STATUS')}
      <div class="dashboard-title">카테고리별 현황</div>
      <div class="category-stats">
        ${rows.map(stat => `
          <div class="category-stat">
            <div class="category-stat-header">
              <span class="category ${stat.category}">${stat.category}</span>
              <span class="category-progress">${stat.completed}/${stat.total} 완료</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${stat.category}" style="width: ${stat.percentage}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function _renderDashUrgent(urgentTasks) {
  const tasks = (urgentTasks || []).slice(0, 2);
  return `
    <div class="dashboard-section primary-tier" id="dash-urgent-section">
      ${_sectionLabel('URGENT')}
      <div class="dashboard-title">마감 임박</div>
      ${tasks.length > 0 ? `
        <div class="urgent-list">
          ${tasks.map(task => `
            <div class="urgent-item">
              <div class="urgent-item-title">${_safeText(task.title)}</div>
              <div class="urgent-item-time">${formatDeadlineChip(task.deadline)}</div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="dash-empty">오늘 급한 마감은 없습니다.</div>'}
    </div>
  `;
}

function _renderDashRevenuePanel(ctx) {
  const revenueStats = getRevenueStats();
  const goal = getMonthlyGoal(revenueStats);
  const roi = getROIBreakdown(4);
  const maxRoi = Math.max(...roi.map(item => item.roi), 1);

  return `
    <div class="dash-panel active">
      <div class="dashboard-section revenue-dashboard">
        ${_sectionLabel('REVENUE')}
        <div class="dashboard-title">수익 대시보드</div>
        <div class="revenue-summary">
          <div class="revenue-card total">
            <div class="revenue-card-label">총 수익</div>
            <div class="revenue-card-value">${_formatKRW(revenueStats.totalRevenue)}</div>
            <div class="revenue-card-sub">${_num(revenueStats.taskCount)}개 완료</div>
          </div>
          <div class="revenue-card month">
            <div class="revenue-card-label">이번 달</div>
            <div class="revenue-card-value">${_formatKRW(revenueStats.thisMonthRevenue)}</div>
          </div>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">월별 추이</div>
        <div class="revenue-bar-chart">
          ${(revenueStats.monthlyData || []).map(month => `
            <div class="revenue-bar-item">
              <div class="revenue-bar-wrapper">
                <div class="revenue-bar" style="height: ${Math.max((_num(month.revenue) / Math.max(_num(revenueStats.maxMonthlyRevenue), 1)) * 100, 5)}%">
                  ${_num(month.revenue) > 0 ? `<span class="revenue-bar-value">${_formatKRW(month.revenue)}</span>` : ''}
                </div>
              </div>
              <div class="revenue-bar-label">${_safeText(month.label)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">카테고리별 수익</div>
        ${(revenueStats.categoryData || []).length > 0 ? `
          <div class="revenue-category-list">
            ${revenueStats.categoryData.map(item => `
              <div class="revenue-category-item">
                <div class="revenue-category-header">
                  <span class="category ${item.category}">${item.category}</span>
                  <span class="revenue-category-amount">${_formatKRW(item.revenue)}</span>
                </div>
                <div class="revenue-category-bar">
                  <div class="revenue-category-bar-fill ${item.category}" style="width: ${_clamp(item.percentage, 0, 100)}%"></div>
                </div>
                <div class="revenue-category-percent">${_num(item.percentage)}%</div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="dash-empty">카테고리별 수익 기록이 없습니다.</div>'}
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">월 목표 vs 실적</div>
        <div class="monthly-goal">
          ${goal.goal > 0 ? `
            <div class="monthly-goal-header">
              <div>
                <div class="monthly-goal-label">이번 달 목표</div>
                <div class="monthly-goal-amount">${_formatKRW(goal.current)} / ${_formatKRW(goal.goal)}</div>
              </div>
              <div class="monthly-goal-percent">${goal.percent}%</div>
            </div>
            <div class="monthly-goal-bar">
              <div class="monthly-goal-bar-fill" style="width: ${_clamp(goal.percent, 0, 100)}%"></div>
            </div>
            <div class="monthly-goal-foot">
              <span>남은 금액 ${_formatKRW(goal.remaining)}</span>
              <span>일평균 ${_formatKRW(goal.dailyNeeded)}</span>
            </div>
          ` : `
            <div class="monthly-goal-empty">
              <strong>월 수익 목표가 아직 없습니다.</strong>
              <span>설정에 monthlyRevenueGoal 값을 추가하면 진행률과 일평균 필요 금액을 계산합니다.</span>
            </div>
          `}
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">시간당 ROI</div>
        ${roi.length > 0 ? `
          <div class="roi-bar-list">
            ${roi.map(item => `
              <div class="roi-bar-item">
                <div class="roi-bar-name" title="${_safeText(item.title)}">${_safeText(item.title)}</div>
                <div class="roi-bar-track">
                  <div class="roi-bar-fill" style="width: ${Math.max((item.roi / maxRoi) * 100, 5)}%"></div>
                </div>
                <div class="roi-bar-value">${_formatKRW(item.roi)}/h</div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="dash-empty">예상 수익과 예상 시간이 있는 부업 작업이 없습니다.</div>'}
      </div>

      <div class="dashboard-section dash-export-section">
        <button class="btn-export-asset" onclick="exportToAssetManager()" title="자산관리 앱에 붙여넣을 데이터를 클립보드/파일로 복사">
          ${_dashIcon('download', 15)}
          <span>클립보드 복사 (자산관리용)</span>
        </button>
      </div>
    </div>
  `;
}

function _getMedicationDashboardStats(days) {
  const medSlots = typeof getMedicationSlots === 'function' ? getMedicationSlots() : [];
  const today = new Date();
  const todayStr = typeof getLogicalDate === 'function' ? getLogicalDate() : getLocalDateStr();
  const stats = { reqTotal: 0, reqTaken: 0, optTotal: 0, optTaken: 0 };
  medSlots.forEach(slot => {
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = getLocalDateStr(d);
      const day = _getRhythmDay(ds);
      const meds = day.medications || {};
      const hasActivity = Object.values(meds).some(Boolean);
      if (!hasActivity && ds !== todayStr) continue;
      if (slot.required) {
        stats.reqTotal++;
        if (meds[slot.id]) stats.reqTaken++;
      } else {
        stats.optTotal++;
        if (meds[slot.id]) stats.optTaken++;
      }
    }
  });
  return {
    reqRate: stats.reqTotal ? Math.round((stats.reqTaken / stats.reqTotal) * 100) : 0,
    optRate: stats.optTotal ? Math.round((stats.optTaken / stats.optTotal) * 100) : 0,
    slots: medSlots.length
  };
}

function _renderDashHealthPanel(ctx) {
  const rhythmStats = getLifeRhythmStats();
  const med7 = _getMedicationDashboardStats(7);
  const med30 = _getMedicationDashboardStats(30);
  const medStreak = typeof getMedicationStreak === 'function' ? getMedicationStreak() : 0;
  const corr = getSleepCompletionCorrelation();
  const debt = getSleepDebt(7);

  return `
    <div class="dash-panel active">
      <div class="dashboard-section life-rhythm-stats">
        ${_sectionLabel('SLEEP')}
        <div class="dashboard-title">수면 패턴 7일</div>
        ${rhythmStats.hasData ? `
          <div class="rhythm-bar-chart">
            ${rhythmStats.sleepData.map(day => `
              <div class="rhythm-bar-item">
                <div class="rhythm-bar-wrapper">
                  <div class="rhythm-bar ${day.hours >= 7 ? 'good' : day.hours >= 6 ? 'ok' : 'bad'}"
                    style="height: ${day.hours ? Math.max((day.hours / 10) * 100, 10) : 0}%"
                    title="${day.date}: ${day.hours ? day.hours.toFixed(1) + '시간' : '기록 없음'}">
                    ${day.hours ? `<span class="rhythm-bar-value">${day.hours.toFixed(1)}h</span>` : ''}
                  </div>
                </div>
                <div class="rhythm-bar-label ${day.isToday ? 'today' : ''}">${day.dayLabel}</div>
              </div>
            `).join('')}
          </div>
          <div class="rhythm-summary-row">
            <span>평균 수면 <strong>${rhythmStats.avgSleep.toFixed(1)}시간</strong></span>
            <span>목표 대비 <strong class="${rhythmStats.avgSleep >= rhythmStats.targetSleepHours ? 'good' : 'bad'}">${(rhythmStats.avgSleep - rhythmStats.targetSleepHours).toFixed(1)}시간</strong></span>
          </div>
        ` : '<div class="dash-empty">수면 기록이 아직 없습니다.</div>'}
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">근무 패턴</div>
        <div class="panel-info-grid">
          <div class="panel-info-cell"><span class="panel-info-label">평균 출근</span><span class="panel-info-value">${rhythmStats.avgWorkArrive || '--:--'}</span></div>
          <div class="panel-info-cell"><span class="panel-info-label">평균 퇴근</span><span class="panel-info-value">${rhythmStats.avgWorkDepart || '--:--'}</span></div>
          <div class="panel-info-cell"><span class="panel-info-label">평균 근무</span><span class="panel-info-value">${rhythmStats.avgWorkHours ? rhythmStats.avgWorkHours.toFixed(1) + 'h' : '--'}</span></div>
          <div class="panel-info-cell"><span class="panel-info-label">출근 편차</span><span class="panel-info-value">${rhythmStats.homeDepartDeviation ? '±' + rhythmStats.homeDepartDeviation + '분' : '--'}</span></div>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">복약 통계</div>
        <div class="panel-info-grid">
          <div class="panel-info-cell"><span class="panel-info-label">필수 7일</span><span class="panel-info-value ${med7.reqRate >= 80 ? 'good' : ''}">${med7.reqRate}%</span></div>
          <div class="panel-info-cell"><span class="panel-info-label">필수 30일</span><span class="panel-info-value ${med30.reqRate >= 80 ? 'good' : ''}">${med30.reqRate}%</span></div>
          <div class="panel-info-cell"><span class="panel-info-label">선택 7일</span><span class="panel-info-value">${med7.optRate}%</span></div>
          <div class="panel-info-cell"><span class="panel-info-label">연속일</span><span class="panel-info-value ${medStreak >= 7 ? 'good' : ''}">${medStreak}일</span></div>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">수면-완료율 상관</div>
        <div class="sleep-corr">
          ${corr.map(row => `
            <div class="sleep-corr-row ${row.optimal ? 'optimal' : ''}">
              <span class="sleep-corr-band">${row.label}</span>
              <span class="sleep-corr-track"><span class="sleep-corr-fill ${row.averageRate >= 70 ? 'good' : row.averageRate >= 40 ? 'warning' : 'bad'}" style="width: ${row.averageRate}%"></span></span>
              <span class="sleep-corr-pct">${row.averageRate}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">수면 부채 누적</div>
        <div class="sleep-debt">
          <div class="sleep-debt-row">
            <span class="sleep-debt-label">7일 목표 ${debt.expected.toFixed(0)}h 대비</span>
            <span class="sleep-debt-num ${debt.debt > 0 ? 'neg' : 'pos'}">${debt.debt > 0 ? '-' : '+'}${Math.abs(debt.debt).toFixed(1)}h</span>
          </div>
          <div class="sleep-debt-rec">
            ${debt.recorded > 0 ? `오늘 권장 수면 ${debt.recommendedTonight.toFixed(1)}h` : '수면 기록이 쌓이면 회복 권고를 계산합니다.'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function _renderDashPatternsPanel(ctx) {
  const hourlyProd = getHourlyProductivity();
  const dayProd = getDayOfWeekProductivity();
  const catDist = getCategoryDistribution();
  const heatmap = getCategoryTimeHeatmap();
  const deferred = getDeferredTasks(3);

  return `
    <div class="dash-panel active">
      <div class="dashboard-section insights-section">
        ${_sectionLabel('TIME')}
        <div class="dashboard-title">생산적 시간대</div>
        ${_renderPeriodBars(hourlyProd)}
      </div>

      <div class="dashboard-section insights-section">
        <div class="dashboard-title">활발 요일</div>
        ${_renderDayBars(dayProd)}
      </div>

      <div class="dashboard-section insights-section">
        <div class="dashboard-title">카테고리 분배</div>
        ${_renderCategoryDonut(catDist)}
      </div>

      <div class="dashboard-section habit-tracker">
        <div class="dashboard-title">습관 트래커 12주</div>
        ${_renderHabitGrid()}
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">카테고리 × 시간대</div>
        <div class="cat-time-heatmap">
          <div></div>
          ${heatmap.periods.map(period => `<div class="heatmap-col-label">${period.label}</div>`).join('')}
          ${heatmap.rows.map(row => `
            <div class="heatmap-row-label ${row.category}">${row.category}</div>
            ${row.cells.map(cell => `
              <div class="heatmap-cell level-${cell.level} ${cell.peak ? 'peak' : ''}" title="${row.category} ${cell.label}: ${cell.count}개">
                ${cell.count || ''}
              </div>
            `).join('')}
          `).join('')}
        </div>
        <div class="heatmap-hint">${_safeText(heatmap.hint)}</div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-title">반복 미루기 작업</div>
        ${deferred.length > 0 ? `
          <div class="deferred-list">
            ${deferred.map((task, index) => `
              <div class="deferred-item">
                <span class="deferred-rank">${index + 1}</span>
                <span class="deferred-title">${_safeText(task.title)}</span>
                <span class="category ${task.category}">${task.category}</span>
                <span class="deferred-count">${task.count}회</span>
              </div>
            `).join('')}
          </div>
        ` : '<div class="dash-empty">미룬 기록이 있는 작업이 없습니다.</div>'}
      </div>
    </div>
  `;
}

function _renderPeriodBars(hourlyProd) {
  const slots = [
    { label: '아침', count: hourlyProd.periods.morning.count },
    { label: '점심', count: hourlyProd.periods.lunch.count },
    { label: '오후', count: hourlyProd.periods.afternoon.count },
    { label: '저녁', count: hourlyProd.periods.evening.count },
    { label: '밤', count: hourlyProd.periods.night.count }
  ];
  const max = Math.max(...slots.map(slot => slot.count), 1);
  return `
    <div class="insight-header">
      <span class="insight-label">가장 생산적인 시간대</span>
      <span class="insight-value">${_safeText(hourlyProd.bestPeriod.name)}</span>
    </div>
    <div class="insight-bar-container">
      ${slots.map(slot => `<div class="insight-bar ${slot.count === max && slot.count > 0 ? 'peak' : ''}" style="height: ${Math.max((slot.count / max) * 100, 8)}%" title="${slot.label}: ${slot.count}개"></div>`).join('')}
    </div>
    <div class="insight-bar-labels">${slots.map(slot => `<div class="insight-bar-label">${slot.label}</div>`).join('')}</div>
  `;
}

function _renderDayBars(dayProd) {
  const max = Math.max(...dayProd.data.map(day => day.count), 1);
  return `
    <div class="insight-header">
      <span class="insight-label">가장 활발한 요일</span>
      <span class="insight-value">${_safeText(dayProd.bestDay)}요일 ${_num(dayProd.bestDayCount)}개</span>
    </div>
    <div class="insight-bar-container">
      ${dayProd.data.map(day => `<div class="insight-bar ${day.count === max && day.count > 0 ? 'peak' : ''}" style="height: ${Math.max((day.count / max) * 100, 8)}%" title="${day.name}: ${day.count}개"></div>`).join('')}
    </div>
    <div class="insight-bar-labels">${dayProd.data.map(day => `<div class="insight-bar-label">${day.name}</div>`).join('')}</div>
  `;
}

function _renderCategoryDonut(catDist) {
  if (!catDist.total) return '<div class="dash-empty">카테고리 완료 기록이 없습니다.</div>';
  const colors = { '본업': 'var(--cat-본업)', '부업': 'var(--cat-부업)', '일상': 'var(--cat-일상)', '가족': 'var(--cat-가족)', '기타': 'var(--text-muted)' };
  let offset = 25;
  const circles = catDist.distribution.map(item => {
    const dash = item.percentage + ' ' + (100 - item.percentage);
    const circle = `<circle class="dash-donut-segment" cx="21" cy="21" r="15.9" fill="transparent" stroke="${colors[item.category] || 'var(--text-muted)'}" stroke-width="5" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"></circle>`;
    offset -= item.percentage;
    return circle;
  }).join('');

  return `
    <div class="pie-chart-container dash-donut-wrap">
      <svg class="dash-donut" viewBox="0 0 42 42" role="img" aria-label="카테고리 분배">
        <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--bg-tertiary)" stroke-width="5"></circle>
        ${circles}
      </svg>
      <div class="pie-legend">
        ${catDist.distribution.map(item => `
          <div class="pie-legend-item">
            <div class="pie-legend-color ${item.category}"></div>
            <span>${_safeText(item.category)}</span>
            <span class="pie-legend-value">${item.count}개 (${item.percentage}%)</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function _renderHabitGrid() {
  const filter = appState.habitFilter || 'all';
  const habitTitle = filter === 'all' ? undefined : filter;
  const habitData = getHabitTrackerData(habitTitle);
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return `
    <div class="dash-habit-grid">
      ${dayLabels.map((day, dayIdx) => `
        <div class="habit-day-label">${day}</div>
        ${habitData.map(week => {
          const cell = week[dayIdx];
          return `<div class="habit-cell ${cell.level > 0 ? 'level-' + cell.level : ''} ${cell.isToday ? 'today' : ''}" title="${cell.date}: ${cell.count}개 완료"></div>`;
        }).join('')}
      `).join('')}
    </div>
    <div class="habit-legend">
      <span>${habitTitle ? '미완료' : '적음'}</span>
      <div class="habit-legend-item"><div class="habit-legend-cell" style="background: var(--bg-tertiary)"></div></div>
      <div class="habit-legend-item"><div class="habit-legend-cell level-1"></div></div>
      <div class="habit-legend-item"><div class="habit-legend-cell level-2"></div></div>
      <div class="habit-legend-item"><div class="habit-legend-cell level-3"></div></div>
      <div class="habit-legend-item"><div class="habit-legend-cell level-4"></div></div>
      <span>${habitTitle ? '완료' : '많음'}</span>
    </div>
  `;
}

// Dead backward-compat aliases (0 external callers per grep 2026-05-21). Kept
// during transition window — remove in next cleanup pass once external code
// confirms no late binding via window. Note: revenueStats argument is silently
// ignored by _renderDashRevenuePanel (computes its own via getRevenueStats).
function _renderDashRevenue(revenueStats) {
  return _renderDashRevenuePanel({ revenueStats });
}

function _renderDashLifeRhythm() {
  return _renderDashHealthPanel({});
}

function _renderDashProductivityInsights() {
  return _renderDashPatternsPanel({});
}

function _renderDashWeeklyMonthly() {
  return '';
}

if (typeof window !== 'undefined') {
  window.setDashboardSubView = setDashboardSubView;
  window.getDayTimelineData = getDayTimelineData;
  window.getMonthlyGoal = getMonthlyGoal;
  window.getROIBreakdown = getROIBreakdown;
  window.getSleepCompletionCorrelation = getSleepCompletionCorrelation;
  window.getSleepDebt = getSleepDebt;
  window.getCategoryTimeHeatmap = getCategoryTimeHeatmap;
  window.getDeferredTasks = getDeferredTasks;
}
