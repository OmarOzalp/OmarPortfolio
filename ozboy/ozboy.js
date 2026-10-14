// ozboy.js — OZ BOY, the handheld phones get instead of the desk. Fits the device to the phone,
// handles picking it up and putting it down, its buttons (touch, keyboard, the phone's Back gesture)
// and every screen: a home menu, the portfolio sections, a photo album and the games.

import { iconURL, makeCanvas, drawIcon } from './pixel.js';
import { PROPS } from '../desk/props.js';

const $ = (s, el = document) => el.querySelector(s);
const sound = window.OS.sound;
const VFS = window.VFS;
const P = VFS.PROFILE;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const asset = (p) => '../' + p;
// Set to a path like 'assets/resume.pdf' once the PDF is in the repo (same switch as plain.html).
const RESUME_PDF = null;

const body = document.body;
const holder = $('#holder'), boy = $('#boy'), screenEl = $('#screen'), lcd = $('#lcd');

/* ---------------- fitting the device to the phone ---------------- */
// Portrait: 300 device-px wide, 512-660 tall; everything but the screen takes 306 px of that height.
// Landscape: 600 x 300 with the screen in the middle.
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
body.appendChild(probe);

let fitted = null;
function fit() {
  const W = innerWidth, H = innerHeight;
  const cs = getComputedStyle(probe);
  const safeT = parseFloat(cs.paddingTop) || 0, safeB = parseFloat(cs.paddingBottom) || 0;
  const land = W > H && H < 560;
  body.classList.toggle('land', land);
  let z, hd, hx, hy, lz, lcdh, restDy, restS, restDx = 0;
  if (!land) {
    const top = safeT + 56, bot = safeB + 12, avail = H - top - bot;
    z = Math.min(W - 16, 520) / 300;
    hd = avail / z;
    if (hd < 512) { z = avail / 512; hd = 512; }
    hd = Math.min(hd, 660);
    hx = (W - 300 * z) / 2;
    hy = top + (avail - hd * z) / 2;
    lz = 228 / 160;
    lcdh = Math.max(144, Math.min(240, Math.floor((hd - 306) / lz)));
    const restTop = safeT + 104, restBot = H - safeB - 168;
    restS = Math.min(0.74, (restBot - restTop) / (hd * z * 1.02));
    restDy = (restTop + restBot) / 2 - (hy + hd * z / 2);
  } else {
    z = Math.min(W / 600, (H - 16) / 300);
    hd = 300;
    hx = (W - 600 * z) / 2;
    hy = (H - 300 * z) / 2;
    lz = Math.min(256 / 160, 208 / 144);
    lcdh = Math.max(144, Math.min(240, Math.floor(208 / lz)));
    const restTop = safeT + 84, restBot = H - safeB - 100;
    restS = Math.min(0.62, (restBot - restTop) / (300 * z * 1.05));
    restDy = (restTop + restBot) / 2 - (hy + 150 * z);
    restDx = -Math.min(80, W * 0.08);
  }
  const s = document.documentElement.style;
  s.setProperty('--hx', hx + 'px');
  s.setProperty('--hy', hy + 'px');
  s.setProperty('--hw', (land ? 600 : 300) * z + 'px');
  s.setProperty('--hh', hd * z + 'px');
  s.setProperty('--rest-dy', restDy + 'px');
  s.setProperty('--rest-dx', restDx + 'px');
  s.setProperty('--rest-s', restS);
  holder.style.setProperty('--z', z);
  boy.style.setProperty('--hd', hd + 'px');
  lcd.style.setProperty('--lz', lz);
  lcd.style.setProperty('--lcdh', lcdh + 'px');
  const changed = !fitted || fitted.land !== land || fitted.lcdh !== lcdh;
  fitted = { land, z, lz, lcdh, hd };
  if (changed) paintGuts();
  return changed;
}

// The circuit board you can see through the clear plastic.
function paintGuts() {
  const w = fitted.land ? 600 : 300, h = fitted.hd;
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let o = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><rect width='100%' height='100%' fill='#0c2f3b'/>`;
  for (let i = 0; i < w * h / 2600; i++) {
    const x = r() * w, y = r() * h, dx = (r() - 0.5) * 140, dy = (r() - 0.5) * 140;
    o += `<path d='M${x | 0} ${y | 0}h${dx | 0}v${dy | 0}' stroke='#2c7a86' stroke-width='${(1 + r() * 1.5).toFixed(1)}' fill='none'/><circle cx='${(x + dx) | 0}' cy='${(y + dy) | 0}' r='2.6' fill='#d6bf78'/>`;
  }
  for (let i = 0; i < 7; i++) {
    const cw = 26 + r() * 44, ch = 14 + r() * 26, x = r() * (w - cw), y = (fitted.land ? 20 : h * 0.5) + r() * (h * (fitted.land ? 0.8 : 0.45) - ch);
    o += `<rect x='${x | 0}' y='${y | 0}' width='${cw | 0}' height='${ch | 0}' rx='2' fill='#121619'/>`;
    for (let k = 4; k < cw - 2; k += 5) o += `<rect x='${(x + k) | 0}' y='${(y - 3) | 0}' width='2' height='3' fill='#bfc3c8'/><rect x='${(x + k) | 0}' y='${(y + ch) | 0}' width='2' height='3' fill='#bfc3c8'/>`;
  }
  o += '</svg>';
  $('.guts', boy).style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(o)}")`;
}

