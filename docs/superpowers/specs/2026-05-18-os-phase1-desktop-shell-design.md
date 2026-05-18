# OzalpOS Phase 1 — Desktop Shell Design Spec
**Date:** 2026-05-18

## Goal

Replace the current scroll-based portfolio with a full retro macOS-inspired desktop OS experience. Phase 1 delivers the shell: boot sequence → login screen → desktop with menubar and dock. App windows and interactivity come in later phases.

## Aesthetic

Retro macOS (Mac OS 9 / early OS X era) — chunky, textured, more character than the modern flat aesthetic. Monochrome and dark. No color accents beyond the existing CSS variable palette.

## Audiences

Same as before: recruiters/internship hunting + general personal web presence.

## Architecture

### File Structure

```
index.html    ← rebuilt: three full-screen layers (boot, login, desktop)
os.js         ← new: state machine, boot sequence, clock, dock behavior
os.css        ← new: all OS-specific styles (boot, login, desktop, menubar, dock)
style.css     ← keep: CSS custom properties and theme logic only (strip hero/section styles)
```

- `styles.css` (unused legacy file) is deleted
- The existing hero, about, and experience HTML is removed from `index.html` — that content becomes app window content in Phase 2
- `script.js` is deleted — all JS moves to `os.js`. Logic to port: `getTimeTag()`, `pad()`, the text scramble function (used for `#boot-title`), and `setupThemeToggle()` is dropped entirely (no theme toggle in Phase 1)

**What stays in `style.css`:** Only the CSS custom property definitions and `@media (prefers-color-scheme)` block. All other rules (hero, sections, window cards, social links, etc.) are deleted — those styles either move to `os.css` or are no longer needed.

### State Machine

Three states managed by `os.js`:

```
boot  →  login  →  desktop
```

- State is a string variable: `'boot' | 'login' | 'desktop'`
- Each state corresponds to a full-screen `<div>` (`#boot`, `#login`, `#desktop`)
- Active state's div has class `active` (opacity 1, pointer-events on); others have opacity 0
- Transitions use CSS `transition: opacity 0.4s` — except login→desktop which is `0.2s` (quick fade)
- State machine function: `setState(next)` removes `active` from current, adds to next

### DOM Structure

```html
<body>
  <div id="boot">...</div>
  <div id="login">...</div>
  <div id="desktop">
    <header id="menubar">...</header>
    <main id="desktop-bg"></main>
    <nav id="dock">...</nav>
  </div>
</body>
```

---

## Screen Designs

### 1. Boot Screen (`#boot`)

**Layout:** Full-screen black. Content centered vertically and horizontally.

**Elements (top to bottom):**
1. `<h1 id="boot-title">OzalpOS</h1>` — monospace font, ~2rem, white. Binary scramble animation plays on this text on load (reuse scramble logic from old script.js, ported to os.js).
2. `<div class="boot-progress-bar">` — chunky retro progress bar. Outer container has inset border styling. Inner fill div animates from 0% to 100% width over 3 seconds via CSS animation.
3. `<p id="boot-status">` — small monospace text beneath the bar. JS cycles through: `"Initializing..."` → `"Loading preferences..."` → `"Starting up..."` → `"Welcome."` at intervals matching the progress animation.

**Behavior:**
- On `DOMContentLoaded`: scramble animation plays on `#boot-title`, then progress bar fills, then `setState('login')` after ~3.5 seconds
- Click or keydown anywhere during boot: immediately `setState('login')` (skip)

**Transition:** Fade out (opacity 0) over 0.4s → login fades in.

---

### 2. Login Screen (`#login`)

**Layout:** Full-screen dark background (matches desktop `--bg`). Content centered.

**Elements (top to bottom):**
1. `<p class="login-system-label">OzalpOS</p>` — small, monospace, muted color. System identifier at top.
2. `<h2 class="login-welcome">Welcome, User</h2>` — larger monospace, white. Main greeting.
3. A blinking cursor element `<span class="blink-cursor">█</span>` inline after the welcome text.
4. `<p class="login-hint">Click anywhere to enter</p>` — small, muted, below the greeting.

**Behavior:**
- Clicking anywhere on `#login`: `setState('desktop')` with a quick 0.2s fade

---

### 3. Desktop (`#desktop`)

#### Menubar (`#menubar`)

Pinned to top of viewport. Full width, height ~28px.

**Left side:** `<span class="menubar-brand">OzalpOS</span>` — monospace, slightly bold. Then standard Mac-style menu items as `<button>` elements: `Finder  File  Edit  View  Window  Help`. These are decorative in Phase 1 (no dropdowns yet).

**Right side:** `<span id="menubar-clock">` — live clock in monospace `HH:MM` format, updated every 60 seconds. Uses same `getTimeTag()` logic from old code, ported to `os.js`.

**Styling:** Retro — slight top border, background slightly lighter than desktop bg (like classic Mac pinstripe suggestion). Monospace font throughout.

#### Desktop Background (`#desktop-bg`)

Fills remaining space between menubar and dock. Solid dark color (`#111`). Empty in Phase 1 — desktop icons and files come in a later phase.

#### Dock (`#dock`)

Pinned to bottom of viewport. Centered horizontally. Retro chunky style.

**5 app icons:**

| App | Icon style | Label |
|-----|-----------|-------|
| About | Person silhouette SVG | About |
| Experience | Briefcase SVG | Experience |
| Finder | Folder SVG | Finder |
| Terminal | `>_` text/SVG | Terminal |
| Settings | Gear SVG | Settings |

All icons are monochrome SVGs matching `--fg` color.

**Dock container:** Has a retro raised/inset border — subtle `box-shadow` inset effect to suggest depth. Background slightly lighter than desktop. Slight border-radius on the container.

**Hover behavior:** Hovering an icon scales it up slightly (`transform: scale(1.15)`) with a CSS transition — classic dock magnification, but subtle (not the extreme macOS zoom).

**Click behavior:** Clicking any icon does nothing in Phase 1. Wired up in Phase 2 (window manager).

**Labels:** Each icon has a `<span class="dock-label">` beneath it that appears on hover only (opacity 0 → 1 on hover).

---

## Theme

- Light/dark theme toggle is removed from Phase 1 — the OS is always dark. Theme preferences can come back as a Settings app feature in a later phase.
- CSS variables from `style.css` are preserved: `--bg`, `--fg`, `--muted`, `--line`, `--accent`
- `--bg` defaults to `#111` (dark desktop)

---

## What This Phase Does NOT Include

- Functional app windows (Phase 2)
- Desktop file icons (later phase)
- Menubar dropdown menus (later phase)
- Dock badge notifications (later phase)
- Sound effects (later phase)
- Settings app functionality (later phase)
- Mobile/responsive layout (the OS experience is desktop-first)
