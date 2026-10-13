// scene.js — builds Omar's desk: the room, the desk, the CRT and PC, and every prop on it.
// Units are meters. The desk top surface sits at y = DESK_Y; the camera looks toward -z.
//
// The hero props (dive mask, wrestling headgear, track spikes, power drill) are modeled here
// procedurally as stand-ins. Each prop is a THREE.Group tagged with userData.prop, so a sourced
// glTF model can later replace a builder without touching the interaction code.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import * as TX from './textures.js';

export const DESK_Y = 0.75;

/* ---------------- helpers ---------------- */
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...o });
const rbox = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);

function mesh(geo, mat, pos, rot, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function roundedRect(w, h, r, cx = 0, cy = 0, path) {
  const s = path || new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// A box that tapers along -z: front face w1 x h1 at z=0, back face w2 x h2 at z=-d.
function frustumGeometry(w1, h1, w2, h2, d, yOff = 0) {
  const f = [[-w1 / 2, -h1 / 2, 0], [w1 / 2, -h1 / 2, 0], [w1 / 2, h1 / 2, 0], [-w1 / 2, h1 / 2, 0]];
  const b = [[-w2 / 2, -h2 / 2 + yOff, -d], [w2 / 2, -h2 / 2 + yOff, -d], [w2 / 2, h2 / 2 + yOff, -d], [-w2 / 2, h2 / 2 + yOff, -d]];
  const quads = [[f[0], f[1], f[2], f[3]], [b[1], b[0], b[3], b[2]], [f[3], f[2], b[2], b[3]], [b[0], b[1], f[1], f[0]], [f[1], b[1], b[2], f[2]], [b[0], f[0], f[3], b[3]]];
  const pos = [];
  quads.forEach(([a, bb, c, dd]) => pos.push(...a, ...bb, ...c, ...a, ...c, ...dd));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Drop a prop so its lowest point rests on the desk surface.
function restOn(group, y = DESK_Y) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  group.position.y += y - box.min.y;
}

function shadowAll(obj, cast = true, receive = true) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
}

function prop(id, group) {
  group.userData.prop = id;
  group.name = id;
  return group;
}

/* ---------------- room ---------------- */
// The back wall sits at WALL_Z with a real opening for the window, so sunlight can pour through it
// onto the desk. The beach outside is a big painted plane set back from the wall, so it shifts with the
// camera like a real view would.
const WALL_Z = -0.55;
const WINDOW = { cx: -0.9, cy: 1.43, w: 0.86, h: 0.74 };
const RAIL_Y = 0.95;
const CEILING_Y = 2.7;

function buildRoom(scene, parts) {
  const wallZ = WALL_Z;
  const { cx, cy, w: W, h: H } = WINDOW;
  const x0 = cx - W / 2, x1 = cx + W / 2, y0 = cy - H / 2, y1 = cy + H / 2;

  scene.add(mesh(new THREE.PlaneGeometry(10, 10), std(0xffffff, { map: TX.floorTexture(), roughness: 0.85 }), [0, 0, 0], [-Math.PI / 2, 0, 0], { cast: false }));
  // Ceiling: barely on screen, but it keeps the sun from spilling over the top of the wall.
  scene.add(mesh(new THREE.PlaneGeometry(8, 4), std(0xf6f1e8, { roughness: 0.9 }), [0, CEILING_Y, 1.45], [Math.PI / 2, 0, 0], { receive: false }));

  // Upper wall: sea-glass paint with the window cut out.
  const paint = std(0xffffff, { map: TX.paintTexture('#8fd3c8'), roughness: 0.92 });
  const shape = new THREE.Shape();
  shape.moveTo(-4, RAIL_Y);
  shape.lineTo(4, RAIL_Y);
  shape.lineTo(4, CEILING_Y);
  shape.lineTo(-4, CEILING_Y);
  shape.lineTo(-4, RAIL_Y);
  const hole = new THREE.Path();
  hole.moveTo(x0, y0);
  hole.lineTo(x0, y1);
  hole.lineTo(x1, y1);
  hole.lineTo(x1, y0);
  hole.lineTo(x0, y0);
  shape.holes.push(hole);
  scene.add(mesh(new THREE.ShapeGeometry(shape), paint, [0, 0, wallZ]));
  scene.add(mesh(new THREE.PlaneGeometry(4, CEILING_Y), paint, [-2.4, CEILING_Y / 2, 1.0], [0, Math.PI / 2, 0], { cast: false }));

  // Lower wall: white beadboard, a chair rail and a baseboard.
  const bead = TX.beadboardTexture();
  bead.repeat.set(8 / 0.6, 1);
  scene.add(mesh(new THREE.PlaneGeometry(8, RAIL_Y), std(0xffffff, { map: bead, roughness: 0.7 }), [0, RAIL_Y / 2, wallZ + 0.001]));
  const trim = std(0xfbf8f1, { roughness: 0.5 });
  scene.add(mesh(new THREE.BoxGeometry(8, 0.045, 0.025), trim, [0, RAIL_Y, wallZ + 0.012]));
  scene.add(mesh(new THREE.BoxGeometry(8, 0.11, 0.02), trim, [0, 0.055, wallZ + 0.01]));

  // Window: casing, sill, reveal (wall thickness) and a sash with a cross of mullions.
  const win = new THREE.Group();
  const T = 0.06, D = 0.13, sashZ = wallZ - 0.09;
  win.add(mesh(new THREE.BoxGeometry(W + 2 * T, T, 0.03), trim, [cx, y1 + T / 2, wallZ + 0.015]));
  win.add(mesh(new THREE.BoxGeometry(T, H, 0.03), trim, [x0 - T / 2, cy, wallZ + 0.015]));
  win.add(mesh(new THREE.BoxGeometry(T, H, 0.03), trim, [x1 + T / 2, cy, wallZ + 0.015]));
  win.add(mesh(new THREE.BoxGeometry(W + 0.2, 0.026, 0.16), trim, [cx, y0 - 0.013, wallZ + 0.05]));
  win.add(mesh(new THREE.BoxGeometry(W + 0.08, 0.05, 0.02), trim, [cx, y0 - 0.055, wallZ + 0.01]));
  win.add(mesh(new THREE.BoxGeometry(0.01, H, D), trim, [x0 + 0.005, cy, wallZ - D / 2]));
  win.add(mesh(new THREE.BoxGeometry(0.01, H, D), trim, [x1 - 0.005, cy, wallZ - D / 2]));
  win.add(mesh(new THREE.BoxGeometry(W, 0.01, D), trim, [cx, y1 - 0.005, wallZ - D / 2]));
  win.add(mesh(new THREE.BoxGeometry(W, 0.01, D), trim, [cx, y0 + 0.005, wallZ - D / 2]));
  const S = 0.032;
  win.add(mesh(new THREE.BoxGeometry(W, S, 0.03), trim, [cx, y1 - S / 2, sashZ]));
  win.add(mesh(new THREE.BoxGeometry(W, S, 0.03), trim, [cx, y0 + S / 2, sashZ]));
  win.add(mesh(new THREE.BoxGeometry(S, H, 0.03), trim, [x0 + S / 2, cy, sashZ]));
  win.add(mesh(new THREE.BoxGeometry(S, H, 0.03), trim, [x1 - S / 2, cy, sashZ]));
  win.add(mesh(new THREE.BoxGeometry(0.022, H, 0.025), trim, [cx, cy, sashZ]));
  win.add(mesh(new THREE.BoxGeometry(W, 0.022, 0.025), trim, [cx, cy + 0.04, sashZ]));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.05, depthWrite: false }));
  glass.position.set(cx, cy, sashZ - 0.005);
  win.add(glass);
  scene.add(win);

  // A little succulent on the sill.
  const plant = new THREE.Group();
  plant.add(mesh(new THREE.CylinderGeometry(0.035, 0.026, 0.06, 24), std(0xc9643b, { roughness: 0.8 }), [0, 0.03, 0]));
  plant.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.006, 24), std(0x4a3426, { roughness: 1 }), [0, 0.058, 0]));
  const leaf = std(0x5fae6a, { roughness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const l = mesh(new THREE.SphereGeometry(0.014, 12, 8), leaf, [Math.cos(a) * 0.014, 0.072 + (i % 3) * 0.006, Math.sin(a) * 0.014], [0, -a, 0.9]);
    l.scale.set(0.55, 1.5, 0.55);
    plant.add(l);
  }
  plant.position.set(x1 - 0.12, y0, wallZ + 0.06);
  scene.add(plant);

  // Outside: golden hour at the beach.
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.7), new THREE.MeshBasicMaterial({ map: TX.beachTexture(), toneMapped: false, fog: false }));
  beach.position.set(cx, 1.43, wallZ - 1.4);
  scene.add(beach);

  // Linen curtains pulled to the sides, on a rod.
  const linen = std(0xfff8ec, { roughness: 0.95, side: THREE.DoubleSide });
  [x0 - 0.09, x1 + 0.09].forEach((x, i) => {
    const geo = new THREE.PlaneGeometry(0.24, H + 0.36, 28, 1);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) pos.setZ(k, Math.sin(pos.getX(k) * 70 + i) * 0.012);
    geo.computeVertexNormals();
    win.add(mesh(geo, linen, [x, cy - 0.04, wallZ + 0.07]));
  });
  win.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, W + 0.62, 12), std(0x2a2a2a, { metalness: 0.6, roughness: 0.4 }), [cx, y1 + 0.13, wallZ + 0.07], [0, 0, Math.PI / 2]));
  [x0 - 0.31, x1 + 0.31].forEach((x) => win.add(mesh(new THREE.SphereGeometry(0.016, 14, 10), std(0x2a2a2a, { metalness: 0.6, roughness: 0.4 }), [x, y1 + 0.13, wallZ + 0.07])));
  glass.castShadow = false;

  // Duke pennant, above the monitor.
  const pen = new THREE.Group();
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.1, 0, 0, -0.1, 0, 0.62, 0, 0], 3));
  pg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0.5], 2));
  pg.computeVertexNormals();
  pen.add(mesh(pg, std(0xffffff, { map: TX.pennantTexture(), roughness: 0.95, side: THREE.DoubleSide })));
  pen.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 10), std(0x6b4a2b), [-0.004, 0, 0.004]));
  pen.position.set(-0.2, 1.5, wallZ + 0.01);
  pen.rotation.z = -0.06;
  scene.add(prop('pennant', pen));

  parts.wallZ = wallZ;
}

