# OzalpOS Phase 4 — Settings App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a functional Settings app with wallpaper, theme, cursor size, and dock position controls — persisted via localStorage.

**Architecture:** A new `settings.js` IIFE loads settings from localStorage, applies them as `data-*` attributes on `<html>`, and exposes `Settings.get/set`. CSS reacts to those attributes for all visual changes. The Settings window reuses the Finder sidebar layout pattern. `settings.js` loads before all other scripts so settings are applied before the boot screen renders.

**Tech Stack:** Vanilla JS (ES5/var), HTML5, CSS3 custom properties — no framework, no build step.

---

### Task 1: Create `settings.js`

**Files:**
- Create: `settings.js`

- [ ] **Step 1: Create `settings.js` with the full Settings module**

```js
// settings.js

var Settings = (function() {

  var KEY = 'ozalpos_settings';

  var DEFAULTS = {
    wallpaper:    'default',
    theme:        'dark',
    cursorSize:   'medium',
    dockPosition: 'bottom'
  };

  function load() {
    try {
      var stored = JSON.parse(localStorage.getItem(KEY));
      return Object.assign({}, DEFAULTS, stored || {});
    } catch(e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {}
  }

  function apply(state) {
    var html = document.documentElement;
    html.setAttribute('data-theme',     state.theme);
    html.setAttribute('data-wallpaper', state.wallpaper);
    html.setAttribute('data-cursor',    state.cursorSize);
    html.setAttribute('data-dock',      state.dockPosition);
  }

  var _state = load();
  apply(_state);

  function get(key) { return _state[key]; }

  function set(key, value) {
    _state[key] = value;
    save(_state);
    apply(_state);
  }

  return { get: get, set: set };

})();
```

- [ ] **Step 2: Commit**

```bash
git add settings.js
git commit -m "feat: add settings.js — localStorage settings manager"
```

---

### Task 2: Add CSS — light theme, wallpapers, cursors, dock-right, Settings window

**Files:**
- Modify: `style.css`
- Modify: `os.css`

- [ ] **Step 1: Append light theme vars to `style.css`**

Add at the end of `style.css` (after the `box-sizing` block):

```css
html[data-theme="light"] {
  --bg:    #f0f0f0;
  --fg:    #111111;
  --muted: #555555;
  --line:  rgba(0,0,0,0.12);
}
```

- [ ] **Step 2: Append all Phase 4 styles to the end of `os.css`**

```css
/* === Wallpapers === */
html[data-wallpaper="default"] #desktop-bg { background: var(--bg); }

html[data-wallpaper="dots"] #desktop-bg {
  background-color: var(--bg);
  background-image: radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px);
  background-size: 20px 20px;
}

html[data-wallpaper="grid"] #desktop-bg {
  background-color: var(--bg);
  background-image: linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}

html[data-wallpaper="sunset"] #desktop-bg { background: linear-gradient(135deg, #ff6b35, #f7c59f); }
html[data-wallpaper="ocean"]  #desktop-bg { background: linear-gradient(135deg, #1a6b8a, #2ec4b6); }
html[data-wallpaper="aurora"] #desktop-bg { background: linear-gradient(135deg, #7b2d8b, #00c9a7); }

/* === Cursor Sizes === */
html[data-cursor="small"] body {
  cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M1 1l8 4-4 1-3 6z' fill='white' stroke='black' stroke-width='1'/></svg>") 0 0, auto;
}

html[data-cursor="medium"] body { cursor: auto; }

html[data-cursor="large"] body {
  cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path d='M2 2l18 9-9 2-7 14z' fill='white' stroke='black' stroke-width='1.5'/></svg>") 0 0, auto;
}

/* === Dock Position: Right === */
html[data-dock="right"] #desktop {
  display: grid;
  grid-template-areas: "menubar menubar" "bg dock";
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr;
}

html[data-dock="right"] #menubar    { grid-area: menubar; }
html[data-dock="right"] #desktop-bg { grid-area: bg; }
html[data-dock="right"] #dock       { grid-area: dock; padding: 12px 8px; }
html[data-dock="right"] .dock-inner { flex-direction: column; }

/* === Settings Window === */
.settings-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
}

.settings-section-title {
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 0.75rem 0;
}

.settings-swatch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.settings-swatch {
  width: 72px;
  height: 52px;
  border-radius: 6px;
  border: 1.5px solid var(--line);
  cursor: default;
  flex-shrink: 0;
}

.settings-swatch.active {
  outline: 2px solid var(--fg);
  outline-offset: 2px;
}

/* Swatch preview backgrounds (always dark-base for pattern swatches) */
.settings-swatch[data-wallpaper="default"] { background: var(--bg); }
.settings-swatch[data-wallpaper="dots"] {
  background-color: #111;
  background-image: radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px);
  background-size: 20px 20px;
}
.settings-swatch[data-wallpaper="grid"] {
  background-color: #111;
  background-image: linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}
.settings-swatch[data-wallpaper="sunset"] { background: linear-gradient(135deg, #ff6b35, #f7c59f); }
.settings-swatch[data-wallpaper="ocean"]  { background: linear-gradient(135deg, #1a6b8a, #2ec4b6); }
.settings-swatch[data-wallpaper="aurora"] { background: linear-gradient(135deg, #7b2d8b, #00c9a7); }

.settings-option-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.settings-option-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--fg);
  font-family: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  cursor: default;
}

.settings-option-btn:hover {
  background: rgba(255,255,255,0.05);
}

.settings-option-btn.active {
  background: var(--line);
  border-color: var(--fg);
}
```

