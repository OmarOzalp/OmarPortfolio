// fish.js — FISH ON!, OZ BOY's fishing game: hold to cast, strike when the bobber dips, then keep the
// fish inside the green bar until it's landed. The fish log (count + best weight per species) lives in host.store.

import { C, makeCanvas, rect, frame, pxText, bitmap } from '../pixel.js';

/* ---------------- palette extras ---------------- */
const SKY = ['#86d0fb', '#a8dffd', '#cbeeff'];
const SIL = ['#1574ab', '#052f5c', '#01152b'];   // fish shadows in the sea / deep / abyss bands
const SURF = '#6fd0f4', LINE = '#ffffff', WET = '#9ad8f2', ROD = '#2b2f3a';
const SAND = ['#d9bc7c', '#c2a263', '#a8894f'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TAPER = [0, 0, 1, 2, 4, 6, 9];
const ANGLES = [-40, -20, 0, 20, 40];
const ACTIVE = { fly: 1, wait: 1, bite: 1, hooked: 1, fight: 1, landed: 1 };
// The bobber, row by row: x offset, width, color, y offset from its waterline.
const BOBBER = [[0, 1, C.ink, -6], [0, 1, C.ink, -5], [-1, 3, C.red, -4], [-2, 5, C.red, -3], [-2, 5, C.white, -2], [-1, 3, C.white, -1]];

/* ---------------- fish ---------------- */
// Body half-height along the fish, u = 0 at the tail and 1 at the nose.
const sleek = (u) => Math.max(0.3, Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.6));
const deep = (u) => Math.max(0.32, Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.5));
const chunky = (u) => Math.max(0.42, Math.pow(Math.sin(Math.PI * Math.pow(u, 0.9)), 0.35));

// near/far: how common each one is on a short vs a long cast. Fight: speed and jit (how often it
// changes its mind) move the fish on the meter, dart is the chance of a sudden run, sink pulls it
// toward the bottom, pull drags the catch bar down, bar is the bar's size, fill/drain per second.
const SPECIES = [
  { id: 'mackerel', name: 'MACKEREL', min: 0.3, max: 1.6, near: 50, far: 18,
    speed: 0.55, jit: 0.9, dart: 0, sink: 0, pull: 0, bar: 0.32, fill: 0.34, drain: 0.16,
    hint: 'LIGHT ONE.', line: 'TACO NIGHT: SORTED.', ribbon: '#2a7f80', ink: C.white,
    shape: { len: 20, ht: 6, tail: 4, prof: sleek, finH: 1, fin: [0.38, 0.62], eye: 0.86, mouth: 1,
      paint: (x, y, dy) => (dy < 0 && (x + (y & 1)) % 3 === 0 ? 's' : null) },
    pal: { b: '#2f8f8c', s: '#173f50', w: '#e8f2f4', f: '#2a7078', g: '#226068' } },
  { id: 'snapper', name: 'SNAPPER', min: 0.8, max: 6.5, near: 30, far: 30,
    speed: 0.75, jit: 1.3, dart: 0.12, sink: 0.1, pull: 0.2, bar: 0.3, fill: 0.32, drain: 0.2,
    hint: 'DECENT PULL!', line: 'RED, RUDE, DELICIOUS.', ribbon: '#d8404f', ink: C.white,
    shape: { len: 20, ht: 10, tail: 4, prof: deep, finH: 2, fin: [0.25, 0.7], eye: 0.82, mouth: 2,
      paint: (x, y, dy, hh) => (dy > hh * 0.35 ? 'w' : (x + y) % 4 === 0 ? 's' : 'b') },
    pal: { b: '#e44d5c', s: '#ff8790', w: '#ffd2c8', f: '#c9344b', g: '#b82d44' } },
  { id: 'grouper', name: 'GROUPER', min: 5, max: 28, near: 8, far: 22,
    speed: 0.42, jit: 0.7, dart: 0.05, sink: 0.45, pull: 1.05, bar: 0.3, fill: 0.16, drain: 0.19,
    hint: 'HEAVY ONE!!', line: 'ABSOLUTE UNIT.', ribbon: '#6e5a3c', ink: C.cream,
    shape: { len: 24, ht: 12, tail: 4, prof: chunky, finH: 2, fin: [0.2, 0.68], eye: 0.84, mouth: 3,
      paint: (x, y, dy, hh) => (dy > hh * 0.45 ? 'w' : (x * 5 + y * 3) % 7 === 0 || (x * 3 + y * 5) % 11 === 0 ? 's' : 'b') },
    pal: { b: '#8d7552', s: '#5a4730', w: '#cdb68a', f: '#6c5a3c', g: '#5f4e34' } },
  { id: 'yellowtail', name: 'YELLOWTAIL', min: 4, max: 16, near: 3, far: 15,
    speed: 0.85, jit: 1.5, dart: 0.22, sink: 0, pull: 0.1, bar: 0.3, fill: 0.3, drain: 0.24,
    hint: "IT'S FAST!!", line: 'LIKE THE ONE IN PICS!', ribbon: C.navy, ink: C.yellow,
    shape: { len: 26, ht: 8, tail: 6, prof: sleek, finH: 2, fin: [0.38, 0.62], eye: 0.87, mouth: 2,
      paint: (x, y, dy) => (Math.abs(dy + 0.5) < 0.1 && x < 23 ? 'y' : null) },
    pal: { b: '#3c6ca8', y: C.yellow, w: '#eef4f8', f: '#ffcc2a', g: '#2c5488' } },
  { id: 'boot', name: 'OLD BOOT', min: 0.4, max: 1.3, near: 6, far: 7,
    speed: 0.12, jit: 0.4, dart: 0, sink: 0.2, pull: 0, bar: 0.4, fill: 0.7, drain: 0.08,
    hint: 'FEELS... SOGGY?', line: 'STILL COUNTS.', ribbon: C.woodDark, ink: C.cream,
    rows: [
      '                ',
      '      gg        ',
      '     g          ',
      '   ccgccc       ',
      '   bbbbbb       ',
      '   bbbblb       ',
      '   bbbbbl       ',
      '   bbbblb       ',
      '   bbbbbllbb    ',
      '   bbbbbbbbbbb  ',
      '   bbbbbbbbbbbb ',
      '   ssssssssssss ',
      '                '],
    pal: { b: '#6e4b2e', c: '#9a7048', l: C.paper, s: '#33241a', g: '#3fa65a' } }
];

const OMAR = [
  '  hhhhh  ',
  ' hhhhhhh ',
  ' hhhhhhhh',
  ' hhhsssss',
  ' hhssskss',
  '  hssssss',
  '   ssss  ',
  '   nnnn  ',
  ' nnnnnnss',
  ' nnnnnnn ',
  ' nnnnnnn ',
  ' nnnnnnn ',
  ' ccccccc '];
const CLOUD = [
  '     wwww         ',
  '  wwwwwwwww  ww   ',
  ' wwwwwwwwwwwwwwww ',
  'wwwwwwwwwwwwwwwwww',
  ' ssssssssssssssss '];
const PUFF = [
  '   www    ',
  ' wwwwwwww ',
  'wwwwwwwwww',
  ' ssssssss '];
const GULL = [['g   g', ' g g ', '  g  '], ['     ', 'gg gg', '  g  ']];

/* ---------------- pixel grids ---------------- */
function blank(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(' '));
  return g;
}

