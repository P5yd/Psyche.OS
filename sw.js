/* PSYCHE.OS v3 · service worker
   Caches the app shell so the console runs offline once visited.
   Network-first for data/, cache-first for static assets. */
const CACHE = 'psycheos-v3-10';
const SHELL = [
  'index.html', 'login.html', 'dashboard.html', 'manifest.json',
  'css/core.css', 'css/typography.css', 'css/theme.css', 'css/animations.css',
  'css/particles.css', 'css/entry.css', 'css/layout.css', 'css/widgets.css', 'css/calendar.css', 'css/guide.css', 'css/theme-light.css',
  'js/storage.js', 'js/particles.js', 'js/boot.js', 'js/assessments.js',
  'js/ai.js', 'js/reports.js', 'js/clinical.js', 'js/calendar.js', 'js/guide.js', 'js/dashboard.js', 'js/students.js', 'js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // data: always try network first so the seed file reflects edits
  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // shell + assets: cache first, fall back to network and cache it
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => hit))
  );
});
