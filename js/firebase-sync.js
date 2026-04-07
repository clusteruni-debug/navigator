// ============================================
// Firebase 동기화
// ============================================

let unsubscribeSnapshot = null;
let isSyncing = false;
let pendingSync = false; // 동기화 중 추가 변경 발생 시 재동기화 예약
let syncRetryCount = 0; // finally 재귀 깊이 제한 카운터
const MAX_SYNC_RETRY = 3; // pendingSync 재호출 최대 횟수
let lastSyncToastTime = 0; // 동기화 토스트 간격 제한용 (30초)
let isFirstRealtimeLoad = true; // 앱 첫 로드 시 토스트 미표시용
let isLoadingFromCloud = false; // 클라우드 초기 로드 중 sync 차단 (빈 데이터 업로드 방지)
let initialCloudLoadComplete = false; // 최초 클라우드 로드 완료 여부 (checkDailyReset 순서 보장용)
let syncDebounceTimer = null; // syncToFirebase 디바운스 타이머
const SYNC_DEBOUNCE_MS = 1500; // 동기화 디바운스 간격 (1.5초)
let lastOwnWriteTimestamp = null; // 핑퐁 방지: 자기가 마지막으로 쓴 timestamp
// lastRealtimeSyncToastTime 제거 — 동기화 수신 토스트 자체를 삭제함

// IndexedDB 가용성 체크 (프라이빗 브라우징에서 사용 불가 시 localStorage 폴백)
let isIndexedDBAvailable = true;
try {
  const testReq = indexedDB.open('__idb_test__');
  testReq.onerror = () => { isIndexedDBAvailable = false; };
  testReq.onsuccess = () => { testReq.result.close(); indexedDB.deleteDatabase('__idb_test__'); };
} catch (e) {
  isIndexedDBAvailable = false;
}

/**
 * Google 로그인
 */
async function loginWithGoogle() {
  try {
    if (!window.firebaseAuth) {
      showToast('Firebase 로딩 중...', 'info');
      return;
    }
    const result = await window.firebaseSignIn(window.firebaseAuth, window.firebaseProvider);
    appState.user = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL
    };
    showToast('로그인 성공! 동기화를 시작합니다', 'success');

    // 클라우드 데이터 가져오기
    await loadFromFirebase();

    // 실시간 동기화 시작
    startRealtimeSync();

    renderStatic();
  } catch (error) {
    console.error('로그인 실패:', error);
    showToast('로그인에 실패했습니다', 'error');
  }
}
window.loginWithGoogle = loginWithGoogle;

/**
 * 로그아웃
 */
async function logout() {
  try {
    // 로그아웃 전 현재 데이터를 localStorage에 덤프 (비로그인 상태 대비)
    _doSaveStateLocalOnly();

    await window.firebaseSignOut(window.firebaseAuth);
    appState.user = null;
    appState.syncStatus = 'offline';

    // 실시간 동기화 중지
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    showToast('로그아웃되었습니다', 'info');
    renderStatic();
  } catch (error) {
    console.error('로그아웃 실패:', error);
  }
}
window.logout = logout;

/**
 * 수동 동기화 갱신 - 클라우드에서 최신 데이터를 가져와 병합 후 다시 업로드
 */
async function forceSync() {
  if (!appState.user) {
    showToast('로그인이 필요합니다', 'info');
    return;
  }
  if (isSyncing) {
    showToast('동기화 진행 중입니다', 'info');
    return;
  }

  try {
    showToast('🔄 동기화 갱신 중...', 'info');
    // 디바운스 타이머 취소 (loadFromFirebase에서 병합 후 syncToFirebase 호출)
    if (saveStateTimeout) {
      clearTimeout(saveStateTimeout);
      saveStateTimeout = null;
    }
    // 클라우드에서 가져와 병합 후 업로드 (loadFromFirebase 내에서 syncToFirebase 호출)
    await loadFromFirebase();
    recomputeTodayStats();
    renderStatic();
    showToast('✅ 동기화 완료!', 'success');
  } catch (error) {
    console.error('수동 동기화 실패:', error);
    showToast('동기화에 실패했습니다', 'error');
  }
}
window.forceSync = forceSync;

/**
 * Firebase에 데이터 저장 (디바운스 래퍼)
 * 빈번한 변경을 배치 처리하여 Firebase 쓰기 횟수를 줄임
 * @param {boolean} immediate - true이면 디바운스 없이 즉시 동기화 (로드 후 머지 등)
 */
