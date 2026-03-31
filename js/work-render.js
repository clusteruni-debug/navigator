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

/**
 * 프로젝트 상세 렌더링
 */
function renderWorkProjectDetail(project) {
  const completedStages = project.stages.filter(s => s.completed).length;
  const totalTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.length, 0), 0);
  const completedTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.filter(t => t.status === 'completed').length, 0), 0);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 프로젝트 일정 계산
  let scheduleHtml = '';
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (project.startDate || project.deadline) {
    let dDayHtml = '';
    if (project.deadline) {
      const daysLeft = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      let deadlineClass = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'soon' : '';
      let deadlineText = daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : daysLeft === 0 ? 'D-Day' : `D-${daysLeft}`;
      dDayHtml = `<span class="work-deadline ${deadlineClass}">${deadlineText}</span>`;
    }

    const dateRange = project.startDate && project.deadline
      ? `${formatDate(project.startDate)} ~ ${formatDate(project.deadline)}`
      : project.startDate ? `${formatDate(project.startDate)} ~` : `~ ${formatDate(project.deadline)}`;

    scheduleHtml = `
      <div class="work-schedule" onclick="showWorkModal('deadline', '${escapeAttr(project.id)}')" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
        <span class="work-date-range">📅 ${dateRange}</span>
        ${dDayHtml}
      </div>
    `;
  } else {
    scheduleHtml = `<span class="work-deadline none" onclick="showWorkModal('deadline', '${escapeAttr(project.id)}')">+ 일정 설정</span>`;
  }

  return `
    <div class="work-project-detail">
      <!-- 프로젝트 헤더 -->
      <div class="work-projects-header">
        <!-- 1줄: 프로젝트명 + 수정 + 일정 + D-day -->
        <div class="work-project-info-row">
          <div class="work-projects-title" onclick="renameWorkProject('${escapeAttr(project.id)}')" style="cursor: pointer;" title="클릭하여 프로젝트명 수정">${escapeHtml(project.name)} <span style="font-size: 14px; opacity: 0.5;">✏️</span></div>
          ${scheduleHtml}
        </div>
        <!-- 프로젝트 개요 -->
        <div class="work-project-description" style="margin: 8px 0;">
          ${project.description
            ? '<div style="font-size: 14px; color: var(--text-secondary); padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px; cursor: pointer;" onclick="editProjectDescription(\'' + escapeAttr(project.id) + '\')" title="클릭하여 개요 수정">' + renderFormattedText(project.description) + '</div>'
            : '<button class="work-stage-add-task" style="font-size: 13px; opacity: 0.7;" onclick="editProjectDescription(\'' + escapeAttr(project.id) + '\')">+ 프로젝트 개요 추가</button>'
          }
        </div>
        <!-- 진행률 바 -->
        <div class="work-project-progress">
          <div class="work-project-progress-bar">
            <div class="work-project-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="work-project-progress-text">${completedTasks}/${totalTasks} 항목 · ${completedStages}/${project.stages.length} 단계</span>
        </div>
        <!-- 주요 액션 + 더보기 -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <button class="work-project-action-btn" onclick="copyProjectToSlack('${escapeAttr(project.id)}')">💬 슬랙 복사</button>
          <button class="work-project-action-btn" onclick="showFormExportMenu(event, '${escapeAttr(project.id)}')">📝 양식 출력</button>
          <button class="work-project-action-btn" onclick="showMetaEditor('${escapeAttr(project.id)}')">ℹ️ 프로젝트 정보</button>
          <button class="work-project-action-btn" onclick="showProjectMoreMenu(event, '${escapeAttr(project.id)}')">⋯ 더보기</button>
        </div>
      </div>

      <!-- 참여자 트래커 -->
      ${project.participantGoal ? `
        <div class="work-participant-tracker">
          <span class="work-participant-label">👥 참여자 현황</span>
          <div class="work-participant-bar">
            <div class="work-participant-fill" style="width: ${Math.min(100, ((project.participantCount || 0) / project.participantGoal) * 100)}%"></div>
          </div>
          <span class="work-participant-count">${project.participantCount || 0}</span>
          <span class="work-participant-goal">/ ${project.participantGoal}명</span>
          <button class="work-task-action" onclick="updateParticipantCount('${escapeAttr(project.id)}')">수정</button>
        </div>
      ` : `
        <div style="margin: 12px 0;">
          <button class="work-stage-add-task" onclick="showWorkModal('participant', '${escapeAttr(project.id)}')">+ 참여자 목표 설정</button>
        </div>
      `}

      <!-- 프로젝트 정보 요약 (접기/펼치기) -->
      ${(() => {
        const m = project.meta || {};
        const hasAnyMeta = Object.values(m).some(v => v !== null && v !== undefined && v !== '' && v !== 0);
        if (!hasAnyMeta) return '';

        const items = [];
        if (m.methodology) items.push('방법론: ' + escapeHtml(m.methodology));
        if (m.targetPlatform) items.push('플랫폼: ' + escapeHtml(m.targetPlatform));
        if (m.participantCount) {
          let pText = '인원: ' + m.participantCount + '명';
          if (m.bufferCount) pText += ' (버퍼 ' + m.bufferCount + '명)';
          items.push(pText);
        }
        if (m.testDate) items.push('테스트일: ' + escapeHtml(m.testDate));
        if (m.location) items.push('장소: ' + escapeHtml(m.location));
        if (m.outsourcingCompany) items.push('외주: ' + escapeHtml(m.outsourcingCompany));
        if (items.length === 0) return '';

        const isCollapsed = !appState.workMetaExpanded || !appState.workMetaExpanded[project.id];
        return '<div class="work-meta-collapse">' +
          '<div class="work-meta-collapse-header" onclick="toggleWorkMetaCollapse(\'' + escapeAttr(project.id) + '\')">' +
            '<span style="font-size: 12px; width: 12px;">' + (isCollapsed ? '▶' : '▼') + '</span>' +
            'ℹ️ 프로젝트 정보' +
          '</div>' +
          '<div class="work-meta-collapse-body' + (isCollapsed ? ' collapsed' : '') + '" onclick="showMetaEditor(\'' + escapeAttr(project.id) + '\')" style="cursor: pointer;" title="클릭하여 편집">' +
            items.join(' · ') +
          '</div>' +
        '</div>';
      })()}

      <!-- 단계별 내용 -->
      <div class="work-stages">
        ${(() => {
          const currentIdx = project.stages.findIndex(s => !s.completed);
          return project.stages.map((stage, stageIdx) => {
          const stageName = getStageName(project, stageIdx);
          const stageClass = stage.completed ? 'completed' : stageIdx === currentIdx ? 'current' : 'future';
          const subcategories = stage.subcategories || [];
          const isCollapsed = appState.collapsedStages && appState.collapsedStages[project.id + '-' + stageIdx];
          const stageTotalTasks = subcategories.reduce((s, sub) => s + sub.tasks.length, 0);
          const stageCompletedTasks = subcategories.reduce((s, sub) => s + sub.tasks.filter(t => t.status === 'completed').length, 0);

          return `
            <div class="work-stage ${stageClass}">
              <div class="work-stage-header">
                <div class="work-stage-title">
                  <span class="work-stage-collapse-toggle" onclick="toggleStageCollapse('${escapeAttr(project.id)}', ${stageIdx})" title="${isCollapsed ? '펼치기' : '접기'}" style="cursor: pointer; font-size: 12px; color: var(--text-muted); width: 16px; text-align: center; flex-shrink: 0;">${isCollapsed ? '▶' : '▼'}</span>
                  <div class="work-stage-checkbox ${stage.completed ? 'checked' : ''}"
                       onclick="toggleStageComplete('${escapeAttr(project.id)}', ${stageIdx})">
                    ${stage.completed ? '✓' : ''}
                  </div>
                  <span class="work-stage-number">${stageIdx + 1}</span>
                  <span class="work-stage-name" onclick="promptRenameStage('${escapeAttr(project.id)}', ${stageIdx}, '${escapeAttr(stageName)}')" style="cursor: pointer;" title="클릭하여 이름 변경">${escapeHtml(stageName)}</span>
                  ${stageTotalTasks > 0 ? '<span style="font-size: 12px; color: var(--text-muted); margin-left: 4px;">(' + stageCompletedTasks + '/' + stageTotalTasks + ')</span><span class="work-stage-mini-progress"><span class="work-stage-mini-progress-fill" style="width: ' + Math.round(stageCompletedTasks / stageTotalTasks * 100) + '%"></span></span>' : ''}
                  ${(stage.startDate || stage.endDate) ? (() => {
                    const fmtDate = (d) => d ? (new Date(d).getMonth() + 1) + '/' + new Date(d).getDate() : '';
                    let html = '<span class="work-stage-date" style="margin-left: 8px; font-size: 14px; color: var(--text-muted);">';
                    if (stage.startDate && stage.endDate) {
                      html += fmtDate(stage.startDate) + '~' + fmtDate(stage.endDate);
                    } else if (stage.startDate) {
                      html += fmtDate(stage.startDate) + '~';
                    } else {
                      html += '~' + fmtDate(stage.endDate);
                    }
                    html += '</span>';
                    if (stage.endDate) {
                      const daysLeft = Math.ceil((new Date(stage.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                      const cls = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'soon' : '';
                      const txt = daysLeft < 0 ? 'D+' + Math.abs(daysLeft) : daysLeft === 0 ? 'D-Day' : 'D-' + daysLeft;
                      html += '<span class="work-deadline ' + cls + '" style="margin-left: 6px;">' + txt + '</span>';
                    }
                    return html;
                  })() : ''}
                </div>
                <div style="display: flex; gap: 6px; flex-shrink: 0; align-items: center;">
                  <div class="work-stage-actions">
                    ${stageIdx > 0 ? `<button class="work-stage-add-task" onclick="moveStage('${escapeAttr(project.id)}', ${stageIdx}, 'up')" title="위로 이동" aria-label="위로 이동">▲</button>` : ''}
                    ${stageIdx < project.stages.length - 1 ? `<button class="work-stage-add-task" onclick="moveStage('${escapeAttr(project.id)}', ${stageIdx}, 'down')" title="아래로 이동" aria-label="아래로 이동">▼</button>` : ''}
                    <button class="work-stage-add-task" onclick="copyStageToSlack('${escapeAttr(project.id)}', ${stageIdx})" title="슬랙용 복사" aria-label="슬랙용 복사">💬</button>
                    <button class="work-stage-add-task" onclick="promptRenameStage('${escapeAttr(project.id)}', ${stageIdx}, '${escapeAttr(stageName)}')" title="단계 이름 변경" aria-label="단계 이름 변경">${svgIcon('edit', 14)}</button>
                    <button class="work-stage-add-task" onclick="showWorkModal('stage-deadline', '${escapeAttr(project.id)}', ${stageIdx})" title="단계 일정 설정" aria-label="단계 일정 설정">📅</button>
                    <button class="work-stage-add-task" onclick="deleteProjectStage('${escapeAttr(project.id)}', ${stageIdx})" title="단계 삭제" aria-label="단계 삭제" style="color: var(--accent-danger);">${svgIcon('trash', 14)}</button>
                  </div>
                  <button class="work-stage-add-task" onclick="showWorkModal('subcategory', '${escapeAttr(project.id)}', ${stageIdx})">+ 중분류</button>
                </div>
              </div>

              ${!isCollapsed && subcategories.length > 0 ? `
                ${subcategories.map((subcat, subcatIdx) => {
                  const subcatKey = project.id + '-' + stageIdx + '-' + subcatIdx;
                  const isSubcatCollapsed = appState.collapsedSubcategories && appState.collapsedSubcategories[subcatKey];
                  const subcatCompletedCount = subcat.tasks.filter(t => t.status === 'completed').length;
                  const subcatTotalCount = subcat.tasks.length;
                  const subcatAllDone = (subcatTotalCount > 0 && subcatCompletedCount === subcatTotalCount) || (subcatTotalCount === 0 && subcat._completed);
                  return `
                  <div class="work-subcategory">
                    <div class="work-subcategory-header">
                      <div class="work-subcategory-title">
                        <span class="work-subcategory-collapse-toggle" onclick="toggleSubcategoryCollapse('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="${isSubcatCollapsed ? '펼치기' : '접기'}" style="cursor: pointer; font-size: 12px; color: var(--text-muted); width: 16px; text-align: center; flex-shrink: 0;">${isSubcatCollapsed ? '▶' : '▼'}</span>
                        <div class="work-subcategory-checkbox ${subcatAllDone ? 'checked' : ''}"
                             onclick="toggleSubcategoryComplete('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})">
                          ${subcatAllDone ? '✓' : ''}
                        </div>
                        <span class="work-subcategory-name" onclick="promptRenameSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx}, '${escapeAttr(subcat.name)}')" title="클릭하여 이름 변경">${escapeHtml(subcat.name)}</span>
                        <span class="work-subcategory-toggle">(${subcatCompletedCount}/${subcatTotalCount})</span>
                        ${(subcat.startDate || subcat.endDate) ? (() => {
                          const fmtDate = (d) => d ? (new Date(d).getMonth() + 1) + '/' + new Date(d).getDate() : '';
                          let html = '<span class="work-subcat-date" style="margin-left: 8px; font-size: 15px; color: var(--text-muted);">';
                          if (subcat.startDate && subcat.endDate) {
                            html += fmtDate(subcat.startDate) + '~' + fmtDate(subcat.endDate);
                          } else if (subcat.startDate) {
                            html += fmtDate(subcat.startDate) + '~';
                          } else {
                            html += '~' + fmtDate(subcat.endDate);
                          }
                          html += '</span>';
                          return html;
                        })() : ''}
                      </div>
                      <div class="work-subcategory-actions">
                        <button class="work-task-action" onclick="promptRenameSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx}, '${escapeAttr(subcat.name)}')" title="중분류 이름 변경">${svgIcon('edit', 14)}</button>
                        <button class="work-task-action" onclick="showNotionCopyMenu(event, '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="Notion 진행상황 복사">📋</button>
                        <button class="work-task-action" onclick="showWorkModal('subcat-deadline', '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="중분류 일정" aria-label="중분류 일정 설정">📅</button>
                        <button class="work-task-action" onclick="deleteSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="중분류 삭제" style="color: var(--accent-danger);">${svgIcon('trash', 14)}</button>
                        <button class="work-task-action" onclick="showWorkModal('task', '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})">+ 항목</button>
                      </div>
                    </div>
                    ${!isSubcatCollapsed ? (subcat.tasks.length > 0 ? `
                      <div class="work-task-list">
                        ${subcat.tasks.map((task, taskIdx) => renderWorkTask(project.id, stageIdx, subcatIdx, task, taskIdx)).join('')}
                      </div>
                    ` : '<div style="color: var(--text-muted); font-size: 14px; padding: 8px;">항목 없음</div>') : ''}
                  </div>
                `}).join('')}
              ` : !isCollapsed ? '<div style="color: var(--text-muted); font-size: 15px; padding: 10px;">중분류를 추가하세요</div>' : ''}
            </div>
          `;
        }).join('');
        })()}

        <!-- 새 단계 추가 버튼 -->
        <div class="work-stage-add-new" style="margin-top: 12px; padding: 12px; border: 2px dashed var(--border-color); border-radius: var(--radius-md); text-align: center;">
          <button class="work-stage-add-task" onclick="promptAddStage('${escapeAttr(project.id)}')" style="width: 100%; padding: 10px;">
            + 새 단계 추가
          </button>
        </div>
      </div>

    </div>
  `;
}

/**
 * 작업 항목 렌더링
 */
function renderWorkTask(projectId, stageIdx, subcatIdx, task, taskIdx) {
  const statusInfo = WORK_STATUS[task.status] || WORK_STATUS['not-started'];

  // 작업 마감일 표시
  let deadlineHtml = '';
  if (task.deadline) {
    const d = new Date(task.deadline);
    const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    const deadlineClass = daysLeft < 0 ? 'overdue' : daysLeft <= 2 ? 'soon' : '';
    const dateStr = (d.getMonth() + 1) + '/' + d.getDate();
    deadlineHtml = `<span class="work-task-deadline ${deadlineClass}" onclick="event.stopPropagation(); promptTaskDeadline('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="클릭하여 마감일 변경">~${dateStr}</span>`;
  }

  const taskPulse = calculateTaskPulse(task);
  const pulseColor = PULSE_COLORS[taskPulse] || 'transparent';

  return `
    <div class="work-task-item${task.status === 'completed' ? ' work-task-completed' : ''}" style="${pulseColor !== 'transparent' ? 'border-left: 3px solid ' + pulseColor + ';' : ''}">
      <div class="work-task-header">
        <div class="work-task-checkbox ${task.status === 'completed' ? 'checked' : ''}"
             onclick="toggleWorkTaskComplete('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
             title="완료 체크">
          ${task.status === 'completed' ? '✓' : ''}
        </div>
        <span class="work-status-badge ${task.status}" onclick="cycleWorkTaskStatus('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
              title="클릭하여 상태 변경">
          ${statusInfo.label}
        </span>
        <span class="work-task-title ${task.status === 'completed' ? 'completed' : ''}"
              onclick="promptRenameWorkTask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx}, '${escapeAttr(task.title)}')"
              title="${escapeAttr(task.title)}">${escapeHtml(task.title)}</span>
        ${task.canStartEarly ? '<span style="font-size: 11px; background: var(--accent-primary-alpha); color: var(--accent-primary); padding: 1px 6px; border-radius: 4px; white-space: nowrap;" title="미리 시작 가능">선제</span>' : ''}
        ${task.status === 'completed' && task.completedAt ? `<span class="work-task-completed-at" onclick="event.stopPropagation(); editWorkTaskCompletedAt('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="클릭하여 완료일 수정" style="font-size: 12px; color: var(--accent-success); cursor: pointer; white-space: nowrap; padding: 1px 6px; background: var(--accent-success-alpha); border-radius: 4px;">✓ ${escapeHtml(task.completedAt.substring(5, 10).replace('-', '/'))}</span>` : ''}
        ${deadlineHtml}
        <div class="work-task-actions">
          <button class="work-task-action" onclick="promptRenameWorkTask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx}, '${escapeAttr(task.title)}')">${svgIcon('edit', 14)}</button>
          <button class="work-task-action" onclick="promptTaskDeadline('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="마감일 설정" aria-label="마감일 설정">📅</button>
          <button class="work-task-action" onclick="showWorkModal('log', '${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" aria-label="기록 추가">+ 기록</button>
          <button class="work-task-action" onclick="event.stopPropagation(); toggleCanStartEarly('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="${task.canStartEarly ? '선제적 시작 해제' : '선제적 시작 설정'}" aria-label="선제적 시작 토글" style="${task.canStartEarly ? 'color: var(--accent-primary);' : ''}">💡</button>
          <button class="work-task-action" onclick="event.stopPropagation(); copyWorkTaskToSlack('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="슬랙 복사" aria-label="슬랙 복사">📋</button>
          <button class="work-task-action" onclick="deleteWorkTask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="항목 삭제" aria-label="항목 삭제" style="color: var(--accent-danger);">${svgIcon('trash', 14)}</button>
        </div>
      </div>
      ${task.logs && task.logs.length > 0 ? `
        <div class="work-task-logs">
          ${(() => {
            // 완료 로그 압축: "✓ 완료" 로그는 하나로 요약
            const completionLogs = task.logs.filter(l => l.content === '✓ 완료');
            const otherLogs = task.logs.filter(l => l.content !== '✓ 완료');
            const pid = escapeAttr(projectId);
            const si = Number(stageIdx), sci = Number(subcatIdx), ti = Number(taskIdx);
            const taskUid = task.id || (pid + '-' + si + '-' + sci + '-' + ti);
            let html = '';
            if (completionLogs.length > 0) {
              const lastIdx = task.logs.reduce((found, l, i) => l.content === '✓ 완료' ? i : found, -1);
              const lastDate = completionLogs[completionLogs.length - 1].date;
              const label = completionLogs.length === 1
                ? '✓ 완료 (' + lastDate + ')'
                : '✓ ' + completionLogs.length + '회 완료 (최근: ' + lastDate + ')';
              html += '<div class="work-task-log"><span class="work-task-log-date" style="color: var(--accent-success);">' + label + '</span>' +
                '<div class="work-task-log-actions">' +
                  '<button class="work-task-log-action" onclick="editWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + lastIdx + ')" aria-label="기록 편집">✏️</button>' +
                  '<button class="work-task-log-action" onclick="deleteWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + lastIdx + ')" aria-label="기록 삭제">×</button>' +
                '</div></div>';
            }
            // 최근 3개만 표시, 나머지는 접기
            const MAX_VISIBLE_LOGS = 3;
            const hiddenLogs = otherLogs.length > MAX_VISIBLE_LOGS ? otherLogs.slice(0, otherLogs.length - MAX_VISIBLE_LOGS) : [];
            const visibleLogs = otherLogs.length > MAX_VISIBLE_LOGS ? otherLogs.slice(otherLogs.length - MAX_VISIBLE_LOGS) : otherLogs;
            if (hiddenLogs.length > 0) {
              const wasExpanded = appState.expandedWorkLogs?.[taskUid];
              html += '<div class="work-task-logs-collapsed' + (wasExpanded ? ' expanded' : '') + '" id="logs-hidden-' + taskUid + '">';
              hiddenLogs.forEach(log => {
                const actualIdx = task.logs.findIndex(l => l.date === log.date && l.content === log.content);
                html += '<div class="work-task-log"><span class="work-task-log-date">' + escapeHtml(log.date) + '</span><div class="work-task-log-content">' + renderFormattedText(log.content) + '</div>' +
                  '<div class="work-task-log-actions">' +
                    '<button class="work-task-log-action" onclick="editWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" aria-label="기록 편집">✏️</button>' +
                    '<button class="work-task-log-action" onclick="deleteWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" aria-label="기록 삭제">×</button>' +
                  '</div></div>';
              });
              html += '</div>';
              html += '<div class="work-task-logs-toggle" onclick="toggleWorkLogs(\'' + taskUid + '\')" id="logs-toggle-' + taskUid + '">' + (wasExpanded ? '▼' : '▶') + ' 이전 기록 ' + hiddenLogs.length + '개</div>';
            }
            visibleLogs.forEach(log => {
              const actualIdx = task.logs.findIndex(l => l.date === log.date && l.content === log.content);
              html += '<div class="work-task-log"><span class="work-task-log-date">' + escapeHtml(log.date) + '</span><div class="work-task-log-content">' + renderFormattedText(log.content) + '</div>' +
                '<div class="work-task-log-actions">' +
                  '<button class="work-task-log-action" onclick="editWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" aria-label="기록 편집">✏️</button>' +
                  '<button class="work-task-log-action" onclick="deleteWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" aria-label="기록 삭제">×</button>' +
                '</div></div>';
            });
            return html;
          })()}
        </div>
      ` : ''}
    </div>
  `;
}

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
