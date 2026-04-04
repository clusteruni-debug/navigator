// ============================================
// 전역 함수 등록 (Nav 네임스페이스 + window 호환)
// ============================================
const _navFunctions = {
  // 탭/네비게이션
  switchTab, addNewEvent, toggleShuttle,
  // 작업 CRUD
  quickAdd, detailedAdd, showBrainDumpModal, processBrainDump, completeTask, uncompleteTask, editTask, cancelEdit, deleteTask,
  // 이벤트 일괄 선택
  toggleEventBulkSelect, toggleEventSelection, toggleEventSelectAll, bulkDeleteEvents, toggleEventGroup,
  toggleEventGroupSelect, restoreFromTrash, permanentDeleteFromTrash, emptyTrash,
  handleGo, toggleTaskList, toggleCompletedTasks, toggleDetailedAdd,
  updateDetailedTaskCategory, updateDetailedTaskRepeat,
  // 터치/스와이프
  handleTouchStart, handleTouchMove, handleTouchEnd,
  // 백업/데이터
  exportData, importData,
  // 유틸
  getRepeatLabel, setScheduleFilter, getTasksByDate, formatTime,
  setSearchQuery, clearSearch, setCategoryFilter,
  // 서브태스크
  toggleSubtaskComplete, toggleSubtaskExpand, toggleDetailedSubtask, addSubtask, removeSubtask,
  // 주간 리뷰
  showWeeklyReview, closeWeeklyReview,
  // 포커스/단축키
  toggleFocusTask, saveWeeklyPlan, dismissMondayReminder,
  setQuickFilter, postponeTask,
  showTimeInputModal, saveActualTime, closeTimeInputModal,
  // 히스토리/캘린더
  prevMonth, nextMonth, selectDate, toggleHistoryDate,
  // 통근 트래커: js/commute.js에서 window에 직접 등록
  // 리듬 통계: js/rhythm.js에서 window에 직접 등록
  // 설정
  openSettings, closeSettings, updateSetting,
  // 템플릿 (saveAsTemplate은 work-data.js에서 window에 직접 등록 — 로드 순서상 여기서 참조 불가)
  deleteTemplate, addFromTemplate, saveCurrentAsTemplate,
};
// 네임스페이스 객체
window.Nav = _navFunctions;
// HTML onclick 호환용 전역 등록
Object.assign(window, _navFunctions);

// UX 함수
function dismissSwipeHint() {
  localStorage.setItem('navigator-hide-swipe-hint', 'true');
  renderStatic();
}
window.dismissSwipeHint = dismissSwipeHint;

// 기능 투어
const tourSteps = [
  { selector: '.quick-add-container', title: '⚡ 빠른 추가', desc: '여기에 작업명을 입력하고 Enter! #부업 처럼 카테고리도 지정 가능합니다.' },
  { selector: '.tab-nav', title: '📋 탭 네비게이션', desc: '오늘/본업/이벤트/일상 탭으로 전환. 더보기에서 통계/전체/히스토리도 볼 수 있습니다.' },
  { selector: '.header', title: '⚙️ 헤더 버튼', desc: '셔틀 상태, 테마 전환, 동기화 상태, 마감 알림, 설정을 빠르게 접근합니다.' },
  { selector: '.quick-filter-section, .quick-templates', title: '🎯 빠른 필터 & 템플릿', desc: '소요시간/마감 필터로 작업을 걸러보고, 글쓰기/상세 추가로 빠르게 작업을 만드세요.' },
];
let tourIdx = -1;

function startFeatureTour() {
  tourIdx = 0;
  showTourStep();
}
function showTourStep() {
  // 이전 정리
  document.querySelectorAll('.tour-overlay, .tour-tooltip').forEach(el => el.remove());
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  if (tourIdx >= tourSteps.length) { tourIdx = -1; return; }

  const step = tourSteps[tourIdx];
  const target = document.querySelector(step.selector);

  // 오버레이
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.onclick = () => endTour();
  document.body.appendChild(overlay);

  // 하이라이트
  if (target) {
    target.classList.add('tour-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // 툴팁
  const tooltip = document.createElement('div');
  tooltip.className = 'tour-tooltip';
  tooltip.onclick = (e) => e.stopPropagation();
  tooltip.innerHTML = `
    <h4>${step.title}</h4>
    <p>${step.desc}</p>
    <div class="tour-actions">
      <span class="tour-step">${tourIdx + 1} / ${tourSteps.length}</span>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary btn-small" onclick="endTour()" style="min-height:36px;">건너뛰기</button>
        <button class="btn btn-primary btn-small" onclick="nextTourStep()" style="min-height:36px;">${tourIdx < tourSteps.length - 1 ? '다음 →' : '완료 ✓'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(tooltip);

  // 위치 조정
  if (target) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let top = rect.bottom + 12;
    let left = Math.max(16, rect.left);
    if (top + tooltipRect.height > window.innerHeight) top = rect.top - tooltipRect.height - 12;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 16;
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  } else {
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
  }
}
function nextTourStep() { tourIdx++; showTourStep(); }
function endTour() {
  document.querySelectorAll('.tour-overlay, .tour-tooltip').forEach(el => el.remove());
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  tourIdx = -1;
}
window.startFeatureTour = startFeatureTour;
window.nextTourStep = nextTourStep;
window.endTour = endTour;

