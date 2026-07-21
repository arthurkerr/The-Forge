/* The Forge — Service Worker v2
   Stratégie : network-first pour l'application (mises à jour immédiates),
   cache-first pour les icônes/manifest, bascule hors-ligne sur le cache. */
const CACHE = "forge-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting(); /* active la nouvelle version sans attendre */
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim(); /* prend le contrôle des onglets ouverts */
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const isApp = req.mode === "navigate" || req.url.includes("index.html");
  if (isApp) {
    /* network-first : toujours tenter le réseau, cache en secours (hors-ligne) */
    e.respondWith(
      fetch(req).then((res) => {
        const cp = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", cp)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html"))
    );
  } else {
    /* assets : cache-first avec remplissage */
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const cp = res.clone();
        caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => {});
        return res;
      }))
    );
  }
});
