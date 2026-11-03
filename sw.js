// Acampada Pixel: installable and playable offline.
// The game page: the copy on the phone straight away (opening the app, or coming back to it after the phone closed
// it, shows no white screen while the internet answers); the internet is asked at the same time, and if a newer page
// arrives the game offers to reload. With no copy yet: the internet.
// The shared square (multiplayer.html) and the list of protests (manifestacoes.json): from the internet whenever
// possible (at most 3 s, then the copy on the phone). Music, icons and the rest: from the phone first, refreshed in the background (they rarely change).
const CACHE = 'acampada-pixel-v2';
const CORE = ['./', 'index.html', 'manifest.json', 'saxofone.m4a', 'vitoria.m4a', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const tellPages = () => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage('acampada-update')));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return; // audio elements ask for ranges: leave those to the network
  const url = new URL(r.url);
  if (url.protocol !== 'https:') return;
  if (url.origin !== location.origin && url.hostname.startsWith('praca.')) return; // the shared square's server: always live
  const page = r.mode === 'navigate' || (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('manifestacoes.json'))); // the protests list changes too
  if (page) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      let usedCopy = false;
      const net = fetch(r.url, { cache: 'no-store', credentials: 'same-origin' }).then(async res => { // (a navigation request can't be refetched with options)
        if (res && res.ok) {
          const old = usedCopy ? await c.match(r, { ignoreSearch: true }) : null;
          await c.put(r, res.clone());
          if (old && !url.pathname.endsWith('.json') && (await old.text()) !== (await res.clone().text())) await tellPages(); // a newer game arrived
        }
        return res;
      });
      if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) { const copy = await c.match(r, { ignoreSearch: true }); if (copy) { usedCopy = true; e.waitUntil(net.catch(() => {})); return copy; } } // the game: the copy first
      const first = await Promise.race([net.catch(() => null), new Promise(ok => setTimeout(() => ok(null), 3000))]);
      if (first) return first;
      usedCopy = true;
      e.waitUntil(net.catch(() => {}));
      return (await c.match(r, { ignoreSearch: true })) || net;
    })());
    return;
  }
  const fresh = caches.open(CACHE).then(c => fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }));
  e.waitUntil(fresh.catch(() => {}));
  e.respondWith(caches.open(CACHE).then(c => c.match(r)).then(hit => hit || fresh));
});
