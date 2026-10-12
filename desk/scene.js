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
function buildRoom(scene, parts) {
  const wallZ = -0.55;
  const floor = mesh(new THREE.PlaneGeometry(10, 10), std(0xffffff, { map: TX.floorTexture(), roughness: 0.85 }), [0, 0, 0], [-Math.PI / 2, 0, 0], { cast: false });
  scene.add(floor);

  const wallMat = std(0xffffff, { map: TX.wallTexture(), roughness: 0.92 });
  scene.add(mesh(new THREE.PlaneGeometry(8, 3.2), wallMat, [0, 1.6, wallZ], null, { cast: false }));
  scene.add(mesh(new THREE.PlaneGeometry(4, 3.2), wallMat, [-2.4, 1.6, 1.0], [0, Math.PI / 2, 0], { cast: false }));
  scene.add(mesh(new THREE.BoxGeometry(8, 0.1, 0.02), std(0x2a2724, { roughness: 0.6 }), [0, 0.05, wallZ + 0.01]));

  // Window with blinds, on the left of the back wall.
  const win = new THREE.Group();
  const frameMat = std(0xe8e4da, { roughness: 0.6 });
  const W = 0.78, H = 0.66, cx = -0.95, cy = 1.42;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: TX.skylineTexture() }));
  sky.position.set(cx, cy, wallZ + 0.002);
  win.add(sky);
  [[cx, cy + H / 2 + 0.02, W + 0.08, 0.04], [cx, cy - H / 2 - 0.02, W + 0.08, 0.04]].forEach(([x, y, w, h]) => win.add(mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat, [x, y, wallZ + 0.02])));
  [[cx - W / 2 - 0.02], [cx + W / 2 + 0.02], [cx]].forEach(([x], i) => win.add(mesh(new THREE.BoxGeometry(i === 2 ? 0.025 : 0.04, H + 0.08, i === 2 ? 0.03 : 0.05), frameMat, [x, cy, wallZ + 0.02])));
  win.add(mesh(new THREE.BoxGeometry(W + 0.16, 0.025, 0.12), frameMat, [cx, cy - H / 2 - 0.05, wallZ + 0.05]));
  const slatMat = std(0xf1ede2, { roughness: 0.7 });
  for (let i = 0; i < 9; i++) {
    win.add(mesh(new THREE.BoxGeometry(W + 0.02, 0.002, 0.03), slatMat, [cx, cy + H / 2 - 0.02 - i * 0.026, wallZ + 0.06], [0.5, 0, 0]));
  }
  win.add(mesh(new THREE.BoxGeometry(W + 0.05, 0.03, 0.04), slatMat, [cx, cy + H / 2 + 0.02, wallZ + 0.07]));
  shadowAll(win, false, true);
  scene.add(win);

  // Duke pennant.
  const pen = new THREE.Group();
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.1, 0, 0, -0.1, 0, 0.62, 0, 0], 3));
  pg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0.5], 2));
  pg.computeVertexNormals();
  pen.add(mesh(pg, std(0xffffff, { map: TX.pennantTexture(), roughness: 0.95, side: THREE.DoubleSide })));
  pen.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 10), std(0x6b4a2b), [-0.004, 0, 0.004]));
  pen.position.set(0.3, 1.5, wallZ + 0.01);
  pen.rotation.z = -0.07;
  scene.add(prop('pennant', pen));

  // Dive poster.
  const poster = new THREE.Group();
  poster.add(mesh(new THREE.BoxGeometry(0.33, 0.45, 0.015), std(0x111111, { roughness: 0.4 })));
  poster.add(mesh(new THREE.PlaneGeometry(0.3, 0.42), std(0xffffff, { map: TX.posterTexture(), roughness: 0.35 }), [0, 0, 0.0085]));
  poster.position.set(0.98, 1.38, wallZ + 0.01);
  scene.add(poster);

  parts.wallZ = wallZ;
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

