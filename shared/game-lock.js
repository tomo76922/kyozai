// ゲームの かぎ（共通の部品）
// ゲームを ひらく まえに、数字4けたの パスワードを きく。授業中に 子どもが かってに ゲームを ひらかないように するため。
//
// ・パスワードは この iPad の中（ブラウザの保存領域）にだけ 保存します。プログラムの中には 書きません。
//   （保存していない ときだけ、はじめの パスワード 0000 を つかいます）
// ・保存するのは パスワードそのものではなく、そこから 計算した 値です（見ても わからないように）。
// ・いちど ひらいたら、メニューに もどるまでは きかない（sessionStorage に しるしを のこす）。
// ・オフラインでも うごきます。
//
// つかいかた（くわしくは README の「ゲームの かぎ」）:
//   ゲームの ページ：<body> の すぐ あとに
//     <script src="../shared/game-lock.js" data-guard="catch"></script>
//   メニュー：<a data-lock="catch" href="./catch/"> の ように しるしを つけ、
//     GameLock.bindMenu(); をよぶ
(function (global) {
  'use strict';

  var STORE_KEY = 'kyozai-lock-v1';     // 変えた パスワード（の 計算した 値）
  var OPEN_KEY = 'kyozai-unlocked';     // いま ひらいている ゲーム（メニューに もどると けす）
  var FIRST_PIN = '0000';               // 変えて いない ときの はじめの パスワード
  var LEN = 4;

  // ---------- ほぞん ----------
  var memOpen = null;   // sessionStorage が つかえない とき用

  // パスワードから 計算した 値（もとの 数字には もどせない）
  function digest(pin, salt) {
    var str = 'kyozai:' + salt + ':' + pin;
    var h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
    for (var r = 0; r < 64; r++) {
      for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      str = (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + str;
    }
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  function readStore() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d && typeof d.h === 'string' && typeof d.s === 'string') return d;
    } catch (e) {}
    return null;
  }

  function check(pin) {
    var d = readStore();
    if (!d) return pin === FIRST_PIN;
    return digest(pin, d.s) === d.h;
  }

  function setPin(pin) {
    if (!/^\d{4}$/.test(pin)) return false;
    var salt = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ h: digest(pin, salt), s: salt }));
      return true;
    } catch (e) { return false; }
  }

  function isChanged() { return !!readStore(); }

  function unlock(id) {
    memOpen = id;
    try { sessionStorage.setItem(OPEN_KEY, id); } catch (e) {}
  }
  function isUnlocked(id) {
    var v = memOpen;
    try { v = sessionStorage.getItem(OPEN_KEY) || memOpen; } catch (e) {}
    return v === id;
  }
  function clearUnlock() {
    memOpen = null;
    try { sessionStorage.removeItem(OPEN_KEY); } catch (e) {}
  }

  // ---------- 見た目（いちどだけ 入れる） ----------
  var CSS = [
    '.gl-wrap{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:12px;',
    'background:rgba(243,239,230,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);overflow-y:auto}',
    '.gl-wrap.gl-solid{background:var(--bg,#f3efe6);-webkit-backdrop-filter:none;backdrop-filter:none}',
    '.gl-card{display:flex;flex-direction:column;align-items:center;gap:clamp(8px,1.6vh,14px);margin:auto;',
    'padding:clamp(16px,3vh,28px) clamp(18px,4vw,40px);background:var(--card,#fffdf7);border:3px solid var(--card-border,#e2dccf);',
    'border-radius:32px;box-shadow:0 6px 0 #d9d2c3;color:var(--text,#3d3a35);animation:gl-rise .25s ease;outline:none}',
    '.gl-title{margin:0;font-size:clamp(24px,3.6vw,34px);font-weight:700;text-align:center;letter-spacing:.04em}',
    '.gl-sub{margin:0;font-size:clamp(16px,2vw,19px);color:var(--muted,#7a746a);text-align:center}',
    '.gl-dots{display:flex;gap:clamp(14px,2.4vw,22px);margin:4px 0}',
    '.gl-dot{width:clamp(26px,4vmin,34px);height:clamp(26px,4vmin,34px);border-radius:50%;border:3px solid var(--text,#3d3a35);',
    'background:var(--card,#fffdf7);transition:background-color .1s ease}',
    '.gl-dot.is-on{background:var(--text,#3d3a35)}',
    '.gl-dots.is-shake{animation:gl-shake .45s ease}',
    '.gl-msg{min-height:1.5em;margin:0;font-size:clamp(19px,2.4vw,23px);font-weight:700;text-align:center}',
    '.gl-msg.is-ng{color:#b4583f}.gl-msg.is-ok{color:#4e8a63}',
    '.gl-pad{display:grid;grid-template-columns:repeat(3,var(--gl-key));gap:clamp(8px,1.6vmin,14px);',
    '--gl-key:clamp(72px,min(17vmin,12.5vh),108px)}',
    '.gl-key{width:var(--gl-key);height:var(--gl-key);border-radius:50%;font:inherit;font-size:calc(var(--gl-key)*.42);font-weight:700;',
    'color:var(--text,#3d3a35);background:var(--btn,#e6efe9);border:3px solid var(--btn-border,#a9c2b3);box-shadow:0 4px 0 #c9d6cd;',
    'cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;padding:0}',
    '.gl-key:active,.gl-key.is-down{background:var(--btn-on,#b9d3c4);transform:translateY(3px);box-shadow:0 1px 0 #c9d6cd}',
    '.gl-key-sub{font-size:calc(var(--gl-key)*.22);background:var(--card,#fffdf7);border-color:var(--card-border,#e2dccf);box-shadow:0 4px 0 #d9d2c3}',
    '.gl-key:focus-visible,.gl-cancel:focus-visible{outline:4px solid var(--active-border,#c9a96b);outline-offset:3px}',
    '.gl-cancel{display:inline-flex;align-items:center;justify-content:center;min-height:60px;padding:6px 26px;margin-top:4px;',
    'font:inherit;font-size:clamp(19px,2.4vw,23px);font-weight:700;color:var(--text,#3d3a35);text-decoration:none;',
    'background:var(--card,#fffdf7);border:3px solid var(--card-border,#e2dccf);border-radius:999px;cursor:pointer}',
    '.gl-cancel:active{background:var(--active,#f6e7c8)}',
    '@keyframes gl-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '@keyframes gl-shake{0%,100%{transform:none}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}',
    '@media (prefers-reduced-motion:reduce){.gl-card,.gl-dots.is-shake{animation:none}}'
  ].join('');

  function addStyle() {
    if (document.getElementById('gl-style')) return;
    var st = document.createElement('style');
    st.id = 'gl-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------- 数字の ボタンの 画面 ----------
  // opt: { title, sub, cancelText, cancelHref, solid, onEnter(pin, ui) , onCancel }
  //   onEnter で ui.ng('ちがうよ') / ui.ok('…') / ui.close() / ui.setTitle(…) が つかえる
  function pad(opt) {
    addStyle();
    var prevFocus = document.activeElement;
    var wrap = document.createElement('div');
    wrap.className = 'gl-wrap' + (opt.solid ? ' gl-solid' : '');
    var keys = '';
    for (var i = 1; i <= 9; i++) keys += '<button type="button" class="gl-key" data-k="' + i + '">' + i + '</button>';
    keys += '<button type="button" class="gl-key gl-key-sub" data-k="del" aria-label="1もじ けす">けす</button>' +
      '<button type="button" class="gl-key" data-k="0">0</button>' +
      '<button type="button" class="gl-key gl-key-sub" data-k="clr" aria-label="ぜんぶ けす">ぜんぶ<br>けす</button>';
    var dots = '';
    for (var d = 0; d < LEN; d++) dots += '<span class="gl-dot"></span>';
    var cancel = opt.cancelHref
      ? '<a class="gl-cancel" href="' + opt.cancelHref + '">' + (opt.cancelText || 'もどる') + '</a>'
      : '<button type="button" class="gl-cancel">' + (opt.cancelText || 'やめる') + '</button>';
    wrap.innerHTML =
      '<div class="gl-card" role="dialog" aria-modal="true" aria-labelledby="gl-title">' +
        '<p class="gl-title" id="gl-title"></p>' +
        '<p class="gl-sub"></p>' +
        '<div class="gl-dots" role="status" aria-live="polite">' + dots + '</div>' +
        '<p class="gl-msg" aria-live="assertive"></p>' +
        '<div class="gl-pad" role="group" aria-label="すうじ">' + keys + '</div>' +
        cancel +
      '</div>';
    document.body.appendChild(wrap);

    var titleEl = wrap.querySelector('.gl-title');
    var subEl = wrap.querySelector('.gl-sub');
    var dotsEl = wrap.querySelector('.gl-dots');
    var dotEls = Array.prototype.slice.call(wrap.querySelectorAll('.gl-dot'));
    var msgEl = wrap.querySelector('.gl-msg');
    var pin = '';
    var busy = false;
    var msgTimer = 0;

    var ui = {
      setTitle: function (t, s) { titleEl.textContent = t; subEl.textContent = s || ''; subEl.hidden = !s; },
      ng: function (text) {
        msg(text || 'ちがうよ。もういちど いれてね', 'is-ng');
        dotsEl.classList.remove('is-shake');
        void dotsEl.offsetWidth;
        dotsEl.classList.add('is-shake');
        busy = true;
        setTimeout(function () { pin = ''; busy = false; render(); }, 450);
      },
      ok: function (text) { msg(text, 'is-ok'); pin = ''; render(); },
      clearMsg: function () { msg('', ''); },
      close: close
    };
    ui.setTitle(opt.title || 'パスワードを いれてね', opt.sub);

    function msg(text, cls) {
      clearTimeout(msgTimer);
      msgEl.textContent = text;
      msgEl.className = 'gl-msg ' + cls;
    }
    function render() {
      dotEls.forEach(function (el, i) { el.classList.toggle('is-on', i < pin.length); });
      dotsEl.setAttribute('aria-label', pin.length + 'もじ いれました');
    }
    function press(k) {
      if (busy) return;
      if (k === 'del') { pin = pin.slice(0, -1); render(); return; }
      if (k === 'clr') { pin = ''; render(); return; }
      if (!/^\d$/.test(k) || pin.length >= LEN) return;
      if (pin.length === 0 && msgEl.classList.contains('is-ng')) msg('', '');
      pin += k;
      render();
      if (pin.length === LEN) {
        busy = true;
        var p = pin;
        // ●が 4つ そろったのを 見せてから
        setTimeout(function () { busy = false; opt.onEnter(p, ui); }, 140);
      }
    }
    function close() {
      document.removeEventListener('keydown', onKey, true);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus({ preventScroll: true }); } catch (e) {} }
    }
    function onKey(e) {
      if (/^\d$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); press('del'); }
      else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        var c = wrap.querySelector('.gl-cancel');
        if (c) c.click();
      } else if (e.key === ' ' || e.key === 'Enter') {
        // ゲームの ほうに キーが とどかないように（ボタンの 上なら ボタンを おす）
        e.stopPropagation();
      }
    }

    // pointerdown で すぐ 反応（はやく おしても とりこぼさない）。キーボードの ときは click
    wrap.querySelector('.gl-pad').addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.gl-key');
      if (!b) return;
      e.preventDefault();
      b.classList.add('is-down');
      setTimeout(function () { b.classList.remove('is-down'); }, 120);
      press(b.dataset.k);
    });
    wrap.querySelector('.gl-pad').addEventListener('click', function (e) {
      var b = e.target.closest('.gl-key');
      if (b && e.detail === 0) press(b.dataset.k);   // キーボードで おした とき
    });
    var c = wrap.querySelector('.gl-cancel');
    if (!opt.cancelHref) c.addEventListener('click', function () { close(); if (opt.onCancel) opt.onCancel(); });
    wrap.addEventListener('pointerdown', function (e) { if (e.target === wrap) e.preventDefault(); });
    document.addEventListener('keydown', onKey, true);
    render();
    var card = wrap.querySelector('.gl-card');
    card.setAttribute('tabindex', '-1');
    try { card.focus({ preventScroll: true }); } catch (e) {}
    return ui;
  }

  // ---------- ゲームを ひらく ときに きく ----------
  function ask(opt) {
    opt = opt || {};
    return pad({
      title: opt.title || 'パスワードを いれてね',
      sub: opt.sub,
      solid: opt.solid,
      cancelText: opt.cancelText,
      cancelHref: opt.cancelHref,
      onCancel: opt.onCancel,
      onEnter: function (pin, ui) {
        if (check(pin)) { ui.close(); if (opt.onOk) opt.onOk(); }
        else ui.ng('ちがうよ。もういちど いれてね');
      }
    });
  }

  // ---------- パスワードを かえる（先生用） ----------
  function change(opt) {
    opt = opt || {};
    var step = 0;
    var first = '';
    var ui = pad({
      title: 'いまの パスワード',
      sub: 'まず、いまの パスワードを いれてください',
      cancelText: 'やめる',
      onCancel: opt.onDone,
      onEnter: function (pin, u) {
        if (step === 0) {
          if (!check(pin)) { u.ng('ちがうよ。もういちど いれてね'); return; }
          step = 1;
          u.ok('');
          u.setTitle('あたらしい パスワード', '数字 4けたを いれてください');
        } else if (step === 1) {
          first = pin;
          step = 2;
          u.ok('');
          u.setTitle('もういちど', 'たしかめるため、あたらしい パスワードを もういちど いれてください');
        } else {
          if (pin !== first) {
            step = 1;
            first = '';
            u.setTitle('あたらしい パスワード', '数字 4けたを いれてください');
            u.ng('1かいめと ちがうよ。はじめから いれてね');
            return;
          }
          if (!setPin(pin)) {
            u.ng('この iPad では ほぞん できませんでした');
            return;
          }
          step = 3;
          u.setTitle('かえました', 'つぎから あたらしい パスワードで ひらきます');
          u.ok('パスワードを かえました');
          setTimeout(function () { u.close(); if (opt.onDone) opt.onDone(true); }, 1400);
        }
      }
    });
    return ui;
  }

  // ---------- メニュー：data-lock の ついた リンクを おすと きく ----------
  function bindMenu() {
    clearUnlock();
    // 「もどる」で メニューに もどった とき（ページが そのまま もどる とき）も けす
    global.addEventListener('pageshow', clearUnlock);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-lock]');
      if (!a) return;
      e.preventDefault();
      var id = a.getAttribute('data-lock');
      var href = a.href;
      var name = a.getAttribute('data-lock-name') || '';
      ask({
        title: 'パスワードを いれてね',
        sub: name ? '「' + name + '」を ひらきます' : '',
        onOk: function () { unlock(id); global.location.href = href; }
      });
    });
  }

  // ---------- ゲームの ページ：ひらいて いなければ きく ----------
  var guardUi = null;
  function guardPage(id) {
    function test() {
      if (isUnlocked(id) || guardUi) return;
      guardUi = ask({
        title: 'パスワードを いれてね',
        sub: 'この ゲームを あそぶには パスワードが いります',
        solid: true,
        cancelText: 'もくじに もどる',
        cancelHref: '../',
        onOk: function () { guardUi = null; unlock(id); }
      });
    }
    test();
    // 「もどる」「すすむ」で ページが そのまま もどった ときも たしかめる
    global.addEventListener('pageshow', function (e) { if (e.persisted) test(); });
  }

  global.GameLock = {
    ask: ask,
    change: change,
    check: check,
    isChanged: isChanged,
    unlock: unlock,
    isUnlocked: isUnlocked,
    clearUnlock: clearUnlock,
    bindMenu: bindMenu,
    guardPage: guardPage
  };

  // <script src="…/game-lock.js" data-guard="catch"> と 書いた ときは、すぐ たしかめる
  var me = document.currentScript;
  var g = me && me.getAttribute('data-guard');
  if (g) {
    if (document.body) guardPage(g);
    else document.addEventListener('DOMContentLoaded', function () { guardPage(g); });
  }
})(window);
