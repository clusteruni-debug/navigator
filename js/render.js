// ============================================
// 렌더링 (오케스트레이터)
// ============================================

/**
 * renderStatic() 전후 입력값 + 포커스 보존 유틸
 * #root innerHTML 교체 시 모든 input/textarea/select가 파괴되므로
 * 스냅샷 → DOM 교체 → 복원 순서로 보호한다.
 */
function _snapshotInputs() {
  const root = document.getElementById('root');
  if (!root) return null;

  // 현재 포커스된 요소 정보
  const ae = document.activeElement;
  const isInputFocused = ae && root.contains(ae) &&
    (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
  if (!isInputFocused) return null;  // 입력 중이 아니면 스냅샷 불필요

  // #root 내 모든 input/textarea/select 값 수집 (id 기준)
  const values = {};
  root.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.id) {
      values[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    }
  });

  // 통근 모달 색상 버튼 (id 없으므로 별도 저장)
  const colorBtn = root.querySelector('.commute-color-btn.selected');
  if (colorBtn) values['__commute_color'] = colorBtn.dataset.color;

  return {
    values,
    focusId: ae.id || null,
    selStart: typeof ae.selectionStart === 'number' ? ae.selectionStart : null,
    selEnd: typeof ae.selectionEnd === 'number' ? ae.selectionEnd : null
  };
}

function _restoreInputs(snapshot) {
  if (!snapshot) return;
  const root = document.getElementById('root');
  if (!root) return;

  // 값 복원
  for (const [id, val] of Object.entries(snapshot.values)) {
    if (id === '__commute_color') {
      const btns = root.querySelectorAll('.commute-color-btn');
      btns.forEach(b => b.classList.toggle('selected', b.dataset.color === val));
      continue;
    }
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = val;
    } else if (el.value !== val) {
      el.value = val;
    }
  }

  // 포커스 + 커서 위치 복원
  if (snapshot.focusId) {
    const focusEl = document.getElementById(snapshot.focusId);
    if (focusEl) {
      focusEl.focus();
      if (typeof focusEl.setSelectionRange === 'function' && snapshot.selStart != null) {
        try { focusEl.setSelectionRange(snapshot.selStart, snapshot.selEnd); } catch (e) { /* select 등 일부 타입에서 불가 */ }
      }
    }
  }
}

/**
 * 전체 화면 렌더링 (상태 변경 시 호출)
 */
