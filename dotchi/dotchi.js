// どっちかな：ひだりと みぎの えから えらぶ
// ・もんだい（せいかい あり）は 共通の部品 shared/mondai.js で すすめる（せいかいで 自動で つぎへ・10もんで 一区切り・まちがえた もんだいを もういちど）
// ・きもち（せいかい なし）は どちらを えらんでも「〇〇を えらんだね」と はなまる。区切らずに つづける
// ・こたえかた：ゆびで／ことばで（Safari の 音声認識）／こえで（shared/koe-switch.js）／めで（shared/shisen.js）
// ・きろくは この iPad の 中（localStorage）にだけ 保存する。名前は 記録しない
(function () {
  'use strict';

  var D = window.DotchiData;
  var ART = window.DotchiArt;
  var SETS = window.DotchiSets;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- せってい（この iPad の 中だけ） ----------
  var PREF_KEY = 'dotchi-pref-v1';
  var HOWS = ['yubi', 'kotoba', 'koe', 'me'];
  var HOW_NAME = { yubi: 'ゆび', kotoba: 'ことば', koe: 'こえ', me: 'め' };
  var KOE_SPEEDS = [1.5, 2, 3, 4, 5];
  var ME_SECS = [5, 8, 10, 12, 15];
  var pref = { how: 'yubi', names: true, slow: false, koeSpeed: 3, meSec: 10, meSkip: true, meShow: false };
  (function () {
    try {
      var d = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
      if (!d) return;
      if (HOWS.indexOf(d.how) >= 0) pref.how = d.how;
      pref.names = d.names !== false;
      pref.slow = !!d.slow;
      if (KOE_SPEEDS.indexOf(Number(d.koeSpeed)) >= 0) pref.koeSpeed = Number(d.koeSpeed);
      if (ME_SECS.indexOf(Number(d.meSec)) >= 0) pref.meSec = Number(d.meSec);
      pref.meSkip = d.meSkip !== false;
      pref.meShow = !!d.meShow;
    } catch (e) {}
  })();
  function savePref() { try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (e) {} }

  // ---------- きろく（この iPad の 中だけ） ----------
  var LOG_KEY = 'dotchi-log-v1';
  var LOG_MAX = 3000;
  function loadLog() {
    try { var a = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  var logWarned = false;
  function addLog(x) {
    var a = loadLog();
    a.push(x);
    if (a.length > LOG_MAX) a = a.slice(a.length - LOG_MAX);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(a)); } catch (e) {
      if (!logWarned) { logWarned = true; toast('きろくを ほぞん できませんでした'); }
    }
  }

  // ---------- よみあげ ----------
  var synth = window.speechSynthesis;
  var jaVoice = null;
  function pickVoice() {
    if (!synth) return;
    var ja = (synth.getVoices() || []).filter(function (v) { return /^ja(-|_|$)/i.test(v.lang); });
    jaVoice = ja.filter(function (v) { return v.localService; })[0] || ja[0] || null;
  }
  if (synth) {
    pickVoice();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pickVoice);
    else synth.onvoiceschanged = pickVoice;
  } else {
    $('notice').textContent = 'この ブラウザでは よみあげが つかえません。';
    $('notice').hidden = false;
  }
  var speakId = 0;
  var speakTimer = 0;
  var speaking = false;
  var keepUtter = null;
  // onEnd は よみおわったら よぶ（とちゅうで ほかの よみあげに かわったら よばない）
  function speak(text, onEnd) {
    stopSpeech();
    var id = ++speakId;
    speaking = true;
    function fin() {
      if (id !== speakId) return;
      speaking = false;
      clearTimeout(speakTimer);
      if (onEnd) { var f = onEnd; onEnd = null; f(); }
    }
    if (!synth || !text) { speakTimer = setTimeout(fin, 300); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = pref.slow ? 0.6 : 0.9;
    u.onend = fin;
    u.onerror = fin;
    keepUtter = u;
    synth.speak(u);
    // よみおわりが こないときの ために
    speakTimer = setTimeout(fin, 1800 + text.length * (pref.slow ? 300 : 190));
  }
  // よみあげの あとに すこし まつ（とちゅうで とめたら よばない）
  var laterTimer = 0;
  function later(ms, fn) {
    clearTimeout(laterTimer);
    var id = speakId;
    laterTimer = setTimeout(function () { if (id === speakId) fn(); }, ms);
  }
  function stopSpeech() {
    clearTimeout(laterTimer);
    speakId++;
    speaking = false;
    clearTimeout(speakTimer);
    if (synth) synth.cancel();
  }

  // ---------- ちょっとした おしらせ・かくにん ----------
  var toastTimer = 0;
  function toast(t) {
    var el = $('toast');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3200);
  }
  var askFn = null;
  function ask(title, sub, yes, fn) {
    $('askTitle').textContent = title;
    $('askSub').textContent = sub || '';
    $('askYes').textContent = yes;
    askFn = fn;
    $('askEl').hidden = false;
    $('askNo').focus({ preventScroll: true });
  }
  $('askNo').addEventListener('click', function () { $('askEl').hidden = true; askFn = null; });
  $('askYes').addEventListener('click', function () {
    $('askEl').hidden = true;
    var f = askFn;
    askFn = null;
    if (f) f();
  });
  window.DotchiToast = toast;
  window.DotchiAsk = ask;

  function overlayOpen() {
    return !$('setEl').hidden || !$('logEl').hidden || !$('mkEl').hidden || !$('askEl').hidden || !$('micAsk').hidden ||
      !!document.querySelector('.ss-wrap');
  }

  // ---------- 画面 ----------
  var screen = 'home';
  var S = null;        // いまの あそび { kind, title, src, items, shuffle, order, pos, lastAns }
  var quiz = null;     // shared/mondai.js
  var quizzes = {};
  var cur = null;      // いまの もんだい { text, L, R, ans, set }
  var phase = 'idle';  // idle / intro（よみあげ中）/ answer（こたえを まつ）/ wait（つぎを まつ）/ paused
  var sideEl = { L: $('sideL'), R: $('sideR') };

  function showScreen(name) {
    screen = name;
    $('scr-home').hidden = name !== 'home';
    $('scr-play').hidden = name !== 'play';
    $('backBtn').hidden = name !== 'play';
    $('count').hidden = true;
    $('title').textContent = name === 'play' && S ? S.title : 'どっちかな';
    if (name !== 'play') {
      stopAnswer();
      stopSpeech();
      if (quiz) quiz.cancel();
      quiz = null;
      phase = 'idle';
      cur = null;
      $('heard').hidden = true;
      stopInputs();
      renderHome();
    }
    window.scrollTo(0, 0);
  }
  $('backBtn').addEventListener('click', function () { showScreen('home'); });

  // ---------- ゆっくり ----------
  var speedBtn = $('speedBtn');
  speedBtn.setAttribute('aria-pressed', String(pref.slow));
  speedBtn.addEventListener('click', function () {
    pref.slow = !pref.slow;
    speedBtn.setAttribute('aria-pressed', String(pref.slow));
    savePref();
  });

  // ---------- えらぶ 画面 ----------
  var HOW_NOTE = {
    yubi: 'こたえたい ほうの えを タップします。',
    kotoba: '「みぎ」「ひだり」と いって こたえます。iPad（Safari）の 音声認識を つかうので、インターネットに つながっていないと つかえない ことが あります。' +
      'こえは この 教材では ほぞんしませんが、ききとりの ために iPad が Apple に おくる ことが あります。',
    koe: 'ひだりと みぎが こうたいで ひかります。こたえたい ほうが ひかったときに こえを だすと きまります（こえの 大きさだけを みます。インターネットは いりません）。',
    me: 'もんだいを よんだあと、' + '{sec}びょうの あいだ ひだりと みぎを みていた じかんを くらべて、ながく みていた ほうに きまります（iPad の まえの カメラを つかいます）。'
  };
  function renderHow() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-how]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.how === pref.how));
    });
    $('howNote').textContent = HOW_NOTE[pref.how].replace('{sec}', pref.meSec);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-how]'), function (b) {
    b.addEventListener('click', function () {
      pref.how = b.dataset.how;
      savePref();
      renderHow();
      if (pref.how !== 'koe' && koe && koe.isRunning()) koe.stop();
      if (pref.how !== 'me' && eye && eye.isRunning()) eye.stop();
    });
  });

  function cardHtml(pics, label, sub) {
    return '<span class="card-pics" aria-hidden="true">' + pics + '</span>' +
      '<span class="card-label">' + esc(label) + '</span>' + (sub ? '<span class="card-sub">' + esc(sub) + '</span>' : '');
  }
  function artPair(a, b) { return '<span class="card-pic">' + ART.svg(a) + '</span><span class="card-pic">' + ART.svg(b) + '</span>'; }

  function allQs(groups) {
    var a = [];
    groups.forEach(function (g) { a = a.concat(g.qs); });
    return a;
  }

  function renderHome() {
    renderHow();
    var mb = $('mondaiList');
    var html = '<button type="button" class="card card-all" data-m="all">' +
      cardHtml(artPair('sakura', 'kasa'), 'ぜんぶ まぜて', '10もん') + '</button>';
    D.MONDAI.forEach(function (g, i) {
      html += '<button type="button" class="card" data-m="' + i + '">' +
        cardHtml(artPair(g.qs[0].a, g.qs[0].b), g.name, g.qs.length + 'もん') + '</button>';
    });
    mb.innerHTML = html;

    var kb = $('kimochiList');
    html = '<button type="button" class="card card-all" data-k="all">' +
      cardHtml(artPair('ringo', 'boru'), 'ぜんぶ まぜて', '') + '</button>';
    D.KIMOCHI.forEach(function (g, i) {
      html += '<button type="button" class="card" data-k="' + i + '">' +
        cardHtml(artPair(g.qs[0].a, g.qs[0].b), g.name, '') + '</button>';
    });
    kb.innerHTML = html;
    renderSetList();
  }

  var userSets = [];
  function renderSetList() {
    if (!SETS) return;
    SETS.list().then(function (sets) {
      userSets = sets;
      var box = $('setList');
      box.innerHTML = sets.map(function (s, i) {
        var q = s.questions[0];
        var pics = q ? '<span class="card-pic"><img src="' + q.L.img + '" alt=""></span><span class="card-pic"><img src="' + q.R.img + '" alt=""></span>' : '';
        return '<button type="button" class="card" data-s="' + i + '">' +
          cardHtml(pics, s.name, (s.kind === 'kimochi' ? 'きもち' : 'もんだい') + '・' + s.questions.length + 'もん') + '</button>';
      }).join('');
      $('setNote').hidden = sets.length > 0;
    }, function () {
      userSets = [];
      $('setList').innerHTML = '';
      $('setNote').hidden = false;
    });
  }

  $('mondaiList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]');
    if (!b) return;
    var all = b.dataset.m === 'all';
    var g = all ? null : D.MONDAI[Number(b.dataset.m)];
    begin({ kind: 'mondai', title: all ? 'ぜんぶ まぜて' : g.name, src: 'builtin',
      items: all ? allQs(D.MONDAI) : g.qs, shuffle: true, set: all ? 'もんだい ぜんぶ' : 'もんだい ' + g.name });
  });
  $('kimochiList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]');
    if (!b) return;
    var all = b.dataset.k === 'all';
    var g = all ? null : D.KIMOCHI[Number(b.dataset.k)];
    begin({ kind: 'kimochi', title: all ? 'きもち ぜんぶ' : 'きもち ' + g.name, src: 'builtin',
      items: all ? allQs(D.KIMOCHI) : g.qs, shuffle: true, set: all ? 'きもち ぜんぶ' : 'きもち ' + g.name });
  });
  $('setList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]');
    if (!b) return;
    var s = userSets[Number(b.dataset.s)];
    if (!s || !s.questions.length) return;
    begin({ kind: s.kind === 'kimochi' ? 'kimochi' : 'mondai', title: s.name, src: 'user',
      items: s.questions, shuffle: false, set: s.name });
  });

  // ---------- もんだいを ならべる ----------
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  function nextItem() {
    var n = S.items.length;
    if (!S.shuffle) return S.items[(S.pos++) % n];
    if (S.pos >= S.order.length) {
      var last = S.order[S.order.length - 1];
      S.order = shuffled(n);
      if (n > 1 && S.order[0] === last) { S.order.push(S.order.shift()); }
      S.pos = 0;
    }
    return S.items[S.order[S.pos++]];
  }
  function itemSide(id) { return { pic: id, name: D.ITEMS[id] || '' }; }
  function makeQ() {
    var it = nextItem();
    var q;
    if (S.src === 'builtin') {
      // ひだり・みぎは ばらばらに（せいかいが 3かい つづけて おなじ がわに ならないように）
      var aLeft = Math.random() < 0.5;
      if (S.kind === 'mondai' && S.lastAns.length >= 2 && S.lastAns[0] === S.lastAns[1]) aLeft = S.lastAns[0] !== 'L';
      var A = itemSide(it.a), B = itemSide(it.b);
      q = { text: it.q, L: aLeft ? A : B, R: aLeft ? B : A, ans: S.kind === 'mondai' ? (aLeft ? 'L' : 'R') : null };
      if (S.kind === 'mondai') { S.lastAns.unshift(q.ans); S.lastAns.length = Math.min(S.lastAns.length, 2); }
    } else {
      q = { text: it.text, L: { img: it.L.img, name: it.L.name || '' }, R: { img: it.R.img, name: it.R.name || '' },
        ans: S.kind === 'mondai' ? it.ans : null };
    }
    return q;
  }

  function getQuiz(kind, total) {
    var key = kind === 'kimochi' ? 'kimochi' : 'm' + total;
    if (!quizzes[key]) {
      quizzes[key] = Mondai.create({
        area: $('scr-play'),
        total: kind === 'kimochi' ? 100000 : total,   // きもちは 区切らない
        make: function () { return makeQ(); },
        show: showQ,
        speak: function (t) { speak(t); },
        onProgress: renderCount,
        onFinish: function () {
          phase = 'idle';
          stopAnswer();
          $('heard').hidden = true;
          $('count').hidden = true;
        },
        extraButtons: [{ label: 'ほかの もんだいを えらぶ', onClick: function () { showScreen('home'); } }]
      });
    }
    return quizzes[key];
  }
  function renderCount(info) {
    var c = $('count');
    if (!S || S.kind === 'kimochi' || (quiz && quiz.finished())) { c.hidden = true; return; }
    c.textContent = (info.review ? 'もういちど ' : '') + Math.min(info.index + 1, info.total) + '/' + info.total;
    c.hidden = false;
  }

  function begin(s) {
    if (overlayOpen()) return;
    unlockAudio();
    ensureInput(function () {
      S = s;
      S.pos = 0;
      S.order = [];
      S.lastAns = [];
      showScreen('play');
      $('scr-play').classList.toggle('is-kotoba', pref.how === 'kotoba');
      quiz = getQuiz(s.kind, Math.min(10, s.items.length));
      quiz.start();
    });
  }

  // ---------- もんだいを 出す ----------
  function renderPic(el, side) {
    if (side.img) el.innerHTML = '<img src="' + side.img + '" alt="">';
    else el.innerHTML = ART.svg(side.pic);
  }
  function showQ(q) {
    cur = q;
    stopAnswer();
    $('question').textContent = q.text;
    ['L', 'R'].forEach(function (s) {
      var el = sideEl[s];
      el.classList.remove('is-pick', 'is-lit', 'is-look', 'is-shake');
      renderPic($('pic' + s), q[s]);
      var nm = $('name' + s);
      nm.textContent = q[s].name || '';
      nm.hidden = !pref.names || !q[s].name;
      el.setAttribute('aria-label', (s === 'L' ? 'ひだり' : 'みぎ') + (q[s].name ? '：' + q[s].name : ''));
    });
    setFeedback('');
    setState('');
    if (pref.how === 'kotoba') { $('heardText').textContent = '…'; $('heard').hidden = false; }
    intro();
  }
  // よみあげてから こたえを まつ
  function intro() {
    stopAnswer();
    if (overlayOpen()) { phase = 'paused'; return; }
    phase = 'intro';
    speak(cur.text, startAnswer);
  }
  $('listenBtn').addEventListener('click', function () {
    if (!cur || (phase !== 'answer' && phase !== 'intro')) return;
    intro();
  });

  function setFeedback(t, cls) {
    var f = $('feedback');
    f.textContent = t;
    f.className = 'feedback' + (cls ? ' ' + cls : '');
  }
  function setState(t) { var el = $('stateMsg'); if (el.textContent !== t) el.textContent = t; }

  function startAnswer() {
    if (screen !== 'play' || !cur) return;
    if (overlayOpen()) { phase = 'paused'; return; }
    phase = 'answer';
    answerAt = performance.now();
    if (pref.how === 'yubi') setState('');
    else if (pref.how === 'kotoba') { setState('「みぎ」か「ひだり」と いってね'); startRecog(); }
    else if (pref.how === 'koe') startLights();
    else if (pref.how === 'me') startMeasure();
  }
  function stopAnswer() {
    stopLights();
    stopMeasure();
  }
  var answerAt = 0;

  // こたえが きまった
  function choose(side, how, extra) {
    if (phase !== 'answer' || !cur) return;
    stopAnswer();
    abortRecog();
    var q = cur;
    var el = sideEl[side];
    var pickName = q[side].name || '';
    var kimochi = S.kind === 'kimochi';
    var ok = kimochi ? null : side === q.ans;
    addLog({
      t: Date.now(), set: S.set, kind: kimochi ? 'きもち' : 'もんだい', q: q.text,
      L: q.L.name || '', R: q.R.name || '', pick: side, ok: ok, how: how,
      eL: extra && extra.eL != null ? Math.round(extra.eL * 10) / 10 : null,
      eR: extra && extra.eR != null ? Math.round(extra.eR * 10) / 10 : null,
      heard: extra && extra.heard ? String(extra.heard).slice(0, 40) : ''
    });
    if (kimochi || ok) {
      phase = 'wait';
      el.classList.add('is-pick');
      var say = kimochi ? (pickName || (side === 'L' ? 'ひだり' : 'みぎ')) + 'を えらんだね' : 'せいかい';
      setFeedback(kimochi ? say : 'せいかい！', 'is-ok');
      setState('');
      quiz.correct(el);
      speak(say);
    } else {
      phase = 'wrong';
      quiz.wrong();
      setFeedback('もういちど', 'is-ng');
      setState('');
      el.classList.remove('is-shake');
      void el.offsetWidth;
      el.classList.add('is-shake');
      // 「もういちど」を すこし 見せてから、もんだいを もういちど よむ
      var t0 = Date.now();
      speak('もういちど', function () {
        later(Math.max(0, 1400 - (Date.now() - t0)), function () {
          el.classList.remove('is-shake');
          if (phase === 'wrong') { setFeedback(''); intro(); }
        });
      });
    }
  }

  // ---------- ゆびで ----------
  ['L', 'R'].forEach(function (s) {
    sideEl[s].addEventListener('click', function () {
      if (pref.how !== 'yubi') {
        if (phase === 'answer') toast(pref.how === 'kotoba' ? '「みぎ」「ひだり」と いって こたえてね' : pref.how === 'koe' ? 'ひかった ときに こえを だしてね' : 'こたえたい ほうを みてね');
        return;
      }
      choose(s, 'yubi');
    });
  });

  // ---------- 音の じゅんび（iPad では さわった ときに しておく） ----------
  function unlockAudio() {
    if (synth && !synth.speaking) {
      try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {}
    }
  }

  // ---------- マイクの せつめい ----------
  var micNext = null, micKind = '';
  var MIC_TEXT = {
    koe: 'こえで こたえる ために、iPad の マイクを つかいます。こえの 大きさ だけを みて、ろくおんも ほぞんも せず、どこにも おくりません。',
    kotoba: 'ことばで こたえる ために、iPad の マイクと 音声認識（Safari）を つかいます。この 教材は こえを ほぞんしませんが、ききとりの ために iPad が こえを Apple に おくる ことが あります。インターネットに つながっていないと つかえない ことが あります。'
  };
  var micExplained = { koe: false, kotoba: false };
  function askMic(kind, next) {
    micKind = kind;
    micNext = next;
    $('micText').textContent = MIC_TEXT[kind];
    $('micErr').hidden = true;
    $('micOkBtn').textContent = 'マイクを つかう';
    $('micAsk').hidden = false;
    $('micOkBtn').focus({ preventScroll: true });
  }
  function micFail(msg) {
    $('micErr').textContent = msg;
    $('micErr').hidden = false;
    $('micOkBtn').textContent = 'もういちど ためす';
    $('micAsk').hidden = false;
  }
  $('micNoBtn').addEventListener('click', function () { $('micAsk').hidden = true; micNext = null; });
  $('micOkBtn').addEventListener('click', function () {
    unlockAudio();
    micExplained[micKind] = true;
    var fn = micNext;
    if (micKind === 'koe') {
      startKoe(function () { $('micAsk').hidden = true; micNext = null; if (fn) fn(); }, function (err) { micFail(KoeSwitch.errorMessage(err)); });
    } else {
      $('micAsk').hidden = true;
      micNext = null;
      if (!SR) { toast('この iPad では ことばで こたえる が つかえません'); return; }
      if (fn) fn();
    }
  });

  // こたえかたの じゅんび（マイク・カメラ）を してから fn
  function ensureInput(fn) {
    if (pref.how === 'koe') {
      if (!koe) { toast('この ブラウザでは こえで こたえる が つかえません'); return; }
      if (koe.isRunning()) { fn(); return; }
      if (!micExplained.koe) askMic('koe', fn);
      else startKoe(fn, function (err) { askMic('koe', fn); micFail(KoeSwitch.errorMessage(err)); });
    } else if (pref.how === 'kotoba') {
      if (!SR) { toast('この iPad では ことばで こたえる が つかえません。ほかの こたえかたを えらんでね'); return; }
      if (!micExplained.kotoba) askMic('kotoba', function () { recogWant = true; recogStart(); fn(); });
      else { recogWant = true; recogStart(); fn(); }
    } else if (pref.how === 'me') {
      useCam(fn);
    } else {
      fn();
    }
  }
  function stopInputs() {
    abortRecog(true);
    if (koe && koe.isRunning() && !testOn) koe.stop();
    if (eye && eye.isRunning()) eye.stop();
    eye && eye.showPreview(null);
    $('camPrev').hidden = true;
  }

  // ---------- ことばで（Safari の 音声認識） ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var recog = null, recogWant = false, recogRunning = false, recogRestart = 0;
  function toHira(s) {
    return String(s).replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
  }
  function parseSide(text) {
    var t = toHira(text).replace(/\s+/g, '');
    var l = Math.max(t.lastIndexOf('ひだり'), t.lastIndexOf('左'));
    var r = Math.max(t.lastIndexOf('みぎ'), t.lastIndexOf('右'));
    if (l < 0 && r < 0) return null;
    return l > r ? 'L' : 'R';
  }
  function recogStart() {
    if (!SR || recogRunning || !recogWant) return;
    try {
      recog = new SR();
      recog.lang = 'ja-JP';
      recog.continuous = true;
      recog.interimResults = true;
      recog.maxAlternatives = 3;
    } catch (e) { return; }
    var me = recog;
    me.onresult = function (e) {
      if (me !== recog) return;
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i];
        var text = res[0] ? res[0].transcript : '';
        if (text) $('heardText').textContent = '「' + text + '」';
        // よみあげて いる 間と、よみあげの すぐ あとは つかわない（iPad の こえを ひろわないように）
        if (phase !== 'answer' || speaking || performance.now() - answerAt < 500) continue;
        var side = null;
        for (var k = 0; k < res.length && !side; k++) side = parseSide(res[k].transcript);
        if (side) { choose(side, 'kotoba', { heard: text }); return; }
      }
    };
    me.onerror = function (e) {
      if (me !== recog) return;
      var er = e && e.error;
      if (er === 'not-allowed' || er === 'service-not-allowed') {
        recogWant = false;
        setState('マイクや 音声認識が つかえません。iPad の「せってい」で きょか してください');
      } else if (er === 'network') {
        setState('インターネットに つながっていないので、ことばを ききとれません');
      } else if (er === 'audio-capture') {
        recogWant = false;
        setState('マイクが つかえません');
      }
    };
    me.onend = function () {
      if (me !== recog) return;
      recogRunning = false;
      clearTimeout(recogRestart);
      if (recogWant && screen === 'play') recogRestart = setTimeout(recogStart, 400);
    };
    try { me.start(); recogRunning = true; } catch (e) { recogRunning = false; }
  }
  function startRecog() {
    recogWant = true;
    recogStart();
  }
  // 聞いた ことばを いったん わすれる（stopAll なら もう きかない）
  function abortRecog(stopAll) {
    if (stopAll) recogWant = false;
    clearTimeout(recogRestart);
    if (recog && recogRunning) {
      try { recog.abort(); } catch (e) {}
    }
    if (stopAll) { recog = null; recogRunning = false; }
  }

  // ---------- こえで（shared/koe-switch.js） ----------
  var KS = window.KoeSwitch || null;
  var koe = null;
  var testOn = false;
  if (KS) {
    koe = KS.create({
      threshold: KS.loadSettings().threshold,
      cooldown: 800,
      onTrigger: onKoe,
      onLevel: showLevel,
      onStop: function () { showLevel(0, koe.getThreshold()); }
    });
    koe.enabled = false;
  }
  function startKoe(ok, ng) {
    koe.start().then(function () { placeLines(); ok(); }, ng);
  }
  var lit = null, litTimer = 0;
  function setLit(s) {
    lit = s;
    sideEl.L.classList.toggle('is-lit', s === 'L');
    sideEl.R.classList.toggle('is-lit', s === 'R');
  }
  function startLights() {
    stopLights();
    if (!koe || !koe.isRunning()) {
      setState('マイクが とまりました。「もどる」から もういちど はじめてね');
      return;
    }
    setState('こたえたい ほうが ひかったら こえを だしてね');
    $('koeMeter').hidden = false;
    placeLines();
    koe.enabled = true;
    koe.ignoreFor(400);
    setLit('L');
    litTimer = setInterval(function () { setLit(lit === 'L' ? 'R' : 'L'); }, pref.koeSpeed * 1000);
  }
  function stopLights() {
    clearInterval(litTimer);
    litTimer = 0;
    if (lit) setLit(null);
    if (koe && !testOn) koe.enabled = false;
    $('koeMeter').hidden = true;
  }
  function onKoe() {
    if (testOn) { flashLamp(); return; }
    if (phase === 'answer' && pref.how === 'koe' && lit && !overlayOpen()) choose(lit, 'koe');
  }
  var meterLast = -1;
  function showLevel(level, th) {
    var v = Math.round(level * 100) / 100;
    if (v === meterLast) return;
    meterLast = v;
    [['meterFill', 'koeMeter'], ['testFill', 'testMeter']].forEach(function (p) {
      var f = $(p[0]);
      if (f.offsetParent === null) return;
      f.style.transform = 'scaleX(' + v + ')';
      $(p[1]).classList.toggle('is-over', level >= th);
    });
  }
  function placeLines() {
    var th = koe ? koe.getThreshold() : 0.5;
    $('meterLine').style.left = (th * 100).toFixed(1) + '%';
    $('testLine').style.left = (th * 100).toFixed(1) + '%';
    $('thValue').textContent = Math.round(th * 100);
  }
  var lampTimer = 0, lampCount = 0;
  function flashLamp() {
    lampCount++;
    var l = $('testLamp');
    l.classList.add('is-on');
    l.textContent = 'はんのう！（' + lampCount + '）';
    clearTimeout(lampTimer);
    lampTimer = setTimeout(function () { l.classList.remove('is-on'); }, 500);
  }
  $('koeTestBtn').addEventListener('click', function () {
    if (!koe) { toast('この ブラウザでは マイクが つかえません'); return; }
    if (testOn) { endTest(); return; }
    startKoe(function () {
      testOn = true;
      koe.enabled = true;
      lampCount = 0;
      $('testLamp').textContent = 'こえを だしてみてね';
      $('koeTestBtn').textContent = 'テストを おわる';
      $('koeTestBtn').setAttribute('aria-pressed', 'true');
    }, function (err) { toast(KS.errorMessage(err)); });
  });
  function endTest() {
    if (!testOn) return;
    testOn = false;
    $('koeTestBtn').textContent = 'こえテスト';
    $('koeTestBtn').setAttribute('aria-pressed', 'false');
    $('testLamp').textContent = 'まってるよ';
    if (koe) {
      koe.enabled = false;
      if (!(screen === 'play' && pref.how === 'koe')) koe.stop();
    }
  }
  function stepTh(d) {
    if (!koe) return;
    var th = clamp(Math.round((koe.getThreshold() + d) * 100) / 100, 0.1, 0.9);
    koe.setThreshold(th);
    if (!KS.saveSettings({ threshold: th })) toast('この iPad では せっていを ほぞん できません');
    placeLines();
  }
  $('thUpBtn').addEventListener('click', function () { stepTh(0.05); });
  $('thDownBtn').addEventListener('click', function () { stepTh(-0.05); });

  // ---------- めで（shared/shisen.js） ----------
  var eye = window.Shisen ? Shisen.create({}) : null;
  var calibrated = false;
  function useCam(next, onCancel) {
    if (!eye) { toast('この ブラウザでは めで こたえる が つかえません'); return; }
    eye.setSource(Shisen.loadSettings().source);
    Shisen.explain({
      eye: eye,
      purpose: 'こたえを えらぶ',
      onOk: function () {
        if (calibrated && eye.canJudge()) { next(); return; }
        Shisen.calibrate(eye, {
          speak: true,
          onDone: function () { calibrated = true; next(); },
          onCancel: function () { if (eye.isRunning() && screen !== 'play') eye.stop(); if (onCancel) onCancel(); }
        });
      },
      onCancel: function () { if (onCancel) onCancel(); }
    });
  }
  var M = { raf: 0, el: 0, L: 0, R: 0, last: 0, msg: '' };
  var ringFg = $('ringFg');
  function startMeasure() {
    stopMeasure();
    if (!eye || !eye.isRunning()) {
      setState('カメラが とまりました。「もどる」から もういちど はじめてね');
      return;
    }
    var prev = Shisen.loadSettings().preview;
    $('camPrev').hidden = !prev;
    eye.showPreview(prev ? $('camPrev') : null);
    M.el = 0; M.L = 0; M.R = 0; M.msg = '';
    M.last = performance.now();
    $('ring').hidden = false;
    $('ringText').textContent = String(pref.meSec);
    ringFg.style.strokeDashoffset = '0';
    setState('こたえたい ほうを みてね');
    M.raf = requestAnimationFrame(mTick);
  }
  function stopMeasure() {
    cancelAnimationFrame(M.raf);
    M.raf = 0;
    $('ring').hidden = true;
    sideEl.L.classList.remove('is-look');
    sideEl.R.classList.remove('is-look');
  }
  function mTick(t) {
    M.raf = requestAnimationFrame(mTick);
    var dt = Math.min(0.1, Math.max(0, (t - M.last) / 1000));
    M.last = t;
    if (overlayOpen()) return;
    var st = eye.getStatus();
    var msg = st === 'loading' ? 'じゅんびしています…' : st === 'dark' ? 'へやを あかるくしてね' : st === 'noface' ? 'かおが みえないよ' : 'こたえたい ほうを みてね';
    if (msg !== M.msg) { M.msg = msg; setState(msg); }
    if (st === 'loading') return;   // じゅんびが できるまで 時間を すすめない
    M.el += dt;
    var d = st === 'ok' ? eye.getDir() : null;
    // かおが みえない 時間・まんなかを みている 時間は かぞえない
    if (M.el > (pref.meSkip ? 1 : 0)) {
      if (d === 'left') M.L += dt;
      else if (d === 'right') M.R += dt;
    }
    if (pref.meShow) {
      sideEl.L.classList.toggle('is-look', d === 'left');
      sideEl.R.classList.toggle('is-look', d === 'right');
    }
    var T = pref.meSec;
    ringFg.style.strokeDashoffset = String(Math.min(1, M.el / T));
    var left = Math.max(0, Math.ceil(T - M.el));
    var tx = String(left);
    if ($('ringText').textContent !== tx) $('ringText').textContent = tx;
    if (M.el >= T) {
      var l = M.L, r = M.R;
      stopMeasure();
      decideEye(l, r);
    }
  }
  function decideEye(l, r) {
    if ((l < 2 && r < 2) || Math.abs(l - r) < 1) {
      // きめない：もういちど はかる
      addLog({
        t: Date.now(), set: S.set, kind: S.kind === 'kimochi' ? 'きもち' : 'もんだい', q: cur.text,
        L: cur.L.name || '', R: cur.R.name || '', pick: '', ok: null, how: 'me',
        eL: Math.round(l * 10) / 10, eR: Math.round(r * 10) / 10, heard: ''
      });
      phase = 'retry';
      setFeedback('もういちど みてね');
      setState('');
      var t0 = Date.now();
      speak('もういちど みてね', function () {
        later(Math.max(0, 1400 - (Date.now() - t0)), function () {
          if (phase === 'retry') { setFeedback(''); startAnswer(); }
        });
      });
      return;
    }
    choose(l > r ? 'L' : 'R', 'me', { eL: l, eR: r });
  }

  // ---------- せってい（ながおしで ひらく） ----------
  var gearBtn = $('gearBtn');
  var gearHint = $('gearHint');
  var HOLD_MS = 1000;
  var holdTimer = 0, hintTimer = 0, opened = false;
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

  var waitSec = Mondai.settingsSection('set-sec');
  $('waitSec').replaceWith(waitSec);
  waitSec.querySelector('.md-set-note').textContent =
    '「もんだい」で せいかい したあと・「きもち」で えらんだあと、この じかん まってから 自動で つぎに なります（まっている 間に 画面を タップすると すぐ つぎへ）。' +
    'かずあそび・とけい などの 教材とも 共通です。';

  var holdQuiz = false;
  function pausePlay() {
    stopAnswer();
    stopSpeech();
    if (quiz && quiz.waiting()) { quiz.hold(); holdQuiz = true; }
  }
  function resumePlay() {
    if (overlayOpen()) return;
    if (screen !== 'play' || !quiz) return;
    if (holdQuiz) { holdQuiz = false; quiz.next(); return; }
    if (cur && phase !== 'wait' && phase !== 'idle' && !quiz.finished()) { setFeedback(''); intro(); }
  }

  function openSettings() {
    if (!$('setEl').hidden) return;
    pausePlay();
    renderSettings();
    waitSec.mondaiRender();
    Shisen.renderCalButtons && Shisen.renderCalButtons();
    $('setEl').hidden = false;
    $('setEl').scrollTop = 0;
    $('setClose').focus({ preventScroll: true });
  }
  function closeSettings() {
    endTest();
    $('setEl').hidden = true;
    renderHow();
    resumePlay();
  }
  $('setClose').addEventListener('click', closeSettings);

  function pressAll(sel, attr, val) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(val)));
    });
  }
  function renderSettings() {
    pressAll('[data-names]', 'data-names', pref.names ? '1' : '0');
    pressAll('[data-koe-speed]', 'data-koe-speed', pref.koeSpeed);
    pressAll('[data-me-sec]', 'data-me-sec', pref.meSec);
    pressAll('[data-me-skip]', 'data-me-skip', pref.meSkip ? '1' : '0');
    pressAll('[data-me-show]', 'data-me-show', pref.meShow ? '1' : '0');
    pressAll('[data-cam-src]', 'data-cam-src', window.Shisen ? Shisen.loadSettings().source : 'both');
    placeLines();
  }
  function bindOpt(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
      b.addEventListener('click', function () { fn(b); savePref(); renderSettings(); });
    });
  }
  bindOpt('[data-names]', function (b) { pref.names = b.dataset.names === '1'; refreshNames(); });
  bindOpt('[data-koe-speed]', function (b) { pref.koeSpeed = Number(b.dataset.koeSpeed); });
  bindOpt('[data-me-sec]', function (b) { pref.meSec = Number(b.dataset.meSec); });
  bindOpt('[data-me-skip]', function (b) { pref.meSkip = b.dataset.meSkip === '1'; });
  bindOpt('[data-me-show]', function (b) { pref.meShow = b.dataset.meShow === '1'; });
  bindOpt('[data-cam-src]', function (b) {
    if (!window.Shisen) return;
    Shisen.saveSettings({ source: b.dataset.camSrc });
    if (eye) eye.setSource(b.dataset.camSrc);
  });
  function refreshNames() {
    if (!cur) return;
    ['L', 'R'].forEach(function (s) { $('name' + s).hidden = !pref.names || !cur[s].name; });
  }
  $('eyeTestBtn').addEventListener('click', function () {
    if (!eye) { toast('この ブラウザでは カメラが つかえません'); return; }
    $('setEl').hidden = true;
    function back() {
      if (!(screen === 'play' && pref.how === 'me') && eye.isRunning()) eye.stop();
      $('setEl').hidden = false;
    }
    useCam(function () {
      calibrated = true;
      Shisen.openTest(eye, { speak: true, onClose: back });
    }, back);
  });

  // ---------- もんだいを つくる ----------
  $('makerBtn').addEventListener('click', function () {
    if (!SETS) return;
    $('setEl').hidden = true;
    SETS.open({ onClose: function () { $('setEl').hidden = false; renderSetList(); } });
  });

  // ---------- きろくを みる ----------
  function fmtTime(t) {
    var d = new Date(t);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function pickText(x) {
    if (!x.pick) return 'きまらず';
    var n = x.pick === 'L' ? x.L : x.R;
    return (x.pick === 'L' ? 'ひだり' : 'みぎ') + (n ? '（' + n + '）' : '');
  }
  function okText(x) { return x.ok === true ? 'せいかい' : x.ok === false ? 'まちがい' : ''; }
  function secText(v) { return v == null ? '' : String(v); }
  var LOG_SHOW = 300;
  function renderLog() {
    var a = loadLog();
    $('logInfo').textContent = a.length
      ? 'ぜんぶで ' + a.length + 'けん（あたらしい じゅん' + (a.length > LOG_SHOW ? '。ここには ' + LOG_SHOW + 'けん まで 出します。ぜんぶは CSV で' : '') + '）。この iPad の 中だけに ほぞんしています。'
      : 'まだ きろくは ありません。';
    $('csvBtn').disabled = !a.length;
    $('logClearBtn').disabled = !a.length;
    if (!a.length) { $('logWrap').innerHTML = ''; return; }
    var rows = a.slice(-LOG_SHOW).reverse().map(function (x) {
      return '<tr><td>' + esc(fmtTime(x.t)) + '</td><td>' + esc(x.set) + '</td><td>' + esc(x.q) + '</td>' +
        '<td>' + esc(x.L) + '</td><td>' + esc(x.R) + '</td><td>' + esc(pickText(x)) + '</td><td>' + esc(okText(x)) + '</td>' +
        '<td>' + esc(HOW_NAME[x.how] || '') + '</td><td>' + esc(secText(x.eL)) + '</td><td>' + esc(secText(x.eR)) + '</td></tr>';
    }).join('');
    $('logWrap').innerHTML = '<table class="log-table"><thead><tr><th>にちじ</th><th>セット</th><th>もんだい</th><th>ひだり</th><th>みぎ</th>' +
      '<th>えらんだ ほう</th><th>せいかい</th><th>こたえかた</th><th>ひだりを みた びょう</th><th>みぎを みた びょう</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  $('logBtn').addEventListener('click', function () {
    $('setEl').hidden = true;
    renderLog();
    $('logEl').hidden = false;
    $('logEl').scrollTop = 0;
  });
  $('logClose').addEventListener('click', function () { $('logEl').hidden = true; $('setEl').hidden = false; });
  function csvCell(v) {
    v = v == null ? '' : String(v);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  $('csvBtn').addEventListener('click', function () {
    var a = loadLog();
    if (!a.length) return;
    var head = ['にちじ', 'セット', 'しゅるい', 'もんだい', 'ひだり', 'みぎ', 'えらんだ ほう', 'えらんだ もの', 'せいかい', 'こたえかた', 'ひだりを みた びょう', 'みぎを みた びょう', 'きこえた ことば'];
    var lines = [head.map(csvCell).join(',')];
    a.forEach(function (x) {
      lines.push([fmtTime(x.t), x.set, x.kind, x.q, x.L, x.R,
        x.pick === 'L' ? 'ひだり' : x.pick === 'R' ? 'みぎ' : 'きまらず',
        x.pick === 'L' ? x.L : x.pick === 'R' ? x.R : '',
        okText(x), HOW_NAME[x.how] || '', secText(x.eL), secText(x.eR), x.heard || ''].map(csvCell).join(','));
    });
    // Excel で 文字化け しないように BOM を つける
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' });
    var d = new Date();
    var a2 = document.createElement('a');
    a2.href = URL.createObjectURL(blob);
    a2.download = 'どっちかな_きろく_' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.csv';
    document.body.appendChild(a2);
    a2.click();
    setTimeout(function () { URL.revokeObjectURL(a2.href); a2.remove(); }, 4000);
  });
  $('logClearBtn').addEventListener('click', function () {
    ask('きろくを ぜんぶ けしますか？', 'この iPad の「どっちかな」の きろくが ぜんぶ きえます。', 'けす', function () {
      ask('ほんとうに けしますか？', 'けした きろくは もとに もどせません。', 'ぜんぶ けす', function () {
        try { localStorage.removeItem(LOG_KEY); } catch (e) {}
        renderLog();
        toast('きろくを けしました');
      });
    });
  });

  // ---------- Esc ----------
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('askEl').hidden) $('askNo').click();
    else if (!$('micAsk').hidden) $('micNoBtn').click();
    else if (!$('mkEl').hidden) SETS.back();
    else if (!$('logEl').hidden) $('logClose').click();
    else if (!$('setEl').hidden) closeSettings();
  });

  // ほかの アプリに うつったら とめる
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && screen === 'play') pausePlay();
    else if (document.visibilityState === 'visible' && screen === 'play') resumePlay();
  });

  // とちゅうで ページを 読みなおさない
  window.kyozaiBusy = function () {
    return (screen === 'play' && !!quiz && !quiz.finished()) || (SETS && SETS.editing()) || !$('setEl').hidden;
  };

  renderHome();
})();
