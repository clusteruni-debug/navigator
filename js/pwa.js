// ============================================
// PWA 및 알림 기능
// ============================================

let deferredPrompt = null; // PWA 설치 프롬프트 저장

/**
 * Service Worker 등록
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('Service Worker 등록 성공:', registration.scope);
      // SW 업데이트 감지 시 알림
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              showToast('앱이 업데이트되었습니다. 새로고침하면 반영됩니다.', 'success');
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker 등록 실패:', error);
    }
  }
}

/**
 * 알림 권한 요청
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('이 브라우저는 알림을 지원하지 않습니다', 'error');
    return;
  }

  // 버튼 로딩 상태 표시
  const btn = document.querySelector('.notification-btn:not(:disabled)');
  if (btn) {
    btn.textContent = '...';
    btn.disabled = true;
  }

  try {
    const permission = await Notification.requestPermission();
    appState.notificationPermission = permission;

    if (permission === 'granted') {
      showToast('알림이 활성화되었습니다!', 'success');
      // 테스트 알림
      setTimeout(() => {
        showNotification('Navigator 알림 활성화', '마감 임박 시 알림을 받을 수 있습니다');
      }, 500);
    } else if (permission === 'denied') {
      showToast('알림이 차단되었습니다. 브라우저 설정에서 허용해주세요', 'error');
    } else {
      showToast('알림 권한 요청이 취소되었습니다', 'warning');
    }
  } catch (error) {
    console.error('알림 권한 요청 실패:', error);
    showToast('알림 권한 요청 중 오류가 발생했습니다', 'error');
  } finally {
    // 항상 UI 갱신
    renderStatic();
  }
}

/**
 * 알림 표시
 */
function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    const options = {
      body: body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23667eea" width="100" height="100" rx="20"/><text x="50" y="68" font-size="50" text-anchor="middle" fill="white">⚡</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f5576c" width="100" height="100" rx="50"/></svg>',
      vibrate: [100, 50, 100],
      tag: 'navigator-reminder',
      renotify: true
    };

    new Notification(title, options);
  }
}

/**
 * 마감 임박 작업 확인 및 알림 (5분마다 실행)
 */
function checkDeadlinesAndNotify() {
  if (Notification.permission !== 'granted') return;

  const now = new Date();
  const notifiedKey = 'navigator-notified-tasks';
  let notifiedTasks = [];

  try {
    notifiedTasks = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
  } catch (e) {
    notifiedTasks = [];
  }

  // 작업 마감 알림
  appState.tasks.forEach(task => {
    if (task.completed || !task.deadline) return;

    const deadline = new Date(task.deadline);
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);
    const daysLeft = hoursLeft / 24;
    const taskNotifyKey = `${task.id}`;

    // D-1 알림 (마감 하루 전, 오전에 한 번)
    if (daysLeft > 0.5 && daysLeft <= 1.5 && !notifiedTasks.includes(taskNotifyKey + '-d1')) {
      const currentHour = now.getHours();
      if (currentHour >= 8 && currentHour < 12) {  // 오전 8시~12시 사이
        showNotification(
          '📅 내일이 마감일!',
          `"${task.title}" - D-1`
        );
        notifiedTasks.push(taskNotifyKey + '-d1');
      }
    }

    // D-Day 알림 (마감 당일, 오전에 한 번)
    if (daysLeft > 0 && daysLeft <= 0.5 && !notifiedTasks.includes(taskNotifyKey + '-dday')) {
      const currentHour = now.getHours();
      if (currentHour >= 8 && currentHour < 12) {  // 오전 8시~12시 사이
        showNotification(
          '🔥 오늘이 마감일!',
          `"${task.title}" - D-Day`
        );
        notifiedTasks.push(taskNotifyKey + '-dday');
      }
    }

    // 3시간 전 알림 (한 번만)
    if (hoursLeft > 0 && hoursLeft <= 3 && !notifiedTasks.includes(taskNotifyKey + '-3h')) {
      showNotification(
        '🚨 마감 3시간 전!',
        `"${task.title}" 마감이 임박했습니다`
      );
      notifiedTasks.push(taskNotifyKey + '-3h');
    }

    // 1시간 전 알림 (한 번만)
    if (hoursLeft > 0 && hoursLeft <= 1 && !notifiedTasks.includes(taskNotifyKey + '-1h')) {
      showNotification(
        '⚠️ 마감 1시간 전!',
        `"${task.title}" 지금 바로 시작하세요`
      );
      notifiedTasks.push(taskNotifyKey + '-1h');
    }
  });

  // 취침 알림 체크
  if (appState.settings.bedtimeReminder) {
    checkBedtimeReminder(now, notifiedTasks);
  }

  // 24시간 이상 된 알림 기록은 삭제
  const recentNotified = notifiedTasks.slice(-100);
  localStorage.setItem(notifiedKey, JSON.stringify(recentNotified));
}

