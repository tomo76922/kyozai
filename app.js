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
        btn.textContent = ch;
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

  speedBtn.addEventListener('click', function () {
    slow = !slow;
    speedBtn.setAttribute('aria-pressed', String(slow));
    try { localStorage.setItem('slow', slow ? '1' : '0'); } catch (e) {}
  });

  // オフライン対応（Service Worker）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
    });
  }
})();
