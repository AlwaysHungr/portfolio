/* =========================================================================
   SCORM 1.2 driver, μη-παρεμβατική σύνδεση με το διαδραστικό μάθημα.
   -------------------------------------------------------------------------
   - Εντοπίζει το LMS API (cmi 1.2) σε γονικά frames / opener.
   - Θέτει lesson_status = "incomplete" στην αρχή, "completed" στο τέλος.
   - Αποθηκεύει bookmark (cmi.core.lesson_location) και suspend_data.
   - Επαναφέρει τη διαφάνεια όπου σταμάτησε ο εκπαιδευόμενος (resume).
   - Στέλνει session_time και κάνει LMSCommit / LMSFinish στην έξοδο.
   - Αν δεν υπάρχει LMS (π.χ. τοπικό άνοιγμα), το μάθημα λειτουργεί κανονικά.
   Δεν τροποποιεί τη λογική του script.js, παρακολουθεί μόνο το DOM.
   ========================================================================= */
(function () {
  "use strict";

  /* ---------- Αποτροπή επιλογής / αντιγραφής κειμένου ---------- */
  function applyCopyGuard() {
    var css = "html,body,.app,.slide,.slide *{" +
      "-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;" +
      "-webkit-touch-callout:none;}";
    var st = document.createElement("style");
    st.setAttribute("data-copy-guard", "1");
    st.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(st);

    function block(e) { e.preventDefault(); return false; }
    ["copy", "cut", "contextmenu", "dragstart", "selectstart"].forEach(function (ev) {
      document.addEventListener(ev, block, { passive: false });
    });
    document.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === "c" || k === "x" || k === "a" || k === "u" || k === "s" || k === "p")) {
        e.preventDefault();
        return false;
      }
    }, { passive: false });
  }
  applyCopyGuard();

  /* ---------- Εντοπισμός του SCORM 1.2 API ---------- */
  function findAPI(win) {
    var n = 0;
    while (win && (win.API == null) && (win.parent != null) && (win.parent != win) && n < 500) {
      n++; win = win.parent;
    }
    return win ? win.API : null;
  }
  function getAPI() {
    var api = findAPI(window);
    if (api == null && window.opener != null && typeof window.opener != "undefined") {
      api = findAPI(window.opener);
    }
    return api;
  }

  var API = null;
  try { API = getAPI(); } catch (e) { API = null; }

  var connected = false;
  var finished = false;
  var startMs = Date.now();
  var completed = false;
  var lastCommit = 0;

  function lms(fn) {
    try { return fn(); } catch (e) { return null; }
  }
  function get(key) {
    if (!connected) return "";
    return lms(function () { return API.LMSGetValue(key); }) || "";
  }
  function set(key, val) {
    if (!connected) return;
    lms(function () { API.LMSSetValue(key, String(val)); });
  }
  function commit(force) {
    if (!connected) return;
    var now = Date.now();
    if (!force && (now - lastCommit) < 4000) return;
    lastCommit = now;
    lms(function () { API.LMSCommit(""); });
  }

  /* ---------- Μορφή χρόνου CMITimespan: HHHH:MM:SS.SS ---------- */
  function timeSpan(ms) {
    var t = Math.max(0, Math.floor(ms / 10) / 100); // δευτερόλεπτα με 2 δεκαδικά
    var h = Math.floor(t / 3600);
    var m = Math.floor((t - h * 3600) / 60);
    var s = (t - h * 3600 - m * 60);
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    var ss = s.toFixed(2);
    if (s < 10) ss = "0" + ss;
    return p2(h) + ":" + p2(m) + ":" + ss;
  }

  /* ---------- Αρχικοποίηση συνεδρίας ---------- */
  function initialize() {
    if (API == null) return; // χωρίς LMS, σιωπηλή λειτουργία
    var ok = lms(function () { return API.LMSInitialize(""); });
    connected = (ok === "true" || ok === true);
    if (!connected) return;

    var status = get("cmi.core.lesson_status");
    if (status === "" || status === "not attempted" || status === "not_attempted" || status === "unknown") {
      set("cmi.core.lesson_status", "incomplete");
    }
    completed = (status === "completed" || status === "passed");
    commit(true);
  }

  /* ---------- Τερματισμός συνεδρίας ---------- */
  function terminate() {
    if (!connected || finished) return;
    finished = true;
    set("cmi.core.session_time", timeSpan(Date.now() - startMs));
    if (!completed) {
      set("cmi.core.exit", "suspend"); // ώστε να συνεχίσει από εκεί που σταμάτησε
    } else {
      set("cmi.core.exit", "");
    }
    commit(true);
    lms(function () { API.LMSFinish(""); });
    connected = false;
  }

  /* ---------- Παρακολούθηση προόδου από το DOM ---------- */
  function currentIndexFromCounter() {
    // "N / M" (#counter) ή "Διαφάνεια N από M" (#slideCounter)
    var c = document.getElementById("counter") || document.getElementById("slideCounter");
    if (!c) return -1;
    var m = (c.textContent || "").match(/(\d+)\s*(?:\/|από)\s*(\d+)/);
    if (!m) return -1;
    return parseInt(m[1], 10) - 1;
  }
  function currentPct() {
    var bar = document.querySelector(".progressbar[aria-valuenow], #progressBar[aria-valuenow]");
    if (bar) return parseInt(bar.getAttribute("aria-valuenow") || "0", 10);
    // εναλλακτικά templates: #spPct (AI MANAGER) ή #progressLabel (Claude AI) με κείμενο "NN%"
    var sp = document.querySelector("#spPct, #progressLabel");
    if (sp) {
      var m = (sp.textContent || "").match(/(\d+)\s*%/);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  }

  function onProgress() {
    if (!connected) return;
    var idx = currentIndexFromCounter();
    if (idx >= 0) set("cmi.core.lesson_location", String(idx));

    var pct = currentPct();
    set("cmi.suspend_data", JSON.stringify({ idx: idx, pct: pct }));

    if (!completed && pct >= 100) {
      completed = true;
      set("cmi.core.lesson_status", "completed");
    }
    commit(false);
  }

  /* ---------- Επαναφορά στο σημείο που σταμάτησε ο χρήστης ---------- */
  function resume() {
    if (!connected) return;
    var loc = get("cmi.core.lesson_location");
    var idx = parseInt(loc, 10);
    if (!isNaN(idx) && idx > 0) {
      var btn = document.querySelector('#sidebarNav .nav-item[data-i="' + idx + '"]');
      if (btn) btn.click();
    }
  }

  /* ---------- Σύνδεση παρατηρητή στην μπάρα προόδου ---------- */
  function attachObserver() {
    var bar = document.querySelector(".progressbar, #progressBar");
    if (bar) {
      var obs = new MutationObserver(onProgress);
      obs.observe(bar, { attributes: true, attributeFilter: ["aria-valuenow"] });
      onProgress();
      return;
    }
    // εναλλακτικά templates: παρακολούθηση αλλαγών του #counter / #slideCounter
    var counter = document.getElementById("counter") || document.getElementById("slideCounter");
    if (counter) {
      var obs2 = new MutationObserver(onProgress);
      obs2.observe(counter, { childList: true, characterData: true, subtree: true });
      onProgress();
    }
  }

  /* ---------- Εκκίνηση μετά την πλήρη φόρτωση του μαθήματος ---------- */
  function boot() {
    initialize();
    // δίνουμε χρόνο στο script.js να χτίσει sidebar/counter
    setTimeout(function () {
      resume();
      attachObserver();
    }, 60);
  }

  if (document.readyState === "complete") {
    boot();
  } else {
    window.addEventListener("load", boot, { once: true });
  }

  // Αποθήκευση/τερματισμός κατά την έξοδο
  window.addEventListener("pagehide", terminate);
  window.addEventListener("beforeunload", terminate);
  window.addEventListener("unload", terminate);
})();
