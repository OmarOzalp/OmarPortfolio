// town.js — BEACH WALK: a tiny top-down beach town that is a second way into the handheld.
// Every building is a section of it, the end of the pier is the fishing spot, and the locals talk.

import { C, makeCanvas, rect, frame, pxText, bitmap } from '../pixel.js';

const T = 16, COLS = 22, ROWS = 26, MW = COLS * T, MH = ROWS * T;
const STEP = 130;                       // ms to walk one tile
const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const BACK = { up: 'down', down: 'up', left: 'right', right: 'left' };
const START = { x: 10, y: 10, f: 'down' };
const RETURN_MS = 30 * 60 * 1000;       // back through a door within this long: skip the title

// Colors on top of the shared palette.
const X = {
  sea: ['#0f5ea8', '#1672bd', '#1f8bd0', '#2aa4dd', '#40bbe5', '#62cfe9'],
  crest: ['#4a9ce0', '#68b8ec', '#a6e3f8', '#e2f8ff'], wash: '#a3e6f0',
  wet: '#e8cb8f', sandHi: '#fcecc8',
  plank: '#c68d54', plankHi: '#dcaa71', plankLo: '#9a6538',
  pave: '#ece2d0', paveHi: '#f8f3ea', paveLo: '#d2c3aa',
  grass: '#7dcb5d', grassHi: '#a6e07e', grassLo: '#5aa846',
  trunk: '#b07a43', trunkLo: '#7a4f28', frond: '#3fb24f', frondLo: '#1f7a36', frondHi: '#86d86c',
  shade: 'rgba(20,33,61,0.18)', deepShade: 'rgba(6,40,80,0.35)',
  glass: '#9adcf3', glassLo: '#5fb3dc', duke: '#00539b', stone: '#e8dfc8', stoneLo: '#c4b597',
  track: '#d4583f'
};

// '~' sea  '=' pier  'F' pier end (fishing)  'b' bait bucket / tackle box  ',' wet sand  '.' sand
// 'P' palm  'U' umbrella  't' towel  'L' lifeguard tower  'c' sandcastle  'v' surfboard  'S' sign
// '#' boardwalk  ':' pavement  'g' grass  'h' hedge  'l' lamp  'B' building  'T' track  'G' track gate
const MAP = [
  '~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~bFb~~~~~~~~~~~~~',
  '~~~~~~~=~~~~~~~~~~~~~~',
  '~~~~~~~=~~~~~~~~~~~~~~',
  '~~~~~~~=~~~~~~~~~~~~~~',
  ',,,,,,,=,,,,,,,,,,,,,,',
  '.P..c...S..Ut..LL...P.',
  '............t..LL.....',
  '.....Ut............v..',
  '......t..S...........S',
  '######################',
  'g::::::::l::l::::::::g',
  'hBBBBBBBBB::BBBBBBBBBh',
  'hBBBBBBBBB::BBBBBBBBBh',
  'hBBBBBBBBB::BBBBBBBBBh',
  'PBBBBBBBBB::BBBBBBBBBP',
  'g::::::::::::::::::::g',
  'g::::::::l::l::::::::g',
  'hBBBBBBBBB::BBBBBBBBBh',
  'hBBBBBBBBB::BBBBBBBBBh',
  'hBBBBBBBBB::BBBBBBBBBh',
  'PBBBBBBBBB::BBBBBBBBBP',
  'g::::::::::::::::::::g',
  'hTTTTTTTTTGGTTTTTTTTTh',
  'hTTTTTTTTTTTTTTTTTTTTh',
  'hTTTTTTTTTTTTTTTTTTTTh'
];
const SOLID = '~bPULcvShlBTG';

// Places with a door. Buildings are 4 tiles tall with the door on the bottom row (entered going up);
// the track gate is entered going down; the pier end is a spot you step onto.
const PLACES = [
  { id: 'dive', name: 'DIVE SHOP', x: 1, y: 12, w: 5, door: 3, color: '#1f72b8', mat: C.yellow,
    text: 'My favorite office is underwater. Go in?' },
  { id: 'mat', name: 'GYM', x: 6, y: 12, w: 4, door: 7, color: C.red, mat: C.blue,
    text: 'The wrestling room. Smells like hard work. Go in?' },
  { id: 'shop', name: 'WOODSHOP', x: 12, y: 12, w: 5, door: 14, color: C.woodDark, mat: C.orange,
    text: 'Power tools, sawdust and big ideas. Go in?' },
  { id: 'snake', name: 'ARCADE', x: 17, y: 12, w: 4, door: 18, color: '#6a3fc0', mat: C.pink,
    text: 'One more round of Snake. Just one. Go in?' },
  { id: 'work', name: 'OFFICE', x: 1, y: 18, w: 4, door: 3, color: C.navy, mat: C.gray,
    text: 'Internships, research and real work. Go in?' },
  { id: 'code', name: 'CODE LAB', x: 5, y: 18, w: 5, door: 7, color: '#0b1020', mat: C.green,
    text: 'Things I built, broke and fixed. Go in?' },
  { id: 'pics', name: 'GALLERY', x: 12, y: 18, w: 4, door: 13, color: '#e0457a', mat: C.teal,
    text: 'Photos from above and below the water. Go in?' },
  { id: 'about', name: 'DUKE', x: 16, y: 18, w: 5, door: 18, color: X.duke, mat: C.navy,
    text: 'ECE, CS and Math at Duke. This is me. Go in?' },
  { id: 'track', name: 'TRACK', gate: true, color: '#c4452f', dir: 'down',
    text: 'Spikes on, lanes open. Go in?' },
  { id: 'fish', name: 'PIER END', spot: true, color: C.deep, dir: 'down',
    text: 'Best fishing spot in town. Cast a line?' }
];

const SIGNS = {
  '9,9': ['OZ BEACH', 'Walk into any building to explore.'],
  '8,6': ['PIER', 'Fish bite best at the very end. Bring patience.'],
  '21,9': ['EAST END', 'Past this sign: problem sets. Turn back.']
};

const TALK = {
  crab: ['CRAB', 'Pinch pinch. Omar built a whole app about my cousins.', C.coral],
  gull: ['GULL', 'SQUAWK. No fries? Then go fish off the pier. I will wait.', C.grayDark],
  guard: ['LIFEGUARD', "No running on the pier. Unless it's track practice.", C.red]
};

/* ---------------- the grid ---------------- */
const idx = (x, y) => y * COLS + x;
const solid = new Uint8Array(COLS * ROWS);
const owner = new Int8Array(COLS * ROWS).fill(-1);  // tile -> PLACES index (walls, doors, track, pier end)
const isDoor = new Uint8Array(COLS * ROWS);
const HASH = new Float32Array(COLS * ROWS);

function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const ch = MAP[y][x], i = idx(x, y);
    solid[i] = SOLID.includes(ch) ? 1 : 0;
    HASH[i] = hash(x + 3, y + 7);
    if (ch === 'T' || ch === 'G') owner[i] = 8;
    if (ch === 'G') isDoor[i] = 1;
    if (ch === 'F' || ch === 'b') owner[i] = 9;
  }
}
PLACES.forEach((p, n) => {
  if (!p.w) return;
  p.dir = 'up';
  for (let y = p.y; y < p.y + 4; y++) for (let x = p.x; x < p.x + p.w; x++) owner[idx(x, y)] = n;
  isDoor[idx(p.door, p.y + 3)] = 1;
  p.outs = [idx(p.door, p.y + 4)];
});
PLACES[8].outs = [idx(10, 22), idx(11, 22)];
PLACES[9].outs = [idx(7, 1)];

/* ---------------- drawing helpers ---------------- */
function disc(g, c, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt((r + 0.5) * (r + 0.5) - dy * dy));
    rect(g, c, cx - w, cy + dy, w * 2 + 1, 1);
  }
}

// A running-track style rounded rectangle (ends are half circles).
function stadium(g, c, x, y, w, h) {
  const r = h / 2;
  for (let j = 0; j < h; j++) {
    const dy = j + 0.5 - r, dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    const x0 = Math.round(x + r - dx), x1 = Math.round(x + w - r + dx);
    rect(g, c, x0, y + j, x1 - x0, 1);
  }
}

function win(g, x, y, w, h, fc = C.ink, glass = X.glass, low = X.glassLo) {
  rect(g, fc, x, y, w, h);
  rect(g, glass, x + 1, y + 1, w - 2, h - 2);
  rect(g, low, x + 1, y + h - 4, w - 2, 3);
  rect(g, C.white, x + 2, y + 2, 2, 1);
  rect(g, C.white, x + 2, y + 3, 1, 1);
  rect(g, 'rgba(255,255,255,0.45)', x - 1, y + h, w + 2, 1);
}

function signBoard(g, cx, y, text, bg, fg) {
  const bw = text.length * 8 + 6, bx = Math.round(cx - bw / 2);
  rect(g, C.ink, bx, y, bw, 12);
  rect(g, bg, bx + 1, y + 1, bw - 2, 10);
  pxText(g, text, bx + 3, y + 2, fg);
  return bx;
}

// Shingled roof: rows of shingles, a lit ridge and a dark eave.
function shingles(g, x, y, w, h, base, dark, light) {
  rect(g, base, x, y, w, h);
  for (let r = 0, yy = y + 2; yy < y + h - 2; r++, yy += 4) {
    rect(g, light, x, yy, w, 1);
    rect(g, dark, x, yy + 3, w, 1);
    for (let xx = x + (r & 1 ? 2 : 5); xx < x + w; xx += 6) rect(g, dark, xx, yy + 1, 1, 2);
  }
  rect(g, light, x, y, w, 2);
  rect(g, dark, x, y + h - 2, w, 2);
}

function shell(g, x, y, w, roofH = 22) {
  // outline and the wall block the building's details are painted on
  rect(g, C.ink, x, y, w, 64);
  rect(g, X.shade, x, y + 64, w, 2);
  return roofH;
}

function door(g, x, y, c, dark, h = 20) {
  rect(g, C.ink, x, y, 12, h);
  rect(g, c, x + 1, y + 1, 10, h - 1);
  rect(g, dark, x + 1, y + 1, 10, 1);
  rect(g, dark, x + 3, y + 4, 6, 5);
  rect(g, c, x + 4, y + 5, 4, 3);
  rect(g, C.yellow, x + 8, y + 11, 2, 2);
}

