// しょうぎ
(function () {
  'use strict';

  var S = window.ShogiRules;
  var FU = S.FU, KY = S.KY, KE = S.KE, GI = S.GI, KI = S.KI, KA = S.KA, HI = S.HI, OU = S.OU;
  var TO = S.TO, NY = S.NY, NK = S.NK, NG = S.NG, UM = S.UM, RY = S.RY;
  var KANJI = ['', '歩', '香', '桂', '銀', '金', '角', '飛', '玉', 'と', '杏', '圭', '全', '馬', '龍'];
  var YOMI = ['', 'ふ', 'きょう', 'けい', 'ぎん', 'きん', 'かく', 'ひしゃ', 'おう', 'と', 'なりきょう', 'なりけい', 'なりぎん', 'うま', 'りゅう'];
  var NAMES = { 1: 'せんて', 2: 'ごて' };
  var HAND = { mini: [HI, KA, KI, GI, FU], hon: [HI, KA, KI, GI, KE, KY, FU] };

  // ---------- ほぞん（この iPad の中だけ。せっていだけで、記録は 残さない） ----------
  var STORE_KEY = 'shogi-v1';
  var rec = { players: 1, kind: 'mini', level: 'easy', first: 'me', yomi: true, sound: true };
  (function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!d) return;
      if (d.players === 2) rec.players = 2;
      if (d.kind === 'hon') rec.kind = 'hon';
      if (d.level === 'normal' || d.level === 'strong') rec.level = d.level;
      if (d.first === 'cpu') rec.first = 'cpu';
      rec.yomi = d.yomi !== false;
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
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
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
  // こまを さす：ぱちっ（木の 音）
  function sPlace() {
    play(function (t) {
      tone(t, 190, 0.3, 0.09, 'triangle', 120);
      tone(t, 1300, 0.06, 0.025, 'square');
    });
  }
  function sCap() {
    play(function (t) {
      tone(t, 190, 0.3, 0.09, 'triangle', 120);
      tone(t, 1300, 0.06, 0.025, 'square');
      tone(t + 0.1, 660, 0.06, 0.12, 'triangle', 990);
    });
  }
  function sSelect() { play(function (t) { tone(t, 760, 0.05, 0.06, 'sine'); }); }
  function sPromote() { play(function (t) { [523, 659, 784].forEach(function (f, i) { tone(t + 0.08 + i * 0.07, f, 0.07, 0.18, 'triangle'); }); }); }
  function sCheck() { play(function (t) { bell(t, 880, 0.1); bell(t + 0.18, 880, 0.09); }); }
  function sNo() { play(function (t) { tone(t, 200, 0.08, 0.25, 'sine'); }); }
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
  // ことばの とちゅうで 行が かわらないように、スペースで くぎった まとまりを つつむ
  function nw(html) {
    return html.replace(/(^|>)([^<]+)/g, function (m, a, t) {
      return a + t.replace(/([、。])(?! )/g, '$1 ').trim().split(' ').map(function (w) { return '<span class="nw">' + w + '</span>'; }).join(' ');
    });
  }
  function q(t) { return '「' + YOMI[t] + '」'; }

  // ---------- こまの え ----------
  var BODY = 'M0 -45 L31 -33 L39 42 L-39 42 L-31 -33 Z';
  function pieceInner(t, owner, yomi) {
    var ch = t === OU ? (owner === 2 ? '王' : '玉') : KANJI[t];
    var pro = t >= TO ? ' is-pro' : '';
    var s = '<path class="pc-body" d="' + BODY + '"/>';
    if (yomi) {
      var y = YOMI[t];
      s += '<text class="pc-k' + pro + '" y="-5" font-size="44">' + ch + '</text>' +
        '<text class="pc-y' + pro + '" y="29" font-size="' + (y.length >= 4 ? 12 : 15) + '">' + y + '</text>';
    } else {
      s += '<text class="pc-k' + pro + '" y="4" font-size="54">' + ch + '</text>';
    }
    return s;
  }
  function pieceSvg(t, owner, rot, yomi) {
    return '<svg viewBox="-50 -50 100 100"><g' + (rot ? ' transform="rotate(180)"' : '') + '>' +
      pieceInner(t, owner, yomi === undefined ? rec.yomi : yomi) + '</g></svg>';
  }

  // ---------- ばんの 大きさ（SVG の 中の 長さ） ----------
  var CELL = 100, BP = 18, GAP = 14;
  var L = null;                 // いまの ならびかた
  var flipView = false, bottomC = 1, topC = 2;

  var board = $('board'), boardBox = $('boardBox');
  var layers = {};

  function computeLayout() {
    var n = G.n, BW = n * CELL + 2 * BP, order = HAND[G.kind], slots = order.length;
    var SL = slots * CELL + 20, KW = CELL + 20;
    var r = boardBox.getBoundingClientRect();
    var w = r.width || 800, h = r.height || 600;
    var sideW = KW + GAP + BW + GAP + KW, sideH = BW;
    var stackW = BW, stackH = KW + GAP + BW + GAP + KW;
    var useSide = Math.min(w / sideW, h / sideH) >= Math.min(w / stackW, h / stackH);
    var lay = { n: n, BW: BW, order: order, top: { slots: [] }, bot: { slots: [] } };
    var i;
    if (useSide) {
      lay.W = sideW; lay.H = sideH; lay.bx = KW + GAP; lay.by = 0;
      lay.top.rect = { x: 0, y: 0, w: KW, h: SL };
      lay.bot.rect = { x: sideW - KW, y: BW - SL, w: KW, h: SL };
      for (i = 0; i < slots; i++) {
        lay.top.slots.push([KW / 2, 10 + CELL / 2 + i * CELL]);
        lay.bot.slots.push([sideW - KW / 2, BW - 10 - CELL / 2 - i * CELL]);
      }
    } else {
      lay.W = stackW; lay.H = stackH; lay.bx = 0; lay.by = KW + GAP;
      lay.top.rect = { x: 0, y: 0, w: SL, h: KW };
      lay.bot.rect = { x: BW - SL, y: stackH - KW, w: SL, h: KW };
      for (i = 0; i < slots; i++) {
        lay.top.slots.push([SL - 10 - CELL / 2 - i * CELL, KW / 2]);
        lay.bot.slots.push([BW - SL + 10 + CELL / 2 + i * CELL, stackH - KW / 2]);
      }
    }
    L = lay;
  }
  function sqXY(sq) {
    var n = L.n, r = (sq / n) | 0, c = sq % n;
    if (flipView) { r = n - 1 - r; c = n - 1 - c; }
    return [L.bx + BP + c * CELL + CELL / 2, L.by + BP + r * CELL + CELL / 2];
  }
  function standOf(c) { return c === bottomC ? L.bot : L.top; }
  function slotXY(c, t) { return standOf(c).slots[L.order.indexOf(t)]; }

  function buildBoard() {
    computeLayout();
    var n = L.n, bx = L.bx, by = L.by, z = n === 5 ? 1 : 3;
    board.innerHTML = '';
    board.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);
    board.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el('rect', { class: 'frame', x: bx, y: by, width: L.BW, height: L.BW, rx: 16 }, board);
    el('rect', { class: 'felt', x: bx + BP, y: by + BP, width: n * CELL, height: n * CELL }, board);
    // あいての じんち（なれる ところ）に うすい いろ
    el('rect', { class: 'zone', x: bx + BP, y: by + BP, width: n * CELL, height: z * CELL }, board);
    el('rect', { class: 'zone', x: bx + BP, y: by + BP + (n - z) * CELL, width: n * CELL, height: z * CELL }, board);
    var d = '', k;
    for (k = 0; k <= n; k++) {
      d += 'M' + (bx + BP + k * CELL) + ' ' + (by + BP) + 'V' + (by + BP + n * CELL);
      d += 'M' + (bx + BP) + ' ' + (by + BP + k * CELL) + 'H' + (bx + BP + n * CELL);
    }
    el('path', { class: 'grid-line', d: d }, board);
    if (n === 9) {
      [3, 6].forEach(function (a) {
        [3, 6].forEach(function (b) { el('circle', { class: 'grid-dot', cx: bx + BP + a * CELL, cy: by + BP + b * CELL, r: 7 }, board); });
      });
    }
    [L.top, L.bot].forEach(function (st) {
      el('rect', { class: 'stand', x: st.rect.x, y: st.rect.y, width: st.rect.w, height: st.rect.h, rx: 16 }, board);
    });
    layers.label = el('g', { 'pointer-events': 'none' }, board);
    layers.hl = el('g', { 'pointer-events': 'none' }, board);
    layers.pieces = el('g', { 'pointer-events': 'none' }, board);
    layers.dest = el('g', { 'pointer-events': 'none' }, board);
    layers.hint = el('g', { class: 'hint-layer' }, board);
    layers.press = el('g', { 'pointer-events': 'none' }, board);
    var hits = el('g', {}, board);
    for (var sq = 0; sq < n * n; sq++) {
      var p = sqXY(sq);
      var hit = el('rect', { class: 'cell-hit', x: p[0] - CELL / 2, y: p[1] - CELL / 2, width: CELL, height: CELL }, hits);
      hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', (((sq / n) | 0) + 1) + 'だんめ ' + ((sq % n) + 1) + 'れつめ');
      bindHit(hit, p, function (s) { return function () { onSquare(s); }; }(sq));
    }
    [1, 2].forEach(function (c) {
      L.order.forEach(function (t) {
        var p = slotXY(c, t);
        var hit = el('rect', { class: 'cell-hit', x: p[0] - CELL / 2, y: p[1] - CELL / 2, width: CELL, height: CELL }, hits);
        hit.setAttribute('role', 'button');
        hit.setAttribute('aria-label', NAMES[c] + 'の もちごま ' + YOMI[t]);
        bindHit(hit, p, function () { onHand(c, t); });
      });
    });
  }
  function bindHit(hit, p, fn) {
    var press = null;
    var clear = function () { if (press) { press.remove(); press = null; } };
    hit.addEventListener('pointerdown', function () {
      clear();
      if (canHumanMove()) press = el('circle', { class: 'press', cx: p[0], cy: p[1], r: 44 }, layers.press);
    });
    hit.addEventListener('pointerup', clear);
    hit.addEventListener('pointercancel', clear);
    hit.addEventListener('pointerleave', clear);
    hit.addEventListener('click', function () { clear(); fn(); });
  }

  function drawPiece(parent, t, owner, x, y, sc, cnt, cls) {
    var g = el('g', { class: 'pc' + (cls ? ' ' + cls : ''), transform: 'translate(' + x + ' ' + y + ')' }, parent);
    var rot = owner === topC;
    g.innerHTML = '<g transform="' + (rot ? 'rotate(180) ' : '') + 'scale(' + sc + ')">' +
      '<path class="pc-shadow" d="' + BODY + '" transform="translate(3 4)"/>' + pieceInner(t, owner, rec.yomi) +
      (cnt > 1 ? '<circle class="pc-n" cx="31" cy="33" r="18"/><text class="pc-nt" x="31" y="34">' + cnt + '</text>' : '') +
      '</g>';
    return g;
  }

  // ---------- がめんの ぶひん ----------
  var startEl = $('start'), playEl = $('play'), quitEl = $('quitEl'), howEl = $('howEl');
  var turnEl = $('turn'), turnPiece = $('turnPiece'), turnText = $('turnText');
  var msgEl = $('msg'), undoBtn = $('undoBtn'), hintBtn = $('hintBtn');
  var endBtns = $('endBtns'), tallyEl = $('tally');
  var barTop = $('barTop'), barBot = $('barBot');
  var popEl = $('popEl'), popWord = $('popWord'), promoEl = $('promoEl');
  var fx = $('fx');

  // ---------- あそびの じょうたい ----------
  var G = null;
  var tally = null;     // かった かず（はじめの がめんに もどるまで）
  var pieceEls = {};

  function newGame() {
    if (G) G.token++;
    var human = rec.players === 1 && rec.first === 'cpu' ? 2 : 1;
    G = {
      players: rec.players, level: rec.level, kind: rec.kind, n: rec.kind === 'mini' ? 5 : 9,
      human: human, cpu: 3 - human, s: S.create(rec.kind), hist: [], keys: [], last: null,
      legal: [], sel: null, dests: null, check: false,
      over: false, winner: 0, reason: '', counted: false,
      anim: false, thinking: false, asking: null, token: 1, hint: null, msg: ''
    };
    G.keys.push(S.key(G.s));
    flipView = G.players === 1 && human === 2;
    bottomC = flipView ? 2 : 1;
    topC = 3 - bottomC;
    var key = G.players + ':' + G.kind;
    if (!tally || tally.key !== key) tally = { key: key, w: { 0: 0, 1: 0, 2: 0 }, games: 0 };
    startEl.hidden = true;
    playEl.hidden = false;
    quitEl.hidden = true;
    howEl.hidden = true;
    hidePop();
    hidePromo();
    document.body.classList.add('is-playing');
    barTop.hidden = barBot.hidden = G.players !== 2;
    buildBoard();
    setMsg(isHumanTurn() ? 'うごかしたい こまを タップしてね' : '');
    startTurn();
  }

  function isHumanTurn() { return G.players === 2 || G.s.turn === G.human; }
  function canHumanMove() {
    return !!(G && !G.over && !G.anim && !G.thinking && !G.asking && quitEl.hidden && howEl.hidden && isHumanTurn());
  }
  function setMsg(t) {
    if (G) G.msg = t || '';
    msgEl.innerHTML = t ? nw(t) : '';
    if (G && G.players === 2) renderBars();
  }

  // ---------- ばんが はじまる / つぎの ひとの ばん ----------
  function startTurn() {
    var s = G.s;
    G.legal = S.legal(s);
    G.sel = null;
    G.dests = null;
    G.check = S.inCheck(s);
    if (!G.legal.length) { finish(3 - s.turn, G.check ? 'mate' : 'stuck'); return; }
    var k = G.keys[G.keys.length - 1], same = 0;
    G.keys.forEach(function (x) { if (x === k) same++; });
    if (same >= 4) { finish(0, 'rep'); return; }
    render();
    if (G.check) {
      sCheck();
      showPop('おうて！', G.players === 2 && s.turn === topC, false);
      if (isHumanTurn()) setMsg((G.msg ? G.msg + '。' : '') + 'おうてだよ！ おうが とられないように しよう');
    }
    if (G.players === 1 && s.turn === G.cpu) cpuTurn();
  }

  // ---------- ばんを さわる ----------
  function busyMsg() {
    if (!G || G.over || !quitEl.hidden || G.asking || G.anim) return true;
    if (G.thinking || !isHumanTurn()) { setMsg('コンピュータが かんがえて いるよ。まってね'); return true; }
    return false;
  }
  function onSquare(sq) {
    unlockAudio();
    if (busyMsg()) return;
    var s = G.s, c = s.turn, sg = c === 1 ? 1 : -1, p = s.b[sq];
    if (G.sel && G.dests && G.dests[sq]) { tryMove(G.dests[sq]); return; }
    if (p * sg > 0) {
      if (G.sel && G.sel.from === sq) { unselect(); return; }
      select({ from: sq });
      return;
    }
    if (G.sel) {
      var why = S.explain(s, G.sel.drop ? -1 : G.sel.from, G.sel.drop || 0, sq);
      sNo();
      setMsg(whyText(why));
      return;
    }
    if (p) {
      sNo();
      setMsg(G.players === 2 ? 'いまは ' + NAMES[c] + 'の ばんだよ' : 'それは あいての こまだよ。じぶんの こまを タップしてね');
      return;
    }
    setMsg('うごかしたい こまを タップしてね');
  }
  function onHand(c, t) {
    unlockAudio();
    if (busyMsg()) return;
    var s = G.s;
    if (!s.h[c][t]) {
      if (c === s.turn) setMsg('もちごまは、とった こまが ここに ならぶよ');
      return;
    }
    if (c !== s.turn) {
      sNo();
      setMsg(G.players === 2 ? 'いまは ' + NAMES[s.turn] + 'の ばんだよ' : 'それは あいての もちごまだよ');
      return;
    }
    if (G.sel && G.sel.drop === t) { unselect(); return; }
    select({ drop: t });
  }
  function whyText(why) {
    switch (why) {
      case 'king': return G.check ? 'おうてを ふせがないと いけないよ。おうが とられて しまうよ'
        : 'そこに うごくと おうが とられて しまうよ';
      case 'uchifu': return 'ふを うって つみに するのは はんそくだよ（うちふづめ）';
      case 'nifu': return 'おなじ たての れつに じぶんの ふが あるから うてないよ（にふ）';
      case 'dead': return 'そこに うつと もう うごけないから うてないよ';
      case 'occupied': return 'こまが ある ところには うてないよ';
      default: return 'そこには うごけないよ。ひかった ところを タップしてね';
    }
  }
  function select(src) {
    var moves = G.legal.filter(function (m) {
      var d = S.decode(m);
      return src.drop ? d.drop === src.drop : d.from === src.from;
    });
    if (!moves.length) {
      sNo();
      G.sel = null;
      G.dests = null;
      setMsg(G.check ? 'その こまでは おうてを ふせげないよ' : 'その こまは いま うごけないよ');
      render();
      return;
    }
    G.sel = src;
    G.dests = {};
    moves.forEach(function (m) {
      var to = S.decode(m).to;
      (G.dests[to] = G.dests[to] || []).push(m);
    });
    sSelect();
    var t = src.drop || Math.abs(G.s.b[src.from]);
    setMsg(src.drop ? 'もちごまの ' + q(t) + '。ひかった ところに うてるよ' : q(t) + '。ひかった ところに うごかせるよ');
    render();
  }
  function unselect() {
    G.sel = null;
    G.dests = null;
    setMsg('うごかしたい こまを タップしてね');
    render();
  }
  function tryMove(list) {
    if (list.length < 2) { doMove(list[0]); return; }
    askPromo(list);
  }

  // ---------- なる？ ----------
  function askPromo(list) {
    var yes = list.filter(function (m) { return S.decode(m).promo; })[0];
    var no = list.filter(function (m) { return !S.decode(m).promo; })[0];
    var d = S.decode(yes), c = G.s.turn, t = Math.abs(G.s.b[d.from]);
    G.asking = { yes: yes, no: no };
    $('promoYes').innerHTML = pieceSvg(S.PROM[t], c, false) + '<span>なる</span>';
    $('promoNo').innerHTML = pieceSvg(t, c, false) + '<span>ならない</span>';
    promoEl.classList.toggle('is-flip', G.players === 2 && c === topC);
    promoEl.hidden = false;
    setMsg(q(t) + 'が あいての じんちに はいったよ。なる？');
    sSelect();
    render();
    $('promoYes').focus({ preventScroll: true });
  }
  function hidePromo() {
    promoEl.hidden = true;
    if (G) G.asking = null;
  }
  function answerPromo(yes) {
    if (!G || !G.asking) return;
    unlockAudio();
    var m = yes ? G.asking.yes : G.asking.no;
    hidePromo();
    doMove(m);
  }
  $('promoYes').addEventListener('click', function () { answerPromo(true); });
  $('promoNo').addEventListener('click', function () { answerPromo(false); });

  // ---------- こまを うごかす ----------
  function doMove(m) {
    var s = G.s, c = s.turn, d = S.decode(m);
    var t = d.from >= 0 ? Math.abs(s.b[d.from]) : d.drop;
    var capT = d.from >= 0 && s.b[d.to] ? S.BASE[Math.abs(s.b[d.to])] : 0;
    var from = d.from >= 0 ? sqXY(d.from) : slotXY(c, d.drop);
    G.hist.push({ s: S.clone(s), last: G.last, p: c });
    S.make(s, m);
    G.keys.push(S.key(s));
    G.last = { from: d.from, to: d.to, c: c, t: t, cap: capT, promo: d.promo, drop: d.drop };
    G.sel = null;
    G.dests = null;
    G.check = false;
    clearHint();
    G.anim = true;
    var human = G.players === 2 || c === G.human;
    var text = '';
    if (human) {
      if (capT) text = 'あいての ' + q(capT) + 'を とったよ。もちごまに なったよ';
      if (d.promo) text += (text ? '。' : '') + q(t) + 'が なって ' + q(S.PROM[t]) + 'に なったよ';
    } else {
      text = d.drop ? 'コンピュータが ' + q(t) + 'を うったよ' : 'コンピュータが ' + q(t) + 'を うごかしたよ';
      if (d.promo) text += '（なったよ）';
      if (capT) text += '。あなたの ' + q(capT) + 'が とられたよ';
    }
    setMsg(text);
    render();
    if (capT) sCap(); else sPlace();
    if (d.promo) sPromote();
    var tok = G.token;
    var done = function () {
      if (!G || tok !== G.token) return;
      G.anim = false;
      startTurn();
    };
    var g = pieceEls[d.to];
    if (reduceMotion || !g) { setTimeout(done, 120); return; }
    var to = sqXY(d.to);
    animate(210, function (k) {
      var e = 1 - Math.pow(1 - k, 3);
      var x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e;
      var lift = Math.sin(Math.PI * k) * 0.08;
      g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (1 + lift).toFixed(3) + ')');
    }, tok, function () { setTimeout(done, 60); });
  }
  function animate(ms, step, tok, end) {
    var t0 = 0;
    function frame(now) {
      if (!G || tok !== G.token) return;
      if (!t0) t0 = now;
      var t = (now - t0) / ms;
      if (t >= 1) { step(1); if (end) end(); return; }
      step(t);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------- おうて！・つみ！ ----------
  var popTimer = 0;
  function showPop(word, flip, end) {
    clearTimeout(popTimer);
    popWord.textContent = word;
    popEl.classList.toggle('is-flip', !!flip);
    popEl.classList.toggle('is-end', !!end);
    popEl.hidden = false;
    popWord.style.animation = 'none';
    void popWord.offsetWidth;
    popWord.style.animation = '';
    popTimer = setTimeout(hidePop, end ? 1600 : 1300);
  }
  function hidePop() { clearTimeout(popTimer); popEl.hidden = true; }

  // ---------- コンピュータの ばん ----------
  function cpuTurn() {
    G.thinking = true;
    render();
    var tok = G.token;
    var wait = G.level === 'strong' ? 250 : 550;
    setTimeout(function () {
      if (!G || tok !== G.token || G.over) return;
      var m = S.bestMove(G.s, G.level);
      if (!G || tok !== G.token) return;
      G.thinking = false;
      if (m < 0) return;
      doMove(m);
    }, wait);
  }

  // ---------- おわり ----------
  function finish(winner, reason) {
    G.over = true;
    G.winner = winner;
    G.reason = reason;
    G.legal = [];
    if (!G.counted) { tally.w[winner]++; tally.games++; G.counted = true; }
    var tok = G.token;
    if (reason === 'rep') {
      sDraw();
      showPop('ひきわけ', false, true);
      setMsg('おなじ かたちが 4かい でたので ひきわけ（せんにちて）だよ');
    } else {
      showPop(reason === 'mate' ? 'つみ！' : 'おわり', false, true);
      var line = reason === 'mate' ? 'つみ！ ' : 'うごかせる こまが ないよ。';
      if (G.players === 1) {
        if (winner === G.human) { sWin(); setMsg(line + 'あいての おうを つかまえたよ。あなたの かち！'); }
        else { sLose(); setMsg(line + '「まった」で もどして、もういちど かんがえて みよう'); }
      } else {
        sWin();
        setMsg(line + NAMES[winner] + 'の かち！');
      }
      if (winner && (G.players === 2 || winner === G.human)) {
        setTimeout(function () { if (G && tok === G.token) sparkle(turnPiece); }, 200);
      }
    }
    render();
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
    if (G.asking) { hidePromo(); setMsg('うごかしたい こまを タップしてね'); render(); return; }
    var n = undoCount();
    if (!n) return;
    unlockAudio();
    G.token++;                     // かんがえちゅう なら やめる
    G.thinking = false;
    hidePop();
    if (G.over) {
      if (G.counted) { tally.w[G.winner]--; tally.games--; G.counted = false; }
      G.over = false; G.winner = 0; G.reason = '';
    }
    var h = null;
    for (var i = 0; i < n; i++) { h = G.hist.pop(); G.keys.pop(); }
    G.s = h.s;
    G.last = h.last;
    clearHint();
    sUndo();
    setMsg(G.players === 1 && n > 1 ? 'あなたの 手と コンピュータの 手を もどしたよ' : '1て もどしたよ');
    var s = G.s;
    G.legal = S.legal(s);
    G.sel = null;
    G.dests = null;
    G.check = S.inCheck(s);
    render();
    if (G.players === 1 && s.turn === G.cpu) cpuTurn();
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
    setMsg('かんがえて いるよ…');
    hintBtn.disabled = true;
    var tok = G.token, len = G.hist.length;
    setTimeout(function () {
      if (!G || tok !== G.token || len !== G.hist.length || G.over) return;
      var h = S.hint(G.s);
      if (!h) { render(); return; }
      G.hint = h;
      G.sel = null;
      G.dests = null;
      hintBtn.setAttribute('aria-pressed', 'true');
      var t = h.drop || Math.abs(G.s.b[h.from]);
      var text = h.inCheck ? 'おうて されて いるよ。' : '';
      if (h.mate) text += '★に うごかすと つみ！ かてるよ';
      else if (h.cap) text += q(t) + 'で ★の あいての ' + q(h.cap) + 'を とれるよ';
      else if (h.drop) text += 'もちごまの ' + q(t) + 'を ★に うつと よさそうだよ';
      else if (h.check) text += q(t) + 'を ★に うごかすと おうてが かけられるよ';
      else text += q(t) + 'を ★に うごかすと よさそうだよ';
      if (h.promo && !h.mate) text += '。なると つよく なるよ';
      if (h.danger.some(function (x) { return x !== h.from; })) text += '。あかい わの こまが ねらわれて いるよ';
      setMsg(text);
      sHint();
      render();
    }, 40);
  }
  function drawHint() {
    layers.hint.innerHTML = '';
    var h = G && G.hint;
    if (!h) return;
    var c = G.s.turn;
    h.danger.forEach(function (sq) {
      if (sq === h.from) return;
      var p = sqXY(sq);
      el('circle', { class: 'hint-danger', cx: p[0], cy: p[1], r: 46 }, layers.hint);
      el('circle', { class: 'hint-bang', cx: p[0] + 34, cy: p[1] - 34, r: 15 }, layers.hint);
      el('text', { class: 'hint-bang-t', x: p[0] + 34, y: p[1] - 33 }, layers.hint).textContent = '!';
    });
    var f = h.from >= 0 ? sqXY(h.from) : slotXY(c, h.drop);
    el('rect', { class: 'hint-from', x: f[0] - 46, y: f[1] - 46, width: 92, height: 92, rx: 12 }, layers.hint);
    var p = sqXY(h.to);
    el('circle', { class: 'hint-best', cx: p[0], cy: p[1], r: 42 }, layers.hint);
    el('path', { class: 'hint-star', d: starPath(p[0], p[1], 26, 11) }, layers.hint);
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
  function sqRect(layer, sq, cls) {
    var p = sqXY(sq);
    el('rect', { class: cls, x: p[0] - CELL / 2 + 2, y: p[1] - CELL / 2 + 2, width: CELL - 4, height: CELL - 4 }, layer);
  }
  function render() {
    if (!G || !L) return;
    var s = G.s, n = G.n, t = s.turn, i;
    // しるし（さいごの て・えらんだ こま・おうて）
    layers.hl.innerHTML = '';
    if (G.last) {
      if (G.last.from >= 0) sqRect(layers.hl, G.last.from, 'hl-from');
      sqRect(layers.hl, G.last.to, 'hl-last');
    }
    if (G.sel && G.sel.from !== undefined) sqRect(layers.hl, G.sel.from, 'hl-sel');
    if (G.over && G.reason === 'mate') sqRect(layers.hl, s.k[s.turn], 'hl-mate');
    else if (G.check && !G.over) sqRect(layers.hl, s.k[t], 'hl-check');
    // こま
    layers.pieces.innerHTML = '';
    pieceEls = {};
    for (i = 0; i < n * n; i++) {
      var p = s.b[i];
      if (!p) continue;
      var xy = sqXY(i);
      var sel = G.sel && G.sel.from === i;
      pieceEls[i] = drawPiece(layers.pieces, Math.abs(p), p > 0 ? 1 : 2, xy[0], xy[1], 1, 0, sel ? 'is-sel' : '');
    }
    // もちごま
    layers.label.innerHTML = '';
    [1, 2].forEach(function (c) {
      var any = false;
      L.order.forEach(function (ht) {
        var k = s.h[c][ht];
        if (!k) return;
        any = true;
        var xy = slotXY(c, ht);
        var sel = G.sel && G.sel.drop === ht && c === t;
        drawPiece(layers.pieces, ht, c, xy[0], xy[1], 0.9, k, sel ? 'is-sel' : '');
      });
      if (!any) {
        var r = standOf(c).rect, cxp = r.x + r.w / 2, cyp = r.y + r.h / 2;
        var lab = el('text', { class: 'stand-label', x: cxp, y: cyp }, layers.label);
        if (r.h > r.w) lab.setAttribute('transform', 'rotate(' + (c === topC ? 90 : -90) + ' ' + cxp + ' ' + cyp + ')');
        else if (c === topC) lab.setAttribute('transform', 'rotate(180 ' + cxp + ' ' + cyp + ')');
        lab.textContent = 'もちごま';
      }
    });
    // うごける ところ
    layers.dest.innerHTML = '';
    if (G.dests && canHumanMove()) {
      Object.keys(G.dests).forEach(function (k) {
        var sq = Number(k), xy = sqXY(sq);
        if (s.b[sq]) el('circle', { class: 'dest-cap', cx: xy[0], cy: xy[1], r: 44 }, layers.dest);
        else {
          sqRect(layers.dest, sq, 'dest-sq');
          el('circle', { class: 'dest', cx: xy[0], cy: xy[1], r: 15 }, layers.dest);
        }
      });
    }
    drawHint();
    // どちらの ばんか
    var humanNow = !G.over && isHumanTurn();
    board.classList.toggle('is-off', !(humanNow && !G.anim && !G.thinking));
    turnEl.className = 'turn';
    var text, icon = t;
    if (G.over) {
      turnEl.classList.add('is-end');
      if (!G.winner) text = 'ひきわけ';
      else if (G.players === 1) text = G.winner === G.human ? 'あなたの かち！' : 'コンピュータの かち';
      else text = NAMES[G.winner] + 'の かち！';
      icon = G.winner || t;
    } else if (G.players === 1) {
      if (t === G.human) {
        turnEl.classList.add(G.check ? 'is-check' : 'is-me');
        text = 'あなたの ばん<small>' + (G.check ? 'おうて されて いるよ！' : 'あなたは ' + NAMES[t]) + '</small>';
      } else {
        text = 'コンピュータの ばん<small class="thinking">かんがえちゅう<i>・</i><i>・</i><i>・</i></small>';
      }
    } else {
      turnEl.classList.add(G.check ? 'is-check' : 'is-me');
      text = NAMES[t] + 'の ばん<small>' + (G.check ? 'おうて されて いるよ！' : (t === bottomC ? 'したの ひと' : 'うえの ひと')) + '</small>';
    }
    turnPiece.innerHTML = pieceSvg(OU, icon, G.players === 2 && icon === topC, false);
    turnText.innerHTML = nw(text);
    undoBtn.disabled = G.anim || !undoCount();
    hintBtn.disabled = !(humanNow && !G.anim && !G.thinking && !G.asking);
    endBtns.hidden = !G.over;
    if (tally && tally.games) {
      tallyEl.innerHTML = G.players === 1
        ? 'あなた <b>' + tally.w[G.human] + '</b> かち ・ コンピュータ <b>' + tally.w[G.cpu] + '</b> かち'
        : 'せんて <b>' + tally.w[1] + '</b> かち ・ ごて <b>' + tally.w[2] + '</b> かち';
    } else {
      tallyEl.innerHTML = '';
    }
    if (G.players === 2) renderBars();
  }
  // ふたりで：それぞれの ひとに むけた ことば
  function renderBars() {
    [[barTop, topC], [barBot, bottomC]].forEach(function (a) {
      var bar = a[0], p = a[1], cls = '', text;
      if (G.over) {
        if (!G.winner) text = 'ひきわけ';
        else if (G.winner === p) { text = 'かち！'; cls = 'is-win'; }
        else text = 'まけ';
      } else if (G.s.turn === p) {
        if (G.check) { text = 'おうて！ おうを まもろう'; cls = 'is-check'; }
        else { text = 'あなたの ばん'; cls = 'is-turn'; }
      } else {
        text = 'あいての ばん';
      }
      bar.className = 'bar ' + (bar === barTop ? 'bar-top' : 'bar-bot') + (cls ? ' ' + cls : '');
      bar.innerHTML = nw(NAMES[p] + '：' + text);
    });
  }

  // ---------- こまの うごきかた ----------
  var DESC = {};
  DESC[OU] = 'まわり 8つの どこへでも 1つ。とられたら まけ（ならない）';
  DESC[HI] = 'たて・よこに どこまでも';
  DESC[RY] = 'ひしゃ ＋ ななめに 1つ';
  DESC[KA] = 'ななめに どこまでも';
  DESC[UM] = 'かく ＋ たて・よこに 1つ';
  DESC[KI] = 'ななめ うしろ いがいに 1つ（ならない）';
  DESC[GI] = 'まえと ななめに 1つ（よこと まうしろは だめ）';
  DESC[KE] = 'まえの ななめへ とぶ。こまを とびこえられる';
  DESC[KY] = 'まえに どこまでも（うしろには もどれない）';
  DESC[FU] = 'まえに 1つ';
  DESC[NG] = DESC[NK] = DESC[NY] = DESC[TO] = 'きんと おなじ';
  function diagram(t) {
    var C = 50, s = '<svg class="how-dia" viewBox="0 0 250 250" aria-hidden="true"><rect class="dia-bg" width="250" height="250" rx="8"/>';
    var d, k;
    var cell = function (r, c, cls) {
      return '<rect class="' + cls + '" x="' + (c * C + 3) + '" y="' + (r * C + 3) + '" width="' + (C - 6) + '" height="' + (C - 6) + '" rx="6"/>';
    };
    var arrows = '', dots = '';
    for (d = 0; d < 8; d++) {
      var dr = S.DR[d], dc = S.DC[d];
      if (S.SLIDE0[t] >> d & 1) {
        for (k = 1; k <= 2; k++) s += cell(2 + dr * k, 2 + dc * k, 'dia-ray');
        var x1 = 125 + dc * 30, y1 = 125 + dr * 30, x2 = 125 + dc * 118, y2 = 125 + dr * 118;
        var len = Math.sqrt(dr * dr + dc * dc), ux = dc / len, uy = dr / len;
        arrows += '<path class="dia-arrow" d="M' + x1 + ' ' + y1 + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) +
          'M' + (x2 - ux * 18 - uy * 12).toFixed(1) + ' ' + (y2 - uy * 18 + ux * 12).toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) +
          'L' + (x2 - ux * 18 + uy * 12).toFixed(1) + ' ' + (y2 - uy * 18 - ux * 12).toFixed(1) + '"/>';
      } else if (S.STEP0[t] >> d & 1) {
        dots += '<circle class="dia-dot" cx="' + (125 + dc * C) + '" cy="' + (125 + dr * C) + '" r="14"/>';
      }
    }
    if (t === KE) {
      dots += '<circle class="dia-dot" cx="75" cy="25" r="14"/><circle class="dia-dot" cx="175" cy="25" r="14"/>';
    }
    var grid = '';
    for (k = 1; k < 5; k++) grid += 'M' + k * C + ' 0V250M0 ' + k * C + 'H250';
    s += '<path class="dia-line" d="' + grid + '"/>' + arrows + dots;
    s += '<g transform="translate(125 125) scale(0.46)">' + pieceInner(t, 1, false) + '</g></svg>';
    return s;
  }
  function howOne(t) {
    return '<div class="how-one"><div class="how-row"><span class="turn-piece" aria-hidden="true">' + pieceSvg(t, 1, false, false) + '</span>' +
      '<span class="how-name">' + KANJI[t] + '<small>' + YOMI[t] + '</small></span></div>' + diagram(t) +
      '<p class="how-desc' + (t >= TO ? ' is-pro' : '') + '">' + nw(DESC[t]) + '</p></div>';
  }
  function buildHow() {
    var kind = G ? G.kind : rec.kind;
    var list = kind === 'mini' ? [OU, HI, KA, KI, GI, FU] : [OU, HI, KA, KI, GI, KE, KY, FU];
    var html = '<div class="how-grid">';
    list.forEach(function (t) {
      html += '<div class="how-card"><div class="how-pair">' + howOne(t);
      if (S.PROM[t]) html += '<div class="how-arrow">なると<br>→</div>' + howOne(S.PROM[t]);
      html += '</div></div>';
    });
    html += '</div>';
    var rules = [
      'あいての おうを にげられなく したら かち（つみ）',
      'あいての こまの ところに うごくと、その こまを とれる。とった こまは「もちごま」に なる',
      'もちごまは、じぶんの ばんに あいている ところへ うてる（もちごまを タップしてから、ひかった ところを タップ）',
      'あいての じんち（ばんの いろの こい ところ）に はいる・そこで うごく・そこから でる ときに「なる」ことが できる。' +
        'なると うらがえって うごきかたが かわる（きん・おうは ならない）',
      'おうてを かけられたら、おうを にげるか、あいだに こまを いれるか、おうてを かけた こまを とる',
      'はんそく（できない こと）：にふ（じぶんの ふが ある たての れつに ふを うつ）・うちふづめ（ふを うって つみに する）・' +
        'うごけなく なる ところに こまを うつ・おうが とられる ところに うごく',
      'おなじ かたちが 4かい でたら ひきわけ（せんにちて）'
    ];
    html += '<p class="how-h">しょうぎの きまり</p><ul class="how-rules">' +
      rules.map(function (r) { return '<li>' + nw(r) + '</li>'; }).join('') + '</ul>';
    $('howBody').innerHTML = html;
  }
  function openHow() {
    unlockAudio();
    buildHow();
    $('howDlg').classList.remove('is-flip');
    $('howFlipBtn').hidden = !(G && G.players === 2);
    howEl.hidden = false;
    $('howBody').scrollTop = 0;
    $('howClose').focus({ preventScroll: true });
  }
  function closeHow() {
    howEl.hidden = true;
    if (G) render();
  }
  $('howBtn').addEventListener('click', openHow);
  $('howBtn0').addEventListener('click', openHow);
  $('howClose').addEventListener('click', closeHow);
  $('howFlipBtn').addEventListener('click', function () { $('howDlg').classList.toggle('is-flip'); });
  howEl.addEventListener('click', function (e) { if (e.target === howEl) closeHow(); });

  // ---------- はじめの がめん ----------
  function showStart() {
    if (G) G.token++;
    G = null;
    tally = null;
    playEl.hidden = true;
    quitEl.hidden = true;
    howEl.hidden = true;
    startEl.hidden = false;
    hidePop();
    promoEl.hidden = true;
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
    mark('.kind', 'data-kind', rec.kind);
    mark('.level', 'data-level', rec.level);
    mark('.first', 'data-first', rec.first);
    mark('.yomi', 'data-yomi', rec.yomi ? 1 : 0);
    $('secLevel').hidden = rec.players !== 1;
    $('secFirst').hidden = rec.players !== 1;
    $('note').textContent = rec.players === 1
      ? (rec.first === 'me' ? 'あなたが せんて です。あなたから さします。あなたの こまは したがわ です。'
        : 'コンピュータが せんて です。コンピュータから さします。あなたの こまは したがわ です。')
      : 'iPad を ふたりの あいだに おいて、むかいあって あそびます。せんて（したの ひと）から さします。';
  }
  function bindChoice(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
      b.addEventListener('click', function () { unlockAudio(); fn(b); save(); renderStart(); });
    });
  }
  bindChoice('.who', function (b) { rec.players = b.getAttribute('data-players') === '2' ? 2 : 1; });
  bindChoice('.kind', function (b) { rec.kind = b.getAttribute('data-kind') === 'hon' ? 'hon' : 'mini'; });
  bindChoice('.level', function (b) { rec.level = b.getAttribute('data-level'); });
  bindChoice('.first', function (b) { rec.first = b.getAttribute('data-first'); });
  bindChoice('.yomi', function (b) { rec.yomi = b.getAttribute('data-yomi') === '1'; });
  Array.prototype.forEach.call(document.querySelectorAll('.yomi'), function (b) {
    b.querySelector('.yomi-pic').innerHTML = pieceSvg(GI, 1, false, b.getAttribute('data-yomi') === '1');
  });
  $('goBtn').addEventListener('click', function () { unlockAudio(); newGame(); });

  undoBtn.addEventListener('click', undo);
  hintBtn.addEventListener('click', showHint);
  $('againBtn').addEventListener('click', function () { unlockAudio(); newGame(); });
  $('toStartBtn').addEventListener('click', showStart);

  // がめんの 大きさが かわったら ならべなおす
  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      if (!G || playEl.hidden || G.anim) return;
      buildBoard();
      render();
    });
  });

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
      if (!howEl.hidden) closeHow();
      else if (!quitEl.hidden) closeQuit();
      else if (inGame()) openQuit();
    }
  });

  // あそんでいる とちゅうは、新しい版への 切りかえで 再読み込み しない
  window.kyozaiBusy = function () { return inGame(); };

  renderSound();
  renderStart();
})();
