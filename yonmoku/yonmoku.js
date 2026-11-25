// よんもくならべ
(function () {
  'use strict';

  var AI = window.YonmokuAI;
  var COLS = 7, ROWS = 6;
  var NAMES = { 1: 'あか', 2: 'きいろ' };

  // ---------- ほぞん（この iPad の中だけ。せっていだけで、記録は 残さない） ----------
  var STORE_KEY = 'yonmoku-v1';
  var rec = { players: 1, level: 'easy', first: 'me', sound: true };
  (function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!d) return;
      if (d.players === 2) rec.players = 2;
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
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
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
  // おちる：ひゅーっと 下がる 小さな 音
  function sFall(sec) { play(function (t) { tone(t, 880, 0.03, Math.max(0.12, sec), 'sine', 420); }); }
  // ついた：ころん
  function sLand(v) {
    play(function (t) {
      tone(t, 170, 0.22 * v, 0.16, 'triangle');
      tone(t, 640, 0.07 * v, 0.07, 'sine');
    });
  }
  function sFull() { play(function (t) { tone(t, 200, 0.08, 0.25, 'sine'); }); }
  function sUndo() { play(function (t) { tone(t, 420, 0.07, 0.18, 'triangle', 760); }); }
  function sHint() { play(function (t) { bell(t, 1047, 0.07); bell(t + 0.12, 1319, 0.06); }); }
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
      return '<svg viewBox="0 0 64 64"><path d="M32 4a28 28 0 0 0 0 56z" fill="#e0524a"/><path d="M32 4a28 28 0 0 1 0 56z" fill="#f4c430"/>' +
        '<circle cx="32" cy="32" r="28" fill="none" stroke="#3d3a35" stroke-width="4"/></svg>';
    }
    return '<svg viewBox="0 0 64 64"><g class="p' + p + '"><circle class="pc" cx="32" cy="32" r="28" style="stroke-width:4"/>' +
      '<circle class="pc-in" cx="32" cy="32" r="19"/></g></svg>';
  }

  // ---------- ばんの 大きさ（SVG の 中の 長さ） ----------
  var CELL = 100, PAD = 12, TOPH = 96, R = 40, HOLE = 42;
  var VBW = PAD * 2 + CELL * COLS;                  // 724
  var FRAME_H = PAD * 2 + CELL * ROWS;              // 624
  var VBH = TOPH + FRAME_H + 22;
  var ARROW_Y = TOPH / 2;
  function cx(c) { return PAD + CELL / 2 + c * CELL; }
  function cy(r) { return TOPH + PAD + CELL / 2 + (ROWS - 1 - r) * CELL; }

  var board = $('board');
  var layers = {};
  var arrows = [], flashes = [];
  function roundRect(x, y, w, h, rr) {
    return 'M' + (x + rr) + ' ' + y + 'H' + (x + w - rr) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + rr) +
      'V' + (y + h - rr) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - rr) + ' ' + (y + h) +
      'H' + (x + rr) + 'Q' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - rr) +
      'V' + (y + rr) + 'Q' + x + ' ' + y + ' ' + (x + rr) + ' ' + y + 'Z';
  }
  function buildBoard() {
    board.setAttribute('viewBox', '0 0 ' + VBW + ' ' + VBH);
    board.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el('rect', { class: 'leg', x: 30, y: TOPH + FRAME_H - 10, width: 60, height: 32, rx: 8 }, board);
    el('rect', { class: 'leg', x: VBW - 90, y: TOPH + FRAME_H - 10, width: 60, height: 32, rx: 8 }, board);
    el('rect', { class: 'hole-bg', x: 4, y: TOPH + 4, width: VBW - 8, height: FRAME_H - 8 }, board);
    // うえの ▼ は コマより うしろ（落ちはじめの コマが ▼の 前に 見えるように）
    var arrowLayer = el('g', {}, board);
    layers.pieces = el('g', {}, board);
    var d = roundRect(0, TOPH, VBW, FRAME_H, 22);
    var c, r;
    for (c = 0; c < COLS; c++) {
      for (r = 0; r < ROWS; r++) {
        d += 'M' + (cx(c) - HOLE) + ' ' + cy(r) + 'a' + HOLE + ' ' + HOLE + ' 0 1 0 ' + HOLE * 2 + ' 0' +
          'a' + HOLE + ' ' + HOLE + ' 0 1 0 ' + (-HOLE * 2) + ' 0Z';
      }
    }
    el('path', { class: 'frame', d: d, 'fill-rule': 'evenodd' }, board);
    var rims = el('g', {}, board);
    for (c = 0; c < COLS; c++) for (r = 0; r < ROWS; r++) el('circle', { class: 'rim', cx: cx(c), cy: cy(r), r: HOLE }, rims);
    layers.hint = el('g', { class: 'hint-layer' }, board);
    layers.win = el('g', { 'pointer-events': 'none' }, board);
    var top = el('g', {}, board);
    for (c = 0; c < COLS; c++) {
      flashes.push(el('rect', { class: 'col-flash', x: PAD + c * CELL + 4, y: TOPH + PAD, width: CELL - 8, height: CELL * ROWS, rx: 18 }, top));
      var a = el('g', { class: 'arrow', transform: 'translate(' + cx(c) + ' ' + ARROW_Y + ')' }, arrowLayer);
      el('circle', { r: 38 }, a);
      el('path', { d: 'M-17 -12H17L0 16Z' }, a);
      arrows.push(a);
    }
    for (c = 0; c < COLS; c++) {
      var x0 = c === 0 ? 0 : PAD + c * CELL;
      var x1 = c === COLS - 1 ? VBW : PAD + (c + 1) * CELL;
      var hit = el('rect', { class: 'col-hit', x: x0, y: 0, width: x1 - x0, height: VBH, 'data-col': c }, board);
      hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', (c + 1) + 'ばんめの れつに おく');
      bindColumn(hit, c);
    }
  }
  function bindColumn(hit, c) {
    var clear = function () { arrows[c].classList.remove('is-press'); };
    hit.addEventListener('pointerdown', function () {
      if (canHumanMove()) arrows[c].classList.add('is-press');
    });
    hit.addEventListener('pointerup', clear);
    hit.addEventListener('pointercancel', clear);
    hit.addEventListener('pointerleave', clear);
    hit.addEventListener('click', function () { clear(); onColumn(c); });
  }

  // ---------- がめんの ぶひん ----------
  var startEl = $('start'), playEl = $('play'), quitEl = $('quitEl');
  var turnEl = $('turn'), turnPiece = $('turnPiece'), turnText = $('turnText');
  var msgEl = $('msg'), undoBtn = $('undoBtn'), hintBtn = $('hintBtn');
  var endBtns = $('endBtns'), playBtns = $('playBtns'), tallyEl = $('tally');
  var fx = $('fx');

  // ---------- あそびの じょうたい ----------
  var G = null;
  var tally = null;     // かった かず（はじめの がめんに もどるまで）
  var pieceEls = {};

  function newGame() {
    if (G) G.token++;
    var human = 1, cpu = 2;
    G = {
      players: rec.players, level: rec.level, human: human, cpu: cpu,
      b: [], h: [0, 0, 0, 0, 0, 0, 0], moves: [],
      turn: rec.players === 1 && rec.first === 'cpu' ? cpu : 1,
      over: false, winner: 0, line: null, counted: false,
      anim: false, thinking: false, token: 1, hint: null
    };
    for (var i = 0; i < COLS * ROWS; i++) G.b.push(0);
    layers.pieces.innerHTML = '';
    layers.win.innerHTML = '';
    layers.hint.innerHTML = '';
    board.classList.remove('is-won');
    pieceEls = {};
    if (!tally || tally.players !== G.players) tally = { players: G.players, w: { 0: 0, 1: 0, 2: 0 }, games: 0 };
    startEl.hidden = true;
    playEl.hidden = false;
    quitEl.hidden = true;
    document.body.classList.add('is-playing');
    setMsg(G.players === 1 && G.turn === G.cpu ? '' : 'うえの ▼ を タップして コマを おとそう');
    render();
    if (G.players === 1 && G.turn === G.cpu) cpuTurn();
  }

  function isHumanTurn() { return G.players === 2 || G.turn === G.human; }
  function canHumanMove() {
    return !!(G && !G.over && !G.anim && !G.thinking && quitEl.hidden && isHumanTurn());
  }
  function setMsg(t) { msgEl.innerHTML = t ? nw(t) : ''; }

  function onColumn(c) {
    if (!G || G.over || !quitEl.hidden) return;
    unlockAudio();
    if (G.anim) return;
    if (G.thinking || !isHumanTurn()) { setMsg('コンピュータが かんがえて いるよ。まってね'); return; }
    if (G.h[c] >= ROWS) { setMsg('そこは もう いっぱいだよ'); sFull(); return; }
    flash(c);
    doMove(c);
  }
  function flash(c) {
    var f = flashes[c];
    f.classList.remove('is-on');
    void f.getBBox();
    f.classList.add('is-on');
  }

  // ---------- コマを おく ----------
  function doMove(c) {
    var r = G.h[c], p = G.turn;
    G.b[c * ROWS + r] = p;
    G.h[c]++;
    G.moves.push({ c: c, r: r, p: p });
    clearHint();
    Object.keys(pieceEls).forEach(function (k) { pieceEls[k].classList.remove('is-last'); });
    var g = el('g', { class: 'piece p' + p + ' is-last' }, layers.pieces);
    el('circle', { class: 'pc', r: R }, g);
    el('circle', { class: 'pc-in', r: 28 }, g);
    el('circle', { class: 'pc-last', r: 7 }, g);
    el('circle', { class: 'pc-glow', r: 31 }, g);
    pieceEls[c * ROWS + r] = g;
    G.anim = true;
    if (G.players === 1 && p === G.human) setMsg('');
    render();
    var tok = G.token;
    dropAnim(g, cx(c), ARROW_Y, cy(r), function () {
      if (!G || tok !== G.token) return;
      G.anim = false;
      afterMove(c, r, p);
    });
  }

  // おちる うごき（▼の ところに 一しゅん 出てから 落ちて、すこし はねる）
  // 「視差効果を減らす」の iPad でも 落ちる うごきは 見せる（はねる うごきだけ やめる）
  var HOLD = 180;                            // ▼の ところで とまる じかん（ミリ秒）
  function dropAnim(g, x, y0, y1, done) {
    var place = function (y) { g.setAttribute('transform', 'translate(' + x + ' ' + y.toFixed(1) + ')'); };
    var A = 0.003;                           // おちる はやさ（SVG の 長さ / ミリ秒²）
    var dist = y1 - y0;
    var tHit = Math.sqrt(2 * dist / A);
    var v = A * tHit;
    var e = 0.24;
    // はねる：1かいめ（つよめ）・2かいめ（よわめ）
    var segs = reduceMotion ? [] : [{ v: v * e }, { v: v * e * e }];
    segs.forEach(function (s) { s.len = 2 * s.v / A; });
    var t0 = 0, seg = -1;
    place(y0);
    function step(now) {
      if (!t0) { t0 = now + HOLD; setTimeout(function () { sFall(tHit / 1000); }, HOLD); }
      var t = now - t0;
      if (t < 0) { requestAnimationFrame(step); return; }
      if (t < tHit) {
        place(y0 + 0.5 * A * t * t);
        requestAnimationFrame(step);
        return;
      }
      var tt = t - tHit, k = 0;
      while (k < segs.length && tt > segs[k].len) { tt -= segs[k].len; k++; }
      if (k > seg) { if (seg < 0) sLand(1); else if (k === 1) sLand(0.35); seg = k; }
      if (k >= segs.length) { place(y1); done(); return; }
      place(y1 - (segs[k].v * tt - 0.5 * A * tt * tt));
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function afterMove(c, r, p) {
    var line = AI.winLine(G.b, c, r);
    if (line) { finish(p, line); return; }
    if (G.moves.length >= COLS * ROWS) { finish(0, null); return; }
    G.turn = 3 - p;
    render();
    if (G.players === 1 && G.turn === G.cpu) cpuTurn();
  }

  // ---------- コンピュータの ばん ----------
  function cpuTurn() {
    G.thinking = true;
    render();
    var tok = G.token;
    var wait = G.level === 'strong' ? 350 : 650;
    setTimeout(function () {
      if (!G || tok !== G.token || G.over) return;
      var c = AI.bestMove(G.b.slice(), G.cpu, G.level);
      if (!G || tok !== G.token) return;
      G.thinking = false;
      if (c < 0) return;
      doMove(c);
    }, wait);
  }

  // ---------- おわり ----------
  function finish(winner, line) {
    G.over = true;
    G.winner = winner;
    G.line = line;
    if (!G.counted) { tally.w[winner]++; tally.games++; G.counted = true; }
    if (line) showWin(line);
    if (G.players === 1) {
      if (winner === G.human) { sWin(); setMsg('すごい！ 4つ ならんだね'); }
      else if (winner === G.cpu) { sLose(); setMsg('「まった」で もどして、もういちど かんがえて みよう'); }
      else { sDraw(); setMsg('ばんが いっぱいに なったよ'); }
    } else {
      if (winner) { sWin(); setMsg(NAMES[winner] + 'が 4つ ならべたよ！'); }
      else { sDraw(); setMsg('ばんが いっぱいに なったよ'); }
    }
    render();
  }

  function showWin(line) {
    board.classList.add('is-won');
    layers.win.innerHTML = '';
    line.forEach(function (cr) {
      var g = pieceEls[cr[0] * ROWS + cr[1]];
      if (g) g.classList.add('is-win');
      el('circle', { class: 'win-halo', cx: cx(cr[0]), cy: cy(cr[1]), r: HOLE + 3 }, layers.win);
    });
    var a = line[0], z = line[line.length - 1];
    var d = 'M' + cx(a[0]) + ' ' + cy(a[1]) + 'L' + cx(z[0]) + ' ' + cy(z[1]);
    el('path', { class: 'win-line win-line-under', d: d, pathLength: 1 }, layers.win);
    el('path', { class: 'win-line', d: d, pathLength: 1 }, layers.win);
    setTimeout(function () {
      line.forEach(function (cr) { var g = pieceEls[cr[0] * ROWS + cr[1]]; if (g) sparkle(g); });
    }, 250);
  }

  var STAR = '<svg viewBox="0 0 20 20"><path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6Z" fill="#f2c23f" stroke="#fff" stroke-width="1"/></svg>';
  function sparkle(target) {
    if (reduceMotion) return;
    var r = target.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var n = 6, dist = Math.max(r.width, 30) * 0.9;
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
    if (!G || !G.moves.length) return 0;
    if (G.players === 2) return 1;
    // ひとりで：じぶんの 手まで もどす（あとの コンピュータの 手も いっしょに）
    for (var i = G.moves.length - 1; i >= 0; i--) {
      if (G.moves[i].p === G.human) return G.moves.length - i;
    }
    return 0;
  }
  function undo() {
    if (!G || G.anim || !quitEl.hidden) return;
    var n = undoCount();
    if (!n) return;
    unlockAudio();
    G.token++;                     // かんがえちゅう なら やめる
    G.thinking = false;
    if (G.over) {
      if (G.counted) { tally.w[G.winner]--; tally.games--; G.counted = false; }
      G.over = false; G.winner = 0; G.line = null;
      board.classList.remove('is-won');
      layers.win.innerHTML = '';
      Object.keys(pieceEls).forEach(function (k) { pieceEls[k].classList.remove('is-win'); });
    }
    var last = null;
    for (var i = 0; i < n; i++) {
      var m = G.moves.pop();
      G.b[m.c * ROWS + m.r] = 0;
      G.h[m.c]--;
      var g = pieceEls[m.c * ROWS + m.r];
      delete pieceEls[m.c * ROWS + m.r];
      if (g) removePiece(g);
      last = m;
    }
    G.turn = last.p;
    var prev = G.moves[G.moves.length - 1];
    if (prev && pieceEls[prev.c * ROWS + prev.r]) pieceEls[prev.c * ROWS + prev.r].classList.add('is-last');
    clearHint();
    sUndo();
    setMsg(G.players === 1 && n > 1 ? 'あなたの 手と コンピュータの 手を もどしたよ' : '1て もどしたよ');
    render();
  }
  function removePiece(g) {
    if (reduceMotion) { g.remove(); return; }
    g.classList.add('is-gone');
    setTimeout(function () { g.remove(); }, 220);
  }

  // ---------- ヒント ----------
  function clearHint() {
    if (G) G.hint = null;
    layers.hint.innerHTML = '';
    hintBtn.setAttribute('aria-pressed', 'false');
  }
  function showHint() {
    if (!canHumanMove()) return;
    unlockAudio();
    if (G.hint) { clearHint(); setMsg(''); render(); return; }
    var h = AI.hint(G.b.slice(), G.turn);
    if (!h) return;
    G.hint = h;
    hintBtn.setAttribute('aria-pressed', 'true');
    var t = G.turn, c;
    // 光る れつ
    el('rect', { class: 'hint-col', x: PAD + h.col * CELL + 4, y: TOPH + PAD, width: CELL - 8, height: CELL * ROWS, rx: 18 }, layers.hint);
    // おける ところ（それぞれの れつの いちばん 下の あき）
    for (c = 0; c < COLS; c++) {
      if (G.h[c] >= ROWS) continue;
      var x = cx(c), y = cy(G.h[c]);
      if (c === h.col) {
        el('circle', { class: 'hint-spot hint-best', cx: x, cy: y, r: 36 }, layers.hint);
        el('path', { class: 'hint-star', d: starPath(x, y, 24, 10) }, layers.hint);
      } else {
        el('circle', { class: 'hint-spot t' + t, cx: x, cy: y, r: 32 }, layers.hint);
        if (h.danger.indexOf(c) >= 0) {
          el('path', { class: 'hint-x', d: 'M' + (x - 14) + ' ' + (y - 14) + 'l28 28M' + (x + 14) + ' ' + (y - 14) + 'l-28 28' }, layers.hint);
        }
      }
    }
    var text = h.kind === 'win' ? '★の ところに おくと かてるよ！'
      : h.kind === 'block' ? '★の ところに おかないと、あいてが 4つ ならんじゃうよ'
      : '★の ところが よさそうだよ';
    var hasX = h.danger.some(function (x) { return x !== h.col; });
    if (hasX && h.kind !== 'win') text += '。✕の ところに おくと、その うえに あいてが おいて かっちゃうよ';
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
    if (G.over) {
      turnEl.classList.add('is-end');
      turnPiece.innerHTML = pieceSvg(G.winner || 3);
      if (!G.winner) text = 'ひきわけ！';
      else if (G.players === 1) text = G.winner === G.human ? 'あなたの かち！' : 'コンピュータの かち';
      else text = NAMES[G.winner] + 'の かち！';
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
    var humanNow = !G.over && isHumanTurn();
    board.classList.toggle('is-off', !humanNow || G.thinking);
    arrows.forEach(function (a, c) {
      a.setAttribute('class', 'arrow t' + t + (G.h[c] >= ROWS ? ' is-full' : ''));
    });
    undoBtn.disabled = G.anim || !undoCount();
    hintBtn.disabled = !humanNow || G.anim || G.thinking;
    endBtns.hidden = !G.over;
    if (tally && tally.games) {
      tallyEl.innerHTML = G.players === 1
        ? 'あなた <b>' + tally.w[G.human] + '</b> かち ・ コンピュータ <b>' + tally.w[G.cpu] + '</b> かち'
        : 'あか <b>' + tally.w[1] + '</b> かち ・ きいろ <b>' + tally.w[2] + '</b> かち';
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
    mark('.level', 'data-level', rec.level);
    mark('.first', 'data-first', rec.first);
    $('secLevel').hidden = rec.players !== 1;
    $('secFirst').hidden = rec.players !== 1;
    $('note').textContent = rec.players === 1
      ? 'あなたは あか、コンピュータは きいろ です。'
      : 'あか から じゅんばんに おきます。';
  }
  function bindChoice(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
      b.addEventListener('click', function () { unlockAudio(); fn(b); save(); renderStart(); });
    });
  }
  bindChoice('.who', function (b) { rec.players = b.getAttribute('data-players') === '2' ? 2 : 1; });
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
    if (rec.sound) { unlockAudio(); sLand(0.6); }
  });

  // ---------- もくじ・やめる？ ----------
  function inGame() { return !!(G && !G.over && G.moves.length); }
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
      return;
    }
    // キーボード（先生用）：1〜7 で れつを えらぶ
    if (G && !playEl.hidden && /^[1-7]$/.test(e.key)) onColumn(Number(e.key) - 1);
  });

  // あそんでいる とちゅうは、新しい版への 切りかえで 再読み込み しない
  window.kyozaiBusy = function () { return inGame(); };

  buildBoard();
  renderSound();
  renderStart();
})();
