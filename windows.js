// windows.js

var APPS = {
  about: {
    title: 'About',
    width: 480,
    height: 320,
    render: function() {
      return '<p class="win-body-text">I\'m Omar Ozalp, an ECE, CS &amp; Math student at Duke. I\'ve interned across Kuwait and Dubai, building data tools and consumer apps at companies ranging from real estate platforms to retail giants. I like working on problems that sit at the intersection of engineering and people.</p>';
    }
  },
  experience: {
    title: 'Experience',
    width: 520,
    height: 480,
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

    _idSeq++;
    var windowId = 'window-' + _idSeq;

    var desktop = document.getElementById('desktop');
    if (!desktop) return;

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
        '<span class="window-title">' + app.title + '</span>' +
      '</div>' +
      '<div class="window-body">' + app.render() + '</div>' +
      '<div class="window-resize-handle" aria-hidden="true"></div>';

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
  }

  return { open: open, close: close, focus: focus };
})();
