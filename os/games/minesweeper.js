// minesweeper.js — Minesweeper for OzalpOS 98, faithful to the Windows 98 original:
// safe first click, flood-fill reveals, right-click flags (and ? marks), chording,
// red LED counters and the smiley. On touch: tap reveals, long-press flags, plus a
// Flag mode toggle. Sprites are pixel art drawn as SVG and handed to the CSS as variables.

(function() {
  var LEVELS = {
    beginner:     { label: 'Beginner',     cols: 9,  rows: 9,  mines: 10 },
    intermediate: { label: 'Intermediate', cols: 16, rows: 16, mines: 40 },
    expert:       { label: 'Expert',       cols: 30, rows: 16, mines: 99 }
  };
  var ORDER = ['beginner', 'intermediate', 'expert'];
  var K_LEVEL = 'ozalpos.mines.level', K_BEST = 'ozalpos.mines.best',
      K_MARKS = 'ozalpos.mines.marks', K_NAME = 'ozalpos.player';
  var LONG_PRESS = 400;

  /* ---------------- Storage ---------------- */
  function getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setItem(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function loadBest() {
    var b = {};
    try { b = JSON.parse(getItem(K_BEST)) || {}; } catch (e) { b = {}; }
    ORDER.forEach(function(k) {
      var v = b[k];
      if (!v || typeof v.time !== 'number' || v.time < 1) b[k] = { time: 999, name: 'Anonymous' };
      else b[k] = { time: Math.min(999, Math.floor(v.time)), name: String(v.name || 'Anonymous').slice(0, 24) };
    });
    return b;
  }

  /* ---------------- Pixel art ---------------- */
  // rows: strings where each character maps to a colour in `colors`; anything else is transparent.
  function pixels(rows, colors, ox, oy) {
    var paths = {}, order = [];
    for (var y = 0; y < rows.length; y++) {
      var row = rows[y], x = 0;
      while (x < row.length) {
        var ch = row.charAt(x);
        if (!colors[ch]) { x++; continue; }
        var start = x;
        while (x < row.length && row.charAt(x) === ch) x++;
        if (!(ch in paths)) { paths[ch] = ''; order.push(ch); }
        paths[ch] += 'M' + (start + (ox || 0)) + ' ' + (y + (oy || 0)) + 'h' + (x - start) + 'v1h' + (start - x) + 'z';
      }
    }
    return order.map(function(ch) { return '<path fill="' + colors[ch] + '" d="' + paths[ch] + '"/>'; }).join('');
  }
  function svg(w, h, body, cls) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges"' +
      (cls ? ' class="' + cls + '" aria-hidden="true"' : '') + '>' + body + '</svg>';
  }
  function cssUrl(markup) { return 'url("data:image/svg+xml,' + encodeURIComponent(markup) + '")'; }

  var MINE = [
    '......#......',
    '......#......',
    '..#.#####.#..',
    '...#######...',
    '..##ww#####..',
    '..##ww#####..',
    '#############',
    '..#########..',
    '..#########..',
    '...#######...',
    '..#.#####.#..',
    '......#......',
    '......#......'
  ];
  var FLAG = [
    '......rr#',
    '....rrrr#',
    '...rrrrr#',
    '....rrrr#',
    '......rr#',
    '........#',
    '........#',
    '......#####',
    '....#########',
    '....#########'
  ];
  var QUESTION = [
    '.....#####',
    '....##...##',
    '.........##',
    '........##',
    '.......##',
    '.......##',
    '',
    '.......##',
    '.......##'
  ];
  // Bold classic numerals, 9x10, drawn at (4,3) inside the 16px cell.
  var DIGITS = {
    1: ['...###...', '..####...', '.#####...', '...###...', '...###...', '...###...', '...###...', '...###...', '.#######.', '.#######.'],
    2: ['.#######.', '#########', '###...###', '.....####', '...#####.', '.#####...', '####.....', '###......', '#########', '#########'],
    3: ['########.', '#########', '......###', '......###', '..######.', '..######.', '......###', '......###', '#########', '########.'],
    4: ['###...###', '###...###', '###...###', '###...###', '#########', '#########', '......###', '......###', '......###', '......###'],
    5: ['#########', '#########', '###......', '###......', '########.', '#########', '......###', '......###', '#########', '########.'],
    6: ['.########', '#########', '###......', '###......', '########.', '#########', '###...###', '###...###', '#########', '.#######.'],
    7: ['#########', '#########', '......###', '......###', '.....###.', '....###..', '...###...', '...###...', '...###...', '...###...'],
    8: ['.#######.', '#########', '###...###', '###...###', '.#######.', '#########', '###...###', '###...###', '#########', '.#######.']
  };
  var NUM_COLORS = { 1: '#0000ff', 2: '#008000', 3: '#ff0000', 4: '#000080', 5: '#800000', 6: '#008080', 7: '#000000', 8: '#808080' };

  function crossRows() {
    var rows = [];
    for (var y = 0; y < 16; y++) {
      var r = '';
      for (var x = 0; x < 16; x++) {
        var on = x >= 2 && x <= 13 && y >= 2 && y <= 13 && (x - y === 0 || x - y === 1 || x + y === 15 || x + y === 16);
        r += on ? 'x' : '.';
      }
      rows.push(r);
    }
    return rows;
  }

  var MINE_PX = pixels(MINE, { '#': '#000', w: '#fff' }, 2, 2);
  var SPRITES = {
    mine: svg(16, 16, MINE_PX),
    wrong: svg(16, 16, MINE_PX + pixels(crossRows(), { x: '#f00' })),
    flag: svg(16, 16, pixels(FLAG, { r: '#f00', '#': '#000' }, 0, 3)),
    q: svg(16, 16, pixels(QUESTION, { '#': '#000' }, 0, 3))
  };
  for (var n = 1; n <= 8; n++) SPRITES['n' + n] = svg(16, 16, pixels(DIGITS[n], { '#': NUM_COLORS[n] }, 4, 3));

  // The smiley, 17x17: a pixel-round yellow face plus one of four expressions.
  var FACE_BASE = pixels([
    '......#####',
    '....##yyyyy##',
    '...#yyyyyyyyy#',
    '..#yyyyyyyyyyy#',
    '.#yyyyyyyyyyyyy#',
    '.#yyyyyyyyyyyyy#',
    '#yyyyyyyyyyyyyyy#',
    '#yyyyyyyyyyyyyyy#',
    '#yyyyyyyyyyyyyyy#',
    '#yyyyyyyyyyyyyyy#',
    '#yyyyyyyyyyyyyyy#',
    '.#yyyyyyyyyyyyy#',
    '.#yyyyyyyyyyyyy#',
    '..#yyyyyyyyyyy#',
    '...#yyyyyyyyy#',
    '....##yyyyy##',
    '......#####'
  ], { '#': '#000', y: '#ff0' });
  var FEATURES = {
    smile: ['', '', '', '', '', '.....##...##', '.....##...##', '', '', '', '....#.......#', '.....#.....#', '......#####'],
    ooh: ['', '', '', '', '', '.....##...##', '.....##...##', '', '', '.......###', '......#...#', '......#...#', '......#...#', '.......###'],
    dead: ['', '', '', '', '....#.#...#.#', '.....#.....#', '....#.#...#.#', '', '', '', '', '......#####', '.....#.....#', '....#.......#'],
    cool: ['', '', '', '', '', '..#############', '...#####.#####', '....###...###', '....#.......#', '', '.....#.....#', '......#####']
  };
  var FACES = {};
  Object.keys(FEATURES).forEach(function(k) {
    FACES[k] = svg(17, 17, FACE_BASE + pixels(FEATURES[k], { '#': '#000' }), 'ms-face-svg');
  });

  /* ---------------- LED counters ---------------- */
  // Seven segments as hexagons on a 13x23 grid.
  var SEG = {
    a: '3,2.5 4.5,1 8.5,1 10,2.5 8.5,4 4.5,4',
    g: '3,11.5 4.5,10 8.5,10 10,11.5 8.5,13 4.5,13',
    d: '3,20.5 4.5,19 8.5,19 10,20.5 8.5,22 4.5,22',
    f: '2.5,3 4,4.5 4,9.5 2.5,11 1,9.5 1,4.5',
    e: '2.5,12 4,13.5 4,18.5 2.5,20 1,18.5 1,13.5',
    b: '10.5,3 12,4.5 12,9.5 10.5,11 9,9.5 9,4.5',
    c: '10.5,12 12,13.5 12,18.5 10.5,20 9,18.5 9,13.5'
  };
  var LIT = {
    '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
    '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g'
  };
  function digitSvg(ch) {
    var lit = LIT[ch] || '', out = '';
    for (var s in SEG) out += '<polygon points="' + SEG[s] + '"' + (lit.indexOf(s) >= 0 ? ' class="on"' : '') + '/>';
    return '<svg class="ms-digit" viewBox="0 0 13 23" aria-hidden="true">' + out + '</svg>';
  }
  function ledText(n) {
    n = Math.max(-99, Math.min(999, n | 0));
    if (n < 0) { var a = String(-n); return '-' + (a.length < 2 ? '0' : '') + a; }
    var s = String(n);
    while (s.length < 3) s = '0' + s;
    return s;
  }

  /* ---------------- Name prompt (best times) ---------------- */
  function askName(message, done) {
    var finished = false;
    OS.wm.openWindow({
      title: 'Congratulations',
      width: 270,
      height: 'auto',
      resizable: false,
      minimizable: false,
      modal: true,
      taskbar: false,
      className: 'dialog',
      render: function() {
        return '<p class="ms-ask-msg"></p>' +
          '<input class="field ms-ask-input" maxlength="20" spellcheck="false" autocomplete="off" aria-label="Your name">' +
          '<div class="dialog-buttons"><button class="btn default">OK</button></div>';
      },
      onMount: function(w) {
        var input = w.body.querySelector('input');
        w.body.querySelector('.ms-ask-msg').textContent = message;
        input.value = getItem(K_NAME) || 'Anonymous';
        function finish() {
          if (finished) return;
          finished = true;
          var name = input.value.trim().slice(0, 20) || 'Anonymous';
          setItem(K_NAME, name);
          done(name);
          w.close();
        }
        w.body.querySelector('.btn').addEventListener('click', finish);
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
        });
        w.onClose(function() { if (!finished) { finished = true; done(input.value.trim().slice(0, 20) || 'Anonymous'); } });
        setTimeout(function() { input.focus(); input.select(); }, 0);
      }
    }, {}, null);
  }

  /* ---------------- The game ---------------- */
  function mount(win) {
    var root = win.body.querySelector('.ms');
    var boardEl = root.querySelector('.ms-board');
    var faceEl = root.querySelector('.ms-face');
    var leftEl = root.querySelector('.ms-left');
    var timeEl = root.querySelector('.ms-time');
    var flagBtn = root.querySelector('.ms-flagmode');

    Object.keys(SPRITES).forEach(function(k) { root.style.setProperty('--ms-' + k, cssUrl(SPRITES[k])); });

    var level = LEVELS[getItem(K_LEVEL)] ? getItem(K_LEVEL) : 'beginner';
    var marks = getItem(K_MARKS) !== '0';
    var L, N, mine, adj, st;            // st: 0 hidden, 1 open, 2 flagged, 3 question
    var cells = [];
    var started, over, won, opened, flags, seconds;
    var timer = 0, timerPaused = false;
    var transposed = false, flagMode = false, firstLayout = true, laying = false;
    var faceName = '', ledCache = {};
    var down = {};                      // cell index -> true while pressed

    /* ----- state ----- */
    function reset() {
      L = LEVELS[level];
      N = L.rows * L.cols;
      mine = []; adj = []; st = [];
      for (var i = 0; i < N; i++) { mine.push(false); adj.push(0); st.push(0); }
      started = over = won = false;
      opened = flags = seconds = 0;
      stopTimer();
      timerPaused = false;
      endPress();
    }

    function newGame() {
      reset();
      buildBoard();
      updateCounters();
      setFace('smile');
      layout();
    }

    function setLevel(k) {
      if (!LEVELS[k]) return;
      level = k;
      setItem(K_LEVEL, k);
      newGame();
    }

    function neighbors(i) {
      var r = Math.floor(i / L.cols), c = i % L.cols, out = [];
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          var rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < L.rows && cc >= 0 && cc < L.cols) out.push(rr * L.cols + cc);
        }
      }
      return out;
    }

    function placeMines(safe, list) {
      var i;
      if (list) {
        list.forEach(function(j) { if (j >= 0 && j < N) mine[j] = true; });
      } else {
        var banned = {};
        banned[safe] = true;
        neighbors(safe).forEach(function(j) { banned[j] = true; });
        var pool = [];
        for (i = 0; i < N; i++) if (!banned[i]) pool.push(i);
        if (pool.length < L.mines) {                 // tiny boards: only the clicked cell is protected
          pool = [];
          for (i = 0; i < N; i++) if (i !== safe) pool.push(i);
        }
        for (i = 0; i < L.mines && pool.length; i++) {
          var k = Math.floor(Math.random() * pool.length);
          mine[pool[k]] = true;
          pool[k] = pool[pool.length - 1];
          pool.pop();
        }
      }
      for (i = 0; i < N; i++) {
        adj[i] = 0;
        neighbors(i).forEach(function(j) { if (mine[j]) adj[i]++; });
      }
      started = true;
      seconds = 1;
      updateCounters();
      startTimer();
    }

    /* ----- moves ----- */
    function reveal(i) {
      if (over || st[i] === 1 || st[i] === 2) return;
      if (!started) placeMines(i);
      if (mine[i]) { st[i] = 1; lose(); return; }
      flood(i);
      OS.sound.play('reveal');
      checkWin();
    }

    function flood(start) {
      var stack = [start];
      while (stack.length) {
        var i = stack.pop();
        if (st[i] === 1 || st[i] === 2 || mine[i]) continue;
        st[i] = 1;
        opened++;
        paint(i);
        if (adj[i] === 0) neighbors(i).forEach(function(j) { if (st[j] !== 1 && st[j] !== 2) stack.push(j); });
      }
    }

    function chord(i) {
      if (over || st[i] !== 1 || !adj[i]) return;
      var nb = neighbors(i), flagged = 0, hidden = 0;
      nb.forEach(function(j) { if (st[j] === 2) flagged++; else if (st[j] !== 1) hidden++; });
      if (flagged !== adj[i] || !hidden) return;
      var hit = false;
      nb.forEach(function(j) {
        if (st[j] === 1 || st[j] === 2) return;
        if (mine[j]) { st[j] = 1; hit = true; } else flood(j);
      });
      if (hit) { lose(); return; }
      OS.sound.play('reveal');
      checkWin();
    }

    // Mouse right-click: blank -> flag -> ? (if Marks) -> blank.
    function cycleMark(i) {
      if (over || st[i] === 1) return;
      if (st[i] === 0) { st[i] = 2; flags++; OS.sound.play('flag'); }
      else if (st[i] === 2) { flags--; st[i] = marks ? 3 : 0; }
      else st[i] = 0;
      paint(i);
      updateCounters();
    }

    // Touch long-press / flag mode: a plain flag toggle.
    function toggleFlag(i) {
      if (over || st[i] === 1) return;
      if (st[i] === 2) { st[i] = 0; flags--; }
      else { st[i] = 2; flags++; OS.sound.play('flag'); }
      paint(i);
      updateCounters();
    }

    function lose() {
      over = true;
      stopTimer();
      endPress();
      for (var i = 0; i < N; i++) paint(i);
      setFace('dead');
      OS.sound.play('boom');
    }

    function checkWin() {
      if (over || opened !== N - L.mines) return;
      over = won = true;
      stopTimer();
      endPress();
      for (var i = 0; i < N; i++) {
        if (mine[i] && st[i] !== 2) st[i] = 2;
        paint(i);
      }
      flags = L.mines;
      updateCounters();
      setFace('cool');
      OS.sound.play('tada');
      var best = loadBest();
      if (seconds < best[level].time) {
        var lv = level, time = seconds;
        setTimeout(function() {
          if (win._gone) return;
          askName('You have the fastest time for ' + LEVELS[lv].label.toLowerCase() + ' level. Please type your name.', function(name) {
            var b = loadBest();
            if (time < b[lv].time) {
              b[lv] = { time: time, name: name };
              setItem(K_BEST, JSON.stringify(b));
            }
            if (!win._gone) showBest();
          });
        }, 700);
      }
    }

    /* ----- timer ----- */
    function startTimer() {
      stopTimer();
      timer = setInterval(function() {
        if (seconds < 999) { seconds++; setLed(timeEl, seconds); }
      }, 1000);
    }
    function stopTimer() { if (timer) clearInterval(timer); timer = 0; }

    /* ----- drawing ----- */
    function cellClass(i) {
      var s = st[i], c = 'ms-cell';
      if (s === 1) c += mine[i] ? ' open hit' : ' open' + (adj[i] ? ' n' + adj[i] : '');
      else if (over && !won && s === 2 && !mine[i]) c += ' open wrong';
      else if (s === 2) c += ' flag';
      else if (over && mine[i]) c += ' open mine';
      else if (s === 3) c += ' q';
      if (down[i]) c += ' down';
      return c;
    }
    function paint(i) { if (cells[i]) cells[i].className = cellClass(i); }

    function buildBoard() {
      var cols = transposed ? L.rows : L.cols, rows = transposed ? L.cols : L.rows;
      boardEl.style.gridTemplateColumns = 'repeat(' + cols + ', var(--ms-cell))';
      boardEl.setAttribute('aria-label', L.label + ' board, ' + L.cols + ' by ' + L.rows + ', ' + L.mines + ' mines');
      var html = '';
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = transposed ? c * L.cols + r : r * L.cols + c;
          html += '<div class="' + cellClass(i) + '" data-i="' + i + '"></div>';
        }
      }
      boardEl.innerHTML = html;
      cells = [];
      var els = boardEl.children;
      for (var k = 0; k < els.length; k++) cells[+els[k].getAttribute('data-i')] = els[k];
    }

    function setLed(el, n) {
      var t = ledText(n);
      if (ledCache[el.className] === t) return;
      ledCache[el.className] = t;
      var html = '';
      for (var k = 0; k < t.length; k++) html += digitSvg(t.charAt(k));
      el.innerHTML = html;
      el.setAttribute('aria-label', String(n));
    }
    function updateCounters() {
      setLed(leftEl, L.mines - flags);
      setLed(timeEl, seconds);
    }
    function setFace(name) {
      if (faceName === name) return;
      faceName = name;
      faceEl.innerHTML = FACES[name];
    }

    /* ----- pressed-cell feedback ----- */
    var hot = -1, pressMode = '';       // '' | 'single' | 'chord'
    function pressable(j) { return st[j] === 0 || st[j] === 3; }
    function updateDown() {
      var next = {};
      if (!over && hot >= 0 && pressMode) {
        if (pressable(hot)) next[hot] = true;
        // Chords (and presses on an open number) push in the covered neighbours too.
        if (pressMode === 'chord' || st[hot] === 1) {
          neighbors(hot).forEach(function(j) { if (pressable(j)) next[j] = true; });
        }
      }
      var old = down;
      down = next;
      var k;
      for (k in old) if (!next[k]) paint(+k);
      for (k in next) if (!old[k]) paint(+k);
    }
    function endPress() {
      hot = -1;
      pressMode = '';
      if (cells.length) updateDown(); else down = {};
    }

    function cellFrom(target) {
      var el = target && target.closest ? target.closest('.ms-cell') : null;
      return el && boardEl.contains(el) ? +el.getAttribute('data-i') : -1;
    }

    /* ----- mouse: left reveals, right flags, both/middle (or left on a number) chords ----- */
    var bL = false, bR = false, bM = false, chording = false, spent = false, lastTouch = 0;

    function mouseMode() {
      if (spent) return '';
      if (chording) return 'chord';
      return bL ? 'single' : '';
    }

    boardEl.addEventListener('mousedown', function(e) {
      if (e.button === 1) e.preventDefault();       // no autoscroll
      if (Date.now() - lastTouch < 800 || over) return;
      if (e.button > 2) return;
      var i = cellFrom(e.target);
      // Trust the live button mask, so a release we never saw can't leave a phantom chord.
      var mask = e.buttons || (1 << [0, 2, 1][e.button]);
      bL = !!(mask & 1);
      bR = !!(mask & 2);
      bM = !!(mask & 4);
      if (!bL && !bR && !bM) return;
      if (e.button === 2 && !bL && !bM && i >= 0) cycleMark(i);
      if (bM || (bL && bR)) chording = true;
      hot = i;
      pressMode = mouseMode();
      updateDown();
      if (bL || bM) setFace('ooh');
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    });

    function onMouseMove(e) {
      var i = cellFrom(e.target);
      if (i === hot) return;
      hot = i;
      updateDown();
    }

    function onMouseUp(e) {
      var i = hot;
      if (e.button === 0) bL = false;
      else if (e.button === 2) bR = false;
      else if (e.button === 1) bM = false;
      if (!over && i >= 0 && !spent) {
        if (chording) { chord(i); spent = true; }
        else if (e.button === 0) { if (st[i] === 1) chord(i); else reveal(i); }
      }
      if (e.buttons === 0 || (!bL && !bR && !bM)) releaseMouse();
      else { pressMode = mouseMode(); updateDown(); }
      if (!over) setFace((bL || bM) && !spent ? 'ooh' : 'smile');
    }

    function releaseMouse() {
      bL = bR = bM = chording = spent = false;
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      endPress();
    }

    root.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    boardEl.addEventListener('dragstart', function(e) { e.preventDefault(); });

    /* ----- touch: tap reveals, long-press flags; Flag mode swaps the two ----- */
    var touch = null, touchTimer = 0;

    function tapAction(i, alt) {
      if (over) return;
      if (st[i] === 1) { chord(i); return; }
      if (flagMode !== !!alt) toggleFlag(i); else reveal(i);
    }
    function cancelTouch() {
      clearTimeout(touchTimer);
      touch = null;
      endPress();
      if (!over) setFace('smile');
    }

    boardEl.addEventListener('touchstart', function(e) {
      lastTouch = Date.now();
      cancelTouch();
      if (e.touches.length !== 1 || over) return;
      var t = e.touches[0], i = cellFrom(e.target);
      if (i < 0) return;
      touch = { x: t.clientX, y: t.clientY, i: i, done: false };
      if (!flagMode || st[i] === 1) {
        hot = i;
        pressMode = 'single';
        updateDown();
        setFace('ooh');
      }
      touchTimer = setTimeout(function() {
        if (!touch) return;
        touch.done = true;
        endPress();
        setFace('smile');
        if (navigator.vibrate) { try { navigator.vibrate(25); } catch (err) {} }
        tapAction(touch.i, true);
      }, LONG_PRESS);
    }, { passive: true });

    boardEl.addEventListener('touchmove', function(e) {
      if (!touch) return;
      var t = e.touches[0];
      if (Math.abs(t.clientX - touch.x) > 10 || Math.abs(t.clientY - touch.y) > 10) cancelTouch();
    }, { passive: true });

    boardEl.addEventListener('touchend', function(e) {
      lastTouch = Date.now();
      if (!touch) return;
      var t = touch;
      cancelTouch();
      if (e.cancelable) e.preventDefault();          // no synthetic mouse events / double-tap zoom
      if (!t.done) tapAction(t.i, false);
    });
    boardEl.addEventListener('touchcancel', cancelTouch);

    flagBtn.addEventListener('click', function() {
      flagMode = !flagMode;
      flagBtn.classList.toggle('on', flagMode);
      flagBtn.setAttribute('aria-pressed', String(flagMode));
      OS.sound.play('click');
    });

    faceEl.addEventListener('click', function() { newGame(); });

    function onKey(e) {
      if (e.key === 'F2' && win.isActive()) { e.preventDefault(); newGame(); }
    }
    document.addEventListener('keydown', onKey);

    /* ----- sizing: shrink-wrap the window on desktop, fill and scale up on phones ----- */
    function layout() {
      if (laying || win._gone) return;
      laying = true;
      try { doLayout(); } finally { laying = false; }
    }
    function doLayout() {
      var mobile = OS.isMobile();
      root.classList.toggle('ms-touch', mobile);
      var maxed = win.el.classList.contains('maximized');
      if (mobile && !maxed) win.maximize(true);
      if (!mobile && maxed) win.maximize(false);

      var cell = 16, pz = 1;
      if (mobile) {
        var bw = win.body.clientWidth, bh = win.body.clientHeight;
        var wantT = L.cols > L.rows && bh > bw && (bw - 24) / L.cols < 22;
        if (wantT !== transposed) { transposed = wantT; buildBoard(); }
        var cols = transposed ? L.rows : L.cols, rows = transposed ? L.cols : L.rows;
        root.style.setProperty('--ms-cell', '16px');
        root.style.setProperty('--ms-pz', '1.4');
        var chromeW = root.offsetWidth - cols * 16, chromeH = root.offsetHeight - rows * 16;
        var fitW = Math.floor((bw - chromeW - 4) / cols), fitH = Math.floor((bh - chromeH - 4) / rows);
        cell = Math.min(40, fitW);
        cell = Math.min(cell, Math.max(fitH, 24));
        cell = Math.max(cell, 20);
        pz = cell >= 28 ? 1.4 : 1.2;
      } else if (transposed) {
        transposed = false;
        buildBoard();
      }
      root.style.setProperty('--ms-cell', cell + 'px');
      root.style.setProperty('--ms-pz', String(pz));
      root.style.setProperty('--ms-b', (cell >= 30 ? 3 : 2) + 'px');
      if (mobile) return;

      var area = document.getElementById('windows');
      var W = area.clientWidth, H = area.clientHeight;
      var el = win.el;
      var oldW = el.offsetWidth;
      var chromeX = el.offsetWidth - win.body.clientWidth;
      var w = Math.min(root.offsetWidth + chromeX, W);
      el.style.width = w + 'px';
      el.style.height = '';
      if (el.offsetHeight > H) el.style.height = H + 'px';
      var left = el.offsetLeft, top = el.offsetTop;
      if (firstLayout) left += Math.round((oldW - w) / 2);
      left = Math.max(0, Math.min(left, W - w));
      top = Math.max(0, Math.min(top, H - el.offsetHeight));
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      firstLayout = false;
    }
    win.onResize(layout);
    window.addEventListener('resize', layout);

    // Like the original, the clock stops while the game is minimized.
    win.onFocusChange(function(active) {
      if (!active && timer && win.el.classList.contains('minimized')) { stopTimer(); timerPaused = true; }
      else if (active && timerPaused) { timerPaused = false; if (started && !over) startTimer(); }
    });

    /* ----- menus & dialogs ----- */
    function showBest() {
      var b = loadBest();
      OS.alert({
        title: 'Fastest Mine Sweepers',
        icon: 'info',
        width: 300,
        message: ORDER.map(function(k) {
          return LEVELS[k].label + ':  ' + b[k].time + (b[k].time === 1 ? ' second' : ' seconds') + '  —  ' + b[k].name;
        }).join('\n'),
        buttons: ['OK', 'Reset Scores']
      }).then(function(r) {
        if (r !== 'Reset Scores') return;
        setItem(K_BEST, '{}');
        if (!win._gone) showBest();
      });
    }

    function howTo() {
      OS.alert({
        title: 'How to Play Minesweeper',
        icon: 'question',
        width: 380,
        message: 'Uncover every square that is not hiding a mine.\n\n' +
          '• Left-click a square to uncover it. A number tells you how many mines touch it.\n' +
          '• Right-click to plant a flag where you think a mine is' + (marks ? ' (again for ?, again to clear).' : '.') + '\n' +
          '• Click a number once all its mines are flagged to clear the rest of its neighbours (or use both buttons).\n' +
          '• Your first click is always safe. The smiley starts a new game; so does F2.\n\n' +
          'Touchscreen: tap to uncover, press and hold to flag, or switch on Flag mode.'
      });
    }

    function about() {
      OS.alert({
        title: 'About Minesweeper',
        icon: 'info',
        width: 320,
        message: 'Minesweeper for OzalpOS 98\nVersion 98.0, Duke Edition\n\n' +
          'Omar has never once flagged correctly on the first try.\n\n' +
          'Hand-built in plain JavaScript. No mines were harmed.'
      });
    }

    win.setMenu([
      { label: 'Game', items: function() {
        return [
          { label: 'New', shortcut: 'F2', onClick: newGame },
          '-',
          { label: 'Beginner', checked: level === 'beginner', onClick: function() { setLevel('beginner'); } },
          { label: 'Intermediate', checked: level === 'intermediate', onClick: function() { setLevel('intermediate'); } },
          { label: 'Expert', checked: level === 'expert', onClick: function() { setLevel('expert'); } },
          '-',
          { label: 'Marks (?)', checked: marks, onClick: function() {
            marks = !marks;
            setItem(K_MARKS, marks ? '1' : '0');
            if (!marks) for (var i = 0; i < N; i++) if (st[i] === 3) { st[i] = 0; paint(i); }
          } },
          '-',
          { label: 'Best Times...', onClick: showBest },
          '-',
          { label: 'Exit', onClick: function() { win.close(); } }
        ];
      } },
      { label: 'Help', items: [
        { label: 'How to Play', onClick: howTo },
        '-',
        { label: 'About Minesweeper...', onClick: about }
      ] }
    ]);

    win.onClose(function() {
      win._gone = true;
      stopTimer();
      clearTimeout(touchTimer);
      releaseMouse();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', layout);
    });

    // Test hook (used by the screenshot scripts; harmless in normal play).
    win.el.__ms = {
      newGame: newGame,
      setLevel: setLevel,
      layMines: function(list) { reset(); buildBoard(); placeMines(-1, list); setFace('smile'); layout(); },
      reveal: function(r, c) { reveal(r * L.cols + c); },
      flag: function(r, c) { cycleMark(r * L.cols + c); },
      chord: function(r, c) { chord(r * L.cols + c); },
      solve: function() { for (var i = 0; i < N && !over; i++) if (!mine[i] && st[i] !== 1) reveal(i); },
      setFlagMode: function(on) { if (!!on !== flagMode) flagBtn.click(); },
      state: function() {
        return { level: level, rows: L.rows, cols: L.cols, mines: L.mines, started: started, over: over, won: won,
          opened: opened, flags: flags, seconds: seconds, transposed: transposed, face: faceName };
      }
    };

    newGame();
  }

  OS.registerApp('minesweeper', {
    title: 'Minesweeper',
    icon: 'minesweeper',
    width: 180,
    height: 'auto',
    resizable: false,
    bodyClass: 'ms-body',
    render: function() {
      return '<div class="ms">' +
        '<div class="ms-top">' +
          '<div class="ms-led ms-left" role="img" title="Mines left"></div>' +
          '<button class="ms-face" aria-label="New game"></button>' +
          '<div class="ms-led ms-time" role="img" title="Seconds"></div>' +
        '</div>' +
        '<div class="ms-board" role="group"></div>' +
        '<div class="ms-mobile">' +
          '<button class="btn ms-flagmode" aria-pressed="false"><span class="ms-flagicon"></span>Flag mode</button>' +
          '<span class="ms-hint">Tap to dig. Hold to flag.</span>' +
        '</div>' +
      '</div>';
    },
    onMount: mount
  });
})();
