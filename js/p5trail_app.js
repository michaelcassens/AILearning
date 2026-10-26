/* p5.js Code Trail — application.
 * Views, the sandboxed sketch runner, the editor, and progress storage.
 * Depends on P5TrailAnalyzer and P5TrailLevels being loaded first.
 */
(function () {
  'use strict';

  var A = window.P5TrailAnalyzer;
  var LEVELS = window.P5TrailLevels.LEVELS;
  var CAP = window.P5TrailLevels.CAPSTONE;
  var COURSE = window.P5TrailLevels.COURSE || { code: '', weeks: [{ week: 1, title: 'All levels', levels: LEVELS.map(function (l) { return l.id; }) }], refresher: [] };

  // Course order: levels in syllabus-week order, then any not assigned to a week.
  var ORDER = [];
  COURSE.weeks.forEach(function (w) { (w.levels || []).forEach(function (id) { if (ORDER.indexOf(id) < 0) { ORDER.push(id); } }); });
  LEVELS.forEach(function (l) { if (ORDER.indexOf(l.id) < 0) { ORDER.push(l.id); } });
  function levelById(id) { return LEVELS.filter(function (l) { return l.id === id; })[0] || null; }
  function weekOf(id) { return COURSE.weeks.filter(function (w) { return (w.levels || []).indexOf(id) >= 0; })[0] || null; }
  function finalWeek() { return COURSE.weeks.filter(function (w) { return w.final; })[0] || null; }
  function nextLevel(id) { var i = ORDER.indexOf(id); return i >= 0 && i < ORDER.length - 1 ? levelById(ORDER[i + 1]) : null; }
  function prevLevel(id) { var i = ORDER.indexOf(id); return i > 0 ? levelById(ORDER[i - 1]) : null; }
  function isRefresher(id) { return (COURSE.refresher || []).indexOf(id) >= 0; }
  function weekLabel(w) { return w ? 'Week ' + w.week + ': ' + w.title : ''; }
  var PLAN_PROMPTS = window.P5TrailLevels.PLAN;

  var ASSETS = window.P5TrailLevels.ASSETS || {};
  // p5 1.11.4 is the newest version p5play v3 supports.
  var P5_LOCAL = 'libs/p5trail/p5.min.js';
  var P5_CDN = 'https://cdn.jsdelivr.net/npm/p5@1.11.4/lib/p5.min.js';
  // Add-on libraries load only when a sketch uses them. p5play and p5.collide2D
  // are not redistributed here (see libs/p5trail/README.md).
  var LIBS = [
    { id: 'sound', name: 'p5.sound', local: 'libs/p5trail/p5.sound.min.js', cdn: 'https://cdn.jsdelivr.net/npm/p5@1.11.4/lib/addons/p5.sound.min.js', ready: '!!(window.p5 && p5.Oscillator)',
      test: /\bp5\.(Oscillator|Envelope|Noise|Amplitude|FFT|SoundFile|MonoSynth|PolySynth|Gain|Reverb|Delay|Filter|LowPass|HighPass|Pulse|AudioIn)\b|\b(loadSound|userStartAudio|getAudioContext|outputVolume)\s*\(/ },
    { id: 'collide', name: 'p5.collide2D', cdn: 'https://cdn.jsdelivr.net/npm/p5.collide2d@0.7.3/p5.collide2d.min.js', ready: '!!(window.p5 && p5.prototype.collideRectRect)', test: /\bcollide[A-Z]\w*\s*\(/ },
    { id: 'play', name: 'p5play', cdn: ['https://cdn.jsdelivr.net/npm/p5play@3.35.5/planck.min.js', 'https://cdn.jsdelivr.net/npm/p5play@3.35.5/p5play.min.js'], ready: 'typeof p5playInit === "function"',
      test: /\bnew\s+(Sprite|Group|Canvas|[\w$]+\.Sprite)\b|\bkb\.\w+|\bworld\.\w+|\ballSprites\b/ }
  ];
  function libsFor(code) { return LIBS.filter(function (l) { return l.test.test(code); }); }
  function assetMap() {
    var out = {};
    Object.keys(ASSETS).forEach(function (k) { out[k] = ASSETS[k].url; });
    return out;
  }
  var STORE_KEY = 'p5CodeTrail.v1';
  var APP = 'p5.js Code Trail';

  /* ================================================================
   * DOM helpers
   * ================================================================ */
  var uidCounter = 0;
  function uid(prefix) { uidCounter++; return (prefix || 'id') + '-' + uidCounter; }

  // h('div', {class: 'x', onclick: fn}, child, 'text', [more])
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) { return; }
        if (k.indexOf('on') === 0 && typeof v === 'function') { el.addEventListener(k.slice(2), v); }
        else if (k === 'html') { el.innerHTML = v; }
        else if (k === 'text') { el.textContent = v; }
        else if (k === 'value') { el.value = v; }
        else if (k === 'checked') { el.checked = !!v; }
        else if (k === 'disabled') { el.disabled = !!v; }
        else { el.setAttribute(k, v === true ? '' : v); }
      });
    }
    for (var i = 2; i < arguments.length; i++) { append(el, arguments[i]); }
    return el;
  }
  function append(el, child) {
    if (child === null || child === undefined || child === false) { return; }
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  function clear(el) { while (el.firstChild) { el.removeChild(el.firstChild); } return el; }
  function announce(msg) {
    var a = document.getElementById('announcer');
    a.textContent = '';
    setTimeout(function () { a.textContent = msg; }, 60);
  }
  function words(text) { return (text || '').trim().split(/\s+/).filter(Boolean).length; }
  function feedback(el, kind, lead, body) {
    clear(el);
    el.className = 'feedback ' + kind;
    var icons = { ok: '✓', err: '✗', warn: '!', info: 'i' };
    var leadEl = h('p', null, h('strong', null, h('span', { class: 'icon', 'aria-hidden': 'true' }, icons[kind] || ''), lead));
    append(el, leadEl);
    if (body) { append(el, typeof body === 'string' ? h('p', null, body) : body); }
  }

  /* ================================================================
   * Storage (progress lives only in this browser)
   * ================================================================ */
  var state = load();
  function blank() { return { v: 1, name: '', course: '', theme: 'auto', levels: {}, capstone: {}, studio: { code: '' } }; }
  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 1) { return Object.assign(blank(), s); } }
    } catch (e) { /* storage unavailable: progress lasts for this visit only */ }
    return blank();
  }
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
      progressChanged();
    }, 250);
  }
  function lvState(id) {
    var s = state.levels[id];
    if (!s) { s = state.levels[id] = { learn: {}, build: { plan: ['', '', ''], hints: 0, checks: 0 }, read: { answers: {} }, bugs: {}, judge: { rows: {} } }; }
    return s;
  }
  function bugState(id, n) {
    var s = lvState(id);
    if (!s.bugs[n]) { s.bugs[n] = { attempts: { type: 0, line: 0, cause: 0, fix: 0 } }; }
    return s.bugs[n];
  }

  /* ================================================================
   * Theme
   * ================================================================ */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') { document.documentElement.setAttribute('data-theme', t); }
    else { document.documentElement.removeAttribute('data-theme'); }
  }
  function initTheme() {
    var sel = document.getElementById('theme-select');
    sel.value = state.theme || 'auto';
    applyTheme(sel.value);
    sel.addEventListener('change', function () {
      state.theme = sel.value; save(); applyTheme(sel.value);
      announce('Theme set to ' + sel.options[sel.selectedIndex].text + '.');
    });
  }

  /* ================================================================
   * Read-only code with simple syntax coloring
   * ================================================================ */
  var KW = /^(function|let|const|var|if|else|for|while|do|return|true|false|null|undefined|new|of|in|break|continue|typeof)$/;
  function highlight(line) {
    var frag = document.createDocumentFragment();
    var re = /(\/\/.*$)|("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(\s*\()?|([^A-Za-z_$\d"'/]+|\/)/g;
    var m;
    while ((m = re.exec(line)) !== null) {
      if (m[1]) { frag.appendChild(h('span', { class: 'tok-com' }, m[1])); }
      else if (m[2]) { frag.appendChild(h('span', { class: 'tok-str' }, m[2])); }
      else if (m[3]) { frag.appendChild(h('span', { class: 'tok-num' }, m[3])); }
      else if (m[4]) {
        if (KW.test(m[4])) { frag.appendChild(h('span', { class: 'tok-kw' }, m[4])); }
        else if (m[5]) { frag.appendChild(h('span', { class: 'tok-fn' }, m[4])); }
        else { frag.appendChild(document.createTextNode(m[4])); }
        if (m[5]) { frag.appendChild(document.createTextNode(m[5])); }
      } else { frag.appendChild(document.createTextNode(m[0])); }
      if (m[0] === '') { re.lastIndex++; }
    }
    return frag;
  }
  function listing(code, label) {
    // tabindex lets keyboard users scroll long lines sideways
    var ol = h('ol', { class: 'listing', tabindex: '0', 'aria-label': label || 'Code listing with line numbers' });
    code.split('\n').forEach(function (line) {
      var li = h('li');
      var c = h('code');
      c.appendChild(highlight(line));
      if (!line) { c.appendChild(document.createTextNode(' ')); }
      li.appendChild(c);
      ol.appendChild(li);
    });
    return ol;
  }

  /* ================================================================
   * Sketch runner: each run gets a fresh sandboxed iframe.
   * The harness below is serialized into the iframe, so it must not use
   * anything from the surrounding scope.
   * ================================================================ */
  function harness(cfg) {
    var parentWin = window.parent;
    function post(type, data) {
      data = data || {};
      data.src = 'p5trail'; data.runId = cfg.runId; data.type = type;
      try { parentWin.postMessage(data, '*'); } catch (e) { /* ignore */ }
    }
    function fmt(v) {
      try {
        if (typeof v === 'string') { return v; }
        if (v === undefined) { return 'undefined'; }
        if (typeof v === 'function') { return '[function]'; }
        var s = JSON.stringify(v);
        return s === undefined ? String(v) : s;
      } catch (e) { return String(v); }
    }
    var logCount = 0;
    var muted = true; // library banners are not the student's output
    ['log', 'info', 'warn', 'error'].forEach(function (k) {
      var orig = console[k];
      console[k] = function () {
        var args = Array.prototype.slice.call(arguments);
        if (muted) { try { orig.apply(console, args); } catch (e) { /* ignore */ } return; }
        if (logCount < 200) { post('log', { level: k, text: args.map(fmt).join(' ') }); }
        logCount++;
        if (logCount === 200) { post('log', { level: 'warn', text: '(More than 200 messages. Stopped showing them.)' }); }
        try { orig.apply(console, args); } catch (e) { /* ignore */ }
      };
    });
    var reported = false;
    function lineOf(err) {
      if (err && err.__line) { return err.__line; }
      var st = err && err.stack ? String(err.stack) : '';
      var m = /sketch\.js:(\d+):(\d+)/.exec(st);
      return m ? +m[1] : null;
    }
    function report(err, fallbackLine) {
      if (reported) { return; }
      reported = true;
      post('error', { message: err && err.message ? String(err.message) : String(err), name: err && err.name ? err.name : 'Error', line: lineOf(err) || fallbackLine || null });
      try { if (typeof window.noLoop === 'function') { window.noLoop(); } } catch (e) { /* ignore */ }
    }
    window.addEventListener('error', function (e) {
      report(e.error || { message: e.message }, e.filename && /sketch/.test(e.filename) ? e.lineno : null);
    });
    // p5 1.8+ runs setup() inside a promise, so its errors arrive here.
    window.addEventListener('unhandledrejection', function (e) {
      e.preventDefault();
      report(e.reason || { message: 'Unknown error' });
    });
    // Sketches here never use motion sensors; skipping these listeners avoids
    // permission-policy warnings inside the sandbox.
    var addListener = window.addEventListener;
    window.addEventListener = function (type) {
      if (type === 'devicemotion' || type === 'deviceorientation') { return; }
      return addListener.apply(this, arguments);
    };
    var loops = {};
    window.__loopReset = function (n) { loops[n] = 0; };
    window.__loopTick = function (n, line) {
      loops[n] = (loops[n] || 0) + 1;
      if (loops[n] > cfg.loopLimit) {
        var e = new Error('Possible infinite loop: the loop on line ' + line + ' ran more than ' + cfg.loopLimit + ' times, so it was stopped.');
        e.__line = line; e.name = 'InfiniteLoop';
        throw e;
      }
    };
    var phase = null, counts = { setup: {}, draw: {} }, lastDraw = {}, framesRun = 0, hasDraw = false, ready = false;
    window.__shapeCalls = function () { return { setup: counts.setup, draw: lastDraw }; };
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.src !== 'p5trail-parent') { return; }
      try {
        if (d.type === 'pause' && typeof window.noLoop === 'function') { window.noLoop(); }
        if (d.type === 'resume' && typeof window.loop === 'function' && hasDraw && !reported) { window.loop(); }
      } catch (err) { /* ignore */ }
    });
    function clone(v) {
      if (v === undefined) { return undefined; }
      try { return JSON.parse(JSON.stringify(v)); } catch (e) { return String(v); }
    }
    function runProbes() {
      var results = [];
      var probes = (cfg.probes || []).slice().sort(function (a, b) { return a.frames - b.frames; });
      if (reported || !probes.length) { post('probes', { results: results, aborted: reported }); return; }
      try { if (hasDraw) { window.noLoop(); } } catch (e) { /* ignore */ }
      for (var i = 0; i < probes.length; i++) {
        var p = probes[i];
        try {
          if (hasDraw) { var need = p.frames - framesRun; if (need > 0) { window.redraw(need); } }
          if (reported) { break; }
          results.push({ id: p.id, value: clone(window.__probe(p.expr)) });
        } catch (e) { report(e); break; }
      }
      post('probes', { results: results, aborted: reported });
      if (hasDraw && !reported && !cfg.paused) { try { window.loop(); } catch (e) { /* ignore */ } }
    }
    function onReady() {
      if (ready) { return; }
      ready = true;
      post('ready', { w: typeof window.width === 'number' ? window.width : 0, h: typeof window.height === 'number' ? window.height : 0, hasCanvas: !!document.querySelector('canvas') });
      setTimeout(runProbes, 0);
    }
    var trail = window.__trail = {};
    trail.afterP5 = function () {
      if (!window.p5) { report({ message: 'p5.js could not be loaded. Check your internet connection.', name: 'LoadError' }); return false; }
      var missing = (cfg.libs || []).filter(function (l) { try { return !(0, eval)(l.ready); } catch (e) { return true; } });
      if (missing.length) {
        report({ message: missing.map(function (l) { return l.name; }).join(' and ') + ' could not be loaded. It comes from the internet, so check your connection and run again.', name: 'LoadError' });
        return false;
      }
      // Project files: map each path to its built-in copy, and explain a wrong path clearly.
      ['loadImage', 'loadJSON', 'loadStrings', 'loadModel', 'loadFont', 'loadSound', 'loadTable', 'loadBytes'].forEach(function (fn) {
        var o = window.p5.prototype[fn];
        if (typeof o !== 'function') { return; }
        window.p5.prototype[fn] = function (path) {
          var args = Array.prototype.slice.call(arguments);
          if (typeof path === 'string' && !/^(data:|blob:|https?:)/i.test(path)) {
            var key = path.replace(/^\.\//, '');
            if (!cfg.assets[key]) {
              var err = new Error('File not found: "' + path + '". Files in this project: ' + Object.keys(cfg.assets).join(', '));
              err.name = 'FileError';
              throw err;
            }
            args[0] = cfg.assets[key];
          }
          return o.apply(this, args);
        };
      });
      ['rect', 'square', 'circle', 'ellipse', 'line', 'point', 'triangle', 'quad', 'arc', 'text', 'image', 'bezier', 'vertex'].forEach(function (fn) {
        var o = window.p5.prototype[fn];
        if (typeof o !== 'function') { return; }
        window.p5.prototype[fn] = function () {
          if (phase) { var c = counts[phase]; c[fn] = (c[fn] || 0) + 1; }
          return o.apply(this, arguments);
        };
      });
      return true;
    };
    trail.run = function (code) {
      muted = false;
      try {
        (0, eval)(code + '\n;window.__probe = function (__e) { return eval(__e); };\n//# sourceURL=sketch.js');
      } catch (e) { report(e); post('probes', { results: [], aborted: true }); return; }
      hasDraw = typeof window.draw === 'function';
      // Catch errors here, not only in window.onerror: errors that start inside
      // p5 itself reach onerror as a bare "Script error." in the sandbox.
      if (typeof window.setup === 'function') {
        var userSetup = window.setup;
        window.setup = function () {
          phase = 'setup';
          try { return userSetup.apply(this, arguments); }
          catch (e) { report(e); }
          finally { phase = null; setTimeout(onReady, 0); }
        };
      }
      if (hasDraw) {
        var userDraw = window.draw;
        window.draw = function () {
          if (reported) { return; }
          phase = 'draw'; counts.draw = {};
          try { return userDraw.apply(this, arguments); }
          catch (e) { report(e); }
          finally { phase = null; lastDraw = counts.draw; framesRun++; if (!ready) { setTimeout(onReady, 0); } }
        };
      }
      ['preload', 'mousePressed', 'mouseReleased', 'mouseClicked', 'mouseMoved', 'mouseDragged', 'mouseWheel', 'doubleClicked',
        'keyPressed', 'keyReleased', 'keyTyped', 'touchStarted', 'touchMoved', 'touchEnded', 'windowResized'].forEach(function (name) {
        var fn = window[name];
        if (typeof fn !== 'function') { return; }
        window[name] = function () {
          try { return fn.apply(this, arguments); } catch (e) { report(e); }
        };
      });
      if (typeof window.setup !== 'function' && !hasDraw) {
        post('ready', { w: 0, h: 0, hasCanvas: false, noSketch: true });
        post('probes', { results: [], aborted: false });
      }
    };
  }

  var runners = {};
  var activeRunners = [];
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.src !== 'p5trail') { return; }
    var r = runners[d.runId];
    if (r && e.source === r.frame.contentWindow) { r.handle(d); }
  });

  function Runner(opts) {
    this.opts = opts || {};
    this.el = h('div', { class: 'preview-wrap' });
    this.empty = h('div', { class: 'preview-empty' }, this.opts.emptyText || 'Press Run to see the sketch here.');
    this.el.appendChild(this.empty);
    this.frame = null;
    this.runId = null;
    this.paused = false;
    activeRunners.push(this);
  }
  Runner.prototype.stop = function () {
    if (this.frame) { this.frame.remove(); this.frame = null; }
    if (this.runId) { delete runners[this.runId]; this.runId = null; }
    if (this.pending) { this.pending.resolve({ stopped: true, results: {} }); this.pending = null; }
    if (!this.empty.parentNode) { this.el.appendChild(this.empty); }
  };
  Runner.prototype.run = function (code, probes) {
    var self = this;
    this.stop();
    var runId = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    this.runId = runId;
    runners[runId] = this;
    this.paused = false;
    var cfg = { runId: runId, loopLimit: 200000, probes: (probes || []).map(function (p, i) { return { id: p.id || String(i), frames: p.frames || 1, expr: p.expr }; }), paused: false, assets: assetMap(),
      libs: libsFor(code).map(function (l) { return { name: l.name, ready: l.ready }; }) };
    var json = function (o) { return JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); };
    var doc = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Sketch</title>' +
      '<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}canvas{display:block;max-width:100%;height:auto!important}</style>' +
      '<script>(' + harness.toString() + ')(' + json(cfg) + ');<\/script>' +
      '<script src="' + P5_LOCAL + '"><\/script>' +
      '<script>window.p5||document.write(\'<script src="' + P5_CDN + '"><\\/script>\');<\/script>' +
      libsFor(code).map(function (lib) {
        // a local copy first when there is one, then the CDN if it did not load
        if (lib.local) { return '<script src="' + lib.local + '"><\/script><script>(' + lib.ready + ')||document.write(\'<script src="' + lib.cdn + '"><\\/script>\');<\/script>'; }
        return [].concat(lib.cdn).map(function (url) { return '<script src="' + url + '"><\/script>'; }).join('');
      }).join('') +
      '<script>if(window.__trail.afterP5()){window.__trail.run(' + json(A.protectLoops(code)) + ');}<\/script>' +
      '</head><body></body></html>';
    var frame = h('iframe', { class: 'preview', sandbox: 'allow-scripts', title: this.opts.title || 'Sketch preview', loading: 'eager' });
    frame.srcdoc = doc;
    this.frame = frame;
    if (this.empty.parentNode) { this.empty.remove(); }
    this.el.appendChild(frame);
    this.result = { error: null, results: {}, logs: [], ready: null };
    return new Promise(function (resolve) {
      self.pending = { resolve: resolve };
      var done = false;
      function finish(extra) {
        if (done || self.runId !== runId) { return; }
        done = true;
        clearTimeout(timer);
        if (extra) { Object.assign(self.result, extra); }
        self.pending = null;
        resolve(self.result);
      }
      self.finish = finish;
      var timer = setTimeout(function () { finish({ timeout: true }); }, 6000);
    });
  };
  Runner.prototype.handle = function (d) {
    var res = this.result;
    if (d.type === 'log') {
      res.logs.push(d);
      if (this.opts.onLog) { this.opts.onLog(d); }
    } else if (d.type === 'error') {
      res.error = { message: d.message, name: d.name, line: d.line };
      if (this.opts.onError) { this.opts.onError(res.error); }
      if (this.finish) { this.finish(); }
    } else if (d.type === 'ready') {
      res.ready = d;
      if (this.frame) {
        if (d.w > 0 && d.h > 0) {
          this.frame.style.aspectRatio = d.w + ' / ' + d.h;
          this.frame.style.height = 'auto';
          this.frame.style.maxWidth = d.w + 'px';
        } else {
          this.frame.style.height = '120px';
        }
      }
    } else if (d.type === 'probes') {
      (d.results || []).forEach(function (r) { res.results[r.id] = r.value; });
      if (this.finish) { this.finish({ aborted: d.aborted }); }
    }
  };
  Runner.prototype.pause = function () { this.paused = true; this.post('pause'); };
  Runner.prototype.resume = function () { this.paused = false; this.post('resume'); };
  Runner.prototype.post = function (type) {
    if (this.frame && this.frame.contentWindow) { this.frame.contentWindow.postMessage({ src: 'p5trail-parent', type: type }, '*'); }
  };
  function stopAllRunners() {
    activeRunners.forEach(function (r) { r.stop(); });
    activeRunners = [];
  }

  /* ================================================================
   * Code editor: an accessible textarea with line numbers.
   * Tab indents; Esc then Tab leaves; Ctrl/Cmd+Enter runs.
   * ================================================================ */
  function Editor(opts) {
    var self = this;
    this.opts = opts;
    this.id = opts.id || uid('code');
    this.helpId = this.id + '-help';
    this.gutter = h('div', { class: 'gutter', 'aria-hidden': 'true' });
    this.ta = h('textarea', { id: this.id, class: 'code', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-describedby': this.helpId });
    this.ta.value = opts.code || '';
    if (opts.readOnly) { this.ta.readOnly = true; }
    this.escape = false;
    this.el = h('div', null,
      h('label', { for: this.id, class: opts.labelHidden ? 'visually-hidden' : 'field' }, opts.label || 'Code editor'),
      h('div', { class: 'editor' }, this.gutter, this.ta),
      h('p', { id: this.helpId, class: 'kbd-help' }, opts.readOnly ?
        'Read-only for now. Press Ctrl+Enter (Cmd+Enter on Mac) to run.' :
        'Tab indents. To move focus out of the editor, press Esc, then Tab. Press Ctrl+Enter (Cmd+Enter on Mac) to run.'));
    this.ta.addEventListener('input', function () { self.refresh(); if (opts.onChange) { opts.onChange(self.ta.value); } });
    this.ta.addEventListener('scroll', function () { self.gutter.scrollTop = self.ta.scrollTop; });
    this.ta.addEventListener('keydown', function (e) { self.keydown(e); });
    this.ta.addEventListener('blur', function () { self.escape = false; });
    this.errorLine = null;
    this.refresh();
  }
  Editor.prototype.insert = function (text) {
    this.ta.focus();
    var ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
    if (!ok) {
      this.ta.setRangeText(text, this.ta.selectionStart, this.ta.selectionEnd, 'end');
      this.ta.dispatchEvent(new Event('input'));
    }
  };
  Editor.prototype.keydown = function (e) {
    var ta = this.ta;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (this.opts.onRun) { this.opts.onRun(); }
      return;
    }
    if (ta.readOnly) { return; }
    if (e.key === 'Escape') { this.escape = true; announce('Press Tab to move focus out of the editor.'); return; }
    if (e.key === 'Tab' && !this.escape && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      var start = ta.selectionStart, end = ta.selectionEnd, v = ta.value;
      var lineStart = v.lastIndexOf('\n', start - 1) + 1;
      if (e.shiftKey) {
        var lineEnd = v.indexOf('\n', end); if (lineEnd < 0) { lineEnd = v.length; }
        var block = v.slice(lineStart, lineEnd);
        var out = block.replace(/^ {1,2}/gm, '');
        if (out !== block) {
          ta.setSelectionRange(lineStart, lineEnd);
          this.insert(out);
          ta.setSelectionRange(lineStart, lineStart + out.length);
        }
      } else if (start !== end && v.slice(start, end).indexOf('\n') >= 0) {
        var lineEnd2 = v.indexOf('\n', end - 1); if (lineEnd2 < 0) { lineEnd2 = v.length; }
        var block2 = v.slice(lineStart, lineEnd2);
        var out2 = block2.replace(/^/gm, '  ');
        ta.setSelectionRange(lineStart, lineEnd2);
        this.insert(out2);
        ta.setSelectionRange(lineStart, lineStart + out2.length);
      } else {
        this.insert('  ');
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var s = ta.selectionStart, val = ta.value;
      var ls = val.lastIndexOf('\n', s - 1) + 1;
      var indent = val.slice(ls, s).match(/^\s*/)[0];
      var before = val.slice(ls, s).trim();
      if (/[{(\[]$/.test(before)) { indent += '  '; }
      e.preventDefault();
      this.insert('\n' + indent);
      return;
    }
    if (e.key === '}' && !e.ctrlKey && !e.metaKey) {
      var p = ta.selectionStart, txt = ta.value;
      var lstart = txt.lastIndexOf('\n', p - 1) + 1;
      var soFar = txt.slice(lstart, p);
      if (/^\s{2,}$/.test(soFar) && ta.selectionStart === ta.selectionEnd) {
        e.preventDefault();
        ta.setSelectionRange(p - 2, p);
        this.insert('}');
      }
    }
    if (e.key !== 'Escape') { this.escape = false; }
  };
  Editor.prototype.refresh = function () {
    var n = this.ta.value.split('\n').length;
    clear(this.gutter);
    for (var i = 1; i <= n; i++) {
      this.gutter.appendChild(h('span', { class: i === this.errorLine ? 'err' : null }, String(i)));
    }
    this.ta.rows = Math.max(this.opts.minRows || 8, Math.min(n + 1, this.opts.maxRows || 26));
    this.gutter.scrollTop = this.ta.scrollTop;
  };
  Editor.prototype.markError = function (line) { this.errorLine = line || null; this.refresh(); };
  Editor.prototype.get = function () { return this.ta.value; };
  Editor.prototype.set = function (code) { this.ta.value = code; this.refresh(); if (this.opts.onChange) { this.opts.onChange(code); } };
  Editor.prototype.setReadOnly = function (ro) {
    this.ta.readOnly = !!ro;
    var help = this.el.querySelector('#' + this.helpId);
    help.textContent = ro ? 'Read-only for now. Press Ctrl+Enter (Cmd+Enter on Mac) to run.' : 'Tab indents. To move focus out of the editor, press Esc, then Tab. Press Ctrl+Enter (Cmd+Enter on Mac) to run.';
  };

  /* ================================================================
   * Workbench: editor + run controls + preview + console + analysis
   * ================================================================ */
  function Workbench(opts) {
    var self = this;
    this.opts = opts;
    this.errorKind = null;
    this.editor = new Editor({ id: opts.id, code: opts.code, label: opts.label || 'Your code', readOnly: opts.readOnly, minRows: opts.minRows,
      onChange: function (code) { if (opts.onChange) { opts.onChange(code); } self.codeChanged(); },
      onRun: function () { self.run(); } });
    this.status = h('div', { class: 'feedback', role: 'status' });
    this.consoleEl = h('div', { class: 'console', role: 'log', 'aria-label': 'Console output' });
    this.runner = new Runner({
      title: opts.previewTitle || 'Sketch preview',
      onLog: function (d) { self.log(d.text, d.level === 'error' ? 'c-err' : d.level === 'warn' ? 'c-warn' : ''); },
      onError: function (err) { self.showRuntimeError(err); }
    });
    this.pauseBtn = h('button', { type: 'button', class: 'secondary', onclick: function () { self.togglePause(); }, disabled: true }, 'Pause');
    this.stopBtn = h('button', { type: 'button', class: 'secondary', onclick: function () { self.stop(); }, disabled: true }, 'Stop');
    var buttons = [h('button', { type: 'button', onclick: function () { self.run(); } }, '▶ Run')];
    if (opts.extraButtons) { buttons = buttons.concat(opts.extraButtons); }
    buttons.push(this.pauseBtn, this.stopBtn);
    if (opts.analyze !== false) { buttons.push(h('button', { type: 'button', class: 'secondary', onclick: function () { self.analyze(true); } }, 'Explain my code')); }
    if (opts.resetCode !== undefined) {
      buttons.push(h('button', { type: 'button', class: 'quiet', onclick: function () {
        if (window.confirm('Replace the code in the editor with the starting code? Your changes will be lost.')) { self.editor.set(opts.resetCode); self.editor.markError(null); announce('Code reset.'); }
      } }, 'Reset code'));
    }
    this.analysisEl = h('div', { class: 'analysis', 'aria-live': 'polite' });
    this.el = h('section', { class: 'workbench', 'aria-labelledby': (opts.id || 'wb') + '-title' },
      h('h2', { id: (opts.id || 'wb') + '-title' }, opts.title || 'Workbench'),
      opts.intro || null,
      this.editor.el,
      h('div', { class: 'toolbar' }, buttons),
      this.status,
      h('h3', { class: 'visually-hidden' }, 'Preview'),
      this.runner.el,
      h('p', { class: 'kbd-help' }, 'To use the keyboard in a sketch, click the preview (or Tab into it) first.'),
      h('details', { class: 'console-details', open: true }, h('summary', null, 'Console'), this.consoleEl),
      opts.showFiles ? projectFiles() : null,
      this.analysisEl);
  }
  // The built-in files sketches can load, with their exact paths.
  function projectFiles() {
    var keys = Object.keys(ASSETS);
    if (!keys.length) { return null; }
    return h('details', { class: 'files-details' }, h('summary', null, 'Project files you can load'),
      h('p', { class: 'kbd-help' }, 'Use these paths exactly, for example loadImage(\'assets/bear.png\'). Paths are case-sensitive.'),
      h('ul', { class: 'file-list' }, keys.map(function (k) {
        return h('li', null, h('code', null, k), ': ' + ASSETS[k].desc,
          ASSETS[k].text ? h('details', null, h('summary', null, 'Show what is inside ' + k), h('pre', { class: 'file-pre', tabindex: '0', 'aria-label': 'Contents of ' + k }, ASSETS[k].text)) : null);
      })));
  }

  Workbench.prototype.log = function (text, cls) {
    this.consoleEl.appendChild(h('div', { class: cls || null }, text));
    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
  };
  // After an edit, replace any error message with one that matches the new code.
  Workbench.prototype.codeChanged = function () {
    var self = this;
    clearTimeout(this.editTimer);
    this.editTimer = setTimeout(function () {
      if (self.errorKind) {
        var r = A.analyze(self.editor.get());
        if (!r.ok) {
          self.editor.markError(r.syntaxError.line);
          self.errorKind = 'syntax';
          feedback(self.status, 'warn', 'There is a syntax error' + (r.syntaxError.line ? ' on line ' + r.syntaxError.line : '') + '.', r.syntaxError.friendly);
        } else {
          self.editor.markError(null);
          feedback(self.status, 'info', self.errorKind === 'syntax' ? 'The syntax error is fixed. Press Run to see what happens now.' : 'You changed the code since that error. Press Run to check it again.');
          self.errorKind = null;
        }
      }
      if (self.analysisEl.firstChild && !self.analysisEl.querySelector('.stale-note')) {
        clear(self.analysisEl);
        self.analysisEl.appendChild(h('p', { class: 'muted stale-note' }, 'Your code changed. Press "Explain my code" for an updated description.'));
      }
      if (self.opts.onEdit) { self.opts.onEdit(); }
    }, 600);
  };
  Workbench.prototype.showSyntaxError = function (se) {
    this.errorKind = 'syntax';
    this.editor.markError(se.line);
    feedback(this.status, 'err', 'Syntax error' + (se.line ? ' on line ' + se.line : '') + '. Nothing ran.',
      h('div', null, h('p', null, se.friendly), h('p', { class: 'muted' }, 'Computer\'s message: ' + se.message)));
    this.log('Syntax error' + (se.line ? ' (line ' + se.line + ')' : '') + ': ' + se.message, 'c-err');
    announce('Syntax error' + (se.line ? ' on line ' + se.line : '') + '.');
  };
  Workbench.prototype.showRuntimeError = function (err) {
    this.errorKind = 'runtime';
    var known = [];
    var r = A.analyze(this.editor.get());
    if (r.facts) { known = Object.keys(r.facts.declared).concat(r.facts.fnNames); }
    var friendly = A.friendlyRuntime(err.message, known);
    this.editor.markError(err.line);
    feedback(this.status, 'err', 'Runtime error' + (err.line ? ' on line ' + err.line : '') + '. The sketch stopped.',
      h('div', null, h('p', null, friendly), h('p', { class: 'muted' }, 'Computer\'s message: ' + err.message)));
    this.log('Runtime error' + (err.line ? ' (line ' + err.line + ')' : '') + ': ' + err.message, 'c-err');
    announce('Runtime error' + (err.line ? ' on line ' + err.line : '') + '.');
    this.pauseBtn.disabled = true;
  };
  // Runs the code. Returns a promise with {syntaxError} or the runner result.
  Workbench.prototype.run = function (probes, opts) {
    var self = this;
    opts = opts || {};
    var code = this.editor.get();
    clearTimeout(this.editTimer);
    clear(this.consoleEl);
    this.editor.markError(null);
    var r = A.analyze(code);
    if (!r.ok) {
      this.runner.stop();
      this.showSyntaxError(r.syntaxError);
      this.pauseBtn.disabled = true; this.stopBtn.disabled = true;
      return Promise.resolve({ syntaxError: r.syntaxError, analysis: r });
    }
    clear(this.status); this.status.className = 'feedback'; this.errorKind = null;
    this.pauseBtn.disabled = false; this.pauseBtn.textContent = 'Pause';
    this.stopBtn.disabled = false;
    if (!opts.quiet) { announce('Running.'); }
    if (this.opts.onRun) { this.opts.onRun(); }
    return this.runner.run(code, probes).then(function (res) {
      res.analysis = r;
      if (!res.error && res.ready && res.ready.noSketch) {
        feedback(self.status, 'warn', 'Nothing to run yet.', 'p5 starts a sketch when it finds a function named setup() or draw().');
      } else if (!res.error && !res.stopped && res.ready && !res.ready.hasCanvas) {
        feedback(self.status, 'info', 'It ran, but there is no canvas.', 'Call createCanvas(width, height) in setup() to get a drawing area.');
      } else if (!res.error && res.timeout && !res.ready) {
        feedback(self.status, 'warn', 'The sketch did not start.', 'If you are offline, p5.js may not have loaded. Otherwise, check that setup() is spelled correctly.');
      }
      if (!res.error && r.facts && r.description.length) {
        self.runner.frame && self.runner.frame.setAttribute('title', 'Sketch preview. ' + r.description.slice(0, 3).join(' '));
      }
      return res;
    });
  };
  Workbench.prototype.togglePause = function () {
    if (this.runner.paused) { this.runner.resume(); this.pauseBtn.textContent = 'Pause'; announce('Resumed.'); }
    else { this.runner.pause(); this.pauseBtn.textContent = 'Resume'; announce('Paused.'); }
  };
  Workbench.prototype.stop = function () {
    this.runner.stop();
    this.pauseBtn.disabled = true; this.stopBtn.disabled = true;
    announce('Stopped.');
  };
  // Shows a plain-language description of the code plus suggestions.
  Workbench.prototype.analyze = function (focus) {
    var r = A.analyze(this.editor.get());
    var el = clear(this.analysisEl);
    var headId = uid('an');
    el.appendChild(h('h3', { id: headId, tabindex: '-1' }, 'What your code does'));
    if (!r.ok) {
      this.editor.markError(r.syntaxError.line);
      el.appendChild(h('p', null, 'The code can\'t be read yet, so it can\'t be described. Fix the syntax error first:'));
      el.appendChild(h('p', null, h('strong', null, 'Line ' + (r.syntaxError.line || '?') + ': '), r.syntaxError.friendly));
    } else {
      el.appendChild(h('ul', null, r.description.map(function (d) { return h('li', null, d); })));
      if (r.strengths.length) {
        el.appendChild(h('h3', null, 'Strengths'));
        el.appendChild(h('ul', null, r.strengths.map(function (d) { return h('li', null, d); })));
      }
      el.appendChild(h('h3', null, 'Suggestions to improve it'));
      if (!r.suggestions.length) {
        el.appendChild(h('p', null, 'No suggestions. Nice and clean. Can you explain every line out loud?'));
      } else {
        el.appendChild(h('ul', null, r.suggestions.slice(0, 8).map(function (s) {
          return h('li', null,
            h('span', { class: 'sug-kind ' + s.kind }, s.kind === 'warn' ? 'Likely problem' : 'Tip'),
            s.line ? ' (line ' + s.line + '): ' : ': ', s.message,
            h('span', { class: 'why' }, s.why));
        })));
      }
      el.appendChild(h('p', { class: 'muted' }, 'This feedback comes from rules that read your code, not from an AI. It can miss things. You are the final judge.'));
    }
    if (focus) { el.querySelector('#' + headId).focus(); }
    return r;
  };

  /* ================================================================
   * Multiple-choice question
   * ================================================================ */
  function MCQ(opts) {
    var name = uid('q');
    var fb = h('div', { class: 'feedback', role: 'status' });
    var radios = [];
    var fs = h('fieldset', { class: 'choices' }, h('legend', null, opts.q),
      opts.options.map(function (opt, i) {
        var input = h('input', { type: 'radio', name: name, value: String(i), checked: opts.saved && opts.saved.choice === i });
        radios.push(input);
        return h('label', null, input, h('span', null, opt));
      }));
    var answers = Array.isArray(opts.answer) ? opts.answer : [opts.answer];
    function check() {
      var choice = -1;
      radios.forEach(function (r, i) { if (r.checked) { choice = i; } });
      if (choice < 0) { feedback(fb, 'warn', 'Choose an answer first.'); return; }
      var ok = answers.indexOf(choice) >= 0;
      var why = Array.isArray(opts.why) ? opts.why[choice] : (ok ? opts.why : null);
      if (ok) { feedback(fb, 'ok', opts.okLead || 'Correct.', why); }
      else { feedback(fb, 'err', 'Not quite. Try again.', why || opts.wrongHint || 'Re-read the code and trace it one line at a time.'); }
      if (opts.onCheck) { opts.onCheck(choice, ok); }
    }
    var btn = h('button', { type: 'button', onclick: check }, opts.button || 'Check answer');
    var el = h('div', { class: 'mcq' }, fs, btn, fb);
    if (opts.saved && opts.saved.correct) {
      var why0 = Array.isArray(opts.why) ? opts.why[opts.saved.choice] : opts.why;
      feedback(fb, 'ok', opts.okLead || 'Correct.', why0);
    }
    return { el: el };
  }

  /* ================================================================
   * Shared pieces
   * ================================================================ */
  var TYPE_INFO = {
    syntax: { name: 'Syntax error', short: 'The code can\'t be read. Nothing runs.', long: 'Like a sentence with missing punctuation: the computer can\'t read it, so nothing runs. The console shows the problem before anything appears.' },
    runtime: { name: 'Runtime error', short: 'It starts, then crashes with an error message.', long: 'The code reads fine, but something fails while it runs, like a recipe that says "add the lime" when there is no lime. An error message appears and the sketch stops.' },
    logic: { name: 'Logic error', short: 'It runs with no error, but does the wrong thing.', long: 'The computer is happy, but the result is not what was intended. There is no error message. Only someone who knows the goal can spot it.' }
  };
  function errorTypesGuide() {
    return h('details', null, h('summary', null, 'Field guide: the three kinds of errors'),
      h('dl', { class: 'terms' }, ['syntax', 'runtime', 'logic'].map(function (k) {
        return [h('dt', null, TYPE_INFO[k].name), h('dd', null, TYPE_INFO[k].long)];
      })));
  }

  var RATINGS = {
    green: { label: 'Easiest (green circle)', svg: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8" fill="#1D7A46" stroke="currentColor" stroke-width="1.5"/></svg>' },
    blue: { label: 'More difficult (blue square)', svg: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="2.5" y="2.5" width="15" height="15" fill="#1F5BB5" stroke="currentColor" stroke-width="1.5"/></svg>' },
    black: { label: 'Most difficult (black diamond)', svg: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 1.5 L18.5 10 L10 18.5 L1.5 10 Z" fill="#111111" stroke="currentColor" stroke-width="1.5"/></svg>' },
    double: { label: 'Experts only (double black diamond)', svg: '<svg width="36" height="20" viewBox="0 0 36 20" aria-hidden="true" focusable="false"><path d="M9 1.5 L16.5 10 L9 18.5 L1.5 10 Z M27 1.5 L34.5 10 L27 18.5 L19.5 10 Z" fill="#111111" stroke="currentColor" stroke-width="1.5"/></svg>' }
  };
  function rating(r) {
    var info = RATINGS[r] || RATINGS.green;
    return h('span', { class: 'rating' }, h('span', { html: info.svg }), info.label);
  }

  function crumbs(items) {
    return h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('ol', null, items.map(function (it, i) {
      return h('li', null, i === items.length - 1 ? h('span', { 'aria-current': 'page' }, it[0]) : h('a', { href: it[1] }, it[0]));
    })));
  }

  function contextCard(ctx, headingLevel) {
    return h('section', { class: 'card context', 'aria-label': 'The problem' },
      h('p', { class: 'muted', style: 'margin:0' }, h('span', { class: 'tag' }, ctx.kind), ' Understand the problem first'),
      h(headingLevel || 'h2', { style: 'margin-top:0.3rem' }, ctx.title),
      ctx.story ? h('p', null, ctx.story) : null);
  }

  function step(num, title, opts) {
    opts = opts || {};
    var body = h('div', { class: 'step-body' });
    var el = h('section', { class: 'step' + (opts.locked ? ' locked' : '') + (opts.complete ? ' complete' : '') },
      h('h2', null, h('span', { class: 'step-num', 'aria-hidden': 'true' }, String(num)), h('span', null, h('span', { class: 'visually-hidden' }, 'Step ' + num + ': '), title,
        opts.complete ? h('span', { class: 'visually-hidden' }, ' (complete)') : null)),
      opts.locked ? h('p', { class: 'lock-note' }, opts.lockText || 'Finish the step above to unlock this one.') : body);
    return { el: el, body: body };
  }

  // Shows idea coverage for a written explanation.
  function explanationFeedback(el, result, minWords, okEnough) {
    var list = h('ul', null,
      result.covered.map(function (c) { return h('li', null, h('span', { class: 'icon', 'aria-hidden': 'true' }, '✓'), h('span', { class: 'visually-hidden' }, 'Covered: '), c.label); }),
      result.missing.map(function (c) { return h('li', null, h('span', { class: 'icon', 'aria-hidden': 'true' }, '?'), h('span', { class: 'visually-hidden' }, 'Not mentioned yet: '), c.label + (c.prompt ? '. Ask yourself: ' + c.prompt : '')); }));
    if (result.words < minWords) {
      feedback(el, 'warn', 'Write a bit more: at least ' + minWords + ' words (you have ' + result.words + ').', h('div', null, h('p', null, 'Explain it like you would to a classmate who has not seen the code.'), list));
      return false;
    }
    if (okEnough) {
      feedback(el, 'ok', 'Saved. You covered ' + result.covered.length + ' of ' + (result.covered.length + result.missing.length) + ' key ideas.', list);
    } else {
      feedback(el, 'info', 'You covered ' + result.covered.length + ' of ' + (result.covered.length + result.missing.length) + ' key ideas. Revise to include the ones marked ?, then submit again.', list);
    }
    return true;
  }

  // Old "not yet" or error feedback no longer describes edited code.
  function markStale(el, msg) {
    if (!el || !/\b(err|warn|info)\b/.test(el.className) || !el.firstChild) { return; }
    feedback(el, 'info', msg);
  }

  function copyBlock(text, label) {
    var id = uid('copy');
    var ta = h('textarea', { id: id, class: 'prose copy-area', readonly: true }, text);
    ta.value = text;
    var fb = h('span', { role: 'status', class: 'muted' });
    var btn = h('button', { type: 'button', class: 'secondary', onclick: function () {
      var done = function () { fb.textContent = 'Copied to clipboard.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { ta.select(); fb.textContent = 'Press Ctrl+C (Cmd+C) to copy the selected text.'; });
      } else { ta.select(); fb.textContent = 'Press Ctrl+C (Cmd+C) to copy the selected text.'; }
    } }, 'Copy');
    return h('div', null, h('label', { for: id, class: 'field' }, label || 'Prompt'), ta, h('div', { class: 'toolbar' }, btn, fb));
  }

  function tutorPrompt(parts) {
    var lines = ['I am a beginner learning p5.js in a university course. Please act as a tutor, not a code writer.', ''];
    if (parts.problem) { lines.push('The problem: ' + parts.problem); }
    if (parts.task) { lines.push('My task: ' + parts.task); }
    if (parts.plan && parts.plan.some(function (p) { return p.trim(); })) {
      lines.push('My plan:');
      parts.plan.forEach(function (p) { if (p.trim()) { lines.push('- ' + p.trim()); } });
    }
    lines.push('', 'My current code:', '```js', parts.code || '', '```');
    if (parts.status) { lines.push('', 'What happens now: ' + parts.status); }
    lines.push('', 'Please do NOT write the solution or rewrite my code. Instead:');
    (parts.asks || ['Ask me one question that helps me find my next step.', 'Give me one small hint about the concept I seem to be missing.', 'Tell me which line to look at, without fixing it.']).forEach(function (a, i) { lines.push((i + 1) + '. ' + a); });
    return lines.join('\n');
  }

  /* ================================================================
   * Progress summaries
   * ================================================================ */
  function firstMissing(pairs) {
    for (var i = 0; i < pairs.length; i++) { if (!pairs[i][0]) { return pairs[i][1]; } }
    return null;
  }
  function levelActivities(lv) {
    var s = lvState(lv.id);
    var readRight = lv.read.questions.every(function (q, i) { return s.read.answers && s.read.answers[i] && s.read.answers[i].correct; });
    var acts = [
      { key: 'learn', short: 'Learn', label: 'Learn', desc: 'Concept, syntax, and a predict-then-run example.', href: '#/level/' + lv.id + '/learn', done: !!s.learn.done, started: !!(s.learn.predicted || s.learn.ran),
        left: firstMissing([[s.learn.predicted, 'make your prediction'], [s.learn.ran, 'run the example']]) },
      { key: 'build', short: 'Build', label: 'Build', desc: lv.build.context.kind + ': ' + lv.build.context.title + '. Plan it, then code it.', href: '#/level/' + lv.id + '/build', done: !!s.build.done, started: !!(s.build.planSaved || s.build.checks),
        left: firstMissing([[s.build.planSaved, 'save your plan'], [s.build.passed, 'meet every requirement'], [s.build.done, 'explain your code']]) },
      { key: 'read', short: 'Read', label: 'Read and explain', desc: 'Explain working code in your own words.', href: '#/level/' + lv.id + '/read', done: !!s.read.done, started: !!(s.read.submits || Object.keys(s.read.answers || {}).length),
        left: firstMissing([[s.read.submits, 'submit your explanation'], [readRight, 'answer every tracing question']]) }
    ];
    lv.bugs.forEach(function (b, i) {
      var bs = s.bugs[i] || {};
      acts.push({ key: 'bug' + i, short: 'Bug ' + (i + 1), label: 'Bug hunt ' + (i + 1) + ': ' + b.title, rating: b.rating, desc: RATINGS[b.rating].label, href: '#/level/' + lv.id + '/bug/' + (i + 1), done: !!bs.done, started: !!(bs.attempts && (bs.attempts.type || bs.typeOk)),
        left: firstMissing([[bs.typeOk, 'name the error type'], [bs.lineOk, 'find the line'], [bs.causeOk, 'choose the cause'], [bs.fixOk, 'fix the code'], [bs.done, 'explain the bug']]) });
    });
    if (lv.judge) {
      acts.push({ key: 'judge', short: 'Judge', label: 'Judge the AI', desc: 'Review AI-written code against a spec: ' + lv.judge.context.title + '.', href: '#/level/' + lv.id + '/judge', done: !!s.judge.done, started: !!s.judge.rowsChecked,
        left: firstMissing([[s.judge.rowsChecked, 'review each requirement'], [s.judge.issueOk, 'answer the process question'], [s.judge.verdict, 'give your verdict'], [s.judge.done, 'write a better prompt']]) });
    }
    return acts;
  }

  /* Activity navigation shown on every activity page. Refreshed when progress changes. */
  var current = null;
  function statusWords(a) { return a.done ? 'complete' : a.started ? 'in progress, next: ' + a.left : 'not started'; }
  function activityNav(lv, key) {
    var navEl = h('nav', { class: 'act-nav no-print', 'aria-label': 'Level ' + lv.id + ' activities' });
    current = { lv: lv, key: key, nav: navEl, slot: null, sig: null };
    renderNav();
    return navEl;
  }
  function renderNav() {
    if (!current || !current.nav) { return; }
    var acts = levelActivities(current.lv);
    var sig = acts.map(function (a) { return a.done ? 'd' : a.started ? 's' : 'n'; }).join('');
    if (sig === current.sig) { return; }
    var hadFocus = current.nav.contains(document.activeElement) ? document.activeElement.getAttribute('href') : null;
    current.sig = sig;
    clear(current.nav);
    current.nav.appendChild(h('ol', null, acts.map(function (a) {
      return h('li', null, h('a', { href: a.href, class: a.done ? 'done' : a.started ? 'started' : null, 'aria-current': a.key === current.key ? 'page' : null },
        h('span', { class: 'act-icon', 'aria-hidden': 'true' }, a.done ? '✓' : a.started ? '●' : '○'),
        a.short, h('span', { class: 'visually-hidden' }, ', ' + statusWords(a))));
    })));
    if (hadFocus) { var f = current.nav.querySelector('a[href="' + hadFocus + '"]'); if (f) { f.focus(); } }
  }
  function progressChanged() { renderNav(); renderNext(); }

  function levelProgress(lv) {
    var acts = levelActivities(lv);
    var done = acts.filter(function (a) { return a.done; }).length;
    var s = lvState(lv.id);
    var bugsDone = lv.bugs.every(function (b, i) { return s.bugs[i] && s.bugs[i].done; });
    return { done: done, total: acts.length, skills: [
      { label: 'Write', done: !!s.build.done },
      { label: 'Read', done: !!s.read.done },
      { label: 'Debug', done: bugsDone },
      lv.judge ? { label: 'Judge', done: !!s.judge.done } : null
    ].filter(Boolean) };
  }
  function progressBar(done, total, label) {
    var pct = total ? Math.round(done / total * 100) : 0;
    return h('div', { class: 'progress' },
      h('div', { class: 'progress-bar', role: 'img', 'aria-label': label + ': ' + done + ' of ' + total + ' activities complete' }, h('span', { style: 'width:' + pct + '%' })),
      h('span', { 'aria-hidden': 'true' }, done + ' / ' + total));
  }

  /* ================================================================
   * Views
   * ================================================================ */
  var main = document.getElementById('main');

  function page(title, crumbItems) {
    clear(main);
    if (crumbItems) { main.appendChild(crumbs(crumbItems)); }
    var h1 = h('h1', { tabindex: '-1' }, title);
    main.appendChild(h1);
    return h1;
  }

  /* ---------- Home: the course map ---------- */
  function levelCard(lv, nextId) {
    var p = levelProgress(lv);
    var w = weekOf(lv.id);
    return h('li', null, h('a', { class: 'trail-card' + (lv.id === nextId ? ' next' : ''), href: '#/level/' + lv.id },
      h('span', { class: 'num' }, 'Level ' + lv.id + (isRefresher(lv.id) ? ' · Refresher' : '') + (lv.id === nextId ? ' · Recommended next' : '') + (p.done === p.total ? ' · Complete' : '')),
      h('span', { class: 'trail-title' }, lv.title),
      h('p', null, lv.tagline),
      progressBar(p.done, p.total, 'Level ' + lv.id),
      h('ul', { class: 'skills', 'aria-label': 'Skills' }, p.skills.map(function (s) { return h('li', { class: s.done ? 'done' : null }, s.done ? '✓ ' : '', s.label, h('span', { class: 'visually-hidden' }, s.done ? ' (earned)' : ' (not yet)')); }))));
  }
  function finalCard(nextId) {
    var cs = state.capstone || {};
    return h('li', null, h('a', { class: 'trail-card' + (nextId === null ? ' next' : ''), href: '#/capstone' },
      h('span', { class: 'num' }, 'Final project' + (nextId === null && !cs.done ? ' · Recommended next' : '') + (cs.done ? ' · Complete' : '')),
      h('span', { class: 'trail-title' }, CAP.title),
      h('p', null, CAP.tagline)));
  }
  function recommendedId() {
    var id = null;
    ORDER.some(function (lid) { var p = levelProgress(levelById(lid)); if (p.done < p.total) { id = lid; return true; } return false; });
    return id;
  }
  function viewHome() {
    document.title = APP + (COURSE.code ? ' — ' + COURSE.code : '') + ' — University of Montana';
    page('p5.js Code Trail');
    main.appendChild(h('p', { class: 'lede' }, 'Learn to code in p5.js by writing, reading, debugging, and judging code, including code an AI wrote. Nothing here is timed. You move forward by understanding and explaining, not by being fast.'));

    main.appendChild(h('h2', null, 'How every level works'));
    var stepsInfo = [
      ['1. Learn', 'A short concept, how to read the syntax out loud, and a predict-then-run example.'],
      ['2. Build', 'A real business or game problem. Plan it in plain English first, then code it. Your code is checked, described, and given suggestions.'],
      ['3. Read and explain', 'Working code you did not write. Explain it in your own words, then answer tracing questions.'],
      ['4. Bug hunt', 'Find the bug, name its type (syntax, runtime, or logic), explain the cause, then fix it. Bugs get harder as you go.'],
      ['5. Judge the AI', 'Starting in Level 3: check AI-written code against a spec, decide whether to accept it, and write a better prompt.']
    ];
    main.appendChild(h('div', { class: 'grid steps-grid' }, stepsInfo.map(function (s) { return h('div', { class: 'card' }, h('h3', null, s[0]), h('p', null, s[1])); })));

    main.appendChild(h('div', { class: 'card', style: 'border-left: 6px solid var(--copper-climb)' },
      h('h2', { class: 'panel-title' }, 'Try first, then ask'),
      h('p', null, 'Help is always available, but it unlocks after you make an honest attempt: save a plan and check your work once. Hints come in steps, and a full worked solution comes last. If you use one, you answer questions about it before you can copy it. That mirrors how to use an AI assistant well: think first, ask well, verify everything, and only use code you can explain.'),
      h('p', null, h('a', { href: '#/guide' }, 'Read the guide to using AI well' + (COURSE.code ? ', including the ' + COURSE.code + ' AI policy' : '')))));

    var nextId = recommendedId();
    main.appendChild(h('h2', { id: 'map-h' }, (COURSE.code ? COURSE.code + ' ' : '') + 'course map'));
    main.appendChild(h('p', null, 'Levels are grouped by the syllabus week where they fit. Levels 1–10 review Creative Coding 1; skip ahead if you are comfortable, or use them as a refresher. Every level is open.'));
    COURSE.weeks.forEach(function (w) {
      var headId = 'week-' + w.week + '-h';
      var sec = h('section', { 'aria-labelledby': headId, class: 'week-section' },
        h('h3', { id: headId }, h('a', { href: '#/week/' + w.week }, 'Week ' + w.week + ': ' + w.title)),
        h('p', { class: 'muted' }, w.focus));
      var ol = h('ol', { class: 'trail', 'aria-labelledby': headId });
      if (w.final) { ol.appendChild(finalCard(nextId)); }
      (w.levels || []).forEach(function (id) { var lv = levelById(id); if (lv) { ol.appendChild(levelCard(lv, nextId)); } });
      sec.appendChild(ol);
      main.appendChild(sec);
    });
    if (!finalWeek()) {
      var ol2 = h('ol', { class: 'trail' }); ol2.appendChild(finalCard(nextId)); main.appendChild(ol2);
    }
    main.appendChild(h('p', { class: 'muted' }, 'Weeks 14–15 (Unity) are not part of this trail.'));
  }

  // A button that copies a link to part of the trail, for posting in Canvas.
  function copyLinkButton(hash, label) {
    var url = location.href.split('#')[0] + hash;
    var status = h('span', { role: 'status', class: 'muted' });
    var btn = h('button', { type: 'button', class: 'secondary', onclick: function () {
      var done = function () { status.textContent = 'Link copied: ' + url; };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done, function () { status.textContent = url; }); }
      else { status.textContent = url; }
    } }, label);
    return h('p', { class: 'toolbar no-print' }, btn, status);
  }

  /* ---------- Week page (for assigning a week in Canvas) ---------- */
  function viewWeek(w) {
    document.title = 'Week ' + w.week + ': ' + w.title + ' — ' + APP;
    page('Week ' + w.week + ': ' + w.title, [['Course map', '#/'], ['Week ' + w.week, null]]);
    main.appendChild(h('p', { class: 'lede' }, w.focus));
    main.appendChild(copyLinkButton('#/week/' + w.week, 'Copy a link to this week'));
    if (w.final) {
      main.appendChild(h('ol', { class: 'trail' }, finalCard(recommendedId())));
    }
    (w.levels || []).forEach(function (id) {
      var lv = levelById(id);
      if (!lv) { return; }
      var p = levelProgress(lv);
      var headId = 'lv-' + id + '-h';
      main.appendChild(h('section', { class: 'card', 'aria-labelledby': headId },
        h('h2', { id: headId, class: 'panel-title' }, h('a', { href: '#/level/' + id }, 'Level ' + id + ': ' + lv.title)),
        isRefresher(id) ? h('p', { class: 'muted' }, 'Refresher from Creative Coding 1.') : null,
        h('p', null, lv.tagline),
        progressBar(p.done, p.total, 'Level ' + id),
        h('ol', { class: 'activity-list', style: 'margin-top:0.75rem' }, levelActivities(lv).map(activityItem))));
    });
    var idx = COURSE.weeks.indexOf(w);
    var nav = h('p', { class: 'toolbar' });
    if (COURSE.weeks[idx - 1]) { nav.appendChild(h('a', { class: 'button secondary', href: '#/week/' + COURSE.weeks[idx - 1].week }, '← Week ' + COURSE.weeks[idx - 1].week)); }
    if (COURSE.weeks[idx + 1]) { nav.appendChild(h('a', { class: 'button secondary', href: '#/week/' + COURSE.weeks[idx + 1].week }, 'Week ' + COURSE.weeks[idx + 1].week + ' →')); }
    main.appendChild(nav);
  }

  function activityItem(a) {
    return h('li', null, h('a', { href: a.href },
      a.rating ? h('span', { html: RATINGS[a.rating].svg }) : null,
      h('span', null, h('strong', null, a.label), h('span', { class: 'muted' }, a.desc)),
      h('span', { class: 'status ' + (a.done ? 'done' : a.started ? 'progress-s' : '') }, a.done ? '✓ Complete' : a.started ? 'In progress: next, ' + a.left : 'Not started')));
  }

  /* ---------- Level overview ---------- */
  function viewLevel(lv) {
    var w = weekOf(lv.id);
    document.title = 'Level ' + lv.id + ': ' + lv.title + ' — ' + APP;
    page('Level ' + lv.id + ': ' + lv.title, [['Course map', '#/']].concat(w ? [['Week ' + w.week, '#/week/' + w.week]] : []).concat([['Level ' + lv.id, null]]));
    main.appendChild(h('p', { class: 'lede' }, lv.tagline));
    if (w) {
      main.appendChild(h('p', null, (COURSE.code ? COURSE.code + ', ' : ''), h('a', { href: '#/week/' + w.week }, weekLabel(w)),
        isRefresher(lv.id) ? ' (refresher from Creative Coding 1)' : ''));
    }
    main.appendChild(h('p', null, h('span', { class: 'visually-hidden' }, 'Concepts: '), lv.concepts.map(function (c) { return h('span', { class: 'chip' }, c); })));
    var p = levelProgress(lv);
    main.appendChild(progressBar(p.done, p.total, 'Level ' + lv.id));
    main.appendChild(h('h2', null, 'Activities'));
    main.appendChild(h('ol', { class: 'activity-list' }, levelActivities(lv).map(activityItem)));
    var nav = h('p', { class: 'toolbar' });
    var prev = prevLevel(lv.id), next = nextLevel(lv.id);
    if (prev) { nav.appendChild(h('a', { class: 'button secondary', href: '#/level/' + prev.id }, '← Level ' + prev.id + ': ' + prev.title)); }
    nav.appendChild(next ? h('a', { class: 'button secondary', href: '#/level/' + next.id }, 'Level ' + next.id + ': ' + next.title + ' →') : h('a', { class: 'button secondary', href: '#/capstone' }, 'Final project →'));
    main.appendChild(nav);
    main.appendChild(copyLinkButton('#/level/' + lv.id, 'Copy a link to this level'));
  }

  function nextLink(lv, currentKey) {
    var slot = h('div', { class: 'next-slot' });
    if (current && current.lv === lv && current.key === currentKey) { current.slot = slot; current.slotSig = null; }
    renderNext(slot, lv, currentKey);
    return slot;
  }
  function renderNext(slot, lv, key) {
    if (!slot) {
      if (!current || !current.slot) { return; }
      slot = current.slot; lv = current.lv; key = current.key;
    }
    var acts = levelActivities(lv);
    var idx = acts.map(function (a) { return a.key; }).indexOf(key);
    var me = acts[idx];
    var sig = me.done ? 'done' : 'open';
    if (current && current.slot === slot) { if (current.slotSig === sig) { return; } current.slotSig = sig; }
    var next = acts.slice(idx + 1).filter(function (a) { return !a.done; })[0] || acts[idx + 1];
    var nextHref, nextText;
    if (next) { nextHref = next.href; nextText = 'Next: ' + next.label + ' →'; }
    else if (nextLevel(lv.id)) { var nl = nextLevel(lv.id); nextHref = '#/level/' + nl.id + '/learn'; nextText = 'On to Level ' + nl.id + ': ' + nl.title + ' →'; }
    else { nextHref = '#/capstone'; nextText = 'On to the final project →'; }
    var remaining = acts.filter(function (a) { return !a.done; });
    clear(slot);
    if (me.done) {
      slot.appendChild(h('div', { class: 'feedback ok' },
        h('p', null, h('strong', null, h('span', { class: 'icon', 'aria-hidden': 'true' }, '✓'), 'Activity complete.')),
        h('p', null, remaining.length ? 'Level ' + lv.id + ' still has ' + remaining.length + ' unfinished activit' + (remaining.length === 1 ? 'y' : 'ies') + ': ' + remaining.map(function (a) { return a.short; }).join(', ') + '.' : 'You finished every activity in Level ' + lv.id + '.')));
    }
    var prev = acts[idx - 1];
    slot.appendChild(h('p', { class: 'toolbar' },
      prev ? h('a', { class: 'button secondary', href: prev.href }, '← ' + prev.short) : h('a', { class: 'button secondary', href: '#/level/' + lv.id }, '← Level ' + lv.id + ' overview'),
      h('a', { class: me.done ? 'button' : 'button secondary', href: nextHref }, me.done ? nextText : 'Skip to ' + nextText.replace(/^Next: /, ''))));
  }

  /* ---------- Learn ---------- */
  function viewLearn(lv) {
    var s = lvState(lv.id).learn;
    var L = lv.learn;
    document.title = 'Learn — Level ' + lv.id + ' — ' + APP;
    page('Learn: ' + lv.title, [['Course map', '#/'], ['Level ' + lv.id, '#/level/' + lv.id], ['Learn', null]]);
    main.appendChild(activityNav(lv, 'learn'));
    var left = h('div');
    left.appendChild(h('h2', null, 'The big ideas'));
    left.appendChild(h('ul', null, L.brief.map(function (b) { return h('li', { html: b }); })));
    left.appendChild(h('h2', null, 'Say it out loud'));
    left.appendChild(h('p', null, 'Being able to read code aloud is the first step to explaining it, whether you wrote it or an AI did.'));
    left.appendChild(h('table', { class: 'sayit' },
      h('caption', { class: 'visually-hidden' }, 'Code and how to say it'),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Code'), h('th', { scope: 'col' }, 'How to say it'))),
      h('tbody', null, L.sayIt.map(function (r) { return h('tr', null, h('td', null, r[0]), h('td', null, r[1])); }))));
    left.appendChild(h('h2', null, 'Words to know'));
    left.appendChild(h('dl', { class: 'terms' }, L.terms.map(function (t) { return [h('dt', null, t[0]), h('dd', null, t[1])]; })));

    var predictWrap = h('section', { class: 'step' + (s.predicted ? ' complete' : '') });
    predictWrap.appendChild(h('h2', null, h('span', { class: 'step-num', 'aria-hidden': 'true' }, '?'), 'Predict before you run'));
    left.appendChild(predictWrap);

    var runBtnNote = h('p', { class: 'muted' });
    var wb = new Workbench({ id: 'learn-code', showFiles: lv.id >= 11, title: 'Example', code: L.example, label: 'Example code (you can edit it)', resetCode: L.example,
      onRun: function () { s.ran = true; save(); finishLearn(); } });
    function finishLearn() {
      if (s.predicted && s.ran && !s.done) { s.done = true; save(); announce('Learn activity complete.'); }
      progressChanged();
    }
    var mcq = MCQ({ q: L.predict.q, options: L.predict.options, answer: L.predict.answer, why: L.predict.why, button: 'Lock in my prediction',
      okLead: 'Your prediction matches. Now run it to confirm.',
      saved: s.predicted ? { choice: s.choice, correct: s.choice === L.predict.answer } : null,
      wrongHint: 'Run the example and see what really happens. Then work out which part of the code you misread.',
      onCheck: function (choice) {
        s.predicted = true; s.choice = choice; save();
        predictWrap.classList.add('complete');
        runBtnNote.textContent = s.ran ? 'Run it again and compare with your prediction.' : 'Now press Run in the Example panel and compare with your prediction.';
        finishLearn();
      } });
    predictWrap.appendChild(mcq.el);
    predictWrap.appendChild(runBtnNote);
    if (!s.predicted) { runBtnNote.textContent = 'Make a prediction first, then run the example to check it.'; }

    left.appendChild(h('h2', null, 'Try this'));
    left.appendChild(h('ul', null, L.tryThis.map(function (t) { return h('li', null, t); })));
    left.appendChild(nextLink(lv, 'learn'));

    main.appendChild(h('div', { class: 'activity two-col' }, left, wb.el));
  }

  /* ---------- Build ---------- */
  function viewBuild(lv) {
    var B = lv.build;
    var s = lvState(lv.id).build;
    if (!s.plan) { s.plan = ['', '', '']; }
    document.title = 'Build — Level ' + lv.id + ' — ' + APP;
    page('Build: ' + B.context.title, [['Course map', '#/'], ['Level ' + lv.id, '#/level/' + lv.id], ['Build', null]]);
    main.appendChild(activityNav(lv, 'build'));
    var left = h('div');
    left.appendChild(contextCard(B.context));
    left.appendChild(h('div', { class: 'card' }, h('h2', { class: 'panel-title' }, 'Your task'), h('p', null, B.task)));

    // Step 1: plan
    var planStep = step(1, 'Plan before you code', { complete: s.planSaved });
    var planFb = h('div', { class: 'feedback', role: 'status' });
    var planInputs = PLAN_PROMPTS.map(function (p, i) {
      var id = uid('plan');
      var ta = h('textarea', { id: id, class: 'prose', rows: '3' });
      ta.value = s.plan[i] || '';
      ta.addEventListener('input', function () { s.plan[i] = ta.value; save(); });
      return { label: h('label', { for: id, class: 'field' }, p), ta: ta };
    });
    planStep.body.appendChild(h('p', null, 'Describe the solution in plain English before writing code. Good plans make code easier to write, and easier to check, whether you or an AI writes it.'));
    planInputs.forEach(function (pi) { planStep.body.appendChild(pi.label); planStep.body.appendChild(pi.ta); });
    planStep.body.appendChild(h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: function () {
      var short = planInputs.filter(function (pi) { return words(pi.ta.value) < 4; });
      if (short.length) {
        feedback(planFb, 'warn', 'Each answer needs at least 4 words.', 'A rough plan is fine. It just has to be yours.');
        short[0].ta.focus();
        return;
      }
      s.planSaved = true; save();
      planStep.el.classList.add('complete');
      feedback(planFb, 'ok', 'Plan saved. Now build it in the workbench.', 'You can come back and edit your plan anytime.');
      refreshHelp();
    } }, 'Save plan')));
    planStep.body.appendChild(planFb);
    left.appendChild(planStep.el);

    // Step 2: build + checks
    var checkStep = step(2, 'Build it and check your work', { complete: s.passed });
    var checksList = h('ul', { class: 'checks', 'aria-label': 'Requirements' });
    function renderChecks(results) {
      clear(checksList);
      B.checks.forEach(function (c, i) {
        var r = results ? results[i] : null;
        var mark = r === null || r === undefined ? ['unk', 'Not checked'] : r === true ? ['ok', '✓ Met'] : r === 'unknown' ? ['unk', '? Can\'t tell'] : ['no', '✗ Not yet'];
        checksList.appendChild(h('li', null, h('span', { class: 'mark ' + mark[0] }, mark[1]),
          h('span', null, c.label, mark[0] === 'no' && c.fail ? h('span', { class: 'why' }, c.fail) : null)));
      });
    }
    renderChecks(s.lastResults || null);
    var checkFb = h('div', { class: 'feedback', role: 'status' });
    checkStep.body.appendChild(h('p', null, 'Requirements:'));
    checkStep.body.appendChild(checksList);
    checkStep.body.appendChild(h('p', null, 'Write your code in the workbench, then press ', h('strong', null, 'Check my work'), '. You can check as many times as you like.'));
    checkStep.body.appendChild(checkFb);
    left.appendChild(checkStep.el);

    // Help panel
    var help = h('section', { class: 'step', 'aria-labelledby': 'help-h' });
    left.appendChild(help);

    // Step 3: explain
    var explainStep = h('div');
    left.appendChild(explainStep);
    left.appendChild(nextLink(lv, 'build'));

    var checkBtn = h('button', { type: 'button', onclick: function () { checkWork(); } }, 'Check my work');
    var wb = new Workbench({ id: 'build-code', showFiles: lv.id >= 11, title: 'Workbench', code: s.code !== undefined ? s.code : B.starter, resetCode: B.starter,
      label: 'Your code', extraButtons: [checkBtn],
      onChange: function (code) { s.code = code; save(); },
      onEdit: function () { markStale(checkFb, 'You changed your code since the last check. Press Check my work to check it again.'); } });

    function checkWork() {
      var code = wb.editor.get();
      s.checks = (s.checks || 0) + 1; save();
      var r = A.analyze(code);
      if (!r.ok) {
        wb.showSyntaxError(r.syntaxError);
        renderChecks(null);
        feedback(checkFb, 'err', 'Fix the syntax error first. Line ' + (r.syntaxError.line || '?') + ': ' + r.syntaxError.friendly);
        s.lastStatus = 'Syntax error on line ' + r.syntaxError.line + ': ' + r.syntaxError.message;
        refreshHelp();
        return;
      }
      var results = B.checks.map(function (c) {
        if (c.runtime) { return null; }
        try { return c.test(r.facts, code) ? true : false; } catch (e) { return false; }
      });
      var probes = [];
      B.checks.forEach(function (c, i) {
        if (!c.runtime) { return; }
        var expr = null;
        try { expr = c.expr(r.facts); } catch (e) { expr = null; }
        if (expr) { probes.push({ id: String(i), frames: c.frames, expr: expr }); } else { results[i] = false; }
      });
      feedback(checkFb, 'info', 'Checking…');
      wb.run(probes, { quiet: true }).then(function (res) {
        B.checks.forEach(function (c, i) {
          if (!c.runtime || results[i] === false) { return; }
          if (res.error || res.syntaxError) { results[i] = false; return; }
          if (!Object.prototype.hasOwnProperty.call(res.results || {}, String(i))) { results[i] = res.timeout ? 'unknown' : false; return; }
          try { results[i] = c.test(res.results[String(i)], r.facts) ? true : false; } catch (e) { results[i] = false; }
        });
        s.lastResults = results;
        renderChecks(results);
        var met = results.filter(function (x) { return x === true; }).length;
        var notMet = B.checks.filter(function (c, i) { return results[i] !== true; }).map(function (c) { return c.label; });
        if (res.error) {
          feedback(checkFb, 'err', 'The sketch hit a runtime error, so some requirements could not be checked.', 'See the message in the workbench, fix it, then check again.');
          s.lastStatus = 'Runtime error' + (res.error.line ? ' on line ' + res.error.line : '') + ': ' + res.error.message;
        } else if (met === B.checks.length) {
          s.passed = true; s.passedCode = code;
          checkStep.el.classList.add('complete');
          feedback(checkFb, 'ok', 'All ' + met + ' requirements met.', 'Next: explain your code (step 3). Being able to explain it is the real goal.');
          s.lastStatus = 'All requirements pass.';
          renderExplain();
        } else {
          feedback(checkFb, 'warn', met + ' of ' + B.checks.length + ' requirements met. Keep going.', 'Look at the ✗ items in the list. Press "Explain my code" to see what your code does right now.');
          s.lastStatus = 'These requirements are not met yet: ' + notMet.join('; ') + '.';
        }
        save();
        refreshHelp();
        announce(met + ' of ' + B.checks.length + ' requirements met.');
      });
    }

    function refreshHelp() {
      clear(help);
      help.appendChild(h('h2', { id: 'help-h' }, h('span', { class: 'step-num', 'aria-hidden': 'true' }, '?'), 'Need help? Try first, then ask'));
      var unlocked = s.planSaved && (s.checks || 0) >= 1;
      if (!unlocked) {
        help.classList.add('locked');
        help.appendChild(h('p', null, 'Hints unlock after you:'));
        help.appendChild(h('ul', null,
          h('li', null, (s.planSaved ? '✓ ' : '') + 'save your plan (step 1)', s.planSaved ? h('span', { class: 'visually-hidden' }, ' (done)') : null),
          h('li', null, ((s.checks || 0) >= 1 ? '✓ ' : '') + 'press Check my work at least once', (s.checks || 0) >= 1 ? h('span', { class: 'visually-hidden' }, ' (done)') : null)));
        help.appendChild(h('p', { class: 'muted' }, 'Trying first, even if it fails, shows you what you actually need help with. That makes any help, from a hint or an AI, far more useful.'));
        return;
      }
      help.classList.remove('locked');
      var used = s.hints || 0;
      help.appendChild(h('p', { class: 'assist-meter' }, 'Help used so far: ' + (s.solutionCopied ? 'worked solution (copied after answering questions)' : s.solutionSeen ? 'worked solution viewed' : used ? used + ' of 3 hints' : 'none') + '. Using help is fine. It is recorded in your field journal so you can reflect on it.'));
      for (var i = 0; i < used; i++) {
        var hint = B.hints[i];
        help.appendChild(h('div', { class: 'hint-box' }, h('strong', null, 'Hint ' + (i + 1) + (i === 2 ? ' (a partial skeleton)' : '')), /\n/.test(hint) ? h('pre', null, h('code', null, hint)) : h('p', { style: 'margin:0.3rem 0 0' }, hint)));
      }
      var tb = h('div', { class: 'toolbar' });
      if (used < 3) {
        tb.appendChild(h('button', { type: 'button', class: 'secondary', onclick: function () {
          s.hints = used + 1; save(); refreshHelp();
          var boxes = help.querySelectorAll('.hint-box');
          if (boxes.length) { boxes[boxes.length - 1].setAttribute('tabindex', '-1'); boxes[boxes.length - 1].focus(); }
        } }, 'Show hint ' + (used + 1) + ' of 3'));
      } else if (!s.solutionSeen) {
        tb.appendChild(h('button', { type: 'button', class: 'secondary', onclick: function () {
          if (!window.confirm('Show a full worked solution? This is like asking an AI for the answer. You will answer two questions about it before you can copy it, and you will still explain your final code.')) { return; }
          s.solutionSeen = true; save(); refreshHelp();
          var sol = document.getElementById('worked-solution-h'); if (sol) { sol.focus(); }
        } }, 'Show a worked solution'));
      }
      var promptHolder = h('div');
      tb.appendChild(h('button', { type: 'button', class: 'quiet', onclick: function () {
        clear(promptHolder);
        promptHolder.appendChild(h('p', null, 'If you would rather ask an AI assistant, this prompt asks it to coach you instead of doing the work. Check your instructor\'s AI policy first.'));
        promptHolder.appendChild(copyBlock(tutorPrompt({ problem: B.context.story, task: B.task, plan: s.plan, code: wb.editor.get(), status: s.lastStatus }), 'A prompt for an AI tutor'));
      } }, 'Write a prompt for an AI tutor'));
      help.appendChild(tb);
      help.appendChild(promptHolder);
      if (s.solutionSeen) { renderSolution(); }
    }

    function renderSolution() {
      var box = h('div', { class: 'card', style: 'border: 2px solid var(--info)' });
      box.appendChild(h('h3', { id: 'worked-solution-h', tabindex: '-1', style: 'margin-top:0' }, 'Worked solution (treat it like AI output)'));
      box.appendChild(h('p', null, 'Read it line by line. Do not copy what you cannot explain.'));
      box.appendChild(listing(B.solution, 'Worked solution'));
      s.solutionQuiz = s.solutionQuiz || {};
      var copyBtn = h('button', { type: 'button', onclick: function () {
        if (!window.confirm('Replace your code with the worked solution? Your current code will be lost.')) { return; }
        wb.editor.set(B.solution); s.solutionCopied = true; save(); refreshHelp(); announce('Solution copied into your editor.');
      } }, 'Copy into my editor');
      function updateCopy() {
        var ok = B.solutionQuiz.every(function (q, i) { return s.solutionQuiz[i] && s.solutionQuiz[i].correct; });
        copyBtn.disabled = !ok;
        copyNote.textContent = ok ? 'You answered both questions. You may copy it, but you will still explain it in step 3.' : 'Answer both questions correctly to enable copying.';
      }
      var copyNote = h('p', { class: 'muted' });
      B.solutionQuiz.forEach(function (q, i) {
        box.appendChild(MCQ({ q: q.q, options: q.options, answer: q.answer, why: q.why, saved: s.solutionQuiz[i],
          onCheck: function (choice, ok) { s.solutionQuiz[i] = { choice: choice, correct: ok }; save(); updateCopy(); } }).el);
      });
      box.appendChild(h('div', { class: 'toolbar' }, copyBtn));
      box.appendChild(copyNote);
      updateCopy();
      help.appendChild(box);
    }

    function renderExplain() {
      clear(explainStep);
      if (!s.passed) {
        explainStep.appendChild(step(3, 'Explain your code', { locked: true, lockText: 'Unlocks when every requirement is met.' }).el);
        return;
      }
      var st = step(3, 'Explain your code', { complete: s.done });
      var id = uid('exp');
      var ta = h('textarea', { id: id, class: 'prose', rows: '6', 'aria-describedby': id + '-help' });
      ta.value = s.explanation || '';
      ta.addEventListener('input', function () { s.explanation = ta.value; save(); });
      var fb = h('div', { class: 'feedback', role: 'status' });
      st.body.appendChild(h('p', null, 'Explain how your code solves the problem, as if to a teammate or your instructor. If you used a hint or the worked solution, this is where you show you understand it.'));
      st.body.appendChild(h('label', { for: id, class: 'field' }, 'My explanation'));
      st.body.appendChild(h('p', { id: id + '-help', class: 'field-help' }, 'At least 25 words. Refer to specific lines or names in your code.'));
      st.body.appendChild(ta);
      st.body.appendChild(h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: function () {
        var code = s.passedCode || wb.editor.get();
        var r = A.analyze(code);
        var ideas = A.ideasFor(r.facts);
        var res = A.checkExplanation(ta.value, ideas);
        s.explainSubmits = (s.explainSubmits || 0) + (res.words >= 25 ? 1 : 0);
        var enough = res.words >= 25 && (res.ratio >= 0.5 || s.explainSubmits >= 2);
        explanationFeedback(fb, res, 25, enough);
        if (enough) {
          s.done = true; s.explanation = ta.value; s.explainedCode = code;
          st.el.classList.add('complete');
          announce('Build activity complete.');
        }
        save();
      } }, 'Submit explanation')));
      st.body.appendChild(fb);
      explainStep.appendChild(st.el);
    }

    refreshHelp();
    renderExplain();
    main.appendChild(h('div', { class: 'activity two-col' }, left, wb.el));
  }

  /* ---------- Read and explain ---------- */
  function viewRead(lv) {
    var R = lv.read;
    var s = lvState(lv.id).read;
    s.answers = s.answers || {};
    document.title = 'Read and explain — Level ' + lv.id + ' — ' + APP;
    page('Read and explain', [['Course map', '#/'], ['Level ' + lv.id, '#/level/' + lv.id], ['Read and explain', null]]);
    main.appendChild(activityNav(lv, 'read'));
    var left = h('div');
    left.appendChild(h('p', { class: 'lede' }, R.context));
    left.appendChild(listing(R.code, 'Code to explain'));

    var st1 = step(1, 'Explain it in your own words', { complete: !!s.submits });
    var id = uid('rexp');
    var ta = h('textarea', { id: id, class: 'prose', rows: '6', 'aria-describedby': id + '-help' });
    ta.value = s.explanation || '';
    ta.addEventListener('input', function () { s.explanation = ta.value; save(); });
    var fb = h('div', { class: 'feedback', role: 'status' });
    st1.body.appendChild(h('p', null, 'Run it first. Then say what it does and how. Pretend an AI generated this and your instructor asked you to justify it.'));
    st1.body.appendChild(h('label', { for: id, class: 'field' }, 'My explanation'));
    st1.body.appendChild(h('p', { id: id + '-help', class: 'field-help' }, 'At least 20 words. Mention what you see and which lines cause it.'));
    st1.body.appendChild(ta);
    st1.body.appendChild(h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: function () {
      var res = A.checkExplanation(ta.value, R.ideas);
      if (res.words >= 20) { s.submits = (s.submits || 0) + 1; s.coverage = res.covered.length + ' of ' + R.ideas.length; }
      explanationFeedback(fb, res, 20, res.words >= 20 && (res.ratio >= 0.75 || s.submits >= 2));
      if (res.words >= 20) { st1.el.classList.add('complete'); }
      save(); updateDone();
    } }, 'Get feedback')));
    st1.body.appendChild(fb);
    left.appendChild(st1.el);

    var st2 = step(2, 'Trace it', { complete: R.questions.every(function (q, i) { return s.answers[i] && s.answers[i].correct; }) });
    st2.body.appendChild(h('p', null, 'Answer by reading and running the code. Experiment in the workbench if it helps.'));
    R.questions.forEach(function (q, i) {
      st2.body.appendChild(MCQ({ q: q.q, options: q.options, answer: q.answer, why: q.why, saved: s.answers[i],
        onCheck: function (choice, ok) {
          s.answers[i] = { choice: choice, correct: ok, tries: ((s.answers[i] && s.answers[i].tries) || 0) + 1 };
          if (ok && s.answers[i].firstTry === undefined) { s.answers[i].firstTry = s.answers[i].tries === 1; }
          save(); updateDone();
        } }).el);
    });
    left.appendChild(st2.el);

    var st3wrap = h('div');
    left.appendChild(st3wrap);
    left.appendChild(h('details', { class: 'card no-print' }, h('summary', null, 'Want an AI to quiz you on this code?'),
      h('p', null, 'Asking an AI to quiz you, instead of explaining it for you, keeps you doing the thinking.'),
      copyBlock(tutorPrompt({ code: R.code, task: 'Understand and explain this code.', asks: ['Ask me three questions, one at a time, that check whether I understand what each part does.', 'Wait for my answer before asking the next question.', 'If I am wrong, give me a hint instead of the answer.'] }), 'A prompt that asks an AI to quiz you')));
    left.appendChild(nextLink(lv, 'read'));

    function updateDone() {
      var allRight = R.questions.every(function (q, i) { return s.answers[i] && s.answers[i].correct; });
      if (allRight) { st2.el.classList.add('complete'); }
      clear(st3wrap);
      if (s.submits && allRight) {
        if (!s.done) { s.done = true; save(); announce('Read and explain activity complete.'); }
        var st3 = step(3, 'Compare with an expert explanation', { complete: true });
        st3.body.appendChild(h('p', null, 'How does yours compare? Look for ideas you missed, or ones you explained better. You can still revise yours above.'));
        st3.body.appendChild(h('blockquote', { class: 'card', style: 'margin:0' }, R.model));
        st3wrap.appendChild(st3.el);
      } else {
        st3wrap.appendChild(step(3, 'Compare with an expert explanation', { locked: true, lockText: 'Unlocks after you submit your explanation and answer every tracing question correctly.' }).el);
      }
    }
    updateDone();

    var wb = new Workbench({ id: 'read-code', showFiles: lv.id >= 11, title: 'Workbench', code: R.code, resetCode: R.code, label: 'The code (edit it to experiment)' });
    main.appendChild(h('div', { class: 'activity two-col' }, left, wb.el));
  }

  /* ---------- Bug hunt ---------- */
  var TYPE_MISMATCH = {
    'syntax>runtime': 'The code can be read, because the sketch starts. Something fails while it runs. Check the console.',
    'syntax>logic': 'The code runs with no error at all. A syntax error would stop everything before it started.',
    'runtime>syntax': 'It never starts running: the computer can\'t even read it. Look at the console message after pressing Run.',
    'runtime>logic': 'No error message appears. It runs; it just does the wrong thing.',
    'logic>syntax': 'An error appears before anything runs. The code can\'t be read.',
    'logic>runtime': 'There is an error message while it runs. Logic errors never produce a message.'
  };
  function viewBug(lv, n) {
    var bug = lv.bugs[n];
    var s = bugState(lv.id, n);
    document.title = 'Bug hunt ' + (n + 1) + ' — Level ' + lv.id + ' — ' + APP;
    page('Bug hunt: ' + bug.title, [['Course map', '#/'], ['Level ' + lv.id, '#/level/' + lv.id], ['Bug hunt ' + (n + 1), null]]);
    main.appendChild(activityNav(lv, 'bug' + n));
    var left = h('div');
    left.appendChild(h('p', null, rating(bug.rating)));
    left.appendChild(h('div', { class: 'card context' }, h('h2', { class: 'panel-title' }, 'What the code is supposed to do'), h('p', null, bug.intent)));
    left.appendChild(h('p', null, 'Press ', h('strong', null, 'Run'), ' in the workbench and watch carefully: the preview, the console, and the error messages. Diagnose before you fix.'));
    left.appendChild(errorTypesGuide());

    var stepsWrap = h('div');
    left.appendChild(stepsWrap);
    left.appendChild(nextLink(lv, 'bug' + n));

    var currentFixFb = null;
    var wb = new Workbench({ id: 'bug-code', showFiles: lv.id >= 11, title: 'Workbench', code: s.code !== undefined ? s.code : bug.code, resetCode: bug.code, readOnly: !s.causeOk,
      label: 'The buggy code', onChange: function (code) { s.code = code; save(); },
      onEdit: function () { markStale(currentFixFb, 'You changed the code since the last check. Press Check my fix to check it again.'); },
      extraButtons: [] });

    function render() {
      clear(stepsWrap);
      // Step 1: type
      var st1 = step(1, 'What kind of error is it?', { complete: s.typeOk });
      var types = ['syntax', 'runtime', 'logic'];
      var okTypes = [bug.type].concat(bug.alsoOk || []);
      st1.body.appendChild(MCQ({ q: 'Run it, then choose:', options: types.map(function (t) { return TYPE_INFO[t].name + ': ' + TYPE_INFO[t].short; }),
        answer: okTypes.map(function (t) { return types.indexOf(t); }),
        why: types.map(function (t) {
          if (okTypes.indexOf(t) >= 0) { return t === bug.type ? TYPE_INFO[t].long : 'Accepted. ' + TYPE_INFO[bug.type].name + ' is the more common label here.'; }
          return TYPE_MISMATCH[t + '>' + bug.type];
        }),
        saved: s.typeOk ? { choice: types.indexOf(s.typeChoice), correct: true } : null,
        onCheck: function (choice, ok) {
          s.attempts.type++;
          if (ok) { s.typeOk = true; s.typeChoice = types[choice]; save(); render(); focusStep(2); } else { save(); }
        } }).el);
      stepsWrap.appendChild(st1.el);

      // Step 2: line
      if (!s.typeOk) { stepsWrap.appendChild(step(2, 'Which line is the mistake on?', { locked: true }).el); }
      else {
        var st2 = step(2, 'Which line is the mistake on?', { complete: s.lineOk });
        var name = uid('line');
        var lineFb = h('div', { class: 'feedback', role: 'status' });
        var radios = [];
        var fs = h('fieldset', null, h('legend', null, 'Choose the line you would change to fix it:'),
          h('div', { class: 'line-picker' }, bug.code.split('\n').map(function (text, i) {
            var input = h('input', { type: 'radio', name: name, value: String(i + 1), checked: s.lineChoice === i + 1 });
            radios.push(input);
            var code = h('code'); code.appendChild(highlight(text || ' '));
            return h('label', null, input, h('span', { class: 'ln' }, h('span', { class: 'visually-hidden' }, 'Line '), String(i + 1)), code);
          })));
        st2.body.appendChild(fs);
        st2.body.appendChild(h('button', { type: 'button', onclick: function () {
          var choice = 0;
          radios.forEach(function (r) { if (r.checked) { choice = +r.value; } });
          if (!choice) { feedback(lineFb, 'warn', 'Choose a line first.'); return; }
          s.lineChoice = choice;
          s.attempts.line++;
          if (bug.lines.indexOf(choice) >= 0) {
            s.lineOk = true; save();
            feedback(lineFb, 'ok', 'Yes, line ' + choice + '.', bug.lines.length > 1 ? 'The mistake involves lines ' + bug.lines.join(' and ') + '.' : null);
            render(); focusStep(3);
            return;
          }
          save();
          if (bug.near && bug.near[choice]) { feedback(lineFb, 'warn', 'Close, but not quite.', bug.near[choice]); return; }
          var hint = s.attempts.line >= 2 ? 'Hint: look between lines ' + Math.max(1, bug.lines[0] - 2) + ' and ' + Math.min(bug.code.split('\n').length, bug.lines[0] + 2) + '.' : 'Re-read the intent, then trace each line: what does it actually do?';
          feedback(lineFb, 'err', 'Line ' + choice + ' is not where the fix goes.', hint);
        } }, 'Check line'));
        st2.body.appendChild(lineFb);
        if (s.lineOk) { feedback(lineFb, 'ok', 'Yes, line ' + s.lineChoice + '.'); }
        stepsWrap.appendChild(st2.el);
      }

      // Step 3: cause
      if (!s.lineOk) { stepsWrap.appendChild(step(3, 'Why is it wrong?', { locked: true }).el); }
      else {
        var st3 = step(3, 'Why is it wrong?', { complete: s.causeOk });
        st3.body.appendChild(MCQ({ q: 'Choose the best explanation of the cause:', options: bug.causes, answer: bug.cause, why: bug.why,
          wrongHint: 'That would not explain what you saw when you ran it. Compare each option with the intent.',
          saved: s.causeOk ? { choice: bug.cause, correct: true } : null,
          onCheck: function (choice, ok) {
            s.attempts.cause++;
            if (ok) { s.causeOk = true; save(); wb.editor.setReadOnly(false); render(); focusStep(4); } else { save(); }
          } }).el);
        stepsWrap.appendChild(st3.el);
      }

      // Step 4: fix
      if (!s.causeOk) { stepsWrap.appendChild(step(4, 'Fix it', { locked: true }).el); }
      else {
        var st4 = step(4, 'Fix it', { complete: s.fixOk });
        var fixFb = h('div', { class: 'feedback', role: 'status' });
        currentFixFb = fixFb;
        st4.body.appendChild(h('p', null, 'The editor is now unlocked. Make the smallest change that fixes the problem, then check it.'));
        var showFix = h('div');
        st4.body.appendChild(h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: function () {
          var code = wb.editor.get();
          s.attempts.fix++;
          var r = A.analyze(code);
          if (!r.ok) { wb.showSyntaxError(r.syntaxError); feedback(fixFb, 'err', 'There is still a syntax error on line ' + (r.syntaxError.line || '?') + '.', r.syntaxError.friendly); save(); renderShowFix(); return; }
          var probes = (bug.fix.probes || []).map(function (p, i) { return { id: String(i), frames: p.frames, expr: p.expr }; });
          feedback(fixFb, 'info', 'Checking…');
          wb.run(probes, { quiet: true }).then(function (res) {
            var ok = !res.error;
            if (ok) { try { ok = bug.fix.test(r.facts, code); } catch (e) { ok = false; } }
            if (ok) {
              ok = (bug.fix.probes || []).every(function (p, i) { return Object.prototype.hasOwnProperty.call(res.results, String(i)) && p.test(res.results[String(i)]); });
            }
            if (ok) {
              s.fixOk = true; s.fixedCode = code; save();
              feedback(fixFb, 'ok', 'Fixed! It now does what it was supposed to.');
              render(); focusStep(5);
              announce('Fix accepted.');
            } else {
              save();
              feedback(fixFb, 'err', res.error ? 'It still has a runtime error.' : 'Not fixed yet.', res.error ? A.friendlyRuntime(res.error.message) : (bug.fix.fail || 'Run it and compare with the intent again.'));
              renderShowFix();
            }
          });
        } }, 'Check my fix')));
        st4.body.appendChild(fixFb);
        st4.body.appendChild(showFix);
        var renderShowFix = function () {
          clear(showFix);
          if (s.attempts.fix >= 2 || s.sawFix) {
            if (s.sawFix) { showFix.appendChild(h('p', null, 'One correct version:')); showFix.appendChild(listing(bug.fixed, 'A fixed version')); }
            else {
              showFix.appendChild(h('button', { type: 'button', class: 'quiet', onclick: function () { s.sawFix = true; save(); renderShowFix(); } }, 'Stuck? Show a fixed version'));
            }
          }
        };
        renderShowFix();
        if (s.fixOk) { feedback(fixFb, 'ok', 'Fixed!'); }
        stepsWrap.appendChild(st4.el);
      }

      // Step 5: explain
      if (!s.fixOk) { stepsWrap.appendChild(step(5, 'Explain the bug to a teammate', { locked: true }).el); }
      else {
        var st5 = step(5, 'Explain the bug to a teammate', { complete: s.done });
        var id = uid('bexp');
        var ta = h('textarea', { id: id, class: 'prose', rows: '4', 'aria-describedby': id + '-help' });
        ta.value = s.explanation || '';
        ta.addEventListener('input', function () { s.explanation = ta.value; save(); });
        var efb = h('div', { class: 'feedback', role: 'status' });
        st5.body.appendChild(h('label', { for: id, class: 'field' }, 'What was wrong, how did you know, and what fixed it?'));
        st5.body.appendChild(h('p', { id: id + '-help', class: 'field-help' }, 'At least 12 words, in your own words. This goes in your field journal.'));
        st5.body.appendChild(ta);
        st5.body.appendChild(h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: function () {
          if (words(ta.value) < 12) { feedback(efb, 'warn', 'At least 12 words, please (you have ' + words(ta.value) + ').'); return; }
          s.done = true; s.explanation = ta.value; save();
          st5.el.classList.add('complete');
          feedback(efb, 'ok', 'Bug hunt complete.', h('div', null, h('p', null, h('strong', null, 'Expert note: '), bug.why)));
          announce('Bug hunt complete.');
        } }, 'Save explanation')));
        st5.body.appendChild(efb);
        if (s.done) { feedback(efb, 'ok', 'Bug hunt complete.', h('div', null, h('p', null, h('strong', null, 'Expert note: '), bug.why))); }
        stepsWrap.appendChild(st5.el);
      }
    }
    function focusStep(k) {
      var heads = stepsWrap.querySelectorAll('.step > h2');
      var target = heads[k - 1];
      if (target) { target.setAttribute('tabindex', '-1'); target.focus(); }
    }
    render();
    main.appendChild(h('div', { class: 'activity two-col' }, left, wb.el));
  }

  /* ---------- Judge the AI ---------- */
  function strongerPrompt(J) {
    var lines = ['I am a beginner learning p5.js. Write a sketch that meets ALL of these requirements:'];
    J.spec.forEach(function (r, i) { lines.push((i + 1) + '. ' + r); });
    lines.push('Use only beginner features (variables, if/else, for loops, functions, arrays).');
    lines.push('Put a short comment above each section. After the code, list each requirement and the line(s) that meet it, so I can check your work.');
    return lines.join('\n');
  }
  function viewJudge(lv) {
    var J = lv.judge;
    var s = lvState(lv.id).judge;
    s.rows = s.rows || {};
    document.title = 'Judge the AI — Level ' + lv.id + ' — ' + APP;
    page('Judge the AI: ' + J.context.title, [['Course map', '#/'], ['Level ' + lv.id, '#/level/' + lv.id], ['Judge the AI', null]]);
    main.appendChild(activityNav(lv, 'judge'));
    var left = h('div');
    left.appendChild(h('div', { class: 'card context' },
      h('p', { class: 'muted', style: 'margin:0' }, h('span', { class: 'tag' }, J.context.kind), ' The spec comes first'),
      h('h2', { style: 'margin-top:0.3rem' }, 'Requirements'),
      h('ol', null, J.spec.map(function (r) { return h('li', null, r); }))));
    left.appendChild(h('h2', null, 'The prompt someone gave an AI'));
    left.appendChild(h('blockquote', { class: 'prompt' }, J.prompt));
    left.appendChild(h('p', null, 'The AI\'s code is in the workbench. Run it, read it, and test it. You can edit it to try things.' + (J.tryHint ? ' ' + J.tryHint : '')));

    var stepsWrap = h('div');
    left.appendChild(stepsWrap);
    left.appendChild(nextLink(lv, 'judge'));

    function render() {
      clear(stepsWrap);
      // Step 1: checklist
      var st1 = step(1, 'Does the code meet each requirement?', { complete: !!s.rowsChecked });
      var table = h('table', { class: 'judge-table' });
      table.appendChild(h('caption', { class: 'visually-hidden' }, 'Requirement checklist'));
      table.appendChild(h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Requirement'), h('th', { scope: 'col' }, 'Met?'))));
      var tbody = h('tbody');
      var groups = [];
      J.spec.forEach(function (req, i) {
        var name = uid('req');
        var reqId = name + '-label';
        var opts = ['yes', 'partly', 'no'].map(function (v) {
          var input = h('input', { type: 'radio', name: name, value: v, checked: s.rows[i] === v });
          return { v: v, input: input, label: h('label', null, input, v === 'yes' ? 'Yes' : v === 'partly' ? 'Partly' : 'No') };
        });
        groups.push(opts);
        var fbCell = h('div', { class: 'row-fb' });
        tbody.appendChild(h('tr', null,
          h('td', null, h('span', { id: reqId }, req), fbCell),
          h('td', { class: 'opts' }, h('div', { role: 'radiogroup', 'aria-labelledby': reqId }, opts.map(function (o) { return o.label; })))));
        groups[i].fb = fbCell;
      });
      table.appendChild(tbody);
      st1.body.appendChild(table);
      var tfb = h('div', { class: 'feedback', role: 'status' });
      function showRowFeedback() {
        var right = 0;
        J.checklist.forEach(function (c, i) {
          var pick = s.rows[i];
          var ok = pick === c.answer;
          if (ok) { right++; }
          clear(groups[i].fb);
          groups[i].fb.appendChild(h('p', { class: 'why', style: 'margin:0.3rem 0 0;color:var(--' + (ok ? 'ok' : 'err') + ')' },
            h('strong', null, ok ? '✓ Matches: ' : '✗ Expert answer: ' + (c.answer === 'yes' ? 'Yes' : c.answer === 'partly' ? 'Partly' : 'No') + '. '), h('span', { style: 'color:var(--text)' }, c.why)));
        });
        return right;
      }
      st1.body.appendChild(h('button', { type: 'button', onclick: function () {
        var missing = [];
        groups.forEach(function (g, i) { var v = null; g.forEach(function (o) { if (o.input.checked) { v = o.v; } }); s.rows[i] = v; if (!v) { missing.push(i + 1); } });
        if (missing.length) { feedback(tfb, 'warn', 'Answer every requirement first (missing: ' + missing.join(', ') + ').'); return; }
        var right = showRowFeedback();
        s.rowsChecked = true; s.rowsRight = right; save();
        feedback(tfb, right === J.spec.length ? 'ok' : 'info', 'You matched the expert review on ' + right + ' of ' + J.spec.length + ' requirements.', 'Read the notes beside each one. Where you differed, run the code again to see why.');
        st1.el.classList.add('complete');
        render(); focusStep(2);
      } }, 'Check my review'));
      st1.body.appendChild(tfb);
      if (s.rowsChecked) { showRowFeedback(); }
      stepsWrap.appendChild(st1.el);

      // Step 2: issue
      if (!s.rowsChecked) { stepsWrap.appendChild(step(2, 'What went wrong in the process?', { locked: true }).el); }
      else {
        var st2 = step(2, 'What went wrong in the process?', { complete: s.issueOk });
        st2.body.appendChild(MCQ({ q: J.issue.q, options: J.issue.options, answer: J.issue.answer, why: J.issue.why,
          saved: s.issueOk ? { choice: J.issue.answer, correct: true } : null,
          onCheck: function (c, ok) { if (ok) { s.issueOk = true; save(); render(); focusStep(3); } } }).el);
        stepsWrap.appendChild(st2.el);
      }

      // Step 3: verdict
      if (!s.issueOk) { stepsWrap.appendChild(step(3, 'Your verdict', { locked: true }).el); }
      else {
        var st3 = step(3, 'Your verdict', { complete: !!s.verdict });
        var vname = uid('verdict');
        var vopts = [['accept', 'Accept it as is'], ['revise', 'Revise it (fix it or re-prompt)'], ['reject', 'Reject it and start over']];
        var vradios = [];
        st3.body.appendChild(h('fieldset', { class: 'choices' }, h('legend', null, 'Would you use this code?'), vopts.map(function (o) {
          var input = h('input', { type: 'radio', name: vname, value: o[0], checked: s.verdict === o[0] });
          vradios.push(input);
          return h('label', null, input, h('span', null, o[1]));
        })));
        var jid = uid('just');
        var jta = h('textarea', { id: jid, class: 'prose', rows: '3' });
        jta.value = s.justification || '';
        st3.body.appendChild(h('label', { for: jid, class: 'field' }, 'Justify your decision (at least 12 words)'));
        st3.body.appendChild(jta);
        var vfb = h('div', { class: 'feedback', role: 'status' });
        var showVerdict = function () {
          var good = J.best.indexOf(s.verdict) >= 0;
          feedback(vfb, good ? 'ok' : 'warn', good ? 'Sound judgment.' : 'Consider this:', J.verdicts[s.verdict]);
        };
        st3.body.appendChild(h('button', { type: 'button', onclick: function () {
          var v = null; vradios.forEach(function (r) { if (r.checked) { v = r.value; } });
          if (!v) { feedback(vfb, 'warn', 'Choose accept, revise, or reject first.'); return; }
          if (words(jta.value) < 12) { feedback(vfb, 'warn', 'Add a justification of at least 12 words (you have ' + words(jta.value) + ').'); jta.focus(); return; }
          s.verdict = v; s.justification = jta.value; save();
          showVerdict();
          render(); focusStep(4);
        } }, 'Submit verdict'));
        st3.body.appendChild(vfb);
        if (s.verdict) { showVerdict(); }
        stepsWrap.appendChild(st3.el);
      }

      // Step 4: better prompt
      if (!s.verdict) { stepsWrap.appendChild(step(4, 'Write a better prompt', { locked: true }).el); }
      else {
        var st4 = step(4, 'Write a better prompt', { complete: s.done });
        var pid = uid('prompt');
        var pta = h('textarea', { id: pid, class: 'prose', rows: '5', 'aria-describedby': pid + '-help' });
        pta.value = s.prompt || '';
        pta.addEventListener('input', function () { s.prompt = pta.value; save(); });
        st4.body.appendChild(h('label', { for: pid, class: 'field' }, 'Rewrite the prompt so an AI would meet the spec'));
        st4.body.appendChild(h('p', { id: pid + '-help', class: 'field-help' }, 'At least 15 words. Good prompts state the requirements, the constraints, and how you will check the result.'));
        st4.body.appendChild(pta);
        var pfb = h('div', { class: 'feedback', role: 'status' });
        var modelWrap = h('div');
        st4.body.appendChild(h('button', { type: 'button', onclick: function () {
          var res = A.checkExplanation(pta.value, J.promptIdeas);
          s.promptSubmits = (s.promptSubmits || 0) + (res.words >= 15 ? 1 : 0);
          var enough = res.words >= 15 && (res.ratio >= 0.5 || s.promptSubmits >= 2);
          explanationFeedback(pfb, res, 15, enough);
          if (enough) {
            s.done = true; s.prompt = pta.value; save();
            st4.el.classList.add('complete');
            showModel();
            announce('Judge the AI activity complete.');
          }
          save();
        } }, 'Check my prompt'));
        st4.body.appendChild(pfb);
        st4.body.appendChild(modelWrap);
        var showModel = function () {
          clear(modelWrap);
          modelWrap.appendChild(h('h3', null, 'One strong version'));
          modelWrap.appendChild(h('blockquote', { class: 'prompt', style: 'white-space:pre-wrap' }, strongerPrompt(J)));
          modelWrap.appendChild(h('p', null, 'Even with a great prompt, you still run it, test it against the spec, and make sure you can explain it.'));
        };
        if (s.done) { showModel(); }
        stepsWrap.appendChild(st4.el);
      }
    }
    function focusStep(k) {
      var heads = stepsWrap.querySelectorAll('.step > h2');
      var t = heads[k - 1];
      if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
    }
    render();
    var wb = new Workbench({ id: 'judge-code', showFiles: lv.id >= 11, title: 'The AI\'s code', code: J.aiCode, resetCode: J.aiCode, label: 'AI-generated code (edit it to test)' });
    main.appendChild(h('div', { class: 'activity two-col' }, left, wb.el));
  }

  /* ---------- Capstone ---------- */
  function viewCapstone() {
    var s = state.capstone = state.capstone || {};
    s.plan = s.plan || {};
    s.helpPlan = s.helpPlan || {};
    document.title = 'Final project — ' + APP;
    page(CAP.title, [['Course map', '#/'], ['Final project', null]]);
    main.appendChild(h('p', { class: 'lede' }, 'This time you define the problem, design the system, and decide where help belongs, then build it, explain it, and document how you used AI. This is how professionals work with AI: the thinking and the responsibility stay with you.'));
    var fw = finalWeek();
    if (fw) { main.appendChild(h('p', null, (COURSE.code ? COURSE.code + ', ' : ''), h('a', { href: '#/week/' + fw.week }, weekLabel(fw)), '. Your project will be due by the date on the syllabus.')); }
    var left = h('div');
    var stepsWrap = h('div');
    left.appendChild(stepsWrap);
    var checkBtn = h('button', { type: 'button', onclick: function () { checkWork(); } }, 'Check my work');
    var wb = new Workbench({ id: 'cap-code', showFiles: true, title: 'Workbench', code: s.code !== undefined ? s.code : CAP.starter, resetCode: CAP.starter, label: 'Your project code', extraButtons: [checkBtn], minRows: 14,
      onChange: function (c) { s.code = c; save(); } });
    var checksResults = s.lastResults || null;

    function textField(labelText, key, store, rows, help) {
      var id = uid('cap');
      var ta = h('textarea', { id: id, class: 'prose', rows: String(rows || 3), 'aria-describedby': help ? id + '-help' : null });
      ta.value = store[key] || '';
      ta.addEventListener('input', function () { store[key] = ta.value; save(); });
      return h('div', null, h('label', { for: id, class: 'field' }, labelText), help ? h('p', { id: id + '-help', class: 'field-help' }, help) : null, ta);
    }

    function checkWork() {
      var code = wb.editor.get();
      var r = A.analyze(code);
      if (!r.ok) { wb.showSyntaxError(r.syntaxError); return; }
      var results = CAP.checks.map(function (c) { return c.runtime ? null : !!c.test(r.facts, code); });
      var probes = [];
      CAP.checks.forEach(function (c, i) { if (c.runtime) { probes.push({ id: String(i), frames: c.frames, expr: c.expr(r.facts) }); } });
      wb.run(probes, { quiet: true }).then(function (res) {
        CAP.checks.forEach(function (c, i) {
          if (!c.runtime) { return; }
          results[i] = !res.error && Object.prototype.hasOwnProperty.call(res.results, String(i)) && c.test(res.results[String(i)]);
        });
        checksResults = results; s.lastResults = results;
        s.passed = results.every(function (x) { return x === true; });
        if (s.passed) { s.passedCode = code; }
        save(); render();
        announce(results.filter(function (x) { return x; }).length + ' of ' + results.length + ' checks met.');
      });
    }

    function render() {
      clear(stepsWrap);
      // 1. choose
      var st1 = step(1, 'Choose a problem', { complete: !!s.brief });
      var bname = uid('brief');
      var bradios = [];
      st1.body.appendChild(h('fieldset', { class: 'choices' }, h('legend', null, 'Pick one brief:'), CAP.briefs.map(function (b) {
        var input = h('input', { type: 'radio', name: bname, value: b.id, checked: s.brief === b.id });
        bradios.push(input);
        return h('label', null, input, h('span', null, h('strong', null, b.kind + ': ' + b.title + '. '), b.story));
      })));
      st1.body.appendChild(h('button', { type: 'button', onclick: function () {
        var v = null; bradios.forEach(function (r) { if (r.checked) { v = r.value; } });
        if (!v) { return; }
        s.brief = v; save(); render(); focusStep(2);
      } }, 'Choose this problem'));
      stepsWrap.appendChild(st1.el);

      // 2. design
      if (!s.brief) { stepsWrap.appendChild(step(2, 'Design the system', { locked: true }).el); }
      else {
        var st2 = step(2, 'Design the system', { complete: !!s.planSaved });
        var pfb = h('div', { class: 'feedback', role: 'status' });
        st2.body.appendChild(h('p', null, 'Before any code: what must it do, what does it remember, and how is it organized?'));
        st2.body.appendChild(textField('Requirements: one per line, at least 3', 'requirements', s.plan, 5, 'Write each as something you could test: "When stock is below 5, show the text LOW."'));
        st2.body.appendChild(textField('Inputs: what can the user do?', 'inputs', s.plan, 2));
        st2.body.appendChild(textField('State: what must the program remember? (these become variables or arrays)', 'state', s.plan, 2));
        st2.body.appendChild(textField('Outputs: what does the user see?', 'outputs', s.plan, 2));
        st2.body.appendChild(textField('Functions: name and purpose of each one you plan to write', 'functions', s.plan, 3, 'For example: drawItem(item, y): draws one pantry item and its count.'));
        st2.body.appendChild(h('button', { type: 'button', onclick: function () {
          var reqs = (s.plan.requirements || '').split('\n').filter(function (l) { return words(l) >= 2; });
          var thin = ['inputs', 'state', 'outputs', 'functions'].filter(function (k) { return words(s.plan[k]) < 3; });
          if (reqs.length < 3 || thin.length) { feedback(pfb, 'warn', 'Your design needs at least 3 requirements and a few words in every box.'); return; }
          s.planSaved = true; save(); render(); focusStep(3);
        } }, 'Save design'));
        st2.body.appendChild(pfb);
        stepsWrap.appendChild(st2.el);
      }

      // 3. help plan
      if (!s.planSaved) { stepsWrap.appendChild(step(3, 'Decide where help belongs', { locked: true }).el); }
      else {
        var st3 = step(3, 'Decide where help belongs', { complete: !!s.helpSaved });
        var reqs = (s.plan.requirements || '').split('\n').filter(function (l) { return l.trim(); });
        st3.body.appendChild(h('p', null, 'For each requirement, decide how you will approach it. There is no wrong answer, but you must be able to explain every line you submit.'));
        var selects = reqs.map(function (r, i) {
          var id = uid('hp');
          var sel = h('select', { id: id }, [['self', 'I will write it myself'], ['hints', 'I will try, then ask for hints'], ['draft', 'I will ask an AI for a draft, then review and test it']].map(function (o) {
            return h('option', { value: o[0] }, o[1]);
          }));
          sel.value = s.helpPlan[i] || 'self';
          sel.addEventListener('change', function () { s.helpPlan[i] = sel.value; save(); });
          return h('div', null, h('label', { for: id, class: 'field' }, (i + 1) + '. ' + r), sel);
        });
        st3.body.appendChild(h('div', null, selects));
        st3.body.appendChild(textField('If you will use AI: the exact prompt you plan to use', 'aiPrompt', s, 4, 'Include your requirements and ask for beginner-level code with comments. Leave blank if you will not use AI.'));
        var pledgeId = uid('pledge');
        var pledge = h('input', { type: 'checkbox', id: pledgeId, checked: !!s.pledge });
        st3.body.appendChild(h('p', null, h('label', { for: pledgeId, style: 'display:flex;gap:0.5rem;align-items:flex-start;cursor:pointer' }, pledge, h('span', null, 'I will only submit code I can explain line by line, and I will disclose any AI help.'))));
        var hfb = h('div', { class: 'feedback', role: 'status' });
        st3.body.appendChild(h('button', { type: 'button', onclick: function () {
          if (!pledge.checked) { feedback(hfb, 'warn', 'Check the box to commit to explaining and disclosing your work.'); return; }
          s.pledge = true; s.helpSaved = true;
          reqs.forEach(function (r, i) { if (!s.helpPlan[i]) { s.helpPlan[i] = 'self'; } });
          save(); render(); focusStep(4);
        } }, 'Save help plan'));
        st3.body.appendChild(hfb);
        stepsWrap.appendChild(st3.el);
      }

      // 4. build
      if (!s.helpSaved) { stepsWrap.appendChild(step(4, 'Build it', { locked: true }).el); }
      else {
        var st4 = step(4, 'Build it', { complete: !!s.passed });
        st4.body.appendChild(h('p', null, 'Build in the workbench. These checks are the minimum; your own requirements from step 2 matter more.'));
        var list = h('ul', { class: 'checks' });
        CAP.checks.forEach(function (c, i) {
          var r = checksResults ? checksResults[i] : null;
          var mark = r === null ? ['unk', 'Not checked'] : r ? ['ok', '✓ Met'] : ['no', '✗ Not yet'];
          list.appendChild(h('li', null, h('span', { class: 'mark ' + mark[0] }, mark[1]), h('span', null, c.label)));
        });
        st4.body.appendChild(list);
        var reqs2 = (s.plan.requirements || '').split('\n').filter(function (l) { return l.trim(); });
        st4.body.appendChild(h('h3', null, 'Your requirements'));
        st4.body.appendChild(h('ol', null, reqs2.map(function (r) { return h('li', null, r); })));
        stepsWrap.appendChild(st4.el);
      }

      // 5. explain and disclose (follows the course AI policy)
      if (!s.passed) { stepsWrap.appendChild(step(5, 'Explain and disclose', { locked: true, lockText: 'Unlocks when the build checks pass.' }).el); }
      else {
        var ai = COURSE.ai || {};
        var st5 = step(5, 'Explain and disclose', { complete: !!s.done });
        st5.body.appendChild(textField('Walk through how your system works (at least 60 words)', 'walkthrough', s, 7, 'Cover the state, each class and function, the decisions, and the interaction. Refer to names in your code.'));
        st5.body.appendChild(textField('Which of your requirements did you test, and how?', 'testing', s, 3));
        st5.body.appendChild(textField('What would you improve next?', 'improve', s, 2));
        st5.body.appendChild(textField('Worked with', 'workedWith', s, 1, (ai.collaboration || 'Credit anyone you worked with.') + ' Write "no one" if you worked alone.'));

        st5.body.appendChild(h('h3', null, 'AI use declaration'));
        if (ai.expectation) { st5.body.appendChild(h('p', null, ai.expectation)); }
        s.aiPurposes = s.aiPurposes || [];
        var noneId = uid('noai');
        var noneBox = h('input', { type: 'checkbox', id: noneId, checked: !!s.noAI });
        var purposeBoxes = (ai.purposes || []).map(function (pz) {
          var id = uid('purpose');
          var box = h('input', { type: 'checkbox', id: id, value: pz, checked: s.aiPurposes.indexOf(pz) >= 0 });
          return { box: box, label: h('label', { for: id }, box, h('span', null, pz)) };
        });
        st5.body.appendChild(h('fieldset', { class: 'choices' }, h('legend', null, 'What did you use generative AI for? Check all that apply.'),
          purposeBoxes.map(function (pb) { return pb.label; }),
          h('label', { for: noneId }, noneBox, h('span', null, 'I did not use generative AI for this project'))));
        var declEl = h('blockquote', { class: 'card', style: 'margin:0.5rem 0' });
        var aiDetails = h('div');
        function updateDeclaration() {
          s.aiPurposes = purposeBoxes.filter(function (pb) { return pb.box.checked; }).map(function (pb) { return pb.box.value; });
          s.noAI = noneBox.checked;
          if (s.noAI) { purposeBoxes.forEach(function (pb) { pb.box.checked = false; }); s.aiPurposes = []; }
          save();
          clear(declEl);
          if (s.aiPurposes.length) {
            declEl.appendChild(document.createTextNode(declarationText(s)));
            aiDetails.hidden = false;
          } else {
            declEl.appendChild(document.createTextNode(s.noAI ? 'No generative AI tools were used in this project.' : 'Check what you used AI for, or that you did not use it.'));
            aiDetails.hidden = true;
          }
        }
        purposeBoxes.forEach(function (pb) { pb.box.addEventListener('change', function () { if (pb.box.checked) { noneBox.checked = false; } updateDeclaration(); }); });
        noneBox.addEventListener('change', updateDeclaration);
        st5.body.appendChild(h('p', null, 'Your declaration (included in your field journal):'));
        st5.body.appendChild(declEl);

        aiDetails.appendChild(textField('Which parts of your project were AI-assisted, and what did you change or verify?', 'disclosureDetail', s, 3, 'Name the features, functions, or lines. Say what you kept, changed, or rejected, and how you tested it.'));
        aiDetails.appendChild(textField('Reflection: how useful was the AI, where did it fall short, and did you notice any inaccuracies, bias, or ethical concerns?', 'aiReflection', s, 4, 'At least 25 words.'));
        s.aiChecklist = s.aiChecklist || {};
        var checkBoxes = (ai.checklist || []).map(function (item, i) {
          var id = uid('aichk');
          var box = h('input', { type: 'checkbox', id: id, checked: !!s.aiChecklist[i] });
          box.addEventListener('change', function () { s.aiChecklist[i] = box.checked; save(); });
          return { box: box, label: h('label', { for: id }, box, h('span', null, item)) };
        });
        aiDetails.appendChild(h('fieldset', { class: 'choices' }, h('legend', null, 'Responsible AI use checklist'), checkBoxes.map(function (c) { return c.label; })));
        st5.body.appendChild(aiDetails);
        updateDeclaration();

        var efb = h('div', { class: 'feedback', role: 'status' });
        st5.body.appendChild(h('button', { type: 'button', onclick: function () {
          var r = A.analyze(s.passedCode || wb.editor.get());
          var res = A.checkExplanation(s.walkthrough, A.ideasFor(r.facts));
          if (res.words < 60) { feedback(efb, 'warn', 'The walkthrough needs at least 60 words (you have ' + res.words + ').'); return; }
          if (words(s.workedWith) < 1) { feedback(efb, 'warn', 'Fill in "Worked with" (write "no one" if you worked alone).'); return; }
          if (!s.noAI && !s.aiPurposes.length) { feedback(efb, 'warn', 'Complete the AI use declaration: check what you used AI for, or that you did not use it.'); return; }
          if (s.aiPurposes.length) {
            if (words(s.disclosureDetail) < 8) { feedback(efb, 'warn', 'Describe which parts were AI-assisted and what you changed or verified (at least 8 words).'); return; }
            if (words(s.aiReflection) < 25) { feedback(efb, 'warn', 'The reflection needs at least 25 words (you have ' + words(s.aiReflection) + ').'); return; }
            if (!checkBoxes.every(function (c) { return c.box.checked; })) { feedback(efb, 'warn', 'Work through every item on the responsible AI use checklist before submitting.'); return; }
          }
          s.done = true; s.explainedCode = s.passedCode || wb.editor.get(); save();
          explanationFeedback(efb, res, 60, true);
          st5.el.classList.add('complete');
          announce('Final project complete. Download your field journal to submit it.');
          efb.appendChild(h('p', null, h('a', { href: '#/journal' }, 'Open your field journal to download or print your work')));
        } }, 'Submit final project'));
        st5.body.appendChild(efb);
        stepsWrap.appendChild(st5.el);
      }
    }
    function focusStep(k) {
      var heads = stepsWrap.querySelectorAll('.step > h2');
      var t = heads[k - 1];
      if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
    }
    render();
    main.appendChild(h('div', { class: 'activity two-col' }, left, wb.el));
  }

  /* ---------- Studio ---------- */
  function viewStudio() {
    document.title = 'Studio — ' + APP;
    page('Studio', [['Course map', '#/'], ['Studio', null]]);
    var starter = '// Your own sketch. Run it, then press "Explain my code".\nfunction setup() {\n  createCanvas(400, 400);\n}\n\nfunction draw() {\n  background(239, 232, 212);\n  circle(mouseX, mouseY, 40);\n}\n';
    var s = state.studio = state.studio || {};
    var left = h('div');
    left.appendChild(h('p', { class: 'lede' }, 'A free space to experiment. Paste in code from anywhere, including an AI, and use "Explain my code" to get a plain-language description and suggestions.'));
    left.appendChild(h('div', { class: 'card' }, h('h2', { class: 'panel-title' }, 'Questions to ask about any code'),
      h('ul', null,
        h('li', null, 'What does it draw first? What changes every frame?'),
        h('li', null, 'What does each variable remember? Who changes it?'),
        h('li', null, 'Which line would I change to make it bigger, faster, or a different color?'),
        h('li', null, 'Is there anything here I could not explain to my instructor?'))));
    var promptHolder = h('div');
    left.appendChild(h('div', { class: 'card' }, h('h2', { class: 'panel-title' }, 'Ask an AI for a review (not a rewrite)'),
      h('p', null, 'This prompt asks an AI to critique your code without rewriting it, so you stay the author.'),
      h('button', { type: 'button', class: 'secondary', onclick: function () {
        clear(promptHolder);
        promptHolder.appendChild(copyBlock(tutorPrompt({ code: wb.editor.get(), task: 'Get feedback on my sketch.', asks: ['Describe in plain language what my sketch does.', 'List up to three improvements (readability, naming, structure, accessibility), and explain why each matters.', 'Do not rewrite my code. Point to line numbers instead.'] }), 'A review prompt'));
      } }, 'Write the prompt'), promptHolder));
    var wb = new Workbench({ id: 'studio-code', showFiles: true, title: 'Workbench', code: s.code || starter, resetCode: starter, label: 'Your code', minRows: 14, onChange: function (c) { s.code = c; save(); } });
    main.appendChild(h('div', { class: 'activity two-col' }, left, wb.el));
  }

  /* ---------- Guide ---------- */
  function viewGuide() {
    document.title = 'Using AI well — ' + APP;
    page('Using AI well while learning to code', [['Course map', '#/'], ['Using AI well', null]]);
    main.appendChild(h('p', { class: 'lede' }, 'AI assistants can write code. Your job is to know what the code should do, judge whether it does it, and explain why. That is what this trail practices.'));
    var ai = COURSE.ai;
    if (ai) {
      main.appendChild(h('section', { class: 'card', 'aria-labelledby': 'policy-h', style: 'border-left: 6px solid var(--copper-climb)' },
        h('h2', { id: 'policy-h', class: 'panel-title' }, (COURSE.code ? COURSE.code + ' ' : '') + 'AI policy in brief'),
        h('p', null, ai.expectation),
        h('dl', { class: 'terms' }, ai.policy.map(function (pp) { return [h('dt', null, pp[0]), h('dd', null, pp[1])]; })),
        h('p', null, h('strong', null, 'Student AI Use Declaration. '), 'Include this with every assignment where you used generative AI:'),
        h('blockquote', { class: 'prompt' }, ai.declaration.replace('{purposes}', '[for example: brainstorming, drafting, editing, coding]')),
        h('p', null, h('strong', null, 'Before you submit, make sure that:')),
        h('ul', null, ai.checklist.map(function (c) { return h('li', null, c); })),
        h('p', null, ai.collaboration),
        h('p', { class: 'muted' }, 'This is a summary. The syllabus is the official version.')));
    } else {
      main.appendChild(h('p', null, h('strong', null, 'Always follow your instructor\'s policy. '), 'Some assignments allow AI help, and some do not. When in doubt, ask.'));
    }
    var steps = [
      ['Understand the problem first', 'Who is it for? What should happen? What counts as done? Write the requirements down before you touch code. You cannot judge code against a goal you never defined.'],
      ['Try it yourself', 'Even a broken attempt shows you exactly what you are stuck on. That makes any help, from a person or an AI, much more useful.'],
      ['Ask well', 'Include the requirements, your code, what happens, and what you want: a hint, a question, or a review. "Don\'t write the solution" is a perfectly good instruction.'],
      ['Verify everything', 'Run it. Test boundaries (9, 10, 11). Compare against every requirement. "No errors" only means no syntax or runtime errors; logic errors are silent.'],
      ['Explain it', 'If you cannot explain a line, you do not own it yet. Ask for a simpler version, or learn the new part, before you use it.'],
      ['Disclose it', 'Say what help you used and what you changed. That is honest, and it is how professionals work.']
    ];
    main.appendChild(h('ol', null, steps.map(function (s) { return h('li', null, h('strong', null, s[0] + '. '), s[1]); })));

    main.appendChild(h('h2', null, 'Weak prompt vs. strong prompt'));
    main.appendChild(h('div', { class: 'grid steps-grid' },
      h('div', { class: 'card' }, h('h3', null, 'Weak'), h('blockquote', { class: 'prompt' }, 'make a bouncing ball in p5'), h('p', null, 'No size, no rules about edges, no way to check it, and the AI will happily use code you have never seen.')),
      h('div', { class: 'card' }, h('h3', null, 'Strong'), h('blockquote', { class: 'prompt' }, 'I\'m learning p5.js. Here is my bouncing-ball code. The ball goes off the left edge after a few seconds. Don\'t fix it for me. Ask me a question that helps me find the bug, and tell me which line to look at.'), h('p', null, 'States the goal and the symptom, shares the code, and asks for coaching instead of an answer.'))));

    main.appendChild(h('h2', null, 'The three kinds of errors'));
    main.appendChild(h('dl', { class: 'terms' }, ['syntax', 'runtime', 'logic'].map(function (k) { return [h('dt', null, TYPE_INFO[k].name), h('dd', null, TYPE_INFO[k].long)]; })));
    main.appendChild(h('p', null, 'AI-written code usually has correct syntax. Its mistakes are mostly logic errors, and the requirements it was never told about. That is why judging code against a spec matters so much.'));

    main.appendChild(h('h2', null, 'How help works in this trail'));
    main.appendChild(h('ul', null,
      h('li', null, 'Help unlocks after an honest attempt: a saved plan and one check of your work.'),
      h('li', null, 'Hints come one at a time: a nudge, then the concept, then a partial skeleton.'),
      h('li', null, 'A full worked solution comes last. Before you can copy it, you answer questions about it, and you still explain your final code.'),
      h('li', null, 'Help is never a penalty. It is recorded in your field journal so you, and your instructor, can see how you learned.'),
      h('li', null, 'Code feedback in this app comes from rules, not an AI, and never leaves your browser.')));
  }

  function declarationText(c) {
    var ai = COURSE.ai || {};
    if (c.noAI) { return 'No generative AI tools were used in this project.'; }
    var list = (c.aiPurposes || []).slice();
    var joined = list.length > 1 ? list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1] : list.join('');
    return (ai.declaration || 'This assignment involves using generative AI tools for the following purposes: {purposes}.').replace('{purposes}', joined);
  }

  /* ---------- Field journal ---------- */
  function assistText(b) {
    if (!b) { return 'not started'; }
    if (b.solutionCopied) { return 'worked solution copied (after answering questions about it)'; }
    if (b.solutionSeen) { return 'worked solution viewed'; }
    if (b.hints) { return b.hints + ' hint' + (b.hints === 1 ? '' : 's'); }
    return b.done || b.passed ? 'no help used' : 'no help used yet';
  }
  function journalData() {
    var out = [];
    LEVELS.forEach(function (lv) {
      var s = lvState(lv.id);
      var p = levelProgress(lv);
      var entries = [];
      if (s.learn.predicted) { entries.push(['Learn: prediction', (s.learn.choice === lv.learn.predict.answer ? 'Correct' : 'Incorrect, then checked by running') + ': "' + lv.learn.predict.options[s.learn.choice] + '"']); }
      if (s.build.planSaved) { entries.push(['Build plan', PLAN_PROMPTS.map(function (q, i) { return '• ' + q + '\n  ' + (s.build.plan[i] || ''); }).join('\n')]); }
      if (s.build.passed) { entries.push(['Build result', 'All requirements met after ' + (s.build.checks || 0) + ' check' + (s.build.checks === 1 ? '' : 's') + '. Help used: ' + assistText(s.build) + '.']); }
      if (s.build.done) { entries.push(['Build: my explanation', s.build.explanation]); entries.push(['Build: final code', s.build.explainedCode || s.build.passedCode || '']); }
      if (s.read.submits) { entries.push(['Read and explain: my explanation (' + (s.read.coverage || '') + ' key ideas)', s.read.explanation || '']); }
      lv.bugs.forEach(function (b, i) {
        var bs = s.bugs[i];
        if (bs && bs.done) {
          var tries = bs.attempts;
          entries.push(['Bug hunt ' + (i + 1) + ' (' + b.title + ', ' + TYPE_INFO[b.type].name.toLowerCase() + ')', bs.explanation + '\n(Attempts: type ' + tries.type + ', line ' + tries.line + ', cause ' + tries.cause + ', fix ' + tries.fix + (bs.sawFix ? '; viewed a fixed version' : '') + ')']);
        }
      });
      if (lv.judge && s.judge.rowsChecked) {
        entries.push(['Judge the AI: review', 'Matched the expert review on ' + s.judge.rowsRight + ' of ' + lv.judge.spec.length + ' requirements.']);
        if (s.judge.verdict) { entries.push(['Judge the AI: verdict (' + s.judge.verdict + ')', s.judge.justification || '']); }
        if (s.judge.done) { entries.push(['Judge the AI: my improved prompt', s.judge.prompt || '']); }
      }
      out.push({ title: 'Level ' + lv.id + ': ' + lv.title, progress: p.done + ' of ' + p.total + ' activities complete', entries: entries });
    });
    var c = state.capstone || {};
    var ce = [];
    if (c.brief) { var b = CAP.briefs.filter(function (x) { return x.id === c.brief; })[0]; ce.push(['Problem', b ? b.kind + ': ' + b.title : c.brief]); }
    if (c.planSaved) {
      ce.push(['Requirements', c.plan.requirements || '']);
      ce.push(['Inputs / State / Outputs', 'Inputs: ' + (c.plan.inputs || '') + '\nState: ' + (c.plan.state || '') + '\nOutputs: ' + (c.plan.outputs || '')]);
      ce.push(['Planned functions', c.plan.functions || '']);
    }
    if (c.helpSaved) {
      var labels = { self: 'write myself', hints: 'try, then ask for hints', draft: 'AI draft, then review and test' };
      var reqs = (c.plan.requirements || '').split('\n').filter(function (l) { return l.trim(); });
      ce.push(['Help plan', reqs.map(function (r, i) { return '• ' + r + ': ' + labels[c.helpPlan[i] || 'self']; }).join('\n') + (c.aiPrompt ? '\nPlanned AI prompt: ' + c.aiPrompt : '')]);
    }
    if (c.done) {
      ce.push(['Walkthrough', c.walkthrough || '']);
      ce.push(['Testing', c.testing || '']);
      ce.push(['Next improvement', c.improve || '']);
      ce.push(['Worked with', c.workedWith || '']);
      if (c.noAI || (c.aiPurposes && c.aiPurposes.length)) {
        ce.push(['Student AI Use Declaration', declarationText(c)]);
        if (c.aiPurposes && c.aiPurposes.length) {
          ce.push(['AI-assisted parts and what I changed', c.disclosureDetail || '']);
          ce.push(['Reflection on AI use', c.aiReflection || '']);
          ce.push(['Responsible AI use checklist', ((COURSE.ai || {}).checklist || []).map(function (item, i) { return (c.aiChecklist && c.aiChecklist[i] ? '[x] ' : '[ ] ') + item; }).join('\n')]);
        }
      } else if (c.disclosure) {
        ce.push(['AI and help disclosure', ({ none: 'No AI or hints used.', hints: 'Used hints or an AI tutor; wrote the code myself.', drafts: 'Some code started as AI drafts that I reviewed and changed.' })[c.disclosure] + (c.disclosureDetail ? '\n' + c.disclosureDetail : '')]);
      }
      ce.push(['Final code', c.explainedCode || '']);
    }
    out.push({ title: CAP.title, progress: c.done ? 'Complete' : 'Not complete', entries: ce });
    return out;
  }
  function journalText() {
    var lines = ['p5.js Code Trail: Field Journal', 'Name: ' + (state.name || ''), 'Course: ' + (state.course || COURSE.code || ''), 'Exported: ' + new Date().toLocaleString(), ''];
    journalData().forEach(function (sec) {
      lines.push('== ' + sec.title + ' (' + sec.progress + ') ==');
      if (!sec.entries.length) { lines.push('(nothing yet)'); }
      sec.entries.forEach(function (e) { lines.push('', '-- ' + e[0] + ' --', e[1] || ''); });
      lines.push('');
    });
    return lines.join('\n');
  }
  function viewJournal() {
    document.title = 'Field journal — ' + APP;
    page('Field journal', [['Course map', '#/'], ['Field journal', null]]);
    main.appendChild(h('p', { class: 'lede' }, 'Everything you planned, explained, and decided, in one place. Download it or print it to share with your instructor.'));
    var nameId = uid('name'), courseId = uid('course');
    var nameIn = h('input', { type: 'text', id: nameId, autocomplete: 'name' }); nameIn.value = state.name || '';
    var courseIn = h('input', { type: 'text', id: courseId }); courseIn.value = state.course || COURSE.code || '';
    nameIn.addEventListener('input', function () { state.name = nameIn.value; save(); });
    courseIn.addEventListener('input', function () { state.course = courseIn.value; save(); });
    main.appendChild(h('div', { class: 'card no-print grid', style: 'grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))' },
      h('div', null, h('label', { for: nameId, class: 'field' }, 'Your name'), nameIn),
      h('div', null, h('label', { for: courseId, class: 'field' }, 'Course and section'), courseIn)));
    var dlStatus = h('span', { role: 'status', class: 'muted' });
    main.appendChild(h('div', { class: 'toolbar no-print' },
      h('button', { type: 'button', onclick: function () {
        var blob = new Blob([journalText()], { type: 'text/plain' });
        // Course naming style: MART220LastNameCodeTrail.txt
        var last = (state.name || '').trim().split(/\s+/).pop().replace(/[^\w-]+/g, '');
        var file = (COURSE.code ? COURSE.code.replace(/\s+/g, '') : 'p5') + (last || '') + 'CodeTrail.txt';
        var a = h('a', { href: URL.createObjectURL(blob), download: file });
        document.body.appendChild(a); a.click(); a.remove();
        dlStatus.textContent = 'Journal downloaded as ' + file + '.';
      } }, 'Download journal (.txt)'),
      h('button', { type: 'button', class: 'secondary', onclick: function () { window.print(); } }, 'Print or save as PDF'),
      h('button', { type: 'button', class: 'quiet', onclick: function () {
        if (!window.confirm('Erase all progress in this browser? This cannot be undone. Download your journal first if you need it.')) { return; }
        var theme = state.theme;
        state = blank(); state.theme = theme; save();
        try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
        route();
        announce('All progress erased.');
      } }, 'Reset all progress'),
      dlStatus));
    main.appendChild(h('p', { class: 'print-only muted' }, (state.name ? 'Name: ' + state.name + '. ' : '') + (state.course ? 'Course: ' + state.course + '.' : '')));
    journalData().forEach(function (sec) {
      var card = h('section', { class: 'card journal-level' }, h('h2', { class: 'panel-title' }, sec.title), h('p', { class: 'muted' }, sec.progress));
      if (!sec.entries.length) { card.appendChild(h('p', null, 'Nothing recorded yet.')); }
      sec.entries.forEach(function (e) {
        var isCode = /code$/i.test(e[0]);
        card.appendChild(h('div', { class: 'journal-entry' }, h('h3', { class: 'q' }, e[0]), isCode ? listing(e[1] || '', e[0]) : h('p', { class: 'a' }, e[1] || '')));
      });
      main.appendChild(card);
    });
  }

  /* ================================================================
   * Router
   * ================================================================ */
  var firstRoute = true;
  function route() {
    stopAllRunners();
    current = null;
    var hash = (location.hash || '#/').replace(/^#/, '');
    var parts = hash.split('/').filter(Boolean);
    var nav = 'home';
    try {
      if (!parts.length) { viewHome(); }
      else if (parts[0] === 'week') {
        var wk = COURSE.weeks.filter(function (x) { return x.week === +parts[1]; })[0];
        if (wk) { viewWeek(wk); } else { viewHome(); }
      }
      else if (parts[0] === 'level') {
        var lv = levelById(+parts[1]);
        if (!lv) { viewHome(); }
        else if (!parts[2]) { viewLevel(lv); }
        else if (parts[2] === 'learn') { viewLearn(lv); }
        else if (parts[2] === 'build') { viewBuild(lv); }
        else if (parts[2] === 'read') { viewRead(lv); }
        else if (parts[2] === 'judge' && lv.judge) { viewJudge(lv); }
        else if (parts[2] === 'bug' && lv.bugs[(+parts[3] || 0) - 1]) { viewBug(lv, +parts[3] - 1); }
        else { viewLevel(lv); }
      }
      else if (parts[0] === 'capstone') { viewCapstone(); }
      else if (parts[0] === 'studio') { viewStudio(); nav = 'studio'; }
      else if (parts[0] === 'guide') { viewGuide(); nav = 'guide'; }
      else if (parts[0] === 'journal') { viewJournal(); nav = 'journal'; }
      else { viewHome(); }
    } catch (e) {
      clear(main);
      main.appendChild(h('h1', { tabindex: '-1' }, 'Something went wrong'));
      main.appendChild(h('p', null, 'This page could not be displayed. ', h('a', { href: '#/' }, 'Return to the trail map'), '.'));
      if (window.console) { console.error(e); }
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      if (a.getAttribute('data-nav') === nav) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
    if (!firstRoute) {
      var h1 = main.querySelector('h1');
      if (h1) { h1.focus(); }
      window.scrollTo(0, 0);
    }
    firstRoute = false;
  }

  initTheme();
  window.addEventListener('hashchange', route);
  route();
})();
