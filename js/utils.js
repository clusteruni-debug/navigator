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

// 로컬 시간 기준 ISO 8601 strict datetime 문자열 (YYYY-MM-DDTHH:mm:ss)
// 초까지 포함하는 이유: Safari/Android WebView가 'YYYY-MM-DDTHH:mm' 포맷을 Invalid Date로 처리 (strict ISO 8601 비호환)
// substring(5,10) / split('T')[0] / split('T')[1] 호출자는 모두 길이 무관해 안전
function getLocalDateTimeStr(d) {
  const dt = d || new Date();
  return getLocalDateStr(dt) + 'T' +
    String(dt.getHours()).padStart(2, '0') + ':' +
    String(dt.getMinutes()).padStart(2, '0') + ':' +
    String(dt.getSeconds()).padStart(2, '0');
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
 * 오늘 통계 재계산 (중복 코드 방지)
 */
function recomputeTodayStats() {
  const logicalToday = getLogicalDate();
  appState.todayStats.completedToday = appState.tasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    if (isNaN(d.getTime())) return false;
    return getLogicalDate(d) === logicalToday;
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
  const logicalToday = getLogicalDate();
  return tasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    if (isNaN(d.getTime())) return false;
    return getLogicalDate(d) === logicalToday;
  });
}


