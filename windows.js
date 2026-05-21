// windows.js

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
    onMount: function(win) {
      var main         = win.querySelector('.finder-main');
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
        var div = document.createElement('div');
        div.className = 'finder-coming-soon';
        var nameEl = document.createElement('span');
        nameEl.className = 'finder-coming-soon-name';
        nameEl.textContent = filename;
        var labelEl = document.createElement('span');
        labelEl.className = 'finder-coming-soon-label';
        labelEl.textContent = 'Coming Soon';
        div.appendChild(nameEl);
        div.appendChild(labelEl);
        main.innerHTML = '';
        main.appendChild(div);
      }

      sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
          var view = item.getAttribute('data-view');
          if (view === 'home')           renderHome();
          else if (view === 'projects')  renderProjects();
          else if (view === 'downloads') renderDownloads();
        });
      });

      main.addEventListener('click', function(e) {
        var navEl  = e.target.closest('[data-nav]');
        var fileEl = e.target.closest('[data-file]');
        if (navEl) {
          var nav = navEl.getAttribute('data-nav');
          if (nav === 'projects')       renderProjects();
          else if (nav === 'downloads') renderDownloads();
        }
        else if (fileEl) { renderComingSoon(fileEl.getAttribute('data-file')); }
      });

      renderHome();
    },
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
    }
  },
  terminal: {
    title: 'Terminal',
    width: 600,
    height: 400,
    bodyClass: 'window-body--flush',
    onMount: function(win) {
      Terminal.create(win);
    },
    render: function() {
      return '<div class="term-body">' +
        '<div class="term-output"></div>' +
        '<div class="term-input-row">' +
          '<span class="term-prompt"></span>' +
          '<input class="term-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input">' +
        '</div>' +
      '</div>';
    }
  },
  settings: {
    title: 'Settings',
    width: 640,
    height: 440,
    bodyClass: 'window-body--flush',
    render: function() {
      return '<div class="finder-body">' +
        '<div class="finder-sidebar">' +
          '<div class="finder-sidebar-section">Preferences</div>' +
          '<div class="finder-sidebar-item active" data-panel="wallpaper">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
            'Wallpaper' +
          '</div>' +
          '<div class="finder-sidebar-item" data-panel="appearance">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
            'Appearance' +
          '</div>' +
          '<div class="finder-sidebar-item" data-panel="cursor">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 9-7 1-4 7z"/></svg>' +
            'Cursor' +
          '</div>' +
          '<div class="finder-sidebar-item" data-panel="dock">' +
            '<svg class="finder-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>' +
            'Dock' +
          '</div>' +
        '</div>' +
        '<div class="settings-main"></div>' +
      '</div>';
    },
    onMount: function(win) {
      var main         = win.querySelector('.settings-main');
      var sidebarItems = win.querySelectorAll('.finder-sidebar-item');

      var WALLPAPERS = [
        { key: 'default', label: 'Default' },
        { key: 'dots',    label: 'Dots'    },
        { key: 'grid',    label: 'Grid'    },
        { key: 'sunset',  label: 'Sunset'  },
        { key: 'ocean',   label: 'Ocean'   },
        { key: 'aurora',  label: 'Aurora'  }
      ];

      function setActive(panel) {
        sidebarItems.forEach(function(item) {
          item.classList.toggle('active', item.getAttribute('data-panel') === panel);
        });
      }

      function renderWallpaper() {
        var current = Settings.get('wallpaper');
        var html = '<div class="settings-section-title">Wallpaper</div><div class="settings-swatch-grid">';
        WALLPAPERS.forEach(function(w) {
          html += '<div class="settings-swatch' + (current === w.key ? ' active' : '') +
                  '" data-wallpaper="' + w.key + '" title="' + w.label + '"></div>';
        });
        html += '</div>';
        main.innerHTML = html;
        setActive('wallpaper');
      }

      function renderAppearance() {
        var current = Settings.get('theme');
        main.innerHTML =
          '<div class="settings-section-title">Appearance</div>' +
          '<div class="settings-option-row">' +
            '<button class="settings-option-btn' + (current === 'dark'  ? ' active' : '') + '" data-theme="dark">Dark</button>' +
            '<button class="settings-option-btn' + (current === 'light' ? ' active' : '') + '" data-theme="light">Light</button>' +
          '</div>';
        setActive('appearance');
      }

      function renderCursor() {
        var current = Settings.get('cursorSize');
        main.innerHTML =
          '<div class="settings-section-title">Cursor Size</div>' +
          '<div class="settings-option-row">' +
            '<button class="settings-option-btn' + (current === 'small'  ? ' active' : '') + '" data-cursor="small">Small</button>' +
            '<button class="settings-option-btn' + (current === 'medium' ? ' active' : '') + '" data-cursor="medium">Medium</button>' +
            '<button class="settings-option-btn' + (current === 'large'  ? ' active' : '') + '" data-cursor="large">Large</button>' +
          '</div>';
        setActive('cursor');
      }

      function renderDock() {
        var current = Settings.get('dockPosition');
        main.innerHTML =
          '<div class="settings-section-title">Dock Position</div>' +
          '<div class="settings-option-row">' +
            '<button class="settings-option-btn' + (current === 'bottom' ? ' active' : '') + '" data-dock-pos="bottom">Bottom</button>' +
            '<button class="settings-option-btn' + (current === 'right'  ? ' active' : '') + '" data-dock-pos="right">Right</button>' +
          '</div>';
        setActive('dock');
      }

      sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
          var panel = item.getAttribute('data-panel');
          if (panel === 'wallpaper')        renderWallpaper();
          else if (panel === 'appearance')  renderAppearance();
          else if (panel === 'cursor')      renderCursor();
          else if (panel === 'dock')        renderDock();
        });
      });

      main.addEventListener('click', function(e) {
        var swatchEl = e.target.closest('[data-wallpaper]');
        var themeEl  = e.target.closest('[data-theme]');
        var cursorEl = e.target.closest('[data-cursor]');
        var dockEl   = e.target.closest('[data-dock-pos]');
        if (swatchEl) {
          Settings.set('wallpaper', swatchEl.getAttribute('data-wallpaper'));
          renderWallpaper();
        } else if (themeEl) {
          Settings.set('theme', themeEl.getAttribute('data-theme'));
          renderAppearance();
        } else if (cursorEl) {
          Settings.set('cursorSize', cursorEl.getAttribute('data-cursor'));
          renderCursor();
        } else if (dockEl) {
          Settings.set('dockPosition', dockEl.getAttribute('data-dock-pos'));
          renderDock();
        }
      });

      renderWallpaper();
    }
  }
};

