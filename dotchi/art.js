// どっちかな：はじめから 入っている もんだいの 絵（ページの中で かいた オリジナルの 絵。画像ファイルは つかわない）
// DotchiArt.svg('ringo') で <svg> の 文字を かえす。'iro-aka' の ように 'iro-' で はじまる ものは いろの まる。
(function (global) {
  'use strict';

  var INK = '#3d3a35';
  var W = '#fffdf7';

  function polar(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
  }
  // まわりに ならべる（はなびら など）
  function around(n, fn) {
    var s = '';
    for (var i = 0; i < n; i++) s += fn(i * 360 / n, i);
    return s;
  }

  var P = {};

  // ---------- きせつ ----------
  P.sakura = around(5, function (a) {
    return '<path d="M100 100 C78 78 76 44 92 28 L100 38 L108 28 C124 44 122 78 100 100Z" fill="#f7c4d2" transform="rotate(' + a + ' 100 100)"/>';
  }) + '<circle cx="100" cy="100" r="15" fill="#f3cf63"/>' +
    around(5, function (a) { return '<path d="M100 100L' + polar(100, 100, 28, a + 36 - 90) + '" stroke="#e0868f" stroke-width="3"/>'; });

  P.yukidaruma = '<path d="M60 118 L22 92 M140 118 L178 92" stroke="#8a6a4a" stroke-width="6" fill="none"/>' +
    '<circle cx="100" cy="142" r="46" fill="' + W + '"/>' +
    '<circle cx="100" cy="72" r="34" fill="' + W + '"/>' +
    '<path d="M70 38 L130 38 L124 14 L76 14Z" fill="#6f97b8"/>' +
    '<path d="M64 98 Q100 112 136 98 L136 110 Q100 124 64 110Z" fill="#e0524a"/>' +
    '<circle cx="88" cy="66" r="4.5" fill="' + INK + '" stroke="none"/><circle cx="112" cy="66" r="4.5" fill="' + INK + '" stroke="none"/>' +
    '<path d="M98 76 L124 82 L98 86Z" fill="#f08a2e" stroke-width="3"/>' +
    '<circle cx="100" cy="134" r="4" fill="' + INK + '" stroke="none"/><circle cx="100" cy="156" r="4" fill="' + INK + '" stroke="none"/>';

  P.suika = '<path d="M14 72 A86 86 0 0 0 186 72Z" fill="#4f9d5d"/>' +
    '<path d="M26 72 A74 74 0 0 0 174 72Z" fill="' + W + '" stroke="none"/>' +
    '<path d="M32 72 A68 68 0 0 0 168 72Z" fill="#e8636a" stroke="none"/>' +
    '<path d="M14 72 L186 72" fill="none"/>' +
    [[66, 96], [100, 108], [134, 96], [82, 128], [118, 128], [100, 84]].map(function (p) {
      return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="4" ry="6.5" fill="' + INK + '" stroke="none"/>';
    }).join('');

  P.tebukuro = '<path d="M64 112 Q36 104 40 78 Q46 60 66 76 L68 90" fill="#e0524a"/>' +
    '<path d="M66 150 L66 80 Q66 34 108 34 Q148 34 148 80 L148 150Z" fill="#e0524a"/>' +
    '<rect x="58" y="146" width="98" height="36" rx="10" fill="' + W + '"/>' +
    '<path d="M74 152 V176 M90 152 V176 M106 152 V176 M122 152 V176 M138 152 V176" stroke="#e2dccf" stroke-width="4"/>' +
    '<path d="M86 92 h44 M86 112 h44" stroke="#f3b2a8" stroke-width="5"/>';

  P.momiji = (function () {
    var pts = [[-150, 84], [-120, 34], [-90, 90], [-60, 34], [-30, 84], [0, 36], [30, 72], [90, 30], [150, 72], [180, 36]];
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + polar(100, 96, p[1], p[0]); }).join(' ') + 'Z';
    return '<path d="M100 120 L100 186" stroke="#a0552c" stroke-width="7" fill="none"/>' +
      '<path d="' + d + '" fill="#e07a4a"/>' +
      [-150, -90, -30, 30, 150].map(function (a) {
        return '<path d="M100 96 L' + polar(100, 96, 56, a) + '" stroke="#b5532f" stroke-width="3" fill="none"/>';
      }).join('');
  })();

  P.himawari = '<path d="M100 120 L100 190" stroke="#4f9d5d" stroke-width="8" fill="none"/>' +
    '<path d="M100 166 Q130 140 156 152 Q132 178 100 166Z" fill="#7fb86e"/>' +
    around(14, function (a) {
      return '<ellipse cx="100" cy="36" rx="12" ry="26" fill="#f3c93a" transform="rotate(' + a + ' 100 82)"/>';
    }) +
    '<circle cx="100" cy="82" r="30" fill="#8a5a33"/>' +
    '<path d="M86 72h0M100 66h0M114 72h0M84 88h0M100 84h0M116 88h0M100 100h0" stroke="#5e3b20" stroke-width="6"/>';

  // ---------- たべもの ----------
  P.keki = '<ellipse cx="100" cy="164" rx="86" ry="16" fill="#e1edf6"/>' +
    '<path d="M36 92 L36 150 Q100 168 164 150 L164 92Z" fill="#f6dcc4"/>' +
    '<path d="M36 120 Q100 138 164 120" stroke="#e8636a" stroke-width="8" fill="none"/>' +
    '<ellipse cx="100" cy="92" rx="64" ry="20" fill="' + W + '"/>' +
    [[70, 78], [100, 72], [130, 78]].map(function (p) {
      return '<path d="M' + p[0] + ' ' + (p[1] + 14) + ' Q' + (p[0] - 14) + ' ' + p[1] + ' ' + p[0] + ' ' + (p[1] - 10) +
        ' Q' + (p[0] + 14) + ' ' + p[1] + ' ' + p[0] + ' ' + (p[1] + 14) + 'Z" fill="#e0524a" stroke-width="3.5"/>' +
        '<path d="M' + (p[0] - 6) + ' ' + (p[1] - 12) + ' L' + p[0] + ' ' + (p[1] - 8) + ' L' + (p[0] + 6) + ' ' + (p[1] - 12) + '" stroke="#4f9d5d" stroke-width="4" fill="none"/>';
    }).join('');

  P.togarashi = '<path d="M58 54 Q34 70 46 104 Q70 158 168 178 Q124 140 100 86 Q92 56 58 54Z" fill="#e0524a"/>' +
    '<path d="M44 52 Q56 40 74 52 Q64 66 50 64Z" fill="#4f9d5d"/>' +
    '<path d="M58 46 Q56 30 70 20" stroke="#4f9d5d" stroke-width="6" fill="none"/>' +
    '<path d="M60 86 Q70 120 104 146" stroke="#f4a197" stroke-width="5" fill="none"/>';

  P.kare = '<ellipse cx="100" cy="122" rx="90" ry="52" fill="' + W + '"/>' +
    '<ellipse cx="100" cy="116" rx="70" ry="36" fill="#f8f3e6" stroke="#e2dccf" stroke-width="3"/>' +
    '<path d="M100 82 Q156 80 168 112 Q164 146 100 152Z" fill="#c98a3a"/>' +
    '<path d="M100 82 Q46 82 32 112 Q42 146 100 152Z" fill="' + W + '"/>' +
    '<rect x="120" y="98" width="16" height="14" rx="3" fill="#f08a2e" stroke-width="3"/>' +
    '<rect x="140" y="118" width="16" height="14" rx="3" fill="#f3cf63" stroke-width="3"/>' +
    '<rect x="116" y="128" width="14" height="12" rx="3" fill="#f08a2e" stroke-width="3"/>' +
    '<path d="M54 108h0M70 98h0M66 124h0M84 114h0M82 136h0" stroke="#d8d0bd" stroke-width="6"/>';

  P.aisu = '<path d="M64 98 L100 188 L136 98Z" fill="#e9b872"/>' +
    '<path d="M76 112 L118 154 M96 106 L128 138 M124 108 L82 150 M104 106 L72 136" stroke="#c48b3f" stroke-width="3.5" fill="none"/>' +
    '<path d="M56 100 Q50 78 72 74 Q66 52 92 50 Q96 26 116 34 Q140 40 128 62 Q152 66 146 88 Q148 102 132 102Z" fill="#fff6e5"/>' +
    '<path d="M84 74 Q100 82 118 70 M76 92 Q102 100 134 86" stroke="#e9dcc2" stroke-width="4" fill="none"/>';

  P.remon = '<path d="M24 102 Q34 50 100 46 Q166 50 176 102 Q166 154 100 158 Q34 154 24 102Z" fill="#f3d34a"/>' +
    '<path d="M24 102 L12 100 M176 102 L188 104" stroke-width="7" fill="none"/>' +
    '<path d="M120 50 Q150 22 176 36 Q150 64 120 50Z" fill="#7fb86e"/>' +
    '<path d="M60 84h0M80 70h0M132 76h0M150 98h0M70 124h0M120 132h0" stroke="#d9b52f" stroke-width="5"/>';

  P.ramen = '<path d="M62 30 Q56 46 66 56 M100 22 Q92 40 104 52 M138 30 Q130 46 140 56" stroke="#b9c3cc" stroke-width="5" fill="none"/>' +
    '<path d="M134 20 L176 98 M148 16 L184 96" stroke="#c48b3f" stroke-width="6" fill="none"/>' +
    '<ellipse cx="100" cy="96" rx="86" ry="22" fill="#f3d97a"/>' +
    '<path d="M38 92 Q50 84 62 92 T86 92 T110 92 T134 92 T158 92" stroke="#e0b84a" stroke-width="4" fill="none"/>' +
    '<circle cx="74" cy="94" r="12" fill="' + W + '" stroke-width="3.5"/><path d="M70 92 Q74 88 78 94" stroke="#f08cb8" stroke-width="3" fill="none"/>' +
    '<path d="M110 84 L136 84 L134 104 L112 104Z" fill="#c98a5a" stroke-width="3.5"/>' +
    '<path d="M14 96 Q20 178 100 178 Q180 178 186 96Z" fill="#e0524a"/>' +
    '<path d="M40 122 h120 M48 146 h104" stroke="' + W + '" stroke-width="5" stroke-dasharray="10 8" fill="none"/>';

  // ---------- ふく ----------
  P.koto = '<path d="M64 30 L136 30 L176 62 L162 112 L148 104 L150 184 L50 184 L52 104 L38 112 L24 62Z" fill="#6f97b8"/>' +
    '<path d="M64 30 L100 74 L136 30" fill="#4f78a0"/>' +
    '<path d="M100 74 L100 184" stroke-width="4" fill="none"/>' +
    '<circle cx="112" cy="96" r="5" fill="#f3cf63" stroke-width="3"/><circle cx="112" cy="124" r="5" fill="#f3cf63" stroke-width="3"/><circle cx="112" cy="152" r="5" fill="#f3cf63" stroke-width="3"/>' +
    '<path d="M60 140 h22 M118 140 h22" stroke-width="4" fill="none"/>';

  P.hansode = '<path d="M64 36 L84 30 Q100 50 116 30 L136 36 L180 66 L162 98 L144 88 L144 172 L56 172 L56 88 L38 98 L20 66Z" fill="#f3cf63"/>' +
    '<path d="M84 30 Q100 50 116 30" fill="none"/>' +
    '<circle cx="100" cy="116" r="18" fill="#e07a4a" stroke-width="4"/>';

  P.mugiwara = '<ellipse cx="100" cy="128" rx="90" ry="32" fill="#ecd08a"/>' +
    '<path d="M50 126 Q48 58 100 56 Q152 58 150 126Z" fill="#ecd08a"/>' +
    '<path d="M51 108 Q100 124 149 108 L150 124 Q100 140 50 124Z" fill="#e0524a"/>' +
    '<path d="M30 140 Q100 166 170 140" stroke="#c9a96b" stroke-width="3" fill="none"/>';

  P.nittobou = '<path d="M42 132 Q40 56 100 52 Q160 56 158 132Z" fill="#a685d0"/>' +
    '<rect x="34" y="124" width="132" height="40" rx="12" fill="#8a69b8"/>' +
    '<path d="M52 128 V160 M70 128 V160 M88 128 V160 M106 128 V160 M124 128 V160 M142 128 V160" stroke="#6f5296" stroke-width="4"/>' +
    '<circle cx="100" cy="40" r="20" fill="' + W + '"/>' +
    '<path d="M62 100 Q100 88 138 100" stroke="#c4aee6" stroke-width="5" fill="none"/>';

  P.mafura = '<path d="M36 52 Q100 96 164 52 L166 86 Q100 128 34 86Z" fill="#e0524a"/>' +
    '<path d="M112 92 L148 82 L162 168 L128 176Z" fill="#e0524a"/>' +
    '<path d="M60 70 L58 96 M86 82 L84 108 M114 84 L114 110 M140 74 L142 100" stroke="#f3cf63" stroke-width="6" fill="none"/>' +
    '<path d="M120 116 L154 108 M124 144 L158 136" stroke="#f3cf63" stroke-width="6" fill="none"/>' +
    '<path d="M132 176 L130 190 M142 174 L141 188 M152 172 L152 186 M160 170 L162 184" stroke-width="4" fill="none"/>';

  // ---------- どうぐ ----------
  P.haburashi = '<g transform="rotate(-32 100 100)">' +
    '<rect x="10" y="98" width="128" height="18" rx="9" fill="#58b8de"/>' +
    '<rect x="132" y="94" width="54" height="24" rx="8" fill="#58b8de"/>' +
    '<rect x="138" y="62" width="44" height="32" rx="4" fill="' + W + '"/>' +
    '<path d="M147 64 V92 M156 64 V92 M165 64 V92 M174 64 V92" stroke="#9fcbe0" stroke-width="3"/>' +
    '</g>';

  P.kushi = '<rect x="22" y="58" width="156" height="36" rx="14" fill="#e9b872"/>' +
    (function () {
      var s = '';
      for (var x = 30; x <= 162; x += 12) s += '<rect x="' + x + '" y="90" width="8" height="58" rx="4" fill="#e9b872" stroke-width="3.5"/>';
      return s;
    })() +
    '<rect x="24" y="60" width="152" height="32" rx="12" fill="#e9b872" stroke="none"/>' +
    '<path d="M36 74 h128" stroke="#f6dcb0" stroke-width="5" fill="none"/>';

  P.hasami = '<path d="M96 112 L166 30 L176 40 L108 120Z" fill="#c9ced4"/>' +
    '<path d="M104 112 L34 30 L24 40 L92 120Z" fill="#c9ced4"/>' +
    '<path d="M96 120 L70 142 M104 120 L130 142" stroke-width="12" fill="none"/>' +
    '<path d="M96 120 L70 142 M104 120 L130 142" stroke="#e0524a" stroke-width="6" fill="none"/>' +
    '<circle cx="60" cy="156" r="22" fill="none" stroke-width="14"/>' +
    '<circle cx="60" cy="156" r="22" fill="none" stroke="#e0524a" stroke-width="8"/>' +
    '<circle cx="140" cy="156" r="22" fill="none" stroke-width="14"/>' +
    '<circle cx="140" cy="156" r="22" fill="none" stroke="#e0524a" stroke-width="8"/>' +
    '<circle cx="100" cy="116" r="5" fill="' + W + '" stroke-width="3"/>';

  P.supun = '<g transform="rotate(-32 100 100)">' +
    '<rect x="10" y="93" width="112" height="16" rx="8" fill="#c9ced4"/>' +
    '<ellipse cx="150" cy="101" rx="36" ry="26" fill="#c9ced4"/>' +
    '<ellipse cx="146" cy="96" rx="18" ry="10" fill="#e8ebee" stroke="none"/>' +
    '</g>';

  P.taoru = '<path d="M30 40 H170" stroke="#a0552c" stroke-width="8" fill="none"/>' +
    '<rect x="44" y="40" width="112" height="132" rx="8" fill="#8fb4d6"/>' +
    '<rect x="44" y="138" width="112" height="14" fill="' + W + '" stroke-width="3.5"/>' +
    '<path d="M54 172 V186 M68 172 V186 M82 172 V186 M96 172 V186 M110 172 V186 M124 172 V186 M138 172 V186 M150 172 V186" stroke-width="4"/>' +
    '<path d="M44 66 H156" stroke="#b6cfe6" stroke-width="5" fill="none"/>';

  P.sekken = '<rect x="30" y="92" width="140" height="78" rx="30" fill="#f8d3e0"/>' +
    '<path d="M50 112 Q100 104 150 112" stroke="' + W + '" stroke-width="6" fill="none"/>' +
    '<circle cx="62" cy="68" r="18" fill="#e1edf6" stroke-width="4"/>' +
    '<circle cx="104" cy="52" r="24" fill="#e1edf6" stroke-width="4"/>' +
    '<circle cx="146" cy="70" r="14" fill="#e1edf6" stroke-width="4"/>' +
    '<path d="M96 42 Q100 38 106 40" stroke="' + W + '" stroke-width="4" fill="none"/>';

  // ---------- てんき ----------
  P.kasa = '<path d="M100 104 L100 164 Q100 182 84 182 Q72 182 72 170" stroke-width="7" fill="none"/>' +
    '<path d="M16 104 Q100 6 184 104 Q163 88 142 104 Q121 88 100 104 Q79 88 58 104 Q37 88 16 104Z" fill="#58b8de"/>' +
    '<path d="M100 22 Q78 60 58 104 M100 22 Q122 60 142 104" stroke-width="3.5" fill="none"/>' +
    '<path d="M100 12 L100 22" stroke-width="6"/>';

  P.nagagutsu = '<path d="M60 24 L116 24 L116 128 L164 138 Q184 144 180 172 L60 172Z" fill="#f3c93a"/>' +
    '<rect x="54" y="162" width="130" height="16" rx="6" fill="#c9a33a"/>' +
    '<path d="M60 44 H116" stroke-width="4" fill="none"/>' +
    '<path d="M76 24 Q76 6 92 8 Q104 10 102 24" fill="none" stroke-width="5"/>';

  // ビーチサンダル（2つ）
  P.sandaru = [[58, -6], [142, 6]].map(function (c) {
    var x = c[0];
    return '<g transform="rotate(' + c[1] + ' ' + x + ' 100)">' +
      '<path d="M' + x + ' 22 Q' + (x + 32) + ' 22 ' + (x + 32) + ' 70 Q' + (x + 32) + ' 104 ' + (x + 24) + ' 140 Q' + (x + 20) + ' 182 ' + x + ' 182 Q' + (x - 20) + ' 182 ' + (x - 24) + ' 140 Q' + (x - 32) + ' 104 ' + (x - 32) + ' 70 Q' + (x - 32) + ' 22 ' + x + ' 22Z" fill="#58b8de"/>' +
      '<path d="M' + x + ' 46 L' + (x - 30) + ' 98 M' + x + ' 46 L' + (x + 30) + ' 98" stroke="' + INK + '" stroke-width="13" fill="none"/>' +
      '<path d="M' + x + ' 46 L' + (x - 30) + ' 98 M' + x + ' 46 L' + (x + 30) + ' 98" stroke="#f3cf63" stroke-width="7" fill="none"/>' +
      '<circle cx="' + x + '" cy="46" r="6" fill="#f3cf63" stroke-width="3.5"/></g>';
  }).join('');

  P.taiyo = around(12, function (a) {
    return '<path d="M' + polar(100, 100, 56, a) + ' L' + polar(100, 100, 82, a) + '" stroke="#e0a92a" stroke-width="9" fill="none"/>';
  }) + '<circle cx="100" cy="100" r="42" fill="#f3cf63"/>' +
    '<circle cx="86" cy="94" r="4.5" fill="' + INK + '" stroke="none"/><circle cx="114" cy="94" r="4.5" fill="' + INK + '" stroke="none"/>' +
    '<path d="M84 110 Q100 124 116 110" stroke-width="4.5" fill="none"/>';

  P.ame = '<path d="M46 110 Q20 110 22 88 Q24 66 50 68 Q56 36 92 38 Q118 20 142 46 Q176 44 178 76 Q182 110 150 110Z" fill="#b8c3cc"/>' +
    [[56, 130], [92, 140], [128, 130], [74, 166], [112, 172], [150, 160]].map(function (p) {
      return '<path d="M' + p[0] + ' ' + p[1] + ' Q' + (p[0] - 8) + ' ' + (p[1] + 14) + ' ' + p[0] + ' ' + (p[1] + 18) +
        ' Q' + (p[0] + 8) + ' ' + (p[1] + 14) + ' ' + p[0] + ' ' + p[1] + 'Z" fill="#58b8de" stroke-width="3"/>';
    }).join('');

  // ---------- あんぜん ----------
  function person(x, y, color, walk) {
    if (!walk) {
      return '<g fill="' + color + '" stroke="none">' +
        '<circle cx="' + x + '" cy="' + (y - 20) + '" r="8"/>' +
        '<rect x="' + (x - 10) + '" y="' + (y - 10) + '" width="20" height="24" rx="4"/>' +
        '<rect x="' + (x - 9) + '" y="' + (y + 10) + '" width="7" height="18" rx="3"/>' +
        '<rect x="' + (x + 2) + '" y="' + (y + 10) + '" width="7" height="18" rx="3"/></g>';
    }
    return '<g fill="' + color + '" stroke="' + color + '" stroke-width="7" stroke-linecap="round">' +
      '<circle cx="' + (x + 4) + '" cy="' + (y - 20) + '" r="8" stroke="none"/>' +
      '<path d="M' + (x + 2) + ' ' + (y - 8) + ' L' + (x - 2) + ' ' + (y + 10) + '" stroke-width="11" fill="none"/>' +
      '<path d="M' + (x - 2) + ' ' + (y + 10) + ' L' + (x - 12) + ' ' + (y + 26) + ' M' + (x - 2) + ' ' + (y + 10) + ' L' + (x + 12) + ' ' + (y + 26) + '" fill="none"/>' +
      '<path d="M' + (x + 1) + ' ' + (y - 4) + ' L' + (x - 12) + ' ' + (y + 6) + ' M' + (x + 1) + ' ' + (y - 4) + ' L' + (x + 14) + ' ' + (y + 4) + '" stroke-width="6" fill="none"/></g>';
  }
  function signal(go) {
    return '<rect x="46" y="12" width="108" height="176" rx="16" fill="#4a4743"/>' +
      '<rect x="58" y="24" width="84" height="72" rx="8" fill="#2b2926" stroke="none"/>' +
      '<rect x="58" y="104" width="84" height="72" rx="8" fill="#2b2926" stroke="none"/>' +
      (go ? '' : '<rect x="58" y="24" width="84" height="72" rx="8" fill="#ff5a4e" opacity="0.18" stroke="none"/>') +
      (go ? '<rect x="58" y="104" width="84" height="72" rx="8" fill="#3fd07a" opacity="0.18" stroke="none"/>' : '') +
      person(100, 62, go ? '#5b3633' : '#ff5a4e', false) +
      person(100, 142, go ? '#3fd07a' : '#2f4a3a', true);
  }
  P['shingo-ao'] = signal(true);
  P['shingo-aka'] = signal(false);

  P.koen = '<rect x="0" y="170" width="200" height="30" fill="#9fc28f" stroke="none"/>' +
    '<path d="M42 62 L30 172 M72 62 L62 172" stroke-width="7" fill="none"/>' +
    '<path d="M36 90 H68 M34 114 H66 M32 138 H64" stroke-width="5" fill="none"/>' +
    '<rect x="36" y="52" width="46" height="14" rx="4" fill="#f3cf63"/>' +
    '<path d="M80 60 Q120 70 136 130 Q144 162 182 166" stroke="' + INK + '" stroke-width="18" fill="none"/>' +
    '<path d="M80 60 Q120 70 136 130 Q144 162 182 166" stroke="#e0524a" stroke-width="11" fill="none"/>' +
    '<circle cx="160" cy="44" r="20" fill="#f3cf63" stroke="none"/>';

  P.suberidai = P.koen;

  P.doro = '<rect x="0" y="0" width="200" height="200" fill="#dfe8d6" stroke="none"/>' +
    '<rect x="0" y="70" width="200" height="90" fill="#8d8d8d" stroke="none"/>' +
    '<path d="M6 115 H40 M64 115 H98 M122 115 H156 M180 115 H200" stroke="' + W + '" stroke-width="6" fill="none"/>' +
    '<path d="M44 126 L60 98 L124 98 L146 126 L168 128 L168 150 L28 150 L28 128Z" fill="#e0524a"/>' +
    '<path d="M68 104 L90 104 L90 124 L58 124Z M98 104 L120 104 L136 124 L98 124Z" fill="#cfe4f1" stroke-width="3.5"/>' +
    '<circle cx="58" cy="152" r="13" fill="' + INK + '"/><circle cx="138" cy="152" r="13" fill="' + INK + '"/>' +
    '<circle cx="58" cy="152" r="5" fill="#c9ced4" stroke="none"/><circle cx="138" cy="152" r="5" fill="#c9ced4" stroke="none"/>';

  P.yakan = '<path d="M150 112 L184 76 L188 84 L162 128" fill="#c9ced4"/>' +
    '<path d="M70 58 Q100 22 130 58" fill="none" stroke-width="9"/>' +
    '<path d="M70 58 Q100 22 130 58" fill="none" stroke="#3a3a3a" stroke-width="3"/>' +
    '<path d="M40 166 Q34 92 100 76 Q166 92 160 166Z" fill="#c9ced4"/>' +
    '<rect x="32" y="160" width="136" height="16" rx="8" fill="#a9b0b8"/>' +
    '<ellipse cx="100" cy="78" rx="18" ry="6" fill="#a9b0b8"/>' +
    '<path d="M60 110 Q64 96 76 90" stroke="' + W + '" stroke-width="6" fill="none"/>' +
    '<path d="M176 60 Q168 46 178 34 Q188 22 180 8 M160 56 Q152 44 160 32" stroke="#b9c3cc" stroke-width="5" fill="none"/>';

  // ---------- きもち：たべもの ----------
  P.ringo = '<path d="M100 56 Q100 34 112 20" stroke="#8a5a33" stroke-width="7" fill="none"/>' +
    '<path d="M106 40 Q132 14 158 30 Q138 56 106 40Z" fill="#7fb86e"/>' +
    '<path d="M100 60 Q70 40 44 64 Q20 92 34 134 Q50 178 84 178 Q94 178 100 172 Q106 178 116 178 Q150 178 166 134 Q180 92 156 64 Q130 40 100 60Z" fill="#e0524a"/>' +
    '<path d="M54 92 Q60 76 74 72" stroke="#f4a197" stroke-width="7" fill="none"/>';

  P.banana = '<path d="M36 52 Q30 150 120 168 Q160 174 182 154 Q176 146 160 146 Q86 144 62 54Z" fill="#f3d34a"/>' +
    '<path d="M62 54 Q56 40 46 40 Q32 42 36 52" fill="#8a6a3a"/>' +
    '<path d="M56 90 Q76 140 150 154" stroke="#d9b52f" stroke-width="4" fill="none"/>' +
    '<path d="M182 154 L190 150" stroke-width="7"/>';

  P.onigiri = '<path d="M100 26 Q120 26 150 80 Q180 136 168 156 Q160 172 100 172 Q40 172 32 156 Q20 136 50 80 Q80 26 100 26Z" fill="' + W + '"/>' +
    '<rect x="66" y="118" width="68" height="56" rx="4" fill="#3f5a48"/>' +
    '<path d="M82 76h0M110 66h0M124 96h0M76 104h0" stroke="#e8e2d2" stroke-width="5"/>';

  P.pan = '<path d="M38 180 L38 88 Q18 80 24 56 Q34 26 72 30 Q86 18 100 18 Q114 18 128 30 Q166 26 176 56 Q182 80 162 88 L162 180Z" fill="#c98a3a"/>' +
    '<path d="M52 168 L52 82 Q36 76 40 60 Q46 42 76 44 Q88 32 100 32 Q112 32 124 44 Q154 42 160 60 Q164 76 148 82 L148 168Z" fill="#fbe8c4" stroke="none"/>';

  // ---------- きもち：あそび ----------
  P.buranko = '<rect x="0" y="176" width="200" height="24" fill="#9fc28f" stroke="none"/>' +
    '<path d="M30 180 L50 30 L70 180 M130 180 L150 30 L170 180" stroke="#a0552c" stroke-width="8" fill="none"/>' +
    '<path d="M40 30 H160" stroke="#a0552c" stroke-width="10" fill="none"/>' +
    '<path d="M80 32 L76 132 M120 32 L124 132" stroke-width="4" fill="none"/>' +
    '<rect x="64" y="128" width="72" height="14" rx="5" fill="#f3cf63"/>';

  P.boru = '<circle cx="100" cy="100" r="76" fill="#e0524a"/>' +
    '<path d="M100 24 Q60 100 100 176" stroke="' + W + '" stroke-width="16" fill="none"/>' +
    '<path d="M100 24 Q140 100 100 176" stroke="#f3cf63" stroke-width="16" fill="none"/>' +
    '<circle cx="100" cy="100" r="76" fill="none"/>' +
    '<circle cx="100" cy="100" r="10" fill="' + W + '"/>';

  P.tsumiki = '<rect x="22" y="112" width="68" height="68" rx="6" fill="#6f97b8"/>' +
    '<rect x="96" y="112" width="68" height="68" rx="6" fill="#f3c93a"/>' +
    '<rect x="58" y="56" width="70" height="58" rx="6" fill="#7fb86e"/>' +
    '<path d="M54 56 L93 14 L132 56Z" fill="#e0524a"/>';

  P.ehon = '<path d="M100 48 Q60 30 18 42 L18 166 Q60 154 100 170Z" fill="' + W + '"/>' +
    '<path d="M100 48 Q140 30 182 42 L182 166 Q140 154 100 170Z" fill="' + W + '"/>' +
    '<circle cx="58" cy="94" r="18" fill="#f3cf63" stroke-width="4"/>' +
    '<path d="M32 140 Q50 118 66 134 Q78 120 88 138" stroke="#7fb86e" stroke-width="5" fill="none"/>' +
    '<path d="M116 80 H166 M116 100 H160 M116 120 H166 M116 140 H150" stroke="#c9c2b3" stroke-width="5" fill="none"/>';

  P.kureyon = '<rect x="18" y="140" width="164" height="40" rx="6" fill="' + W + '"/>' +
    '<path d="M34 162 Q60 146 86 164 T140 160" stroke="#e0524a" stroke-width="6" fill="none"/>' +
    [['#e0524a', -30, 60], ['#3f6fc6', -14, 98], ['#4f9d5d', 4, 136]].map(function (c) {
      return '<g transform="rotate(' + c[1] + ' ' + c[2] + ' 80)">' +
        '<rect x="' + (c[2] - 13) + '" y="40" width="26" height="80" rx="4" fill="' + c[0] + '"/>' +
        '<rect x="' + (c[2] - 13) + '" y="62" width="26" height="36" fill="' + W + '" stroke-width="3.5"/>' +
        '<path d="M' + (c[2] - 13) + ' 40 L' + c[2] + ' 16 L' + (c[2] + 13) + ' 40Z" fill="' + c[0] + '"/></g>';
    }).join('');

  P.shabondama = '<path d="M28 182 L78 116" stroke="#e07a4a" stroke-width="8" fill="none"/>' +
    '<circle cx="88" cy="104" r="16" fill="none" stroke="#e07a4a" stroke-width="7"/>' +
    [[132, 70, 32], [80, 44, 20], [160, 136, 18], [124, 150, 12], [176, 36, 14]].map(function (c) {
      return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="#e1edf6" stroke="#8fb4d6" stroke-width="4"/>' +
        '<path d="M' + (c[0] - c[2] * 0.55) + ' ' + (c[1] - c[2] * 0.15) + ' Q' + (c[0] - c[2] * 0.5) + ' ' + (c[1] - c[2] * 0.55) + ' ' + (c[0] - c[2] * 0.1) + ' ' + (c[1] - c[2] * 0.6) + '" stroke="' + W + '" stroke-width="4" fill="none"/>';
    }).join('');

  P.fusen = '<path d="M100 132 Q92 160 104 176 Q114 190 104 198" stroke-width="3.5" fill="none"/>' +
    '<path d="M100 132 Q40 116 40 66 Q40 18 100 18 Q160 18 160 66 Q160 116 100 132Z" fill="#e0524a"/>' +
    '<path d="M92 140 L100 130 L108 140Z" fill="#e0524a" stroke-width="3.5"/>' +
    '<path d="M68 52 Q72 36 88 32" stroke="#f4a197" stroke-width="8" fill="none"/>';

  // ---------- きもち：のみもの ----------
  function glass(fill, top, extra) {
    return '<path d="M52 36 L148 36 L136 180 L64 180Z" fill="#eef6fb"/>' +
      '<path d="M' + (52 + (top - 36) * 0.083).toFixed(1) + ' ' + top + ' L' + (148 - (top - 36) * 0.083).toFixed(1) + ' ' + top + ' L136 180 L64 180Z" fill="' + fill + '" stroke="none"/>' +
      (extra || '') +
      '<path d="M52 36 L148 36 L136 180 L64 180Z" fill="none"/>' +
      '<path d="M66 54 L74 160" stroke="' + W + '" stroke-width="6" fill="none" opacity="0.8"/>';
  }
  P.mizu = glass('#a9d4ee', 70);
  P.jusu = '<path d="M112 20 L128 10 M118 16 L104 120" stroke="#e0524a" stroke-width="7" fill="none"/>' +
    glass('#f5a742', 62) +
    '<circle cx="150" cy="44" r="24" fill="#f3c93a"/><circle cx="150" cy="44" r="15" fill="#f8de7c" stroke-width="3"/>' +
    around(6, function (a) { return '<path d="M150 44 L' + polar(150, 44, 15, a) + '" stroke="#e0a92a" stroke-width="2.5"/>'; });
  P.ocha = '<path d="M84 46 Q76 30 86 18 M112 46 Q104 30 114 18" stroke="#b9c3cc" stroke-width="5" fill="none"/>' +
    '<path d="M38 66 L162 66 Q160 150 136 176 L64 176 Q40 150 38 66Z" fill="#e9e2d0"/>' +
    '<ellipse cx="100" cy="66" rx="62" ry="12" fill="#a6c46a"/>' +
    '<path d="M60 112 Q100 128 140 112" stroke="#7fb86e" stroke-width="6" fill="none"/>';
  P.gyunyu = '<path d="M56 64 L100 28 L144 64Z" fill="' + W + '"/>' +
    '<rect x="88" y="16" width="24" height="14" rx="2" fill="' + W + '"/>' +
    '<rect x="56" y="64" width="88" height="120" rx="4" fill="' + W + '"/>' +
    '<rect x="56" y="100" width="88" height="44" fill="#3f6fc6"/>' +
    '<path d="M72 122 Q100 108 128 122" stroke="' + W + '" stroke-width="6" fill="none"/>' +
    '<circle cx="80" cy="164" r="7" fill="' + INK + '" stroke="none"/><circle cx="118" cy="160" r="9" fill="' + INK + '" stroke="none"/>';

  // ---------- きもち：きょうざい ----------
  P.nurie = '<rect x="22" y="22" width="130" height="156" rx="8" fill="' + W + '"/>' +
    around(5, function (a, i) {
      return '<circle cx="87" cy="70" r="16" fill="' + (i < 3 ? '#f4a9bc' : W) + '" stroke-width="4" transform="rotate(' + a + ' 87 96)"/>';
    }) +
    '<circle cx="87" cy="96" r="12" fill="#f3cf63" stroke-width="4"/>' +
    '<path d="M87 124 L87 160" stroke-width="4" fill="none"/>' +
    '<g transform="rotate(30 160 120)"><rect x="148" y="70" width="24" height="90" rx="4" fill="#e0524a"/>' +
    '<rect x="148" y="96" width="24" height="34" fill="' + W + '" stroke-width="3.5"/>' +
    '<path d="M148 160 L160 184 L172 160Z" fill="#e0524a"/></g>';

  P.taiko = '<path d="M150 24 L118 74 M50 24 L82 74" stroke="#a0552c" stroke-width="9" fill="none"/>' +
    '<circle cx="152" cy="22" r="9" fill="#e9b872"/><circle cx="48" cy="22" r="9" fill="#e9b872"/>' +
    '<path d="M30 92 L30 160 Q100 192 170 160 L170 92Z" fill="#e0524a"/>' +
    '<path d="M30 112 Q100 140 170 112 M30 140 Q100 168 170 140" stroke="#f3cf63" stroke-width="4" fill="none"/>' +
    '<ellipse cx="100" cy="92" rx="70" ry="22" fill="#f6ecd6"/>';

  P.hiraganacard = '<rect x="34" y="24" width="132" height="152" rx="14" fill="' + W + '"/>' +
    '<text x="100" y="134" font-size="104" text-anchor="middle" fill="#e07a4a" stroke="none" font-weight="700" ' +
    'font-family="Hiragino Maru Gothic ProN, Hiragino Sans, sans-serif">あ</text>';

  P.kazucard = '<rect x="20" y="40" width="160" height="120" rx="14" fill="' + W + '"/>' +
    '<circle cx="54" cy="100" r="13" fill="#e0524a"/>' +
    '<circle cx="90" cy="86" r="13" fill="#3f6fc6"/><circle cx="90" cy="116" r="13" fill="#3f6fc6"/>' +
    '<circle cx="134" cy="72" r="13" fill="#4f9d5d"/><circle cx="134" cy="100" r="13" fill="#4f9d5d"/><circle cx="134" cy="128" r="13" fill="#4f9d5d"/>';

  P.tokei = '<circle cx="100" cy="100" r="80" fill="' + W + '" stroke-width="7"/>' +
    around(12, function (a, i) {
      return '<path d="M' + polar(100, 100, i % 3 ? 66 : 60, a) + ' L' + polar(100, 100, 72, a) + '" stroke-width="' + (i % 3 ? 3.5 : 6) + '"/>';
    }) +
    '<path d="M100 100 L100 52" stroke-width="7" fill="none"/>' +
    '<path d="M100 100 L136 100" stroke="#e0524a" stroke-width="8" fill="none"/>' +
    '<circle cx="100" cy="100" r="7" fill="' + INK + '"/>';

  P.okane = '<circle cx="76" cy="112" r="56" fill="#c9ced4"/><circle cx="76" cy="112" r="44" fill="none" stroke="#a9b0b8" stroke-width="4"/>' +
    '<text x="76" y="126" font-size="38" text-anchor="middle" fill="#6b7178" stroke="none" font-weight="700" font-family="sans-serif">100</text>' +
    '<circle cx="138" cy="70" r="46" fill="#e2b25a"/><circle cx="138" cy="70" r="34" fill="none" stroke="#c4913a" stroke-width="4"/>' +
    '<text x="138" y="83" font-size="36" text-anchor="middle" fill="#8a5a1a" stroke="none" font-weight="700" font-family="sans-serif">10</text>';

  P.hiyoko = '<path d="M36 112 Q34 70 70 58 Q66 22 104 22 Q140 24 138 62 Q172 76 166 118 Q160 170 100 172 Q40 170 36 112Z" fill="#f6d649"/>' +
    '<circle cx="90" cy="54" r="5" fill="' + INK + '" stroke="none"/><circle cx="122" cy="54" r="5" fill="' + INK + '" stroke="none"/>' +
    '<path d="M100 64 L118 68 L104 78Z" fill="#f08a2e" stroke-width="3.5"/>' +
    '<path d="M70 112 Q90 98 110 120 Q92 136 70 112Z" fill="#efc23a" stroke-width="3.5"/>' +
    '<path d="M80 170 L76 190 M120 170 L124 190" stroke="#f08a2e" stroke-width="6" fill="none"/>';

  P.kado = '<g transform="rotate(-10 70 104)"><rect x="24" y="36" width="88" height="126" rx="10" fill="#8fae9c"/>' +
    '<path d="M34 46 L102 152 M102 46 L34 152" stroke="#b9d3c4" stroke-width="5" fill="none"/></g>' +
    '<g transform="rotate(8 134 100)"><rect x="90" y="34" width="88" height="126" rx="10" fill="' + W + '"/>' +
    '<path d="M134 124 Q100 100 112 80 Q124 66 134 82 Q144 66 156 80 Q168 100 134 124Z" fill="#e8636a"/></g>';

  // ---------- いろ ----------
  var IRO = {
    aka: '#e0524a', ao: '#3f6fc6', kiiro: '#f3c93a', midori: '#4f9d5d',
    pinku: '#f08cb8', murasaki: '#9563c4', orenji: '#f08a2e', mizuiro: '#58b8de'
  };
  Object.keys(IRO).forEach(function (k) {
    P['iro-' + k] = '<circle cx="100" cy="100" r="78" fill="' + IRO[k] + '"/>' +
      '<path d="M56 74 Q66 50 92 42" stroke="#ffffff" stroke-width="10" fill="none" opacity="0.45"/>';
  });

  function svg(id) {
    var body = P[id];
    if (!body) return '';
    return '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<g stroke="' + INK + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' + body + '</g></svg>';
  }

  global.DotchiArt = { svg: svg, has: function (id) { return !!P[id]; }, ids: function () { return Object.keys(P); } };
})(window);