/* ---------------- mug ---------------- */
function buildMug(scene) {
  const g = new THREE.Group();
  const outer = mesh(new THREE.CylinderGeometry(0.041, 0.039, 0.095, 48, 1, true), std(0xffffff, { map: TX.mugTexture(), roughness: 0.25 }), [0, 0.0475, 0]);
  g.add(outer);
  g.add(mesh(new THREE.CylinderGeometry(0.037, 0.035, 0.092, 48, 1, true), std(0xf4f2ec, { roughness: 0.25, side: THREE.BackSide }), [0, 0.049, 0]));
  g.add(mesh(new THREE.TorusGeometry(0.039, 0.0022, 8, 48), std(0xf4f2ec, { roughness: 0.25 }), [0, 0.095, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.004, 48), std(0xf4f2ec, { roughness: 0.3 }), [0, 0.002, 0]));
  g.add(mesh(new THREE.CircleGeometry(0.036, 40), std(0x2a160b, { roughness: 0.1 }), [0, 0.078, 0], [-Math.PI / 2, 0, 0]));
  const handle = mesh(new THREE.TorusGeometry(0.024, 0.0065, 12, 24, Math.PI * 1.1), std(0xf4f2ec, { roughness: 0.25 }), [0.04, 0.05, 0], [0, 0, -Math.PI * 0.55]);
  g.add(handle);
  g.position.set(-0.82, DESK_Y, 0.03);
  g.rotation.y = 2.82;
  shadowAll(g);
  scene.add(prop('mug', g));
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
  const spot = new THREE.SpotLight(0xffd6a0, 5.5, 3.2, 0.95, 0.65, 1.6);
  spot.position.set(0, -0.05, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0006;
  spot.shadow.radius = 6;
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
  parts.lamp = { light: spot, bulb: bulbMat, on: true };
}

/* ---------------- dive mask (stand-in) ---------------- */
function buildMask(scene) {
  const g = new THREE.Group();
  const outline = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.046);
    s.quadraticCurveTo(0.045, 0.054, 0.078, 0.042);
    s.quadraticCurveTo(0.092, 0.03, 0.088, 0.0);
    s.quadraticCurveTo(0.086, -0.032, 0.06, -0.036);
    s.quadraticCurveTo(0.036, -0.04, 0.024, -0.03);
    s.quadraticCurveTo(0.014, -0.056, 0.0, -0.056);
    s.quadraticCurveTo(-0.014, -0.056, -0.024, -0.03);
    s.quadraticCurveTo(-0.036, -0.04, -0.06, -0.036);
    s.quadraticCurveTo(-0.086, -0.032, -0.088, 0.0);
    s.quadraticCurveTo(-0.092, 0.03, -0.078, 0.042);
    s.quadraticCurveTo(-0.045, 0.054, 0, 0.046);
    return s;
  };
  const lens = (sx) => roundedRect(0.064, 0.058, 0.02, sx * 0.041, 0.006, new THREE.Path());
  const frameShape = outline();
  frameShape.holes.push(lens(-1), lens(1));
  const frame = new THREE.ExtrudeGeometry(frameShape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 3, curveSegments: 16 });
  g.add(mesh(frame, std(0x0f9fb4, { roughness: 0.35 })));
  const skirtShape = outline();
  const inner = outline().getPoints(40).map((p) => p.multiplyScalar(0.8));
  skirtShape.holes.push(new THREE.Path(inner.reverse()));
  const skirt = new THREE.ExtrudeGeometry(skirtShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 3, curveSegments: 16 });
  const sk = mesh(skirt, std(0x101214, { roughness: 0.55 }), [0, 0, -0.034]);
  sk.scale.set(1.04, 1.06, 1);
  g.add(sk);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.28, roughness: 0.04, metalness: 0.1, envMapIntensity: 2 });
  [-1, 1].forEach((sx) => {
    const l = mesh(new THREE.ShapeGeometry(roundedRect(0.064, 0.058, 0.02, sx * 0.041, 0.006), 12), glassMat, [0, 0, 0.006], null, { cast: false });
    g.add(l);
  });
  // Strap, looped flat on the desk behind the mask.
  const strap = mesh(new THREE.TorusGeometry(0.095, 0.0035, 6, 48, Math.PI * 1.15), std(0x101214, { roughness: 0.6 }), [0, 0, -0.03], [0, 0, Math.PI * 0.93]);
  strap.scale.set(1, 0.75, 4);
  g.add(strap);
  [-1, 1].forEach((sx) => g.add(mesh(new THREE.BoxGeometry(0.012, 0.016, 0.01), std(0x0f9fb4, { roughness: 0.35 }), [sx * 0.092, 0.002, -0.012])));
  g.rotation.set(-1.25, 0, 0);
  const holder = new THREE.Group();
  holder.add(g);
  holder.rotation.y = 0.35;
  holder.position.set(-0.32, DESK_Y, 0.0);
  shadowAll(holder);
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

