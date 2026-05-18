# OzalpOS Phase 2 — Window Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a draggable, resizable window manager to OzalpOS so clicking the About and Experience dock icons opens real app windows on the desktop.

**Architecture:** All windows are created and destroyed dynamically in a new `windows.js` file via a `WindowManager` IIFE. `os.js` wires dock clicks to `WindowManager.open()`. Window chrome and content styles are appended to `os.css`. No framework, no build step.

**Tech Stack:** Vanilla JS (ES5-compatible), HTML5, CSS3 custom properties

---

### Task 1: Window Chrome Styles + Desktop Positioning Context

**Files:**
- Modify: `os.css`

- [ ] **Step 1: Add `position: relative` to the existing `#desktop` rule**

Find this block in `os.css` (around line 138):

```css
/* === Desktop === */
#desktop {
  background: var(--bg);
  display: flex;
  flex-direction: column;
}
```

Replace it with:

```css
/* === Desktop === */
#desktop {
  position: relative;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}
```

This makes `#desktop` the positioning context for absolute-positioned windows.

- [ ] **Step 2: Append all window chrome and content styles to the end of `os.css`**

```css
/* === App Windows === */
.os-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  min-width: 320px;
  min-height: 200px;
  user-select: none;
}

.window-titlebar {
  height: 32px;
  background: rgba(255,255,255,0.06);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: default;
  flex-shrink: 0;
}

.window-controls {
  display: flex;
  gap: 6px;
  margin-right: 12px;
  flex-shrink: 0;
}

.window-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: var(--line);
  padding: 0;
  cursor: default;
}

.window-btn.close {
  background: #ff5f57;
  cursor: pointer;
}

.window-btn.minimize { background: #febc2e; }
.window-btn.maximize { background: #28c840; }

.window-title {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  flex: 1;
  text-align: center;
}

.window-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  user-select: text;
  cursor: default;
}

.window-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
}

/* === Window Content === */
.win-body-text {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.7;
  margin: 0;
}

.exp-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.exp-entry {
  border-bottom: 1px solid var(--line);
  padding-bottom: 1.25rem;
}

.exp-entry:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.exp-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}

.exp-role,
.exp-location {
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.03em;
}

.exp-company {
  font-size: 1rem;
  font-weight: 600;
  color: var(--fg);
  margin: 0 0 0.3rem 0;
}

.exp-desc {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}
```

- [ ] **Step 3: Verify no visual change**

Open `index.html` in a browser. Boot through to the desktop. The desktop should look exactly as before — no windows appear yet because `windows.js` doesn't exist yet and the dock isn't wired.

- [ ] **Step 4: Commit**

```bash
git add os.css
git commit -m "feat: add window chrome and content styles to os.css"
```

---

### Task 2: Create `windows.js` — WindowManager

**Files:**
- Create: `windows.js`

- [ ] **Step 1: Create `windows.js` with the full WindowManager**

