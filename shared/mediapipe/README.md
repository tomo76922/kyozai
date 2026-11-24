# MediaPipe（しせんモード用）

「たべもの キャッチ」の「めで あそぶ（カメラ）」で、カメラの映像から 顔と黒目の位置を読み取るために使います。
外部から読み込まず、このフォルダのファイルだけで（オフラインでも）動きます。

| ファイル | 内容 | 入手元 |
| --- | --- | --- |
| `vision_bundle.mjs` | MediaPipe Tasks Vision（JavaScript） | npm `@mediapipe/tasks-vision` 0.10.35 |
| `wasm/vision_wasm_internal.js` / `.wasm` | 計算の本体（SIMD 版） | 同上 |
| `wasm/vision_wasm_nosimd_internal.js` / `.wasm` | 計算の本体（SIMD が使えない端末用） | 同上 |
| `face_landmarker.task` | Face Landmarker のモデル（float16 / 1） | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task |
| `LICENSE` | Apache License 2.0 の全文 | https://www.apache.org/licenses/LICENSE-2.0.txt |

- ライセンス：Apache License 2.0（Copyright Google LLC / The MediaPipe Authors）。全文は `LICENSE`。
- 上の ファイルは 入手したまま 変更していません。
- 版を上げるときは、ファイルを入れかえて、`sw.js` の `SHISEN_CACHE` の名前と、`shared/shisen.js` の `MP_VERSION` を変えてください。
