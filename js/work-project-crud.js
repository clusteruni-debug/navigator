// ============================================
// 본업 프로젝트 - 프로젝트/단계 CRUD
// (work-actions.js에서 분리)
// ============================================

/**
 * 프로젝트 추가
 */
function addWorkProject(name, deadline = null) {
  // 기본 단계 (프로젝트별로 커스터마이징 가능)
  const defaultStages = appState.workProjectStages.map(stageName => ({
    name: stageName,
    completed: false,
    subcategories: [],
    startDate: null,
    endDate: null
  }));

  const newProject = {
    id: generateId(),
    name: name,
    currentStage: 0,
    deadline: deadline,
    meta: {},
    stages: defaultStages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  appState.workView = 'detail'; // 새 프로젝트 생성 시 상세보기로
  saveWorkProjects();
  renderStatic();
  showToast(`프로젝트 "${name}" 생성됨`, 'success');
}

/**
 * 프로젝트 단계 추가
 */
function addProjectStage(projectId, stageName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !stageName.trim()) return;

  project.stages.push({
    name: stageName.trim(),
    completed: false,
    subcategories: [],
    startDate: null,
    endDate: null
  });
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(`"${stageName}" 단계 추가됨`, 'success');
}
window.addProjectStage = addProjectStage;

/**
 * 프로젝트 단계 이름 수정
 */
function renameProjectStage(projectId, stageIdx, newName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx] || !newName.trim()) return;

  project.stages[stageIdx].name = newName.trim();
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.renameProjectStage = renameProjectStage;

/**
 * 프로젝트 단계 삭제
 */
function deleteProjectStage(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx]) return;

  const stage = project.stages[stageIdx];
  const stageName = stage.name;
  if (!confirm(`"${escapeHtml(stageName)}" 단계를 삭제하시겠습니까?\n하위 중분류/작업도 모두 삭제됩니다.`)) return;

  // expandedWorkLogs + expandedWorkTasks + expandedWorkTaskDetails cleanup
  if (appState.expandedWorkLogs) {
    (stage.subcategories || []).forEach(sub => {
      (sub.tasks || []).forEach(t => { if (t.id) delete appState.expandedWorkLogs[t.id]; });
    });
  }
  const stagePrefix = projectId + '-' + stageIdx + '-';
  if (appState.expandedWorkTasks) {
    Object.keys(appState.expandedWorkTasks).forEach(k => { if (k.startsWith(stagePrefix)) delete appState.expandedWorkTasks[k]; });
  }
  if (appState.expandedWorkTaskDetails) {
    Object.keys(appState.expandedWorkTaskDetails).forEach(k => { if (k.startsWith(stagePrefix)) delete appState.expandedWorkTaskDetails[k]; });
  }
  // collapsedStages / collapsedSubcategories cleanup (index shift 후 잘못된 상태 방지)
  if (appState.collapsedStages) {
    const prefix = projectId + '-';
    Object.keys(appState.collapsedStages).forEach(k => { if (k.startsWith(prefix)) delete appState.collapsedStages[k]; });
  }
  if (appState.collapsedSubcategories) {
    Object.keys(appState.collapsedSubcategories).forEach(k => { if (k.startsWith(stagePrefix)) delete appState.collapsedSubcategories[k]; });
  }
  project.stages.splice(stageIdx, 1);
  if (project.currentStage >= project.stages.length) {
    project.currentStage = Math.max(0, project.stages.length - 1);
  }
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(`"${stageName}" 단계 삭제됨`, 'success');
}
window.deleteProjectStage = deleteProjectStage;

/**
 * 단계 이름 가져오기 (기존 프로젝트 호환)
 */
function getStageName(project, stageIdx) {
  const stage = project.stages[stageIdx];
  if (!stage) return '';
  // 새 구조: name 필드가 있음
  if (stage.name) return stage.name;
  // 기존 구조: 전역 배열에서 가져옴
  return appState.workProjectStages[stageIdx] || `단계 ${stageIdx + 1}`;
}
window.getStageName = getStageName;

