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