/* ---------------- string lights + polaroids ---------------- */
const POLAROIDS = [
  ['dive-crew', 'dive crew'],
  ['yellowtail', 'big one!'],
  ['wrestling', 'the W'],
  ['workshop', 'shop day']
];

function buildPhotoString(scene, parts, photos) {
  const g = new THREE.Group();
  const z = WALL_Z + 0.035;
  const xa = 0.45, xb = 1.08, yEnd = 1.52, sag = 0.05;
  const yAt = (x) => { const t = (x - xa) / (xb - xa); return yEnd - sag * 4 * t * (1 - t); };
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = xa + (i / 40) * (xb - xa);
    pts.push(new THREE.Vector3(x, yAt(x), z));
  }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.0012, 5), std(0x1f3a26, { roughness: 0.6 }), null, null, { cast: false }));
  [xa, xb].forEach((x) => g.add(mesh(new THREE.SphereGeometry(0.005, 10, 8), std(0xd8d8d8, { metalness: 0.8, roughness: 0.3 }), [x, yEnd, z - 0.01])));
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc46b, emissiveIntensity: 3 });
  const sockMat = std(0x1f3a26, { roughness: 0.6 });
  for (let x = xa + 0.03; x < xb - 0.02; x += 0.06) {
    const y = yAt(x);
    g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.008, 8), sockMat, [x, y - 0.006, z], null, { cast: false }));
    const b = mesh(new THREE.SphereGeometry(0.0065, 12, 10), bulbMat, [x, y - 0.014, z], null, { cast: false });
    b.scale.y = 1.3;
    g.add(b);
  }
  const glow = new THREE.PointLight(0xffc46b, 0.35, 1.0, 2);
  glow.position.set((xa + xb) / 2, yEnd - 0.12, z + 0.12);
  g.add(glow);

  const back = std(0xf4f1e8, { roughness: 0.8 });
  const pinMat = std(0xc49a6c, { roughness: 0.7 });
  const xs = [0.52, 0.68, 0.84, 1.0];
  POLAROIDS.forEach(([id, caption], i) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;
    const pol = new THREE.Group();
    pol.add(mesh(new THREE.BoxGeometry(0.11, 0.132, 0.0015), back));
    pol.add(mesh(new THREE.PlaneGeometry(0.11, 0.132), std(0xffffff, { map: TX.polaroidTexture(photo.thumb, caption, 50 + i), roughness: 0.55 }), [0, 0, 0.0022], null, { cast: false }));
    pol.add(mesh(new THREE.BoxGeometry(0.008, 0.028, 0.007), pinMat, [0, 0.07, 0.004]));
    const x = xs[i];
    pol.scale.setScalar(0.85);
    pol.position.set(x, yAt(x) - 0.004 - 0.066 * 0.85, z + 0.004);
    pol.rotation.set(0.04, 0, [0.07, -0.05, 0.04, -0.08][i]);
    g.add(pol);
  });
  shadowAll(g, true, true);
  scene.add(prop('photos', g));
}

/* ---------------- desk ---------------- */
function buildDesk(scene) {
  const g = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({ map: TX.woodTexture(), roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  g.add(mesh(rbox(1.8, 0.04, 0.8, 0.008), wood, [0, DESK_Y - 0.02, 0]));
  const dark = std(0x3b2a1d, { roughness: 0.6 });
  g.add(mesh(new THREE.BoxGeometry(0.04, DESK_Y - 0.04, 0.74), dark, [-0.85, (DESK_Y - 0.04) / 2, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.04, DESK_Y - 0.04, 0.74), dark, [0.85, (DESK_Y - 0.04) / 2, 0]));
  g.add(mesh(new THREE.BoxGeometry(1.66, 0.4, 0.02), dark, [0, DESK_Y - 0.26, -0.34]));
  // A drawer unit under the right side.
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.66), dark, [0.62, DESK_Y - 0.29, 0.02]));
  for (let i = 0; i < 3; i++) {
    g.add(mesh(new THREE.BoxGeometry(0.38, 0.15, 0.01), std(0x4a3524, { roughness: 0.55 }), [0.62, DESK_Y - 0.12 - i * 0.165, 0.355]));
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), std(0xb8b8b8, { metalness: 1, roughness: 0.3 }), [0.62, DESK_Y - 0.1 - i * 0.165, 0.366]));
  }
  scene.add(g);
}

