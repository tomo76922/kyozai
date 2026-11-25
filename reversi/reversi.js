// リバーシ
(function () {
  'use strict';

  var AI = window.ReversiAI;
  var NAMES = { 1: 'くろ', 2: 'しろ' };

  // ---------- ほぞん（この iPad の中だけ。せっていだけで、記録は 残さない） ----------
  var STORE_KEY = 'reversi-v1';
  var rec = { players: 1, size: 6, level: 'easy', first: 'me', sound: true };
  (function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!d) return;
      if (d.players === 2) rec.players = 2;
      if (d.size === 8) rec.size = 8;
      if (d.level === 'normal' || d.level === 'strong') rec.level = d.level;
      if (d.first === 'cpu') rec.first = 'cpu';
      rec.sound = d.sound !== false;
    } catch (e) {}
  })();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(rec)); } catch (e) {}
  }

  // ---------- 音（音の ファイルは使わず、その場で作る） ----------
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
  function tone(t, freq, vol, len, type, toFreq) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + len + 0.05);
  }
  function bell(t, freq, vol) {
    tone(t, freq, vol, 1.0);
    tone(t, freq * 2, vol * 0.15, 0.5);
  }
  function play(fn) {
    if (!rec.sound || !AC) return;
    try {
      if (!ctx) ctx = new AC();
      var go = function () { fn(ctx.currentTime + 0.01); };
      if (ctx.state !== 'running' && ctx.resume) ctx.resume().then(go, go);
      else go();
    } catch (e) {}
  }
  // おく：ぱちっ
  function sPlace() {
    play(function (t) {
      tone(t, 260, 0.24, 0.1, 'triangle');
      tone(t, 1500, 0.05, 0.03, 'square');
    });
  }
  // ひっくりかえる：くるっ（だんだん 高く）
  function sFlip(k, delay) {
    play(function (t) { tone(t + delay, 620 + k * 70, 0.06, 0.09, 'triangle', 900 + k * 70); });
  }
  function sNo() { play(function (t) { tone(t, 200, 0.08, 0.25, 'sine'); }); }
  function sUndo() { play(function (t) { tone(t, 420, 0.07, 0.18, 'triangle', 760); }); }
  function sHint() { play(function (t) { bell(t, 1047, 0.07); bell(t + 0.12, 1319, 0.06); }); }
  function sPass() { play(function (t) { bell(t, 659, 0.08); bell(t + 0.2, 523, 0.08); }); }
  function sTick(k) { play(function (t) { tone(t, 480 + Math.min(k, 40) * 14, 0.05, 0.06, 'sine'); }); }
  function sWin() { play(function (t) { [523, 659, 784, 1047].forEach(function (f, i) { bell(t + i * 0.16, f, 0.12); }); }); }
  function sLose() { play(function (t) { bell(t, 523, 0.08); bell(t + 0.25, 440, 0.07); }); }
  function sDraw() { play(function (t) { bell(t, 587, 0.08); bell(t + 0.22, 587, 0.07); }); }

  // ---------- べんりな もの ----------
  function $(id) { return document.getElementById(id); }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pieceSvg(p) {
    if (p === 3) {   // ひきわけ：はんぶんずつ
      return '<svg viewBox="0 0 64 64"><path d="M32 4a28 28 0 0 0 0 56z" fill="#34312d"/><path d="M32 4a28 28 0 0 1 0 56z" fill="#fbf9f3"/>' +
        '<circle cx="32" cy="32" r="28" fill="none" stroke="#3d3a35" stroke-width="4"/></svg>';
    }
    return '<svg viewBox="0 0 64 64"><g class="p' + p + '"><circle class="dc" cx="32" cy="32" r="28" style="stroke-width:4"/>' +
      '<circle class="dc-in" cx="32" cy="32" r="19"/></g></svg>';
  }

  // ---------- ばんの 大きさ（SVG の 中の 長さ） ----------
  var CELL = 100, PAD = 22, R = 40;
  var N = 8, VB = 0;
  function cx(i) { return PAD + CELL / 2 + (i % N) * CELL; }
  function cy(i) { return PAD + CELL / 2 + ((i / N) | 0) * CELL; }

  var board = $('board');
  var layers = {};
  function buildBoard(n) {
    N = n;
    VB = PAD * 2 + CELL * N;
    board.innerHTML = '';
    board.setAttribute('viewBox', '0 0 ' + VB + ' ' + VB);
    board.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el('rect', { class: 'frame', x: 0, y: 0, width: VB, height: VB, rx: 24 }, board);
    el('rect', { class: 'felt', x: PAD, y: PAD, width: CELL * N, height: CELL * N }, board);
    var d = '', k;
    for (k = 0; k <= N; k++) {
      d += 'M' + (PAD + k * CELL) + ' ' + PAD + 'V' + (PAD + N * CELL);
      d += 'M' + PAD + ' ' + (PAD + k * CELL) + 'H' + (PAD + N * CELL);
    }
    el('path', { class: 'grid-line', d: d }, board);
    // 目じるしの 点（8×8 は 4つ）
    if (N === 8) {
      [2, 6].forEach(function (a) {
        [2, 6].forEach(function (z) { el('circle', { class: 'grid-dot', cx: PAD + a * CELL, cy: PAD + z * CELL, r: 8 }, board); });
      });
    }
    layers.can = el('g', { 'pointer-events': 'none' }, board);
    layers.pieces = el('g', { 'pointer-events': 'none' }, board);
    layers.hint = el('g', { class: 'hint-layer' }, board);
    var hits = el('g', {}, board);
    for (var i = 0; i < N * N; i++) {
      var hit = el('rect', {
        class: 'cell-hit', x: PAD + (i % N) * CELL, y: PAD + ((i / N) | 0) * CELL, width: CELL, height: CELL
      }, hits);
      hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', (((i / N) | 0) + 1) + 'だんめ ' + ((i % N) + 1) + 'れつめ');
      bindCell(hit, i);
    }
    layers.press = el('g', { 'pointer-events': 'none' }, board);
  }
  function bindCell(hit, i) {
    var press = null;
    var clear = function () { if (press) { press.remove(); press = null; } };
    hit.addEventListener('pointerdown', function () {
      clear();
      if (canHumanMove() && G.legal[i]) press = el('circle', { class: 'can-press', cx: cx(i), cy: cy(i), r: 44 }, layers.press);
    });
    hit.addEventListener('pointerup', clear);
    hit.addEventListener('pointercancel', clear);
    hit.addEventListener('pointerleave', clear);
    hit.addEventListener('click', function () { clear(); onCell(i); });
  }

  // ---------- がめんの ぶひん ----------
  var startEl = $('start'), playEl = $('play'), quitEl = $('quitEl');
  var turnEl = $('turn'), turnPiece = $('turnPiece'), turnText = $('turnText');
  var msgEl = $('msg'), undoBtn = $('undoBtn'), hintBtn = $('hintBtn');
  var endBtns = $('endBtns'), tallyEl = $('tally');
  var passEl = $('passEl'), passSub = $('passSub');
  var num = { 1: $('num1'), 2: $('num2') }, scoreBox = { 1: $('score1'), 2: $('score2') };
  var fx = $('fx');

  // ---------- あそびの じょうたい ----------
  var G = null;
  var tally = null;     // かった かず（はじめの がめんに もどるまで）
  var pieceEls = {};

  function newGame() {
    if (G) G.token++;
    var human = rec.players === 1 && rec.first === 'cpu' ? 2 : 1;
    G = {
      players: rec.players, level: rec.level, n: rec.size, human: human, cpu: 3 - human,
      b: AI.initial(rec.size), turn: 1, hist: [], last: -1, legal: {},
      over: false, winner: 0, counted: false, counting: false,
      anim: false, thinking: false, passing: false, token: 1, hint: null
    };
    buildBoard(G.n);
    drawAll();
    board.classList.remove('is-end');
    hidePass();
    var key = G.players + ':' + G.n;
    if (!tally || tally.key !== key) tally = { key: key, w: { 0: 0, 1: 0, 2: 0 }, games: 0 };
    startEl.hidden = true;
    playEl.hidden = false;
    quitEl.hidden = true;
    document.body.classList.add('is-playing');
    setMsg(isHumanTurn() ? 'うすい まるの ところに おけるよ' : '');
    startTurn();
  }

  function isHumanTurn() { return G.players === 2 || G.turn === G.human; }
  function canHumanMove() {
    return !!(G && !G.over && !G.anim && !G.thinking && !G.passing && quitEl.hidden && isHumanTurn());
  }
  function setMsg(t) { msgEl.innerHTML = t ? nw(t) : ''; }

  // ばんの コマを ぜんぶ かきなおす（うごき なし）
  function drawAll() {
    layers.pieces.innerHTML = '';
    pieceEls = {};
    for (var i = 0; i < N * N; i++) if (G.b[i]) makePiece(i, G.b[i]);
    if (G.last >= 0 && pieceEls[G.last]) pieceEls[G.last].classList.add('is-last');
  }
  function makePiece(i, p) {
    var g = el('g', { class: 'piece p' + p, transform: 'translate(' + cx(i) + ' ' + cy(i) + ')' }, layers.pieces);
    el('circle', { class: 'shadow', cy: 5, r: R }, g);
    var disc = el('g', { class: 'disc' }, g);
    el('circle', { class: 'dc', r: R }, disc);
    el('circle', { class: 'dc-in', r: 27 }, disc);
    el('circle', { class: 'pc-last', r: 8 }, g);
    pieceEls[i] = g;
    return g;
  }
  function setColor(g, p) {
    g.classList.remove('p1', 'p2');
    g.classList.add('p' + p);
  }

  // ---------- ばんを さわる ----------
  function onCell(i) {
    if (!G || G.over || !quitEl.hidden) return;
    unlockAudio();
    if (G.anim || G.passing) return;
    if (G.thinking || !isHumanTurn()) { setMsg('コンピュータが かんがえて いるよ。まってね'); return; }
    if (G.b[i]) { setMsg('そこには もう コマが あるよ'); sNo(); return; }
    if (!G.legal[i]) { setMsg('そこには おけないよ。うすい まるの ところに おいてね'); sNo(); return; }
    doMove(i);
  }

  // ばんが はじまる / つぎの ひとの ばん
  function startTurn() {
    var ms = AI.legalMoves(G.b, N, G.turn);
    G.legal = {};
    if (ms.length) {
      ms.forEach(function (m) { G.legal[m.i] = m.flips.length; });
      render();
      if (G.players === 1 && G.turn === G.cpu) cpuTurn();
      return;
    }
    var other = 3 - G.turn;
    if (AI.legalMoves(G.b, N, other).length) {
      var p = G.turn;
      showPass(p, function () {
        G.turn = other;
        if (isHumanTurn()) setMsg('うすい まるの ところに おけるよ');
        startTurn();
      });
      return;
    }
    finish();
  }

  // ---------- コマを おく ----------
  function doMove(i) {
    var p = G.turn;
    var flips = AI.flipsAt(G.b, N, i, p);
    if (!flips.length) return;
    G.hist.push({ b: G.b.slice(), p: p, last: G.last });
    G.b[i] = p;
    flips.forEach(function (f) { G.b[f] = p; });
    G.legal = {};
    clearHint();
    Object.keys(pieceEls).forEach(function (k) { pieceEls[k].classList.remove('is-last'); });
    G.last = i;
    var g = makePiece(i, p);
    g.classList.add('is-last');
    G.anim = true;
    if (G.players === 1 && p === G.human) setMsg('');
    else if (G.players === 2) setMsg('');
    render();
    var tok = G.token;
    sPlace();
    var done = function () {
      if (!G || tok !== G.token) return;
      G.anim = false;
      if (G.players === 2 || (G.players === 1 && p === G.human)) {
        setMsg(flips.length + 'こ ひっくりかえったよ');
      }
      G.turn = 3 - p;
      startTurn();
    };
    if (reduceMotion) {
      flips.forEach(function (f) { if (pieceEls[f]) setColor(pieceEls[f], p); });
      setTimeout(done, 250);
      return;
    }
    placeAnim(g);
    // ちかい コマから じゅんばんに くるっと まわる
    var r0 = (i / N) | 0, c0 = i % N, end = 0;
    flips.forEach(function (f) {
      var dist = Math.max(Math.abs(((f / N) | 0) - r0), Math.abs((f % N) - c0));
      var delay = 170 + (dist - 1) * 110;
      end = Math.max(end, delay + FLIP_MS);
      sFlip(dist, (delay + FLIP_MS / 2) / 1000);
      if (pieceEls[f]) flipAnim(pieceEls[f], p, delay, tok);
    });
    setTimeout(done, end + 120);
  }

  function animate(ms, delay, step, tok) {
    var t0 = 0;
    function frame(now) {
      if (!G || tok !== G.token) return;
      if (!t0) t0 = now;
      var t = (now - t0 - delay) / ms;
      if (t < 0) { requestAnimationFrame(frame); return; }
      if (t >= 1) { step(1); return; }
      step(t);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  // おく：ぽんっと 出てくる
  function placeAnim(g) {
    var disc = g.querySelector('.disc'), sh = g.querySelector('.shadow');
    var tok = G.token;
    animate(180, 0, function (t) {
      var s = t < 0.7 ? 0.4 + (t / 0.7) * 0.72 : 1.12 - ((t - 0.7) / 0.3) * 0.12;
      if (t >= 1) s = 1;
      disc.setAttribute('transform', 'scale(' + s.toFixed(3) + ')');
      sh.setAttribute('transform', 'scale(' + s.toFixed(3) + ')');
    }, tok);
  }
  // ひっくりかえる：よこに ちぢんで、うらがえって、もどる（すこし うきあがる）
  var FLIP_MS = 380;
  function flipAnim(g, to, delay, tok) {
    var disc = g.querySelector('.disc'), sh = g.querySelector('.shadow');
    var switched = false;
    animate(FLIP_MS, delay, function (t) {
      if (t >= 0.5 && !switched) { switched = true; setColor(g, to); }
      var sx = Math.abs(Math.cos(Math.PI * t));
      var lift = Math.sin(Math.PI * t);
      if (t >= 1) { sx = 1; lift = 0; }
      var s = 1 + lift * 0.12;
      disc.setAttribute('transform', 'translate(0 ' + (-lift * 14).toFixed(1) + ') scale(' + (Math.max(sx, 0.04) * s).toFixed(3) + ' ' + s.toFixed(3) + ')');
      sh.setAttribute('transform', 'scale(' + (Math.max(sx, 0.04) * (1 - lift * 0.1)).toFixed(3) + ' ' + (1 - lift * 0.1).toFixed(3) + ')');
    }, tok);
  }

  // ---------- パス ----------
  function showPass(p, next) {
    G.passing = true;
    var o = 3 - p;
    var who;
    if (G.players === 1) who = p === G.human ? 'あなたは' : 'コンピュータは';
    else who = NAMES[p] + 'は';
    var nextWho = G.players === 1 ? (o === G.human ? 'あなたの ばん' : 'コンピュータの ばん') : NAMES[o] + 'の ばん';
    passSub.innerHTML = nw(who + ' おける ところが ないよ。') + '<br>' + nw(nextWho + 'に なるよ');
    setMsg(who + ' おける ところが ないので パス');
    passEl.hidden = false;
    sPass();
    render();
    var tok = G.token, gone = false;
    var go = function () {
      if (gone || !G || tok !== G.token) return;
      gone = true;
      hidePass();
      G.passing = false;
      next();
    };
    passEl.onclick = go;
    setTimeout(go, 2200);
  }
  function hidePass() {
    passEl.hidden = true;
    passEl.onclick = null;
  }

  // ---------- コンピュータの ばん ----------
  function cpuTurn() {
    G.thinking = true;
    render();
    var tok = G.token;
    var wait = G.level === 'strong' ? 300 : 650;
    setTimeout(function () {
      if (!G || tok !== G.token || G.over) return;
      var i = AI.bestMove(G.b, N, G.cpu, G.level);
      if (!G || tok !== G.token) return;
      G.thinking = false;
      if (i < 0) return;
      doMove(i);
    }, wait);
  }

  // ---------- おわり：かずを かぞえる ----------
  function finish() {
    G.over = true;
    G.legal = {};
    var k = AI.count(G.b);
    G.winner = k[1] > k[2] ? 1 : k[2] > k[1] ? 2 : 0;
    if (!G.counted) { tally.w[G.winner]++; tally.games++; G.counted = true; }
    G.counting = true;
    setMsg('くろと しろの かずを かぞえるよ');
    render();
    var lists = { 1: [], 2: [] };
    for (var i = 0; i < N * N; i++) if (G.b[i]) lists[G.b[i]].push(i);
    var steps = Math.max(lists[1].length, lists[2].length);
    var gap = reduceMotion ? 0 : Math.max(22, Math.min(90, 1800 / Math.max(steps, 1)));
    var tok = G.token;
    num[1].textContent = '0';
    num[2].textContent = '0';
    var s = 0;
    function step() {
      if (!G || tok !== G.token) return;
      if (reduceMotion) s = steps; else s++;
      [1, 2].forEach(function (p) {
        var shown = Math.min(s, lists[p].length);
        if (String(shown) !== num[p].textContent) {
          num[p].textContent = String(shown);
          if (!reduceMotion) {
            num[p].classList.remove('is-tick');
            void num[p].offsetWidth;
            num[p].classList.add('is-tick');
            var g = pieceEls[lists[p][shown - 1]];
            if (g) {
              g.classList.add('is-count');
              setTimeout(function () { g.classList.remove('is-count'); }, 260);
            }
          }
        }
      });
      if (!reduceMotion && s <= steps) sTick(s);
      if (s < steps) { setTimeout(step, gap); return; }
      setTimeout(function () { if (G && tok === G.token) showResult(k); }, reduceMotion ? 0 : 350);
    }
    setTimeout(step, reduceMotion ? 0 : 400);
  }

  function showResult(k) {
    G.counting = false;
    var w = G.winner;
    board.classList.add('is-end');
    Object.keys(pieceEls).forEach(function (i) {
      pieceEls[i].classList.toggle('is-loser', !!w && G.b[i] !== w);
    });
    var diff = Math.abs(k[1] - k[2]);
    var line = 'くろ ' + k[1] + ' ・ しろ ' + k[2];
    if (G.players === 1) {
      if (w === G.human) { sWin(); setMsg(line + '。' + diff + 'こ おおくて あなたの かち！'); }
      else if (w === G.cpu) { sLose(); setMsg(line + '。「まった」で もどして、もういちど かんがえて みよう'); }
      else { sDraw(); setMsg(line + '。おなじ かずだよ'); }
    } else {
      if (w) { sWin(); setMsg(line + '。' + NAMES[w] + 'が ' + diff + 'こ おおいよ'); }
      else { sDraw(); setMsg(line + '。おなじ かずだよ'); }
    }
    render();
    if (w && (G.players === 2 || w === G.human)) setTimeout(function () { sparkle(scoreBox[w]); sparkle(turnPiece); }, 150);
  }

  var STAR = '<svg viewBox="0 0 20 20"><path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6Z" fill="#f2c23f" stroke="#fff" stroke-width="1"/></svg>';
  function sparkle(target) {
    if (reduceMotion) return;
    var r = target.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var n = 8, dist = Math.max(r.width, 30) * 0.8;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      var ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      var d = dist * (0.7 + Math.random() * 0.4);
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * d + 'px');
      var size = 14 + Math.random() * 10;
      s.style.width = s.style.height = size + 'px';
      s.innerHTML = STAR;
      fx.appendChild(s);
      setTimeout(function (z) { return function () { z.remove(); }; }(s), 1000);
    }
  }

  // ---------- まった（1て もどす） ----------
  function undoCount() {
    if (!G || !G.hist.length) return 0;
    if (G.players === 2) return 1;
    // ひとりで：じぶんの 手まで もどす（あとの コンピュータの 手も いっしょに）
    for (var i = G.hist.length - 1; i >= 0; i--) {
      if (G.hist[i].p === G.human) return G.hist.length - i;
    }
    return 0;
  }
  function undo() {
    if (!G || G.anim || !quitEl.hidden) return;
    var n = undoCount();
    if (!n) return;
    unlockAudio();
    G.token++;                     // かんがえちゅう・パス・かぞえちゅう なら やめる
    G.thinking = false;
    G.passing = false;
    G.counting = false;
    hidePass();
    if (G.over) {
      if (G.counted) { tally.w[G.winner]--; tally.games--; G.counted = false; }
      G.over = false; G.winner = 0;
      board.classList.remove('is-end');
    }
    var h = null;
    for (var i = 0; i < n; i++) h = G.hist.pop();
    G.b = h.b;
    G.turn = h.p;
    G.last = h.last;
    clearHint();
    drawAll();
    sUndo();
    setMsg(G.players === 1 && n > 1 ? 'あなたの 手と コンピュータの 手を もどしたよ' : '1て もどしたよ');
    startTurn();
  }

  // ---------- ヒント ----------
  function clearHint() {
    if (G) G.hint = null;
    if (layers.hint) layers.hint.innerHTML = '';
    hintBtn.setAttribute('aria-pressed', 'false');
  }
  function showHint() {
    if (!canHumanMove()) return;
    unlockAudio();
    if (G.hint) { clearHint(); setMsg(''); render(); return; }
    var h = AI.hint(G.b, N, G.turn);
    if (!h) return;
    G.hint = h;
    hintBtn.setAttribute('aria-pressed', 'true');
    var t = G.turn;
    Object.keys(G.legal).forEach(function (k) {
      var i = Number(k), x = cx(i), y = cy(i);
      if (i === h.i) {
        el('circle', { class: 'hint-best', cx: x, cy: y, r: 38 }, layers.hint);
        el('path', { class: 'hint-star', d: starPath(x, y, 26, 11) }, layers.hint);
      } else if (h.danger.indexOf(i) >= 0) {
        el('path', { class: 'hint-x', d: 'M' + (x - 16) + ' ' + (y - 16) + 'l32 32M' + (x + 16) + ' ' + (y - 16) + 'l-32 32' }, layers.hint);
      } else {
        el('text', { class: 'hint-num t' + t, x: x, y: y }, layers.hint).textContent = String(G.legal[i]);
      }
    });
    var text = h.kind === 'corner'
      ? '★の かどが よさそうだよ。かどの コマは もう ひっくりかえされないよ'
      : '★の ところが よさそうだよ';
    text += '。すうじは ひっくりかえせる かずだよ';
    if (h.danger.some(function (x) { return x !== h.i; })) text += '。✕の ところに おくと、あいてに かどを とられやすいよ';
    setMsg(text);
    sHint();
    render();
  }
  function starPath(x, y, ro, ri) {
    var d = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : ro;
      d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1);
    }
    return d + 'Z';
  }

  // ---------- ひょうじ ----------
  // ことばの とちゅうで 行が かわらないように、スペースで くぎった まとまりを つつむ
  function nw(html) {
    return html.replace(/(^|>)([^<]+)/g, function (m, a, t) {
      return a + t.replace(/([、。])(?! )/g, '$1 ').trim().split(' ').map(function (w) { return '<span class="nw">' + w + '</span>'; }).join(' ');
    });
  }
  function render() {
    if (!G) return;
    var t = G.turn;
    turnEl.className = 'turn';
    var text;
    if (G.over && !G.counting) {
      turnEl.classList.add('is-end');
      turnPiece.innerHTML = pieceSvg(G.winner || 3);
      if (!G.winner) text = 'ひきわけ！';
      else if (G.players === 1) text = G.winner === G.human ? 'あなたの かち！' : 'コンピュータの かち';
      else text = NAMES[G.winner] + 'の かち！';
    } else if (G.over) {
      turnPiece.innerHTML = pieceSvg(3);
      text = 'おわり！<small>かぞえて いるよ</small>';
    } else {
      turnEl.classList.add('t' + t);
      turnPiece.innerHTML = pieceSvg(t);
      if (G.players === 1) {
        text = t === G.human ? 'あなたの ばん<small>あなたは ' + NAMES[t] + '</small>'
          : 'コンピュータの ばん<small class="thinking">かんがえちゅう<i>・</i><i>・</i><i>・</i></small>';
      } else {
        text = NAMES[t] + 'の ばん';
      }
    }
    turnText.innerHTML = nw(text);
    var humanNow = !G.over && isHumanTurn() && !G.passing;
    var showCan = humanNow && !G.anim && !G.thinking;
    board.classList.toggle('is-off', !showCan);
    // おける ところ（うすい まる）
    layers.can.innerHTML = '';
    if (showCan) {
      Object.keys(G.legal).forEach(function (k) {
        el('circle', { class: 'can t' + t, cx: cx(Number(k)), cy: cy(Number(k)), r: 17 }, layers.can);
      });
    }
    // かず
    if (!G.counting) {
      var k = AI.count(G.b);
      num[1].textContent = String(k[1]);
      num[2].textContent = String(k[2]);
    }
    [1, 2].forEach(function (p) { scoreBox[p].classList.toggle('is-win', G.over && !G.counting && G.winner === p); });
    undoBtn.disabled = G.anim || !undoCount();
    hintBtn.disabled = !showCan;
    endBtns.hidden = !G.over || G.counting;
    if (tally && tally.games) {
      tallyEl.innerHTML = G.players === 1
        ? 'あなた <b>' + tally.w[G.human] + '</b> かち ・ コンピュータ <b>' + tally.w[G.cpu] + '</b> かち'
        : 'くろ <b>' + tally.w[1] + '</b> かち ・ しろ <b>' + tally.w[2] + '</b> かち';
    } else {
      tallyEl.innerHTML = '';
    }
  }

  // ---------- はじめの がめん ----------
  function showStart() {
    if (G) G.token++;
    G = null;
    tally = null;
    playEl.hidden = true;
    quitEl.hidden = true;
    startEl.hidden = false;
    document.body.classList.remove('is-playing');
    fx.innerHTML = '';
    renderStart();
  }
  function renderStart() {
    function mark(sel, attr, val) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(val)));
      });
    }
    mark('.who', 'data-players', rec.players);
    mark('.size', 'data-size', rec.size);
    mark('.level', 'data-level', rec.level);
    mark('.first', 'data-first', rec.first);
    $('secLevel').hidden = rec.players !== 1;
    $('secFirst').hidden = rec.players !== 1;
    $('note').textContent = rec.players === 1
      ? (rec.first === 'me' ? 'あなたは くろ、コンピュータは しろ です。くろ から おきます。'
        : 'コンピュータは くろ、あなたは しろ です。くろ から おきます。')
      : 'くろ から じゅんばんに おきます。';
  }
  function bindChoice(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
      b.addEventListener('click', function () { unlockAudio(); fn(b); save(); renderStart(); });
    });
  }
  bindChoice('.who', function (b) { rec.players = b.getAttribute('data-players') === '2' ? 2 : 1; });
  bindChoice('.size', function (b) { rec.size = b.getAttribute('data-size') === '8' ? 8 : 6; });
  bindChoice('.level', function (b) { rec.level = b.getAttribute('data-level'); });
  bindChoice('.first', function (b) { rec.first = b.getAttribute('data-first'); });
  $('goBtn').addEventListener('click', function () { unlockAudio(); newGame(); });

  undoBtn.addEventListener('click', undo);
  hintBtn.addEventListener('click', showHint);
  $('againBtn').addEventListener('click', function () { unlockAudio(); newGame(); });
  $('toStartBtn').addEventListener('click', showStart);

  // ---------- おと ----------
  var SPK_ON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  var soundBtn = $('soundBtn');
  function renderSound() {
    soundBtn.setAttribute('aria-pressed', String(rec.sound));
    soundBtn.setAttribute('aria-label', rec.sound ? 'おと あり（おすと けす）' : 'おと なし（おすと だす）');
    soundBtn.innerHTML = (rec.sound ? SPK_ON : SPK_OFF) + '<span>' + (rec.sound ? 'おと' : 'おと なし') + '</span>';
  }
  soundBtn.addEventListener('click', function () {
    rec.sound = !rec.sound;
    save();
    renderSound();
    if (rec.sound) { unlockAudio(); sPlace(); }
  });

  // ---------- もくじ・やめる？ ----------
  function inGame() { return !!(G && !G.over && G.hist.length); }
  function openQuit() {
    quitEl.hidden = false;
    $('resumeBtn').focus({ preventScroll: true });
  }
  function closeQuit() {
    quitEl.hidden = true;
    if (G) render();
  }
  $('homeBtn').addEventListener('click', function (e) {
    if (inGame()) { e.preventDefault(); openQuit(); }
  });
  $('resumeBtn').addEventListener('click', closeQuit);
  $('quitStartBtn').addEventListener('click', showStart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!quitEl.hidden) closeQuit();
      else if (inGame()) openQuit();
    }
  });

  // あそんでいる とちゅうは、新しい版への 切りかえで 再読み込み しない
  window.kyozaiBusy = function () { return inGame(); };

  renderSound();
  renderStart();
})();
