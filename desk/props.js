// props.js — what each object on the desk says when you pick it up.
//
// kind:  'card'   fly to the object and show its card (default)
//        'screen' fly into the monitor and use the computer
//        'toggle' flip something on the spot (the lamp)
// view:  optional camera tweaks: dir (direction from the object toward the camera), zoom (distance multiplier)
// actions: buttons on the card. { app } opens an app on the PC, { url } opens a link.
// photo:   id of a photo in VFS.PHOTOS (os/fs.js) pinned to the card; gallery: several, as thumbnails.

const SCUBAGO = 'https://github.com/OmarOzalp/scubago';

export const PROPS = {
  computer: { name: 'OZ-CRT 17', hint: 'Use the computer', kind: 'screen' },
  keyboard: { name: 'Keyboard', hint: 'Use the computer', kind: 'screen' },
  tower: { name: 'OZ-PC 98', hint: 'Use the computer', kind: 'screen' },
  lamp: { name: 'Desk lamp', hint: 'Click to toggle', kind: 'toggle' },

  mask: {
    name: 'Dive mask',
    kicker: 'Scuba diving',
    title: 'Dive mask',
    body: [
      'My favorite office is underwater, where nobody can send me Slack messages.',
      'I liked diving so much I built ScubaGo: a map of the world\'s dive sites and the marine life people actually see there. "Where can I see a whale shark?" deserved a better answer than a forum thread from 2011.'
    ],
    photo: 'dive-crew',
    actions: [{ label: 'Load ScubaGo on the PC', app: 'projects' }, { label: 'ScubaGo on GitHub', url: SCUBAGO }],
    view: { zoom: 1.5 }
  },

  headgear: {
    name: 'Wrestling headgear',
    kicker: 'Wrestling',
    title: 'Wrestling headgear',
    body: [
      'Wrestling taught me to stay calm while someone is actively trying to fold me in half.',
      'It also taught me discipline, conditioning, and a deep respect for the scale on weigh-in day. My problem-solving style still comes from the mat: good position first, keep moving, never stop working.'
    ],
    photo: 'wrestling',
    actions: [],
    view: { zoom: 1.45 }
  },

  spikes: {
    name: 'Track spikes',
    kicker: 'Track & field',
    title: 'Track spikes',
    body: [
      'These live on my desk as a reminder to move fast.',
      'They are also a reminder to stop leaving spikes on my desk.',
      'Ask me about my PRs. I will tell you. At length.'
    ],
    actions: [],
    view: { zoom: 1.45 }
  },

  sketchbook: {
    name: 'Sketchbook',
    kicker: 'Sketching',
    title: 'Sketchbook',
    body: [
      'Where ideas go before they\'re allowed anywhere near a code editor.',
      'Half of it is drawings. The other half is circuit diagrams that look like drawings. Scanned pages are coming soon.'
    ],
    actions: [],
    view: { zoom: 1.35, dir: [0, 1.3, 0.75] }
  },

  drill: {
    name: 'Power drill',
    kicker: 'Building things',
    title: 'Power drill',
    body: [
      'For the projects that don\'t compile: shelves, mounts, and the occasional "how hard could it be?"',
      'ECE in theory, power tools in practice. Engineering, but louder. Latest build: letters taller than I am.'
    ],
    photo: 'workshop',
    actions: [],
    view: { zoom: 1.45 }
  },

  mouse: {
    name: 'Gaming mouse',
    kicker: 'Gaming',
    title: 'Gaming mouse',
    body: [
      'RGB lighting, far too many DPI settings, and used mostly for spreadsheets.',
      'It\'s also the mouse for this computer. Click the screen to use it. Yes, there\'s Minesweeper.'
    ],
    actions: [{ label: 'Play Minesweeper', app: 'minesweeper' }, { label: 'Play Snake', app: 'snake' }],
    view: { zoom: 1.4 }
  },

  pennant: {
    name: 'Duke pennant',
    kicker: 'Duke University',
    title: 'Go Blue Devils',
    body: [
      'I study Electrical & Computer Engineering, Computer Science and Math at Duke. Yes, all three. Yes, on purpose.',
      'I\'m also a brother of Delta Sigma Pi, Duke\'s co-ed business fraternity, because engineers should know what a P&L is too.'
    ],
    photo: 'me',
    actions: [{ label: 'See my experience', app: 'experience' }, { label: 'About me', app: 'about' }],
    view: { dir: [0, 0.15, 1], zoom: 1.25 }
  },

  floppies: {
    name: 'Floppy disks',
    kicker: 'Projects',
    title: 'Project disks',
    body: [
      'Every project gets its own floppy. 1.44 MB of ambition each.',
      'SCUBAGO is my dive-site map. PORTFOLIO \'98 is the thing you\'re looking at right now. The red one is top secret (it\'s the next project).'
    ],
    actions: [{ label: 'Load projects on the PC', app: 'projects' }, { label: 'ScubaGo on GitHub', url: SCUBAGO }],
    view: { zoom: 1.7, dir: [0, 1.2, 0.8] }
  },

  resume: {
    name: 'Resume',
    kicker: 'Paperwork',
    title: 'Resume',
    body: [
      'The paper copy. Coffee ring included at no extra charge.',
      'Open it on the computer for the full version, or grab the plain page if you\'re in a hurry.'
    ],
    actions: [{ label: 'Open Resume.doc on the PC', app: 'resume' }, { label: 'Plain version', url: 'plain.html' }, { label: 'Email Omar', url: 'mailto:omar_ozalp@duke.edu' }],
    view: { zoom: 1.05, dir: [0, 1.6, 0.55] }
  },

  photos: {
    name: 'Photo string',
    kicker: 'Camera roll',
    title: 'Life outside the terminal',
    body: [
      'A few favorites from off the keyboard: a dive trip out of Cairns, a yellowtail that did not come quietly, the team rushing the mat, and a day in the shop with a very large saw.',
      'Click one to open it on the computer.'
    ],
    gallery: ['dive-crew', 'yellowtail', 'wrestling', 'workshop'],
    actions: [{ label: 'Open My Pictures on the PC', app: 'pictures' }],
    view: { dir: [0, 0.12, 1], zoom: 0.85 }
  }
};
