const CACHE_NAME = 'snu-ai-golf-v6.34';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './admin.html',
    './admin_records.html',
    './login.html',
    './gallery.html',
    './style.css',
    './script.js',
    './admin_stats.js',
    './gallery_logic.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './images/hero_ball.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force update
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Force refresh: Delete old caches and claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(), // Take control of all clients immediately
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isNavigation = event.request.mode === 'navigate';
    const isMainJsOrCss = url.pathname.endsWith('script.js') || url.pathname.endsWith('style.css');

    // HTML 파일 및 메인 스크립트/스타일시트는 Network-First 정책을 적용하여 캐시 고착을 근본적으로 해결
    if (isNavigation || isMainJsOrCss) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 200) {
                        const responseCopy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseCopy);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    } else {
        // 이미지, 아이콘 등 변경이 거의 없는 자산은 Cache-First 정책 사용
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});
