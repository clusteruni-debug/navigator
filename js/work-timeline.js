
// ============================================
// 이력 뷰 (페이지네이션 + 정렬 + 레이아웃 개선)
// ============================================

/**
 * 번호 기반 페이지네이션 HTML 생성
 * @param {number} currentPage - 현재 페이지 (0-based)
 * @param {number} totalPages - 전체 페이지 수
 * @param {number} totalItems - 전체 항목 수
 * @param {string} onClickFn - 페이지 변경 시 호출할 함수명 (page 인자 전달)
 */
function renderPagination(currentPage, totalPages, totalItems, onClickFn) {
  if (totalPages <= 1) return '';

  let html = '<div class="pagination">';

  // 이전 버튼
  html += '<button class="pagination-btn" ' +
    (currentPage === 0 ? 'disabled' : 'onclick="' + onClickFn + '(' + (currentPage - 1) + ')"') +
    '>&lt;</button>';

  // 페이지 번호
  const maxVisible = 5;
  let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(0, endPage - maxVisible + 1);
  }

  if (startPage > 0) {
    html += '<button class="pagination-btn" onclick="' + onClickFn + '(0)">1</button>';
    if (startPage > 1) html += '<span style="color: var(--text-muted); padding: 0 4px;">…</span>';
  }

  for (let i = startPage; i <= endPage; i++) {
    html += '<button class="pagination-btn ' + (i === currentPage ? 'active' : '') + '" onclick="' + onClickFn + '(' + i + ')">' + (i + 1) + '</button>';
  }

  if (endPage < totalPages - 1) {
    if (endPage < totalPages - 2) html += '<span style="color: var(--text-muted); padding: 0 4px;">…</span>';
    html += '<button class="pagination-btn" onclick="' + onClickFn + '(' + (totalPages - 1) + ')">' + totalPages + '</button>';
  }

  // 다음 버튼
  html += '<button class="pagination-btn" ' +
    (currentPage === totalPages - 1 ? 'disabled' : 'onclick="' + onClickFn + '(' + (currentPage + 1) + ')"') +
    '>&gt;</button>';

  // 현재 위치 표시
  html += '<span class="pagination-info">' + (currentPage + 1) + ' / ' + totalPages + ' 페이지 (' + totalItems + '건)</span>';
  html += '</div>';
  return html;
}

/**
 * 정렬 드롭다운 HTML 생성
 */
function renderSortControl(currentSort, onChangeFn) {
  const options = [
    { value: 'date-desc', label: '최신순 ↓' },
    { value: 'date-asc', label: '오래된순 ↑' },
    { value: 'name-asc', label: '이름 가나다순' },
    { value: 'name-desc', label: '이름 역순' }
  ];
  return '<div class="sort-control">' +
    '<select class="sort-select" onchange="' + onChangeFn + '(this.value)">' +
    options.map(o => '<option value="' + o.value + '"' + (o.value === currentSort ? ' selected' : '') + '>' + o.label + '</option>').join('') +
    '</select>' +
  '</div>';
}

/**
 * 이력 뷰 전체 렌더링
 */
