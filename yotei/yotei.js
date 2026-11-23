(function () {
  'use strict';

  // ---------- 絵（外部の画像は使わず、ここで SVG を作る） ----------
  var INK = '#3d3a35';
  var S = ' stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"';

  function line(d, color, width) {
    return '<path d="' + d + '" fill="none" stroke="' + (color || INK) +
      '" stroke-width="' + (width || 3.5) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function shape(d, color) {
    return '<path d="' + d + '" fill="' + color + '"' + S + '/>';
  }

  // 太陽の光（cx, cy を中心に、from〜to 度の あいだに n 本）
  function rays(cx, cy, r1, r2, from, to, n, color) {
    var d = '';
    for (var i = 0; i < n; i++) {
      var a = (from + (to - from) * i / (n - 1)) * Math.PI / 180;
      d += 'M' + (cx + r1 * Math.cos(a)).toFixed(1) + ' ' + (cy + r1 * Math.sin(a)).toFixed(1) +
           'L' + (cx + r2 * Math.cos(a)).toFixed(1) + ' ' + (cy + r2 * Math.sin(a)).toFixed(1);
    }
    return line(d, color, 4.5);
  }

  // 三角の旗を ひもに つるす
  function flags(y0, sag, colors) {
    var out = line('M6 ' + y0 + ' Q50 ' + (y0 + sag * 2) + ' 94 ' + y0, INK, 2.5);
    [14, 32, 50, 68, 86].forEach(function (x, i) {
      var t = (x - 6) / 88;
      var y = y0 + 2 * sag * 2 * t * (1 - t);
      out += shape('M' + (x - 8) + ' ' + y.toFixed(1) + 'L' + (x + 8) + ' ' + y.toFixed(1) +
                   'L' + x + ' ' + (y + 18).toFixed(1) + 'Z', colors[i % colors.length]);
    });
    return out;
  }

  var PICS = {
    asa:
      '<rect x="6" y="68" width="88" height="20" rx="8" fill="#cfe0b0"' + S + '/>' +
      rays(50, 68, 31, 40, 190, 350, 7, '#f0b43c') +
      shape('M26 68 A24 24 0 0 1 74 68 Z', '#f7c85a'),
    benkyo:
      shape('M50 40 Q32 32 10 36 L10 86 Q32 82 50 90 Z', '#ffffff') +
      shape('M50 40 Q68 32 90 36 L90 86 Q68 82 50 90 Z', '#ffffff') +
      line('M18 50 Q30 47 42 52 M18 62 Q30 59 42 64 M18 74 Q30 71 42 76', '#9fb0c0', 3) +
      line('M58 52 Q70 47 82 50 M58 64 Q70 59 82 62 M58 76 Q70 71 82 74', '#9fb0c0', 3) +
      '<g transform="rotate(-30 50 20)">' +
        '<rect x="22" y="13" width="46" height="13" rx="2" fill="#f3cf63"' + S + '/>' +
        shape('M68 13 L82 19.5 L68 26 Z', '#f6dcb4') +
        '<path d="M78 17.6 L82 19.5 L78 21.4 Z" fill="' + INK + '"/>' +
        '<rect x="14" y="13" width="9" height="13" rx="2" fill="#ef9fb8"' + S + '/>' +
      '</g>',
    yasumi:
      line('M36 12 Q30 20 36 28 Q42 36 36 42 M54 10 Q48 18 54 26 Q60 34 54 40', '#b7aea0', 3.5) +
      '<ellipse cx="46" cy="88" rx="38" ry="7" fill="#e6efe9"' + S + '/>' +
      line('M70 54 Q86 54 84 66 Q82 78 68 76', INK, 4.5) +
      shape('M20 48 L72 48 L67 80 Q46 90 25 80 Z', '#ffffff') +
      '<ellipse cx="46" cy="50" rx="24" ry="4" fill="#c99b6a"/>',
    hiru:
      line('M58 8 L86 46 M66 6 L90 42', '#a7764a', 4) +
      shape('M20 54 Q22 26 50 24 Q78 26 80 54 Z', '#ffffff') +
      '<circle cx="50" cy="36" r="6" fill="#d9534f"/>' +
      shape('M12 54 L88 54 Q86 84 50 86 Q14 84 12 54 Z', '#d9775a') +
      line('M18 64 L82 64', '#f2c9a8', 3) +
      '<rect x="36" y="85" width="28" height="8" rx="3" fill="#b85f47"' + S + '/>',
    undo:
      line('M8 92 L92 92', '#b7aea0', 3) +
      line('M8 40 L24 40 M4 52 L20 52 M10 64 L24 64', '#e0a99c', 3.5) +
      line('M56 30 L46 58', '#e07a6a', 9) +
      line('M54 36 L68 46 L80 38 M54 36 L40 42 L30 34', INK, 5.5) +
      line('M46 58 L60 70 L56 88 M46 58 L36 74 L20 76', INK, 5.5) +
      '<circle cx="60" cy="18" r="10" fill="#f6d2b0"' + S + '/>',
    aruku:
      '<g transform="rotate(-12 32 64)" fill="#8c7b62">' +
        '<ellipse cx="32" cy="58" rx="12" ry="17"/><ellipse cx="32" cy="84" rx="9" ry="8"/></g>' +
      '<g transform="rotate(12 68 34)" fill="#8c7b62">' +
        '<ellipse cx="68" cy="28" rx="12" ry="17"/><ellipse cx="68" cy="54" rx="9" ry="8"/></g>',
    ongaku:
      shape('M38 26 L82 14 L82 26 L38 38 Z', '#8e6bb8') +
      line('M38 28 L38 76 M82 16 L82 66', INK, 4.5) +
      '<ellipse cx="29" cy="78" rx="12" ry="9" transform="rotate(-20 29 78)" fill="#8e6bb8"' + S + '/>' +
      '<ellipse cx="73" cy="68" rx="12" ry="9" transform="rotate(-20 73 68)" fill="#8e6bb8"' + S + '/>' +
      line('M12 18 L12 34 M6 26 L18 26', '#f0b43c', 3),
    kansatsu:
      shape('M10 86 Q8 44 54 26 Q60 72 10 86 Z', '#a8cf8a') +
      line('M12 84 Q30 58 50 32 M24 68 L22 52 M34 56 L44 58', '#5f8a48', 3) +
      line('M74 62 L90 80', '#8a6a4a', 10) +
      '<circle cx="60" cy="46" r="20" fill="#d6ecf7" fill-opacity="0.75" stroke="' + INK + '" stroke-width="5"/>' +
      line('M50 38 Q54 32 60 32', '#ffffff', 3.5),
    boccia:
      line('M4 84 L96 84', '#b7aea0', 3) +
      '<circle cx="50" cy="36" r="9" fill="#ffffff"' + S + '/>' +
      '<circle cx="28" cy="64" r="18" fill="#d9534f"' + S + '/>' +
      '<circle cx="72" cy="62" r="18" fill="#4f7fc0"' + S + '/>' +
      line('M20 56 Q24 52 30 52 M64 54 Q68 50 74 50', '#ffffff', 3),
    gyoji:
      flags(16, 6, ['#d9534f', '#f3cf63', '#4f7fc0', '#8fc07a', '#ef9fb8']) +
      flags(56, 6, ['#f3cf63', '#4f7fc0', '#d9534f', '#ef9fb8', '#8fc07a']),
    otanoshimi:
      line('M10 14 L10 24 M5 19 L15 19 M88 8 L88 18 M83 13 L93 13', '#f0b43c', 3) +
      shape('M50 32 Q34 12 28 24 Q24 34 50 32 Z', '#f3cf63') +
      shape('M50 32 Q66 12 72 24 Q76 34 50 32 Z', '#f3cf63') +
      '<rect x="18" y="46" width="64" height="44" rx="4" fill="#ef9fb8"' + S + '/>' +
      '<rect x="12" y="32" width="76" height="16" rx="4" fill="#f5b7c9"' + S + '/>' +
      '<rect x="44" y="32" width="12" height="58" fill="#f3cf63"' + S + '/>',
    kaeri:
      '<circle cx="82" cy="18" r="10" fill="#f0a96a"/>' +
      shape('M22 48 L78 48 L78 88 L22 88 Z', '#fff6e0') +
      shape('M10 52 L50 16 L90 52 Z', '#d9775a') +
      '<rect x="42" y="62" width="16" height="26" rx="2" fill="#b98a5e"' + S + '/>' +
      '<rect x="27" y="58" width="11" height="11" fill="#cfe7f6"' + S + '/>' +
      '<rect x="62" y="58" width="11" height="11" fill="#cfe7f6"' + S + '/>'
  };

  // 用意してある カード（順番は せっていの ならび順）
  var PRESETS = [
    { k: 'asa',        word: 'あさのかい',   tone: '#f2c46b' },
    { k: 'benkyo',     word: 'べんきょう',   tone: '#8fb4d6' },
    { k: 'yasumi',     word: 'やすみじかん', tone: '#a8c99a' },
    { k: 'hiru',       word: 'おひるごはん', tone: '#e8a66a' },
    { k: 'undo',       word: 'うんどう',     tone: '#e08a7a' },
    { k: 'aruku',      word: 'あるく',       tone: '#c4b08c' },
    { k: 'ongaku',     word: 'おんがく',     tone: '#c3a2d6' },
    { k: 'kansatsu',   word: 'かんさつ',     tone: '#8fc0a8' },
    { k: 'boccia',     word: 'ぼっちゃ',     tone: '#d98f8f' },
    { k: 'gyoji',      word: 'ぎょうじ',     tone: '#e3b75c' },
    { k: 'otanoshimi', word: 'おたのしみ',   tone: '#ef9fb8' },
    { k: 'kaeri',      word: 'かえりのかい', tone: '#9fb0d0' }
  ];
  var PRESET_BY_KEY = {};
  PRESETS.forEach(function (p) { PRESET_BY_KEY[p.k] = p; });

  // 自分で つくった カードの色（ことばから きめる）
  var OWN_TONES = ['#a9bccb', '#c9b79c', '#a8bfa6', '#d6a9b8', '#b9b0d6', '#d9b98c'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ownTone(word) {
    var h = 0;
    for (var i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
    return OWN_TONES[h % OWN_TONES.length];
  }

  function toneOf(item) {
    var p = item.k && PRESET_BY_KEY[item.k];
    return p ? p.tone : ownTone(item.w);
  }

  // 自分で つくった カードは、ことばの さいしょの 1文字を まるの中に かく
  function picOf(item) {
    var p = item.k && PRESET_BY_KEY[item.k];
    var inner;
    if (p) {
      inner = PICS[p.k];
    } else {
      var tone = ownTone(item.w);
      var ch = Array.from(item.w)[0] || '';
      inner = '<circle cx="50" cy="50" r="42" fill="' + tone + '" fill-opacity="0.55"' + S + '/>' +
              '<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="52" font-weight="700" fill="' + INK + '">' +
              esc(ch) + '</text>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  // はなまる（まんなかの うずまき ＋ まわりの はなびら）
  var HANAMARU = (function () {
    var cx = 50, cy = 50, n = 9, R = 33;
    var pt = function (r, a) {
      return (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    };
    var petalR = (R * Math.sin(Math.PI / n) * 1.25).toFixed(1);
    var d = 'M' + pt(R, -Math.PI / 2);
    for (var i = 1; i <= n; i++) {
      d += 'A' + petalR + ' ' + petalR + ' 0 1 1 ' + pt(R, -Math.PI / 2 + i * 2 * Math.PI / n);
    }
    var sp = '';
    var steps = 90, turns = 2.6;
    for (var j = 0; j <= steps; j++) {
      var t = j / steps;
      sp += (j ? 'L' : 'M') + pt(2 + 24 * t, -Math.PI / 2 + t * turns * 2 * Math.PI);
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<path d="' + d + 'Z" fill="#fde7e4" stroke="#e0524a" stroke-width="4.5" stroke-linejoin="round"/>' +
      '<path d="' + sp + '" fill="none" stroke="#e0524a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  })();

  // ---------- ほぞん（この iPad の中だけ。外には おくらない） ----------
  var STORE_KEY = 'yotei-items';
  var canSave = true;
  var items = [];

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function makeItem(k, w) {
    return { id: newId(), k: k || '', w: w, t: '', d: false };
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canSave = false; }
    if (raw) {
      try {
        var list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list.filter(function (x) {
            return x && typeof x.w === 'string' && x.w;
          }).map(function (x) {
            return {
              id: String(x.id || newId()),
              k: PRESET_BY_KEY[x.k] ? x.k : '',
              w: x.w,
              t: /^\d{2}:\d{2}$/.test(x.t || '') ? x.t : '',
              d: !!x.d
            };
          });
        }
      } catch (e) {}
    }
    // はじめて ひらいたときの れい
    return ['asa', 'benkyo', 'yasumi', 'hiru', 'kaeri'].map(function (k) {
      return makeItem(k, PRESET_BY_KEY[k].word);
    });
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(items));
      canSave = true;
    } catch (e) {
      canSave = false;
    }
    saveWarn.hidden = canSave;
  }

  // "09:05" → "9:05"
  function showTime(t) {
    return t ? t.replace(/^0(\d)/, '$1') : '';
  }

  // ---------- 読み上げ（ほかの教材と同じ） ----------
  var notice = document.getElementById('notice');
  var speedBtn = document.getElementById('speedBtn');
  var saveWarn = document.getElementById('saveWarn');

  var synth = window.speechSynthesis;
  var jaVoice = null;
  var slow = false;

  try { slow = localStorage.getItem('yotei-slow') === '1'; } catch (e) {}
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
    try { localStorage.setItem('yotei-slow', slow ? '1' : '0'); } catch (e) {}
  });

  // ---------- 子どもが見る ボード ----------
  var board = document.getElementById('board');
  var empty = document.getElementById('empty');
  var allDone = document.getElementById('allDone');

  function nowIndex() {
    for (var i = 0; i < items.length; i++) if (!items[i].d) return i;
    return -1;
  }

  function renderBoard() {
    var now = nowIndex();
    var frag = document.createDocumentFragment();
    items.forEach(function (item, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card' + (item.d ? ' is-done' : '') + (i === now ? ' is-now' : '');
      btn.dataset.id = item.id;
      btn.style.setProperty('--tone', toneOf(item));
      btn.setAttribute('aria-pressed', String(item.d));
      btn.setAttribute('aria-label',
        (i === now ? 'いま、' : '') + (item.t ? showTime(item.t) + '、' : '') + item.w + (item.d ? '、おわり' : ''));
      btn.innerHTML =
        '<span class="card-pic">' + picOf(item) + '</span>' +
        '<span class="card-text">' +
          '<span class="now-badge">いま</span>' +
          (item.t ? '<span class="card-time">' + esc(showTime(item.t)) + '</span>' : '') +
          '<span class="card-label">' + esc(item.w) + '</span>' +
        '</span>' +
        '<span class="card-mark">' + (item.d ? HANAMARU : '') + '</span>';
      li.appendChild(btn);
      frag.appendChild(li);
    });
    board.replaceChildren(frag);
    empty.hidden = items.length > 0;
    allDone.hidden = !(items.length > 0 && now === -1);
  }

  // あわてて2回タップしても、すぐには もとに もどらない
  var lastTap = { id: '', at: 0 };

  board.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    var id = card.dataset.id;
    var t = Date.now();
    if (lastTap.id === id && t - lastTap.at < 500) return;
    lastTap = { id: id, at: t };

    var item = items.filter(function (x) { return x.id === id; })[0];
    if (!item) return;
    item.d = !item.d;
    save();
    renderBoard();
    speak(item.w);

    var again = board.querySelector('.card[data-id="' + id + '"]');
    if (again) again.focus({ preventScroll: true });
    // つぎの「いま」が 画面の外なら 見えるところまで うごかす
    var next = board.querySelector('.card.is-now');
    if (next && item.d) {
      var r = next.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  });

  // ---------- せってい（ながおしで ひらく） ----------
  var gearBtn = document.getElementById('gearBtn');
  var gearHint = document.getElementById('gearHint');
  var settings = document.getElementById('settings');
  var HOLD_MS = 1000;
  var holdTimer = 0;
  var hintTimer = 0;
  var opened = false;

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
      // みじかく おしたときは、そっと ヒントだけ出す
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
  // キーボードでは、Enter かスペースを ながおし
  gearBtn.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  gearBtn.addEventListener('keyup', function (e) {
    if (e.key === 'Enter' || e.key === ' ') endHold();
  });

  var editList = document.getElementById('editList');
  var editEmpty = document.getElementById('editEmpty');
  var presetGrid = document.getElementById('presetGrid');
  var addStatus = document.getElementById('addStatus');
  var resetStatus = document.getElementById('resetStatus');
  var ownForm = document.getElementById('ownForm');
  var ownWord = document.getElementById('ownWord');
  var closeBtn = document.getElementById('closeBtn');
  var statusTimers = {};

  function flash(el, text) {
    el.textContent = text;
    clearTimeout(statusTimers[el.id]);
    statusTimers[el.id] = setTimeout(function () { el.textContent = ''; }, 2500);
  }

  function openSettings() {
    if (synth) synth.cancel();
    renderEdit();
    saveWarn.hidden = canSave;
    settings.hidden = false;
    settings.scrollTop = 0;
    document.body.classList.add('is-settings');
    closeBtn.focus({ preventScroll: true });
  }

  function closeSettings() {
    if (settings.hidden) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    settings.hidden = true;
    document.body.classList.remove('is-settings');
    renderBoard();
    window.scrollTo(0, 0);
    gearBtn.focus({ preventScroll: true });
  }

  closeBtn.addEventListener('click', closeSettings);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSettings();
  });

  // せっていを ひらいている間は、新しい版への 自動の 再読み込みを しない
  window.kyozaiBusy = function () { return !settings.hidden; };

  function renderEdit() {
    var frag = document.createDocumentFragment();
    items.forEach(function (item, i) {
      var li = document.createElement('li');
      li.className = 'edit-row';
      li.dataset.id = item.id;
      li.style.setProperty('--tone', toneOf(item));
      li.innerHTML =
        '<span class="edit-num">' + (i + 1) + '</span>' +
        '<span class="edit-pic">' + picOf(item) + '</span>' +
        '<span class="edit-word">' + esc(item.w) +
          (item.d ? '<span class="done-mark">はなまる</span>' : '') + '</span>' +
        '<span class="edit-time">' +
          '<input class="time-input" type="time" data-act="time" value="' + esc(item.t) + '"' +
          ' aria-label="' + esc(item.w) + ' の じこく">' +
          (item.t ? '<button type="button" class="sbtn sbtn-clear" data-act="notime" aria-label="' +
                    esc(item.w) + ' の じこくを けす">×</button>' : '') +
        '</span>' +
        '<span class="edit-tools">' +
          '<button type="button" class="sbtn" data-act="up" aria-label="' + esc(item.w) + ' を うえへ"' +
            (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button type="button" class="sbtn" data-act="down" aria-label="' + esc(item.w) + ' を したへ"' +
            (i === items.length - 1 ? ' disabled' : '') + '>▼</button>' +
          '<button type="button" class="sbtn sbtn-del" data-act="del" aria-label="' + esc(item.w) + ' を けす">けす</button>' +
        '</span>';
      frag.appendChild(li);
    });
    editList.replaceChildren(frag);
    editEmpty.hidden = items.length > 0;
  }

  function indexOfId(id) {
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return i;
    return -1;
  }

  // うごかしたあとも、おなじ ボタンに フォーカスを のこす
  function refocus(id, act) {
    var row = editList.querySelector('.edit-row[data-id="' + id + '"]');
    if (!row) return;
    var b = row.querySelector('[data-act="' + act + '"]:not(:disabled)') ||
            row.querySelector('[data-act="up"]:not(:disabled), [data-act="down"]:not(:disabled)');
    if (b) b.focus({ preventScroll: true });
    row.scrollIntoView({ block: 'nearest' });
  }

  editList.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var row = b.closest('.edit-row');
    var i = indexOfId(row.dataset.id);
    if (i < 0) return;
    var id = items[i].id;
    var act = b.dataset.act;

    if (act === 'up' && i > 0) {
      items.splice(i - 1, 0, items.splice(i, 1)[0]);
    } else if (act === 'down' && i < items.length - 1) {
      items.splice(i + 1, 0, items.splice(i, 1)[0]);
    } else if (act === 'del') {
      items.splice(i, 1);
    } else if (act === 'notime') {
      items[i].t = '';
    } else {
      return;
    }
    save();
    renderEdit();
    renderBoard();
    if (act === 'up' || act === 'down') refocus(id, act);
    if (act === 'notime') {
      var r = editList.querySelector('.edit-row[data-id="' + id + '"] .time-input');
      if (r) r.focus({ preventScroll: true });
    }
  });

  editList.addEventListener('change', function (e) {
    var input = e.target.closest('input[data-act="time"]');
    if (!input) return;
    var i = indexOfId(input.closest('.edit-row').dataset.id);
    if (i < 0) return;
    var v = input.value || '';
    items[i].t = /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : '';
    save();
    // × ボタンを 出したり 消したりするため、その行だけ 作りなおす
    var id = items[i].id;
    renderEdit();
    renderBoard();
    var again = editList.querySelector('.edit-row[data-id="' + id + '"] .time-input');
    if (again && document.activeElement === document.body) again.focus({ preventScroll: true });
  });

  // 用意してある カード
  (function buildPresets() {
    var frag = document.createDocumentFragment();
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset';
      b.dataset.k = p.k;
      b.style.setProperty('--tone', p.tone);
      b.setAttribute('aria-label', p.word + ' を たす');
      b.innerHTML = '<span class="preset-pic">' + picOf({ k: p.k, w: p.word }) + '</span>' +
                    '<span class="preset-label">' + esc(p.word) + '</span>';
      frag.appendChild(b);
    });
    presetGrid.appendChild(frag);
  })();

  function addItem(item) {
    items.push(item);
    save();
    renderEdit();
    renderBoard();
  }

  presetGrid.addEventListener('click', function (e) {
    var b = e.target.closest('.preset');
    if (!b) return;
    var p = PRESET_BY_KEY[b.dataset.k];
    addItem(makeItem(p.k, p.word));
    flash(addStatus, '「' + p.word + '」を ' + items.length + 'ばんめに たしました');
  });

  ownForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var w = ownWord.value.replace(/\s+/g, ' ').trim();
    if (!w) { ownWord.focus(); return; }
    w = Array.from(w).slice(0, 12).join('');
    addItem(makeItem('', w));
    ownWord.value = '';
    ownWord.blur();
    flash(addStatus, '「' + w + '」を ' + items.length + 'ばんめに たしました');
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    items.forEach(function (x) { x.d = false; });
    save();
    renderEdit();
    renderBoard();
    flash(resetStatus, 'はなまるを けしました');
  });

  // ---------- はじめ ----------
  items = load();
  save();
  renderBoard();
})();
