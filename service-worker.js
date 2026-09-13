const CACHE="celam-v24-retos-instant-save";
const FILES=["./","./index.html","./style.css","./data.js","./app.js","./auth.js","./manifest.webmanifest","./assets/celam-logo.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request))));
