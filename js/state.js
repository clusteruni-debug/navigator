// ============================================
// 로컬스토리지 관리
// ============================================

/**
 * 로컬스토리지에서 데이터 로드
 * 에러 처리 포함
 */
function loadState() {
  try {
    const savedTasks = localStorage.getItem('navigator-tasks');
    const isFirstVisit = !savedTasks && !localStorage.getItem('navigator-visited');

    // 🔐 작업 데이터 검증 후 로드
    if (savedTasks) {
      const parsedTasks = safeParseJSON('navigator-tasks', []);
      appState.tasks = validateTasks(parsedTasks);
    }

    // 🔐 boolean 검증
    const savedShuttle = localStorage.getItem('navigator-shuttle');
    if (savedShuttle) {
      appState.shuttleSuccess = Boolean(safeParseJSON('navigator-shuttle', false));
    }

    // 테마 로드
    const savedTheme = localStorage.getItem('navigator-theme');
    if (savedTheme) {
      appState.theme = savedTheme;
    }
    applyTheme();

    // 태그 로드
    const parsedTags = safeParseJSON('navigator-tags', null);
    if (parsedTags) appState.availableTags = parsedTags;

    // 주최자 목록 로드
    const parsedOrganizers = safeParseJSON('navigator-organizer-list', null);
    if (parsedOrganizers) appState.organizerList = parsedOrganizers;

    // 스트릭 로드
    const parsedStreak = safeParseJSON('navigator-streak', null);
    if (parsedStreak) appState.streak = parsedStreak;
    updateStreak();

    // 습관별 스트릭 로드
    const parsedHabitStreaks = safeParseJSON('navigator-habitStreaks', null);
    if (parsedHabitStreaks) appState.habitStreaks = parsedHabitStreaks;

    // 결심 트래커 로드
    const parsedResolutions = safeParseJSON('navigator-resolutions', null);
    if (parsedResolutions) appState.resolutions = parsedResolutions;

    // 설정 로드
    const parsedSettings = safeParseJSON('navigator-settings', null);
    if (parsedSettings) appState.settings = { ...appState.settings, ...parsedSettings };

    // 템플릿 로드
    const parsedTemplates = safeParseJSON('navigator-templates', null);
    if (parsedTemplates) appState.templates = parsedTemplates;

    // 주간 계획 로드
    const parsedWeeklyPlan = safeParseJSON('navigator-weekly-plan', null);
    if (parsedWeeklyPlan) appState.weeklyPlan = { ...appState.weeklyPlan, ...parsedWeeklyPlan };

    // 본업 프로젝트 로드
    const parsedWorkProjects = safeParseJSON('navigator-work-projects', null);
    if (parsedWorkProjects) {
      appState.workProjects = parsedWorkProjects;
      // 첫 프로젝트 자동 선택
      if (appState.workProjects.length > 0 && !appState.activeWorkProject) {
        const activeProject = appState.workProjects.find(p => !p.archived);
        appState.activeWorkProject = activeProject ? activeProject.id : null;
      }
    }

    // 본업 템플릿 로드
    const parsedWorkTemplates = safeParseJSON('navigator-work-templates', null);
    if (parsedWorkTemplates) appState.workTemplates = parsedWorkTemplates;

    // 라이프 리듬 로드
    loadLifeRhythm();

    // 통근 트래커 로드
    loadCommuteTracker();

    // 완료 기록 영구 로그 로드 + 1년 이상 데이터 압축
    loadCompletionLog();
    compactOldCompletionLog();

    // Soft-Delete 추적 데이터 로드
    const parsedDeletedIds = safeParseJSON('navigator-deleted-ids', null);
    if (parsedDeletedIds) appState.deletedIds = parsedDeletedIds;
    // 30일 이상 된 deletedIds 자동 정리
    cleanupOldDeletedIds();

    // 휴지통 로드 + 30일 자동 정리
    const parsedTrash = safeParseJSON('navigator-trash', null);
    if (Array.isArray(parsedTrash)) appState.trash = parsedTrash;
    cleanupOldTrash();

    // 오늘 완료한 작업 수 계산
    recomputeTodayStats();

    // 오래된 완료 태스크 정리
    cleanupOldCompletedTasks();

    // Firestore 용량 관리: 오래된 리듬/통근 데이터 프루닝 (최근 백업이 있을 때만)
    runStartupPruning();

    // 반복 태스크 일일 초기화는 클라우드 데이터 로드 후 실행
    // (클라우드 로드 전 실행하면 updatedAt 갱신으로 다른 기기의 오늘 완료 기록이 merge에서 패배)
    // → initialCloudLoadComplete 플래그로 loadFromFirebase() 완료 후 checkDailyReset() 호출
    // → 비로그인/타임아웃 대비 fallback은 firebase-ready 리스너 하단에서 처리

    // 첫 방문 시 온보딩
    if (isFirstVisit) {
      setTimeout(() => showOnboarding(), 500);
    }

    // 기존 숫자 ID → 문자열 마이그레이션 (crypto.randomUUID 전환 호환)
    migrateNumericIds();

    // 중복 항목 제거 (ID 타입 불일치 병합 버그로 생긴 중복 정리)
    deduplicateAll();

    // 백업 리마인더 체크
    checkBackupReminder();

    // 데이터 유실 자동 감지: localStorage가 비어있지만 동기화 백업에 데이터가 있으면 복구 제안
    const shrinkage = checkDataShrinkage();
    if (shrinkage.blocked) {
      console.warn('[startup] 데이터 유실 감지:', shrinkage.details);
      setTimeout(() => {
        if (confirm(
          '⚠️ 데이터 유실이 감지되었습니다.\n\n' +
          shrinkage.details + '\n\n' +
          '동기화 백업에서 복원하시겠습니까?'
        )) {
          restoreFromSyncBackup();
        }
      }, 1000);
    }

  } catch (error) {
    console.error('데이터 로드 실패:', error);
    showToast('데이터 로드 중 오류가 발생했습니다', 'error');
  }
}

