// ============================================
// 퀵 필터 & 추가 기능
// ============================================

/**
 * 퀵 필터 설정
 */
function setQuickFilter(filter) {
  appState.quickFilter = appState.quickFilter === filter ? null : filter;
  renderStatic();
}

/**
 * 퀵 필터 적용된 작업 수 계산
 */
function getQuickFilterCount(filter) {
  const pending = appState.tasks.filter(t => !t.completed);
  switch (filter) {
    case '2min':
      return pending.filter(t => t.estimatedTime && t.estimatedTime <= 2).length;
    case '5min':
      return pending.filter(t => t.estimatedTime && t.estimatedTime <= 5).length;
    case 'urgent':
      return pending.filter(t => {
        if (!t.deadline) return false;
        const hoursLeft = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60);
        return hoursLeft <= 24 && hoursLeft > 0;
      }).length;
    default:
      return 0;
  }
}

/**
 * 작업 내일로 미루기
 */
function postponeTask(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) return;

  // 미루기 횟수 증가
  task.postponeCount = (task.postponeCount || 0) + 1;
  task.lastPostponed = new Date().toISOString();

  // 마감이 있으면 하루 연장
  if (task.deadline) {
    const deadline = new Date(task.deadline);
    deadline.setDate(deadline.getDate() + 1);
    task.deadline = getLocalDateTimeStr(deadline);
  }

  saveState();

  if (task.postponeCount >= 3) {
    showToast(`⚠️ 이 작업을 ${task.postponeCount}번 미뤘어요. 오늘 해치워버리는 건 어때요?`, 'warning');
  } else {
    showToast('내일로 미뤘어요. 오늘은 쉬어도 돼요! 😌', 'success');
  }

  renderStatic();
}

/**
 * 실제 소요시간 입력 모달 표시
 */
function showTimeInputModal(taskId) {
  // 이미 모달이 열려있으면 기존 것 닫고 새로 열기
  if (appState.pendingTimeInput) closeTimeInputModal();
  appState.pendingTimeInput = taskId;
  renderStatic();

  // 모달 표시
  setTimeout(() => {
    const modal = document.getElementById('time-input-modal');
    if (modal) modal.classList.add('show');
  }, 50);
}

/**
 * 실제 소요시간 저장
 */
function saveActualTime(minutes) {
  const taskId = appState.pendingTimeInput;
  if (!taskId) return;

  const parsed = parseInt(minutes);
  if (isNaN(parsed) || parsed <= 0) {
    showToast('유효한 시간을 입력해주세요', 'error');
    closeTimeInputModal();
    return;
  }

  const task = appState.tasks.find(t => t.id === taskId);
  if (task) {
    task.actualTime = parsed;
    saveState();
  }

  closeTimeInputModal();
  renderStatic();
}

/**
 * 실제 소요시간 입력 모달 닫기
 */
function closeTimeInputModal() {
  const modal = document.getElementById('time-input-modal');
  if (modal) modal.classList.remove('show');
  appState.pendingTimeInput = null;
}

/**
 * 시간 예측 정확도 계산
 */
function getTimeAccuracy() {
  const tasksWithBoth = appState.tasks.filter(t =>
    t.completed && t.estimatedTime && t.actualTime
  );

  if (tasksWithBoth.length < 3) return null;

  const totalEstimated = tasksWithBoth.reduce((sum, t) => sum + t.estimatedTime, 0);
  const totalActual = tasksWithBoth.reduce((sum, t) => sum + t.actualTime, 0);
  const ratio = totalActual / totalEstimated;

  return {
    ratio: ratio.toFixed(2),
    message: ratio > 1.2 ? '예상보다 시간이 더 걸려요' :
             ratio < 0.8 ? '예상보다 빨리 끝내요!' :
             '시간 예측이 정확해요!',
    count: tasksWithBoth.length
  };
}

/**
 * 오늘의 명언 가져오기
 */
