// ============================================
// ADHD 특화 기능 (타이머, 동기부여, 성취)
// (actions-complete.js에서 분리)
// ============================================

let quickTimerInterval = null;
let _cachedQuickTimerEl = null;

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
  if (!_cachedQuickTimerEl || !_cachedQuickTimerEl.isConnected) {
    _cachedQuickTimerEl = document.getElementById('quick-timer-display');
  }
  if (_cachedQuickTimerEl) {
    const mins = Math.floor(appState.quickTimer.timeLeft / 60);
    const secs = appState.quickTimer.timeLeft % 60;
    _cachedQuickTimerEl.textContent = mins + ':' + String(secs).padStart(2, '0');
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
