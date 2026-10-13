// outdoor.js — the beach outside the window, as its own little 3D world.
//
// It lives in a separate scene with its own sun, sky light and haze, and is drawn in a second pass only
// where the room's window "portal" wrote to the stencil buffer (see main.js). That keeps the beach's bright
// daylight from leaking into the room's lighting, and keeps it cheap: only window pixels are shaded.
//
// Local frame: the origin is roughly the viewer's eye, -z points out to sea, y is up. The whole frame is
// yawed to face the window and pitched down a few degrees, which drops the horizon to mid-window so the view
// gets a proper slice of sky.

import * as THREE from 'three';
import { rng } from './textures.js';

const SEA_Y = -4.5;            // sea level relative to the eye: a second-floor beach house
const BEACH_SLOPE = 0.045;     // sand rises this much per meter inland (capped at BEACH_RISE)
const BEACH_RISE = 1.1;

// GLSL + JS twin: the wavy shoreline. s = z - shoreZ(x) is positive on land, negative in the water.
const SHORE_GLSL = `
  float shoreZ(float x) { return -48.0 + 2.6 * sin(x * 0.07 + 0.6) + 1.1 * sin(x * 0.23 + 2.0); }
  float washLine(float x, float t) { return sin(t * 0.55 + x * 0.06) * 1.2 + 0.4; }
`;
const shoreZ = (x) => -48 + 2.6 * Math.sin(x * 0.07 + 0.6) + 1.1 * Math.sin(x * 0.23 + 2.0);

const NOISE_GLSL = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
  }
`;

const SKY_GLSL = `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSun;
  vec3 skyColor(vec3 d) {
    float h = d.y;
    vec3 c = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.32));
    float s = max(dot(d, uSun), 0.0);
    c += uSunColor * (pow(s, 6.0) * 0.12 + pow(s, 90.0) * 0.5);
    if (h < 0.0) c = uHorizon * mix(1.0, 0.92, clamp(-h * 5.0, 0.0, 1.0));
    return c;
  }