/* ---------------- CRT monitor ---------------- */
function buildMonitor(scene, parts) {
  const g = new THREE.Group();
  const beige = std(0xd9d3c0, { roughness: 0.55 });
  const beigeDark = std(0xc4bda6, { roughness: 0.6 });

  const W = 0.42, H = 0.39;
  const HW = 0.336, HH = 0.262, HOLE_Y = 0.02;
  const SW = 0.32, SH = 0.24;
  const shape = roundedRect(W, H, 0.035);
  shape.holes.push(roundedRect(HW, HH, 0.014, 0, HOLE_Y, new THREE.Path()));
  const bezel = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 4, curveSegments: 14 });
  bezel.translate(0, 0, -0.04);
  g.add(mesh(bezel, beige));

  g.add(mesh(rbox(0.405, 0.375, 0.14, 0.03), beige, [0, 0, -0.118]));
  const tail = mesh(frustumGeometry(0.36, 0.33, 0.25, 0.22, 0.24, 0.01), beigeDark, [0, 0, -0.18]);
  g.add(tail);
  for (let i = 0; i < 7; i++) g.add(mesh(new THREE.BoxGeometry(0.2, 0.002, 0.012), std(0x2a2824), [0, 0.168 - i * 0.003, -0.22 - i * 0.025], [-0.19, 0, 0], { cast: false }));
  // Swivel stand.
  g.add(mesh(rbox(0.15, 0.05, 0.17, 0.01), beigeDark, [0, -0.22, -0.13]));
  const foot = mesh(new THREE.CylinderGeometry(0.14, 0.145, 0.02, 48), beige, [0, -0.253, -0.12]);
  foot.scale.z = 0.85;
  g.add(foot);

  // The screen: black glass border, the "hole" the HTML OS shows through, and glass effects.
  const border = mesh(new THREE.PlaneGeometry(HW + 0.004, HH + 0.004), std(0x0a0b0a, { roughness: 0.15 }), [0, HOLE_Y, -0.009], null, { cast: false });
  g.add(border);
  const holeShape = roundedRect(SW, SH, 0.012);
  const hole = new THREE.Mesh(new THREE.ShapeGeometry(holeShape, 12), new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, blending: THREE.NoBlending }));
  hole.position.set(0, HOLE_Y, -0.0065);
  hole.userData.screen = true;
  g.add(hole);
  const off = new THREE.Mesh(new THREE.ShapeGeometry(holeShape, 12), new THREE.MeshBasicMaterial({ color: 0x1b201d, transparent: true, opacity: 0.92, depthWrite: false }));
  off.position.set(0, HOLE_Y, -0.006);
  off.renderOrder = 1;
  g.add(off);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: TX.glassTexture(), transparent: true, depthWrite: false }));
  glass.position.set(0, HOLE_Y, -0.0055);
  glass.renderOrder = 2;
  g.add(glass);

  // Controls on the chin: badge, knobs, power LED and button.
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.022), new THREE.MeshStandardMaterial({ map: TX.labelTexture('OZ-CRT 17', { font: 'italic 900 70px Arial, sans-serif', color: '#55524a' }), transparent: true, roughness: 0.6 }));
  badge.position.set(-0.13, -0.155, 0.0085);
  g.add(badge);
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 16), beigeDark, [0.02 + i * 0.022, -0.162, 0.01], [Math.PI / 2, 0, 0]));
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x332200, emissive: 0xffa000, emissiveIntensity: 1.2 });
  const led = mesh(new THREE.BoxGeometry(0.01, 0.005, 0.004), ledMat, [0.145, -0.162, 0.009], null, { cast: false });
  g.add(led);
  const power = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 24), beigeDark, [0.175, -0.162, 0.01], [Math.PI / 2, 0, 0]);
  power.userData.part = 'power';
  g.add(power);

  // Sticky note on the bezel.
  const note = mesh(new THREE.PlaneGeometry(0.062, 0.062), std(0xffffff, { map: TX.stickyTexture(['ship it.', 'then sleep.'], '#fff27a', 4), roughness: 0.9 }), [0.185, 0.168, 0.0095], [0, 0, -0.14], { cast: false });
  g.add(note);

  shadowAll(g);
  border.castShadow = hole.castShadow = off.castShadow = glass.castShadow = false;
  g.position.set(0, DESK_Y + 0.263, -0.12);
  scene.add(prop('computer', g));

  parts.monitor = g;
  parts.screen = { hole, off, glass, width: SW, height: SH, center: new THREE.Vector3(0, HOLE_Y, -0.0065) };
  parts.monitorLed = ledMat;
  parts.powerButton = power;
}

/* ---------------- keyboard ---------------- */
function buildKeyboard(scene) {
  const g = new THREE.Group();
  const U = 0.0188;
  g.add(mesh(rbox(0.455, 0.022, 0.165, 0.006), std(0xd6d0bd, { roughness: 0.6 }), [0, 0.011, 0]));
  const rows = [
    [[1, 'm'], [0.6, 'gap'], [1], [1], [1], [1], [0.4, 'gap'], [1], [1], [1], [1], [0.4, 'gap'], [1], [1], [1], [1]],
    [[1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [2, 'm']],
    [[1.5, 'm'], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1.5, 'm']],
    [[1.75, 'm'], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [2.25, 'm']],
    [[2.25, 'm'], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [2.75, 'm']],
    [[1.25, 'm'], [1.25, 'm'], [1.25, 'm'], [6.25], [1.25, 'm'], [1.25, 'm'], [1.25, 'm'], [1.25, 'm']]
  ];
  const keys = [];
  const left = -0.215;
  rows.forEach((row, r) => {
    let x = left;
    const z = -0.06 + r * U + (r > 0 ? 0.006 : 0);
    row.forEach(([w, kind]) => {
      if (kind !== 'gap') keys.push({ x: x + (w * U) / 2, z, w: w * U - 0.0026, mod: kind === 'm' });
      x += w * U;
    });
  });
  // Arrow/nav cluster and numpad.
  const navX = left + 15 * U + 0.012;
  [[0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [1, 4], [0, 5], [1, 5], [2, 5]].forEach(([c, r]) => keys.push({ x: navX + c * U + U / 2, z: -0.06 + r * U + 0.006, w: U - 0.0026, mod: true }));
  const padX = navX + 3 * U + 0.012;
  for (let r = 1; r < 6; r++) for (let c = 0; c < 4; c++) keys.push({ x: padX + c * U + U / 2, z: -0.06 + r * U + 0.006, w: U - 0.0026, mod: c === 3 || r === 1 });
  const keyGeo = rbox(1, 0.009, U - 0.0026, 0.0018, 2);
  const inst = new THREE.InstancedMesh(keyGeo, std(0xffffff, { roughness: 0.5 }), keys.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const light = new THREE.Color(0xebe6d6), mod = new THREE.Color(0xb7b19c);
  keys.forEach((k, i) => {
    s.set(k.w, 1, 1);
    p.set(k.x, 0.026, k.z);
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, k.mod ? mod : light);
  });
  inst.castShadow = true;
  inst.receiveShadow = true;
  g.add(inst);
  const lamp = new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x33ff55, emissiveIntensity: 0.8 });
  [0, 1, 2].forEach((i) => g.add(mesh(new THREE.BoxGeometry(0.004, 0.002, 0.002), lamp, [padX + 0.012 + i * 0.016, 0.0225, -0.067])));
  g.rotation.x = 0.05;
  g.position.set(-0.03, DESK_Y + 0.001, 0.215);
  scene.add(prop('keyboard', g));
}

