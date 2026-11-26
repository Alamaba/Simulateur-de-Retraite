/* =====================================================================
   Service worker : fonctionnement hors ligne du simulateur
   - Fichiers de l'application : servis depuis le cache, mis à jour en
     arrière-plan (la nouvelle version s'affiche au lancement suivant).
   - Polices Google : mises en cache à la première visite.
   ⚠ Changer CACHE à chaque mise en ligne (même valeur que version dans
     js/config.js) pour forcer la mise à jour sur les téléphones.
   ===================================================================== */
var CACHE = 'pension-2026.11.11';
var FILES = [
  './',
  'simulateur.html',
  'css/style.css',
  'js/config.js',
  'js/calcul.js',
  'js/i18n.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Polices : cache d'abord
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      });
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Application : cache, puis mise à jour en arrière-plan
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit || c.match('simulateur.html'); });
      return hit || net;
    });
  }));
});
