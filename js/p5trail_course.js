/* p5.js Code Trail — MART 220 course map, project files, and Levels 11–18.
 *
 * Levels 1–10 (js/p5trail_levels.js) are a Creative Coding 1 refresher.
 * The levels here follow the MART 220 syllabus (Weeks 4–13). Unity (Weeks 14–15)
 * is intentionally not covered.
 *
 * Instructors: change COURSE.weeks to move levels between weeks. Run
 * `node tools/p5trail_validate.js` after editing levels.
 */
(function (root) {
  'use strict';

  var base = root.P5TrailLevels || (typeof require === 'function' ? require('./p5trail_levels.js') : null);
  var H = base.helpers;
  var C = H.C;
  var PLAN = base.PLAN;

  /* ================================================================
   * Project files. Sketches can load these by path (for example
   * loadImage('assets/bear.png')). They are built in, so loading works
   * offline and inside the sandboxed preview.
   * ================================================================ */
  function svgUrl(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function textUrl(type, text, name) { return 'data:' + type + ';charset=utf-8,' + encodeURIComponent(text) + (name ? '#' + name : ''); }

  var BEAR = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
    '<circle cx="50" cy="50" r="30" fill="#5C3A21"/><circle cx="150" cy="50" r="30" fill="#5C3A21"/>' +
    '<circle cx="50" cy="50" r="15" fill="#C08A5B"/><circle cx="150" cy="50" r="15" fill="#C08A5B"/>' +
    '<circle cx="100" cy="110" r="75" fill="#7A4E2D"/><ellipse cx="100" cy="140" rx="35" ry="27" fill="#C08A5B"/>' +
    '<ellipse cx="100" cy="128" rx="12" ry="9" fill="#2B1A10"/><circle cx="72" cy="95" r="8" fill="#2B1A10"/>' +
    '<circle cx="128" cy="95" r="8" fill="#2B1A10"/><path d="M88 150 Q100 160 112 150" stroke="#2B1A10" stroke-width="4" fill="none"/></svg>';
  var FILM = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
    '<circle cx="100" cy="100" r="90" fill="#2A2A2A" stroke="#ED8B00" stroke-width="6"/>' +
    '<circle cx="100" cy="100" r="18" fill="#EFE8D4"/><circle cx="100" cy="50" r="20" fill="#EFE8D4"/>' +
    '<circle cx="147.6" cy="84.5" r="20" fill="#EFE8D4"/><circle cx="129.4" cy="140.5" r="20" fill="#EFE8D4"/>' +
    '<circle cx="70.6" cy="140.5" r="20" fill="#EFE8D4"/><circle cx="52.4" cy="84.5" r="20" fill="#EFE8D4"/></svg>';
  var WOOD = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">' +
    '<rect width="128" height="128" fill="#B07A45"/><g fill="none" stroke="#8A5A2E" stroke-width="3">' +
    '<path d="M0 14 Q32 6 64 14 T128 14"/><path d="M0 38 Q32 30 64 40 T128 36"/><path d="M0 64 Q30 58 60 66 T128 62"/>' +
    '<path d="M0 90 Q34 84 66 92 T128 88"/><path d="M0 116 Q32 110 64 118 T128 114"/></g>' +
    '<ellipse cx="84" cy="52" rx="11" ry="5" fill="none" stroke="#6E4522" stroke-width="3"/></svg>';
  // A low-poly stone. Each face gets a flat normal pointing outward, so lights can shade it.
  var ROCK_OBJ = (function () {
    var v = [[0, 1.1, 0.1], [0.95, 0.05, 0.15], [0.1, -0.05, 1], [-1, 0.1, -0.05], [-0.05, 0, -0.9], [0.1, -1, 0]];
    var faces = [[1, 3, 2], [1, 4, 3], [1, 5, 4], [1, 2, 5], [6, 2, 3], [6, 3, 4], [6, 4, 5], [6, 5, 2]];
    var lines = ['# low-poly stone'];
    v.forEach(function (p) { lines.push('v ' + p.join(' ')); });
    faces.forEach(function (f) {
      var a = v[f[0] - 1], b = v[f[1] - 1], c = v[f[2] - 1];
      var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      var n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      var centre = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      if (n[0] * centre[0] + n[1] * centre[1] + n[2] * centre[2] < 0) { n = [-n[0], -n[1], -n[2]]; }
      var len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
      lines.push('vn ' + n.map(function (x) { return (x / len).toFixed(4); }).join(' '));
    });
    faces.forEach(function (f, i) { lines.push('f ' + f.map(function (k) { return k + '//' + (i + 1); }).join(' ')); });
    return lines.join('\n') + '\n';
  })();
  var TRAILS = { trails: [
    { name: 'Ridge Loop', miles: 3.2, gain: 1100, difficulty: 'blue' },
    { name: 'Creek Path', miles: 1.4, gain: 150, difficulty: 'green' },
    { name: 'Summit Climb', miles: 5.8, gain: 2600, difficulty: 'black' },
    { name: 'Meadow Walk', miles: 2.1, gain: 300, difficulty: 'green' },
    { name: 'Larch Traverse', miles: 4.5, gain: 1500, difficulty: 'blue' }
  ] };
  var MENU = { cafe: 'Griz Grounds', items: [
    { name: 'Huckleberry Latte', price: 5.5, calories: 210 },
    { name: 'Drip Coffee', price: 2.75, calories: 5 },
    { name: 'Chai', price: 4.25, calories: 190 },
    { name: 'Hot Cocoa', price: 3.5, calories: 280 }
  ] };
  var WORDS = ['river', 'mountain', 'larch', 'bison', 'snow', 'summit', 'embers', 'meadow'].join('\n');

  var ASSETS = {
    'assets/bear.png': { kind: 'image', desc: 'Bear mascot, 200 × 200', url: svgUrl(BEAR) },
    'assets/film.png': { kind: 'image', desc: 'Film reel logo, 200 × 200', url: svgUrl(FILM) },
    'assets/wood.png': { kind: 'image', desc: 'Wood grain texture, 128 × 128', url: svgUrl(WOOD) },
    'assets/rock.obj': { kind: '3D model', desc: 'Low-poly stone (OBJ)', url: textUrl('text/plain', ROCK_OBJ, 'rock.obj') },
    'data/trails.json': { kind: 'JSON', desc: 'Five sample trails: name, miles, gain (feet), difficulty', url: textUrl('application/json', JSON.stringify(TRAILS, null, 2)), text: JSON.stringify(TRAILS, null, 2) },
    'data/menu.json': { kind: 'JSON', desc: 'Café name and four drinks: name, price, calories', url: textUrl('application/json', JSON.stringify(MENU, null, 2)), text: JSON.stringify(MENU, null, 2) },
    'data/words.txt': { kind: 'text', desc: 'Eight words, one per line', url: textUrl('text/plain', WORDS), text: WORDS }
  };

  /* ================================================================
   * Check helpers for these levels
   * ================================================================ */
  function speedCheck(f) {
    var g = f.globals.map(function (v) { return v.name; });
    return f.assignments.some(function (a) {
      return a.fn === 'draw' && g.indexOf(a.base) >= 0 &&
        (a.op === '+=' || a.op === '-=' || g.some(function (n) { return n !== a.base && new RegExp('\\b' + n + '\\b').test(a.valueSrc || ''); }));
    });
  }
  function hasMethod(f, name) {
    return f.classes.some(function (c) { return c.methods.some(function (m) { return m.name === name; }); });
  }
  function callsMethod(f, name, fn) {
    return f.calls.some(function (c) { return (c.name === name || /\.[\w$]+$/.test(c.name) && c.name.slice(-(name.length + 1)) === '.' + name) && (!fn || c.fn === fn); });
  }
  function userNews(f) {
    return f.news.filter(function (n) { return f.classNames.indexOf(n.name) >= 0; });
  }
  function notBackground(v, bg) {
    return Array.isArray(v) && Math.abs(v[0] - bg[0]) + Math.abs(v[1] - bg[1]) + Math.abs(v[2] - bg[2]) > 60;
  }
  var PRIMITIVES = ['box', 'sphere', 'torus', 'cone', 'cylinder', 'ellipsoid', 'plane', 'model'];

  var LEVELS = [
    /* ================================================================ 11 */
    {
      id: 11,
      title: 'Media and Time',
      tagline: 'Images, fonts, timers, and velocity.',
      concepts: ['preload()', 'loadImage()', 'image()', 'textFont()', 'millis()', 'velocity'],
      learn: {
        brief: [
          'Load files in <code>preload()</code>. p5 waits until every file has arrived before it runs <code>setup()</code>: <code>bear = loadImage(\'assets/bear.png\');</code>',
          '<code>image(img, x, y, w, h)</code> draws an image. <code>imageMode(CENTER)</code> makes (x, y) its center instead of its top-left corner.',
          'Text has style too: <code>textFont(\'Georgia\')</code>, <code>textSize()</code>, <code>textAlign()</code>, <code>textStyle(BOLD)</code>. A custom font file works the same way with <code>loadFont()</code> in preload.',
          'Time: <code>frameCount</code> counts frames; <code>millis()</code> counts milliseconds since the sketch started. Use millis() for timers, because 3 seconds stays 3 seconds even if the frame rate drops.',
          'Motion with <strong>velocity</strong>: keep speed and direction in variables and add them every frame: <code>x += vx;</code>'
        ],
        sayIt: [
          ['bear = loadImage(\'assets/bear.png\');', 'Start loading the bear image file and store it in bear. In preload, p5 waits until it arrives.'],
          ['if (millis() - lastSwitch > 2000)', 'If more than 2000 milliseconds (2 seconds) have passed since the last switch...'],
          ['x += vx;', 'Add the horizontal velocity to x. Short for x = x + vx.']
        ],
        terms: [
          ['preload()', 'A p5 function that loads files before setup() runs.'],
          ['file path', 'Where a file lives, like assets/bear.png. It must match exactly, including capital letters.'],
          ['millisecond', 'One thousandth of a second. 1000 ms = 1 s.'],
          ['velocity', 'How far something moves each frame, with a direction (positive or negative).']
        ],
        example: `let bear;

function preload() {
  bear = loadImage('assets/bear.png');
}

function setup() {
  createCanvas(400, 300);
  imageMode(CENTER);
  textFont('Georgia');
  textAlign(CENTER);
}

function draw() {
  background(239, 232, 212);
  // the size pulses between 100 and 140
  let size = 120 + 20 * sin(frameCount * 0.05);
  image(bear, width / 2, 130, size, size);
  fill(112, 0, 46);
  textSize(28);
  text('Go Griz!', width / 2, 260);
  textSize(14);
  text(floor(millis() / 1000) + ' seconds', width / 2, 285);
}`,
        predict: {
          q: 'Before you run it: what happens to the bear image?',
          options: ['It stays centered and gently grows and shrinks, forever', 'It keeps growing until it fills the canvas', 'It slides to the right', 'It stays exactly the same size'],
          answer: 0,
          why: 'sin() swings smoothly between -1 and 1, so 120 + 20 * sin(...) swings between 100 and 140. imageMode(CENTER) keeps it centered on (width / 2, 130).'
        },
        tryThis: ['Remove imageMode(CENTER). Where does the image go, and why?', 'Change 0.05 to 0.2. What does that number control?', 'Show frameCount next to the seconds. Do they grow at the same rate?', 'Try textStyle(BOLD) or textFont(\'Courier New\').']
      },
      build: {
        context: { kind: 'Business', title: 'Film night poster', story: 'The student union wants an animated poster for its campus film night: the film reel logo, the event title in a classic font, a tagline that alternates every 3 seconds, and one moving element to catch the eye.' },
        plan: PLAN,
        task: 'Load assets/film.png in preload() and draw it. Set a font with textFont() and show the title. Make a tagline switch every 3 seconds using millis(), and move something with a velocity variable.',
        starter: `let logo;

function preload() {

}

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(30, 20, 25);
}`,
        checks: [
          { label: 'Loads an image with loadImage() inside preload()', test: function (f) { return (f.callsByName.loadImage || []).some(function (c) { return c.fn === 'preload'; }); } },
          { label: 'Draws the image with image()', test: function (f) { return f.has('image'); } },
          { label: 'Sets a font with textFont() and draws text', test: function (f) { return f.has('textFont') && f.has('text'); } },
          { label: 'A timer: millis() is used in an if condition', test: function (f) { return f.ifs.some(function (i) { return /millis\(\)/.test(i.testSrc); }); }, fail: 'Remember when the last switch happened (let lastSwitch = 0;) and check if (millis() - lastSwitch > 3000).' },
          { label: 'Something moves by a velocity variable each frame', test: speedCheck, fail: 'Keep the position and the velocity in variables, and add the velocity to the position in draw().' },
          C.noErrors
        ],
        hints: [
          'Sort the work by when it happens: what loads once (preload), what is set up once (setup), and what changes every frame (draw)? The timer has to remember when the tagline last changed.',
          'logo = loadImage(\'assets/film.png\') goes in preload. For motion, keep stripX and stripSpeed as globals and add the speed each frame. For the timer: if (millis() - lastSwitch > 3000) { switch the tagline; lastSwitch = millis(); }',
          `let lastSwitch = 0;
let tagline = 'Free popcorn';

// in draw():
if (millis() - lastSwitch > 3000) {
  if (tagline === 'Free popcorn') {
    tagline = ___;
  } else {
    tagline = 'Free popcorn';
  }
  lastSwitch = ___;
}`
        ],
        solution: `// Film night poster: logo, title font, a drifting film strip, alternating taglines
let logo;
let stripX = 0;
let stripSpeed = 1.5;
let tagline = 'Free popcorn';
let lastSwitch = 0;

function preload() {
  logo = loadImage('assets/film.png');
}

function setup() {
  createCanvas(400, 400);
  imageMode(CENTER);
  textAlign(CENTER);
  textFont('Georgia');
  describe('Film night poster: a film reel logo, the title, a moving film strip, and a tagline that changes every 3 seconds.');
}

function draw() {
  background(30, 20, 25);
  image(logo, width / 2, 130, 160, 160);

  fill(239, 232, 212);
  textSize(36);
  text('Film Night', width / 2, 270);

  // switch the tagline every 3 seconds
  if (millis() - lastSwitch > 3000) {
    if (tagline === 'Free popcorn') {
      tagline = 'Fridays at 7';
    } else {
      tagline = 'Free popcorn';
    }
    lastSwitch = millis();
  }
  textSize(18);
  text(tagline, width / 2, 305);

  // a film strip drifts across the bottom
  fill(237, 139, 0);
  rect(stripX, 340, 80, 24);
  stripX = stripX + stripSpeed;
  if (stripX > width) {
    stripX = -80;
  }
}`,
        solutionQuiz: [
          { q: 'Why is loadImage() in preload() and not in setup()?', options: ['preload() makes p5 wait until the file has arrived, so image() never draws a picture that is not loaded yet', 'setup() cannot load files at all', 'It runs faster', 'Images must be loaded before createCanvas()'], answer: 0, why: 'Loading takes time. preload() is the one place p5 waits for it.' },
          { q: 'Why use millis() for the timer instead of counting frames?', options: ['millis() measures real time, so 3 seconds stays 3 seconds even if the frame rate drops', 'frameCount stops after 60', 'millis() is more accurate for drawing', 'It does not matter'], answer: 0, why: 'Frame rates vary between computers. Real time does not.' }
        ]
      },
      read: {
        context: 'A character for a snake-style game. Click the preview, use the arrow keys, then explain how direction and speed work together.',
        code: `let x = 200;
let y = 200;
let speed = 3;
let dirX = 1;
let dirY = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  x = x + dirX * speed;
  y = y + dirY * speed;
  // wrap around the edges
  if (x > width) { x = 0; }
  if (x < 0) { x = width; }
  if (y > height) { y = 0; }
  if (y < 0) { y = height; }
  fill(112, 0, 46);
  circle(x, y, 30);
}

function keyPressed() {
  if (keyCode === UP_ARROW) { dirX = 0; dirY = -1; }
  if (keyCode === DOWN_ARROW) { dirX = 0; dirY = 1; }
  if (keyCode === LEFT_ARROW) { dirX = -1; dirY = 0; }
  if (keyCode === RIGHT_ARROW) { dirX = 1; dirY = 0; }
}`,
        ideas: [
          { label: 'it moves on its own every frame', keys: ['every frame', 'each frame', 'draw', 'keeps moving', 'constantly', 'continu'], prompt: 'What happens even when no key is pressed?' },
          { label: 'direction (dirX, dirY) and speed are separate', keys: ['dir', 'direction', 'speed', 'multipl', '\\*'], prompt: 'What do dirX, dirY, and speed each control?' },
          { label: 'arrow keys change direction', keys: ['arrow', 'key', 'turn', 'up', 'down'], prompt: 'What do the arrow keys change?' },
          { label: 'it wraps around the edges', keys: ['wrap', 'other side', 'edge', 'reappear', 'opposite'], prompt: 'What happens at the edges?' }
        ],
        questions: [
          { q: 'Pressing the up arrow sets dirY to -1. Why negative?', options: ['y grows downward, so moving up means y gets smaller', 'Negative numbers move faster', 'It is a mistake; up should be +1'], answer: 0, why: ['In p5, y = 0 is the top edge.', 'The speed is the same; only the direction changes.', 'With +1 it would move down.'] },
          { q: 'Which single change doubles the speed in every direction?', options: ['speed = 6', 'dirX = 2', 'frameRate(120)'], answer: 0, why: ['speed multiplies whichever direction is active.', 'That only affects horizontal motion, and the next key press resets it.', 'Frame rate is not guaranteed and would change everything else that is time-based too.'] },
          { q: 'What happens when the circle passes the right edge?', options: ['It reappears at the left edge', 'It bounces back', 'It stops'], answer: 0, why: ['if (x > width) { x = 0; } wraps it around.', 'Bouncing would flip dirX instead.', 'Nothing sets speed or direction to 0.'] }
        ],
        model: 'The circle moves by itself every frame: its position changes by its direction (dirX, dirY) times its speed. Direction and speed are separate, so speed controls how fast it goes, and the arrow keys only change the direction. Because y grows downward, up is dirY = -1. When it passes an edge, the if statements wrap it around to the opposite side.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The missing mascot',
          intent: 'Show the bear mascot image in the middle of the canvas.',
          code: `let bear;

function preload() {
  bear = loadImage('assets/Bear.png');
}

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  image(bear, 100, 100, 200, 200);
}`,
          type: 'runtime', lines: [4],
          causes: ['The path does not match the real file exactly: paths are case-sensitive, and the file is assets/bear.png', 'Images must be loaded in setup()', 'image() needs exactly three arguments', 'p5 cannot load .png files'],
          cause: 0,
          why: 'The code is valid, but when it runs, there is no file called Bear.png, only bear.png. File paths are as picky as variable names. Many web servers treat Bear.png and bear.png as different files, so a sketch that works on one computer can fail online.',
          fixed: `let bear;

function preload() {
  bear = loadImage('assets/bear.png');
}

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  image(bear, 100, 100, 200, 200);
}`,
          fix: { test: function (f) { return f.loads.some(function (l) { return l.path === 'assets/bear.png'; }); } }
        },
        {
          rating: 'black', title: 'The flickering sign',
          intent: 'A shop sign alternates between "OPEN" and "Come in!" every 2 seconds.',
          code: `let showOpen = true;
let lastSwitch = 0;

function setup() {
  createCanvas(400, 200);
  textSize(32);
  textAlign(CENTER, CENTER);
}

function draw() {
  background(255);
  // switch the message every 2 seconds
  if (millis() - lastSwitch > 2000) {
    showOpen = !showOpen;
  }
  fill(0);
  if (showOpen) {
    text('OPEN', width / 2, height / 2);
  } else {
    text('Come in!', width / 2, height / 2);
  }
}`,
          type: 'logic', lines: [13, 14],
          causes: ['lastSwitch is never updated, so after 2 seconds the condition is true on every frame and the message flickers', 'millis() resets every frame', '!showOpen is a syntax error', 'The text is drawn before the background'],
          cause: 0,
          why: 'For 2 seconds it works. After that, millis() - 0 is always more than 2000, so showOpen flips on every frame, about 60 times a second. (! means "not": it flips true and false.) A timer has to remember when it last fired: lastSwitch = millis(); inside the if.',
          fixed: `let showOpen = true;
let lastSwitch = 0;

function setup() {
  createCanvas(400, 200);
  textSize(32);
  textAlign(CENTER, CENTER);
}

function draw() {
  background(255);
  // switch the message every 2 seconds
  if (millis() - lastSwitch > 2000) {
    showOpen = !showOpen;
    lastSwitch = millis();
  }
  fill(0);
  if (showOpen) {
    text('OPEN', width / 2, height / 2);
  } else {
    text('Come in!', width / 2, height / 2);
  }
}`,
          fix: { test: function (f) { return f.assignments.some(function (a) { return a.base === 'lastSwitch' && a.fn === 'draw' && a.inIf && /millis\(\)/.test(a.valueSrc || ''); }); }, fail: 'Inside the if, record the time of the switch: lastSwitch = millis();' }
        }
      ],
      judge: {
        context: { kind: 'Game', title: 'Bouncing mascot' },
        spec: ['Loads assets/bear.png in preload()', 'The bear moves diagonally and bounces off all four edges', 'Shows how many whole seconds have passed', 'Includes describe() for screen reader users'],
        prompt: 'make the bear image bounce around the screen in p5 with a timer',
        aiCode: `let bear;
let x = 100;
let y = 100;
let vx = 3;
let vy = 2;

function setup() {
  createCanvas(400, 400);
  bear = loadImage('assets/bear.png');
}

function draw() {
  background(239, 232, 212);
  image(bear, x, y, 80, 80);
  x += vx;
  y += vy;
  if (x > width - 80 || x < 0) {
    vx = -vx;
  }
  if (y > height - 80 || y < 0) {
    vy = -vy;
  }
  text(millis() / 1000, 10, 20);
}`,
        checklist: [
          { answer: 'no', why: 'loadImage() is in setup(). It happens to work here because the file is small, but nothing waits for it.' },
          { answer: 'yes', why: 'vx and vy flip at every edge, accounting for the 80-pixel image size.' },
          { answer: 'partly', why: 'It shows seconds, but with long decimals like 3.4170000000000003. floor(millis() / 1000) gives whole seconds.' },
          { answer: 'no', why: 'There is no describe().' }
        ],
        issue: {
          q: 'The image shows up fine when you run it. Why does loading in setup() still matter?',
          options: ['Nothing waits for the file; with a bigger file or a slower connection, the first frames (or the whole sketch) can break. "It worked once" is not verification', 'It does not matter if it shows up', 'setup() runs after draw()', 'loadImage() only works in setup()'],
          answer: 0,
          why: 'Code can pass a quick test by luck. Knowing why preload() exists lets you catch problems a single run cannot show.'
        },
        verdicts: {
          accept: 'Not yet. One requirement is missing, one is only partly met, and the loading is fragile.',
          revise: 'Good call. Move loadImage() into preload(), use floor() for the seconds, and add describe().',
          reject: 'Defensible, but the motion logic is correct. Three small fixes meet the spec.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'loading in preload()', keys: ['preload'] },
          { label: 'whole seconds', keys: ['whole', 'floor', 'round', 'integer', 'no decimal'] },
          { label: 'describe() for accessibility', keys: ['describe', 'screen reader', 'accessib', 'alt'] },
          { label: 'bouncing off all four edges', keys: ['four', 'all edges', 'every edge', 'top', 'bottom'] }
        ]
      }
    },

    /* ================================================================ 12 */
    {
      id: 12,
      title: 'Classes and Objects',
      tagline: 'Blueprints that bundle data with behavior.',
      concepts: ['class', 'constructor', 'this', 'methods', 'new', 'array of objects'],
      learn: {
        brief: [
          'A <strong>class</strong> is a blueprint. It bundles data (properties) with behavior (methods).',
          '<code>constructor(x, y)</code> runs when you write <code>new Ball(100, 200)</code>. It stores the starting values as <code>this.x</code> and <code>this.y</code>.',
          '<code>this</code> means "the object this code belongs to." Each ball has its own <code>this.x</code>.',
          'Methods like <code>update()</code> and <code>display()</code> keep each object\'s code in one place. Put many objects in an array and call their methods in a loop.'
        ],
        sayIt: [
          ['class Ball { ... }', 'Define a blueprint called Ball. Class names start with a capital letter.'],
          ['this.x = x;', 'Store the x that was passed in as this object\'s own x property.'],
          ['let b = new Ball(100, 200);', 'Build a new Ball from the blueprint, starting at (100, 200), and store it in b.'],
          ['b.update();', 'Ask the ball b to run its update method.']
        ],
        terms: [
          ['class', 'A blueprint for making objects.'],
          ['instance', 'One object built from a class with new.'],
          ['constructor', 'The method that sets up a new object\'s properties.'],
          ['method', 'A function that belongs to a class and works on this object.']
        ],
        example: `class Ball {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
  }

  update() {
    this.x = this.x + this.speed;
    if (this.x > width || this.x < 0) {
      this.speed = -this.speed;
    }
  }

  display() {
    circle(this.x, this.y, 30);
  }
}

let a;
let b;

function setup() {
  createCanvas(400, 200);
  a = new Ball(50, 60, 2);
  b = new Ball(300, 140, 5);
}

function draw() {
  background(239, 232, 212);
  fill(112, 0, 46);
  a.update();
  a.display();
  b.update();
  b.display();
}`,
        predict: {
          q: 'Before you run it: how do the two balls behave?',
          options: ['Both bounce side to side; the lower one is faster, and each keeps its own position and speed', 'They move together as one', 'Only ball a moves, because update() is defined once', 'Neither moves, because the class has no draw()'],
          answer: 0,
          why: 'Each new Ball gets its own this.x and this.speed. One update() method works for every ball, using that ball\'s own data.'
        },
        tryThis: ['Add a third ball with one new line in setup() and two in draw().', 'Add a this.size property and use it in display().', 'Give each ball its own color property.']
      },
      build: {
        context: { kind: 'Game', title: 'Enemy wave', story: 'A space shooter needs enemies that drift down the screen. Each enemy has its own position, speed, and size, and returns to the top after leaving the bottom. The designer wants to change the number of enemies with one number.' },
        plan: PLAN,
        task: 'Write an Enemy class with a constructor, update(), and display(). Store at least 3 enemies in an array, and update and display each one in draw().',
        starter: `let enemies = [];

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20, 30, 60);
}`,
        checks: [
          { label: 'Defines a class with a constructor', test: function (f) { return hasMethod(f, 'constructor'); } },
          { label: 'The class has update() and display() methods', test: function (f) { return hasMethod(f, 'update') && hasMethod(f, 'display'); } },
          { label: 'Stores properties with this.', test: function (f) { return f.assignments.some(function (a) { return a.member && /^this\./.test(a.name); }); } },
          { label: 'Builds at least 3 objects with new (in a loop or one by one), stored in an array', test: function (f) { var n = userNews(f); return (n.some(function (x) { return x.inLoop; }) || n.length >= 3) && f.arrays > 0; } },
          { label: 'draw() calls update() and display()', test: function (f) { return callsMethod(f, 'update', 'draw') && callsMethod(f, 'display', 'draw'); } },
          { label: 'After 300 frames, every enemy is still near the canvas', runtime: true, frames: 300, expr: function (f) { var a = H.firstArrayGlobal(f); return a ? a + '.length >= 3 && ' + a + '.every(function (e) { return typeof e.y !== "number" || (e.y > -500 && e.y < height + 100); })' : null; },
            test: function (v) { return v === true; }, fail: 'When an enemy goes past the bottom (this.y > height), move it back above the top.' }
        ],
        hints: [
          'List what every enemy has (data) and what every enemy does (behavior). Data becomes this.something in the constructor; behavior becomes methods.',
          'class Enemy { constructor(x, y, speed) { this.x = x; ... } update() { ... } display() { ... } }. In setup(), push new Enemy(...) into the array inside a loop. In draw(), loop over the array and call enemies[i].update() and enemies[i].display().',
          `class Enemy {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
  }

  update() {
    this.y = this.y + this.speed;
    if (___) {
      this.y = -20;
    }
  }

  display() {
    square(this.x, this.y, 20);
  }
}`
        ],
        solution: `// Enemy wave: each Enemy object keeps its own position, speed, and size
class Enemy {
  constructor(x, y, speed, size) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.size = size;
  }

  // move down; return to the top after leaving the bottom
  update() {
    this.y = this.y + this.speed;
    if (this.y > height + this.size) {
      this.y = -this.size;
      this.x = random(width);
    }
  }

  display() {
    fill(237, 139, 0);
    square(this.x - this.size / 2, this.y - this.size / 2, this.size);
  }
}

let enemies = [];
let enemyCount = 6;

function setup() {
  createCanvas(400, 400);
  noStroke();
  for (let i = 0; i < enemyCount; i++) {
    enemies.push(new Enemy(random(width), random(-400, 0), random(1, 3), random(20, 40)));
  }
  describe('Orange square enemies drift down a dark blue sky at different speeds.');
}

function draw() {
  background(20, 30, 60);
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].update();
    enemies[i].display();
  }
}`,
        solutionQuiz: [
          { q: 'Inside update(), why write this.y instead of just y?', options: ['this.y is this enemy\'s own y; a plain y would look for a variable that does not exist', 'y is reserved by p5', 'this.y is faster', 'Both work the same'], answer: 0, why: 'Every enemy stores its own y. this points to the enemy whose method is running.' },
          { q: 'What does new Enemy(...) do?', options: ['Runs the constructor to build a separate object with its own properties', 'Copies the last enemy', 'Calls update()', 'Creates a new class'], answer: 0, why: 'Each new makes one independent instance.' }
        ]
      },
      read: {
        context: 'A reusable button for a game menu. Hover, click, and watch the console. Then explain how the Button class works.',
        code: `class Button {
  constructor(label, x, y, w, h) {
    this.label = label;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(px, py) {
    return px > this.x && px < this.x + this.w &&
           py > this.y && py < this.y + this.h;
  }

  display() {
    if (this.contains(mouseX, mouseY)) {
      fill(70, 0, 29);
    } else {
      fill(112, 0, 46);
    }
    rect(this.x, this.y, this.w, this.h, 8);
    fill(255);
    text(this.label, this.x + this.w / 2, this.y + this.h / 2);
  }
}

let play;
let quit;

function setup() {
  createCanvas(400, 300);
  textAlign(CENTER, CENTER);
  textSize(20);
  play = new Button('Play', 120, 80, 160, 50);
  quit = new Button('Quit', 120, 170, 160, 50);
}

function draw() {
  background(239, 232, 212);
  play.display();
  quit.display();
}

function mousePressed() {
  if (play.contains(mouseX, mouseY)) {
    print('Starting game');
  } else if (quit.contains(mouseX, mouseY)) {
    print('Goodbye');
  }
}`,
        ideas: [
          { label: 'Button is a class (blueprint) for buttons', keys: ['class', 'blueprint', 'button'], prompt: 'What does the class describe?' },
          { label: 'two button objects with different labels and positions', keys: ['two', '2', 'play', 'quit', 'object', 'instance'], prompt: 'How many buttons are built, and how do they differ?' },
          { label: 'contains() returns true or false', keys: ['contains', 'true', 'false', 'return', 'inside'], prompt: 'What does contains() answer?' },
          { label: 'hover darkens it; clicking prints a message', keys: ['hover', 'dark', 'click', 'print', 'console'], prompt: 'What happens on hover and on click?' }
        ],
        questions: [
          { q: 'How many Button objects exist?', options: ['2', '1', 'None until you click'], answer: 0, why: ['play and quit are each built with new.', 'There are two news in setup().', 'They are built in setup().'] },
          { q: 'Inside display(), what does this.contains(mouseX, mouseY) do?', options: ['Asks this same button whether the mouse is inside it', 'Checks every button at once', 'Moves the button to the mouse'], answer: 0, why: ['this is the button being displayed, so each button checks only itself.', 'Each button checks only itself.', 'contains() only answers a question; it changes nothing.'] },
          { q: 'What is the least code needed to add a working "Settings" button?', options: ['One new Button(...) line in setup, a display() call in draw, and a contains() check in mousePressed', 'A whole new class', 'Copying the display() method'], answer: 0, why: ['The class already knows how to draw and hit-test itself.', 'The blueprint can make any number of buttons.', 'Methods are shared by every instance.'] }
        ],
        model: 'Button is a blueprint for clickable buttons. The constructor stores each button\'s label, position, and size. contains(px, py) returns true when a point is inside the button. display() uses contains() to draw a darker color on hover, then draws the label. setup() builds two buttons, play and quit. draw() displays both. mousePressed() asks each button whether the click was inside it and prints a message.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The star that lost itself',
          intent: 'A star drawn at the position stored in the Star object.',
          code: `class Star {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(255, 220, 0);
    circle(x, y, 20);
  }
}

let star;

function setup() {
  createCanvas(400, 400);
  star = new Star(200, 200);
}

function draw() {
  background(20, 30, 60);
  star.display();
}`,
          type: 'runtime', lines: [9],
          causes: ['Inside a method, the star\'s position is this.x and this.y; plain x and y do not exist there', 'The constructor should be called display', 'star must be created in draw()', 'circle() cannot be used inside a class'],
          cause: 0,
          why: 'The constructor\'s x and y only exist while the constructor runs. After that, the values live on the object as this.x and this.y. display() asks for a plain x, finds nothing, and crashes: "x is not defined".',
          fixed: `class Star {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(255, 220, 0);
    circle(this.x, this.y, 20);
  }
}

let star;

function setup() {
  createCanvas(400, 400);
  star = new Star(200, 200);
}

function draw() {
  background(20, 30, 60);
  star.display();
}`,
          fix: { test: function (f) { return !(f.identifiers.x || []).some(function (r) { return r.fn === 'Star.display'; }); } }
        },
        {
          rating: 'black', title: 'The raindrop that never falls',
          intent: 'One raindrop falls down the middle of the canvas.',
          code: `class Drop {
  constructor(x) {
    this.x = x;
    this.y = 0;
  }

  update() {
    this.y = this.y + 4;
  }

  display() {
    circle(this.x, this.y, 10);
  }
}

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20, 30, 60);
  let drop = new Drop(200);
  drop.update();
  drop.display();
}`,
          type: 'logic', lines: [22],
          causes: ['A brand-new Drop is built every frame, so its y always starts over at 0', 'update() adds to the wrong property', 'display() is called before update()', 'Classes cannot be used in draw()'],
          cause: 0,
          why: 'The class is fine. The object is the problem: new Drop(200) runs on every frame, so each frame gets a fresh drop at y = 0, moves it 4 pixels, then throws it away. It is Level 5\'s "variable declared inside draw()" bug, in object form. Build the drop once in setup() and keep it in a global.',
          fixed: `class Drop {
  constructor(x) {
    this.x = x;
    this.y = 0;
  }

  update() {
    this.y = this.y + 4;
  }

  display() {
    circle(this.x, this.y, 10);
  }
}

let drop;

function setup() {
  createCanvas(400, 400);
  drop = new Drop(200);
}

function draw() {
  background(20, 30, 60);
  drop.update();
  drop.display();
}`,
          fix: { test: function (f) { return !f.news.some(function (n) { return n.fn === 'draw'; }); },
            probes: [{ frames: 30, expr: 'drop.y', test: function (v) { return v > 50; } }], fail: 'Build the drop once, outside draw(), so it keeps its y between frames.' }
        }
      ],
      judge: {
        context: { kind: 'Game', title: 'Bouncing balls, object-oriented' },
        spec: ['A Ball class with update() and display() methods', 'At least 5 balls stored in an array of objects', 'Each ball has its own color', 'Balls bounce off all four edges'],
        prompt: 'make 5 bouncing balls in p5',
        aiCode: `let xs = [50, 120, 200, 260, 330];
let ys = [80, 200, 140, 300, 60];
let speeds = [2, 3, -2, 4, -3];

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(255);
  fill(112, 0, 46);
  for (let i = 0; i < 5; i++) {
    xs[i] += speeds[i];
    ys[i] += speeds[i];
    if (xs[i] > width || xs[i] < 0) {
      speeds[i] = -speeds[i];
    }
    circle(xs[i], ys[i], 30);
  }
}`,
        checklist: [
          { answer: 'no', why: 'There is no class. Each ball\'s data is spread across three separate "parallel" arrays.' },
          { answer: 'partly', why: 'There are 5 balls, but as parallel arrays of numbers, not an array of objects.' },
          { answer: 'no', why: 'Every ball uses the same fill.' },
          { answer: 'no', why: 'Only x is checked. Because y uses the same speed, balls leave through the top or bottom.' }
        ],
        issue: {
          q: 'The AI used parallel arrays (xs, ys, speeds). Why does the spec ask for a class instead?',
          options: ['A class keeps each ball\'s data and behavior together, so adding something like color is one change in one place instead of another array to keep in sync', 'Classes run faster', 'Arrays cannot hold numbers', 'It is only a style preference'],
          answer: 0,
          why: 'The spec encodes a design goal, not just a picture. Code that looks right can still miss the structure the requirements ask for.'
        },
        verdicts: {
          accept: 'No. It ignores the main learning goal (classes) and fails two other requirements.',
          revise: 'Reasonable: re-prompt for a Ball class, or refactor the three arrays into one array of Ball objects.',
          reject: 'Also reasonable. Writing the Ball class yourself from the Learn example may be quicker than refactoring.'
        },
        best: ['revise', 'reject'],
        promptIdeas: [
          { label: 'a Ball class with update() and display()', keys: ['class', 'update', 'display'] },
          { label: 'an array of objects', keys: ['array'] },
          { label: 'each ball has its own color', keys: ['colou?r'] },
          { label: 'bouncing off all four edges', keys: ['four', 'all edges', 'every edge', 'top', 'bottom'] }
        ]
      }
    },

    /* ================================================================ 13 */
    {
      id: 13,
      title: 'Data Files and Objects',
      tagline: 'Let external data drive what you draw.',
      concepts: ['loadJSON()', 'loadStrings()', 'JSON', 'records to objects', 'map()', 'data-driven'],
      learn: {
        brief: [
          'Data can live in files instead of your code. <code>loadJSON(\'data/trails.json\')</code> reads JSON; <code>loadStrings(\'data/words.txt\')</code> reads a text file as an array of lines.',
          'Load in <code>preload()</code> so the data is ready when <code>setup()</code> runs.',
          'JSON uses the same <code>{ }</code> objects and <code>[ ]</code> arrays as JavaScript: <code>data.trails[0].name</code>.',
          'Turn each record into an object (often a class instance), then let the data drive size, color, or position. <code>map(value, inLow, inHigh, outLow, outHigh)</code> converts a number from one range to another.',
          'Gotcha: p5\'s loadJSON() returns an object, so keep lists inside a property like <code>"trails": [...]</code>.'
        ],
        sayIt: [
          ['data = loadJSON(\'data/trails.json\');', 'Load the JSON file and store its contents in data.'],
          ['data.trails.length', 'How many records are in the trails list.'],
          ['let h = map(t.gain, 0, 3000, 0, 220);', 'Convert this trail\'s elevation gain from the range 0–3000 feet to a bar height from 0 to 220 pixels.']
        ],
        terms: [
          ['JSON', 'A text format for data, made of objects { } and arrays [ ].'],
          ['record', 'One item in the data, like one trail.'],
          ['field', 'One named value in a record, like gain or name.'],
          ['data-driven', 'The picture comes from the data, so new data means a new picture with no code changes.']
        ],
        example: `let data;

function preload() {
  data = loadJSON('data/trails.json');
}

function setup() {
  createCanvas(400, 300);
  background(255);
  textSize(12);
  let trails = data.trails;
  for (let i = 0; i < trails.length; i++) {
    let t = trails[i];
    let barH = map(t.gain, 0, 3000, 0, 220);
    fill(112, 0, 46);
    rect(30 + i * 72, 250 - barH, 50, barH);
    fill(0);
    text(t.miles + ' mi', 30 + i * 72, 270);
  }
}`,
        predict: {
          q: 'Before you run it: what decides how tall each bar is?',
          options: ['Each trail\'s elevation gain from the file, scaled by map()', 'Each trail\'s miles', 'Its position in the list', 'A random number'],
          answer: 0,
          why: 'barH comes from map(t.gain, ...). The miles only appear in the labels.'
        },
        tryThis: ['Open the Project files list under the editor and read data/trails.json. Which bar is Summit Climb?', 'Label each bar with t.name instead of miles. What goes wrong, and how could you fix it?', 'Color each bar by t.difficulty.']
      },
      build: {
        context: { kind: 'Business', title: 'Data-driven menu board', story: 'The café from Level 1 is back. Prices change often, so the owner wants the menu board to read from data/menu.json instead of having prices typed into the code. When the file changes, the board should change too.' },
        plan: PLAN,
        task: 'Load data/menu.json in preload(). Write a class (like MenuItem) with a display() method, build one object per menu item in a loop that uses .length, and show each item\'s name and price.',
        starter: `let menu;

function preload() {

}

function setup() {
  createCanvas(600, 300);
}

function draw() {
  background(30);
}`,
        checks: [
          { label: 'Loads data/menu.json with loadJSON() in preload()', test: function (f) { return f.loads.some(function (l) { return l.kind === 'loadJSON' && l.path === 'data/menu.json' && l.fn === 'preload'; }); } },
          { label: 'Defines a class with a display() method', test: function (f) { return hasMethod(f, 'display'); } },
          { label: 'Builds objects with new inside a loop', test: function (f) { return userNews(f).some(function (n) { return n.inLoop; }); } },
          { label: 'The loop uses the length of the loaded list', test: function (f) { return f.loops.some(function (l) { return /\.length/.test(l.testSrc); }); } },
          { label: 'Shows each item (at least 4 lines of text drawn)', runtime: true, frames: 2, expr: function () { return '__shapeCalls()'; },
            test: function (v) { return !!v && (((v.draw || {}).text || 0) >= 4 || ((v.setup || {}).text || 0) >= 4); } },
          C.noErrors
        ],
        hints: [
          'Look at the file first (Project files, under the editor). What is the list called, and what fields does each record have?',
          'In preload: menu = loadJSON(\'data/menu.json\'). In setup: for (let i = 0; i < menu.items.length; i++) { let r = menu.items[i]; items.push(new MenuItem(r.name, r.price, 100 + i * 45)); }',
          `class MenuItem {
  constructor(name, price, y) {
    this.name = name;
    this.price = price;
    this.y = y;
  }

  display() {
    text(this.name, 40, this.y);
    text('$' + ___, 450, this.y);
  }
}`
        ],
        solution: `// Data-driven menu board: edit data/menu.json, not the code
class MenuItem {
  constructor(name, price, y) {
    this.name = name;
    this.price = price;
    this.y = y;
  }

  display() {
    fill(239, 232, 212);
    textAlign(LEFT);
    text(this.name, 40, this.y);
    textAlign(RIGHT);
    text('$' + nf(this.price, 1, 2), width - 40, this.y);
  }
}

let menu;
let items = [];

function preload() {
  menu = loadJSON('data/menu.json');
}

function setup() {
  createCanvas(600, 300);
  textFont('Georgia');
  for (let i = 0; i < menu.items.length; i++) {
    let record = menu.items[i];
    items.push(new MenuItem(record.name, record.price, 100 + i * 45));
  }
  describe('A dark menu board listing each drink from the menu file with its price.');
}

function draw() {
  background(30);
  fill(237, 139, 0);
  textAlign(CENTER);
  textSize(30);
  text(menu.cafe, width / 2, 50);
  textSize(22);
  for (let i = 0; i < items.length; i++) {
    items[i].display();
  }
}`,
        solutionQuiz: [
          { q: 'The owner adds a fifth drink to menu.json. What code must change?', options: ['None: the loop uses menu.items.length', 'Add a fifth new MenuItem line', 'Change the canvas size', 'Edit the class'], answer: 0, why: 'Data-driven code adapts to the data. (A much longer menu would eventually need a taller canvas.)' },
          { q: 'What does nf(this.price, 1, 2) do?', options: ['Formats the number with 2 decimal places, so 5.5 shows as 5.50', 'Rounds to the nearest dollar', 'Adds a dollar sign', 'Converts it to a string with no change'], answer: 0, why: 'nf() means "number format": at least 1 digit before the decimal point and exactly 2 after.' }
        ]
      },
      read: {
        context: 'A tiny generative poem. Run it and watch it change. Then explain where the words come from and how they are chosen.',
        code: `let words;

function preload() {
  words = loadStrings('data/words.txt');
}

function setup() {
  createCanvas(400, 300);
  textAlign(CENTER, CENTER);
  textFont('Georgia');
  frameRate(1);
}

function draw() {
  background(29, 60, 52);
  fill(239, 232, 212);
  textSize(28);
  let first = random(words);
  let second = random(words);
  text(first + ' and ' + second, width / 2, height / 2);
  textSize(14);
  text(words.length + ' words loaded', width / 2, height - 30);
}`,
        ideas: [
          { label: 'words come from a text file, one per line', keys: ['file', 'text', 'txt', 'line', 'loadstrings'], prompt: 'Where do the words come from?' },
          { label: 'preload() waits for the file', keys: ['preload', 'wait', 'before'], prompt: 'Why is it loaded in preload()?' },
          { label: 'random(words) picks a random word', keys: ['random', 'pick', 'choose'], prompt: 'How are the two words chosen?' },
          { label: 'frameRate(1) makes a new phrase each second', keys: ['framerate', 'second', 'once', 'slow'], prompt: 'Why does it change only once a second?' }
        ],
        questions: [
          { q: 'What is words after preload()?', options: ['An array of strings, one per line of the file', 'One long string', 'A JSON object'], answer: 0, why: ['loadStrings() splits the file into lines.', 'loadStrings() splits it into lines for you.', 'It is a text file, read as lines.'] },
          { q: 'Why does the phrase change only once per second?', options: ['frameRate(1) runs draw() once a second', 'random() is slow', 'millis() is used'], answer: 0, why: ['Each draw() picks new words; it now runs once a second.', 'random() is instant.', 'There is no millis() here.'] },
          { q: 'What does random(words) return when given an array?', options: ['One random item from the array', 'A random number', 'The whole array, shuffled'], answer: 0, why: ['With an array, random() picks one element.', 'With numbers it returns a number; with an array it picks an item.', 'shuffle() does that.'] }
        ],
        model: 'preload() loads data/words.txt with loadStrings(), which gives an array of strings, one per line. setup() sets the font and uses frameRate(1) so draw() runs once a second. Each time, random(words) picks two random words from the array and shows them as "first and second". The bottom line shows how many words were loaded (words.length).'
      },
      bugs: [
        {
          rating: 'blue', title: 'Data that was not there yet',
          intent: 'List the name of every trail from data/trails.json.',
          code: `let data;

function setup() {
  createCanvas(400, 300);
  data = loadJSON('data/trails.json');
  for (let i = 0; i < data.trails.length; i++) {
    text(data.trails[i].name, 20, 40 + i * 30);
  }
}`,
          type: 'runtime', lines: [5], near: { 6: 'This is where it crashes, but the line is fine on its own. Ask why data.trails is undefined at this moment.' },
          causes: ['loadJSON() in setup() does not wait for the file, so data.trails is still undefined on the very next line', 'The file is named wrong', 'text() cannot show names', 'for loops cannot use .length'],
          cause: 0,
          why: 'Loading takes time. In setup(), loadJSON() hands back an empty object right away and fills it in later. One line later, data.trails is undefined, and asking for its .length crashes. preload() exists for this: p5 waits there until every file has arrived.',
          fixed: `let data;

function preload() {
  data = loadJSON('data/trails.json');
}

function setup() {
  createCanvas(400, 300);
  for (let i = 0; i < data.trails.length; i++) {
    text(data.trails[i].name, 20, 40 + i * 30);
  }
}`,
          fix: { test: function (f) { return f.loads.some(function (l) { return l.kind === 'loadJSON' && l.fn === 'preload'; }); } }
        },
        {
          rating: 'black', title: 'The invisible chart',
          intent: 'A bar chart of each trail\'s elevation gain.',
          code: `let data;

function preload() {
  data = loadJSON('data/trails.json');
}

function setup() {
  createCanvas(400, 300);
  background(255);
  fill(112, 0, 46);
  for (let i = 0; i < data.trails.length; i++) {
    let t = data.trails[i];
    let barH = map(t.elevation, 0, 3000, 0, 220);
    rect(30 + i * 72, 250 - barH, 50, barH);
  }
}`,
          type: 'logic', lines: [13],
          causes: ['The records have no field called elevation (it is called gain), so t.elevation is undefined and every bar height is NaN', 'map() needs integers', 'The loop never runs', 'fill() must be inside the loop'],
          cause: 0,
          why: 'No error, just a blank canvas. Reading a field that does not exist gives undefined, map() turns that into NaN ("not a number"), and a rectangle NaN pixels tall draws nothing. Check the real field names in the file, or print(t) to inspect a record. AI tools make this mistake a lot: they guess field names instead of reading the data.',
          fixed: `let data;

function preload() {
  data = loadJSON('data/trails.json');
}

function setup() {
  createCanvas(400, 300);
  background(255);
  fill(112, 0, 46);
  for (let i = 0; i < data.trails.length; i++) {
    let t = data.trails[i];
    let barH = map(t.gain, 0, 3000, 0, 220);
    rect(30 + i * 72, 250 - barH, 50, barH);
  }
}`,
          fix: { test: function (f) { return (f.callsByName.map || []).some(function (c) { return /\.gain\b/.test(c.argSrc[0] || ''); }); },
            probes: [{ frames: 1, expr: 'get(55, 245)', test: function (v) { return v && v[0] > v[1] + 40; } }], fail: 'Use the field name that is really in the file: gain.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Trail difficulty chart' },
        spec: ['Reads data/trails.json (no trail data typed into the code)', 'One bar per trail, for any number of trails', 'Bar color matches difficulty: green, blue, or black', 'Each bar is labeled with the trail name'],
        prompt: 'p5 bar chart of hiking trails by elevation colored by difficulty',
        aiCode: `let trails = [
  { name: 'Ridge Loop', gain: 1100, difficulty: 'blue' },
  { name: 'Creek Path', gain: 150, difficulty: 'green' },
  { name: 'Summit Climb', gain: 2600, difficulty: 'black' }
];

function setup() {
  createCanvas(400, 300);
  background(255);
  for (let i = 0; i < trails.length; i++) {
    let t = trails[i];
    if (t.difficulty === 'green') {
      fill(0, 150, 70);
    } else if (t.difficulty === 'blue') {
      fill(0, 80, 200);
    } else {
      fill(0);
    }
    let barH = map(t.gain, 0, 3000, 0, 220);
    rect(30 + i * 110, 250 - barH, 60, barH);
  }
}`,
        checklist: [
          { answer: 'no', why: 'The data is typed into the code, and only 3 of the file\'s 5 trails are there.' },
          { answer: 'partly', why: 'It loops over .length, but over its own short copy, not the file.' },
          { answer: 'yes', why: 'The if / else if / else picks green, blue, or black.' },
          { answer: 'no', why: 'There are no labels.' }
        ],
        issue: {
          q: 'The AI typed the data into the code instead of loading the file. Besides breaking requirement 1, what is the risk?',
          options: ['The copy can be incomplete or wrong (two trails are missing here) and goes stale when the file changes. Data should come from its source', 'None, as long as it looks right', 'Typed data runs slower', 'JSON files cannot be used for charts'],
          answer: 0,
          why: 'AI tools often invent or trim sample data. Always compare against the real data.'
        },
        verdicts: {
          accept: 'No. It does not use the file and silently drops two trails: a wrong chart that looks right.',
          revise: 'Good call. Load the file in preload(), loop over data.trails, and add text labels. The coloring logic can stay.',
          reject: 'Defensible, but the coloring and bar math are reusable.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'load the file (loadJSON in preload)', keys: ['loadjson', 'trails.json', 'file', 'preload', 'load'] },
          { label: 'every trail, any number', keys: ['every', 'all', 'any number', 'length'] },
          { label: 'labels with trail names', keys: ['label', 'name', 'text'] }
        ]
      }
    },

    /* ================================================================ 14 */
    {
      id: 14,
      title: 'Collision and Sound',
      tagline: 'Detect contact, then make it heard.',
      concepts: ['dist()', 'p5.collide2D', 'p5.sound', 'oscillators and synths', 'audio after a click', 'p5.Amplitude'],
      learn: {
        brief: [
          'Two circles touch when the distance between their centers is less than the sum of their radii: <code>dist(x1, y1, x2, y2) &lt; r1 + r2</code>.',
          '<strong>p5.collide2D</strong> has ready-made checks, like <code>collideRectRect()</code>, <code>collideRectCircle()</code>, and <code>collidePointCircle()</code>. Each returns true or false.',
          '<strong>p5.sound</strong> makes sound with code: a <code>p5.Oscillator</code> (a steady tone), a <code>p5.MonoSynth</code> (plays notes), or <code>loadSound()</code> for audio files.',
          'Browsers only allow sound after the user clicks or presses a key. Call <code>userStartAudio()</code> in <code>mousePressed()</code>. Here, that means clicking the preview first.',
          'Trigger a sound when contact <em>begins</em>, not on every frame it continues. Remember whether you were touching last frame.'
        ],
        sayIt: [
          ['if (dist(px, py, ex, ey) < 20 + 50)', 'If the centers are closer than the two radii added together, the circles overlap.'],
          ['collideRectCircle(rx, ry, rw, rh, cx, cy, d)', 'Ask p5.collide2D whether this rectangle and this circle (diameter d) overlap. It answers true or false.'],
          ['synth.play(\'C5\', 0.5, 0, 0.2);', 'Play the note C5 at half volume, starting now, held for 0.2 seconds.']
        ],
        terms: [
          ['collision detection', 'Checking whether two shapes overlap.'],
          ['hitbox', 'The simple shape used for collisions, often a rectangle or circle.'],
          ['oscillator', 'A sound source that makes a steady tone at a frequency.'],
          ['amplitude', 'Loudness.']
        ],
        example: `let synth;
let wasTouching = false;

function setup() {
  createCanvas(400, 300);
  synth = new p5.MonoSynth();
  describe('A small maroon circle follows the mouse. Touching the big circle turns it orange and plays a note.');
}

function draw() {
  background(239, 232, 212);
  let touching = dist(mouseX, mouseY, 200, 150) < 20 + 50;
  if (touching) {
    fill(237, 139, 0);
  } else {
    fill(29, 60, 52);
  }
  circle(200, 150, 100);
  fill(112, 0, 46);
  circle(mouseX, mouseY, 40);

  // play a note only at the moment contact begins
  if (touching && !wasTouching) {
    synth.play(random(['C4', 'E4', 'G4']), 0.5, 0, 0.2);
  }
  wasTouching = touching;
}

// browsers only allow sound after a click
function mousePressed() {
  userStartAudio();
}`,
        predict: {
          q: 'Before you run it (and after clicking the preview once): when does a note play?',
          options: ['Once, at the moment the small circle starts touching the big one', 'On every frame while they touch', 'Whenever you click', 'Never, because there is no sound file'],
          answer: 0,
          why: 'touching && !wasTouching is only true on the first frame of contact. wasTouching remembers last frame. p5.MonoSynth makes sound without a file.'
        },
        tryThis: ['Remove && !wasTouching. What do you hear, and why?', 'Change the notes to a different chord.', 'Replace the dist() check with collideCircleCircle(mouseX, mouseY, 40, 200, 150, 100).']
      },
      build: {
        context: { kind: 'Game', title: 'Catch the note', story: 'A rhythm-game prototype: a paddle at the bottom follows the mouse. A ball falls; catching it plays a note, adds a point, and drops a new ball from the top. A miss also drops a new ball.' },
        plan: PLAN,
        task: 'Use a p5.collide2D function to detect when the paddle catches the ball. On a catch, play a sound with p5.sound and add to the score. Start audio after a click with userStartAudio(), and show the score.',
        starter: `let ballX = 200;
let ballY = 0;
let score = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(29, 60, 52);
  circle(ballX, ballY, 24);
  ballY = ballY + 4;
}`,
        checks: [
          { label: 'Uses a p5.collide2D function (like collideRectCircle) to detect the catch', test: function (f) { return f.calls.some(function (c) { return /^collide[A-Z]/.test(c.name); }); } },
          { label: 'Makes sound with p5.sound (an oscillator, synth, or loaded sound)', test: function (f, code) { return /new\s+p5\.(Oscillator|MonoSynth|PolySynth|Noise)\b|loadSound\s*\(/.test(code); } },
          { label: 'Starts audio after a click or key press (userStartAudio in mousePressed or keyPressed)', test: function (f) { return f.calls.some(function (c) { return c.name === 'userStartAudio' && /^(mousePressed|keyPressed|mouseClicked|touchStarted)$/.test(c.fn); }); } },
          { label: 'Adds to the score when a collision happens', test: function (f) { return f.ifs.some(function (i) { return /collide/.test(i.testSrc); }) && f.assignments.some(function (a) { return a.inIf && /score/i.test(a.base || '') && /\+/.test(a.op + (a.valueSrc || '')); }); } },
          { label: 'Shows the score with text()', test: function (f) { return f.has('text'); } },
          { label: 'Runs without errors for a few seconds (balls fall and reset)', runtime: true, frames: 150, expr: function () { return 'true'; }, test: function (v) { return v === true; } }
        ],
        hints: [
          'Break the game into rules: the paddle follows the mouse; the ball falls; IF they overlap THEN (sound, score, reset); IF the ball passes the bottom THEN reset. Which p5.collide2D function matches "rectangle meets circle"?',
          'collideRectCircle(paddleX, paddleY, paddleW, paddleH, ballX, ballY, ballSize) returns true on a catch. Make synth = new p5.MonoSynth() in setup and call synth.play(\'C5\', 0.5, 0, 0.15) on a catch. Put userStartAudio() in mousePressed().',
          `if (collideRectCircle(paddleX, paddleY, paddleW, paddleH, ballX, ballY, ballSize)) {
  score = ___;
  synth.play('C5', 0.5, 0, 0.15);
  ballY = 0;
  ballX = random(30, width - 30);
}`
        ],
        solution: `// Catch game: p5.collide2D detects the catch, p5.sound plays a note
let ballX = 200;
let ballY = 0;
let ballSize = 24;
let paddleW = 90;
let paddleH = 16;
let score = 0;
let synth;

function setup() {
  createCanvas(400, 400);
  synth = new p5.MonoSynth();
  textSize(20);
  describe('A paddle follows the mouse along the bottom. Catching the falling ball plays a note and adds a point.');
}

function draw() {
  background(29, 60, 52);
  let paddleX = mouseX - paddleW / 2;
  let paddleY = height - 40;

  fill(239, 232, 212);
  rect(paddleX, paddleY, paddleW, paddleH);
  fill(237, 139, 0);
  circle(ballX, ballY, ballSize);
  ballY = ballY + 4;

  // caught: the paddle and the ball overlap
  if (collideRectCircle(paddleX, paddleY, paddleW, paddleH, ballX, ballY, ballSize)) {
    score = score + 1;
    synth.play('C5', 0.5, 0, 0.15);
    resetBall();
  }
  // missed: the ball fell off the bottom
  if (ballY > height + ballSize) {
    resetBall();
  }

  fill(255);
  text('Score: ' + score, 16, 30);
}

function resetBall() {
  ballX = random(30, width - 30);
  ballY = 0;
}

// browsers only allow sound after a click
function mousePressed() {
  userStartAudio();
}`,
        solutionQuiz: [
          { q: 'Why does the catch reset the ball right away?', options: ['Otherwise the ball would still overlap the paddle next frame and score (and play) again', 'To make the game harder', 'collideRectCircle only works once', 'To save memory'], answer: 0, why: 'A collision lasts several frames. Moving the ball ends it, so each catch counts once.' },
          { q: 'Why is userStartAudio() in mousePressed()?', options: ['Browsers block sound until the user interacts; a click is the permission', 'It makes the sound louder', 'p5.sound requires it in every function', 'To play a click sound'], answer: 0, why: 'Autoplay rules protect users from surprise audio.' }
        ]
      },
      read: {
        context: 'An audio-reactive visual. Click the preview to start the sound, then move the mouse up and down. Explain how sound drives the picture.',
        code: `let osc;
let amp;

function setup() {
  createCanvas(400, 300);
  osc = new p5.Oscillator('sine');
  osc.freq(220);
  amp = new p5.Amplitude();
  amp.setInput(osc);
}

function draw() {
  background(20);
  let level = amp.getLevel();
  let size = map(level, 0, 0.5, 20, 250);
  fill(187, 221, 230);
  circle(width / 2, height / 2, size);
  // the mouse height sets the volume
  osc.amp(map(mouseY, height, 0, 0, 0.5), 0.05);
}

function mousePressed() {
  userStartAudio();
  osc.start();
}`,
        ideas: [
          { label: 'an oscillator makes a steady tone', keys: ['oscillator', 'tone', 'sine', '220', 'sound'], prompt: 'What makes the sound?' },
          { label: 'the mouse height controls the volume', keys: ['mouse', 'volume', 'loud', 'height', 'up', 'down'], prompt: 'What does moving the mouse change?' },
          { label: 'p5.Amplitude measures loudness every frame', keys: ['amplitude', 'level', 'loudness', 'measure', 'getlevel'], prompt: 'How does the sketch know how loud it is?' },
          { label: 'loudness sets the circle size (map)', keys: ['size', 'circle', 'bigger', 'map'], prompt: 'How does loudness become a picture?' },
          { label: 'sound starts only after a click', keys: ['click', 'press', 'start', 'browser', 'userstartaudio'], prompt: 'Why is the sound silent at first?' }
        ],
        questions: [
          { q: 'Before you click, why is the circle tiny and silent?', options: ['The oscillator has not started, and browsers block sound until a click, so the level is 0', 'The circle needs a sound file', 'map() returns 0 until the mouse moves'], answer: 0, why: ['osc.start() and userStartAudio() are both in mousePressed().', 'An oscillator makes sound without a file.', 'map() works fine; the level it gets is 0.'] },
          { q: 'Moving the mouse toward the top of the canvas makes the circle...', options: ['Bigger: mouseY near 0 maps to a louder volume, and the size follows loudness', 'Smaller', 'Move upward'], answer: 0, why: ['map(mouseY, height, 0, 0, 0.5) turns small mouseY into a high volume.', 'Check the direction of the map(): height maps to 0 and 0 maps to 0.5.', 'The circle is always drawn at the center.'] },
          { q: 'Which line connects what you hear to what you see?', options: ['amp.setInput(osc)', 'osc.freq(220)', 'background(20)'], answer: 0, why: ['It makes the Amplitude analyzer listen to the oscillator.', 'That sets the pitch.', 'That only clears the canvas.'] }
        ],
        model: 'An oscillator makes a 220 Hz sine tone, but it starts only when you click, because browsers block sound until the user interacts (userStartAudio). Each frame, the mouse height sets the volume: higher means louder. A p5.Amplitude analyzer listens to the oscillator (setInput) and reports how loud it is, and map() turns that level into the circle\'s size. So the picture follows the sound.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The machine-gun note',
          intent: 'Play ONE note each time the mouse enters the circle.',
          code: `let synth;

function setup() {
  createCanvas(400, 300);
  synth = new p5.MonoSynth();
}

function draw() {
  background(239, 232, 212);
  let hit = collidePointCircle(mouseX, mouseY, 200, 150, 120);
  if (hit) {
    fill(237, 139, 0);
  } else {
    fill(29, 60, 52);
  }
  circle(200, 150, 120);
  // play ONE note each time the mouse enters the circle
  if (hit) {
    synth.play('E4', 0.5, 0, 0.1);
  }
}

function mousePressed() {
  userStartAudio();
}`,
          type: 'logic', lines: [18, 19],
          causes: ['draw() runs every frame, so while the mouse stays inside, a new note starts about 60 times a second. It needs to remember whether it was already inside', 'collidePointCircle() is the wrong function', 'The note is too short', 'userStartAudio() should be in setup()'],
          cause: 0,
          why: 'Being inside is a state that lasts many frames. Entering is an event that happens once. To turn the state into an event, remember last frame\'s value: if (hit && !wasHit), then wasHit = hit at the end of draw().',
          fixed: `let synth;
let wasHit = false;

function setup() {
  createCanvas(400, 300);
  synth = new p5.MonoSynth();
}

function draw() {
  background(239, 232, 212);
  let hit = collidePointCircle(mouseX, mouseY, 200, 150, 120);
  if (hit) {
    fill(237, 139, 0);
  } else {
    fill(29, 60, 52);
  }
  circle(200, 150, 120);
  // play ONE note each time the mouse enters the circle
  if (hit && !wasHit) {
    synth.play('E4', 0.5, 0, 0.1);
  }
  wasHit = hit;
}

function mousePressed() {
  userStartAudio();
}`,
          fix: { test: function (f) { return f.ifs.some(function (i) { return /&&/.test(i.testSrc) && /!\s*\w+/.test(i.testSrc); }) && f.animatedGlobals.length > 0; }, fail: 'Remember last frame\'s value in a global, and play only when hit is true now but was false before.' }
        },
        {
          rating: 'black', title: 'Touching at a distance',
          intent: 'The circles turn red only when they actually touch.',
          code: `let rockX = 300;
let size = 60;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  let playerX = mouseX;
  // the circles turn red only when they actually touch
  if (dist(playerX, 100, rockX, 100) < size + size) {
    fill(155, 28, 28);
  } else {
    fill(29, 60, 52);
  }
  circle(playerX, 100, size);
  circle(rockX, 100, size);
}`,
          type: 'logic', lines: [12],
          causes: ['circle() takes a diameter, so each radius is size / 2. They touch when the distance is less than size, not size + size', 'dist() measures from the edges', 'mouseX should be mouseY', 'The rock is too far away'],
          cause: 0,
          why: 'Watch closely: the circles turn red with a 60-pixel gap between them. The rule "distance < r1 + r2" uses radii, but size is a diameter. size + size is twice too much. Collision code often looks right and is subtly off. Test it at the exact moment of contact.',
          fixed: `let rockX = 300;
let size = 60;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  let playerX = mouseX;
  // the circles turn red only when they actually touch
  if (dist(playerX, 100, rockX, 100) < size / 2 + size / 2) {
    fill(155, 28, 28);
  } else {
    fill(29, 60, 52);
  }
  circle(playerX, 100, size);
  circle(rockX, 100, size);
}`,
          fix: { test: function () { return true; },
            probes: [{ frames: 2, expr: '(function () { mouseX = 200; redraw(); return get(200, 100); })()', test: function (v) { return v && v[1] > v[0]; } }],
            fail: 'With the player at x = 200 there is a 40-pixel gap, so it should stay green.' }
        }
      ],
      judge: {
        context: { kind: 'Game', title: 'Coin blip' },
        spec: ['The player square moves with the arrow keys', 'Collecting a coin plays a sound and moves the coin', 'Sound starts only after a user action (browser rule)', 'The collision uses the player\'s whole square, not just one corner'],
        prompt: 'p5 game where a square collects a coin and it makes a sound',
        aiCode: `let px = 50;
let py = 200;
let coinX = 300;
let coinY = 200;
let osc;

function setup() {
  createCanvas(400, 400);
  osc = new p5.Oscillator('square');
  osc.amp(0);
  osc.start();
}

function draw() {
  background(255);
  if (keyIsDown(LEFT_ARROW)) { px -= 3; }
  if (keyIsDown(RIGHT_ARROW)) { px += 3; }
  if (keyIsDown(UP_ARROW)) { py -= 3; }
  if (keyIsDown(DOWN_ARROW)) { py += 3; }
  fill(112, 0, 46);
  square(px, py, 30);
  fill(237, 139, 0);
  circle(coinX, coinY, 20);
  if (collidePointCircle(px, py, coinX, coinY, 20)) {
    osc.amp(0.5, 0.05);
    osc.amp(0, 0.3, 0.1);
    coinX = random(width);
    coinY = random(height);
  }
}`,
        checklist: [
          { answer: 'yes', why: 'keyIsDown() moves the square while each arrow is held.' },
          { answer: 'yes', why: 'On a hit it blips the oscillator and moves the coin. (You only hear it if audio was allowed.)' },
          { answer: 'no', why: 'osc.start() runs in setup(), with no click. Most browsers block it, so it may be silent. There is no userStartAudio().' },
          { answer: 'no', why: 'collidePointCircle() tests only the top-left corner (px, py). Use collideRectCircle(px, py, 30, 30, ...).' }
        ],
        tryHint: 'Click the preview, then try to touch the coin with the bottom-right of the square. Does it count?',
        issue: {
          q: 'Why might this work when someone tested it but fail for your users?',
          options: ['Audio rules differ by browser and situation; starting sound in setup() without a click is usually blocked. Test in a real browser and follow the platform rules', 'The AI tested it, so it works', 'Sound always works in p5', 'Square waves are not allowed'],
          answer: 0,
          why: 'Code depends on its environment. Some failures only appear on real users\' devices.'
        },
        verdicts: {
          accept: 'Not yet. It may be silent for many users, and the collision is unfair to the player.',
          revise: 'Good call. Start audio in mousePressed() with userStartAudio(), and use collideRectCircle() with the full square.',
          reject: 'Defensible, but movement and coin logic work. Two targeted fixes meet the spec.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'start audio after a click or key press', keys: ['click', 'user', 'userstartaudio', 'gesture', 'key press', 'interact'] },
          { label: 'collide with the whole square', keys: ['collideRectCircle', 'whole square', 'full square', 'entire', 'rect'] },
          { label: 'what the sound should be', keys: ['sound', 'note', 'blip', 'beep', 'synth'] }
        ]
      }
    },

    /* ================================================================ 15 */
    {
      id: 15,
      title: 'Game Systems with p5play',
      tagline: 'Sprites, groups, physics, and the game loop.',
      concepts: ['Sprite', 'Group', 'colliders', 'kb input', 'collides / overlaps', 'win and lose conditions'],
      learn: {
        brief: [
          '<strong>p5play</strong> adds game building blocks: <strong>sprites</strong> (things with position, size, physics, and collisions) and <strong>groups</strong> (sets of similar sprites).',
          '<code>new Sprite(x, y, w, h)</code> makes a box; <code>new Sprite(x, y, d)</code> makes a circle. p5play moves and draws every sprite automatically after <code>draw()</code>.',
          'Physics: <code>world.gravity.y = 10</code> pulls sprites down. A <code>\'static\'</code> collider (like a floor) never moves.',
          'Input: <code>kb.pressing(\'left\')</code> is true while a key is held; <code>kb.presses(\'up\')</code> is true only on the frame it goes down.',
          'Contact: <code>a.collides(b)</code> is true at the moment they bump; <code>a.overlaps(b)</code> lets them pass through each other and is true when the overlap starts. <code>overlapping()</code> stays true for every frame of the overlap.'
        ],
        sayIt: [
          ['player = new Sprite(200, 300, 40, 40);', 'Create a 40 by 40 box sprite at (200, 300) and call it player.'],
          ['if (kb.pressing(\'right\')) { player.vel.x = 4; }', 'While the right arrow (or D) is held, give the player a horizontal velocity of 4.'],
          ['player.overlaps(coins, collect);', 'Whenever the player starts overlapping any coin in the coins group, call collect with the two sprites.']
        ],
        terms: [
          ['sprite', 'A game object with position, size, physics, and collisions.'],
          ['group', 'A collection of sprites that share settings and can be checked all at once.'],
          ['collider', 'How a sprite takes part in physics: dynamic (moves), static (never moves), or none.'],
          ['game state', 'What the game remembers: score, lives, playing or game over.']
        ],
        example: `let player;
let floor;

function setup() {
  createCanvas(400, 300);
  world.gravity.y = 10;
  floor = new Sprite(200, 290, 400, 20, 'static');
  floor.color = color(29, 60, 52);
  player = new Sprite(200, 100, 40, 40);
  player.color = color(112, 0, 46);
  player.rotationLock = true;
}

function draw() {
  background(239, 232, 212);
  if (kb.pressing('left')) {
    player.vel.x = -4;
  } else if (kb.pressing('right')) {
    player.vel.x = 4;
  } else {
    player.vel.x = 0;
  }
  // jump only when standing on the floor
  if (kb.presses('up') && player.colliding(floor)) {
    player.vel.y = -6;
  }
}`,
        predict: {
          q: 'Before you run it: what happens to the player when the sketch starts?',
          options: ['It falls, lands on the floor, then moves with the arrow keys (up jumps)', 'It floats where it is', 'It falls through the floor', 'Nothing appears, because there is no rect() or square()'],
          answer: 0,
          why: 'Gravity pulls the dynamic player down; the static floor stops it. p5play draws sprites for you, so no shape calls are needed.'
        },
        tryThis: ['Change world.gravity.y to 2. How does the jump feel?', 'Add a second static platform in the air.', 'Remove player.rotationLock = true and jump off an edge. What happens?']
      },
      build: {
        context: { kind: 'Game', title: 'Coin collector prototype', story: 'A designer wants a quick prototype to test a top-down collecting game: the player moves with the keyboard, collects coins scattered around, and wins when all coins are gone.' },
        plan: PLAN,
        task: 'Make a player Sprite that moves with kb, a Group of coins, a score that goes up when the player overlaps a coin (remove the coin), and a win message when every coin is collected.',
        starter: `let player;
let coins;
let score = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(29, 60, 52);
}`,
        checks: [
          { label: 'Creates a player sprite with new Sprite', test: function (f) { return f.news.some(function (n) { return n.name === 'Sprite'; }); } },
          { label: 'Uses a Group for the coins', test: function (f) { return f.news.some(function (n) { return n.name === 'Group'; }); } },
          { label: 'Moves the player with kb', test: function (f) { return f.calls.some(function (c) { return /^kb\.(pressing|presses|pressed|holding)$/.test(c.name); }); } },
          { label: 'Scores with overlaps() or collides()', test: function (f) { return f.calls.some(function (c) { return /\.(overlaps|collides)$/.test(c.name); }); } },
          { label: 'Has a win or lose condition (an if that checks the game state)', test: function (f) { return f.ifs.some(function (i) { return /score|length|lives|count|remaining|won|over/i.test(i.testSrc); }); } },
          { label: 'Runs without errors (p5play loaded)', runtime: true, frames: 30, expr: function () { return 'typeof world === "object"'; }, test: function (v) { return v === true; } }
        ],
        hints: [
          'Name the parts of the game: who the player is, what the collectibles are, what happens on contact, and how you win. Each maps to one p5play feature.',
          'coins = new Group(); then in a loop: new coins.Sprite(random(30, 370), random(30, 370), 16). Use player.overlaps(coins, collect); with function collect(p, coin) { coin.remove(); score++; }. You win when coins.length === 0.',
          `coins = new Group();
coins.color = color(237, 139, 0);
coins.collider = 'static';
for (let i = 0; i < 8; i++) {
  new coins.Sprite(random(30, 370), random(30, 370), 16);
}
player.overlaps(coins, collect);

function collect(p, coin) {
  coin.remove();
  score = ___;
}`
        ],
        solution: `// Coin collector: sprites, a group, scoring, and a win condition
let player;
let coins;
let score = 0;

function setup() {
  createCanvas(400, 400);
  player = new Sprite(200, 200, 30, 30);
  player.color = color(112, 0, 46);
  player.rotationLock = true;

  coins = new Group();
  coins.color = color(237, 139, 0);
  coins.collider = 'static';
  for (let i = 0; i < 8; i++) {
    new coins.Sprite(random(30, 370), random(30, 370), 16);
  }
  player.overlaps(coins, collect);
  textSize(20);
  describe('A maroon square collects orange coins on a dark green field. The score is shown at the top.');
}

function draw() {
  background(29, 60, 52);
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left')) { player.vel.x = -3; }
  if (kb.pressing('right')) { player.vel.x = 3; }
  if (kb.pressing('up')) { player.vel.y = -3; }
  if (kb.pressing('down')) { player.vel.y = 3; }

  fill(255);
  text('Score: ' + score, 16, 30);
  // win condition: every coin collected
  if (coins.length === 0) {
    text('You win!', 160, 200);
  }
}

// p5play calls this when the player starts overlapping a coin
function collect(p, coin) {
  coin.remove();
  score = score + 1;
}`,
        solutionQuiz: [
          { q: 'Why overlaps() instead of collides() for coins?', options: ['The player should pass through coins and collect them, not bounce off them', 'collides() does not work with groups', 'overlaps() is faster', 'They are the same'], answer: 0, why: 'Overlapping turns off the physical bump between the two.' },
          { q: 'How does the code know you have won?', options: ['coins.length === 0: every coin has been removed from the group', 'score === 10', 'The player stops moving', 'p5play shows it automatically'], answer: 0, why: 'A group is a list of sprites; removed coins leave the list.' }
        ]
      },
      read: {
        context: 'A dodging game. Click the preview and use the up and down arrows. Explain the game state and the rules.',
        code: `let player;
let enemies;
let lives = 3;

function setup() {
  createCanvas(400, 300);
  player = new Sprite(60, 150, 30, 30);
  player.color = color(29, 60, 52);
  player.rotationLock = true;

  enemies = new Group();
  enemies.color = color(155, 28, 28);
  enemies.overlaps(enemies);
  for (let i = 0; i < 3; i++) {
    let e = new enemies.Sprite(250 + i * 50, 60 + i * 90, 24);
    e.vel.x = -2;
  }
  textSize(18);
}

function draw() {
  background(239, 232, 212);
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('up')) { player.vel.y = -3; }
  if (kb.pressing('down')) { player.vel.y = 3; }

  for (let e of enemies) {
    e.vel.x = -2;
    e.vel.y = 0;
    if (e.x < -20) { e.x = width + 20; }
    if (player.collides(e)) {
      lives = lives - 1;
      e.x = width + 20;
    }
  }

  fill(0);
  text('Lives: ' + lives, 10, 24);
  if (lives <= 0) {
    noLoop();
    text('Game over', 150, 150);
  }
}`,
        ideas: [
          { label: 'enemies are a group moving left and wrapping around', keys: ['group', 'enemies', 'left', 'wrap', 'right side', 'loop around'], prompt: 'What do the enemies do?' },
          { label: 'up and down arrows move the player', keys: ['up', 'down', 'arrow', 'kb'], prompt: 'How does the player move?' },
          { label: 'colliding costs a life and resets that enemy', keys: ['collid', 'collides', 'life', 'lives', 'hit'], prompt: 'What happens on contact?' },
          { label: 'game over at 0 lives (noLoop)', keys: ['game over', 'noloop', 'stop', 'freeze', '0 lives', 'zero'], prompt: 'When does the game end, and how?' }
        ],
        questions: [
          { q: 'player.collides(e) is true...', options: ['Only on the first frame of contact, so one hit costs one life', 'On every frame they touch', 'Whenever the enemy moves'], answer: 0, why: ['collides() reports the moment of contact. (colliding() would count every frame.)', 'That is colliding(), not collides().', 'Only contact matters.'] },
          { q: 'What does noLoop() do when lives reach 0?', options: ['Stops draw() from repeating, which freezes the game', 'Deletes the sprites', 'Restarts the game'], answer: 0, why: ['No more frames run, so nothing moves.', 'Sprites stay where they are.', 'Nothing restarts it.'] },
          { q: 'for (let e of enemies) means...', options: ['Visit each sprite in the enemies group, calling it e each time', 'Create a new enemy', 'Count the enemies'], answer: 0, why: ['for...of loops over the items of a list, like a group.', 'Nothing new is created.', 'It visits each one; enemies.length counts them.'] }
        ],
        model: 'The player moves up and down with the arrow keys. Three enemy sprites in a group move left and wrap back to the right edge when they leave. Each frame, the for...of loop checks every enemy: collides() is true only at the moment of contact, so each hit costs exactly one life and sends that enemy back to the right. The game state is the lives count. At 0 lives, noLoop() stops the game and "Game over" is shown.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The sticky slide',
          intent: 'Hold the arrow keys to slide left and right.',
          code: `let player;

function setup() {
  createCanvas(400, 300);
  player = new Sprite(200, 150, 40, 40);
  player.color = color(112, 0, 46);
}

function draw() {
  background(239, 232, 212);
  player.vel.x = 0;
  // hold the arrow keys to slide left and right
  if (kb.presses('left')) { player.vel.x = -4; }
  if (kb.presses('right')) { player.vel.x = 4; }
}`,
          type: 'logic', lines: [13, 14],
          causes: ['kb.presses() is true only on the first frame a key goes down; holding a key needs kb.pressing()', 'vel.x should be vel.y', 'The sprite needs gravity to move', 'player.vel.x = 0 deletes the player'],
          cause: 0,
          why: 'Each press nudges the player for a single frame (4 pixels), then vel.x is reset to 0. presses() is for one-time actions like jumping or shooting; pressing() is for held actions like walking.',
          fixed: `let player;

function setup() {
  createCanvas(400, 300);
  player = new Sprite(200, 150, 40, 40);
  player.color = color(112, 0, 46);
}

function draw() {
  background(239, 232, 212);
  player.vel.x = 0;
  // hold the arrow keys to slide left and right
  if (kb.pressing('left')) { player.vel.x = -4; }
  if (kb.pressing('right')) { player.vel.x = 4; }
}`,
          fix: { test: function (f) { return !f.has('kb.presses') && f.has('kb.pressing'); } }
        },
        {
          rating: 'black', title: 'The coin worth fifty',
          intent: 'Touching the coin gives exactly one point, and the coin disappears.',
          code: `let player;
let coin;
let score = 0;

function setup() {
  createCanvas(400, 300);
  player = new Sprite(100, 150, 30, 30);
  player.color = color(112, 0, 46);
  coin = new Sprite(250, 150, 20);
  coin.color = color(237, 139, 0);
  coin.collider = 'static';
  player.vel.x = 1;
  textSize(20);
}

function draw() {
  background(29, 60, 52);
  // collect the coin: one point, then the coin disappears
  if (player.overlapping(coin)) {
    score = score + 1;
  }
  fill(255);
  text('Score: ' + score, 16, 30);
}`,
          type: 'logic', lines: [19, 20],
          causes: ['overlapping() is true on every frame of the overlap, so the score climbs once per frame, and the coin is never removed', 'The coin should be dynamic', 'score should be declared in draw()', 'text() adds extra points'],
          cause: 0,
          why: 'As the player slides across the coin, overlapping() stays true for dozens of frames, and every one of them adds a point. overlaps() is true only when the overlap starts, and coin.remove() makes sure it cannot happen again. This is the same "state vs. event" idea as Level 7\'s click counter.',
          fixed: `let player;
let coin;
let score = 0;

function setup() {
  createCanvas(400, 300);
  player = new Sprite(100, 150, 30, 30);
  player.color = color(112, 0, 46);
  coin = new Sprite(250, 150, 20);
  coin.color = color(237, 139, 0);
  coin.collider = 'static';
  player.vel.x = 1;
  textSize(20);
}

function draw() {
  background(29, 60, 52);
  // collect the coin: one point, then the coin disappears
  if (player.overlaps(coin)) {
    score = score + 1;
    coin.remove();
  }
  fill(255);
  text('Score: ' + score, 16, 30);
}`,
          fix: { test: function (f) { return f.has('player.overlaps') || f.has('player.collides'); },
            probes: [{ frames: 240, expr: 'score', test: function (v) { return v === 1; } }], fail: 'After the player passes the coin, the score should be exactly 1.' }
        }
      ],
      judge: {
        context: { kind: 'Game', title: 'Rock dodge' },
        spec: ['The player moves left and right with the arrow keys', 'Falling enemies come from a Group (more than one)', 'Touching an enemy ends the game: play stops and "Game over" shows', 'The score rises over time, only while the player is alive'],
        prompt: 'make a dodge game in p5play where rocks fall and you lose if hit',
        aiCode: `let player;
let enemy;
let score = 0;
let gameOver = false;

function setup() {
  createCanvas(400, 400);
  world.gravity.y = 5;
  player = new Sprite(200, 370, 40, 20, 'static');
  enemy = new Sprite(random(width), -20, 25);
  textSize(20);
}

function draw() {
  background(239, 232, 212);
  if (kb.pressing('left')) { player.x -= 5; }
  if (kb.pressing('right')) { player.x += 5; }
  if (enemy.y > height + 20) {
    enemy.y = -20;
    enemy.x = random(width);
  }
  if (player.collides(enemy)) {
    gameOver = true;
  }
  score = score + 1;
  fill(0);
  text('Score: ' + score, 10, 25);
  if (gameOver) {
    text('Game over', 150, 200);
  }
}`,
        checklist: [
          { answer: 'yes', why: 'kb.pressing() moves the player.' },
          { answer: 'no', why: 'There is one enemy sprite and no Group.' },
          { answer: 'partly', why: 'The message appears, but the game keeps running: the enemy keeps falling and nothing stops.' },
          { answer: 'partly', why: 'The score rises every frame, even after "Game over".' }
        ],
        issue: {
          q: 'Two requirements are only partly met: the message appears, but play and scoring continue. What is the lesson?',
          options: ['Check what a requirement means, not just whether something related appears. "Ends the game" means play and scoring stop', 'Messages are enough for a prototype', 'p5play cannot stop a game', 'The score should be removed'],
          answer: 0,
          why: 'Surface checks ("I see Game over") miss behavior. Test what happens after the event, too.'
        },
        verdicts: {
          accept: 'No. The core loop never really ends, and the enemies are not a group.',
          revise: 'Good call. Use a Group of enemies, stop scoring and movement on game over (noLoop() or a state check), and fix the enemy speed reset.',
          reject: 'Defensible. The state handling is the heart of the game, and writing it yourself is good practice.'
        },
        best: ['revise', 'reject'],
        promptIdeas: [
          { label: 'a Group of several enemies', keys: ['group', 'several', 'multiple', 'many'] },
          { label: 'game over stops play', keys: ['stop', 'noloop', 'freeze', 'end', 'state'] },
          { label: 'score only while alive', keys: ['alive', 'only while', 'stops', 'until'] }
        ]
      }
    },

    /* ================================================================ 16 */
    {
      id: 16,
      title: 'Particle Systems',
      tagline: 'Complex effects from simple rules.',
      concepts: ['particle class', 'lifespan', 'velocity and forces', 'p5.Vector', 'emitter', 'removing dead particles'],
      learn: {
        brief: [
          'A <strong>particle system</strong> is many small objects following simple rules. Together they look like fire, smoke, snow, or magic.',
          'Each particle keeps a position, a velocity, and a lifespan. Every frame: apply forces (like gravity) to the velocity, add the velocity to the position, and lower the lifespan.',
          '<code>createVector(x, y)</code> bundles x and y together: <code>this.pos.add(this.vel)</code> moves in both directions at once.',
          'An <strong>emitter</strong> creates particles. Dead particles must be removed, or the array grows forever and the sketch slows down.',
          'Remove while looping <strong>backwards</strong>, so removing one item does not skip the next (remember Level 10\'s clearance sale bug).'
        ],
        sayIt: [
          ['this.pos.add(this.vel);', 'Add the velocity vector to the position vector: move by vel.x and vel.y at once.'],
          ['this.vel.add(gravity);', 'Gravity changes the velocity a little every frame, so the particle curves downward.'],
          ['fill(237, 139, 0, this.life);', 'Orange, with an opacity equal to the remaining life, so it fades out as it dies.']
        ],
        terms: [
          ['particle', 'One small object in the system.'],
          ['emitter', 'The place, or code, that creates new particles.'],
          ['vector', 'A value with x and y (and z) parts, used for position, velocity, and forces.'],
          ['force', 'Something that changes velocity, like gravity or wind.']
        ],
        example: `let particles = [];

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(-3, -1));
    this.life = 255;
  }

  update() {
    this.vel.add(createVector(0, 0.05)); // gravity
    this.pos.add(this.vel);
    this.life = this.life - 3;
  }

  display() {
    noStroke();
    fill(237, 139, 0, this.life);
    circle(this.pos.x, this.pos.y, 12);
  }

  isDead() {
    return this.life <= 0;
  }
}

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20);
  particles.push(new Particle(width / 2, height - 50));
  // loop backwards so removing a particle does not skip the next one
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
}`,
        predict: {
          q: 'Before you run it: after a few seconds, about how many particles exist at once?',
          options: ['About 85: one new particle each frame, each living 255 / 3 = 85 frames', 'It keeps growing forever', 'Exactly 255', 'Just 1'],
          answer: 0,
          why: 'Births and deaths balance out: one per frame in, one per frame out after 85 frames. Try print(particles.length) to check.'
        },
        tryThis: ['Push 3 particles per frame. How many exist now?', 'Make gravity negative so the sparks rise like smoke.', 'Shrink each particle as it ages: use this.life in the size.']
      },
      build: {
        context: { kind: 'Game', title: 'Spell effect', story: 'A fantasy game needs a reusable spell effect: when the player clicks, sparks burst from that spot, fall with gravity, fade out, and disappear, without slowing the game down over time.' },
        plan: PLAN,
        task: 'Write a particle class with a position, a velocity, and a lifespan. Apply a force (gravity) to the velocity, fade and remove dead particles with splice, and emit a burst from the mouse when it is clicked.',
        starter: `let sparks = [];

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20, 15, 30);
}`,
        checks: [
          { label: 'Defines a particle class with at least two methods', test: function (f) { return f.classes.some(function (c) { return c.methods.filter(function (m) { return m.name !== 'constructor'; }).length >= 2; }); } },
          { label: 'Velocity changes the position', test: function (f, code) { return /this\.(pos|position|loc|location|x|y)\w*\s*(\.add\(|\+=|=\s*this\.\w+(\.\w+)?\s*\+)/.test(code); } },
          { label: 'A force (like gravity) changes the velocity', test: function (f, code) { return /this\.(vel|velocity|vx|vy|speed)\w*\s*(\.add\(|\+=|=\s*this\.\w+\s*\+)/.test(code); }, fail: 'Add gravity to the velocity every frame (this.vel.add(gravity) or this.vy += 0.1), not to the position.' },
          { label: 'A lifespan counts down (and is used to fade)', test: function (f, code) { return /this\.(life|lifespan|alpha|age|ttl|fade|opacity)\w*\s*(-=|=\s*this\.\w+\s*-)/i.test(code); } },
          { label: 'Removes dead particles with splice() (or filter)', test: function (f) { return f.calls.some(function (c) { return /\.(splice|filter)$/.test(c.name); }); } },
          { label: 'Clicking emits particles, and they are all gone 400 frames later', runtime: true, frames: 2,
            expr: function (f) {
              var a = H.firstArrayGlobal(f);
              if (!a) { return null; }
              return '(function () { mouseX = 200; mouseY = 200; for (var k = 0; k < 3; k++) { if (typeof mousePressed === "function") { mousePressed(); } } mouseIsPressed = true; redraw(3); mouseIsPressed = false; var born = ' + a + '.length; redraw(400); return [born, ' + a + '.length]; })()';
            },
            test: function (v) { return Array.isArray(v) && v[0] > 0 && v[1] === 0; }, fail: 'After a click, some particles should exist; after their lifespan runs out, the array should be empty again.' }
        ],
        hints: [
          'Describe one spark\'s life in four steps: born at the click, pushed by gravity, fades, removed. Each step is a line of code, in the constructor, update(), display(), or the removal check.',
          'In the constructor: this.pos = createVector(x, y); this.vel = createVector(random(-3, 3), random(-5, -1)); this.life = 255. In update(): this.vel.add(gravity); this.pos.add(this.vel); this.life -= 4. In draw(), loop backwards and splice(i, 1) when life <= 0. In mousePressed(), push 40 sparks.',
          `for (let i = sparks.length - 1; i >= 0; i--) {
  sparks[i].update();
  sparks[i].display();
  if (sparks[i].life <= 0) {
    sparks.splice(___, 1);
  }
}

function mousePressed() {
  for (let i = 0; i < 40; i++) {
    sparks.push(new Spark(mouseX, mouseY));
  }
}`
        ],
        solution: `// Spell effect: sparks burst from each click, fall, fade, and are removed
class Spark {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-3, 3), random(-5, -1));
    this.life = 255;
    this.size = random(4, 10);
  }

  update() {
    this.vel.add(gravity);   // a force changes velocity
    this.pos.add(this.vel);  // velocity changes position
    this.life = this.life - 4;
  }

  display() {
    fill(187, 221, 230, this.life);
    circle(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.life <= 0;
  }
}

let sparks = [];
let gravity;

function setup() {
  createCanvas(400, 400);
  noStroke();
  gravity = createVector(0, 0.15);
  describe('Click to cast a spell: light blue sparks burst from the click, fall, and fade away.');
}

function draw() {
  background(20, 15, 30);
  // loop backwards so removing a spark does not skip the next one
  for (let i = sparks.length - 1; i >= 0; i--) {
    sparks[i].update();
    sparks[i].display();
    if (sparks[i].isDead()) {
      sparks.splice(i, 1);
    }
  }
}

// the emitter: each click releases 40 sparks
function mousePressed() {
  for (let i = 0; i < 40; i++) {
    sparks.push(new Spark(mouseX, mouseY));
  }
}`,
        solutionQuiz: [
          { q: 'Why add gravity to the velocity instead of to the position?', options: ['A force changes velocity over time, which makes a curved, accelerating fall. Added to position, it would just shift everything by a constant amount', 'Vectors cannot be added to positions', 'It is faster', 'No reason'], answer: 0, why: 'Force → velocity → position is how motion works, in physics and in code.' },
          { q: 'What would happen without the splice()?', options: ['Dead sparks would stay in the array forever, and every click would make the sketch a little slower', 'Nothing; they are invisible anyway', 'The sparks would not fade', 'The program would crash right away'], answer: 0, why: 'Invisible is not gone: each one still costs an update() and display() every frame.' }
        ]
      },
      read: {
        context: 'A snowfall system. Move the mouse left and right. Explain how 200 flakes are managed without ever removing any.',
        code: `class Flake {
  constructor() {
    this.x = random(width);
    this.y = random(-height, 0);
    this.size = random(2, 6);
    this.speed = this.size * 0.4;
  }

  update(wind) {
    this.y = this.y + this.speed;
    this.x = this.x + wind;
    if (this.y > height) {
      this.y = random(-50, 0);
      this.x = random(width);
    }
  }

  display() {
    circle(this.x, this.y, this.size);
  }
}

let flakes = [];

function setup() {
  createCanvas(400, 400);
  noStroke();
  for (let i = 0; i < 200; i++) {
    flakes.push(new Flake());
  }
}

function draw() {
  background(20, 30, 60);
  fill(255);
  let wind = map(mouseX, 0, width, -1, 1);
  for (let f of flakes) {
    f.update(wind);
    f.display();
  }
}`,
        ideas: [
          { label: '200 flake objects made in setup()', keys: ['200', 'flake', 'object', 'class'], prompt: 'How many flakes are there, and where are they made?' },
          { label: 'bigger flakes fall faster (speed comes from size)', keys: ['bigger', 'faster', 'size', 'speed', 'depth', 'closer'], prompt: 'Why do some flakes fall faster?' },
          { label: 'the mouse controls the wind', keys: ['mouse', 'wind', 'left', 'right', 'drift'], prompt: 'What does the mouse do?' },
          { label: 'flakes recycle to the top instead of being removed', keys: ['recycl', 'reuse', 'back to the top', 'top', 'reset', 'reappear'], prompt: 'What happens at the bottom?' }
        ],
        questions: [
          { q: 'Why do bigger flakes fall faster?', options: ['this.speed = this.size * 0.4, so speed is tied to size, which looks like depth', 'Gravity pulls big things harder in p5', 'They do not'], answer: 0, why: ['Near things look bigger and move faster: a cheap 3D illusion.', 'There is no gravity force here at all.', 'Watch closely, or read the constructor.'] },
          { q: 'This system never removes particles. Why is that OK here?', options: ['Each flake is recycled to the top, so the array always holds exactly 200', 'p5 removes them automatically', 'It is not OK; it will slow down'], answer: 0, why: ['The count never grows, so performance stays steady.', 'p5 does not manage your arrays.', 'Nothing is ever added after setup().'] },
          { q: 'With the mouse at the left edge, the snow...', options: ['Drifts left: wind is -1', 'Drifts right', 'Stops falling'], answer: 0, why: ['map(0, 0, width, -1, 1) is -1.', 'That happens at the right edge.', 'Wind only affects x.'] }
        ],
        model: 'setup() creates 200 Flake objects at random positions above and on the canvas. Each flake\'s speed comes from its size, so bigger flakes fall faster, which looks like depth. Each frame, the mouse position becomes a wind value from -1 to 1, and every flake moves down by its speed and sideways by the wind. When a flake passes the bottom, it is recycled to just above the top at a new x, so the system never needs to add or remove flakes.'
      },
      bugs: [
        {
          rating: 'blue', title: 'Smoke that will not appear',
          intent: 'Smoke puffs rise from a chimney and fade out.',
          code: `class Puff {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = random(-1.5, -0.5);
    this.life = 200;
  }

  update() {
    this.y = this.y + this.vy;
    this.life = this.life - 2;
  }

  display() {
    fill(200, this.life);
    circle(this.x, this.y, 30);
  }
}

let puffs = [];

function setup() {
  createCanvas(400, 400);
  noStroke();
}

function draw() {
  background(29, 60, 52);
  puffs.push(new Puff(200 + random(-10, 10), 350));
  for (let i = puffs.length - 1; i >= 0; i--) {
    puffs[i].update();
    puffs[i].display();
    // remove puffs that have faded out
    if (puffs[i].life > 0) {
      puffs.splice(i, 1);
    }
  }
}`,
          type: 'logic', lines: [34],
          causes: ['The condition is backwards: it removes puffs that are still alive, so each one is deleted the same frame it is born', 'The loop should go forwards', 'fill(200, this.life) is invalid', 'vy should be positive'],
          cause: 0,
          why: 'Only a faint flicker at the chimney: every puff is drawn once, then immediately removed, because life > 0 is true for every new puff. The comment says "faded out", which means life <= 0. Comparing the comment with the code reveals the bug.',
          fixed: `class Puff {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = random(-1.5, -0.5);
    this.life = 200;
  }

  update() {
    this.y = this.y + this.vy;
    this.life = this.life - 2;
  }

  display() {
    fill(200, this.life);
    circle(this.x, this.y, 30);
  }
}

let puffs = [];

function setup() {
  createCanvas(400, 400);
  noStroke();
}

function draw() {
  background(29, 60, 52);
  puffs.push(new Puff(200 + random(-10, 10), 350));
  for (let i = puffs.length - 1; i >= 0; i--) {
    puffs[i].update();
    puffs[i].display();
    // remove puffs that have faded out
    if (puffs[i].life <= 0) {
      puffs.splice(i, 1);
    }
  }
}`,
          fix: { test: function () { return true; }, probes: [{ frames: 60, expr: 'puffs.length', test: function (v) { return v > 20 && v < 150; } }], fail: 'Puffs should stay alive until their life runs out.' }
        },
        {
          rating: 'double', title: 'The fountain that never falls',
          intent: 'Water shoots up from a fountain, then curves back down.',
          code: `class Drop {
  constructor() {
    this.pos = createVector(200, 380);
    this.vel = createVector(random(-1.5, 1.5), random(-7, -5));
    this.life = 255;
  }

  update() {
    this.pos.add(gravity);
    this.pos.add(this.vel);
    this.life = this.life - 2;
  }

  display() {
    fill(187, 221, 230, this.life);
    circle(this.pos.x, this.pos.y, 6);
  }
}

let drops = [];
let gravity;

function setup() {
  createCanvas(400, 400);
  noStroke();
  gravity = createVector(0, 0.15);
}

function draw() {
  background(20, 30, 60);
  drops.push(new Drop());
  for (let i = drops.length - 1; i >= 0; i--) {
    drops[i].update();
    drops[i].display();
    if (drops[i].life <= 0) {
      drops.splice(i, 1);
    }
  }
}`,
          type: 'logic', lines: [9],
          causes: ['Gravity is added to the position instead of the velocity, so it never changes the speed and there is no curve', 'gravity should be negative', 'The drops need more life', 'createVector() cannot be used in a constructor'],
          cause: 0,
          why: 'The drops shoot up in straight lines and leave the top. Added to the position, gravity just shifts each drop down 0.15 pixels per frame, a tiny constant nudge. Added to the velocity, it slows the climb a little more each frame until the drop turns and falls. Force changes velocity; velocity changes position.',
          fixed: `class Drop {
  constructor() {
    this.pos = createVector(200, 380);
    this.vel = createVector(random(-1.5, 1.5), random(-7, -5));
    this.life = 255;
  }

  update() {
    this.vel.add(gravity);
    this.pos.add(this.vel);
    this.life = this.life - 2;
  }

  display() {
    fill(187, 221, 230, this.life);
    circle(this.pos.x, this.pos.y, 6);
  }
}

let drops = [];
let gravity;

function setup() {
  createCanvas(400, 400);
  noStroke();
  gravity = createVector(0, 0.15);
}

function draw() {
  background(20, 30, 60);
  drops.push(new Drop());
  for (let i = drops.length - 1; i >= 0; i--) {
    drops[i].update();
    drops[i].display();
    if (drops[i].life <= 0) {
      drops.splice(i, 1);
    }
  }
}`,
          fix: { test: function (f) { return f.calls.some(function (c) { return c.name === 'this.vel.add'; }); },
            probes: [{ frames: 120, expr: 'drops.some(function (d) { return d.vel.y > 0; })', test: function (v) { return v === true; } }], fail: 'Some drops should be falling (moving down) after a couple of seconds.' }
        }
      ],
      judge: {
        context: { kind: 'Game', title: 'Campfire' },
        spec: ['Particles rise from a fire at the bottom center', 'Each particle fades out and is removed when it dies', 'Color shifts from yellow toward red as it ages', 'Runs for minutes without slowing down'],
        prompt: 'p5 fire particle effect',
        aiCode: `let particles = [];

function setup() {
  createCanvas(400, 400);
  noStroke();
}

function draw() {
  background(0);
  for (let i = 0; i < 5; i++) {
    particles.push({ x: 200, y: 380, vx: random(-1, 1), vy: random(-3, -1), life: 255 });
  }
  for (let p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 3;
    fill(255, p.life, 0, p.life);
    circle(p.x, p.y, 16);
  }
}`,
        checklist: [
          { answer: 'yes', why: 'They start at (200, 380) and move up.' },
          { answer: 'partly', why: 'They fade, but they are never removed from the array.' },
          { answer: 'yes', why: 'Green follows life: (255, 255, 0) is yellow, and it moves toward (255, 0, 0), red.' },
          { answer: 'no', why: 'Five particles are added per frame and never removed: about 18,000 per minute. It will slow down.' }
        ],
        tryHint: 'Add print(particles.length); to the end of draw(), run it, and watch the console.',
        issue: {
          q: 'How could you check requirement 4 without waiting for minutes?',
          options: ['Print particles.length and watch whether it keeps growing', 'Watch the animation; if it looks smooth, it is fine', 'Ask the AI whether it slows down', 'Make the canvas smaller'],
          answer: 0,
          why: 'Measure, do not guess. A number that only grows means a leak, long before you can see any slowdown.'
        },
        verdicts: {
          accept: 'No. It looks great for a minute, then keeps getting slower.',
          revise: 'Good call. Loop backwards and splice particles whose life is <= 0. A Particle class would also make it easier to extend.',
          reject: 'Defensible, but the visual logic is good. One removal loop meets the spec.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'remove dead particles', keys: ['remove', 'splice', 'delete', 'dead', 'filter'] },
          { label: 'steady performance over time', keys: ['slow', 'performance', 'length', 'memory', 'minutes', 'steady'] },
          { label: 'a particle class', keys: ['class'] }
        ]
      }
    },

    /* ================================================================ 17 */
    {
      id: 17,
      title: '3D Basics',
      tagline: 'WEBGL, primitives, and transformations.',
      concepts: ['WEBGL', '3D primitives', 'translate()', 'rotateX/Y/Z()', 'push() / pop()', 'orbitControl()'],
      learn: {
        brief: [
          '<code>createCanvas(400, 400, WEBGL)</code> switches to 3D. In WEBGL mode, <strong>(0, 0, 0) is the center</strong> of the canvas, not the top-left.',
          'x goes right, y goes down, and z comes toward you.',
          'Shapes are drawn at the origin: <code>box(80)</code>, <code>sphere(40)</code>, <code>torus(50, 15)</code>, <code>cone()</code>, <code>cylinder()</code>. Use <code>translate(x, y, z)</code> first to move them.',
          '<code>rotateX/Y/Z(angle)</code> turn everything drawn after them. Angles are in radians: <code>frameCount * 0.01</code> is a slow spin.',
          '<code>push()</code> saves the current position and rotation; <code>pop()</code> restores them. Wrap each object so its moves do not affect the next one.',
          '<code>normalMaterial()</code> colors faces by direction, so 3D shape shows up without lights. <code>orbitControl()</code> lets you drag to look around.'
        ],
        sayIt: [
          ['translate(100, 0, 0);', 'Move the origin 100 pixels to the right. Everything drawn after starts there.'],
          ['rotateY(frameCount * 0.01);', 'Turn around the vertical axis a little more each frame.'],
          ['push(); ... pop();', 'Save the current transformation, draw something with its own moves, then restore it.']
        ],
        terms: [
          ['WEBGL', 'p5\'s 3D drawing mode.'],
          ['transformation', 'A move (translate), turn (rotate), or resize (scale) of the coordinate system.'],
          ['radian', 'The unit p5 uses for angles. A full turn is TWO_PI (about 6.28).'],
          ['primitive', 'A built-in 3D shape like box or sphere.']
        ],
        example: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(239, 232, 212);
  orbitControl();
  normalMaterial();

  push();
  translate(-100, 0, 0);
  rotateY(frameCount * 0.01);
  box(80);
  pop();

  push();
  translate(100, 0, 0);
  rotateX(frameCount * 0.02);
  torus(50, 15);
  pop();
}`,
        predict: {
          q: 'Before you run it: where does the box appear, and does its rotation affect the torus?',
          options: ['Left of center, spinning; push/pop keep its moves from affecting the torus', 'Top-left corner, like 2D mode', 'Center; translate() does nothing in 3D', 'Left of center, and the torus spins the same way as the box'],
          answer: 0,
          why: 'In WEBGL, (0, 0) is the center, so x = -100 is left of it. pop() restores everything before the torus is drawn.'
        },
        tryThis: ['Drag on the canvas to orbit. Scroll to zoom.', 'Remove the push() and pop() lines. What happens to the torus?', 'Move the torus back with a negative z, like translate(100, 0, -200).']
      },
      build: {
        context: { kind: 'Business', title: 'Gallery lobby sculpture', story: 'The campus art gallery wants an abstract 3D sculpture on its lobby screen: several forms arranged in space, turning slowly and comfortably, that visitors can explore by dragging.' },
        plan: PLAN,
        task: 'In a WEBGL canvas, arrange at least three 3D primitives with translate(), keep each one\'s transformations separate with push() and pop(), rotate slowly over time, and add orbitControl().',
        starter: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(30);
  normalMaterial();
}`,
        checks: [
          { label: 'Uses a WEBGL canvas', test: function (f) { return f.webgl; } },
          { label: 'Draws at least three 3D primitives', test: function (f) { return f.calls.filter(function (c) { return PRIMITIVES.indexOf(c.name) >= 0; }).length >= 3; } },
          { label: 'Places them with translate()', test: function (f) { return f.has('translate'); } },
          { label: 'Uses push() and pop() in matching pairs', test: function (f) { return f.count('push') >= 1 && f.count('push') === f.count('pop'); } },
          { label: 'Rotates slowly over time (frameCount times a small number)', test: function (f) { return f.calls.some(function (c) { var m = /frameCount\s*\*\s*([\d.]+)/.exec(c.argSrc[0] || ''); return /^rotate[XYZ]?$/.test(c.name) && m && parseFloat(m[1]) > 0 && parseFloat(m[1]) < 0.1; }); }, fail: 'Use something like rotateY(frameCount * 0.01). Fast spins are uncomfortable to watch.' },
          { label: 'Lets viewers orbit with orbitControl()', test: function (f) { return f.has('orbitControl'); } },
          C.noErrors
        ],
        hints: [
          'Sketch the sculpture from above on paper: where is each shape (x and z)? What turns, and around which axis?',
          'For each shape: push(); translate(x, y, z); rotateX/Y(...); shape(); pop();. Call orbitControl() and normalMaterial() at the top of draw().',
          `push();
translate(130, 0, 0);
rotateX(frameCount * 0.02);
box(50);
pop();

push();
translate(___, 0, 0);
cone(30, 70);
pop();`
        ],
        solution: `// Lobby sculpture: forms orbiting a center, viewable from any angle
function setup() {
  createCanvas(400, 400, WEBGL);
  describe('An abstract 3D sculpture: a sphere at the center with a box and a cone circling it, inside a thin ring.');
}

function draw() {
  background(30);
  orbitControl();
  normalMaterial();

  // the whole sculpture turns slowly
  rotateY(frameCount * 0.01);

  // center: sphere
  sphere(50);

  // a box to the right
  push();
  translate(130, 0, 0);
  rotateX(frameCount * 0.02);
  box(50);
  pop();

  // a cone to the left
  push();
  translate(-130, 0, 0);
  rotateZ(frameCount * 0.02);
  cone(30, 70);
  pop();

  // a ring tilted around everything
  push();
  rotateX(HALF_PI);
  torus(170, 4);
  pop();
}`,
        solutionQuiz: [
          { q: 'rotateY(frameCount * 0.01) comes before everything else. What does it do?', options: ['Turns the whole sculpture together, because every shape is drawn after it', 'Only turns the sphere', 'Nothing, because push() resets it', 'Spins the camera'], answer: 0, why: 'Transformations apply to everything after them. push() saves the turned state, and pop() returns to it.' },
          { q: 'Why HALF_PI for the ring?', options: ['HALF_PI is a quarter turn (90 degrees), which lays the ring flat around the sculpture', 'It makes the ring half as big', 'It is the ring\'s thickness', 'It slows the spin'], answer: 0, why: 'Angles are radians: TWO_PI is a full turn, so HALF_PI is a quarter turn.' }
        ]
      },
      read: {
        context: 'A tiny solar system. Run it and drag to look around. Explain how nested push() and pop() make the moon orbit the planet.',
        code: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(10);
  orbitControl();
  normalMaterial();
  let t = frameCount * 0.01;

  sphere(40); // sun

  push();
  rotateY(t);
  translate(140, 0, 0);
  sphere(16); // planet

  push();
  rotateY(t * 4);
  translate(35, 0, 0);
  sphere(6); // moon
  pop();

  pop();
}`,
        ideas: [
          { label: 'the sun sits at the center', keys: ['sun', 'center', 'middle', 'origin'], prompt: 'What is at (0, 0, 0)?' },
          { label: 'rotate then translate makes the planet orbit', keys: ['orbit', 'circle', 'around', 'rotate', 'translate'], prompt: 'How does the planet circle the sun?' },
          { label: 'the moon\'s push/pop is inside the planet\'s', keys: ['nested', 'inside', 'push', 'pop', 'planet'], prompt: 'Why does the moon follow the planet?' },
          { label: 'the moon goes around 4 times as fast', keys: ['4', 'four', 'faster'], prompt: 'How fast is the moon?' }
        ],
        questions: [
          { q: 'Why is the moon\'s push()/pop() inside the planet\'s?', options: ['So the moon starts from the planet\'s position and rotation and orbits the planet, not the sun', 'p5 requires nested push()', 'To make the moon smaller'], answer: 0, why: ['Inner transformations build on outer ones, like a parent and a child.', 'Nesting is a choice, and here it creates the hierarchy.', 'Size comes from sphere(6).'] },
          { q: 'If the planet\'s translate() came before its rotateY(), what would happen?', options: ['The planet would spin in place at x = 140 instead of orbiting the sun', 'Nothing would change', 'The planet would disappear'], answer: 0, why: ['Rotation happens around the current origin. Translate first, and the origin is already at the planet.', 'Order changes the result: transformations do not commute.', 'It would still be drawn, just not orbiting.'] },
          { q: 'Relative to the planet, how fast does the moon go around?', options: ['4 times as fast as the planet circles the sun', 'The same speed', 'Half as fast'], answer: 0, why: ['rotateY(t * 4) inside the planet\'s frame.', 'Look at t * 4.', 'It is a multiplier of 4.'] }
        ],
        model: 'The sun is a sphere at the center. For the planet, rotateY(t) turns the coordinate system, then translate(140, 0, 0) moves out along the turned x-axis, so the planet orbits the sun. The moon\'s push/pop is nested inside the planet\'s, so it starts from the planet\'s position: it rotates 4 times faster and moves out 35 pixels, orbiting the planet. Each pop() undoes its own push(), restoring the frame before it.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The sphere that went missing',
          intent: 'A box on the left (x = -100) and a sphere on the right (x = 100).',
          code: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(239, 232, 212);
  normalMaterial();

  // box on the left
  translate(-100, 0, 0);
  box(60);

  // sphere on the right
  translate(100, 0, 0);
  sphere(40);
}`,
          type: 'logic', lines: [14],
          causes: ['Transformations add up: the second translate starts from -100, so the sphere ends up at 0 (the center). Wrap each object in push() and pop()', 'translate() needs only two arguments', 'Spheres cannot be translated', 'The box covers the sphere'],
          cause: 0,
          why: 'translate() moves from wherever the origin is now. After the box, the origin is at -100, so translate(100, 0, 0) brings the sphere back to 0, the center, not to 100. push() and pop() reset between objects.',
          fixed: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(239, 232, 212);
  normalMaterial();

  // box on the left
  push();
  translate(-100, 0, 0);
  box(60);
  pop();

  // sphere on the right
  push();
  translate(100, 0, 0);
  sphere(40);
  pop();
}`,
          fix: { test: function () { return true; }, probes: [{ frames: 2, expr: 'get(300, 200)', test: function (v) { return notBackground(v, [239, 232, 212]); } }], fail: 'The sphere should be drawn on the right side of the canvas.' }
        },
        {
          rating: 'black', title: 'The box that wandered off',
          intent: 'A box on the left side spins in place.',
          code: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(30);
  normalMaterial();
  // spin in place on the left side
  rotateY(frameCount * 0.01);
  translate(-120, 0, 0);
  box(60);
}`,
          type: 'logic', lines: [9, 10],
          causes: ['Rotation happens around the origin: rotating first, then translating, swings the box around the center. Translate first, then rotate', 'rotateY() should be rotateX()', 'The box is too small', 'frameCount * 0.01 is too slow'],
          cause: 0,
          why: 'The box sweeps around in a big circle instead of spinning on the left. rotateY() turns the whole coordinate system around (0, 0, 0); translating afterward moves along the turned axis, which makes an orbit. Translate to the spot first, then rotate there. (The Read activity\'s planet uses this on purpose.)',
          fixed: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(30);
  normalMaterial();
  // spin in place on the left side
  translate(-120, 0, 0);
  rotateY(frameCount * 0.01);
  box(60);
}`,
          fix: { test: function (f) { return H.startsBefore(f, ['translate'], ['rotateY', 'rotateX', 'rotateZ', 'rotate']); },
            probes: [{ frames: 157, expr: 'get(80, 200)', test: function (v) { return notBackground(v, [30, 30, 30]); } }], fail: 'After a quarter turn, the box should still be on the left.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Abstract space' },
        spec: ['At least five shapes, spread out at different positions and depths', 'Each shape keeps its own transformations (push/pop)', 'Slow rotation only: no fast spinning or flashing', 'Viewers can orbit with the mouse'],
        prompt: 'p5 3D abstract scene with spinning boxes',
        aiCode: `function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(0);
  normalMaterial();
  for (let i = 0; i < 5; i++) {
    translate(0, 0, -60);
    rotateY(frameCount * 0.3);
    box(40);
  }
}`,
        checklist: [
          { answer: 'partly', why: 'Five boxes at different depths, but all in one line straight back from the center, so most hide behind each other.' },
          { answer: 'no', why: 'No push/pop: each translate and rotate piles onto the last one.' },
          { answer: 'no', why: '0.3 radians per frame is almost 3 turns a second, and the boxes\' colors change constantly as they turn. That can be uncomfortable, or a seizure risk, for some viewers.' },
          { answer: 'no', why: 'There is no orbitControl().' }
        ],
        issue: {
          q: 'Why is requirement 3 about more than taste?',
          options: ['Fast spinning and flashing visuals can cause discomfort or trigger seizures. Accessibility guidelines limit flashing to fewer than three times a second', 'Slow rotation looks more professional', 'Fast rotation uses more battery', 'It is only about taste'],
          answer: 0,
          why: 'Motion is an accessibility issue (WCAG 2.3.1 and 2.3.3). AI tools rarely consider it unless you ask.'
        },
        verdicts: {
          accept: 'No. Three of four requirements fail, including a safety concern.',
          revise: 'Reasonable: spread the shapes with push/pop per shape, slow the rotation to about frameCount * 0.01, and add orbitControl().',
          reject: 'Also reasonable. The structure (accumulating transforms) is the core problem, and a fresh push/pop layout is clearer.'
        },
        best: ['revise', 'reject'],
        promptIdeas: [
          { label: 'push() and pop() per shape', keys: ['push', 'pop', 'separate', 'own transform'] },
          { label: 'slow, comfortable motion (no flashing)', keys: ['slow', 'gentle', 'no flash', 'flashing', 'seizure', 'comfortable', '0.01'] },
          { label: 'orbit with the mouse', keys: ['orbitcontrol', 'orbit', 'drag', 'mouse'] },
          { label: 'shapes spread out in space', keys: ['spread', 'different positions', 'depth', 'around', '\\bz\\b'] }
        ]
      }
    },

    /* ================================================================ 18 */
    {
      id: 18,
      title: '3D Models, Light, and Camera',
      tagline: 'Models, textures, lights, materials, and views.',
      concepts: ['loadModel()', 'model()', 'texture()', 'lights', 'materials', 'perspective() and ortho()', 'camera()'],
      learn: {
        brief: [
          '<code>loadModel(\'assets/rock.obj\', true)</code> loads a 3D model in preload (<code>true</code> scales it to a standard size); <code>model(rock)</code> draws it.',
          '<code>texture(img)</code> wraps an image around the next shape.',
          'Lights: <code>ambientLight()</code> lights everything evenly; <code>directionalLight(r, g, b, dx, dy, dz)</code> shines in a direction; <code>pointLight()</code> shines from a point. Set lights every frame, before the shapes.',
          'Materials decide how surfaces respond to light: <code>ambientMaterial()</code> is matte; <code>specularMaterial()</code> with <code>shininess()</code> is glossy.',
          'The view: <code>perspective()</code> makes distant things smaller, like your eyes do; <code>ortho()</code> keeps sizes the same at any distance, like a technical drawing. <code>camera()</code> sets where you look from and what you look at.'
        ],
        sayIt: [
          ['directionalLight(255, 255, 255, 0, 1, -1);', 'Shine white light that travels down (y = 1) and away from the viewer (z = -1).'],
          ['texture(wood);', 'Paint the wood image onto the next shape drawn.'],
          ['ortho();', 'Switch to an orthographic view: no perspective, so far objects are not drawn smaller.']
        ],
        terms: [
          ['OBJ', 'A common text file format for 3D models.'],
          ['texture', 'An image wrapped onto a 3D surface.'],
          ['material', 'How a surface reacts to light: matte, glossy, or glowing.'],
          ['orthographic', 'A view without perspective. Parallel lines stay parallel.']
        ],
        example: `let rock;
let wood;

function preload() {
  rock = loadModel('assets/rock.obj', true);
  wood = loadImage('assets/wood.png');
}

function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
}

