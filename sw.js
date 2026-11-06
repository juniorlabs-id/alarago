/* AlaraGo — service worker: app shell offline + cache font/CDN. Data API (script.google.com) tidak pernah di-cache di sini. */
const VERSION = 'alarago-v2.0.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/config.js', './js/icons.js', './js/util.js', './js/logic.js', './js/cloud.js', './js/drive.js', './js/penerima.js', './js/api.js', './js/demo.js', './js/ui.js',
  './js/pages/auth.js', './js/pages/dasbor.js', './js/pages/kalender.js', './js/pages/inventaris.js', './js/pages/dosis.js',
  './js/pages/dc.js', './js/pages/survei.js', './js/pages/arsip.js', './js/pages/inspeksi.js', './js/pages/pengaturan.js',
  './js/pages/portal.js', './js/pages/akses.js', './js/pages/cetak.js', './js/app.js', './js/vendor/qrcode.min.js', './js/kalender-mini.js',
  './icons/favicon.svg', './icons/favicon-32.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'
];
const EXT_CACHE = 'alarago-ext-v1';
const EXT = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//;
const NEVER = /^https:\/\/(script\.google\.com|script\.googleusercontent\.com|accounts\.google\.com|oauth2\.googleapis\.com|www\.googleapis\.com|sheets\.googleapis\.com|content\.googleapis\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== EXT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || NEVER.test(req.url)) return; // biarkan browser menangani langsung
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // navigasi: selalu kembalikan index.html (SPA hash router), segarkan di latar
    const root = new URL(self.registration.scope).pathname;
    const isApp = url.pathname === root || url.pathname === root + 'index.html';
    if (req.mode === 'navigate' && !isApp) {
      // halaman lain (poc/, privasi.html): jaringan dulu, cadangan dari cache
      e.respondWith(fetch(req).then(res => { if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req)));
      return;
    }
    if (req.mode === 'navigate') {
      e.respondWith(caches.match('./index.html').then(hit => {
        const net = fetch(req).then(res => { if (res.ok) caches.open(VERSION).then(c => c.put('./index.html', res.clone())); return res; }).catch(() => hit);
        return hit || net;
      }));
      return;
    }
    // aset sendiri: stale-while-revalidate → instan, tetap terbarui
    e.respondWith(caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }

  if (EXT.test(req.url)) {
    // font & pustaka CDN berversi: cache-first
    e.respondWith(caches.open(EXT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
  }
});
