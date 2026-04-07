// ============================================
// 본업 탭 토글 / 접힘 / 확장 상태
// (work.js에서 분리)
// ============================================

/**
 * 뷰 전환
 */
function setWorkView(view) {
  appState.workView = view;
  renderStatic();
}
window.setWorkView = setWorkView;

// 본업 달력 상태 초기화
if (appState.workCalendarYear === undefined) {
  appState.workCalendarYear = new Date().getFullYear();
  appState.workCalendarMonth = new Date().getMonth();
}

function selectWorkCalendarDate(dateStr) {
  appState.workCalendarSelected = dateStr;
  renderStatic();
}
window.selectWorkCalendarDate = selectWorkCalendarDate;

function navigateWorkCalendar(direction) {
  let month = (appState.workCalendarMonth !== undefined ? appState.workCalendarMonth : new Date().getMonth()) + direction;
  let year = appState.workCalendarYear || new Date().getFullYear();
  if (month < 0) { month = 11; year--; }
  if (month > 11) { month = 0; year++; }
  appState.workCalendarMonth = month;
  appState.workCalendarYear = year;
  appState.workCalendarSelected = null;
  renderStatic();
}
window.navigateWorkCalendar = navigateWorkCalendar;

/**
 * 아카이브 토글
 */
function toggleArchivedProjects() {
  appState.showArchivedProjects = !appState.showArchivedProjects;
  renderStatic();
}
window.toggleArchivedProjects = toggleArchivedProjects;

/**
 * 빠른 추가 owner 토글 (나 ↔ 기타)
 */
function toggleWorkQuickOwner() {
  appState.workQuickAddOwner = appState.workQuickAddOwner === 'other' ? 'me' : 'other';
  renderStatic();
  // 포커스 복원
  setTimeout(() => {
    const input = document.getElementById('work-quick-input');
    if (input) input.focus();
  }, 50);
}
window.toggleWorkQuickOwner = toggleWorkQuickOwner;

function toggleWorkSection(section) {
  if (!appState.workSectionExpanded) {
    appState.workSectionExpanded = {};
  }
  appState.workSectionExpanded[section] = !appState.workSectionExpanded[section];
  renderStatic();
}
window.toggleWorkSection = toggleWorkSection;

// 스테이지 접기/펼치기 (세션 중 유지, 비영속)
if (!appState.collapsedStages) appState.collapsedStages = {};

function toggleStageCollapse(projectId, stageIdx) {
  const key = projectId + '-' + stageIdx;
  const current = appState.collapsedStages[key];
  // Determine effective state (considering default for completed stages)
  const project = (appState.workProjects || []).find(p => p.id === projectId);
  const stage = project && project.stages[stageIdx];
  const isCompletedStage = stage && stage.completed;
  let effectivelyCollapsed;
  if (current === 'explicit-collapsed') effectivelyCollapsed = true;
  else if (current === 'explicit-expanded') effectivelyCollapsed = false;
  else effectivelyCollapsed = !!isCompletedStage; // default
  // Toggle and save as explicit user preference
  appState.collapsedStages[key] = effectivelyCollapsed ? 'explicit-expanded' : 'explicit-collapsed';
  renderStatic();
}
window.toggleStageCollapse = toggleStageCollapse;

// 중분류(subcategory) 접기/펼치기 (세션 중 유지, 비영속)
if (!appState.collapsedSubcategories) appState.collapsedSubcategories = {};

function toggleSubcategoryCollapse(projectId, stageIdx, subcatIdx) {
  const key = projectId + '-' + stageIdx + '-' + subcatIdx;
  const current = appState.collapsedSubcategories[key];
  const project = (appState.workProjects || []).find(p => p.id === projectId);
  const subcat = project && project.stages[stageIdx] &&
    (project.stages[stageIdx].subcategories || [])[subcatIdx];
  const isAllDone = subcat && subcat.tasks.length > 0 &&
    subcat.tasks.every(t => t.status === 'completed');
  let effectivelyCollapsed;
  if (current === 'explicit-collapsed') effectivelyCollapsed = true;
  else if (current === 'explicit-expanded') effectivelyCollapsed = false;
  else effectivelyCollapsed = !!isAllDone;
  appState.collapsedSubcategories[key] = effectivelyCollapsed ? 'explicit-expanded' : 'explicit-collapsed';
  renderStatic();
}
window.toggleSubcategoryCollapse = toggleSubcategoryCollapse;

// 소분류(항목) 텍스트 펼치기/접기 (DOM 직접 조작 — renderStatic 호출 안 함)
if (!appState.expandedWorkTasks) appState.expandedWorkTasks = {};

function toggleTaskExpand(projectId, stageIdx, subcatIdx, taskIdx) {
  const key = projectId + '-' + stageIdx + '-' + subcatIdx + '-' + taskIdx;
  if (appState.expandedWorkTasks[key]) {
    delete appState.expandedWorkTasks[key];
  } else {
    appState.expandedWorkTasks[key] = true;
  }
  const el = document.getElementById('task-title-' + key);
  if (el) el.classList.toggle('expanded');
}
window.toggleTaskExpand = toggleTaskExpand;

// Task detail (logs section) accordion — DOM 직접 조작
if (!appState.expandedWorkTaskDetails) appState.expandedWorkTaskDetails = {};

function toggleTaskDetailExpand(projectId, stageIdx, subcatIdx, taskIdx) {
  const key = projectId + '-' + stageIdx + '-' + subcatIdx + '-' + taskIdx;
  const wasExpanded = !!appState.expandedWorkTaskDetails[key];
  if (wasExpanded) {
    delete appState.expandedWorkTaskDetails[key];
  } else {
    appState.expandedWorkTaskDetails[key] = true;
  }
  const expanded = !wasExpanded;
  const detailEl = document.getElementById('task-detail-' + key);
  if (detailEl) detailEl.classList.toggle('work-task-detail-hidden', !expanded);
  const chevronEl = document.querySelector('[data-detail-key="' + key + '"]');
  if (chevronEl) {
    const count = chevronEl.getAttribute('data-log-count');
    chevronEl.textContent = expanded ? '▼' : '▶ ' + count + '기록';
    chevronEl.title = expanded ? '기록 접기' : '기록 펼치기';
  }
}
window.toggleTaskDetailExpand = toggleTaskDetailExpand;

/**
 * 작업 로그 접기/펼치기 (DOM 직접 조작 — renderStatic 호출 안 함)
 */
function toggleWorkLogs(taskUid) {
  const hidden = document.getElementById('logs-hidden-' + taskUid);
  const toggle = document.getElementById('logs-toggle-' + taskUid);
  if (!hidden || !toggle) return;
  if (!appState.expandedWorkLogs) appState.expandedWorkLogs = {};
  const isOpen = hidden.classList.contains('expanded');
  if (isOpen) {
    hidden.classList.remove('expanded');
    toggle.textContent = toggle.textContent.replace('▼', '▶');
    delete appState.expandedWorkLogs[taskUid];
  } else {
    hidden.classList.add('expanded');
    toggle.textContent = toggle.textContent.replace('▶', '▼');
    appState.expandedWorkLogs[taskUid] = true;
  }
}
window.toggleWorkLogs = toggleWorkLogs;
