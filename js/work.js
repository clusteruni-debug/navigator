const WORK_REDESIGN_SUBTABS = ['all', 'projects', 'general', 'ended'];
const WORK_REDESIGN_PROJECT_VIEWS = ['cards', 'calendar', 'timeline'];
const WORK_REDESIGN_GENERAL_SORTS = ['deadline', 'recent', 'time'];
const WORK_ENDED_SORTS = ['recent', 'oldest', 'name'];
const WORK_ENDED_PAGE_SIZE = 10;

function _workIcon(name, size) {
  if (typeof _renderActionIcon === 'function') {
    const icon = _renderActionIcon(name, size || 16, 'work-svg-icon');
    if (icon) return icon;
  }
  if (typeof svgIcon === 'function') return svgIcon(name, size || 16);
  return '';
}

function _ensureWorkRedesignState() {
  if (!WORK_REDESIGN_SUBTABS.includes(appState.workSubTab)) appState.workSubTab = 'all';
  if (!WORK_REDESIGN_PROJECT_VIEWS.includes(appState.workProjectView)) {
    appState.workProjectView = WORK_REDESIGN_PROJECT_VIEWS.includes(appState.workView) ? appState.workView : 'cards';
  }
  if (!WORK_REDESIGN_GENERAL_SORTS.includes(appState.workGeneralSort)) appState.workGeneralSort = 'deadline';
  if (!appState.workEndedSort || typeof appState.workEndedSort !== 'object') {
    appState.workEndedSort = { completed: 'recent', archived: 'recent' };
  }
  if (!appState.workEndedPage || typeof appState.workEndedPage !== 'object') {
    appState.workEndedPage = { completed: 1, archived: 1 };
  }
  if (typeof appState.workGeneralDonePage !== 'number' || appState.workGeneralDonePage < 1) appState.workGeneralDonePage = 1;
}

function _isActiveWorkProject(project) {
  return !!project && !project.archived && !project.onHold && !project.completed;
}

