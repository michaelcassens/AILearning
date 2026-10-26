/* p5.js Code Trail — level content.
 *
 * Each level has:
 *   learn  — short concept brief, "say it out loud" syntax reading, a runnable
 *            example, and a predict-before-you-run question.
 *   build  — a business or game problem to plan, then code. Checks run on the
 *            student's code (static facts from the analyzer, plus runtime probes
 *            evaluated inside the running sketch).
 *   read   — runnable code to explain in their own words, plus trace questions.
 *   bugs   — find, classify, explain, and fix. Ratings follow ski trail signs:
 *            green (easiest), blue, black, double (hardest).
 *   judge  — review "AI-generated" code against a spec, then write a better prompt.
 *
 * Instructors: edit freely. Run `node tools/p5trail_validate.js` afterwards to
 * check that every solution passes its checks and every bug fix is accepted.
 */
(function (root) {
  'use strict';

  /* ---------- check helpers ---------- */
  function bright(v) { return Array.isArray(v) ? (v[0] + v[1] + v[2]) / 3 : NaN; }

  // true if any call to one of `names` satisfies pred(evaluatedArgs, call).
  // Arguments that can't be evaluated come through as null, and a null in a
  // checked position counts as a pass (the student used a variable or formula).
  function anyCall(f, names, pred) {
    return f.calls.some(function (c) {
      if (names.indexOf(c.name) < 0) { return false; }
      var vals = c.args.map(function (a) { return f.evalNum(a); });
      return pred(vals, c);
    });
  }

  var C = {
    fn: function (name) {
      return { label: 'Defines function ' + name + '()', test: function (f) { return !!f.fn(name); } };
    },
    canvas: function (w, h) {
      return { label: 'Canvas is ' + w + ' wide and ' + h + ' tall',
        test: function (f) { return !!f.canvas && f.canvas.w === w && f.canvas.h === h; },
        fail: 'Check createCanvas(width, height). Width comes first.' };
    },
    runtimeCanvas: function (w, h) {
      return { label: 'The running sketch really is ' + w + ' × ' + h, runtime: true, frames: 1,
        expr: function () { return '[width, height]'; },
        test: function (v) { return v && v[0] === w && v[1] === h; } };
    },
    comment: { label: 'Has at least one comment (// ...) explaining your intent',
      test: function (f) { return f.comments >= 1; }, fail: 'Add a line starting with // that says what the code is for.' },
    describe: { label: 'Calls describe("...") with a helpful sentence for screen reader users',
      test: function (f) { return (f.callsByName.describe || []).some(function (c) { return c.args[0] && /\w+\s+\w+\s+\w+/.test(c.argSrc[0]); }); },
      fail: 'Add describe(\'...\') in setup() with a sentence that says what the canvas shows.' },
    noErrors: { label: 'Runs without errors', runtime: true, frames: 30, expr: function () { return 'true'; }, test: function (v) { return v === true; } }
  };

  // Name of the global variable used as the x (or y) of the first shape drawn in draw().
  function shapeVar(f, argIndex) {
    var globals = f.globals.map(function (g) { return g.name; });
    for (var i = 0; i < f.shapeCalls.length; i++) {
      var c = f.shapeCalls[i];
      var a = c.args[argIndex || 0];
      if (c.fn === 'draw' && a && a.type === 'Identifier' && globals.indexOf(a.name) >= 0) { return a.name; }
    }
    return f.animatedGlobals[0] || null;
  }

  function firstArrayGlobal(f) {
    var g = f.globals.filter(function (x) { return x.init && x.init.type === 'ArrayExpression'; })[0];
    return g ? g.name : null;
  }

  function startsBefore(f, aNames, bNames) {
    var a = f.calls.filter(function (c) { return aNames.indexOf(c.name) >= 0; })[0];
    var b = f.calls.filter(function (c) { return bNames.indexOf(c.name) >= 0; })[0];
    return !!a && !!b && a.start < b.start;
  }

  var PLAN = [
    'In your own words: what should the finished program show or do?',
    'What will you need? (shapes, numbers, variables, conditions, loops...)',
    'What steps will you take, in order? Plain English is fine.'
  ];

  var LEVELS = [
    /* ================================================================ 1 */
    {
      id: 1,
      title: 'Hello, Canvas',
      tagline: 'Function calls, arguments, and the shape of a p5 sketch.',
      concepts: ['function call', 'argument', 'setup()', 'comment', 'semicolon'],
      learn: {
        brief: [
          'A p5 sketch is a set of instructions the computer follows from top to bottom.',
          '<code>function setup() { ... }</code> is a block of instructions p5 runs <strong>once</strong>, at the start.',
          'A <strong>function call</strong> like <code>createCanvas(400, 300);</code> is a name, then parentheses holding <strong>arguments</strong> separated by commas, then a semicolon.',
          'Lines starting with <code>//</code> are <strong>comments</strong>. The computer ignores them; people read them.'
        ],
        sayIt: [
          ['createCanvas(400, 300);', 'Call createCanvas with two arguments: width 400 and height 300.'],
          ['background(220);', 'Call background with one argument, 220, a light gray. (0 is black, 255 is white.)'],
          ['function setup() { ... }', 'Define a function named setup. Everything between { and } belongs to it.']
        ],
        terms: [
          ['function call', 'Asking a named function to do its job: name(arguments);'],
          ['argument', 'A value you hand to a function inside the parentheses.'],
          ['block', 'Lines grouped together between { and }.'],
          ['comment', 'A note for humans. Starts with //.']
        ],
        example: `// This line is a comment. p5 ignores it.
function setup() {
  createCanvas(400, 300);
  background(220);
}`,
        predict: {
          q: 'Before you run it: what will you see?',
          options: ['A light gray rectangle, 400 wide and 300 tall', 'A black rectangle, 300 wide and 400 tall', 'Nothing, because there is no draw()', 'The number 220 written on the screen'],
          answer: 0,
          why: 'createCanvas takes width first, then height. background(220) paints the whole canvas a light gray on a 0 (black) to 255 (white) scale. draw() is optional.'
        },
        tryThis: ['Change 220 to 0, then to 255. What do the numbers mean?', 'Swap 400 and 300. Which way did the canvas change?', 'Delete the semicolon after background(220). Does it still run? (JavaScript often forgives it, but be consistent.)']
      },
      build: {
        context: { kind: 'Business', title: 'Café menu board', story: 'A café downtown is installing a wide, short digital menu screen. Before anyone designs the menu, they need a placeholder: the right shape, with a dark background so it will not glare.' },
        plan: PLAN,
        task: 'Make a canvas 600 pixels wide and 200 pixels tall with a dark background (darker than 60 on the 0–255 gray scale). Add a comment explaining what the sketch is for.',
        starter: `function setup() {

}`,
        checks: [
          C.fn('setup'),
          C.canvas(600, 200),
          { label: 'Background is dark', runtime: true, frames: 1, expr: function () { return 'get(5, 5)'; },
            test: function (v) { return bright(v) < 60; }, fail: 'background() with a small number (or small red, green, blue values) is dark.' },
          C.comment
        ],
        hints: [
          'Re-read the requirements. Two numbers describe the canvas. Which comes first, width or height?',
          'createCanvas(width, height) makes the canvas. background(value) paints it. 0 is black and 255 is white, so "dark" means a small number.',
          `function setup() {
  // what is this sketch for?
  createCanvas(___, ___);
  background(___);
}`
        ],
        solution: `// Menu board placeholder: wide and short, dark so it won't glare
function setup() {
  createCanvas(600, 200); // 600 wide, 200 tall
  background(30);         // very dark gray
}`,
        solutionQuiz: [
          { q: 'In createCanvas(600, 200), what does 200 control?', options: ['The height', 'The width', 'The color', 'How far from the top the canvas starts'], answer: 0, why: 'The first argument is width, the second is height.' },
          { q: 'Why does background(30) look dark?', options: ['Gray values run from 0 (black) to 255 (white), and 30 is near black', 'Because 30 is a small canvas', 'It is 30% transparent', 'background always makes things dark'], answer: 0, why: 'One argument to background() is a gray level from 0 to 255.' }
        ]
      },
      read: {
        context: 'A classmate wrote this and asked you what it does.',
        code: `function setup() {
  createCanvas(300, 300);
  background(255);
  background(0);
  print("Setup finished");
}`,
        ideas: [
          { label: 'the canvas size', keys: ['300', 'square', 'canvas'], prompt: 'How big is the canvas?' },
          { label: 'it is painted white, then black', keys: ['white', '255'], prompt: 'What does the first background() do?' },
          { label: 'the final color is black because the last instruction wins', keys: ['black', 'last', 'order', 'second', 'cover', 'over', 'replace'], prompt: 'Which background call wins, and why?' },
          { label: 'print() writes a message to the console, not the canvas', keys: ['console', 'print', 'message', 'log'], prompt: 'Where does "Setup finished" go?' }
        ],
        questions: [
          { q: 'What color is the canvas when the sketch finishes?', options: ['Black', 'White', 'Gray (the two mix)', 'It flickers between them'], answer: 0, why: ['background(0) runs last and paints over everything.', 'White was painted first, then covered.', 'Colors do not mix: each background() repaints the whole canvas.', 'setup() runs once, so nothing repeats or flickers.'] },
          { q: 'Where does "Setup finished" appear?', options: ['In the console, below the sketch', 'On the canvas', 'Nowhere'], answer: 0, why: ['print() writes to the console, a message for the programmer.', 'Drawing words on the canvas needs text(), not print().', 'It does show up, in the console.'] },
          { q: 'If you deleted line 3, background(255), what would change on screen?', options: ['Nothing visible', 'The canvas would be white', 'The program would crash'], answer: 0, why: ['Line 4 paints black over the whole canvas anyway, so line 3 had no visible effect.', 'Line 4 still paints it black.', 'Removing a whole valid line does not cause an error here.'] }
        ],
        model: 'It makes a 300 × 300 canvas, paints it white, then immediately paints it black, so the final canvas is black. Instructions run top to bottom, and each background() repaints the whole canvas, so the last one wins. It also prints "Setup finished" to the console. That message is for the programmer, not the canvas.'
      },
      bugs: [
        {
          rating: 'green', title: 'The canvas that never was',
          intent: 'Make a 400 × 400 canvas with a light gray background.',
          code: `function setup() {
  createCanvas(400, 400;
  background(220);
}`,
          type: 'syntax', lines: [2],
          causes: ['The ( after createCanvas is never closed with a )', '400 is too big for a canvas', 'There should be a comma after the last 400', 'setup should be spelled Setup'],
          cause: 0,
          why: 'Every ( needs a matching ). Because the parenthesis never closes, the computer cannot read the line at all, so nothing runs. That is what makes it a syntax error.',
          fixed: `function setup() {
  createCanvas(400, 400);
  background(220);
}`,
          fix: { test: function (f) { return !!f.canvas && f.canvas.w === 400 && f.canvas.h === 400 && f.has('background'); }, fail: 'The canvas should still be 400 × 400 with a background.' }
        },
        {
          rating: 'green', title: 'Capital trouble',
          intent: 'Make a 400 × 400 canvas with a light gray background.',
          code: `function setup() {
  createCanvas(400, 400);
  Background(220);
}`,
          type: 'runtime', lines: [3],
          causes: ['JavaScript is case-sensitive: the function is background with a lowercase b', 'The line is missing a semicolon', '220 is not a valid color', 'background() must come before createCanvas()'],
          cause: 0,
          why: 'The line is written correctly, so the computer can read it, but when it runs there is no function named "Background". Names must match exactly, including capital letters. Errors that only appear while running are runtime errors.',
          fixed: `function setup() {
  createCanvas(400, 400);
  background(220);
}`,
          fix: { test: function (f) { return f.has('background') && !f.has('Background'); } }
        }
      ]
    },

    /* ================================================================ 2 */
    {
      id: 2,
      title: 'Shapes and Coordinates',
      tagline: 'Where things go: x, y, and the upside-down grid.',
      concepts: ['coordinates', 'ellipse()', 'rect()', 'line()', 'order of arguments'],
      learn: {
        brief: [
          'The canvas is a grid of pixels. <strong>(0, 0) is the top-left corner.</strong>',
          '<strong>x</strong> grows to the right. <strong>y</strong> grows <em>downward</em>, unlike in math class.',
          '<code>rect(x, y, w, h)</code> starts at its top-left corner. <code>ellipse(x, y, w, h)</code> is centered on (x, y).',
          'Each shape function expects its arguments in a set order. The order is the meaning.'
        ],
        sayIt: [
          ['ellipse(200, 200, 100, 100);', 'Draw an ellipse centered at x 200, y 200, that is 100 wide and 100 tall.'],
          ['rect(50, 50, 80, 40);', 'Draw a rectangle whose top-left corner is at (50, 50), 80 wide and 40 tall.'],
          ['line(0, 400, 400, 0);', 'Draw a line from the point (0, 400) to the point (400, 0).']
        ],
        terms: [
          ['coordinate', 'A position written as (x, y).'],
          ['origin', '(0, 0): the top-left corner of the canvas.'],
          ['parameter order', 'The fixed meaning of each argument position.']
        ],
        example: `function setup() {
  createCanvas(400, 400);
  background(220);
  rect(50, 50, 80, 40);        // x, y, width, height
  ellipse(200, 200, 100, 100); // center x, center y, width, height
  line(0, 400, 400, 0);        // from (0, 400) to (400, 0)
}`,
        predict: {
          q: 'Before you run it: where will the rectangle appear?',
          options: ['Near the top-left', 'Near the bottom-left', 'In the center', 'Near the bottom-right'],
          answer: 0,
          why: 'The rectangle starts at (50, 50). Small x is left, and small y is near the top, because y grows downward.'
        },
        tryThis: ['Make the ellipse a tall oval by changing only one number.', 'Move the rectangle to the bottom-right corner. What y value puts it at the bottom?', 'Make the line go from top-left to bottom-right.']
      },
      build: {
        context: { kind: 'Game', title: 'Level mock-up', story: 'A game designer wants a quick sketch of the first level before artists start: a sun in the sky, ground along the bottom, and the player standing on it. Boxes and circles are fine. It is a plan, not final art.' },
        plan: PLAN,
        task: 'On a 400 × 400 canvas, draw: a sun (ellipse or circle) in the top half, ground (a rect) in the bottom half, a horizon line, and at least four shapes in total.',
        starter: `function setup() {
  createCanvas(400, 400);
  background(220);

}`,
        checks: [
          C.canvas(400, 400),
          { label: 'A sun: an ellipse or circle in the top half (y less than 200)', test: function (f) { return anyCall(f, ['ellipse', 'circle'], function (v) { return v[1] === null || v[1] < 200; }); } },
          { label: 'Ground: a rect that starts in the bottom half (y of 200 or more)', test: function (f) { return anyCall(f, ['rect', 'square'], function (v) { return v[1] === null || v[1] >= 200; }); } },
          { label: 'A horizon line drawn with line()', test: function (f) { return f.has('line'); } },
          { label: 'At least four shapes in total', test: function (f) { return f.shapeCalls.length >= 4; } }
        ],
        hints: [
          'Sketch it on paper first. Mark (0, 0) in the top-left. Where is "top half"? Where is "bottom half"?',
          'The top half has y values from 0 to 199. A rect\'s second argument is the y of its top edge, so ground that starts at y = 300 fills the bottom quarter.',
          `ellipse(320, 80, 80, 80);  // sun: small y means near the top
rect(0, 300, 400, 100);    // ground: starts at y 300, 100 tall
rect(60, 260, 40, 40);     // player: bottom edge at 260 + 40 = 300
line(___, ___, ___, ___);  // horizon`
        ],
        solution: `function setup() {
  createCanvas(400, 400);
  background(220);
  ellipse(320, 80, 80, 80);  // sun in the top-right
  rect(0, 300, 400, 100);    // ground across the bottom
  rect(60, 260, 40, 40);     // player standing on the ground
  line(0, 300, 400, 300);    // horizon line
}`,
        solutionQuiz: [
          { q: 'The player is rect(60, 260, 40, 40). Why does it look like it stands on the ground at y = 300?', options: ['Its top is at 260 and it is 40 tall, so its bottom edge is at 300', 'rect() is drawn from its center', 'All rects snap to the ground', 'Because 260 is bigger than 40'], answer: 0, why: 'rect(x, y, w, h) starts at the top-left corner, so the bottom edge is y + h.' },
          { q: 'Why is the sun near the top when its y is only 80?', options: ['y = 0 is the top of the canvas, so small y values are high up', 'The sun is always drawn on top', 'ellipse() measures from the bottom', 'It is a mistake'], answer: 0, why: 'In p5, y grows downward from the top edge.' }
        ]
      },
      read: {
        context: 'This sketch draws something. Run it, then explain how the code builds the picture.',
        code: `function setup() {
  createCanvas(400, 400);
  background(240);
  ellipse(200, 200, 250, 250); // head
  ellipse(150, 170, 40, 40);
  ellipse(250, 170, 40, 40);
  line(140, 260, 260, 260);
}`,
        ideas: [
          { label: 'a big circle in the center is the head', keys: ['head', 'face', 'big circle', 'center', 'middle', '250'], prompt: 'What does the biggest ellipse represent, and where is it?' },
          { label: 'two smaller circles at the same height are eyes', keys: ['eye', '170', 'same height', 'two'], prompt: 'What are lines 5 and 6?' },
          { label: 'the line below the center is a mouth', keys: ['mouth', 'smile', 'line', 'below'], prompt: 'What does line 7 draw?' },
          { label: 'positions come from x/y coordinates', keys: ['x', 'y', 'coordinate', 'position', 'left', 'right'], prompt: 'How do the numbers decide where things go?' }
        ],
        questions: [
          { q: 'Which line draws the eye on the right side of the canvas?', options: ['Line 6', 'Line 5', 'Line 4'], answer: 0, why: ['x = 250 is right of the center (200).', 'x = 150 is left of center.', 'Line 4 is the head, the big circle.'] },
          { q: 'Why do both eyes use 170 as their second argument?', options: ['So they sit at the same height', 'So they are the same size', 'Because 170 is the eye color'], answer: 0, why: ['The second argument is the y position, so equal y means level eyes.', 'Size comes from the 3rd and 4th arguments (40, 40).', 'There is no color argument in ellipse().'] },
          { q: 'The mouth is line(140, 260, 260, 260). What shape is it?', options: ['A flat horizontal line below the center', 'A diagonal line', 'A vertical line'], answer: 0, why: ['Both ends have y = 260, so it is flat, and 260 is below the center at 200.', 'A diagonal would need different y values at each end.', 'A vertical line would need the same x at both ends.'] }
        ],
        model: 'It draws a simple face on a 400 × 400 canvas. Line 4 draws a large circle in the center for the head. Lines 5 and 6 draw two small circles at the same height (y = 170) for eyes, one left of center and one right. Line 7 draws a flat line below the center as the mouth. Every position comes from the x and y arguments.'
      },
      bugs: [
        {
          rating: 'green', title: 'Crowded numbers',
          intent: 'Draw a circle in the center of the canvas.',
          code: `function setup() {
  createCanvas(400, 400);
  ellipse(200 200, 50, 50);
}`,
          type: 'syntax', lines: [3],
          causes: ['A comma is missing between the first two arguments', 'ellipse needs exactly two arguments', '200 is off the canvas', 'The semicolon should be a comma'],
          cause: 0,
          why: 'Arguments must be separated by commas. "200 200" is two values with nothing between them, so the computer cannot read the line.',
          fixed: `function setup() {
  createCanvas(400, 400);
  ellipse(200, 200, 50, 50);
}`,
          fix: { test: function (f) { return anyCall(f, ['ellipse', 'circle'], function (v) { return v[0] === 200 && v[1] === 200; }); }, fail: 'The circle should still be centered at (200, 200).' }
        },
        {
          rating: 'blue', title: 'Upside-down landscape',
          intent: 'Draw ground as a strip along the bottom 100 pixels of the canvas, with a tree trunk standing on it.',
          code: `function setup() {
  createCanvas(400, 400);
  background(220);
  // ground: a strip along the bottom
  rect(0, 0, 400, 100);
  // tree trunk standing on the ground
  rect(180, 220, 40, 80);
}`,
          type: 'logic', lines: [5],
          causes: ['y = 0 is the top of the canvas; the ground strip needs y = 300', 'The width 400 is too wide', 'rect() needs a fill color first', 'rect() draws from its center, so it needs y = 50'],
          cause: 0,
          why: 'The code runs with no errors, but the ground is at the top. In p5, y = 0 is the top edge. A strip 100 tall along the bottom of a 400-tall canvas starts at y = 300. Only someone who knows the intent can spot a logic error.',
          fixed: `function setup() {
  createCanvas(400, 400);
  background(220);
  // ground: a strip along the bottom
  rect(0, 300, 400, 100);
  // tree trunk standing on the ground
  rect(180, 220, 40, 80);
}`,
          fix: { test: function (f) { return anyCall(f, ['rect'], function (v) { return v[2] === 400 && v[1] !== null && v[1] + v[3] >= 395 && v[1] >= 250; }); }, fail: 'The 400-wide ground rect should start at y = 300 so its bottom edge touches the bottom of the canvas.' }
        }
      ]
    },

    /* ================================================================ 3 */
    {
      id: 3,
      title: 'Color and Drawing Order',
      tagline: 'fill, stroke, and why order matters.',
      concepts: ['fill()', 'stroke()', 'noStroke()', 'RGB color', 'state', 'describe()'],
      learn: {
        brief: [
          '<code>fill(r, g, b)</code> sets the inside color; <code>stroke(...)</code> sets the outline. Each value runs from 0 to 255.',
          'These are <strong>settings</strong>, not shapes. They affect every shape drawn <em>after</em> them, until you change them.',
          'Order matters: a style set after a shape does nothing to that shape.',
          '<code>describe("...")</code> gives your canvas a text alternative so screen reader users know what it shows.'
        ],
        sayIt: [
          ['fill(255, 0, 0);', 'Set the fill color to full red, no green, no blue. Shapes drawn after this are red.'],
          ['noStroke();', 'Turn off outlines for the shapes that come next.'],
          ['describe(\'A red circle and a blue square\');', 'Give the canvas a text description for assistive technology.']
        ],
        terms: [
          ['RGB', 'Red, green, blue. Mixing light, each from 0 to 255.'],
          ['state', 'A setting p5 remembers (like the current fill) until you change it.'],
          ['string', 'Text in quotes: \'like this\' or "like this".']
        ],
        example: `function setup() {
  createCanvas(400, 400);
  background(255);
  fill(255, 0, 0);       // red
  ellipse(130, 200, 120, 120);
  fill(0, 0, 255);       // blue
  noStroke();
  rect(240, 140, 120, 120);
  describe('A red circle with an outline, and a blue square without one.');
}`,
        predict: {
          q: 'Before you run it: what does the square look like?',
          options: ['Blue with no outline', 'Red with an outline', 'Blue with an outline', 'Red with no outline'],
          answer: 0,
          why: 'fill(0, 0, 255) and noStroke() both come before rect(), so they both apply. The circle was drawn earlier, so it keeps its red fill and default black outline.'
        },
        tryThis: ['Make the circle yellow. (Hint: red + green light.)', 'Move noStroke() above the ellipse. What changes?', 'Use fill(0, 0, 255, 100). What does the fourth number do?']
      },
      build: {
        context: { kind: 'Business', title: 'Ski area trail sign', story: 'A Montana ski area needs a digital sign showing its trail difficulty symbols: a green circle (easiest), a blue square (more difficult), and a black diamond (most difficult). Signs must work for visitors using screen readers on the website.' },
        plan: PLAN,
        task: 'On a 600 × 200 canvas, draw a green circle, a blue square, and a black diamond (use quad()) from left to right. Use at least three fill() calls, set a fill before the first shape, and add describe().',
        starter: `function setup() {
  createCanvas(600, 200);
  background(255);

}`,
        checks: [
          C.canvas(600, 200),
          { label: 'Draws a circle (or ellipse), a square (or rect), and a quad diamond', test: function (f) { return (f.has('circle') || f.has('ellipse')) && (f.has('square') || f.has('rect')) && f.has('quad'); }, fail: 'quad(x1, y1, x2, y2, x3, y3, x4, y4) draws a four-cornered shape, like a diamond.' },
          { label: 'Uses at least three different fill() colors', test: function (f) { var fills = (f.callsByName.fill || []).map(function (c) { return c.argSrc.join(','); }); return fills.filter(function (x, i) { return fills.indexOf(x) === i; }).length >= 3; } },
          { label: 'Sets a fill() before the first shape is drawn', test: function (f) { return startsBefore(f, ['fill'], ['circle', 'ellipse', 'square', 'rect', 'quad']); } },
          { label: 'Left part of the canvas is green-ish (circle)', runtime: true, frames: 1, expr: function (f) {
            var c = (f.callsByName.circle || f.callsByName.ellipse || [])[0];
            if (!c) { return null; }
            var x = f.evalNum(c.args[0]), y = f.evalNum(c.args[1]);
            return x === null || y === null ? null : 'get(' + Math.round(x) + ', ' + Math.round(y) + ')';
          }, test: function (v) { return v && v[1] > v[0] + 40 && v[1] > v[2]; }, fail: 'The pixel at the circle\'s center should be mostly green, like fill(0, 150, 70).' },
          C.describe
        ],
        hints: [
          'Think about order: for each shape, which color must be set right before it?',
          'quad() takes four corner points. A diamond centered at (500, 100) could have corners at the top (500, 40), right (560, 100), bottom (500, 160), and left (440, 100).',
          `fill(0, 150, 70);           // green
circle(100, 100, 120);
fill(___, ___, ___);        // blue
square(240, 40, 120);
fill(0);                    // black
quad(500, 40, 560, 100, 500, 160, 440, 100);
describe('...');`
        ],
        solution: `// Trail difficulty sign for a ski area
function setup() {
  createCanvas(600, 200);
  background(255);
  noStroke();

  // Easiest: green circle
  fill(0, 150, 70);
  circle(100, 100, 120);

  // More difficult: blue square
  fill(0, 80, 200);
  square(240, 40, 120);

  // Most difficult: black diamond
  fill(0);
  quad(500, 40, 560, 100, 500, 160, 440, 100);

  describe('Ski trail sign: a green circle, a blue square, and a black diamond on white.');
}`,
        solutionQuiz: [
          { q: 'What would happen if fill(0, 80, 200) were moved below square(...)?', options: ['The square would be green, and the diamond would be black', 'Nothing would change', 'The square would be black', 'The program would crash'], answer: 0, why: 'The square would still use the most recent fill, which is the green set for the circle.' },
          { q: 'Why include describe()?', options: ['So people using screen readers get a text version of what the canvas shows', 'It makes the shapes sharper', 'p5 requires it to run', 'It prints the colors to the console'], answer: 0, why: 'A canvas is just pixels to assistive technology. describe() adds a text alternative.' }
        ]
      },
      read: {
        context: 'Run this. Explain which settings apply to which circle, and why.',
        code: `function setup() {
  createCanvas(400, 400);
  background(230);
  strokeWeight(6);
  stroke(112, 0, 46);
  fill(255);
  ellipse(100, 200, 100, 100);
  noStroke();
  ellipse(200, 200, 100, 100);
  stroke(0);
  fill(239, 232, 212);
  ellipse(300, 200, 100, 100);
}`,
        ideas: [
          { label: 'three circles in a row', keys: ['three', '3', 'row', 'circles'], prompt: 'What shapes are there, and how are they arranged?' },
          { label: 'the first circle has a thick maroon outline', keys: ['maroon', 'thick', 'outline', 'stroke', 'border'], prompt: 'What makes the first circle\'s outline look the way it does?' },
          { label: 'the middle circle has no outline (noStroke)', keys: ['nostroke', 'no outline', 'no stroke', 'no border', 'middle', 'without'], prompt: 'What happened to the middle circle\'s outline?' },
          { label: 'settings stay in effect until changed', keys: ['until', 'stays', 'remember', 'persist', 'still', 'carries', 'after', 'order'], prompt: 'Why is the third circle\'s outline still thick?' }
        ],
        questions: [
          { q: 'Which circle has no outline?', options: ['The middle one', 'The left one', 'The right one', 'None of them'], answer: 0, why: ['noStroke() comes right before the middle ellipse.', 'The left circle is drawn while stroke is maroon.', 'stroke(0) turns outlines back on (black) before the right circle.', 'noStroke() removes one.'] },
          { q: 'How thick is the right circle\'s outline?', options: ['6 pixels, because strokeWeight(6) is still in effect', '1 pixel, because stroke(0) resets the thickness', 'No outline'], answer: 0, why: ['strokeWeight is a separate setting. Nothing changed it, so it is still 6.', 'stroke() changes only the color, not the thickness.', 'stroke(0) turned outlines back on.'] },
          { q: 'What color is the inside of the middle circle?', options: ['White', 'Wheat (239, 232, 212)', 'Maroon'], answer: 0, why: ['fill(255) was set before the first circle and has not changed yet.', 'The wheat fill is set later, before the third circle.', 'Maroon is the stroke color, not the fill.'] }
        ],
        model: 'It draws three circles in a row. The stroke weight is set to 6 and the stroke color to maroon, so the first, white circle has a thick maroon outline. noStroke() turns outlines off, so the middle circle (still white) has none. stroke(0) turns outlines back on in black. The thickness is still 6 because strokeWeight was never changed. The fill changes to wheat for the last circle. Settings stay in effect until something changes them.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The light that won\'t go green',
          intent: 'Draw a green "go" light: a green circle in the middle of the canvas.',
          code: `function setup() {
  createCanvas(400, 400);
  background(255);
  // a green "go" light
  ellipse(200, 200, 150, 150);
  fill(0, 180, 0);
}`,
          type: 'logic', lines: [5, 6],
          causes: ['fill() only affects shapes drawn after it, and here it comes after the ellipse', '(0, 180, 0) is not green', 'Ellipses cannot be filled', 'background(255) covers the circle'],
          cause: 0,
          why: 'Nothing crashes, but the circle is white. fill() is a setting for future shapes, so it must come before the ellipse.',
          fixed: `function setup() {
  createCanvas(400, 400);
  background(255);
  // a green "go" light
  fill(0, 180, 0);
  ellipse(200, 200, 150, 150);
}`,
          fix: {
            test: function (f) { return startsBefore(f, ['fill'], ['ellipse', 'circle']); },
            probes: [{ frames: 1, expr: 'get(200, 200)', test: function (v) { return v && v[1] > v[0] + 50 && v[1] > v[2] + 50; } }],
            fail: 'The center of the circle should be green.'
          }
        },
        {
          rating: 'green', title: 'The never-ending sentence',
          intent: 'Make a blue canvas with a description for screen readers.',
          code: `function setup() {
  createCanvas(400, 400);
  background(0, 80, 200);
  describe('A plain blue canvas);
}`,
          type: 'syntax', lines: [4],
          causes: ['The text string starts with \' but never closes', 'describe() needs a number', 'Blue needs four values', 'describe() must be the first line'],
          cause: 0,
          why: 'A string must start and end with the same kind of quote. Without the closing \', the computer reads the rest of the program as part of the text and cannot make sense of it.',
          fixed: `function setup() {
  createCanvas(400, 400);
  background(0, 80, 200);
  describe('A plain blue canvas');
}`,
          fix: { test: function (f) { return f.has('describe'); } }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Trail sign, take two' },
        spec: ['Canvas is 600 × 200', 'Green circle, blue square, black diamond, from left to right', 'White background', 'Includes describe() for screen reader users'],
        prompt: 'make a ski trail sign in p5.js',
        aiCode: `function setup() {
  createCanvas(400, 400);
  background(255);
  fill(0, 150, 0);
  ellipse(80, 200, 100, 100);
  fill(0, 0, 200);
  rect(150, 150, 100, 100);
  fill(200, 0, 0);
  quad(330, 150, 380, 200, 330, 250, 280, 200);
}`,
        checklist: [
          { answer: 'no', why: 'createCanvas(400, 400) makes a square canvas.' },
          { answer: 'partly', why: 'The three shapes are in the right order, but the diamond is red (200, 0, 0), not black.' },
          { answer: 'yes', why: 'background(255) is white.' },
          { answer: 'no', why: 'There is no describe() call.' }
        ],
        issue: {
          q: 'Why did the AI miss so many requirements?',
          options: ['The prompt did not state them: size, exact colors, and accessibility were never mentioned', 'AI cannot draw diamonds', 'p5 does not support describe()', 'The student should have asked the same question again'],
          answer: 0,
          why: 'The AI filled the gaps with guesses. A ski trail sign is a well-known idea, but this sign\'s size and accessibility needs were only in the spec. Write the spec first, then put it in the prompt.'
        },
        verdicts: {
          accept: 'Not yet. Two requirements are missing and one is wrong. Accepting code you have not checked means owning its mistakes.',
          revise: 'Good call. The structure is close. Fix the canvas size and diamond color, add describe(), or re-prompt with the full spec.',
          reject: 'Reasonable, but the code is close: three small fixes would meet the spec. Revising is often faster than starting over.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'the 600 × 200 size', keys: ['600', '200'] },
          { label: 'the exact colors (green, blue, black)', keys: ['black'] },
          { label: 'left-to-right order', keys: ['left', 'right', 'order'] },
          { label: 'a describe() text alternative', keys: ['describe', 'screen reader', 'accessib', 'alt'] }
        ]
      }
    },

    /* ================================================================ 4 */
    {
      id: 4,
      title: 'Variables',
      tagline: 'Give values names so code says what it means.',
      concepts: ['let', 'const', 'assignment', 'naming', 'width / height', 'expressions'],
      learn: {
        brief: [
          'A <strong>variable</strong> is a named box that holds a value: <code>let badgeSize = 120;</code>',
          'Use the name anywhere you would use the value. Change it in one place and everything that uses it updates.',
          'p5 gives you built-in variables like <code>width</code> and <code>height</code> (the canvas size).',
          'Good names explain intent: <code>badgeSize</code> says more than <code>b</code> or <code>120</code>.'
        ],
        sayIt: [
          ['let badgeSize = 120;', 'Declare a variable named badgeSize and store 120 in it.'],
          ['circle(width / 2, height / 2, badgeSize);', 'Draw a circle at half the canvas width and half the height (the center), as wide as badgeSize.'],
          ['const SPEED = 3;', 'Declare a constant. Its value can\'t be reassigned later.']
        ],
        terms: [
          ['declare', 'Create a variable with let or const.'],
          ['assign', 'Store a value: name = value;'],
          ['expression', 'Something that works out to a value, like width / 2.'],
          ['camelCase', 'Joining words with capitals: badgeSize, ringWidth.']
        ],
        example: `let badgeSize = 120;

function setup() {
  createCanvas(400, 400);
  background(240);
  fill(112, 0, 46);
  circle(width / 2, height / 2, badgeSize);
  fill(255);
  circle(width / 2, height / 2, badgeSize / 2);
}`,
        predict: {
          q: 'Before you run it, imagine badgeSize is changed to 240. What would happen?',
          options: ['Both circles would double in size', 'Only the outer circle would grow', 'Nothing, because the variable is only read once', 'An error, because 240 is too big'],
          answer: 0,
          why: 'Both circles use badgeSize (the inner one uses badgeSize / 2), so changing one value resizes both.'
        },
        tryThis: ['Change badgeSize to 300 and run again.', 'Change the canvas to 600 × 400. Why do the circles stay centered?', 'Add a third, smaller circle that uses badgeSize / 4.']
      },
      build: {
        context: { kind: 'Business', title: 'Food truck badge', story: 'A food truck is printing its logo badge at several sizes: stickers, the menu, and the side of the truck. The owner wants one number to control the badge size so nobody has to redraw it.' },
        plan: PLAN,
        task: 'Draw a badge from at least two circles. Declare at least two variables. Position shapes using width and height, and use one variable you declared in at least two shapes so a single change resizes the badge.',
        starter: `function setup() {
  createCanvas(400, 400);
  background(255);

}`,
        checks: [
          { label: 'Declares at least two variables with let or const', test: function (f) { return f.globals.length + f.locals.length >= 2; } },
          { label: 'Uses width or height to position something', test: function (f) { return f.shapeCalls.some(function (c) { return c.argSrc.slice(0, 2).some(function (s) { return /\b(width|height)\b/.test(s); }); }); } },
          { label: 'One of your variables is used in at least two shapes', test: function (f) {
            var names = f.globals.concat(f.locals).map(function (v) { return v.name; });
            return names.some(function (n) {
              var re = new RegExp('\\b' + n + '\\b');
              return f.shapeCalls.filter(function (c) { return c.argSrc.some(function (s) { return re.test(s); }); }).length >= 2;
            });
          } },
          { label: 'Draws at least two circles or ellipses', test: function (f) { return f.count('circle') + f.count('ellipse') >= 2; } }
        ],
        hints: [
          'What should stay the same when the badge grows? What should change? The thing that changes is your variable.',
          'Declare it at the top: let badgeSize = 200; Then use it as the size argument, and use expressions like badgeSize - 40 or badgeSize / 4 for the inner circles.',
          `let badgeSize = 200;
let ringWidth = ___;

function setup() {
  createCanvas(400, 400);
  circle(width / 2, height / 2, badgeSize);
  circle(width / 2, height / 2, badgeSize - ringWidth * 2);
}`
        ],
        solution: `// Food truck badge: change badgeSize and everything scales
let badgeSize = 200;
let ringWidth = 20;

function setup() {
  createCanvas(400, 400);
  background(255);
  noStroke();

  // outer ring
  fill(112, 0, 46);
  circle(width / 2, height / 2, badgeSize);

  // inner circle
  fill(239, 232, 212);
  circle(width / 2, height / 2, badgeSize - ringWidth * 2);

  // center dot
  fill(112, 0, 46);
  circle(width / 2, height / 2, badgeSize / 4);

  describe('A round maroon and wheat badge with a dot in the middle.');
}`,
        solutionQuiz: [
          { q: 'With badgeSize 200 and ringWidth 20, how wide is the inner circle?', options: ['160', '180', '200', '360'], answer: 0, why: 'badgeSize - ringWidth * 2 = 200 - 40 = 160. Multiplication happens before subtraction.' },
          { q: 'Why use width / 2 instead of 200?', options: ['It stays centered even if the canvas size changes, and it says what it means', '200 is not allowed', 'width / 2 is faster', 'It makes the circle bigger'], answer: 0, why: 'Expressions like width / 2 communicate intent and adapt to changes.' }
        ]
      },
      read: {
        context: 'Run it, then explain how the variables control the picture.',
        code: `let startX = 100;
let gap = 100;
let size = 60;

function setup() {
  createCanvas(400, 200);
  background(220);
  circle(startX, 100, size);
  circle(startX + gap, 100, size);
  circle(startX + gap * 2, 100, size);
}`,
        ideas: [
          { label: 'three circles in a row', keys: ['three', '3', 'row'], prompt: 'What appears?' },
          { label: 'startX sets where the first circle is', keys: ['startx', 'first', 'start'], prompt: 'What does startX control?' },
          { label: 'gap sets the spacing', keys: ['gap', 'spac', 'apart', 'distance'], prompt: 'What does gap control?' },
          { label: 'changing one variable changes all three', keys: ['all', 'every', 'one change', 'change'], prompt: 'Why are variables useful here?' }
        ],
        questions: [
          { q: 'What is the x position of the third circle?', options: ['300', '400', '200', '102'], answer: 0, why: ['startX + gap * 2 = 100 + 200 = 300. Multiplication happens first.', 'That would be (100 + 100) * 2, but * happens before +.', 'That is the second circle.', 'gap is 100, not 1.'] },
          { q: 'Which single change moves all three circles 50 pixels to the right?', options: ['Set startX to 150', 'Set gap to 150', 'Set size to 110', 'Edit all three circle lines'], answer: 0, why: ['Every circle starts from startX, so they all shift together.', 'That spreads them apart instead of shifting them.', 'That only makes them bigger.', 'That works, but it is three changes instead of one, which is exactly what variables help you avoid.'] },
          { q: 'If gap becomes 50, what happens?', options: ['The circles overlap, because they are 60 wide but only 50 apart', 'They spread out', 'Nothing changes'], answer: 0, why: ['Centers 50 apart with a width of 60 means they overlap by 10.', 'A smaller gap brings them closer.', 'gap is used in two of the circles.'] }
        ],
        model: 'It draws three circles in a row on a 400 × 200 canvas. startX is the x position of the first circle, gap is the distance between circle centers, and size is each circle\'s diameter. The second circle is at startX + gap and the third at startX + gap * 2 (300). Changing one variable changes all three circles, so the layout is easy to adjust.'
      },
      bugs: [
        {
          rating: 'green', title: 'Lost in the case',
          intent: 'Draw a circle whose size comes from the circleSize variable.',
          code: `let circleSize = 80;

function setup() {
  createCanvas(400, 400);
  background(220);
  circle(200, 200, circlesize);
}`,
          type: 'runtime', lines: [6],
          causes: ['circlesize and circleSize are different names, because JavaScript is case-sensitive', 'Variables cannot be used inside circle()', 'let should be const', '80 is too small'],
          cause: 0,
          why: 'The code reads fine, but while running, the computer looks for a variable named "circlesize" and finds nothing. The declared one is circleSize, with a capital S.',
          fixed: `let circleSize = 80;

function setup() {
  createCanvas(400, 400);
  background(220);
  circle(200, 200, circleSize);
}`,
          fix: { test: function (f) { return !f.uses('circlesize') && f.uses('circleSize'); } }
        },
        {
          rating: 'blue', title: 'Off center',
          intent: 'Draw a circle in the exact center of the canvas.',
          code: `let size = 100;

function setup() {
  createCanvas(400, 400);
  background(220);
  // a circle in the exact center of the canvas
  circle(width, height / 2, size);
}`,
          type: 'logic', lines: [7],
          causes: ['width is the right edge; the center is width / 2', 'height / 2 should be height', 'size should be 200', 'circle() needs four arguments'],
          cause: 0,
          why: 'It runs, but the circle is cut in half at the right edge. width is the whole width (400), so x = width is the right edge. Half the width is the center.',
          fixed: `let size = 100;

function setup() {
  createCanvas(400, 400);
  background(220);
  // a circle in the exact center of the canvas
  circle(width / 2, height / 2, size);
}`,
          fix: { test: function (f) { return anyCall(f, ['circle'], function (v) { return v[0] === 200 && v[1] === 200; }); }, fail: 'Both x and y should work out to the center (200, 200).' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'The badge that looks right' },
        spec: ['Looks like a round badge with a center dot', 'One variable controls the size of the whole badge', 'Centered using width and height, not hard-coded numbers', 'Runs without errors'],
        prompt: 'make a badge in p5 with a size variable',
        aiCode: `let badgeSize = 200;

function setup() {
  createCanvas(400, 400);
  background(255);
  fill(112, 0, 46);
  circle(200, 200, 200);
  fill(239, 232, 212);
  circle(200, 200, 160);
  fill(112, 0, 46);
  circle(200, 200, 50);
}`,
        checklist: [
          { answer: 'yes', why: 'Three centered circles make a badge with a dot.' },
          { answer: 'no', why: 'badgeSize is declared but never used. Every size is a hard-coded number.' },
          { answer: 'no', why: '200 is the center only on a 400 × 400 canvas.' },
          { answer: 'yes', why: 'It runs. "Looks right and runs" is not the same as "meets the spec".' }
        ],
        issue: {
          q: 'The output looks perfect. How could you catch the problem?',
          options: ['Change badgeSize and run again. If nothing changes, the variable is not really used', 'Run it a second time', 'Trust it, since there are no errors', 'Ask the AI whether it is correct'],
          answer: 0,
          why: 'Test the requirement directly. Asking the AI to grade itself is not verification, and running it again only shows the same picture.'
        },
        verdicts: {
          accept: 'Not yet. The main requirement (one variable controls everything) is not met, even though it looks right.',
          revise: 'Good call. Replace the hard-coded numbers with expressions based on badgeSize, width, and height.',
          reject: 'Understandable, but this is a quick fix: the drawing logic is fine and only the numbers need to become expressions.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'every size calculated from one variable', keys: ['every', 'all', 'each', 'calculated', 'based on', 'derived', 'from badgesize', 'scale'] },
          { label: 'centered with width/height', keys: ['width', 'height', 'center'] },
          { label: 'no hard-coded numbers', keys: ['hard', 'magic', 'no numbers', 'instead of numbers'] }
        ]
      }
    },

    /* ================================================================ 5 */
    {
      id: 5,
      title: 'setup(), draw(), and Motion',
      tagline: 'The draw loop: 60 small drawings a second.',
      concepts: ['draw()', 'frames', 'updating variables', 'global vs local', 'frameCount'],
      learn: {
        brief: [
          '<code>setup()</code> runs once. <code>draw()</code> runs over and over, about 60 times per second. Each run is a <strong>frame</strong>.',
          'To animate, keep a variable <strong>outside</strong> both functions (a global) and change it a little each frame.',
          'Call <code>background()</code> at the start of <code>draw()</code> to erase the last frame. Leave it out and shapes leave trails.',
          'A variable declared <em>inside</em> draw() is created fresh every frame, so it forgets its old value.'
        ],
        sayIt: [
          ['x = x + 2;', 'Take the current value of x, add 2, and store the result back in x.'],
          ['let x = 0;  (at the top)', 'A global variable: every function can use it, and it keeps its value between frames.'],
          ['frameCount', 'A p5 variable that counts how many frames have been drawn.']
        ],
        terms: [
          ['frame', 'One run of draw(): one picture in the animation.'],
          ['global variable', 'Declared outside any function, so it lives for the whole program.'],
          ['local variable', 'Declared inside a function; it exists only during that function call.']
        ],
        example: `let x = 0;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, 100, 40);
  x = x + 2;
}`,
        predict: {
          q: 'Before you run it: what happens?',
          options: ['The circle moves right and keeps going off the edge', 'The circle moves right and stops at the edge', 'The circle jumps 2 pixels once', 'The circle stays still'],
          answer: 0,
          why: 'draw() repeats, adding 2 to x every frame. Nothing tells it to stop, so it slides off the right side. Stopping needs an if, which is coming in Level 6.'
        },
        tryThis: ['Delete background(220) from draw(). What do you see, and why?', 'Change + 2 to + 5. Then to - 1 (and start x at 400).', 'Move circle(x, 100, 40) so it uses x for the y position instead.']
      },
      build: {
        context: { kind: 'Game', title: 'Title screen', story: 'A small game studio wants a calm title screen while the game loads: a cloud drifting across the sky. It needs to feel alive without being distracting.' },
        plan: PLAN,
        task: 'Make something drift across the canvas: a global variable that changes inside draw(), used as a shape\'s position, with background() in draw() so there are no trails.',
        starter: `function setup() {
  createCanvas(400, 300);
}

function draw() {

}`,
        checks: [
          C.fn('setup'), C.fn('draw'),
          { label: 'A global variable changes inside draw()', test: function (f) { return f.animatedGlobals.length > 0; }, fail: 'Declare it at the top (let cloudX = 0;) and change it in draw() (cloudX = cloudX + 1;).' },
          { label: 'background() is called inside draw()', test: function (f) { return (f.callsByName.background || []).some(function (c) { return c.fn === 'draw'; }); } },
          { label: 'A shape in draw() uses that variable', test: function (f) { return f.animatedGlobals.some(function (n) { var re = new RegExp('\\b' + n + '\\b'); return f.shapeCalls.some(function (c) { return c.fn === 'draw' && c.argSrc.some(function (s) { return re.test(s); }); }); }); } },
          { label: 'The value really changes as the sketch runs', runtime: true, frames: 40, expr: function (f) { return f.animatedGlobals[0] || null; },
            test: function (v, f) { var g = f.globals.filter(function (x) { return x.name === f.animatedGlobals[0]; })[0]; var start = g ? f.evalNum(g.init) : null; return typeof v === 'number' && v !== start; } }
        ],
        hints: [
          'Something has to remember where the cloud is between frames. Where must that variable live?',
          'Declare let cloudX = 0; above setup(). In draw(): background(...) first, then draw shapes at cloudX, then cloudX = cloudX + 1;',
          `let cloudX = 0;

function draw() {
  background(135, 200, 235);
  ellipse(cloudX, 100, 120, 60);
  cloudX = ___;
}`
        ],
        solution: `// Title screen: a cloud drifts across the sky
let cloudX = -60;

function setup() {
  createCanvas(400, 300);
  noStroke();
  describe('A white cloud drifts slowly from left to right across a blue sky.');
}

function draw() {
  background(135, 200, 235); // sky blue
  fill(255);
  ellipse(cloudX, 100, 120, 60);
  ellipse(cloudX + 40, 85, 80, 60);
  cloudX = cloudX + 1; // drift right one pixel per frame
}`,
        solutionQuiz: [
          { q: 'Why is cloudX declared above setup() instead of inside draw()?', options: ['So it keeps its value between frames; inside draw() it would reset every frame', 'Because setup() cannot see it', 'It is just a style choice', 'So it runs faster'], answer: 0, why: 'A variable declared inside draw() is created fresh, with its starting value, on every frame.' },
          { q: 'Why does cloudX start at -60?', options: ['So the cloud starts just off the left edge and drifts in', 'Negative numbers are faster', 'It is required for ellipse()', 'To make it smaller'], answer: 0, why: 'x positions less than 0 are off the left side of the canvas.' }
        ]
      },
      read: {
        context: 'Run it and watch the console too. Explain what happens over time.',
        code: `let size = 10;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(0);
  fill(239, 232, 212);
  circle(width / 2, height / 2, size);
  size = size + 1;
  print(frameCount);
}`,
        ideas: [
          { label: 'draw() repeats every frame', keys: ['draw', 'frame', 'repeat', 'every', 'loop', '60'], prompt: 'What does draw() do, and how often?' },
          { label: 'the circle grows by 1 each frame', keys: ['grow', 'bigger', 'increase', 'size \\+', '\\+ 1', 'larger'], prompt: 'What happens to size?' },
          { label: 'background clears the last frame', keys: ['background', 'clear', 'erase', 'black', 'cover'], prompt: 'Why is background() inside draw()?' },
          { label: 'frameCount is printed to the console', keys: ['framecount', 'console', 'print', 'count'], prompt: 'What appears in the console?' }
        ],
        questions: [
          { q: 'Why is background(0) inside draw() instead of setup()?', options: ['To erase the previous frame so only the current circle shows', 'To make the canvas black once', 'p5 requires it'], answer: 0, why: ['Without it, each bigger circle would be drawn on top of the last one. That looks almost the same here, but in motion it leaves trails.', 'That would happen in setup(); in draw() it repaints every frame.', 'It is optional; you choose based on the effect you want.'] },
          { q: 'What would happen if "let size = 10;" moved inside draw()?', options: ['The circle would never grow, because size resets to 10 every frame', 'It would grow faster', 'Nothing changes'], answer: 0, why: ['A local variable is created fresh on each call, so the + 1 is lost every frame.', 'The reset makes it stop growing completely.', 'Where you declare a variable changes how long it lives.'] },
          { q: 'After 100 frames, about how big is the circle?', options: ['About 110', 'About 100', 'About 10', 'About 1000'], answer: 0, why: ['It starts at 10 and gains 1 per frame: 10 + 100.', 'Do not forget the starting value of 10.', 'It does grow, by 1 each frame.', 'It grows by 1 per frame, not 10.'] }
        ],
        model: 'A circle in the center of a black canvas grows by one pixel every frame. size is global, so it remembers its value between frames. draw() runs about 60 times a second: it paints the background black (erasing the last frame), draws the circle at the current size, then adds 1 to size. It also prints frameCount to the console, which shows how many frames have run.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The ball that won\'t roll',
          intent: 'A ball should roll steadily to the right.',
          code: `function setup() {
  createCanvas(400, 200);
}

function draw() {
  let x = 0;
  background(220);
  circle(x, 100, 40);
  x = x + 3;
}`,
          type: 'logic', lines: [6],
          causes: ['x is declared inside draw(), so it resets to 0 every frame', 'x = x + 3 should be x + 3', 'background() erases the ball', 'circle() cannot use variables'],
          cause: 0,
          why: 'No error appears, but the ball never moves. Every frame starts by creating a new x set to 0. The + 3 happens, then the frame ends and that x is thrown away. Declare x once, at the top.',
          fixed: `let x = 0;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, 100, 40);
  x = x + 3;
}`,
          fix: { test: function (f) { return f.globals.some(function (g) { return g.name === 'x'; }) && !f.locals.some(function (l) { return l.name === 'x' && l.fn === 'draw'; }); },
            probes: [{ frames: 30, expr: 'x', test: function (v) { return v > 20; } }], fail: 'x should be declared once at the top, so it keeps growing.' }
        },
        {
          rating: 'blue', title: 'Rain that leaves a streak',
          intent: 'A single raindrop falls down the middle. You should only ever see one drop.',
          code: `let y = 0;

function setup() {
  createCanvas(400, 400);
  background(30);
}

function draw() {
  fill(255);
  circle(200, y, 30);
  y = y + 2;
}`,
          type: 'logic', lines: [5, 8, 9],
          causes: ['background() only runs once in setup(), so old drops are never erased', 'y should start at 30', 'fill(255) makes a streak', 'y = y + 2 is too fast'],
          cause: 0,
          why: 'Each frame draws a new drop, but nothing paints over the old ones, so they pile up into a streak. Calling background() at the start of draw() erases the previous frame.',
          fixed: `let y = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(30);
  fill(255);
  circle(200, y, 30);
  y = y + 2;
}`,
          fix: { test: function (f) { return (f.callsByName.background || []).some(function (c) { return c.fn === 'draw'; }); },
            probes: [{ frames: 60, expr: 'get(200, 20)', test: function (v) { return bright(v) < 100; } }], fail: 'Erase the old frame in draw() so only one drop shows.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Loading bar' },
        spec: ['Canvas is 400 × 100', 'A bar grows from 0 to the full width over time', 'The bar stops when it reaches the full width', 'Runs without errors'],
        prompt: 'make a loading bar animation in p5',
        aiCode: `function setup() {
  createCanvas(400, 100);
}

function draw() {
  let barWidth = 0;
  background(240);
  fill(112, 0, 46);
  rect(0, 40, barWidth, 20);
  barWidth = barWidth + 2;
  if (barWidth > width) {
    barWidth = width;
  }
}`,
        checklist: [
          { answer: 'yes', why: 'createCanvas(400, 100).' },
          { answer: 'no', why: 'barWidth is declared inside draw(), so it is 0 at the start of every frame. Nothing ever appears to grow.' },
          { answer: 'no', why: 'The stopping code exists, but since the bar never grows it can never matter.' },
          { answer: 'yes', why: 'No errors. "No errors" only tells you about syntax and runtime, not logic.' }
        ],
        issue: {
          q: 'The sketch runs without any error. What does that tell you?',
          options: ['Only that the syntax and runtime are OK. It says nothing about whether the logic matches the goal', 'That it works correctly', 'That AI code is always tested', 'That the bar is too slow'],
          answer: 0,
          why: 'Logic errors are invisible to the computer. Only someone who knows the intent, like you after writing the spec, can catch them.'
        },
        verdicts: {
          accept: 'Not yet. Watch it run: the bar never grows. Always run it and compare with the spec.',
          revise: 'Good call. Move the let barWidth = 0; line above setup() and the rest works.',
          reject: 'It is one misplaced line away from working. Revising is the efficient choice, if you can explain why that line matters.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'grows from 0 to full width', keys: ['0', 'zero', 'empty', 'full', 'grow'] },
          { label: 'stops when full', keys: ['stop', 'full', 'reach', 'end'] },
          { label: 'the 400 × 100 canvas', keys: ['400', '100'] },
          { label: 'asking for an explanation or comments', keys: ['explain', 'comment', 'why'] }
        ]
      }
    },

    /* ================================================================ 6 */
    {
      id: 6,
      title: 'Decisions with if',
      tagline: 'Conditions, comparisons, and choosing what happens.',
      concepts: ['if / else', 'comparison operators', '&& and ||', 'boundaries', 'order of checks'],
      learn: {
        brief: [
          '<code>if (condition) { ... }</code> runs its block only when the condition is <strong>true</strong>.',
          'Comparisons: <code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> <code>===</code> (equal) <code>!==</code> (not equal). One <code>=</code> <em>assigns</em>, it does not compare.',
          '<code>else if</code> checks are tried in order. The <strong>first</strong> true one wins and the rest are skipped.',
          'Combine conditions with <code>&amp;&amp;</code> (both must be true) and <code>||</code> (either can be true).'
        ],
        sayIt: [
          ['if (x > width) { x = 0; }', 'If x is greater than the canvas width, set x back to 0.'],
          ['speed = -speed;', 'Flip the sign of speed: positive becomes negative, so the direction reverses.'],
          ['x < 0 || x > width', 'x is off the left edge OR off the right edge.']
        ],
        terms: [
          ['condition', 'A question with a true or false answer.'],
          ['boolean', 'A true/false value.'],
          ['boundary', 'The exact value where behavior changes. Test it.']
        ],
        example: `let x = 0;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, 100, 40);
  x = x + 3;
  if (x > width) {
    x = 0;
  }
}`,
        predict: {
          q: 'Before you run it: what happens when the circle passes the right edge?',
          options: ['It jumps back to the left side and goes again', 'It bounces back', 'It stops', 'It keeps going forever off screen'],
          answer: 0,
          why: 'When x becomes greater than width, the if block sets x back to 0, so the circle wraps around.'
        },
        tryThis: ['Change the condition to x > width / 2. What happens?', 'Make it wrap from right to left instead (start at width, subtract 3).', 'Add an else that changes the fill color. When does it run?']
      },
      build: {
        context: { kind: 'Game', title: 'Bounce', story: 'A retro game needs a ball that bounces back and forth between the walls forever, the core of a Pong-style game.' },
        plan: PLAN,
        task: 'Make a ball move with a speed variable and reverse direction at both the left and right edges.',
        starter: `let x = 200;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, height / 2, 40);
}`,
        checks: [
          { label: 'Position changes by a speed variable each frame', test: function (f) {
            var g = f.globals.map(function (v) { return v.name; });
            return f.assignments.some(function (a) { return a.fn === 'draw' && g.indexOf(a.base) >= 0 && (a.op === '+=' ? true : g.some(function (n) { return n !== a.base && new RegExp('\\b' + n + '\\b').test(a.valueSrc || ''); })); });
          } },
          { label: 'Uses an if statement that checks an edge (width or 0)', test: function (f) { return f.ifs.some(function (i) { return /width|\b0\b|size/.test(i.testSrc); }); } },
          { label: 'Reverses the speed (speed = -speed or speed *= -1)', test: function (f) { return f.assignments.some(function (a) { return (a.op === '*=' && /-\s*1/.test(a.valueSrc)) || (a.op === '=' && new RegExp('^-\\s*' + a.base + '$').test((a.valueSrc || '').trim())) || (a.op === '=' && new RegExp(a.base + '\\s*\\*\\s*-\\s*1').test(a.valueSrc || '')); }); } },
          { label: 'Ball stays on screen after a long time (400 frames)', runtime: true, frames: 400, expr: function (f) { return shapeVar(f, 0); },
            test: function (v) { return typeof v === 'number' && v > -30 && v < 430; }, fail: 'Check both edges: x > width and x < 0.' }
        ],
        hints: [
          'Describe a bounce in words: "If the ball hits a wall, it starts going the other way." Which variable holds "the way it is going"?',
          'Add let speed = 4; and use x = x + speed;. When x is past either edge, flip the direction: speed = -speed;. Use || to check both edges in one condition.',
          `x = x + speed;
if (x > width || x < ___) {
  speed = ___;
}`
        ],
        solution: `// Bouncing ball: reverses at both edges
let x = 200;
let speed = 4;
let size = 40;

function setup() {
  createCanvas(400, 200);
  describe('A maroon ball bounces back and forth between the left and right edges.');
}

function draw() {
  background(239, 232, 212);
  fill(112, 0, 46);
  circle(x, height / 2, size);

  x = x + speed;

  // bounce off the right or left edge
  if (x > width - size / 2 || x < size / 2) {
    speed = -speed;
  }
}`,
        solutionQuiz: [
          { q: 'Why compare with width - size / 2 instead of width?', options: ['So the ball bounces when its edge touches the wall, not its center', 'Because width is wrong', 'To make it faster', 'It is required by if'], answer: 0, why: 'x is the circle\'s center. Its right edge is x + size / 2.' },
          { q: 'What does || mean in that condition?', options: ['OR: bounce if either edge is hit', 'AND: both edges at once', 'Equals', 'Not'], answer: 0, why: '|| is true when at least one side is true.' }
        ]
      },
      read: {
        context: 'A store dashboard shows customer satisfaction as a colored gauge. Explain how the color is chosen.',
        code: `let score = 72;

function setup() {
  createCanvas(300, 300);
  noStroke();
}

function draw() {
  background(255);
  if (score >= 90) {
    fill(29, 60, 52);     // dark green
  } else if (score >= 70) {
    fill(237, 139, 0);    // copper
  } else {
    fill(155, 28, 28);    // red
  }
  circle(150, 150, 200);
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text(score, 150, 150);
}`,
        ideas: [
          { label: 'the score decides the color', keys: ['score', 'decid', 'depend', 'choose'], prompt: 'What controls the color?' },
          { label: 'three ranges: 90+, 70–89, below 70', keys: ['90', '70', 'range', 'green', 'copper', 'red'], prompt: 'What are the three cases?' },
          { label: 'checks go in order; the first true one wins', keys: ['order', 'first', 'else', 'otherwise', 'skip'], prompt: 'Why does order matter?' },
          { label: 'the number is shown on the circle', keys: ['text', 'number', 'show', 'display', 'written'], prompt: 'What else is drawn?' }
        ],
        questions: [
          { q: 'With score = 72, what color is the circle?', options: ['Copper', 'Dark green', 'Red'], answer: 0, why: ['72 is not >= 90, but it is >= 70.', '72 is not >= 90.', 'The else only runs if both checks fail.'] },
          { q: 'With score = 70 exactly, what color is the circle?', options: ['Copper, because >= includes 70', 'Red, because 70 is not more than 70'], answer: 0, why: ['>= means "greater than or equal to". Always test the boundary value.', 'That would be true for > but not for >=.'] },
          { q: 'If the first two checks were swapped (>= 70 first), what would a score of 95 show?', options: ['Copper, because 95 >= 70 is true first, so the green check is never reached', 'Dark green', 'Red'], answer: 0, why: ['In an if / else if chain, the first true condition wins.', 'The green check would be skipped because an earlier one was already true.', '95 passes the first check.'] }
        ],
        model: 'A circle shows the satisfaction score as a color, with the number written in the middle. The if / else if / else chain checks the score in order: 90 or more is dark green, 70 to 89 is copper, and anything lower is red. Order matters, because the first true condition wins and the rest are skipped. With score = 72, the circle is copper.'
      },
      bugs: [
        {
          rating: 'blue', title: 'Stuck at the start',
          intent: 'A circle moves right and wraps back to the left side when it passes the right edge.',
          code: `let x = 0;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, 100, 40);
  x = x + 3;
  if (x = width) {
    x = 0;
  }
}`,
          type: 'logic', lines: [11],
          causes: ['= assigns instead of comparing, so the condition is always true and x keeps resetting', 'width is not defined', 'x should start at 400', 'if always needs an else'],
          cause: 0,
          why: 'x = width stores 400 in x, and 400 counts as "true", so the block runs every frame and resets x to 0. The circle never moves. Use > (or >=) to compare.',
          fixed: `let x = 0;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, 100, 40);
  x = x + 3;
  if (x > width) {
    x = 0;
  }
}`,
          fix: { test: function (f) { return !f.ifs.some(function (i) { return i.hasAssignTest; }); },
            probes: [{ frames: 30, expr: 'x', test: function (v) { return v > 50; } }], fail: 'Compare x with width using > instead of assigning with =.' }
        },
        {
          rating: 'black', title: 'Half a bounce',
          intent: 'A ball bounces between the left and right edges forever.',
          code: `let x = 200;
let speed = 5;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, 100, 40);
  x = x + speed;
  if (x > width) {
    speed = -speed;
  }
}`,
          type: 'logic', lines: [12],
          causes: ['The condition only checks the right edge; nothing checks x < 0', 'speed = -speed is wrong', 'speed is too fast', 'x should be declared inside draw()'],
          cause: 0,
          why: 'It looks right for a few seconds: the ball bounces off the right wall, then sails off the left side forever. Testing for a short time hides the bug. Watch long enough to see every case.',
          fixed: `let x = 200;
let speed = 5;

function setup() {
  createCanvas(400, 200);
}

function draw() {
  background(220);
  circle(x, 100, 40);
  x = x + speed;
  if (x > width || x < 0) {
    speed = -speed;
  }
}`,
          fix: { test: function (f) { return f.ifs.some(function (i) { return /</.test(i.testSrc); }); },
            probes: [{ frames: 400, expr: 'x', test: function (v) { return v > -30 && v < 430; } }], fail: 'The ball should still be on screen after 400 frames.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Inventory alert' },
        spec: ['Stock below 10 shows red', 'Stock from 10 to 24 shows copper/yellow', 'Stock 25 or more shows green', 'Shows a text label, not color alone (accessibility)'],
        prompt: 'p5 sketch: show red/yellow/green for stock level',
        aiCode: `let stock = 5;

function setup() {
  createCanvas(400, 200);
  textSize(28);
  textAlign(CENTER, CENTER);
}

function draw() {
  background(255);
  if (stock < 25) {
    fill(237, 139, 0);
    rect(50, 50, 300, 100);
  } else if (stock < 10) {
    fill(155, 28, 28);
    rect(50, 50, 300, 100);
  } else {
    fill(29, 60, 52);
    rect(50, 50, 300, 100);
  }
}`,
        checklist: [
          { answer: 'no', why: 'stock = 5 is < 25, so the first branch (copper) wins. The red branch can never run.' },
          { answer: 'yes', why: 'Values 10 to 24 are < 25, so they show copper.' },
          { answer: 'yes', why: '25 or more fails both checks and reaches the else (green).' },
          { answer: 'no', why: 'Only color. People who are colorblind need a word like "Reorder now".' }
        ],
        tryHint: 'Edit stock and run it with 9, 10, 24, and 25. Boundaries are where bugs hide.',
        issue: {
          q: 'Which testing strategy would have caught the red-never-shows bug fastest?',
          options: ['Try values at and around each boundary: 9, 10, 24, 25', 'Run it once with the default value', 'Make the canvas bigger', 'Ask the AI if it tested it'],
          answer: 0,
          why: 'Boundary testing is how programmers check decisions. One test case cannot cover three ranges.'
        },
        verdicts: {
          accept: 'Not yet. One whole requirement (red) can never happen, and it relies on color alone.',
          revise: 'Good call. Reorder the checks (< 10 first) and add text labels. The repeated rect() can also move after the if.',
          reject: 'Defensible, but the fix is small: swap two conditions and add text().'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'the exact thresholds (10 and 25)', keys: ['10', '25'] },
          { label: 'a text label, not color alone', keys: ['text', 'label', 'word', 'colou?r alone', 'colou?r only', 'colorblind'] },
          { label: 'what happens exactly at the boundaries', keys: ['boundar', 'exactly', 'inclusive', 'equal', 'edge case', '>=', 'or more'] }
        ]
      }
    },

    /* ================================================================ 7 */
    {
      id: 7,
      title: 'Interaction',
      tagline: 'Mouse, keyboard, and events.',
      concepts: ['mouseX / mouseY', 'mouseIsPressed', 'mousePressed()', 'keyPressed()', 'text()'],
      learn: {
        brief: [
          '<code>mouseX</code> and <code>mouseY</code> always hold the mouse position. <code>mouseIsPressed</code> is true while a button is held down.',
          'Checking <code>mouseIsPressed</code> in draw() asks "is it down <em>right now</em>?" about 60 times a second.',
          'An <strong>event function</strong> like <code>mousePressed()</code> or <code>keyPressed()</code> runs <strong>once</strong> per click or key press.',
          '<code>text(\'words\', x, y)</code> draws text on the canvas.'
        ],
        sayIt: [
          ['if (mouseIsPressed) { ... }', 'Every frame, ask: is a mouse button down right now? If so, run the block.'],
          ['function mousePressed() { count = count + 1; }', 'Each time the mouse is clicked, add 1 to count.'],
          ['mouseX > 100 && mouseX < 300', 'The mouse is right of 100 AND left of 300.']
        ],
        terms: [
          ['event', 'Something that happens, like a click or key press, that your code can respond to.'],
          ['hover', 'The mouse is over something without clicking.'],
          ['keyCode', 'Which key was pressed, for special keys like LEFT_ARROW or ENTER.']
        ],
        example: `function setup() {
  createCanvas(400, 400);
  noStroke();
}

function draw() {
  background(240);
  if (mouseIsPressed) {
    fill(112, 0, 46);
  } else {
    fill(29, 60, 52);
  }
  circle(mouseX, mouseY, 60);
}`,
        predict: {
          q: 'Before you run it: what happens when you hold the mouse button down over the canvas?',
          options: ['The circle follows the mouse and turns maroon while the button is held', 'The circle turns maroon once and stays maroon', 'Nothing happens until you let go', 'A new circle appears at each click'],
          answer: 0,
          why: 'The circle is drawn at (mouseX, mouseY) every frame. mouseIsPressed is checked every frame, so the color switches back as soon as you let go.'
        },
        tryThis: ['Remove background(240). Now you have a paint program!', 'Use mouseX to control the circle\'s size instead of its position.', 'Add a keyPressed() function that prints the key you pressed.']
      },
      build: {
        context: { kind: 'Business', title: 'Event sign-up kiosk', story: 'The student union is running a tablet kiosk at an event. Visitors tap a button to sign up, and organizers want to see the running count. The button should react when the pointer is over it so people know it is clickable.' },
        plan: PLAN,
        task: 'Draw a rectangle button that changes color when the mouse is over it (check mouseX AND mouseY). Count clicks with a mousePressed() function, and show the count with text().',
        starter: `let clicks = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(255);

}`,
        checks: [
          { label: 'Draws a rectangle button', test: function (f) { return f.has('rect'); } },
          { label: 'Checks whether the mouse is over it, using mouseX and mouseY with &&', test: function (f, code) { return f.uses('mouseX') && f.uses('mouseY') && /&&/.test(code); } },
          { label: 'Defines mousePressed()', test: function (f) { return !!f.fn('mousePressed'); } },
          { label: 'A counter goes up inside mousePressed()', test: function (f) { return f.assignments.some(function (a) { return a.fn === 'mousePressed' && /\+/.test(a.op + (a.valueSrc || '')); }); } },
          { label: 'Shows the count with text()', test: function (f) { return f.has('text'); } }
        ],
        hints: [
          'A button needs three behaviors: look clickable (hover), respond once per click, and show the result. Which p5 tool fits each one?',
          'Hover: the mouse is over the button when mouseX is between its left and right edges AND mouseY is between its top and bottom edges. Counting once per click belongs in mousePressed(), not draw().',
          `if (mouseX > 100 && mouseX < 300 && mouseY > 150 && mouseY < ___) {
  fill(70, 0, 29);
} else {
  fill(112, 0, 46);
}

function mousePressed() {
  // only count clicks on the button
}`
        ],
        solution: `// Event kiosk: a button that counts sign-ups
let clicks = 0;
let btnX = 100;
let btnY = 150;
let btnW = 200;
let btnH = 80;

function setup() {
  createCanvas(400, 400);
  textAlign(CENTER, CENTER);
  textSize(24);
  describe('A Sign up button. The number of sign-ups appears below it.');
}

function draw() {
  background(255);

  // darker when the mouse is over the button
  if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(70, 0, 29);
  } else {
    fill(112, 0, 46);
  }
  rect(btnX, btnY, btnW, btnH, 10);

  fill(255);
  text('Sign up', width / 2, btnY + btnH / 2);
  fill(0);
  text('Sign-ups: ' + clicks, width / 2, 300);
}

function mousePressed() {
  // only count clicks that land on the button
  if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    clicks = clicks + 1;
  }
}`,
        solutionQuiz: [
          { q: 'Why is clicks = clicks + 1 inside mousePressed() and not inside draw()?', options: ['mousePressed() runs once per click; draw() would add 1 on every frame the button is held', 'draw() cannot change variables', 'It is only a style choice', 'mousePressed() runs faster'], answer: 0, why: 'Event functions fire once per event. draw() repeats about 60 times a second.' },
          { q: 'Why does the condition use && four times instead of ||?', options: ['The mouse must be inside on all four sides at once', 'Any one side being true is enough', '&& is just faster', 'It does not matter'], answer: 0, why: 'With ||, being anywhere in the button\'s row or column would count as "over".' }
        ]
      },
      read: {
        context: 'Click the canvas first so it gets keyboard focus, then use the arrow keys and r. Explain how it responds.',
        code: `let x = 180;
let y = 180;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  square(x, y, 40);
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    x = x - 20;
  } else if (keyCode === RIGHT_ARROW) {
    x = x + 20;
  } else if (key === 'r') {
    x = 180;
    y = 180;
  }
}`,
        ideas: [
          { label: 'a square drawn at (x, y)', keys: ['square', 'box'], prompt: 'What is drawn?' },
          { label: 'arrow keys move it left/right by 20', keys: ['arrow', 'left', 'right', '20'], prompt: 'What do the arrow keys do?' },
          { label: 'r resets it to the start', keys: ['reset', '\\br\\b', 'start', 'back', '180'], prompt: 'What does r do?' },
          { label: 'keyPressed runs once per key press', keys: ['once', 'each press', 'every press', 'event', 'keypressed'], prompt: 'When does keyPressed() run?' }
        ],
        questions: [
          { q: 'You hold the right arrow down for two seconds. How far does the square move?', options: ['20 pixels: keyPressed() runs once per press', 'About 2,400 pixels: 20 per frame', 'It moves until you let go'], answer: 0, why: ['p5 runs keyPressed() once when the key goes down. Holding it does not repeat.', 'That would happen if the movement were in draw() using keyIsDown().', 'Only one press is counted.'] },
          { q: 'What does pressing r do?', options: ['Moves the square back to (180, 180)', 'Moves it right', 'Nothing, because r is not a keyCode'], answer: 0, why: ['key === \'r\' checks the typed character.', 'Right movement is the RIGHT_ARROW branch.', 'key holds typed characters like \'r\'. keyCode is for special keys like the arrows.'] },
          { q: 'Why does pressing the up arrow do nothing?', options: ['No branch checks UP_ARROW', 'Up arrow is not a real key', 'y cannot change'], answer: 0, why: ['Only left, right, and r are handled. Adding UP_ARROW is a good extension.', 'It is, and p5 calls it UP_ARROW.', 'y is a normal variable. Nothing here happens to change it except r.'] }
        ],
        model: 'A square is drawn at (x, y) every frame. keyPressed() runs once each time a key goes down. The left and right arrows move the square 20 pixels in that direction, and r puts it back at (180, 180). Up and down are not handled. Because movement happens in the event function, holding a key down moves it only once.'
      },
      bugs: [
        {
          rating: 'blue', title: 'The overeager button',
          intent: 'The button turns dark only when the mouse is over it.',
          code: `let btnX = 100;
let btnY = 150;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(255);
  // the button turns dark only when the mouse is over it
  if (mouseX > btnX && mouseX < btnX + 200 || mouseY > btnY && mouseY < btnY + 80) {
    fill(70, 0, 29);
  } else {
    fill(200);
  }
  rect(btnX, btnY, 200, 80);
}`,
          type: 'logic', lines: [11],
          causes: ['|| means either part can be true; it should be && so x AND y are both inside', 'btnX + 200 should be btnX - 200', 'fill(200) is too light', 'rect() needs a fifth argument'],
          cause: 0,
          why: 'With ||, being in the button\'s column OR its row is enough, so the button lights up across a big cross shape. Move the mouse along the edges to see it.',
          fixed: `let btnX = 100;
let btnY = 150;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(255);
  // the button turns dark only when the mouse is over it
  if (mouseX > btnX && mouseX < btnX + 200 && mouseY > btnY && mouseY < btnY + 80) {
    fill(70, 0, 29);
  } else {
    fill(200);
  }
  rect(btnX, btnY, 200, 80);
}`,
          fix: { test: function (f) { return f.ifs.some(function (i) { return /mouseX/.test(i.testSrc) && /mouseY/.test(i.testSrc) && !/\|\|/.test(i.testSrc); }); },
            probes: [{ frames: 2, expr: '(function () { mouseX = 50; mouseY = 190; redraw(); return get(200, 190); })()', test: function (v) { return v && v[0] > 150; } }],
            fail: 'With the mouse at (50, 190), left of the button but in its row, the button should stay light.' }
        },
        {
          rating: 'black', title: 'Click inflation',
          intent: 'Count one per click, no matter how long the button is held.',
          code: `let count = 0;

function setup() {
  createCanvas(400, 200);
  textSize(32);
}

function draw() {
  background(255);
  if (mouseIsPressed) {
    count = count + 1;
  }
  fill(0);
  text('Clicks: ' + count, 20, 100);
}`,
          type: 'logic', lines: [10, 11],
          causes: ['draw() runs every frame, so while the button is held the count goes up about 60 times a second', 'count should be declared inside draw()', 'text() is adding extra numbers', 'mouseIsPressed is misspelled'],
          cause: 0,
          why: 'mouseIsPressed is true for every frame the button is down. Even a quick click lasts several frames. Counting belongs in mousePressed(), which runs exactly once per click.',
          fixed: `let count = 0;

function setup() {
  createCanvas(400, 200);
  textSize(32);
}

function draw() {
  background(255);
  fill(0);
  text('Clicks: ' + count, 20, 100);
}

function mousePressed() {
  count = count + 1;
}`,
          fix: { test: function (f) { return !!f.fn('mousePressed') && f.assignments.some(function (a) { return a.fn === 'mousePressed' && a.base === 'count'; }) && !f.assignments.some(function (a) { return a.fn === 'draw' && a.base === 'count'; }); }, fail: 'Move the counting into a mousePressed() function.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Kiosk for everyone' },
        spec: ['Clicking the button adds one sign-up', 'Pressing Enter also adds one (for keyboard users)', 'The count is shown as text', 'Clicking outside the button does nothing'],
        prompt: 'make a sign-up button that counts clicks',
        aiCode: `let count = 0;

function setup() {
  createCanvas(400, 300);
  textSize(24);
}

function draw() {
  background(255);
  fill(112, 0, 46);
  rect(100, 100, 200, 80);
  fill(255);
  text('Sign up', 160, 150);
  fill(0);
  text(count, 190, 250);
}

function mousePressed() {
  count = count + 1;
}`,
        checklist: [
          { answer: 'yes', why: 'mousePressed() adds one.' },
          { answer: 'no', why: 'There is no keyPressed(), so keyboard users cannot sign up.' },
          { answer: 'yes', why: 'text(count, ...) shows it, though a label like "Sign-ups:" would be clearer.' },
          { answer: 'no', why: 'mousePressed() never checks where the mouse is. A click anywhere counts.' }
        ],
        issue: {
          q: 'Which requirement could the AI never have guessed from the student\'s prompt?',
          options: ['That keyboard users must be able to press Enter', 'That it should count clicks', 'That it should use p5', 'That it should show a button'],
          answer: 0,
          why: 'Accessibility needs are often left out of prompts, and AI tools will not add them unless asked. You are responsible for including them.'
        },
        verdicts: {
          accept: 'Not yet. It excludes keyboard users and counts clicks anywhere.',
          revise: 'Good call. Add a position check in mousePressed() and a keyPressed() that handles ENTER.',
          reject: 'Defensible, but most of the code is fine and two additions fix it.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'keyboard support (Enter key)', keys: ['enter', 'keyboard', 'keypressed', 'key'] },
          { label: 'only clicks on the button count', keys: ['inside', 'outside', 'only when', 'on the button', 'over the button', 'hover', 'only click'] },
          { label: 'a clear text label for the count', keys: ['label', 'text', 'sign-ups:'] }
        ]
      }
    },

    /* ================================================================ 8 */
    {
      id: 8,
      title: 'Loops',
      tagline: 'Repeat work without copying and pasting.',
      concepts: ['for loop', 'loop variable', 'iteration', 'off-by-one', 'nested loops'],
      learn: {
        brief: [
          'A <code>for</code> loop repeats a block. It has three parts: <strong>start</strong>; <strong>condition</strong>; <strong>update</strong>.',
          'The loop variable (often <code>i</code>) changes each time, so you can use it to place things: <code>50 + i * 75</code>.',
          '<code>i &lt; 5</code> starting at 0 runs 5 times (0, 1, 2, 3, 4). Using <code>&lt;=</code> runs one extra time, the classic <strong>off-by-one</strong> error.',
          'If the update never moves toward making the condition false, the loop never ends and the page freezes. (This app stops runaway loops for you.)'
        ],
        sayIt: [
          ['for (let i = 0; i < 5; i++)', 'Start i at 0. While i is less than 5, run the block, then add 1 to i.'],
          ['i++', 'Add 1 to i. Short for i = i + 1.'],
          ['circle(50 + i * 75, 100, 40);', 'Each time through, place the circle 75 pixels further right than the last one.']
        ],
        terms: [
          ['iteration', 'One trip through the loop body.'],
          ['off-by-one', 'Looping one time too many or too few.'],
          ['nested loop', 'A loop inside a loop, handy for grids.']
        ],
        example: `function setup() {
  createCanvas(400, 200);
  background(240);
  fill(112, 0, 46);
  for (let i = 0; i < 5; i++) {
    circle(50 + i * 75, 100, 40);
  }
}`,
        predict: {
          q: 'Before you run it: how many circles appear, and where is the last one?',
          options: ['5 circles; the last at x = 350', '5 circles; the last at x = 425', '6 circles', '4 circles'],
          answer: 0,
          why: 'i takes the values 0, 1, 2, 3, 4: that is 5 times. The last circle is at 50 + 4 × 75 = 350.'
        },
        tryThis: ['Change 5 to 10. Why do some circles disappear?', 'Make the spacing depend on width so 10 circles fit.', 'Use i to change the size too: circle(..., 10 + i * 8).']
      },
      build: {
        context: { kind: 'Business', title: 'Campus parking map', story: 'The campus transportation office wants a simple parking map for its app. Lots have different numbers of spaces, so the number of spaces must be easy to change.' },
        plan: PLAN,
        task: 'Draw a row of numbered parking spaces with a for loop. A variable must control how many spaces there are, and you need at least 8.',
        starter: `function setup() {
  createCanvas(400, 200);
  background(60);

}`,
        checks: [
          { label: 'Uses a for loop', test: function (f) { return f.loops.some(function (l) { return l.type === 'ForStatement'; }); } },
          { label: 'A variable controls how many spaces (used in the loop condition)', test: function (f) { var names = f.globals.concat(f.locals).map(function (v) { return v.name; }); return f.loops.some(function (l) { return names.some(function (n) { return new RegExp('\\b' + n + '\\b').test(l.testSrc); }); }); }, fail: 'Use something like let spaces = 10; and then i < spaces in the loop.' },
          { label: 'The loop variable positions each space', test: function (f) { return f.shapeCalls.some(function (c) { return c.inLoop && c.argSrc.some(function (s) { return /\bi\b|\b(col|row|n|j|k|space|index)\b/.test(s); }); }) || f.locals.some(function (l) { return l.inLoop; }); } },
          { label: 'Draws at least 8 spaces (counted while running)', runtime: true, frames: 1, expr: function () { return '__shapeCalls()'; },
            test: function (v) { if (!v) { return false; } var s = v.setup || {}; var d = v.draw || {}; return ((s.rect || 0) + (s.square || 0)) >= 8 || ((d.rect || 0) + (d.square || 0)) >= 8; } },
          { label: 'Numbers each space with text()', test: function (f) { return (f.callsByName.text || []).some(function (c) { return c.inLoop; }); } }
        ],
        hints: [
          'Draw two spaces by hand first. What changes between them? That changing number is where the loop variable goes.',
          'let spaces = 10; then for (let i = 0; i < spaces; i++). Space number i starts at x = 20 + i * width-of-a-space. Label with text(i + 1, ...) so numbering starts at 1.',
          `let spaces = 10;
let spaceW = 36;

for (let i = 0; i < spaces; i++) {
  let x = 20 + i * spaceW;
  rect(x, 50, spaceW, 80);
  text(___, x + spaceW / 2, 90);
}`
        ],
        solution: `// Parking lot map: one row of numbered spaces
let spaces = 10;
let spaceW = 36;

function setup() {
  createCanvas(400, 200);
  background(60);
  textAlign(CENTER, CENTER);
  textSize(16);

  for (let i = 0; i < spaces; i++) {
    let x = 20 + i * spaceW;
    stroke(255);
    strokeWeight(2);
    noFill();
    rect(x, 50, spaceW, 80);          // outline of one space
    noStroke();
    fill(255);
    text(i + 1, x + spaceW / 2, 90);  // space number, starting at 1
  }
  describe('A parking lot map with a row of 10 numbered spaces.');
}`,
        solutionQuiz: [
          { q: 'Why is the label i + 1 instead of i?', options: ['i starts at 0, but people number spaces from 1', 'text() cannot show 0', 'To skip a space', 'It is a mistake'], answer: 0, why: 'Loops usually count from 0; people count from 1.' },
          { q: 'With 10 spaces of width 36 starting at x = 20, where does the last one end?', options: ['x = 380', 'x = 400', 'x = 360', 'x = 416'], answer: 0, why: 'The last space (i = 9) starts at 20 + 9 × 36 = 344 and ends at 344 + 36 = 380.' }
        ]
      },
      read: {
        context: 'Run it. Explain how two loops make this pattern.',
        code: `let size = 50;

function setup() {
  createCanvas(400, 400);
  noStroke();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 0) {
        fill(112, 0, 46);
      } else {
        fill(239, 232, 212);
      }
      square(col * size, row * size, size);
    }
  }
}`,
        ideas: [
          { label: 'a checkerboard of 8 × 8 squares', keys: ['checker', 'grid', '64', '8', 'board', 'pattern'], prompt: 'What appears?' },
          { label: 'the outer loop goes through rows, the inner loop through columns', keys: ['row', 'column', 'col', 'nested', 'inner', 'outer'], prompt: 'What does each loop do?' },
          { label: 'even/odd (% 2) decides the color', keys: ['%', 'even', 'odd', 'alternat', 'remainder', 'mod'], prompt: 'How is the color chosen?' },
          { label: 'position = column/row × size', keys: ['size', 'position', '\\*', 'times', 'multipl'], prompt: 'How is each square placed?' }
        ],
        questions: [
          { q: 'How many squares are drawn?', options: ['64', '16', '8', '56'], answer: 0, why: ['8 rows × 8 columns. The inner loop runs fully for every row.', 'That would be 8 + 8, but the loops multiply.', 'That is only one row.', 'Every row has all 8.'] },
          { q: 'What does (row + col) % 2 === 0 check?', options: ['Whether row + col is even, which alternates the colors', 'Whether it is the first row', 'Whether the square is half size'], answer: 0, why: ['% gives the remainder. An even number divided by 2 leaves 0.', 'It checks every square, not just one row.', '% is the remainder operator, not division.'] },
          { q: 'What color is the top-left square (row 0, col 0)?', options: ['Maroon', 'Wheat'], answer: 0, why: ['0 + 0 = 0, which is even, so it gets the maroon fill.', '0 is even, so it is the maroon branch.'] }
        ],
        model: 'Two nested loops draw an 8 × 8 checkerboard: 64 squares. The outer loop goes through each row, and for every row the inner loop goes through each column. Each square is placed at (col × size, row × size). If row + col is even (the remainder after dividing by 2 is 0), it is maroon; otherwise wheat. That makes the colors alternate.'
      },
      bugs: [
        {
          rating: 'black', title: 'The invisible extra space',
          intent: 'Draw exactly 10 parking spaces, each 40 wide, filling a 400-wide canvas.',
          code: `function setup() {
  createCanvas(400, 100);
  background(60);
  stroke(255);
  noFill();
  // exactly 10 parking spaces, each 40 wide
  for (let i = 0; i <= 10; i++) {
    rect(i * 40, 10, 40, 80);
  }
}`,
          type: 'logic', lines: [7],
          causes: ['<= 10 runs for i = 0 through 10: that is 11 times, not 10', 'i * 40 should be i + 40', 'The rect is too tall', 'noFill() hides one space'],
          cause: 0,
          why: 'It looks correct, because the 11th space is drawn at x = 400, just off the canvas. You cannot see this bug; you can only reason it out by counting iterations. If this map fed a "spaces available" count, it would be wrong by one.',
          fixed: `function setup() {
  createCanvas(400, 100);
  background(60);
  stroke(255);
  noFill();
  // exactly 10 parking spaces, each 40 wide
  for (let i = 0; i < 10; i++) {
    rect(i * 40, 10, 40, 80);
  }
}`,
          fix: { test: function () { return true; },
            probes: [{ frames: 1, expr: '__shapeCalls()', test: function (v) { return v && v.setup && v.setup.rect === 10; } }], fail: 'Exactly 10 rects should be drawn.' }
        },
        {
          rating: 'black', title: 'The loop that never ends',
          intent: 'Draw a row of 8 circles.',
          code: `function setup() {
  createCanvas(400, 200);
  background(240);
  // a row of 8 circles
  for (let i = 0; i < 8; i--) {
    circle(25 + i * 50, 100, 40);
  }
}`,
          type: 'runtime', alsoOk: ['logic'], lines: [5],
          causes: ['i-- makes i smaller, so i < 8 is always true and the loop never stops', 'The circles are too big', '25 + i * 50 goes off the canvas', 'The loop should start at 1'],
          cause: 0,
          why: 'i goes 0, -1, -2, ... and is always less than 8, so the loop runs forever. A normal browser would freeze. This app stops it and reports a runtime problem, but the root cause is a logic mistake in the update step.',
          fixed: `function setup() {
  createCanvas(400, 200);
  background(240);
  // a row of 8 circles
  for (let i = 0; i < 8; i++) {
    circle(25 + i * 50, 100, 40);
  }
}`,
          fix: { test: function () { return true; },
            probes: [{ frames: 1, expr: '__shapeCalls()', test: function (v) { return v && v.setup && v.setup.circle === 8; } }], fail: 'Exactly 8 circles should be drawn.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Lecture hall seating chart' },
        spec: ['5 rows with 8 seats in each row (40 seats)', 'Seats numbered 1 to 40', 'Fits on a 400 × 300 canvas', 'You can explain every line using what you have learned'],
        prompt: 'make a seating chart in p5 with numbered seats',
        aiCode: `function setup() {
  createCanvas(400, 300);
  background(255);
  textAlign(CENTER, CENTER);
  const seats = Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({ x: 40 + c * 70, y: 20 + r * 35 })));
  seats.flat().forEach((s, n) => {
    fill(239, 232, 212);
    rect(s.x - 15, s.y - 12, 30, 24);
    fill(0);
    text(n, s.x, s.y);
  });
}`,
        checklist: [
          { answer: 'no', why: 'It makes 8 rows of 5: rows and seats are swapped. Still 40 seats, so a quick glance looks fine.' },
          { answer: 'no', why: 'n starts at 0, so seats are numbered 0 to 39.' },
          { answer: 'yes', why: 'The largest y is 20 + 7 × 35 = 265, which fits in 300.' },
          { answer: 'no', why: 'Array.from, arrow functions (=>), .flat(), and forEach have not been covered. Can you defend each line?' }
        ],
        issue: {
          q: 'This code uses tools you have not learned yet. What is the responsible next step?',
          options: ['Ask the AI to rewrite it with for loops you understand (or study each new part until you can explain it), then fix the two bugs', 'Submit it, since it mostly works', 'Never use AI again', 'Change numbers until it looks right'],
          answer: 0,
          why: 'Never submit code you cannot explain. Asking for code at your level, or learning the new parts, keeps you in charge of the program.'
        },
        verdicts: {
          accept: 'No. It has two requirement bugs and code you cannot yet explain.',
          revise: 'Reasonable: re-prompt for beginner-level for loops, then fix rows/seats and numbering.',
          reject: 'Also reasonable. Starting from your own nested loop (like the checkerboard) may be clearer than repairing code you cannot read.'
        },
        best: ['revise', 'reject'],
        promptIdeas: [
          { label: '5 rows of 8 seats', keys: ['5 rows', 'five rows', '8 seats', 'eight seats', 'rows of 8'] },
          { label: 'numbering starts at 1', keys: ['from 1', 'start at 1', 'starting at 1', '1 to 40', '1-40', 'one'] },
          { label: 'beginner-level code (for loops) you can explain', keys: ['for loop', 'beginner', 'simple', 'explain', 'only use', 'basic'] }
        ]
      }
    },

    /* ================================================================ 9 */
    {
      id: 9,
      title: 'Functions',
      tagline: 'Name a chunk of work, then reuse it.',
      concepts: ['defining functions', 'parameters', 'arguments', 'return values', 'decomposition'],
      learn: {
        brief: [
          'You can define your own functions: <code>function drawTree(x, y) { ... }</code>.',
          '<strong>Parameters</strong> (x, y) are placeholders. Each call fills them with <strong>arguments</strong>: <code>drawTree(80, 250);</code>',
          '<code>return</code> sends a value back to whoever called the function, so you can use the result: <code>let total = price(3);</code>',
          'Breaking a problem into well-named functions (<strong>decomposition</strong>) makes it easier to build, test, and explain.'
        ],
        sayIt: [
          ['drawTree(80, 250);', 'Call drawTree, sending 80 into the parameter x and 250 into y.'],
          ['function area(w, h) { return w * h; }', 'Define area, which takes w and h and gives back their product.'],
          ['let a = area(3, 4);', 'Call area with 3 and 4, and store what it returns (12) in a.']
        ],
        terms: [
          ['parameter', 'A named input in a function definition.'],
          ['return value', 'What a function hands back to its caller.'],
          ['decomposition', 'Splitting a big problem into smaller named pieces.']
        ],
        example: `function setup() {
  createCanvas(400, 300);
  background(200, 230, 255);
  drawTree(80, 250);
  drawTree(200, 250);
  drawTree(320, 250);
}

// draws one tree with its trunk base at (x, y)
function drawTree(x, y) {
  noStroke();
  fill(110, 70, 40);
  rect(x - 10, y - 60, 20, 60);                          // trunk
  fill(29, 100, 60);
  triangle(x - 50, y - 50, x + 50, y - 50, x, y - 160);  // leaves
}`,
        predict: {
          q: 'Before you run it: how many trees, and why can the same code draw them in different places?',
          options: ['Three; each call sends different x values into the parameters', 'One; functions only run once', 'Three, all in the same spot', 'None; drawTree is defined after setup()'],
          answer: 0,
          why: 'The function body uses x and y, so each call with new arguments draws in a new place. Function definitions can come anywhere in the file.'
        },
        tryThis: ['Add a fourth tree with one line.', 'Add a third parameter, size, and use it to scale the tree.', 'Write a function drawForest(count) that uses a loop to call drawTree.']
      },
      build: {
        context: { kind: 'Game', title: 'Coin placement tool', story: 'A level designer places coins by hand, and each coin is worth 10 points. They want a reusable way to draw a coin anywhere, and a way to calculate how many points a level is worth.' },
        plan: PLAN,
        task: 'Write your own function with at least two parameters that draws something, and call it at least three times with different arguments. Then write a second function that returns a value, and show that value with text().',
        starter: `function setup() {
  createCanvas(400, 300);
  background(29, 60, 52);

}`,
        checks: [
          { label: 'Defines your own function with at least two parameters', test: function (f) { return f.userFunctions.some(function (u) { return u.params.length >= 2; }); } },
          { label: 'That function uses its parameters', test: function (f) { return f.userFunctions.some(function (u) { return u.params.length >= 2 && u.params.every(function (p) { return (f.identifiers[p] || []).some(function (r) { return r.fn === u.name && r.parent.type !== 'FunctionDeclaration'; }); }); }); } },
          { label: 'Calls it at least three times', test: function (f) { return f.userFunctions.some(function (u) { return u.params.length >= 2 && f.count(u.name) >= 3; }); } },
          { label: 'Another function returns a value', test: function (f) { return f.returns.some(function (r) { return r.hasValue && f.userFunctions.some(function (u) { return u.name === r.fn; }); }); } },
          { label: 'Shows a result with text()', test: function (f) { return f.has('text'); } }
        ],
        hints: [
          'What is the same about every coin, and what is different? The different parts become parameters.',
          'function drawCoin(x, y) { circle(x, y, 30); } then call drawCoin(80, 150); three times with new numbers. For the value: function coinPoints(count) { return count * 10; }',
          `function drawCoin(x, y) {
  fill(237, 139, 0);
  circle(___, ___, 30);
}

function coinPoints(count) {
  return ___;
}`
        ],
        solution: `// Level designer: place coins with one reusable function
let coinSize = 30;

function setup() {
  createCanvas(400, 300);
  background(29, 60, 52);
  drawCoin(80, 150);
  drawCoin(200, 100);
  drawCoin(320, 150);

  fill(255);
  textSize(20);
  text('Level value: ' + coinPoints(3) + ' points', 20, 280);
  describe('Three gold coins on a dark green background with the level value written below.');
}

// draws one coin centered at (x, y)
function drawCoin(x, y) {
  stroke(112, 0, 46);
  strokeWeight(3);
  fill(237, 139, 0);
  circle(x, y, coinSize);
  noStroke();
}

// each coin is worth 10 points
function coinPoints(count) {
  return count * 10;
}`,
        solutionQuiz: [
          { q: 'What does coinPoints(3) give back?', options: ['30', '3', 'Nothing; it draws text', '10'], answer: 0, why: 'It returns count * 10, which is 3 × 10.' },
          { q: 'Why does drawCoin end with noStroke()?', options: ['So the outline setting does not leak into shapes drawn after it', 'To erase the coin', 'p5 requires it', 'It makes the coin round'], answer: 0, why: 'Style settings are shared state. Resetting them keeps the function from surprising its callers.' }
        ]
      },
      read: {
        context: 'Run it and move your mouse over the box. Explain the role of the isInside function.',
        code: `let boxX = 120;
let boxY = 120;
let boxSize = 160;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(255);
  if (isInside(mouseX, mouseY)) {
    fill(29, 60, 52);
  } else {
    fill(220);
  }
  square(boxX, boxY, boxSize);
}

// returns true when the point (px, py) is inside the box
function isInside(px, py) {
  return px > boxX && px < boxX + boxSize &&
         py > boxY && py < boxY + boxSize;
}`,
        ideas: [
          { label: 'a box turns green when the mouse is over it', keys: ['green', 'hover', 'over', 'mouse'], prompt: 'What does the user see?' },
          { label: 'isInside returns true or false', keys: ['return', 'true', 'false', 'boolean'], prompt: 'What does isInside give back?' },
          { label: 'mouseX/mouseY are passed in as px/py', keys: ['px', 'py', 'parameter', 'argument', 'pass'], prompt: 'How does the mouse position get into the function?' },
          { label: 'the function gives the condition a readable name', keys: ['readab', 'name', 'reus', 'clear', 'clean', 'organiz'], prompt: 'Why use a function here?' }
        ],
        questions: [
          { q: 'What does isInside(200, 200) return?', options: ['true', 'false', '200'], answer: 0, why: ['200 is between 120 and 280 for both x and y.', 'Check each comparison: all four are true.', 'The function returns the result of a true/false expression, not a number.'] },
          { q: 'Why put this check in a function instead of writing it in draw()?', options: ['It names the idea, can be reused (for example, in mousePressed), and keeps draw() readable', 'Functions run faster', 'if statements cannot hold && conditions'], answer: 0, why: ['Good function names make code read like a description of the program.', 'Speed is not the reason.', 'They can. This is about clarity and reuse.'] },
          { q: 'What would happen if you deleted the word return?', options: ['The function would give back undefined, which counts as false, so the box would never turn green', 'Nothing changes', 'A syntax error'], answer: 0, why: ['Without return, the comparison is calculated and then thrown away.', 'It changes everything: no value comes back.', 'The code is still valid, which makes it a sneaky logic bug.'] }
        ],
        model: 'A square box turns green when the mouse is over it and gray otherwise. Each frame, draw() calls isInside(mouseX, mouseY). Inside the function, those values are named px and py. It returns true only if the point is between the box\'s left and right edges and between its top and bottom edges. Putting the check in a named function makes draw() easy to read, and the check can be reused elsewhere.'
      },
      bugs: [
        {
          rating: 'blue', title: 'One house, three addresses',
          intent: 'Draw three houses side by side using the drawHouse function.',
          code: `function setup() {
  createCanvas(400, 300);
  background(200, 230, 255);
  drawHouse(60, 250);
  drawHouse(170, 250);
  drawHouse(280, 250);
}

// draws a house whose bottom-left corner is at (x, y)
function drawHouse(x, y) {
  fill(239, 232, 212);
  rect(60, 170, 80, 80);
  fill(112, 0, 46);
  triangle(50, 170, 150, 170, 100, 120);
}`,
          type: 'logic', lines: [12, 14],
          causes: ['drawHouse uses fixed numbers instead of x and y, so every house is drawn in the same spot', 'drawHouse is called too many times', 'Functions must be defined before setup()', 'The triangle covers the other houses'],
          cause: 0,
          why: 'The function receives x and y but ignores them. All three calls draw the same house in the same place, stacked on top of each other. The positions must be calculated from the parameters.',
          fixed: `function setup() {
  createCanvas(400, 300);
  background(200, 230, 255);
  drawHouse(60, 250);
  drawHouse(170, 250);
  drawHouse(280, 250);
}

// draws a house whose bottom-left corner is at (x, y)
function drawHouse(x, y) {
  fill(239, 232, 212);
  rect(x, y - 80, 80, 80);
  fill(112, 0, 46);
  triangle(x - 10, y - 80, x + 90, y - 80, x + 40, y - 130);
}`,
          fix: { test: function (f) { return ['x', 'y'].every(function (p) { return (f.identifiers[p] || []).filter(function (r) { return r.fn === 'drawHouse'; }).length >= 3; }); },
            probes: [{ frames: 1, expr: 'get(320, 210)', test: function (v) { return v && v[0] > 230; } }], fail: 'The third house (x = 280) should appear on the right.' }
        },
        {
          rating: 'black', title: 'The total that vanished',
          intent: 'Show "Total: $12" for 3 items at $4 each.',
          code: `let price = 4;
let quantity = 3;

function setup() {
  createCanvas(400, 200);
  background(255);
  textSize(28);
  text('Total: $' + totalCost(price, quantity), 40, 100);
}

// calculates the cost of an order
function totalCost(p, q) {
  let total = p * q;
}`,
          type: 'logic', lines: [13, 14],
          causes: ['The function calculates total but never returns it, so the call gives back undefined', 'p * q is the wrong formula', 'text() cannot show numbers', 'price and quantity should be inside setup()'],
          cause: 0,
          why: 'The screen says "Total: $undefined". The calculation happens, but without return the result stays trapped inside the function. Every function without a return gives back undefined.',
          fixed: `let price = 4;
let quantity = 3;

function setup() {
  createCanvas(400, 200);
  background(255);
  textSize(28);
  text('Total: $' + totalCost(price, quantity), 40, 100);
}

// calculates the cost of an order
function totalCost(p, q) {
  let total = p * q;
  return total;
}`,
          fix: { test: function (f) { return f.returns.some(function (r) { return r.fn === 'totalCost' && r.hasValue; }); },
            probes: [{ frames: 1, expr: 'totalCost(4, 3)', test: function (v) { return v === 12; } }], fail: 'totalCost(4, 3) should give back 12.' }
        }
      ],
      judge: {
        context: { kind: 'Game', title: 'Scoring function' },
        spec: ['A function scoreFor(coins, allCollected) returns the score', '10 points per coin', '50 bonus points only when allCollected is true', 'Does not change any global variables'],
        prompt: 'write a p5 function for game score with coins and a bonus',
        aiCode: `let score = 0;

function setup() {
  createCanvas(400, 200);
  textSize(24);
  scoreFor(5, true);
  text('Score: ' + score, 20, 100);
}

function scoreFor(coins, allCollected) {
  score = coins * 10;
  if (allCollected = true) {
    score = score + 50;
  }
  print(score);
}`,
        checklist: [
          { answer: 'no', why: 'It prints and changes a global; nothing is returned.' },
          { answer: 'yes', why: 'coins * 10.' },
          { answer: 'no', why: 'allCollected = true assigns, so the bonus is always added. Try scoreFor(5, false).' },
          { answer: 'no', why: 'It overwrites the global score.' }
        ],
        tryHint: 'Change the call to scoreFor(5, false) and run it. What should the score be?',
        issue: {
          q: 'The screen shows "Score: 100" for 5 coins plus the bonus, which is correct. Why is that not enough to trust it?',
          options: ['One test can hide bugs. scoreFor(5, false) still adds the bonus, and nothing is returned', 'It is enough; the output is right', 'The AI must have tested it', 'The font is too small'],
          answer: 0,
          why: 'A single passing test proves very little. Test each branch, and check the requirement ("returns") directly.'
        },
        verdicts: {
          accept: 'No. Three of four requirements fail even though the one visible test passes.',
          revise: 'Reasonable: return a local value, use === (or just if (allCollected)), and remove the global.',
          reject: 'Also reasonable. The function is short, and writing it yourself from the spec may be faster and clearer.'
        },
        best: ['revise', 'reject'],
        promptIdeas: [
          { label: 'must return the value', keys: ['return'] },
          { label: 'no global variables / side effects', keys: ['global', 'side effect', 'not change', 'pure', 'only return'] },
          { label: 'bonus only when allCollected is true', keys: ['only', 'bonus', '50', 'allcollected'] },
          { label: 'example inputs and outputs to test', keys: ['example', 'test', 'false', 'should equal', 'expected'] }
        ]
      }
    },

    /* ================================================================ 10 */
    {
      id: 10,
      title: 'Arrays and Objects',
      tagline: 'Collections of data, one system.',
      concepts: ['arrays', 'index', '.length', 'objects and properties', 'push / splice'],
      learn: {
        brief: [
          'An <strong>array</strong> holds a list: <code>let sales = [120, 80, 150, 60];</code>. Items are numbered from <strong>0</strong>: <code>sales[0]</code> is 120.',
          '<code>sales.length</code> is how many items there are. Loop with <code>i &lt; sales.length</code> to visit each one.',
          'An <strong>object</strong> groups related values under names: <code>{ x: 100, y: 0, speed: 2 }</code>. Read one with <code>drop.y</code>.',
          'An array of objects lets one loop update and draw many things. That is the heart of most games and dashboards.'
        ],
        sayIt: [
          ['sales[2]', 'The item at index 2 in the sales array: the third item, because counting starts at 0.'],
          ['for (let i = 0; i < sales.length; i++)', 'Visit every index from 0 up to, but not including, the length.'],
          ['flake.y = flake.y + flake.speed;', 'Move this flake down by its own speed.']
        ],
        terms: [
          ['index', 'An item\'s position number in an array, starting at 0.'],
          ['property', 'A named value inside an object, like .x or .price.'],
          ['push', 'Add an item to the end of an array.']
        ],
        example: `let sales = [120, 80, 150, 60];

function setup() {
  createCanvas(400, 200);
  background(255);
  fill(112, 0, 46);
  for (let i = 0; i < sales.length; i++) {
    rect(40 + i * 90, 180 - sales[i], 60, sales[i]);
  }
}`,
        predict: {
          q: 'Before you run it: how many bars are there, and which is tallest?',
          options: ['4 bars; the third is tallest', '4 bars; the first is tallest', '3 bars', '150 bars'],
          answer: 0,
          why: 'The loop runs once per item (length is 4). sales[2] is 150, the biggest value, and index 2 is the third bar.'
        },
        tryThis: ['Add a fifth number to the array. Did you need to change the loop?', 'Label each bar with its value using text().', 'Turn the array into objects like { month: \'Jan\', amount: 120 } and label by month.']
      },
      build: {
        context: { kind: 'Game', title: 'Snowfall system', story: 'A winter-themed game needs falling snow in the background. Each flake should have its own position and speed, and flakes should recycle to the top so the snow never runs out.' },
        plan: PLAN,
        task: 'Use an array of objects (at least 3) with properties like x, y, and speed. Loop over the array with .length to draw and move each one, and send items back to the top when they fall off the bottom.',
        starter: `let flakes = [];

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20, 30, 60);

}`,
        checks: [
          { label: 'An array holds at least 3 items (written out, or added with push in a loop)', test: function (f) { return f.globals.some(function (g) { return g.init && g.init.type === 'ArrayExpression' && g.init.elements.length >= 3; }) || f.calls.some(function (c) { return /\.push$/.test(c.name) && c.inLoop; }); } },
          { label: 'Items are objects with properties', test: function (f) { return f.objects > 0; } },
          { label: 'A loop uses .length to visit each item', test: function (f) { return f.loops.some(function (l) { return /\.length/.test(l.testSrc); }) || f.loops.some(function (l) { return l.type === 'ForOfStatement'; }); } },
          { label: 'A property is updated inside the loop (like flake.y = ...)', test: function (f) { return f.assignments.some(function (a) { return a.member && a.inLoop && a.fn === 'draw'; }); } },
          { label: 'Items recycle: after 400 frames they are all still near the canvas', runtime: true, frames: 400, expr: function (f) { var a = firstArrayGlobal(f); return a ? a + '.length > 0 && ' + a + '.every(function (o) { return typeof o.y !== "number" || (o.y > -100 && o.y < height + 100); })' : null; },
            test: function (v) { return v === true; }, fail: 'When an item\'s y is greater than height, set it back to 0 (or above the top).' }
        ],
        hints: [
          'Start with one flake as an object and get it falling and recycling. Then turn it into a list.',
          'In setup(), use a for loop with flakes.push({ x: random(width), y: random(height), speed: random(1, 3) }). In draw(), loop i < flakes.length, draw flakes[i], add its speed to its y, and if its y > height, set its y = 0.',
          `for (let i = 0; i < flakes.length; i++) {
  let flake = flakes[i];
  circle(flake.x, flake.y, 6);
  flake.y = flake.y + ___;
  if (___) {
    flake.y = 0;
  }
}`
        ],
        solution: `// Snowfall: an array of flake objects, each with its own position and speed
let flakes = [];
let flakeCount = 30;

function setup() {
  createCanvas(400, 400);
  noStroke();
  for (let i = 0; i < flakeCount; i++) {
    flakes.push({ x: random(width), y: random(height), speed: random(1, 3) });
  }
  describe('White snowflakes fall at different speeds over a dark blue night sky.');
}

function draw() {
  background(20, 30, 60);
  fill(255);
  for (let i = 0; i < flakes.length; i++) {
    let flake = flakes[i];
    circle(flake.x, flake.y, 6);
    flake.y = flake.y + flake.speed;
    // back to the top after leaving the bottom
    if (flake.y > height) {
      flake.y = 0;
      flake.x = random(width);
    }
  }
}`,
        solutionQuiz: [
          { q: 'let flake = flakes[i]; then flake.y = ... changes the flake in the array. Why?', options: ['flake points to the same object that is in the array, not a copy', 'It does not; it changes a copy', 'Because of the for loop', 'Because flake is global'], answer: 0, why: 'Objects are shared by reference. Both names refer to the same flake.' },
          { q: 'Why give each flake its own speed property?', options: ['So flakes fall at different rates, which looks natural, and each item carries its own data', 'Arrays require it', 'To use more memory', 'Speed must be an object'], answer: 0, why: 'Objects bundle each item\'s data together.' }
        ]
      },
      read: {
        context: 'A café\'s checkout screen. Explain how the total is calculated.',
        code: `let cart = [
  { name: 'Coffee', price: 4, qty: 2 },
  { name: 'Bagel', price: 3, qty: 1 },
  { name: 'Juice', price: 5, qty: 3 }
];

function setup() {
  createCanvas(400, 250);
  background(255);
  textSize(20);
  let total = 0;
  for (let i = 0; i < cart.length; i++) {
    let item = cart[i];
    text(item.name + ' x' + item.qty, 30, 40 + i * 40);
    total = total + item.price * item.qty;
  }
  text('Total: $' + total, 30, 200);
}`,
        ideas: [
          { label: 'the cart is an array of item objects', keys: ['array', 'list', 'object', 'item'], prompt: 'How is the cart stored?' },
          { label: 'the loop lists each item', keys: ['loop', 'each', 'every', 'list'], prompt: 'What does the loop draw?' },
          { label: 'total adds price × quantity for each item', keys: ['price', 'qty', 'quantity', 'multipl', 'add', 'sum', '\\*'], prompt: 'How is the total built up?' },
          { label: 'the total is $26', keys: ['26'], prompt: 'What total appears?' }
        ],
        questions: [
          { q: 'What total is shown?', options: ['$26', '$12', '$6', '$15'], answer: 0, why: ['4×2 + 3×1 + 5×3 = 8 + 3 + 15 = 26.', 'That adds prices times 1 and forgets quantities.', 'That adds the quantities only.', 'That is only the juice.'] },
          { q: 'What is cart[1].name?', options: ['\'Bagel\'', '\'Coffee\'', '\'Juice\''], answer: 0, why: ['Index 1 is the second item, because indexes start at 0.', 'Coffee is cart[0].', 'Juice is cart[2].'] },
          { q: 'If "let total = 0;" moved inside the loop, what would happen?', options: ['An error on the last line: total would only exist inside the loop\'s { }', 'The total would be $15', 'Nothing changes'], answer: 0, why: ['A let variable lives only inside the block where it is declared. Outside the loop, total does not exist: a runtime error.', 'It would also reset every time through, but the last line cannot see it at all.', 'Where a variable lives (its scope) matters.'] }
        ],
        model: 'The cart is an array of objects, each with a name, price, and quantity. setup() starts total at 0, then loops through every item: it writes the item\'s name and quantity on its own line and adds price × quantity to total. After the loop, it shows the total: 4×2 + 3×1 + 5×3 = $26. total is declared before the loop so the last line can still use it.'
      },
      bugs: [
        {
          rating: 'black', title: 'One drop too many',
          intent: 'Three raindrops fall down the screen.',
          code: `let drops = [
  { x: 80, y: 0 },
  { x: 200, y: 50 },
  { x: 320, y: 100 }
];

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20, 30, 60);
  fill(187, 221, 230);
  for (let i = 0; i <= drops.length; i++) {
    circle(drops[i].x, drops[i].y, 12);
    drops[i].y = drops[i].y + 2;
  }
}`,
          type: 'runtime', lines: [14], near: { 15: 'The crash is reported on line 15, but that line is fine for real drops. Ask why drops[i] is undefined. Look at what controls i.' },
          causes: ['i <= drops.length reaches i = 3, but the last index is 2, so drops[3] is undefined', 'drops should be declared in draw()', 'circle() cannot use object properties', 'The drops are falling too fast'],
          cause: 0,
          why: 'The error appears on line 15 ("cannot read properties of undefined"), but the cause is line 14. With 3 items the indexes are 0, 1, 2. <= lets i reach 3, and drops[3] does not exist. The line that crashes is not always the line that is wrong.',
          fixed: `let drops = [
  { x: 80, y: 0 },
  { x: 200, y: 50 },
  { x: 320, y: 100 }
];

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20, 30, 60);
  fill(187, 221, 230);
  for (let i = 0; i < drops.length; i++) {
    circle(drops[i].x, drops[i].y, 12);
    drops[i].y = drops[i].y + 2;
  }
}`,
          fix: { test: function () { return true; }, probes: [{ frames: 30, expr: 'drops[0].y', test: function (v) { return v > 30; } }], fail: 'The drops should keep falling with no error.' }
        },
        {
          rating: 'double', title: 'The clearance sale that skips',
          intent: 'Remove every price under $5, leaving only 8 and 12.',
          code: `let prices = [2, 3, 8, 4, 12];

function setup() {
  createCanvas(400, 200);
  background(255);
  textSize(20);
  // remove every price under $5
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] < 5) {
      prices.splice(i, 1);
    }
  }
  text('$5 and up: ' + prices.join(', '), 20, 100);
}`,
          type: 'logic', lines: [8, 10],
          causes: ['Removing an item shifts the later items left, so the loop skips the item right after each removal', 'splice(i, 1) removes two items', '< 5 should be <= 5', 'join() changes the array'],
          cause: 0,
          why: 'Trace it: at i = 0, 2 is removed, and 3 slides into index 0. Then i becomes 1, so 3 is never checked. The result is "3, 8, 12". Fix it by looping backwards (from the end, i--) or by building a new array with only the items you keep.',
          fixed: `let prices = [2, 3, 8, 4, 12];

function setup() {
  createCanvas(400, 200);
  background(255);
  textSize(20);
  // remove every price under $5 (go backwards so removals don't shift what's left to check)
  for (let i = prices.length - 1; i >= 0; i--) {
    if (prices[i] < 5) {
      prices.splice(i, 1);
    }
  }
  text('$5 and up: ' + prices.join(', '), 20, 100);
}`,
          fix: { test: function () { return true; }, probes: [{ frames: 1, expr: 'prices.join(",")', test: function (v) { return v === '8,12'; } }], fail: 'prices should end up as 8, 12.' }
        }
      ],
      judge: {
        context: { kind: 'Business', title: 'Event ticket dashboard' },
        spec: ['A bar for each event in the events array, for any number of events', 'A sold-out event (sold equals capacity) is labeled "SOLD OUT" in text', 'Shows the total tickets sold across all events', 'Runs without errors'],
        prompt: 'p5 dashboard showing ticket sales for events as bars',
        aiCode: `let events = [
  { name: 'Concert', sold: 300, capacity: 300 },
  { name: 'Lecture', sold: 120, capacity: 200 },
  { name: 'Game', sold: 450, capacity: 500 }
];

function setup() {
  createCanvas(400, 300);
  background(255);
  textSize(16);
  let total = 0;
  for (let i = 0; i < 3; i++) {
    let e = events[i];
    let barW = map(e.sold, 0, e.capacity, 0, 250);
    fill(e.sold > e.capacity ? color(155, 28, 28) : color(29, 60, 52));
    rect(120, 30 + i * 60, barW, 30);
    fill(0);
    text(e.name, 20, 50 + i * 60);
    total = e.sold;
  }
  text('Total sold: ' + total, 20, 260);
}`,
        checklist: [
          { answer: 'partly', why: 'It draws a bar for each of these 3, but i < 3 is hard-coded. Add a 4th event and it is ignored. Use events.length.' },
          { answer: 'no', why: 'sold > capacity is never true at exactly capacity (use >=), and it only changes the color. There is no "SOLD OUT" text.' },
          { answer: 'no', why: 'total = e.sold replaces instead of adding, so it shows 450, not 870.' },
          { answer: 'yes', why: 'It runs. Every bug here is a logic bug.' }
        ],
        tryHint: 'Add a fourth event to the array and run it. Then work out the total by hand: 300 + 120 + 450.',
        issue: {
          q: 'Which quick check would reveal the total bug?',
          options: ['Work it out by hand (300 + 120 + 450 = 870) and compare with the screen (450)', 'Run it twice', 'Make the bars wider', 'Check for red error messages'],
          answer: 0,
          why: 'Know the expected answer before you look at the output. Logic bugs never produce error messages.'
        },
        verdicts: {
          accept: 'No. Three requirement failures in a dashboard means wrong numbers in front of decision-makers.',
          revise: 'Good call. Use events.length, use += for the total, use >= and add text("SOLD OUT", ...). The structure is sound.',
          reject: 'Defensible, but the structure is sound and each fix is one line you can explain.'
        },
        best: ['revise'],
        promptIdeas: [
          { label: 'sold out means sold equals capacity, labeled in text', keys: ['sold out', 'equal', '>=', 'at capacity', 'label'] },
          { label: 'a total that adds every event', keys: ['total', 'sum', 'add'] },
          { label: 'works for any number of events', keys: ['any number', 'length', 'flexib', 'more events', 'however many'] }
        ]
      }
    }
  ];

  /* ================================================================ Capstone */
  var CAPSTONE = {
    id: 'final',
    title: 'Final Project: Design a System',
    tagline: 'Problem first, then code. You decide where help belongs, and you document it.',
    briefs: [
      { id: 'game', kind: 'Game', title: 'p5play arcade game', story: 'A small 2D game with sprites, a group of enemies or collectibles, scoring, and a clear win or lose state (Weeks 6–9).' },
      { id: 'data', kind: 'Business', title: 'Data-driven visualization', story: 'Load a JSON or text file and turn it into an interactive visualization built from classes. For example, a campus food pantry tracker that warns, in text, when an item runs low (Weeks 6–7).' },
      { id: 'scene', kind: 'Art', title: 'Interactive 3D scene', story: 'A WEBGL piece with primitives or a model, lights, a texture, and camera or keyboard interaction (Weeks 12–13).' },
      { id: 'sound', kind: 'Art', title: 'Audio-reactive particle piece', story: 'Particles or shapes that respond to sound and collisions, with sound that starts after a click (Weeks 8 and 11).' },
      { id: 'own', kind: 'Your idea', title: 'Your own system', story: 'Propose your own small tool, game, or artwork. Keep it small enough to finish, test, and explain.' }
    ],
    starter: `// MART 220 Final Project
// Name:
// Worked with: (classmates you collaborated with, or "no one")
// AI use: see the AI Use Declaration in my field journal
//
// Requirements (from my design):
//  1.
//  2.
//  3.

// --- state: what the program remembers ---

function setup() {
  createCanvas(400, 400);
  describe('');
}

function draw() {
  background(255);
}

// --- my classes and functions ---
`,
    checks: [
      C.fn('setup'), C.fn('draw'),
      { label: 'Organizes the code with at least one class of your own', test: function (f) { return f.classes.length >= 1; } },
      { label: 'Makes a decision with if', test: function (f) { return f.ifs.length >= 1; } },
      { label: 'Uses a loop or an array', test: function (f) { return f.loops.length >= 1 || f.arrays >= 1; } },
      { label: 'Responds to the mouse or keyboard', test: function (f) { return f.usesMouse || f.usesKeys; } },
      C.describe,
      C.noErrors
    ]
  };

  var api = { LEVELS: LEVELS, CAPSTONE: CAPSTONE, PLAN: PLAN,
    helpers: { C: C, bright: bright, anyCall: anyCall, shapeVar: shapeVar, firstArrayGlobal: firstArrayGlobal, startsBefore: startsBefore } };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.P5TrailLevels = api;
})(typeof window !== 'undefined' ? window : globalThis);
