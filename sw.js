// Acampada Pixel: plays offline once it has been opened. Every file is served from the phone first and refreshed
// from the internet in the background, so a new version shows up the next time the game is opened.
const CACHE = 'acampada-pixel-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'saxofone.m4a', 'vitoria.m4a', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return; // audio elements ask for ranges: leave those to the network
  const url = new URL(r.url);
  if (url.protocol !== 'https:') return;
  const fresh = caches.open(CACHE).then(c => fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }));
  e.waitUntil(fresh.catch(() => {}));
  e.respondWith(caches.open(CACHE).then(c => c.match(r, { ignoreSearch: r.mode === 'navigate' })).then(hit => hit || fresh));
});