/**
 * 취침 알림 체크
 */
function checkBedtimeReminder(now, notifiedTasks) {
  const bedtimeStr = appState.settings.targetBedtime;
  const [bedHour, bedMinute] = bedtimeStr.split(':').map(Number);
  const reminderMinutes = appState.settings.bedtimeReminderMinutes || 30;

  // 오늘 취침 시간
  const bedtime = new Date(now);
  bedtime.setHours(bedHour, bedMinute, 0, 0);

  // 만약 현재 시간이 취침 시간 이후면, 이미 지난 것이므로 무시
  if (now > bedtime) return;

  const minutesUntilBed = (bedtime - now) / (1000 * 60);
  const todayKey = `bedtime-${now.toDateString()}`;

  // 설정된 시간 전 알림 (한 번만)
  if (minutesUntilBed > 0 && minutesUntilBed <= reminderMinutes && !notifiedTasks.includes(todayKey)) {
    const incompleteTasks = appState.tasks.filter(t => !t.completed).length;
    let message = '';

    if (incompleteTasks > 0) {
      message = `아직 ${incompleteTasks}개 작업이 남았어요. 마무리하고 잠자리에 들어요!`;
    } else {
      message = '오늘 목표를 다 달성했어요! 푹 쉬세요 😴';
    }

    showNotification(
      `🌙 취침 ${reminderMinutes}분 전!`,
      message
    );
    notifiedTasks.push(todayKey);
  }
}

/**
 * PWA 설치 프롬프트 처리
 */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // 설치 배너 표시
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('show');
});

/**
 * PWA 설치
 */
async function installPWA() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    showToast('앱이 설치되었습니다!', 'success');
  }

  deferredPrompt = null;
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('show');
}

/**
 * 설치 배너 닫기
 */
function closeInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('show');
  deferredPrompt = null;
}

window.requestNotificationPermission = requestNotificationPermission;
window.installPWA = installPWA;
window.closeInstallBanner = closeInstallBanner;

// ============================================
// 키보드 단축키
// ============================================

let showShortcutsHelp = false;

/**
 * 단축키 도움말 토글
 */
function toggleShortcutsHelp() {
  showShortcutsHelp = !showShortcutsHelp;
  const helpEl = document.getElementById('shortcuts-help');
  if (helpEl) {
    helpEl.classList.toggle('show', showShortcutsHelp);
  }
}

/**
 * 모달 포커스 트랩 - Tab 키가 모달 내부에서만 순환
 */
