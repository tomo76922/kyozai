(function () {
  'use strict';

  // ---------- 絵（外部の画像は使わず、ここで SVG を作る） ----------
  var INK = '#3d3a35';

  var PICS = {
    ichigo:
      '<path d="M50 30 Q30 22 18 34 Q10 46 20 62 Q32 82 50 92 Q68 82 80 62 Q90 46 82 34 Q70 22 50 30 Z" ' +
        'fill="#e06a6a" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<g fill="#f7e3a1">' +
        '<ellipse cx="34" cy="44" rx="2.2" ry="3.2"/><ellipse cx="50" cy="44" rx="2.2" ry="3.2"/><ellipse cx="66" cy="44" rx="2.2" ry="3.2"/>' +
        '<ellipse cx="27" cy="56" rx="2.2" ry="3.2"/><ellipse cx="42" cy="57" rx="2.2" ry="3.2"/><ellipse cx="58" cy="57" rx="2.2" ry="3.2"/><ellipse cx="73" cy="56" rx="2.2" ry="3.2"/>' +
        '<ellipse cx="36" cy="70" rx="2.2" ry="3.2"/><ellipse cx="50" cy="71" rx="2.2" ry="3.2"/><ellipse cx="64" cy="70" rx="2.2" ry="3.2"/>' +
        '<ellipse cx="50" cy="83" rx="2.2" ry="3.2"/>' +
      '</g>' +
      '<path d="M50 32 L36 22 L44 24 L38 12 L50 22 L62 12 L56 24 L64 22 Z" ' +
        'fill="#8fbf7a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M50 22 Q50 14 54 8" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>',
    hoshi:
      '<path d="M50 8 L61 36 L91 38 L68 57 L76 87 L50 70 L24 87 L32 57 L9 38 L39 36 Z" ' +
        'fill="#f3cf63" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M46 26 L41 40" stroke="#fbe7a6" stroke-width="5" stroke-linecap="round"/>',
    hana:
      '<g fill="#efa7b8" stroke="' + INK + '" stroke-width="3">' +
        '<circle cx="50" cy="25" r="16"/><circle cx="74" cy="42" r="16"/><circle cx="65" cy="70" r="16"/>' +
        '<circle cx="35" cy="70" r="16"/><circle cx="26" cy="42" r="16"/>' +
      '</g>' +
      '<circle cx="50" cy="50" r="14" fill="#f3cf63" stroke="' + INK + '" stroke-width="3"/>',
    maru:
      '<circle cx="50" cy="50" r="38" fill="#8fb4d6" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M30 40 Q34 28 46 24" fill="none" stroke="#cfe0ef" stroke-width="6" stroke-linecap="round"/>'
  };
  var PIC_NAMES = Object.keys(PICS);

  function picSvg(name) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + PICS[name] + '</svg>';
  }

  // 数の読み（4は よん、7は なな）
  var READ = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう'];

  // ---------- 読み上げ（ひらがなカードと同じ） ----------
  var notice = document.getElementById('notice');
  var speedBtn = document.getElementById('speedBtn');

  var synth = window.speechSynthesis;
  var jaVoice = null;
  var slow = false;

  try { slow = localStorage.getItem('kazu-slow') === '1'; } catch (e) {}
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

  // 読み上げて、おわったら next を呼ぶ（おわりの合図が来ないときも、時間で先に進む）
  function speak(text, next) {
    var finished = false;
    var timer = null;
    function done() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (next) next();
    }
    if (!synth) {
      timer = setTimeout(done, slow ? 1200 : 700);
      return;
    }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = slow ? 0.6 : 0.9;
    u.pitch = 1;
    u.volume = 1;
    u.onend = done;
    u.onerror = done;
    current = u;
    synth.cancel();
    synth.speak(u);
    timer = setTimeout(done, (slow ? 900 : 600) * Math.max(2, text.length) + 600);
  }

  function stopSpeech() {
    if (synth) synth.cancel();
  }

  speedBtn.addEventListener('click', function () {
    slow = !slow;
    speedBtn.setAttribute('aria-pressed', String(slow));
    try { localStorage.setItem('kazu-slow', slow ? '1' : '0'); } catch (e) {}
  });

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

  // せいかいの音：やさしい「ピン・ポン」（ひかえめな音量）
  function goodSound() {
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      var play = function () {
        var t = ctx.currentTime + 0.03;
        bell(t, 784, 0.16);         // ソ
        bell(t + 0.22, 1047, 0.14); // ド
      };
      if (ctx.state !== 'running' && ctx.resume) {
        ctx.resume().then(play, play);
      } else {
        play();
      }
    } catch (e) {}
  }

  // ---------- 共通：絵をならべる（5こずつ 2だん） ----------
  function fillFrame(frame, n, pic) {
    var html = '';
    for (var i = 1; i <= 10; i++) {
      html += '<span class="slot">' + (i <= n ? picSvg(pic) : '') + '</span>';
    }
    frame.innerHTML = html;
  }

  function buildNums(box, cls) {
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= 10; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'num ' + cls;
      b.dataset.n = String(i);
      b.textContent = String(i);
      b.setAttribute('aria-label', READ[i]);
      frag.appendChild(b);
    }
    box.appendChild(frag);
  }

  // ---------- かぞえる ----------
  var countFrame = document.getElementById('countFrame');
  var countText = document.getElementById('countText');
  var countNums = document.getElementById('countNums');
  var countRun = 0;      // 新しく数えはじめたら ふえる（前の数えかたを止めるため）
  var counting = false;

  buildNums(countNums, 'num-count');
  fillFrame(countFrame, 0, 'ichigo');

  function stopCount() {
    countRun++;
    counting = false;
    stopSpeech();
  }

  function startCount(n, btn) {
    stopCount();
    var run = countRun;
    counting = true;

    var prev = countNums.querySelector('.num.is-on');
    if (prev) prev.classList.remove('is-on');
    btn.classList.add('is-on');

    fillFrame(countFrame, 0, 'ichigo');
    var slots = countFrame.querySelectorAll('.slot');
    countText.className = 'stage-text is-big';
    countText.textContent = '';

    var i = 0;
    function step() {
      if (run !== countRun) return;
      if (i >= n) {
        countText.className = 'stage-text is-total';
        countText.textContent = 'ぜんぶで ' + n;
        speak('ぜんぶで ' + READ[n], function () {
          if (run === countRun) counting = false;
        });
        return;
      }
      i++;
      slots[i - 1].innerHTML = picSvg('ichigo');
      slots[i - 1].classList.add('pop');
      countText.textContent = String(i);
      speak(READ[i], function () {
        setTimeout(step, slow ? 450 : 200);
      });
    }
    // 前の読み上げを止めてから、少し間をあけて はじめる
    setTimeout(step, 150);
  }

  countNums.addEventListener('click', function (e) {
    var b = e.target.closest('.num');
    if (b) startCount(Number(b.dataset.n), b);
  });

  // 数えている間は、新しい版への自動の再読み込みをしない
  window.kyozaiBusy = function () { return counting; };

  // ---------- いくつかな ----------
  var quizFrame = document.getElementById('quizFrame');
  var quizText = document.getElementById('quizText');
  var quizNums = document.getElementById('quizNums');
  var nextBtn = document.getElementById('nextBtn');
  var rangeBtns = Array.prototype.slice.call(document.querySelectorAll('.seg-btn'));

  var maxN = 5;
  var answer = 0;
  var pic = '';
  var solved = false;
  var sayTimer = null;   // 「せいかい」を読み上げるまでの まち時間

  try { if (localStorage.getItem('kazu-range') === '10') maxN = 10; } catch (e) {}

  buildNums(quizNums, 'num-quiz');

  function pickOther(list, prev) {
    var c = list.filter(function (x) { return x !== prev; });
    return c[Math.floor(Math.random() * c.length)];
  }

  function newQuestion() {
    var nums = [];
    for (var i = 1; i <= maxN; i++) nums.push(i);
    answer = pickOther(nums, answer);
    pic = pickOther(PIC_NAMES, pic);
    solved = false;
    clearTimeout(sayTimer);
    stopSpeech();
    fillFrame(quizFrame, answer, pic);
    quizFrame.classList.toggle('is-five', maxN === 5);
    quizText.className = 'stage-text';
    quizText.textContent = 'いくつ あるかな？';
    Array.prototype.forEach.call(quizNums.children, function (b) {
      b.classList.remove('is-ok', 'is-ng');
    });
  }

  function setRange(n) {
    maxN = n;
    rangeBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.max) === n));
    });
    quizNums.classList.toggle('is-five', n === 5);
    Array.prototype.forEach.call(quizNums.children, function (b) {
      b.hidden = Number(b.dataset.n) > n;
    });
    try { localStorage.setItem('kazu-range', String(n)); } catch (e) {}
    newQuestion();
  }

  rangeBtns.forEach(function (b) {
    b.addEventListener('click', function () { setRange(Number(b.dataset.max)); });
  });

  nextBtn.addEventListener('click', function () {
    unlockAudio();
    newQuestion();
  });

  quizNums.addEventListener('click', function (e) {
    var b = e.target.closest('.num');
    if (!b || solved) return;
    unlockAudio();
    var n = Number(b.dataset.n);
    Array.prototype.forEach.call(quizNums.children, function (x) {
      x.classList.remove('is-ng');
    });
    if (n === answer) {
      solved = true;
      b.classList.add('is-ok');
      quizText.className = 'stage-text is-ok';
      quizText.textContent = 'せいかい';
      goodSound();
      // 音と重ならないように、少しあとで読み上げる
      clearTimeout(sayTimer);
      sayTimer = setTimeout(function () { speak('せいかい'); }, 500);
    } else {
      // 同じ ボタンを もう一度 おしても 動きが わかるように、いったん外してから つける
      void b.offsetWidth;
      b.classList.add('is-ng');
      quizText.className = 'stage-text is-retry';
      quizText.textContent = 'もういちど';
    }
  });

  setRange(maxN);

  // ---------- 「かぞえる」「いくつかな」の切り替え ----------
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    stopCount();
    clearTimeout(sayTimer);
    window.scrollTo(0, 0);
    try { localStorage.setItem('kazu-tab', tab.id); } catch (e) {}
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
    var saved = document.getElementById(localStorage.getItem('kazu-tab') || '');
    if (saved && saved.classList.contains('tab')) selectTab(saved);
  } catch (e) {}

  // ほかの画面に切り替えたら、数えるのを止める
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') stopCount();
  });
})();
