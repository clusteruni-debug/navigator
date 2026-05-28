// ============================================
// 앱 초기화 (모든 모듈 로드 완료 후)
// ============================================
loadState();

// 이벤트 탭 하이브리드 마이그레이션: telegram-sourced 태스크를 appState에서 제거 (Supabase가 단일 소스)
if (!appState._migrations?.eventTabHybrid) {
  const telegramTasks = appState.tasks.filter(t => t.category === '부업' && t.source && t.source.type === 'telegram-event');
  if (telegramTasks.length > 0) {
    // 미동기화된 완료 상태 best-effort PATCH
    telegramTasks.forEach(task => {
      if (task.completed && task.source.eventId) {
        updateLinkedEventStatus(task, true).catch(() => {});
      }
    });
    appState.tasks = appState.tasks.filter(t => !(t.category === '부업' && t.source && t.source.type === 'telegram-event'));
    console.log(`[migration] Removed ${telegramTasks.length} telegram-sourced tasks from local appState`);
  }
  if (!appState._migrations) appState._migrations = {};
  appState._migrations.eventTabHybrid = new Date().toISOString();
  saveState();
  if (typeof updateDataCounts === 'function') updateDataCounts(); // shrinkage guard 기준값 갱신
}

// meta theme-color을 CSS 변수와 동기화
const _tc = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();
if (_tc) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', _tc);

// 알림 권한 상태 확인
if ('Notification' in window) {
  appState.notificationPermission = Notification.permission;
}

// 오프라인 상태 표시
function updateOnlineStatus() {
  let indicator = document.getElementById('offline-indicator');

  if (!navigator.onLine) {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.className = 'offline-indicator';
      indicator.innerHTML = '📴 오프라인 모드 - 변경사항은 기기에 저장됩니다';
      document.body.prepend(indicator);
    }
    indicator.classList.remove('hidden');
  } else {
    if (indicator) {
      indicator.classList.add('hidden');
      setTimeout(() => indicator.remove(), 300);
    }
  }
}

window.addEventListener('online', async () => {
  updateOnlineStatus();
  // 온라인 복귀 시 클라우드 먼저 가져와서 병합 → 업로드 (loadFromFirebase 내부에서 syncToFirebase 호출)
  // ⚠️ syncToFirebase만 호출하면 다른 기기의 오프라인 변경사항을 덮어쓰는 위험
  if (appState.user) {
    showToast('온라인 복귀 - 동기화 중...', 'success');
    try {
      await loadFromFirebase();
    } catch (e) {
      console.error('[sync] 온라인 복귀 동기화 실패:', e);
    }
    renderStatic();
  }
});
window.addEventListener('offline', () => {
  updateOnlineStatus();
  showToast('오프라인 모드 - 변경사항은 기기에 저장됩니다', 'warning');
});
updateOnlineStatus();

// 페이지 종료 시 localStorage만 동기 저장 (async Firebase는 브라우저가 기다리지 않음)
window.addEventListener('beforeunload', () => {
  _doSaveStateLocalOnly();
});

renderStatic();
registerServiceWorker();

// 기존 interval 정리 후 재등록 (중복 방지)
if (window._navIntervals) window._navIntervals.forEach(id => clearInterval(id));
window._navIntervals = [
  setInterval(updateTime, 1000),
  setInterval(checkDeadlinesAndNotify, 5 * 60 * 1000), // 5분마다 마감 체크
  // 반복 태스크 일일 초기화: 자정 넘김 감지 (1분마다 날짜 변경 체크)
  setInterval(() => {
    // 클라우드 로드 중에는 checkDailyReset 스킵 (updatedAt 갱신으로 merge 오염 방지)
    if (isLoadingFromCloud) return;
    let changed = false;
    if (checkDailyReset()) {
      recomputeTodayStats();
      saveState(); // 모바일에서 beforeunload 미발생 시 데이터 유실 방지
      changed = true;
    }
    if (checkRhythmDayChange()) {
      changed = true;
    }
    if (changed) {
      renderStatic();
      showToast('🔄 새로운 하루! 반복 태스크가 초기화되었습니다', 'info');
    }
  }, 60000)
];
checkDeadlinesAndNotify(); // 초기 실행

