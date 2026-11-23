// きょうざい Service Worker（メニューと全教材で1つ）
// ファイルを更新したら CACHE_VERSION の数字を上げてください。
// 教材をふやしたら、そのファイルを ASSETS に足してください。
var CACHE_VERSION = 'v16';
var CACHE_PREFIX = 'hiragana-cards-';   // 以前の版の保存を消せるように、名前はそのまま
var CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

var ASSETS = [
  // メニュー・共通
  './',
  './index.html',
  './menu.css',
  './common.css',
  './pwa.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // ひらがなカード
  './hiragana/',
  './hiragana/index.html',
  './hiragana/style.css',
  './hiragana/app.js',
  // みえる タイマー
  './timer/',
  './timer/index.html',
  './timer/timer.css',
  './timer/timer.js',
  // きもちカード
  './kimochi/',
  './kimochi/index.html',
  './kimochi/kimochi.css',
  './kimochi/kimochi.js',
  // かずあそび
  './kazu/',
  './kazu/index.html',
  './kazu/kazu.css',
  './kazu/kazu.js',
  // とけい
  './tokei/',
  './tokei/index.html',
  './tokei/tokei.css',
  './tokei/tokei.js',
  // よていボード
  './yotei/',
  './yotei/index.html',
  './yotei/yotei.css',
  './yotei/yotei.js',
  // おかね
  './okane/',
  './okane/index.html',
  './okane/okane.css',
  './okane/okane.js',
  // きせつクイズ
  './kisetsu/',
  './kisetsu/index.html',
  './kisetsu/kisetsu.css',
  './kisetsu/kanji.js',
  './kisetsu/data.js',
  './kisetsu/kisetsu.js'
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

// 保存してある版をさがす（"?" より後ろは見ない。"/" で終わらない URL は "/" をつけても さがす）
function fromCache(url) {
  var u = new URL(url);
  u.search = '';
  u.hash = '';
  var tries = [u.href];
  if (!/\/$/.test(u.pathname) && !/\.[a-z0-9]+$/i.test(u.pathname)) tries.push(u.href + '/');
  var i = 0;
  function next() {
    if (i >= tries.length) return Promise.resolve(Response.error());
    return caches.match(tries[i++], { ignoreSearch: true }).then(function (hit) {
      return hit || next();
    });
  }
  return next();
}

// ネット優先：つながっていれば最新を取りに行き、保存も更新する。
// つながっていないときだけ、保存してある版を返す。
function networkFirst(request) {
  return fetch(request, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok && res.type === 'basic' && !res.redirected) {
      var key = new URL(request.url);
      key.search = '';
      key.hash = '';
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(key.href, copy); });
    }
    return res;
  }).catch(function () {
    return fromCache(request.url);
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // ページ（メニュー・各教材）も CSS・JS も、同じくネット優先（版がずれないように）
  event.respondWith(networkFirst(req));
});
