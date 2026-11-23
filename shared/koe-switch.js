// こえスイッチ（共通の部品）
// マイクの「声の大きさ」だけで スイッチを おす しくみ。どの教材からでも つかえます。
//
// ・言葉の聞き取り（音声認識）は しません。大きさだけを みます。
// ・マイクの音は 録音も 保存も せず、どこにも 送りません（ページの中で 大きさを 計算するだけ）。
// ・オフラインでも うごきます。
//
// つかいかた（くわしくは README の「こえスイッチ」）:
//   <script src="../shared/koe-switch.js"></script>
//   var conf = KoeSwitch.loadSettings();              // この iPad に ほぞんした しきい値・待ち時間
//   var sw = KoeSwitch.create({
//     threshold: conf.threshold,                      // 0〜1。これより 大きい声で 反応
//     cooldown: conf.cooldown,                        // 反応したあと、つぎに 反応するまでの ミリびょう
//     onTrigger: function () { ... },                 // 声で スイッチが おされた とき
//     onLevel: function (level, threshold) { ... }    // 毎こま（メーター用。level は 0〜1）
//   });
//   sw.start().then(...).catch(function (err) { alert(KoeSwitch.errorMessage(err)); });  // タップの中で よぶ
//   sw.stop();
(function (global) {
  'use strict';

  var AC = global.AudioContext || global.webkitAudioContext;
  var STORE_KEY = 'koe-switch-v1';     // しきい値などは 全教材で 共通（同じ子・同じ部屋で つかうため）

  var DEFAULTS = {
    threshold: 0.5,     // 0〜1（0 は ほぼ無音、1 は とても大きい声）
    cooldown: 1000,     // ミリびょう
    minDuration: 80,    // この ミリびょう 以上 つづいた声だけ 反応（ドアの音など みじかい物音を よける）
    needQuiet: true     // いちど 線より 下に さがってから でないと、つぎは 反応しない（声が のびても 1回だけ）
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  function isSupported() {
    return !!(AC && global.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // ---------- ほぞん（この iPad の中だけ） ----------
  function loadSettings() {
    var s = { threshold: DEFAULTS.threshold, cooldown: DEFAULTS.cooldown };
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d) {
        s.threshold = clamp(num(d.threshold, s.threshold), 0.05, 0.95);
        s.cooldown = clamp(num(d.cooldown, s.cooldown), 200, 5000);
      }
    } catch (e) {}
    return s;
  }
  function saveSettings(s) {
    var cur = loadSettings();
    if (s && s.threshold != null) cur.threshold = clamp(num(s.threshold, cur.threshold), 0.05, 0.95);
    if (s && s.cooldown != null) cur.cooldown = clamp(num(s.cooldown, cur.cooldown), 200, 5000);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cur)); return true; } catch (e) { return false; }
  }

  // ---------- こまったときの ことば ----------
  function errorMessage(err) {
    var name = err && err.name;
    if (name === 'NotSupportedError' || name === 'SecurityError' || !isSupported()) {
      return 'この ページでは マイクが つかえません。インターネットの アドレス（https://…）で ひらいてください。';
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'マイクを つかう きょかが ありません。iPad の「せってい」→「Safari」→「マイク」を「きょか」にしてから、もういちど ためしてください。';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'マイクが みつかりません。';
    }
    if (name === 'NotReadableError' || name === 'AbortError') {
      return 'マイクを ほかの アプリが つかっているようです。ほかの アプリを とじてから、もういちど ためしてください。';
    }
    return 'マイクを つかえませんでした。もういちど ためしてください。';
  }

  // ---------- スイッチ ----------
  function create(opt) {
    opt = opt || {};
    var threshold = clamp(num(opt.threshold, DEFAULTS.threshold), 0.05, 0.95);
    var cooldown = Math.max(0, num(opt.cooldown, DEFAULTS.cooldown));
    var minDuration = Math.max(0, num(opt.minDuration, DEFAULTS.minDuration));
    var needQuiet = opt.needQuiet !== undefined ? !!opt.needQuiet : DEFAULTS.needQuiet;

    var ctx = null, stream = null, src = null, an = null, buf = null, raf = 0;
    var running = false;
    var starting = null;
    var level = 0;          // いまの 大きさ（0〜1）
    var shown = 0;          // メーター用（さがるときは ゆっくり）
    var overSince = 0;
    var lastTrig = -1e9;
    var quiet = true;
    var ignoreUntil = 0;
    var lastTs = 0;

    var sw = {
      enabled: true,        // false の間は 大きさは はかるが、スイッチは おさない
      start: start,
      stop: stop,
      isRunning: function () { return running; },
      getLevel: function () { return shown; },
      getThreshold: function () { return threshold; },
      setThreshold: function (v) { threshold = clamp(num(v, threshold), 0.05, 0.95); },
      getCooldown: function () { return cooldown; },
      setCooldown: function (ms) { cooldown = Math.max(0, num(ms, cooldown)); },
      // 教材が 自分で 音を 出す ときなどに、しばらく 反応しないように する
      ignoreFor: function (ms) { ignoreUntil = Math.max(ignoreUntil, now() + ms); },
      // 待ち時間の のこり（0〜1）。表示用
      coolRatio: function () { return cooldown > 0 ? clamp(1 - (now() - lastTrig) / cooldown, 0, 1) : 0; }
    };

    function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }

    // タップ（ボタンを おした とき）の中で よんでください。iPad では そうしないと 音の しくみが うごきません
    function start() {
      if (running) return Promise.resolve();
      if (starting) return starting;
      if (!isSupported()) {
        var e = new Error('not supported');
        e.name = 'NotSupportedError';
        return Promise.reject(e);
      }
      try {
        ctx = new AC();
        if (ctx.resume) ctx.resume();
      } catch (err) {
        return Promise.reject(err);
      }
      starting = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,     // 教材の 効果音を ひろいにくく する
          noiseSuppression: false,
          autoGainControl: false      // 大きさを そのまま はかる
        },
        video: false
      }).then(function (s) {
        starting = null;
        if (!ctx) { s.getTracks().forEach(function (t) { t.stop(); }); return; }  // とちゅうで stop された
        stream = s;
        src = ctx.createMediaStreamSource(stream);
        an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0;
        buf = new Uint8Array(an.fftSize);
        src.connect(an);   // スピーカーには つながない（ならさない・録音しない）
        stream.getTracks().forEach(function (t) {
          t.addEventListener('ended', function () { stop(); if (opt.onStop) opt.onStop(); });
        });
        running = true;
        level = shown = 0;
        overSince = 0;
        quiet = true;
        lastTs = 0;
        if (ctx.resume) ctx.resume();
        raf = requestAnimationFrame(tick);
      }, function (err) {
        starting = null;
        closeCtx();
        throw err;
      });
      return starting;
    }

    function closeCtx() {
      if (ctx) { try { ctx.close(); } catch (e) {} }
      ctx = null;
    }

    function stop() {
      cancelAnimationFrame(raf);
      running = false;
      if (stream) stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      if (src) { try { src.disconnect(); } catch (e) {} }
      stream = src = an = buf = null;
      closeCtx();
      level = shown = 0;
      if (opt.onLevel) opt.onLevel(0, threshold);
    }

    function measure() {
      an.getByteTimeDomainData(buf);
      var sum = 0;
      for (var i = 0; i < buf.length; i++) {
        var v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      var rms = Math.sqrt(sum / buf.length);
      // -60dB を 0、-6dB を 1 に する
      var db = 20 * Math.log(rms + 1e-8) / Math.LN10;
      return clamp((db + 60) / 54, 0, 1);
    }

    function tick(ts) {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0;
      lastTs = ts;
      level = measure();
      shown = Math.max(level, shown - dt * 1.4);

      var t = now();
      var above = level >= threshold;
      if (level < threshold * 0.92) quiet = true;   // 線より すこし 下に さがったら、つぎの 声を うけつける
      if (t < ignoreUntil) {
        overSince = 0;
      } else if (above) {
        if (!overSince) overSince = t;
        if (sw.enabled &&
            t - overSince >= minDuration &&
            t - lastTrig >= cooldown &&
            (!needQuiet || quiet)) {
          lastTrig = t;
          quiet = false;
          if (opt.onTrigger) opt.onTrigger();
        }
      } else {
        overSince = 0;
      }
      if (opt.onLevel) opt.onLevel(shown, threshold);
    }

    return sw;
  }

  global.KoeSwitch = {
    create: create,
    isSupported: isSupported,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    errorMessage: errorMessage,
    DEFAULTS: DEFAULTS
  };
})(window);
