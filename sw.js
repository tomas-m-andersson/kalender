/* Gör att kalendern kan installeras som app, öppnas snabbt och visa push-påminnelser.
   Sidans egna filer hämtas alltid från nätet först (så du får senaste versionen)
   och sparas som reserv om nätet saknas. Google och GitHub hämtas aldrig härifrån. */
const CACHE = 'kalender-v12';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './badge-96.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
/* Påminnelse från push-tjänsten → visa notisen */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { text: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titel || 'Kalender', {
    body: d.text || '',
    tag: d.tag || 'kalender',
    icon: 'icon-192.png',
    badge: 'badge-96.png',
    vibrate: [120, 60, 120],
    data: { url: './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const own = list.find(c => c.url.indexOf(self.registration.scope) === 0);
    return own ? own.focus() : self.clients.openWindow('./');
  }));
});