`;

function makeSkyMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vDir;
      ${NOISE_GLSL}
      ${SKY_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = skyColor(d);
        if (d.y > 0.0) {
          // Cumulus: fbm projected onto a high cloud layer, drifting slowly.
          vec2 p = d.xz / (d.y + 0.12) * 1.1 + vec2(uTime * 0.006, uTime * 0.003);
          float base = fbm(p * 1.3);
          float detail = fbm(p * 4.2 + 3.7);
          float cov = smoothstep(0.5, 0.74, base * 0.8 + detail * 0.3);
          float fade = smoothstep(0.0, 0.1, d.y);
          float lit = 0.82 + 0.3 * max(dot(d, uSun), 0.0);
          vec3 shade = mix(vec3(0.72, 0.77, 0.85), vec3(1.03, 1.02, 1.0), smoothstep(0.35, 0.8, detail));
          c = mix(c, shade * lit, cov * fade);
        }
        c += uSunColor * smoothstep(0.99955, 0.9998, dot(d, uSun)) * 25.0;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

function makeOceanMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCamLocal;
      uniform sampler2D uNormals;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      varying vec3 vLocal;
      ${NOISE_GLSL}
      ${SKY_GLSL}
      ${SHORE_GLSL}
      void main() {
        vec3 toCam = uCamLocal - vLocal;
        float dist = length(toCam);
        vec3 V = toCam / dist;
        vec2 uv = vLocal.xz;
        vec2 n1 = texture2D(uNormals, uv * 0.05 + vec2(uTime * 0.011, uTime * 0.017)).xy * 2.0 - 1.0;
        vec2 n2 = texture2D(uNormals, uv * 0.17 + vec2(-uTime * 0.02, uTime * 0.009)).xy * 2.0 - 1.0;
        float detail = 1.0 - smoothstep(40.0, 500.0, dist);
        vec2 slope = (n1 + n2 * 0.55) * (0.12 + 0.3 * detail);
        vec3 N = normalize(vec3(slope.x, 1.0, slope.y));

        float s = vLocal.z - shoreZ(vLocal.x);
        float depth = max(-s * ${BEACH_SLOPE.toFixed(3)}, 0.0);
        vec3 water = mix(uShallow, uMid, smoothstep(0.05, 0.9, depth));
        water = mix(water, uDeep, smoothstep(0.9, 5.0, depth));

        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        vec3 col = mix(water, skyColor(R), clamp(fres, 0.0, 0.55));
        float sp = max(dot(R, uSun), 0.0);
        col += uSunColor * (pow(sp, 700.0) * 5.0 * detail + pow(sp, 60.0) * 0.12);

        // Breakers rolling in toward the beach, and lacy foam where the wash meets the sand.
        float ph = fract(s / 7.0 + uTime * 0.11);
        float crest = smoothstep(0.82, 0.93, ph) * (1.0 - smoothstep(0.93, 1.0, ph));
        float broken = smoothstep(0.35, 0.75, noise(vec2(vLocal.x * 0.3, s * 0.5 + uTime * 0.25)));
        float breakers = crest * broken * smoothstep(-24.0, -3.0, s) * (1.0 - smoothstep(-2.0, 0.0, s));
        float w = washLine(vLocal.x, uTime);
        float edge = smoothstep(w - 2.4, w - 0.3, s);
        float lace = smoothstep(0.42, 0.72, noise(vec2(vLocal.x * 1.4, s * 2.4 + uTime * 0.35)));
        float foam = clamp(breakers * 0.85 + edge * (0.35 + 0.6 * lace), 0.0, 1.0);
        col = mix(col, uFoam, foam);

        col = mix(col, uHorizon, smoothstep(150.0, 2600.0, dist));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

/* ---------------- textures ---------------- */
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Tileable water normal map: a sum of waves with integer wave numbers, so it wraps seamlessly.
function waterNormals() {
  const S = 256;
  const rand = rng(77);
  const waves = [];
  for (let i = 0; i < 28; i++) {
    const kx = Math.round((rand() - 0.5) * 16), ky = Math.round((rand() - 0.5) * 16);
    if (!kx && !ky) continue;
    waves.push([kx, ky, 1 / Math.hypot(kx, ky), rand() * Math.PI * 2]);
  }
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0;
      for (const [kx, ky, a, p] of waves) v += a * Math.sin(((kx * x + ky * y) / S) * Math.PI * 2 + p);
      h[y * S + x] = v;
    }
  }
  const [c, ctx] = canvas(S, S);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)];
      const dy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
      const n = new THREE.Vector3(-dx * 1.4, -dy * 1.4, 1).normalize();
      const i = (y * S + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = n.z * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function sandTextures() {
  const S = 512;
  const rand = rng(31);
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#e8d2a2';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) {
    const v = rand();
    ctx.fillStyle = v < 0.5 ? `rgba(160,125,80,${0.12 + rand() * 0.15})` : v < 0.9 ? `rgba(255,248,230,${0.2 + rand() * 0.3})` : `rgba(90,80,70,${0.2 + rand() * 0.3})`;
    ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  const [b, bctx] = canvas(S, S);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, S, S);
  // Wind ripples (tileable: integer number of waves across the tile).
  for (let y = 0; y < S; y++) {
    const v = 128 + 38 * Math.sin((y / S) * Math.PI * 2 * 22 + Math.sin((y / S) * Math.PI * 2 * 3) * 2);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(0, y, S, 1);
  }
  for (let i = 0; i < 9000; i++) {
    bctx.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},0.25)`;
    bctx.fillRect(rand() * S, rand() * S, 2, 2);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(b);
  [map, bump].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(55, 22); t.anisotropy = 8; });
  return { map, bump };
}

