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

/* The view out the window: a golden-hour beach with palms, a lifeguard tower, an umbrella and a surfboard.
   The window shows roughly u = 0.2..0.6 of this image from the desk, so the good stuff lives there. */
export function beachTexture() {
  const W = 2048, H = 1152;
  const [c, ctx] = canvas(W, H);
  const rand = rng(23);
  const hz = Math.round(H * 0.47);
  const shore = Math.round(H * 0.66);

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#2c7fd4');
  sky.addColorStop(0.42, '#74b9ec');
  sky.addColorStop(0.78, '#ffd9a6');
  sky.addColorStop(1, '#ffb27e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, hz + 2);

  // Sun and its glow.
  const sx = W * 0.47, sy = hz - 92;
  const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 520);
  glow.addColorStop(0, 'rgba(255,236,190,0.95)');
  glow.addColorStop(0.18, 'rgba(255,214,150,0.55)');
  glow.addColorStop(1, 'rgba(255,190,130,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, hz);
  ctx.fillStyle = '#fff6df';
  ctx.beginPath();
  ctx.arc(sx, sy, 52, 0, Math.PI * 2);
  ctx.fill();

  // Puffy clouds, lit warm from below.
  function cloud(x, y, s) {
    for (let i = 0; i < 7; i++) {
      const cx = x + (i - 3) * 38 * s + (rand() - 0.5) * 20 * s;
      const cy = y - Math.sin((i / 6) * Math.PI) * 26 * s;
      const r = (34 + rand() * 26) * s;
      const g = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.2, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.7, 'rgba(255,236,222,0.85)');
      g.addColorStop(1, 'rgba(255,214,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  cloud(W * 0.3, hz * 0.32, 1.2);
  cloud(W * 0.62, hz * 0.2, 1.0);
  cloud(W * 0.82, hz * 0.45, 0.8);
  cloud(W * 0.12, hz * 0.55, 0.7);
  cloud(W * 0.5, hz * 0.6, 0.55);

  // Gulls.
  ctx.strokeStyle = 'rgba(40,50,70,0.7)';
  ctx.lineWidth = 3;
  [[0.36, 0.3, 1], [0.39, 0.26, 0.8], [0.55, 0.36, 0.9]].forEach(([u, v, s]) => {
    const x = W * u, y = hz * v;
    ctx.beginPath();
    ctx.moveTo(x - 16 * s, y);
    ctx.quadraticCurveTo(x - 8 * s, y - 10 * s, x, y);
    ctx.quadraticCurveTo(x + 8 * s, y - 10 * s, x + 16 * s, y);
    ctx.stroke();
  });

  // A hazy headland on the horizon.
  ctx.fillStyle = 'rgba(92,120,160,0.7)';
  ctx.beginPath();
  ctx.moveTo(0, hz);
  ctx.quadraticCurveTo(W * 0.08, hz - 60, W * 0.17, hz - 34);
  ctx.quadraticCurveTo(W * 0.24, hz - 18, W * 0.3, hz);
  ctx.fill();

  // Ocean.
  const sea = ctx.createLinearGradient(0, hz, 0, shore);
  sea.addColorStop(0, '#2a7aa6');
  sea.addColorStop(0.55, '#26a7b8');
  sea.addColorStop(1, '#5fd6cc');
  ctx.fillStyle = sea;
  ctx.fillRect(0, hz, W, shore - hz);
  // Sun glitter, widening toward the viewer.
  for (let i = 0; i < 700; i++) {
    const t = Math.pow(rand(), 1.6);
    const y = hz + 4 + t * (shore - hz - 30);
    const spread = 40 + t * 380;
    const x = sx + (rand() - 0.5) * 2 * spread * (0.4 + rand() * 0.6);
    ctx.fillStyle = `rgba(255,242,205,${0.35 + rand() * 0.55})`;
    ctx.fillRect(x, y, 6 + t * 40 * rand(), 1.5 + t * 2);
  }
  // Swell lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  for (let i = 0; i < 26; i++) {
    const y = hz + 20 + Math.pow(rand(), 0.7) * (shore - hz - 40);
    const x0 = rand() * W;
    ctx.lineWidth = 1 + (y - hz) / 90;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + 80, y - 6, x0 + 180 + rand() * 120, y);
    ctx.stroke();
  }

  // Shoreline: shallow band, foam, wet sand, then dry sand.
  const sand = ctx.createLinearGradient(0, shore, 0, H);
  sand.addColorStop(0, '#dcbb8c');
  sand.addColorStop(0.12, '#f3d9a8');
  sand.addColorStop(1, '#e9c48d');
  ctx.fillStyle = sand;
  ctx.fillRect(0, shore - 6, W, H - shore + 6);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, shore);
  for (let x = 0; x <= W; x += 32) ctx.lineTo(x, shore - 4 - Math.sin(x * 0.012) * 6 - rand() * 4);
  for (let x = W; x >= 0; x -= 32) ctx.lineTo(x, shore + 6 + Math.sin(x * 0.009 + 1) * 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,200,210,0.35)';
  ctx.fillRect(0, shore + 8, W, 14);
  // Sand grain.
  ctx.save();
  ctx.translate(0, shore);
  speckle(ctx, W, H - shore, 20000, ['rgba(150,110,60,0.16)', 'rgba(255,250,235,0.3)'], rand, 2);
  ctx.restore();

  // Beach umbrella.
  (function umbrella(x, y) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 14, y + 150);
    ctx.stroke();
    const cols = ['#ff5a5f', '#ffffff', '#ffc93c', '#ffffff', '#2ec4b6', '#ffffff'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      const a0 = Math.PI + (i / 6) * Math.PI, a1 = Math.PI + ((i + 1) / 6) * Math.PI;
      ctx.lineTo(x + Math.cos(a0) * 120, y + 30 + Math.sin(a0) * 46);
      ctx.lineTo(x + Math.cos(a1) * 120, y + 30 + Math.sin(a1) * 46);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(120,80,40,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 30, y + 160, 110, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  })(W * 0.585, shore + 90);

  // Lifeguard tower.
  (function tower(x, y) {
    ctx.strokeStyle = '#f4efe6';
    ctx.lineWidth = 7;
    [[-40, -18], [40, 18]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(x + a, y + 150);
      ctx.lineTo(x + b, y);
      ctx.stroke();
    });
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 30, y + 110); ctx.lineTo(x + 30, y + 40);
    ctx.moveTo(x + 30, y + 110); ctx.lineTo(x - 30, y + 40);
    ctx.stroke();
    ctx.fillStyle = '#e8433a';
    ctx.fillRect(x - 58, y - 80, 116, 80);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 58, y - 52, 116, 14);
    ctx.fillStyle = '#7fd3e6';
    ctx.fillRect(x - 40, y - 72, 80, 18);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(x - 72, y - 78); ctx.lineTo(x, y - 120); ctx.lineTo(x + 72, y - 78);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 120); ctx.lineTo(x, y - 170); ctx.stroke();
    ctx.fillStyle = '#e8433a';
    ctx.beginPath(); ctx.moveTo(x, y - 170); ctx.lineTo(x + 40, y - 158); ctx.lineTo(x, y - 146); ctx.fill();
  })(W * 0.5, shore + 10);

  // Surfboard planted in the sand.
  ctx.save();
  ctx.translate(W * 0.405, shore + 120);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#ff7b54';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 120, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-4, -118, 8, 236);
  ctx.fillStyle = '#2ec4b6';
  ctx.fillRect(-26, -30, 52, 12);
  ctx.restore();

  // Palm trees.
  function palm(x, y, h, lean, s) {
    ctx.strokeStyle = '#7a5532';
    ctx.lineCap = 'round';
    const tx = x + lean, ty = y - h;
    for (let i = 0; i < 14; i++) {
      const t0 = i / 14, t1 = (i + 1) / 14;
      const bx = (t) => x + lean * t * t;
      const by = (t) => y - h * t;
      ctx.lineWidth = (26 - t0 * 12) * s;
      ctx.strokeStyle = i % 2 ? '#7a5532' : '#8d6640';
      ctx.beginPath();
      ctx.moveTo(bx(t0), by(t0));
      ctx.lineTo(bx(t1), by(t1));
      ctx.stroke();
    }
    const fronds = 9;
    for (let i = 0; i < fronds; i++) {
      const a = -Math.PI + (i / (fronds - 1)) * Math.PI + (rand() - 0.5) * 0.2;
      const len = (150 + rand() * 60) * s;
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + 60 * s;
      const mx = tx + Math.cos(a) * len * 0.5, my = ty + Math.sin(a) * len * 0.55 - 30 * s;
      ctx.strokeStyle = i % 2 ? '#2f8f46' : '#3daa55';
      ctx.lineWidth = 7 * s;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
      // Leaflets.
      ctx.lineWidth = 3 * s;
      for (let k = 2; k < 12; k++) {
        const t = k / 12;
        const px = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * mx + t * t * ex;
        const py = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * my + t * t * ey;
        const l = (1 - t) * 46 * s + 10 * s;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(a + 1.3) * l, py + Math.sin(a + 1.3) * l + l * 0.5);
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(a - 1.3) * l, py + Math.sin(a - 1.3) * l + l * 0.5);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#5a3d1e';
    [[-10, 14], [10, 18], [0, 26]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(tx + dx * s, ty + dy * s, 10 * s, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  palm(W * 0.255, H * 1.02, 640, 70, 1.25);
  palm(W * 0.67, H * 0.98, 520, -50, 1.0);
  palm(W * 0.15, H * 1.0, 560, -40, 1.1);
  return toTexture(c);
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
