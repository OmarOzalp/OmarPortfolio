// apps.js — the OzalpOS 98 programs: About, Experience, Projects, Explorer, Notepad, Resume (WordPad),
// My Pictures, Display Properties, OZ-DOS Prompt, Help, Run and Shut Down. Games live in games/.

(function() {
  var esc = OS.esc;
  var P = VFS.PROFILE;

  // Drop a PDF at assets/resume.pdf and set this to enable the Download button.
  var RESUME_PDF = null; // '../assets/resume.pdf'

  // My Pictures. Add photos to assets/photos/ and list them here: { file, caption, src: '../assets/photos/x.jpg' }.
  var PICTURES = [
    { file: 'dive_trip.jpg', caption: 'Somewhere ~18m down' },
    { file: 'wrestling.jpg', caption: 'On the mat' },
    { file: 'track_meet.jpg', caption: 'Spikes on, phone off' },
    { file: 'sketch_01.jpg', caption: 'From the sketchbook' },
    { file: 'duke.jpg', caption: 'Duke' },
    { file: 'home.jpg', caption: 'Kuwait & Dubai' }
  ];

  function openUrl(url) {
    if (url.indexOf('mailto:') === 0) {
      try { (window.top || window).location.href = url; } catch (e) { window.location.href = url; }
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  function linkButtons() {
    return '<div class="link-row">' +
      '<button class="btn" data-url="' + esc(P.links.github) + '">GitHub</button>' +
      '<button class="btn" data-url="' + esc(P.links.linkedin) + '">LinkedIn</button>' +
      '<button class="btn" data-url="mailto:' + esc(P.links.email) + '">Email me</button>' +
    '</div>';
  }
  function wireLinks(root) {
    root.querySelectorAll('[data-url]').forEach(function(b) {
      b.addEventListener('click', function() { openUrl(b.getAttribute('data-url')); });
    });
    root.querySelectorAll('[data-app]').forEach(function(b) {
      b.addEventListener('click', function() { OS.wm.open(b.getAttribute('data-app')); });
    });
  }

  /* ---------------- About Me ---------------- */
  OS.registerApp('about', {
    title: 'About Me', icon: 'user',
    width: 520, height: 'auto',
    resizable: false,
    bodyClass: 'padded',
    render: function() {
      return '<div class="about-wrap">' +
        '<div class="about-photo"><img src="../assets/photos/me.jpg" alt="Omar Ozalp" style="width:100%;height:100%;object-fit:cover;display:block" ' +
          'onerror="this.parentNode.textContent=\'me.jpg\\n(photo loading since 1998)\'"></div>' +
        '<div>' +
          '<h2>' + esc(P.name) + '</h2>' +
          '<p><b>' + esc(P.headline) + '</b></p>' +
          '<p class="selectable">' + esc(P.bio) + '</p>' +
          '<div class="about-tags">' + P.interests.map(function(i) { return '<span>' + esc(i) + '</span>'; }).join('') + '</div>' +
          linkButtons() +
          '<div class="link-row"><button class="btn" data-app="resume">Open Resume.doc</button><button class="btn" data-app="projects">See projects</button></div>' +
        '</div>' +
      '</div>';
    },
    onMount: function(win) { wireLinks(win.body); }
  });

  /* ---------------- Experience ---------------- */
  OS.registerApp('experience', {
    title: 'Experience', icon: 'briefcase',
    width: 480, height: 400,
    bodyClass: 'sunken-body',
    render: function() {
      var html = P.experience.map(function(x) {
        return '<div class="exp-item">' + OS.icon('briefcase') + '<div>' +
          '<h3>' + esc(x.company) + '</h3>' +
          '<div class="meta">' + esc(x.role) + ' \xb7 ' + esc(x.location) + '</div>' +
          '<p>' + esc(x.desc) + '</p></div></div>';
      }).join('');
      html += P.activities.map(function(a) {
        return '<div class="exp-item">' + OS.icon('user') + '<div>' +
          '<h3>' + esc(a.name) + '</h3><p>' + esc(a.desc) + '</p></div></div>';
      }).join('');
      return html;
    }
  });

  /* ---------------- Projects ---------------- */
  OS.registerApp('projects', {
    title: 'Projects', icon: 'floppy',
    width: 520, height: 430,
    bodyClass: 'padded',
    render: function() {
      return VFS.PROJECTS.map(function(p) {
        return '<article class="project-card">' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p><i>' + esc(p.tagline) + '</i></p>' +
          '<p>' + esc(p.description) + '</p>' +
          '<ul>' + p.points.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
          '<div class="project-tags">' + p.tags.map(function(t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
          '<div class="project-actions">' +
            '<button class="btn" data-url="' + esc(p.url) + '">View on GitHub</button>' +
            '<button class="btn" data-browse="' + esc(p.path) + '">Browse files</button>' +
            '<button class="btn" data-dos="' + esc(p.path) + '">Open in DOS</button>' +
          '</div>' +
        '</article>';
      }).join('') +
      '<p style="color:#444;margin:4px 2px">More disks coming soon. This drive has room for 1.44MB of ambition.</p>';
    },
    onMount: function(win) {
      wireLinks(win.body);
      win.body.querySelectorAll('[data-browse]').forEach(function(b) {
        b.addEventListener('click', function() { OS.wm.open('explorer', { path: b.getAttribute('data-browse') }); });
      });
      win.body.querySelectorAll('[data-dos]').forEach(function(b) {
        b.addEventListener('click', function() { OS.wm.open('dos', { cwd: b.getAttribute('data-dos'), key: b.getAttribute('data-dos') }); });
      });
    }
  });

  /* ---------------- Explorer ---------------- */
  function winPath(abs) {
    if (abs === 'mycomputer') return 'My Computer';
    if (abs === '/recycled') return 'Recycle Bin';
    return 'C:' + (abs === '/' ? '\\' : abs.replace(/\//g, '\\'));
  }
  function folderName(abs) {
    if (abs === 'mycomputer') return 'My Computer';
    if (abs === '/recycled') return 'Recycle Bin';
    if (abs === '/') return '(C:)';
    return abs.split('/').pop();
  }
  function entryIcon(abs, name) {
    if (VFS.isDir(abs)) {
      if (name === 'games') return 'games';
      if (name === 'pictures') return 'pictures';
      return 'folder';
    }
    var app = VFS.appOf(abs);
    if (app) return OS.apps[app] && OS.apps[app].icon || 'run';
    var ext = name.split('.').pop();
    if (ext === 'url') return 'url';
    if (ext === 'doc') return 'doc';
    return 'txt';
  }
  function openPath(abs) {
    var app = VFS.appOf(abs);
    if (app) { OS.wm.open(app); return; }
    if (abs.slice(-4) === '.url') { openUrl(VFS.read(abs).trim()); return; }
    OS.wm.open('notepad', { path: abs, key: abs });
  }

  var MY_COMPUTER = [
    { label: '3\xbd Floppy (A:)', icon: 'floppy', path: VFS.HOME + '/projects' },
    { label: 'Omar (C:)', icon: 'drive', path: VFS.HOME },
    { label: 'My Pictures', icon: 'pictures', app: 'pictures' },
    { label: 'Control Panel', icon: 'settings', app: 'display' },
    { label: 'Recycle Bin', icon: 'bin-full', path: '/recycled' }
  ];

  OS.registerApp('explorer', {
    title: 'Explorer', icon: 'folder',
    width: 520, height: 380,
    singleton: false,
    render: function() {
      return '<div class="explorer">' +
        '<div class="toolbar">' +
          '<button class="tool-btn" data-act="back" disabled>← Back</button>' +
          '<button class="tool-btn" data-act="up">↑ Up</button>' +
          '<div class="address"><span>Address</span><div class="field"><span class="addr-icon"></span><span class="addr-text"></span></div></div>' +
        '</div>' +
        '<div class="explorer-view"></div>' +
        '<div class="statusbar"><div class="status-field ex-count"></div><div class="status-field" style="flex:0 0 120px">' + OS.icon('computer', 'tiny') + ' My Computer</div></div>' +
      '</div>';
    },
    onMount: function(win, opts) {
      var view = win.body.querySelector('.explorer-view');
      var backBtn = win.body.querySelector('[data-act="back"]');
      var upBtn = win.body.querySelector('[data-act="up"]');
      var history = [];
      var cwd = null;
      win.setMenu([
        { label: 'File', items: [{ label: 'Close', onClick: function() { win.close(); } }] },
        { label: 'View', items: [{ label: 'Large Icons', checked: true }, { label: 'Refresh', onClick: function() { show(cwd); } }] },
        { label: 'Help', items: [{ label: 'About OzalpOS 98', onClick: function() { OS.wm.open('help'); } }] }
      ]);

      function show(path, push) {
        if (push && cwd) history.push(cwd);
        cwd = path;
        backBtn.disabled = !history.length;
        upBtn.disabled = path === 'mycomputer';
        var name = folderName(path);
        win.setTitle(name);
        var icon = path === 'mycomputer' ? 'computer' : path === '/recycled' ? 'bin-full' : 'folder';
        win.body.querySelector('.addr-icon').innerHTML = OS.icon(icon);
        win.body.querySelector('.addr-text').textContent = winPath(path);
        var items = [];
        if (path === 'mycomputer') {
          items = MY_COMPUTER;
        } else {
          (VFS.list(path) || []).filter(function(n) { return n.charAt(0) !== '.'; }).forEach(function(n) {
            var abs = VFS.normalize(path + '/' + n);
            items.push({ label: n, icon: entryIcon(abs, n), path: abs });
          });
        }
        view.innerHTML = '';
        if (path === '/recycled') {
          var note = document.createElement('div');
          note.className = 'bin-note';
          note.textContent = 'Things Omar deleted for a reason. Double-click at your own risk.';
          view.appendChild(note);
        }
        if (!items.length) {
          view.insertAdjacentHTML('beforeend', '<div class="empty-note">This folder is empty.</div>');
        }
        var grid = document.createElement('div');
        grid.className = 'icon-grid';
        items.forEach(function(it) {
          var b = document.createElement('button');
          b.className = 'file-icon';
          b.innerHTML = OS.icon(it.icon) + '<span class="label"></span>';
          b.querySelector('.label').textContent = it.label;
          function activate() {
            if (it.app) { OS.wm.open(it.app); return; }
            if (VFS.isDir(it.path)) {
              if (it.path === VFS.HOME + '/pictures') { OS.wm.open('pictures'); return; }
              show(it.path, true);
            } else openPath(it.path);
          }
          b.addEventListener('click', function(e) {
            grid.querySelectorAll('.selected').forEach(function(x) { x.classList.remove('selected'); });
            b.classList.add('selected');
            if (OS.isMobile() || e.pointerType === 'touch' || e.detail === 0) activate();
          });
          b.addEventListener('dblclick', activate);
          grid.appendChild(b);
        });
        view.appendChild(grid);
        win.body.querySelector('.ex-count').textContent = items.length + ' object(s)';
      }

      backBtn.addEventListener('click', function() { if (history.length) show(history.pop(), false); });
      upBtn.addEventListener('click', function() {
        if (cwd === 'mycomputer') return;
        if (cwd === VFS.HOME || cwd === '/recycled' || cwd === '/') { show('mycomputer', true); return; }
        show(VFS.normalize(cwd + '/..'), true);
      });
      show(opts.path || 'mycomputer', false);
    },
    onReopen: function() {}
  });

  /* ---------------- Notepad ---------------- */
  OS.registerApp('notepad', {
    title: 'Notepad', icon: 'notepad',
    width: 460, height: 340,
    singleton: true,
    render: function() { return '<textarea class="notepad" spellcheck="false"></textarea>'; },
    onMount: function(win, opts) {
      var ta = win.body.querySelector('textarea');
      var path = opts.path || null;
      var name = path ? path.split('/').pop() : 'Untitled';
      win.setTitle(name + ' - Notepad');
      ta.value = path ? (VFS.read(path) || '') : '';
      var wrap = true;
      ta.addEventListener('input', function() { if (path && path.indexOf(VFS.HOME) === 0) VFS.write(path, ta.value); });
      win.setMenu([
        { label: 'File', items: [{ label: 'Exit', onClick: function() { win.close(); } }] },
        { label: 'Edit', items: [{ label: 'Select All', onClick: function() { ta.focus(); ta.select(); } }] },
        { label: 'Format', items: function() {
          return [{ label: 'Word Wrap', checked: wrap, onClick: function() { wrap = !wrap; ta.style.whiteSpace = wrap ? 'pre-wrap' : 'pre'; } }];
        } },
        { label: 'Help', items: [{ label: 'About Notepad', onClick: function() {
          OS.alert({ title: 'About Notepad', message: 'Notepad for OzalpOS 98.\nStill the fastest text editor ever made.' });
        } }] }
      ]);
    }
  });

  /* ---------------- Resume.doc (WordPad) ---------------- */
  OS.registerApp('resume', {
    title: 'Resume.doc - WordPad', icon: 'doc',
    width: 640, height: 560,
    render: function() {
      var exp = P.experience.map(function(x) {
        return '<div class="doc-row"><span><b>' + esc(x.company) + '</b> — ' + esc(x.role) + '</span><span>' + esc(x.location) + '</span></div>' +
          '<ul><li>' + esc(x.desc) + '</li></ul>';
      }).join('');
      var proj = VFS.PROJECTS.map(function(p) {
        return '<p><b>' + esc(p.name) + '</b> — ' + esc(p.tagline) + '</p><ul>' +
          p.points.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }).join('');
      return '<div style="display:flex;flex-direction:column;height:100%">' +
        '<div class="toolbar">' +
          '<button class="tool-btn" data-act="pdf"' + (RESUME_PDF ? '' : ' disabled title="PDF coming soon"') + '>⭳ Download PDF</button>' +
          '<button class="tool-btn" data-act="plain">Plain version ↗</button>' +
          '<button class="tool-btn" data-act="email">Email Omar</button>' +
        '</div>' +
        '<div class="toolbar" aria-hidden="true">' +
          '<div class="field" style="width:150px;min-height:20px;padding:2px 4px">Times New Roman</div>' +
          '<div class="field" style="width:44px;min-height:20px;padding:2px 4px">12</div>' +
          '<button class="tool-btn" tabindex="-1"><b>B</b></button><button class="tool-btn" tabindex="-1"><i>I</i></button><button class="tool-btn" tabindex="-1"><u>U</u></button>' +
        '</div>' +
        '<div style="flex:1;min-height:0;overflow:auto;background:#808080;box-shadow:var(--sunken);padding:14px">' +
          '<div class="doc-page" style="max-width:560px;margin:0 auto;min-height:auto;box-shadow:2px 2px 0 #000">' +
            (RESUME_PDF ? '' : '<p class="doc-note">The full PDF resume is on its way. Until then, here are the highlights.</p>') +
            '<h1>' + esc(P.name) + '</h1>' +
            '<div class="doc-sub">' + esc(P.headline) + ' \xb7 ' + esc(P.links.email) + '</div>' +
            '<h2>Education</h2>' +
            '<div class="doc-row"><span><b>Duke University</b></span><span>Durham, NC</span></div>' +
            '<p>Electrical &amp; Computer Engineering, Computer Science &amp; Mathematics</p>' +
            '<h2>Experience</h2>' + exp +
            '<h2>Projects</h2>' + proj +
            '<h2>Activities</h2>' + P.activities.map(function(a) { return '<p><b>' + esc(a.name) + '</b> — ' + esc(a.desc) + '</p>'; }).join('') +
            '<h2>Interests</h2><p>' + P.interests.map(esc).join(' \xb7 ') + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="statusbar"><div class="status-field">For Help, press F1</div><div class="status-field" style="flex:0 0 60px">NUM</div></div>' +
      '</div>';
    },
    onMount: function(win) {
      var b = win.body;
      b.querySelector('[data-act="pdf"]').addEventListener('click', function() { if (RESUME_PDF) openUrl(RESUME_PDF); });
      b.querySelector('[data-act="plain"]').addEventListener('click', function() { openUrl('../plain.html'); });
      b.querySelector('[data-act="email"]').addEventListener('click', function() { openUrl('mailto:' + P.links.email); });
      win.setMenu([
        { label: 'File', items: [
          { label: 'Download PDF', disabled: !RESUME_PDF, onClick: function() { openUrl(RESUME_PDF); } },
          { label: 'Exit', onClick: function() { win.close(); } }
        ] },
        { label: 'View', items: [{ label: 'Plain version', onClick: function() { openUrl('../plain.html'); } }] },
        { label: 'Help', items: [{ label: 'About WordPad', onClick: function() {
          OS.alert({ title: 'About WordPad', message: 'WordPad for OzalpOS 98.\nThis document contains 0 typos (that we know of).' });
        } }] }
      ]);
    }
  });

  /* ---------------- My Pictures ---------------- */
  OS.registerApp('pictures', {
    title: 'My Pictures', icon: 'pictures',
    width: 560, height: 420,
    render: function() {
      return '<div class="explorer">' +
        '<div class="explorer-view" style="padding:10px"><div class="pics-grid">' +
        PICTURES.map(function(p, i) {
          return '<button class="pic-card btn" data-i="' + i + '" style="padding:6px;min-height:0">' +
            '<div class="pic-frame">' + (p.src ? '<img src="' + esc(p.src) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : OS.icon('camera')) + '</div>' +
            '<div><b>' + esc(p.file) + '</b></div><div>' + esc(p.caption) + '</div></button>';
        }).join('') +
        '</div></div>' +
        '<div class="statusbar"><div class="status-field">' + PICTURES.length + ' object(s)</div></div>' +
      '</div>';
    },
    onMount: function(win) {
      win.body.querySelectorAll('[data-i]').forEach(function(b) {
        b.addEventListener('click', function() {
          var p = PICTURES[+b.getAttribute('data-i')];
          if (p.src) OS.wm.open('photo', { key: p.file, pic: p });
          else OS.alert({ title: p.file, icon: 'info', message: 'Omar hasn\'t developed this roll of film yet.\nCheck back soon!' });
        });
      });
    }
  });

  OS.registerApp('photo', {
    title: 'Image Viewer', icon: 'pictures',
    width: 560, height: 460,
    render: function(opts) {
      var p = opts.pic;
      return '<div style="height:100%;display:flex;flex-direction:column">' +
        '<div class="sunken" style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#000">' +
        '<img src="' + esc(p.src) + '" alt="' + esc(p.caption) + '" style="max-width:100%;max-height:100%"></div>' +
        '<div class="statusbar"><div class="status-field">' + esc(p.caption) + '</div></div></div>';
    },
    onMount: function(win, opts) { win.setTitle(opts.pic.file + ' - Image Viewer'); }
  });

  /* ---------------- Display Properties ---------------- */
  OS.registerApp('display', {
    title: 'Display Properties', icon: 'display',
    width: 380, height: 'auto',
    resizable: false,
    bodyClass: 'padded',
    render: function() {
      return '<div class="tabs"><button class="tab active" data-tab="bg">Background</button><button class="tab" data-tab="settings">Settings</button></div>' +
        '<div class="tab-panel" data-panel="bg">' +
          '<div class="monitor-preview"><div class="screen wp-preview"></div></div>' +
          '<div>Wallpaper:</div>' +
          '<div class="sunken wall-list"></div>' +
        '</div>' +
        '<div class="tab-panel" data-panel="settings" hidden>' +
          '<div class="monitor-preview"><div class="screen wp-preview"></div></div>' +
          '<fieldset class="groupbox"><legend>Display</legend>OZ-CRT 17" on Omar\'s desk</fieldset>' +
          '<fieldset class="groupbox"><legend>Colors</legend>High Color (16 bit)</fieldset>' +
          '<fieldset class="groupbox"><legend>Screen area</legend>1024 by 768 pixels</fieldset>' +
        '</div>' +
        '<div class="dialog-buttons" style="justify-content:flex-end">' +
          '<button class="btn default" data-act="ok">OK</button><button class="btn" data-act="cancel">Cancel</button><button class="btn" data-act="apply">Apply</button>' +
        '</div>';
    },
    onMount: function(win) {
      var original = Settings.get('wallpaper');
      var pick = original;
      var list = win.body.querySelector('.wall-list');
      function paint() {
        win.body.querySelectorAll('.wp-preview').forEach(function(s) { s.setAttribute('data-wp', pick); });
        list.querySelectorAll('.wall-option').forEach(function(o) { o.classList.toggle('selected', o.getAttribute('data-key') === pick); });
      }
      Settings.WALLPAPERS.forEach(function(w) {
        var o = document.createElement('button');
        o.className = 'wall-option';
        o.setAttribute('data-key', w.key);
        o.textContent = w.label;
        o.addEventListener('click', function() { pick = w.key; paint(); });
        o.addEventListener('dblclick', function() { Settings.set('wallpaper', pick); });
        list.appendChild(o);
      });
      win.body.querySelectorAll('.tab').forEach(function(t) {
        t.addEventListener('click', function() {
          win.body.querySelectorAll('.tab').forEach(function(x) { x.classList.toggle('active', x === t); });
          win.body.querySelectorAll('.tab-panel').forEach(function(p) { p.hidden = p.getAttribute('data-panel') !== t.getAttribute('data-tab'); });
        });
      });
      win.body.querySelector('[data-act="ok"]').addEventListener('click', function() { Settings.set('wallpaper', pick); win.close(); });
      win.body.querySelector('[data-act="apply"]').addEventListener('click', function() { Settings.set('wallpaper', pick); });
      win.body.querySelector('[data-act="cancel"]').addEventListener('click', function() { Settings.set('wallpaper', original); win.close(); });
      paint();
    }
  });

  /* ---------------- OZ-DOS Prompt ---------------- */
  OS.registerApp('dos', {
    title: 'OZ-DOS Prompt', icon: 'dos',
    width: 600, height: 380,
    render: function() {
      return '<div class="dos term-body">' +
        '<div class="term-output"></div>' +
        '<div class="term-input-row">' +
          '<span class="term-prompt"></span>' +
          '<input class="term-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Command input">' +
        '</div>' +
      '</div>';
    },
    onMount: function(win, opts) {
      Terminal.create(win.body, opts, win);
      win.onFocusChange(function(on) {
        if (on) { var i = win.body.querySelector('.term-input'); if (i) i.focus(); }
      });
    }
  });

  /* ---------------- Help ---------------- */
  var HELP_TOPICS = [
    { t: 'Getting around', b: 'Double-click icons on the desktop to open them (one tap on a phone).\n\nThe Start button has everything: programs, documents, settings and games.\n\nDrag windows by their title bars, resize them from the bottom-right corner, and use the taskbar to switch between them.' },
    { t: 'The desk', b: 'This computer sits on Omar\'s desk. Press Esc (or the Back button at the top of the page) to step back and look around.\n\nClick things on the desk, like the dive mask, the headgear, the spikes or the sketchbook, to pick them up and learn the story behind them.' },
    { t: 'For recruiters', b: 'In a hurry? Open Resume.doc on the desktop, or use the "Plain version" link for a simple one-page view.\n\nEmail: ' + P.links.email + '\nLinkedIn: ' + P.links.linkedin + '\nGitHub: ' + P.links.github },
    { t: 'Games', b: 'Solitaire, Minesweeper and Snake live in the Games folder and the Start menu.\n\nHigh scores are saved on this computer. Productivity is not.' },
    { t: 'Secrets', b: 'The OZ-DOS Prompt understands more than it lets on. Try VER, NEOFETCH, or poking around the Recycle Bin.' }
  ];
  OS.registerApp('help', {
    title: 'OzalpOS 98 Help', icon: 'help',
    width: 520, height: 360,
    render: function() {
      return '<div style="display:flex;gap:6px;height:100%">' +
        '<div class="sunken" style="flex:0 0 150px;overflow:auto;padding:2px">' +
          HELP_TOPICS.map(function(h, i) { return '<button class="wall-option" data-i="' + i + '">' + OS.icon('help', 'tiny') + ' ' + esc(h.t) + '</button>'; }).join('') +
        '</div>' +
        '<div class="sunken selectable" style="flex:1;overflow:auto;padding:10px 12px;line-height:15px;white-space:pre-line" data-help-body></div>' +
      '</div>';
    },
    onMount: function(win) {
      var bodyEl = win.body.querySelector('[data-help-body]');
      var opts = win.body.querySelectorAll('[data-i]');
      function show(i) {
        opts.forEach(function(o) { o.classList.toggle('selected', +o.getAttribute('data-i') === i); });
        bodyEl.innerHTML = '<h3 style="margin:0 0 8px;font-size:13px"></h3><div></div>';
        bodyEl.querySelector('h3').textContent = HELP_TOPICS[i].t;
        bodyEl.querySelector('div').textContent = HELP_TOPICS[i].b;
      }
      opts.forEach(function(o) { o.addEventListener('click', function() { show(+o.getAttribute('data-i')); }); });
      show(OS.embedded ? 1 : 0);
    }
  });

  /* ---------------- Run... ---------------- */
  var RUN_ALIASES = {
    cmd: 'dos', command: 'dos', dos: 'dos', notepad: 'notepad', explorer: 'explorer', solitaire: 'solitaire', sol: 'solitaire',
    winmine: 'minesweeper', minesweeper: 'minesweeper', snake: 'snake', about: 'about', resume: 'resume',
    projects: 'projects', experience: 'experience', pictures: 'pictures', help: 'help', control: 'display', display: 'display'
  };
  var RUN_JOKES = {
    calc: 'calc.exe is out running 400m repeats. Try again later.',
    paint: 'Paint is in the sketchbook on the desk. Old school.',
    regedit: 'Access denied. Omar\'s registry is held together with duct tape.',
    iexplore: 'The information superhighway is closed for repaving. Try the GitHub button in About Me.'
  };
  OS.registerApp('run', {
    title: 'Run', icon: 'run',
    width: 360, height: 'auto',
    resizable: false,
    minimizable: false,
    bodyClass: 'padded',
    render: function() {
      return '<div class="dialog-main">' + OS.icon('run') + '<div class="dialog-msg">Type the name of a program, folder, document, or Internet resource, and OzalpOS will open it for you.</div></div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span><u>O</u>pen:</span><input class="field" style="flex:1" value="solitaire" aria-label="Open"></div>' +
        '<div class="dialog-buttons" style="justify-content:flex-end"><button class="btn default" data-act="ok">OK</button><button class="btn" data-act="cancel">Cancel</button></div>';
    },
    onMount: function(win) {
      var input = win.body.querySelector('input');
      setTimeout(function() { input.focus(); input.select(); }, 0);
      function go() {
        var v = input.value.trim();
        var k = v.toLowerCase().replace(/\.exe$/, '');
        if (!v) return;
        win.close();
        if (RUN_ALIASES[k]) { OS.wm.open(RUN_ALIASES[k]); return; }
        if (RUN_JOKES[k]) { OS.alert({ title: v, icon: 'info', message: RUN_JOKES[k] }); return; }
        if (/^https?:\/\//i.test(v)) { openUrl(v); return; }
        OS.alert({ title: v, icon: 'error', message: 'Cannot find the file \'' + v + '\' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.' });
      }
      input.addEventListener('keydown', function(e) { if (e.key === 'Enter') go(); });
      win.body.querySelector('[data-act="ok"]').addEventListener('click', go);
      win.body.querySelector('[data-act="cancel"]').addEventListener('click', function() { win.close(); });
    }
  });

  /* ---------------- Shut Down ---------------- */
  OS.registerApp('shutdown', {
    title: 'Shut Down OzalpOS', icon: 'shutdown',
    width: 330, height: 'auto',
    resizable: false,
    minimizable: false,
    bodyClass: 'padded',
    render: function() {
      var opts = [['shutdown', 'Shut down'], ['restart', 'Restart']];
      if (OS.embedded) opts.push(['desk', 'Step back to the desk']);
      return '<div class="dialog-main">' + OS.icon('shutdown') + '<div><div style="margin-bottom:8px">What do you want the computer to do?</div>' +
        opts.map(function(o, i) {
          return '<label style="display:flex;align-items:center;gap:6px;margin:4px 0"><input type="radio" name="sd" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '>' + o[1] + '</label>';
        }).join('') + '</div></div>' +
        '<div class="dialog-buttons" style="justify-content:flex-end"><button class="btn default" data-act="ok">OK</button><button class="btn" data-act="cancel">Cancel</button></div>';
    },
    onMount: function(win) {
      win.body.querySelector('[data-act="ok"]').addEventListener('click', function() {
        var v = win.body.querySelector('input[name="sd"]:checked').value;
        win.close();
        if (v === 'desk') { try { window.parent.postMessage({ ozalp: true, type: 'exit' }, location.origin); } catch (e) {} return; }
        OS.shutDown(v);
      });
      win.body.querySelector('[data-act="cancel"]').addEventListener('click', function() { win.close(); });
    }
  });
})();
