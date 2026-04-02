// ============================================
// 작업 완료 / 반복 생성 / ADHD 특화 기능
// (actions.js에서 분리)
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

  saveState();

  // telegram-event-bot 연동
  if (task.source && task.source.type === 'telegram-event') {
    updateLinkedEventStatus(task, true);
  }

  // 태스크 아이템 DOM에 completing 애니메이션
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

  const _yd = new Date(); _yd.setDate(_yd.getDate() - 1);
  const dateLabel = isToday ? '오늘' :
    dateStr === getLocalDateStr(_yd) ? '어제' : dateStr;
  showToast(`${dateLabel} 완료: ${task.title}`, 'success');
  srAnnounce('작업 완료: ' + task.title);
  showUndoToast(id, task.title);
  if (isToday) checkMilestone();

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

  // 기존 메뉴 제거
  const existing = document.querySelector('.backdate-menu');
  if (existing) existing.remove();

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

  // 위치 계산
  menu.style.position = 'fixed';
  menu.style.left = Math.max(8, rect.left - 40) + 'px';
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.zIndex = '9999';

  document.body.appendChild(menu);

  // date input 변경 시 완료 처리
  const dateInput = menu.querySelector('.backdate-date-input');
  dateInput.addEventListener('change', () => {
    const val = dateInput.value;
    if (!val) return;
    if (val > today) { showToast('미래 날짜는 선택할 수 없습니다', 'error'); return; }
    menu.remove();
    completeTaskForDate(id, val);
  });
  // date input 클릭 시 메뉴 닫힘 방지
  dateInput.addEventListener('pointerdown', (e) => e.stopPropagation());

  // 오늘/어제 클릭 처리
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.backdate-menu-item[data-date]');
    if (!item) return;
    menu.remove();
    completeTaskForDate(id, item.dataset.date);
  });

  // 바깥 클릭 시 닫기 (detached menu 자동 정리 포함)
  const closeHandler = (e) => {
    if (!document.body.contains(menu) || !menu.contains(e.target)) {
      if (document.body.contains(menu)) menu.remove();
      document.removeEventListener('pointerdown', closeHandler);
    }
  };
  setTimeout(() => {
    if (!document.body.contains(menu)) return;
    document.addEventListener('pointerdown', closeHandler);
  }, 10);
}
window.showBackdateMenu = showBackdateMenu;

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

  // telegram-event-bot 연동: 연결된 이벤트 상태 업데이트
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
 * 완료 애니메이션 표시
 */
function showCompletionAnimation(taskTitle, streak) {
  const overlay = document.getElementById('completion-overlay');
  const titleEl = document.getElementById('completion-task-title');
  const streakEl = document.getElementById('completion-streak');

  if (overlay) {
    if (titleEl) titleEl.textContent = taskTitle;
    if (streakEl) {
      if (streak > 1) {
        streakEl.textContent = `🔥 ${streak}연속 완료!`;
        streakEl.style.display = 'block';
        streakEl.classList.add('streak-fire-animate');
      } else {
        streakEl.style.display = 'none';
      }
    }

    overlay.classList.add('show');

    // 5연속 이상이면 confetti 효과
    if (streak >= 5) {
      showConfetti();
    }

    setTimeout(() => {
      overlay.classList.remove('show');
      if (streakEl) streakEl.classList.remove('streak-fire-animate');
      renderStatic();
    }, 1500);
  } else {
    renderStatic();
  }
}

/**
 * Confetti 효과 표시
 */
function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['var(--accent-primary)', 'var(--accent-purple)', 'var(--cat-부업)', 'var(--accent-success)', 'var(--accent-warning)', 'var(--chart-pink)'];
  const shapes = ['circle', 'square', 'triangle'];

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    confetti.className = `confetti ${shape}`;
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = shape !== 'triangle' ? color : 'transparent';
    confetti.style.color = color;
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.animationDuration = (Math.random() * 1 + 2) + 's';

    container.appendChild(confetti);
  }

  setTimeout(() => {
    container.remove();
  }, 4000);
}

/**
 * 성취 뱃지 팝업 표시
 */