function draw() {
  background(20, 30, 60);
  orbitControl();
  ambientLight(60);
  directionalLight(255, 255, 255, 0.5, 1, -1);

  push();
  translate(-90, 0, 0);
  rotateY(frameCount * 0.01);
  scale(0.5);
  ambientMaterial(150, 140, 130);
  model(rock);
  pop();

  push();
  translate(90, 0, 0);
  rotateY(frameCount * 0.01);
  texture(wood);
  box(90);
  pop();
}`,
        predict: {
          q: 'Before you run it: where does the wooden box appear?',
          options: ['Right of center, slowly turning, with the wood image on every face', 'In the top-left corner, as in 2D mode', 'Only the front face is wood', 'The wood image replaces the background'],
          answer: 0,
          why: 'In WEBGL, (0, 0) is the center, so x = 90 is to the right. texture() applies to every face of the next shape.'
        },
        tryThis: ['Delete the ambientLight() line. Which parts get darker?', 'Swap ambientMaterial for specularMaterial(200) and add shininess(40).', 'Add ortho(); at the top of draw(). Drag to orbit. What changes?']
      },
      build: {
        context: { kind: 'Business', title: '3D product viewer', story: 'A local outdoor shop wants a 3D viewer for its website: a product model on a wooden turntable, lit like a studio, with a key that switches between perspective and orthographic views so customers can check proportions.' },
        plan: PLAN,
        task: 'Load a model in preload() and draw it with model(). Texture another object with an image, add lights and a material, let viewers orbit, and switch between perspective() and ortho() with a key.',
        starter: `let rock;

