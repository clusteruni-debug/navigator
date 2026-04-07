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
                <button class="btn-small complete" onclick="if(this._longPressed){this._longPressed=false;return;}completeTask('${escapeAttr(nextAction.id)}')"
                  onpointerdown="this._lpTimer = setTimeout(() => { this._longPressed = true; showBackdateMenu('${escapeAttr(nextAction.id)}', this); }, 500)"
                  onpointerup="clearTimeout(this._lpTimer)"
                  onpointerleave="clearTimeout(this._lpTimer)"
                  aria-label="작업 완료 (길게 누르면 날짜 선택)">✓</button>
              </div>
            </div>
          </div>
        ` : ''}

        ${_renderDashRevenue(getRevenueStats())}

        ${_renderDashLifeRhythm()}

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
                  <div class="habit-legend-item"><div class="habit-legend-cell level-4"></div></div>
                ` : `
                  <div class="habit-legend-item"><div class="habit-legend-cell level-1"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-2"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-3"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-4"></div></div>
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

        ${_renderDashProductivityInsights()}

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

        ${_renderDashWeeklyMonthly()}
        `;
}
