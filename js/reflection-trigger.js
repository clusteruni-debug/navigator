// ============================================
// 매일 자문 — Auto Trigger (Phase 6)
// setInterval 5분 + visibilitychange + 초기 onboarding
// ============================================

let _reflectionTriggerInterval = null;
let _reflectionVisibilityHandler = null;

function startReflectionAutoTrigger() {
  if (_reflectionTriggerInterval) return;

  // 5분마다 시각 체크
  _reflectionTriggerInterval = setInterval(checkReflectionTrigger, 5 * 60 * 1000);

  // 앱 포커스 시 누락 자문 체크 — named handler로 removeEventListener 가능
  _reflectionVisibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      checkReflectionTrigger();
    }
  };
  document.addEventListener('visibilitychange', _reflectionVisibilityHandler);

  // 첫 체크 (load 후 1초)
  setTimeout(checkReflectionTrigger, 1000);
}

function stopReflectionAutoTrigger() {
  if (_reflectionTriggerInterval) {
    clearInterval(_reflectionTriggerInterval);
    _reflectionTriggerInterval = null;
  }
  if (_reflectionVisibilityHandler) {
    document.removeEventListener('visibilitychange', _reflectionVisibilityHandler);
    _reflectionVisibilityHandler = null;
  }
}

function checkReflectionTrigger() {
  if (!appState || !appState.dailyReflection || !appState.dailyReflection.settings) return;
  if (!appState.dailyReflection.settings.autoModalEnabled) return;

  // 이미 reflection modal 또는 다른 modal 열려있으면 skip
  if (document.querySelector('.reflection-modal-overlay')) return;
  if (document.querySelector('.modal-overlay.show, .modal.show')) return;

  if (typeof shouldShowReflectionModal !== 'function' || typeof showReflectionModal !== 'function') return;

  // 저녁 우선
  if (shouldShowReflectionModal('evening')) {
    showReflectionModal('evening');
    return;
  }

  // 아침
  if (shouldShowReflectionModal('morning')) {
    showReflectionModal('morning');
  }
}

// module load 시 자동 init (appState 준비 대기 — retry cap 으로 무한 polling 방지)
let _initReflectionAttempts = 0;
const _INIT_REFLECTION_MAX = 20;  // 500ms * 20 = 10초 후 give up

function _initReflectionTrigger() {
  if (typeof appState !== 'undefined' && appState.dailyReflection) {
    _initReflectionAttempts = 0;
    startReflectionAutoTrigger();
    // Phase 9.5 — first-time onboarding (1.5초 후 노출, 다른 modal과 충돌 방지)
    if (typeof showReflectionOnboarding === 'function') {
      setTimeout(() => showReflectionOnboarding(), 1500);
    }
    // Phase 10 — 1년+ history compaction
    if (typeof compactOldReflectionLog === 'function') {
      try { compactOldReflectionLog(); } catch (e) { console.warn('[reflection] compact 실패:', e); }
    }
  } else if (_initReflectionAttempts++ < _INIT_REFLECTION_MAX) {
    setTimeout(_initReflectionTrigger, 500);
  } else {
    console.warn('[reflection] init give up after 10s — appState.dailyReflection 미정의');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(_initReflectionTrigger, 500));
} else {
  setTimeout(_initReflectionTrigger, 500);
}

// review fix Phase 7 LOW: notification click → URL ?reflection=evening|morning 또는 sw postMessage
// 받아서 modal 강제 노출 (30min window 지난 push 클릭에도 답할 수 있게)
function _handleReflectionUrlHint() {
  try {
    const url = new URL(window.location.href);
    const hint = url.searchParams.get('reflection');
    if (hint === 'evening' || hint === 'morning') {
      setTimeout(() => {
        if (typeof showReflectionModal === 'function') showReflectionModal(hint);
      }, 1200);
      url.searchParams.delete('reflection');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) { /* noop */ }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'reflection-open'
        && (event.data.timeOfDay === 'evening' || event.data.timeOfDay === 'morning')) {
      setTimeout(() => {
        if (typeof showReflectionModal === 'function') showReflectionModal(event.data.timeOfDay);
      }, 500);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _handleReflectionUrlHint);
} else {
  _handleReflectionUrlHint();
}
