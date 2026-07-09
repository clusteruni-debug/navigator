// ============================================
// 사용자 액션 핸들러 (메인)
// 하위 모듈: actions-add.js, actions-complete.js, actions-edit.js, actions-ui.js
// ============================================

/**
 * 탭 전환
 */
const NAVIGATOR_ACTIVE_TABS = new Set(["action", "all", "work", "events", "life", "commute", "history", "reflection"]);

function _normalizeNavigatorTab(tab) {
  if (tab === "schedule") return "all";
  if (tab === "dashboard") return "history";
  return NAVIGATOR_ACTIVE_TABS.has(tab) ? tab : "action";
}

function switchTab(tab) {
  const normalizedTab = _normalizeNavigatorTab(tab);
  appState.currentTab = normalizedTab;
  renderStatic();
  // 접근성: 탭 전환 시 포커스 이동 + 스크린 리더 안내
  const tabContent = document.querySelector(".tab-content.active");
  if (tabContent) {
    tabContent.setAttribute("tabindex", "-1");
    tabContent.focus({ preventScroll: true });
  }
  srAnnounce(normalizedTab + " 탭");
}

/**
 * 테마 전환
 */
function toggleTheme() {
  appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', appState.theme);
  saveState();
  renderStatic();
}

/**
 * 테마 적용 (페이지 로드 시)
 */
function applyTheme() {
  document.body.setAttribute('data-theme', appState.theme);
}

/**
 * 설정 모달 열기
 */
function openSettings() {
  appState.showSettings = true;
  renderStatic();
}

/**
 * 설정 모달 닫기
 */
function closeSettings() {
  appState.showSettings = false;
  renderStatic();
}

/**
 * 개별 설정 업데이트
 */
function updateSetting(key, value) {
  appState.settings[key] = value;
  saveState();
  renderStatic();
}

// ============================================
// 템플릿 관리
// ============================================

/**
 * 카테고리별 아이콘 반환
 */
function getCategoryIcon(category) {
  switch(category) {
    case '본업': return '💼';
    case '부업': return '💰';
    case '자기계발': return '📚';
    case '일상': return '🏠';
    case '가족': return '👨‍👩‍👧';
    case '이벤트': return '🎟️';
    case '미분류': return '❓';
    default: return '📌';
  }
}

/**
 * 템플릿 삭제
 */
function deleteTemplate(templateId) {
  // Soft-Delete: 삭제 기록 남기기 (동기화 시 부활 방지)
  appState.deletedIds.templates[templateId] = new Date().toISOString();
  appState.templates = appState.templates.filter(t => t.id !== templateId);
  saveTemplates();
  renderStatic();
}

/**
 * 빠른 추가에서 템플릿 저장
 */
function saveCurrentAsTemplate() {
  const title = appState.quickAddValue.trim();
  if (!title) {
    showToast('제목을 먼저 입력하세요', 'error');
    return;
  }

  const template = {
    id: generateId(),
    title: title,
    category: '부업',
    estimatedTime: 10,
    tags: [],
    icon: '💰'
  };

  appState.templates.push(template);
  saveTemplates();
  appState.quickAddValue = '';
  const input = document.getElementById('quick-add-input');
  if (input) input.value = '';

  showToast('템플릿으로 저장됨', 'success');
  renderStatic();
}

/**
 * 템플릿 저장 (localStorage)
 */
function saveTemplates() {
  try {
    if (!appState.user) {
      localStorage.setItem('navigator-templates', JSON.stringify(appState.templates));
    }
    // Firebase 동기화 (로그인된 경우)
    if (appState.user) {
      syncToFirebase();
    }
  } catch (e) {
    console.error('템플릿 저장 실패:', e);
  }
}

/**
 * 셔틀 상태 토글
 */
function toggleShuttle() {
  appState.shuttleSuccess = !appState.shuttleSuccess;
  saveState();
  renderStatic();
}

/**
 * 템플릿에서 빠른 추가
 */
const quickTemplates = {
  writing: {
    title: '아티클 작성',
    category: '부업',
    estimatedTime: 30,
    link: 'http://localhost:3000/editor',
    tags: ['글쓰기']
  }
};

function addFromTemplate(templateName) {
  const template = quickTemplates[templateName];
  if (!template) {
    showToast('템플릿을 찾을 수 없습니다', 'error');
    return;
  }

  const now = new Date().toISOString();
  appState.tasks.push({
    id: generateId(),
    ...template,
    completed: false,
    createdAt: now,
    updatedAt: now
  });

  saveState();
  renderStatic();
  showToast(`"${template.title}" 추가됨`, 'success');

  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}
window.addFromTemplate = addFromTemplate;