const frondCache = new Map();
function frondTexture(seed) {
  if (!frondCache.has(seed)) frondCache.set(seed, paintFrond(seed));
  return frondCache.get(seed);
}
function paintFrond(seed) {
  const W = 256, H = 1024;
  const rand = rng(seed);
  const [c, ctx] = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  const greens = ['#2f7d34', '#3b8f3c', '#4a9e42', '#327a2f', '#5aa84a'];
  for (let y = 40; y < H - 10; y += 9) {
    const t = y / H;                                  // 0 at base, 1 at tip
    const len = (W / 2 - 6) * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.7;
    [-1, 1].forEach((side) => {
      ctx.strokeStyle = greens[(rand() * greens.length) | 0];
      ctx.lineWidth = 5 + 3 * (1 - t);
      ctx.beginPath();
      ctx.moveTo(W / 2, y);
      ctx.quadraticCurveTo(W / 2 + side * len * 0.55, y + 14, W / 2 + side * len, y + 34 + rand() * 10);
      ctx.stroke();
    });
  }
  ctx.strokeStyle = '#7d8a3c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let trunkTex = null;
function trunkTexture() {
  return trunkTex || (trunkTex = paintTrunk());
}
function paintTrunk() {
  const [c, ctx] = canvas(64, 512);
  const rand = rng(5);
  for (let y = 0; y < 512; y += 16) {
    const g = ctx.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, '#9a8466');
    g.addColorStop(0.7, '#b39c7c');
    g.addColorStop(1, '#6f5b44');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 64, 16);
  }
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.15})`;
    ctx.fillRect(rand() * 64, rand() * 512, 2, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function stripeTexture(colors, n = 8, vertical = false) {
  const [c, ctx] = canvas(256, 256);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    if (vertical) ctx.fillRect(0, (i / n) * 256, 256, 256 / n + 1);
    else ctx.fillRect((i / n) * 256, 0, 256 / n + 1, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- models ---------------- */
// Ground height: a gentle beach slope, with soft dunes further up the sand.
function groundY(x, z) {
  const s = z - shoreZ(x);
  let y = SEA_Y + Math.min(BEACH_SLOPE * s, BEACH_RISE);
  if (s > 8) y += Math.min(1, (s - 8) / 10) * (0.35 * Math.sin(x * 0.21) * Math.sin(z * 0.17 + 1) + 0.2 * Math.sin(x * 0.5 + z * 0.3));
  return y;
}

function buildSand(u) {
  const { map, bump } = sandTextures();
  const geo = new THREE.PlaneGeometry(220, 90, 220, 90);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -35);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, groundY(p.getX(i), p.getZ(i)));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.95 });
  // Darken and gloss the sand where the wash reaches, with a lace of foam at its edge.
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSand;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSand = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec3 vSand;\n${NOISE_GLSL}\n${SHORE_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float sS = vSand.z - shoreZ(vSand.x);
        float wl = washLine(vSand.x, uTime);
        float wet = 1.0 - smoothstep(wl + 0.3, wl + 4.5, sS);
        diffuseColor.rgb *= mix(1.0, 0.6, wet);
        float film = 1.0 - smoothstep(wl - 0.25, wl + 0.05, sS);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.78, 0.8), film * 0.6);
        float lace = smoothstep(0.38, 0.7, noise(vec2(vSand.x * 1.5, sS * 2.5 + uTime * 0.35)));
        float edgeFoam = smoothstep(wl - 0.7, wl, sS) * (1.0 - smoothstep(wl, wl + 0.3, sS));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), edgeFoam * (0.4 + 0.5 * lace));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.3, wet);`);
  };
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// A curved, tapering palm trunk with a crown of drooping fronds.
function buildPalm(height, lean, leanDir, seed) {
  const g = new THREE.Group();
  const rand = rng(seed);
  const top = new THREE.Vector3(Math.cos(leanDir) * lean, height, Math.sin(leanDir) * lean);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(top.x * 0.15, height * 0.55, top.z * 0.15), top);
  const segs = 40, radial = 12;
  const pos = [], uv = [], idx = [];
  const frames = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const c = curve.getPointAt(t);
    const r = (0.24 - 0.11 * t) * (1 + 0.05 * Math.abs(Math.sin(t * 90)));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
      uv.push(j / radial, t * height * 1.2);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  tg.setIndex(idx);
  tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: 0.95 }));
  trunk.castShadow = true;
  g.add(trunk);

  const fronds = 13;
  for (let k = 0; k < fronds; k++) {
    const az = (k / fronds) * Math.PI * 2 + rand() * 0.3;
    const L = 3.0 + rand() * 1.4;
    const lift = 0.55 - (k % 3) * 0.32 + rand() * 0.2;   // some point up, some droop
    const droop = 0.9 + rand() * 0.5;
    const fg = new THREE.PlaneGeometry(1, 1, 1, 18);
    const fp = fg.attributes.position;
    const dirH = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const side = new THREE.Vector3(-dirH.z, 0, dirH.x);
    for (let i = 0; i < fp.count; i++) {
      const w = fp.getX(i);                 // -0.5..0.5 across the frond
      const t = fp.getY(i) + 0.5;           // 0..1 base to tip
      const width = 1.25 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.6 + 0.05;
      const along = dirH.clone().multiplyScalar(L * t * Math.cos(lift * (1 - t)));
      const y = L * (Math.sin(lift) * t - droop * t * t * 0.45) - Math.abs(w) * width * 0.35;
      const v = along.add(side.clone().multiplyScalar(w * width)).add(new THREE.Vector3(0, y, 0));
      fp.setXYZ(i, v.x, v.y, v.z);
    }
    fg.computeVertexNormals();
    const frond = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: frondTexture((seed + k) % 4), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }));
    frond.position.copy(top);
    frond.castShadow = true;
    g.add(frond);
  }
  const nut = new THREE.MeshStandardMaterial({ color: 0x4b3a1f, roughness: 0.7 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), nut);
    m.position.copy(top).add(new THREE.Vector3(Math.cos(a) * 0.2, -0.22 - (i % 2) * 0.1, Math.sin(a) * 0.2));
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

