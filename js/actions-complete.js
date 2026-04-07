// ============================================
// 작업 완료 / 완료 취소 / 백데이트
// 하위 모듈: actions-adhd.js, actions-repeat.js
// ============================================

/**
 * 특정 날짜로 작업 완료 기록 (백데이트)
 * completionLog에 해당 날짜로 기록하고, 태스크는 완료 처리
 */
function completeTaskForDate(id, dateStr) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;
  if (task.completed) return;

  // completedAt을 백데이트 날짜의 12:00으로 설정 (uncompleteTask 호환)
  const completedAt = new Date(dateStr + 'T12:00:00').toISOString();
  const now = new Date();
  const updatedAt = now.toISOString();

  // 태스크 완료 처리
  appState.tasks = appState.tasks.map(t =>
    t.id === id ? { ...t, completed: true, completedAt: completedAt, updatedAt: updatedAt } : t
  );

  // completionLog에 지정 날짜로 기록
  const timeStr = '12:00';
  const logEntry = { t: task.title, c: task.category, at: timeStr };
  if (task.repeatType && task.repeatType !== 'none') logEntry.r = task.repeatType;
  if (task.expectedRevenue) logEntry.rv = Number(task.expectedRevenue);
  if (task.subtasks && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter(s => s.completed).length;
    if (doneCount > 0) logEntry.st = doneCount;
  }
  if (!appState.completionLog[dateStr]) appState.completionLog[dateStr] = [];
  appState.completionLog[dateStr].push(logEntry);
  saveCompletionLog();

  const isToday = dateStr === getLocalDateStr();

  // 오늘 통계는 오늘 완료일 때만 증가
  if (isToday) {
    appState.todayStats.completedToday++;
    appState.todayStats.streak++;
  }
  recordActivity(task.title);

  // 반복 작업이면 다음 주기 작업 자동 생성 (daily/weekdays는 checkDailyReset이 처리)
  if (task.repeatType && task.repeatType !== 'none'
      && task.repeatType !== 'daily' && task.repeatType !== 'weekdays') {
    const isDuplicate = appState.tasks.some(t =>
      t.id !== task.id && !t.completed &&
      t.title === task.title && t.category === task.category &&
      t.repeatType === task.repeatType
    );
    if (!isDuplicate) {
      const nextTask = createNextRepeatTask(task);
      if (nextTask) appState.tasks.push(nextTask);
    }
  }

  // daily/weekdays 태스크를 과거 논리일로 백데이트 → 즉시 리셋 (오늘 다시 완료 가능)
  const logicalToday = getLogicalDate();
  const logicalCompDate = getLogicalDate(new Date(dateStr + 'T12:00:00'));
  const wasBackdateReset = logicalCompDate !== logicalToday &&
      (task.repeatType === 'daily' || task.repeatType === 'weekdays');
  if (wasBackdateReset) {
    const updatedTask = appState.tasks.find(t => t.id === id);
    if (updatedTask) {
      updatedTask.lastCompletedAt = updatedTask.completedAt;
      updatedTask.completed = false;
      updatedTask.completedAt = null;
      updatedTask.updatedAt = new Date().toISOString();
      if (updatedTask.subtasks) {
        updatedTask.subtasks.forEach(st => {
          st.completed = false;
          st.completedAt = null;
        });
      }
    }
  }

  saveState();

  // tgeventbot 연동 (백데이트 리셋 시 스킵)
  if (!wasBackdateReset && task.source && task.source.type === 'telegram-event') {
    updateLinkedEventStatus(task, true);
  }

  const _yd = new Date(); _yd.setDate(_yd.getDate() - 1);
  const dateLabel = isToday ? '오늘' :
    dateStr === getLocalDateStr(_yd) ? '어제' : dateStr;

  if (wasBackdateReset) {
    // 백데이트 리셋: 기록만 남기고 태스크 리셋됨 — 애니메이션/undo 불필요
    showToast(`${dateLabel} 기록 완료: ${task.title}`, 'success');
    srAnnounce(`${dateLabel} 기록: ` + task.title);
    renderStatic();
  } else {
    // 일반 완료: 애니메이션 + undo
    const taskEls = document.querySelectorAll(`[id$="-${id}"], [data-task-id="${id}"]`);
    taskEls.forEach(el => {
      if (el.classList.contains('task-item') || el.closest('.task-item')) {
        const item = el.classList.contains('task-item') ? el : el.closest('.task-item');
        item.classList.add('completing');
      }
    });
    setTimeout(() => {
      showCompletionAnimation(task.title, appState.todayStats.streak);
    }, 350);
    showToast(`${dateLabel} 완료: ${task.title}`, 'success');
    srAnnounce('작업 완료: ' + task.title);
    showUndoToast(id, task.title);
    if (isToday) checkMilestone();
  }

  if (navigator.vibrate) {
    navigator.vibrate([50, 100, 50]);
  }
}
window.completeTaskForDate = completeTaskForDate;

