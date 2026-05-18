# OzalpOS Phase 3 — Finder + Terminal Design Spec
**Date:** 2026-05-19

## Goal

Add real content to the Finder and Terminal dock apps. Finder becomes a navigable project showcase. Terminal becomes a fake-but-convincing Linux shell. Settings is deferred to Phase 4.

## Architecture

### Files

```
windows.js   ← modify: add onMount hook to open(), add Finder + Terminal APPS entries
terminal.js  ← new: Terminal command interpreter and output renderer
os.css       ← modify: append Finder and Terminal window styles
index.html   ← modify: add <script src="terminal.js" defer> before windows.js
```

### onMount Hook

The current `APPS` registry only has `render()`. Terminal and Finder need JS to run after the window is in the DOM. Add an optional `onMount(windowEl)` field to each app:

```js
var APPS = {
  about:      { ..., onMount: null },
  experience: { ..., onMount: null },
  finder:     { ..., onMount: function(win) { /* wire Finder interactions */ } },
  terminal:   { ..., onMount: function(win) { /* wire Terminal input */ } }
};
```

In `WindowManager.open()`, after `desktop.appendChild(win)` and `focus(windowId)`, add:

```js
if (app.onMount) app.onMount(win);
```

### Script Load Order

`index.html` script tags (all `defer`, execute in document order):

```html
<script src="terminal.js" defer></script>
<script src="windows.js" defer></script>
<script src="os.js" defer></script>
```

`terminal.js` must load before `windows.js` because `windows.js` references `Terminal` (the command interpreter defined in `terminal.js`).

---

## Terminal App

### Window Dimensions

Default: 600px wide × 400px tall.

### Layout

```
┌─────────────────────────────────────┐
│ [●][●][●]        Terminal           │  ← .window-titlebar
├─────────────────────────────────────┤
│ OzalpOS 1.0 — omar@ozalpos          │  ← .term-output (scrollable, flex-grow)
│ Type 'help' for available commands. │
│                                     │
│ omar@ozalpos:~$ ls                  │
│ projects  downloads                 │
│                                     │
│ omar@ozalpos:~$ _                   │
├─────────────────────────────────────┤
│ omar@ozalpos:~$ [input field]       │  ← .term-input-row (fixed at bottom)
└─────────────────────────────────────┘
```

The output area is `overflow-y: auto` and scrolls to the bottom after each command. The input row is `flex-shrink: 0` at the bottom of a flex column.

### Prompt and Filesystem

Prompt string: `omar@ozalpos:~$` (updates to `omar@ozalpos:~/projects$` when in projects dir)

Two navigable directories:
- `~` (home): contains `projects/` and `downloads/`
- `~/projects`: contains `project_1.txt`, `project_2.txt`, `project_3.txt`

### Commands

| Input | Output |
|-------|--------|
| `help` | Lists all available commands |
| `ls` | Directory listing (short format) for current dir |
| `ls -la` | Long format with fake permissions, size, date |
| `pwd` | Current path (`/home/omar` or `/home/omar/projects`) |
| `whoami` | `omar` |
| `date` | Current date/time (real, via `new Date()`) |
| `echo <text>` | Repeats text back |
| `clear` | Clears all output |
| `uname -a` | `Linux ozalpos 5.15.0-ozalp #1 SMP x86_64 GNU/Linux` |
| `cd projects` | Changes to ~/projects (only valid from ~) |
| `cd ..` or `cd ~` | Returns to ~ (only valid from ~/projects) |
| `cd <anything else>` | `bash: cd: <dir>: No such file or directory` |
| Unknown command | `bash: <cmd>: command not found` |

### `ls` Output by Directory

**`~` (home):**
```
projects  downloads
```

**`~/projects`:**
```
project_1.txt  project_2.txt  project_3.txt
```

### `ls -la` Output by Directory

**`~` (home):**
```
total 24
drwxr-xr-x  4 omar omar 4096 May 19 10:00 .
drwxr-xr-x 12 root root 4096 May 19 10:00 ..
drwxr-xr-x  2 omar omar 4096 May 19 10:00 downloads
drwxr-xr-x  2 omar omar 4096 May 19 10:00 projects
```

**`~/projects`:**
```
total 20
drwxr-xr-x 2 omar omar 4096 May 19 10:00 .
drwxr-xr-x 4 omar omar 4096 May 19 10:00 ..
-rw-r--r-- 1 omar omar  512 May 19 10:00 project_1.txt
-rw-r--r-- 1 omar omar  512 May 19 10:00 project_2.txt
-rw-r--r-- 1 omar omar  512 May 19 10:00 project_3.txt
```

### `help` Output

```
Available commands:
  ls [-la]     list directory contents
  cd <dir>     change directory
  pwd          print working directory
  whoami       print current user
  date         print current date and time
  uname -a     print system information
  echo <text>  print text to terminal
  clear        clear the terminal
  help         show this help message
```

### Command History

Up arrow (`ArrowUp`) on the input field recalls the previous command. Down arrow (`ArrowDown`) returns to the current (empty) input. Only one level of history needed (last command only).

### Welcome Message

