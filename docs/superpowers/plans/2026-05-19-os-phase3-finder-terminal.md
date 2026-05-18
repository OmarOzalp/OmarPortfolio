# OzalpOS Phase 3 — Finder + Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real content to the Finder (navigable project showcase) and Terminal (convincing fake Linux shell) dock apps.

**Architecture:** A new `terminal.js` file exports a `Terminal.create(win)` function. Both apps use a new `onMount(win)` hook added to the APPS registry in `windows.js`. A `bodyClass` property on APPS entries lets Finder and Terminal opt out of the default window-body padding. `os.js` `setupDock()` is extended to wire Finder and Terminal.

**Tech Stack:** Vanilla JS, HTML5, CSS3 custom properties — no framework, no build step.

---

### Task 1: Flush window-body style + Terminal + Finder CSS

**Files:**
- Modify: `os.css`

- [ ] **Step 1: Append flush override + Terminal + Finder styles to the end of `os.css`**

```css
/* === Flush window body (no padding, for Finder/Terminal) === */
.window-body--flush {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* === Terminal === */
.term-body {
  display: flex;
  flex-direction: column;
  flex: 1;
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

/* === Finder === */
.finder-body {
  display: flex;
  flex: 1;
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

- [ ] **Step 2: Verify no visual change**

Open `index.html` in a browser, boot through to desktop. Nothing should look different — no new HTML uses these classes yet.

- [ ] **Step 3: Commit**

```bash
git add os.css
git commit -m "feat: add flush window body, Terminal and Finder styles to os.css"
```

---

### Task 2: Create `terminal.js`

**Files:**
- Create: `terminal.js`

- [ ] **Step 1: Create `terminal.js` with the full Terminal command interpreter**

```js
// terminal.js

