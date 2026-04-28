// ============================================
// 본업 프로젝트 관리 - 렌더링/뷰
// (데이터: work-data.js, 모달: work-modal.js, CRUD: work-actions.js)
// ============================================

/**
 * 프로젝트 목록 렌더링
 */
function renderWorkProjects() {

  const activeProjects = appState.workProjects.filter(p => !p.archived);
  const archivedProjects = appState.workProjects.filter(p => p.archived);

  // 최근 활동순 정렬 헬퍼
  const sortByRecent = (projects) => {
    return [...projects].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt || 0);
      const bDate = new Date(b.updatedAt || b.createdAt || 0);
      return bDate - aDate; // 최신순
    });
  };

  // 보류 프로젝트 분리
  const onHoldProjects = sortByRecent(activeProjects.filter(p => p.onHold));

  // 활성 프로젝트를 3가지로 분류 (최근 활동순 정렬, 보류 제외)
  const inProgressProjects = sortByRecent(activeProjects.filter(p => !p.onHold && p.deadline && !isProjectCompleted(p)));
  const completedProjects = sortByRecent(activeProjects.filter(p => !p.onHold && isProjectCompleted(p)));
  const noDeadlineProjects = sortByRecent(activeProjects.filter(p => !p.onHold && !p.deadline && !isProjectCompleted(p)));

  if (appState.workProjects.length === 0) {
    return `
      <div class="work-projects-container">
        <div class="work-projects-header">
          <div class="work-projects-title">💼 본업 프로젝트</div>
        </div>
        <div class="work-empty">
          <div class="work-empty-icon">📋</div>
          <div class="work-empty-title">프로젝트가 없습니다</div>
          <div class="work-empty-desc">새 프로젝트를 추가하여 업무를 체계적으로 관리하세요</div>
          <button class="work-project-add-btn" onclick="showWorkModal('project')">+ 첫 프로젝트 만들기</button>
        </div>
      </div>
    `;
  }

  const activeProject = appState.workProjects.find(p => p.id === appState.activeWorkProject);

  // 본업 일반 작업 (프로젝트 미연결)
  const workGeneralTasks = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && !t.completed);

  return `
    <div class="work-projects-container">
      <!-- 헤더 -->
      <div class="work-projects-header">
        <div class="work-projects-title">💼 본업</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="work-project-add-btn" onclick="createRoV3Project()" title="RO 6단계 표준 체크리스트 v3 자동 주입">+ RO v3</button>
          <button class="work-project-add-btn" onclick="showWorkModal('project')">+ 빈 프로젝트</button>
          <button class="work-project-action-btn" onclick="showWorkModal('template-manage')">📋 템플릿 관리</button>
          <button class="work-project-action-btn" onclick="showMMReportModal()">📊 MM 리포트</button>
        </div>
      </div>

      ${(() => {
        const focusResult = getWorkFocus();
        const { task: focus, mode: focusMode } = focusResult;

        if (focusMode === 'empty') return '';

        if (focusMode === 'all-done') {
          return '<div class="work-focus-card" style="background: var(--accent-success-alpha); border: 1px solid color-mix(in srgb, var(--accent-success) 30%, transparent); border-radius: 12px; padding: 16px; margin-bottom: 12px; text-align: center;">' +
            '<span style="font-size: 16px;">🎉 모든 본업 태스크 완료!</span>' +
          '</div>';
        }

        if (!focus) return '';

        // 모드별 라벨/색상
        const modeConfig = {
          urgent: { label: '🎯 지금 집중:', color: null },
          normal: { label: '🎯 지금 집중:', color: 'var(--accent-success)' },
          proactive: { label: '💡 미리 해두면 좋은 것:', color: 'var(--accent-primary)' },
          general: { label: '📋 여유 시간에:', color: 'var(--accent-neutral)' }
        };
        const cfg = modeConfig[focusMode] || modeConfig.normal;
        const focusPulse = calculateTaskPulse(focus);
        const focusColor = cfg.color || PULSE_COLORS[focusPulse] || 'var(--accent-primary)';
        const timeLabel = focus.estimatedTime ? '~' + focus.estimatedTime + '분' : '';
        const isGeneral = focusMode === 'general';
        const completeOnClick = isGeneral
          ? 'completeTask(\'' + escapeAttr(focus.id) + '\')'
          : 'toggleWorkTaskComplete(\'' + escapeAttr(focus._projectId) + '\', ' + focus._stageIdx + ', ' + focus._subcatIdx + ', ' + focus._taskIdx + ')';

        // Compact (default) — 한 줄, 클릭으로 펼침
        if (!appState.workFocusExpanded) {
          const ctxText = isGeneral ? '' : escapeHtml(focus._projectName) + (timeLabel ? ' · ' + timeLabel : '');
          return '<div class="work-focus-compact" style="border-left-color: ' + focusColor + ';" onclick="toggleWorkFocusExpanded()" title="클릭하여 펼치기">' +
            '<span class="work-focus-compact-label">' + cfg.label + '</span>' +
            '<span class="work-focus-compact-title">' + escapeHtml(focus.title) + '</span>' +
            (ctxText ? '<span class="work-focus-compact-ctx">' + ctxText + '</span>' : '') +
            '<button class="work-focus-compact-btn" style="background: ' + focusColor + ';" onclick="event.stopPropagation(); ' + completeOnClick + '">완료 ✓</button>' +
          '</div>';
        }

        // Full 카드 (펼침 상태) — 카드 클릭 시 다시 접힘
        const completeBtn = '<button onclick="event.stopPropagation(); ' + completeOnClick + '" style="padding: 8px 16px; background: ' + focusColor + '; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; min-height: 44px;">완료 ✓</button>';
        const contextLine = isGeneral
          ? ''
          : '<div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">' + escapeHtml(focus._projectName) + ' &gt; ' + escapeHtml(focus._stageName) + (timeLabel ? ' · ' + timeLabel : '') + '</div>';
        const proactiveHint = focusMode === 'proactive'
          ? '<div style="font-size: 12px; color: ' + focusColor + '; margin-top: 4px; opacity: 0.8;">이 태스크는 다음 단계이지만 미리 시작할 수 있습니다</div>'
          : '';

        return '<div class="work-focus-card" onclick="toggleWorkFocusExpanded()" title="클릭하여 접기" style="background: color-mix(in srgb, ' + focusColor + ' 8%, transparent); border: 1px solid color-mix(in srgb, ' + focusColor + ' 25%, transparent); border-left: 4px solid ' + focusColor + '; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer;">' +
          '<div style="flex: 1; min-width: 0;">' +
            '<div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">' + cfg.label + '</div>' +
            '<div style="font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(focus.title) + '</div>' +
            contextLine +
            proactiveHint +
          '</div>' +
          completeBtn +
        '</div>';
      })()}

      ${(() => {
        const wl = calculateWorkload();
        if (wl.taskCount === 0) return '';
        const statusColors = { overloaded: 'var(--accent-danger)', tight: 'var(--accent-warning)', moderate: 'var(--accent-amber)', comfortable: 'var(--accent-success)' };
        const statusLabels = { overloaded: '과부하', tight: '빡빡함', moderate: '보통', comfortable: '여유' };
        const barColor = statusColors[wl.status] || 'var(--accent-success)';
        const barWidth = Math.min(100, wl.loadPercentage);
        const hoursRemaining = (wl.totalRemainingMinutes / 60).toFixed(1);
        const hoursAvailable = (wl.totalAvailableMinutes / 60).toFixed(0);
        return '<div class="work-load-compact">' +
          '<span class="work-load-compact-label">📊 부하</span>' +
          '<div class="work-load-compact-bar"><div class="work-load-compact-bar-fill" style="width: ' + barWidth + '%; background: ' + barColor + ';"></div></div>' +
          '<span class="work-load-compact-status" style="color: ' + barColor + ';">' + statusLabels[wl.status] + ' ' + wl.loadPercentage + '%</span>' +
          '<span class="work-load-compact-meta">' + hoursRemaining + 'h / ' + hoursAvailable + 'h · ' + wl.taskCount + '개 · ' + wl.remainingWorkdays + '근무일</span>' +
        '</div>';
      })()}

      ${inProgressProjects.length > 0 ? `
        <div class="work-section work-section-pinned">
          <div class="work-section-title">🚀 진행중 (${inProgressProjects.length})</div>
          <div class="work-dashboard">
            ${inProgressProjects.map(p => renderWorkDashboardCard(p)).join('')}
          </div>
        </div>
      ` : ''}

      ${(() => {
        const tasks = getCrossProjectPriorityTasks();
        if (tasks.length === 0) {
          const activeCount = appState.workProjects.filter(p => !p.archived && !p.onHold).length;
          if (activeCount === 0) return '';
          return '<div class="work-priority-placeholder">' +
            '<span class="work-priority-placeholder-icon">⭐</span>' +
            '<span>우선순위 높은 항목이 여기 모입니다 — task에 ★ 표기 또는 마감 7일 이내 시 자동 노출</span>' +
          '</div>';
        }
        const limit = 8;
        const visible = tasks.slice(0, limit);
        const moreCount = tasks.length - limit;
        return '<div class="work-priority-list">' +
          '<div class="work-priority-list-header">' +
            '<span class="work-priority-list-title">⭐ 지금 할 것 (우선순위/임박)</span>' +
            '<span class="work-priority-list-count">' + tasks.length + '개</span>' +
          '</div>' +
          visible.map(t => {
            const priority = t.priority || 0;
            const stars = priority > 0 ? '★'.repeat(priority) : '';
            let deadlineHtml = '';
            if (t.deadline) {
              const d = new Date(t.deadline);
              const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
              const cls = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'soon' : '';
              const txt = daysLeft < 0 ? 'D+' + Math.abs(daysLeft) : daysLeft === 0 ? 'D-Day' : 'D-' + daysLeft;
              deadlineHtml = '<span class="work-priority-item-deadline ' + cls + '">' + txt + '</span>';
            }
            return '<div class="work-priority-item" onclick="selectWorkProject(\'' + escapeAttr(t._projectId) + '\'); setWorkView(\'detail\');">' +
              (stars ? '<span class="work-priority-item-stars">' + stars + '</span>' : '') +
              '<span class="work-priority-item-title">' + escapeHtml(t.title) + '</span>' +
              '<span class="work-priority-item-ctx">' + escapeHtml(t._projectName) + ' · ' + escapeHtml(t._stageName) + '</span>' +
              deadlineHtml +
            '</div>';
          }).join('') +
          (moreCount > 0 ? '<div class="work-priority-more">+ ' + moreCount + '개 더 (각 프로젝트 상세에서 확인)</div>' : '') +
        '</div>';
      })()}

      ${(() => {
        const activeProjects = appState.workProjects.filter(p => !p.archived && !p.onHold);
        if (activeProjects.length === 0) return '';
        const staleWarn = [];
        const staleDanger = [];
        const overdueProjects = [];
        activeProjects.forEach(p => {
          const days = getProjectStaleDays(p);
          if (days >= 14) staleDanger.push({ p, days });
          else if (days >= 7) staleWarn.push({ p, days });
          const overdueCount = getOverdueTaskCount(p);
          if (overdueCount > 0) overdueProjects.push({ p, count: overdueCount });
        });
        if (staleWarn.length === 0 && staleDanger.length === 0 && overdueProjects.length === 0) return '';
        let items = '';
        staleDanger.forEach(({ p, days }) => {
          items += '<div class="work-risk-item danger" onclick="selectWorkProject(\'' + escapeAttr(p.id) + '\'); setWorkView(\'detail\');">' +
            '<span class="work-risk-icon">🔴</span>' +
            '<span class="work-risk-label">' + days + '일째 업데이트 없음</span>' +
            '<span class="work-risk-target">' + escapeHtml(p.name) + '</span>' +
          '</div>';
        });
        staleWarn.forEach(({ p, days }) => {
          items += '<div class="work-risk-item warn" onclick="selectWorkProject(\'' + escapeAttr(p.id) + '\'); setWorkView(\'detail\');">' +
            '<span class="work-risk-icon">🟡</span>' +
            '<span class="work-risk-label">' + days + '일째 업데이트 없음</span>' +
            '<span class="work-risk-target">' + escapeHtml(p.name) + '</span>' +
          '</div>';
        });
        overdueProjects.forEach(({ p, count }) => {
          items += '<div class="work-risk-item danger" onclick="selectWorkProject(\'' + escapeAttr(p.id) + '\'); setWorkView(\'detail\');">' +
            '<span class="work-risk-icon">⏰</span>' +
            '<span class="work-risk-label">마감 지난 항목 ' + count + '개</span>' +
            '<span class="work-risk-target">' + escapeHtml(p.name) + '</span>' +
          '</div>';
        });
        return '<div class="work-risk-alerts">' + items + '</div>';
      })()}

      ${(() => {
        const alertProjects = appState.workProjects.filter(p => !p.archived && !p.onHold && ['critical', 'warning', 'attention'].includes(calculateProjectPulse(p)));
        if (alertProjects.length === 0) return '';
        const critCount = alertProjects.filter(p => calculateProjectPulse(p) === 'critical').length;
        return '<div class="work-pulse-alert" style="background: ' + (critCount > 0 ? 'var(--accent-danger-alpha); border: 1px solid color-mix(in srgb, var(--accent-danger) 30%, transparent)' : 'var(--accent-warning-alpha); border: 1px solid color-mix(in srgb, var(--pulse-warning) 30%, transparent)') + '; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 14px; display: flex; align-items: center; gap: 8px;">' +
          '<span>' + (critCount > 0 ? '🔴' : '🟠') + '</span>' +
          '<span style="font-weight: 600;">' + alertProjects.length + '개 프로젝트 주의 필요</span>' +
          '<span style="color: var(--text-muted);">' + alertProjects.map(p => escapeHtml(p.name)).join(', ') + '</span>' +
        '</div>';
      })()}

      <!-- 본업 빠른 추가 -->
      <div class="work-quick-add">
        <input
          type="text"
          class="work-quick-input"
          placeholder="${appState.workView === 'detail' && activeProject ? escapeAttr(activeProject.name) + ' — ' + escapeAttr(getStageName(activeProject, activeProject.currentStage || 0)) + '에 추가 (Enter)' : '프로젝트 없이 본업 작업 추가 (Enter)'}"
          id="work-quick-input"
          onkeypress="if(event.key==='Enter') quickAddWorkTask()"
        >
        <button class="work-owner-toggle ${appState.workQuickAddOwner === 'other' ? 'other' : ''}" onclick="toggleWorkQuickOwner()" title="담당자 전환">
          ${appState.workQuickAddOwner === 'other' ? '👤타' : '👤나'}
        </button>
        <button class="work-quick-btn" onclick="quickAddWorkTask()">+</button>
      </div>

      ${workGeneralTasks.length > 0 ? `
        <div class="work-general-tasks">
          <div class="work-general-title">📋 일반 작업 (${workGeneralTasks.length})</div>
          <div class="work-general-list">
            ${workGeneralTasks.slice(0, 5).map(task => `
              <div class="work-general-item-wrapper">
                <div class="work-general-item">
                  <button class="task-check-btn" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>
                  <span class="work-general-item-title" title="${escapeAttr(task.title)}" onclick="event.stopPropagation(); editTask('${escapeAttr(task.id)}')">${escapeHtml(task.title)}</span>
                  ${task.deadline ? `<span class="work-general-deadline">${escapeHtml(formatDeadline(task.deadline))}</span>` : ''}
                  ${task.subtasks && task.subtasks.length > 0 ? `
                    <span class="subtask-badge">
                      📋${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length}
                    </span>
                  ` : ''}
                  <button class="work-general-edit-btn" onclick="event.stopPropagation(); editTask('${escapeAttr(task.id)}')" title="수정" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                  <button class="work-general-delete-btn" onclick="event.stopPropagation(); deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                </div>
                ${task.subtasks && task.subtasks.length > 0 ? `
                  <div class="work-general-subtasks">
                    ${task.subtasks.map((st, idx) => `
                      <div class="work-general-subtask ${st.completed ? 'completed' : ''}" onclick="toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})">
                        <span class="subtask-check">${st.completed ? '✓' : '○'}</span>
                        <span>${escapeHtml(st.text)}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
            ${workGeneralTasks.length > 5 ? `<div class="work-general-more" onclick="appState.workView='detail'; selectWorkProject('general')" style="cursor:pointer">+ ${workGeneralTasks.length - 5}개 더</div>` : ''}
          </div>
        </div>
      ` : ''}

      ${(() => {
        const completedGeneral = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && t.completed);
        if (completedGeneral.length === 0) return '';
        const isExpanded = appState.showCompletedGeneral;
        const pageSize = COMPLETED_LOG_PAGE_SIZE;  // state-types.js:19 공유 상수 (10)
        const totalPages = Math.max(1, Math.ceil(completedGeneral.length / pageSize));
        const currentPage = Math.min(Math.max(0, appState.workGeneralCompletedPage || 0), totalPages - 1);
        const pageItems = completedGeneral.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
        return `
          <div class="work-general-tasks" style="margin-top: 4px; opacity: 0.85;">
            <div class="work-general-title" onclick="appState.showCompletedGeneral=!appState.showCompletedGeneral; renderStatic();" style="cursor:pointer;">
              ${isExpanded ? '▼' : '▶'} ✅ 완료됨 (${completedGeneral.length})
            </div>
            ${isExpanded ? `
              <div class="work-general-list">
                ${pageItems.map(task => `
                  <div class="work-general-item" style="opacity: 0.6;">
                    <button class="task-check-btn" onclick="event.stopPropagation(); uncompleteTask('${escapeAttr(task.id)}')" title="완료 취소" aria-label="완료 취소">✓</button>
                    <span class="work-general-item-title completed" title="${escapeAttr(task.title)}" onclick="event.stopPropagation(); editTask('${escapeAttr(task.id)}')" style="text-decoration: line-through;">${escapeHtml(task.title)}</span>
                    ${task.completedAt ? '<span style="font-size: 13px; color: var(--text-muted);">' + escapeHtml(task.completedAt.substring(5, 10).replace('-', '/')) + '</span>' : ''}
                    <button class="work-general-edit-btn" onclick="event.stopPropagation(); editTask('${escapeAttr(task.id)}')" title="수정" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                    <button class="work-general-delete-btn" onclick="event.stopPropagation(); deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                  </div>
                `).join('')}
                ${renderPagination(currentPage, totalPages, completedGeneral.length, 'setWorkGeneralCompletedPage')}
              </div>
            ` : ''}
          </div>
        `;
      })()}

      <!-- 뷰 전환 -->
      <div class="work-view-tabs">
        <button class="work-view-tab ${appState.workView === 'dashboard' ? 'active' : ''}" onclick="setWorkView('dashboard')">📊 대시보드</button>
        <button class="work-view-tab ${appState.workView === 'detail' ? 'active' : ''}" onclick="setWorkView('detail')">📝 상세보기</button>
        <button class="work-view-tab ${appState.workView === 'calendar' ? 'active' : ''}" onclick="setWorkView('calendar')">📅 달력</button>
        <button class="work-view-tab ${appState.workView === 'timeline' ? 'active' : ''}" onclick="setWorkView('timeline')">📜 이력</button>
        ${archivedProjects.length > 0 ? `
          <button class="work-view-tab" style="margin-left: auto;" onclick="toggleArchivedProjects()">
            📦 아카이브 (${archivedProjects.length})
          </button>
        ` : ''}
      </div>

      ${appState.workView === 'dashboard' ? `
        <!-- 대시보드 뷰 -->
        ${noDeadlineProjects.length > 0 ? `
          <div class="work-section collapsible" style="margin-top: 20px;">
            <div class="work-section-title clickable" style="color: var(--text-muted);" onclick="toggleWorkSection('noDeadline')">
              <span class="work-section-toggle">${appState.workSectionExpanded?.noDeadline ? '▼' : '▶'}</span>
              📋 마감없음 (${noDeadlineProjects.length})
            </div>
            ${appState.workSectionExpanded?.noDeadline ? `
              <div class="work-dashboard">
                ${noDeadlineProjects.map(p => renderWorkDashboardCard(p)).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${onHoldProjects.length > 0 ? `
          <div class="work-section collapsible" style="margin-top: 20px;">
            <div class="work-section-title clickable" style="color: var(--accent-danger);" onclick="toggleWorkSection('onHold')">
              <span class="work-section-toggle">${appState.workSectionExpanded?.onHold ? '▼' : '▶'}</span>
              ⏸ 보류 (${onHoldProjects.length})
            </div>
            ${appState.workSectionExpanded?.onHold ? `
              <div class="work-dashboard">
                ${onHoldProjects.map(p => renderWorkDashboardCard(p)).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${completedProjects.length > 0 ? `
          <div class="work-section collapsible" style="margin-top: 20px;">
            <div class="work-section-title clickable" style="color: var(--accent-success);" onclick="toggleWorkSection('completed')">
              <span class="work-section-toggle">${appState.workSectionExpanded?.completed ? '▼' : '▶'}</span>
              ✅ 완료 (${completedProjects.length})
            </div>
            ${appState.workSectionExpanded?.completed ? `
              <div class="work-dashboard">
                ${completedProjects.map(p => renderWorkDashboardCard(p)).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${appState.showArchivedProjects && archivedProjects.length > 0 ? `
          <div class="work-section" style="margin-top: 20px;">
            <div class="work-section-title">📦 아카이브 (${archivedProjects.length})</div>
            <div class="work-dashboard">
              ${archivedProjects.map(p => renderWorkDashboardCard(p)).join('')}
            </div>
          </div>
        ` : ''}
      ` : ''}
      ${appState.workView === 'detail' ? `
        <!-- 상세 뷰 -->
        <div class="work-project-selector">
          <label class="work-project-selector-label">프로젝트 선택</label>
          <select class="work-project-select" onchange="selectWorkProject(this.value)">
            <option value="" ${!appState.activeWorkProject ? 'selected' : ''}>-- 프로젝트 선택 --</option>
            <option value="general" ${appState.activeWorkProject === 'general' ? 'selected' : ''}>📋 일반 업무</option>
            ${inProgressProjects.length > 0 ? `
              <optgroup label="🚀 진행중">
                ${inProgressProjects.map(p => {
                  const pp = calculateProjectPulse(p);
                  const dot = pp === 'critical' || pp === 'overdue' ? '🔴 ' : pp === 'warning' || pp === 'attention' ? '🟠 ' : pp === 'on-track' ? '🟢 ' : '';
                  return '<option value="' + p.id + '" ' + (p.id === appState.activeWorkProject ? 'selected' : '') + '>' + dot + escapeHtml(p.name) + '</option>';
                }).join('')}
              </optgroup>
            ` : ''}
            ${noDeadlineProjects.length > 0 ? `
              <optgroup label="📋 마감없음">
                ${noDeadlineProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
            ${onHoldProjects.length > 0 ? `
              <optgroup label="⏸ 보류">
                ${onHoldProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
            ${completedProjects.length > 0 ? `
              <optgroup label="✅ 완료">
                ${completedProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
            ${archivedProjects.length > 0 ? `
              <optgroup label="📦 아카이브">
                ${archivedProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
          </select>
        </div>
        ${appState.activeWorkProject === 'general' ? renderWorkGeneralView() :
          activeProject ? renderWorkProjectDetail(activeProject) : `
          <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            프로젝트를 선택하세요
          </div>
        `}
      ` : ''}
      ${appState.workView === 'calendar' ? `
        <!-- 프로젝트 스케줄 뷰 + 달력 -->
        ${renderWorkCalendarView()}
      ` : ''}
      ${appState.workView === 'timeline' ? `
        <!-- 이력 뷰 (프로젝트 이력 / 활동 이력) -->
        ${renderWorkTimeline()}
      ` : ''}
    </div>
  `;
}

/**
 * 본업 일반 작업 완료 섹션 페이지 변경 핸들러
 * (renderPagination → onclick="setWorkGeneralCompletedPage(N)"에서 호출)
 */
function setWorkGeneralCompletedPage(page) {
  appState.workGeneralCompletedPage = Math.max(0, page);
  renderStatic();
}
window.setWorkGeneralCompletedPage = setWorkGeneralCompletedPage;

// setWorkView, calendar state, selectWorkCalendarDate, navigateWorkCalendar,
// toggleArchivedProjects, toggleWorkQuickOwner, toggleWorkSection,
// toggleStageCollapse, toggleSubcategoryCollapse, toggleTaskExpand,
// toggleTaskDetailExpand, toggleWorkLogs → work-toggles.js로 분리됨
