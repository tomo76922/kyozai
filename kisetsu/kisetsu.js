(function () {
  'use strict';

  var K = window.Kanji;
  var D = window.KisetsuData;
  var QUESTIONS = 5;   // 1ジャンルの問題の数

  // 学年：1〜6 は小学校、7 は中学、8 は高校
  var GRADES = [
    { g: 1, name: '[小:しょう]1' }, { g: 2, name: '[小:しょう]2' }, { g: 3, name: '[小:しょう]3' },
    { g: 4, name: '[小:しょう]4' }, { g: 5, name: '[小:しょう]5' }, { g: 6, name: '[小:しょう]6' },
    { g: 7, name: '[中学:ちゅう.がく]' }, { g: 8, name: '[高校:こう.こう]' }
  ];

  var HEAD = {
    grade: '[学年:がく.ねん]を [選:えら]ぼう',
    season: '[季節:き.せつ]を [選:えら]ぼう',
    genre: 'ジャンルを [選:えら]ぼう',
    result: '[結果:けっ.か]'
  };
  var T_SOON = '[準備中:じゅん.び.ちゅう]';
  var T_OK = '[正解:せい.かい]';
  var T_RETRY = 'もう[一:いち][度:ど]';

  function $(id) { return document.getElementById(id); }

  // ---------- 保存（この iPad の中だけ） ----------
  function load(key) { try { return localStorage.getItem('kisetsu-' + key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem('kisetsu-' + key, v); } catch (e) {} }

  var grade = Number(load('grade')) || 0;     // 0 は まだ選んでいない
  var furi = load('furi') === '1';
  var slow = load('slow') === '1';

  // ---------- 文字（学年に合わせて表示） ----------
  function shownGrade() { return grade || 1; }   // 学年を選ぶ前は ひらがなだけ
  function T(str) { return K.html(str, shownGrade(), furi); }
  function R(str) { return K.reading(str); }

  // data-t の付いた ところを まとめて書きかえる
  function renderStatic() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (el) {
      el.innerHTML = T(el.getAttribute('data-t'));
    });
    document.title = K.plain('[季節:き.せつ]クイズ', shownGrade());
  }

  // データの書きまちがいを コンソールに出す（開発用）
  (function checkData() {
    var all = [HEAD.grade, HEAD.season, HEAD.genre, HEAD.result, T_SOON, T_OK, T_RETRY];
    GRADES.forEach(function (x) { all.push(x.name); });
    D.GENRES.forEach(function (g) { all.push(g.name, g.ask); });
    D.SEASONS.forEach(function (s) {
      all.push(s.name);
      Object.keys(s.genres).forEach(function (k) {
        s.genres[k].forEach(function (it) {
          all.push(it.name);
          if (it.pic && it.pic.indexOf('svg:') === 0 && !D.PICS[it.pic.slice(4)]) {
            console.warn('きせつクイズ：絵がない ' + it.pic);
          }
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (el) {
      all.push(el.getAttribute('data-t'));
    });
    all.forEach(function (s) { K.check(s); });
  })();

  // ---------- 読み上げ（ほかの教材と同じ） ----------
  var notice = $('notice');
  var synth = window.speechSynthesis;
  var jaVoice = null;

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

  var sayTimer = null;
  function stopSpeech() {
    clearTimeout(sayTimer);
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

  // せいかいの音：やさしい「ピン・ポン」（ひかえめな音量）
  function goodSound() { playNotes([[0, 784, 0.16], [0.22, 1047, 0.14]]); }
  // おわりの音：ド・ミ・ソ
  function endSound() { playNotes([[0, 523, 0.13], [0.2, 659, 0.13], [0.4, 784, 0.14]]); }

  // ---------- ボタン（ふりがな・ゆっくり） ----------
  var furiBtn = $('furiBtn');
  var speedBtn = $('speedBtn');
  furiBtn.setAttribute('aria-pressed', String(furi));
  speedBtn.setAttribute('aria-pressed', String(slow));

  furiBtn.addEventListener('click', function () {
    furi = !furi;
    furiBtn.setAttribute('aria-pressed', String(furi));
    save('furi', furi ? '1' : '0');
    redraw();
  });

  speedBtn.addEventListener('click', function () {
    slow = !slow;
    speedBtn.setAttribute('aria-pressed', String(slow));
    save('slow', slow ? '1' : '0');
  });

  // ---------- 画面の切り替え ----------
  var screen = '';
  var season = null;    // 選んだ季節
  var genre = null;     // 選んだジャンル
  var screens = ['grade', 'season', 'genre', 'quiz', 'result'];

  function show(name) {
    stopSpeech();
    screen = name;
    screens.forEach(function (s) { $('scr-' + s).hidden = s !== name; });
    redraw();
    window.scrollTo(0, 0);
  }

  // いまの画面を書き直す（学年・ふりがなを変えたときも）
  function redraw() {
    renderStatic();
    var crumb = [];
    if (grade && screen !== 'grade') crumb.push(gradeName(grade));
    if (season && (screen === 'genre' || screen === 'quiz' || screen === 'result')) crumb.push(season.name);
    if (genre && (screen === 'quiz' || screen === 'result')) crumb.push(genre.name);
    $('crumb').innerHTML = crumb.map(T).join(' ・ ');

    if (screen === 'grade') drawGrades();
    if (screen === 'season') drawSeasons();
    if (screen === 'genre') drawGenres();
    if (screen === 'quiz') drawQuiz();
    if (screen === 'result') drawResult();
    if (screen !== 'quiz') $('heading').innerHTML = T(HEAD[screen]);
  }

  function gradeName(g) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].g === g) return GRADES[i].name;
    return '';
  }

  // もどる
  $('backBtn').addEventListener('click', function () {
    if (screen === 'grade') {
      if (grade) show('season');
      else window.location.href = '../';
    } else if (screen === 'season') {
      show('grade');
    } else if (screen === 'genre') {
      show('season');
    } else {
      show('genre');
    }
  });

  function cardHtml(icon, accent, label, note) {
    return (icon ? '<span class="card-icon" aria-hidden="true">' + icon + '</span>' : '') +
      '<span class="card-label">' + label + '</span>' +
      (note ? '<span class="card-note">' + note + '</span>' : '');
  }

  // ---------- 1. 学年 ----------
  function drawGrades() {
    var box = $('gradeList');
    box.innerHTML = '';
    GRADES.forEach(function (x) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.setAttribute('aria-pressed', String(x.g === grade));
      b.innerHTML = cardHtml('', '', T(x.name));
      b.addEventListener('click', function () {
        unlockAudio();
        grade = x.g;
        save('grade', String(grade));
        speak(R(x.name));
        show('season');
      });
      box.appendChild(b);
    });
  }

  // ---------- 2. 季節 ----------
  // その季節の どのジャンルにも、絵のある問題が 5問以上 あれば 選べる
  function quizItems(s, gid) {
    return (s.genres[gid] || []).filter(function (it) { return !!it.pic; });
  }
  function isReady(s) {
    return D.GENRES.every(function (g) { return quizItems(s, g.id).length >= QUESTIONS; });
  }

  function drawSeasons() {
    var box = $('seasonList');
    box.innerHTML = '';
    D.SEASONS.forEach(function (s) {
      var ready = isReady(s);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.style.setProperty('--accent', s.color);
      b.disabled = !ready;
      b.innerHTML = cardHtml(s.icon, s.color, T(s.name), ready ? '' : T(T_SOON));
      if (ready) {
        b.addEventListener('click', function () {
          unlockAudio();
          season = s;
          speak(R(s.name));
          show('genre');
        });
      }
      box.appendChild(b);
    });
  }

  // ---------- 3. ジャンル ----------
  function drawGenres() {
    var box = $('genreList');
    box.innerHTML = '';
    D.GENRES.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.style.setProperty('--accent', season.color);
      b.innerHTML = cardHtml(g.icon, season.color, T(g.name));
      b.addEventListener('click', function () {
        unlockAudio();
        genre = g;
        startQuiz();
      });
      box.appendChild(b);
    });
  }

  // ---------- 4. クイズ ----------
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var round = null;   // { items, idx, results, choices, missed, solved }

  // まちがいの選択肢：ほかの季節のものを かならず1つ入れ、もう1つは 同じ季節か ほかの季節から
  function makeChoices(answer) {
    var gid = genre.id;
    var used = {};
    used[R(answer.name)] = true;
    function take(list) {
      list = shuffle(list);
      for (var i = 0; i < list.length; i++) {
        var key = R(list[i].name);
        if (!used[key]) { used[key] = true; return list[i]; }
      }
      return null;
    }
    var same = (season.genres[gid] || []).filter(function (it) { return it !== answer; });
    var other = [];
    D.SEASONS.forEach(function (s) {
      if (s !== season) other = other.concat(s.genres[gid] || []);
    });
    var wrong = [];
    var a = take(other);
    if (a) wrong.push(a);
    while (wrong.length < 2) {
      var b = take(same.concat(other));
      if (!b) break;
      wrong.push(b);
    }
    return shuffle([answer].concat(wrong));
  }

  function startQuiz() {
    var items = shuffle(quizItems(season, genre.id)).slice(0, QUESTIONS);
    round = { items: items, idx: 0, results: [] };
    show('quiz');
    newQuestion();
  }

  function newQuestion() {
    var it = round.items[round.idx];
    round.choices = makeChoices(it);
    round.missed = false;
    round.solved = false;
    drawQuiz(true);
    // 少し間をあけて、問題文と答えを読み上げる
    clearTimeout(sayTimer);
    sayTimer = setTimeout(readQuestion, 450);
  }

  function readQuestion() {
    speak(R(genre.ask) + '　' + round.choices.map(function (c) { return R(c.name); }).join('、　'));
  }

  function picHtml(pic) {
    if (pic.indexOf('svg:') === 0) {
      return '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">' + D.PICS[pic.slice(4)] + '</svg>';
    }
    // 絵文字も SVG の中に置くと、枠いっぱいの大きさになる
    var list = Array.from(pic.replace(/[\ufe0f\u200d]/g, ''));
    var txt = list.map(function (ch, i) {
      return '<text x="' + (100 * i + 50) + '" y="54" font-size="84" text-anchor="middle" dominant-baseline="central">' + ch + '</text>';
    }).join('');
    return '<svg class="emoji" viewBox="0 0 ' + (100 * list.length) + ' 100" aria-hidden="true" focusable="false">' + txt + '</svg>';
  }

  function drawQuiz(fresh) {
    if (!round || !round.choices) return;
    var it = round.items[round.idx];
    $('heading').innerHTML = T('[第:だい]' + (round.idx + 1) + '[問:もん]');

    var pic = $('pic');
    if (fresh) {
      pic.innerHTML = picHtml(it.pic);
      pic.setAttribute('aria-label', 'え');
      pic.classList.remove('pop');
      void pic.offsetWidth;
      pic.classList.add('pop');
    }
    $('question').innerHTML = T(genre.ask);

    var box = $('choices');
    box.classList.toggle('is-done', round.solved);
    box.innerHTML = '';
    round.choices.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.innerHTML = T(c.name);
      b.dataset.i = String(i);
      if (round.solved && c === it) b.classList.add('is-ok');
      if (c.wrong) b.classList.add('is-ng');
      box.appendChild(b);
    });

    var fb = $('feedback');
    if (round.solved) {
      fb.className = 'feedback is-ok';
      fb.innerHTML = T(T_OK);
    } else if (fresh) {
      fb.className = 'feedback';
      fb.innerHTML = '';
    } else if (fb.classList.contains('is-retry')) {
      fb.innerHTML = T(T_RETRY);
    }
    var next = $('nextBtn');
    next.hidden = !round.solved;
    next.textContent = round.idx + 1 < round.items.length ? 'つぎ' : 'おわり';

    var dots = '';
    for (var d = 0; d < round.items.length; d++) {
      var cls = 'dot';
      if (d < round.results.length) cls += round.results[d] ? ' is-ok' : ' is-miss';
      else if (d === round.idx) cls += ' is-now';
      dots += '<span class="' + cls + '"></span>';
    }
    $('dots').innerHTML = dots;
  }

  $('choices').addEventListener('click', function (e) {
    var b = e.target.closest('.choice');
    if (!b || !round || round.solved) return;
    unlockAudio();
    var it = round.items[round.idx];
    var c = round.choices[Number(b.dataset.i)];
    var fb = $('feedback');
    if (c === it) {
      round.solved = true;
      round.results.push(!round.missed);
      round.choices.forEach(function (x) { delete x.wrong; });
      drawQuiz(false);
      goodSound();
      // 音と重ならないように、少しあとで読み上げる
      stopSpeech();
      sayTimer = setTimeout(function () { speak(R(c.name) + '。　' + R(T_OK)); }, 500);
    } else {
      round.missed = true;
      // 同じ ボタンを もう一度 おしても 動きが わかるように、いったん外してから つける
      b.classList.remove('is-ng');
      void b.offsetWidth;
      b.classList.add('is-ng');
      fb.className = 'feedback is-retry';
      fb.innerHTML = T(T_RETRY);
      stopSpeech();
      speak(R(T_RETRY));
    }
  });

  $('listenBtn').addEventListener('click', function () {
    unlockAudio();
    readQuestion();
  });

  $('nextBtn').addEventListener('click', function () {
    unlockAudio();
    round.idx++;
    if (round.idx < round.items.length) {
      newQuestion();
    } else {
      show('result');
      endSound();
      var n = countOk();
      sayTimer = setTimeout(function () {
        speak(R(scoreText(n)));
      }, 700);
    }
  });

  // ---------- 5. けっか ----------
  function countOk() {
    return round.results.filter(function (x) { return x; }).length;
  }
  function scoreText(n) {
    return round.items.length + '[問:もん]の うち ' + n + '[問:もん] [正解:せい.かい]';
  }

  var STAR_ON = '<svg viewBox="0 0 100 100" class="is-pop"><path d="M50 8 L61 36 L91 38 L68 57 L76 87 L50 70 L24 87 L32 57 L9 38 L39 36 Z" fill="#f3cf63" stroke="#3d3a35" stroke-width="4" stroke-linejoin="round"/></svg>';
  var STAR_OFF = '<svg viewBox="0 0 100 100"><path d="M50 8 L61 36 L91 38 L68 57 L76 87 L50 70 L24 87 L32 57 L9 38 L39 36 Z" fill="#ece7dc" stroke="#cfc8b8" stroke-width="4" stroke-linejoin="round"/></svg>';

  function drawResult() {
    if (!round) return;
    var n = countOk();
    var stars = '';
    for (var i = 0; i < round.items.length; i++) {
      stars += i < n ? STAR_ON.replace('class="is-pop"', 'class="is-pop" style="animation-delay:' + (i * 0.12) + 's"') : STAR_OFF;
    }
    $('stars').innerHTML = stars;
    $('score').innerHTML = T(scoreText(n));
  }

  $('againBtn').addEventListener('click', function () {
    unlockAudio();
    startQuiz();
  });
  $('otherBtn').addEventListener('click', function () { show('genre'); });

  // クイズの途中は、新しい版への自動の再読み込みをしない
  window.kyozaiBusy = function () { return screen === 'quiz'; };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') stopSpeech();
  });

  // ---------- はじめ ----------
  // 前に学年を選んでいれば、その学年のまま 季節を選ぶ画面から
  show(grade ? 'season' : 'grade');
})();
