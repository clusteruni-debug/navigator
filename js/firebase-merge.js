// ============================================
// Firebase 데이터 병합 유틸리티
// (firebase-sync.js에서 분리)
// ============================================

/**
 * 태스크별 타임스탬프 기반 병합
 * - 같은 ID: updatedAt이 더 최신인 쪽을 사용
 * - 한쪽에만 있는 태스크: 그대로 보존
 */
function mergeTasks(localTasks, cloudTasks, deletedIds) {
  // deletedIds가 없으면 appState에서 가져오기
  const deleted = deletedIds || (appState.deletedIds && appState.deletedIds.tasks) || {};
  // ID를 문자열로 정규화 — Map은 숫자/문자열 키를 다르게 취급하므로 타입 통일 필수
  const normalizeId = (arr) => (arr || []).map(t => t.id !== undefined && typeof t.id !== 'string' ? { ...t, id: String(t.id) } : t);
  const localMap = new Map(normalizeId(localTasks).map(t => [t.id, t]));
  const cloudMap = new Map(normalizeId(cloudTasks).map(t => [t.id, t]));
  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
  const merged = [];

  for (const id of allIds) {
    // Soft-Delete: 삭제 기록이 있으면 병합에서 제외 (부활 방지)
    if (deleted[id]) continue;

    const local = localMap.get(id);
    const cloud = cloudMap.get(id);

    if (local && !cloud) {
      merged.push(local);
    } else if (cloud && !local) {
      merged.push(cloud);
    } else {
      // 양쪽 다 있으면 updatedAt 기준으로 최신 선택
      const localTime = new Date(local.updatedAt || local.completedAt || local.createdAt || 0).getTime();
      const cloudTime = new Date(cloud.updatedAt || cloud.completedAt || cloud.createdAt || 0).getTime();
      merged.push(cloudTime >= localTime ? cloud : local);
    }
  }

  return merged;
}

/**
 * ID 기반 배열 병합 (범용)
 * - 한쪽에만 있으면 그대로 보존
 * - 양쪽 다 있으면 updatedAt이 더 최신인 쪽 사용
 * workProjects, templates, workTemplates 등에 사용
 */
function mergeById(localArr, cloudArr, deletedIds) {
  const deleted = deletedIds || {};
  // ID를 문자열로 정규화 — Map은 숫자/문자열 키를 다르게 취급하므로 타입 통일 필수
  const normalizeId = (arr) => (arr || []).map(p => p.id !== undefined && typeof p.id !== 'string' ? { ...p, id: String(p.id) } : p);
  const localMap = new Map(normalizeId(localArr).map(p => [p.id, p]));
  const cloudMap = new Map(normalizeId(cloudArr).map(p => [p.id, p]));
  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
  const merged = [];

  for (const id of allIds) {
    // Soft-Delete: 삭제 기록이 있으면 병합에서 제외 (부활 방지)
    if (deleted[id]) continue;

    const local = localMap.get(id);
    const cloud = cloudMap.get(id);

    if (local && !cloud) {
      merged.push(local);
    } else if (cloud && !local) {
      merged.push(cloud);
    } else {
      const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
      const cloudTime = new Date(cloud.updatedAt || cloud.createdAt || 0).getTime();
      merged.push(cloudTime >= localTime ? cloud : local);
    }
  }

  return merged;
}

/**
 * 본업 프로젝트 전용 깊은 병합.
 * 일반 mergeById 는 프로젝트를 "통째로" LWW 하므로, 두 기기가 같은 프로젝트의
 * 서로 다른 stage/중분류/task 를 동시에 추가하면 한쪽 추가분이 통째로 사라진다(데이터 유실).
 * 이 함수는 stage → 중분류 → task 를 id 기준 union 하여 양쪽 추가분을 모두 보존한다.
 */