function preload() {

}

function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(30);
}`,
        checks: [
          { label: 'Loads a model with loadModel() in preload() and draws it with model()', test: function (f) { return f.loads.some(function (l) { return l.kind === 'loadModel' && l.fn === 'preload'; }) && f.has('model'); } },
          { label: 'Textures a shape with texture()', test: function (f) { return f.has('texture'); } },
          { label: 'Adds at least one light', test: function (f) { return ['ambientLight', 'directionalLight', 'pointLight', 'spotLight', 'lights'].some(f.has); } },
          { label: 'Sets a material (ambientMaterial, specularMaterial, or emissiveMaterial)', test: function (f) { return ['ambientMaterial', 'specularMaterial', 'emissiveMaterial'].some(f.has); } },
          { label: 'Switches between perspective() and ortho() with a key', test: function (f) { return f.has('ortho') && f.has('perspective') && f.usesKeys; } },
          { label: 'Lets viewers orbit with orbitControl()', test: function (f) { return f.has('orbitControl'); } },
          C.noErrors
        ],
        hints: [
          'List the parts of the scene (model, turntable, lights, view mode) and which ones change. The view mode is state, so it needs a variable a key can flip.',
          'Load with rock = loadModel(\'assets/rock.obj\', true) and wood = loadImage(\'assets/wood.png\'). Keep let useOrtho = false;. In draw(): if (useOrtho) { ortho(); } else { perspective(); }. In keyPressed(): useOrtho = !useOrtho;.',
          `function draw() {
  background(30);
  orbitControl();
  if (useOrtho) {
    ortho();
  } else {
    perspective();
  }
  ambientLight(70);
  directionalLight(255, 245, 230, 0.3, 1, -0.6);
  // turntable: texture(wood); cylinder(...)
  // product: specularMaterial(200); model(rock);
}`
        ],
        solution: `// Product viewer: a model on a turntable, lit, with a perspective/ortho toggle
