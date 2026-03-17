// ============================================
// 렌더링 - 대시보드 탭
// ============================================

/**
 * 대시보드 탭 HTML을 반환한다.
 * renderStatic()에서 계산된 변수들을 인자로 받는다.
 */
function renderDashboardTab(ctx) {
  var stats = ctx.stats;
  var categoryStats = ctx.categoryStats;
  var urgentTasks = ctx.urgentTasks;
  var completedTasks = ctx.completedTasks;

  // ── "지금 이 순간" 핵심 정보 ──
  const now = new Date();
  const hour = now.getHours();
  const mode = getCurrentMode();
  const filteredTasks = getFilteredTasks();
  const nextAction = filteredTasks[0] || null;
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return `
        <!-- 지금 이 순간: 시간 + 모드 + 핵심 지표 -->
        <div class="dashboard-section dash-hero">
          <div class="dash-hero-top">
            <div class="dash-hero-time">
              <span class="dash-hero-clock">${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span class="dash-hero-mode ${mode}">${mode} 모드</span>
            </div>
            <div class="dash-hero-streak">
              <span class="dash-hero-streak-value">🔥 ${appState.streak.current}</span>
              ${appState.streak.best > 0 ? `<span class="dash-hero-streak-best">최고 ${appState.streak.best}일</span>` : ''}
            </div>
          </div>
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value" style="color: var(--accent-success)">${stats.completed}</div>
              <div class="stat-label">완료</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.remaining}</div>
              <div class="stat-label">남은 작업</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${completionRate}%</div>
              <div class="stat-label">완료율</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${urgentTasks.length}</div>
              <div class="stat-label">긴급</div>
            </div>
          </div>
        </div>

        <!-- 지금 할 것 (Next Action 미니) -->
        ${nextAction ? `
          <div class="dashboard-section dash-next-action">
            <div class="dashboard-title">▶ 지금 할 것</div>
            <div class="dash-next-card">
              <div class="dash-next-info">
                <span class="category ${nextAction.category}">${nextAction.category}</span>
                <span class="dash-next-title">${escapeHtml(nextAction.title)}</span>
                ${nextAction.estimatedTime ? `<span class="dash-next-time">${nextAction.estimatedTime}분</span>` : ''}
              </div>
              <div class="dash-next-actions">
                ${nextAction.link ? `<button class="btn-small go" onclick="handleGo('${escapeAttr(nextAction.link)}')">GO</button>` : ''}
                <button class="btn-small complete" onclick="completeTask('${escapeAttr(nextAction.id)}')">✓</button>
              </div>
            </div>
          </div>
        ` : ''}

        ${(() => {
          const revenueStats = getRevenueStats();
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
        })()}

        ${(() => {
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
        })()}

        ${(() => {
          const report = getWeeklyReport();
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const formatDate = (d) => (d.getMonth() + 1) + '/' + d.getDate();

          return `
            <div class="dashboard-section weekly-report">
              <div class="weekly-report-header">
                <div class="weekly-report-title">📅 이번 주 요약</div>
                <div class="weekly-report-period">${formatDate(weekStart)} - ${formatDate(weekEnd)}</div>
              </div>
              <div class="weekly-report-stats">
                <div class="weekly-stat">
                  <div class="weekly-stat-value">${report.thisWeekCount}</div>
                  <div class="weekly-stat-label">완료한 작업</div>
                  ${report.change !== 0 ? `
                    <div class="weekly-stat-change ${report.change > 0 ? 'positive' : 'negative'}">
                      ${report.change > 0 ? '▲' : '▼'} ${Math.abs(report.change)} vs 지난주
                    </div>
                  ` : ''}
                </div>
                <div class="weekly-stat">
                  <div class="weekly-stat-value positive">${report.bestDay}요일</div>
                  <div class="weekly-stat-label">가장 생산적인 요일</div>
                  ${report.bestDayCount > 0 ? `
                    <div class="weekly-stat-change">${report.bestDayCount}개 완료</div>
                  ` : ''}
                </div>
                <div class="weekly-stat">
                  <div class="weekly-stat-value">${report.topCategory}</div>
                  <div class="weekly-stat-label">많이 한 카테고리</div>
                  ${report.topCategoryCount > 0 ? `
                    <div class="weekly-stat-change">${report.topCategoryCount}개</div>
                  ` : ''}
                </div>
                <div class="weekly-stat">
                  <div class="weekly-stat-value positive">🔥 ${report.streak}일</div>
                  <div class="weekly-stat-label">연속 달성 스트릭</div>
                </div>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const filter = appState.habitFilter || 'all';
          const habitTitle = filter === 'all' ? undefined : filter;
          const habitData = getHabitTrackerData(habitTitle);
          const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
          const habits = getRecurringHabits();
          const hs = habitTitle ? (appState.habitStreaks || {})[habitTitle] : null;

          return `
            <div class="dashboard-section habit-tracker">
              <div class="habit-tracker-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div class="habit-tracker-title" style="margin-bottom:0">🌱 습관 트래커 (최근 12주)</div>
                ${habits.length > 0 ? `
                  <select class="habit-filter-select" onchange="appState.habitFilter=this.value;renderStatic();"
                    style="padding:4px 8px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:14px;max-width:140px;">
                    <option value="all" ${filter === 'all' ? 'selected' : ''}>전체</option>
                    ${habits.map(h => `<option value="${h}" ${filter === h ? 'selected' : ''}>${h}</option>`).join('')}
                  </select>
                ` : ''}
              </div>
              ${hs ? `
                <div style="display:flex;gap:12px;margin-bottom:8px;font-size:14px;color:var(--text-secondary);">
                  <span>🔥 연속 ${hs.current}일</span>
                  <span>🏆 최고 ${hs.best}일</span>
                </div>
              ` : ''}
              <div class="habit-grid">
                ${dayLabels.map((day, dayIdx) => `
                  <div class="habit-day-label">${day}</div>
                  ${habitData.map(week => {
                    const cell = week[dayIdx];
                    return `<div class="habit-cell ${cell.level > 0 ? 'level-' + cell.level : ''} ${cell.isToday ? 'today' : ''}"
                      title="${cell.date}: ${cell.count}개 완료"></div>`;
                  }).join('')}
                `).join('')}
              </div>
              <div class="habit-legend">
                <span>${habitTitle ? '미완료' : '적음'}</span>
                <div class="habit-legend-item"><div class="habit-legend-cell" style="background: var(--bg-tertiary)"></div></div>
                ${habitTitle ? `
                  <div class="habit-legend-item"><div class="habit-legend-cell level-4" style="background: var(--accent-success)"></div></div>
                ` : `
                  <div class="habit-legend-item"><div class="habit-legend-cell level-1" style="background: rgba(72, 187, 120, 0.3)"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-2" style="background: rgba(72, 187, 120, 0.5)"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-3" style="background: rgba(72, 187, 120, 0.7)"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-4" style="background: var(--accent-success)"></div></div>
                `}
                <span>${habitTitle ? '완료' : '많음'}</span>
              </div>
            </div>
          `;
        })()}

        <div class="dashboard-section">
          <div class="dashboard-title">📊 카테고리별 현황</div>
          <div class="category-stats">
            ${categoryStats.map(stat => `
              <div class="category-stat">
                <div class="category-stat-header">
                  <span class="category ${stat.category}">${stat.category}</span>
                  <span class="category-progress">${stat.completed}/${stat.total + stat.completed} 완료</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill ${stat.category}" style="width: ${stat.percentage}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        ${urgentTasks.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-title">🚨 마감 임박</div>
            <div class="urgent-list">
              ${urgentTasks.slice(0, 5).map(task => `
                <div class="urgent-item">
                  <div class="urgent-item-title">${escapeHtml(task.title)}</div>
                  <div class="urgent-item-time">⏰ ${formatDeadline(task.deadline)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${(() => {
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
            '본업': 'var(--accent-primary)',
            '부업': '#f093fb',
            '일상': '#4ecdc4',
            '가족': '#ffd93d',
            '기타': '#888'
          };
          let gradientParts = [];
          let currentDeg = 0;
          catDist.distribution.forEach(item => {
            const deg = (item.percentage / 100) * 360;
            const color = colors[item.category] || '#888';
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
        })()}

        <!-- 오늘 완료 (컴팩트 — 전체 목록은 '할일' 탭에서) -->
        ${completedTasks.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-title">✅ 오늘 완료 (${completedTasks.length}개)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${completedTasks.slice(0, 8).map(task => `
                <span style="font-size: 14px; padding: 4px 10px; background: var(--bg-tertiary); border-radius: 12px; color: var(--text-secondary);">
                  ${escapeHtml(task.title)}
                </span>
              `).join('')}
              ${completedTasks.length > 8 ? `<span style="font-size: 14px; padding: 4px 10px; color: var(--text-muted);">+${completedTasks.length - 8}개</span>` : ''}
            </div>
          </div>
        ` : ''}

        ${(() => {
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
                  <div class="stat-value" style="color: #f093fb">${weekRevenue > 0 ? formatKRW(weekRevenue) : '-'}</div>
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
        })()}
        `;
}
