// main.js — the desk page: renders the 3D desk, maps the real HTML OS onto the CRT, and handles
// the camera (overview -> inspect a prop -> zoom into the screen).
//
// How the screen works: the OS is an <iframe> placed in 3D with CSS3DRenderer, *behind* the WebGL
// canvas. The monitor's screen mesh renders transparent pixels (NoBlending, alpha 0), punching a
// hole in the canvas so the iframe shows through at exactly the right spot and perspective.

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { buildScene, DESK_Y } from './scene.js';
import { PROPS } from './props.js';
import { loadFonts, setMaxAnisotropy } from './textures.js';

const $ = (id) => document.getElementById(id);
const sound = window.OS.sound;
const OS_W = 1024, OS_H = 768;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const params = new URLSearchParams(location.search);
const flat = params.has('flat') || (!params.has('desk') && (!webglAvailable() || window.innerWidth < 760 || window.innerHeight < 420));

if (flat) startFlat(); else start3D();

/* ---------------- phones / no WebGL: the OS full-screen ---------------- */
function startFlat() {
  document.body.classList.add('flat');
  const f = document.createElement('iframe');
  f.id = 'os-flat';
  f.src = 'os/index.html';
  f.title = 'OzalpOS 98 - Omar Ozalp\'s computer';
  document.body.appendChild(f);
  $('loader').remove();
}

