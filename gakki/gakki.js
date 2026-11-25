// がっき：ゆびや めで がっきを ならして、みんなで えんそうかいを する
// ・音は oto.js（Web Audio で その場で 作る。音の ファイルは つかわない）
// ・めで は ../shared/shisen.js（カメラの 映像は この iPad の 中だけで つかい、ほぞんも 送信も しない）
// ・せっていは この iPad の 中（localStorage）にだけ ほぞんする
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- がっき ----------
  var KEY_COLORS = ['#ef7f78', '#f4a45c', '#f1cf48', '#86c873', '#62bddb', '#7f9de6', '#ae8ade', '#ef7f78'];
  var INSTS = [
    { id: 'piano', name: 'ピアノ', keys: true, color: '#8fb4d6' },
    { id: 'mokkin', name: 'もっきん', keys: true, color: '#e0a24f' },
    { id: 'taiko', name: 'たいこ', color: '#e07a6a', sounds: ['ドン', 'カッ'] },
    { id: 'suzu', name: 'すず', color: '#e3c06a', sounds: ['シャン', 'シャラシャラ'] },
    { id: 'castanet', name: 'カスタネット', color: '#d98aa0', sounds: ['タン', 'タタン'] },
    { id: 'triangle', name: 'トライアングル', color: '#9fc0d8', sounds: ['チーン', 'チリリリ'] }
  ];
  // うすい 色（ピアノの けんばん）
  function pastel(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.round(c + (255 - c) * 0.45); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function inst(id) { for (var i = 0; i < INSTS.length; i++) if (INSTS[i].id === id) return INSTS[i]; return null; }
  // めで えんそう：がっきごとの 2つの 音（ひだり・みぎ）
  function pairOf(it) {
    if (it.keys) return [{ label: 'ド', sound: 0, color: KEY_COLORS[0] }, { label: 'ソ', sound: 4, color: KEY_COLORS[4] }];
    return [{ label: it.sounds[0], sound: 0 }, { label: it.sounds[1], sound: 1 }];
  }

  // めで じゆう：見つづけた ときに 順番に 鳴らす 音（i 番目）
  var BOUNCE = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];   // ド→上のド→ド… と 行ったり来たり
  var RATES = [0.84, 0.92, 1, 1.09, 1.19, 1.09, 1, 0.92];     // すず・トライアングルの 高さ（少しずつ 上がって 下がる）
  var LEVELS = [1, 2, 3, 4, 5, 4, 3, 2];
  function jiyuStep(it, i) {
    if (it.keys) {
      var deg = BOUNCE[i % BOUNCE.length];
      return { sound: deg, label: Oto.NOTE_NAMES[deg], color: KEY_COLORS[deg], key: deg };
    }
    if (it.id === 'suzu' || it.id === 'triangle') {
      var r = i % RATES.length;
      return { sound: 0, rate: RATES[r], label: it.sounds[0], level: LEVELS[r] };
    }
    if (it.id === 'taiko') {
      var t = i % 3;
      return { sound: t === 2 ? 1 : 0, label: t === 2 ? 'カッ' : 'ドン' };
    }
    // カスタネット：大きい 音と 小さい 音を 順番に
    return i % 2 === 0 ? { sound: 0, scale: 1, label: 'タン', size: 'big' } : { sound: 0, scale: 0.4, label: 'タン', size: 'small' };
  }

  var ART = {
    piano: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<rect x="6" y="24" width="88" height="56" rx="8" fill="#6b5442" stroke="#3d3a35" stroke-width="3"/>' +
      '<rect x="12" y="38" width="76" height="36" rx="2" fill="#fffdf7" stroke="#3d3a35" stroke-width="2.5"/>' +
      '<path d="M22.9 38v36M33.7 38v36M44.6 38v36M55.4 38v36M66.3 38v36M77.1 38v36" stroke="#3d3a35" stroke-width="2"/>' +
      '<g fill="#3d3a35"><rect x="19.4" y="38" width="7" height="21" rx="1"/><rect x="30.2" y="38" width="7" height="21" rx="1"/>' +
      '<rect x="51.9" y="38" width="7" height="21" rx="1"/><rect x="62.8" y="38" width="7" height="21" rx="1"/><rect x="73.6" y="38" width="7" height="21" rx="1"/></g>' +
      '<rect x="12" y="29" width="76" height="5" rx="2" fill="#8a6f58"/></svg>',
    mokkin: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="M8 40 92 46M8 66 92 60" stroke="#8a6f58" stroke-width="5" stroke-linecap="round"/>' +
      [0, 1, 2, 3, 4, 5].map(function (i) {
        var h = 50 - i * 5, x = 11 + i * 13.5, y = 53 - h / 2;
        return '<rect x="' + x + '" y="' + y + '" width="10.5" height="' + h + '" rx="2.5" fill="' + KEY_COLORS[i] + '" stroke="#3d3a35" stroke-width="2.5"/>';
      }).join('') +
      '<path d="M60 14 84 86" stroke="#c99b6a" stroke-width="3.5" stroke-linecap="round"/><circle cx="58" cy="10" r="6" fill="#e86a5e" stroke="#3d3a35" stroke-width="2.5"/>' +
      '</svg>',
    taiko: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="M18 36q-6 22 2 44h60q8-22 2-44z" fill="#c8553d" stroke="#3d3a35" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M20 80q30 10 60 0" fill="none" stroke="#3d3a35" stroke-width="3"/>' +
      '<ellipse cx="50" cy="36" rx="32" ry="10" fill="#f3e3c3" stroke="#3d3a35" stroke-width="3.5"/>' +
      '<g fill="#3d3a35"><circle cx="24" cy="44" r="2"/><circle cx="37" cy="47" r="2"/><circle cx="50" cy="48" r="2"/><circle cx="63" cy="47" r="2"/><circle cx="76" cy="44" r="2"/></g>' +
      '<path d="M30 8l20 24M70 8 52 30" stroke="#c99b6a" stroke-width="5" stroke-linecap="round"/>' +
      '</svg>',
    suzu: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<rect x="44" y="62" width="12" height="32" rx="5" fill="#c99b6a" stroke="#3d3a35" stroke-width="3"/>' +
      '<circle cx="50" cy="40" r="25" fill="none" stroke="#e07a6a" stroke-width="7"/>' +
      [0, 1, 2, 3, 4, 5, 6].map(function (i) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / 7;
        var x = (50 + Math.cos(a) * 25).toFixed(1), y = (40 + Math.sin(a) * 25).toFixed(1);
        return '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#f1cf48" stroke="#3d3a35" stroke-width="2.5"/>' +
          '<path d="M' + (x - 4) + ' ' + y + 'h8" stroke="#3d3a35" stroke-width="2" stroke-linecap="round"/>';
      }).join('') + '</svg>',
    castanet: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<ellipse cx="52" cy="63" rx="36" ry="17" fill="#3f7fc4" stroke="#3d3a35" stroke-width="3.5"/>' +
      '<ellipse cx="52" cy="41" rx="36" ry="17" fill="#e2463f" stroke="#3d3a35" stroke-width="3.5"/>' +
      '<ellipse cx="52" cy="38" rx="20" ry="7" fill="#f07a72"/>' +
      '<path d="M17 45q-10 7 0 14" fill="none" stroke="#3d3a35" stroke-width="4" stroke-linecap="round"/>' +
      '</svg>',
    triangle: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="M44 26 18 80h64L54 24" fill="none" stroke="#8d98a5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M49 22V8" stroke="#3d3a35" stroke-width="3" stroke-linecap="round"/><circle cx="49" cy="22" r="4" fill="none" stroke="#3d3a35" stroke-width="3"/>' +
      '<path d="M64 52 92 34" stroke="#8d98a5" stroke-width="4.5" stroke-linecap="round"/>' +
      '</svg>'
  };

  // ---------- ほぞん（この iPad の 中だけ） ----------
  var STORE_KEY = 'gakki-v1';
  var VOLS = [{ t: 'ちいさい', v: 0.22 }, { t: 'ふつう', v: 0.4 }, { t: 'おおきい', v: 0.7 }];
  var rec = { vol: 1, speed: 2, kyoku: false, song: 'kirakira', beats: 4, reps: 1, dwellPlay: 0.3, pickSpeed: 3, dwellPick: 0.5, insts: [],
              eyeMode: 'rhythm', stepSec: 1, resume: false,
              fingerMode: 'free', gSong: 'kirakira', level: 'yasashii', gameTempo: 100 };
  (function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!d) return;
      if (d.vol === 0 || d.vol === 1 || d.vol === 2) rec.vol = d.vol;
      if (isFinite(d.speed)) rec.speed = clamp(Math.round(d.speed * 2) / 2, 1.5, 8);
      rec.kyoku = !!d.kyoku;
      if (Oto.SONGS.some(function (s) { return s.id === d.song; })) rec.song = d.song;
      if (d.beats === 2 || d.beats === 4) rec.beats = d.beats;
      if ([0, 1, 2, 3].indexOf(d.reps) >= 0) rec.reps = d.reps;
      if (isFinite(d.dwellPlay)) rec.dwellPlay = clamp(Number(d.dwellPlay), 0.1, 1);
      if (isFinite(d.pickSpeed)) rec.pickSpeed = clamp(Number(d.pickSpeed), 1, 10);
      if (isFinite(d.dwellPick)) rec.dwellPick = clamp(Number(d.dwellPick), 0.2, 2);
      if (Array.isArray(d.insts)) rec.insts = d.insts.filter(inst).slice(0, 2);
      if (d.eyeMode === 'jiyu' || d.eyeMode === 'rhythm') rec.eyeMode = d.eyeMode;
      if ([0.5, 1, 2].indexOf(d.stepSec) >= 0) rec.stepSec = d.stepSec;
      rec.resume = !!d.resume;
      if (d.fingerMode === 'free' || d.fingerMode === 'game') rec.fingerMode = d.fingerMode;
      if (Oto.SONGS.some(function (x) { return x.id === d.gSong; })) rec.gSong = d.gSong;
      if (d.level === 'renshu' || d.level === 'yasashii' || d.level === 'futsuu') rec.level = d.level;
      if (isFinite(d.gameTempo)) rec.gameTempo = clamp(Math.round(d.gameTempo / 10) * 10, 50, 150);
    } catch (e) {}
  })();
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(rec)); } catch (e) {} }

  // ---------- 音量 ----------
  function renderVol() {
    var v = VOLS[rec.vol];
    $('volText').textContent = 'おと：' + v.t;
    $('volBtn').setAttribute('data-level', String(rec.vol));
    Oto.setVolume(v.v);
  }
  $('volBtn').addEventListener('click', function () {
    Oto.unlock();
    rec.vol = (rec.vol + 1) % VOLS.length;
    save();
    renderVol();
    Oto.play('triangle', 0, null, 0.6);   // どのくらいの 大きさか きいて わかるように
  });

  // iPad は、さいしょに さわった ときに 音の じゅんびを する
  document.addEventListener('pointerdown', function () { Oto.unlock(); }, true);

  // ---------- ダイアログ・おしらせ ----------
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

  var toastTimer = 0;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- がめんの きりかえ ----------
  var mode = 'start';
  var how = 'finger';
  var sel = rec.insts.slice();
  var screens = { start: $('startEl'), pick: $('pickEl'), prep: $('prepEl'), play: $('playEl') };
  var TITLES = { start: 'がっき', pick: 'がっきを えらぶ', prep: 'じゅんび', play: 'えんそう' };
  function show(m) {
    mode = m;
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== m; });
    $('title').textContent = TITLES[m];
    $('backBtn').hidden = m === 'start';
    document.body.setAttribute('data-mode', m);
  }

  // ---------- めで（カメラ） ----------
  var eye = window.Shisen ? Shisen.create({}) : null;
  var calibrated = false;
  // なぜ つかうかを せつめい → きょか → めの じゅんび
  function useCam(next, onCancel, forceCalib) {
    if (!eye) { toast('この ブラウザでは めで は つかえません'); if (onCancel) onCancel(); return; }
    eye.setSource(Shisen.loadSettings().source);
    Shisen.explain({
      eye: eye,
      purpose: 'がっきを ならす',
      onOk: function () {
        if (!forceCalib && calibrated && eye.canJudge()) { next(); return; }
        Shisen.calibrate(eye, {
          onDone: function () { calibrated = true; next(); },
          onCancel: function () { if (onCancel) onCancel(); }
        });
      },
      onCancel: function () { if (onCancel) onCancel(); }
    });
  }
  function stopCam() { if (eye && eye.isRunning()) eye.stop(); }
  function camMsg(el) {
    var st = eye && eye.isRunning() ? eye.getStatus() : 'loading';
    var msg = st === 'ok' ? '' : st === 'dark' ? 'へやを あかるくしてね' : st === 'noface' ? 'かおが みえないよ' : 'じゅんびしています…';
    if (el.textContent !== msg) el.textContent = msg;
    el.hidden = !msg;
    return st === 'ok';
  }
  function setPreview(box, on) {
    var p = !!(on && eye && Shisen.loadSettings().preview);
    box.hidden = !p;
    if (eye) eye.showPreview(p ? box : null);
  }
  function setRing(el, a) {
    a = clamp(a, 0, 1);
    el.style.strokeDashoffset = String(1 - a);
    el.style.opacity = a > 0.001 ? '1' : '0';   // 0 のときに 丸い はしが 点に 見えないように
  }

  // ---------- はじめ ----------
  each('.how', function (b) {
    b.addEventListener('click', function () {
      Oto.unlock();
      how = b.getAttribute('data-how');
      if (how === 'eye') {
        useCam(function () { openPick(); }, function () { stopCam(); toast('ゆびで えんそう する ことも できるよ'); });
      } else {
        stopCam();
        openPick();
      }
    });
  });

  // ---------- がっきを えらぶ ----------
  var tiles = [];
  (function buildTiles() {
    var box = $('insts');
    INSTS.forEach(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'inst';
      b.style.setProperty('--accent', it.color);
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="inst-art">' + ART[it.id] + '</span><span class="inst-name">' + it.name + '</span><b class="inst-badge" aria-hidden="true"></b>';
      b.addEventListener('click', function () { toggleInst(i); });
      box.appendChild(b);
      tiles.push(b);
    });
  })();
  function renderPick() {
    tiles.forEach(function (b, i) {
      var k = sel.indexOf(INSTS[i].id);
      b.classList.toggle('is-sel', k >= 0);
      b.setAttribute('aria-pressed', String(k >= 0));
      b.querySelector('.inst-badge').textContent = k >= 0 ? String(k + 1) : '';
    });
    $('pickOk').disabled = sel.length === 0;
    $('pickHint').textContent = sel.length === 0 ? 'がっきを 1つか 2つ えらんでね'
      : sel.length === 1 ? (how === 'eye' ? 'もう 1つ えらんでも いいよ。きめたら ひだりを みてね' : 'もう 1つ えらんでも いいよ')
      : (how === 'eye' ? 'きめたら ひだりを みてね' : '2つ えらんだよ');
  }
  function toggleInst(i) {
    var id = INSTS[i].id, k = sel.indexOf(id);
    if (k >= 0) sel.splice(k, 1);
    else if (sel.length >= 2) { toast('2つ まで だよ。やめる がっきを もういちど えらんでね'); return; }
    else { sel.push(id); Oto.play(id, 0); }
    rec.insts = sel.slice();
    save();
    renderPick();
  }
  $('pickOk').addEventListener('click', function () { if (sel.length) openPrep(); });

  var P = { on: false, lit: -1, litT0: 0, held: null, heldT: 0, fired: false, last: 0, raf: 0 };
  function openPick() {
    // めで：カメラが とまっていたら、もういちど つかう
    if (how === 'eye' && !(eye && eye.isRunning())) {
      useCam(openPickNow, function () { stopCam(); show('start'); });
      return;
    }
    openPickNow();
  }
  function openPickNow() {
    show('pick');
    renderPick();
    var on = how === 'eye';
    $('pickSideL').hidden = !on;
    $('pickSideR').hidden = !on;
    $('pickEl').classList.toggle('is-eye', on);
    setPreview($('pickPrev'), on);
    stopPickEye();
    if (on) {
      P.on = true;
      P.lit = -1;
      P.litT0 = performance.now() - rec.pickSpeed * 1000 + 600;   // すこし まってから ひかりはじめる
      P.held = null; P.heldT = 0; P.fired = false;
      P.last = performance.now();
      P.raf = requestAnimationFrame(pickTick);
    } else {
      $('pickCamMsg').hidden = true;
    }
  }
  function stopPickEye() {
    cancelAnimationFrame(P.raf);
    P.on = false;
    tiles.forEach(function (b) { b.classList.remove('is-lit'); });
    setRing($('pickRingL'), 0);
    setRing($('pickRingR'), 0);
  }
  function setPickLit(i, now) {
    tiles.forEach(function (b, k) { b.classList.toggle('is-lit', k === i); });
    P.lit = i;
    P.litT0 = now;
    if (i >= 0) Oto.play(INSTS[i].id, 0, null, 0.45);   // どの がっきか 音でも わかるように
  }
  function pickTick(now) {
    P.raf = requestAnimationFrame(pickTick);
    var dt = Math.min(0.1, (now - P.last) / 1000);
    P.last = now;
    if (!P.on || mode !== 'pick') return;
    var paused = anyOverlay();
    var ok = camMsg($('pickCamMsg'));
    var d = paused || !ok ? null : eye.getDir();
    if (d === 'left' || d === 'right') {
      if (d !== P.held) { P.held = d; P.heldT = 0; P.fired = false; }
      if (!P.fired) {
        P.heldT += dt;
        if (P.heldT >= rec.dwellPick) { P.fired = true; pickAct(d, now); }
      }
    } else {
      P.held = null; P.heldT = 0; P.fired = false;
    }
    setRing($('pickRingL'), P.held === 'left' && !P.fired ? P.heldT / rec.dwellPick : 0);
    setRing($('pickRingR'), P.held === 'right' && !P.fired ? P.heldT / rec.dwellPick : 0);
    $('pickSideL').classList.toggle('is-look', P.held === 'left');
    $('pickSideR').classList.toggle('is-look', P.held === 'right');
    // 見ている 間・とまっている 間は、つぎへ すすめない
    if (paused || !ok || (P.held && !P.fired)) P.litT0 += dt * 1000;
    if (now - P.litT0 >= rec.pickSpeed * 1000) setPickLit((P.lit + 1) % INSTS.length, now);
  }
  function pickAct(d, now) {
    if (d === 'left') {
      if (sel.length) { openPrep(); return; }
      toast('さきに みぎを みて、がっきを えらんでね');
      return;
    }
    if (P.lit < 0) return;
    toggleInst(P.lit);
    P.litT0 = now;   // えらんだ がっきは もう すこし ひからせておく
  }

  // ---------- じゅんび（せんせいが えらぶ） ----------
  var MIN_BPM = 45, MAX_BPM = 132;
  function bpmOf(beats) { return 60 * beats / rec.speed; }
  function beatsOk(beats) { var b = bpmOf(beats); return b >= MIN_BPM - 0.01 && b <= MAX_BPM + 0.01; }
  function kyokuOk() { return beatsOk(2) || beatsOk(4); }
  function fmtSec(s) { return String(s).replace(/\.0$/, ''); }
  function songOf(id) { for (var i = 0; i < Oto.SONGS.length; i++) if (Oto.SONGS[i].id === id) return Oto.SONGS[i]; return Oto.SONGS[0]; }

  (function buildGameSongs() {
    var box = $('gSongOpts');
    Oto.SONGS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn opt-btn';
      b.setAttribute('data-gsong', s.id);
      b.textContent = s.name;
      b.addEventListener('click', function () { rec.gSong = s.id; save(); renderPrep(); });
      box.appendChild(b);
    });
  })();
  function isGame() { return how === 'finger' && rec.fingerMode === 'game'; }

  (function buildSongs() {
    var box = $('songOpts');
    Oto.SONGS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn opt-btn';
      b.setAttribute('data-song', s.id);
      b.textContent = s.name;
      b.addEventListener('click', function () { rec.song = s.id; save(); renderPrep(); });
      box.appendChild(b);
    });
  })();

  function openPrep() {
    stopPickEye();
    if (eye) eye.showPreview(null);
    show('prep');
    renderPrep();
  }
  function renderPrep() {
    $('prepInsts').innerHTML = sel.map(function (id) {
      var it = inst(id);
      return '<span class="prep-inst" style="--accent:' + it.color + '">' + ART[id] + it.name + '</span>';
    }).join('<span class="prep-and">と</span>') + '<span class="prep-how">（' + (how === 'eye' ? 'めで' : 'ゆびで') + '）</span>';

    if (rec.kyoku && !kyokuOk()) rec.kyoku = false;
    if (rec.kyoku && !beatsOk(rec.beats)) rec.beats = beatsOk(4) ? 4 : 2;

    var std = [2, 3, 4].indexOf(rec.speed) >= 0;
    var rhythm = how === 'eye' && rec.eyeMode === 'rhythm';
    $('eyeModeSec').hidden = how !== 'eye';
    each('[data-eye-mode]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-eye-mode') === rec.eyeMode)); });
    $('stepSec').hidden = !(how === 'eye' && rec.eyeMode === 'jiyu');
    each('[data-step]', function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-step')) === rec.stepSec)); });
    var game = isGame();
    $('fingerModeSec').hidden = how !== 'finger';
    each('[data-finger-mode]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-finger-mode') === rec.fingerMode)); });
    $('gameBox').hidden = !game;
    $('gameInstNote').hidden = !(game && sel.length > 1);
    if (sel.length) $('gameInstNote').textContent = 'おとゲームは さいしょに えらんだ「' + inst(sel[0]).name + '」で あそぶよ';
    each('[data-gsong]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-gsong') === rec.gSong)); });
    each('[data-level]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-level') === rec.level)); });
    $('kyokuSec').hidden = game;
    $('speedSec').hidden = game || !(rhythm || rec.kyoku);
    $('speedNote').textContent = rhythm ? '' : '（めで「リズム」で えんそう する 子の iPad と おなじに してね）';
    each('[data-speed]', function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-speed')) === rec.speed)); });
    var cu = $('speedCustom');
    cu.hidden = std;
    cu.innerHTML = 'せってい<small>' + fmtSec(rec.speed) + 'びょうに 1かい</small>';

    each('[data-kyoku]', function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-kyoku') === '1') === rec.kyoku)); });
    $('kyokuBox').hidden = game || !rec.kyoku;
    var kn = '';
    if (!kyokuOk()) kn = 'いまの はやさ（' + fmtSec(rec.speed) + 'びょうに 1かい）では、きょくを ながせません。2〜5びょうに してね。';
    else if (rec.kyoku) kn = 'きょくは せんせいの iPad 1だいだけで ながしてね。こどもの iPad は「きょく なし」で、おなじ はやさに してね。';
    $('kyokuNote').textContent = kn;
    $('kyokuNote').hidden = !kn;
    $('kyokuBtnOn').disabled = !kyokuOk();

    each('[data-song]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-song') === rec.song)); });
    each('[data-beats]', function (b) {
      var n = Number(b.getAttribute('data-beats'));
      b.disabled = !beatsOk(n);
      b.setAttribute('aria-pressed', String(n === rec.beats));
    });
    each('[data-reps]', function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-reps')) === rec.reps)); });
    var bpm = Math.round(bpmOf(rec.beats));
    $('tempoNote').textContent = 'きょくの はやさ：1ぷんに ' + bpm + 'はく（' + (bpm < 66 ? 'ゆっくり' : bpm <= 96 ? 'ふつう' : 'はやめ') + '）。' +
      fmtSec(rec.speed) + 'びょうに 1かい、' + rec.beats + 'はくめごとに ひかります';
  }
  each('[data-speed]', function (b) {
    b.addEventListener('click', function () { rec.speed = Number(b.getAttribute('data-speed')); save(); renderPrep(); });
  });
  $('speedCustom').addEventListener('click', function () { openSettings(); });
  each('[data-kyoku]', function (b) {
    b.addEventListener('click', function () { rec.kyoku = b.getAttribute('data-kyoku') === '1'; save(); renderPrep(); });
  });
  each('[data-beats]', function (b) {
    b.addEventListener('click', function () { rec.beats = Number(b.getAttribute('data-beats')); save(); renderPrep(); });
  });
  each('[data-finger-mode]', function (b) {
    b.addEventListener('click', function () { rec.fingerMode = b.getAttribute('data-finger-mode'); save(); renderPrep(); });
  });
  each('[data-level]', function (b) {
    b.addEventListener('click', function () { rec.level = b.getAttribute('data-level'); save(); renderPrep(); });
  });
  each('[data-eye-mode]', function (b) {
    b.addEventListener('click', function () { rec.eyeMode = b.getAttribute('data-eye-mode'); save(); renderPrep(); });
  });
  each('[data-step]', function (b) {
    b.addEventListener('click', function () { rec.stepSec = Number(b.getAttribute('data-step')); save(); renderPrep(); });
  });
  each('[data-reps]', function (b) {
    b.addEventListener('click', function () { rec.reps = Number(b.getAttribute('data-reps')); save(); renderPrep(); });
  });
  $('prepGo').addEventListener('click', function () {
    Oto.unlock();
    if (how === 'eye' && !(eye && eye.isRunning())) {
      useCam(openPlay, function () { stopCam(); });
      return;
    }
    openPlay();
  });

  // ---------- えんそう ----------
  // state：free（ゆびで・きょく なし）/ ready / count / run / end
  var G = { state: 'free', timed: false, jiyu: false, j: { held: null, heldT: 0, fired: false, stepT: 0, pos: { left: -1, right: -1 } }, cStart: 0, t0: 0, ms: 2000, total: Infinity, lastCount: 0, k: -1, lit: null,
            held: null, heldT: 0, fired: false, song: null, raf: 0, last: 0, halves: null, sides: null };

  function hitFx(el, color) {
    el.classList.remove('is-hit');
    void el.offsetWidth;
    el.classList.add('is-hit');
    var n = document.createElement('span');
    n.className = 'fx-note';
    n.textContent = Math.random() < 0.5 ? '♪' : '♫';
    n.style.left = (30 + Math.random() * 40) + '%';
    if (color) n.style.color = color;
    el.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 1100);
  }
  function bindHit(el, id, sound, color) {
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      Oto.unlock();
      Oto.play(id, sound);
      hitFx(el, color);
    });
    el.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); Oto.play(id, sound); hitFx(el, color); }
    });
  }

  function buildFinger(stage) {
    sel.forEach(function (id) {
      var it = inst(id);
      var p = document.createElement('section');
      p.className = 'panel panel-' + id;
      p.style.setProperty('--accent', it.color);
      p.innerHTML = '<h2 class="panel-name">' + it.name + '</h2>';
      if (it.keys) {
        var keys = document.createElement('div');
        keys.className = 'keys keys-' + id;
        Oto.NOTE_NAMES.forEach(function (nm, i) {
          var k = document.createElement('button');
          k.type = 'button';
          k.className = 'key';
          k.style.setProperty('--c', KEY_COLORS[i]);
          k.style.setProperty('--cp', pastel(KEY_COLORS[i]));
          k.style.setProperty('--i', String(i));
          k.setAttribute('aria-label', it.name + ' ' + nm);
          k.innerHTML = '<span class="key-name">' + nm + '</span>';
          bindHit(k, id, i, KEY_COLORS[i]);
          keys.appendChild(k);
        });
        p.appendChild(keys);
      } else {
        var main = document.createElement('button');
        main.type = 'button';
        main.className = 'hit-main';
        main.innerHTML = '<span class="hit-art">' + ART[id] + '</span><span class="hit-say">' + it.sounds[0] + '</span>';
        main.setAttribute('aria-label', it.name + ' ' + it.sounds[0]);
        bindHit(main, id, 0);
        var sub = document.createElement('button');
        sub.type = 'button';
        sub.className = 'hit-sub';
        sub.textContent = it.sounds[1];
        sub.setAttribute('aria-label', it.name + ' ' + it.sounds[1]);
        bindHit(sub, id, 1);
        p.appendChild(main);
        p.appendChild(sub);
      }
      stage.appendChild(p);
    });
  }

  // めで じゆう：左は 1つめ、右は 2つめの がっき（1つの ときは 左右とも おなじ がっき）
  function buildJiyu(stage) {
    var a = inst(sel[0]), b = sel[1] ? inst(sel[1]) : a;
    G.sides = { left: { it: a }, right: { it: b } };
    G.halves = {};
    [['left', a, 'ひだり'], ['right', b, 'みぎ']].forEach(function (x) {
      var side = x[0], it = x[1];
      var h = document.createElement('button');
      h.type = 'button';
      h.className = 'half half-' + side;
      h.style.setProperty('--accent', it.color);
      h.setAttribute('aria-label', x[2] + '：' + it.name);
      var extra = '';
      if (it.keys) {
        extra = '<span class="half-keys" aria-hidden="true">' + KEY_COLORS.map(function (c, i) {
          return '<i style="--c:' + c + '" data-k="' + i + '"></i>';
        }).join('') + '</span>';
      } else if (it.id === 'suzu' || it.id === 'triangle') {
        extra = '<span class="half-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
      }
      h.innerHTML = '<span class="half-tag">' + x[2] + '</span>' +
        '<span class="half-ring">' +
          '<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" class="ring-bg"/><circle cx="50" cy="50" r="46" class="ring-fg" pathLength="1"/></svg>' +
          '<span class="half-art">' + ART[it.id] + '</span></span>' +
        '<span class="half-name">' + it.name + '</span>' +
        '<span class="half-say" aria-live="polite"></span>' + extra;
      // 先生が 指で タップしたときも、つぎの 音を 鳴らす
      h.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        Oto.unlock();
        jiyuSound(side, G.j.pos[side] + 1);
      });
      stage.appendChild(h);
      G.halves[side] = h;
    });
    jiyuReset();
  }
  function jiyuShow(side, st) {
    var h = G.halves[side];
    var say = h.querySelector('.half-say');
    say.textContent = st.label;
    say.classList.toggle('is-small', st.size === 'small');
    say.classList.toggle('is-big', st.size === 'big');
    if (st.color) h.style.setProperty('--say', st.color); else h.style.removeProperty('--say');
    Array.prototype.forEach.call(h.querySelectorAll('.half-keys i'), function (k) { k.classList.toggle('is-on', st.key != null && Number(k.getAttribute('data-k')) === st.key); });
    Array.prototype.forEach.call(h.querySelectorAll('.half-meter i'), function (m, i) { m.classList.toggle('is-on', st.level != null && i < st.level); });
  }
  function jiyuReset() {
    G.j = { held: null, heldT: 0, fired: false, stepT: 0, pos: { left: -1, right: -1 } };
    if (!G.halves || !G.jiyu) return;
    ['left', 'right'].forEach(function (side) {
      var st = jiyuStep(G.sides[side].it, 0);
      jiyuShow(side, st);
      Array.prototype.forEach.call(G.halves[side].querySelectorAll('.half-keys i, .half-meter i'), function (k) { k.classList.remove('is-on'); });
    });
  }
  // i 番目の 音を 鳴らして、画面に 大きく 出す
  function jiyuSound(side, i) {
    if (i < 0) i = 0;
    G.j.pos[side] = i;
    var it = G.sides[side].it, st = jiyuStep(it, i);
    Oto.play(it.id, st.sound, null, st.scale, st.rate);
    jiyuShow(side, st);
    hitFx(G.halves[side], st.color);
  }
  function jiyuEnd(side) {
    var h = G.halves[side];
    h.classList.remove('is-lit');
    setRing(h.querySelector('.ring-fg'), 0);
  }
  // 左か 右を 見た 瞬間（見つめ時間の あと）に 1つめの 音。見つづけると 一定の 間かくで つぎの 音へ
  function jiyuTick(d, dt) {
    var J = G.j;
    if (d === 'left' || d === 'right') {
      if (d !== J.held) {
        if (J.held) jiyuEnd(J.held);
        J.held = d; J.heldT = 0; J.fired = false; J.stepT = 0;
      }
      var h = G.halves[d], ring = h.querySelector('.ring-fg');
      if (!J.fired) {
        J.heldT += dt;
        setRing(ring, J.heldT / rec.dwellPlay);
        if (J.heldT >= rec.dwellPlay) {
          J.fired = true;
          J.stepT = 0;
          h.classList.add('is-lit');
          // まんなかを 見てから もどったときは はじめの 音から（せっていで「つづきから」も）
          jiyuSound(d, rec.resume && J.pos[d] >= 0 ? J.pos[d] + 1 : 0);
        }
      } else {
        J.stepT += dt;
        if (J.stepT >= rec.stepSec) {
          J.stepT -= rec.stepSec;
          jiyuSound(d, J.pos[d] + 1);
        }
        setRing(ring, J.stepT / rec.stepSec);
      }
    } else if (J.held) {
      jiyuEnd(J.held);
      J.held = null; J.heldT = 0; J.fired = false; J.stepT = 0;
    }
  }

  function buildEye(stage) {
    var a = inst(sel[0]), b = sel[1] ? inst(sel[1]) : null;
    var L, R;
    if (b) {
      var pa = pairOf(a)[0], pb = pairOf(b)[0];
      L = { it: a, sound: pa.sound, label: pa.label, color: pa.color };
      R = { it: b, sound: pb.sound, label: pb.label, color: pb.color };
    } else {
      var pp = pairOf(a);
      L = { it: a, sound: pp[0].sound, label: pp[0].label, color: pp[0].color };
      R = { it: a, sound: pp[1].sound, label: pp[1].label, color: pp[1].color };
    }
    G.sides = { left: L, right: R };
    G.halves = {};
    [['left', L, 'ひだり'], ['right', R, 'みぎ']].forEach(function (x) {
      var side = x[0], s = x[1];
      var h = document.createElement('button');
      h.type = 'button';
      h.className = 'half half-' + side;
      h.style.setProperty('--accent', s.it.color);
      if (s.color) h.style.setProperty('--say', s.color);
      h.setAttribute('aria-label', x[2] + '：' + s.it.name + ' ' + s.label);
      h.innerHTML = '<span class="half-tag">' + x[2] + '</span>' +
        '<span class="half-mite" aria-hidden="true">みて！</span>' +
        '<span class="half-ring">' +
          '<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" class="ring-bg"/><circle cx="50" cy="50" r="46" class="ring-fg" pathLength="1"/></svg>' +
          '<span class="half-art">' + ART[s.it.id] + '</span></span>' +
        '<span class="half-name">' + s.it.name + '</span>' +
        '<span class="half-say">' + s.label + '</span>';
      bindHit(h, s.it.id, s.sound, s.color);
      stage.appendChild(h);
      G.halves[side] = h;
    });
  }

  function openPlay() {
    show('play');
    var stage = $('stage');
    stage.innerHTML = '';
    G.halves = null;
    G.game = null;
    G.jiyu = how === 'eye' && rec.eyeMode === 'jiyu';
    stage.className = 'stage stage-' + how + ' n' + sel.length + (G.jiyu ? ' stage-jiyu' : '');
    if (isGame()) buildGame(stage);
    else if (G.jiyu) buildJiyu(stage); else if (how === 'eye') buildEye(stage); else buildFinger(stage);
    G.timed = (how === 'eye' && !G.jiyu) || rec.kyoku || !!G.game;
    setPreview($('playPrev'), how === 'eye');
    $('playCamMsg').hidden = true;
    toReady();
    cancelAnimationFrame(G.raf);
    G.last = performance.now();
    G.raf = requestAnimationFrame(playTick);
  }

  // おとゲーム（otogame.js）：さいしょに えらんだ がっきで あそぶ
  function buildGame(stage) {
    var it = inst(sel[0]);
    stage.className = 'stage stage-game';
    var box = document.createElement('div');
    stage.appendChild(box);
    G.game = OtoGame.create({
      box: box,
      inst: it,
      song: songOf(rec.gSong),
      level: rec.level,
      tempo: rec.gameTempo,
      keyColors: KEY_COLORS,
      noteNames: Oto.NOTE_NAMES,
      art: ART[it.id],
      play: function (id, sound) { Oto.unlock(); Oto.play(id, sound); },
      onEnd: gameEnd
    });
  }
  function gameEnd(r) {
    $('cntPit').textContent = String(r.pit);
    $('cntIi').textContent = String(r.ii);
    $('cntOs').textContent = String(r.os);
    $('hanamaru').innerHTML = hanamaruSvg();
    setState('end');
    Oto.play('triangle', 0, null, 0.5);
  }
  // はなまる（ぬりえ と おなじ かきかた）
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

  function infoText() {
    var t = [];
    if (G.game) {
      return '♪ ' + songOf(rec.gSong).name + '・' + G.game.levelName + '（1ぷんに ' + G.game.bpm + 'はく）';
    }
    if (rec.kyoku) {
      var s = songOf(rec.song);
      t.push('♪ ' + s.name + '（' + (rec.reps ? rec.reps + 'かい' : 'ずっと') + '）');
    }
    if (how === 'eye' && G.jiyu) t.push('みた ほうが なるよ。みつづけると おとが かわるよ');
    else if (how === 'eye') t.push(fmtSec(rec.speed) + 'びょうに 1かい ひかるよ');
    else if (!rec.kyoku) t.push('すきな ように ならしてね');
    return t.join('　');
  }

  function setState(s) {
    G.state = s;
    document.body.setAttribute('data-play', s);
    $('readyEl').hidden = s !== 'ready';
    $('countEl').hidden = s !== 'count';
    $('endEl').hidden = s !== 'end';
    $('endResult').hidden = !(s === 'end' && G.game);
    $('ctrl').hidden = !(s === 'count' || s === 'run');
    keepAwake(s === 'count' || s === 'run');
  }
  function toReady() {
    stopSong();
    unlight();
    if (G.game) G.game.reset();
    $('playInfo').textContent = infoText();
    setState(G.timed ? 'ready' : 'free');
  }
  function stopSong() { if (G.song) { G.song.stop(); G.song = null; } }

  function beginCount() {
    Oto.unlock();
    stopSong();
    unlight();
    var now = performance.now();
    G.cStart = now;
    G.t0 = now + 3000;
    G.ms = rec.speed * 1000;
    G.total = Infinity;
    G.k = -1;
    G.lastCount = 0;
    if (G.game) {
      G.game.start(G.t0);   // 「スタート」の ピッ で 曲の 1はくめ（丸は カウントダウンの あいだから おりてくる）
    } else if (rec.kyoku) {
      var s = songOf(rec.song);
      var bpm = bpmOf(rec.beats);
      G.song = Oto.Song(s, bpm, rec.reps, G.t0);
      G.ms = G.song.spb * rec.beats;
      G.total = G.song.totalMs;
    }
    $('playInfo').textContent = infoText();
    setState('count');
  }
  $('startBtn').addEventListener('click', beginCount);
  $('againBtn').addEventListener('click', beginCount);
  $('endAgain').addEventListener('click', beginCount);
  $('stopBtn').addEventListener('click', toReady);
  $('endClose').addEventListener('click', toReady);

  function unlight() {
    G.lit = null;
    G.held = null; G.heldT = 0; G.fired = false;
    if (!G.halves) return;
    if (G.jiyu) {
      ['left', 'right'].forEach(function (s) { jiyuEnd(s); G.halves[s].classList.remove('is-look'); });
      jiyuReset();
      return;
    }
    ['left', 'right'].forEach(function (s) {
      var h = G.halves[s];
      h.classList.remove('is-lit', 'is-look', 'is-done');
      setRing(h.querySelector('.ring-fg'), 0);
    });
  }
  function setLit(side) {
    G.lit = side;
    G.heldT = 0;
    G.fired = false;
    ['left', 'right'].forEach(function (s) {
      var h = G.halves[s];
      h.classList.toggle('is-lit', s === side);
      h.classList.remove('is-done');
      setRing(h.querySelector('.ring-fg'), 0);
    });
  }

  function playTick(now) {
    G.raf = requestAnimationFrame(playTick);
    var dt = Math.min(0.1, (now - G.last) / 1000);
    G.last = now;
    if (mode !== 'play') return;
    if (G.song) G.song.update();
    if (G.game && (G.state === 'count' || G.state === 'run')) G.game.tick(now);

    if (G.state === 'count') {
      var n = 3 - Math.floor((now - G.cStart) / 1000);
      if (now >= G.t0) {
        Oto.beep(true);
        setState('run');
      } else if (n !== G.lastCount && n >= 1) {
        G.lastCount = n;
        $('countNum').textContent = String(n);
        $('countNum').classList.remove('pop');
        void $('countNum').offsetWidth;
        $('countNum').classList.add('pop');
        Oto.beep(false);
      }
    }

    if (G.state === 'run') {
      var el = now - G.t0;
      if (el >= G.total) { stopSong(); unlight(); setState('end'); return; }
      if (G.halves && !G.jiyu) {
        var k = Math.floor(el / G.ms);
        if (k !== G.k) { G.k = k; setLit(k % 2 === 0 ? 'left' : 'right'); }
      }
    }

    if (how !== 'eye' || !G.halves) return;
    var ok = camMsg($('playCamMsg'));
    var d = ok && !anyOverlay() ? eye.getDir() : null;
    G.halves.left.classList.toggle('is-look', d === 'left');
    G.halves.right.classList.toggle('is-look', d === 'right');
    if (G.jiyu) {
      // じゆう：スタートの まえ・カウントダウン・おしまい の ときは 鳴らさない
      jiyuTick(G.state === 'free' || G.state === 'run' ? d : null, dt);
      return;
    }
    if (G.state !== 'run' || !G.lit) return;
    // ひかっている ほうを 見つづけたら、その 音を 1かい ならす（つぎが ひかるまでの 間なら おくれても いい）
    var h = G.halves[G.lit];
    if (!G.fired) {
      if (d === G.lit) {
        G.heldT += dt;
        if (G.heldT >= rec.dwellPlay) {
          G.fired = true;
          var s = G.sides[G.lit];
          Oto.play(s.it.id, s.sound);
          hitFx(h, s.color);
          h.classList.add('is-done');
        }
      } else {
        G.heldT = 0;
      }
      setRing(h.querySelector('.ring-fg'), G.heldT / rec.dwellPlay);
    }
  }

  // 画面が 暗く ならないように（対応している iPad だけ）
  var wake = null, wantWake = false;
  function keepAwake(on) {
    wantWake = on;
    try {
      if (on && !wake && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then(function (w) {
          if (!wantWake) { w.release(); return; }
          wake = w;
          w.addEventListener('release', function () { wake = null; });
        }).catch(function () {});
      } else if (!on && wake) { wake.release(); wake = null; }
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && wantWake) keepAwake(true);
  });

  function leavePlay() {
    stopSong();
    unlight();
    if (G.game) G.game.reset();
    setState('free');
    keepAwake(false);
    cancelAnimationFrame(G.raf);
    if (eye) eye.showPreview(null);
  }
  function playing() { return mode === 'play' && (G.state === 'count' || G.state === 'run'); }

  // ---------- もどる・もくじ ----------
  $('backBtn').addEventListener('click', function () {
    if (mode === 'pick') { stopPickEye(); stopCam(); if (eye) eye.showPreview(null); show('start'); }
    else if (mode === 'prep') { openPick(); }
    else if (mode === 'play') {
      if (playing()) ask({ title: 'やめる？', sub: 'えんそうを やめて、じゅんびに もどります。', yes: 'やめる', no: 'つづける', onYes: function () { leavePlay(); openPrep(); } });
      else { leavePlay(); openPrep(); }
    }
  });
  $('homeBtn').addEventListener('click', function (e) {
    if (mode !== 'play') return;
    e.preventDefault();
    ask({
      title: 'やめる？',
      sub: 'えんそうを やめて、もくじに もどります。',
      yes: 'やめる',
      no: 'つづける',
      onYes: function () { leavePlay(); stopCam(); location.href = $('homeBtn').href; }
    });
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
    var c = window.Shisen ? Shisen.loadSettings() : { source: 'both' };
    $('spVal').textContent = fmtSec(rec.speed) + 'びょうに 1かい';
    $('gtVal').textContent = 'いつもの ' + rec.gameTempo + '%';
    $('gtMinus').disabled = rec.gameTempo <= 50;
    $('gtPlus').disabled = rec.gameTempo >= 150;
    $('spMinus').disabled = rec.speed <= 1.5;
    $('spPlus').disabled = rec.speed >= 8;
    each('[data-dwell-play]', function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-dwell-play')) === rec.dwellPlay)); });
    each('[data-pick-speed]', function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-pick-speed')) === rec.pickSpeed)); });
    each('[data-dwell-pick]', function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-dwell-pick')) === rec.dwellPick)); });
    each('[data-cam-src]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cam-src') === c.source)); });
    each('[data-resume]', function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-resume') === '1') === rec.resume)); });
  }
  function afterSetting() {
    save();
    renderSettings();
    if (mode === 'prep') renderPrep();
    if (mode === 'play' && !playing()) {
      if (G.game) openPlay();   // おとゲームの はやさを かえたら 作りなおす
      else $('playInfo').textContent = infoText();
    }
  }
  $('spMinus').addEventListener('click', function () { rec.speed = clamp(rec.speed - 0.5, 1.5, 8); afterSetting(); });
  $('spPlus').addEventListener('click', function () { rec.speed = clamp(rec.speed + 0.5, 1.5, 8); afterSetting(); });
  $('gtMinus').addEventListener('click', function () { rec.gameTempo = clamp(rec.gameTempo - 10, 50, 150); afterSetting(); });
  $('gtPlus').addEventListener('click', function () { rec.gameTempo = clamp(rec.gameTempo + 10, 50, 150); afterSetting(); });
  each('[data-resume]', function (b) { b.addEventListener('click', function () { rec.resume = b.getAttribute('data-resume') === '1'; afterSetting(); }); });
  each('[data-dwell-play]', function (b) { b.addEventListener('click', function () { rec.dwellPlay = Number(b.getAttribute('data-dwell-play')); afterSetting(); }); });
  each('[data-pick-speed]', function (b) { b.addEventListener('click', function () { rec.pickSpeed = Number(b.getAttribute('data-pick-speed')); afterSetting(); }); });
  each('[data-dwell-pick]', function (b) { b.addEventListener('click', function () { rec.dwellPick = Number(b.getAttribute('data-dwell-pick')); afterSetting(); }); });
  each('[data-cam-src]', function (b) {
    b.addEventListener('click', function () {
      if (!window.Shisen) return;
      Shisen.saveSettings({ source: b.getAttribute('data-cam-src') });
      if (eye) eye.setSource(b.getAttribute('data-cam-src'));
      renderSettings();
    });
  });
  $('setClose').addEventListener('click', function () { closeOverlay($('setEl')); });
  $('setTestBtn').addEventListener('click', function () {
    closeOverlay($('setEl'));
    var wasOn = eye && eye.isRunning();
    function after() {
      if (wasOn || how === 'eye' && mode !== 'start') {
        // えんそう・えらぶ 画面の 小さい えいぞうを もどす
        if (mode === 'pick') setPreview($('pickPrev'), how === 'eye');
        if (mode === 'play') setPreview($('playPrev'), how === 'eye');
      } else stopCam();
    }
    useCam(function () { Shisen.openTest(eye, { onClose: after }); }, after, !Shisen.loadCalib());
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlays.length) {
      var top = overlays[overlays.length - 1];
      if (top === $('askEl')) $('askNo').click();
      else if (top === $('setEl')) $('setClose').click();
    }
  });

  // えんそうの とちゅうで ページを 読みなおさない
  window.kyozaiBusy = function () { return playing() || mode === 'pick' && P.on || mode === 'play' && how === 'eye'; };
  window.addEventListener('pagehide', function () { stopCam(); keepAwake(false); });

  // ---------- はじめ ----------
  renderVol();
  show('start');
})();
