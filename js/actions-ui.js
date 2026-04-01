// ============================================
// 드래그 앤 드롭 / UI 토글 / 태그·서브태스크 / 필터
// (actions.js에서 분리)
// ============================================

/**
 * 드래그 앤 드롭 - 드래그 시작
 */
function handleDragStart(e, taskId) {
  appState.draggedTaskId = taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
}

/**
 * 드래그 앤 드롭 - 드래그 종료
 */
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  appState.draggedTaskId = null;

  // 모든 드롭 타겟 표시 제거
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
}

/**
 * 드래그 앤 드롭 - 드래그 오버
 */
function handleDragOver(e, taskId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const targetEl = e.currentTarget;
  if (!targetEl.classList.contains('drag-over') && appState.draggedTaskId !== taskId) {
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    targetEl.classList.add('drag-over');
  }
}

/**
 * 드래그 앤 드롭 - 드롭
 */
function handleDrop(e, targetTaskId) {
  e.preventDefault();

  const draggedId = appState.draggedTaskId;
  if (!draggedId || draggedId === targetTaskId) return;

  const tasks = appState.tasks;
  const draggedIndex = tasks.findIndex(t => t.id === draggedId);
  const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // 작업 순서 변경
  const [draggedTask] = tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndex, 0, draggedTask);

  appState.tasks = tasks;
  saveState();
  renderStatic();
  showToast('순서가 변경되었습니다', 'success');
}

/**
 * 링크 열기
 */
function handleGo(link) {
  if (link) {
    // javascript: / data: 프로토콜 차단 (XSS 방지)
    try {
      const url = new URL(link, window.location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) return;
    } catch (e) { return; }
    window.open(link, '_blank');
  }
}

/**
 * 작업 리스트 토글
 */
function toggleTaskList() {
  appState.showTaskList = !appState.showTaskList;
  renderStatic();
}

/**
 * 완료된 작업 보기 토글
 */
function toggleCompletedTasks() {
  appState.showCompletedTasks = !appState.showCompletedTasks;
  renderStatic();
}

/**
 * 상세 추가 폼 토글
 */
function toggleDetailedAdd() {
  appState.showDetailedAdd = !appState.showDetailedAdd;

  // 수정 중이었으면 취소
  if (!appState.showDetailedAdd && appState.editingTaskId) {
    cancelEdit();
    return;
  }

  renderStatic();
}

/**
 * 전체 탭에서 카테고리별 완료 작업 토글
 */
function toggleCompletedCategory(category) {
  if (!appState.showCompletedByCategory) {
    appState.showCompletedByCategory = {};
  }
  appState.showCompletedByCategory[category] = !appState.showCompletedByCategory[category];
  renderStatic();
}

/**
 * 카테고리 변경 시 호출
 */
function updateDetailedTaskCategory(category) {
  appState.detailedTask.category = category;
  // 카테고리 변경 시 프로젝트 연결 초기화
  if (category !== '본업') {
    appState.detailedTask.workProjectId = null;
    appState.detailedTask.workStageIdx = null;
    appState.detailedTask.workSubcatIdx = null;
  }
  // 카테고리 변경 시 마감일 토글 리셋
  appState._detailedShowDeadline = undefined;
  renderStatic();
}

/**
 * 본업 프로젝트 연결
 */
function updateWorkProjectLink(projectId) {
  if (projectId) {
    appState.detailedTask.workProjectId = String(projectId);
    appState.detailedTask.workStageIdx = 0;
    // 첫 번째 중분류 선택
    const proj = appState.workProjects.find(p => p.id === String(projectId));
    if (proj?.stages[0]?.subcategories?.length > 0) {
      appState.detailedTask.workSubcatIdx = 0;
    } else {
      appState.detailedTask.workSubcatIdx = null;
    }
  } else {
    appState.detailedTask.workProjectId = null;
    appState.detailedTask.workStageIdx = null;
    appState.detailedTask.workSubcatIdx = null;
  }
  renderStatic();
}
window.updateWorkProjectLink = updateWorkProjectLink;

/**
 * 본업 단계 연결
 */
function updateWorkStageLink(stageIdx) {
  appState.detailedTask.workStageIdx = parseInt(stageIdx);
  // 해당 단계의 첫 번째 중분류 선택
  const proj = appState.workProjects.find(p => p.id === appState.detailedTask.workProjectId);
  if (proj?.stages[stageIdx]?.subcategories?.length > 0) {
    appState.detailedTask.workSubcatIdx = 0;
  } else {
    appState.detailedTask.workSubcatIdx = null;
  }
  renderStatic();
}
window.updateWorkStageLink = updateWorkStageLink;

