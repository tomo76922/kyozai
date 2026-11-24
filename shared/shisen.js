// しせん（共通の部品）
// iPad の インカメラの 映像から、MediaPipe Face Landmarker で 顔の 点（黒目・目じり・鼻・ほお）を 読み取り、
// 「ひだり」「まんなか」「みぎ」の どちらを 見ているかを 判定する。
// iPad の「視線トラッキング」機能に たよらないので、視線トラッキングに 対応していない iPad（第8世代など）でも 使えます。
//
// ・目（黒目の いち）、かお（顔の 向き）、りょうほう から 選べる
// ・その子に あわせる「あわせる（キャリブレーション）」の 結果は、この iPad の中に 保存する
// ・カメラの 映像は ページの中だけで 処理し、保存も 送信も しない
// ・MediaPipe の プログラムと モデルは shared/mediapipe/ に あり、外部からは 読み込まない（オフラインで 動く）
//
// つかいかた（くわしくは README の「しせん（共通の部品）」）:
//   <script src="../shared/shisen.js"></script>
//   var eye = Shisen.create({ onDir: function (dir) {...}, onStatus: function (st) {...} });
//   Shisen.explain({ onOk: function () { eye.start().then(...) } });   // なぜ カメラを つかうかを 見せてから
//   Shisen.calibrate(eye, { onDone: function () {...} });               // ひだり・まんなか・みぎ を 見てもらう
//   Shisen.openTest(eye, {});                                           // しせんテスト
(function (global) {
  'use strict';

  var MP_VERSION = '0.10.35';
  var SETTINGS_KEY = 'shisen-v1';
  var CALIB_KEY = 'shisen-calib-v1';
  var DEFAULTS = { source: 'both', dwell: 0.5, preview: false };
  var HZ = 15;                 // 判定は 1びょうに 15かいまで（ゲームが カクカク しないように）
  var ENTER = 0.5;             // まんなか → ひだり／みぎ に なる さかい（あわせた はばの 半分）
  var LEAVE = 0.35;            // ひだり／みぎ → まんなか に もどる さかい（ゆれで いったり きたり しないように）
  var MIN_SPAN = { eye: 0.012, head: 0.02 };   // これより 小さい ちがいしか ないときは 見わけられない

  var me = document.currentScript;
  var BASE = me && me.src ? new URL('mediapipe/', me.src).href : '../shared/mediapipe/';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return performance.now(); }

  function isSupported() {
    return !!(global.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof WebAssembly === 'object');
  }

  // ---------- ほぞん（この iPad の中だけ） ----------
  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function loadSettings() {
    var d = readJSON(SETTINGS_KEY) || {};
    return {
      source: d.source === 'eye' || d.source === 'face' ? d.source : 'both',
      dwell: clamp(Number(d.dwell) || DEFAULTS.dwell, 0.3, 1.5),
      preview: !!d.preview
    };
  }
  function saveSettings(s) {
    var cur = loadSettings();
    if (s.source) cur.source = s.source;
    if (s.dwell != null) cur.dwell = clamp(Number(s.dwell), 0.3, 1.5);
    if (s.preview != null) cur.preview = !!s.preview;
    return writeJSON(SETTINGS_KEY, cur);
  }
  function validTriple(t) {
    return t && isFinite(t.L) && isFinite(t.C) && isFinite(t.R);
  }
  function loadCalib() {
    var d = readJSON(CALIB_KEY);
    if (!d || !(validTriple(d.eye) || validTriple(d.head))) return null;
    return d;
  }
  function saveCalib(c) { return writeJSON(CALIB_KEY, c); }

  // ---------- 顔の 点から 目と 顔の 向きを 数に する ----------
  // eye：黒目が 目じりと 目がしらの 間の どこに あるか（左右の 目の 平均。0〜1）
  // head：鼻の 先が 左右の ほおの 間の どこに あるか（0〜1。顔の 向き）
  function features(lm) {
    if (!lm || lm.length < 478) return null;
    var eA = [lm[33], lm[133]], eB = [lm[362], lm[263]];
    var i1 = lm[468], i2 = lm[473];
    var cA = (eA[0].x + eA[1].x) / 2, cB = (eB[0].x + eB[1].x) / 2;
    // 黒目は、ちかい ほうの 目に わりあてる
    if (Math.abs(i1.x - cA) + Math.abs(i2.x - cB) > Math.abs(i1.x - cB) + Math.abs(i2.x - cA)) { var t = i1; i1 = i2; i2 = t; }
    function ratio(iris, e) {
      var lo = Math.min(e[0].x, e[1].x), hi = Math.max(e[0].x, e[1].x);
      return hi - lo > 1e-4 ? (iris.x - lo) / (hi - lo) : 0.5;
    }
    var lo = Math.min(lm[234].x, lm[454].x), hi = Math.max(lm[234].x, lm[454].x);
    return {
      eye: (ratio(i1, eA) + ratio(i2, eB)) / 2,
      head: hi - lo > 1e-4 ? (lm[1].x - lo) / (hi - lo) : 0.5
    };
  }

  // あわせた 結果（L・C・R）を もとに、-1（ひだり）〜 0（まんなか）〜 +1（みぎ） に なおす
  function norm(v, t) {
    if (!validTriple(t)) return 0;
    var d = v - t.C, toR = t.R - t.C, toL = t.L - t.C;
    if (!toR || !toL) return 0;
    if (d * toR > 0) return d / toR;
    if (d * toL > 0) return -(d / toL);
    return 0;
  }
  function spanOk(t, min) {
    return validTriple(t) && (t.R - t.C) * (t.L - t.C) < 0 && Math.min(Math.abs(t.R - t.C), Math.abs(t.L - t.C)) >= min;
  }
  // どれを つかえるか（目・かお）
  function usable(calib, source) {
    var e = !!calib && spanOk(calib.eye, MIN_SPAN.eye) && source !== 'face';
    var h = !!calib && spanOk(calib.head, MIN_SPAN.head) && source !== 'eye';
    return { eye: e, head: h };
  }
  function score(f, calib, source) {
    var u = usable(calib, source);
    var se = u.eye ? norm(f.eye, calib.eye) : 0;
    var sh = u.head ? norm(f.head, calib.head) : 0;
    if (u.eye && u.head) return Math.abs(se) >= Math.abs(sh) ? se : sh;   // りょうほう：大きく 動いた ほう
    return u.eye ? se : sh;
  }
  // prev：いまの 判定（さかいに ゆとりを もたせる）
  function classify(s, prev) {
    if (prev === 'left' ? s <= -LEAVE : s <= -ENTER) return 'left';
    if (prev === 'right' ? s >= LEAVE : s >= ENTER) return 'right';
    return 'center';
  }

  // ---------- MediaPipe（いちど だけ 読み込む） ----------
  var landmarkerP = null;
  function loadLandmarker() {
    if (landmarkerP) return landmarkerP;
    landmarkerP = import(BASE + 'vision_bundle.mjs').then(function (mp) {
      return mp.FilesetResolver.forVisionTasks(BASE + 'wasm').then(function (fileset) {
        function make(delegate) {
          return mp.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: BASE + 'face_landmarker.task', delegate: delegate },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false
          });
        }
        // GPU が つかえれば GPU（かるい）。だめなら CPU
        return make('GPU').catch(function () { return make('CPU'); });
      });
    });
    landmarkerP.then(cacheForOffline, function () { landmarkerP = null; });
    return landmarkerP;
  }
  // つかえた ときに、オフライン用に まとめて 保存してもらう（sw.js）
  function cacheForOffline() {
    try {
      var sw = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'cache-shisen' });
    } catch (e) {}
  }

  // ---------- しせんの センサー ----------
  // opt: { onDir(dir), onStatus(status), source, calib }
  //   dir：'left' / 'center' / 'right' / null（顔が 見えない）
  //   status：'loading' / 'ok' / 'noface' / 'dark'
  function create(opt) {
    opt = opt || {};
    var conf = loadSettings();
    var st = {
      source: opt.source || conf.source,
      calib: opt.calib !== undefined ? opt.calib : loadCalib(),
      stream: null, running: false, starting: null,
      raf: 0, lastRun: 0, lastTs: 0, lastFace: 0, lastLight: 0,
      sm: null, raw: null, dir: null, s: 0, status: 'loading', dark: false,
      sampling: null
    };
    var video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.muted = true;
    video.autoplay = true;
    video.className = 'ss-video';
    var light = document.createElement('canvas');
    light.width = 16; light.height = 12;
    var lightCtx = light.getContext('2d', { willReadFrequently: true });
    var landmarker = null;

    // 映像は かくした 場所に おいておく（ページの 中に ないと 止まる ことが ある）
    function park() {
      addStyle();
      var p = document.getElementById('ss-park');
      if (!p) { p = document.createElement('div'); p.id = 'ss-park'; document.body.appendChild(p); }
      p.appendChild(video);
    }

    var api = {
      video: video,
      start: start,
      stop: stop,
      isRunning: function () { return st.running; },
      getDir: function () { return st.dir; },
      getScore: function () { return st.s; },
      getStatus: function () { return st.status; },
      getRaw: function () { return st.raw; },
      getCalib: function () { return st.calib; },
      setCalib: function (c) { st.calib = c; st.dir = null; },
      setSource: function (s) { st.source = s; st.dir = null; },
      getSource: function () { return st.source; },
      canJudge: function () { var u = usable(st.calib, st.source); return u.eye || u.head; },
      sample: sample,
      showPreview: function (box) { if (box) { box.appendChild(video); video.classList.add('ss-video-show'); } else { video.classList.remove('ss-video-show'); park(); } }
    };

    // カメラを つかう（ボタンを おした ときに よぶ）
    function start() {
      if (st.running) return Promise.resolve();
      if (st.starting) return st.starting;
      if (!isSupported()) {
        var e = new Error('not supported'); e.name = 'NotSupportedError';
        return Promise.reject(e);
      }
      park();
      setStatus('loading');
      var lm = loadLandmarker();
      st.starting = navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 320 },     // 小さめの 映像で 読み取る（かるく する）
          height: { ideal: 240 },
          frameRate: { ideal: 30, max: 30 }
        }
      }).then(function (stream) {
        st.stream = stream;
        video.srcObject = stream;
        var pl = video.play();
        return Promise.all([lm, pl && pl.catch ? pl.catch(function () {}) : null]);
      }).then(function (r) {
        st.starting = null;
        if (!st.stream) throw Object.assign(new Error('stopped'), { name: 'AbortError' });
        landmarker = r[0];
        st.running = true;
        st.lastFace = now();
        st.sm = null;
        st.raf = requestAnimationFrame(tick);
      }, function (err) {
        st.starting = null;
        stopStream();
        throw err;
      });
      return st.starting;
    }

    function stopStream() {
      if (st.stream) st.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      st.stream = null;
      try { video.srcObject = null; } catch (e) {}
    }
    function stop() {
      cancelAnimationFrame(st.raf);
      st.running = false;
      stopStream();
      st.dir = null;
      if (st.sampling) { var s = st.sampling; st.sampling = null; s.done(); }
    }

    function setStatus(s) {
      if (s === st.status) return;
      st.status = s;
      if (opt.onStatus) opt.onStatus(s);
    }
    function setDir(d) {
      if (d === st.dir) return;
      st.dir = d;
      if (opt.onDir) opt.onDir(d);
    }

    // 部屋の 明るさ（1びょうに 1かい、とても 小さく して はかる）
    function checkLight() {
      try {
        lightCtx.drawImage(video, 0, 0, 16, 12);
        var d = lightCtx.getImageData(0, 0, 16, 12).data, sum = 0;
        for (var i = 0; i < d.length; i += 4) sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        st.dark = sum / (d.length / 4) < 45;
      } catch (e) { st.dark = false; }
    }

    function tick() {
      if (!st.running) return;
      st.raf = requestAnimationFrame(tick);
      var t = now();
      if (t - st.lastRun < 1000 / HZ - 4) return;
      st.lastRun = t;
      if (video.readyState < 2 || !landmarker) return;
      if (t - st.lastLight > 1000) { st.lastLight = t; checkLight(); }
      var ts = Math.max(t, st.lastTs + 1);
      st.lastTs = ts;
      var res;
      try { res = landmarker.detectForVideo(video, ts); } catch (e) { return; }
      var lm = res && res.faceLandmarks && res.faceLandmarks[0];
      var f = features(lm);
      if (st.sampling) st.sampling.add(f);
      if (f) {
        st.lastFace = t;
        // こまかい ゆれを ならす
        if (!st.sm) st.sm = { eye: f.eye, head: f.head };
        else { st.sm.eye += (f.eye - st.sm.eye) * 0.5; st.sm.head += (f.head - st.sm.head) * 0.5; }
        st.raw = { eye: st.sm.eye, head: st.sm.head };
        setStatus('ok');
        if (api.canJudge()) {
          st.s = score(st.sm, st.calib, st.source);
          setDir(classify(st.s, st.dir));
        } else {
          st.s = 0;
          setDir('center');
        }
      } else if (t - st.lastFace > 600) {
        st.sm = null;
        st.raw = null;
        setDir(null);
        setStatus(st.dark ? 'dark' : 'noface');
      }
    }

    // ms の 間 あつめて、まんなかの 値（中央値）を かえす
    function sample(ms) {
      return new Promise(function (resolve) {
        var eyes = [], heads = [], n = 0;
        if (st.sampling) st.sampling.done();
        var timer = setTimeout(function () { s.done(); }, ms);
        var s = {
          add: function (f) { n++; if (f) { eyes.push(f.eye); heads.push(f.head); } },
          done: function () {
            clearTimeout(timer);
            if (st.sampling === s) st.sampling = null;
            function med(a) { if (!a.length) return NaN; a = a.slice().sort(function (x, y) { return x - y; }); return a[a.length >> 1]; }
            resolve({ eye: med(eyes), head: med(heads), faceRatio: n ? eyes.length / n : 0, n: n });
          }
        };
        st.sampling = s;
      });
    }

    return api;
  }

  // ---------- 見た目（いちどだけ 入れる） ----------
  var CSS = [
    '#ss-park{position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none}',
    '.ss-video{display:block;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);background:#3d3a35}',
    '.ss-wrap{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;',
    'background:var(--bg,#f3efe6);color:var(--text,#3d3a35);overflow-y:auto}',
    '.ss-wrap.ss-dim{background:rgba(243,239,230,.6)}',
    '.ss-card{display:flex;flex-direction:column;align-items:center;gap:14px;width:min(760px,94vw);margin:auto;',
    'padding:clamp(18px,3vh,30px) clamp(18px,4vw,40px);background:var(--card,#fffdf7);border:3px solid var(--card-border,#e2dccf);',
    'border-radius:32px;box-shadow:0 6px 0 #d9d2c3;text-align:center}',
    '.ss-title{margin:0;font-size:clamp(28px,4.2vw,40px);font-weight:700;letter-spacing:.04em}',
    '.ss-text{margin:0;font-size:clamp(19px,2.4vw,23px);font-weight:700;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}',
    '.ss-sub{margin:0;font-size:clamp(16px,2vw,18px);color:var(--muted,#7a746a);line-height:1.5;word-break:keep-all;overflow-wrap:anywhere}',
    '.ss-err{margin:0;padding:10px 16px;font-size:18px;line-height:1.5;background:#fbe3dc;border-radius:12px;word-break:keep-all;overflow-wrap:anywhere}',
    '.ss-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:4px}',
    '.ss-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:68px;padding:8px 28px;font:inherit;',
    'font-size:clamp(20px,2.6vw,26px);font-weight:700;color:var(--text,#3d3a35);border-radius:999px;cursor:pointer;',
    'background:var(--card,#fffdf7);border:3px solid var(--card-border,#e2dccf)}',
    '.ss-btn-go{background:#e3efe2;border-color:#8fb58c}.ss-btn:active{background:var(--active,#f6e7c8)}',
    '.ss-btn:focus-visible{outline:4px solid var(--active-border,#c9a96b);outline-offset:3px}',
    '.ss-icon{width:64px;height:64px;padding:10px;border-radius:50%;background:var(--btn,#e6efe9);border:3px solid var(--btn-border,#a9c2b3)}',
    '.ss-spin{width:44px;height:44px;border-radius:50%;border:6px solid #e8e1d2;border-top-color:#8fb58c;animation:ss-spin 1s linear infinite}',
    // あわせる
    '.ss-cal{position:fixed;inset:0;z-index:60;background:#cfd3c9;color:var(--text,#3d3a35)}',
    '.ss-dot{position:absolute;top:44%;width:clamp(96px,14vmin,140px);height:clamp(96px,14vmin,140px);margin:calc(clamp(96px,14vmin,140px)/-2) 0 0 calc(clamp(96px,14vmin,140px)/-2);',
    'border-radius:50%;background:#fffdf7;border:6px solid #3d3a35;box-shadow:0 0 0 10px rgba(255,253,247,.55);transition:left .5s ease}',
    '.ss-dot::after{content:"";position:absolute;left:50%;top:50%;width:26%;height:26%;margin:-13% 0 0 -13%;border-radius:50%;background:#e0524a}',
    '.ss-dot svg{position:absolute;inset:-18px;width:calc(100% + 36px);height:calc(100% + 36px);transform:rotate(-90deg)}',
    '.ss-dot.is-wait{animation:ss-pulse 1s ease-in-out infinite}',
    '.ss-say{position:absolute;left:50%;top:70%;transform:translateX(-50%);margin:0;padding:10px 28px;font-size:clamp(26px,3.6vw,36px);',
    'font-weight:700;background:rgba(255,253,247,.92);border:3px solid var(--card-border,#e2dccf);border-radius:999px;white-space:nowrap}',
    '.ss-cal-cancel{position:absolute;right:16px;bottom:16px}',
    '.ss-cal-msg{position:absolute;left:50%;top:84%;transform:translateX(-50%);margin:0;font-size:20px;font-weight:700;color:#b4583f;white-space:nowrap}',
    // テスト
    '.ss-dirs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%}',
    '.ss-dir{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:clamp(110px,18vh,160px);',
    'border-radius:24px;border:4px solid var(--card-border,#e2dccf);background:#f6f2e9;font-size:clamp(26px,4vw,40px);font-weight:700;color:#b9b1a2}',
    '.ss-dir svg{width:44px;height:44px}',
    '.ss-dir.is-on{background:#f6e7c8;border-color:#c9a96b;color:var(--text,#3d3a35);transform:scale(1.04)}',
    '.ss-state{margin:0;min-height:1.6em;font-size:clamp(20px,2.6vw,26px);font-weight:700}',
    '.ss-state.is-warn{color:#b4583f}',
    '.ss-prev{width:min(240px,60vw);aspect-ratio:4/3;border-radius:16px;overflow:hidden;border:3px solid var(--card-border,#e2dccf)}',
    '.ss-meter{position:relative;width:100%;height:16px;border-radius:999px;background:#e8e1d2}',
    '.ss-meter i{position:absolute;top:-6px;width:28px;height:28px;margin-left:-14px;border-radius:50%;background:#3d3a35;transition:left .08s linear}',
    '.ss-meter b{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1.5px;background:#c8665a}',
    '@keyframes ss-spin{to{transform:rotate(360deg)}}',
    '@keyframes ss-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}',
    '@media (prefers-reduced-motion:reduce){.ss-dot.is-wait,.ss-spin{animation:none}.ss-dot{transition:none}}'
  ].join('');
  function addStyle() {
    if (document.getElementById('ss-style')) return;
    var s = document.createElement('style');
    s.id = 'ss-style';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function el(html) {
    addStyle();
    var d = document.createElement('div');
    d.innerHTML = html;
    var n = d.firstChild;
    document.body.appendChild(n);
    return n;
  }
  var CAM_SVG = '<svg class="ss-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.4-2h6.6l1.4 2h1.8A2.5 2.5 0 0 1 21 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z"/><circle cx="12" cy="12.5" r="3.6"/></svg>';

  // ことば（カメラが つかえなかった とき）
  function errorMessage(err) {
    var name = err && err.name;
    if (name === 'NotSupportedError' || name === 'SecurityError' || !isSupported()) {
      return 'この ページでは カメラが つかえません。インターネットの アドレス（https://…）で ひらいてください。';
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'カメラを つかう きょかが ありません。iPad の「せってい」→「Safari」→「カメラ」を「きょか」にしてから、もういちど ためしてください。';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'カメラが みつかりません。';
    if (name === 'NotReadableError') return 'カメラを ほかの アプリが つかっているようです。ほかの アプリを とじてから、もういちど ためしてください。';
    return 'カメラの じゅんびが できませんでした。はじめて つかう ときは、インターネットに つながった ところで ためしてください。';
  }

  // ---------- カメラを つかう まえの おしらせ ----------
  // opt: { eye, onOk, onCancel, purpose }  → eye.start() まで する（purpose：なにの ために つかうか。はじめは「ひよこを うごかす」）
  var explained = false;
  function explain(opt) {
    var eye = opt.eye;
    if (eye.isRunning()) { opt.onOk(); return; }
    var w = el('<div class="ss-wrap ss-dim"><div class="ss-card" role="dialog" aria-modal="true" aria-labelledby="ss-t1">' +
      CAM_SVG +
      '<p class="ss-title" id="ss-t1">カメラを つかうね</p>' +
      '<p class="ss-text">どちらを みているかを しらべて ' + (opt.purpose || 'ひよこを うごかす') + 'ために、iPad の まえの カメラを つかいます。<br>' +
      'うつした ようすは この iPad の なかだけで つかい、ほぞんも しないし、どこにも おくりません。</p>' +
      '<p class="ss-sub">このあと「カメラを つかっても いいですか」と きかれたら、「きょか」を おしてね。</p>' +
      '<div class="ss-loading" hidden><div class="ss-spin" aria-hidden="true"></div><p class="ss-sub">じゅんびしています…（はじめては すこし じかんが かかります）</p></div>' +
      '<p class="ss-err" role="alert" hidden></p>' +
      '<div class="ss-btns"><button type="button" class="ss-btn ss-btn-go" data-a="ok">カメラを つかう</button>' +
      '<button type="button" class="ss-btn" data-a="no">やめる</button></div></div></div>');
    var okBtn = w.querySelector('[data-a="ok"]');
    var loading = w.querySelector('.ss-loading');
    var errEl = w.querySelector('.ss-err');
    function close() { if (w.parentNode) w.parentNode.removeChild(w); }
    function go() {
      explained = true;
      errEl.hidden = true;
      loading.hidden = false;
      loading.style.display = 'flex'; loading.style.flexDirection = 'column'; loading.style.alignItems = 'center'; loading.style.gap = '6px';
      okBtn.disabled = true;
      eye.start().then(function () { close(); opt.onOk(); }, function (err) {
        loading.hidden = true; loading.style.display = '';
        okBtn.disabled = false;
        okBtn.textContent = 'もういちど ためす';
        errEl.textContent = errorMessage(err);
        errEl.hidden = false;
      });
    }
    okBtn.addEventListener('click', go);
    w.querySelector('[data-a="no"]').addEventListener('click', function () { eye.stop(); close(); if (opt.onCancel) opt.onCancel(); });
    try { okBtn.focus({ preventScroll: true }); } catch (e) {}
    // いちど せつめい して きょかも あれば、すぐ じゅんびに はいる
    if (explained) go();
  }

  // ---------- よみあげ ----------
  function say(text, on) {
    if (!on || !global.speechSynthesis || !global.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.9;
      u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- あわせる（キャリブレーション） ----------
  // opt: { speak: true, askSame: true, onDone(calib), onCancel() }
  function calibrate(eye, opt) {
    opt = opt || {};
    var saved = loadCalib();
    if (opt.askSame !== false && saved) {
      var w0 = el('<div class="ss-wrap ss-dim"><div class="ss-card" role="dialog" aria-modal="true" aria-labelledby="ss-t2">' +
        '<p class="ss-title" id="ss-t2">めの じゅんび</p>' +
        '<p class="ss-text">まえに あわせた ときと おなじで いい？</p>' +
        '<p class="ss-sub">すわる ばしょや、iPad の おきかたが かわった ときは「あわせなおす」を えらんでね。</p>' +
        '<div class="ss-btns"><button type="button" class="ss-btn ss-btn-go" data-a="same">まえと おなじ</button>' +
        '<button type="button" class="ss-btn" data-a="redo">あわせなおす</button>' +
        '<button type="button" class="ss-btn" data-a="no">やめる</button></div></div></div>');
      function close0() { if (w0.parentNode) w0.parentNode.removeChild(w0); }
      w0.querySelector('[data-a="same"]').addEventListener('click', function () { close0(); eye.setCalib(saved); if (opt.onDone) opt.onDone(saved); });
      w0.querySelector('[data-a="redo"]').addEventListener('click', function () { close0(); run(); });
      w0.querySelector('[data-a="no"]').addEventListener('click', function () { close0(); if (opt.onCancel) opt.onCancel(); });
      return;
    }
    run();

    function run() {
      var speak = opt.speak !== false;
      var w = el('<div class="ss-cal" role="dialog" aria-modal="true" aria-label="めの じゅんび">' +
        '<div class="ss-dot" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(61,58,53,.15)" stroke-width="7"/>' +
        '<circle class="ss-ring" cx="50" cy="50" r="46" fill="none" stroke="#e0a92a" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></div>' +
        '<p class="ss-say" aria-live="polite">ここを みてね</p>' +
        '<p class="ss-cal-msg" role="status"></p>' +
        '<button type="button" class="ss-btn ss-cal-cancel">やめる</button></div>');
      var dot = w.querySelector('.ss-dot');
      var ring = w.querySelector('.ss-ring');
      var sayEl = w.querySelector('.ss-say');
      var msg = w.querySelector('.ss-cal-msg');
      var stopped = false;
      var raf = 0;
      function close() { stopped = true; cancelAnimationFrame(raf); if (w.parentNode) w.parentNode.removeChild(w); }
      w.querySelector('.ss-cal-cancel').addEventListener('click', function () { close(); if (opt.onCancel) opt.onCancel(); });

      var POS = [['L', 12], ['C', 50], ['R', 88]];
      var got = {};
      var i = 0;
      function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
      function step() {
        if (stopped) return;
        if (i >= POS.length) { finish(); return; }
        var p = POS[i];
        dot.style.left = p[1] + '%';
        dot.classList.add('is-wait');
        ring.style.strokeDashoffset = '1';
        sayEl.textContent = 'ここを みてね';
        msg.textContent = '';
        say('ここを みてね', speak);
        // うごいた 丸を 目で おいかける 時間を とってから、2びょう はかる
        wait(1100).then(function () {
          if (stopped) return;
          dot.classList.remove('is-wait');
          var t0 = performance.now();
          (function fill() {
            if (stopped) return;
            var a = Math.min(1, (performance.now() - t0) / 2000);
            ring.style.strokeDashoffset = String(1 - a);
            if (a < 1) raf = requestAnimationFrame(fill);
          })();
          return eye.sample(2000);
        }).then(function (r) {
          if (stopped || !r) return;
          if (r.faceRatio < 0.5) {
            msg.textContent = eye.getStatus() === 'dark' ? 'へやを あかるくしてね' : 'かおが みえないよ';
            fail(eye.getStatus() === 'dark' ? 'へやが くらくて、かおが よく みえなかったよ。へやを あかるくしてね。' : 'かおが よく みえなかったよ。iPad の まえに すわって、かおが うつるように してね。');
            return;
          }
          got[p[0]] = r;
          i++;
          step();
        });
      }
      function finish() {
        var c = {
          eye: { L: got.L.eye, C: got.C.eye, R: got.R.eye },
          head: { L: got.L.head, C: got.C.head, R: got.R.head },
          date: new Date().toISOString().slice(0, 10)
        };
        var u = usable(c, eye.getSource());
        if (!u.eye && !u.head) {
          fail('ひだり・まんなか・みぎ の ちがいが よく わからなかったよ。' +
            (eye.getSource() === 'eye' ? '「かお」や「りょうほう」に すると、わかりやすく なることが あります（せってい）。' : 'まるを しっかり みてね。かおを すこし むけても いいよ。'));
          return;
        }
        saveCalib(c);
        eye.setCalib(c);
        sayEl.textContent = 'できたよ！';
        dot.style.display = 'none';
        say('できたよ', speak);
        wait(1200).then(function () { if (stopped) return; close(); if (opt.onDone) opt.onDone(c); });
      }
      function fail(text) {
        close();
        var w2 = el('<div class="ss-wrap ss-dim"><div class="ss-card" role="dialog" aria-modal="true" aria-labelledby="ss-t3">' +
          '<p class="ss-title" id="ss-t3">うまく いかなかったよ</p>' +
          '<p class="ss-text"></p>' +
          '<div class="ss-btns"><button type="button" class="ss-btn ss-btn-go" data-a="again">もういちど</button>' +
          '<button type="button" class="ss-btn" data-a="no">やめる</button></div></div></div>');
        w2.querySelector('.ss-text').textContent = text;
        function close2() { if (w2.parentNode) w2.parentNode.removeChild(w2); }
        w2.querySelector('[data-a="again"]').addEventListener('click', function () { close2(); run(); });
        w2.querySelector('[data-a="no"]').addEventListener('click', function () { close2(); if (opt.onCancel) opt.onCancel(); });
      }
      step();
    }
  }

  // ---------- しせんテスト ----------
  // opt: { speak, onClose() }
  var ARROW_L = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M25 8 12 20l13 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M15 8l13 12-13 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DOT_C = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="9" fill="currentColor"/></svg>';
  function openTest(eye, opt) {
    opt = opt || {};
    var w = el('<div class="ss-wrap"><div class="ss-card" role="dialog" aria-modal="true" aria-labelledby="ss-t4">' +
      '<p class="ss-title" id="ss-t4">しせんテスト</p>' +
      '<p class="ss-sub">ひだり・まんなか・みぎ を みてね。いま どれと はんだん しているかが ひかるよ。</p>' +
      '<div class="ss-dirs" aria-live="polite">' +
        '<div class="ss-dir" data-d="left">' + ARROW_L + 'ひだり</div>' +
        '<div class="ss-dir" data-d="center">' + DOT_C + 'まんなか</div>' +
        '<div class="ss-dir" data-d="right">' + ARROW_R + 'みぎ</div></div>' +
      '<div class="ss-meter" aria-hidden="true"><b style="left:25%"></b><b style="left:75%"></b><i style="left:50%"></i></div>' +
      '<p class="ss-state" role="status"></p>' +
      '<div class="ss-prev" hidden></div>' +
      '<div class="ss-btns">' +
        '<button type="button" class="ss-btn" data-a="prev" aria-pressed="false"></button>' +
        '<button type="button" class="ss-btn" data-a="cal">あわせなおす</button>' +
        '<button type="button" class="ss-btn ss-btn-go" data-a="close">おわり</button></div></div></div>');
    var dirs = Array.prototype.slice.call(w.querySelectorAll('.ss-dir'));
    var dotEl = w.querySelector('.ss-meter i');
    var state = w.querySelector('.ss-state');
    var prevBox = w.querySelector('.ss-prev');
    var prevBtn = w.querySelector('[data-a="prev"]');
    var raf = 0, last = '';
    function renderPrev() {
      var on = loadSettings().preview;
      prevBtn.textContent = on ? 'カメラの えいぞう：だす' : 'カメラの えいぞう：ださない';
      prevBtn.setAttribute('aria-pressed', String(on));
      prevBox.hidden = !on;
      eye.showPreview(on ? prevBox : null);
    }
    prevBtn.addEventListener('click', function () { saveSettings({ preview: !loadSettings().preview }); renderPrev(); });
    function loop() {
      raf = requestAnimationFrame(loop);
      var st = eye.getStatus(), d = eye.getDir();
      var text = st === 'loading' ? 'じゅんびしています…'
        : st === 'dark' ? 'へやを あかるくしてね'
        : st === 'noface' ? 'かおが みえないよ'
        : !eye.canJudge() ? '「あわせなおす」で あわせてね'
        : d === 'left' ? 'ひだり' : d === 'right' ? 'みぎ' : 'まんなか';
      var key = st + d + text;
      dotEl.style.left = (50 + clamp(eye.getScore(), -1.5, 1.5) / 1.5 * 50).toFixed(1) + '%';
      if (key === last) return;
      last = key;
      state.textContent = text;
      state.classList.toggle('is-warn', st === 'dark' || st === 'noface');
      dirs.forEach(function (x) { x.classList.toggle('is-on', st === 'ok' && x.getAttribute('data-d') === d); });
    }
    function close() {
      cancelAnimationFrame(raf);
      eye.showPreview(null);
      if (w.parentNode) w.parentNode.removeChild(w);
      if (opt.onClose) opt.onClose();
    }
    w.querySelector('[data-a="close"]').addEventListener('click', close);
    w.querySelector('[data-a="cal"]').addEventListener('click', function () {
      w.style.display = 'none';
      calibrate(eye, { speak: opt.speak, askSame: false, onDone: function () { w.style.display = ''; }, onCancel: function () { w.style.display = ''; } });
    });
    renderPrev();
    loop();
    return { close: close };
  }

  global.Shisen = {
    create: create,
    isSupported: isSupported,
    explain: explain,
    calibrate: calibrate,
    openTest: openTest,
    errorMessage: errorMessage,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadCalib: loadCalib,
    saveCalib: saveCalib,
    // テスト・ほかの 教材 用
    features: features,
    score: score,
    classify: classify,
    MP_VERSION: MP_VERSION
  };
})(window);
