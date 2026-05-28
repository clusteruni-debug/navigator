# Codex Task — Dashboard Tab Redesign

> Dispatched from CC. Visual source of truth: `projects/navigator/docs/design-mockups/02-dashboard-tab.html` (open in browser, toggle sub-tabs 전체/수익/건강/패턴).
> Owner agreed: sub-tab navigation (4 panels) + Hero v3 clean + day timeline + 6 new analysis components.

## Input

- **Mockup**: `projects/navigator/docs/design-mockups/02-dashboard-tab.html`
- **Modify**: `projects/navigator/js/render-dashboard.js`, `projects/navigator/js/render-dashboard-sections.js`, `projects/navigator/css/dashboard.css`
- **Read-only**: `projects/navigator/DESIGN.md`, `projects/navigator/CLAUDE.md`, `projects/navigator/js/utils.js`, `projects/navigator/js/state.js`

## Standing Rules (enforced)

- No emoji in UI — Lucide inline SVG (`stroke="currentColor"`) only
- Hover: bg/border color change only
- CSS variables only — `color-mix(in srgb, var(--token) X%, transparent)` for tints
- Max 1 gradient (header-streak only — do not add)
- Action buttons: hidden desktop / visible mobile (`@media (hover: none) and (pointer: coarse)`)
- `font-variant-numeric: tabular-nums` on all numeric displays

## Output

### 1. `js/render-dashboard.js` — Sub-tab navigation + 4 panels

Replace flat 11-component layout with sub-tab navigation. Use `appState.dashboardSubView` ('전체'|'수익'|'건강'|'패턴', default '전체'). Add `setDashboardSubView(view)` window function.

**Panel routing:**
```javascript
function renderDashboardTab(ctx) {
  const sub = appState.dashboardSubView || '전체';
  return `
    <div class="dashboard-sub-tabs">
      <button class="dash-sub-tab ${sub === '전체' ? 'active' : ''}" onclick="setDashboardSubView('전체')">...</button>
      <button class="dash-sub-tab ${sub === '수익' ? 'active' : ''}" onclick="setDashboardSubView('수익')">...</button>
      <button class="dash-sub-tab ${sub === '건강' ? 'active' : ''}" onclick="setDashboardSubView('건강')">...</button>
      <button class="dash-sub-tab ${sub === '패턴' ? 'active' : ''}" onclick="setDashboardSubView('패턴')">...</button>
    </div>
    ${sub === '전체' ? _renderDashOverview(ctx) :
      sub === '수익' ? _renderDashRevenuePanel(ctx) :
      sub === '건강' ? _renderDashHealthPanel(ctx) :
      _renderDashPatternsPanel(ctx)}
  `;
}
```

### 2. Panel content mapping

**전체 (overview, state)** — 5 컴포넌트:
- Hero v3 (clean — single layer, no nested cards). 시계 38px + 모드 pill + 모드 진행 bar (시간 % via `getCurrentMode()` + window range) + 완료 카드 (가로 layout `2/7 + bar + 29%`) + alert pill (긴급 N) + streak inline. **mockup `.dash-hero-clean` 정확 reproduce**
- **NEW: 하루 timeline** — 24h × mode zones + task dots + 현재 위치 marker + 다음 모드 카운트다운. 새 함수 `getDayTimelineData()` 작성 — input: appState, output: `{ tasks: [{time, status, category, urgent}], modeZones: [{name, startHour, endHour}], nowPercent, nextMode: {name, time, diff} }`
- 이번 주 요약 (기존 `getWeeklyReport()` 데이터, 4 stat — section-label로 그룹)
- 카테고리별 현황 (기존 — `categoryStats` 4 progress bar)
- 마감 임박 (기존 `urgentTasks` 2개)
- **REMOVE**: dash-next-action (액션 탭 owner), 오늘 완료 chip section, 결심 트래커 (TODO routing comment)

**수익 (revenue)** — 6 컴포넌트, `_renderDashRevenuePanel` 신규:
- 총 수익 (누적/이번 달) — 기존 `getRevenueStats()` 활용
- 월별 추이 (기존 monthlyData chart)
- 카테고리별 수익 (기존 categoryData progress)
- **NEW: 월 목표 vs 실적** — 새 함수 `getMonthlyGoal()`. settings에 `monthlyRevenueGoal` 저장. progress bar + remaining + 일평균. 목표 미설정 시 prompt 권유
- **NEW: 시간당 ROI 막대** — 새 함수 `getROIBreakdown()`. 부업 task별 `expectedRevenue / estimatedTime`. 가로 막대 list (top 4)
- 자산관리로 내보내기 (기존 `exportToAssetManager()` — panel 맨 아래)

**건강 (health)** — 5 컴포넌트, `_renderDashHealthPanel`:
- 수면 패턴 7일 (기존 `rhythmStats.sleepData`)
- 근무 패턴 (기존 4 stat)
- 복약 통계 (기존 4 stat)
- **NEW: 수면-완료율 correlation** — 새 함수 `getSleepCompletionCorrelation()`. 수면 시간대 (<5h / 5-6h / 6-7h / 7-8h / 8h+) 별 평균 완료율. optimal band highlight. 가로 bar 5 row
- **NEW: 수면 부채 누적** — 새 함수 `getSleepDebt()`. 7일 누적 vs 목표 (default 7h × 7 = 49h). 회복 권고 (오늘 자야 할 시간 = 평소 + (debt / 7))