// A fish drawn from a few numbers: body profile, forked tail, swept-back dorsal fin, gill, eye, mouth.
// Returns the fill grid (no outline yet) and the mouth position, where the line attaches.
function fishGrid(f) {
  const L = f.len, T = f.tail, B = f.ht, top = f.finH || 0;
  const w = L + 2, h = B + top + 2, bodyL = L - T, cy = 1 + top + B / 2, yc = Math.floor(cy);
  const g = blank(w, h);
  const half = (x) => (B / 2) * f.prof((x - T + 0.5) / bodyL);
  for (let x = 0; x < L; x++) {
    for (let y = 0; y < h; y++) {
      const dy = y + 0.5 - cy, a = Math.abs(dy);
      if (x >= T) {
        const hh = half(x);
        if (a <= hh) g[y][x + 1] = (f.paint && f.paint(x, y, dy, hh)) || (dy < 0 ? 'b' : 'w');
      } else {
        const v = (T - x) / T;
        if (a <= (B / 2) * (0.25 + 0.8 * v) && a > (B / 2) * (v - 0.4)) g[y][x + 1] = 'f';
      }
    }
  }
  if (top && f.fin) {
    for (let x = T; x < L; x++) {
      const u = (x - T + 0.5) / bodyL;
      if (u < f.fin[0] || u > f.fin[1]) continue;
      const fh = Math.ceil(top * (f.fin[1] - u) / (f.fin[1] - f.fin[0]));
      let yt = 0;
      while (yt < h - 1 && g[yt][x + 1] === ' ') yt++;
      for (let k = 1; k <= fh && yt - k >= 0; k++) g[yt - k][x + 1] = 'f';
    }
  }
  if (B >= 8) {
    const gx = T + Math.round(bodyL * 0.7), hh = half(gx);
    for (let y = 0; y < h; y++) {
      if (Math.abs(y + 0.5 - cy) < hh * 0.7 && g[y][gx + 1] !== ' ') g[y][gx + 1] = 'g';
    }
  }
  const ex = T + Math.round(bodyL * (f.eye || 0.85)), ey = Math.floor(cy - half(ex) * 0.45);
  g[ey][ex + 1] = 'k';
  if (B >= 8) g[ey][ex] = 'e';
  for (let i = 0; i < (f.mouth || 0); i++) if (g[yc][L - i] !== ' ') g[yc][L - i] = 'k';
  return { grid: g, ax: L, ay: yc };
}

function outline(g) {
  const h = g.length, w = g[0].length, out = g.map((r) => r.slice());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (g[y][x] !== ' ') continue;
      if ((x > 0 && g[y][x - 1] !== ' ') || (x < w - 1 && g[y][x + 1] !== ' ') ||
        (y > 0 && g[y - 1][x] !== ' ') || (y < h - 1 && g[y + 1][x] !== ' ')) out[y][x] = 'o';
    }
  }
  return out;
}

