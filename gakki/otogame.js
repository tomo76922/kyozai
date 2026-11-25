// おとゲーム（がっき の ゆびで えんそう）
// 曲に あわせて 丸が おりてきて、「ここで タップ」の 線に きたときに けんばん・ボタンを たたく。
// ・メロディは 子どもが たたいた 音で 鳴る。うしろで 伴奏（和音・リズム）を 小さく 流す
// ・はんていは やさしめ：「ぴったり！」「いいね！」「おしい！」（しっぱい という ことばは つかわない）
// ・ちがう けんばんを たたいたときは、音は 鳴らすが はんていには いれない
//
//   var g = OtoGame.create({ box, inst, song, level, tempo, keyColors, noteNames, art, play(id, sound), onEnd(result) });
//   g.start(ms)   … ms（performance.now() の 時こく）に 曲の 1はくめ
//   g.tick(now)   … 毎フレーム よぶ
//   g.reset()     … はじめの 状態に もどす（伴奏も 止まる）
(function (global) {
  'use strict';

  // むずかしさ：bpm（1ぷんの はく）、fall（丸が おりてくる じかん ms）、win（ぴったり・いいね・おしい の はば ms）
  var LEVELS = {
    renshu: { name: 'れんしゅう', bpm: 66, fall: 2400, win: [200, 420, 750], wait: true, gap: 0 },
    yasashii: { name: 'やさしい', bpm: 66, fall: 2400, win: [230, 470, 800], wait: false, gap: 2 },
    futsuu: { name: 'ふつう', bpm: 84, fall: 2000, win: [140, 300, 550], wait: false, gap: 0 }
  };
  var LINE = 34;   // 「ここで タップ」の 線の いち（下から px。gakki.css の .g-line と そろえる）
  var GRADES = { pit: 'ぴったり！', ii: 'いいね！', os: 'おしい！' };
  var TAIKO = [{ label: 'ドン', sound: 0, color: '#e0524a' }, { label: 'カッ', sound: 1, color: '#3f7fc4' }];

  function create(o) {
    var it = o.inst, L = LEVELS[o.level] || LEVELS.yasashii;
    var spb = 60000 / (L.bpm * (o.tempo || 100) / 100);   // 1はくの ms

    // ---------- レーン ----------
    var lanes;
    if (it.keys) {
      lanes = o.noteNames.map(function (nm, i) { return { label: nm, sound: i, color: o.keyColors[i] }; });
    } else if (it.id === 'taiko') {
      lanes = TAIKO;
    } else {
      lanes = [{ label: it.sounds[0], sound: 0, color: it.color }];
    }

    // ---------- 丸（曲の メロディから 作る） ----------
    var notes = [], lastBeat = -99;
    o.song.notes.forEach(function (n) {
      if (L.gap && n.beat - lastBeat < L.gap) return;   // やさしい：あいだを あけて、同時に 見える 丸は 1つだけ
      lastBeat = n.beat;
      var lane = it.keys ? n.deg : it.id === 'taiko' ? ((n.beat % 1 === 0 && Math.floor(n.beat) % 2 === 0) ? 0 : 1) : 0;
      if (lane < 0 || lane >= lanes.length) return;
      notes.push({ t: n.beat * spb, lane: lane, el: null, hit: false, gone: false });
    });
    var fall = L.gap ? Math.min(L.fall, L.gap * spb * 0.95) : L.fall;
    // おなじ レーンで いちばん ちかい 丸の あいだ（丸が かさならない 大きさに するため）
    var minGap = Infinity, lastIn = {};
    notes.forEach(function (n) {
      if (lastIn[n.lane] != null) minGap = Math.min(minGap, n.t - lastIn[n.lane]);
      lastIn[n.lane] = n.t;
    });
    var endT = o.song.beats * spb + 800;

    // 伴奏（はくごと）
    var backs = [];
    for (var b = 0; b < o.song.beats; b++) {
      var bn = o.song.bassNotes[Math.floor(b / 2)];
      backs.push({ t: b * spb, root: bn ? bn.root : 'ド', strong: b % 2 === 0 });
    }

    // ---------- 画面 ----------
    var box = o.box;
    box.innerHTML = '';
    box.className = 'game game-' + it.id + ' lanes-' + lanes.length;
    box.style.setProperty('--accent', it.color);
    var bar = document.createElement('div');
    bar.className = 'g-bar';
    bar.innerHTML = '<span class="g-prog" aria-hidden="true"><i></i></span>' +
      '<span class="g-cnt"><b class="c-pit">ぴったり <span>0</span></b><b class="c-ii">いいね <span>0</span></b><b class="c-os">おしい <span>0</span></b></span>';
    var field = document.createElement('div');
    field.className = 'g-field';
    var keysRow = document.createElement('div');
    keysRow.className = 'g-keys';
    var laneEls = [], keyEls = [];
    lanes.forEach(function (ln, i) {
      var le = document.createElement('div');
      le.className = 'g-lane';
      le.style.setProperty('--c', ln.color);
      field.appendChild(le);
      laneEls.push(le);
      var k = document.createElement('button');
      k.type = 'button';
      k.className = 'g-key';
      k.style.setProperty('--c', ln.color);
      k.setAttribute('aria-label', it.name + ' ' + ln.label);
      if (lanes.length === 1) k.innerHTML = '<span class="g-key-art">' + o.art + '</span><span class="g-key-name">' + ln.label + '</span>';
      else k.innerHTML = '<span class="g-key-name">' + ln.label + '</span>';
      k.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(i, performance.now()); });
      k.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); tap(i, performance.now()); }
      });
      keysRow.appendChild(k);
      keyEls.push(k);
    });
    var line = document.createElement('div');
    line.className = 'g-line';
    line.innerHTML = '<span>ここで タップ</span>';
    field.appendChild(line);
    var waitTip = document.createElement('div');
    waitTip.className = 'g-wait';
    waitTip.textContent = 'たたいてね';
    waitTip.hidden = true;
    field.appendChild(waitTip);
    box.appendChild(bar);
    box.appendChild(field);
    box.appendChild(keysRow);
    var progEl = bar.querySelector('.g-prog i');
    var cntEls = { pit: bar.querySelector('.c-pit span'), ii: bar.querySelector('.c-ii span'), os: bar.querySelector('.c-os span') };

    notes.forEach(function (n) {
      var e = document.createElement('span');
      e.className = 'g-note';
      e.textContent = lanes[n.lane].label;
      e.style.setProperty('--c', lanes[n.lane].color);
      e.hidden = true;
      laneEls[n.lane].appendChild(e);
      n.el = e;
    });

    // ---------- じかん（れんしゅう は 丸が 線で まつ） ----------
    var S;
    function resetState() {
      S = { started: false, ended: false, base: 0, perfBase: 0, waiting: null, bi: 0, cnt: { pit: 0, ii: 0, os: 0 }, next: null };
    }
    resetState();
    function songT(now) { return S.waiting ? S.waiting.t : S.base + (now - S.perfBase); }
    function firstOpen() {
      for (var i = 0; i < notes.length; i++) if (!notes[i].hit && !notes[i].gone) return notes[i];
      return null;
    }

    function popup(lane, g) {
      var p = document.createElement('span');
      p.className = 'g-pop g-pop-' + g;
      p.textContent = GRADES[g];
      p.style.left = ((lane + 0.5) / lanes.length * 100) + '%';
      field.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 900);
    }
    function keyFx(i) {
      var k = keyEls[i];
      k.classList.remove('is-hit');
      void k.offsetWidth;
      k.classList.add('is-hit');
    }

    function tap(lane, now) {
      o.play(it.id, lanes[lane].sound);
      keyFx(lane);
      if (!S.started || S.ended) return;
      var T = songT(now), cand = null;
      if (S.waiting) {
        if (S.waiting.lane === lane) cand = S.waiting;
      } else {
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          if (n.hit || n.gone || n.lane !== lane) continue;
          if (Math.abs(T - n.t) <= L.win[2]) { cand = n; break; }
          if (n.t - T > L.win[2]) break;
        }
      }
      if (!cand) return;   // ちがう けんばん・はやすぎる ときは はんていに いれない
      var d = Math.abs(T - cand.t);
      var g = d <= L.win[0] ? 'pit' : d <= L.win[1] ? 'ii' : 'os';
      cand.hit = true;
      S.cnt[g]++;
      cntEls[g].textContent = String(S.cnt[g]);
      popup(lane, g);
      cand.el.classList.add('is-hit');
      (function (e) { setTimeout(function () { e.hidden = true; }, 260); })(cand.el);
      if (S.waiting === cand) {
        // まっていた 丸を たたいたら、そこから 曲を すすめる
        S.base = cand.t;
        S.perfBase = now;
        S.waiting = null;
        waitTip.hidden = true;
      }
    }

    function start(ms) {
      reset();
      S.started = true;
      S.base = 0;
      S.perfBase = ms;
    }
    function reset() {
      resetState();
      notes.forEach(function (n) { n.hit = false; n.gone = false; n.el.hidden = true; n.el.classList.remove('is-hit', 'is-gone', 'is-next'); });
      keyEls.forEach(function (k) { k.classList.remove('is-next'); });
      Object.keys(cntEls).forEach(function (g) { cntEls[g].textContent = '0'; });
      progEl.style.width = '0%';
      waitTip.hidden = true;
    }

    var fieldH = 0, lastNextLane = -1, lastNs = 0;
    function tick(now) {
      if (!S.started || S.ended) return;
      var T = songT(now);
      // れんしゅう：つぎの 丸が 線に ついたら、たたくまで まつ
      var open = firstOpen();
      if (L.wait && !S.waiting && open && T >= open.t) {
        S.waiting = open;
        T = open.t;
        waitTip.hidden = false;
        waitTip.style.left = ((open.lane + 0.5) / lanes.length * 100) + '%';
      }
      // 伴奏：すこし 先まで よやく（れんしゅう で まっている 丸より 先は よやくしない）
      var limit = T + 150;
      if (L.wait && open) limit = Math.min(limit, open.t - 0.001);
      while (S.bi < backs.length && backs[S.bi].t <= limit) {
        var bk = backs[S.bi++];
        if (bk.t < T - 80) continue;
        global.Oto.backing(bk.root, bk.strong, S.perfBase + (bk.t - S.base), spb);
      }

      fieldH = field.clientHeight;
      var lineY = fieldH - LINE;
      // 丸の 大きさ：レーンの はばと、丸どうしの あいだに あわせる（かさならないように）
      var base = Math.min(lanes.length >= 8 ? 96 : 120, laneEls[0].clientWidth * 0.9);
      var ns = Math.round(Math.max(56, Math.min(base, minGap / fall * lineY * 0.92)));   // 小さく しすぎない（56px まで）
      if (ns !== lastNs) { box.style.setProperty('--ns', ns + 'px'); lastNs = ns; }
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        if (n.hit) continue;
        var dt = n.t - T;
        if (dt > fall) { n.el.hidden = true; if (dt > fall * 3) break; continue; }
        if (!n.gone && !L.wait && T - n.t > L.win[2]) { n.gone = true; n.el.classList.add('is-gone'); }
        var y = lineY - dt / fall * lineY;
        if (y > fieldH + 80) { n.el.hidden = true; continue; }
        n.el.hidden = false;
        n.el.style.transform = 'translate(-50%, -50%) translateY(' + y.toFixed(1) + 'px)';
      }
      // つぎに たたく けんばんを 目立たせる
      open = firstOpen();
      var nl = open && open.t - T <= fall ? open.lane : -1;
      if (nl !== lastNextLane) {
        keyEls.forEach(function (k, j) { k.classList.toggle('is-next', j === nl); });
        lastNextLane = nl;
      }
      notes.forEach(function (n) { n.el.classList.toggle('is-next', n === open); });
      progEl.style.width = Math.max(0, Math.min(100, T / endT * 100)).toFixed(1) + '%';

      if (!open && T >= Math.min(endT, (notes.length ? notes[notes.length - 1].t : 0) + 1200) && T >= o.song.beats * spb) {
        S.ended = true;
        keyEls.forEach(function (k) { k.classList.remove('is-next'); });
        if (o.onEnd) o.onEnd({ pit: S.cnt.pit, ii: S.cnt.ii, os: S.cnt.os, total: notes.length });
      }
    }

    return {
      start: start,
      tick: tick,
      reset: reset,
      levelName: L.name,
      bpm: Math.round(L.bpm * (o.tempo || 100) / 100),
      count: notes.length
    };
  }

  global.OtoGame = { create: create, LEVELS: LEVELS };
})(window);
