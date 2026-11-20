# ひらがなカード

iPad の Safari で使う、ひらがな46文字（あ〜ん）のカード教材です。
カードをタップすると、その文字を読み上げます。

公開URL: https://tomo76922.github.io/kyozai/

## 特長
- 五十音表の並び（5列）で大きなカードを表示
- その下に濁音・半濁音（が〜ぽ）25文字のカード
- タップで読み上げ（端末内の日本語音声を使用・外部サービスなし）
- 「ゆっくり」ボタンで読み上げ速度を遅くできる
- 広告・外部サイトの読み込みなし
- PWA（Service Worker）対応：一度開けばオフラインでも使える

## iPad での使い方
1. Safari で公開URLを開く
2. 共有ボタン →「ホーム画面に追加」でアプリのように使えます
3. 音が出ないときは、本体の音量・消音モード（サイレント）を確認してください

## GitHub Pages の設定
Settings → Pages → Source を「Deploy from a branch」、
ブランチ `main`、フォルダ `/ (root)` にします。

## ファイル構成（すべてリポジトリ直下）
| ファイル | 内容 |
| --- | --- |
| `index.html` | ページ本体 |
| `style.css` | 見た目 |
| `app.js` | カード生成・読み上げ・Service Worker 登録 |
| `sw.js` | Service Worker（オフライン用キャッシュ） |
| `manifest.webmanifest` | PWA 設定 |
| `icons/` | ホーム画面用アイコン |
| `.nojekyll` | GitHub Pages でそのまま配信するための空ファイル |

## 更新するとき
ファイルを変更したら `sw.js` の `CACHE_VERSION`（例：`v2` → `v3`）を上げてください。
上げないと、iPad 側に古いキャッシュが残ることがあります。