// Nearest-neighbour rotation on the pixel grid (positive = clockwise on screen), so tilted fish stay crisp.
function rotate(g, deg) {
  const h = g.length, w = g[0].length, a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const w2 = Math.ceil(Math.abs(w * c) + Math.abs(h * s)) + 2, h2 = Math.ceil(Math.abs(w * s) + Math.abs(h * c)) + 2;
  const out = blank(w2, h2);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      const dx = x + 0.5 - w2 / 2, dy = y + 0.5 - h2 / 2;
      const sx = Math.floor(c * dx + s * dy + w / 2), sy = Math.floor(-s * dx + c * dy + h / 2);
      if (sx >= 0 && sy >= 0 && sx < w && sy < h) out[y][x] = g[sy][sx];
    }
  }
  return out;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default function create(host) {
  const ctx = host.ctx, W = host.w, H = host.h, K = host.k;
  const waterY = Math.max(44, Math.round(H * 0.3));
  const bedY = H - Math.max(12, Math.round(H * 0.07));
  const band1 = waterY + Math.round((bedY - waterY) * 0.34);
  const band2 = waterY + Math.round((bedY - waterY) * 0.68);
  const BX = -4, BW = 40, OX = 15, RODLEN = 20;
  const MX = W - 29, MY = 4, MW = 26, MH = H - 8;           // fight meter panel
  const TX = MX + 4, TW = 13, TY = MY + 6, TH = MH - 12;    // its track
  const GX = MX + 19;                                       // its progress gauge
  const CW = 152, CH = 124, CX = 4;                         // catch card

  /* ---------------- sprites ---------------- */
  function sprite(grid, colors, flip) {
    const h = grid.length, w = grid[0].length;
    const { canvas, ctx: g } = makeCanvas(w, h, K);
    bitmap(g, flip ? grid.map((r) => r.slice().reverse()) : grid, 0, 0, 1, colors);
    return { cv: canvas, w, h };
  }
  const silColors = SIL.map((c) => ({ b: c, w: c, s: c, f: c, g: c, k: c, e: c, y: c, l: c, c }));
  const kinds = SPECIES.map((s) => {
    const made = s.rows ? { grid: s.rows.map((r) => r.split('')), ax: 4, ay: 3 } : fishGrid(s.shape);
    return Object.assign({}, s, made, { colors: Object.assign({ o: C.ink, k: C.ink, e: C.white }, s.pal), spr: [] });
  });
  // Sprites per species are made on first use: 0-1 full colour, 2-7 shadows per band, 8-17 tilted.
  function spr(kd, i) {
    if (kd.spr[i]) return kd.spr[i];
    const flip = i & 1;
    let s;
    if (i < 2) s = sprite(outline(kd.grid), kd.colors, flip);
    else if (i < 8) s = sprite(kd.grid, silColors[(i - 2) >> 1], flip);
    else s = sprite(outline(rotate(kd.grid, ANGLES[(i - 8) >> 1])), kd.colors, flip);
    return (kd.spr[i] = s);
  }
  const ambShapes = [
    fishGrid({ len: 7, ht: 3, tail: 2, prof: sleek }),
    fishGrid({ len: 10, ht: 4, tail: 3, prof: sleek }),
    fishGrid({ len: 13, ht: 6, tail: 3, prof: deep, finH: 1, fin: [0.3, 0.6] })
  ].map((f) => [0, 1, 2].map((b) => [sprite(f.grid, silColors[b], 0), sprite(f.grid, silColors[b], 1)]));
  const icon = sprite(outline(fishGrid({ len: 9, ht: 4, tail: 3, prof: sleek, eye: 0.8 }).grid),
    { o: C.ink, k: C.ink, b: C.orange, w: C.yellow, f: C.orange, e: C.white }, 0);
  const omar = sprite(OMAR, { h: C.hair, s: C.skin, k: C.ink, n: C.navy, c: '#c9b48a' }, 0);
  const cloudSpr = [sprite(CLOUD, { w: C.white, s: '#d9effc' }, 0), sprite(PUFF, { w: C.white, s: '#d9effc' }, 0)];
  const gullSpr = GULL.map((g) => sprite(g, { g: '#3b4a66' }, 0));

  /* ---------------- static background ---------------- */
  function dither(g, color, x0, y0, w, rows, from, to) {
    g.fillStyle = color;
    for (let i = 0; i < rows; i++) {
      const lim = (from + (to - from) * (i + 1) / (rows + 1)) * 16;
      for (let x = x0; x < x0 + w; x++) if (BAYER[((y0 + i) & 3) * 4 + (x & 3)] < lim) g.fillRect(x, y0 + i, 1, 1);
    }
  }
  function buildBg() {
    const { canvas, ctx: g } = makeCanvas(W, H, K);
    const s1 = Math.round(waterY * 0.42), s2 = Math.round(waterY * 0.76);
    rect(g, SKY[0], 0, 0, W, s1);
    rect(g, SKY[1], 0, s1, W, s2 - s1);
    rect(g, SKY[2], 0, s2, W, waterY - s2);
    dither(g, SKY[1], 0, s1 - 3, W, 3, 0, 1);
    dither(g, SKY[2], 0, s2 - 3, W, 3, 0, 1);
    // the sun, with a dithered glow
    const sx = W - 14, sy = 10;
    for (let dy = -9; dy <= 9; dy++) {
      for (let dx = -9; dx <= 9; dx++) {
        const d = dx * dx + dy * dy;
        if (d > 81 || d <= 42) continue;
        if (BAYER[((sy + dy) & 3) * 4 + ((sx + dx) & 3)] < 6) rect(g, '#fff4b8', sx + dx, sy + dy, 1, 1);
      }
    }
    for (let dy = -6; dy <= 6; dy++) {
      const hw = Math.round(Math.sqrt(42 - dy * dy));
      rect(g, C.yellow, sx - hw, sy + dy, hw * 2, 1);
    }
    rect(g, '#fff6c2', sx - 3, sy - 4, 3, 1);
    rect(g, '#fff6c2', sx - 4, sy - 3, 2, 2);
    // a far-off island with one palm
    const ix = 124, iy = waterY - 1;
    rect(g, '#7cc49a', ix + 4, iy - 2, 12, 1);
    rect(g, '#6bb88c', ix + 1, iy - 1, 19, 1);
    rect(g, '#e8dcae', ix, iy, 22, 1);
    for (let i = 0; i < 6; i++) rect(g, '#9a7a5a', ix + 9 + (i > 3 ? 1 : 0), iy - 3 - i, 1, 1);
    rect(g, '#4f9e72', ix + 7, iy - 9, 6, 1);
    rect(g, '#4f9e72', ix + 6, iy - 8, 2, 1);
    rect(g, '#4f9e72', ix + 12, iy - 8, 2, 1);
    rect(g, '#4f9e72', ix + 5, iy - 7, 1, 1);
    rect(g, '#4f9e72', ix + 14, iy - 7, 1, 1);
    // water, darker with depth
    rect(g, C.sea, 0, waterY, W, band1 - waterY);
    rect(g, C.deep, 0, band1, W, band2 - band1);
    rect(g, C.abyss, 0, band2, W, bedY - band2 + 4);
    dither(g, C.deep, 0, band1 - 4, W, 4, 0, 1);
    dither(g, C.abyss, 0, band2 - 4, W, 4, 0, 1);
    rect(g, SURF, 0, waterY, W, 1);
    // sun rays slanting down through the top band
    for (let r = 0; r < 3; r++) {
      const x0 = 70 + r * 34;
      for (let y = waterY + 2; y < band1 - 2; y++) {
        const fade = 1 - (y - waterY) / (band1 - waterY);
        const x = Math.round(x0 - (y - waterY) * 0.5);
        for (let k = 0; k < 4; k++) if (BAYER[(y & 3) * 4 + ((x + k) & 3)] < fade * 9) rect(g, '#46b9e8', x + k, y, 1, 1);
      }
    }
    // the seabed: sand, rocks, a starfish, a shell, a little coral
    for (let x = 0; x < W; x++) {
      const top = bedY + Math.round(Math.sin(x * 0.09) * 1.5 + Math.sin(x * 0.23 + 1) * 0.8);
      rect(g, SAND[0], x, top, 1, H - top);
      rect(g, SAND[1], x, top + 4, 1, H - top);
      if ((x * 7) % 5 === 0) rect(g, SAND[2], x, top + 2 + (x % 3), 1, 1);
    }
    const rock = (x, y, w, h) => {
      for (let r = 0; r < h; r++) {
        const d = (h - r - 0.5) / h, hw = Math.round((w / 2) * Math.sqrt(1 - d * d));
        const cx = x + w / 2;
        rect(g, '#5b6478', Math.round(cx - hw), y + r, hw * 2, 1);
        rect(g, '#454d60', Math.round(cx + hw * 0.3), y + r, Math.ceil(hw * 0.7), 1);
        if (r < h * 0.5) rect(g, '#7d879c', Math.round(cx - hw * 0.6), y + r, Math.max(1, Math.round(hw * 0.5)), 1);
      }
    };
    rock(112, bedY - 5, 18, 8);
    rock(24, bedY - 2, 10, 5);
    rock(126, bedY - 1, 8, 4);
    bitmap(g, ['  c  ', 'ccccc', ' ccc ', ' c c '], 82, bedY + 2, 1, { c: C.coral });
    bitmap(g, [' pp ', 'pppp'], 46, bedY + 4, 1, { p: '#ffc8c8' });
    bitmap(g, ['p p p', 'p p p', ' ppp ', '  p  ', '  p  '], 146, bedY - 3, 1, { p: C.pink });
    return canvas;
  }
  const bg = buildBg();

  // Fight meter frame, drawn once.
  function buildMeter() {
    const { canvas, ctx: g } = makeCanvas(MW, MH, K);
    rect(g, C.ink, 0, 0, MW, MH);
    rect(g, C.wood, 1, 1, MW - 2, MH - 2);
    rect(g, '#a8744a', 1, 1, MW - 2, 1);
    rect(g, C.woodDark, 2, MH - 3, MW - 4, 1);
    const tx = TX - MX, ty = TY - MY;
    rect(g, C.ink, tx - 1, ty - 1, TW + 2, TH + 2);
    rect(g, C.deep, tx, ty, TW, TH);
    rect(g, C.abyss, tx, ty + Math.round(TH * 0.55), TW, TH - Math.round(TH * 0.55));
    dither(g, C.abyss, tx, ty + Math.round(TH * 0.55) - 4, TW, 4, 0, 1);
    dither(g, C.sea, tx, ty, TW, 4, 0.8, 0);
    const gx = GX - MX;
    rect(g, C.ink, gx - 1, ty - 1, 6, TH + 2);
    rect(g, C.woodDark, gx, ty, 4, TH);
    // a little reel at the top
    rect(g, C.gray, tx + 3, 2, 7, 3);
    rect(g, C.grayDark, tx + 5, 3, 3, 1);
    return canvas;
  }
  const meter = buildMeter();

  /* ---------------- ambient life ---------------- */
  const clouds = [
    { s: cloudSpr[0], x: 18, y: 5, v: 2.2 },
    { s: cloudSpr[1], x: 92, y: Math.round(waterY * 0.48), v: 3.4 }
  ];
  const gull = { x: -30, y: 14, v: 9 };
  const amb = [];
  const bandRange = (b) => (b === 0 ? [waterY + 6, band1 - 6] : b === 1 ? [band1 + 4, band2 - 6] : [band2 + 4, bedY - 10]);
  for (let i = 0; i < 5; i++) {
    const b = i < 2 ? 0 : i < 4 ? 1 : 2, r = bandRange(b), dir = i % 2 ? -1 : 1;
    amb.push({ b, x: Math.random() * W, y: r[0] + Math.random() * (r[1] - r[0]), vx: dir * (5 + Math.random() * 8), shape: i % 3, ph: i });
  }
  const grassH = Math.max(8, Math.round((bedY - waterY) / 7));
  const grass = [6, 10, 31, 58, 62, 97, 136, 152].map((x, i) => ({ x, h: grassH + (i % 3) * 3 - 2, ph: i * 1.7, c: i % 2 ? '#2a7a44' : '#3fa65a' }));
  const parts = [], ripples = [], bubbles = [];
  for (let i = 0; i < 32; i++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0 });
  for (let i = 0; i < 5; i++) ripples.push({ on: false, x: 0, r: 0, life: 0 });
  for (let i = 0; i < 10; i++) bubbles.push({ on: false, x: 0, y: 0, v: 0, big: false });
  let bubbleT = 0;

  function splash(x, n, force) {
    for (let i = 0; i < parts.length && n > 0; i++) {
      const p = parts[i];
      if (p.on) continue;
      p.on = true; p.x = x + (Math.random() - 0.5) * 4; p.y = waterY - 1;
      p.vx = (Math.random() - 0.5) * 50 * force; p.vy = -(25 + Math.random() * 45) * force;
      n--;
    }
    ripple(x);
  }
  function ripple(x) {
    for (let i = 0; i < ripples.length; i++) {
      const r = ripples[i];
      if (r.on) continue;
      r.on = true; r.x = x; r.r = 1; r.life = 0.9;
      return;
    }
  }
  function bubble(x, y) {
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (b.on) continue;
      b.on = true; b.x = x; b.y = y; b.v = 9 + Math.random() * 7; b.big = Math.random() < 0.35;
      return;
    }
  }

  function updateAmbient(dt) {
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.x += c.v * dt;
      if (c.x > W + 4) c.x = -c.s.w - 4;
    }
    gull.x += gull.v * dt;
    if (gull.x > W + 20) { gull.x = -60 - Math.random() * 160; gull.y = 8 + Math.random() * Math.max(4, waterY - 30); }
    for (let i = 0; i < amb.length; i++) {
      const f = amb[i];
      f.x += f.vx * dt;
      if (f.x > W + 16 || f.x < -16) {
        const r = bandRange(f.b);
        f.x = f.vx > 0 ? -15 : W + 15;
        f.y = r[0] + Math.random() * (r[1] - r[0]);
      }
    }
    bubbleT -= dt;
    if (bubbleT <= 0) {
      bubbleT = 0.5 + Math.random() * 0.9;
      const gr = grass[(Math.random() * grass.length) | 0];
      bubble(gr.x, bedY - 2);
    }
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (!b.on) continue;
      b.y -= b.v * dt;
      if (b.y < waterY + 2) b.on = false;
    }
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p.on) continue;
      p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > waterY && p.vy > 0) p.on = false;
    }
    for (let i = 0; i < ripples.length; i++) {
      const r = ripples[i];
      if (!r.on) continue;
      r.r += 9 * dt; r.life -= dt;
      if (r.life <= 0) r.on = false;
    }
  }

  /* ---------------- state ---------------- */
  let raf = 0, running = false, hostPaused = false, paused = false, last = 0, t = 0;
  let phase = 'title', pt = 0, logOpen = false;
  let aDown = false, touchDown = false, sawPress = false, forced = null;
  let charging = false, chargeT = 0, power = 0, castPower = 0, rodAng = 50, rodFrom = 50, flyDur = 1;
  let lureX = 0, lureY = 0, landX = 0, hookY = 0, hookDepth = 0, tipX = 0, tipY = 0;
  let kd = kinds[0], biteAt = 0, nibA = -1, nibB = -1, dipT = 0, dir = 1;
  let fishX = 0, fishY = 0, fishLeft = false, fromX = 0, fromY = 0, fleeV = 0;
  let barPos = 0, barV = 0, fishPos = 0, fishV = 0, fishGoal = 0, fishTimer = 0, progress = 0, reelT = 0, inside = false;
  let weight = 0, record = false, kgText = '', subText = '', landX0 = 0, landY0 = 0, msgKind = '';
  let titleBest = '', logRows = [], logTotal = '', jumpSplash = -1;

  function setPhase(p) { phase = p; pt = 0; }
  function loadLog() {
    const l = host.store.get('log');
    return l && typeof l === 'object' ? l : {};
  }

  function enterTitle() {
    setPhase('title');
    charging = false;
    paused = false;
    const log = loadLog();
    let best = null, bestW = 0;
    for (let i = 0; i < kinds.length; i++) {
      const e = log[kinds[i].id];
      if (!e || !e.best) continue;
      if (kinds[i].id === 'yellowtail' || (e.best > bestW && (!best || best.id !== 'yellowtail'))) { best = kinds[i]; bestW = e.best; }
    }
    titleBest = best ? 'BEST: ' + bestW.toFixed(1) + ' KG ' + best.name : '';
  }

  function beginCast() {
    setPhase('cast');
    charging = false;
    power = 0;
    fleeV = 0;
  }

  function release() {
    charging = false;
    castPower = power;
    rodFrom = rodAng;
    landX = Math.round(48 + castPower * 100);
    flyDur = 0.55 + castPower * 0.35;
    host.sfx('cast');
    setPhase('fly');
  }

  function pickKind(p) {
    if (forced) {
      const f = kinds.find((k) => k.id === forced);
      forced = null;
      if (f) return f;
    }
    let total = 0;
    for (let i = 0; i < kinds.length; i++) total += kinds[i].near + (kinds[i].far - kinds[i].near) * p;
    let r = Math.random() * total;
    for (let i = 0; i < kinds.length; i++) {
      r -= kinds[i].near + (kinds[i].far - kinds[i].near) * p;
      if (r <= 0) return kinds[i];
    }
    return kinds[0];
  }

  function land() {
    host.sfx('splash');
    splash(landX, 8, 0.8);
    hookDepth = Math.round(waterY + 16 + castPower * (bedY - waterY - 38));
    hookY = waterY + 2;
    kd = pickKind(castPower);
    biteAt = 1.5 + Math.random() * 2.5;
    const arrive = biteAt * 0.6;
    nibA = biteAt > 2.3 ? arrive + Math.random() * (biteAt - arrive - 0.3) : -1;
    nibB = biteAt > 3.2 ? arrive + Math.random() * (biteAt - arrive - 0.3) : -1;
    dir = landX > W - 40 ? 1 : Math.random() < 0.5 ? 1 : -1;
    fromX = landX - dir * 60;
    fromY = hookDepth + (Math.random() - 0.5) * 20;
    fishX = fromX; fishY = fromY; fishLeft = dir < 0;
    dipT = 0;
    setPhase('wait');
  }

  function bite() {
    setPhase('bite');
    host.sfx('bite');
    host.vibrate(40);
    ripple(landX);
  }

  function miss(kind) {
    msgKind = kind;
    setPhase('msg');
    if (kind === 'snap') {
      host.sfx('snap');
      host.vibrate(30);
      fishLeft = false;
      fleeV = 90;
    } else {
      host.sfx('lose');
      fishLeft = dir > 0;
      fleeV = (dir > 0 ? -1 : 1) * (kind === 'early' ? 110 : 70);
      if (kind === 'early') ripple(landX);
    }
  }

  function hookIt() {
    setPhase('hooked');
    host.sfx('select');
    host.vibrate(60);
    splash(landX, 6, 0.6);
    barPos = 0; barV = 0;
    fishPos = kd.bar * 0.5; fishV = 0; fishGoal = fishPos; fishTimer = 0.4;
    progress = 0.3; reelT = 0; inside = true;
  }

  function caught() {
    host.sfx('catch');
    host.vibrate(120);
    weight = Math.round((kd.min + (kd.max - kd.min) * Math.pow(Math.random(), 1.6)) * 10) / 10;
    const log = loadLog(), e = log[kd.id] || { n: 0, best: 0 };
    record = weight > (e.best || 0);
    e.n = (e.n || 0) + 1;
    if (record) e.best = weight;
    log[kd.id] = e;
    host.store.set('log', log);
    kgText = weight.toFixed(1) + ' KG';
    subText = record ? '' : 'BEST ' + e.best.toFixed(1) + ' KG  x' + e.n;
    landX0 = fishX; landY0 = fishY;
    splash(clamp(fishX, 8, W - 36), 10, 1);
    setPhase('landed');
  }

  function openLog() {
    const log = loadLog();
    let total = 0;
    logRows = kinds.map((k) => {
      const e = log[k.id];
      const n = e && e.n ? e.n : 0;
      total += n;
      return { kd: k, got: n > 0, name: n ? k.name : '?????', n: n ? 'x' + n : '',
        best: n ? 'BEST ' + (e.best || 0).toFixed(1) + ' KG' : 'NOT CAUGHT YET' };
    });
    logTotal = total + ' CAUGHT';
    logOpen = true;
    host.sfx('blip');
  }
  function closeLog() { logOpen = false; host.sfx('back'); }

  /* ---------------- update ---------------- */
  function update(dt) {
    t += dt;
    updateAmbient(dt);
    if (logOpen) return;
    pt += dt;
    if (dipT > 0) dipT -= dt;
    switch (phase) {
      case 'cast':
        if (charging) {
          chargeT += dt;
          const ph = (chargeT * 1.25) % 2;
          power = ph < 1 ? ph : 2 - ph;
          rodAng = 55 + power * 65;
        } else rodAng += (52 - rodAng) * Math.min(1, dt * 8);
        break;
      case 'fly': {
        const u = Math.min(1, pt / flyDur);
        rodAng = pt < 0.1 ? rodFrom + (18 - rodFrom) * (pt / 0.1) : rodAng + (40 - rodAng) * Math.min(1, dt * 6);
        const sx = tipX, sy = tipY;
        lureX = sx + (landX - sx) * u;
        lureY = sy + (waterY - sy) * u - (18 + castPower * 26) * 4 * u * (1 - u);
        if (u >= 1) land();
        break;
      }
      case 'wait': {
        hookY = waterY + 2 + (hookDepth - waterY - 2) * Math.min(1, pt / 0.7);
        const arrive = biteAt * 0.6, q = Math.min(1, pt / arrive), e = 1 - (1 - q) * (1 - q);
        fishX = fromX + (landX - dir - fromX) * e + (q >= 1 ? Math.round(Math.sin(t * 5)) * dir : 0);
        fishY = fromY + (hookY - fromY) * e;
        if (nibA >= 0 && pt >= nibA) { nibA = -1; dipT = 0.16; ripple(landX); }
        if (nibB >= 0 && pt >= nibB) { nibB = -1; dipT = 0.16; ripple(landX); }
        if (pt >= biteAt) bite();
        break;
      }
      case 'bite':
        fishX = landX + dir;
        if (pt > 0.7) miss('away');
        break;
      case 'hooked':
        fishX += (clamp(landX, 40, 80) - fishX) * Math.min(1, dt * 2) + Math.sin(t * 40) * 0.6;
        fishY += (hookY - fishY) * Math.min(1, dt * 4);
        if (Math.random() < dt * 8) splash(fishX, 2, 0.5);
        if (pt > 0.9) setPhase('fight');
        break;
      case 'fight':
        fight(dt);
        break;
      case 'landed':
        if (pt > 1.05) { setPhase('card'); }
        break;
      case 'msg':
        fishX += fleeV * dt;
        if (pt > (msgKind === 'snap' ? 2.4 : 2)) beginCast();
        break;
    }
  }

  function fight(dt) {
    const hold = aDown || touchDown;
    // the catch bar: rises while held, falls (and bounces off the bottom) when let go
    barV += ((hold ? 3.5 - kd.pull : 0) - 1.9) * dt;
    barV = clamp(barV, -1.6, 1.4);
    barPos += barV * dt;
    const top = 1 - kd.bar;
    if (barPos < 0) { barPos = 0; barV = barV < -0.35 ? -barV * 0.35 : 0; }
    if (barPos > top) { barPos = top; if (barV > 0) barV = -barV * 0.15; }
    // the fish: picks a new spot every so often and springs toward it
    fishTimer -= dt;
    if (fishTimer <= 0) {
      fishTimer = (0.3 + Math.random() * 0.9) / kd.jit;
      if (Math.random() < kd.dart) fishGoal = fishPos > 0.5 ? 0.04 + Math.random() * 0.3 : 0.66 + Math.random() * 0.3;
      else fishGoal = fishPos + (Math.random() - 0.5) * 0.55;
      fishGoal -= kd.sink * fishGoal * Math.random();
      fishGoal = clamp(fishGoal, 0.04, 0.96);
    }
    const k = 30 * kd.speed, damp = 2 * Math.sqrt(k) * 0.7;
    fishV += ((fishGoal - fishPos) * k - fishV * damp) * dt;
    fishPos += fishV * dt;
    if (fishPos < 0.03 || fishPos > 0.97) { fishPos = clamp(fishPos, 0.03, 0.97); fishV = 0; }
    inside = fishPos >= barPos && fishPos <= barPos + kd.bar;
    progress += (inside ? kd.fill : -kd.drain) * dt;
    if (inside) {
      reelT -= dt;
      if (reelT <= 0) { host.sfx('reel'); reelT = 0.13; }
    }
    // where the fish is in the water follows the meter: high on the meter = near the surface
    const gx = clamp(landX, 40, 80) + Math.sin(t * 1.3) * 12;
    const gy = waterY + 12 + (1 - fishPos) * (bedY - waterY - 26);
    fishX += (gx - fishX) * Math.min(1, dt * 3);
    fishY += (gy - fishY) * Math.min(1, dt * 6);
    fishLeft = Math.cos(t * 1.3) < -0.2;
    if (fishPos > 0.86 && Math.random() < dt * 5) splash(fishX, 3, 0.6);
    if (Math.random() < dt * 1.5) bubble(fishX, fishY - 2);
    if (progress >= 1) { progress = 1; caught(); }
    else if (progress <= 0) { progress = 0; miss('snap'); }
  }

  /* ---------------- drawing helpers ---------------- */
  function line(x0, y0, x1, y1, color) {
    ctx.fillStyle = color;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 500; n++) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function curve(x0, y0, cx, cy, x1, y1, color, n) {
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      const x = a * x0 + b * cx + c * x1, y = a * y0 + b * cy + c * y1;
      line(px, py, x, y, color);
      px = x; py = y;
    }
  }
  function draw(s, x, y, scale) {
    ctx.drawImage(s.cv, Math.round(x), Math.round(y), s.w * scale, s.h * scale);
  }
  function outlined(s, x, y, color, size, shadow, font = 'PS2P') {
    if (shadow) pxText(ctx, s, x + 2, y + 2, shadow, size, 'center', font);
    pxText(ctx, s, x - 1, y, C.ink, size, 'center', font);
    pxText(ctx, s, x + 1, y, C.ink, size, 'center', font);
    pxText(ctx, s, x, y - 1, C.ink, size, 'center', font);
    pxText(ctx, s, x, y + 1, C.ink, size, 'center', font);
    pxText(ctx, s, x, y, color, size, 'center', font);
  }
  function waveLift(x) {
    const s = Math.sin(x * 0.15 + t * 2.2) + 0.6 * Math.sin(x * 0.047 - t * 1.3);
    return s > 0.9 ? 2 : s > -0.2 ? 1 : 0;
  }
  const band = (y) => (y < band1 ? 0 : y < band2 ? 1 : 2);
  // A fish (or boot) drawn with its mouth at (mx, my).
  function drawCreature(k, i0, mx, my, left) {
    const s = spr(k, i0 + (left ? 1 : 0));
    const ax = left ? s.w - 1 - k.ax : k.ax;
    draw(s, mx - ax, my - k.ay, 1);
  }

  /* ---------------- scene ---------------- */
  function drawScene() {
    ctx.drawImage(bg, 0, 0, W, H);
    for (let i = 0; i < clouds.length; i++) draw(clouds[i].s, clouds[i].x, clouds[i].y, 1);
    if (gull.x > -10) draw(gullSpr[(t * 4 | 0) & 1], gull.x, gull.y + Math.round(Math.sin(t * 2)), 1);

    // under the water
    for (let i = 0; i < amb.length; i++) {
      const f = amb[i], s = ambShapes[f.shape][f.b][f.vx < 0 ? 1 : 0];
      draw(s, f.x, f.y + ((t * 2 + f.ph) & 1), 1);
    }
    for (let i = 0; i < grass.length; i++) {
      const g = grass[i];
      ctx.fillStyle = g.c;
      for (let j = 0; j < g.h; j++) {
        const off = Math.round(Math.sin(t * 1.6 + g.ph + j * 0.35) * (j / g.h) * 1.8);
        ctx.fillRect(g.x + off, bedY + 2 - j, 1, 1);
        if (j < g.h * 0.4) ctx.fillRect(g.x + off + 1, bedY + 2 - j, 1, 1);
      }
    }
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (!b.on) continue;
      const bx = Math.round(b.x + Math.sin(b.y * 0.3)), by = Math.round(b.y);
      if (b.big) { rect(ctx, '#bfe9fb', bx, by, 2, 2); rect(ctx, C.white, bx, by, 1, 1); } else rect(ctx, '#bfe9fb', bx, by, 1, 1);
    }
    if (phase === 'wait' || phase === 'bite' || phase === 'hooked' || phase === 'fight' || (phase === 'msg' && fishX > -40 && fishX < W + 40)) {
      if (phase === 'wait' || phase === 'bite' || (phase === 'msg' && msgKind !== 'snap')) {
        line(landX, waterY + 1, landX, hookY, WET);
        rect(ctx, C.gray, landX, Math.round(hookY), 1, 2);
        rect(ctx, C.gray, landX + 1, Math.round(hookY) + 2, 1, 1);
        rect(ctx, C.pink, landX - 1, Math.round(hookY) + 1, 1, 2);
      }
      if (phase !== 'msg' || msgKind !== 'snap' || pt < 1.5) drawCreature(kd, 2 + band(fishY) * 2, fishX, fishY, fishLeft);
    }

    // the boat and mini-Omar
    const rimY = waterY - 5 + (Math.sin(t * 1.8) > 0 ? 1 : 0);
    draw(omar, OX, rimY - 10, 1);
    rect(ctx, C.ink, BX + 8, rimY - 4, 8, 4);
    rect(ctx, C.white, BX + 9, rimY - 3, 6, 3);
    rect(ctx, C.teal, BX + 9, rimY - 3, 6, 1);
    for (let i = 0; i < TAPER.length; i++) {
      const y = rimY + 1 + i, w = BW - TAPER[i], sub = y >= waterY;
      rect(ctx, i === 2 ? C.navy : i >= 5 ? (sub ? '#a94a63' : C.red) : sub ? '#b3dff0' : '#f6fafc', BX, y, w, 1);
      rect(ctx, C.ink, BX + w, y, 1, 1);
    }
    rect(ctx, C.ink, BX, rimY + 8, BW - 9, 1);
    rect(ctx, C.woodDark, BX, rimY, BW + 1, 1);
    rect(ctx, C.woodDark, BX + BW, rimY - 1, 2, 1);

    // the surface
    for (let x = 0; x < W; x += 2) {
      const s = Math.sin(x * 0.15 + t * 2.2) + 0.6 * Math.sin(x * 0.047 - t * 1.3);
      if (s <= -0.2) continue;
      const lift = s > 0.9 ? 2 : 1;
      rect(ctx, s > 1.2 ? C.foam : SURF, x, waterY - lift, 2, 1);
      if (lift === 2) rect(ctx, C.sea, x, waterY - 1, 2, 1);
    }
    for (let i = 0; i < ripples.length; i++) {
      const r = ripples[i];
      if (!r.on) continue;
      const c = r.life > 0.45 ? C.foam : SURF, rr = Math.round(r.r);
      rect(ctx, c, Math.round(r.x - rr - 3), waterY + 1, 3, 1);
      rect(ctx, c, Math.round(r.x + rr + 1), waterY + 1, 3, 1);
    }

    // rod, line, bobber
    drawRod(rimY);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.on) rect(ctx, i & 1 ? C.white : C.foam, Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }

  function drawRod(rimY) {
    const hx = OX + 8, hy = rimY - 2;
    let ang = rodAng;
    if (phase === 'hooked' || phase === 'fight') ang = 64;
    else if (phase === 'title' || phase === 'card' || phase === 'landed') ang = 52;
    const a = ang * Math.PI / 180, dx = Math.cos(a), dy = -Math.sin(a);
    let tx = hx + dx * RODLEN, ty = hy + dy * RODLEN;
    if (phase === 'hooked' || phase === 'fight') {
      const fx = fishX - tx, fy = fishY - ty, d = Math.hypot(fx, fy) || 1;
      const b = (aDown || touchDown ? 7 : 4) + (inside ? 0 : Math.round(Math.sin(t * 50)));
      tx += fx / d * b; ty += fy / d * b;
    }
    tx = Math.round(tx); ty = Math.round(ty);
    tipX = tx; tipY = ty;
    line(hx - dx * 4, hy - dy * 4, hx, hy, '#c08a50');
    curve(hx, hy, hx + dx * RODLEN * 0.6, hy + dy * RODLEN * 0.6, tx, ty, ROD, 6);
    rect(ctx, C.red, tx, ty, 1, 1);
    rect(ctx, C.gray, hx - 2, hy + 1, 2, 2);
    rect(ctx, C.skin, hx - 1, hy, 2, 1);

    switch (phase) {
      case 'title': case 'cast': case 'card':
        line(tx, ty + 1, tx, ty + 6, LINE);
        rect(ctx, C.pink, tx - 1, ty + 7, 2, 2);
        break;
      case 'fly':
        line(tx, ty, lureX, lureY, LINE);
        rect(ctx, C.pink, Math.round(lureX) - 1, Math.round(lureY) - 1, 2, 2);
        break;
      case 'wait': case 'bite': case 'msg':
        if (phase === 'msg' && msgKind === 'snap') {
          curve(tx, ty, tx + 6, waterY - 2, tx + 18, waterY, LINE, 5);
          break;
        }
        drawLineToBobber(tx, ty);
        break;
      case 'hooked': case 'fight': {
        const u = (waterY - ty) / Math.max(1, fishY - ty), ex = tx + (fishX - tx) * u;
        line(tx, ty, ex, waterY, LINE);
        line(ex, waterY + 1, fishX, fishY, WET);
        drawBobber(ex, waterY + (inside ? 1 : 2), 0);
        break;
      }
      case 'landed': {
        const u = Math.min(1, pt / 0.9);
        line(tx, ty, landedX(u), landedY(u), LINE);
        break;
      }
    }
  }

  function drawLineToBobber(tx, ty) {
    const lift = waterLift(landX);
    const by = waterY - lift;
    curve(tx, ty, (tx + landX) / 2, Math.max(ty, by) + 6, landX, by - 4, LINE, 8);
    let dip = 0;
    if (phase === 'bite') dip = 3;
    else if (dipT > 0) dip = 1;
    drawBobber(landX, by, dip);
    if (phase === 'bite') drawAlert(landX, by - 7);
  }
  function waterLift(x) { return waveLift(x - (x & 1)); }

  // A red-and-white bobber floating with its waterline at y; dip pushes it under.
  function drawBobber(x, y, dip) {
    x = Math.round(x); y = Math.round(y) + dip;
    for (let i = 0; i < BOBBER.length; i++) {
      const r = BOBBER[i], yy = y + r[3] + 1;
      if (yy > waterY) continue;
      rect(ctx, r[2], x + r[0], yy, r[1], 1);
    }
    rect(ctx, C.ink, x - 2, Math.min(y - 1, waterY), 1, 1);
    if (dip < 3) { rect(ctx, C.foam, x - 4, waterY, 2, 1); rect(ctx, C.foam, x + 3, waterY, 2, 1); }
  }

  // The "!" that pops over the bobber on a bite.
  function drawAlert(x, y) {
    const pop = pt < 0.12 ? Math.round((0.12 - pt) * 40) : 0;
    const bx = clamp(Math.round(x) - 7, 2, W - 17), by = Math.round(y) - 22 + pop;
    rect(ctx, C.ink, bx + 1, by, 13, 20);
    rect(ctx, C.ink, bx, by + 1, 15, 18);
    rect(ctx, C.white, bx + 1, by + 1, 13, 18);
    rect(ctx, C.ink, Math.round(x) - 1, by + 20, 3, 1);
    rect(ctx, C.ink, Math.round(x), by + 21, 1, 1);
    pxText(ctx, '!', bx + 8, by + 2, (t * 10 | 0) & 1 ? C.coral : C.red, 16, 'center');
  }

  function landedX(u) { return landX0 + (OX + 6 - landX0) * u; }
  function landedY(u) { return landY0 + (waterY - 20 - landY0) * u - 34 * 4 * u * (1 - u); }

  /* ---------------- HUD per phase ---------------- */
  function hud(s, cx) { pxText(ctx, s, cx, 4, C.ink, 8, 'center'); }

  function drawPower() {
    const x = 44, y = 16, w = 92, h = 8, inner = w - 2;
    rect(ctx, C.ink, x, y, w, h);
    rect(ctx, C.foam, x + 1, y + 1, inner, h - 2);
    const f = Math.round(inner * power), g = Math.round(inner * 0.55), yy = Math.round(inner * 0.82);
    rect(ctx, C.green, x + 1, y + 1, Math.min(f, g), h - 2);
    if (f > g) rect(ctx, C.yellow, x + 1 + g, y + 1, Math.min(f, yy) - g, h - 2);
    if (f > yy) rect(ctx, C.coral, x + 1 + yy, y + 1, f - yy, h - 2);
    rect(ctx, 'rgba(255,255,255,0.45)', x + 1, y + 1, f, 1);
    rect(ctx, C.ink, x + 1 + g, y + h - 3, 1, 2);
    rect(ctx, C.ink, x + 1 + yy, y + h - 3, 1, 2);
    if (power > 0.94 && (t * 12 | 0) & 1) pxText(ctx, 'MAX', x + w + 1, y + 1, C.red, 10, 'left', 'VT323');
  }

  function drawMeter() {
    const shake = !inside && progress < 0.25 ? ((t * 30 | 0) & 1) : 0;
    const ox = shake;
    ctx.drawImage(meter, MX + ox, MY, MW, MH);
    const bh = Math.round(kd.bar * TH), by = TY + TH - Math.round((barPos + kd.bar) * TH);
    rect(ctx, inside ? C.green : '#3f9a50', TX + ox, by, TW, bh);
    rect(ctx, inside ? '#c8f5b0' : C.green, TX + ox, by, TW, 1);
    rect(ctx, '#2a7a3a', TX + ox, by + bh - 1, TW, 1);
    const jit = kd.jit >= 1.5 && (t * 18 | 0) & 1 ? 1 : 0;
    const iy = clamp(Math.round(TY + TH - fishPos * TH - icon.h / 2) + jit, TY - 1, TY + TH - icon.h + 1);
    draw(icon, TX + ox + Math.round((TW - icon.w) / 2), iy, 1);
    const fh = Math.round(progress * TH);
    rect(ctx, progress < 0.3 ? C.red : progress < 0.6 ? C.orange : C.green, GX + ox, TY + TH - fh, 4, fh);
  }

  function drawPhaseUI() {
    switch (phase) {
      case 'title': drawTitle(); break;
      case 'cast':
        hud(charging ? 'LET GO TO CAST' : 'HOLD A TO CAST', 80);
        drawPower();
        footer('B: TITLE   SELECT: FISH LOG');
        break;
      case 'fly': break;
      case 'wait':
        hud(castPower > 0.94 && pt < 1.4 ? 'MAX CAST!' : 'WAIT FOR IT...', 80);
        footer('B: REEL IN');
        break;
      case 'bite':
        if ((t * 8 | 0) & 1) hud('NOW!!', 80);
        break;
      case 'hooked':
        drawMeter();
        outlined('HOOKED!', 64, Math.round(waterY + (bedY - waterY) * 0.28), C.yellow, 16, C.coral);
        break;
      case 'fight':
        drawMeter();
        hud(pt < 2 ? 'HOLD A TO REEL!' : kd.hint, 64);
        break;
      case 'landed':
        drawLanded();
        outlined('GOT IT!', 80, Math.round(waterY + (bedY - waterY) * 0.3), C.yellow, 16, C.green);
        break;
      case 'card': drawCard(); break;
      case 'msg': drawMsg(); break;
    }
  }

  function footer(s) {
    pxText(ctx, s, 81, H - 11, C.ink, 12, 'center', 'VT323');
    pxText(ctx, s, 80, H - 12, C.cream, 12, 'center', 'VT323');
  }

  function drawLanded() {
    const u = Math.min(1, pt / 0.9);
    const ai = u < 0.2 ? 0 : u < 0.4 ? 1 : u < 0.6 ? 2 : u < 0.8 ? 3 : 4;
    const left = landX0 > OX + 6;
    const s = spr(kd, 8 + ai * 2 + (left ? 1 : 0));
    draw(s, landedX(u) - s.w / 2, landedY(u) - s.h / 2, 1);
  }

  function box(cx, cy, w, h) {
    const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
    rect(ctx, C.ink, x + 2, y + 2, w, h);
    rect(ctx, C.cream, x, y, w, h);
    frame(ctx, C.ink, x, y, w, h);
    return y;
  }

  function drawMsg() {
    const cy = Math.round(waterY + (bedY - waterY) * 0.36);
    if (msgKind === 'snap') {
      outlined('SNAP!', 80, cy - 12, C.coral, 16, C.ink);
      outlined('THE LINE BROKE.', 80, cy + 10, C.white, 8);
      return;
    }
    const title = msgKind === 'early' ? 'TOO EARLY!' : 'IT GOT AWAY...';
    const sub = msgKind === 'early' ? 'YOU SPOOKED IT.' : "WATCH FOR THE '!'";
    const y = box(80, cy, 132, 34);
    pxText(ctx, title, 80, y + 7, C.coral, 8, 'center');
    pxText(ctx, sub, 80, y + 19, C.ink, 12, 'center', 'VT323');
  }

  function drawCard() {
    ctx.fillStyle = 'rgba(20,33,61,0.45)';
    ctx.fillRect(0, 0, W, H);
    const slide = pt < 0.25 ? Math.round(Math.pow((0.25 - pt) / 0.25, 2) * H) : 0;
    const y = Math.round((H - CH) / 2) + slide, x = CX, mid = CX + CW / 2;
    rect(ctx, C.ink, x + 2, y + 2, CW, CH);
    rect(ctx, C.cream, x, y, CW, CH);
    frame(ctx, C.ink, x, y, CW, CH);
    rect(ctx, kd.ribbon, x + 1, y + 1, CW - 2, 14);
    rect(ctx, C.ink, x + 1, y + 15, CW - 2, 1);
    pxText(ctx, kd.name, mid, y + 4, kd.ink, 8, 'center');
    // the photo
    const px = x + 12, py = y + 20, pw = CW - 24, ph = 38;
    rect(ctx, '#cdeefc', px, py, pw, ph);
    rect(ctx, '#aee1f7', px, py + ph - 9, pw, 9);
    for (let i = 0; i < 5; i++) rect(ctx, C.white, px + 6 + i * 22 + ((t * 6 | 0) % 3), py + ph - 9, 6, 1);
    frame(ctx, C.ink, px - 1, py - 1, pw + 2, ph + 2);
    const s = spr(kd, 0), bob = Math.round(Math.sin(t * 3));
    draw(s, Math.round(mid - s.w), py + Math.round(ph / 2 - s.h) + bob, 2);
    if (kd.id === 'yellowtail') {
      for (let i = 0; i < 4; i++) {
        if (((t * 3 + i * 0.7) | 0) % 2) continue;
        const sx = px + 6 + ((i * 37) % (pw - 12)), sy = py + 4 + ((i * 13) % (ph - 16));
        rect(ctx, C.yellow, sx, sy - 1, 1, 3);
        rect(ctx, C.yellow, sx - 1, sy, 3, 1);
      }
    }
    pxText(ctx, kgText, mid, y + 63, C.ink, 16, 'center');
    if (record) {
      if ((t * 3 | 0) & 1 || pt < 0.4) pxText(ctx, 'NEW RECORD!', mid, y + 82, C.coral, 8, 'center');
    } else pxText(ctx, subText, mid, y + 81, C.grayDark, 12, 'center', 'VT323');
    pxText(ctx, kd.line, mid, y + 93, kd.id === 'yellowtail' ? C.navy : C.ink, 12, 'center', 'VT323');
    rect(ctx, C.sandDark, x + 6, y + 106, CW - 12, 1);
    if (kd.id === 'yellowtail') {
      pxText(ctx, 'A: SEE IT', x + 8, y + 111, C.ink, 8, 'left');
      pxText(ctx, 'B: CAST', x + CW - 8, y + 111, C.grayDark, 8, 'right');
    } else pxText(ctx, 'A: CAST AGAIN', mid, y + 111, C.ink, 8, 'center');
  }

  function drawTitle() {
    // a yellowtail leaping out of the water, again and again
    const cyc = 3.2, jt = t % cyc, n = Math.floor(t / cyc), u = jt / 1.5;
    if (u < 1) {
      const scale = H >= 176 ? 2 : 1;
      const x = 58 + 64 * u, y0 = waterY + 8 * scale, y = y0 - (y0 - 34) * 4 * u * (1 - u);
      const ai = u < 0.2 ? 0 : u < 0.4 ? 1 : u < 0.6 ? 2 : u < 0.8 ? 3 : 4;
      const s = spr(kinds[3], 8 + ai * 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, waterY);
      ctx.clip();
      draw(s, x - (s.w * scale) / 2, y - (s.h * scale) / 2, scale);
      ctx.restore();
      if (u > 0.08 && jumpSplash !== n * 2) { jumpSplash = n * 2; splash(x, 7, 0.8); }
      if (u > 0.9 && jumpSplash !== n * 2 + 1) { jumpSplash = n * 2 + 1; splash(x, 9, 0.9); }
    }
    outlined('FISH ON!', 80, 8, C.yellow, 16, C.coral);
    const my = Math.round(waterY + (bedY - waterY) * 0.42);
    if (titleBest) outlined(titleBest, 80, my - 16, C.yellow, 12, null, 'VT323');
    if (t % 1.2 < 0.85) outlined('A: START', 80, my, C.white, 8);
    outlined('B: EXIT', 80, my + 13, C.foam, 8);
    footer('CAST FAR FOR BIGGER FISH');
  }

  function drawLog() {
    const x = 4, y = 4, w = W - 8, h = H - 8;
    rect(ctx, C.ink, x + 2, y + 2, w, h);
    rect(ctx, C.paper, x, y, w, h);
    frame(ctx, C.ink, x, y, w, h);
    rect(ctx, C.navy, x + 1, y + 1, w - 2, 14);
    pxText(ctx, 'FISH LOG', x + 6, y + 4, C.yellow, 8, 'left');
    pxText(ctx, logTotal, x + w - 6, y + 2, C.white, 12, 'right', 'VT323');
    const room = h - 33, rowH = Math.min(28, Math.floor(room / logRows.length)), small = rowH < 24;
    const top = y + 19 + Math.floor((room - rowH * logRows.length) / 2);
    for (let i = 0; i < logRows.length; i++) {
      const r = logRows[i], ry = top + i * rowH;
      if (i) rect(ctx, C.sandDark, x + 4, ry - 2, w - 8, 1);
      const s = spr(r.kd, r.got ? 0 : 4);
      draw(s, x + 4 + Math.round((28 - s.w) / 2), ry + Math.round((rowH - 3 - s.h) / 2), 1);
      pxText(ctx, r.name, x + 36, ry + 1, r.got ? C.ink : C.grayDark, 8, 'left');
      if (r.n) pxText(ctx, r.n, x + w - 6, ry + 1, C.coral, 8, 'right');
      pxText(ctx, r.best, x + 36, ry + (small ? 8 : 9), r.got ? C.navy : C.gray, small ? 10 : 12, 'left', 'VT323');
    }
    pxText(ctx, 'B: CLOSE', W / 2, y + h - 12, C.grayDark, 12, 'center', 'VT323');
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(20,33,61,0.62)';
    ctx.fillRect(0, 0, W, H);
    const cy = Math.round(H / 2);
    outlined('PAUSED', 80, cy - 24, C.yellow, 16, C.coral);
    pxText(ctx, 'START: RESUME', 80, cy + 2, C.white, 8, 'center');
    pxText(ctx, 'B: QUIT TO TITLE', 80, cy + 14, C.foam, 8, 'center');
  }

  function render() {
    drawScene();
    drawPhaseUI();
    if (logOpen) drawLog();
    if (paused) drawPause();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (!paused) update(dt);
    render();
  }

  /* ---------------- input ---------------- */
  // A and a finger on the screen do the same thing; the game cares about "pressed" and "let go".
  function down(src, x, y) {
    if (hostPaused) return;
    if (paused) { if (src === 'touch') { paused = false; host.sfx('select'); } return; }
    if (logOpen) { closeLog(); return; }
    switch (phase) {
      case 'title': host.sfx('select'); beginCast(); break;
      case 'cast': charging = true; chargeT = 0; power = 0; break;
      case 'wait': miss('early'); break;
      case 'bite': hookIt(); break;
      case 'card':
        if (kd.id === 'yellowtail' && !(src === 'touch' && x > W / 2 && y > Math.round((H - CH) / 2) + 100)) {
          host.sfx('select');
          host.open('pics');
        }
        else { host.sfx('select'); beginCast(); }
        break;
      case 'msg': if (pt > 0.35) beginCast(); break;
    }
  }
  function up() {
    if (aDown || touchDown || hostPaused || paused) return;
    if (phase === 'cast' && charging) release();
  }

  function back() {
    if (paused) { enterTitle(); host.sfx('back'); return; }
    if (logOpen) { closeLog(); return; }
    switch (phase) {
      case 'title': host.sfx('back'); host.exit(); break;
      case 'cast':
        host.sfx('back');
        if (charging) { charging = false; power = 0; } else enterTitle();
        break;
      case 'wait': host.sfx('back'); beginCast(); break;
      case 'card': host.sfx('back'); beginCast(); break;
      case 'msg': beginCast(); break;
    }
  }

  function button(name, isDown) {
    if (!running) return;
    if (name === 'a') {
      if (isDown === aDown) return;
      aDown = isDown;
      if (isDown) down('a', 0, 0); else up();
      return;
    }
    if (!isDown || hostPaused) return;
    if (name === 'b') back();
    else if (name === 'start') {
      if (logOpen) closeLog();
      else if (phase === 'title') { host.sfx('select'); beginCast(); }
      else {
        paused = !paused;
        if (paused && charging) { charging = false; power = 0; }
        host.sfx(paused ? 'blip' : 'select');
      }
    } else if (name === 'select' && !paused) {
      if (logOpen) closeLog();
      else if (phase === 'title' || phase === 'card' || phase === 'msg' || (phase === 'cast' && !charging)) openLog();
    }
  }

  function press(isDown, x, y) {
    if (!running) return;
    sawPress = true;
    if (isDown === touchDown) return;
    touchDown = isDown;
    if (isDown) down('touch', x, y); else up();
  }

  // Only used when the host never sends press(): a tap is then a quick press and release.
  function tap(x, y) {
    if (!running || sawPress) return;
    press(true, x, y);
    press(false, x, y);
    sawPress = false;
  }

  function swipe() {}

  /* ---------------- lifecycle ---------------- */
  function start() {
    if (running) return;
    running = true;
    hostPaused = false;
    aDown = touchDown = false;
    ctx.imageSmoothingEnabled = false;
    logOpen = false;
    enterTitle();
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    aDown = touchDown = false;
  }
  function pause() {
    if (!running || hostPaused) return;
    hostPaused = true;
    cancelAnimationFrame(raf);
    raf = 0;
    aDown = touchDown = false;
    if (charging) { charging = false; power = 0; }
    if (ACTIVE[phase]) paused = true;
    render();
  }
  function resume() {
    if (!running || !hostPaused) return;
    hostPaused = false;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  // Test hook for the dev harness: read the state, pick the next fish, skip waits. Harmless in play.
  const _debug = {
    state: () => ({ phase, power, progress, barPos, fishPos, bar: kd.bar, species: kd.id, inside, paused, logOpen }),
    force(id) { forced = id; },
    bite() { if (phase === 'wait') pt = biteAt; },
    win() { if (phase === 'fight') progress = 2; },
    lose() { if (phase === 'fight') progress = -1; }
  };

  return { start, stop, pause, resume, button, tap, swipe, press, _debug };
}
