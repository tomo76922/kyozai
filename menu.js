// メニュー（トップページ）
// ・ゲームの ボタンを おすと、パスワードを きく（shared/game-lock.js）
// ・先生用：右上の「せってい」を 1びょう ながおし すると、先生用の がめんが ひらく
//   （ゲームの パスワードを かえる・ランキングを あつめる）
(function () {
  'use strict';
  if (!window.GameLock) return;

  GameLock.bindMenu();

  var gearBtn = document.getElementById('gearBtn');
  var gearHint = document.getElementById('gearHint');
  var HOLD_MS = 1000;
  var holdTimer = 0;
  var hintTimer = 0;
  var opened = false;

  gearBtn.style.setProperty('--hold', HOLD_MS + 'ms');

  function startHold() {
    clearTimeout(holdTimer);
    opened = false;
    gearHint.hidden = true;
    gearBtn.classList.add('is-pressing');
    holdTimer = setTimeout(function () {
      opened = true;
      holdTimer = 0;
      gearBtn.classList.remove('is-pressing');
      openTeach();
    }, HOLD_MS);
  }
  function endHold() {
    if (!holdTimer) return;
    clearTimeout(holdTimer);
    holdTimer = 0;
    gearBtn.classList.remove('is-pressing');
    if (!opened) {
      gearHint.hidden = false;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { gearHint.hidden = true; }, 1800);
    }
  }

  gearBtn.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try { gearBtn.setPointerCapture(e.pointerId); } catch (err) {}
    startHold();
  });
  gearBtn.addEventListener('pointerup', endHold);
  gearBtn.addEventListener('pointercancel', endHold);
  gearBtn.addEventListener('lostpointercapture', endHold);
  gearBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  gearBtn.addEventListener('click', function (e) { e.preventDefault(); });
  gearBtn.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  gearBtn.addEventListener('keyup', function (e) {
    if (e.key === 'Enter' || e.key === ' ') endHold();
  });

  // ---------- 先生用の がめん ----------
  var teach = document.getElementById('teach');
  function openTeach() {
    teach.hidden = false;
    teach.querySelector('.teach-card').focus({ preventScroll: true });
  }
  function closeTeach() {
    teach.hidden = true;
    gearBtn.focus({ preventScroll: true });
  }
  document.getElementById('teachClose').addEventListener('click', closeTeach);
  teach.addEventListener('click', function (e) { if (e.target === teach) closeTeach(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !teach.hidden) closeTeach();
  });
  document.getElementById('pinBtn').addEventListener('click', function () {
    teach.hidden = true;
    GameLock.change({ onDone: function (changed) { if (changed) toast('パスワードを かえました'); } });
  });
  // 「もどる」で もどって きた ときは とじて おく
  window.addEventListener('pageshow', function () { teach.hidden = true; });

  var toastEl = null;
  var toastTimer = 0;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('p');
      toastEl.className = 'menu-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2500);
  }
})();