/* ---------------- gaming mouse + pad ---------------- */
function buildMouse(scene, parts) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.29, 0.004, 0.24, 0.0019), std(0x15171c, { roughness: 0.9 }), [0, 0.002, 0]));
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.02), new THREE.MeshStandardMaterial({ map: TX.labelTexture('OZ GAMING', { font: '900 60px Arial', color: '#2f3440' }), transparent: true }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0.075, 0.0045, 0.1);
  g.add(pad);

  const m = new THREE.Group();
  const black = std(0x16161a, { roughness: 0.38 });
  const shell = mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), black);
  shell.scale.set(0.034, 0.024, 0.064);
  m.add(shell);
  const base = mesh(new THREE.CylinderGeometry(1, 1, 1, 40), std(0x0d0d10, { roughness: 0.7 }), [0, -0.0025, 0]);
  base.scale.set(0.0345, 0.005, 0.0645);
  m.add(base);
  const rgbMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0066, emissiveIntensity: 2.4 });
  const ring = mesh(new THREE.TorusGeometry(1, 0.045, 8, 64), rgbMat, [0, 0.0005, 0], [Math.PI / 2, 0, 0], { cast: false });
  ring.scale.set(0.0345, 0.0645, 0.06);
  m.add(ring);
  const wheel = mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.006, 20), rgbMat, [0, 0.023, -0.03], [0, 0, Math.PI / 2], { cast: false });
  m.add(wheel);
  m.add(mesh(new THREE.BoxGeometry(0.0012, 0.003, 0.05), std(0x050505), [0, 0.0215, -0.04], [0.32, 0, 0], { cast: false }));
  const logo = mesh(new THREE.CircleGeometry(0.006, 6), rgbMat, [0, 0.0205, 0.03], [-Math.PI / 2 + 0.55, 0, 0], { cast: false });
  m.add(logo);
  m.position.set(0.01, 0.0095, 0.02);
  m.rotation.y = 0.12;
  g.add(m);

  // Cable snaking off toward the back of the desk.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.002, 0.012, -0.045), new THREE.Vector3(-0.01, 0.006, -0.12), new THREE.Vector3(-0.06, 0.004, -0.2),
    new THREE.Vector3(-0.12, 0.004, -0.27), new THREE.Vector3(-0.2, 0.004, -0.34)
  ]);
  g.add(mesh(new THREE.TubeGeometry(curve, 40, 0.0018, 6), std(0x111111, { roughness: 0.6 })));
  g.position.set(0.36, DESK_Y, 0.2);
  shadowAll(g);
  scene.add(prop('mouse', g));
  parts.rgb = rgbMat;
}

/* ---------------- PC tower ---------------- */
function buildTower(scene, parts) {
  const g = new THREE.Group();
  const beige = std(0xd9d3c0, { roughness: 0.55 });
  g.add(mesh(rbox(0.19, 0.42, 0.42, 0.008), beige, [0, 0.21, 0]));
  const front = mesh(new THREE.PlaneGeometry(0.18, 0.405), std(0xffffff, { map: TX.towerFrontTexture(), roughness: 0.6 }), [0, 0.21, 0.2105], null, { cast: false });
  g.add(front);
  const pwr = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 24), std(0xc4bda6), [0, 0.15, 0.214], [Math.PI / 2, 0, 0]);
  pwr.userData.part = 'power';
  g.add(pwr);
  const pled = new THREE.MeshStandardMaterial({ color: 0x002200, emissive: 0x22ff44, emissiveIntensity: 0 });
  const hled = new THREE.MeshStandardMaterial({ color: 0x221100, emissive: 0xffaa00, emissiveIntensity: 0 });
  g.add(mesh(new THREE.BoxGeometry(0.008, 0.004, 0.003), pled, [-0.03, 0.12, 0.2125], null, { cast: false }));
  g.add(mesh(new THREE.BoxGeometry(0.008, 0.004, 0.003), hled, [0.03, 0.12, 0.2125], null, { cast: false }));
  // Sticky note on the case.
  g.add(mesh(new THREE.PlaneGeometry(0.06, 0.06), std(0xffffff, { map: TX.stickyTexture(['leg day:', 'NOT', 'optional'], '#ff9ec7', 8), roughness: 0.9 }), [0.055, 0.37, 0.2115], [0, 0, 0.09], { cast: false }));
  g.position.set(0.41, DESK_Y, -0.17);
  shadowAll(g);
  front.castShadow = false;
  scene.add(prop('tower', g));
  parts.powerLed = pled;
  parts.hddLed = hled;
}

/* ---------------- floppy disks ---------------- */
function buildFloppies(scene) {
  const g = new THREE.Group();
  const disks = [['SCUBAGO', 'v1.0 - dive sites', '#1c1c1f'], ['PORTFOLIO', "'98 edition", '#1d3fae'], ['???', 'top secret', '#b0261f']];
  disks.forEach(([a, b, color], i) => {
    const side = std(color, { roughness: 0.45 });
    const top = std(0xffffff, { map: TX.floppyTexture([a, b], color, 40 + i), roughness: 0.45 });
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.0033, 0.094), [side, side, top, side, side, side]);
    d.castShadow = d.receiveShadow = true;
    d.position.set(i * 0.012, 0.00165 + i * 0.0034, -i * 0.01);
    d.rotation.y = -0.25 + i * 0.32;
    g.add(d);
  });
  g.position.set(0.64, DESK_Y, 0.03);
  scene.add(prop('floppies', g));
}

/* ---------------- resume paper ---------------- */
function buildResume(scene, profile, projects) {
  const geo = new THREE.PlaneGeometry(0.216, 0.279, 20, 20);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // Lift one corner a little, like a page that's been handled.
    const t = Math.max(0, (x - 0.04) / 0.068) * Math.max(0, (-y - 0.06) / 0.08);
    pos.setZ(i, t * t * 0.012);
  }
  geo.computeVertexNormals();
  const page = mesh(geo, std(0xffffff, { map: TX.resumeTexture(profile, projects), roughness: 0.92, side: THREE.DoubleSide }), null, [-Math.PI / 2, 0, 0], { cast: true });
  const g = new THREE.Group();
  g.add(page);
  // Paper clip.
  const clipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.002, -0.15), new THREE.Vector3(-0.08, 0.002, -0.115), new THREE.Vector3(-0.074, 0.002, -0.11),
    new THREE.Vector3(-0.068, 0.002, -0.115), new THREE.Vector3(-0.068, 0.002, -0.145), new THREE.Vector3(-0.072, 0.002, -0.15),
    new THREE.Vector3(-0.076, 0.002, -0.145), new THREE.Vector3(-0.076, 0.002, -0.125)
  ]);
  g.add(mesh(new THREE.TubeGeometry(clipCurve, 60, 0.0007, 6), std(0xcfd3d8, { metalness: 1, roughness: 0.25 })));
  g.position.set(-0.37, DESK_Y + 0.0006, 0.23);
  g.rotation.y = 0.16;
  scene.add(prop('resume', g));
}

/* ---------------- sketchbook + pencil ---------------- */
function buildSketchbook(scene) {
  const g = new THREE.Group();
  const coverMat = std(0x1b1b1d, { roughness: 0.75 });
  g.add(mesh(rbox(0.2, 0.003, 0.27, 0.0012), coverMat, [0, 0.0015, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.192, 0.012, 0.262), std(0xf2ecdc, { roughness: 0.95 }), [0.002, 0.009, 0.002]));
  g.add(mesh(rbox(0.2, 0.003, 0.27, 0.0012), coverMat, [0, 0.0165, 0]));
  const label = mesh(new THREE.PlaneGeometry(0.11, 0.055), std(0xffffff, { map: TX.sketchLabelTexture(), roughness: 0.9 }), [0.01, 0.0182, 0.02], [-Math.PI / 2, 0, 0], { cast: false });
  g.add(label);
  const ringGeo = new THREE.TorusGeometry(0.008, 0.0011, 6, 16);
  const rings = new THREE.InstancedMesh(ringGeo, std(0x9aa0a6, { metalness: 1, roughness: 0.3 }), 18);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 18; i++) {
    m4.makeRotationY(Math.PI / 2);
    m4.setPosition(-0.088 + i * 0.0104, 0.009, -0.132);
    rings.setMatrixAt(i, m4);
  }
  rings.castShadow = true;
  g.add(rings);
  // Elastic band.
  g.add(mesh(new THREE.BoxGeometry(0.004, 0.0195, 0.272), std(0x8b1a1a, { roughness: 0.7 }), [0.075, 0.0095, 0]));
  // Pencil.
  const pencil = new THREE.Group();
  pencil.add(mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.15, 6), std(0xf2b705, { roughness: 0.5 })));
  pencil.add(mesh(new THREE.ConeGeometry(0.0038, 0.02, 6), std(0xe3c18f, { roughness: 0.8 }), [0, 0.085, 0]));
  pencil.add(mesh(new THREE.ConeGeometry(0.0013, 0.007, 8), std(0x2a2a2a, { roughness: 0.4 }), [0, 0.0918, 0]));
  pencil.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 12), std(0xc0c4c8, { metalness: 1, roughness: 0.3 }), [0, -0.08, 0]));
  pencil.add(mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.01, 12), std(0xf08a9a, { roughness: 0.8 }), [0, -0.09, 0]));
  pencil.rotation.set(0, 0.5, Math.PI / 2);
  pencil.position.set(0.135, 0.0039, 0.03);
  g.add(pencil);
  shadowAll(g);
  label.castShadow = false;
  g.position.set(-0.64, DESK_Y, 0.2);
  g.rotation.y = -0.22;
  scene.add(prop('sketchbook', g));
}

