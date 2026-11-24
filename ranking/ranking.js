// ランキング（あつめる 係の iPad）
// ・こどもの iPad に 出た QRコードを カメラで よみとって、きろくを あつめる（ネットは つかわない）
// ・カメラの えいぞうは ほぞんも そうしんも しない（QRコードを よむ ためだけに 1まいずつ 見て すてる）
// ・あつめた きろくは この iPad の中（ブラウザの保存領域）に 保存する。CSV に かきだし・よみこみ できる
(function () {
  'use strict';
  var K = window.Kiroku;
  if (!K) return;

  var STORE_KEY = 'kyozai-ranking-v1';
  var VIEW_KEY = 'kyozai-ranking-view';
  var TOP = 10;

  function $(id) { return document.getElementById(id); }
  K.addStyle();   // いろの マークの 見た目

  // ---------- ほぞん ----------
  var recs = [];
  var ids = {};
  var canSave = true;
  (function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canSave = false; }
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      (d && d.recs || []).forEach(function (r) { addRec(r, true); });
    } catch (e) {}
  })();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, recs: recs })); canSave = true; }
    catch (e) { canSave = false; }
    $('saveWarn').hidden = canSave;
  }
  // 1けん たす（おなじ しるしの きろくが あれば たさない）。たしたら true
  function addRec(r, quiet) {
    if (!r || !K.valid(r) || ids[r.id]) return false;
    var x = { id: r.id, g: r.g, d: r.d, st: r.st | 0, s: r.s, t: r.t | 0, n: r.n, c: r.c, at: r.at, rx: r.rx || Date.now() };
    recs.push(x);
    ids[x.id] = x;
    if (!quiet) save();
    return true;
  }

  // ---------- ひょうじの じょうたい ----------
  var view = { g: 'piyo', d: '', st: 1, when: 'today' };
  try {
    var v = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null');
    if (v && K.GAMES[v.g]) { view.g = v.g; view.d = v.d || ''; view.st = v.st | 0 || 1; view.when = v.when === 'all' ? 'all' : 'today'; }
  } catch (e) {}
  function saveView() { try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch (e) {} }

  function dayKey(ms) {
    var t = new Date(ms);
    return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  }
  function shortDate(ms) {
    var t = new Date(ms);
    return (t.getMonth() + 1) + 'がつ' + t.getDate() + 'にち';
  }

  // ---------- じゅんい ----------
  function better(a, b, low) {
    // a が b より 上なら 負
    if (low) return (a.s - b.s) || (a.t - b.t) || (a.at - b.at);
    return (b.s - a.s) || (a.at - b.at);
  }
  function sameScore(a, b, low) { return a.s === b.s && (!low || a.t === b.t); }

  function ranked(g, d, st, when) {
    var G = K.GAMES[g];
    var low = G.order === 'low';
    var today = dayKey(Date.now());
    var list = recs.filter(function (r) {
      return r.g === g && r.d === d && (g !== 'piyo' || r.st === st) && (when !== 'today' || dayKey(r.at) === today);
    });
    list.sort(function (a, b) { return better(a, b, low); });
    // おなじ ひと（イニシャルと いろが おなじ）は、いちばん いい きろくだけ
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length && out.length < TOP; i++) {
      var key = list[i].n + '-' + list[i].c;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(Object.assign({}, list[i]));
    }
    // おなじ てんは おなじ じゅんい
    out.forEach(function (r, k) {
      r._rank = k > 0 && sameScore(r, out[k - 1], low) ? out[k - 1]._rank : k + 1;
    });
    return out;
  }

  // ---------- がめん ----------
  function tabHtml(attr, val, label, on) {
    return '<button type="button" class="tab" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + label + '</button>';
  }

  function render() {
    var G = K.GAMES[view.g];
    var mine = recs.filter(function (r) { return r.g === view.g; });

    $('games').innerHTML = K.GAME_ORDER.map(function (g) {
      return tabHtml('data-g', g, K.GAMES[g].name, g === view.g);
    }).join('');

    // むずかしさ：きろくの ある ものだけ（なければ はじめの もの）
    var diffs = G.diffs.filter(function (x) { return mine.some(function (r) { return r.d === x[0]; }); });
    if (!diffs.length) diffs = view.g === 'catch' ? G.diffs.slice(0, 1) : G.diffs;
    if (!diffs.some(function (x) { return x[0] === view.d; })) view.d = diffs[0][0];
    $('diffs').innerHTML = diffs.map(function (x) { return tabHtml('data-d', x[0], x[1], x[0] === view.d); }).join('');

    var stagesEl = $('stages');
    stagesEl.hidden = view.g !== 'piyo';
    if (view.g === 'piyo') {
      var sts = [];
      for (var s = 1; s <= G.stages; s++) sts.push(s);
      if (!(view.st >= 1 && view.st <= G.stages)) view.st = 1;
      // きろくの ある ステージが ほかに あって、いまの ステージに ない ときは、ある ほうへ
      var has = sts.filter(function (n) { return mine.some(function (r) { return r.d === view.d && r.st === n; }); });
      if (has.length && has.indexOf(view.st) < 0) view.st = has[0];
      stagesEl.innerHTML = sts.map(function (n) {
        return tabHtml('data-st', n, 'ステージ' + n, n === view.st);
      }).join('');
    }

    var list = ranked(view.g, view.d, view.st, view.when);
    $('caption').textContent = G.name + '・' + K.diffLabel(view.g, view.d) +
      (view.g === 'piyo' ? '・ステージ' + view.st : '') + '（' + (view.when === 'today' ? 'きょう' : 'ぜんぶ') + '）';
    $('list').innerHTML = list.map(function (r) {
      var score;
      if (r.g === 'piyo') score = r.s + '<small>こ</small>';
      else if (r.g === 'catch') score = r.s + '<small>てん</small>';
      else score = r.s + '<small>かい</small>';
      var sub = [];
      if (r.g === 'shinkei') sub.push(K.timeWords(r.t));
      if (view.when === 'all') sub.push(shortDate(r.at));
      return '<li class="row rank-' + r._rank + '" aria-label="' + r._rank + 'い ' + K.initialsText(r.n) + ' ' + K.colorLabel(r.c) + ' ' + K.scoreText(r) + '">' +
        '<span class="rank" aria-hidden="true">' + r._rank + 'い</span>' +
        K.markSvg(r.c) +
        '<span class="ini" aria-hidden="true">' + K.initialsText(r.n) + '</span>' +
        '<span class="score" aria-hidden="true">' + score +
          (sub.length ? '<span class="sub">' + sub.join('・') + '</span>' : '') + '</span>' +
        '</li>';
    }).join('');
    var empty = $('empty');
    empty.hidden = list.length > 0;
    $('list').hidden = !list.length;
    empty.textContent = view.when === 'today' ? 'きょうの きろくは まだ ないよ' : 'まだ きろくが ないよ';

    var today = dayKey(Date.now());
    var nToday = recs.filter(function (r) { return dayKey(r.at) === today; }).length;
    $('count').textContent = 'きろく：きょう ' + nToday + 'けん／ぜんぶ ' + recs.length + 'けん';

    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.when === view.when));
    });
    $('saveWarn').hidden = canSave;
    saveView();
  }

  $('games').addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]');
    if (!b) return;
    if (view.g !== b.dataset.g) { view.g = b.dataset.g; view.d = ''; view.st = 1; }
    render();
  });
  $('diffs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]');
    if (b) { view.d = b.dataset.d; render(); }
  });
  $('stages').addEventListener('click', function (e) {
    var b = e.target.closest('[data-st]');
    if (b) { view.st = Number(b.dataset.st); render(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) {
    b.addEventListener('click', function () { view.when = b.dataset.when; render(); });
  });

  // ---------- おしらせ ----------
  var toastTimer = 0;
  function toast(text) {
    var el = $('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3200);
  }

  // ---------- たしかめる ----------
  var askYesFn = null;
  function ask(title, text, yesText, onYes) {
    $('askTitle').textContent = title;
    $('askText').textContent = text;
    $('askYes').textContent = yesText;
    askYesFn = onYes;
    $('ask').hidden = false;
    $('askNo').focus({ preventScroll: true });
  }
  function closeAsk() { $('ask').hidden = true; askYesFn = null; }
  $('askNo').addEventListener('click', closeAsk);
  $('askYes').addEventListener('click', function () {
    var fn = askYesFn;
    closeAsk();
    if (fn) fn();
  });

  // ---------- ぜんぶ けす（2かい たしかめる） ----------
  $('clearBtn').addEventListener('click', function () {
    if (!recs.length) { toast('けす きろくは ありません'); return; }
    ask('ランキングを ぜんぶ けしますか？', 'あつめた きろく ' + recs.length + 'けんを ぜんぶ けします。', 'けす', function () {
      ask('ほんとうに けしますか？', 'けすと もとに もどせません（「かきだす」で ほぞんした ファイルが あれば、「よみこむ」で もどせます）。', 'ぜんぶ けす', function () {
        recs = [];
        ids = {};
        save();
        render();
        toast('ランキングを ぜんぶ けしました');
      });
    });
  });

  // ---------- CSV に かきだす ----------
  var COLS = ['id', 'game', 'game_name', 'diff', 'diff_name', 'stage', 'score', 'time_ms', 'initials', 'color', 'color_name', 'played_at', 'played_at_ms'];
  function pad2(n) { return ('0' + n).slice(-2); }
  function fmtDate(ms) {
    var t = new Date(ms);
    return t.getFullYear() + '/' + pad2(t.getMonth() + 1) + '/' + pad2(t.getDate()) + ' ' + pad2(t.getHours()) + ':' + pad2(t.getMinutes()) + ':' + pad2(t.getSeconds());
  }
  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCsv() {
    var rows = [COLS.join(',')];
    recs.slice().sort(function (a, b) { return a.at - b.at; }).forEach(function (r) {
      rows.push([
        r.id, r.g, K.GAMES[r.g].name, r.d, K.diffLabel(r.g, r.d), r.st, r.s, r.t,
        r.n, r.c, K.COLORS[r.c].name, fmtDate(r.at), r.at
      ].map(csvCell).join(','));
    });
    return '﻿' + rows.join('\r\n') + '\r\n';
  }
  $('exportBtn').addEventListener('click', function () {
    if (!recs.length) { toast('かきだす きろくが ありません'); return; }
    var t = new Date();
    var name = 'ranking-' + t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()) + '.csv';
    var blob = new Blob([toCsv()], { type: 'text/csv' });
    var file = null;
    try { file = new File([blob], name, { type: 'text/csv' }); } catch (e) {}
    // iPad：きょうゆう の がめんから「"ファイル" に ほぞん」
    if (file && navigator.canShare && navigator.share && /iPad|iPhone|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) {
      try {
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: name }).then(function () {
            toast('かきだしました');
          }).catch(function (err) {
            if (err && err.name === 'AbortError') return;
            download(blob, name);
          });
          return;
        }
      } catch (e) {}
    }
    download(blob, name);
  });
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    toast(name + ' に かきだしました');
  }

  // ---------- CSV を よみこむ ----------
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (q) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { cell += '"'; i++; }
          else q = false;
        } else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(cell); cell = '';
        rows.push(row); row = [];
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); });
  }
  function parseDate(s) {
    var m = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(s).trim());
    if (!m) return NaN;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
  }
  function importCsv(text) {
    var rows = parseCsv(text);
    if (!rows.length) return null;
    var head = rows[0].map(function (h) { return h.trim(); });
    var col = {};
    head.forEach(function (h, i) { col[h] = i; });
    if (col.id == null || col.game == null || col.score == null) return null;
    var added = 0, same = 0, bad = 0;
    rows.slice(1).forEach(function (r) {
      function get(k) { return col[k] == null ? '' : String(r[col[k]] || '').trim(); }
      var at = Number(get('played_at_ms'));
      // 表けいさんソフトで ひらいて 数が かわった とき（1.76E+12 など）は、日時の もじから
      var at2 = parseDate(get('played_at'));
      if (!(at > 1.5e12) || (!isNaN(at2) && Math.abs(at - at2) > 1000)) at = isNaN(at2) ? at : at2;
      var x = {
        id: get('id'), g: get('game'), d: get('diff'), st: parseInt(get('stage'), 10) || 0,
        s: parseInt(get('score'), 10), t: parseInt(get('time_ms'), 10) || 0,
        n: get('initials').toUpperCase(), c: parseInt(get('color'), 10), at: Math.round(at)
      };
      if (!K.valid(x)) { bad++; return; }
      if (ids[x.id]) { same++; return; }
      addRec(x, true);
      added++;
    });
    if (added) save();
    return { added: added, same: same, bad: bad };
  }
  $('importBtn').addEventListener('click', function () { $('fileIn').value = ''; $('fileIn').click(); });
  $('fileIn').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var res = importCsv(String(fr.result || ''));
      if (!res) { toast('この ファイルは よみこめませんでした'); return; }
      render();
      var t = res.added + 'けん よみこみました';
      if (res.same) t += '（' + res.same + 'けんは もう ありました）';
      if (res.bad) t += '。' + res.bad + 'けんは よめませんでした';
      toast(t);
    };
    fr.onerror = function () { toast('この ファイルは よみこめませんでした'); };
    fr.readAsText(f, 'utf-8');
  });

  // ---------- QRコードを よみとる ----------
  var scanEl = $('scan'), video = $('video'), frameEl = $('scanFrame'), waitEl = $('scanWait');
  var msgEl = $('scanMsg'), logEl = $('scanLog'), flipBtn = $('flipBtn');
  var stream = null, scanning = false, loopTimer = 0, facing = 'user';
  var cv = document.createElement('canvas');
  var cx = cv.getContext('2d', { willReadFrequently: true });
  var lastText = '', lastAt = 0, lastNg = 0;
  try { if (localStorage.getItem('kyozai-ranking-cam') === 'environment') facing = 'environment'; } catch (e) {}

  function renderFlip() {
    flipBtn.textContent = facing === 'user' ? 'そとの カメラに する' : 'インカメラに する';
    video.classList.toggle('is-mirror', facing === 'user');
  }

  function openScan() {
    scanEl.hidden = false;
    scanning = true;
    logEl.innerHTML = '';
    setMsg('QRコードを カメラに うつしてね', '');
    renderFlip();
    unlockAudio();
    startCam();
    $('scanEndBtn').focus({ preventScroll: true });
  }
  function closeScan() {
    scanning = false;
    stopCam();
    scanEl.hidden = true;
    render();
    $('scanBtn').focus({ preventScroll: true });
  }

  function startCam() {
    stopCam();
    waitEl.hidden = false;
    waitEl.textContent = 'カメラを じゅんび しています…';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      waitEl.textContent = 'この ブラウザでは カメラが つかえません';
      return;
    }
    var want = facing;
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: want }, width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function (s) {
      if (!scanning || want !== facing) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      video.srcObject = s;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      waitEl.hidden = true;
      tick();
    }).catch(function (err) {
      var n = err && err.name;
      waitEl.textContent = n === 'NotAllowedError' || n === 'SecurityError'
        ? 'カメラを つかう きょかが ありません。iPad の「設定」で、この サイト（または Safari）の カメラを「許可」に してください'
        : 'カメラを ひらけませんでした';
    });
  }
  function stopCam() {
    clearTimeout(loopTimer);
    loopTimer = 0;
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null;
    try { video.pause(); } catch (e) {}
    video.srcObject = null;
  }

  // 0.15びょう ごとに 1まい 見る（見た えは すぐ すてる）
  function tick() {
    if (!scanning || !stream) return;
    loopTimer = setTimeout(tick, 150);
    var w = video.videoWidth, h = video.videoHeight;
    if (!w || !h || video.readyState < 2) return;
    var sc = Math.min(1, 720 / Math.max(w, h));
    var cw = Math.round(w * sc), ch = Math.round(h * sc);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    cx.drawImage(video, 0, 0, cw, ch);
    var img;
    try { img = cx.getImageData(0, 0, cw, ch); } catch (e) { return; }
    var code = window.jsQR ? window.jsQR(img.data, cw, ch, { inversionAttempts: 'dontInvert' }) : null;
    if (code && code.data) onCode(code.data);
  }

  function onCode(text) {
    var now = Date.now();
    // おなじ QRコードが うつりつづけて いる あいだは、なんども おしらせ しない
    if (text === lastText && now - lastAt < 3000) { lastAt = now; return; }
    lastText = text;
    lastAt = now;
    var r = K.decode(text);
    if (!r) {
      if (now - lastNg > 2500) {
        lastNg = now;
        setMsg('この QRコードは きろくでは ないよ', 'is-ng');
        flash('is-ng');
      }
      return;
    }
    var who = K.markSvg(r.c) + '<span>' + K.initialsText(r.n) + ' さん';
    if (ids[r.id]) {
      setMsg(who + 'の きろくは もう うけとって いるよ</span>', 'is-same', true);
      flash('is-ok');
      return;
    }
    addRec(r);
    setMsg(who + 'の きろくを うけとったよ</span>', 'is-ok', true);
    flash('is-ok');
    chime();
    var li = document.createElement('li');
    li.innerHTML = K.markSvg(r.c) + '<b>' + K.initialsText(r.n) + '</b>' +
      '<span>' + K.scoreText(r) + '</span>' +
      '<span class="lg-what">' + K.GAMES[r.g].name + '・' + K.diffLabel(r.g, r.d) + (r.g === 'piyo' ? '・ステージ' + r.st : '') + '</span>';
    logEl.insertBefore(li, logEl.firstChild);
  }

  function setMsg(html, cls, isHtml) {
    if (isHtml) msgEl.innerHTML = html; else msgEl.textContent = html;
    msgEl.className = 'scan-msg' + (cls ? ' ' + cls : '');
  }
  var flashTimer = 0;
  function flash(cls) {
    frameEl.className = 'scan-frame ' + cls;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { frameEl.className = 'scan-frame'; }, 900);
  }

  // うけとった ときの おと（ページの 中で つくる）
  var actx = null;
  function unlockAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) { try { actx = new AC(); } catch (e) { return; } }
    if (actx.state === 'suspended') actx.resume().catch(function () {});
  }
  function chime() {
    if (!actx) return;
    var t = actx.currentTime + 0.02;
    [784, 1175].forEach(function (f, i) {
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.13);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.13 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.13 + 0.45);
      o.connect(g); g.connect(actx.destination);
      o.start(t + i * 0.13);
      o.stop(t + i * 0.13 + 0.5);
    });
  }

  $('scanBtn').addEventListener('click', openScan);
  $('scanEndBtn').addEventListener('click', closeScan);
  flipBtn.addEventListener('click', function () {
    facing = facing === 'user' ? 'environment' : 'user';
    try { localStorage.setItem('kyozai-ranking-cam', facing); } catch (e) {}
    renderFlip();
    startCam();
  });

  // ほかの アプリに したら カメラを とめる。もどったら また つける
  document.addEventListener('visibilitychange', function () {
    if (!scanning) return;
    if (document.visibilityState === 'hidden') stopCam();
    else startCam();
  });
  window.addEventListener('pagehide', function () { stopCam(); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('ask').hidden) closeAsk();
    else if (scanning) closeScan();
  });

  // よみとっている とちゅうは、新しい版への 切りかえで 再読み込み しない
  window.kyozaiBusy = function () { return scanning; };

  render();
})();