function _parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(String(dateStr).substring(0, 10) + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

function _daysUntil(dateStr) {
  const target = _parseLocalDate(dateStr);
  if (!target) return null;
  const today = _parseLocalDate(getLocalDateStr());
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function _formatShortDate(dateStr) {
  const d = _parseLocalDate(dateStr);
  if (!d) return '';
  return (d.getMonth() + 1) + '/' + d.getDate();
}

// 완료일 표시용 한국식 전체 날짜 (YYYY.MM.DD) — native date input의 로케일 US 형식 대체
function _formatKoreanDate(dateStr) {
  const d = _parseLocalDate(dateStr);
  if (!d) return '날짜 없음';
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

function _deadlineLabel(dateStr) {
  const days = _daysUntil(dateStr);
  if (days === null) return '마감 없음';
  if (days < 0) return 'D+' + Math.abs(days);
  if (days === 0) return 'D-Day';
  return 'D-' + days;
}

function _deadlineClass(dateStr) {
  const days = _daysUntil(dateStr);
  if (days === null) return 'none';
  if (days <= 1) return 'urgent';
  if (days <= 7) return 'warn';
  return '';
}

function _renderDdayChip(dateStr, fallback) {
  const cls = _deadlineClass(dateStr);
  const label = dateStr ? _deadlineLabel(dateStr) : (fallback || '마감 없음');
  return '<span class="work-dday-chip ' + cls + '">' + escapeHtml(label) + '</span>';
}

function _projectStats(project) {
  const stages = project.stages || [];
  let totalTasks = 0;
  let completedTasks = 0;
  stages.forEach(stage => {
    (stage.subcategories || []).forEach(sub => {
      (sub.tasks || []).forEach(task => {
        totalTasks += 1;
        if (task.status === 'completed') completedTasks += 1;
      });
    });
  });
  const completedStages = stages.filter(stage => stage.completed).length;
  const currentStage = stages.findIndex(stage => !stage.completed);
  return {
    totalStages: stages.length,
    completedStages,
    currentStage: currentStage >= 0 ? currentStage : Math.max(0, stages.length - 1),
    totalTasks,
    completedTasks
  };
}

function _collectProjectWorkItems() {
  const items = [];
  (appState.workProjects || []).filter(p => !p.archived && !p.onHold && !p.completed).forEach(project => {
    if (isProjectCompleted(project)) return;
    (project.stages || []).forEach((stage, stageIdx) => {
      (stage.subcategories || []).forEach((subcat, subcatIdx) => {
        (subcat.tasks || []).forEach((task, taskIdx) => {
          if (task.status === 'completed') return;
          items.push({
            source: 'project',
            id: task.id || project.id + '-' + stageIdx + '-' + subcatIdx + '-' + taskIdx,
            title: task.title || '',
            deadline: task.deadline || null,
            estimatedTime: task.estimatedTime || null,
            updatedAt: task.completedAt || task.updatedAt || project.updatedAt || project.createdAt || '',
            projectId: project.id,
            projectName: project.name || '',
            stageName: (typeof getStageName === 'function') ? getStageName(project, stageIdx) : (stage.name || ('단계 ' + (stageIdx + 1))),
            stageIdx,
            subcatIdx,
            taskIdx
          });
        });
      });
    });
  });
  return items;
}

function _collectGeneralWorkItems(includeCompleted) {
  return (appState.tasks || [])
    .filter(task => task.category === '본업' && !task.workProjectId && (includeCompleted ? task.completed : !task.completed))
    .map(task => ({
      source: 'general',
      id: task.id,
      title: task.title || '',
      deadline: task.deadline || null,
      estimatedTime: task.estimatedTime || null,
      updatedAt: task.updatedAt || task.createdAt || '',
      completedAt: task.completedAt || '',
      completed: !!task.completed
    }));
}

function _collectOpenWorkItems() {
  return _collectProjectWorkItems().concat(_collectGeneralWorkItems(false));
}

function _sortByDeadlineThenRecent(a, b) {
  const da = _daysUntil(a.deadline);
  const db = _daysUntil(b.deadline);
  if (da !== null && db !== null && da !== db) return da - db;
  if (da !== null && db === null) return -1;
  if (da === null && db !== null) return 1;
  return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
}

function _workItemMeta(item) {
  const parts = [];
  if (item.source === 'project') {
    parts.push('프로젝트 task');
    if (item.projectName) parts.push(item.projectName);
    if (item.stageName) parts.push(item.stageName);
  } else {
    parts.push('일반 업무');
  }
  if (item.estimatedTime) parts.push(Number(item.estimatedTime) + '분');
  if (item.deadline) parts.push(_formatShortDate(item.deadline));
  return parts.join(' · ');
}

function _workItemCompleteAction(item) {
  if (item.source === 'project') {
    return "toggleWorkTaskComplete('" + escapeAttr(item.projectId) + "', " + item.stageIdx + ', ' + item.subcatIdx + ', ' + item.taskIdx + ')';
  }
  return "completeTask('" + escapeAttr(item.id) + "')";
}

function _renderWorkTaskRow(item, options) {
  const opts = options || {};
  const urgency = _deadlineClass(item.deadline);
  const completeAction = item.completed
    ? "uncompleteTask('" + escapeAttr(item.id) + "')"
    : _workItemCompleteAction(item);
  const editAction = item.source === 'project'
    ? "promptRenameWorkTask('" + escapeAttr(item.projectId) + "', " + item.stageIdx + ', ' + item.subcatIdx + ', ' + item.taskIdx + ')'
    : "editTask('" + escapeAttr(item.id) + "')";
  const deleteAction = item.source === 'project'
    ? "deleteWorkTask('" + escapeAttr(item.projectId) + "', " + item.stageIdx + ', ' + item.subcatIdx + ', ' + item.taskIdx + ')'
    : "deleteTask('" + escapeAttr(item.id) + "')";

  return '<div class="work-redesign-task-row cat-work ' + urgency + (item.completed ? ' completed' : '') + '">' +
    '<button class="work-row-check cat-work" onclick="event.stopPropagation(); ' + completeAction + '" aria-label="' + (item.completed ? '완료 취소' : '작업 완료') + '">' +
      _workIcon(item.completed ? 'check' : 'circle', 14) +
    '</button>' +
    '<div class="work-row-main">' +
      '<div class="work-row-title">' + escapeHtml(item.title || '제목 없음') + '</div>' +
      '<div class="work-row-meta"><span class="work-cat-tag">본업</span><span>' + escapeHtml(_workItemMeta(item)) + '</span></div>' +
    '</div>' +
    _renderDdayChip(item.deadline, opts.fallbackDateLabel) +
    '<div class="work-row-actions">' +
      '<button class="work-row-action" onclick="event.stopPropagation(); ' + editAction + '" title="수정" aria-label="수정">' + _workIcon('edit', 14) + '</button>' +
      '<button class="work-row-action danger" onclick="event.stopPropagation(); ' + deleteAction + '" title="삭제" aria-label="삭제">' + _workIcon('x', 14) + '</button>' +
    '</div>' +
  '</div>';
}

function _completedThisWeekCount() {
  const today = _parseLocalDate(getLocalDateStr());
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  let count = 0;

  _collectGeneralWorkItems(true).forEach(item => {
    const d = _parseLocalDate(item.completedAt);
    if (d && d >= start && d <= end) count += 1;
  });

  (appState.workProjects || []).forEach(project => {
    (project.stages || []).forEach(stage => {
      (stage.subcategories || []).forEach(subcat => {
        (subcat.tasks || []).forEach(task => {
          if (task.status !== 'completed') return;
          const d = _parseLocalDate(task.completedAt);
          if (d && d >= start && d <= end) count += 1;
        });
      });
    });
  });
  return count;
}

// 완료된 일반업무 전체 (이전엔 최근 7일만 — 사용자 요청으로 전체 노출, 표시는 페이지네이션으로 렌더 상한)
function _completedGeneralItems() {
  return _collectGeneralWorkItems(true)
    .filter(item => !!item.completedAt)
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
}

function _renderWorkHeader(activeCount) {
  return '<div class="work-redesign-head">' +
    '<div class="work-redesign-title">' +
      '<span class="work-title-bar"></span>' +
      '<span>본업</span>' +
      '<span class="work-title-meta">활성 프로젝트 ' + activeCount + '</span>' +
    '</div>' +
    '<div class="work-head-actions">' +
      '<button class="work-primary-action" onclick="showWorkModal(\'project\')">' + _workIcon('plus', 14) + '<span>새 프로젝트</span></button>' +
      '<button class="work-icon-action" onclick="createRoV3Project()" title="RO v3 프로젝트" aria-label="RO v3 프로젝트">' + _workIcon('clipboard-list', 15) + '</button>' +
      '<button class="work-icon-action" onclick="showWorkModal(\'template-manage\')" title="템플릿 관리" aria-label="템플릿 관리">' + _workIcon('list', 15) + '</button>' +
    '</div>' +
  '</div>';
}

function _renderWorkSubtabs() {
  const tabs = [
    { key: 'all', label: '전체', icon: 'list' },
    { key: 'projects', label: '프로젝트', icon: 'briefcase' },
    { key: 'general', label: '일반업무', icon: 'check' },
    { key: 'ended', label: '완료·보관', icon: 'archive' }
  ];
  return '<div class="work-subtabs" role="tablist" aria-label="본업 하위 탭">' +
    tabs.map(tab => {
      const active = appState.workSubTab === tab.key;
      return '<button class="work-subtab-btn cat-work ' + (active ? 'active' : '') + '" id="work-subtab-btn-' + tab.key + '" role="tab" aria-selected="' + active + '" aria-controls="work-subtab-panel-' + tab.key + '" onclick="setWorkSubTab(\'' + tab.key + '\')">' +
        _workIcon(tab.icon, 15) + '<span>' + escapeHtml(tab.label) + '</span>' +
      '</button>';
    }).join('') +
  '</div>';
}

function _renderWorkAnchors(activeProjects) {
  const openItems = _collectOpenWorkItems();
  const soonCount = openItems.filter(item => {
    const days = _daysUntil(item.deadline);
    return days !== null && days <= 3;
  }).length;
  const staleCount = activeProjects.filter(project => getProjectStaleDays(project) >= 7).length;
  return '<div class="work-anchor-row" aria-label="본업 핵심 상태">' +
    '<button class="work-anchor urgent" onclick="setWorkSubTab(\'all\')" aria-label="마감 임박 ' + soonCount + '개 — 전체 할일 보기 (filter 미구현, 다음 cycle 적용 예정)"><span>마감 임박</span><strong>' + soonCount + '</strong></button>' +
    '<button class="work-anchor warn" onclick="setWorkSubTab(\'projects\'); setWorkProjectView(\'cards\')"><span>정체 7일+</span><strong>' + staleCount + '</strong></button>' +
    '<button class="work-anchor cat-work" onclick="setWorkSubTab(\'projects\'); setWorkProjectView(\'cards\')"><span>활성 프로젝트</span><strong>' + activeProjects.length + '</strong></button>' +
    '<button class="work-anchor success" onclick="setWorkSubTab(\'general\'); toggleWorkRecentDone(true)"><span>이번 주 완료</span><strong>' + _completedThisWeekCount() + '</strong></button>' +
  '</div>';
}

function _renderWorkFocusCard() {
  const result = (typeof getWorkFocus === 'function') ? getWorkFocus() : { task: null, mode: 'empty' };
  const focus = result.task;

  if (result.mode === 'empty') {
    return '<div class="work-focus-panel cat-work"><span class="work-focus-label">지금 집중</span><div class="work-focus-main"><div class="work-focus-title">대기 중인 본업 task가 없습니다</div><div class="work-focus-meta">프로젝트나 일반 업무를 추가하면 여기에 표시됩니다</div></div></div>';
  }
  if (result.mode === 'all-done') {
    return '<div class="work-focus-panel cat-work complete"><span class="work-focus-label">지금 집중</span><div class="work-focus-main"><div class="work-focus-title">현재 본업 task가 모두 완료되었습니다</div><div class="work-focus-meta">다음 프로젝트 단계나 일반 업무를 추가할 수 있습니다</div></div></div>';
  }
  if (!focus) return '';

  const isGeneral = result.mode === 'general' || !focus._projectId;
  const completeAction = isGeneral
    ? "completeTask('" + escapeAttr(focus.id) + "')"
    : "toggleWorkTaskComplete('" + escapeAttr(focus._projectId) + "', " + focus._stageIdx + ', ' + focus._subcatIdx + ', ' + focus._taskIdx + ')';
  const meta = isGeneral
    ? ['일반 업무', focus.estimatedTime ? Number(focus.estimatedTime) + '분' : ''].filter(Boolean).join(' · ')
    : [focus._projectName, focus._stageName, focus.estimatedTime ? Number(focus.estimatedTime) + '분' : '', focus.deadline ? _deadlineLabel(focus.deadline) : ''].filter(Boolean).join(' · ');

  return '<div class="work-focus-panel cat-work">' +
    '<span class="work-focus-label">지금 집중</span>' +
    '<div class="work-focus-main">' +
      '<div class="work-focus-title">' + escapeHtml(focus.title || '제목 없음') + '</div>' +
      '<div class="work-focus-meta">' + escapeHtml(meta) + '</div>' +
    '</div>' +
    '<button class="work-focus-cta" onclick="event.stopPropagation(); ' + completeAction + '">' + _workIcon('check', 14) + '<span>완료</span></button>' +
  '</div>';
}

function _projectOpenItems(project) {
  return _collectProjectWorkItems()
    .filter(item => item.projectId === project.id)
    .sort(_sortByDeadlineThenRecent);
}

function _renderStageProgress(project, stats) {
  const pills = (project.stages || []).map((stage, idx) => {
    const cls = stage.completed ? 'completed' : (idx === stats.currentStage ? 'current' : 'upcoming');
    return '<span class="work-stage-pill ' + cls + '"></span>';
  }).join('');
  return '<div class="work-stage-progress" aria-label="단계 진행률">' + (pills || '<span class="work-stage-pill upcoming"></span>') + '</div>';
}

function _renderAllProjectSection(project) {
  const stats = _projectStats(project);
  const items = _projectOpenItems(project);
  const expanded = !!(appState.workExpandedProjectSections && appState.workExpandedProjectSections[project.id]);
  const visible = expanded ? items : items.slice(0, 3);
  const more = Math.max(0, items.length - visible.length);
  const staleDays = getProjectStaleDays(project);
  const meta = stats.completedTasks + '/' + stats.totalTasks + ' 항목 · ' + stats.completedStages + '/' + stats.totalStages + ' 단계' + (staleDays >= 7 ? ' · ' + staleDays + '일 정체' : '');

  return '<section class="work-project-section ' + _deadlineClass(project.deadline) + '" data-work-project-section="' + escapeAttr(project.id) + '">' +
    '<button class="work-project-section-head" onclick="openWorkProjectDetail(\'' + escapeAttr(project.id) + '\')">' +
      '<span class="work-project-section-title"><strong>' + escapeHtml(project.name || '제목 없음') + '</strong><small>' + escapeHtml(meta) + '</small></span>' +
      _renderStageProgress(project, stats) +
      '<span class="work-project-section-tail">' + _renderDdayChip(project.deadline) + _workIcon('target', 14) + '</span>' +
    '</button>' +
    '<div class="work-task-list-redesign">' + (visible.map(item => _renderWorkTaskRow(item)).join('') || '<div class="work-empty-inline">활성 task 없음</div>') + '</div>' +
    (more > 0 ? '<button class="work-section-more" aria-expanded="' + expanded + '" onclick="toggleWorkProjectSection(\'' + escapeAttr(project.id) + '\')">' + (expanded ? '접기' : '+' + more + '개 더') + '</button>' : '') +
    '<div class="work-section-quickadd"><input id="work-project-quick-' + escapeAttr(project.id) + '" type="text" placeholder="이 프로젝트에 task 추가" onkeydown="if(event.key===\'Enter\') quickAddWorkProjectTask(\'' + escapeAttr(project.id) + '\')"><button class="work-icon-action" onclick="quickAddWorkProjectTask(\'' + escapeAttr(project.id) + '\')" aria-label="프로젝트 task 추가">' + _workIcon('plus', 14) + '</button></div>' +
  '</section>';
}

function _renderAllGeneralSection() {
  const items = _sortByDeadlineThenRecent ? _collectGeneralWorkItems(false).sort(_sortByDeadlineThenRecent) : _collectGeneralWorkItems(false);
  const expanded = !!appState.workExpandedGeneralSection;
  const visible = expanded ? items : items.slice(0, 3);
  const more = Math.max(0, items.length - visible.length);
  return '<section class="work-project-section general" data-work-project-section="general">' +
    '<button class="work-project-section-head" onclick="setWorkSubTab(\'general\')">' +
      '<span class="work-project-section-title"><strong>일반 업무</strong><small>프로젝트 미연결 본업 · ' + items.length + '개</small></span>' +
      '<span class="work-project-section-tail">' + _workIcon('list', 14) + '</span>' +
    '</button>' +
    '<div class="work-task-list-redesign">' + (visible.map(item => _renderWorkTaskRow(item)).join('') || '<div class="work-empty-inline">일반 업무 없음</div>') + '</div>' +
    (more > 0 ? '<button class="work-section-more" aria-expanded="' + expanded + '" onclick="toggleWorkGeneralSection()">' + (expanded ? '접기' : '+' + more + '개 더') + '</button>' : '') +
    '<div class="work-section-quickadd"><input id="work-quick-input-all" type="text" placeholder="새 일반 업무 추가" onkeydown="if(event.key===\'Enter\') quickAddWorkTask()"><button class="work-icon-action" onclick="quickAddWorkTask()" aria-label="일반 업무 추가">' + _workIcon('plus', 14) + '</button></div>' +
  '</section>';
}

function _renderWorkAllTab(activeProjects) {
  const sections = activeProjects.map(_renderAllProjectSection).join('') + _renderAllGeneralSection();
  return '<div class="work-subtab-content active" id="work-subtab-panel-all" role="tabpanel" aria-labelledby="work-subtab-btn-all" data-work-subtab="all">' +
    _renderWorkFocusCard() +
    '<div class="work-project-dashboard">' + sections + '</div>' +
  '</div>';
}

function _renderProjectViewToggle() {
  const views = [
    { key: 'cards', label: '카드', icon: 'briefcase' },
    { key: 'calendar', label: '캘린더', icon: 'calendar' },
    { key: 'timeline', label: '타임라인', icon: 'bar-chart' }
  ];
  return '<div class="work-project-view-toggle" aria-label="프로젝트 보기 모드">' +
    views.map(view => {
      const active = appState.workProjectView === view.key;
      return '<button class="work-view-toggle-btn ' + (active ? 'active cat-work' : '') + '" role="button" aria-pressed="' + active + '" onclick="setWorkProjectView(\'' + view.key + '\')">' +
        _workIcon(view.icon, 14) + '<span>' + escapeHtml(view.label) + '</span>' +
      '</button>';
    }).join('') +
  '</div>';
}

function _activeProjectOrFirst(activeProjects) {
  const selected = activeProjects.find(project => project.id === appState.activeWorkProject);
  if (selected) return selected;
  if (activeProjects[0]) appState.activeWorkProject = activeProjects[0].id;
  return activeProjects[0] || null;
}

function _stageIndexFor(project) {
  if (!appState.workStageByProject) appState.workStageByProject = {};
  const saved = Number(appState.workStageByProject[project.id]);
  if (Number.isInteger(saved) && saved >= 0 && saved < (project.stages || []).length) return saved;
  const current = (project.stages || []).findIndex(stage => !stage.completed);
  return current >= 0 ? current : 0;
}

function _renderProjectMaster(activeProjects) {
  const selected = appState.activeWorkProject;
  let content;
  if (appState.workProjectView === 'calendar' && typeof renderWorkCalendarView === 'function') {
    content = renderWorkCalendarView();
  } else if (appState.workProjectView === 'timeline' && typeof renderWorkTimeline === 'function') {
    content = renderWorkTimeline();
  } else {
    const list = activeProjects.map(project => {
      const stats = _projectStats(project);
      const active = project.id === selected;
      const stale = getProjectStaleDays(project);
      return '<button class="work-master-project ' + (active ? 'active ' : '') + _deadlineClass(project.deadline) + '" onclick="openWorkProjectDetail(\'' + escapeAttr(project.id) + '\')" aria-current="' + active + '">' +
        '<span class="work-master-project-head"><strong>' + escapeHtml(project.name || '제목 없음') + '</strong>' + _renderDdayChip(project.deadline) + '</span>' +
        _renderStageProgress(project, stats) +
        '<small>' + stats.completedTasks + '/' + stats.totalTasks + ' 항목 · ' + stats.completedStages + '/' + stats.totalStages + ' 단계' + (stale >= 7 ? ' · ' + stale + '일 정체' : '') + '</small>' +
      '</button>';
    }).join('');
    content = list || '<div class="work-empty-inline">활성 프로젝트 없음</div>';
  }
  return '<aside class="work-master-panel">' + _renderProjectViewToggle() + '<div class="work-master-list" data-view="' + escapeAttr(appState.workProjectView) + '">' + content + '</div></aside>';
}

function _stageStats(stage) {
  const tasks = (stage.subcategories || []).flatMap(subcat => subcat.tasks || []);
  return { total: tasks.length, done: tasks.filter(task => task.status === 'completed').length };
}

function _renderStageTabs(project, activeIdx) {
  return '<div class="work-stage-tabs" role="tablist" aria-label="프로젝트 단계">' + (project.stages || []).map((stage, idx) => {
    const active = idx === activeIdx;
    const stats = _stageStats(stage);
    const btnId = 'work-stage-tab-' + escapeAttr(project.id) + '-' + idx;
    const panelId = 'work-stage-panel-' + escapeAttr(project.id) + '-' + idx;
    return '<button id="' + btnId + '" class="work-stage-tab ' + (stage.completed ? 'completed ' : '') + (active ? 'active' : '') + '" role="tab" aria-selected="' + active + '" aria-controls="' + panelId + '" onclick="setWorkStage(\'' + escapeAttr(project.id) + '\',' + idx + ')"><span>' + escapeHtml(getStageName(project, idx)) + '</span><small>' + stats.done + '/' + stats.total + '</small></button>';
  }).join('') + '<button class="work-add-cta work-add-cta--ghost" onclick="promptAddStage(\'' + escapeAttr(project.id) + '\')" aria-label="새 단계 추가" title="새 단계 추가">' + _workIcon('plus', 14) + '<span>단계</span></button>' + '</div>';
}

function _renderSubcategory(project, stageIdx, subcat, subcatIdx) {
  const key = project.id + '-' + stageIdx + '-' + subcatIdx;
  const val = appState.collapsedSubcategories && appState.collapsedSubcategories[key];
  const done = (subcat.tasks || []).filter(task => task.status === 'completed').length;
  const total = (subcat.tasks || []).length;
  const expanded = val === 'explicit-expanded' || (val !== 'explicit-collapsed' && done < total);
  const bodyId = 'work-subcat-panel-' + escapeAttr(key);
  return '<section class="work-v3-subcat" aria-expanded="' + expanded + '">' +
    '<button class="work-v3-subcat-head" aria-expanded="' + expanded + '" aria-controls="' + bodyId + '" onclick="toggleSubcategoryCollapse(\'' + escapeAttr(project.id) + '\',' + stageIdx + ',' + subcatIdx + ')">' +
      '<span>' + _workIcon(expanded ? 'chevron-down' : 'menu', 13) + escapeHtml(subcat.name || '중분류') + '</span><strong>' + done + '/' + total + '</strong>' +
    '</button>' +
    (expanded ? '<div id="' + bodyId + '" class="work-v3-subcat-body">' + ((subcat.tasks || []).map((task, taskIdx) => renderWorkTask(project.id, stageIdx, subcatIdx, task, taskIdx)).join('') || '<div class="work-empty-inline">항목 없음</div>') + '<div class="work-layer-add-row"><button class="work-add-cta work-add-cta--subtle" onclick="showWorkModal(\'task\', \'' + escapeAttr(project.id) + '\',' + stageIdx + ',' + subcatIdx + ')" aria-label="새 항목 추가">' + _workIcon('plus', 14) + '<span>새 항목</span></button></div>' + '</div>' : '') +
  '</section>';
}

function _renderProjectDetail(project) {
  if (!project) return '<section class="work-detail-panel"><div class="work-empty-state"><div class="work-empty-title">프로젝트를 선택하세요</div></div></section>';
  const stats = _projectStats(project);
  const stageIdx = _stageIndexFor(project);
  const stage = (project.stages || [])[stageIdx] || { subcategories: [] };
  const stagePanelId = 'work-stage-panel-' + escapeAttr(project.id) + '-' + stageIdx;
  const stageTabId = 'work-stage-tab-' + escapeAttr(project.id) + '-' + stageIdx;
  return '<section class="work-detail-panel" aria-label="프로젝트 상세">' +
    '<div class="work-detail-header"><button class="work-back-btn" onclick="showWorkProjectMaster()">' + _workIcon('chevron-down', 14) + '<span>프로젝트 목록</span></button><div><h2>' + escapeHtml(project.name || '제목 없음') + '</h2><p>' + stats.completedTasks + '/' + stats.totalTasks + ' 항목 · ' + stats.completedStages + '/' + stats.totalStages + ' 단계</p></div><div class="work-detail-actions"><button class="work-icon-action" onclick="renameWorkProject(\'' + escapeAttr(project.id) + '\')" aria-label="프로젝트 이름 변경">' + _workIcon('edit', 14) + '</button><button class="work-icon-action" onclick="showProjectMoreMenu(event, \'' + escapeAttr(project.id) + '\')" aria-label="프로젝트 더보기">' + _workIcon('menu', 14) + '</button></div></div>' +
    _renderStageTabs(project, stageIdx) +
    '<div id="' + stagePanelId + '" class="work-stage-panel" role="tabpanel" aria-labelledby="' + stageTabId + '">' + ((stage.subcategories || []).length > 0 ? ((stage.subcategories || []).map((subcat, subcatIdx) => _renderSubcategory(project, stageIdx, subcat, subcatIdx)).join('') + '<div class="work-layer-add-row"><button class="work-add-cta work-add-cta--outline" onclick="showWorkModal(\'subcategory\', \'' + escapeAttr(project.id) + '\',' + stageIdx + ')" aria-label="새 중분류 추가">' + _workIcon('plus', 14) + '<span>새 중분류</span></button></div>') : '<div class="work-empty-state"><div class="work-empty-title">중분류가 없습니다</div><button class="work-add-cta" onclick="showWorkModal(\'subcategory\', \'' + escapeAttr(project.id) + '\',' + stageIdx + ')">' + _workIcon('plus', 14) + '<span>새 중분류</span></button></div>') + '</div>' +
    '<footer class="work-detail-footer"><span>' + escapeHtml(getStageName(project, stageIdx)) + ' · ' + _stageStats(stage).done + '/' + _stageStats(stage).total + '</span></footer>' +
  '</section>';
}

function _renderWorkProjectsTab(activeProjects) {
  const selectedProject = _activeProjectOrFirst(activeProjects);
  const isFullWidthView = appState.workProjectView === 'calendar' || appState.workProjectView === 'timeline';
  return '<div class="work-subtab-content active" id="work-subtab-panel-projects" role="tabpanel" aria-labelledby="work-subtab-btn-projects" data-work-subtab="projects">' +
    '<div class="work-master-detail ' + (appState.workMobileDrillIn ? 'detail-open ' : '') + (isFullWidthView ? 'full-width-view' : '') + '">' + _renderProjectMaster(activeProjects) + _renderProjectDetail(selectedProject) + '</div>' +
  '</div>';
}

function _renderGeneralSortChip(key, label) {
  const active = appState.workGeneralSort === key;
  return '<button class="work-chip ' + (active ? 'active cat-work' : '') + '" onclick="setWorkGeneralSort(\'' + key + '\')">' + escapeHtml(label) + '</button>';
}

function _sortGeneralItems(items) {
  const sorted = [...items];
  if (appState.workGeneralSort === 'recent') {
    sorted.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  } else if (appState.workGeneralSort === 'time') {
    sorted.sort((a, b) => (a.estimatedTime || 9999) - (b.estimatedTime || 9999));
  } else {
    sorted.sort(_sortByDeadlineThenRecent);
  }
  return sorted;
}

function _renderGeneralQuickAdd() {
  return '<div class="work-general-quick-add">' +
    '<input type="text" id="work-quick-input" class="work-general-quick-input" placeholder="새 일반 업무 추가" onkeypress="if(event.key===\'Enter\') quickAddWorkTask()">' +
    '<button class="work-primary-action" onclick="quickAddWorkTask()">' + _workIcon('plus', 14) + '<span>일반업무 추가</span></button>' +
  '</div>';
}

function _renderRecentDoneExpander(doneItems) {
  const expanded = !!appState.workRecentDoneExpanded;
  let body = '';
  if (expanded) {
    const totalPages = Math.max(1, Math.ceil(doneItems.length / WORK_ENDED_PAGE_SIZE));
    let page = appState.workGeneralDonePage || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    appState.workGeneralDonePage = page; // clamp 결과 저장
    const start = (page - 1) * WORK_ENDED_PAGE_SIZE;
    const pageItems = doneItems.slice(start, start + WORK_ENDED_PAGE_SIZE);
    body = '<div class="work-recent-done-body">' +
      (pageItems.map(item => '<div class="work-recent-done-row"><span>' + escapeHtml(item.title || '제목 없음') + '</span><time>' + escapeHtml(_formatShortDate(item.completedAt)) + '</time></div>').join('') || '<div class="work-recent-done-empty">완료 기록이 없습니다</div>') +
      _renderGeneralDonePagination(page, totalPages) +
      '<button class="work-history-link" onclick="switchTab(\'history\')">일반 업무 히스토리 열기</button>' +
    '</div>';
  }
  return '<div class="work-recent-done">' +
    '<button class="work-recent-done-head" onclick="toggleWorkRecentDone()">' +
      '<span>' + _workIcon('check', 14) + '완료 <strong>' + doneItems.length + '</strong></span>' +
      '<span>' + _workIcon(expanded ? 'chevron-down' : 'chevron-right', 14) + '</span>' +
    '</button>' +
    body +
  '</div>';
}

// 완료 일반업무 페이지네이션 — ended 탭과 동일 버튼/윈도잉 재사용, 핸들러만 별도
function _renderGeneralDonePagination(page, totalPages) {
  if (totalPages <= 1) return '';
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const nums = _endedPageNumbers(page, totalPages).map(p => {
    if (p === '…') return '<span class="work-ended-page-ellipsis" aria-hidden="true">…</span>';
    const active = p === page;
    return '<button class="work-ended-page-btn ' + (active ? 'active cat-work' : '') + '"' + (active ? ' aria-current="page"' : '') + ' onclick="setWorkGeneralDonePage(' + p + ')" aria-label="' + p + '페이지">' + p + '</button>';
  }).join('');
  return '<nav class="work-ended-pagination" aria-label="완료 일반업무 페이지 이동">' +
    '<button class="work-ended-page-btn nav"' + (prevDisabled ? ' disabled' : '') + ' onclick="setWorkGeneralDonePage(' + (page - 1) + ')" aria-label="이전 페이지">◂</button>' +
    nums +
    '<button class="work-ended-page-btn nav"' + (nextDisabled ? ' disabled' : '') + ' onclick="setWorkGeneralDonePage(' + (page + 1) + ')" aria-label="다음 페이지">▸</button>' +
  '</nav>';
}

function setWorkGeneralDonePage(page) {
  const n = parseInt(page, 10);
  if (!Number.isFinite(n) || n < 1) return;
  _ensureWorkRedesignState();
  appState.workGeneralDonePage = n;
  appState.workRecentDoneExpanded = true; // 페이지 이동 시 펼침 유지
  renderStatic();
}
window.setWorkGeneralDonePage = setWorkGeneralDonePage;

function _renderWorkGeneralTab() {
  const items = _sortGeneralItems(_collectGeneralWorkItems(false));
  const visibleCount = appState.workShowAllGeneralTasks ? items.length : 5;
  const visibleItems = items.slice(0, visibleCount);
  const moreCount = Math.max(0, items.length - visibleCount);
  const doneItems = _completedGeneralItems();

  return '<div class="work-subtab-content active" id="work-subtab-panel-general" role="tabpanel" aria-labelledby="work-subtab-btn-general" data-work-subtab="general">' +
    _renderGeneralQuickAdd() +
    '<div class="work-toolbar">' +
      '<div class="work-chip-row"><span class="work-chip-label">정렬</span>' +
        _renderGeneralSortChip('deadline', '마감') +
        _renderGeneralSortChip('recent', '최근') +
        _renderGeneralSortChip('time', '시간') +
      '</div>' +
      '<span class="work-chip-label">총 ' + items.length + '개</span>' +
    '</div>' +
    '<div class="work-task-list-redesign">' +
      (visibleItems.map(item => _renderWorkTaskRow(item)).join('') || '<div class="work-empty-state"><div class="work-empty-title">일반 업무가 없습니다</div><div class="work-empty-desc">프로젝트와 연결되지 않은 본업 task가 여기에 모입니다</div></div>') +
    '</div>' +
    (moreCount > 0 ? '<button class="work-more-row" onclick="appState.workShowAllGeneralTasks=true; renderStatic();">+' + moreCount + '개 더 보기</button>' : '') +
    _renderRecentDoneExpander(doneItems) +
  '</div>';
}

// ── ended 탭: 정렬 + 페이지네이션 헬퍼 ──────────────────────────────
function _sortEndedList(list, sortKey, dateField) {
  const arr = list.slice();
  if (sortKey === 'name') {
    arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
  } else if (sortKey === 'oldest') {
    arr.sort((a, b) => new Date(a[dateField] || 0) - new Date(b[dateField] || 0));
  } else { // 'recent' (기본)
    arr.sort((a, b) => new Date(b[dateField] || 0) - new Date(a[dateField] || 0));
  }
  return arr;
}

function _endedSortLabel(key) {
  if (key === 'oldest') return '오래된순';
  if (key === 'name') return '이름순';
  return '최신순';
}

function _renderEndedSortChips(group, current) {
  return '<div class="work-chip-row work-ended-sort" role="group" aria-label="정렬">' +
    WORK_ENDED_SORTS.map(key => {
      const active = current === key;
      return '<button class="work-chip ' + (active ? 'active cat-work' : '') + '" role="button" aria-pressed="' + active + '" onclick="setWorkEndedSort(\'' + group + '\',\'' + key + '\')">' + escapeHtml(_endedSortLabel(key)) + '</button>';
    }).join('') +
  '</div>';
}

// 윈도우드 페이지 번호: 총 7p 이하 전부, 초과 시 1 … cur-1 cur cur+1 … last
function _endedPageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const wanted = [1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages);
  const sorted = [...new Set(wanted)].sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

function _renderEndedPagination(group, page, totalPages) {
  if (totalPages <= 1) return '';
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const nums = _endedPageNumbers(page, totalPages).map(p => {
    if (p === '…') return '<span class="work-ended-page-ellipsis" aria-hidden="true">…</span>';
    const active = p === page;
    return '<button class="work-ended-page-btn ' + (active ? 'active cat-work' : '') + '"' + (active ? ' aria-current="page"' : '') + ' onclick="setWorkEndedPage(\'' + group + '\',' + p + ')" aria-label="' + p + '페이지">' + p + '</button>';
  }).join('');
  return '<nav class="work-ended-pagination" aria-label="페이지 이동">' +
    '<button class="work-ended-page-btn nav"' + (prevDisabled ? ' disabled' : '') + ' onclick="setWorkEndedPage(\'' + group + '\',' + (page - 1) + ')" aria-label="이전 페이지">◂</button>' +
    nums +
    '<button class="work-ended-page-btn nav"' + (nextDisabled ? ' disabled' : '') + ' onclick="setWorkEndedPage(\'' + group + '\',' + (page + 1) + ')" aria-label="다음 페이지">▸</button>' +
  '</nav>';
}

function setWorkEndedSort(group, key) {
  if (group !== 'completed' && group !== 'archived') return;
  if (!WORK_ENDED_SORTS.includes(key)) return;
  _ensureWorkRedesignState();
  appState.workEndedSort[group] = key;
  appState.workEndedPage[group] = 1; // 정렬 변경 시 1페이지로
  renderStatic();
}
window.setWorkEndedSort = setWorkEndedSort;

function setWorkEndedPage(group, page) {
  if (group !== 'completed' && group !== 'archived') return;
  const n = parseInt(page, 10);
  if (!Number.isFinite(n) || n < 1) return;
  _ensureWorkRedesignState();
  appState.workEndedPage[group] = n; // 상한 clamp는 그룹 렌더에서 처리
  renderStatic();
}
window.setWorkEndedPage = setWorkEndedPage;

function _renderEndedProjectRow(project, type) {
  const isCompleted = type === 'completed';
  const dateField = isCompleted ? 'completedAt' : 'updatedAt';
  const rawDate = project[dateField];
  const restoreLabel = isCompleted ? '↩ 완료 취소' : '📤 복원';
  const restoreAction = isCompleted
    ? "completeWorkProject('" + escapeAttr(project.id) + "')"
    : "archiveWorkProject('" + escapeAttr(project.id) + "')";

  // 완료 행: 완료일 = 한국식 텍스트(YYYY.MM.DD) + 투명 date input 오버레이(클릭 시 native picker)
  //          → 로케일 US 형식/회색 폼박스 대신 앱 톤에 맞는 칩, 편집 편의 유지
  // 보관 행: 보관일 정적 표시
  const dateCell = isCompleted
    ? '<span class="work-ended-date-prefix">완료일</span>' +
      '<span class="work-ended-date-field">' +
        '<span class="work-ended-date-text">' + escapeHtml(_formatKoreanDate(rawDate)) + '</span>' +
        '<input type="date" class="work-ended-date-overlay" value="' + escapeAttr(rawDate ? String(rawDate).substring(0, 10) : '') + '" onclick="event.stopPropagation(); if(this.showPicker){try{this.showPicker()}catch(e){}}" onchange="event.stopPropagation(); setWorkProjectCompletedAt(\'' + escapeAttr(project.id) + '\', this.value)" aria-label="완료일 수정">' +
      '</span>'
    : '<span class="work-ended-date-static">보관일 · ' + escapeHtml(_formatShortDate(rawDate) || '날짜 없음') + '</span>';

  return '<div class="work-redesign-task-row cat-work completed">' +
    '<span class="work-row-check cat-work" aria-hidden="true">' + _workIcon(isCompleted ? 'check' : 'archive', 14) + '</span>' +
    '<div class="work-row-main">' +
      '<div class="work-row-title">' + escapeHtml(project.name || '제목 없음') + '</div>' +
      '<div class="work-row-meta">' + dateCell + '</div>' +
    '</div>' +
    '<div class="work-row-actions">' +
      '<button class="work-row-action" onclick="event.stopPropagation(); renameWorkProject(\'' + escapeAttr(project.id) + '\')" title="이름 수정" aria-label="이름 수정">' + _workIcon('edit', 14) + '</button>' +
      '<button class="work-row-action" onclick="event.stopPropagation(); ' + restoreAction + '" title="' + escapeAttr(restoreLabel) + '" aria-label="' + escapeAttr(restoreLabel) + '">' + escapeHtml(restoreLabel) + '</button>' +
    '</div>' +
  '</div>';
}

function _renderEndedProjectGroup(title, projects, type) {
  _ensureWorkRedesignState();
  const sortKey = appState.workEndedSort[type] || 'recent';
  const dateField = type === 'completed' ? 'completedAt' : 'updatedAt';
  const sorted = _sortEndedList(projects, sortKey, dateField);

  const totalPages = Math.max(1, Math.ceil(sorted.length / WORK_ENDED_PAGE_SIZE));
  let page = appState.workEndedPage[type] || 1;
  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;
  appState.workEndedPage[type] = page; // clamp 결과 다시 저장
  const start = (page - 1) * WORK_ENDED_PAGE_SIZE;
  const pageItems = sorted.slice(start, start + WORK_ENDED_PAGE_SIZE);

  const rangeNote = sorted.length > WORK_ENDED_PAGE_SIZE
    ? '<small class="work-ended-range">' + (start + 1) + '–' + (start + pageItems.length) + ' / ' + sorted.length + '</small>'
    : '';

  return '<section class="work-project-section" data-work-ended-group="' + escapeAttr(type) + '">' +
    '<div class="work-project-section-head" aria-label="' + escapeAttr(title) + '">' +
      '<span class="work-project-section-title"><strong>' + escapeHtml(title) + '</strong><small>종료된 본업 프로젝트</small></span>' +
      '<span class="work-project-section-tail">' + _workIcon(type === 'completed' ? 'check' : 'archive', 14) + '</span>' +
    '</div>' +
    (sorted.length > 1 ? '<div class="work-ended-controls">' + _renderEndedSortChips(type, sortKey) + rangeNote + '</div>' : '') +
    '<div class="work-task-list-redesign">' +
      (pageItems.map(project => _renderEndedProjectRow(project, type)).join('') || '<div class="work-empty-inline">프로젝트 없음</div>') +
    '</div>' +
    _renderEndedPagination(type, page, totalPages) +
  '</section>';
}

function _renderWorkEndedTab() {
  _ensureWorkRedesignState();
  const projects = appState.workProjects || [];
  const completedList = projects.filter(project => project.completed);
  const archivedList = projects.filter(project => project.archived && !project.completed);

  if (completedList.length === 0 && archivedList.length === 0) {
    return '<div class="work-subtab-content active" id="work-subtab-panel-ended" role="tabpanel" aria-labelledby="work-subtab-btn-ended" data-work-subtab="ended">' +
      '<div class="work-empty-state"><div class="work-empty-title">완료하거나 보관한 프로젝트가 없습니다.</div><div class="work-empty-desc">프로젝트 더보기 메뉴에서 완료 또는 보관을 선택하면 여기에 표시됩니다.</div></div>' +
    '</div>';
  }

  return '<div class="work-subtab-content active" id="work-subtab-panel-ended" role="tabpanel" aria-labelledby="work-subtab-btn-ended" data-work-subtab="ended">' +
    '<div class="work-project-dashboard">' +
      _renderEndedProjectGroup('✅ 완료 (' + completedList.length + ')', completedList, 'completed') +
      _renderEndedProjectGroup('📦 보관 (' + archivedList.length + ')', archivedList, 'archived') +
    '</div>' +
  '</div>';
}

function renderWorkProjects() {
  _ensureWorkRedesignState();

  const activeProjects = (appState.workProjects || [])
    .filter(_isActiveWorkProject)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  let content = '';
  if (appState.workSubTab === 'all') content = _renderWorkAllTab(activeProjects);
  else if (appState.workSubTab === 'general') content = _renderWorkGeneralTab();
  else if (appState.workSubTab === 'ended') content = _renderWorkEndedTab();
  else content = _renderWorkProjectsTab(activeProjects);

  return '<div class="work-projects-container work-redesign">' +
    _renderWorkHeader(activeProjects.length) +
    _renderWorkSubtabs() +
    (appState.workSubTab === 'ended' ? '' : _renderWorkAnchors(activeProjects)) +
    content +
  '</div>';
}

function setWorkSubTab(tab) {
  if (!WORK_REDESIGN_SUBTABS.includes(tab)) return;
  appState.workSubTab = tab;
  if (tab === 'projects' && !WORK_REDESIGN_PROJECT_VIEWS.includes(appState.workProjectView)) appState.workProjectView = 'cards';
  renderStatic();
}
window.setWorkSubTab = setWorkSubTab;

function setWorkProjectView(view) {
  if (!WORK_REDESIGN_PROJECT_VIEWS.includes(view)) return;
  appState.workSubTab = 'projects';
  appState.workProjectView = view;
  appState.workView = 'detail';
  appState.workMobileDrillIn = false;
  renderStatic();
}
window.setWorkProjectView = setWorkProjectView;

function openWorkProjectDetail(projectId) {
  appState.workSubTab = 'projects';
  appState.workView = 'detail';
  appState.workMobileDrillIn = true;
  if (typeof selectWorkProject === 'function') selectWorkProject(projectId);
  else { appState.activeWorkProject = projectId; renderStatic(); }
}
window.openWorkProjectDetail = openWorkProjectDetail;

function showWorkProjectMaster() { appState.workMobileDrillIn = false; renderStatic(); }
window.showWorkProjectMaster = showWorkProjectMaster;

function setWorkStage(projectId, stageIdx) {
  if (!appState.workStageByProject) appState.workStageByProject = {};
  appState.workStageByProject[projectId] = stageIdx; renderStatic();
}
window.setWorkStage = setWorkStage;

function toggleWorkProjectSection(projectId) {
  if (!appState.workExpandedProjectSections) appState.workExpandedProjectSections = {};
  appState.workExpandedProjectSections[projectId] = !appState.workExpandedProjectSections[projectId];
  renderStatic();
}
window.toggleWorkProjectSection = toggleWorkProjectSection;

function toggleWorkGeneralSection() { appState.workExpandedGeneralSection = !appState.workExpandedGeneralSection; renderStatic(); }
window.toggleWorkGeneralSection = toggleWorkGeneralSection;

function quickAddWorkProjectTask(projectId) {
  const input = document.getElementById('work-project-quick-' + projectId);
  if (!input || !input.value.trim()) return;
  const project = (appState.workProjects || []).find(p => p.id === projectId);
  if (!project) return;
  if (!project.stages || project.stages.length === 0) project.stages = [{ id: generateId(), name: '1단계', completed: false, subcategories: [] }];
  const stageIdx = _stageIndexFor(project);
  const stage = project.stages[stageIdx];
  if (!stage.subcategories || stage.subcategories.length === 0) stage.subcategories = [{ id: generateId(), name: '일반', tasks: [] }];
  const title = input.value.trim();
  stage.subcategories[0].tasks.push({
    id: generateId(),
    title,
    status: 'not-started',
    owner: 'me',
    estimatedTime: 30,
    actualTime: null,
    completedAt: null,
    logs: []
  });
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  input.value = '';
  renderStatic();
  if (typeof showToast === 'function') showToast(title + ' 추가됨', 'success');
}
window.quickAddWorkProjectTask = quickAddWorkProjectTask;

function setWorkGeneralSort(sort) {
  if (!WORK_REDESIGN_GENERAL_SORTS.includes(sort)) return;
  appState.workGeneralSort = sort;
  renderStatic();
}
window.setWorkGeneralSort = setWorkGeneralSort;

function toggleWorkRecentDone(forceOpen) {
  appState.workRecentDoneExpanded = forceOpen === true ? true : !appState.workRecentDoneExpanded;
  renderStatic();
}
window.toggleWorkRecentDone = toggleWorkRecentDone;