/* ---------------- desk lamp ---------------- */
function buildLamp(scene, parts) {
  const g = new THREE.Group();
  const metal = std(0x23262b, { metalness: 0.6, roughness: 0.35 });
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.02, 40), metal, [0, 0.01, 0]));
  const a1 = new THREE.Group();
  a1.position.set(0, 0.025, 0);
  a1.rotation.set(-0.35, 0, 0);
  a1.add(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.34, 12), metal, [0, 0.17, 0]));
  a1.add(mesh(new THREE.SphereGeometry(0.014, 16, 12), metal, [0, 0, 0]));
  const a2 = new THREE.Group();
  a2.position.set(0, 0.34, 0);
  a2.rotation.set(1.95, 0, 0);
  a2.add(mesh(new THREE.SphereGeometry(0.013, 16, 12), metal));
  a2.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 12), metal, [0, 0.15, 0]));
  const head = new THREE.Group();
  head.position.set(0, 0.3, 0);
  head.rotation.set(-2.12, 0, 0);
  const shadePts = [new THREE.Vector2(0.018, 0.03), new THREE.Vector2(0.03, 0.0), new THREE.Vector2(0.06, -0.06), new THREE.Vector2(0.075, -0.1), new THREE.Vector2(0.073, -0.1)];
  head.add(mesh(new THREE.LatheGeometry(shadePts, 40), std(0x1f3d2b, { roughness: 0.4, side: THREE.DoubleSide, metalness: 0.3 })));
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 3 });
  head.add(mesh(new THREE.SphereGeometry(0.022, 20, 14), bulbMat, [0, -0.045, 0], null, { cast: false }));
  const spot = new THREE.SpotLight(0xffd6a0, 3.2, 3.2, 0.95, 0.65, 1.6);
  spot.position.set(0, -0.05, 0);
  head.add(spot);
  const tgt = new THREE.Object3D();
  tgt.position.set(0, -1, 0);
  head.add(tgt);
  spot.target = tgt;
  a2.add(head);
  a1.add(a2);
  g.add(a1);
  g.position.set(-0.76, DESK_Y, -0.27);
  g.rotation.y = 0.75;
  shadowAll(g);
  g.traverse((o) => { if (o.isMesh && o.material === bulbMat) o.castShadow = false; });
  scene.add(prop('lamp', g));
  parts.lamp = { light: spot, bulb: bulbMat, on: true, intensity: spot.intensity };
}

/* ---------------- dive mask ---------------- */
// A low-volume two-lens mask: a curved hard frame, tempered-glass lenses, and a soft silicone skirt lofted
// from the frame outline (flaring out, then curling back in to the face seal), plus buckles and a ribbed
// strap lying on the desk. Built facing +z, then laid lens-up.
function maskOutline() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.046);
  s.quadraticCurveTo(0.045, 0.054, 0.078, 0.042);
  s.quadraticCurveTo(0.093, 0.03, 0.089, 0.0);
  s.quadraticCurveTo(0.086, -0.032, 0.06, -0.037);
  s.quadraticCurveTo(0.036, -0.041, 0.023, -0.031);
  s.quadraticCurveTo(0.014, -0.058, 0.0, -0.058);
  s.quadraticCurveTo(-0.014, -0.058, -0.023, -0.031);
  s.quadraticCurveTo(-0.036, -0.041, -0.06, -0.037);
  s.quadraticCurveTo(-0.086, -0.032, -0.089, 0.0);
  s.quadraticCurveTo(-0.093, 0.03, -0.078, 0.042);
  s.quadraticCurveTo(-0.045, 0.054, 0, 0.046);
  return s;
}
const maskBend = (x) => -1.7 * x * x;   // wraps the mask around the face
function bendZ(geo) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + maskBend(p.getX(i)));
  geo.computeVertexNormals();
  return geo;
}

