// settings.js — persisted OzalpOS preferences (currently just the wallpaper).

var Settings = (function() {

  var KEY = 'ozalpos_settings';

  var WALLPAPERS = [
    { key: 'teal',   label: '(None)' },
    { key: 'clouds', label: 'Clouds' },
    { key: 'ocean',  label: 'Deep Dive' },
    { key: 'duke',   label: 'Duke Blue' },
    { key: 'bricks', label: 'Red Bricks' },
    { key: 'vapor',  label: 'Vaporwave' }
  ];

  var DEFAULTS = { wallpaper: 'teal' };

  function load() {
    var s;
    try { s = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { s = Object.assign({}, DEFAULTS); }
    // Older builds stored macOS-era wallpaper keys; fall back to the default.
    if (!WALLPAPERS.some(function(w) { return w.key === s.wallpaper; })) s.wallpaper = DEFAULTS.wallpaper;
    return s;
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function apply(state) {
    document.documentElement.setAttribute('data-wallpaper', state.wallpaper);
  }

  var _state = load();
  apply(_state);

  return {
    WALLPAPERS: WALLPAPERS,
    get: function(key) { return _state[key]; },
    set: function(key, value) {
      _state[key] = value;
      save(_state);
      apply(_state);
    }
  };

})();
