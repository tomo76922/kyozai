(function () {
  'use strict';

  var INK = '#3d3a35';
  var LEVEL_MAX = 7;
  var GOAL = 5;            // 1つの レベルで 5もん せいかい すると つぎが ひらく
  var STORE_KEY = 'okane-progress';

  // ---------- 読み方（読み上げは かならず この ひらがなで） ----------
  var ONES = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  var TENS = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう',
              'ろくじゅう', 'ななじゅう', 'はちじゅう', 'きゅうじゅう'];
  var HUNDS = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく',
               'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'];
  var THOUS = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん',
               'ろくせん', 'ななせん', 'はっせん', 'きゅうせん'];

  function upper(n) { // 一の位より 上の 読み
    return THOUS[Math.floor(n / 1000) % 10] + HUNDS[Math.floor(n / 100) % 10] +
           TENS[Math.floor(n / 10) % 10];
  }
  // かず の 読み（かぞえるとき）：25 → にじゅうご、4 → よん
  function numRead(n) {
    if (n === 0) return 'ぜろ';
    return upper(n) + ONES[n % 10];
  }
  // きんがく の 読み：4 → よえん、600 → ろっぴゃくえん、1000 → せんえん
  function yenRead(n) {
    if (n === 0) return 'ぜろえん';
    if (n % 10 === 4) return upper(n) + 'よえん';
    return numRead(n) + 'えん';
  }
  function yenLabel(n) { return n + 'えん'; }

  // ---------- おかねの 絵（本物の もようは 入れない。色・大きさ・数字で 見分ける） ----------
  // k：500円玉を 1 とした ときの はば（本物の じゅんばんに あわせ、少し 差を 大きく）
  var MONEY = {
    1:    { k: 0.70, fill: '#f4f5f7', rim: '#a3a9b2', ink: '#4a4f57', name: 'いちえんだま' },
    5:    { k: 0.80, fill: '#efcc5c', rim: '#ad8722', ink: '#57420e', name: 'ごえんだま' },
    10:   { k: 0.88, fill: '#d99a6c', rim: '#8f5534', ink: '#3a2416', name: 'じゅうえんだま' },
    50:   { k: 0.76, fill: '#d5d9df', rim: '#878d97', ink: '#34373c', name: 'ごじゅうえんだま' },
    100:  { k: 0.85, fill: '#bcc2cb', rim: '#737a85', ink: '#2c2f34', name: 'ひゃくえんだま' },
    500:  { k: 1.00, fill: '#dcc47c', rim: '#977e3c', ink: '#3d3320', name: 'ごひゃくえんだま' },
    1000: { k: 2.30, bill: true, name: 'せんえんさつ' }
  };
  var ALL_DENOMS = [1000, 500, 100, 50, 10, 5, 1];

  function moneySvg(v) {
    var m = MONEY[v];
    if (m.bill) {
      return '<svg viewBox="0 0 230 110" aria-hidden="true">' +
        '<rect x="2" y="2" width="226" height="106" rx="9" fill="#d9e7f1" stroke="#5f84a3" stroke-width="3.5"/>' +
        '<rect x="11" y="11" width="208" height="88" rx="5" fill="none" stroke="#9db6ca" stroke-width="2"/>' +
        '<text x="82" y="57" text-anchor="middle" dominant-baseline="central" font-size="48" font-weight="700" fill="#24384a">1000</text>' +
        '<rect x="150" y="28" width="66" height="54" rx="9" fill="#fffdf7" stroke="#cf4f45" stroke-width="3.5"/>' +
        '<text x="183" y="56" text-anchor="middle" dominant-baseline="central" font-size="19" font-weight="700" fill="#c4433a">みほん</text>' +
        '</svg>';
    }
    var s = String(v);
    var fs = s.length === 1 ? 56 : s.length === 2 ? 46 : 35;
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="46" fill="' + m.fill + '" stroke="' + m.rim + '" stroke-width="4"/>' +
      '<circle cx="50" cy="50" r="38" fill="none" stroke="' + m.rim + '" stroke-width="1.6" opacity="0.55"/>' +
      '<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="' + fs +
        '" font-weight="700" fill="' + m.ink + '"' + (s.length === 3 ? ' letter-spacing="-1"' : '') + '>' + s + '</text>' +
      '</svg>';
  }

  function moneyBtn(v, cls, extra) {
    return '<button type="button" class="money ' + (cls || '') + (MONEY[v].bill ? ' is-bill' : '') +
      '" style="--k:' + MONEY[v].k + '" data-v="' + v + '"' + (extra || '') +
      ' aria-label="' + MONEY[v].name + '">' + moneySvg(v) + '</button>';
  }

  // ---------- しなものの 絵 ----------
  var S = ' stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  var ITEMS = [
    { name: 'あめ', min: 5, max: 50, step: 1,
      svg: '<path d="M33 50 13 35v30z" fill="#ef9aa8"' + S + '/><path d="M67 50 87 35v30z" fill="#ef9aa8"' + S + '/>' +
           '<circle cx="50" cy="50" r="19" fill="#f6b8c3"' + S + '/><path d="M40 40q10 10 0 20M52 33q10 17 0 34" fill="none" stroke="#fffdf7" stroke-width="4" stroke-linecap="round"/>' },
    { name: 'えんぴつ', min: 30, max: 120, step: 5,
      svg: '<g transform="rotate(-35 50 50)"><rect x="16" y="41" width="54" height="18" fill="#f3c24f"' + S + '/>' +
           '<path d="M70 41 90 50 70 59z" fill="#f2dcb4"' + S + '/><path d="M83 46.8 90 50 83 53.2z" fill="' + INK + '"/>' +
           '<rect x="8" y="41" width="10" height="18" rx="3" fill="#ef9aa8"' + S + '/></g>' },
    { name: 'りんご', min: 100, max: 200, step: 10,
      svg: '<path d="M50 32c-8-6-32-8-35 14-3 22 13 42 25 42 4 0 7-2 10-2s6 2 10 2c12 0 28-20 25-42-3-22-27-20-35-14z" fill="#e0675a"' + S + '/>' +
           '<path d="M50 32c0-8 2-14 6-18" fill="none"' + S + '/><path d="M57 22c6-8 16-9 21-6-4 8-13 10-21 6z" fill="#8fb36a"' + S + '/>' },
    { name: 'バナナ', min: 100, max: 250, step: 1,
      svg: '<path d="M18 26c4 34 30 56 66 46 5-2 4-8-1-7-28 3-45-15-52-41-2-6-14-5-13 2z" fill="#f3d35b"' + S + '/>' +
           '<path d="M17 25l-3-7" fill="none"' + S + '/>' },
    { name: 'おにぎり', min: 100, max: 180, step: 10,
      svg: '<path d="M50 14c-9 0-38 52-38 63 0 8 6 10 14 10h48c8 0 14-2 14-10 0-11-29-63-38-63z" fill="#fffdf7"' + S + '/>' +
           '<path d="M36 62h28v25H36z" fill="#3d4a3f"/>' },
    { name: 'ジュース', min: 100, max: 160, step: 10,
      svg: '<path d="M56 34 64 9h10" fill="none"' + S + '/><path d="M26 32h48l-6 56H32z" fill="#f6b04c"' + S + '/>' +
           '<path d="M29 48h42" fill="none" stroke="#fffdf7" stroke-width="4"/>' },
    { name: 'パン', min: 120, max: 300, step: 10,
      svg: '<path d="M14 52c0-16 15-26 36-26s36 10 36 26c0 6-4 9-9 9v20c0 4-2 6-6 6H29c-4 0-6-2-6-6V61c-5 0-9-3-9-9z" fill="#e6b26e"' + S + '/>' +
           '<path d="M38 40l-4 8M52 38l-3 9M66 40l-3 8" fill="none" stroke="#b9803e" stroke-width="3.5" stroke-linecap="round"/>' },
    { name: 'ノート', min: 150, max: 300, step: 10,
      svg: '<rect x="24" y="12" width="54" height="76" rx="5" fill="#9fc0d8"' + S + '/><path d="M33 12v76" fill="none"' + S + '/>' +
           '<rect x="40" y="28" width="30" height="16" rx="3" fill="#fffdf7" stroke="' + INK + '" stroke-width="2.5"/>' },
    { name: 'えほん', min: 500, max: 1000, step: 10,
      svg: '<path d="M50 26c-10-8-26-10-38-8v60c12-2 28 0 38 8 10-8 26-10 38-8V18c-12-2-28 0-38 8z" fill="#e8a59a"' + S + '/>' +
           '<path d="M50 26v60" fill="none"' + S + '/><circle cx="31" cy="44" r="7" fill="#f3d35b"/><path d="M60 40h18M60 50h18" stroke="#fffdf7" stroke-width="4" stroke-linecap="round"/>' }
  ];

  function itemSvg(it) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' + it.svg + '</svg>';
  }

  // ---------- レベル ----------
  var LEVELS = [
    null,
    { type: 'count', denoms: [1], max: 10, choice: true,
      desc: '1えんだま だけ（10えんまで）' },
    { type: 'count', denoms: [10, 1], max: 100, choice: true,
      desc: '10えんだま と 1えんだま（100えんまで）' },
    { type: 'count', denoms: [50, 10, 5, 1], max: 100, choice: true,
      desc: '5えんだま・50えんだま も（100えんまで）' },
    { type: 'count', denoms: [500, 100, 50, 10, 5, 1], max: 1000,
      desc: '100えんだま・500えんだま も（1000えんまで）' },
    { type: 'count', denoms: [1000, 500, 100, 50, 10, 5, 1], max: 2000,
      desc: '1000えんさつ も（2000えんまで）' },
    { type: 'shop', desc: 'かいもの（ねだん ぴったりに だす）' },
    { type: 'change', desc: 'おつり' }
  ];

  // ---------- きろく（この iPad の 中に ほぞん） ----------
  var progress = { unlocked: 1, stars: [0, 0, 0, 0, 0, 0, 0, 0], level: 1 };
  var canSave = true;

  function loadProgress() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canSave = false; }
    if (!raw) return;
    try {
      var p = JSON.parse(raw);
      var u = Math.floor(Number(p.unlocked));
      if (u >= 1 && u <= LEVEL_MAX) progress.unlocked = u;
      var l = Math.floor(Number(p.level));
      if (l >= 1 && l <= LEVEL_MAX) progress.level = l;
      if (Array.isArray(p.stars)) {
        for (var i = 1; i <= LEVEL_MAX; i++) {
          var s = Math.floor(Number(p.stars[i]));
          progress.stars[i] = s >= 0 && s <= GOAL ? s : 0;
        }
      }
    } catch (e) {}
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
      canSave = true;
    } catch (e) { canSave = false; }
  }

  loadProgress();

  // ---------- 読み上げ（ほかの 教材と 同じ） ----------
  var notice = document.getElementById('notice');
  var speedBtn = document.getElementById('speedBtn');
  var synth = window.speechSynthesis;
  var jaVoice = null;
  var slow = false;

  try { slow = localStorage.getItem('okane-slow') === '1'; } catch (e) {}
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
    try { localStorage.setItem('okane-slow', slow ? '1' : '0'); } catch (e) {}
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

  // せいかいの 音は 共通の部品（shared/mondai.js）で 鳴らす
  // レベルアップ：ド・ミ・ソ・ド を やさしく
  function levelUpSound() {
    playNotes([[0, 523, 0.13], [0.18, 659, 0.13], [0.36, 784, 0.13], [0.6, 1047, 0.12]]);
  }

  // ---------- べんりな もの ----------
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function randOf(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = list[i]; list[i] = list[j]; list[j] = x;
    }
    return list;
  }
  // 大きい おかねから じゅんに わける
  function breakDown(total, denoms) {
    var out = [];
    denoms.forEach(function (d) {
      while (total >= d) { out.push(d); total -= d; }
    });
    return out;
  }
  function count(list, v) {
    return list.filter(function (x) { return x === v; }).length;
  }
  function sum(list) {
    return list.reduce(function (a, b) { return a + b; }, 0);
  }
  function starSvg(on) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" ' +
      (on ? 'fill="#f2bd3f" stroke="#c38f22"' : 'fill="none" stroke="#cfc6b4"') +
      ' stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }
  var LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  // ---------- もんだい を つくる ----------
  function makeCount(lv) {
    var L = LEVELS[lv];
    var total, money;
    for (;;) {
      if (lv === 1) total = randInt(1, 10);
      else if (lv === 2) total = randInt(10, 100);
      else if (lv === 3) total = randInt(6, 100);
      else if (lv === 4) total = Math.random() < 0.6 ? randInt(10, 100) * 10 : randInt(100, 1000);
      else total = Math.random() < 0.7 ? randInt(100, 200) * 10 : randInt(1000, 2000);
      money = breakDown(total, L.denoms);
      if (lv === 3 && count(money, 5) + count(money, 50) === 0) continue;
      if (lv === 4 && count(money, 100) + count(money, 500) === 0) continue;
      break;
    }
    var q = { type: 'count', total: total, money: money, answer: total, key: 'c' + total };
    if (L.choice) q.choices = shuffle([total].concat(wrongChoices(lv, total, money)));
    return q;
  }

  // まちがえやすい こたえ（2つ）
  function wrongChoices(lv, t, money) {
    var max = LEVELS[lv].max;
    var first = [];
    var near = [];
    if (lv === 1) {
      near = [t - 1, t + 1, t - 2, t + 2, t - 3, t + 3];
    } else if (lv === 2) {
      var tens = Math.floor(t / 10) % 10, ones = t % 10;
      if (t < 100) first.push(ones * 10 + tens);        // 10の くらい と 1の くらいを とりちがえ
      near = [t + 10, t - 10, t + 1, t - 1, t + 2, t - 2];
    } else {
      var n5 = count(money, 5), n50 = count(money, 50);
      if (n5) first.push(t - 4 * n5);                    // 5えんだま を 1えん と かぞえた
      if (n50) first.push(t - 40 * n50);                 // 50えんだま を 10えん と かぞえた
      near = [t + 5, t - 5, t + 10, t - 10, t + 1, t - 1];
    }
    var seen = {};
    seen[t] = true;
    var out = [];
    shuffle(first).concat(shuffle(near)).forEach(function (v) {
      if (out.length < 2 && v >= 1 && v <= max && !seen[v]) { seen[v] = true; out.push(v); }
    });
    var guard = 0;
    while (out.length < 2 && guard++ < 200) {
      var r = randInt(1, max);
      if (!seen[r]) { seen[r] = true; out.push(r); }
    }
    return out;
  }

  function makePrice(it, step, below) {
    var s = Math.max(it.step, step || 1);
    var lo = Math.ceil(it.min / s), hi = Math.floor(Math.min(it.max, below ? below - 1 : it.max) / s);
    if (hi < lo) return 0;
    return randInt(lo, hi) * s;
  }

  function makeShop() {
    var it = randOf(ITEMS);
    var price = makePrice(it, 1, 0);
    return { type: 'shop', item: it, price: price, answer: price, key: 's' + it.name + price };
  }

  function makeChange() {
    var paid, it, price = 0;
    var r = Math.random();
    paid = r < 0.25 ? 100 : r < 0.6 ? 500 : 1000;
    var guard = 0;
    while (!price && guard++ < 100) {
      it = randOf(ITEMS);
      // 100えん で はらう ときは 5えん きざみ、それ いがいは 10えん きざみ
      price = makePrice(it, paid === 100 ? 5 : 10, paid);
      // 500えん・1000えん で はらうのは、それより 小さい おかねでは たりない ときだけ
      if (price && paid === 500 && price < 100) price = 0;
      if (price && paid === 1000 && price < 200) price = 0;
    }
    return { type: 'change', item: it, price: price, paid: paid, answer: paid - price,
             key: 'o' + it.name + price + '/' + paid };
  }

  function makeQuestion(lv) {
    var t = LEVELS[lv].type;
    if (t === 'count') return makeCount(lv);
    if (t === 'shop') return makeShop();
    return makeChange();
  }

  // ---------- がめん ----------
  var levelsBox = document.getElementById('levels');
  var starsBox = document.getElementById('stars');
  var toolbarEnd = document.getElementById('toolbarEnd');
  var play = document.getElementById('play');
  var ask = document.getElementById('ask');
  var countChip = document.getElementById('countChip');
  var countText = document.getElementById('countText');
  var countReset = document.getElementById('countReset');
  var scene = document.getElementById('scene');
  var side = document.getElementById('side');
  var result = document.getElementById('result');

  var q = null;
  var solved = false;
  var counted = [];   // かぞえた おかね
  var countSum = 0;
  var padValue = '';  // すうじ ボタンで 入れた こたえ
  var tray = [];      // かいもの：だした おかね
  var sayTimer = 0;
  var luTimer = 0;
  var quiz = null;     // せいかいの あとの 自動で つぎへ・10もんで 一区切り（shared/mondai.js）

  function renderLevels() {
    var html = '<span class="levels-label" aria-hidden="true">レベル</span>';
    for (var i = 1; i <= LEVEL_MAX; i++) {
      var open = i <= progress.unlocked;
      var on = i === progress.level;
      html += '<button type="button" class="lv-btn' + (on ? ' is-on' : '') + (open ? '' : ' is-locked') +
        '" data-lv="' + i + '" aria-pressed="' + on + '"' + (open || on ? '' : ' disabled') +
        ' aria-label="レベル' + i + (open ? '' : '（まだ ひらいていない）') + '">' +
        (open || on ? i : LOCK_SVG) + '</button>';
    }
    levelsBox.innerHTML = html;
  }

  function renderStars(pop) {
    var n = progress.stars[progress.level];
    var html = '';
    for (var i = 0; i < GOAL; i++) {
      html += '<span class="star' + (i < n ? ' is-on' : '') + (pop && i === n - 1 ? ' is-pop' : '') + '">' +
        starSvg(i < n) + '</span>';
    }
    starsBox.innerHTML = html;
    starsBox.setAttribute('aria-label', 'ほし ' + n + 'こ（' + GOAL + 'こで レベルアップ）');
  }

  function setResult(text, cls) {
    result.className = 'stage-text' + (cls ? ' ' + cls : '');
    result.textContent = text;
  }

  // あたらしい もんだい（まえと 同じ もんだいには しない）
  function makeNext() {
    var prev = q ? q.key : '';
    var guard = 0;
    var nq;
    do { nq = makeQuestion(progress.level); } while (nq.key === prev && guard++ < 20);
    return nq;
  }

  function showQuestion(nq) {
    q = nq;
    solved = false;
    counted = [];
    countSum = 0;
    padValue = '';
    tray = [];
    clearTimeout(sayTimer);
    stopSpeech();
    clearTimeout(luTimer);
    setResult('');
    play.className = 'play is-' + q.type + (q.choices ? ' is-choice' : ' is-pad');
    if (q.type === 'shop') play.className = 'play is-shop';

    if (q.type === 'count') renderCount();
    else if (q.type === 'shop') renderShop();
    else renderChange();
  }

  // --- いくら？（レベル1〜5） ---
  function renderCount() {
    ask.textContent = 'いくら？';
    var html = '<div class="money-area" id="moneyArea">';
    var idx = 0;
    ALL_DENOMS.forEach(function (d) {
      var n = count(q.money, d);
      if (!n) return;
      html += '<div class="money-group">';
      for (var i = 0; i < n; i++) html += moneyBtn(d, 'is-count', ' data-i="' + (idx++) + '"');
      html += '</div>';
    });
    html += '</div>';
    scene.innerHTML = html;
    renderCountChip();

    if (q.choices) {
      side.innerHTML = '<div class="answers">' + q.choices.map(function (c) {
        return '<button type="button" class="answer" data-v="' + c + '" aria-label="' + yenRead(c) + '">' +
          yenLabel(c) + '</button>';
      }).join('') + '</div>';
    } else {
      side.innerHTML = padHtml();
      renderPad();
    }
  }

  function renderCountChip() {
    countChip.hidden = countSum === 0;
    countText.textContent = 'かぞえた ' + yenLabel(countSum);
  }

  scene.addEventListener('click', function (e) {
    var b = e.target.closest('.money');
    if (!b) return;
    unlockAudio();
    if (b.classList.contains('is-count')) {
      var i = Number(b.dataset.i);
      if (!counted[i]) {
        counted[i] = true;
        countSum += Number(b.dataset.v);
        b.classList.add('is-counted');
        renderCountChip();
      }
      speak(numRead(countSum));
    } else if (b.classList.contains('is-tray') && !solved) {
      tray.splice(Number(b.dataset.i), 1);
      renderTray();
      speak(tray.length ? yenRead(sum(tray)) : 'ぜろえん');
    } else if (b.classList.contains('is-paid')) {
      speak(yenRead(q.paid));
    }
  });

  countReset.addEventListener('click', function () {
    counted = [];
    countSum = 0;
    Array.prototype.forEach.call(scene.querySelectorAll('.is-counted'), function (b) {
      b.classList.remove('is-counted');
    });
    renderCountChip();
    stopSpeech();
  });

  // --- すうじ ボタン（レベル4・5・7） ---
  function padHtml() {
    var keys = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (n) {
      keys += '<button type="button" class="key" data-k="' + n + '">' + n + '</button>';
    });
    keys += '<button type="button" class="key key-del" data-k="del" aria-label="1もじ けす">けす</button>' +
            '<button type="button" class="key key-zero" data-k="0">0</button>';
    return '<div class="pad">' +
      '<div class="pad-disp" aria-live="polite"><span class="pad-num" id="padNum"></span><span class="pad-unit">えん</span></div>' +
      '<div class="pad-keys">' + keys + '</div>' +
      '<button type="button" class="pad-ok" data-k="ok">こたえる</button>' +
      '</div>';
  }

  function renderPad() {
    var num = document.getElementById('padNum');
    if (!num) return;
    num.textContent = padValue;
    num.classList.toggle('is-empty', !padValue);
  }

  function padKey(k) {
    if (solved) return;
    if (k === 'del') {
      padValue = padValue.slice(0, -1);
    } else if (k === 'ok') {
      if (!padValue) { speak('すうじを おしてね'); return; }
      check(Number(padValue), side.querySelector('.pad-disp'));
      return;
    } else {
      if (padValue.length >= 4) return;
      if (padValue === '' && k === '0') return;
      padValue += k;
    }
    if (result.classList.contains('is-retry')) setResult('');
    renderPad();
  }

  // --- かいもの（レベル6） ---
  function itemCard() {
    return '<div class="item-card">' +
      '<div class="item-pic">' + itemSvg(q.item) + '</div>' +
      '<p class="item-name">' + q.item.name + '</p>' +
      '<p class="price-tag" aria-label="ねだん ' + yenRead(q.price) + '"><span class="price-small">ねだん</span>' +
        yenLabel(q.price) + '</p>' +
      '</div>';
  }

  function renderShop() {
    ask.textContent = 'ねだん ぴったりに おかねを だそう';
    countChip.hidden = true;
    scene.innerHTML = '<div class="shop">' + itemCard() +
      '<div class="tray-box">' +
        '<p class="tray-label">だした おかね</p>' +
        '<div class="tray" id="tray"></div>' +
        '<p class="tray-sum" id="traySum"></p>' +
      '</div></div>';
    var wallet = '';
    ALL_DENOMS.slice().reverse().forEach(function (d) { wallet += moneyBtn(d, 'is-wallet'); });
    side.innerHTML = '<div class="shop-side">' +
      '<p class="wallet-label">おかねを タップして だす</p>' +
      '<div class="wallet">' + wallet + '</div>' +
      '<button type="button" class="pad-ok" id="okBtn">これでいい</button></div>';
    renderTray();
  }

  function renderTray() {
    var box = document.getElementById('tray');
    if (!box) return;
    var sorted = tray.slice().sort(function (a, b) { return b - a; });
    tray = sorted;
    box.innerHTML = sorted.length
      ? sorted.map(function (v, i) { return moneyBtn(v, 'is-tray', ' data-i="' + i + '"'); }).join('')
      : '<span class="tray-empty">ここに でるよ</span>';
    document.getElementById('traySum').textContent = 'いま ' + yenLabel(sum(tray));
  }

  side.addEventListener('click', function (e) {
    unlockAudio();
    var key = e.target.closest('[data-k]');
    if (key) { padKey(key.dataset.k); return; }

    var ans = e.target.closest('.answer');
    if (ans) { check(Number(ans.dataset.v), ans); return; }

    var w = e.target.closest('.money.is-wallet');
    if (w && !solved) {
      if (tray.length >= 20) { speak('おおすぎるよ'); return; }
      tray.push(Number(w.dataset.v));
      renderTray();
      if (result.classList.contains('is-retry')) setResult('');
      speak(yenRead(sum(tray)));
      return;
    }

    if (e.target.closest('#okBtn') && !solved) {
      if (!tray.length) { speak('おかねを だしてね'); return; }
      var s = sum(tray);
      check(s, document.getElementById('tray'),
        s > q.price ? 'もういちど（おおいよ）' : 'もういちど（たりないよ）');
    }
  });

  // --- おつり（レベル7） ---
  function renderChange() {
    ask.textContent = 'おつりは いくら？';
    countChip.hidden = true;
    scene.innerHTML = '<div class="shop">' + itemCard() +
      '<div class="paid-box">' +
        '<p class="tray-label">だした おかね</p>' +
        '<div class="paid">' + moneyBtn(q.paid, 'is-paid') + '</div>' +
        '<p class="tray-sum" aria-label="' + yenRead(q.paid) + '">' + yenLabel(q.paid) + '</p>' +
      '</div></div>';
    side.innerHTML = padHtml();
    renderPad();
  }

  // ---------- こたえあわせ ----------
  function check(value, el, retryText) {
    if (solved) return;
    if (value === q.answer) {
      solved = true;
      if (el) el.classList.add('is-ok');
      setResult('せいかい', 'is-ok');
      quiz.correct(el);
      var up = addStar();
      // レベルアップの ときは、自動で すすまずに レベルアップの 画面を 出す
      if (up) quiz.hold(true);
      clearTimeout(sayTimer);
      // 音と重ならないように、少しあとで読み上げる
      sayTimer = setTimeout(function () {
        speak('せいかい');
        if (up) {
          clearTimeout(luTimer);
          luTimer = setTimeout(function () { showLevelUp(up); }, 700);
        }
      }, 500);
    } else {
      if (el) {
        el.classList.remove('is-ng');
        // 同じ ボタンを もう一度 おしても 動きが わかるように、いったん外してから つける
        void el.offsetWidth;
        el.classList.add('is-ng');
      }
      setResult(retryText || 'もういちど', 'is-retry');
      quiz.wrong();
    }
  }

  // ほしを 1つ ふやす。5つ たまったら レベルアップ（つぎの レベルの ばんごう）を かえす
  function addStar() {
    var lv = progress.level;
    if (progress.stars[lv] >= GOAL) return 0;
    progress.stars[lv] += 1;
    var up = 0;
    if (progress.stars[lv] >= GOAL) {
      up = lv < LEVEL_MAX ? lv + 1 : -1;  // -1：ぜんぶ クリア
      if (lv < LEVEL_MAX && progress.unlocked < lv + 1) progress.unlocked = lv + 1;
    }
    saveProgress();
    renderStars(true);
    renderLevels();
    return up;
  }

  levelsBox.addEventListener('click', function (e) {
    var b = e.target.closest('.lv-btn');
    if (!b || b.disabled) return;
    unlockAudio();
    setLevel(Number(b.dataset.lv));
  });

  // レベルを えらびなおしたら、あたらしい 10もんに する
  function setLevel(n) {
    progress.level = n;
    saveProgress();
    renderLevels();
    renderStars(false);
    q = null;
    quiz.start();
  }

  // すうじは キーボードからも 入れられる
  document.addEventListener('keydown', function (e) {
    if (!settings.hidden || !levelup.hidden) return;
    if (quiz.waiting() || quiz.finished()) return;
    if (!side.querySelector('.pad')) return;
    if (/^[0-9]$/.test(e.key)) padKey(e.key);
    else if (e.key === 'Backspace') { e.preventDefault(); padKey('del'); }
    else if (e.key === 'Enter' && document.activeElement === document.body) padKey('ok');
  });

  // ---------- レベルアップ ----------
  var levelup = document.getElementById('levelup');
  var luStars = document.getElementById('luStars');
  var luTitle = document.getElementById('luTitle');
  var luText = document.getElementById('luText');
  var luGo = document.getElementById('luGo');
  var luStay = document.getElementById('luStay');
  var luNext = 0;

  function showLevelUp(next) {
    luNext = next;
    quiz.hold();
    var html = '';
    for (var i = 0; i < GOAL; i++) html += '<span class="star is-on">' + starSvg(true) + '</span>';
    luStars.innerHTML = html;
    if (next > 0) {
      luTitle.textContent = 'レベルアップ！';
      luText.textContent = 'レベル' + next + 'が ひらいたよ';
      luGo.textContent = 'レベル' + next + 'へ すすむ';
      luStay.hidden = false;
      speak('レベルアップ！ レベル' + numRead(next) + 'が ひらいたよ');
    } else {
      luTitle.textContent = 'ぜんぶ クリア！';
      luText.textContent = 'ぜんぶの レベルが できたね';
      luGo.textContent = 'とじる';
      luStay.hidden = true;
      speak('ぜんぶ クリア！ よく できました');
    }
    levelup.hidden = false;
    levelUpSound();
    luGo.focus({ preventScroll: true });
  }

  function closeLevelUp() {
    levelup.hidden = true;
  }

  // レベルアップ しても、10もんの とちゅうなら そのまま つづける
  luGo.addEventListener('click', function () {
    unlockAudio();
    closeLevelUp();
    if (luNext > 0) {
      progress.level = luNext;
      saveProgress();
      renderLevels();
      renderStars(false);
    }
    quiz.next();
  });
  luStay.addEventListener('click', function () {
    unlockAudio();
    closeLevelUp();
    quiz.next();
  });

  // ---------- せってい（ながおしで ひらく） ----------
  var gearBtn = document.getElementById('gearBtn');
  var gearHint = document.getElementById('gearHint');
  var settings = document.getElementById('settings');
  var closeBtn = document.getElementById('closeBtn');
  var setLevels = document.getElementById('setLevels');
  var recNote = document.getElementById('recNote');
  var resetBtn = document.getElementById('resetBtn');
  var resetStatus = document.getElementById('resetStatus');
  var saveWarn = document.getElementById('saveWarn');
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

  function renderSettings() {
    var html = '';
    for (var i = 1; i <= LEVEL_MAX; i++) {
      var open = i <= progress.unlocked;
      var stars = '';
      for (var s = 0; s < GOAL; s++) stars += starSvg(s < progress.stars[i]);
      html += '<button type="button" class="set-lv' + (i === progress.level ? ' is-on' : '') +
        '" data-lv="' + i + '" aria-pressed="' + (i === progress.level) + '">' +
        '<span class="set-lv-num">レベル' + i + '</span>' +
        '<span class="set-lv-desc">' + LEVELS[i].desc + '</span>' +
        '<span class="set-lv-stars" role="img" aria-label="ほし ' + progress.stars[i] + 'こ">' + stars + '</span>' +
        '<span class="set-lv-state">' + (open ? 'ひらいている' : 'まだ') + '</span>' +
        '</button>';
    }
    setLevels.innerHTML = html;
    recNote.textContent = 'いま ひらいている レベル：' +
      (progress.unlocked === 1 ? 'レベル1' : 'レベル1〜' + progress.unlocked) +
      '。リセットすると、ひらいた レベルと ほしが ぜんぶ きえて、レベル1から になります。';
    saveWarn.hidden = canSave;
  }

  var armTimer = 0;
  function disarmReset() {
    clearTimeout(armTimer);
    resetBtn.classList.remove('is-armed');
    resetBtn.textContent = 'きろくを リセット';
  }

  var resumeAfter = false;   // せっていを とじたら つぎの もんだいへ

  // せいかいの あと、つぎの もんだいまで まつ じかん（共通の せってい）
  var waitSection = Mondai.settingsSection('set-sec');
  document.getElementById('waitSetting').appendChild(waitSection);

  function openSettings() {
    stopSpeech();
    resumeAfter = false;
    if (quiz.waiting()) {
      quiz.hold();
      resumeAfter = true;
    }
    waitSection.mondaiRender();
    disarmReset();
    resetStatus.textContent = '';
    renderSettings();
    settings.hidden = false;
    settings.scrollTop = 0;
    document.body.classList.add('is-settings');
    closeBtn.focus({ preventScroll: true });
  }

  function closeSettings() {
    if (settings.hidden) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    disarmReset();
    settings.hidden = true;
    document.body.classList.remove('is-settings');
    window.scrollTo(0, 0);
    gearBtn.focus({ preventScroll: true });
    if (resumeAfter) { resumeAfter = false; quiz.next(); }
  }

  closeBtn.addEventListener('click', closeSettings);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSettings();
  });

  setLevels.addEventListener('click', function (e) {
    var b = e.target.closest('.set-lv');
    if (!b) return;
    unlockAudio();
    resumeAfter = false;
    setLevel(Number(b.dataset.lv));
    closeSettings();
  });

  // まちがえて けさないように、2回 おしたときだけ けす
  resetBtn.addEventListener('click', function () {
    if (!resetBtn.classList.contains('is-armed')) {
      resetBtn.classList.add('is-armed');
      resetBtn.textContent = 'もういちど おすと けします';
      clearTimeout(armTimer);
      armTimer = setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    progress = { unlocked: 1, stars: [0, 0, 0, 0, 0, 0, 0, 0], level: 1 };
    saveProgress();
    renderLevels();
    renderStars(false);
    renderSettings();
    q = null;
    resumeAfter = false;
    quiz.start();
    resetStatus.textContent = 'きろくを けしました';
  });

  // とちゅうで 新しい版への 自動の 再読み込みを しない
  window.kyozaiBusy = function () {
    return !settings.hidden || !levelup.hidden || quiz.busy() ||
      (!solved && (tray.length > 0 || padValue !== '' || countSum > 0));
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') stopSpeech();
  });

  // ---------- はじめ ----------
  quiz = Mondai.create({
    area: play,
    countIn: toolbarEnd,
    total: 10,
    make: makeNext,
    show: showQuestion,
    speak: function (t) { speak(t); }
  });
  renderLevels();
  renderStars(false);
  quiz.start();
})();