function trapFocusInModal(modal, e) {
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

/**
 * 키보드 이벤트 핸들러
 */
document.addEventListener('keydown', (e) => {
  // Tab 키: 모달 포커스 트랩 — 모든 모달 타입 커버
  if (e.key === 'Tab') {
    const activeModal = document.querySelector('.modal-overlay') || document.querySelector('.work-modal.show') || document.querySelector('.work-modal-overlay') || document.querySelector('.time-input-modal.show');
    if (activeModal) { trapFocusInModal(activeModal, e); return; }
  }

  // Escape 키: 모달/드롭다운 닫기 (어디서든 동작)
  if (e.key === 'Escape') {
    if (showShortcutsHelp) { toggleShortcutsHelp(); return; }
    if (appState.showSettings) { closeSettings(); renderStatic(); return; }
    if (appState.showOnboarding) { appState.showOnboarding = false; renderStatic(); return; }
    if (appState.showDetailedAdd) { appState.showDetailedAdd = false; appState.editingTaskId = null; renderStatic(); return; }
    // 알림 드롭다운 닫기
    const notifDropdown = document.getElementById('notification-dropdown');
    if (notifDropdown && notifDropdown.classList.contains('show')) { notifDropdown.classList.remove('show'); return; }
    // 리듬 액션 메뉴 ESC 닫기
    const rhythmMenu = document.getElementById('rhythm-action-menu');
    if (rhythmMenu) { hideRhythmActionMenu(); return; }
    // 통근 루트 모달 ESC 닫기
    const commuteModal = document.querySelector('.commute-modal-overlay');
    if (commuteModal) { closeCommuteRouteModal(); return; }
    // 동적 모달 ESC 닫기 — brain dump은 데이터 손실 확인 포함
    const brainDump = document.getElementById('brain-dump-modal');
    if (brainDump) {
      const ta = document.getElementById('brain-dump-input');
      if (ta && ta.value.trim() && !confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?')) return;
      brainDump.remove(); return;
    }
    const timeModal = document.getElementById('time-input-modal');
    if (timeModal && timeModal.classList.contains('show')) { closeTimeInputModal(); return; }
    const workModal = document.getElementById('work-input-modal');
    if (workModal && workModal.classList.contains('show')) { closeWorkModal(); return; }
    const quickEdit = document.getElementById('quick-edit-modal');
    if (quickEdit && quickEdit.classList.contains('show')) { closeQuickEditModal(); return; }
    const importModal = document.getElementById('import-confirm-modal');
    if (importModal) { importModal.remove(); return; }
    const editCompleted = document.getElementById('edit-completed-modal');
    if (editCompleted) { editCompleted.remove(); return; }
    const editLog = document.getElementById('edit-log-modal');
    if (editLog) { editLog.remove(); return; }
    const telegramModal = document.getElementById('telegram-events-modal');
    if (telegramModal) { telegramModal.remove(); return; }
    const weeklyReview = document.getElementById('weekly-review-modal');
    if (weeklyReview && weeklyReview.style.display !== 'none') { closeWeeklyReview(); return; }
    // 입력 필드에서 blur
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') { e.target.blur(); }
    return;
  }

  // 입력 필드에서는 단축키 비활성화
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  // Ctrl/Cmd + 키 조합
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'n': // 새 작업 추가
        e.preventDefault();
        const quickInput = document.getElementById('quick-add-input');
        if (quickInput) {
          quickInput.focus();
        }
        break;
      case 'f': // 검색
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
        }
        break;
      case 'd': // Next Action 완료
        e.preventDefault();
        const filteredTasks = getFilteredTasks();
        if (filteredTasks.length > 0) {
          completeTask(filteredTasks[0].id);
        }
        break;
      case '/': // 단축키 도움말
        e.preventDefault();
        toggleShortcutsHelp();
        break;
    }
    return;
  }

  // 단일 키
  switch (e.key.toLowerCase()) {
    case 'n': // 새 작업 추가 (Ctrl 없이도 동작)
      const quickInputN = document.getElementById('quick-add-input');
      if (quickInputN) {
        e.preventDefault();
        quickInputN.focus();
      }
      break;
    case '1':
      switchTab('action');
      break;
    case '2':
      switchTab('work');
      break;
    case '3':
      switchTab('events');
      break;
    case '4':
      switchTab('dashboard');
      break;
    case '5':
      switchTab('all');
      break;
    case '6':
      switchTab('history');
      break;
    case '7':
      switchTab('commute');
      break;
    case 's':
      toggleShuttle();
      break;
    case '?':
      toggleShortcutsHelp();
      break;
    case 'escape':
      if (showShortcutsHelp) {
        toggleShortcutsHelp();
      }
      if (appState.showDetailedAdd) {
        cancelEdit();
      }
      break;
  }
});

window.toggleShortcutsHelp = toggleShortcutsHelp;

/**
 * 더보기 메뉴 토글
 */
function toggleMoreMenu(e) {
  if (e) e.stopPropagation();
  appState.moreMenuOpen = !appState.moreMenuOpen;
  const menu = document.getElementById('more-menu');
  if (menu) {
    menu.classList.toggle('show', appState.moreMenuOpen);
  }
}

// 외부 클릭 시 더보기 메뉴 닫기
document.addEventListener('click', (e) => {
  const dropdown = document.querySelector('.tab-more-dropdown');
  const menu = document.getElementById('more-menu');
  if (appState.moreMenuOpen && dropdown && !dropdown.contains(e.target)) {
    appState.moreMenuOpen = false;
    if (menu) menu.classList.remove('show');
  }
});

window.toggleMoreMenu = toggleMoreMenu;

// 마감 알림 드롭다운 토글
function toggleNotificationDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}
window.toggleNotificationDropdown = toggleNotificationDropdown;

// 외부 클릭 시 알림 드롭다운 닫기
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.notification-dropdown-wrapper');
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown && dropdown.classList.contains('show') && wrapper && !wrapper.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