function maskSkirtGeometry() {
  const N = 140;
  const base = maskOutline().getSpacedPoints(N).slice(0, N);
  const cy = -0.004;
  // [z, scale]: out from the frame, flare, round over, then curl back in to make the face seal lip.
  const rings = [[0.003, 0.965], [-0.004, 1.0], [-0.014, 1.06], [-0.027, 1.11], [-0.039, 1.125], [-0.048, 1.1], [-0.053, 1.04], [-0.052, 0.96], [-0.046, 0.91], [-0.04, 0.9]];
  const pos = [], uv = [], idx = [];
  rings.forEach(([z, k], r) => {
    base.forEach((pt, i) => {
      // The nose pocket bulges further down and back.
      const nose = Math.max(0, 1 - Math.abs(pt.x) / 0.03) * (pt.y < -0.02 ? 1 : 0);
      const x = pt.x * k, y = cy + (pt.y - cy) * k - nose * 0.008 * (r / rings.length);
      pos.push(x, y, z + maskBend(x) - nose * 0.006 * (r / rings.length));
      uv.push(i / N, r / (rings.length - 1));
    });
  });
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < N; i++) {
      const a = r * N + i, b = r * N + ((i + 1) % N), c = a + N, d = b + N;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A flat band following a curve (for the strap), with real thickness.
function ribbonGeometry(points, width, thick) {
  const curve = new THREE.CatmullRomCurve3(points);
  const n = 90;
  const pos = [], uv = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(up, tan).normalize().multiplyScalar(width / 2);
    const nrm = new THREE.Vector3().crossVectors(tan, side).normalize().multiplyScalar(thick);
    [[1, 1], [-1, 1], [-1, 0], [1, 0]].forEach(([sx, top]) => {
      const q = p.clone().addScaledVector(side, sx).addScaledVector(nrm, top);
      pos.push(q.x, q.y, q.z);
      uv.push(t * 8, sx > 0 ? 1 : 0);
    });
  }
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) {
      const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = a + 4, d = b + 4;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function strapBump() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 8) {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(x, 6, 4, 52);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function buildMask(scene) {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x0fa3b8, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const siliconeMat = new THREE.MeshPhysicalMaterial({ color: 0x141619, roughness: 0.42, sheen: 0.4, sheenColor: new THREE.Color(0x667788), side: THREE.DoubleSide });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xcfeefe, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.32, clearcoat: 1, envMapIntensity: 4, depthWrite: false });
  const rimMat = std(0x0b0c0e, { roughness: 0.35 });

  const lens = (sx, path) => roundedRect(0.064, 0.058, 0.02, sx * 0.041, 0.006, path);
  const frameShape = maskOutline();
  frameShape.holes.push(lens(-1, new THREE.Path()), lens(1, new THREE.Path()));
  const frame = new THREE.ExtrudeGeometry(frameShape, { depth: 0.009, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0035, bevelSegments: 4, curveSegments: 24 });
  g.add(mesh(bendZ(frame), frameMat));
  // Thin black retainer rings around each lens.
  [-1, 1].forEach((sx) => {
    const ring = roundedRect(0.07, 0.064, 0.023, sx * 0.041, 0.006);
    ring.holes.push(lens(sx, new THREE.Path()));
    const rg = new THREE.ExtrudeGeometry(ring, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 20 });
    rg.translate(0, 0, 0.013);
    g.add(mesh(bendZ(rg), rimMat));
    const glass = new THREE.ShapeGeometry(lens(sx), 20);
    glass.translate(0, 0, 0.007);
    const gm = mesh(bendZ(glass), glassMat, null, null, { cast: false });
    gm.renderOrder = 2;
    g.add(gm);
  });
  g.add(mesh(maskSkirtGeometry(), siliconeMat));
  // Buckles on the sides.
  [-1, 1].forEach((sx) => {
    const bk = new THREE.Group();
    bk.add(mesh(rbox(0.016, 0.026, 0.014, 0.004), std(0x15171a, { roughness: 0.4 })));
    bk.add(mesh(rbox(0.006, 0.018, 0.016, 0.002), frameMat, [sx * 0.006, 0, 0]));
    bk.position.set(sx * 0.098, 0.003, -0.016 + maskBend(0.098));
    bk.rotation.y = sx * 0.35;
    g.add(bk);
  });
  g.rotation.set(-1.25, 0, 0);

  const holder = new THREE.Group();
  holder.add(g);
  // Strap: from one buckle, around behind the mask on the desk, to the other.
  holder.updateMatrixWorld(true);
  const bl = new THREE.Vector3(-0.1, 0.003, -0.02 + maskBend(0.1)).applyMatrix4(g.matrix);
  const br = new THREE.Vector3(0.1, 0.003, -0.02 + maskBend(0.1)).applyMatrix4(g.matrix);
  const floor = Math.min(bl.y, br.y) - 0.03;
  const strapPts = [
    bl, new THREE.Vector3(bl.x - 0.03, floor + 0.004, bl.z - 0.02), new THREE.Vector3(-0.1, floor, -0.1),
    new THREE.Vector3(0, floor, -0.14), new THREE.Vector3(0.1, floor, -0.1),
    new THREE.Vector3(br.x + 0.03, floor + 0.004, br.z - 0.02), br
  ];
  const bump = strapBump();
  holder.add(mesh(ribbonGeometry(strapPts, 0.02, 0.0025), new THREE.MeshPhysicalMaterial({ color: 0x141619, roughness: 0.5, bumpMap: bump, bumpScale: 1.5, sheen: 0.3, side: THREE.DoubleSide })));
  holder.rotation.y = 0.35;
  holder.position.set(-0.3, DESK_Y, 0.02);
  shadowAll(holder);
  holder.traverse((o) => { if (o.isMesh && o.material === glassMat) o.castShadow = false; });
  restOn(holder);
  scene.add(prop('mask', holder));
}

/* ---------------- wrestling headgear (stand-in) ---------------- */
function buildHeadgear(scene) {
  const g = new THREE.Group();
  const shellMat = std(0x0b2a8a, { roughness: 0.32 });
  const strapMat = std(0x121316, { roughness: 0.7 });
  const pts = [new THREE.Vector2(0, 0.03), new THREE.Vector2(0.026, 0.027), new THREE.Vector2(0.044, 0.018), new THREE.Vector2(0.054, 0.006), new THREE.Vector2(0.057, 0)];
  const cupGeo = new THREE.LatheGeometry(pts, 36);
  const ventMat = std(0x050608, { roughness: 0.8 });
  [-1, 1].forEach((sx) => {
    const cup = new THREE.Group();
    cup.add(mesh(cupGeo, shellMat));
    cup.add(mesh(new THREE.TorusGeometry(0.052, 0.009, 10, 36), std(0x2a2d33, { roughness: 0.9 }), [0, -0.004, 0], [Math.PI / 2, 0, 0]));
    // Vent holes around the dome, each turned to face along the surface normal.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const v = mesh(new THREE.CircleGeometry(0.006, 12), ventMat, [Math.cos(a) * 0.025, 0.0272, Math.sin(a) * 0.025], null, { cast: false });
      v.scale.set(1, 1.6, 1);
      v.lookAt(Math.cos(a) * 0.045, 0.06, Math.sin(a) * 0.045);
      cup.add(v);
    }
    cup.add(mesh(new THREE.CircleGeometry(0.008, 16), ventMat, [0, 0.0302, 0], [-Math.PI / 2, 0, 0], { cast: false }));
    cup.rotation.z = -sx * Math.PI / 2;
    cup.position.set(sx * 0.085, 0, 0);
    g.add(cup);
  });
  // Straps are tori flattened into wide bands.
  const strap = (radius, rx, arc = Math.PI) => {
    const geo = new THREE.TorusGeometry(radius, 0.004, 6, 40, arc);
    geo.scale(1, 1, 4.5);
    return mesh(geo, strapMat, null, [rx, 0, 0]);
  };
  g.add(strap(0.085, 0));
  g.add(strap(0.085, -0.9));
  const chin = mesh(new THREE.TorusGeometry(0.085, 0.004, 6, 40, Math.PI), strapMat, null, [Math.PI + 0.75, 0, 0]);
  chin.geometry.scale(1, 1, 3.5);
  g.add(chin);
  g.rotation.set(0, Math.PI / 2 - 0.55, 0.05);
  const holder = new THREE.Group();
  holder.add(g);
  holder.position.set(0.71, DESK_Y, -0.2);
  shadowAll(holder);
  restOn(holder);
  scene.add(prop('headgear', holder));
}

/* ---------------- track spikes ---------------- */
// Each shoe's upper is a lofted surface: cross-sections (a squarish arch) swept from heel to toe, with
// width, height and toe spring varying smoothly. u runs heel -> toe, v runs lateral edge -> top -> medial edge.
const SHOE_L = 0.27;

// Smooth (cosine) interpolation through [u, value] control points.
function curve1D(pts, u) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, a] = pts[i], [u1, b] = pts[i + 1];
    if (u <= u1) {
      const t = (u - u0) / (u1 - u0);
      return a + (b - a) * (1 - Math.cos(Math.PI * t)) / 2;
    }
  }
  return pts[pts.length - 1][1];
}
const SHOE_HW = [[0, 0.031], [0.12, 0.034], [0.35, 0.03], [0.62, 0.045], [0.8, 0.043], [0.93, 0.031], [1, 0.016]];
const SHOE_HT = [[0, 0.074], [0.1, 0.07], [0.2, 0.06], [0.33, 0.064], [0.45, 0.058], [0.6, 0.048], [0.75, 0.036], [0.9, 0.025], [1, 0.014]];
const COLLAR = { u: 0.16, ru: 0.15, rv: 0.2 };

function shoeToeSpring(u) { return u > 0.72 ? 0.014 * ((u - 0.72) / 0.28) ** 2 : 0; }

function shoePoint(u, v, target = new THREE.Vector3()) {
  const heel = Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, u / 0.06)) ** 2));
  const toe = Math.sqrt(Math.max(0, 1 - Math.max(0, (u - 0.88) / 0.12) ** 2));
  const hw = curve1D(SHOE_HW, u) * heel * toe;
  const ht = curve1D(SHOE_HT, u) * toe;
  const th = v * Math.PI, c = Math.cos(th), sn = Math.sin(th);
  let y = shoeToeSpring(u) + ht * Math.pow(sn, 0.75);
  // Sink the collar so the opening reads as a real hole with a padded rim.
  const du = (u - COLLAR.u) / COLLAR.ru, dv = (v - 0.5) / COLLAR.rv;
  const d2 = du * du + dv * dv;
  if (d2 < 1) y -= 0.032 * (1 - d2) ** 1.5;
  else if (d2 < 1.6) y += 0.0025 * Math.sin(((d2 - 1) / 0.6) * Math.PI);
  return target.set(-SHOE_L / 2 + u * SHOE_L, y, hw * Math.sign(c) * Math.pow(Math.abs(c), 0.55));
}