**패턴 (patterns)** — 6 컴포넌트, `_renderDashPatternsPanel`:
- 생산적 시간대 (기존 hourlyProd)
- 활발 요일 (기존 dayProd)
- 카테고리 분배 파이 (기존 catDist)
- 습관 트래커 12주 (기존 `getHabitTrackerData()`)
- **NEW: 카테고리 × 시간대 heatmap** — 새 함수 `getCategoryTimeHeatmap()`. 4 row (본업/부업/일상/가족) × 5 col (아침/점심/오후/저녁/밤). 셀 = 완료 count. level-1~4 + peak class. hint 메시지 자동 생성 ("본업 = X / 부업 = Y / ...")
- **NEW: 반복 미루기 task** — 새 함수 `getDeferredTasks()`. `postponeTask()` 호출 횟수 카운팅 — appState.tasks에 `postponedCount` field 추가 (postponeTask 호출 시 increment). top 3 sorted desc

### 3. `css/dashboard.css` — 새 스타일 추가

Port from mockup `02-dashboard-tab.html` (450+ lines new CSS):
- `.dashboard-sub-tabs`, `.dash-sub-tab`, `.dash-sub-tab-count` (active 색 = `--accent-primary`)
- `.dash-panel`, `.dash-panel.active` (display toggle + fadeIn 0.2s)
- Hero v3: `.dash-hero-clean`, `.dash-hero-row-top`, `.dash-hero-clock` (40px mono), `.dash-hero-mode-pill`, `.dash-hero-mode-bar`, `.dash-hero-completion`, `.dash-hero-alert-pill`, `.dash-hero-streak-line`
- Timeline: `.day-timeline-track`, `.day-timeline-zone.work/.leisure/.survival/.commute`, `.day-timeline-task.done/.pending.urgent/.active`, `.day-timeline-now`, `.day-timeline-legend`, `.day-timeline-next-mode`
- Revenue: `.roi-bar-item`, `.roi-bar-track`, `.roi-bar-fill`, `.roi-bar-value`, `.monthly-goal`, `.monthly-goal-bar-fill`
- Health: `.sleep-corr-row`, `.sleep-corr-fill.good/.warning/.bad`, `.sleep-corr-row.optimal`, `.sleep-debt`, `.sleep-debt-num.neg/.pos`, `.sleep-debt-rec`
- Patterns: `.cat-time-heatmap` (grid 50px + 5 col), `.heatmap-cell.level-1~4`, `.heatmap-cell.peak`, `.heatmap-row-label.본업/.부업/.일상/.가족`, `.deferred-item`, `.deferred-rank`, `.deferred-count`

### 4. 새 분석 함수 (별도 helper file 권장)

Add to `js/render-dashboard-sections.js` 또는 별도 `js/dashboard-analytics.js` (load order 후 register `window.*`):

```javascript
function getDayTimelineData() { /* 오늘 task + 모드 zone + now position */ }
function getMonthlyGoal() { /* settings + 진행률 */ }
function getROIBreakdown(limit = 4) { /* expectedRevenue / estimatedTime, sorted desc */ }
function getSleepCompletionCorrelation() { /* 30일 수면 시간대 별 평균 완료율 */ }
function getSleepDebt(days = 7, targetHours = 7) { /* 누적 부채 + 회복 권고 */ }
function getCategoryTimeHeatmap() { /* 4×5 grid + peak detection */ }
function getDeferredTasks(limit = 3) { /* postponedCount sorted desc */ }
function setDashboardSubView(view) {
  appState.dashboardSubView = view;
  saveState();
  renderStatic();
}
window.setDashboardSubView = setDashboardSubView;
```

If new analytics file is created, register script tag in `navigator-v5.html` BUT do not modify navigator-v5.html — instead instruct CC in handoff to add the tag.

### 5. `postponeTask()` increment (state mutation)

In existing `postponeTask(id)` function (file = ?, locate via grep), add `task.postponedCount = (task.postponedCount || 0) + 1` before save. Add JSDoc note.

## Scope

- **IN**: `js/render-dashboard.js`, `js/render-dashboard-sections.js`, `css/dashboard.css`. New file `js/dashboard-analytics.js` allowed.
- **OUT**: `navigator-v5.html` (CC will add new script tag), other tabs, action tab files, other projects
- **postponeTask** location may be in `actions-*.js` — modify only that 1 function (1 line addition for postponedCount)

## Handoff

- Output modified files with line counts
- List new functions added with brief signature
- Any divergence from mockup (icon name, color choice) — note in handoff
- **DO NOT commit. DO NOT push.** CC reviews per Rule #14.

## Verification

Open `navigator-v5.html` in browser, click dashboard tab:
1. Sub-tab nav visible (전체/수익/건강/패턴) — default 전체
2. Hero v3: 시계 38px + 모드 pill + mode progress bar + 완료 + 긴급 pill + streak inline
3. Day timeline below hero: 24h axis + mode zones + task dots + now marker + next-mode countdown
4. Switching sub-tabs (수익) → revenue panel: 총 수익 + 월별 + 카테고리 + **NEW 월 목표 + ROI 막대** + 자산관리 buttons
5. Switching to 건강 → sleep + 근무 + 복약 + **NEW 수면-완료율 + 수면 부채**
6. Switching to 패턴 → 시간대 + 요일 + 파이 + 습관 + **NEW heatmap + deferred**
7. No emoji visible
8. Other tabs unchanged

## Notes

- This is Track A pilot #2 (dashboard). Action tab pilot #1 已 완료.
- 분석 함수가 새로 추가되므로 `state-types.js` 의 Task interface에 `postponedCount?: number` 추가 OUT-of-scope (whitelist 밖) — TODO comment in `actions-*.js` 의 postponeTask 함수.
