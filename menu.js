// メニュー（トップページ）
// ・なかま分けの タブ（ぜんぶ・まなぶ・つたえる・あそぶ・つくる）。さいごに えらんだ タブを おぼえておく
// ・教材の ★ボタンで「よく つかう」に いれる。★の 教材は どの タブでも いちばん上に 出す
// ・先生用の「この iPad に だす きょうざい」で、メニューに 出す 教材を えらぶ
//   （タブ・★・だす きょうざいは この iPad の 中（ブラウザの保存領域）に だけ ほぞん）
// ・ゲームの ボタンを おすと、パスワードを きく（shared/game-lock.js）
// ・先生用：右上の「せってい」を 1びょう ながおし すると、先生用の がめんが ひらく
//   （ゲームの パスワードを かえる・ランキングを あつめる・この iPad に だす きょうざい）
(function () {
  'use strict';

  var STORE_KEY = 'kyozai-menu-v1';
  var GROUPS = [
    { id: 'manabu', name: 'まなぶ' },
    { id: 'tsutaeru', name: 'つたえる' },
    { id: 'asobu', name: 'あそぶ' },
    { id: 'tsukuru', name: 'つくる' }
  ];

  var menu = document.getElementById('menu');
  var tabsEl = document.getElementById('tabs');
  var favBox = document.getElementById('fav');
  var favList = document.getElementById('favList');
  if (!menu || !tabsEl || !favBox || !favList) return;

  // ---------- ほぞん ----------
  var state = { tab: 'all', fav: [], off: [] };
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d && typeof d === 'object') {
        if (typeof d.tab === 'string') state.tab = d.tab;
        if (Array.isArray(d.fav)) state.fav = d.fav.filter(function (x) { return typeof x === 'string'; });
        if (Array.isArray(d.off)) state.off = d.off.filter(function (x) { return typeof x === 'string'; });
      }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function has(list, id) { return list.indexOf(id) !== -1; }
  function toggle(list, id) {
    var i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
  }

  // ---------- 教材の ボタンを あつめて、★を つける ----------
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
    '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></svg>';
  var items = Array.prototype.map.call(menu.querySelectorAll('a.menu-item[data-id]'), function (a) {
    var label = a.querySelector('.menu-label');
    var it = {
      id: a.getAttribute('data-id'),
      group: a.getAttribute('data-group') || '',
      name: label ? label.textContent.replace(/\s+/g, ' ').trim() : a.getAttribute('data-id'),
      a: a,
      cell: document.createElement('div'),
      star: document.createElement('button')
    };
    it.short = a.getAttribute('data-short') || it.name;
    it.cell.className = 'menu-cell';
    it.cell.setAttribute('data-group', it.group);
    a.parentNode.insertBefore(it.cell, a);
    it.cell.appendChild(a);
    it.star.type = 'button';
    it.star.className = 'menu-star';
    it.star.innerHTML = STAR;
    it.star.addEventListener('click', function () {
      toggle(state.fav, it.id);
      save();
      render();
      it.star.focus({ preventScroll: true });
    });
    it.cell.appendChild(it.star);
    return it;
  });
  // なかまの コメントは もう いらない（タブで わける）
  Array.prototype.slice.call(menu.childNodes).forEach(function (n) { if (n.nodeType === 8) n.remove(); });

  var emptyEl = document.createElement('p');
  emptyEl.className = 'menu-empty';

  // ---------- タブ ----------
  var tabs = Array.prototype.slice.call(tabsEl.querySelectorAll('.tab'));
  function tabItems(tab) {
    return items.filter(function (it) {
      return !has(state.off, it.id) && (tab === 'all' || it.group === tab);
    });
  }

  // タブの 名前の 下に 中身を ならべる。2ぎょうに はいらない ときは「ほか ○こ」
  function fitList(el, names) {
    if (!names.length) { el.textContent = ''; return; }
    for (var k = names.length; k >= 1; k--) {
      var rest = names.length - k;
      el.innerHTML = '';
      el.appendChild(document.createTextNode(names.slice(0, k).join('・')));
      if (rest) {
        var b = document.createElement('b');
        b.textContent = ' ほか' + rest + 'こ';
        el.appendChild(b);
      }
      if (el.scrollHeight <= el.clientHeight + 1) return;
    }
  }
  function fitTabs() {
    tabs.forEach(function (t) {
      if (t.hidden) return;
      fitList(t.querySelector('.tab-list'), tabItems(t.getAttribute('data-tab')).map(function (it) { return it.short; }));
    });
  }

  function render() {
    // タブ：中身の かず。からっぽの なかまは かくす
    tabs.forEach(function (t) {
      var id = t.getAttribute('data-tab');
      var n = tabItems(id).length;
      t.hidden = id !== 'all' && n === 0;
      var c = t.querySelector('.tab-count');
      c.textContent = n;
      c.setAttribute('aria-label', n + 'こ');
    });
    var cur = tabs.filter(function (t) { return t.getAttribute('data-tab') === state.tab && !t.hidden; })[0];
    if (!cur) { state.tab = 'all'; cur = tabs[0]; }
    tabs.forEach(function (t) {
      var on = t === cur;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    tabsEl.hidden = false;
    fitTabs();

    // ★の 教材は 上の「よく つかう」へ。それ以外は いまの タブの 教材だけ 出す
    var shown = 0;
    var favN = 0;
    items.forEach(function (it) {
      var off = has(state.off, it.id);
      var fav = has(state.fav, it.id);
      it.star.setAttribute('aria-pressed', fav ? 'true' : 'false');
      it.star.setAttribute('aria-label', fav ? '「' + it.name + '」を よく つかう から はずす' : '「' + it.name + '」を よく つかう に いれる');
      if (fav && !off) {
        favList.appendChild(it.cell);
        it.cell.hidden = false;
        favN++;
      } else {
        menu.appendChild(it.cell);
        it.cell.hidden = off || fav || !(state.tab === 'all' || it.group === state.tab);
        if (!it.cell.hidden) shown++;
      }
    });
    favBox.hidden = favN === 0;
    if (!shown && !favN) {
      emptyEl.textContent = 'だす きょうざいが ありません。せんせいの「せってい」で えらべます。';
      menu.appendChild(emptyEl);
    } else if (emptyEl.parentNode) {
      emptyEl.remove();
    }
  }

  function selectTab(t, focus) {
    state.tab = t.getAttribute('data-tab');
    save();
    render();
    if (focus) t.focus({ preventScroll: true });
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { selectTab(t, false); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var vis = tabs.filter(function (x) { return !x.hidden; });
      var i = vis.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1);
      e.preventDefault();
      selectTab(vis[(i + vis.length) % vis.length], true);
    });
  });

  var fitTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitTabs, 120);
  });

  // ---------- 先生用：この iPad に だす きょうざい ----------
  var show = document.getElementById('show');
  var showList = document.getElementById('showList');
  var showBtn = document.getElementById('showBtn');
  var gearBtn = document.getElementById('gearBtn');
  function buildShow() {
    showList.innerHTML = '';
    GROUPS.forEach(function (g) {
      var list = items.filter(function (it) { return it.group === g.id; });
      if (!list.length) return;
      var h = document.createElement('h3');
      h.className = 'show-group';
      h.setAttribute('data-group', g.id);
      h.textContent = g.name;
      showList.appendChild(h);
      list.forEach(function (it) {
        var on = !has(state.off, it.id);
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'show-row';
        row.setAttribute('data-group', g.id);
        row.setAttribute('aria-pressed', on ? 'true' : 'false');
        row.innerHTML = '<span class="show-name"></span><span class="show-state"></span>';
        row.querySelector('.show-name').textContent = it.name;
        row.querySelector('.show-state').textContent = on ? 'だす' : 'ださない';
        row.addEventListener('click', function () {
          toggle(state.off, it.id);
          save();
          var now = !has(state.off, it.id);
          row.setAttribute('aria-pressed', now ? 'true' : 'false');
          row.querySelector('.show-state').textContent = now ? 'だす' : 'ださない';
          render();
        });
        showList.appendChild(row);
      });
    });
  }
  function openShow() {
    var teach = document.getElementById('teach');
    if (teach) teach.hidden = true;
    buildShow();
    show.hidden = false;
    showList.scrollTop = 0;
    show.querySelector('.teach-card').focus({ preventScroll: true });
  }
  function closeShow() {
    show.hidden = true;
    if (gearBtn) gearBtn.focus({ preventScroll: true });
  }
  if (show && showList && showBtn) {
    showBtn.addEventListener('click', openShow);
    document.getElementById('showClose').addEventListener('click', closeShow);
    document.getElementById('showAll').addEventListener('click', function () {
      state.off = [];
      save();
      buildShow();
      render();
    });
    show.addEventListener('click', function (e) { if (e.target === show) closeShow(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !show.hidden) closeShow();
    });
    window.addEventListener('pageshow', function () { show.hidden = true; });
  }

  load();
  render();
  // 文字の よみこみが おわったら、タブの 中身を 入れなおす（はばが かわる ため）
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTabs);
})();

