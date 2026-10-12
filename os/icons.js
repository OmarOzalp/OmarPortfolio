// icons.js — hand-drawn 32x32 pixel-style SVG icons for OzalpOS 98.
// OS.icon(name) returns markup for <span class="icon">; size comes from CSS.

var OS = window.OS || (window.OS = {});

OS.ICONS = (function() {
  function R(x, y, w, h, c) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>'; }
  function P(points, c) { return '<polygon points="' + points + '" fill="' + c + '"/>'; }
  function C(cx, cy, r, c, stroke) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1"' : '') + '/>'; }
  // A box with a 1px black outline and Win98 bevel highlights.
  function box(x, y, w, h, fill, hi, lo) {
    return R(x, y, w, h, '#000') + R(x + 1, y + 1, w - 2, h - 2, fill) +
      (hi ? R(x + 1, y + 1, w - 2, 1, hi) + R(x + 1, y + 1, 1, h - 2, hi) : '') +
      (lo ? R(x + 1, y + h - 2, w - 2, 1, lo) + R(x + w - 2, y + 1, 1, h - 2, lo) : '');
  }
  function page(x, y, w, h) {
    var f = 5;
    return P(x + ',' + y + ' ' + (x + w - f) + ',' + y + ' ' + (x + w) + ',' + (y + f) + ' ' + (x + w) + ',' + (y + h) + ' ' + x + ',' + (y + h), '#000') +
      P((x + 1) + ',' + (y + 1) + ' ' + (x + w - f - 1) + ',' + (y + 1) + ' ' + (x + w - f - 1) + ',' + (y + f + 1) + ' ' + (x + w - 1) + ',' + (y + f + 1) + ' ' + (x + w - 1) + ',' + (y + h - 1) + ' ' + (x + 1) + ',' + (y + h - 1), '#fff') +
      P((x + w - f) + ',' + (y + 1) + ' ' + (x + w - 1) + ',' + (y + f) + ' ' + (x + w - f) + ',' + (y + f), '#c0c0c0');
  }
  function lines(x, y, widths, color, gap) {
    return widths.map(function(w, i) { return R(x, y + i * (gap || 3), w, 1, color); }).join('');
  }
  function monitor(screen) {
    return box(3, 2, 26, 21, '#d6d2c2', '#f4f1e6', '#8e8a7c') +
      R(6, 5, 20, 14, '#000') + screen +
      R(23, 20, 3, 1, '#19c419') +
      R(12, 23, 8, 2, '#000') + R(13, 23, 6, 2, '#8e8a7c') +
      box(6, 25, 20, 5, '#d6d2c2', '#f4f1e6', '#8e8a7c');
  }
  function folderBase(fill, hi, lo) {
    return R(3, 6, 11, 4, '#000') + R(4, 7, 9, 3, fill) + R(4, 7, 9, 1, hi) +
      box(2, 9, 28, 19, fill, hi, lo);
  }
  var FOLDER = folderBase('#ffd75e', '#fff3b0', '#c99a1e');

  var I = {
    computer: monitor(R(7, 6, 18, 12, '#008080') + R(8, 7, 5, 1, '#6fdede') + R(8, 8, 1, 3, '#6fdede')),
    display: monitor(R(7, 6, 18, 4, '#ff5a5a') + R(7, 10, 18, 4, '#ffd75e') + R(7, 14, 18, 4, '#3fa0ff')),
    folder: FOLDER,
    programs: FOLDER + box(13, 14, 14, 11, '#fff', null, null) + R(14, 15, 12, 2, '#000080'),
    documents: FOLDER + page(16, 12, 11, 14) + lines(18, 19, [6, 5, 6], '#808080'),
    games: FOLDER + box(14, 13, 10, 13, '#fff') + P('19,16 22,19 19,22 16,19', '#d00'),
    pictures: box(3, 5, 26, 22, '#9a6634', '#c79560', '#5c3a18') + R(6, 8, 20, 16, '#000') + R(7, 9, 18, 14, '#8fd3ff') +
      P('7,23 13,14 18,20 21,17 25,23', '#2f8f3a') + P('13,14 15,17 11,17', '#fff') + C(21, 13, 2.5, '#ffe14d'),
    doc: page(7, 2, 20, 28) + lines(10, 9, [12, 10, 13, 9, 12, 11], '#808080') +
      box(3, 18, 12, 11, '#1f4fd1') + R(5, 21, 8, 1, '#fff') + R(5, 23, 8, 1, '#fff') + R(5, 25, 5, 1, '#fff'),
    txt: page(7, 2, 20, 28) + R(8, 3, 13, 3, '#3a6fd8') + lines(10, 10, [14, 12, 14, 10, 13, 14, 8], '#000', 2.6),
    url: C(16, 16, 12.5, '#000') + C(16, 16, 11.5, '#2f72d6') +
      P('9,9 15,7 17,11 13,14 14,19 10,17 7,13', '#3fb04a') + P('18,16 23,13 25,18 21,24 18,21', '#3fb04a') +
      '<ellipse cx="16" cy="16" rx="5" ry="11.5" fill="none" stroke="#bfe3ff" stroke-width="1"/>' + R(4, 15, 24, 1, '#bfe3ff'),
    mail: box(3, 8, 26, 17, '#fff') + P('4,9 16,18 28,9 28,11 16,20 4,11', '#000') + R(24, 3, 6, 6, '#d00'),
    bin: P('7,8 25,8 23,29 9,29', '#000') + P('8,9 24,9 22,28 10,28', '#e4e4e4') +
      R(11, 10, 1, 17, '#9a9a9a') + R(14, 10, 1, 18, '#9a9a9a') + R(17, 10, 1, 18, '#9a9a9a') + R(20, 10, 1, 17, '#9a9a9a') +
      R(6, 5, 20, 4, '#000') + R(7, 6, 18, 2, '#cfcfcf') + R(7, 6, 18, 1, '#fff'),
    'bin-full': P('7,8 25,8 23,29 9,29', '#000') + P('8,9 24,9 22,28 10,28', '#e4e4e4') +
      R(11, 10, 1, 17, '#9a9a9a') + R(14, 10, 1, 18, '#9a9a9a') + R(17, 10, 1, 18, '#9a9a9a') + R(20, 10, 1, 17, '#9a9a9a') +
      C(12, 6, 4, '#fff', '#000') + C(19, 5, 3.5, '#ffe9a8', '#000') + R(6, 7, 20, 3, '#000') + R(7, 8, 18, 1, '#cfcfcf'),
    solitaire: box(3, 3, 16, 22, '#1f4fd1') + R(5, 5, 12, 18, '#3a6fe8') +
      '<path d="M5 5h12v18H5z" fill="none" stroke="#9cc0ff" stroke-width="1" stroke-dasharray="1 1"/>' +
      box(12, 8, 17, 22, '#fff') + R(14, 10, 2, 4, '#d00') +
      C(18.5, 18, 2.6, '#d00') + C(22.5, 18, 2.6, '#d00') + P('16,19 25,19 20.5,25', '#d00'),
    minesweeper: box(2, 2, 28, 28, '#c0c0c0', '#fff', '#808080') +
      R(15, 5, 2, 22, '#000') + R(5, 15, 22, 2, '#000') + R(9, 9, 2, 2, '#000') + R(21, 9, 2, 2, '#000') + R(9, 21, 2, 2, '#000') + R(21, 21, 2, 2, '#000') +
      C(16, 16, 7, '#000') + R(13, 12, 3, 3, '#fff'),
    snake: box(2, 2, 28, 28, '#0d2a10') +
      R(6, 22, 14, 4, '#3fd23f') + R(16, 14, 4, 10, '#3fd23f') + R(16, 14, 10, 4, '#3fd23f') + R(22, 7, 4, 9, '#3fd23f') +
      R(23, 8, 1, 1, '#000') + R(7, 7, 4, 4, '#ff3b3b') + R(8, 6, 2, 1, '#5a2') +
      R(6, 23, 14, 1, '#8ff28f') + R(16, 15, 10, 1, '#8ff28f'),
    dos: box(2, 4, 28, 25, '#000') + R(3, 5, 26, 4, '#000080') + R(25, 6, 3, 2, '#c0c0c0') +
      '<text x="5" y="20" font-family="Courier New,monospace" font-size="9" font-weight="bold" fill="#c0c0c0">C:\\&gt;</text>' + R(22, 18, 4, 2, '#c0c0c0'),
    notepad: box(6, 4, 20, 26, '#fff') + R(7, 5, 18, 4, '#3a6fd8') + R(9, 3, 2, 4, '#000') + R(15, 3, 2, 4, '#000') + R(21, 3, 2, 4, '#000') +
      lines(9, 12, [14, 12, 14, 10, 13, 9], '#000', 2.8),
    user: C(16, 11, 6.5, '#000') + C(16, 11, 5.5, '#e2ad7c') + P('10,9 12,4 20,4 22,9 20,7 12,7', '#2b1a0e') +
      R(13, 10, 1, 2, '#000') + R(18, 10, 1, 2, '#000') +
      '<path d="M4 30c0-7 5-11 12-11s12 4 12 11z" fill="#000"/><path d="M5 29c0-6 5-9 11-9s11 3 11 9z" fill="#1d3fbf"/>' + R(15, 20, 2, 6, '#fff'),
    briefcase: R(11, 5, 10, 6, '#000') + R(12, 6, 8, 2, '#6b4320') + R(13, 8, 6, 3, 'transparent') +
      box(3, 10, 26, 18, '#8b5a2b', '#b07a45', '#5c3a18') + R(4, 17, 24, 1, '#5c3a18') + box(14, 15, 5, 5, '#ffd75e'),
    floppy: box(4, 3, 24, 26, '#2a2a2a', '#4a4a4a', '#111') + box(10, 3, 13, 10, '#c9c9c9', '#eee', '#8a8a8a') + R(18, 5, 3, 6, '#2a2a2a') +
      box(8, 16, 17, 11, '#fff') + R(10, 19, 12, 1, '#1f4fd1') + R(10, 22, 9, 1, '#808080'),
    find: C(13, 13, 8, '#000') + C(13, 13, 6.5, '#bfe3ff') + R(9, 10, 3, 2, '#fff') + P('18,20 21,17 29,25 26,28', '#000') + P('19,20 21,18 28,25 26,27', '#8b5a2b'),
    help: box(5, 4, 21, 25, '#1d6f2e', '#3f9f50', '#0e3f18') + R(8, 7, 15, 19, '#fff') +
      '<text x="11" y="23" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="#1f4fd1">?</text>',
    run: box(3, 6, 26, 20, '#c0c0c0', '#fff', '#808080') + R(4, 7, 24, 4, '#000080') + box(6, 15, 20, 7, '#fff') + P('16,13 22,18 16,23', '#d00'),
    shutdown: C(16, 16, 12, '#000') + C(16, 16, 11, '#d93a2b') + C(16, 17, 6.5, '#fff') + C(16, 17, 4.5, '#d93a2b') + R(14, 7, 4, 10, '#d93a2b') + R(15, 8, 2, 9, '#fff'),
    settings: monitor(R(7, 6, 18, 12, '#808080') + R(9, 9, 14, 1, '#000') + R(12, 7, 2, 5, '#c0c0c0') + R(9, 14, 14, 1, '#000') + R(18, 12, 2, 5, '#c0c0c0')),
    info: C(16, 16, 13, '#000') + C(16, 16, 12, '#fff') + C(16, 16, 10, '#1f4fd1') + R(15, 8, 3, 3, '#fff') + R(15, 13, 3, 11, '#fff'),
    question: C(16, 16, 13, '#000') + C(16, 16, 12, '#fff') + C(16, 16, 10, '#1f4fd1') +
      '<text x="11" y="23" font-family="Arial,sans-serif" font-size="17" font-weight="bold" fill="#fff">?</text>',
    warning: P('16,2 31,29 1,29', '#000') + P('16,5 29,28 3,28', '#ffd700') + R(15, 11, 3, 10, '#000') + R(15, 23, 3, 3, '#000'),
    error: C(16, 16, 13, '#000') + C(16, 16, 12, '#e8261b') + P('10,12 12,10 16,14 20,10 22,12 18,16 22,20 20,22 16,18 12,22 10,20 14,16', '#fff'),
    volume: R(6, 12, 6, 8, '#000') + P('12,12 19,5 19,27 12,20', '#000') + R(7, 13, 4, 6, '#c0c0c0') + P('12,13 18,7 18,25 12,19', '#ffd75e') +
      '<path d="M22 11q4 5 0 10M25 8q7 8 0 16" fill="none" stroke="#000" stroke-width="2"/>',
    'volume-muted': R(6, 12, 6, 8, '#000') + P('12,12 19,5 19,27 12,20', '#000') + R(7, 13, 4, 6, '#c0c0c0') + P('12,13 18,7 18,25 12,19', '#ffd75e') +
      '<path d="M21 11l9 10M30 11l-9 10" stroke="#d00" stroke-width="3"/>',
    drive: box(2, 10, 28, 13, '#c9c9c9', '#f2f2f2', '#7a7a7a') + R(5, 18, 14, 2, '#5a5a5a') + R(23, 17, 3, 2, '#19c419') + R(4, 13, 24, 1, '#9a9a9a'),
    camera: box(3, 9, 26, 18, '#3a3a3a', '#5a5a5a', '#1a1a1a') + R(9, 6, 8, 4, '#000') + C(16, 18, 6.5, '#000') + C(16, 18, 5, '#3a6fd8') + R(14, 16, 2, 2, '#fff') + R(23, 12, 3, 2, '#ffd75e'),
    logo: C(16, 16, 13, '#000') + C(16, 16, 12, '#012169') + C(16, 16, 7, '#000') + C(16, 16, 6, '#7fd7ff') +
      '<path d="M10 17q3-3 6 0t6 0v5H10z" fill="#008080"/>' + C(18, 13, 1.8, '#ffe14d') + R(22, 5, 4, 4, '#ffd75e')
  };
  return I;
})();

OS.icon = function(name, extraClass) {
  var body = OS.ICONS[name] || OS.ICONS.txt;
  return '<span class="icon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true"><svg viewBox="0 0 32 32">' + body + '</svg></span>';
};
