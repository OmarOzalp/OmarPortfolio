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

## Update — 2026-10-13: photos and a beach-house room

- **Photos** live in `assets/photos/` (max 1600px, metadata stripped) with 640px copies in `thumbs/`. They are
  listed once in `VFS.PHOTOS` (`os/fs.js`) and feed My Pictures + the Image Viewer, About Me, the plain page,
  the polaroid string on the desk wall, and photos pinned to prop cards (`photo` / `gallery` in `desk/props.js`).
  Clicking a photo on a card opens it in the Image Viewer on the PC.
- **Room**: the night room became a golden-hour beach house — sea-glass walls over white beadboard, a real window
  opening onto a painted beach scene set back for parallax, linen curtains, a sill plant, and string lights with
  polaroids. A spotlight from outside, aimed through the opening, casts a window-shaped sunbeam (mullions included)
  across the desk; a ceiling plane stops light leaking over the wall.
- **Removed**: the dive poster and the mug.
- **Track spikes** are now lofted surfaces (rounded cross-sections swept heel to toe with toe spring), with a knit
  bump map, collar opening, criss-cross lace tubes and a bow, a white midsole and a spike plate with pins.
- **Dive mask**: curved frame, lens retainer rings and glass, a silicone skirt lofted from the frame outline (flare
  and face-seal lip, nose pocket), side buckles and a ribbed strap lying on the desk.

## Update — the beach outside is real 3D

- `desk/outdoor.js` builds its own scene: a sky shader with drifting fbm clouds and sun glow; an ocean shader
  (tileable procedural normal map, sky reflection by Fresnel, sun glints, turquoise shallows, breakers rolling in,
  lacy foam at an animated wash line); sand with ripples and dunes whose shader darkens and glosses it where the
  wash reaches; 3D palms (tapered curved trunks, alpha-cut drooping fronds, coconuts) casting shadows; a lifeguard
  tower with a waving flag, umbrella + towel, surfboard, gulls, a headland and a sailboat. Its sun matches the
  room's sunbeam (`SUN_DIR` in `desk/scene.js`).
- Rendering (`desk/main.js`): the room renders first; an invisible portal pane just behind the window sash writes
  1 to the stencil buffer wherever the window is actually visible. After clearing depth, the beach renders with a
  far-reaching camera, every outdoor material stencil-tested against 1 and the scissor clipped to the window's
  on-screen box, so only window pixels are shaded and the room's lighting is untouched.
- The outdoor frame is pitched down ~7° so the horizon sits mid-window (a second-floor beach-house sightline).

## Update — wrestling headgear rebuilt

The old ear cups were single-sided domes you could see straight through. The headgear is now closed ear-guard shells
(dome, rubber rim, foam backing, recessed vents, snaps) held in a worn shape by flat stitched webbing that follows an
ellipsoid "head": crown strap, rear strap with buckle, chin strap with a chin cup.

## Update — OZ BOY, the phone version

Using a desktop OS with a thumb felt wrong, so phones now get their own device: OZ BOY, a 1998-style handheld.
`index.html` sends phones and very small windows to `ozboy/` before the desk loads (`?desk` / `?flat` opt out).

Decisions (Q&A with Omar, with mood boards): Clear Duke Blue see-through shell; backlit full-color pixel screen;
a home menu (work first, life second) plus a bonus beach town to walk around; it first lies on a beach towel and is
"picked up" to fill the screen; picking it up flicks the power switch and boots it ("OZ BOY" drops, ding); chiptune
blips, no music; games are Snake (Sea Snake) and a new fishing game (Fish On!).

```
ozboy/index.html    the towel scene and the handheld's markup
ozboy/ozboy.css     the device (authored in device px, scaled with CSS zoom), towel, landscape layout, screen UI
ozboy/ozboy.js      fitting to the phone, pick up / put down / boot, buttons (touch, keyboard), view stack + screens
ozboy/pixel.js      palette, crisp pixel text, menu icons; shared with the games
ozboy/games/*.js    town (Beach Walk), fish (Fish On!), snake (Sea Snake); contract + test harness in games/dev.html
```

- **Screen**: 160 logical px wide and 144–240 tall depending on the phone (taller phones see more). Text is Press Start 2P
  for labels and VT323 for body copy; content comes from `VFS` (`os/fs.js`) and the desk's `PROPS` copy, so all three
  versions (desk, handheld, plain page) share one source.
- **Controls**: D-pad (follows the thumb), A (acts on release so links can open tabs), B back, Start home, Select options
  (sound, put down, desk/plain versions). Tapping the screen works everywhere. Each screen is a history entry, so the
  phone's Back gesture walks back through the handheld and finally puts it down.
- **Games** implement a small contract (`create(host)` → start/stop/pause/resume/button/tap/swipe/press); the town's
  buildings call `host.open(section)`.
- Sounds are square-wave additions to `os/sound.js` and share the desk's mute setting.

### Update — OZ BOY usability pass

- Yellow captions under A, B, Start, Select and the D-pad say what each does on the current screen (OPEN/BACK,
  LEFT LEG/RIGHT LEG in the dash, PLAY/PICK in the cartridge picker…). B on the home screen no longer puts it down.
- First boot shows "How to play": numbered rings around the controls and a card over the screen (again via Select).
- The power switch works: off drops what was running (the cartridge stays in), on boots again, straight into the
  inserted game like the real thing. Pressing buttons while it is off points at the switch.
- New cartridge: 100M DASH. A is the left leg, B the right; alternate to sprint, the same leg twice is a stumble,
  pressing before the gun is a false start. Two rivals and a best time.
- Phones that open the desk get "← OZ BOY" in its top bar and loading screen (and over the OS in flat mode).

## Pending content from Omar

The resume PDF (`RESUME_PDF` in `os/apps.js` and `plain.html`), sketchbook scans, a higher-detail drill if wanted, and real details for some captions (track events/PRs, things built with the
drill, games played).