/**
 * 본업 중분류 연결
 */
function updateWorkSubcatLink(subcatIdx) {
  appState.detailedTask.workSubcatIdx = parseInt(subcatIdx);
  renderStatic();
}
window.updateWorkSubcatLink = updateWorkSubcatLink;

/**
 * 태그를 작업에 추가
 */
function addTagToTask(tag) {
  if (!appState.detailedTask.tags) {
    appState.detailedTask.tags = [];
  }
  if (!appState.detailedTask.tags.includes(tag)) {
    appState.detailedTask.tags.push(tag);
    renderStatic();
  }
}

/**
 * 작업에서 태그 제거
 */
function removeTagFromTask(tag) {
  if (appState.detailedTask.tags) {
    appState.detailedTask.tags = appState.detailedTask.tags.filter(t => t !== tag);
    renderStatic();
  }
}

/**
 * 새 태그 추가 (전역 목록에도 추가)
 */
function addNewTag(tagName) {
  const tag = tagName.trim();
  if (!tag) return;

  // 전역 태그 목록에 추가
  if (!appState.availableTags.includes(tag)) {
    appState.availableTags.push(tag);
    saveState();
  }

  // 현재 작업에도 추가
  addTagToTask(tag);
}

/**
 * 서브태스크 추가
 */
function addSubtask(text) {
  const rawText = text.trim();
  if (!rawText) return;

  if (!appState.detailedTask.subtasks) {
    appState.detailedTask.subtasks = [];
  }

  const lines = parseBulletLines(rawText);
  lines.forEach(line => {
    appState.detailedTask.subtasks.push({
      text: line,
      completed: false,
      completedAt: null
    });
  });
  renderStatic();
  // 포커스 복원: renderStatic() 후 DOM이 재생성되므로 새 input에 포커스
  requestAnimationFrame(() => {
    const input = document.getElementById('new-subtask-input');
    if (input) {
      input.focus();
      input.value = '';
    }
  });
}

/**
 * 서브태스크 제거
 */
function removeSubtask(index) {
  if (appState.detailedTask.subtasks) {
    appState.detailedTask.subtasks.splice(index, 1);
    renderStatic();
    // 포커스 복원: renderStatic() 후 DOM이 재생성되므로 새 input에 포커스
    requestAnimationFrame(() => {
      const input = document.getElementById('new-subtask-input');
      if (input) {
        input.focus();
      }
    });
  }
}

/**
 * 상세 입력 폼에서 서브태스크 완료 토글
 */
function toggleDetailedSubtask(index) {
  if (appState.detailedTask.subtasks && appState.detailedTask.subtasks[index]) {
    appState.detailedTask.subtasks[index].completed = !appState.detailedTask.subtasks[index].completed;
    appState.detailedTask.subtasks[index].completedAt = appState.detailedTask.subtasks[index].completed
      ? new Date().toISOString()
      : null;

    // 수정 중인 작업이면 실제 작업에도 반영
    if (appState.editingTaskId) {
      const task = appState.tasks.find(t => t.id === appState.editingTaskId);
      if (task && task.subtasks) {
        task.subtasks = [...appState.detailedTask.subtasks];
        saveState();
      }
    }
    renderStatic();
    // 포커스 복원: renderStatic() 후 DOM이 재생성되므로 새 input에 포커스
    requestAnimationFrame(() => {
      const input = document.getElementById('new-subtask-input');
      if (input) {
        input.focus();
      }
    });
  }
}

/**
 * 서브태스크 완료 토글 (작업 내에서)
 */