function showAchievement(icon, title, description) {
  const popup = document.createElement('div');
  popup.className = 'achievement-popup';
  popup.innerHTML = `
    <div class="achievement-icon">${escapeHtml(icon)}</div>
    <div class="achievement-title">${escapeHtml(title)}</div>
    <div class="achievement-desc">${escapeHtml(description)}</div>
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.animation = 'achievement-pop 0.3s ease-in reverse forwards';
    setTimeout(() => popup.remove(), 300);
  }, 2500);
}

// ============================================
// ADHD 특화 기능
// ============================================

let quickTimerInterval = null;

/**
 * 5분 퀵타이머 시작
 */
function startQuickTimer(taskId = null) {
  if (appState.quickTimer.isRunning) {
    stopQuickTimer();
    return;
  }

  appState.quickTimer = {
    isRunning: true,
    timeLeft: 5 * 60,
    taskId: taskId
  };

  showMotivation('시작이 반이에요! 5분만 집중해봐요 💪');

  quickTimerInterval = setInterval(() => {
    appState.quickTimer.timeLeft--;

    if (appState.quickTimer.timeLeft <= 0) {
      stopQuickTimer();
      showMotivation('5분 완료! 계속할 수 있어요! 🎉');
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    renderQuickTimerDisplay();
  }, 1000);

  renderStatic();

  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
}
window.startQuickTimer = startQuickTimer;

/**
 * 퀵타이머 중지
 */
function stopQuickTimer() {
  if (quickTimerInterval) {
    clearInterval(quickTimerInterval);
    quickTimerInterval = null;
  }
  appState.quickTimer.isRunning = false;
  appState.quickTimer.timeLeft = 5 * 60;
  renderStatic();
}
window.stopQuickTimer = stopQuickTimer;

/**
 * 퀵타이머 디스플레이 업데이트
 */
function renderQuickTimerDisplay() {
  const display = document.getElementById('quick-timer-display');
  if (display) {
    const mins = Math.floor(appState.quickTimer.timeLeft / 60);
    const secs = appState.quickTimer.timeLeft % 60;
    display.textContent = mins + ':' + String(secs).padStart(2, '0');
  }
}

/**
 * 동기부여 메시지 표시
 */
function showMotivation(message) {
  appState.lastMotivation = message;

  // 기존 토스트 제거
  const existing = document.querySelector('.motivation-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'motivation-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
window.showMotivation = showMotivation;

/**
 * 축하 효과 (콘페티)
 */
function showCelebration(emoji = '🎉') {
  appState.showCelebration = true;

  // 축하 텍스트
  const textEl = document.createElement('div');
  textEl.className = 'celebration-text';
  textEl.textContent = emoji;
  document.body.appendChild(textEl);

  // 콘페티 효과
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  const colors = ['var(--accent-primary)', 'var(--cat-부업)', 'var(--chart-teal)', 'var(--accent-celebration)', 'var(--accent-danger)', 'var(--accent-success)'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-10px';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    overlay.appendChild(confetti);
  }

  document.body.appendChild(overlay);

  setTimeout(() => {
    textEl.remove();
    overlay.remove();
    appState.showCelebration = false;
  }, 3000);
}
window.showCelebration = showCelebration;

/**
 * 마일스톤 체크 및 축하
 */
function checkMilestone() {
  const completed = appState.todayStats.completedToday;
  const dailyGoal = appState.settings.dailyGoal || 5;
  const streak = appState.todayStats.streak;

  // 일일 목표 달성
  if (completed === dailyGoal) {
    showCelebration('🎯');
    showAchievement('🏆', '일일 목표 달성!', `오늘 ${dailyGoal}개 작업을 완료했어요!`);
    showConfetti();
    return;
  }

  // 스트릭 마일스톤
  if (streak === 10) {
    showAchievement('🔥', '10연속 완료!', '멈출 수 없는 집중력!');
    showConfetti();
    return;
  }

  // 특정 개수 달성
  if (completed === 3) {
    showMotivation('좋아요! 3개 완료! 그 조자에요! 🔥');
  } else if (completed === 5) {
    showCelebration('⭐');
    showAchievement('⭐', '5개 돌파!', '반도 지나왔어요!');
  } else if (completed === 10) {
    showCelebration('🌟');
    showAchievement('🌟', '10개 달성!', '오늘 진짜 열일했네요!');
    showConfetti();
  } else if (completed === 20) {
    showAchievement('👑', '20개 마스터!', '당신은 오늘의 영웅입니다!');
    showConfetti();
  } else if (completed > 0 && completed % 5 === 0) {
    showMotivation(completed + '개 완료! 계속 가보자! 🚀');
  }
}

/**
 * 랜덤 동기부여 메시지
 */
function getRandomMotivation() {
  const messages = [
    '지금 시작하면 5분 뒤엔 끝나있어요!',
    '완벽하지 않아도 괜찮아요, 시작만 하면 돼요!',
    '작은 한 걸음이 큰 변화를 만들어요',
    '할 수 있어요! 일단 시작해봐요 💪',
    '오늘 할 일은 오늘! 미루면 내일의 내가 힘들어요',
    '5분만 집중! 그게 시작이에요',
    '지금이 가장 좋은 타이밍이에요!'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * 반복 유형 라벨 반환
 */
function getRepeatLabel(repeatType, task = null) {
  const labels = {
    'daily': '매일',
    'weekdays': '평일',
    'weekends': '주말',
    'weekly': '매주',
    'monthly': '매월'
  };

  if (repeatType === 'custom' && task && task.repeatDays && task.repeatDays.length > 0) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const selectedDays = task.repeatDays.map(d => dayNames[d]).join(',');
    return `매주 ${selectedDays}`;
  }

  if (repeatType === 'monthly' && task && task.repeatMonthDay) {
    return `매월 ${task.repeatMonthDay}일`;
  }

  if (repeatType === 'interval' && task && task.repeatInterval) {
    return `${task.repeatInterval}일마다`;
  }

  return labels[repeatType] || '';
}

/**
 * 다음 반복 작업 생성
 * 반복 작업은 항상 다음 날짜를 기준으로 생성됨 (오늘 목록에 즉시 나타나지 않음)
 */
function createNextRepeatTask(task) {
  const now = new Date();
  let nextDeadline = null;

  // 마감일이 있으면 그 기준으로, 없으면 오늘 기준으로 다음 날짜 계산
  const baseDate = task.deadline ? new Date(task.deadline) : new Date();
  nextDeadline = new Date(baseDate);

  switch (task.repeatType) {
    case 'daily':
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      break;
    case 'weekdays':
      // 평일만: 금요일이면 월요일로, 아니면 다음 날
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      while (nextDeadline.getDay() === 0 || nextDeadline.getDay() === 6) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'weekends':
      // 주말만: 토요일이면 일요일로, 일요일이면 토요일로
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      while (nextDeadline.getDay() !== 0 && nextDeadline.getDay() !== 6) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'weekly':
      nextDeadline.setDate(nextDeadline.getDate() + 7);
      break;
    case 'monthly':
      nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      break;
    case 'custom':
      // 특정 요일 반복: 다음 해당 요일 찾기
      if (task.repeatDays && task.repeatDays.length > 0) {
        let found = false;
        for (let i = 1; i <= 7 && !found; i++) {
          nextDeadline.setDate(nextDeadline.getDate() + 1);
          if (task.repeatDays.includes(nextDeadline.getDay())) {
            found = true;
          }
        }
      } else {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'interval':
      nextDeadline.setDate(nextDeadline.getDate() + (task.repeatInterval || 2));
      break;
    default:
      nextDeadline.setDate(nextDeadline.getDate() + 1);
  }

  // 시간은 원래 작업과 동일하게 (없으면 자정)
  if (task.deadline) {
    const originalTime = new Date(task.deadline);
    nextDeadline.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
  } else {
    nextDeadline.setHours(23, 59, 0, 0); // 마감일 없던 작업은 하루 끝으로
  }

  return {
    id: generateId(),
    title: task.title,
    category: task.category,
    deadline: getLocalDateTimeStr(nextDeadline),
    estimatedTime: task.estimatedTime,
    link: task.link,
    expectedRevenue: task.expectedRevenue,
    repeatType: task.repeatType,
    repeatDays: task.repeatDays,
    repeatMonthDay: task.repeatMonthDay,
    repeatInterval: task.repeatInterval,
    subtasks: (task.subtasks || []).map(st => ({ text: st.text, completed: false })),
    tags: task.tags || [],
    completed: false,
    spawnedFromTaskId: task.id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
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

  // telegram-event-bot 연동: 연결된 이벤트 상태 업데이트
  if (task.source && task.source.type === 'telegram-event') {
    updateLinkedEventStatus(task, false);
  }

  renderStatic();
  showToast('완료 취소', 'success');
}
