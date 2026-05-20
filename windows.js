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
        if (navEl)       { navEl.getAttribute('data-nav') === 'projects' ? renderProjects() : renderDownloads(); }
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