/* ---------------- the buildings ---------------- */
const BUILD = {
  dive(g, x, y, w) {
    shell(g, x, y, w);
    // aqua clapboard walls
    rect(g, '#8fe0e4', x + 1, y + 22, w - 2, 42);
    for (let yy = y + 26; yy < y + 60; yy += 4) rect(g, '#71ccd3', x + 1, yy, w - 2, 1);
    rect(g, '#3f8f9c', x + 1, y + 60, w - 2, 4);
    shingles(g, x + 1, y + 1, w - 2, 22, '#2f86c9', '#1f62a0', '#69b6ea');
    // foam scallops along the eave
    for (let xx = x + 1; xx < x + w - 3; xx += 6) { rect(g, C.white, xx + 1, y + 21, 4, 1); rect(g, C.white, xx, y + 22, 6, 2); }
    rect(g, 'rgba(20,33,61,0.25)', x + 1, y + 24, w - 2, 2);
    // portholes
    for (const cx of [x + 18, x + 64]) {
      disc(g, C.ink, cx, y + 44, 7);
      disc(g, '#f2c14e', cx, y + 44, 6);
      disc(g, C.ink, cx, y + 44, 4);
      disc(g, '#3fb4e0', cx, y + 44, 3);
      rect(g, '#1f86b8', cx - 3, y + 45, 7, 2);
      rect(g, C.white, cx - 2, y + 42, 2, 1);
      rect(g, '#b8862a', cx + 5, y + 46, 1, 2);
    }
    // wooden door with a round window
    const dx = 3 * T + 2;
    door(g, dx, y + 44, '#b5793f', '#8a5a32');
    disc(g, C.ink, dx + 6, y + 50, 3);
    disc(g, '#9adcf3', dx + 6, y + 50, 2);
    // scuba tank leaning by the door
    rect(g, C.ink, dx + 14, y + 47, 6, 16);
    rect(g, C.yellow, dx + 15, y + 48, 4, 14);
    rect(g, '#e0a920', dx + 18, y + 48, 1, 14);
    rect(g, C.ink, dx + 16, y + 45, 2, 3);
    rect(g, C.white, dx + 15, y + 52, 4, 2);
    signBoard(g, x + w / 2, y + 17, 'DIVE SHOP', C.deep, C.white);
  },

  mat(g, x, y, w) {
    shell(g, x, y, w);
    // red brick
    rect(g, '#c94b3f', x + 1, y + 22, w - 2, 42);
    for (let r = 0, yy = y + 25; yy < y + 60; r++, yy += 4) {
      rect(g, '#a8382f', x + 1, yy, w - 2, 1);
      for (let xx = x + 1 + (r & 1 ? 4 : 0); xx < x + w - 1; xx += 8) rect(g, '#a8382f', xx, yy - 3, 1, 3);
    }
    rect(g, '#7a2a24', x + 1, y + 60, w - 2, 4);
    // ribbed metal roof
    rect(g, '#7a8399', x + 1, y + 1, w - 2, 22);
    for (let xx = x + 2; xx < x + w - 1; xx += 4) { rect(g, '#9aa3b8', xx, y + 1, 1, 21); rect(g, '#5b6478', xx + 2, y + 1, 1, 21); }
    rect(g, '#b8c0d0', x + 1, y + 1, w - 2, 1);
    rect(g, '#4b5266', x + 1, y + 21, w - 2, 2);
    rect(g, 'rgba(20,33,61,0.25)', x + 1, y + 23, w - 2, 2);
    // double glass doors
    const dx = 7 * T + 1;
    rect(g, C.ink, dx, y + 43, 14, 21);
    rect(g, '#5b6478', dx + 1, y + 44, 12, 20);
    rect(g, X.glass, dx + 2, y + 45, 4, 15);
    rect(g, X.glass, dx + 8, y + 45, 4, 15);
    rect(g, C.white, dx + 2, y + 45, 1, 3);
    rect(g, C.white, dx + 8, y + 45, 1, 3);
    rect(g, C.ink, dx + 6, y + 44, 2, 20);
    // window onto the wrestling mat
    const wx = 8 * T + 3;
    rect(g, C.ink, wx, y + 34, 28, 20);
    rect(g, '#2a5bd7', wx + 1, y + 35, 26, 18);
    disc(g, C.white, wx + 14, y + 44, 7);
    disc(g, '#2a5bd7', wx + 14, y + 44, 6);
    disc(g, C.red, wx + 14, y + 44, 3);
    disc(g, '#2a5bd7', wx + 14, y + 44, 2);
    rect(g, 'rgba(255,255,255,0.35)', wx + 2, y + 36, 6, 2);
    rect(g, 'rgba(255,255,255,0.45)', wx - 1, y + 54, 30, 1);
    // little window left of the door
    win(g, x + 3, y + 36, 9, 12);
    signBoard(g, x + w / 2, y + 17, 'GYM', C.yellow, C.navy);
  },

  shop(g, x, y, w) {
    shell(g, x, y, w);
    // plank walls
    rect(g, '#c48a4f', x + 1, y + 22, w - 2, 42);
    for (let xx = x + 3; xx < x + w - 1; xx += 5) {
      rect(g, '#93602f', xx, y + 22, 1, 38);
      rect(g, '#d8a46a', xx + 1, y + 22, 1, 38);
    }
    rect(g, '#6e6a62', x + 1, y + 60, w - 2, 4);
    shingles(g, x + 1, y + 1, w - 2, 22, '#e8833a', '#b95f22', '#f6a866');
    rect(g, 'rgba(20,33,61,0.25)', x + 1, y + 24, w - 2, 2);
    // barn door
    const dx = 14 * T;
    rect(g, C.ink, dx, y + 42, 16, 22);
    rect(g, '#a4472c', dx + 1, y + 43, 14, 21);
    frame(g, C.cream, dx + 1, y + 43, 14, 21);
    for (let i = 0; i < 19; i++) {
      const a = dx + 2 + Math.round(i * 11 / 18);
      rect(g, C.cream, a, y + 44 + i, 1, 1);
      rect(g, C.cream, dx + 13 - (a - dx - 2), y + 44 + i, 1, 1);
    }
    // saw blade sign
    disc(g, C.ink, x + 15, y + 44, 8);
    disc(g, '#c9d1dc', x + 15, y + 44, 7);
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      rect(g, '#8a93a8', x + 15 + Math.round(Math.cos(ang) * 6), y + 44 + Math.round(Math.sin(ang) * 6), 1, 1);
    }
    disc(g, '#8a93a8', x + 15, y + 44, 2);
    rect(g, C.ink, x + 15, y + 44, 1, 1);
    // window with warm light
    win(g, 15 * T + 3, y + 35, 22, 14, C.ink, '#ffd98a', '#ffb84a');
    rect(g, C.ink, 15 * T + 13, y + 35, 2, 14);
    // stack of lumber by the wall
    for (let i = 0; i < 3; i++) {
      rect(g, C.ink, x + 25, y + 54 + i * 3, 14, 3);
      rect(g, '#e0b27a', x + 26, y + 55 + i * 3, 12, 1);
      rect(g, '#b88444', x + 37, y + 55 + i * 3, 1, 1);
    }
    signBoard(g, x + w / 2, y + 17, 'WOODSHOP', C.woodDark, C.cream);
  },

  snake(g, x, y, w) {
    shell(g, x, y, w);
    rect(g, '#7044c9', x + 1, y + 22, w - 2, 42);
    for (let xx = x + 4; xx < x + w - 2; xx += 8) rect(g, '#6338b6', xx, y + 30, 4, 30);
    rect(g, '#ff5aa8', x + 1, y + 32, w - 2, 2);
    rect(g, '#5ff0e0', x + 1, y + 58, w - 2, 2);
    rect(g, '#3b1f7a', x + 1, y + 60, w - 2, 4);
    // dark roof with stars
    rect(g, '#2b2350', x + 1, y + 1, w - 2, 22);
    for (let i = 0; i < 9; i++) {
      const sx = x + 4 + ((hash(i, 5) * (w - 8)) | 0), sy = y + 3 + ((hash(i, 9) * 13) | 0);
      rect(g, i % 3 ? '#8a7cd6' : C.yellow, sx, sy, 1, 1);
    }
    rect(g, '#3d3270', x + 1, y + 1, w - 2, 1);
    rect(g, '#ff5aa8', x + 1, y + 20, w - 2, 1);
    rect(g, '#1a1533', x + 1, y + 21, w - 2, 2);
    // glass door, neon frame
    const dx = 18 * T + 2;
    rect(g, '#ff5aa8', dx - 1, y + 42, 14, 22);
    rect(g, C.ink, dx, y + 43, 12, 21);
    rect(g, '#3a2f6e', dx + 1, y + 44, 10, 20);
    rect(g, '#5ff0e0', dx + 2, y + 45, 1, 4);
    rect(g, C.yellow, dx + 8, y + 54, 2, 2);
    // window with an arcade cabinet in it
    const wx = 19 * T + 1;
    rect(g, C.ink, wx, y + 36, 30, 20);
    rect(g, '#1b1433', wx + 1, y + 37, 28, 18);
    rect(g, '#4b2aa0', wx + 8, y + 38, 14, 17);
    rect(g, C.ink, wx + 10, y + 40, 10, 7);
    rect(g, '#123a2f', wx + 11, y + 41, 8, 5);
    rect(g, C.green, wx + 12, y + 43, 4, 1);
    rect(g, C.green, wx + 15, y + 42, 1, 1);
    rect(g, C.coral, wx + 17, y + 44, 1, 1);
    rect(g, '#2b1a5a', wx + 9, y + 48, 12, 2);
    rect(g, C.red, wx + 12, y + 47, 2, 2);
    rect(g, C.yellow, wx + 16, y + 48, 1, 1);
    rect(g, 'rgba(255,255,255,0.45)', wx - 1, y + 56, 32, 1);
    // marquee board (its bulbs blink at runtime)
    const bw = 6 * 8 + 6, bx = Math.round(x + w / 2 - bw / 2);
    rect(g, C.ink, bx - 1, y + 16, bw + 2, 14);
    rect(g, '#14112a', bx, y + 17, bw, 12);
    const cols = ['#ff5aa8', C.yellow, '#5ff0e0', C.green, C.orange, '#ff5aa8'];
    for (let i = 0; i < 6; i++) pxText(g, 'ARCADE'[i], bx + 3 + i * 8, y + 19, cols[i]);
  },

  work(g, x, y, w) {
    shell(g, x, y, w);
    rect(g, '#eef1f6', x + 1, y + 22, w - 2, 42);
    rect(g, '#c9d1de', x + 1, y + 58, w - 2, 6);
    rect(g, C.navy, x + 1, y + 31, w - 2, 2);
    // flat roof: parapet, AC unit, vent
    rect(g, '#9aa3b5', x + 1, y + 1, w - 2, 22);
    rect(g, '#c8d0dc', x + 3, y + 3, w - 6, 16);
    rect(g, '#b3bccb', x + 3, y + 3, w - 6, 1);
    rect(g, C.ink, x + 7, y + 5, 16, 10);
    rect(g, '#dfe4ec', x + 8, y + 6, 14, 8);
    disc(g, '#9aa3b5', x + 15, y + 10, 3);
    rect(g, '#5b6478', x + 13, y + 10, 5, 1);
    rect(g, '#5b6478', x + 15, y + 8, 1, 5);
    rect(g, C.ink, x + 46, y + 6, 6, 6);
    rect(g, '#9aa3b5', x + 47, y + 7, 4, 4);
    rect(g, '#5b6478', x + 1, y + 21, w - 2, 2);
    rect(g, 'rgba(20,33,61,0.2)', x + 1, y + 23, w - 2, 2);
    // glass windows
    for (const wx of [x + 4, x + 18]) { win(g, wx, y + 36, 11, 14, C.navy, '#7fc4ee', '#4f97d0'); }
    win(g, x + 50, y + 36, 11, 14, C.navy, '#7fc4ee', '#4f97d0');
    // sliding glass doors
    const dx = 3 * T + 1;
    rect(g, C.ink, dx, y + 43, 14, 21);
    rect(g, '#a9b3c4', dx + 1, y + 44, 12, 20);
    rect(g, '#bfe4f8', dx + 2, y + 45, 4, 19);
    rect(g, '#bfe4f8', dx + 8, y + 45, 4, 19);
    rect(g, C.white, dx + 2, y + 46, 1, 4);
    // potted plant
    rect(g, C.ink, x + 33, y + 56, 8, 7);
    rect(g, C.coral, x + 34, y + 57, 6, 5);
    disc(g, C.palmDark, x + 37, y + 52, 4);
    disc(g, C.palm, x + 37, y + 52, 3);
    rect(g, '#7fd46a', x + 35, y + 50, 2, 1);
    signBoard(g, x + w / 2, y + 17, 'OFFICE', C.navy, C.white);
  },

  code(g, x, y, w) {
    shell(g, x, y, w);
    rect(g, '#243766', x + 1, y + 22, w - 2, 42);
    for (let xx = x + 15; xx < x + w - 2; xx += 16) rect(g, '#2f4580', xx, y + 26, 1, 34);
    rect(g, '#16213f', x + 1, y + 60, w - 2, 4);
    // flat roof with vents (the dish and antenna are drawn on top)
    rect(g, '#1b2440', x + 1, y + 1, w - 2, 22);
    rect(g, '#2d3a5e', x + 3, y + 3, w - 6, 16);
    for (let i = 0; i < 4; i++) {
      rect(g, C.ink, x + 30 + i * 11, y + 6, 8, 8);
      rect(g, '#4a5a85', x + 31 + i * 11, y + 7, 6, 6);
      for (let j = 0; j < 3; j++) rect(g, '#2d3a5e', x + 31 + i * 11, y + 8 + j * 2, 6, 1);
    }
    rect(g, C.green, x + 3, y + 19, w - 6, 1);
    rect(g, '#0f1630', x + 1, y + 21, w - 2, 2);
    rect(g, 'rgba(0,0,0,0.25)', x + 1, y + 23, w - 2, 2);
    // terminal windows
    for (const wx of [x + 3, x + 51]) {
      rect(g, C.ink, wx, y + 35, 26, 18);
      rect(g, '#0b1a14', wx + 1, y + 36, 24, 16);
      const lens = [[0, 9], [2, 12], [2, 6], [0, 14], [4, 7]];
      for (let r = 0; r < lens.length; r++) {
        const col = r === 1 ? '#5ff0e0' : r === 3 ? C.yellow : C.green;
        rect(g, col, wx + 3 + lens[r][0], y + 38 + r * 3, Math.min(lens[r][1], 19 - lens[r][0]), 1);
      }
      rect(g, 'rgba(95,208,104,0.35)', wx - 1, y + 53, 28, 1);
    }
    // steel door with a keypad
    const dx = 7 * T + 2;
    rect(g, C.ink, dx, y + 43, 12, 21);
    rect(g, '#8a95a8', dx + 1, y + 44, 10, 20);
    rect(g, '#a8b2c4', dx + 1, y + 44, 10, 1);
    rect(g, '#6b7589', dx + 5, y + 44, 1, 20);
    rect(g, C.ink, dx + 13, y + 50, 3, 5);
    rect(g, C.green, dx + 14, y + 51, 1, 1);
    signBoard(g, x + w / 2, y + 26, 'CODE LAB', '#0b1020', C.green);
  },

  pics(g, x, y, w) {
    shell(g, x, y, w);
    rect(g, '#fff4e0', x + 1, y + 22, w - 2, 42);
    for (const px of [x + 1, x + w - 4]) rect(g, '#ffb3c8', px, y + 24, 3, 36);
    rect(g, '#f0c9a0', x + 1, y + 60, w - 2, 4);
    shingles(g, x + 1, y + 1, w - 2, 22, '#ff86a8', '#d95a80', '#ffb3c8');
    rect(g, 'rgba(20,33,61,0.2)', x + 1, y + 24, w - 2, 2);
    // framed pictures in the windows
    const pic = (px, py, pw, ph, draw) => {
      rect(g, C.ink, px, py, pw, ph);
      rect(g, '#e0b040', px + 1, py + 1, pw - 2, ph - 2);
      rect(g, C.ink, px + 2, py + 2, pw - 4, ph - 4);
      draw(px + 3, py + 3, pw - 6, ph - 6);
    };
    pic(x + 4, y + 36, 14, 16, (a, b, c, d) => {        // a fish
      rect(g, '#1f8bd0', a, b, c, d);
      rect(g, C.orange, a + 2, b + 4, 5, 3);
      rect(g, C.orange, a + 7, b + 3, 1, 5);
      rect(g, C.white, a + 3, b + 4, 1, 1);
    });
    pic(x + 34, y + 34, 27, 19, (a, b, c, d) => {       // sunset over the sea
      rect(g, '#ff8a5c', a, b, c, d);
      rect(g, '#ffb35c', a, b + 5, c, 3);
      disc(g, C.yellow, a + 10, b + 8, 3);
      rect(g, '#2a7fc9', a, b + 9, c, d - 9);
      rect(g, C.yellow, a + 8, b + 10, 5, 1);
      rect(g, C.yellow, a + 9, b + 12, 3, 1);
    });
    // arched teal door
    const dx = 13 * T + 2;
    rect(g, C.ink, dx, y + 44, 12, 20);
    rect(g, C.ink, dx + 2, y + 42, 8, 2);
    rect(g, C.teal, dx + 1, y + 45, 10, 19);
    rect(g, C.teal, dx + 3, y + 43, 6, 2);
    rect(g, '#178a9a', dx + 5, y + 45, 1, 19);
    rect(g, C.yellow, dx + 7, y + 54, 1, 2);
    rect(g, C.yellow, dx + 4, y + 54, 1, 2);
    signBoard(g, x + w / 2, y + 17, 'GALLERY', '#e0457a', C.white);
  },

  about(g, x, y, w) {
    shell(g, x, y, w);
    rect(g, X.duke, x + 1, y + 22, w - 2, 42);
    // stone corners and base
    rect(g, X.stone, x + 1, y + 22, 4, 42);
    rect(g, X.stone, x + w - 5, y + 22, 4, 42);
    for (let yy = y + 26; yy < y + 60; yy += 6) { rect(g, X.stoneLo, x + 1, yy, 4, 1); rect(g, X.stoneLo, x + w - 5, yy, 4, 1); }
    rect(g, X.stone, x + 1, y + 58, w - 2, 6);
    rect(g, X.stoneLo, x + 1, y + 58, w - 2, 1);
    shingles(g, x + 1, y + 1, w - 2, 22, '#0b2d7c', '#011a50', '#2a50a8');
    rect(g, 'rgba(20,33,61,0.3)', x + 1, y + 24, w - 2, 2);
    // gothic windows
    for (const wx of [x + 9, x + 21, x + 51, x + 63]) {
      rect(g, X.stone, wx - 1, y + 35, 10, 19);
      rect(g, X.stone, wx + 1, y + 33, 6, 2);
      rect(g, C.ink, wx, y + 36, 8, 17);
      rect(g, C.ink, wx + 2, y + 34, 4, 2);
      rect(g, '#7fb6e8', wx + 1, y + 37, 6, 15);
      rect(g, '#7fb6e8', wx + 3, y + 35, 2, 2);
      rect(g, '#4f86c6', wx + 1, y + 45, 6, 7);
      rect(g, C.ink, wx + 4, y + 37, 1, 15);
      rect(g, C.white, wx + 2, y + 38, 1, 2);
    }
    // big arched wooden door
    const dx = 18 * T;
    rect(g, X.stone, dx - 1, y + 40, 18, 24);
    rect(g, C.ink, dx, y + 42, 16, 22);
    rect(g, C.ink, dx + 3, y + 40, 10, 2);
    rect(g, '#8a5a32', dx + 1, y + 43, 14, 21);
    rect(g, '#8a5a32', dx + 4, y + 41, 8, 2);
    rect(g, C.ink, dx + 7, y + 42, 2, 22);
    for (const sy of [y + 47, y + 53, y + 59]) { rect(g, '#5a3a22', dx + 2, sy, 4, 1); rect(g, '#5a3a22', dx + 10, sy, 4, 1); }
    rect(g, C.yellow, dx + 6, y + 53, 1, 2);
    rect(g, C.yellow, dx + 9, y + 53, 1, 2);
    signBoard(g, x + w / 2, y + 22, 'DUKE', C.white, X.duke);
  }
};

