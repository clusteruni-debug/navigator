// ============================================
// 매일 자문 — Push Notification (Phase 7)
// iOS PWA 17.4+ web push 지원, fallback = client-side setTimeout + sw.js showNotification
// 서버측 push (Firebase Cloud Functions) 는 plan §Out of scope
// ============================================

const _reflectionPushTimeouts = { evening: null, morning: null };

const _REFLECTION_PUSH_ICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23667eea" width="100" height="100" rx="20"/><text x="50" y="70" font-size="60" text-anchor="middle" fill="white">🌙</text></svg>';
const _REFLECTION_PUSH_BADGE = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%234f8cff" width="100" height="100" rx="50"/></svg>';

async function startReflectionPushSchedule() {
  if (!appState || !appState.dailyReflection || !appState.dailyReflection.settings) return;
  if (!appState.dailyReflection.settings.pushEnabled) return;

  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log('[reflection-push] PWA 또는 Notification 미지원 → fallback (visibilitychange) 만 동작');
    return;
  }

  // 권한 요청 (한 번만, granted 상태에선 noop)
  if (Notification.permission === 'default') {
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return;
    } catch (e) {
      console.warn('[reflection-push] 권한 요청 실패:', e);
      return;
    }
  }
  if (Notification.permission !== 'granted') return;

  scheduleNextReflectionPush('evening');
  if (appState.dailyReflection.settings.morningTime) {
    scheduleNextReflectionPush('morning');
  }
}

function stopReflectionPushSchedule() {
  for (const k of Object.keys(_reflectionPushTimeouts)) {
    if (_reflectionPushTimeouts[k]) {
      clearTimeout(_reflectionPushTimeouts[k]);
      _reflectionPushTimeouts[k] = null;
    }
  }
}

function scheduleNextReflectionPush(timeOfDay) {
  const settings = appState.dailyReflection.settings;
  const targetStr = timeOfDay === 'evening' ? settings.eveningTime : settings.morningTime;
  if (!targetStr) return;

  const [hh, mm] = targetStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);

  // 이미 지났으면 다음날
  if (target <= now) target.setDate(target.getDate() + 1);

  const delay = target - now;

  if (_reflectionPushTimeouts[timeOfDay]) {
    clearTimeout(_reflectionPushTimeouts[timeOfDay]);
  }
  _reflectionPushTimeouts[timeOfDay] = setTimeout(
    () => firePushNotification(timeOfDay),
    delay
  );

  console.log(`[reflection-push] ${timeOfDay} 알림 예약 — ${target.toLocaleString()} (delay=${Math.round(delay / 60000)}분)`);
}

async function firePushNotification(timeOfDay) {
  // 이미 답했으면 skip + 다음날 재예약
  if (typeof getReflectionToday === 'function') {
    const today = getReflectionToday();
    if (today[timeOfDay] && !today[timeOfDay].skipped) {
      scheduleNextReflectionPush(timeOfDay);
      return;
    }
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const title = timeOfDay === 'evening' ? '🌙 저녁 자문 (3분)' : '☀️ 아침 자문 (3분)';
    const body = timeOfDay === 'evening'
      ? '오늘 30분 룰 / 과잉 약속 / 내일 작은 약속 — 답하면 streak +1'
      : '오늘 분기 목표 / 신체 베이스라인 / 어제 후회한 충동';
    await reg.showNotification(title, {
      body,
      tag: `reflection-${timeOfDay}`,
      icon: _REFLECTION_PUSH_ICON,
      badge: _REFLECTION_PUSH_BADGE,
      vibrate: [100, 50, 100],
      data: { url: './navigator-v5.html', reflectionTimeOfDay: timeOfDay }
    });
  } catch (e) {
    console.warn('[reflection-push] showNotification 실패:', e);
  }

  // 다음날 재예약
  scheduleNextReflectionPush(timeOfDay);
}

// module load 시 자동 init
function _initReflectionPush() {
  if (typeof appState !== 'undefined' && appState.dailyReflection) {
    startReflectionPushSchedule();
  } else {
    setTimeout(_initReflectionPush, 500);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(_initReflectionPush, 800));
} else {
  setTimeout(_initReflectionPush, 800);
}
