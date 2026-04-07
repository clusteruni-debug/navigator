// ============================================
// 데이터 검증 / 마이그레이션 / 정리
// (utils.js에서 분리)
// ============================================

/**
 * 기존 숫자 ID를 문자열로 마이그레이션 (하위 호환)
 * localStorage/Firebase에서 로드한 숫자 ID를 문자열로 변환
 */
function migrateNumericIds() {
  // 태스크 ID 마이그레이션
  appState.tasks.forEach(t => {
    if (typeof t.id === 'number') t.id = String(t.id);
  });
  // 템플릿 ID 마이그레이션
  appState.templates.forEach(t => {
    if (typeof t.id === 'number') t.id = String(t.id);
  });
  // 본업 프로젝트 + 하위 항목 ID 마이그레이션
  appState.workProjects.forEach(p => {
    if (typeof p.id === 'number') p.id = String(p.id);
    (p.stages || []).forEach(stage => {
      (stage.subcategories || []).forEach(sub => {
        if (typeof sub.id === 'number') sub.id = String(sub.id);
        (sub.tasks || []).forEach(task => {
          if (typeof task.id === 'number') task.id = String(task.id);
        });
      });
    });
  });
  // 본업 템플릿 ID 마이그레이션
  (appState.workTemplates || []).forEach(t => {
    if (typeof t.id === 'number') t.id = String(t.id);
  });
  // 휴지통 ID 마이그레이션
  (appState.trash || []).forEach(t => {
    if (typeof t.id === 'number') t.id = String(t.id);
  });
  // activeWorkProject ID 마이그레이션
  if (typeof appState.activeWorkProject === 'number') {
    appState.activeWorkProject = String(appState.activeWorkProject);
  }
}

/**
 * 중복 항목 제거 (ID 기준)
 * ID 타입 불일치(숫자 vs 문자열)로 병합 시 중복 생성된 항목을 정리
 * 같은 ID가 여러 개면 updatedAt이 가장 최신인 것만 보존
 */
function deduplicateAll() {
  const dedup = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return arr;
    const map = new Map();
    for (const item of arr) {
      const key = String(item.id);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
      } else {
        // updatedAt이 더 최신인 쪽 보존
        const existTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (itemTime > existTime) map.set(key, item);
      }
    }
    return Array.from(map.values());
  };

  const prevTaskCount = appState.tasks.length;
  const prevWorkCount = appState.workProjects.length;

  appState.tasks = dedup(appState.tasks);
  appState.templates = dedup(appState.templates);
  appState.workProjects = dedup(appState.workProjects);
  appState.workTemplates = dedup(appState.workTemplates || []);
  appState.trash = dedup(appState.trash || []);

  const removed = (prevTaskCount - appState.tasks.length) + (prevWorkCount - appState.workProjects.length);
  if (removed > 0) {
    console.log(`[dedup] 중복 ${removed}개 제거 (tasks: ${prevTaskCount}→${appState.tasks.length}, workProjects: ${prevWorkCount}→${appState.workProjects.length})`);
  }
}

/**
 * 작업(Task) 데이터 검증
 */
