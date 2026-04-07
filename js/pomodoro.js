// ============================================
// 포모도로 타이머
// ============================================

let pomodoroInterval = null;
let _cachedPomodoroTimeEl = null;

/**
 * 포모도로 일시정지
 */
function pausePomodoro() {
  appState.pomodoro.isRunning = false;
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
  renderStatic();
}

/**
 * 포모도로 재개
 */
function resumePomodoro() {
  appState.pomodoro.isRunning = true;
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval = setInterval(pomodoroTick, 1000);
  renderStatic();
}

/**
 * 포모도로 중지
 */
function stopPomodoro() {
  const pomo = appState.pomodoro;
  pomo.isRunning = false;
  pomo.isBreak = false;
  pomo.timeLeft = pomo.workDuration;
  pomo.currentTaskId = null;

  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }

  renderStatic();
  showToast('포모도로 중지됨', 'error');
}

/**
 * 포모도로 틱 (1초마다 실행)
 */
function pomodoroTick() {
  const pomo = appState.pomodoro;

  if (pomo.timeLeft > 0) {
    pomo.timeLeft--;
    updatePomodoroDisplay();
  } else {
    // 시간 종료
    if (pomo.isBreak) {
      // 휴식 종료 → 작업 시작
      pomo.isBreak = false;
      pomo.timeLeft = pomo.workDuration;
      showNotification('휴식 끝!', '다시 집중할 시간입니다');
      showToast('휴식 끝! 다시 집중하세요', 'success');
    } else {
      // 작업 종료 → 휴식 시작
      pomo.completedPomodoros++;
      pomo.isBreak = true;
      pomo.timeLeft = pomo.breakDuration;

      // 연결된 태스크에 25분 집중 시간 자동 기록
      if (pomo.currentTaskId) {
        const linkedTask = appState.tasks.find(t => t.id === pomo.currentTaskId);
        if (linkedTask) {
          const prevTime = parseInt(linkedTask.actualTime) || 0;
          linkedTask.actualTime = prevTime + 25;
          saveState();
          showNotification('포모도로 완료!', `${escapeHtml(linkedTask.title)}에 25분 기록`);
          showToast(`포모도로 완료! ${escapeHtml(linkedTask.title)}에 25분 기록 (${pomo.completedPomodoros}회)`, 'success');
        } else {
          // 태스크가 삭제된 경우
          pomo.currentTaskId = null;
          showNotification('포모도로 완료!', '5분 휴식하세요');
          showToast(`포모도로 완료! (${pomo.completedPomodoros}회) 5분 휴식`, 'success');
        }
      } else {
        showNotification('포모도로 완료!', '5분 휴식하세요');
        showToast(`포모도로 완료! (${pomo.completedPomodoros}회) 5분 휴식`, 'success');
      }
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    renderStatic();
  }
}

/**
 * 포모도로 시간 표시 업데이트 (전체 렌더링 없이)
 */
function updatePomodoroDisplay() {
  if (!_cachedPomodoroTimeEl || !_cachedPomodoroTimeEl.isConnected) {
    _cachedPomodoroTimeEl = document.getElementById('pomodoro-time');
  }
  if (_cachedPomodoroTimeEl) {
    _cachedPomodoroTimeEl.textContent = formatPomodoroTime(appState.pomodoro.timeLeft);
  }
}

/**
 * 포모도로 시간 포맷팅
 */
function formatPomodoroTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

window.pausePomodoro = pausePomodoro;
window.resumePomodoro = resumePomodoro;
window.stopPomodoro = stopPomodoro;
window.formatPomodoroTime = formatPomodoroTime;

