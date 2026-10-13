// textures.js — every texture in the desk scene is painted on a <canvas> at load time,
// so the scene ships with no image files.

import * as THREE from 'three';

let maxAniso = 4;
export function setMaxAnisotropy(n) { maxAniso = n; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Small deterministic PRNG so the scene looks the same on every visit.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speckle(ctx, w, h, count, colors, rand, size = 1) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    ctx.fillRect(rand() * w, rand() * h, size, size);
  }
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}

/* Desk top: warm walnut with long grain and a couple of knots. */
export function woodTexture() {
  const W = 2048, H = 1024;
  const [c, ctx] = canvas(W, H);
  const rand = rng(7);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5a3820');
  g.addColorStop(0.5, '#6a4426');
  g.addColorStop(1, '#58361f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Grain: many long wavy strokes of slightly varied tone.
  for (let i = 0; i < 520; i++) {
    const y0 = rand() * H;
    const amp = 2 + rand() * 10;
    const freq = 0.001 + rand() * 0.004;
    const phase = rand() * Math.PI * 2;
    const dark = rand() < 0.6;
    ctx.strokeStyle = dark ? `rgba(40,22,10,${0.08 + rand() * 0.18})` : `rgba(150,100,60,${0.05 + rand() * 0.12})`;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.25;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Knots.
  [[520, 300], [1500, 720]].forEach(([kx, ky]) => {
    for (let r = 46; r > 2; r -= 3) {
      ctx.strokeStyle = `rgba(35,18,8,${0.08 + (46 - r) / 46 * 0.2})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(kx, ky, r * 2.4, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  speckle(ctx, W, H, 9000, ['rgba(20,10,5,0.25)', 'rgba(170,120,80,0.15)'], rand);
  return toTexture(c);
}

/* Painted plaster, tinted with the given colour. UVs are in meters; one tile covers 1.5m. */
export function paintTexture(color) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(11);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, 16000, ['rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)'], rand, 1);
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},0.022)`;
    ctx.beginPath();
    ctx.ellipse(rand() * 512, rand() * 512, 30 + rand() * 90, 14 + rand() * 40, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, { repeat: [1 / 1.5, 1 / 1.5] });
}

/* White beadboard wainscoting: vertical boards with a groove every ~3.75cm. One tile = 0.6m. */
export function beadboardTexture() {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(13);
  ctx.fillStyle = '#f3f0e8';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, 5000, ['rgba(0,0,0,0.025)'], rand, 1);
  for (let x = 0; x < 512; x += 32) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, 0, 2, 512);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(x + 2, 0, 2, 512);
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(x + 4, 0, 6, 512);
  }
  return toTexture(c, { repeat: [1 / 0.6, 1] });
}

export function floorTexture() {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(5);
  ctx.fillStyle = '#2b2420';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = `rgba(0,0,0,${0.15 + rand() * 0.15})`;
    ctx.fillRect(0, y, 512, 2);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '120,90,60'},0.08)`;
      ctx.fillRect(0, y + rand() * 62, 512, 1 + rand() * 2);
    }
  }
  return toTexture(c, { repeat: [6, 6] });
}

/* A polaroid: white card, handwritten caption, and the photo cropped square ("cover").
   The photo loads asynchronously and is painted in when it arrives. */
export function polaroidTexture(url, caption, seed = 1) {
  const W = 440, H = 528, P = 26, S = W - P * 2;
  const [c, ctx] = canvas(W, H);
  const rand = rng(seed);
  ctx.fillStyle = '#fbfaf5';
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, 1500, ['rgba(0,0,0,0.03)'], rand, 2);
  ctx.fillStyle = '#d9d4c8';
  ctx.fillRect(P, P, S, S);
  ctx.fillStyle = '#2a2f45';
  ctx.font = '600 46px Caveat, "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText(caption, W / 2, H - 38);
  const tex = toTexture(c);
  const img = new Image();
  img.onload = () => {
    const a = img.width / img.height;
    const sw = a > 1 ? img.height : img.width, sh = sw;
    const sx = (img.width - sw) / 2, sy = a > 1 ? 0 : (img.height - sh) * 0.3;
    ctx.drawImage(img, sx, sy, sw, sh, P, P, S, S);
    // A little warmth and fade, like an instant print.
    ctx.fillStyle = 'rgba(255,220,170,0.08)';
    ctx.fillRect(P, P, S, S);
    tex.needsUpdate = true;
  };
  img.src = url;
  return tex;
}

/* Duke pennant: blue felt triangle with white lettering. */
export function pennantTexture() {
  const W = 1024, H = 360;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#012169';
  ctx.fillRect(0, 0, W, H);
  const rand = rng(3);
  speckle(ctx, W, H, 12000, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.12)'], rand, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 70, H);
  // The pennant narrows to the right, so the lettering stays left and near the middle.
  ctx.font = 'italic 900 156px Georgia, "Times New Roman", serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('DUKE', 120, H / 2 - 18);
  ctx.font = '700 34px Georgia, serif';
  ctx.fillText('BLUE DEVILS', 132, H / 2 + 72);
  return toTexture(c);
}

/* A sticky note with handwriting. */
export function stickyTexture(lines, color = '#fff27a', seed = 1) {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const rand = rng(seed);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, 'rgba(0,0,0,0.08)');
  g.addColorStop(0.2, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 800, ['rgba(0,0,0,0.04)'], rand, 2);
  ctx.fillStyle = '#1d2a6b';
  ctx.font = '600 44px Caveat, "Comic Sans MS", cursive';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => {
    ctx.save();
    ctx.translate(20, 26 + i * 50);
    ctx.rotate((rand() - 0.5) * 0.06);
    ctx.fillText(l, 0, 0);
    ctx.restore();
  });
  return toTexture(c);
}

/* The resume lying on the desk. Real text from the profile, so it's readable up close. */
export function resumeTexture(profile, projects) {
  const W = 1275, H = 1650; // US letter at 150 dpi
  const [c, ctx] = canvas(W, H);
  const rand = rng(17);
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, 6000, ['rgba(0,0,0,0.025)'], rand, 2);
  const L = 110, R = W - 110, maxW = R - L;
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 78px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText(profile.name.toUpperCase(), W / 2, 190);
  ctx.font = 'italic 34px Georgia, serif';
  ctx.fillStyle = '#333';
  ctx.fillText(profile.headline + '  ·  ' + profile.links.email, W / 2, 245);
  ctx.textAlign = 'left';
  let y = 330;
  function section(title) {
    ctx.fillStyle = '#111';
    ctx.font = '700 36px Georgia, serif';
    ctx.fillText(title.toUpperCase(), L, y);
    ctx.fillRect(L, y + 12, maxW, 3);
    y += 64;
  }
  function body(text, bold) {
    ctx.fillStyle = '#222';
    ctx.font = (bold ? '700 ' : '') + '32px Georgia, serif';
    y = wrapText(ctx, text, L, y, maxW, 42);
  }
  section('Education');
  body('Duke University — Durham, NC', true);
  body('Electrical & Computer Engineering, Computer Science & Mathematics');
  y += 26;
  section('Experience');
  profile.experience.forEach((x) => {
    body(x.company + ' — ' + x.role + ', ' + x.location, true);
    body('• ' + x.desc);
    y += 14;
  });
  y += 12;
  section('Projects');
  projects.forEach((p) => {
    body(p.name + ' — ' + p.tagline, true);
    p.points.forEach((pt) => body('• ' + pt));
  });
  y += 26;
  section('Activities & Interests');
  profile.activities.forEach((a) => body(a.name + ' — ' + a.desc));
  body(profile.interests.join(' · '));
  // Coffee ring, because of course.
  ctx.strokeStyle = 'rgba(120,70,30,0.22)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(W - 260, H - 300, 120, 0.3, Math.PI * 1.85);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W - 262, H - 298, 108, 0, Math.PI * 2);
  ctx.stroke();
  return toTexture(c);
}

/* Floppy disk top: label + metal shutter painted on. */
export function floppyTexture(label, color, seed) {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const rand = rng(seed);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 3000, ['rgba(255,255,255,0.04)', 'rgba(0,0,0,0.1)'], rand, 2);
  // Shutter.
  const sg = ctx.createLinearGradient(130, 0, 380, 0);
  sg.addColorStop(0, '#9aa0a6');
  sg.addColorStop(0.5, '#e4e7ea');
  sg.addColorStop(1, '#8d9399');
  ctx.fillStyle = sg;
  ctx.fillRect(130, 0, 250, 170);
  ctx.fillStyle = color;
  ctx.fillRect(300, 22, 48, 118);
  // Label.
  ctx.fillStyle = '#f5f3ea';
  ctx.fillRect(56, 230, 400, 262);
  ctx.fillStyle = 'rgba(40,80,200,0.35)';
  for (let ly = 300; ly < 480; ly += 46) ctx.fillRect(70, ly, 372, 2);
  ctx.fillStyle = '#1b1b1b';
  ctx.font = '400 62px "Permanent Marker", Impact, sans-serif';
  ctx.save();
  ctx.translate(76, 340);
  ctx.rotate(-0.04);
  ctx.fillText(label[0], 0, 0);
  ctx.font = '600 50px Caveat, cursive';
  ctx.fillText(label[1] || '', 4, 70);
  ctx.restore();
  return toTexture(c);
}

/* Sketchbook cover label. */
export function sketchLabelTexture() {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#efe6cf';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 484, 228);
  ctx.fillStyle = '#1b1b1b';
  ctx.font = '400 64px "Permanent Marker", Impact, sans-serif';
  ctx.fillText('SKETCHES', 40, 104);
  ctx.font = '600 46px Caveat, cursive';
  ctx.fillText('O.O. — vol. 7', 44, 168);
  ctx.fillText('(do not open... ok fine)', 44, 214);
  return toTexture(c);
}

/* Generic printed label (monitor badge, tower badge, etc). */
export function labelTexture(text, { w = 512, h = 128, bg = null, color = '#3a3a3a', font = '700 64px Arial, sans-serif', align = 'left' } = {}) {
  const [c, ctx] = canvas(w, h);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  ctx.fillText(text, align === 'center' ? w / 2 : 8, h / 2);
  return toTexture(c);
}

/* Beige tower front panel: drive bays, floppy slot, vents and badge. */
export function towerFrontTexture() {
  const W = 512, H = 1152;
  const [c, ctx] = canvas(W, H);
  const rand = rng(31);
  ctx.fillStyle = '#d9d3c0';
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, 9000, ['rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)'], rand, 2);
  function bevel(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x + w - 3, y, 3, h);
  }
  // CD-ROM bay.
  bevel(40, 90, 432, 120, '#cfc8b3');
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(70, 140, 300, 4);
  bevel(400, 170, 50, 22, '#bdb6a0');
  ctx.fillStyle = '#3a3a3a';
  ctx.font = '700 22px Arial';
  ctx.fillText('48X', 70, 125);
  // Empty bay.
  bevel(40, 230, 432, 120, '#d4cdb8');
  // Floppy.
  bevel(130, 400, 252, 90, '#cfc8b3');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(160, 432, 192, 10);
  bevel(316, 456, 40, 18, '#bdb6a0');
  // Badge.
  ctx.fillStyle = '#2b2b2b';
  ctx.font = 'italic 900 56px Arial, sans-serif';
  ctx.fillText('OZ-PC', 140, 640);
  ctx.font = '700 26px Arial, sans-serif';
  ctx.fillText('MULTIMEDIA 98', 150, 676);
  // Vents.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 820; y < 1100; y += 22) ctx.fillRect(90, y, 332, 9);
  return toTexture(c);
}

/* CRT glass overlay: vignette, faint scanlines and a soft glare streak. Drawn with alpha. */
export function glassTexture() {
  const W = 1024, H = 768;
  const [c, ctx] = canvas(W, H);
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.11)';
    ctx.fillRect(0, y, W, 1);
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.68);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.7, 'rgba(0,0,0,0.18)');
  v.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const hl = ctx.createRadialGradient(W * 0.22, H * 0.16, 4, W * 0.22, H * 0.16, W * 0.3);
  hl.addColorStop(0, 'rgba(255,255,255,0.13)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, W, H);
  return toTexture(c);
}

/* Ear-guard vents for the wrestling headgear. */
export function ventTexture(base) {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(S / 2 + Math.cos(a) * 52, S / 2 + Math.sin(a) * 52, 16, 9, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 16, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(c);
}

export async function loadFonts() {
  const fonts = [
    ['Caveat', 'assets/fonts/caveat-latin-600-normal.woff2', { weight: '600' }],
    ['Permanent Marker', 'assets/fonts/permanent-marker-latin-400-normal.woff2', {}]
  ];
  await Promise.all(fonts.map(async ([family, url, desc]) => {
    try {
      const f = new FontFace(family, `url(${url})`, desc);
      await f.load();
      document.fonts.add(f);
    } catch (e) { /* fall back to system fonts */ }
  }));
}
