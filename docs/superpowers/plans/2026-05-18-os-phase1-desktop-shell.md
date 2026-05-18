# OzalpOS Phase 1 — Desktop Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current scroll portfolio with a retro macOS-inspired desktop OS shell: boot sequence → login screen → desktop with menubar and dock.

**Architecture:** Pure HTML/CSS/JS, no framework, no build step. A JS state machine in `os.js` drives three full-screen layers (`#boot`, `#login`, `#desktop`) via an `active` CSS class. `os.css` contains all OS styles. The current `script.js`, `styles.css` are deleted; `style.css` is stripped to CSS variables only; `index.html` is fully rebuilt.

**Tech Stack:** HTML5, CSS3 (custom properties, transitions, animations), vanilla JS (state machine, scramble animation, clock)

---

### Task 1: Cleanup — delete old files, strip style.css

**Files:**
- Delete: `styles.css`
- Delete: `script.js`
- Modify: `style.css` (replace entire contents)

- [ ] **Step 1: Delete unused and superseded files**

```bash
cd /Users/omarozalp/Desktop/OmarPortfolio
git rm styles.css script.js
```

Expected output:
```
rm 'script.js'
rm 'styles.css'
```

- [ ] **Step 2: Replace style.css with CSS variables only**

Replace the entire contents of `style.css` with:

```css
:root {
  --bg: #111;
  --fg: #f0f0f0;
  --muted: #888;
  --line: rgba(255,255,255,0.12);
  --accent: #f0f0f0;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}
```

- [ ] **Step 3: Verify style.css has only the above content**

Read `style.css` and confirm it has exactly 12 lines — the `:root` block, the universal selector, and nothing else.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "chore: strip to CSS variables, remove legacy files"
```

---

### Task 2: Create os.css — all OS styles

**Files:**
- Create: `os.css`

- [ ] **Step 1: Create `os.css` with the complete contents below**

```css
/* === Base === */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: 'SF Mono', ui-monospace, 'Fira Mono', 'Consolas', monospace;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* === State Layers === */
#boot,
#login,
#desktop {
  position: fixed;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

#boot.active,
#login.active,
#desktop.active {
  opacity: 1;
  pointer-events: auto;
}

/* login→desktop uses a quicker fade */
#login {
  transition: opacity 0.2s ease;
}

/* === Boot Screen === */
#boot {
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

#boot-title {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--fg);
  margin: 0;
}

.boot-progress-track {
  width: 220px;
  height: 14px;
  border: 1.5px solid rgba(255,255,255,0.3);
  border-radius: 2px;
  background: #000;
  overflow: hidden;
}

.boot-progress-fill {
  height: 100%;
  width: 0%;
  background: var(--fg);
  border-radius: 1px;
  transition: width 3s linear;
}

.boot-progress-fill.go {
  width: 100%;
}

#boot-status {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.06em;
  margin: 0;
  min-height: 1.2em;
}

/* === Login Screen === */
#login {
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
}

.login-system-label {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
}

.login-welcome {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--fg);
  margin: 0;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
}

.blink-cursor {
  display: inline-block;
  margin-left: 0.1em;
  animation: blink 1s step-end infinite;
  color: var(--fg);
  font-weight: 400;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

.login-hint {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  margin: 0.5rem 0 0 0;
}

/* === Desktop === */
#desktop {
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

/* === Menubar === */
#menubar {
  height: 28px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
  user-select: none;
  gap: 0;
}

.menubar-brand {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--fg);
  margin-right: 1.5rem;
  flex-shrink: 0;
}

.menubar-item {
  font-size: 0.75rem;
  color: var(--fg);
  padding: 0 0.6rem;
  height: 28px;
  display: flex;
  align-items: center;
  cursor: default;
  border-radius: 3px;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.menubar-item:hover {
  background: rgba(255,255,255,0.1);
}

.menubar-spacer {
  flex: 1;
}

#menubar-clock {
  font-size: 0.72rem;
  color: var(--fg);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

/* === Desktop Background === */
#desktop-bg {
  flex: 1;
  background: var(--bg);
}

/* === Dock === */
#dock {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0 12px 0;
  flex-shrink: 0;
}

.dock-inner {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 8px 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08),
              0 4px 16px rgba(0,0,0,0.4);
}

.dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
  position: relative;
  padding: 4px 6px 0 6px;
}

.dock-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--line);
  color: var(--fg);
  transition: transform 0.15s ease;
}