```js
// windows.js

var APPS = {
  about: {
    title: 'About',
    width: 480,
    height: 320,
    render: function() {
      return '<p class="win-body-text">I\'m Omar Ozalp, an ECE, CS &amp; Math student at Duke. I\'ve interned across Kuwait and Dubai, building data tools and consumer apps at companies ranging from real estate platforms to retail giants. I like working on problems that sit at the intersection of engineering and people.</p>';
    }
  },
  experience: {
    title: 'Experience',
    width: 520,
    height: 480,
    render: function() {
      return '<div class="exp-list">' +
        '<div class="exp-entry">' +
          '<div class="exp-meta"><span class="exp-role">Intern</span><span class="exp-location">Kuwait City, Kuwait</span></div>' +
          '<p class="exp-company">4Sale</p>' +
          '<p class="exp-desc">Used SQL to identify and flag malicious client activity within the platform.</p>' +
        '</div>' +
        '<div class="exp-entry">' +
          '<div class="exp-meta"><span class="exp-role">Intern</span><span class="exp-location">Dubai, UAE</span></div>' +
          '<p class="exp-company">Property Finder</p>' +
          '<p class="exp-desc">Developed data reports analyzing real estate market trends across the UAE.</p>' +
        '</div>' +
        '<div class="exp-entry">' +
          '<div class="exp-meta"><span class="exp-role">Intern</span><span class="exp-location">Dubai, UAE</span></div>' +
          '<p class="exp-company">Majid Al Futtaim</p>' +
          '<p class="exp-desc">Built features for a loyalty and rewards app, personalizing offers for users across the MAF portfolio.</p>' +
        '</div>' +
        '<div class="exp-entry">' +
          '<p class="exp-company">Delta Sigma Pi</p>' +
          '<p class="exp-desc">Co-ed Business Fraternity \xb7 Duke University</p>' +
        '</div>' +
      '</div>';
    }
  }
};

var WindowManager = (function() {
  var _counter = 200;
  var _idSeq = 0;

  function _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function focus(windowId) {
    var el = document.getElementById(windowId);
    if (!el) return;
    _counter++;
    el.style.zIndex = _counter;
  }

  function close(windowId) {
    var el = document.getElementById(windowId);
    if (el) el.parentNode.removeChild(el);
  }

  function _makeDraggable(win, titlebar) {
    titlebar.addEventListener('mousedown', function(e) {
      if (e.target.classList.contains('window-btn')) return;
      e.preventDefault();
      var startX = e.clientX - win.offsetLeft;
      var startY = e.clientY - win.offsetTop;

      function onMove(e) {
        var left = e.clientX - startX;
        var top  = e.clientY - startY;
        var maxLeft = window.innerWidth - 40;
        var maxTop  = window.innerHeight - 40;
        left = Math.max(-(win.offsetWidth - 40), Math.min(left, maxLeft));
        top  = Math.max(0, Math.min(top, maxTop));
        win.style.left = left + 'px';
        win.style.top  = top  + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function _makeResizable(win, handle) {
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var startY = e.clientY;
      var startW = win.offsetWidth;
      var startH = win.offsetHeight;

      function onMove(e) {
        var newW = Math.max(320, startW + (e.clientX - startX));
        var newH = Math.max(200, startH + (e.clientY - startY));
        win.style.width  = newW + 'px';
        win.style.height = newH + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function open(appId) {
    var app = APPS[appId];
    if (!app) return;

    _idSeq++;
    var windowId = 'window-' + _idSeq;

    var desktop = document.getElementById('desktop');
    if (!desktop) return;

    var vw = desktop.offsetWidth;
    var vh = desktop.offsetHeight;
    var left = Math.round((vw - app.width)  / 2) + _rand(-40, 40);
    var top  = Math.round((vh - app.height) / 2) + _rand(-30, 30);

    var win = document.createElement('div');
    win.className = 'os-window';
    win.id = windowId;
    win.style.width  = app.width  + 'px';
    win.style.height = app.height + 'px';
    win.style.left   = left + 'px';
    win.style.top    = top  + 'px';

    win.innerHTML =
      '<div class="window-titlebar">' +
        '<div class="window-controls">' +
          '<button class="window-btn close" aria-label="Close"></button>' +
          '<button class="window-btn minimize" aria-label="Minimize" disabled></button>' +
          '<button class="window-btn maximize" aria-label="Maximize" disabled></button>' +
        '</div>' +
        '<span class="window-title">' + app.title + '</span>' +
      '</div>' +
      '<div class="window-body">' + app.render() + '</div>' +
      '<div class="window-resize-handle" aria-hidden="true"></div>';

    win.addEventListener('mousedown', function() {
      focus(windowId);
    });

    win.querySelector('.window-btn.close').addEventListener('click', function(e) {
      e.stopPropagation();
      close(windowId);
    });

    _makeDraggable(win, win.querySelector('.window-titlebar'));
    _makeResizable(win, win.querySelector('.window-resize-handle'));

    desktop.appendChild(win);
    focus(windowId);
  }

  return { open: open, close: close, focus: focus };
})();
```

- [ ] **Step 2: Commit**

```bash
git add windows.js
git commit -m "feat: add windows.js — WindowManager with drag, resize, open, close"
```

---

### Task 3: Wire `index.html` and `os.js`

**Files:**
- Modify: `index.html`
- Modify: `os.js`

- [ ] **Step 1: Add `windows.js` script tag to `index.html`**

Find this line near the bottom of `index.html`:

```html
  <script src="os.js" defer></script>
```

Replace it with:

```html
  <script src="windows.js" defer></script>
  <script src="os.js" defer></script>
```

`windows.js` must come first so `WindowManager` is defined before `os.js` runs.

- [ ] **Step 2: Add `setupDock()` to `os.js`**

Add the following function before the `// --- Init ---` comment in `os.js`:

```js
// --- Dock ---
function setupDock() {
  document.querySelector('[aria-label="About"]')
    .addEventListener('click', function() { WindowManager.open('about'); });
  document.querySelector('[aria-label="Experience"]')
    .addEventListener('click', function() { WindowManager.open('experience'); });
}
```

- [ ] **Step 3: Call `setupDock()` in the `DOMContentLoaded` handler**

Find this block at the bottom of `os.js`:

```js
document.addEventListener('DOMContentLoaded', function() {
  setState('boot');
  runBootSequence();
  setupLogin();
  setupClock();
});
```

Replace it with:

```js
document.addEventListener('DOMContentLoaded', function() {
  setState('boot');
  runBootSequence();
  setupLogin();
  setupClock();
  setupDock();
});
```

- [ ] **Step 4: Verify in browser**

Open `index.html` in a browser and check the following:

1. Boot sequence plays and advances to login as before
2. Click to enter desktop — desktop appears as before
3. Click the **About** dock icon → an About window appears centered on screen with "OzalpOS" bio text
4. Click the **About** dock icon again → a second About window opens slightly offset from the first
5. Click the **Experience** dock icon → an Experience window appears with the four internship/club cards
6. Click and drag a window's titlebar → window moves freely around the desktop
7. Drag the bottom-right resize handle → window resizes, respects 320×200 minimum
8. Click the red close button → window disappears
9. Click a background window → it comes to the front (z-index increases)
10. **Finder**, **Terminal**, **Settings** dock icons do nothing (no handler)

- [ ] **Step 5: Commit**

```bash
git add index.html os.js
git commit -m "feat: wire dock clicks to WindowManager, open About and Experience windows"
```

---

### Task 4: Push to GitHub

- [ ] **Step 1: Push to origin**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel deployment**

Open the Vercel dashboard. A new deployment should trigger automatically. Once live:
- Boot → login → desktop works
- About and Experience windows open, drag, resize, and close correctly
- Finder, Terminal, Settings icons are inert