function validateTask(task) {
  if (!task || typeof task !== 'object') return null;

  // 필수 필드 검증
  if (typeof task.id !== 'number' && typeof task.id !== 'string') return null;
  // id가 문자열이면 안전한 문자만 허용 (onclick 인젝션 방지)
  if (typeof task.id === 'string' && !/^[a-zA-Z0-9_-]+$/.test(task.id)) {
    task.id = generateId(); // 위험한 id는 새로 생성
  }
  if (typeof task.title !== 'string' || task.title.trim().length === 0) return null;

  // 안전한 객체 생성 (허용된 필드만)
  const validated = {
    id: typeof task.id === 'number' ? String(task.id) : task.id,
    title: String(task.title).trim().substring(0, 500),
    category: ['본업', '부업', '일상', '가족', '공부', '크립토'].includes(task.category) ? task.category : '일상',
    completed: Boolean(task.completed),
    completedAt: task.completedAt || null,
    deadline: typeof task.deadline === 'string' ? task.deadline : '',
    estimatedTime: Math.min(Math.max(0, Number(task.estimatedTime) || 0), 1440),
    actualTime: Math.min(Math.max(0, Number(task.actualTime) || 0), 1440),
    expectedRevenue: task.expectedRevenue || '',
    link: typeof task.link === 'string' ? task.link.substring(0, 2000) : '',
    tags: Array.isArray(task.tags) ? task.tags.filter(t => typeof t === 'string').slice(0, 20) : [],
    repeatType: ['none', 'daily', 'weekdays', 'weekends', 'weekly', 'custom', 'monthly', 'interval'].includes(task.repeatType) ? task.repeatType : 'none',
    repeatDays: Array.isArray(task.repeatDays) ? task.repeatDays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [],
    createdAt: task.createdAt || new Date().toISOString(),
    priority: typeof task.priority === 'number' ? Math.min(Math.max(0, task.priority), 100) : 0,
    // 동기화 시 소실 방지: 추가 필드 보존
    updatedAt: task.updatedAt || task.completedAt || task.createdAt || new Date().toISOString()
  };

  // 선택적 필드 보존 (본업 프로젝트 관련)
  if (task.workProjectId) validated.workProjectId = task.workProjectId;
  if (typeof task.workStageIdx === 'number') validated.workStageIdx = task.workStageIdx;
  if (typeof task.workSubcatIdx === 'number') validated.workSubcatIdx = task.workSubcatIdx;
  if (Array.isArray(task.subtasks)) {
    validated.subtasks = task.subtasks
      .filter(st => st && typeof st.text === 'string' && st.text.trim())
      .map(st => ({
        ...st,
        text: st.text,
        completed: typeof st.completed === 'boolean' ? st.completed : false,
        completedAt: typeof st.completedAt === 'string' ? st.completedAt : null
      }));
  }
  if (task.organizer) validated.organizer = task.organizer;
  if (task.eventType) validated.eventType = task.eventType;
  if (task.repeatInterval) validated.repeatInterval = task.repeatInterval;
  if (task.repeatMonthDay) validated.repeatMonthDay = task.repeatMonthDay;
  if (task.lastCompletedAt) validated.lastCompletedAt = task.lastCompletedAt;
  if (task.source) validated.source = task.source;
  if (task.description) validated.description = task.description;
  if (task.startDate) validated.startDate = task.startDate;
  if (task.telegramEventId) validated.telegramEventId = task.telegramEventId;
  if (task.spawnedFromTaskId) validated.spawnedFromTaskId = task.spawnedFromTaskId;

  return validated;
}

/**
 * 작업 배열 검증
 */
function validateTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(validateTask).filter(t => t !== null);
}

/**
 * 오래된 완료 태스크 자동 정리
 * - 반복 태스크: 7일 경과 시 제거 (이미 다음 회차 생성됨)
 * - 비반복 태스크: 30일 경과 시 제거
 * - 히스토리/캘린더는 별도 데이터를 사용하지 않으므로,
 *   정리 후에도 해당 기간 내 데이터는 유지됨
 */
function cleanupOldCompletedTasks() {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const before = appState.tasks.length;
  appState.tasks = appState.tasks.filter(t => {
    if (!t.completed || !t.completedAt) return true; // 미완료 태스크는 유지
    const elapsed = now - new Date(t.completedAt).getTime();
    // 반복 태스크: 7일 후 제거
    if (t.repeatType && t.repeatType !== 'none') {
      return elapsed < SEVEN_DAYS;
    }
    // 비반복 태스크: 30일 후 제거
    return elapsed < THIRTY_DAYS;
  });

  const removed = before - appState.tasks.length;
  if (removed > 0) {
    console.log(`[cleanup] 오래된 완료 태스크 ${removed}개 정리됨`);
  }
  return removed;
}