/* ---------------- picking it up, power and boot ---------------- */
let held = false, on = false, booting = null;

function pickUp(then) {
  if (held) { if (then) then(); return; }
  held = true;
  body.classList.remove('rest');
  body.classList.add('held');
  sound.play('lift');
  // One history entry per screen deep, so the phone's Back gesture walks back through the handheld.
  for (let i = 1; i <= Math.max(1, stack.length); i++) history.pushState({ oz: i }, '');
  setTimeout(() => {
    if (!on) powerOn(then);
    else { resumeView(); if (then) then(); }
  }, reduceMotion ? 0 : 480);
}

function putDown() {
  if (!held) return;
  held = false;
  closeModal();
  pauseView();
  release();
  body.classList.remove('held');
  body.classList.add('rest');
  setTimeout(() => sound.play('putdown'), reduceMotion ? 0 : 430);
}

function powerOn(then) {
  on = true;
  boy.classList.add('on');
  sound.play('toggle');
  screenEl.classList.remove('off');
  let seen = false;
  try { seen = sessionStorage.getItem('ozboy.booted') === '1'; } catch (e) {}
  if (then || seen || reduceMotion) {
    setTimeout(() => sound.play('bootding'), 120);
    stack.length = 0;
    stack.push({ id: 'home' });
    render();
    if (then) then();
    return;
  }
  boot();
}

function boot() {
  body.classList.add('booting');
  lcd.classList.add('full');
  viewEl.innerHTML = '<div class="boot"><div class="mark">OZ BOY<small>COLOR</small></div><div class="by">Omar Ozalp &middot; 1998</div></div>';
  setTitle('');
  const ding = setTimeout(() => sound.play('bootding'), 1150);
  const done = setTimeout(finishBoot, 2300);
  booting = { ding, done };
}

function finishBoot() {
  if (!booting) return;
  clearTimeout(booting.ding);
  clearTimeout(booting.done);
  booting = null;
  body.classList.remove('booting');
  try { sessionStorage.setItem('ozboy.booted', '1'); } catch (e) {}
  stack.length = 0;
  stack.push({ id: 'home' });
  render();
}

/* ---------------- the screen ---------------- */
lcd.innerHTML = `
  <div class="bar"><span class="ttl"></span><span class="stat"><svg class="note" width="5" height="7" viewBox="0 0 5 7" shape-rendering="crispEdges"><path d="M2 0h3v2H3v4H2v1H0V5h2z" fill="currentColor"/></svg><i class="batt"></i></span></div>
  <div class="view"></div>
  <div class="sbar"><i></i></div>
  <div class="hints"></div>`;
const viewEl = $('.view', lcd), hintsEl = $('.hints', lcd), sbar = $('.sbar i', lcd);

function setTitle(t) { $('.ttl', lcd).textContent = t; }
function setHints(h) { hintsEl.innerHTML = h.map(([k, v]) => `<span><b>${k}</b>${v}</span>`).join(''); }
function syncNote() { $('.note', lcd).classList.toggle('off', sound.isMuted()); }

function updateScrollbar() {
  const v = viewEl, track = v.clientHeight;
  if (lcd.classList.contains('full') || v.scrollHeight <= track + 1) { sbar.style.display = 'none'; return; }
  sbar.style.display = '';
  const h = Math.max(10, (track / v.scrollHeight) * (track - 2));
  sbar.style.height = h + 'px';
  sbar.style.top = ((v.scrollTop / (v.scrollHeight - track)) * (track - 2 - h)) + 'px';
}
viewEl.addEventListener('scroll', updateScrollbar, { passive: true });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = (id) => `<img src="${iconURL(id)}" alt="">`;
const btn = (label, attrs, alt) => `<div class="pbtn${alt ? ' alt' : ''}" data-f ${attrs}>${label}</div>`;
const paras = (list) => list.map((t) => `<p>${esc(t)}</p>`).join('');

