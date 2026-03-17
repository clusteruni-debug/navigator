// ============================================
// 본업 프로젝트 - CRUD 액션
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

  const stageName = project.stages[stageIdx].name;
  if (!confirm(`"${escapeHtml(stageName)}" 단계를 삭제하시겠습니까?\n하위 중분류/작업도 모두 삭제됩니다.`)) return;

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
 * 중분류 이름 변경 프롬프트
 */
function promptRenameSubcategory(projectId, stageIdx, subcatIdx, currentName) {
  const newName = prompt('중분류 이름을 변경하세요:', currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    renameSubcategory(projectId, stageIdx, subcatIdx, newName.trim());
  }
}
window.promptRenameSubcategory = promptRenameSubcategory;

/**
 * 중분류 이름 변경
 */
function renameSubcategory(projectId, stageIdx, subcatIdx, newName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const subcat = project.stages[stageIdx]?.subcategories?.[subcatIdx];
  if (subcat) {
    subcat.name = newName;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast('중분류 이름이 변경되었습니다', 'success');
  }
}
window.renameSubcategory = renameSubcategory;

/**
 * 소분류(항목) 이름 변경 프롬프트
 */
function promptRenameWorkTask(projectId, stageIdx, subcatIdx, taskIdx, currentName) {
  const newName = prompt('항목 이름을 변경하세요:', currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    renameWorkTask(projectId, stageIdx, subcatIdx, taskIdx, newName.trim());
  }
}
window.promptRenameWorkTask = promptRenameWorkTask;

/**
 * 소분류(항목) 이름 변경
 */
function renameWorkTask(projectId, stageIdx, subcatIdx, taskIdx, newName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (task) {
    task.title = newName;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast('항목 이름이 변경되었습니다', 'success');
  }
}
window.renameWorkTask = renameWorkTask;

/**
 * 소분류(항목) 마감일 설정
 * - prompt 대신 date input 사용 (모바일 날짜 선택기 활용)
 */
function promptTaskDeadline(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;

  // date input을 동적으로 생성하여 날짜 선택기 호출
  const input = document.createElement('input');
  input.type = 'date';
  input.value = task.deadline || '';
  input.style.position = 'fixed';
  input.style.opacity = '0';
  input.style.top = '50%';
  input.style.left = '50%';
  document.body.appendChild(input);

  // 고아 DOM 방지: 5초 후 자동 정리
  const cleanupTimer = setTimeout(function() {
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  }, 5000);

  input.addEventListener('change', function() {
    clearTimeout(cleanupTimer);
    task.deadline = this.value || null;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    if (this.value) {
      const d = new Date(this.value);
      showToast('마감일 설정: ' + (d.getMonth() + 1) + '/' + d.getDate(), 'success');
    } else {
      showToast('마감일 삭제됨', 'success');
    }
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  });

  input.addEventListener('blur', function() {
    clearTimeout(cleanupTimer);
    // 변경 없이 닫힌 경우 정리
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  });

  input.focus();
  input.showPicker?.();
}
window.promptTaskDeadline = promptTaskDeadline;

/**
 * 중분류 추가
 */
function addSubcategory(projectId, stageIdx, name) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  if (!project.stages[stageIdx].subcategories) {
    project.stages[stageIdx].subcategories = [];
  }

  project.stages[stageIdx].subcategories.push({
    id: generateId(),
    name: name,
    tasks: []
  });

  // 접힌 스테이지 자동 펼치기
  if (appState.collapsedStages && appState.collapsedStages[projectId + '-' + stageIdx]) {
    appState.collapsedStages[projectId + '-' + stageIdx] = false;
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(`"${name}" 추가됨`, 'success');
}

/**
 * 중분류 삭제
 */
