// solitaire.js — Klondike Solitaire for OzalpOS 98.
//
// Classic Windows rules and standard scoring: turn one or three cards from the stock, build
// the four foundations up by suit from Ace to King, and the seven tableau piles down in
// alternating colors. Only a King may fill an empty tableau pile.
//
// The 52 cards are persistent DOM elements absolutely positioned (with transforms) inside
// .sol-board. Every state change ends with render(), which works out where each card belongs
// and moves — optionally animates — whatever changed. Card size follows the board through CSS
// variables (--sol-cw, --sol-ch, ...); the same metrics drive a small canvas painter that is
// only used by the bouncing-cards win cascade.
//
// Testing hooks: OS.wm.open('solitaire', { demoWin: true }) plays straight into the win
// animation, and win.el.__sol exposes { debugWin, deal, undo, autoPlay, state }.

(function() {
  var RATIO = 96 / 71;            // classic card aspect ratio
  var MIN_CW = 40, MAX_CW = 80;   // card width limits in px
  var ANIM_MS = 180;              // card slide duration (keep in sync with solitaire.css)
  var RED = '#d00';
  var BACK_KEY = 'ozalpos.sol.back';
  var DRAW_KEY = 'ozalpos.sol.draw';

  // Suit glyphs as SVG paths in a 32x32 box, shared by the DOM cards and the canvas painter.
  // Multi-part suits are separate paths so overlapping pieces never cancel each other out.
  var SUITS = [
    { name: 'Spades', red: false, paths: [
      'M16 2C18 6.5 30 12.5 30 20c0 4.5-3.5 7-7 7-2.5 0-4.5-1.2-5.7-3 .3 2.5 1.3 4.8 3.7 6H11c2.4-1.2 3.4-3.5 3.7-6-1.2 1.8-3.2 3-5.7 3-3.5 0-7-2.5-7-7C2 12.5 14 6.5 16 2z'
    ] },
    { name: 'Hearts', red: true, paths: [
      'M16 29C14 26 2 19.5 2 10.5 2 6 5.5 3 9.5 3c3 0 5.3 2 6.5 4.5C17.2 5 19.5 3 22.5 3 26.5 3 30 6 30 10.5 30 19.5 18 26 16 29z'
    ] },
    { name: 'Clubs', red: false, paths: [
      'M9.6 9.2a6.4 6.4 0 1 1 12.8 0a6.4 6.4 0 1 1-12.8 0z',
      'M2.6 18.6a6.4 6.4 0 1 1 12.8 0a6.4 6.4 0 1 1-12.8 0z',
      'M16.6 18.6a6.4 6.4 0 1 1 12.8 0a6.4 6.4 0 1 1-12.8 0z',
      'M12.5 13h7v7h-7z',
      'M16 13l2.6 8c.3 4 1.3 7.3 3.6 9H9.8c2.3-1.7 3.3-5 3.6-9z'
    ] },
    { name: 'Diamonds', red: true, paths: [
      'M16 1.5L27 16 16 30.5 5 16z'
    ] }
  ];
  var SUIT_CHARS = 'SHCD';
  var RANKS = [null, 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  // Little headgear for the court cards, in a 32x20 box: J gets a feathered cap,
  // Q a tiara and K a proper crown.
  var CROWNS = {
    11: ['M3 18C3 10 9 5.5 17 5.5c6 0 10.5 3.5 12 8.5l-5-.5V18z', 'M18 6c2-4 6.5-5.5 11-4.5-3 1-6 3-8.5 5.5z'],
    12: ['M3 18C3 12 5 8.5 7 7.5c2 3 4 3.5 5 .5 1-3 2.5-5 4-6 1.5 1 3 3 4 6 1 3 3 2.5 5-.5 2 1 4 4.5 4 10.5z'],
    13: ['M3 18L2 5.5l7 5.5 7-9 7 9 7-5.5L29 18z', 'M3 15h26v3H3z']
  };

  // Pip layouts for 2–10 as [x, y] fractions of the card face. Pips below the middle are
  // drawn upside down, like real cards.
  var PL = 0.335, PC = 0.5, PR = 0.665;
  var PIPS = {
    2: [[PC, 0.2], [PC, 0.8]],
    3: [[PC, 0.2], [PC, 0.5], [PC, 0.8]],
    4: [[PL, 0.2], [PR, 0.2], [PL, 0.8], [PR, 0.8]],
    5: [[PL, 0.2], [PR, 0.2], [PC, 0.5], [PL, 0.8], [PR, 0.8]],
    6: [[PL, 0.2], [PR, 0.2], [PL, 0.5], [PR, 0.5], [PL, 0.8], [PR, 0.8]],
    7: [[PL, 0.2], [PR, 0.2], [PC, 0.35], [PL, 0.5], [PR, 0.5], [PL, 0.8], [PR, 0.8]],
    8: [[PL, 0.2], [PR, 0.2], [PC, 0.35], [PL, 0.5], [PR, 0.5], [PC, 0.65], [PL, 0.8], [PR, 0.8]],
    9: [[PL, 0.2], [PR, 0.2], [PL, 0.4], [PR, 0.4], [PC, 0.5], [PL, 0.6], [PR, 0.6], [PL, 0.8], [PR, 0.8]],
    10: [[PL, 0.2], [PR, 0.2], [PC, 0.3], [PL, 0.4], [PR, 0.4], [PL, 0.6], [PR, 0.6], [PC, 0.7], [PL, 0.8], [PR, 0.8]]
  };

  // Card backs (pure CSS, see solitaire.css). Each one nods to something Omar does.
  var BACKS = [
    { key: 'dive',   label: 'Deep Dive' },
    { key: 'duke',   label: 'Duke Blue' },
    { key: 'red',    label: 'Classic Red' },
    { key: 'sketch', label: 'Sketchbook' }
  ];

  function load(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function validBack(k) {
    return BACKS.some(function(b) { return b.key === k; }) ? k : 'dive';
  }
  function last(a) { return a[a.length - 1]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------------- Card markup ---------------- */

  function svgPaths(paths) {
    return paths.map(function(d) { return '<path d="' + d + '"/>'; }).join('');
  }
  function suitSVG(s) {
    return '<svg viewBox="0 0 32 32" aria-hidden="true">' + svgPaths(SUITS[s].paths) + '</svg>';
  }

  function cardHTML(id) {
    var suit = Math.floor(id / 13), rank = id % 13 + 1;
    var s = SUITS[suit];
    var pip = suitSVG(suit);
    var idx = '<b' + (rank === 10 ? ' class="sol-ten"' : '') + '>' + RANKS[rank] + '</b>' + pip;
    var mid;
    if (rank > 10) {
      mid = '<span class="sol-court"><svg class="sol-crown" viewBox="0 0 32 20" aria-hidden="true">' +
        svgPaths(CROWNS[rank]) + '</svg><b>' + RANKS[rank] + '</b>' + pip + '</span>';
    } else if (rank === 1) {
      mid = '<span class="sol-ace' + (suit === 0 ? ' sol-ace-big' : '') + '">' + pip + '</span>';
    } else {
      mid = '<span class="sol-pips">' + PIPS[rank].map(function(p) {
        return '<span class="sol-pip' + (p[1] > 0.5 ? ' sol-rot' : '') + '" style="left:' +
          (p[0] * 100).toFixed(1) + '%;top:' + Math.round(p[1] * 100) + '%">' + pip + '</span>';
      }).join('') + '</span><span class="sol-mid">' + pip + '</span>';
    }
    return '<div class="sol-card ' + (s.red ? 'sol-red' : 'sol-blk') + '" data-id="' + id + '">' +
      '<div class="sol-in">' +
        '<div class="sol-face"><span class="sol-idx">' + idx + '</span><span class="sol-idx sol-br">' + idx + '</span>' + mid + '</div>' +
        '<div class="sol-back"></div>' +
      '</div></div>';
  }

  var _deckHTML = null;
  function deckHTML() {
    if (!_deckHTML) {
      var out = [];
      for (var i = 0; i < 52; i++) out.push(cardHTML(i));
      _deckHTML = out.join('');
    }
    return _deckHTML;
  }

  /* ---------------- Canvas painter (win cascade only) ---------------- */

  var _path2d = {};
  function path2d(d) { return _path2d[d] || (_path2d[d] = new Path2D(d)); }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // Fill a 32-unit glyph (suit or crown) centred on (cx, cy) at the given pixel width.
  function drawGlyph(g, paths, cx, cy, size, boxH, flip, stroke) {
    var k = size / 32;
    g.save();
    g.translate(cx, cy);
    if (flip) g.rotate(Math.PI);
    g.scale(k, k);
    g.translate(-16, -(boxH || 32) / 2);
    paths.forEach(function(d) {
      g.fill(path2d(d));
      if (stroke) g.stroke(path2d(d));
    });
    g.restore();
  }

  // Mirrors the DOM card's geometry (see cardHTML and solitaire.css) closely enough that the
  // bouncing copies look like the cards that just left the foundations.
  function paintCard(card, M, dpr) {
    var cv = document.createElement('canvas');
    var w = M.cw, h = M.ch;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    var g = cv.getContext('2d');
    g.scale(dpr, dpr);
    var color = SUITS[card.suit].red ? RED : '#000';
    var paths = SUITS[card.suit].paths;

    roundRect(g, 0.5, 0.5, w - 1, h - 1, M.r);
    g.fillStyle = '#fff';
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = '#000';
    g.stroke();

    var fw = w - 2, fh = h - 2;   // face box inside the 1px border
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';

    // Corner indices: top-left, then the same rotated about the centre for bottom-right.
    for (var k = 0; k < 2; k++) {
      g.save();
      if (k) { g.translate(w, h); g.rotate(Math.PI); }
      var ix = 2 + M.fs * 0.6;
      g.font = 'bold ' + M.fs + 'px Arial, Helvetica, sans-serif';
      g.fillText(RANKS[card.rank], ix, 3 + M.fs * 0.85);
      drawGlyph(g, paths, ix, 4 + M.fs * 1.39, M.fs * 0.78);
      g.restore();
    }

    if (card.rank > 10) {
      var x0 = 1 + M.px, y0 = 1 + M.pt, pw = fw - 2 * M.px, ph = fh - 2 * M.pt;
      var grad = g.createLinearGradient(0, y0, 0, y0 + ph);
      grad.addColorStop(0, '#fffbea');
      grad.addColorStop(1, '#f3dc94');
      g.fillStyle = grad;
      g.fillRect(x0, y0, pw, ph);
      g.strokeStyle = color;
      g.strokeRect(x0 + 0.5, y0 + 0.5, pw - 1, ph - 1);
      g.strokeStyle = '#fff';
      g.strokeRect(x0 + 1.5, y0 + 1.5, pw - 3, ph - 3);
      var crH = M.cc * 0.625;
      var total = crH + 1 + M.cl + 1 + M.cs;
      var cx = x0 + pw / 2, y = y0 + (ph - total) / 2;
      g.fillStyle = '#e8b923';
      g.strokeStyle = '#5c4300';
      g.lineWidth = 1.3 * 32 / M.cc;
      drawGlyph(g, CROWNS[card.rank], cx, y + crH / 2, M.cc, 20, false, true);
      g.lineWidth = 1;
      y += crH + 1;
      g.fillStyle = color;
      g.font = 'bold ' + M.cl + 'px Georgia, "Times New Roman", serif';
      g.fillText(RANKS[card.rank], cx, y + M.cl * 0.85);
      y += M.cl + 1;
      drawGlyph(g, paths, cx, y + M.cs / 2, M.cs);
    } else if (card.rank === 1) {
      drawGlyph(g, paths, w / 2, h / 2, card.suit === 0 ? M.ace2 : M.ace);
    } else if (M.small) {
      drawGlyph(g, paths, w / 2, 1 + fh * 0.55, M.mid);
    } else {
      PIPS[card.rank].forEach(function(p) {
        drawGlyph(g, paths, 1 + p[0] * fw, 1 + p[1] * fh, M.pip, 32, p[1] > 0.5);
      });
    }
    return cv;
  }

  /* ---------------- Layout metrics ---------------- */

  function metrics(W, H) {
    var cw = Math.floor(W / 8.2);                            // 7 columns + 8 gaps of ~0.15 card
    var cwH = Math.floor((H - 20) / (2.45 * RATIO));          // leave room for two rows + a fan
    cw = clamp(Math.min(cw, cwH), MIN_CW, MAX_CW);
    var ch = Math.round(cw * RATIO);
    var gap = clamp(Math.floor((W - 7 * cw) / 8), 3, Math.round(cw * 0.45));
    var left = Math.max(0, Math.floor((W - 7 * cw - 6 * gap) / 2));
    var top = clamp(gap, 6, 14);
    var small = cw < 58;
    var fs = Math.max(11, Math.round(cw * 0.17));
    var M = {
      W: W, H: H, cw: cw, ch: ch, gap: gap, top: top, small: small, fs: fs,
      r: Math.max(3, Math.round(cw * 0.065)),
      tabY: top + ch + Math.max(8, Math.round(ch * 0.14)),
      bottom: Math.max(4, Math.round(gap / 2)),
      dUp: Math.round(Math.max(ch * 0.24, fs * 1.8 + 6)),
      dDown: Math.max(3, Math.round(ch * 0.07)),
      minUp: Math.max(6, Math.round(fs * 0.75)),
      dWaste: Math.max(Math.round(cw * 0.22), Math.round(fs * 1.2 + 4)),
      pip: Math.round(cw * 0.18),
      ace: Math.round(cw * (small ? 0.38 : 0.42)),
      ace2: Math.round(cw * (small ? 0.46 : 0.54)),
      mid: Math.round(cw * 0.38),
      px: Math.round(cw * 0.26),
      pt: Math.round(ch * (small ? 0.17 : 0.14)),
      colX: []
    };
    for (var i = 0; i < 7; i++) M.colX.push(left + i * (cw + gap));
    var pw = cw - 2 - 2 * M.px;
    M.cl = Math.round(pw * 0.72);                 // court letter size
    M.cc = Math.round(pw * (small ? 0.5 : 0.52)); // crown width
    M.cs = Math.max(6, Math.round(pw * 0.32));    // court suit size
    return M;
  }

  /* ---------------- One game per window ---------------- */

  function createGame(win, opts) {
    var root = win.body.querySelector('.sol');
    var board = root.querySelector('.sol-board');
    var fx = board.querySelector('.sol-fx');
    var scoreEl = root.querySelector('.sol-score');
    var timeEl = root.querySelector('.sol-time');
    var msgEl = root.querySelector('.sol-msg');

    var cards = [];
    for (var id = 0; id < 52; id++) {
      cards.push({
        id: id, suit: Math.floor(id / 13), rank: id % 13 + 1, up: false,
        el: board.querySelector('.sol-card[data-id="' + id + '"]'),
        x: null, y: null, z: 0, shownUp: false, anim: false, pile: null
      });
    }

    function makePile(kind, i) {
      return { kind: kind, i: i, cards: [], slot: board.querySelector('.sol-slot[data-pile="' + kind + i + '"]') };
    }
    var stock = makePile('stock', 0);
    var waste = makePile('waste', 0);
    var found = [0, 1, 2, 3].map(function(i) { return makePile('found', i); });
    var tab = [0, 1, 2, 3, 4, 5, 6].map(function(i) { return makePile('tab', i); });
    var piles = [stock, waste].concat(found, tab);

    var M = null;                       // current layout metrics
    var drawN = load(DRAW_KEY, '1') === '3' ? 3 : 1;
    var back = validBack(load(BACK_KEY, 'dive'));
    var score = 0, seconds = 0, clockTimer = null;
    var won = false, dealing = false, firstDeal = true;
    var wasteFan = 1;                   // how many waste cards are fanned (Draw Three)
    var undoStack = [];
    var gameId = 0;
    var timers = [];                    // deal steps and other one-shot timeouts
    var animTimer = null, autoTimer = null, animSeq = 0;
    var press = null, lastTap = null, lastPointerType = 'mouse';
    var cascade = null, rafId = 0;
    var deckWin = null;
    var destroyed = false;
    var relayoutRaf = 0, ro = null;

    board.setAttribute('data-sol-back', back);

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    /* ----- Status bar, score and clock ----- */

    function updateStatus() {
      scoreEl.textContent = 'Score: ' + score;
      timeEl.textContent = 'Time: ' + seconds;
    }
    function setMsg(text) { msgEl.textContent = text || ''; }
    function addScore(d) {
      score = Math.max(0, score + d);
      updateStatus();
    }
    function startClock() {
      if (clockTimer || won) return;
      clockTimer = setInterval(function() { seconds++; updateStatus(); }, 1000);
    }
    function stopClock() {
      clearInterval(clockTimer);
      clockTimer = null;
    }

    /* ----- Rendering ----- */

    // Vertical offsets for a tableau pile, squeezed when the pile would run off the board.
    function tabOffsets(p) {
      var n = p.cards.length, nd = 0, nu = 0, i;
      for (i = 0; i < n - 1; i++) { if (p.cards[i].up) nu++; else nd++; }
      var dd = M.dDown, du = M.dUp;
      var avail = M.H - M.tabY - M.bottom - M.ch;
      if (nd * dd + nu * du > avail) {
        if (nu) du = Math.max(M.minUp, Math.floor((avail - nd * dd) / nu));
        if (nd && nd * dd + nu * du > avail) dd = Math.max(2, Math.floor((avail - nu * du) / nd));
      }
      var offs = [], y = 0;
      for (i = 0; i < n; i++) {
        offs.push(y);
        y += p.cards[i].up ? du : dd;
      }
      return offs;
    }

    function cardPos(p, i, offs) {
      if (p.kind === 'stock') {
        // A hint of depth: every 8 cards underneath peek out 1px to the bottom-right.
        var d = Math.floor((p.cards.length - 1 - i) / 8);
        return [M.colX[0] + d, M.top + d];
      }
      if (p.kind === 'waste') {
        var n = p.cards.length;
        var fan = drawN === 3 ? Math.min(wasteFan, 3, n) : 1;
        return [M.colX[1] + Math.max(0, i - (n - fan)) * M.dWaste, M.top];
      }
      if (p.kind === 'found') return [M.colX[3 + p.i], M.top];
      return [M.colX[p.i], M.tabY + offs[i]];
    }

    function render(animate) {
      if (!M) return;
      var moved = false, flipped = false;
      piles.forEach(function(p) {
        var offs = p.kind === 'tab' ? tabOffsets(p) : null;
        p.cards.forEach(function(c, i) {
          var pos = cardPos(p, i, offs);
          c.pile = p;
          c.z = 10 + i;
          if (c.shownUp !== c.up) {
            c.el.classList.toggle('sol-up', c.up);
            if (c.up && animate && c.x != null) {
              c.el.classList.add('sol-flipping');
              flipped = true;
            }
            c.shownUp = c.up;
          }
          if (c.x !== pos[0] || c.y !== pos[1]) {
            if (animate && c.x != null) {
              // Fly above everything else until the slide finishes.
              c.el.classList.add('sol-anim');
              c.anim = true;
              c.el.style.zIndex = 3000 + (++animSeq);
              moved = true;
            }
            c.x = pos[0];
            c.y = pos[1];
            c.el.style.transform = 'translate(' + c.x + 'px,' + c.y + 'px)';
          }
          if (!c.anim) c.el.style.zIndex = c.z;
        });
      });
      stock.slot.classList.toggle('sol-none', !stock.cards.length && !waste.cards.length);
      if (moved || flipped) {
        clearTimeout(animTimer);
        animTimer = setTimeout(finishAnims, ANIM_MS + 40);
      }
    }

    // Snap any in-flight slides to their destination and restore normal stacking.
    function finishAnims() {
      clearTimeout(animTimer);
      animTimer = null;
      cards.forEach(function(c) {
        if (c.anim) {
          c.anim = false;
          c.el.classList.remove('sol-anim');
          c.el.style.zIndex = c.z;
        }
        c.el.classList.remove('sol-flipping');
      });
    }

    function relayout() {
      relayoutRaf = 0;
      if (destroyed) return;
      var W = board.clientWidth, H = board.clientHeight;
      if (!W || !H) return;                        // minimized
      if (M && M.W === W && M.H === H) return;
      // The trail canvas can't survive a resize: wrap up the win and wipe it.
      if (cascade) endCascade();
      clearFx();
      cancelPress();
      finishAnims();
      M = metrics(W, H);
      var vars = { cw: M.cw, ch: M.ch, fs: M.fs, r: M.r, pip: M.pip, ace: M.ace, ace2: M.ace2,
        mid: M.mid, px: M.px, pt: M.pt, cl: M.cl, cc: M.cc, cs: M.cs };
      Object.keys(vars).forEach(function(k) { board.style.setProperty('--sol-' + k, vars[k] + 'px'); });
      board.classList.toggle('sol-small', M.small);
      piles.forEach(function(p) {
        if (!p.slot) return;
        var x = p.kind === 'found' ? M.colX[3 + p.i] : M.colX[p.i];
        var y = p.kind === 'tab' ? M.tabY : M.top;
        p.slot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      cards.forEach(function(c) { c.x = c.y = null; });   // force every card to re-place
      render(false);
    }
    function scheduleRelayout() {
      if (!relayoutRaf && !destroyed) relayoutRaf = requestAnimationFrame(relayout);
    }

    /* ----- Rules ----- */

    function isRed(c) { return SUITS[c.suit].red; }

    function isRun(list) {
      for (var i = 0; i < list.length; i++) {
        if (!list[i].up) return false;
        if (i && (isRed(list[i]) === isRed(list[i - 1]) || list[i].rank !== list[i - 1].rank - 1)) return false;
      }
      return true;
    }

    function canDrop(target, moving) {
      var c = moving[0], top = last(target.cards);
      if (target.kind === 'found') {
        if (moving.length !== 1) return false;
        return top ? top.suit === c.suit && top.rank === c.rank - 1 : c.rank === 1;
      }
      if (target.kind === 'tab') {
        return top ? top.up && isRed(top) !== isRed(c) && top.rank === c.rank + 1 : c.rank === 13;
      }
      return false;
    }

    /* ----- Undo ----- */

    function snapshot() {
      return {
        piles: piles.map(function(p) { return p.cards.map(function(c) { return c.id * 2 + (c.up ? 1 : 0); }); }),
        score: score,
        fan: wasteFan
      };
    }
    function pushUndo() {
      undoStack.push(snapshot());
      if (undoStack.length > 1000) undoStack.shift();
    }
    function undo() {
      if (!undoStack.length || dealing || won || cascade) return;
      cancelPress();
      stopAuto();
      var s = undoStack.pop();
      piles.forEach(function(p, i) {
        p.cards = s.piles[i].map(function(v) {
          var c = cards[v >> 1];
          c.up = !!(v & 1);
          return c;
        });
      });
      score = s.score;
      wasteFan = s.fan;
      updateStatus();
      OS.sound.play('card');
      render(true);
    }

    /* ----- Moves ----- */

    function clickStock() {
      if (stock.cards.length) {
        pushUndo();
        var n = Math.min(drawN, stock.cards.length);
        for (var i = 0; i < n; i++) {
          var c = stock.cards.pop();
          c.up = true;
          waste.cards.push(c);
        }
        wasteFan = n;
        OS.sound.play('flip');
      } else if (waste.cards.length) {
        // Turn the waste back over: its first card becomes the top of the stock again.
        pushUndo();
        while (waste.cards.length) {
          var w = waste.cards.pop();
          w.up = false;
          stock.cards.push(w);
        }
        wasteFan = 1;
        if (drawN === 1) addScore(-100);
        OS.sound.play('shuffle');
      } else {
        return;
      }
      startClock();
      render(true);
    }

    function flipTop(p) {
      pushUndo();
      last(p.cards).up = true;
      addScore(5);
      startClock();
      OS.sound.play('flip');
      render(true);
    }

    function moveCards(from, idx, to) {
      pushUndo();
      var moving = from.cards.splice(idx);
      Array.prototype.push.apply(to.cards, moving);
      if (from.kind === 'waste') {
        wasteFan = Math.max(1, wasteFan - 1);
        if (to.kind === 'tab') addScore(5);
        else if (to.kind === 'found') addScore(10);
      } else if (from.kind === 'tab' && to.kind === 'found') {
        addScore(10);
      } else if (from.kind === 'found' && to.kind === 'tab') {
        addScore(-15);
      }
      startClock();
      OS.sound.play('card');
      render(true);
      if (to.kind === 'found') checkWin();
    }

    // Send a top card to the foundation that accepts it (double-click / right-click play).
    function sendHome(card) {
      var p = card.pile;
      if (!p || !card.up || last(p.cards) !== card || (p.kind !== 'waste' && p.kind !== 'tab')) return false;
      for (var i = 0; i < 4; i++) {
        if (canDrop(found[i], [card])) {
          moveCards(p, p.cards.length - 1, found[i]);
          return true;
        }
      }
      return false;
    }

    // Classic right-click: play everything that can go up, one card at a time.
    function autoPlay() {
      if (dealing || won || cascade || destroyed) return;
      stopAuto();
      (function step() {
        autoTimer = null;
        if (destroyed || won || dealing) return;
        var tops = [last(waste.cards)].concat(tab.map(function(t) { return last(t.cards); }));
        for (var i = 0; i < tops.length; i++) {
          if (tops[i] && sendHome(tops[i])) {
            autoTimer = setTimeout(step, 110);
            return;
          }
        }
      })();
    }
    function stopAuto() {
      clearTimeout(autoTimer);
      autoTimer = null;
    }

    function checkWin() {
      if (won || !found.every(function(f) { return f.cards.length === 13; })) return;
      won = true;
      stopClock();
      stopAuto();
      undoStack = [];
      setMsg('You won!');
      later(function() {
        OS.sound.play('tada');
        startCascade();
      }, ANIM_MS + 140);
    }

    /* ----- Dealing ----- */

    function resetGame() {
      clearTimers();
      stopAuto();
      stopCascade();
      clearFx();
      cancelPress();
      finishAnims();
      gameId++;
      stopClock();
      seconds = 0;
      score = 0;
      won = false;
      dealing = false;
      undoStack = [];
      wasteFan = 1;
      lastTap = null;
      piles.forEach(function(p) { p.cards = []; });
      setMsg('');
      updateStatus();
    }

    function newGame() {
      if (destroyed) return;
      resetGame();
      var deck = cards.slice();
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
      deck.forEach(function(c) { c.up = false; stock.cards.push(c); });
      // Gather the old game into the stock (instantly the first time), then deal row by row
      // like a person would: one card to each pile, the first of each row face up.
      render(!firstDeal);
      var delay = firstDeal ? 60 : ANIM_MS + 80;
      firstDeal = false;
      var steps = [];
      for (var r = 0; r < 7; r++) {
        for (var col = r; col < 7; col++) steps.push({ col: col, up: col === r });
      }
      dealing = true;
      OS.sound.play('shuffle');
      var k = 0;
      function step() {
        if (k >= steps.length) { dealing = false; return; }
        var c = stock.cards.pop();
        c.up = steps[k].up;
        tab[steps[k].col].cards.push(c);
        k++;
        render(true);
        later(step, 26);
      }
      later(step, delay);
    }

    // Test helper: lay out a game one move from victory, then auto-play into the win.
    function debugWin() {
      if (destroyed) return;
      resetGame();
      cards.forEach(function(c) {
        c.up = true;
        if (c.rank === 13) tab[c.suit].cards.push(c);
      });
      for (var r = 1; r <= 12; r++) {
        for (var s = 0; s < 4; s++) found[s].cards.push(cards[s * 13 + r - 1]);
      }
      firstDeal = false;
      render(true);
      later(autoPlay, ANIM_MS + 220);
    }

    /* ----- Pointer interaction ----- */

    function pileOfSlot(el) {
      for (var i = 0; i < piles.length; i++) if (piles[i].slot === el) return piles[i];
      return null;
    }

    function onDown(e) {
      if (destroyed) return;
      lastPointerType = e.pointerType || 'mouse';
      if (cascade) { e.preventDefault(); endCascade(); return; }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (press) return;                       // ignore a second finger mid-drag
      e.preventDefault();
      // preventDefault() also skips the usual focus change, so take focus from other windows' fields.
      if (document.activeElement !== board) board.focus({ preventScroll: true });
      if (dealing || won || !M) return;
      stopAuto();
      finishAnims();
      var cardEl = e.target.closest('.sol-card');
      var card = cardEl ? cards[+cardEl.getAttribute('data-id')] : null;
      var slotEl = card ? null : e.target.closest('.sol-slot');
      var p = card ? card.pile : slotEl ? pileOfSlot(slotEl) : null;
      if (!p) return;
      if (p === stock) { clickStock(); return; }
      if (!card) return;
      var idx = p.cards.indexOf(card);
      var isTop = idx === p.cards.length - 1;
      if (!card.up) {
        if (p.kind === 'tab' && isTop) flipTop(p);
        return;
      }
      if (!isTop && p.kind !== 'tab') return;
      var moving = p.cards.slice(idx);
      if (!isRun(moving)) return;
      press = {
        id: e.pointerId, pile: p, idx: idx, cards: moving,
        sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, drag: false,
        slop: e.pointerType === 'mouse' ? 4 : 8
      };
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
    }

    function onMove(e) {
      if (!press || e.pointerId !== press.id) return;
      var dx = Math.round(e.clientX - press.sx), dy = Math.round(e.clientY - press.sy);
      if (!press.drag) {
        if (Math.abs(dx) < press.slop && Math.abs(dy) < press.slop) return;
        press.drag = true;
        lastTap = null;
        // Lift the stack into the floating layer above everything else on the board.
        press.cards.forEach(function(c, i) {
          c.el.classList.add('sol-lift');
          c.el.style.zIndex = 5000 + i;
        });
      }
      press.dx = dx;
      press.dy = dy;
      press.cards.forEach(function(c) {
        c.el.style.transform = 'translate(' + (c.x + dx) + 'px,' + (c.y + dy) + 'px)';
      });
    }

    function onUp(e) {
      if (!press || e.pointerId !== press.id) return;
      var p = press;
      press = null;
      try { board.releasePointerCapture(e.pointerId); } catch (err) {}
      if (p.drag) { drop(p); return; }
      // Two quick clicks (or taps) on the same face-up card send it to a foundation.
      var card = p.cards[0], now = Date.now();
      if (lastTap && lastTap.id === card.id && now - lastTap.t < 450 &&
          Math.abs(e.clientX - lastTap.x) < 14 && Math.abs(e.clientY - lastTap.y) < 14) {
        lastTap = null;
        sendHome(card);
      } else {
        lastTap = { id: card.id, t: now, x: e.clientX, y: e.clientY };
      }
    }

    function onCancel(e) {
      if (!press || e.pointerId !== press.id) return;
      cancelPress();
      render(true);
    }

    // Drop a dragged stack where it overlaps a legal pile the most; otherwise it slides home.
    function drop(p) {
      var lead = p.cards[0];
      var rect = { x: lead.x + p.dx, y: lead.y + p.dy, w: M.cw, h: M.ch };
      var best = null, bestArea = 0;
      found.concat(tab).forEach(function(t) {
        if (t === p.pile || !canDrop(t, p.cards)) return;
        var a = overlap(rect, targetRect(t));
        if (a > bestArea) { bestArea = a; best = t; }
      });
      liftDown(p);
      if (best) moveCards(p.pile, p.idx, best);
      else render(true);
    }

    // Record where a dragged stack sits so render() animates from there.
    function liftDown(p) {
      p.cards.forEach(function(c) {
        c.x += p.dx;
        c.y += p.dy;
        c.el.classList.remove('sol-lift');
      });
    }

    function cancelPress() {
      if (!press) return;
      var p = press;
      press = null;
      try { board.releasePointerCapture(p.id); } catch (err) {}
      if (p.drag) liftDown(p);
    }

    function targetRect(t) {
      if (t.kind === 'found') return { x: M.colX[3 + t.i], y: M.top, w: M.cw, h: M.ch };
      var top = last(t.cards);
      var bottom = top ? top.y + M.ch : M.tabY + M.ch;
      // The whole column, plus a little slack below its last card.
      return { x: M.colX[t.i], y: M.tabY, w: M.cw, h: bottom - M.tabY + Math.round(M.ch * 0.5) };
    }

    function overlap(a, b) {
      var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      var h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      return w > 0 && h > 0 ? w * h : 0;
    }

    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onCancel);
    board.addEventListener('lostpointercapture', onCancel);
    board.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      // Long-presses on touch screens also fire contextmenu; only mice auto-play.
      if (lastPointerType === 'mouse' && !press) autoPlay();
    });

    /* ----- Win cascade ----- */

    var STEP = 1000 / 60;

    function startCascade() {
      if (destroyed || !M || cascade) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = M.W, H = M.H;
      fx.width = Math.round(W * dpr);
      fx.height = Math.round(H * dpr);
      fx.hidden = false;
      var ctx = fx.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Kings leave first, cycling through the foundations, then queens, and so on.
      var queue = [];
      for (var r = 12; r >= 0; r--) {
        for (var f = 0; f < 4; f++) if (found[f].cards[r]) queue.push(found[f].cards[r]);
      }
      cascade = { ctx: ctx, dpr: dpr, queue: queue, cur: null, imgs: {}, last: performance.now(), acc: 0 };
      setMsg('You won! Click or press any key to skip.');
      rafId = requestAnimationFrame(frame);
    }

    function frame(now) {
      rafId = 0;
      var cs = cascade;
      if (!cs || destroyed) return;
      cs.acc += Math.min(now - cs.last, 100);
      cs.last = now;
      // Fixed 60 Hz physics steps, each stamping the card once, so trails look the same on any display.
      while (cs.acc >= STEP) {
        cs.acc -= STEP;
        if (!stepCascade(cs)) { endCascade(); return; }
      }
      rafId = requestAnimationFrame(frame);
    }

    function stepCascade(cs) {
      var s = M.ch / 96;
      if (!cs.cur) {
        var c = cs.queue.shift();
        if (!c) return false;
        c.el.classList.add('sol-gone');
        cs.cur = {
          img: cs.imgs[c.id] || (cs.imgs[c.id] = paintCard(c, M, cs.dpr)),
          x: c.x, y: c.y,
          vx: (3 + Math.random() * 5.5) * s * (Math.random() < 0.5 ? -1 : 1),
          vy: -(1 + Math.random() * 7) * s
        };
      }
      var p = cs.cur;
      p.vy += 0.45 * s;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y + M.ch > M.H) {
        p.y = M.H - M.ch;
        p.vy = -p.vy * 0.8;
      }
      cs.ctx.drawImage(p.img, Math.round(p.x), Math.round(p.y), M.cw, M.ch);
      if (p.x + M.cw < 0 || p.x > M.W) cs.cur = null;
      return true;
    }

    // Finished (or skipped by a click or key): keep the trails up and offer another game.
    function endCascade() {
      if (!cascade) return;
      stopCascade();
      setMsg('You won!');
      var id = gameId;
      OS.alert({ title: 'Solitaire', message: 'You won! Deal again?', icon: 'question', buttons: ['Yes', 'No'] })
        .then(function(answer) {
          if (destroyed || id !== gameId) return;
          if (answer === 'Yes') newGame();
          else clearFx();
        });
    }

    function stopCascade() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      cascade = null;
    }

    function clearFx() {
      if (!fx.hidden) {
        var ctx = fx.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, fx.width, fx.height);
        fx.hidden = true;
      }
      cards.forEach(function(c) { c.el.classList.remove('sol-gone'); });
    }

    /* ----- Keyboard ----- */

    function onKey(e) {
      if (destroyed || !win.isActive()) return;
      if (cascade) { e.preventDefault(); endCascade(); return; }
      if (e.key === 'F2') {
        e.preventDefault();
        newGame();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
      }
    }
    document.addEventListener('keydown', onKey);

    /* ----- Options ----- */

    function setDraw(n) {
      drawN = n;
      save(DRAW_KEY, String(n));
      render(true);
    }

    function setBack(k) {
      back = validBack(k);
      save(BACK_KEY, back);
      board.setAttribute('data-sol-back', back);
    }

    // Game > Deck...: the classic picker, with a live preview of each back.
    function openDeck() {
      if (deckWin) { deckWin.focus(); return; }
      var sel = back;
      OS.wm.openWindow({
        title: 'Select Card Back',
        width: 336,
        height: 'auto',
        resizable: false,
        minimizable: false,
        modal: true,
        taskbar: false,
        className: 'dialog sol-deck-dialog',
        render: function() {
          return '<div class="sol-deck-label">Select a card back:</div>' +
            '<div class="sol-deck-grid" role="listbox" aria-label="Card backs">' + BACKS.map(function(b) {
              return '<button class="sol-deck-opt" role="option" data-k="' + b.key + '">' +
                '<span class="sol-deck-card" data-sol-back="' + b.key + '"><span class="sol-back"></span></span>' +
                '<span class="sol-deck-name">' + OS.esc(b.label) + '</span></button>';
            }).join('') + '</div>' +
            '<div class="dialog-buttons"><button class="btn default" data-act="ok">OK</button>' +
            '<button class="btn" data-act="cancel">Cancel</button></div>';
        },
        onMount: function(dw) {
          deckWin = dw;
          var options = dw.body.querySelectorAll('.sol-deck-opt');
          var okBtn = dw.body.querySelector('[data-act="ok"]');
          function mark() {
            options.forEach(function(o) {
              var on = o.getAttribute('data-k') === sel;
              o.classList.toggle('sel', on);
              o.setAttribute('aria-selected', on ? 'true' : 'false');
            });
          }
          function apply() {
            setBack(sel);
            OS.sound.play('card');
            dw.close();
          }
          options.forEach(function(o) {
            o.addEventListener('click', function() { sel = o.getAttribute('data-k'); mark(); });
            o.addEventListener('dblclick', function() { sel = o.getAttribute('data-k'); apply(); });
          });
          okBtn.addEventListener('click', apply);
          dw.body.querySelector('[data-act="cancel"]').addEventListener('click', function() { dw.close(); });
          dw.el.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') { e.stopPropagation(); dw.close(); }
          });
          dw.onClose(function() { deckWin = null; });
          mark();
          setTimeout(function() { okBtn.focus(); }, 0);
        }
      }, {}, null);
    }

    function howToPlay() {
      OS.alert({
        title: 'How to Play Solitaire',
        icon: 'info',
        width: 380,
        message:
          'Goal: move all 52 cards onto the four foundations (top right), building each one up by suit from Ace to King.\n\n' +
          'On the seven tableau piles, build down in alternating colors (red on black, black on red). Only a King can fill an empty pile.\n\n' +
          'Click the deck to turn cards. Drag a card, or a face-up run, to move it. Click a face-down card to turn it over. ' +
          'Double-click a card to send it to a foundation; right-click to play everything that fits.\n\n' +
          'F2 deals a new game. Ctrl+Z undoes your last move.'
      });
    }

    function about() {
      OS.alert({
        title: 'About Solitaire',
        icon: 'solitaire',
        width: 360,
        message:
          'Solitaire for OzalpOS 98\nVersion 98.0\n\n' +
          'Shuffled and dealt by Omar Ozalp: diver, wrestler, track athlete, Duke student and sketcher. ' +
          'Game > Deck... has card backs for the diver, the Duke student and the sketcher.\n\n' +
          'Standard scoring. No productivity was harmed.'
      });
    }

    win.setMenu([
      { label: 'Game', items: function() {
        return [
          { label: 'Deal', shortcut: 'F2', onClick: newGame },
          '-',
          { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !undoStack.length || dealing || won, onClick: undo },
          '-',
          { label: 'Draw One', checked: drawN === 1, onClick: function() { setDraw(1); } },
          { label: 'Draw Three', checked: drawN === 3, onClick: function() { setDraw(3); } },
          { label: 'Deck...', onClick: openDeck },
          '-',
          { label: 'Exit', onClick: function() { win.close(); } }
        ];
      } },
      { label: 'Help', items: [
        { label: 'How to Play', onClick: howToPlay },
        '-',
        { label: 'About Solitaire', onClick: about }
      ] }
    ]);

    /* ----- Resize and cleanup ----- */

    win.onResize(scheduleRelayout);
    if (window.ResizeObserver) {
      ro = new ResizeObserver(scheduleRelayout);
      ro.observe(board);
    }

    win.onClose(function() {
      destroyed = true;
      clearTimers();
      clearTimeout(animTimer);
      stopAuto();
      stopClock();
      stopCascade();
      if (relayoutRaf) cancelAnimationFrame(relayoutRaf);
      if (ro) ro.disconnect();
      document.removeEventListener('keydown', onKey);
      if (deckWin) deckWin.close();
    });

    win.el.__sol = {
      debugWin: debugWin,
      deal: newGame,
      undo: undo,
      autoPlay: autoPlay,
      // Plain snapshot for tests: '#' marks a face-down card, e.g. '#10H'.
      state: function() {
        function label(c) { return (c.up ? '' : '#') + RANKS[c.rank] + SUIT_CHARS[c.suit]; }
        return {
          stock: stock.cards.length,
          waste: waste.cards.map(label),
          found: found.map(function(f) { return f.cards.map(label); }),
          tab: tab.map(function(t) { return t.cards.map(label); }),
          score: score, time: seconds, draw: drawN, back: back,
          won: won, dealing: dealing, cascading: !!cascade, undo: undoStack.length,
          cw: M ? M.cw : 0
        };
      }
    };

    relayout();
    if (opts.demoWin) debugWin();
    else newGame();
  }

  OS.registerApp('solitaire', {
    title: 'Solitaire',
    icon: 'solitaire',
    width: 620,
    height: 480,
    minWidth: 380,
    minHeight: 300,
    resizable: true,
    bodyClass: 'sol-body',
    render: function() {
      var slots = '<div class="sol-slot sol-slot-stock" data-pile="stock0"></div>';
      for (var f = 0; f < 4; f++) slots += '<div class="sol-slot sol-slot-found" data-pile="found' + f + '"></div>';
      for (var t = 0; t < 7; t++) slots += '<div class="sol-slot sol-slot-tab" data-pile="tab' + t + '"></div>';
      return '<div class="sol">' +
        '<div class="sol-board" role="application" aria-label="Solitaire table" tabindex="-1">' +
          slots +
          '<div class="sol-cards">' + deckHTML() + '</div>' +
          '<canvas class="sol-fx" hidden></canvas>' +
        '</div>' +
        '<div class="statusbar sol-status">' +
          '<div class="status-field sol-msg"></div>' +
          '<div class="status-field sol-score">Score: 0</div>' +
          '<div class="status-field sol-time">Time: 0</div>' +
        '</div>' +
      '</div>';
    },
    onMount: function(win, opts) { createGame(win, opts || {}); },
    onReopen: function(win, opts) {
      if (opts && opts.demoWin && win.el.__sol) win.el.__sol.debugWin();
    }
  });
})();
