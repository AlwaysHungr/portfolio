/* ============================================================
   Διαστημικό θέμα: έναστρο φόντο και κινούμενο λογότυπο
   ------------------------------------------------------------
   Ο ουρανός φτιάχνεται με CSS. Εδώ προστίθεται μόνο το στοιχείο
   που τον φιλοξενεί και το σπειροειδές λογότυπο σε canvas.
   Καθαρή JavaScript, χωρίς εξαρτήσεις.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Το φόντο ---------- */
  function buildSky() {
    if (document.querySelector(".space-sky")) { return; }
    var sky = document.createElement("div");
    sky.className = "space-sky";
    sky.setAttribute("aria-hidden", "true");
    var glow = document.createElement("div");
    glow.className = "space-layer";
    sky.appendChild(glow);
    document.body.insertBefore(sky, document.body.firstChild);
  }

  function init() {
    buildSky();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
