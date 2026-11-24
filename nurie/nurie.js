// ぬりえ
// ・テーマ → 絵を えらぶ → ゆびで ぬる／めで ぬる（カメラ。../shared/shisen.js）→ できた！
// ・できた 絵は この iPad の中（ブラウザの 保存領域）の「さくひん」に 保存する。外部には 送らない
// ・「しゃしんに ほぞん」は、iPad の「共有」から 写真に 保存する（使えない ときは 画像を 長おしで 保存）
(function () {
  'use strict';

  var ART = window.NurieArt;
  var INK = ART.INK;
  var STORE_KEY = 'nurie-v1';
  var MAX_WORKS = 120;
  var WAIT_MS = 1500;          // めで ぬる：ぬったあと、次の 場所が 光るまで
  var LIT = '#ffe86a';         // 光る いろ
  var LIT_LINE = '#e8862a';

  var COLORS = [
    { c: '#e8524a', name: 'あか' },
    { c: '#f6a5bd', name: 'ピンク' },
    { c: '#f39a3c', name: 'だいだい' },
    { c: '#f7d64a', name: 'きいろ' },
    { c: '#b5dc5e', name: 'きみどり' },
    { c: '#4fa35a', name: 'みどり' },
    { c: '#8fd0ef', name: 'みずいろ' },
    { c: '#4a7fd0', name: 'あお' },
    { c: '#9b72c9', name: 'むらさき' },
    { c: '#a8703e', name: 'ちゃいろ' },
    { c: '#f8d3b0', name: 'うすだいだい' },
    { c: '#a9a59c', name: 'はいいろ' },
    { c: '#4b4742', name: 'くろ' },
    { c: '#ffffff', name: 'しろ' }
  ];
  var LIGHT = { '#f7d64a': 1, '#b5dc5e': 1, '#8fd0ef': 1, '#f8d3b0': 1, '#ffffff': 1, '#f6a5bd': 1 };

  // ---------- ほぞん（この iPad の中だけ） ----------
  var rec = { works: [], how: 'finger', speed: 2.5, sound: true };
  var canSave = true;
  (function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d) {
        if (Array.isArray(d.works)) rec.works = d.works.filter(function (w) { return w && ART.get(w.pic) && Array.isArray(w.fills); });
        if (d.how === 'eye') rec.how = 'eye';
        if ([1.5, 2.5, 4, 6].indexOf(d.speed) >= 0) rec.speed = d.speed;
        if (d.sound === false) rec.sound = false;
      }
      localStorage.setItem(STORE_KEY + '-t', '1');
      localStorage.removeItem(STORE_KEY + '-t');
    } catch (e) { canSave = false; }
  })();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(rec)); return true; } catch (e) { return false; }
  }

  // ---------- 音（その場で 作る） ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  function unlockAudio() {
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      if (ctx.state !== 'running' && ctx.resume) ctx.resume();
      var src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) {}
  }
  function tone(t, freq, vol, len, type) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + len + 0.05);
  }
  function bell(t, freq, vol) {
    tone(t, freq, vol, 1.1);
    tone(t, freq * 2, vol * 0.15, 0.6);
  }
  function play(fn) {
    if (!rec.sound || !AC) return;
    try {
      if (!ctx) ctx = new AC();
      var go = function () { fn(ctx.currentTime + 0.02); };
      if (ctx.state !== 'running' && ctx.resume) ctx.resume().then(go, go);
      else go();
    } catch (e) {}
  }
  function sPaint() { play(function (t) { tone(t, 520, 0.08, 0.12, 'triangle'); tone(t + 0.06, 780, 0.06, 0.16, 'triangle'); }); }
  function sPick() { play(function (t) { tone(t, 880, 0.05, 0.1, 'sine'); }); }
  function sDone() { play(function (t) { [523, 659, 784, 1047].forEach(function (f, i) { bell(t + i * 0.17, f, 0.12); }); }); }
  function say(text) {
    if (!rec.sound || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- べんりな もの ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function emptyFills(pic) { return pic.regions.map(function () { return null; }); }
  function painted(fills) { return fills.some(function (c) { return !!c; }); }
  var toastTimer = 0;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function dateText(ms) {
    var d = new Date(ms);
    return (d.getMonth() + 1) + 'がつ ' + d.getDate() + 'にち';
  }

  // 絵を SVG に する（画面・さくひん の 小さな 絵 で つかう）
  function picSvg(pic, fills, live) {
    var s = '<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">';
    s += '<g class="rg">';
    pic.regions.forEach(function (d, i) {
      s += '<path d="' + d + '" fill="' + ((fills && fills[i]) || '#ffffff') + '" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"' +
        (live ? ' data-i="' + i + '"' : '') + '/>';
    });
    s += '</g><g class="dc">';
    pic.deco.forEach(function (x) {
      var w = x.w == null ? 4 : x.w;
      s += '<path d="' + x.d + '" fill="' + (x.f || 'none') + '"' +
        (w ? ' stroke="' + INK + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' : '') + '/>';
    });
    return s + '</g></svg>';
  }

  // 絵を 画像（PNG）に する（写真に 保存 する とき）
  function picPng(pic, fills, size) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, size, size);
    g.scale(size / 400, size / 400);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = INK;
    pic.regions.forEach(function (d, i) {
      var p = new Path2D(d);
      g.fillStyle = (fills && fills[i]) || '#ffffff';
      g.fill(p);
      g.lineWidth = 5;
      g.stroke(p);
    });
    pic.deco.forEach(function (x) {
      var p = new Path2D(x.d);
      if (x.f) { g.fillStyle = x.f; g.fill(p); }
      var w = x.w == null ? 4 : x.w;
      if (w) { g.lineWidth = w; g.stroke(p); }
    });
    return cv.toDataURL('image/png');
  }

  // ---------- しゃしんに ほぞん ----------
  function savePhoto(pic, fills) {
    var url;
    try { url = picPng(pic, fills, 1200); } catch (e) { toast('がぞうを つくれなかったよ'); return; }
    var file = null;
    try {
      var bin = atob(url.split(',')[1]);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      file = new File([arr], 'nurie-' + pic.id + '.png', { type: 'image/png' });
    } catch (e) { file = null; }
    // iPad：「共有」が ひらくので「画像を保存」を えらぶと 写真に 入る
    if (file && navigator.canShare && navigator.share) {
      var ok = false;
      try { ok = navigator.canShare({ files: [file] }); } catch (e) { ok = false; }
      if (ok) {
        navigator.share({ files: [file] }).catch(function (err) {
          if (!err || err.name !== 'AbortError') showPhotoFallback(url, pic);
        });
        return;
      }
    }
    showPhotoFallback(url, pic);
  }
  function showPhotoFallback(url, pic) {
    $('photoImg').src = url;
    $('photoDl').href = url;
    $('photoDl').setAttribute('download', 'nurie-' + pic.id + '.png');
    openOverlay($('photoEl'));
  }
  $('photoClose').addEventListener('click', function () { closeOverlay($('photoEl')); $('photoImg').removeAttribute('src'); });

  // ---------- ダイアログ ----------
  var overlays = [];
  function openOverlay(el) {
    el.hidden = false;
    if (overlays.indexOf(el) < 0) overlays.push(el);
    var b = el.querySelector('.btn-main, button');
    if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
  }
  function closeOverlay(el) {
    el.hidden = true;
    overlays = overlays.filter(function (x) { return x !== el; });
  }
  function anyOverlay() { return overlays.length > 0 || !!document.querySelector('.ss-wrap, .ss-cal'); }

  // かくにん：ask({ title, sub, yes, no, onYes })
  var askYesFn = null;
  function ask(o) {
    $('askTitle').textContent = o.title;
    $('askSub').textContent = o.sub || '';
    $('askSub').hidden = !o.sub;
    $('askYes').textContent = o.yes;
    $('askNo').textContent = o.no;
    askYesFn = o.onYes;
    openOverlay($('askEl'));
    try { $('askNo').focus({ preventScroll: true }); } catch (e) {}
  }
  $('askNo').addEventListener('click', function () { closeOverlay($('askEl')); askYesFn = null; });
  $('askYes').addEventListener('click', function () {
    closeOverlay($('askEl'));
    var f = askYesFn; askYesFn = null;
    if (f) f();
  });

  // ---------- がめんの きりかえ ----------
  var mode = 'start';
  var curTheme = null;
  var backTo = 'pick';
  var screens = { start: $('startEl'), pick: $('pickEl'), paint: $('paintEl'), works: $('worksEl') };
  function show(m) {
    mode = m;
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== m; });
    $('backBtn').hidden = m === 'start';
    $('tools').hidden = m !== 'paint';
    document.body.classList.toggle('is-painting', m === 'paint');
    $('gearHint').hidden = true;
    if (m !== 'paint') stopEye();
  }

  // ---------- はじめの がめん ----------
  function renderThemes() {
    var box = $('themes');
    box.innerHTML = '';
    ART.themes.forEach(function (t) {
      var samples = t.groups.length > 1 ? t.groups.map(function (g) { return g.items[0]; }) : t.groups[0].items.slice(0, 4);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice theme';
      b.innerHTML = '<span class="theme-pics">' + samples.map(function (p) { return picSvg(p, null); }).join('') + '</span>' +
        '<span>' + esc(t.name) + '</span>';
      b.addEventListener('click', function () { unlockAudio(); openPick(t); });
      box.appendChild(b);
    });
  }
  function renderHow() {
    Array.prototype.forEach.call(document.querySelectorAll('.how'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.how === rec.how));
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.how'), function (b) {
    b.addEventListener('click', function () { rec.how = b.dataset.how; save(); renderHow(); });
  });
  function renderWorksCount() {
    $('worksCount').textContent = rec.works.length ? rec.works.length + 'まい' : '';
  }
  function showStart() {
    show('start');
    $('title').textContent = 'ぬりえ';
    renderHow();
    renderWorksCount();
  }

  // ---------- えを えらぶ ----------
  function openPick(t) {
    curTheme = t || curTheme;
    show('pick');
    $('title').textContent = curTheme.name;
    var list = $('pickList');
    list.innerHTML = '';
    curTheme.groups.forEach(function (g) {
      if (g.name) {
        var h = document.createElement('h2');
        h.className = 'grp-h';
        h.textContent = g.name;
        list.appendChild(h);
      }
      var grid = document.createElement('div');
      grid.className = 'grid';
      g.items.forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'thumb';
        b.innerHTML = picSvg(p, null) + '<span>' + esc(p.name) + '</span>';
        b.addEventListener('click', function () { unlockAudio(); backTo = 'pick'; openPaint(p, null, null); });
        grid.appendChild(b);
      });
      list.appendChild(grid);
    });
    list.scrollTop = 0;
    screens.pick.scrollTop = 0;
  }

  // ---------- ぬる ----------
  var P = null;          // { pic, fills, hist, workId, dirty }
  var paths = [];
  var colorIdx = 0;
  var picSvgEl = $('picSvg');

  function openPaint(pic, fills, workId) {
    P = { pic: pic, fills: fills ? fills.slice() : emptyFills(pic), hist: [], workId: workId, dirty: false };
    show('paint');
    $('title').textContent = pic.name;
    var tmp = document.createElement('div');
    tmp.innerHTML = picSvg(pic, P.fills, true);
    picSvgEl.innerHTML = tmp.firstChild.innerHTML;
    picSvgEl.setAttribute('aria-label', pic.name + 'の ぬりえ');
    paths = Array.prototype.slice.call(picSvgEl.querySelectorAll('.rg path'));
    renderTools();
    renderColor();
    setEyeUi(false);
    if (rec.how === 'eye') startEye();
  }

  function applyFill(i) {
    var p = paths[i];
    if (!p) return;
    p.setAttribute('fill', P.fills[i] || '#ffffff');
  }
  function paint(i, color) {
    if (!P || i < 0 || i >= P.fills.length) return false;
    var c = color === '#ffffff' ? null : color;
    if (P.fills[i] === c) { sPaint(); return true; }
    P.hist.push({ i: i, prev: P.fills[i] });
    P.fills[i] = c;
    P.dirty = true;
    applyFill(i);
    sPaint();
    renderTools();
    return true;
  }
  function undo() {
    if (!P || !P.hist.length) return;
    var h = P.hist.pop();
    if (h.all) {
      P.fills = h.all.slice();
      P.fills.forEach(function (c, i) { applyFill(i); });
    } else {
      P.fills[h.i] = h.prev;
      applyFill(h.i);
    }
    P.dirty = true;
    renderTools();
  }
  function clearAll() {
    if (!P || !painted(P.fills)) return;
    P.hist.push({ all: P.fills.slice() });
    P.fills = emptyFills(P.pic);
    P.fills.forEach(function (c, i) { applyFill(i); });
    P.dirty = true;
    renderTools();
  }
  function renderTools() {
    $('undoBtn').disabled = !P || !P.hist.length;
    $('clearBtn').disabled = !P || !painted(P.fills);
  }

  picSvgEl.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('path[data-i]') : null;
    if (!t || !P) return;
    unlockAudio();
    var i = Number(t.getAttribute('data-i'));
    paint(i, COLORS[colorIdx].c);
    if (E.on && i === E.lit) afterEyePaint(i);
  });

  $('undoBtn').addEventListener('click', undo);
  $('clearBtn').addEventListener('click', function () {
    ask({ title: 'ぜんぶ けす？', sub: 'ぬった いろが ぜんぶ きえるよ。', yes: 'ぜんぶ けす', no: 'けさない', onYes: clearAll });
  });

  // パレット
  var palBtns = [];
  (function buildPalette() {
    var box = $('palette');
    COLORS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pal';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', c.name);
      b.style.background = c.c;
      b.style.setProperty('--chk', LIGHT[c.c] ? INK : '#ffffff');
      b.addEventListener('click', function () { unlockAudio(); colorIdx = i; renderColor(); sPick(); });
      box.appendChild(b);
      palBtns.push(b);
    });
  })();
  function renderColor() {
    palBtns.forEach(function (b, i) { b.setAttribute('aria-checked', String(i === colorIdx)); });
    var c = COLORS[colorIdx];
    $('curSwatch').style.background = c.c;
    $('curName').textContent = c.name;
    var tip = $('brushTip');
    if (tip) tip.setAttribute('fill', c.c);
  }

  // できた！
  $('doneBtn').addEventListener('click', function () {
    if (!P) return;
    unlockAudio();
    if (!painted(P.fills)) { toast('いろを ぬってから おしてね'); return; }
    var ok = saveWork();
    $('maru').innerHTML = hanamaruSvg();
    $('doneThumb').innerHTML = picSvg(P.pic, P.fills);
    $('doneSub').textContent = ok ? '「さくひん」に ほぞん したよ。'
      : (canSave ? 'さくひんが いっぱいで ほぞん できなかったよ。いらない さくひんを けしてね。' : 'この iPad では さくひんを ほぞん できません。');
    if (E.on) unlight();
    openOverlay($('doneEl'));
    sDone();
    say('できたね');
  });
  function saveWork() {
    if (!canSave) return false;
    var now = Date.now();
    var w = P.workId ? rec.works.filter(function (x) { return x.id === P.workId; })[0] : null;
    if (w) {
      w.fills = P.fills.slice();
      w.t = now;
      rec.works = [w].concat(rec.works.filter(function (x) { return x !== w; }));
    } else {
      if (rec.works.length >= MAX_WORKS) return false;
      w = { id: 'w' + now.toString(36) + Math.floor(Math.random() * 1000).toString(36), pic: P.pic.id, fills: P.fills.slice(), t: now };
      rec.works.unshift(w);
    }
    if (!save()) {
      rec.works = rec.works.filter(function (x) { return x !== w; });
      return false;
    }
    P.workId = w.id;
    P.dirty = false;
    return true;
  }
  $('donePhotoBtn').addEventListener('click', function () { if (P) savePhoto(P.pic, P.fills); });
  $('doneMoreBtn').addEventListener('click', function () {
    closeOverlay($('doneEl'));
    if (E.on) { E.phase = 'wait'; E.waitUntil = performance.now() + WAIT_MS; }
  });
  $('doneNextBtn').addEventListener('click', function () {
    closeOverlay($('doneEl'));
    if (curTheme) openPick(curTheme); else showStart();
  });

  // はなまる（ぐるぐる と はなびら）
  function hanamaruSvg() {
    var d = '', k = 9, R = 40, i;
    for (i = 0; i <= k; i++) {
      var a = i / k * Math.PI * 2 - Math.PI / 2;
      d += (i === 0 ? 'M' : 'A11 11 0 0 1 ') + (50 + Math.cos(a) * R).toFixed(1) + ' ' + (50 + Math.sin(a) * R).toFixed(1) + ' ';
    }
    var sp = '';
    for (i = 0; i <= 80; i++) {
      var t = i / 80;
      var ang = t * Math.PI * 2 * 2.4 - Math.PI / 2;
      var rr = 4 + t * 26;
      sp += (i === 0 ? 'M' : 'L') + (50 + Math.cos(ang) * rr).toFixed(1) + ' ' + (50 + Math.sin(ang) * rr).toFixed(1) + ' ';
    }
    return '<svg viewBox="-4 -4 108 108">' +
      '<path class="hm-line" pathLength="1" d="' + sp + '" fill="none" stroke="#e0524a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="hm-line" pathLength="1" d="' + d + '" fill="none" stroke="#e0524a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  // ---------- めで ぬる（../shared/shisen.js） ----------
  var eye = window.Shisen ? Shisen.create({}) : null;
  var E = { on: false, order: [], lit: -1, litT0: 0, phase: 'cycle', waitUntil: 0, held: null, heldT: 0, fired: false, last: 0, raf: 0, msg: '' };

  function setEyeUi(on) {
    $('sideL').hidden = !on;
    $('sideR').hidden = !on;
    var prev = !!(on && eye && Shisen.loadSettings().preview);
    $('camPrev').hidden = !prev;
    if (eye) eye.showPreview(prev ? $('camPrev') : null);
    if (!on) { $('camMsg').hidden = true; E.msg = ''; }
  }

  // カメラを つかう：なぜ つかうかを せつめい → きょか → めの じゅんび（calib が true なら かならず あわせる）
  function useCam(next, onCancel, calib) {
    if (!eye) { toast('この ブラウザでは めで ぬる は つかえません'); if (onCancel) onCancel(); return; }
    eye.setSource(Shisen.loadSettings().source);
    Shisen.explain({
      eye: eye,
      purpose: 'えを ぬる',
      onOk: function () {
        if (!calib && eye.canJudge() && E.calibrated) { next(); return; }
        Shisen.calibrate(eye, {
          speak: rec.sound,
          onDone: function () { E.calibrated = true; next(); },
          onCancel: function () { if (onCancel) onCancel(); }
        });
      },
      onCancel: function () { if (onCancel) onCancel(); }
    });
  }

  function startEye() {
    useCam(function () {
      if (mode !== 'paint') { stopEye(); return; }
      E.on = true;
      E.order = [];
      for (var i = 1; i < P.pic.regions.length; i++) E.order.push(i);
      E.order.push(0);   // うしろの 背景は さいごに
      E.lit = -1;
      E.lastPainted = null;
      E.phase = 'wait';
      E.waitUntil = performance.now() + 800;
      E.held = null; E.heldT = 0; E.fired = false;
      E.last = performance.now();
      setEyeUi(true);
      renderColor();
      cancelAnimationFrame(E.raf);
      E.raf = requestAnimationFrame(eyeTick);
    }, function () {
      // やめた ときは ゆびで ぬれる まま
      stopEye();
      if (mode === 'paint') toast('ゆびで ぬる ことも できるよ');
    }, false);
  }
  function stopEye() {
    cancelAnimationFrame(E.raf);
    if (E.on) unlight();
    E.on = false;
    setEyeUi(false);
    if (eye && eye.isRunning()) eye.stop();
  }

  // つぎに 光る 場所（まだ ぬっていない 場所を じゅんばんに。ぜんぶ ぬったら ぜんぶの 中から）
  function nextLit(from) {
    var o = E.order, start = o.indexOf(from), k;
    for (k = 1; k <= o.length; k++) {
      var i = o[(start + k + o.length) % o.length];
      if (!P.fills[i]) return i;
    }
    return o[(start + 1 + o.length) % o.length];
  }
  function unlight() {
    if (E.lit >= 0 && paths[E.lit]) {
      var p = paths[E.lit];
      p.setAttribute('stroke', INK);
      p.setAttribute('stroke-width', '5');
      applyFill(E.lit);
    }
    E.lit = -1;
  }
  function setLit(i, now) {
    unlight();
    E.lit = i;
    E.litT0 = now;
    var p = paths[i];
    if (p) { p.setAttribute('stroke', LIT_LINE); p.setAttribute('stroke-width', '10'); }
  }
  function afterEyePaint(i) {
    E.lastPainted = i;
    unlight();
    E.phase = 'wait';
    E.waitUntil = performance.now() + WAIT_MS;
  }
  function mix(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var r = Math.round(((x >> 16) & 255) * (1 - t) + ((y >> 16) & 255) * t);
    var g = Math.round(((x >> 8) & 255) * (1 - t) + ((y >> 8) & 255) * t);
    var bl = Math.round((x & 255) * (1 - t) + (y & 255) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function setRing(id, a) { $(id).style.strokeDashoffset = String(1 - Math.max(0, Math.min(1, a))); }

  function eyeAct(dir, now) {
    if (dir === 'right') {
      if (E.phase !== 'cycle' || E.lit < 0) return;
      var i = E.lit;
      paint(i, COLORS[colorIdx].c);
      afterEyePaint(i);
    } else {
      colorIdx = (colorIdx + 1) % COLORS.length;
      renderColor();
      sPick();
      say(COLORS[colorIdx].name);
      if (E.phase === 'cycle') E.litT0 = now;   // いろを かえた ぶん、いまの 場所を すこし 長く 光らせる
    }
  }

  function eyeTick(now) {
    E.raf = requestAnimationFrame(eyeTick);
    var dt = Math.min(0.1, (now - E.last) / 1000);
    E.last = now;
    if (!E.on || !P) return;
    var paused = anyOverlay();
    var st = eye.isRunning() ? eye.getStatus() : 'loading';
    var frozen = !paused && st !== 'ok';
    var msg = !frozen ? '' : st === 'dark' ? 'へやを あかるくしてね' : st === 'noface' ? 'かおが みえないよ' : 'じゅんびしています…';
    if (msg !== E.msg) { E.msg = msg; $('camMsg').textContent = msg; $('camMsg').hidden = !msg; }

    var dwell = Shisen.loadSettings().dwell;
    var d = paused || frozen ? null : eye.getDir();
    if (d === 'left' || d === 'right') {
      if (d !== E.held) { E.held = d; E.heldT = 0; E.fired = false; }
      if (!E.fired) {
        E.heldT += dt;
        if (E.heldT >= dwell) { E.fired = true; eyeAct(d, now); }
      }
    } else {
      E.held = null; E.heldT = 0; E.fired = false;
    }
    setRing('ringL', E.held === 'left' && !E.fired ? E.heldT / dwell : 0);
    setRing('ringR', E.held === 'right' && !E.fired ? E.heldT / dwell : 0);
    $('sideL').classList.toggle('is-look', E.held === 'left');
    $('sideR').classList.toggle('is-look', E.held === 'right');

    // 光る 場所を すすめる（とまっている・見ている 間は すすめない）
    if (paused || frozen || (E.held && !E.fired)) {
      E.litT0 += dt * 1000;
      E.waitUntil += dt * 1000;
    }
    if (E.phase === 'wait') {
      if (now >= E.waitUntil) {
        E.phase = 'cycle';
        setLit(nextLit(E.lastPainted != null ? E.lastPainted : E.order[E.order.length - 1]), now);
      }
    } else if (now - E.litT0 >= rec.speed * 1000) {
      setLit(nextLit(E.lit), now);
    }
    // 光って いる 場所を ゆっくり 点めつ
    if (E.lit >= 0 && paths[E.lit]) {
      var a = 0.5 + 0.5 * Math.sin((now - E.litT0) / 1000 * Math.PI * 2 / 0.9 - Math.PI / 2);
      paths[E.lit].setAttribute('fill', mix(P.fills[E.lit] || '#ffffff', LIT, 0.25 + 0.6 * a));
    }
  }

  // ---------- さくひん ----------
  var viewing = null;
  function showWorks() {
    show('works');
    $('title').textContent = 'さくひん';
    var list = $('worksList');
    list.innerHTML = '';
    $('worksEmpty').hidden = rec.works.length > 0;
    var grid = document.createElement('div');
    grid.className = 'grid';
    rec.works.forEach(function (w) {
      var pic = ART.get(w.pic);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.innerHTML = picSvg(pic, w.fills) + '<span>' + esc(pic.name) + '<br><small>' + dateText(w.t) + '</small></span>';
      b.addEventListener('click', function () { openView(w); });
      grid.appendChild(b);
    });
    list.appendChild(grid);
  }
  function openView(w) {
    viewing = w;
    var pic = ART.get(w.pic);
    $('viewTitle').textContent = pic.name;
    $('viewPic').innerHTML = picSvg(pic, w.fills);
    openOverlay($('viewEl'));
  }
  $('viewCloseBtn').addEventListener('click', function () { closeOverlay($('viewEl')); viewing = null; });
  $('viewPhotoBtn').addEventListener('click', function () { if (viewing) savePhoto(ART.get(viewing.pic), viewing.fills); });
  $('viewEditBtn').addEventListener('click', function () {
    if (!viewing) return;
    var w = viewing;
    closeOverlay($('viewEl'));
    viewing = null;
    unlockAudio();
    var pic = ART.get(w.pic);
    curTheme = ART.themes.filter(function (t) { return t.id === pic.theme; })[0] || curTheme;
    backTo = 'works';
    openPaint(pic, w.fills, w.id);
  });
  $('viewDelBtn').addEventListener('click', function () {
    if (!viewing) return;
    var w = viewing;
    ask({
      title: 'この さくひんを けす？', sub: 'けすと もとに もどせないよ。', yes: 'けす', no: 'けさない',
      onYes: function () {
        rec.works = rec.works.filter(function (x) { return x !== w; });
        save();
        closeOverlay($('viewEl'));
        viewing = null;
        showWorks();
      }
    });
  });
  $('worksBtn').addEventListener('click', function () { unlockAudio(); showWorks(); });

  // ---------- もどる・もくじ ----------
  function leavePaint(go) {
    if (P && P.dirty && painted(P.fills)) {
      ask({ title: 'やめる？', sub: '「できた！」を おしていない いろは きえるよ。', yes: 'やめる', no: 'つづける', onYes: go });
    } else go();
  }
  $('backBtn').addEventListener('click', function () {
    if (mode === 'paint') {
      leavePaint(function () { if (backTo === 'works') showWorks(); else openPick(curTheme); });
    } else showStart();
  });
  $('homeBtn').addEventListener('click', function (e) {
    if (mode === 'paint' && P && P.dirty && painted(P.fills)) {
      e.preventDefault();
      leavePaint(function () { stopEye(); P = null; location.href = $('homeBtn').href; });
    }
  });

  // ---------- せってい（ながおしで ひらく） ----------
  var gearBtn = $('gearBtn');
  var gearHint = $('gearHint');
  var HOLD_MS = 1000;
  var holdTimer = 0, hintTimer = 0, opened = false;
  function startHold() {
    clearTimeout(holdTimer);
    opened = false;
    gearHint.hidden = true;
    gearBtn.classList.add('is-pressing');
    holdTimer = setTimeout(function () {
      opened = true;
      gearBtn.classList.remove('is-pressing');
      openSettings();
    }, HOLD_MS);
  }
  function endHold() {
    if (!holdTimer) return;
    clearTimeout(holdTimer);
    holdTimer = 0;
    gearBtn.classList.remove('is-pressing');
    if (!opened) {
      gearHint.hidden = false;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { gearHint.hidden = true; }, 1800);
    }
  }
  gearBtn.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try { gearBtn.setPointerCapture(e.pointerId); } catch (err) {}
    startHold();
  });
  gearBtn.addEventListener('pointerup', endHold);
  gearBtn.addEventListener('pointercancel', endHold);
  gearBtn.addEventListener('lostpointercapture', endHold);
  gearBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  gearBtn.addEventListener('click', function (e) { e.preventDefault(); });
  gearBtn.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  gearBtn.addEventListener('keyup', function (e) { if (e.key === 'Enter' || e.key === ' ') endHold(); });

  function openSettings() { renderSettings(); openOverlay($('setEl')); }
  function renderSettings() {
    var c = window.Shisen ? Shisen.loadSettings() : { source: 'both', dwell: 0.5 };
    Array.prototype.forEach.call(document.querySelectorAll('[data-speed]'), function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === rec.speed)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dwell]'), function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.dwell) === c.dwell)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-cam-src]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.camSrc === c.source)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sound]'), function (b) { b.setAttribute('aria-pressed', String((b.dataset.sound === '1') === rec.sound)); });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-speed]'), function (b) {
    b.addEventListener('click', function () { rec.speed = Number(b.dataset.speed); save(); renderSettings(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-dwell]'), function (b) {
    b.addEventListener('click', function () { if (window.Shisen) Shisen.saveSettings({ dwell: Number(b.dataset.dwell) }); renderSettings(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-cam-src]'), function (b) {
    b.addEventListener('click', function () {
      if (!window.Shisen) return;
      Shisen.saveSettings({ source: b.dataset.camSrc });
      if (eye) eye.setSource(b.dataset.camSrc);
      renderSettings();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-sound]'), function (b) {
    b.addEventListener('click', function () { rec.sound = b.dataset.sound === '1'; save(); renderSettings(); });
  });
  $('setClose').addEventListener('click', function () { closeOverlay($('setEl')); });
  $('setTestBtn').addEventListener('click', function () {
    closeOverlay($('setEl'));
    unlockAudio();
    useCam(function () {
      Shisen.openTest(eye, { speak: rec.sound, onClose: function () { if (mode !== 'paint') stopEye(); } });
    }, function () { if (mode !== 'paint') stopEye(); }, !Shisen.loadCalib());
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlays.length) {
      var top = overlays[overlays.length - 1];
      if (top === $('askEl')) $('askNo').click();
      else if (top === $('setEl')) $('setClose').click();
      else if (top === $('viewEl')) $('viewCloseBtn').click();
      else if (top === $('photoEl')) $('photoClose').click();
    }
  });

  // ぬっている とちゅうで ページを 読みなおさない
  window.kyozaiBusy = function () { return mode === 'paint' && !!P && (P.dirty || E.on); };

  // ---------- はじめ ----------
  $('saveWarn').hidden = canSave;
  renderThemes();
  showStart();
})();
