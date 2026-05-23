const WORK_REDESIGN_SUBTABS = ['all', 'projects', 'general'];
const WORK_REDESIGN_PROJECT_VIEWS = ['cards', 'calendar', 'timeline'];
const WORK_REDESIGN_ALL_FILTERS = ['all', 'project', 'general'];
const WORK_REDESIGN_GENERAL_SORTS = ['deadline', 'recent', 'time'];

function _workIcon(name, size) {
  if (typeof _renderActionIcon === 'function') {
    const icon = _renderActionIcon(name, size || 16, 'work-svg-icon');
    if (icon) return icon;
  }
  if (typeof svgIcon === 'function') return svgIcon(name, size || 16);
  return '';
}

function _ensureWorkRedesignState() {
  if (!WORK_REDESIGN_SUBTABS.includes(appState.workSubTab)) appState.workSubTab = 'projects';
  if (!WORK_REDESIGN_PROJECT_VIEWS.includes(appState.workProjectView)) {
    appState.workProjectView = WORK_REDESIGN_PROJECT_VIEWS.includes(appState.workView) ? appState.workView : 'cards';
  }
  if (!WORK_REDESIGN_ALL_FILTERS.includes(appState.workAllFilter)) appState.workAllFilter = 'all';
  if (!WORK_REDESIGN_GENERAL_SORTS.includes(appState.workGeneralSort)) appState.workGeneralSort = 'deadline';
  if (typeof appState.workSearchQuery !== 'string') appState.workSearchQuery = '';
}

