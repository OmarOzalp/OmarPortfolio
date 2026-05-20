// terminal.js

var Terminal = (function() {

  var FS = {
    '~':          ['projects/', 'downloads/'],
    '~/projects': ['project_1.txt', 'project_2.txt', 'project_3.txt']
  };

  var LS_LA = {
    '~': [
      'total 24',
      'drwxr-xr-x  4 omar omar 4096 May 19 10:00 .',
      'drwxr-xr-x 12 root root 4096 May 19 10:00 ..',
      'drwxr-xr-x  2 omar omar 4096 May 19 10:00 downloads',
      'drwxr-xr-x  2 omar omar 4096 May 19 10:00 projects'
    ],
    '~/projects': [
      'total 20',
      'drwxr-xr-x 2 omar omar 4096 May 19 10:00 .',
      'drwxr-xr-x 4 omar omar 4096 May 19 10:00 ..',
      '-rw-r--r-- 1 omar omar  512 May 19 10:00 project_1.txt',
      '-rw-r--r-- 1 omar omar  512 May 19 10:00 project_2.txt',
      '-rw-r--r-- 1 omar omar  512 May 19 10:00 project_3.txt'
    ]
  };

  var PWD = {
    '~':          '/home/omar',
    '~/projects': '/home/omar/projects'
  };

  var HELP_TEXT = [
    'Available commands:',
    '  ls [-la]     list directory contents',
    '  cd <dir>     change directory',
    '  pwd          print working directory',
    '  whoami       print current user',
    '  date         print current date and time',
    '  uname -a     print system information',
    '  echo <text>  print text to terminal',
    '  clear        clear the terminal',
    '  help         show this help message'
  ].join('\n');

  function _promptStr(cwd) {
    return cwd === '~' ? 'omar@ozalpos:~$' : 'omar@ozalpos:~/projects$';
  }

  function _run(cmd, cwd) {
    cmd = cmd.trim();
    if (!cmd) return { output: '', cwd: cwd };
    var parts = cmd.split(/\s+/);
    var name  = parts[0];
    var arg1  = parts[1] || '';
    var rest  = parts.slice(1).join(' ');

    if (name === 'clear')   return { output: '', cwd: cwd, clear: true };
    if (name === 'help')    return { output: HELP_TEXT, cwd: cwd };
    if (name === 'whoami')  return { output: 'omar', cwd: cwd };
    if (name === 'pwd')     return { output: PWD[cwd], cwd: cwd };
    if (name === 'date')    return { output: new Date().toString(), cwd: cwd };
    if (name === 'echo')    return { output: rest, cwd: cwd };

    if (name === 'uname') {
      if (arg1 === '-a') return { output: 'Linux ozalpos 5.15.0-ozalp #1 SMP x86_64 GNU/Linux', cwd: cwd };
      return { output: 'Linux', cwd: cwd };
    }

    if (name === 'ls') {
      if (arg1 === '-la') return { output: LS_LA[cwd].join('\n'), cwd: cwd };
      return { output: FS[cwd].join('  '), cwd: cwd };
    }

    if (name === 'cd') {
      var target = arg1;
      if (!target || target === '~' || target === '/home/omar') {
        return { output: '', cwd: '~' };
      }
      if (target === 'projects' && cwd === '~') {
        return { output: '', cwd: '~/projects' };
      }
      if ((target === '..' || target === '../') && cwd === '~/projects') {
        return { output: '', cwd: '~' };
      }
      return { output: 'bash: cd: ' + target + ': No such file or directory', cwd: cwd };
    }

    return { output: 'bash: ' + name + ': command not found', cwd: cwd };
  }

  function create(win) {
    var outputEl = win.querySelector('.term-output');
    var inputEl  = win.querySelector('.term-input');
    var promptEl = win.querySelector('.term-prompt');
    var cwd      = '~';
    var lastCmd  = '';

    outputEl.textContent = 'OzalpOS 1.0 — omar@ozalpos\nType \'help\' for available commands.\n\n';

    function _scroll() { outputEl.scrollTop = outputEl.scrollHeight; }

    function _append(text) {
      outputEl.textContent += text + '\n';
      _scroll();
    }

    function _updatePrompt() {
      promptEl.textContent = _promptStr(cwd);
    }

    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var cmd = inputEl.value;
        _append(_promptStr(cwd) + ' ' + cmd);
        if (cmd.trim()) lastCmd = cmd;
        inputEl.value = '';

        var result = _run(cmd, cwd);
        cwd = result.cwd;

        if (result.clear) {
          outputEl.textContent = '';
        } else {
          if (result.output) _append(result.output);
          _append('');
        }
        _updatePrompt();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        inputEl.value = lastCmd;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        inputEl.value = '';
      }
    });

    _updatePrompt();
    inputEl.focus();
  }

  return { create: create };
})();