- [ ] **Step 3: Verify in browser (visual only — no interactions yet)**

Open `index.html`. Boot through to desktop. Nothing should look different from Phase 3 — no new CSS classes are used yet.

- [ ] **Step 4: Commit**

```bash
git add style.css os.css
git commit -m "feat: add light theme, wallpaper, cursor, dock-right and Settings styles"
```

---

### Task 3: Add Settings app to `windows.js`

**Files:**
- Modify: `windows.js`

- [ ] **Step 1: Add the `settings` entry to the `APPS` object**

In `windows.js`, add the following entry after the closing brace of the `terminal` entry (before line 162 — the closing `};` of APPS). The `terminal` entry ends at line 161. Insert between the closing `}` of `terminal` and the `};` that closes APPS:

```js
  ,settings: {
    title: 'Settings',
    width: 640,
    height: 440,
    bodyClass: 'window-body--flush',
    render: function() {
      return '<div class="finder-body">' +
        '<div class="finder-sidebar">' +
          '<div class="finder-sidebar-section">Preferences</div>' +
          '<div class="finder-sidebar-item active" data-panel="wallpaper">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
            'Wallpaper' +
          '</div>' +
          '<div class="finder-sidebar-item" data-panel="appearance">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
            'Appearance' +
          '</div>' +
          '<div class="finder-sidebar-item" data-panel="cursor">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 9-7 1-4 7z"/></svg>' +
            'Cursor' +
          '</div>' +
          '<div class="finder-sidebar-item" data-panel="dock">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>' +
            'Dock' +
          '</div>' +
        '</div>' +
        '<div class="settings-main"></div>' +
      '</div>';
    },
    onMount: function(win) {
      var main         = win.querySelector('.settings-main');
      var sidebarItems = win.querySelectorAll('.finder-sidebar-item');

      var WALLPAPERS = [
        { key: 'default', label: 'Default' },
        { key: 'dots',    label: 'Dots'    },
        { key: 'grid',    label: 'Grid'    },
        { key: 'sunset',  label: 'Sunset'  },
        { key: 'ocean',   label: 'Ocean'   },
        { key: 'aurora',  label: 'Aurora'  }
      ];

      function setActive(panel) {
        sidebarItems.forEach(function(item) {
          item.classList.toggle('active', item.getAttribute('data-panel') === panel);
        });
      }

      function renderWallpaper() {
        var current = Settings.get('wallpaper');
        var html = '<div class="settings-section-title">Wallpaper</div><div class="settings-swatch-grid">';
        WALLPAPERS.forEach(function(w) {
          html += '<div class="settings-swatch' + (current === w.key ? ' active' : '') +
                  '" data-wallpaper="' + w.key + '" title="' + w.label + '"></div>';
        });
        html += '</div>';
        main.innerHTML = html;
        setActive('wallpaper');
      }

      function renderAppearance() {
        var current = Settings.get('theme');
        main.innerHTML =
          '<div class="settings-section-title">Appearance</div>' +
          '<div class="settings-option-row">' +
            '<button class="settings-option-btn' + (current === 'dark'  ? ' active' : '') + '" data-theme="dark">Dark</button>' +
            '<button class="settings-option-btn' + (current === 'light' ? ' active' : '') + '" data-theme="light">Light</button>' +
          '</div>';
        setActive('appearance');
      }

      function renderCursor() {
        var current = Settings.get('cursorSize');
        main.innerHTML =
          '<div class="settings-section-title">Cursor Size</div>' +
          '<div class="settings-option-row">' +
            '<button class="settings-option-btn' + (current === 'small'  ? ' active' : '') + '" data-cursor="small">Small</button>' +
            '<button class="settings-option-btn' + (current === 'medium' ? ' active' : '') + '" data-cursor="medium">Medium</button>' +
            '<button class="settings-option-btn' + (current === 'large'  ? ' active' : '') + '" data-cursor="large">Large</button>' +
          '</div>';
        setActive('cursor');
      }

      function renderDock() {
        var current = Settings.get('dockPosition');
        main.innerHTML =
          '<div class="settings-section-title">Dock Position</div>' +
          '<div class="settings-option-row">' +
            '<button class="settings-option-btn' + (current === 'bottom' ? ' active' : '') + '" data-dock-pos="bottom">Bottom</button>' +
            '<button class="settings-option-btn' + (current === 'right'  ? ' active' : '') + '" data-dock-pos="right">Right</button>' +
          '</div>';
        setActive('dock');
      }

      sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
          var panel = item.getAttribute('data-panel');
          if (panel === 'wallpaper')        renderWallpaper();
          else if (panel === 'appearance')  renderAppearance();
          else if (panel === 'cursor')      renderCursor();
          else if (panel === 'dock')        renderDock();
        });
      });

      main.addEventListener('click', function(e) {
        var swatchEl = e.target.closest('[data-wallpaper]');
        var themeEl  = e.target.closest('[data-theme]');
        var cursorEl = e.target.closest('[data-cursor]');
        var dockEl   = e.target.closest('[data-dock-pos]');
        if (swatchEl) {
          Settings.set('wallpaper', swatchEl.getAttribute('data-wallpaper'));
          renderWallpaper();
        } else if (themeEl) {
          Settings.set('theme', themeEl.getAttribute('data-theme'));
          renderAppearance();
        } else if (cursorEl) {
          Settings.set('cursorSize', cursorEl.getAttribute('data-cursor'));
          renderCursor();
        } else if (dockEl) {
          Settings.set('dockPosition', dockEl.getAttribute('data-dock-pos'));
          renderDock();
        }
      });

      renderWallpaper();
    }
  }
```

