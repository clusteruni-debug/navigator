// Navigator Service Worker v6.11
// ⚠️ JS/CSS 파일 추가·삭제 시 이 목록과 navigator-v5.html 모두 업데이트 필요
const CACHE_NAME = 'navigator-v6-11';
const urlsToCache = [
  './navigator-v5.html',
  './manifest.json',
  // CSS (navigator.css @import 순서)
  './css/navigator.css',
  './css/base.css',
  './css/nav.css',
  './css/dashboard.css',
  './css/profile.css',
  './css/revenue.css',
  './css/buttons.css',
  './css/forms.css',
  './css/header.css',
  './css/tasks.css',
  './css/modals.css',
  './css/subtasks.css',
  './css/focus.css',
  './css/habits.css',
  './css/life.css',
  './css/work.css',
  './css/work-project.css',
  './css/work-tasks.css',
  './css/work-modal.css',
  './css/work-dashboard.css',
  './css/schedule.css',
  './css/rhythm.css',
  './css/effects.css',
  './css/settings.css',
  './css/pomodoro.css',
  './css/views.css',
  './css/events.css',
  './css/history.css',
  './css/responsive.css',
  './css/command-palette.css',
  './css/typography-override.css',
  // JS (navigator-v5.html script 순서)
  './js/utils.js',
  './js/utils-data.js',
  './js/utils-daily.js',
  './js/state-types.js',
  './js/state.js',
  './js/firebase-merge.js',
  './js/firebase-backup.js',
  './js/firebase-sync.js',
  './js/tasks.js',
  './js/tasks-revenue.js',
  './js/tasks-insights.js',
  './js/tasks-history.js',
  './js/tasks-history-crud.js',
  './js/actions-adhd.js',
  './js/actions-repeat.js',
  './js/actions-complete.js',
  './js/actions-edit.js',
  './js/actions-bulk.js',
  './js/actions-ui.js',
  './js/actions-add.js',
  './js/actions.js',
  './js/ui-weekly.js',
  './js/ui.js',
  './js/ui-data.js',
  './js/ui-completion-log.js',
  './js/ui-onboarding.js',
  './js/render-forms.js',
  './js/render-action.js',
  './js/render-events-supabase.js',
  './js/render-events.js',
  './js/render-life.js',
  './js/render-dashboard-sections.js',
  './js/render-dashboard.js',
  './js/render-all.js',
  './js/render-settings.js',
  './js/render.js',
  './js/globals.js',
  './js/work-data.js',
  './js/work-templates.js',
  './js/work-clipboard.js',
  './js/work-analytics.js',
  './js/work-reports.js',
  './js/work-modal-show.js',
  './js/work-modal.js',
  './js/work-modal-reports.js',
  './js/work-template-crud.js',
  './js/work-project-crud.js',
  './js/work-actions.js',
  './js/work-forms.js',
  './js/work-calendar.js',
  './js/work-render-detail.js',
  './js/work-render.js',
  './js/work-timeline.js',
  './js/work-toggles.js',
  './js/work.js',
  './js/pwa.js',
  './js/pomodoro.js',
  './js/commute.js',
  './js/commute-render.js',
  './js/rhythm-medication.js',
  './js/rhythm-merge.js',
  './js/rhythm-stats.js',
  './js/rhythm-history.js',
  './js/rhythm.js',
  './js/command-palette.js',
  './js/init.js'
];

// 설치 시 캐시 저장 (개별 파일 실패 허용 — 1개 404가 전체 SW 설치를 차단하지 않음)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(err => {
            console.warn('[SW] cache failed:', url, err.message);
          }))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 활성화 시 이전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 우선 전략: 항상 최신 파일 가져오기
self.addEventListener('fetch', event => {
  // 비-GET 요청은 SW 캐시 전략 적용하지 않음
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 유효한 응답만 캐시 업데이트
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        // 오프라인 또는 네트워크 실패 시 캐시 사용
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;

          // 앱 셸 fallback은 navigation 요청에만 적용
          if (event.request.mode === 'navigate') {
            return caches.match('./navigator-v5.html');
          }

          return Response.error();
        });
      })
  );
});

// 푸시 알림 수신
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : '확인이 필요한 작업이 있습니다',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23667eea" width="100" height="100" rx="20"/><text x="50" y="68" font-size="50" text-anchor="middle" fill="white">⚡</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f5576c" width="100" height="100" rx="50"/></svg>',
    vibrate: [100, 50, 100],
    tag: 'navigator-reminder',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification('Navigator', options)
  );
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('navigator') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./navigator-v5.html');
      }
    })
  );
});
