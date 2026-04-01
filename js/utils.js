// ============================================
// 🔐 보안 유틸리티
// ============================================

/**
 * 고유 ID 생성 (crypto.randomUUID 기반)
 * Date.now() 대신 사용하여 브레인덤프 등 빠른 연속 생성 시 충돌 방지
 */
function generateId() {
  return crypto.randomUUID();
}

// ============================================
// 📅 날짜 유틸리티
// ============================================

// 로컬 타임존 기준 날짜 문자열 (YYYY-MM-DD) - UTC 변환 방지
function getLocalDateStr(d) {
  const dt = d || new Date();
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

// 로컬 시간 기준 datetime-local 문자열 (YYYY-MM-DDTHH:mm)
function getLocalDateTimeStr(d) {
  const dt = d || new Date();
  return getLocalDateStr(dt) + 'T' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
}

// ============================================
// 🎨 SVG 아이콘 시스템 (Lucide 스타일)
// ============================================
const SVG_ICONS = {
  // 탭 네비게이션
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  menu: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  bus: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="18" r="1.5" fill="currentColor"/><circle cx="16" cy="18" r="1.5" fill="currentColor"/>',
  'bar-chart': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  // 액션 아이콘
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  play: '<polygon points="6 3 20 12 6 21"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
};

/** SVG 아이콘 렌더링 — stroke 기반, currentColor 상속 */
function svgIcon(name, size = 18) {
  const path = SVG_ICONS[name];
  if (!path) return '';
  return '<svg class="svg-icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
}

// ============================================
// ♿ 접근성 유틸리티
// ============================================

/** 스크린 리더에 메시지 전달 (aria-live assertive) */
const srAnnounce = (() => {
  let el = null;
  return (msg) => {
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('aria-live', 'assertive');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-atomic', 'true');
      el.className = 'sr-only';
      document.body.appendChild(el);
    }
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = msg; });
  };
})();

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
 * 텍스트를 포맷된 HTML로 변환 (불릿 리스트, 들여쓰기, 줄바꿈 지원)
 * - `*` 또는 `-`로 시작하는 줄 → <li> 변환
 * - 들여쓰기 깊이(스페이스 수)에 따라 중첩 <ul> 생성
 * - 일반 텍스트 줄은 줄바꿈 유지
 * - 기존 plain text 데이터 호환
 */
function renderFormattedText(text) {
    if (!text) return '';
    const lines = String(text).split('\n');
    let html = '';
    const ulStack = []; // 현재 열려있는 <ul> 들의 indent 레벨

    const closeUlsTo = (targetDepth) => {
        while (ulStack.length > 0 && ulStack[ulStack.length - 1] >= targetDepth) {
            html += '</li></ul>';
            ulStack.pop();
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 불릿 라인 감지: 선행 공백 + (* 또는 -) + 공백 + 내용
        const bulletMatch = line.match(/^(\s*)[*\-]\s+(.*)/);

        if (bulletMatch) {
            const indent = bulletMatch[1].length;
            const content = bulletMatch[2];

            if (ulStack.length === 0) {
                // 첫 불릿 — 새 리스트 시작
                html += '<ul class="formatted-list"><li>' + escapeHtml(content);
                ulStack.push(indent);
            } else {
                const currentIndent = ulStack[ulStack.length - 1];
                if (indent > currentIndent) {
                    // 더 깊은 들여쓰기 — 중첩 리스트
                    html += '<ul class="formatted-list"><li>' + escapeHtml(content);
                    ulStack.push(indent);
                } else if (indent < currentIndent) {
                    // 들여쓰기 감소 — 상위로 돌아감
                    closeUlsTo(indent + 1);
                    html += '</li><li>' + escapeHtml(content);
                } else {
                    // 같은 레벨
                    html += '</li><li>' + escapeHtml(content);
                }
            }
        } else {
            // 불릿이 아닌 일반 텍스트 줄
            closeUlsTo(0);
            if (line.trim() === '') {
                html += '<br>';
            } else {
                html += '<span class="formatted-line">' + escapeHtml(line) + '</span><br>';
            }
        }
    }
    // 남은 <ul> 닫기
    closeUlsTo(0);

    return '<div class="formatted-text">' + html + '</div>';
}

/**
 * textarea에 Tab 키 입력 시 4스페이스 삽입 + auto-resize + Ctrl+Enter 제출
 * @param {HTMLTextAreaElement} textarea
 * @param {Object} [options]
 * @param {number} [options.maxHeight=400] - auto-resize 상한 (px)
 * @param {Function} [options.onSubmit] - Ctrl+Enter 시 호출할 콜백
 */
function initEnhancedTextarea(textarea, options) {
    if (!textarea || textarea._enhanced) return;
    textarea._enhanced = true;
    const maxH = (options && options.maxHeight) || 400;

    textarea.addEventListener('keydown', function(e) {
        // Ctrl+Enter / Cmd+Enter → 제출
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (options && typeof options.onSubmit === 'function') {
                options.onSubmit();
            } else {
                // 모달 내 textarea → 가장 가까운 confirm 버튼 클릭
                const modal = textarea.closest('.work-modal-content, .modal-content');
                const btn = modal && modal.querySelector('.confirm');
                if (btn) btn.click();
            }
            return;
        }
        // Tab 키 → 4스페이스
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;
            this.value = value.substring(0, start) + '    ' + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
            this.dispatchEvent(new Event('input'));
        }
    });

    // Auto-resize
    const autoResize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, maxH) + 'px';
    };
    textarea.addEventListener('input', autoResize);
    // 초기 사이즈 조정
    setTimeout(autoResize, 0);
}