function _isActiveWorkProject(project) {
  return !!project && !project.archived && !project.onHold && !isProjectCompleted(project);
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
  (appState.workProjects || []).filter(p => !p.archived && !p.onHold).forEach(project => {
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

function _matchesWorkSearch(item) {
  const query = String(appState.workSearchQuery || '').trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    item.title,
    item.projectName,
    item.stageName,
    item.source === 'project' ? '프로젝트 task' : '일반 업무'
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
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

function _recentCompletedGeneralItems() {
  const today = _parseLocalDate(getLocalDateStr());
  const since = new Date(today);
  since.setDate(since.getDate() - 6);
  return _collectGeneralWorkItems(true)
    .filter(item => {
      const d = _parseLocalDate(item.completedAt);
      return d && d >= since && d <= today;
    })
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
    { key: 'general', label: '일반업무', icon: 'check' }
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
    '<button class="work-anchor urgent" onclick="setWorkSubTab(\'all\'); setWorkAllFilter(\'all\')"><span>마감 임박</span><strong>' + soonCount + '</strong></button>' +
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

function _renderFilterChip(kind, label) {
  const active = appState.workAllFilter === kind;
  return '<button class="work-chip ' + (active ? 'active cat-work' : '') + '" onclick="setWorkAllFilter(\'' + kind + '\')">' +
    (kind === 'all' ? '' : '<span class="work-chip-swatch"></span>') +
    '<span>' + escapeHtml(label) + '</span>' +
  '</button>';
}

function _renderWorkAllTab() {
  let items = _collectOpenWorkItems().filter(_matchesWorkSearch);
  if (appState.workAllFilter === 'project') items = items.filter(item => item.source === 'project');
  if (appState.workAllFilter === 'general') items = items.filter(item => item.source === 'general');
  items.sort(_sortByDeadlineThenRecent);

  const groups = [
    { key: 'today', label: '오늘', predicate: item => { const d = _daysUntil(item.deadline); return d !== null && d <= 0; } },
    { key: 'this-week', label: '이번 주', predicate: item => { const d = _daysUntil(item.deadline); return d !== null && d > 0 && d <= 7; } },
    { key: 'next-week', label: '다음 주', predicate: item => { const d = _daysUntil(item.deadline); return d !== null && d > 7 && d <= 14; } },
    { key: 'later', label: '나중', predicate: item => _daysUntil(item.deadline) === null || _daysUntil(item.deadline) > 14 }
  ];

  const groupedHtml = groups.map(group => {
    const groupItems = items.filter(group.predicate);
    if (groupItems.length === 0) return '';
    return '<section class="work-time-group" data-group="' + group.key + '">' +
      '<div class="work-section-heading"><span>' + group.label + '</span><span class="count">' + groupItems.length + '</span></div>' +
      '<div class="work-task-list-redesign">' + groupItems.map(item => _renderWorkTaskRow(item)).join('') + '</div>' +
    '</section>';
  }).join('');

  return '<div class="work-subtab-content active" id="work-subtab-panel-all" role="tabpanel" aria-labelledby="work-subtab-btn-all" data-work-subtab="all">' +
    '<div class="work-toolbar">' +
      '<div class="work-chip-row">' +
        _renderFilterChip('all', '전체') +
        _renderFilterChip('project', '프로젝트 task') +
        _renderFilterChip('general', '일반 업무') +
      '</div>' +
      '<label class="work-search">' + _workIcon('search', 15) +
        '<input type="search" value="' + escapeAttr(appState.workSearchQuery || '') + '" placeholder="본업 검색" oninput="setWorkSearch(this.value)">' +
      '</label>' +
    '</div>' +
    _renderWorkFocusCard() +
    (groupedHtml || '<div class="work-empty-state"><div class="work-empty-title">표시할 본업 task가 없습니다</div><div class="work-empty-desc">필터나 검색어를 조정하거나 새 업무를 추가하세요</div></div>') +
  '</div>';
}

function _renderProjectCard(project) {
  const stats = _projectStats(project);
  const staleDays = getProjectStaleDays(project);
  const stagePills = (project.stages || []).map((stage, idx) => {
    const cls = stage.completed ? 'completed' : (idx === stats.currentStage ? 'current' : 'upcoming');
    return '<span class="work-stage-pill ' + cls + '"></span>';
  }).join('');
  const meta = [
    stats.completedTasks + '/' + stats.totalTasks + ' 항목',
    stats.completedStages + '/' + stats.totalStages + ' 단계',
    staleDays >= 7 ? staleDays + '일 정체' : ''
  ].filter(Boolean).join(' · ');

  return '<article class="work-project-card-redesign ' + _deadlineClass(project.deadline) + '">' +
    '<div class="work-project-card-head">' +
      '<h3>' + escapeHtml(project.name || '제목 없음') + '</h3>' +
      _renderDdayChip(project.deadline) +
    '</div>' +
    '<div class="work-stage-progress" aria-label="단계 진행률">' + (stagePills || '<span class="work-stage-pill upcoming"></span>') + '</div>' +
    '<div class="work-project-meta">' + escapeHtml(meta || '항목 없음') + '</div>' +
    '<div class="work-project-card-actions">' +
      '<button class="work-project-card-action" onclick="selectWorkProject(\'' + escapeAttr(project.id) + '\')">' + _workIcon('target', 13) + '<span>선택</span></button>' +
    '</div>' +
  '</article>';
}

function _renderProjectCardsView(activeProjects) {
  if (activeProjects.length === 0) {
    return '<div class="work-empty-state"><div class="work-empty-title">활성 프로젝트가 없습니다</div><div class="work-empty-desc">새 프로젝트를 만들면 카드, 캘린더, 타임라인에 표시됩니다</div><button class="work-primary-action" onclick="showWorkModal(\'project\')">' + _workIcon('plus', 14) + '<span>프로젝트 만들기</span></button></div>';
  }
  const visible = appState.workShowAllProjectCards ? activeProjects : activeProjects.slice(0, 3);
  return '<div class="work-project-cards-view">' +
    _renderWorkFocusCard() +
    '<div class="work-project-grid-redesign">' + visible.map(_renderProjectCard).join('') + '</div>' +
    (activeProjects.length > 3 ? '<button class="work-more-row" onclick="appState.workShowAllProjectCards=!appState.workShowAllProjectCards; renderStatic();">' + (appState.workShowAllProjectCards ? '접기' : '+' + (activeProjects.length - 3) + '개 더 보기') + '</button>' : '') +
  '</div>';
}

function _projectDeadlineMap(projects) {
  const map = {};
  projects.forEach(project => {
    if (!project.deadline) return;
    const key = project.deadline.substring(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(project);
  });
  return map;
}

function _renderProjectCalendarView(activeProjects) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayStr = getLocalDateStr(now);
  const first = new Date(year, month, 1);
  const mondayStartOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayStartOffset);
  const deadlineMap = _projectDeadlineMap(activeProjects);
  const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];
  const cells = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = getLocalDateStr(d);
    const projects = deadlineMap[key] || [];
    const muted = d.getMonth() !== month ? ' muted' : '';
    const today = key === todayStr ? ' today' : '';
    const deadline = projects.length > 0 ? ' deadline ' + _deadlineClass(key) : '';
    const firstProject = projects[0];
    cells.push('<div class="work-calendar-cell' + muted + today + deadline + '">' +
      '<span class="work-calendar-day">' + d.getDate() + '</span>' +
      (firstProject ? '<span class="work-calendar-deadline">' + escapeHtml(firstProject.name) + '</span>' : '') +
      (projects.length > 1 ? '<span class="work-calendar-more">+' + (projects.length - 1) + '</span>' : '') +
    '</div>');
  }

  return '<div class="work-project-calendar-view">' +
    '<div class="work-section-heading"><span>' + year + '년 ' + (month + 1) + '월 프로젝트 마감</span><span class="count">' + activeProjects.filter(p => p.deadline).length + '</span></div>' +
    '<div class="work-calendar-weekdays">' + weekdayLabels.map(label => '<div>' + label + '</div>').join('') + '</div>' +
    '<div class="work-calendar-grid">' + cells.join('') + '</div>' +
  '</div>';
}

function _renderProjectTimelineView(activeProjects) {
  if (activeProjects.length === 0) {
    return '<div class="work-empty-state"><div class="work-empty-title">타임라인에 표시할 프로젝트가 없습니다</div><div class="work-empty-desc">마감일이 있는 활성 프로젝트를 추가하세요</div></div>';
  }
  const rows = activeProjects.slice(0, 5).map(project => {
    const stats = _projectStats(project);
    const stages = project.stages && project.stages.length > 0 ? project.stages : [{ name: '단계 1', completed: false }];
    const bars = stages.map((stage, idx) => {
      const cls = stage.completed ? 'completed' : (idx === stats.currentStage ? 'current' : 'upcoming');
      const width = Math.max(12, Math.round(100 / stages.length));
      return '<span class="work-phase-bar ' + cls + '" style="width:' + width + '%"><span>' + escapeHtml(stage.name || ('단계 ' + (idx + 1))) + '</span></span>';
    }).join('');
    return '<div class="work-timeline-row">' +
      '<div class="work-timeline-row-head"><strong>' + escapeHtml(project.name || '제목 없음') + '</strong><span>' + escapeHtml(project.deadline ? _formatShortDate(project.deadline) + ' · ' + _deadlineLabel(project.deadline) : '마감 없음') + '</span></div>' +
      '<div class="work-phase-track">' + bars + '</div>' +
      '<div class="work-timeline-meta">' + stats.completedTasks + '/' + stats.totalTasks + ' 항목 · ' + stats.completedStages + '/' + stats.totalStages + ' 단계</div>' +
    '</div>';
  }).join('');

  return '<div class="work-project-timeline-view">' +
    '<div class="work-section-heading"><span>프로젝트 타임라인</span><span class="count">진행 구간</span></div>' +
    rows +
    '<div class="work-timeline-legend"><span><i class="completed"></i>완료</span><span><i class="current"></i>진행</span><span><i class="upcoming"></i>예정</span></div>' +
  '</div>';
}

function _renderProjectViewToggle() {
  const views = [
    { key: 'cards', label: '카드', icon: 'briefcase' },
    { key: 'calendar', label: '캘린더', icon: 'calendar' },
    { key: 'timeline', label: '타임라인', icon: 'bar-chart-3' }
  ];
  return '<div class="work-project-view-toggle" role="group" aria-label="프로젝트 보기">' +
    views.map(view => {
      const active = appState.workProjectView === view.key;
      return '<button class="work-view-toggle-btn ' + (active ? 'active cat-work' : '') + '" role="button" aria-pressed="' + active + '" onclick="setWorkProjectView(\'' + view.key + '\')">' +
        _workIcon(view.icon, 14) + '<span>' + escapeHtml(view.label) + '</span>' +
      '</button>';
    }).join('') +
  '</div>';
}

function _renderWorkProjectsTab(activeProjects) {
  let viewHtml = '';
  if (appState.workProjectView === 'calendar') viewHtml = _renderProjectCalendarView(activeProjects);
  else if (appState.workProjectView === 'timeline') viewHtml = _renderProjectTimelineView(activeProjects);
  else viewHtml = _renderProjectCardsView(activeProjects);

  return '<div class="work-subtab-content active" id="work-subtab-panel-projects" role="tabpanel" aria-labelledby="work-subtab-btn-projects" data-work-subtab="projects">' +
    '<div class="work-project-toolbar">' +
      '<div class="work-section-heading"><span>진행 중 프로젝트</span><span class="count">' + activeProjects.length + '</span></div>' +
      _renderProjectViewToggle() +
    '</div>' +
    viewHtml +
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
  if (!appState.workGeneralQuickAddOpen) return '';
  return '<div class="work-general-quick-add">' +
    '<input type="text" id="work-quick-input" class="work-general-quick-input" placeholder="일반 업무 제목" onkeypress="if(event.key===\'Enter\') quickAddWorkTask()">' +
    '<button class="work-primary-action" onclick="quickAddWorkTask()">' + _workIcon('plus', 14) + '<span>추가</span></button>' +
  '</div>';
}

function _renderRecentDoneExpander(recentItems) {
  const expanded = !!appState.workRecentDoneExpanded;
  return '<div class="work-recent-done">' +
    '<button class="work-recent-done-head" onclick="toggleWorkRecentDone()">' +
      '<span>' + _workIcon('check', 14) + '최근 7일 완료 <strong>' + recentItems.length + '</strong></span>' +
      '<span>' + _workIcon(expanded ? 'chevron-down' : 'chevron-right', 14) + '</span>' +
    '</button>' +
    (expanded ? '<div class="work-recent-done-body">' +
      (recentItems.slice(0, 3).map(item => '<div class="work-recent-done-row"><span>' + escapeHtml(item.title || '제목 없음') + '</span><time>' + escapeHtml(_formatShortDate(item.completedAt)) + '</time></div>').join('') || '<div class="work-recent-done-empty">최근 완료 기록이 없습니다</div>') +
      '<button class="work-history-link" onclick="switchTab(\'history\')">일반 업무 히스토리 열기</button>' +
    '</div>' : '') +
  '</div>';
}

function _renderWorkGeneralTab() {
  const items = _sortGeneralItems(_collectGeneralWorkItems(false));
  const visibleCount = appState.workShowAllGeneralTasks ? items.length : 5;
  const visibleItems = items.slice(0, visibleCount);
  const moreCount = Math.max(0, items.length - visibleCount);
  const recentItems = _recentCompletedGeneralItems();

  return '<div class="work-subtab-content active" id="work-subtab-panel-general" role="tabpanel" aria-labelledby="work-subtab-btn-general" data-work-subtab="general">' +
    '<div class="work-toolbar">' +
      '<div class="work-chip-row"><span class="work-chip-label">정렬</span>' +
        _renderGeneralSortChip('deadline', '마감') +
        _renderGeneralSortChip('recent', '최근') +
        _renderGeneralSortChip('time', '시간') +
      '</div>' +
      '<button class="work-primary-action" onclick="startWorkGeneralQuickAdd()">' + _workIcon('plus', 14) + '<span>빠른 추가</span></button>' +
    '</div>' +
    _renderGeneralQuickAdd() +
    '<div class="work-task-list-redesign">' +
      (visibleItems.map(item => _renderWorkTaskRow(item)).join('') || '<div class="work-empty-state"><div class="work-empty-title">일반 업무가 없습니다</div><div class="work-empty-desc">프로젝트와 연결되지 않은 본업 task가 여기에 모입니다</div></div>') +
    '</div>' +
    (moreCount > 0 ? '<button class="work-more-row" onclick="appState.workShowAllGeneralTasks=true; renderStatic();">+' + moreCount + '개 더 보기</button>' : '') +
    _renderRecentDoneExpander(recentItems) +
  '</div>';
}

function renderWorkProjects() {
  _ensureWorkRedesignState();

  const activeProjects = (appState.workProjects || [])
    .filter(_isActiveWorkProject)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  let content = '';
  if (appState.workSubTab === 'all') content = _renderWorkAllTab();
  else if (appState.workSubTab === 'general') content = _renderWorkGeneralTab();
  else content = _renderWorkProjectsTab(activeProjects);

  return '<div class="work-projects-container work-redesign">' +
    _renderWorkHeader(activeProjects.length) +
    _renderWorkSubtabs() +
    _renderWorkAnchors(activeProjects) +
    content +
  '</div>';
}

function setWorkSubTab(tab) {
  if (!WORK_REDESIGN_SUBTABS.includes(tab)) return;
  appState.workSubTab = tab;
  if (tab === 'projects' && !WORK_REDESIGN_PROJECT_VIEWS.includes(appState.workProjectView)) {
    appState.workProjectView = 'cards';
  }
  renderStatic();
}
window.setWorkSubTab = setWorkSubTab;

function setWorkProjectView(view) {
  if (!WORK_REDESIGN_PROJECT_VIEWS.includes(view)) return;
  appState.workSubTab = 'projects';
  appState.workProjectView = view;
  appState.workView = view;
  renderStatic();
}
window.setWorkProjectView = setWorkProjectView;

function setWorkAllFilter(filter) {
  if (!WORK_REDESIGN_ALL_FILTERS.includes(filter)) return;
  appState.workAllFilter = filter;
  renderStatic();
}
window.setWorkAllFilter = setWorkAllFilter;

function setWorkSearch(value) {
  appState.workSearchQuery = String(value || '');
  renderStatic();
}
window.setWorkSearch = setWorkSearch;

function setWorkGeneralSort(sort) {
  if (!WORK_REDESIGN_GENERAL_SORTS.includes(sort)) return;
  appState.workGeneralSort = sort;
  renderStatic();
}
window.setWorkGeneralSort = setWorkGeneralSort;

function startWorkGeneralQuickAdd() {
  appState.workSubTab = 'general';
  appState.workGeneralQuickAddOpen = true;
  appState.workView = 'dashboard';
  renderStatic();
  setTimeout(() => {
    const input = document.getElementById('work-quick-input');
    if (input) input.focus();
  }, 0);
}
window.startWorkGeneralQuickAdd = startWorkGeneralQuickAdd;

function toggleWorkRecentDone(forceOpen) {
  appState.workRecentDoneExpanded = forceOpen === true ? true : !appState.workRecentDoneExpanded;
  renderStatic();
}
window.toggleWorkRecentDone = toggleWorkRecentDone;

function setWorkGeneralCompletedPage(page) {
  appState.workGeneralCompletedPage = Math.max(0, page);
  renderStatic();
}
window.setWorkGeneralCompletedPage = setWorkGeneralCompletedPage;