function renderStatic() {
  // ── 범용 입력 보호: #root innerHTML 교체 전 모든 입력값 + 포커스 스냅샷 ──
  const _inputSnapshot = _snapshotInputs();

  const now = new Date();
  const hour = now.getHours();
  const filteredTasks = getFilteredTasks();
  const nextAction = filteredTasks[0] || null;
  const mode = getCurrentMode();
  const categoryStats = getCategoryStats();
  const urgentTasks = getUrgentTasks();

  const stats = {
    total: appState.tasks.length,
    completed: getTodayCompletedTasks(appState.tasks).length,
    remaining: appState.tasks.filter(t => !t.completed).length
  };

  const completedTasks = getTodayCompletedTasks(appState.tasks);
  const hiddenCount = appState.tasks.filter(t => !t.completed).length - filteredTasks.length;

  const bedtime = new Date(now);
  bedtime.setHours(24, 0, 0, 0);
  const minutesUntilBed = Math.floor((bedtime - now) / (1000 * 60));

  const urgencyClass = nextAction ? nextAction.urgency : 'normal';
  const urgencyLabel = {
    'urgent': '🚨 긴급!',
    'warning': '⚠️ 주의',
    'normal': '▶ 지금 할 것',
    'expired': '❌ 마감 지남'
  };

  // 카테고리별 입력 필드 (render-forms.js에서 제공)
  const categoryFields = getCategoryFields();

  // 서브 모듈에 전달할 컨텍스트
  var actionCtx = {
    now: now,
    hour: hour,
    filteredTasks: filteredTasks,
    nextAction: nextAction,
    mode: mode,
    urgentTasks: urgentTasks,
    completedTasks: completedTasks,
    urgencyClass: urgencyClass,
    urgencyLabel: urgencyLabel,
    minutesUntilBed: minutesUntilBed,
    categoryFields: categoryFields
  };

  var dashboardCtx = {
    stats: stats,
    categoryStats: categoryStats,
    urgentTasks: urgentTasks,
    completedTasks: completedTasks
  };

  document.getElementById('root').innerHTML = `
    <div class="app">
      <div class="header">
        <div class="header-left">
          <h1>⚡ Navigator</h1>
          <p class="header-date">${now.getMonth() + 1}월 ${now.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}요일 ${appState.streak.current > 0 ? `<span class="header-streak">🔥${appState.streak.current}</span>` : ''}</p>
        </div>
        <div class="header-actions">
          <button class="header-btn shuttle-toggle ${appState.shuttleSuccess ? 'on' : 'off'}" onclick="toggleShuttle()" title="${appState.shuttleSuccess ? '셔틀 탑승 성공 ✓' : '셔틀 놓침 ✗ (클릭하여 변경)'}" aria-label="셔틀 상태 토글">
            ${appState.shuttleSuccess ? '🚌 ON' : '😴 OFF'}
          </button>
          <button class="header-btn" onclick="toggleTheme()" title="테마 전환" aria-label="테마 전환">
            ${appState.theme === 'dark' ? '☀️' : '🌙'}
          </button>
          ${appState.user ? `
            <button class="header-btn" onclick="openSettings()" title="동기화: ${appState.syncStatus}" aria-label="동기화 상태" style="position: relative;">
              ${appState.syncStatus === 'syncing' ? '🔄' : appState.syncStatus === 'synced' ? '☁️' : appState.syncStatus === 'error' ? '⚠️' : '☁️'}
              <span style="position: absolute; bottom: 2px; right: 2px; width: 8px; height: 8px; background: ${appState.syncStatus === 'synced' ? 'var(--accent-success)' : appState.syncStatus === 'error' ? 'var(--accent-danger)' : 'var(--accent-primary)'}; border-radius: 50%; border: 1px solid var(--bg-primary);"></span>
            </button>
          ` : `
            <button class="header-btn" onclick="openSettings()" title="로그인하여 동기화" aria-label="로그인하여 동기화">
              ☁️
            </button>
          `}
          <div class="notification-dropdown-wrapper">
            <button class="header-btn" onclick="toggleNotificationDropdown(event)" title="마감 알림" aria-label="마감 알림" style="position: relative;">
              🔔
              ${appState.notificationPermission === 'granted' ? '<span class="notif-dot" style="background: var(--accent-success);"></span>' : appState.notificationPermission === 'denied' ? '<span class="notif-dot" style="background: var(--accent-danger);"></span>' : ''}
            </button>
            <div id="notification-dropdown" class="notification-dropdown">
              <div class="notification-title">🔔 마감 알림</div>
              <div class="notification-status">
                ${appState.notificationPermission === 'granted' ? `
                  <span class="notification-text granted">✓ 활성화됨</span>
                  <button class="notification-btn granted" disabled>ON</button>
                ` : appState.notificationPermission === 'denied' ? `
                  <span class="notification-text denied">✕ 차단됨</span>
                  <button class="notification-btn denied" onclick="showToast('브라우저 설정에서 알림을 허용해주세요 (주소창 왼쪽 🔒 클릭)', 'info')">설정</button>
                ` : `
                  <span class="notification-text">알림 받기</span>
                  <button class="notification-btn" onclick="requestNotificationPermission()">켜기</button>
                `}
              </div>
              ${appState.notificationPermission === 'denied' ? `
                <div class="notification-help">
                  💡 주소창 왼쪽의 🔒를 클릭하여 알림을 허용으로 변경하세요
                </div>
              ` : ''}
            </div>
          </div>
          <button class="header-btn" onclick="openSettings()" title="설정" aria-label="설정">
            ⚙️
          </button>
        </div>
      </div>

      <!-- 탭 네비게이션 (6개 + 더보기) -->
      <div class="tab-nav" role="navigation" aria-label="탭 네비게이션">
        <button class="tab-btn ${appState.currentTab === 'action' ? 'active' : ''}" onclick="switchTab('action')" aria-label="오늘 탭">
          ${svgIcon('target')} 오늘
        </button>
        <button class="tab-btn ${appState.currentTab === 'all' ? 'active' : ''}" onclick="switchTab('all')" aria-label="할일 탭">
          ${svgIcon('list')} 할일
        </button>
        <button class="tab-btn ${appState.currentTab === 'work' ? 'active' : ''}" onclick="switchTab('work')" aria-label="본업 탭">
          ${svgIcon('briefcase')} 본업
        </button>
        <button class="tab-btn ${appState.currentTab === 'events' ? 'active' : ''}" onclick="switchTab('events')" aria-label="이벤트 탭">
          ${svgIcon('dollar')} 이벤트
        </button>
        <button class="tab-btn ${appState.currentTab === 'life' ? 'active' : ''}" onclick="switchTab('life')" aria-label="일상 탭">
          ${svgIcon('home')} 일상
        </button>
        <div class="tab-more-dropdown">
          <button class="tab-btn ${['commute', 'dashboard', 'history'].includes(appState.currentTab) ? 'active' : ''}" onclick="toggleMoreMenu(event)" aria-label="더보기 메뉴" aria-expanded="${appState.moreMenuOpen}" aria-haspopup="true">
            ${svgIcon('menu')} 더보기 ▾
          </button>
          <div id="more-menu" class="more-menu ${appState.moreMenuOpen ? 'show' : ''}" role="menu">
            <button class="more-menu-item ${appState.currentTab === 'commute' ? 'active' : ''}" onclick="appState.moreMenuOpen = false; switchTab('commute');" role="menuitem" aria-label="통근 탭">
              ${svgIcon('bus')} 통근
            </button>
            <button class="more-menu-item ${appState.currentTab === 'dashboard' ? 'active' : ''}" onclick="appState.moreMenuOpen = false; switchTab('dashboard');" role="menuitem" aria-label="통계 탭">
              ${svgIcon('bar-chart')} 통계
            </button>
            <button class="more-menu-item ${appState.currentTab === 'history' ? 'active' : ''}" onclick="appState.moreMenuOpen = false; switchTab('history');" role="menuitem" aria-label="히스토리 탭">
              ${svgIcon('calendar')} 히스토리
            </button>
          </div>
        </div>
      </div>

      <!-- 실행 탭 -->
      <div class="tab-content ${appState.currentTab === 'action' ? 'active' : ''}">
        ${appState.currentTab === 'action' ? renderActionTab(actionCtx) : ''}
      </div>

      <!-- 일정 탭 -->
      <div class="tab-content ${appState.currentTab === 'schedule' ? 'active' : ''}">
        ${appState.currentTab === 'schedule' ? `
        <div class="schedule-filter">
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'all' ? 'active' : ''}" onclick="setScheduleFilter('all')">
            전체
          </button>
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'today' ? 'active' : ''}" onclick="setScheduleFilter('today')">
            오늘
          </button>
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'weekday' ? 'active' : ''}" onclick="setScheduleFilter('weekday')">
            평일
          </button>
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'weekend' ? 'active' : ''}" onclick="setScheduleFilter('weekend')">
            주말
          </button>
        </div>

        <div class="schedule-week-grid">
          ${getTasksByDate().map(day => `
            <div class="schedule-day">
              <div class="schedule-day-header ${day.isToday ? 'today' : ''} ${day.isWeekend ? 'weekend' : ''}">
                <span>${day.dayName}</span>
                <span class="schedule-day-count">${day.tasks.length}개</span>
              </div>
              <div class="schedule-day-tasks">
                ${day.tasks.length > 0 ? day.tasks.map(task => `
                  <div class="schedule-task">
                    <span class="schedule-task-time">${formatTime(task.deadline)}</span>
                    <span class="schedule-task-title">${escapeHtml(task.title)}</span>
                    <span class="schedule-task-category category ${task.category}">${task.category}</span>
                  </div>
                `).join('') : `
                  <div class="schedule-empty">
                    ${day.isToday ? '오늘은 여유로운 날!' : '일정 없음'}
                  </div>
                `}
              </div>
            </div>
          `).join('')}
        </div>

        ${appState.tasks.filter(t => !t.completed && !t.deadline).length > 0 ? `
          <div class="dashboard-section" style="margin-top: 20px;">
            <div class="dashboard-title">📌 마감 없는 작업 (${appState.tasks.filter(t => !t.completed && !t.deadline).length}개)</div>
            <div class="task-list show">
              ${appState.tasks.filter(t => !t.completed && !t.deadline).map((task, index) => `
                <div class="task-item" style="--task-cat-color: var(--cat-${task.category})">
                  <div class="task-item-header">
                    <div class="task-item-title">${index + 1}. ${escapeHtml(task.title)}</div>
                  </div>
                  <div class="task-item-meta">
                    <span class="category ${task.category}">${task.category}</span>
                    ${task.estimatedTime ? ` · ${task.estimatedTime}분` : ''}
                  </div>
                  <div class="task-item-actions">
                    <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')">${svgIcon('edit', 14)} 마감 추가</button>
                    <button class="btn-small complete" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">✓</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ` : ''}
      </div>

      <!-- 본업 프로젝트 탭 -->
      <div class="tab-content ${appState.currentTab === 'work' ? 'active' : ''}">
        ${appState.currentTab === 'work' ? renderWorkProjects() : ''}
      </div>

      <!-- 부업 이벤트 탭 -->
      <div class="tab-content ${appState.currentTab === 'events' ? 'active' : ''}">
        ${appState.currentTab === 'events' ? renderEventsTab() : ''}
      </div>

      <!-- 일상/가족 탭 -->
      <div class="tab-content ${appState.currentTab === 'life' ? 'active' : ''}">
        ${appState.currentTab === 'life' ? renderLifeTab() : ''}
      </div>



      <!-- 통근 트래커 탭 -->
      <div class="tab-content ${appState.currentTab === 'commute' ? 'active' : ''}">
        ${appState.currentTab === 'commute' ? renderCommuteTab() : ''}
      </div>

      <!-- 대시보드 탭 -->
      <div class="tab-content ${appState.currentTab === 'dashboard' ? 'active' : ''}">
        ${appState.currentTab === 'dashboard' ? renderDashboardTab(dashboardCtx) : ''}
      </div>

      <!-- 전체 목록 탭 -->
      <div class="tab-content ${appState.currentTab === 'all' ? 'active' : ''}">
        ${appState.currentTab === 'all' ? renderAllTasksTab() : ''}
      </div>

      <!-- 히스토리 탭 -->
      <div class="tab-content ${appState.currentTab === 'history' ? 'active' : ''}">
        ${appState.currentTab === 'history' ? renderHistoryTab() : ''}
      </div>

      <!-- 온보딩 모달 -->
      ${renderOnboardingModal()}

      <!-- 설정 모달 -->
      ${renderSettingsModal()}
    </div>
  `;

  // 입력 이벤트 핸들러 등록
  setupInputHandlers();

  // ── 범용 입력 복원 ──
  _restoreInputs(_inputSnapshot);

  // textarea Tab 키 + auto-resize 초기화
  document.querySelectorAll('#root textarea').forEach(ta => initEnhancedTextarea(ta));
}

/**
 * 입력 필드 이벤트 핸들러 등록
 */
function setupInputHandlers() {
  const quickInput = document.getElementById('quick-add-input');
  if (quickInput) {
    quickInput.oninput = (e) => {
      appState.quickAddValue = e.target.value;
    };
  }

  if (appState.showDetailedAdd) {
    const inputs = {
      title: document.getElementById('detailed-title'),
      description: document.getElementById('detailed-description'),
      startDate: document.getElementById('detailed-startDate'),
      deadline: document.getElementById('detailed-deadline'),
      time: document.getElementById('detailed-time'),
      revenue: document.getElementById('detailed-revenue'),
      link: document.getElementById('detailed-link'),
      organizer: document.getElementById('detailed-organizer'),
      eventType: document.getElementById('detailed-eventType')
    };

    if (inputs.title) inputs.title.oninput = (e) => appState.detailedTask.title = e.target.value;
    if (inputs.description) inputs.description.oninput = (e) => appState.detailedTask.description = e.target.value;
    if (inputs.startDate) inputs.startDate.onchange = (e) => appState.detailedTask.startDate = e.target.value;
    if (inputs.deadline) inputs.deadline.onchange = (e) => appState.detailedTask.deadline = e.target.value;
    if (inputs.time) inputs.time.oninput = (e) => appState.detailedTask.estimatedTime = parseInt(e.target.value) || 0;
    if (inputs.revenue) inputs.revenue.oninput = (e) => appState.detailedTask.expectedRevenue = e.target.value;
    if (inputs.link) inputs.link.oninput = (e) => appState.detailedTask.link = e.target.value;
    if (inputs.organizer) inputs.organizer.oninput = (e) => appState.detailedTask.organizer = e.target.value;
    if (inputs.eventType) inputs.eventType.onchange = (e) => appState.detailedTask.eventType = e.target.value;

    // 새 태그 입력 핸들러
    const tagInput = document.getElementById('new-tag-input');
    if (tagInput) {
      tagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addNewTag(e.target.value);
          e.target.value = '';
        }
      };
    }

    // 서브태스크 입력 핸들러
    const subtaskInput = document.getElementById('new-subtask-input');
    if (subtaskInput) {
      subtaskInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtask(e.target.value);
          e.target.value = '';
        }
      };
    }
  }

  // 파일 임포트 핸들러
  const fileInput = document.getElementById('file-import');
  if (fileInput) {
    fileInput.onchange = handleFileImport;
  }
}

/**
 * 시간만 업데이트 (1초마다)
 */
function updateTime() {
  const now = new Date();
  const hour = now.getHours();
  const bedtime = new Date(now);
  bedtime.setHours(24, 0, 0, 0);
  const minutesUntilBed = Math.floor((bedtime - now) / (1000 * 60));

  const timeEl = document.getElementById('time-value');
  if (timeEl) {
    timeEl.textContent = `${Math.floor(minutesUntilBed / 60)}시간 ${minutesUntilBed % 60}분`;
  }

  // 현재 시간 시계 업데이트
  const clockEl = document.getElementById('current-clock');
  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  // 모드 남은 시간 업데이트
  const modeTimeEl = document.getElementById('mode-time-remaining');
  if (modeTimeEl) {
    const mode = getCurrentMode();
    modeTimeEl.textContent = getModeTimeRemaining(mode, hour, now);
  }
}
