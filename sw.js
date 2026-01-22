const CACHE_NAME = 'snu-ai-golf-v3.5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './admin.html',
    './admin_records.html',
    './login.html',
    './gallery.html',
    './style.css',
    './script.js',
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
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
