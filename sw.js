/* Matric Maths service worker — cache-first PWA */
const VERSION = "mm-v1";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./data/index.json",
  "./data/algebra.json",
  "./data/sequences.json",
  "./data/functions.json",
  "./data/finance.json",
  "./data/calculus.json",
  "./data/probability.json",
  "./data/statistics.json",
  "./data/analytical-geometry.json",
  "./data/trigonometry.json",
  "./data/euclidean-geometry.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css",
  "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js",
  "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const fetched = fetch(e.request)
        .then((res) => {
          if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes("jsdelivr") || e.request.url.includes("fonts."))) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fetched;
    })
  );
});
