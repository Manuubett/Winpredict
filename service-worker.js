const CACHE_NAME = 'my-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './logo.png',
  // Add all assets you want cached
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});
