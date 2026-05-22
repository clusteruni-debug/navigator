// ============================================
// 렌더링 - 대시보드 탭
// ============================================

/**
 * 대시보드 탭 HTML을 반환한다.
 * renderStatic()에서 계산된 변수들을 인자로 받는다.
 */
function renderDashboardTab(ctx) {
  const views = ['전체', '수익', '건강', '패턴'];
  const sub = views.includes(appState.dashboardSubView) ? appState.dashboardSubView : _getDashboardSubView();
  appState.dashboardSubView = views.includes(sub) ? sub : '전체';

  const counts = _getDashboardSubTabCounts(ctx);
  const panelHtml = appState.dashboardSubView === '전체'
    ? _renderDashOverview(ctx)
    : appState.dashboardSubView === '수익'
      ? _renderDashRevenuePanel(ctx)
      : appState.dashboardSubView === '건강'
        ? _renderDashHealthPanel(ctx)
        : _renderDashPatternsPanel(ctx);

  return `
    <div class="dashboard-redesign">
      <div class="dashboard-sub-tabs" role="tablist" aria-label="대시보드 보기">
        ${views.map(view => `
          <button
            type="button"
            class="dash-sub-tab ${appState.dashboardSubView === view ? 'active' : ''}"
            onclick="setDashboardSubView('${view}')"
            role="tab"
            aria-selected="${appState.dashboardSubView === view ? 'true' : 'false'}">
            ${_dashIcon(view === '전체' ? 'layout-grid' : view === '수익' ? 'dollar' : view === '건강' ? 'activity' : 'bar-chart', 14)}
            <span>${view}</span>
            <span class="dash-sub-tab-count">${counts[view]}</span>
          </button>
        `).join('')}
      </div>
      ${panelHtml}
    </div>
  `;
}
