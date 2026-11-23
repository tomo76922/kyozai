// たべもの キャッチ
// うえから おちてくる たべものを、ひよこの かごで キャッチする。
// たべもの では ないもの（いし・くつ・かみなりぐも）を とると、ハートが 1つ へる。
// 絵は 絵文字と プログラムで かき、音も その場で 作る（画像・音の ファイルは つかわない）。
(function () {
  'use strict';

  // ---------- おちてくる もの ----------
  // w：でてくる わりあい（とくてんが たかい ものほど すくない）
  var FOODS = [
    { id: 'cheese',  emoji: '\uD83E\uDDC0', name: 'チーズ',     pt: 10, w: 30 },
    { id: 'kanpyo',  emoji: null,             name: 'かんぴょう', pt: 20, w: 25 },   // あう 絵文字が ないので プログラムで かく
    { id: 'ramen',   emoji: '\uD83C\uDF5C', name: 'ラーメン',   pt: 30, w: 17 },
    { id: 'gyoza',   emoji: '\uD83E\uDD5F', name: 'ぎょうざ',   pt: 40, w: 11 },
    { id: 'ichigo',  emoji: '\uD83C\uDF53', name: 'いちご',     pt: 50, w: 6 }
  ];
  // たいりょくが へる もの（id の thunder は すこし ゆれながら おちる）
  var AVOIDS = [
    { id: 'thunder', emoji: '\u26A1', name: 'かみなり', w: 1 },
    { id: 'rock',    emoji: '\uD83E\uDEA8', name: 'いわ', w: 1 },
    { id: 'saru',    emoji: '\uD83D\uDC12', name: 'さる', w: 1 }
  ];
  var HEART = { id: 'heart', name: 'ハート' };

  var HP_MAX = 3;
  var LEVEL_SEC = 30;          // 30びょう ごとに レベルアップ
  var LEVEL_CAP = 11;          // これより うえは むずかしく しない
  var SPEEDS = {
    // fall：うえから じめんまで おちる びょうすう ／ gap：つぎが でてくるまでの びょうすう
    slow:   { fall: 4.8, gap: 1.3, gapMin: 0.65 },
    normal: { fall: 3.5, gap: 0.95, gapMin: 0.48 }
  };
  // こえモード：とても ゆっくり はじまり、はやく なるのも ゆるやか
  var KOE_SPEEDS = {
    vslow:  { fall: 10, gap: 3.7, gapMin: 2.8 },
    slow:   { fall: 8,  gap: 3.2, gapMin: 2.4 },
    normal: { fall: 6.5, gap: 2.7, gapMin: 2.0 }
  };
  var KOE_LANES = [0.3, 0.7];   // こえモードの ひだり・みぎの れつ（はばに たいする わりあい）
  var KOE_SAFE_START = 6;
  var HEART_CHANCE = 0.04;     // ハートは たまにしか でない
  var HEART_MIN_SEC = 12;
  var SAFE_START = 3;          // はじめの 3びょうは よけるものを ださない
  var HURT_TIME = 1.0;         // ふらっと している 時間（この間は よけるものに あたっても へらない）
  var MAX_STEP = 1 / 120;

  var INK = '#3d3a35';
  var FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif';
  var EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  var HEART_D = 'M20 35C8 27 3 20 3 13.5 3 8.5 7 5 11.5 5 15 5 18 7 20 10 22 7 25 5 28.5 5 33 5 37 8.5 37 13.5 37 20 32 27 20 35Z';

  // ---------- きろく（この iPad の中だけに ほぞん。なまえは いれない） ----------
  var STORE_KEY = 'tabecatch-v1';
  var canSave = true;
  var rec = { scores: [], koeScores: [], speed: 'normal', sound: true, mode: 'yubi', koeSpeed: 'vslow' };

  (function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canSave = false; }
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      rec.scores = readScores(d.scores);
      rec.koeScores = readScores(d.koeScores);
      rec.speed = d.speed === 'slow' ? 'slow' : 'normal';
      rec.mode = d.mode === 'koe' ? 'koe' : 'yubi';
      rec.koeSpeed = KOE_SPEEDS[d.koeSpeed] ? d.koeSpeed : 'vslow';
      rec.sound = d.sound !== false;
    } catch (e) {}
  })();

  function readScores(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    list.forEach(function (x) {
      var s = Number(x && x.s);
      if (s > 0 && s < 1e7 && /^\d{4}-\d{2}-\d{2}$/.test(x.d)) {
        out.push({ s: Math.floor(s), d: x.d, sp: KOE_SPEEDS[x.sp] || x.sp === 'slow' ? x.sp : 'normal' });
      }
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 5);
  }

  function save() {
    if (!canSave) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(rec)); } catch (e) { canSave = false; }
  }

  function today() {
    var t = new Date();
    return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
  }
  function dateShort(d) {
    var p = d.split('-');
    return Number(p[1]) + 'がつ' + Number(p[2]) + 'にち';
  }
  function dateLong(d) {
    var p = d.split('-');
    return p[0] + 'ねん ' + Number(p[1]) + 'がつ' + Number(p[2]) + 'にち';
  }

  // ハイスコアは「ゆび」と「こえ」で べつべつ
  function scoreList(m) { return (m || rec.mode) === 'koe' ? rec.koeScores : rec.scores; }

  // とくてんを いれる。上位5つに はいったら その じゅんばん（0〜4）、はいらなければ -1
  function addScore(s, m) {
    if (s <= 0) return -1;
    var list = scoreList(m);
    var i = 0;
    while (i < list.length && list[i].s >= s) i++;
    if (i >= 5) return -1;
    list.splice(i, 0, { s: s, d: today(), sp: m === 'koe' ? rec.koeSpeed : rec.speed });
    if (list.length > 5) list.length = 5;
    save();
    return i;
  }
  function bestScore(m) { var l = scoreList(m); return l.length ? l[0].s : 0; }

  // ---------- 音（音の ファイルは つかわず、その場で 作る。音量は ひかえめ） ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var actx = null;
  var master = null;

  function audio() {
    if (!AC) return null;
    try {
      if (!actx) {
        actx = new AC();
        master = actx.createGain();
        master.gain.value = 0.5;
        master.connect(actx.destination);
      }
      if (actx.state !== 'running' && actx.resume) actx.resume();
    } catch (e) { return null; }
    return actx;
  }

  // iPad では、タップした ときに 音の じゅんびを しておかないと、あとで 鳴らせない
  function unlockAudio() {
    var c = audio();
    if (!c) return;
    try {
      var src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch (e) {}
  }

  // 音を 1つ（f0 から f1 へ なめらかに 高さを かえる）
  function tone(at, type, f0, f1, dur, vol) {
    var c = actx;
    var t = c.currentTime + 0.01 + at;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function sound(fn) {
    if (!rec.sound || !audio()) return;
    if (koe && koe.isRunning()) koe.ignoreFor(450);
    try { fn(); } catch (e) {}
  }

  // キャッチ：とくてんが たかいほど すこし たかい 音
  var lastCatchSnd = 0;
  function sCatch(pt) {
    var now = performance.now();
    if (now - lastCatchSnd < 40) return;
    lastCatchSnd = now;
    var f = pt >= 50 ? 1318 : pt >= 30 ? 1175 : pt >= 20 ? 988 : 880;
    sound(function () {
      tone(0, 'sine', f, f, 0.12, 0.06);
      tone(0.06, 'sine', f * 1.5, f * 1.5, 0.18, 0.045);
      if (pt >= 50) tone(0.13, 'sine', f * 2, f * 2, 0.22, 0.035);
    });
  }
  function sHeart() {
    sound(function () {
      [659, 880, 1109].forEach(function (f, i) { tone(i * 0.08, 'triangle', f, f, 0.24, 0.06); });
    });
  }
  // あたった とき：こわくない「ぽよん」
  function sHurt() {
    sound(function () {
      tone(0, 'sine', 330, 250, 0.18, 0.08);
      tone(0.14, 'sine', 300, 380, 0.18, 0.06);
    });
  }
  function sLevel() {
    sound(function () {
      [523, 659, 784].forEach(function (f, i) { tone(i * 0.07, 'triangle', f, f, 0.18, 0.05); });
    });
  }
  function sOver() {
    sound(function () {
      [[0, 659], [0.2, 587], [0.4, 523]].forEach(function (n) { tone(n[0], 'sine', n[1], n[1], 0.35, 0.07); });
      tone(0.62, 'sine', 392, 392, 0.9, 0.05);
      tone(0.62, 'sine', 523, 523, 0.9, 0.05);
    });
  }
  function sRecord() {
    sound(function () {
      [[0, 523], [0.14, 659], [0.28, 784], [0.48, 1047]].forEach(function (n) {
        tone(n[0], 'sine', n[1], n[1], 0.8, 0.08);
        tone(n[0], 'sine', n[1] * 2, n[1] * 2, 0.4, 0.012);
      });
    });
  }

  // ---------- べんりな もの ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) {
    var sum = 0, i;
    for (i = 0; i < list.length; i++) sum += list[i].w;
    var r = Math.random() * sum;
    for (i = 0; i < list.length; i++) { r -= list[i].w; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }

  // ---------- がめんの 大きさ ----------
  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var W = 1, H = 1, dpr = 1;
  var k = 1;          // 絵の 大きさの もと（iPad で だいたい 1）
  var groundY = 1;    // ひよこが たつ ところ
  var itemSize = 64;  // おちてくる ものの 大きさ
  var chickS = 1.3;   // ひよこの 大きさ
  var basketHalf = 56;
  var bg = null;      // うしろの 絵（大きさが かわったときだけ かく）
  var sprites = {};   // おちてくる ものの 絵（さきに かいておく）
  var heartPath = null;
  try { heartPath = new Path2D(HEART_D); } catch (e) {}

  function resize() {
    var oldW = W;
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    var vmin = Math.min(W, H);
    k = clamp(vmin / 780, 0.6, 1.4);
    var btn = clamp(vmin * 0.11, 80, 104);
    groundY = H - (btn + 36);
    itemSize = Math.round(72 * k);
    chickS = 1.35 * k;
    basketHalf = 44 * chickS;
    // ひよこの いちは、はばに たいする わりあいを たもつ
    if (P) P.x = clamp(P.x / oldW * W, minX(), maxX());
    makeBackground();
    makeSprites();
    if (!running) draw();
  }

  function minX() { return basketHalf + 6; }
  function maxX() { return W - basketHalf - 6; }

  // ---------- うしろの 絵（そら・おか・じめん） ----------
  function makeBackground() {
    bg = document.createElement('canvas');
    bg.width = cv.width;
    bg.height = cv.height;
    var b = bg.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = b.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, '#a9bfc8');
    g.addColorStop(1, '#cdcabb');
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);

    // おひさま
    b.fillStyle = 'rgba(234,214,154,0.35)';
    b.beginPath(); b.arc(W * 0.86, H * 0.2, 74 * k, 0, 6.2832); b.fill();
    b.fillStyle = '#e2cc8e';
    b.beginPath(); b.arc(W * 0.86, H * 0.2, 48 * k, 0, 6.2832); b.fill();

    // とおくの おか・ちかくの おか
    hills(b, '#9fb59b', groundY - 70 * k, 34 * k, 0.004 / k, 0.4);
    hills(b, '#87a183', groundY - 26 * k, 20 * k, 0.007 / k, 2.1);

    // じめん
    b.fillStyle = '#c4b08a';
    b.fillRect(0, groundY, W, H - groundY);
    b.fillStyle = '#b29d76';
    for (var x = 18; x < W; x += 46) {
      var y = groundY + 26 + ((x * 37) % 53);
      if (y < H - 6) { b.beginPath(); b.ellipse(x, y, 5, 2.6, 0, 0, 6.2832); b.fill(); }
    }
    b.fillStyle = '#7d9c6f';
    b.fillRect(0, groundY - 4, W, 14);
    b.fillStyle = '#668559';
    b.fillRect(0, groundY + 8, W, 3);
    // くさ
    b.strokeStyle = '#668559';
    b.lineWidth = 2.5;
    b.lineCap = 'round';
    b.beginPath();
    for (var gx = 10; gx < W; gx += 34) {
      var gy = groundY - 4;
      b.moveTo(gx, gy); b.lineTo(gx - 3, gy - 8);
      b.moveTo(gx + 5, gy); b.lineTo(gx + 8, gy - 7);
    }
    b.stroke();
  }

  function hills(b, color, base, amp, f, ph) {
    b.fillStyle = color;
    b.beginPath();
    b.moveTo(0, H);
    for (var x = 0; x <= W + 20; x += 20) {
      b.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(x * f + ph)) - amp * 0.4 * Math.sin(x * f * 2.3 + ph * 2));
    }
    b.lineTo(W, H);
    b.closePath();
    b.fill();
  }

  // ---------- おちてくる ものの 絵 ----------
  // 白くて ふとい ふちの 丸に のせて、うしろから めだつように する。
  // へる もの（よける もの）は、ふちを こい はいいろに して 見わけやすく する。
  function makeSprites() {
    sprites = {};
    FOODS.forEach(function (it) { sprites[it.id] = plateSprite(it, 'food', itemSize * dpr); });
    AVOIDS.forEach(function (it) { sprites[it.id] = plateSprite(it, 'avoid', itemSize * dpr); });
    sprites.heart = plateSprite(HEART, 'heart', itemSize * dpr);
  }

  function plateSprite(it, type, px) {
    var c = document.createElement('canvas');
    c.width = c.height = Math.ceil(px * 1.3);
    var g = c.getContext('2d');
    var cx = c.width / 2, cy = c.height / 2;
    var r = px * 0.5;
    var ri = r * 0.8;          // 中の 丸
    // かげ
    g.fillStyle = 'rgba(30,28,25,0.3)';
    g.beginPath(); g.arc(cx, cy + r * 0.1, r * 1.03, 0, 6.2832); g.fill();
    // ふち（たべもの・ハート：しろ ／ よける もの：こい はいいろ）
    g.fillStyle = type === 'avoid' ? '#4a4845' : '#ffffff';
    g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill();
    g.lineWidth = Math.max(1.5, r * 0.06);
    g.strokeStyle = type === 'avoid' ? '#2b2a28' : '#3d3a35';
    g.stroke();
    // 中
    g.fillStyle = type === 'avoid' ? '#f4f3f0' : '#ffffff';
    g.beginPath(); g.arc(cx, cy, ri, 0, 6.2832); g.fill();
    if (type === 'food' || type === 'avoid') {
      g.strokeStyle = type === 'avoid' ? '#2b2a28' : 'rgba(61,58,53,0.35)';
      g.lineWidth = Math.max(1, r * 0.03);
      g.stroke();
    }
    // 中身
    if (type === 'heart') drawHeartIn(g, cx, cy, ri);
    else if (it.id === 'kanpyo') drawKanpyo(g, cx, cy, ri);
    else {
      g.font = Math.round(ri * 1.45) + 'px ' + EMOJI_FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(it.emoji, cx, cy + ri * 0.08);
    }
    return c;
  }

  function drawHeartIn(g, cx, cy, ri) {
    if (!heartPath) return;
    var s = ri * 1.5 / 40;
    g.save();
    g.translate(cx - 20 * s, cy - 19 * s);
    g.scale(s, s);
    g.fillStyle = '#e8746d';
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.lineJoin = 'round';
    g.fill(heartPath);
    g.stroke(heartPath);
    g.fillStyle = 'rgba(255,253,247,0.85)';
    g.beginPath(); g.ellipse(12, 13, 3.6, 2.4, -0.6, 0, 6.2832); g.fill();
    g.restore();
  }

  // かんぴょう：クリームいろの ながい おびを なんぼんか たばねて、まんなかを ひもで しばった かたち
  function drawKanpyo(g, cx, cy, ri) {
    var top = cy - ri * 0.86, bot = cy + ri * 0.36, mid = cy - ri * 0.25;
    var n = 5;
    g.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < n; i++) {
        var o = i - (n - 1) / 2;
        var xt = cx + o * ri * 0.25, xm = cx + o * ri * 0.07, xb = cx + o * ri * 0.26;
        g.beginPath();
        g.moveTo(xt, top + Math.abs(o) * ri * 0.05);
        g.quadraticCurveTo(xm - (xt - xm) * 0.6, mid, xm, mid);
        g.quadraticCurveTo(xm - (xb - xm) * 0.6, mid, xb, bot - Math.abs(o) * ri * 0.04);
        g.lineWidth = pass === 0 ? ri * 0.24 : ri * 0.16;
        g.strokeStyle = pass === 0 ? '#9c8450' : (i % 2 ? '#f6ecc8' : '#efe0b0');
        g.stroke();
      }
    }
    // ひも
    g.fillStyle = '#8a6a45';
    g.strokeStyle = '#4e3b26';
    g.lineWidth = Math.max(1, ri * 0.04);
    roundRectOn(g, cx - ri * 0.36, mid - ri * 0.1, ri * 0.72, ri * 0.2, ri * 0.08);
    g.fill(); g.stroke();
    // なまえ（子どもに わかりやすいように）
    var fs = Math.max(8, ri * 0.28);
    g.font = '700 ' + Math.round(fs) + 'px ' + FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    var tw = g.measureText('かんぴょう').width;
    var ly = cy + ri * 0.68;
    g.fillStyle = '#3d3a35';
    roundRectOn(g, cx - tw / 2 - fs * 0.35, ly - fs * 0.62, tw + fs * 0.7, fs * 1.24, fs * 0.6);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillText('かんぴょう', cx, ly + fs * 0.04);
  }

  function roundRectOn(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // ---------- ゲームの ようす ----------
  var mode = 'title';   // title / play / over
  var paused = false;
  var P = null;         // ひよこ
  var G = null;         // あそんでいる ときの ようす
  var items = [];
  var pops = [];        // +10 などの もじ・キラキラ
  var clouds = [
    { x: 0.15, y: 0.16, s: 1.0, v: 0.006 },
    { x: 0.55, y: 0.1, s: 0.8, v: 0.004 },
    { x: 0.85, y: 0.3, s: 0.65, v: 0.005 }
  ];
  var clock = 0;

  function newChick() {
    return { x: W / 2, vx: 0, tilt: 0, walk: 0, happy: 0, bounce: 0, hurt: 0, catchEmoji: null, catchT: 0, sit: 0, lane: 0 };
  }
  P = newChick();

  // うごかしかた
  var drag = { id: null, x: null };
  var hold = { left: false, right: false, t: 0 };

  function newGame() {
    var isKoe = rec.mode === 'koe';
    var sp = isKoe ? KOE_SPEEDS[rec.koeSpeed] : SPEEDS[rec.speed];
    G = {
      koe: isKoe,
      sp: sp,
      t: 0,
      level: 1,
      score: 0,
      hp: HP_MAX,
      next: 0.5,
      lastHeart: -99,
      prevBest: bestScore(isKoe ? 'koe' : 'yubi'),
      recShown: false,
      over: false,
      overT: 0,
      bubble: null
    };
    items = [];
    pops = [];
    P = newChick();
    if (isKoe) P.x = laneX(0);
    drag.id = null; drag.x = null;
    hold.left = hold.right = false;
  }

  function laneX(i) { return clamp(KOE_LANES[i] * W, minX(), maxX()); }

  // こえモード：ひだりと みぎを いれかわる
  function switchLane() {
    if (!canControl() || !G.koe) return;
    P.lane = 1 - P.lane;
    P.bounce = 1;
    hideHint();
  }

  function speedFactor() { return 1 + (G.koe ? 0.03 : 0.07) * (Math.min(G.level, LEVEL_CAP) - 1); }
  function gapNow() {
    var g = G.sp.gap / (1 + (G.koe ? 0.05 : 0.12) * (Math.min(G.level, LEVEL_CAP) - 1));
    return Math.max(G.sp.gapMin, g);
  }

  function spawn() {
    var kind, type;
    var avoidRate = G.koe ? Math.min(0.15 + 0.008 * (G.level - 1), 0.22) : Math.min(0.2 + 0.012 * (G.level - 1), 0.32);
    if (G.hp < HP_MAX && G.t - G.lastHeart > HEART_MIN_SEC && Math.random() < HEART_CHANCE) {
      kind = HEART; type = 'heart'; G.lastHeart = G.t;
    } else if (G.t > (G.koe ? KOE_SAFE_START : SAFE_START) && Math.random() < avoidRate) {
      kind = pick(AVOIDS); type = 'avoid';
    } else {
      kind = pick(FOODS); type = 'food';
    }
    // すぐ ちかくに おなじころ でた ものと かさならないように
    var m = itemSize * 0.7;
    var x = 0;
    for (var tries = 0; tries < (G.koe ? 0 : 6); tries++) {
      x = rand(m, W - m);
      var ok = true;
      for (var i = 0; i < items.length; i++) {
        var o = items[i];
        if (o.state === 'fall' && o.p < 0.25 && Math.abs(o.xf * W - x) < itemSize * 1.3) { ok = false; break; }
      }
      if (ok) break;
    }
    var lane = -1;
    if (G.koe) {
      // こえモード：ひだりか みぎの れつ。おなじ れつが ながく つづかないように
      lane = Math.random() < 0.5 ? 0 : 1;
      if (G.lastLane === lane && G.sameLane >= 2) lane = 1 - lane;
      G.sameLane = G.lastLane === lane ? (G.sameLane || 0) + 1 : 1;
      G.lastLane = lane;
    }
    items.push({
      kind: kind,
      type: type,
      lane: lane,
      xf: x / W,
      p: 0,
      dur: G.sp.fall / speedFactor() * rand(0.92, 1.08) * (kind.id === 'thunder' ? 1.12 : 1),
      rot: kind.id === 'kanpyo' ? 0 : rand(-0.2, 0.2),   // おちる ときは ほぼ まっすぐ（もじが さかさに ならないように）
      spin: rand(-1.2, 1.2),
      ph: rand(0, 6.28),
      state: 'fall',
      t: 0,
      vx: 0, vy: 0, x: 0, y: 0
    });
  }

  function itemY(p) {
    var top = -itemSize * 0.6;
    var end = groundY - itemSize * 0.42;
    return top + (end - top) * p;
  }
  function itemX(it) {
    if (it.lane >= 0) return laneX(it.lane);
    var x = it.xf * W;
    if (it.kind.id === 'thunder') x += Math.sin(it.ph + it.p * 7) * itemSize * 0.25;
    return x;
  }

  // ---------- 1こま すすめる ----------
  function step(dt) {
    clock += dt;
    clouds.forEach(function (c) {
      c.x += c.v * dt;
      if (c.x > 1.25) c.x = -0.25;
    });
    moveChick(dt);
    if (mode === 'play') stepPlay(dt);
    stepItems(dt);
    stepPops(dt);
  }

  function moveChick(dt) {
    var px = P.x;
    var canMove = mode === 'play' && G && !G.over;
    if (canMove && G.koe) {
      P.x += (laneX(P.lane) - P.x) * Math.min(1, dt * 12);
    } else if (canMove) {
      var dir = (hold.right ? 1 : 0) - (hold.left ? 1 : 0);
      if (dir !== 0) {
        hold.t += dt;
        var sp = Math.max(520, W * 0.72) * (0.55 + 0.45 * Math.min(1, hold.t / 0.25));
        P.x += dir * sp * dt;
      } else {
        hold.t = 0;
        if (drag.x !== null) {
          var dx = drag.x - P.x;
          var mv = dx * Math.min(1, dt * 16);
          var cap = 2600 * dt;
          P.x += clamp(mv, -cap, cap);
        }
      }
      P.x = clamp(P.x, minX(), maxX());
    }
    var vx = (P.x - px) / dt;
    P.vx += (vx - P.vx) * Math.min(1, dt * 12);
    P.tilt = clamp(P.vx / 2600, -0.16, 0.16);
    if (Math.abs(P.vx) > 40) P.walk += dt * 14;
    if (P.happy > 0) P.happy = Math.max(0, P.happy - dt);
    if (P.bounce > 0) P.bounce = Math.max(0, P.bounce - dt * 3.5);
    if (P.hurt > 0) P.hurt = Math.max(0, P.hurt - dt);
    if (P.catchT > 0) P.catchT = Math.max(0, P.catchT - dt);
  }

  function stepPlay(dt) {
    if (G.over) {
      G.overT += dt;
      P.sit = Math.min(1, P.sit + dt * 3);
      if (G.overT > 1.3 && overEl.hidden) showOver();
      return;
    }
    G.t += dt;
    var lv = 1 + Math.floor(G.t / LEVEL_SEC);
    if (lv > G.level) {
      G.level = lv;
      toast('レベルアップ');
      sLevel();
    }
    G.next -= dt;
    if (G.next <= 0) {
      spawn();
      G.next = gapNow() * rand(0.75, 1.25);
    }
    if (G.bubble) {
      G.bubble.t += dt;
      if (G.bubble.t > 1.2) G.bubble = null;
    }
  }

  function stepItems(dt) {
    var catchTop = groundY - 82 * chickS;
    var catchBot = groundY - 22 * chickS;
    var r = itemSize * 0.42;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.t += dt;
      if (it.state === 'fall') {
        it.p += dt / it.dur;
        var x = itemX(it), y = itemY(it.p);
        var live = mode === 'play' && G && !G.over;
        if (live && y + r > catchTop && y < catchBot && Math.abs(x - P.x) < basketHalf + r * 0.35) {
          if (it.type === 'avoid' && P.hurt > 0) {
            // ふらっと している 間は、はじかれる だけ
            bounceAway(it, x, y);
          } else {
            caught(it, x, y);
            items.splice(i, 1);
          }
          continue;
        }
        if (it.p >= 1) {
          it.state = 'land';
          it.t = 0;
          it.x = x; it.y = y;
        }
      } else if (it.state === 'land') {
        if (it.t > 0.6) items.splice(i, 1);
      } else if (it.state === 'away') {
        it.vy += 1800 * k * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.spin * dt * 4;
        if (it.t > 0.9) items.splice(i, 1);
      }
    }
    if (mode === 'play' && G && G.over) {
      // おしまいの あとは、のこりを そっと けす
      items.forEach(function (it) { if (it.state === 'fall') { it.state = 'land'; it.t = 0; it.x = itemX(it); it.y = itemY(it.p); } });
    }
  }

  function bounceAway(it, x, y) {
    it.state = 'away';
    it.t = 0;
    it.x = x; it.y = y;
    it.vx = (x < P.x ? -1 : 1) * rand(260, 380) * k;
    it.vy = -560 * k;
  }

  function caught(it, x, y) {
    if (it.type === 'food') {
      G.score += it.kind.pt;
      setScore(true);
      P.happy = 0.45;
      P.bounce = 1;
      P.catchEmoji = it.kind.id;
      P.catchT = 0.5;
      addPop('+' + it.kind.pt, x, y - itemSize * 0.3, it.kind.pt >= 30 ? '#c8665a' : INK);
      sparkles(x, y, it.kind.pt >= 30 ? 6 : 3);
      sCatch(it.kind.pt);
      if (!G.recShown && G.prevBest > 0 && G.score > G.prevBest) {
        G.recShown = true;
        toast('しんきろく！');
      }
    } else if (it.type === 'heart') {
      if (G.hp < HP_MAX) G.hp++;
      setHearts('gain');
      P.happy = 0.6;
      P.bounce = 1;
      for (var h = 0; h < 4; h++) addPop('heart', x + rand(-30, 30) * k, y - rand(0, 30) * k, null, rand(-40, 40));
      sHeart();
    } else {
      G.hp--;
      setHearts('lost');
      P.hurt = HURT_TIME;
      P.happy = 0;
      bounceAway(it, x, y);
      items.push(it);
      sHurt();
      if (G.hp <= 0) {
        G.over = true;
        G.overT = 0;
        G.bubble = null;
        hold.left = hold.right = false;
        drag.id = null; drag.x = null;
        releaseMoveBtns();
      } else {
        G.bubble = { text: 'おっとっと', t: 0 };
      }
    }
  }

  function addPop(text, x, y, color, vx) {
    pops.push({ text: text, x: x, y: y, color: color, vx: vx || 0, t: 0, life: text === 'heart' ? 1.0 : 0.85 });
  }
  function sparkles(x, y, n) {
    for (var i = 0; i < n; i++) {
      pops.push({ text: '*', x: x, y: y, vx: rand(-160, 160) * k, vy: rand(-260, -80) * k, t: 0, life: 0.5, color: i % 2 ? '#f0c75a' : '#f4a9bc' });
    }
  }
  function stepPops(dt) {
    for (var i = pops.length - 1; i >= 0; i--) {
      var p = pops[i];
      p.t += dt;
      if (p.text === '*') {
        p.vy += 900 * k * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else {
        p.y -= 70 * k * dt;
        p.x += p.vx * dt;
      }
      if (p.t >= p.life) pops.splice(i, 1);
    }
  }

  // ---------- かく ----------
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (bg) ctx.drawImage(bg, 0, 0);
    else { ctx.fillStyle = '#f3efe6'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    clouds.forEach(function (c) { drawCloud(c.x * W, c.y * groundY, c.s * k); });

    // こえモード：ひよこが たてる 2つの ばしょの しるし
    if (mode === 'play' && G && G.koe) {
      ctx.fillStyle = 'rgba(255,253,247,0.55)';
      for (var ln = 0; ln < 2; ln++) {
        ctx.beginPath(); ctx.ellipse(laneX(ln), groundY + 4, basketHalf * 1.05, 11 * k, 0, 0, 6.2832); ctx.fill();
      }
    }

    // おちてくる ものの かげ（どこに おちるか わかるように）
    var i, it;
    ctx.fillStyle = 'rgba(40,36,30,0.2)';
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (it.state !== 'fall' || it.p < 0.15) continue;
      var a = clamp((it.p - 0.15) / 0.85, 0, 1);
      var w = itemSize * (0.18 + 0.3 * a);
      ctx.globalAlpha = 0.3 + 0.7 * a;
      ctx.beginPath(); ctx.ellipse(itemX(it), groundY + 3, w, w * 0.22, 0, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawChick();

    for (i = 0; i < items.length; i++) drawItem(items[i]);
    drawPops();

    if (mode === 'play' && G && G.bubble) {
      var ba = G.bubble.t < 0.15 ? G.bubble.t / 0.15 : G.bubble.t > 0.9 ? Math.max(0, (1.2 - G.bubble.t) / 0.3) : 1;
      drawBubble(P.x, groundY - 96 * chickS, G.bubble.text, ba);
    } else if (mode === 'play' && G && G.over && G.overT > 0.3) {
      drawBubble(P.x, groundY - 86 * chickS, 'ふう、たのしかった！', Math.min(1, (G.overT - 0.3) / 0.2));
    }
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = 'rgba(235,236,230,0.5)';
    ctx.beginPath();
    ctx.arc(x - 34 * s, y + 6 * s, 22 * s, 0, 6.2832);
    ctx.arc(x, y - 6 * s, 32 * s, 0, 6.2832);
    ctx.arc(x + 36 * s, y + 6 * s, 24 * s, 0, 6.2832);
    ctx.ellipse(x, y + 14 * s, 50 * s, 14 * s, 0, 0, 6.2832);
    ctx.fill();
  }

  function drawItem(it) {
    var sp = sprites[it.kind.id];
    if (!sp) return;
    var x, y, a = 1, sc = 1, rot = it.rot;
    if (it.state === 'fall') {
      x = itemX(it); y = itemY(it.p);
      rot += Math.sin(it.ph + clock * 3) * 0.08;
    } else if (it.state === 'land') {
      x = it.x;
      var bt = Math.min(1, it.t / 0.3);
      y = it.y - Math.sin(bt * Math.PI) * itemSize * 0.25;
      a = 1 - Math.max(0, (it.t - 0.25) / 0.35);
      if (it.kind.id === 'thunder') { sc = 1 + it.t * 0.6; a *= 0.8; }
    } else {
      x = it.x; y = it.y;
      a = 1 - Math.max(0, (it.t - 0.5) / 0.4);
    }
    var size = sp.width / dpr;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.drawImage(sp, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawPops() {
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i];
      var a = 1 - Math.max(0, (p.t - p.life * 0.5) / (p.life * 0.5));
      ctx.globalAlpha = clamp(a, 0, 1);
      if (p.text === '*') {
        sparkle(p.x, p.y, 7 * k, p.color);
      } else if (p.text === 'heart') {
        var sp = sprites.heart;
        var s = itemSize * 0.5;
        ctx.drawImage(sp, p.x - s / 2, p.y - s / 2, s, s);
      } else {
        var fs = Math.round(30 * k);
        ctx.font = '700 ' + fs + 'px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#fffdf7';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function sparkle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  // ひよこ（まえ むき。りょうほうの はねで かごを もつ）
  function drawChick() {
    var x = P.x;
    var s = chickS;
    var hurt = P.hurt;
    var moving = Math.abs(P.vx) > 40;

    // かげ
    ctx.fillStyle = 'rgba(61,58,53,0.14)';
    ctx.beginPath(); ctx.ellipse(x, groundY + 3, 40 * s, 7 * s, 0, 0, 6.2832); ctx.fill();

    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(s, s);

    // ふらっと：ゆらゆら（だんだん おさまる）
    var sway = hurt > 0 ? Math.sin((HURT_TIME - hurt) * 13) * 0.16 * (hurt / HURT_TIME) : 0;
    var idle = mode === 'title' ? Math.sin(clock * 1.6) * 0.03 : 0;
    ctx.rotate(P.tilt + sway + idle);

    var sit = P.sit;
    var hop = P.bounce > 0 ? Math.sin(P.bounce * Math.PI) * 7 : 0;
    var bob = moving && !sit ? Math.abs(Math.sin(P.walk)) * 2.5 : 0;

    // あし
    ctx.strokeStyle = '#d99a4c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (sit) {
      ctx.moveTo(-14, -3); ctx.lineTo(-22, -1);
      ctx.moveTo(14, -3); ctx.lineTo(22, -1);
    } else {
      var l = moving ? Math.sin(P.walk) * 3 : 0;
      ctx.moveTo(-10, -12 - hop); ctx.lineTo(-11 - l, -1);
      ctx.moveTo(10, -12 - hop); ctx.lineTo(11 - l, -1);
      ctx.moveTo(-11 - l, -1); ctx.lineTo(-17 - l, -1);
      ctx.moveTo(11 - l, -1); ctx.lineTo(17 - l, -1);
    }
    ctx.stroke();

    ctx.translate(0, -bob - hop + sit * 8);
    var sq = P.bounce > 0 ? 1 + Math.sin(P.bounce * Math.PI) * 0.05 : 1;
    ctx.scale(sq, 1 / sq);

    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';

    // からだ
    ctx.fillStyle = '#f7d667';
    ctx.beginPath(); ctx.ellipse(0, -42, 32, 31, 0, 0, 6.2832); ctx.fill(); ctx.stroke();

    // あたまの け
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -72); ctx.quadraticCurveTo(-8, -83, -2, -85);
    ctx.moveTo(2, -72); ctx.quadraticCurveTo(5, -83, 11, -81);
    ctx.stroke();

    // め
    var ey = -50;
    ctx.fillStyle = INK;
    ctx.lineWidth = 2.6;
    if (hurt > 0) {
      // ぎゅっと とじた め（＞ ＜）
      ctx.beginPath();
      ctx.moveTo(-16, ey - 4); ctx.lineTo(-10, ey); ctx.lineTo(-16, ey + 4);
      ctx.moveTo(16, ey - 4); ctx.lineTo(10, ey); ctx.lineTo(16, ey + 4);
      ctx.stroke();
    } else if (P.happy > 0 || sit) {
      // にっこり
      ctx.beginPath();
      ctx.moveTo(-17, ey + 1); ctx.quadraticCurveTo(-12, ey - 6, -7, ey + 1);
      ctx.moveTo(7, ey + 1); ctx.quadraticCurveTo(12, ey - 6, 17, ey + 1);
      ctx.stroke();
    } else {
      var look = clamp(P.vx / 900, -1, 1) * 2;
      ctx.beginPath(); ctx.ellipse(-12 + look, ey, 3.8, 4.6, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12 + look, ey, 3.8, 4.6, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fffdf7';
      ctx.beginPath(); ctx.arc(-10.8 + look, ey - 1.6, 1.4, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(13.2 + look, ey - 1.6, 1.4, 0, 6.2832); ctx.fill();
    }
    // ほっぺ
    ctx.fillStyle = 'rgba(239,156,150,0.7)';
    ctx.beginPath(); ctx.ellipse(-21, -40, 5.5, 3.2, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(21, -40, 5.5, 3.2, 0, 0, 6.2832); ctx.fill();
    // くちばし
    ctx.fillStyle = '#e8a24a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    if (P.happy > 0 && !hurt) {
      ctx.moveTo(-6, -45); ctx.lineTo(6, -45); ctx.lineTo(0, -37); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -45); ctx.lineTo(0, -49); ctx.lineTo(5, -45); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      ctx.moveTo(-6, -46); ctx.lineTo(6, -46); ctx.lineTo(0, -38); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }

    // かごの 中に はいった たべもの（すこしの 間 みえる）
    if (P.catchT > 0 && sprites[P.catchEmoji]) {
      var sp = sprites[P.catchEmoji];
      var cs = (itemSize * 0.75) / s;
      var sink = (1 - P.catchT / 0.5) * 10;
      ctx.drawImage(sp, -cs / 2, -40 - cs / 2 + 6 + sink, cs, cs);
    }

    // かご
    var rimY = -26;
    ctx.lineWidth = 2.6;
    ctx.fillStyle = '#d9a86c';
    ctx.beginPath();
    ctx.moveTo(-44, rimY); ctx.lineTo(44, rimY); ctx.lineTo(33, -6); ctx.quadraticCurveTo(0, 0, -33, -6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // あみめ
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(138,106,69,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var wx = -40; wx <= 40; wx += 10) { ctx.moveTo(wx, rimY); ctx.lineTo(wx * 0.75, 0); }
    ctx.moveTo(-44, -17); ctx.lineTo(44, -17);
    ctx.stroke();
    ctx.restore();
    // ふち
    ctx.fillStyle = '#c99b6a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-47, rimY - 4); ctx.lineTo(47, rimY - 4); ctx.lineTo(45, rimY + 3); ctx.lineTo(-45, rimY + 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // はね（かごの ふちを もつ）
    ctx.fillStyle = '#efc552';
    ctx.save(); ctx.translate(-34, -34); ctx.rotate(0.5); ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(34, -34); ctx.rotate(-0.5); ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.restore();

    // ふらっと している ときは、あたまの まわりに ちいさな ほし
    if (hurt > 0) {
      var ha = Math.min(1, hurt / 0.3);
      ctx.globalAlpha = ha;
      for (var st = 0; st < 3; st++) {
        var ang = clock * 5 + st * 2.094;
        sparkle(Math.cos(ang) * 30, -84 + Math.sin(ang) * 7, 6, '#f0c75a');
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBubble(x, y, text, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '700 ' + Math.round(24 * clamp(k, 0.85, 1.2)) + 'px ' + FONT;
    var w = ctx.measureText(text).width + 32;
    var h = 44;
    var bx = clamp(x - w / 2, 8, W - w - 8);
    roundRect(bx, y - h, w, h, 20);
    ctx.fillStyle = '#fffdf7';
    ctx.strokeStyle = '#e2dccf';
    ctx.lineWidth = 3;
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 2); ctx.lineTo(x, y + 10); ctx.lineTo(x + 8, y - 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, y - h / 2);
    ctx.restore();
  }

  // ---------- うごかしつづける ----------
  var running = false;
  var rafId = 0;
  var lastTs = 0;

  function frame(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 1 / 20) : 0;
    lastTs = ts;
    if (!paused && dt > 0) {
      // こまかく わけて けいさんすると、はやく おちても すりぬけない
      var n = Math.ceil(dt / MAX_STEP);
      for (var i = 0; i < n; i++) step(dt / n);
    }
    draw();
  }
  function startLoop() {
    if (running) return;
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // ---------- 表示（HUD） ----------
  var titleEl = document.getElementById('titleScreen');
  var hud = document.getElementById('hud');
  var heartsEl = document.getElementById('hearts');
  var scoreNum = document.getElementById('scoreNum');
  var scoreBox = scoreNum.parentNode;
  var toastEl = document.getElementById('toast');
  var hintEl = document.getElementById('hint');
  var pauseEl = document.getElementById('pause');
  var pauseTitle = document.getElementById('pauseTitle');
  var overEl = document.getElementById('over');
  var leftBtn = document.getElementById('leftBtn');
  var koeHud = document.getElementById('koeHud');
  var koeAgainEl = document.getElementById('koeAgain');
  var bestTitle = document.querySelector('.best .panel-title');
  var rightBtn = document.getElementById('rightBtn');

  var HEART_SVG = '<svg class="heart" viewBox="0 0 40 40" aria-hidden="true">' +
    '<path class="h-fill" d="' + HEART_D + '" stroke="#3d3a35" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<ellipse class="h-shine" cx="12" cy="13" rx="3.6" ry="2.4" transform="rotate(-35 12 13)" fill="#fffdf7" opacity="0.85"/></svg>';

  (function buildHearts() {
    var html = '';
    for (var i = 0; i < HP_MAX; i++) html += HEART_SVG;
    heartsEl.innerHTML = html;
  })();
  var heartEls = Array.prototype.slice.call(heartsEl.querySelectorAll('.heart'));

  function setHearts(anim) {
    var hp = G ? G.hp : HP_MAX;
    heartEls.forEach(function (h, i) {
      var empty = i >= hp;
      h.classList.toggle('is-empty', empty);
      if (anim === 'lost' && i === hp) restartAnim(h, 'is-lost');
      if (anim === 'gain' && i === hp - 1) restartAnim(h, 'is-gain');
    });
    heartsEl.setAttribute('aria-label', 'たいりょく ' + hp);
  }

  function restartAnim(el, cls) {
    el.classList.remove('is-lost', 'is-gain', cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
  }

  function setScore(pop) {
    scoreNum.textContent = G ? G.score : 0;
    if (pop) {
      scoreBox.classList.remove('is-pop');
      void scoreBox.offsetWidth;
      scoreBox.classList.add('is-pop');
    }
  }

  // レベルアップ・しんきろく：じゅんばんに 小さく だす
  var toastQueue = [];
  var toastBusy = false;
  var toastTimer = 0;
  function toast(text) {
    toastQueue.push(text);
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    var text = toastQueue.shift();
    if (!text) { toastBusy = false; toastEl.classList.remove('is-show'); return; }
    toastBusy = true;
    toastEl.textContent = text;
    toastEl.classList.remove('is-show');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(nextToast, 1850);
  }
  function clearToast() {
    toastQueue = [];
    clearTimeout(toastTimer);
    toastBusy = false;
    toastEl.classList.remove('is-show');
  }

  var hintTimer = 0;
  function hideHint() {
    clearTimeout(hintTimer);
    hintEl.hidden = true;
  }

  // ---------- がめんの きりかえ ----------
  function startGame() {
    newGame();
    mode = 'play';
    paused = false;
    titleEl.hidden = true;
    hud.hidden = false;
    pauseEl.hidden = true;
    overEl.hidden = true;
    clearToast();
    setScore(false);
    setHearts();
    clearTimeout(againTimer);
    koeAgainEl.hidden = true;
    leftBtn.hidden = rightBtn.hidden = G.koe;
    koeHud.hidden = !G.koe;
    if (koe) koe.enabled = true;
    hintEl.textContent = G.koe ? 'こえを だすと、ひよこが いれかわるよ' : 'ゆびで みぎ ひだりに なぞってね';
    hintEl.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, G.koe ? 7000 : 4000);
    startLoop();
  }

  function showTitle() {
    mode = 'title';
    paused = false;
    G = null;
    items = [];
    pops = [];
    P = newChick();
    hideHint();
    clearToast();
    releaseMoveBtns();
    hud.hidden = true;
    pauseEl.hidden = true;
    overEl.hidden = true;
    clearTimeout(againTimer);
    titleEl.hidden = false;
    stopKoe();
    renderBest();
    startLoop();
  }

  function pause(title) {
    if (mode !== 'play' || paused || !G || G.over) return;
    paused = true;
    hold.left = hold.right = false;
    drag.id = null; drag.x = null;
    releaseMoveBtns();
    if (koe) koe.enabled = false;
    pauseTitle.textContent = title || 'やめる？';
    pauseEl.hidden = false;
    document.getElementById('resumeBtn').focus({ preventScroll: true });
  }

  function resume() {
    if (!paused) return;
    // こえモードで マイクが とまっていたら（ほかの アプリに したとき など）、もういちど つける
    if (G && G.koe && !(koe && koe.isRunning())) {
      useKoe(resume2);
      return;
    }
    resume2();
  }
  function resume2() {
    paused = false;
    pauseEl.hidden = true;
    if (koe) koe.enabled = true;
    lastTs = 0;
  }

  var againTimer = 0;
  var againReady = false;
  function showOver() {
    var m = G.koe ? 'koe' : 'yubi';
    var prev = G.prevBest;
    var rank = addScore(G.score, m);
    var isNew = G.score > 0 && G.score > prev;
    document.getElementById('overScore').textContent = G.score;
    document.getElementById('newRec').hidden = !isNew;
    renderBestList(document.getElementById('overBest'), rank, m);
    overEl.hidden = false;
    hud.hidden = false;
    if (isNew) sRecord(); else sOver();
    document.getElementById('againBtn').focus({ preventScroll: true });
    // こえモード：すこし まってから、こえで「もういちど」が できる
    againReady = false;
    clearTimeout(againTimer);
    koeAgainEl.hidden = true;
    if (G.koe && koe && koe.isRunning()) {
      againTimer = setTimeout(function () {
        if (overEl.hidden || !koe.isRunning()) return;
        againReady = true;
        koeAgainEl.hidden = false;
      }, 2500);
    }
  }

  // ハイスコアの ひょう
  var KOE_SPEED_NAMES = { vslow: 'とても ゆっくり', slow: 'ゆっくり', normal: 'すこし ゆっくり' };
  function speedTag(r, m) {
    if (m === 'koe') return KOE_SPEED_NAMES[r.sp] || '';
    return r.sp === 'slow' ? 'ゆっくり' : '';
  }
  function renderBestList(el, newRank, m) {
    var list = scoreList(m);
    if (!list.length) {
      el.innerHTML = '<li class="b-empty">まだ ありません</li>';
      return;
    }
    el.innerHTML = list.map(function (r, i) {
      var tag = speedTag(r, m);
      return '<li' + (i === newRank ? ' class="is-new"' : '') + '>' +
        '<span class="b-rank">' + (i + 1) + 'い</span>' +
        '<span class="b-score"><b>' + r.s + '</b>てん' + (tag ? '<span class="b-slow">' + tag + '</span>' : '') + '</span>' +
        '<span class="b-date">' + dateShort(r.d) + '</span></li>';
    }).join('');
  }
  function renderBest() {
    bestTitle.textContent = rec.mode === 'koe' ? 'ハイスコア（こえ）' : 'ハイスコア（ゆび）';
    renderBestList(document.getElementById('bestList'), -1, rec.mode);
  }

  // はじめの がめんの 「キャッチ してね」「よけてね」
  (function renderGuide() {
    function pic(it, type) {
      var url = '';
      try { url = plateSprite(it, type, 96).toDataURL('image/png'); } catch (e) {}
      return '<img class="g-img" src="' + url + '" alt="">';
    }
    document.getElementById('foodList').innerHTML = FOODS.map(function (f) {
      return '<li><span class="g-pic" aria-hidden="true">' + pic(f, 'food') + '</span><span class="g-name">' + f.name + '</span><span class="g-pt">' + f.pt + 'てん</span></li>';
    }).join('') + '<li><span class="g-pic" aria-hidden="true">' + pic(HEART, 'heart') + '</span><span class="g-name">ハート</span><span class="g-pt">げんき＋1</span></li>';
    document.getElementById('avoidList').innerHTML = AVOIDS.map(function (f) {
      return '<li><span class="g-pic" aria-hidden="true">' + pic(f, 'avoid') + '</span><span class="g-name">' + f.name + '</span></li>';
    }).join('');
  })();

  document.getElementById('startBtn').addEventListener('click', function () {
    unlockAudio();
    if (rec.mode === 'koe') useKoe(startGame);
    else startGame();
  });

  // ---------- はやさ・音 ----------
  var speedBtns = Array.prototype.slice.call(document.querySelectorAll('.speed-btn'));
  function renderSpeed() {
    speedBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.speed === rec.speed)); });
  }
  speedBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      unlockAudio();
      rec.speed = b.dataset.speed;
      save();
      renderSpeed();
    });
  });

  var SPK_ON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  var soundBtns = Array.prototype.slice.call(document.querySelectorAll('.sound-btn'));
  function renderSound() {
    soundBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(rec.sound));
      b.setAttribute('aria-label', rec.sound ? 'おと あり（おすと けす）' : 'おと なし（おすと だす）');
      b.innerHTML = (rec.sound ? SPK_ON : SPK_OFF) + '<span>' + (rec.sound ? 'おと' : 'おと なし') + '</span>';
    });
  }
  soundBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      rec.sound = !rec.sound;
      save();
      renderSound();
      if (rec.sound) { unlockAudio(); sCatch(10); }
    });
  });

  // ---------- うごかす：ゆびで なぞる ----------
  function canControl() { return mode === 'play' && !paused && G && !G.over; }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    unlockAudio();
    if (!canControl()) return;
    // こえモードでも、がめんを タップすると いれかわる（てつだう ひと・スイッチ用）
    if (G.koe) { switchLane(); return; }
    if (drag.id !== null && drag.id !== e.pointerId) return;
    drag.id = e.pointerId;
    drag.x = e.clientX;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    hideHint();
  });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId !== drag.id || !canControl()) return;
    drag.x = e.clientX;
  });
  function endDrag(e) {
    if (e.pointerId !== drag.id) return;
    drag.id = null;
    drag.x = null;
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('lostpointercapture', endDrag);

  // ---------- うごかす：みぎ・ひだりの ボタン ----------
  function bindMove(btn, side) {
    function down(e) {
      e.preventDefault();
      unlockAudio();
      if (!canControl()) return;
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      hold[side] = true;
      drag.id = null; drag.x = null;
      btn.classList.add('is-down');
      hideHint();
    }
    function up() {
      hold[side] = false;
      btn.classList.remove('is-down');
    }
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) { e.preventDefault(); });
  }
  bindMove(leftBtn, 'left');
  bindMove(rightBtn, 'right');
  function releaseMoveBtns() {
    hold.left = hold.right = false;
    leftBtn.classList.remove('is-down');
    rightBtn.classList.remove('is-down');
  }

  document.addEventListener('keydown', function (e) {
    // こえモード：スペース・エンター（外づけの スイッチなど）でも いれかわる
    if (canControl() && G.koe && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      if (e.target && e.target.closest && e.target.closest('button, a')) return;
      e.preventDefault();
      if (!e.repeat) switchLane();
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!canControl()) return;
      e.preventDefault();
      hold[e.key === 'ArrowLeft' ? 'left' : 'right'] = true;
      drag.x = null;
    } else if (e.key === 'Escape') {
      if (!testEl.hidden) closeTest();
      else if (!micAskEl.hidden) closeMicAsk();
      else if (!settings.hidden) closeSettings();
      else if (canControl()) pause('やめる？');
    }
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft') hold.left = false;
    if (e.key === 'ArrowRight') hold.right = false;
  });

  // あそんでいる ときの「もくじ」は、いちじていして「やめる？」
  document.getElementById('playHome').addEventListener('click', function (e) {
    if (mode === 'play' && G && !G.over) {
      e.preventDefault();
      pause('やめる？');
    }
  });
  document.getElementById('resumeBtn').addEventListener('click', function () { unlockAudio(); resume(); });
  document.getElementById('toTitleBtn').addEventListener('click', showTitle);
  document.getElementById('againBtn').addEventListener('click', function () {
    unlockAudio();
    if (G && G.koe) useKoe(startGame);
    else startGame();
  });

  // ほかの アプリに したとき・向きを かえたときは いちじていし
  var landscape = window.innerWidth > window.innerHeight;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      pause('つづける？');
      // ほかの アプリの ときは マイクを とめる（もどったら「つづける」で また つける）
      if (!testEl.hidden) closeTest();
      stopKoe();
      stopLoop();
    } else {
      startLoop();
    }
  });
  window.addEventListener('blur', function () { releaseMoveBtns(); });
  window.addEventListener('resize', function () {
    resize();
    var now = window.innerWidth > window.innerHeight;
    if (now !== landscape) {
      landscape = now;
      pause('つづける？');
    }
  });

  // ---------- せってい（ながおしで ひらく） ----------
  var gearBtn = document.getElementById('gearBtn');
  var gearHint = document.getElementById('gearHint');
  var settings = document.getElementById('settings');
  var closeBtn = document.getElementById('closeBtn');
  var recNote = document.getElementById('recNote');
  var setList = document.getElementById('setList');
  var resetBtn = document.getElementById('resetBtn');
  var resetStatus = document.getElementById('resetStatus');
  var saveWarn = document.getElementById('saveWarn');
  var HOLD_MS = 1000;
  var holdTimer = 0;
  var gearHintTimer = 0;
  var opened = false;

  gearBtn.style.setProperty('--hold', HOLD_MS + 'ms');

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
      clearTimeout(gearHintTimer);
      gearHintTimer = setTimeout(function () { gearHint.hidden = true; }, 1800);
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
  gearBtn.addEventListener('keyup', function (e) {
    if (e.key === 'Enter' || e.key === ' ') endHold();
  });

  function renderSettings() {
    var any = rec.scores.length + rec.koeScores.length > 0;
    recNote.textContent = any
      ? 'この iPad に ほぞん している ハイスコア（「ゆび」「こえ」それぞれ 上位5つ）です。けすと ぜんぶ きえます（はやさ・音・こえの せっていは のこります）。'
      : 'ハイスコアは まだ ありません。';
    var html = '';
    rec.scores.forEach(function (r) {
      html += '<li>ゆび　' + r.s + 'てん　' + dateLong(r.d) + (r.sp === 'slow' ? '（ゆっくり）' : '（ふつう）') + '</li>';
    });
    rec.koeScores.forEach(function (r) {
      html += '<li>こえ　' + r.s + 'てん　' + dateLong(r.d) + '（' + (KOE_SPEED_NAMES[r.sp] || '') + '）</li>';
    });
    setList.innerHTML = html;
    setList.hidden = !any;
    resetBtn.disabled = !any;
    saveWarn.hidden = canSave;
    renderKoeSettings();
  }

  var armTimer = 0;
  function disarmReset() {
    clearTimeout(armTimer);
    resetBtn.classList.remove('is-armed');
    resetBtn.textContent = 'ハイスコアを けす';
  }

  function openSettings() {
    disarmReset();
    resetStatus.textContent = '';
    renderSettings();
    settings.hidden = false;
    settings.scrollTop = 0;
    stopLoop();
    closeBtn.focus({ preventScroll: true });
  }

  function closeSettings() {
    if (settings.hidden) return;
    disarmReset();
    settings.hidden = true;
    renderBest();
    startLoop();
    gearBtn.focus({ preventScroll: true });
  }

  closeBtn.addEventListener('click', closeSettings);

  // まちがえて けさないように、2回 おしたときだけ けす
  resetBtn.addEventListener('click', function () {
    if (!rec.scores.length && !rec.koeScores.length) return;
    if (!resetBtn.classList.contains('is-armed')) {
      resetBtn.classList.add('is-armed');
      resetBtn.textContent = 'もういちど おすと けします';
      clearTimeout(armTimer);
      armTimer = setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    rec.scores = [];
    rec.koeScores = [];
    save();
    renderSettings();
    resetStatus.textContent = 'ハイスコアを けしました';
  });

  // ---------- こえで あそぶ（../shared/koe-switch.js を つかう） ----------
  var KS = window.KoeSwitch || null;
  var koeConf = KS ? KS.loadSettings() : { threshold: 0.5, cooldown: 1000 };
  var koe = null;
  var micExplained = false;   // この ページを ひらいてから、マイクの せつめいを したか
  var micNext = null;         // マイクが つかえるように なったら すること

  var micAskEl = document.getElementById('micAsk');
  var micErr = document.getElementById('micErr');
  var micOkBtn = document.getElementById('micOkBtn');
  var testEl = document.getElementById('koeTest');
  var testErr = document.getElementById('testErr');
  var testLamp = document.getElementById('testLamp');
  var testLampText = document.getElementById('testLampText');
  var thValue = document.getElementById('thValue');
  var meters = [
    { fill: document.getElementById('hudMeterFill'), line: document.getElementById('hudMeterLine') },
    { fill: document.getElementById('testMeterFill'), line: document.getElementById('testMeterLine') }
  ];
  meters.forEach(function (m) { m.box = m.fill.parentNode; m.last = -1; m.over = null; });

  if (KS) {
    koe = KS.create({
      threshold: koeConf.threshold,
      cooldown: koeConf.cooldown,
      onTrigger: onVoice,
      onLevel: showLevel,
      onStop: function () { showLevel(0, koe.getThreshold()); }
    });
  }

  function onVoice() {
    if (!testEl.hidden) { flashLamp(); return; }
    if (mode !== 'play' || !G || !G.koe || paused) return;
    if (!G.over) switchLane();
    else if (againReady && !overEl.hidden) { againReady = false; startGame(); }
  }

  // メーター（いま 見えている ほうだけ うごかす）
  function showLevel(level, th) {
    meters.forEach(function (m) {
      if (m.box.offsetParent === null) return;
      var v = Math.round(level * 200) / 200;
      if (v !== m.last) { m.last = v; m.fill.style.transform = 'scaleX(' + v + ')'; }
      var over = level >= th;
      if (over !== m.over) { m.over = over; m.box.classList.toggle('is-over', over); }
    });
  }
  function placeLines() {
    var th = koe ? koe.getThreshold() : koeConf.threshold;
    meters.forEach(function (m) { m.line.style.left = (th * 100).toFixed(1) + '%'; });
    thValue.textContent = Math.round(th * 100);
  }

  // マイクを つかう：はじめての ときは、なぜ つかうかを やさしく せつめいしてから
  function useKoe(next) {
    if (koe && koe.isRunning()) { next(); return; }
    micNext = next;
    if (!micExplained || !koe) {
      micErr.hidden = true;
      micOkBtn.hidden = false;
      micAskEl.hidden = false;
      micOkBtn.focus({ preventScroll: true });
      return;
    }
    startMic();
  }
  function startMic() {
    if (!koe) { showMicError(KS ? null : { name: 'NotSupportedError' }); return; }
    koe.start().then(function () {
      micAskEl.hidden = true;
      var fn = micNext;
      micNext = null;
      placeLines();
      if (fn) fn();
    }, function (err) {
      showMicError(err);
    });
  }
  function showMicError(err) {
    micErr.textContent = KS ? KS.errorMessage(err) : 'この ページでは マイクが つかえません。';
    micErr.hidden = false;
    micOkBtn.textContent = 'もういちど ためす';
    micAskEl.hidden = false;
  }
  function closeMicAsk() {
    micAskEl.hidden = true;
    micNext = null;
    micOkBtn.textContent = 'マイクを つかう';
  }
  micOkBtn.addEventListener('click', function () {
    unlockAudio();
    micExplained = true;
    micErr.hidden = true;
    startMic();
  });
  document.getElementById('micNoBtn').addEventListener('click', closeMicAsk);

  function stopKoe() {
    if (koe && koe.isRunning()) koe.stop();
    againReady = false;
  }

  // ---------- こえテスト ----------
  var lampTimer = 0;
  var lampCount = 0;
  function flashLamp() {
    lampCount++;
    testLamp.classList.add('is-on');
    testLampText.textContent = 'はんのう！（' + lampCount + '）';
    clearTimeout(lampTimer);
    lampTimer = setTimeout(function () {
      testLamp.classList.remove('is-on');
    }, 600);
  }
  function openTest() {
    useKoe(function () {
      lampCount = 0;
      testLamp.classList.remove('is-on');
      testLampText.textContent = 'まってるよ';
      testErr.hidden = true;
      koe.enabled = true;
      placeLines();
      testEl.hidden = false;
      meters.forEach(function (m) { m.last = -1; m.over = null; });
      document.getElementById('testCloseBtn').focus({ preventScroll: true });
    });
  }
  function closeTest() {
    if (testEl.hidden) return;
    testEl.hidden = true;
    clearTimeout(lampTimer);
    if (mode === 'title') stopKoe();
  }
  function stepThreshold(d) {
    if (!koe) return;
    var th = Math.round((koe.getThreshold() + d) * 100) / 100;
    th = clamp(th, 0.1, 0.9);
    koe.setThreshold(th);
    koeConf.threshold = th;
    if (KS && !KS.saveSettings({ threshold: th })) {
      testErr.textContent = 'この iPad では せっていを ほぞん できません。ページを とじると もとに もどります。';
      testErr.hidden = false;
    }
    placeLines();
  }
  document.getElementById('koeTestBtn').addEventListener('click', function () { unlockAudio(); openTest(); });
  document.getElementById('testCloseBtn').addEventListener('click', closeTest);
  document.getElementById('thUpBtn').addEventListener('click', function () { stepThreshold(0.05); });
  document.getElementById('thDownBtn').addEventListener('click', function () { stepThreshold(-0.05); });

  // ---------- ゆびで あそぶ・こえで あそぶ ----------
  var modeBtns = Array.prototype.slice.call(document.querySelectorAll('.mode-btn'));
  var speedRow = document.getElementById('speedRow');
  var koeRow = document.getElementById('koeRow');
  function renderMode() {
    modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === rec.mode)); });
    speedRow.hidden = rec.mode === 'koe';
    koeRow.hidden = rec.mode !== 'koe';
    renderBest();
  }
  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      unlockAudio();
      rec.mode = b.dataset.mode === 'koe' ? 'koe' : 'yubi';
      save();
      renderMode();
    });
  });

  // ---------- せってい：こえ ----------
  var koeSpeedBtns = Array.prototype.slice.call(document.querySelectorAll('[data-koe-speed]'));
  var coolBtns = Array.prototype.slice.call(document.querySelectorAll('[data-cool]'));
  var thNote = document.getElementById('thNote');
  function renderKoeSettings() {
    koeSpeedBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.koeSpeed === rec.koeSpeed)); });
    var cool = koe ? koe.getCooldown() : koeConf.cooldown;
    coolBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.cool) === cool)); });
    var th = koe ? koe.getThreshold() : koeConf.threshold;
    thNote.textContent = 'はんのう する 声の 大きさ：' + Math.round(th * 100) + '（こえテストで、メーターを 見ながら かえられます）。' +
      'この 大きさと 待ち時間は、こえで あそぶ ほかの 教材とも 共通です。';
  }
  koeSpeedBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      rec.koeSpeed = b.dataset.koeSpeed;
      save();
      renderKoeSettings();
    });
  });
  coolBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var ms = Number(b.dataset.cool);
      koeConf.cooldown = ms;
      if (koe) koe.setCooldown(ms);
      if (KS) KS.saveSettings({ cooldown: ms });
      renderKoeSettings();
    });
  });
  document.getElementById('setTestBtn').addEventListener('click', function () {
    closeSettings();
    openTest();
  });

  // とちゅうで 新しい版への 自動の 再読み込みを しない
  window.kyozaiBusy = function () { return (mode === 'play' && G && !G.over) || !settings.hidden || !testEl.hidden; };

  // ---------- はじめ ----------
  renderSound();
  renderSpeed();
  renderMode();
  placeLines();
  renderBest();
  resize();
  startLoop();
})();
