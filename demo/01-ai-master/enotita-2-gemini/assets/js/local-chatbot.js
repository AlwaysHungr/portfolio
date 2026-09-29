/* ============================================================
   Βοηθός μαθήματος
   ------------------------------------------------------------
   Απαντά σε ερωτήσεις για το περιεχόμενο της ενότητας.
   Χτίζει ευρετήριο από τις ίδιες τις διαφάνειες, αναγνωρίζει
   το είδος της ερώτησης, συνθέτει απάντηση από το υλικό και
   οδηγεί στη διαφάνεια που την περιέχει.
   Καθαρή JavaScript, χωρίς εξαρτήσεις και χωρίς κλήσεις δικτύου.
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     1. Επεξεργασία ελληνικού κειμένου
     ============================================================ */

  // Πεζά, αφαίρεση τόνων και διαλυτικών, τελικό σίγμα ως σίγμα.
  function fold(text) {
    return String(text == null ? "" : text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ς/g, "σ")
      .replace(/[^a-zα-ω0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var STOP = {};
  ("και ο η το του της των τον την τα οι ενα ενας μια μιας σε με για απο ως προς παρα κατα μετα οτι αν να θα δεν μην ειναι ηταν εχει εχουν καθε ποιο ποια ποιος ποιες ποιοι τι πως που ποτε γιατι αυτο αυτη αυτος αυτα αυτες αυτοι μου σου μας σας τους τις στο στη στην στον στα στις στους αλλα ομως επισης οπως ολα ολο ολη πιο πολυ ενω μεσα εξω κανω κανει ειχε εχω θελω μπορω μπορει μπορουμε υπαρχει υπαρχουν οταν ωστε ετσι τοτε εδω εκει καποιο καποια θελετε μπορειτε a an the of to in on for and or is are be it this that how what why").split(" ").forEach(function (w) { STOP[fold(w)] = 1; });

  // Αντί για κανόνες κλίσης χρησιμοποιούμε πρόθεμα: «μοντελο» και
  // «μοντελων» καταλήγουν στο ίδιο κλειδί.
  function keyOf(token) { return token.length > 6 ? token.slice(0, 6) : token; }

  // Ζεύγη όρων που ο εκπαιδευόμενος μπορεί να χρησιμοποιήσει εναλλακτικά.
  var SYNONYMS = [
    ["prompt", "οδηγια", "ερωτημα", "εντολη"],
    ["μοντελο", "model", "εκδοση", "version"],
    ["εικονα", "image", "φωτογραφια", "dall"],
    ["βιντεο", "video", "sora", "veo"],
    ["λογαριασμο", "account", "εγγραφη", "συνδεση"],
    ["ρυθμισ", "settings", "επιλογ"],
    ["περιληψ", "συνοψ", "summary"],
    ["σφαλμα", "λαθοσ", "λαθη", "παραισθησ", "hallucination", "ανακριβ"],
    ["token", "tokens", "λεξη", "τμηματοποιησ"],
    ["συμφραζομεν", "context", "παραθυρο"],
    ["αρχειο", "file", "εγγραφο", "document", "pdf"],
    ["πινακ", "table", "excel", "spreadsheet"],
    ["ασφαλει", "security", "injection", "κινδυν"],
    ["κοστο", "κοστιζ", "cost", "τιμη", "χρεωση", "pricing", "δολαρι"],
    ["agent", "agents", "πρακτορ", "αυτονομ"],
    ["ερευν", "research", "πηγεσ", "sources", "παραπομπ"],
    ["εκπαιδευσ", "training", "παραμετρ", "μαθαιν"],
    ["ανακτησ", "rag", "θεμελιωσ", "grounding"]
  ];
  var SYN_INDEX = {};
  SYNONYMS.forEach(function (group) {
    group.forEach(function (word) {
      var k = keyOf(fold(word));
      SYN_INDEX[k] = (SYN_INDEX[k] || []).concat(group.map(function (w) { return keyOf(fold(w)); }));
    });
  });

  function tokenize(text) {
    var out = [], parts = fold(text).split(" ");
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i];
      if (t.length < 3 || STOP[t]) { continue; }
      out.push(keyOf(t));
    }
    return out;
  }

  // Χωρισμός σε προτάσεις, με ανοχή στις συντομογραφίες τύπου «π.χ.».
  function sentencesOf(text) {
    var out = [], buf = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      buf += ch;
      if (".;!?·".indexOf(ch) === -1) { continue; }
      var next = text[i + 1];
      if (next && next !== " ") { continue; }
      var words = buf.trim().replace(/[.;!?·]+$/, "").split(" ");
      var last = words[words.length - 1] || "";
      if (ch === "." && last.length <= 2) { continue; }   // π.χ., κ.λπ.
      out.push(buf.trim());
      buf = "";
    }
    if (buf.trim()) { out.push(buf.trim()); }
    return out.filter(function (s) { return s.length > 3; });
  }

  /* ============================================================
     2. Ευρετήριο διαφανειών
     ============================================================ */

  var docs = [];
  var df = {};
  var avgLen = 1;

  function sectionText(section) {
    var clone = section.cloneNode(true);
    var drop = clone.querySelectorAll(".chapter-nav, .chapter-kicker, .update-jump, .update-meta, .update-parent-label, .slide-shortcuts, .lc-callout, script, style");
    Array.prototype.forEach.call(drop, function (n) { n.parentNode.removeChild(n); });
    // Χωρίς διαχωριστικό τα κελιά ενός πίνακα θα κολλούσαν μεταξύ τους.
    var cells = clone.querySelectorAll("td, th, li");
    Array.prototype.forEach.call(cells, function (n) {
      n.parentNode.insertBefore(document.createTextNode(" · "), n.nextSibling);
    });
    return (clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  function buildIndex() {
    var sections = Array.prototype.slice.call(document.querySelectorAll("#content .chapter"));
    var total = 0;
    sections.forEach(function (section, idx) {
      var title = section.getAttribute("data-title") || "";
      var group = section.getAttribute("data-group") || "";
      var text = sectionText(section);
      if (!text) { return; }
      // Ο τίτλος μετράει βαρύτερα, γι' αυτό προστίθεται περισσότερες φορές.
      var tokens = tokenize(title + " " + title + " " + group + " " + text);
      if (!tokens.length) { return; }
      var tf = {};
      tokens.forEach(function (k) { tf[k] = (tf[k] || 0) + 1; });
      Object.keys(tf).forEach(function (k) { df[k] = (df[k] || 0) + 1; });
      docs.push({
        idx: idx, id: section.id || "", title: title, group: group,
        text: text, tf: tf, len: tokens.length,
        foldedTitle: fold(title),
        hasSteps: !!section.querySelector("ol, .practice-guide, .checklist"),
        hasTable: !!section.querySelector("table"),
        hasExample: /παραδειγμα|prompt|δοκιμαστε/.test(fold(text)),
        thin: text.length < 260
      });
      total += tokens.length;
    });
    avgLen = docs.length ? total / docs.length : 1;
  }

  /* ============================================================
     3. Αναγνώριση του είδους της ερώτησης
     ============================================================ */

  function readIntent(folded) {
    if (/^(τι ειναι|τι σημαινει|ορισμο|τι εννοειτε|τι θα πει)/.test(folded)) { return "definition"; }
    if (/^(πωσ|με ποιον τροπο)|βημα|οδηγι|διαδικασ/.test(folded)) { return "howto"; }
    if (/^(που |πουθε)|πωσ βρισκω|βρισκεται|εντοπιζ/.test(folded)) { return "where"; }
    if (/διαφορα|συγκρι|εναντι| vs /.test(folded)) { return "compare"; }
    if (/παραδειγμα|δειγμα|δειξε μου/.test(folded)) { return "example"; }
    if (/^(ποια|ποιεσ|ποιοι|λιστα|ονομασε|αναφερε)/.test(folded)) { return "list"; }
    return "general";
  }

  /* ============================================================
     4. Αναζήτηση
     ============================================================ */

  var K1 = 1.4, B = 0.72;

  function queryKeys(query) {
    var base = tokenize(query);
    var seen = {}, out = [];
    base.forEach(function (k) {
      if (!seen[k]) { seen[k] = 1; out.push({ key: k, weight: 1 }); }
      (SYN_INDEX[k] || []).forEach(function (s) {
        if (!seen[s]) { seen[s] = 1; out.push({ key: s, weight: 0.55 }); }
      });
    });
    return out;
  }

  function search(query, intent, limit) {
    var keys = queryKeys(query);
    if (!keys.length) { return []; }
    var N = docs.length || 1;
    var scored = [];

    docs.forEach(function (doc) {
      var score = 0, matched = 0;
      keys.forEach(function (item) {
        var n = df[item.key] || 0;
        if (!n) { return; }
        var idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        var f = doc.tf[item.key] || 0;
        if (f) {
          score += item.weight * idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * doc.len / avgLen));
          if (item.weight === 1) { matched++; }
        }
        if (doc.foldedTitle.indexOf(item.key) !== -1) { score += item.weight * idf * 1.6; }
      });
      if (!score) { return; }
      // Οι διαφάνειες που καλύπτουν περισσότερους όρους προηγούνται.
      score *= (1 + 0.28 * Math.max(0, matched - 1));
      // Μικρή ενίσχυση ανάλογα με το είδος της ερώτησης.
      if (intent === "howto" && doc.hasSteps) { score *= 1.25; }
      if (intent === "list" && (doc.hasTable || doc.hasSteps)) { score *= 1.2; }
      if (intent === "example" && doc.hasExample) { score *= 1.2; }
      if (intent === "compare" && doc.hasTable) { score *= 1.15; }
      // Μια διαφάνεια με μόνο μια λεζάντα δεν μπορεί να στηρίξει απάντηση.
      if (doc.thin) { score *= 0.55; }
      scored.push({ doc: doc, score: score });
    });

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, limit || 6);
  }

  // Συνθέτει σύντομη απάντηση από τις προτάσεις της καλύτερης διαφάνειας.
  var DEFINING = /(ειναι|ονομαζεται|λεγεται|οριζεται|αποτελει|σημαινει)/;

  function composeAnswer(doc, query, intent) {
    var keys = queryKeys(query).map(function (i) { return i.key; });
    var list = sentencesOf(doc.text);
    var best = -1, bestScore = 0;
    list.forEach(function (s, i) {
      if (s.length < 40) { return; }
      var f = fold(s), hits = 0;
      keys.forEach(function (k) { if (f.indexOf(k) !== -1) { hits++; } });
      var value = hits;
      // Σε ερώτηση ορισμού, μια οριστική πρόταση αξίζει περισσότερο.
      if (intent === "definition" && DEFINING.test(fold(s))) { value += 1.5; }
      value -= i * 0.01;
      if (value > bestScore) { bestScore = value; best = i; }
    });
    if (best < 0) {
      var fallback = list.find(function (s) { return s.length > 60; });
      return fallback ? fallback : doc.text.slice(0, 300);
    }
    var answer = list[best];
    // Μια δεύτερη πρόταση προστίθεται όταν η πρώτη είναι πολύ σύντομη.
    if (answer.length < 150 && list[best + 1]) { answer += " " + list[best + 1]; }
    if (answer.length > 460) { answer = answer.slice(0, 455).replace(/\s\S*$/, "") + "…"; }
    return answer;
  }

  function snippetOf(doc, query) {
    var keys = queryKeys(query).map(function (i) { return i.key; });
    var list = sentencesOf(doc.text);
    var best = "", bestHits = -1;
    list.forEach(function (s) {
      if (s.length < 30) { return; }
      var f = fold(s), hits = 0;
      keys.forEach(function (k) { if (f.indexOf(k) !== -1) { hits++; } });
      if (hits > bestHits) { bestHits = hits; best = s; }
    });
    if (!best) { best = doc.text; }
    if (best.length > 190) { best = best.slice(0, 186).replace(/\s\S*$/, "") + "…"; }
    return best;
  }

  /* ============================================================
     5. Γλωσσάρι βασικών εννοιών
     ============================================================ */

  var GLOSSARY = [
    { term: "Token", keys: ["token", "τοκεν"], answer: "Το token είναι η μονάδα επεξεργασίας ενός γλωσσικού μοντέλου: μπορεί να είναι μια λέξη, ένα κομμάτι λέξης ή ένα σημείο στίξης. Το μήκος της ερώτησης, της απάντησης και το κόστος μετρώνται σε tokens. Στα ελληνικά μια λέξη σπάει συνήθως σε περισσότερα tokens από ό,τι στα αγγλικά." },
    { term: "Παράθυρο συμφραζομένων", keys: ["παραθυ", "συμφρα", "context", "window"], answer: "Είναι όσα μπορεί να έχει ταυτόχρονα υπόψη του το μοντέλο: η οδηγία σας, τα αρχεία που ανεβάσατε, το ιστορικό της συνομιλίας και η απάντηση. Όταν γεμίσει, τα παλαιότερα στοιχεία παύουν να επηρεάζουν το αποτέλεσμα. Μεγάλο παράθυρο δεν σημαίνει ότι κάθε λεπτομέρεια θα αξιοποιηθεί εξίσου." },
    { term: "Prompt injection", keys: ["inject", "ενεση"], answer: "Είναι η προσπάθεια μιας πηγής, για παράδειγμα μιας ιστοσελίδας ή ενός επισυναπτόμενου, να δώσει κρυφές οδηγίες στο μοντέλο. Ο κανόνας είναι απλός: ό,τι διαβάζει ένα εργαλείο είναι δεδομένο προς επεξεργασία, ποτέ εντολή προς εκτέλεση." },
    { term: "Prompt", keys: ["prompt", "προμπτ"], answer: "Prompt είναι η οδηγία που δίνετε στο μοντέλο. Ένα καλό prompt ορίζει ρόλο, ζητούμενο, διαθέσιμο υλικό, μορφή παραδοτέου και κριτήρια ελέγχου. Όσο πιο συγκεκριμένο το ζητούμενο, τόσο λιγότερες υποθέσεις κάνει το μοντέλο." },
    { term: "Παραίσθηση", keys: ["παραισ", "hallucin", "επινοη"], answer: "Λέμε παραίσθηση την περίπτωση όπου το μοντέλο γράφει κάτι που ακούγεται σωστό αλλά δεν ισχύει. Συμβαίνει επειδή η παραγωγή βασίζεται σε πιθανές συνέχειες του κειμένου, όχι σε επαλήθευση. Γι' αυτό αριθμοί, ονόματα και παραπομπές ελέγχονται πάντα ανεξάρτητα." },
    { term: "Ημερομηνία γνώσης", keys: ["cutoff", "ημερομ"], answer: "Δηλώνει μέχρι πότε φτάνουν τα δεδομένα εκπαίδευσης ενός μοντέλου. Ό,τι συνέβη αργότερα δεν το γνωρίζει, εκτός αν κάνει αναζήτηση σε πραγματικό χρόνο ή αν του δώσετε εσείς την πηγή μέσα στη συνομιλία." },
    { term: "Agent", keys: ["agent", "πρακτο"], answer: "Agent είναι μια διάταξη όπου το μοντέλο δεν απαντά μόνο, αλλά εκτελεί κύκλους: σχεδιάζει βήμα, καλεί εργαλείο, βλέπει το αποτέλεσμα και συνεχίζει. Σε εργασίες πολλών βημάτων τα μικρά σφάλματα συσσωρεύονται, γι' αυτό χρειάζονται ενδιάμεσα σημεία ελέγχου και σαφή όρια." },
    { term: "Πολυτροπικότητα", keys: ["πολυτρ", "multimodal"], answer: "Πολυτροπικό λέγεται το μοντέλο που δέχεται ή παράγει περισσότερους από έναν τύπους δεδομένων: κείμενο, εικόνα, ήχο, βίντεο ή PDF. Προσοχή: το ότι καταλαβαίνει μια μορφή δεν σημαίνει ότι μπορεί και να την παράγει." },
    { term: "Benchmark", keys: ["benchm", "μετρησ"], answer: "Το benchmark είναι τυποποιημένη δοκιμασία σύγκρισης μοντέλων. Δίνει ένδειξη, όχι απόδειξη για τη δική σας εργασία. Για αξιόπιστη σύγκριση κρατάτε σταθερά το υλικό, το ζητούμενο και τα κριτήρια, και αλλάζετε ένα στοιχείο κάθε φορά." },
    { term: "Κάρτα μοντέλου", keys: ["model card", "καρτα μοντελου"], answer: "Είναι το επίσημο έγγραφο που περιγράφει τι δέχεται και τι παράγει ένα μοντέλο, το μέγεθος του παραθύρου, την ημερομηνία γνώσης, τις αξιολογήσεις και τους γνωστούς περιορισμούς. Είναι το πρώτο που διαβάζουμε πριν από κάθε δοκιμή." }
  ];

  function glossaryMatch(query) {
    var folded = fold(query);
    if (!folded) { return null; }
    var best = null, bestScore = 0;
    GLOSSARY.forEach(function (entry) {
      var score = 0;
      entry.keys.forEach(function (k) { if (folded.indexOf(k) !== -1) { score += k.length; } });
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    return bestScore ? best : null;
  }

  /* ============================================================
     6. Διεπαφή
     ============================================================ */

  var panel, log, logContent, scroller, scrollBtn, input, sendBtn, launcher, chipBar;
  var stick = true;
  var greeted = false, busy = false;
  var memory = { query: "", results: [], shown: 0, topic: "" };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  function atBottom() {
    if (!log) { return true; }
    return log.scrollHeight - log.scrollTop - log.clientHeight < 24;
  }

  // Κρατά συγχρονισμένα την αυτόματη παρακολούθηση και το κουμπί επιστροφής.
  function syncScrollState() {
    var end = atBottom();
    stick = end;
    if (log) { log.setAttribute("data-at-end", end ? "true" : "false"); }
    if (scrollBtn) { scrollBtn.setAttribute("data-visible", end ? "false" : "true"); }
  }

  function scrollLog(force) {
    if (!log) { return; }
    if (!stick && !force) { syncScrollState(); return; }
    var target = log.scrollHeight;
    var from = log.scrollTop;
    try { log.scrollTo({ top: target, behavior: "smooth" }); }
    catch (e) { log.scrollTop = target; }
    // Όταν η ομαλή κύλιση είναι απενεργοποιημένη, μεταφερόμαστε απευθείας.
    window.setTimeout(function () {
      if (log.scrollTop === from && from !== target) { log.scrollTop = log.scrollHeight; }
    }, 60);
    stick = true;
    [200, 500, 900].forEach(function (t) { window.setTimeout(syncScrollState, t); });
  }

  // Λίστες αποτελεσμάτων και κάρτες πηγής δεν μπαίνουν μέσα σε φυσαλίδα.
  function isRich(node) {
    return node && node.nodeType === 1 &&
      /lc-hits|lc-source|lc-lead/.test(String(node.className || ""));
  }

  function addMessage(role, nodes) {
    var item = el("div", "lc-item");
    var msg = el("div", "lc-msg " + (role === "user" ? "lc-user" : "lc-bot"));
    msg.setAttribute("data-align", role === "user" ? "end" : "start");
    msg.setAttribute("data-variant", role === "user" ? "default" : "muted");

    var bubble = null, ghost = null;
    (Array.isArray(nodes) ? nodes : [nodes]).forEach(function (n) {
      if (n == null) { return; }
      var node = typeof n === "string" ? el("p", null, n) : n;
      if (isRich(node)) {
        if (!ghost) { ghost = el("div", "lc-bubble lc-bubble-ghost"); msg.appendChild(ghost); }
        ghost.appendChild(node);
        bubble = null;
      } else {
        if (!bubble) { bubble = el("div", "lc-bubble"); msg.appendChild(bubble); }
        bubble.appendChild(node);
        ghost = null;
      }
    });

    item.appendChild(msg);
    logContent.appendChild(item);
    scrollLog();
    syncScrollState();
    return msg;
  }

  function showTyping() {
    var item = el("div", "lc-item");
    var msg = el("div", "lc-msg lc-bot lc-typing");
    msg.setAttribute("data-align", "start");
    msg.setAttribute("data-variant", "muted");
    msg.setAttribute("aria-hidden", "true");
    var bubble = el("div", "lc-bubble");
    for (var i = 0; i < 3; i++) { bubble.appendChild(el("span", "lc-dot")); }
    msg.appendChild(bubble);
    item.appendChild(msg);
    logContent.appendChild(item);
    scrollLog();
    return item;
  }

  function navButtons() {
    return Array.prototype.slice.call(document.querySelectorAll("#navList .nav-item"));
  }

  function goToSlide(doc) {
    var buttons = navButtons();
    if (buttons[doc.idx]) { buttons[doc.idx].click(); }
    var target = doc.id ? document.getElementById(doc.id) : null;
    requestAnimationFrame(function () {
      if (target && target.scrollIntoView) { target.scrollIntoView({ behavior: "auto", block: "start" }); }
      else { window.scrollTo(0, 0); }
    });
  }

  function jumpButton(doc, label) {
    var b = el("button", "lc-goto sc-btn sc-btn-xs sc-btn-outline", label || "Δείτε τη διαφάνεια →");
    b.type = "button";
    b.addEventListener("click", function () { goToSlide(doc); });
    return b;
  }

  function sourceLine(doc) {
    var wrap = el("div", "lc-source");
    var meta = el("div", "lc-source-meta");
    if (doc.group) { meta.appendChild(el("span", "lc-hit-group", doc.group)); }
    meta.appendChild(el("span", "lc-hit-title", doc.title || "Διαφάνεια"));
    wrap.appendChild(meta);
    wrap.appendChild(jumpButton(doc));
    return wrap;
  }

  function hitList(results, query) {
    var ul = el("ul", "lc-hits");
    results.forEach(function (r) {
      var li = el("li", "lc-hit");
      if (r.doc.group) { li.appendChild(el("span", "lc-hit-group", r.doc.group)); }
      li.appendChild(el("span", "lc-hit-title", r.doc.title || "Διαφάνεια"));
      li.appendChild(el("span", "lc-hit-snippet", snippetOf(r.doc, query)));
      li.appendChild(jumpButton(r.doc, "Μετάβαση →"));
      ul.appendChild(li);
    });
    return ul;
  }

  function groupList() {
    var seen = [], ul = el("ul", "lc-hits");
    docs.forEach(function (doc) {
      if (doc.group && seen.indexOf(doc.group) === -1) { seen.push(doc.group); }
    });
    seen.forEach(function (group) {
      var first = null;
      for (var i = 0; i < docs.length; i++) { if (docs[i].group === group) { first = docs[i]; break; } }
      if (!first) { return; }
      var li = el("li", "lc-hit");
      li.appendChild(el("span", "lc-hit-title", group));
      li.appendChild(jumpButton(first, "Άνοιγμα →"));
      ul.appendChild(li);
    });
    return ul;
  }

  // Προτάσεις επόμενης ερώτησης, με βάση τα υπόλοιπα αποτελέσματα.
  function setChips(items) {
    if (!chipBar) { return; }
    chipBar.innerHTML = "";
    items.slice(0, 3).forEach(function (chip) {
      var b = el("button", "lc-chip", chip.label);
      b.type = "button";
      b.addEventListener("click", function () { ask(chip.query); });
      chipBar.appendChild(b);
    });
  }

  function defaultChips() {
    var chips = [{ label: "Τι μπορείς να κάνεις;", query: "τι μπορείς να κάνεις" },
                 { label: "Περιεχόμενα", query: "περιεχόμενα" }];
    var seen = [];
    docs.forEach(function (doc) {
      if (doc.group && seen.indexOf(doc.group) === -1 && fold(doc.group).indexOf("εισαγωγη") === -1) { seen.push(doc.group); }
    });
    if (seen.length) {
      var label = seen[Math.min(1, seen.length - 1)].replace(/^\d+\.\s*/, "");
      chips.push({ label: label.length > 30 ? label.slice(0, 28) + "…" : label, query: label });
    }
    setChips(chips);
  }

  function shorten(text, max) {
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }

  /* ============================================================
     7. Απαντήσεις
     ============================================================ */

  var HELP = "Ρωτήστε με με δικά σας λόγια για οτιδήποτε υπάρχει σε αυτή την ενότητα. Καταλαβαίνω ερωτήσεις όπως «τι είναι το prompt;», «πώς φτιάχνω λογαριασμό;», «δείξε μου ένα παράδειγμα» ή «ποια μοντέλα υπάρχουν;». Μπορείτε επίσης να μου πείτε «περιεχόμενα» για τη δομή του μαθήματος, ή «πες μου περισσότερα» για να συνεχίσω από εκεί που σταμάτησα.";

  function currentSlide() {
    var visible = document.querySelector("#content .chapter.visible") || document.querySelector("#content .chapter");
    if (!visible) { return null; }
    for (var i = 0; i < docs.length; i++) { if (docs[i].id && docs[i].id === visible.id) { return docs[i]; } }
    return null;
  }

  function answerFromResults(results, query, intent, entry) {
    var parts = [];
    var top = null;
    for (var i = 0; i < results.length; i++) {
      if (!results[i].doc.thin) { top = results[i]; break; }
    }
    if (!top) { top = results[0]; }

    if (entry) {
      var def = el("p");
      def.appendChild(el("strong", null, entry.term + ". "));
      def.appendChild(document.createTextNode(entry.answer));
      parts.push(def);
      if (top) {
        parts.push(el("p", "lc-lead", "Το θέμα αναπτύσσεται εδώ:"));
        parts.push(sourceLine(top.doc));
      }
    } else if (top) {
      var lead = { definition: "", howto: "Να πώς περιγράφεται στο μάθημα:", where: "", compare: "", example: "", list: "", general: "" }[intent] || "";
      if (lead) { parts.push(el("p", "lc-lead", lead)); }
      parts.push(el("p", null, composeAnswer(top.doc, query, intent)));
      parts.push(sourceLine(top.doc));
    }

    var rest = results.filter(function (r) { return r !== top; }).slice(0, entry ? 3 : 2);
    if (rest.length) {
      parts.push(el("p", "lc-lead", "Σχετικά σημεία:"));
      parts.push(hitList(rest, query));
    }
    return parts;
  }

  function respond(query) {
    var folded = fold(query);
    var intent = readIntent(folded);

    /* --- Σύντομες κοινωνικές ανταλλαγές --- */
    if (/^(γεια|καλησπερα|καλημερα|χαιρετ|hi|hello|yasou)/.test(folded)) {
      addMessage("bot", ["Γεια σας! Τι θα θέλατε να δείτε από την ενότητα;"]);
      defaultChips();
      return;
    }
    if (/^(ευχαριστ|thanks|thank you|τελεια|ωραια|μπραβο|σουπερ)/.test(folded)) {
      addMessage("bot", ["Χαρά μου. Αν χρειαστείτε κάτι άλλο, είμαι εδώ."]);
      return;
    }
    if (/^(αντιο|τα λεμε|bye|καλο βραδυ)/.test(folded)) {
      addMessage("bot", ["Καλή συνέχεια στη μελέτη σας!"]);
      return;
    }
    if (/μπορεισ|βοηθεια|^help|ποιοσ εισαι|τι εισαι|πωσ δουλευεισ/.test(folded)) {
      addMessage("bot", [HELP]);
      defaultChips();
      return;
    }

    /* --- Ερωτήσεις για το ίδιο το μάθημα --- */
    if (/περιεχομ|θεματολ|δομη μαθηματοσ|ενοτητεσ εχει|τι εχει η ενοτητα/.test(folded)) {
      addMessage("bot", ["Οι θεματικές αυτής της ενότητας:", groupList()]);
      return;
    }
    if (/ποσεσ διαφανειε|ποσεσ οθονε|μεγεθοσ μαθηματο|ποσο μεγαλη ειναι/.test(folded)) {
      addMessage("bot", ["Η ενότητα έχει " + docs.length + " διαφάνειες, οργανωμένες σε θεματικές που μπορείτε να δείτε γράφοντας «περιεχόμενα»."]);
      return;
    }
    if (/που βρισκομαι|ποια διαφανεια|σε ποιο σημειο/.test(folded)) {
      var here = currentSlide();
      if (here) {
        addMessage("bot", ["Βρίσκεστε στη διαφάνεια «" + here.title + "»" + (here.group ? ", στη θεματική «" + here.group + "»." : "."), sourceLine(here)]);
      } else {
        addMessage("bot", ["Δεν μπόρεσα να εντοπίσω την τρέχουσα διαφάνεια."]);
      }
      return;
    }

    /* --- Συνέχεια της προηγούμενης απάντησης --- */
    if (/^(περισσοτερα|πεσ μου περισσοτερα|και μετα|συνεχισε|αλλο|αλλα|επομενο|ναι)\b/.test(folded) || folded === "και") {
      if (memory.results.length > memory.shown) {
        var next = memory.results.slice(memory.shown, memory.shown + 3);
        memory.shown += next.length;
        addMessage("bot", ["Ορίστε και άλλα σημεία για «" + memory.topic + "»:", hitList(next, memory.query)]);
      } else if (memory.topic) {
        addMessage("bot", ["Αυτά ήταν όσα βρήκα για «" + memory.topic + "». Δοκιμάστε μια πιο συγκεκριμένη λέξη ή ρωτήστε με κάτι άλλο."]);
      } else {
        addMessage("bot", ["Πείτε μου πρώτα τι σας ενδιαφέρει και θα σας δείξω τα σχετικά σημεία."]);
      }
      return;
    }

    /* --- Κανονική αναζήτηση --- */
    var results = search(query, intent, 6);
    var entry = intent === "compare" ? null : glossaryMatch(query);

    if (!results.length && !entry) {
      var near = docs.filter(function (d) {
        return fold(d.title).indexOf(folded.split(" ")[0] || "@@") !== -1;
      }).slice(0, 3);
      var parts = ["Δεν βρήκα κάτι με αυτή τη διατύπωση. Δοκιμάστε μία ή δύο πιο συγκεκριμένες λέξεις."];
      if (near.length) {
        parts.push(el("p", "lc-lead", "Μήπως εννοείτε:"));
        parts.push(hitList(near.map(function (d) { return { doc: d }; }), query));
      } else {
        parts.push(el("p", "lc-lead", "Ή δείτε τις θεματικές της ενότητας:"));
        parts.push(groupList());
      }
      addMessage("bot", parts);
      memory = { query: "", results: [], shown: 0, topic: "" };
      return;
    }

    // Χαμηλή βεβαιότητα: το δηλώνουμε αντί να παρουσιάσουμε την απάντηση ως σίγουρη.
    var uncertain = results.length && results[0].score < 1.15 && !entry;
    if (uncertain) {
      addMessage("bot", [
        "Δεν είμαι σίγουρος ότι κατάλαβα ακριβώς. Τα πιο κοντινά σημεία που βρήκα είναι:",
        hitList(results.slice(0, 3), query)
      ]);
    } else {
      addMessage("bot", answerFromResults(results, query, intent, entry));
    }

    // Κρατάμε για συνέχεια μόνο όσα αποτελέσματα είναι πράγματι σχετικά.
    var floor = results[0].score * 0.4;
    var solid = results.filter(function (r) { return r.score >= floor; });
    memory = { query: query, results: solid, shown: Math.min(3, solid.length), topic: shorten(query, 40) };

    var chips = results.slice(memory.shown, memory.shown + 2).map(function (r) {
      return { label: shorten(r.doc.title, 28), query: r.doc.title };
    });
    if (memory.results.length > memory.shown) { chips.unshift({ label: "Πες μου περισσότερα", query: "περισσότερα" }); }
    if (chips.length) { setChips(chips); } else { defaultChips(); }
  }

  function ask(query) {
    query = String(query || "").trim();
    if (!query || busy) { return; }
    busy = true;
    addMessage("user", [query]);
    var typing = showTyping();
    // Μικρή παύση, ώστε η ροή της συνομιλίας να είναι ευανάγνωστη.
    window.setTimeout(function () {
      if (typing && typing.parentNode) { typing.parentNode.removeChild(typing); }
      try { respond(query); }
      catch (e) { addMessage("bot", ["Κάτι πήγε στραβά με αυτή την ερώτηση. Δοκιμάστε μια διαφορετική διατύπωση."]); }
      busy = false;
      updateSendState();
    }, 260);
  }

  function updateSendState() {
    if (!sendBtn || !input) { return; }
    sendBtn.disabled = busy || !input.value.trim();
  }

  function openPanel() {
    if (!panel) { return; }
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      addMessage("bot", ["Γεια σας! Είμαι ο βοηθός αυτής της ενότητας. Ρωτήστε με με δικά σας λόγια τι ψάχνετε και θα σας δώσω την απάντηση μαζί με τη διαφάνεια όπου βρίσκεται."]);
      defaultChips();
    }
    window.setTimeout(function () { input.focus(); }, 30);
  }

  function closePanel() {
    if (!panel) { return; }
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  function buildUI() {
    launcher = el("button", "lc-launcher");
    launcher.type = "button";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "lcPanel");
    launcher.appendChild(el("span", "lc-launcher-icon", "💬"));
    launcher.appendChild(el("span", null, "Βοηθός μαθήματος"));
    launcher.addEventListener("click", openPanel);

    panel = el("div", "lc-panel");
    panel.id = "lcPanel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Βοηθός μαθήματος");

    var head = el("div", "lc-head");
    var headText = el("div", "lc-head-text");
    headText.appendChild(el("h2", null, "Βοηθός μαθήματος"));
    headText.appendChild(el("p", null, "Ρωτήστε με ό,τι θέλετε για την ενότητα"));
    head.appendChild(headText);
    var close = el("button", "lc-close sc-btn sc-btn-icon sc-btn-ghost", "✕");
    close.type = "button";
    close.setAttribute("aria-label", "Κλείσιμο του βοηθού");
    close.addEventListener("click", closePanel);
    head.appendChild(close);

    scroller = el("div", "lc-scroller");
    log = el("div", "lc-log");
    log.setAttribute("data-at-end", "true");
    logContent = el("div", "lc-content");
    logContent.setAttribute("role", "log");
    logContent.setAttribute("aria-live", "polite");
    log.appendChild(logContent);
    log.addEventListener("scroll", syncScrollState, { passive: true });

    scrollBtn = el("button", "lc-scroll-btn", "↓ Νεότερα");
    scrollBtn.type = "button";
    scrollBtn.setAttribute("data-visible", "false");
    scrollBtn.setAttribute("aria-label", "Μετάβαση στα νεότερα μηνύματα");
    scrollBtn.addEventListener("click", function () { stick = true; scrollLog(true); });

    scroller.appendChild(log);
    scroller.appendChild(scrollBtn);

    chipBar = el("div", "lc-chips sc-btn-group sc-btn-group-wrap");

    var form = el("form", "lc-form");
    input = el("input");
    input.type = "text";
    input.placeholder = "Γράψτε την ερώτησή σας…";
    input.setAttribute("aria-label", "Η ερώτησή σας προς τον βοηθό");
    input.autocomplete = "off";
    sendBtn = el("button", "sc-btn sc-btn-sm sc-btn-default", "Αποστολή");
    sendBtn.type = "submit";
    sendBtn.disabled = true;
    input.addEventListener("input", updateSendState);
    form.appendChild(input);
    form.appendChild(sendBtn);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value;
      input.value = "";
      updateSendState();
      ask(q);
    });

    var foot = el("p", "lc-foot", "Οι απαντήσεις προέρχονται από το υλικό αυτής της ενότητας.");

    panel.appendChild(head);
    panel.appendChild(scroller);
    panel.appendChild(chipBar);
    panel.appendChild(form);
    panel.appendChild(foot);

    // Τα βέλη μέσα στον βοηθό δεν αλλάζουν διαφάνεια.
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closePanel(); return; }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " "].indexOf(e.key) !== -1) {
        e.stopPropagation();
      }
    });

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    document.addEventListener("click", function (e) {
      var opener = e.target.closest ? e.target.closest("[data-open-assistant]") : null;
      if (opener) { openPanel(); }
    });
  }

  function init() {
    if (!document.getElementById("content")) { return; }
    buildIndex();
    if (!docs.length) { return; }
    buildUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