The final structure of APPS after this change:
```
var APPS = {
  about:      { ... },
  experience: { ... },
  finder:     { ... },
  terminal:   { ... },
  settings:   { ... }   ← new
};
```

- [ ] **Step 2: Commit**

```bash
git add windows.js
git commit -m "feat: add Settings app to windows.js — wallpaper, appearance, cursor, dock panels"
```

---

### Task 4: Wire `index.html` and `os.js`

**Files:**
- Modify: `index.html`
- Modify: `os.js`

- [ ] **Step 1: Add `settings.js` script tag as the first script in `index.html`**

Find:
```html
  <script src="terminal.js" defer></script>
  <script src="windows.js" defer></script>
  <script src="os.js" defer></script>
```

Replace with:
```html
  <script src="settings.js" defer></script>
  <script src="terminal.js" defer></script>
  <script src="windows.js" defer></script>
  <script src="os.js" defer></script>
```

`settings.js` must be first — it applies `data-*` attributes to `<html>` before any rendering occurs.

- [ ] **Step 2: Restore `tabindex="0"` and remove `aria-disabled` from the Settings dock item in `index.html`**

Find:
```html
        <div class="dock-item" role="button" aria-label="Settings" tabindex="-1" aria-disabled="true">
```

Replace with:
```html
        <div class="dock-item" role="button" aria-label="Settings" tabindex="0">
```

- [ ] **Step 3: Add `'Settings': 'settings'` to `setupDock()` in `os.js`**

Find:
```js
  var items = { 'About': 'about', 'Experience': 'experience', 'Finder': 'finder', 'Terminal': 'terminal' };
```

Replace with:
```js
  var items = { 'About': 'about', 'Experience': 'experience', 'Finder': 'finder', 'Terminal': 'terminal', 'Settings': 'settings' };
```

- [ ] **Step 4: Verify in browser**

Boot through to desktop and check:

1. Clicking **Settings** dock icon opens a Settings window with Wallpaper/Appearance/Cursor/Dock sidebar
2. **Wallpaper panel**: 6 swatches visible; clicking a swatch changes `#desktop-bg` immediately
3. **Appearance panel**: Dark and Light buttons; clicking Light switches the entire UI to light colors; clicking Dark reverts
4. **Cursor panel**: Small/Medium/Large buttons; clicking Large gives a bigger cursor; clicking Medium restores default
5. **Dock panel**: Bottom and Right buttons; clicking Right moves dock to the right side; clicking Bottom moves it back
6. **Persistence**: Change a setting, reload the page — the setting is still applied on reload
7. **No regressions**: About, Experience, Finder, Terminal all still open and work correctly

- [ ] **Step 5: Commit**

```bash
git add index.html os.js
git commit -m "feat: wire Settings dock item, add settings.js script tag"
```

---

### Task 5: Push to GitHub

- [ ] **Step 1: Push to origin**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel deployment**

Open the Vercel dashboard and wait for the deployment to complete. Open the live URL, boot through, open Settings, and verify all four panels work on the deployed site.
