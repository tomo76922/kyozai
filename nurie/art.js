// ぬりえ：線画の データ（画像ファイルは 使わず、ここで 形を 作る）
// ・どの 絵も この教材の ために 作った オリジナル（実在の 商品の パッケージや ロゴは 描かない）
// ・1まいの 絵は 400×400。regions（ぬれる 場所）と deco（上に かさねる 線や 目。ぬれない）で できている
// ・regions は 描く じゅん（あとの ものが 上）。ぬる 場所は 大きめに して、細かく しすぎない
// ・regions の 0ばんは かならず うしろの 背景（めで ぬる ときは さいごに 光る）
// ・形は SVG の パス（M L C Q A Z の 大文字だけ）。画面の 絵と、写真に 保存する 画像の 両方に 使う
(function () {
  'use strict';

  var INK = '#3d3a35';

  // ---------- 形を 作る 道具 ----------
  function n(v) { return Math.round(v * 10) / 10; }
  function C(cx, cy, r) {
    return 'M' + n(cx - r) + ' ' + n(cy) + ' A' + n(r) + ' ' + n(r) + ' 0 1 0 ' + n(cx + r) + ' ' + n(cy) +
      ' A' + n(r) + ' ' + n(r) + ' 0 1 0 ' + n(cx - r) + ' ' + n(cy) + ' Z';
  }
  // だ円（deg だけ かたむける）
  function E(cx, cy, rx, ry, deg) {
    var a = (deg || 0) * Math.PI / 180, c = Math.cos(a) * rx, s = Math.sin(a) * rx;
    return 'M' + n(cx - c) + ' ' + n(cy - s) + ' A' + n(rx) + ' ' + n(ry) + ' ' + n(deg || 0) + ' 1 0 ' + n(cx + c) + ' ' + n(cy + s) +
      ' A' + n(rx) + ' ' + n(ry) + ' ' + n(deg || 0) + ' 1 0 ' + n(cx - c) + ' ' + n(cy - s) + ' Z';
  }
  // かどの まるい 四角
  function R(x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    if (!r) return P([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    return 'M' + n(x + r) + ' ' + n(y) + ' L' + n(x + w - r) + ' ' + n(y) + ' A' + r + ' ' + r + ' 0 0 1 ' + n(x + w) + ' ' + n(y + r) +
      ' L' + n(x + w) + ' ' + n(y + h - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + n(x + w - r) + ' ' + n(y + h) +
      ' L' + n(x + r) + ' ' + n(y + h) + ' A' + r + ' ' + r + ' 0 0 1 ' + n(x) + ' ' + n(y + h - r) +
      ' L' + n(x) + ' ' + n(y + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + n(x + r) + ' ' + n(y) + ' Z';
  }
  function P(pts) {
    return 'M' + pts.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join(' L') + ' Z';
  }
  function polar(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }

  // うごかす・大きさを かえる・まわす・左右を はんてん（パスの 中の 点を 計算しなおす）
  // m = [a, b, c, d, e, f] … x' = a*x + c*y + e、 y' = b*x + d*y + f
  function mul(m1, m2) {   // m1 の あとに m2
    return [
      m2[0] * m1[0] + m2[2] * m1[1], m2[1] * m1[0] + m2[3] * m1[1],
      m2[0] * m1[2] + m2[2] * m1[3], m2[1] * m1[2] + m2[3] * m1[3],
      m2[0] * m1[4] + m2[2] * m1[5] + m2[4], m2[1] * m1[4] + m2[3] * m1[5] + m2[5]
    ];
  }
  var M = {
    t: function (dx, dy) { return [1, 0, 0, 1, dx, dy]; },
    s: function (s) { return [s, 0, 0, s, 0, 0]; },
    r: function (deg, cx, cy) {
      var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
    },
    mx: function (x) { return [-1, 0, 0, 1, 2 * x, 0]; },
    of: function () {   // M.of(m1, m2, …)：じゅんばんに かける
      return Array.prototype.reduce.call(arguments, function (acc, m) { return mul(acc, m); }, [1, 0, 0, 1, 0, 0]);
    }
  };
  var NUM = { M: 2, L: 2, T: 2, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
  function X(d, m) {
    var tk = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
    var det = m[0] * m[3] - m[1] * m[2];
    var sc = Math.sqrt(Math.abs(det));
    var rot = Math.atan2(m[1], m[0]) * 180 / Math.PI;
    var out = [], i = 0, cmd = '';
    function pt(x, y) { return n(m[0] * x + m[2] * y + m[4]) + ' ' + n(m[1] * x + m[3] * y + m[5]); }
    while (i < tk.length) {
      if (/[A-Za-z]/.test(tk[i])) {
        cmd = tk[i++];
        if (!(cmd in NUM)) throw new Error('nurie art: ' + cmd + ' は つかえません');
        out.push(cmd);
        if (cmd === 'Z') continue;
      }
      var k = NUM[cmd], v = tk.slice(i, i + k).map(Number);
      i += k;
      if (cmd === 'A') {
        var ang = det < 0 ? rot - v[2] : rot + v[2];
        out.push(n(v[0] * sc) + ' ' + n(v[1] * sc) + ' ' + n(ang) + ' ' + v[3] + ' ' + (det < 0 ? 1 - v[4] : v[4]) + ' ' + pt(v[5], v[6]));
      } else {
        var s = [];
        for (var j = 0; j < k; j += 2) s.push(pt(v[j], v[j + 1]));
        out.push(s.join(' '));
      }
    }
    return out.join(' ');
  }
  function XA(list, m) { return list.map(function (d) { return X(d, m); }); }

  // よく つかう 形
  var BG = R(6, 6, 388, 388, 28);
  // 下の じめん（背景の かどに あわせて まるく）
  function ground(y, bump) {
    return 'M6 ' + y + ' Q200 ' + (y - (bump == null ? 36 : bump)) + ' 394 ' + y + ' L394 366 A28 28 0 0 1 366 394 L34 394 A28 28 0 0 1 6 366 Z';
  }
  // ほし（とがった 数・外と 内の 大きさ）
  function star(cx, cy, ro, ri, k, deg) {
    var p = [];
    for (var i = 0; i < k * 2; i++) p.push(polar(cx, cy, i % 2 ? ri : ro, (deg == null ? -90 : deg) + i * 180 / k));
    return P(p);
  }
  // 目（黒目と 光）… deco
  function eye(x, y, rx, ry) {
    return [
      { d: E(x, y, rx, ry), f: INK, w: 0 },
      { d: C(x + rx * 0.33, y - ry * 0.38, rx * 0.4), f: '#ffffff', w: 0 }
    ];
  }
  function dot(x, y, r) { return { d: C(x, y, r), f: INK, w: 0 }; }
  function line(d, w) { return { d: d, w: w || 5 }; }

  // ---------- きせつ ----------
  var KISETSU = [];

  // はる：さくら
  (function () {
    var petal = 'M200 200 C140 160 128 92 168 58 C180 48 192 56 200 74 C208 56 220 48 232 58 C272 92 260 160 200 200 Z';
    var regions = [BG];
    var deco = [];
    for (var i = 0; i < 5; i++) regions.push(X(petal, M.r(i * 72, 200, 205)));
    regions.push(C(200, 205, 36));
    for (i = 0; i < 5; i++) {
      var a = 36 + i * 72 - 90;
      var p1 = polar(200, 205, 36, a), p2 = polar(200, 205, 62, a);
      deco.push(line('M' + n(p1[0]) + ' ' + n(p1[1]) + ' L' + n(p2[0]) + ' ' + n(p2[1]), 4));
      deco.push(dot(p2[0], p2[1], 6));
    }
    // ちる はなびら（線だけ）
    deco.push(line(X('M0 -14 C-12 -6 -8 10 0 14 C8 10 12 -6 0 -14 Z', M.of(M.r(30, 0, 0), M.t(340, 340))), 4));
    deco.push(line(X('M0 -12 C-10 -5 -7 9 0 12 C7 9 10 -5 0 -12 Z', M.of(M.r(-40, 0, 0), M.t(60, 345))), 4));
    deco.push(line(X('M0 -12 C-10 -5 -7 9 0 12 C7 9 10 -5 0 -12 Z', M.of(M.r(70, 0, 0), M.t(352, 46))), 4));
    KISETSU.push({ id: 'sakura', name: 'さくら', season: 'haru', regions: regions, deco: deco });
  })();

  // はる：こいのぼり
  KISETSU.push({
    id: 'koinobori', name: 'こいのぼり', season: 'haru',
    regions: [
      BG,
      'M262 58 C258 40 280 30 296 40 C306 20 342 22 348 42 C368 40 380 60 362 68 L270 68 C254 68 252 60 262 58 Z',
      ground(334, 40),
      R(46, 44, 18, 336, 6),
      C(55, 36, 17),
      'M66 80 C150 60 260 70 320 110 L374 72 L352 122 L374 172 L320 134 C260 168 150 180 66 160 Z',
      C(112, 110, 21),
      'M66 206 C140 192 220 200 272 228 L314 198 L298 242 L314 284 L272 256 C220 284 140 292 66 278 Z',
      C(110, 236, 17)
    ],
    deco: [
      line(E(70, 120, 10, 38), 5),
      dot(117, 110, 9), dot(114, 236, 7.5),
      line('M172 86 Q194 120 172 156', 4), line('M218 88 Q240 120 218 152', 4), line('M264 98 Q284 120 264 144', 4),
      line(E(70, 242, 8, 34), 5),
      line('M164 210 Q182 242 164 274', 4), line('M210 214 Q228 242 210 270', 4)
    ]
  });

  // はる：チューリップ
  (function () {
    var head = 'M70 95 L95 125 L120 86 L145 125 L170 95 C182 155 162 198 120 198 C78 198 58 155 70 95 Z';
    var leaf = 'M120 338 C70 310 58 262 66 222 C100 250 120 290 120 338 Z';
    var m2 = M.t(160, 34);
    KISETSU.push({
      id: 'tulip', name: 'チューリップ', season: 'haru',
      regions: [
        BG,
        C(338, 62, 36),
        R(112, 190, 16, 170, 4),
        X(R(112, 190, 16, 170, 4), m2),
        leaf,
        X(leaf, M.of(M.mx(120), m2)),
        head,
        X(head, m2),
        ground(320, 30)
      ],
      deco: [
        line('M120 100 L120 150', 4), line(X('M120 100 L120 150', m2), 4),
        line('M338 10 L338 20 M338 104 L338 114 M286 62 L296 62 M380 62 L390 62', 5)
      ]
    });
  })();

  // なつ：ひまわり
  (function () {
    var cx = 200, cy = 150, k = 14, ri = 86, rc = 164;
    var d = 'M' + polar(cx, cy, ri, -90).map(n).join(' ');
    for (var i = 0; i < k; i++) {
      var a0 = -90 + i * 360 / k, a1 = a0 + 360 / k;
      var c = polar(cx, cy, rc, (a0 + a1) / 2), e = polar(cx, cy, ri, a1);
      d += ' Q' + n(c[0]) + ' ' + n(c[1]) + ' ' + n(e[0]) + ' ' + n(e[1]);
    }
    d += ' Z';
    var leaf = 'M200 344 C150 354 110 326 96 290 C140 282 182 300 200 344 Z';
    var seeds = [];
    [[-30, -28], [0, -38], [30, -28], [-40, 0], [-12, -10], [16, -10], [40, 2], [-28, 28], [2, 18], [30, 28], [-4, 44]].forEach(function (p) {
      seeds.push(dot(cx + p[0], cy + p[1], 5));
    });
    KISETSU.push({
      id: 'himawari', name: 'ひまわり', season: 'natsu',
      regions: [BG, R(190, 260, 20, 134, 0), leaf, X(leaf, M.mx(200)), d, C(cx, cy, 72)],
      deco: seeds.concat([line('M200 344 Q150 320 112 294', 3), line('M200 344 Q250 320 288 294', 3)])
    });
  })();

  // なつ：すいか
  (function () {
    var seeds = [];
    [[120, 172, -30], [175, 196, -10], [235, 190, 10], [290, 166, 30], [150, 234, -15], [210, 248, 0], [262, 226, 20], [200, 300, 0]].forEach(function (p) {
      seeds.push({ d: X('M0 -9 C6 -2 6 6 0 9 C-6 6 -6 -2 0 -9 Z', M.of(M.r(p[2], 0, 0), M.t(p[0], p[1]))), f: INK, w: 0 });
    });
    KISETSU.push({
      id: 'suika', name: 'すいか', season: 'natsu',
      regions: [
        BG,
        C(320, 66, 42),
        'M12 140 A188 188 0 0 0 388 140 Z',
        'M34 140 A166 166 0 0 0 366 140 Z',
        'M54 140 A146 146 0 0 0 346 140 Z'
      ],
      deco: seeds.concat([line('M320 6 L320 16 M262 66 L272 66 M368 66 L378 66 M280 26 L287 33 M360 26 L353 33 M280 106 L287 99 M360 106 L353 99', 5)])
    });
  })();

  // なつ：かきごおり
  KISETSU.push({
    id: 'kakigori', name: 'かきごおり', season: 'natsu',
    regions: [
      BG,
      E(200, 356, 92, 20),
      R(180, 300, 40, 50, 0),
      'M80 228 C70 128 140 66 200 66 C260 66 330 128 320 228 Z',
      'M98 150 C112 96 150 68 200 68 C250 68 288 96 302 150 C290 166 274 144 260 162 C246 180 230 150 215 166 C200 182 185 150 170 166 C155 180 140 150 125 164 C112 176 102 162 98 150 Z',
      'M64 222 C74 292 130 318 200 318 C270 318 326 292 336 222 Z'
    ],
    deco: [line('M84 244 L316 244', 3), line('M240 58 L300 8', 8)]
  });

  // あき：もみじ
  (function () {
    var cx = 210, cy = 196;
    var tips = [[-90, 176], [-38, 160], [14, 132], [166, 132], [218, 160]];
    var vall = [[-64, 58], [-12, 58], [90, 42], [192, 58], [244, 58]];
    var pts = [];
    for (var i = 0; i < 5; i++) {
      var a = tips[i][0], r = tips[i][1];
      pts.push(polar(cx, cy, r, a));
      // ぎざぎざ（大きめ）
      pts.push(polar(cx, cy, r * 0.66, a + 13));
      pts.push(polar(cx, cy, r * 0.7, a + 20));
      pts.push(polar(cx, cy, vall[i][1], vall[i][0]));
      var nx = tips[(i + 1) % 5][0] + (i === 4 ? 360 : 0), nr = tips[(i + 1) % 5][1];
      pts.push(polar(cx, cy, nr * 0.7, nx - 20));
      pts.push(polar(cx, cy, nr * 0.66, nx - 13));
    }
    // 先 → ぎざぎざ → 谷 → ぎざぎざ → 次の 先
    var d = P(pts);
    var veins = tips.map(function (t) {
      var p = polar(cx, cy, t[1] * 0.75, t[0]);
      return line('M' + cx + ' ' + cy + ' L' + n(p[0]) + ' ' + n(p[1]), 4);
    });
    KISETSU.push({
      id: 'momiji', name: 'もみじ', season: 'aki',
      regions: [
        BG,
        'M330 380 L318 332 C272 330 252 292 268 262 C290 250 312 262 322 280 C332 262 354 250 376 262 C392 292 372 330 342 332 Z',
        d
      ],
      deco: veins.concat([line('M210 238 L224 372', 9), line('M330 376 L322 286', 4)])
    });
  })();

  // あき：どんぐり
  (function () {
    var nut = 'M102 196 C100 276 128 326 150 340 C172 326 200 276 198 196 Z';
    var cap = 'M90 204 C88 158 118 136 150 136 C182 136 212 158 210 204 Z';
    var m2 = M.of(M.r(18, 150, 240), M.t(122, 8));
    var capDeco = function (m) {
      return [line(X('M150 136 L150 112', M.of(m)), 12),
        line(X('M104 172 L196 172 M98 190 L202 190', m), 3),
        line(X('M126 144 L118 202 M150 138 L150 202 M174 144 L182 202', m), 3)];
    };
    var id0 = [1, 0, 0, 1, 0, 0];
    KISETSU.push({
      id: 'donguri', name: 'どんぐり', season: 'aki',
      regions: [
        BG,
        'M226 122 C246 62 316 40 372 48 C364 104 300 142 226 122 Z',
        ground(340, 30),
        nut, cap,
        X(nut, m2), X(cap, m2)
      ],
      deco: capDeco(id0).concat(capDeco(m2)).concat([line('M226 122 C270 104 320 74 372 48', 4)])
    });
  })();

  // あき：おつきみ
  KISETSU.push({
    id: 'otsukimi', name: 'おつきみ', season: 'aki',
    regions: [
      BG,
      C(292, 96, 66),
      E(338, 222, 16, 50, 16),
      E(300, 250, 14, 44, -12),
      'M96 292 L244 292 L230 366 L110 366 Z',
      R(66, 268, 208, 26, 5),
      C(134, 226, 38),
      C(206, 226, 38),
      C(170, 164, 38)
    ],
    deco: [
      line('M324 270 Q336 320 330 384', 5), line('M310 292 Q312 340 300 384', 5),
      line(R(140, 312, 60, 34, 14), 4),
      line(X(star(0, 0, 12, 5, 4, -90), M.t(70, 70)), 3), line(X(star(0, 0, 9, 4, 4, -90), M.t(160, 50)), 3),
      line(X(star(0, 0, 9, 4, 4, -90), M.t(60, 160)), 3)
    ]
  });

  // ふゆ：ゆきだるま
  KISETSU.push({
    id: 'yukidaruma', name: 'ゆきだるま', season: 'fuyu',
    regions: [
      BG,
      ground(330, 30),
      C(200, 270, 92),
      C(200, 142, 66),
      'M238 206 L252 272 L284 264 L264 204 Z',
      'M128 190 C170 206 230 206 272 190 L276 216 C230 234 170 234 124 216 Z',
      'M146 92 L158 36 L242 36 L254 92 C220 100 180 100 146 92 Z',
      'M198 140 L262 156 L198 170 Z'
    ],
    deco: [
      dot(176, 128, 8), dot(224, 128, 8),
      line('M178 180 Q200 192 222 178', 5),
      dot(200, 254, 8), dot(200, 290, 8), dot(200, 326, 8),
      line('M114 246 L52 206 M76 222 L62 196', 7), line('M286 246 L348 206 M324 222 L340 196', 7),
      line(X(star(0, 0, 14, 4, 6, -90), M.t(54, 60)), 3), line(X(star(0, 0, 12, 4, 6, -90), M.t(344, 74)), 3),
      line(X(star(0, 0, 10, 3.5, 6, -90), M.t(320, 150)), 3)
    ]
  });

  // ふゆ：クリスマスツリー
  KISETSU.push({
    id: 'tree', name: 'クリスマスツリー', season: 'fuyu',
    regions: [
      BG,
      R(172, 318, 56, 54, 4),
      'M56 332 L200 176 L344 332 Z',
      'M86 250 L200 118 L314 250 Z',
      'M118 170 L200 64 L282 170 Z',
      star(200, 62, 40, 17, 5),
      C(140, 306, 18), C(262, 296, 18), C(198, 220, 18), C(232, 146, 16),
      R(266, 318, 92, 64, 6)
    ],
    deco: [line('M312 318 L312 382', 6), line('M266 350 L358 350', 6),
      line('M312 318 C290 296 280 312 312 318 C334 296 344 312 312 318', 4)]
  });

  // ふゆ：かがみもち
  KISETSU.push({
    id: 'kagamimochi', name: 'かがみもち', season: 'fuyu',
    regions: [
      BG,
      'M70 312 L330 312 L310 376 L90 376 Z',
      R(40, 288, 320, 26, 5),
      'M60 290 C60 228 130 206 200 206 C270 206 340 228 340 290 Z',
      'M98 214 C98 166 150 148 200 148 C250 148 302 166 302 214 C270 222 130 222 98 214 Z',
      C(200, 116, 40),
      'M206 80 C222 58 252 58 264 68 C250 86 226 90 206 80 Z'
    ],
    deco: [line(R(160, 326, 80, 36, 16), 4), line('M196 80 L202 72', 4)]
  });

  // ---------- とちぎの たべもの ----------
  var TOCHIGI = [];

  // いちご
  (function () {
    var body = 'M200 362 C120 332 62 244 76 172 C86 120 140 108 200 124 C260 108 314 120 324 172 C338 244 280 332 200 362 Z';
    var seeds = [];
    [[150, 170], [200, 166], [250, 170], [120, 214], [170, 212], [230, 212], [280, 214], [146, 258], [200, 256], [254, 258],
      [174, 300], [226, 300], [200, 334]].forEach(function (p) { seeds.push(line(E(p[0], p[1], 5, 8), 3)); });
    // 5まいの はなびら（ひとつの 場所）
    var i, flower = 'M' + polar(72, 74, 26, -126).map(n).join(' ');
    for (i = 0; i < 5; i++) {
      var a0 = -126 + i * 72, a1 = a0 + 72;
      var c1 = polar(72, 74, 70, a0 + 10), c2 = polar(72, 74, 70, a1 - 10), e = polar(72, 74, 26, a1);
      flower += ' C' + n(c1[0]) + ' ' + n(c1[1]) + ' ' + n(c2[0]) + ' ' + n(c2[1]) + ' ' + n(e[0]) + ' ' + n(e[1]);
    }
    flower += ' Z';
    TOCHIGI.push({
      id: 'ichigo', name: 'いちご',
      regions: [
        BG, flower, C(72, 74, 20),
        body,
        R(192, 56, 16, 50, 6),
        'M200 140 L148 92 L166 136 L108 130 L160 162 L200 148 L240 162 L292 130 L234 136 L252 92 Z'
      ],
      deco: seeds
    });
  })();

  // ぎょうざ
  (function () {
    var g = 'M-80 24 C-80 -48 80 -48 80 24 C40 42 -40 42 -80 24 Z';
    function pleat(m) {
      return line(X('M-40 -20 L-34 -36 M-14 -28 L-10 -45 M14 -28 L10 -45 M40 -20 L34 -36 M-74 20 C-40 32 40 32 74 20', m), 4);
    }
    var m1 = M.t(116, 206), m2 = M.t(284, 206), m3 = M.t(200, 268);
    TOCHIGI.push({
      id: 'gyoza', name: 'ぎょうざ',
      regions: [BG, E(200, 254, 186, 104), X(g, m1), X(g, m2), X(g, m3)],
      deco: [line(E(200, 254, 150, 78), 3), pleat(m1), pleat(m2), pleat(m3),
        line('M140 110 C120 90 160 74 140 50 M200 104 C180 84 220 68 200 44 M260 110 C240 90 280 74 260 50', 4)]
    });
  })();

  // かんぴょう（ゆうがおの 実と、ほした かんぴょう）
  TOCHIGI.push({
    id: 'kanpyo', name: 'かんぴょう',
    regions: [
      BG,
      E(136, 236, 112, 118),
      'M126 120 C124 96 132 84 146 80 C150 92 146 108 146 122 Z',
      'M246 64 L334 64 L322 196 L346 346 L234 346 L258 196 Z',
      R(246, 182, 88, 28, 8)
    ],
    deco: [
      line('M136 120 C96 160 96 320 136 354 M136 120 C176 160 176 320 136 354', 4),
      line('M266 70 L270 182 L250 340 M290 70 L290 182 L284 340 M314 70 L310 182 L318 340', 3)
    ]
  });

  // レモンぎゅうにゅう（パックの 絵。実在の パッケージや 文字は 描かない）
  TOCHIGI.push({
    id: 'lemon', name: 'レモンぎゅうにゅう',
    regions: [
      BG,
      'M240 142 L300 112 L300 330 L240 362 Z',
      'M200 74 L262 46 L300 112 L240 142 Z',
      'M88 142 L130 74 L200 74 L240 142 Z',
      R(126, 44, 78, 30, 4),
      R(88, 142, 152, 220, 0),
      E(164, 252, 50, 34, -20),
      E(336, 352, 40, 26, -10)
    ],
    deco: [line('M128 238 L200 266', 3), line('M150 222 L178 282', 3), line('M298 350 L374 354', 3)]
  });

  // ゆば
  (function () {
    function roll(x, y, r) {
      return line('M' + x + ' ' + y + ' A' + n(r * 0.2) + ' ' + n(r * 0.2) + ' 0 1 1 ' + n(x + r * 0.4) + ' ' + y +
        ' A' + n(r * 0.4) + ' ' + n(r * 0.4) + ' 0 1 1 ' + n(x - r * 0.4) + ' ' + y +
        ' A' + n(r * 0.6) + ' ' + n(r * 0.6) + ' 0 1 1 ' + n(x + r * 0.8) + ' ' + y, 4);
    }
    TOCHIGI.push({
      id: 'yuba', name: 'ゆば',
      regions: [
        BG,
        'M280 140 C300 70 360 50 380 70 C380 120 330 160 280 140 Z',
        E(200, 278, 182, 88),
        C(122, 238, 56), C(278, 238, 56), C(200, 180, 56)
      ],
      deco: [line(E(200, 278, 140, 62), 3), roll(122, 238, 56), roll(278, 238, 56), roll(200, 180, 56),
        line('M280 140 C320 120 350 96 380 70', 4)]
    });
  })();

  // ラーメン
  TOCHIGI.push({
    id: 'ramen', name: 'ラーメン',
    regions: [
      BG,
      'M286 116 L340 104 L352 180 L298 190 Z',
      'M28 196 L372 196 C366 302 292 364 200 364 C108 364 34 302 28 196 Z',
      E(200, 196, 172, 44),
      E(128, 192, 48, 26),
      E(244, 186, 34, 21),
      R(280, 196, 58, 18, 6)
    ],
    deco: [
      line('M60 206 Q80 196 100 206 Q120 216 140 206 M170 212 Q190 202 210 212 Q230 222 250 212 M300 216 Q318 206 336 216', 4),
      line(E(244, 186, 16, 9), 3), line(E(128, 192, 26, 13), 3),
      line('M44 266 L356 266', 4),
      line('M60 300 L80 300 L80 286 L100 286 L100 300 M150 314 L170 314 L170 300 L190 300 L190 314 M240 314 L260 314 L260 300 L280 300 L280 314 M318 296 L338 296 L338 284', 4),
      line('M60 120 L250 40 M70 140 L262 64', 8)
    ]
  });

  // ---------- キャラクター（しんけいすいじゃくの どうぶつ・ぴよぴよ ランの ひよこ） ----------
  // しんけいすいじゃくの 絵（100×100）と 同じ 形を、大きく（3.6ばい）して 線画に した
  var K = M.of(M.s(3.6), M.t(20, 20));
  function big(regions, deco) {
    return { regions: [BG].concat(XA(regions, K)), deco: deco.map(function (x) { return { d: X(x.d, K), f: x.f, w: x.w }; }) };
  }
  // 100の 大きさでの 目・口
  function eyes100(lx, rx, y) {
    return eye(lx, y, 6.2, 7.4).concat(eye(rx, y, 6.2, 7.4));
  }
  function mouthW(x, y) { return line('M' + (x - 5) + ' ' + y + ' Q' + (x - 2.5) + ' ' + (y + 3.6) + ' ' + x + ' ' + y + ' Q' + (x + 2.5) + ' ' + (y + 3.6) + ' ' + (x + 5) + ' ' + y, 4); }
  function nose(x, y, rx, ry) { return { d: E(x, y, rx, ry), f: INK, w: 0 }; }

  var CHARA = [];
  function chara(id, name, o) { o.id = id; o.name = name; CHARA.push(o); }

  chara('usagi', 'うさぎ', big(
    [E(37, 24, 10, 21, -9), E(63, 24, 10, 21, 9), E(37, 27, 5.5, 14, -9), E(63, 27, 5.5, 14, 9), C(50, 63, 31)],
    eyes100(38, 62, 60).concat([{ d: 'M46.5 67 L53.5 67 L50 70.6 Z', f: INK, w: 0 }, mouthW(50, 71.5)])));

  chara('kuma', 'くま', big(
    [C(24, 34, 12.5), C(76, 34, 12.5), C(24, 34, 6.5), C(76, 34, 6.5), C(50, 60, 33), E(50, 72, 15, 11)],
    eyes100(37, 63, 56).concat([nose(50, 67.5, 5.5, 4), mouthW(50, 73)])));

  chara('neko', 'ねこ', big(
    ['M20 48 L23 11 L47 31 Z', 'M80 48 L77 11 L53 31 Z', 'M26 39 L27 21 L39 31 Z', 'M74 39 L73 21 L61 31 Z', E(50, 61, 35, 30)],
    eyes100(37, 63, 58).concat([
      line('M50 33 L50 41 M42 34.5 L44 41 M58 34.5 L56 41', 4),
      { d: 'M46.5 65.5 L53.5 65.5 L50 69.1 Z', f: INK, w: 0 }, mouthW(50, 70),
      line('M8 64 L21 66 M9 73 L21 70 M92 64 L79 66 M91 73 L79 70', 3)])));

  chara('inu', 'いぬ', big(
    [C(50, 58, 31), E(62, 52, 12, 11), E(50, 71, 14, 10),
      'M26 34 C10 36 6 60 14 72 C20 80 31 72 31 58 C31 48 30 40 26 34 Z',
      'M74 34 C90 36 94 60 86 72 C80 80 69 72 69 58 C69 48 70 40 74 34 Z'],
    eyes100(39, 62, 54).concat([nose(50, 65.5, 6, 4.3), mouthW(50, 71.5)])));

  chara('zou', 'ぞう', big(
    [C(20, 52, 19), C(80, 52, 19), E(19, 53, 11, 12), E(81, 53, 11, 12),
      'M43 77.1 C42 86 46 95 56 96 C65 97 68 88 62 86 C57.5 85 56.5 82 57 77.1 A28 28 0 1 0 43 77.1 Z'],
    eyes100(38, 62, 48).concat([line('M46 84 L54 83 M48 90 L56 90', 3)])));

  chara('panda', 'ぱんだ', big(
    [C(26, 33, 11.5), C(74, 33, 11.5), C(50, 61, 32), E(37, 59, 9.5, 12, 28), E(63, 59, 9.5, 12, -28)],
    [{ d: C(38, 58, 5), f: '#ffffff', w: 3 }, { d: C(62, 58, 5), f: '#ffffff', w: 3 }, dot(38.6, 58.6, 3), dot(61.4, 58.6, 3),
      nose(50, 69, 4.8, 3.4), mouthW(50, 74)]));

  chara('hiyoko', 'ひよこ', big(
    [E(19, 64, 7, 11, 25), E(81, 64, 7, 11, -25), E(50, 59, 32, 31), 'M43 59 L57 59 L50 68 Z'],
    eyes100(38, 62, 51).concat([line('M48 28 Q44 19 49 16 M52 28 Q54 19 61 19', 4), line('M41 89 L41 96 M59 89 L59 96', 6)])));

  chara('kitsune', 'きつね', big(
    ['M18 52 L21 9 L46 32 Z', 'M82 52 L79 9 L54 32 Z', 'M25 42 L25 21 L38 32 Z', 'M75 42 L75 21 L62 32 Z',
      'M50 30 C74 30 87 44 87 59 C87 77 69 89 50 89 C31 89 13 77 13 59 C13 44 26 30 50 30 Z',
      'M14 62 C26 62 40 68 50 80 C60 68 74 62 86 62 C83 78 67 89 50 89 C33 89 17 78 14 62 Z'],
    eyes100(37, 63, 55).concat([nose(50, 76, 4.6, 3.4)])));

  // ぴよぴよ ランの ひよこ（よこむき。ゲームの 絵と 同じ 形を 大きく した）
  (function () {
    var m = M.of(M.s(5.4), M.t(205.4, 372.8));
    CHARA.push({
      id: 'piyo', name: 'ぴよぴよ ひよこ',
      regions: [BG].concat(XA([
        'M-19 -37 L-34 -42 L-24 -26 Z',
        E(0, -30, 25, 23),
        E(8, -19, 11, 8.5),
        E(-12, -27, 10.5, 6.8, -17),
        'M20 -35.5 L32 -31 L20 -26.5 Z'
      ], m)),
      deco: [
        line(X('M-5 -8 L-7 -1 M6 -8 L5 -1', m), 7),
        line(X('M-2 -52.5 Q-6 -62 -1 -64 M2 -52.5 Q4 -62 9 -61', m), 5),
        { d: X(E(10, -36, 3.6, 4.2), m), f: INK, w: 0 },
        { d: X(C(11.2, -37.6, 1.3), m), f: '#ffffff', w: 0 }
      ]
    });
  })();

  // ---------- テーマ ----------
  var THEMES = [
    { id: 'kisetsu', name: 'きせつ', groups: [
      { id: 'haru', name: 'はる', items: KISETSU.filter(function (x) { return x.season === 'haru'; }) },
      { id: 'natsu', name: 'なつ', items: KISETSU.filter(function (x) { return x.season === 'natsu'; }) },
      { id: 'aki', name: 'あき', items: KISETSU.filter(function (x) { return x.season === 'aki'; }) },
      { id: 'fuyu', name: 'ふゆ', items: KISETSU.filter(function (x) { return x.season === 'fuyu'; }) }
    ] },
    { id: 'tochigi', name: 'とちぎの たべもの', groups: [{ id: 'all', name: '', items: TOCHIGI }] },
    { id: 'chara', name: 'キャラクター', groups: [{ id: 'all', name: '', items: CHARA }] }
  ];
  var BY_ID = {};
  THEMES.forEach(function (t) {
    t.groups.forEach(function (g) {
      g.items.forEach(function (p) { p.theme = t.id; BY_ID[p.id] = p; });
    });
  });

  window.NurieArt = { themes: THEMES, get: function (id) { return BY_ID[id] || null; }, INK: INK };
})();