var Terminal = (function() {

  var FS = {
    '~':         ['projects/', 'downloads/'],
    '~/projects': ['project_1.txt', 'project_2.txt', 'project_3.txt']
  };

  var LS_LA = {
    '~': [
      'total 24',
      'drwxr-xr-x  4 omar omar 4096 May 19 10:00 .',
      'drwxr-xr-x 12 root root 4096 May 19 10:00 ..',
      'drwxr-xr-x  2 omar omar 4096 May 19 10:00 downloads',
      'drwxr-xr-x  2 omar omar 4096 May 19 10:00 projects'
    ],
    '~/projects': [
      'total 20',
      'drwxr-xr-x 2 omar omar 4096 May 19 10:00 .',
      'drwxr-xr-x 4 omar omar 4096 May 19 10:00 ..',
      '-rw-r--r-- 1 omar omar  512 May 19 10:00 project_1.txt',
      '-rw-r--r-- 1 omar omar  512 May 19 10:00 project_2.txt',
      '-rw-r--r-- 1 omar omar  512 May 19 10:00 project_3.txt'
    ]
  };

  var PWD = {
    '~':         '/home/omar',
    '~/projects': '/home/omar/projects'
  };

  var HELP_TEXT = [
    'Available commands:',
    '  ls [-la]     list directory contents',
    '  cd <dir>     change directory',
    '  pwd          print working directory',
    '  whoami       print current user',
    '  date         print current date and time',
    '  uname -a     print system information',
    '  echo <text>  print text to terminal',
    '  clear        clear the terminal',
    '  help         show this help message'
  ].join('\n');

  function _promptStr(cwd) {
    return cwd === '~' ? 'omar@ozalpos:~$' : 'omar@ozalpos:~/projects$';
  }

  function _run(cmd, cwd) {
    cmd = cmd.trim();
    if (!cmd) return { output: '', cwd: cwd };
    var parts = cmd.split(/\s+/);
    var name  = parts[0];
    var arg1  = parts[1] || '';
    var rest  = parts.slice(1).join(' ');

    if (name === 'clear')   return { output: '', cwd: cwd, clear: true };
    if (name === 'help')    return { output: HELP_TEXT, cwd: cwd };
    if (name === 'whoami')  return { output: 'omar', cwd: cwd };
    if (name === 'pwd')     return { output: PWD[cwd], cwd: cwd };
    if (name === 'date')    return { output: new Date().toString(), cwd: cwd };
    if (name === 'echo')    return { output: rest, cwd: cwd };

    if (name === 'uname') {
      if (arg1 === '-a') return { output: 'Linux ozalpos 5.15.0-ozalp #1 SMP x86_64 GNU/Linux', cwd: cwd };
      return { output: 'Linux', cwd: cwd };
    }

    if (name === 'ls') {
      if (arg1 === '-la') return { output: LS_LA[cwd].join('\n'), cwd: cwd };
      return { output: FS[cwd].join('  '), cwd: cwd };
    }

    if (name === 'cd') {
      var target = arg1;
      if (!target || target === '~' || target === '/home/omar') {
        return { output: '', cwd: '~' };
      }
      if (target === 'projects' && cwd === '~') {
        return { output: '', cwd: '~/projects' };
      }
      if ((target === '..' || target === '../') && cwd === '~/projects') {
        return { output: '', cwd: '~' };
      }
      return { output: 'bash: cd: ' + target + ': No such file or directory', cwd: cwd };
    }

    return { output: 'bash: ' + name + ': command not found', cwd: cwd };
  }

  function create(win) {
    var outputEl  = win.querySelector('.term-output');
    var inputEl   = win.querySelector('.term-input');
    var promptEl  = win.querySelector('.term-prompt');
    var cwd       = '~';
    var lastCmd   = '';

    outputEl.textContent = 'OzalpOS 1.0 — omar@ozalpos\nType \'help\' for available commands.\n\n';

    function _scroll() { outputEl.scrollTop = outputEl.scrollHeight; }

    function _append(text) {
      outputEl.textContent += text + '\n';
      _scroll();
    }

    function _updatePrompt() {
      promptEl.textContent = _promptStr(cwd);
    }

    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var cmd = inputEl.value;
        _append(_promptStr(cwd) + ' ' + cmd);
        if (cmd.trim()) lastCmd = cmd;
        inputEl.value = '';

        var result = _run(cmd, cwd);
        cwd = result.cwd;

        if (result.clear) {
          outputEl.textContent = '';
        } else {
          if (result.output) _append(result.output);
          _append('');
        }
        _updatePrompt();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        inputEl.value = lastCmd;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        inputEl.value = '';
      }
    });

    _updatePrompt();
    inputEl.focus();
  }

  return { create: create };
})();
```

- [ ] **Step 2: Commit**

```bash
git add terminal.js
git commit -m "feat: add terminal.js — fake Linux shell command interpreter"
```

---

### Task 3: Add Finder + Terminal to `windows.js`

**Files:**
- Modify: `windows.js`

- [ ] **Step 1: Add `onMount: null` to existing apps and add Finder + Terminal entries**

Replace the entire `var APPS = { ... };` block (lines 3–40) with:

```js
var APPS = {
  about: {
    title: 'About',
    width: 480,
    height: 320,
    bodyClass: null,
    onMount: null,
    render: function() {
      return '<p class="win-body-text">I\'m Omar Ozalp, an ECE, CS &amp; Math student at Duke. I\'ve interned across Kuwait and Dubai, building data tools and consumer apps at companies ranging from real estate platforms to retail giants. I like working on problems that sit at the intersection of engineering and people.</p>';
    }
  },
  experience: {
    title: 'Experience',
    width: 520,
    height: 480,
    bodyClass: null,
    onMount: null,
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
  },
  finder: {
    title: 'Finder',
    width: 640,
    height: 440,
    bodyClass: 'window-body--flush',
    render: function() {
      return '<div class="finder-body">' +
        '<div class="finder-sidebar">' +
          '<div class="finder-sidebar-section">Favorites</div>' +
          '<div class="finder-sidebar-item active" data-view="home">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
            'Home' +
          '</div>' +
          '<div class="finder-sidebar-item" data-view="projects">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' +
            'Projects' +
          '</div>' +
          '<div class="finder-sidebar-item" data-view="downloads">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            'Downloads' +
          '</div>' +
        '</div>' +
        '<div class="finder-main"></div>' +
      '</div>';
    },
    onMount: function(win) {
      var main        = win.querySelector('.finder-main');
      var sidebarItems = win.querySelectorAll('.finder-sidebar-item');

      var FOLDER_SVG = '<svg class="finder-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
      var FILE_SVG   = '<svg class="finder-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';

      function setActive(view) {
        sidebarItems.forEach(function(item) {
          item.classList.toggle('active', item.getAttribute('data-view') === view);
        });
      }

      function renderHome() {
        main.innerHTML =
          '<div class="finder-icon-grid">' +
            '<div class="finder-icon-item" data-nav="projects">' + FOLDER_SVG + '<span class="finder-icon-label">Projects</span></div>' +
            '<div class="finder-icon-item" data-nav="downloads">' + FOLDER_SVG + '<span class="finder-icon-label">Downloads</span></div>' +
          '</div>';
        setActive('home');
      }

      function renderProjects() {
        main.innerHTML =
          '<div class="finder-icon-grid">' +
            '<div class="finder-icon-item" data-file="project_1.txt">' + FILE_SVG + '<span class="finder-icon-label">project_1.txt</span></div>' +
            '<div class="finder-icon-item" data-file="project_2.txt">' + FILE_SVG + '<span class="finder-icon-label">project_2.txt</span></div>' +
            '<div class="finder-icon-item" data-file="project_3.txt">' + FILE_SVG + '<span class="finder-icon-label">project_3.txt</span></div>' +
          '</div>';
        setActive('projects');
      }

      function renderDownloads() {
        main.innerHTML = '<div class="finder-empty">This folder is empty.</div>';
        setActive('downloads');
      }

      function renderComingSoon(filename) {
        main.innerHTML =
          '<div class="finder-coming-soon">' +
            '<span class="finder-coming-soon-name">' + filename + '</span>' +
            '<span class="finder-coming-soon-label">Coming Soon</span>' +
          '</div>';
      }

      sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
          var view = item.getAttribute('data-view');
          if (view === 'home')      renderHome();
          else if (view === 'projects')  renderProjects();
          else if (view === 'downloads') renderDownloads();
        });
      });

      main.addEventListener('click', function(e) {
        var navEl  = e.target.closest('[data-nav]');
        var fileEl = e.target.closest('[data-file]');
        if (navEl)       { navEl.getAttribute('data-nav') === 'projects' ? renderProjects() : renderDownloads(); }
        else if (fileEl) { renderComingSoon(fileEl.getAttribute('data-file')); }
      });

      renderHome();
    }
  },
  terminal: {
    title: 'Terminal',
    width: 600,
    height: 400,
    bodyClass: 'window-body--flush',
    render: function() {
      return '<div class="term-body">' +
        '<div class="term-output"></div>' +
        '<div class="term-input-row">' +
          '<span class="term-prompt"></span>' +
          '<input class="term-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input">' +
        '</div>' +
      '</div>';
    },
    onMount: function(win) {
      Terminal.create(win);
    }
  }
};
```

- [ ] **Step 2: Add `bodyClass` support to the `window-body` div in `open()`**

Find this line in `open()` (around line 149):

```js
      '<div class="window-body">' + app.render() + '</div>' +