let rock;
let wood;
let useOrtho = false;

function preload() {
  rock = loadModel('assets/rock.obj', true);
  wood = loadImage('assets/wood.png');
}

function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
  describe('A 3D product viewer: a stone model turns on a wooden turntable. Drag to orbit. Press O to switch between perspective and orthographic views.');
}

function draw() {
  background(30);
  orbitControl();
  if (useOrtho) {
    ortho();
  } else {
    perspective();
  }

  ambientLight(70);
  directionalLight(255, 245, 230, 0.3, 1, -0.6);
  pointLight(237, 139, 0, -150, -150, 150);

  // turntable
  push();
  translate(0, 90, 0);
  texture(wood);
  cylinder(110, 16);
  pop();

  // product
  push();
  rotateY(frameCount * 0.01);
  specularMaterial(200);
  shininess(30);
  scale(0.6);
  model(rock);
  pop();
}

// press O to toggle the orthographic view
function keyPressed() {
  if (key === 'o' || key === 'O') {
    useOrtho = !useOrtho;
  }
}`,
        solutionQuiz: [
          { q: 'Why call perspective() in the else branch, instead of only calling ortho() when useOrtho is true?', options: ['The projection stays set between frames, so without perspective() the view would stay orthographic after the first switch', 'perspective() is required every frame', 'It makes the model bigger', 'No reason'], answer: 0, why: 'Settings persist until changed, like fill() in Level 3.' },
          { q: 'Why is the turntable at translate(0, 90, 0)?', options: ['y grows downward, so +90 puts it below the model', 'To move it closer to the viewer', 'To center it', 'Cylinders are drawn from the bottom'], answer: 0, why: 'WEBGL keeps p5\'s downward y-axis.' }
        ]
      },
      read: {
        context: 'A camera on a circular path around a still scene. Explain why the box seems to rotate when nothing calls rotate().',
        code: `function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
}