function buildLifeguardTower() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe8483f, roughness: 0.6 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffcf3f, roughness: 0.6 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x8fd4e8, roughness: 0.3, metalness: 0.2 });
  const box = (w, h, d, m, x, y, z, rx = 0, rz = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, 0, rz);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
  };
  [[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]].forEach(([x, z]) => box(0.14, 2.0, 0.14, white, x, 1.0, z));
  box(2.1, 0.08, 0.08, white, 0, 0.9, 0.7, 0, 0.55);
  box(2.1, 0.08, 0.08, white, 0, 0.9, -0.7, 0, -0.55);
  box(2.6, 0.12, 2.0, white, 0, 2.05, 0);               // deck
  box(2.0, 1.25, 1.5, red, 0, 2.72, -0.1);              // cabin
  box(2.02, 0.22, 1.52, white, 0, 2.95, -0.1);          // stripe
  box(1.4, 0.42, 0.02, blue, 0, 2.62, 0.66);            // window
  box(2.5, 0.1, 1.9, yellow, 0, 3.45, -0.1, 0.12, 0);   // roof
  box(0.9, 0.06, 2.6, white, 0, 1.0, 1.9, -0.72, 0);    // ramp
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), white);
  pole.position.set(0.9, 4.1, -0.5);
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), new THREE.MeshStandardMaterial({ color: 0xe8483f, side: THREE.DoubleSide }));
  flag.position.set(1.2, 4.6, -0.5);
  g.add(flag);
  g.userData.flag = flag;
  return g;
}

function buildUmbrella() {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 12, 1, true), new THREE.MeshStandardMaterial({ map: stripeTexture(['#ff5a5f', '#ffffff', '#ffc93c', '#ffffff', '#2ec4b6', '#ffffff']), side: THREE.DoubleSide, roughness: 0.8 }));
  canopy.position.y = 2.05;
  canopy.castShadow = true;
  g.add(canopy);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  pole.position.y = 1.05;
  pole.castShadow = true;
  g.add(pole);
  g.rotation.z = 0.12;
  const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshStandardMaterial({ map: stripeTexture(['#2a6fd6', '#ffffff', '#2a6fd6', '#ffd23f'], 8, true), roughness: 0.9 }));
  towel.rotation.x = -Math.PI / 2;
  towel.position.set(0.5, 0.02, 0.6);
  towel.rotation.z = 0.3;
  towel.receiveShadow = true;
  g.add(towel);
  return g;
}

function buildSurfboard() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ map: stripeTexture(['#ff7b54', '#ffffff', '#ff7b54', '#2ec4b6', '#ff7b54'], 5), roughness: 0.35 }));
  m.scale.set(0.26, 1.05, 0.05);
  m.position.y = 0.7;
  m.rotation.z = -0.15;
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

function buildGull() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a3f4a, side: THREE.DoubleSide });
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.08, 0, 0, 0.08, 0.55, 0.05, 0], 3));
  const l = new THREE.Mesh(wing, mat), r = new THREE.Mesh(wing, mat);
  r.scale.x = -1;
  g.add(l, r);
  g.userData.wings = [l, r];
  return g;
}

function buildHeadland() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5f8a6e, roughness: 1, flatShading: true });
  [[-300, -950, 170, 42], [460, -1400, 240, 30]].forEach(([x, z, r, h]) => {
    const geo = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(r, h, r * 0.45);
    m.position.set(x, SEA_Y - 1, z);
    g.add(m);
  });
  // A sailboat on the horizon.
  const sail = new THREE.BufferGeometry();
  sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 7, 0, 3.5, 0.5, 0], 3));
  sail.computeVertexNormals();
  const s = new THREE.Mesh(sail, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  s.position.set(90, SEA_Y + 0.8, -420);
  g.add(s);
  return g;
}