function mergeWorkProjects(localArr, cloudArr, deletedIds) {
  const deleted = deletedIds || {};
  const norm = (arr) => (arr || []).map(p => p.id !== undefined && typeof p.id !== 'string' ? { ...p, id: String(p.id) } : p);
  const localMap = new Map(norm(localArr).map(p => [p.id, p]));
  const cloudMap = new Map(norm(cloudArr).map(p => [p.id, p]));
  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
  const merged = [];
  for (const id of allIds) {
    if (deleted[id]) continue; // Soft-Delete: 부활 방지
    const local = localMap.get(id);
    const cloud = cloudMap.get(id);
    if (local && !cloud) { merged.push(local); continue; }
    if (cloud && !local) { merged.push(cloud); continue; }
    merged.push(mergeProjectDeep(local, cloud)); // 양쪽 존재 → 깊은 병합
  }
  return merged;
}

/**
 * id 기준 배열 union (stage/중분류/task 공용).
 * 로컬 순서를 유지하고 클라우드 전용 항목은 뒤에 덧붙인다.
 * 같은 id 가 양쪽에 있으면 mergeNode(local, cloud) 로 합친다.
 */
function _unionById(localArr, cloudArr, mergeNode, preferCloud) {
  const withId = (arr) => (arr || []).filter(x => x && x.id != null); // null 원소 throw 방지
  const key = (x) => String(x.id);                                    // numeric/string id 혼용 정규화
  const lm = new Map(withId(localArr).map(x => [key(x), x]));
  const cm = new Map(withId(cloudArr).map(x => [key(x), x]));
  const order = [];
  const seen = new Set();
  withId(localArr).forEach(x => { if (!seen.has(key(x))) { order.push(key(x)); seen.add(key(x)); } });
  withId(cloudArr).forEach(x => { if (!seen.has(key(x))) { order.push(key(x)); seen.add(key(x)); } });
  const merged = order.map(k => {
    const l = lm.get(k), c = cm.get(k);
    if (l && c) return mergeNode(l, c);
    return l || c;
  });
  // id 없는 레거시 노드는 id-union 불가 → 최신(updatedAt) 쪽 전체 채택 (array-level LWW).
  // local 고정이면 stale local 이 최신 cloud 편집을 덮어쓰므로 preferCloud 로 방향 결정.
  const noId = (arr) => (arr || []).filter(x => x && x.id == null);
  return merged.concat(preferCloud ? noId(cloudArr) : noId(localArr));
}

/** 프로젝트 스칼라는 updatedAt 최신 우선, 자식(stage→중분류→task)은 union 으로 보존 */
function mergeProjectDeep(local, cloud) {
  const cloudNewer = new Date(cloud.updatedAt || 0).getTime() >= new Date(local.updatedAt || 0).getTime();
  const base = cloudNewer ? { ...cloud } : { ...local };
  base.stages = _unionById(local.stages, cloud.stages, (ls, cs) => {
    const stage = cloudNewer ? { ...cs } : { ...ls };
    stage.subcategories = _unionById(ls.subcategories, cs.subcategories, (lsub, csub) => {
      const sub = cloudNewer ? { ...csub } : { ...lsub };
      // 같은 id task 충돌 → 최신 프로젝트(updatedAt) 버전 우선 (LWW).
      // 단일 사용자 환경에서 같은 task 의 동시 편집은 사실상 없으므로 필드 병합 불필요.
      sub.tasks = _unionById(lsub.tasks, csub.tasks, (lt, ct) => cloudNewer ? ct : lt, cloudNewer);
      return sub;
    }, cloudNewer);
    return stage;
  }, cloudNewer);
  return base;
}

/**
 * deletedIds 병합: 로컬 + 클라우드 양쪽의 삭제 기록을 합침
 * 한쪽에서 삭제한 항목은 다른 쪽에서도 삭제 유지
 */
function mergeDeletedIds(local, cloud) {
  const merged = {};
  const types = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
  for (const type of types) {
    merged[type] = { ...(local[type] || {}), ...(cloud[type] || {}) };
  }
  return merged;
}

/**
 * 30일 이상 된 deletedIds 항목 자동 정리 (앱 시작 시 호출)
 */
function cleanupOldDeletedIds() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30일 전
  let cleaned = 0;
  for (const type of Object.keys(appState.deletedIds)) {
    const ids = appState.deletedIds[type];
    for (const id of Object.keys(ids)) {
      if (new Date(ids[id]).getTime() < cutoff) {
        delete ids[id];
        cleaned++;
      }
    }
  }
  if (cleaned > 0) {
    console.log(`[deletedIds] ${cleaned}개 오래된 삭제 기록 정리`);
  }
}