function syncToFirebase(immediate = false) {
  if (!appState.user) return;

  if (immediate) {
    // 즉시 동기화: 디바운스 타이머 취소 후 바로 실행
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
    _doSyncToFirebase();
    return;
  }

  // 디바운스: 1.5초 내 추가 호출이 있으면 마지막 호출만 실행
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    _doSyncToFirebase();
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Firebase에 데이터 저장 (실제 로직)
 * syncToFirebase()를 통해서만 호출 — 직접 호출 금지
 */
async function _doSyncToFirebase() {
  if (!appState.user) return;

  // 클라우드 초기 로드 중에는 동기화 차단 (빈 데이터 업로드 방지)
  // → loadFromFirebase() 완료 후 pendingSync로 재시도됨
  if (isLoadingFromCloud) {
    pendingSync = true;
    console.log('[sync] 클라우드 로드 중 - 동기화 대기');
    return;
  }

  // 동기화 중이면 다음 동기화 예약 (변경사항 누락 방지)
  if (isSyncing) {
    pendingSync = true;
    return;
  }

  // 데이터 축소(유실) 감지: 이전에 데이터가 있었는데 지금 전부 사라졌으면 차단
  const shrinkage = checkDataShrinkage();
  if (shrinkage.blocked) {
    console.warn('⚠️ 데이터 축소 감지, 동기화 차단:', shrinkage.details);
    showToast('⚠️ 데이터 손실 감지 — 동기화를 차단했습니다. 설정 > 동기화 백업에서 복원하세요.', 'error');
    appState.syncStatus = 'error';
    updateSyncIndicator();
    return;
  }

  try {
    isSyncing = true;
    pendingSync = false;
    appState.syncStatus = 'syncing';

    // 동기화 전 자동 백업 (데이터가 있을 때만 저장)
    createSyncBackup();

    const userDoc = window.firebaseDoc(window.firebaseDb, 'users', appState.user.uid);
    const writeTimestamp = new Date().toISOString();
    // { merge: true } — 텔레그램 봇 등 외부에서 추가한 필드(events 등) 보존
    await window.firebaseSetDoc(userDoc, {
      tasks: appState.tasks,
      settings: appState.settings,
      streak: appState.streak,
      habitStreaks: appState.habitStreaks || {},
      templates: appState.templates,
      availableTags: appState.availableTags,
      workProjects: appState.workProjects,
      workTemplates: appState.workTemplates,
      lifeRhythm: appState.lifeRhythm,
      commuteTracker: appState.commuteTracker,
      completionLog: appState.completionLog,
      weeklyPlan: appState.weeklyPlan,
      shuttleSuccess: appState.shuttleSuccess,
      theme: appState.theme,
      resolutions: appState.resolutions || [],
      deletedIds: appState.deletedIds,
      trash: appState.trash,
      _migrations: appState._migrations || {},
      lastUpdated: writeTimestamp
    }, { merge: true });

    // 핑퐁 방지: 자기가 쓴 timestamp 기록 → onSnapshot에서 자기 것인지 판별
    lastOwnWriteTimestamp = writeTimestamp;

    appState.syncStatus = 'synced';
    appState.lastSyncTime = new Date();
    updateSyncIndicator();

    // 성공적인 동기화 후 데이터 수 기록
    updateDataCounts();

    // 동기화 성공: 상태 아이콘(updateSyncIndicator)만으로 충분 — 토스트 제거
    // 에러 시에만 토스트 표시. 수동 동기화(forceSync)는 별도 토스트 유지.
  } catch (error) {
    console.error('동기화 실패:', error);
    appState.syncStatus = 'error';
    updateSyncIndicator();
  } finally {
    isSyncing = false;
    // 동기화 중 추가 변경이 있었으면 재동기화 (RC-4: 재귀 깊이 제한)
    if (pendingSync) {
      pendingSync = false;
      if (syncRetryCount < MAX_SYNC_RETRY) {
        syncRetryCount++;
        _doSyncToFirebase();
      } else {
        console.warn(`동기화 재시도 ${MAX_SYNC_RETRY}회 초과 — 중단. 다음 변경 시 재동기화됩니다.`);
        syncRetryCount = 0;
      }
    } else {
      syncRetryCount = 0;
    }
  }
}

// 라이프 리듬 히스토리 병합: js/rhythm.js로 분리됨
// 병합 유틸리티: js/firebase-merge.js로 분리됨
// 백업/복원: js/firebase-backup.js로 분리됨

async function loadFromFirebase() {
  if (!appState.user) return;

  // 진행 중인 saveState 디바운스 타이머 취소 (빈 데이터가 먼저 Firebase에 업로드되는 것 방지)
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = null;
  }
  // RC-2: 대기 중인 syncDebounceTimer도 취소 (병합 전 오래된 데이터 업로드 방지)
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }

  isLoadingFromCloud = true;

  try {
    appState.syncStatus = 'syncing';
    updateSyncIndicator();
    const userDoc = window.firebaseDoc(window.firebaseDb, 'users', appState.user.uid);
    const docSnap = await window.firebaseGetDoc(userDoc);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // 마이그레이션 플래그 병합 (양쪽 합집합 — 어느 기기에서든 완료된 마이그레이션은 유지)
      if (data._migrations) {
        appState._migrations = { ...(appState._migrations || {}), ...data._migrations };
      }

      // Soft-Delete: 삭제 기록 병합 (merge 전에 수행해야 삭제된 항목 필터링 가능)
      appState.deletedIds = mergeDeletedIds(appState.deletedIds, data.deletedIds);

      // 휴지통 병합 (ID 기준 합집합, 더 최근 deletedAt 우선, 영구삭제 항목 제외)
      if (Array.isArray(data.trash)) {
        const deletedTrash = appState.deletedIds.trash || {};
        const trashMap = new Map();
        (appState.trash || []).forEach(t => { if (!deletedTrash[t.id]) trashMap.set(t.id, t); });
        data.trash.forEach(t => {
          if (deletedTrash[t.id]) return; // 영구삭제된 항목은 병합에서 제외
          const existing = trashMap.get(t.id);
          if (!existing || (t.deletedAt && (!existing.deletedAt || t.deletedAt > existing.deletedAt))) {
            trashMap.set(t.id, t);
          }
        });
        appState.trash = Array.from(trashMap.values());
      }

      const cloudTasks = validateTasks(data.tasks || []);
      const localTasks = appState.tasks || [];

      // 태스크별 타임스탬프 기반 병합 (deletedIds 전달하여 삭제 항목 제외)
      appState.tasks = mergeTasks(localTasks, cloudTasks, appState.deletedIds.tasks);

      if (data.settings) {
        appState.settings = { ...appState.settings, ...data.settings };
      }
      if (data.streak) {
        // 스트릭은 더 높은 값 보존
        const cloudStreak = data.streak;
        appState.streak = {
          lastActiveDate: appState.streak.lastActiveDate > cloudStreak.lastActiveDate
            ? appState.streak.lastActiveDate : cloudStreak.lastActiveDate,
          best: Math.max(appState.streak.best || 0, cloudStreak.best || 0),
          current: appState.streak.lastActiveDate > cloudStreak.lastActiveDate
            ? appState.streak.current : cloudStreak.current
        };
      }
      // 습관별 스트릭 병합 (각 습관별 더 높은 값 보존)
      if (data.habitStreaks) {
        const local = appState.habitStreaks || {};
        const cloud = data.habitStreaks;
        const merged = { ...local };
        for (const [title, cs] of Object.entries(cloud)) {
          const ls = merged[title];
          if (!ls) {
            merged[title] = cs;
          } else {
            merged[title] = {
              lastActiveDate: (ls.lastActiveDate || '') > (cs.lastActiveDate || '') ? ls.lastActiveDate : cs.lastActiveDate,
              best: Math.max(ls.best || 0, cs.best || 0),
              current: (ls.lastActiveDate || '') > (cs.lastActiveDate || '') ? ls.current : cs.current,
            };
          }
        }
        appState.habitStreaks = merged;
      }
      // 템플릿: ID 기반 병합 (deletedIds 전달)
      appState.templates = mergeById(appState.templates, data.templates, appState.deletedIds.templates);
      if (data.availableTags) {
        // 태그 병합 (양쪽 합집합)
        const mergedTags = [...new Set([...(appState.availableTags || []), ...data.availableTags])];
        appState.availableTags = mergedTags;
      }
      // 본업 프로젝트: ID 기반 병합 (deletedIds 전달)
      appState.workProjects = mergeById(appState.workProjects, data.workProjects, appState.deletedIds.workProjects);
      if (appState.workProjects.length > 0 && !appState.activeWorkProject) {
        const activeProject = appState.workProjects.find(p => !p.archived);
        appState.activeWorkProject = activeProject ? activeProject.id : null;
      }
      // 본업 템플릿: ID 기반 병합 (deletedIds 전달)
      appState.workTemplates = mergeById(appState.workTemplates, data.workTemplates, appState.deletedIds.workTemplates);
      // 라이프 리듬 병합 (히스토리 필드별 병합, 오늘 데이터는 날짜 비교 후 병합)
      if (data.lifeRhythm) {
        const cloudRhythm = data.lifeRhythm;
        const localRhythm = appState.lifeRhythm;
        // 히스토리: 날짜별 + 필드별 병합 (양쪽 기록 보존)
        const mergedHistory = mergeRhythmHistory(localRhythm.history, cloudRhythm.history);
        // 오늘 데이터: 날짜 비교 후 병합 (날짜 다르면 오래된 쪽 → history 이동)
        const { today: mergedToday, history: updatedHistory } = mergeRhythmToday(
          localRhythm.today, cloudRhythm.today, mergedHistory
        );
        // settings 병합 시 medicationSlots는 로컬 우선 (마이그레이션 결과 보호)
        const mergedRhythmSettings = { ...(localRhythm.settings || {}), ...(cloudRhythm.settings || {}) };
        if (localRhythm.settings?.medicationSlots) {
          mergedRhythmSettings.medicationSlots = localRhythm.settings.medicationSlots;
        }
        appState.lifeRhythm = {
          ...localRhythm,
          history: updatedHistory,
          today: mergedToday,
          settings: mergedRhythmSettings
        };
        // 병합 결과를 localStorage에도 반영
        localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
      }
      // 통근 트래커 병합 (deletedIds 필터링 + updatedAt 기반 최신 우선)
      if (data.commuteTracker) {
        const cloud = data.commuteTracker;
        const local = appState.commuteTracker;
        const deletedRoutes = appState.deletedIds.commuteRoutes || {};
        const routeMap = {};
        (local.routes || []).forEach(r => { if (!deletedRoutes[r.id]) routeMap[r.id] = r; });
        (cloud.routes || []).forEach(r => {
          if (deletedRoutes[r.id]) return;
          const existing = routeMap[r.id];
          if (!existing) { routeMap[r.id] = r; return; }
          // updatedAt 비교: 최신 쪽 우선 (없으면 createdAt 폴백)
          const eTime = existing.updatedAt || existing.createdAt || '';
          const cTime = r.updatedAt || r.createdAt || '';
          if (cTime > eTime) routeMap[r.id] = r;
        });
        appState.commuteTracker.routes = Object.values(routeMap);
        // trips 깊은 병합: 날짜→방향 레벨로 합집합 (얕은 병합 시 같은 날짜의 다른 방향 유실)
        const cTrips = cloud.trips || {};
        const lTrips = local.trips || {};
        const deletedTrips = appState.deletedIds.commuteTrips || {};
        const mergedTrips = {};
        for (const date of new Set([...Object.keys(cTrips), ...Object.keys(lTrips)])) {
          const cd = cTrips[date] || {};
          const ld = lTrips[date] || {};
          mergedTrips[date] = {};
          for (const dir of new Set([...Object.keys(cd), ...Object.keys(ld)])) {
            // Soft-Delete: 삭제된 trip은 병합에서 제외
            if (deletedTrips[date + '|' + dir]) continue;
            const trip = ld[dir] || cd[dir];
            // 빈 trip 객체 스킵 (duration 없는 엔트리)
            if (trip && (trip.duration || trip.routeId)) {
              mergedTrips[date][dir] = trip;
            }
          }
          // 날짜에 유효한 trip이 없으면 날짜 키 제거
          if (Object.keys(mergedTrips[date]).length === 0) delete mergedTrips[date];
        }
        appState.commuteTracker.trips = mergedTrips;
        appState.commuteTracker.settings = { ...(cloud.settings || {}), ...(local.settings || {}) };
      }
      // 완료 기록 영구 로그 병합
      if (data.completionLog) {
        appState.completionLog = mergeCompletionLog(appState.completionLog, data.completionLog);
      }
      // 주간 계획 병합 (updatedAt 기반 최신 우선)
      if (data.weeklyPlan) {
        const cUp = data.weeklyPlan.updatedAt || '';
        const lUp = appState.weeklyPlan.updatedAt || '';
        if (cUp >= lUp) {
          appState.weeklyPlan = { ...appState.weeklyPlan, ...data.weeklyPlan };
        }
        // updatedAt 없는 구버전 데이터는 클라우드 우선
      }
      // 결심 트래커 병합 (ID 기반, deletedIds 전달)
      if (data.resolutions) {
        appState.resolutions = mergeById(appState.resolutions || [], data.resolutions, appState.deletedIds.resolutions);
      }
      // 셔틀/테마 동기화
      if (data.shuttleSuccess !== undefined) {
        appState.shuttleSuccess = data.shuttleSuccess;
      }
      if (data.theme) {
        appState.theme = data.theme;
      }

      // Firestore IndexedDB가 캐시 담당 → localStorage 캐싱 불필요

      appState.syncStatus = 'synced';

      // 병합 완료 후 숫자 ID → 문자열 마이그레이션 (클라우드 데이터 호환)
      migrateNumericIds();
      deduplicateAll();
      // 병합 완료 → 로드 잠금 해제 후 클라우드에 즉시 반영
      isLoadingFromCloud = false;
      // 클라우드 병합 완료 후 반복 태스크 일일 초기화 (Race Condition 방지)
      // checkDailyReset()은 이제 클라우드 데이터가 반영된 appState 기준으로 동작
      if (!initialCloudLoadComplete) {
        initialCloudLoadComplete = true;
        const resetDone = checkDailyReset();
        if (resetDone) recomputeTodayStats();
        console.log('[cloud-load] 최초 클라우드 로드 완료 → checkDailyReset 실행');
      }
      // RC-1: syncToFirebase(true)가 최신 전체 데이터를 업로드하므로 대기 예약 불필요
      pendingSync = false;
      updateDataCounts();
      syncToFirebase(true);
    } else {
      // 클라우드에 데이터 없으면 현재 로컬 데이터 즉시 업로드
      isLoadingFromCloud = false;
      if (!initialCloudLoadComplete) {
        initialCloudLoadComplete = true;
        const resetDone = checkDailyReset();
        if (resetDone) recomputeTodayStats();
        console.log('[cloud-load] 클라우드 데이터 없음 → checkDailyReset 실행 (로컬 기반)');
      }
      pendingSync = false;
      updateDataCounts();
      syncToFirebase(true);
    }

    appState.lastSyncTime = new Date();
    updateSyncIndicator();
  } catch (error) {
    console.error('데이터 로드 실패:', error);
    appState.syncStatus = 'error';
    updateSyncIndicator();
  } finally {
    // 에러 시에도 로드 잠금 해제 보장
    isLoadingFromCloud = false;
  }
}

