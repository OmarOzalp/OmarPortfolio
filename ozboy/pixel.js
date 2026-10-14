// pixel.js — the palette and pixel-drawing helpers shared by OZ BOY's screens and games.
//
// Everything on the handheld's screen is laid out in "logical" pixels: the screen is 160 px wide
// (like the real thing) and 144-240 px tall depending on the phone. Canvases are created at an
// integer multiple k of that size so pixel art and pixel text stay crisp on any display.

export const C = {
  ink: '#14213d', navy: '#012169', cream: '#fffaf0', paper: '#f4efe2', white: '#ffffff',
  coral: '#ff5a5f', orange: '#ff8a2a', yellow: '#ffd23f', teal: '#1fb5c9', sea: '#2aa9e0',
  deep: '#0b4f8f', abyss: '#063258', foam: '#e8f8ff', sand: '#f5dca6', sandDark: '#e3c27e',
  palm: '#2f9e44', palmDark: '#1f6e30', wood: '#8a5a32', woodDark: '#5a3a22', skin: '#c98a5a',
  hair: '#2b1a12', gray: '#9aa3b5', grayDark: '#5b6478', red: '#d2304a', green: '#5fd068',
  lime: '#b6d12a', pink: '#ff5a7a', blue: '#2a5bd7', purple: '#8a5cf6'
};

// A canvas of w x h logical pixels, backed by k x k device pixels each.
export function makeCanvas(w, h, k = 1, canvas = document.createElement('canvas')) {
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  canvas.__k = k;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return { canvas, ctx };
}

export function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function frame(ctx, color, x, y, w, h, t = 1) {
  rect(ctx, color, x, y, w, t);
  rect(ctx, color, x, y + h - t, w, t);
  rect(ctx, color, x, y, t, h);
  rect(ctx, color, x + w - t, y, t, h);
}

// Pixel text with hard edges (anti-aliasing thresholded away). Rendered glyph runs are cached, so
// drawing the same label every frame is cheap. size: 8 or 16 for 'PS2P', 10/12/16 for 'VT323'.
const textCache = new Map();
export function textWidth(s, size = 8, font = 'PS2P') {
  return font === 'PS2P' ? s.length * size : Math.ceil(measure(s, size, font));
}
let measureCtx = null;
function measure(s, size, font) {
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  measureCtx.font = `${size}px ${font}`;
  return measureCtx.measureText(s).width;
}
export function pxText(ctx, s, x, y, color, size = 8, align = 'left', font = 'PS2P') {
  s = String(s);
  if (!s) return 0;
  const k = ctx.canvas.__k || 1;
  const key = `${font}|${size}|${k}|${color}|${s}`;
  let o = textCache.get(key);
  if (!o) {
    o = document.createElement('canvas');
    const g = o.getContext('2d');
    g.font = `${size * k}px ${font}`;
    const w = Math.ceil(g.measureText(s).width);
    o.width = Math.max(1, w + 2);
    o.height = Math.ceil(size * k * 1.25) + 2;
    g.font = `${size * k}px ${font}`;
    g.textBaseline = 'top';
    g.fillStyle = color;
    g.fillText(s, 0, 1);
    const d = g.getImageData(0, 0, o.width, o.height);
    for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
    g.putImageData(d, 0, 0);
    o.lw = w / k;
    if (textCache.size > 400) textCache.delete(textCache.keys().next().value);
    textCache.set(key, o);
  }
  const dx = align === 'center' ? x - o.lw / 2 : align === 'right' ? x - o.lw : x;
  ctx.drawImage(o, Math.round(dx), Math.round(y), o.width / k, o.height / k);
  return o.lw;
}

// Draws a bitmap given as rows of characters. colors maps each character to a CSS color;
// characters missing from the map (and spaces) are transparent.
export function bitmap(ctx, rows, x, y, s, colors) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const col = colors[row[c]];
      if (col) rect(ctx, col, x + c * s, y + r * s, s, s);
    }
  }
}

