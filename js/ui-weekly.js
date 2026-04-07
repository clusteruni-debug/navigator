// ============================================
// 주간 리뷰 / 계획 시스템
// (ui.js에서 분리)
// ============================================

/**
 * 주간 리뷰 필요 여부 체크 (일요일 저녁)
 */
function checkWeeklyReview() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 일요일
  const hour = now.getHours();
  const today = now.toDateString();

  // 일요일 18시 이후이고, 오늘 리뷰 안 했으면
  if (dayOfWeek === 0 && hour >= 18 && appState.weeklyPlan.lastReviewDate !== today) {
    showWeeklyReview();
  }
}

/**
 * 월요일 리마인더 필요 여부 체크
 */
function checkMondayReminder() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 1 = 월요일
  const today = now.toDateString();

  // 월요일이고, 오늘 리마인더 안 보여줬고, 닫지 않았으면
  if (dayOfWeek === 1 &&
      appState.weeklyPlan.lastReminderDate !== today &&
      !appState.weeklyPlan.dismissed &&
      appState.weeklyPlan.focusTasks.length > 0) {
    return true;
  }
  return false;
}

/**
 * 주간 리뷰 모달 표시
 */
function showWeeklyReview() {
  const modal = document.getElementById('weekly-review-modal');
  const content = document.getElementById('weekly-review-content');

  if (!modal || !content) return;

  const report = getWeeklyReport();
  const pendingTasks = appState.tasks.filter(t => !t.completed);

  // 비교 텍스트
  let compareText = '';
  let compareClass = '';
  if (report.change > 0) {
    compareText = `▲ 지난주보다 ${report.change}개 더 완료!`;
    compareClass = 'up';
  } else if (report.change < 0) {
    compareText = `▼ 지난주보다 ${Math.abs(report.change)}개 적음`;
    compareClass = 'down';
  } else {
    compareText = '지난주와 동일';
    compareClass = '';
  }

  content.innerHTML = `
    <div class="review-summary">
      <div class="review-summary-value">${report.thisWeekCount}</div>
      <div class="review-summary-label">이번 주 완료한 작업</div>
      <div class="review-summary-compare ${compareClass}">${compareText}</div>
    </div>

    <div class="weekly-plan-section">
      <div class="weekly-plan-title">🎯 다음 주 집중할 작업 선택 (최대 3개)</div>
      <div class="weekly-plan-list" id="weekly-plan-list">
        ${pendingTasks.slice(0, 10).map(task => `
          <div class="weekly-plan-item ${appState.weeklyPlan.focusTasks.includes(task.id) ? 'selected' : ''}"
               onclick="toggleFocusTask('${escapeAttr(task.id)}')">
            <div class="weekly-plan-check">
              ${appState.weeklyPlan.focusTasks.includes(task.id) ? '✓' : ''}
            </div>
            <div class="weekly-plan-item-title">${escapeHtml(task.title)}</div>
            <div class="weekly-plan-item-category">${task.category}</div>
          </div>
        `).join('')}
        ${pendingTasks.length === 0 ? '<div style="text-align: center; color: var(--text-muted); padding: 20px;">진행 중인 작업이 없어요!</div>' : ''}
      </div>
    </div>

    <div style="margin-top: 16px; padding: 12px; background: var(--accent-primary-alpha); border-radius: 8px; font-size: 15px; color: var(--text-secondary);">
      💡 선택한 작업은 월요일에 "이번 주 집중" 알림으로 표시됩니다.
    </div>
  `;

  modal.style.display = 'flex';
}

/**
 * 집중 작업 토글
 */
function toggleFocusTask(taskId) {
  const idx = appState.weeklyPlan.focusTasks.indexOf(taskId);

  if (idx === -1) {
    // 추가 (최대 3개)
    if (appState.weeklyPlan.focusTasks.length < 3) {
      appState.weeklyPlan.focusTasks.push(taskId);
    } else {
      showToast('최대 3개까지 선택할 수 있어요', 'warning');
      return;
    }
  } else {
    // 제거
    appState.weeklyPlan.focusTasks.splice(idx, 1);
  }

  // UI 업데이트
  const items = document.querySelectorAll('.weekly-plan-item');
  items.forEach(item => {
    const match = item.getAttribute('onclick')?.match(/toggleFocusTask\('([^']+)'\)/);
    if (!match) return;
    const id = match[1];
    if (appState.weeklyPlan.focusTasks.includes(id)) {
      item.classList.add('selected');
      item.querySelector('.weekly-plan-check').textContent = '✓';
    } else {
      item.classList.remove('selected');
      item.querySelector('.weekly-plan-check').textContent = '';
    }
  });
}

/**
 * 주간 계획 저장
 */
function saveWeeklyPlan() {
  appState.weeklyPlan.lastReviewDate = new Date().toDateString();
  appState.weeklyPlan.dismissed = false;
  appState.weeklyPlan.updatedAt = new Date().toISOString();
  saveState();
  closeWeeklyReview();
  showToast('다음 주 계획이 저장되었어요! 💪', 'success');
}

/**
 * 주간 리뷰 모달 닫기
 */
function closeWeeklyReview() {
  const modal = document.getElementById('weekly-review-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * 월요일 리마인더 닫기
 */
function dismissMondayReminder() {
  appState.weeklyPlan.lastReminderDate = new Date().toDateString();
  appState.weeklyPlan.dismissed = true;
  appState.weeklyPlan.updatedAt = new Date().toISOString();
  saveState();
  renderStatic();
}