(function () {
  'use strict';
  if (!window.GameLock) return;

  GameLock.bindMenu();

  var gearBtn = document.getElementById('gearBtn');
  var gearHint = document.getElementById('gearHint');
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
      holdTimer = 0;
      gearBtn.classList.remove('is-pressing');
      openTeach();
    }, HOLD_MS);
  }
  function endHold() {
    if (!holdTimer) return;
    clearTimeout(holdTimer);
    holdTimer = 0;
    gearBtn.classList.remove('is-pressing');
    if (!opened) {
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
  gearBtn.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  gearBtn.addEventListener('keyup', function (e) {
    if (e.key === 'Enter' || e.key === ' ') endHold();
  });

  // ---------- 先生用の がめん ----------
  var teach = document.getElementById('teach');
  function openTeach() {
    teach.hidden = false;
    teach.querySelector('.teach-card').focus({ preventScroll: true });
  }
  function closeTeach() {
    teach.hidden = true;
    gearBtn.focus({ preventScroll: true });
  }
  document.getElementById('teachClose').addEventListener('click', closeTeach);
  teach.addEventListener('click', function (e) { if (e.target === teach) closeTeach(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !teach.hidden) closeTeach();
  });
  document.getElementById('pinBtn').addEventListener('click', function () {
    teach.hidden = true;
    GameLock.change({ onDone: function (changed) { if (changed) toast('パスワードを かえました'); } });
  });
  // 「もどる」で もどって きた ときは とじて おく
  window.addEventListener('pageshow', function () { teach.hidden = true; });

  var toastEl = null;
  var toastTimer = 0;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('p');
      toastEl.className = 'menu-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2500);
  }
})();
