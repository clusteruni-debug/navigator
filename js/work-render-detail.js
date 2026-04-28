// ============================================
// 본업 프로젝트 상세 / 태스크 렌더링
// (work-render.js에서 분리)
// ============================================

/**
 * Next Up: 현재 단계의 미완료 task 최대 3개를 우선순위대로 렌더
 * - 필터: completed/blocked 제외, owner !== 'other'
 * - 정렬: deadline 임박순 → in-progress 우선 → 배열 순서
 * - 빈 상태(후보 0개 또는 모든 단계 완료): 블록 자체 숨김
 * - v1 스코프: canStartEarly 미래 task 제외, 클릭 동작 없음
 */
function renderNextUpBlock(project) {
  if (!project || !project.stages || project.stages.length === 0) return '';

  const currentIdx = project.stages.findIndex(s => !s.completed);
  if (currentIdx === -1) return ''; // 모든 단계 완료

  const currentStage = project.stages[currentIdx];
  const stageName = getStageName(project, currentIdx);
  const subcategories = currentStage.subcategories || [];

  // 후보 수집: 현재 단계의 모든 중분류 > 모든 task
  const candidates = [];
  subcategories.forEach(subcat => {
    (subcat.tasks || []).forEach(task => {
      if (task.status === 'completed' || task.status === 'blocked') return;
      if (task.owner === 'other') return;
      candidates.push({ task, subcatName: subcat.name });
    });
  });

  if (candidates.length === 0) return '';

  // 정렬: deadline 임박순 → in-progress 우선 → 배열 순서 (stable)
  const STATUS_WEIGHT = { 'in-progress': 0, 'not-started': 1 };
  candidates.sort((a, b) => {
    const da = a.task.deadline;
    const db = b.task.deadline;
    if (da && db) {
      if (da !== db) return da < db ? -1 : 1;
    } else if (da && !db) {
      return -1;
    } else if (!da && db) {
      return 1;
    }
    const wa = STATUS_WEIGHT[a.task.status] ?? 2;
    const wb = STATUS_WEIGHT[b.task.status] ?? 2;
    if (wa !== wb) return wa - wb;
    return 0;
  });

  const topItems = candidates.slice(0, 3);

  const itemsHtml = topItems.map(({ task, subcatName }) => {
    const statusInfo = WORK_STATUS[task.status] || WORK_STATUS['not-started'];
    let deadlineHtml = '';
    if (task.deadline) {
      const d = new Date(task.deadline);
      const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
      const cls = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'soon' : '';
      const txt = daysLeft < 0 ? 'D+' + Math.abs(daysLeft) : daysLeft === 0 ? 'D-Day' : 'D-' + daysLeft;
      deadlineHtml = '<span class="work-next-up-deadline ' + cls + '">' + txt + '</span>';
    }
    const metaText = escapeHtml(stageName) + ' · ' + escapeHtml(subcatName);
    return '<div class="work-next-up-item">' +
      '<span class="work-next-up-status ' + task.status + '">' + escapeHtml(statusInfo.label) + '</span>' +
      '<span class="work-next-up-title">' + escapeHtml(task.title) + '</span>' +
      '<span class="work-next-up-meta">' + metaText + deadlineHtml + '</span>' +
      '</div>';
  }).join('');

  return '<div class="work-next-up">' +
    '<div class="work-next-up-header">▶ 지금 할 일</div>' +
    '<div class="work-next-up-list">' + itemsHtml + '</div>' +
    '</div>';
}

/**
 * 긴 log 본문 자동 접기 — content가 250자 OR 5줄 이상이면 미리보기 + 더보기 토글
 * - logKey: 작업 단위 고유 키(taskUid) + log 인덱스 조합
 * - 상태 저장: appState.expandedWorkLogContents (메모리 only, 세션 단위)
 */