/**
 * 로컬스토리지에 데이터 저장 (실제 저장 로직)
 */
function _doSaveState(immediate = false) {
  try {
    // 로그인 사용자: Firestore IndexedDB가 주 저장소 → localStorage 캐싱 스킵
    // 비로그인 또는 IndexedDB 사용 불가(프라이빗 브라우징): localStorage 폴백
    if (!appState.user || !isIndexedDBAvailable) {
      localStorage.setItem('navigator-tasks', JSON.stringify(appState.tasks));
      localStorage.setItem('navigator-shuttle', JSON.stringify(appState.shuttleSuccess));
      localStorage.setItem('navigator-theme', appState.theme);
      localStorage.setItem('navigator-tags', JSON.stringify(appState.availableTags));
      localStorage.setItem('navigator-organizer-list', JSON.stringify(appState.organizerList || []));
      localStorage.setItem('navigator-settings', JSON.stringify(appState.settings));
      localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
      localStorage.setItem('navigator-habitStreaks', JSON.stringify(appState.habitStreaks || {}));
      localStorage.setItem('navigator-templates', JSON.stringify(appState.templates));
      localStorage.setItem('navigator-weekly-plan', JSON.stringify(appState.weeklyPlan));
      localStorage.setItem('navigator-work-projects', JSON.stringify(appState.workProjects));
      localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
      localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
      localStorage.setItem('navigator-completion-log', JSON.stringify(appState.completionLog));
      localStorage.setItem('navigator-deleted-ids', JSON.stringify(appState.deletedIds));
      localStorage.setItem('navigator-trash', JSON.stringify(appState.trash));
      localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
      localStorage.setItem('navigator-resolutions', JSON.stringify(appState.resolutions || []));
    }

    // Firebase 동기화 (로그인된 경우, 디바운스 적용)
    if (appState.user) {
      syncToFirebase(immediate);
    }
  } catch (error) {
    console.error('데이터 저장 실패:', error);
    showToast('데이터 저장 중 오류가 발생했습니다', 'error');
  }
}

// 디바운스된 저장 (연속 입력 시 500ms 후 한 번만 저장)
let saveStateTimeout = null;
function saveState() {
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
  }
  saveStateTimeout = setTimeout(() => {
    _doSaveState();
    saveStateTimeout = null;
  }, 500);
}

// 즉시 저장이 필요한 경우 (앱 종료 전 등)
// 디바운스된 sync 타이머도 취소하고 즉시 동기화
function saveStateImmediate() {
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = null;
  }
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  _doSaveState(true);
}

// localStorage에만 동기적으로 저장 (Firebase 호출 없음)
// beforeunload에서 사용 — async setDoc은 브라우저가 기다리지 않으므로
function _doSaveStateLocalOnly() {
  try {
    localStorage.setItem('navigator-tasks', JSON.stringify(appState.tasks));
    localStorage.setItem('navigator-shuttle', JSON.stringify(appState.shuttleSuccess));
    localStorage.setItem('navigator-theme', appState.theme);
    localStorage.setItem('navigator-tags', JSON.stringify(appState.availableTags));
    localStorage.setItem('navigator-organizer-list', JSON.stringify(appState.organizerList || []));
    localStorage.setItem('navigator-settings', JSON.stringify(appState.settings));
    localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
    localStorage.setItem('navigator-habitStreaks', JSON.stringify(appState.habitStreaks || {}));
    localStorage.setItem('navigator-templates', JSON.stringify(appState.templates));
    localStorage.setItem('navigator-weekly-plan', JSON.stringify(appState.weeklyPlan));
    localStorage.setItem('navigator-work-projects', JSON.stringify(appState.workProjects));
    localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
    localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
    localStorage.setItem('navigator-completion-log', JSON.stringify(appState.completionLog));
    localStorage.setItem('navigator-deleted-ids', JSON.stringify(appState.deletedIds));
    localStorage.setItem('navigator-trash', JSON.stringify(appState.trash));
    // 라이프 리듬도 로컬 백업 (beforeunload 시 유실 방지)
    localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
    localStorage.setItem('navigator-resolutions', JSON.stringify(appState.resolutions || []));
  } catch (error) {
    console.error('로컬 저장 실패:', error);
  }
}

