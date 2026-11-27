// ぴよぴよ ラン
// ひよこが 右へ はしる。タップで ジャンプして、しょうがいぶつを とびこえ、おうちを めざす。
// 絵も 音も ぜんぶ このファイルの中で 作る（画像・音の ファイルは つかわない）。
(function () {
  'use strict';

  // ---------- 大きさ・はやさ（画面の 高さを 600 として かく） ----------
  var VH = 600;
  var GROUND = 470;          // じめんの 高さ
  var RUN = 300;             // はしる はやさ（1びょうに すすむ はば。ステージ1・ふつう）
  var GRAV = 2200;
  var JUMP_V = 865;          // ジャンプの いきおい（足の たかさ 約170）
  var AIR_JUMP_V = 780;      // はねの 2かいめ ジャンプ
  var AIR_TIME = 2 * JUMP_V / GRAV;   // ジャンプして ついちするまでの 時間（約0.79びょう）
  var STAGE_TIME = 55;       // 1ステージの 時間（ふつうで 約55びょう）
  var FEATHER_TIME = 10;
  var STAR_TIME = 8;
  var STAGE_MAX = 5;
  var LIFE_MAX = 3;          // むずかしい の ハート
  var STEP = 1 / 120;        // うごきの 計算は 1/120びょう ずつ

  // ひくい 石・池（はばは ステージで かわる）・たかい 切り株
  var KINDS = {
    stone:  { w: 48, h: 30, inset: 7 },
    stump:  { w: 54, h: 56, inset: 6 },
    puddle: { w: 64, h: 4, inset: 14 }
  };

  // ステージが すすむほど：はやさ 約10％アップ・しょうがいぶつが ふえて 間かくが せまく・
  // 種類が ふえる（1 石だけ → 2 池 → 3 切り株 → 4 2つ つづけて → 5 ぜんぶ）・池が ひろく・はね と ほしが へる
  var STAGES = [
    { name: 'のはら',       count: 12, kinds: { stone: 1 },                        pairs: 0,    puddleW: 0,  feather: 2, star: 2 },
    { name: 'おはなばたけ', count: 16, kinds: { stone: 1, puddle: 1 },             pairs: 0,    puddleW: 64, feather: 2, star: 1 },
    { name: 'もりの みち',  count: 20, kinds: { stone: 1, puddle: 1, stump: 1.2 }, pairs: 0,    puddleW: 74, feather: 1, star: 1 },
    { name: 'かわべ',       count: 25, kinds: { stone: 1, puddle: 1, stump: 1 },   pairs: 0.25, puddleW: 84, feather: 1, star: 1 },
    { name: 'ゆうやけ',     count: 30, kinds: { stone: 1, puddle: 1, stump: 1.2 }, pairs: 0.4,  puddleW: 94, feather: 1, star: 0 }
  ];

  // むずかしさ（どれでも ステージが すすむほど むずかしく なる しくみは 同じ）
  //   ts：時間の すすみかた（やさしい は ぜんぶ ゆっくり）・speed：はしる はやさ・count：しょうがいぶつの かず
  var DIFFS = {
    easy:   { label: 'やさしい',   ts: 0.75, speed: 1,   count: 0.75, life: false },
    normal: { label: 'ふつう',     ts: 1,    speed: 1,   count: 1,    life: false },
    hard:   { label: 'むずかしい', ts: 1,    speed: 1.1, count: 1.2,  life: true }
  };

  // こえで あそぶ：ジャンプしたあと、つぎの 声に 反応しない 時間（ミリびょう。せっていで かえられる）
  var KOE_COOLS = [300, 400, 600, 800, 1000];

  // ステージごとの 色（目に やさしい おちついた色）
  var THEMES = [
    { sky: ['#dcebf0', '#f5f0e3'], sun: '#f8e3a3', far: '#cddfc6', near: '#b6d0ad', grass: '#9fc28f', grassDark: '#86ad78', dirt: '#e6d6b8', dirtDot: '#d8c49f', deco: 'bush' },
    { sky: ['#e3ebf0', '#f7efe4'], sun: '#f8e3a3', far: '#d6e2c8', near: '#bdd5ad', grass: '#a6c690', grassDark: '#8db37a', dirt: '#e8d8ba', dirtDot: '#dac6a2', deco: 'flower' },
    { sky: ['#d9e8e0', '#f1efe1'], sun: '#f4e6b0', far: '#bcd3bd', near: '#9fc0a0', grass: '#93b985', grassDark: '#7aa16d', dirt: '#e0cfae', dirtDot: '#cfba93', deco: 'tree' },
    { sky: ['#d7e7f1', '#eef1ea'], sun: '#f8e3a3', far: '#c8dccb', near: '#b2cfb0', grass: '#9cc08d', grassDark: '#84a977', dirt: '#e4d5b7', dirtDot: '#d5c19c', deco: 'river' },
    { sky: ['#f0d9c6', '#f6ebd8'], sun: '#f2c48d', far: '#d9cdb5', near: '#c3c39c', grass: '#a9bd86', grassDark: '#90a571', dirt: '#e6d2b2', dirtDot: '#d6be98', deco: 'tree' }
  ];

  var INK = '#3d3a35';
  var FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif';

  // ---------- きろく（この iPad の中だけに ほぞん） ----------
  var STORE_KEY = 'piyorun-v1';
  var canSave = true;
  // bgmYubi / bgmKoe：きょく（BGM）を ならすか。こえで あそぶ ときは、マイクが きょくを ひろわないように はじめは なし
  // seVol / bgmVol：こうかおん・きょくの おおきさ（1〜4）
  var rec = { cleared: {}, best: {}, openAll: false, diff: 'normal', sound: true, input: 'yubi', koeCool: 400,
              bgmYubi: true, bgmKoe: false, seVol: 3, bgmVol: 2 };

  (function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canSave = false; }
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      for (var i = 1; i <= STAGE_MAX; i++) {
        if (d.cleared && d.cleared[i]) rec.cleared[i] = true;
        var b = d.best && Number(d.best[i]);
        if (b >= 0 && b < 10000) rec.best[i] = Math.floor(b);
      }
      rec.openAll = !!d.openAll;
      // まえの 版の「ゆっくり」は「やさしい」に する
      rec.diff = DIFFS[d.diff] ? d.diff : (d.speed === 'slow' ? 'easy' : 'normal');
      rec.sound = d.sound !== false;
      rec.input = d.input === 'koe' ? 'koe' : 'yubi';
      rec.koeCool = KOE_COOLS.indexOf(Number(d.koeCool)) >= 0 ? Number(d.koeCool) : 400;
      rec.bgmYubi = d.bgmYubi !== false;
      rec.bgmKoe = d.bgmKoe === true;
      rec.seVol = d.seVol >= 1 && d.seVol <= 4 ? Math.round(d.seVol) : 3;
      rec.bgmVol = d.bgmVol >= 1 && d.bgmVol <= 4 ? Math.round(d.bgmVol) : 2;
    } catch (e) {}
  })();

  function save() {
    if (!canSave) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(rec)); } catch (e) { canSave = false; }
  }

  function isOpen(n) { return n === 1 || rec.openAll || !!rec.cleared[n - 1]; }

  // ---------- 音（音の ファイルは つかわず、その場で 作る。音量は ひかえめ） ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var actx = null;
  var master = null;    // こうかおん
  var bgmBus = null;    // きょく（BGM）
  var SE_LEVELS = [0.22, 0.38, 0.55, 0.75];
  var BGM_LEVELS = [0.18, 0.32, 0.48, 0.66];

  function audio() {
    if (!AC) return null;
    try {
      if (!actx) {
        actx = new AC();
        master = actx.createGain();
        master.gain.value = SE_LEVELS[rec.seVol - 1];
        master.connect(actx.destination);
        bgmBus = actx.createGain();
        bgmBus.gain.value = BGM_LEVELS[rec.bgmVol - 1];
        bgmBus.connect(actx.destination);
      }
      if (actx.state !== 'running' && actx.resume) actx.resume();
    } catch (e) { return null; }
    return actx;
  }

  // iPad では、タップした ときに 音の じゅんびを しておかないと、あとで 鳴らせない
  function unlockAudio() {
    var c = audio();
    if (!c) return;
    try {
      var src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch (e) {}
  }

  // 音を 1つ（f0 から f1 へ なめらかに 高さを かえる）
  function tone(at, type, f0, f1, dur, vol) {
    var c = actx;
    var t = c.currentTime + 0.01 + at;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ignoreMs：こえで あそぶ ときに、この 音を マイクが ひろって ジャンプ しないように する 時間
  function sound(fn, ignoreMs) {
    if (!rec.sound || !audio()) return;
    if (ignoreMs && koe && koe.isRunning()) koe.ignoreFor(ignoreMs);
    try { fn(); } catch (e) {}
  }

  function sJump() { sound(function () { tone(0, 'sine', 520, 880, 0.16, 0.09); }, 200); }
  function sAirJump() { sound(function () { tone(0, 'sine', 700, 1180, 0.16, 0.08); }, 200); }
  var lastAcornSnd = 0;
  function sAcorn() {
    var now = performance.now();
    if (now - lastAcornSnd < 45) return;
    lastAcornSnd = now;
    // こえで あそぶ ときは、マイクが ひろわないように もっと 小さく
    var v = rec.input === 'koe' ? 0.6 : 1;
    sound(function () {
      tone(0, 'sine', 1568, 1568, 0.16, 0.055 * v);
      tone(0.05, 'sine', 2093, 2093, 0.18, 0.04 * v);
    });
  }
  function sPower() {
    sound(function () {
      [784, 988, 1175, 1568].forEach(function (f, i) { tone(i * 0.07, 'triangle', f, f, 0.22, 0.06); });
    }, 450);
  }
  // ぶつかった とき：こわくない「ぽよん」
  function sBump() {
    sound(function () {
      tone(0, 'sine', 330, 250, 0.18, 0.08);
      tone(0.14, 'sine', 300, 380, 0.18, 0.06);
    }, 400);
  }
  function sGoal() {
    if (bgmOn() && audio()) { fanfare(); return; }   // きょくが あるときは ファンファーレ
    sound(function () {
      [[0, 523], [0.18, 659], [0.36, 784], [0.6, 1047]].forEach(function (n) {
        tone(n[0], 'sine', n[1], n[1], 1.1, 0.1);
        tone(n[0], 'sine', n[1] * 2, n[1] * 2, 0.5, 0.015);
      });
    }, 1500);
  }
  // おしまい：ゆっくり さがる やさしい 音
  function sOver() {
    sound(function () {
      [[0, 659], [0.25, 587], [0.5, 523]].forEach(function (n) { tone(n[0], 'sine', n[1], n[1], 0.7, 0.08); });
    }, 1200);
  }


  // ---------- きょく（BGM）：ぜんぶ この プログラムで 作曲・演奏する（音の ファイルは つかわない） ----------
  // メロディーは「ド=c レ=d ミ=e ファ=f ソ=g ラ=a シ=b」（大文字は 1オクターブ うえ）、「-」は のばす、「.」は やすみ。
  // 1小節は 8分音符 8こ。調は key（MIDI の ばんごう）で きめる。コードは その調の 何ばんめの 音から（0=ド）。
  // bass：r=根音 f=5度 o=1オクターブうえ  chord：p=のばす和音 s=みじかい和音  drum：k=バスドラ h=ハイハット s=シェイカー x=k+h
  var SONGS = [
    { // 1：あかるく のんびりした もりの きょく
      bpm: 92, key: 65, stac: false,
      chords: [0, 5, 3, 4, 0, 3, 4, 0],
      mel: ['g---e-c-', 'a---g---', 'f-a-g-f-', 'e---d---', 'g---e-c-', 'a-g-a-C-', 'b-a-g-d-', 'c-------'],
      bass: 'r...f...', chord: 'p.......', drum: '..s...s.', arp: false
    },
    { // 2：はずむような そうげんの きょく
      bpm: 104, key: 67, stac: true,
      chords: [0, 3, 0, 4, 0, 3, 4, 0],
      mel: ['c.e.g.e.', 'f.a.C.a.', 'g.e.c.e.', 'd.f.a.g.', 'c.e.g.C.', 'a.g.f.a.', 'g.f.e.d.', 'c.g.c...'],
      bass: 'r.f.r.f.', chord: '.s.s.s.s', drum: 'k.h.k.h.', arp: false
    },
    { // 3：すこし げんきな かわべの きょく
      bpm: 112, key: 62, stac: false,
      chords: [0, 4, 5, 3, 0, 4, 3, 4],
      mel: ['e-d-e-g-', 'd---b-g-', 'a-g-a-C-', 'a---f---', 'e-d-e-g-', 'D-C-b-g-', 'a-C-a-f-', 'g-----..'],
      bass: 'r.f.o.f.', chord: 'p.......', drum: 'k.s.k.s.', arp: true
    },
    { // 4：わくわくする ゆうがたの きょく
      bpm: 120, key: 60, stac: false,
      chords: [5, 3, 0, 4, 5, 3, 0, 4],
      mel: ['a.C-a.e-', 'f.a-C.a-', 'g.e-C.g-', 'g.b-D.b-', 'a.C-E.C-', 'f.a-C.D-', 'E-D-C-g-', 'b-D-g-..'],
      bass: 'r..r..r.', chord: '.s..s.s.', drum: 'k.hsk.hs', arp: false
    },
    { // 5：もりあがる ゴールまえの きょく
      bpm: 132, key: 63, stac: false,
      chords: [0, 4, 5, 3, 0, 4, 3, 4],
      mel: ['C-g-e-g-', 'b-g-D-b-', 'C-a-E-C-', 'C-a-f-a-', 'E-D-C-g-', 'D-b-g-b-', 'C-D-E-F-', 'G-------'],
      bass: 'rorororo', chord: 's.s.s.s.', drum: 'xhshxhsh', arp: false
    }
  ];
  var SCALE = [0, 2, 4, 5, 7, 9, 11];
  var NOTE_IDX = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

  function degMidi(key, d) { return key + 12 * Math.floor(d / 7) + SCALE[((d % 7) + 7) % 7]; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var noiseBuf = null;
  function getNoise() {
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // ひとつの 音（きょく用）
  function note(out, t, freq, dur, vol, type, attack) {
    var osc = actx.createOscillator();
    var g = actx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    var a = attack || 0.012;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.12);
  }
  function drum(out, t, kind, vol) {
    if (kind === 'k') {
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
      g.gain.setValueAtTime(vol * 0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.2);
      return;
    }
    var src = actx.createBufferSource();
    src.buffer = getNoise();
    var f = actx.createBiquadFilter();
    f.type = kind === 'h' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'h' ? 7000 : 3200;
    var g2 = actx.createGain();
    var len = kind === 'h' ? 0.04 : 0.07;
    g2.gain.setValueAtTime(vol * (kind === 'h' ? 0.35 : 0.3), t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f); f.connect(g2); g2.connect(out);
    src.start(t, Math.random() * 0.3);
    src.stop(t + len + 0.02);
  }

  var bgm = { timer: 0, out: null, song: null, step: 0, nextT: 0, n: 0 };

  function bgmOn() { return rec.input === 'koe' ? rec.bgmKoe : rec.bgmYubi; }

  function bgmStart(n, fromStep) {
    bgmStop();
    if (!bgmOn() || !audio()) return;
    bgm.n = n;
    bgm.song = SONGS[n - 1];
    bgm.step = fromStep || 0;
    bgm.out = actx.createGain();
    bgm.out.gain.setValueAtTime(0.0001, actx.currentTime);
    bgm.out.gain.linearRampToValueAtTime(1, actx.currentTime + 0.3);
    bgm.out.connect(bgmBus);
    bgm.nextT = actx.currentTime + 0.08;
    bgm.timer = setInterval(bgmTick, 40);
    bgmTick();
  }

  // とめる（いちじていし の ときは、つづきの 場所を おぼえておく）
  function bgmStop() {
    clearInterval(bgm.timer);
    bgm.timer = 0;
    if (bgm.out && actx) {
      var out = bgm.out;
      try {
        out.gain.cancelScheduledValues(actx.currentTime);
        out.gain.setValueAtTime(out.gain.value, actx.currentTime);
        out.gain.linearRampToValueAtTime(0.0001, actx.currentTime + 0.15);
      } catch (e) {}
      setTimeout(function () { try { out.disconnect(); } catch (e) {} }, 500);
    }
    bgm.out = null;
  }

  function bgmTick() {
    if (!bgm.out) return;
    var stepDur = 60 / bgm.song.bpm / 2;
    if (bgm.nextT < actx.currentTime - 0.2) bgm.nextT = actx.currentTime + 0.05;   // おくれたら まにあわせる
    while (bgm.nextT < actx.currentTime + 0.25) {
      try { playStep(bgm.song, bgm.step, bgm.nextT, stepDur); } catch (e) {}
      bgm.step++;
      bgm.nextT += stepDur;
    }
  }

  function playStep(song, step, t, sd) {
    var out = bgm.out;
    var bar = Math.floor(step / 8) % song.mel.length;
    var pos = step % 8;
    var root = song.chords[bar];
    var key = song.key;
    // メロディー
    var line = song.mel[bar];
    var ch = line.charAt(pos);
    if (ch !== '-' && ch !== '.') {
      var d = NOTE_IDX[ch.toLowerCase()] + (ch === ch.toUpperCase() ? 7 : 0);
      var len = 1;
      var k = pos + 1, b2 = bar;
      // のばしの「-」は つぎの 小節にも つづく
      while (true) {
        if (k >= 8) { k = 0; b2 = (b2 + 1) % song.mel.length; }
        if (song.mel[b2].charAt(k) !== '-') break;
        len++; k++;
        if (len > 16) break;
      }
      var dur = len * sd * (song.stac && len === 1 ? 0.5 : 0.9);
      var f = mtof(degMidi(key, d));
      note(out, t, f, dur, 0.16, 'triangle', 0.015);
      note(out, t, f * 2, dur * 0.7, 0.025, 'sine', 0.01);
    }
    // ベース
    var bc = song.bass.charAt(pos);
    if (bc !== '.') {
      var bd = root + (bc === 'f' ? 4 : bc === 'o' ? 7 : 0);
      note(out, t, mtof(degMidi(key - 24, bd)), sd * 0.9, 0.2, 'triangle', 0.01);
    }
    // 和音
    var cc = song.chord.charAt(pos);
    if (cc !== '.') {
      [0, 2, 4].forEach(function (iv) {
        var fr = mtof(degMidi(key - 12, root + iv));
        if (cc === 'p') note(out, t, fr, sd * 7.5, 0.035, 'sine', 0.25);
        else note(out, t, fr, sd * 0.45, 0.045, 'triangle', 0.01);
      });
    }
    // かわの ながれ：和音を 8分音符で ころころ
    if (song.arp) {
      var ad = [0, 2, 4, 7, 4, 2, 0, 2][pos];
      note(out, t, mtof(degMidi(key, root + ad)), sd * 0.8, 0.04, 'sine', 0.01);
    }
    // リズム
    var dc = song.drum.charAt(pos);
    if (dc === 'x') { drum(out, t, 'k', 0.5); drum(out, t, 'h', 0.5); }
    else if (dc !== '.') drum(out, t, dc, 0.5);
    // ほしの パワーアップ中は にぎやかに（たかい キラキラの 音と ハイハット）
    if (S && S.star > 0 && mode === 'play') {
      var sp = [0, 2, 4, 7][pos % 4];
      var hf = mtof(degMidi(key + 12, root + sp));
      note(out, t, hf, sd * 0.4, 0.045, 'sine', 0.005);
      note(out, t + sd / 2, hf * 1.5, sd * 0.3, 0.025, 'sine', 0.005);
      drum(out, t + sd / 2, 'h', 0.45);
    }
  }

  // ゴールの ファンファーレ（みじかい）
  function fanfare() {
    var out = actx.createGain();
    out.connect(bgmBus);
    var t = actx.currentTime + 0.05;
    var key = 60;
    [[0, 4, 0.12], [0.13, 4, 0.12], [0.26, 4, 0.12], [0.4, 7, 0.55], [1.0, 5, 0.18], [1.2, 6, 0.18], [1.4, 7, 0.9]].forEach(function (n) {
      var f = mtof(degMidi(key, n[1]));
      note(out, t + n[0], f, n[2], 0.2, 'triangle', 0.01);
      note(out, t + n[0], f * 2, n[2], 0.04, 'sine', 0.01);
    });
    [[0.4, 0], [1.4, 0]].forEach(function (c) {
      [0, 2, 4].forEach(function (iv) { note(out, t + c[0], mtof(degMidi(key - 12, c[1] + iv)), 0.9, 0.06, 'sine', 0.02); });
    });
    drum(out, t + 0.4, 'k', 0.6);
    drum(out, t + 1.4, 'k', 0.6);
    if (koe && koe.isRunning()) koe.ignoreFor(2500);
    setTimeout(function () { try { out.disconnect(); } catch (e) {} }, 3500);
  }

  function setVolumes() {
    if (!actx) return;
    master.gain.setTargetAtTime(SE_LEVELS[rec.seVol - 1], actx.currentTime, 0.03);
    bgmBus.gain.setTargetAtTime(BGM_LEVELS[rec.bgmVol - 1], actx.currentTime, 0.03);
  }

  // 「いま！」の よみあげ（iPad の 中の 日本語の こえ。インターネットは いらない）
  function sayNow() {
    if (!rec.sound || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      if (koe && koe.isRunning()) koe.ignoreFor(300);   // よみあげの こえで ジャンプ しないように
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance('いま');
      u.lang = 'ja-JP';
      u.rate = 1.2;
      u.volume = SE_LEVELS[rec.seVol - 1] / SE_LEVELS[3];
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- べんりな もの ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- ステージを つくる（いつも 同じ ならび） ----------
  function pick(r, kinds) {
    var total = 0, k;
    for (k in kinds) total += kinds[k];
    var x = r() * total;
    for (k in kinds) { x -= kinds[k]; if (x < 0) return k; }
    return 'stone';
  }

  function buildStage(n, diffKey) {
    var def = STAGES[n - 1];
    var diff = DIFFS[diffKey] || DIFFS.normal;
    var r = rng(n * 1013 + 7);
    var v = RUN * Math.pow(1.1, n - 1) * diff.speed;    // ステージごとに 約10％ はやく
    var len = Math.round(200 + v * STAGE_TIME);
    var count = Math.max(6, Math.round(def.count * diff.count));
    var obs = [];
    var items = [];
    var i, j;

    function makeOb(kind) {
      var k = KINDS[kind];
      return { kind: kind, x: 0, w: kind === 'puddle' ? def.puddleW : k.w, h: k.h, miss: 0, cue: false, sparkled: false };
    }

    // しょうがいぶつの まとまり（1つ、または ステージ4から 2つ つづけて）
    var groups = [];
    var left = count;
    var prevKind = '';
    while (left > 0) {
      var size = left >= 2 && r() < def.pairs ? 2 : 1;
      var g = [];
      for (j = 0; j < size; j++) {
        var kind = pick(r, def.kinds);
        if (kind === prevKind && r() < 0.5) kind = pick(r, def.kinds);
        prevKind = kind;
        g.push(makeOb(kind));
      }
      groups.push(g);
      left -= size;
    }
    // 2つ目は、1つ目を とんで ついちしてから すこし 走った ところ
    var PAIR_GAP = v * (AIR_TIME + 0.45);
    function groupW(g) { return g.length === 1 ? g[0].w : g[0].w / 2 + PAIR_GAP + g[1].w / 2; }
    var first = 200 + v * 3;
    var last = len - v * 2.5;
    var used = 0;
    groups.forEach(function (g) { used += groupW(g); });
    var gap = (last - first - used) / Math.max(1, groups.length - 1);
    var x = first;
    groups.forEach(function (g) {
      var gx = x + (r() - 0.5) * gap * 0.3;
      g[0].x = gx;
      obs.push(g[0]);
      if (g.length === 2) {
        g[1].x = gx + g[0].w / 2 + PAIR_GAP - g[1].w / 2;
        obs.push(g[1]);
      }
      x += groupW(g) + gap;
    });

    function add(kind, x, y) { items.push({ kind: kind, x: x, y: y, got: false, ph: r() * 6.28 }); }

    // はね・ほしを おく すきま（ステージが すすむほど すくない）
    var gapCount = obs.length + 1;
    var powerAt = {};
    var types = [];
    for (i = 0; i < Math.max(def.feather, def.star); i++) {
      if (i < def.feather) types.push('feather');
      if (i < def.star) types.push('star');
    }
    types.forEach(function (t, k) {
      var gi = Math.max(1, Math.round((k + 0.5) / types.length * (gapCount - 2)));
      while (powerAt[gi]) gi++;
      powerAt[gi] = t;
    });

    // しょうがいぶつの あいだに どんぐり・はね・ほし
    var gaps = [];
    for (i = 0; i <= obs.length; i++) {
      var a = i === 0 ? 320 : obs[i - 1].x + obs[i - 1].w + 50;
      var b = i < obs.length ? obs[i].x - 70 : len - 260;
      gaps.push({ a: a, b: b });
      var L = b - a;
      if (L < 140) continue;
      var power = powerAt[i] || '';
      if (power) add(power, a + L * 0.25, GROUND - 42);
      var m = power ? 3 : 3 + Math.floor(r() * 3);
      var sx = a + L * (power ? 0.55 : 0.3 + r() * 0.15);
      for (j = 0; j < m && sx + j * 44 < b; j++) add('acorn', sx + j * 44, GROUND - 24);
    }

    // しょうがいぶつの 上に、ジャンプの 形に どんぐり（とびこえると とれる）
    var dxArc = 62 * v / RUN;
    obs.forEach(function (o) {
      if (r() < 0.45) return;
      var c = o.x + o.w / 2;
      add('acorn', c - dxArc, GROUND - 150);
      add('acorn', c, GROUND - 182);
      add('acorn', c + dxArc, GROUND - 150);
    });

    // はねが つづいている 間だけ、2だん ジャンプで とどく たかい どんぐり
    // （ふつうの ジャンプで とどくのは 地面から 約230 まで。これは 290〜305 なので はねが ないと とどかない）
    items.filter(function (it) { return it.kind === 'feather'; }).forEach(function (f) {
      var from = f.x + v * 1.2;
      var to = f.x + v * (FEATHER_TIME - 1.5);
      var placed = 0;
      gaps.forEach(function (gp) {
        var mid = (gp.a + gp.b) / 2;
        if (placed >= 4 || mid < from || mid > to || gp.b - gp.a < 200) return;
        var d = 50 * v / RUN;
        add('acorn', mid - d, GROUND - 290);
        add('acorn', mid, GROUND - 305);
        add('acorn', mid + d, GROUND - 290);
        placed++;
      });
    });

    // たかい ところに どんぐりが ある ときは、その 下の 地面には おかない（とぶか まよわないように）
    var high = items.filter(function (it) { return it.kind === 'acorn' && it.y < GROUND - 100; });
    items = items.filter(function (it) {
      if (it.kind !== 'acorn' || it.y < GROUND - 100) return true;
      for (var q = 0; q < high.length; q++) if (Math.abs(high[q].x - it.x) < 56) return false;
      return true;
    });

    items.sort(function (p, q) { return p.x - q.x; });
    return { n: n, def: def, theme: THEMES[n - 1], obs: obs, items: items, len: len, v: v, ts: diff.ts, life: diff.life };
  }

  // ---------- がめん ----------
  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var cssW = 0, cssH = 0, dpr = 1, scale = 1, viewW = 1000;
  var skyGrad = null, skyTheme = -1;

  function resize() {
    cssW = Math.max(1, window.innerWidth);
    cssH = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    scale = cssH / VH;
    viewW = cssW / scale;
    skyTheme = -1;
    trackW = progTrack.offsetWidth || trackW;
    if (!running) draw(0);
  }

  // ---------- ゲームの ようす ----------
  var S = null;        // あそんでいる ステージ
  var mode = 'select'; // select / play / goal
  var paused = false;
  var demo = { x: 0, px: 0, phase: 0, theme: 0 };
  var parts = [];      // こまかい つぶ（すな・キラキラ など）

  function newRun(n) {
    var st = buildStage(n, rec.diff);
    S = {
      st: st, n: n,
      x: 200, px: 200, y: GROUND, py: GROUND, vy: 0,
      onGround: true, coyote: 0, buf: 0, airJumps: 0,
      feather: 0, star: 0, blink: 0,
      acorns: 0, oi: 0, ii: 0,
      phase: 0, squash: 0,
      hit: null, goal: null, over: false,
      wait: 0,                       // もどったあと、はしりだすまでの 時間
      streakIdx: -1, streak: 0,      // おなじ しょうがいぶつに つづけて ぶつかった かず
      cueT: 0, cueDone: false,       // 「いま！」の 表示
      life: st.life ? LIFE_MAX : 0,
      t: 0, jumped: false
    };
    parts = [];
  }


  function doJump(air) {
    S.vy = -(air ? AIR_JUMP_V : JUMP_V);
    S.onGround = false;
    S.coyote = 0;
    S.buf = 0;
    S.squash = 0.12;
    if (air) {
      S.airJumps--;
      sAirJump();
      for (var i = 0; i < 6; i++) addPart('feather', S.x - 4, S.y - 14, (Math.random() - 0.5) * 120, 40 + Math.random() * 60, 0.6);
    } else {
      sJump();
      for (var k = 0; k < 4; k++) addPart('dust', S.x - 8, GROUND - 2, -40 - Math.random() * 80, -30 - Math.random() * 40, 0.4);
    }
    if (!S.jumped) { S.jumped = true; hideTapHint(); }
    S.cueT = 0;
  }

  function tap() {
    if (mode !== 'play' || paused || !S || S.hit || S.goal || S.wait > 0) return;
    if (S.onGround || S.coyote > 0) doJump(false);
    else if (S.feather > 0 && S.airJumps > 0) doJump(true);
    else S.buf = 0.14;   // すこし はやく おしても、ついたら すぐ とぶ
  }

  function addPart(type, x, y, vx, vy, life, color) {
    if (parts.length > 160) parts.shift();
    parts.push({ type: type, x: x, y: y, vx: vx, vy: vy, life: life, max: life, color: color || '', rot: Math.random() * 6.28 });
  }

  // ---------- うごきの 計算 ----------
  function stepDemo(dt) {
    demo.px = demo.x;
    demo.x += RUN * 0.55 * dt;
    demo.phase += dt * 9;
  }

  function stepPlay(dt, realDt) {
    var st = S.st;
    S.px = S.x;
    S.py = S.y;
    updateParts(dt);

    if (S.goal) { stepGoal(realDt); return; }
    if (S.hit) { stepHit(realDt); return; }

    // てんめつ（ぶつかっても へいき）は ほんとうの 時間で 2びょう
    if (S.blink > 0) S.blink -= realDt;
    if (S.cueT > 0) S.cueT -= realDt;
    // もどった あとは 0.5びょう とまってから はしりだす（こころの じゅんび）
    if (S.wait > 0) {
      S.wait -= realDt;
      S.phase += realDt * 3;
      return;
    }

    S.t += dt;
    if (S.feather > 0) S.feather = Math.max(0, S.feather - dt);
    if (S.star > 0) S.star = Math.max(0, S.star - dt);
    if (S.buf > 0) S.buf -= dt;
    if (S.squash > 0) S.squash -= dt;
    if (S.coyote > 0) S.coyote -= dt;

    S.x += st.v * dt;
    S.phase += dt * 16;

    // おなじ しょうがいぶつに 3かい つづけて ぶつかったら、その てまえで「いま！」と おしえる（やさしい・ふつう）
    var next = st.obs[S.oi];
    if (next && next.cue && !S.cueDone && S.onGround &&
        S.x >= next.x + next.w / 2 - st.v * (AIR_TIME / 2 + 0.35)) {   // はんのうの 時間ぶん すこし はやめに
      S.cueDone = true;
      S.cueT = 1.0;
      sayNow();
    }

    if (S.buf > 0 && (S.onGround || S.coyote > 0)) doJump(false);

    var wasGround = S.onGround;
    S.vy += GRAV * dt;
    S.y += S.vy * dt;
    if (S.y >= GROUND) {
      S.y = GROUND;
      S.vy = 0;
      S.onGround = true;
      S.airJumps = 1;
      if (!wasGround) {
        S.squash = 0.1;
        for (var k = 0; k < 3; k++) addPart('dust', S.x + (Math.random() - 0.5) * 20, GROUND - 2, (Math.random() - 0.5) * 90, -20 - Math.random() * 30, 0.35);
      }
    } else {
      if (wasGround) S.coyote = 0.09;   // ふちから おちても すこしの あいだは とべる
      S.onGround = false;
    }

    // ひよこの あたり はんい（すこし 小さめで やさしく）
    var L = S.x - 14, R = S.x + 14, T = S.y - 38, B = S.y - 3;

    // しょうがいぶつ
    while (S.oi < st.obs.length && st.obs[S.oi].x + st.obs[S.oi].w < L - 10) {
      // ぶつからずに こえられた
      var passed = st.obs[S.oi];
      if (S.streakIdx === S.oi) { S.streakIdx = -1; S.streak = 0; }
      passed.cue = false;
      S.oi++;
      S.cueDone = false;
    }
    for (var i = S.oi; i < st.obs.length; i++) {
      var o = st.obs[i];
      if (o.x > R + 10) break;
      var kd = KINDS[o.kind];
      if (R > o.x + kd.inset && L < o.x + o.w - kd.inset && B > GROUND - o.h + (o.kind === 'puddle' ? 0 : kd.inset)) {
        if (S.star > 0 || S.blink > 0) {
          if (S.star > 0 && !o.sparkled) {
            o.sparkled = true;
            for (var q = 0; q < 8; q++) addPart('spark', o.x + o.w / 2, GROUND - o.h / 2 - 6, (Math.random() - 0.5) * 260, -60 - Math.random() * 160, 0.6, '#f3cf63');
          }
        } else {
          startHit(i);
          return;
        }
      }
    }

    // アイテム
    var cx = S.x, cy = S.y - 22;
    while (S.ii < st.items.length && st.items[S.ii].x < S.x - 80) S.ii++;
    for (var j = S.ii; j < st.items.length; j++) {
      var it = st.items[j];
      if (it.x > S.x + 80) break;
      if (it.got) continue;
      var dx = it.x - cx, dy = it.y - cy;
      var rr = it.kind === 'acorn' ? 38 : 44;
      if (dx * dx + dy * dy < rr * rr) collect(it);
    }

    if (S.x >= st.len) startGoal();
  }

  function collect(it) {
    it.got = true;
    if (it.kind === 'acorn') {
      S.acorns++;
      acornNum.textContent = S.acorns;
      acornBox.classList.remove('is-pop');
      void acornBox.offsetWidth;
      acornBox.classList.add('is-pop');
      sAcorn();
      for (var i = 0; i < 5; i++) addPart('spark', it.x, it.y, (Math.random() - 0.5) * 160, -40 - Math.random() * 120, 0.45, '#e8c070');
    } else {
      if (it.kind === 'feather') S.feather = FEATHER_TIME;
      else S.star = STAR_TIME;
      sPower();
      for (var k = 0; k < 12; k++) {
        var a = k / 12 * Math.PI * 2;
        addPart('spark', it.x, it.y, Math.cos(a) * 180, Math.sin(a) * 180, 0.6, it.kind === 'star' ? '#f3cf63' : '#a9c7e0');
      }
    }
  }

  var BUMP_WORDS = ['おっとっと', 'よいしょ', 'だいじょうぶ'];

  function startHit(i) {
    var o = S.st.obs[i];
    o.miss++;
    if (S.streakIdx === i) S.streak++;
    else { S.streakIdx = i; S.streak = 1; }
    // 3かい つづけて ぶつかったら、つぎから「いま！」で おしえる（むずかしい では しない）
    if (S.streak >= 3 && !S.st.life) o.cue = true;
    S.cueT = 0;
    S.hit = { t: 0, i: i, moved: false, word: BUMP_WORDS[(S.streak - 1) % BUMP_WORDS.length] };
    // むずかしい：ハートが 1つ へる。3かい ぶつかると おしまい
    if (S.st.life) {
      S.life = Math.max(0, S.life - 1);
      renderHearts(true);
      if (S.life === 0) {
        S.over = true;
        bgmStop();
        S.hit.word = 'あいたた';
        S.feather = S.star = 0;
      }
    }
    S.vy = 0;
    sBump();
    for (var k = 0; k < 5; k++) addPart('heart', S.x, S.y - 50, (Math.random() - 0.5) * 140, -60 - Math.random() * 60, 0.8, '#f2b8c6');
  }

  // ぶつかったら：すこし まって、ふわっと すこし まえに もどり、すぐ はしりだす
  function stepHit(dt) {
    var h = S.hit;
    h.t += dt;
    if (S.y < GROUND) S.y = Math.min(GROUND, S.y + 260 * dt);
    if (S.over) {
      if (h.t >= 1.1 && !h.moved) { h.moved = true; showOver(); }
      return;
    }
    if (h.t >= 0.75 && !h.moved) {
      S.x = S.px = backPoint(h.i);
      S.y = S.py = GROUND;
      S.vy = 0;
      S.onGround = true;
      S.buf = 0;
      S.oi = 0;
      S.ii = 0;
      S.cueDone = false;
      parts = parts.filter(function (p) { return p.type === 'heart'; });
      h.moved = true;
    }
    if (h.t >= 1.0) {
      S.hit = null;
      S.blink = 2.0;   // 2びょう てんめつ。その あいだは ぶつかっても へいき
      S.wait = 0.5;    // 0.5びょう とまってから はしりだす
    }
  }

  // もどる ばしょ：ぶつかった しょうがいぶつの 1つ まえの しょうがいぶつより、さらに てまえ。
  // じょそう できる きょり（約1.3びょうぶん）を とる。その また まえの しょうがいぶつには かからない ように する
  function backPoint(i) {
    var obs = S.st.obs, v = S.st.v;
    var o = obs[i];
    if (i === 0) return Math.max(120, o.x - v * 2);
    var prev = obs[i - 1];
    var back = prev.x - v * 1.3;
    if (i >= 2) back = Math.max(back, obs[i - 2].x + obs[i - 2].w + 40);
    return Math.max(120, back);
  }

  function startGoal() {
    S.goal = { t: 0, shown: false };
    S.x = S.st.len;
    S.y = GROUND;
    S.vy = 0;
    S.feather = S.star = 0;
    bgmStop();
    sGoal();
    if (!rec.cleared[S.n]) rec.cleared[S.n] = true;
    if (!(rec.best[S.n] >= S.acorns)) rec.best[S.n] = S.acorns;
    save();
    // ランキング用の きろく（「きろくを おくる」で QRコードに する）
    S.kiroku = window.Kiroku ? Kiroku.makeRecord({ g: 'piyo', d: rec.diff, st: S.n, s: S.acorns }) : null;
  }

  function stepGoal(dt) {
    var g = S.goal;
    g.t += dt;
    if (Math.random() < dt * 14) {
      var colors = ['#f2b8c6', '#f3cf63', '#a8bfa6', '#9fc0d8'];
      addPart('petal', S.st.len - 260 + Math.random() * 520, -10, (Math.random() - 0.5) * 40, 60 + Math.random() * 40, 4, colors[Math.floor(Math.random() * 4)]);
    }
    if (g.t > 1.3 && !g.shown) {
      g.shown = true;
      showGoal();
    }
  }

  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 3;
      if (p.type === 'spark' || p.type === 'dust') p.vy += 500 * dt;
      if (p.type === 'heart') p.vy += 60 * dt;
      if (p.type === 'petal') p.vx = Math.sin(p.rot) * 40;
    }
  }

  // ---------- かく ----------
  function setSky(theme, ti) {
    if (skyTheme === ti && skyGrad) return;
    skyGrad = ctx.createLinearGradient(0, 0, 0, VH);
    skyGrad.addColorStop(0, theme.sky[0]);
    skyGrad.addColorStop(0.75, theme.sky[1]);
    skyTheme = ti;
  }

  function draw(alpha) {
    var playing = mode !== 'select' && S;
    var ti = playing ? S.n - 1 : demo.theme;
    var th = THEMES[ti];
    var meX, meY, camX, st = playing ? S.st : null;

    if (playing) {
      meX = S.px + (S.x - S.px) * alpha;
      meY = S.py + (S.y - S.py) * alpha;
      camX = Math.min(meX - viewW * 0.24, st.len - viewW * 0.6);
    } else {
      meX = demo.px + (demo.x - demo.px) * alpha;
      meY = GROUND;
      camX = meX - viewW * 0.16;
    }

    var k = dpr * scale;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    setSky(th, ti);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewW + 2, VH);

    drawSun(th, ti);
    drawClouds(camX);
    drawHills(camX * 0.18, th.far, 345, 34, 0.0042, 18, 0.011);
    if (th.deco === 'tree') drawTrees(camX * 0.4, th, ti);
    drawHills(camX * 0.4, th.near, 405, 20, 0.006, 12, 0.017);
    if (th.deco === 'bush') drawBushes(camX * 0.6);
    if (th.deco === 'river') drawRiver(camX * 0.65);
    drawGround(camX, th);

    if (playing) {
      drawHouse(st.len - camX, S.goal);
      drawObstacles(st, camX);
      drawItems(st, camX);
    }

    drawParts(camX, false);

    // ひよこ
    var cX = meX - camX;
    if (playing) {
      var vis = 1;
      if (S.goal) vis = clamp(1 - (S.goal.t - 0.15) / 0.4, 0, 1);
      var blinkOff = S.blink > 0 && Math.floor(S.blink * 10) % 2 === 1;
      if (vis > 0 && !blinkOff) {
        drawChick(cX, meY, {
          phase: S.phase, air: !S.onGround, vy: S.vy, squash: S.squash,
          star: S.star, feather: S.feather, hit: S.hit, alpha: vis, t: S.t
        });
      }
      if (S.hit) drawBubble(cX, meY - 78, S.hit.word, clamp(S.hit.t / 0.12, 0, 1));
      else if (S.cueT > 0) drawCue(cX, meY - 84, S.cueT);
    } else {
      drawChick(cX, meY, { phase: demo.phase, air: false, vy: 0, squash: 0, star: 0, feather: 0, hit: null, alpha: 1, t: demo.phase });
    }

    drawParts(camX, true);

    // もどる ときは ふわっと うすく
    if (playing && S.hit && !S.over) {
      var f = S.hit.t < 0.75 ? clamp((S.hit.t - 0.5) / 0.25, 0, 1) : clamp(1 - (S.hit.t - 0.75) / 0.25, 0, 1);
      if (f > 0) {
        ctx.fillStyle = 'rgba(243,239,230,' + (f * 0.85).toFixed(3) + ')';
        ctx.fillRect(0, 0, viewW + 2, VH);
      }
    }
  }

  function drawSun(th, ti) {
    var x = viewW * (ti === 4 ? 0.72 : 0.8);
    var y = ti === 4 ? 250 : 105;
    var r = ti === 4 ? 62 : 44;
    ctx.fillStyle = th.sun;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(x, y, r * 1.45, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  function drawClouds(camX) {
    var off = camX * 0.08;
    var span = 460;
    var i0 = Math.floor(off / span) - 1;
    var i1 = Math.floor((off + viewW) / span) + 1;
    ctx.fillStyle = 'rgba(255,253,247,0.9)';
    for (var i = i0; i <= i1; i++) {
      var x = i * span + hash(i) * 200 - off;
      var y = 70 + hash(i + 50) * 150;
      var s = 0.7 + hash(i + 90) * 0.6;
      ctx.beginPath();
      ctx.ellipse(x, y, 52 * s, 20 * s, 0, 0, 6.2832);
      ctx.ellipse(x - 26 * s, y + 4 * s, 30 * s, 16 * s, 0, 0, 6.2832);
      ctx.ellipse(x + 10 * s, y - 14 * s, 30 * s, 22 * s, 0, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawHills(off, color, base, a1, f1, a2, f2) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VH);
    for (var sx = 0; sx <= viewW + 24; sx += 24) {
      var wx = sx + off;
      ctx.lineTo(sx, base - a1 * Math.sin(wx * f1) - a2 * Math.sin(wx * f2 + 1.3));
    }
    ctx.lineTo(viewW + 24, VH);
    ctx.closePath();
    ctx.fill();
  }

  function drawTrees(off, th, ti) {
    var span = 190;
    var i0 = Math.floor((off - 100) / span);
    var i1 = Math.floor((off + viewW + 100) / span);
    for (var i = i0; i <= i1; i++) {
      if (hash(i + 7) < 0.25) continue;
      var x = i * span + hash(i) * 90 - off;
      var s = 0.75 + hash(i + 3) * 0.5;
      var baseY = 412;
      ctx.fillStyle = ti === 4 ? '#a89a7c' : '#a3876a';
      ctx.fillRect(x - 6 * s, baseY - 70 * s, 12 * s, 72 * s);
      ctx.fillStyle = ti === 4 ? '#b5b58e' : (hash(i + 11) < 0.5 ? '#8fb38c' : '#9cbd94');
      ctx.beginPath(); ctx.arc(x, baseY - 100 * s, 40 * s, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 28 * s, baseY - 74 * s, 28 * s, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 28 * s, baseY - 76 * s, 30 * s, 0, 6.2832); ctx.fill();
    }
  }

  function drawBushes(off) {
    var span = 260;
    var i0 = Math.floor((off - 80) / span);
    var i1 = Math.floor((off + viewW + 80) / span);
    ctx.fillStyle = '#a5c79a';
    for (var i = i0; i <= i1; i++) {
      if (hash(i + 21) < 0.35) continue;
      var x = i * span + hash(i + 2) * 120 - off;
      var s = 0.7 + hash(i + 5) * 0.5;
      ctx.beginPath();
      ctx.arc(x, 470 - 12 * s, 26 * s, Math.PI, 0);
      ctx.arc(x + 30 * s, 470 - 8 * s, 20 * s, Math.PI, 0);
      ctx.arc(x - 28 * s, 470 - 6 * s, 18 * s, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawRiver(off) {
    ctx.fillStyle = '#b9d6e6';
    ctx.fillRect(0, 432, viewW + 2, 40);
    ctx.strokeStyle = 'rgba(255,253,247,0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    var span = 90;
    var i0 = Math.floor(off / span) - 1;
    var i1 = Math.floor((off + viewW) / span) + 1;
    ctx.beginPath();
    for (var i = i0; i <= i1; i++) {
      var x = i * span + hash(i) * 50 - off;
      var y = 442 + hash(i + 4) * 22;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 16 + hash(i + 8) * 14, y);
    }
    ctx.stroke();
    // あし（くさ）
    ctx.strokeStyle = '#8fb07e';
    ctx.lineWidth = 3;
    span = 150;
    i0 = Math.floor(off / span) - 1;
    i1 = Math.floor((off + viewW) / span) + 1;
    ctx.beginPath();
    for (var j = i0; j <= i1; j++) {
      if (hash(j + 30) < 0.4) continue;
      var rx = j * span + hash(j + 31) * 80 - off;
      for (var q = 0; q < 3; q++) {
        ctx.moveTo(rx + q * 7, 470);
        ctx.quadraticCurveTo(rx + q * 7 - 4, 450, rx + q * 7 + (q - 1) * 6, 428 - hash(j + q) * 12);
      }
    }
    ctx.stroke();
  }

  function drawGround(camX, th) {
    ctx.fillStyle = th.dirt;
    ctx.fillRect(0, GROUND, viewW + 2, VH - GROUND);
    // つちの もよう
    ctx.fillStyle = th.dirtDot;
    var span = 70;
    var i0 = Math.floor(camX / span) - 1;
    var i1 = Math.floor((camX + viewW) / span) + 1;
    var i;
    for (i = i0; i <= i1; i++) {
      var x = i * span + hash(i) * 40 - camX;
      var y = GROUND + 34 + hash(i + 9) * 80;
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + hash(i + 3) * 8, 3.5, 0, 0, 6.2832);
      ctx.fill();
    }
    // くさの ふち
    ctx.fillStyle = th.grass;
    ctx.fillRect(0, GROUND - 2, viewW + 2, 14);
    span = 34;
    i0 = Math.floor(camX / span) - 1;
    i1 = Math.floor((camX + viewW) / span) + 1;
    ctx.beginPath();
    for (i = i0; i <= i1; i++) {
      var gx = i * span - camX;
      ctx.moveTo(gx + span, GROUND + 12);
      ctx.arc(gx + span / 2, GROUND + 12, span / 2, 0, Math.PI);
    }
    ctx.fill();
    // くさ
    ctx.strokeStyle = th.grassDark;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    span = 110;
    i0 = Math.floor(camX / span) - 1;
    i1 = Math.floor((camX + viewW) / span) + 1;
    ctx.beginPath();
    for (i = i0; i <= i1; i++) {
      if (hash(i + 40) < 0.3) continue;
      var tx = i * span + hash(i + 41) * 60 - camX;
      ctx.moveTo(tx - 6, GROUND - 1); ctx.lineTo(tx - 9, GROUND - 13);
      ctx.moveTo(tx, GROUND - 1); ctx.lineTo(tx, GROUND - 17);
      ctx.moveTo(tx + 6, GROUND - 1); ctx.lineTo(tx + 9, GROUND - 12);
    }
    ctx.stroke();
    // おはな
    if (th.deco === 'flower' || th.deco === 'bush') {
      span = th.deco === 'flower' ? 80 : 210;
      i0 = Math.floor(camX / span) - 1;
      i1 = Math.floor((camX + viewW) / span) + 1;
      var cols = ['#f2b8c6', '#f3cf63', '#fffdf7', '#d9b8e0'];
      for (i = i0; i <= i1; i++) {
        if (hash(i + 60) < 0.3) continue;
        var fx = i * span + hash(i + 61) * 50 - camX;
        var fy = GROUND - 12 - hash(i + 62) * 8;
        ctx.strokeStyle = th.grassDark;
        ctx.beginPath(); ctx.moveTo(fx, GROUND); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = cols[Math.floor(hash(i + 63) * 4)];
        for (var p = 0; p < 5; p++) {
          var a = p / 5 * 6.2832;
          ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 5, fy + Math.sin(a) * 5, 4, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = '#e0a24f';
        ctx.beginPath(); ctx.arc(fx, fy, 3, 0, 6.2832); ctx.fill();
      }
    }
  }

  function drawHouse(dx, goal) {
    if (dx < -200 || dx > viewW + 200) return;
    var x = dx - 80, w = 160, top = GROUND - 120;
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    // えんとつ
    ctx.fillStyle = '#c8a98a';
    ctx.fillRect(x + w - 46, top - 58, 22, 46);
    ctx.strokeRect(x + w - 46, top - 58, 22, 46);
    // かべ
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(x + 8, top, w - 16, 120);
    ctx.strokeRect(x + 8, top, w - 16, 120);
    // やね
    ctx.fillStyle = '#c8665a';
    ctx.beginPath();
    ctx.moveTo(x - 14, top + 6);
    ctx.lineTo(x + w / 2, top - 70);
    ctx.lineTo(x + w + 14, top + 6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // まどの あかり
    var lit = goal ? clamp((goal.t - 0.4) / 0.4, 0, 1) : 0;
    ctx.fillStyle = lit > 0 ? 'rgb(' + Math.round(246 + 9 * lit) + ',' + Math.round(231 + 4 * lit) + ',' + Math.round(200 - 60 * lit) + ')' : '#f6e7c8';
    ctx.beginPath(); ctx.arc(x + w - 36, top + 42, 17, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - 53, top + 42); ctx.lineTo(x + w - 19, top + 42);
    ctx.moveTo(x + w - 36, top + 25); ctx.lineTo(x + w - 36, top + 59);
    ctx.stroke();
    // まるい まど（やね）
    ctx.fillStyle = '#f6e7c8';
    ctx.beginPath(); ctx.arc(x + w / 2, top - 22, 11, 0, 6.2832); ctx.fill(); ctx.stroke();
    // ドア（ここが ゴール）
    ctx.fillStyle = '#b88a5e';
    ctx.beginPath();
    ctx.moveTo(dx - 24, GROUND);
    ctx.lineTo(dx - 24, GROUND - 52);
    ctx.arc(dx, GROUND - 52, 24, Math.PI, 0);
    ctx.lineTo(dx + 24, GROUND);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(dx + 13, GROUND - 38, 3.2, 0, 6.2832); ctx.fill();
    // はなの うえきばち
    ctx.fillStyle = '#d99a6c';
    ctx.beginPath();
    ctx.moveTo(x + 18, GROUND - 24); ctx.lineTo(x + 46, GROUND - 24); ctx.lineTo(x + 42, GROUND); ctx.lineTo(x + 22, GROUND);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2b8c6';
    ctx.beginPath(); ctx.arc(x + 26, GROUND - 32, 7, 0, 6.2832); ctx.arc(x + 38, GROUND - 34, 7, 0, 6.2832); ctx.fill();
    // ゴールの はた
    ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(x - 30, GROUND); ctx.lineTo(x - 30, GROUND - 100); ctx.stroke();
    ctx.fillStyle = '#f3cf63';
    ctx.beginPath(); ctx.moveTo(x - 30, GROUND - 100); ctx.lineTo(x + 6, GROUND - 88); ctx.lineTo(x - 30, GROUND - 76); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  function drawObstacles(st, camX) {
    var x0 = camX - 120, x1 = camX + viewW + 40;
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    for (var i = 0; i < st.obs.length; i++) {
      var o = st.obs[i];
      if (o.x > x1) break;
      if (o.x + o.w < x0) continue;
      var x = o.x - camX;
      if (o.kind === 'stone') drawStone(x, o.w, o.h);
      else if (o.kind === 'stump') drawStump(x, o.w, o.h);
      else drawPuddle(x, o.w);
    }
  }

  function drawStone(x, w, h) {
    ctx.fillStyle = '#bdb8ae';
    ctx.beginPath();
    ctx.moveTo(x + 2, GROUND);
    ctx.bezierCurveTo(x - 2, GROUND - h * 0.7, x + w * 0.2, GROUND - h, x + w * 0.52, GROUND - h);
    ctx.bezierCurveTo(x + w * 0.86, GROUND - h, x + w + 2, GROUND - h * 0.55, x + w - 1, GROUND);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#dcd8cf';
    ctx.beginPath(); ctx.ellipse(x + w * 0.36, GROUND - h * 0.68, 7, 4, -0.4, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#a7c39a';
    ctx.beginPath(); ctx.ellipse(x + w * 0.7, GROUND - 3, 8, 4, 0, Math.PI, 0); ctx.fill();
  }

  function drawStump(x, w, h) {
    var top = GROUND - h;
    ctx.fillStyle = '#c09366';
    ctx.beginPath();
    ctx.moveTo(x - 5, GROUND);
    ctx.quadraticCurveTo(x + 2, GROUND - 6, x + 2, top);
    ctx.lineTo(x + w - 2, top);
    ctx.quadraticCurveTo(x + w - 2, GROUND - 6, x + w + 5, GROUND);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a17650';
    ctx.beginPath();
    ctx.moveTo(x + 14, top + 12); ctx.lineTo(x + 14, GROUND - 6);
    ctx.moveTo(x + w - 16, top + 16); ctx.lineTo(x + w - 16, GROUND - 4);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#e8cf9e';
    ctx.beginPath(); ctx.ellipse(x + w / 2, top, w / 2 - 2, 8, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c09366';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x + w / 2, top, w / 4, 4, 0, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    // はっぱ
    ctx.fillStyle = '#9fc28f';
    ctx.beginPath(); ctx.ellipse(x + w - 4, top - 8, 9, 5, -0.6, 0, 6.2832); ctx.fill(); ctx.stroke();
  }

  // 池：こい 青。ふちに あかるい 線を 入れて 形を わかりやすく
  function drawPuddle(x, w) {
    var cx = x + w / 2;
    ctx.fillStyle = '#2f5f8f';
    ctx.beginPath(); ctx.ellipse(cx, GROUND + 4, w / 2, 10, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#a9d0ee';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, GROUND + 4, w / 2 - 1.5, 8.5, 0, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(214,234,248,0.9)';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.22, GROUND + 2); ctx.lineTo(x + w * 0.4, GROUND + 2);
    ctx.moveTo(x + w * 0.56, GROUND + 7); ctx.lineTo(x + w * 0.7, GROUND + 7);
    ctx.stroke();
    ctx.strokeStyle = INK;
  }

  function drawItems(st, camX) {
    var x0 = camX - 40, x1 = camX + viewW + 40;
    var t = S.t;
    for (var i = 0; i < st.items.length; i++) {
      var it = st.items[i];
      if (it.x > x1) break;
      if (it.got || it.x < x0) continue;
      var x = it.x - camX;
      var bob = Math.sin(t * 3 + it.ph) * 4;
      if (it.kind === 'acorn') drawAcorn(x, it.y + bob * 0.5, Math.sin(t * 2.4 + it.ph) * 0.15);
      else if (it.kind === 'feather') drawFeatherItem(x, it.y + bob, t);
      else drawStarItem(x, it.y + bob, t);
    }
  }

  function drawAcorn(x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#c98d4e';
    ctx.beginPath(); ctx.ellipse(0, 3, 9.5, 11.5, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,253,247,0.55)';
    ctx.beginPath(); ctx.ellipse(-3.5, 4, 2.4, 4, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#8a6a45';
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.quadraticCurveTo(-12, -12, 0, -12);
    ctx.quadraticCurveTo(12, -12, 12, -2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(1, -17); ctx.stroke();
    ctx.restore();
  }

  function drawFeatherItem(x, y, t) {
    ctx.fillStyle = 'rgba(225,237,246,0.85)';
    ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(t * 4) * 2, 0, 6.2832); ctx.fill();
    drawFeather(x, y, 1, -0.5);
  }

  function drawFeather(x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#6f97b8';
    ctx.fillStyle = '#fffdf7';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.bezierCurveTo(12, -12, 12, 8, 0, 18);
    ctx.bezierCurveTo(-12, 8, -12, -12, 0, -20);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 24); ctx.stroke();
    ctx.restore();
  }

  function starPath(x, y, r1, r2, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? r2 : r1;
      var a = rot - Math.PI / 2 + i * Math.PI / 5;
      if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }

  function drawStarItem(x, y, t) {
    ctx.fillStyle = 'rgba(253,240,196,0.9)';
    ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(t * 4) * 2, 0, 6.2832); ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#f3cf63';
    ctx.lineJoin = 'round';
    starPath(x, y, 19, 8.5, Math.sin(t * 2) * 0.2);
    ctx.fill(); ctx.stroke();
  }

  function sparkle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  // ひよこ（まるい からだ・みじかい あし・あたまに 3本の け）
  function drawChick(x, fy, o) {
    var air = o.air;
    var lift = GROUND - fy;
    // かげ
    var sh = clamp(1 - lift / 300, 0.3, 1);
    ctx.fillStyle = 'rgba(61,58,53,0.14)';
    ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 22 * sh, 5 * sh, 0, 0, 6.2832); ctx.fill();

    ctx.save();
    ctx.globalAlpha = o.alpha;
    ctx.translate(x, fy);

    // ほし：やさしく ひかる
    if (o.star > 0) {
      var pulse = 0.5 + 0.5 * Math.sin(o.t * 6);
      ctx.fillStyle = 'rgba(253,236,170,' + (0.45 + pulse * 0.25).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(0, -28, 42 + pulse * 4, 0, 6.2832); ctx.fill();
      for (var s = 0; s < 4; s++) {
        var a = o.t * 2.2 + s * Math.PI / 2;
        sparkle(Math.cos(a) * 40, -28 + Math.sin(a) * 36, 6 + 2 * Math.sin(o.t * 8 + s), '#f0c75a');
      }
    }

    var bob = air ? 0 : Math.abs(Math.sin(o.phase)) * 3;
    var sq = o.squash > 0 ? 1 + o.squash * 1.2 : 1;
    var stretch = air ? clamp(1 + (-o.vy) / 6000, 0.92, 1.1) : 1;
    var wob = o.hit ? Math.sin(o.hit.t * 18) * 0.12 * Math.max(0, 1 - o.hit.t * 1.6) : 0;

    // あし
    ctx.strokeStyle = '#d99a4c';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (air || o.hit) {
      ctx.moveTo(-6, -8); ctx.lineTo(-9, -1);
      ctx.moveTo(6, -8); ctx.lineTo(4, -1);
    } else {
      var l1 = Math.sin(o.phase) * 8, l2 = -l1;
      ctx.moveTo(-5, -9); ctx.lineTo(-5 + l1, -1 + Math.max(0, -l1) * -0.4);
      ctx.moveTo(6, -9); ctx.lineTo(6 + l2, -1 + Math.max(0, -l2) * -0.4);
    }
    ctx.stroke();

    ctx.translate(0, -bob);
    ctx.rotate(wob);
    ctx.scale(sq * (1 / stretch), (1 / sq) * stretch);

    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';

    // しっぽ
    ctx.fillStyle = '#f2cd5a';
    ctx.beginPath();
    ctx.moveTo(-20, -36); ctx.lineTo(-33, -40); ctx.lineTo(-24, -27); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // からだ
    ctx.fillStyle = '#f7d667';
    ctx.beginPath(); ctx.ellipse(0, -30, 25, 23, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbe7a1';
    ctx.beginPath(); ctx.ellipse(6, -22, 14, 11, 0, 0, 6.2832); ctx.fill();

    // あたまの け
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -52); ctx.quadraticCurveTo(-6, -62, -1, -64);
    ctx.moveTo(2, -52); ctx.quadraticCurveTo(4, -62, 9, -61);
    ctx.stroke();

    // はね（パワーアップ中は しろい はねが ひらく）
    var flap = air ? Math.sin(o.t * (o.feather > 0 ? 30 : 18)) * 0.5 : Math.sin(o.phase) * 0.18;
    ctx.save();
    ctx.translate(-6, -28);
    ctx.rotate(-0.3 + flap);
    ctx.fillStyle = o.feather > 0 ? '#fffdf7' : '#efc552';
    ctx.strokeStyle = o.feather > 0 ? '#6f97b8' : INK;
    ctx.beginPath(); ctx.ellipse(-6, 0, o.feather > 0 ? 17 : 12, o.feather > 0 ? 9 : 7.5, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (o.feather > 0) drawFeather(-14, -62, 0.55, -0.9);

    // め
    ctx.fillStyle = INK;
    if (o.hit && o.hit.t < 0.6) {
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(6, -36); ctx.quadraticCurveTo(10, -40, 14, -36); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(10, -36, 3.6, 4.2, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fffdf7';
      ctx.beginPath(); ctx.arc(11.2, -37.6, 1.3, 0, 6.2832); ctx.fill();
    }
    // ほっぺ
    ctx.fillStyle = 'rgba(239,156,150,0.7)';
    ctx.beginPath(); ctx.ellipse(13, -25, 5, 3, 0, 0, 6.2832); ctx.fill();
    // くちばし
    ctx.fillStyle = '#e8a24a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(21, -35); ctx.lineTo(31, -31); ctx.lineTo(21, -27);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBubble(x, y, text, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '700 24px ' + FONT;
    var w = ctx.measureText(text).width + 32;
    var bx = clamp(x - w / 2, 8, viewW - w - 8);
    roundRect(bx, y - 44, w, 44, 20);
    ctx.fillStyle = '#fffdf7';
    ctx.strokeStyle = '#e2dccf';
    ctx.lineWidth = 3;
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 2); ctx.lineTo(x, y + 10); ctx.lineTo(x + 8, y - 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, y - 21);
    ctx.restore();
  }

  // 「いま！」（ジャンプの タイミングを おしえる）
  function drawCue(x, y, t) {
    var a = clamp(t / 0.2, 0, 1);
    var sc = 1 + Math.max(0, t - 0.85) * 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x + 30, y);
    ctx.scale(sc, sc);
    ctx.font = '700 46px ' + FONT;
    var w = ctx.measureText('いま！').width + 44;
    roundRect(-w / 2, -64, w, 64, 30);
    ctx.fillStyle = '#fdf0c4';
    ctx.strokeStyle = '#e0a92a';
    ctx.lineWidth = 4;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('いま！', 0, -31);
    ctx.restore();
  }

  function drawParts(camX, front) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var isFront = p.type !== 'dust';
      if (isFront !== front) continue;
      var x = p.x - camX, y = p.y;
      var a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      if (p.type === 'dust') {
        ctx.fillStyle = '#d8c49f';
        ctx.beginPath(); ctx.arc(x, y, 4 + (1 - a) * 4, 0, 6.2832); ctx.fill();
      } else if (p.type === 'spark') {
        sparkle(x, y, 7, p.color);
      } else if (p.type === 'feather') {
        ctx.fillStyle = '#fffdf7';
        ctx.beginPath(); ctx.ellipse(x, y, 6, 3, p.rot, 0, 6.2832); ctx.fill();
      } else if (p.type === 'heart') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.bezierCurveTo(x - 10, y - 2, x - 6, y - 10, x, y - 5);
        ctx.bezierCurveTo(x + 6, y - 10, x + 10, y - 2, x, y + 6);
        ctx.fill();
      } else if (p.type === 'petal') {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(x, y, 7, 4, p.rot, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- まわす（なめらかに うごかす） ----------
  var running = false;
  var rafId = 0;
  var lastTs = 0;
  var acc = 0;

  function frame(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
    lastTs = ts;
    if (!paused) {
      acc += dt;
      while (acc >= STEP) {
        if (mode === 'select') stepDemo(STEP);
        else if (S) stepPlay(STEP * (S.goal || S.hit ? 1 : S.st.ts), STEP);
        acc -= STEP;
      }
    }
    draw(paused ? 1 : acc / STEP);
    if (mode !== 'select' && S) updateHud();
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastTs = 0;
    acc = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // ---------- 表示（HUD） ----------
  var selectEl = document.getElementById('select');
  var hud = document.getElementById('hud');
  var progTrack = document.getElementById('progTrack');
  var progFill = document.getElementById('progFill');
  var progMe = document.getElementById('progMe');
  var acornNum = document.getElementById('acornNum');
  var acornBox = acornNum.parentNode;
  var pwFeather = document.getElementById('pwFeather');
  var pwStar = document.getElementById('pwStar');
  var pwFeatherFill = document.getElementById('pwFeatherFill');
  var pwStarFill = document.getElementById('pwStarFill');
  var tapHint = document.getElementById('tapHint');
  var heartsEl = document.getElementById('hearts');
  var bannerEl = document.getElementById('banner');
  var koeHud = document.getElementById('koeHud');
  var trackW = 300;
  var lastProg = -1;

  function setPower(el, fill, t, T) {
    var on = t > 0;
    if (el.hidden === on) el.hidden = !on;
    if (!on) return;
    fill.style.transform = 'scaleX(' + (t / T).toFixed(4) + ')';
    el.classList.toggle('is-low', t < 2.5);
  }

  function updateHud() {
    var p = clamp((S.x - 200) / (S.st.len - 200), 0, 1);
    if (Math.abs(p - lastProg) > 0.0005) {
      lastProg = p;
      progFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      progMe.style.transform = 'translateX(' + (p * trackW).toFixed(1) + 'px)';
    }
    setPower(pwFeather, pwFeatherFill, S.feather, FEATHER_TIME);
    setPower(pwStar, pwStarFill, S.star, STAR_TIME);
  }

  var hintTimer = 0;
  function hideTapHint() {
    clearTimeout(hintTimer);
    tapHint.hidden = true;
  }

  // むずかしい：ハートの 体力ゲージ
  var HEART_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 34C9 26 4 20 4 13.5 4 8.5 8 5 12.5 5c3.3 0 5.9 1.8 7.5 4.6C21.6 6.8 24.2 5 27.5 5 32 5 36 8.5 36 13.5 36 20 31 26 20 34z" stroke="#3d3a35" stroke-width="3" stroke-linejoin="round"/></svg>';
  function renderHearts(anim) {
    if (!S || !S.st.life) { heartsEl.hidden = true; return; }
    heartsEl.hidden = false;
    var html = '';
    for (var i = 0; i < LIFE_MAX; i++) {
      var lost = i >= S.life;
      html += '<span class="heart' + (lost ? ' is-lost' : '') + (anim && i === S.life ? ' is-pop' : '') + '">' + HEART_SVG + '</span>';
    }
    heartsEl.innerHTML = html;
    heartsEl.setAttribute('aria-label', 'たいりょく ' + S.life + ' / ' + LIFE_MAX);
  }

  // ステージの はじめに「ステージ3」と 大きく 出す
  var bannerTimer = 0;
  function showBanner(n) {
    document.getElementById('bannerNum').textContent = 'ステージ' + n;
    document.getElementById('bannerName').textContent = STAGES[n - 1].name;
    bannerEl.hidden = false;
    bannerEl.classList.remove('is-show');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('is-show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { bannerEl.hidden = true; }, 2200);
  }

  // ---------- がめんの きりかえ ----------
  var pauseEl = document.getElementById('pause');
  var pauseTitle = document.getElementById('pauseTitle');
  var goalEl = document.getElementById('goal');
  var overEl = document.getElementById('over');

  // こえで あそぶ ときは、マイクを じゅんび してから はじめる
  function begin(n) {
    if (rec.input === 'koe') useKoe(function () { startStage(n); });
    else startStage(n);
  }

  function startStage(n) {
    newRun(n);
    mode = 'play';
    paused = false;
    selectEl.hidden = true;
    hud.hidden = false;
    pauseEl.hidden = true;
    goalEl.hidden = true;
    overEl.hidden = true;
    acornNum.textContent = '0';
    lastProg = -1;
    pwFeather.hidden = pwStar.hidden = true;
    renderHearts(false);
    var useVoice = rec.input === 'koe' && koe && koe.isRunning();
    koeHud.hidden = !useVoice;
    if (koe) koe.enabled = true;
    trackW = progTrack.offsetWidth || trackW;
    showBanner(n);
    // はじめの 2ステージは「タップで ジャンプ」を しばらく 出す（こえの ときは いつも）
    tapHint.textContent = useVoice ? 'こえを だすと ジャンプ！' : 'がめんを タップすると ジャンプ！';
    // 「ステージ○」が きえてから 出す
    tapHint.hidden = true;
    clearTimeout(hintTimer);
    if (useVoice || n <= 2) {
      hintTimer = setTimeout(function () {
        if (S && !S.jumped) tapHint.hidden = false;
        hintTimer = setTimeout(hideTapHint, 5000);
      }, 2100);
    }
    startLoop();
    updateHud();
    clearTimeout(bgmPreviewTimer);
    bgmStart(n);
    if (isPortrait()) pause('つづける？');
  }

  function showSelect() {
    bgmStop();
    mode = 'select';
    paused = false;
    S = null;
    parts = [];
    hideTapHint();
    hud.hidden = true;
    pauseEl.hidden = true;
    goalEl.hidden = true;
    overEl.hidden = true;
    bannerEl.hidden = true;
    selectEl.hidden = false;
    stopKoe();
    selectMsg.textContent = '';
    renderStages();
    startLoop();
  }

  function pause(title) {
    if (mode !== 'play' || paused || (S && (S.goal || S.over))) return;
    paused = true;
    if (koe) koe.enabled = false;
    bgmStop();   // いちじていし ちゅうは きょくを とめる
    pauseTitle.textContent = title || 'やめる？';
    pauseEl.hidden = false;
    document.getElementById('resumeBtn').focus({ preventScroll: true });
  }

  function resume() {
    if (!paused) return;
    paused = false;
    pauseEl.hidden = true;
    if (koe) koe.enabled = true;
    if (S && !S.goal && !S.over) bgmStart(S.n, bgm.step);   // とめた ところから つづき
    lastTs = 0;
    acc = 0;
  }

  function showGoal() {
    document.getElementById('goalNum').textContent = S.acorns;
    var maru = document.getElementById('goalMaru');
    maru.innerHTML = hanamaruSvg();
    var nextBtn = document.getElementById('nextStageBtn');
    nextBtn.hidden = S.n >= STAGE_MAX;
    document.getElementById('sendBtn').hidden = !S.kiroku;
    goalEl.hidden = false;
    (nextBtn.hidden ? document.getElementById('againBtn') : nextBtn).focus({ preventScroll: true });
  }

  // むずかしい で 3かい ぶつかった とき
  function showOver() {
    sOver();
    if (koe) koe.enabled = false;
    document.getElementById('overNum').textContent = S.acorns;
    overEl.hidden = false;
    document.getElementById('overAgainBtn').focus({ preventScroll: true });
  }

  // はなまる（ぐるぐる と はなびら）
  function hanamaruSvg() {
    var d = '';
    var n = 9, R = 40, i;
    for (i = 0; i <= n; i++) {
      var a = i / n * Math.PI * 2 - Math.PI / 2;
      var px = 50 + Math.cos(a) * R, py = 50 + Math.sin(a) * R;
      d += (i === 0 ? 'M' : 'A11 11 0 0 1 ') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
    }
    var sp = '';
    for (i = 0; i <= 80; i++) {
      var t = i / 80;
      var ang = t * Math.PI * 2 * 2.4 - Math.PI / 2;
      var rr = 4 + t * 26;
      sp += (i === 0 ? 'M' : 'L') + (50 + Math.cos(ang) * rr).toFixed(1) + ' ' + (50 + Math.sin(ang) * rr).toFixed(1) + ' ';
    }
    return '<svg viewBox="-4 -4 108 108">' +
      '<path class="hm-line" pathLength="1" d="' + sp + '" fill="none" stroke="#e0524a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="hm-line" pathLength="1" d="' + d + '" fill="none" stroke="#e0524a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  var LOCK_SVG = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var ACORN_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="24" rx="10" ry="12" fill="#c98d4e" stroke="#3d3a35" stroke-width="2.5"/><path d="M8 18c0-7 5-10 12-10s12 3 12 10z" fill="#8a6a45" stroke="#3d3a35" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 8V4" stroke="#3d3a35" stroke-width="3" stroke-linecap="round"/></svg>';

  var stagesEl = document.getElementById('stages');
  var selectMsg = document.getElementById('selectMsg');

  function renderStages() {
    var html = '';
    for (var i = 1; i <= STAGE_MAX; i++) {
      var open = isOpen(i);
      var done = !!rec.cleared[i];
      var label = 'ステージ' + i + ' ' + STAGES[i - 1].name + (open ? (done ? '（クリア）' : '') : '（まだ ひらいていない）');
      html += '<button type="button" class="stage-btn' + (open ? '' : ' is-locked') + '" data-n="' + i + '" aria-label="' + label + '"' + (open ? '' : ' aria-disabled="true"') + '>' +
        '<span class="stage-num">' + i + '</span>' +
        '<span class="stage-name">' + STAGES[i - 1].name + '</span>' +
        '<span class="stage-mark">' + (open ? (done ? '<span class="hanamaru">' + hanamaruSvg() + '</span>' : '') : LOCK_SVG) + '</span>' +
        (done && rec.best[i] != null ? '<span class="stage-best">' + ACORN_SVG + rec.best[i] + 'こ</span>' : '') +
        '</button>';
    }
    stagesEl.innerHTML = html;
  }

  stagesEl.addEventListener('click', function (e) {
    var b = e.target.closest('.stage-btn');
    if (!b) return;
    unlockAudio();
    var n = Number(b.dataset.n);
    if (!isOpen(n)) {
      selectMsg.textContent = 'まえの ステージを クリアすると ひらくよ';
      return;
    }
    // ランキング用の なまえが なければ、さきに きく
    if (window.Kiroku) Kiroku.ensureName(function () { begin(n); });
    else begin(n);
  });

  // ---------- むずかしさ・あそびかた・音 ----------
  var diffBtns = Array.prototype.slice.call(document.querySelectorAll('.diff-btn'));
  var diffNote = document.getElementById('diffNote');
  var DIFF_NOTES = {
    easy: 'ゆっくり はしるよ。ぶつかっても すこし まえから やりなおし',
    normal: 'ぶつかっても すこし まえから やりなおし',
    hard: 'はやくて しょうがいぶつも おおいよ。3かい ぶつかると おしまい'
  };
  function renderDiff() {
    diffBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.diff === rec.diff)); });
    diffNote.textContent = DIFF_NOTES[rec.diff];
  }
  diffBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      unlockAudio();
      rec.diff = DIFFS[b.dataset.diff] ? b.dataset.diff : 'normal';
      save();
      renderDiff();
    });
  });

  var inputBtns = Array.prototype.slice.call(document.querySelectorAll('.input-btn'));
  var koeRow = document.getElementById('koeRow');
  function renderInput() {
    inputBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.input === rec.input)); });
    koeRow.hidden = rec.input !== 'koe';
  }
  inputBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      unlockAudio();
      rec.input = b.dataset.input === 'koe' ? 'koe' : 'yubi';
      save();
      renderInput();
      renderBgm();
    });
  });

  var SPK_ON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  var soundBtns = Array.prototype.slice.call(document.querySelectorAll('.sound-btn'));
  function renderSound() {
    soundBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(rec.sound));
      b.setAttribute('aria-label', rec.sound ? 'おと あり（おすと けす）' : 'おと なし（おすと だす）');
      b.innerHTML = (rec.sound ? SPK_ON : SPK_OFF) + '<span>' + (rec.sound ? 'おと' : 'おと なし') + '</span>';
    });
  }
  // きょく（BGM）の オン・オフ。こえで あそぶ ときは せってい（先生）で きりかえる
  var NOTE_ON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5.5l11-2.5V16"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/></svg>';
  var NOTE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5.5l11-2.5V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="M3 3l18 18"/></svg>';
  var bgmBtns = Array.prototype.slice.call(document.querySelectorAll('.bgm-btn'));
  function renderBgm() {
    var on = bgmOn();
    bgmBtns.forEach(function (b) {
      b.hidden = rec.input === 'koe';
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'きょく あり（おすと けす）' : 'きょく なし（おすと ならす）');
      b.innerHTML = (on ? NOTE_ON : NOTE_OFF) + '<span>' + (on ? 'きょく' : 'きょく なし') + '</span>';
    });
  }
  function setBgm(on) {
    if (rec.input === 'koe') rec.bgmKoe = on; else rec.bgmYubi = on;
    save();
    renderBgm();
    if (mode === 'play' && S && !paused && !S.goal && !S.over) {
      if (on) { unlockAudio(); bgmStart(S.n, bgm.step); } else bgmStop();
    }
  }
  bgmBtns.forEach(function (b) {
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    b.addEventListener('click', function () { setBgm(!bgmOn()); });
  });

  soundBtns.forEach(function (b) {
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    b.addEventListener('click', function () {
      rec.sound = !rec.sound;
      save();
      renderSound();
      if (rec.sound) { unlockAudio(); sAcorn(); }
    });
  });

  // ---------- タップで ジャンプ ----------
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    unlockAudio();
    tap();
  });
  // HUD の ボタン いがいの ところ（もじ など）を おしても ジャンプ
  tapHint.addEventListener('pointerdown', function (e) { e.preventDefault(); unlockAudio(); tap(); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'ArrowUp') && mode === 'play' && !paused) {
      e.preventDefault();
      tap();
    } else if (e.key === 'Escape') {
      if (!settings.hidden) closeSettings();
      else if (!testEl.hidden) closeTest();
      else if (mode === 'play' && !paused) pause('やめる？');
    }
  });

  // あそんでいる ときの「もくじ」は、いちじていして「やめる？」
  document.getElementById('playHome').addEventListener('click', function (e) {
    if (mode === 'play' && S && !S.goal) {
      e.preventDefault();
      pause('やめる？');
    }
  });
  document.getElementById('resumeBtn').addEventListener('click', function () { unlockAudio(); resume(); });
  document.getElementById('toSelectBtn').addEventListener('click', showSelect);
  document.getElementById('nextStageBtn').addEventListener('click', function () {
    unlockAudio();
    if (S && S.n < STAGE_MAX) begin(S.n + 1);
  });
  document.getElementById('againBtn').addEventListener('click', function () {
    unlockAudio();
    if (S) begin(S.n);
  });
  document.getElementById('overAgainBtn').addEventListener('click', function () {
    unlockAudio();
    if (S) begin(S.n);
  });
  document.getElementById('goalSelectBtn').addEventListener('click', showSelect);
  document.getElementById('sendBtn').addEventListener('click', function () {
    if (S && S.kiroku && window.Kiroku) Kiroku.showSend(S.kiroku);
  });
  if (window.Kiroku) Kiroku.mountChip(document.getElementById('nameChip'));

  // ほかの アプリに したとき・たて向きに したときは いちじていし
  function isPortrait() { return window.innerHeight > window.innerWidth; }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      pause('つづける？');
      stopLoop();
    } else {
      startLoop();
    }
  });
  window.addEventListener('resize', function () {
    resize();
    if (isPortrait()) pause('つづける？');
  });

  // ---------- こえで あそぶ（../shared/koe-switch.js を つかう） ----------
  // 声の 大きさだけを みる（音声認識は しない・録音しない・オフラインで うごく）。
  // しきい値は たべもの キャッチなどと 共通の せってい。ジャンプの 待ち時間は この ゲームだけの せってい。
  var KS = window.KoeSwitch || null;
  var koeConf = KS ? KS.loadSettings() : { threshold: 0.5 };
  var koe = null;
  var micExplained = false;
  var micNext = null;

  var micAskEl = document.getElementById('micAsk');
  var micErr = document.getElementById('micErr');
  var micOkBtn = document.getElementById('micOkBtn');
  var testEl = document.getElementById('koeTest');
  var testErr = document.getElementById('testErr');
  var testLamp = document.getElementById('testLamp');
  var testLampText = document.getElementById('testLampText');
  var thValue = document.getElementById('thValue');
  var meters = [
    { fill: document.getElementById('hudMeterFill'), line: document.getElementById('hudMeterLine') },
    { fill: document.getElementById('testMeterFill'), line: document.getElementById('testMeterLine') }
  ];
  meters.forEach(function (m) { m.box = m.fill.parentNode; m.last = -1; m.over = null; });

  if (KS) {
    koe = KS.create({
      threshold: koeConf.threshold,
      cooldown: rec.koeCool,          // 1かい ジャンプしたら、この 間は つぎの 声に 反応しない
      onTrigger: onVoice,
      onLevel: showLevel,
      onStop: function () { showLevel(0, koe.getThreshold()); }
    });
  }

  function onVoice() {
    if (!testEl.hidden) { flashLamp(); return; }
    if (mode !== 'play' || paused || !S || rec.input !== 'koe') return;
    tap();   // ゆびの タップと 同じ（はねが あれば 空中で もう1かい）
  }

  function showLevel(level, th) {
    meters.forEach(function (m) {
      if (m.box.offsetParent === null) return;
      var v = Math.round(level * 200) / 200;
      if (v !== m.last) { m.last = v; m.fill.style.transform = 'scaleX(' + v + ')'; }
      var over = level >= th;
      if (over !== m.over) { m.over = over; m.box.classList.toggle('is-over', over); }
    });
  }
  function placeLines() {
    var th = koe ? koe.getThreshold() : koeConf.threshold;
    meters.forEach(function (m) { m.line.style.left = (th * 100).toFixed(1) + '%'; });
    thValue.textContent = Math.round(th * 100);
  }

  // マイクを つかう：はじめての ときは、なぜ つかうかを やさしく せつめいしてから
  function useKoe(next) {
    if (koe && koe.isRunning()) { next(); return; }
    micNext = next;
    if (!micExplained || !koe) {
      micErr.hidden = true;
      micOkBtn.hidden = false;
      micAskEl.hidden = false;
      micOkBtn.focus({ preventScroll: true });
      return;
    }
    startMic();
  }
  function startMic() {
    if (!koe) { showMicError(KS ? null : { name: 'NotSupportedError' }); return; }
    koe.start().then(function () {
      micAskEl.hidden = true;
      var fn = micNext;
      micNext = null;
      placeLines();
      if (fn) fn();
    }, function (err) {
      showMicError(err);
    });
  }
  function showMicError(err) {
    micErr.textContent = KS ? KS.errorMessage(err) : 'この ページでは マイクが つかえません。';
    micErr.hidden = false;
    micOkBtn.textContent = 'もういちど ためす';
    micAskEl.hidden = false;
  }
  function closeMicAsk() {
    micAskEl.hidden = true;
    micNext = null;
    micOkBtn.textContent = 'マイクを つかう';
  }
  micOkBtn.addEventListener('click', function () {
    unlockAudio();
    micExplained = true;
    micErr.hidden = true;
    startMic();
  });
  document.getElementById('micNoBtn').addEventListener('click', closeMicAsk);

  function stopKoe() {
    if (koe && koe.isRunning()) koe.stop();
  }

  // ---------- こえテスト ----------
  var lampTimer = 0;
  var lampCount = 0;
  function flashLamp() {
    lampCount++;
    testLamp.classList.add('is-on');
    testLampText.textContent = 'はんのう！（' + lampCount + '）';
    clearTimeout(lampTimer);
    lampTimer = setTimeout(function () { testLamp.classList.remove('is-on'); }, 500);
  }
  function openTest() {
    useKoe(function () {
      lampCount = 0;
      testLamp.classList.remove('is-on');
      testLampText.textContent = 'まってるよ';
      testErr.hidden = true;
      koe.enabled = true;
      testEl.hidden = false;
      placeLines();
      meters.forEach(function (m) { m.last = -1; m.over = null; });
      document.getElementById('testCloseBtn').focus({ preventScroll: true });
    });
  }
  function closeTest() {
    if (testEl.hidden) return;
    testEl.hidden = true;
    clearTimeout(lampTimer);
    if (mode === 'select') stopKoe();
  }
  function stepThreshold(d) {
    if (!koe) return;
    var th = clamp(Math.round((koe.getThreshold() + d) * 100) / 100, 0.1, 0.9);
    koe.setThreshold(th);
    koeConf.threshold = th;
    // たべもの キャッチ などと 同じ ところに ほぞん
    if (KS && !KS.saveSettings({ threshold: th })) {
      testErr.textContent = 'この iPad では せっていを ほぞん できません。ページを とじると もとに もどります。';
      testErr.hidden = false;
    }
    placeLines();
  }
  document.getElementById('koeTestBtn').addEventListener('click', function () { unlockAudio(); openTest(); });
  document.getElementById('testCloseBtn').addEventListener('click', closeTest);
  document.getElementById('thUpBtn').addEventListener('click', function () { stepThreshold(0.05); });
  document.getElementById('thDownBtn').addEventListener('click', function () { stepThreshold(-0.05); });

  // ---------- せってい（ながおしで ひらく） ----------
  var gearBtn = document.getElementById('gearBtn');
  var gearHint = document.getElementById('gearHint');
  var settings = document.getElementById('settings');
  var closeBtn = document.getElementById('closeBtn');
  var openAllBtn = document.getElementById('openAllBtn');
  var recNote = document.getElementById('recNote');
  var resetBtn = document.getElementById('resetBtn');
  var resetStatus = document.getElementById('resetStatus');
  var saveWarn = document.getElementById('saveWarn');
  var HOLD_MS = 1000;
  var holdTimer = 0;
  var gearHintTimer = 0;
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
      gearHint.hidden = false;
      clearTimeout(gearHintTimer);
      gearHintTimer = setTimeout(function () { gearHint.hidden = true; }, 1800);
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

  function renderSettings() {
    openAllBtn.setAttribute('aria-pressed', String(rec.openAll));
    openAllBtn.textContent = rec.openAll ? 'ぜんぶ ひらいています（おすと もどす）' : 'ぜんぶの ステージを ひらく';
    var done = [];
    for (var i = 1; i <= STAGE_MAX; i++) if (rec.cleared[i]) done.push(i);
    recNote.textContent = 'クリアした ステージ：' + (done.length ? done.join('・') : 'まだ ありません') +
      '。けすと、クリアの きろくと どんぐりの かずが ぜんぶ きえます（はやさ と 音の せっていは のこります）。';
    saveWarn.hidden = canSave;
    coolBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.cool) === rec.koeCool)); });
    seVolBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.seVol) === rec.seVol)); });
    bgmVolBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.bgmVol) === rec.bgmVol)); });
    bgmKoeBtn.setAttribute('aria-pressed', String(rec.bgmKoe));
    bgmKoeBtn.textContent = rec.bgmKoe ? 'こえで あそぶ ときも きょくを ならす：オン' : 'こえで あそぶ ときも きょくを ならす：オフ';
    var th = koe ? koe.getThreshold() : koeConf.threshold;
    thNote.textContent = 'はんのう する 声の 大きさ：' + Math.round(th * 100) +
      '（こえテストで、メーターを 見ながら かえられます）。この 大きさは、たべもの キャッチ など こえで あそぶ ほかの 教材とも 共通です。';
  }

  var coolBtns = Array.prototype.slice.call(document.querySelectorAll('[data-cool]'));
  var seVolBtns = Array.prototype.slice.call(document.querySelectorAll('[data-se-vol]'));
  var bgmVolBtns = Array.prototype.slice.call(document.querySelectorAll('[data-bgm-vol]'));
  var bgmKoeBtn = document.getElementById('bgmKoeBtn');
  var bgmPreviewTimer = 0;
  seVolBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      rec.seVol = Number(b.dataset.seVol);
      save();
      unlockAudio();
      setVolumes();
      renderSettings();
      sPower();   // ためしに ならす
    });
  });
  bgmVolBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      rec.bgmVol = Number(b.dataset.bgmVol);
      save();
      unlockAudio();
      setVolumes();
      renderSettings();
      previewBgm();
    });
  });
  // ためしに 2びょう ならす（ステージを えらぶ がめんの とき）
  function previewBgm() {
    if (!audio() || mode !== 'select') return;
    var key = rec.input === 'koe' ? 'bgmKoe' : 'bgmYubi';
    var keep = rec[key];
    rec[key] = true;
    bgmStart(1);
    rec[key] = keep;
    clearTimeout(bgmPreviewTimer);
    bgmPreviewTimer = setTimeout(bgmStop, 2200);
  }
  bgmKoeBtn.addEventListener('click', function () {
    rec.bgmKoe = !rec.bgmKoe;
    save();
    renderSettings();
    renderBgm();
  });
  var thNote = document.getElementById('thNote');
  coolBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      rec.koeCool = Number(b.dataset.cool);
      if (koe) koe.setCooldown(rec.koeCool);
      save();
      renderSettings();
    });
  });
  document.getElementById('setTestBtn').addEventListener('click', function () {
    unlockAudio();
    closeSettings();
    openTest();
  });

  var armTimer = 0;
  function disarmReset() {
    clearTimeout(armTimer);
    resetBtn.classList.remove('is-armed');
    resetBtn.textContent = 'きろくを けす';
  }

  function openSettings() {
    disarmReset();
    resetStatus.textContent = '';
    renderSettings();
    settings.hidden = false;
    settings.scrollTop = 0;
    stopLoop();
    closeBtn.focus({ preventScroll: true });
  }

  function closeSettings() {
    if (settings.hidden) return;
    disarmReset();
    settings.hidden = true;
    renderStages();
    startLoop();
    gearBtn.focus({ preventScroll: true });
  }

  closeBtn.addEventListener('click', closeSettings);

  openAllBtn.addEventListener('click', function () {
    rec.openAll = !rec.openAll;
    save();
    renderSettings();
    resetStatus.textContent = '';
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
    rec.cleared = {};
    rec.best = {};
    rec.openAll = false;
    save();
    renderSettings();
    resetStatus.textContent = 'きろくを けしました';
  });

  // とちゅうで 新しい版への 自動の 再読み込みを しない
  window.kyozaiBusy = function () { return mode === 'play' || !settings.hidden || !testEl.hidden; };

  // ---------- はじめ ----------
  renderSound();
  renderBgm();
  renderDiff();
  renderInput();
  renderStages();
  resize();
  startLoop();
})();