function renderWorkLogContent(content, logKey) {
  if (!content) return '';
  const LONG_CHAR = 250;
  const LONG_LINES = 5;
  const PREVIEW_CHAR = 100;
  const lines = content.split('\n');
  const isLong = content.length > LONG_CHAR || lines.length >= LONG_LINES;

  if (!isLong) {
    return renderFormattedText(content);
  }

  const isExpanded = appState.expandedWorkLogContents && appState.expandedWorkLogContents[logKey];

  if (isExpanded) {
    return renderFormattedText(content) +
      '<button class="work-log-content-toggle" onclick="event.stopPropagation(); toggleWorkLogContent(\'' + escapeAttr(logKey) + '\')">▲ 접기</button>';
  }

  const firstLine = lines[0] || '';
  const preview = firstLine.length > PREVIEW_CHAR ? firstLine.slice(0, PREVIEW_CHAR) : firstLine;
  return '<div class="work-log-content-preview">' + renderFormattedText(preview) + '</div>' +
    '<button class="work-log-content-toggle" onclick="event.stopPropagation(); toggleWorkLogContent(\'' + escapeAttr(logKey) + '\')">▼ 더보기</button>';
}

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

      <!-- 빠른 작성 텍스트 영역 (메모장 흡수: 들여쓰기 + ★ + (날짜)) -->
      ${(() => {
        const isExpanded = appState.workSketchExpanded && appState.workSketchExpanded[project.id];
        const placeholder = '예: └ 음료 구매 ★★★★★ (4/27)';
        return '<div class="work-sketch-area">' +
          '<div class="work-sketch-header" onclick="toggleWorkSketchExpanded(\'' + escapeAttr(project.id) + '\')">' +
            '<span class="work-sketch-toggle-icon">' + (isExpanded ? '▼' : '▶') + '</span>' +
            '<span class="work-sketch-title">📝 빠른 작성</span>' +
            '<span class="work-sketch-hint">메모장처럼 들여쓰기 + ★ + (4/27) 자유롭게</span>' +
          '</div>' +
          (isExpanded
            ? '<textarea id="work-sketch-textarea-' + escapeAttr(project.id) + '" class="work-sketch-textarea" placeholder="' + escapeAttr(placeholder) + '"></textarea>' +
              '<div class="work-sketch-actions">' +
                '<button class="work-sketch-btn-apply" onclick="applySketchFromInput(\'' + escapeAttr(project.id) + '\')">트리에 추가</button>' +
                '<span class="work-sketch-help">들여쓰기 0 = 단계 / └ prefix = 묶음 / 들여쓰기 4+ = 항목</span>' +
              '</div>'
            : '<div class="work-sketch-collapsed-hint" onclick="toggleWorkSketchExpanded(\'' + escapeAttr(project.id) + '\')">클릭해서 펼치기 — 메모장 텍스트 paste로 단계/항목 한 번에 입력</div>'
          ) +
        '</div>';
      })()}

      <!-- Next Up: 지금 할 일 -->
      ${renderNextUpBlock(project)}

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
          const _csVal = appState.collapsedStages && appState.collapsedStages[project.id + '-' + stageIdx];
          const isCollapsed = _csVal === 'explicit-collapsed' ? true
            : _csVal === 'explicit-expanded' ? false
            : (currentIdx === -1 || stageIdx !== currentIdx); // default: only current stage expanded
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
                  const subcatCompletedCount = subcat.tasks.filter(t => t.status === 'completed').length;
                  const subcatTotalCount = subcat.tasks.length;
                  const subcatAllDone = (subcatTotalCount > 0 && subcatCompletedCount === subcatTotalCount) || (subcatTotalCount === 0 && subcat._completed);
                  const _scVal = appState.collapsedSubcategories && appState.collapsedSubcategories[subcatKey];
                  const isSubcatCollapsed = _scVal === 'explicit-collapsed' ? true
                    : _scVal === 'explicit-expanded' ? false
                    : subcatAllDone; // default: all-done subcategories collapsed
                  return `
                  <div class="work-subcategory"
                       ondragover="handleSubcategoryDragOver(event, '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})"
                       ondrop="handleSubcategoryDrop(event, '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})"
                       ondragend="handleWorkDragEnd(event)">
                    <div class="work-subcategory-header">
                      <div class="work-subcategory-title">
                        <span class="work-drag-handle" draggable="true" ondragstart="handleSubcategoryDragStart(event, '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="드래그하여 순서 변경">≡</span>
                        <span class="work-subcategory-collapse-toggle" onclick="toggleSubcategoryCollapse('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="${isSubcatCollapsed ? '펼치기' : '접기'}" style="cursor: pointer; font-size: 12px; color: var(--text-muted); width: 16px; text-align: center; flex-shrink: 0;">${isSubcatCollapsed ? '▶' : '▼'}</span>
                        <div class="work-subcategory-checkbox ${subcatAllDone ? 'checked' : ''}"
                             onclick="toggleSubcategoryComplete('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})">
                          ${subcatAllDone ? '✓' : ''}
                        </div>
                        <span class="work-subcategory-name" onclick="promptRenameSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="클릭하여 이름 변경">${escapeHtml(subcat.name)}</span>
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
                        <button class="work-task-action" onclick="promptRenameSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="중분류 이름 변경">${svgIcon('edit', 14)}</button>
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

      <!-- 노션 보고서 아카이브 (단방향 paste, project level) -->
      ${(() => {
        if (!appState.workArchiveExpanded) appState.workArchiveExpanded = {};
        if (!appState.workArchiveEditing) appState.workArchiveEditing = {};
        const isExpanded = appState.workArchiveExpanded[project.id];
        const isEditing = appState.workArchiveEditing[project.id];
        const hasReport = !!project.archivedReport;
        const charCount = hasReport ? project.archivedReport.length : 0;
        return '<div class="work-archive-area">' +
          '<div class="work-archive-header" onclick="toggleWorkArchiveExpanded(\'' + escapeAttr(project.id) + '\')">' +
            '<span class="work-archive-toggle-icon">' + (isExpanded ? '▼' : '▶') + '</span>' +
            '<span class="work-archive-title">📥 노션 보고서</span>' +
            '<span class="work-archive-meta">' + (hasReport ? charCount + '자 저장됨' : '비어있음 — 노션 완성 보고서 paste') + '</span>' +
            (hasReport && isExpanded && !isEditing ? '<button class="work-archive-btn-edit" onclick="event.stopPropagation(); toggleWorkArchiveEditing(\'' + escapeAttr(project.id) + '\')">편집</button>' : '') +
          '</div>' +
          (isExpanded ? (
            isEditing
              ? '<textarea id="work-archive-textarea-' + escapeAttr(project.id) + '" class="work-archive-textarea" placeholder="노션에서 완성한 보고서를 여기 paste (마크다운 지원)">' + escapeHtml(project.archivedReport || '') + '</textarea>' +
                '<div class="work-archive-actions">' +
                  '<button class="work-archive-btn-save" onclick="saveArchivedReport(\'' + escapeAttr(project.id) + '\')">저장</button>' +
                  '<button class="work-archive-btn-cancel" onclick="toggleWorkArchiveEditing(\'' + escapeAttr(project.id) + '\')">취소</button>' +
                '</div>'
              : (hasReport
                ? '<div class="work-archive-content">' + renderFormattedText(project.archivedReport) + '</div>'
                : '<div class="work-archive-empty" onclick="toggleWorkArchiveEditing(\'' + escapeAttr(project.id) + '\')">클릭해서 노션 보고서 붙여넣기 — Slack→Navigator→Notion 3중 입력 대신 단방향 아카이빙</div>'
              )
          ) : '') +
        '</div>';
      })()}

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

  const taskExpandKey = projectId + '-' + stageIdx + '-' + subcatIdx + '-' + taskIdx;
  const isTaskExpanded = appState.expandedWorkTasks && appState.expandedWorkTasks[taskExpandKey];

  // Detail accordion: 3+ logs → default collapsed
  const totalLogCount = task.logs ? task.logs.length : 0;
  const isCollapsible = totalLogCount >= 3;
  const isDetailExpanded = !isCollapsible || (appState.expandedWorkTaskDetails && appState.expandedWorkTaskDetails[taskExpandKey]);

  // 긴 log 본문이 하나라도 있으면 일괄 토글 버튼 노출 (250자 OR 5줄 이상 기준)
  const hasLongLogs = (task.logs || []).some(log => {
    const c = log.content || '';
    return c.length > 250 || c.split('\n').length >= 5;
  });

  return `
    <div class="work-task-item${task.status === 'completed' ? ' work-task-completed' : ''}"
         ondragover="handleWorkTaskDragOver(event, '${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
         ondrop="handleWorkTaskDrop(event, '${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
         ondragend="handleWorkDragEnd(event)"
         style="${pulseColor !== 'transparent' ? 'border-left: 3px solid ' + pulseColor + ';' : ''}">
      <div class="work-task-header">
        <span class="work-drag-handle" draggable="true" ondragstart="handleWorkTaskDragStart(event, '${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="드래그하여 순서 변경">≡</span>
        ${isCollapsible ? `<span class="work-task-detail-chevron" data-detail-key="${taskExpandKey}" data-log-count="${totalLogCount}" onclick="event.stopPropagation(); toggleTaskDetailExpand('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="${isDetailExpanded ? '기록 접기' : '기록 펼치기'}">${isDetailExpanded ? '▼' : '▶ ' + totalLogCount + '기록'}</span>` : ''}
        <div class="work-task-checkbox ${task.status === 'completed' ? 'checked' : ''}"
             onclick="toggleWorkTaskComplete('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
             title="완료 체크">
          ${task.status === 'completed' ? '✓' : ''}
        </div>
        <span class="work-status-badge ${task.status}" onclick="cycleWorkTaskStatus('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
              title="클릭하여 상태 변경">
          ${statusInfo.label}
        </span>
        <span class="work-task-priority${(task.priority || 0) > 0 ? ' has-stars' : ''}" onclick="event.stopPropagation(); cycleTaskPriority('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="클릭으로 우선순위 변경 (★0~5, 현재 ${task.priority || 0})">${(task.priority || 0) > 0 ? '★'.repeat(task.priority) + '☆'.repeat(5 - task.priority) : '★'}</span>
        ${task.isNewFromV2 ? '<span class="task-meta-badge new-v2" title="v3 신규 항목">v3</span>' : ''}
        ${task.rationaleRef ? '<span class="task-meta-badge rationale" title="근거: ' + escapeAttr(task.rationaleRef) + '">' + escapeHtml(task.rationaleRef) + '</span>' : ''}
        ${task.notes ? '<span class="task-meta-badge note" title="' + escapeAttr(task.notes) + '">ⓘ</span>' : ''}
        <span id="task-title-${taskExpandKey}" class="work-task-title ${task.status === 'completed' ? 'completed' : ''}${isTaskExpanded ? ' expanded' : ''}"
              onclick="toggleTaskExpand('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
              title="${escapeAttr(task.title)}">${escapeHtml(task.title)}</span>
        ${task.canStartEarly ? '<span style="font-size: 11px; background: var(--accent-primary-alpha); color: var(--accent-primary); padding: 1px 6px; border-radius: 4px; white-space: nowrap;" title="미리 시작 가능">선제</span>' : ''}
        ${task.status === 'completed' && task.completedAt ? `<span class="work-task-completed-at" onclick="event.stopPropagation(); editWorkTaskCompletedAt('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="클릭하여 완료일 수정" style="font-size: 12px; color: var(--accent-success); cursor: pointer; white-space: nowrap; padding: 1px 6px; background: var(--accent-success-alpha); border-radius: 4px;">✓ ${escapeHtml(task.completedAt.substring(5, 10).replace('-', '/'))}</span>` : ''}
        ${deadlineHtml}
        <div class="work-task-actions">
          <button class="work-task-action" onclick="promptRenameWorkTask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})">${svgIcon('edit', 14)}</button>
          <button class="work-task-action" onclick="promptTaskDeadline('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="마감일 설정" aria-label="마감일 설정">📅</button>
          <button class="work-task-action" onclick="showWorkModal('log', '${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" aria-label="기록 추가">+ 기록</button>
          ${hasLongLogs ? `<button class="work-task-action" onclick="event.stopPropagation(); toggleAllWorkLogContents('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="긴 기록 본문 일괄 접기/펴기" aria-label="기록 본문 일괄 토글">📖</button>` : ''}
          <button class="work-task-action" onclick="event.stopPropagation(); toggleCanStartEarly('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="${task.canStartEarly ? '선제적 시작 해제' : '선제적 시작 설정'}" aria-label="선제적 시작 토글" style="${task.canStartEarly ? 'color: var(--accent-primary);' : ''}">💡</button>
          <button class="work-task-action" onclick="event.stopPropagation(); copyWorkTaskToSlack('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="슬랙 복사" aria-label="슬랙 복사">📋</button>
          <button class="work-task-action" onclick="deleteWorkTask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="항목 삭제" aria-label="항목 삭제" style="color: var(--accent-danger);">${svgIcon('trash', 14)}</button>
        </div>
      </div>
      ${task.subtasks && task.subtasks.length > 0 ? `
        <div class="work-task-subtasks">
          ${task.subtasks.map((st, idx) => `
            <div class="work-task-subtask${st.completed ? ' completed' : ''}${st.isRequired === false ? ' optional' : ''}" onclick="event.stopPropagation(); toggleWorkTaskSubtaskComplete('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx}, ${idx})">
              <span class="work-task-subtask-check">${st.completed ? '✓' : '○'}</span>
              <span class="work-task-subtask-text">${escapeHtml(st.text)}</span>
              ${st.isRequired === false ? '<span class="work-task-subtask-tag" title="선택 항목">선택</span>' : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${task.logs && task.logs.length > 0 ? `
        <div class="work-task-logs${!isDetailExpanded ? ' work-task-detail-hidden' : ''}" id="task-detail-${taskExpandKey}">
          ${(() => {
            // 완료 로그 압축: "✓ 완료" 로그는 하나로 요약
            // 원본 인덱스를 _idx로 보존 (findIndex 중복 매칭 방지)
            const indexedLogs = task.logs.map((l, i) => ({ ...l, _idx: i }));
            const completionLogs = indexedLogs.filter(l => l.content === '✓ 완료');
            const otherLogs = indexedLogs.filter(l => l.content !== '✓ 완료');
            const pid = escapeAttr(projectId);
            const si = Number(stageIdx), sci = Number(subcatIdx), ti = Number(taskIdx);
            const taskUid = task.id || (pid + '-' + si + '-' + sci + '-' + ti);
            let html = '';
            if (completionLogs.length > 0) {
              const lastIdx = completionLogs[completionLogs.length - 1]._idx;
              const lastDate = completionLogs[completionLogs.length - 1].date;
              const label = completionLogs.length === 1
                ? '✓ 완료 (' + lastDate + ')'
                : '✓ ' + completionLogs.length + '회 완료 (최근: ' + lastDate + ')';
              // 일관성: 모든 log 본문은 renderWorkLogContent를 거침 (completion label은 짧아 항상 그대로 출력)
              const _compLogKey = taskUid + '-log-' + lastIdx;
              html += '<div class="work-task-log"><span class="work-task-log-date" style="color: var(--accent-success);">' + renderWorkLogContent(label, _compLogKey) + '</span>' +
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
                const actualIdx = log._idx;
                const _logKey = taskUid + '-log-' + actualIdx;
                html += '<div class="work-task-log"><span class="work-task-log-date">' + escapeHtml(log.date) + '</span><div class="work-task-log-content">' + renderWorkLogContent(log.content, _logKey) + '</div>' +
                  '<div class="work-task-log-actions">' +
                    '<button class="work-task-log-action" onclick="editWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" aria-label="기록 편집">✏️</button>' +
                    '<button class="work-task-log-action" onclick="copyLogContentToSlack(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" title="슬랙 형식 복사" aria-label="슬랙 형식 복사">📋</button>' +
                    '<button class="work-task-log-action" onclick="deleteWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" aria-label="기록 삭제">×</button>' +
                  '</div></div>';
              });
              html += '</div>';
              html += '<div class="work-task-logs-toggle" onclick="toggleWorkLogs(\'' + taskUid + '\')" id="logs-toggle-' + taskUid + '">' + (wasExpanded ? '▼' : '▶') + ' 이전 기록 ' + hiddenLogs.length + '개</div>';
            }
            visibleLogs.forEach(log => {
              const actualIdx = log._idx;
              const _logKey = taskUid + '-log-' + actualIdx;
              html += '<div class="work-task-log"><span class="work-task-log-date">' + escapeHtml(log.date) + '</span><div class="work-task-log-content">' + renderWorkLogContent(log.content, _logKey) + '</div>' +
                '<div class="work-task-log-actions">' +
                  '<button class="work-task-log-action" onclick="editWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" aria-label="기록 편집">✏️</button>' +
                  '<button class="work-task-log-action" onclick="copyLogContentToSlack(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + actualIdx + ')" title="슬랙 형식 복사" aria-label="슬랙 형식 복사">📋</button>' +
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