function draw() {
  background(239, 232, 212);
  let angle = frameCount * 0.01;
  camera(300 * cos(angle), -150, 300 * sin(angle), 0, 0, 0, 0, 1, 0);

  ambientLight(80);
  pointLight(255, 255, 255, 0, -200, 0);

  ambientMaterial(29, 60, 52);
  box(80);

  push();
  translate(0, 50, 0);
  ambientMaterial(112, 0, 46);
  box(300, 10, 300);
  pop();
}`,
        ideas: [
          { label: 'the camera moves in a circle (cos/sin)', keys: ['camera', 'circle', 'cos', 'sin', 'orbit', 'around'], prompt: 'What moves?' },
          { label: 'the camera always looks at the center', keys: ['look', 'center', '0, 0, 0', 'target', 'origin'], prompt: 'Where does it point?' },
          { label: 'the box and floor stay still', keys: ['still', 'not mov', 'never mov', 'does not rotate', "doesn't rotate", 'stationary', 'fixed'], prompt: 'Do the objects move?' },
          { label: 'a point light above lights the scene', keys: ['light', 'above', 'point'], prompt: 'Where does the light come from?' }
        ],
        questions: [
          { q: 'What do the first three camera() arguments control?', options: ['Where the camera is: on a circle 300 from the center, 150 above it', 'What the camera looks at', 'Which way is up'], answer: 0, why: ['x and z trace a circle with cos/sin; y = -150 is above, because y grows downward.', 'That is the next three: (0, 0, 0).', 'That is the last three: (0, 1, 0).'] },
          { q: 'Why does the box seem to rotate even though rotate() is never called?', options: ['The camera circles around it; the box stays still', 'ambientMaterial rotates it', 'pointLight spins it'], answer: 0, why: ['Moving the viewer looks the same as turning the object.', 'Materials only affect color and shading.', 'Lights do not move objects.'] },
          { q: 'What does pointLight(255, 255, 255, 0, -200, 0) do?', options: ['Hangs a white light 200 above the center, so top faces are brightest', 'Lights the scene from below', 'Turns the background white'], answer: 0, why: ['A negative y is up in p5.', 'y = -200 is above.', 'Lights only affect lit materials.'] }
        ],
        model: 'Each frame, the camera moves to a point on a circle of radius 300 around the center, using cos and sin of an angle that grows over time, and 150 above the scene (y = -150). It always looks at (0, 0, 0), with y as down. The green box and the maroon floor never move: the camera circling them makes it look like they rotate. An ambient light lights everything a little, and a point light 200 above the center makes the top faces brightest.'
      },
      bugs: [
        {
          rating: 'blue', title: 'Flat world',
          intent: 'Show the stone model turning slowly.',
          code: `let rock;