function deleteSubcategory(projectId, stageIdx, subcatIdx) {
  if (!confirm('이 중분류와 하위 항목을 모두 삭제하시겠습니까?')) return;

  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories.splice(subcatIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('삭제됨', 'success');
}
window.deleteSubcategory = deleteSubcategory;

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
 * 작업 항목 추가
 */
function addWorkTask(projectId, stageIdx, subcatIdx, title, status, canStartEarly = false) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories[subcatIdx].tasks.push({
    id: generateId(),
    title: title,
    status: status,
    owner: 'me',
    estimatedTime: 30,
    actualTime: null,
    completedAt: status === 'completed' ? getLocalDateTimeStr() : null,
    canStartEarly: canStartEarly,
    logs: []
  });

  // 접힌 스테이지 자동 펼치기
  if (appState.collapsedStages && appState.collapsedStages[projectId + '-' + stageIdx]) {
    appState.collapsedStages[projectId + '-' + stageIdx] = false;
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('항목 추가됨', 'success');
}

/**
 * 작업 상태 순환
 */
function cycleWorkTaskStatus(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx];
  const statuses = ['not-started', 'in-progress', 'completed', 'blocked'];
  const currentIdx = statuses.indexOf(task.status);
  task.status = statuses[(currentIdx + 1) % statuses.length];

  // 완료로 변경 시 completedAt + 자동 로그
  if (task.status === 'completed') {
    task.completedAt = getLocalDateTimeStr();
    const today = getLocalDateStr();
    const alreadyLogged = task.logs.some(l => l.date === today && l.content === '✓ 완료');
    if (!alreadyLogged) {
      task.logs.push({ date: today, content: '✓ 완료' });
    }
  } else {
    // 완료에서 벗어나면 completedAt 제거
    if (task.completedAt) task.completedAt = null;
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.cycleWorkTaskStatus = cycleWorkTaskStatus;

/**
 * 소분류 완료 체크박스 토글 (완료↔미시작) — Task 2-5: 300ms 디바운스 적용
 */
const _completionDebounceMap = new Map();

function toggleWorkTaskComplete(projectId, stageIdx, subcatIdx, taskIdx) {
  const key = `${projectId}-${stageIdx}-${subcatIdx}-${taskIdx}`;
  if (_completionDebounceMap.has(key)) {
    clearTimeout(_completionDebounceMap.get(key));
  }
  _completionDebounceMap.set(key, setTimeout(() => {
    _completionDebounceMap.delete(key);
    _doToggleWorkTaskComplete(projectId, stageIdx, subcatIdx, taskIdx);
  }, 300));
}

function _doToggleWorkTaskComplete(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx];
  const wasCompleted = task.status === 'completed';
  task.status = wasCompleted ? 'not-started' : 'completed';

  // 완료/해제 시 completedAt 자동 기록
  if (!wasCompleted) {
    task.completedAt = getLocalDateTimeStr();
    const today = getLocalDateStr();
    const alreadyLogged = task.logs.some(l => l.date === today && l.content === '✓ 완료');
    if (!alreadyLogged) {
      task.logs.push({ date: today, content: '✓ 완료' });
    }
  } else {
    task.completedAt = null;
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(wasCompleted ? '미시작으로 변경' : '완료!', 'success');
}
window.toggleWorkTaskComplete = toggleWorkTaskComplete;

/**
 * 중분류 완료 체크박스 토글 (하위 전체 완료↔미시작)
 */
function toggleSubcategoryComplete(projectId, stageIdx, subcatIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const subcat = project.stages[stageIdx].subcategories[subcatIdx];
  if (!subcat) return;

  // 빈 중분류도 완료 토글 가능
  if (subcat.tasks.length === 0) {
    // 빈 중분류 — 완료 상태 직접 토글
    subcat._completed = !subcat._completed;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast(subcat._completed ? '중분류 완료!' : '중분류 미완료로 변경', 'success');
    return;
  }

  // 모두 완료이면 → 전부 미시작, 아니면 → 전부 완료
  const allCompleted = subcat.tasks.every(t => t.status === 'completed');
  const today = getLocalDateStr();

  subcat.tasks.forEach(task => {
    if (allCompleted) {
      task.status = 'not-started';
      task.completedAt = null;
    } else {
      if (task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = getLocalDateTimeStr();
        task.logs.push({ date: today, content: '✓ 완료' });
      }
    }
  });

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(allCompleted ? '중분류 전체 미시작으로 변경' : '중분류 전체 완료!', 'success');
}
window.toggleSubcategoryComplete = toggleSubcategoryComplete;

/**
 * 작업 삭제
 */
function deleteWorkTask(projectId, stageIdx, subcatIdx, taskIdx) {
  if (!confirm('이 항목을 삭제하시겠습니까?')) return;

  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories[subcatIdx].tasks.splice(taskIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.deleteWorkTask = deleteWorkTask;

/**
 * 진행 로그 추가
 */
function addWorkLog(projectId, stageIdx, subcatIdx, taskIdx, content) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx];
  const today = getLocalDateStr();

  task.logs.push({
    date: today,
    content: content
  });

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('기록 추가됨', 'success');
}

/**
 * 로그 삭제
 */
function deleteWorkLog(projectId, stageIdx, subcatIdx, taskIdx, logIdx) {
  if (!confirm('이 기록을 삭제하시겠습니까?')) return;
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx].logs.splice(logIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.deleteWorkLog = deleteWorkLog;

/**
 * Task 2-6: 로그 내용 편집
 */
function editWorkLog(projectId, stageIdx, subcatIdx, taskIdx, logIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task || !task.logs[logIdx]) return;

  const log = task.logs[logIdx];
  const newContent = prompt('기록 내용 편집:', log.content);
  if (newContent === null || newContent.trim() === '') return;

  log.content = newContent.trim();
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('기록 수정됨', 'success');
}
window.editWorkLog = editWorkLog;

/**
 * canStartEarly 토글
 */
function toggleCanStartEarly(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;

  task.canStartEarly = !task.canStartEarly;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(task.canStartEarly ? '선제적 시작 가능으로 설정됨' : '선제적 시작 해제됨', 'success');
}
window.toggleCanStartEarly = toggleCanStartEarly;

/**
 * 노션/슬랙용 복사
 */
function copyWorkProjectToClipboard(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  let text = `📋 ${project.name}\n`;
  text += `현재 단계: ${getStageName(project, project.currentStage)}\n`;
  text += `─────────────────\n\n`;

  project.stages.forEach((stage, idx) => {
    const hasContent = stage.subcategories && stage.subcategories.some(s => s.tasks.length > 0);
    if (!hasContent) return;

    const stageName = getStageName(project, idx);
    const isCurrent = idx === project.currentStage;
    text += `${isCurrent ? '▶ ' : ''}${idx + 1}. ${stageName}\n`;

    stage.subcategories.forEach(subcat => {
      if (subcat.tasks.length === 0) return;
      text += `\n  📁 ${subcat.name}\n`;

      subcat.tasks.forEach(task => {
        const statusIcon = task.status === 'completed' ? '✓' : task.status === 'in-progress' ? '→' : task.status === 'blocked' ? '⏸' : '○';
        text += `    ${statusIcon} ${task.title}\n`;
        task.logs.forEach(log => {
          text += `       └ ${log.date}: ${log.content}\n`;
        });
      });
    });
    text += '\n';
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast('클립보드에 복사됨!', 'success');
  }).catch(() => {
    // 클립보드 API 실패 시 textarea fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('클립보드에 복사됨!', 'success'); }
    catch(e) { showToast('복사 실패 — 브라우저 권한을 확인하세요', 'error'); }
    finally { document.body.removeChild(ta); }
  });
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
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('단계 순서 변경됨', 'success');
}
window.moveStage = moveStage;
