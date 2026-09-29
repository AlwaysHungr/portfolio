/* ============================================================
   v2 add-on — standard features EKEK (15/07/2026)
   Fullscreen, Home, A+/A−, αρίθμηση διαφανειών, EKEK watermark.
   Δεν τροποποιεί το app.js — μόνο προσθέτει στοιχεία στο DOM.
   ============================================================ */
(function () {
  "use strict";
  function ready(fn) {
    if (document.readyState !== "loading") { fn(); }
    else { document.addEventListener("DOMContentLoaded", fn); }
  }
  ready(function () {
    var topbar = document.querySelector(".topbar");
    if (!topbar) { return; }
    var themeBtn = document.getElementById("themeToggle");
    var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter"));

    function iconBtn(id, text, title) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "icon-btn";
      b.id = id;
      b.textContent = text;
      b.title = title;
      b.setAttribute("aria-label", title);
      return b;
    }

    /* ---------- Home: επιστροφή στην πρώτη διαφάνεια ---------- */
    var homeBtn = iconBtn("homeBtn", "⌂", "Επιστροφή στην πρώτη διαφάνεια");
    homeBtn.setAttribute("data-nav", "toc"); // αξιοποιεί τον delegated handler του app.js

    /* ---------- Μέγεθος γραμματοσειράς A− / A+ ---------- */
    var minusBtn = iconBtn("fontMinus", "A−", "Μικρότερα γράμματα");
    var plusBtn = iconBtn("fontPlus", "A+", "Μεγαλύτερα γράμματα");
    minusBtn.classList.add("v2-font-btn");
    plusBtn.classList.add("v2-font-btn");
    var scale = parseFloat(localStorage.getItem("claudeV2_fontScale") || "1") || 1;
    function applyScale() {
      document.documentElement.style.fontSize = (16 * scale) + "px";
      document.body.style.fontSize = (16.5 * scale) + "px";
      try { localStorage.setItem("claudeV2_fontScale", String(scale)); } catch (e) {}
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

    /* ---------- Αρίθμηση διαφανειών (X / Y) ---------- */
    var counter = document.createElement("span");
    counter.id = "counter";
    counter.className = "v2-counter";
    function refreshCounter() {
      var idx = 0;
      for (var i = 0; i < chapters.length; i++) {
        if (chapters[i].classList.contains("visible")) { idx = i; break; }
      }
      counter.textContent = (idx + 1) + " / " + chapters.length;
    }
    chapters.forEach(function (ch) {
      new MutationObserver(refreshCounter)
        .observe(ch, { attributes: true, attributeFilter: ["class"] });
    });
    refreshCounter();

    /* ---------- Τοποθέτηση στο topbar: ☰ τίτλος ⌂ A− A+ [🌙] ⛶ X/Y πρόοδος ---------- */
    var anchor = themeBtn || topbar.querySelector(".topbar-progress");
    topbar.insertBefore(homeBtn, anchor);
    topbar.insertBefore(minusBtn, anchor);
    topbar.insertBefore(plusBtn, anchor);
    var after = themeBtn ? themeBtn.nextSibling : anchor;
    topbar.insertBefore(fsBtn, after);
    topbar.insertBefore(counter, fsBtn.nextSibling);

    /* ---------- EKEK glassmorphism watermark ---------- */
    var wm = document.createElement("div");
    wm.className = "ekek-watermark";
    wm.setAttribute("aria-hidden", "true");
    var img = document.createElement("img");
    img.src = "assets/images/ekek-logo.png";
    img.alt = "EKEK";
    wm.appendChild(img);
    document.body.appendChild(wm);
  });
})();
