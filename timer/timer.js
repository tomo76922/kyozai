(function () {
  'use strict';

  var R = 100;               // 円の半径（SVG の座標）
  var MINUTES = [1, 3, 5, 10];

  var root = document.getElementById('timer');
  var wedge = document.getElementById('wedge');
  var ticks = document.getElementById('ticks');
  var minEl = document.getElementById('min');
  var minUnitEl = document.getElementById('minUnit');
  var secEl = document.getElementById('sec');
  var doneEl = document.getElementById('done');
  var startBtn = document.getElementById('startBtn');
  var stopBtn = document.getElementById('stopBtn');
  var resetBtn = document.getElementById('resetBtn');
  var presets = Array.prototype.slice.call(document.querySelectorAll('.preset'));

  // 状態
  var totalMs = 5 * 60 * 1000;   // えらんだ時間
  var remainMs = totalMs;        // のこり（止めているとき）
  var endAt = 0;                 // 終わる時刻（動いているとき）
  var state = 'idle';            // idle / running / paused / done
  var raf = 0;
  var finishTimer = 0;

  // ---------- 目もり（5分ごとの位置＝12本） ----------
  (function drawTicks() {
    var ns = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2;
      var major = i % 3 === 0;
      var r1 = major ? 88 : 93;
      var line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', (Math.sin(a) * r1).toFixed(2));
      line.setAttribute('y1', (-Math.cos(a) * r1).toFixed(2));
      line.setAttribute('x2', (Math.sin(a) * 101).toFixed(2));
      line.setAttribute('y2', (-Math.cos(a) * 101).toFixed(2));
      if (major) line.setAttribute('class', 'major');
      ticks.appendChild(line);
    }
  })();

  // ---------- 表示 ----------
  // のこりの色の部分：12時の位置まで。時間がたつと時計の針と同じ向きに へっていく
  function wedgePath(f) {
    if (f >= 0.9999) {
      return 'M0 ' + (-R) + ' A' + R + ' ' + R + ' 0 1 1 0 ' + R +
             ' A' + R + ' ' + R + ' 0 1 1 0 ' + (-R) + ' Z';
    }
    if (f <= 0.0001) return '';
    var b = (1 - f) * Math.PI * 2;
    var x = (Math.sin(b) * R).toFixed(3);
    var y = (-Math.cos(b) * R).toFixed(3);
    var large = f > 0.5 ? 1 : 0;
    return 'M0 0 L' + x + ' ' + y + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 0 ' + (-R) + ' Z';
  }

  // 1・3・4・6・8・10 は「ぷん」、それ以外は「ふん」
  function minuteUnit(m) {
    return [1, 3, 4, 6, 8, 10].indexOf(m) >= 0 ? 'ぷん' : 'ふん';
  }

  var lastShown = -1;
  function render(ms) {
    if (ms < 0) ms = 0;
    wedge.setAttribute('d', wedgePath(ms / totalMs));
    var s = Math.ceil(ms / 1000);
    if (s !== lastShown) {
      lastShown = s;
      var m = Math.floor(s / 60);
      minEl.textContent = String(m);
      minUnitEl.textContent = minuteUnit(m);
      secEl.textContent = String(s % 60);
    }
  }

  function setState(next) {
    state = next;
    root.setAttribute('data-state', next);
    startBtn.disabled = next === 'running';
    stopBtn.disabled = next !== 'running';
    resetBtn.disabled = next === 'idle';
    doneEl.textContent = next === 'done' ? 'じかん です' : '';
  }

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  // ---------- 動かす ----------
  function loop() {
    if (state !== 'running') return;
    var left = endAt - now();
    if (left <= 0) { finish(); return; }
    render(left);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (state === 'running') return;
    unlockAudio();
    if (state === 'done' || remainMs <= 0) remainMs = totalMs;
    endAt = now() + remainMs;
    setState('running');
    keepAwake(true);
    clearTimeout(finishTimer);
    // 画面が描かれていないときでも終わりを見のがさないように
    finishTimer = setTimeout(function () {
      if (state === 'running' && endAt - now() <= 0) finish();
    }, remainMs + 50);
    loop();
  }

  function stop() {
    if (state !== 'running') return;
    cancelAnimationFrame(raf);
    clearTimeout(finishTimer);
    remainMs = Math.max(0, endAt - now());
    setState('paused');
    render(remainMs);
    keepAwake(false);
  }

  function reset() {
    cancelAnimationFrame(raf);
    clearTimeout(finishTimer);
    remainMs = totalMs;
    setState('idle');
    render(remainMs);
    keepAwake(false);
  }

  function finish() {
    cancelAnimationFrame(raf);
    clearTimeout(finishTimer);
    remainMs = 0;
    render(0);
    setState('done');
    chime();
    keepAwake(false);
  }

  function choose(min) {
    totalMs = min * 60 * 1000;
    presets.forEach(function (p) {
      p.setAttribute('aria-pressed', String(Number(p.getAttribute('data-min')) === min));
    });
    try { localStorage.setItem('timer-minutes', String(min)); } catch (e) {}
    reset();
  }

  // ---------- やさしいチャイム（Web Audio で その場で音を作る） ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;

  // iPad では、ボタンをおしたときに音の準備をしておかないと、あとで鳴らせない
  function unlockAudio() {
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      if (ctx.state !== 'running' && ctx.resume) ctx.resume();
      var buf = ctx.createBuffer(1, 1, 22050);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) {}
  }

  // かねのような音を1つ：すっと立ち上がり、ゆっくり消える
  function bell(t, freq, vol) {
    var partials = [[1, 1], [2, 0.18], [3, 0.05]];
    partials.forEach(function (p) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * p[1], t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / p[0] + 0.4);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 2.8);
    });
  }

  function chime() {
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      var play = function () {
        var t = ctx.currentTime + 0.05;
        var vol = 0.16;   // ひかえめな音量
        // 「ミー・ドー」を2回（2回目は少し小さく）
        bell(t, 659.25, vol);
        bell(t + 0.75, 523.25, vol);
        bell(t + 2.2, 659.25, vol * 0.7);
        bell(t + 2.95, 523.25, vol * 0.7);
      };
      if (ctx.state !== 'running' && ctx.resume) {
        ctx.resume().then(play, play);
      } else {
        play();
      }
    } catch (e) {}
  }

  // ---------- 動いている間は画面を暗くしない ----------
  var wakeLock = null;
  var wakePending = false;
  function keepAwake(on) {
    if (!('wakeLock' in navigator)) return;
    if (on) {
      if (wakeLock || wakePending) return;
      wakePending = true;
      navigator.wakeLock.request('screen').then(function (lock) {
        wakePending = false;
        if (state !== 'running') { lock.release().catch(function () {}); return; }
        wakeLock = lock;
        lock.addEventListener('release', function () {
          if (wakeLock === lock) wakeLock = null;
        });
      }).catch(function () { wakePending = false; });
    } else if (wakeLock) {
      var l = wakeLock;
      wakeLock = null;
      l.release().catch(function () {});
    }
  }

  // ほかのアプリから戻ってきたとき：表示を追いつかせ、画面の暗くならない設定をかけ直す
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || state !== 'running') return;
    if (endAt - now() <= 0) { finish(); return; }
    keepAwake(true);
    cancelAnimationFrame(raf);
    loop();
  });

  // タイマーが動いている間は、新しい版への自動の再読み込みをしない（pwa.js が見る）
  window.kyozaiBusy = function () { return state === 'running'; };

  // ---------- ボタン ----------
  presets.forEach(function (p) {
    p.addEventListener('click', function () { choose(Number(p.getAttribute('data-min'))); });
  });
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  resetBtn.addEventListener('click', reset);

  var saved = 5;
  try {
    var v = Number(localStorage.getItem('timer-minutes'));
    if (MINUTES.indexOf(v) >= 0) saved = v;
  } catch (e) {}
  choose(saved);
})();
