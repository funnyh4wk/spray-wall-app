// Этот файл нужен просто чтобы Chrome на Android признал нас за полноценное PWA приложение
self.addEventListener('fetch', function(event) {
    // Пока что мы ничего не кэшируем, просто пропускаем запросы
});