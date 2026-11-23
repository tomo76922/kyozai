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
      }).join('') + '</g>'
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
        hana:  [{ name: 'ひまわり' }, { name: '[朝顔:あさ.がお]' }],
        mushi: [{ name: 'せみ' }, { name: 'かぶと[虫:むし]' }, { name: 'ほたる' }],
        gyoji: [{ name: '[七夕:たなばた]' }, { name: '[夏:なつ][祭:まつ]り' }],
        tabe:  [{ name: 'すいか' }, { name: 'とうもろこし' }, { name: 'かき[氷:ごおり]' }],
        uta:   [{ name: '「うみ」' }, { name: '「たなばたさま」' }]
      }
    },
    {
      id: 'aki', name: '[秋:あき]', icon: '🍁', color: '#e3a06a',
      genres: {
        hana:  [{ name: 'コスモス' }, { name: '[菊:きく]' }],
        mushi: [{ name: 'すず[虫:むし]' }, { name: 'とんぼ' }, { name: 'こおろぎ' }],
        gyoji: [{ name: '[運動会:うん.どう.かい]' }, { name: 'お[月見:つき.み]' }],
        tabe:  [{ name: 'くり' }, { name: 'さつまいも' }, { name: 'かき' }],
        uta:   [{ name: '「もみじ」' }, { name: '「[虫:むし]の[声:こえ]」' }, { name: '「[赤:あか]とんぼ」' }]
      }
    },
    {
      id: 'fuyu', name: '[冬:ふゆ]', icon: '⛄', color: '#a9c6dc',
      genres: {
        hana:  [{ name: 'すいせん' }, { name: 'つばき' }],
        mushi: [{ name: 'みの[虫:むし]' }],
        gyoji: [{ name: 'クリスマス' }, { name: 'お[正月:しょう.がつ]' }, { name: '[節分:せつ.ぶん]' }],
        tabe:  [{ name: 'みかん' }, { name: 'お[餅:もち]' }, { name: '[大根:だい.こん]' }],
        uta:   [{ name: '「[雪:ゆき]」' }, { name: '「たきび」' }, { name: '「お[正月:しょう.がつ]」' }]
      }
    }
  ];

  window.KisetsuData = { PICS: PICS, GENRES: GENRES, SEASONS: SEASONS, INK: INK };
})();
