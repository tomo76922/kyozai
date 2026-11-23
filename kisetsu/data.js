// きせつクイズの問題
//
// ■ 書き方
//   name：答えの言葉。漢字は [漢字:よみ] で書く（くわしくは kanji.js の上）。歌の題名は「 」で囲む
//   pic ：イラスト。絵文字（例：'🍓'、2〜3こ並べてもよい）か、'svg:なまえ'（下の PICS の絵）
//         pic がない言葉は、まちがいの選択肢だけに使う
//
// ■ 夏・秋・冬を足すとき
//   その季節の各ジャンルに、pic のある問題を5問以上入れると、自動で選べるようになる
//   （それまでは「じゅんびちゅう」と出て押せない）
(function () {
  'use strict';

  var INK = '#3d3a35';

  // ---------- 絵の部品 ----------
  // まわりに 花びらを ならべる
  function petals(cx, cy, n, dist, rx, ry, fill, stroke) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var a = 360 * i / n;
      s += '<ellipse cx="' + cx + '" cy="' + (cy - dist) + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' +
        (stroke ? ' stroke="' + stroke + '" stroke-width="1.5"' : '') +
        ' transform="rotate(' + a.toFixed(1) + ' ' + cx + ' ' + cy + ')"/>';
    }
    return s;
  }
  // 菜の花の小さな花（4まいの花びら）
  function nano(cx, cy, r) {
    return petals(cx, cy, 4, r * 0.55, r * 0.5, r * 0.6, '#f4d33c', '#c9a31f') +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.25) + '" fill="#e0a92a"/>';
  }
  // チューリップ1本
  function tulip(x, y, color) {
    return '<path d="M' + x + ' ' + (y + 30) + ' V' + (y + 95) + '" stroke="#5f9a4e" stroke-width="6"/>' +
      '<path d="M' + x + ' ' + (y + 90) + ' Q' + (x - 26) + ' ' + (y + 70) + ' ' + (x - 22) + ' ' + (y + 44) +
        ' Q' + (x - 6) + ' ' + (y + 60) + ' ' + x + ' ' + (y + 90) + 'Z" fill="#79b35f" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M' + (x - 18) + ' ' + y + ' L' + (x - 9) + ' ' + (y + 10) + ' L' + x + ' ' + (y - 4) +
        ' L' + (x + 9) + ' ' + (y + 10) + ' L' + (x + 18) + ' ' + y + ' Q' + (x + 20) + ' ' + (y + 34) + ' ' + x + ' ' + (y + 36) +
        ' Q' + (x - 20) + ' ' + (y + 34) + ' ' + (x - 18) + ' ' + y + 'Z" fill="' + color + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>';
  }
  // ハートの形の葉（あさがお）
  function heart(x, y, k, rot) {
    return '<path d="M0 14 Q-22 0 -16 -12 Q-8 -20 0 -10 Q8 -20 16 -12 Q22 0 0 14Z" fill="#79b35f" stroke="' + INK + '" stroke-width="2.5" ' +
      'transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + (k * 1.3) + ')"/>';
  }
  // あさがおの花（前から見た形）
  function asagaoFlower(cx, cy, r, color) {
    var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '" stroke="' + INK + '" stroke-width="3"/>';
    for (var i = 0; i < 5; i++) {
      var a = (i * 72 - 90) * Math.PI / 180;
      s += '<path d="M' + cx + ' ' + cy + ' L' + (cx + Math.cos(a) * r * 0.92).toFixed(1) + ' ' + (cy + Math.sin(a) * r * 0.92).toFixed(1) +
        '" stroke="#fffdf7" stroke-width="' + (r * 0.12).toFixed(1) + '" stroke-linecap="round" opacity="0.75"/>';
    }
    return s + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.32) + '" fill="#fffdf7"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.1) + '" fill="#f3e3a1"/>';
  }
  // SVG の中の絵文字
  function emo(x, y, size, ch) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="middle" dominant-baseline="central">' + ch + '</text>';
  }

  // ---------- 絵（外部の画像は使わず、ここで描く。viewBox は 0 0 200 200） ----------
  var PICS = {
    // たんぽぽ：黄色い花・ぎざぎざの葉・わた毛
    tanpopo:
      '<path d="M100 110 V188" stroke="#6fa35a" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M100 188 L60 150 L74 152 L52 128 L70 134 L58 112 L84 140 L92 186 Z" fill="#79b35f" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M100 188 L140 150 L126 152 L148 128 L130 134 L142 112 L116 140 L108 186 Z" fill="#79b35f" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      petals(100, 72, 24, 26, 6, 18, '#f3c63a', '#c99a1c') +
      petals(100, 72, 16, 14, 5, 12, '#f7d65a', '#d6a92a') +
      '<circle cx="100" cy="72" r="9" fill="#e9b32a"/>' +
      '<path d="M160 118 V188" stroke="#8fb47e" stroke-width="4"/>' +
      '<circle cx="160" cy="104" r="22" fill="#fffdf7" stroke="#cfc8b8" stroke-width="2" stroke-dasharray="3 3"/>' +
      '<circle cx="160" cy="104" r="4" fill="#b9ae96"/>',

    // なのはな：小さな黄色い花が たくさん
    nanohana:
      '<g stroke="#5f9a4e" stroke-width="5" stroke-linecap="round" fill="none">' +
        '<path d="M60 190 V80"/><path d="M100 190 V50"/><path d="M142 190 V78"/>' +
      '</g>' +
      '<g fill="#79b35f" stroke="' + INK + '" stroke-width="2.5">' +
        '<path d="M60 150 Q30 140 32 116 Q52 124 60 150Z"/><path d="M100 140 Q132 128 128 100 Q106 112 100 140Z"/>' +
        '<path d="M142 160 Q170 150 168 126 Q148 134 142 160Z"/><path d="M100 176 Q70 168 72 144 Q92 152 100 176Z"/>' +
      '</g>' +
      nano(60, 70, 18) + nano(44, 86, 16) + nano(76, 88, 16) + nano(58, 100, 14) +
      nano(100, 38, 18) + nano(84, 54, 16) + nano(116, 54, 16) + nano(100, 70, 15) +
      nano(142, 66, 18) + nano(126, 82, 16) + nano(158, 82, 16) + nano(142, 96, 14),

    // つくし：茶色い ふでのような形
    tsukushi:
      '<path d="M20 188 H180" stroke="#a7895f" stroke-width="6" stroke-linecap="round"/>' +
      [[64, 70, 0], [104, 44, -1], [142, 82, 1]].map(function (t) {
        var x = t[0], y = t[1];
        return '<path d="M' + x + ' ' + (y + 40) + ' V186" stroke="#e8d8b6" stroke-width="12" stroke-linecap="round"/>' +
          [70, 100, 130].filter(function (d) { return y + d < 180; }).map(function (d) {
            return '<path d="M' + (x - 9) + ' ' + (y + d) + ' L' + x + ' ' + (y + d - 8) + ' L' + (x + 9) + ' ' + (y + d) + '" fill="#8a6a45" stroke="#6d5233" stroke-width="2" stroke-linejoin="round"/>';
          }).join('') +
          '<ellipse cx="' + x + '" cy="' + (y + 20) + '" rx="13" ry="26" fill="#a5835a" stroke="' + INK + '" stroke-width="3"/>' +
          '<g stroke="#7c5f3d" stroke-width="2"><path d="M' + (x - 11) + ' ' + (y + 10) + ' H' + (x + 11) + '"/><path d="M' + (x - 12) + ' ' + (y + 22) + ' H' + (x + 12) + '"/><path d="M' + (x - 10) + ' ' + (y + 34) + ' H' + (x + 10) + '"/></g>';
      }).join(''),

    // すみれ：むらさきの小さな花
    sumire:
      '<path d="M100 104 Q96 150 100 188" stroke="#6fa35a" stroke-width="5" fill="none"/>' +
      '<path d="M100 186 Q52 176 50 128 Q86 136 100 186Z" fill="#79b35f" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M100 186 Q150 172 152 130 Q114 140 100 186Z" fill="#79b35f" stroke="' + INK + '" stroke-width="3"/>' +
      '<g fill="#8e6cc4" stroke="' + INK + '" stroke-width="3">' +
        '<ellipse cx="78" cy="58" rx="18" ry="28" transform="rotate(-25 78 58)"/>' +
        '<ellipse cx="122" cy="58" rx="18" ry="28" transform="rotate(25 122 58)"/>' +
        '<ellipse cx="68" cy="92" rx="22" ry="15" transform="rotate(-15 68 92)"/>' +
        '<ellipse cx="132" cy="92" rx="22" ry="15" transform="rotate(15 132 92)"/>' +
        '<ellipse cx="100" cy="112" rx="22" ry="24" fill="#a585d6"/>' +
      '</g>' +
      '<path d="M92 108 L100 122 L108 108" fill="none" stroke="#5b3f8f" stroke-width="2.5"/>' +
      '<circle cx="100" cy="94" r="6" fill="#f3cf63"/>',

    // おたまじゃくし：水の中
    otama:
      '<rect x="8" y="20" width="184" height="168" rx="30" fill="#cfe4ef"/>' +
      '<g fill="#6b8f6a" opacity="0.6"><path d="M30 188 Q34 150 26 120 Q42 150 40 188Z"/><path d="M170 188 Q164 140 176 110 Q178 150 182 188Z"/></g>' +
      [[62, 66, 1], [104, 112, 0.85], [56, 150, 0.75]].map(function (t) {
        var x = t[0], y = t[1], k = t[2];
        return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
          '<path d="M18 0 Q40 -14 58 4 Q72 18 88 6" fill="none" stroke="#3f4a45" stroke-width="7" stroke-linecap="round"/>' +
          '<ellipse cx="0" cy="0" rx="26" ry="21" fill="#3f4a45"/>' +
          '<circle cx="-12" cy="-6" r="5" fill="#fffdf7"/><circle cx="-13" cy="-6" r="2.4" fill="#222"/>' +
          '</g>';
      }).join('') +
      '<g fill="none" stroke="#fffdf7" stroke-width="3"><circle cx="150" cy="50" r="7"/><circle cx="164" cy="34" r="4"/></g>',

    // たけのこ
    takenoko:
      '<path d="M20 176 Q100 160 180 176 V188 H20Z" fill="#b99a6c"/>' +
      '<path d="M100 18 Q112 60 146 120 Q160 150 150 172 H50 Q40 150 54 120 Q88 60 100 18Z" fill="#c9a36c" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M100 18 Q106 40 112 58 Q100 62 88 58 Q94 40 100 18Z" fill="#b8c96a" stroke="' + INK + '" stroke-width="3"/>' +
      '<g fill="#a77f4c" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
        '<path d="M100 172 Q60 150 72 100 Q92 130 100 172Z"/>' +
        '<path d="M100 172 Q140 150 128 100 Q108 130 100 172Z"/>' +
        '<path d="M100 172 Q56 170 50 172 Q48 140 62 124 Q78 150 100 172Z"/>' +
        '<path d="M100 172 Q144 170 150 172 Q152 140 138 124 Q122 150 100 172Z"/>' +
      '</g>' +
      '<g fill="#6d4f2e"><circle cx="84" cy="88" r="2"/><circle cx="114" cy="94" r="2"/><circle cx="96" cy="120" r="2"/><circle cx="108" cy="72" r="2"/></g>',

    // さくらもち：ピンクの もちを 葉で まく
    sakuramochi:
      '<ellipse cx="100" cy="164" rx="86" ry="20" fill="#e9e1d1" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="96" cy="112" rx="66" ry="46" fill="#f4bccb" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<g fill="#f8d3dc"><circle cx="70" cy="96" r="3"/><circle cx="90" cy="84" r="3"/><circle cx="112" cy="92" r="3"/><circle cx="80" cy="118" r="3"/><circle cx="104" cy="112" r="3"/></g>' +
      '<path d="M70 156 Q60 126 86 106 Q120 88 154 108 Q174 128 160 152 Q130 166 70 156Z" fill="#7fa865" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M76 150 Q116 124 158 114" fill="none" stroke="#4f7a3d" stroke-width="3"/>' +
      '<g fill="none" stroke="#4f7a3d" stroke-width="2"><path d="M98 138 L94 120"/><path d="M118 130 L114 110"/><path d="M138 122 L136 106"/><path d="M104 136 L120 150"/><path d="M124 128 L142 142"/></g>' +
      petals(150, 60, 5, 9, 7, 10, '#f6c7d3', INK) + '<circle cx="150" cy="60" r="4" fill="#e0889c"/>',

    // 春キャベツ
    kyabetsu:
      '<path d="M100 186 Q30 186 22 128 Q20 90 52 82 Q40 120 100 132 Q160 120 148 82 Q180 90 178 128 Q170 186 100 186Z" fill="#8fc070" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<circle cx="100" cy="104" r="64" fill="#c8e3a3" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<g fill="none" stroke="#86b064" stroke-width="3" stroke-linecap="round">' +
        '<path d="M100 166 Q96 120 100 44"/>' +
        '<path d="M100 130 Q72 116 58 82"/><path d="M100 130 Q128 116 142 82"/>' +
        '<path d="M100 100 Q80 92 74 66"/><path d="M100 100 Q120 92 126 66"/>' +
        '<path d="M48 126 Q70 150 100 150 Q130 150 152 126"/>' +
      '</g>',

    // そらまめ：さやの中に 豆
    soramame:
      '<path d="M20 120 Q20 70 70 66 Q100 64 130 52 Q182 40 184 88 Q186 132 130 138 Q100 140 70 150 Q20 162 20 120Z" fill="#7fb35f" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M34 118 Q34 84 70 82 Q100 80 130 68 Q168 58 168 92 Q168 120 130 122 Q100 124 70 134 Q34 146 34 118Z" fill="#f4f1df"/>' +
      [[62, 110], [102, 100], [142, 90]].map(function (p) {
        return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="20" ry="17" fill="#b5d77d" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M' + (p[0] - 6) + ' ' + (p[1] - 14) + ' Q' + (p[0] + 4) + ' ' + (p[1] - 8) + ' ' + (p[0] + 6) + ' ' + (p[1] - 15) + '" fill="none" stroke="#2f3a2a" stroke-width="4" stroke-linecap="round"/>';
      }).join(''),

    // 「春の小川」：岸に花、小川に小さな魚
    ogawa:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#a9cf86"/>' +
      '<path d="M-10 70 Q60 60 90 100 Q120 140 210 130 V176 Q120 186 80 146 Q50 112 -10 116Z" fill="#8fc3e3"/>' +
      '<g fill="none" stroke="#e8f4fb" stroke-width="3" stroke-linecap="round"><path d="M20 92 Q34 88 44 92"/><path d="M110 140 Q124 136 134 142"/><path d="M160 154 Q172 150 182 154"/></g>' +
      '<g fill="#4f7fa3"><path d="M64 98 Q72 90 82 98 Q72 106 64 98Z M82 98 L90 92 L90 104Z"/><path d="M126 152 Q134 144 144 152 Q134 160 126 152Z M144 152 L152 146 L152 158Z"/></g>' +
      petals(40, 40, 5, 6, 5, 7, '#a585d6') + '<circle cx="40" cy="40" r="3" fill="#f3cf63"/>' +
      petals(150, 70, 5, 6, 5, 7, '#f3a6c0') + '<circle cx="150" cy="70" r="3" fill="#f3cf63"/>' +
      petals(176, 40, 5, 6, 5, 7, '#a585d6') + '<circle cx="176" cy="40" r="3" fill="#f3cf63"/>' +
      petals(30, 168, 5, 6, 5, 7, '#f3a6c0') + '<circle cx="30" cy="168" r="3" fill="#f3cf63"/>' +
      petals(60, 186, 5, 6, 5, 7, '#a585d6') + '<circle cx="60" cy="186" r="3" fill="#f3cf63"/>' +
      petals(110, 30, 5, 6, 5, 7, '#f3a6c0') + '<circle cx="110" cy="30" r="3" fill="#f3cf63"/>',

    // 「ちょうちょう」：菜の花に ちょうちょう
    chocho:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#e3f0f7"/>' +
      '<g stroke="#5f9a4e" stroke-width="4"><path d="M40 200 V140"/><path d="M100 200 V150"/><path d="M160 200 V136"/></g>' +
      nano(40, 132, 14) + nano(28, 146, 12) + nano(52, 148, 12) +
      nano(100, 142, 14) + nano(88, 156, 12) + nano(112, 156, 12) +
      nano(160, 128, 14) + nano(148, 142, 12) + nano(172, 142, 12) +
      emo(70, 70, 56, '🦋') + emo(140, 54, 40, '🦋') +
      '<path d="M70 98 Q90 120 112 100 Q130 84 150 74" fill="none" stroke="#b5ad9e" stroke-width="2" stroke-dasharray="4 5"/>',

    // 「どこかで春が」：雪がとけて水が流れ、芽が出て、鳥が鳴く
    dokokade:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#dcecf5"/>' +
      '<path d="M0 120 Q60 96 120 112 Q170 124 200 110 V200 H0Z" fill="#b9d796"/>' +
      '<path d="M0 124 Q30 112 60 116 Q50 130 20 134 Q8 136 0 134Z" fill="#fbfbf7"/>' +
      '<path d="M150 122 Q176 114 200 112 V128 Q176 132 156 130Z" fill="#fbfbf7"/>' +
      '<path d="M60 200 Q72 170 100 160 Q126 150 132 130" fill="none" stroke="#8fc3e3" stroke-width="10" stroke-linecap="round"/>' +
      emo(40, 160, 34, '🌱') + emo(160, 162, 34, '🌱') + emo(120, 186, 26, '🌱') +
      emo(140, 46, 38, '🐦') +
      '<g fill="none" stroke="#7a746a" stroke-width="2.5" stroke-linecap="round"><path d="M164 30 Q170 26 176 30"/><path d="M166 40 Q172 36 178 40"/></g>' +
      '<circle cx="44" cy="44" r="18" fill="#f7dc85"/>',

    // 「春が来た」：山にも 里にも 野にも 花
    harugakita:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#dcecf5"/>' +
      '<path d="M-10 130 L50 50 L100 120 L140 70 L210 140 V200 H-10Z" fill="#9cc57e"/>' +
      '<path d="M50 50 L36 68 Q50 62 64 70Z M140 70 L128 86 Q140 80 152 88Z" fill="#fbfbf7"/>' +
      '<path d="M-10 160 Q100 140 210 160 V200 H-10Z" fill="#b9d796"/>' +
      '<g fill="#f6c7d3" stroke="#e0889c" stroke-width="1.5"><circle cx="54" cy="92" r="9"/><circle cx="66" cy="100" r="9"/><circle cx="44" cy="104" r="8"/><circle cx="142" cy="104" r="9"/><circle cx="154" cy="112" r="8"/></g>' +
      emo(100, 150, 36, '🏠') + emo(160, 160, 30, '🌸') +
      emo(30, 180, 22, '🌼') + emo(70, 186, 22, '🌷') + emo(130, 186, 22, '🌼') + emo(180, 188, 22, '🌷') +
      '<circle cx="170" cy="32" r="16" fill="#f7dc85"/>',

    // 「チューリップ」：赤・白・黄色が ならぶ
    tulips:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#f2f6e9"/>' +
      '<path d="M0 176 H200 V200 H0Z" fill="#b99a6c"/>' +
      tulip(44, 70, '#e0524a') + tulip(100, 60, '#fbfbf7') + tulip(156, 70, '#f3cf3c'),

    // 「おぼろ月夜」：菜の花ばたけに 夕日がしずみ、かすんだ月
    oborozukiyo:
      '<defs><linearGradient id="kisetsu-yuu" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#9a8fc0"/><stop offset="0.6" stop-color="#e9b48f"/><stop offset="1" stop-color="#f4d6a0"/>' +
      '</linearGradient><filter id="kisetsu-kasumi" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>' +
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="url(#kisetsu-yuu)"/>' +
      '<circle cx="146" cy="50" r="26" fill="#fff6d8" filter="url(#kisetsu-kasumi)"/>' +
      '<circle cx="146" cy="50" r="17" fill="#fff3c6" opacity="0.9"/>' +
      '<path d="M0 120 L40 92 L80 116 L120 90 L170 118 L200 104 V140 H0Z" fill="#8c86ad" opacity="0.7"/>' +
      '<path d="M0 132 Q100 118 200 132 V200 H0Z" fill="#e8cf4a"/>' +
      '<g fill="#f6dd5c">' + [20, 50, 80, 110, 140, 170].map(function (x, i) {
        return '<circle cx="' + x + '" cy="' + (148 + (i % 2) * 8) + '" r="9"/><circle cx="' + (x + 14) + '" cy="' + (172 + (i % 2) * 6) + '" r="10"/>';
      }).join('') + '</g>' +
      '<g stroke="#6f9a4e" stroke-width="2.5" opacity="0.7">' + [26, 64, 96, 126, 158, 186].map(function (x) {
        return '<path d="M' + x + ' 200 V184"/>';
      }).join('') + '</g>',

    // ===== 夏 =====
    // あさがお：ささえの ぼうに つるが まきつく
    asagao:
      '<path d="M150 14 V192" stroke="#c9a36c" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M150 190 Q120 176 150 160 Q180 144 150 128 Q120 112 150 96 Q180 80 150 64 Q128 52 140 36" fill="none" stroke="#6fa35a" stroke-width="4"/>' +
      heart(124, 150, 1, -30) + heart(176, 112, 0.9, 30) + heart(128, 82, 0.8, -20) +
      asagaoFlower(70, 70, 40, '#5b7fd6') + asagaoFlower(84, 150, 32, '#c66bb8'),

    // あじさい：小さな花が まるく あつまる
    ajisai:
      '<path d="M100 120 V192" stroke="#6fa35a" stroke-width="6"/>' +
      '<path d="M100 170 Q50 176 30 140 Q70 130 100 170Z" fill="#6fa35a" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M100 166 Q150 172 170 136 Q130 126 100 166Z" fill="#6fa35a" stroke="' + INK + '" stroke-width="3"/>' +
      '<g stroke="#5a6fa0" stroke-width="1.2">' + (function () {
        var s = '';
        var cols = ['#8fa8e0', '#a38fd6', '#7f9ad8', '#b4a0e0'];
        var k = 0;
        for (var y = 34; y <= 124; y += 18) {
          for (var x = 30; x <= 170; x += 18) {
            var dx = x - 100, dy = (y - 80) * 1.4;
            if (dx * dx + dy * dy > 68 * 68) continue;
            var ox = (y / 18) % 2 ? 9 : 0;
            s += petals(x + ox, y, 4, 5, 5, 6, cols[k++ % cols.length]);
          }
        }
        return s;
      })() + '</g>',

    // ゆり：白い大きな花
    yuri:
      '<path d="M100 110 Q96 150 100 192" stroke="#6fa35a" stroke-width="6" fill="none"/>' +
      '<g fill="#79b35f" stroke="' + INK + '" stroke-width="2.5">' +
        '<path d="M100 150 Q60 140 44 110 Q80 118 100 150Z"/><path d="M100 172 Q140 162 158 132 Q120 140 100 172Z"/>' +
      '</g>' +
      '<g fill="#fffdf7" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
        [0, 60, 120, 180, 240, 300].map(function (a) {
          return '<path d="M100 72 Q84 40 100 8 Q116 40 100 72Z" transform="rotate(' + a + ' 100 72)"/>';
        }).join('') +
      '</g>' +
      '<g stroke="#f0c24a" stroke-width="2" opacity="0.8">' +
        [0, 60, 120, 180, 240, 300].map(function (a) {
          return '<path d="M100 66 V32" transform="rotate(' + a + ' 100 72)"/>';
        }).join('') +
      '</g>' +
      '<g stroke="#6fa35a" stroke-width="2.5">' + [-50, -25, 0, 25, 50].map(function (a) {
        return '<path d="M100 72 V44" transform="rotate(' + a + ' 100 72)"/>';
      }).join('') + '</g>' +
      '<g fill="#c8743a">' + [-50, -25, 0, 25, 50].map(function (a) {
        return '<ellipse cx="100" cy="42" rx="3" ry="6" transform="rotate(' + a + ' 100 72)"/>';
      }).join('') + '</g>',

    // せみ：木の みきに とまる
    semi:
      '<rect x="56" y="0" width="88" height="200" fill="#a9845a"/>' +
      '<g stroke="#8a6a45" stroke-width="3" fill="none"><path d="M70 10 Q66 60 72 110 Q76 160 70 200"/><path d="M128 0 Q134 70 126 130 Q122 170 130 200"/></g>' +
      '<g transform="translate(100 104) scale(1.45)">' +
        '<g fill="#d9ecf2" fill-opacity="0.85" stroke="' + INK + '" stroke-width="2.5">' +
          '<path d="M-6 -30 Q-46 -6 -38 56 Q-24 70 -4 30Z"/><path d="M6 -30 Q46 -6 38 56 Q24 70 4 30Z"/>' +
        '</g>' +
        '<g stroke="#7d9aa6" stroke-width="1.5" fill="none"><path d="M-10 -20 Q-30 10 -30 50"/><path d="M10 -20 Q30 10 30 50"/></g>' +
        '<ellipse cx="0" cy="4" rx="16" ry="34" fill="#4a3b2c" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<ellipse cx="0" cy="-32" rx="22" ry="12" fill="#5a4632" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<circle cx="-18" cy="-36" r="6" fill="#2d2620"/><circle cx="18" cy="-36" r="6" fill="#2d2620"/>' +
        '<path d="M-8 -16 H8" stroke="#7fae6a" stroke-width="3"/>' +
      '</g>',

    // かぶとむし：大きな つの
    kabuto:
      '<path d="M10 176 Q100 166 190 176" stroke="#a7895f" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<g stroke="' + INK + '" stroke-width="4" stroke-linecap="round" fill="none">' +
        '<path d="M70 140 L58 170"/><path d="M100 146 L100 172"/><path d="M130 140 L146 170"/>' +
      '</g>' +
      '<ellipse cx="112" cy="118" rx="62" ry="36" fill="#6b3a22" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M112 84 V152" stroke="#4a2614" stroke-width="2.5"/>' +
      '<path d="M86 94 Q100 88 108 96" stroke="#b07a52" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="54" cy="112" rx="22" ry="20" fill="#5a2f1b" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M60 100 Q70 84 84 86" stroke="#5a2f1b" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M38 118 Q12 112 12 78" stroke="#5a2f1b" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<path d="M12 80 L4 68 M12 80 L22 68" stroke="#5a2f1b" stroke-width="7" stroke-linecap="round"/>' +
      '<circle cx="48" cy="116" r="3" fill="#e9d9b6"/>',

    // くわがた：大きな あご（上から見た形）
    kuwagata:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#e6dcc6"/>' +
      '<g stroke="' + INK + '" stroke-width="4" stroke-linecap="round" fill="none">' +
        '<path d="M80 100 L50 84 L40 70"/><path d="M120 100 L150 84 L160 70"/>' +
        '<path d="M78 122 L46 124 L34 112"/><path d="M122 122 L154 124 L166 112"/>' +
        '<path d="M80 146 L52 164 L48 182"/><path d="M120 146 L148 164 L152 182"/>' +
      '</g>' +
      '<g fill="#3a2a1e" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
        '<path d="M82 64 Q60 50 62 18 Q72 30 76 26 Q74 44 92 56Z"/>' +
        '<path d="M118 64 Q140 50 138 18 Q128 30 124 26 Q126 44 108 56Z"/>' +
        '<ellipse cx="100" cy="70" rx="24" ry="14"/>' +
        '<path d="M76 88 Q100 80 124 88 L122 100 Q100 104 78 100Z"/>' +
        '<ellipse cx="100" cy="140" rx="28" ry="40"/>' +
      '</g>' +
      '<path d="M100 102 V178" stroke="#1f1610" stroke-width="2.5"/>' +
      '<path d="M88 116 Q92 110 96 112" stroke="#8a6a52" stroke-width="4" fill="none" stroke-linecap="round"/>',

    // ほたる：夜に 光る
    hotaru:
      '<defs><filter id="kisetsu-hikari" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>' +
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#26324f"/>' +
      '<g fill="#3d5a3a"><path d="M0 200 Q20 140 14 110 Q34 150 30 200Z"/><path d="M40 200 Q46 150 60 130 Q56 170 62 200Z"/><path d="M150 200 Q160 150 150 120 Q174 150 172 200Z"/><path d="M180 200 Q186 160 200 146 V200Z"/></g>' +
      [[40, 60], [150, 40], [170, 96], [64, 120], [120, 160]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="10" fill="#e9f27a" filter="url(#kisetsu-hikari)"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#f7fbc4"/>';
      }).join('') +
      '<g transform="translate(100 96) rotate(-20)">' +
        '<circle cx="0" cy="26" r="20" fill="#e9f27a" filter="url(#kisetsu-hikari)"/>' +
        '<ellipse cx="0" cy="6" rx="12" ry="26" fill="#2b2b2b" stroke="#111" stroke-width="2"/>' +
        '<ellipse cx="0" cy="26" rx="10" ry="9" fill="#f4f7a8"/>' +
        '<ellipse cx="0" cy="-20" rx="9" ry="7" fill="#d9584a"/>' +
        '<path d="M-4 -26 L-10 -40 M4 -26 L10 -40" stroke="#2b2b2b" stroke-width="2.5" stroke-linecap="round"/>' +
      '</g>',

    // 「うみ」：ひろい うみに 日が しずむ
    umi:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#f6d8a8"/>' +
      '<circle cx="100" cy="104" r="30" fill="#f2a65a"/>' +
      '<path d="M0 104 H200 V200 H0Z" fill="#4f8fc4"/>' +
      '<g fill="none" stroke="#a9cde8" stroke-width="3" stroke-linecap="round">' +
        '<path d="M86 116 H114"/><path d="M78 128 H122"/><path d="M20 146 Q30 140 40 146 Q50 152 60 146"/><path d="M130 160 Q140 154 150 160 Q160 166 170 160"/><path d="M50 180 Q60 174 70 180 Q80 186 90 180"/>' +
      '</g>' +
      emo(150, 92, 34, '⛵') +
      '<g fill="none" stroke="#7a746a" stroke-width="2.5" stroke-linecap="round"><path d="M36 50 Q42 44 48 50 Q54 44 60 50"/><path d="M60 30 Q65 25 70 30 Q75 25 80 30"/></g>',

    // 「たなばたさま」：ささの葉に たんざく、夜空に 星
    tanabata:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#2e3a66"/>' +
      '<path d="M40 0 Q110 90 200 120 V80 Q140 60 90 0Z" fill="#5a6aa0" opacity="0.55"/>' +
      [[30, 30], [170, 50], [150, 20], [60, 70], [180, 120], [140, 90], [20, 110]].map(function (p) {
        return '<path d="M' + p[0] + ' ' + (p[1] - 7) + ' L' + (p[0] + 2) + ' ' + (p[1] - 2) + ' L' + (p[0] + 7) + ' ' + p[1] + ' L' + (p[0] + 2) + ' ' + (p[1] + 2) + ' L' + p[0] + ' ' + (p[1] + 7) + ' L' + (p[0] - 2) + ' ' + (p[1] + 2) + ' L' + (p[0] - 7) + ' ' + p[1] + ' L' + (p[0] - 2) + ' ' + (p[1] - 2) + 'Z" fill="#fbe7a6"/>';
      }).join('') +
      '<path d="M90 200 Q92 120 104 40" stroke="#6fa35a" stroke-width="6" fill="none"/>' +
      '<g fill="#79b35f" stroke="#3f6a33" stroke-width="2">' +
        [[100, 60, -40], [104, 66, 30], [96, 96, -50], [100, 104, 40], [94, 136, -35], [96, 142, 45], [104, 44, 0]].map(function (l) {
          return '<path d="M' + l[0] + ' ' + l[1] + ' q12 -4 34 2 q-20 8 -34 -2Z" transform="rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')' + (l[2] < 0 ? ' scale(-1 1) translate(' + (-2 * l[0]) + ' 0)' : '') + '"/>';
        }).join('') +
      '</g>' +
      '<g stroke="' + INK + '" stroke-width="1.5">' +
        '<rect x="122" y="70" width="10" height="28" fill="#f2a6c0"/><rect x="70" y="80" width="10" height="28" fill="#f3cf63"/>' +
        '<rect x="122" y="128" width="10" height="28" fill="#8fc3e3"/><rect x="66" y="132" width="10" height="28" fill="#a585d6"/>' +
      '</g>',

    // 「かたつむり」：雨の日の 葉っぱの上
    katatsumuri:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#dfe6ec"/>' +
      '<g stroke="#9fb3c4" stroke-width="3" stroke-linecap="round">' +
        '<path d="M30 14 L22 34"/><path d="M80 10 L72 30"/><path d="M130 18 L122 38"/><path d="M176 12 L168 32"/><path d="M52 50 L44 70"/><path d="M156 56 L148 76"/>' +
      '</g>' +
      '<path d="M20 170 Q40 100 110 96 Q170 96 186 150 Q130 196 20 170Z" fill="#79b35f" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M26 166 Q100 140 180 148" fill="none" stroke="#4f7a3d" stroke-width="3"/>' +
      petals(150, 76, 4, 6, 6, 7, '#a38fd6') + petals(166, 70, 4, 6, 6, 7, '#8fa8e0') + petals(158, 60, 4, 6, 6, 7, '#b4a0e0') +
      emo(96, 120, 70, '🐌'),

    // 「ほたるこい」：夜の 水べに ほたる
    hotarukoi:
      '<defs><filter id="kisetsu-hikari2" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>' +
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#2a3456"/>' +
      '<circle cx="160" cy="36" r="14" fill="#f7efc4"/>' +
      '<path d="M0 130 Q60 120 100 136 Q150 150 200 134 V200 H0Z" fill="#35507a"/>' +
      '<g fill="none" stroke="#5b7aa8" stroke-width="2.5" stroke-linecap="round"><path d="M30 156 H60"/><path d="M110 170 H150"/><path d="M60 186 H90"/></g>' +
      '<g fill="#3d5a3a"><path d="M0 132 Q10 90 6 70 Q24 100 20 134Z"/><path d="M180 134 Q186 96 200 80 V136Z"/></g>' +
      [[40, 60], [70, 90], [120, 70], [150, 100], [96, 40], [60, 120], [140, 124]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#e9f27a" filter="url(#kisetsu-hikari2)"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="#f7fbc4"/>';
      }).join('') +
      emo(100, 112, 40, '🧒'),

    // 「夏は来ぬ」：卯の花の さく かきねに ほととぎす
    natsuwakinu:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#e3f0f7"/>' +
      '<path d="M0 150 H200 V200 H0Z" fill="#a9cf86"/>' +
      '<g stroke="#6fa35a" stroke-width="3">' + [20, 44, 68, 92, 116, 140, 164, 188].map(function (x) {
        return '<path d="M' + x + ' 196 V176 M' + (x - 5) + ' 180 L' + x + ' 186 L' + (x + 5) + ' 180"/>';
      }).join('') + '</g>' +
      '<g fill="#c9a36c" stroke="' + INK + '" stroke-width="2">' +
        '<rect x="0" y="96" width="200" height="8"/><rect x="0" y="126" width="200" height="8"/>' +
        [16, 56, 96, 136, 176].map(function (x) { return '<rect x="' + (x - 4) + '" y="84" width="8" height="66"/>'; }).join('') +
      '</g>' +
      '<g fill="#7fae62">' +
        '<ellipse cx="40" cy="92" rx="34" ry="22"/><ellipse cx="110" cy="88" rx="40" ry="24"/><ellipse cx="176" cy="94" rx="30" ry="20"/>' +
      '</g>' +
      '<g fill="#fffdf7" stroke="#cfc8b8" stroke-width="1">' + [[24, 84], [40, 76], [54, 92], [32, 100], [90, 80], [104, 70], [118, 84], [130, 74], [100, 96], [126, 98], [164, 86], [180, 80], [190, 98], [170, 100], [70, 88], [150, 90]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5"/>';
      }).join('') + '</g>' +
      emo(140, 38, 40, '🐦') +
      '<g fill="none" stroke="#7a746a" stroke-width="2.5" stroke-linecap="round"><path d="M166 22 Q172 18 178 22"/><path d="M168 32 Q174 28 180 32"/></g>',

    // ===== 秋 =====
    // コスモス：細い葉と 8まいの 花びら
    cosmos:
      '<g stroke="#6fa35a" stroke-width="3" fill="none">' +
        '<path d="M60 84 Q56 140 66 196"/><path d="M140 64 Q146 130 134 196"/><path d="M100 126 Q98 160 102 196"/>' +
        '<path d="M64 150 L44 136 M62 162 L82 148 M138 150 L158 138 M136 166 L118 152 M100 170 L84 160"/>' +
      '</g>' +
      petals(60, 70, 8, 20, 9, 18, '#f2a6c0', INK) + '<circle cx="60" cy="70" r="9" fill="#f3cf3c" stroke="' + INK + '" stroke-width="2"/>' +
      petals(140, 50, 8, 20, 9, 18, '#d9588a', INK) + '<circle cx="140" cy="50" r="9" fill="#f3cf3c" stroke="' + INK + '" stroke-width="2"/>' +
      petals(100, 116, 8, 18, 8, 16, '#fbf3f5', INK) + '<circle cx="100" cy="116" r="8" fill="#f3cf3c" stroke="' + INK + '" stroke-width="2"/>',

    // 菊：細い花びらが たくさん かさなる
    kiku:
      '<path d="M100 120 V194" stroke="#5f9a4e" stroke-width="7"/>' +
      '<g fill="#5f9a4e" stroke="' + INK + '" stroke-width="2.5">' +
        '<path d="M100 160 Q70 150 56 168 Q62 148 50 140 Q74 132 100 160Z"/><path d="M100 176 Q130 166 144 182 Q138 162 150 154 Q126 148 100 176Z"/>' +
      '</g>' +
      petals(100, 76, 28, 40, 6, 22, '#f0c23a', '#b78a18') +
      petals(100, 76, 22, 26, 6, 18, '#f5d04e', '#c49a22') +
      petals(100, 76, 16, 13, 5, 12, '#f8dc6c', '#cda52e') +
      '<circle cx="100" cy="76" r="8" fill="#e9b32a"/>',

    // ひがんばな：赤い花びらが そりかえり、長い しべ
    higanbana:
      '<path d="M100 100 V196" stroke="#5f9a4e" stroke-width="6"/>' +
      '<g fill="none" stroke="#d63c32" stroke-width="2.5" stroke-linecap="round">' +
        [-80, -50, -20, 10, 40, 70, 100, 130, 160, 190, 220, 250].map(function (a) {
          return '<path d="M100 84 Q100 40 108 20" transform="rotate(' + a + ' 100 84)"/>';
        }).join('') +
      '</g>' +
      '<g fill="#e0483c" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round">' +
        [0, 60, 120, 180, 240, 300].map(function (a) {
          return '<path d="M100 84 Q86 66 92 50 Q104 46 108 56 Q102 64 100 84Z" transform="rotate(' + a + ' 100 84)"/>';
        }).join('') +
      '</g>' +
      '<g fill="#f3cf3c">' + [-80, -50, -20, 10, 40, 70, 100, 130, 160, 190, 220, 250].map(function (a) {
        return '<circle cx="108" cy="20" r="2.5" transform="rotate(' + a + ' 100 84)"/>';
      }).join('') + '</g>',

    // きんもくせい：こい緑の葉に、だいだい色の 小さな花
    kinmokusei:
      '<path d="M10 150 Q80 120 190 60" stroke="#7a5a3a" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<g fill="#3f7a4a" stroke="' + INK + '" stroke-width="2.5">' +
        [[40, 120, -60], [70, 150, 40], [96, 96, -70], [124, 126, 30], [150, 70, -60], [176, 98, 30], [60, 90, -40], [140, 40, -30]].map(function (l) {
          return '<ellipse cx="' + l[0] + '" cy="' + l[1] + '" rx="12" ry="26" transform="rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')"/>';
        }).join('') +
      '</g>' +
      [[54, 136], [86, 120], [112, 108], [136, 92], [162, 80], [78, 104], [126, 76]].map(function (c) {
        var s = '';
        [[0, 0], [10, -4], [-8, 6], [6, 10], [-4, -10]].forEach(function (d) {
          s += petals(c[0] + d[0], c[1] + d[1], 4, 3, 3, 3.6, '#f29a3a', '#c86a1a');
        });
        return s;
      }).join(''),

    // すすき：ふさふさの穂
    susuki:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#e9eef2"/>' +
      [[60, 196, 40, 50, -14], [100, 196, 100, 24, 6], [140, 196, 158, 58, 20], [80, 196, 64, 96, -8], [124, 196, 130, 100, 12]].map(function (t) {
        var x0 = t[0], y0 = t[1], x1 = t[2], y1 = t[3], bend = t[4];
        var s = '<path d="M' + x0 + ' ' + y0 + ' Q' + ((x0 + x1) / 2 + bend) + ' ' + ((y0 + y1) / 2) + ' ' + x1 + ' ' + y1 + '" stroke="#8a9a6a" stroke-width="3" fill="none"/>';
        for (var i = 0; i < 9; i++) {
          var yy = y1 + i * 6;
          var xx = x1 + (bend / 40) * i * 2;
          s += '<path d="M' + xx + ' ' + yy + ' q' + (8 + bend / 3) + ' -2 ' + (18 + bend / 2) + ' 8" stroke="#c9b48a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
               '<path d="M' + xx + ' ' + yy + ' q' + (-8 + bend / 3) + ' -2 ' + (-14 + bend / 2) + ' 10" stroke="#d8c7a2" stroke-width="3" fill="none" stroke-linecap="round"/>';
        }
        return s;
      }).join('') +
      '<path d="M20 196 Q40 150 30 120 M180 196 Q164 150 176 120" stroke="#8fa86a" stroke-width="4" fill="none"/>',

    // すずむし：まるい羽と 長い しょっかく
    suzumushi:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#e6dcc6"/>' +
      '<g stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round" fill="none">' +
        '<path d="M80 96 L52 80 L44 64"/><path d="M120 96 L148 80 L156 64"/>' +
        '<path d="M80 120 L50 128 L40 116"/><path d="M120 120 L150 128 L160 116"/>' +
        '<path d="M84 140 Q50 160 34 196"/><path d="M116 140 Q150 160 166 196"/>' +
      '</g>' +
      '<g fill="none" stroke="#3a3530" stroke-width="2"><path d="M92 50 Q70 20 40 10"/><path d="M108 50 Q130 20 160 10"/></g>' +
      '<g fill="#fffdf7"><circle cx="70" cy="26" r="2.5"/><circle cx="130" cy="26" r="2.5"/></g>' +
      '<ellipse cx="100" cy="60" rx="14" ry="12" fill="#2b2620" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M100 70 Q56 90 60 136 Q72 172 100 176 Q128 172 140 136 Q144 90 100 70Z" fill="#4a4136" stroke="' + INK + '" stroke-width="3"/>' +
      '<g fill="none" stroke="#7a6d5a" stroke-width="2"><path d="M100 72 V174"/><path d="M100 90 Q76 100 70 130"/><path d="M100 90 Q124 100 130 130"/><path d="M100 110 Q84 120 82 150"/><path d="M100 110 Q116 120 118 150"/></g>' +
      '<g stroke="#2b2620" stroke-width="3"><path d="M94 176 L90 192"/><path d="M106 176 L110 192"/></g>',

    // とんぼ（あかとんぼ）：上から見た形
    tonbo:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#dcecf5"/>' +
      '<g fill="#f6fbfd" fill-opacity="0.9" stroke="#7d9aa6" stroke-width="2">' +
        '<ellipse cx="54" cy="62" rx="48" ry="12" transform="rotate(-8 54 62)"/><ellipse cx="146" cy="62" rx="48" ry="12" transform="rotate(8 146 62)"/>' +
        '<ellipse cx="56" cy="86" rx="44" ry="11" transform="rotate(10 56 86)"/><ellipse cx="144" cy="86" rx="44" ry="11" transform="rotate(-10 144 86)"/>' +
      '</g>' +
      '<rect x="94" y="96" width="12" height="94" rx="6" fill="#d9483a" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<g stroke="#a8342a" stroke-width="2">' + [110, 124, 138, 152, 166, 180].map(function (y) {
        return '<path d="M95 ' + y + ' H105"/>';
      }).join('') + '</g>' +
      '<ellipse cx="100" cy="76" rx="13" ry="22" fill="#c8503c" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="90" cy="46" r="11" fill="#a8342a" stroke="' + INK + '" stroke-width="2.5"/><circle cx="110" cy="46" r="11" fill="#a8342a" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="87" cy="43" r="3" fill="#fffdf7"/><circle cx="107" cy="43" r="3" fill="#fffdf7"/>',

    // かまきり：大きな かま
    kamakiri:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#f2ecd9"/>' +
      '<path d="M10 180 H190" stroke="#a7895f" stroke-width="6" stroke-linecap="round"/>' +
      '<g stroke="#5f9a4e" stroke-width="5" stroke-linecap="round" fill="none">' +
        '<path d="M100 132 L84 160 L76 180"/><path d="M112 134 L120 160 L126 180"/><path d="M140 136 L156 160 L168 180"/><path d="M134 138 L140 162 L146 180"/>' +
      '</g>' +
      '<path d="M96 128 Q140 112 184 140 Q150 158 96 140Z" fill="#8cc46a" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M100 134 L60 70" stroke="#79b35f" stroke-width="12" stroke-linecap="round"/>' +
      '<g fill="#8cc46a" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round">' +
        '<path d="M70 90 L40 112 L46 118 L76 98Z"/><path d="M40 112 L34 86 L42 84 L48 110Z"/>' +
        '<path d="M60 70 L40 50 L60 40 L74 60Z"/>' +
      '</g>' +
      '<circle cx="44" cy="46" r="5" fill="#3d5a2a"/>' +
      '<g fill="none" stroke="#3d5a2a" stroke-width="2"><path d="M48 42 Q40 20 20 12"/><path d="M52 44 Q52 22 40 8"/></g>',

    // みのむし：えだから ぶらさがる
    minomushi:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#eef0e6"/>' +
      '<path d="M0 30 Q100 10 200 40" stroke="#7a5a3a" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<g fill="#c9a36c" stroke="' + INK + '" stroke-width="2"><ellipse cx="40" cy="40" rx="14" ry="6" transform="rotate(20 40 40)"/><ellipse cx="160" cy="40" rx="14" ry="6" transform="rotate(-20 160 40)"/></g>' +
      '<path d="M100 24 V70" stroke="#b5ad9e" stroke-width="2"/>' +
      '<path d="M100 66 Q72 90 76 140 Q84 178 100 182 Q116 178 124 140 Q128 90 100 66Z" fill="#8a6a45" stroke="' + INK + '" stroke-width="3"/>' +
      '<g stroke="#5e4630" stroke-width="3" stroke-linecap="round">' +
        '<path d="M84 96 L98 90"/><path d="M104 100 L118 94"/><path d="M80 120 L96 114"/><path d="M104 124 L122 118"/><path d="M82 146 L98 140"/><path d="M104 150 L120 144"/><path d="M90 166 L110 162"/>' +
      '</g>' +
      '<g fill="#c9a36c" stroke="' + INK + '" stroke-width="1.5"><ellipse cx="114" cy="80" rx="10" ry="4" transform="rotate(-30 114 80)"/><ellipse cx="82" cy="132" rx="10" ry="4" transform="rotate(30 82 132)"/></g>' +
      '<circle cx="100" cy="186" r="7" fill="#3a2a1e"/>',

    // 七五三：ちとせあめの ふくろ
    shichigosan:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#f7ecef"/>' +
      '<g stroke="' + INK + '" stroke-width="2.5">' +
        '<rect x="60" y="14" width="12" height="70" rx="6" fill="#e0524a"/><rect x="78" y="8" width="12" height="76" rx="6" fill="#fffdf7"/>' +
      '</g>' +
      '<path d="M44 60 H116 L112 190 H48Z" fill="#f3d2dc" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M44 60 H116 L115 82 H45Z" fill="#e0524a" stroke="' + INK + '" stroke-width="3"/>' +
      '<g fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round"><path d="M60 120 Q72 108 84 118 Q96 104 104 120"/></g>' +
      emo(80, 156, 34, '🐢') +
      emo(156, 120, 62, '👘'),

    // かき：だいだい色で、上に 4まいの がく
    kaki:
      '<path d="M100 78 Q26 74 24 124 Q30 172 100 174 Q170 172 176 124 Q174 74 100 78Z" fill="#e8702a" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M100 82 Q100 130 100 170" stroke="#c95a1e" stroke-width="2.5" fill="none" opacity="0.6"/>' +
      '<path d="M48 110 Q56 96 72 92" stroke="#f6b07a" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<g fill="#5f8a3e" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round">' +
        [45, 135, 225, 315].map(function (a) {
          return '<path d="M100 80 Q112 66 132 70 Q130 90 100 80Z" transform="rotate(' + (a - 45) + ' 100 80) scale(1 0.7) translate(0 34)"/>';
        }).join('') +
      '</g>' +
      '<circle cx="100" cy="80" r="7" fill="#6b4f2e" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M100 76 V62" stroke="#6b4f2e" stroke-width="6" stroke-linecap="round"/>',

    // なし：まるくて うすい茶色、てんてん
    nashi:
      '<path d="M104 42 Q132 22 160 36 Q140 60 106 50Z" fill="#79b35f" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="100" cy="116" r="66" fill="#d9b86a" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<g fill="#b8944a">' + [[70, 90], [90, 80], [120, 86], [140, 104], [80, 120], [104, 112], [130, 130], [70, 150], [96, 146], [118, 160], [146, 150], [60, 124], [110, 136]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.2"/>';
      }).join('') + '</g>' +
      '<path d="M60 96 Q68 76 88 70" stroke="#f0dca0" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M100 54 V34" stroke="#6b4f2e" stroke-width="5" stroke-linecap="round"/>',

    // さんま：細長い 魚を おさらに
    sanma:
      '<ellipse cx="100" cy="122" rx="94" ry="46" fill="#fffdf7" stroke="' + INK + '" stroke-width="3"/>' +
      '<g transform="rotate(-14 100 116)">' +
        '<path d="M14 116 Q60 96 150 104 L178 92 L174 116 L178 140 L150 128 Q60 136 14 116Z" fill="#7f97ad" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M22 118 Q70 128 150 124" fill="none" stroke="#e9eef2" stroke-width="5"/>' +
        '<path d="M14 116 L4 112 L12 118Z" fill="#f3cf3c" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="32" cy="112" r="4" fill="#2b2b2b"/>' +
        '<path d="M44 104 Q50 116 44 128" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
        '<g stroke="#4f5a66" stroke-width="3" stroke-linecap="round"><path d="M80 104 L88 128"/><path d="M110 104 L118 128"/></g>' +
      '</g>' +
      '<ellipse cx="150" cy="150" rx="18" ry="10" fill="#f4f1df" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="172" cy="132" r="12" fill="#8fc070" stroke="' + INK + '" stroke-width="2.5"/><circle cx="172" cy="132" r="7" fill="#d9ec9a"/>',

    // 「紅葉」：赤や黄色の 山と 川
    momiji:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#dcecf5"/>' +
      '<path d="M-10 120 L50 40 L100 100 L150 50 L210 120 V200 H-10Z" fill="#b98a5a"/>' +
      '<g stroke="' + INK + '" stroke-width="1.5">' + [[30, 100, '#e0524a'], [50, 70, '#f0a032'], [70, 96, '#e9c23a'], [120, 96, '#e0524a'], [150, 70, '#e9c23a'], [174, 100, '#f0a032'], [96, 120, '#f0a032'], [140, 120, '#e0524a'], [20, 130, '#e9c23a'], [60, 126, '#e0524a'], [180, 130, '#e0524a']].map(function (t) {
        return '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="16" fill="' + t[2] + '"/>';
      }).join('') + '</g>' +
      '<path d="M-10 168 Q60 146 100 160 Q150 176 210 156 V200 H-10Z" fill="#8fc3e3"/>' +
      emo(60, 170, 22, '🍁') + emo(140, 178, 20, '🍂') + emo(110, 30, 24, '🍁') + emo(40, 30, 20, '🍂'),

    // 「虫の声」：夜の 草むらで 虫が なく
    mushinokoe:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#2e3a5e"/>' +
      '<g fill="#3d5a3a">' + [0, 26, 52, 78, 104, 130, 156, 182].map(function (x, i) {
        return '<path d="M' + x + ' 200 Q' + (x + 8) + ' ' + (130 + (i % 3) * 14) + ' ' + (x + 4) + ' ' + (110 + (i % 2) * 20) + ' Q' + (x + 22) + ' ' + (150 + (i % 3) * 10) + ' ' + (x + 26) + ' 200Z"/>';
      }).join('') + '</g>' +
      '<g fill="#1f1a16">' +
        '<ellipse cx="60" cy="150" rx="12" ry="7"/><ellipse cx="140" cy="164" rx="12" ry="7"/>' +
      '</g>' +
      '<g fill="none" stroke="#1f1a16" stroke-width="1.5"><path d="M50 148 Q36 130 30 112"/><path d="M150 162 Q164 146 170 128"/></g>' +
      '<g fill="#f7e9a0" font-size="30" text-anchor="middle">' +
        '<text x="56" y="110">♪</text><text x="84" y="80">♫</text><text x="140" y="120">♪</text><text x="120" y="70">♪</text><text x="164" y="80">♫</text>' +
      '</g>',

    // 「赤とんぼ」：夕やけの空に 赤とんぼ
    akatonbo:
      '<defs><linearGradient id="kisetsu-yuyake" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#f4b36a"/><stop offset="1" stop-color="#f8dca8"/>' +
      '</linearGradient></defs>' +
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="url(#kisetsu-yuyake)"/>' +
      '<circle cx="150" cy="140" r="26" fill="#f0743a"/>' +
      '<path d="M-10 160 L40 120 L80 150 L130 110 L210 160 V200 H-10Z" fill="#6a4a5a"/>' +
      [[50, 50, -10, 1], [110, 40, 15, 0.8], [80, 96, 5, 0.9], [160, 70, -20, 0.7]].map(function (t) {
        return '<g transform="translate(' + t[0] + ' ' + t[1] + ') rotate(' + t[2] + ') scale(' + t[3] + ')">' +
          '<g fill="#fffdf7" fill-opacity="0.75" stroke="#b07a52" stroke-width="1.2"><ellipse cx="-14" cy="-4" rx="14" ry="4"/><ellipse cx="14" cy="-4" rx="14" ry="4"/><ellipse cx="-13" cy="3" rx="12" ry="3.5"/><ellipse cx="13" cy="3" rx="12" ry="3.5"/></g>' +
          '<rect x="-2.5" y="-2" width="5" height="30" rx="2.5" fill="#d9483a"/>' +
          '<circle cx="0" cy="-8" r="5" fill="#c8503c"/>' +
          '</g>';
      }).join(''),

    // 「村祭」：鳥居と ちょうちん、たいこ
    muramatsuri:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#f2e6cf"/>' +
      '<path d="M0 150 H200 V200 H0Z" fill="#e3c26a"/>' +
      '<g stroke="#c9a33a" stroke-width="3">' + [12, 36, 60, 84, 108, 132, 156, 180].map(function (x) {
        return '<path d="M' + x + ' 196 Q' + (x + 4) + ' 170 ' + (x + 10) + ' 160"/>';
      }).join('') + '</g>' +
      '<g fill="#d9483a" stroke="' + INK + '" stroke-width="2.5">' +
        '<path d="M30 30 Q100 18 170 30 L166 42 Q100 32 34 42Z"/><rect x="40" y="52" width="120" height="9"/>' +
        '<rect x="54" y="38" width="12" height="114"/><rect x="134" y="38" width="12" height="114"/>' +
      '</g>' +
      '<path d="M10 76 Q100 92 190 76" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
      [30, 76, 124, 170].map(function (x, i) {
        var y = 80 + (i === 1 || i === 2 ? 6 : 0);
        return '<ellipse cx="' + x + '" cy="' + (y + 12) + '" rx="10" ry="13" fill="#f2a63a" stroke="' + INK + '" stroke-width="2"/>' +
          '<path d="M' + (x - 9) + ' ' + (y + 8) + ' H' + (x + 9) + ' M' + (x - 9) + ' ' + (y + 16) + ' H' + (x + 9) + '" stroke="#c8743a" stroke-width="1.5"/>';
      }).join('') +
      emo(100, 132, 44, '🥁'),

    // 「月」：山の上に まんまるい 月
    tsuki:
      '<rect x="0" y="0" width="200" height="200" rx="24" fill="#1f2a4a"/>' +
      '<g fill="#fbe7a6">' + [[30, 30], [170, 40], [60, 70], [150, 90], [20, 110], [180, 120]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2"/>';
      }).join('') + '</g>' +
      '<circle cx="100" cy="84" r="46" fill="#fbe7a6"/>' +
      '<g fill="#efd58a"><circle cx="84" cy="70" r="8"/><circle cx="114" cy="96" r="6"/><circle cx="110" cy="66" r="4"/></g>' +
      '<path d="M-10 160 Q40 110 90 140 Q140 106 210 150 V200 H-10Z" fill="#2c3a2e"/>'
  };

  // ---------- ジャンル ----------
  // ask：問題文
  var GENRES = [
    { id: 'hana',  name: '[花:はな]',              icon: '🌷', ask: 'これは なに？' },
    { id: 'mushi', name: '[虫:むし]',              icon: '🐞', ask: 'これは なに？' },
    { id: 'gyoji', name: '[行事:ぎょう.じ]',        icon: '🎏', ask: 'これは なに？' },
    { id: 'tabe',  name: '[食:た]べ[物:もの]',      icon: '🍓', ask: 'これは なに？' },
    { id: 'uta',   name: '[歌:うた]',              icon: '🎵', ask: 'これは なんの [歌:うた]？' }
  ];

  // ---------- 季節と問題 ----------
  var SEASONS = [
    {
      id: 'haru', name: '[春:はる]', icon: '🌸', color: '#f2b8c6',
      genres: {
        hana: [
          { name: '[桜:さくら]',              pic: '🌸' },
          { name: 'たんぽぽ',                 pic: 'svg:tanpopo' },
          { name: 'チューリップ',             pic: '🌷' },
          { name: '[菜:な]の[花:はな]',        pic: 'svg:nanohana' },
          { name: 'つくし',                   pic: 'svg:tsukushi' },
          { name: 'すみれ',                   pic: 'svg:sumire' }
        ],
        mushi: [
          { name: 'ちょうちょう',             pic: '🦋' },
          { name: 'てんとう[虫:むし]',         pic: '🐞' },
          { name: 'みつばち',                 pic: '🐝' },
          { name: 'おたまじゃくし',           pic: 'svg:otama' },
          { name: 'あり',                     pic: '🐜' }
        ],
        gyoji: [
          { name: 'ひな[祭:まつ]り',           pic: '🎎' },
          { name: '[入学式:にゅう.がく.しき]', pic: '🌸🎒🏫' },
          { name: 'お[花見:はな.み]',          pic: '🌸🍙🍡' },
          { name: 'こどもの[日:ひ]',           pic: '🎏' },
          { name: '[卒業式:そつ.ぎょう.しき]', pic: '🎓📜' },
          { name: '[母:はは]の[日:ひ]',        pic: '💐' }
        ],
        tabe: [
          { name: 'いちご',                   pic: '🍓' },
          { name: 'たけのこ',                 pic: 'svg:takenoko' },
          { name: '[桜:さくら][餅:もち]',      pic: 'svg:sakuramochi' },
          { name: '[春:はる]キャベツ',         pic: 'svg:kyabetsu' },
          { name: 'そら[豆:まめ]',             pic: 'svg:soramame' }
        ],
        uta: [
          { name: '「[春:はる]の[小川:お.がわ]」',  pic: 'svg:ogawa' },
          { name: '「ちょうちょう」',               pic: 'svg:chocho' },
          { name: '「どこかで[春:はる]が」',        pic: 'svg:dokokade' },
          { name: '「[春:はる]が[来:き]た」',       pic: 'svg:harugakita' },
          { name: '「チューリップ」',               pic: 'svg:tulips' },
          { name: '「おぼろ[月夜:づき.よ]」',       pic: 'svg:oborozukiyo' }
        ]
      }
    },
    {
      id: 'natsu', name: '[夏:なつ]', icon: '🌻', color: '#f3cf63',
      genres: {
        hana: [
          { name: 'ひまわり',                 pic: '🌻' },
          { name: '[朝顔:あさ.がお]',          pic: 'svg:asagao' },
          { name: 'ハイビスカス',             pic: '🌺' },
          { name: 'あじさい',                 pic: 'svg:ajisai' },
          { name: 'ゆり',                     pic: 'svg:yuri' }
        ],
        mushi: [
          { name: 'せみ',                     pic: 'svg:semi' },
          { name: 'かぶと[虫:むし]',           pic: 'svg:kabuto' },
          { name: 'くわがた',                 pic: 'svg:kuwagata' },
          { name: 'ほたる',                   pic: 'svg:hotaru' },
          { name: 'か',                       pic: '🦟' }
        ],
        gyoji: [
          { name: '[七夕:たなばた]',           pic: '🎋' },
          { name: '[夏:なつ][祭:まつ]り',       pic: '👘🏮' },
          { name: '[花火大会:はな.び.たい.かい]', pic: '🎆🎇' },
          { name: '[海水浴:かい.すい.よく]',   pic: '🏖️' },
          { name: 'ラジオ[体操:たい.そう]',     pic: '📻🙆' }
        ],
        tabe: [
          { name: 'すいか',                   pic: '🍉' },
          { name: 'とうもろこし',             pic: '🌽' },
          { name: 'かき[氷:ごおり]',           pic: '🍧' },
          { name: 'トマト',                   pic: '🍅' },
          { name: 'きゅうり',                 pic: '🥒' },
          { name: 'なす',                     pic: '🍆' }
        ],
        uta: [
          { name: '「うみ」',                         pic: 'svg:umi' },
          { name: '「たなばたさま」',                 pic: 'svg:tanabata' },
          { name: '「かたつむり」',                   pic: 'svg:katatsumuri' },
          { name: '「ほたるこい」',                   pic: 'svg:hotarukoi' },
          { name: '「[夏:なつ]は[来:き]ぬ」',         pic: 'svg:natsuwakinu' }
        ]
      }
    },
    {
      id: 'aki', name: '[秋:あき]', icon: '🍁', color: '#e3a06a',
      genres: {
        hana: [
          { name: 'コスモス',                 pic: 'svg:cosmos' },
          { name: '[菊:きく]',                 pic: 'svg:kiku' },
          { name: 'ひがんばな',               pic: 'svg:higanbana' },
          { name: 'きんもくせい',             pic: 'svg:kinmokusei' },
          { name: 'すすき',                   pic: 'svg:susuki' }
        ],
        mushi: [
          { name: 'すず[虫:むし]',             pic: 'svg:suzumushi' },
          { name: 'とんぼ',                   pic: 'svg:tonbo' },
          { name: 'ばった',                   pic: '🦗' },
          { name: 'かまきり',                 pic: 'svg:kamakiri' },
          { name: 'みの[虫:むし]',             pic: 'svg:minomushi' },
          { name: 'こおろぎ' }
        ],
        gyoji: [
          { name: '[運動会:うん.どう.かい]',   pic: '🚩🏃' },
          { name: 'お[月見:つき.み]',          pic: '🎑' },
          { name: 'ハロウィン',               pic: '🎃👻' },
          { name: '[敬老:けい.ろう]の[日:ひ]',  pic: '👴👵' },
          { name: '[七五三:しち.ご.さん]',     pic: 'svg:shichigosan' }
        ],
        tabe: [
          { name: 'くり',                     pic: '🌰' },
          { name: 'さつまいも',               pic: '🍠' },
          { name: 'かき',                     pic: 'svg:kaki' },
          { name: 'ぶどう',                   pic: '🍇' },
          { name: 'なし',                     pic: 'svg:nashi' },
          { name: 'さんま',                   pic: 'svg:sanma' }
        ],
        uta: [
          { name: '「[紅葉:もみじ]」',                 pic: 'svg:momiji' },
          { name: '「[虫:むし]の[声:こえ]」',          pic: 'svg:mushinokoe' },
          { name: '「[赤:あか]とんぼ」',               pic: 'svg:akatonbo' },
          { name: '「[村祭:むら.まつり]」',            pic: 'svg:muramatsuri' },
          { name: '「[月:つき]」',                     pic: 'svg:tsuki' }
        ]
      }
    },
    {
      id: 'fuyu', name: '[冬:ふゆ]', icon: '⛄', color: '#a9c6dc',
      genres: {
        hana:  [{ name: 'すいせん' }, { name: 'つばき' }],
        mushi: [],
        gyoji: [{ name: 'クリスマス' }, { name: 'お[正月:しょう.がつ]' }, { name: '[節分:せつ.ぶん]' }],
        tabe:  [{ name: 'みかん' }, { name: 'お[餅:もち]' }, { name: '[大根:だい.こん]' }],
        uta:   [{ name: '「[雪:ゆき]」' }, { name: '「たきび」' }, { name: '「お[正月:しょう.がつ]」' }]
      }
    }
  ];

  window.KisetsuData = { PICS: PICS, GENRES: GENRES, SEASONS: SEASONS, INK: INK };
})();
