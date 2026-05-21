// settings.js

var Settings = (function() {

  var KEY = 'ozalpos_settings';

  var DEFAULTS = {
    wallpaper:    'default',
    theme:        'dark',
    cursorSize:   'medium',
    dockPosition: 'bottom'
  };

  function load() {
    try {
      var stored = JSON.parse(localStorage.getItem(KEY));
      return Object.assign({}, DEFAULTS, stored || {});
    } catch(e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {}
  }

  function apply(state) {
    var html = document.documentElement;
    html.setAttribute('data-theme',     state.theme);
    html.setAttribute('data-wallpaper', state.wallpaper);
    html.setAttribute('data-cursor',    state.cursorSize);
    html.setAttribute('data-dock',      state.dockPosition);
  }

  var _state = load();
  apply(_state);

  function get(key) { return _state[key]; }

  function set(key, value) {
    _state[key] = value;
    save(_state);
    apply(_state);
  }

  return { get: get, set: set };

})();
