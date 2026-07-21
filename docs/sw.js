/* WizNerdZ shell service worker — offline fallback for core pages only */
const CACHE = "wiznerdz-shell-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./404.html",
  "./token.html",
  "./rarity.html",
  "./css/tokens.css",
  "./js/config.js",
  "./health.json",
  "./assets/logo_mark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for APIs / JSON metadata; cache-first for shell
  const isShell =
    PRECACHE.some((p) => url.pathname.endsWith(p.replace("./", "/"))) ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");

  if (isShell) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => caches.match("./index.html"))
      )
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(() => caches.match(req))
  );
});
