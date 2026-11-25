// リバーシ：ルールと コンピュータの かんがえ（ぜんぶ この iPad の中で 計算する。外には 何も 送らない）
// ばんめんは 長さ n×n の 配列。ばしょ = だん × n + れつ。0：から、1：くろ、2：しろ
(function (root) {
  'use strict';

  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var WIN = 100000, INF = 1e9;

  // はじめの ならび（まんなかに 4つ）
  function initial(n) {
    var b = [], i, h = n / 2;
    for (i = 0; i < n * n; i++) b.push(0);
    b[(h - 1) * n + (h - 1)] = 2; b[h * n + h] = 2;
    b[(h - 1) * n + h] = 1; b[h * n + (h - 1)] = 1;
    return b;
  }

  // マス i に p を おいたときに ひっくりかえる マス（おけないときは から）
  function flipsAt(b, n, i, p) {
    if (b[i]) return [];
    var r = (i / n) | 0, c = i % n, o = 3 - p, out = [];
    for (var d = 0; d < 8; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1];
      var rr = r + dr, cc = c + dc, line = [];
      while (rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc] === o) {
        line.push(rr * n + cc);
        rr += dr; cc += dc;
      }
      if (line.length && rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc] === p) {
        for (var k = 0; k < line.length; k++) out.push(line[k]);
      }
    }
    return out;
  }

  // おける ところ（[{ i, flips }]）
  function legalMoves(b, n, p) {
    var out = [];
    for (var i = 0; i < n * n; i++) {
      if (b[i]) continue;
      var f = flipsAt(b, n, i, p);
      if (f.length) out.push({ i: i, flips: f });
    }
    return out;
  }

  function count(b) {
    var k = [0, 0, 0];
    for (var i = 0; i < b.length; i++) k[b[i]]++;
    return k;
  }

  // ---------- マスの よさ（かどは とても よい。かどの となりは あぶない） ----------
  var WCACHE = {};
  function weights(n) {
    if (WCACHE[n]) return WCACHE[n];
    var w = [], e = n - 1;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var er = r === 0 || r === e, ec = c === 0 || c === e;
        var nr = r === 1 || r === e - 1, nc = c === 1 || c === e - 1;
        var v;
        if (er && ec) v = 100;                       // かど
        else if (nr && nc && (r < 2 || r > e - 2) && (c < 2 || c > e - 2)) v = -40;   // かどの ななめ となり
        else if ((er && nc && (c < 2 || c > e - 2)) || (ec && nr && (r < 2 || r > e - 2))) v = -15;  // かどの よこ・たて となり
        else if (er || ec) v = 8;                    // へり
        else if (nr || nc) v = -3;
        else v = 1;
        w.push(v);
      }
    }
    WCACHE[n] = w;
    return w;
  }
  function corners(n) { return [0, n - 1, n * (n - 1), n * n - 1]; }
  // かどの ななめ となり → その かど
  function xSquares(n) {
    var e = n - 1;
    return [[n + 1, 0], [n + e - 1, e], [(e - 1) * n + 1, e * n], [(e - 1) * n + e - 1, e * n + e]];
  }

  // ---------- よむ ----------
  var nodes = 0, deadline = 0;
  var ABORT = { abort: true };

  function mobility(b, n, p) {
    var k = 0;
    for (var i = 0; i < n * n; i++) if (!b[i] && hasFlip(b, n, i, p)) k++;
    return k;
  }
  function hasFlip(b, n, i, p) {
    var r = (i / n) | 0, c = i % n, o = 3 - p;
    for (var d = 0; d < 8; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1];
      var rr = r + dr, cc = c + dc, seen = 0;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc] === o) { rr += dr; cc += dc; seen++; }
      if (seen && rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc] === p) return true;
    }
    return false;
  }

  function finalScore(b, p) {
    var k = count(b), d = k[p] - k[3 - p];
    return d > 0 ? WIN + d * 100 : d < 0 ? -WIN + d * 100 : 0;
  }

  function evaluate(b, n, p) {
    var w = weights(n), o = 3 - p, s = 0, i;
    var cs = corners(n);
    // かどが とられて いたら、となりは もう あぶなくない
    for (i = 0; i < n * n; i++) {
      var v = b[i];
      if (!v) continue;
      var wi = w[i];
      if (wi < 0 && nearTakenCorner(b, n, i)) wi = 4;
      if (v === p) s += wi; else if (v === o) s -= wi;
    }
    s += (mobility(b, n, p) - mobility(b, n, o)) * 6;
    for (i = 0; i < 4; i++) {
      if (b[cs[i]] === p) s += 20; else if (b[cs[i]] === o) s -= 20;
    }
    return s;
  }
  function nearTakenCorner(b, n, i) {
    var r = (i / n) | 0, c = i % n, e = n - 1;
    var cr = r < 2 ? 0 : r > e - 2 ? e : -1, cc = c < 2 ? 0 : c > e - 2 ? e : -1;
    if (cr < 0 || cc < 0) return false;
    return !!b[cr * n + cc];
  }

  function ordered(b, n, p) {
    var w = weights(n), ms = legalMoves(b, n, p);
    ms.sort(function (a, z) { return w[z.i] - w[a.i]; });
    return ms;
  }

  function apply(b, m, p) {
    b[m.i] = p;
    for (var k = 0; k < m.flips.length; k++) b[m.flips[k]] = p;
  }
  function unapply(b, m, p) {
    b[m.i] = 0;
    var o = 3 - p;
    for (var k = 0; k < m.flips.length; k++) b[m.flips[k]] = o;
  }

  function nm(b, n, p, depth, alpha, beta, passed) {
    if ((++nodes & 511) === 0 && deadline && Date.now() > deadline) throw ABORT;
    var ms = ordered(b, n, p);
    if (!ms.length) {
      if (passed) return finalScore(b, p);
      return -nm(b, n, 3 - p, depth, -beta, -alpha, true);
    }
    if (depth <= 0) return evaluate(b, n, p);
    var best = -INF;
    for (var k = 0; k < ms.length; k++) {
      apply(b, ms[k], p);
      var v;
      try { v = -nm(b, n, 3 - p, depth - 1, -beta, -alpha, false); }
      finally { unapply(b, ms[k], p); }
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  // ふかさ depth で いちばん よい 手（同じ点の 手を ぜんぶ かえす）
  function rootBest(b, n, p, depth, ms) {
    var best = -INF, list = [], scores = {};
    for (var k = 0; k < ms.length; k++) {
      apply(b, ms[k], p);
      var v;
      try { v = -nm(b, n, 3 - p, depth - 1, -INF, -(best - 1), false); }
      finally { unapply(b, ms[k], p); }
      scores[ms[k].i] = v;
      if (v > best) { best = v; list = [ms[k].i]; }
      else if (v === best) list.push(ms[k].i);
    }
    return { score: best, list: list, scores: scores };
  }

  // じかんの かぎり ふかく よむ
  function deepBest(b, n, p, ms, ms_) {
    deadline = Date.now() + ms_;
    nodes = 0;
    var empties = 0, done = null;
    for (var i = 0; i < n * n; i++) if (!b[i]) empties++;
    var order = ms.slice();
    try {
      for (var d = 1; d <= empties; d++) {
        var r = rootBest(b, n, p, d, order);
        done = r;
        if (Math.abs(r.score) >= WIN - 10000) break;   // かち・まけが 読みきれた
        order = order.slice().sort(function (a, z) { return r.scores[z.i] - r.scores[a.i]; });
      }
    } catch (e) {
      if (e !== ABORT) throw e;
    }
    deadline = 0;
    if (!done) done = rootBest(b, n, p, 1, ms);
    return done;
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  var LEVELS = {
    // やさしい：3回に1回くらいは てきとう。ふだんは たくさん ひっくりかえせる ところ（さきは よまない）
    easy: function (b, n, p, ms) {
      if (Math.random() < 0.33) return pick(ms).i;
      var best = -INF, bi = ms[0].i;
      ms.forEach(function (m) {
        var v = m.flips.length + Math.random() * 2.5;
        if (v > best) { best = v; bi = m.i; }
      });
      return bi;
    },
    // ふつう：3手さきまで よむ。たまに すこし あまい
    normal: function (b, n, p, ms) {
      var depth = Math.random() < 0.12 ? 1 : 3;
      var r = rootBest(b, n, p, depth, ordered(b, n, p));
      var best = -INF, bi = ms[0].i;
      ms.forEach(function (m) {
        var v = r.scores[m.i] + Math.random() * 6;
        if (v > best) { best = v; bi = m.i; }
      });
      return bi;
    },
    // つよい：じかんの かぎり ふかく よむ（さいごの ほうは 読みきる）
    strong: function (b, n, p, ms) {
      return pick(deepBest(b, n, p, ordered(b, n, p), 700).list);
    }
  };

  // コンピュータの 手（マスの 番号）。おけなければ -1
  function bestMove(cells, n, p, level) {
    var b = cells.slice();
    var ms = legalMoves(b, n, p);
    if (!ms.length) return -1;
    return (LEVELS[level] || LEVELS.normal)(b, n, p, ms);
  }

  // ヒント：{ i, kind:'corner'|'good', danger:[あいてに かどを とられやすい マス] }
  function hint(cells, n, p) {
    var b = cells.slice();
    var ms = legalMoves(b, n, p);
    if (!ms.length) return null;
    var legal = ms.map(function (m) { return m.i; });
    var danger = [];
    xSquares(n).forEach(function (xc) {
      if (!b[xc[1]] && legal.indexOf(xc[0]) >= 0) danger.push(xc[0]);
    });
    var r = deepBest(b, n, p, ordered(b, n, p), 400);
    var list = r.list.filter(function (x) { return danger.indexOf(x) < 0; });
    var i = pick(list.length ? list : r.list);
    return { i: i, kind: corners(n).indexOf(i) >= 0 ? 'corner' : 'good', danger: danger };
  }

  var api = {
    initial: initial, flipsAt: flipsAt, legalMoves: legalMoves, count: count,
    bestMove: bestMove, hint: hint
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReversiAI = api;
})(this);
