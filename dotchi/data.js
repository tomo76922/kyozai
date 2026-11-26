// どっちかな：はじめから 入っている もんだい
// ITEMS：絵（art.js の なまえ）と、画面に出す なまえ（ひらがな）
// もんだい：a が せいかい、b が ちがう ほう（左右は 毎回 ばらばらに 出す）
// きもち：a・b の どちらを えらんでも よい
(function (global) {
  'use strict';

  var ITEMS = {
    sakura: 'さくら', yukidaruma: 'ゆきだるま', suika: 'すいか', tebukuro: 'てぶくろ',
    momiji: 'もみじ', himawari: 'ひまわり',
    keki: 'ケーキ', togarashi: 'とうがらし', kare: 'カレー', aisu: 'アイス', remon: 'レモン', ramen: 'ラーメン',
    koto: 'コート', hansode: 'はんそで', mugiwara: 'むぎわらぼうし', nittobou: 'ニットぼう', mafura: 'マフラー',
    haburashi: 'はぶらし', kushi: 'くし', hasami: 'はさみ', supun: 'スプーン', taoru: 'タオル', sekken: 'せっけん',
    kasa: 'かさ', nagagutsu: 'ながぐつ', sandaru: 'サンダル', taiyo: 'はれ', ame: 'あめ',
    'shingo-ao': 'あおの しんごう', 'shingo-aka': 'あかの しんごう', koen: 'こうえん', suberidai: 'すべりだい', doro: 'どうろ', yakan: 'やかん',
    ringo: 'りんご', banana: 'バナナ', onigiri: 'おにぎり', pan: 'パン',
    buranko: 'ブランコ', boru: 'ボール', tsumiki: 'つみき', ehon: 'えほん', kureyon: 'おえかき',
    shabondama: 'シャボンだま', fusen: 'ふうせん',
    mizu: 'みず', ocha: 'おちゃ', gyunyu: 'ぎゅうにゅう', jusu: 'ジュース',
    'iro-aka': 'あか', 'iro-ao': 'あお', 'iro-kiiro': 'きいろ', 'iro-midori': 'みどり',
    'iro-pinku': 'ピンク', 'iro-murasaki': 'むらさき', 'iro-orenji': 'オレンジ', 'iro-mizuiro': 'みずいろ',
    nurie: 'ぬりえ', taiko: 'がっき', hiraganacard: 'ひらがな', kazucard: 'かず', tokei: 'とけい', okane: 'おかね',
    hiyoko: 'ぴよぴよ ラン', kado: 'しんけいすいじゃく'
  };

  var MONDAI = [
    { id: 'kisetsu', name: 'きせつ', qs: [
      { q: 'はるの ものは どっちかな？', a: 'sakura', b: 'yukidaruma' },
      { q: 'なつの ものは どっちかな？', a: 'suika', b: 'tebukuro' },
      { q: 'あきの ものは どっちかな？', a: 'momiji', b: 'himawari' },
      { q: 'ふゆの ものは どっちかな？', a: 'yukidaruma', b: 'himawari' },
      { q: 'なつに さく はなは どっちかな？', a: 'himawari', b: 'momiji' },
      { q: 'ふゆに つかう ものは どっちかな？', a: 'tebukuro', b: 'suika' }
    ] },
    { id: 'tabemono', name: 'たべもの', qs: [
      { q: 'あまい ものは どっちかな？', a: 'keki', b: 'togarashi' },
      { q: 'からい ものは どっちかな？', a: 'kare', b: 'aisu' },
      { q: 'すっぱい ものは どっちかな？', a: 'remon', b: 'keki' },
      { q: 'つめたい ものは どっちかな？', a: 'aisu', b: 'ramen' },
      { q: 'あつい ものは どっちかな？', a: 'ramen', b: 'aisu' }
    ] },
    { id: 'fuku', name: 'ふく', qs: [
      { q: 'さむい ひに きるのは どっち？', a: 'koto', b: 'hansode' },
      { q: 'あつい ひに きるのは どっち？', a: 'hansode', b: 'koto' },
      { q: 'さむい ひに てに はめるのは どっち？', a: 'tebukuro', b: 'mugiwara' },
      { q: 'あつい ひに かぶるのは どっち？', a: 'mugiwara', b: 'nittobou' },
      { q: 'さむい ひに くびに まくのは どっち？', a: 'mafura', b: 'hansode' }
    ] },
    { id: 'dougu', name: 'どうぐ', qs: [
      { q: 'はを みがくのは どっち？', a: 'haburashi', b: 'kushi' },
      { q: 'かみを とかすのは どっち？', a: 'kushi', b: 'haburashi' },
      { q: 'かみを きるのは どっち？', a: 'hasami', b: 'supun' },
      { q: 'ごはんを たべるのは どっち？', a: 'supun', b: 'hasami' },
      { q: 'てを ふくのは どっち？', a: 'taoru', b: 'haburashi' },
      { q: 'てを あらうのは どっち？', a: 'sekken', b: 'kushi' }
    ] },
    { id: 'tenki', name: 'てんき', qs: [
      { q: 'あめの ひに つかう ものは どっち？', a: 'kasa', b: 'mugiwara' },
      { q: 'あめの ひに はくのは どっち？', a: 'nagagutsu', b: 'sandaru' },
      { q: 'はれの ひは どっち？', a: 'taiyo', b: 'ame' },
      { q: 'あめの ひは どっち？', a: 'ame', b: 'taiyo' }
    ] },
    { id: 'anzen', name: 'あんぜん', qs: [
      { q: 'わたって いい しんごうは どっち？', a: 'shingo-ao', b: 'shingo-aka' },
      { q: 'とまる しんごうは どっち？', a: 'shingo-aka', b: 'shingo-ao' },
      { q: 'あそんで いい ところは どっち？', a: 'koen', b: 'doro' },
      { q: 'さわると あつくて あぶない ものは どっち？', a: 'yakan', b: 'taoru' }
    ] }
  ];

  var KIMOCHI = [
    { id: 'tabemono', name: 'たべもの', qs: [
      { q: 'どっちが すき？', a: 'ringo', b: 'banana' },
      { q: 'どっちを たべたい？', a: 'onigiri', b: 'pan' },
      { q: 'どっちが すき？', a: 'kare', b: 'ramen' },
      { q: 'どっちを たべたい？', a: 'keki', b: 'aisu' }
    ] },
    { id: 'asobi', name: 'あそび', qs: [
      { q: 'どっちで あそびたい？', a: 'buranko', b: 'suberidai' },
      { q: 'どっちで あそびたい？', a: 'boru', b: 'tsumiki' },
      { q: 'どっちを やりたい？', a: 'ehon', b: 'kureyon' },
      { q: 'どっちが すき？', a: 'shabondama', b: 'fusen' }
    ] },
    { id: 'nomimono', name: 'のみもの', qs: [
      { q: 'どっちを のみたい？', a: 'mizu', b: 'ocha' },
      { q: 'どっちを のみたい？', a: 'gyunyu', b: 'jusu' },
      { q: 'どっちが すき？', a: 'ocha', b: 'gyunyu' },
      { q: 'どっちを のみたい？', a: 'jusu', b: 'mizu' }
    ] },
    { id: 'iro', name: 'いろ', qs: [
      { q: 'どっちの いろが すき？', a: 'iro-aka', b: 'iro-ao' },
      { q: 'どっちの いろが すき？', a: 'iro-kiiro', b: 'iro-midori' },
      { q: 'どっちの いろが すき？', a: 'iro-pinku', b: 'iro-murasaki' },
      { q: 'どっちの いろが すき？', a: 'iro-orenji', b: 'iro-mizuiro' }
    ] },
    { id: 'kyozai', name: 'やりたい こと', qs: [
      { q: 'どっちを やりたい？', a: 'nurie', b: 'taiko' },
      { q: 'どっちを やりたい？', a: 'hiraganacard', b: 'kazucard' },
      { q: 'どっちを やりたい？', a: 'tokei', b: 'okane' },
      { q: 'どっちで あそびたい？', a: 'hiyoko', b: 'kado' }
    ] }
  ];

  // かいはつ用：絵が ない もの・なまえが ない ものを しらせる
  [MONDAI, KIMOCHI].forEach(function (groups) {
    groups.forEach(function (g) {
      g.qs.forEach(function (x) {
        [x.a, x.b].forEach(function (id) {
          if (!ITEMS[id]) console.warn('どっちかな：なまえが ない ' + id);
          if (global.DotchiArt && !global.DotchiArt.has(id)) console.warn('どっちかな：絵が ない ' + id);
        });
      });
    });
  });

  global.DotchiData = { ITEMS: ITEMS, MONDAI: MONDAI, KIMOCHI: KIMOCHI };
})(window);