// 탭 전환/숨김 시 대기 중인 Firebase 동기화 즉시 실행 + 탭 복귀 시 일일 초기화
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    // 탭 전환/앱 최소화: 리듬 데이터 로컬 백업 + 대기 중인 Firebase 동기화 즉시 플러시
    localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
    if (appState.user && syncDebounceTimer) {
      // syncToFirebase(true)가 내부에서 디바운스 타이머를 취소하고 즉시 실행
      syncToFirebase(true);
    }
  } else {
    // 탭 복귀: 클라우드 동기화 먼저 → 그 다음 일일 초기화
    // (순서 중요: checkDailyReset이 먼저 실행되면 updatedAt이 갱신되어
    //  다른 기기의 서브태스크 완료 데이터가 merge에서 패배함)
    if (appState.user) {
      // 리스너가 죽어있으면 재연결
      if (!unsubscribeSnapshot) {
        console.log('[sync] 탭 활성화 → 리스너 재연결');
        startRealtimeSync();
      }
      // 마지막 동기화로부터 5분 이상 지났으면 강제 새로고침
      const fiveMinutes = 5 * 60 * 1000;
      const syncAge = appState.lastSyncTime instanceof Date ? Date.now() - appState.lastSyncTime.getTime() : Infinity;
      if (!appState.lastSyncTime || isNaN(syncAge) || syncAge > fiveMinutes) {
        console.log('[sync] 탭 활성화 → 데이터 새로고침 (checkDailyReset 전)');
        try {
          await loadFromFirebase();
        } catch (e) {
          console.error('[sync] 새로고침 실패:', e);
        }
      }
    }
    // 클라우드 병합 완료 후 일일 초기화 (로컬 전용일 때도 여기서 실행)
    let changed = false;
    if (checkDailyReset()) {
      recomputeTodayStats();
      saveState(); // 모바일에서 beforeunload 미발생 시 데이터 유실 방지
      changed = true;
    }
    if (checkRhythmDayChange()) {
      changed = true;
    }
    if (changed) {
      renderStatic();
      showToast('🔄 새로운 하루! 반복 태스크가 초기화되었습니다', 'info');
    } else if (appState.user) {
      // 클라우드 새로고침 후 렌더링 갱신 (일일 초기화 없어도)
      recomputeTodayStats();
      renderStatic();
    }
  }
});

// 주간 리뷰 체크 (일요일 저녁)
setTimeout(() => checkWeeklyReview(), 3000);

// ============================================
// tgeventbot 연동: URL 파라미터 import
// ============================================
let _startupUrlParamsHandled = false;

function checkEventDeepLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  const eventId = urlParams.get('eventId');

  if (tab !== 'events' || !eventId) return false;

  _supabaseEventCache.highlightId = String(eventId);
  urlParams.delete('import');
  urlParams.delete('autoImport');
  urlParams.set('tab', 'events');
  urlParams.set('eventId', String(eventId));

  if (typeof switchTab === 'function') {
    switchTab('events');
  } else {
    appState.currentTab = 'events';
    renderStatic();
  }

  window.history.replaceState({}, document.title, `${window.location.pathname}?${urlParams.toString()}`);
  return true;
}

function handleStartupUrlParams() {
  if (_startupUrlParamsHandled) return;
  _startupUrlParamsHandled = true;

  // Deep link takes precedence over legacy base64 import when both are present.
  if (checkEventDeepLink()) return;
  checkUrlImport();
}

function checkUrlImport() {
  const urlParams = new URLSearchParams(window.location.search);
  const importData = urlParams.get('import');
  const autoImport = urlParams.get('autoImport') === 'true';

  if (importData) {
    try {
      // Unicode 안전한 Base64 디코딩
      const decoded = decodeURIComponent(escape(atob(importData)));
      const taskData = JSON.parse(decoded);

      if (autoImport) {
        // 자동 추가 — 확인 모달 없이 바로 Task 생성
        importTaskDirectly(taskData);
      } else {
        showImportConfirmModal(taskData);
      }

      // URL에서 파라미터 제거 (히스토리 정리)
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Import 파싱 오류:', error);
      showToast('잘못된 import 데이터입니다', 'error');
    }
  }
}

