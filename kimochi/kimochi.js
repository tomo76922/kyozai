(function () {
  'use strict';

  // ---------- 絵（外部の画像は使わず、ここで SVG を作る） ----------
  var INK = '#3d3a35';

  function face(color) {
    return '<circle cx="50" cy="54" r="38" fill="' + color + '" stroke="' + INK + '" stroke-width="3.5"/>';
  }
  function line(d, color, width) {
    return '<path d="' + d + '" fill="none" stroke="' + (color || INK) +
      '" stroke-width="' + (width || 3.5) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function fill(d, color, stroke) {
    return '<path d="' + d + '" fill="' + color + '"' +
      (stroke ? ' stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"' : '') + '/>';
  }

  // 目
  var EYES = {
    dot:     '<circle cx="37" cy="50" r="4.5" fill="' + INK + '"/><circle cx="63" cy="50" r="4.5" fill="' + INK + '"/>',
    down:    '<circle cx="36" cy="53" r="4" fill="' + INK + '"/><circle cx="62" cy="53" r="4" fill="' + INK + '"/>',
    happy:   line('M30 52 Q37 42 44 52') + line('M56 52 Q63 42 70 52'),
    closed:  line('M30 50 Q37 57 44 50') + line('M56 50 Q63 57 70 50'),
    half:    fill('M30 49 L44 49 Q37 58 30 49 Z', INK) + fill('M56 49 L70 49 Q63 58 56 49 Z', INK) +
             line('M29 49 L45 49') + line('M55 49 L71 49'),
    wide:    '<circle cx="37" cy="50" r="7.5" fill="#fff" stroke="' + INK + '" stroke-width="3"/>' +
             '<circle cx="63" cy="50" r="7.5" fill="#fff" stroke="' + INK + '" stroke-width="3"/>' +
             '<circle cx="37" cy="51" r="3.2" fill="' + INK + '"/><circle cx="63" cy="51" r="3.2" fill="' + INK + '"/>',
    squeeze: line('M31 44 L42 50 L31 56') + line('M69 44 L58 50 L69 56'),
    swirl:   line('M37 50 m-1 -1 a2.5 2.5 0 1 1 2.5 2.5 a5 5 0 1 1 5 -5', INK, 2.8) +
             line('M63 50 m-1 -1 a2.5 2.5 0 1 1 2.5 2.5 a5 5 0 1 1 5 -5', INK, 2.8)
  };

  // まゆ
  var BROWS = {
    sad:    line('M29 41 L43 35') + line('M71 41 L57 35'),
    angry:  line('M29 35 L44 42') + line('M71 35 L56 42'),
    up:     line('M30 39 Q37 32 44 37') + line('M70 39 Q63 32 56 37')
  };

  // 口
  var MOUTH = {
    smile:  line('M36 64 Q50 76 64 64'),
    big:    fill('M33 62 Q50 86 67 62 Z', '#8a3b32', true) + fill('M42 74 Q50 69 58 74 Q50 80 42 74 Z', '#e8908a'),
    flat:   line('M39 69 L61 69'),
    frown:  line('M37 73 Q50 62 63 73'),
    angry:  line('M36 74 Q50 61 64 74'),
    small:  line('M43 71 Q50 66 57 71'),
    wavy:   line('M34 70 Q39 65 44 70 T54 70 T64 70', INK, 3),
    o:      '<ellipse cx="50" cy="70" rx="5.5" ry="6.5" fill="#8a3b32" stroke="' + INK + '" stroke-width="2.5"/>',
    tongue: line('M38 66 Q50 72 62 66') + fill('M44 68 L44 76 Q50 84 56 76 L56 68 Z', '#e8908a', true),
    drool:  line('M36 64 Q50 76 64 64') + fill('M62 67 Q58 74 62 77 Q66 74 62 67 Z', '#8ec5e8', true)
  };

  // そのほかの しるし
  var EXTRA = {
    blush:   '<ellipse cx="27" cy="62" rx="6" ry="3.6" fill="#ef9c96" opacity="0.75"/>' +
             '<ellipse cx="73" cy="62" rx="6" ry="3.6" fill="#ef9c96" opacity="0.75"/>',
    sparkle: fill('M85 8 Q86 17 95 18 Q86 19 85 28 Q84 19 75 18 Q84 17 85 8 Z', '#f0b43c') +
             fill('M14 10 Q15 16 21 17 Q15 18 14 24 Q13 18 7 17 Q13 16 14 10 Z', '#f0b43c'),
    tears:   fill('M36 57 Q31 66 36 71 Q41 66 36 57 Z', '#6fa8dc', true) +
             fill('M64 57 Q59 66 64 71 Q69 66 64 57 Z', '#6fa8dc', true),
    tear:    fill('M34 58 Q30 65 34 69 Q38 65 34 58 Z', '#6fa8dc', true),
    sweat:   fill('M82 24 Q74 36 82 41 Q90 36 82 24 Z', '#a9d5f0', true),
    gloom:   line('M38 20 L38 30', '#7b86b8', 3) + line('M50 18 L50 30', '#7b86b8', 3) + line('M62 20 L62 30', '#7b86b8', 3),
    anger:   line('M77 14 Q81 18 77 22', '#c0392b', 3.5) + line('M91 14 Q87 18 91 22', '#c0392b', 3.5) +
             line('M80 11 Q84 15 88 11', '#c0392b', 3.5) + line('M80 25 Q84 21 88 25', '#c0392b', 3.5),
    dots:    '<circle cx="78" cy="14" r="3" fill="' + INK + '"/><circle cx="87" cy="14" r="3" fill="' + INK + '"/><circle cx="96" cy="14" r="3" fill="' + INK + '"/>',
    zzz:     line('M70 10 L82 10 L70 22 L82 22', '#6b7fb0', 3.5) + line('M86 26 L94 26 L86 34 L94 34', '#6b7fb0', 3),
    bandage: '<g transform="rotate(-25 66 30)"><rect x="52" y="24" width="28" height="12" rx="5" fill="#f3d9b5" stroke="' + INK + '" stroke-width="2.5"/>' +
             '<rect x="61" y="24" width="10" height="12" fill="#e9c393"/></g>' +
             line('M10 22 L16 28', '#d9534f', 3) + line('M8 34 L15 35', '#d9534f', 3) + line('M18 14 L21 21', '#d9534f', 3),
    shiver:  line('M7 40 L3 46 L7 52 L3 58', '#6b9fc6', 3) + line('M93 40 L97 46 L93 52 L97 58', '#6b9fc6', 3),
    snow:    '<g stroke="#6b9fc6" stroke-width="3" stroke-linecap="round"><path d="M86 6 L86 26 M77 11 L95 21 M77 21 L95 11"/></g>',
    sun:     '<circle cx="86" cy="14" r="8" fill="#f0b43c" stroke="' + INK + '" stroke-width="2.5"/>' +
             '<g stroke="#f0b43c" stroke-width="3" stroke-linecap="round"><path d="M86 1 L86 3 M73 14 L75 14 M76.8 4.8 L78.2 6.2 M95.2 4.8 L93.8 6.2 M76.8 23.2 L78.2 21.8"/></g>',
    heat:    fill('M16 26 Q10 36 16 40 Q22 36 16 26 Z', '#a9d5f0', true) + fill('M84 30 Q78 40 84 44 Q90 40 84 30 Z', '#a9d5f0', true),
    glass:   fill('M74 62 L96 62 L92 96 L78 96 Z', '#ffffff', true) + fill('M77 82 L93 82 L92 94 L78 94 Z', '#cfe7f6'),
    bowl:    fill('M70 80 Q83 64 96 80 Z', '#ffffff', true) + fill('M66 80 L100 80 Q99 97 83 97 Q67 97 66 80 Z', '#c9734f', true) +
             line('M78 60 L90 78', INK, 2.5) + line('M84 58 L92 77', INK, 2.5)
  };

  function faceSvg(color, parts) {
    return face(color) + parts.join('');
  }

  // トイレの絵
  var TOILET =
    '<rect x="26" y="8" width="48" height="26" rx="5" fill="#f2f5f7" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="40" y="16" width="20" height="5" rx="2.5" fill="#b9c6cf"/>' +
    '<path d="M16 42 L84 42 Q84 70 60 76 L62 94 L38 94 L40 76 Q16 70 16 42 Z" fill="#f2f5f7" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M20 42 L80 42 Q78 56 50 58 Q22 56 20 42 Z" fill="#a9d5f0"/>' +
    '<rect x="12" y="36" width="76" height="8" rx="4" fill="#d9e1e6" stroke="' + INK + '" stroke-width="3.5"/>';

  // ---------- カード ----------
  // say は読み上げ（ない ときは word をそのまま読む）
  var SETS = {
    kimochi: [
      { word: 'うれしい',   tone: '#f2d06b', svg: faceSvg('#f7dc85', [EYES.happy, MOUTH.smile, EXTRA.blush]) },
      { word: 'たのしい',   tone: '#f0a96a', svg: faceSvg('#f6c08f', [EYES.happy, MOUTH.big, EXTRA.blush, EXTRA.sparkle]) },
      { word: 'ふつう',     tone: '#c9b79c', svg: faceSvg('#eadcbc', [EYES.dot, MOUTH.flat]) },
      { word: 'かなしい',   tone: '#8fb0d3', svg: faceSvg('#b6cde4', [BROWS.sad, EYES.closed, MOUTH.frown, EXTRA.tears]) },
      { word: 'こわい',     tone: '#a99bc9', svg: faceSvg('#cfc5e2', [BROWS.up, EYES.wide, MOUTH.wavy, EXTRA.gloom, EXTRA.sweat]) },
      { word: 'おこってる', tone: '#df8a7c', svg: faceSvg('#eea596', [BROWS.angry, EYES.dot, MOUTH.angry, EXTRA.anger]) },
      { word: 'さみしい',   tone: '#9fabb8', svg: faceSvg('#c3cbd3', [BROWS.sad, EYES.down, MOUTH.small, EXTRA.tear, EXTRA.dots]) }
    ],
    karada: [
      { word: 'つかれた',       tone: '#c4b08c', svg: faceSvg('#e0d2b3', [EYES.half, MOUTH.wavy, EXTRA.gloom, EXTRA.sweat]) },
      { word: 'ねむい',         tone: '#9ea8cf', svg: faceSvg('#c8cee6', [EYES.closed, MOUTH.o, EXTRA.zzz]) },
      { word: 'いたい',         tone: '#de9a86', svg: faceSvg('#efbcad', [EYES.squeeze, MOUTH.frown, EXTRA.tears, EXTRA.bandage]) },
      { word: 'きもちわるい',   tone: '#9fc086', svg: faceSvg('#bfd8a9', [EYES.swirl, MOUTH.wavy, EXTRA.gloom, EXTRA.sweat]) },
      { word: 'さむい',         tone: '#8cbfdc', svg: faceSvg('#bcdcef', [BROWS.up, EYES.squeeze, MOUTH.wavy, EXTRA.shiver, EXTRA.snow]) },
      { word: 'あつい',         tone: '#e88c6c', svg: faceSvg('#f3ab92', [EYES.half, MOUTH.o, EXTRA.blush, EXTRA.heat, EXTRA.sun]) },
      { word: 'のどがかわいた', tone: '#e3b866', svg: faceSvg('#f3d6a0', [EYES.dot, MOUTH.tongue, EXTRA.glass]) },
      { word: 'おなかがすいた', tone: '#e6a95e', svg: faceSvg('#f5d39a', [EYES.dot, MOUTH.drool, EXTRA.bowl]) },
      { word: 'トイレ',         tone: '#8cb3c9', svg: TOILET }
    ]
  };

  function svgOf(item) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + item.svg + '</svg>';
  }

  // ---------- 読み上げ（ひらがなカードと同じ） ----------
  var notice = document.getElementById('notice');
  var speedBtn = document.getElementById('speedBtn');

  var synth = window.speechSynthesis;
  var jaVoice = null;
  var slow = false;

  try { slow = localStorage.getItem('kimochi-slow') === '1'; } catch (e) {}
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

  function speak(text) {
    if (!synth) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = slow ? 0.6 : 0.9;
    u.pitch = 1;
    u.volume = 1;
    synth.cancel();
    synth.speak(u);
  }

  speedBtn.addEventListener('click', function () {
    slow = !slow;
    speedBtn.setAttribute('aria-pressed', String(slow));
    try { localStorage.setItem('kimochi-slow', slow ? '1' : '0'); } catch (e) {}
  });

  // ---------- いちらんを作る ----------
  function build(name) {
    var grid = document.getElementById('grid-' + name);
    var frag = document.createDocumentFragment();
    SETS[name].forEach(function (item, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.dataset.set = name;
      btn.dataset.index = String(i);
      btn.style.setProperty('--tone', item.tone);
      btn.innerHTML = '<span class="card-pic">' + svgOf(item) + '</span>';
      var label = document.createElement('span');
      label.className = 'card-label';
      label.textContent = item.word;
      label.style.setProperty('--len', String(item.word.length));
      btn.appendChild(label);
      frag.appendChild(btn);
    });
    grid.appendChild(frag);
  }
  build('kimochi');
  build('karada');

  // ---------- 大きく見せる ----------
  var list = document.getElementById('list');
  var big = document.getElementById('big');
  var bigCard = document.getElementById('bigCard');
  var bigPic = document.getElementById('bigPic');
  var bigLabel = document.getElementById('bigLabel');
  var lastCard = null;
  var openedAt = 0;

  function openBig(card) {
    var item = SETS[card.dataset.set][Number(card.dataset.index)];
    lastCard = card;
    bigPic.innerHTML = svgOf(item);
    bigLabel.textContent = item.word;
    bigLabel.style.setProperty('--len', String(item.word.length));
    big.style.setProperty('--tone', item.tone);
    big.hidden = false;
    document.body.classList.add('is-big');
    openedAt = Date.now();
    bigCard.focus({ preventScroll: true });
    speak(item.say || item.word);
  }

  function closeBig() {
    if (big.hidden) return;
    big.hidden = true;
    document.body.classList.remove('is-big');
    if (synth) synth.cancel();
    if (lastCard) lastCard.focus({ preventScroll: true });
  }

  list.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (card) openBig(card);
  });

  // もう一度タップで いちらんに もどる（あわてて2回タップしても すぐには もどらない）
  big.addEventListener('click', function (e) {
    if (e.target.closest('.big-home')) return;
    if (Date.now() - openedAt < 400) return;
    closeBig();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeBig();
  });

  // ---------- 「きもち」「からだ」の切り替え ----------
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
    try { localStorage.setItem('kimochi-tab', tab.id); } catch (e) {}
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
    var saved = document.getElementById(localStorage.getItem('kimochi-tab') || '');
    if (saved && saved.classList.contains('tab')) selectTab(saved);
  } catch (e) {}
})();
