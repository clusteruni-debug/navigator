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
    '<div class="work-next-up-header">' + svgIcon('play', 13) + ' 지금 할 일</div>' +
    '<div class="work-next-up-list">' + itemsHtml + '</div>' +
    '</div>';
}
window.renderNextUpBlock = renderNextUpBlock; // work.js _renderProjectExtras에서 호출 — 로드순서 무관 안전화

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

  // Detail accordion: 3+ logs → default collapsed.
  // P4 review: count user-authored logs only (origin auto-from-subtask:* 제외) — auto-note 누적이 collapse 토글 flip 시키지 않도록.
  // Round 2 review: hardcoded literal → AUTO_SUBTASK_ORIGIN_PREFIX 상수 (drift 방지).
  // M6: fallback 리터럴 제거 (상수와 drift 위험). 누락 시 silent 마스킹 대신 surface —
  //     render 중단 막으려 early-return 대신 console.error + 상수 직접 사용 (graceful degrade).
  if (typeof AUTO_SUBTASK_ORIGIN_PREFIX !== 'string') console.error('[navigator] AUTO_SUBTASK_ORIGIN_PREFIX 누락 — entries-model.js 로드 순서 확인');
  const _autoPrefix = AUTO_SUBTASK_ORIGIN_PREFIX;
  const totalLogCount = Array.isArray(task.logs)
    ? task.logs.filter(l => !l || typeof l.origin !== 'string' || l.origin.indexOf(_autoPrefix) !== 0).length
    : 0;
  const isCollapsible = totalLogCount >= 3;
  const isDetailExpanded = !isCollapsible || (appState.expandedWorkTaskDetails && appState.expandedWorkTaskDetails[taskExpandKey]);

  // 긴 log 본문이 하나라도 있으면 일괄 토글 버튼 노출 (250자 OR 5줄 이상 기준)
  // Round 3 review: Array.isArray + null log guard 통일 (line 452 와 일관성).
  const hasLongLogs = (Array.isArray(task.logs) ? task.logs : []).some(log => {
    if (!log) return false;
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
        ${isCollapsible ? `<span class="work-task-detail-chevron" role="button" tabindex="0" aria-expanded="${isDetailExpanded ? 'true' : 'false'}" aria-label="${isDetailExpanded ? '기록 접기' : '기록 펼치기'}" data-detail-key="${taskExpandKey}" data-log-count="${totalLogCount}" onclick="event.stopPropagation(); toggleTaskDetailExpand('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();toggleTaskDetailExpand('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})}" title="${isDetailExpanded ? '기록 접기' : '기록 펼치기'}">${isDetailExpanded ? '▼' : '▶ ' + totalLogCount + '기록'}</span>` : ''}
        <div class="work-task-checkbox ${task.status === 'completed' ? 'checked' : ''}"
             role="button" tabindex="0"
             aria-pressed="${task.status === 'completed' ? 'true' : 'false'}"
             aria-label="${task.status === 'completed' ? '완료 취소' : '완료 표시'}"
             onclick="toggleWorkTaskComplete('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleWorkTaskComplete('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})}"
             title="완료 체크">
          ${task.status === 'completed' ? '✓' : ''}
        </div>
        <span class="work-status-badge ${task.status}" role="button" tabindex="0"
              aria-label="상태 변경 (현재 ${statusInfo.label})"
              onclick="cycleWorkTaskStatus('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cycleWorkTaskStatus('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})}"
              title="클릭하여 상태 변경">
          ${statusInfo.label}
        </span>
        <span class="work-task-priority${(task.priority || 0) > 0 ? ' has-stars' : ''}" role="button" tabindex="0" aria-label="우선순위 변경 (현재 ${task.priority || 0}/5)" onclick="event.stopPropagation(); cycleTaskPriority('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();cycleTaskPriority('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})}" title="클릭으로 우선순위 변경 (★0~5, 현재 ${task.priority || 0})">${(task.priority || 0) > 0 ? '★ ' + task.priority : '★'}</span>
        ${task.isNewFromV2 ? '<span class="task-meta-badge new-v2" title="v3 신규 항목">v3</span>' : ''}
        ${task.rationaleRef ? '<span class="task-meta-badge rationale" title="근거: ' + escapeAttr(task.rationaleRef) + '">' + escapeHtml(task.rationaleRef) + '</span>' : ''}
        ${task.notes ? '<span class="task-meta-badge note" title="' + escapeAttr(task.notes) + '">ⓘ</span>' : ''}
        <span id="task-title-${taskExpandKey}" class="work-task-title ${task.status === 'completed' ? 'completed' : ''}${isTaskExpanded ? ' expanded' : ''}"
              onclick="toggleTaskExpand('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
              title="${escapeAttr(task.title)}">${escapeHtml(task.title)}</span>
        ${task.canStartEarly ? '<span style="font-size: 12px; background: var(--accent-primary-alpha); color: var(--accent-primary); padding: 1px 6px; border-radius: 4px; white-space: nowrap;" title="미리 시작 가능">선제</span>' : ''}
        ${task.status === 'completed' && task.completedAt ? `<span class="work-task-completed-at" onclick="event.stopPropagation(); editWorkTaskCompletedAt('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="클릭하여 완료일 수정" style="font-size: 12px; color: var(--accent-success); cursor: pointer; white-space: nowrap; padding: 1px 6px; background: var(--accent-success-alpha); border-radius: 4px;">✓ ${escapeHtml(task.completedAt.substring(5, 10).replace('-', '/'))}</span>` : ''}
        ${deadlineHtml}
        <div class="work-task-actions">
          <button class="work-task-action" onclick="promptRenameWorkTask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})">${svgIcon('edit', 14)}</button>
          <button class="work-task-action" onclick="promptTaskDeadline('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="마감일 설정" aria-label="마감일 설정">📅</button>
          <button class="work-task-action add-record-btn" onclick="showWorkModal('log', '${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" aria-label="기록 추가">+ 기록</button>
          ${hasLongLogs ? `<button class="work-task-action" onclick="event.stopPropagation(); toggleAllWorkLogContents('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="긴 기록 본문 일괄 접기/펴기" aria-label="기록 본문 일괄 토글">📖</button>` : ''}
          <button class="work-task-action" onclick="event.stopPropagation(); toggleCanStartEarly('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="${task.canStartEarly ? '선제적 시작 해제' : '선제적 시작 설정'}" aria-label="선제적 시작 토글" style="${task.canStartEarly ? 'color: var(--accent-primary);' : ''}">💡</button>
          <button class="work-task-action" onclick="event.stopPropagation(); copyWorkTaskToSlack('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="슬랙 복사" aria-label="슬랙 복사">📋</button>
          ${(!Array.isArray(task.subtasks) || task.subtasks.length === 0) ? `<button class="work-task-action" onclick="event.stopPropagation(); promptAddFirstWorkTaskSubtask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="하위 항목 추가" aria-label="하위 항목 추가">+ 하위 항목</button>` : ''}
          <button class="work-task-action" onclick="deleteWorkTask('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="항목 삭제" aria-label="항목 삭제" style="color: var(--accent-danger);">${svgIcon('trash', 14)}</button>
        </div>
      </div>
      ${renderTaskEntries(task, projectId, stageIdx, subcatIdx, taskIdx, taskExpandKey, isDetailExpanded)}
    </div>
  `;
}

// === P2 split-area entries renderer (PLAN-NAVIGATOR-SUBTASK-LOG-MERGE) ===
// Pure read renderer: uses window.mapLegacyToEntries (entries-model.js).
// All click handlers (toggleWorkTaskSubtaskComplete / toggleWorkLogChecked / etc.)
// stay on legacy signatures — we only re-place the rows into two boxes.

function renderTaskEntries(task, projectId, stageIdx, subcatIdx, taskIdx, taskUid, isDetailExpanded) {
  let entries;
  if (typeof mapLegacyToEntries === 'function') {
    entries = mapLegacyToEntries(task);
  } else {
    if (typeof console !== 'undefined') console.error('[navigator] entries-model.js 미로드 — 항목/기록 박스 빈 상태로 표시됨. hard refresh 후 재시도 필요.');
    entries = [];
  }
  const pending = entries.filter(e => e.type === 'subtask' && !e.completed);
  const recorded = entries.filter(e => e.type === 'note' || (e.type === 'subtask' && e.completed));

  return '<div class="task-entries-split' + (!isDetailExpanded ? ' work-task-detail-hidden' : '') + '" id="task-detail-' + taskUid + '">' +
    renderEntriesTodoBox(pending, projectId, stageIdx, subcatIdx, taskIdx) +
    renderEntriesRecordBox(recorded, task, projectId, stageIdx, subcatIdx, taskIdx, taskUid) +
  '</div>';
}

function renderEntriesTodoBox(pending, projectId, stageIdx, subcatIdx, taskIdx) {
  const pid = escapeAttr(projectId);
  const si = Number(stageIdx), sci = Number(subcatIdx), ti = Number(taskIdx);
  let html = '<div class="entries-box entries-box-todo">' +
    '<div class="entries-box-header">할 일<span class="entries-box-count">(' + pending.length + ' 남음)</span></div>';
  if (pending.length === 0) {
    html += '<div class="entries-box-empty">다 끝났어</div>';
  } else {
    html += '<div class="work-task-subtasks">';
    pending.forEach(entry => {
      const idMatch = String(entry.id || '').match(/^sub-(\d+)$/);
      const legacyIdx = idMatch ? Number(idMatch[1]) : -1;
      if (legacyIdx < 0) return;
      const isOptional = entry.isRequired === false;
      const text = entry.text || '';
      html += '<div class="work-task-subtask' + (isOptional ? ' optional' : '') + '">' +
        '<span class="work-task-subtask-check" onclick="event.stopPropagation(); toggleWorkTaskSubtaskComplete(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')">○</span>' +
        '<span class="work-task-subtask-text" onclick="event.stopPropagation(); toggleWorkTaskSubtaskComplete(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')">' + escapeHtml(text) + '</span>' +
        (isOptional ? '<span class="work-task-subtask-tag" title="선택 항목">선택</span>' : '') +
        '<div class="work-task-subtask-actions">' +
          '<button class="work-task-subtask-action" onclick="event.stopPropagation(); renameWorkTaskSubtask(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')" title="이름 수정" aria-label="이름 수정">' + svgIcon('edit', 12) + '</button>' +
          '<button class="work-task-subtask-action" onclick="event.stopPropagation(); removeWorkTaskSubtask(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')" title="삭제" aria-label="삭제" style="color: var(--accent-danger);">' + svgIcon('trash', 12) + '</button>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }
  html += '<div class="work-task-subtask-add" style="margin-top: 6px;">' +
    '<span class="work-task-subtask-add-icon">+</span>' +
    '<input type="text" id="work-subtask-add-' + escapeAttr(projectId) + '-' + si + '-' + sci + '-' + ti + '" class="work-task-subtask-add-input" placeholder="하위 항목 추가 (Enter)" onkeydown="handleWorkSubtaskAddKey(event, \'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ')" onclick="event.stopPropagation()" />' +
  '</div>';
  html += '</div>';
  return html;
}

function renderEntriesRecordBox(recorded, task, projectId, stageIdx, subcatIdx, taskIdx, taskUid) {
  const pid = escapeAttr(projectId);
  const si = Number(stageIdx), sci = Number(subcatIdx), ti = Number(taskIdx);

  const noteEntries = recorded.filter(e => e.type === 'note');
  const completedSubtaskEntries = recorded.filter(e => e.type === 'subtask' && e.completed);

  const compactedNotes = compactCompletionNotes(noteEntries);

  let html = '<div class="entries-box entries-box-record">' +
    '<div class="entries-box-header">기록<span class="entries-box-count">(' + recorded.length + ')</span></div>';

  if (recorded.length === 0) {
    html += '<div class="entries-box-empty">아직 기록 없음</div>';
  } else {
    html += '<div class="work-task-logs">';

    completedSubtaskEntries.forEach(entry => {
      const idMatch = String(entry.id || '').match(/^sub-(\d+)$/);
      const legacyIdx = idMatch ? Number(idMatch[1]) : -1;
      if (legacyIdx < 0) return;
      const text = entry.text || '';
      const dateRaw = entry.completedAt || entry.date || '';
      const datePill = dateRaw ? '<span class="entry-date-pill">' + escapeHtml(formatRecordDate(dateRaw)) + '</span>' : '';
      html += '<div class="work-task-log log-completed-subtask">' +
        '<span class="work-task-log-check entry-record-glyph-done" role="button" tabindex="0" aria-label="완료 항목 되돌리기" onclick="event.stopPropagation(); toggleWorkTaskSubtaskComplete(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();toggleWorkTaskSubtaskComplete(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')}">☑</span>' +
        '<div class="work-task-log-content">' + escapeHtml(text) + '</div>' +
        datePill +
      '</div>';
    });

    if (compactedNotes.completionLabel) {
      const cl = compactedNotes.completionLabel;
      const _compLogKey = taskUid + '-log-' + cl.idx;
      html += '<div class="work-task-log' + (cl.checked ? ' log-checked' : '') + '">' +
        '<span class="work-task-log-check" role="button" tabindex="0" aria-pressed="' + (cl.checked ? 'true' : 'false') + '" aria-label="기록 체크 토글" onclick="event.stopPropagation(); toggleWorkLogChecked(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + cl.idx + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();toggleWorkLogChecked(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + cl.idx + ')}">' + (cl.checked ? '✓' : '○') + '</span>' +
        '<span class="work-task-log-date" style="color: var(--accent-success);">' + renderWorkLogContent(cl.label, _compLogKey) + '</span>' +
        '<div class="work-task-log-actions">' +
          '<button class="work-task-log-action" onclick="editWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + cl.idx + ')" aria-label="기록 편집">' + svgIcon('edit', 12) + '</button>' +
          '<button class="work-task-log-action" onclick="deleteWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + cl.idx + ')" aria-label="기록 삭제">×</button>' +
        '</div></div>';
    }

    const MAX_VISIBLE_LOGS = 3;
    const otherNotes = compactedNotes.other;
    const hiddenNotes = otherNotes.length > MAX_VISIBLE_LOGS ? otherNotes.slice(0, otherNotes.length - MAX_VISIBLE_LOGS) : [];
    const visibleNotes = otherNotes.length > MAX_VISIBLE_LOGS ? otherNotes.slice(otherNotes.length - MAX_VISIBLE_LOGS) : otherNotes;

    if (hiddenNotes.length > 0) {
      const wasExpanded = appState.expandedWorkLogs && appState.expandedWorkLogs[taskUid];
      html += '<div class="work-task-logs-collapsed' + (wasExpanded ? ' expanded' : '') + '" id="logs-hidden-' + taskUid + '">';
      hiddenNotes.forEach(entry => {
        html += renderEntriesNoteRow(entry, pid, si, sci, ti, taskUid);
      });
      html += '</div>';
      html += '<div class="work-task-logs-toggle" onclick="toggleWorkLogs(\'' + taskUid + '\')" id="logs-toggle-' + taskUid + '">' + (wasExpanded ? '▼' : '▶') + ' 이전 기록 ' + hiddenNotes.length + '개</div>';
    }

    visibleNotes.forEach(entry => {
      html += renderEntriesNoteRow(entry, pid, si, sci, ti, taskUid);
    });

    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderEntriesNoteRow(entry, pid, si, sci, ti, taskUid) {
  const idMatch = String(entry.id || '').match(/^log-(\d+)$/);
  const legacyIdx = idMatch ? Number(idMatch[1]) : -1;
  if (legacyIdx < 0) return '';
  const isChecked = !!entry.checked;
  // M6: fallback 리터럴 제거 — 상수 직접 사용, 누락 시 console.error 로 surface.
  if (typeof AUTO_SUBTASK_ORIGIN_PREFIX !== 'string') console.error('[navigator] AUTO_SUBTASK_ORIGIN_PREFIX 누락 — entries-model.js 로드 순서 확인');
  const autoPrefix = AUTO_SUBTASK_ORIGIN_PREFIX;
  const isAutoNote = entry.origin && String(entry.origin).indexOf(autoPrefix) === 0;
  const autoClass = isAutoNote ? ' entry-auto-note' : '';
  const _logKey = taskUid + '-log-' + legacyIdx;
  const dateRaw = entry.date || '';
  return '<div class="work-task-log' + (isChecked ? ' log-checked' : '') + autoClass + '">' +
    '<span class="work-task-log-check" role="button" tabindex="0" aria-pressed="' + (isChecked ? 'true' : 'false') + '" aria-label="기록 체크 토글" onclick="event.stopPropagation(); toggleWorkLogChecked(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();toggleWorkLogChecked(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')}">' + (isChecked ? '✓' : '○') + '</span>' +
    '<span class="work-task-log-date">' + escapeHtml(dateRaw) + '</span><div class="work-task-log-content">' + renderWorkLogContent(entry.text || '', _logKey) + '</div>' +
    '<div class="work-task-log-actions">' +
      '<button class="work-task-log-action" onclick="editWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')" aria-label="기록 편집">' + svgIcon('edit', 12) + '</button>' +
      '<button class="work-task-log-action" onclick="copyLogContentToSlack(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')" title="슬랙 형식 복사" aria-label="슬랙 형식 복사">📋</button>' +
      '<button class="work-task-log-action" onclick="deleteWorkLog(\'' + pid + '\', ' + si + ', ' + sci + ', ' + ti + ', ' + legacyIdx + ')" aria-label="기록 삭제">×</button>' +
    '</div></div>';
}

function compactCompletionNotes(noteEntries) {
  const completion = [];
  const other = [];
  noteEntries.forEach(entry => {
    if (entry.text === '✓ 완료') completion.push(entry);
    else other.push(entry);
  });
  let completionLabel = null;
  if (completion.length > 0) {
    const last = completion[completion.length - 1];
    const idMatch = String(last.id || '').match(/^log-(\d+)$/);
    const idx = idMatch ? Number(idMatch[1]) : -1;
    if (idx >= 0) {
      const label = completion.length === 1
        ? '✓ 완료 (' + (last.date || '') + ')'
        : '✓ ' + completion.length + '회 완료 (최근: ' + (last.date || '') + ')';
      completionLabel = { idx: idx, label: label, checked: !!last.checked };
    }
  }
  return { completionLabel: completionLabel, other: other };
}

function formatRecordDate(value) {
  const text = String(value || '');
  if (!text) return '';
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[2] + '/' + isoMatch[3];
  const monthDayMatch = text.match(/^(\d{2})-(\d{2})/);
  if (monthDayMatch) return monthDayMatch[1] + '/' + monthDayMatch[2];
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  return text;
}