/* ---------------- screens ---------------- */
const HOME = [
  ['grp', 'The resume stuff'], ['about', 'ABOUT'], ['work', 'WORK'], ['code', 'CODE'], ['resume', 'RESUME'],
  ['grp', 'Off the clock'], ['dive', 'DIVE'], ['mat', 'MAT'], ['track', 'TRACK'], ['shop', 'SHOP'], ['pics', 'PICS'], ['games', 'GAMES']
];

const LIFE = {
  dive: { prop: 'mask', kicker: 'Scuba diving', title: 'DIVE', photo: 'dive-crew',
    extra: [['SCUBAGO PROJECT', 'data-go="code"'], ['GO FISHING', 'data-go="game" data-arg="fish"', true]] },
  mat: { prop: 'headgear', kicker: 'Wrestling', title: 'MAT', photo: 'wrestling', extra: [] },
  track: { prop: 'spikes', kicker: 'Track & field', title: 'TRACK', art: 'track',
    extra: [['RUN THE BEACH', 'data-go="game" data-arg="town"', true]] },
  shop: { prop: 'drill', kicker: 'Building things', title: 'SHOP', photo: 'workshop',
    extra: [['MORE PICS', 'data-go="pics" data-arg="workshop"', true]] }
};

const GAMES = [
  { id: 'town', name: 'BEACH WALK', sub: 'Explore my life on foot', icon: 'about' },
  { id: 'fish', name: 'FISH ON!', sub: 'Land a yellowtail like I did', icon: 'fish' },
  { id: 'snake', name: 'SEA SNAKE', sub: 'Snake, but underwater', icon: 'snake' }
];

function photoBlock(id, style) {
  const ph = VFS.photo(id);
  if (!ph) return '';
  return `<div class="phwrap" data-f data-act="zoom" data-arg="${id}"><img class="ph" src="${asset(ph.thumb)}" alt="${esc(ph.caption)}"${style ? ` style="${style}"` : ''}>` +
    `<div class="cap"><span>${esc(ph.caption)}</span><span>A: ZOOM</span></div></div>`;
}

