// ============================================
// 본업 프로젝트 - 템플릿 CRUD
// (work-data.js에서 분리)
// ============================================

/**
 * 템플릿 삭제 (soft-delete)
 */
function deleteWorkTemplate(templateId) {
  if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
  if (!appState.deletedIds.workTemplates) appState.deletedIds.workTemplates = {};
  appState.deletedIds.workTemplates[templateId] = new Date().toISOString();
  appState.workTemplates = appState.workTemplates.filter(t => t.id !== templateId);
  saveWorkTemplates();
  closeWorkModal();
  showWorkModal('template-manage');
  showToast('템플릿 삭제됨', 'success');
}
window.deleteWorkTemplate = deleteWorkTemplate;

/**
 * 템플릿 단계 추가
 */
function addTemplateStage(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  const name = prompt('새 단계 이름:');
  if (!name || !name.trim()) return;
  if (!template.stageNames) template.stageNames = [];
  if (!template.stages) template.stages = [];
  template.stageNames.push(name.trim());
  template.stages.push({ subcategories: [] });
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.addTemplateStage = addTemplateStage;

/**
 * 템플릿 단계 삭제
 */
function deleteTemplateStage(templateId, stageIdx) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  if (!confirm('이 단계를 삭제하시겠습니까?')) return;
  if (!template.stageNames) template.stageNames = [];
  template.stageNames.splice(stageIdx, 1);
  template.stages.splice(stageIdx, 1);
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.deleteTemplateStage = deleteTemplateStage;

/**
 * 템플릿 단계 이름 수정
 */
function renameTemplateStage(templateId, stageIdx) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  if (!template.stageNames) template.stageNames = [];
  const newName = prompt('단계 이름:', template.stageNames[stageIdx] || '');
  if (!newName || !newName.trim()) return;
  template.stageNames[stageIdx] = newName.trim();
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.renameTemplateStage = renameTemplateStage;

/**
 * 템플릿 단계 순서 이동
 */
function moveTemplateStage(templateId, stageIdx, direction) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  const newIdx = stageIdx + (direction === 'up' ? -1 : 1);
  if (newIdx < 0 || newIdx >= template.stages.length) return;
  // stageNames 스왑
  if (template.stageNames) {
    const tmp = template.stageNames[stageIdx];
    template.stageNames[stageIdx] = template.stageNames[newIdx];
    template.stageNames[newIdx] = tmp;
  }
  // stages 스왑
  const tmpStage = template.stages[stageIdx];
  template.stages[stageIdx] = template.stages[newIdx];
  template.stages[newIdx] = tmpStage;
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.moveTemplateStage = moveTemplateStage;

/**
 * 커스텀 템플릿 생성
 */
function createCustomTemplate() {
  const name = prompt('새 템플릿 이름:');
  if (!name || !name.trim()) return;
  const template = {
    id: generateId(),
    name: name.trim(),
    stageNames: [],
    stages: [],
    participantGoal: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  appState.workTemplates.push(template);
  saveWorkTemplates();
  showToast('템플릿 생성됨', 'success');
  showTemplateEditor(template.id);
}
window.createCustomTemplate = createCustomTemplate;

/**
 * 템플릿 선택 결과로 프로젝트 생성 (통합 흐름)
 */
function addWorkProjectWithTemplate(name, deadline, templateId) {
  let stages;
  let participantGoal = null;

  if (templateId) {
    const template = appState.workTemplates.find(t => t.id === templateId);
    if (!template) {
      showToast('템플릿을 찾을 수 없습니다', 'error');
      return;
    }
    const stageSource = template.stageNames || [];
    const stageCount = Math.max(stageSource.length, template.stages.length);
    stages = Array.from({ length: stageCount }, (_, idx) => ({
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
    }));
    participantGoal = template.participantGoal || null;
  } else {
    stages = appState.workProjectStages.map(stageName => ({
      name: stageName,
      completed: false,
      subcategories: [],
      startDate: null,
      endDate: null
    }));
  }

  const newProject = {
    id: generateId(),
    name: name,
    currentStage: 0,
    deadline: deadline,
    meta: {},
    stages: stages,
    participantGoal: participantGoal,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  appState.workView = 'detail';
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 "' + escapeHtml(name) + '" 생성됨', 'success');
}
window.addWorkProjectWithTemplate = addWorkProjectWithTemplate;

// ============================================
// 템플릿 적용/내보내기/편집 (work-modal.js에서 분리)
// ============================================

/**
 * 템플릿 적용
 */
function applyTemplate(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  const projectName = prompt('프로젝트 이름을 입력하세요:', template.name.replace(' 템플릿', ''));
  if (!projectName || !projectName.trim()) return;

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
    prompt('아래 JSON을 복사하세요:', json);
  });
}
window.exportTemplate = exportTemplate;

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
