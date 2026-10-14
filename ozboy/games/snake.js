// snake.js — SEA SNAKE, OZ BOY's Snake: a yellow-banded sea snake hunting fish (and the odd shrimp)
// on the reef. 8 px cells under a 12 px HUD; one requestAnimationFrame loop with fixed-step moves.

import { C, makeCanvas, rect, frame, pxText, bitmap } from '../pixel.js';

const CELL = 8, HUD = 12;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          // up, right, down, left
const DIRS = { up: 0, right: 1, down: 2, left: 3 };
const INK = '#0a1430';
const OUTLINE = [-1, 0, 1, 0, 0, -1, 0, 1];             // x,y pairs around big text

// Band palettes: h body, s lit edge, d shaded edge (plus head features).
const TEAL = { h: C.teal, s: '#8cecf6', d: '#127f99', w: C.white, p: INK, y: C.yellow, x: INK };
const GOLD = { h: C.yellow, s: '#fff4bd', d: '#d6961c' };
const BONE = { h: '#c7d1e2', s: '#ffffff', d: '#8792aa', w: C.white, p: INK, y: '#eef2f8', x: INK };

// Snake pieces are grids facing right with the neck on the left: 'o' outline, '#' body (lit and
// shaded from its silhouette), other letters are features. turn() makes the other directions.
// The head is a pixel wider than its cell on each side, so it reads as a head.
const HEAD = [
  ' ooooo  ',
  'o#####o ',
  '###ww##o',
  '###wp#yo',
  '######yo',
  '######yo',
  '###wp#yo',
  '###ww##o',
  'o#####o ',
  ' ooooo  '
];
const HEAD_KO = [
  ' ooooo  ',
  'o#x#x#o ',
  '###x###o',
  '##x#x#yo',
  '######yo',
  '######yo',
  '##x#x#yo',
  '###x###o',
  'o#x#x#o ',
  ' ooooo  '
];
const TAIL = [
  'ooo     ',
  '###oo   ',
  '#####oo ',
  '#######o',
  '#######o',
  '#####oo ',
  '###oo   ',
  'ooo     '
];
// Food, facing left: a clownfish and a (rarer, tastier) shrimp.
const FISH = [
  '        ',
  '  kkk kk',
  ' kowokok',
  'koewooak',
  'koowoook',
  ' kowokok',
  '  kkk kk',
  '        '
];
const SHRIMP = [
  'a       ',
  ' akkkk  ',
  ' kllllk ',
  'kpedpdpk',
  'kppdpdpk',
  ' kkkkppk',
  '   kfffk',
  '    kkk '
];
const FISH_C = { k: INK, o: C.orange, w: C.white, e: INK, a: '#ffb36b' };
const SHRIMP_C = { k: INK, p: '#ff7a9c', l: '#ffc8d6', d: '#e0507a', f: C.pink, e: INK, a: '#ffc8d6' };

// The title's demo snake swims a square wave: one period of moves is R,R,U,U,R,R,D,D.
const TX = [0, 1, 2, 2, 2, 3, 4, 4], TY = [0, 0, 0, -1, -2, -2, -2, -1];
const DEMO_LEN = 8;
// Tongue pixels for a head facing right (relative to its 8x10 sprite), turned like the sprites.
const TONGUE = [8, 5, 9, 5, 10, 4, 10, 6];

const QUIPS = {
  wall: ['THE REEF WINS.', 'BONK. CORAL.', 'WALL 1, ME 0.', 'BLUB.', 'SHOULDA TURNED.'],
  self: ['TOO LONG, BRO.', 'SELF-PIN. OUCH.', 'TIED IN A KNOT.', 'BLUB.', 'ATE MY OWN TAIL.'],
  zero: ['FALSE START.', 'BLUB.', 'DID I EVEN DIVE?'],
  full: ['THE OCEAN IS MINE.']
};

function mix(a, b, t) {
  const p = (s, i) => parseInt(s.slice(i, i + 2), 16);
  let out = '#';
  for (let i = 1; i < 7; i += 2) out += Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0');
  return out;
}