/* ---------------- the desk ---------------- */
async function start3D() {
  await loadFonts();

  const canvas = $('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const { scene, parts } = buildScene({ profile: window.VFS.PROFILE, projects: window.VFS.PROJECTS });
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.01, 30);

  // CSS3D layer with the OS iframe, aligned to the screen mesh. The CSS world is the 3D world scaled
  // up (meters -> millimeters): the projection is identical, but browsers hit-test transformed iframes
  // reliably only when the element isn't a fraction of a CSS pixel from the virtual camera.
  const CSS_SCALE = 1000;
  const cssCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near * CSS_SCALE, camera.far * CSS_SCALE);
  const cssRenderer = new CSS3DRenderer({ element: $('css') });
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  const cssScene = new THREE.Scene();
  const iframe = document.createElement('iframe');
  iframe.src = 'os/index.html?embed';
  iframe.title = 'OzalpOS 98 - Omar Ozalp\'s computer';
  iframe.style.width = OS_W + 'px';
  iframe.style.height = OS_H + 'px';
  iframe.style.border = '0';
  iframe.style.background = '#000';
  iframe.tabIndex = -1;
  const cssObj = new CSS3DObject(iframe);
  iframe.style.pointerEvents = 'none';
  scene.updateMatrixWorld(true);
  const hole = parts.screen.hole;
  hole.getWorldPosition(cssObj.position).multiplyScalar(CSS_SCALE);
  hole.getWorldQuaternion(cssObj.quaternion);
  cssObj.scale.setScalar((parts.screen.width * CSS_SCALE) / OS_W);
  cssScene.add(cssObj);

  /* ---------- props + picking ---------- */
  const propGroups = {};
  const pickables = [];
  scene.traverse((o) => {
    if (o.userData.prop && PROPS[o.userData.prop]) propGroups[o.userData.prop] = o;
  });
  Object.values(propGroups).forEach((g) => g.traverse((o) => { if (o.isMesh) pickables.push(o); }));
  Object.entries(propGroups).forEach(([id, g]) => {
    g.userData.basePos = g.position.clone();
    g.userData.baseRot = g.rotation.clone();
    const mats = new Set();
    g.traverse((o) => {
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.emissive && m.emissive.getHex() === 0 && !m.userData.noGlow) mats.add(m);
      });
    });
    g.userData.glowMats = [...mats];
    const box = new THREE.Box3().setFromObject(g);
    g.userData.center = box.getCenter(new THREE.Vector3());
    g.userData.radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  });

  function propOf(obj) {
    while (obj) {
      if (obj.userData.prop && PROPS[obj.userData.prop]) return obj.userData.prop;
      obj = obj.parent;
    }
    return null;
  }

  /* ---------- camera rig ---------- */
  const cam = {
    pos: new THREE.Vector3(), target: new THREE.Vector3(),
    tween: null,
    parallax: new THREE.Vector2(), parallaxGoal: new THREE.Vector2()
  };
  const up = new THREE.Vector3(0, 1, 0);

  function hfovTan() { return Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect; }
  function vfovTan() { return Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2); }

  function overviewView() {
    const target = new THREE.Vector3(0, DESK_Y + 0.26, -0.1);
    const dir = new THREE.Vector3(0, 0.36, 1).normalize();
    const d = Math.max(0.98 / hfovTan(), 0.6 / vfovTan());
    return { pos: target.clone().addScaledVector(dir, d), target };
  }

  function screenView() {
    const c = new THREE.Vector3(), n = new THREE.Vector3(0, 0, 1);
    hole.getWorldPosition(c);
    n.applyQuaternion(hole.getWorldQuaternion(new THREE.Quaternion()));
    // Leave a strip of bezel above and below the screen for the HUD buttons, so they never cover the OS.
    const fitH = 1 - Math.min(0.3, 128 / window.innerHeight);
    const fitW = 1 - Math.min(0.1, 24 / window.innerWidth);
    const d = Math.max((parts.screen.height / 2) / (vfovTan() * fitH), (parts.screen.width / 2) / (hfovTan() * fitW));
    return { pos: c.clone().addScaledVector(n, d), target: c };
  }

  function cardSide() { return window.innerWidth >= 900 ? 'right' : 'bottom'; }

  function propView(id) {
    const g = propGroups[id];
    const v = PROPS[id].view || {};
    const c = g.userData.center.clone();
    if (PROPS[id].kind !== 'screen' && g.userData.basePos) c.y += liftFor(id);
    const dir = new THREE.Vector3(...(v.dir || [0, 0.8, 1])).normalize();
    let d = g.userData.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2) * (v.zoom || 1.3);
    if (camera.aspect < 1) d /= Math.max(0.55, camera.aspect);
    const fwd = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    const camUp = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const shift = new THREE.Vector3();
    // Keep the object clear of the info card.
    if (cardSide() === 'right') shift.addScaledVector(right, d * hfovTan() * 0.32);
    else shift.addScaledVector(camUp, -d * vfovTan() * 0.4);
    const target = c.add(shift);
    return { pos: target.clone().addScaledVector(dir, d), target };
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function flyTo(view, dur = 1.1, done) {
    if (reduceMotion) dur = 0.01;
    cam.tween = {
      fromPos: camera.position.clone(), fromTarget: cam.target.clone(),
      toPos: view.pos.clone(), toTarget: view.target.clone(),
      t: 0, dur, done
    };
    dirty = true;
  }

  function snapTo(view) {
    cam.tween = null;
    cam.pos.copy(view.pos);
    cam.target.copy(view.target);
    camera.position.copy(view.pos);
    camera.lookAt(view.target);
    dirty = true;
  }

  /* ---------- state ---------- */
  let mode = 'intro';       // intro | overview | prop | screen
  let focused = null;       // prop id
  let osState = 'off';
  let osReady = false;
  let dirty = true;
  let hovered = null;
  let interacted = false;

  function setMode(m) {
    mode = m;
    document.body.dataset.mode = m;
    $('back').hidden = m === 'overview' || m === 'intro';
    iframe.style.pointerEvents = 'none';
    setHover(null);
  }

  function goOverview() {
    if (mode === 'screen') post({ type: 'blur' });
    unfocusProp();
    hideCard();
    setMode('overview');
    try { window.focus(); } catch (e) {}
    flyTo(overviewView(), 1.0);
  }

  function goScreen() {
    unfocusProp();
    hideCard();
    hint(null);
    setMode('screen');
    if (osState === 'off') powerOn();
    sound.play('whoosh');
    flyTo(screenView(), 1.15, () => {
      if (mode !== 'screen') return;
      iframe.style.pointerEvents = 'auto';
      iframe.focus();
      post({ type: 'focus' });
      document.body.classList.add('screen-ready');
      setTimeout(() => document.body.classList.remove('screen-ready'), 2600);
    });
  }

  function focusProp(id) {
    const def = PROPS[id];
    if (!def) return;
    if (def.kind === 'screen') { goScreen(); return; }
    if (def.kind === 'toggle') { toggleLamp(); return; }
    unfocusProp();
    focused = id;
    hint(null);
    setMode('prop');
    sound.play('pick');
    flyTo(propView(id), 1.0);
    showCard(id);
  }

  function unfocusProp() { focused = null; }

  function liftFor(id) { return id === 'pennant' ? 0 : 0.03; }

  /* ---------- OS bridge ---------- */
  // Messages sent before the OS has finished loading are queued and delivered on 'ready'.
  let osLive = false;
  const pending = [];
  function post(msg) {
    msg.ozalp = true;
    if (!osLive) { pending.push(msg); return; }
    try { iframe.contentWindow.postMessage(msg, location.origin); } catch (e) {}
  }

  function powerOn() {
    sound.play('power');
    setTimeout(() => sound.play('degauss'), 120);
    post({ type: 'power', on: true });
  }

  function togglePower() {
    if (osState === 'off') powerOn();
    else { sound.play('power'); post({ type: 'power', on: false }); if (mode === 'screen') goOverview(); }
  }

  function openOnPC(app) {
    goScreen();
    post({ type: 'open', app });
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || !e.data.ozalp) return;
    const d = e.data;
    if (d.type === 'ready') {
      osReady = osLive = true;
      pending.splice(0).forEach(post);
      maybeReveal();
    }
    else if (d.type === 'state') osState = d.state;
    else if (d.type === 'exit' && mode === 'screen') goOverview();
    else if (d.type === 'shutdown' && mode === 'screen') goOverview();
  });

  /* ---------- lamp ---------- */
  function toggleLamp() {
    const L = parts.lamp;
    L.on = !L.on;
    sound.play('click');
    L.light.intensity = L.on ? 5.5 : 0;
    L.bulb.emissiveIntensity = L.on ? 3 : 0;
    dirty = true;
  }

  /* ---------- UI: card, tooltip, hints ---------- */
  const card = $('card');
  function showCard(id) {
    const def = PROPS[id];
    card.querySelector('.card-kicker').textContent = def.kicker || '';
    card.querySelector('.card-title').textContent = def.title || def.name;
    const body = card.querySelector('.card-body');
    body.innerHTML = '';
    (def.body || []).forEach((p) => {
      const el = document.createElement('p');
      el.textContent = p;
      body.appendChild(el);
    });
    const acts = card.querySelector('.card-actions');
    acts.innerHTML = '';
    (def.actions || []).forEach((a, i) => {
      const b = document.createElement(a.url ? 'a' : 'button');
      b.className = 'card-btn' + (i === 0 ? ' primary' : '');
      b.textContent = a.label + (a.url && !a.url.startsWith('mailto:') ? ' ↗' : '');
      if (a.url) {
        b.href = a.url;
        if (!a.url.startsWith('mailto:')) { b.target = '_blank'; b.rel = 'noopener'; }
      } else b.addEventListener('click', () => openOnPC(a.app));
      acts.appendChild(b);
    });
    card.dataset.side = cardSide();
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add('open'));
  }
  function hideCard() {
    card.classList.remove('open');
    card.hidden = true;
  }
  card.querySelector('.card-close').addEventListener('click', goOverview);

  const tooltip = $('tooltip');
  function setHover(id) {
    if (hovered === id) return;
    if (hovered) glow(hovered, false);
    hovered = id;
    if (id && id !== focused) glow(id, true);
    $('stage').style.cursor = id ? 'pointer' : '';
    tooltip.hidden = !id;
    if (id) tooltip.textContent = PROPS[id].name + (PROPS[id].hint ? ' — ' + PROPS[id].hint : '');
    dirty = true;
  }
  function glow(id, on) {
    (propGroups[id].userData.glowMats || []).forEach((m) => {
      m.emissive.setHex(on ? 0x2b2216 : 0x000000);
    });
  }

  let hintTimer = null;
  function hint(text) {
    const h = $('hint');
    clearTimeout(hintTimer);
    if (!text) { h.classList.remove('show'); return; }
    h.textContent = text;
    h.classList.add('show');
  }

  /* ---------- pointer input ---------- */
  const ndc = new THREE.Vector2(-2, -2);
  let pointerDirty = false;
  let down = null;
  const raycaster = new THREE.Raycaster();
  const stage = $('stage');

  function pick(clientX, clientY) {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (!hit) return null;
    return { id: propOf(hit.object), part: hit.object.userData.part };
  }

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      tooltip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 16}px)`;
      cam.parallaxGoal.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerDirty = e.pointerType === 'mouse';
  });
  stage.addEventListener('pointerleave', () => { setHover(null); cam.parallaxGoal.set(0, 0); });
  stage.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  stage.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 700;
    down = null;
    if (moved > 8 || !quick || mode === 'intro' || cam.tween) return;
    const hit = pick(e.clientX, e.clientY);
    markInteracted();
    if (mode === 'screen') { if (!hit || hit.id !== 'computer') goOverview(); return; }
    if (hit && hit.part === 'power') { togglePower(); return; }
    if (hit && hit.id) {
      if (hit.id === focused) return;
      focusProp(hit.id);
    } else if (mode === 'prop') goOverview();
  });

  function markInteracted() {
    if (interacted) return;
    interacted = true;
    hint(null);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode !== 'overview' && mode !== 'intro') goOverview();
  });
  $('back').addEventListener('click', goOverview);

  // Keyboard / screen-reader navigation for every prop.
  const nav = $('prop-nav');
  const navOrder = ['computer', 'resume', 'mask', 'headgear', 'spikes', 'sketchbook', 'drill', 'mouse', 'floppies', 'pennant', 'mug', 'lamp'];
  navOrder.forEach((id) => {
    const b = document.createElement('button');
    b.textContent = id === 'computer' ? 'Use the computer' : (PROPS[id].kind === 'toggle' ? 'Toggle the desk lamp' : 'Inspect: ' + PROPS[id].name);
    b.addEventListener('click', () => { markInteracted(); focusProp(id); });
    nav.appendChild(b);
  });

  /* ---------- mute ---------- */
  function paintMute() {
    const m = sound.isMuted();
    $('mute').setAttribute('aria-label', m ? 'Unmute' : 'Mute');
    $('mute').classList.toggle('muted', m);
  }
  $('mute').addEventListener('click', () => { sound.toggle(); });
  sound.onChange(paintMute);
  paintMute();

  /* ---------- resize ---------- */
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    cssRenderer.setSize(w, h);
    camera.aspect = cssCamera.aspect = w / h;
    camera.updateProjectionMatrix();
    cssCamera.updateProjectionMatrix();
    if (mode === 'screen') snapTo(screenView());
    else if (mode === 'prop' && focused) { snapTo(propView(focused)); card.dataset.side = cardSide(); }
    else if (mode === 'overview') snapTo(overviewView());
    dirty = true;
  }
  window.addEventListener('resize', onResize);

  /* ---------- reveal ---------- */
  let sceneReady = false;
  function maybeReveal() {
    if (!sceneReady || !osReady || mode !== 'intro' || revealed) return;
    revealed = true;
    $('loader').classList.add('done');
    setTimeout(() => $('loader').remove(), 900);
    const end = overviewView();
    const start = { pos: end.pos.clone().add(new THREE.Vector3(0.25, 0.55, 1.4)), target: end.target.clone().add(new THREE.Vector3(0, 0.1, 0)) };
    snapTo(start);
    flyTo(end, params.has('nointro') ? 0.01 : 2.6, () => {
      setMode('overview');
      if (!interacted) hint('Click the monitor to power it on · click anything on the desk to pick it up');
    });
  }
  let revealed = false;
  // If the iframe is slow to report in, reveal anyway.
  setTimeout(() => { osReady = true; maybeReveal(); }, 4000);

  /* ---------- loop ---------- */
  let lastT = performance.now();
  let elapsed = 0;
  const lastCam = new THREE.Matrix4();
  let offOpacity = parts.screen.off.material.opacity;
  let glowLevel = 0;

  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    const rawDt = Math.min((now - lastT) / 1000, 0.5);
    const dt = Math.min(rawDt, 0.05);
    lastT = now;
    elapsed += dt;
    const t = elapsed;

    // Camera tween + parallax.
    if (cam.tween) {
      const tw = cam.tween;
      tw.t = Math.min(1, tw.t + rawDt / tw.dur);
      const k = ease(tw.t);
      cam.pos.lerpVectors(tw.fromPos, tw.toPos, k);
      cam.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      if (tw.t >= 1) {
        cam.tween = null;
        if (tw.done) tw.done();
      }
    }
    const allowParallax = !reduceMotion && (mode === 'overview' || mode === 'prop') && !cam.tween;
    cam.parallax.lerp(allowParallax ? cam.parallaxGoal : new THREE.Vector2(), 1 - Math.pow(0.002, dt));
    camera.position.copy(cam.pos);
    if (mode !== 'screen' || cam.tween) {
      const s = mode === 'prop' ? 0.012 : 0.05;
      camera.position.x += cam.parallax.x * s;
      camera.position.y -= cam.parallax.y * s * 0.6;
    }
    camera.lookAt(cam.target);

    // Lift the focused prop off the desk with a slow bob.
    Object.entries(propGroups).forEach(([id, g]) => {
      if (PROPS[id].kind === 'screen' || PROPS[id].kind === 'toggle') return;
      const goal = id === focused ? liftFor(id) + Math.sin(t * 1.6) * 0.004 : 0;
      const yaw = id === focused && id !== 'pennant' ? Math.sin(t * 0.8) * 0.12 : 0;
      const by = g.userData.basePos.y;
      const ny = THREE.MathUtils.damp(g.position.y, by + goal, 6, dt);
      const nr = THREE.MathUtils.damp(g.rotation.y, g.userData.baseRot.y + yaw, 4, dt);
      if (Math.abs(ny - g.position.y) > 1e-5 || Math.abs(nr - g.rotation.y) > 1e-5) {
        g.position.y = ny;
        g.rotation.y = nr;
        dirty = true;
      }
    });

    // Power visuals: LEDs, screen tint and the CRT glow.
    const on = osState !== 'off';
    const targetOff = on ? 0 : 0.92;
    if (Math.abs(offOpacity - targetOff) > 0.001) {
      offOpacity = THREE.MathUtils.damp(offOpacity, targetOff, on ? 5 : 3, dt);
      parts.screen.off.material.opacity = offOpacity;
      dirty = true;
    }
    const glowGoal = !on ? 0 : osState === 'desktop' ? 0.6 : 0.25;
    if (Math.abs(glowLevel - glowGoal) > 0.002) {
      glowLevel = THREE.MathUtils.damp(glowLevel, glowGoal, 3, dt);
      parts.screenGlow.intensity = glowLevel;
      dirty = true;
    }
    // Ease the CRT glass effect back while actually using the computer, so the OS stays legible.
    const glassGoal = mode === 'screen' && !cam.tween ? 0.4 : 1;
    const gm = parts.screen.glass.material;
    if (Math.abs(gm.opacity - glassGoal) > 0.005) {
      gm.opacity = THREE.MathUtils.damp(gm.opacity, glassGoal, 4, dt);
      dirty = true;
    }
    parts.monitorLed.emissive.setHex(on ? 0x33ff55 : 0xffa000);
    parts.powerLed.emissiveIntensity = on ? 1.5 : 0;
    parts.hddLed.emissiveIntensity = (osState === 'bios' || osState === 'splash') && Math.random() < 0.5 ? 2 : 0;

    // RGB mouse.
    if (mode !== 'screen') {
      parts.rgb.emissive.setHSL((t * 0.08) % 1, 1, 0.5);
      dirty = true;
    }

    // Hover picking (mouse only, not while flying or using the screen).
    if (pointerDirty && !cam.tween && (mode === 'overview' || mode === 'prop')) {
      pointerDirty = false;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      setHover(hit ? propOf(hit.object) : null);
    }

    if (dirty || cam.tween || mode !== 'screen') {
      renderer.render(scene, camera);
      dirty = false;
    }
    camera.updateMatrixWorld();
    if (!lastCam.equals(camera.matrixWorld) || cam.tween) {
      cssCamera.position.copy(camera.position).multiplyScalar(CSS_SCALE);
      cssCamera.quaternion.copy(camera.quaternion);
      cssCamera.updateMatrixWorld();
      cssRenderer.render(cssScene, cssCamera);
      lastCam.copy(camera.matrixWorld);
    }
  }

  snapTo(overviewView());
  sceneReady = true;
  frame();
  maybeReveal();

  // Debug hooks for automated screenshots.
  window.__desk = { focusProp, goScreen, goOverview, togglePower, props: () => Object.fromEntries(Object.entries(propGroups).map(([k, g]) => [k, { c: g.userData.center.toArray().map((v) => +v.toFixed(3)), r: +g.userData.radius.toFixed(3) }])), get mode() { return mode; }, get osState() { return osState; } };
}
