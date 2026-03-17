// ============================================
// 백업/복원
// ============================================

/**
 * JSON으로 데이터 내보내기
 */
function exportData() {
  try {
    const data = {
      version: '2.4',
      exportDate: new Date().toISOString(),
      tasks: appState.tasks,
      shuttleSuccess: appState.shuttleSuccess,
      availableTags: appState.availableTags,
      streak: appState.streak,
      habitStreaks: appState.habitStreaks || {},
      theme: appState.theme,
      settings: appState.settings,
      templates: appState.templates,
      workProjects: appState.workProjects,
      workTemplates: appState.workTemplates,
      lifeRhythm: appState.lifeRhythm,
      commuteTracker: appState.commuteTracker,
      weeklyPlan: appState.weeklyPlan,
      completionLog: appState.completionLog,
      trash: appState.trash
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob(['\uFEFF' + json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `navigator-backup-${getLocalDateStr()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    // 백업/아카이브 시간 기록 (프루닝 안전 게이트에 사용)
    localStorage.setItem('navigator-last-backup', new Date().toISOString());
    localStorage.setItem('navigator-last-archive-date', new Date().toISOString());

    showToast('📦 백업 완료!', 'success');
  } catch (error) {
    console.error('내보내기 실패:', error);
    showToast('백업 생성 중 오류가 발생했습니다', 'error');
  }
}

/**
 * JSON에서 데이터 가져오기
 */
function importData() {
  const input = document.getElementById('file-import');
  input.value = ''; // 같은 파일 재선택 가능하도록 초기화
  input.click();
}

/**
 * 파일 선택 시 처리
 */
function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  // JSON 파일만 허용
  if (!file.name.endsWith('.json') && !file.type.includes('json')) {
    showToast('JSON 파일만 가져올 수 있습니다', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      // BOM 제거 후 파싱
      let text = event.target.result;
      if (typeof text !== 'string') { showToast('파일을 읽을 수 없습니다', 'error'); return; }
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const data = JSON.parse(text);

      // 데이터 유효성 검사
      if (!data.tasks || !Array.isArray(data.tasks)) {
        throw new Error('잘못된 파일 형식입니다');
      }

      const importedTasks = validateTasks(data.tasks);
      const choice = confirm(
        `${importedTasks.length}개의 태스크를 가져옵니다.\n\n` +
        `[확인] = 기존 데이터와 병합 (추천)\n` +
        `[취소] = 가져오기 취소`
      );

      if (choice) {
        // 병합 (태스크별 타임스탬프 기반)
        appState.tasks = mergeTasks(appState.tasks, importedTasks);
        if (data.shuttleSuccess !== undefined) {
          appState.shuttleSuccess = data.shuttleSuccess;
        }
        if (data.availableTags) {
          appState.availableTags = [...new Set([...(appState.availableTags || []), ...data.availableTags])];
        }
        if (data.streak) {
          appState.streak = {
            lastActiveDate: appState.streak.lastActiveDate > data.streak.lastActiveDate
              ? appState.streak.lastActiveDate : data.streak.lastActiveDate,
            best: Math.max(appState.streak.best || 0, data.streak.best || 0),
            current: appState.streak.lastActiveDate > data.streak.lastActiveDate
              ? appState.streak.current : data.streak.current
          };
        }
        // 습관별 스트릭 병합 (파일 임포트)
        if (data.habitStreaks) {
          const local = appState.habitStreaks || {};
          const imported = data.habitStreaks;
          const merged = { ...local };
          for (const [title, is] of Object.entries(imported)) {
            const ls = merged[title];
            if (!ls) {
              merged[title] = is;
            } else {
              merged[title] = {
                lastActiveDate: (ls.lastActiveDate || '') > (is.lastActiveDate || '') ? ls.lastActiveDate : is.lastActiveDate,
                best: Math.max(ls.best || 0, is.best || 0),
                current: (ls.lastActiveDate || '') > (is.lastActiveDate || '') ? ls.current : is.current,
              };
            }
          }
          appState.habitStreaks = merged;
        }
        // 본업 프로젝트/템플릿 병합
        if (data.workProjects && Array.isArray(data.workProjects)) {
          const localProjectIds = new Set((appState.workProjects || []).map(p => p.id));
          const newProjects = data.workProjects.filter(p => !localProjectIds.has(p.id));
          appState.workProjects = [...(appState.workProjects || []), ...newProjects];
        }
        if (data.workTemplates && Array.isArray(data.workTemplates)) {
          const localTemplateIds = new Set((appState.workTemplates || []).map(t => t.id));
          const newTemplates = data.workTemplates.filter(t => !localTemplateIds.has(t.id));
          appState.workTemplates = [...(appState.workTemplates || []), ...newTemplates];
        }
        if (data.templates && Array.isArray(data.templates)) {
          const localTplIds = new Set((appState.templates || []).map(t => t.id));
          const newTpls = data.templates.filter(t => !localTplIds.has(t.id));
          appState.templates = [...(appState.templates || []), ...newTpls];
        }
        if (data.settings) {
          appState.settings = { ...appState.settings, ...data.settings };
        }
        // 라이프 리듬 병합 (날짜 비교 포함)
        if (data.lifeRhythm) {
          const importRhythm = data.lifeRhythm;
          const localRhythm = appState.lifeRhythm;
          const mergedHistory = { ...(localRhythm.history || {}), ...(importRhythm.history || {}) };
          const { today: mergedToday, history: updatedHistory } = mergeRhythmToday(
            localRhythm.today, importRhythm.today, mergedHistory
          );
          appState.lifeRhythm = {
            ...localRhythm,
            history: updatedHistory,
            today: mergedToday,
            settings: { ...(localRhythm.settings || {}), ...(importRhythm.settings || {}) }
          };
          saveLifeRhythm();
        }
      // 통근 트래커 병합 (deletedIds 필터링 + updatedAt 최신 우선)
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
        const mergedTrips = { ...(cloud.trips || {}), ...(local.trips || {}) };
        appState.commuteTracker.trips = mergedTrips;
        appState.commuteTracker.settings = { ...(cloud.settings || {}), ...(local.settings || {}) };
        localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
      }
        // 완료 기록 로그 병합
        if (data.completionLog) {
          appState.completionLog = mergeCompletionLog(appState.completionLog, data.completionLog);
        }
        // 주간 계획 병합
        if (data.weeklyPlan) {
          appState.weeklyPlan = data.weeklyPlan;
        }
        // 휴지통 병합
        if (Array.isArray(data.trash)) {
          const trashMap = new Map();
          (appState.trash || []).forEach(t => trashMap.set(t.id, t));
          data.trash.forEach(t => {
            if (!trashMap.has(t.id)) trashMap.set(t.id, t);
          });
          appState.trash = Array.from(trashMap.values());
        }
        saveState();
        recomputeTodayStats();
        renderStatic();
        showToast(`${importedTasks.length}개 태스크를 병합했습니다`, 'success');
      }
    } catch (error) {
      console.error('가져오기 실패:', error);
      showToast('파일을 읽을 수 없습니다', 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');

  // 인풋 초기화 (같은 파일 다시 선택 가능하게)
  e.target.value = '';
}

// ============================================
// Firestore 용량 관리: 자동 프루닝
// ============================================

/**
 * 오래된 라이프 리듬 히스토리 프루닝 (기본 2년)
 * 안전 게이트: 최근 30일 내 백업(Export)이 있어야만 실행
 */
function pruneOldRhythmHistory(years = 2) {
  if (!_isArchiveSafe()) return 0;
  const history = appState.lifeRhythm?.history;
  if (!history || typeof history !== 'object') return 0;

  const cutoff = _getCutoffDate(years);
  let pruned = 0;
  for (const dateKey of Object.keys(history)) {
    if (dateKey < cutoff) {
      delete history[dateKey];
      pruned++;
    }
  }
  if (pruned > 0) {
    saveLifeRhythm();
    console.log(`[Prune] lifeRhythm.history: ${pruned} entries older than ${cutoff} removed`);
  }
  return pruned;
}

/**
 * 오래된 통근 트립 프루닝 (기본 2년)
 * 안전 게이트: 최근 30일 내 백업(Export)이 있어야만 실행
 */
function pruneOldCommuteTrips(years = 2) {
  if (!_isArchiveSafe()) return 0;
  const trips = appState.commuteTracker?.trips;
  if (!trips || typeof trips !== 'object') return 0;

  const cutoff = _getCutoffDate(years);
  let pruned = 0;
  for (const dateKey of Object.keys(trips)) {
    if (dateKey < cutoff) {
      delete trips[dateKey];
      pruned++;
    }
  }
  if (pruned > 0) {
    localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
    console.log(`[Prune] commuteTracker.trips: ${pruned} entries older than ${cutoff} removed`);
  }
  return pruned;
}

/**
 * 앱 시작 시 호출: 안전한 경우에만 자동 프루닝
 */
function runStartupPruning() {
  const rh = pruneOldRhythmHistory(2);
  const ct = pruneOldCommuteTrips(2);
  if (rh > 0 || ct > 0) {
    console.log(`[Prune] Startup pruning: rhythm=${rh}, commute=${ct}`);
  }
}

/** 안전 게이트: 최근 30일 내 아카이브(Export)가 있는지 확인 */
function _isArchiveSafe() {
  const lastArchive = localStorage.getItem('navigator-last-archive-date');
  if (!lastArchive) return false;
  const daysSince = (Date.now() - new Date(lastArchive).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 30;
}

/** N년 전 날짜를 YYYY-MM-DD 문자열로 반환 */
function _getCutoffDate(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}
