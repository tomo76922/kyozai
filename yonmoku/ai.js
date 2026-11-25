// よんもくならべ：コンピュータの かんがえ（ぜんぶ この iPad の中で 計算する。外には 何も 送らない）
// ばんめんは 長さ42の 配列。ばしょ = れつ × 6 + だん（だんは 下が 0）。0：から、1：あか、2：きいろ
(function (root) {
  'use strict';

  var COLS = 7, ROWS = 6, N = COLS * ROWS;
  var WIN = 100000, INF = 1e9;
  var ORDER = [3, 2, 4, 1, 5, 0, 6];          // まんなかから しらべる（よい手が さきに 見つかる）

  // 4つ ならぶ ばしょ（69とおり）と、マスごとに それを ふくむ ならび
  var WINDOWS = [];
  var CELL_WIN = [];
  (function () {
    var i, c, r, k, d;
    for (i = 0; i < N; i++) CELL_WIN.push([]);
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (c = 0; c < COLS; c++) {
      for (r = 0; r < ROWS; r++) {
        for (d = 0; d < 4; d++) {
          var ec = c + dirs[d][0] * 3, er = r + dirs[d][1] * 3;
          if (ec < 0 || ec >= COLS || er < 0 || er >= ROWS) continue;
          var w = [];
          for (k = 0; k < 4; k++) w.push((c + dirs[d][0] * k) * ROWS + (r + dirs[d][1] * k));
          var wi = WINDOWS.length;
          WINDOWS.push(w);
          for (k = 0; k < 4; k++) CELL_WIN[w[k]].push(wi);
        }
      }
    }
  })();

  // マス i に p を おいたら 4つ ならぶか（i は まだ からでも よい）
  function winsAt(b, i, p) {
    var ws = CELL_WIN[i];
    for (var k = 0; k < ws.length; k++) {
      var w = WINDOWS[ws[k]];
      if ((w[0] === i || b[w[0]] === p) && (w[1] === i || b[w[1]] === p) &&
          (w[2] === i || b[w[2]] === p) && (w[3] === i || b[w[3]] === p)) return true;
    }
    return false;
  }

  // ばめんの よさ（p から 見て）
  var OWN = [0, 1, 5, 40, 0];
  var OPP = [0, 1, 6, 48, 0];
  function evaluate(b, p) {
    var s = 0, o = 3 - p;
    for (var k = 0; k < WINDOWS.length; k++) {
      var w = WINDOWS[k], cp = 0, co = 0;
      for (var j = 0; j < 4; j++) {
        var v = b[w[j]];
        if (v === p) cp++; else if (v === o) co++;
      }
      if (cp && co) continue;
      if (cp) s += OWN[cp]; else if (co) s -= OPP[co];
    }
    for (var r = 0; r < ROWS; r++) {           // まんなかの れつは つよい
      var x = b[3 * ROWS + r];
      if (x === p) s += 4; else if (x === o) s -= 4;
    }
    return s;
  }

  var nodes = 0, deadline = 0;
  var ABORT = { abort: true };

  function nm(b, h, p, depth, alpha, beta, ply, mc) {
    if ((++nodes & 1023) === 0 && deadline && Date.now() > deadline) throw ABORT;
    if (mc >= N) return 0;
    var c, k, i;
    for (c = 0; c < COLS; c++) {               // すぐ かてる 手が あれば それ
      if (h[c] < ROWS && winsAt(b, c * ROWS + h[c], p)) return WIN - ply;
    }
    if (depth <= 0) return evaluate(b, p);
    // あいてが すぐ かてる ばしょが あれば、そこに おくしか ない
    var o = 3 - p, forced = -1, nForced = 0;
    for (c = 0; c < COLS; c++) {
      if (h[c] < ROWS && winsAt(b, c * ROWS + h[c], o)) { forced = c; nForced++; }
    }
    if (nForced > 1) return -(WIN - ply - 1);
    var best = -INF;
    for (k = 0; k < COLS; k++) {
      c = ORDER[k];
      if (h[c] >= ROWS) continue;
      if (forced >= 0 && c !== forced) continue;
      i = c * ROWS + h[c];
      b[i] = p; h[c]++;
      var v = -nm(b, h, o, depth - 1, -beta, -alpha, ply + 1, mc + 1);
      h[c]--; b[i] = 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  function prep(cells) {
    var b = new Int8Array(N), h = new Int8Array(COLS), mc = 0;
    for (var c = 0; c < COLS; c++) {
      for (var r = 0; r < ROWS; r++) {
        var v = cells[c * ROWS + r] | 0;
        b[c * ROWS + r] = v;
        if (v) { h[c] = r + 1; mc++; }
      }
    }
    return { b: b, h: h, mc: mc };
  }
  function legal(h) {
    var a = [];
    for (var c = 0; c < COLS; c++) if (h[c] < ROWS) a.push(c);
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // それぞれの 手の 点数（ちいさい ふかさ用。ぜんぶ ちゃんと 計算する）
  function allScores(P, p, depth) {
    var out = {};
    legal(P.h).forEach(function (c) {
      var i = c * ROWS + P.h[c];
      if (winsAt(P.b, i, p)) { out[c] = WIN; return; }
      P.b[i] = p; P.h[c]++;
      out[c] = -nm(P.b, P.h, 3 - p, depth - 1, -INF, INF, 1, P.mc + 1);
      P.h[c]--; P.b[i] = 0;
    });
    return out;
  }

  // ふかさ depth で いちばん よい 手（同じ点の 手を ぜんぶ かえす）
  function rootBest(P, p, depth, order) {
    var best = -INF, list = [];
    for (var k = 0; k < order.length; k++) {
      var c = order[k];
      if (P.h[c] >= ROWS) continue;
      var i = c * ROWS + P.h[c], v;
      if (winsAt(P.b, i, p)) v = WIN;
      else {
        P.b[i] = p; P.h[c]++;
        try { v = -nm(P.b, P.h, 3 - p, depth - 1, -INF, -(best - 1), 1, P.mc + 1); }
        finally { P.h[c]--; P.b[i] = 0; }
      }
      if (v > best) { best = v; list = [c]; }
      else if (v === best) list.push(c);
    }
    return { score: best, list: list };
  }

  // よく かんがえる（じかんの かぎり ふかく よむ）
  function deepBest(P, p, ms) {
    deadline = Date.now() + ms;
    nodes = 0;
    var order = ORDER.slice(), done = null;
    try {
      for (var d = 1; d <= N - P.mc; d++) {
        var r = rootBest(P, p, d, order);
        done = r;
        if (Math.abs(r.score) >= WIN - 100) break;   // かち・まけが 読みきれた
        order = r.list.concat(ORDER.filter(function (c) { return r.list.indexOf(c) < 0; }));
      }
    } catch (e) {
      if (e !== ABORT) throw e;
    }
    deadline = 0;
    if (!done) done = rootBest(P, p, 1, ORDER);
    return done;
  }

  var LEVELS = {
    // やさしい：ときどき まちがえる（3回に1回くらいは てきとうに おく。よむのは 1手さきまで）
    easy: function (P, p) {
      var moves = legal(P.h);
      if (Math.random() < 0.33) return pick(moves);
      var s = allScores(P, p, 2), best = -INF, bc = moves[0];
      moves.forEach(function (c) {
        var v = s[c] + Math.random() * 30;
        if (v > best) { best = v; bc = c; }
      });
      return bc;
    },
    // ふつう：4手さきまで よむ。たまに すこし あまい
    normal: function (P, p) {
      var moves = legal(P.h);
      var depth = Math.random() < 0.12 ? 2 : 4;
      var s = allScores(P, p, depth), best = -INF, bc = moves[0];
      moves.forEach(function (c) {
        var v = s[c] + Math.random() * 8;
        if (v > best) { best = v; bc = c; }
      });
      return bc;
    },
    // つよい：じかんの かぎり ふかく よむ
    strong: function (P, p) {
      return pick(deepBest(P, p, 700).list);
    }
  };

  // コンピュータの 手（れつの 番号 0〜6）
  function bestMove(cells, p, level) {
    var P = prep(cells);
    if (!legal(P.h).length) return -1;
    return (LEVELS[level] || LEVELS.normal)(P, p);
  }

  // ヒント：{ col, kind:'win'|'block'|'good', danger:[おくと あいてが すぐ かてる れつ] }
  function hint(cells, p) {
    var P = prep(cells), o = 3 - p;
    var moves = legal(P.h);
    if (!moves.length) return null;
    var danger = [];
    moves.forEach(function (c) {
      var r = P.h[c];
      if (r + 1 < ROWS) {
        P.b[c * ROWS + r] = p;
        if (winsAt(P.b, c * ROWS + r + 1, o) && !winsAt(P.b, c * ROWS + r, p)) danger.push(c);
        P.b[c * ROWS + r] = 0;
      }
    });
    var c, k;
    for (k = 0; k < COLS; k++) {
      c = ORDER[k];
      if (P.h[c] < ROWS && winsAt(P.b, c * ROWS + P.h[c], p)) return { col: c, kind: 'win', danger: danger };
    }
    for (k = 0; k < COLS; k++) {
      c = ORDER[k];
      if (P.h[c] < ROWS && winsAt(P.b, c * ROWS + P.h[c], o)) return { col: c, kind: 'block', danger: danger };
    }
    var r = deepBest(P, p, 400);
    var list = r.list.filter(function (x) { return danger.indexOf(x) < 0; });
    return { col: pick(list.length ? list : r.list), kind: 'good', danger: danger };
  }

  // おいた マスを ふくむ 4つ いじょうの ならび（光らせる マス）。なければ null
  function winLine(cells, c, r) {
    var p = cells[c * ROWS + r];
    if (!p) return null;
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (var d = 0; d < 4; d++) {
      var line = [[c, r]];
      for (var s = -1; s <= 1; s += 2) {
        var x = c + dirs[d][0] * s, y = r + dirs[d][1] * s;
        while (x >= 0 && x < COLS && y >= 0 && y < ROWS && cells[x * ROWS + y] === p) {
          if (s < 0) line.unshift([x, y]); else line.push([x, y]);
          x += dirs[d][0] * s; y += dirs[d][1] * s;
        }
      }
      if (line.length >= 4) return line;
    }
    return null;
  }

  var api = { COLS: COLS, ROWS: ROWS, bestMove: bestMove, hint: hint, winLine: winLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YonmokuAI = api;
})(this);