/* ---------------- menu icons (12 px wide) ---------------- */
// '#' outline, '.' white, '+' the icon's accent; other letters are listed per icon.
export const ICONS = {
  about: { c: C.navy, x: { h: C.hair, s: C.skin }, rows: [
    '....####....', '...#hhhh#...', '..#hhhhhh#..', '..#ssssss#..', '..#s#ss#s#..', '..#ssssss#..',
    '...#s##s#...', '....#ss#....', '..##++++##..', '.#++++++++#.', '#++++++++++#', '############'] },
  work: { c: '#c47a3a', x: { y: C.yellow }, rows: [
    '....####....', '...#....#...', '############', '#++++++++++#', '#++++++++++#', '#+++#yy#+++#',
    '#####yy#####', '#+++####+++#', '#++++++++++#', '############'] },
  code: { c: C.blue, rows: [
    '############', '#+#......#+#', '#+#......#+#', '#+#......#+#', '#+########+#', '#++++++++++#',
    '#+########+#', '#+#..##..#+#', '#+#..##..#+#', '############'] },
  resume: { c: C.coral, rows: [
    '#########...', '#.......##..', '#.+++++.#.#.', '#.......####', '#.#####....#', '#..........#',
    '#.#######..#', '#..........#', '#.######...#', '#..........#', '############'] },
  dive: { c: C.teal, x: { y: C.yellow }, rows: [
    '..........y.', '.##########y', '#++++##++++#', '#+..+##+..+#', '#+..+##+..+#', '#++++##++++#',
    '.####..####.', '....####....'] },
  mat: { c: C.blue, rows: [
    '....####....', '..##....##..', '.#........#.', '.#........#.', '###......###', '#+#......#+#',
    '#.#......#.#', '#+#......#+#', '###......###'] },
  track: { c: C.lime, x: { g: C.grayDark }, rows: [
    '.........##.', '.......##+#.', '.....##+++#.', '..###++++++#', '.#++++.+.+.#', '#++++++++++#',
    '############', '.g..g..g..g.'] },
  shop: { c: C.orange, x: { g: C.grayDark }, rows: [
    '.########...', '#++++++++###', '#+..++++#ggg', '.#######.#..', '.....#++#...', '.....#++#...',
    '....#+++#...', '....#####...'] },
  pics: { c: C.pink, x: { t: C.teal }, rows: [
    '....###.....', '############', '#++++++++++#', '#+++####+.+#', '#++#....#++#', '#++#.tt.#++#',
    '#++#....#++#', '#+++####+++#', '############'] },
  games: { c: C.purple, x: { y: C.yellow }, rows: [
    '..########..', '.#++++++++#.', '#+.++++++y+#', '#...++++y.y#', '#+.++++++y+#', '#++++##++++#',
    '.#++#..#++#.', '..##....##..'] },
  fish: { c: '#9ec3e6', x: { y: C.yellow }, rows: [
    '....####....', '..##++++#..#', '.#.+++++##y#', '#+yyyyyyyyy#', '.#+++++++#y#', '..##+++##..#',
    '....###.....'] },
  snake: { c: C.teal, x: { y: C.yellow }, rows: [
    '........###.', '.......#y+.#', '..###..#++##', '.#y+y#.#y#..', '#+#.#y#+#...', '#y#..#y+#...',
    '.#....##....'] }
};

export function drawIcon(ctx, id, x, y, s = 2) {
  const I = ICONS[id];
  bitmap(ctx, I.rows, x, y, s, Object.assign({ '#': C.ink, '.': C.white, '+': I.c }, I.x || {}));
}

// An icon as an image URL, for use in the DOM (rendered with image-rendering: pixelated).
const iconUrls = {};
export function iconURL(id) {
  if (iconUrls[id]) return iconUrls[id];
  const I = ICONS[id];
  const { canvas, ctx } = makeCanvas(12, I.rows.length, 1);
  drawIcon(ctx, id, 0, 0, 1);
  return (iconUrls[id] = canvas.toDataURL());
}
