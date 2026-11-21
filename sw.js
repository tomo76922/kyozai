// ひらがなカード Service Worker
// ファイルを更新したら CACHE_VERSION の数字を上げてください。
var CACHE_VERSION = 'v4';
var CACHE_PREFIX = 'hiragana-cards-';
var CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// 新しい版を入れるときは、ブラウザのHTTPキャッシュを通さずに取り直す
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(ASSETS.map(function (url) {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// ネット優先：つながっていれば最新を取りに行き、保存も更新する。
// つながっていないときだけ、保存してある版を返す。
function networkFirst(request, cacheKey) {
  return fetch(request, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(cacheKey, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(cacheKey, { ignoreSearch: true }).then(function (cached) {
      return cached || Response.error();
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // ページ本体は index.html として保存・取り出しする
    event.respondWith(networkFirst(req, './index.html'));
    return;
  }

  // CSS・JS なども同じくネット優先（ページと版がずれないように）
  event.respondWith(networkFirst(req, req));
});
