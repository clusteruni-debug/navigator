// ============================================
// 온보딩 상태 로직 + 스트릭 (렌더링은 render-settings.js)
// ============================================

/**
 * 온보딩 모달 표시
 */
function showOnboarding() {
  appState.showOnboarding = true;
  renderStatic();
}

/**
 * 온보딩 완료 및 샘플 데이터 추가
 */
function completeOnboarding(addSamples = true) {
  localStorage.setItem('navigator-visited', 'true');
  appState.showOnboarding = false;

  if (addSamples) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sampleTasks = [
      {
        id: generateId(),
        title: '👋 Navigator 사용법 익히기',
        category: '일상',
        estimatedTime: 5,
        tags: ['긴급'],
        subtasks: [
          { text: '작업 추가해보기', completed: false },
          { text: '완료 체크해보기', completed: false },
          { text: '태그 사용해보기', completed: false }
        ],
        completed: false,
        createdAt: now.toISOString()
      },
      {
        id: generateId(),
        title: '오늘 할 일 정리하기',
        category: '일상',
        estimatedTime: 10,
        deadline: getLocalDateTimeStr(tomorrow),
        tags: [],
        subtasks: [],
        completed: false,
        createdAt: now.toISOString()
      },
      {
        id: generateId(),
        title: '주간 목표 세우기',
        category: '본업',
        estimatedTime: 15,
        deadline: getLocalDateTimeStr(nextWeek),
        tags: ['회의'],
        subtasks: [],
        completed: false,
        createdAt: now.toISOString()
      }
    ];

    appState.tasks = sampleTasks;
    saveState();
    showToast('🎉 샘플 작업이 추가되었습니다!', 'success');
  }

  renderStatic();
}

/**
 * 스트릭 업데이트
 */
function updateStreak() {
  // YYYY-MM-DD 포맷으로 비교 (toDateString은 연도 넘어갈 때 문자열 비교 실패)
  const today = getLocalDateStr(new Date());
  const lastActive = appState.streak.lastActiveDate;

  if (!lastActive) {
    // 첫 사용
    return;
  }

  const lastDate = new Date(lastActive);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (getLocalDateStr(lastDate) === getLocalDateStr(yesterday)) {
    // 어제 활동함 → 스트릭 유지
  } else if (getLocalDateStr(lastDate) !== today) {
    // 어제 활동 안 함 → 스트릭 리셋
    appState.streak.current = 0;
  }
}

/**
 * 오늘 활동 기록 (작업 완료 시 호출)
 * @param {string} [taskTitle] - 완료된 작업 제목 (per-habit 스트릭용)
 */
function recordActivity(taskTitle) {
  const today = getLocalDateStr(new Date());

  // 전역 스트릭
  if (appState.streak.lastActiveDate !== today) {
    appState.streak.current++;
    appState.streak.lastActiveDate = today;

    if (appState.streak.current > appState.streak.best) {
      appState.streak.best = appState.streak.current;
    }

    if (!appState.user) {
      localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
    }

    if (appState.streak.current > 1) {
      showToast(`🔥 ${appState.streak.current}일 연속 달성!`, 'success');
    }
  }

  // per-habit 스트릭
  if (taskTitle) {
    if (!appState.habitStreaks) appState.habitStreaks = {};
    const hs = appState.habitStreaks[taskTitle] || { current: 0, best: 0, lastActiveDate: null };

    if (hs.lastActiveDate !== today) {
      // 연속 확인: 어제 활동했으면 이어가기, 아니면 리셋
      if (hs.lastActiveDate) {
        const lastDate = new Date(hs.lastActiveDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (getLocalDateStr(lastDate) !== getLocalDateStr(yesterday) && hs.lastActiveDate !== today) {
          hs.current = 0; // 리셋
        }
      }
      hs.current++;
      hs.lastActiveDate = today;
      if (hs.current > hs.best) hs.best = hs.current;
      appState.habitStreaks[taskTitle] = hs;

      if (!appState.user) {
        localStorage.setItem('navigator-habitStreaks', JSON.stringify(appState.habitStreaks));
      }
    }
  }
}

// ============================================
// 스와이프 제스처
// ============================================

function handleTouchStart(e, taskId) {
  appState.touchStart = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
    taskId: taskId
  };
  appState.touchingTaskId = taskId;
}

function handleTouchMove(e, taskId) {
  if (!appState.touchStart || appState.touchStart.taskId !== taskId) return;

  const deltaX = e.touches[0].clientX - appState.touchStart.x;
  const deltaY = e.touches[0].clientY - appState.touchStart.y;
  const taskEl = document.getElementById(`task-${taskId}`);

  // 수평 스와이프가 수직보다 클 때만 스와이프로 인식
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
    e.preventDefault(); // 스크롤 방지

    if (deltaX < -30) {
      taskEl.classList.add('swiping-left');
      taskEl.classList.remove('swiping-right');
    } else if (deltaX > 30) {
      taskEl.classList.add('swiping-right');
      taskEl.classList.remove('swiping-left');
    }
  }
}

function handleTouchEnd(e, taskId) {
  if (!appState.touchStart || appState.touchStart.taskId !== taskId) return;
  if (!e.changedTouches || !e.changedTouches[0]) { appState.touchStart = null; return; }

  const deltaX = e.changedTouches[0].clientX - appState.touchStart.x;
  const taskEl = document.getElementById(`task-${taskId}`);

  if (deltaX < -100) {
    completeTask(taskId);
    if (navigator.vibrate) navigator.vibrate(50);
  } else if (deltaX > 100) {
    deleteTask(taskId);
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
  }

  if (taskEl) {
    taskEl.classList.remove('swiping-left', 'swiping-right');
  }
  appState.touchStart = null;
  appState.touchingTaskId = null;
}
