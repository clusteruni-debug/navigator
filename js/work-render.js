// ============================================
// 본업 프로젝트 - 카드/상세/태스크 렌더링
// (work.js에서 분리)
// ============================================

/**
 * 대시보드 카드 렌더링
 */
function renderWorkDashboardCard(project) {
  const completedStages = project.stages.filter(s => s.completed).length;
  const totalStages = project.stages.length;
  const totalTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.length, 0), 0);
  const completedTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.filter(t => t.status === 'completed').length, 0), 0);

  // 마감일 계산
  let deadlineText = '';
  let deadlineClass = 'none';
  if (project.deadline) {
    const daysLeft = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      deadlineText = `D+${Math.abs(daysLeft)}`;
      deadlineClass = 'overdue';
    } else if (daysLeft === 0) {
      deadlineText = 'D-Day';
      deadlineClass = 'overdue';
    } else if (daysLeft <= 3) {
      deadlineText = `D-${daysLeft}`;
      deadlineClass = 'soon';
    } else {
      deadlineText = `D-${daysLeft}`;
    }
  }

  const projectPulse = calculateProjectPulse(project);
  const projectPulseColor = PULSE_COLORS[projectPulse] || 'transparent';

  return `
    <div class="work-dashboard-card ${project.id === appState.activeWorkProject ? 'active' : ''} ${project.archived ? 'archived' : ''}"
         style="${projectPulseColor !== 'transparent' ? 'border-left: 4px solid ' + projectPulseColor + ';' : ''}"
         onclick="selectWorkProject('${escapeAttr(project.id)}'); setWorkView('detail');">
      <div class="work-dashboard-header">
        <div class="work-dashboard-name">
          ${escapeHtml(project.name)}
          ${project.archived ? '<span class="work-archived-badge">아카이브</span>' : ''}
          ${project.onHold ? '<span class="work-onhold-badge">보류</span>' : ''}
        </div>
        ${project.deadline ? `
          <span class="work-deadline ${deadlineClass}">${deadlineText}</span>
        ` : ''}
      </div>
      ${(project.startDate || project.deadline) ? `
        <div class="work-dashboard-schedule">
          📅 ${project.startDate ? `${new Date(project.startDate).getMonth() + 1}/${new Date(project.startDate).getDate()}` : ''}
          ${project.startDate && project.deadline ? '~' : ''}
          ${project.deadline ? `${new Date(project.deadline).getMonth() + 1}/${new Date(project.deadline).getDate()}` : ''}
        </div>
      ` : ''}
      <div class="work-dashboard-stages">
        ${project.stages.map((s, idx) => `
          <div class="work-dashboard-stage-dot ${s.completed ? 'completed' : (idx === project.currentStage ? 'current' : '')}"></div>
        `).join('')}
      </div>
      <div class="work-dashboard-meta">
        <span>📋 ${completedTasks}/${totalTasks} 항목</span>
        <span>✓ ${completedStages}/${totalStages} 단계</span>
        ${project.participantGoal ? `<span>👥 ${project.participantCount || 0}/${project.participantGoal}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * 프로젝트 선택
 */
function selectWorkProject(projectId) {
  appState.activeWorkProject = projectId;
  renderStatic();
}
window.selectWorkProject = selectWorkProject;

// renderWorkProjectDetail, renderWorkTask → work-render-detail.js로 분리됨

/**
 * 일반 업무 뷰 렌더링 (프로젝트 미연결 본업 작업)
 */