// autoImport용 — 확인 없이 바로 Task 추가
function importTaskDirectly(taskData) {
  try {
    const newTask = {
      id: generateId(),
      title: taskData.title || '이벤트 참여',
      category: taskData.category || '부업',
      estimatedTime: taskData.estimatedTime || 10,
      expectedRevenue: taskData.expectedRevenue || null,
      deadline: taskData.deadline || null,
      description: taskData.description || null,
      link: taskData.link || null,
      completed: false,
      pinned: false,
      source: taskData.source || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appState.tasks.unshift(newTask);
    saveState();
    renderStatic();
    showToast('✅ Task가 자동으로 추가되었습니다!', 'success');

    if (appState.user) {
      syncToFirebase();
    }
  } catch (error) {
    console.error('자동 Task 추가 오류:', error);
    showToast('Task 추가 실패', 'error');
  }
}

function showImportConfirmModal(taskData) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'import-confirm-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h2 style="display: flex; align-items: center; gap: 10px;">
          <span>📥</span> 이벤트에서 Task 추가
        </h2>
        <button class="modal-close" onclick="closeImportModal()">&times;</button>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <div style="background: var(--bg-secondary); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">제목</div>
          <div style="font-size: 1.1rem; font-weight: bold;">${escapeHtml(taskData.title || '제목 없음')}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">카테고리</div>
            <div>${escapeHtml(taskData.category || '부업')}</div>
          </div>
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">마감일</div>
            <div>${escapeHtml(taskData.deadline || '없음')}</div>
          </div>
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">예상 시간</div>
            <div>${escapeHtml(String(taskData.estimatedTime || 10))}분</div>
          </div>
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">보상</div>
            <div style="color: var(--accent-green);">${escapeHtml(String(taskData.expectedRevenue || '-'))}</div>
          </div>
        </div>

        ${taskData.description ? `
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px; margin-bottom: 15px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 5px;">설명</div>
            <div style="font-size: 0.9rem; max-height: 100px; overflow-y: auto;">${escapeHtml(taskData.description)}</div>
          </div>
        ` : ''}

        ${taskData.link && sanitizeUrl(taskData.link) ? `
          <div style="margin-bottom: 15px;">
            <a href="${escapeHtml(sanitizeUrl(taskData.link))}" target="_blank" rel="noopener" style="color: var(--accent-blue); font-size: 0.9rem;">
              🔗 ${escapeHtml(taskData.link.substring(0, 50))}...
            </a>
          </div>
        ` : ''}

        <div style="background: var(--accent-primary-alpha); border-radius: 8px; padding: 10px; font-size: 0.85rem; color: var(--text-secondary);">
          📢 출처: ${escapeHtml(taskData.source?.channel || 'tgeventbot')}
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 15px 20px; border-top: 1px solid var(--border-color);">
        <button class="btn btn-secondary" onclick="closeImportModal()">취소</button>
        <button class="btn btn-primary" onclick="confirmImportTask()">✅ Task 추가</button>
      </div>
    </div>
  `;

  // 데이터 저장
  modal.dataset.taskData = JSON.stringify(taskData);
  document.body.appendChild(modal);

  // 애니메이션
  requestAnimationFrame(() => modal.classList.add('active'));
}

function closeImportModal() {
  const modal = document.getElementById('import-confirm-modal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}

async function confirmImportTask() {
  const modal = document.getElementById('import-confirm-modal');
  if (!modal) return;

  try {
    const taskData = JSON.parse(modal.dataset.taskData);

    // 새 Task 생성
    const newTask = {
      id: generateId(),
      title: taskData.title || '이벤트 참여',
      category: taskData.category || '부업',
      estimatedTime: taskData.estimatedTime || 10,
      expectedRevenue: taskData.expectedRevenue || null,
      deadline: taskData.deadline || null,
      description: taskData.description || null,
      link: taskData.link || null,
      completed: false,
      pinned: false,
      // tgeventbot 연동 정보
      source: taskData.source || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appState.tasks.unshift(newTask);
    saveState();
    renderStatic();

    closeImportModal();
    showToast('✅ Task가 추가되었습니다!', 'success');

    // Firebase 동기화
    if (appState.user) {
      syncToFirebase();
    }
  } catch (error) {
    console.error('Task 추가 오류:', error);
    showToast('Task 추가 실패', 'error');
  }
}

// Task 완료 시 연결된 이벤트 상태 업데이트 (Supabase 단일 소스)
async function updateLinkedEventStatus(task, participated) {
  if (!task.source || task.source.type !== 'telegram-event') return;

  const eventId = task.source.eventId;
  if (!eventId) return;

  // 1. Supabase REST API로 telegram_messages.status 업데이트 (1c: status enum allow-list)
  const status = participated ? 'done' : 'pending';
  try {
    const res = await fetch(
      `${TG_SUPABASE_URL}/rest/v1/telegram_messages?id=eq.${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': TG_SUPABASE_KEY,
          'Authorization': `Bearer ${TG_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status })
      }
    );
    if (res.ok) {
      console.info(`Telegram 이벤트 #${eventId} status=${status} 동기화 완료`);
    } else {
      console.warn(`Telegram 이벤트 동기화 실패: ${res.status}`);
    }
  } catch (error) {
    console.error('Telegram 이벤트 Supabase 동기화 실패:', error);
  }
}

