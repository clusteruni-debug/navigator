// ============================================
// 본업 프로젝트 - 모달 관리
// ============================================

/**
 * 모달 표시
 */
function showWorkModal(type, projectId = null, stageIdx = null, subcatIdx = null, taskIdx = null, logIdx = null) {
  workModalState = { type, projectId, stageIdx, subcategoryIdx: subcatIdx, taskIdx, logIdx };

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  let titleText = '';
  let bodyHtml = '';

  const project = projectId ? appState.workProjects.find(p => p.id === projectId) : null;

  switch(type) {
    case 'project': {
      titleText = '📁 새 프로젝트';
      const templates = appState.workTemplates;
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">프로젝트 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: UT 10월차" autofocus>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">템플릿</label>
          <div class="work-status-group" style="flex-wrap: wrap;">
            <button type="button" class="work-status-option template-pill selected" data-template-id="">템플릿 없음</button>
            ${templates.map(t => {
              const stageCount = t.stageNames ? t.stageNames.length : t.stages.length;
              return '<button type="button" class="work-status-option template-pill" data-template-id="' + escapeAttr(t.id) + '">' +
                escapeHtml(t.name) +
                ' <span style="font-size:12px;color:var(--text-muted);">(' + stageCount + '단계)</span>' +
              '</button>';
            }).join('')}
          </div>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일 (선택)</label>
          <input type="date" class="work-modal-input" id="work-input-deadline">
        </div>
      `;
      break;
    }
    case 'subcategory':
      titleText = '📂 중분류 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">중분류 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: 사전 준비" autofocus>
        </div>
      `;
      break;
    case 'rename-subcategory': {
      const renameSubcat = project?.stages[stageIdx]?.subcategories?.[subcatIdx];
      titleText = '✏️ 중분류 이름 변경';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">중분류 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" value="${escapeAttr(renameSubcat?.name || '')}" autofocus>
        </div>
      `;
      break;
    }
    case 'task':
      titleText = '📝 항목 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">항목 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: 작업명 입력" autofocus>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">진행 상태</label>
          <div class="work-status-group">
            <button type="button" class="work-status-option selected" data-status="not-started">미시작</button>
            <button type="button" class="work-status-option" data-status="in-progress">진행중</button>
            <button type="button" class="work-status-option" data-status="completed">완료</button>
            <button type="button" class="work-status-option" data-status="blocked">보류</button>
          </div>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="work-input-canStartEarly" style="width: 18px; height: 18px; cursor: pointer;">
            <span>미리 시작 가능 (선제적 추천 대상)</span>
          </label>
        </div>
      `;
      break;
    case 'log':
      titleText = '📋 진행 기록 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">진행 내용</label>
          <textarea class="work-modal-textarea" id="work-input-content" placeholder="* 진행 내용을 입력하세요\n   * 세부 내용" autofocus></textarea>
        </div>
      `;
      break;
    case 'edit-task': {
      const editTask = project?.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
      titleText = '✏️ 항목 편집';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">항목 이름</label>
          <textarea class="work-modal-textarea" id="work-input-content" autofocus>${escapeHtml(editTask?.title || '')}</textarea>
        </div>
      `;
      break;
    }
    case 'edit-log': {
      const editTask2 = project?.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
      const editLog = editTask2?.logs?.[logIdx];
      const isCompletion = editLog?.content === '✓ 완료';
      titleText = '✏️ 기록 편집';
      if (isCompletion) {
        bodyHtml = `
          <div class="work-modal-field">
            <label class="work-modal-label">완료 날짜</label>
            <input type="date" class="work-modal-input" id="work-input-date" value="${escapeAttr(editLog?.date || '')}" autofocus>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="work-modal-field">
            <label class="work-modal-label">기록 내용</label>
            <textarea class="work-modal-textarea" id="work-input-content" autofocus>${escapeHtml(editLog?.content || '')}</textarea>
          </div>
          <div class="work-modal-field">
            <label class="work-modal-label">날짜</label>
            <input type="date" class="work-modal-input" id="work-input-date" value="${escapeAttr(editLog?.date || '')}">
          </div>
        `;
      }
      break;
    }
    case 'deadline':
      titleText = '📅 프로젝트 일정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${escapeAttr(project?.startDate || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${escapeAttr(project?.deadline || '')}">
        </div>
        ${project?.startDate && project?.deadline ? `
          <div style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
            📆 총 ${Math.ceil((new Date(project.deadline) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))}일 소요 예정
          </div>
        ` : ''}
      `;
      break;
    case 'stage-deadline': {
      titleText = '📅 단계 일정';
      const stageData = project?.stages[stageIdx] || {};
      const stageNameForModal = getStageName(project, stageIdx);
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${escapeAttr(stageData.startDate || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${escapeAttr(stageData.endDate || '')}">
        </div>
      `;
      break;
    }
    case 'subcat-deadline': {
      titleText = '📅 중분류 일정';
      const subcatData = project?.stages[stageIdx]?.subcategories[subcatIdx] || {};
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${escapeAttr(subcatData.startDate || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 종료일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${escapeAttr(subcatData.endDate || '')}">
        </div>
      `;
      break;
    }
    case 'participant':
      titleText = '👥 참여자 목표 설정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">목표 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-goal" placeholder="예: 10" min="1" value="${escapeAttr(project?.participantGoal || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">현재 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-count" placeholder="예: 0" min="0" value="${escapeAttr(project?.participantCount || 0)}">
        </div>
      `;
      break;
    case 'template-select': {
      titleText = '📋 템플릿 선택';
      const allTemplates = appState.workTemplates;
      const totalTaskCount = (t) => t.stages.reduce((sum, s) => sum + (s.subcategories || []).reduce((ss, sub) => ss + sub.tasks.length, 0), 0);
      if (allTemplates.length === 0) {
        bodyHtml = `
          <div class="work-modal-field" style="text-align: center; padding: 20px; color: var(--text-muted);">
            <div style="font-size: 16px; margin-bottom: 12px;">저장된 템플릿이 없습니다</div>
            <div style="font-size: 14px;">📋 템플릿 관리에서 새 템플릿을 추가하거나,<br>프로젝트 상세에서 "템플릿으로 저장"을 이용하세요.</div>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="work-modal-field">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${allTemplates.map(t => `
                <div style="display: flex; align-items: stretch; gap: 4px;">
                  <button type="button" class="work-status-option template-option" data-template-id="${escapeAttr(t.id)}" style="text-align: left; padding: 12px; flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(t.name)}</div>
                    <div style="font-size: 15px; color: var(--text-muted); margin-top: 4px;">
                      ${escapeHtml((t.stageNames || t.stages.map((_, i) => appState.workProjectStages[i])).filter(Boolean).join(' → '))}
                    </div>
                    <div style="font-size: 15px; color: var(--text-muted);">
                      ${totalTaskCount(t)}개 항목
                    </div>
                  </button>
                  <button type="button" class="work-project-action-btn" onclick="exportTemplate('${escapeAttr(t.id)}')" title="JSON 내보내기" style="padding: 8px; font-size: 16px;">📤</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      break;
    }
    case 'template-import': {
      titleText = '📥 템플릿 가져오기';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">JSON 템플릿 붙여넣기</label>
          <textarea class="work-modal-input" id="work-input-template-json" rows="10"
            placeholder='{"name": "템플릿 이름", "stageNames": ["단계1", ...], "stages": [{"subcategories": [{"name": "분류", "tasks": [{"title": "작업"}]}]}]}'
            style="font-family: monospace; font-size: 14px; resize: vertical; min-height: 150px;"></textarea>
          <div style="font-size: 15px; color: var(--text-muted); margin-top: 8px;">
            프로젝트에서 📤 내보내기한 JSON을 붙여넣으세요.<br>
            가져온 템플릿은 모든 기기에서 자동 동기화됩니다.
          </div>
        </div>
      `;
      break;
    }
    case 'template-manage': {
      titleText = '📋 템플릿 관리';
      const manageTpls = appState.workTemplates;
      const mTotalTaskCount = (t) => t.stages.reduce((sum, s) => sum + (s.subcategories || []).reduce((ss, sub) => ss + sub.tasks.length, 0), 0);
      bodyHtml = `
        <div style="max-height: 60vh; overflow-y: auto;">
          ${manageTpls.length === 0 ? '<div style="text-align: center; padding: 20px; color: var(--text-muted);">저장된 템플릿이 없습니다</div>' :
            manageTpls.map(t => {
              const stageList = (t.stageNames || []).join(' → ');
              const taskCount = mTotalTaskCount(t);
              return '<div style="background: var(--bg-tertiary); border-radius: 10px; padding: 14px; margin-bottom: 10px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">' +
                  '<div style="flex: 1; min-width: 0;">' +
                    '<div style="font-weight: 600; font-size: 15px;">' + escapeHtml(t.name) + (t.isDefault ? ' <span style="font-size:12px;color:var(--text-muted);">(기본)</span>' : '') + '</div>' +
                    '<div style="font-size: 13px; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' +
                      escapeHtml(stageList) + (taskCount > 0 ? ' | ' + taskCount + '개 항목' : '') +
                    '</div>' +
                  '</div>' +
                  '<div style="display: flex; gap: 4px; flex-shrink: 0;">' +
                    '<button type="button" class="work-project-action-btn" onclick="showTemplateEditor(\'' + escapeAttr(t.id) + '\')" title="편집" style="padding: 8px; font-size: 16px;">✏️</button>' +
                    '<button type="button" class="work-project-action-btn" onclick="exportTemplate(\'' + escapeAttr(t.id) + '\')" title="내보내기" style="padding: 8px; font-size: 16px;">📤</button>' +
                    '<button type="button" class="work-project-action-btn" onclick="deleteWorkTemplate(\'' + escapeAttr(t.id) + '\')" title="삭제" style="padding: 8px; font-size: 16px;">🗑</button>' +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('')}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button type="button" class="work-project-add-btn" onclick="createCustomTemplate()" style="flex: 1;">+ 새 템플릿</button>
          <button type="button" class="work-project-action-btn" onclick="closeWorkModal(); showWorkModal('template-import')" style="padding: 10px 16px; font-size: 14px;">📥 가져오기</button>
        </div>
      `;
      break;
    }
  }

  title.textContent = titleText;
  body.innerHTML = bodyHtml;
  modal.classList.add('show');

  // 상태 선택 버튼 이벤트
  if (type === 'task') {
    body.querySelectorAll('.work-status-option').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.work-status-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 프로젝트 생성 모달: 템플릿 pill 이벤트
  if (type === 'project') {
    body.querySelectorAll('.template-pill').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.template-pill').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 템플릿 선택 이벤트
  if (type === 'template-select') {
    body.querySelectorAll('.template-option').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.template-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 템플릿 관리 모달: 닫기 버튼만 표시
  if (type === 'template-manage') {
    const actions = modal.querySelector('.work-modal-actions');
    if (actions) {
      actions.innerHTML = '<button class="cancel" onclick="closeWorkModal()">닫기</button>';
    }
  }

  // 기록 추가 모달: "저장 + 복사" 버튼 추가
  if (type === 'log') {
    const actions = modal.querySelector('.work-modal-actions');
    if (actions) {
      actions.innerHTML = `
        <button class="cancel" onclick="closeWorkModal()">취소</button>
        <button class="confirm" onclick="confirmWorkModalAndCopy()" style="background: var(--accent-primary);">저장 + 복사</button>
        <button class="confirm" onclick="confirmWorkModal()">저장</button>
      `;
    }
  }

  // textarea에 Tab키 + auto-resize 초기화
  body.querySelectorAll('textarea').forEach(ta => initEnhancedTextarea(ta));

  // input[type=text]에 Enter 키로 확인
  body.querySelectorAll('input[type=text], input:not([type])').forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirmWorkModal(); }
    });
  });

  // 첫 입력 필드에 포커스
  setTimeout(() => {
    const input = body.querySelector('input, textarea');
    if (input) input.focus();
  }, 100);
}
window.showWorkModal = showWorkModal;

/**
 * 모달 닫기
 */
function closeWorkModal() {
  const modal = document.getElementById('work-input-modal');
  modal.classList.remove('show');

  // Always restore default modal actions (log modal / MM report replaces them)
  const actions = modal.querySelector('.work-modal-actions');
  if (actions) {
    actions.innerHTML = `
      <button class="cancel" onclick="closeWorkModal()">취소</button>
      <button class="confirm" onclick="confirmWorkModal()">확인</button>
    `;
  }

  workModalState = { type: null, projectId: null, stageIdx: null, subcategoryIdx: null, taskIdx: null, logIdx: null };
}
window.closeWorkModal = closeWorkModal;

/**
 * 모달 확인
 */
function confirmWorkModal() {
  const { type, projectId, stageIdx, subcategoryIdx, taskIdx, logIdx } = workModalState;

  switch(type) {
    case 'project': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      const deadline = document.getElementById('work-input-deadline')?.value || null;
      const modalBody = document.getElementById('work-modal-body');
      const selectedPill = modalBody ? modalBody.querySelector('.template-pill.selected') : null;
      const templateId = selectedPill?.dataset.templateId || null;
      addWorkProjectWithTemplate(name, deadline, templateId || null);
      break;
    }
    case 'subcategory': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      addSubcategory(projectId, stageIdx, name);
      break;
    }
    case 'rename-subcategory': {
      const newName = document.getElementById('work-input-name').value.trim();
      if (!newName) { showToast('이름을 입력하세요', 'error'); return; }
      const renProj = appState.workProjects.find(p => p.id === projectId);
      const renSubcat = renProj?.stages[stageIdx]?.subcategories?.[subcategoryIdx];
      if (renSubcat && renSubcat.name === newName) break;
      renameSubcategory(projectId, stageIdx, subcategoryIdx, newName);
      break;
    }
    case 'task': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      const status = document.querySelector('.work-status-option.selected')?.dataset.status || 'not-started';
      const canStartEarly = document.getElementById('work-input-canStartEarly')?.checked || false;
      addWorkTask(projectId, stageIdx, subcategoryIdx, name, status, canStartEarly);
      break;
    }
    case 'log': {
      const content = document.getElementById('work-input-content').value.trim();
      if (!content) { showToast('내용을 입력하세요', 'error'); return; }
      addWorkLog(projectId, stageIdx, subcategoryIdx, taskIdx, content);
      break;
    }
    case 'edit-task': {
      const newTitle = document.getElementById('work-input-content').value.trim();
      if (!newTitle) { showToast('이름을 입력하세요', 'error'); return; }
      // 변경 없으면 불필요한 저장/렌더 방지
      const editProj = appState.workProjects.find(p => p.id === projectId);
      const editT = editProj?.stages[stageIdx]?.subcategories?.[subcategoryIdx]?.tasks?.[taskIdx];
      if (editT && editT.title === newTitle) break;
      renameWorkTask(projectId, stageIdx, subcategoryIdx, taskIdx, newTitle);
      break;
    }
    case 'edit-log': {
      const proj = appState.workProjects.find(p => p.id === projectId);
      if (!proj) { showToast('프로젝트를 찾을 수 없습니다', 'error'); return; }
      const t = proj.stages[stageIdx]?.subcategories?.[subcategoryIdx]?.tasks?.[taskIdx];
      if (!t || !t.logs[logIdx]) { showToast('기록을 찾을 수 없습니다', 'error'); return; }
      const log = t.logs[logIdx];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (log.content === '✓ 완료') {
        const newDate = document.getElementById('work-input-date').value;
        if (!newDate || !dateRegex.test(newDate) || isNaN(new Date(newDate).getTime())) {
          showToast('올바른 날짜를 선택하세요', 'error'); return;
        }
        log.date = newDate;
        // 기존 시간 보존, 없으면 00:00 폴백
        const existingTime = t.completedAt ? t.completedAt.split('T')[1] || '00:00' : '00:00';
        t.completedAt = newDate + 'T' + existingTime;
      } else {
        const newContent = document.getElementById('work-input-content').value.trim();
        if (!newContent) { showToast('내용을 입력하세요', 'error'); return; }
        log.content = newContent;
        const newDate = document.getElementById('work-input-date').value;
        if (newDate && dateRegex.test(newDate) && !isNaN(new Date(newDate).getTime())) {
          log.date = newDate;
        }
      }
      proj.updatedAt = new Date().toISOString();
      saveWorkProjects();
      renderStatic();
      showToast('기록 수정됨', 'success');
      break;
    }
    case 'deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const deadline = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.startDate = startDate;
        project.deadline = deadline;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('일정 설정됨', 'success');
      }
      break;
    }
    case 'stage-deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const deadline = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.stages[stageIdx].startDate = startDate;
        project.stages[stageIdx].endDate = deadline;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('단계 일정 설정됨', 'success');
      }
      break;
    }
    case 'subcat-deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const endDate = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project && project.stages[stageIdx]?.subcategories[subcategoryIdx]) {
        project.stages[stageIdx].subcategories[subcategoryIdx].startDate = startDate;
        project.stages[stageIdx].subcategories[subcategoryIdx].endDate = endDate;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('중분류 일정 설정됨', 'success');
      }
      break;
    }
    case 'participant': {
      const goal = parseInt(document.getElementById('work-input-goal').value) || null;
      const count = parseInt(document.getElementById('work-input-count').value) || 0;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.participantGoal = goal;
        project.participantCount = count;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('참여자 목표 설정됨', 'success');
      }
      break;
    }
    case 'template-select': {
      const selected = document.querySelector('.template-option.selected');
      if (!selected) {
        showToast('템플릿을 선택하세요', 'error');
        return;
      }
      const templateId = selected.dataset.templateId;
      applyTemplate(templateId);
      break;
    }
    case 'template-import': {
      const jsonText = document.getElementById('work-input-template-json').value.trim();
      if (!jsonText) { showToast('JSON을 입력하세요', 'error'); return; }

      try {
        const parsed = JSON.parse(jsonText);

        // 검증: 필수 필드
        if (!parsed.name || typeof parsed.name !== 'string') {
          showToast('name 필드가 필요합니다', 'error'); return;
        }
        if (!Array.isArray(parsed.stages) || parsed.stages.length === 0) {
          showToast('stages 배열이 필요합니다', 'error'); return;
        }

        // 검증: stages 구조
        for (let i = 0; i < parsed.stages.length; i++) {
          const stage = parsed.stages[i];
          if (!stage.subcategories || !Array.isArray(stage.subcategories)) {
            showToast(`stages[${i}]에 subcategories 배열이 필요합니다`, 'error'); return;
          }
          for (const sub of stage.subcategories) {
            if (!sub.name || !Array.isArray(sub.tasks)) {
              showToast('subcategories에 name과 tasks가 필요합니다', 'error'); return;
            }
            for (const task of sub.tasks) {
              if (!task.title) {
                showToast('tasks에 title이 필요합니다', 'error'); return;
              }
            }
          }
        }

        // 템플릿 생성
        const template = {
          id: generateId(),
          name: parsed.name,
          stageNames: parsed.stageNames || null,
          stages: parsed.stages.map(stage => ({
            subcategories: stage.subcategories.map(sub => ({
              name: sub.name,
              tasks: sub.tasks.map(t => ({
                title: t.title,
                ...(t.owner && { owner: t.owner }),
                ...(t.estimatedTime && { estimatedTime: t.estimatedTime }),
                ...(t.canStartEarly && { canStartEarly: true })
              }))
            }))
          })),
          participantGoal: parsed.participantGoal || null,
          createdAt: new Date().toISOString()
        };

        appState.workTemplates.push(template);
        saveWorkTemplates();
        showToast(`"${escapeHtml(template.name)}" 템플릿 가져오기 완료`, 'success');
        renderStatic();
      } catch (e) {
        showToast('JSON 파싱 오류: ' + e.message, 'error'); return;
      }
      break;
    }
    case 'mm-report': {
      // MM report modal has its own close button; no confirm action needed
      break;
    }
    case 'template-edit': {
      confirmTemplateEdit(projectId);
      return; // confirmTemplateEdit handles its own close
    }
  }

  closeWorkModal();
}
window.confirmWorkModal = confirmWorkModal;

/**
 * 기록 저장 + 해당 작업을 슬랙 포맷으로 복사
 */
function confirmWorkModalAndCopy() {
  const { type, projectId, stageIdx, subcategoryIdx, taskIdx } = workModalState;
  if (type !== 'log') { confirmWorkModal(); return; }
  if (taskIdx === null || taskIdx === undefined) { confirmWorkModal(); return; }

  const content = document.getElementById('work-input-content').value.trim();
  if (!content) { showToast('내용을 입력하세요', 'error'); return; }

  // 저장 (addWorkLog와 동일 로직, toast 없이)
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) { showToast('프로젝트를 찾을 수 없습니다', 'error'); return; }
  const task = project.stages[stageIdx]?.subcategories?.[subcategoryIdx]?.tasks?.[taskIdx];
  if (!task) { showToast('작업을 찾을 수 없습니다', 'error'); return; }

  if (!task.logs) task.logs = [];
  task.logs.push({ date: getLocalDateStr(), content: content });
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();

  // 슬랙 포맷으로 복사 (toast: "기록 저장 + 복사됨")
  let copyText = _fmtTaskLine(task, '');
  const logs = task.logs.filter(l => l.content !== '✓ 완료').slice(-3);
  if (logs.length > 0) {
    logs.forEach(log => { copyText += '\n  ' + log.date + ': ' + log.content; });
  }
  _copyText(copyText, '기록 저장 + 복사됨');

  closeWorkModal();
}
window.confirmWorkModalAndCopy = confirmWorkModalAndCopy;

/**
 * 템플릿 적용
 */
function applyTemplate(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  const projectName = prompt('프로젝트 이름을 입력하세요:', template.name.replace(' 템플릿', ''));
  if (!projectName || !projectName.trim()) return;

  // 템플릿에 stageNames가 있으면 그것 사용, 없으면 전역 기본값 사용
  const stageSource = template.stageNames || appState.workProjectStages;
  const stageCount = Math.max(stageSource.length, template.stages.length);

  const newProject = {
    id: generateId(),
    name: projectName,
    currentStage: 0,
    meta: {},
    stages: Array.from({ length: stageCount }, (_, idx) => ({
      name: stageSource[idx] || ('단계 ' + (idx + 1)),
      completed: false,
      startDate: null,
      endDate: null,
      subcategories: template.stages[idx]?.subcategories?.map(sub => ({
        id: generateId(),
        name: sub.name,
        startDate: null,
        endDate: null,
        tasks: sub.tasks.map(t => ({
          id: generateId(),
          title: t.title,
          status: 'not-started',
          owner: t.owner || 'me',
          estimatedTime: t.estimatedTime || 30,
          actualTime: null,
          completedAt: null,
          canStartEarly: t.canStartEarly || false,
          logs: []
        }))
      })) || []
    })),
    participantGoal: template.participantGoal,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  saveWorkProjects();
  renderStatic();
  showToast(`"${projectName}" 생성됨`, 'success');
}

/**
 * 템플릿 JSON 내보내기 (클립보드 복사)
 */
function exportTemplate(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  // 내보내기용 JSON (id, createdAt 등 내부 필드 제외)
  const exportData = {
    name: template.name,
    stageNames: template.stageNames || null,
    stages: template.stages.map(stage => ({
      subcategories: (stage.subcategories || []).map(sub => ({
        name: sub.name,
        tasks: sub.tasks.map(t => {
          const task = { title: t.title };
          if (t.owner && t.owner !== 'me') task.owner = t.owner;
          if (t.estimatedTime && t.estimatedTime !== 30) task.estimatedTime = t.estimatedTime;
          if (t.canStartEarly) task.canStartEarly = true;
          return task;
        })
      }))
    })),
    participantGoal: template.participantGoal || null
  };

  const json = JSON.stringify(exportData, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast(`"${escapeHtml(template.name)}" 템플릿 JSON 복사됨`, 'success');
  }).catch(() => {
    // 클립보드 실패 시 프롬프트로 표시
    prompt('아래 JSON을 복사하세요:', json);
  });
}
window.exportTemplate = exportTemplate;

// ============================================
// MM Report Modal
// ============================================

/**
 * Show MM (Monthly Report) modal with month selector and generated report.
 */
function showMMReportModal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  workModalState = { type: 'mm-report', projectId: null, stageIdx: null, subcategoryIdx: null, taskIdx: null };

  title.textContent = '📊 MM 리포트';

  body.innerHTML = `
    <div class="work-modal-field">
      <label class="work-modal-label">리포트 기간</label>
      <input type="month" class="work-modal-input" id="mm-report-month" value="${year}-${String(month).padStart(2, '0')}">
    </div>
    <div id="mm-report-output" style="margin-top: 12px;">
      <div style="text-align: center; color: var(--text-muted); padding: 20px;">
        리포트를 생성하려면 아래 "생성" 버튼을 누르세요
      </div>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button type="button" class="work-project-action-btn" onclick="renderMMReport()" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: var(--accent-blue); color: white; border-radius: 8px; border: none; cursor: pointer;">📊 생성</button>
      <button type="button" class="work-project-action-btn" id="mm-report-copy-btn" onclick="copyMMReport()" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 8px; border: none; cursor: pointer; display: none;">📋 클립보드 복사</button>
    </div>
  `;

  // Override the confirm button to act as close
  const actions = modal.querySelector('.work-modal-actions');
  if (actions) {
    actions.innerHTML = `
      <button class="cancel" onclick="closeWorkModal()">닫기</button>
    `;
  }

  modal.classList.add('show');

  // Auto-generate for current month
  setTimeout(() => renderMMReport(), 100);
}
window.showMMReportModal = showMMReportModal;

/**
 * Render the MM report text into the modal output area.
 */
function renderMMReport() {
  const monthInput = document.getElementById('mm-report-month');
  if (!monthInput) return;

  const [yearStr, monthStr] = monthInput.value.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const report = generateMMReport(year, month);
  const output = document.getElementById('mm-report-output');
  const copyBtn = document.getElementById('mm-report-copy-btn');

  if (!report) {
    output.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 20px; background: var(--bg-secondary); border-radius: 8px;">
        📭 ${year}년 ${month}월 기록이 없습니다
      </div>
    `;
    if (copyBtn) copyBtn.style.display = 'none';
    return;
  }

  // Generate proportion table
  const proportionTable = generateMMProportionTable(year, month);

  let proportionHtml = '';
  if (proportionTable) {
    proportionHtml = `
      <div style="margin-top: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">📊 비율 테이블</span>
          <button type="button" onclick="copyMMProportionTable()" style="padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 13px; cursor: pointer;">📋 비율 복사</button>
        </div>
        <pre style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-family: 'Pretendard', -apple-system, sans-serif;" id="mm-proportion-text">${escapeHtml(proportionTable)}</pre>
      </div>
    `;
  }

  output.innerHTML = `
    <pre style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; font-family: 'Pretendard', -apple-system, sans-serif;" id="mm-report-text">${escapeHtml(report)}</pre>
    ${proportionHtml}
  `;
  if (copyBtn) copyBtn.style.display = 'block';
}
window.renderMMReport = renderMMReport;

/**
 * Copy the generated MM report to clipboard.
 */
function copyMMReport() {
  const reportEl = document.getElementById('mm-report-text');
  if (!reportEl) return;

  const text = reportEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('MM 리포트 클립보드에 복사됨', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('MM 리포트 클립보드에 복사됨', 'success');
  });
}
window.copyMMReport = copyMMReport;

/**
 * Copy MM proportion table to clipboard (Notion-pasteable format).
 */
function copyMMProportionTable() {
  const el = document.getElementById('mm-proportion-text');
  if (!el) return;

  const text = el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('비율 테이블 클립보드에 복사됨', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('비율 테이블 클립보드에 복사됨', 'success');
  });
}
window.copyMMProportionTable = copyMMProportionTable;

// ============================================
// 템플릿 편집기
// ============================================

/**
 * 템플릿 편집 모달 표시
 */
function showTemplateEditor(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  closeWorkModal();

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  workModalState = { type: 'template-edit', projectId: templateId, stageIdx: null, subcategoryIdx: null, taskIdx: null };

  title.textContent = '✏️ 템플릿 편집';

  const stageNames = template.stageNames || [];
  const tid = escapeAttr(templateId);

  let stageListHtml = '';
  stageNames.forEach((name, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === stageNames.length - 1;
    stageListHtml +=
      '<div style="display: flex; align-items: center; gap: 6px; background: var(--bg-tertiary); padding: 10px 12px; border-radius: 8px;">' +
        '<span style="flex: 1; font-size: 14px;">' + (idx + 1) + '. ' + escapeHtml(name) + '</span>' +
        '<button type="button" class="work-project-action-btn" onclick="moveTemplateStage(\'' + tid + '\', ' + idx + ', \'up\'); showTemplateEditor(\'' + tid + '\')" ' + (isFirst ? 'disabled style="opacity:0.3;padding:6px;"' : 'style="padding:6px;"') + ' title="위로">▲</button>' +
        '<button type="button" class="work-project-action-btn" onclick="moveTemplateStage(\'' + tid + '\', ' + idx + ', \'down\'); showTemplateEditor(\'' + tid + '\')" ' + (isLast ? 'disabled style="opacity:0.3;padding:6px;"' : 'style="padding:6px;"') + ' title="아래로">▼</button>' +
        '<button type="button" class="work-project-action-btn" onclick="renameTemplateStage(\'' + tid + '\', ' + idx + '); showTemplateEditor(\'' + tid + '\')" style="padding:6px;" title="이름 수정">✏️</button>' +
        '<button type="button" class="work-project-action-btn" onclick="deleteTemplateStage(\'' + tid + '\', ' + idx + '); showTemplateEditor(\'' + tid + '\')" style="padding:6px;" title="삭제">✕</button>' +
      '</div>';
  });

  body.innerHTML =
    '<div class="work-modal-field">' +
      '<label class="work-modal-label">템플릿 이름</label>' +
      '<input type="text" class="work-modal-input" id="template-edit-name" value="' + escapeAttr(template.name) + '">' +
    '</div>' +
    '<div class="work-modal-field">' +
      '<label class="work-modal-label">단계 목록</label>' +
      '<div style="display: flex; flex-direction: column; gap: 6px;">' +
        (stageNames.length === 0 ? '<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 14px;">단계가 없습니다. 아래에서 추가하세요.</div>' : stageListHtml) +
      '</div>' +
      '<button type="button" class="work-project-action-btn" onclick="addTemplateStage(\'' + tid + '\'); showTemplateEditor(\'' + tid + '\')" style="margin-top: 8px; width: 100%; text-align: center; padding: 10px; font-size: 14px;">+ 단계 추가</button>' +
    '</div>';

  const actions = modal.querySelector('.work-modal-actions');
  if (actions) {
    actions.innerHTML =
      '<button class="cancel" onclick="closeWorkModal(); showWorkModal(\'template-manage\')">← 돌아가기</button>' +
      '<button class="confirm" onclick="confirmTemplateEdit(\'' + tid + '\')">저장</button>';
  }

  modal.classList.add('show');

  setTimeout(() => {
    const input = document.getElementById('template-edit-name');
    if (input) input.focus();
  }, 100);
}
window.showTemplateEditor = showTemplateEditor;

/**
 * 템플릿 편집 저장
 */
function confirmTemplateEdit(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  const nameInput = document.getElementById('template-edit-name');
  if (nameInput && nameInput.value.trim()) {
    template.name = nameInput.value.trim();
  }
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
  closeWorkModal();
  showWorkModal('template-manage');
  showToast('템플릿 저장됨', 'success');
}
window.confirmTemplateEdit = confirmTemplateEdit;
