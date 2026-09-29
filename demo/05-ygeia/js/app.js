/* =====================================================================
   Τεχνητή Νοημοσύνη στην Υγεία — Μηχανή παρουσίασης e-learning
   Καθαρή JavaScript, χωρίς εξαρτήσεις. Λειτουργεί τοπικά (file://).

   Δύο λειτουργίες:
   - Landing (index.html): window.LANDING_MODE = true → σελίδα επιλογής ενότητας.
   - Ενότητα (enotitaN.html): window.SINGLE_MODULE = 'eN' → παρουσίαση μίας ενότητας.
   ===================================================================== */
(function () {
  'use strict';

  var DATA = window.COURSE_DATA;
  var SINGLE = window.SINGLE_MODULE || null;
  var LANDING = !!window.LANDING_MODE;
  var STANDALONE = !!window.STANDALONE; /* αυτόνομο πακέτο ενότητας: χωρίς κεντρική σελίδα */
  var LS_VISITED = 'aihealth.visited';
  var LS_LAST = 'aihealth.last';      /* { e1: 4, e2: 0, ... } τελευταία διαφάνεια ανά ενότητα */
  var LS_LASTMOD = 'aihealth.lastmod'; /* id τελευταίας ενότητας που ανοίχθηκε */
  var LS_FONT = 'aihealth.fontsize';   /* επιλεγμένο μέγεθος γραμματοσειράς (%) */
  var FONT_LEVELS = [85, 92, 100, 108, 116, 125, 135];

  /* ---------------- Βοηθητικά ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ιδιωτική περιήγηση */ }
  }
  function pageFor(m) { return 'enotita' + m.number + '.html'; }

  /* ---------------- Εικονίδια (inline SVG) ---------------- */
  var ICONS = {
    brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3A2.5 2.5 0 0 0 7 5.5v.55A3 3 0 0 0 4.5 9v.5A3 3 0 0 0 3 12a3 3 0 0 0 1.5 2.6v.4A3 3 0 0 0 7 18v.5A2.5 2.5 0 0 0 9.5 21c1 0 2-.6 2.5-1.5V4.5C11.5 3.6 10.5 3 9.5 3z"/><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.55A3 3 0 0 1 19.5 9v.5A3 3 0 0 1 21 12a3 3 0 0 1-1.5 2.6v.4A3 3 0 0 1 17 18v.5A2.5 2.5 0 0 1 14.5 21c-1 0-2-.6-2.5-1.5V4.5c.5-.9 1.5-1.5 2.5-1.5z"/></svg>',
    heartbeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 13.5 12 21l-7.5-7.5A5 5 0 0 1 12 6.5a5 5 0 0 1 7.5 7z"/><path d="M4 12h4l1.5-3 2.5 6 1.5-3H18"/></svg>',
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="4"/><path d="M12 9.5v5M9.5 12h5"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/></svg>',
    dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3c0 4 10 6 10 10M17 3c0 2-1.5 3.5-3.7 4.6M7 21c0-4 10-6 10-10M7 11c1 .8 2.3 1.5 3.7 2.2M8 6h6M8 18h6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    caret: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    caretDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5M6 10.5V20h12v-9.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 10.5V17M12 7.2v.2"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-.8.7-1 1.5-1 2.5h-6c0-1-.2-1.8-1-2.5A6 6 0 0 1 12 3z"/></svg>',
    flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v6L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3M8.5 3h7M7 15h10"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.7 20h18.6zM12 10v4M12 17.4v.2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5V5.5M20 18v3H6.5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
    doctor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3.5"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0M12 14.5V18M10.2 16.2h3.6"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12z"/><path d="M8.5 11h.2M12 11h.2M15.5 11h.2"/></svg>',
    data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5C5 19.9 8.1 21 12 21s7-1.1 7-2.5V12"/></svg>',
    robot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="10" rx="2.5"/><path d="M12 8V5M12 5a1.5 1.5 0 1 0-.1-3 1.5 1.5 0 0 0 .1 3zM2.5 12v3M21.5 12v3"/><path d="M9 12.5v.5M15 12.5v.5M9.5 15.5h5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    pill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="8.8" width="17.6" height="6.4" rx="3.2" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/></svg>',
    microscope: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21h12M9.5 18H14a6 6 0 0 0 2.4-11.5M9 3l4 4-4.5 4.5-4-4zM7.5 9.5 6 11c2 3 4.5 3.5 6.5 2"/></svg>',
    network: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M12 7.2 6 16M12 7.2 18 16M7.2 18h9.6"/></svg>'
  };
  function icon(name) { return ICONS[name] || ICONS.info; }

  /* ---------------- Κατάσταση ---------------- */
  var visited = lsGet(LS_VISITED, {});
  var mod = SINGLE ? DATA.modules.find(function (m) { return m.id === SINGLE; }) : null;
  var current = { slide: 0 };

  function visitedCount(m) {
    var v = visited[m.id] || [];
    var n = 0;
    for (var i = 0; i < m.slides.length; i++) if (v[i]) n++;
    return n;
  }
  function isModuleDone(m) { return m.slides.length > 0 && visitedCount(m) === m.slides.length; }

  /* ---------------- Δρομολόγηση (hash, μόνο σε σελίδα ενότητας) ---------------- */
  function go(slideIdx) { location.hash = '#/' + (slideIdx + 1); }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var n = parseInt(h, 10);
    if (isNaN(n)) return null;
    return Math.min(Math.max(n - 1, 0), mod.slides.length - 1);
  }
  function onHashChange() {
    var idx = parseHash();
    if (idx === null) idx = 0;
    current.slide = idx;
    renderSlide();
    updateSidebarActive();
  }

  /* =====================================================================
     ΑΠΟΔΟΣΗ ΜΠΛΟΚ ΠΕΡΙΕΧΟΜΕΝΟΥ
     ===================================================================== */
  var blockRenderers = {

    heading: function (b) {
      var lvl = b.level === 3 ? 'h3' : 'h2';
      return el(lvl, 'blk-h', b.html || esc(b.text || ''));
    },

    html: function (b) { return el('div', 'blk', b.html); },
    paragraph: function (b) { return el('div', 'blk', '<p>' + b.html + '</p>'); },

    list: function (b) {
      var tag = b.ordered ? 'ol' : 'ul';
      var wrap = el('div', 'blk');
      var listEl = el(tag, '');
      (b.items || []).forEach(function (it) { listEl.appendChild(el('li', '', it)); });
      wrap.appendChild(listEl);
      return wrap;
    },

    callout: function (b) {
      var variant = b.variant || 'info';
      var iconMap = { info: 'info', tip: 'bulb', example: 'flask', warn: 'alert', definition: 'book', activity: 'activity' };
      var box = el('div', 'callout ' + variant);
      if (b.title) {
        box.appendChild(el('div', 'callout-title', icon(iconMap[variant]) + '<span>' + esc(b.title) + '</span>'));
      }
      box.appendChild(el('div', 'callout-body', b.html || ''));
      return box;
    },

    cards: function (b) {
      var grid = el('div', 'cards');
      if (b.columns) grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(' + (b.columns >= 3 ? 200 : 240) + 'px, 1fr))';
      (b.items || []).forEach(function (c) {
        var card = el('article', 'card');
        if (c.icon) card.appendChild(el('div', 'card-icon', icon(c.icon)));
        if (c.title) card.appendChild(el('div', 'card-title', c.title));
        card.appendChild(el('div', 'card-body', c.html || ''));
        grid.appendChild(card);
      });
      return grid;
    },

    stats: function (b) {
      var grid = el('div', 'stats');
      (b.items || []).forEach(function (s) {
        var st = el('div', 'stat');
        st.appendChild(el('div', 'stat-value', esc(s.value)));
        st.appendChild(el('div', 'stat-label', s.label));
        grid.appendChild(st);
      });
      return grid;
    },

    image: function (b) {
      var fig = el('figure', 'img-fig');
      var img = new Image();
      img.src = b.src;
      img.alt = b.alt || '';
      img.loading = 'lazy';
      img.onerror = function () {
        var miss = el('div', 'img-missing', 'Η εικόνα δεν είναι διαθέσιμη' + (b.alt ? ': ' + esc(b.alt) : '.'));
        if (img.parentNode) img.parentNode.replaceChild(miss, img);
      };
      if (b.maxWidth) img.style.maxWidth = b.maxWidth;
      fig.appendChild(img);
      if (b.caption) fig.appendChild(el('figcaption', '', b.caption));
      return fig;
    },

    table: function (b) {
      var wrap = el('div', 'table-wrap');
      var t = el('table', 'data-table');
      if (b.caption) t.appendChild(el('caption', '', b.caption));
      if (b.headers && b.headers.length) {
        var thead = el('thead', '');
        var tr = el('tr', '');
        b.headers.forEach(function (h) { tr.appendChild(el('th', '', h)); });
        thead.appendChild(tr);
        t.appendChild(thead);
      }
      var tbody = el('tbody', '');
      (b.rows || []).forEach(function (row) {
        var tr = el('tr', '');
        row.forEach(function (cell) { tr.appendChild(el('td', '', cell)); });
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      wrap.appendChild(t);
      return wrap;
    },

    accordion: function (b) {
      var acc = el('div', 'accordion');
      (b.items || []).forEach(function (it, i) {
        var item = el('div', 'acc-item');
        var head = el('button', 'acc-head');
        head.type = 'button';
        head.setAttribute('aria-expanded', 'false');
        head.innerHTML = '<span class="acc-num">' + (i + 1) + '</span><span>' + it.title + '</span><span class="acc-caret">' + icon('caretDown') + '</span>';
        var body = el('div', 'acc-body', it.html || '');
        head.addEventListener('click', function () {
          var open = item.classList.toggle('open');
          head.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        item.appendChild(head);
        item.appendChild(body);
        acc.appendChild(item);
      });
      return acc;
    },

    tabs: function (b) {
      var box = el('div', 'tabs');
      var list = el('div', 'tab-list');
      list.setAttribute('role', 'tablist');
      var panels = [];
      var buttons = [];
      (b.items || []).forEach(function (tItem, i) {
        var btn = el('button', 'tab-btn');
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        btn.innerHTML = tItem.title;
        var panel = el('div', 'tab-panel', tItem.html || '');
        panel.setAttribute('role', 'tabpanel');
        if (i !== 0) panel.hidden = true;
        btn.addEventListener('click', function () {
          buttons.forEach(function (bb, j) {
            bb.setAttribute('aria-selected', j === i ? 'true' : 'false');
            panels[j].hidden = j !== i;
          });
        });
        buttons.push(btn); panels.push(panel);
        list.appendChild(btn);
      });
      box.appendChild(list);
      panels.forEach(function (p) { box.appendChild(p); });
      return box;
    },

    flipcards: function (b) {
      var grid = el('div', 'flipcards');
      (b.items || []).forEach(function (c) {
        var flip = el('div', 'flip');
        var inner = el('div', 'flip-inner');
        inner.setAttribute('role', 'button');
        inner.tabIndex = 0;
        inner.setAttribute('aria-label', 'Κάρτα: ' + (c.frontLabel || '') + '. Πατήστε για αποκάλυψη.');
        var front = el('div', 'flip-face flip-front',
          (c.icon ? '<span style="width:30px;height:30px;display:inline-block">' + icon(c.icon) + '</span>' : '') +
          '<span>' + c.front + '</span><span class="flip-hint">Πατήστε για αποκάλυψη</span>');
        var back = el('div', 'flip-face flip-back', c.back || '');
        inner.appendChild(front); inner.appendChild(back);
        function toggle() { flip.classList.toggle('flipped'); }
        inner.addEventListener('click', toggle);
        inner.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
        flip.appendChild(inner);
        grid.appendChild(flip);
      });
      return grid;
    },

    timeline: function (b) {
      var tl = el('ol', 'timeline');
      (b.items || []).forEach(function (it) {
        var li = el('li', 'tl-item');
        if (it.label) li.appendChild(el('div', 'tl-label', esc(it.label)));
        if (it.title) li.appendChild(el('div', 'tl-title', it.title));
        li.appendChild(el('div', 'tl-body', it.html || ''));
        tl.appendChild(li);
      });
      return tl;
    },

    steps: function (b) {
      var wrap = el('div', 'steps');
      (b.items || []).forEach(function (s) {
        var step = el('div', 'step');
        step.appendChild(el('div', 'step-num'));
        var txt = el('div', 'step-text');
        if (s.title) txt.appendChild(el('div', 'step-title', s.title));
        txt.appendChild(el('div', 'step-body', s.html || ''));
        step.appendChild(txt);
        wrap.appendChild(step);
      });
      return wrap;
    },

    compare: function (b) {
      var grid = el('div', 'compare');
      var colA = el('div', 'compare-col a');
      colA.appendChild(el('div', 'cmp-head', b.left.title || ''));
      colA.appendChild(el('div', 'cmp-body', b.left.html || ''));
      var colB = el('div', 'compare-col b');
      colB.appendChild(el('div', 'cmp-head', b.right.title || ''));
      colB.appendChild(el('div', 'cmp-body', b.right.html || ''));
      grid.appendChild(colA); grid.appendChild(colB);
      return grid;
    },

    reveal: function (b) {
      var wrap = el('div', 'reveal-block');
      var btn = el('button', 'reveal-btn');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = icon('eye') + '<span>' + esc(b.label || 'Αποκάλυψη απάντησης') + '</span>';
      var content = el('div', 'reveal-content', b.html || '');
      btn.addEventListener('click', function () {
        var open = wrap.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      wrap.appendChild(btn); wrap.appendChild(content);
      return wrap;
    },

    hotspots: function (b) {
      var wrap = el('div', 'hotspot-wrap');
      var img = new Image();
      img.src = b.src; img.alt = b.alt || '';
      img.onerror = function () {
        var miss = el('div', 'img-missing', 'Η εικόνα δεν είναι διαθέσιμη.');
        wrap.innerHTML = ''; wrap.appendChild(miss);
      };
      wrap.appendChild(img);
      var openPop = null;
      (b.spots || []).forEach(function (s, i) {
        var hs = el('button', 'hotspot', String(i + 1));
        hs.type = 'button';
        hs.style.left = s.x + '%';
        hs.style.top = s.y + '%';
        hs.setAttribute('aria-label', s.title || ('Σημείο ' + (i + 1)));
        hs.addEventListener('click', function (e) {
          e.stopPropagation();
          if (openPop) { openPop.remove(); openPop = null; }
          var pop = el('div', 'hotspot-pop', '<b>' + esc(s.title || '') + '</b><br>' + (s.html || ''));
          pop.style.left = s.x + '%';
          pop.style.top = s.y + '%';
          wrap.appendChild(pop);
          openPop = pop;
        });
        wrap.appendChild(hs);
      });
      document.addEventListener('click', function () {
        if (openPop) { openPop.remove(); openPop = null; }
      });
      return wrap;
    },

    quote: function (b) {
      var q = el('blockquote', 'quote', b.html || '');
      if (b.cite) q.appendChild(el('span', 'quote-cite', '— ' + esc(b.cite)));
      return q;
    },

    resources: function (b) {
      var wrap = el('div', 'resources');
      (b.links || []).forEach(function (l) {
        var a = el('a', 'resource');
        a.href = l.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.innerHTML = '<span class="resource-icon">' + icon('link') + '</span>' +
          '<span><span class="resource-label">' + esc(l.label) + '</span>' +
          (l.desc ? '<br><span class="resource-desc">' + l.desc + '</span>' : '') + '</span>';
        wrap.appendChild(a);
      });
      return wrap;
    },

    references: function (b) {
      var wrap = el('div', 'references');
      wrap.appendChild(el('div', 'callout-title', icon('book') + '<span style="color:var(--blue)">' + esc(b.title || 'Βιβλιογραφία') + '</span>'));
      var list = el('ol', '');
      (b.items || []).forEach(function (r) { list.appendChild(el('li', '', r)); });
      wrap.appendChild(list);
      return wrap;
    }
  };

  function renderBlocks(blocks, container) {
    (blocks || []).forEach(function (b) {
      var fn = blockRenderers[b.type];
      if (!fn) {
        console.warn('Άγνωστος τύπος μπλοκ:', b.type);
        container.appendChild(el('div', 'blk', b.html || ''));
        return;
      }
      try {
        container.appendChild(fn(b));
      } catch (err) {
        console.error('Σφάλμα απόδοσης μπλοκ', b.type, err);
        container.appendChild(el('div', 'callout warn', 'Το στοιχείο δεν ήταν δυνατό να εμφανιστεί.'));
      }
    });
  }

  /* =====================================================================
     ΟΨΗ: ΣΕΛΙΔΑ ΕΠΙΛΟΓΗΣ ΕΝΟΤΗΤΑΣ (index.html)
     ===================================================================== */
  var slideArea = $('#slideArea');
  var controls = $('#controls');

  function renderLanding() {
    if (controls) controls.style.display = 'none';
    slideArea.innerHTML = '';
    var frame = el('div', 'slide-frame slide-enter');

    var hero = el('section', 'home-hero');
    hero.appendChild(el('h1', '', esc(DATA.title)));
    hero.appendChild(el('p', '', 'Καλώς ήρθατε στο διαδραστικό μάθημα. Επιλέξτε μια ενότητα για να ξεκινήσετε — κάθε ενότητα ανοίγει στη δική της σελίδα. Η πρόοδός σας αποθηκεύεται αυτόματα σε αυτόν τον υπολογιστή.'));
    var lastMod = lsGet(LS_LASTMOD, null);
    var lastPositions = lsGet(LS_LAST, {});
    if (lastMod) {
      var lm = DATA.modules.find(function (m) { return m.id === lastMod; });
      if (lm) {
        var resume = el('a', 'home-resume');
        resume.href = pageFor(lm);
        resume.innerHTML = icon('play') + '<span>Συνέχεια: Ενότητα ' + lm.number + ', διαφάνεια ' + ((lastPositions[lm.id] || 0) + 1) + '</span>';
        hero.appendChild(resume);
      }
    }
    frame.appendChild(hero);

    var grid = el('div', 'home-grid');
    DATA.modules.forEach(function (m) {
      var pct = m.slides.length ? Math.round(100 * visitedCount(m) / m.slides.length) : 0;
      var card = el('a', 'mod-card' + (isModuleDone(m) ? ' done-card' : ''));
      card.href = pageFor(m);
      card.setAttribute('aria-label', 'Ενότητα ' + m.number + ': ' + m.title + '. Πρόοδος ' + pct + '%.');
      var top = el('div', 'mod-card-top');
      top.appendChild(el('span', 'mod-card-icon mod-icon-' + (m.accent || 'blue'), icon(m.icon)));
      var tt = el('div', '');
      tt.appendChild(el('div', 'mod-card-num', 'Ενότητα ' + m.number));
      tt.appendChild(el('div', 'mod-card-title', esc(m.title)));
      top.appendChild(tt);
      card.appendChild(top);
      card.appendChild(el('div', 'mod-card-desc', esc(m.description || '')));
      var foot = el('div', 'mod-card-foot');
      var bar = el('div', 'mod-card-bar');
      var fill = el('div', 'mod-card-fill');
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      foot.appendChild(bar);
      foot.appendChild(el('span', '', pct + '% · ' + m.slides.length + ' διαφάνειες'));
      card.appendChild(foot);
      grid.appendChild(card);
    });
    frame.appendChild(grid);
    slideArea.appendChild(frame);
    document.title = DATA.title + ' — Διαδραστικό Μάθημα';
  }

  /* =====================================================================
     ΟΨΗ: ΔΙΑΦΑΝΕΙΑ ΕΝΟΤΗΤΑΣ (enotitaN.html)
     ===================================================================== */
  function renderSlide() {
    var idx = current.slide;
    var slide = mod.slides[idx];
    if (!slide) return;

    controls.style.display = '';
    slideArea.innerHTML = '';
    var frame = el('div', 'slide-frame slide-enter');
    if (slide.section) frame.appendChild(el('div', 'slide-kicker', esc(slide.section)));
    frame.appendChild(el('h1', 'slide-title', slide.title || ('Διαφάνεια ' + (idx + 1))));
    renderBlocks(slide.blocks, frame);
    slideArea.appendChild(frame);
    slideArea.scrollTop = 0;

    /* πρόοδος + μετρητής */
    $('#slideCounter').textContent = 'Διαφάνεια ' + (idx + 1) + ' από ' + mod.slides.length;
    var pct = Math.round(100 * (idx + 1) / mod.slides.length);
    $('#progressFill').style.width = pct + '%';
    $('#progressBar').setAttribute('aria-valuenow', pct);

    /* κουμπιά */
    var isLast = idx === mod.slides.length - 1;
    $('#prevBtn').disabled = idx === 0;
    $('#nextBtn').disabled = isLast && STANDALONE;
    $('#nextBtn').querySelector('.nav-btn-label').textContent =
      isLast ? (STANDALONE ? 'Τέλος ενότητας' : 'Ολοκλήρωση') : 'Επόμενο';

    /* καταγραφή επίσκεψης + θέσης */
    if (!visited[mod.id]) visited[mod.id] = [];
    if (!visited[mod.id][idx]) {
      visited[mod.id][idx] = true;
      lsSet(LS_VISITED, visited);
      refreshSidebarProgress();
    }
    var lastPositions = lsGet(LS_LAST, {});
    lastPositions[mod.id] = idx;
    lsSet(LS_LAST, lastPositions);
    lsSet(LS_LASTMOD, mod.id);
    document.title = slide.title + ' — Ενότητα ' + mod.number + ' — ' + DATA.title;
  }

  function goNext() {
    if (current.slide < mod.slides.length - 1) { go(current.slide + 1); }
    else if (!STANDALONE) { location.href = 'index.html'; } /* Ολοκλήρωση → αρχική */
  }
  function goPrev() {
    if (current.slide > 0) go(current.slide - 1);
  }

  /* =====================================================================
     ΠΛΑΪΝΟ ΜΕΝΟΥ (μόνο σε σελίδα ενότητας)
     ===================================================================== */
  var sidebar = $('#sidebar');
  var scrim = $('#scrim');

  function buildSidebar() {
    var inner = $('#sidebarInner');
    inner.innerHTML = '';

    if (!STANDALONE) {
      var homeBtn = el('a', 'side-home-btn', icon('home') + '<span>Αρχική σελίδα μαθήματος</span>');
      homeBtn.href = 'index.html';
      inner.appendChild(homeBtn);
    }

    var head = el('div', 'side-module open');
    head.dataset.mod = mod.id;
    head.innerHTML =
      '<div class="side-module-head" style="cursor:default">' +
      '<span class="side-mod-num">' + mod.number + '</span>' +
      '<span class="side-mod-txt"><span class="side-mod-title">' + esc(mod.title) + '</span>' +
      '<span class="side-mod-progress"></span></span>' +
      '<span class="side-mod-done" title="Η ενότητα ολοκληρώθηκε">' + icon('check') + '</span>' +
      '</div>';
    var list = el('ul', 'side-slides');
    var lastSection = null;
    mod.slides.forEach(function (s, i) {
      if (s.section && s.section !== lastSection) {
        lastSection = s.section;
        var li0 = el('li', '');
        li0.appendChild(el('div', 'side-section-label', esc(s.section)));
        list.appendChild(li0);
      }
      var li = el('li', '');
      var link = el('button', 'side-slide-link');
      link.type = 'button';
      link.dataset.idx = i;
      link.innerHTML = '<span class="side-slide-dot"></span><span>' + (i + 1) + '. ' + esc(s.title || 'Διαφάνεια') + '</span>';
      link.addEventListener('click', function () { go(i); closeSidebarOnMobile(); });
      li.appendChild(link);
      list.appendChild(li);
    });
    head.appendChild(list);
    inner.appendChild(head);
    refreshSidebarProgress();
  }

  function refreshSidebarProgress() {
    if (LANDING || !sidebar) return;
    var box = sidebar.querySelector('.side-module');
    if (!box) return;
    box.querySelector('.side-mod-progress').textContent = visitedCount(mod) + ' / ' + mod.slides.length + ' διαφάνειες';
    box.classList.toggle('done', isModuleDone(mod));
    var v = visited[mod.id] || [];
    box.querySelectorAll('.side-slide-link').forEach(function (link) {
      link.classList.toggle('visited', !!v[parseInt(link.dataset.idx, 10)]);
    });
  }

  function updateSidebarActive() {
    if (LANDING || !sidebar) return;
    sidebar.querySelectorAll('.side-slide-link.current').forEach(function (x) { x.classList.remove('current'); });
    var link = sidebar.querySelector('.side-slide-link[data-idx="' + current.slide + '"]');
    if (link) {
      link.classList.add('current');
      var r = link.getBoundingClientRect();
      var sr = sidebar.getBoundingClientRect();
      if (r.top < sr.top || r.bottom > sr.bottom) link.scrollIntoView({ block: 'center' });
    }
  }

  function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }
  function closeSidebarOnMobile() {
    if (isMobile()) setSidebar(false);
  }
  function setSidebar(show) {
    sidebar.classList.toggle('hidden', !show);
    var t = $('#menuToggle');
    if (t) t.setAttribute('aria-expanded', show ? 'true' : 'false');
    scrim.hidden = !show || !isMobile();
  }

  /* =====================================================================
     ΜΕΓΕΘΟΣ ΓΡΑΜΜΑΤΟΣΕΙΡΑΣ (A− / A+)
     Κλιμακώνει το root font-size — όλο το κείμενο είναι rem-based.
     Η προτίμηση αποθηκεύεται και ισχύει σε όλες τις σελίδες/επισκέψεις.
     ===================================================================== */
  function initFontControls() {
    var dec = $('#fontDec');
    var inc = $('#fontInc');
    var idx = FONT_LEVELS.indexOf(lsGet(LS_FONT, 100));
    if (idx === -1) idx = FONT_LEVELS.indexOf(100);

    function apply() {
      document.documentElement.style.fontSize = FONT_LEVELS[idx] + '%';
      lsSet(LS_FONT, FONT_LEVELS[idx]);
      if (dec) {
        dec.disabled = idx === 0;
        dec.setAttribute('aria-label', 'Μείωση μεγέθους γραμματοσειράς (τρέχον: ' + FONT_LEVELS[idx] + '%)');
      }
      if (inc) {
        inc.disabled = idx === FONT_LEVELS.length - 1;
        inc.setAttribute('aria-label', 'Αύξηση μεγέθους γραμματοσειράς (τρέχον: ' + FONT_LEVELS[idx] + '%)');
      }
    }
    if (dec) dec.addEventListener('click', function () { if (idx > 0) { idx--; apply(); } });
    if (inc) inc.addEventListener('click', function () { if (idx < FONT_LEVELS.length - 1) { idx++; apply(); } });
    apply();
  }

  /* =====================================================================
     ΕΚΚΙΝΗΣΗ
     ===================================================================== */
  function initLanding() {
    if (sidebar) sidebar.style.display = 'none';
    var t = $('#menuToggle');
    if (t) t.style.display = 'none';
    renderLanding();
  }

  function initModulePage() {
    if (!mod || !mod.slides.length) {
      slideArea.innerHTML = '<div class="callout warn"><div class="callout-title">Σφάλμα φόρτωσης</div>Δεν βρέθηκε περιεχόμενο ενότητας. Βεβαιωθείτε ότι τα αρχεία στον φάκελο data/ έχουν φορτωθεί σωστά.</div>';
      controls.style.display = 'none';
      return;
    }
    $('#brandModule').textContent = 'Ενότητα ' + mod.number + ': ' + mod.title;
    buildSidebar();

    $('#prevBtn').addEventListener('click', goPrev);
    $('#nextBtn').addEventListener('click', goNext);
    $('#homeBtn').addEventListener('click', function () {
      if (STANDALONE) go(0); /* αυτόνομο πακέτο: επιστροφή στην πρώτη διαφάνεια */
      else location.href = 'index.html';
    });
    $('#menuToggle').addEventListener('click', function () {
      setSidebar(sidebar.classList.contains('hidden'));
    });
    scrim.addEventListener('click', function () { setSidebar(false); });

    $('#fsBtn').addEventListener('click', function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () { /* δεν επιτρέπεται */ });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { goNext(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { goPrev(); }
      else if (e.key === 'Escape' && isMobile()) { setSidebar(false); }
    });

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('resize', function () {
      scrim.hidden = sidebar.classList.contains('hidden') || !isMobile();
    });

    if (isMobile()) setSidebar(false);

    /* Αρχική θέση: hash > αποθηκευμένη θέση > πρώτη διαφάνεια */
    if (parseHash() === null) {
      var lastPositions = lsGet(LS_LAST, {});
      var saved = lastPositions[mod.id];
      current.slide = (typeof saved === 'number') ? Math.min(saved, mod.slides.length - 1) : 0;
      location.hash = '#/' + (current.slide + 1);
    }
    onHashChange();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFontControls();
    if (LANDING) initLanding();
    else if (SINGLE) initModulePage();
    else console.error('Δεν ορίστηκε λειτουργία σελίδας (LANDING_MODE ή SINGLE_MODULE).');
  });
})();
