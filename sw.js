// きょうざい Service Worker（メニューと全教材で1つ）
// ファイルを更新したら CACHE_VERSION の数字を上げてください。
// 教材をふやしたら、そのファイルを ASSETS に足してください。
// 教材を追加・修正したら、news.json に おしらせを1件 足してください（くわしくは CLAUDE.md）。
var CACHE_VERSION = 'v37';
var CACHE_PREFIX = 'hiragana-cards-';   // 以前の版の保存を消せるように、名前はそのまま
var CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

var ASSETS = [
  // メニュー・共通
  './',
  './index.html',
  './menu.css',
  './menu.js',
  './news.js',
  './news.json',
  './common.css',
  './pwa.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // 共通の部品
  './shared/koe-switch.js',
  './shared/game-lock.js',
  './shared/shisen.js',
  './shared/kiroku.js',
  './shared/mondai.js',
  './shared/mondai.css',
  './shared/qr/qrcode.js',
  './shared/qr/jsQR.js',
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
  // けいさん
  './keisan/',
  './keisan/index.html',
  './keisan/keisan.css',
  './keisan/keisan.js',
  // きせつクイズ
  './kisetsu/',
  './kisetsu/index.html',
  './kisetsu/kisetsu.css',
  './kisetsu/kanji.js',
  './kisetsu/data.js',
  './kisetsu/kisetsu.js',
  // なぞりがき
  './nazori/',
  './nazori/index.html',
  './nazori/nazori.css',
  './nazori/strokes.js',
  './nazori/nazori.js',
  // しんけいすいじゃく
  './shinkei/',
  './shinkei/index.html',
  './shinkei/shinkei.css',
  './shinkei/art.js',
  './shinkei/shinkei.js',
  // ぬりえ
  './nurie/',
  './nurie/index.html',
  './nurie/nurie.css',
  './nurie/art.js',
  './nurie/nurie.js',
  // かざりつけ
  './kazari/',
  './kazari/index.html',
  './kazari/kazari.css',
  './kazari/art.js',
  './kazari/kazari.js',
  // がっき
  './gakki/',
  './gakki/index.html',
  './gakki/gakki.css',
  './gakki/oto.js',
  './gakki/otogame.js',
  './gakki/gakki.js',
  // ぴよぴよ ラン
  './game/',
  './game/index.html',
  './game/game.css',
  './game/game.js',
  // たべもの キャッチ
  './catch/',
  './catch/index.html',
  './catch/catch.css',
  './catch/catch.js',
  // ランキング（せんせい よう）
  './ranking/',
  './ranking/index.html',
  './ranking/ranking.css',
  './ranking/ranking.js'
];

// しせん（カメラで 目の 向きを よむ）用の MediaPipe（ぜんぶで 約25MB）。
// 大きいので、教材の 版を 上げる たびに 取り直さないよう、べつの 保存場所に 入れる。
// 「めで あそぶ（カメラ）」を はじめて つかった ときに まとめて 保存し、そのあとは オフラインでも 動く。
// MediaPipe の ファイルを 入れかえた ときだけ、SHISEN_CACHE の 名前を 変えてください。
var SHISEN_CACHE = 'kyozai-shisen-mp0.10.35-1';
var SHISEN_DIR = '/shared/mediapipe/';
var SHISEN_ASSETS = [
  './shared/mediapipe/vision_bundle.mjs',
  './shared/mediapipe/wasm/vision_wasm_internal.js',
  './shared/mediapipe/wasm/vision_wasm_internal.wasm',
  './shared/mediapipe/wasm/vision_wasm_nosimd_internal.js',
  './shared/mediapipe/wasm/vision_wasm_nosimd_internal.wasm',
  './shared/mediapipe/face_landmarker.task'
];
function isShisen(url) { return new URL(url).pathname.indexOf(SHISEN_DIR) !== -1; }

self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'cache-shisen') return;
  event.waitUntil(
    caches.open(SHISEN_CACHE).then(function (cache) {
      return Promise.all(SHISEN_ASSETS.map(function (url) {
        var full = new URL(url, self.registration.scope).href;
        return cache.match(full).then(function (hit) {
          if (hit) return;
          return fetch(full, { cache: 'reload' }).then(function (res) {
            if (res && res.ok) return cache.put(full, res);
          }).catch(function () {});
        });
      }));
    })
  );
});

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
        // しせん用は、名前が 変わった（MediaPipe を 入れかえた）ときだけ けす
        if (key.indexOf('kyozai-shisen-') === 0 && key !== SHISEN_CACHE) {
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
      caches.open(isShisen(request.url) ? SHISEN_CACHE : CACHE_NAME).then(function (cache) { cache.put(key.href, copy); });
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

  // しせん用の 大きな ファイルは、保存してあれば それを つかう（中身は 版の 名前で きまっている）
  if (isShisen(req.url)) {
    event.respondWith(caches.open(SHISEN_CACHE).then(function (cache) {
      var key = new URL(req.url);
      key.search = '';
      key.hash = '';
      return cache.match(key.href).then(function (hit) { return hit || networkFirst(req); });
    }));
    return;
  }

  // ページ（メニュー・各教材）も CSS・JS も、同じくネット優先（版がずれないように）
  event.respondWith(networkFirst(req));
});