function shoeUpperGeometry(segU = 72, segV = 32) {
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= segU; i++) {
    for (let j = 0; j <= segV; j++) {
      const u = i / segU, v = j / segV;
      shoePoint(u, v, p);
      pos.push(p.x, p.y, p.z);
      uv.push(u, v);
    }
  }
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j, b = a + segV + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Knit upper: colour map (volt with black stripes, heel counter, collar, eyelets) plus a knit bump map,
// both in the upper's (u, v) space.
function shoeTextures() {
  const W = 1024, H = 512;
  const col = document.createElement('canvas');
  col.width = W; col.height = H;
  const c = col.getContext('2d');
  c.fillStyle = '#c4ea12';
  c.fillRect(0, 0, W, H);
  // Darker toe cap and heel counter.
  c.fillStyle = 'rgba(30,32,36,0.9)';
  c.fillRect(0, 0, W * 0.1, H);
  c.fillStyle = 'rgba(160,190,20,0.55)';
  c.fillRect(W * 0.86, 0, W * 0.14, H);
  // Bold stripes on both sides (mirrored in v).
  c.fillStyle = '#16181c';
  [[0.06, 0.42], [0.58, 0.94]].forEach(([v0, v1]) => {
    c.beginPath();
    c.moveTo(W * 0.36, H * v0); c.lineTo(W * 0.44, H * v0); c.lineTo(W * 0.62, H * v1); c.lineTo(W * 0.54, H * v1);
    c.fill();
    c.beginPath();
    c.moveTo(W * 0.47, H * v0); c.lineTo(W * 0.5, H * v0); c.lineTo(W * 0.68, H * v1); c.lineTo(W * 0.65, H * v1);
    c.fill();
  });
  // Tongue panel under the laces.
  c.fillStyle = '#e6f56a';
  c.fillRect(W * 0.3, H * 0.4, W * 0.36, H * 0.2);
  // Collar opening and padded lining.
  c.fillStyle = '#2a2d33';
  c.beginPath();
  c.ellipse(W * COLLAR.u, H * 0.5, W * COLLAR.ru * 1.12, H * COLLAR.rv * 1.12, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0b0c0e';
  c.beginPath();
  c.ellipse(W * COLLAR.u, H * 0.5, W * COLLAR.ru * 0.9, H * COLLAR.rv * 0.9, 0, 0, Math.PI * 2);
  c.fill();
  // Eyelets.
  c.fillStyle = '#111';
  for (let u = 0.36; u <= 0.63; u += 0.054) [0.36, 0.64].forEach((v) => { c.beginPath(); c.arc(W * u, H * v, 5, 0, Math.PI * 2); c.fill(); });
  // Bottom edge where the upper meets the midsole.
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(0, 0, W, 6);
  c.fillRect(0, H - 6, W, 6);

  const bump = document.createElement('canvas');
  bump.width = W; bump.height = H;
  const b = bump.getContext('2d');
  b.fillStyle = '#808080';
  b.fillRect(0, 0, W, H);
  // Knit: staggered rows of little "v" stitches, about 3mm each on the shoe.
  b.lineWidth = 3;
  for (let y = 0; y < H; y += 12) {
    for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) {
      b.strokeStyle = '#c4c4c4';
      b.beginPath();
      b.moveTo(x + 1, y + 2); b.lineTo(x + 6, y + 9); b.lineTo(x + 11, y + 2);
      b.stroke();
      b.fillStyle = '#505050';
      b.fillRect(x + 5, y + 10, 2, 2);
    }
  }
  // Stripes are smooth overlays, slightly raised.
  b.fillStyle = 'rgba(200,200,200,0.7)';
  [[0.06, 0.42], [0.58, 0.94]].forEach(([v0, v1]) => {
    b.beginPath();
    b.moveTo(W * 0.36, H * v0); b.lineTo(W * 0.44, H * v0); b.lineTo(W * 0.62, H * v1); b.lineTo(W * 0.54, H * v1);
    b.fill();
  });
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = 8;
  return { map, bumpMap };
}

// Top-down outline of a sole: round heel, narrow arch, wide forefoot, pointed toe. Shape-y is the shoe's width.
function footprintShape(scale = 1) {
  const s = new THREE.Shape();
  const k = scale;
  s.moveTo(-0.137 * k, 0);
  s.quadraticCurveTo(-0.139 * k, 0.034 * k, -0.1 * k, 0.036 * k);
  s.quadraticCurveTo(-0.04 * k, 0.031 * k, 0.03 * k, 0.047 * k);
  s.quadraticCurveTo(0.11 * k, 0.05 * k, 0.138 * k, 0.012 * k);
  s.quadraticCurveTo(0.146 * k, 0.0, 0.138 * k, -0.012 * k);
  s.quadraticCurveTo(0.1 * k, -0.047 * k, 0.03 * k, -0.046 * k);
  s.quadraticCurveTo(-0.04 * k, -0.033 * k, -0.1 * k, -0.035 * k);
  s.quadraticCurveTo(-0.139 * k, -0.034 * k, -0.137 * k, 0);
  return s;
}

// Bend a sole-like geometry up at the toe to match the upper's toe spring.
function applyToeSpring(geo) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + SHOE_L / 2) / SHOE_L;
    p.setY(i, p.getY(i) + shoeToeSpring(Math.min(1, Math.max(0, u))));
  }
  geo.computeVertexNormals();
  return geo;
}