function renderWorkGeneralView() {
  const generalTasks = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && !t.completed);
  const completedGeneral = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && t.completed);

  return `
    <div class="work-general-view">
      <div style="font-size: 17px; font-weight: 700; margin-bottom: 16px;">📋 일반 업무</div>
      <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 16px;">프로젝트에 속하지 않는 본업 작업입니다. 완료 시 기록에 자동 저장됩니다.</div>

      ${generalTasks.length > 0 ? `
        <div class="work-general-task-list">
          ${generalTasks.map(task => `
            <div class="work-task-item">
              <div class="work-task-header">
                <div class="work-task-checkbox" onclick="completeTask('${escapeAttr(task.id)}')" title="완료 체크"></div>
                <span class="work-task-title" onclick="editTask('${escapeAttr(task.id)}')">${escapeHtml(task.title)}</span>
                ${task.estimatedTime ? '<span style="font-size: 13px; color: var(--text-muted);">' + task.estimatedTime + '분</span>' : ''}
                ${task.deadline ? '<span class="work-task-deadline" onclick="editTask(\'' + escapeAttr(task.id) + '\')">' + escapeHtml(task.deadline.substring(5).replace('-', '/')) + '</span>' : ''}
                <div class="work-task-actions">
                  <button class="work-task-action" onclick="editTask('${escapeAttr(task.id)}')">${svgIcon('edit', 14)}</button>
                  <button class="work-task-action" onclick="deleteTask('${escapeAttr(task.id)}')" style="color: var(--accent-danger);">${svgIcon('trash', 14)}</button>
                </div>
              </div>
              ${task.subtasks && task.subtasks.length > 0 ? `
                <div style="padding-left: 32px; margin-top: 4px;">
                  ${task.subtasks.map((st, idx) => `
                    <div style="display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 14px; color: ${st.completed ? 'var(--text-muted)' : 'var(--text-primary)'}; ${st.completed ? 'text-decoration: line-through;' : ''} cursor: pointer;" onclick="toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})">
                      <span>${st.completed ? '✓' : '○'}</span>
                      <span>${escapeHtml(st.text)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          일반 업무가 없습니다. 위 입력란에서 추가하세요.
        </div>
      `}

      ${completedGeneral.length > 0 ? `
        <div style="margin-top: 20px;">
          <div style="font-size: 14px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; cursor: pointer;" onclick="appState.showCompletedGeneral=!appState.showCompletedGeneral; renderStatic();">
            ${appState.showCompletedGeneral ? '▼' : '▶'} ✅ 완료됨 (${completedGeneral.length})
          </div>
          ${appState.showCompletedGeneral ? `
            <div class="work-general-task-list">
              ${completedGeneral.slice(0, 10).map(task => `
                <div class="work-task-item" style="opacity: 0.6;">
                  <div class="work-task-header">
                    <div class="work-task-checkbox checked" onclick="uncompleteTask('${escapeAttr(task.id)}')" title="완료 취소">✓</div>
                    <span class="work-task-title completed">${escapeHtml(task.title)}</span>
                    ${task.completedAt ? '<span style="font-size: 13px; color: var(--text-muted);">' + escapeHtml(task.completedAt.substring(5, 10).replace('-', '/')) + '</span>' : ''}
                  </div>
                </div>
              `).join('')}
              ${completedGeneral.length > 10 ? '<div style="text-align: center; font-size: 13px; color: var(--text-muted); padding: 8px;">+ ' + (completedGeneral.length - 10) + '개 더</div>' : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Task 2-1: 프로젝트 관리 "더보기" 드롭다운
 */
function showProjectMoreMenu(event, projectId) {
  event.stopPropagation();

  const existing = document.getElementById('project-more-menu');
  if (existing) existing.remove();

  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const menu = document.createElement('div');
  menu.id = 'project-more-menu';
  menu.className = 'work-more-menu';

  const rect = event.target.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';

  const items = [
    { label: '📋 노션/슬랙 복사', fn: `copyWorkProjectToClipboard('${escapeAttr(projectId)}')` },
    { label: '📋 복제', fn: `duplicateWorkProject('${escapeAttr(projectId)}')` },
    { label: project.onHold ? '▶ 재개' : '⏸ 보류', fn: `holdWorkProject('${escapeAttr(projectId)}')` },
    { label: '💾 템플릿', fn: `saveAsTemplate('${escapeAttr(projectId)}')` },
    { label: project.archived ? '📤 복원' : '📦 보관', fn: `archiveWorkProject('${escapeAttr(projectId)}')` },
    { label: '🗑 삭제', fn: `deleteWorkProject('${escapeAttr(projectId)}')`, danger: true }
  ];

  menu.innerHTML = items.map(item =>
    `<button class="${item.danger ? 'danger' : ''}" onclick="${item.fn}; document.getElementById('project-more-menu')?.remove();">${escapeHtml(item.label)}</button>`
  ).join('');

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', function handler() {
      const m = document.getElementById('project-more-menu');
      if (m) m.remove();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 0);
}
window.showProjectMoreMenu = showProjectMoreMenu;

/**
 * Task 2-3: 프로젝트 메타 정보 접기/펼치기 토글
 */
function toggleWorkMetaCollapse(projectId) {
  if (!appState.workMetaExpanded) appState.workMetaExpanded = {};
  appState.workMetaExpanded[projectId] = !appState.workMetaExpanded[projectId];
  renderStatic();
}
window.toggleWorkMetaCollapse = toggleWorkMetaCollapse;
