// がっきの 音と 曲（音の ファイルは つかわず、Web Audio で その場で 作る。オフラインで 鳴る）
//
//   Oto.unlock()                 … ボタンを おした ときに よぶ（iPad は さいしょに これが いる）
//   Oto.setVolume(0〜1)          … ぜんたいの 音量
//   Oto.play(がっき, 音, ms, 倍率) … 音を 鳴らす（ms：performance.now() の 時こく。なければ すぐ）
//   Oto.beep(高い?, ms)          … カウントダウンの「ピッ」
//   Oto.Song(曲, 1ぷんの はく, 回数, はじまる ms) … 曲を 流す（.update() を ときどき よぶ／.stop()）
//   Oto.SONGS                    … 曲の 一覧
(function (global) {
  'use strict';

  var AC = global.AudioContext || global.webkitAudioContext;
  var ctx = null, master = null, noiseBuf = null, pianoWave = null;
  var volume = 0.5;

  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return null; } }
      // 大きな 音が かさなっても われないように
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(comp);
      // ざあっと いう 音（たいこ・すず・カスタネットに つかう）
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // ピアノの 音の いろ（倍音の まぜかた）
      var amp = [0, 1, 0.5, 0.32, 0.2, 0.13, 0.08, 0.05, 0.03, 0.02];
      var real = new Float32Array(amp.length), imag = new Float32Array(amp.length);
      for (var k = 0; k < amp.length; k++) imag[k] = amp[k];
      pianoWave = ctx.createPeriodicWave(real, imag);
    }
    if (ctx.state !== 'running' && ctx.resume) { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  // iPad では、ボタンを おした ときに 音の じゅんびを しておかないと、あとで 鳴らせない
  function unlock() {
    // 消音モード（サイレント）でも がっきの 音が 鳴るように（対応している iPad だけ）
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!ensure()) return;
    try {
      var buf = ctx.createBuffer(1, 1, 22050);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }
  });

  function setVolume(v) {
    volume = v;
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
    }
  }

  // performance.now() の 時こく → 音の 時こく
  function at(ms) {
    var t = ctx.currentTime;
    if (ms == null) return t + 0.005;
    return t + Math.max(0.005, (ms - performance.now()) / 1000);
  }

  // ---------- 音の 部品 ----------
  function env(t, peak, attack, decay, dest) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest || master);
    return g;
  }
  function tone(type, freq, t, peak, attack, decay, dest) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    var g = env(t, peak, attack, decay, dest);
    o.connect(g);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return o;
  }
  function noise(t, peak, decay, ftype, freq, q, dest) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = ftype;
    f.frequency.value = freq;
    if (q) f.Q.value = q;
    var g = env(t, peak, 0.002, decay, dest);
    s.connect(f);
    f.connect(g);
    var off = Math.random() * 0.5;
    s.start(t, off, decay + 0.05);
  }

  // ---------- がっき ----------
  // ピアノ：ポーンと 鳴って、だんだん やわらかく 小さく なる
  function piano(freq, t, v) {
    var dur = 2.6 - Math.min(1.4, (freq - 260) / 400);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.5;
    f.frequency.setValueAtTime(Math.min(freq * 9, 9000), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(freq * 2.2, 500), t + 1.0);
    f.connect(g);
    [[0, 0.7], [2.5, 0.3]].forEach(function (p) {   // すこし ずらした 2つの 音で ゆたかに
      var o = ctx.createOscillator();
      o.setPeriodicWave(pianoWave);
      o.frequency.setValueAtTime(freq, t);
      o.detune.setValueAtTime(p[0], t);
      var og = ctx.createGain();
      og.gain.value = p[1];
      o.connect(og);
      og.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
    noise(t, v * 0.08, 0.025, 'highpass', 2500, 0);   // ハンマーの 音
  }

  // もっきん：木の 板を たたいた、コロンと みじかい 音
  function mokkin(freq, t, v) {
    tone('sine', freq, t, v, 0.002, 0.55);
    tone('sine', freq * 3.0, t, v * 0.22, 0.001, 0.12);
    tone('sine', freq * 6.2, t, v * 0.06, 0.001, 0.05);
    noise(t, v * 0.35, 0.025, 'bandpass', Math.min(freq * 2, 3000), 1.5);   // ばちが あたる 音
  }

  // たいこ：ドン（ひくく ひびく）
  function don(t, v) {
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.35);
    var g = env(t, v, 0.004, 0.9);
    o.connect(g);
    o.start(t);
    o.stop(t + 1);
    var o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(95, t);
    o2.frequency.exponentialRampToValueAtTime(50, t + 0.4);
    var g2 = env(t, v * 0.45, 0.004, 0.6);
    o2.connect(g2);
    o2.start(t);
    o2.stop(t + 0.7);
    noise(t, v * 0.5, 0.12, 'lowpass', 700, 0.7);   // かわを たたく 音
  }
  // たいこ：カッ（ふちを たたく）
  function ka(t, v) {
    noise(t, v * 0.9, 0.05, 'bandpass', 1900, 4);
    tone('triangle', 820, t, v * 0.35, 0.001, 0.07);
    tone('sine', 1350, t, v * 0.2, 0.001, 0.04);
  }

  // すず：シャン
  function suzuHit(t, v) {
    noise(t, v * 0.35, 0.16, 'highpass', 6000, 0);
    for (var i = 0; i < 7; i++) {
      var dt = Math.random() * 0.05;
      var f = 3400 + Math.random() * 3800;
      tone('sine', f, t + dt, v * 0.11, 0.001, 0.12 + Math.random() * 0.18);
      tone('sine', f * 1.47, t + dt, v * 0.04, 0.001, 0.08);
    }
  }
  function suzuRoll(t, v) {   // シャラシャラ
    for (var k = 0; k < 8; k++) suzuHit(t + k * 0.085, v * (k % 2 ? 0.55 : 0.8) * (1 - k * 0.06));
  }

  // カスタネット：タン
  function castanet(t, v) {
    noise(t, v * 0.9, 0.035, 'bandpass', 2600, 5);
    noise(t, v * 0.4, 0.03, 'bandpass', 950, 3);
    tone('sine', 1750, t, v * 0.25, 0.001, 0.025);
  }

  // トライアングル：チーン（金ぞくの 長く のこる 音）
  var TRI = [[1, 1, 1], [2.02, 0.6, 0.85], [2.94, 0.45, 0.7], [4.07, 0.32, 0.55], [5.21, 0.22, 0.45], [6.58, 0.15, 0.35]];
  function triangle(t, v, ring) {
    var base = 1180;
    TRI.forEach(function (p) {
      tone('sine', base * p[0], t, v * 0.16 * p[1], 0.002, ring * p[2]);
    });
    noise(t, v * 0.12, 0.012, 'highpass', 5000, 0);
  }
  function triRoll(t, v) {   // チリリリ
    for (var k = 0; k < 12; k++) triangle(t + k * 0.065, v * (k % 2 ? 0.5 : 0.65), 0.5);
    triangle(t + 12 * 0.065, v * 0.7, 2.6);
  }

  // ---------- がっきと 音の 名前 ----------
  var DEG = [0, 2, 4, 5, 7, 9, 11, 12];   // ド レ ミ ファ ソ ラ シ ド
  var NOTE_NAMES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
  function freqOf(base, deg) { return base * Math.pow(2, DEG[deg] / 12); }

  // sound：けんばんの がっきは 0〜7（ド〜ド）、ほかは 0（1つめの 音）・1（2つめの 音）
  // scale：音の 大きさの 倍率（ためしに ならす ときは 小さめに）
  function play(inst, sound, ms, scale) {
    if (!ensure()) return;
    var t = at(ms);
    var v = 0.55 * (scale == null ? 1 : scale);
    switch (inst) {
      case 'piano': piano(freqOf(261.63, sound), t, v * 0.8); break;
      case 'mokkin': mokkin(freqOf(523.25, sound), t, v * 0.85); break;
      case 'taiko': if (sound === 1) ka(t, v * 0.8); else don(t, v * 1.1); break;
      case 'suzu': if (sound === 1) suzuRoll(t, v * 0.8); else suzuHit(t, v); break;
      case 'castanet': castanet(t, v * 0.9); if (sound === 1) castanet(t + 0.14, v); break;
      case 'triangle': if (sound === 1) triRoll(t, v * 0.8); else triangle(t, v, 3.2); break;
    }
  }

  function beep(high, ms) {
    if (!ensure()) return;
    var t = at(ms);
    tone('sine', high ? 1318.5 : 880, t, high ? 0.3 : 0.22, 0.005, high ? 0.45 : 0.18);
  }

  // ---------- 曲 ----------
  // melody：「音の名前 + 長さ（はく。1 なら 書かない）」を スペースで 区切る。
  //   ド レ ミ ファ ソ ラ シ … 高い ド は「ド^」。やすみは「-」。例：「ソ2」＝ソを 2はく、「ド.5」＝ドを 半ぱく
  // bass：2はくごとの ひくい 音（ド・ファ・ソ）
  var SONGS = [
    {
      id: 'kirakira', name: 'きらきらぼし',
      melody: 'ド ド ソ ソ ラ ラ ソ2 ファ ファ ミ ミ レ レ ド2 ' +
              'ソ ソ ファ ファ ミ ミ レ2 ソ ソ ファ ファ ミ ミ レ2 ' +
              'ド ド ソ ソ ラ ラ ソ2 ファ ファ ミ ミ レ レ ド2',
      bass: 'ド ド ファ ド ファ ド ソ ド ド ファ ド ソ ド ファ ド ソ ド ド ファ ド ファ ド ソ ド'
    },
    {
      id: 'kaeru', name: 'かえるの うた',
      melody: 'ド レ ミ ファ ミ レ ド2 ミ ファ ソ ラ ソ ファ ミ2 ' +
              'ド - ド - ド - ド - ド.5 ド.5 レ.5 レ.5 ミ.5 ミ.5 ファ.5 ファ.5 ミ レ ド2',
      bass: 'ド ド ソ ド ド ファ ソ ド ド ド ド ド ド ファ ソ ド'
    },
    {
      id: 'chocho', name: 'ちょうちょう',
      melody: 'ソ.5 ミ.5 ミ ファ.5 レ.5 レ ド.5 レ.5 ミ.5 ファ.5 ソ.5 ソ.5 ソ ' +
              'ソ.5 ミ.5 ミ.5 ミ.5 ファ.5 レ.5 レ.5 レ.5 ド.5 ミ.5 ソ.5 ソ.5 ミ.5 ミ.5 ミ ' +
              'レ.5 レ.5 レ.5 レ.5 レ.5 ミ.5 ファ ミ.5 ミ.5 ミ.5 ミ.5 ミ.5 ファ.5 ソ ' +
              'ソ.5 ミ.5 ミ ファ.5 レ.5 レ ド.5 ミ.5 ソ.5 ソ.5 ド2',
      bass: 'ド ソ ド ド ド ソ ド ド ソ ソ ド ド ド ソ ド ド'
    },
    {
      id: 'mary', name: 'メリーさんの ひつじ',
      melody: 'ミ レ ド レ ミ ミ ミ2 レ レ レ2 ミ ソ ソ2 ' +
              'ミ レ ド レ ミ ミ ミ ミ レ レ ミ レ ド4',
      bass: 'ド ド ド ド ソ ソ ド ド ド ド ド ド ソ ソ ド ド'
    }
  ];
  var MEL = { 'ド': 0, 'レ': 2, 'ミ': 4, 'ファ': 5, 'ソ': 7, 'ラ': 9, 'シ': 11 };
  var BASS = { 'ド': 130.81, 'ファ': 87.31 * 2, 'ソ': 98.0 };

  function parseSong(s) {
    var notes = [], beat = 0;
    s.melody.trim().split(/\s+/).forEach(function (tok) {
      var m = /^(ド|レ|ミ|ファ|ソ|ラ|シ|-)(\^|_)?([0-9.]*)$/.exec(tok);
      if (!m) throw new Error('きょくの かきかたが ちがいます：' + tok);
      var len = m[3] ? Number(m[3]) : 1;
      if (m[1] !== '-') {
        var semi = MEL[m[1]] + (m[2] === '^' ? 12 : m[2] === '_' ? -12 : 0);
        notes.push({ beat: beat, len: len, freq: 523.25 * Math.pow(2, semi / 12) });
      }
      beat += len;
    });
    var bass = s.bass.trim().split(/\s+/).map(function (n, i) {
      return { beat: i * 2, len: 2, freq: BASS[n] };
    });
    return { notes: notes, bass: bass, beats: beat };
  }
  SONGS.forEach(function (s) { var p = parseSong(s); s.notes = p.notes; s.bassNotes = p.bass; s.beats = p.beats; });

  function melodyNote(freq, t, dur, v, dest) {
    var o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    var o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 2, t);
    var g2 = ctx.createGain();
    g2.gain.value = 0.12;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    var g = ctx.createGain();
    var hold = Math.max(0.06, dur * 0.82);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.setValueAtTime(v * 0.85, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.14);
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(dest);
    o.start(t); o2.start(t);
    o.stop(t + hold + 0.2); o2.stop(t + hold + 0.2);
  }
  function bassNote(freq, t, dur, v, dest) {
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    var o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(freq, t);
    var g2 = ctx.createGain();
    g2.gain.value = 0.3;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(v * 0.4, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest);
    o.start(t); o2.start(t);
    o.stop(t + dur); o2.stop(t + dur);
  }

  // 曲を 流す。startMs（performance.now() の 時こく）に 1はくめ。reps：回数（0 は ずっと）
  function Song(song, bpm, reps, startMs) {
    var spb = 60000 / bpm;            // 1はくの ms
    var events = [];
    song.notes.forEach(function (n) { events.push({ beat: n.beat, len: n.len, freq: n.freq, bass: false }); });
    song.bassNotes.forEach(function (n) { events.push({ beat: n.beat, len: n.len, freq: n.freq, bass: true }); });
    events.sort(function (a, b) { return a.beat - b.beat; });
    var idx = 0, rep = 0, stopped = false;
    var bus = null;
    if (ensure()) {
      bus = ctx.createGain();
      bus.gain.value = 1;
      bus.connect(master);
    }
    var self = {
      spb: spb,
      totalMs: reps > 0 ? reps * song.beats * spb : Infinity,
      // ちょっと 先の 音まで よやくする（50ms ごとに よぶ）
      update: function () {
        if (stopped || !bus) return;
        var horizon = performance.now() + 300;
        while (!stopped) {
          if (idx >= events.length) {
            rep++;
            if (reps > 0 && rep >= reps) { stopped = true; break; }
            idx = 0;
          }
          var e = events[idx];
          var ms = startMs + (rep * song.beats + e.beat) * spb;
          if (ms > horizon) break;
          idx++;
          if (ms < performance.now() - 50) continue;   // おくれた 音は とばす
          var t = at(ms), dur = e.len * spb / 1000;
          if (e.bass) bassNote(e.freq, t, dur, 0.22, bus);
          else melodyNote(e.freq, t, dur, 0.2, bus);
        }
      },
      stop: function () {
        stopped = true;
        if (bus && ctx) {
          var b = bus;
          b.gain.cancelScheduledValues(ctx.currentTime);
          b.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
          setTimeout(function () { try { b.disconnect(); } catch (e) {} }, 600);
          bus = null;
        }
      }
    };
    return self;
  }

  global.Oto = {
    unlock: unlock,
    setVolume: setVolume,
    play: play,
    beep: beep,
    Song: Song,
    SONGS: SONGS,
    NOTE_NAMES: NOTE_NAMES,
    parseSong: parseSong,
    supported: !!AC
  };
})(window);
