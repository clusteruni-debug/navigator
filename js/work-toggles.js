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

// "지금 집중" compact ↔ full 토글 (localStorage 영속)
if (typeof appState.workFocusExpanded === 'undefined') {
  try {
    appState.workFocusExpanded = localStorage.getItem('navigator-work-focus-expanded') === '1';
  } catch (e) { appState.workFocusExpanded = false; }
}

function toggleWorkFocusExpanded() {
  appState.workFocusExpanded = !appState.workFocusExpanded;
  try { localStorage.setItem('navigator-work-focus-expanded', appState.workFocusExpanded ? '1' : '0'); } catch (e) {}
  renderStatic();
}
window.toggleWorkFocusExpanded = toggleWorkFocusExpanded;

// 빠른 작성 텍스트 영역 펼침 토글
function toggleWorkSketchExpanded(projectId) {
  if (!appState.workSketchExpanded) appState.workSketchExpanded = {};
  appState.workSketchExpanded[projectId] = !appState.workSketchExpanded[projectId];
  renderStatic();
  setTimeout(() => {
    const el = document.getElementById('work-sketch-textarea-' + projectId);
    if (el && appState.workSketchExpanded[projectId]) el.focus();
  }, 50);
}
window.toggleWorkSketchExpanded = toggleWorkSketchExpanded;

// 빠른 작성 → 트리에 적용
function applySketchFromInput(projectId) {
  const el = document.getElementById('work-sketch-textarea-' + projectId);
  if (!el) return;
  const text = el.value;
  if (!text.trim()) {
    if (typeof showToast === 'function') showToast('빈 텍스트 — 추가할 내용 없음', 'warning');
    return;
  }
  const result = applySketchToProject(projectId, text);
  if (result.success) {
    el.value = '';
    if (typeof showToast === 'function') showToast(result.addedCount + '개 항목 추가됨', 'success');
    renderStatic();
  } else {
    if (typeof showToast === 'function') showToast('추가 실패: ' + result.error, 'error');
  }
}
window.applySketchFromInput = applySketchFromInput;

// 노션 보고서 아카이브 영역 펼침 토글
function toggleWorkArchiveExpanded(projectId) {
  if (!appState.workArchiveExpanded) appState.workArchiveExpanded = {};
  appState.workArchiveExpanded[projectId] = !appState.workArchiveExpanded[projectId];
  renderStatic();
}
window.toggleWorkArchiveExpanded = toggleWorkArchiveExpanded;

// 노션 보고서 편집 모드 토글
function toggleWorkArchiveEditing(projectId) {
  if (!appState.workArchiveEditing) appState.workArchiveEditing = {};
  appState.workArchiveEditing[projectId] = !appState.workArchiveEditing[projectId];
  renderStatic();
  setTimeout(() => {
    const el = document.getElementById('work-archive-textarea-' + projectId);
    if (el && appState.workArchiveEditing[projectId]) el.focus();
  }, 50);
}
window.toggleWorkArchiveEditing = toggleWorkArchiveEditing;

// 노션 보고서 저장 (paste된 마크다운을 project.archivedReport에)
function saveArchivedReport(projectId) {
  const el = document.getElementById('work-archive-textarea-' + projectId);
  if (!el) return;
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  project.archivedReport = el.value || null;
  project.updatedAt = new Date().toISOString();
  if (!appState.workArchiveEditing) appState.workArchiveEditing = {};
  appState.workArchiveEditing[projectId] = false;
  saveWorkProjects();
  renderStatic();
  if (typeof showToast === 'function') showToast('보고서 저장됨', 'success');
}
window.saveArchivedReport = saveArchivedReport;

// work task 안 subtask 완료 토글 (RO v3 템플릿의 subtasks 체크리스트)
function toggleWorkTaskSubtaskComplete(projectId, stageIdx, subcatIdx, taskIdx, subtaskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages?.[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task || !task.subtasks?.[subtaskIdx]) return;
  task.subtasks[subtaskIdx].completed = !task.subtasks[subtaskIdx].completed;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.toggleWorkTaskSubtaskComplete = toggleWorkTaskSubtaskComplete;

// task 우선순위 cycle (0 → 1 → 2 → 3 → 4 → 5 → 0)
function cycleTaskPriority(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages?.[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;
  task.priority = ((task.priority || 0) + 1) % 6;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.cycleTaskPriority = cycleTaskPriority;

// 스테이지 접기/펼치기 (세션 중 유지, 비영속)
if (!appState.collapsedStages) appState.collapsedStages = {};

function toggleStageCollapse(projectId, stageIdx) {
  const key = projectId + '-' + stageIdx;
  const current = appState.collapsedStages[key];
  // Determine effective state (default: only current stage expanded, others collapsed)
  const project = (appState.workProjects || []).find(p => p.id === projectId);
  const _currentIdx = project ? project.stages.findIndex(s => !s.completed) : -1;
  let effectivelyCollapsed;
  if (current === 'explicit-collapsed') effectivelyCollapsed = true;
  else if (current === 'explicit-expanded') effectivelyCollapsed = false;
  else effectivelyCollapsed = (_currentIdx === -1 || stageIdx !== _currentIdx); // default: only current stage expanded
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

// 긴 log 본문 개별 접기/펴기 (세션 메모리 only)
if (!appState.expandedWorkLogContents) appState.expandedWorkLogContents = {};

function toggleWorkLogContent(logKey) {
  if (!appState.expandedWorkLogContents) appState.expandedWorkLogContents = {};
  if (appState.expandedWorkLogContents[logKey]) {
    delete appState.expandedWorkLogContents[logKey];
  } else {
    appState.expandedWorkLogContents[logKey] = true;
  }
  renderStatic();
}
window.toggleWorkLogContent = toggleWorkLogContent;

// 한 작업 항목 안의 긴 log 본문 일괄 접기/펴기
// (전부 펼쳐져 있으면 전부 접기, 아니면 전부 펼치기)
function toggleAllWorkLogContents(projectId, stageIdx, subcatIdx, taskIdx) {
  if (!appState.expandedWorkLogContents) appState.expandedWorkLogContents = {};
  const project = (appState.workProjects || []).find(p => p.id === projectId);
  if (!project) return;
  const stage = project.stages && project.stages[stageIdx];
  const subcat = stage && stage.subcategories && stage.subcategories[subcatIdx];
  const task = subcat && subcat.tasks && subcat.tasks[taskIdx];
  if (!task || !task.logs) return;

  const taskUid = task.id || (projectId + '-' + stageIdx + '-' + subcatIdx + '-' + taskIdx);
  // 긴 log만 대상 (짧은 건 처음부터 접기 대상이 아님)
  const longLogKeys = task.logs
    .map((log, idx) => {
      const c = log.content || '';
      const isLong = c.length > 250 || c.split('\n').length >= 5;
      return isLong ? (taskUid + '-log-' + idx) : null;
    })
    .filter(k => k !== null);

  if (longLogKeys.length === 0) return;

  const allExpanded = longLogKeys.every(k => appState.expandedWorkLogContents[k]);
  if (allExpanded) {
    longLogKeys.forEach(k => { delete appState.expandedWorkLogContents[k]; });
  } else {
    longLogKeys.forEach(k => { appState.expandedWorkLogContents[k] = true; });
  }
  renderStatic();
}
window.toggleAllWorkLogContents = toggleAllWorkLogContents;