const VIEWS = {
  home: () => ({
    title: 'OMAR OZALP',
    hints: [['A', 'OPEN'], ['B', 'PUT DOWN']],
    html: (() => {
      let h = '', grid = [];
      const flush = () => { if (grid.length) h += `<div class="grid">${grid.join('')}</div>`; grid = []; };
      HOME.forEach(([id, label]) => {
        if (id === 'grp') { flush(); h += `<div class="grp">${label}</div>`; return; }
        grid.push(`<div class="tile" data-f data-go="${id}">${img(id)}<span>${label}</span></div>`);
      });
      flush();
      return h;
    })()
  }),

  about: () => ({
    title: 'ABOUT',
    text: true,
    html: photoBlock('me', 'object-position:50% 54%;height:110px') +
      `<div class="h">${esc(P.name.toUpperCase())}</div><p class="k">${esc(P.headline)}</p>${paras([P.bio])}` +
      `<div class="grp">Say hi</div>` +
      `<div class="row" data-f data-href="mailto:${P.links.email}"><span class="ic">@</span><span class="tx">EMAIL<small>${esc(P.links.email)}</small></span><span class="go">&gt;</span></div>` +
      `<div class="row" data-f data-href="${P.links.linkedin}"><span class="ic">in</span><span class="tx">LINKEDIN<small>/in/omar-ozalp</small></span><span class="go">&gt;</span></div>` +
      `<div class="row" data-f data-href="${P.links.github}"><span class="ic">&lt;/&gt;</span><span class="tx">GITHUB<small>@omarozalp</small></span><span class="go">&gt;</span></div>`
  }),

  work: () => ({
    title: 'WORK',
    text: true,
    html: `<div class="cart code"><span class="k">Experience</span><span class="big">WORK</span></div>` +
      P.experience.map((x) => `<div class="card"><b>${esc(x.company.toUpperCase())}</b><div class="k">${esc(x.role)} &middot; ${esc(x.location)}</div><p>${esc(x.desc)}</p></div>`).join('') +
      btn('FULL RESUME', 'data-go="resume"') + btn('SAY HI', 'data-go="about"', true)
  }),

  code: () => {
    return {
      title: 'CODE',
      text: true,
      html: `<div class="cart code"><span class="k">Projects</span><span class="big">CODE</span></div>` +
        VFS.PROJECTS.map((p) => `<div class="card"><b>${esc(p.name.toUpperCase())}</b><p class="k">${esc(p.tagline)}</p><p>${esc(p.description)}</p>` +
          `<ul>${p.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul><div class="chips">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` +
          btn('VIEW ON GITHUB', `data-href="${p.url}"`) + `</div>`).join('') +
        `<div class="card"><b>THIS SITE</b><p class="k">The desk and this handheld</p><p>On a laptop it's a 3D desk with a working 90s computer on it. On a phone it's the handheld you're holding. Plain JavaScript and three.js, no build step, every sound synthesized.</p>` +
        btn('OPEN THE DESK', 'data-href="../?desk" data-same="1"', true) + `</div>`
    };
  },

  resume: () => ({
    title: 'RESUME',
    text: true,
    html: btn('FULL PAGE', 'data-href="../plain.html" data-same="1"') +
      (RESUME_PDF ? btn('DOWNLOAD PDF', `data-href="${asset(RESUME_PDF)}"`, true) : '') +
      btn('EMAIL OMAR', `data-href="mailto:${P.links.email}"`, true) +
      `<div class="h">EDUCATION</div><div class="card"><b>DUKE UNIVERSITY</b><p>ECE, Computer Science &amp; Math<br>Durham, NC</p></div>` +
      `<div class="h">EXPERIENCE</div>` +
      P.experience.map((x) => `<div class="card"><b>${esc(x.company.toUpperCase())}</b><p class="dim">${esc(x.role)}, ${esc(x.location)}</p><p>${esc(x.desc)}</p></div>`).join('') +
      `<div class="h">PROJECTS</div>` +
      VFS.PROJECTS.map((p) => `<div class="card"><b>${esc(p.name.toUpperCase())}</b><p>${esc(p.tagline)}</p></div>`).join('') +
      `<div class="h">ACTIVITIES</div>` +
      P.activities.map((a) => `<div class="card"><b>${esc(a.name.toUpperCase())}</b><p>${esc(a.desc)}</p></div>`).join('') +
      `<div class="h">INTERESTS</div><div class="chips">${P.interests.map((i) => `<span>${esc(i)}</span>`).join('')}</div>`
  }),

  life: (id) => {
    const L = LIFE[id], def = PROPS[L.prop];
    const art = L.art ? `<img class="art" src="${trackArt()}" alt="">` : '';
    return {
      title: L.title,
      text: true,
      html: `<div class="cart ${id}"><span class="k">${esc(L.kicker)}</span><span class="big">${L.title}</span></div>` +
        (L.photo ? photoBlock(L.photo) : art) + paras(def.body) +
        L.extra.map(([label, attrs, alt]) => btn(label, attrs, alt)).join('')
    };
  },

  pics: (start) => {
    const list = VFS.PHOTOS;
    let i = Math.max(0, list.findIndex((p) => p.id === start));
    const show = (d) => {
      i = (i + d + list.length) % list.length;
      const p = list[i];
      $('.album img', viewEl).src = asset(p.thumb);
      $('.album img', viewEl).alt = p.caption;
      $('.album .meta p', viewEl).textContent = p.caption;
      $('.album .n', viewEl).textContent = `${i + 1}/${list.length}`;
      if (d) sound.play('blip');
    };
    return {
      title: 'PICS',
      hints: [['&lt;&gt;', 'MORE'], ['A', 'ZOOM']],
      fixed: true,
      html: `<div class="album"><img class="ph" data-f data-act="zoomcur" alt=""><div class="meta"><p></p><div class="arrows"><span data-act="prev">&lt;</span><span class="n"></span><span data-act="next">&gt;</span></div></div></div>`,
      enter: () => show(0),
      acts: { prev: () => show(-1), next: () => show(1), zoomcur: () => openPhoto(list[i].id) },
      onButton: (b, down) => {
        if (!down) return false;
        if (b === 'left') { show(-1); return true; }
        if (b === 'right') { show(1); return true; }
        return b === 'up' || b === 'down';
      },
      onSwipe: (dir) => { if (dir === 'left') show(1); else if (dir === 'right') show(-1); }
    };
  },

  games: () => ({
    title: 'GAMES',
    html: `<div class="cart pics" style="background:linear-gradient(#a98cff,#6b45d8)"><span class="k">Pick a cartridge</span><span class="big">GAMES</span></div>` +
      GAMES.map((g) => `<div class="row" data-f data-go="game" data-arg="${g.id}">${img(g.icon)}<span class="tx">${g.name}<small>${esc(g.sub)}</small></span><span class="go">&gt;</span></div>`).join('')
  }),

  game: (name) => gameView(name)
};

// The pixel spike shoe on a running track, for the TRACK page (no photo there yet).
let trackArtUrl = null;
function trackArt() {
  if (trackArtUrl) return trackArtUrl;
  const { canvas, ctx } = makeCanvas(148, 70, 1);
  ctx.fillStyle = '#c94a3a';
  ctx.fillRect(0, 0, 148, 70);
  ctx.fillStyle = '#fff';
  for (let y = 9; y < 70; y += 14) ctx.fillRect(0, y, 148, 1);
  ctx.fillRect(116, 0, 2, 70);
  drawIcon(ctx, 'track', 38, 11, 6);
  return (trackArtUrl = canvas.toDataURL());
}

