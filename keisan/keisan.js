(function () {
  'use strict';

  var LEVEL_MAX = 6;
  var GOAL = 5;            // 1つの レベルで 5もん せいかい すると つぎが ひらく
  var STORE_KEY = 'keisan-progress';

  // ---------- 読み方（読み上げは かならず この ひらがなで） ----------
  var ONES = ['ぜろ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  function numRead(n) {
    if (n < 10) return ONES[n];
    if (n === 10) return 'じゅう';
    return 'じゅう' + ONES[n - 10];
  }
  // 「さん たす に は ご」（ans を わたさないと「さん たす に は？」）
  function exprRead(q, withAns) {
    return numRead(q.a) + ' ' + (q.op === '+' ? 'たす' : 'ひく') + ' ' + numRead(q.b) + ' は' +
      (withAns ? ' ' + numRead(q.answer) : '？');
  }

  // ---------- レベル ----------
  // nums：下に ならべる すうじ ボタン
  var LEVELS = [
    null,
    { desc: 'たしざん（こたえが 5まで）', nums: [1, 2, 3, 4, 5] },
    { desc: 'たしざん（こたえが 10まで）', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { desc: 'ひきざん（10までの かずから）', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { desc: 'たしざん と ひきざん（10まで）', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { desc: 'くりあがりの ある たしざん（9＋4 など）', nums: [10, 11, 12, 13, 14, 15, 16, 17, 18] },
    { desc: 'くりさがりの ある ひきざん（13−5 など）', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
  ];

  // ---------- きろく（この iPad の 中に ほぞん） ----------
  function emptyProgress() {
    return { unlocked: 1, stars: [0, 0, 0, 0, 0, 0, 0], level: 1 };
  }
  var progress = emptyProgress();
  var canSave = true;

  function loadProgress() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canSave = false; }
    if (!raw) return;
    try {
      var p = JSON.parse(raw);
      var u = Math.floor(Number(p.unlocked));
      if (u >= 1 && u <= LEVEL_MAX) progress.unlocked = u;
      var l = Math.floor(Number(p.level));
      if (l >= 1 && l <= LEVEL_MAX) progress.level = l;
      if (Array.isArray(p.stars)) {
        for (var i = 1; i <= LEVEL_MAX; i++) {
          var s = Math.floor(Number(p.stars[i]));
          progress.stars[i] = s >= 0 && s <= GOAL ? s : 0;
        }
      }
    } catch (e) {}
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
      canSave = true;
    } catch (e) { canSave = false; }
  }

  loadProgress();

  // ---------- 読み上げ（ほかの 教材と 同じ） ----------
  var notice = document.getElementById('notice');
  var speedBtn = document.getElementById('speedBtn');
  var synth = window.speechSynthesis;
  var jaVoice = null;
  var slow = false;

  try { slow = localStorage.getItem('keisan-slow') === '1'; } catch (e) {}
  speedBtn.setAttribute('aria-pressed', String(slow));

  function pickVoice() {
    if (!synth) return;
    var voices = synth.getVoices() || [];
    var ja = voices.filter(function (v) { return /^ja(-|_|$)/i.test(v.lang); });
    // 端末内の音声（オフラインで使える）を優先
    jaVoice = ja.filter(function (v) { return v.localService; })[0] || ja[0] || null;
  }

  if (synth) {
    pickVoice();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', pickVoice);
    } else {
      synth.onvoiceschanged = pickVoice;
    }
  } else {
    notice.textContent = 'この ブラウザでは よみあげが つかえません。';
    notice.hidden = false;
  }

  var current = null; // 読み上げ中の音声（途中で消えないように持っておく）

  function speak(text) {
    if (!synth) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = slow ? 0.6 : 0.9;
    u.pitch = 1;
    u.volume = 1;
    current = u;
    synth.cancel();
    synth.speak(u);
  }

  function stopSpeech() {
    if (synth) synth.cancel();
  }

  // ---------- 音（音のファイルは使わず、その場で作る） ----------
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

  // かねのような音を1つ
  function bell(t, freq, vol) {
    [[1, 1], [2, 0.15], [3, 0.04]].forEach(function (p) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * p[1], t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2 / p[0] + 0.3);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.6);
    });
  }

  function playNotes(notes) {
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      var play = function () {
        var t = ctx.currentTime + 0.03;
        notes.forEach(function (n) { bell(t + n[0], n[1], n[2]); });
      };
      if (ctx.state !== 'running' && ctx.resume) {
        ctx.resume().then(play, play);
      } else {
        play();
      }
    } catch (e) {}
  }

  // せいかいの 音は 共通の部品（shared/mondai.js）で 鳴らす
  // レベルアップ：ド・ミ・ソ・ド を やさしく
  function levelUpSound() {
    playNotes([[0, 523, 0.13], [0.18, 659, 0.13], [0.36, 784, 0.13], [0.6, 1047, 0.12]]);
  }

  // ---------- べんりな もの ----------
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function starSvg(on) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" ' +
      (on ? 'fill="#f2bd3f" stroke="#c38f22"' : 'fill="none" stroke="#cfc6b4"') +
      ' stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }
  var LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  // ---------- もんだい を つくる ----------
  function makeAdd(maxSum, minSum) {
    var a, b;
    do {
      a = randInt(1, maxSum - 1);
      b = randInt(1, maxSum - a);
    } while (a + b < minSum);
    return { op: '+', a: a, b: b, answer: a + b };
  }
  function makeSub(maxA) {
    var a = randInt(2, maxA);
    var b = randInt(1, a - 1);
    return { op: '-', a: a, b: b, answer: a - b };
  }

  function makeQuestion(lv) {
    var q;
    if (lv === 1) q = makeAdd(5, 2);
    // こたえが 5より 大きい もんだいを 多めに
    else if (lv === 2) q = makeAdd(10, Math.random() < 0.7 ? 6 : 2);
    else if (lv === 3) q = makeSub(10);
    else if (lv === 4) q = Math.random() < 0.5 ? makeAdd(10, 3) : makeSub(10);
    else if (lv === 5) {
      // くりあがり：a + b が 11〜18
      var a, b;
      do { a = randInt(2, 9); b = randInt(2, 9); } while (a + b < 11);
      q = { op: '+', a: a, b: b, answer: a + b, ten: true };
    } else {
      // くりさがり：11〜18 − 2〜9 で、一の位から ひけない もの
      var x, y;
      do { x = randInt(11, 18); y = randInt(2, 9); } while (y <= x - 10);
      q = { op: '-', a: x, b: y, answer: x - y, ten: true };
    }
    q.key = q.a + q.op + q.b;
    q.lv = lv;   // まちがえた もんだいを もういちど するときも、その レベルの ボタンで
    return q;
  }

  // ---------- ブロックの ならべかた ----------
  // それぞれの もの に、うごく まえ（0）と うごいた あと（1）の ばしょを きめる。
  // ばしょは ブロック 1こ分（--u）を 1 と した 数で あらわす。
  //   blk：{ color:'a'|'b', p:[{x,y,taken}, {x,y,taken}], delay, order }
  //   lbl：{ text, cls, p:[{x,y,o}, {x,y,o}] }（x は まんなか）
  //   frame：{ x, y }
  function layout(q, lv) {
    var L = { W: 0, H: 0, blks: [], lbls: [], frames: [] };
    var i, j;

    if (!q.ten && q.op === '+') {
      // 2つの かたまりが くっついて 1つに なる
      var a = q.a, b = q.b, GAP = 1.6;
      L.W = lv === 1 ? 7.4 : 13; L.H = 2.2;   // レベル1は かずが 少ないので 大きく
      var o0 = (L.W - (a + b + GAP)) / 2, o1 = (L.W - (a + b)) / 2;
      for (i = 0; i < a; i++) {
        L.blks.push({ color: 'a', p: [{ x: o0 + i, y: 0 }, { x: o1 + i, y: 0 }], order: i });
      }
      for (j = 0; j < b; j++) {
        L.blks.push({ color: 'b', p: [{ x: o0 + a + GAP + j, y: 0 }, { x: o1 + a + j, y: 0 }], order: a + j });
      }
      L.lbls.push({ text: a, cls: 'is-a', p: [{ x: o0 + a / 2, y: 1.1, o: 1 }, { x: o1 + a / 2, y: 1.1, o: 1 }] });
      L.lbls.push({ text: b, cls: 'is-b', p: [{ x: o0 + a + GAP + b / 2, y: 1.1, o: 1 }, { x: o1 + a + b / 2, y: 1.1, o: 1 }] });
      L.lbls.push({ text: '＋', cls: '', p: [{ x: o0 + a + GAP / 2, y: 0, o: 1 }, { x: o1 + a, y: 0, o: 0 }] });
    } else if (!q.ten) {
      // とる ブロックが 横に はずれていく
      var n = q.a, t = q.b, SH = 1.6;
      L.W = 13.4; L.H = 2.2;
      var o = (L.W - (n + SH)) / 2;
      for (i = 0; i < n; i++) {
        var take = i >= n - t;
        L.blks.push({
          color: 'a',
          p: [{ x: o + i, y: 0 }, { x: o + i + (take ? SH : 0), y: 0, taken: take }],
          delay: take ? (i - (n - t)) * 0.15 : 0,
          order: take ? -1 : i
        });
      }
      L.lbls.push({ text: n, cls: 'is-a', p: [{ x: o + n / 2, y: 1.1, o: 1 }, { x: o + n / 2, y: 1.1, o: 0 }] });
      L.lbls.push({ text: 'とる ' + t, cls: 'is-taken', p: [{ x: o + n - t / 2, y: 1.1, o: 0 }, { x: o + n - t / 2 + SH, y: 1.1, o: 1 }] });
    } else {
      // 10の まとまり（わく）で 見せる
      var FX = 0.3, FY = 0.3, BX = FX + 6;   // わく A と わく B の 左はし
      var cell = function (fx, k) { return { x: fx + (k % 5), y: FY + Math.floor(k / 5) }; };
      var LY = FY + 2.35;
      L.frames.push({ x: FX, y: FY }, { x: BX, y: FY });
      L.W = BX + 5 + 0.3;

      if (q.op === '+') {
        // くりあがり：b から (10 − a) こ うつして 10を つくる
        var A = q.a, B = q.b, k = 10 - A;
        L.H = LY + 1.1;
        for (i = 0; i < A; i++) {
          var c = cell(FX, i);
          L.blks.push({ color: 'a', p: [c, c], order: i });
        }
        for (j = 0; j < B; j++) {
          var from = cell(BX, j);
          var move = j >= B - k;
          var idx = A + (j - (B - k));   // うつる さきの ます
          L.blks.push({
            color: 'b',
            p: [from, move ? cell(FX, idx) : from],
            delay: move ? (j - (B - k)) * 0.35 : 0,
            order: move ? idx : 100 + j
          });
        }
        var mid = FX + 2.5, midB = BX + 2.5;
        L.lbls.push({ text: A, cls: 'is-a', p: [{ x: mid, y: LY, o: 1 }, { x: mid, y: LY, o: 0 }] });
        L.lbls.push({ text: 10, cls: 'is-ten', p: [{ x: mid, y: LY, o: 0 }, { x: mid, y: LY, o: 1 }] });
        L.lbls.push({ text: B, cls: 'is-b', p: [{ x: midB, y: LY, o: 1 }, { x: midB, y: LY, o: 0 }] });
        L.lbls.push({ text: B - k, cls: 'is-b', p: [{ x: midB, y: LY, o: 0 }, { x: midB, y: LY, o: 1 }] });
        L.lbls.push({ text: '＋', cls: '', p: [{ x: FX + 5.5, y: FY + 0.5, o: 1 }, { x: FX + 5.5, y: FY + 0.5, o: 0 }] });
      } else {
        // くりさがり：10の まとまりから b こ とる
        var r = q.a - 10, T = q.b;
        var TY = LY + 1.2;               // とった ブロックが ならぶ だん
        L.H = TY + 1.1;
        L.W = Math.max(L.W, FX + 0.4 + T + 2.6);
        for (i = 0; i < 10; i++) {
          var cc = cell(FX, i);
          var tk = i >= 10 - T;
          var ti = 9 - i;                // とった じゅんばん（うしろから）
          L.blks.push({
            color: 'a',
            p: [cc, tk ? { x: FX + 0.4 + (T - 1 - ti), y: TY, taken: true } : cc],
            delay: tk ? ti * 0.25 : 0,
            order: tk ? -1 : i
          });
        }
        for (j = 0; j < r; j++) {
          var cb = cell(BX, j);
          L.blks.push({ color: 'a', p: [cb, cb], order: 100 + j });
        }
        var m = FX + 2.5;
        L.lbls.push({ text: 10, cls: 'is-ten', p: [{ x: m, y: LY, o: 1 }, { x: m, y: LY, o: 0 }] });
        L.lbls.push({ text: 10 - T, cls: 'is-a', p: [{ x: m, y: LY, o: 0 }, { x: m, y: LY, o: 1 }] });
        L.lbls.push({ text: r, cls: 'is-a', p: [{ x: BX + 2.5, y: LY, o: 1 }, { x: BX + 2.5, y: LY, o: 1 }] });
        L.lbls.push({ text: 'とる ' + T, cls: 'is-taken', p: [{ x: FX + 0.4 + T + 1.1, y: TY, o: 0 }, { x: FX + 0.4 + T + 1.1, y: TY, o: 1 }] });
      }
    }
    return L;
  }

  // ---------- がめん ----------
  var levelsBox = document.getElementById('levels');
  var starsBox = document.getElementById('stars');
  var toolbarEnd = document.getElementById('toolbarEnd');
  var exprBtn = document.getElementById('expr');
  var replayBtn = document.getElementById('replayBtn');
  var hintBtn = document.getElementById('hintBtn');
  var scene = document.getElementById('scene');
  var blocksBox = document.getElementById('blocks');
  var side = document.getElementById('side');
  var result = document.getElementById('result');

  var q = null;
  var lay = null;
  var blkEls = [];
  var lblEls = [];
  var phase = 0;
  var solved = false;
  var playTimer = 0;
  var sayTimer = 0;
  var luTimer = 0;
  var hintTimer = 0;
  var counting = false;
  var quiz = null;      // せいかいの あとの 自動で つぎへ・10もんで 一区切り（shared/mondai.js）
  var sayNext = false;  // つぎの もんだいを 出したら 式を 読み上げる

  function durSec() { return slow ? 1.3 : 0.8; }
  function stagger() { return slow ? 1.5 : 1; }

  function renderLevels() {
    var html = '<span class="levels-label" aria-hidden="true">レベル</span>';
    for (var i = 1; i <= LEVEL_MAX; i++) {
      var open = i <= progress.unlocked;
      var on = i === progress.level;
      html += '<button type="button" class="lv-btn' + (on ? ' is-on' : '') + (open ? '' : ' is-locked') +
        '" data-lv="' + i + '" aria-pressed="' + on + '"' + (open || on ? '' : ' disabled') +
        ' aria-label="レベル' + i + (open ? '' : '（まだ ひらいていない）') + '">' +
        (open || on ? i : LOCK_SVG) + '</button>';
    }
    levelsBox.innerHTML = html;
  }

  function renderStars(pop) {
    var n = progress.stars[progress.level];
    var html = '';
    for (var i = 0; i < GOAL; i++) {
      html += '<span class="star' + (i < n ? ' is-on' : '') + (pop && i === n - 1 ? ' is-pop' : '') + '">' +
        starSvg(i < n) + '</span>';
    }
    starsBox.innerHTML = html;
    starsBox.setAttribute('aria-label', 'ほし ' + n + 'こ（' + GOAL + 'こで レベルアップ）');
  }

  function setResult(text, cls) {
    result.className = 'stage-text' + (cls ? ' ' + cls : '');
    result.textContent = text;
  }

  function renderExpr() {
    var opText = q.op === '+' ? '＋' : '−';
    exprBtn.className = 'expr' + (q.op === '-' ? ' is-sub' : '');
    exprBtn.innerHTML =
      '<span class="n-a">' + q.a + '</span><span class="op">' + opText + '</span>' +
      '<span class="n-b">' + q.b + '</span><span class="op">＝</span>' +
      '<span class="ans' + (solved ? ' is-ok' : '') + '">' + (solved ? q.answer : '？') + '</span>';
    exprBtn.setAttribute('aria-label', exprRead(q, solved) + '（タップで よむ）');
  }

  function renderNums() {
    var list = LEVELS[q.lv].nums;
    side.innerHTML = '<div class="nums is-' + list.length + '" role="group" aria-label="こたえの すうじ">' +
      list.map(function (n) {
        return '<button type="button" class="num" data-v="' + n + '" aria-label="' + numRead(n) + '">' + n + '</button>';
      }).join('') + '</div>';
  }

  // --- ブロック ---
  function u(v) { return 'calc(var(--u) * ' + (Math.round(v * 1000) / 1000) + ')'; }

  function renderBlocks() {
    lay = layout(q, q.lv);
    var html = '';
    lay.frames.forEach(function (f) {
      var cells = '';
      for (var k = 0; k < 10; k++) cells += '<span></span>';
      html += '<div class="frame" style="transform:translate(' + u(f.x) + ',' + u(f.y) + ')">' + cells + '</div>';
    });
    lay.blks.forEach(function (b) {
      html += '<div class="blk' + (b.color === 'b' ? ' c-b' : '') + '"></div>';
    });
    lay.lbls.forEach(function (l) {
      html += '<div class="lbl ' + l.cls + '">' + l.text + '</div>';
    });
    blocksBox.innerHTML = html;
    blkEls = Array.prototype.slice.call(blocksBox.querySelectorAll('.blk'));
    lblEls = Array.prototype.slice.call(blocksBox.querySelectorAll('.lbl'));
    fitBlocks();
    setPhase(0, false);
  }

  // ブロックの 大きさを ばしょに あわせる
  function fitBlocks() {
    if (!lay) return;
    var w = scene.clientWidth, h = scene.clientHeight;
    if (!w || !h) return;
    var size = Math.min(w / lay.W, h / lay.H, 84);
    size = Math.max(18, Math.floor(size));
    blocksBox.style.setProperty('--u', size + 'px');
    blocksBox.style.width = Math.ceil(size * lay.W) + 'px';
    blocksBox.style.height = Math.ceil(size * lay.H) + 'px';
  }

  function setPhase(p, animate) {
    phase = p;
    if (!animate) blocksBox.classList.add('no-anim');
    blocksBox.style.setProperty('--dur', durSec() + 's');
    lay.blks.forEach(function (b, i) {
      var el = blkEls[i];
      var pos = b.p[p];
      var tr = 'translate(' + u(pos.x) + ',' + u(pos.y) + ')';
      el.style.transitionDelay = animate && b.delay ? (b.delay * stagger()) + 's' : '0s';
      el.style.setProperty('--pos', tr);
      el.style.transform = tr;
      el.classList.toggle('is-taken', !!pos.taken);
      el.classList.remove('is-counted', 'is-now');
      el.textContent = '';
    });
    lay.lbls.forEach(function (l, i) {
      var el = lblEls[i];
      var pos = l.p[p];
      // とる・10 の すうじは、ブロックが うごき おわる ころに 出す
      el.style.transitionDelay = animate && pos.o ? (durSec() * 0.6 + maxDelay() * stagger()) + 's' : '0s';
      el.style.transform = 'translate(calc(' + u(pos.x) + ' - 50%),' + u(pos.y) + ')';
      el.style.opacity = pos.o;
    });
    if (!animate) {
      void blocksBox.offsetWidth;
      blocksBox.classList.remove('no-anim');
    }
  }

  function maxDelay() {
    var m = 0;
    lay.blks.forEach(function (b) { if (b.delay > m) m = b.delay; });
    return m;
  }

  // うごかす（はじめの ばしょに もどしてから）
  function playMotion(wait) {
    clearTimeout(playTimer);
    stopCount();
    setPhase(0, false);
    playTimer = setTimeout(function () { setPhase(1, true); }, wait);
  }

  // うごいた あとの ばしょに すぐ する
  function showDone() {
    clearTimeout(playTimer);
    if (phase !== 1) setPhase(1, false);
  }

  // --- ヒント：ブロックを 1つずつ かぞえる ---
  function stopCount() {
    clearTimeout(hintTimer);
    counting = false;
    hintBtn.classList.remove('is-on');
  }

  function startCount() {
    stopCount();
    clearTimeout(sayTimer);
    showDone();
    blkEls.forEach(function (el) { el.classList.remove('is-counted', 'is-now'); el.textContent = ''; });
    var list = [];
    lay.blks.forEach(function (b, i) { if (b.order >= 0) list.push({ i: i, o: b.order }); });
    list.sort(function (x, y) { return x.o - y.o; });
    counting = true;
    hintBtn.classList.add('is-on');
    var n = 0;
    var step = function () {
      if (n >= list.length) { stopCount(); return; }
      var el = blkEls[list[n].i];
      n += 1;
      el.textContent = n;
      el.classList.add('is-counted');
      el.classList.remove('is-now');
      void el.offsetWidth;
      el.classList.add('is-now');
      speak(numRead(n));
      hintTimer = setTimeout(step, slow ? 1150 : 750);
    };
    // 動きの とちゅう から かぞえ はじめない よう、少し まつ
    hintTimer = setTimeout(step, 250);
  }

  // あたらしい もんだい（まえと 同じ もんだいには しない）
  function makeNext() {
    var prev = q ? q.key : '';
    var guard = 0;
    var nq;
    do { nq = makeQuestion(progress.level); } while (nq.key === prev && guard++ < 20);
    return nq;
  }

  function showQuestion(nq) {
    var say = sayNext;
    sayNext = true;
    q = nq;
    solved = false;
    clearTimeout(sayTimer);
    clearTimeout(luTimer);
    stopCount();
    stopSpeech();
    setResult('');
    renderExpr();
    renderNums();
    renderBlocks();
    playMotion(slow ? 1400 : 1000);
    if (say) speak(exprRead(q, false));
  }

  // ---------- こたえあわせ ----------
  function check(value, el) {
    if (solved) return;
    stopCount();
    if (value === q.answer) {
      solved = true;
      el.classList.add('is-ok');
      setResult('せいかい', 'is-ok');
      renderExpr();
      if (phase !== 1) { clearTimeout(playTimer); setPhase(1, true); }
      quiz.correct(el);
      var up = addStar();
      // レベルアップの ときは、自動で すすまずに レベルアップの 画面を 出す
      if (up) quiz.hold(true);
      clearTimeout(sayTimer);
      // 音と重ならないように、少しあとで読み上げる
      sayTimer = setTimeout(function () {
        speak('せいかい。 ' + exprRead(q, true));
        if (up) {
          clearTimeout(luTimer);
          luTimer = setTimeout(function () { showLevelUp(up); }, slow ? 4200 : 3000);
        }
      }, 500);
    } else {
      el.classList.remove('is-ng');
      // 同じ ボタンを もう一度 おしても 動きが わかるように、いったん外してから つける
      void el.offsetWidth;
      el.classList.add('is-ng');
      setResult('もういちど', 'is-retry');
      quiz.wrong();
      speak('もういちど');
      // ブロックの うごきを もう一度 見せる
      playMotion(slow ? 1100 : 800);
    }
  }

  // ほしを 1つ ふやす。5つ たまったら レベルアップ（つぎの レベルの ばんごう）を かえす
  function addStar() {
    var lv = progress.level;
    if (progress.stars[lv] >= GOAL) return 0;
    progress.stars[lv] += 1;
    var up = 0;
    if (progress.stars[lv] >= GOAL) {
      up = lv < LEVEL_MAX ? lv + 1 : -1;  // -1：ぜんぶ クリア
      if (lv < LEVEL_MAX && progress.unlocked < lv + 1) progress.unlocked = lv + 1;
    }
    saveProgress();
    renderStars(true);
    renderLevels();
    return up;
  }

  side.addEventListener('click', function (e) {
    var b = e.target.closest('.num');
    if (!b) return;
    unlockAudio();
    check(Number(b.dataset.v), b);
  });

  exprBtn.addEventListener('click', function () {
    unlockAudio();
    stopCount();
    speak(exprRead(q, solved));
  });

  replayBtn.addEventListener('click', function () {
    unlockAudio();
    stopSpeech();
    playMotion(300);
  });
  scene.addEventListener('click', function () {
    unlockAudio();
    if (counting) return;
    stopSpeech();
    playMotion(300);
  });

  hintBtn.addEventListener('click', function () {
    unlockAudio();
    if (counting) { stopCount(); stopSpeech(); return; }
    startCount();
  });

  levelsBox.addEventListener('click', function (e) {
    var b = e.target.closest('.lv-btn');
    if (!b || b.disabled) return;
    unlockAudio();
    setLevel(Number(b.dataset.lv), true);
  });

  // レベルを えらびなおしたら、あたらしい 10もんに する
  function setLevel(n, say) {
    progress.level = n;
    saveProgress();
    renderLevels();
    renderStars(false);
    q = null;
    sayNext = say;
    quiz.start();
  }

  speedBtn.addEventListener('click', function () {
    slow = !slow;
    speedBtn.setAttribute('aria-pressed', String(slow));
    try { localStorage.setItem('keisan-slow', slow ? '1' : '0'); } catch (e) {}
  });

  // すうじは キーボードからも 入れられる（1〜9。10より 上は ボタンで）
  document.addEventListener('keydown', function (e) {
    if (!settings.hidden || !levelup.hidden) return;
    if (quiz.waiting() || quiz.finished()) return;
    if (!/^[0-9]$/.test(e.key)) return;
    var b = side.querySelector('.num[data-v="' + e.key + '"]');
    if (b) { unlockAudio(); check(Number(e.key), b); }
  });

  if (window.ResizeObserver) {
    new ResizeObserver(fitBlocks).observe(scene);
  } else {
    window.addEventListener('resize', fitBlocks);
  }

  // ---------- レベルアップ ----------
  var levelup = document.getElementById('levelup');
  var luStars = document.getElementById('luStars');
  var luTitle = document.getElementById('luTitle');
  var luText = document.getElementById('luText');
  var luGo = document.getElementById('luGo');
  var luStay = document.getElementById('luStay');
  var luNext = 0;

  function showLevelUp(next) {
    luNext = next;
    quiz.hold();
    var html = '';
    for (var i = 0; i < GOAL; i++) html += '<span class="star is-on">' + starSvg(true) + '</span>';
    luStars.innerHTML = html;
    if (next > 0) {
      luTitle.textContent = 'レベルアップ！';
      luText.textContent = 'レベル' + next + 'が ひらいたよ';
      luGo.textContent = 'レベル' + next + 'へ すすむ';
      luStay.hidden = false;
      speak('レベルアップ！ レベル' + numRead(next) + 'が ひらいたよ');
    } else {
      luTitle.textContent = 'ぜんぶ クリア！';
      luText.textContent = 'ぜんぶの レベルが できたね';
      luGo.textContent = 'とじる';
      luStay.hidden = true;
      speak('ぜんぶ クリア！ よく できました');
    }
    levelup.hidden = false;
    levelUpSound();
    luGo.focus({ preventScroll: true });
  }

  function closeLevelUp() {
    levelup.hidden = true;
  }

  // レベルアップ しても、10もんの とちゅうなら そのまま つづける
  luGo.addEventListener('click', function () {
    unlockAudio();
    closeLevelUp();
    if (luNext > 0) {
      progress.level = luNext;
      saveProgress();
      renderLevels();
      renderStars(false);
    }
    quiz.next();
  });
  luStay.addEventListener('click', function () {
    unlockAudio();
    closeLevelUp();
    quiz.next();
  });

  // ---------- せってい（ながおしで ひらく） ----------
  var gearBtn = document.getElementById('gearBtn');
  var gearHint = document.getElementById('gearHint');
  var settings = document.getElementById('settings');
  var closeBtn = document.getElementById('closeBtn');
  var setLevels = document.getElementById('setLevels');
  var recNote = document.getElementById('recNote');
  var resetBtn = document.getElementById('resetBtn');
  var resetStatus = document.getElementById('resetStatus');
  var saveWarn = document.getElementById('saveWarn');
  var HOLD_MS = 1000;
  var holdTimer = 0;
  var hintShowTimer = 0;
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
      // みじかく おしたときは、そっと ヒントだけ出す
      gearHint.hidden = false;
      clearTimeout(hintShowTimer);
      hintShowTimer = setTimeout(function () { gearHint.hidden = true; }, 1800);
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
  // キーボードでは、Enter かスペースを ながおし
  gearBtn.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  gearBtn.addEventListener('keyup', function (e) {
    if (e.key === 'Enter' || e.key === ' ') endHold();
  });

  function renderSettings() {
    var html = '';
    for (var i = 1; i <= LEVEL_MAX; i++) {
      var open = i <= progress.unlocked;
      var stars = '';
      for (var s = 0; s < GOAL; s++) stars += starSvg(s < progress.stars[i]);
      html += '<button type="button" class="set-lv' + (i === progress.level ? ' is-on' : '') +
        '" data-lv="' + i + '" aria-pressed="' + (i === progress.level) + '">' +
        '<span class="set-lv-num">レベル' + i + '</span>' +
        '<span class="set-lv-desc">' + LEVELS[i].desc + '</span>' +
        '<span class="set-lv-stars" role="img" aria-label="ほし ' + progress.stars[i] + 'こ">' + stars + '</span>' +
        '<span class="set-lv-state">' + (open ? 'ひらいている' : 'まだ') + '</span>' +
        '</button>';
    }
    setLevels.innerHTML = html;
    recNote.textContent = 'いま ひらいている レベル：' +
      (progress.unlocked === 1 ? 'レベル1' : 'レベル1〜' + progress.unlocked) +
      '。リセットすると、ひらいた レベルと ほしが ぜんぶ きえて、レベル1から になります。';
    saveWarn.hidden = canSave;
  }

  var armTimer = 0;
  function disarmReset() {
    clearTimeout(armTimer);
    resetBtn.classList.remove('is-armed');
    resetBtn.textContent = 'きろくを リセット';
  }

  var resumeAfter = false;   // せっていを とじたら つぎの もんだいへ

  // せいかいの あと、つぎの もんだいまで まつ じかん（共通の せってい）
  var waitSection = Mondai.settingsSection('set-sec');
  document.getElementById('waitSetting').appendChild(waitSection);

  function openSettings() {
    stopCount();
    stopSpeech();
    resumeAfter = false;
    if (quiz.waiting()) {
      quiz.hold();
      resumeAfter = true;
    }
    waitSection.mondaiRender();
    disarmReset();
    resetStatus.textContent = '';
    renderSettings();
    settings.hidden = false;
    settings.scrollTop = 0;
    document.body.classList.add('is-settings');
    closeBtn.focus({ preventScroll: true });
  }

  function closeSettings() {
    if (settings.hidden) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    disarmReset();
    settings.hidden = true;
    document.body.classList.remove('is-settings');
    window.scrollTo(0, 0);
    gearBtn.focus({ preventScroll: true });
    fitBlocks();
    if (resumeAfter) { resumeAfter = false; quiz.next(); }
  }

  closeBtn.addEventListener('click', closeSettings);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSettings();
  });

  setLevels.addEventListener('click', function (e) {
    var b = e.target.closest('.set-lv');
    if (!b) return;
    unlockAudio();
    resumeAfter = false;
    closeSettings();
    setLevel(Number(b.dataset.lv), false);
  });

  // まちがえて けさないように、2回 おしたときだけ けす
  resetBtn.addEventListener('click', function () {
    if (!resetBtn.classList.contains('is-armed')) {
      resetBtn.classList.add('is-armed');
      resetBtn.textContent = 'もういちど おすと けします';
      clearTimeout(armTimer);
      armTimer = setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    progress = emptyProgress();
    saveProgress();
    renderLevels();
    renderStars(false);
    renderSettings();
    q = null;
    resumeAfter = false;
    sayNext = false;
    quiz.start();
    resetStatus.textContent = 'きろくを けしました';
  });

  // とちゅうで 新しい版への 自動の 再読み込みを しない
  window.kyozaiBusy = function () {
    return !settings.hidden || !levelup.hidden || counting || quiz.busy();
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { stopCount(); stopSpeech(); }
  });

  // ---------- はじめ ----------
  quiz = Mondai.create({
    area: document.getElementById('play'),
    countIn: toolbarEnd,
    total: 10,
    make: makeNext,
    show: showQuestion,
    speak: function (t) { speak(t); }
  });
  renderLevels();
  renderStars(false);
  quiz.start();
})();