/**
 * 실시간 동기화 시작
 */
let realtimeReconnectCount = 0;
const MAX_REALTIME_RECONNECT = 5;

function startRealtimeSync() {
  if (!appState.user || unsubscribeSnapshot) return;

  const userDoc = window.firebaseDoc(window.firebaseDb, 'users', appState.user.uid);
  unsubscribeSnapshot = window.firebaseOnSnapshot(userDoc, (doc) => {
    // 연결 성공 시 재연결 카운터 리셋
    realtimeReconnectCount = 0;

    // RC-3: loadFromFirebase 진행 중에는 onSnapshot이 appState를 동시 수정하지 않도록 차단
    if (doc.exists() && !isSyncing && !isLoadingFromCloud) {
      const data = doc.data();

      // 핑퐁 방지: 자기가 방금 쓴 데이터면 스킵 (다른 기기 데이터는 항상 수신)
      // 기존 시간 비교(cloudUpdated > lastSyncTime)는 기기 간 시계 차이로 정당한 업데이트를 차단하는 버그가 있었음
      if (lastOwnWriteTimestamp && data.lastUpdated === lastOwnWriteTimestamp) {
        return; // 자기가 쓴 것 — 무시
      }

      try {
        // 마이그레이션 플래그 병합
        if (data._migrations) {
          appState._migrations = { ...(appState._migrations || {}), ...data._migrations };
        }
        // Soft-Delete: 삭제 기록 병합 (merge 전에 수행)
        if (data.deletedIds) {
          appState.deletedIds = mergeDeletedIds(appState.deletedIds, data.deletedIds);
        }
        // 휴지통 실시간 병합 (영구삭제 항목 제외)
        if (Array.isArray(data.trash)) {
          const deletedTrash = appState.deletedIds.trash || {};
          const trashMap = new Map();
          (appState.trash || []).forEach(t => { if (!deletedTrash[t.id]) trashMap.set(t.id, t); });
          data.trash.forEach(t => {
            if (deletedTrash[t.id]) return;
            const existing = trashMap.get(t.id);
            if (!existing || (t.deletedAt && (!existing.deletedAt || t.deletedAt > existing.deletedAt))) {
              trashMap.set(t.id, t);
            }
          });
          appState.trash = Array.from(trashMap.values());
        }
        if (data.tasks) {
          // 태스크별 병합 (deletedIds 전달하여 삭제 항목 제외)
          const cloudTasks = validateTasks(data.tasks);
          appState.tasks = mergeTasks(appState.tasks, cloudTasks, appState.deletedIds.tasks);
        }
        if (data.settings) {
          appState.settings = { ...appState.settings, ...data.settings };
        }
        if (data.streak) {
          const cloudStreak = data.streak;
          appState.streak = {
            lastActiveDate: appState.streak.lastActiveDate > cloudStreak.lastActiveDate
              ? appState.streak.lastActiveDate : cloudStreak.lastActiveDate,
            best: Math.max(appState.streak.best || 0, cloudStreak.best || 0),
            current: appState.streak.lastActiveDate > cloudStreak.lastActiveDate
              ? appState.streak.current : cloudStreak.current
          };
        }
        // 습관별 스트릭 병합 (onSnapshot)
        if (data.habitStreaks) {
          const local = appState.habitStreaks || {};
          const cloud = data.habitStreaks;
          const merged = { ...local };
          for (const [title, cs] of Object.entries(cloud)) {
            const ls = merged[title];
            if (!ls) {
              merged[title] = cs;
            } else {
              merged[title] = {
                lastActiveDate: (ls.lastActiveDate || '') > (cs.lastActiveDate || '') ? ls.lastActiveDate : cs.lastActiveDate,
                best: Math.max(ls.best || 0, cs.best || 0),
                current: (ls.lastActiveDate || '') > (cs.lastActiveDate || '') ? ls.current : cs.current,
              };
            }
          }
          appState.habitStreaks = merged;
        }
        // 템플릿: ID 기반 병합 (deletedIds 전달)
        appState.templates = mergeById(appState.templates, data.templates, appState.deletedIds.templates);
        if (data.availableTags) {
          appState.availableTags = [...new Set([...(appState.availableTags || []), ...data.availableTags])];
        }
        // 본업 프로젝트: ID 기반 병합 (deletedIds 전달)
        appState.workProjects = mergeById(appState.workProjects, data.workProjects, appState.deletedIds.workProjects);
        // 본업 템플릿: ID 기반 병합 (deletedIds 전달)
        appState.workTemplates = mergeById(appState.workTemplates, data.workTemplates, appState.deletedIds.workTemplates);
        // 라이프 리듬 병합 (날짜 비교 포함)
        if (data.lifeRhythm) {
          const cloudRhythm = data.lifeRhythm;
          const localRhythm = appState.lifeRhythm;
          const mergedHistory = mergeRhythmHistory(localRhythm.history, cloudRhythm.history);
          // 오늘 데이터: 날짜 비교 후 병합 (날짜 다르면 오래된 쪽 → history 이동)
          const { today: mergedToday, history: updatedHistory } = mergeRhythmToday(
            localRhythm.today, cloudRhythm.today, mergedHistory
          );
          // settings 병합 시 medicationSlots는 로컬 우선 (마이그레이션 결과 보호)
          const mergedRhythmSettingsRT = { ...(localRhythm.settings || {}), ...(cloudRhythm.settings || {}) };
          if (localRhythm.settings?.medicationSlots) {
            mergedRhythmSettingsRT.medicationSlots = localRhythm.settings.medicationSlots;
          }
          appState.lifeRhythm = {
            ...localRhythm,
            history: updatedHistory,
            today: mergedToday,
            settings: mergedRhythmSettingsRT
          };
          // 병합 결과를 localStorage에도 반영 — 새로고침 시 이전 데이터로 되돌아가는 문제 방지
          localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
        }
        // 통근 트래커 병합 (실시간 동기화, deletedIds 필터링 + updatedAt 최신 우선)
        if (data.commuteTracker) {
          const cloud = data.commuteTracker;
          const local = appState.commuteTracker;
          const deletedRoutes = appState.deletedIds.commuteRoutes || {};
          const routeMap = {};
          (local.routes || []).forEach(r => { if (!deletedRoutes[r.id]) routeMap[r.id] = r; });
          (cloud.routes || []).forEach(r => {
            if (deletedRoutes[r.id]) return;
            const existing = routeMap[r.id];
            if (!existing) { routeMap[r.id] = r; return; }
            const eTime = existing.updatedAt || existing.createdAt || '';
            const cTime = r.updatedAt || r.createdAt || '';
            if (cTime > eTime) routeMap[r.id] = r;
          });
          appState.commuteTracker.routes = Object.values(routeMap);
          // trips 깊은 병합: 날짜→방향 레벨 합집합 (얕은 병합 시 같은 날짜의 다른 방향 유실)
          const cTrips = cloud.trips || {};
          const lTrips = local.trips || {};
          const deletedTripsRT = appState.deletedIds.commuteTrips || {};
          const mergedTrips = {};
          for (const date of new Set([...Object.keys(cTrips), ...Object.keys(lTrips)])) {
            const cd = cTrips[date] || {};
            const ld = lTrips[date] || {};
            mergedTrips[date] = {};
            for (const dir of new Set([...Object.keys(cd), ...Object.keys(ld)])) {
              // Soft-Delete: 삭제된 trip은 병합에서 제외
              if (deletedTripsRT[date + '|' + dir]) continue;
              const trip = ld[dir] || cd[dir];
              // 빈 trip 객체 스킵 (duration 없는 엔트리)
              if (trip && (trip.duration || trip.routeId)) {
                mergedTrips[date][dir] = trip;
              }
            }
            if (Object.keys(mergedTrips[date]).length === 0) delete mergedTrips[date];
          }
          appState.commuteTracker.trips = mergedTrips;
          // 설정: cloud 기반 + 로컬 덮어쓰기
          appState.commuteTracker.settings = { ...(cloud.settings || {}), ...(local.settings || {}) };
          localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
        }
        // 완료 기록 영구 로그 병합
        if (data.completionLog) {
          appState.completionLog = mergeCompletionLog(appState.completionLog, data.completionLog);
        }
        // 주간 계획 병합 (updatedAt 기반 최신 우선)
        if (data.weeklyPlan) {
          const cUp = data.weeklyPlan.updatedAt || '';
          const lUp = appState.weeklyPlan.updatedAt || '';
          if (cUp >= lUp) {
            appState.weeklyPlan = { ...appState.weeklyPlan, ...data.weeklyPlan };
          }
        }
        // 결심 트래커 병합 (ID 기반, deletedIds 전달)
        if (data.resolutions) {
          appState.resolutions = mergeById(appState.resolutions || [], data.resolutions, appState.deletedIds.resolutions);
        }
        if (data.shuttleSuccess !== undefined) {
          appState.shuttleSuccess = data.shuttleSuccess;
        }
        if (data.theme) {
          appState.theme = data.theme;
        }

        appState.lastSyncTime = new Date(data.lastUpdated);
        appState.syncStatus = 'synced';

        // 숫자 ID → 문자열 ID 마이그레이션 (다른 기기에서 온 데이터 포함)
        migrateNumericIds();
        deduplicateAll();

        // 오늘 통계 재계산
        recomputeTodayStats();

        // 병합 결과를 localStorage에 백업 (브라우저 크래시 대비)
        _doSaveStateLocalOnly();

        renderStatic();
        updateSyncIndicator();

        // syncBack: 병합 결과를 Firebase에 업로드 — 3대+ 기기 비대칭 해소
        // 디바운스(1.5초) 적용하여 짧은 시간 내 연속 onSnapshot에 대한 과도한 업로드 방지
        // 핑퐁 방지: syncToFirebase → lastOwnWriteTimestamp 갱신 → 다음 onSnapshot에서 자기 쓰기 스킵
        syncToFirebase();

        // 첫 로드 플래그
        if (isFirstRealtimeLoad) {
          isFirstRealtimeLoad = false;
        }
      } catch (mergeError) {
        console.error('실시간 동기화 병합 중 오류:', mergeError);
        // 병합 실패해도 로컬 데이터 보존 — 다음 onSnapshot에서 재시도
      }
    }
  }, (error) => {
    // onSnapshot 에러 콜백 — 리스너 실패 감지 (권한 오류, 네트워크 단절 등)
    console.error('실시간 동기화 리스너 오류:', error);
    appState.syncStatus = 'error';
    updateSyncIndicator();
    unsubscribeSnapshot = null;
    // 자동 재연결 (5초 후, 최대 MAX_REALTIME_RECONNECT회)
    if (realtimeReconnectCount < MAX_REALTIME_RECONNECT) {
      realtimeReconnectCount++;
      setTimeout(() => {
        if (appState.user && !unsubscribeSnapshot) {
          console.log(`[sync] 리스너 재연결 시도 (${realtimeReconnectCount}/${MAX_REALTIME_RECONNECT})...`);
          startRealtimeSync();
        }
      }, 5000);
    } else {
      console.warn(`[sync] 리스너 재연결 ${MAX_REALTIME_RECONNECT}회 초과 — 페이지 새로고침 필요`);
    }
  });
}

