// ============================================
// 렌더링 - 대시보드 탭
// ============================================

/**
 * 대시보드 탭 HTML을 반환한다.
 * renderStatic()에서 계산된 변수들을 인자로 받는다.
 */
function renderDashboardTab(ctx) {
  const views = typeof DASHBOARD_VIEWS !== 'undefined' ? DASHBOARD_VIEWS : ['전체', '수익', '건강', '패턴'];
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
            id="dashboard-subtab-${view}"
            class="dash-sub-tab ${appState.dashboardSubView === view ? 'active' : ''}"
            data-dashboard-subtab="${view}"
            onclick="setDashboardSubView('${view}')"
            role="tab"
            aria-label="${view} 분석 패널"
            aria-controls="dashboard-panel-${view}"
            aria-selected="${appState.dashboardSubView === view ? 'true' : 'false'}"
            tabindex="${appState.dashboardSubView === view ? '0' : '-1'}">
            ${_dashIcon(view === '전체' ? 'layout-grid' : view === '수익' ? 'dollar' : view === '건강' ? 'activity' : 'bar-chart', 14)}
            <span>${view}</span>
            <span class="dash-sub-tab-count">${counts[view]}</span>
          </button>
        `).join('')}
      </div>
      <div id="dashboard-panel-${appState.dashboardSubView}" role="tabpanel" aria-labelledby="dashboard-subtab-${appState.dashboardSubView}" tabindex="0">
        ${panelHtml}
      </div>
    </div>
  `;
}