function preload() {
  rock = loadModel('assets/rock.obj', true);
}

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(30);
  normalMaterial();
  rotateY(frameCount * 0.01);
  model(rock);
}`,
          type: 'runtime', lines: [8], near: { 13: 'This line is where it fails, but normalMaterial() is fine in the right kind of canvas. What kind of canvas is this?', 14: 'rotateY() is fine in the right kind of canvas. What kind of canvas is this?' },
          causes: ['The canvas is 2D. 3D functions like normalMaterial(), rotateY(), and model() need createCanvas(400, 400, WEBGL)', 'The model file is broken', 'normalMaterial() must come after model()', 'loadModel() needs a third argument'],
          cause: 0,
          why: 'The error appears on the first 3D call, normalMaterial(), but the cause is the canvas: without WEBGL, p5 has no 3D renderer. The line that fails is not always the line that is wrong.',
          fixed: `let rock;

function preload() {
  rock = loadModel('assets/rock.obj', true);
}

function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(30);
  normalMaterial();
  rotateY(frameCount * 0.01);
  model(rock);
}`,
          fix: { test: function (f) { return f.webgl; } }
        },
        {
          rating: 'black', title: 'Sunlight from below',
          intent: 'Sunlight from above lights the top of the box. The bottom stays in shadow.',
          code: `function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
}

