// しんけいすいじゃく
(function () {
  'use strict';

  var Art = window.ShinkeiArt;

  // ---------- むずかしさ ----------
  var LEVELS = {
    easy:   { name: 'やさしい',   pairs: 8,  cols: 4, rows: 4, kind: 'animal', aMin: 0.8,  aMax: 1.0 },
    normal: { name: 'ふつう',     pairs: 16, cols: 8, rows: 4, kind: 'food',   aMin: 0.78, aMax: 1.0 },
    hard:   { name: 'むずかしい', pairs: 32, cols: 8, rows: 8, kind: 'trump',  aMin: 0.68, aMax: 0.9 }
  };
  var MISS_WAIT = 1000;        // ちがった ときに 裏に もどすまで（ミリ秒）

  // ---------- ほぞん（この iPad の中だけ） ----------
  var STORE_KEY = 'shinkei-v1';
  var canSave = true;
  var rec = { level: 'easy', players: 1, sound: true, best: {} };
  (function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canSave = false; }
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      if (LEVELS[d.level]) rec.level = d.level;
      if (d.players === 2) rec.players = 2;
      rec.sound = d.sound !== false;
      if (d.best && typeof d.best === 'object') {
        Object.keys(LEVELS).forEach(function (k) {
          var b = d.best[k];
          if (b && b.moves > 0) rec.best[k] = { moves: b.moves | 0, time: b.time | 0, date: b.date || '' };
        });
      }
    } catch (e) {}
  })();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(rec)); } catch (e) { canSave = false; }
  }

  // ---------- 音（音の ファイルは使わず、その場で作る） ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
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
    tone(t, freq * 3, vol * 0.04, 0.4);
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
  // めくる：小さな「ぽ」
  function sFlip() { play(function (t) { tone(t, 660, 0.07, 0.12, 'triangle'); }); }
  // そろった：やさしい「ピン・ポン」
  function sMatch() { play(function (t) { bell(t, 784, 0.13); bell(t + 0.16, 1175, 0.11); }); }
  // ちがった：ひくい ひかえめな音
  function sMiss() { play(function (t) { tone(t, 330, 0.06, 0.25, 'sine'); tone(t + 0.12, 262, 0.05, 0.3, 'sine'); }); }
  // ぜんぶ そろった：ド・ミ・ソ・ド
  function sClear() {
    play(function (t) { [523, 659, 784, 1047].forEach(function (f, i) { bell(t + i * 0.17, f, 0.12); }); });
  }

  // ---------- べんりな もの ----------
  function $(id) { return document.getElementById(id); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function clock(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s %= 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function clockWords(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s %= 60;
    return (m ? m + 'ふん ' : '') + s + 'びょう';
  }

  // ---------- がめんの ぶひん ----------
  var startEl = $('start'), playEl = $('play'), board = $('board');
  var statsEl = $('stats'), playersEl = $('players');
  var movesV = $('movesV'), timeV = $('timeV');
  var p1 = $('p1'), p2 = $('p2'), p1v = $('p1v'), p2v = $('p2v');
  var clearEl = $('clearEl'), quitEl = $('quitEl');
  var fx = $('fx');

  // ---------- あそびの じょうたい ----------
  var G = null;
  // G = { level, L, players, cards:[{item, el, open, done}], opened:[], lock, moves, found, turn, scores, over,
  //       startAt, acc, running }

  function itemsFor(L) {
    if (L.kind === 'animal') return Art.animals().slice(0, L.pairs);
    if (L.kind === 'food') return Art.foods().slice(0, L.pairs);
    return shuffle(Art.trumps()).slice(0, L.pairs);   // 52しゅるいから ランダムに 32
  }

  function newGame() {
    var L = LEVELS[rec.level];
    var items = itemsFor(L);
    var deck = shuffle(items.concat(items));
    clearTimeout(missTimer);
    G = {
      level: rec.level, L: L, players: rec.players,
      cards: [], opened: [], lock: false, moves: 0, found: 0,
      turn: 0, scores: [0, 0], over: false,
      startAt: 0, acc: 0, running: false, started: false
    };
    board.innerHTML = '';
    board.className = 'board kind-' + L.kind;
    deck.forEach(function (item, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.setAttribute('aria-label', 'カード ' + (i + 1));
      b.innerHTML = '<span class="card-inner"><span class="card-back"></span>' +
        '<span class="card-face">' + item.html + '</span></span>';
      b.addEventListener('click', function () { tap(i); });
      board.appendChild(b);
      G.cards.push({ item: item, el: b, open: false, done: false });
    });

    startEl.hidden = true;
    playEl.hidden = false;
    statsEl.hidden = false;
    playersEl.hidden = G.players !== 2;
    document.body.classList.add('is-playing');
    clearEl.hidden = true;
    quitEl.hidden = true;
    renderStatus();
    layout();
  }

  // ---------- ならべかた（スクロール なしで 画面に おさめる） ----------
  function layout() {
    if (!G) return;
    var L = G.L;
    var cols = L.cols, rows = L.rows;
    // 上の帯が 1れつに 入るか しらべる（入らなければ ふたりの ペアの数を 2だんめに）
    var header = $('header');
    header.classList.remove('two-rows');
    if (G.players === 2 && Math.max(playersEl.offsetTop, soundBtn.offsetTop) > $('homeBtn').offsetTop + 10) header.classList.add('two-rows');
    var W = board.clientWidth, H = board.clientHeight;
    if (!W || !H) return;
    // ふつう：たてむきの 画面では 4×8
    if (cols !== rows && H > W) { var t = cols; cols = rows; rows = t; }
    var gap = Math.round(Math.max(4, Math.min(14, Math.min(W / cols, H / rows) * 0.08)));
    var cellW = (W - gap * (cols - 1)) / cols;
    var cellH = (H - gap * (rows - 1)) / rows;
    var w = Math.min(cellW, cellH * L.aMax);
    var h = Math.min(cellH, w / L.aMin);
    w = Math.floor(w); h = Math.floor(h);
    board.style.gridTemplateColumns = 'repeat(' + cols + ', ' + w + 'px)';
    board.style.gridTemplateRows = 'repeat(' + rows + ', ' + h + 'px)';
    board.style.gap = gap + 'px';
    board.style.setProperty('--cw', w + 'px');
    board.style.setProperty('--ch', h + 'px');
  }
  var layoutReq = 0;
  function requestLayout() {
    cancelAnimationFrame(layoutReq);
    layoutReq = requestAnimationFrame(layout);
  }
  window.addEventListener('resize', requestLayout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });

  // ---------- じかん ----------
  function elapsed() { return G ? G.acc + (G.running ? Date.now() - G.startAt : 0) : 0; }
  function timerStart() {
    if (!G || G.running || G.over) return;
    G.started = true;
    G.running = true;
    G.startAt = Date.now();
  }
  function timerStop() {
    if (!G || !G.running) return;
    G.acc += Date.now() - G.startAt;
    G.running = false;
  }
  setInterval(function () {
    if (G && G.running) timeV.textContent = clock(elapsed());
  }, 250);

  function renderStatus() {
    movesV.textContent = G.moves;
    timeV.textContent = clock(elapsed());
    if (G.players === 2) {
      p1v.textContent = G.scores[0];
      p2v.textContent = G.scores[1];
      p1.classList.toggle('is-turn', !G.over && G.turn === 0);
      p2.classList.toggle('is-turn', !G.over && G.turn === 1);
    }
  }

  // ---------- めくる ----------
  var missTimer = 0;
  function setOpen(c, on) {
    c.open = on;
    c.el.classList.toggle('is-open', on);
    c.el.setAttribute('aria-label', on ? c.item.label : 'カード ' + (G.cards.indexOf(c) + 1));
  }

  function tap(i) {
    if (!G || G.over || G.lock || !quitEl.hidden) return;
    var c = G.cards[i];
    if (c.open || c.done) return;
    unlockAudio();
    if (!G.started) timerStart();
    setOpen(c, true);
    sFlip();
    G.opened.push(c);
    if (G.opened.length < 2) return;

    G.moves++;
    var a = G.opened[0], b = G.opened[1];
    G.opened = [];
    if (a.item.id === b.item.id) {
      // そろった：表のまま のこす
      a.done = b.done = true;
      G.found++;
      var by = G.players === 2 ? ' by' + (G.turn + 1) : '';
      a.el.className += ' is-done' + by;
      b.el.className += ' is-done' + by;
      a.el.setAttribute('aria-disabled', 'true');
      b.el.setAttribute('aria-disabled', 'true');
      if (G.players === 2) G.scores[G.turn]++;   // そろったら、おなじ ひとが もう いちど
      setTimeout(function () { sMatch(); sparkle(a.el); sparkle(b.el); }, 280);
      if (G.found === G.L.pairs) finish();
    } else {
      // ちがった：1びょう あとに 裏に もどす
      G.lock = true;
      setTimeout(sMiss, 300);
      missTimer = setTimeout(function () {
        if (!G) return;
        setOpen(a, false);
        setOpen(b, false);
        G.lock = false;
        if (G.players === 2) G.turn = 1 - G.turn;
        renderStatus();
      }, MISS_WAIT);
    }
    renderStatus();
  }

  // ---------- キラキラ ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STAR = '<svg viewBox="0 0 20 20"><path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6Z" fill="#f2c23f" stroke="#fff" stroke-width="1"/></svg>';
  function sparkle(el) {
    if (reduceMotion) return;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var n = 7, dist = Math.max(r.width, r.height) * 0.6;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      var ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      var d = dist * (0.7 + Math.random() * 0.4);
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * d + 'px');
      var size = 12 + Math.random() * 10;
      s.style.width = s.style.height = size + 'px';
      s.innerHTML = STAR;
      fx.appendChild(s);
      setTimeout(function (x) { return function () { x.remove(); }; }(s), 900);
    }
  }

  // ---------- ぜんぶ そろった ----------
  function finish() {
    timerStop();
    G.over = true;
    var time = G.acc;
    var newRecord = false;
    var best = rec.best[G.level];
    if (G.players === 1) {
      if (!best || G.moves < best.moves) {
        var d = new Date();
        rec.best[G.level] = { moves: G.moves, time: time, date: d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() };
        newRecord = true;
        save();
      }
    }
    renderStatus();

    setTimeout(function () {
      if (!G || !G.over) return;
      $('maru').innerHTML = hanamaruSvg();
      $('cMoves').textContent = G.moves;
      $('cTime').textContent = clockWords(time);
      $('newRec').hidden = !newRecord;
      var who = $('clearWho');
      if (G.players === 2) {
        who.hidden = false;
        var s = G.scores;
        who.textContent = s[0] === s[1] ? 'ひきわけ！（' + s[0] + ' ペア と ' + s[1] + ' ペア）'
          : (s[0] > s[1] ? 'ひとりめ' : 'ふたりめ') + 'の かち！（' + s[0] + ' ペア と ' + s[1] + ' ペア）';
      } else {
        who.hidden = true;
      }
      var b = rec.best[G.level];
      $('bestLine').textContent = G.players === 1 && b
        ? G.L.name + ' の いちばん：' + b.moves + 'かい'
        : (G.players === 2 ? 'ふたりで のときは きろくは のこりません' : '');
      clearEl.hidden = false;
      sClear();
      $('againBtn').focus({ preventScroll: true });
    }, 900);
  }

  // はなまる（ぐるぐる と はなびら）
  function hanamaruSvg() {
    var d = '', n = 9, R = 40, i;
    for (i = 0; i <= n; i++) {
      var a = i / n * Math.PI * 2 - Math.PI / 2;
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

  // ---------- はじめの がめん ----------
  function showStart() {
    clearTimeout(missTimer);
    if (G) timerStop();
    G = null;
    board.innerHTML = '';
    playEl.hidden = true;
    statsEl.hidden = true;
    playersEl.hidden = true;
    clearEl.hidden = true;
    quitEl.hidden = true;
    startEl.hidden = false;
    document.body.classList.remove('is-playing');
    $('header').classList.remove('two-rows');
    renderStart();
  }

  function renderStart() {
    Array.prototype.forEach.call(document.querySelectorAll('.level'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.level === rec.level));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.who'), function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.players) === rec.players));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-best]'), function (s) {
      var b = rec.best[s.dataset.best];
      s.textContent = b ? 'いちばん ' + b.moves + 'かい' : '';
    });
    $('whoNote').textContent = rec.players === 2
      ? 'こうたいで めくります。そろったら もう いちど めくれます。'
      : 'めくった かいすうの きろくが のこります。';
    $('saveWarn').hidden = canSave;
  }

  Array.prototype.forEach.call(document.querySelectorAll('.level'), function (b) {
    b.addEventListener('click', function () {
      unlockAudio();
      rec.level = b.dataset.level;
      save();
      renderStart();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.who'), function (b) {
    b.addEventListener('click', function () {
      unlockAudio();
      rec.players = Number(b.dataset.players) === 2 ? 2 : 1;
      save();
      renderStart();
    });
  });
  $('goBtn').addEventListener('click', function () { unlockAudio(); newGame(); });

  // えらぶ ボタンの 絵
  $('picEasy').innerHTML = Art.animalSvg(0);
  $('picNormal').innerHTML = Art.foodSvg(0);
  $('picHard').innerHTML = '<span class="mini-trump">' + Art.trumps()[13].html + '</span>';   // ハートの A

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
    if (rec.sound) { unlockAudio(); sFlip(); }
  });

  // ---------- もくじ・やめる？ ----------
  function inGame() { return !!(G && !G.over && (G.started || G.opened.length)); }
  function openQuit() {
    timerStop();
    quitEl.hidden = false;
    $('resumeBtn').focus({ preventScroll: true });
  }
  function closeQuit() {
    quitEl.hidden = true;
    if (G && G.started && !G.over) timerStart();
  }
  $('homeBtn').addEventListener('click', function (e) {
    if (inGame()) {
      e.preventDefault();
      openQuit();
    }
  });
  $('resumeBtn').addEventListener('click', closeQuit);
  $('quitStartBtn').addEventListener('click', showStart);
  $('againBtn').addEventListener('click', function () { unlockAudio(); newGame(); });
  $('toStartBtn').addEventListener('click', showStart);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!quitEl.hidden) closeQuit();
    else if (inGame()) openQuit();
  });

  // ほかの アプリに かえている あいだは じかんを とめる
  document.addEventListener('visibilitychange', function () {
    if (!G || G.over || !G.started) return;
    if (document.visibilityState === 'hidden') timerStop();
    else if (quitEl.hidden) timerStart();
  });

  // あそんでいる とちゅうは、新しい版への 切りかえで 再読み込み しない
  window.kyozaiBusy = function () { return inGame(); };

  renderSound();
  renderStart();
})();