/**
 * 새 단계 추가 프롬프트
 */
function promptAddStage(projectId) {
  const name = prompt('새 단계 이름을 입력하세요:');
  if (name && name.trim()) {
    addProjectStage(projectId, name.trim());
  }
}
window.promptAddStage = promptAddStage;

/**
 * 단계 이름 변경 프롬프트
 */
function promptRenameStage(projectId, stageIdx, currentName) {
  const newName = prompt('단계 이름을 변경하세요:', currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    renameProjectStage(projectId, stageIdx, newName.trim());
  }
}
window.promptRenameStage = promptRenameStage;

/**
 * 프로젝트 단계 이동
 */
function moveWorkProjectStage(projectId, direction) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newStage = project.currentStage + direction;
  if (newStage >= 0 && newStage < project.stages.length) {
    project.currentStage = newStage;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast(`${getStageName(project, newStage)} 단계로 이동`, 'success');
  }
}
window.moveWorkProjectStage = moveWorkProjectStage;

/**
 * 프로젝트 삭제
 */
function deleteWorkProject(projectId) {
  if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;

  // expandedWorkLogs + expandedWorkTasks cleanup
  const proj = appState.workProjects.find(p => p.id === projectId);
  if (proj) {
    (proj.stages || []).forEach(s => {
      (s.subcategories || []).forEach(sub => {
        (sub.tasks || []).forEach(t => { if (t.id && appState.expandedWorkLogs) delete appState.expandedWorkLogs[t.id]; });
      });
    });
    if (appState.expandedWorkTasks) {
      const prefix = projectId + '-';
      Object.keys(appState.expandedWorkTasks).forEach(k => { if (k.startsWith(prefix)) delete appState.expandedWorkTasks[k]; });
    }
    if (appState.expandedWorkTaskDetails) {
      const prefix = projectId + '-';
      Object.keys(appState.expandedWorkTaskDetails).forEach(k => { if (k.startsWith(prefix)) delete appState.expandedWorkTaskDetails[k]; });
    }
    // collapsedStages / collapsedSubcategories cleanup
    if (appState.collapsedStages) {
      const prefix = projectId + '-';
      Object.keys(appState.collapsedStages).forEach(k => { if (k.startsWith(prefix)) delete appState.collapsedStages[k]; });
    }
    if (appState.collapsedSubcategories) {
      const prefix = projectId + '-';
      Object.keys(appState.collapsedSubcategories).forEach(k => { if (k.startsWith(prefix)) delete appState.collapsedSubcategories[k]; });
    }
  }
  // Soft-Delete: 삭제 기록 남기기 (동기화 시 부활 방지)
  appState.deletedIds.workProjects[projectId] = new Date().toISOString();
  appState.workProjects = appState.workProjects.filter(p => p.id !== projectId);
  if (appState.activeWorkProject === projectId) {
    appState.activeWorkProject = appState.workProjects.length > 0 ? appState.workProjects[0].id : null;
  }
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 삭제됨', 'success');
}
window.deleteWorkProject = deleteWorkProject;

/**
 * 노션/슬랙용 복사
 */
function copyWorkProjectToClipboard(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  let lines = [project.name, ''];

  project.stages.forEach((stage, idx) => {
    const hasContent = stage.subcategories && stage.subcategories.some(s => s.tasks.length > 0);
    if (!hasContent) return;

    const stageName = getStageName(project, idx);
    const subcats = stage.subcategories || [];
    const total = subcats.reduce((s, sub) => s + sub.tasks.length, 0);
    const done = subcats.reduce((s, sub) => s + sub.tasks.filter(t => t.status === 'completed').length, 0);
    const stageStatus = total > 0 && done === total ? ' [완료]' : '';
    lines.push('■ ' + stageName + stageStatus);

    subcats.forEach(subcat => {
      if (subcat.tasks.length === 0) return;
      const isGeneral = subcat.name === '일반';
      if (!isGeneral) lines.push(subcat.name + ':');

      subcat.tasks.forEach(task => {
        lines.push(_fmtTaskLine(task, isGeneral ? '' : '  '));
        // 상세 모드: 로그도 포함
        const recentLogs = task.logs ? task.logs.filter(l => l.content !== '✓ 완료').slice(-2) : [];
        recentLogs.forEach(log => {
          lines.push('    ' + log.date + ': ' + log.content);
        });
      });
    });
    lines.push('');
  });

  _copyText(lines.join('\n').trim(), '클립보드에 복사됨');
}
window.copyWorkProjectToClipboard = copyWorkProjectToClipboard;