/**
 * 동기화 상태 표시 업데이트
 */
function updateSyncIndicator() {
  const indicator = document.getElementById('sync-indicator');
  if (!indicator) return;

  const statusMap = {
    'offline': { icon: '☁️', text: '오프라인', color: 'var(--text-muted)' },
    'syncing': { icon: '🔄', text: '동기화 중...', color: 'var(--accent-primary)' },
    'synced': { icon: '✅', text: '동기화됨', color: 'var(--accent-success)' },
    'error': { icon: '⚠️', text: '동기화 오류', color: 'var(--accent-danger)' }
  };

  const status = statusMap[appState.syncStatus] || statusMap['offline'];
  indicator.innerHTML = status.icon + ' ' + status.text;
  indicator.style.color = status.color;
}

/**
 * 동기화 진단: 로컬 vs 서버 데이터 비교
 * 콘솔에서 diagnoseSyncIssue() 호출
 */
async function diagnoseSyncIssue() {
  console.group('🔍 동기화 진단');

  // 1. 로그인 상태
  if (!appState.user) {
    console.error('❌ 로그인 안 됨 — 동기화 불가');
    console.groupEnd();
    return;
  }
  if (!window.firebaseDb || !window.firebaseGetDocFromServer) {
    console.error('❌ Firebase SDK 미초기화 — 페이지 로딩 완료 후 다시 시도하세요');
    console.groupEnd();
    return;
  }
  console.log('✅ 로그인:', appState.user.email, '(UID:', appState.user.uid + ')');

  // 2. 로컬 데이터 현황
  console.log('📱 로컬 데이터:', {
    tasks: appState.tasks.length,
    workProjects: appState.workProjects.length,
    templates: (appState.templates || []).length,
    syncStatus: appState.syncStatus,
    lastSyncTime: appState.lastSyncTime
  });

  // 3. 서버 데이터 직접 조회 (캐시 바이패스)
  try {
    const userDoc = window.firebaseDoc(window.firebaseDb, 'users', appState.user.uid);
    console.log('⏳ 서버에서 직접 조회 중 (캐시 바이패스)...');
    const serverSnap = await window.firebaseGetDocFromServer(userDoc);

    if (!serverSnap.exists()) {
      console.error('❌ 서버에 문서 없음 — 데이터가 Firebase에 도달하지 못했을 수 있음');
      console.groupEnd();
      return;
    }

    const serverData = serverSnap.data();
    const serverTasks = (serverData.tasks || []).length;
    const serverWP = (serverData.workProjects || []).length;
    const serverUpdated = serverData.lastUpdated;

    // Firestore Timestamp 객체 또는 ISO 문자열 모두 처리
    let ageStr = 'N/A';
    if (serverUpdated) {
      const ts = typeof serverUpdated.toDate === 'function' ? serverUpdated.toDate() : new Date(serverUpdated);
      const ageSec = Math.round((Date.now() - ts.getTime()) / 1000);
      ageStr = isNaN(ageSec) ? '알 수 없음' : ageSec + '초 전';
    }

    console.log('☁️ 서버 데이터:', {
      tasks: serverTasks,
      workProjects: serverWP,
      lastUpdated: serverUpdated,
      age: ageStr
    });

    // 4. 차이 분석
    const localTaskIds = new Set(appState.tasks.filter(t => t.id).map(t => t.id));
    const serverTaskIds = new Set((serverData.tasks || []).filter(t => t.id).map(t => t.id));
    const onlyLocal = [...localTaskIds].filter(id => !serverTaskIds.has(id));
    const onlyServer = [...serverTaskIds].filter(id => !localTaskIds.has(id));

    if (onlyLocal.length > 0) {
      console.warn('⚠️ 로컬에만 있는 태스크:', onlyLocal.length + '개');
      onlyLocal.forEach(id => {
        const t = appState.tasks.find(task => task.id === id);
        console.log('  - ' + (t ? t.title || t.id : id));
      });
    }
    if (onlyServer.length > 0) {
      console.warn('⚠️ 서버에만 있는 태스크:', onlyServer.length + '개');
      (serverData.tasks || []).filter(t => onlyServer.includes(t.id)).forEach(t => {
        console.log('  - ' + (t.title || t.id));
      });
    }
    if (onlyLocal.length === 0 && onlyServer.length === 0) {
      console.log('✅ 로컬과 서버 태스크 ID 일치 (' + localTaskIds.size + '개)');
    }

    // 5. 리스너 상태
    console.log('👂 실시간 리스너:', unsubscribeSnapshot ? '활성' : '비활성');
    console.log('🔒 동기화 플래그:', { isSyncing, isLoadingFromCloud, pendingSync, initialCloudLoadComplete });

  } catch (error) {
    if (error.code === 'unavailable') {
      console.error('❌ Firebase 서버 연결 불가 — 네트워크 차단 가능성 (회사 방화벽?)');
      console.error('   Firestore는 로컬 캐시로만 동작 중 → "동기화됨" 표시되지만 실제 서버에 미도달');
    } else if (error.code === 'permission-denied') {
      console.error('❌ Firebase 권한 거부 — Security Rules 확인 필요');
    } else {
      console.error('❌ 서버 조회 실패:', error.code || error.name, error.message);
    }
  }

  console.groupEnd();
}
window.diagnoseSyncIssue = diagnoseSyncIssue;

