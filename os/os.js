// os.js — OzalpOS 98 shell: power states, BIOS + splash boot, desktop icons, Start menu,
// taskbar tray, and the message bridge to the 3D desk page that hosts this OS in an iframe.
//
// URL params:  ?embed     hosted inside the desk scene (parent controls power)
//              ?boot=skip  start straight on the desktop (dev and testing)

(function() {
  var params = new URLSearchParams(location.search);
  var EMBED = params.has('embed') && window.parent !== window;
  var state = 'off';
  var bootTimers = [];

  function $(id) { return document.getElementById(id); }

  function setState(next) {
    state = next;
    document.body.setAttribute('data-state', next);
    tellParent({ type: 'state', state: next });
  }

  function tellParent(msg) {
    if (!EMBED) return;
    msg.ozalp = true;
    try { window.parent.postMessage(msg, location.origin); } catch (e) {}
  }

  function clearBootTimers() {
    bootTimers.forEach(clearTimeout);
    bootTimers = [];
  }
  function later(fn, ms) { bootTimers.push(setTimeout(fn, ms)); }

  function flash(cls, ms) {
    var el = document.createElement('div');
    el.className = cls;
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, ms);
  }

  /* ---------------- Mobile layout ---------------- */
  function updateMobile() {
    var small = window.innerWidth < 700 || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900);
    document.body.classList.toggle('mobile', small);
  }
  updateMobile();
  window.addEventListener('resize', updateMobile);
  if (EMBED) document.body.classList.add('embedded');

  /* ---------------- Boot ---------------- */
  var BIOS_LINES = [
    '<span class="bios-bright">OzalpBIOS (C) 1998 Ozalp Megatrends, Inc.</span>',
    'OZ-PC 98 ACPI BIOS Revision 1004',
    '',
    'Main Processor : Omar-II 2004MHz (Duke Edition)',
    'Memory Test    : <span id="bios-mem">0K</span>',
    '',
    'Detecting IDE Primary Master   ... ',
    'Detecting IDE Primary Slave    ... ',
    'Detecting IDE Secondary Master ... ',
    'Detecting IDE Secondary Slave  ... ',
    '',
    'Caffeine Level  : <span class="bios-hl">OPTIMAL</span>',
    'Dive Computer   : Found (logbook clean)',
    'Track Spikes    : Laced',
    'Wrestling Gear  : Cleared for weigh-in',
    '',
    'Verifying DMI Pool Data ........'
  ];
  var DRIVES = ['OZ-HDD 20GB Ultra DMA', 'None', 'OZ-CDROM 48X', 'SKETCHBOOK-ZIP 100'];

  function powerOn(opts) {
    opts = opts || {};
    if (state !== 'off' && state !== 'shutdown') return;
    clearBootTimers();
    OS.wm.closeAll();
    if (opts.skip || params.get('boot') === 'skip') {
      showDesktop(true);
      return;
    }
    flash('crt-flash', 500);
    setState('bios');
    OS.sound.play('beep');
    var text = $('bios-text');
    text.innerHTML = '';
    var i = 0;
    function nextLine() {
      if (state !== 'bios') return;
      if (i >= BIOS_LINES.length) {
        text.innerHTML += '<span class="bios-cursor">_</span>';
        later(showSplash, 500);
        return;
      }
      var line = BIOS_LINES[i];
      text.innerHTML += line + '\n';
      if (line.indexOf('bios-mem') >= 0) {
        countMemory(function() { i++; later(nextLine, 120); });
        return;
      }
      if (line.indexOf('Detecting') === 0) {
        var di = i - 6;
        later(function() {
          text.innerHTML = text.innerHTML.replace(/\.\.\. \n$/, '... ' + DRIVES[di] + '\n');
          i++;
          nextLine();
        }, 150);
        return;
      }
      i++;
      later(nextLine, line ? 70 : 30);
    }
    function countMemory(done) {
      OS.sound.play('hdd');
      var mem = 0;
      (function tick() {
        if (state !== 'bios') return;
        mem = Math.min(65536, mem + 4096);
        var el = $('bios-mem');
        if (el) el.textContent = mem + 'K' + (mem === 65536 ? ' OK' : '');
        if (mem < 65536) later(tick, 40);
        else done();
      })();
    }
    later(nextLine, 350);
  }

  function showSplash() {
    if (state !== 'bios') return;
    setState('splash');
    later(function() { showDesktop(false); }, 2600);
  }

  function showDesktop(silent) {
    clearBootTimers();
    setState('desktop');
    renderIcons();
    updateClock();
    if (!silent) OS.sound.play('startup');
    later(function() {
      balloon('Welcome to OzalpOS 98!',
        EMBED ? 'Double-click icons to open them. Press Esc (or the Back button) to step back to the desk.'
              : OS.isMobile() ? 'Tap an icon to open it, or hit Start to see everything.'
              : 'Double-click icons to open them, or hit Start to see everything.');
    }, 1200);
  }

  function skipBoot() {
    if (state === 'bios' || state === 'splash') showDesktop(false);
  }

  function shutDown(mode) {
    OS.menu.close();
    closeStart();
    if (mode === 'restart') {
      OS.wm.closeAll();
      setState('off');
      later(function() { powerOn(); }, 600);
      return;
    }
    OS.sound.play('shutdown');
    OS.wm.closeAll();
    setState('shutdown');
    later(function() {
      if (EMBED) {
        flash('crt-off', 600);
        setState('off');
        tellParent({ type: 'shutdown' });
      }
    }, 2200);
  }

  /* ---------------- Desktop icons ---------------- */
  var DESKTOP_ICONS = [
    { label: 'My Computer', icon: 'computer', open: function() { OS.wm.open('explorer', { path: 'mycomputer' }); } },
    { label: 'Recycle Bin', icon: 'bin-full', open: function() { OS.wm.open('explorer', { path: '/recycled', key: 'bin' }); } },
    { label: 'About Me', icon: 'user', open: function() { OS.wm.open('about'); } },
    { label: 'Resume.doc', icon: 'doc', open: function() { OS.wm.open('resume'); } },
    { label: 'Experience', icon: 'briefcase', open: function() { OS.wm.open('experience'); } },
    { label: 'Projects', icon: 'floppy', open: function() { OS.wm.open('projects'); } },
    { label: 'My Pictures', icon: 'pictures', open: function() { OS.wm.open('pictures'); } },
    { label: 'Games', icon: 'games', open: function() { OS.wm.open('explorer', { path: VFS.HOME + '/games' }); } },
    { label: 'Solitaire', icon: 'solitaire', open: function() { OS.wm.open('solitaire'); } },
    { label: 'Minesweeper', icon: 'minesweeper', open: function() { OS.wm.open('minesweeper'); } },
    { label: 'Snake', icon: 'snake', open: function() { OS.wm.open('snake'); } },
    { label: 'OZ-DOS Prompt', icon: 'dos', open: function() { OS.wm.open('dos'); } }
  ];

  function renderIcons() {
    var wrap = $('desktop-icons');
    if (wrap.childElementCount) return;
    DESKTOP_ICONS.forEach(function(d) {
      var b = document.createElement('button');
      b.className = 'desk-icon';
      b.setAttribute('role', 'listitem');
      b.innerHTML = OS.icon(d.icon) + '<span class="label"></span>';
      b.querySelector('.label').textContent = d.label;
      b.addEventListener('click', function(e) {
        select(b);
        // Touch and mobile open on a single tap; mouse users double-click like it's 1998.
        if (OS.isMobile() || e.pointerType === 'touch' || (e.detail === 0)) d.open();
      });
      b.addEventListener('dblclick', function() { d.open(); });
      wrap.appendChild(b);
    });
  }

  function select(el) {
    document.querySelectorAll('.desk-icon.selected').forEach(function(x) { if (x !== el) x.classList.remove('selected'); });
    if (el) el.classList.add('selected');
  }

  /* ---------------- Start menu ---------------- */
  function launch(app, opts) { return function() { OS.wm.open(app, opts); }; }

  var START_ITEMS = [
    { label: 'About Me', icon: 'user', onClick: launch('about') },
    { label: 'Resume.doc', icon: 'doc', onClick: launch('resume') },
    { label: 'Projects', icon: 'floppy', onClick: launch('projects') },
    '-',
    { label: 'Programs', icon: 'programs', items: [
      { label: 'Accessories', icon: 'programs', items: [
        { label: 'Notepad', icon: 'notepad', onClick: launch('notepad', { path: VFS.HOME + '/about.txt' }) },
        { label: 'Windows Explorer', icon: 'folder', onClick: launch('explorer', { path: VFS.HOME }) }
      ] },
      { label: 'Games', icon: 'games', items: [
        { label: 'Solitaire', icon: 'solitaire', onClick: launch('solitaire') },
        { label: 'Minesweeper', icon: 'minesweeper', onClick: launch('minesweeper') },
        { label: 'Snake', icon: 'snake', onClick: launch('snake') }
      ] },
      { label: 'Experience', icon: 'briefcase', onClick: launch('experience') },
      { label: 'My Pictures', icon: 'pictures', onClick: launch('pictures') },
      { label: 'OZ-DOS Prompt', icon: 'dos', onClick: launch('dos') }
    ] },
    { label: 'Documents', icon: 'documents', items: [
      { label: 'Resume.doc', icon: 'doc', onClick: launch('resume') },
      { label: 'about.txt', icon: 'txt', onClick: launch('notepad', { path: VFS.HOME + '/about.txt' }) },
      { label: 'interests.txt', icon: 'txt', onClick: launch('notepad', { path: VFS.HOME + '/interests.txt' }) },
      { label: 'contact.txt', icon: 'txt', onClick: launch('notepad', { path: VFS.HOME + '/contact.txt' }) }
    ] },
    { label: 'Settings', icon: 'settings', items: [
      { label: 'Display Properties', icon: 'display', onClick: launch('display') },
      { label: 'Sound: on/off', icon: 'volume', onClick: function() { OS.sound.toggle(); } }
    ] },
    { label: 'Help', icon: 'help', onClick: launch('help') },
    { label: 'Run...', icon: 'run', onClick: launch('run') },
    '-',
    { label: 'Shut Down...', icon: 'shutdown', onClick: function() { OS.wm.open('shutdown'); } }
  ];

  function buildStart() {
    var menu = $('start-menu');
    menu.innerHTML = '<div class="start-banner"><span>Ozalp<b>OS 98</b></span></div><div class="start-items"></div>';
    var list = menu.querySelector('.start-items');
    START_ITEMS.forEach(function(item) {
      if (item === '-') {
        var s = document.createElement('div');
        s.className = 'start-sep';
        list.appendChild(s);
        return;
      }
      var b = document.createElement('button');
      b.className = 'start-item' + (item.items ? ' has-sub' : '');
      b.setAttribute('role', 'menuitem');
      b.innerHTML = OS.icon(item.icon) + '<span></span>';
      b.querySelector('span:last-child').textContent = item.label;
      var timer = null;
      function openSub() {
        list.querySelectorAll('.start-item.hot').forEach(function(x) { x.classList.remove('hot'); });
        OS.menu.close();
        if (!item.items) return;
        b.classList.add('hot');
        var r = b.getBoundingClientRect();
        OS.menu.show(item.items, { x: r.right - 2, y: r.top - 3, level: 1 });
      }
      b.addEventListener('pointerenter', function() {
        clearTimeout(timer);
        timer = setTimeout(openSub, item.items ? 120 : 250);
      });
      b.addEventListener('pointerleave', function() { clearTimeout(timer); });
      b.addEventListener('click', function(e) {
        e.stopPropagation();
        if (item.items) { openSub(); return; }
        closeStart();
        OS.sound.play('click');
        item.onClick();
      });
      list.appendChild(b);
    });
  }

  function openStart() {
    buildStart();
    $('start-menu').hidden = false;
    $('start-button').classList.add('open');
    $('start-button').setAttribute('aria-expanded', 'true');
    OS.sound.play('click');
  }
  function closeStart() {
    var m = $('start-menu');
    if (m.hidden) return;
    m.hidden = true;
    $('start-button').classList.remove('open');
    $('start-button').setAttribute('aria-expanded', 'false');
    OS.menu.close();
  }
  function startOpen() { return !$('start-menu').hidden; }

  $('start-button').addEventListener('click', function() {
    if (startOpen()) closeStart(); else openStart();
  });
  document.addEventListener('pointerdown', function(e) {
    if (!startOpen()) return;
    if (e.target.closest('#start-menu') || e.target.closest('#start-button') || e.target.closest('.menu')) return;
    closeStart();
  }, true);

  /* ---------------- Tray ---------------- */
  function updateClock() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    $('tray-clock').textContent = ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  setInterval(updateClock, 15000);

  function updateVolumeIcon() {
    var muted = OS.sound.isMuted();
    $('tray-volume').innerHTML = OS.icon(muted ? 'volume-muted' : 'volume');
    $('tray-volume').setAttribute('aria-label', muted ? 'Unmute sounds' : 'Mute sounds');
    $('tray-volume').title = muted ? 'Sound is off' : 'Sound is on';
  }
  $('tray-volume').addEventListener('click', function() { OS.sound.toggle(); });
  OS.sound.onChange(updateVolumeIcon);
  updateVolumeIcon();

  var balloonEl = null;
  function balloon(title, text) {
    if (balloonEl) balloonEl.remove();
    balloonEl = document.createElement('div');
    balloonEl.className = 'balloon';
    balloonEl.innerHTML = '<b></b><span></span>';
    balloonEl.querySelector('b').textContent = title;
    balloonEl.querySelector('span').textContent = text;
    $('desktop').appendChild(balloonEl);
    var el = balloonEl;
    el.addEventListener('click', function() { el.remove(); });
    setTimeout(function() { el.remove(); }, 9000);
  }
  OS.balloon = balloon;

  /* ---------------- Desktop context menu ---------------- */
  $('desktop').addEventListener('contextmenu', function(e) {
    if (e.target.closest('.window') || e.target.closest('#taskbar')) return;
    e.preventDefault();
    OS.menu.show([
      { label: 'Arrange Icons', disabled: true },
      { label: 'Line up Icons', disabled: true },
      '-',
      { label: 'Refresh', onClick: function() { var w = $('desktop-icons'); w.style.visibility = 'hidden'; setTimeout(function() { w.style.visibility = ''; }, 120); } },
      '-',
      { label: 'Properties', onClick: launch('display') }
    ], { x: e.clientX, y: e.clientY });
  });
  $('desktop').addEventListener('pointerdown', function(e) {
    if (e.target.id === 'desktop' || e.target.id === 'desktop-icons' || e.target.id === 'windows') select(null);
  });

  /* ---------------- Keyboard ---------------- */
  document.addEventListener('keydown', function(e) {
    if (state === 'off' && !EMBED) { powerOn(); return; }
    if (state === 'shutdown') { setState('off'); powerOn(); return; }
    if (state === 'bios' || state === 'splash') { skipBoot(); return; }
    if (e.key === 'Escape') {
      if (OS.menu.isOpen()) { OS.menu.close(); return; }
      if (startOpen()) { closeStart(); return; }
      tellParent({ type: 'exit' });
    }
    if ((e.key === 'Meta' || e.key === 'OS') && state === 'desktop') {
      if (startOpen()) closeStart(); else openStart();
    }
  });

  $('screen-off').addEventListener('click', function() { if (!EMBED) powerOn(); });
  $('bios').addEventListener('click', skipBoot);
  $('splash').addEventListener('click', skipBoot);
  $('shutdown').addEventListener('click', function() { setState('off'); powerOn(); });

  /* ---------------- Bridge to the desk page ---------------- */
  window.addEventListener('message', function(e) {
    if (e.origin !== location.origin || !e.data || !e.data.ozalp) return;
    var d = e.data;
    if (d.type === 'power') {
      if (d.on) powerOn({ skip: d.skip });
      else { clearBootTimers(); OS.wm.closeAll(); closeStart(); setState('off'); }
    } else if (d.type === 'open') {
      if (state !== 'desktop') showDesktop(false);
      OS.wm.open(d.app, d.opts || {});
    } else if (d.type === 'focus') {
      window.focus();
      var w = OS.wm.active();
      var input = w && w.body.querySelector('input, textarea');
      if (input) input.focus();
    } else if (d.type === 'blur') {
      closeStart();
      OS.menu.close();
    }
  });

  OS.shutDown = shutDown;
  OS.powerOn = powerOn;
  OS.state = function() { return state; };
  OS.embedded = EMBED;

  $('start-logo').innerHTML = OS.icon('logo');
  $('splash-logo').innerHTML = OS.icon('logo', 'splash-logo');

  setState('off');
  tellParent({ type: 'ready' });
  if (!EMBED && params.get('boot') === 'skip') powerOn({ skip: true });
})();
