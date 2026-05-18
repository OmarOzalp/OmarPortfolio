# Portfolio OS-Accented Scroll — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add About and Experience sections plus a pinned status bar to the portfolio, styled with OS-accented window cards and terminal path headers.

**Architecture:** Pure HTML/CSS/JS static site — no framework, no build step. New CSS is appended to `style.css`. New HTML is added after `</main>` in `index.html`. The existing floating theme toggle button (`#theme-toggle`) is moved into a fixed `<footer class="status-bar">` element; the JS already selects it by ID so no JS selector changes are needed beyond adding a status bar clock.

**Tech Stack:** HTML5, CSS3 (custom properties, flexbox), vanilla JS (existing `script.js`)

---

### Task 1: CSS — Window card component

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Append window card styles to the bottom of `style.css`**

```css
/* === Window Card Component === */
.window-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg);
}

.window-title-bar {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--line);
  gap: 0.6rem;
}

.window-dots {
  display: flex;
  gap: 5px;
  align-items: center;
  flex-shrink: 0;
}

.window-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--line);
}

.window-label {
  font-family: 'SF Mono', ui-monospace, 'Fira Mono', 'Consolas', monospace;
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.03em;
  flex: 1;
  text-align: center;
  padding-right: 1.5rem;
}

.window-body {
  padding: 1.25rem 1.5rem;
}

.window-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.window-role,
.window-location {
  font-family: 'SF Mono', ui-monospace, 'Fira Mono', 'Consolas', monospace;
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.window-company {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--fg);
  letter-spacing: -0.01em;
}

.window-description {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}
```

- [ ] **Step 2: Verify no visible changes in the browser**

Open `index.html` in a browser. The hero should look exactly as before — no new elements exist yet, so these styles are dormant.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add window card component styles"
```

---

### Task 2: CSS — Section layout, path headers, status bar overrides

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Append section layout and status bar CSS to the bottom of `style.css`**

```css
/* === Section Layout === */
.sections-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1rem calc(36px + 4rem) 1rem;
}

.portfolio-section {
  width: 100%;
  max-width: 680px;
  margin-top: 8rem;
}

.section-path {
  font-family: 'SF Mono', ui-monospace, 'Fira Mono', 'Consolas', monospace;
  font-size: 0.78rem;
  color: var(--muted);
  letter-spacing: 0.06em;
  margin: 0 0 1.25rem 0;
}

.window-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* === Status Bar === */
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--bg);
  border-top: 1px solid var(--line);
  z-index: 200;
}