// A right-facing grid turned to face d (0 up, 1 right, 2 down, 3 left).
function turn(g, d) {
  const h = g.length, w = g[0].length, out = [];
  if (d === 1 || d === 3) {
    for (let y = 0; y < h; y++) out.push(d === 1 ? g[y] : g[y].split('').reverse().join(''));
    return out;
  }
  for (let r = 0; r < w; r++) {
    let row = '';
    for (let c = 0; c < h; c++) row += d === 2 ? g[c][r] : g[c][w - 1 - r];
    out.push(row);
  }
  return out;
}
// The same turn for a point (x, y) of a right-facing grid w wide.
function turnPt(x, y, w, d) {
  return d === 1 ? [x, y] : d === 3 ? [w - 1 - x, y] : d === 2 ? [y, x] : [y, w - 1 - x];
}

// A body cell joined to its neighbours on the sides in mask m (1 up, 2 right, 4 down, 8 left).
function bodyGrid(m) {
  const out = [];
  for (let y = 0; y < 8; y++) {
    let row = '';
    for (let x = 0; x < 8; x++) {
      const ex = x === 0 ? 8 : x === 7 ? 2 : 0, ey = y === 0 ? 1 : y === 7 ? 4 : 0;
      if (!ex && !ey) row += '#';
      else if (ex && ey) row += m & (ex | ey) ? 'o' : ' ';  // corners round off unless joined
      else row += m & (ex | ey) ? '#' : 'o';
    }
    out.push(row);
  }
  return out;
}

const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));