On mount, output area pre-populated with:
```
OzalpOS 1.0 — omar@ozalpos
Type 'help' for available commands.

```

### Terminal Module (`terminal.js`)

`terminal.js` exports a single global `Terminal` object:

```js
var Terminal = {
  create: function(win) { /* wire up the terminal in the given window element */ }
};
```

`create(win)` is called from the Finder/Terminal `onMount`. It:
1. Finds `.term-output` and `.term-input` within `win`
2. Appends the welcome message to output
3. Attaches `keydown` listener on `.term-input` for Enter (run command) and ArrowUp/Down (history)
4. Focuses `.term-input`

---

## Finder App

### Window Dimensions

Default: 640px wide × 440px tall.

### Layout

```
┌──────────────────────────────────────────────────┐
│ [●][●][●]              Finder                    │  ← .window-titlebar
├────────────┬─────────────────────────────────────┤
│ FAVORITES  │                                     │
│            │    [Projects/]   [Downloads/]       │  ← .finder-main
│ Home       │                                     │
│ Projects   │                                     │
│ Downloads  │                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
   .finder-sidebar     .finder-main
```

### Sidebar

Three items: **Home**, **Projects**, **Downloads**. Clicking one updates the main view. Active item has a highlight background.

### Main View — Home (default)

Two folder icons: `Projects` and `Downloads`. Clicking either navigates to that view (same as clicking the sidebar item).

### Main View — Projects

Three file icons: `project_1.txt`, `project_2.txt`, `project_3.txt`. Clicking any file shows the "Coming Soon" view.

### Main View — Downloads

Empty. Displays centered muted text: `This folder is empty.`

### Main View — Coming Soon (project file selected)

Centered panel:
```
project_1.txt

Coming Soon
```
File name in `--fg`, "Coming Soon" in `--muted`. A Back button or clicking a sidebar item returns to Projects view.

### Icons

Monochrome SVG icons, `stroke: currentColor`, matching the dock icon style:
- **Folder:** `<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>` (same as Finder dock icon)
- **File (txt):** `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>`

### Finder Wiring

`onMount(win)` in the Finder APPS entry handles all interactions via click delegation on `.finder-body`. State (current view, selected item) is local to the closure.

---

## Dock Wiring

In `os.js`, `setupDock()` already uses a `items` map. Extend it to include Finder and Terminal:

```js
var items = {
  'About':      'about',
  'Experience': 'experience',
  'Finder':     'finder',
  'Terminal':   'terminal'
};
```

Remove `aria-disabled="true"` and restore `tabindex="0"` on the Finder and Terminal dock items in `index.html`. Settings stays `aria-disabled` (Phase 4).

---

## Styles (`os.css` additions)

### Terminal

```css
.term-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  background: #0a0a0a;
  font-family: 'SF Mono', ui-monospace, 'Fira Mono', 'Consolas', monospace;
  font-size: 0.78rem;
  color: #c8c8c8;
}

.term-output {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.term-input-row {
  display: flex;
  align-items: center;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0.4rem 1rem;
  flex-shrink: 0;
}

.term-prompt {
  color: #5af78e;
  margin-right: 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.term-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #c8c8c8;
  font-family: inherit;
  font-size: inherit;
  caret-color: #5af78e;
}
```

### Finder

```css
.finder-body {
  display: flex;
  height: 100%;
  padding: 0;
}

.finder-sidebar {
  width: 160px;
  flex-shrink: 0;
  border-right: 1px solid var(--line);
  background: rgba(255,255,255,0.03);
  padding: 0.75rem 0;
}

.finder-sidebar-section {
  font-size: 0.6rem;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 0.75rem 0.35rem 0.75rem;
}

.finder-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.75rem;
  font-size: 0.75rem;
  color: var(--fg);
  cursor: default;
  border-radius: 4px;
  margin: 0 4px;
}

.finder-sidebar-item:hover {
  background: rgba(255,255,255,0.07);
}

.finder-sidebar-item.active {
  background: rgba(255,255,255,0.12);
}

.finder-sidebar-icon {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.finder-main {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.finder-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 0.5rem;
}

.finder-icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: default;
  padding: 0.5rem;
  border-radius: 6px;
  width: 80px;
}

.finder-icon-item:hover {
  background: rgba(255,255,255,0.07);
}

.finder-icon-item.selected {
  background: rgba(255,255,255,0.12);
}

.finder-icon-svg {
  width: 40px;
  height: 40px;
  stroke: var(--fg);
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.finder-icon-label {
  font-size: 0.68rem;
  color: var(--fg);
  text-align: center;
  word-break: break-word;
}

.finder-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.8rem;
  color: var(--muted);
}

.finder-coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 0.5rem;
}

.finder-coming-soon-name {
  font-size: 0.85rem;
  color: var(--fg);
  font-weight: 600;
}

.finder-coming-soon-label {
  font-size: 0.78rem;
  color: var(--muted);
}
```

---

## What Phase 3 Does NOT Include

- Settings app (Phase 4)
- Real file system or project content in Finder (placeholder only)
- Terminal file editing (`nano`, `vim`, etc.)
- Terminal networking commands (`curl`, `ping`, etc.)
- Multiple terminal instances sharing state