function draw() {
  background(187, 221, 230);
  ambientLight(40);
  // sunlight shining down from above
  directionalLight(255, 255, 255, 0, -1, 0);
  rotateX(-0.6);
  rotateY(frameCount * 0.01);
  ambientMaterial(237, 139, 0);
  box(150);
}`,
          type: 'logic', lines: [10],
          causes: ['The last three numbers are the direction the light travels. (0, -1, 0) travels up, lighting the bottom. Light from above travels down: (0, 1, 0)', 'ambientLight() cancels it', 'The box should be a sphere', 'rotateX(-0.6) hides the top'],
          cause: 0,
          why: 'The top face is dark and the bottom (when you orbit or look closely) is bright. directionalLight takes the direction the light is going, not where it comes from. And y grows downward in p5, so "down" is +1. Two easy-to-flip conventions in one line.',
          fixed: `function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
}

function draw() {
  background(187, 221, 230);
  ambientLight(40);
  // sunlight shining down from above
  directionalLight(255, 255, 255, 0, 1, 0);
  rotateX(-0.6);
  rotateY(frameCount * 0.01);
  ambientMaterial(237, 139, 0);
  box(150);
}`,
          fix: { test: function (f) { return H.anyCall(f, ['directionalLight'], function (v) { return v[4] !== null && v[4] > 0; }); }, fail: 'The light should travel down: a positive y direction.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Interactive 3D scene' },
        spec: ['Uses at least one light and a lit material, so shapes are shaded by the light', 'A textured object using an image from the project files', 'The user can switch between perspective and orthographic views', 'Explains the controls in describe() or on the canvas'],
        prompt: 'p5 3d scene with a texture and ortho view',
        aiCode: `let tex;