/**
 * 롱프레스용 날짜 선택 팝업 표시
 */
function showBackdateMenu(id, anchorEl) {
  // detached 엘리먼트 가드 (renderStatic 후 stale 참조 방지)
  if (!document.body.contains(anchorEl)) return;

  // 기존 메뉴 제거 (이벤트 리스너 즉시 정리)
  const existing = document.querySelector('.backdate-menu');
  if (existing) {
    if (existing._closeCleanup) existing._closeCleanup();
    existing.remove();
  }

  const rect = anchorEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'backdate-menu';

  const today = getLocalDateStr();
  const _yd = new Date(); _yd.setDate(_yd.getDate() - 1);
  const yesterday = getLocalDateStr(_yd);

  menu.innerHTML = `
    <div class="backdate-menu-item" data-date="${today}">오늘</div>
    <div class="backdate-menu-item" data-date="${yesterday}">어제</div>
    <div class="backdate-menu-item backdate-menu-custom">
      <input type="date" class="backdate-date-input" value="${yesterday}" max="${today}">
    </div>
  `;

  // 위치 계산 (우측 클리핑 방지)
  menu.style.position = 'fixed';
  menu.style.zIndex = '9999';
  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  const menuWidth = menu.offsetWidth || 160;
  const leftPos = Math.min(Math.max(8, rect.left - 40), window.innerWidth - menuWidth - 8);
  menu.style.left = leftPos + 'px';
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.visibility = '';

  // date input 변경 시 완료 처리
  const dateInput = menu.querySelector('.backdate-date-input');
  dateInput.addEventListener('change', () => {
    const val = dateInput.value;
    if (!val) return;
    if (val > today) { showToast('미래 날짜는 선택할 수 없습니다', 'error'); return; }
    if (menu._closeCleanup) menu._closeCleanup();
    menu.remove();
    completeTaskForDate(id, val);
  });
  // date input 클릭 시 메뉴 닫힘 방지
  dateInput.addEventListener('pointerdown', (e) => e.stopPropagation());

  // 오늘/어제 클릭 처리
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.backdate-menu-item[data-date]');
    if (!item) return;
    if (menu._closeCleanup) menu._closeCleanup();
    menu.remove();
    completeTaskForDate(id, item.dataset.date);
  });

  // 바깥 클릭 시 닫기 (detached menu 자동 정리 포함)
  const closeHandler = (e) => {
    if (!document.body.contains(menu) || !menu.contains(e.target)) {
      if (document.body.contains(menu)) menu.remove();
      document.removeEventListener('pointerdown', closeHandler);
      menu._closeCleanup = null;
    }
  };
  setTimeout(() => {
    if (!document.body.contains(menu)) return;
    document.addEventListener('pointerdown', closeHandler);
    menu._closeCleanup = () => document.removeEventListener('pointerdown', closeHandler);
  }, 10);
}
window.showBackdateMenu = showBackdateMenu;

/**
 * 서브태스크용 롱프레스 날짜 선택 팝업 표시
 */