/**
 * 데이터 축소(유실) 감지
 * 이전에 기록된 데이터 수와 비교하여 급격한 감소를 탐지
 * @returns {{ blocked: boolean, details: string }}
 */
function checkDataShrinkage() {
  const raw = localStorage.getItem('navigator-last-data-counts');
  if (!raw) return { blocked: false, details: '' };

  try {
    const last = JSON.parse(raw);
    const issues = [];

    // 이전에 데이터가 있었는데 지금 0이면 = 유실 가능성
    if (last.tasks > 3 && appState.tasks.length === 0) {
      issues.push(`tasks: ${last.tasks} → 0`);
    }
    if (last.workProjects > 0 && appState.workProjects.length === 0) {
      issues.push(`workProjects: ${last.workProjects} → 0`);
    }
    if (last.templates > 0 && (!appState.templates || appState.templates.length === 0)) {
      issues.push(`templates: ${last.templates} → 0`);
    }
    if (last.workTemplates > 0 && (!appState.workTemplates || appState.workTemplates.length === 0)) {
      issues.push(`workTemplates: ${last.workTemplates} → 0`);
    }

    return {
      blocked: issues.length > 0,
      details: issues.join(', ')
    };
  } catch (e) {
    return { blocked: false, details: '' };
  }
}

/**
 * 현재 데이터 수 기록 (성공적인 동기화 후 호출)
 * 다음 동기화 시 데이터 축소 감지에 사용
 */
function updateDataCounts() {
  try {
    const counts = {
      tasks: appState.tasks.length,
      workProjects: appState.workProjects.length,
      templates: (appState.templates || []).length,
      workTemplates: (appState.workTemplates || []).length,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('navigator-last-data-counts', JSON.stringify(counts));
  } catch (e) {
    // 무시 - 필수 기능이 아님
  }
}


function mergeLoopStats(local, cloud) {
  const normalize = typeof normalizeLoopStats === "function" ? normalizeLoopStats : (value) => value || {};
  const l = normalize(local);
  const c = normalize(cloud);
  const merged = {};
  for (const dateKey of new Set([...Object.keys(l), ...Object.keys(c)])) {
    const lv = l[dateKey] || {};
    const cv = c[dateKey] || {};
    merged[dateKey] = {
      morningOpen: !!(lv.morningOpen || cv.morningOpen),
      captures: Math.max(Number(lv.captures || 0), Number(cv.captures || 0)),
      shutdown: !!(lv.shutdown || cv.shutdown)
    };
  }
  return typeof pruneLoopStats === "function" ? pruneLoopStats(merged) : merged;
}

function mergeDailyLoopState(local, cloud) {
  const normalize = typeof normalizeDailyLoopState === "function" ? normalizeDailyLoopState : (value) => value || {};
  const l = normalize(local);
  const c = normalize(cloud);
  const top3 = [...new Set([...(c.tomorrowTop3 || []), ...(l.tomorrowTop3 || [])].map(String))].slice(0, 3);
  return {
    tomorrowTop3: top3,
    shutdownNotes: { ...(c.shutdownNotes || {}), ...(l.shutdownNotes || {}) },
    lastMorningOpenDate: (l.lastMorningOpenDate || "") > (c.lastMorningOpenDate || "") ? l.lastMorningOpenDate : (c.lastMorningOpenDate || null),
    lastShutdownDate: (l.lastShutdownDate || "") > (c.lastShutdownDate || "") ? l.lastShutdownDate : (c.lastShutdownDate || null),
    shutdownDraft: l.shutdownDraft || c.shutdownDraft || ""
  };
}

// Node 테스트용 export (브라우저에선 typeof module === 'undefined' 라 무시됨)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mergeTasks, mergeById, mergeWorkProjects, mergeProjectDeep,
    _unionById, mergeDeletedIds, mergeLoopStats, mergeDailyLoopState
  };
}