/* ---------------- the view stack ---------------- */
const stack = [];      // [{ id, arg, focus, scroll }]
let cur = null;        // the live view: { def, items, fi, ... }

function render(restore) {
  leaveView();
  const entry = stack[stack.length - 1];
  const def = entry.id === 'game' ? VIEWS.game(entry.arg)
    : LIFE[entry.id] ? VIEWS.life(entry.id)
    : VIEWS[entry.id](entry.arg);
  cur = { def, items: [], fi: -1, entry };
  lcd.classList.toggle('full', !!def.full);
  setTitle(def.title || '');
  setHints(def.hints || [['A', 'OPEN'], ['B', 'BACK']]);
  viewEl.scrollTop = 0;
  viewEl.style.overflowY = def.fixed ? 'hidden' : '';
  if (def.mount) def.mount(viewEl);
  else viewEl.innerHTML = def.html;
  cur.items = [...viewEl.querySelectorAll('[data-f]')];
  if (def.enter) def.enter();
  if (restore && entry.focus != null) {
    viewEl.scrollTop = entry.scroll || 0;
    setFocus(Math.min(entry.focus, cur.items.length - 1), false);
  } else if (cur.items.length && !def.text) {
    setFocus(0, false);
  }
  // Text pages start with nothing selected: the D-pad scrolls the text, then reaches the buttons.
  updateScrollbar();
}

function leaveView() {
  if (!cur) return;
  if (cur.def.leave) cur.def.leave();
  const entry = cur.entry;
  entry.focus = cur.fi;
  entry.scroll = viewEl.scrollTop;
  cur = null;
}

function pauseView() { if (cur && cur.def.pause) cur.def.pause(); }
function resumeView() { if (cur && cur.def.resume) cur.def.resume(); }

function go(id, arg) {
  if (!cur) return;
  leaveView();
  stack.push({ id, arg });
  history.pushState({ oz: stack.length }, '');
  render();
}

function goBack() {
  if (modal) { closeModal(); return; }
  if (history.state && history.state.oz) history.back();
  else { sound.play('back'); popTo(stack.length - 1); }
}

function goHome() {
  if (stack.length <= 1) { sound.play('bump'); return; }
  if (history.state && history.state.oz) history.go(-(stack.length - 1));
  else popTo(1);
}

// Walk the view stack back to `depth` screens (0 = put the handheld down).
function popTo(depth) {
  closeModal();
  if (depth <= 0) { putDown(); return; }
  if (depth >= stack.length) return;
  leaveView();
  stack.length = depth;
  render(true);
}

addEventListener('popstate', (e) => {
  const depth = (e.state && e.state.oz) || 0;
  if (!held) return;
  if (booting && depth > 0) return;
  if (depth === 0) { putDown(); return; }
  if (depth < stack.length) { sound.play('back'); popTo(depth); }
});

