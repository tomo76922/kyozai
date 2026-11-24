# QRコードの プログラム（オフライン用）

ゲームの記録を QRコードで わたす「ランキング」で使います。ネットを使わずに動くように、ここに入れています。
どちらも中身は変えていません（npm で配布されている ファイルを そのまま入れています）。

| ファイル | 内容 | 版 | ライセンス |
| --- | --- | --- | --- |
| `qrcode.js` | QRコードを作る（qrcode-generator, © 2009 Kazuhiko Arase） | 1.4.4 | MIT（`LICENSE-qrcode-generator.txt`） |
| `jsQR.js` | カメラの画像から QRコードを読む（jsQR, © Cosmo Wolfe） | 1.4.0 | Apache License 2.0（`LICENSE-jsQR.txt`） |

- 出典：https://github.com/kazuhikoarase/qrcode-generator ／ https://github.com/cozmo/jsQR
- 「QRコード」は株式会社デンソーウェーブの登録商標です。
- 入れかえたときは、`sw.js` の `CACHE_VERSION` を上げてください。
