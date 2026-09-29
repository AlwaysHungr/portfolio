/* ============================================================
   v2 add-on — standard features EKEK (15/07/2026)
   Fullscreen, Home, A+/A−, EKEK watermark.
   (Night mode και αρίθμηση διαφανειών υπάρχουν ήδη στο template.)
   ============================================================ */
(function () {
  "use strict";
  function ready(fn) {
    if (document.readyState !== "loading") { fn(); }
    else { document.addEventListener("DOMContentLoaded", fn); }
  }
  ready(function () {
    var right = document.querySelector(".topbar__right");
    var counter = document.getElementById("counter");
    if (!right) { return; }

    function iconBtn(id, text, title) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "iconbtn v2-txt";
      b.id = id;
      b.textContent = text;
      b.title = title;
      b.setAttribute("aria-label", title);
      return b;
    }

    /* ---------- Home: επιστροφή στην πρώτη διαφάνεια ---------- */
    var homeBtn = iconBtn("homeBtn", "⌂", "Επιστροφή στην πρώτη διαφάνεια");
    homeBtn.addEventListener("click", function () {
      var first = document.querySelector('#sidebarNav .nav-item[data-i="0"]') ||
                  document.querySelector("#sidebarNav .nav-item");
      if (first) { first.click(); }
    });

    /* ---------- Μέγεθος γραμματοσειράς A− / A+ (zoom στη διαφάνεια) ---------- */
    var minusBtn = iconBtn("fontMinus", "A−", "Μικρότερα γράμματα");
    var plusBtn = iconBtn("fontPlus", "A+", "Μεγαλύτερα γράμματα");
    var slide = document.getElementById("slide");
    var scale = parseFloat(localStorage.getItem("aigov_v2_fontScale") || "1") || 1;
    function applyScale() {
      if (slide) { slide.style.zoom = scale; }
      try { localStorage.setItem("aigov_v2_fontScale", String(scale)); } catch (e) {}
    }
    minusBtn.addEventListener("click", function () {
      scale = Math.max(0.85, Math.round((scale - 0.05) * 100) / 100); applyScale();
    });
    plusBtn.addEventListener("click", function () {
      scale = Math.min(1.3, Math.round((scale + 0.05) * 100) / 100); applyScale();
    });
    applyScale();

    /* ---------- Πλήρης οθόνη ---------- */
    var fsBtn = iconBtn("fsBtn", "⛶", "Πλήρης οθόνη");
    function fsIcon() { fsBtn.textContent = document.fullscreenElement ? "🗗" : "⛶"; }
    fsBtn.addEventListener("click", function () {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    });
    document.addEventListener("fullscreenchange", fsIcon);
    fsIcon();

    /* ---------- Τοποθέτηση: ⌂ A− A+ [counter] [θέμα] ⛶ ---------- */
    var anchor = counter || right.firstChild;
    right.insertBefore(homeBtn, anchor);
    right.insertBefore(minusBtn, anchor);
    right.insertBefore(plusBtn, anchor);
    right.appendChild(fsBtn);

    /* ---------- EKEK glassmorphism watermark ---------- */
    var wm = document.createElement("div");
    wm.className = "ekek-watermark";
    wm.setAttribute("aria-hidden", "true");
    var img = document.createElement("img");
    img.src = "ekek-logo.png";
    img.alt = "EKEK";
    wm.appendChild(img);
    document.body.appendChild(wm);
  });
})();