function getDailyQuote() {
  const quotes = [
    { text: "완벽하게 하려고 하지 마세요. 그냥 시작하세요.", author: "ADHD 생존 가이드" },
    { text: "5분만 해보자. 5분 후에 그만둬도 돼.", author: "포모도로 철학" },
    { text: "큰 일도 작은 조각으로 나누면 할 수 있어요.", author: "작업 분해의 힘" },
    { text: "지금 안 하면 내일의 내가 힘들어해요.", author: "미래의 나에게" },
    { text: "실수해도 괜찮아요. 다시 시작하면 돼요.", author: "성장 마인드셋" },
    { text: "오늘 할 일을 내일로 미루면, 내일은 두 배가 돼요.", author: "벤자민 프랭클린" },
    { text: "시작이 반이다. 나머지 반은 그냥 계속하는 것.", author: "동기부여 101" },
    { text: "완료된 50%가 완벽한 0%보다 낫다.", author: "실용주의" },
    { text: "휴식도 생산성의 일부예요. 쉴 때 쉬세요.", author: "번아웃 예방" },
    { text: "작은 승리를 축하하세요. 그게 큰 승리가 됩니다.", author: "도파민 관리법" },
    { text: "지금 이 순간에 집중하세요. 과거와 미래는 잠시 내려놓고.", author: "마음챙김" },
    { text: "어제보다 1%만 나아지면 1년 후엔 37배가 돼요.", author: "복리의 힘" },
    { text: "못하는 게 아니라, 아직 안 한 것뿐이에요.", author: "성장 마인드셋" },
    { text: "에너지가 낮을 때는 쉬운 것부터. 높을 때 어려운 것.", author: "에너지 관리" }
  ];

  // 오늘 날짜 기반 고정 인덱스 (하루 동안 같은 명언)
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % quotes.length;

  return quotes[index];
}

/**
 * 랜덤 휴식 활동 추천
 */
function getRestActivity() {
  const activities = [
    { icon: '🚶', text: '5분 산책하기', desc: '햇빛과 신선한 공기!' },
    { icon: '🧘', text: '스트레칭하기', desc: '몸을 풀어주세요' },
    { icon: '☕', text: '따뜻한 음료 마시기', desc: '잠시 여유를 즐기세요' },
    { icon: '🎵', text: '좋아하는 노래 듣기', desc: '기분 전환!' },
    { icon: '👀', text: '창밖 바라보기', desc: '눈의 피로를 풀어주세요' },
    { icon: '💭', text: '5분 명상하기', desc: '마음을 비우세요' },
    { icon: '🤸', text: '간단한 운동하기', desc: '점핑잭 10개 어때요?' },
    { icon: '📱', text: '친구에게 안부 보내기', desc: '연결의 기쁨' }
  ];

  return activities[Math.floor(Math.random() * activities.length)];
}

/**
 * 검색 및 필터 적용된 작업 목록
 */
function getSearchFilteredTasks(tasks) {
  let filtered = tasks;

  // 카테고리 필터
  if (appState.categoryFilter !== 'all') {
    filtered = filtered.filter(t => t.category === appState.categoryFilter);
  }

  // 태그 필터
  if (appState.tagFilter) {
    filtered = filtered.filter(t => t.tags && t.tags.includes(appState.tagFilter));
  }

  // 검색어 필터 (제목, 태그, 서브태스크 포함)
  if (appState.searchQuery.trim()) {
    const query = appState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => {
      // 제목 검색
      if (t.title.toLowerCase().includes(query)) return true;
      // 태그 검색
      if (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query))) return true;
      // 서브태스크 검색
      if (t.subtasks && t.subtasks.some(st => st.text.toLowerCase().includes(query))) return true;
      return false;
    });
  }

  return filtered;
}

/**
 * 날짜가 주말인지 확인
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 일정 뷰용 작업 그룹화 (날짜별)
 */
function getTasksByDate() {
  const now = new Date();
  const tasks = appState.tasks.filter(t => !t.completed && t.deadline);
  const grouped = {};

  // 오늘부터 7일간의 날짜 생성
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateKey = getLocalDateStr(date);
    grouped[dateKey] = {
      date: date,
      dayName: getDayName(date),
      isToday: i === 0,
      isWeekend: isWeekend(date),
      tasks: []
    };
  }

  // 작업을 날짜별로 분류
  tasks.forEach(task => {
    const taskDate = getLocalDateStr(new Date(task.deadline));
    if (grouped[taskDate]) {
      grouped[taskDate].tasks.push(task);
    }
  });

  // 각 날짜의 작업을 시간순 정렬
  Object.values(grouped).forEach(day => {
    day.tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  });

  // 필터 적용
  let result = Object.values(grouped);

  if (appState.scheduleFilter === 'weekday') {
    result = result.filter(day => !day.isWeekend);
  } else if (appState.scheduleFilter === 'weekend') {
    result = result.filter(day => day.isWeekend);
  } else if (appState.scheduleFilter === 'today') {
    result = result.filter(day => day.isToday);
  }

  return result;
}

