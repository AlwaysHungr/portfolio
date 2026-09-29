/* ============================================================
   Claude AI e-learning — κοινός μηχανισμός μαθήματος
   Πλοήγηση κεφαλαίων, πρόοδος (localStorage), δραστηριότητες,
   τελικό quiz. Καθαρό JavaScript, χωρίς εξαρτήσεις.
   ============================================================ */
(function () {
  "use strict";

  var courseId = document.body.getAttribute("data-course") || "course";
  var STORE_KEY = "claudeCourse_" + courseId;

  /* ---------- Αποθήκευση προόδου ---------- */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { return JSON.parse(raw); }
    } catch (e) { /* ignore */ }
    return { lastChapter: 0, completed: [], activities: {}, quiz: null };
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  var state = loadState();

  /* ---------- Στοιχεία σελίδας ---------- */
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
  var navList = document.getElementById("navList");
  var progressFill = document.getElementById("progressFill");
  var progressLabel = document.getElementById("progressLabel");
  var overallLabel = document.getElementById("overallLabel");
  var topbarTitle = document.getElementById("topbarTitle");
  var current = 0;

  /* ---------- Πλευρικό μενού (ομαδοποίηση ανά υποενότητα) ---------- */
  var navButtons = [];
  function buildNav() {
    if (!navList) { return; }
    var lastGroup = null;
    chapters.forEach(function (ch, i) {
      var group = ch.getAttribute("data-group");
      if (group && group !== lastGroup) {
        var gl = document.createElement("li");
        var p = document.createElement("p");
        p.className = "nav-group-label";
        p.textContent = group;
        gl.appendChild(p);
        navList.appendChild(gl);
        lastGroup = group;
      }
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-item";
      btn.setAttribute("aria-label", "Μετάβαση: " + (ch.getAttribute("data-title") || "Κεφάλαιο " + i));

      var num = document.createElement("span");
      num.className = "nav-num";
      num.textContent = i === 0 ? "★" : String(i);

      var label = document.createElement("span");
      label.className = "nav-label";
      label.textContent = ch.getAttribute("data-title") || "Κεφάλαιο " + i;

      btn.appendChild(num);
      btn.appendChild(label);
      btn.addEventListener("click", function () {
        showChapter(i);
        closeSidebar();
      });
      li.appendChild(btn);
      navList.appendChild(li);
      navButtons.push(btn);
    });
  }

  /* ---------- Αυτόματη μπάρα πλοήγησης σε κάθε διαφάνεια ---------- */
  function buildSlideNav() {
    var total = chapters.length;
    chapters.forEach(function (ch, i) {
      if (ch.classList.contains("no-autonav") || ch.querySelector(".chapter-nav")) { return; }
      var nav = document.createElement("div");
      nav.className = "chapter-nav";

      var prev = document.createElement("button");
      prev.type = "button";
      prev.className = "btn btn-secondary";
      prev.setAttribute("data-nav", "prev");
      prev.textContent = "← Προηγούμενο";
      if (i === 0) { prev.disabled = true; }

      var ind = document.createElement("div");
      ind.className = "ch-indicator";
      ind.innerHTML = "Διαφάνεια " + i + " από " + (total - 1) +
        ' · <button type="button" class="btn btn-secondary btn-sm" data-nav="toc">Περιεχόμενα</button>';

      var next = document.createElement("button");
      next.type = "button";
      next.className = "btn btn-primary";
      if (i === total - 1) {
        next.setAttribute("data-nav", "toc");
        next.textContent = "Στην αρχή ↺";
      } else {
        next.setAttribute("data-nav", "next");
        next.textContent = "Επόμενο →";
      }

      nav.appendChild(prev);
      nav.appendChild(ind);
      nav.appendChild(next);
      ch.appendChild(nav);
    });
  }

  /* ---------- Πλοήγηση με πληκτρολόγιο ---------- */
  function bindKeys() {
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") { return; }
      if (e.key === "ArrowRight") { showChapter(current + 1); }
      else if (e.key === "ArrowLeft") { showChapter(current - 1); }
    });
  }

  function markCompleted(idx) {
    if (state.completed.indexOf(idx) === -1) {
      state.completed.push(idx);
      saveState();
    }
    refreshProgress();
  }

  function refreshProgress() {
    var total = chapters.length;
    var done = state.completed.length;
    var pct = total > 1 ? Math.round((done / total) * 100) : 0;
    if (pct > 100) { pct = 100; }
    if (state.percent !== pct) {
      state.percent = pct;
      state.totalChapters = total;
      saveState();
    }
    if (progressFill) { progressFill.style.width = pct + "%"; }
    if (progressLabel) { progressLabel.textContent = pct + "%"; }
    if (overallLabel) { overallLabel.textContent = done + " / " + total + " κεφάλαια"; }
    navButtons.forEach(function (btn, i) {
      btn.classList.toggle("done", state.completed.indexOf(i) !== -1);
    });
  }

  /* ---------- Παύση βίντεο κατά την αλλαγή διαφάνειας ---------- */
  function pauseAllMedia() {
    // Ενσωματωμένα Vimeo βίντεο — παύση μέσω postMessage στο player
    document.querySelectorAll(".chapter iframe").forEach(function (fr) {
      var src = fr.getAttribute("src") || "";
      if (src.indexOf("vimeo.com") === -1 && src.indexOf("youtube.com") === -1) { return; }
      try {
        if (src.indexOf("vimeo.com") !== -1) {
          fr.contentWindow.postMessage(JSON.stringify({ method: "pause" }), "*");
        } else {
          fr.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
        }
      } catch (e) { /* ignore */ }
    });
    // Τυχόν HTML5 video/audio
    document.querySelectorAll(".chapter video, .chapter audio").forEach(function (m) {
      try { m.pause(); } catch (e) { /* ignore */ }
    });
  }

  function showChapter(idx) {
    if (idx < 0 || idx >= chapters.length) { return; }
    pauseAllMedia();
    // Το κεφάλαιο που αφήνουμε θεωρείται ολοκληρωμένο όταν προχωράμε μπροστά
    if (idx > current) { markCompleted(current); }
    current = idx;
    chapters.forEach(function (ch, i) {
      ch.classList.toggle("visible", i === idx);
    });
    navButtons.forEach(function (btn, i) {
      btn.classList.toggle("active", i === idx);
      if (i === idx) { btn.setAttribute("aria-current", "true"); }
      else { btn.removeAttribute("aria-current"); }
    });
    if (topbarTitle) {
      topbarTitle.textContent = chapters[idx].getAttribute("data-title") || "";
    }
    state.lastChapter = idx;
    // Το τελευταίο κεφάλαιο ολοκληρώνεται με την επίσκεψη
    if (idx === chapters.length - 1) { markCompleted(idx); }
    saveState();
    refreshProgress();
    window.scrollTo(0, 0);
    var main = document.querySelector(".content");
    if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); }
  }

  /* ---------- Κουμπιά πλοήγησης (prev/next/goto) ---------- */
  function bindNavigation() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-nav]");
      if (!t) { return; }
      var val = t.getAttribute("data-nav");
      if (val === "next") { showChapter(current + 1); }
      else if (val === "prev") { showChapter(current - 1); }
      else if (val === "toc") { showChapter(0); }
      else { showChapter(parseInt(val, 10) || 0); }
    });
  }

  /* ---------- Sidebar (κινητά) ---------- */
  var sidebarToggle = document.getElementById("sidebarToggle");
  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
  }
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      if (window.innerWidth > 1024) {
        document.body.classList.toggle("sidebar-collapsed");
      } else {
        document.body.classList.toggle("sidebar-open");
      }
    });
  }
  var overlay = document.getElementById("overlay");
  if (overlay) { overlay.addEventListener("click", closeSidebar); }

  /* ---------- Εναλλαγή θέματος (φωτεινό / σκούρο) ---------- */
  var themeBtn = document.getElementById("themeToggle");
  (function () {
    var stored = null;
    try { stored = localStorage.getItem("claudeCourse_theme"); } catch (e) {}
    var dark = stored ? stored === "dark"
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.body.classList.toggle("dark", dark);
    function syncThemeBtn() {
      if (!themeBtn) { return; }
      var on = document.body.classList.contains("dark");
      themeBtn.textContent = on ? "☀" : "🌙";
      themeBtn.setAttribute("aria-pressed", on ? "true" : "false");
      themeBtn.title = on ? "Φωτεινό θέμα" : "Σκούρο θέμα";
      themeBtn.setAttribute("aria-label", themeBtn.title);
    }
    syncThemeBtn();
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        document.body.classList.toggle("dark");
        try {
          localStorage.setItem("claudeCourse_theme",
            document.body.classList.contains("dark") ? "dark" : "light");
        } catch (e) {}
        syncThemeBtn();
      });
    }
  })();

  /* ---------- Επαναφορά προόδου ---------- */
  var resetBtn = document.getElementById("resetProgress");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (window.confirm("Θέλετε σίγουρα να διαγραφεί όλη η πρόοδός σας σε αυτή την ενότητα;")) {
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        window.location.reload();
      }
    });
  }

  /* ---------- Συνέχεια από το τελευταίο σημείο ---------- */
  var resumeBtn = document.getElementById("resumeBtn");
  if (resumeBtn) {
    if (state.lastChapter > 0) {
      resumeBtn.hidden = false;
      resumeBtn.addEventListener("click", function () { showChapter(state.lastChapter); });
    } else {
      resumeBtn.hidden = true;
    }
  }

  /* ============================================================
     Δραστηριότητες
     ============================================================ */
  function actState(id, val) {
    if (typeof val === "undefined") { return state.activities[id]; }
    state.activities[id] = val;
    saveState();
  }

  /* ---------- MCQ / Σωστό-Λάθος ---------- */
  function initMCQ() {
    document.querySelectorAll(".js-mcq").forEach(function (act, n) {
      var id = act.id || "mcq_" + n;
      var correct = parseInt(act.getAttribute("data-correct"), 10);
      var buttons = act.querySelectorAll(".option-btn");
      var fb = act.querySelector(".feedback");
      var retry = act.querySelector(".act-retry");
      var explainOk = act.getAttribute("data-ok") || "Σωστά!";
      var explainKo = act.getAttribute("data-ko") || "Δεν είναι σωστό.";

      function lock(chosen) {
        buttons.forEach(function (b, i) {
          b.disabled = true;
          if (i === correct) { b.classList.add("correct"); }
          else if (i === chosen && chosen !== correct) { b.classList.add("wrong"); }
        });
        if (fb) {
          fb.classList.add("show");
          if (chosen === correct) {
            fb.classList.add("ok"); fb.classList.remove("ko");
            fb.textContent = explainOk;
          } else {
            fb.classList.add("ko"); fb.classList.remove("ok");
            fb.textContent = explainKo;
            if (retry) { retry.hidden = false; }
          }
        }
      }
      function reset() {
        buttons.forEach(function (b) {
          b.disabled = false;
          b.classList.remove("correct", "wrong");
        });
        if (fb) { fb.classList.remove("show", "ok", "ko"); fb.textContent = ""; }
        if (retry) { retry.hidden = true; }
      }
      buttons.forEach(function (b, i) {
        b.addEventListener("click", function () {
          lock(i);
          if (i === correct) { actState(id, "done"); }
        });
      });
      if (retry) {
        retry.hidden = true;
        retry.addEventListener("click", reset);
      }
      if (actState(id) === "done") { lock(correct); if (retry) { retry.hidden = true; } }
    });
  }

  /* ---------- Flip cards ---------- */
  function initFlip() {
    document.querySelectorAll(".flip-card").forEach(function (card) {
      card.addEventListener("click", function () {
        card.classList.toggle("flipped");
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.classList.toggle("flipped");
        }
      });
    });
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    document.querySelectorAll(".tabs").forEach(function (tabs) {
      var btns = tabs.querySelectorAll(".tab-btn");
      var panels = tabs.querySelectorAll(".tab-panel");
      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-tab");
          btns.forEach(function (b) {
            var on = b === btn;
            b.classList.toggle("active", on);
            b.setAttribute("aria-selected", on ? "true" : "false");
          });
          panels.forEach(function (p) {
            p.classList.toggle("active", p.getAttribute("data-tab") === key);
          });
        });
      });
    });
  }

  /* ---------- Accordions ---------- */
  function initAccordions() {
    document.querySelectorAll(".acc-header").forEach(function (h) {
      h.addEventListener("click", function () {
        var item = h.parentElement;
        var open = item.classList.toggle("open");
        h.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ---------- Αντιστοίχιση ---------- */
  function initMatch() {
    document.querySelectorAll(".js-match").forEach(function (act, n) {
      var id = act.id || "match_" + n;
      var buttons = act.querySelectorAll(".match-btn");
      var fb = act.querySelector(".feedback");
      var selected = null;
      var totalPairs = {};
      buttons.forEach(function (b) { totalPairs[b.getAttribute("data-pair")] = true; });
      var pairCount = Object.keys(totalPairs).length;
      var matched = 0;

      function finish() {
        if (fb) {
          fb.classList.add("show", "ok");
          fb.textContent = act.getAttribute("data-ok") || "Μπράβο! Ολοκληρώσατε όλες τις αντιστοιχίσεις.";
        }
        actState(id, "done");
      }
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.classList.contains("matched")) { return; }
          if (!selected) {
            selected = b;
            b.classList.add("selected");
            return;
          }
          if (selected === b) {
            b.classList.remove("selected");
            selected = null;
            return;
          }
          var sameCol = selected.parentElement === b.parentElement;
          if (sameCol) {
            selected.classList.remove("selected");
            selected = b;
            b.classList.add("selected");
            return;
          }
          if (selected.getAttribute("data-pair") === b.getAttribute("data-pair")) {
            selected.classList.remove("selected");
            selected.classList.add("matched");
            b.classList.add("matched");
            selected = null;
            matched++;
            if (matched >= pairCount) { finish(); }
          } else {
            b.classList.add("shake");
            selected.classList.add("shake");
            var s = selected;
            setTimeout(function () {
              b.classList.remove("shake");
              s.classList.remove("shake", "selected");
            }, 380);
            selected = null;
          }
        });
      });
      if (actState(id) === "done") {
        buttons.forEach(function (b) { b.classList.add("matched"); });
        if (fb) { fb.classList.add("show", "ok"); fb.textContent = "Ολοκληρωμένο ✓"; }
      }
    });
  }

  /* ---------- Σωστή σειρά βημάτων ---------- */
  function initSequence() {
    document.querySelectorAll(".js-seq").forEach(function (act, n) {
      var id = act.id || "seq_" + n;
      var items = Array.prototype.slice.call(act.querySelectorAll(".seq-item"));
      var slots = Array.prototype.slice.call(act.querySelectorAll(".seq-slot"));
      var fb = act.querySelector(".feedback");
      var retry = act.querySelector(".act-retry");
      var placed = [];

      function evaluate() {
        var allOk = true;
        slots.forEach(function (slot, i) {
          var want = String(i + 1);
          var got = slot.getAttribute("data-got");
          var ok = got === want;
          slot.classList.toggle("ok", ok);
          slot.classList.toggle("ko", !ok);
          if (!ok) { allOk = false; }
        });
        if (fb) {
          fb.classList.add("show");
          if (allOk) {
            fb.classList.add("ok"); fb.classList.remove("ko");
            fb.textContent = act.getAttribute("data-ok") || "Σωστή σειρά! Μπράβο.";
            actState(id, "done");
          } else {
            fb.classList.add("ko"); fb.classList.remove("ok");
            fb.textContent = act.getAttribute("data-ko") || "Η σειρά δεν είναι σωστή. Δοκιμάστε ξανά.";
            if (retry) { retry.hidden = false; }
          }
        }
      }
      function reset() {
        placed = [];
        items.forEach(function (it) { it.classList.remove("placed"); it.disabled = false; });
        slots.forEach(function (s) {
          s.classList.remove("filled", "ok", "ko");
          s.removeAttribute("data-got");
          s.querySelector(".slot-text").textContent = "";
        });
        if (fb) { fb.classList.remove("show", "ok", "ko"); fb.textContent = ""; }
        if (retry) { retry.hidden = true; }
      }
      items.forEach(function (item) {
        item.addEventListener("click", function () {
          if (item.classList.contains("placed")) { return; }
          if (placed.length >= slots.length) { return; }
          var slot = slots[placed.length];
          slot.classList.add("filled");
          slot.setAttribute("data-got", item.getAttribute("data-step"));
          slot.querySelector(".slot-text").textContent = item.textContent;
          item.classList.add("placed");
          item.disabled = true;
          placed.push(item);
          if (placed.length === slots.length) { evaluate(); }
        });
      });
      if (retry) {
        retry.hidden = true;
        retry.addEventListener("click", reset);
      }
      if (actState(id) === "done" && fb) {
        fb.classList.add("show", "ok");
        fb.textContent = "Ολοκληρωμένο ✓";
      }
    });
  }

  /* ---------- Συμπλήρωση κενών (select) ---------- */
  function initFillBlank() {
    document.querySelectorAll(".js-fill").forEach(function (act, n) {
      var id = act.id || "fill_" + n;
      var selects = act.querySelectorAll("select");
      var checkBtn = act.querySelector(".fill-check");
      var fb = act.querySelector(".feedback");
      if (!checkBtn) { return; }
      checkBtn.addEventListener("click", function () {
        var allOk = true;
        selects.forEach(function (s) {
          var ok = s.value === s.getAttribute("data-answer");
          s.classList.toggle("ok", ok);
          s.classList.toggle("ko", !ok);
          if (!ok) { allOk = false; }
        });
        if (fb) {
          fb.classList.add("show");
          if (allOk) {
            fb.classList.add("ok"); fb.classList.remove("ko");
            fb.textContent = act.getAttribute("data-ok") || "Σωστά! Όλα τα κενά συμπληρώθηκαν σωστά.";
            actState(id, "done");
          } else {
            fb.classList.add("ko"); fb.classList.remove("ok");
            fb.textContent = act.getAttribute("data-ko") || "Κάποια κενά δεν είναι σωστά. Διορθώστε τα με κόκκινο και ξαναπροσπαθήστε.";
          }
        }
      });
    });
  }

  /* ============================================================
     Τελικό quiz — τα δεδομένα ορίζονται στο window.COURSE_QUIZ
     [{ q, options[], correct, explain, type? }]
     ============================================================ */
  function initFinalQuiz() {
    var host = document.getElementById("finalQuiz");
    var data = window.COURSE_QUIZ;
    if (!host || !data || !data.length) { return; }

    var idx = 0;
    var answers = new Array(data.length).fill(null);

    function render() {
      host.innerHTML = "";
      if (idx >= data.length) { return renderResult(); }
      var q = data[idx];

      var prog = document.createElement("p");
      prog.className = "quiz-progress";
      prog.textContent = "Ερώτηση " + (idx + 1) + " από " + data.length;
      host.appendChild(prog);

      var card = document.createElement("div");
      card.className = "quiz-question-card";
      var h = document.createElement("h3");
      h.textContent = q.q;
      card.appendChild(h);

      var opts = document.createElement("div");
      opts.className = "options";
      var keys = ["Α", "Β", "Γ", "Δ", "Ε"];
      q.options.forEach(function (opt, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "option-btn";
        var key = document.createElement("span");
        key.className = "opt-key";
        key.textContent = keys[i] || (i + 1);
        b.appendChild(key);
        b.appendChild(document.createTextNode(opt));
        b.addEventListener("click", function () {
          answers[idx] = i;
          opts.querySelectorAll(".option-btn").forEach(function (x, xi) {
            x.disabled = true;
            if (xi === q.correct) { x.classList.add("correct"); }
            else if (xi === i && i !== q.correct) { x.classList.add("wrong"); }
          });
          fbEl.classList.add("show", i === q.correct ? "ok" : "ko");
          fbEl.textContent = (i === q.correct ? "Σωστά! " : "Λάθος. ") + (q.explain || "");
          nextB.disabled = false;
        });
        opts.appendChild(b);
      });
      card.appendChild(opts);

      var fbEl = document.createElement("div");
      fbEl.className = "feedback";
      card.appendChild(fbEl);

      var nav = document.createElement("div");
      nav.className = "quiz-nav";
      var spacer = document.createElement("span");
      var nextB = document.createElement("button");
      nextB.type = "button";
      nextB.className = "btn btn-primary";
      nextB.textContent = idx === data.length - 1 ? "Ολοκλήρωση quiz" : "Επόμενη ερώτηση";
      nextB.disabled = true;
      nextB.addEventListener("click", function () { idx++; render(); });
      nav.appendChild(spacer);
      nav.appendChild(nextB);
      card.appendChild(nav);
      host.appendChild(card);
      host.scrollIntoView({ block: "start", behavior: "smooth" });
    }

    function renderResult() {
      var correctCount = 0;
      data.forEach(function (q, i) { if (answers[i] === q.correct) { correctCount++; } });
      var pct = Math.round((correctCount / data.length) * 100);
      var passed = pct >= 70;

      state.quiz = { score: correctCount, total: data.length, percent: pct, passed: passed };
      saveState();

      var wrap = document.createElement("div");
      wrap.className = "quiz-result card";

      var ring = document.createElement("div");
      ring.className = "score-ring";
      ring.style.setProperty("--pct", pct);
      ring.innerHTML = '<span class="score-num">' + pct + '%</span><span class="score-sub">' +
        correctCount + " / " + data.length + " σωστές</span>";
      wrap.appendChild(ring);

      var verdict = document.createElement("p");
      verdict.className = "quiz-verdict " + (passed ? "pass" : "fail");
      verdict.textContent = passed
        ? "Συγχαρητήρια! Ολοκληρώσατε επιτυχώς την ενότητα (όριο 70%)."
        : "Δεν φτάσατε το όριο του 70%. Μπορείτε να επαναλάβετε το μάθημα και το quiz όσες φορές θέλετε.";
      wrap.appendChild(verdict);

      var retryB = document.createElement("button");
      retryB.type = "button";
      retryB.className = "btn btn-secondary";
      retryB.textContent = "Επανάληψη quiz";
      retryB.addEventListener("click", function () {
        idx = 0;
        answers = new Array(data.length).fill(null);
        render();
      });
      wrap.appendChild(retryB);

      var review = document.createElement("div");
      review.className = "quiz-review";
      var rh = document.createElement("h3");
      rh.textContent = "Ανασκόπηση απαντήσεων";
      review.appendChild(rh);
      data.forEach(function (q, i) {
        var ok = answers[i] === q.correct;
        var item = document.createElement("div");
        item.className = "review-item " + (ok ? "ok" : "ko");
        var qEl = document.createElement("p");
        qEl.className = "ri-q";
        qEl.textContent = (i + 1) + ". " + q.q;
        item.appendChild(qEl);
        var aEl = document.createElement("p");
        aEl.textContent = (ok ? "✔ Σωστή απάντηση: " : "✘ Απαντήσατε: ") +
          (answers[i] !== null ? q.options[answers[i]] : "—") +
          (ok ? "" : " · Σωστή: " + q.options[q.correct]);
        item.appendChild(aEl);
        if (q.explain) {
          var ex = document.createElement("p");
          ex.className = "ri-explain";
          ex.textContent = q.explain;
          item.appendChild(ex);
        }
        review.appendChild(item);
      });
      wrap.appendChild(review);

      host.innerHTML = "";
      host.appendChild(wrap);
      host.scrollIntoView({ block: "start", behavior: "smooth" });
    }

    var startBtn = document.getElementById("quizStart");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        startBtn.parentElement.hidden = true;
        render();
      });
      if (state.quiz) {
        var prev = document.getElementById("quizPrev");
        if (prev) {
          prev.hidden = false;
          prev.textContent = "Προηγούμενο αποτέλεσμα: " + state.quiz.percent + "% (" +
            state.quiz.score + "/" + state.quiz.total + ") — " +
            (state.quiz.passed ? "Επιτυχία" : "Κάτω από το όριο 70%");
        }
      }
    } else {
      render();
    }
  }

  /* ---------- Εκκίνηση ---------- */
  buildNav();
  buildSlideNav();
  bindNavigation();
  bindKeys();
  initMCQ();
  initFlip();
  initTabs();
  initAccordions();
  initMatch();
  initSequence();
  initFillBlank();
  initFinalQuiz();
  refreshProgress();
  showChapter(0);
})();