export default function create(host) {
  const ctx = host.ctx, W = host.w, H = host.h, K = host.k;
  const COLS = Math.floor(W / CELL), ROWS = Math.floor((H - HUD) / CELL), CAP = COLS * ROWS;
  const FX = (W - COLS * CELL) >> 1;
  const FY = HUD + ((H - HUD - ROWS * CELL) >> 1), FB = FY + ROWS * CELL;
  const extra = H - 144;
  const L = {   // title layout, stretched to the screen height
    t1: 12 + Math.round(extra * 0.14), t2: 31 + Math.round(extra * 0.14),
    sub: 51 + Math.round(extra * 0.18), swim: 66 + Math.round(extra * 0.36),
    m1: 98 + Math.round(extra * 0.55), m2: 110 + Math.round(extra * 0.58),
    best: 124 + Math.round(extra * 0.66), hint: 140 + Math.round(extra * 0.73)
  };

  /* ---------------- sprites (drawn once, at the screen's pixel multiple) ---------------- */
  function sprite(w, h, paint) {
    const { canvas, ctx: g } = makeCanvas(w, h, K);
    paint(g);
    return canvas;
  }
  // Renders a snake grid; '#' pixels on the top/left edge of the silhouette are lit, bottom/right shaded.
  function piece(g, links, pal) {
    const w = g[0].length, h = g.length;
    const solid = (x, y) => {
      if (x < 0) return !!(links & 8);
      if (x >= w) return !!(links & 2);
      if (y < 0) return !!(links & 1);
      if (y >= h) return !!(links & 4);
      const ch = g[y][x];
      return ch !== ' ' && ch !== 'o';
    };
    return sprite(w, h, (c) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ch = g[y][x];
          if (ch === ' ') continue;
          let col;
          if (ch === 'o') col = INK;
          else if (ch !== '#') col = pal[ch];
          else if (!solid(x, y - 1) || !solid(x - 1, y)) col = pal.s;
          else if (!solid(x, y + 1) || !solid(x + 1, y)) col = pal.d;
          else col = pal.h;
          rect(c, col, x, y, 1, 1);
        }
      }
    });
  }
  const PALS = [TEAL, GOLD, BONE];
  const BODY = PALS.map((p) => { const a = []; for (let m = 0; m < 16; m++) a.push(piece(bodyGrid(m), m, p)); return a; });
  const back = (d) => 1 << ((d + 2) & 3);
  const TAILS = PALS.map((p) => [0, 1, 2, 3].map((d) => piece(turn(TAIL, d), back(d), p)));
  const HEADS = [TEAL, BONE].map((p) => [0, 1, 2, 3].map((d) => piece(turn(HEAD, d), back(d), p)));
  const KOS = [TEAL, BONE].map((p) => [0, 1, 2, 3].map((d) => piece(turn(HEAD_KO, d), back(d), p)));
  const TONGUES = [0, 1, 2, 3].map((d) => {
    const a = [];
    for (let i = 0; i < 8; i += 2) a.push(...turnPt(TONGUE[i], TONGUE[i + 1], 8, d));
    return a;
  });
  const FISHES = [FISH, mirror(FISH)].map((r) => sprite(8, 8, (c) => bitmap(c, r, 0, 0, 1, FISH_C)));
  const SHRIMPS = [SHRIMP, mirror(SHRIMP)].map((r) => sprite(8, 8, (c) => bitmap(c, r, 0, 0, 1, SHRIMP_C)));

  /* ---------------- the reef (painted once) ---------------- */
  const sandH = new Uint8Array(W);
  for (let x = 0; x < W; x++) sandH[x] = Math.max(1, Math.min(3, Math.round(1.6 + Math.sin(x * 0.21) * 0.7 + Math.sin(x * 0.053 + 2) * 0.8)));
  const GRASS = [5, 7, 9, 41, 44, 93, 96, 98, 141, 144, 152];     // seagrass blade x positions
  const GRASS_H = [5, 7, 4, 6, 4, 4, 7, 5, 6, 4, 5];

  const bg = sprite(W, H, (g) => {
    // water: a little lighter near the surface, darkest just above the sand
    const surface = mix(C.deep, C.sea, 0.12);
    const water = (y) => {
      const f = Math.max(0, Math.min(1, y / FB));
      return f < 0.4 ? mix(surface, C.deep, f / 0.4) : mix(C.deep, C.abyss, (f - 0.4) / 0.6);
    };
    for (let y = 0; y < H; y++) rect(g, water(y), 0, y, W, 1);
    // sun rays slanting down from the surface and fading out
    const rayLen = Math.round(FB * 0.62);
    for (const [x0, wd] of [[14, 8], [66, 12], [122, 7]]) {
      for (let y = 0; y < rayLen; y++) {
        const a = 0.13 * (1 - y / rayLen);
        rect(g, mix(water(y), C.foam, a), Math.round(x0 + y * 0.32), y, wd, 1);
      }
    }
    // sand
    for (let x = 0; x < W; x++) {
      const top = FB - sandH[x];
      rect(g, C.sand, x, top, 1, H - top);
      rect(g, '#fff0cc', x, top, 1, 1);
      if ((x * 7 + 3) % 11 < 2) rect(g, C.sandDark, x, top + 1 + (x & 1), 1, 1);
    }
    // a few things living on the bottom
    bitmap(g, ['c.c.c', 'c.c.c', '.ccc.', '..c..', '..c..'], 22, FB - 7, 1, { c: C.coral });
    bitmap(g, ['p..p', 'p.pp', 'ppp.', '.p..', '.p..'], 132, FB - 7, 1, { p: C.purple });
    bitmap(g, ['.o.', 'ooo', 'o.o'], 66, FB - 4, 1, { o: C.orange });
    bitmap(g, ['.pp.', 'pwpp'], 112, FB - 3, 1, { p: C.pink, w: '#ffc8d6' });
    bitmap(g, ['.gg.', 'gGGg'], 80, FB - 3, 1, { g: C.grayDark, G: C.gray });
    // seagrass stems (the tips sway, see drawScenery)
    for (let i = 0; i < GRASS.length; i++) {
      const x = GRASS[i], base = FB - sandH[x];
      rect(g, C.palmDark, x, base - GRASS_H[i] + 2, 1, GRASS_H[i] - 2);
    }
  });

  // checkerboard veil behind the pause and game-over panels
  const veil = sprite(W, H - HUD, (g) => {
    for (let y = 0; y < H - HUD; y++) for (let x = (y & 1); x < W; x += 2) rect(g, INK, x, y, 1, 1);
  });

  /* ---------------- state ---------------- */
  const SX = new Int8Array(CAP), SY = new Int8Array(CAP);      // ring buffer, head at hp
  const occ = new Uint8Array(CAP);
  const LX = new Int16Array(CAP + 1), LY = new Int16Array(CAP + 1);   // head-first copy for drawing
  let hp = 0, len = 0, grow = 0, dir = 1, q0 = 0, q1 = 0, qn = 0;
  let foodX = 0, foodY = 0, foodFace = 0, shrimpOn = false, shX = 0, shY = 0, shFace = 0, shLife = 0, shrimpIn = 0;
  let score = 0, best = Math.max(0, Number(host.store.get('best')) || 0);
  let state = 'title', stateT = 0, acc = 0, stepMs = 140, quip = '', newBest = false;
  let scoreStr = '0', bestHud = '', bestTitle = '', overScore = '', overBest = '';
  let t = 0, wt = 0, last = 0, raf = 0, stopped = true, frozen = false;

  function setBest() {
    bestHud = 'BEST ' + best;
    bestTitle = 'BEST ' + best;
  }
  setBest();

  // ambient bubbles
  const NB = 8;
  const bx = new Float32Array(NB), by = new Float32Array(NB), bs = new Float32Array(NB), bp = new Float32Array(NB), bz = new Uint8Array(NB);
  function bubble(i, anywhere) {
    bx[i] = 4 + Math.random() * (W - 8);
    by[i] = anywhere ? HUD + Math.random() * (FB - HUD) : FB + Math.random() * 30;
    bs[i] = 5 + Math.random() * 8;
    bp[i] = Math.random() * 6.28;
    bz[i] = Math.random() < 0.45 ? 1 : 0;
  }
  for (let i = 0; i < NB; i++) bubble(i, true);

  // burst bubbles and score popups
  const NP = 24;
  const px = new Float32Array(NP), py = new Float32Array(NP), pvx = new Float32Array(NP), pvy = new Float32Array(NP), pl = new Float32Array(NP);
  function burst(cx, cy, n) {
    for (let i = 0; i < NP && n > 0; i++) {
      if (pl[i] > 0) continue;
      px[i] = cx + (Math.random() * 6 - 3);
      py[i] = cy + (Math.random() * 4 - 2);
      pvx[i] = Math.random() * 24 - 12;
      pvy[i] = -12 - Math.random() * 22;
      pl[i] = 450 + Math.random() * 400;
      n--;
    }
  }
  const NU = 4;
  const ux = new Float32Array(NU), uy = new Float32Array(NU), ul = new Float32Array(NU), us = ['', '', '', ''], uc = us.slice();
  function popup(cx, cy, s, color) {
    let j = 0;
    for (let i = 1; i < NU; i++) if (ul[i] < ul[j]) j = i;
    ux[j] = cx; uy[j] = cy; ul[j] = 700; us[j] = s; uc[j] = color;
  }

  /* ---------------- rules ---------------- */
  const cellAt = (i) => (hp - i + CAP) % CAP;

  function begin() {
    occ.fill(0);
    len = 3; grow = 0; hp = 2; dir = 1; qn = 0;
    const r = ROWS >> 1;
    for (let i = 0; i < 3; i++) { SX[i] = 3 + i; SY[i] = r; occ[r * COLS + 3 + i] = 1; }
    score = 0; scoreStr = '0';
    shrimpOn = false; shrimpIn = 4 + Math.floor(Math.random() * 4);
    pl.fill(0); ul.fill(0);
    placeFood();
    speed();
    ready(900);
    host.sfx('select');
  }

  function ready(ms) {
    state = 'ready';
    stateT = ms;
    acc = 0;
  }

  function speed() {
    stepMs = 1000 / Math.min(14, 7 + (len + grow - 3) * 0.25);
  }

  // A random free cell, or -1 when the reef is full of snake.
  function freeCell() {
    let n = CAP - len - (shrimpOn ? 1 : 0);
    if (n <= 0) return -1;
    let r = Math.floor(Math.random() * n);
    for (let c = 0; c < CAP; c++) {
      if (occ[c] || (shrimpOn && c === shY * COLS + shX)) continue;
      if (r-- === 0) return c;
    }
    return -1;
  }

  function placeFood() {
    const c = freeCell();
    if (c < 0) return false;
    foodX = c % COLS; foodY = (c / COLS) | 0;
    foodFace = foodX < COLS / 2 ? 1 : 0;
    return true;
  }

  function placeShrimp() {
    const c = freeCell();
    if (c < 0 || c === foodY * COLS + foodX) return;
    shX = c % COLS; shY = (c / COLS) | 0;
    shFace = Math.random() < 0.5 ? 1 : 0;
    shLife = 5500;
    shrimpOn = true;
  }

  function step() {
    if (qn) { dir = q0; q0 = q1; qn--; }
    const hx = SX[hp] + DX[dir], hy = SY[hp] + DY[dir];
    if (hx < 0 || hy < 0 || hx >= COLS || hy >= ROWS) return die('wall');
    const tail = cellAt(len - 1), tc = SY[tail] * COLS + SX[tail];
    if (!grow) occ[tc] = 0;                       // the tail moves out of the way this step
    if (occ[hy * COLS + hx]) { occ[tc] = 1; return die('self'); }
    hp = (hp + 1) % CAP;
    SX[hp] = hx; SY[hp] = hy;
    occ[hy * COLS + hx] = 1;
    if (grow) { len++; grow--; }
    const cx = FX + hx * CELL + 4, cy = FY + hy * CELL + 4;
    if (hx === foodX && hy === foodY) {
      score += 1; grow += 1;
      eaten(cx, cy, '+1', C.yellow, 5);
      if (!shrimpOn && --shrimpIn <= 0) { placeShrimp(); shrimpIn = 5 + Math.floor(Math.random() * 4); }
      if (!placeFood()) return die('full');
    } else if (shrimpOn && hx === shX && hy === shY) {
      shrimpOn = false;
      score += 5; grow += 1;
      eaten(cx, cy, '+5', '#ffc8d6', 9);
    }
  }

  function eaten(cx, cy, s, color, n) {
    scoreStr = String(score);
    if (score > best) bestHud = 'BEST ' + score;
    host.sfx('eat');
    host.vibrate(10);
    burst(cx, cy, n);
    popup(cx, cy - 6, s, color);
    speed();
  }

  function die(kind) {
    const list = kind === 'full' ? QUIPS.full : score === 0 ? QUIPS.zero : QUIPS[kind];
    quip = list[Math.floor(Math.random() * list.length)];
    state = 'dying';
    stateT = 950;
    if (kind === 'full') host.sfx('win');
    else { host.sfx('die'); host.vibrate(10); }
    burst(FX + SX[hp] * CELL + 4, FY + SY[hp] * CELL + 2, 6);
  }

  function gameOver() {
    state = 'over';
    stateT = 0;
    newBest = score > best;
    if (newBest) {
      best = score;
      host.store.set('best', best);
      setBest();
      host.sfx('win');
    }
    overScore = String(score);
    overBest = String(best);
  }

  function quit() {
    if (score > best) { best = score; host.store.set('best', best); setBest(); }
    state = 'title';
    stateT = 0;
    host.sfx('back');
  }

  function steer(d) {
    if (state !== 'playing' && state !== 'ready') return;
    const cur = qn ? (qn === 2 ? q1 : q0) : dir;
    if (d === cur || d === ((cur + 2) & 3) || qn >= 2) return;
    if (qn === 0) q0 = d; else q1 = d;
    qn++;
  }

  /* ---------------- loop ---------------- */
  function update(dt) {
    t += dt;
    if (state === 'paused') return;
    wt += dt;
    stateT += state === 'ready' || state === 'dying' ? -dt : dt;
    if (state === 'ready' && stateT <= 0) { state = 'playing'; acc = 0; }
    else if (state === 'dying' && stateT <= 0) gameOver();
    else if (state === 'playing') {
      if (shrimpOn && (shLife -= dt) <= 0) {
        shrimpOn = false;
        burst(FX + shX * CELL + 4, FY + shY * CELL + 4, 3);
      }
      acc += dt;
      while (acc >= stepMs && state === 'playing') { acc -= stepMs; step(); }
    }
    const top = state === 'title' ? -4 : FY;
    for (let i = 0; i < NB; i++) { by[i] -= bs[i] * dt / 1000; if (by[i] < top) bubble(i, false); }
    for (let i = 0; i < NP; i++) {
      if (pl[i] <= 0) continue;
      pl[i] -= dt;
      px[i] += pvx[i] * dt / 1000; py[i] += pvy[i] * dt / 1000;
      pvx[i] *= 0.94;
    }
    for (let i = 0; i < NU; i++) if (ul[i] > 0) { ul[i] -= dt; uy[i] -= dt * 0.012; }
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(100, ts - last) : 16;
    last = ts;
    update(dt);
    draw();
  }

  /* ---------------- drawing ---------------- */
  function txt(s, x, y, color, align = 'center', size = 8, font = 'PS2P') {
    pxText(ctx, s, x + 1, y + 1, INK, size, align, font);
    pxText(ctx, s, x, y, color, size, align, font);
  }
  function big(s, x, y, color) {
    pxText(ctx, s, x + 1, y + 2, INK, 16, 'center');
    for (let i = 0; i < 8; i += 2) pxText(ctx, s, x + OUTLINE[i], y + OUTLINE[i + 1], INK, 16, 'center');
    pxText(ctx, s, x, y, color, 16, 'center');
  }
  function panel(x, y, w, h) {
    rect(ctx, INK, x + 1, y, w - 2, h);
    rect(ctx, INK, x, y + 1, w, h - 2);
    frame(ctx, C.teal, x + 1, y + 1, w - 2, h - 2);
    rect(ctx, C.navy, x + 2, y + 2, w - 4, h - 4);
  }

  function drawScenery() {
    ctx.drawImage(bg, 0, 0, W, H);
    for (let i = 0; i < GRASS.length; i++) {
      const x = GRASS[i], top = FB - sandH[x] - GRASS_H[i];
      const sway = Math.round(Math.sin(wt / 650 + x * 0.7) * 1.2);
      rect(ctx, C.palm, x, top + 1, 1, 1);
      rect(ctx, C.green, x + sway, top, 1, 1);
    }
    for (let i = 0; i < NB; i++) {
      const x = Math.round(bx[i] + Math.sin(wt / 700 + bp[i]) * 1.5), y = Math.round(by[i]);
      if (y > FB - 3) continue;
      if (bz[i]) {
        rect(ctx, '#8fd0f5', x + 1, y, 1, 1); rect(ctx, '#8fd0f5', x, y + 1, 1, 1);
        rect(ctx, '#8fd0f5', x + 2, y + 1, 1, 1); rect(ctx, '#8fd0f5', x + 1, y + 2, 1, 1);
      } else rect(ctx, '#6fb6e6', x, y, 1, 1);
    }
  }

  const dirOf = (dx, dy) => (dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3);

  // Draws LX/LY[0..n) (head first) with cell (0,0) at (ox, oy).
  function drawSnake(ox, oy, n, ko, bleach, tongue) {
    for (let i = n - 1; i >= 0; i--) {
      const x = ox + LX[i] * CELL, y = oy + LY[i] * CELL;
      if (i === 0) {
        // the head sprite is 8x10 (or 10x8), centred across its cell
        const d = dirOf(LX[0] - LX[1], LY[0] - LY[1]), side = d & 1;
        const hx = side ? x : x - 1, hy = side ? y - 1 : y;
        if (tongue && !ko) {
          const tg = TONGUES[d];
          for (let j = 0; j < 8; j += 2) rect(ctx, C.red, hx + tg[j], hy + tg[j + 1], 1, 1);
        }
        ctx.drawImage((ko ? KOS : HEADS)[bleach ? 1 : 0][d], hx, hy, side ? 8 : 10, side ? 10 : 8);
      } else if (i === n - 1) {
        ctx.drawImage(TAILS[bleach ? 2 : i & 1][dirOf(LX[i] - LX[i - 1], LY[i] - LY[i - 1])], x, y, CELL, CELL);
      } else {
        const m = (1 << dirOf(LX[i - 1] - LX[i], LY[i - 1] - LY[i])) | (1 << dirOf(LX[i + 1] - LX[i], LY[i + 1] - LY[i]));
        ctx.drawImage(BODY[bleach ? 2 : i & 1][m], x, y, CELL, CELL);
      }
    }
  }

  function drawTitle() {
    drawScenery();
    big('SEA', W / 2, L.t1, C.teal);
    big('SNAKE', W / 2, L.t2, C.yellow);
    txt('eat fish. dodge reef.', W / 2, L.sub, C.foam, 'center', 12, 'VT323');
    // demo snake chasing a fish across the screen
    const s = stateT * 0.005, n = Math.floor(s) % 64;
    for (let i = 0; i < DEMO_LEN; i++) {
      const m = n - i, q = Math.floor(m / 8), r = m - q * 8;
      LX[i] = q * 4 + TX[r]; LY[i] = TY[r];
    }
    const fx = Math.round(-8 + ((s % 64) * 0.5 + 2.4) * CELL);
    ctx.drawImage(FISHES[1], fx, L.swim + 8 + (Math.sin(wt / 160) > 0 ? 0 : 1), CELL, CELL);
    drawSnake(-8, L.swim + 16, DEMO_LEN, false, false, (wt % 1400) < 220);
    if ((t % 1100) < 750) txt('A: START', W / 2, L.m1, C.white);
    txt('B: EXIT', W / 2, L.m2, C.gray);
    txt(bestTitle, W / 2, L.best, C.yellow);
    if (L.hint + 10 <= FB) txt('swipe, tap or d-pad to steer', W / 2, L.hint, C.sea, 'center', 10, 'VT323');
  }

  function drawGame() {
    drawScenery();
    // food
    const bob = Math.sin(wt / 260) > 0 ? 0 : 1;
    ctx.drawImage(FISHES[foodFace], FX + foodX * CELL, FY + foodY * CELL - 1 + bob, CELL, CELL);
    if (shrimpOn && (shLife > 1600 || Math.floor(shLife / 110) % 2)) {
      ctx.drawImage(SHRIMPS[shFace], FX + shX * CELL, FY + shY * CELL - bob, CELL, CELL);
    }
    // burst bubbles rise out from under the snake
    for (let i = 0; i < NP; i++) {
      if (pl[i] <= 0) continue;
      const x = Math.round(px[i]), y = Math.round(py[i]);
      if (pl[i] > 300) { rect(ctx, C.foam, x, y, 2, 2); rect(ctx, '#8fd0f5', x + 1, y + 1, 1, 1); }
      else rect(ctx, '#8fd0f5', x, y, 1, 1);
    }
    // snake
    for (let i = 0; i < len; i++) { const c = cellAt(i); LX[i] = SX[c]; LY[i] = SY[c]; }
    const dead = state === 'dying' || state === 'over';
    drawSnake(FX, FY, len, dead, state === 'dying' && Math.floor(stateT / 90) % 2 === 0, !dead && (wt % 2600) < 200);
    for (let i = 0; i < NU; i++) if (ul[i] > 0) txt(us[i], Math.round(ux[i]), Math.round(uy[i]) - 8, uc[i]);
    // HUD
    rect(ctx, C.navy, 0, 0, W, HUD);
    rect(ctx, '#00134a', 0, HUD - 1, W, 1);
    ctx.drawImage(FISHES[1], 2, 1, CELL, CELL);
    pxText(ctx, scoreStr, 12, 2, C.white);
    pxText(ctx, bestHud, W - 2, 2, C.yellow, 8, 'right');

    const mid = FY + ((FB - FY) >> 1);
    if (state === 'ready') {
      const hy = FY + SY[hp] * CELL;
      txt('READY?', W / 2, hy < mid ? mid + 20 : mid - 28, C.yellow);
    } else if (state === 'paused') {
      ctx.drawImage(veil, 0, HUD, W, H - HUD);
      panel(18, mid - 33, W - 36, 66);
      big('PAUSED', W / 2, mid - 24, C.yellow);
      txt('A: RESUME', W / 2, mid + 2, C.white);
      txt('B: QUIT', W / 2, mid + 16, C.gray);
    } else if (state === 'over') {
      ctx.drawImage(veil, 0, HUD, W, H - HUD);
      const y = mid - 47;
      panel(4, y, W - 8, 94);
      big('GAME OVER', W / 2, y + 8, C.coral);
      txt(quip, W / 2, y + 28, C.foam);
      txt('SCORE', 28, y + 44, C.white, 'left');
      txt(overScore, W - 28, y + 44, C.white, 'right');
      txt('BEST', 28, y + 56, C.yellow, 'left');
      txt(overBest, W - 28, y + 56, C.yellow, 'right');
      if (newBest) txt('NEW BEST!', W / 2, y + 68, (t % 500) < 250 ? C.lime : C.yellow);
      txt('A: AGAIN  B: EXIT', W / 2, y + 82, C.white);
    }
  }

  function draw() {
    if (state === 'title') drawTitle();
    else drawGame();
  }

  /* ---------------- the contract ---------------- */
  function run() {
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  return {
    start() {
      stopped = false;
      frozen = false;
      state = 'title';
      stateT = 0;
      run();
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      raf = 0;
    },
    pause() {
      if (stopped || frozen) return;
      frozen = true;
      cancelAnimationFrame(raf);
      raf = 0;
      if (state === 'playing' || state === 'ready') state = 'paused';
      draw();
    },
    resume() {
      if (stopped || !frozen) return;
      frozen = false;
      run();
    },
    button(name, down) {
      if (!down || stopped || frozen) return;
      const d = DIRS[name];
      if (state === 'title') {
        if (name === 'a' || name === 'start') begin();
        else if (name === 'b') { host.sfx('back'); host.exit(); }
      } else if (state === 'ready' || state === 'playing') {
        if (d !== undefined) steer(d);
        else if (name === 'start' || name === 'b') { state = 'paused'; host.sfx('blip'); }
      } else if (state === 'paused') {
        if (name === 'a' || name === 'start') { ready(600); host.sfx('blip'); }
        else if (name === 'b') quit();
      } else if (state === 'over' && stateT > 450) {
        if (name === 'a' || name === 'start') begin();
        else if (name === 'b') { host.sfx('back'); host.exit(); }
      }
    },
    tap(x, y) {
      if (stopped || frozen) return;
      if (state === 'title' || (state === 'over' && stateT > 450)) { begin(); return; }
      if (state === 'paused') { ready(600); host.sfx('blip'); return; }
      if (state !== 'playing' && state !== 'ready') return;
      const cur = qn ? (qn === 2 ? q1 : q0) : dir;
      const hx = FX + SX[hp] * CELL + 4, hy = FY + SY[hp] * CELL + 4;
      if (cur === 1 || cur === 3) { if (y < hy - 4) steer(0); else if (y > hy + 4) steer(2); }
      else if (x < hx - 4) steer(3); else if (x > hx + 4) steer(1);
    },
    swipe(d) {
      if (!stopped && !frozen && DIRS[d] !== undefined) steer(DIRS[d]);
    }
  };
}