function renderWorkTimeline() {
  const timelineTab = appState.workTimelineTab || 'project';

  // 정렬 기준 복원 (localStorage)
  if (!appState.workProjectHistorySort) {
    appState.workProjectHistorySort = safeParseJSON('nav-project-history-sort', 'date-desc');
  }
  if (!appState.workActivityHistorySort) {
    appState.workActivityHistorySort = safeParseJSON('nav-activity-history-sort', 'date-desc');
  }
  if (appState.workProjectHistoryPage === undefined) appState.workProjectHistoryPage = 0;
  if (appState.workActivityHistoryPage === undefined) appState.workActivityHistoryPage = 0;

  // === 프로젝트 단위 이력 ===
  let projectHistoryHtml = '';
  if (timelineTab === 'project') {
    let projects = [...(appState.workProjects || []).filter(p => !p.archived)];
    const sortKey = appState.workProjectHistorySort;

    // 정렬
    if (sortKey === 'date-desc') {
      projects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    } else if (sortKey === 'date-asc') {
      projects.sort((a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0));
    } else if (sortKey === 'name-asc') {
      projects.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } else if (sortKey === 'name-desc') {
      projects.sort((a, b) => b.name.localeCompare(a.name, 'ko'));
    }

    const perPage = 20;
    const page = appState.workProjectHistoryPage;
    const totalPages = Math.max(1, Math.ceil(projects.length / perPage));
    const safePageIdx = Math.max(0, Math.min(page, totalPages - 1));
    const pagedProjects = projects.slice(safePageIdx * perPage, (safePageIdx + 1) * perPage);

    if (projects.length === 0) {
      projectHistoryHtml = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">프로젝트가 없습니다</div>';
    } else {
      projectHistoryHtml = pagedProjects.map(p => {
        const totalTasks = p.stages.reduce((sum, s) => sum + (s.subcategories || []).reduce((ss, sub) => ss + sub.tasks.length, 0), 0);
        const completedTasks = p.stages.reduce((sum, s) => sum + (s.subcategories || []).reduce((ss, sub) => ss + sub.tasks.filter(t => t.status === 'completed').length, 0), 0);
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const completedStages = p.stages.filter(s => s.completed).length;
        const fmtDate = (d) => d ? (new Date(d).getMonth()+1) + '/' + new Date(d).getDate() : '';
        const created = p.createdAt ? fmtDate(p.createdAt) : '-';
        const deadline = p.deadline ? fmtDate(p.deadline) : '-';
        const isComplete = p.stages.length > 0 && p.stages.every(s => s.completed);

        return '<div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; margin-bottom: 12px; cursor: pointer;" onclick="selectWorkProject(\'' + escapeAttr(p.id) + '\'); setWorkView(\'detail\');">' +
          '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">' +
            '<span style="font-size: 16px; font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (isComplete ? '✅ ' : '📁 ') + escapeHtml(p.name) + '</span>' +
            '<span style="font-size: 14px; color: var(--text-muted); white-space: nowrap;">' + created + ' ~ ' + deadline + '</span>' +
          '</div>' +
          (p.description ? '<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">' + renderFormattedText(p.description) + '</div>' : '') +
          '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">' +
            '<div style="flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">' +
              '<div style="height: 100%; width: ' + progress + '%; background: ' + (isComplete ? 'var(--accent-success)' : 'var(--accent-primary)') + '; border-radius: 3px;"></div>' +
            '</div>' +
            '<span style="font-size: 13px; font-weight: 600; color: var(--text-muted);">' + progress + '%</span>' +
          '</div>' +
          '<div style="font-size: 13px; color: var(--text-muted); display: flex; gap: 12px; flex-wrap: wrap;">' +
            '<span>📋 ' + completedTasks + '/' + totalTasks + ' 항목</span>' +
            '<span>✓ ' + completedStages + '/' + p.stages.length + ' 단계</span>' +
            (p.onHold ? '<span style="color: var(--accent-danger);">⏸ 보류</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      // 페이지네이션
      projectHistoryHtml += renderPagination(safePageIdx, totalPages, projects.length, 'goProjectHistoryPage');

      // 아카이브 프로젝트
      const archived = (appState.workProjects || []).filter(p => p.archived);
      if (archived.length > 0) {
        projectHistoryHtml += '<div style="margin-top: 16px;">' +
          '<div style="font-size: 14px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; cursor: pointer;" onclick="appState.showArchivedTimeline=!appState.showArchivedTimeline; renderStatic();">' +
            (appState.showArchivedTimeline ? '▼' : '▶') + ' 📦 아카이브 (' + archived.length + ')' +
          '</div>';
        if (appState.showArchivedTimeline) {
          projectHistoryHtml += archived.map(p => {
            const fmtDate = (d) => d ? (new Date(d).getMonth()+1) + '/' + new Date(d).getDate() : '';
            return '<div style="background: var(--bg-tertiary); border-radius: 8px; padding: 12px; margin-bottom: 8px; opacity: 0.7;">' +
              '<span style="font-weight: 600;">📦 ' + escapeHtml(p.name) + '</span>' +
              '<span style="font-size: 13px; color: var(--text-muted); margin-left: 8px;">' + fmtDate(p.createdAt) + ' ~ ' + (p.deadline ? fmtDate(p.deadline) : '-') + '</span>' +
            '</div>';
          }).join('');
        }
        projectHistoryHtml += '</div>';
      }
    }
  }

  // === 활동 단위 이력 ===
  let activityHistoryHtml = '';
  if (timelineTab === 'activity') {
    // 태스크 단위로 그룹핑된 로그 수집 (date|taskKey → { meta, logs[] })
    const taskGroups = {};
    const makeTaskKey = (date, taskTitle, projectId, si, sci) =>
      date + '|' + taskTitle + '|' + (projectId || '') + '|' + si + '|' + sci;

    (appState.workProjects || []).filter(p => !p.archived).forEach(p => {
      const stageName = (si) => getStageName(p, si);
      p.stages.forEach((stage, si) => {
        (stage.subcategories || []).forEach((sub, sci) => {
          sub.tasks.forEach((task, ti) => {
            (task.logs || []).forEach(log => {
              const key = makeTaskKey(log.date, task.title, p.id, si, sci);
              if (!taskGroups[key]) {
                taskGroups[key] = {
                  date: log.date,
                  taskTitle: task.title,
                  projectName: p.name,
                  projectId: p.id,
                  stageName: stageName(si),
                  subcatName: sub.name,
                  status: task.status,
                  logs: []
                };
              }
              taskGroups[key].logs.push(log.content);
            });
          });
        });
      });
    });

    // 완료된 일반 본업 작업 — completionLog에서 보완
    const projectLogKeys = new Set();
    Object.values(taskGroups).forEach(g => projectLogKeys.add(g.date + '|' + g.taskTitle));

    for (const [dateKey, dayEntries] of Object.entries(appState.completionLog || {})) {
      (dayEntries || []).forEach(e => {
        if (e._summary) return;
        if (!e.t) return;
        if (e.c !== '본업' && e.c !== 'Main Job') return;
        if (projectLogKeys.has(dateKey + '|' + e.t)) return;
        const key = makeTaskKey(dateKey, e.t, null, -1, -1);
        if (!taskGroups[key]) {
          taskGroups[key] = {
            date: dateKey,
            taskTitle: e.t,
            projectName: '일반',
            projectId: null,
            stageName: null,
            subcatName: null,
            status: 'completed',
            logs: []
          };
        }
        taskGroups[key].logs.push('✓ 완료' + (e.at ? ' (' + e.at + ')' : ''));
      });
    }

    // 태스크 그룹을 배열로 변환
    const allGroups = Object.values(taskGroups);

    // 정렬
    const sortKey = appState.workActivityHistorySort;
    const safeCompare = (a, b, locale) => (a || '').localeCompare(b || '', locale);
    if (sortKey === 'date-desc') {
      allGroups.sort((a, b) => safeCompare(b.date, a.date) || safeCompare(a.taskTitle, b.taskTitle, 'ko'));
    } else if (sortKey === 'date-asc') {
      allGroups.sort((a, b) => safeCompare(a.date, b.date) || safeCompare(a.taskTitle, b.taskTitle, 'ko'));
    } else if (sortKey === 'name-asc') {
      allGroups.sort((a, b) => safeCompare(a.taskTitle, b.taskTitle, 'ko') || safeCompare(b.date, a.date));
    } else if (sortKey === 'name-desc') {
      allGroups.sort((a, b) => safeCompare(b.taskTitle, a.taskTitle, 'ko') || safeCompare(b.date, a.date));
    }

    // 공통 태스크 그룹 카드 렌더러
    const _renderGroupCard = (group, showDate) => {
      const statusColor = group.status === 'completed' ? 'var(--accent-success)' : group.status === 'in-progress' ? 'var(--accent-primary)' : 'var(--accent-neutral)';
      const contextParts = [group.projectName];
      if (group.stageName) contextParts.push(group.stageName);
      if (group.subcatName) contextParts.push(group.subcatName);
      const contextPath = contextParts.map(p => escapeHtml(p)).join(' > ');
      return '<div style="padding: 10px 12px; margin-top: 6px; background: var(--bg-secondary); border-radius: 8px;">' +
        '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: ' + (group.logs.length > 1 ? '6' : '0') + 'px;">' +
          '<span style="width: 6px; height: 6px; border-radius: 50%; background: ' + statusColor + '; flex-shrink: 0;"></span>' +
          '<span style="font-size: 15px; font-weight: 600; flex: 1; min-width: 0; word-break: break-word;">' + escapeHtml(group.taskTitle) + '</span>' +
          (showDate ? '<span style="font-size: 12px; color: var(--text-muted);">' + escapeHtml(group.date || '') + '</span>' : '') +
          '<span style="font-size: 12px; color: var(--text-muted); background: var(--bg-tertiary); padding: 2px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">' + contextPath + '</span>' +
        '</div>' +
        (group.logs.length === 1
          ? '<div style="font-size: 14px; color: var(--text-secondary); padding-left: 14px;">' + renderFormattedText(group.logs[0]) + '</div>'
          : '<div style="padding-left: 14px;">' + group.logs.map(content =>
              '<div style="font-size: 14px; color: var(--text-secondary); padding: 2px 0; display: flex; gap: 6px; align-items: flex-start;">' +
                '<span style="color: var(--text-muted); flex-shrink: 0;">·</span>' +
                '<span>' + renderFormattedText(content) + '</span>' +
              '</div>'
            ).join('') + '</div>'
        ) +
      '</div>';
    };

    const viewMode = appState.workActivityViewMode || 'date';

    if (allGroups.length === 0) {
      activityHistoryHtml = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">아직 기록이 없습니다</div>';

    // === 날짜별 뷰 ===
    } else if (viewMode === 'date') {
      const perPage = 20;
      const page = appState.workActivityHistoryPage;
      const totalPages = Math.max(1, Math.ceil(allGroups.length / perPage));
      const safePageIdx = Math.max(0, Math.min(page, totalPages - 1));
      const pagedGroups = allGroups.slice(safePageIdx * perPage, (safePageIdx + 1) * perPage);

      const byDate = {};
      pagedGroups.forEach(group => {
        const dk = group.date || '';
        if (!byDate[dk]) byDate[dk] = [];
        byDate[dk].push(group);
      });
      const dateOrder = sortKey === 'date-asc' ? 1 : -1;
      const dates = Object.keys(byDate).sort((a, b) => dateOrder * a.localeCompare(b));

      if (!appState._expandedActivityDates) appState._expandedActivityDates = {};

      activityHistoryHtml = dates.map(date => {
        const isExpanded = !!appState._expandedActivityDates[date];
        const groups = byDate[date];
        const uniqueTitles = [...new Set(groups.map(g => g.taskTitle))];
        const summaryTitles = uniqueTitles.slice(0, 3).map(t => escapeHtml(t)).join(', ');
        const moreCount = uniqueTitles.length > 3 ? ' 외 ' + (uniqueTitles.length - 3) + '건' : '';

        return '<div style="margin-bottom: 12px;">' +
          '<div style="font-size: 14px; font-weight: 600; color: var(--text-muted); padding: 8px 4px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 6px;" onclick="toggleActivityDate(\'' + escapeAttr(date) + '\')">' +
            '<span style="font-size: 12px; display: inline-block;">' + (isExpanded ? '▼' : '▶') + '</span>' +
            '<span>' + escapeHtml(date) + ' (' + groups.length + '건)</span>' +
            (!isExpanded ? '<span style="font-size: 13px; font-weight: 400; color: var(--text-muted); margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">' + summaryTitles + moreCount + '</span>' : '') +
          '</div>' +
          (isExpanded ? groups.map(g => _renderGroupCard(g, false)).join('') : '') +
        '</div>';
      }).join('');

      activityHistoryHtml += renderPagination(safePageIdx, totalPages, allGroups.length, 'goActivityHistoryPage');

    // === 월별 뷰 ===
    } else if (viewMode === 'monthly') {
      const byMonth = {};
      allGroups.forEach(g => {
        const monthKey = (g.date && g.date.length >= 7) ? g.date.substring(0, 7) : 'unknown';
        if (!byMonth[monthKey]) byMonth[monthKey] = { groups: [], logCount: 0 };
        byMonth[monthKey].groups.push(g);
        byMonth[monthKey].logCount += g.logs.length;
      });
      const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
      if (!appState._expandedActivityMonths) appState._expandedActivityMonths = {};

      activityHistoryHtml = months.map(monthKey => {
        const isExp = !!appState._expandedActivityMonths[monthKey];
        const data = byMonth[monthKey];
        const [y, m] = monthKey.split('-');
        const label = (y && m) ? y + '년 ' + parseInt(m) + '월' : '날짜 미상';
        const uniqueTasks = [...new Set(data.groups.map(g => g.taskTitle))];

        return '<div style="margin-bottom: 12px;">' +
          '<div style="font-size: 15px; font-weight: 600; color: var(--text-primary); padding: 10px 8px; border-bottom: 2px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="toggleActivityMonth(\'' + escapeAttr(monthKey) + '\')">' +
            '<span style="font-size: 12px;">' + (isExp ? '▼' : '▶') + '</span>' +
            '<span>' + escapeHtml(label) + '</span>' +
            '<span style="font-size: 13px; color: var(--text-muted); font-weight: 400;">' + uniqueTasks.length + '개 태스크 · ' + data.logCount + '건 기록</span>' +
          '</div>' +
          (isExp ? data.groups.map(g => _renderGroupCard(g, true)).join('') : '') +
        '</div>';
      }).join('');

    // === 프로젝트별 뷰 ===
    } else if (viewMode === 'project') {
      const byProject = {};
      allGroups.forEach(g => {
        const pKey = g.projectName || '일반';
        if (!byProject[pKey]) byProject[pKey] = { groups: [], logCount: 0 };
        byProject[pKey].groups.push(g);
        byProject[pKey].logCount += g.logs.length;
      });
      const projects = Object.keys(byProject).sort((a, b) => a.localeCompare(b, 'ko'));
      if (!appState._expandedActivityProjects) appState._expandedActivityProjects = {};

      activityHistoryHtml = projects.map(pName => {
        const isExp = !!appState._expandedActivityProjects[pName];
        const data = byProject[pName];
        const uniqueTasks = [...new Set(data.groups.map(g => g.taskTitle))];

        return '<div style="margin-bottom: 12px;">' +
          '<div style="font-size: 15px; font-weight: 600; color: var(--text-primary); padding: 10px 8px; border-bottom: 2px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="toggleActivityProject(\'' + escapeAttr(pName) + '\')">' +
            '<span style="font-size: 12px;">' + (isExp ? '▼' : '▶') + '</span>' +
            '<span>📁 ' + escapeHtml(pName) + '</span>' +
            '<span style="font-size: 13px; color: var(--text-muted); font-weight: 400;">' + uniqueTasks.length + '개 태스크 · ' + data.logCount + '건 기록</span>' +
          '</div>' +
          (isExp ? data.groups.map(g => _renderGroupCard(g, true)).join('') : '') +
        '</div>';
      }).join('');
    }
  }

  // 활동 이력 뷰 모드 UI
  const curViewMode = appState.workActivityViewMode || 'date';
  const viewModeHtml = timelineTab === 'activity'
    ? '<div style="display: flex; gap: 4px; margin-bottom: 8px;">' +
        '<button class="work-view-tab ' + (curViewMode === 'date' ? 'active' : '') + '" onclick="setActivityViewMode(\'date\')" style="font-size: 13px; padding: 4px 10px;">날짜별</button>' +
        '<button class="work-view-tab ' + (curViewMode === 'monthly' ? 'active' : '') + '" onclick="setActivityViewMode(\'monthly\')" style="font-size: 13px; padding: 4px 10px;">월별</button>' +
        '<button class="work-view-tab ' + (curViewMode === 'project' ? 'active' : '') + '" onclick="setActivityViewMode(\'project\')" style="font-size: 13px; padding: 4px 10px;">프로젝트별</button>' +
      '</div>'
    : '';

  return '<div style="padding: 0 4px;">' +
    // 탭 전환 + 정렬
    '<div style="display: flex; gap: 4px; margin-bottom: 12px; background: var(--bg-tertiary); border-radius: 8px; padding: 4px;">' +
      '<button class="work-view-tab ' + (timelineTab === 'project' ? 'active' : '') + '" onclick="appState.workTimelineTab=\'project\'; appState.workProjectHistoryPage=0; renderStatic();" style="flex: 1;">📁 프로젝트 이력</button>' +
      '<button class="work-view-tab ' + (timelineTab === 'activity' ? 'active' : '') + '" onclick="appState.workTimelineTab=\'activity\'; appState.workActivityHistoryPage=0; renderStatic();" style="flex: 1;">📝 활동 이력</button>' +
    '</div>' +
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
      viewModeHtml +
      '<div>' +
        (timelineTab === 'project'
          ? renderSortControl(appState.workProjectHistorySort, 'setProjectHistorySort')
          : renderSortControl(appState.workActivityHistorySort, 'setActivityHistorySort')) +
      '</div>' +
    '</div>' +
    (timelineTab === 'project' ? projectHistoryHtml : activityHistoryHtml) +
  '</div>';
}

// 이력 페이지네이션 + 정렬 핸들러
function goProjectHistoryPage(page) {
  appState.workProjectHistoryPage = page;
  renderStatic();
  // 이력 영역 상단으로 스크롤
  setTimeout(() => {
    const el = document.querySelector('.work-view-tabs');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}
window.goProjectHistoryPage = goProjectHistoryPage;

function goActivityHistoryPage(page) {
  appState.workActivityHistoryPage = page;
  appState._expandedActivityDates = {};
  renderStatic();
  setTimeout(() => {
    const el = document.querySelector('.work-view-tabs');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}
window.goActivityHistoryPage = goActivityHistoryPage;

function toggleActivityDate(date) {
  if (!appState._expandedActivityDates) appState._expandedActivityDates = {};
  appState._expandedActivityDates[date] = !appState._expandedActivityDates[date];
  renderStatic();
}
window.toggleActivityDate = toggleActivityDate;

function setProjectHistorySort(value) {
  const allowed = ['date-desc', 'date-asc', 'name-asc', 'name-desc'];
  if (!allowed.includes(value)) value = 'date-desc';
  appState.workProjectHistorySort = value;
  appState.workProjectHistoryPage = 0; // 정렬 변경 시 첫 페이지
  try { localStorage.setItem('nav-project-history-sort', JSON.stringify(value)); } catch (_) {}
  renderStatic();
}
window.setProjectHistorySort = setProjectHistorySort;

function setActivityHistorySort(value) {
  const allowed = ['date-desc', 'date-asc', 'name-asc', 'name-desc'];
  if (!allowed.includes(value)) value = 'date-desc';
  appState.workActivityHistorySort = value;
  appState.workActivityHistoryPage = 0;
  appState._expandedActivityDates = {};
  try { localStorage.setItem('nav-activity-history-sort', JSON.stringify(value)); } catch (_) {}
  renderStatic();
}
window.setActivityHistorySort = setActivityHistorySort;

function setActivityViewMode(mode) {
  appState.workActivityViewMode = mode;
  appState.workActivityHistoryPage = 0;
  renderStatic();
}
window.setActivityViewMode = setActivityViewMode;

function toggleActivityMonth(monthKey) {
  if (!appState._expandedActivityMonths) appState._expandedActivityMonths = {};
  appState._expandedActivityMonths[monthKey] = !appState._expandedActivityMonths[monthKey];
  renderStatic();
}
window.toggleActivityMonth = toggleActivityMonth;

function toggleActivityProject(projectName) {
  if (!appState._expandedActivityProjects) appState._expandedActivityProjects = {};
  appState._expandedActivityProjects[projectName] = !appState._expandedActivityProjects[projectName];
  renderStatic();
}
window.toggleActivityProject = toggleActivityProject;
