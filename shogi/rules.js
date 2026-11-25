// しょうぎの きまりと コンピュータの 考え（すべて この iPad の中で 計算する）
// ばん：sq = だん * N + すじ（だん 0 が 上＝ごての じんち、N-1 が 下＝せんての じんち）
// こま：せんて は プラス、ごて は マイナスの 数（1〜14）。もちごまは h[いろ][しゅるい]（1〜7）
(function (global) {
  'use strict';

  var FU = 1, KY = 2, KE = 3, GI = 4, KI = 5, KA = 6, HI = 7, OU = 8,
    TO = 9, NY = 10, NK = 11, NG = 12, UM = 13, RY = 14;
  var PROM = [0, TO, NY, NK, NG, 0, UM, RY, 0, 0, 0, 0, 0, 0, 0];   // なると
  var BASE = [0, FU, KY, KE, GI, KI, KA, HI, OU, FU, KY, KE, GI, KA, HI]; // もとの こま
  var DROP = 127;   // もちごまを うつ ときの from

  // 8つの むき（せんてから 見て。だん -1 が まえ）
  var DR = [-1, -1, -1, 0, 0, 1, 1, 1];
  var DC = [-1, 0, 1, -1, 1, -1, 0, 1];
  function M() { var m = 0; for (var i = 0; i < arguments.length; i++) m |= 1 << arguments[i]; return m; }
  var GOLD = M(0, 1, 2, 3, 4, 6), ORTH = M(1, 3, 4, 6), DIAG = M(0, 2, 5, 7);
  // 1つ うごける むき / どこまでも うごける むき
  var STEP0 = [0, M(1), 0, 0, M(0, 1, 2, 5, 7), GOLD, 0, 0, 255, GOLD, GOLD, GOLD, GOLD, ORTH, DIAG];
  var SLIDE0 = [0, 0, M(1), 0, 0, 0, DIAG, ORTH, 0, 0, 0, 0, 0, DIAG, ORTH];
  function flip(m) { var r = 0; for (var d = 0; d < 8; d++) if (m >> d & 1) r |= 1 << (7 - d); return r; }
  var STEPM = [null, STEP0, STEP0.map(flip)];
  var SLIDEM = [null, SLIDE0, SLIDE0.map(flip)];
  var ATKM = [null, STEP0.map(function (x, i) { return x | SLIDE0[i]; }), null];
  ATKM[2] = ATKM[1].map(flip);

  // こまの ねうち（コンピュータが 考えるときに つかう）
  var VAL = [0, 90, 260, 290, 460, 510, 680, 820, 0, 480, 480, 480, 480, 900, 1050];
  var HVAL = [0, 105, 280, 320, 500, 550, 730, 880];

  // ---------- ばんの かたち ----------
  var GEO = {};
  function geo(n) {
    if (GEO[n]) return GEO[n];
    var sz = n * n, nb = new Int16Array(sz * 8), row = new Int8Array(sz), col = new Int8Array(sz);
    var kn = [null, [], []];
    for (var sq = 0; sq < sz; sq++) {
      var r = (sq / n) | 0, c = sq % n;
      row[sq] = r; col[sq] = c;
      for (var d = 0; d < 8; d++) {
        var rr = r + DR[d], cc = c + DC[d];
        nb[sq * 8 + d] = rr >= 0 && rr < n && cc >= 0 && cc < n ? rr * n + cc : -1;
      }
      for (var p = 1; p <= 2; p++) {
        var f = p === 1 ? -1 : 1, list = [];
        [-1, 1].forEach(function (dc) {
          var r2 = r + 2 * f, c2 = c + dc;
          if (r2 >= 0 && r2 < n && c2 >= 0 && c2 < n) list.push(r2 * n + c2);
        });
        kn[p][sq] = list;
      }
    }
    GEO[n] = { n: n, sz: sz, z: n === 5 ? 1 : 3, nb: nb, row: row, col: col, kn: kn };
    return GEO[n];
  }
  // あいての いちばん おくから 何だんめか（0 が いちばん おく）
  function rel(g, c, sq) { return c === 1 ? g.row[sq] : g.n - 1 - g.row[sq]; }
  function isDead(g, c, t, sq) {
    var r = rel(g, c, sq);
    return ((t === FU || t === KY) && r === 0) || (t === KE && r <= 1);
  }

  // ---------- はじめの ならべかた ----------
  function create(kind) {
    var n = kind === 'mini' ? 5 : 9;
    var b = new Int8Array(n * n);
    function put(r, c, p) { b[r * n + c] = p; }
    var i;
    if (n === 5) {
      // 5五しょうぎ：下は 玉 金 銀 角 飛、玉の まえに 歩
      [OU, KI, GI, KA, HI].forEach(function (t, c) { put(4, c, t); put(0, 4 - c, -t); });
      put(3, 0, FU);
      put(1, 4, -FU);
    } else {
      var back = [KY, KE, GI, KI, OU, KI, GI, KE, KY];
      for (i = 0; i < 9; i++) { put(8, i, back[i]); put(0, i, -back[i]); put(6, i, FU); put(2, i, -FU); }
      put(7, 1, KA); put(7, 7, HI);
      put(1, 1, -HI); put(1, 7, -KA);
    }
    var s = { n: n, g: geo(n), b: b, h: [null, new Int8Array(8), new Int8Array(8)], turn: 1, k: [0, 0, 0] };
    for (i = 0; i < n * n; i++) {
      if (b[i] === OU) s.k[1] = i;
      if (b[i] === -OU) s.k[2] = i;
    }
    return s;
  }
  function clone(s) {
    return { n: s.n, g: s.g, b: new Int8Array(s.b), h: [null, new Int8Array(s.h[1]), new Int8Array(s.h[2])], turn: s.turn, k: s.k.slice() };
  }
  function key(s) {
    return Array.prototype.join.call(s.b, ',') + '|' + Array.prototype.join.call(s.h[1], '') + '|' + Array.prototype.join.call(s.h[2], '') + '|' + s.turn;
  }

  // ---------- て（数 1つで あらわす） ----------
  function mv(from, to, pro, drop) { return to | (from << 7) | (pro << 14) | (drop << 15); }
  function decode(m) {
    var from = (m >> 7) & 127;
    return { to: m & 127, from: from === DROP ? -1 : from, promo: !!((m >> 14) & 1), drop: m >> 15 };
  }

  // いろ c の こまが sq に きいているか
  function attacked(s, sq, c) {
    var b = s.b, g = s.g, nb = g.nb, sg = c === 1 ? 1 : -1, am = ATKM[c], sm = SLIDEM[c];
    for (var d = 0; d < 8; d++) {
      var q = nb[sq * 8 + d];
      if (q < 0) continue;
      var p = b[q], od = 7 - d;
      if (p) {
        if (p * sg > 0 && (am[p * sg] >> od & 1)) return true;
        continue;
      }
      q = nb[q * 8 + d];
      while (q >= 0) {
        p = b[q];
        if (p) {
          if (p * sg > 0 && (sm[p * sg] >> od & 1)) return true;
          break;
        }
        q = nb[q * 8 + d];
      }
    }
    var kn = g.kn[3 - c][sq];
    for (var i = 0; i < kn.length; i++) if (b[kn[i]] === sg * KE) return true;
    return false;
  }
  function inCheck(s, c) { return attacked(s, s.k[c || s.turn], 3 - (c || s.turn)); }

  // て を つくる。mode 0：ぜんぶ　1：コンピュータ用（なれるのに ならない 歩・角・飛は はぶく）　2：とる ても だけ
  function gen(s, out, mode) {
    var c = s.turn, sg = c === 1 ? 1 : -1, b = s.b, g = s.g, n = g.n, sz = g.sz, nb = g.nb, z = g.z;
    var stm = STEPM[c], slm = SLIDEM[c];
    function add(from, to, t, x) {
      if (mode === 2 && !x) return;
      if (PROM[t] && (rel(g, c, from) < z || rel(g, c, to) < z)) {
        out.push(mv(from, to, 1, 0));
        if (!isDead(g, c, t, to) && !(mode !== 0 && (t === FU || t === KA || t === HI))) out.push(mv(from, to, 0, 0));
      } else {
        out.push(mv(from, to, 0, 0));
      }
    }
    var sq, q, x, d;
    for (sq = 0; sq < sz; sq++) {
      var t = b[sq] * sg;
      if (t <= 0) continue;
      var st = stm[t], sl = slm[t];
      for (d = 0; d < 8; d++) {
        if (sl >> d & 1) {
          q = nb[sq * 8 + d];
          while (q >= 0) {
            x = b[q];
            if (x * sg > 0) break;
            add(sq, q, t, x);
            if (x) break;
            q = nb[q * 8 + d];
          }
        } else if (st >> d & 1) {
          q = nb[sq * 8 + d];
          if (q >= 0 && b[q] * sg <= 0) add(sq, q, t, b[q]);
        }
      }
      if (t === KE) {
        var kn = g.kn[c][sq];
        for (var i = 0; i < kn.length; i++) if (b[kn[i]] * sg <= 0) add(sq, kn[i], t, b[kn[i]]);
      }
    }
    if (mode === 2) return out;
    var hh = s.h[c], cols = 0;
    for (sq = 0; sq < sz; sq++) if (b[sq] === sg * FU) cols |= 1 << g.col[sq];
    for (var tt = 1; tt <= 7; tt++) {
      if (!hh[tt]) continue;
      for (sq = 0; sq < sz; sq++) {
        if (b[sq]) continue;
        if (isDead(g, c, tt, sq)) continue;
        if (tt === FU && (cols >> g.col[sq] & 1)) continue;   // にふ
        out.push(mv(DROP, sq, 0, tt));
      }
    }
    return out;
  }

  // うごかす / もどす（もどすときは とった こまを わたす）
  function make(s, m) {
    var to = m & 127, from = (m >> 7) & 127, c = s.turn, sg = c === 1 ? 1 : -1, b = s.b, cap = 0;
    if (from === DROP) {
      var dt = m >> 15;
      b[to] = sg * dt;
      s.h[c][dt]--;
    } else {
      var p = b[from];
      cap = b[to];
      if (cap) s.h[c][BASE[cap * -sg]]++;
      b[to] = (m >> 14) & 1 ? sg * PROM[p * sg] : p;
      b[from] = 0;
      if (p * sg === OU) s.k[c] = to;
    }
    s.turn = 3 - c;
    return cap;
  }
  function unmake(s, m, cap) {
    var to = m & 127, from = (m >> 7) & 127, c = 3 - s.turn, sg = c === 1 ? 1 : -1, b = s.b;
    s.turn = c;
    if (from === DROP) {
      b[to] = 0;
      s.h[c][m >> 15]++;
    } else {
      var p = b[to];
      b[from] = (m >> 14) & 1 ? sg * BASE[p * sg] : p;
      b[to] = cap;
      if (cap) s.h[c][BASE[cap * -sg]]--;
      if (p * sg === OU) s.k[c] = from;
    }
  }

  function hasLegal(s) {
    var list = gen(s, [], 0), c = s.turn;
    for (var i = 0; i < list.length; i++) {
      var cap = make(s, list[i]);
      var ok = !attacked(s, s.k[c], 3 - c);
      unmake(s, list[i], cap);
      if (ok) return true;
    }
    return false;
  }
  // うごかした あとに よんで、はんそくで ないか（c は うごかした ひと）
  // 0：だいじょうぶ　1：おうが とられる　2：うちふづめ
  function badAfter(s, m, c) {
    if (attacked(s, s.k[c], 3 - c)) return 1;
    if ((m >> 15) === FU) {
      var ahead = s.g.nb[(m & 127) * 8 + (c === 1 ? 1 : 6)];
      if (ahead === s.k[3 - c] && !hasLegal(s)) return 2;
    }
    return 0;
  }
  // いま させる て（ぜんぶ）
  function legal(s) {
    var list = gen(s, [], 0), out = [], c = s.turn;
    for (var i = 0; i < list.length; i++) {
      var cap = make(s, list[i]);
      if (!badAfter(s, list[i], c)) out.push(list[i]);
      unmake(s, list[i], cap);
    }
    return out;
  }
  // そこに うごけない わけ（from が -1 なら もちごま drop を うつ）
  function explain(s, from, drop, to) {
    var c = s.turn, sg = c === 1 ? 1 : -1, g = s.g;
    var list = gen(s, [], 0).filter(function (m) {
      var d = decode(m);
      return d.to === to && (from >= 0 ? d.from === from : d.drop === drop);
    });
    if (!list.length) {
      if (from < 0) {
        if (s.b[to]) return 'occupied';
        if (isDead(g, c, drop, to)) return 'dead';
        if (drop === FU) {
          for (var r = 0; r < g.n; r++) if (s.b[r * g.n + g.col[to]] === sg * FU) return 'nifu';
        }
      }
      return 'no';
    }
    var why = 'no';
    for (var i = 0; i < list.length; i++) {
      var cap = make(s, list[i]);
      var bad = badAfter(s, list[i], c);
      unmake(s, list[i], cap);
      if (bad === 1) why = 'king';
      if (bad === 2) why = 'uchifu';
    }
    return why;
  }

  // ---------- コンピュータの 考え ----------
  function evaluate(s) {
    var b = s.b, g = s.g, sz = g.sz, row = g.row, col = g.col, n = g.n, v = 0;
    var k1 = s.k[1], k2 = s.k[2];
    var r1 = row[k1], c1 = col[k1], r2 = row[k2], c2 = col[k2];
    for (var sq = 0; sq < sz; sq++) {
      var p = b[sq];
      if (!p) continue;
      var t = p > 0 ? p : -p, r = row[sq], c = col[sq], x = VAL[t];
      if (t !== OU) {
        // あいての おうに ちかい こま・じぶんの おうを まもる こま
        var dE, dO;
        if (p > 0) {
          dE = Math.max(Math.abs(r - r2), Math.abs(c - c2));
          dO = Math.max(Math.abs(r - r1), Math.abs(c - c1));
        } else {
          dE = Math.max(Math.abs(r - r1), Math.abs(c - c1));
          dO = Math.max(Math.abs(r - r2), Math.abs(c - c2));
        }
        x += dE <= 1 ? 26 : dE === 2 ? 15 : dE === 3 ? 6 : 0;
        if (t === KI || t === GI || (t >= TO && t <= NG)) x += dO <= 1 ? 22 : dO === 2 ? 10 : 0;
        if (t === FU) x += 3 * (p > 0 ? n - 1 - r : r);
      }
      v += p > 0 ? x : -x;
    }
    for (var h = 1; h <= 7; h++) v += (s.h[1][h] - s.h[2][h]) * HVAL[h];
    return v;
  }

  var MATE = 1000000, INF = 10000000, ABORT = { abort: true };
  var nodes = 0, deadline = 0, killers = new Int32Array(256);
  function tick() {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw ABORT;
  }
  function order(s, list, ply, first) {
    var b = s.b, sc = new Array(list.length), idx = new Array(list.length), i;
    var k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    for (i = 0; i < list.length; i++) {
      var m = list[i], to = m & 127, from = (m >> 7) & 127, v = 0;
      if (from !== DROP) {
        var x = b[to];
        if (x) v = 100000 + VAL[x > 0 ? x : -x] * 10 - VAL[b[from] > 0 ? b[from] : -b[from]];
        if ((m >> 14) & 1) v += 3000;
      } else {
        v = -500;
      }
      if (m === k1 || m === k2) v += 50000;
      if (m === first) v = INF;
      sc[i] = v;
      idx[i] = i;
    }
    idx.sort(function (a, z) { return sc[z] - sc[a]; });
    return idx.map(function (j) { return list[j]; });
  }
  function qs(s, alpha, beta, ply, qd) {
    tick();
    var c = s.turn, chk = attacked(s, s.k[c], 3 - c), best, list;
    if (!chk) {
      var stand = evaluate(s) * (c === 1 ? 1 : -1);
      if (stand >= beta || qd >= 6) return stand;
      if (stand > alpha) alpha = stand;
      best = stand;
      list = gen(s, [], 2);
    } else {
      if (qd >= 3) return evaluate(s) * (c === 1 ? 1 : -1) - 60;
      best = -INF;
      list = gen(s, [], 1);
    }
    list = order(s, list, ply, 0);
    var any = false;
    for (var i = 0; i < list.length; i++) {
      var m = list[i], cap = make(s, m);
      if (badAfter(s, m, c)) { unmake(s, m, cap); continue; }
      any = true;
      var v = -qs(s, -beta, -alpha, ply + 1, qd + 1);
      unmake(s, m, cap);
      if (v > best) {
        best = v;
        if (v > alpha) { alpha = v; if (alpha >= beta) break; }
      }
    }
    if (chk && !any) return -MATE + ply;
    return best;
  }
  function ab(s, depth, alpha, beta, ply) {
    if (depth <= 0) return qs(s, alpha, beta, ply, 0);
    tick();
    var c = s.turn, list = order(s, gen(s, [], 1), ply, 0), any = false, best = -INF;
    for (var i = 0; i < list.length; i++) {
      var m = list[i], cap = make(s, m);
      if (badAfter(s, m, c)) { unmake(s, m, cap); continue; }
      any = true;
      var v = -ab(s, depth - 1, -beta, -alpha, ply + 1);
      unmake(s, m, cap);
      if (v > best) {
        best = v;
        if (v > alpha) {
          alpha = v;
          if (alpha >= beta) {
            if (!cap && killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
            break;
          }
        }
      }
    }
    if (!any) return -MATE + ply;
    return best;
  }
  // いちばん よい て を さがす。opt = { depth, time, noise }
  function think(s0, opt) {
    var s = clone(s0), c = s.turn;
    var root = gen(s, [], 1).filter(function (m) {
      var cap = make(s, m), ok = !badAfter(s, m, c);
      unmake(s, m, cap);
      return ok;
    });
    if (!root.length) return { m: -1, v: -MATE };
    var noise = {};
    root.forEach(function (m) { noise[m] = opt.noise ? (Math.random() * 2 - 1) * opt.noise : 0; });
    killers = new Int32Array(256);
    nodes = 0;
    var t0 = Date.now(), best = root[0], bestV = -INF;
    for (var depth = 1; depth <= opt.depth; depth++) {
      deadline = depth === 1 ? Infinity : t0 + opt.time;
      var list = order(s, root, 0, best), cur = list[0], curV = -INF, alpha = -INF;
      try {
        for (var i = 0; i < list.length; i++) {
          var m = list[i], nz = noise[m], cap = make(s, m);
          var v;
          try { v = -ab(s, depth - 1, -INF, -(alpha - nz), 1) + nz; }
          finally { unmake(s, m, cap); }
          if (v > curV) { curV = v; cur = m; if (v > alpha) alpha = v; }
        }
      } catch (e) {
        if (e !== ABORT) throw e;
        break;
      }
      best = cur;
      bestV = curV;
      if (Math.abs(bestV) > MATE - 1000) break;
      if (Date.now() - t0 > opt.time * 0.45) break;
    }
    return { m: best, v: bestV };
  }
  function bestMove(s, level) {
    var mini = s.n === 5, opt;
    if (level === 'easy') opt = { depth: 1, time: 800, noise: Math.random() < 0.3 ? 500 : 150 };
    else if (level === 'normal') opt = { depth: 3, time: mini ? 1500 : 1200, noise: 35 };
    else opt = { depth: 12, time: mini ? 1300 : 1800, noise: 4 };
    return think(s, opt).m;
  }

  // ヒント：よい て と、ねらわれて いる こま
  function hint(s0) {
    var s = clone(s0), c = s.turn;
    var r = think(s, { depth: s.n === 5 ? 3 : 2, time: 900, noise: 0 });
    if (r.m < 0) return null;
    var d = decode(r.m);
    var capT = d.from >= 0 && s.b[d.to] ? BASE[Math.abs(s.b[d.to])] : 0;
    var cap = make(s, r.m);
    var check = attacked(s, s.k[s.turn], c);
    var mate = check && !hasLegal(s);
    unmake(s, r.m, cap);
    return { m: r.m, from: d.from, to: d.to, drop: d.drop, promo: d.promo, cap: capT, check: check, mate: mate,
      inCheck: inCheck(s, c), danger: danger(s, c) };
  }
  // ねらわれて いる こま（まもりが ないか、大きな こま）
  function danger(s, c) {
    var out = [], sg = c === 1 ? 1 : -1;
    for (var sq = 0; sq < s.g.sz; sq++) {
      var t = s.b[sq] * sg;
      if (t <= 0 || t === OU) continue;
      if (!attacked(s, sq, 3 - c)) continue;
      if (!attacked(s, sq, c) || VAL[t] >= 460) out.push(sq);
    }
    return out;
  }

  global.ShogiRules = {
    FU: FU, KY: KY, KE: KE, GI: GI, KI: KI, KA: KA, HI: HI, OU: OU,
    TO: TO, NY: NY, NK: NK, NG: NG, UM: UM, RY: RY,
    PROM: PROM, BASE: BASE, STEP0: STEP0, SLIDE0: SLIDE0, DR: DR, DC: DC,
    create: create, clone: clone, key: key, decode: decode,
    legal: legal, make: make, inCheck: inCheck, hasLegal: hasLegal, explain: explain,
    bestMove: bestMove, hint: hint, danger: danger,
    inZone: function (s, c, sq) { return rel(s.g, c, sq) < s.g.z; }
  };
})(window);
