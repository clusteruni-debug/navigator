// ============================================
// 본업 프로젝트 - CRUD 액션
// ============================================


/**
 * 중분류 이름 변경 프롬프트
 */
function promptRenameSubcategory(projectId, stageIdx, subcatIdx) {
  showWorkModal('rename-subcategory', projectId, stageIdx, subcatIdx);
}
window.promptRenameSubcategory = promptRenameSubcategory;

/**
 * 중분류 이름 변경
 */
function renameSubcategory(projectId, stageIdx, subcatIdx, newName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  if (!newName || !newName.trim()) return;
  const subcat = project.stages[stageIdx]?.subcategories?.[subcatIdx];
  if (subcat) {
    subcat.name = newName.trim();
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast('중분류 이름이 변경되었습니다', 'success');
  }
}
window.renameSubcategory = renameSubcategory;

/**
 * 소분류(항목) 이름 변경 — 모달 (textarea, 줄바꿈·불렛 붙여넣기 지원)
 */
function promptRenameWorkTask(projectId, stageIdx, subcatIdx, taskIdx) {
  showWorkModal('edit-task', projectId, stageIdx, subcatIdx, taskIdx);
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

  const stage = project.stages?.[stageIdx];
  if (!stage) return;

  if (!stage.subcategories) {
    stage.subcategories = [];
  }

  stage.subcategories.push({
    id: generateId(),
    name: name,
    tasks: []
  });

  // 접힌 스테이지 자동 펼치기 (중분류 추가 시)
  if (appState.collapsedStages) {
    const _csKey = projectId + '-' + stageIdx;
    const _csVal = appState.collapsedStages[_csKey];
    const _currentIdx = project.stages.findIndex(s => !s.completed);
    const _isDefaultCollapsed = _currentIdx === -1 || stageIdx !== _currentIdx;
    if (_csVal === 'explicit-collapsed' || (!_csVal && _isDefaultCollapsed)) {
      appState.collapsedStages[_csKey] = 'explicit-expanded';
    }
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(`"${name}" 추가됨`, 'success');
}
window.addSubcategory = addSubcategory;

/**
 * 중분류 삭제
 */
function deleteSubcategory(projectId, stageIdx, subcatIdx) {
  if (!confirm('이 중분류와 하위 항목을 모두 삭제하시겠습니까?')) return;

  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const stage = project.stages?.[stageIdx];
  if (!stage) return;

  // expandedWorkLogs + expandedWorkTasks cleanup
  const subcat = (stage.subcategories || [])[subcatIdx];
  if (subcat) {
    if (appState.expandedWorkLogs) (subcat.tasks || []).forEach(t => { if (t.id) delete appState.expandedWorkLogs[t.id]; });
    if (appState.expandedWorkTasks) {
      const prefix = projectId + '-' + stageIdx + '-' + subcatIdx + '-';
      Object.keys(appState.expandedWorkTasks).forEach(k => { if (k.startsWith(prefix)) delete appState.expandedWorkTasks[k]; });
    }
    if (appState.expandedWorkTaskDetails) {
      const prefix = projectId + '-' + stageIdx + '-' + subcatIdx + '-';
      Object.keys(appState.expandedWorkTaskDetails).forEach(k => { if (k.startsWith(prefix)) delete appState.expandedWorkTaskDetails[k]; });
    }
    // collapsedSubcategories cleanup (index shift 후 잘못된 상태 방지)
    if (appState.collapsedSubcategories) {
      const prefix = projectId + '-' + stageIdx + '-';
      Object.keys(appState.collapsedSubcategories).forEach(k => { if (k.startsWith(prefix)) delete appState.collapsedSubcategories[k]; });
    }
  }
  stage.subcategories.splice(subcatIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('삭제됨', 'success');
}
window.deleteSubcategory = deleteSubcategory;

/**
 * 작업 항목 추가
 */
function addWorkTask(projectId, stageIdx, subcatIdx, title, status, canStartEarly = false) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const subcat = project.stages[stageIdx]?.subcategories?.[subcatIdx];
  if (!subcat) return;

  subcat.tasks.push({
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

  // 접힌 스테이지 자동 펼치기 (항목 추가 시)
  if (appState.collapsedStages) {
    const _csKey = projectId + '-' + stageIdx;
    const _csVal = appState.collapsedStages[_csKey];
    const _currentIdx = project.stages.findIndex(s => !s.completed);
    const _isDefaultCollapsed = _currentIdx === -1 || stageIdx !== _currentIdx;
    if (_csVal === 'explicit-collapsed' || (!_csVal && _isDefaultCollapsed)) {
      appState.collapsedStages[_csKey] = 'explicit-expanded';
    }
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('항목 추가됨', 'success');
}
window.addWorkTask = addWorkTask;

/**
 * 작업 상태 순환
 */
function cycleWorkTaskStatus(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;
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
  // stable task ID를 디바운스 키로 사용 (인덱스 시프트 방지)
  const project = appState.workProjects.find(p => p.id === projectId);
  const task = project?.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  const key = task?.id || `${projectId}-${stageIdx}-${subcatIdx}-${taskIdx}`;
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

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;
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

  const subcat = project.stages[stageIdx]?.subcategories?.[subcatIdx];
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
        const alreadyLogged = task.logs.some(l => l.date === today && l.content === '✓ 완료');
        if (!alreadyLogged) {
          task.logs.push({ date: today, content: '✓ 완료' });
        }
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
  const stage = project.stages?.[stageIdx];
  if (!stage) return;
  const subcat = (stage.subcategories || [])[subcatIdx];
  if (!subcat) return;

  const task = subcat.tasks[taskIdx];
  if (task) {
    const uid = task.id || (projectId + '-' + stageIdx + '-' + subcatIdx + '-' + taskIdx);
    if (appState.expandedWorkLogs) delete appState.expandedWorkLogs[uid];
    // Clear all task expand keys for this subcategory (index shift after splice)
    if (appState.expandedWorkTasks) {
      const prefix = projectId + '-' + stageIdx + '-' + subcatIdx + '-';
      Object.keys(appState.expandedWorkTasks).forEach(k => { if (k.startsWith(prefix)) delete appState.expandedWorkTasks[k]; });
    }
    if (appState.expandedWorkTaskDetails) {
      const prefix = projectId + '-' + stageIdx + '-' + subcatIdx + '-';
      Object.keys(appState.expandedWorkTaskDetails).forEach(k => { if (k.startsWith(prefix)) delete appState.expandedWorkTaskDetails[k]; });
    }
  }
  subcat.tasks.splice(taskIdx, 1);
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

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;
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

window.addWorkLog = addWorkLog;

/**
 * 로그 삭제
 */
function deleteWorkLog(projectId, stageIdx, subcatIdx, taskIdx, logIdx) {
  if (!confirm('이 기록을 삭제하시겠습니까?')) return;
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task || !task.logs) return;
  task.logs.splice(logIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.deleteWorkLog = deleteWorkLog;

/**
 * Task 2-6: 로그 내용 편집 — 모달 (textarea, 줄바꿈·불렛 붙여넣기 지원)
 */
function editWorkLog(projectId, stageIdx, subcatIdx, taskIdx, logIdx) {
  showWorkModal('edit-log', projectId, stageIdx, subcatIdx, taskIdx, logIdx);
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

// ============================================
// 본업 중분류/작업 항목 드래그 재정렬 (HTML5 Drag, 데스크톱 전용)
// ============================================

/**
 * 인덱스 매핑 헬퍼: fromIdx에서 insertIdx로 이동했을 때 oldIdx의 새 위치 반환
 * - 이동된 항목 자체: fromIdx → insertIdx
 * - forward (fromIdx < insertIdx): 사이 인덱스 1씩 감소
 * - backward (fromIdx > insertIdx): 사이 인덱스 1씩 증가
 */
function _mapReorderedIdx(oldIdx, fromIdx, insertIdx) {
  if (oldIdx === fromIdx) return insertIdx;
  if (fromIdx < insertIdx) {
    if (oldIdx > fromIdx && oldIdx <= insertIdx) return oldIdx - 1;
  } else {
    if (oldIdx >= insertIdx && oldIdx < fromIdx) return oldIdx + 1;
  }
  return oldIdx;
}

/**
 * state 키 매핑 헬퍼: prefix 다음 첫 segment(인덱스)를 reorder 결과에 맞춰 재매핑
 * - Navigator state 키 형식: "projectId-stageIdx-subcatIdx[-taskIdx[-...]]"
 * - prefix는 매핑할 segment 직전까지 (예: 'projId-0-' → subcatIdx 매핑)
 * - prefix와 무관한 키는 그대로 보존
 * - 다른 subcat/task의 사용자 펼침 상태가 reorder 후에도 유지됨
 */
function _remapStateKeys(stateObj, prefix, fromIdx, insertIdx) {
  if (!stateObj) return;
  const remapped = {};
  Object.keys(stateObj).forEach(k => {
    if (!k.startsWith(prefix)) {
      remapped[k] = stateObj[k];
      return;
    }
    const rest = k.slice(prefix.length);
    const dash = rest.indexOf('-');
    const idxStr = dash === -1 ? rest : rest.slice(0, dash);
    const idx = parseInt(idxStr, 10);
    if (isNaN(idx)) {
      remapped[k] = stateObj[k];
      return;
    }
    const newIdx = _mapReorderedIdx(idx, fromIdx, insertIdx);
    const tail = dash === -1 ? '' : rest.slice(dash);
    remapped[prefix + newIdx + tail] = stateObj[k];
  });
  Object.keys(stateObj).forEach(k => delete stateObj[k]);
  Object.assign(stateObj, remapped);
}

/**
 * 중분류 순서 재정렬 (같은 단계 내에서만)
 */
function reorderSubcategory(projectId, stageIdx, fromIdx, toIdx) {
  if (fromIdx === toIdx) return;
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const stage = project.stages?.[stageIdx];
  if (!stage || !stage.subcategories) return;
  const arr = stage.subcategories;
  if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;

  const [moved] = arr.splice(fromIdx, 1);
  // 표준 drag-drop 보정: from < to인 경우 splice 후 인덱스가 1 줄어들었으므로 to-- 필요
  // → "C 위에 drop"이 "A가 C 자리에" 결과로 나오게 함 (사용자 직관 일치)
  const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
  arr.splice(insertIdx, 0, moved);

  // 인덱스 기반 UI 상태 매핑 (이동된 subcat 인덱스만 변경, 다른 subcat 펼침 상태 보존)
  const stagePrefix = projectId + '-' + stageIdx + '-';
  _remapStateKeys(appState.collapsedSubcategories, stagePrefix, fromIdx, insertIdx);
  _remapStateKeys(appState.expandedWorkTasks, stagePrefix, fromIdx, insertIdx);
  _remapStateKeys(appState.expandedWorkTaskDetails, stagePrefix, fromIdx, insertIdx);
  _remapStateKeys(appState.expandedWorkLogContents, stagePrefix, fromIdx, insertIdx);

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('중분류 순서 변경됨', 'success');
}
window.reorderSubcategory = reorderSubcategory;

/**
 * 작업 항목 순서 재정렬 (같은 중분류 내에서만)
 */
function reorderWorkTask(projectId, stageIdx, subcatIdx, fromIdx, toIdx) {
  if (fromIdx === toIdx) return;
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const subcat = project.stages && project.stages[stageIdx] &&
    project.stages[stageIdx].subcategories && project.stages[stageIdx].subcategories[subcatIdx];
  if (!subcat || !subcat.tasks) return;
  const arr = subcat.tasks;
  if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;

  const [moved] = arr.splice(fromIdx, 1);
  // 표준 drag-drop 보정 (reorderSubcategory와 동일 로직)
  const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
  arr.splice(insertIdx, 0, moved);

  // 해당 중분류 내 task 인덱스 매핑 (이동된 task만 인덱스 변경, 다른 task 펼침 상태 보존)
  const subcatPrefix = projectId + '-' + stageIdx + '-' + subcatIdx + '-';
  _remapStateKeys(appState.expandedWorkTasks, subcatPrefix, fromIdx, insertIdx);
  _remapStateKeys(appState.expandedWorkTaskDetails, subcatPrefix, fromIdx, insertIdx);
  _remapStateKeys(appState.expandedWorkLogContents, subcatPrefix, fromIdx, insertIdx);

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('항목 순서 변경됨', 'success');
}
window.reorderWorkTask = reorderWorkTask;

// ─── 중분류 드래그 핸들러 ───

function handleSubcategoryDragStart(e, projectId, stageIdx, subcatIdx) {
  e.stopPropagation();
  appState.workDragState = { type: 'subcat', projectId, stageIdx, subcatIdx };
  e.dataTransfer.effectAllowed = 'move';
  const parent = e.target.closest('.work-subcategory');
  if (parent) {
    try { e.dataTransfer.setDragImage(parent, 0, 0); } catch (_) {}
    parent.classList.add('work-dragging');
  }
  document.body.classList.add('work-drag-active');
}
window.handleSubcategoryDragStart = handleSubcategoryDragStart;

function handleSubcategoryDragOver(e, projectId, stageIdx, targetSubcatIdx) {
  const ds = appState.workDragState;
  if (!ds || ds.type !== 'subcat') return;
  if (ds.projectId !== projectId || ds.stageIdx !== stageIdx) return;
  if (ds.subcatIdx === targetSubcatIdx) return;
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.work-subcategory.work-drop-target').forEach(el => {
    if (el !== e.currentTarget) el.classList.remove('work-drop-target');
  });
  e.currentTarget.classList.add('work-drop-target');
}
window.handleSubcategoryDragOver = handleSubcategoryDragOver;

function handleSubcategoryDrop(e, projectId, stageIdx, targetSubcatIdx) {
  const ds = appState.workDragState;
  if (!ds || ds.type !== 'subcat') return;
  if (ds.projectId !== projectId || ds.stageIdx !== stageIdx) {
    appState.workDragState = null;
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const fromIdx = ds.subcatIdx;
  appState.workDragState = null;
  reorderSubcategory(projectId, stageIdx, fromIdx, targetSubcatIdx);
}
window.handleSubcategoryDrop = handleSubcategoryDrop;

// ─── 작업 항목 드래그 핸들러 ───

function handleWorkTaskDragStart(e, projectId, stageIdx, subcatIdx, taskIdx) {
  e.stopPropagation();
  appState.workDragState = { type: 'task', projectId, stageIdx, subcatIdx, taskIdx };
  e.dataTransfer.effectAllowed = 'move';
  const parent = e.target.closest('.work-task-item');
  if (parent) {
    try { e.dataTransfer.setDragImage(parent, 0, 0); } catch (_) {}
    parent.classList.add('work-dragging');
  }
  document.body.classList.add('work-drag-active');
}
window.handleWorkTaskDragStart = handleWorkTaskDragStart;

function handleWorkTaskDragOver(e, projectId, stageIdx, subcatIdx, targetTaskIdx) {
  const ds = appState.workDragState;
  if (!ds || ds.type !== 'task') return;
  if (ds.projectId !== projectId || ds.stageIdx !== stageIdx || ds.subcatIdx !== subcatIdx) return;
  if (ds.taskIdx === targetTaskIdx) return;
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.work-task-item.work-drop-target').forEach(el => {
    if (el !== e.currentTarget) el.classList.remove('work-drop-target');
  });
  e.currentTarget.classList.add('work-drop-target');
}
window.handleWorkTaskDragOver = handleWorkTaskDragOver;

function handleWorkTaskDrop(e, projectId, stageIdx, subcatIdx, targetTaskIdx) {
  const ds = appState.workDragState;
  if (!ds || ds.type !== 'task') return;
  if (ds.projectId !== projectId || ds.stageIdx !== stageIdx || ds.subcatIdx !== subcatIdx) {
    appState.workDragState = null;
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const fromIdx = ds.taskIdx;
  appState.workDragState = null;
  reorderWorkTask(projectId, stageIdx, subcatIdx, fromIdx, targetTaskIdx);
}
window.handleWorkTaskDrop = handleWorkTaskDrop;

// 공통: dragend 시 모든 시각 표시 정리 (subcat/task 공용)
function handleWorkDragEnd(e) {
  appState.workDragState = null;
  document.querySelectorAll('.work-dragging').forEach(el => el.classList.remove('work-dragging'));
  document.querySelectorAll('.work-drop-target').forEach(el => el.classList.remove('work-drop-target'));
  document.body.classList.remove('work-drag-active');
}
window.handleWorkDragEnd = handleWorkDragEnd;

