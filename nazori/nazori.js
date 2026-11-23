(function () {
  'use strict';

  var DATA = window.NAZORI_STROKES || {};
  var SVGNS = 'http://www.w3.org/2000/svg';

  // ---------- もじの 一覧（null は空きマス。1行が「あいうえお」） ----------
  var HIRA = [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の'],
    ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も'],
    ['や', null, 'ゆ', null, 'よ'],
    ['ら', 'り', 'る', 'れ', 'ろ'],
    ['わ', null, null, null, 'を'],
    ['ん', null, null, null, null]
  ];
  var KATA = HIRA.map(function (row) {
    return row.map(function (c) { return c && String.fromCharCode(c.charCodeAt(0) + 0x60); });
  });
  var NUM = [
    ['0', '1', '2', '3', '4'],
    ['5', '6', '7', '8', '9']
  ];
  var SETS = { hira: HIRA, kata: KATA, num: NUM };

  var NUM_READ = ['ぜろ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

  // 読み上げる ことば（カタカナは ひらがなに して読む。「を」は「お」と読む）
  function reading(ch) {
    if (/[0-9]/.test(ch)) return NUM_READ[+ch];
    var c = ch.charCodeAt(0);
    if (c >= 0x30a1 && c <= 0x30f6) ch = String.fromCharCode(c - 0x60);
    return ch === 'を' ? 'お' : ch;
  }

  // ---------- 読み上げ（ほかの教材と同じ） ----------
  var notice = document.getElementById('notice');
  var synth = window.speechSynthesis;
  var jaVoice = null;
  var currentU = null;

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

  function speak(text) {
    if (!synth) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.8;
    u.pitch = 1;
    u.volume = 1;
    currentU = u; // 途中で消えないように持っておく
    synth.cancel();
    synth.speak(u);
  }

  // ---------- 音（音のファイルは使わず、その場で作る） ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;

  // iPad では、さわったときに音の準備をしておかないと、あとで鳴らせない
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

  // 1画 なぞれた：小さな「ポン」
  function strokeSound() { playNotes([[0, 660, 0.06]]); }
  // ぜんぶ なぞれた：やさしい「ピン・ポン・ピン」（ひかえめな音量）
  function doneSound() { playNotes([[0, 784, 0.15], [0.22, 1047, 0.13], [0.44, 1319, 0.1]]); }

  // ---------- 線の ふとさ ----------
  var thinBtn = document.getElementById('thinBtn');
  var thickBtn = document.getElementById('thickBtn');
  var thick = false;
  try { thick = localStorage.getItem('nazori-thick') === '1'; } catch (e) {}

  function inkWidth() { return thick ? 8 : 5; }
  function guideWidth() { return thick ? 14 : 11; }

  function setThick(on) {
    thick = on;
    thinBtn.setAttribute('aria-pressed', String(!on));
    thickBtn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('nazori-thick', on ? '1' : '0'); } catch (e) {}
    applyWidths();
  }
  thinBtn.addEventListener('click', function () { setThick(false); });
  thickBtn.addEventListener('click', function () { setThick(true); });

  // ---------- なぞれた もじ（この iPad の中に保存） ----------
  var doneSet = {};
  try { doneSet = JSON.parse(localStorage.getItem('nazori-done') || '{}') || {}; } catch (e) { doneSet = {}; }
  function markDone(ch) {
    doneSet[ch] = 1;
    try { localStorage.setItem('nazori-done', JSON.stringify(doneSet)); } catch (e) {}
  }

  // ---------- いちらん ----------
  var listView = document.getElementById('listView');
  var traceView = document.getElementById('traceView');
  var charsBox = document.getElementById('chars');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var setName = 'hira';

  function flat(name) {
    var out = [];
    SETS[name].forEach(function (row) {
      row.forEach(function (c) { if (c && DATA[c]) out.push(c); });
    });
    return out;
  }

  function buildList() {
    var rows = SETS[setName];
    charsBox.innerHTML = '';
    charsBox.classList.toggle('is-num', setName === 'num');
    charsBox.style.setProperty('--cols', String(rows.length + 1));
    var frag = document.createDocumentFragment();
    rows.forEach(function (row, g) {
      row.forEach(function (c, d) {
        if (!c || !DATA[c]) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'char' + (doneSet[c] ? ' is-done' : '');
        b.textContent = c;
        b.dataset.ch = c;
        b.style.setProperty('--g', String(g));
        b.style.setProperty('--d', String(d));
        b.setAttribute('aria-label', reading(c) + (doneSet[c] ? '（できた）' : ''));
        frag.appendChild(b);
      });
    });
    charsBox.appendChild(frag);
  }

  charsBox.addEventListener('click', function (e) {
    var b = e.target.closest('.char');
    if (!b) return;
    unlockAudio();
    openChar(b.dataset.ch);
  });

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    listView.setAttribute('aria-labelledby', tab.id);
    setName = tab.dataset.set;
    try { localStorage.setItem('nazori-set', setName); } catch (e) {}
    showList();
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  function showList() {
    stopDemo();
    cancelDrawing();
    buildList();
    traceView.hidden = true;
    listView.hidden = false;
    document.body.classList.remove('is-trace');
    window.scrollTo(0, 0);
  }

  // ---------- なぞる がめん ----------
  var board = document.getElementById('board');
  var guideG = document.getElementById('guideG');
  var markG = document.getElementById('markG');
  var inkG = document.getElementById('inkG');
  var demoG = document.getElementById('demoG');
  var hanaG = document.getElementById('hanaG');
  var charLabel = document.getElementById('charLabel');
  var msg = document.getElementById('msg');
  var demoBtn = document.getElementById('demoBtn');
  var clearBtn = document.getElementById('clearBtn');
  var nextBtn = document.getElementById('nextBtn');
  var backBtn = document.getElementById('backBtn');

  guideG.setAttribute('class', 'guide');
  inkG.setAttribute('class', 'ink');
  demoG.setAttribute('class', 'demo');
  hanaG.setAttribute('class', 'hana');

  var ch = null;        // いまの もじ
  var strokes = [];     // { el, len, pts（線の上の点）, mark }
  var cur = 0;          // いま なぞる 画（0から）
  var finished = false;

  function el(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function samplePath(path, len, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var p = path.getPointAtLength(len * i / n);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  function applyWidths() {
    Array.prototype.forEach.call(guideG.childNodes, function (p) { p.setAttribute('stroke-width', guideWidth()); });
    Array.prototype.forEach.call(inkG.childNodes, function (p) { p.setAttribute('stroke-width', inkWidth()); });
  }

  function openChar(c) {
    ch = c;
    listView.hidden = true;
    traceView.hidden = false;
    document.body.classList.add('is-trace');
    charLabel.textContent = c;
    charLabel.setAttribute('aria-label', reading(c) + '（よみを きく）');
    board.setAttribute('aria-label', c + ' を なぞる ところ');
    window.scrollTo(0, 0);
    reset();
  }

  function reset() {
    stopDemo();
    cancelDrawing();
    guideG.innerHTML = '';
    markG.innerHTML = '';
    inkG.innerHTML = '';
    hanaG.innerHTML = '';
    strokes = [];
    cur = 0;
    finished = false;
    var d = DATA[ch];
    d.s.forEach(function (dStr, i) {
      var p = el('path', { d: dStr, 'stroke-width': guideWidth() });
      guideG.appendChild(p);
      var len = p.getTotalLength();
      var pts = samplePath(p, len, Math.max(24, Math.ceil(len / 1.5)));
      // 書きはじめの 点と、書き順の 番号
      var g = el('g', { 'class': 'mark' });
      g.appendChild(el('circle', { cx: pts[0].x, cy: pts[0].y, r: 2.6 }));
      var t = el('text', { x: d.n[i][0], y: d.n[i][1] });
      t.textContent = String(i + 1);
      g.appendChild(t);
      markG.appendChild(g);
      strokes.push({ el: p, len: len, pts: pts, mark: g, d: dStr });
    });
    updateMarks();
    setMsg(guideText(), '');
  }

  function guideText() {
    return strokes.length === 1 ? '●から なぞってね' : (cur + 1) + 'ばんを なぞってね';
  }

  function updateMarks() {
    strokes.forEach(function (s, i) {
      var cls = i < cur ? 'is-done' : (i === cur && !finished ? 'is-now' : '');
      s.el.setAttribute('class', cls);
      s.mark.setAttribute('class', 'mark ' + cls);
    });
    // いまの 画の 番号を いちばん上に
    if (strokes[cur] && !finished) markG.appendChild(strokes[cur].mark);
  }

  function setMsg(text, kind, sub) {
    msg.className = 'stage-text' + (kind ? ' is-' + kind : '');
    msg.textContent = text;
    if (sub) {
      var s = document.createElement('small');
      s.textContent = sub;
      msg.appendChild(s);
    }
  }

  // ---------- ゆびで かく ----------
  var drawing = null;   // { id, type, pts, path }
  var lastPenAt = 0;    // Apple Pencil を さいごに つかった時間（手のひらを むしするため）

  function toBoard(e) {
    var m = board.getScreenCTM();
    if (!m) return null;
    var p = board.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    p = p.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function pathD(pts) {
    var s = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    if (pts.length === 1) s += 'l0.01 0';
    for (var i = 1; i < pts.length; i++) s += 'L' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1);
    return s;
  }

  function cancelDrawing() {
    if (drawing && drawing.path.parentNode) drawing.path.parentNode.removeChild(drawing.path);
    drawing = null;
  }

  board.addEventListener('pointerdown', function (e) {
    if (traceView.hidden) return;
    if (e.pointerType === 'pen') lastPenAt = Date.now();
    // ペンを つかっている あいだは、手のひら（指）を むしする
    if (e.pointerType === 'touch' && Date.now() - lastPenAt < 4000) return;
    if (drawing) {
      if (e.pointerType === 'pen' && drawing.type !== 'pen') cancelDrawing();
      else return;
    }
    e.preventDefault();
    unlockAudio();
    if (demoRun) stopDemo();
    if (finished) return;
    var p = toBoard(e);
    if (!p) return;
    var path = el('path', { 'stroke-width': inkWidth() });
    inkG.appendChild(path);
    drawing = { id: e.pointerId, type: e.pointerType, pts: [p], path: path };
    path.setAttribute('d', pathD(drawing.pts));
    try { board.setPointerCapture(e.pointerId); } catch (err) {}
  });

  board.addEventListener('pointermove', function (e) {
    if (!drawing || e.pointerId !== drawing.id) return;
    e.preventDefault();
    if (e.pointerType === 'pen') lastPenAt = Date.now();
    var list = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    if (!list.length) list = [e];
    list.forEach(function (ev) {
      var p = toBoard(ev);
      if (!p) return;
      var last = drawing.pts[drawing.pts.length - 1];
      if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 0.4) return;
      drawing.pts.push(p);
    });
    drawing.path.setAttribute('d', pathD(drawing.pts));
  });

  function endStroke(e) {
    if (!drawing || e.pointerId !== drawing.id) return;
    if (e.pointerType === 'pen') lastPenAt = Date.now();
    var d = drawing;
    drawing = null;
    if (e.type === 'pointercancel') {
      if (d.path.parentNode) d.path.parentNode.removeChild(d.path);
      return;
    }
    judge(d);
  }
  board.addEventListener('pointerup', endStroke);
  board.addEventListener('pointercancel', endStroke);

  // ---------- はんてい（やさしめ） ----------
  function dist(a, b) { var x = a.x - b.x, y = a.y - b.y; return Math.sqrt(x * x + y * y); }

  function polyLen(pts) {
    var L = 0;
    for (var i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
    return L;
  }

  // 点から 折れ線までの いちばん近い きょり
  function distToPoly(p, pts) {
    var best = Infinity;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var dx = b.x - a.x, dy = b.y - a.y;
      var l2 = dx * dx + dy * dy;
      var t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      var x = a.x + t * dx - p.x, y = a.y + t * dy - p.y;
      var d = Math.sqrt(x * x + y * y);
      if (d < best) best = d;
    }
    if (pts.length === 1) best = dist(p, pts[0]);
    return best;
  }

  // 同じ間かくの 点に ならべなおす
  function resample(pts, n) {
    var L = polyLen(pts);
    if (L === 0 || pts.length < 2) return [pts[0]];
    var step = L / n, out = [pts[0]], acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], seg = dist(a, b);
      while (acc + seg >= step && seg > 0) {
        var t = (step - acc) / seg;
        a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        out.push(a);
        seg = dist(a, b);
        acc = 0;
      }
      acc += seg;
    }
    if (out.length <= n) out.push(pts[pts.length - 1]);
    return out;
  }

  function mean(arr) {
    var s = 0;
    arr.forEach(function (v) { s += v; });
    return arr.length ? s / arr.length : 0;
  }

  // 1つの画と くらべる。{ ok, why（ちがう理由）, score（小さいほど にている） }
  function match(user, s) {
    var tp = s.pts;
    var t0 = tp[0], t1 = tp[tp.length - 1];
    var u0 = user[0], u1 = user[user.length - 1];
    var uLen = polyLen(user);
    var slack = thick ? 3 : 0;              // ふとい線のときは すこし ゆるく
    var dS = dist(u0, t0), dE = dist(u1, t1);
    var us = resample(user, 40);
    var uToT = mean(us.map(function (p) { return distToPoly(p, tp); }));
    var tToU = mean(tp.map(function (p) { return distToPoly(p, us); }));
    var r = { ok: false, why: 'off', score: dS + dE + uToT + tToU };

    if (uLen < Math.min(s.len * 0.35, s.len - 6)) { r.why = 'short'; return r; }
    // 反対むきに かいた
    if (s.len > 12 && dist(u0, t1) + dist(u1, t0) < dS + dE - 8) { r.why = 'reverse'; return r; }
    if (dS > 22 + slack || dE > 26 + slack) return r;
    if (uToT > 11 + slack || tToU > 13 + slack) return r;
    r.ok = true;
    return r;
  }

  function judge(d) {
    if (finished) { if (d.path.parentNode) d.path.parentNode.removeChild(d.path); return; }
    var user = d.pts;
    // ちょんと さわった だけ（ほとんど うごいていない）は なにもしない
    if (polyLen(user) < 2.5 && strokes[cur].len > 8) {
      if (d.path.parentNode) d.path.parentNode.removeChild(d.path);
      return;
    }
    var r = match(user, strokes[cur]);

    // ほかの まだの画と くらべる（書き順の まちがい）。
    // いまの画にも 合っていても、ほかの画の ほうが ずっと にていれば まちがいとする
    var wrongOrder = false;
    for (var i = cur + 1; i < strokes.length; i++) {
      var o = match(user, strokes[i]);
      if (!o.ok) continue;
      if (!r.ok || (o.score < r.score * 0.6 && o.score < r.score - 8)) { wrongOrder = true; break; }
    }

    if (r.ok && !wrongOrder) {
      cur++;
      if (cur >= strokes.length) {
        finish();
      } else {
        strokeSound();
        updateMarks();
        setMsg(guideText(), '');
      }
      return;
    }

    var sub;
    if (wrongOrder) sub = (cur + 1) + 'ばんから かこうね';
    else if (r.why === 'reverse') sub = '●の ほうから かこうね';
    else sub = 'うすい せんを なぞってね';

    // その画を そっと けす
    d.path.setAttribute('class', 'is-ng');
    setTimeout(function () { if (d.path.parentNode) d.path.parentNode.removeChild(d.path); }, 1000);
    setMsg('もういちど', 'retry', sub);
  }

  function finish() {
    finished = true;
    updateMarks();
    setMsg('よく できました', 'ok');
    markDone(ch);
    drawHanamaru();
    doneSound();
    var c = ch;
    setTimeout(function () { if (ch === c && finished && !traceView.hidden) speak(reading(c)); }, 900);
  }

  // ---------- はなまる ----------
  function drawHanamaru() {
    hanaG.innerHTML = '';
    var cx = 54.5, cy = 54.5, pts = [], i, a, r;
    // まんなかの うずまき
    for (i = 0; i <= 120; i++) {
      a = -Math.PI / 2 + i / 120 * Math.PI * 4.4;
      r = 4 + i / 120 * 30;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    // まわりの 花びら
    var a0 = a;
    for (i = 0; i <= 360; i++) {
      a = a0 + i / 360 * Math.PI * 2;
      r = 38 + 10 * Math.abs(Math.sin((a - a0) * 4));
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    var dStr = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');
    var p = el('path', { d: dStr });
    hanaG.appendChild(p);
    var len = p.getTotalLength();
    p.style.strokeDasharray = len + ' ' + len;
    p.style.strokeDashoffset = String(len);
    void p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset 1.1s ease-out';
    p.style.strokeDashoffset = '0';
  }

  // ---------- おてほん（書き順どおりに 線が かかれていく） ----------
  var demoRun = 0;
  var demoTimer = null;
  var demoRaf = 0;

  function stopDemo() {
    demoRun++;
    clearTimeout(demoTimer);
    cancelAnimationFrame(demoRaf);
    demoG.innerHTML = '';
    demoG.setAttribute('class', 'demo');
    demoBtn.classList.remove('is-on');
    running = false;
  }
  var running = false;

  function startDemo() {
    stopDemo();
    var run = demoRun;
    running = true;
    demoBtn.classList.add('is-on');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var speed = 55; // 1びょうに すすむ ながさ（マスは 109）
    var i = 0;
    function nextStroke() {
      if (run !== demoRun) return;
      if (i >= strokes.length) {
        demoTimer = setTimeout(function () {
          if (run !== demoRun) return;
          demoG.setAttribute('class', 'demo is-fade');
          demoTimer = setTimeout(function () { if (run === demoRun) stopDemo(); }, 700);
        }, 1200);
        return;
      }
      var s = strokes[i++];
      var p = el('path', { d: s.d, 'stroke-width': inkWidth() });
      p.style.strokeDasharray = s.len + ' ' + (s.len + 10);
      p.style.strokeDashoffset = String(s.len);
      demoG.appendChild(p);
      var dur = reduce ? 0 : Math.max(350, s.len / speed * 1000);
      var start = null;
      function frame(ts) {
        if (run !== demoRun) return;
        if (start === null) start = ts;
        var t = dur ? Math.min(1, (ts - start) / dur) : 1;
        p.style.strokeDashoffset = String(s.len * (1 - t));
        if (t < 1) {
          demoRaf = requestAnimationFrame(frame);
        } else {
          demoTimer = setTimeout(nextStroke, 350);
        }
      }
      demoRaf = requestAnimationFrame(frame);
    }
    nextStroke();
  }

  demoBtn.addEventListener('click', function () {
    unlockAudio();
    if (running) stopDemo(); else startDemo();
  });

  clearBtn.addEventListener('click', function () { reset(); });

  nextBtn.addEventListener('click', function () {
    unlockAudio();
    var list = flat(setName);
    var i = list.indexOf(ch);
    openChar(list[(i + 1) % list.length]);
  });

  backBtn.addEventListener('click', function () { showList(); });

  charLabel.addEventListener('click', function () {
    unlockAudio();
    speak(reading(ch));
  });

  // なぞっている とちゅうは、新しい版への 切り替えで 再読み込みしない
  window.kyozaiBusy = function () { return !traceView.hidden && cur > 0 && !finished; };

  // ほかの画面に切り替えたら、おてほんを止める
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { stopDemo(); cancelDrawing(); }
  });

  // ---------- はじめ ----------
  setThick(thick);
  var savedSet = 'hira';
  try { savedSet = localStorage.getItem('nazori-set') || 'hira'; } catch (e) {}
  var firstTab = tabs.filter(function (t) { return t.dataset.set === savedSet; })[0] || tabs[0];
  selectTab(firstTab);
})();
