const BDD_CRM_SHELL_CACHE = 'bdd-crm-shell-2026.09.19-3';
const BDD_CRM_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(BDD_CRM_SHELL_CACHE)
      .then(cache => cache.addAll(BDD_CRM_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('bdd-crm-shell-') && key !== BDD_CRM_SHELL_CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation is network-first so newly deployed CRM builds take effect.
  // The cached shell is used only when the network is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(BDD_CRM_SHELL_CACHE).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache only the explicitly listed local shell assets. CRM API responses,
  // authentication, calendar data, and account data never enter this cache.
  const localPath = './' + url.pathname.split('/').pop();
  if (!BDD_CRM_SHELL_FILES.includes(localPath)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
