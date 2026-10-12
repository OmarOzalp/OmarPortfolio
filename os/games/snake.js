// snake.js — Snake for OzalpOS 98: a Game Boy-green LCD in a window. Canvas-drawn pixel
// sprites, queued turns (two per tick), swipes and an on-screen D-pad on touch, and bonus
// pickups: a protein shake (Omar wrestles and runs track) and the occasional Duke D token.

(function() {
  var COLS = 24, ROWS = 18;
  var PAL = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];   // darkest -> lightest
  var GRID = '#143f14';
  var SPEEDS = {
    slow:   { label: 'Slow',   ms: 150 },
    normal: { label: 'Normal', ms: 105 },
    fast:   { label: 'Fast',   ms: 72 }
  };
  var K_SPEED = 'ozalpos.snake.speed', K_SCORES = 'ozalpos.snake.scores', K_NAME = 'ozalpos.player';
  var STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    Up: 'up', Down: 'down', Left: 'left', Right: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right'
  };

  // 8x8 sprites; each digit indexes PAL, '.' is transparent.
  var SPRITES = {
    apple: [
      '....2...',
      '...2.22.',
      '.33.333.',
      '33333333',
      '33333332',
      '33333332',
      '.333332.',
      '..33.3..'
    ],
    shake: [
      '...22...',
      '..2222..',
      '.222222.',
      '.333333.',
      '.311113.',
      '.311113.',
      '.333333.',
      '..3333..'
    ],
    duke: [
      '..3333..',
      '.333333.',
      '33000333',
      '33033033',
      '33033033',
      '33000333',
      '.333333.',
      '..3333..'
    ]
  };
  var FOOD = {
    apple: { points: 10, grow: 1 },
    shake: { points: 50, grow: 3, text: '+50 GAINS' },
    duke:  { points: 100, grow: 2, text: '+100 GO DUKE' }
  };
  var BONUS_MS = 5000;

  var QUIPS = {
    wall: ['Ran out of track.', 'That wall came out of nowhere.', 'Out of bounds. No points for style.', 'Hit the wall at mile 20.'],
    self: ['Pinned... by yourself.', 'Tied up in your own half nelson.', 'Ate your own tail. Bad form.', 'Self-inflicted takedown.'],
    any:  ['Weight cut failed.', 'Missed weight by 0.2 lbs.', 'Should have tapered.', 'Coach says: one more rep.']
  };
  function quip(kind) {
    var pool = QUIPS[kind].concat(QUIPS.any);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------------- Storage ---------------- */
  function getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setItem(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function loadScores() {
    var list;
    try { list = JSON.parse(getItem(K_SCORES)); } catch (e) { list = null; }
    if (!Array.isArray(list)) return [];
    return list.filter(function(s) { return s && typeof s.score === 'number' && s.score > 0; })
      .map(function(s) { return { name: String(s.name || 'Anonymous').slice(0, 20), score: Math.floor(s.score) }; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, 5);
  }
  function qualifies(score) {
    var list = loadScores();
    return score > 0 && (list.length < 5 || score > list[list.length - 1].score);
  }
  function addScore(name, score) {
    var list = loadScores();
    list.push({ name: name, score: score });
    list.sort(function(a, b) { return b.score - a.score; });
    setItem(K_SCORES, JSON.stringify(list.slice(0, 5)));
  }

  /* ---------------- Little helpers ---------------- */
  // Pixel sprite as inline SVG (start-screen legend).
  function spriteSvg(name) {
    var rows = SPRITES[name], out = '';
    for (var y = 0; y < 8; y++) {
      for (var x = 0; x < 8; x++) {
        var ch = rows[y].charAt(x);
        if (ch !== '.') out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + PAL[+ch] + '"/>';
      }
    }
    return '<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">' + out + '</svg>';
  }

  var ARROW = {
    up: '<svg viewBox="0 0 7 4" aria-hidden="true"><path d="M3 0h1v1h1v1h1v1h1v1H0V3h1V2h1V1h1z"/></svg>',
    down: '<svg viewBox="0 0 7 4" aria-hidden="true"><path d="M0 0h7v1H6v1H5v1H4v1H3V3H2V2H1V1H0z"/></svg>',
    left: '<svg viewBox="0 0 4 7" aria-hidden="true"><path d="M3 0h1v7H3V6H2V5H1V4H0V3h1V2h1V1h1z"/></svg>',
    right: '<svg viewBox="0 0 4 7" aria-hidden="true"><path d="M0 0h1v1h1v1h1v1h1v1H3v1H2v1H1v1H0z"/></svg>',
    pause: '<svg viewBox="0 0 7 7" aria-hidden="true"><path d="M1 0h2v7H1zM4 0h2v7H4z"/></svg>'
  };

  function coarsePointer() {
    try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  }

  /* ---------------- Name prompt ---------------- */
  function askName(score, done) {
    var finished = false;
    OS.wm.openWindow({
      title: 'New High Score',
      width: 270,
      height: 'auto',
      resizable: false,
      minimizable: false,
      modal: true,
      taskbar: false,
      className: 'dialog',
      render: function() {
        return '<p class="snake-ask-msg"></p>' +
          '<input class="field snake-ask-input" maxlength="20" spellcheck="false" autocomplete="off" aria-label="Your name">' +
          '<div class="dialog-buttons"><button class="btn default">OK</button></div>';
      },
      onMount: function(w) {
        var input = w.body.querySelector('input');
        w.body.querySelector('.snake-ask-msg').textContent = score + ' points! That makes the Snake hall of fame. Please type your name.';
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
    var root = win.body.querySelector('.snake');
    var screen = root.querySelector('.snake-screen');
    var canvas = root.querySelector('.snake-canvas');
    var ctx = canvas.getContext('2d');
    var overlay = root.querySelector('.snake-overlay');
    var pad = root.querySelector('.snake-pad');
    var statusEl = root.querySelector('.statusbar');
    var scoreEl = root.querySelector('.snake-score');
    var highEl = root.querySelector('.snake-high');

    var speed = SPEEDS[getItem(K_SPEED)] ? getItem(K_SPEED) : 'normal';
    var state = 'ready';                // ready | running | paused | dying | over
    var snake, dir, queue, grow, food, bonus, score, eaten, sinceBonus, popups;
    var gameTime = 0, acc = 0, last = 0, raf = 0;
    var timers = [];
    var cell = 16, dpr = 1;
    var firstLayout = true, laying = false, gone = false;
    var overAt = 0, lastQuip = '', newHigh = false;

    function later(fn, ms) {
      var id = setTimeout(function() {
        timers.splice(timers.indexOf(id), 1);
        if (!gone) fn();
      }, ms);
      timers.push(id);
    }

    /* ----- state ----- */
    function reset() {
      var y = Math.floor(ROWS / 2);
      snake = [{ x: 7, y: y }, { x: 6, y: y }, { x: 5, y: y }, { x: 4, y: y }];
      dir = 'right';
      queue = [];
      grow = 0;
      score = 0;
      eaten = 0;
      sinceBonus = 0;
      bonus = null;
      popups = [];
      gameTime = 0;
      acc = 0;
      newHigh = false;
      food = { x: 15, y: y, kind: 'apple' };
      updateStatus();
    }

    function interval() {
      var base = SPEEDS[speed].ms;
      return Math.max(base * 0.55, base - eaten * base * 0.012);
    }

    function occupied(x, y) {
      for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
      return (food && food.x === x && food.y === y) || (bonus && bonus.x === x && bonus.y === y);
    }
    function freeCell() {
      var free = [];
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (!occupied(x, y)) free.push({ x: x, y: y });
      return free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function spawnBonus(kind, at) {
      var spot = at || freeCell();
      if (!spot) return;
      bonus = { x: spot.x, y: spot.y, kind: kind || (Math.random() < 0.7 ? 'shake' : 'duke'), until: gameTime + BONUS_MS };
      sinceBonus = 0;
    }

    function step() {
      if (queue.length) dir = queue.shift();
      var head = snake[0], d = STEP[dir];
      var nx = head.x + d[0], ny = head.y + d[1];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { die('wall'); return; }
      var body = grow > 0 ? snake.length : snake.length - 1;    // the tail moves away unless growing
      for (var i = 0; i < body; i++) {
        if (snake[i].x === nx && snake[i].y === ny) { die('self'); return; }
      }
      snake.unshift({ x: nx, y: ny });
      if (grow > 0) grow--; else snake.pop();

      if (food && food.x === nx && food.y === ny) {
        score += FOOD.apple.points;
        grow += FOOD.apple.grow;
        eaten++;
        sinceBonus++;
        OS.sound.play('eat');
        food = null;
        var spot = freeCell();
        if (spot) food = { x: spot.x, y: spot.y, kind: 'apple' };
        if (!bonus && (Math.random() < 0.2 || sinceBonus >= 7)) spawnBonus();
        updateStatus();
        if (!food) { ateEverything(); return; }
      }
      if (bonus && bonus.x === nx && bonus.y === ny) {
        var f = FOOD[bonus.kind];
        score += f.points;
        grow += f.grow;
        popups.push({ x: nx, y: ny, text: f.text, t: gameTime });
        OS.sound.play('beep');
        bonus = null;
        updateStatus();
      }
    }

    function die(kind) {
      state = 'dying';
      stopLoop();
      lastQuip = quip(kind);
      OS.sound.play('die');
      var flashes = 0;
      (function blink() {
        flashes++;
        draw(flashes % 2 === 1);
        if (flashes < 6) later(blink, 110);
        else finishGame();
      })();
    }

    function ateEverything() {
      state = 'dying';
      stopLoop();
      lastQuip = 'You ate everything. Coach is speechless.';
      OS.sound.play('tada');
      later(finishGame, 300);
    }

    function finishGame() {
      state = 'over';
      overAt = Date.now();
      popups = [];
      bonus = null;
      draw();
      var high = loadScores();
      newHigh = score > 0 && (!high.length || score > high[0].score);
      showOverlay();
      if (qualifies(score)) {
        var s = score;
        askName(s, function(name) {
          addScore(name, s);
          if (!gone) updateStatus();
        });
      }
    }

    /* ----- flow ----- */
    function newGame() {
      stopLoop();
      clearTimers();
      reset();
      state = 'ready';
      draw();
      showOverlay();
    }

    function start() {
      if (state === 'over' || state === 'dying') { clearTimers(); reset(); }
      state = 'running';
      showOverlay();
      startLoop();
    }

    function pause() {
      if (state !== 'running') return;
      state = 'paused';
      stopLoop();
      draw();
      showOverlay();
    }

    function togglePause() {
      if (state === 'running') pause();
      else if (state === 'paused') start();
    }

    // Space / tap / centre button: start, resume or pause depending on the moment.
    function primary() {
      if (state === 'ready' || state === 'paused') start();
      else if (state === 'running') pause();
      else if (state === 'over' && Date.now() - overAt > 400) start();
    }

    function turn(d) {
      if (state === 'ready' || state === 'paused') start();
      if (state !== 'running') return;
      var prev = queue.length ? queue[queue.length - 1] : dir;
      if (queue.length >= 2 || d === prev || d === OPPOSITE[prev]) return;
      queue.push(d);
    }

    /* ----- loop ----- */
    function startLoop() {
      if (raf) return;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function frame(now) {
      raf = 0;
      if (state !== 'running' || gone) return;
      var dt = Math.min(now - last, 250);
      last = now;
      gameTime += dt;
      acc += dt;
      var iv = interval();
      while (acc >= iv && state === 'running') {
        acc -= iv;
        step();
        iv = interval();
      }
      if (state !== 'running') return;
      if (bonus && gameTime >= bonus.until) bonus = null;
      draw();
      raf = requestAnimationFrame(frame);
    }

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    /* ----- drawing ----- */
    function px(n) { return Math.round(n * cell / 8); }   // sprite pixel -> device pixel

    function drawSprite(rows, cx, cy) {
      var x0 = cx * cell, y0 = cy * cell;
      for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 8; x++) {
          var ch = rows[y].charAt(x);
          if (ch === '.') continue;
          ctx.fillStyle = PAL[+ch];
          ctx.fillRect(x0 + px(x), y0 + px(y), px(x + 1) - px(x), px(y + 1) - px(y));
        }
      }
    }

    function linked(a, b) {
      if (!b) return '';
      if (b.x === a.x && b.y === a.y - 1) return 'up';
      if (b.x === a.x && b.y === a.y + 1) return 'down';
      if (b.y === a.y && b.x === a.x - 1) return 'left';
      if (b.y === a.y && b.x === a.x + 1) return 'right';
      return '';
    }

    function drawSegment(i, dead) {
      var s = snake[i];
      var x0 = s.x * cell, y0 = s.y * cell, g = px(1);
      var l = x0 + g, t = y0 + g, r = x0 + cell - g, b = y0 + cell - g;
      [linked(s, snake[i - 1]), linked(s, snake[i + 1])].forEach(function(side) {
        if (side === 'up') t = y0;
        if (side === 'down') b = y0 + cell;
        if (side === 'left') l = x0;
        if (side === 'right') r = x0 + cell;
      });
      ctx.fillStyle = i === 0 ? PAL[3] : PAL[2];
      ctx.fillRect(l, t, r - l, b - t);
      if (i === 0) {
        // Eyes look where the snake is going; X eyes once it has crashed.
        var e1, e2;
        if (dir === 'right') { e1 = [5, 2]; e2 = [5, 5]; }
        else if (dir === 'left') { e1 = [2, 2]; e2 = [2, 5]; }
        else if (dir === 'up') { e1 = [2, 2]; e2 = [5, 2]; }
        else { e1 = [2, 5]; e2 = [5, 5]; }
        ctx.fillStyle = PAL[0];
        [e1, e2].forEach(function(e) {
          ctx.fillRect(x0 + px(e[0]), y0 + px(e[1]), px(e[0] + 1) - px(e[0]), px(e[1] + 1) - px(e[1]));
          if (dead) {
            ctx.fillRect(x0 + px(e[0] - 1), y0 + px(e[1] - 1), px(1), px(1));
            ctx.fillRect(x0 + px(e[0] + 1), y0 + px(e[1] + 1), px(1), px(1));
          }
        });
      } else if (i % 2 === 0) {
        ctx.fillStyle = PAL[1];
        ctx.fillRect(x0 + px(3), y0 + px(3), px(5) - px(3), px(5) - px(3));
      }
    }

    function draw(hideSnake) {
      var W = canvas.width, H = canvas.height;
      ctx.fillStyle = PAL[0];
      ctx.fillRect(0, 0, W, H);
      // Faint LCD cell grid.
      ctx.fillStyle = GRID;
      var dot = Math.max(1, px(1));
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          ctx.fillRect(x * cell + Math.floor((cell - dot) / 2), y * cell + Math.floor((cell - dot) / 2), dot, dot);
        }
      }
      if (food) drawSprite(SPRITES[food.kind], food.x, food.y);
      if (bonus) {
        var left = bonus.until - gameTime;
        if (left > 1500 || Math.floor(gameTime / 120) % 2 === 0) drawSprite(SPRITES[bonus.kind], bonus.x, bonus.y);
      }
      if (!hideSnake && snake) {
        for (var i = snake.length - 1; i >= 0; i--) drawSegment(i, state === 'dying' || state === 'over');
      }
      // Score pop-ups float up and fade.
      if (popups.length) {
        popups = popups.filter(function(p) { return gameTime - p.t < 1100; });
        ctx.font = Math.round(cell * 1.15) + 'px VT323, "Lucida Console", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        popups.forEach(function(p) {
          var k = (gameTime - p.t) / 1100;
          var x = Math.min(Math.max((p.x + 0.5) * cell, cell * 3), W - cell * 3);
          var y = Math.max(p.y * cell - k * cell * 1.5, cell);
          ctx.globalAlpha = 1 - k * k;
          ctx.fillStyle = PAL[0];
          ctx.fillText(p.text, x + px(1), y + px(1));
          ctx.fillStyle = PAL[3];
          ctx.fillText(p.text, x, y);
        });
        ctx.globalAlpha = 1;
      }
    }

    /* ----- overlay & status ----- */
    var touchUi = false;
    function showOverlay() {
      var tap = touchUi ? ' or tap' : ' or click';
      var html = '';
      if (state === 'ready') {
        html = '<div class="snake-title">SNAKE</div>' +
          '<div class="snake-sub snake-blink">press Space' + tap + ' to start</div>' +
          '<div class="snake-legend">' +
            '<span>' + spriteSvg('apple') + ' 10</span>' +
            '<span>' + spriteSvg('shake') + ' 50</span>' +
            '<span>' + spriteSvg('duke') + ' 100</span>' +
          '</div>' +
          '<div class="snake-small">' + (touchUi ? 'Swipe or use the pad to steer' : 'Arrows / WASD steer · P pauses') + '</div>';
      } else if (state === 'paused') {
        html = '<div class="snake-title">PAUSED</div>' +
          '<div class="snake-sub snake-blink">press Space' + tap + ' to resume</div>';
      } else if (state === 'over') {
        html = '<div class="snake-title">GAME OVER</div>' +
          '<div class="snake-sub">' + OS.esc(lastQuip) + '</div>' +
          '<div class="snake-score-big">SCORE ' + score + (newHigh ? ' · NEW BEST!' : '') + '</div>' +
          '<div class="snake-sub snake-blink">press Space' + tap + ' to play again</div>';
      }
      overlay.innerHTML = html;
      overlay.hidden = !html;
    }

    function updateStatus() {
      var list = loadScores();
      var high = Math.max(list.length ? list[0].score : 0, score || 0);
      scoreEl.textContent = 'Score: ' + (score || 0);
      highEl.textContent = 'High score: ' + high;
    }

    /* ----- input ----- */
    function onKey(e) {
      if (!win.isActive() || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      var d = KEYS[e.key];
      if (d) { e.preventDefault(); turn(d); return; }
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) primary();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (!e.repeat) togglePause();
      } else if (e.key === 'F2') {
        e.preventDefault();
        newGame();
      }
    }
    document.addEventListener('keydown', onKey);

    function onVisibility() { if (document.hidden) pause(); }
    document.addEventListener('visibilitychange', onVisibility);

    win.onFocusChange(function(active) { if (!active) pause(); });
    var menubar = win.el.querySelector('.window-menubar');
    if (menubar) menubar.addEventListener('pointerdown', pause);

    // Swipes on the screen; a tap starts or resumes.
    var touch = null, lastSwipe = 0;
    screen.addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1) { touch = null; return; }
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiped: false };
    }, { passive: true });
    screen.addEventListener('touchmove', function(e) {
      if (!touch) return;
      if (e.cancelable) e.preventDefault();
      var t = e.touches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      touch.x = t.clientX;
      touch.y = t.clientY;
      touch.swiped = true;
      lastSwipe = Date.now();
    }, { passive: false });
    screen.addEventListener('touchend', function(e) {
      var t = touch;
      touch = null;
      if (!t) return;
      if (e.cancelable) e.preventDefault();
      if (!t.swiped && state !== 'running') primary();
    });
    screen.addEventListener('click', function() {
      if (Date.now() - lastSwipe < 400) return;
      if (state !== 'running') primary();
    });

    pad.addEventListener('pointerdown', function(e) {
      var b = e.target.closest('[data-dir]');
      if (!b) return;
      e.preventDefault();
      var d = b.getAttribute('data-dir');
      if (d === 'pause') primary(); else turn(d);
    });
    pad.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    /* ----- sizing ----- */
    function outerHeight(el) {
      if (!el.offsetHeight) return 0;
      var cs = getComputedStyle(el);
      return el.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    }
    function layout() {
      if (laying || gone) return;
      laying = true;
      try { doLayout(); } finally { laying = false; }
    }
    function doLayout() {
      var mobile = OS.isMobile();
      touchUi = mobile || coarsePointer();
      root.classList.toggle('snake-touch', touchUi);
      root.classList.toggle('snake-mobile', mobile);
      var maxed = win.el.classList.contains('maximized');
      if (mobile && !maxed) win.maximize(true);
      if (!mobile && maxed) win.maximize(false);

      dpr = window.devicePixelRatio || 1;
      var css = 16;
      if (mobile) {
        var frame = screen.offsetWidth - screen.clientWidth || 4;
        var availW = win.body.clientWidth - frame - 8;
        var availH = win.body.clientHeight - outerHeight(pad) - statusEl.offsetHeight - 2 - frame - 8;
        css = Math.max(8, Math.min(32, availW / COLS, availH / ROWS));
      }
      cell = Math.max(8, Math.floor(css * dpr));
      canvas.width = cell * COLS;
      canvas.height = cell * ROWS;
      canvas.style.width = (cell * COLS / dpr) + 'px';
      canvas.style.height = (cell * ROWS / dpr) + 'px';
      ctx.imageSmoothingEnabled = false;
      draw(state === 'dying');
      showOverlay();
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
      el.style.left = Math.max(0, Math.min(left, W - w)) + 'px';
      el.style.top = Math.max(0, Math.min(top, H - el.offsetHeight)) + 'px';
      firstLayout = false;
    }
    win.onResize(layout);
    window.addEventListener('resize', layout);

    /* ----- menus ----- */
    function setSpeed(k) {
      speed = k;
      setItem(K_SPEED, k);
    }

    function showScores() {
      var list = loadScores();
      OS.alert({
        title: 'Snake High Scores',
        icon: 'info',
        width: 300,
        message: list.length
          ? list.map(function(s, i) { return (i + 1) + '.  ' + s.name + '  —  ' + s.score; }).join('\n')
          : 'No high scores yet.\nGo eat some apples.',
        buttons: list.length ? ['OK', 'Reset Scores'] : ['OK']
      }).then(function(r) {
        if (r !== 'Reset Scores') return;
        setItem(K_SCORES, '[]');
        if (!gone) updateStatus();
      });
    }

    function howTo() {
      OS.alert({
        title: 'How to Play Snake',
        icon: 'question',
        width: 380,
        message: 'Steer the snake to the food. Every bite makes you longer and a little faster. Hit a wall or your own tail and it is over.\n\n' +
          '• Arrow keys or WASD steer. Space or P pauses. F2 starts over.\n' +
          '• Apple: 10 points.\n' +
          '• Protein shake: 50 points and serious gains (+3 length).\n' +
          '• Duke D token: 100 points.\n' +
          'Bonus items only stick around for a few seconds.\n\n' +
          'Touchscreen: swipe on the screen or use the arrow pad.'
      });
    }

    function about() {
      OS.alert({
        title: 'About Snake',
        icon: 'info',
        width: 320,
        message: 'Snake for OzalpOS 98\nVersion 98.0, Duke Edition\n\n' +
          'Built on a strict diet of apples and protein shakes. ' +
          'Omar insists the snake is just cutting weight.'
      });
    }

    win.setMenu([
      { label: 'Game', items: function() {
        return [
          { label: 'New Game', shortcut: 'F2', onClick: newGame },
          { label: state === 'paused' ? 'Resume' : 'Pause', shortcut: 'P', disabled: state !== 'running' && state !== 'paused', onClick: togglePause },
          '-'
        ].concat(Object.keys(SPEEDS).map(function(k) {
          return { label: SPEEDS[k].label, checked: speed === k, onClick: function() { setSpeed(k); } };
        }), [
          '-',
          { label: 'High Scores...', onClick: showScores },
          '-',
          { label: 'Exit', onClick: function() { win.close(); } }
        ]);
      } },
      { label: 'Help', items: [
        { label: 'How to Play', onClick: howTo },
        '-',
        { label: 'About Snake...', onClick: about }
      ] }
    ]);

    win.onClose(function() {
      gone = true;
      stopLoop();
      clearTimers();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', layout);
    });

    // Test hook (used by the screenshot scripts; harmless in normal play).
    win.el.__snake = {
      start: start,
      pause: pause,
      newGame: newGame,
      step: function() { step(); if (state === 'running' || state === 'paused') draw(); },
      set: function(o) {
        if (o.snake) snake = o.snake.map(function(p) { return { x: p[0], y: p[1] }; });
        if (o.dir) { dir = o.dir; queue = []; }
        if (o.food) food = { x: o.food[0], y: o.food[1], kind: 'apple' };
        if (o.bonus) spawnBonus(o.bonus[2], { x: o.bonus[0], y: o.bonus[1] });
        if (o.score != null) { score = o.score; updateStatus(); }
        if (o.eaten != null) eaten = o.eaten;
        draw();
      },
      state: function() {
        return { state: state, dir: dir, queue: queue.slice(), length: snake.length, score: score, speed: speed,
          interval: interval(), cell: cell, head: snake[0], bonus: bonus && bonus.kind, looping: !!raf };
      }
    };

    reset();
    layout();
  }

  OS.registerApp('snake', {
    title: 'Snake',
    icon: 'snake',
    width: 400,
    height: 'auto',
    resizable: false,
    bodyClass: 'snake-body',
    render: function() {
      return '<div class="snake">' +
        '<div class="snake-screen">' +
          '<canvas class="snake-canvas" width="384" height="288" aria-label="Snake playfield"></canvas>' +
          '<div class="snake-overlay" aria-live="polite"></div>' +
        '</div>' +
        '<div class="snake-pad" aria-label="Direction pad">' +
          '<button class="btn snake-up" data-dir="up" aria-label="Up">' + ARROW.up + '</button>' +
          '<button class="btn snake-left" data-dir="left" aria-label="Left">' + ARROW.left + '</button>' +
          '<button class="btn snake-mid" data-dir="pause" aria-label="Start or pause">' + ARROW.pause + '</button>' +
          '<button class="btn snake-right" data-dir="right" aria-label="Right">' + ARROW.right + '</button>' +
          '<button class="btn snake-down" data-dir="down" aria-label="Down">' + ARROW.down + '</button>' +
        '</div>' +
        '<div class="statusbar">' +
          '<div class="status-field snake-score">Score: 0</div>' +
          '<div class="status-field snake-high">High score: 0</div>' +
        '</div>' +
      '</div>';
    },
    onMount: mount
  });
})();
