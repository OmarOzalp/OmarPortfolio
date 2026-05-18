# OzalpOS Phase 2 — Window Manager Design Spec
**Date:** 2026-05-18

## Goal

Wire the dock icons to open draggable, resizable app windows on the desktop. Phase 2 delivers the window manager shell plus real content for the About and Experience apps. Finder, Terminal, and Settings remain inert.

## Architecture

### Files

```
windows.js   ← new: WindowManager object — spawn, close, focus, drag, resize, app registry
os.js        ← modify: import WindowManager, wire dock click handlers
os.css       ← modify: add window chrome styles (.os-window, titlebar, controls, resize handle)
index.html   ← modify: add <script src="windows.js" defer> before os.js
```

No new HTML structure beyond the script tag. All windows are created and destroyed dynamically in JS.

---

## Window Manager (`windows.js`)

### App Registry

A plain object mapping app IDs to metadata and a `render()` function:

```js
const APPS = {
  about: {
    title: 'About',
    width: 480,
    height: 320,
    render() { return '<p>...</p>'; }
  },
  experience: {
    title: 'Experience',
    width: 520,
    height: 480,
    render() { return '<div class="exp-list">...</div>'; }
  }
};
```

`render()` returns an HTML string injected into `.window-body`.

### WindowManager Object

```js
const WindowManager = {
  _counter: 200,   // base z-index for windows
  _idSeq: 0,       // auto-increment window ID

  open(appId),     // create and show a window for the given app
  close(windowId), // remove window div from DOM
  focus(windowId)  // bring window to front (increment z-index)
};
```

**`open(appId)`:**
1. Look up `APPS[appId]` — if not found, return silently
2. Increment `_idSeq`, assign `windowId = 'window-' + _idSeq`
3. Create the window div (see DOM structure below)
4. Position: centered on viewport with a small random offset (±40px x, ±30px y) so stacked windows don't perfectly overlap
5. Append to `#desktop`
6. Call `focus(windowId)`

**`close(windowId)`:**
- Remove the element with that ID from the DOM

**`focus(windowId)`:**
- Increment `_counter`
- Set `element.style.zIndex = _counter`

### Window DOM Structure

```html
<div class="os-window" id="window-{id}">
  <div class="window-titlebar">
    <div class="window-controls">
      <button class="window-btn close" aria-label="Close"></button>
      <button class="window-btn minimize" aria-label="Minimize" disabled></button>
      <button class="window-btn maximize" aria-label="Maximize" disabled></button>
    </div>
    <span class="window-title">{App Title}</span>
  </div>
  <div class="window-body">
    {render() output}
  </div>
  <div class="window-resize-handle" aria-hidden="true"></div>
</div>
```

- Clicking `.window-btn.close` calls `WindowManager.close(windowId)`
- `.window-btn.minimize` and `.window-btn.maximize` are `disabled` — decorative in Phase 2
- Clicking anywhere on `.os-window` calls `WindowManager.focus(windowId)`

### Drag (Titlebar)

- `mousedown` on `.window-titlebar` (not on `.window-controls`) starts drag
- Track `offsetX` and `offsetY` from the window's top-left corner to the mousedown point
- `mousemove` on `document`: set `window.style.left` and `window.style.top`
- Clamp so the titlebar is never fully off-screen (min: titlebar always at least 40px visible on each axis)
- `mouseup` on `document` ends drag and removes listeners

### Resize (Bottom-Right Handle)

- `mousedown` on `.window-resize-handle` starts resize
- `mousemove` on `document`: compute new width/height from `clientX`/`clientY` vs window origin
- Minimum size: 320px wide, 200px tall
- `mouseup` on `document` ends resize and removes listeners

### Initial Window Size and Position

Each app defines its default `width` and `height` in the registry. Initial position:

```js
left = (viewport.width  - width)  / 2 + randomOffset(-40, 40)
top  = (viewport.height - height) / 2 + randomOffset(-30, 30)
```

Windows use `position: absolute` within `#desktop` (which is `position: relative`).

---

## Dock Wiring (`os.js`)

After `setState('desktop')` is possible, attach click handlers to dock items:

```js
function setupDock() {
  document.querySelector('[aria-label="About"]')
    .addEventListener('click', () => WindowManager.open('about'));
  document.querySelector('[aria-label="Experience"]')
    .addEventListener('click', () => WindowManager.open('experience'));
  // Finder, Terminal, Settings: no handler in Phase 2
}
```

Call `setupDock()` inside the `DOMContentLoaded` handler in `os.js`.

---

## App Content

### About Window

```html
<p class="win-body-text">
  I'm Omar Ozalp, an ECE, CS &amp; Math student at Duke. I've interned across Kuwait and Dubai,
  building data tools and consumer apps at companies ranging from real estate platforms to retail
  giants. I like working on problems that sit at the intersection of engineering and people.
</p>
```

### Experience Window

```html
<div class="exp-list">

  <div class="exp-entry">
    <div class="exp-meta">
      <span class="exp-role">Intern</span>
      <span class="exp-location">Kuwait City, Kuwait</span>
    </div>
    <p class="exp-company">4Sale</p>
    <p class="exp-desc">Used SQL to identify and flag malicious client activity within the platform.</p>
  </div>

  <div class="exp-entry">
    <div class="exp-meta">
      <span class="exp-role">Intern</span>
      <span class="exp-location">Dubai, UAE</span>
    </div>
    <p class="exp-company">Property Finder</p>
    <p class="exp-desc">Developed data reports analyzing real estate market trends across the UAE.</p>
  </div>

  <div class="exp-entry">
    <div class="exp-meta">
      <span class="exp-role">Intern</span>
      <span class="exp-location">Dubai, UAE</span>
    </div>
    <p class="exp-company">Majid Al Futtaim</p>
    <p class="exp-desc">Built features for a loyalty and rewards app, personalizing offers for users across the MAF portfolio.</p>
  </div>

  <div class="exp-entry">
    <p class="exp-company">Delta Sigma Pi</p>
    <p class="exp-desc">Co-ed Business Fraternity · Duke University</p>
  </div>

</div>
```

---

## Styles (`os.css` additions)

### Window Chrome

```css
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
  border: 1px solid rgba(0,0,0,0.2);
  background: var(--line);
  cursor: default;
  padding: 0;
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
```

### Window Content Styles

```css
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

### Desktop as Positioning Context

`#desktop` must be `position: relative` so absolute-positioned windows are contained within it (below the menubar, above the dock):

```css
#desktop {
  position: relative; /* add to existing rule */
}
```

---

## What Phase 2 Does NOT Include

- Finder, Terminal, Settings window content (Phase 3)
- Window minimize behavior (Phase 3)
- Window maximize / full-screen (Phase 3)
- Desktop icons or files (later phase)
- Menubar dropdowns that reflect the focused app (later phase)
- Keyboard shortcuts (later phase)
- Mobile layout (desktop-first)