function preload() {
  tex = loadImage('https://example.com/stone-texture.jpg');
}

function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(200);
  orbitControl();
  normalMaterial();
  push();
  texture(tex);
  sphere(80);
  pop();
  if (keyIsPressed) {
    ortho();
  }
}`,
        checklist: [
          { answer: 'no', why: 'normalMaterial() shades by direction, not by light. There is no light, and no lit material.' },
          { answer: 'no', why: 'The texture is an invented URL outside the project. It never loads, so the sketch stays stuck loading.' },
          { answer: 'partly', why: 'Pressing a key switches to ortho, but nothing ever switches back to perspective.' },
          { answer: 'no', why: 'There is no describe() and no on-screen instructions.' }
        ],
        tryHint: 'Run it. The sketch never starts, because preload() is waiting for a file that does not exist.',
        issue: {
          q: 'The texture URL looks real. What should you do with any file path or URL an AI gives you?',
          options: ['Check that it exists and that you are allowed to use it. AI tools often invent plausible URLs; use files from your own project and check their licenses', 'Trust it if it ends in .jpg', 'Assume it will work once the sketch is published', 'Replace https with http'],
          answer: 0,
          why: 'Invented links, references, and data are a known AI failure. Verifying sources is part of responsible use.'
        },
        verdicts: {
          accept: 'No. It does not even start, and three requirements fail.',
          revise: 'Reasonable: use assets/wood.png, add a light and ambientMaterial or specularMaterial, toggle the view with a variable, and describe the controls.',
          reject: 'Also reasonable. Little of this code survives once the requirements are met.'
        },
        best: ['revise', 'reject'],
        promptIdeas: [
          { label: 'lights and a lit material', keys: ['light', 'material'] },
          { label: 'an image from the project files', keys: ['assets/', 'project', 'local', 'wood.png', 'my file', 'provided'] },
          { label: 'switching both ways between views', keys: ['toggle', 'switch', 'both', 'back', 'perspective'] },
          { label: 'describe the controls', keys: ['describe', 'instruction', 'controls', 'explain'] }
        ]
      }
    }
  ];

  /* ================================================================
   * MART 220 course map (Spring 2026 syllabus). Unity weeks (14–15)
   * are not covered. Move levels between weeks here.
   * ================================================================ */
  var COURSE = {
    code: 'MART 220',
    term: 'Spring 2026',
    refresher: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    weeks: [
      { week: 2, title: 'Foundations and Setup', focus: 'Run p5.js sketches and understand the coordinate system: ellipse(), rect(), line(), fill(), and stroke().', levels: [1, 2, 3] },
      { week: 3, title: 'Variables and Interaction', focus: 'How variables change over time and how user input drives behavior: mouseX, mouseY, keyPressed(), and button-like interactions.', levels: [4, 5, 6, 7] },
      { week: 4, title: 'Media and Motion', focus: 'Images, fonts, velocity and direction, frameCount, and timers.', levels: [11] },
      { week: 5, title: 'Arrays', focus: 'Managing collections of data, and drawing and updating many elements with loops.', levels: [8, 9, 10] },
      { week: 6, title: 'Classes and Objects', focus: 'Custom classes with display() and update(), and replacing groups of variables with an array of objects.', levels: [12] },
      { week: 7, title: 'Advanced OOP and Files', focus: 'Loading JSON and text files and letting external data shape the visuals.', levels: [13] },
      { week: 8, title: 'Collision and Sound', focus: 'Collision detection with p5.collide2D and sensory feedback with p5.sound.', levels: [14] },
      { week: 9, title: 'Game Systems with p5.play', focus: 'Sprites, groups, movement, collisions, scoring, and win/lose conditions.', levels: [15] },
      { week: 11, title: 'Particle Systems', focus: 'Particle classes with lifespan, velocity, and forces; emitters and randomness.', levels: [16] },
      { week: 12, title: '3D Basics', focus: 'WEBGL mode, 3D primitives, translate(), rotate(), and push()/pop().', levels: [17] },
      { week: 13, title: '3D Continued', focus: '3D models, textures, lights, and perspective vs. orthographic views.', levels: [18] },
      { week: 16, title: 'Project Work and Critique', focus: 'A complete, interactive final project you can explain, with your AI use documented.', final: true }
    ],
    // From the syllabus's Generative AI Use Policy.
    ai: {
      expectation: 'Generative AI tools are expected to be part of your creative and analytical process in this course, but you must clearly distinguish your original contributions from AI-generated ones.',
      policy: [
        ['Transparency', 'Document or cite the specific ways you used generative AI: idea generation, drafting, editing, or coding.'],
        ['Originality', 'AI can assist your work, but your submission must show your own critical thinking, creativity, and judgment. Do not submit work generated entirely by AI as your own.'],
        ['Ethical reflection', 'Consider biases, inaccuracies, or ethical concerns in AI-generated content, and how your use aligns with academic integrity.'],
        ['Collaboration', 'Talk openly with peers and your instructor about how you used AI.'],
        ['Compliance', 'All AI-assisted work must follow the University of Montana Academic Misconduct policy and Student Conduct Code.'],
        ['Discussion', 'If AI use is suspected without proper citation, your instructor may ask for a one-on-one conversation about your process.']
      ],
      purposes: ['brainstorming', 'drafting', 'editing', 'coding', 'debugging', 'explaining concepts'],
      declaration: 'This assignment involves using generative AI tools for the following purposes: {purposes}. I have reviewed and critically evaluated the AI-generated content and incorporated my original ideas and judgment.',
      checklist: [
        'I identified which parts of my work were assisted or created by AI tools.',
        'I critically reviewed and edited AI-generated content for accuracy and bias.',
        'I reflected on the ethical implications of using AI in this work.',
        'I cited or documented AI use clearly and transparently.',
        'My final submission represents my thinking and creativity beyond AI assistance.'
      ],
      collaboration: 'Working together is encouraged. Credit the classmates you worked with in a comment at the top of your code.'
    }
  };

  base.LEVELS.push.apply(base.LEVELS, LEVELS);
  base.ASSETS = ASSETS;
  base.COURSE = COURSE;
  if (typeof module !== 'undefined' && module.exports) { module.exports = base; }
  root.P5TrailLevels = base;
})(typeof window !== 'undefined' ? window : globalThis);