/**
 * 텍스트를 줄 단위로 분리하고 불렛 포인트 접두사 제거
 * - item, * item, • item, 1. item, 1) item 등을 인식
 * @param {string} text
 * @returns {string[]} 비어있지 않은 줄 배열
 */
function parseBulletLines(text) {
  // trim은 불렛 제거 후에 적용 (조기 trim하면 "- " → "-"가 되어 regex 매칭 실패)
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  // 단일 줄: 불렛 접두사 제거하지 않음 (사용자가 의도적으로 - 로 시작하는 텍스트일 수 있음)
  if (rawLines.length <= 1) return rawLines.map(l => l.trim());
  return rawLines
    .map(line => line.replace(/^\s*[-*•]\s+/, '').replace(/^\s*\d+[.)]\s+/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * XSS 방지: HTML 이스케이핑
 */
// 문자열 기반 HTML 이스케이프 — DOM 요소 생성 대비 ~5x 빠름 (렌더당 106+회 호출)
const _escapeMap = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
const _escapeRe = /[&<>"']/g;
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(_escapeRe, c => _escapeMap[c]);
}

// URL 스킴 검증: http/https만 허용
function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(String(url), window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (_) {
    // ignore invalid url
  }
  return '';
}

/** onclick 속성 내 JS 문자열 이스케이프 — JS 레벨 이스케이프 먼저, 그 다음 HTML 속성용 이스케이프 */
function escapeAttr(text) {
  if (text === null || text === undefined) return '';
  // 1) JS string escape (backslash → \\, single quote → \')
  // 2) HTML attribute escape (& < > " ' → entities)
  // 순서 중요: JS 먼저 해야 HTML 디코딩 후에도 \' 가 유지됨
  const jsEscaped = String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return escapeHtml(jsEscaped);
}

/**
 * localStorage에서 JSON을 안전하게 파싱
 */
function safeParseJSON(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    const parsed = JSON.parse(data);
    return parsed !== null ? parsed : defaultValue;
  } catch (e) {
    console.warn(`localStorage 파싱 실패 (${key}):`, e.message);
    return defaultValue;
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
    repeatType: ['none', 'daily', 'weekdays', 'weekends', 'weekly', 'custom', 'monthly'].includes(task.repeatType) ? task.repeatType : 'none',
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
  if (Array.isArray(task.subtasks)) validated.subtasks = task.subtasks;
  if (task.organizer) validated.organizer = task.organizer;
  if (task.eventType) validated.eventType = task.eventType;
  if (task.repeatMonthDay) validated.repeatMonthDay = task.repeatMonthDay;
  if (task.lastCompletedAt) validated.lastCompletedAt = task.lastCompletedAt;
  if (task.source) validated.source = task.source;
  if (task.description) validated.description = task.description;
  if (task.startDate) validated.startDate = task.startDate;
  if (task.telegramEventId) validated.telegramEventId = task.telegramEventId;

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
 * 오늘 통계 재계산 (중복 코드 방지)
 */
function recomputeTodayStats() {
  const today = getLocalDateStr();
  appState.todayStats.completedToday = appState.tasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    if (isNaN(d.getTime())) return false;
    return getLocalDateStr(d) === today;
  }).length;
}

/**
 * 완료 스트릭 계산 — completionLog 기반 연속 완료일 수
 * dayStartHour 반영: 새벽 완료는 전날로 간주
 */
function calculateCompletionStreak() {
  const log = appState.completionLog || {};
  const dayStartHour = appState.settings?.dayStartHour || 5;

  // 논리적 오늘 계산
  const now = new Date();
  let logicalToday = new Date(now);
  if (now.getHours() < dayStartHour) {
    logicalToday.setDate(logicalToday.getDate() - 1);
  }

  let streak = 0;
  let checkDate = new Date(logicalToday);

  // 오늘 완료가 있으면 오늘부터, 없으면 어제부터 카운트
  const todayStr = getLocalDateStr(checkDate);
  const todayEntries = log[todayStr];
  const hasTodayCompletion = todayEntries && Array.isArray(todayEntries) && todayEntries.length > 0;

  if (!hasTodayCompletion) {
    // 오늘 완료 없으면 어제부터 체크 (스트릭 유지 가능)
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // 연속 완료일 카운트
  for (let i = 0; i < 365; i++) {
    const dateStr = getLocalDateStr(checkDate);
    const entries = log[dateStr];
    if (entries && Array.isArray(entries) && entries.length > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak, hasTodayCompletion };
}

/**
 * 스트릭 배지 텍스트 반환
 */
function getStreakBadge(streak) {
  if (streak >= 30) return '🏆 30일+';
  if (streak >= 14) return '⭐ 14일+';
  if (streak >= 7) return '💪 7일+';
  return '';
}

/**
 * 오늘 완료된 태스크만 필터링 (UI 표시용)
 * 히스토리/캘린더/수익 통계와 무관하게, 탭의 "완료됨" 섹션에 오늘 것만 표시
 */
function getTodayCompletedTasks(tasks) {
  const today = getLocalDateStr();
  return tasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    if (isNaN(d.getTime())) return false;
    return getLocalDateStr(d) === today;
  });
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

/**
 * 논리적 날짜 계산 (하루 시작 시각 기반)
 * 설정된 dayStartHour(기본 05:00) 이전이면 아직 "어제"로 취급
 * → 새벽 1시에 활동해도 리셋되지 않음, 5시 이후에 리셋됨
 */
function getLogicalDate(d) {
  const dt = d || new Date();
  const dayStartHour = (appState.settings && appState.settings.dayStartHour) || 5;

  if (dt.getHours() < dayStartHour) {
    // 하루 시작 시각 이전 → 아직 "어제"
    const adjusted = new Date(dt);
    adjusted.setDate(adjusted.getDate() - 1);
    return getLocalDateStr(adjusted);
  }
  return getLocalDateStr(dt);
}

/**
 * 반복 태스크 일일 초기화 (논리적 날짜 변경 시 자동 실행)
 * - dayStartHour(기본 05:00) 기준으로 "하루"를 판단
 * - daily/weekdays 태스크: 완료 상태를 리셋하여 매일 새로 시작
 * - weekdays 태스크: 주말에는 초기화하지 않음 (금요일 완료 → 월요일에 리셋)
 * - 기존 createNextRepeatTask로 생긴 중복 태스크도 정리
 * - 스트릭: 어제 모든 반복 태스크 완료 시 유지, 아니면 리셋
 * - 트리거: 앱 로딩, visibilitychange, setInterval(1분), 기상 버튼
 */
function checkDailyReset() {
  const now = new Date();
  const dayStartHour = (appState.settings && appState.settings.dayStartHour) || 5;

  // 하루 시작 시각 이전이면 리셋하지 않음 (새벽 활동 보호)
  if (now.getHours() < dayStartHour) return false;

  const logicalToday = getLogicalDate();
  const lastResetDate = localStorage.getItem('navigator-last-reset-date');

  if (lastResetDate === logicalToday) return false; // 이미 오늘 초기화됨

  // 논리적 "오늘"의 요일 (dayStartHour 이후이므로 now의 요일이 정확)
  const todayDay = now.getDay(); // 0=일, 6=토
  const isWeekday = todayDay !== 0 && todayDay !== 6;

  let changed = false;

  // 1단계: 반복 태스크 완료 상태 초기화
  appState.tasks.forEach(task => {
    if (task.repeatType !== 'daily' && task.repeatType !== 'weekdays') return;

    // weekdays 태스크: 주말(토/일)에는 초기화하지 않음
    if (task.repeatType === 'weekdays' && !isWeekday) return;

    if (task.completed && task.completedAt) {
      // 완료 시점의 논리적 날짜와 오늘의 논리적 날짜 비교
      const completedLogicalDate = getLogicalDate(new Date(task.completedAt));
      if (completedLogicalDate !== logicalToday) {
        // 이전 논리적 날짜에 완료된 태스크 → 초기화
        task.lastCompletedAt = task.completedAt; // 히스토리 보존
        task.completed = false;
        task.completedAt = null;
        task.updatedAt = new Date().toISOString();
        changed = true;
      }
    }

    // 서브태스크 완료 상태도 초기화
    if (task.subtasks && task.subtasks.length > 0) {
      const anySubCompleted = task.subtasks.some(st => st.completed);
      if (anySubCompleted) {
        task.subtasks.forEach(st => {
          st.completed = false;
          st.completedAt = null;
        });
        task.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
  });

  // 2단계: 중복 반복 태스크 정리 (같은 제목+카테고리+반복타입 태스크가 여러 개면 하나만 남김)
  // 완료 여부 상관없이 중복 정리하되, 완료된 것을 우선 유지
  const seen = new Map();
  const toRemove = [];

  appState.tasks.forEach(task => {
    if (task.repeatType !== 'daily' && task.repeatType !== 'weekdays') return;

    const key = `${task.title}|${task.repeatType}|${task.category}`;
    if (seen.has(key)) {
      // 중복 발견: 우선순위 결정 (완료된 것 > 미완료 / 최신 생성)
      const existing = seen.get(key);

      // 완료 상태 우선 비교
      if (task.completed && !existing.completed) {
        // 현재 태스크가 완료됨 → 기존 것 제거
        toRemove.push(existing.id);
        seen.set(key, task);
      } else if (!task.completed && existing.completed) {
        // 기존 것이 완료됨 → 현재 것 제거
        toRemove.push(task.id);
      } else {
        // 둘 다 같은 상태 → 더 최근에 생성된 것 유지
        const existingTime = new Date(existing.createdAt || 0).getTime();
        const currentTime = new Date(task.createdAt || 0).getTime();
        if (currentTime > existingTime) {
          toRemove.push(existing.id);
          seen.set(key, task);
        } else {
          toRemove.push(task.id);
        }
      }
    } else {
      seen.set(key, task);
    }
  });

  if (toRemove.length > 0) {
    appState.tasks = appState.tasks.filter(t => !toRemove.includes(t.id));
    changed = true;
    console.log(`[daily-reset] 중복 반복 태스크 ${toRemove.length}개 정리`);
  }

  // 3단계: 반복 태스크 스트릭 체크 (어제 모든 반복 태스크 완료 여부)
  if (lastResetDate) {
    checkDailyRepeatStreak();
  }

  localStorage.setItem('navigator-last-reset-date', logicalToday);

  if (changed) {
    console.log(`[daily-reset] 반복 태스크 초기화 완료 (하루 시작: ${dayStartHour}시)`);
  }

  return changed;
}

/**
 * 반복 태스크 스트릭 체크
 * 어제(논리적) 모든 daily/weekdays 태스크를 완료했으면 스트릭 유지, 아니면 리셋
 */
function checkDailyRepeatStreak() {
  // "어제"를 논리적 날짜로 계산 (dayStartHour 기준)
  const logicalToday = getLogicalDate();
  const todayDate = new Date(logicalToday + 'T12:00:00'); // 정오 기준으로 Date 생성
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterdayDate);
  const yesterdayDay = yesterdayDate.getDay();
  const wasWeekday = yesterdayDay !== 0 && yesterdayDay !== 6;

  // daily + weekdays(어제가 평일인 경우만) 태스크 필터링
  const repeatTasks = appState.tasks.filter(t => {
    if (t.repeatType === 'daily') return true;
    if (t.repeatType === 'weekdays' && wasWeekday) return true;
    return false;
  });

  if (repeatTasks.length === 0) return; // 반복 태스크 없으면 무시

  // 어제 모든 반복 태스크가 완료되었는지 확인
  // (lastCompletedAt 또는 completedAt의 논리적 날짜가 어제인지)
  const allCompleted = repeatTasks.every(t => {
    const completedDateRaw = t.lastCompletedAt || t.completedAt;
    if (!completedDateRaw) return false;
    return getLogicalDate(new Date(completedDateRaw)) === yesterdayStr;
  });

  if (!allCompleted) {
    // 어제 반복 태스크를 전부 완료하지 못함 → 스트릭 리셋
    appState.streak.current = 0;
    if (!appState.user) {
      localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
    }
    console.log('[daily-reset] 어제 미완료 반복 태스크 있음 → 스트릭 리셋');
  }
}