/* ---------------- focus and the D-pad ---------------- */
function rel(el) {   // position inside the scrolling view, in screen pixels
  let x = 0, y = 0, n = el;
  while (n && n !== viewEl) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function setFocus(i, scroll = true) {
  if (!cur) return;
  if (cur.items[cur.fi]) cur.items[cur.fi].classList.remove('sel');
  cur.fi = i;
  const el = cur.items[i];
  if (!el) return;
  el.classList.add('sel');
  if (scroll) ensureVisible(el);
}

function ensureVisible(el) {
  const p = rel(el), v = viewEl, pad = 6;
  if (p.y - pad < v.scrollTop) v.scrollTop = Math.max(0, p.y - pad);
  else if (p.y + p.h + pad > v.scrollTop + v.clientHeight) v.scrollTop = p.y + p.h + pad - v.clientHeight;
}

function visible(el, slack = 0) {
  const p = rel(el), v = viewEl;
  return p.y + p.h > v.scrollTop - slack && p.y < v.scrollTop + v.clientHeight + slack;
}

function scrollStep(dir) {
  const v = viewEl, before = v.scrollTop;
  v.scrollTop += dir === 'down' ? 22 : -22;
  return v.scrollTop !== before;
}

function move(dir) {
  const items = cur.items, v = viewEl;
  const curEl = items[cur.fi];
  // Nothing selected (or it scrolled away under a finger): start from what's on screen.
  if (!curEl || !visible(curEl)) {
    const seen = items.map((el, i) => [el, i]).filter(([el]) => visible(el));
    if ((dir === 'down' || dir === 'up') && seen.length) {
      const pick = dir === 'down' ? seen[0] : seen[seen.length - 1];
      const p = rel(pick[0]);
      // Read the text above the first button before jumping onto it.
      if (dir === 'down' && p.y > v.scrollTop + v.clientHeight * 0.6 && scrollStep('down')) { sound.play('blip'); return; }
      setFocus(pick[1]);
      sound.play('blip');
      return;
    }
    if (dir === 'down' || dir === 'up') { if (scrollStep(dir)) sound.play('blip'); else sound.play('bump'); return; }
    if (items.length && !curEl) { setFocus(0); sound.play('blip'); return; }
  }
  const c = rel(curEl);
  let best = -1, bestScore = Infinity;
  items.forEach((el, i) => {
    if (i === cur.fi) return;
    const p = rel(el);
    const dx = (p.x + p.w / 2) - (c.x + c.w / 2), dy = (p.y + p.h / 2) - (c.y + c.h / 2);
    let main, cross;
    if (dir === 'down') { main = dy; cross = Math.abs(dx); }
    else if (dir === 'up') { main = -dy; cross = Math.abs(dx); }
    else if (dir === 'right') { main = dx; cross = Math.abs(dy); }
    else { main = -dx; cross = Math.abs(dy); }
    if (main <= 2) return;
    if ((dir === 'left' || dir === 'right') && cross > Math.max(p.h, c.h)) return;
    const score = main + cross * 2.5;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  if (best >= 0) {
    const p = rel(items[best]);
    // A long stretch of text between here and the next button: scroll through it first.
    const far = dir === 'down' ? p.y + p.h > v.scrollTop + v.clientHeight + 30 : p.y < v.scrollTop - 30;
    if ((dir === 'down' || dir === 'up') && far && scrollStep(dir)) {
      if (!visible(curEl)) { curEl.classList.remove('sel'); cur.fi = -1; }
      sound.play('blip');
      return;
    }
    setFocus(best);
    sound.play('blip');
    return;
  }
  if ((dir === 'down' || dir === 'up') && scrollStep(dir)) { sound.play('blip'); return; }
  sound.play('bump');
}

/* ---------------- doing things ---------------- */
function activate(el) {
  if (!el) return;
  const d = el.dataset;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  if (d.href) {
    sound.play('select');
    if (d.href.startsWith('mailto:') || d.same) location.href = d.href;
    else {
      window.open(d.href, '_blank', 'noopener');
      toast('Opening in a new tab...');
    }
    return;
  }
  if (d.act) {
    const fn = (cur.def.acts || {})[d.act] || ACTS[d.act];
    if (fn) { sound.play('select'); fn(d.arg); }
    return;
  }
  if (d.go) {
    sound.play('select');
    const id = d.go, arg = d.arg;
    setTimeout(() => { if (cur) go(id, arg); }, reduceMotion ? 0 : 90);
  }
}

const ACTS = { zoom: (id) => openPhoto(id) };

function toast(text, ms = 1400) {
  const old = $('.toast', lcd);
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  lcd.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* ---------------- options (Select) ---------------- */
let modal = null;
function openOptions() {
  if (modal) { closeModal(); return; }
  const opts = [
    ['sound', () => (sound.isMuted() ? 'SOUND: OFF' : 'SOUND: ON'), () => { sound.toggle(); syncMute(); paint(); }],
    ['home', () => 'HOME', () => { closeModal(); goHome(); }],
    ['down', () => 'PUT DOWN', () => { closeModal(); leaveHand(); }],
    ['desk', () => 'DESK VERSION', () => { location.href = '../?desk'; }],
    ['plain', () => 'PLAIN PAGE', () => { location.href = '../plain.html'; }]
  ];
  const el = document.createElement('div');
  el.className = 'menu';
  lcd.appendChild(el);
  let i = 0;
  const paint = () => {
    el.innerHTML = opts.map(([id, label], k) => `<div class="opt${k === i ? ' sel' : ''}" data-f data-k="${k}">${label()}</div>`).join('');
  };
  paint();
  el.addEventListener('click', (e) => {
    const o = e.target.closest('.opt');
    if (!o) return;
    i = +o.dataset.k;
    paint();
    sound.play('select');
    opts[i][2]();
  });
  sound.play('select');
  pauseView();
  modal = {
    el,
    button(b, down) {
      if (!down) { if (b === 'a') { sound.play('select'); opts[i][2](); } return; }
      if (b === 'up' || b === 'down') { i = (i + (b === 'down' ? 1 : opts.length - 1)) % opts.length; paint(); sound.play('blip'); }
      else if (b === 'b' || b === 'select') { sound.play('back'); closeModal(); }
    }
  };
}
function closeModal() {
  if (!modal) return;
  modal.el.remove();
  modal = null;
  resumeView();
}

// Put it down, keeping history in step (one entry per screen deep).
function leaveHand() {
  if (history.state && history.state.oz) history.go(-history.state.oz);
  else putDown();
}

/* ---------------- full-screen photos ---------------- */
const photoView = $('#photo-view');
function openPhoto(id) {
  const p = VFS.photo(id);
  if (!p) return;
  $('img', photoView).src = asset(p.src);
  $('img', photoView).alt = p.caption;
  $('p', photoView).textContent = p.caption;
  photoView.hidden = false;
}
function closePhoto() { photoView.hidden = true; sound.play('back'); }
photoView.addEventListener('click', closePhoto);

/* ---------------- games ---------------- */
function gameView(name) {
  let game = null, alive = true, canvas = null;
  const k = Math.max(1, Math.round(fitted.lz * fitted.z * (window.devicePixelRatio || 1)));
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(`ozboy.${name}.${key}`)); } catch (e) { return null; } },
    set(key, v) { try { localStorage.setItem(`ozboy.${name}.${key}`, JSON.stringify(v)); } catch (e) {} }
  };
  let down = null;
  const pt = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 160, (e.clientY - r.top) / r.height * fitted.lcdh];
  };
  return {
    full: true,
    mount(el) {
      el.innerHTML = '<div class="game"><canvas></canvas></div>';
      canvas = $('canvas', el);
      const { ctx } = makeCanvas(160, fitted.lcdh, k, canvas);
      const host = {
        canvas, ctx, w: 160, h: fitted.lcdh, k, store,
        sfx: (n) => sound.play(n),
        vibrate: (ms) => buzz(ms),
        exit: () => { if (alive) goBack(); },
        open: (id) => { if (!alive) return; if (id === 'snake' || id === 'fish' || id === 'town') go('game', id); else go(id, null); },
        asset
      };
      canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        down = pt(e);
        if (game && game.press) game.press(true, down[0], down[1]);
      });
      const up = (e) => {
        if (!down) return;
        const [x, y] = pt(e), dx = x - down[0], dy = y - down[1];
        if (game && game.press) game.press(false, x, y);
        if (game) {
          if (Math.hypot(dx, dy) < 10) game.tap(down[0], down[1]);
          else game.swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }
        down = null;
      };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', () => { if (down && game && game.press) game.press(false, 0, 0); down = null; });
      import(`./games/${name}.js`).then((m) => {
        if (!alive) return;
        game = m.default(host);
        game.start();
        if (!held) game.pause();
      }).catch(() => {
        el.innerHTML = '<div class="boot"><div class="mark" style="animation:none;top:40%">OOPS</div><div class="by" style="opacity:1">This cartridge is still being built.</div></div>';
      });
    },
    leave() { alive = false; if (game) game.stop(); },
    pause() { if (game) game.pause(); },
    resume() { if (game) game.resume(); },
    raw: true,
    onButton(b, isDown) { if (game) game.button(b, isDown); return true; }
  };
}