function toggleSubtaskComplete(taskId, subtaskIndex) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (task && task.subtasks && task.subtasks[subtaskIndex]) {
    const subtask = task.subtasks[subtaskIndex];
    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date().toISOString() : null;

    // 서브태스크 완료/해제 시 completionLog 관리
    if (subtask.completed) {
      const now = new Date();
      const dateKey = getLocalDateStr(now);
      const timeStr = now.toTimeString().slice(0, 5);
      if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
      appState.completionLog[dateKey].push({
        t: task.title + ' > ' + subtask.text,
        c: task.category || '기타',
        at: timeStr,
        sub: true
      });
      saveCompletionLog();
    } else {
      // 해제 시 오늘 로그에서 삭제 + soft-delete (Firebase 부활 방지)
      const dateKey = getLocalDateStr(new Date());
      const logTitle = task.title + ' > ' + subtask.text;
      if (appState.completionLog[dateKey]) {
        const idx = appState.completionLog[dateKey].findIndex(
          e => e.t === logTitle && e.sub === true
        );
        if (idx !== -1) {
          const delKey = dateKey + '|' + logTitle + '|' + appState.completionLog[dateKey][idx].at;
          if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
          appState.deletedIds.completionLog[delKey] = new Date().toISOString();
          appState.completionLog[dateKey].splice(idx, 1);
          if (appState.completionLog[dateKey].length === 0) delete appState.completionLog[dateKey];
          saveCompletionLog();
        }
      }
    }

    saveState();
    renderStatic();
  }
}

/**
 * 서브태스크 목록 펼치기/접기 (레거시 — toggleSubtaskChips로 위임)
 */
function toggleSubtaskExpand(taskId) {
  toggleSubtaskChips(taskId);
}

/**
 * 서브태스크 칩 접기/펼치기 (태스크 카드 내 서브태스크 칩 목록)
 */
function toggleSubtaskChips(taskId) {
  if (!appState.collapsedSubtaskChips) appState.collapsedSubtaskChips = {};
  appState.collapsedSubtaskChips[taskId] = !appState.collapsedSubtaskChips[taskId];
  try { localStorage.setItem('navigator-collapsed-subtask-chips', JSON.stringify(appState.collapsedSubtaskChips)); } catch (_) {}
  renderStatic();
}
window.toggleSubtaskChips = toggleSubtaskChips;

/**
 * 본업 일반 작업 세부작업 펼침/접힘
 */
function toggleWorkGeneralSubtask(taskId) {
  if (!appState.expandedWorkGeneralSubtasks) {
    appState.expandedWorkGeneralSubtasks = {};
  }
  appState.expandedWorkGeneralSubtasks[taskId] = !appState.expandedWorkGeneralSubtasks[taskId];
  renderStatic();
}
window.toggleWorkGeneralSubtask = toggleWorkGeneralSubtask;

/**
 * 반복 유형 변경 시 호출
 */
function updateDetailedTaskRepeat(repeatType) {
  appState.detailedTask.repeatType = repeatType;
  // 타입 변경 시 관련 필드 초기화
  if (repeatType !== 'custom') {
    appState.detailedTask.repeatDays = [];
  }
  if (repeatType !== 'monthly') {
    appState.detailedTask.repeatMonthDay = null;
  }
  if (repeatType !== 'interval') {
    appState.detailedTask.repeatInterval = null;
  }
  renderStatic();
}

/**
 * N일 간격 변경 시 호출
 */
function updateRepeatInterval(value) {
  appState.detailedTask.repeatInterval = Math.max(2, parseInt(value) || 2);
}
window.updateRepeatInterval = updateRepeatInterval;

/**
 * 특정 요일 토글
 */
function toggleRepeatDay(dayIndex) {
  if (!appState.detailedTask.repeatDays) {
    appState.detailedTask.repeatDays = [];
  }
  const days = appState.detailedTask.repeatDays;
  const idx = days.indexOf(dayIndex);
  if (idx === -1) {
    days.push(dayIndex);
  } else {
    days.splice(idx, 1);
  }
  days.sort((a, b) => a - b);
  renderStatic();
}

/**
 * 매월 반복일 설정
 */
function updateRepeatMonthDay(day) {
  const dayNum = parseInt(day);
  appState.detailedTask.repeatMonthDay = (dayNum >= 1 && dayNum <= 31) ? dayNum : null;
}

/**
 * 일정 필터 변경
 */
function setScheduleFilter(filter) {
  appState.scheduleFilter = filter;
  renderStatic();
}

/**
 * 검색어 변경
 */
function setSearchQuery(query) {
  appState.searchQuery = query;
  renderStatic();
}

/**
 * 검색어 클리어
 */
function clearSearch() {
  appState.searchQuery = '';
  renderStatic();
}

/**
 * 카테고리 필터 변경
 */
function setCategoryFilter(category) {
  appState.categoryFilter = category;
  renderStatic();
}

/**
 * 태그 필터 설정
 */
function setTagFilter(tag) {
  appState.tagFilter = appState.tagFilter === tag ? null : tag;
  renderStatic();
}