/* ---------------- the game ---------------- */
export default function create(host) {
  const ctx = host.ctx, W = host.w, H = host.h, k = host.k, store = host.store;
  const spr = (w, h, fn) => { const { canvas, ctx: g } = makeCanvas(w, h, k); fn(g); canvas.lw = w; canvas.lh = h; return canvas; };
  const blit = (img, x, y) => ctx.drawImage(img, x, y, img.lw, img.lh);

  let mapImg = null, S = null, overlays = [];
  let raf = 0, last = 0, alive = false, paused = false, ready = false;
  let mode = 'title', clock = 0, camX = 0, camY = 0;
  const pl = { x: START.x, y: START.y, f: START.f, mv: false, tx: 0, ty: 0, p: 0, steps: 0, turn: 0, bump: -9, lastBump: -9, wantA: false };
  const held = [];
  let path = null, pathI = 0, goal = null, queued = null;
  let dlg = null, menu = 0, fadeV = 0, fadeD = 0, fadeThen = null;
  const crab = { x: 4, y: 7, tx: 4, p: 0, mv: false, dir: 1, wait: 1.2, min: 2, max: 8 };
  const gull = { x: 13, y: 5, left: true, act: 0, actT: 0, wait: 2 };
  const guard = { x: 17, y: 7 };

  /* ---------- sprites ---------- */
  function bm(rows, pal, flip) {
    const r = flip ? rows.map((s) => s.split('').reverse().join('')) : rows;
    return spr(r[0].length, r.length, (g) => bitmap(g, r, 0, 0, 1, pal));
  }

  function buildSprites() {
    const P = { '#': C.ink, h: C.hair, H: '#4a2e1e', s: C.skin, n: C.navy, N: '#2a4ea8', k: '#5b6478', w: C.white };
    const HEAD_D = [
      '....########....',
      '...#hhhhhhhh#...',
      '..#hhhHHhhhhh#..',
      '..#hhhhhhhhhh#..',
      '..#hsshhhsssh#..',
      '..#ss#ssss#ss#..',
      '..#ss#ssss#ss#..',
      '...#ssssssss#...'
    ];
    const HEAD_U = [
      '....########....',
      '...#hhhhhhhh#...',
      '..#hhhhhhhhhh#..',
      '..#hhhhhHHhhh#..',
      '..#hhhhhhhhhh#..',
      '..#hhhhhhhhhh#..',
      '..#shhhhhhhhs#..',
      '...#hhhhhhhh#...'
    ];
    const HEAD_L = [
      '....#######.....',
      '...#hhhhhhh#....',
      '..#hhhHHhhhh#...',
      '..#hhhhhhhhhh#..',
      '.#sshhhhhhhhh#..',
      '.#s#sshhhhhhh#..',
      '.#ssssssshhh#...',
      '..##ssssss##....'
    ];
    const BODY = [
      '...#nnnnnnnn#...',
      '..#nnnNnnnnnn#..',
      '..#snnnnnnnns#..',
      '..#s#kkkkkk#s#..',
      '...#kkkkkkkk#...',
      '...#kkk##kkk#...'
    ];
    const LEGS = [['....#ss##ss#....', '....###..###....'], ['....#ss#.###....', '....###.........'], ['....###.#ss#....', '.........###....']];
    const BODY_L = [
      '....#nnnnnn#....',
      '...#nnnnnnnn#...',
      '...#nnnsnnnn#...',
      '...#kkkskkkk#...',
      '...#kkkkkkkk#...',
      '....#kkkkkk#....'
    ];
    const LEGS_L = [['.....#ss#s#.....', '....###.##......'], ['....#ss#.#ss#...', '...###...###....'], ['.....#sss#......', '.....####.......']];
    const pl = { down: [], up: [], left: [], right: [] };
    for (let f = 0; f < 3; f++) {
      pl.down.push(bm(HEAD_D.concat(BODY, LEGS[f]), P));
      pl.up.push(bm(HEAD_U.concat(BODY, LEGS[f]), P));
      pl.left.push(bm(HEAD_L.concat(BODY_L, LEGS_L[f]), P));
      pl.right.push(bm(HEAD_L.concat(BODY_L, LEGS_L[f]), P, true));
    }
    const G = { '#': C.ink, h: '#f2c35a', H: '#ffe08a', s: '#d99a66', n: '#e2453a', N: '#ff7a66', k: C.yellow, w: C.white };
    const guardRows = HEAD_D.slice(0, 5).concat(['..#s########s#..', '..#ssssssssss#..', '...#ssssssss#...'], BODY, LEGS[0]);
    guardRows[9] = '..#nnnwNnnnnn#..';
    const crabRows = [
      '.##..........##.',
      '#rr#........#rr#',
      '#r#r#......#r#r#',
      '.#rr#.#..#.#rr#.',
      '..#r#w#..#w#r#..',
      '...##rrrrrr##...',
      '..#rrrRrrRrrr#..',
      '.#rrrrrrrrrrrr#.',
      '.#RrrrrrrrrrrR#.',
      '..#RRRRRRRRRR#..',
      '.#.#.#....#.#.#.'
    ];
    const crab2 = crabRows.slice();
    crab2[2] = '#rrr#......#rrr#';
    crab2[10] = '..#.#.#..#.#.#..';
    const CR = { '#': C.ink, r: '#ef5a43', R: '#b8382a', w: C.white };
    const gullStand = [
      '................',
      '................',
      '................',
      '....###.........',
      '...#www#........',
      '..#w#www#.......',
      'yy#wwwww#.......',
      '..##wwwww##.....',
      '...#wwwwgggg#...',
      '...#wwwggggGG#..',
      '....#wwwgggGGG#.',
      '.....##wwwgg##..',
      '.......####.....',
      '........o..o....',
      '........o..o....',
      '.......oo.oo....'
    ];
    const gullFlap = [
      '................',
      '..........##....',
      '.........#gg#...',
      '....###.#ggg#...',
      '...#www#gggG#...',
      '..#w#www#gG#....',
      'yy#wwwww#G#.....',
      '..##wwwww##.....',
      '...#wwwwwwww#...',
      '...#wwwwwwwww#..',
      '....#wwwwwwwww#.',
      '.....##wwwww##..',
      '.......####.....',
      '........o..o....',
      '........o..o....',
      '.......oo.oo....'
    ];
    const GU = { '#': C.ink, w: C.white, g: '#b8c2d4', G: '#8a95aa', o: '#ff9a3a', y: '#ffc93a' };
    return {
      pl,
      guard: bm(guardRows, G),
      crab: [bm(crabRows, CR), bm(crab2, CR)],
      gull: { left: [bm(gullStand, GU), bm(gullFlap, GU)], right: [bm(gullStand, GU, true), bm(gullFlap, GU, true)] },
      palm: spr(32, 44, (g) => drawPalm(g, false)),
      palmDark: spr(32, 44, (g) => drawPalm(g, true)),
      umbA: spr(32, 32, (g) => drawUmbrella(g, C.coral, C.white)),
      umbB: spr(32, 32, (g) => drawUmbrella(g, C.teal, C.yellow)),
      tower: spr(32, 56, drawTower),
      lamp: spr(16, 32, drawLamp),
      surf: spr(12, 28, drawSurf),
      spire: spr(18, 46, drawSpire),
      dish: spr(16, 16, drawDish)
    };
  }

  function drawPalm(g, dark) {
    const tr = dark ? '#3a1f4a' : X.trunk, trLo = dark ? '#3a1f4a' : X.trunkLo;
    for (let y = 14; y < 44; y++) {
      const u = (43 - y) / 29, w = u < 0.45 ? 4 : 3;
      const cx = 14 + Math.round(Math.sin(u * 2.4) * 3);
      rect(g, tr, cx, y, w, 1);
      rect(g, trLo, cx + w - 1, y, 1, 1);
      if ((43 - y) % 3 === 0) rect(g, trLo, cx, y, w - 1, 1);
    }
    const cx = 17, cy = 13;
    const F = [[-15, 4, -8, -7], [15, 5, 8, -7], [-12, -6, -5, -10], [12, -7, 5, -10], [-1, -12, -2, -9], [-9, 9, -7, 1], [10, 9, 7, 1]];
    const cols = dark ? ['#2a1638', '#3a1f4a', '#3a1f4a'] : [X.frondLo, X.frond, X.frondHi];
    for (let pass = 0; pass < 3; pass++) {
      for (const [tx, ty, qx, qy] of F) {
        for (let s = 0; s <= 1.0001; s += 1 / 28) {
          const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s;
          const px = Math.round(cx + b * qx + c * tx), py = Math.round(cy + b * qy + c * ty);
          const th = s < 0.55 ? 3 : s < 0.85 ? 2 : 1;
          if (pass === 0) rect(g, cols[0], px - 1, py, th, th);
          else if (pass === 1) rect(g, cols[1], px - 1, py - 1, th, th);
          else if (s > 0.15 && s < 0.7 && (Math.round(s * 28) % 4 === 0)) rect(g, cols[2], px - 1, py - 1, 1, 1);
        }
      }
    }
    if (!dark) {
      disc(g, '#6b4423', cx - 2, cy + 3, 2);
      disc(g, '#6b4423', cx + 2, cy + 4, 2);
      rect(g, '#9a6a3a', cx - 3, cy + 2, 1, 1);
      rect(g, '#9a6a3a', cx + 1, cy + 3, 1, 1);
    }
  }

  function drawUmbrella(g, a, b) {
    rect(g, C.ink, 15, 10, 2, 22);
    rect(g, C.cream, 15, 10, 1, 22);
    for (let j = 0; j < 11; j++) {
      const hw = Math.round(14 * Math.sqrt(1 - Math.pow((10.5 - j) / 11, 2)));
      for (let x = 16 - hw; x < 16 + hw; x++) {
        const seg = Math.floor(((x - 16) / hw + 1) * 3);
        rect(g, seg % 2 ? b : a, x, 1 + j, 1, 1);
      }
      rect(g, C.ink, 16 - hw - 1, 1 + j, 1, 1);
      rect(g, C.ink, 16 + hw, 1 + j, 1, 1);
    }
    rect(g, C.ink, 9, 0, 14, 1);
    for (let x = 2; x < 30; x += 4) { rect(g, C.ink, x, 12, 4, 1); rect(g, 'rgba(20,33,61,0.25)', x + 1, 11, 2, 1); }
    rect(g, C.ink, 15, 0, 2, 1);
    rect(g, C.white, 10, 3, 3, 1);
  }

  function drawTower(g) {
    const wd = '#f4efe2', lo = '#c9c2b0';
    rect(g, lo, 8, 30, 2, 26); rect(g, lo, 22, 30, 2, 26);
    for (let i = 0; i < 22; i++) { rect(g, lo, 4 + Math.round(i * 22 / 21), 33 + i, 1, 1); rect(g, lo, 27 - Math.round(i * 22 / 21), 33 + i, 1, 1); }
    rect(g, C.ink, 1, 30, 4, 26); rect(g, wd, 2, 30, 2, 26);
    rect(g, C.ink, 27, 30, 4, 26); rect(g, wd, 28, 30, 2, 26);
    // ladder
    rect(g, C.ink, 12, 32, 1, 24); rect(g, C.ink, 19, 32, 1, 24);
    for (let yy = 35; yy < 56; yy += 4) rect(g, wd, 13, yy, 6, 1);
    // deck
    rect(g, C.ink, 0, 26, 32, 6);
    rect(g, '#c68d54', 1, 27, 30, 3);
    rect(g, '#9a6538', 1, 30, 30, 1);
    // cabin
    rect(g, C.ink, 3, 11, 26, 16);
    rect(g, wd, 4, 12, 24, 14);
    rect(g, C.red, 4, 18, 24, 3);
    rect(g, C.ink, 10, 13, 12, 5);
    rect(g, '#2a6fb8', 11, 14, 10, 3);
    rect(g, C.white, 12, 14, 2, 1);
    rect(g, C.white, 15, 19, 3, 1); rect(g, C.white, 16, 18, 1, 3);
    // roof
    rect(g, C.ink, 1, 6, 30, 6);
    rect(g, C.red, 2, 7, 28, 4);
    rect(g, '#ff7a66', 2, 7, 28, 1);
    rect(g, C.ink, 5, 4, 22, 2);
    rect(g, '#b8382a', 6, 5, 20, 1);
    // flag pole (the flag itself waves at runtime)
    rect(g, C.ink, 29, 0, 1, 7);
  }

  function drawLamp(g) {
    rect(g, X.shade, 4, 29, 9, 3);
    rect(g, C.ink, 5, 27, 6, 4);
    rect(g, C.navy, 6, 28, 4, 2);
    rect(g, C.ink, 7, 8, 2, 20);
    rect(g, '#2a4ea8', 7, 8, 1, 20);
    rect(g, C.ink, 3, 1, 10, 9);
    rect(g, '#ffe9a0', 4, 3, 8, 5);
    rect(g, C.white, 5, 4, 2, 2);
    rect(g, C.navy, 4, 2, 8, 1);
    rect(g, C.ink, 6, 0, 4, 1);
  }

  function drawSurf(g) {
    for (let j = 0; j < 24; j++) {
      const hw = Math.max(1, Math.round(4 * Math.sqrt(1 - Math.pow((j - 11.5) / 12.5, 2))));
      rect(g, C.ink, 6 - hw - 1, j, hw * 2 + 2, 1);
      rect(g, C.teal, 6 - hw, j, hw * 2, 1);
    }
    rect(g, C.white, 5, 2, 2, 19);
    rect(g, C.coral, 5, 8, 2, 3);
    rect(g, '#7fe0ec', 3, 6, 1, 8);
    rect(g, C.sandDark, 1, 23, 10, 3);
    rect(g, C.sand, 2, 23, 8, 2);
  }

  function drawSpire(g) {
    // Duke-ish stone tower with a pointed blue spire
    rect(g, C.ink, 2, 14, 14, 32);
    rect(g, X.stone, 3, 15, 12, 31);
    rect(g, X.stoneLo, 12, 15, 3, 31);
    for (let yy = 19; yy < 46; yy += 5) rect(g, X.stoneLo, 3, yy, 9, 1);
    rect(g, C.ink, 7, 22, 4, 8);
    rect(g, X.duke, 8, 23, 2, 7);
    rect(g, C.ink, 7, 34, 4, 6);
    rect(g, X.duke, 8, 35, 2, 5);
    // pinnacles
    for (const px of [1, 14]) { rect(g, C.ink, px, 9, 3, 6); rect(g, X.stone, px + 1, 10, 1, 5); }
    for (let j = 0; j < 12; j++) {
      const hw = Math.round(j / 2);
      rect(g, C.ink, 9 - hw - 1, 2 + j, hw * 2 + 2, 1);
      rect(g, '#0b2d7c', 9 - hw, 2 + j, hw * 2, 1);
    }
    rect(g, '#2a50a8', 8, 6, 1, 7);
    rect(g, C.ink, 8, 0, 2, 3);
  }

  function drawDish(g) {
    rect(g, C.ink, 7, 9, 2, 7);
    rect(g, '#8a95a8', 7, 9, 1, 7);
    for (let j = 0; j < 9; j++) {
      const hw = Math.round(6 * Math.sqrt(1 - Math.pow((j - 4) / 5, 2)));
      rect(g, C.ink, 7 - hw, j, hw * 2 + 1, 1);
      if (hw > 1) rect(g, j < 4 ? C.white : '#c9d1dc', 8 - hw, j, hw * 2 - 1, 1);
    }
    rect(g, C.ink, 7, 3, 2, 2);
  }

  /* ---------- the static map ---------- */
  function buildMap() {
    const { canvas, ctx: g } = makeCanvas(MW, MH, k);
    // sea, lighter toward the shore, with dithered band edges
    const bandY = [0, 13, 27, 41, 55, 67, 80];
    for (let b = 0; b < 6; b++) {
      rect(g, X.sea[b], 0, bandY[b], MW, bandY[b + 1] - bandY[b]);
      if (b) for (let x = 0; x < MW; x += 2) { rect(g, X.sea[b - 1], x, bandY[b], 1, 1); if (x % 4 === 0) rect(g, X.sea[b - 1], x + 1, bandY[b] + 1, 1, 1); }
    }
    // sand with a wet band at the waterline
    rect(g, C.sand, 0, 80, MW, 80);
    rect(g, X.wet, 0, 80, MW, 8);
    for (let x = 0; x < MW; x += 2) { rect(g, X.wet, x, 88, 1, 1); if (x % 4 === 0) rect(g, X.wet, x + 1, 89, 1, 1); }
    for (let ty = 5; ty < 10; ty++) for (let tx = 0; tx < COLS; tx++) {
      for (let n = 0; n < 7; n++) {
        const sx = tx * T + ((hash(tx * 7 + n, ty * 13 + n * 3) * 16) | 0), sy = ty * T + ((hash(n * 5 + 1, tx + ty * 31) * 16) | 0);
        if (sy < 91) continue;
        rect(g, n < 4 ? C.sandDark : X.sandHi, sx, sy, 1, 1);
      }
    }
    // shells and a starfish
    for (const [sx, sy] of [[40, 120], [150, 140], [300, 104], [262, 150], [70, 99], [215, 132]]) {
      rect(g, '#ffc2c9', sx, sy, 3, 1); rect(g, '#ffc2c9', sx + 1, sy - 1, 1, 1); rect(g, '#e88a96', sx, sy + 1, 3, 1);
    }
    for (const [sx, sy] of [[186, 146], [52, 150]]) {
      rect(g, C.orange, sx, sy - 2, 1, 5); rect(g, C.orange, sx - 2, sy, 5, 1); rect(g, '#ffb36b', sx, sy, 1, 1);
      rect(g, C.orange, sx - 1, sy + 1, 1, 1); rect(g, C.orange, sx + 1, sy + 1, 1, 1);
    }
    // boardwalk
    rect(g, X.plank, 0, 160, MW, 16);
    for (let b = 0; b < 4; b++) {
      const yy = 160 + b * 4;
      rect(g, X.plankHi, 0, yy, MW, 1);
      rect(g, X.plankLo, 0, yy + 3, MW, 1);
      for (let x = (b * 11) % 24; x < MW; x += 24) { rect(g, X.plankLo, x, yy, 1, 3); rect(g, C.woodDark, x + 3, yy + 1, 1, 1); }
    }
    rect(g, 'rgba(90,58,34,0.35)', 0, 159, MW, 1);
    rect(g, C.woodDark, 0, 174, MW, 2);
    // town ground
    for (let ty = 11; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      if ('ghPTG'.includes(MAP[ty][tx])) grassTile(g, tx, ty); else paveTile(g, tx, ty);
    }
    rect(g, X.shade, 0, 176, MW, 2);
    // pier
    pier(g);
    // beach things
    castle(g, 4 * T, 6 * T);
    towel(g, 12, 6, C.pink, C.white);
    towel(g, 6, 8, C.teal, C.yellow);
    for (const key in SIGNS) { const [sx, sy] = key.split(',').map(Number); signPost(g, sx * T, sy * T); }
    // shadows for the tall things drawn on top at runtime
    for (const [x, y] of [[1, 6], [20, 6], [0, 15], [21, 15], [0, 21], [21, 21]]) ellipse(g, x * T + 2, y * T + 12, 16, 5);
    for (const [x, y] of [[11, 6], [5, 8]]) ellipse(g, x * T - 2, y * T + 8, 24, 8);
    ellipse(g, 15 * T + 2, 7 * T + 10, 32, 8);
    ellipse(g, 19 * T + 2, 8 * T + 13, 12, 4);
    // hedges
    for (let ty = 11; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (MAP[ty][tx] === 'h') hedge(g, tx * T, ty * T);
    // buildings and their doormats
    PLACES.forEach((p) => {
      if (!p.w) return;
      BUILD[p.id](g, p.x * T, p.y * T, p.w * T);
      const mx = p.door * T + 2, my = (p.y + 4) * T + 1;
      rect(g, C.ink, mx, my, 12, 5);
      rect(g, p.mat, mx + 1, my, 10, 4);
      rect(g, 'rgba(255,255,255,0.35)', mx + 2, my + 1, 8, 1);
    });
    track(g);
    return canvas;
  }

  function ellipse(g, x, y, w, h) {
    for (let j = 0; j < h; j++) {
      const dy = (j + 0.5) / h * 2 - 1, hw = Math.round(w / 2 * Math.sqrt(1 - dy * dy));
      rect(g, X.shade, x + w / 2 - hw, y + j, hw * 2, 1);
    }
  }

  function grassTile(g, tx, ty) {
    const x = tx * T, y = ty * T;
    rect(g, X.grass, x, y, T, T);
    for (let n = 0; n < 4; n++) {
      const gx = x + 1 + ((hash(tx * 5 + n, ty * 11) * 12) | 0), gy = y + 2 + ((hash(ty * 7 + n, tx * 3 + 1) * 12) | 0);
      rect(g, X.grassLo, gx, gy, 1, 2); rect(g, X.grassLo, gx + 2, gy, 1, 2); rect(g, X.grassLo, gx + 1, gy + 1, 1, 1);
      rect(g, X.grassHi, gx + 4, gy + 3, 1, 1);
    }
    if (hash(tx * 3, ty * 9 + 2) > 0.55) {
      const fx = x + 3 + ((hash(tx, ty) * 9) | 0), fy = y + 4 + ((hash(ty, tx) * 8) | 0);
      const fc = [C.white, C.yellow, C.pink][(hash(tx + 1, ty) * 3) | 0];
      rect(g, fc, fx - 1, fy, 3, 1); rect(g, fc, fx, fy - 1, 1, 3); rect(g, C.orange, fx, fy, 1, 1);
    }
  }

  function paveTile(g, tx, ty) {
    const x = tx * T, y = ty * T;
    rect(g, X.pave, x, y, T, T);
    for (let r = 0; r < 2; r++) {
      const yy = y + r * 8, off = ((ty * 2 + r) & 1) * 4;
      rect(g, X.paveHi, x, yy, T, 1);
      rect(g, X.paveLo, x, yy + 7, T, 1);
      for (let s = off; s < T; s += 8) { rect(g, X.paveLo, x + s, yy, 1, 7); rect(g, X.paveHi, x + s + 1, yy + 1, 1, 5); }
    }
  }

  function hedge(g, x, y) {
    rect(g, X.shade, x + 2, y + 12, 13, 4);
    disc(g, C.palmDark, x + 8, y + 8, 7);
    disc(g, C.palm, x + 7, y + 7, 5);
    rect(g, '#7fd46a', x + 5, y + 4, 2, 1);
    rect(g, '#7fd46a', x + 4, y + 5, 1, 1);
    rect(g, C.palmDark, x + 9, y + 9, 1, 1);
    rect(g, C.coral, x + 10, y + 5, 1, 1);
  }

  function signPost(g, x, y) {
    rect(g, X.shade, x + 3, y + 13, 11, 3);
    rect(g, C.ink, x + 6, y + 9, 4, 7);
    rect(g, C.wood, x + 7, y + 9, 2, 6);
    rect(g, C.ink, x + 1, y + 1, 14, 10);
    rect(g, X.plankHi, x + 2, y + 2, 12, 8);
    rect(g, X.plank, x + 2, y + 8, 12, 2);
    rect(g, C.woodDark, x + 4, y + 4, 8, 1);
    rect(g, C.woodDark, x + 4, y + 6, 5, 1);
  }

  function castle(g, x, y) {
    const s = '#ecca8a', d = '#cfa565', l = '#f7e1b0';
    rect(g, X.shade, x + 2, y + 13, 13, 3);
    rect(g, d, x + 3, y + 7, 10, 7);
    rect(g, s, x + 3, y + 7, 10, 5);
    for (const tx of [x + 1, x + 11]) {
      rect(g, d, tx, y + 4, 4, 10);
      rect(g, s, tx, y + 4, 3, 9);
      rect(g, l, tx, y + 3, 1, 1); rect(g, l, tx + 2, y + 3, 1, 1);
    }
    rect(g, l, x + 3, y + 7, 10, 1);
    rect(g, C.woodDark, x + 7, y + 10, 2, 4);
    rect(g, C.woodDark, x + 8, y, 1, 7);
    rect(g, C.coral, x + 9, y, 3, 2);
  }

  function towel(g, tx, ty, a, b) {
    const x = tx * T + 2, y = ty * T + 3;
    rect(g, X.shade, x + 1, y + 1, 12, 26);
    rect(g, a, x, y, 12, 26);
    for (let yy = y + 3; yy < y + 24; yy += 6) rect(g, b, x, yy, 12, 3);
    for (let xx = x; xx < x + 12; xx += 2) { rect(g, b, xx, y - 1, 1, 1); rect(g, b, xx, y + 26, 1, 1); }
  }

  function pier(g) {
    const L = 113, R = 127;
    rect(g, X.deepShade, R, 34, 3, 46);
    rect(g, X.deepShade, 98, 33, 44, 3);
    const piling = (x, y) => { rect(g, C.woodDark, x, y, 3, 5); rect(g, X.plankLo, x, y, 3, 1); rect(g, C.foam, x - 1, y + 5, 5, 1); };
    for (const py of [38, 54, 70]) { piling(g, L - 3, py); piling(g, R, py); }
    piling(g, 96, 28); piling(g, 141, 28);
    const deck = (x, y, w, h) => {
      rect(g, X.plank, x, y, w, h);
      for (let yy = y; yy < y + h; yy += 4) { rect(g, X.plankHi, x, yy, w, 1); rect(g, X.plankLo, x, yy + 3, w, 1); }
      rect(g, C.woodDark, x, y, 1, h); rect(g, C.woodDark, x + w - 1, y, 1, h);
    };
    deck(L, 32, R - L, 60);
    deck(98, 18, 44, 16);
    rect(g, C.woodDark, L, 91, R - L, 1);
    // railing along the far edge of the platform
    rect(g, C.ink, 98, 15, 44, 3);
    rect(g, X.plankHi, 98, 16, 44, 1);
    for (let px = 98; px < 142; px += 10) rect(g, C.woodDark, px, 14, 2, 4);
    rect(g, C.woodDark, 140, 14, 2, 4);
    // bait bucket with a tail sticking out, tackle box
    rect(g, X.shade, 102, 29, 10, 3);
    rect(g, C.ink, 101, 21, 9, 9);
    rect(g, '#5b8fd0', 102, 22, 7, 7);
    rect(g, '#2a5bd7', 102, 22, 7, 1);
    rect(g, C.ink, 101, 21, 9, 1);
    rect(g, C.yellow, 104, 19, 3, 2); rect(g, C.yellow, 103, 18, 1, 1); rect(g, C.yellow, 107, 18, 1, 1);
    rect(g, X.shade, 131, 29, 11, 3);
    rect(g, C.ink, 130, 22, 11, 8);
    rect(g, '#3a9e55', 131, 23, 9, 6);
    rect(g, '#5fd068', 131, 23, 9, 1);
    rect(g, C.ink, 133, 20, 5, 2);
    rect(g, C.yellow, 135, 25, 1, 2);
  }

  function track(g) {
    const y0 = 23 * T;
    // fence along the top
    rect(g, C.white, 16, y0 + 2, 144, 1);
    rect(g, C.white, 192, y0 + 2, 144, 1);
    rect(g, '#c9d1dc', 16, y0 + 5, 144, 1);
    rect(g, '#c9d1dc', 192, y0 + 5, 144, 1);
    for (let x = 16; x < 336; x += 8) {
      if (x >= 160 && x < 192) continue;
      rect(g, C.ink, x, y0, 3, 8);
      rect(g, C.white, x + 1, y0 + 1, 1, 6);
    }
    rect(g, X.shade, 16, y0 + 8, 144, 2);
    rect(g, X.shade, 192, y0 + 8, 144, 2);
    // the gate: two posts and open gates
    for (const gx of [157, 191]) { rect(g, C.ink, gx, y0 - 4, 5, 13); rect(g, C.navy, gx + 1, y0 - 3, 3, 11); rect(g, C.yellow, gx + 1, y0 - 3, 3, 2); }
    for (let i = 0; i < 6; i++) { rect(g, '#c9d1dc', 162 + i, y0 + 1 + i, 1, 1); rect(g, '#c9d1dc', 190 - i, y0 + 1 + i, 1, 1); }
    // the oval: lanes, lines and infield
    const tx = 24, ty = y0 + 10, tw = 304, th = 36;
    stadium(g, X.shade, tx + 1, ty + 2, tw, th);
    const rings = [C.white, X.track, C.white, X.track, C.white, X.track, C.white, '#6cc04a'];
    const ins = [0, 1, 3, 4, 6, 7, 9, 10];
    for (let i = 0; i < rings.length; i++) stadium(g, rings[i], tx + ins[i], ty + ins[i], tw - ins[i] * 2, th - ins[i] * 2);
    // infield stripes and a long jump pit
    for (let x = tx + 22; x < tx + tw - 22; x += 16) rect(g, '#7fd05a', x, ty + 11, 8, 14);
    rect(g, C.ink, tx + 200, ty + 13, 36, 10);
    rect(g, C.sand, tx + 201, ty + 14, 34, 8);
    rect(g, C.sandDark, tx + 204, ty + 17, 3, 2);
    rect(g, C.sandDark, tx + 220, ty + 15, 2, 2);
    // start line and lane numbers on the top straight
    for (let j = 0; j < 9; j++) rect(g, (j & 1) ? C.ink : C.white, tx + 120, ty + 1 + j, 2, 1);
    // hurdles
    for (const hx of [tx + 60, tx + 230]) {
      rect(g, C.ink, hx, ty + 1, 1, 6); rect(g, C.ink, hx + 7, ty + 1, 1, 6);
      rect(g, C.white, hx, ty + 1, 8, 2); rect(g, C.ink, hx + 2, ty + 1, 2, 2); rect(g, C.ink, hx + 6, ty + 1, 1, 2);
    }
    // TRACK sign on the fence beside the gate
    signBoard(g, 136, y0 - 2, 'TRACK', X.track, C.white);
  }

  function buildOverlays() {
    const o = [];
    const add = (img, x, y) => o.push({ img, x, y });
    for (const [x, y] of [[1, 6], [20, 6], [0, 15], [21, 15], [0, 21], [21, 21]]) add(S.palm, x * T - 8, (y + 1) * T - 44);
    add(S.umbA, 11 * T - 8, 7 * T - 32);
    add(S.umbB, 5 * T - 8, 9 * T - 32);
    add(S.tower, 15 * T, 8 * T - 56);
    for (const [x, y] of [[9, 11], [12, 11], [9, 17], [12, 17]]) add(S.lamp, x * T, (y + 1) * T - 32);
    add(S.surf, 19 * T + 2, 9 * T - 28);
    add(S.spire, 16 * T + 40 - 9, 18 * T + 17 - 46);
    add(S.dish, 5 * T + 6, 18 * T - 8);
    return o;
  }

  /* ---------- runtime drawing ---------- */
  function drawSea() {
    const tx0 = Math.max(0, camX >> 4), tx1 = Math.min(COLS - 1, (camX + W) >> 4);
    const ty1 = Math.min(4, (camY + H) >> 4);
    for (let ty = camY >> 4; ty <= ty1; ty++) {
      const col = X.crest[ty < 2 ? 0 : ty < 3 ? 1 : 2];
      for (let tx = tx0; tx <= tx1; tx++) {
        if (MAP[ty][tx] !== '~') continue;
        const hv = HASH[idx(tx, ty)];
        for (let n = 0; n < 2; n++) {
          const ph = (clock * 0.55 + hv * 5.3 + n * 0.9) % 2;
          if (ph > 1) continue;
          const len = 1 + Math.round(Math.sin(ph * Math.PI) * 4);
          const x = tx * T + 2 + (((hv * 97 + n * 5) % 6) | 0) + Math.round(ph * 3);
          const y = ty * T + 3 + n * 7 + (((hv * 31) % 4) | 0);
          rect(ctx, col, x - camX, y - camY, Math.min(len, tx * T + 14 - x), 1);
          if (len > 3) rect(ctx, col, x + 1 - camX, y - 1 - camY, len - 3, 1);
        }
      }
    }
    // sparkles
    for (let n = 0; n < 14; n++) {
      const v = Math.sin(clock * 2.3 + n * 1.7);
      if (v < 0.93) continue;
      const sx = ((hash(n, 77) * MW) | 0), sy = 4 + ((hash(77, n) * 60) | 0);
      if (sx >= 96 && sx < 146) continue;
      rect(ctx, C.white, sx - camX, sy - camY, 1, 1);
      if (v > 0.985) { rect(ctx, C.white, sx - 1 - camX, sy - camY, 3, 1); rect(ctx, C.white, sx - camX, sy - 1 - camY, 1, 3); }
    }
    if (camY > 96) return;
    // a breaker rolling in, then the wash running up the sand
    const ph = (clock * 0.21) % 1;
    const x0 = camX & ~1, x1 = camX + W;
    if (ph < 0.82) {
      const by = 62 + Math.round(ph * 15);
      for (let x = x0; x < x1; x += 2) {
        if (x >= 108 && x < 132) continue;
        if (((x * 7 + by * 3) % 13) < 8) rect(ctx, ph > 0.6 ? C.white : X.crest[3], x - camX, by - camY + Math.round(Math.sin(x * 0.15)), 2, 1);
      }
    }
    for (let x = x0; x < x1; x += 2) {
      if (x >= 110 && x < 130) continue;
      const e = 82 + Math.round(1.8 * Math.sin(clock * 1.2 + x * 0.05) + 1.4 * Math.sin(clock * 2.1 - x * 0.13));
      rect(ctx, X.wash, x - camX, 79 - camY, 2, e - 79);
      rect(ctx, C.white, x - camX, e - camY, 2, 1);
      if (((x >> 1) + (clock * 3 | 0)) % 5 === 0) rect(ctx, C.white, x - camX, e - 2 - camY, 1, 1);
    }
  }

  function drawFlag(x, y, w, h, base, stripe) {
    for (let c = 0; c < w; c++) {
      const off = Math.round(Math.sin(clock * 7 - c * 0.7) * (c / w) * 1.5);
      rect(ctx, C.ink, x + c - camX, y + off - 1 - camY, 1, h + 2);
      rect(ctx, base, x + c - camX, y + off - camY, 1, h);
      if (stripe) {
        const sy = Math.round(c * (h - 1) / (w - 1));
        rect(ctx, stripe, x + c - camX, y + off + sy - camY, 1, 2);
      }
    }
  }

  function drawDetails() {
    // fishing rod and bobber at the end of the pier
    if (camY < 40) {
      for (let i = 0; i < 16; i++) rect(ctx, C.woodDark, 121 + Math.round(i * 0.55) - camX, 22 - i - camY, 1, 1);
      const bob = Math.sin(clock * 2.6) > 0 ? 0 : 1;
      for (let i = 0; i < 6; i++) rect(ctx, 'rgba(255,255,255,0.7)', 130 + Math.round(i * 0.3) - camX, 7 + i + bob * (i > 3 ? 1 : 0) - camY, 1, 1);
      rect(ctx, C.ink, 130 - camX, 12 + bob - camY, 4, 4);
      rect(ctx, C.red, 131 - camX, 12 + bob - camY, 2, 2);
      rect(ctx, C.white, 131 - camX, 14 + bob - camY, 2, 1);
      const rp = (clock * 0.7) % 1;
      const rw = 4 + Math.round(rp * 6);
      if (rp < 0.8) { rect(ctx, X.crest[3], 132 - rw - camX, 16 - camY, 2, 1); rect(ctx, X.crest[3], 132 + rw - 1 - camX, 16 - camY, 2, 1); }
    }
    // flags
    drawFlag(15 * T + 30, 8 * T - 56, 8, 5, C.red, null);
    if (camY < 210) { rect(ctx, C.ink, 82 - camX, 178 - camY, 1, 16); drawFlag(83, 179, 10, 7, C.red, C.white); }
    if (camY > 120 && camY < 300) drawFlag(16 * T + 40, 18 * T - 29, 7, 4, X.duke, null);
    // arcade marquee bulbs
    if (camY < 270 && camX + W > 272) {
      const bx = 17 * T + 4, by = 12 * T + 15, bw = 56, bh = 16, n = Math.floor(clock * 6);
      for (let i = 0, x = bx; x < bx + bw; x += 4, i++) {
        rect(ctx, (i + n) % 3 ? '#6a4a9a' : C.yellow, x - camX, by - camY, 2, 1);
        rect(ctx, (i + n + 1) % 3 ? '#6a4a9a' : C.yellow, x - camX, by + bh - 1 - camY, 2, 1);
      }
    }
    // code lab: blinking cursor and antenna light
    if (camY > 180 && camX < 170) {
      if ((clock * 2 | 0) % 2) rect(ctx, C.green, 5 * T + 3 + 12 - camX, 18 * T + 50 - camY, 3, 1);
      rect(ctx, C.ink, 5 * T + 70 - camX, 18 * T - 6 - camY, 1, 9);
      rect(ctx, (clock * 1.5 | 0) % 2 ? C.red : '#5a1a22', 5 * T + 69 - camX, 18 * T - 8 - camY, 3, 2);
    }
  }

  function drawActors(ppx, ppy) {
    // the crab, gull and lifeguard are all north of or level with these rows; sort against the player
    const cx = Math.round((crab.mv ? crab.x + (crab.tx - crab.x) * crab.p : crab.x) * T), cy = crab.y * T;
    const before = [cy <= ppy, gull.y * T <= ppy, guard.y * T <= ppy];
    for (let pass = 0; pass < 2; pass++) {
      const want = pass === 0;
      if (before[0] === want) {
        rect(ctx, X.shade, cx + 3 - camX, cy + 14 - camY, 10, 2);
        blit(S.crab[(crab.mv ? (clock * 12 | 0) : (clock * 2 | 0)) & 1], cx - camX, cy + 4 - camY);
      }
      if (before[1] === want) {
        const fl = gull.act === 2 ? ((clock * 10 | 0) & 1) : 0;
        rect(ctx, X.shade, gull.x * T + 4 - camX, gull.y * T + 14 - camY, 9, 2);
        blit(S.gull[gull.left ? 'left' : 'right'][fl], gull.x * T - camX, gull.y * T - camY + (gull.act === 1 ? 1 : 0));
      }
      if (before[2] === want) {
        rect(ctx, X.shade, guard.x * T + 3 - camX, guard.y * T + 14 - camY, 10, 2);
        blit(S.guard, guard.x * T - camX, guard.y * T - camY);
      }
      if (want) {
        let fr = 0;
        if (pl.mv && pl.p < 0.5) fr = (pl.steps & 1) ? 1 : 2;
        else if (!pl.mv && clock - pl.bump < 0.2) fr = (clock * 5 | 0) & 1 ? 1 : 2;
        rect(ctx, X.shade, ppx + 3 - camX, ppy + 14 - camY, 10, 2);
        blit(S.pl[pl.f][fr], ppx - camX, ppy - camY);
      }
    }
  }

  function drawWorld() {
    const ppx = Math.round((pl.mv ? pl.x + (pl.tx - pl.x) * pl.p : pl.x) * T);
    const ppy = Math.round((pl.mv ? pl.y + (pl.ty - pl.y) * pl.p : pl.y) * T);
    camX = Math.max(0, Math.min(MW - W, ppx + 8 - (W >> 1)));
    camY = Math.max(0, Math.min(MH - H, ppy + 8 - (H >> 1)));
    ctx.drawImage(mapImg, camX * k, camY * k, W * k, H * k, 0, 0, W, H);
    if (camY < 100) drawSea();
    drawActors(ppx, ppy);
    for (let i = 0; i < overlays.length; i++) {
      const o = overlays[i];
      if (o.x < camX + W && o.x + o.img.lw > camX && o.y < camY + H && o.y + o.img.lh > camY) blit(o.img, o.x - camX, o.y - camY);
    }
    drawDetails();
  }

  /* ---------- title ---------- */
  const SKY = ['#3b4cc0', '#6a4fd0', '#a64fc4', '#e2508f', '#ff6f6a', '#ff9a4a', '#ffc24a'];
  function outlined(s, x, y, color, size) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 2; dy++) if (dx || dy) pxText(ctx, s, x + dx, y + dy, C.ink, size, 'center');
    pxText(ctx, s, x, y, color, size, 'center');
  }
  function drawTitle() {
    const hz = Math.round(H * 0.56), st = hz + Math.round(H * 0.12);
    const bh = hz / SKY.length;
    for (let i = 0; i < SKY.length; i++) {
      const y0 = Math.round(i * bh);
      rect(ctx, SKY[i], 0, y0, W, Math.round((i + 1) * bh) - y0);
      if (i) for (let x = (i & 1); x < W; x += 2) rect(ctx, SKY[i - 1], x, y0, 1, 1);
    }
    // a retro striped sun sinking into the sea
    const sx = 108, r = Math.round(H * 0.13);
    for (let dy = -r; dy <= 0; dy++) {
      const w = Math.floor(Math.sqrt((r + 0.5) * (r + 0.5) - dy * dy));
      const gap = dy > -r * 0.55 && ((dy + 200) % 4 === 0 || (dy > -r * 0.25 && (dy + 200) % 4 === 1));
      if (!gap) rect(ctx, dy < -r * 0.5 ? '#ffe680' : '#ffc04a', sx - w, hz + dy, w * 2 + 1, 1);
    }
    // sea with the sun's reflection
    rect(ctx, '#2b3fa8', 0, hz, W, st - hz);
    rect(ctx, '#3a5cc8', 0, hz, W, 1);
    for (let j = 0, y = hz + 2; y < st - 1; j++, y += 2) {
      const w = Math.max(2, Math.round((r - j * 2) * (0.8 + 0.3 * Math.sin(clock * 3 + j))));
      rect(ctx, j & 1 ? '#ff9a4a' : '#ffd25a', sx - w + Math.round(Math.sin(clock * 2 + j) * 2), y, w * 2, 1);
      const wx = (j * 37 + Math.floor(clock * 12)) % (W + 20) - 10;
      rect(ctx, '#5a7ee0', wx, y, 4, 1);
    }
    // sand and surf
    rect(ctx, C.sand, 0, st, W, H - st);
    for (let x = 0; x < W; x += 2) {
      const e = st + 1 + Math.round(1.5 + 1.5 * Math.sin(clock * 1.5 + x * 0.08));
      rect(ctx, X.wash, x, st, 2, e - st);
      rect(ctx, C.white, x, e, 2, 1);
    }
    for (let i = 0; i < 26; i++) rect(ctx, i & 1 ? X.sandHi : C.sandDark, (hash(i, 3) * W) | 0, st + 6 + ((hash(3, i) * (H - st - 8)) | 0), 1, 1);
    // palm silhouette and a gull
    blit(S.palmDark, -6, hz - 30);
    const gx = (clock * 16) % (W + 40) - 20, gy = Math.round(hz * 0.62 + Math.sin(clock * 2) * 3), up = (clock * 4 | 0) & 1;
    rect(ctx, C.ink, gx, gy + (up ? 0 : 1), 2, 1); rect(ctx, C.ink, gx + 2, gy + 1, 1, 1); rect(ctx, C.ink, gx + 3, gy + (up ? 0 : 1), 2, 1);
    // title
    const ty = Math.max(8, Math.round(hz * 0.14));
    outlined('BEACH', 80, ty, C.yellow, 16);
    outlined('WALK', 80, ty + 19, C.white, 16);
    if (H >= 180) pxText(ctx, "a stroll through Omar's world", 80, ty + 40, C.white, 10, 'center', 'VT323');
    // Omar strolling, a crab heading the other way
    const s = H >= 180 ? 2 : 1, foot = H - 15;
    const ox = Math.round((clock * 18) % (W + 40) - 20), fr = [1, 0, 2, 0][(clock * 7 | 0) % 4];
    const im = S.pl.right[fr];
    ctx.drawImage(im, ox, foot - 16 * s, 16 * s, 16 * s);
    const cxr = Math.round(W + 20 - (clock * 11) % (W + 40));
    blit(S.crab[(clock * 10 | 0) & 1], cxr, foot - 11);
    // prompts
    if ((clock * 2 | 0) % 2 === 0 || clock < 0.4) pxText(ctx, 'A: START', 6, H - 11, C.ink);
    pxText(ctx, 'B: EXIT', W - 6, H - 11, C.ink, 8, 'right');
  }

  /* ---------- dialog and menu ---------- */
  function wrap(text, maxW) {
    const words = text.split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && textW(t) > maxW) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function textW(s) {
    textW.c = textW.c || document.createElement('canvas').getContext('2d');
    textW.c.font = '12px VT323';
    return Math.ceil(textW.c.measureText(s).width);
  }

  function say(name, text, color, choice) {
    const lines = wrap(text, 138), pages = [];
    for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
    dlg = { name, color: color || C.navy, pages, widths: pages.map((p) => p.map(textW)), page: 0, rev: 0, choice: choice || null, sel: 0 };
    mode = 'dialog';
    held.length = 0; path = null; queued = null;
    host.sfx('blip');
  }
  const pageW = () => dlg.widths[dlg.page].reduce((a, b) => a + b, 0);
  const lastPage = () => dlg.page === dlg.pages.length - 1;

  function dlgBox() {
    const n = dlg.pages[dlg.page].length, ch = dlg.choice && lastPage() ? 13 : 0;
    const bh = 9 + n * 11 + ch + 3;
    return { x: 3, y: H - bh - 3, w: W - 6, h: bh };
  }

  function drawDialog() {
    const b = dlgBox(), pg = dlg.pages[dlg.page];
    rect(ctx, 'rgba(20,33,61,0.35)', b.x + 2, b.y + 2, b.w, b.h);
    rect(ctx, C.ink, b.x, b.y, b.w, b.h);
    rect(ctx, C.white, b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    frame(ctx, '#dbe5f3', b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    if (dlg.name) {
      const tw = dlg.name.length * 8 + 8;
      rect(ctx, C.ink, b.x + 6, b.y - 11, tw + 4, 13);
      rect(ctx, dlg.color, b.x + 8, b.y - 9, tw, 11);
      pxText(ctx, dlg.name, b.x + 12, b.y - 8, C.white);
    }
    let rem = dlg.rev;
    for (let i = 0; i < pg.length && rem > 0; i++) {
      const lx = b.x + 8, ly = b.y + 5 + i * 11, lw = dlg.widths[dlg.page][i];
      pxText(ctx, pg[i], lx, ly, C.ink, 12, 'left', 'VT323');
      if (rem < lw) rect(ctx, C.white, lx + Math.floor(rem), ly + 1, lw - Math.floor(rem) + 2, 12);
      rem -= lw;
    }
    const done = dlg.rev >= pageW();
    if (!done) return;
    if (dlg.choice && lastPage()) {
      const cy = b.y + b.h - 15;
      for (let i = 0; i < 2; i++) {
        const cx = b.x + b.w - (i ? 38 : 88);
        pxText(ctx, i ? 'NO' : 'YES', cx, cy, i === dlg.sel ? C.ink : C.gray);
        if (i === dlg.sel) arrow(cx - 9, cy, dlg.color);
      }
    } else if ((clock * 3 | 0) % 2) {
      const ax = b.x + b.w - 11, ay = b.y + b.h - 8;
      rect(ctx, C.coral, ax, ay, 5, 1); rect(ctx, C.coral, ax + 1, ay + 1, 3, 1); rect(ctx, C.coral, ax + 2, ay + 2, 1, 1);
    }
  }

  function arrow(x, y, c) {
    for (let i = 0; i < 4; i++) rect(ctx, c === C.ink ? C.coral : c, x + i, y + i, 1, 7 - i * 2);
  }

  function dlgButton(b) {
    if (b === 'left' || b === 'right' || b === 'up' || b === 'down') {
      if (dlg.choice && lastPage() && dlg.rev >= pageW()) { dlg.sel = b === 'left' || b === 'up' ? 0 : 1; host.sfx('blip'); }
      return;
    }
    if (b !== 'a' && b !== 'b') return;
    if (dlg.rev < pageW()) { dlg.rev = 1e9; return; }
    if (!lastPage()) { dlg.page++; dlg.rev = 0; host.sfx('blip'); return; }
    if (dlg.choice) {
      const yes = b === 'a' && dlg.sel === 0, ch = dlg.choice;
      closeDialog();
      if (yes) ch.yes(); else host.sfx('back');
      return;
    }
    closeDialog();
    host.sfx(b === 'a' ? 'select' : 'back');
  }
  function closeDialog() { dlg = null; mode = 'walk'; }

  function drawPause() {
    rect(ctx, 'rgba(20,33,61,0.5)', 0, 0, W, H);
    const bw = 124, bh = 62, bx = (W - bw) >> 1, by = (H - bh) >> 1;
    rect(ctx, 'rgba(20,33,61,0.35)', bx + 3, by + 3, bw, bh);
    rect(ctx, C.ink, bx, by, bw, bh);
    rect(ctx, C.white, bx + 2, by + 2, bw - 4, bh - 4);
    rect(ctx, C.navy, bx + 2, by + 2, bw - 4, 14);
    pxText(ctx, 'PAUSED', W / 2, by + 5, C.white, 8, 'center');
    const items = ['RESUME', 'LEAVE TOWN'];
    for (let i = 0; i < 2; i++) {
      const y = by + 24 + i * 16;
      pxText(ctx, items[i], bx + 22, y, i === menu ? C.ink : C.grayDark);
      if (i === menu) arrow(bx + 10, y, C.coral);
    }
  }

  /* ---------- moving around ---------- */
  function npcAt(x, y) {
    if (x === gull.x && y === gull.y) return 'gull';
    if (x === guard.x && y === guard.y) return 'guard';
    if (y === crab.y && (x === crab.x || (crab.mv && x === crab.tx))) return 'crab';
    return null;
  }
  const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !solid[idx(x, y)] && !npcAt(x, y);

  function bump() {
    pl.bump = clock;
    if (clock - pl.lastBump > 0.35) { pl.lastBump = clock; host.sfx('bump'); }
  }

  function tryMove(d) {
    pl.f = d;
    const nx = pl.x + DIR[d][0], ny = pl.y + DIR[d][1];
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { bump(); return false; }
    const i = idx(nx, ny);
    if (isDoor[i] && PLACES[owner[i]].dir === d) { askPlace(owner[i]); return false; }
    if (!free(nx, ny)) { bump(); return false; }
    pl.mv = true; pl.tx = nx; pl.ty = ny; pl.p = 0; pl.steps++;
    if (pl.steps % 2 === 0) host.sfx('step');
    return true;
  }

  function arrive() {
    pl.mv = false; pl.x = pl.tx; pl.y = pl.ty; pl.p = 0;
    if (MAP[pl.y][pl.x] === 'F') { path = null; askPlace(9); }
  }

  function walkUpdate(dt) {
    if (pl.mv) {
      pl.p += dt / STEP;
      if (pl.p < 1) return;
      dt = (pl.p - 1) * STEP;
      arrive();
      if (mode !== 'walk') return;
    }
    if (pl.turn > 0) { pl.turn -= dt; if (pl.turn > 0) return; dt = 0; }
    if (queued) { const d = queued; queued = null; tryMove(d); }
    else if (path) stepPath();
    else if (held.length) tryMove(held[held.length - 1]);
    else if (pl.wantA) { pl.wantA = false; interact(); }
    if (pl.mv) pl.p = Math.min(0.9, dt / STEP);
  }

  function stepPath() {
    if (pathI >= path.length) { const g = goal; path = null; finishPath(g); return; }
    const n = path[pathI], nx = n % COLS, ny = (n / COLS) | 0;
    const d = nx > pl.x ? 'right' : nx < pl.x ? 'left' : ny > pl.y ? 'down' : 'up';
    if (npcAt(nx, ny)) { if (!plan(goal)) { path = null; pl.f = d; bump(); } return; }
    pathI++;
    tryMove(d);
  }

  function finishPath(g) {
    if (!g) return;
    let tx = g.tx, ty = g.ty;
    if (g.npc) { const o = g.npc === 'crab' ? crab : g.npc === 'gull' ? gull : guard; tx = o.mv ? o.tx : o.x; ty = o.y; }
    if (g.face) pl.f = g.face;
    else if (tx >= 0 && Math.abs(tx - pl.x) + Math.abs(ty - pl.y) === 1) pl.f = tx > pl.x ? 'right' : tx < pl.x ? 'left' : ty > pl.y ? 'down' : 'up';
    else return;
    if (g.act) interact();
  }

  // Breadth-first search over walkable tiles to any goal tile.
  const prev = new Int16Array(COLS * ROWS), queue = new Int16Array(COLS * ROWS), goalMark = new Uint8Array(COLS * ROWS);
  function plan(g) {
    const sx = pl.mv ? pl.tx : pl.x, sy = pl.mv ? pl.ty : pl.y, start = idx(sx, sy);
    goalMark.fill(0);
    for (const i of g.goals) goalMark[i] = 1;
    prev.fill(-1);
    let qh = 0, qt = 0;
    queue[qt++] = start; prev[start] = start;
    while (qh < qt) {
      const c = queue[qh++];
      if (goalMark[c]) {
        const out = [];
        for (let n = c; n !== start; n = prev[n]) out.push(n);
        out.reverse();
        path = out; pathI = 0; goal = g;
        return true;
      }
      const cx = c % COLS, cy = (c / COLS) | 0;
      for (const d in DIR) {
        const nx = cx + DIR[d][0], ny = cy + DIR[d][1];
        if (!free(nx, ny)) continue;
        const n = idx(nx, ny);
        if (prev[n] !== -1) continue;
        prev[n] = c; queue[qt++] = n;
      }
    }
    return false;
  }

  function neighbors(x, y) {
    const out = [];
    for (const d in DIR) {
      const nx = x + DIR[d][0], ny = y + DIR[d][1];
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !solid[idx(nx, ny)]) out.push(idx(nx, ny));
    }
    return out;
  }

  function walkTo(tx, ty) {
    const i = idx(tx, ty), n = npcAt(tx, ty);
    let g;
    if (n) g = { goals: neighbors(tx, ty), npc: n, tx, ty, act: true };
    else if (SIGNS[tx + ',' + ty]) g = { goals: neighbors(tx, ty), tx, ty, act: true };
    else if (owner[i] >= 0) {
      const p = PLACES[owner[i]];
      g = p.spot ? { goals: p.outs, tx: -1, ty: -1 } : { goals: p.outs, face: p.dir, act: true, tx: -1, ty: -1 };
    } else if (!solid[i]) g = { goals: [i], tx: -1, ty: -1 };
    else g = { goals: neighbors(tx, ty), tx, ty };
    queued = null;
    const here = idx(pl.mv ? pl.tx : pl.x, pl.mv ? pl.ty : pl.y);
    if (!pl.mv && g.goals.includes(here)) {
      path = null;
      if (owner[here] === 9 && MAP[pl.y][pl.x] === 'F') { askPlace(9); return; }
      finishPath(g);
      return;
    }
    if (!plan(g)) { path = null; host.sfx('bump'); }
  }

  function interact() {
    if (MAP[pl.y][pl.x] === 'F') { askPlace(9); return; }
    const fx = pl.x + DIR[pl.f][0], fy = pl.y + DIR[pl.f][1];
    if (fx < 0 || fy < 0 || fx >= COLS || fy >= ROWS) return;
    const n = npcAt(fx, fy);
    if (n) {
      if (n === 'gull') gull.left = fx > pl.x ? true : fx < pl.x ? false : gull.left;
      const t = TALK[n];
      say(t[0], t[1], t[2]);
      return;
    }
    const s = SIGNS[fx + ',' + fy];
    if (s) { say(s[0], s[1], C.woodDark); return; }
    const o = owner[idx(fx, fy)];
    if (o >= 0) askPlace(o);
  }

  function askPlace(o) {
    const p = PLACES[o];
    say(p.name, p.text, p.color, { yes: () => enter(p) });
  }

  function enter(p) {
    host.sfx('door');
    let sx = pl.x, sy = pl.y, sf = BACK[p.dir];
    if (p.spot) { sx = 7; sy = 2; sf = 'down'; }
    store.set('pos', { x: sx, y: sy, f: sf });
    store.set('back', Date.now());
    fadeD = 1; fadeV = 0;
    fadeThen = () => {
      host.open(p.id);
      if (!alive) return;
      pl.x = sx; pl.y = sy; pl.f = sf;
    };
  }

  function updateNpcs(dt) {
    const s = dt / 1000;
    if (crab.mv) {
      crab.p += dt / 240;
      if (crab.p >= 1) { crab.x = crab.tx; crab.mv = false; crab.p = 0; crab.wait = Math.random() < 0.6 ? 0.05 : 0.6 + Math.random() * 1.4; }
    } else if (mode === 'walk' && (crab.wait -= s) <= 0) {
      let nx = crab.x + crab.dir;
      if (nx < crab.min || nx > crab.max || Math.random() < 0.08) { crab.dir = -crab.dir; nx = crab.x + crab.dir; }
      const blocked = (pl.x === nx && pl.y === crab.y) || (pl.mv && pl.tx === nx && pl.ty === crab.y) || solid[idx(nx, crab.y)];
      if (blocked) { crab.dir = -crab.dir; crab.wait = 0.5; } else { crab.tx = nx; crab.mv = true; crab.p = 0; }
    }
    gull.actT -= s;
    if (gull.actT <= 0) gull.act = 0;
    if ((gull.wait -= s) <= 0) {
      gull.wait = 1.2 + Math.random() * 2.5;
      const r = Math.random();
      if (r < 0.3) gull.left = !gull.left;
      else if (r < 0.65) { gull.act = 1; gull.actT = 0.35; }
      else { gull.act = 2; gull.actT = 0.6; }
    }
  }

  /* ---------- loop ---------- */
  function update(dt) {
    clock += dt / 1000;
    updateNpcs(dt);
    if (fadeD) {
      fadeV += fadeD * dt / 240;
      if (fadeD > 0 && fadeV >= 1) {
        fadeV = 1; fadeD = -1;
        const f = fadeThen; fadeThen = null;
        if (f) f();
      } else if (fadeD < 0 && fadeV <= 0) { fadeV = 0; fadeD = 0; }
      if (fadeD > 0) return;
    }
    if (mode === 'dialog' && dlg) dlg.rev += dt * 0.3;
    if (mode === 'walk') walkUpdate(dt);
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    if (mode === 'title') drawTitle(); else drawWorld();
    if (mode === 'dialog' && dlg) drawDialog();
    if (mode === 'pause') drawPause();
    if (fadeV > 0) { ctx.globalAlpha = Math.min(1, fadeV); rect(ctx, C.ink, 0, 0, W, H); ctx.globalAlpha = 1; }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    if (!ready) { rect(ctx, C.ink, 0, 0, W, H); return; }
    update(dt);
    if (alive) draw();
  }

  function beginWalk() {
    mode = 'walk';
    if (!store.get('tip')) {
      store.set('tip', 1);
      say('TIP', "Walk into a building to open that part of Omar's life. B to leave.", C.coral);
    }
  }

  function leaveAsk() {
    say('OZ BEACH', 'Leave town?', C.navy, { yes: () => { host.sfx('back'); host.exit(); } });
  }

  /* ---------- input ---------- */
  function button(b, down) {
    if (!alive || paused || !ready) return;
    if (DIR[b]) {
      const i = held.indexOf(b);
      if (i >= 0) held.splice(i, 1);
      if (!down) return;
    }
    if (!down || fadeD > 0) return;
    if (mode === 'title') {
      if (b === 'a' || b === 'start') { host.sfx('select'); fadeD = 1; fadeV = 0; fadeThen = beginWalk; }
      else if (b === 'b') { host.sfx('back'); host.exit(); }
      return;
    }
    if (mode === 'dialog') { dlgButton(b); return; }
    if (mode === 'pause') {
      if (b === 'up' || b === 'down') { menu = menu ? 0 : 1; host.sfx('blip'); }
      else if (b === 'a') { if (menu) { mode = 'walk'; leaveAsk(); } else { mode = 'walk'; host.sfx('select'); } }
      else if (b === 'b' || b === 'start') { mode = 'walk'; host.sfx('back'); }
      return;
    }
    // walking
    if (DIR[b]) {
      held.push(b);
      path = null; queued = null;
      if (!pl.mv && pl.f !== b) { pl.f = b; pl.turn = 80; }
    } else if (b === 'a') {
      path = null;
      if (pl.mv) pl.wantA = true; else interact();
    } else if (b === 'b') leaveAsk();
    else if (b === 'start') { menu = 0; mode = 'pause'; held.length = 0; path = null; host.sfx('select'); }
  }

  function tap(x, y) {
    if (!alive || paused || !ready || fadeD > 0) return;
    if (mode === 'title') {
      if (x > W - 70 && y > H - 22) { host.sfx('back'); host.exit(); }
      else button('a', true);
      return;
    }
    if (mode === 'dialog') {
      const bx = dlgBox();
      if (dlg.choice && lastPage() && dlg.rev >= pageW()) {
        const cy = bx.y + bx.h - 15;
        if (y < cy - 6 || y > cy + 12) return;
        const yesX = bx.x + bx.w - 88, noX = bx.x + bx.w - 38;
        if (x >= yesX - 12 && x < yesX + 30) { dlg.sel = 0; dlgButton('a'); }
        else if (x >= noX - 12 && x < noX + 24) { dlg.sel = 1; dlgButton('a'); }
        return;
      }
      dlgButton('a');
      return;
    }
    if (mode === 'pause') {
      const bw = 124, bh = 62, bx = (W - bw) >> 1, by = (H - bh) >> 1;
      if (x < bx || x > bx + bw || y < by || y > by + bh) { mode = 'walk'; host.sfx('back'); return; }
      for (let i = 0; i < 2; i++) if (y >= by + 20 + i * 16 && y < by + 36 + i * 16) { menu = i; button('a', true); }
      return;
    }
    const tx = Math.floor((x + camX) / T), ty = Math.floor((y + camY) / T);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
    held.length = 0;
    walkTo(tx, ty);
  }

  function swipe(dir) {
    if (!alive || paused || !ready || fadeD > 0 || !DIR[dir]) return;
    if (mode === 'dialog') { dlgButton(dir); return; }
    if (mode !== 'walk') return;
    path = null; held.length = 0;
    queued = dir;
  }

  /* ---------- lifecycle ---------- */
  function start() {
    alive = true; paused = false; last = 0;
    const s = store.get('pos');
    if (s && Number.isInteger(s.x) && Number.isInteger(s.y) && s.x >= 0 && s.y >= 0 && s.x < COLS && s.y < ROWS && !solid[idx(s.x, s.y)] && DIR[s.f]) {
      pl.x = s.x; pl.y = s.y; pl.f = s.f;
    }
    const back = store.get('back');
    if (back && Date.now() - back < RETURN_MS) {
      store.set('back', 0);
      mode = 'walk'; fadeV = 1; fadeD = -1;
    } else mode = 'title';
    const fonts = document.fonts ? Promise.all([document.fonts.load('8px PS2P'), document.fonts.load('12px VT323'), document.fonts.load('10px VT323')]) : Promise.resolve();
    fonts.catch(() => {}).then(() => {
      if (!alive) return;
      if (!mapImg) { S = buildSprites(); mapImg = buildMap(); overlays = buildOverlays(); }
      ready = true;
    });
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    alive = false;
    cancelAnimationFrame(raf);
    raf = 0;
    held.length = 0;
  }

  function pause() {
    if (!alive || paused) return;
    paused = true;
    cancelAnimationFrame(raf);
    raf = 0;
    held.length = 0;
  }

  function resume() {
    if (!alive || !paused) return;
    paused = false;
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  // For the dev harness only: the pre-rendered map, and a way to stand somewhere.
  const debug = {
    map() {
      const { canvas, ctx: g } = makeCanvas(MW, MH, k);
      g.drawImage(mapImg, 0, 0, MW, MH);
      for (const o of overlays) g.drawImage(o.img, o.x, o.y, o.img.lw, o.img.lh);
      return canvas;
    },
    warp(x, y, f = 'down') { pl.x = x; pl.y = y; pl.f = f; pl.mv = false; path = null; },
    state: () => ({ mode, x: pl.x, y: pl.y, f: pl.f, crab: crab.x, camX, camY })
  };

  return { start, stop, pause, resume, button, tap, swipe, debug };
}
