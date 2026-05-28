// ============================================
// 본업 프로젝트 - 모달 확인/닫기
// (showWorkModal은 work-modal-show.js로 분리)
// ============================================

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

// ============================================
// 아래 함수들은 분리됨:
// - applyTemplate, exportTemplate → work-template-crud.js
// - showMMReportModal, renderMMReport, copyMMReport, copyMMProportionTable → work-modal-reports.js
// - showTemplateEditor, confirmTemplateEdit → work-template-crud.js
// ============================================