.dock-icon svg {
  width: 22px;
  height: 22px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dock-item:hover .dock-icon {
  transform: scale(1.15) translateY(-4px);
}

.dock-label {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20,20,20,0.92);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 0.62rem;
  color: var(--fg);
  letter-spacing: 0.03em;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.dock-item:hover .dock-label {
  opacity: 1;
}
```

- [ ] **Step 2: Verify the file was created**

```bash
wc -l /Users/omarozalp/Desktop/OmarPortfolio/os.css
```

Expected: approximately 190 lines.

- [ ] **Step 3: Commit**

```bash
git add os.css
git commit -m "feat: add os.css — full OS shell styles"
```

---

### Task 3: Rebuild index.html

**Files:**
- Modify: `index.html` (full replacement)

- [ ] **Step 1: Replace the entire contents of `index.html` with the following**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>OzalpOS</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="os.css">
</head>
<body>

  <!-- Boot Screen -->
  <div id="boot">
    <h1 id="boot-title">OzalpOS</h1>
    <div class="boot-progress-track">
      <div class="boot-progress-fill" id="boot-progress"></div>
    </div>
    <p id="boot-status">Initializing...</p>
  </div>

  <!-- Login Screen -->
  <div id="login">
    <p class="login-system-label">OzalpOS</p>
    <h2 class="login-welcome">Welcome, User<span class="blink-cursor">█</span></h2>
    <p class="login-hint">Click anywhere to enter</p>
  </div>

  <!-- Desktop -->
  <div id="desktop">

    <header id="menubar" aria-label="Menu bar">
      <span class="menubar-brand">OzalpOS</span>
      <span class="menubar-item">Finder</span>
      <span class="menubar-item">File</span>
      <span class="menubar-item">Edit</span>
      <span class="menubar-item">View</span>
      <span class="menubar-item">Window</span>
      <span class="menubar-item">Help</span>
      <span class="menubar-spacer"></span>
      <span id="menubar-clock" aria-live="off"></span>
    </header>

    <main id="desktop-bg"></main>

    <nav id="dock" aria-label="Dock">
      <div class="dock-inner">

        <div class="dock-item" role="button" aria-label="About" tabindex="0">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <span class="dock-label">About</span>
        </div>

        <div class="dock-item" role="button" aria-label="Experience" tabindex="0">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <span class="dock-label">Experience</span>
        </div>

        <div class="dock-item" role="button" aria-label="Finder" tabindex="0">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
          </div>
          <span class="dock-label">Finder</span>
        </div>

        <div class="dock-item" role="button" aria-label="Terminal" tabindex="0">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="3" width="20" height="18" rx="2"/>
              <path d="M7 9l3 3-3 3M12 15h5"/>
            </svg>
          </div>
          <span class="dock-label">Terminal</span>
        </div>

        <div class="dock-item" role="button" aria-label="Settings" tabindex="0">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <span class="dock-label">Settings</span>
        </div>

      </div>
    </nav>

  </div>

  <script src="os.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Open `index.html` in a browser and verify**

Without `os.js` in place yet, the page should be blank (all three layers have `opacity: 0` from `os.css`). This confirms the CSS is loading correctly and the state machine hasn't run yet.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: rebuild index.html as OzalpOS shell"
```

---

### Task 4: Create os.js — state machine, boot, login, clock

**Files:**
- Create: `os.js`

- [ ] **Step 1: Create `os.js` with the complete contents below**

```js
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
    return;
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
    window.removeEventListener('click', advance);
    window.removeEventListener('keydown', advance);
    clearTimeout(advanceTimer);
    statusTimers.forEach(clearTimeout);
    setState('login');
  }

  window.addEventListener('click', advance);
  window.addEventListener('keydown', advance);

  // Scramble the title text
  scrambleText(titleEl, 'OzalpOS', 900);

  // Trigger progress bar fill (must happen after paint)
  setTimeout(function() {
    if (!skipped) progressEl.classList.add('go');
  }, 50);

  // Cycle status messages evenly across the boot duration
  var msgInterval = BOOT_DURATION_MS / BOOT_STATUS_MESSAGES.length;
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

// --- Init ---
document.addEventListener('DOMContentLoaded', function() {
  setState('boot');
  runBootSequence();
  setupLogin();
  setupClock();
});
```

- [ ] **Step 2: Open `index.html` in a browser and verify the full flow**

Check each stage:
- **Boot:** "OzalpOS" title scrambles in from binary characters. A progress bar fills left-to-right over ~3.5 seconds. Status text cycles through "Initializing..." → "Loading preferences..." → "Starting up..." → "Welcome."
- **Transition:** After 3.5 seconds (or on click/keypress), the boot screen fades out and the login screen fades in.
- **Login:** Dark screen with small "OZALPOS" label at top, "Welcome, User█" with blinking cursor, and "Click anywhere to enter" hint.
- **Transition:** Clicking anywhere on the login screen produces a quick fade to the desktop.
- **Desktop:** Menubar at top (OzalpOS brand, menu items, live clock on right). Dark `#111` desktop background. Dock centered at bottom with 5 icons. Hovering any dock icon scales it up and shows its label tooltip above.

- [ ] **Step 3: Verify clock shows correct time**

The menubar clock should display the current time in `HH:MM` format.

- [ ] **Step 4: Commit**

```bash
git add os.js
git commit -m "feat: add os.js — state machine, boot sequence, login, clock"
```

---

### Task 5: Push to GitHub

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel auto-deploys**

Go to the Vercel dashboard. A new deployment should trigger from the push. Once live, open the URL and verify the full boot → login → desktop flow works in the browser.