```

Replace it with:

```js
      '<div class="window-body' + (app.bodyClass ? ' ' + app.bodyClass : '') + '">' + app.render() + '</div>' +
```

- [ ] **Step 3: Add `onMount` call at the end of `open()`, after `focus(windowId)`**

Find these two lines at the bottom of `open()`:

```js
    desktop.appendChild(win);
    focus(windowId);
  }
```

Replace with:

```js
    desktop.appendChild(win);
    focus(windowId);
    if (app.onMount) app.onMount(win);
  }
```

- [ ] **Step 4: Commit**

```bash
git add windows.js
git commit -m "feat: add Finder and Terminal apps to windows.js, add onMount and bodyClass support"
```

---

### Task 4: Wire `index.html` and `os.js`

**Files:**
- Modify: `index.html`
- Modify: `os.js`

- [ ] **Step 1: Add `terminal.js` script tag to `index.html`**

Find:

```html
  <script src="windows.js" defer></script>
  <script src="os.js" defer></script>
```

Replace with:

```html
  <script src="terminal.js" defer></script>
  <script src="windows.js" defer></script>
  <script src="os.js" defer></script>
```

`terminal.js` must come before `windows.js` so `Terminal` is defined when `APPS.terminal.onMount` references it.

- [ ] **Step 2: Update `setupDock()` in `os.js` to include Finder and Terminal**

Find:

```js
  var items = { 'About': 'about', 'Experience': 'experience' };
```

Replace with:

```js
  var items = { 'About': 'about', 'Experience': 'experience', 'Finder': 'finder', 'Terminal': 'terminal' };
```

- [ ] **Step 3: Restore `tabindex="0"` and remove `aria-disabled` from Finder and Terminal dock items in `index.html`**

Find:

```html
        <div class="dock-item" role="button" aria-label="Finder" tabindex="-1" aria-disabled="true">
```

Replace with:

```html
        <div class="dock-item" role="button" aria-label="Finder" tabindex="0">
```

Find:

```html
        <div class="dock-item" role="button" aria-label="Terminal" tabindex="-1" aria-disabled="true">
```

Replace with:

```html
        <div class="dock-item" role="button" aria-label="Terminal" tabindex="0">
```

- [ ] **Step 4: Verify in browser**

Boot through to the desktop and check:

1. Clicking **Finder** dock icon opens a Finder window with Home/Projects/Downloads sidebar and a grid of folders in the main area
2. Clicking **Projects** in the sidebar shows `project_1.txt`, `project_2.txt`, `project_3.txt` icons
3. Clicking any project file shows a "Coming Soon" panel
4. Clicking **Downloads** shows "This folder is empty."
5. Clicking folders in the main area (Projects/, Downloads/) navigates to that view
6. Clicking **Terminal** dock icon opens a Terminal window with the welcome message
7. Typing `ls` and pressing Enter shows `projects/  downloads/`
8. Typing `cd projects` and pressing Enter changes the prompt to `omar@ozalpos:~/projects$`
9. Typing `ls` again shows `project_1.txt  project_2.txt  project_3.txt`
10. Typing `cd ..` returns to `~`
11. Typing `help` shows the command list
12. Typing `clear` clears the output
13. Up arrow recalls the previous command
14. Unknown command shows `bash: <cmd>: command not found`
15. **About** and **Experience** windows still open correctly (no regression)

- [ ] **Step 5: Commit**

```bash
git add index.html os.js
git commit -m "feat: wire Finder and Terminal dock items, restore aria attributes"
```

---

### Task 5: Push to GitHub

- [ ] **Step 1: Push to origin**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel deployment**

Open the Vercel dashboard. Once deployed, open the live URL and verify Finder and Terminal open and work correctly.
