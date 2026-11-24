// かざりつけ
// ・ばめんを えらぶ → 下の シールを タップして えらぶ → ばめんの すきな ところを タップして はる
// ・はった シールは ゆびで うごかせる。「おおきく」「ちいさく」「けす」は えらんで いる シールに きく
// ・「もどす」で 1つ前に もどせる（はる・うごかす・大きさ・けす）
// ・先生用の「せってい」（ながおし）で 音を けせる
// ・できた かざりつけは この iPad の中（ブラウザの 保存領域）の「さくひん」に 保存する。外部には 送らない
// ・「しゃしんに ほぞん」は、iPad の「共有」から 写真に 保存する（使えない ときは 画像を 長おしで 保存）
(function () {
  'use strict';

  var ART = window.KazariArt;
  var W = ART.W, H = ART.H;
  var STORE_KEY = 'kazari-v1';
  var MAX_WORKS = 100;
  var MAX_ITEMS = 60;          // 1つの ばめんに はれる シールの かず
  var S_MIN = 0.4, S_MAX = 2.6, S_STEP = 1.25;
  var PHOTO_W = 1600;          // しゃしんの 大きさ（よこ）
  var MAX_UNDO = 50;           // もどせる かいすう

  // ---------- ほぞん（この iPad の中だけ） ----------
  var rec = { works: [], sound: true };
  var canSave = true;
  function cleanItems(a) {
    if (!Array.isArray(a)) return [];
    return a.filter(function (it) {
      return it && ART.sticker(it.k) && isFinite(it.x) && isFinite(it.y) && isFinite(it.s);
    }).map(function (it) {
      return { k: it.k, x: clamp(+it.x, 0, W), y: clamp(+it.y, 0, H), s: clamp(+it.s, S_MIN, S_MAX) };
    });
  }
  (function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d && d.sound === false) rec.sound = false;
      if (d && Array.isArray(d.works)) {
        rec.works = d.works.filter(function (w) { return w && ART.scene(w.scene); }).map(function (w) {
          return { id: String(w.id), scene: w.scene, items: cleanItems(w.items), t: +w.t || Date.now() };
        });
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
  function sPlace() { play(function (t) { tone(t, 620, 0.08, 0.1, 'triangle'); tone(t + 0.05, 930, 0.06, 0.14, 'triangle'); }); }
  function sPick() { play(function (t) { tone(t, 880, 0.05, 0.1, 'sine'); }); }
  function sSize(up) { play(function (t) { tone(t, up ? 660 : 520, 0.05, 0.08, 'sine'); tone(t + 0.06, up ? 880 : 390, 0.05, 0.1, 'sine'); }); }
  function sDel() { play(function (t) { tone(t, 440, 0.05, 0.1, 'triangle'); tone(t + 0.07, 330, 0.05, 0.14, 'triangle'); }); }
  function sUndo() { play(function (t) { tone(t, 700, 0.05, 0.08, 'sine'); tone(t + 0.06, 520, 0.05, 0.12, 'sine'); }); }
  function sDone() { play(function (t) { [523, 659, 784, 1047].forEach(function (f, i) { bell(t + i * 0.17, f, 0.12); }); }); }

  // ---------- べんりな もの ----------
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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
  function r1(n) { return Math.round(n * 10) / 10; }
  function itemTf(it) {
    return 'translate(' + r1(it.x - 50 * it.s) + ' ' + r1(it.y - 50 * it.s) + ') scale(' + Math.round(it.s * 1000) / 1000 + ')';
  }
  function itemSvg(it, i) {
    var st = ART.sticker(it.k);
    return '<g' + (i != null ? ' class="it" data-i="' + i + '"' : '') + ' transform="' + itemTf(it) + '">' +
      (i != null ? '<rect x="4" y="4" width="92" height="92" fill="#ffffff" fill-opacity="0"/>' : '') + st.svg + '</g>';
  }
  // ばめん ぜんたいの SVG（さくひん・しゃしん で つかう）
  function sceneSvg(scene, items, attrs) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"' + (attrs || ' aria-hidden="true" focusable="false"') + '>' +
      scene.bg + items.map(function (it) { return itemSvg(it); }).join('') + '</svg>';
  }

  // ---------- しゃしんに ほぞん ----------
  // iPad の「共有」は ボタンを おした すぐ あとでないと ひらけないので、画像は さきに 作って おく
  var photo = null;   // { key, url, file, ready, wait }
  function prepPhoto(scene, items) {
    var key = scene.id + JSON.stringify(items);
    if (photo && photo.key === key) return photo;
    var p = { key: key, url: null, file: null, ready: false, failed: false, wait: [] };
    photo = p;
    var done = function () { p.ready = true; var w = p.wait; p.wait = []; w.forEach(function (f) { f(); }); };
    try {
      var h = Math.round(PHOTO_W * H / W);
      var img = new Image();
      img.onload = function () {
        try {
          var cv = document.createElement('canvas');
          cv.width = PHOTO_W;
          cv.height = h;
          var g = cv.getContext('2d');
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, PHOTO_W, h);
          g.drawImage(img, 0, 0, PHOTO_W, h);
          p.url = cv.toDataURL('image/png');
          var bin = atob(p.url.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          p.file = new File([arr], 'kazari-' + scene.id + '.png', { type: 'image/png' });
        } catch (e) { p.failed = true; }
        done();
      };
      img.onerror = function () { p.failed = true; done(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sceneSvg(scene, items, ' width="' + PHOTO_W + '" height="' + h + '"'));
    } catch (e) { p.failed = true; done(); }
    return p;
  }
  function savePhoto(scene, items) {
    var p = prepPhoto(scene, items);
    if (!p.ready) {
      toast('じゅんび ちゅう…');
      p.wait.push(function () { if (photo === p) showPhotoFallback(p, scene); });
      return;
    }
    if (p.failed || !p.url) { toast('がぞうを つくれなかったよ'); return; }
    // iPad：「共有」が ひらくので「画像を保存」を えらぶと 写真に 入る
    if (p.file && navigator.canShare && navigator.share) {
      var ok = false;
      try { ok = navigator.canShare({ files: [p.file] }); } catch (e) { ok = false; }
      if (ok) {
        navigator.share({ files: [p.file] }).catch(function (err) {
          if (!err || err.name !== 'AbortError') showPhotoFallback(p, scene);
        });
        return;
      }
    }
    showPhotoFallback(p, scene);
  }
  function showPhotoFallback(p, scene) {
    if (p.failed || !p.url) { toast('がぞうを つくれなかったよ'); return; }
    $('photoImg').src = p.url;
    $('photoDl').href = p.url;
    $('photoDl').setAttribute('download', 'kazari-' + scene.id + '.png');
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
  var backTo = 'start';
  var screens = { start: $('startEl'), deco: $('decoEl'), works: $('worksEl') };
  function show(m) {
    mode = m;
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== m; });
    $('backBtn').hidden = m === 'start';
    $('doneBtn').hidden = m !== 'deco';
    document.body.classList.toggle('is-deco', m === 'deco');
    $('gearHint').hidden = true;
    endDrag();
  }
  // かざっている とちゅうに 新しい 版へ きりかわっても、ページを よみなおさない
  window.kyozaiBusy = function () { return mode === 'deco' && !!D && D.dirty; };

  // ---------- はじめの がめん ----------
  (function renderScenes() {
    var box = $('scenes');
    ART.scenes.forEach(function (sc) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'scene-btn';
      b.style.borderColor = sc.color;
      b.innerHTML = sceneSvg(sc, []) + '<span class="scene-name">' + esc(sc.name) + '</span><span class="scene-what">' + esc(sc.what) + '</span>';
      b.addEventListener('click', function () { unlockAudio(); backTo = 'start'; openDeco(sc, null, null); });
      box.appendChild(b);
    });
  })();
  function renderWorksCount() {
    $('worksCount').textContent = rec.works.length ? '（' + rec.works.length + '）' : '';
  }
  function showStart() {
    show('start');
    $('title').textContent = 'かざりつけ';
    renderWorksCount();
    $('saveWarn').hidden = canSave;
  }

  // ---------- かざる ----------
  var D = null;          // { scene, items, workId, dirty, hist }
  var pick = null;       // えらんで いる シール（下の ならび）
  var sel = -1;          // えらんで いる はった シール
  var board = $('board');
  var itemsG = $('itemsG');
  var selG = $('selG');

  function openDeco(scene, items, workId) {
    D = { scene: scene, items: items ? cleanItems(items) : [], workId: workId || null, dirty: false, hist: [] };
    pick = null;
    sel = -1;
    show('deco');
    $('title').textContent = scene.name;
    $('bgG').innerHTML = scene.bg;
    renderTray();
    renderItems();
  }

  function renderTray() {
    var tray = $('tray');
    tray.innerHTML = '';
    D.scene.stickers.forEach(function (id) {
      var st = ART.sticker(id);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'stk';
      b.setAttribute('role', 'radio');
      b.dataset.k = id;
      b.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + st.svg + '</svg><span>' + esc(st.name) + '</span>';
      b.addEventListener('click', function () {
        unlockAudio();
        pick = pick === id ? null : id;
        if (pick) sPick();
        renderPick();
      });
      tray.appendChild(b);
    });
    renderPick();
  }
  function renderPick() {
    Array.prototype.forEach.call(document.querySelectorAll('.stk'), function (b) {
      b.setAttribute('aria-checked', String(b.dataset.k === pick));
    });
    renderHint();
  }
  function renderHint() {
    var h = $('hint');
    var t = '';
    if (!pick && !D.items.length) t = 'したの シールを えらんでね';
    else if (pick && !D.items.length) t = 'すきな ところを タップしてね';
    h.textContent = t;
    h.hidden = !t;
  }

  // ---------- もどす ----------
  function snap() { return D.items.map(function (it) { return { k: it.k, x: it.x, y: it.y, s: it.s }; }); }
  function pushHist(before) {
    D.hist.push(before);
    if (D.hist.length > MAX_UNDO) D.hist.shift();
    renderUndo();
  }
  function renderUndo() { $('undoBtn').disabled = !D || !D.hist.length; }
  $('undoBtn').addEventListener('click', function () {
    if (!D || !D.hist.length || drag) return;
    D.items = D.hist.pop();
    sel = -1;
    D.dirty = true;
    renderItems();
    sUndo();
  });

  function renderItems() {
    itemsG.innerHTML = D.items.map(function (it, i) { return itemSvg(it, i); }).join('');
    renderSel();
    renderHint();
    renderUndo();
  }
  function renderSel() {
    var it = sel >= 0 ? D.items[sel] : null;
    if (!it) {
      selG.innerHTML = '';
    } else {
      var half = 48 * it.s + 6;
      var r = 'x="' + r1(it.x - half) + '" y="' + r1(it.y - half) + '" width="' + r1(half * 2) + '" height="' + r1(half * 2) + '" rx="12"';
      selG.innerHTML = '<rect ' + r + ' fill="none" stroke="#ffffff" stroke-width="8"/>' +
        '<rect ' + r + ' fill="none" stroke="#e8862a" stroke-width="5" stroke-dasharray="14 9"/>';
    }
    var on = !!it;
    $('bigBtn').disabled = !on || it.s >= S_MAX - 0.001;
    $('smallBtn').disabled = !on || it.s <= S_MIN + 0.001;
    $('delBtn').disabled = !on;
  }
  function moveItem(i) {
    var g = itemsG.children[i];
    if (g) g.setAttribute('transform', itemTf(D.items[i]));
    if (i === sel) renderSel();
  }

  // ゆびの いちを ばめんの いちに なおす
  function toBoard(e) {
    var m = board.getScreenCTM();
    if (!m) return null;
    var pt = board.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    var p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  var drag = null;   // { id, i, dx, dy, moved, sx, sy }
  board.addEventListener('pointerdown', function (e) {
    if (!D || drag) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    unlockAudio();
    var p = toBoard(e);
    if (!p) return;
    var hit = e.target.closest ? e.target.closest('.it') : null;
    var i, pre = null;
    if (hit) {
      pre = snap();   // うごかしたら、この じょうたいに もどせる
      i = Number(hit.getAttribute('data-i'));
      // さわった シールを いちばん 上に
      if (i !== D.items.length - 1) {
        var it = D.items.splice(i, 1)[0];
        D.items.push(it);
        i = D.items.length - 1;
        sel = i;
        renderItems();
      } else {
        sel = i;
        renderSel();
      }
    } else if (pick) {
      if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return;
      if (D.items.length >= MAX_ITEMS) { toast('もう はれないよ（' + MAX_ITEMS + 'こ まで）'); return; }
      pushHist(snap());
      D.items.push({ k: pick, x: r1(p.x), y: r1(p.y), s: 1 });
      D.dirty = true;
      i = sel = D.items.length - 1;
      renderItems();
      sPlace();
    } else {
      if (sel >= 0) { sel = -1; renderSel(); }
      else toast('したの シールを えらんでね');
      return;
    }
    var cur = D.items[i];
    drag = { id: e.pointerId, i: i, dx: cur.x - p.x, dy: cur.y - p.y, sx: e.clientX, sy: e.clientY, moved: false, pre: pre };
    try { board.setPointerCapture(e.pointerId); } catch (err) {}
  });
  board.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 6) return;
    var p = toBoard(e);
    if (!p) return;
    var it = D.items[drag.i];
    if (!it) return;
    drag.moved = true;
    it.x = r1(clamp(p.x + drag.dx, 0, W));
    it.y = r1(clamp(p.y + drag.dy, 0, H));
    moveItem(drag.i);
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.moved && D) {
      D.dirty = true;
      if (drag.pre) pushHist(drag.pre);
    }
    drag = null;
  }
  board.addEventListener('pointerup', endDrag);
  board.addEventListener('pointercancel', endDrag);
  board.addEventListener('lostpointercapture', endDrag);
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function resize(up) {
    var it = sel >= 0 ? D.items[sel] : null;
    if (!it) return;
    var s = up ? it.s * S_STEP : it.s / S_STEP;
    s = Math.round(clamp(s, S_MIN, S_MAX) * 1000) / 1000;
    if (s === it.s) return;
    pushHist(snap());
    it.s = s;
    D.dirty = true;
    moveItem(sel);
    renderSel();
    sSize(up);
  }
  $('bigBtn').addEventListener('click', function () { resize(true); });
  $('smallBtn').addEventListener('click', function () { resize(false); });
  $('delBtn').addEventListener('click', function () {
    if (sel < 0 || !D.items[sel]) return;
    pushHist(snap());
    D.items.splice(sel, 1);
    sel = -1;
    D.dirty = true;
    renderItems();
    sDel();
  });

  // ---------- できた！ ----------
  $('doneBtn').addEventListener('click', function () {
    if (!D) return;
    if (!D.items.length) { toast('シールを はってから おしてね'); return; }
    unlockAudio();
    sel = -1;
    renderSel();
    var ok = saveWork();
    D.dirty = false;
    $('doneSub').textContent = ok ? '「さくひん」に ほぞん したよ。' : 'さくひんに ほぞん できなかったよ。しゃしんに ほぞん してね。';
    $('maru').innerHTML = hanamaruSvg();
    $('doneThumb').innerHTML = sceneSvg(D.scene, D.items);
    prepPhoto(D.scene, D.items);
    openOverlay($('doneEl'));
    sDone();
  });
  function saveWork() {
    if (!canSave) return false;
    var items = D.items.map(function (it) { return { k: it.k, x: it.x, y: it.y, s: it.s }; });
    var w = D.workId ? rec.works.filter(function (x) { return x.id === D.workId; })[0] : null;
    if (w) {
      w.items = items;
      w.t = Date.now();
      rec.works = [w].concat(rec.works.filter(function (x) { return x !== w; }));
    } else {
      w = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), scene: D.scene.id, items: items, t: Date.now() };
      rec.works.unshift(w);
      D.workId = w.id;
    }
    var removed = rec.works.slice(MAX_WORKS);
    rec.works = rec.works.slice(0, MAX_WORKS);
    if (save()) return true;
    // 入りきらない ときは 古い ものを もどして あきらめる
    rec.works = rec.works.filter(function (x) { return x !== w; }).concat(removed);
    return false;
  }
  $('donePhotoBtn').addEventListener('click', function () { if (D) savePhoto(D.scene, D.items); });
  $('doneMoreBtn').addEventListener('click', function () { closeOverlay($('doneEl')); });
  $('doneNextBtn').addEventListener('click', function () {
    closeOverlay($('doneEl'));
    D = null;
    showStart();
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

  // ---------- さくひん ----------
  var viewing = null;
  function showWorks() {
    show('works');
    $('title').textContent = 'さくひん';
    var list = $('worksList');
    list.innerHTML = '';
    $('worksEmpty').hidden = rec.works.length > 0;
    rec.works.forEach(function (w) {
      var sc = ART.scene(w.scene);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.innerHTML = sceneSvg(sc, w.items) + '<span>' + esc(sc.name) + '<br><small>' + dateText(w.t) + '</small></span>';
      b.addEventListener('click', function () { openView(w); });
      list.appendChild(b);
    });
  }
  function openView(w) {
    viewing = w;
    var sc = ART.scene(w.scene);
    $('viewTitle').textContent = sc.name;
    $('viewPic').innerHTML = sceneSvg(sc, w.items);
    prepPhoto(sc, w.items);
    openOverlay($('viewEl'));
  }
  $('viewCloseBtn').addEventListener('click', function () { closeOverlay($('viewEl')); viewing = null; });
  $('viewPhotoBtn').addEventListener('click', function () { if (viewing) savePhoto(ART.scene(viewing.scene), viewing.items); });
  $('viewEditBtn').addEventListener('click', function () {
    if (!viewing) return;
    var w = viewing;
    closeOverlay($('viewEl'));
    viewing = null;
    unlockAudio();
    backTo = 'works';
    openDeco(ART.scene(w.scene), w.items, w.id);
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
  function leaveDeco(go) {
    if (D && D.dirty && D.items.length) {
      ask({ title: 'やめる？', sub: '「できた！」を おしていない かざりは きえるよ。', yes: 'やめる', no: 'つづける', onYes: go });
    } else go();
  }
  $('backBtn').addEventListener('click', function () {
    if (mode === 'deco') {
      leaveDeco(function () { D = null; if (backTo === 'works') showWorks(); else showStart(); });
    } else showStart();
  });
  $('homeBtn').addEventListener('click', function (e) {
    if (mode === 'deco' && D && D.dirty && D.items.length) {
      e.preventDefault();
      leaveDeco(function () { D = null; location.href = $('homeBtn').href; });
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-sound]'), function (b) {
      b.setAttribute('aria-pressed', String((b.dataset.sound === '1') === rec.sound));
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-sound]'), function (b) {
    b.addEventListener('click', function () {
      rec.sound = b.dataset.sound === '1';
      save();
      renderSettings();
      if (rec.sound) { unlockAudio(); sPick(); }
    });
  });
  $('setClose').addEventListener('click', function () { closeOverlay($('setEl')); });

  showStart();
})();
