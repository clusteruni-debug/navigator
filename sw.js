// Navigator Service Worker v6.5
const CACHE_NAME = 'navigator-v6-5';
const urlsToCache = [
  './navigator-v5.html',
  './manifest.json'
];

// 설치 시 캐시 저장
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
        // 오프라인일 때만 캐시 사용
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