/**
 * 요일 이름 반환
 */
function getDayName(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[date.getDay()];
  const month = date.getMonth() + 1;
  const dateNum = date.getDate();
  return `${month}/${dateNum} (${day})`;
}

/**
 * 시간만 포맷팅
 */
function formatTime(deadline) {
  const d = new Date(deadline);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// UI 헬퍼
// ============================================

/**
 * 토스트 알림 표시
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

/**
 * 실행취소 토스트 표시 (완료 후 3초간)
 */
let undoToastTimeout = null;
let undoToastInterval = null;
function showUndoToast(taskId, taskTitle) {
  // 기존 토스트/타이머 제거
  const existingToast = document.querySelector('.toast-undo');
  if (existingToast) existingToast.remove();
  if (undoToastTimeout) clearTimeout(undoToastTimeout);
  if (undoToastInterval) clearInterval(undoToastInterval);

  const toast = document.createElement('div');
  toast.className = 'toast-undo';
  toast.innerHTML = `
    <span class="toast-undo-text">✓ "${escapeHtml(taskTitle.substring(0, 15))}${taskTitle.length > 15 ? '...' : ''}" 완료</span>
    <button class="toast-undo-btn" onclick="undoComplete('${escapeAttr(taskId)}')">↩ 실행취소</button>
    <span class="toast-undo-timer">5</span>
  `;
  document.body.appendChild(toast);

  // 카운트다운 (5초)
  let countdown = 5;
  const timerEl = toast.querySelector('.toast-undo-timer');
  undoToastInterval = setInterval(() => {
    countdown--;
    if (timerEl) timerEl.textContent = countdown;
  }, 1000);

  // 5초 후 자동 제거
  undoToastTimeout = setTimeout(() => {
    clearInterval(undoToastInterval);
    undoToastInterval = null;
    toast.remove();
  }, 5000);
}

/**
 * 실행취소 (토스트에서 호출)
 */
function undoComplete(taskId) {
  // 토스트 및 타이머 즉시 제거
  const toast = document.querySelector('.toast-undo');
  if (toast) toast.remove();
  if (undoToastTimeout) clearTimeout(undoToastTimeout);
  if (undoToastInterval) { clearInterval(undoToastInterval); undoToastInterval = null; }

  // 완료 취소 처리
  uncompleteTask(taskId);
}
window.undoComplete = undoComplete;

// ============================================
// 기타 헬퍼
// ============================================

/**
 * 백업 리마인더 체크
 */
function checkBackupReminder() {
  const lastBackup = localStorage.getItem('navigator-last-backup');
  const now = new Date();

  if (!lastBackup) {
    // 첫 사용이거나 백업 기록 없음
    return;
  }

  const daysSinceBackup = (now - new Date(lastBackup)) / (1000 * 60 * 60 * 24);

  if (daysSinceBackup >= 7) {
    setTimeout(() => {
      if (confirm('📦 마지막 백업 후 7일이 지났습니다.\n\n지금 백업하시겠습니까?')) {
        exportData();
      }
    }, 2000);
  }
}

/**
 * 포커스 모드 토글
 */
function toggleFocusMode() {
  appState.focusMode = !appState.focusMode;
  renderStatic();

  if (appState.focusMode) {
    showToast('🎯 포커스 모드: 가장 중요한 작업 1개만 표시', 'success');
  }
}

/**
 * 마감시간 포맷팅
 */
function formatDeadline(deadline) {
  const now = new Date();
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '';

  const hoursLeft = (d - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) {
    const overdue = Math.abs(hoursLeft);
    if (overdue < 1) return `${Math.round(overdue * 60)}분 지남`;
    if (overdue < 24) return `${Math.round(overdue)}시간 지남`;
    return `${Math.round(overdue / 24)}일 지남`;
  }

  if (hoursLeft < 1) {
    return `${Math.round(hoursLeft * 60)}분 후`;
  } else if (hoursLeft < 24) {
    return `${Math.round(hoursLeft)}시간 후`;
  }

  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Deadline chip HTML — urgency 색상 분리
 */
function formatDeadlineChip(deadline) {
  const text = formatDeadline(deadline);
  if (!text) return '';
  const now = new Date();
  const d = new Date(deadline);
  const hoursLeft = (d - now) / (1000 * 60 * 60);
  let cls = 'normal';
  if (hoursLeft < 3) cls = 'urgent';
  else if (hoursLeft < 24) cls = 'soon';
  return `<span class="deadline-chip ${cls}">${text}</span>`;
}
