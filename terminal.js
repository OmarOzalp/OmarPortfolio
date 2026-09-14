// terminal.js — a Linux-style shell over the shared VFS.

var Terminal = (function() {

  var USER = 'omar', HOST = 'ozalpos';
  var BOOT_TIME = Date.now();

  var HELP_TEXT = [
    'OzalpOS shell — available commands:',
    '  ls [-la] [path]      list directory contents',
    '  cd [path]            change directory',
    '  pwd                  print working directory',
    '  cat <file>...        print file contents',
    '  head/tail [-n N] <f> first/last lines of a file',
    '  tree [path]          show directory tree',
    '  find [path] [-name]  find files by name',
    '  grep <pat> <file>    search a file for a pattern',
    '  wc <file>            line, word, byte counts',
    '  touch <file>         create an empty file',
    '  mkdir <dir>          create a directory',
    '  rm [-r] <path>       remove a file or directory',
    '  echo <text> [> f]    print text (supports > and >> redirects)',
    '  open <target>        open github | linkedin | scubago | email | <path>',
    '  whoami / hostname    user and host names',
    '  uname [-a]           system information',
    '  uptime / date        time information',
    '  neofetch             system summary',
    '  theme [dark|light]   change the OS theme',
    '  history              command history',
    '  clear                clear the terminal (or Ctrl+L)',
    '  help                 this message',
    'Tab completes commands and paths. Up/Down browse history.'
  ].join('\n');

  var LINKS = {
    github:   'https://github.com/omarozalp',
    linkedin: 'https://www.linkedin.com/in/omar-ozalp',
    scubago:  'https://github.com/OmarOzalp/scubago',
    email:    'mailto:omar_ozalp@duke.edu'
  };

  function promptStr(cwd) { return USER + '@' + HOST + ':' + VFS.display(cwd) + '$'; }

  function longListing(abs, names) {
    var lines = ['total ' + (names.length * 4)];
    lines.push('drwxr-xr-x  ' + USER + ' ' + USER + '  4096 Sep 14 10:00 .');
    lines.push('drwxr-xr-x  ' + USER + ' ' + USER + '  4096 Sep 14 10:00 ..');
    names.forEach(function(n) {
      var child = VFS.normalize(abs + '/' + n);
      if (VFS.isDir(child)) {
        lines.push('drwxr-xr-x  ' + USER + ' ' + USER + '  4096 Sep 14 10:00 ' + n);
      } else {
        var size = String(VFS.read(child).length);
        while (size.length < 5) size = ' ' + size;
        lines.push('-rw-r--r--  ' + USER + ' ' + USER + ' ' + size + ' Sep 14 10:00 ' + n);
      }
    });
    return lines.join('\n');
  }

  function treeLines(abs, prefix, out) {
    var names = VFS.list(abs) || [];
    names.forEach(function(n, i) {
      var last = i === names.length - 1;
      var child = VFS.normalize(abs + '/' + n);
      var dir = VFS.isDir(child);
      out.push(prefix + (last ? '└── ' : '├── ') + n + (dir ? '/' : ''));
      if (dir) treeLines(child, prefix + (last ? '    ' : '│   '), out);
    });
    return out;
  }

  function findAll(abs, pattern, out) {
    var names = VFS.list(abs) || [];
    names.forEach(function(n) {
      var child = VFS.normalize(abs + '/' + n);
      if (!pattern || pattern.test(n)) out.push(VFS.display(child));
      if (VFS.isDir(child)) findAll(child, pattern, out);
    });
    return out;
  }

  function globToRegex(glob) {
    return new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  }

  function fmtUptime() {
    var s = Math.floor((Date.now() - BOOT_TIME) / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return (h ? h + 'h ' : '') + m + 'm ' + (s % 60) + 's';
  }

  // Each command returns a string (stdout). Errors are strings too; state lives in ctx.
  var COMMANDS = {
    help: function() { return HELP_TEXT; },

    ls: function(args, ctx) {
      var flags = args.filter(function(a) { return a.charAt(0) === '-'; }).join('');
      var paths = args.filter(function(a) { return a.charAt(0) !== '-'; });
      if (!paths.length) paths = ['.'];
      var all = flags.indexOf('a') >= 0, long = flags.indexOf('l') >= 0;
      var out = [];
      paths.forEach(function(p) {
        var abs = VFS.normalize(p, ctx.cwd);
        if (VFS.isFile(abs)) { out.push(p); return; }
        var names = VFS.list(abs);
        if (!names) { out.push('ls: cannot access \'' + p + '\': No such file or directory'); return; }
        if (!all) names = names.filter(function(n) { return n.charAt(0) !== '.'; });
        if (paths.length > 1) out.push(p + ':');
        if (long) out.push(longListing(abs, names));
        else out.push(names.map(function(n) { return VFS.isDir(VFS.normalize(abs + '/' + n)) ? n + '/' : n; }).join('  '));
      });
      return out.join('\n');
    },

    cd: function(args, ctx) {
      var target = args[0] || '~';
      var abs = VFS.normalize(target, ctx.cwd);
      if (VFS.isFile(abs)) return 'bash: cd: ' + target + ': Not a directory';
      if (!VFS.isDir(abs)) return 'bash: cd: ' + target + ': No such file or directory';
      ctx.cwd = abs;
      return '';
    },

    pwd: function(args, ctx) { return ctx.cwd; },

    cat: function(args, ctx) {
      if (!args.length) return 'cat: missing operand';
      return args.map(function(p) {
        var abs = VFS.normalize(p, ctx.cwd);
        if (VFS.isDir(abs)) return 'cat: ' + p + ': Is a directory';
        var c = VFS.read(abs);
        return c === null ? 'cat: ' + p + ': No such file or directory' : c;
      }).join('\n');
    },

    head: function(args, ctx) { return headTail(args, ctx, 'head'); },
    tail: function(args, ctx) { return headTail(args, ctx, 'tail'); },

    tree: function(args, ctx) {
      var abs = VFS.normalize(args[0] || '.', ctx.cwd);
      if (!VFS.isDir(abs)) return 'tree: ' + (args[0] || '.') + ': No such directory';
      return [VFS.display(abs)].concat(treeLines(abs, '', [])).join('\n');
    },

    find: function(args, ctx) {
      var start = '.', pattern = null;
      for (var i = 0; i < args.length; i++) {
        if (args[i] === '-name' && args[i + 1]) { pattern = globToRegex(args[++i].replace(/^["']|["']$/g, '')); }
        else if (args[i].charAt(0) !== '-') start = args[i];
      }
      var abs = VFS.normalize(start, ctx.cwd);
      if (!VFS.isDir(abs)) return 'find: \'' + start + '\': No such file or directory';
      return findAll(abs, pattern, []).join('\n');
    },

    grep: function(args, ctx) {
      var flags = args.filter(function(a) { return a.charAt(0) === '-'; }).join('');
      var rest = args.filter(function(a) { return a.charAt(0) !== '-'; });
      if (rest.length < 2) return 'usage: grep [-i] <pattern> <file>...';
      var re;
      try { re = new RegExp(rest[0].replace(/^["']|["']$/g, ''), flags.indexOf('i') >= 0 ? 'i' : ''); }
      catch (e) { return 'grep: invalid pattern'; }
      var out = [], files = rest.slice(1);
      files.forEach(function(p) {
        var c = VFS.read(VFS.normalize(p, ctx.cwd));
        if (c === null) { out.push('grep: ' + p + ': No such file or directory'); return; }
        c.split('\n').forEach(function(line) {
          if (re.test(line)) out.push((files.length > 1 ? p + ':' : '') + line);
        });
      });
      return out.join('\n');
    },

    wc: function(args, ctx) {
      if (!args.length) return 'wc: missing operand';
      return args.map(function(p) {
        var c = VFS.read(VFS.normalize(p, ctx.cwd));
        if (c === null) return 'wc: ' + p + ': No such file or directory';
        var lines = c.split('\n').length, words = c.split(/\s+/).filter(Boolean).length;
        return '  ' + lines + '  ' + words + '  ' + c.length + ' ' + p;
      }).join('\n');
    },

    touch: function(args, ctx) {
      if (!args.length) return 'touch: missing file operand';
      return args.map(function(p) {
        var abs = VFS.normalize(p, ctx.cwd);
        if (VFS.isFile(abs) || VFS.isDir(abs)) return '';
        return VFS.write(abs, '') ? '' : 'touch: cannot touch \'' + p + '\': No such file or directory';
      }).filter(Boolean).join('\n');
    },

    mkdir: function(args, ctx) {
      if (!args.length) return 'mkdir: missing operand';
      return args.map(function(p) {
        var abs = VFS.normalize(p, ctx.cwd);
        if (VFS.isDir(abs) || VFS.isFile(abs)) return 'mkdir: cannot create directory \'' + p + '\': File exists';
        return VFS.mkdir(abs) ? '' : 'mkdir: cannot create directory \'' + p + '\': No such file or directory';
      }).filter(Boolean).join('\n');
    },

    rm: function(args, ctx) {
      var flags = args.filter(function(a) { return a.charAt(0) === '-'; }).join('');
      var paths = args.filter(function(a) { return a.charAt(0) !== '-'; });
      if (!paths.length) return 'rm: missing operand';
      var recursive = flags.indexOf('r') >= 0 || flags.indexOf('R') >= 0;
      return paths.map(function(p) {
        var abs = VFS.normalize(p, ctx.cwd);
        if (abs === '/' && recursive) return 'rm: it is dangerous to operate recursively on \'/\'\nrm: use --no-preserve-root to override this failsafe';
        var r = VFS.remove(abs, recursive);
        if (r === 'missing') return 'rm: cannot remove \'' + p + '\': No such file or directory';
        if (r === 'isdir') return 'rm: cannot remove \'' + p + '\': Is a directory';
        if (r === 'protected') return 'rm: cannot remove \'' + p + '\': Operation not permitted';
        if (ctx.cwd.indexOf(abs) === 0) ctx.cwd = VFS.HOME;
        return '';
      }).filter(Boolean).join('\n');
    },

    echo: function(args) { return args.join(' ').replace(/^["']|["']$/g, ''); },
    whoami: function() { return USER; },
    hostname: function() { return HOST; },
    uname: function(args) {
      return args.indexOf('-a') >= 0 ? 'Linux ' + HOST + ' 6.1.0-ozalp #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' : 'Linux';
    },
    date: function() { return new Date().toString(); },
    uptime: function() { return ' up ' + fmtUptime() + ',  1 user,  load average: 0.00, 0.01, 0.05'; },
    history: function(args, ctx) {
      return ctx.history.map(function(h, i) { return '  ' + (i + 1) + '  ' + h; }).join('\n');
    },
    clear: function(args, ctx) { ctx.clear = true; return ''; },
    exit: function() { return 'logout\n(There is no escape. Close the window instead.)'; },
    sudo: function() { return USER + ' is not in the sudoers file.  This incident will be reported.'; },
    man: function(args) { return args[0] ? 'No manual entry for ' + args[0] + '. Try \'help\'.' : 'What manual page do you want?'; },
    vim:  function() { return 'vim: not installed. (You\'re on a portfolio, not a server.)'; },
    nano: function() { return 'nano: not installed. Try \'cat\' instead.'; },
    ping: function(args) { return args[0] ? 'PING ' + args[0] + ': 64 bytes: icmp_seq=0 ttl=64 time=0.042 ms' : 'usage: ping <host>'; },

    open: function(args, ctx) {
      var key = (args[0] || '').toLowerCase();
      var url = LINKS[key];
      if (!url) {
        var abs = VFS.normalize(args[0] || '', ctx.cwd);
        if (abs.slice(-4) === '.url' && VFS.isFile(abs)) url = VFS.read(abs).trim();
      }
      if (!url) return 'open: unknown target \'' + (args[0] || '') + '\'. Try: ' + Object.keys(LINKS).join(', ');
      try { window.open(url, key === 'email' ? '_self' : '_blank', 'noopener'); } catch (e) {}
      return 'Opening ' + url + ' ...';
    },

    theme: function(args) {
      var next = args[0];
      if (!next) next = (typeof Settings !== 'undefined' && Settings.get('theme') === 'dark') ? 'light' : 'dark';
      if (next !== 'dark' && next !== 'light') return 'theme: expected \'dark\' or \'light\'';
      if (typeof Settings !== 'undefined') Settings.set('theme', next);
      else document.documentElement.setAttribute('data-theme', next);
      return 'Theme set to ' + next + '.';
    },

    neofetch: function() {
      var theme = (typeof Settings !== 'undefined') ? Settings.get('theme') : 'dark';
      var right = [
        USER + '@' + HOST,
        '--------------',
        'OS: OzalpOS 1.0 (browser)',
        'Kernel: 6.1.0-ozalp',
        'Shell: ozsh 1.0',
        'Uptime: ' + fmtUptime(),
        'Theme: ' + theme,
        'Projects: ' + VFS.PROJECTS.map(function(p) { return p.id; }).join(', '),
        'Majors: ECE, CS, Math'
      ];
      var left = [
        '      ____      ',
        '     / __ \\     ',
        '    | |  | |    ',
        '    | |  | |    ',
        '    | |__| |    ',
        '     \\____/     ',
        '                ',
        '    OzalpOS     ',
        '                '
      ];
      return left.map(function(l, i) { return l + '  ' + (right[i] || ''); }).join('\n');
    }
  };
  COMMANDS.ll = function(args, ctx) { return COMMANDS.ls(['-la'].concat(args), ctx); };
  COMMANDS.dir = COMMANDS.ls;
  COMMANDS.less = COMMANDS.more = COMMANDS.cat;

  function headTail(args, ctx, which) {
    var n = 10, files = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '-n' && args[i + 1]) n = parseInt(args[++i], 10) || 10;
      else if (/^-\d+$/.test(args[i])) n = parseInt(args[i].slice(1), 10);
      else files.push(args[i]);
    }
    if (!files.length) return which + ': missing operand';
    return files.map(function(p) {
      var c = VFS.read(VFS.normalize(p, ctx.cwd));
      if (c === null) return which + ': cannot open \'' + p + '\' for reading: No such file or directory';
      var lines = c.split('\n');
      return (which === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n');
    }).join('\n');
  }

  function tokenize(cmd) {
    var tokens = [], cur = '', quote = null;
    for (var i = 0; i < cmd.length; i++) {
      var ch = cmd.charAt(i);
      if (quote) { if (ch === quote) quote = null; else cur += ch; }
      else if (ch === '"' || ch === '\'') quote = ch;
      else if (/\s/.test(ch)) { if (cur) { tokens.push(cur); cur = ''; } }
      else cur += ch;
    }
    if (cur) tokens.push(cur);
    return tokens;
  }

  // Run a single command line. Supports `a && b`, `a ; b`, `cmd > file`, `cmd >> file`, and `| grep`.
  function run(line, ctx) {
    var segments = line.split(/\s*(?:&&|;)\s*/).filter(Boolean);
    var outputs = [];
    for (var s = 0; s < segments.length; s++) {
      var seg = segments[s];
      var redirect = null, append = false;
      var m = seg.match(/^(.*?)\s*(>>|>)\s*(\S+)\s*$/);
      if (m) { seg = m[1]; redirect = m[3]; append = m[2] === '>>'; }
      var pipes = seg.split('|').map(function(x) { return x.trim(); });
      var out = runOne(pipes[0], ctx, null);
      for (var p = 1; p < pipes.length; p++) out = runOne(pipes[p], ctx, out);
      if (redirect !== null) {
        var abs = VFS.normalize(redirect, ctx.cwd);
        if (!VFS.write(abs, append && out ? '\n' + out : out, append)) out = 'bash: ' + redirect + ': No such file or directory';
        else out = '';
      }
      if (out) outputs.push(out);
      if (ctx.failed) { ctx.failed = false; break; }
    }
    return outputs.join('\n');
  }

  function runOne(seg, ctx, stdin) {
    var tokens = tokenize(seg);
    if (!tokens.length) return stdin || '';
    var name = tokens[0], args = tokens.slice(1);
    if (stdin !== null && name === 'grep') {
      var re; try { re = new RegExp((args[args.length - 1] || '').replace(/^["']|["']$/g, ''), args.indexOf('-i') >= 0 ? 'i' : ''); } catch (e) { return 'grep: invalid pattern'; }
      return stdin.split('\n').filter(function(l) { return re.test(l); }).join('\n');
    }
    if (stdin !== null && name === 'wc') {
      return '  ' + stdin.split('\n').length + '  ' + stdin.split(/\s+/).filter(Boolean).length + '  ' + stdin.length;
    }
    if (stdin !== null && (name === 'head' || name === 'tail')) {
      var n = 10; var ni = args.indexOf('-n'); if (ni >= 0) n = parseInt(args[ni + 1], 10) || 10;
      var lines = stdin.split('\n');
      return (name === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n');
    }
    if (stdin !== null && name === 'sort') return stdin.split('\n').sort().join('\n');
    if (stdin !== null && name === 'uniq') return stdin.split('\n').filter(function(l, i, a) { return i === 0 || l !== a[i - 1]; }).join('\n');
    var fn = COMMANDS[name];
    if (!fn) { ctx.failed = true; return 'bash: ' + name + ': command not found'; }
    return fn(args, ctx);
  }

  function complete(value, ctx) {
    var parts = value.split(/\s+/);
    var partial = parts[parts.length - 1] || '';
    if (parts.length <= 1) {
      var cmds = Object.keys(COMMANDS).filter(function(c) { return c.indexOf(partial) === 0; }).sort();
      if (cmds.length === 1) return { value: cmds[0] + ' ' };
      if (cmds.length > 1) return { value: value, options: cmds };
      return null;
    }
    var slash = partial.lastIndexOf('/');
    var dirPart = slash >= 0 ? partial.slice(0, slash + 1) : '';
    var namePart = partial.slice(slash + 1);
    var abs = VFS.normalize(dirPart || '.', ctx.cwd);
    var names = VFS.list(abs);
    if (!names) return null;
    var matches = names.filter(function(n) { return n.indexOf(namePart) === 0 && (namePart.charAt(0) === '.' || n.charAt(0) !== '.'); });
    if (matches.length === 1) {
      var isDir = VFS.isDir(VFS.normalize(abs + '/' + matches[0]));
      parts[parts.length - 1] = dirPart + matches[0] + (isDir ? '/' : ' ');
      return { value: parts.join(' ') };
    }
    if (matches.length > 1) return { value: value, options: matches };
    return null;
  }

  function create(win, opts) {
    var outputEl = win.querySelector('.term-output');
    var inputEl  = win.querySelector('.term-input');
    var promptEl = win.querySelector('.term-prompt');
    var startCwd = (opts && opts.cwd && VFS.isDir(opts.cwd)) ? opts.cwd : VFS.HOME;
    var ctx = { cwd: startCwd, history: [], failed: false, clear: false };
    var histIdx = 0;

    outputEl.textContent = 'OzalpOS 1.0 (GNU/Linux 6.1.0-ozalp x86_64)\n\n' + (VFS.read('/etc/motd') || '') + '\n\n';

    function scroll() { outputEl.scrollTop = outputEl.scrollHeight; }
    function append(text) { outputEl.textContent += text + '\n'; scroll(); }
    function updatePrompt() { promptEl.textContent = promptStr(ctx.cwd); }

    function submit() {
      var cmd = inputEl.value;
      append(promptStr(ctx.cwd) + ' ' + cmd);
      inputEl.value = '';
      if (cmd.trim()) { ctx.history.push(cmd); }
      histIdx = ctx.history.length;
      var out = run(cmd, ctx);
      if (ctx.clear) { outputEl.textContent = ''; ctx.clear = false; }
      else if (out) append(out);
      updatePrompt();
    }

    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { submit(); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        var r = complete(inputEl.value, ctx);
        if (!r) return;
        if (r.options) { append(promptStr(ctx.cwd) + ' ' + inputEl.value); append(r.options.join('  ')); }
        inputEl.value = r.value;
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; inputEl.value = ctx.history[histIdx]; }
      }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        histIdx = Math.min(ctx.history.length, histIdx + 1);
        inputEl.value = ctx.history[histIdx] || '';
      }
      else if (e.ctrlKey && e.key === 'l') { e.preventDefault(); outputEl.textContent = ''; }
      else if (e.ctrlKey && e.key === 'c') { e.preventDefault(); append(promptStr(ctx.cwd) + ' ' + inputEl.value + '^C'); inputEl.value = ''; }
    });

    win.querySelector('.term-body').addEventListener('click', function() { inputEl.focus(); });
    updatePrompt();
    inputEl.focus();
  }

  return { create: create, run: run };
})();
