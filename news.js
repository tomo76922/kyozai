// おしらせ（メニュー）
// ・news.json の 更新の 一覧を、「おしらせ」ボタンで あたらしい じゅんに 見せる
// ・更新した 日から 14日の あいだは、その 教材の ボタンに「NEW」を つける（日付は news.json から きめる）
(function () {
  'use strict';

  var NEW_DAYS = 14;
  var btn = document.getElementById('newsBtn');
  var box = document.getElementById('news');
  var listEl = document.getElementById('newsList');
  if (!btn || !box || !listEl) return;

  var items = null;   // よみこめた 一覧（よみこめないときは null）

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  // きょうから 何日 まえか（きょうは 0）
  function daysAgo(d) {
    var t = new Date();
    var today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((today - d) / 86400000);
  }
  function isNew(d) { var n = daysAgo(d); return n >= 0 && n < NEW_DAYS; }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function load() {
    return fetch('./news.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('news');
      return r.json();
    }).then(function (d) {
      items = (d && d.items || []).map(function (x) {
        return { date: parseDate(x.date), targets: x.targets || [], title: x.title || '', text: x.text || '' };
      }).filter(function (x) { return x.date && x.text; });
      // あたらしい じゅん（おなじ 日は ファイルの じゅんばんの まま）
      items = items.map(function (x, i) { x.i = i; return x; })
        .sort(function (a, b) { return (b.date - a.date) || (a.i - b.i); });
      markMenu();
    }).catch(function () { items = null; });
  }

  // メニューの ボタンに NEW
  function markMenu() {
    var latest = {};
    items.forEach(function (x) {
      x.targets.forEach(function (t) {
        if (!latest[t] || x.date > latest[t]) latest[t] = x.date;
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.menu-item'), function (a) {
      var m = /^\.\/([^/]+)\/?$/.exec(a.getAttribute('href') || '');
      var old = a.querySelector('.menu-new');
      if (old) old.remove();
      if (!m || !latest[m[1]] || !isNew(latest[m[1]])) return;
      var tag = document.createElement('span');
      tag.className = 'menu-new';
      tag.textContent = 'NEW';
      a.appendChild(tag);
    });
  }

  function fmtDate(d) {
    var y = new Date().getFullYear();
    return (d.getFullYear() !== y ? d.getFullYear() + '/' : '') + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function render() {
    if (!items) {
      listEl.innerHTML = '<li class="news-empty">おしらせを よみこめませんでした。ネットに つながっている ときに もういちど ひらいてください。</li>';
      return;
    }
    if (!items.length) {
      listEl.innerHTML = '<li class="news-empty">おしらせは まだ ありません。</li>';
      return;
    }
    listEl.innerHTML = items.map(function (x) {
      return '<li class="news-item">' +
        '<span class="news-date">' + fmtDate(x.date) + '</span>' +
        '<span class="news-what">' + esc(x.title) + (isNew(x.date) ? '<span class="menu-new">NEW</span>' : '') + '</span>' +
        '<p class="news-text">' + esc(x.text) + '</p>' +
        '</li>';
    }).join('');
  }

  function open() {
    render();
    box.hidden = false;
    listEl.scrollTop = 0;
    box.querySelector('.news-card').focus({ preventScroll: true });
    // よみこめて いなかったら、もういちど ためす
    if (!items) load().then(function () { if (!box.hidden) render(); });
  }
  function close() {
    box.hidden = true;
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', open);
  document.getElementById('newsClose').addEventListener('click', close);
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !box.hidden) close();
  });
  // 「もどる」で もどって きた ときは とじて おき、NEW を つけなおす（日が かわって いるかも しれない）
  window.addEventListener('pageshow', function (e) {
    box.hidden = true;
    if (e.persisted && items) markMenu();
  });

  load();
})();
