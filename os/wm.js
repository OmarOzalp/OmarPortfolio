// wm.js — window manager, menus and dialogs for OzalpOS 98.
//
// Apps register with OS.registerApp(id, def):
//   def.title, def.icon          title bar text and OS.ICONS key
//   def.width, def.height        outer size in px ('auto' height fits content)
//   def.minWidth, def.minHeight  resize limits (default 200 x 120)
//   def.resizable, def.maximizable (default true)
//   def.singleton                (default true) reopening focuses the existing window
//   def.bodyClass                extra classes for .window-body ('padded', 'sunken-body')
//   def.render(opts)             returns an HTML string or a Node for the body
//   def.onMount(win, opts)       wire up behaviour; win is the handle described in makeHandle()

var OS = window.OS || (window.OS = {});
OS.apps = OS.apps || {};
OS.registerApp = function(id, def) { OS.apps[id] = def; };

OS.esc = function(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

OS.isMobile = function() { return document.body.classList.contains('mobile'); };

/* ---------------- Menus ---------------- */
// Items: { label, icon, shortcut, checked, disabled, onClick, items: [...] } or '-' for a separator.
OS.menu = (function() {
  var openMenus = [];   // stack of { el, level }
  var closeCallbacks = [];

  function closeFrom(level) {
    while (openMenus.length && openMenus[openMenus.length - 1].level >= level) {
      var m = openMenus.pop();
      if (m.el.parentNode) m.el.parentNode.removeChild(m.el);
    }
    if (level === 0) {
      var cbs = closeCallbacks;
      closeCallbacks = [];
      cbs.forEach(function(fn) { fn(); });
    }
  }

  function build(items, level) {
    var el = document.createElement('div');
    el.className = 'menu';
    el.setAttribute('role', 'menu');
    var subTimer = null;
    (typeof items === 'function' ? items() : items).forEach(function(item) {
      if (item === '-') {
        var sep = document.createElement('div');
        sep.className = 'menu-sep';
        el.appendChild(sep);
        return;
      }
      var b = document.createElement('button');
      b.className = 'menu-item' + (item.checked ? ' checked' : '') + (item.items ? ' has-sub' : '');
      b.setAttribute('role', 'menuitem');
      b.disabled = !!item.disabled;
      b.innerHTML = (item.icon ? OS.icon(item.icon) : '') + '<span>' + OS.esc(item.label) + '</span>' +
        (item.shortcut ? '<span class="shortcut">' + OS.esc(item.shortcut) + '</span>' : '');
      b.addEventListener('pointerenter', function() {
        clearTimeout(subTimer);
        el.querySelectorAll('.menu-item.hot').forEach(function(x) { x.classList.remove('hot'); });
        if (item.items) {
          b.classList.add('hot');
          subTimer = setTimeout(function() { openSub(item, b, level); }, OS.isMobile() ? 0 : 150);
        } else {
          subTimer = setTimeout(function() { closeFrom(level + 1); }, 200);
        }
      });
      b.addEventListener('click', function(e) {
        e.stopPropagation();
        if (item.disabled) return;
        if (item.items) { openSub(item, b, level); return; }
        closeFrom(0);
        OS.sound.play('click');
        if (item.onClick) item.onClick();
      });
      el.appendChild(b);
    });
    return el;
  }

  function openSub(item, anchor, level) {
    closeFrom(level + 1);
    anchor.classList.add('hot');
    var r = anchor.getBoundingClientRect();
    show(item.items, { x: r.right - 3, y: r.top - 3, level: level + 1, flipX: r.left + 3 });
  }

  // opts: { x, y, level, flipX, onClose, alignBottom }
  function show(items, opts) {
    var level = opts.level || 0;
    if (level === 0) closeFrom(0);
    var el = build(items, level);
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    var w = el.offsetWidth, h = el.offsetHeight;
    var W = window.innerWidth, H = window.innerHeight;
    var x = opts.x, y = opts.alignBottom ? opts.y - h : opts.y;
    if (x + w > W) x = opts.flipX != null ? opts.flipX - w : W - w;
    if (y + h > H) y = H - h;
    el.style.left = Math.max(0, x) + 'px';
    el.style.top = Math.max(0, y) + 'px';
    el.style.visibility = '';
    openMenus.push({ el: el, level: level });
    if (opts.onClose) closeCallbacks.push(opts.onClose);
    return el;
  }

  document.addEventListener('pointerdown', function(e) {
    if (!openMenus.length) return;
    if (e.target.closest('.menu') || e.target.closest('[data-menu-anchor]')) return;
    closeFrom(0);
  }, true);

  return {
    show: show,
    close: function() { closeFrom(0); },
    isOpen: function() { return openMenus.length > 0; }
  };
})();

/* ---------------- Windows ---------------- */
OS.wm = (function() {
  var zTop = 100;
  var seq = 0;
  var cascade = 0;
  var wins = [];        // handles, in open order
  var active = null;

  var GLYPH = {
    min: '<svg width="8" height="7" viewBox="0 0 8 7"><rect x="1" y="5" width="6" height="2"/></svg>',
    max: '<svg width="9" height="8" viewBox="0 0 9 8"><path d="M0 0h9v2H0zM0 2h1v6H0zM8 2h1v6H8zM0 7h9v1H0z"/></svg>',
    restore: '<svg width="8" height="8" viewBox="0 0 8 8"><path d="M2 0h6v1H2zM2 1h6v1H2zM7 2h1v3H7zM6 4h1v1H6zM0 3h6v1H0zM0 4h6v1H0zM0 5h1v3H0zM5 5h1v3H5zM0 7h6v1H0z"/></svg>',
    close: '<svg width="8" height="7" viewBox="0 0 8 7"><path d="M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0z"/></svg>'
  };

  function root() { return document.getElementById('windows'); }
  function taskbar() { return document.getElementById('taskbar-windows'); }

  function topVisible(except) {
    var best = null;
    wins.forEach(function(w) {
      if (w === except || w.minimized) return;
      if (!best || +w.el.style.zIndex > +best.el.style.zIndex) best = w;
    });
    return best;
  }

  function setActive(w) {
    if (active === w) return;
    var prev = active;
    active = w;
    wins.forEach(function(x) {
      var on = x === w;
      x.el.classList.toggle('active', on);
      if (x.taskBtn) x.taskBtn.classList.toggle('active', on);
    });
    if (prev && prev._focusFns) prev._focusFns.forEach(function(fn) { fn(false); });
    if (w && w._focusFns) w._focusFns.forEach(function(fn) { fn(true); });
  }

  function focus(w) {
    if (!w) { setActive(null); return; }
    if (w.minimized) {
      w.minimized = false;
      w.el.classList.remove('minimized');
    }
    if (+w.el.style.zIndex !== zTop) w.el.style.zIndex = ++zTop;
    setActive(w);
  }

  function minimize(w) {
    w.minimized = true;
    w.el.classList.add('minimized');
    OS.menu.close();
    focus(topVisible(w));
  }

  function toggleMax(w, force) {
    var on = force != null ? force : !w.el.classList.contains('maximized');
    w.el.classList.toggle('maximized', on);
    var b = w.el.querySelector('.tb-max');
    if (b) {
      b.innerHTML = on ? GLYPH.restore : GLYPH.max;
      b.setAttribute('aria-label', on ? 'Restore' : 'Maximize');
    }
    w._resizeFns.forEach(function(fn) { fn(); });
  }

  function close(w) {
    if (w._closing) return;
    for (var i = 0; i < w._closeFns.length; i++) {
      if (w._closeFns[i]() === false) return;
    }
    w._closing = true;
    OS.menu.close();
    if (w.el.parentNode) w.el.parentNode.removeChild(w.el);
    if (w.taskBtn && w.taskBtn.parentNode) w.taskBtn.parentNode.removeChild(w.taskBtn);
    wins.splice(wins.indexOf(w), 1);
    if (active === w) { active = null; focus(topVisible()); }
  }

  function makeDraggable(w, bar) {
    bar.addEventListener('pointerdown', function(e) {
      if (e.button !== 0 || e.target.closest('button') || OS.isMobile()) return;
      if (w.el.classList.contains('maximized')) return;
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      var sx = e.clientX, sy = e.clientY;
      var ox = w.el.offsetLeft, oy = w.el.offsetTop;
      var area = root();
      function move(ev) {
        var W = area.clientWidth, H = area.clientHeight;
        var x = ox + ev.clientX - sx, y = oy + ev.clientY - sy;
        x = Math.max(-(w.el.offsetWidth - 60), Math.min(x, W - 60));
        y = Math.max(0, Math.min(y, H - 22));
        w.el.style.left = x + 'px';
        w.el.style.top = y + 'px';
      }
      function up() {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
      }
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
    bar.addEventListener('dblclick', function(e) {
      if (e.target.closest('button') || !w.def.maximizable) return;
      toggleMax(w);
    });
  }

  function makeResizable(w, grip) {
    grip.addEventListener('pointerdown', function(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      grip.setPointerCapture(e.pointerId);
      var sx = e.clientX, sy = e.clientY;
      var ow = w.el.offsetWidth, oh = w.el.offsetHeight;
      var minW = w.def.minWidth || 200, minH = w.def.minHeight || 120;
      function move(ev) {
        w.el.style.width = Math.max(minW, ow + ev.clientX - sx) + 'px';
        w.el.style.height = Math.max(minH, oh + ev.clientY - sy) + 'px';
        w._resizeFns.forEach(function(fn) { fn(); });
      }
      function up() {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
      }
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
  }

  // Window menubar: [{ label: 'Game', items: [...] | function() { return [...] } }]
  function setMenu(w, menus) {
    var bar = w.el.querySelector('.window-menubar');
    bar.innerHTML = '';
    bar.hidden = !menus || !menus.length;
    if (bar.hidden) return;
    var openBtn = null;
    function openFor(btn, m) {
      openBtn = btn;
      bar.querySelectorAll('.menubar-item').forEach(function(b) { b.classList.toggle('open', b === btn); });
      var r = btn.getBoundingClientRect();
      OS.menu.show(m.items, {
        x: r.left, y: r.bottom,
        onClose: function() { btn.classList.remove('open'); if (openBtn === btn) openBtn = null; }
      });
    }
    menus.forEach(function(m) {
      var b = document.createElement('button');
      b.className = 'menubar-item';
      b.setAttribute('data-menu-anchor', '');
      b.textContent = m.label;
      b.addEventListener('click', function() {
        if (openBtn === b) { OS.menu.close(); return; }
        openFor(b, m);
      });
      b.addEventListener('pointerenter', function() {
        if (openBtn && openBtn !== b) openFor(b, m);
      });
      bar.appendChild(b);
    });
  }

  function makeHandle(w) {
    return {
      id: w.id,
      appId: w.appId,
      el: w.el,
      body: w.body,
      setTitle: function(t) {
        w.title = t;
        w.el.querySelector('.title-text').textContent = t;
        w.el.setAttribute('aria-label', t);
        if (w.taskBtn) w.taskBtn.querySelector('.task-label').textContent = t;
      },
      close: function() { close(w); },
      focus: function() { focus(w); },
      minimize: function() { minimize(w); },
      maximize: function(on) { toggleMax(w, on); },
      isActive: function() { return active === w; },
      setMenu: function(menus) { setMenu(w, menus); },
      onClose: function(fn) { w._closeFns.push(fn); },
      onFocusChange: function(fn) { w._focusFns.push(fn); },
      onResize: function(fn) { w._resizeFns.push(fn); }
    };
  }

  // Low-level: open a window from a definition object (used by open() and dialogs).
  function openWindow(def, opts, appId) {
    opts = opts || {};
    def.resizable = def.resizable !== false;
    def.maximizable = def.maximizable !== false && def.resizable;
    var area = root();
    var W = area.clientWidth, H = area.clientHeight;
    var id = 'win-' + (++seq);

    var el = document.createElement('div');
    el.className = 'window' + (def.className ? ' ' + def.className : '');
    el.id = id;
    el.setAttribute('role', 'dialog');
    el.innerHTML =
      '<div class="titlebar">' + (def.icon ? OS.icon(def.icon) : '') + '<span class="title-text"></span>' +
        '<div class="title-buttons">' +
          (def.minimizable === false ? '' : '<button class="tb-min" aria-label="Minimize">' + GLYPH.min + '</button>') +
          (def.maximizable ? '<button class="tb-max" aria-label="Maximize">' + GLYPH.max + '</button>' : '') +
          '<button class="tb-close" aria-label="Close">' + GLYPH.close + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="window-menubar" hidden></div>' +
      '<div class="window-body' + (def.bodyClass ? ' ' + def.bodyClass : '') + '"></div>' +
      (def.resizable ? '<div class="resize-grip" aria-hidden="true"></div>' : '');

    var w = {
      id: id, appId: appId, key: opts.key || '', def: def, el: el,
      body: el.querySelector('.window-body'),
      minimized: false,
      _closeFns: [], _focusFns: [], _resizeFns: []
    };

    var width = Math.min(def.width || 400, W - 8);
    el.style.width = width + 'px';
    if (def.height && def.height !== 'auto') el.style.height = Math.min(def.height, H - 8) + 'px';
    el.style.zIndex = ++zTop;
    area.appendChild(el);

    var content = def.render ? def.render(opts) : '';
    if (typeof content === 'string') w.body.innerHTML = content;
    else if (content) w.body.appendChild(content);

    var handle = makeHandle(w);
    w.handle = handle;
    handle.setTitle(opts.title || def.title || '');

    // Position: centered with a cascade offset, clamped to the desktop.
    var h = el.offsetHeight;
    var step = (cascade++ % 6) * 22;
    var x = def.modal ? (W - width) / 2 : (W - width) / 2 - 50 + step;
    var y = def.modal ? (H - h) / 2 - 20 : (H - h) / 2 - 40 + step;
    el.style.left = Math.round(Math.max(0, Math.min(x, W - width))) + 'px';
    el.style.top = Math.round(Math.max(0, Math.min(y, H - h))) + 'px';

    el.addEventListener('pointerdown', function() { focus(w); }, true);
    var minB = el.querySelector('.tb-min'), maxB = el.querySelector('.tb-max');
    if (minB) minB.addEventListener('click', function() { minimize(w); });
    if (maxB) maxB.addEventListener('click', function() { toggleMax(w); });
    el.querySelector('.tb-close').addEventListener('click', function() { close(w); });
    makeDraggable(w, el.querySelector('.titlebar'));
    if (def.resizable) makeResizable(w, el.querySelector('.resize-grip'));

    if (def.taskbar !== false) {
      var tb = document.createElement('button');
      tb.className = 'task-btn';
      tb.innerHTML = (def.icon ? OS.icon(def.icon) : '') + '<span class="task-label"></span>';
      tb.querySelector('.task-label').textContent = w.title;
      tb.addEventListener('click', function() {
        if (active === w && !w.minimized) minimize(w);
        else focus(w);
      });
      taskbar().appendChild(tb);
      w.taskBtn = tb;
    }

    wins.push(w);
    if (OS.isMobile() && def.maximizable) toggleMax(w, true);
    focus(w);
    if (def.onMount) def.onMount(handle, opts);
    return handle;
  }

  function open(appId, opts) {
    var def = OS.apps[appId];
    if (!def) return null;
    opts = opts || {};
    if (def.singleton !== false) {
      var key = opts.key || '';
      for (var i = 0; i < wins.length; i++) {
        if (wins[i].appId === appId && wins[i].key === key) {
          focus(wins[i]);
          if (def.onReopen) def.onReopen(wins[i].handle, opts);
          return wins[i].handle;
        }
      }
    }
    OS.sound.play('open');
    return openWindow(def, opts, appId);
  }

  function closeAll() { wins.slice().forEach(function(w) { w._closeFns = []; close(w); }); }

  // Clamp windows back inside the desktop when the viewport shrinks.
  window.addEventListener('resize', function() {
    var area = root();
    if (!area) return;
    var W = area.clientWidth, H = area.clientHeight;
    wins.forEach(function(w) {
      if (OS.isMobile() && w.def.maximizable) toggleMax(w, true);
      var x = Math.min(w.el.offsetLeft, Math.max(0, W - 60));
      var y = Math.min(w.el.offsetTop, Math.max(0, H - 22));
      w.el.style.left = x + 'px';
      w.el.style.top = y + 'px';
    });
  });

  return {
    open: open,
    openWindow: openWindow,
    closeAll: closeAll,
    active: function() { return active ? active.handle : null; },
    count: function() { return wins.length; }
  };
})();

/* ---------------- Dialogs ---------------- */
// OS.alert({ title, message, icon: 'info'|'warning'|'error'|'question', buttons: ['OK'] }) -> Promise<label>
OS.alert = function(o) {
  o = o || {};
  var buttons = o.buttons || ['OK'];
  return new Promise(function(resolve) {
    var done = false;
    var handle = OS.wm.openWindow({
      title: o.title || 'OzalpOS',
      width: o.width || 340,
      height: 'auto',
      resizable: false,
      minimizable: false,
      modal: true,
      taskbar: false,
      className: 'dialog',
      render: function() {
        return '<div class="dialog-main">' + OS.icon(o.icon || 'info') + '<div class="dialog-msg"></div></div>' +
          '<div class="dialog-buttons">' + buttons.map(function(b, i) {
            return '<button class="btn' + (i === 0 ? ' default' : '') + '" data-i="' + i + '"></button>';
          }).join('') + '</div>';
      },
      onMount: function(win) {
        win.body.querySelector('.dialog-msg').textContent = o.message || '';
        var btns = win.body.querySelectorAll('.btn');
        btns.forEach(function(b, i) {
          b.textContent = buttons[i];
          b.addEventListener('click', function() { finish(buttons[i]); });
        });
        win.onClose(function() { if (!done) { done = true; resolve(null); } });
        setTimeout(function() { if (btns[0]) btns[0].focus(); }, 0);
        function finish(label) {
          if (done) return;
          done = true;
          resolve(label);
          win.close();
        }
      }
    }, {}, null);
    if (o.sound !== false) OS.sound.play(o.icon === 'error' || o.icon === 'warning' ? 'chord' : 'ding');
    return handle;
  });
};
