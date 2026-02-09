const CACHE_NAME = 'campus-notes-v11';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/auth.js',
    './js/drive.js',
    './js/ui.js',
    './icons/new-icon-192.png',
    './icons/new-icon-512.png',
    './icons/new-icon-apple.png',
    './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event (Cleanup)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Fetch Event (Cache First)
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip Google API calls (Drive, Auth, etc.) - always network
    if (url.hostname.includes('google') || url.hostname.includes('googleapis')) {
        return;
    }

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((response) => {
            return response || fetch(event.request);
        })
    );
});
