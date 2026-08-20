const CACHE_NAME = 'spray-wall-cache-v3'; // Новая версия кэша! Заставит телефоны обновиться.
const urlsToCache = [
    '/', 
    '/index.html', 
    '/icon.jpg', 
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
    self.skipWaiting();
});

// Убиваем старый кэш
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Перехватываем запросы
self.addEventListener('fetch', event => {
    // ВАЖНО: Запросы к базе данных (API) НИКОГДА не кэшируем! Они идут напрямую к Питону.
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Для всего остального (дизайн, картинки) пытаемся загрузить из сети, если нет - берем из кэша
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});