/**
 * 완료된 작업의 completedAt 날짜 수정 (모달 방식)
 */
function editWorkTaskCompletedAt(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task || task.status !== 'completed') return;

  const currentVal = task.completedAt || getLocalDateTimeStr();
  const modalId = 'edit-work-completed-modal';

  const modalHtml = `
    <div class="work-modal-overlay" id="${modalId}" onclick="if(event.target===this) document.getElementById('${modalId}').remove()">
      <div class="work-modal" onclick="event.stopPropagation()">
        <div class="work-modal-header">
          <h3>완료일 수정</h3>
          <button class="work-modal-close" onclick="document.getElementById('${modalId}').remove()">✕</button>
        </div>
        <div class="work-modal-body">
          <div class="work-modal-field">
            <label class="work-modal-label">완료 시각</label>
            <input type="datetime-local" class="work-modal-input" id="edit-work-completed-input" value="${escapeAttr(currentVal)}">
          </div>
          <div style="margin-top:8px;font-size:14px;color:var(--text-muted)">
            작업: ${escapeHtml(task.title)}
          </div>
        </div>
        <div class="work-modal-footer">
          <button class="work-modal-btn secondary" onclick="document.getElementById('${modalId}').remove()">취소</button>
          <button class="work-modal-btn primary" onclick="_saveWorkTaskCompletedAt('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})">저장</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('edit-work-completed-input').focus();
}

function _saveWorkTaskCompletedAt(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;

  const input = document.getElementById('edit-work-completed-input');
  if (!input || !input.value) {
    showToast('날짜를 선택해주세요', 'error');
    return;
  }

  task.completedAt = input.value;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();

  const modal = document.getElementById('edit-work-completed-modal');
  if (modal) modal.remove();

  renderStatic();
  showToast('완료일이 수정되었습니다', 'success');
}
window._saveWorkTaskCompletedAt = _saveWorkTaskCompletedAt;
window.editWorkTaskCompletedAt = editWorkTaskCompletedAt;

/**
 * 스테이지 순서 이동 (up/down)
 */
function moveStage(projectId, stageIdx, direction) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newIdx = stageIdx + (direction === 'up' ? -1 : 1);
  if (newIdx < 0 || newIdx >= project.stages.length) return;

  // Swap stages
  const temp = project.stages[stageIdx];
  project.stages[stageIdx] = project.stages[newIdx];
  project.stages[newIdx] = temp;

  // Update currentStage if affected
  if (project.currentStage === stageIdx) {
    project.currentStage = newIdx;
  } else if (project.currentStage === newIdx) {
    project.currentStage = stageIdx;
  }

  // Update collapse state keys
  if (appState.collapsedStages) {
    const keyA = projectId + '-' + stageIdx;
    const keyB = projectId + '-' + newIdx;
    const tempCollapse = appState.collapsedStages[keyA];
    appState.collapsedStages[keyA] = appState.collapsedStages[keyB];
    appState.collapsedStages[keyB] = tempCollapse;
    // 명시적 설정 없는 키는 삭제 (기본값 사용)
    if (appState.collapsedStages[keyA] === undefined) delete appState.collapsedStages[keyA];
    if (appState.collapsedStages[keyB] === undefined) delete appState.collapsedStages[keyB];
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('단계 순서 변경됨', 'success');
}
window.moveStage = moveStage;
