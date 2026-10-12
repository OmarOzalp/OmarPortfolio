# OzalpOS 98 — Retro Desk Design Spec
**Date:** 2026-10-12

## Goal

Make the portfolio feel like sitting down at Omar's actual 90s computer. A realistic 3D desk shows his
personality through the objects on it; clicking an object zooms in on it, and clicking the monitor zooms
into a working Windows 98-style OS that holds the portfolio content and games.

## Decisions (from the Q&A with Omar)

| Topic | Decision |
|---|---|
| OS style | Windows 95/98 look: teal desktop, beveled gray windows, Start menu, taskbar. Branded "OzalpOS 98" (no real Microsoft logos). |
| Framing | A beige CRT on a desk in a room, rendered in real 3D. Click an item to zoom and focus on it; click the screen to zoom in and use the OS. |
| Boot | Full power-on: CRT turn-on, BIOS POST, splash, startup chime. Click or any key skips. |
| Sound | On by default with a mute button (desk HUD and the OS tray share the same setting). |
| Apps/games | Solitaire, Minesweeper, Snake, plus About, Experience, Projects, Explorer, Notepad, Resume.doc, My Pictures, OZ-DOS Prompt, Display Properties, Help, Run, Shut Down. |
| Recruiters | Resume.doc on the desktop and a resume paper on the desk, plus a "Plain version" link (`plain.html`). |
| Phones | The desk is skipped; the OS fills the screen, windows open maximized, bigger touch targets. |
| Personality | Desk props: dive mask, wrestling headgear, track spikes, sketchbook, power drill, gaming mouse, Duke pennant, floppy disks, resume paper, mug. Photo album (My Pictures) once photos arrive. |
| Tone | Playful copy throughout (captions, BIOS lines, error dialogs, Recycle Bin). |
| 3D models | Hybrid: simple items are modeled in code; the organic hero props (mask, headgear, spikes, drill) are procedural stand-ins until sourced models are dropped in. |

## Architecture

```
index.html          desk page: WebGL canvas + CSS3D layer + HUD/card overlays
desk/main.js        renderer, camera rig (overview / prop / screen), picking, OS bridge
desk/scene.js       room, desk, CRT, PC, keyboard, props (each prop = Group with userData.prop)
desk/props.js       per-prop copy, card actions and camera tweaks
desk/textures.js    every texture painted on <canvas> at load (no image assets)
desk/desk.css       loader, HUD, info card, tooltip, hint
os/index.html       the OS (runs in an iframe on the desk, or full-screen on phones)
os/os.js            power states, BIOS/splash boot, desktop icons, Start menu, tray, message bridge
os/wm.js            window manager, menus, dialogs (OS.registerApp / OS.wm.open / OS.alert)
os/apps.js          the programs; os/games/* hold Solitaire, Minesweeper, Snake
os/fs.js            virtual filesystem + PROFILE/PROJECTS data (single source of truth)
os/sound.js         Web Audio synth, shared by desk and OS
plain.html          one-page plain version rendered from the same data
vendor/three/       three.js r186 (minified, MIT) loaded via an import map — no build step
```

### The screen

The OS is a real `<iframe>` positioned in 3D by `CSS3DRenderer` *behind* the WebGL canvas. The monitor's
screen mesh renders with `NoBlending` and alpha 0, punching a hole in the canvas so the iframe shows through
with correct perspective and occlusion. Transparent glass meshes on top add the off-state tint, vignette
and scanlines. The iframe only receives pointer events once the camera has finished zooming into the screen.

### Desk ↔ OS messages (`postMessage`, same origin, `{ ozalp: true, type }`)

- desk → OS: `power {on, skip}`, `open {app}`, `focus`, `blur`
- OS → desk: `ready`, `state {off|bios|splash|desktop|shutdown}`, `exit` (Esc / "back to desk"), `shutdown`

## Swapping in real models

Each prop builder in `desk/scene.js` returns a group tagged with `prop(id, group)`. To use a sourced glTF,
load it into that group instead (keeping the id), call `restOn()` so it sits on the desk, and the
picking, hover glow, camera framing and info card keep working unchanged.

## Pending content from Omar

Photos for My Pictures (`os/apps.js` → `PICTURES`, plus `assets/photos/me.jpg` for About Me), the resume
PDF (`RESUME_PDF` in `os/apps.js` and `plain.html`), sketchbook scans, and real details for the prop
captions (wrestling, track events/PRs, things built with the drill, games played).
