// オフライン対応（Service Worker の登録）
// メニューと各教材のページで共通に読み込みます。
// どのフォルダから読み込んでも、このファイルの隣にある sw.js を登録します。
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  var me = document.currentScript && document.currentScript.src;
  if (!me) return;
  var swUrl = new URL('sw.js', me).href;
  var scope = new URL('./', me).href;

  // すでに古い版が動いていたときだけ、新しい版への切り替えで1回だけ再読み込みする
  var hadController = !!navigator.serviceWorker.controller;
  var reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController || reloaded) return;
    // 教材の途中（タイマーが動いているときなど）は、ページ側で止められるようにする
    if (window.kyozaiBusy && window.kyozaiBusy()) return;
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(swUrl, { scope: scope, updateViaCache: 'none' })
      .then(function (reg) {
        // ホーム画面から開き直したとき（画面に戻ったとき）も更新を確認する
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });
      })
      .catch(function () {});
  });
})();
