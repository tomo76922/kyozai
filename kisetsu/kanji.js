// 学年に合わせた文字（漢字・ふりがな・読み上げ）
// 文部科学省「学年別漢字配当表」（2020年度から実施の小学校学習指導要領）
//
// データの書き方：漢字の言葉は [漢字:よみ] と書く。
//   1字ずつ読みを「.」で区切ると、習った漢字だけ漢字にする（例：[入学式:にゅう.がく.しき] → 小2は「入学しき」）
//   区切らないと、言葉全体で1つ（例：[七夕:たなばた]。全部の漢字を習っていれば漢字、そうでなければ ひらがな）
//   [ ] の外には漢字を書かない（ひらがな・カタカナ・数字・記号だけ）
(function () {
  'use strict';

  var TABLE = [
    // 1年（80字）
    '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六',
    // 2年（160字）
    '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話',
    // 3年（200字）
    '悪安暗医委意育員院飲運泳駅央横屋温化荷界開階寒感漢館岸起期客究急級宮球去橋業曲局銀区苦具君係軽血決研県庫湖向幸港号根祭皿仕死使始指歯詩次事持式実写者主守取酒受州拾終習集住重宿所暑助昭消商章勝乗植申身神真深進世整昔全相送想息速族他打対待代第題炭短談着注柱丁帳調追定庭笛鉄転都度投豆島湯登等動童農波配倍箱畑発反坂板皮悲美鼻筆氷表秒病品負部服福物平返勉放味命面問役薬由油有遊予羊洋葉陽様落流旅両緑礼列練路和',
    // 4年（202字）
    '愛案以衣位茨印英栄媛塩岡億加果貨課芽賀改械害街各覚潟完官管関観願岐希季旗器機議求泣給挙漁共協鏡競極熊訓軍郡群径景芸欠結建健験固功好香候康佐差菜最埼材崎昨札刷察参産散残氏司試児治滋辞鹿失借種周祝順初松笑唱焼照城縄臣信井成省清静席積折節説浅戦選然争倉巣束側続卒孫帯隊達単置仲沖兆低底的典伝徒努灯働特徳栃奈梨熱念敗梅博阪飯飛必票標不夫付府阜富副兵別辺変便包法望牧末満未民無約勇要養浴利陸良料量輪類令冷例連老労録',
    // 5年（193字）
    '圧囲移因永営衛易益液演応往桜可仮価河過快解格確額刊幹慣眼紀基寄規喜技義逆久旧救居許境均禁句型経潔件険検限現減故個護効厚耕航鉱構興講告混査再災妻採際在財罪殺雑酸賛士支史志枝師資飼示似識質舎謝授修述術準序招証象賞条状常情織職制性政勢精製税責績接設絶祖素総造像増則測属率損貸態団断築貯張停提程適統堂銅導得毒独任燃能破犯判版比肥非費備評貧布婦武復複仏粉編弁保墓報豊防貿暴脈務夢迷綿輸余容略留領歴',
    // 6年（191字）
    '胃異遺域宇映延沿恩我灰拡革閣割株干巻看簡危机揮貴疑吸供胸郷勤筋系敬警劇激穴券絹権憲源厳己呼誤后孝皇紅降鋼刻穀骨困砂座済裁策冊蚕至私姿視詞誌磁射捨尺若樹収宗就衆従縦縮熟純処署諸除承将傷障蒸針仁垂推寸盛聖誠舌宣専泉洗染銭善奏窓創装層操蔵臓存尊退宅担探誕段暖値宙忠著庁頂腸潮賃痛敵展討党糖届難乳認納脳派拝背肺俳班晩否批秘俵腹奮並陛閉片補暮宝訪亡忘棒枚幕密盟模訳郵優預幼欲翌乱卵覧裏律臨朗論'
  ];

  // 小学校では習わないが、中学・高校で使う常用漢字（データで使うものだけ書き足す）
  var JOYO_EXTRA = '菊餅';

  var GRADE_OF = {};
  TABLE.forEach(function (s, i) {
    Array.from(s).forEach(function (ch) { GRADE_OF[ch] = i + 1; });
  });

  // 学年：1〜6 は小学校、7 は中学、8 は高校
  var CHUGAKU = 7;

  function isKanji(ch) {
    return /[㐀-鿿豈-﫿々]/.test(ch);
  }

  // その学年で、この漢字を漢字で書いてよいか
  function canUse(ch, grade) {
    if (grade <= 1) return false;               // 小1は ひらがな・カタカナだけ
    if (grade >= CHUGAKU) return true;          // 中学・高校は常用漢字
    var g = GRADE_OF[ch];
    return !!g && g <= grade;                   // その学年までに習う漢字
  }

  // "[入学式:にゅう.がく.しき]の ひ" → 部品の ならび
  var TOKEN = /\[([^\]:]+):([^\]]+)\]/g;

  function parse(str) {
    var out = [];
    var last = 0;
    var m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(str))) {
      if (m.index > last) out.push({ text: str.slice(last, m.index) });
      var base = Array.from(m[1]);
      var reads = m[2].split('.');
      if (reads.length > 1 && reads.length === base.length) {
        base.forEach(function (ch, i) { out.push({ base: ch, read: reads[i] }); });
      } else {
        out.push({ base: m[1], read: reads.join('') });
      }
      last = TOKEN.lastIndex;
    }
    if (last < str.length) out.push({ text: str.slice(last) });
    return out;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // 画面に出す HTML（ふりがなは <ruby>）
  function html(str, grade, furi) {
    return parse(str).map(function (p) {
      if (p.text != null) return esc(p.text);
      var ok = Array.from(p.base).every(function (ch) { return canUse(ch, grade); });
      if (!ok) return esc(p.read);
      if (!furi) return esc(p.base);
      return '<ruby>' + esc(p.base) + '<rt>' + esc(p.read) + '</rt></ruby>';
    }).join('');
  }

  // ふりがな なしの文字だけ
  function plain(str, grade) {
    return parse(str).map(function (p) {
      if (p.text != null) return p.text;
      var ok = Array.from(p.base).every(function (ch) { return canUse(ch, grade); });
      return ok ? p.base : p.read;
    }).join('');
  }

  // 読み上げ用（漢字は かならず データの読みで読む）
  function reading(str) {
    return parse(str).map(function (p) {
      return p.text != null ? p.text : p.read;
    }).join('').replace(/[「」]/g, '');
  }

  // データの書きまちがいを さがす（開発用。コンソールに出す）
  function check(str, where) {
    var problems = [];
    var rest = str.replace(TOKEN, '');
    if (/[\[\]]/.test(rest)) problems.push('[ ] の書き方');
    Array.from(rest).forEach(function (ch) {
      if (isKanji(ch)) problems.push('[ ] の外の漢字「' + ch + '」');
    });
    TOKEN.lastIndex = 0;
    var m;
    while ((m = TOKEN.exec(str))) {
      var base = Array.from(m[1]);
      var reads = m[2].split('.');
      if (reads.length > 1 && reads.length !== base.length) problems.push('読みの数「' + m[0] + '」');
      base.forEach(function (ch) {
        if (!GRADE_OF[ch] && JOYO_EXTRA.indexOf(ch) < 0) problems.push('表にない漢字「' + ch + '」');
      });
    }
    if (problems.length && window.console) {
      console.warn('きせつクイズ：' + (where || '') + ' ' + str + ' → ' + problems.join('、'));
    }
    return problems.length === 0;
  }

  window.Kanji = {
    GRADE_OF: GRADE_OF,
    canUse: canUse,
    parse: parse,
    html: html,
    plain: plain,
    reading: reading,
    check: check
  };
})();