.status-bar-left {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.status-bar-center {
  font-family: 'SF Mono', ui-monospace, 'Fira Mono', 'Consolas', monospace;
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.status-bar-right {
  display: flex;
  align-items: center;
}

/* Override theme toggle positioning when inside status bar */
.status-bar .theme-toggle {
  position: static !important;
  top: auto !important;
  right: auto !important;
  min-width: unset;
  min-height: unset;
  padding: 2px 4px;
  border: none;
  box-shadow: none;
  width: 28px;
  height: 28px;
}
```

- [ ] **Step 2: Verify no visible changes in the browser**

Reload `index.html`. Hero still looks the same — no new HTML added yet.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add section layout and status bar styles"
```

---

### Task 3: HTML + JS — Status bar

**Files:**
- Modify: `index.html`
- Modify: `script.js`

- [ ] **Step 1: Move `#theme-toggle` into a new status bar footer in `index.html`**

Remove this line from just before `<main>`:
```html
  <button id="theme-toggle" class="theme-toggle" aria-pressed="false" hidden>theme</button>
```

Add the following directly before `<script src="script.js" defer></script>`:
```html
  <footer class="status-bar" aria-label="Status bar">
    <span class="status-bar-left">Omar Ozalp</span>
    <span class="status-bar-center" id="status-time" aria-hidden="true"></span>
    <div class="status-bar-right">
      <button id="theme-toggle" class="theme-toggle" aria-pressed="false" hidden>theme</button>
    </div>
  </footer>
```

- [ ] **Step 2: Add status bar clock to `script.js`**

Inside the `document.addEventListener('DOMContentLoaded', function () { ... })` block, add these two lines after the existing `setupThemeToggle()` call:

```js
  function updateStatusTime() {
    const el = document.getElementById('status-time');
    if (el) el.textContent = getTimeTag();
  }
  updateStatusTime();
  setInterval(updateStatusTime, 60000);
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Check:
- A thin bar is pinned to the bottom of the viewport
- Left side shows "Omar Ozalp"
- Center shows current time in `HH:MM` format
- Right side shows the sun/moon theme toggle icon
- Clicking the toggle still switches light/dark mode
- The old floating button in the top-right corner is gone

- [ ] **Step 4: Commit**

```bash
git add index.html script.js
git commit -m "feat: add status bar with clock and theme toggle"
```

---

### Task 4: HTML — About and Experience sections

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add all new sections to `index.html`**

Add the following directly after `</main>` and before the `<footer class="status-bar">`:

```html
  <div class="sections-wrapper">

    <!-- About -->
    <section class="portfolio-section" id="about" aria-label="About">
      <p class="section-path">~/about</p>
      <div class="window-card">
        <div class="window-title-bar">
          <div class="window-dots">
            <span class="window-dot"></span>
            <span class="window-dot"></span>
            <span class="window-dot"></span>
          </div>
          <span class="window-label">about.txt</span>
        </div>
        <div class="window-body">
          <p class="window-description">I'm Omar Ozalp, an ECE, CS &amp; Math student at Duke. I've interned across Kuwait and Dubai, building data tools and consumer apps at companies ranging from real estate platforms to retail giants. I like working on problems that sit at the intersection of engineering and people.</p>
        </div>
      </div>
    </section>

    <!-- Experience -->
    <section class="portfolio-section" id="experience" aria-label="Experience">
      <p class="section-path">~/experience</p>
      <div class="window-stack">

        <!-- 4Sale -->
        <div class="window-card">
          <div class="window-title-bar">
            <div class="window-dots">
              <span class="window-dot"></span>
              <span class="window-dot"></span>
              <span class="window-dot"></span>
            </div>
            <span class="window-label">4sale.intern</span>
          </div>
          <div class="window-body">
            <div class="window-meta">
              <span class="window-role">Intern</span>
              <span class="window-location">Kuwait City, Kuwait</span>
            </div>
            <p class="window-company">4Sale</p>
            <p class="window-description">Used SQL to identify and flag malicious client activity within the platform.</p>
          </div>
        </div>

        <!-- Property Finder -->
        <div class="window-card">
          <div class="window-title-bar">
            <div class="window-dots">
              <span class="window-dot"></span>
              <span class="window-dot"></span>
              <span class="window-dot"></span>
            </div>
            <span class="window-label">propertyfinder.intern</span>
          </div>
          <div class="window-body">
            <div class="window-meta">
              <span class="window-role">Intern</span>
              <span class="window-location">Dubai, UAE</span>
            </div>
            <p class="window-company">Property Finder</p>
            <p class="window-description">Developed data reports analyzing real estate market trends across the UAE.</p>
          </div>
        </div>

        <!-- Majid Al Futtaim -->
        <div class="window-card">
          <div class="window-title-bar">
            <div class="window-dots">
              <span class="window-dot"></span>
              <span class="window-dot"></span>
              <span class="window-dot"></span>
            </div>
            <span class="window-label">maf.intern</span>
          </div>
          <div class="window-body">
            <div class="window-meta">
              <span class="window-role">Intern</span>
              <span class="window-location">Dubai, UAE</span>
            </div>
            <p class="window-company">Majid Al Futtaim</p>
            <p class="window-description">Built features for a loyalty and rewards app, personalizing offers for users across the MAF portfolio.</p>
          </div>
        </div>

        <!-- Delta Sigma Pi -->
        <div class="window-card">
          <div class="window-title-bar">
            <div class="window-dots">
              <span class="window-dot"></span>
              <span class="window-dot"></span>
              <span class="window-dot"></span>
            </div>
            <span class="window-label">campus.involvement</span>
          </div>
          <div class="window-body">
            <p class="window-company">Delta Sigma Pi</p>
            <p class="window-description">Co-ed Business Fraternity · Duke University</p>
          </div>
        </div>

      </div>
    </section>

  </div>
```

- [ ] **Step 2: Verify in browser**

Scroll down past the hero. Check:
- `~/about` path label appears, followed by the about window card
- `~/experience` path label appears with 4 window cards stacked below it
- Each internship card shows role (monospace, muted), company name (bold), and description
- The DSP campus card shows company name and description
- Status bar stays pinned at the bottom and doesn't overlap content
- Everything looks correct in both light mode and dark mode (toggle with the status bar button)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add About and Experience sections"
```

---

### Task 5: Push to GitHub

- [ ] **Step 1: Push to origin**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel deployment**

Go to the Vercel dashboard. A new deployment should trigger automatically from the push. Once deployed, open the live URL and verify:
- Hero looks unchanged
- Scrolling reveals About and Experience sections
- Status bar is pinned at the bottom
- Light/dark toggle works
- Site looks correct on mobile (narrow the browser window to ~375px)