function showSubtaskBackdateMenu(taskId, subtaskIndex, anchorEl) {
  if (!document.body.contains(anchorEl)) return;

  const task = appState.tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks || !task.subtasks[subtaskIndex]) return;
  const subtask = task.subtasks[subtaskIndex];

  // 이미 완료된 서브태스크면 해제
  if (subtask.completed) {
    toggleSubtaskComplete(taskId, subtaskIndex);
    showToast(`해제됨: ${subtask.text}`, 'success');
    return;
  }

  // 기존 메뉴 제거 (이벤트 리스너 즉시 정리)
  const existing = document.querySelector('.backdate-menu');
  if (existing) {
    if (existing._closeCleanup) existing._closeCleanup();
    existing.remove();
  }

  const rect = anchorEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'backdate-menu';

  const today = getLocalDateStr();
  const _yd = new Date(); _yd.setDate(_yd.getDate() - 1);
  const yesterday = getLocalDateStr(_yd);

  menu.innerHTML = `
    <div class="backdate-menu-item" data-date="${today}">오늘</div>
    <div class="backdate-menu-item" data-date="${yesterday}">어제</div>
    <div class="backdate-menu-item backdate-menu-custom">
      <input type="date" class="backdate-date-input" value="${yesterday}" max="${today}">
    </div>
  `;

  menu.style.position = 'fixed';
  menu.style.zIndex = '9999';
  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  const menuWidth = menu.offsetWidth || 160;
  const leftPos = Math.min(Math.max(8, rect.left - 40), window.innerWidth - menuWidth - 8);
  menu.style.left = leftPos + 'px';
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.visibility = '';

  const handleDate = (dateStr) => {
    if (dateStr > today) { showToast('미래 날짜는 선택할 수 없습니다', 'error'); return; }
    if (menu._closeCleanup) menu._closeCleanup();
    menu.remove();
    completeSubtaskForDate(taskId, subtaskIndex, dateStr);
  };

  const dateInput = menu.querySelector('.backdate-date-input');
  dateInput.addEventListener('change', () => { if (dateInput.value) handleDate(dateInput.value); });
  dateInput.addEventListener('pointerdown', (e) => e.stopPropagation());

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.backdate-menu-item[data-date]');
    if (item) handleDate(item.dataset.date);
  });

  // 바깥 클릭 시 닫기 (이벤트 리스너 즉시 정리)
  const closeHandler = (e) => {
    if (!document.body.contains(menu) || !menu.contains(e.target)) {
      if (document.body.contains(menu)) menu.remove();
      document.removeEventListener('pointerdown', closeHandler);
      menu._closeCleanup = null;
    }
  };
  setTimeout(() => {
    if (!document.body.contains(menu)) return;
    document.addEventListener('pointerdown', closeHandler);
    menu._closeCleanup = () => document.removeEventListener('pointerdown', closeHandler);
  }, 10);
}
window.showSubtaskBackdateMenu = showSubtaskBackdateMenu;

/**
 * 특정 날짜로 서브태스크 완료 기록
 */
function completeSubtaskForDate(taskId, subtaskIndex, dateStr) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks || !task.subtasks[subtaskIndex]) return;

  const subtask = task.subtasks[subtaskIndex];
  subtask.completed = true;
  subtask.completedAt = new Date(dateStr + 'T12:00:00').toISOString();
  task.updatedAt = new Date().toISOString();

  // completionLog에 기록
  if (!appState.completionLog[dateStr]) appState.completionLog[dateStr] = [];
  appState.completionLog[dateStr].push({
    t: task.title + ' > ' + subtask.text,
    c: task.category || '기타',
    at: '12:00',
    sub: true
  });
  saveCompletionLog();
  saveState();
  renderStatic();

  const _yd = new Date(); _yd.setDate(_yd.getDate() - 1);
  const isToday = dateStr === getLocalDateStr();
  const dateLabel = isToday ? '오늘' :
    dateStr === getLocalDateStr(_yd) ? '어제' : dateStr;
  showToast(`${dateLabel} 완료: ${subtask.text}`, 'success');
}
window.completeSubtaskForDate = completeSubtaskForDate;

/**
 * 작업 완료
 * 반복 작업인 경우 다음 주기로 새 작업 생성
 */
function completeTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  // 이미 완료된 작업이면 무시 (중복 클릭 방지)
  if (task.completed) return;

  const now = new Date();
  const completedAt = now.toISOString();

  // 완료 처리
  appState.tasks = appState.tasks.map(t =>
    t.id === id ? { ...t, completed: true, completedAt: completedAt, updatedAt: completedAt } : t
  );

  // completionLog에 영구 기록 저장
  const dateKey = getLocalDateStr(now);
  const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"
  const logEntry = { t: task.title, c: task.category, at: timeStr };
  if (task.repeatType && task.repeatType !== 'none') logEntry.r = task.repeatType;
  if (task.expectedRevenue) logEntry.rv = Number(task.expectedRevenue);
  if (task.subtasks && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter(s => s.completed).length;
    if (doneCount > 0) logEntry.st = doneCount;
  }
  if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
  appState.completionLog[dateKey].push(logEntry);
  saveCompletionLog();

  // 오늘 통계 업데이트
  appState.todayStats.completedToday++;
  appState.todayStats.streak++;

  // 스트릭 기록 (per-habit 포함)
  recordActivity(task.title);

  // 반복 작업이면 다음 주기 작업 자동 생성
  // daily/weekdays는 checkDailyReset()이 자동 초기화하므로 중복 생성하지 않음
  if (task.repeatType && task.repeatType !== 'none'
      && task.repeatType !== 'daily' && task.repeatType !== 'weekdays') {
    // 동일 제목+카테고리+반복타입의 미완료 태스크가 이미 있으면 중복 생성 방지
    const isDuplicate = appState.tasks.some(t =>
      t.id !== task.id &&
      !t.completed &&
      t.title === task.title &&
      t.category === task.category &&
      t.repeatType === task.repeatType
    );
    if (!isDuplicate) {
      const nextTask = createNextRepeatTask(task);
      if (nextTask) {
        appState.tasks.push(nextTask);
      }
    }
  }

  saveState();

  // tgeventbot 연동: 연결된 이벤트 상태 업데이트
  if (task.source && task.source.type === 'telegram-event') {
    updateLinkedEventStatus(task, true);
  }

  // 태스크 아이템 DOM에 completing 애니메이션 적용
  const taskEls = document.querySelectorAll(`[id$="-${id}"], [data-task-id="${id}"]`);
  taskEls.forEach(el => {
    if (el.classList.contains('task-item') || el.closest('.task-item')) {
      const item = el.classList.contains('task-item') ? el : el.closest('.task-item');
      item.classList.add('completing');
    }
  });

  // 완료 애니메이션 표시 (DOM 애니메이션 후)
  setTimeout(() => {
    showCompletionAnimation(task.title, appState.todayStats.streak);
  }, 350);
  srAnnounce('작업 완료: ' + task.title);

  // 실행취소 토스트 표시 (3초)
  showUndoToast(id, task.title);

  // 마일스톤 체크 (ADHD 특화 - 도파민 보상)
  checkMilestone();

  if (navigator.vibrate) {
    navigator.vibrate([50, 100, 50]);
  }
}

/**
 * 작업 완료 취소
 */
function uncompleteTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  // 오늘 완료한 작업인지 확인
  const wasCompletedToday = task.completedAt &&
    new Date(task.completedAt).toDateString() === new Date().toDateString();

  // completionLog에서 해당 기록 제거
  if (task.completedAt) {
    const logDate = getLocalDateStr(new Date(task.completedAt));
    const logTime = new Date(task.completedAt).toTimeString().slice(0, 5);
    if (appState.completionLog[logDate]) {
      const idx = appState.completionLog[logDate].findIndex(
        e => e.t === task.title && e.at === logTime
      );
      if (idx !== -1) {
        // Soft-Delete: 동기화 부활 방지
        const delKey = logDate + '|' + task.title + '|' + logTime;
        if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
        appState.deletedIds.completionLog[delKey] = new Date().toISOString();

        appState.completionLog[logDate].splice(idx, 1);
        // 해당 날짜에 기록이 0개면 키 삭제
        if (appState.completionLog[logDate].length === 0) {
          delete appState.completionLog[logDate];
        }
        saveCompletionLog();
      }
    }
  }

  appState.tasks = appState.tasks.map(t =>
    t.id === id ? { ...t, completed: false, completedAt: null, updatedAt: new Date().toISOString() } : t
  );

  // 오늘 완료한 작업이었다면 통계 감소
  if (wasCompletedToday) {
    appState.todayStats.completedToday = Math.max(0, appState.todayStats.completedToday - 1);
    appState.todayStats.streak = Math.max(0, appState.todayStats.streak - 1);
  }

  // 반복 작업이었다면 자동 생성된 다음 회차 작업 제거
  if (task.repeatType && task.repeatType !== 'none') {
    // spawnedFromTaskId로 정확한 자식 태스크 검색 (시간 무관)
    const spawnedTask = appState.tasks.find(t =>
      t.spawnedFromTaskId === id && !t.completed
    );
    if (spawnedTask) {
      appState.tasks = appState.tasks.filter(t => t.id !== spawnedTask.id);
    }
  }

  saveState();

  // tgeventbot 연동: 연결된 이벤트 상태 업데이트
  if (task.source && task.source.type === 'telegram-event') {
    updateLinkedEventStatus(task, false);
  }

  renderStatic();
  showToast('완료 취소', 'success');
}
window.uncompleteTask = uncompleteTask;
