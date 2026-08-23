// 🔥 СКРИПТ-КАМИКАДЗЕ: УНИЧТОЖИТЕЛЬ КЭША 🔥

self.addEventListener('install', (e) => {
    // Заставляем новый Service Worker активироваться немедленно
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // При активации пробегаемся по всем кэшам и УДАЛЯЕМ ИХ НАХЕР
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => caches.delete(key)));
        }).then(() => {
            self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Больше ничего не кэшируем! Всегда берем свежий файл из интернета
    e.respondWith(fetch(e.request));
});