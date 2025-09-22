// script.js
const CONFIG = {
  accentRule: true,
  gradientText: true,
  phrasePool: true,
  timeTag: true,
  entranceAnimation: true,
  moonSunGlyph: true,
  radialBackground: true,
  binaryMinuteBits: false,
  clickCycle: true,
  themeToggle: true
};
const BUCKETS = [
  { name: "morning", start: 5, end: 11, phrases: ["Good morning", "Morning", "Rise & build"], glyph: "sun" },
  { name: "afternoon", start: 12, end: 16, phrases: ["Good afternoon", "Afternoon", "Productive afternoon"], glyph: "sun" },
  { name: "evening", start: 17, end: 21, phrases: ["Good evening", "Evening"], glyph: "moon" },
  { name: "night", start: 22, end: 4, phrases: ["Good night", "Late night", "Building after hours"], glyph: "moon" }
];
function getHour() { return new Date().getHours(); }
function getMinute() { return new Date().getMinutes(); }
function pad(n) { return n < 10 ? "0" + n : n; }
function getBucket(hour) {
  for (const b of BUCKETS) {
    if (b.start <= b.end) {
      if (hour >= b.start && hour <= b.end) return b;
    } else {
      if (hour >= b.start || hour <= b.end) return b;
    }
  }
  return BUCKETS[0];
}
function getPhrase(bucket, idx = 0) {
  return bucket.phrases[idx % bucket.phrases.length];
}
function getTimeTag() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function getStoredGreeting() {
  try {
    return JSON.parse(localStorage.getItem("greetingVariant") || "{}");
  } catch { return {}; }
}
function setStoredGreeting(obj) {
  localStorage.setItem("greetingVariant", JSON.stringify(obj));
}
let autoCycleInterval = null;
// Update theme toggle button to only show SVG sun/moon, no text label or emoji
function setupThemeToggle() {
  if (!CONFIG.themeToggle) return;
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.hidden = false;
  btn.style.display = "flex";
  // Minimal SVG icons for sun and moon
  btn.innerHTML = `
    <svg class="theme-icon sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><g><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g></svg>
    <svg class="theme-icon moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
  `;
  // Set initial state
  const stored = localStorage.getItem("themeChoice");
  function updateButton() {
    // No label, just icons
    btn.setAttribute("aria-pressed", document.documentElement.getAttribute("data-theme") === "dark");
  }
  if (stored === "dark" || stored === "light") {
    document.documentElement.setAttribute("data-theme", stored);
    updateButton();
  } else {
    document.documentElement.removeAttribute("data-theme");
    updateButton();
  }
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("themeChoice", next);
    updateButton();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (!localStorage.getItem("themeChoice")) {
      document.documentElement.removeAttribute("data-theme");
      updateButton();
    }
  });
  updateButton();
}
function applyRadialBackground(bucket) {
  if (!CONFIG.radialBackground) return;
  document.body.classList.add("radial-bg");
}
function entranceAnimation() {
  if (!CONFIG.entranceAnimation) return;
}
// Allow greeting to change to next phrase on every click, regardless of time bucket or hour
function applyGreeting({ initial = false, cycle = false, auto = false } = {}) {
  const greeting = document.getElementById("greeting");
  if (!greeting) return;
  const hour = getHour();
  const minute = getMinute();
  const bucket = getBucket(hour);
  document.documentElement.setAttribute("data-time-bucket", bucket.name);
  let idx = 0, phrase = bucket.phrases[0];
  let store = getStoredGreeting();
  if (CONFIG.phrasePool) {
    if (store && store.hour === hour && store.bucket === bucket.name && typeof store.idx === "number") {
      idx = store.idx;
    } else {
      idx = Math.floor(Math.random() * bucket.phrases.length);
      setStoredGreeting({ hour, bucket: bucket.name, idx });
    }
    phrase = getPhrase(bucket, idx);
  }
  // Click cycle logic: always allow cycling to next phrase on click
  greeting.style.cursor = "pointer";
  greeting.onclick = function () {
    fadeGreetingOutIn(() => {
      let store = getStoredGreeting();
      let idx = 0;
      if (store && store.hour === hour && store.bucket === bucket.name && typeof store.idx === "number") {
        idx = store.idx;
      }
      idx = (idx + 1) % bucket.phrases.length;
      setStoredGreeting({ hour, bucket: bucket.name, idx });
      renderGreeting({ phrase: getPhrase(bucket, idx), bucket, hour, minute, animate: true });
    });
  };
  renderGreeting({ phrase, bucket, hour, minute, animate: initial });
  // Auto cycle every 30s for buckets with multiple phrases
  if (autoCycleInterval) clearInterval(autoCycleInterval);
  if (bucket.phrases.length > 1) {
    autoCycleInterval = setInterval(() => {
      let store = getStoredGreeting();
      let idx = 0;
      if (store && store.hour === hour && store.bucket === bucket.name && typeof store.idx === "number") {
        idx = store.idx;
      }
      idx = (idx + 1) % bucket.phrases.length;
      setStoredGreeting({ hour, bucket: bucket.name, idx });
      fadeGreetingOutIn(() => {
        renderGreeting({ phrase: getPhrase(bucket, idx), bucket, hour, minute, animate: true });
      });
    }, 30000);
  }
}
function fadeGreetingOutIn(callback) {
  const greeting = document.getElementById("greeting");
  if (!greeting) return;
  greeting.style.transition = "opacity 0.25s";
  greeting.style.opacity = 0;
  setTimeout(() => {
    callback();
    greeting.style.opacity = 1;
  }, 250);
}
// Remove sun/moon glyph from greeting logic
function renderGreeting({ phrase, bucket, hour, minute, animate }) {
  const greeting = document.getElementById("greeting");
  if (!greeting) return;
  greeting.className = "";
  if (CONFIG.gradientText) greeting.classList.add("gradient");
  if (CONFIG.entranceAnimation && animate) greeting.classList.add("entrance");
  greeting.classList.add("ready");
  let html = `${phrase}`;
  if (CONFIG.timeTag) {
    html += `<span class="time-tag" aria-hidden="true"> · ${getTimeTag()}</span>`;
  }
  greeting.innerHTML = html;
  if (CONFIG.accentRule) {
    if (!greeting.querySelector('.accent-rule')) {
      greeting.insertAdjacentHTML('beforeend', `<span class="accent-rule" aria-hidden="true"></span>`);
    }
  } else {
    const rule = greeting.querySelector('.accent-rule');
    if (rule) rule.remove();
  }
}
function renderMinuteBits() {
  if (!CONFIG.binaryMinuteBits) return;
  const root = document.getElementById("minute-bits-root");
  if (!root) return;
  const minute = getMinute();
  const bits = (minute % 64).toString(2).padStart(6, "0");
  let html = `<ul class="minute-bits" aria-hidden="true">`;
  for (let i = 0; i < 6; ++i) {
    html += `<li class="${bits[i] === "1" ? "on" : ""}"></li>`;
  }
  html += `</ul>`;
  root.innerHTML = html;
}
document.addEventListener("DOMContentLoaded", function () {
  applyGreeting({ initial: true });
  renderMinuteBits();
  setupThemeToggle();
  if (CONFIG.radialBackground) {
    const hour = getHour();
    const bucket = getBucket(hour);
    applyRadialBackground(bucket);
  }
  setTimeout(() => {
    const greeting = document.getElementById("greeting");
    if (greeting) greeting.removeAttribute("aria-live");
  }, 1200);
});

