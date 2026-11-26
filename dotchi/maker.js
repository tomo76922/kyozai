// どっちかな：先生が しゃしんで もんだいを つくる
// ・セットは この iPad の 中（ブラウザの 保存領域 IndexedDB）にだけ 保存する。外には おくらない
// ・しゃしんは 小さく（長い ほうの 辺を 640 ピクセル まで）して JPEG で 保存する
// ・セットを ファイル（.json）に かきだして、ほかの iPad で よみこめる
// DotchiSets.list() → Promise（セットの 配列。ならべた じゅん）
// DotchiSets.open({ onClose }) → 「もんだいを つくる」の 画面を ひらく
(function (global) {
  'use strict';

  var DB_NAME = 'dotchi-v1';
  var STORE = 'sets';
  var PHOTO_MAX = 640;
  var PHOTO_Q = 0.8;
  var FILE_APP = 'kyozai-dotchi';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- ほぞん（IndexedDB） ----------
  var dbP = null;
  function openDb() {
    if (dbP) return dbP;
    dbP = new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('no indexedDB')); return; }
      var req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    dbP.catch(function () { dbP = null; });
    return dbP;
  }
  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var st = t.objectStore(STORE);
        var out = fn(st);
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('abort')); };
      });
    });
  }
  function list() {
    return tx('readonly', function (st) { return st.getAll(); }).then(function (all) {
      return (all || []).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || (a.created || 0) - (b.created || 0); });
    });
  }
  function put(set) { return tx('readwrite', function (st) { st.put(set); }); }
  function putAll(sets) { return tx('readwrite', function (st) { sets.forEach(function (s) { st.put(s); }); }); }
  function del(id) { return tx('readwrite', function (st) { st['delete'](id); }); }

  function newId() { return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  // ---------- しゃしんを 小さく する ----------
  function shrinkPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(1, PHOTO_MAX / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
        var c = document.createElement('canvas');
        c.width = cw;
        c.height = ch;
        var g = c.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, cw, ch);
        g.drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL('image/jpeg', PHOTO_Q)); } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  // ---------- ファイルに かきだす・よみこむ ----------
  function cleanSide(s) {
    s = s || {};
    var img = typeof s.img === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s.img) ? s.img : '';
    return { img: img, name: String(s.name || '').slice(0, 20) };
  }
  function cleanSet(s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.questions)) return null;
    var kind = s.kind === 'kimochi' ? 'kimochi' : 'mondai';
    var qs = [];
    s.questions.forEach(function (q) {
      if (!q) return;
      var L = cleanSide(q.L), R = cleanSide(q.R);
      if (!L.img || !R.img) return;
      qs.push({ text: String(q.text || '').slice(0, 60), L: L, R: R, ans: q.ans === 'L' || q.ans === 'R' ? q.ans : null });
    });
    if (kind === 'mondai') qs = qs.filter(function (q) { return q.ans; });
    if (!qs.length) return null;
    return { name: String(s.name || 'セット').slice(0, 30), kind: kind, questions: qs };
  }
  function exportSet(set) {
    var data = { app: FILE_APP, version: 1, sets: [{ name: set.name, kind: set.kind, questions: set.questions }] };
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'どっちかな_' + String(set.name).replace(/[\\/:*?"<>|\s]+/g, '_') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function readFileText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result || '')); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file);
    });
  }

  // ---------- 画面 ----------
  var ui = null;
  var sets = [];
  var draft = null;     // なおしている セット
  var qDraft = null;    // なおしている もんだい
  var qIndex = -1;      // -1 は あたらしい もんだい
  var onCloseFn = null;
  var photoSide = 'L';

  function toast(t) { if (global.DotchiToast) global.DotchiToast(t); }
  function ask(title, sub, yes, fn) { if (global.DotchiAsk) global.DotchiAsk(title, sub, yes, fn); else if (global.confirm(title)) fn(); }

  function view(name) {
    ['mkList', 'mkSet', 'mkQ'].forEach(function (id) { $(id).hidden = id !== name; });
    $('mkTitle').textContent = name === 'mkList' ? 'もんだいを つくる' : name === 'mkSet' ? 'セットを なおす' : 'もんだいを なおす';
    $('mkClose').hidden = name !== 'mkList';
    var box = $('mkEl');
    box.scrollTop = 0;
  }

  function open(opt) {
    onCloseFn = opt && opt.onClose;
    $('mkEl').hidden = false;
    view('mkList');
    refresh();
  }
  function close() {
    $('mkEl').hidden = true;
    draft = null;
    qDraft = null;
    if (onCloseFn) onCloseFn();
  }
  function isOpen() { return !$('mkEl').hidden; }

  function refresh() {
    return list().then(function (s) {
      sets = s;
      renderSets();
    }, function () {
      sets = [];
      $('mkSets').innerHTML = '<p class="mk-empty">この iPad では もんだいを ほぞん できません（プライベート ブラウズの ときなど）。</p>';
    });
  }

  function kindName(k) { return k === 'kimochi' ? 'きもち' : 'もんだい'; }

  function renderSets() {
    var box = $('mkSets');
    if (!sets.length) {
      box.innerHTML = '<p class="mk-empty">まだ セットが ありません。「＋ あたらしい セット」で つくれます。</p>';
      return;
    }
    box.innerHTML = sets.map(function (s, i) {
      var th = s.questions[0];
      return '<div class="mk-row">' +
        '<span class="mk-thumbs">' + (th ? '<img src="' + th.L.img + '" alt=""><img src="' + th.R.img + '" alt="">' : '') + '</span>' +
        '<span class="mk-row-main"><span class="mk-row-name">' + esc(s.name) + '</span>' +
        '<span class="mk-row-sub">' + kindName(s.kind) + '・' + s.questions.length + 'もん</span></span>' +
        '<span class="mk-row-btns">' +
        '<button type="button" class="btn mk-mini" data-act="up" data-i="' + i + '" aria-label="うえへ"' + (i ? '' : ' disabled') + '>▲</button>' +
        '<button type="button" class="btn mk-mini" data-act="down" data-i="' + i + '" aria-label="したへ"' + (i < sets.length - 1 ? '' : ' disabled') + '>▼</button>' +
        '<button type="button" class="btn mk-mini" data-act="edit" data-i="' + i + '">なおす</button>' +
        '<button type="button" class="btn mk-mini" data-act="export" data-i="' + i + '">かきだす</button>' +
        '<button type="button" class="btn mk-mini btn-warn" data-act="del" data-i="' + i + '">けす</button>' +
        '</span></div>';
    }).join('');
  }

  function saveOrder() {
    sets.forEach(function (s, i) { s.order = i; });
    return putAll(sets).then(renderSets, function () { toast('ほぞん できませんでした'); });
  }

  function onSetsClick(e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var i = Number(b.dataset.i);
    var s = sets[i];
    if (!s) return;
    var act = b.dataset.act;
    if (act === 'up' && i > 0) { sets.splice(i, 1); sets.splice(i - 1, 0, s); saveOrder(); }
    else if (act === 'down' && i < sets.length - 1) { sets.splice(i, 1); sets.splice(i + 1, 0, s); saveOrder(); }
    else if (act === 'edit') editSet(s);
    else if (act === 'export') exportSet(s);
    else if (act === 'del') {
      ask('「' + s.name + '」を けしますか？', 'セットの もんだいと しゃしんが ぜんぶ きえます。もとに もどせません。', 'けす', function () {
        del(s.id).then(refresh, function () { toast('けせませんでした'); });
      });
    }
  }

  // ---------- セットを なおす ----------
  function editSet(s) {
    draft = s ? JSON.parse(JSON.stringify(s)) : { id: null, name: '', kind: 'mondai', questions: [] };
    $('mkSetName').value = draft.name;
    $('mkSetErr').hidden = true;
    renderDraft();
    view('mkSet');
  }
  function renderKind() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-mk-kind]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mkKind === draft.kind));
    });
  }
  function renderDraft() {
    renderKind();
    var box = $('mkQs');
    if (!draft.questions.length) {
      box.innerHTML = '<p class="mk-empty">まだ もんだいが ありません。</p>';
      return;
    }
    box.innerHTML = draft.questions.map(function (q, i) {
      var ans = draft.kind === 'mondai'
        ? (q.ans ? 'せいかい：' + (q.ans === 'L' ? 'ひだり' : 'みぎ') : '<span class="mk-need">せいかいを えらんでね</span>')
        : 'きもち';
      return '<div class="mk-row">' +
        '<span class="mk-thumbs"><img src="' + q.L.img + '" alt=""><img src="' + q.R.img + '" alt=""></span>' +
        '<span class="mk-row-main"><span class="mk-row-name">' + (i + 1) + '. ' + esc(q.text) + '</span>' +
        '<span class="mk-row-sub">' + esc(q.L.name || 'ひだり') + ' ／ ' + esc(q.R.name || 'みぎ') + '・' + ans + '</span></span>' +
        '<span class="mk-row-btns">' +
        '<button type="button" class="btn mk-mini" data-qact="up" data-i="' + i + '" aria-label="うえへ"' + (i ? '' : ' disabled') + '>▲</button>' +
        '<button type="button" class="btn mk-mini" data-qact="down" data-i="' + i + '" aria-label="したへ"' + (i < draft.questions.length - 1 ? '' : ' disabled') + '>▼</button>' +
        '<button type="button" class="btn mk-mini" data-qact="edit" data-i="' + i + '">なおす</button>' +
        '<button type="button" class="btn mk-mini btn-warn" data-qact="del" data-i="' + i + '">けす</button>' +
        '</span></div>';
    }).join('');
  }
  function onQsClick(e) {
    var b = e.target.closest('[data-qact]');
    if (!b) return;
    var i = Number(b.dataset.i);
    var qs = draft.questions;
    var q = qs[i];
    if (!q) return;
    var act = b.dataset.qact;
    if (act === 'up' && i > 0) { qs.splice(i, 1); qs.splice(i - 1, 0, q); renderDraft(); }
    else if (act === 'down' && i < qs.length - 1) { qs.splice(i, 1); qs.splice(i + 1, 0, q); renderDraft(); }
    else if (act === 'edit') editQ(i);
    else if (act === 'del') {
      ask((i + 1) + 'もんめを けしますか？', '「ほぞん」を おすまでは、セットは かわりません。', 'けす', function () {
        qs.splice(i, 1);
        renderDraft();
      });
    }
  }
  function saveDraft() {
    var err = $('mkSetErr');
    draft.name = $('mkSetName').value.trim();
    if (!draft.name) { err.textContent = 'セットの なまえを いれてください。'; err.hidden = false; return; }
    if (!draft.questions.length) { err.textContent = 'もんだいを 1つ いじょう たしてください。'; err.hidden = false; return; }
    if (draft.kind === 'mondai' && draft.questions.some(function (q) { return !q.ans; })) {
      err.textContent = '「もんだい」の セットでは、どの もんだいにも せいかい（ひだり・みぎ）が いります。'; err.hidden = false; return;
    }
    if (!draft.id) {
      draft.id = newId();
      draft.created = Date.now();
      draft.order = sets.length ? Math.max.apply(null, sets.map(function (s) { return s.order || 0; })) + 1 : 0;
    }
    draft.updated = Date.now();
    var d = draft;
    put(d).then(function () {
      draft = null;
      toast('ほぞん しました');
      view('mkList');
      refresh();
    }, function () {
      err.textContent = 'ほぞん できませんでした。iPad の あき ようりょうが すくない かもしれません。';
      err.hidden = false;
    });
  }
  function cancelDraft() {
    ask('なおした ところを すてますか？', '「ほぞん」していない ところは きえます。', 'すてる', function () {
      draft = null;
      view('mkList');
    });
  }

  // ---------- もんだいを なおす ----------
  function editQ(i) {
    qIndex = i;
    var q = i >= 0 ? draft.questions[i] : null;
    qDraft = q ? JSON.parse(JSON.stringify(q)) : { text: '', L: { img: '', name: '' }, R: { img: '', name: '' }, ans: null };
    $('mkQText').value = qDraft.text;
    $('mkNameL').value = qDraft.L.name;
    $('mkNameR').value = qDraft.R.name;
    $('mkQErr').hidden = true;
    $('mkAnsBox').hidden = draft.kind !== 'mondai';
    renderQ();
    view('mkQ');
  }
  function renderQ() {
    $('mkQErr').hidden = true;
    ['L', 'R'].forEach(function (s) {
      var box = $('mkPhoto' + s);
      box.innerHTML = qDraft[s].img ? '<img src="' + qDraft[s].img + '" alt="">' : '<span>しゃしん なし</span>';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-mk-ans]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mkAns === qDraft.ans));
    });
  }
  function takePhoto(input, side) {
    photoSide = side;
    input.value = '';
    input.click();
  }
  function onPhoto(e) {
    var f = e.target.files && e.target.files[0];
    if (!f || !qDraft) return;
    var side = photoSide;
    var box = $('mkPhoto' + side);
    box.innerHTML = '<span>じゅんびしています…</span>';
    shrinkPhoto(f).then(function (url) {
      if (!qDraft) return;
      qDraft[side].img = url;
      renderQ();
    }, function () {
      renderQ();
      toast('この しゃしんは つかえませんでした');
    });
  }
  function saveQ() {
    var err = $('mkQErr');
    qDraft.text = $('mkQText').value.trim();
    qDraft.L.name = $('mkNameL').value.trim();
    qDraft.R.name = $('mkNameR').value.trim();
    var miss = [];
    if (!qDraft.text) miss.push('もんだいの ぶん');
    if (!qDraft.L.img) miss.push('ひだりの しゃしん');
    if (!qDraft.R.img) miss.push('みぎの しゃしん');
    if (draft.kind === 'mondai' && !qDraft.ans) miss.push('せいかい');
    if (miss.length) { err.textContent = miss.join('・') + 'を いれてください。'; err.hidden = false; return; }
    if (draft.kind !== 'mondai' && !qDraft.ans) qDraft.ans = null;
    if (qIndex >= 0) draft.questions[qIndex] = qDraft;
    else draft.questions.push(qDraft);
    qDraft = null;
    renderDraft();
    view('mkSet');
  }

  // ---------- よみこむ ----------
  function onImport(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    readFileText(f).then(function (text) {
      var data = JSON.parse(text);
      if (!data || data.app !== FILE_APP || !Array.isArray(data.sets)) throw new Error('format');
      var got = data.sets.map(cleanSet).filter(Boolean);
      if (!got.length) throw new Error('empty');
      var names = sets.map(function (s) { return s.name; });
      var order = sets.length ? Math.max.apply(null, sets.map(function (s) { return s.order || 0; })) + 1 : 0;
      got.forEach(function (s) {
        var base = s.name, name = base, n = 2;
        while (names.indexOf(name) >= 0) name = base + '（' + (n++) + '）';
        names.push(name);
        s.name = name;
        s.id = newId();
        s.created = s.updated = Date.now();
        s.order = order++;
      });
      return putAll(got).then(function () {
        toast(got.map(function (s) { return '「' + s.name + '」'; }).join('') + 'を よみこみました');
        refresh();
      });
    }).catch(function () {
      toast('この ファイルは よみこめませんでした（どっちかな で かきだした ファイルを えらんでください）');
    });
  }

  function init() {
    if (ui) return;
    ui = true;
    $('mkClose').addEventListener('click', close);
    $('mkNewBtn').addEventListener('click', function () { editSet(null); });
    $('mkImportBtn').addEventListener('click', function () { $('mkImportFile').value = ''; $('mkImportFile').click(); });
    $('mkImportFile').addEventListener('change', onImport);
    $('mkSets').addEventListener('click', onSetsClick);
    $('mkQs').addEventListener('click', onQsClick);
    Array.prototype.forEach.call(document.querySelectorAll('[data-mk-kind]'), function (b) {
      b.addEventListener('click', function () {
        draft.kind = b.dataset.mkKind;
        renderDraft();
      });
    });
    $('mkAddQ').addEventListener('click', function () { editQ(-1); });
    $('mkSetSave').addEventListener('click', saveDraft);
    $('mkSetCancel').addEventListener('click', cancelDraft);
    Array.prototype.forEach.call(document.querySelectorAll('[data-mk-cam]'), function (b) {
      b.addEventListener('click', function () { takePhoto($('mkCamFile'), b.dataset.mkCam); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-mk-pick]'), function (b) {
      b.addEventListener('click', function () { takePhoto($('mkPickFile'), b.dataset.mkPick); });
    });
    $('mkCamFile').addEventListener('change', onPhoto);
    $('mkPickFile').addEventListener('change', onPhoto);
    Array.prototype.forEach.call(document.querySelectorAll('[data-mk-ans]'), function (b) {
      b.addEventListener('click', function () { qDraft.ans = b.dataset.mkAns; renderQ(); });
    });
    $('mkQOk').addEventListener('click', saveQ);
    $('mkQCancel').addEventListener('click', function () { qDraft = null; view('mkSet'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.DotchiSets = {
    list: list,
    open: open,
    close: close,
    isOpen: isOpen,
    // とちゅうで 閉じると こまる とき（なおしている とちゅう）
    editing: function () { return isOpen() && !!draft; },
    back: function () {
      if (!$('mkQ').hidden) { qDraft = null; view('mkSet'); }
      else if (!$('mkSet').hidden) cancelDraft();
      else close();
    }
  };
})(window);