/* ---------------- buttons: touch, keyboard ---------------- */
const pressed = new Set();
let repeatTimer = null, aArmed = false;

function buzz(ms = 6) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

function press(b) {
  if (pressed.has(b)) return;
  pressed.add(b);
  visual(b, true);
  buzz();
  if (!held) return;
  if (!photoView.hidden) { if (b === 'b' || b === 'a') closePhoto(); return; }
  if (booting) { finishBoot(); return; }
  if (!cur) return;
  if (modal) { modal.button(b, true); return; }
  if (cur.def.raw) { cur.def.onButton(b, true); return; }
  if (cur.def.onButton && cur.def.onButton(b, true)) return;
  if (b === 'up' || b === 'down' || b === 'left' || b === 'right') {
    move(b);
    clearTimeout(repeatTimer);
    const again = () => { if (pressed.has(b) && cur && !modal) { move(b); repeatTimer = setTimeout(again, 110); } };
    repeatTimer = setTimeout(again, 380);
  } else if (b === 'a') aArmed = true;
  else if (b === 'b') goBack();
  else if (b === 'start') goHome();
  else if (b === 'select') openOptions();
}

function unpress(b) {
  if (!pressed.has(b)) return;
  pressed.delete(b);
  visual(b, false);
  clearTimeout(repeatTimer);
  if (!held || !cur) return;
  if (modal) { modal.button(b, false); return; }
  if (cur.def.raw) { cur.def.onButton(b, false); return; }
  // A acts on release: on phones that is what lets it open links in a new tab.
  if (b === 'a' && aArmed) {
    aArmed = false;
    if (cur.items[cur.fi]) activate(cur.items[cur.fi]);
    else if (cur.items.length) { setFocus(0); sound.play('blip'); }
    else sound.play('bump');
  }
}