// --- Text Scramble Intro Effect for #site-name ---
const SCRAMBLE_CONFIG = {
  enabled: true,
  durationMs: 1100, // slowed down
  delayMs: 80,
  frameIntervalMs: 40, // slightly faster
  randomOrder: false, // left-to-right
  charset: ['0','1','▮'],
  skipIfSeen: false, // set to false for testing so it always runs
  reduceMotionInstant: true
};
(function(){
  const el = document.getElementById('site-name');
  if (!el || !SCRAMBLE_CONFIG.enabled) return;
  if (SCRAMBLE_CONFIG.skipIfSeen && sessionStorage.getItem('seenScramble') === '1') {
    el.classList.add('animate-underline');
    return;
  }
  if (SCRAMBLE_CONFIG.reduceMotionInstant && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = el.dataset.scrambleOrig || el.textContent;
    el.classList.remove('scrambling');
    el.classList.add('animate-underline');
    sessionStorage.setItem('seenScramble','1');
    return;
  }
  let running = false;
  window.runScrambleOnce = function() {
    if (running) return;
    running = true;
    const orig = el.dataset.scrambleOrig || el.textContent;
    el.dataset.scrambleOrig = orig;
    const chars = SCRAMBLE_CONFIG.charset;
    const len = orig.length;
    const revealOrder = [];
    for (let i=0; i<len; ++i) revealOrder.push(i);
    if (SCRAMBLE_CONFIG.randomOrder) {
      for (let i = revealOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [revealOrder[i], revealOrder[j]] = [revealOrder[j], revealOrder[i]];
      }
    }
    let revealed = Array(len).fill(false);
    let frame = 0, done = false;
    const totalFrames = Math.ceil(SCRAMBLE_CONFIG.durationMs / (1000/60));
    el.classList.add('scrambling');
    // Early exit: on key/click, finish immediately
    const finish = () => {
      if (done) return;
      done = true;
      el.textContent = orig;
      el.classList.remove('scrambling');
      el.classList.add('animate-underline');
      sessionStorage.setItem('seenScramble','1');
      window.removeEventListener('keydown', finish, true);
      window.removeEventListener('mousedown', finish, true);
    };
    window.addEventListener('keydown', finish, true);
    window.addEventListener('mousedown', finish, true);
    let lastUpdate = performance.now();
    function animate(now) {
      if (done) return;
      const progress = Math.min(1, frame / totalFrames);
      let revealCount = Math.floor(progress * len);
      if (SCRAMBLE_CONFIG.randomOrder) {
        for (let i=0; i<revealCount; ++i) revealed[revealOrder[i]] = true;
      } else {
        for (let i=0; i<revealCount; ++i) revealed[i] = true;
      }
      if (!animate.lastTextUpdate || now - animate.lastTextUpdate >= SCRAMBLE_CONFIG.frameIntervalMs) {
        let out = '';
        for (let i=0; i<len; ++i) {
          const c = orig[i];
          if (c === ' ' || /[^A-Za-z0-9]/.test(c)) { out += c; continue; }
          out += revealed[i] ? c : chars[Math.floor(Math.random()*chars.length)];
        }
        el.textContent = out;
        animate.lastTextUpdate = now;
      }
      if (progress < 1) {
        frame++;
        requestAnimationFrame(animate);
      } else {
        finish();
      }
    }
    requestAnimationFrame(animate);
  };
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(window.runScrambleOnce, SCRAMBLE_CONFIG.delayMs);
  });
})();
// To use hex: SCRAMBLE_CONFIG.charset = '0123456789ABCDEF'.split('');
// To enable random order: SCRAMBLE_CONFIG.randomOrder = true;
// To add aria-live: // el.setAttribute('aria-live','polite'); 