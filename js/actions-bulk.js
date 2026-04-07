// ============================================
// 일괄 작업 / 삭제 / 휴지통
// (actions-edit.js에서 분리)
// ============================================

/**
 * 작업 삭제
 */
function deleteTask(id) {
  if (!confirm('정말 삭제하시겠습니까? (휴지통에서 복원 가능)')) return;

  const task = appState.tasks.find(t => t.id === id);
  if (task) {
    // 휴지통으로 이동 (30일 보관)
    appState.trash.push({ ...task, deletedAt: new Date().toISOString() });
  }
  // Soft-Delete: 삭제 기록 남기기 (동기화 시 부활 방지)
  appState.deletedIds.tasks[id] = new Date().toISOString();
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  // UI 상태 정리: 접힌 서브태스크 칩 제거
  if (appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[id]) {
    delete appState.collapsedSubtaskChips[id];
    try { localStorage.setItem('navigator-collapsed-subtask-chips', JSON.stringify(appState.collapsedSubtaskChips)); } catch (_) {}
  }
  saveState();
  renderStatic();
  showToast('휴지통으로 이동했습니다 (30일 보관)', 'success');
  srAnnounce('작업 삭제됨');
}

/**
 * 이벤트 일괄 선택 모드 토글
 */
function toggleEventBulkSelect() {
  _eventBulkSelectMode = !_eventBulkSelectMode;
  _eventBulkSelectedIds.clear();
  renderStatic();
}

/**
 * 이벤트 개별 선택 토글
 */
function toggleEventSelection(id) {
  if (_eventBulkSelectedIds.has(id)) {
    _eventBulkSelectedIds.delete(id);
  } else {
    _eventBulkSelectedIds.add(id);
  }
  renderStatic();
}

/**
 * 이벤트 전체 선택/해제
 */
function toggleEventSelectAll() {
  // 로컬 이벤트만 선택 대상 (Supabase 수신 이벤트는 벌크 선택 불가)
  const localEvents = appState.tasks.filter(t => t.category === '부업' && !(t.source && t.source.type === 'telegram-event'));
  if (_eventBulkSelectedIds.size === localEvents.length) {
    _eventBulkSelectedIds.clear();
  } else {
    localEvents.forEach(t => _eventBulkSelectedIds.add(t.id));
  }
  renderStatic();
}

/**
 * 선택된 이벤트 일괄 삭제 (soft-delete)
 */
function bulkDeleteEvents() {
  const count = _eventBulkSelectedIds.size;
  if (count === 0) return;
  if (!confirm(count + '개 이벤트를 삭제하시겠습니까? (휴지통에서 복원 가능)')) return;

  const now = new Date().toISOString();
  _eventBulkSelectedIds.forEach(id => {
    const task = appState.tasks.find(t => t.id === id);
    if (task) {
      appState.trash.push({ ...task, deletedAt: now });
    }
    appState.deletedIds.tasks[id] = now;
  });
  appState.tasks = appState.tasks.filter(t => !_eventBulkSelectedIds.has(t.id));

  _eventBulkSelectedIds.clear();
  _eventBulkSelectMode = false;

  saveState();
  renderStatic();
  showToast(count + '개 이벤트가 삭제되었습니다', 'success');
}

/**
 * 이벤트 그룹 접기/펼치기
 */
function toggleEventGroup(groupId) {
  if (_collapsedEventGroups.has(groupId)) {
    _collapsedEventGroups.delete(groupId);
  } else {
    _collapsedEventGroups.add(groupId);
  }
  renderStatic();
}

/**
 * 이벤트 그룹별 전체 선택
 */
function toggleEventGroupSelect(taskIds) {
  // taskIds 배열의 모든 항목이 이미 선택되어 있으면 해제, 아니면 전체 선택
  const allSelected = taskIds.every(id => _eventBulkSelectedIds.has(id));
  if (allSelected) {
    taskIds.forEach(id => _eventBulkSelectedIds.delete(id));
  } else {
    taskIds.forEach(id => _eventBulkSelectedIds.add(id));
  }
  renderStatic();
}

/**
 * 휴지통에서 태스크 복원
 */
function restoreFromTrash(id) {
  const idx = appState.trash.findIndex(t => t.id === id);
  if (idx === -1) return;

  const task = { ...appState.trash[idx] };
  delete task.deletedAt;

  // deletedIds에서도 제거 (동기화 시 다시 삭제되지 않도록)
  delete appState.deletedIds.tasks[id];
  if (appState.deletedIds.trash) delete appState.deletedIds.trash[id];

  appState.tasks.push(task);
  appState.trash.splice(idx, 1);
  saveState();
  renderStatic();
  showToast('"' + (task.title || '작업') + '" 복원되었습니다', 'success');
}

/**
 * 휴지통에서 영구 삭제
 */
function permanentDeleteFromTrash(id) {
  if (!confirm('영구 삭제하면 복원할 수 없습니다. 진행하시겠습니까?')) return;
  // Soft-Delete: 동기화 시 부활 방지
  if (!appState.deletedIds.trash) appState.deletedIds.trash = {};
  appState.deletedIds.trash[id] = new Date().toISOString();
  appState.trash = appState.trash.filter(t => t.id !== id);
  saveState();
  renderStatic();
  showToast('영구 삭제되었습니다', 'info');
}

/**
 * 휴지통 비우기
 */
function emptyTrash() {
  if (appState.trash.length === 0) return;
  if (!confirm('휴지통을 비우면 ' + appState.trash.length + '개 항목이 영구 삭제됩니다. 진행하시겠습니까?')) return;
  // Soft-Delete: 모든 휴지통 항목의 삭제 기록 추가 (동기화 시 부활 방지)
  if (!appState.deletedIds.trash) appState.deletedIds.trash = {};
  const now = new Date().toISOString();
  appState.trash.forEach(t => {
    appState.deletedIds.trash[t.id] = now;
  });
  appState.trash = [];
  saveState();
  renderStatic();
  showToast('휴지통을 비웠습니다', 'info');
}

/**
 * 30일 이상 된 휴지통 항목 자동 정리
 */
function cleanupOldTrash() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const before = appState.trash.length;
  // Soft-Delete: 만료 항목도 deletedIds에 기록 (동기화 시 부활 방지)
  if (!appState.deletedIds.trash) appState.deletedIds.trash = {};
  const now = new Date().toISOString();
  appState.trash.forEach(t => {
    if (!t.deletedAt || t.deletedAt <= thirtyDaysAgo) {
      appState.deletedIds.trash[t.id] = now;
    }
  });
  appState.trash = appState.trash.filter(t => t.deletedAt && t.deletedAt > thirtyDaysAgo);
  if (appState.trash.length < before) {
    console.log('[trash] ' + (before - appState.trash.length) + '개 만료 항목 정리');
  }
}

/**
 * 작업 복사
 */
function copyTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  const now = new Date().toISOString();
  const newTask = {
    ...task,
    id: generateId(),
    title: task.title + ' (복사)',
    completed: false,
    spawnedFromTaskId: undefined,
    createdAt: now,
    updatedAt: now
  };

  appState.tasks.push(newTask);
  saveState();
  renderStatic();
  showToast('작업이 복사되었습니다', 'success');
}