var WindowManager = (function() {
  var _counter = 200;
  var _idSeq = 0;

  function _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function focus(windowId) {
    var el = document.getElementById(windowId);
    if (!el) return;
    if (parseInt(el.style.zIndex, 10) === _counter) return;
    _counter++;
    el.style.zIndex = _counter;
  }

  function close(windowId) {
    var el = document.getElementById(windowId);
    if (el) el.parentNode.removeChild(el);
  }

  function _makeDraggable(win, titlebar) {
    titlebar.addEventListener('mousedown', function(e) {
      if (e.target.classList.contains('window-btn')) return;
      e.preventDefault();
      var startX = e.clientX - win.offsetLeft;
      var startY = e.clientY - win.offsetTop;

      function onMove(e) {
        var left = e.clientX - startX;
        var top  = e.clientY - startY;
        var maxLeft = window.innerWidth - 40;
        var maxTop  = window.innerHeight - 40;
        left = Math.max(-(win.offsetWidth - 40), Math.min(left, maxLeft));
        top  = Math.max(0, Math.min(top, maxTop));
        win.style.left = left + 'px';
        win.style.top  = top  + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function _makeResizable(win, handle) {
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var startY = e.clientY;
      var startW = win.offsetWidth;
      var startH = win.offsetHeight;

      function onMove(e) {
        var newW = Math.max(320, startW + (e.clientX - startX));
        var newH = Math.max(200, startH + (e.clientY - startY));
        win.style.width  = newW + 'px';
        win.style.height = newH + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function open(appId) {
    var app = APPS[appId];
    if (!app) return;

    var desktop = document.getElementById('desktop');
    if (!desktop) return;

    _idSeq++;
    var windowId = 'window-' + _idSeq;

    var vw = desktop.offsetWidth;
    var vh = desktop.offsetHeight;
    var left = Math.round((vw - app.width)  / 2) + _rand(-40, 40);
    var top  = Math.round((vh - app.height) / 2) + _rand(-30, 30);

    var win = document.createElement('div');
    win.className = 'os-window';
    win.id = windowId;
    win.style.width  = app.width  + 'px';
    win.style.height = app.height + 'px';
    win.style.left   = left + 'px';
    win.style.top    = top  + 'px';

    win.innerHTML =
      '<div class="window-titlebar">' +
        '<div class="window-controls">' +
          '<button class="window-btn close" aria-label="Close"></button>' +
          '<button class="window-btn minimize" aria-label="Minimize" disabled></button>' +
          '<button class="window-btn maximize" aria-label="Maximize" disabled></button>' +
        '</div>' +
        '<span class="window-title"></span>' +
      '</div>' +
      '<div class="window-body' + (app.bodyClass ? ' ' + app.bodyClass : '') + '">' + app.render() + '</div>' +
      '<div class="window-resize-handle" aria-hidden="true"></div>';

    win.querySelector('.window-title').textContent = app.title;

    win.addEventListener('mousedown', function() {
      focus(windowId);
    });

    win.querySelector('.window-btn.close').addEventListener('click', function(e) {
      e.stopPropagation();
      close(windowId);
    });

    _makeDraggable(win, win.querySelector('.window-titlebar'));
    _makeResizable(win, win.querySelector('.window-resize-handle'));

    desktop.appendChild(win);
    focus(windowId);
    if (app.onMount) app.onMount(win);
  }

  return { open: open, close: close, focus: focus };
})();