/* ---------------- entry ---------------- */
// pivot: world position of the local origin (about where a visitor's eye is).
// sunDirWorld: direction *toward* the sun in world space (must agree with the room's sunbeam).
export function buildOutdoor({ pivot, yaw, tilt, sunDirWorld }) {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.position.copy(pivot);
  root.rotation.set(tilt, yaw, 0, 'YXZ');
  scene.add(root);
  root.updateMatrixWorld(true);

  const toLocal = root.quaternion.clone().invert();
  const sunLocal = sunDirWorld.clone().applyQuaternion(toLocal).normalize();

  const u = {
    uTime: { value: 0 },
    uSun: { value: sunLocal },
    uZenith: { value: new THREE.Color(0x1f74d0) },
    uHorizon: { value: new THREE.Color(0xb9dcef) },
    uSunColor: { value: new THREE.Color(0xfff1d8) },
    uCamLocal: { value: new THREE.Vector3() },
    uNormals: { value: waterNormals() },
    uDeep: { value: new THREE.Color(0x0a5f8f) },
    uMid: { value: new THREE.Color(0x0aa6b8) },
    uShallow: { value: new THREE.Color(0x48e0cf) },
    uFoam: { value: new THREE.Color(0xf7fbfb) }
  };

  root.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), makeSkyMaterial(u)));
  const oceanGeo = new THREE.PlaneGeometry(5000, 5000, 1, 1);
  oceanGeo.rotateX(-Math.PI / 2);
  oceanGeo.translate(0, SEA_Y, -2470);
  root.add(new THREE.Mesh(oceanGeo, makeOceanMaterial(u)));
  root.add(buildSand(u));
  root.add(buildHeadland());

  const place = (obj, x, z, rotY = 0) => {
    obj.position.set(x, groundY(x, z), z);
    obj.rotation.y += rotY;
    root.add(obj);
    return obj;
  };
  // Palms frame the top of the view; the tower, umbrella and board sit out on the sand.
  place(buildPalm(9.0, 1.8, 0.3, 3), -6.2, -30);
  place(buildPalm(10.0, 2.4, 2.8, 4), 6.8, -33);
  place(buildPalm(7.5, 1.4, 1.0, 5), -11, -37);
  place(buildPalm(8.5, 2.0, 2.2, 6), 11.5, -29);
  const tower = place(buildLifeguardTower(), 2.2, -41, 0.3);
  place(buildUmbrella(), -2.6, -38);
  place(buildSurfboard(), 0.6, -34, 0.6);

  const gulls = [0, 1, 2].map((i) => {
    const gl = buildGull();
    gl.userData.phase = i * 2.1;
    gl.userData.r = 10 + i * 5;
    gl.userData.h = 1.2 + i * 1.3;
    root.add(gl);
    return gl;
  });

  // Daylight: sun, sky fill and haze — for the beach only.
  scene.add(new THREE.HemisphereLight(0xa9d8ff, 0xe8d2a2, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.4);
  const sunPos = sunLocal.clone().multiplyScalar(60);
  sun.position.copy(root.localToWorld(sunPos.clone().add(new THREE.Vector3(0, SEA_Y, -36))));
  sun.target.position.copy(root.localToWorld(new THREE.Vector3(0, SEA_Y, -36)));
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 160 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  // Nothing that casts a shadow out here moves, so render the shadow map once.
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  scene.add(sun, sun.target);
  scene.fog = new THREE.Fog(0xb9dcef, 150, 2200);

  // Only draw where the room's window portal marked the stencil buffer.
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      m.stencilWrite = true;
      m.stencilRef = 1;
      m.stencilFunc = THREE.EqualStencilFunc;
      m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp;
    });
  });

  const camLocal = new THREE.Vector3();
  function update(t, camera) {
    u.uTime.value = t;
    camLocal.copy(camera.position);
    root.worldToLocal(camLocal);
    u.uCamLocal.value.copy(camLocal);
    gulls.forEach((gl) => {
      const a = t * 0.18 + gl.userData.phase;
      gl.position.set(Math.cos(a) * gl.userData.r - 1, gl.userData.h + Math.sin(t * 0.7 + gl.userData.phase), -40 + Math.sin(a) * gl.userData.r * 0.5);
      gl.rotation.y = -a;
      const flap = Math.sin(t * 6 + gl.userData.phase) * 0.45;
      gl.userData.wings[0].rotation.z = flap;
      gl.userData.wings[1].rotation.z = -flap;
    });
    tower.userData.flag.rotation.y = Math.sin(t * 2.3) * 0.25;
  }

  return { scene, update };
}
