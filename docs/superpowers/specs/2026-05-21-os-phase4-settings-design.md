# OzalpOS Phase 4 — Settings App Design Spec
**Date:** 2026-05-21

## Goal

Add a functional Settings app to the OzalpOS desktop. Users can change wallpaper, toggle light/dark theme, adjust cursor size, and reposition the dock. Settings persist via `localStorage`.

---

## Architecture

### Files

```
settings.js   ← new: Settings state manager (load/save/apply)
style.css     ← modify: add light theme CSS vars under html[data-theme="light"]
os.css        ← modify: add wallpaper backgrounds, cursor rules, dock-right layout, Settings window styles
windows.js    ← modify: add settings APPS entry with sidebar + panel layout and onMount wiring
index.html    ← modify: restore Settings dock item (tabindex="0", remove aria-disabled); add settings.js script tag
os.js         ← modify: add 'Settings': 'settings' to setupDock() items map
```

### Script Load Order

```html
<script src="settings.js" defer></script>
<script src="terminal.js" defer></script>
<script src="windows.js" defer></script>
<script src="os.js" defer></script>
```

`settings.js` must be first so settings are applied to `<html>` before any other script runs — preventing a flash of wrong theme/wallpaper at boot.

### How Settings Are Applied

All settings are applied by setting `data-*` attributes on `<html>`:

| Setting | Attribute | Values |
|---------|-----------|--------|
| Wallpaper | `data-wallpaper` | `default`, `dots`, `grid`, `sunset`, `ocean`, `aurora` |
| Theme | `data-theme` | `dark`, `light` |
| Cursor size | `data-cursor` | `small`, `medium`, `large` |
| Dock position | `data-dock` | `bottom`, `right` |

CSS rules react to these attributes — no JS touching individual visual elements.

---

## Settings Module (`settings.js`)

IIFE pattern, consistent with `terminal.js`. Exposes a global `Settings` object.

```js
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
    html.setAttribute('data-theme',    state.theme);
    html.setAttribute('data-wallpaper', state.wallpaper);
    html.setAttribute('data-cursor',   state.cursorSize);
    html.setAttribute('data-dock',     state.dockPosition);
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

---

## Data Layer

One `localStorage` key: `ozalpos_settings`. JSON string, max ~100 bytes.

```json
{
  "wallpaper":    "default",
  "theme":        "dark",
  "cursorSize":   "medium",
  "dockPosition": "bottom"
}
```

---

## Settings Window

### Dimensions

640px wide × 440px tall (same as Finder).

### Layout

```
┌──────────────────────────────────────────────┐
│ [●][●][●]              Settings              │
├──────────────┬───────────────────────────────┤
│ PREFERENCES  │                               │
│              │    [panel content]            │
│ Wallpaper    │                               │
│ Appearance   │                               │
│ Cursor       │                               │
│ Dock         │                               │
└──────────────┴───────────────────────────────┘
   .finder-sidebar     .settings-main
```

The sidebar reuses existing `.finder-sidebar`, `.finder-sidebar-item`, `.finder-sidebar-section`, and `.finder-sidebar-icon` classes exactly. The right area uses a new `.settings-main` class (padded, flex column). Default panel on open: Wallpaper.

### `bodyClass`

`window-body--flush` — same as Finder, so the sidebar + panel fill the window body edge to edge.

### Sidebar Icons

- Wallpaper: image/landscape SVG
- Appearance: sun/moon SVG
- Cursor: mouse-pointer SVG
- Dock: layout-bottom SVG

---

## Panel Contents

### Wallpaper Panel

Section title: "Wallpaper"

Six swatches in a `.settings-swatch-grid`. Each swatch is a 72×52px clickable div with a rounded border. The active swatch has a `--fg`-colored ring (outline). Clicking calls `Settings.set('wallpaper', key)` and re-renders the panel to update the selected state.

| Key | CSS Background |
|-----|---------------|
| `default` | `var(--bg)` (solid) |
| `dots` | `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)` at 20px 20px |
| `grid` | `linear-gradient` crosshatch at rgba(255,255,255,0.08) |
| `sunset` | `linear-gradient(135deg, #ff6b35, #f7c59f)` |
| `ocean` | `linear-gradient(135deg, #1a6b8a, #2ec4b6)` |
| `aurora` | `linear-gradient(135deg, #7b2d8b, #00c9a7)` |

Applied to `#desktop-bg` via CSS:
```css
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
```

### Appearance Panel

Section title: "Appearance"

Two buttons side by side (`.settings-option-row`): **Dark** and **Light**. Active button has background `var(--line)` and `var(--fg)` border. Clicking calls `Settings.set('theme', value)`. Using `var(--line)` ensures the active highlight works correctly in both dark and light themes.

Light theme CSS vars (added to `style.css`):
```css
html[data-theme="light"] {
  --bg:   #f0f0f0;
  --fg:   #111111;
  --muted: #555555;
  --line: rgba(0,0,0,0.12);
}
```

### Cursor Panel

Section title: "Cursor Size"

Three options in a `.settings-option-row`: **Small**, **Medium**, **Large**. Active option highlighted. Clicking calls `Settings.set('cursorSize', value)`.

Applied via CSS on `body`:
```css
html[data-cursor="small"]  body {
  cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M1 1l8 4-4 1-3 6z' fill='white' stroke='black' stroke-width='1'/></svg>") 0 0, auto;
}
html[data-cursor="medium"] body { cursor: auto; }
html[data-cursor="large"]  body {
  cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path d='M2 2l18 9-9 2-7 14z' fill='white' stroke='black' stroke-width='1.5'/></svg>") 0 0, auto;
}
```

Small = 12px arrow, Medium = system default cursor, Large = 28px arrow. Both custom sizes use a white-filled arrow with a black stroke for visibility on any background.

### Dock Panel

Section title: "Dock Position"

Two options: **Bottom** and **Right**. Clicking calls `Settings.set('dockPosition', value)`.

**Bottom** (default): existing flex-column layout, dock at bottom with horizontal `dock-inner`.

**Right**: CSS grid layout applied to `#desktop` when `html[data-dock="right"]`:
```css
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
```

---

## New CSS Classes (`os.css` additions)

```css
.settings-main             /* right panel — flex column, padding 1.25rem 1.5rem */
.settings-section-title    /* panel heading — 0.7rem, muted, uppercase, letter-spacing */
.settings-swatch-grid      /* flex wrap, gap 0.75rem */
.settings-swatch           /* 72×52px swatch — border-radius 6px, border var(--line) */
.settings-swatch.active    /* outline 2px var(--fg), outline-offset 2px */
.settings-option-row       /* flex row, gap 0.5rem, margin-top 0.75rem */
.settings-option-btn       /* flex option button — padding, border, border-radius 6px */
.settings-option-btn.active /* bg var(--line), border-color var(--fg) */
```

---

## What Phase 4 Does NOT Include

- Per-app font size or zoom
- Custom wallpaper upload
- Multiple cursor themes
- Dock auto-hide
- Display resolution changes
