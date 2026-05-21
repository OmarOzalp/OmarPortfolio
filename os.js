// os.js

// --- Utilities ---
function pad(n) { return n < 10 ? '0' + n : n; }

function getTimeTag() {
  const d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// --- State Machine ---
const LAYERS = ['boot', 'login', 'desktop'];
let currentState = null;

function setState(next) {
  LAYERS.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === next);
  });
  currentState = next;
}

// --- Text Scramble ---
const SCRAMBLE_CHARSET = ['0', '1', '▮'];

function scrambleText(el, original, durationMs) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = original;
    return function cancel() {};
  }
  const len = original.length;
  const revealed = Array(len).fill(false);
  let done = false;
  const startTime = performance.now();

  function finish() {
    if (done) return;
    done = true;
    el.textContent = original;
  }

  function animate(now) {
    if (done) return;
    const progress = Math.min(1, (now - startTime) / durationMs);
    const revealCount = Math.floor(progress * len);
    for (let i = 0; i < revealCount; i++) revealed[i] = true;
    let out = '';
    for (let i = 0; i < len; i++) {
      const c = original[i];
      if (c === ' ' || /[^A-Za-z0-9]/.test(c)) { out += c; continue; }
      out += revealed[i] ? c : SCRAMBLE_CHARSET[Math.floor(Math.random() * SCRAMBLE_CHARSET.length)];
    }
    el.textContent = out;
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      finish();
    }
  }

  requestAnimationFrame(animate);
  return function cancel() { done = true; };
}

// --- Boot Sequence ---
const BOOT_DURATION_MS = 3500;
const BOOT_STATUS_MESSAGES = [
  'Initializing...',
  'Loading preferences...',
  'Starting up...',
  'Welcome.'
];

function runBootSequence() {
  const titleEl = document.getElementById('boot-title');
  const progressEl = document.getElementById('boot-progress');
  const statusEl = document.getElementById('boot-status');
  let skipped = false;
  let advanceTimer = null;
  let statusTimers = [];

  function advance() {
    if (skipped) return;
    skipped = true;
    cancelScramble();
    window.removeEventListener('click', advance);
    window.removeEventListener('keydown', handleKeydown);
    clearTimeout(advanceTimer);
    statusTimers.forEach(clearTimeout);
    setState('login');
  }

  window.addEventListener('click', advance);
  function handleKeydown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'F12' || e.key === 'Tab' || e.key === 'Shift') return;
    advance();
  }
  window.addEventListener('keydown', handleKeydown);

  // Scramble the title text
  const cancelScramble = scrambleText(titleEl, 'OzalpOS', 900);

  // Trigger progress bar fill (must happen after paint)
  setTimeout(function() {
    if (!skipped) progressEl.classList.add('go');
  }, 50);

  // Cycle status messages evenly across the boot duration
  const msgInterval = BOOT_DURATION_MS / BOOT_STATUS_MESSAGES.length;
  BOOT_STATUS_MESSAGES.forEach(function(msg, i) {
    statusTimers.push(setTimeout(function() {
      if (!skipped) statusEl.textContent = msg;
    }, i * msgInterval));
  });

  // Auto-advance after full duration
  advanceTimer = setTimeout(advance, BOOT_DURATION_MS);
}

// --- Login ---
function setupLogin() {
  document.getElementById('login').addEventListener('click', function() {
    if (currentState !== 'login') return;
    setState('desktop');
  });
}

// --- Menubar Clock ---
function updateClock() {
  const el = document.getElementById('menubar-clock');
  if (el) el.textContent = getTimeTag();
}

function setupClock() {
  updateClock();
  const clockInterval = setInterval(updateClock, 60000);
  window.addEventListener('beforeunload', function() {
    clearInterval(clockInterval);
  });
}

// --- Dock ---
function setupDock() {
  var items = { 'About': 'about', 'Experience': 'experience', 'Finder': 'finder', 'Terminal': 'terminal', 'Settings': 'settings' };
  Object.keys(items).forEach(function(label) {
    var el = document.querySelector('#dock [aria-label="' + label + '"]');
    if (!el) return;
    function activate() {
      if (currentState !== 'desktop') return;
      WindowManager.open(items[label]);
    }
    el.addEventListener('click', activate);
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', function() {
  setState('boot');
  runBootSequence();
  setupLogin();
  setupClock();
  setupDock();
});
