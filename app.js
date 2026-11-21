(function () {
  'use strict';

  // 五十音表（null は空きマス）
  // r は行の色の番号（style.css の --r0〜--r11）
  var SEION = [
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

  // 濁音・半濁音（色は元の行と同じ。ぱ行だけは ば行と並ぶので別の色）
  var DAKUON = [
    ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
    ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
    ['だ', 'ぢ', 'づ', 'で', 'ど'],
    ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
    ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']
  ];
  var DAKUON_COLORS = [1, 2, 3, 5, 11];

  // 1文字だけだと読み方がぶれる文字の読み上げ用テキスト
  var SPEAK_AS = {
    'を': 'お'
  };

  var main = document.querySelector('main');
  var notice = document.getElementById('notice');
  var speedBtn = document.getElementById('speedBtn');

  var synth = window.speechSynthesis;
  var jaVoice = null;
  var slow = false;

  try { slow = localStorage.getItem('slow') === '1'; } catch (e) {}
  speedBtn.setAttribute('aria-pressed', String(slow));

  function pickVoice() {
    if (!synth) return;
    var voices = synth.getVoices() || [];
    var ja = voices.filter(function (v) {
      return /^ja(-|_|$)/i.test(v.lang);
    });
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

  function speak(ch) {
    if (!synth) return;
    var u = new SpeechSynthesisUtterance(SPEAK_AS[ch] || ch);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = slow ? 0.6 : 0.9;
    u.pitch = 1;
    u.volume = 1;
    synth.cancel();
    synth.speak(u);
  }

  var activeTimer = null;
  function flash(card) {
    var prev = main.querySelector('.card.is-active');
    if (prev) prev.classList.remove('is-active');
    card.classList.add('is-active');
    clearTimeout(activeTimer);
    activeTimer = setTimeout(function () {
      card.classList.remove('is-active');
    }, 600);
  }

  function build(grid, rows, colors) {
    var frag = document.createDocumentFragment();
    rows.forEach(function (row, r) {
      var color = colors ? colors[r] : r;
      row.forEach(function (ch) {
        if (ch === null) {
          var blank = document.createElement('div');
          blank.className = 'blank';
          blank.setAttribute('aria-hidden', 'true');
          frag.appendChild(blank);
          return;
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card';
        var label = document.createElement('span');
        label.className = 'card-label';
        label.textContent = ch;
        btn.appendChild(label);
        btn.setAttribute('aria-label', ch);
        btn.style.setProperty('--row-color', 'var(--r' + color + ')');
        frag.appendChild(btn);
      });
    });
    grid.appendChild(frag);
  }

  build(document.getElementById('grid-seion'), SEION);
  build(document.getElementById('grid-dakuon'), DAKUON, DAKUON_COLORS);

  main.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    flash(card);
    speak(card.textContent);
  });

  // 「あ〜ん」「が・ざ・だ・ば・ぱ」の切り替え
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (synth) synth.cancel();
    window.scrollTo(0, 0);
    try { localStorage.setItem('tab', tab.id); } catch (e) {}
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
    var saved = document.getElementById(localStorage.getItem('tab') || '');
    if (saved && saved.classList.contains('tab')) selectTab(saved);
  } catch (e) {}

  speedBtn.addEventListener('click', function () {
    slow = !slow;
    speedBtn.setAttribute('aria-pressed', String(slow));
    try { localStorage.setItem('slow', slow ? '1' : '0'); } catch (e) {}
  });

  // オフライン対応（Service Worker）
  if ('serviceWorker' in navigator) {
    // すでに古い版が動いていたときだけ、新しい版への切り替えで1回だけ再読み込みする
    var hadController = !!navigator.serviceWorker.controller;
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
        .then(function (reg) {
          // ホーム画面から開き直したとき（画面に戻ったとき）も更新を確認する
          document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') reg.update().catch(function () {});
          });
        })
        .catch(function () {});
    });
  }
})();
