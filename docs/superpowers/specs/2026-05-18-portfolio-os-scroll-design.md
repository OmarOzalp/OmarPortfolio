# Portfolio OS-Accented Scroll — Design Spec
**Date:** 2026-05-18

## Goal

Expand the existing single-page portfolio from a hero-only landing page into a full single-page scroll that is personal, memorable, and recruiter-friendly. The design uses OS-accented UI elements (window chrome, terminal-style headers, monospace metadata) as a visual language layered on top of a clean vertical scroll — keeping the existing hero intact and building the story beneath it.

This lays the groundwork for a future full OS-desktop experience without requiring a rebuild.

## Audiences

1. **Recruiters / internship hunting** — must be scannable, show experience clearly, link to contact
2. **General web presence** — personal voice, memorable aesthetic, reflects personality

## Page Structure

```
Hero (existing — no changes)
  └── greeting, name scramble animation, majors, social icons, theme toggle
About
  └── short personal bio window
Experience
  └── internship window cards (3)
  └── campus involvement window card
```

Resume section is intentionally omitted for now — placeholder slot reserved for future addition.

## Visual Language

### OS Accent Elements

- **Section headers:** styled as terminal path labels — `~/about`, `~/experience`. Monospace font, muted color, small size. Left-aligned, above each section's content.
- **Window cards:** each content block lives in a card with a thin title bar at the top. Title bar contains:
  - Three CSS-drawn circle dots on the left (traffic-light style, but no color fill — `8px` diameter, `border: 1px solid var(--line)`, matches black/white palette)
  - A short label in the center (e.g., `about.txt`, `4sale.intern`, `dsp.club`)
  - No color fill — background matches site bg, border uses existing `--line` variable
- **Metadata:** dates, locations, and role labels use a monospace font and `--muted` color
- **Body text:** uses the existing system-ui font stack, normal weight, `--fg` color

### Constraints

- No new colors introduced — strictly uses existing CSS variables (`--bg`, `--fg`, `--muted`, `--line`, `--accent`)
- Matches existing light/dark theme automatically via CSS variables
- No JavaScript required for any new sections — pure HTML/CSS
- Consistent with existing spacing and type scale (`clamp`-based sizing)

### Status Bar

A thin bar pinned to the bottom of the viewport:
- Left: `Omar Ozalp` label
- Center: current time (updated by existing JS clock logic, reused)
- Right: theme toggle (moves the existing floating button here)
- Same border-top as `--line`, bg matches `--bg`

## Section Designs

### About

```
┌─────────────────────────────────────┐
│ ● ● ●   about.txt                   │
├─────────────────────────────────────┤
│                                     │
│  [2–3 sentence personal bio]        │
│                                     │
└─────────────────────────────────────┘
```

Content: A short personal bio — background, what drives him, personality. Written in first person, casual but sharp. **Copy TBD by Omar.**

### Experience — Internships

Three window cards, stacked vertically. Each card:

```
┌─────────────────────────────────────┐
│ ● ● ●   [company].intern            │
├─────────────────────────────────────┤
│  [Role]              [City · Year]  │
│  [Company Name]                     │
│                                     │
│  [One-line description]             │
│                                     │
└─────────────────────────────────────┘
```

**4Sale** — Kuwait · Intern
Used SQL to identify and flag malicious client activity within the platform.

**Property Finder** — Dubai · Intern
Developed data reports analyzing real estate market trends across the UAE.

**Majid Al Futtaim** — Dubai · Intern
Built features for a loyalty and rewards app, personalizing offers for users.

*Dates to be filled in by Omar during implementation.*

### Experience — Campus Involvement

One window card below the internship cards:

```
┌─────────────────────────────────────┐
│ ● ● ●   campus.involvement          │
├─────────────────────────────────────┤
│  Delta Sigma Pi                     │
│  Co-ed Business Fraternity · Duke   │
└─────────────────────────────────────┘
```

Additional clubs can be added here later.

## Scroll & Layout

- Sections are separated by generous vertical whitespace (`8rem` between sections)
- Max content width: `680px`, centered — matches the existing hero's implicit width
- Section headers (`~/about`, `~/experience`) sit `2rem` above their first card
- No scroll-triggered animations in this phase — content is visible on load (can be added later)

## Out of Scope (This Phase)

- Resume section (placeholder slot reserved)
- Full OS desktop simulation (planned future phase)
- Projects section (no content yet)
- Scroll animations / intersection observer effects
- Multi-page routing
