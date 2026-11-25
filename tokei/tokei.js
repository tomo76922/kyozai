(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var INK = '#3d3a35';
  var HOUR_COLOR = '#c8665a';   // みじかい はり
  var MIN_COLOR = '#5b8db8';    // ながい はり

  // ---------- 読み方（読み上げは かならず この ひらがなで） ----------
  var HOUR_READ = ['', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ',
                   'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ'];
  var ONES_READ = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん',
                   'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん'];
  var TENS_READ = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう'];
  var TENS_EXACT = ['', 'じゅっぷん', 'にじゅっぷん', 'さんじゅっぷん', 'よんじゅっぷん', 'ごじゅっぷん'];

  // 分の読み（1〜59）。10, 20, 30… は「じゅっぷん」「にじゅっぷん」
  function minuteRead(m) {
    var t = Math.floor(m / 10);
    var o = m % 10;
    if (o === 0) return TENS_EXACT[t];
    return TENS_READ[t] + ONES_READ[o];
  }

  // 時刻の文字（例：3じ15ふん・3じ20ぷん・3じ）。han が true のときだけ 30分を「はん」
  function timeLabel(h, m, han) {
    if (m === 0) return h + 'じ';
    if (han && m === 30) return h + 'じはん';
    return h + 'じ' + m + (/ふん$/.test(minuteRead(m)) ? 'ふん' : 'ぷん');
  }

  // 時刻の読み（例：さんじ じゅうごふん）
  function timeRead(h, m, han) {
    if (m === 0) return HOUR_READ[h];
    if (han && m === 30) return HOUR_READ[h] + ' はん';
    return HOUR_READ[h] + ' ' + minuteRead(m);
  }

  // 0〜719 の「分」を、1〜12時と 0〜59分に
  function split(total) {
    var t = ((Math.round(total) % 720) + 720) % 720;
    var h = Math.floor(t / 60);
    return { h: h === 0 ? 12 : h, m: t % 60 };
  }

  // ---------- 時計を描く（外部の画像は使わず、ここで SVG を作る） ----------
  function el(name, attrs, parent) {
    var e = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function buildClock(svg) {
    el('circle', { r: 96, fill: '#fffdf7', stroke: INK, 'stroke-width': 4 }, svg);

    // 目もり（1分ごと・5分ごと）
    for (var i = 0; i < 60; i++) {
      var big = i % 5 === 0;
      var a = i * Math.PI / 30;
      var r1 = big ? 80 : 86;
      var r2 = 91;
      el('line', {
        x1: (Math.sin(a) * r1).toFixed(2), y1: (-Math.cos(a) * r1).toFixed(2),
        x2: (Math.sin(a) * r2).toFixed(2), y2: (-Math.cos(a) * r2).toFixed(2),
        stroke: big ? INK : '#b5ad9e',
        'stroke-width': big ? 3.5 : 1.8,
        'stroke-linecap': 'round'
      }, svg);
    }

    // 1〜12 の数字
    for (var n = 1; n <= 12; n++) {
      var b = n * Math.PI / 6;
      var t = el('text', {
        x: (Math.sin(b) * 65).toFixed(2),
        y: (-Math.cos(b) * 65).toFixed(2),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': 22,
        fill: INK
      }, svg);
      t.textContent = String(n);
    }

    // みじかい はり（時）
    var hour = el('g', {}, svg);
    el('line', { x1: 0, y1: 10, x2: 0, y2: -44, stroke: HOUR_COLOR,
                 'stroke-width': 10, 'stroke-linecap': 'round' }, hour);

    // ながい はり（分）。先に丸をつけて、つかみやすく
    var minute = el('g', {}, svg);
    el('line', { x1: 0, y1: 14, x2: 0, y2: -76, stroke: MIN_COLOR,
                 'stroke-width': 6, 'stroke-linecap': 'round' }, minute);
    var knob = el('circle', { cx: 0, cy: -76, r: 0, fill: MIN_COLOR }, minute);

    el('circle', { r: 7, fill: INK }, svg);

    return {
      knob: knob,
      // total：0時からの分（小数でもよい）。短い針も 本物と同じように 少しずつ動く
      set: function (total) {
        minute.setAttribute('transform', 'rotate(' + ((total % 60) * 6).toFixed(2) + ')');
        hour.setAttribute('transform', 'rotate(' + ((total % 720) * 0.5).toFixed(2) + ')');
      }
    };
  }

  // ---------- 読み上げ（ひらがなカードと同じ） ----------
  var notice = document.getElementById('notice');
  var speedBtn = document.getElementById('speedBtn');

  var synth = window.speechSynthesis;
  var jaVoice = null;
  var slow = false;

  try { slow = localStorage.getItem('tokei-slow') === '1'; } catch (e) {}
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

  speedBtn.addEventListener('click', function () {
    slow = !slow;
    speedBtn.setAttribute('aria-pressed', String(slow));
    try { localStorage.setItem('tokei-slow', slow ? '1' : '0'); } catch (e) {}
  });

  // 音（せいかいの 音など）は 共通の部品（shared/mondai.js）で 鳴らす

  // ---------- うごかす ----------
  var moveSvg = document.getElementById('moveClock');
  var moveText = document.getElementById('moveText');
  var showBtn = document.getElementById('showBtn');
  var moveClock = buildClock(moveSvg);
  moveClock.knob.setAttribute('r', '9');

  var total = 180;          // 0時からの分（はじめは 3じ）
  var dragId = null;        // 動かしている ゆび
  var show = true;

  try {
    var savedTime = Number(localStorage.getItem('tokei-time'));
    if (localStorage.getItem('tokei-time') !== null && savedTime >= 0 && savedTime < 720) {
      total = Math.round(savedTime);
    }
    show = localStorage.getItem('tokei-show') !== '0';
  } catch (e) {}

  function renderMove() {
    moveClock.set(total);
    var t = split(total);
    moveText.textContent = timeLabel(t.h, t.m, false);
    moveSvg.setAttribute('aria-label', 'とけい ' + timeRead(t.h, t.m, false));
  }

  function setShow(on) {
    show = on;
    showBtn.setAttribute('aria-pressed', String(on));
    showBtn.textContent = on ? 'じこくを かくす' : 'じこくを みせる';
    moveText.classList.toggle('is-off', !on);
    try { localStorage.setItem('tokei-show', on ? '1' : '0'); } catch (e) {}
  }

  showBtn.addEventListener('click', function () { setShow(!show); });

  // ゆびの ばしょに、ながい はりを むける。12を こえたら 短い針も つぎの 時へ
  function follow(e) {
    var r = moveSvg.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    if (Math.sqrt(dx * dx + dy * dy) < r.width * 0.04) return; // まん中では 向きが きまらない
    var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    var target = ang / 6;                       // 0〜60
    var cur = ((total % 60) + 60) % 60;
    var d = target - cur;
    if (d > 30) d -= 60;
    if (d <= -30) d += 60;
    total = ((total + d) % 720 + 720) % 720;
    renderMove();
  }

  moveSvg.addEventListener('pointerdown', function (e) {
    if (dragId !== null) return;
    e.preventDefault();
    dragId = e.pointerId;
    try { moveSvg.setPointerCapture(e.pointerId); } catch (err) {}
    moveSvg.classList.add('is-drag');
    stopSpeech();
    follow(e);
  });

  moveSvg.addEventListener('pointermove', function (e) {
    if (e.pointerId !== dragId) return;
    e.preventDefault();
    follow(e);
  });

  function release(e) {
    if (e.pointerId !== dragId) return;
    dragId = null;
    moveSvg.classList.remove('is-drag');
    total = Math.round(total) % 720;  // 1分の ところに ぴったり あわせる
    renderMove();
    try { localStorage.setItem('tokei-time', String(total)); } catch (err) {}
    var t = split(total);
    speak(timeRead(t.h, t.m, false));
  }
  moveSvg.addEventListener('pointerup', release);
  moveSvg.addEventListener('pointercancel', release);

  // 動かしている間は、新しい版への自動の再読み込みをしない
  window.kyozaiBusy = function () { return dragId !== null || quiz.busy(); };

  setShow(show);
  renderMove();

  // ---------- なんじかな ----------
  // せいかいの あとの 自動で つぎへ・10もんで 一区切り は 共通の部品（shared/mondai.js）
  var quizSec = document.getElementById('sec-quiz');
  var quizBar = document.getElementById('quizBar');
  var quizSvg = document.getElementById('quizClock');
  var quizText = document.getElementById('quizText');
  var answersBox = document.getElementById('answers');
  var levelBtns = Array.prototype.slice.call(document.querySelectorAll('.seg-btn'));
  var quizClock = buildClock(quizSvg);

  // むずかしさ：0 ちょうど / 1 ちょうど・はん / 2 5ふんごと / 3 1ぷんごと
  var LEVEL_MINUTES = [[0], [0, 30], [], []];
  for (var lm = 0; lm < 60; lm++) {
    if (lm % 5 === 0) LEVEL_MINUTES[2].push(lm);
    LEVEL_MINUTES[3].push(lm);
  }

  var level = 0;
  var ans = null;     // { h, m }
  var solved = false;
  var sayTimer = null;

  try {
    var lv = Number(localStorage.getItem('tokei-level'));
    if (lv >= 0 && lv <= 3) level = Math.floor(lv);
  } catch (e) {}

  function randOf(list) { return list[Math.floor(Math.random() * list.length)]; }
  function wrapHour(h) { return ((h - 1) % 12 + 12) % 12 + 1; }
  function wrapMin(m) { return ((m % 60) + 60) % 60; }
  function key(t) { return t.h + ':' + t.m; }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = list[i]; list[i] = list[j]; list[j] = x;
    }
    return list;
  }

  // まちがえやすい こたえ を作る（同じ むずかしさの 時刻だけ）
  function wrongChoices(a) {
    var mins = LEVEL_MINUTES[level];
    var ok = function (t) { return mins.indexOf(t.m) >= 0; };
    var near = [];
    near.push({ h: wrapHour(a.h + 1), m: a.m }, { h: wrapHour(a.h - 1), m: a.m });
    if (level === 1) {
      near.push({ h: a.h, m: 30 - a.m }, { h: wrapHour(a.h + 1), m: 30 - a.m });
    }
    if (level >= 2) {
      // 長い針と短い針を とりちがえた こたえ
      var sh = Math.round(a.m / 5);
      if (sh >= 1 && sh <= 12) near.push({ h: sh, m: (a.h % 12) * 5 });
      near.push({ h: a.h, m: wrapMin(a.m + 5) }, { h: a.h, m: wrapMin(a.m - 5) });
    }
    if (level === 3) {
      near.push({ h: a.h, m: wrapMin(a.m + 1) }, { h: a.h, m: wrapMin(a.m - 1) },
                { h: a.h, m: wrapMin(a.m + 10) }, { h: a.h, m: wrapMin(a.m - 10) });
    }
    var seen = {};
    seen[key(a)] = true;
    var out = [];
    shuffle(near.filter(ok)).forEach(function (t) {
      if (out.length < 2 && !seen[key(t)]) { seen[key(t)] = true; out.push(t); }
    });
    var guard = 0;
    while (out.length < 2 && guard++ < 200) {
      var t = { h: 1 + Math.floor(Math.random() * 12), m: randOf(mins) };
      if (!seen[key(t)]) { seen[key(t)] = true; out.push(t); }
    }
    return out;
  }

  // あたらしい もんだい（まえと 同じ 時刻には しない）
  function makeQuestion() {
    var mins = LEVEL_MINUTES[level];
    var prev = ans ? key(ans) : '';
    var t;
    do {
      t = { h: 1 + Math.floor(Math.random() * 12), m: randOf(mins) };
    } while (key(t) === prev);
    ans = t;
    return { h: t.h, m: t.m, level: level };
  }

  function showQuestion(q) {
    var t = { h: q.h, m: q.m };
    ans = t;
    solved = false;
    clearTimeout(sayTimer);
    stopSpeech();

    quizClock.set((t.h % 12) * 60 + t.m);
    quizText.className = 'stage-text';
    quizText.textContent = 'なんじ かな？';

    // まちがえた もんだいを もういちど するときも、そのときの むずかしさで
    var keep = level;
    level = q.level;
    var han = level === 1;
    var choices = shuffle([t].concat(wrongChoices(t)));
    level = keep;
    answersBox.innerHTML = '';
    choices.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'answer';
      b.dataset.key = key(c);
      b.textContent = timeLabel(c.h, c.m, han);
      b.setAttribute('aria-label', timeRead(c.h, c.m, han));
      answersBox.appendChild(b);
    });
  }

  var quiz = Mondai.create({
    area: quizSec,
    countIn: quizBar,
    total: 10,
    make: makeQuestion,
    show: showQuestion,
    speak: function (t) { speak(t); }
  });

  function setLevel(n) {
    level = n;
    levelBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.level) === n));
    });
    try { localStorage.setItem('tokei-level', String(n)); } catch (e) {}
    quiz.start();
  }

  levelBtns.forEach(function (b) {
    b.addEventListener('click', function () { setLevel(Number(b.dataset.level)); });
  });

  answersBox.addEventListener('click', function (e) {
    var b = e.target.closest('.answer');
    if (!b || solved) return;
    Array.prototype.forEach.call(answersBox.children, function (x) {
      x.classList.remove('is-ng');
    });
    if (b.dataset.key === key(ans)) {
      solved = true;
      b.classList.add('is-ok');
      quizText.className = 'stage-text is-ok';
      quizText.textContent = 'せいかい';
      quiz.correct(b);
      // 音と重ならないように、少しあとで読み上げる
      clearTimeout(sayTimer);
      sayTimer = setTimeout(function () { speak('せいかい'); }, 500);
    } else {
      // 同じ ボタンを もう一度 おしても 動きが わかるように、いったん外してから つける
      void b.offsetWidth;
      b.classList.add('is-ng');
      quizText.className = 'stage-text is-retry';
      quizText.textContent = 'もういちど';
      quiz.wrong();
    }
  });

  setLevel(level);

  // 先生用の せってい（ながおしで ひらく）：せいかいの あと まつ じかん
  Mondai.bindGear(document.getElementById('gearBtn'), document.getElementById('gearHint'),
    function () { stopSpeech(); clearTimeout(sayTimer); quiz.hold(); },
    function () { quiz.next(); });

  // ---------- 「うごかす」「なんじかな」の切り替え ----------
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    stopSpeech();
    clearTimeout(sayTimer);
    quiz.stop();
    window.scrollTo(0, 0);
    try { localStorage.setItem('tokei-tab', tab.id); } catch (e) {}
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

  try {
    var saved = document.getElementById(localStorage.getItem('tokei-tab') || '');
    if (saved && saved.classList.contains('tab')) selectTab(saved);
  } catch (e) {}

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') stopSpeech();
  });
})();
