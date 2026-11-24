// しんけいすいじゃく：カードの絵（画像ファイルは使わず、ここで SVG を作る）
// ・どうぶつ（やさしい）：すべて オリジナルの デザイン
// ・とちぎの たべもの（ふつう）：実在の商品の パッケージや ロゴは 描かない
// ・トランプ（むずかしい）：マークも 絵で 描く（文字の ♥ などは iPad で 絵文字に なることがあるため）
(function () {
  'use strict';

  var O = '#3d3a35';            // ふちどりの 色
  var S = ' stroke="' + O + '" stroke-width="3" stroke-linejoin="round"';
  var S2 = ' stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';

  function svg(vb, body) {
    return '<svg viewBox="' + vb + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  // ---------- どうぶつ（まるくて やわらかい形・大きな目） ----------
  function eyes(lx, rx, y) {
    var s = '';
    [lx, rx].forEach(function (x) {
      s += '<ellipse cx="' + x + '" cy="' + y + '" rx="6.2" ry="7.4" fill="#2f2b27"/>' +
        '<circle cx="' + (x + 2) + '" cy="' + (y - 2.8) + '" r="2.5" fill="#fff"/>' +
        '<circle cx="' + (x - 2) + '" cy="' + (y + 2.8) + '" r="1.2" fill="#fff"/>';
    });
    return s;
  }
  function cheeks(lx, rx, y) {
    return '<ellipse cx="' + lx + '" cy="' + y + '" rx="6" ry="3.8" fill="#f3a0a6" opacity="0.85"/>' +
      '<ellipse cx="' + rx + '" cy="' + y + '" rx="6" ry="3.8" fill="#f3a0a6" opacity="0.85"/>';
  }
  function mouthW(x, y) {
    return '<path d="M' + (x - 5) + ' ' + y + 'q2.5 3.6 5 0q2.5 3.6 5 0" fill="none"' + S2 + '/>';
  }

  var ANIMALS = [
    { id: 'usagi', label: 'うさぎ', body:
      '<g transform="rotate(-9 37 26)"><ellipse cx="37" cy="24" rx="9.5" ry="21" fill="#fbf8f3"' + S + '/>' +
      '<ellipse cx="37" cy="27" rx="4.5" ry="14" fill="#f5bcc3"/></g>' +
      '<g transform="rotate(9 63 26)"><ellipse cx="63" cy="24" rx="9.5" ry="21" fill="#fbf8f3"' + S + '/>' +
      '<ellipse cx="63" cy="27" rx="4.5" ry="14" fill="#f5bcc3"/></g>' +
      '<circle cx="50" cy="63" r="31" fill="#fbf8f3"' + S + '/>' +
      eyes(38, 62, 60) + cheeks(28, 72, 71) +
      '<path d="M46.5 67.5h7l-3.5 3.6z" fill="#e8838f"/>' + mouthW(50, 72) },

    { id: 'kuma', label: 'くま', body:
      '<circle cx="24" cy="34" r="12.5" fill="#bf8759"' + S + '/><circle cx="24" cy="34" r="6.5" fill="#ecc89f"/>' +
      '<circle cx="76" cy="34" r="12.5" fill="#bf8759"' + S + '/><circle cx="76" cy="34" r="6.5" fill="#ecc89f"/>' +
      '<circle cx="50" cy="60" r="33" fill="#c99366"' + S + '/>' +
      '<ellipse cx="50" cy="72" rx="15" ry="11" fill="#f1dbbb"/>' +
      eyes(37, 63, 56) + cheeks(25, 75, 69) +
      '<ellipse cx="50" cy="67.5" rx="5.5" ry="4" fill="' + O + '"/>' + mouthW(50, 73) },

    { id: 'neko', label: 'ねこ', body:
      '<path d="M20 48 L23 11 L47 31Z" fill="#f2b872"' + S + '/><path d="M26 39 L27 21 L39 31Z" fill="#f5bcc3"/>' +
      '<path d="M80 48 L77 11 L53 31Z" fill="#f2b872"' + S + '/><path d="M74 39 L73 21 L61 31Z" fill="#f5bcc3"/>' +
      '<ellipse cx="50" cy="61" rx="35" ry="30" fill="#f2b872"' + S + '/>' +
      '<path d="M50 32v9M42 33.5l2 7M58 33.5l-2 7" fill="none" stroke="#d58a42" stroke-width="3.2" stroke-linecap="round"/>' +
      eyes(37, 63, 58) + cheeks(26, 74, 70) +
      '<path d="M46.5 66h7l-3.5 3.6z" fill="#e8838f"/>' + mouthW(50, 70.5) +
      '<path d="M8 64l13 2M9 73l12-3M92 64l-13 2M91 73l-12-3" fill="none" stroke="' + O + '" stroke-width="2" stroke-linecap="round"/>' },

    { id: 'inu', label: 'いぬ', body:
      '<circle cx="50" cy="58" r="31" fill="#f1d5a4"' + S + '/>' +
      '<ellipse cx="62" cy="53" rx="11" ry="10" fill="#d9a774"/>' +
      '<path d="M26 34 C10 36 6 60 14 72 C20 80 31 72 31 58 C31 48 30 40 26 34Z" fill="#a8754a"' + S + '/>' +
      '<path d="M74 34 C90 36 94 60 86 72 C80 80 69 72 69 58 C69 48 70 40 74 34Z" fill="#a8754a"' + S + '/>' +
      '<ellipse cx="50" cy="71" rx="14" ry="10" fill="#fcf2df"/>' +
      eyes(39, 62, 54) + cheeks(30, 70, 67) +
      '<ellipse cx="50" cy="65.5" rx="6" ry="4.3" fill="' + O + '"/>' +
      '<path d="M47 74.5q3 7 6 0z" fill="#ee8a8f" stroke="' + O + '" stroke-width="1.6"/>' + mouthW(50, 71.5) },

    { id: 'zou', label: 'ぞう', body:
      '<circle cx="20" cy="52" r="19" fill="#9fb4c7"' + S + '/><ellipse cx="19" cy="53" rx="11" ry="12" fill="#f1c4cb"/>' +
      '<circle cx="80" cy="52" r="19" fill="#9fb4c7"' + S + '/><ellipse cx="81" cy="53" rx="11" ry="12" fill="#f1c4cb"/>' +
      '<circle cx="50" cy="50" r="28" fill="#b5c6d6"' + S + '/>' +
      '<path d="M43 62 C42 76 45 88 56 90 C63 91 66 84 61 82 C55 81 55 75 57 62Z" fill="#b5c6d6"/>' +
      '<path d="M43 64 C42 76 45 88 56 90 C63 91 66 84 61 82 C55 81 55 75 57 64" fill="none"' + S + '/>' +
      '<path d="M46 72h8M47 79h7" fill="none" stroke="#8ea3b7" stroke-width="2" stroke-linecap="round"/>' +
      eyes(38, 62, 48) + cheeks(30, 70, 61) },

    { id: 'panda', label: 'ぱんだ', body:
      '<circle cx="26" cy="33" r="11.5" fill="#2f2b27"' + S + '/><circle cx="74" cy="33" r="11.5" fill="#2f2b27"' + S + '/>' +
      '<circle cx="50" cy="61" r="32" fill="#fdfcf8"' + S + '/>' +
      '<ellipse cx="37" cy="59" rx="9.5" ry="12" fill="#2f2b27" transform="rotate(28 37 59)"/>' +
      '<ellipse cx="63" cy="59" rx="9.5" ry="12" fill="#2f2b27" transform="rotate(-28 63 59)"/>' +
      '<circle cx="38" cy="58" r="5" fill="#fff"/><circle cx="62" cy="58" r="5" fill="#fff"/>' +
      '<circle cx="38.6" cy="58.6" r="3" fill="#2f2b27"/><circle cx="61.4" cy="58.6" r="3" fill="#2f2b27"/>' +
      '<circle cx="39.6" cy="57.2" r="1.1" fill="#fff"/><circle cx="62.4" cy="57.2" r="1.1" fill="#fff"/>' +
      cheeks(26, 74, 73) +
      '<ellipse cx="50" cy="69" rx="4.8" ry="3.4" fill="' + O + '"/>' + mouthW(50, 74) },

    { id: 'hiyoko', label: 'ひよこ', body:
      '<path d="M48 28q-4-9 1-12M52 28q2-9 9-9" fill="none" stroke="' + O + '" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="19" cy="64" rx="6.5" ry="11" fill="#efc23f" transform="rotate(25 19 64)"' + S + '/>' +
      '<ellipse cx="81" cy="64" rx="6.5" ry="11" fill="#efc23f" transform="rotate(-25 81 64)"' + S + '/>' +
      '<ellipse cx="50" cy="59" rx="32" ry="31" fill="#f7d667"' + S + '/>' +
      '<path d="M41 89v6M59 89v6" stroke="#e89a3a" stroke-width="3.5" stroke-linecap="round"/>' +
      eyes(38, 62, 53) + cheeks(28, 72, 66) +
      '<path d="M44 60h12l-6 7.5z" fill="#f0a03c"' + S2 + '/>' },

    { id: 'kitsune', label: 'きつね', body:
      '<path d="M18 52 L21 9 L46 32Z" fill="#e8954a"' + S + '/><path d="M25 42 L25 21 L38 32Z" fill="#fbead2"/>' +
      '<path d="M82 52 L79 9 L54 32Z" fill="#e8954a"' + S + '/><path d="M75 42 L75 21 L62 32Z" fill="#fbead2"/>' +
      '<path d="M50 30 C74 30 87 44 87 59 C87 77 69 89 50 89 C31 89 13 77 13 59 C13 44 26 30 50 30Z" fill="#e8954a"/>' +
      '<path d="M14 62 C26 62 40 68 50 80 C60 68 74 62 86 62 C83 78 67 89 50 89 C33 89 17 78 14 62Z" fill="#fdf5e8"/>' +
      '<path d="M50 30 C74 30 87 44 87 59 C87 77 69 89 50 89 C31 89 13 77 13 59 C13 44 26 30 50 30Z" fill="none"' + S + '/>' +
      eyes(37, 63, 55) + cheeks(26, 74, 68) +
      '<ellipse cx="50" cy="76" rx="4.6" ry="3.4" fill="' + O + '"/>' }
  ];

  // ---------- とちぎの たべもの（下に ひらがなで 名前） ----------
  function bowl(fill, soup) {
    return '<path d="M8 36 H92 C90 60 72 75 50 75 C28 75 10 60 8 36Z" fill="' + fill + '"' + S + '/>' +
      '<ellipse cx="50" cy="36" rx="42" ry="10" fill="' + soup + '"' + S + '/>';
  }
  function plate(cy) {
    return '<ellipse cx="50" cy="' + cy + '" rx="45" ry="13" fill="#ffffff"' + S + '/>' +
      '<ellipse cx="50" cy="' + cy + '" rx="34" ry="8" fill="none" stroke="#d9d2c3" stroke-width="2"/>';
  }
  function gyoza(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')">' +
      '<path d="M-20 6 C-20 -15 20 -15 20 6 C10 11 -10 11 -20 6Z" fill="#f6e7c4"' + S + '/>' +
      '<path d="M-17 6 C-9 10 9 10 17 6" fill="none" stroke="#c9873a" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M-10 -5l2-5M-3 -8l1-5M4 -8l-1-5M11 -5l-2-5" fill="none" stroke="' + O + '" stroke-width="2" stroke-linecap="round"/></g>';
  }
  function yubaRoll(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><circle r="12" fill="#f4dc98"' + S + '/>' +
      '<path d="M-2 0a2 2 0 1 1 4 0a5 5 0 1 1-9 0a8 8 0 1 1 16 0" fill="none" stroke="#c39a48" stroke-width="2" stroke-linecap="round"/></g>';
  }
  function ear(x, y, r) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ')">' +
      '<path d="M-9 3 C-11 -8 7 -10 9 -2 C11 5 2 9 -3 5 C-5 3 -3 -2 2 -1" fill="#fbf5e6"' + S2 + '/></g>';
  }
  function chiliPath(dx, flip) {
    var t = flip ? 'translate(' + (100 + dx) + ' 0) scale(-1 1)' : 'translate(' + dx + ' 0)';
    return '<g transform="' + t + '">' +
      '<path d="M30 16 C23 32 26 54 42 72 C47 77 50 71 47 64 C40 48 40 31 43 17Z" fill="#d9342b"' + S + '/>' +
      '<path d="M33 24 C30 36 32 50 39 60" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>' +
      '<path d="M28 16 C30 9 41 9 44 16 C39 20 33 20 28 16Z" fill="#5f9a43"' + S2 + '/>' +
      '<path d="M36 11q1-6 8-8" fill="none" stroke="#4d8436" stroke-width="3" stroke-linecap="round"/></g>';
  }

  var FOODS = [
    { id: 'ichigo', label: 'いちご', body:
      '<path d="M50 76 C30 68 15 50 18 33 C20 21 34 17 50 21 C66 17 80 21 82 33 C85 50 70 68 50 76Z" fill="#e2463f"' + S + '/>' +
      [[38, 36], [50, 34], [62, 36], [30, 46], [43, 46], [57, 46], [70, 46], [37, 57], [50, 58], [63, 57], [50, 68]].map(function (p) {
        return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="1.8" ry="2.7" fill="#f8e08a"/>';
      }).join('') +
      '<path d="M50 25 L35 15 L41 25 L27 23 L41 31 L50 27 L59 31 L73 23 L59 25 L65 15Z" fill="#5aa04a"' + S2 + '/>' +
      '<path d="M50 18V7" stroke="#4b8a3d" stroke-width="4" stroke-linecap="round"/>' },

    { id: 'gyoza', label: 'ぎょうざ', body:
      plate(60) + gyoza(50, 42) + gyoza(29, 52) + gyoza(71, 52) },

    { id: 'kanpyo', label: 'かんぴょう', body:
      '<path d="M34 5 H66 L60 40 L68 76 H32 L40 40Z" fill="#f4e7c2"' + S + '/>' +
      '<path d="M41 7 L45 40 L40 74M48 7 L49 40 L47 74M55 7 L53 40 L55 74M61 7 L57 40 L62 74" fill="none" stroke="#d6c08a" stroke-width="2"/>' +
      '<rect x="36" y="35" width="28" height="9" rx="3" fill="#b5784a"' + S2 + '/>' },

    { id: 'shimotsukare', label: 'しもつかれ', body:
      bowl('#6f8fb0', '#c98a5c') +
      '<path d="M18 36 C26 20 74 20 82 36Z" fill="#c98a5c"' + S + '/>' +
      '<path d="M30 30l8-3M44 26l9 2M58 29l8-3M36 34l9-1M54 33l10 1" fill="none" stroke="#f6efe0" stroke-width="2.6" stroke-linecap="round"/>' +
      '<rect x="40" y="29" width="6" height="4" rx="1" fill="#ea8a3d"/><rect x="62" y="24" width="6" height="4" rx="1" fill="#ea8a3d"/>' +
      '<rect x="25" y="33" width="6" height="4" rx="1" fill="#ea8a3d"/>' +
      '<circle cx="52" cy="23" r="2.8" fill="#e5c27c" stroke="' + O + '" stroke-width="1.2"/><circle cx="33" cy="27" r="2.8" fill="#e5c27c" stroke="' + O + '" stroke-width="1.2"/>' +
      '<circle cx="70" cy="33" r="2.8" fill="#e5c27c" stroke="' + O + '" stroke-width="1.2"/>' +
      '<path d="M20 54 H80" stroke="#c7d6e5" stroke-width="2.5" stroke-dasharray="6 5"/>' },

    { id: 'yuba', label: 'ゆば', body:
      plate(60) +
      '<path d="M18 56 C24 44 76 44 82 56 C70 62 30 62 18 56Z" fill="#f8e7b4"' + S2 + '/>' +
      yubaRoll(32, 48) + yubaRoll(56, 48) + yubaRoll(44, 31) +
      '<path d="M72 44 q6-10 14-8 q-4 8-14 8z" fill="#6bb34f"' + S2 + '/>' },

    { id: 'lemon', label: 'れもんぎゅうにゅう', body:
      '<path d="M68 26 L80 19 V69 L68 76Z" fill="#e3c235"' + S + '/>' +
      '<path d="M62 10 L74 5 L80 19 L68 26Z" fill="#f0d457"' + S + '/>' +
      '<path d="M28 26 L36 10 H62 L68 26Z" fill="#f9e680"' + S + '/>' +
      '<rect x="36" y="4" width="26" height="6" rx="1" fill="#f9e680"' + S2 + '/>' +
      '<rect x="28" y="26" width="40" height="50" fill="#f7d84a"' + S + '/>' +
      '<circle cx="48" cy="51" r="13" fill="#fff6b8" stroke="#d9ae1c" stroke-width="3"/>' +
      '<path d="M48 51V39M48 51L58 45M48 51L58 57M48 51V63M48 51L38 57M48 51L38 45" stroke="#e9c43a" stroke-width="2"/>' },

    { id: 'sano', label: 'さのらーめん', body:
      bowl('#c9463d', '#e7bd73') +
      '<path d="M14 54 H86" stroke="#fbe9d6" stroke-width="2.5" stroke-dasharray="5 4"/>' +
      '<rect x="66" y="18" width="13" height="16" rx="1" fill="#2f4a33"' + S2 + '/>' +
      '<path d="M16 38q4-4 8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0M20 42q4-4 8 0t8 0t8 0t8 0t8 0t8 0t8 0" fill="none" stroke="#fbf0c2" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="33" cy="32" rx="11" ry="6" fill="#c98a5a"' + S2 + '/><ellipse cx="33" cy="32" rx="6" ry="3" fill="none" stroke="#e7b48a" stroke-width="2"/>' +
      '<ellipse cx="55" cy="31" rx="7" ry="4.5" fill="#fffdf7"' + S2 + '/><path d="M52 31a3 2 0 1 1 6 0a1.6 1.2 0 1 1-3 0" fill="none" stroke="#e66a8a" stroke-width="1.6"/>' +
      '<rect x="62" y="35" width="10" height="4" rx="1" fill="#d6a24e" stroke="' + O + '" stroke-width="1.4"/>' +
      '<circle cx="45" cy="37" r="2" fill="#7cbf5a"/><circle cx="49" cy="39" r="2" fill="#7cbf5a"/><circle cx="42" cy="40" r="2" fill="#7cbf5a"/>' },

    { id: 'mimiudon', label: 'みみうどん', body:
      bowl('#6b4433', '#e9cf94') +
      ear(30, 34, -10) + ear(48, 30, 15) + ear(66, 34, -20) + ear(56, 40, 30) + ear(38, 40, 5) +
      '<path d="M72 28q4-6 9-4q-3 5-9 4z" fill="#6bb34f"' + S2 + '/>' +
      '<path d="M14 54 H86" stroke="#a77b62" stroke-width="2.5" stroke-dasharray="5 4"/>' },

    { id: 'chitake', label: 'ちたけそば', body:
      bowl('#3f3a36', '#9c6236') +
      '<path d="M16 37q4-3 8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0M22 41q4-3 8 0t8 0t8 0t8 0t8 0t8 0t8 0" fill="none" stroke="#7d6a58" stroke-width="2.8" stroke-linecap="round"/>' +
      '<g transform="translate(34 32)"><path d="M-2 0v6h4v-6" fill="#f3e6cf"' + S2 + '/><path d="M-10 1 C-10 -8 10 -8 10 1Z" fill="#c9782e"' + S2 + '/></g>' +
      '<g transform="translate(60 30)"><path d="M-2 0v6h4v-6" fill="#f3e6cf"' + S2 + '/><path d="M-10 1 C-10 -8 10 -8 10 1Z" fill="#c9782e"' + S2 + '/></g>' +
      '<path d="M44 38 a7 5 0 0 0 12 0z" fill="#6a3f7a"' + S2 + '/><path d="M66 39 a6 4 0 0 0 10 0z" fill="#6a3f7a"' + S2 + '/>' +
      '<circle cx="24" cy="36" r="2" fill="#7cbf5a"/><circle cx="28" cy="39" r="2" fill="#7cbf5a"/>' },

    { id: 'imofry', label: 'いもふらい', body:
      '<path d="M50 4 V78" stroke="#d2a86d" stroke-width="5" stroke-linecap="round"/>' +
      [17, 38, 59].map(function (y) {
        return '<ellipse cx="50" cy="' + y + '" rx="18" ry="10.5" fill="#e3a447"' + S + '/>' +
          '<circle cx="42" cy="' + (y - 3) + '" r="1.5" fill="#bf7a2a"/><circle cx="56" cy="' + (y - 4) + '" r="1.5" fill="#bf7a2a"/>' +
          '<circle cx="48" cy="' + (y + 4) + '" r="1.5" fill="#bf7a2a"/><circle cx="60" cy="' + (y + 3) + '" r="1.5" fill="#bf7a2a"/>';
      }).join('') +
      '<path d="M36 12 L44 22 L50 12 L58 24 L64 14M36 34 L44 44 L52 34 L60 44 L65 36M37 55 L45 64 L52 55 L59 65 L64 58" fill="none" stroke="#5a3420" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' },

    { id: 'yakisoba', label: 'ぽてといりやきそば', body:
      plate(60) +
      '<path d="M14 58 C17 32 83 32 86 58 C70 65 30 65 14 58Z" fill="#b97a45"' + S + '/>' +
      '<path d="M22 50q5-5 10 0t10 0t10 0t10 0t10 0M26 42q5-5 10 0t10 0t10 0t10 0M20 56q5-4 10 0t10 0t10 0t10 0t10 0t10 0" fill="none" stroke="#8e5a2e" stroke-width="2.2" stroke-linecap="round"/>' +
      [[30, 44], [52, 40], [66, 50], [42, 53]].map(function (p) {
        return '<rect x="' + (p[0] - 5) + '" y="' + (p[1] - 5) + '" width="10" height="10" rx="2.5" fill="#f7dc80"' + S2 + '/>';
      }).join('') +
      '<path d="M58 34l6 3M24 52l5-3M72 42l5 2" stroke="#8cc26a" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M46 33l4 4M36 36l2 4" stroke="#e0524a" stroke-width="2.5" stroke-linecap="round"/>' },

    { id: 'yokan', label: 'にっこうようかん', body:
      '<ellipse cx="50" cy="66" rx="44" ry="10" fill="#e9e2d2"' + S + '/>' +
      '<path d="M12 36 L28 22 H86 L70 36Z" fill="#94403a"' + S + '/>' +
      '<path d="M70 36 L86 22 V52 L70 66Z" fill="#5a2020"' + S + '/>' +
      '<rect x="12" y="36" width="58" height="30" fill="#71292a"' + S + '/>' +
      '<path d="M18 42 h30" stroke="#b25a52" stroke-width="3" stroke-linecap="round" opacity="0.8"/>' },

    { id: 'tamari', label: 'たまりづけ', body:
      '<ellipse cx="50" cy="56" rx="44" ry="17" fill="#e9e2d2"' + S + '/>' +
      '<ellipse cx="50" cy="54" rx="32" ry="10" fill="#d9cfba"/>' +
      '<ellipse cx="32" cy="50" rx="11" ry="7" fill="#9a6428"' + S2 + '/>' +
      '<ellipse cx="46" cy="46" rx="11" ry="7" fill="#a86f2e"' + S2 + '/>' +
      '<ellipse cx="60" cy="52" rx="11" ry="7" fill="#8a5420"' + S2 + '/>' +
      '<circle cx="70" cy="44" r="7" fill="#6b6b2a"' + S2 + '/><circle cx="70" cy="44" r="3.5" fill="#a5a35a"/>' +
      '<circle cx="40" cy="57" r="6" fill="#6b6b2a"' + S2 + '/><circle cx="40" cy="57" r="3" fill="#a5a35a"/>' },

    { id: 'nira', label: 'にら', body:
      '<path d="M50 74 Q46 40 24 6M50 74 Q48 38 38 4M50 74 Q50 36 52 3M50 74 Q53 38 66 5M50 74 Q55 42 78 8M50 74 Q44 46 16 18M50 74 Q57 46 85 20" fill="none" stroke="#4f9a3e" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M50 74 Q47 44 31 6M50 74 Q51 40 60 4M50 74 Q54 44 72 14" fill="none" stroke="#7bc25e" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M43 78 L45 62 H55 L57 78Z" fill="#eef1d8"' + S2 + '/>' +
      '<rect x="41" y="56" width="18" height="8" rx="2" fill="#e0a03a"' + S2 + '/>' },

    { id: 'wagyu', label: 'とちぎわぎゅう', body:
      plate(58) +
      '<path d="M16 46 C14 30 36 20 56 22 C77 24 88 36 86 50 C84 64 62 68 42 66 C25 64 18 58 16 46Z" fill="#d6484a"' + S + '/>' +
      '<path d="M20 52 C30 62 60 64 82 54" fill="none" stroke="#fbeae4" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M28 36 q8 6 16 0 t16 2M30 46 q10-6 18 2 t18-2M50 30 q6 6 14 2M24 42 q4 2 6-2M62 42q6 4 14-2" fill="none" stroke="#fbeae4" stroke-width="2.2" stroke-linecap="round"/>' },

    { id: 'togarashi', label: 'とうがらし', body:
      chiliPath(6, false) + chiliPath(6, true) }
  ];

  // ---------- トランプ ----------
  var SUIT_PATH = {
    s: '<path d="M50 6 C78 30 94 44 94 62 C94 76 83 84 71 84 C62 84 55 80 52 74 L57 94 H43 L48 74 C45 80 38 84 29 84 C17 84 6 76 6 62 C6 44 22 30 50 6Z"/>',
    h: '<path d="M50 90 C20 68 5 52 5 33 C5 18 16 8 30 8 C40 8 47 14 50 22 C53 14 60 8 70 8 C84 8 95 18 95 33 C95 52 80 68 50 90Z"/>',
    d: '<path d="M50 4 L88 50 L50 96 L12 50Z"/>',
    c: '<circle cx="50" cy="28" r="20"/><circle cx="27" cy="60" r="20"/><circle cx="73" cy="60" r="20"/><path d="M44 48 H56 L60 94 H40Z"/><circle cx="50" cy="56" r="10"/>'
  };
  var SUIT_NAME = { s: 'スペード', h: 'ハート', d: 'ダイヤ', c: 'クラブ' };
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var RED = '#cf2e2a', BLACK = '#24211e';

  function suitSvg(s) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g fill="' + (s === 'h' || s === 'd' ? RED : BLACK) + '">' +
      SUIT_PATH[s] + '</g></svg>';
  }

  function trumpList() {
    var list = [];
    ['s', 'h', 'd', 'c'].forEach(function (s) {
      RANKS.forEach(function (r) {
        var red = s === 'h' || s === 'd';
        list.push({
          id: s + r,
          label: SUIT_NAME[s] + 'の ' + r,
          html: '<span class="tr ' + (red ? 'tr-red' : 'tr-black') + (/[JQK]/.test(r) ? ' tr-face' : '') + '">' +
            '<span class="tr-rank' + (r === '10' ? ' tr-10' : '') + '">' + r + '</span>' +
            '<span class="tr-suit">' + suitSvg(s) + '</span></span>'
        });
      });
    });
    return list;
  }

  window.ShinkeiArt = {
    animals: function () {
      return ANIMALS.map(function (a) {
        return { id: a.id, label: a.label, html: '<span class="pic pic-animal">' + svg('0 0 100 100', a.body) + '</span>' };
      });
    },
    foods: function () {
      return FOODS.map(function (f) {
        return {
          id: f.id, label: f.label,
          html: '<span class="pic pic-food">' + svg('0 0 100 80', f.body) + '</span>' +
            '<span class="pic-name" style="--n:' + Math.max(4, f.label.length) + '">' + f.label + '</span>'
        };
      });
    },
    trumps: trumpList,
    animalSvg: function (i) { return svg('0 0 100 100', ANIMALS[i].body); },
    foodSvg: function (i) { return svg('0 0 100 80', FOODS[i].body); },
    suitSvg: suitSvg
  };
})();
