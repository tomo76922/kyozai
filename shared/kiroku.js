// きろく（共通の部品）：なまえ（イニシャルと いろの マーク）と、きろくを QRコードで おくる
//
// ・なまえは アルファベット 2もじ（れい：T.K）と、いろの マーク 8しゅるいから 1つ。
//   この iPad の中（ブラウザの保存領域）に 保存し、つぎも つかう。
// ・ゲームが おわったら、きろくを QRコードに して 大きく 見せる（ネットは つかわない）。
//   あつめる 係の iPad（メニューの「せってい」→「ランキングを あつめる」）で 読みとる。
// ・QRコードを 作る プログラムは shared/qr/qrcode.js（さきに 読みこんで おく）。
//
// つかいかた（くわしくは README の「ランキング」）:
//   <script src="../shared/qr/qrcode.js"></script>
//   <script src="../shared/kiroku.js"></script>
//   Kiroku.mountChip(el)                … 「T.K ● なまえを かえる」の ボタンを el に 入れる
//   Kiroku.ensureName(fn)               … なまえが なければ きいてから fn()
//   var r = Kiroku.makeRecord({ g: 'piyo', d: 'normal', st: 3, s: 12 })
//   Kiroku.showSend(r)                  … QRコードを 大きく 見せる
(function (global) {
  'use strict';

  var NAME_KEY = 'kyozai-name-v1';
  var PREFIX = 'KYZ1';
  var INK = '#3d3a35';

  // いろの マーク（いろと かたちの 両方で 見わけられるように）
  var COLORS = [
    { name: 'あか',     shape: 'まる',     fill: '#e0524a' },
    { name: 'オレンジ', shape: 'さんかく', fill: '#f08a2e' },
    { name: 'きいろ',   shape: 'ほし',     fill: '#f3c93a' },
    { name: 'みどり',   shape: 'しかく',   fill: '#4f9d5d' },
    { name: 'みずいろ', shape: 'ひしがた', fill: '#58b8de' },
    { name: 'あお',     shape: 'ハート',   fill: '#3f6fc6' },
    { name: 'むらさき', shape: 'じゅうじ', fill: '#9563c4' },
    { name: 'ピンク',   shape: 'しずく',   fill: '#f08cb8' }
  ];

  function starPath() {
    var d = '';
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 19 : 44;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      d += (i ? 'L' : 'M') + (50 + Math.cos(a) * r).toFixed(1) + ' ' + (53 + Math.sin(a) * r).toFixed(1);
    }
    return d + 'Z';
  }
  var SHAPES = [
    '<circle cx="50" cy="50" r="40"/>',
    '<path d="M50 9L91 85H9Z"/>',
    '<path d="' + starPath() + '"/>',
    '<rect x="13" y="13" width="74" height="74" rx="8"/>',
    '<path d="M50 5L93 50L50 95L7 50Z"/>',
    '<path d="M50 89C21 68 8 52 8 34C8 20 19 10 32 10C41 10 47 15 50 22C53 15 59 10 68 10C81 10 92 20 92 34C92 52 79 68 50 89Z"/>',
    '<path d="M35 8H65V35H92V65H65V92H35V65H8V35H35Z"/>',
    '<path d="M50 5C50 5 85 45 85 63A35 35 0 0 1 15 63C15 45 50 5 50 5Z"/>'
  ];

  function markSvg(c) {
    c = Number(c);
    if (!(c >= 0 && c < COLORS.length)) c = 0;
    return '<svg class="kr-mark" viewBox="0 0 100 100" aria-hidden="true">' +
      '<g fill="' + COLORS[c].fill + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round">' + SHAPES[c] + '</g></svg>';
  }
  function colorLabel(c) { var x = COLORS[c]; return x ? x.name + 'の ' + x.shape : ''; }

  // ゲームと むずかしさ（ランキングの 画面でも つかう）
  //   order：'high' は 大きいほど 上、'low' は 小さいほど 上（めくった かいすう → じかん）
  var GAMES = {
    piyo: {
      name: 'ぴよぴよ ラン', order: 'high', stages: 5,
      diffs: [['easy', 'やさしい'], ['normal', 'ふつう'], ['hard', 'むずかしい']]
    },
    catch: {
      name: 'たべもの キャッチ', order: 'high',
      // 「あそびかた」と「せいげん じかん」ごと（「じかん なし」は ランキングに いれない）
      diffs: [
        ['yubi-60', 'ゆび・60びょう'], ['yubi-90', 'ゆび・90びょう'], ['yubi-120', 'ゆび・120びょう'],
        ['koe-60', 'こえ・60びょう'], ['koe-90', 'こえ・90びょう'], ['koe-120', 'こえ・120びょう'],
        ['me-60', 'め（iPad）・60びょう'], ['me-90', 'め（iPad）・90びょう'], ['me-120', 'め（iPad）・120びょう'],
        ['cam-60', 'め（カメラ）・60びょう'], ['cam-90', 'め（カメラ）・90びょう'], ['cam-120', 'め（カメラ）・120びょう'],
        // せいげん じかんが できる まえの きろく（あつめた ものが あるときだけ タブに でる）
        ['yubi-normal', 'ゆび・ふつう（まえの きろく）'], ['yubi-slow', 'ゆび・ゆっくり（まえの きろく）'],
        ['koe-normal', 'こえ・すこし ゆっくり（まえの きろく）'], ['koe-slow', 'こえ・ゆっくり（まえの きろく）'], ['koe-vslow', 'こえ・とても ゆっくり（まえの きろく）'],
        ['me-normal', 'め（iPad）・すこし ゆっくり（まえの きろく）'], ['me-slow', 'め（iPad）・ゆっくり（まえの きろく）'], ['me-vslow', 'め（iPad）・とても ゆっくり（まえの きろく）'],
        ['cam-normal', 'め（カメラ）・すこし ゆっくり（まえの きろく）'], ['cam-slow', 'め（カメラ）・ゆっくり（まえの きろく）'], ['cam-vslow', 'め（カメラ）・とても ゆっくり（まえの きろく）']
      ]
    },
    shinkei: {
      name: 'しんけいすいじゃく', order: 'low',
      diffs: [['easy', 'やさしい'], ['normal', 'ふつう'], ['hard', 'むずかしい']]
    }
  };
  var GAME_ORDER = ['piyo', 'catch', 'shinkei'];

  function diffLabel(g, d) {
    var G = GAMES[g];
    if (!G) return '';
    for (var i = 0; i < G.diffs.length; i++) if (G.diffs[i][0] === d) return G.diffs[i][1];
    return '';
  }

  function timeWords(ms) {
    var s = Math.max(0, Math.round((ms || 0) / 1000));
    var m = Math.floor(s / 60);
    s %= 60;
    return m ? m + 'ふん ' + s + 'びょう' : s + 'びょう';
  }
  // てんすうの 書きかた
  function scoreText(r) {
    if (r.g === 'piyo') return 'どんぐり ' + r.s + 'こ';
    if (r.g === 'catch') return r.s + 'てん';
    if (r.g === 'shinkei') return r.s + 'かい・' + timeWords(r.t);
    return String(r.s);
  }
  function initialsText(n) { return n ? n.charAt(0) + '.' + n.charAt(1) : ''; }

  // ---------- なまえの ほぞん ----------
  var memName = null;
  function getName() {
    var d = memName;
    try {
      var raw = localStorage.getItem(NAME_KEY);
      if (raw) d = JSON.parse(raw);
    } catch (e) {}
    if (d && /^[A-Z]{2}$/.test(d.i) && d.c >= 0 && d.c < COLORS.length) return { i: d.i, c: d.c | 0 };
    return null;
  }
  function setName(i, c) {
    memName = { i: i, c: c };
    try { localStorage.setItem(NAME_KEY, JSON.stringify(memName)); } catch (e) {}
    chips.forEach(renderChip);
  }

  // ---------- きろく（QRコードの 中身） ----------
  // KYZ1|ゲーム|むずかしさ|ステージ|てん|じかん(ms)|イニシャル|いろ|日時(ms)|しるし
  function makeRecord(o) {
    var n = getName();
    if (!n || !GAMES[o.g]) return null;
    var id = '';
    for (var k = 0; k < 8; k++) id += 'abcdefghijkmnpqrstuvwxyz23456789'.charAt(Math.floor(Math.random() * 32));
    return {
      id: id, g: o.g, d: o.d, st: o.st | 0, s: Math.max(0, Math.round(o.s || 0)), t: Math.max(0, Math.round(o.t || 0)),
      n: n.i, c: n.c, at: Date.now()
    };
  }
  function encode(r) {
    return [PREFIX, r.g, r.d, r.st || 0, r.s, r.t || 0, r.n, r.c, r.at.toString(36), r.id].join('|');
  }
  // 読みとった もじから もどす（ちがう ものなら null）
  function decode(text) {
    if (typeof text !== 'string') return null;
    var p = text.trim().split('|');
    if (p.length !== 10 || p[0] !== PREFIX) return null;
    var r = {
      g: p[1], d: p[2], st: parseInt(p[3], 10) || 0, s: parseInt(p[4], 10), t: parseInt(p[5], 10) || 0,
      n: p[6], c: parseInt(p[7], 10), at: parseInt(p[8], 36), id: p[9]
    };
    return valid(r) ? r : null;
  }
  function valid(r) {
    var G = r && GAMES[r.g];
    if (!G || !diffLabel(r.g, r.d)) return false;
    if (!/^[A-Z]{2}$/.test(r.n) || !(r.c >= 0 && r.c < COLORS.length)) return false;
    if (!(r.s >= 0 && r.s < 1e7) || !(r.t >= 0 && r.t < 1e9)) return false;
    if (!(r.at > 1.5e12 && r.at < 4e12)) return false;
    if (!/^[a-z0-9]{6,16}$/.test(r.id)) return false;
    if (r.g === 'piyo' ? !(r.st >= 1 && r.st <= G.stages) : r.st !== 0) return false;
    return true;
  }

  // ---------- 見た目（いちどだけ 入れる） ----------
  var CSS = [
    '.kr-wrap{position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;padding:10px;',
    'background:rgba(243,239,230,.88);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);overflow-y:auto;',
    'font-family:"Hiragino Maru Gothic ProN","Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",system-ui,sans-serif}',
    '.kr-card{display:flex;flex-direction:column;align-items:center;gap:clamp(6px,1.4vh,14px);margin:auto;max-width:100%;',
    'padding:clamp(12px,2.4vh,26px) clamp(14px,3vw,36px);background:var(--card,#fffdf7);border:3px solid var(--card-border,#e2dccf);',
    'border-radius:32px;box-shadow:0 6px 0 #d9d2c3;color:var(--text,#3d3a35);animation:kr-rise .25s ease;outline:none}',
    '.kr-title{margin:0;font-size:clamp(22px,3.4vw,32px);font-weight:700;text-align:center;letter-spacing:.04em}',
    '.kr-sub{margin:0;font-size:clamp(16px,2vw,20px);color:var(--muted,#7a746a);text-align:center}',
    '.kr-mark{display:block;width:1em;height:1em;flex:none}',
    '.kr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:64px;padding:6px 28px;font:inherit;',
    'font-size:clamp(20px,2.6vw,26px);font-weight:700;color:var(--text,#3d3a35);background:var(--card,#fffdf7);',
    'border:3px solid var(--card-border,#e2dccf);border-radius:999px;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}',
    '.kr-btn:active{background:var(--active,#f6e7c8)}',
    '.kr-btn-go{background:var(--btn,#e6efe9);border-color:var(--btn-border,#a9c2b3);box-shadow:0 4px 0 #c9d6cd}',
    '.kr-btn-go:active{background:var(--btn-on,#b9d3c4)}',
    '.kr-btn:disabled{opacity:.4;cursor:default}',
    '.kr-btn:focus-visible,.kr-key:focus-visible,.kr-col:focus-visible,.kr-slot:focus-visible,.kr-chip:focus-visible{outline:4px solid var(--active-border,#c9a96b);outline-offset:3px}',
    '.kr-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}',
    // なまえを えらぶ
    '.kr-name{display:flex;align-items:center;gap:clamp(10px,1.6vw,18px);font-size:clamp(48px,9vmin,76px);font-weight:700;line-height:1}',
    '.kr-slot{width:1.3em;height:1.3em;display:flex;align-items:center;justify-content:center;padding:0;font:inherit;color:inherit;',
    'background:var(--card,#fffdf7);border:4px solid var(--card-border,#e2dccf);border-radius:16px;cursor:pointer}',
    '.kr-slot.is-on{border-color:var(--active-border,#c9a96b);background:var(--active,#f6e7c8)}',
    '.kr-dot{font-size:.8em}',
    '.kr-name .kr-mark{width:1em;height:1em;margin-left:.15em}',
    '.kr-name .kr-nomark{width:1em;height:1em;border:4px dashed var(--card-border,#e2dccf);border-radius:50%;margin-left:.15em}',
    '.kr-keys{display:grid;grid-template-columns:repeat(9,var(--kr-k));gap:clamp(5px,.9vmin,9px);--kr-k:clamp(46px,min(9vw,8.6vh),74px)}',
    '.kr-key{width:var(--kr-k);height:var(--kr-k);padding:0;font:inherit;font-size:calc(var(--kr-k)*.5);font-weight:700;color:var(--text,#3d3a35);',
    'background:var(--btn,#e6efe9);border:3px solid var(--btn-border,#a9c2b3);border-radius:14px;box-shadow:0 3px 0 #c9d6cd;cursor:pointer;touch-action:manipulation}',
    '.kr-key:active,.kr-key.is-down{background:var(--btn-on,#b9d3c4);transform:translateY(2px);box-shadow:0 1px 0 #c9d6cd}',
    '.kr-key-del{grid-column:span 1;font-size:calc(var(--kr-k)*.3);background:var(--card,#fffdf7);border-color:var(--card-border,#e2dccf);box-shadow:0 3px 0 #d9d2c3}',
    '.kr-h{margin:0;font-size:clamp(17px,2.1vw,21px);font-weight:700}',
    '.kr-cols{display:flex;flex-wrap:wrap;gap:clamp(6px,1.2vmin,12px);justify-content:center}',
    '.kr-col{width:clamp(56px,min(9vw,9vh),78px);height:clamp(56px,min(9vw,9vh),78px);padding:8px;font-size:0;background:var(--card,#fffdf7);',
    'border:4px solid var(--card-border,#e2dccf);border-radius:18px;cursor:pointer;touch-action:manipulation}',
    '.kr-col .kr-mark{width:100%;height:100%}',
    '.kr-col[aria-pressed="true"]{border-color:var(--text,#3d3a35);background:var(--active,#f6e7c8);box-shadow:0 0 0 3px var(--active-border,#c9a96b)}',
    // ゲームの はじめの がめんの なまえ ボタン
    '.kr-chip{display:inline-flex;align-items:center;gap:10px;min-height:56px;padding:4px 18px 4px 12px;font:inherit;font-size:clamp(17px,2vw,20px);font-weight:700;',
    'color:var(--text,#3d3a35);background:var(--card,#fffdf7);border:3px solid var(--card-border,#e2dccf);border-radius:999px;cursor:pointer;touch-action:manipulation;white-space:nowrap}',
    '.kr-chip:active{background:var(--active,#f6e7c8)}',
    '.kr-chip-name{display:inline-flex;align-items:center;gap:6px;font-size:1.5em;line-height:1}',
    '.kr-chip-act{color:var(--muted,#7a746a)}',
    // QRコード
    '.kr-qr{width:min(64vmin,440px);height:min(64vmin,440px);padding:0;background:#fff;border:3px solid var(--card-border,#e2dccf);border-radius:16px}',
    '.kr-qr svg{display:block;width:100%;height:100%}',
    '.kr-who{display:flex;align-items:center;gap:10px;margin:0;font-size:clamp(24px,3.6vw,34px);font-weight:700}',
    '.kr-what{margin:0;font-size:clamp(17px,2.2vw,22px);text-align:center}',
    '.kr-send{flex-direction:row;flex-wrap:wrap;justify-content:center;max-width:min(96vw,900px)}',
    '.kr-send-info{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:340px}',
    '@media (orientation:portrait){.kr-send{flex-direction:column}.kr-qr{width:min(76vw,52vh);height:min(76vw,52vh)}}',
    '@keyframes kr-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){.kr-card{animation:none}}'
  ].join('');

  function addStyle() {
    if (document.getElementById('kr-style')) return;
    var st = document.createElement('style');
    st.id = 'kr-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------- 画面の 上に 出す まど（共通） ----------
  var openCount = 0;
  function isOpen() { return openCount > 0; }

  function overlay(html, label, onEsc, onKeyMore) {
    addStyle();
    var prevFocus = document.activeElement;
    var wrap = document.createElement('div');
    wrap.className = 'kr-wrap';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    var card = wrap.firstChild;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', label);
    card.setAttribute('tabindex', '-1');
    openCount++;
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (onEsc) onEsc(); return; }
      if (onKeyMore && onKeyMore(e)) { e.preventDefault(); e.stopPropagation(); return; }
      // ゲームの ほうに キーが とどかないように（ボタンの 上なら ボタンを おす）
      e.stopPropagation();
    }
    document.addEventListener('keydown', onKey, true);
    // うしろの ゲームに タッチが とどかないように
    wrap.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (e.target === wrap) e.preventDefault(); });
    try { card.focus({ preventScroll: true }); } catch (e) {}
    var closed = false;
    return {
      el: wrap,
      close: function () {
        if (closed) return;
        closed = true;
        openCount--;
        document.removeEventListener('keydown', onKey, true);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        if (prevFocus && prevFocus.focus) { try { prevFocus.focus({ preventScroll: true }); } catch (e) {} }
      }
    };
  }

  // ---------- なまえを えらぶ ----------
  // opt: { onDone(name), onCancel() }
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function pickName(opt) {
    opt = opt || {};
    var cur = getName();
    var letters = cur ? [cur.i.charAt(0), cur.i.charAt(1)] : ['', ''];
    var color = cur ? cur.c : -1;
    var slot = cur ? 1 : 0;

    var keys = '';
    for (var i = 0; i < LETTERS.length; i++) {
      keys += '<button type="button" class="kr-key" data-k="' + LETTERS[i] + '">' + LETTERS[i] + '</button>';
    }
    keys += '<button type="button" class="kr-key kr-key-del" data-k="del" aria-label="1もじ けす">けす</button>';
    var cols = '';
    COLORS.forEach(function (c, k) {
      cols += '<button type="button" class="kr-col" data-c="' + k + '" aria-pressed="false" aria-label="' + colorLabel(k) + '">' + markSvg(k) + '</button>';
    });

    var ov = overlay(
      '<div class="kr-card">' +
        '<p class="kr-title">なまえ（イニシャル）を えらんでね</p>' +
        '<div class="kr-name" aria-live="polite">' +
          '<button type="button" class="kr-slot" data-slot="0" aria-label="1もじめ"></button>' +
          '<span class="kr-dot">.</span>' +
          '<button type="button" class="kr-slot" data-slot="1" aria-label="2もじめ"></button>' +
          '<span class="kr-prev-mark"></span>' +
        '</div>' +
        '<div class="kr-keys" role="group" aria-label="アルファベット">' + keys + '</div>' +
        '<p class="kr-h">いろの マークも 1つ えらんでね</p>' +
        '<div class="kr-cols" role="group" aria-label="いろの マーク">' + cols + '</div>' +
        '<div class="kr-row">' +
          '<button type="button" class="kr-btn kr-btn-go" data-act="ok">これで いい</button>' +
          '<button type="button" class="kr-btn" data-act="cancel">やめる</button>' +
        '</div>' +
      '</div>', 'なまえを えらぶ', cancel, function (e) {
        var k = (e.key || '').toUpperCase();
        if (/^[A-Z]$/.test(k) && !e.metaKey && !e.ctrlKey) { press(k); return true; }
        if (e.key === 'Backspace') { press('del'); return true; }
        return false;
      });
    var root = ov.el;
    var slots = root.querySelectorAll('.kr-slot');
    var prevMark = root.querySelector('.kr-prev-mark');
    var okBtn = root.querySelector('[data-act="ok"]');

    function render() {
      for (var s = 0; s < 2; s++) {
        slots[s].textContent = letters[s] || '';
        slots[s].classList.toggle('is-on', s === slot);
      }
      prevMark.innerHTML = color >= 0 ? markSvg(color) : '<span class="kr-nomark" style="display:block"></span>';
      Array.prototype.forEach.call(root.querySelectorAll('.kr-col'), function (b) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.c) === color));
      });
      okBtn.disabled = !(letters[0] && letters[1] && color >= 0);
    }
    function press(k) {
      if (k === 'del') {
        if (letters[slot]) letters[slot] = '';
        else if (slot > 0) { slot--; letters[slot] = ''; }
      } else {
        letters[slot] = k;
        if (slot === 0) slot = 1;
      }
      render();
    }
    function cancel() { ov.close(); if (opt.onCancel) opt.onCancel(); }

    root.querySelector('.kr-keys').addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.kr-key');
      if (!b) return;
      e.preventDefault();
      b.classList.add('is-down');
      setTimeout(function () { b.classList.remove('is-down'); }, 120);
      press(b.dataset.k);
    });
    root.querySelector('.kr-keys').addEventListener('click', function (e) {
      var b = e.target.closest('.kr-key');
      if (b && e.detail === 0) press(b.dataset.k);   // キーボードで おした とき
    });
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.classList.contains('kr-slot')) { slot = Number(t.dataset.slot); render(); }
      else if (t.classList.contains('kr-col')) { color = Number(t.dataset.c); render(); }
      else if (t.dataset.act === 'cancel') cancel();
      else if (t.dataset.act === 'ok' && !okBtn.disabled) {
        setName(letters[0] + letters[1], color);
        ov.close();
        if (opt.onDone) opt.onDone(getName());
      }
    });
    render();
  }

  // なまえが なければ きいてから fn()
  function ensureName(fn) {
    if (getName()) { fn(); return; }
    pickName({ onDone: function () { fn(); } });
  }

  // ---------- はじめの がめんの なまえ ボタン ----------
  var chips = [];
  function renderChip(el) {
    var n = getName();
    var b = el.querySelector('.kr-chip');
    if (n) {
      b.innerHTML = '<span class="kr-chip-name">' + markSvg(n.c) + initialsText(n.i) + '</span><span class="kr-chip-act">なまえを かえる</span>';
      b.setAttribute('aria-label', 'なまえ ' + initialsText(n.i) + '、' + colorLabel(n.c) + '。おすと かえられる');
    } else {
      b.innerHTML = '<span class="kr-chip-name">?</span><span class="kr-chip-act">なまえを いれる</span>';
      b.setAttribute('aria-label', 'なまえを いれる');
    }
  }
  function mountChip(el) {
    if (!el) return;
    addStyle();
    el.innerHTML = '<button type="button" class="kr-chip"></button>';
    el.querySelector('.kr-chip').addEventListener('click', function () { pickName(); });
    chips.push(el);
    renderChip(el);
  }

  // ---------- QRコードを 見せる ----------
  function qrSvg(text) {
    var qr = global.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var q = 4;   // まわりの しろい ふち
    var d = '';
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (qr.isDark(y, x)) d += 'M' + (x + q) + ' ' + (y + q) + 'h1v1h-1z';
      }
    }
    var w = n + q * 2;
    return '<svg viewBox="0 0 ' + w + ' ' + w + '" shape-rendering="crispEdges" role="img" aria-label="きろくの QRコード">' +
      '<rect width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }

  // opt: { onClose }
  function showSend(r, opt) {
    opt = opt || {};
    if (!r) return;
    var svg = '';
    try { svg = qrSvg(encode(r)); } catch (e) { svg = ''; }
    var what = GAMES[r.g].name + '（' + diffLabel(r.g, r.d) + (r.g === 'piyo' ? '・ステージ' + r.st : '') + '）';
    var ov = overlay(
      '<div class="kr-card kr-send">' +
        '<div class="kr-qr">' + (svg || '<p class="kr-sub">QRコードを つくれませんでした</p>') + '</div>' +
        '<div class="kr-send-info">' +
          '<p class="kr-title">きろくを おくる</p>' +
          '<p class="kr-who">' + markSvg(r.c) + initialsText(r.n) + ' さん</p>' +
          '<p class="kr-what">' + what + '<br><b>' + scoreText(r) + '</b></p>' +
          '<p class="kr-sub">せんせいの iPad の カメラで よみとって もらってね</p>' +
          '<button type="button" class="kr-btn kr-btn-go" data-act="close">とじる</button>' +
        '</div>' +
      '</div>', 'きろくを おくる', close);
    ov.el.querySelector('[data-act="close"]').addEventListener('click', close);
    function close() { ov.close(); if (opt.onClose) opt.onClose(); }
    return { close: close };
  }

  global.Kiroku = {
    COLORS: COLORS,
    GAMES: GAMES,
    GAME_ORDER: GAME_ORDER,
    markSvg: markSvg,
    colorLabel: colorLabel,
    diffLabel: diffLabel,
    scoreText: scoreText,
    timeWords: timeWords,
    initialsText: initialsText,
    getName: getName,
    pickName: pickName,
    ensureName: ensureName,
    mountChip: mountChip,
    makeRecord: makeRecord,
    encode: encode,
    decode: decode,
    valid: valid,
    showSend: showSend,
    isOpen: isOpen,
    addStyle: addStyle
  };
})(window);
