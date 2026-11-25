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

  // ---------- 音 ----------
  // せいかい・おわりの 音は 共通の部品（shared/mondai.js）で 鳴らす

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
  var screens = ['grade', 'season', 'genre', 'quiz'];

  function show(name) {
    stopSpeech();
    if (name !== 'quiz' && quiz) quiz.cancel();
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
    if (season && (screen === 'genre' || screen === 'quiz')) crumb.push(season.name);
    if (genre && screen === 'quiz') crumb.push(genre.name);
    $('crumb').innerHTML = crumb.map(T).join(' ・ ');

    if (screen === 'grade') drawGrades();
    if (screen === 'season') drawSeasons();
    if (screen === 'genre') drawGenres();
    if (screen === 'quiz') drawQuiz();
    if (screen !== 'quiz') $('heading').innerHTML = T(HEAD[screen]);
    if (screen === 'quiz' && quiz && quiz.finished()) $('heading').innerHTML = T(HEAD.result);
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

  // せいかいの あとの 自動で つぎへ・おわりの 画面は 共通の部品（shared/mondai.js）
  var round = null;   // { items, item, choices, missed, solved, info }
  var quiz = null;

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
    round = { items: [] };
    show('quiz');
    quiz.start();
  }

  function showQuestion(it, info) {
    round.item = it;
    round.info = info;
    round.choices = makeChoices(it);
    round.missed = false;
    round.solved = false;
    drawQuiz(true);
    // 少し間をあけて、問題文と答えを読み上げる
    stopSpeech();
    sayTimer = setTimeout(readQuestion, 450);
  }

  function readQuestion() {
    if (!round || !round.choices) return;
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
    var it = round.item;
    var info = round.info;
    $('heading').innerHTML = T('[第:だい]' + (info.index + 1) + '[問:もん]');

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

    // ●：1回目で せいかい（みどり）・まちがえた（はいいろ）・いま
    var res = quiz.info().results;
    var dots = '';
    for (var d = 0; d < info.total; d++) {
      var cls = 'dot';
      if (res[d] !== undefined) cls += res[d] ? ' is-ok' : ' is-miss';
      else if (d === info.index) cls += ' is-now';
      dots += '<span class="' + cls + '"></span>';
    }
    $('dots').innerHTML = dots;
  }

  $('choices').addEventListener('click', function (e) {
    var b = e.target.closest('.choice');
    if (!b || !round || round.solved) return;
    var it = round.item;
    var c = round.choices[Number(b.dataset.i)];
    var fb = $('feedback');
    if (c === it) {
      round.solved = true;
      quiz.correct(b);
      drawQuiz(false);
      // 音と重ならないように、少しあとで読み上げる
      stopSpeech();
      sayTimer = setTimeout(function () { speak(R(c.name) + '。　' + R(T_OK)); }, 500);
    } else {
      round.missed = true;
      quiz.wrong();
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
    readQuestion();
  });

  quiz = Mondai.create({
    area: $('scr-quiz'),
    total: QUESTIONS,
    // 1ジャンルの もんだいを まぜて、じゅんばんに 出す
    onNewSet: function () { round.items = shuffle(quizItems(season, genre.id)).slice(0, QUESTIONS); },
    make: function (i) { return round.items[i]; },
    show: showQuestion,
    speak: function (t) { speak(t); },
    onFinish: function () {
      stopSpeech();
      $('heading').innerHTML = T(HEAD.result);
    }
  });

  // 先生用の せってい（ながおしで ひらく）：せいかいの あと まつ じかん
  Mondai.bindGear($('gearBtn'), $('gearHint'),
    function () { stopSpeech(); quiz.hold(); },
    function () { quiz.next(); });

  // クイズの途中は、新しい版への自動の再読み込みをしない
  window.kyozaiBusy = function () { return screen === 'quiz' && !quiz.finished(); };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') stopSpeech();
  });

  // ---------- はじめ ----------
  // 前に学年を選んでいれば、その学年のまま 季節を選ぶ画面から
  show(grade ? 'season' : 'grade');
})();
