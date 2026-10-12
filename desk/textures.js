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

/* Painted plaster wall. */
export function wallTexture() {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(11);
  ctx.fillStyle = '#4a5160';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, 14000, ['rgba(0,0,0,0.035)', 'rgba(255,255,255,0.025)'], rand, 1);
  // Soft roller marks.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},0.018)`;
    ctx.fillRect(rand() * 512, 0, 20 + rand() * 60, 512);
  }
  return toTexture(c, { repeat: [3, 2] });
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

/* Night view out the window: a gulf skyline with one very tall tower, a moon and stars. */
export function skylineTexture() {
  const W = 1024, H = 768;
  const [c, ctx] = canvas(W, H);
  const rand = rng(21);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#060a1c');
  g.addColorStop(0.55, '#16224a');
  g.addColorStop(0.8, '#3a3156');
  g.addColorStop(1, '#5a3a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.8})`;
    const s = rand() < 0.08 ? 2 : 1;
    ctx.fillRect(rand() * W, rand() * H * 0.6, s, s);
  }
  // Moon.
  const mg = ctx.createRadialGradient(780, 150, 10, 780, 150, 120);
  mg.addColorStop(0, 'rgba(255,248,220,0.35)');
  mg.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(600, 0, 400, 320);
  ctx.fillStyle = '#fff6da';
  ctx.beginPath();
  ctx.arc(780, 150, 38, 0, Math.PI * 2);
  ctx.fill();
  // Skyline silhouettes with lit windows.
  const base = H * 0.92;
  const buildings = [];
  let x = -10;
  while (x < W) {
    const w = 30 + rand() * 60;
    const h = 60 + rand() * 170;
    buildings.push([x, w, h]);
    x += w + rand() * 6;
  }
  buildings.forEach(([bx, bw, bh]) => {
    ctx.fillStyle = '#0b0f1e';
    ctx.fillRect(bx, base - bh, bw, bh + 40);
    for (let wy = base - bh + 8; wy < base; wy += 10) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 8) {
        if (rand() < 0.28) {
          ctx.fillStyle = rand() < 0.8 ? 'rgba(255,214,140,0.8)' : 'rgba(170,210,255,0.8)';
          ctx.fillRect(wx, wy, 3, 4);
        }
      }
    }
  });
  // The tall one.
  ctx.fillStyle = '#0b0f1e';
  ctx.beginPath();
  const tx = 330;
  ctx.moveTo(tx - 34, base);
  ctx.lineTo(tx - 26, base - 220);
  ctx.lineTo(tx - 16, base - 330);
  ctx.lineTo(tx - 8, base - 430);
  ctx.lineTo(tx - 2, base - 540);
  ctx.lineTo(tx, base - 610);
  ctx.lineTo(tx + 2, base - 540);
  ctx.lineTo(tx + 9, base - 420);
  ctx.lineTo(tx + 18, base - 310);
  ctx.lineTo(tx + 28, base - 200);
  ctx.lineTo(tx + 36, base);
  ctx.fill();
  for (let wy = base - 520; wy < base; wy += 9) {
    const half = 2 + (wy - (base - 600)) / 600 * 30;
    for (let wx = tx - half; wx < tx + half; wx += 6) {
      if (rand() < 0.35) {
        ctx.fillStyle = 'rgba(255,224,160,0.85)';
        ctx.fillRect(wx, wy, 2, 3);
      }
    }
  }
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(tx - 1, base - 614, 3, 3);
  // Water reflection band.
  ctx.fillStyle = '#070b18';
  ctx.fillRect(0, base, W, H - base);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,210,140,${rand() * 0.35})`;
    ctx.fillRect(rand() * W, base + 4 + rand() * (H - base - 6), 6 + rand() * 20, 1);
  }
  return toTexture(c);
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
  ctx.font = 'italic 900 170px Georgia, "Times New Roman", serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('DUKE', 130, H / 2 + 6);
  ctx.font = '700 40px Georgia, serif';
  ctx.fillText('BLUE DEVILS', 140, H / 2 + 112);
  return toTexture(c);
}

/* Poster: "dive deeper" with a whale shark silhouette. */
export function posterTexture() {
  const W = 600, H = 840;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2fb6d8');
  g.addColorStop(0.45, '#0d5f8c');
  g.addColorStop(1, '#03203a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Light rays.
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(120 + i * 70, 0);
    ctx.lineTo(160 + i * 70, 0);
    ctx.lineTo(60 + i * 120, H * 0.75);
    ctx.lineTo(20 + i * 110, H * 0.75);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Whale shark.
  ctx.save();
  ctx.translate(300, 470);
  ctx.fillStyle = '#062a45';
  ctx.beginPath();
  ctx.moveTo(-230, 10);
  ctx.quadraticCurveTo(-120, -80, 60, -55);
  ctx.quadraticCurveTo(170, -40, 215, -110);
  ctx.lineTo(232, -100);
  ctx.quadraticCurveTo(215, -25, 240, 50);
  ctx.lineTo(222, 58);
  ctx.quadraticCurveTo(190, 20, 70, 40);
  ctx.quadraticCurveTo(-20, 70, -120, 60);
  ctx.lineTo(-90, 110);
  ctx.lineTo(-140, 62);
  ctx.quadraticCurveTo(-210, 55, -230, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, -62);
  ctx.lineTo(30, -120);
  ctx.lineTo(45, -55);
  ctx.fill();
  const rand = rng(9);
  ctx.fillStyle = 'rgba(200,235,255,0.55)';
  for (let i = 0; i < 70; i++) {
    const x = -200 + rand() * 380, y = -50 + rand() * 90;
    ctx.beginPath();
    ctx.arc(x, y + (x > 100 ? -20 : 0), 2 + rand() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Bubbles.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(80 + rand() * 440, 120 + rand() * 280, 4 + rand() * 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '400 92px "Permanent Marker", Impact, sans-serif';
  ctx.fillText('DIVE', W / 2, 700);
  ctx.font = '400 64px "Permanent Marker", Impact, sans-serif';
  ctx.fillText('DEEPER', W / 2, 778);
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

/* Mug wrap: Duke-blue mug with a slogan. */
export function mugTexture() {
  const W = 1024, H = 256;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#f4f2ec';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#012169';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 54px Georgia, serif';
  ctx.fillText("WORLD'S OKAYEST", W * 0.55, H * 0.4);
  ctx.font = '400 74px "Permanent Marker", Impact, sans-serif';
  ctx.fillText('DIVER', W * 0.55, H * 0.72);
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
