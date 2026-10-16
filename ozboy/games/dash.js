// dash.js — "100M DASH" for OZ BOY: a sprint where A is your left leg and B your right. Alternate them
// as fast as you can; hitting the same leg twice is a stumble. Race two rivals to the tape.

import { C, rect, frame, pxText } from '../pixel.js';

const PPM = 9;                  // screen pixels per meter
const RACE = 100;               // meters
const RIVALS = [
  { name: 'SPEEDY', shirt: C.coral, shorts: C.ink, hair: '#5a3a22' },
  { name: 'BOLT JR', shirt: C.yellow, shorts: C.navy, hair: C.hair }
];
const QUIPS = {
  1: ['GOLD! TAKE A LAP.', 'FASTEST ON THE BEACH.', 'COACH IS WEEPING.'],
  2: ['SILVER. SO CLOSE.', 'LEAN AT THE TAPE!'],
  3: ['BRONZE. LEG DAY?', 'THEY HAD SPIKES ON.']
};

export default function create(host) {
  const { ctx, w, h } = host;
  const HUD = 12;
  const standsH = Math.round((h - HUD) * 0.3);
  const trackTop = HUD + standsH;
  const laneH = Math.floor((h - trackTop - 4) / 3);
  const laneY = (i) => trackTop + 4 + laneH * i + laneH - 6;   // feet line for lane i (player is lane 1)

  let raf = 0, last = 0, paused = false, running = false;
  let phase = 'title';           // title | marks | race | done
  let t = 0, clock = 0, cue = 0, goAt = 9, cueText = '', falseStarts = 0, doneAt = 0;
  let best = host.store.get('best');
  let me, cpu, place = 0, newBest = false, quip = '';
  let lastLeg = null, stumble = 0, banner = '', bannerT = 0;
  const crowd = [];
  for (let i = 0; i < 90; i++) crowd.push({ x: i * 7 + (i % 3) * 2, row: i % 3, c: [C.navy, C.white, C.blue, C.coral, C.yellow][i % 5], b: Math.random() * 6 });

  function reset() {
    me = { d: 0, v: 0, p: 0, target: 0, done: 0 };
    cpu = RIVALS.map((r, i) => ({ ...r, d: 0, v: 0, p: Math.random(), goal: 11.9 + Math.random() * 2.4 + i * 0.25, done: 0, lane: i === 0 ? 0 : 2 }));
    lastLeg = null; stumble = 0; clock = 0; place = 0; newBest = false; banner = '';
  }

  function marks() {
    reset();
    phase = 'marks';
    cue = 0;
    cueText = 'ON YOUR MARKS';
    host.sfx('blip');
  }

  // A leg press: alternate legs to accelerate, the same leg twice is a stumble.
  function leg(which) {
    if (phase === 'marks') {
      // Anything before the gun is a false start: back to your marks.
      falseStarts++;
      phase = 'false';
      host.sfx('bump');
      host.vibrate(30);
      setTimeout(() => { if (running && phase === 'false') marks(); }, 900);
      return;
    }
    if (phase !== 'race' || me.done) return;
    if (which === lastLeg) {
      me.v *= 0.55;
      stumble = 0.28;
      banner = 'STUMBLE!'; bannerT = 0.5;
      host.sfx('bump');
      host.vibrate(20);
    } else {
      me.v += 2.4 * Math.max(0, 1 - me.v / 12.5);
      me.target = which === 'l' ? 1 : 0;
      if (me.d > 0.5 && Math.random() < 0.5) host.sfx('step');
    }
    lastLeg = which;
  }

  function update(dt) {
    t += dt;
    if (bannerT > 0) bannerT -= dt;
    if (phase === 'marks') {
      cue += dt;
      if (cue >= 1 && cue - dt < 1) { cueText = 'SET'; host.sfx('blip'); goAt = 2.1 + Math.random() * 0.8; }
      if (cue >= goAt) {
        phase = 'race'; cue = 2; cueText = 'GO!'; bannerT = 0.6; banner = 'GO!';
        host.sfx('snap'); host.vibrate(15);
      }
      return;
    }
    if (phase !== 'race') return;
    clock += dt;
    // You: speed bleeds off unless you keep stepping.
    me.v = Math.max(0, me.v - me.v * 1.0 * dt);
    if (stumble > 0) stumble -= dt;
    me.p += (me.target - me.p) * Math.min(1, dt * 14);
    if (!me.done) {
      me.d += me.v * dt;
      if (me.d >= RACE) { me.done = clock; finishCheck(); }
    }
    // Rivals: ramp up over two seconds, then hold a pace that lands them near their goal time.
    cpu.forEach((r) => {
      if (r.done) { r.v = Math.max(0, r.v - 6 * dt); r.d += r.v * dt; return; }
      const cruise = RACE / (r.goal - 1.0);
      r.v = cruise * Math.min(1, clock / 2) * (1 + Math.sin(clock * 3 + r.goal) * 0.03);
      r.d += r.v * dt;
      r.p = (r.p + r.v * dt * 0.45) % 2;
      if (r.d >= RACE) r.done = clock;
    });
    if (me.done && cpu.every((r) => r.done || r.d > RACE - 0.01) && clock - me.done > 0.6) end();
    if (me.done && clock - me.done > 2.5) end();
  }

  function finishCheck() {
    place = 1 + cpu.filter((r) => r.done && r.done < me.done).length;
    host.sfx(place === 1 ? 'win' : 'select');
  }

  // The results screen ignores input for a moment, so mashing A/B across the line doesn't restart the race.
  // Timed with `t`, which keeps running; the race clock stops when the race ends.
  const resultsReady = () => t - doneAt >= 0.8;

  function end() {
    if (phase === 'done') return;
    phase = 'done';
    doneAt = t;
    place = 1 + cpu.filter((r) => (r.done || 99) < me.done).length;
    newBest = !best || me.done < best;
    if (newBest) { best = Math.round(me.done * 100) / 100; host.store.set('best', best); }
    const q = QUIPS[place] || QUIPS[3];
    quip = q[Math.floor(Math.random() * q.length)];
    host.sfx(place === 1 ? 'catch' : 'lose');
  }

  /* ---------------- drawing ---------------- */
  function camX() { return Math.max(0, me.d * PPM - 48); }

  function drawStands(cx) {
    rect(ctx, '#bfe8ff', 0, HUD, w, standsH);
    rect(ctx, '#7a8091', 0, HUD + 4, w, standsH - 4);
    for (let r = 0; r < 3; r++) rect(ctx, '#9aa0ad', 0, HUD + 6 + r * Math.floor((standsH - 8) / 3), w, 1);
    const rowH = Math.floor((standsH - 8) / 3);
    crowd.forEach((p) => {
      const x = ((p.x - cx * 0.35) % 630 + 630) % 630 - 10;
      if (x < -6 || x > w + 2) return;
      const bob = Math.sin(t * 7 + p.b) > 0.6 ? 1 : 0;
      const y = HUD + 6 + p.row * rowH + rowH - 7 - bob;
      rect(ctx, C.skin, x + 1, y, 3, 3);
      rect(ctx, p.c, x, y + 3, 5, 4);
    });
    rect(ctx, C.navy, 0, trackTop - 3, w, 3);
    pxText(ctx, 'DUKE', ((40 - cx * 0.35) % 160 + 160) % 160, trackTop - 11, C.white, 8);
  }

  function drawTrack(cx) {
    rect(ctx, '#c94a3a', 0, trackTop, w, h - trackTop);
    rect(ctx, '#b84334', 0, trackTop, w, 3);
    for (let i = 0; i <= 3; i++) rect(ctx, C.white, 0, trackTop + 2 + laneH * i, w, 1);
    // distance marks and the finish
    for (let m = 10; m <= RACE; m += 10) {
      const x = Math.round(m * PPM - cx);
      if (x < -20 || x > w + 20) continue;
      if (m === RACE) {
        for (let y = trackTop + 2; y < h; y += 3) { rect(ctx, C.white, x, y, 3, 3); rect(ctx, C.ink, x + (y % 6 ? 0 : 3), y, 3, 3); }
        rect(ctx, C.yellow, x + 1, trackTop - 18, 2, 18);
        if (!me.done) rect(ctx, C.white, x + 1, laneY(1) - 15, 1, 15);
      } else {
        rect(ctx, 'rgba(255,255,255,.55)', x, trackTop + 2, 1, h - trackTop);
        pxText(ctx, String(m), x + 2, trackTop + 3, C.white, 8);
      }
    }
    if (cx < 20) rect(ctx, C.white, Math.round(-cx + 0), trackTop + 2, 2, h - trackTop);
  }

  // A runner, drawn from a stride phase p in 0..1 (0 = right leg forward, 1 = left leg forward).
  function limb(x0, y0, a, len) {
    const dx = Math.sin(a), dy = Math.cos(a);
    for (let s = 0; s <= len; s += 0.75) rect(ctx, ctx.fillStyle, Math.round(x0 + dx * s), Math.round(y0 + dy * s), 2, 2);
    return [x0 + dx * len, y0 + dy * len];
  }
  function runner(x, feet, p, look, moving, flail) {
    const hipY = feet - 10, hipX = x;
    const legs = [p, 1 - p];
    legs.forEach((q, i) => {
      ctx.fillStyle = i ? look.skinBack || '#b07848' : C.skin;
      const thigh = moving ? -0.7 + q * 1.6 : 0.1, shin = thigh - (moving ? (1 - q) * 1.4 : 0);
      const [kx, ky] = limb(hipX, hipY, thigh, 5);
      const [fx, fy] = limb(kx, ky, shin, 5);
      rect(ctx, C.white, Math.round(fx) - 1, Math.round(fy) + 1, 4, 2);
    });
    rect(ctx, look.shorts, hipX - 2, hipY - 3, 6, 4);
    rect(ctx, look.shirt, hipX - 2, hipY - 10, 6, 8);
    const sw = moving ? (p - 0.5) * 2 : 0;
    ctx.fillStyle = C.skin;
    limb(hipX + 1, hipY - 9, flail ? -2.6 : 0.9 * sw + 0.4, 5);
    limb(hipX + 1, hipY - 9, flail ? 2.6 : -0.9 * sw + 0.4, 5);
    rect(ctx, C.skin, hipX - 1, hipY - 15, 5, 5);
    rect(ctx, look.hair, hipX - 1, hipY - 16, 5, 2);
    rect(ctx, look.hair, hipX - 2, hipY - 15, 2, 2);
    rect(ctx, C.ink, hipX + 2, hipY - 13, 1, 1);
  }

  const ME = { shirt: C.navy, shorts: C.white, hair: C.hair };

  function drawHud() {
    rect(ctx, C.navy, 0, 0, w, HUD);
    const time = phase === 'race' || phase === 'done' ? (me.done || clock) : 0;
    pxText(ctx, time.toFixed(2) + 'S', 3, 2, C.white, 8);
    const left = Math.max(0, Math.ceil(RACE - me.d));
    pxText(ctx, phase === 'done' ? 'DONE' : left + 'M', w - 3, 2, C.yellow, 8, 'right');
    // speed meter
    const sv = Math.min(1, me.v / 11);
    rect(ctx, '#2a3b8f', 62, 4, 34, 4);
    rect(ctx, sv > 0.75 ? C.green : sv > 0.4 ? C.yellow : C.coral, 62, 4, Math.round(34 * sv), 4);
    // the whole race at a glance: a strip with everyone's position
    if (phase === 'race' || phase === 'done') {
      rect(ctx, '#0b1a4a', 0, HUD, w, 3);
      const at = (d) => 2 + Math.round(Math.min(1, d / RACE) * (w - 6));
      rect(ctx, C.white, w - 3, HUD, 1, 3);
      cpu.forEach((r) => rect(ctx, r.shirt, at(r.d), HUD, 3, 3));
      rect(ctx, C.white, at(me.d) - 1, HUD - 1, 5, 5);
      rect(ctx, C.navy, at(me.d), HUD, 3, 3);
    }
  }

  function center(text, y, color, size = 8, shadow = C.ink) {
    pxText(ctx, text, w / 2 + 1, y + 1, shadow, size, 'center');
    pxText(ctx, text, w / 2, y, color, size, 'center');
  }

  function panel(y, hh) {
    rect(ctx, 'rgba(20,33,61,.85)', 8, y, w - 16, hh);
    frame(ctx, C.yellow, 8, y, w - 16, hh, 1);
  }

  function draw() {
    const cx = camX();
    drawStands(cx);
    drawTrack(cx);
    cpu && cpu.forEach((r) => {
      const x = Math.round(r.d * PPM - cx);
      if (x > -20 && x < w + 20) runner(x, laneY(r.lane), Math.abs(1 - (r.p % 2)), r, phase === 'race' || r.done, false);
    });
    if (me) runner(Math.round(me.d * PPM - cx), laneY(1), me.p, ME, phase === 'race' && me.v > 0.4, stumble > 0);
    drawHud();

    if (phase === 'title') {
      panel(HUD + 6, Math.min(118, h - HUD - 12));
      center('100M', HUD + 12, C.yellow, 16);
      center('DASH', HUD + 30, C.white, 16);
      center('A = LEFT LEG', HUD + 52, C.white);
      center('B = RIGHT LEG', HUD + 63, C.white);
      center('ALTERNATE TO RUN!', HUD + 76, C.yellow);
      if (Math.sin(t * 5) > -0.3) center('A: START', HUD + 92, C.green);
      center(best ? `BEST ${best.toFixed(2)}S   B: EXIT` : 'B: EXIT', HUD + 105, '#bfc8e8');
      return;
    }
    if (phase === 'marks' || phase === 'false') {
      const big = cueText === 'SET';
      center(phase === 'false' ? 'FALSE START!' : cueText, trackTop - (big ? 26 : 22), phase === 'false' ? C.coral : C.white, big ? 16 : 8);
      if (phase === 'marks' && h > 170) center('WAIT FOR THE GUN...', h - 12, C.white);
    }
    if (bannerT > 0 && banner && phase === 'race') center(banner, trackTop - 24, banner === 'GO!' ? C.green : C.coral, banner === 'GO!' ? 16 : 8);
    if (phase === 'race' && clock < 3 && h > 160) center('A  B  A  B  A  B ...', h - 11, C.white);
    if (phase === 'done') {
      const y = HUD + 8;
      panel(y, 92);
      center(['', '1ST!', '2ND', '3RD'][place] || '3RD', y + 6, place === 1 ? C.yellow : C.white, 16);
      center(`${me.done.toFixed(2)} SECONDS`, y + 28, C.white);
      center(newBest ? 'NEW BEST!' : `BEST ${best.toFixed(2)}S`, y + 40, newBest && Math.sin(t * 8) > 0 ? C.yellow : C.green);
      pxText(ctx, quip, w / 2, y + 54, '#bfc8e8', 10, 'center', 'VT323');
      center('A: AGAIN  B: EXIT', y + 74, C.white);
    }
    if (paused) {
      rect(ctx, 'rgba(10,14,26,.6)', 0, 0, w, h);
      center('PAUSED', h / 2 - 16, C.white, 16);
      center('START: RESUME', h / 2 + 6, C.yellow);
      center('B: QUIT', h / 2 + 18, '#bfc8e8');
    }
  }

  function frameLoop(now) {
    raf = requestAnimationFrame(frameLoop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!paused) update(dt);
    draw();
  }

  function startLoop() { if (!raf) { last = 0; raf = requestAnimationFrame(frameLoop); } }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

  return {
    start() { reset(); phase = 'title'; running = true; startLoop(); },
    stop() { running = false; stopLoop(); },
    pause() { if (phase === 'race' || phase === 'marks') paused = true; draw(); stopLoop(); },
    resume() { if (running) startLoop(); },
    button(b, down) {
      if (!down) return true;
      if (paused) {
        if (b === 'start' || b === 'a') { paused = false; host.sfx('blip'); }
        else if (b === 'b') { paused = false; phase = 'title'; reset(); host.sfx('back'); }
        return true;
      }
      if (phase === 'title') {
        if (b === 'a' || b === 'start') { host.sfx('select'); marks(); }
        else if (b === 'b') host.exit();
        return true;
      }
      if (phase === 'done') {
        if (!resultsReady()) return true;
        if (b === 'a' || b === 'start') { host.sfx('select'); marks(); }
        else if (b === 'b') host.exit();
        return true;
      }
      if (b === 'start') { paused = true; host.sfx('blip'); return true; }
      if (b === 'a' || b === 'left') leg('l');
      else if (b === 'b' || b === 'right') leg('r');
      return true;
    },
    press(down, x) {
      if (!down) return;
      if (phase === 'race' || phase === 'marks') leg(x < w / 2 ? 'l' : 'r');
    },
    tap() {
      if (phase === 'title') { host.sfx('select'); marks(); }
      else if (phase === 'done' && resultsReady()) { host.sfx('select'); marks(); }
      else if (paused) paused = false;
    },
    swipe() {},
    _debug: { state: () => ({ phase, d: me && me.d, v: me && me.v, clock, place }) }
  };
}
