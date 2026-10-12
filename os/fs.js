// fs.js — shared virtual filesystem for Explorer and the DOS prompt, plus Omar's profile data.
// Directories are objects, files are strings. Paths are absolute, e.g. /home/omar/projects.

var VFS = (function() {

  var HOME = '/home/omar';

  var SCUBAGO_README = [
    '# ScubaGo',
    '',
    'A map of the world\'s dive sites and the marine life seen at them.',
    'Log what you saw, grow your species collection, and find out where',
    'to go to see a whale shark.',
    '',
    'Built with Expo (React Native + TypeScript). Runs fully local:',
    'dive sites and species are bundled, sightings live in SQLite on',
    'device, and demo community sightings are generated on first launch.',
    '',
    '## Features',
    '- Map tab: ~65 famous dive sites worldwide; search "where can I see',
    '  a..." to highlight sites where a species has been spotted.',
    '- My Log tab: your sightings plus a species dex of 119 curated',
    '  species with rarity tiers (common -> legendary).',
    '- Log flow: site -> species -> date/notes/photo, designed for speed.',
    '- Offline-first writes: sightings save immediately with a sync flag;',
    '  an outbox drains to Supabase once a backend is configured.',
    '',
    '## Stack',
    'Expo, React Native, TypeScript, expo-router, zustand, SQLite, Supabase',
    '',
    'Repo: https://github.com/OmarOzalp/scubago'
  ].join('\n');

  // Who Omar is, in one place. Used by the About, Experience and Resume apps and the plain page.
  var PROFILE = {
    name: 'Omar Ozalp',
    headline: 'ECE, CS & Math @ Duke University',
    bio: 'I\'m an ECE, CS & Math student at Duke. I\'ve interned across Kuwait and Dubai, building data tools ' +
      'and consumer apps at companies ranging from real estate platforms to retail giants. I like problems that ' +
      'sit where engineering meets people. Off the keyboard I\'m diving, wrestling, running track, sketching, ' +
      'or building something with a power drill I probably shouldn\'t own.',
    links: {
      github: 'https://github.com/omarozalp',
      linkedin: 'https://www.linkedin.com/in/omar-ozalp',
      email: 'omar_ozalp@duke.edu'
    },
    experience: [
      { company: '4Sale', role: 'Intern', location: 'Kuwait City, Kuwait',
        desc: 'Used SQL to identify and flag malicious client activity within the platform.' },
      { company: 'Property Finder', role: 'Intern', location: 'Dubai, UAE',
        desc: 'Developed data reports analyzing real estate market trends across the UAE.' },
      { company: 'Majid Al Futtaim', role: 'Intern', location: 'Dubai, UAE',
        desc: 'Built features for a loyalty and rewards app, personalizing offers for users across the MAF portfolio.' }
    ],
    activities: [
      { name: 'Delta Sigma Pi', desc: 'Co-ed Business Fraternity \xb7 Duke University' }
    ],
    interests: ['Scuba diving', 'Wrestling', 'Track & field', 'Sketching', 'Building things', 'Gaming']
  };

  var INTERESTS_TXT = [
    'interests.txt -- the non-resume stuff',
    '======================================',
    '',
    '[Diving]      My favorite place is somewhere below the surface. I built ScubaGo',
    '              so I could stop guessing where the whale sharks are.',
    '',
    '[Wrestling]   The headgear on my desk has seen things. Wrestling taught me',
    '              that the mat is extremely honest about your conditioning.',
    '',
    '[Track]       The spikes are on the desk so I remember to run fast.',
    '              (And to stop leaving spikes on the desk.)',
    '',
    '[Sketching]   I keep a sketchbook for ideas that don\'t fit in a text editor.',
    '',
    '[Building]    Proud owner of one (1) power drill and many opinions about',
    '              wall anchors.',
    '',
    '[Gaming]      The RGB on my mouse adds +10 FPS. This is science.',
    '',
    '[Duke]        ECE, CS & Math. Yes, all three. Yes, on purpose.'
  ].join('\n');

  var tree = {
    home: {
      omar: {
        'about.txt': [
          'Omar Ozalp',
          'ECE, CS & Math @ Duke University',
          '',
          'I\'ve interned across Kuwait and Dubai, building data tools and',
          'consumer apps at companies ranging from real estate platforms to',
          'retail giants. I like working on problems that sit at the',
          'intersection of engineering and people.'
        ].join('\n'),
        'interests.txt': INTERESTS_TXT,
        'contact.txt': [
          'github:   https://github.com/omarozalp',
          'linkedin: https://www.linkedin.com/in/omar-ozalp',
          'email:    omar_ozalp@duke.edu'
        ].join('\n'),
        'resume.doc': '#!app:resume',
        '.bashrc': '# OzalpOS shell config\nexport PS1=\'omar@ozalpos:\\w$ \'\nalias ll=\'ls -la\'',
        projects: {
          scubago: {
            'README.md': SCUBAGO_README,
            'stack.txt': 'Expo\nReact Native\nTypeScript\nexpo-router\nzustand\nSQLite\nSupabase',
            'link.url': 'https://github.com/OmarOzalp/scubago'
          }
        },
        games: {
          'solitaire.exe': '#!app:solitaire',
          'minesweeper.exe': '#!app:minesweeper',
          'snake.exe': '#!app:snake'
        },
        pictures: {},
        downloads: {}
      }
    },
    recycled: {
      'sleep_schedule.txt': 'This file is empty.\nIt has always been empty.\nIt will be empty again during finals.',
      'procrastination_plan_v7.txt': 'Step 1: Make a plan.\nStep 2: Refine the plan.\nStep 3: Save as procrastination_plan_v8.txt.',
      'weight_cut_snacks.txt': 'Approved snacks the week of a weigh-in:\n  1. Water (sips)\n  2. Thinking about pizza\n  3. Looking at pizza\n  4. Water (smaller sips)',
      'excuses.txt': '- My dive computer ate my homework.\n- The power drill was too loud to hear the alarm.\n- Lag. It was lag.',
      'my_first_website.html': '<html>\n<body bgcolor="black">\n<marquee><font color="lime">WELCOME 2 OMARS HOMEPAGE!!!</font></marquee>\n<img src="under_construction.gif">\n<p>You are visitor #000042</p>\n</body>\n</html>'
    },
    etc: {
      motd: 'Welcome to OzalpOS. Type \'help\' for available commands.',
      hostname: 'ozalpos',
      'os-release': 'NAME="OzalpOS"\nVERSION="98"\nID=ozalpos\nPRETTY_NAME="OzalpOS 98"'
    },
    bin: {}
  };

  // Project metadata used by the Projects app, Explorer and the desk's floppy disks.
  var PROJECTS = [
    {
      id: 'scubago',
      name: 'ScubaGo',
      tagline: 'A map of the world\'s dive sites and the marine life seen at them.',
      description: 'Log what you saw, grow your species collection, and find out where to go to see a whale shark. Expo + React Native + Supabase.',
      points: [
        '~65 famous dive sites worldwide, searchable by species',
        'Species dex of 119 curated species with rarity tiers',
        'Offline-first: SQLite on device with an outbox that syncs to Supabase'
      ],
      tags: ['Expo', 'React Native', 'TypeScript', 'SQLite', 'Supabase'],
      url: 'https://github.com/OmarOzalp/scubago',
      path: HOME + '/projects/scubago'
    }
  ];

  function normalize(path, cwd) {
    if (!path || path === '~') path = HOME;
    else if (path.indexOf('~/') === 0) path = HOME + path.slice(1);
    var parts = (path.charAt(0) === '/' ? [] : (cwd || HOME).split('/').filter(Boolean));
    path.split('/').forEach(function(p) {
      if (!p || p === '.') return;
      if (p === '..') parts.pop();
      else parts.push(p);
    });
    return '/' + parts.join('/');
  }

  function node(absPath) {
    var cur = tree;
    var parts = absPath.split('/').filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, parts[i])) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function isDir(absPath)  { var n = node(absPath); return n !== undefined && typeof n === 'object'; }
  function isFile(absPath) { return typeof node(absPath) === 'string'; }
  function read(absPath)   { return isFile(absPath) ? node(absPath) : null; }

  function list(absPath) {
    var n = node(absPath);
    if (!n || typeof n !== 'object') return null;
    return Object.keys(n).sort(function(a, b) {
      var da = typeof n[a] === 'object', db = typeof n[b] === 'object';
      if (da !== db) return da ? -1 : 1;
      return a.localeCompare(b);
    });
  }

  function mkdir(absPath) {
    var parent = normalize(absPath + '/..');
    var name = absPath.split('/').filter(Boolean).pop();
    var p = node(parent);
    if (!p || typeof p !== 'object' || !name) return false;
    if (Object.prototype.hasOwnProperty.call(p, name)) return false;
    p[name] = {};
    return true;
  }

  function write(absPath, content, append) {
    var parent = normalize(absPath + '/..');
    var name = absPath.split('/').filter(Boolean).pop();
    var p = node(parent);
    if (!p || typeof p !== 'object' || !name) return false;
    if (typeof p[name] === 'object') return false;
    p[name] = append && typeof p[name] === 'string' ? p[name] + content : content;
    return true;
  }

  function remove(absPath, recursive) {
    var parent = normalize(absPath + '/..');
    var name = absPath.split('/').filter(Boolean).pop();
    var p = node(parent);
    if (!p || typeof p !== 'object' || !name || !Object.prototype.hasOwnProperty.call(p, name)) return 'missing';
    if (typeof p[name] === 'object') {
      if (!recursive) return 'isdir';
      if (absPath === HOME || absPath === '/') return 'protected';
    }
    delete p[name];
    return 'ok';
  }

  function display(absPath) {
    if (absPath === HOME) return '~';
    if (absPath.indexOf(HOME + '/') === 0) return '~' + absPath.slice(HOME.length);
    return absPath;
  }

  return {
    HOME: HOME,
    PROFILE: PROFILE,
    PROJECTS: PROJECTS,
    appOf: function(absPath) { var c = read(absPath); return c && c.indexOf('#!app:') === 0 ? c.slice(6).trim() : null; },
    normalize: normalize,
    isDir: isDir,
    isFile: isFile,
    read: read,
    list: list,
    mkdir: mkdir,
    write: write,
    remove: remove,
    display: display
  };
})();