function buildSpikes(scene) {
  const holder = new THREE.Group();
  const tex = shoeTextures();
  const upperMat = new THREE.MeshPhysicalMaterial({ map: tex.map, bumpMap: tex.bumpMap, bumpScale: 0.9, roughness: 0.82, sheen: 0.25, sheenColor: new THREE.Color(0xf4ffb0), sheenRoughness: 0.7, side: THREE.DoubleSide });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.55 });
  const plateMat = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.25, clearcoat: 0.6 });
  const pinMat = std(0xb5bbc3, { metalness: 1, roughness: 0.25 });
  const laceMat = std(0xfafafa, { roughness: 0.75 });
  const tabMat = std(0x16181c, { roughness: 0.5 });

  const upperGeo = shoeUpperGeometry();
  const SOLE_H = 0.009;
  const soleGeo = new THREE.ExtrudeGeometry(footprintShape(1.0), { depth: SOLE_H, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelSegments: 3, curveSegments: 20, steps: 1 });
  soleGeo.rotateX(Math.PI / 2);
  soleGeo.translate(0, SOLE_H, 0);
  applyToeSpring(soleGeo);
  const plateShape = new THREE.Shape(footprintShape(0.985).getPoints(60).filter((pt) => pt.x > -0.02));
  const plateGeo = new THREE.ExtrudeGeometry(plateShape, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1 });
  plateGeo.rotateX(Math.PI / 2);
  plateGeo.translate(0, -0.0018, 0);
  applyToeSpring(plateGeo);

  // Laces criss-cross between two eyelet rows, arching over the tongue, finished with a bow.
  const laces = [];
  const us = [];
  for (let u = 0.36; u <= 0.63; u += 0.054) us.push(u);
  const P = (u, v, lift = 0) => shoePoint(u, v).add(new THREE.Vector3(0, lift, 0));
  for (let i = 0; i < us.length - 1; i++) {
    const m = (us[i] + us[i + 1]) / 2;
    [[0.36, 0.64], [0.64, 0.36]].forEach(([va, vb]) => {
      laces.push(new THREE.QuadraticBezierCurve3(P(us[i], va, 0.0015), P(m, 0.5, 0.006), P(us[i + 1], vb, 0.0015)));
    });
  }
  laces.push(new THREE.QuadraticBezierCurve3(P(us[us.length - 1], 0.36, 0.0015), P(us[us.length - 1], 0.5, 0.004), P(us[us.length - 1], 0.64, 0.0015)));
  const top = P(us[0], 0.5, 0.004);

  const make = (seed) => {
    const shoe = new THREE.Group();
    shoe.add(mesh(upperGeo, upperMat, [0, SOLE_H + 0.001, 0]));
    shoe.add(mesh(soleGeo, soleMat));
    shoe.add(mesh(plateGeo, plateMat));
    [[0.0, 0.026], [0.042, 0.03], [0.084, 0.026], [0.02, -0.026], [0.062, -0.03], [0.104, -0.022], [0.118, 0.0]].forEach(([x, z]) => {
      const u = (x + SHOE_L / 2) / SHOE_L;
      shoe.add(mesh(new THREE.ConeGeometry(0.0026, 0.007, 10), pinMat, [x, -0.0055 + shoeToeSpring(u), z], [Math.PI, 0, 0]));
    });
    const laceGroup = new THREE.Group();
    laces.forEach((c) => laceGroup.add(mesh(new THREE.TubeGeometry(c, 16, 0.0016, 6), laceMat, null, null, { cast: false })));
    // Bow: two loops and two tails at the top eyelets.
    [-1, 1].forEach((side) => {
      const loop = mesh(new THREE.TorusGeometry(0.011, 0.0016, 6, 20), laceMat, [top.x - 0.008, top.y + 0.003, top.z + side * 0.012], [Math.PI / 2 - 0.4, side * 0.5, 0], { cast: false });
      loop.scale.set(1, 0.6, 1);
      laceGroup.add(loop);
      const tail = new THREE.CatmullRomCurve3([top.clone(), top.clone().add(new THREE.Vector3(-0.015, -0.004, side * 0.02)), top.clone().add(new THREE.Vector3(-0.022, -0.016, side * 0.034))]);
      laceGroup.add(mesh(new THREE.TubeGeometry(tail, 10, 0.0016, 6), laceMat, null, null, { cast: false }));
    });
    laceGroup.position.y = SOLE_H + 0.001;
    shoe.add(laceGroup);
    // Heel pull tab.
    const hp = shoePoint(0.012, 0.5);
    shoe.add(mesh(new THREE.TorusGeometry(0.009, 0.0022, 6, 14, Math.PI), tabMat, [hp.x - 0.003, hp.y + SOLE_H - 0.004, 0], [0, Math.PI / 2, 0]));
    return shoe;
  };
  const a = make(1);
  a.position.set(0, 0.0035, -0.052);
  a.rotation.y = 0.04;
  const b = make(2);
  b.position.set(0.03, 0.0035, 0.052);
  b.rotation.y = -0.2;
  b.scale.z = -1; // the other foot
  holder.add(a, b);
  holder.position.set(-0.5, DESK_Y, -0.2);
  holder.rotation.y = 0.3;
  shadowAll(holder);
  restOn(holder);
  scene.add(prop('spikes', holder));
}

/* ---------------- power drill (stand-in) ---------------- */
function buildDrill(scene) {
  const g = new THREE.Group();
  const yellow = std(0xf2b705, { roughness: 0.4 });
  const black = std(0x17181a, { roughness: 0.6 });
  const steel = std(0x9aa0a8, { metalness: 1, roughness: 0.28 });
  const body = mesh(new THREE.CylinderGeometry(0.031, 0.034, 0.13, 28), yellow, [0, 0.135, 0], [0, 0, Math.PI / 2]);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.034, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), black, [-0.065, 0.135, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.032, 24), black, [0.08, 0.135, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.017, 0.021, 0.05, 24), std(0x2b2d31, { metalness: 0.7, roughness: 0.35 }), [0.12, 0.135, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.07, 12), steel, [0.18, 0.135, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.ConeGeometry(0.0035, 0.01, 12), steel, [0.22, 0.135, 0], [0, 0, -Math.PI / 2]));
  // Motor vents.
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.018, 0.0025, 0.063), black, [-0.04, 0.155 - i * 0.008, 0]));
  const handle = mesh(rbox(0.045, 0.12, 0.042, 0.012), yellow, [0.0, 0.07, 0], [0, 0, 0.22]);
  g.add(handle);
  g.add(mesh(rbox(0.035, 0.07, 0.044, 0.01), black, [-0.008, 0.06, 0], [0, 0, 0.22]));
  g.add(mesh(rbox(0.012, 0.03, 0.02, 0.004), black, [0.03, 0.1, 0], [0, 0, 0.3]));
  g.add(mesh(rbox(0.095, 0.045, 0.07, 0.01), black, [-0.006, 0.0, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.004, 0.072), yellow, [-0.006, 0.018, 0]));
  g.rotation.set(Math.PI / 2, 0, 0);
  const holder = new THREE.Group();
  holder.add(g);
  holder.rotation.y = 2.75;
  holder.position.set(0.7, DESK_Y, 0.29);
  shadowAll(holder);
  restOn(holder);
  scene.add(prop('drill', holder));
}

/* ---------------- lights ---------------- */
function buildLights(scene, parts) {
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x8a6a4e, 1.05));
  const key = new THREE.DirectionalLight(0xfff4e6, 0.95);
  key.position.set(0.9, 2.4, 1.6);
  key.target.position.set(0, DESK_Y, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -1.1;
  key.shadow.camera.right = 1.1;
  key.shadow.camera.top = 0.9;
  key.shadow.camera.bottom = -0.9;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 5;
  scene.add(key, key.target);

  // Late-afternoon sun, aimed through the window: a spotlight from outside whose cone just covers the
  // opening, so the wall's shadow carves out a window-shaped patch (mullions and all) on the desk.
  const { cx, cy, w, h } = WINDOW;
  const dir = new THREE.Vector3(0.95, -2.1, 1.5).normalize();
  const winC = new THREE.Vector3(cx, cy, WALL_Z);
  const dist = 3.2;
  const sun = new THREE.SpotLight(0xffc98a, 4.2, 0, Math.atan((Math.hypot(w, h) / 2 + 0.06) / dist), 0.3, 0);
  sun.position.copy(winC).addScaledVector(dir, -dist);
  sun.target.position.copy(winC).addScaledVector(dir, 1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1.5;
  sun.shadow.camera.far = 7;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  // The CRT's own glow, bright only while it's on.
  const glow = new THREE.PointLight(0x9fd0ff, 0, 1.6, 1.6);
  glow.position.set(0, DESK_Y + 0.22, 0.38);
  scene.add(glow);
  parts.screenGlow = glow;
}

/* ---------------- entry ---------------- */
export function buildScene(data) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9dcc8);
  scene.fog = new THREE.Fog(0xe9dcc8, 4.5, 12);
  const parts = {};
  buildRoom(scene, parts);
  buildPhotoString(scene, parts, data.photos || []);
  buildDesk(scene);
  buildMonitor(scene, parts);
  buildKeyboard(scene);
  buildMouse(scene, parts);
  buildTower(scene, parts);
  buildFloppies(scene);
  buildResume(scene, data.profile, data.projects);
  buildSketchbook(scene);
  buildLamp(scene, parts);
  buildMask(scene);
  buildHeadgear(scene);
  buildSpikes(scene);
  buildDrill(scene);
  buildLights(scene, parts);
  return { scene, parts };
}