async function cleanupTelegramFirestoreEvents(uid) {
  if (!uid || !window.firebaseDb || !window.firebaseDoc || !window.firebaseRunTransaction) return;

  try {
    const userDoc = window.firebaseDoc(window.firebaseDb, 'users', uid);
    const result = await window.firebaseRunTransaction(window.firebaseDb, async (transaction) => {
      const docSnap = await transaction.get(userDoc);
      const data = docSnap.exists() ? docSnap.data() : {};
      const migrations = (data && typeof data._migrations === 'object' && data._migrations) ? data._migrations : {};

      if (migrations.firestoreEventsCleanup) {
        return { skipped: true, removedCount: 0, migratedAt: migrations.firestoreEventsCleanup };
      }

      const events = Array.isArray(data.events) ? [...data.events] : [];
      const filteredEvents = events.filter(event => event?.source?.type !== 'telegram-event');
      const migratedAt = new Date().toISOString();

      const nextUserData = {
        _migrations: { ...migrations, firestoreEventsCleanup: migratedAt }
      };

      if (filteredEvents.length !== events.length) {
        nextUserData.events = filteredEvents;
      }

      transaction.set(userDoc, nextUserData, { merge: true });
      return {
        skipped: false,
        removedCount: events.length - filteredEvents.length,
        migratedAt
      };
    });

    if (!result?.skipped) {
      console.log(`[migration] Firestore telegram events cleanup complete (removed ${result?.removedCount || 0})`);
    }
  } catch (error) {
    console.error('[migration] Firestore telegram events cleanup failed:', error);
  }
}

// ============================================
// ============================================
// 텔레그램 이벤트 — 레거시 모달 플로우 제거됨
// 수신 이벤트는 render-events.js에서 Supabase 직접 조회
// TG_SUPABASE_URL / TG_SUPABASE_KEY → js/state.js로 이동됨
// ============================================

// 레거시 모달 함수 제거됨 (showTelegramEvents, showTelegramEventsModal, etc.)
// 수신 이벤트는 render-events.js에서 Supabase 직접 렌더링
window.closeImportModal = closeImportModal;
window.confirmImportTask = confirmImportTask;

// URL import 체크 (Firebase 로드 후 실행)
setTimeout(handleStartupUrlParams, 500);

// Firebase 인증 상태 리스너
window.addEventListener('firebase-ready', () => {
  // URL import 파라미터 확인 (tgeventbot 연동)
  handleStartupUrlParams();

  // 오프라인/타임아웃 대비: 5초 후에도 클라우드 로드가 안 됐으면 로컬 기반으로 checkDailyReset 실행
  // (loadFromFirebase 진행 중이면 대기 — 진행 중인 로드가 완료되면 자체적으로 checkDailyReset 호출)
  setTimeout(() => {
    if (!initialCloudLoadComplete && !isLoadingFromCloud) {
      initialCloudLoadComplete = true;
      console.warn('[daily-reset] 클라우드 로드 타임아웃 → 로컬 데이터 기반으로 checkDailyReset 실행');
      const resetDone = checkDailyReset();
      if (resetDone) {
        recomputeTodayStats();
        saveState();
        renderStatic();
      }
    }
  }, 5000);

  window.firebaseOnAuthStateChanged(window.firebaseAuth, async (user) => {
    if (user) {
      appState.user = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };

      await cleanupTelegramFirestoreEvents(user.uid);

      // 클라우드 데이터 로드 및 실시간 동기화 시작
      // (loadFromFirebase 내부에서 initialCloudLoadComplete=true + checkDailyReset 호출)
      await loadFromFirebase();
      startRealtimeSync();

      renderStatic();
    } else {
      // 비로그인: 클라우드 로드 없이 로컬 기반으로 checkDailyReset 실행
      if (!initialCloudLoadComplete) {
        initialCloudLoadComplete = true;
        const resetDone = checkDailyReset();
        if (resetDone) {
          recomputeTodayStats();
          saveState();
        }
        console.log('[daily-reset] 비로그인 → 로컬 기반 checkDailyReset 실행');
      }
      appState.user = null;
      appState.syncStatus = 'offline';
      renderStatic();
    }
  });
});
