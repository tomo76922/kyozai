// もんだいの すすめかた（共通の部品）
// かずあそび（いくつかな）・とけい（なんじかな）・おかね・けいさん・きせつクイズで つかう。
//
// ・せいかい したら：やさしい音・はなまる・キラキラ。少し まって（2〜5びょう）自動で つぎの もんだいへ。
//   まっている 間に 画面を タップすると すぐ つぎへ。
// ・まちがえたら：教材の ほうで「もういちど」を 出す。この部品は「まちがえた もんだい」として おぼえておく
//   （あとで せいかい しても、1回目で こたえられなかった もんだい として のこる）。
// ・10もん（きせつクイズは 1ジャンルの もんだいの かず）で 一区切り。上に「3/10」の ように 出す。
// ・おわったら「10もんちゅう 〇もん せいかい」と はなまる。ボタンは
//   「まちがえた もんだいを もういちど」（まちがえた もんだいが あるときだけ）・「つぎの 10もん」・「もくじ」。
// ・まつ 時間は 先生用の「せってい」で えらぶ（この iPad の 中に 保存。この部品を つかう 教材で 共通）。
// ・音は ページの中で 作る。外部には 何も 送らない。
//
// つかいかた（くわしくは README の「もんだいの すすめかた」）:
//   <link rel="stylesheet" href="../shared/mondai.css"> と <script src="../shared/mondai.js"></script>
//   var quiz = Mondai.create({
//     area: 要素,              // おわりの 画面を 出す ところ（中身は かくれる。.md-keep を つけた 子は のこる）
//     countIn: 要素,           // 「3/10」を 入れる ところ（なくても よい）
//     total: 10,               // 1回の もんだいの かず
//     make: function (i) {},   // あたらしい もんだいを 作って かえす（i は 何もん目か。0から）
//     show: function (q, info) {},  // もんだい q を 画面に 出す（info：{ index, total, review }）
//     speak: function (text) {},    // 読み上げ（教材の「ゆっくり」に あわせるため）
//     onNewSet / onFinish / onProgress：あれば よぶ
//   });
//   quiz.start();        // あたらしく はじめる
//   quiz.correct(要素);  // せいかい（要素の 上に はなまる）
//   quiz.wrong();        // まちがい
//   quiz.hold(keepFx);   // 自動で すすむのを やめる（レベルアップの 画面を 出すときなど）
//   quiz.next();         // つぎへ（hold の あとに よぶ）
//   quiz.stop();         // まっているなら すぐ つぎへ（タブを きりかえる ときなど）
//   quiz.cancel();       // とちゅうで やめる（ほかの 画面に もどるとき）
(function (global) {
  'use strict';

  var WAIT_KEY = 'kyozai-mondai-wait';
  var WAIT_MIN = 2;
  var WAIT_MAX = 5;
  var WAIT_DEFAULT = 3;
  var TAP_GUARD_MS = 350;   // こたえを おした ゆびで すぐ すすまないように

  // ---------- まつ 時間（せってい） ----------
  function getWait() {
    var v = WAIT_DEFAULT;
    try { v = Number(localStorage.getItem(WAIT_KEY)) || WAIT_DEFAULT; } catch (e) {}
    v = Math.round(v);
    if (v < WAIT_MIN || v > WAIT_MAX) v = WAIT_DEFAULT;
    return v;
  }
  function setWait(v) {
    try { localStorage.setItem(WAIT_KEY, String(v)); } catch (e) {}
  }

  // ---------- 音（音の ファイルは つかわず、その場で 作る） ----------
  var AC = global.AudioContext || global.webkitAudioContext;
  var ctx = null;

  // iPad では、さわったときに 音の じゅんびを しておかないと、あとで 鳴らせない
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
  document.addEventListener('pointerdown', unlockAudio, true);
  document.addEventListener('keydown', unlockAudio, true);

  // かねの ような 音を 1つ
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

  // せいかい：やさしい「ピン・ポン」（ひかえめな 音量）
  function goodSound() { playNotes([[0, 784, 0.16], [0.22, 1047, 0.14]]); }
  // おわり：ド・ミ・ソ・ド を やさしく
  function endSound() {
    playNotes([[0, 523, 0.12], [0.2, 659, 0.12], [0.4, 784, 0.13], [0.65, 1047, 0.12]]);
  }

  // ---------- はなまる・キラキラ の 絵 ----------
  function hanamaruSvg() {
    var petals = '';
    for (var i = 0; i < 10; i++) {
      var a = i * 36;
      petals += '<ellipse cx="50" cy="13" rx="11" ry="13" transform="rotate(' + a + ' 50 50)"/>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g fill="#fbe3e6" stroke="#e0606e" stroke-width="3.5">' + petals + '</g>' +
      '<circle cx="50" cy="50" r="33" fill="#fffdf7" stroke="#e0606e" stroke-width="3.5"/>' +
      '<path d="M50 30 C66 30 72 44 68 56 C64 68 50 71 41 65 C33 59 34 47 42 43 C50 39 58 45 56 53 C55 58 50 59 47 56" ' +
        'fill="none" stroke="#e0606e" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  function sparkleSvg(color) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M12 1.5 14.2 9.8 22.5 12 14.2 14.2 12 22.5 9.8 14.2 1.5 12 9.8 9.8Z" fill="' + color + '"/></svg>';
  }
  var SPARK_COLORS = ['#f3cf63', '#efa7b8', '#8fb4d6', '#a9cfa5', '#f3cf63', '#efa7b8'];

  // 要素の まわりに はなまると キラキラを 出す
  function celebrate(layer, el) {
    var W = global.innerWidth, H = global.innerHeight;
    var size = Math.max(64, Math.min(104, Math.min(W, H) * 0.12));
    var x = W / 2;
    var y = H / 2;
    if (el && el.getBoundingClientRect) {
      var r = el.getBoundingClientRect();
      if (r.width || r.height) {
        // こたえの 右上の かどに おす（こたえが かくれないように）
        x = r.right - Math.min(r.width * 0.2, size * 0.3);
        y = r.top + Math.min(r.height * 0.2, size * 0.2);
      }
    }
    x = Math.max(size / 2 + 4, Math.min(W - size / 2 - 4, x));
    y = Math.max(size / 2 + 4, Math.min(H - size / 2 - 4, y));
    var html = '<div class="md-maru" style="left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px">' +
      hanamaruSvg() + '</div>';
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      var d = size * (0.75 + Math.random() * 0.35);
      html += '<span class="md-kira" style="left:' + x + 'px;top:' + y + 'px;' +
        '--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d) + 'px;' +
        'animation-delay:' + (0.05 + Math.random() * 0.2).toFixed(2) + 's">' +
        sparkleSvg(SPARK_COLORS[i % SPARK_COLORS.length]) + '</span>';
    }
    layer.innerHTML = html;
  }

  function isShown(el) {
    return !!(el && el.getClientRects && el.getClientRects().length);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---------- もんだいの すすめかた ----------
  function create(opts) {
    var total = opts.total || 10;
    var area = opts.area;
    var speak = opts.speak || function () {};
    var homeHref = opts.homeHref || '../';

    // まっている 間の 画面（タップで すぐ つぎへ）
    var waitLayer = document.createElement('div');
    waitLayer.className = 'md-wait';
    waitLayer.hidden = true;
    waitLayer.innerHTML = '<div class="md-fx"></div>' +
      '<div class="md-tap"><span class="md-tap-text">タップで つぎへ</span><span class="md-bar"><span></span></span></div>';
    document.body.appendChild(waitLayer);
    var fxBox = waitLayer.querySelector('.md-fx');
    var barFill = waitLayer.querySelector('.md-bar span');

    // 「3/10」
    var countEl = null;
    if (opts.countIn) {
      countEl = document.createElement('p');
      countEl.className = 'md-count';
      countEl.setAttribute('aria-live', 'polite');
      opts.countIn.appendChild(countEl);
    }

    // おわりの 画面
    var resultEl = document.createElement('div');
    resultEl.className = 'md-result';
    resultEl.hidden = true;
    if (area) area.appendChild(resultEl);

    var list = [];        // こんかいの もんだい（ふくしゅうの ときは まちがえた もんだい）
    var results = [];     // 1回目で せいかい した か
    var missed = [];      // こんかい まちがえた もんだい
    var index = 0;
    var size = total;     // こんかいの もんだいの かず
    var review = false;
    var cur = null;
    var curMissed = false;
    var state = 'idle';   // idle / play / wait / hold / done
    var waitTimer = 0;
    var shownAt = 0;
    var sayTimer = 0;

    function info() {
      return { index: index, total: size, review: review, results: results.slice() };
    }

    function renderCount() {
      if (countEl) {
        countEl.textContent = (review ? 'まちがえた もんだい ' : '') + Math.min(index + 1, size) + '/' + size;
        countEl.setAttribute('aria-label', size + 'もん の うち ' + Math.min(index + 1, size) + 'もんめ');
        countEl.hidden = state === 'done';
      }
      if (opts.onProgress) opts.onProgress(info());
    }

    function clearWait() {
      clearTimeout(waitTimer);
      waitTimer = 0;
      waitLayer.hidden = true;
      waitLayer.classList.remove('is-run', 'is-hold');
      fxBox.innerHTML = '';
    }

    function hideResult() {
      clearTimeout(sayTimer);
      resultEl.hidden = true;
      resultEl.innerHTML = '';
      if (area) area.classList.remove('md-done');
    }

    function showQuestion() {
      clearWait();
      hideResult();
      state = 'play';
      curMissed = false;
      if (review) {
        cur = list[index];
      } else {
        cur = opts.make(index);
        list[index] = cur;
      }
      renderCount();
      opts.show(cur, info());
    }

    // あたらしい 10もん
    function start() {
      review = false;
      size = total;
      list = [];
      results = [];
      missed = [];
      index = 0;
      if (opts.onNewSet) opts.onNewSet();
      showQuestion();
    }

    // まちがえた もんだいだけ もういちど
    function startReview() {
      var again = missed.slice();
      if (!again.length) { start(); return; }
      review = true;
      list = again;
      size = again.length;
      results = [];
      missed = [];
      index = 0;
      showQuestion();
    }

    function correct(el) {
      if (state !== 'play') return;
      results[index] = !curMissed;
      goodSound();
      state = 'wait';
      renderCount();
      waitLayer.hidden = false;
      celebrate(fxBox, el);
      var sec = getWait();
      barFill.style.animationDuration = sec + 's';
      waitLayer.classList.remove('is-run');
      void waitLayer.offsetWidth;
      waitLayer.classList.add('is-run');
      shownAt = Date.now();
      clearTimeout(waitTimer);
      waitTimer = setTimeout(next, sec * 1000);
    }

    function wrong() {
      if (state !== 'play') return;
      if (!curMissed) {
        curMissed = true;
        missed.push(cur);
      }
    }

    // 自動で すすむのを やめる。keepFx が true なら はなまるは のこす（さわっても すすまない）
    function hold(keepFx) {
      if (state !== 'wait' && state !== 'hold') return;
      clearTimeout(waitTimer);
      waitTimer = 0;
      state = 'hold';
      waitLayer.classList.add('is-hold');
      if (!keepFx) waitLayer.hidden = true;
    }

    function next() {
      if (state !== 'wait' && state !== 'hold') return;
      clearWait();
      index++;
      if (index < size) showQuestion();
      else finish();
    }

    waitLayer.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (state !== 'wait') return;
      if (Date.now() - shownAt < TAP_GUARD_MS) return;
      next();
    });
    waitLayer.addEventListener('click', function (e) { e.preventDefault(); });
    document.addEventListener('keydown', function (e) {
      if (state === 'wait' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    });

    function finish() {
      state = 'done';
      cur = null;
      var ok = results.filter(function (x) { return x; }).length;
      var all = ok === size;
      renderCount();

      var btns = '';
      if (missed.length) {
        btns += '<button type="button" class="md-btn md-btn-again" data-act="again">まちがえた もんだいを もういちど</button>';
      }
      btns += '<button type="button" class="md-btn md-btn-next" data-act="next">つぎの ' + total + 'もん</button>';
      (opts.extraButtons || []).forEach(function (b, i) {
        btns += '<button type="button" class="md-btn md-btn-extra" data-extra="' + i + '">' + esc(b.label) + '</button>';
      });
      btns += '<a class="md-btn md-btn-home" href="' + esc(homeHref) + '">もくじ</a>';

      resultEl.innerHTML =
        '<div class="md-result-maru">' + hanamaruSvg() + '</div>' +
        (review ? '<p class="md-result-sub">まちがえた もんだい</p>' : '') +
        '<p class="md-score" role="status"><span>' + size + 'もんちゅう</span> <span><span class="md-score-n">' + ok +
          '</span>もん</span> <span>せいかい</span></p>' +
        '<p class="md-praise">' + (all ? 'ぜんぶ せいかい！ すごいね！' : 'がんばったね！') + '</p>' +
        '<div class="md-btns">' + btns + '</div>';
      resultEl.hidden = false;
      if (area) area.classList.add('md-done');
      if (opts.onFinish) opts.onFinish({ ok: ok, total: size, review: review, missed: missed.length });

      if (isShown(resultEl)) {
        endSound();
        clearTimeout(sayTimer);
        sayTimer = setTimeout(function () {
          speak(all ? 'ぜんぶ せいかい！ すごいね！' : 'がんばったね！');
        }, 700);
      }
      var first = resultEl.querySelector('.md-btn');
      if (first && first.focus) first.focus({ preventScroll: true });
    }

    resultEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act], [data-extra]');
      if (!b) return;
      if (b.dataset.act === 'again') startReview();
      else if (b.dataset.act === 'next') start();
      else {
        var x = (opts.extraButtons || [])[Number(b.dataset.extra)];
        if (x && x.onClick) x.onClick();
      }
    });

    // ほかの 画面に うつるときなど：まっているなら すぐ つぎへ（おわりの 画面は そのまま）
    function stop() {
      clearTimeout(sayTimer);
      if (state === 'wait') next();
    }

    // とちゅうで やめる（ほかの 画面に もどるとき）
    function cancel() {
      clearWait();
      hideResult();
      state = 'idle';
      cur = null;
    }

    return {
      start: start,
      cancel: cancel,
      correct: correct,
      wrong: wrong,
      hold: hold,
      next: next,
      stop: stop,
      // もんだいを とちゅうで 作りなおす（数えない）
      redo: function () { if (state === 'play' && !review) showQuestion(); },
      // とちゅうで 再読み込み されると こまる とき
      busy: function () { return state === 'wait' || state === 'hold' || (state === 'play' && (index > 0 || curMissed)); },
      waiting: function () { return state === 'wait'; },   // はなまるを 出して まっている
      finished: function () { return state === 'done'; },
      current: function () { return cur; },
      info: info
    };
  }

  // ---------- 先生用の せってい：まつ 時間 ----------
  // せっていの 画面に 入れる まとまりを 作る
  function settingsSection(cls) {
    var sec = document.createElement('section');
    sec.className = cls || 'md-set-sec';
    var h = 'md-h-wait-' + Math.floor(Math.random() * 1e6);
    sec.setAttribute('aria-labelledby', h);
    sec.innerHTML = '<h3 class="md-set-h" id="' + h + '">せいかいの あと、つぎの もんだいまで</h3>' +
      '<p class="md-set-note">せいかい すると、この じかん まってから 自動で つぎの もんだいに なります（まっている 間に 画面を タップすると すぐ つぎへ）。' +
      'もんだいに こたえる ほかの 教材（かずあそび・とけい・おかね・けいさん・きせつクイズ）も おなじに なります。</p>' +
      '<div class="md-set-waits" role="group" aria-label="まつ じかん"></div>';
    var box = sec.querySelector('.md-set-waits');
    function render() {
      var w = getWait();
      var html = '';
      for (var s = WAIT_MIN; s <= WAIT_MAX; s++) {
        html += '<button type="button" class="md-set-wait" data-s="' + s + '" aria-pressed="' + (s === w) + '">' + s + 'びょう</button>';
      }
      box.innerHTML = html;
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.md-set-wait');
      if (!b) return;
      setWait(Number(b.dataset.s));
      render();
    });
    render();
    sec.mondaiRender = render;
    return sec;
  }

  // せってい ボタン（ながおしで ひらく）と、まつ 時間だけの せってい 画面
  // gearBtn：<button class="md-gear">、hintEl：「ながく おして ください」
  function bindGear(gearBtn, hintEl, onOpen, onClose) {
    var HOLD_MS = 1000;
    var holdTimer = 0;
    var hintTimer = 0;
    var opened = false;

    var dlg = document.createElement('div');
    dlg.className = 'md-settings';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', 'せってい（せんせい よう）');
    dlg.hidden = true;
    dlg.innerHTML = '<div class="md-set-inner"><div class="md-set-head">' +
      '<h2 class="md-set-title">せってい（せんせい よう）</h2>' +
      '<button type="button" class="md-btn md-set-close">とじる</button></div></div>';
    var sec = settingsSection();
    dlg.querySelector('.md-set-inner').appendChild(sec);
    document.body.appendChild(dlg);
    var closeBtn = dlg.querySelector('.md-set-close');

    gearBtn.style.setProperty('--hold', HOLD_MS + 'ms');

    function open() {
      sec.mondaiRender();
      dlg.hidden = false;
      dlg.scrollTop = 0;
      document.body.classList.add('md-is-settings');
      if (onOpen) onOpen();
      closeBtn.focus({ preventScroll: true });
    }
    function close() {
      if (dlg.hidden) return;
      dlg.hidden = true;
      document.body.classList.remove('md-is-settings');
      if (onClose) onClose();
      gearBtn.focus({ preventScroll: true });
    }
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    function startHold() {
      clearTimeout(holdTimer);
      opened = false;
      if (hintEl) hintEl.hidden = true;
      gearBtn.classList.add('is-pressing');
      holdTimer = setTimeout(function () {
        opened = true;
        gearBtn.classList.remove('is-pressing');
        open();
      }, HOLD_MS);
    }
    function endHold() {
      if (!holdTimer) return;
      clearTimeout(holdTimer);
      holdTimer = 0;
      gearBtn.classList.remove('is-pressing');
      if (!opened && hintEl) {
        // みじかく おしたときは、そっと ヒントだけ 出す
        hintEl.hidden = false;
        clearTimeout(hintTimer);
        hintTimer = setTimeout(function () { hintEl.hidden = true; }, 1800);
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
    gearBtn.addEventListener('keyup', function (e) {
      if (e.key === 'Enter' || e.key === ' ') endHold();
    });

    return { isOpen: function () { return !dlg.hidden; }, close: close };
  }

  global.Mondai = {
    create: create,
    settingsSection: settingsSection,
    bindGear: bindGear,
    getWait: getWait
  };
})(window);