/* ---------------- track spikes (stand-in) ---------------- */
function shoeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.132, 0.004);
  s.lineTo(0.118, 0.0);
  s.quadraticCurveTo(0.138, 0.002, 0.136, 0.018);
  s.quadraticCurveTo(0.13, 0.034, 0.1, 0.038);
  s.quadraticCurveTo(0.04, 0.05, -0.02, 0.07);
  s.quadraticCurveTo(-0.055, 0.064, -0.09, 0.068);
  s.quadraticCurveTo(-0.12, 0.074, -0.13, 0.082);
  s.quadraticCurveTo(-0.146, 0.05, -0.132, 0.004);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 4, curveSegments: 14 });
  geo.translate(0, 0, -0.035);
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (x + 0.14) / 0.28;                    // 0 at heel, 1 at toe
    let w = t < 0.65 ? 0.74 + 0.26 * Math.sin((t / 0.65) * Math.PI / 2) : 1 - ((t - 0.65) / 0.35) ** 1.6 * 0.55;
    w *= 1 - 0.38 * Math.max(0, (y - 0.02) / 0.07) ** 2;
    p.setZ(i, z * w);
    uv.setXY(i, t, y / 0.09);
  }
  geo.computeVertexNormals();
  return geo;
}

function shoeTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cdeb2a';
  ctx.fillRect(0, 0, 512, 256);
  // Mesh-like texture.
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < 256; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < 512; x += 6) ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = '#16181c';
  ctx.beginPath();
  ctx.moveTo(150, 30); ctx.lineTo(200, 30); ctx.lineTo(330, 230); ctx.lineTo(280, 230); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(225, 30); ctx.lineTo(250, 30); ctx.lineTo(380, 230); ctx.lineTo(355, 230); ctx.fill();
  ctx.fillRect(0, 0, 512, 26);
  ctx.fillRect(0, 0, 70, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Top-down outline of a sole: round heel, narrow arch, wide forefoot, pointed toe. Shape-y is the shoe's width.
function footprintShape(scale = 1) {
  const s = new THREE.Shape();
  const k = scale;
  s.moveTo(-0.135 * k, 0);
  s.quadraticCurveTo(-0.137 * k, 0.036 * k, -0.1 * k, 0.037 * k);
  s.quadraticCurveTo(-0.04 * k, 0.03 * k, 0.03 * k, 0.047 * k);
  s.quadraticCurveTo(0.11 * k, 0.05 * k, 0.142 * k, 0.006 * k);
  s.quadraticCurveTo(0.146 * k, -0.002 * k, 0.14 * k, -0.01 * k);
  s.quadraticCurveTo(0.1 * k, -0.046 * k, 0.03 * k, -0.045 * k);
  s.quadraticCurveTo(-0.04 * k, -0.034 * k, -0.1 * k, -0.035 * k);
  s.quadraticCurveTo(-0.137 * k, -0.034 * k, -0.135 * k, 0);
  return s;
}

function buildSpikes(scene) {
  const holder = new THREE.Group();
  const geo = shoeGeometry();
  const upper = std(0xffffff, { map: shoeTexture(), roughness: 0.6 });
  const soleMat = std(0xf2f2ee, { roughness: 0.5 });
  const plateMat = std(0x141518, { roughness: 0.35 });
  const pinMat = std(0x9aa0a8, { metalness: 1, roughness: 0.3 });
  const laceMat = std(0xffffff, { roughness: 0.8 });
  const holeMat = std(0x0c0c0e, { roughness: 0.95 });
  const soleGeo = new THREE.ExtrudeGeometry(footprintShape(1.02), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 16 });
  soleGeo.rotateX(Math.PI / 2);
  const plateShape = new THREE.Shape(footprintShape(1.0).getPoints(40).filter((p) => p.x > -0.02));
  const plateGeo = new THREE.ExtrudeGeometry(plateShape, { depth: 0.003, bevelEnabled: false });
  plateGeo.rotateX(Math.PI / 2);

  // Find points on the upper's top surface so laces and the collar sit right on it.
  const probe = new THREE.Mesh(geo);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  function surface(x) {
    ray.set(new THREE.Vector3(x, 1, 0), down);
    const h = ray.intersectObject(probe)[0];
    return h ? { p: h.point, n: h.face.normal.clone() } : null;
  }

  const make = () => {
    const shoe = new THREE.Group();
    shoe.add(mesh(soleGeo, soleMat, [0, 0.012, 0]));
    shoe.add(mesh(plateGeo, plateMat, [0, 0.0025, 0]));
    const up = mesh(geo, upper, [0, 0.011, 0]);
    up.scale.set(0.98, 1, 0.92);
    shoe.add(up);
    for (let i = 0; i < 7; i++) {
      const x = 0.0 + (i % 4) * 0.035, z = i < 4 ? 0.022 : -0.022;
      shoe.add(mesh(new THREE.ConeGeometry(0.0028, 0.008, 8), pinMat, [x + (i < 4 ? 0 : 0.017), -0.004, z * (1 - x * 3)], [Math.PI, 0, 0]));
    }
    const collar = surface(-0.088);
    if (collar) {
      const o = mesh(new THREE.CircleGeometry(1, 28), holeMat, null, null, { cast: false });
      o.position.copy(collar.p).addScaledVector(collar.n, 0.0015);
      o.position.y += 0.011;
      o.lookAt(o.position.clone().add(collar.n));
      o.scale.set(0.034, 0.021, 1);
      o.rotateZ(Math.PI / 2);
      shoe.add(o);
    }
    [-0.04, -0.02, 0.0, 0.02, 0.04].forEach((x, i) => {
      const h = surface(x);
      if (!h) return;
      const lace = mesh(new THREE.BoxGeometry(0.003, 0.0022, 0.03 - i * 0.002), laceMat, null, null, { cast: false });
      lace.position.copy(h.p).addScaledVector(h.n, 0.0012);
      lace.position.y += 0.011;
      lace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), h.n);
      lace.rotateY(i % 2 ? 0.25 : -0.25);
      shoe.add(lace);
    });
    return shoe;
  };
  const a = make();
  a.position.set(0, 0.004, -0.05);
  a.rotation.y = 0.05;
  const b = make();
  b.position.set(0.035, 0.004, 0.05);
  b.rotation.y = -0.18;
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
  scene.add(new THREE.HemisphereLight(0x9fb2d8, 0x2a1d14, 0.55));
  const key = new THREE.DirectionalLight(0xfff0dd, 1.15);
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
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.45);
  moon.position.set(-1.4, 1.6, -1.0);
  scene.add(moon);
  // The CRT's own glow, bright only while it's on.
  const glow = new THREE.PointLight(0x9fd0ff, 0, 1.6, 1.6);
  glow.position.set(0, DESK_Y + 0.22, 0.38);
  scene.add(glow);
  parts.screenGlow = glow;
}

/* ---------------- entry ---------------- */
export function buildScene(data) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c12);
  scene.fog = new THREE.Fog(0x0a0c12, 3.5, 9);
  const parts = {};
  buildRoom(scene, parts);
  buildDesk(scene);
  buildMonitor(scene, parts);
  buildKeyboard(scene);
  buildMouse(scene, parts);
  buildTower(scene, parts);
  buildFloppies(scene);
  buildResume(scene, data.profile, data.projects);
  buildSketchbook(scene);
  buildMug(scene);
  buildLamp(scene, parts);
  buildMask(scene);
  buildHeadgear(scene);
  buildSpikes(scene);
  buildDrill(scene);
  buildLights(scene, parts);
  return { scene, parts };
}