function release() { [...pressed].forEach(unpress); }

const dpad = $('.dpad', boy);
function visual(b, isDown) {
  if (b === 'up' || b === 'down' || b === 'left' || b === 'right') {
    if (isDown) dpad.dataset.dir = b;
    else if (dpad.dataset.dir === b) delete dpad.dataset.dir;
    return;
  }
  const el = $(`[data-btn="${b}"]`, boy);
  if (el) el.classList.toggle('down', isDown);
}

// A, B, Start, Select.
boy.querySelectorAll('[data-btn]:not(.dpad)').forEach((el) => {
  const b = el.dataset.btn;
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); press(b); });
  el.addEventListener('pointerup', () => unpress(b));
  el.addEventListener('pointercancel', () => unpress(b));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
});

// The D-pad: the direction follows your thumb, so you can roll between directions.
let dpadDir = null;
function dpadAt(e) {
  const r = dpad.getBoundingClientRect();
  const x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
  if (Math.hypot(x, y) < 0.1) return dpadDir;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
}
function dpadTo(dir) {
  if (dir === dpadDir) return;
  if (dpadDir) unpress(dpadDir);
  dpadDir = dir;
  if (dir) press(dir);
}
dpad.addEventListener('pointerdown', (e) => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); dpadTo(dpadAt(e)); });
dpad.addEventListener('pointermove', (e) => { if (dpadDir) dpadTo(dpadAt(e)); });
dpad.addEventListener('pointerup', () => dpadTo(null));
dpad.addEventListener('pointercancel', () => dpadTo(null));
dpad.addEventListener('contextmenu', (e) => e.preventDefault());

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
  Enter: 'a', ' ': 'a', z: 'a', Escape: 'b', Backspace: 'b', x: 'b', h: 'start', Home: 'start', o: 'select', Tab: 'select'
};
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const b = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!b) return;
  e.preventDefault();
  if (!held) { if (b === 'a') pickUp(); return; }
  if (!e.repeat) press(b);
});
addEventListener('keyup', (e) => {
  const b = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (b) unpress(b);
});
addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) { release(); pauseView(); } else if (held) resumeView(); });

/* ---------------- touching the screen ---------------- */
viewEl.addEventListener('click', (e) => {
  if (!held || !cur || cur.def.raw) return;
  if (booting) { finishBoot(); return; }
  const el = e.target.closest('[data-f], [data-act]');
  if (!el || !viewEl.contains(el)) return;
  if (el.hasAttribute('data-f')) {
    const i = cur.items.indexOf(el);
    if (i >= 0) setFocus(i, false);
  }
  activate(el);
});
lcd.addEventListener('click', () => { if (booting) finishBoot(); });

// Horizontal swipes on the screen (the photo album uses them).
let sw = null;
viewEl.addEventListener('pointerdown', (e) => { sw = [e.clientX, e.clientY]; });
viewEl.addEventListener('pointerup', (e) => {
  if (!sw || !cur || !cur.def.onSwipe) { sw = null; return; }
  const dx = e.clientX - sw[0], dy = e.clientY - sw[1];
  sw = null;
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.5) cur.def.onSwipe(dx < 0 ? 'left' : 'right');
});

/* ---------------- the rest of the page ---------------- */
holder.addEventListener('click', () => { if (!held) pickUp(); });
$('#putdown').addEventListener('click', leaveHand);
document.querySelectorAll('.pills [data-go]').forEach((b) => {
  b.addEventListener('click', () => {
    const id = b.dataset.go;
    pickUp(() => { if (!cur || cur.entry.id !== id) go(id); });
  });
});

const muteBtn = $('#mute');
function syncMute() {
  const m = sound.isMuted();
  muteBtn.classList.toggle('muted', m);
  muteBtn.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
  syncNote();
}
muteBtn.addEventListener('click', () => { sound.toggle(); syncMute(); if (!sound.isMuted()) sound.play('blip'); });
sound.onChange(syncMute);
syncMute();

let resizeTimer = null;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (fit() && cur && on && !booting) {
      // The screen changed shape (the phone rotated): redraw the current screen at the new size.
      leaveView();
      render(true);
    }
  }, 120);
});

fit();
history.replaceState(null, '');

// For tests and debugging.
window.__ozboy = {
  pickUp, putDown, go, press, unpress,
  get view() { return cur && cur.entry.id; },
  get depth() { return stack.length; },
  get held() { return held; },
  get booting() { return !!booting; },
  get focus() { return cur && cur.items[cur.fi] ? cur.items[cur.fi].textContent.trim() : null; }
};
