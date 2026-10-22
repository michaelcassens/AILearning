/* p5.js Code Trail — code analyzer.
 * Parses student code with acorn, collects facts about it, writes a short
 * plain-language description, and makes improvement suggestions.
 * Works in the browser (window.P5TrailAnalyzer) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  var acornLib = root.acorn || (typeof require === 'function' ? require('../libs/acorn.min.js') : null);

  var P5_HANDLERS = ['setup', 'draw', 'preload', 'mousePressed', 'mouseReleased', 'mouseClicked',
    'mouseMoved', 'mouseDragged', 'mouseWheel', 'doubleClicked', 'keyPressed', 'keyReleased',
    'keyTyped', 'windowResized', 'touchStarted', 'touchMoved', 'touchEnded'];

  var P5_FUNCS = ['createCanvas', 'resizeCanvas', 'background', 'clear', 'fill', 'noFill', 'stroke',
    'noStroke', 'strokeWeight', 'ellipse', 'circle', 'rect', 'square', 'line', 'point', 'triangle',
    'quad', 'arc', 'bezier', 'curve', 'beginShape', 'endShape', 'vertex', 'text', 'textSize',
    'textAlign', 'textFont', 'textStyle', 'textWidth', 'print', 'random', 'noise', 'map', 'constrain',
    'dist', 'lerp', 'lerpColor', 'color', 'red', 'green', 'blue', 'alpha', 'abs', 'floor', 'ceil',
    'round', 'sqrt', 'pow', 'min', 'max', 'sin', 'cos', 'tan', 'atan2', 'radians', 'degrees',
    'push', 'pop', 'translate', 'rotate', 'scale', 'frameRate', 'noLoop', 'loop', 'redraw',
    'rectMode', 'ellipseMode', 'angleMode', 'colorMode', 'image', 'loadImage', 'describe',
    'describeElement', 'millis', 'second', 'minute', 'hour', 'day', 'month', 'year', 'int',
    'float', 'str', 'nf', 'split', 'join', 'append', 'shuffle', 'sort', 'keyIsDown', 'cursor',
    'noCursor', 'randomSeed', 'get', 'set', 'erase', 'noErase', 'strokeCap', 'strokeJoin',
    'smooth', 'noSmooth', 'createButton', 'createSlider', 'createP', 'select', 'saveCanvas'];

  var P5_VARS = ['width', 'height', 'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'mouseIsPressed',
    'mouseButton', 'key', 'keyCode', 'keyIsPressed', 'frameCount', 'deltaTime', 'windowWidth',
    'windowHeight', 'PI', 'TWO_PI', 'HALF_PI', 'QUARTER_PI', 'LEFT_ARROW', 'RIGHT_ARROW',
    'UP_ARROW', 'DOWN_ARROW', 'ENTER', 'RETURN', 'BACKSPACE', 'ESCAPE', 'SHIFT', 'CENTER',
    'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'CORNER', 'CORNERS', 'RADIUS', 'CLOSE', 'BOLD', 'ITALIC',
    'NORMAL', 'DEGREES', 'RADIANS', 'RGB', 'HSB', 'ROUND', 'SQUARE', 'PROJECT'];

  var JS_GLOBALS = ['console', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'JSON',
    'Date', 'parseInt', 'parseFloat', 'isNaN', 'undefined', 'NaN', 'Infinity', 'window',
    'document', 'alert', 'setTimeout', 'setInterval', 'clearInterval', 'clearTimeout', 'Error',
    'Map', 'Set', 'Promise', 'Symbol'];

  var SHAPES = { ellipse: 'ellipse', circle: 'circle', rect: 'rectangle', square: 'square',
    line: 'line', point: 'point', triangle: 'triangle', quad: 'quad', arc: 'arc', text: 'text label',
    beginShape: 'custom shape', image: 'image' };

  var DRAW_CALLS = Object.keys(SHAPES).concat(['background']);

  function plural(n, word, many) {
    return n + ' ' + (n === 1 ? word : (many || word + 's'));
  }

  function levenshtein(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    var dp = [];
    for (var i = 0; i <= a.length; i++) { dp[i] = [i]; }
    for (var j = 0; j <= b.length; j++) { dp[0][j] = j; }
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return dp[a.length][b.length];
  }

  function closest(name, candidates) {
    var best = null, bestD = Infinity;
    candidates.forEach(function (c) {
      var d = levenshtein(name, c);
      if (d < bestD) { bestD = d; best = c; }
    });
    var limit = name.length <= 4 ? 1 : 2;
    if (best && best.toLowerCase() === name.toLowerCase()) { return best; }
    return bestD <= limit ? best : null;
  }

  /* ---------- Syntax errors: plain-language translation ---------- */

  function lineText(code, line) {
    return (code.split('\n')[line - 1] || '');
  }

  function friendlySyntax(err, code) {
    var msg = err.message.replace(/\s*\(\d+:\d+\)$/, '');
    var line = err.loc ? err.loc.line : null;
    var text = line ? lineText(code, line) : '';
    var prev = line && line > 1 ? lineText(code, line - 1) : '';
    var friendly = 'The computer could not read this line as JavaScript.';
    var opens = function (s, o, c) { return (s.split(o).length - 1) - (s.split(c).length - 1); };

    var atEnd = typeof err.pos === 'number' && err.pos >= code.replace(/\s+$/, '').length;
    var braceGap = opens(code.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '').replace(/\/\/.*$/gm, ''), '{', '}');
    if (atEnd && braceGap > 0) {
      friendly = 'The code ended while a block was still open: a { is missing its matching }. Check that every function and if-block is closed.';
      line = code.replace(/\s+$/, '').split('\n').length;
    } else if (/Unterminated string/.test(msg)) {
      friendly = 'A text string was started with a quote mark but never closed. Every \' or " needs a matching partner on the same line.';
    } else if (/Unexpected token \(/.test(msg) && /\b(function)\s*\(/.test(text) === false && /\w\s+\w+\s*\(/.test(text)) {
      friendly = 'Something is out of place before a ( . Check spelling and for a missing comma or operator.';
    } else if (/Unexpected token/.test(msg) || /Unexpected character/.test(msg)) {
      if (opens(text, '(', ')') > 0 || opens(prev, '(', ')') > 0) {
        friendly = 'It looks like a ( was opened but not closed with a matching ). Count the parentheses on this line (or the line above).';
      } else if (/\d\s+\d/.test(text.replace(/\/\/.*$/, ''))) {
        friendly = 'Two values sit next to each other with nothing between them. Arguments need commas between them, like ellipse(200, 200, 50, 50).';
      } else {
        friendly = 'Something unexpected appears here: often a missing comma, a missing ) or }, or an extra symbol. The real mistake may be just before this spot.';
      }
    } else if (/Unexpected end of input|Unexpected token \(\d/.test(msg) || /end of input/.test(msg)) {
      friendly = 'The code ended while a block was still open. A { is probably missing its matching }.';
    } else if (/Assigning to rvalue|Invalid left-hand side/.test(msg)) {
      friendly = 'The left side of = must be a variable name. Did you mean to compare with === instead?';
    } else if (/has already been declared/.test(msg)) {
      friendly = 'This variable name was declared twice with let/const. Declare it once, then just assign new values (name = value).';
    } else if (/Unexpected keyword/.test(msg)) {
      friendly = 'A reserved word (like let, if, or function) appears where it cannot go. Check the line above for a missing ) or }.';
    }
    return { line: line, column: err.loc ? err.loc.column + 1 : null, message: msg, friendly: friendly };
  }

  /* ---------- Runtime errors: plain-language translation ---------- */

  function friendlyRuntime(message, knownNames) {
    var m;
    var names = P5_FUNCS.concat(P5_VARS, P5_HANDLERS, knownNames || []);
    if ((m = /([\w$]+) is not defined/.exec(message))) {
      var guess = closest(m[1], names);
      return 'The program tried to use "' + m[1] + '", but nothing with that name exists.' +
        (guess ? ' Did you mean "' + guess + '"? JavaScript is case-sensitive.' : ' Check the spelling, or declare it with let first.');
    }
    if ((m = /([\w$.]+) is not a function/.exec(message))) {
      return '"' + m[1] + '" was called like a function with ( ), but it is not one. Check the spelling, or whether a variable has the same name.';
    }
    if (/Cannot read propert(y|ies) of undefined/.test(message) || /undefined has no properties/.test(message) || /is undefined/.test(message)) {
      return 'The code asked for a property (like .x) of something that is undefined. Often an array index went past the end of the list, or a variable was never given a value.';
    }
    if (/Cannot read propert(y|ies) of null/.test(message)) {
      return 'The code asked for a property of null (nothing). Something you expected to exist is missing.';
    }
    if (/Assignment to constant variable/.test(message)) {
      return 'A const variable was given a new value. Use let if the value needs to change.';
    }
    if (/before initialization/.test(message)) {
      return 'A variable was used before the line that declares it. Move the let/const above where it is used.';
    }
    if (/Maximum call stack/.test(message) || /too much recursion/.test(message)) {
      return 'A function keeps calling itself (directly or indirectly) and never stops.';
    }
    if (/infinite loop/i.test(message)) {
      return 'A loop never reached its stopping condition, so the program would freeze. Check that the loop variable moves toward the condition becoming false.';
    }
    return 'The code is readable, but something went wrong while it was running.';
  }

  /* ---------- AST helpers ---------- */

  function walk(node, visit, parent, ctx) {
    if (!node || typeof node.type !== 'string') { return; }
    var next = visit(node, parent, ctx) || ctx;
    for (var key in node) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'parentNode') { continue; }
      var child = node[key];
      if (Array.isArray(child)) {
        for (var i = 0; i < child.length; i++) {
          if (child[i] && typeof child[i].type === 'string') { walk(child[i], visit, node, next); }
        }
      } else if (child && typeof child.type === 'string') {
        walk(child, visit, node, next);
      }
    }
  }

  function src(code, node) { return node ? code.slice(node.start, node.end) : ''; }

  function memberName(node) {
    if (!node) { return null; }
    if (node.type === 'Identifier') { return node.name; }
    if (node.type === 'MemberExpression') {
      var obj = memberName(node.object);
      var prop = node.computed ? '[]' : (node.property.name || '');
      return obj ? obj + '.' + prop : null;
    }
    return null;
  }

  function baseName(node) {
    while (node && node.type === 'MemberExpression') { node = node.object; }
    return node && node.type === 'Identifier' ? node.name : null;
  }

  /* Evaluate a numeric expression when it only uses literals, width/height,
   * and global variables initialised with numbers. Returns null if unknown. */
  function makeEvaluator(facts) {
    var env = {};
    facts.globals.forEach(function (g) {
      if (g.init && g.init.type === 'Literal' && typeof g.init.value === 'number') { env[g.name] = g.init.value; }
    });
    if (facts.canvas) { env.width = facts.canvas.w; env.height = facts.canvas.h; }
    function ev(n, local) {
      if (!n) { return null; }
      switch (n.type) {
        case 'Literal': return typeof n.value === 'number' ? n.value : null;
        case 'Identifier':
          if (local && Object.prototype.hasOwnProperty.call(local, n.name)) { return local[n.name]; }
          return Object.prototype.hasOwnProperty.call(env, n.name) ? env[n.name] : null;
        case 'UnaryExpression':
          var a = ev(n.argument, local);
          return a === null ? null : (n.operator === '-' ? -a : (n.operator === '+' ? a : null));
        case 'BinaryExpression':
          var l = ev(n.left, local), r = ev(n.right, local);
          if (l === null || r === null) { return null; }
          switch (n.operator) {
            case '+': return l + r; case '-': return l - r; case '*': return l * r;
            case '/': return r === 0 ? null : l / r; case '%': return l % r;
          }
          return null;
        default: return null;
      }
    }
    return ev;
  }

  /* ---------- Main analysis ---------- */

  function analyze(code) {
    var result = { ok: true, code: code, syntaxError: null, facts: null, description: [], suggestions: [], strengths: [] };
    if (!acornLib) {
      try { new Function(code); } catch (e) {
        result.ok = false;
        result.syntaxError = { line: null, column: null, message: e.message, friendly: 'The computer could not read this code as JavaScript.' };
      }
      return result;
    }
    var comments = [];
    var ast;
    try {
      ast = acornLib.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true, onComment: comments });
    } catch (err) {
      result.ok = false;
      result.syntaxError = friendlySyntax(err, code);
      return result;
    }
    var facts = collect(ast, code, comments);
    result.facts = facts;
    result.ast = ast;
    facts.evalNum = makeEvaluator(facts);
    if (facts.canvasNode) {
      var w = facts.evalNum(facts.canvasNode.arguments[0]), h = facts.evalNum(facts.canvasNode.arguments[1]);
      if (w !== null && h !== null) { facts.canvas = { w: w, h: h }; facts.evalNum = makeEvaluator(facts); }
    }
    result.description = describe(facts);
    var s = suggest(facts, code);
    result.suggestions = s.suggestions;
    result.strengths = s.strengths;
    return result;
  }

  function collect(ast, code, comments) {
    var f = {
      lines: code.split('\n').length,
      nonBlankLines: code.split('\n').filter(function (l) { return l.trim(); }).length,
      comments: comments.length,
      calls: [], callsByName: {}, functions: [], globals: [], locals: [], assignments: [],
      ifs: [], loops: [], identifiers: {}, declared: {}, arrays: 0, objects: 0, members: [],
      returns: [], canvas: null, canvasNode: null, varKinds: { var: 0, let: 0, const: 0 },
      strings: []
    };

    // Top-level functions and globals
    ast.body.forEach(function (stmt) {
      if (stmt.type === 'FunctionDeclaration') {
        f.functions.push({ name: stmt.id.name, params: stmt.params.map(function (p) { return p.name || src(code, p); }),
          line: stmt.loc.start.line, endLine: stmt.loc.end.line, node: stmt,
          isP5Handler: P5_HANDLERS.indexOf(stmt.id.name) >= 0 });
      } else if (stmt.type === 'VariableDeclaration') {
        stmt.declarations.forEach(function (d) {
          if (d.id.type === 'Identifier') {
            f.globals.push({ name: d.id.name, kind: stmt.kind, line: d.loc.start.line, init: d.init });
          }
        });
      }
    });
    var fnNames = f.functions.map(function (x) { return x.name; });

    walk(ast, function (node, parent, ctx) {
      ctx = ctx || { fn: null, inLoop: 0, inIf: 0, loopVars: [] };
      var next = null;
      switch (node.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          var fname = node.id ? node.id.name : (ctx.fn || '(anonymous)');
          next = { fn: ctx.fn && node.type !== 'FunctionDeclaration' ? ctx.fn : fname, innerFn: !!ctx.fn,
            inLoop: ctx.fn ? ctx.inLoop : 0, inIf: ctx.fn ? ctx.inIf : 0, loopVars: ctx.loopVars };
          if (node.type === 'FunctionDeclaration' && ctx.fn) { next.fn = node.id.name; }
          node.params.forEach(function (p) {
            if (p.type === 'Identifier') { f.declared[p.name] = true; }
          });
          break;
        case 'VariableDeclaration':
          f.varKinds[node.kind]++;
          node.declarations.forEach(function (d) {
            if (d.id.type === 'Identifier') {
              f.declared[d.id.name] = true;
              if (ctx.fn) {
                f.locals.push({ name: d.id.name, kind: node.kind, line: d.loc.start.line, fn: ctx.fn, init: d.init, inLoop: ctx.inLoop > 0 });
              }
            }
          });
          break;
        case 'CallExpression':
          var name = memberName(node.callee) || src(code, node.callee);
          var call = { name: name, args: node.arguments, argSrc: node.arguments.map(function (a) { return src(code, a); }),
            line: node.loc.start.line, fn: ctx.fn, inLoop: ctx.inLoop > 0, inIf: ctx.inIf > 0, node: node, start: node.start };
          f.calls.push(call);
          (f.callsByName[name] = f.callsByName[name] || []).push(call);
          if (name === 'createCanvas' && !f.canvasNode) { f.canvasNode = node; f.canvasFn = ctx.fn; }
          break;
        case 'IfStatement':
        case 'ConditionalExpression':
          var t = node.test;
          f.ifs.push({ line: node.loc.start.line, testSrc: src(code, t), test: t, fn: ctx.fn, node: node,
            hasAssignTest: t.type === 'AssignmentExpression', ternary: node.type === 'ConditionalExpression' });
          next = { fn: ctx.fn, inLoop: ctx.inLoop, inIf: ctx.inIf + 1, loopVars: ctx.loopVars };
          break;
        case 'ForStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForOfStatement':
        case 'ForInStatement':
          f.loops.push({ type: node.type, line: node.loc.start.line, testSrc: src(code, node.test || node.right),
            node: node, fn: ctx.fn });
          next = { fn: ctx.fn, inLoop: ctx.inLoop + 1, inIf: ctx.inIf, loopVars: ctx.loopVars };
          break;
        case 'AssignmentExpression':
          f.assignments.push({ name: memberName(node.left) || src(code, node.left), base: baseName(node.left),
            op: node.operator, line: node.loc.start.line, fn: ctx.fn, inIf: ctx.inIf > 0, inLoop: ctx.inLoop > 0,
            member: node.left.type === 'MemberExpression', node: node, valueSrc: src(code, node.right) });
          break;
        case 'UpdateExpression':
          f.assignments.push({ name: memberName(node.argument) || src(code, node.argument), base: baseName(node.argument),
            op: node.operator, line: node.loc.start.line, fn: ctx.fn, inIf: ctx.inIf > 0, inLoop: ctx.inLoop > 0,
            member: node.argument.type === 'MemberExpression', node: node, update: true });
          break;
        case 'ArrayExpression': f.arrays++; break;
        case 'ObjectExpression': f.objects++; break;
        case 'MemberExpression':
          f.members.push({ name: memberName(node), line: node.loc.start.line, fn: ctx.fn });
          break;
        case 'ReturnStatement':
          f.returns.push({ line: node.loc.start.line, fn: ctx.fn, hasValue: !!node.argument });
          break;
        case 'Literal':
          if (typeof node.value === 'string') { f.strings.push(node.value); }
          break;
        case 'Identifier':
          var isProp = parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed;
          var isKey = parent && parent.type === 'Property' && parent.key === node && !parent.computed;
          if (!isProp && !isKey) {
            (f.identifiers[node.name] = f.identifiers[node.name] || []).push({ line: node.loc.start.line, fn: ctx.fn, node: node, parent: parent });
          }
          break;
      }
      return next;
    });

    f.fnNames = fnNames;
    f.userFunctions = f.functions.filter(function (x) { return !x.isP5Handler; });
    f.handlers = f.functions.filter(function (x) { return x.isP5Handler; }).map(function (x) { return x.name; });
    f.has = function (name) { return !!f.callsByName[name]; };
    f.count = function (name) { return (f.callsByName[name] || []).length; };
    f.shapeCalls = f.calls.filter(function (c) { return SHAPES[c.name]; });
    f.uses = function (id) { return !!f.identifiers[id]; };
    f.fn = function (name) { return f.functions.filter(function (x) { return x.name === name; })[0] || null; };
    f.usesMouse = ['mouseX', 'mouseY', 'mouseIsPressed', 'pmouseX', 'pmouseY'].some(f.uses) ||
      ['mousePressed', 'mouseReleased', 'mouseClicked', 'mouseMoved', 'mouseDragged'].some(function (h) { return f.handlers.indexOf(h) >= 0; });
    f.usesKeys = ['key', 'keyCode', 'keyIsPressed'].some(f.uses) ||
      ['keyPressed', 'keyReleased', 'keyTyped'].some(function (h) { return f.handlers.indexOf(h) >= 0; }) || f.has('keyIsDown');
    var globalNames = f.globals.map(function (g) { return g.name; });
    f.changedGlobals = unique(f.assignments.filter(function (a) {
      return a.fn && globalNames.indexOf(a.base) >= 0 && !isShadowed(f, a.base, a.fn);
    }).map(function (a) { return a.base; }));
    f.animatedGlobals = unique(f.assignments.filter(function (a) {
      return a.fn === 'draw' && globalNames.indexOf(a.base) >= 0 && !isShadowed(f, a.base, a.fn);
    }).map(function (a) { return a.base; }));
    return f;
  }

  function isShadowed(f, name, fn) {
    return f.locals.some(function (l) { return l.name === name && l.fn === fn; });
  }

  function unique(arr) {
    return arr.filter(function (x, i) { return x && arr.indexOf(x) === i; });
  }

  /* ---------- Description ---------- */

  function describe(f) {
    var out = [];
    if (f.canvas) {
      out.push('Makes a canvas ' + f.canvas.w + ' pixels wide and ' + f.canvas.h + ' pixels tall.');
    } else if (f.canvasNode) {
      out.push('Makes a canvas (its size comes from a calculation or variable).');
    } else {
      out.push('Does not create a canvas yet, so there is nowhere to draw.');
    }
    function kinds(calls) {
      var counts = {};
      calls.forEach(function (c) { counts[SHAPES[c.name]] = (counts[SHAPES[c.name]] || 0) + 1; });
      return counts;
    }
    function joinList(items) {
      if (items.length <= 1) { return items.join(''); }
      return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    }
    // "2 ellipses and a rectangle", plus "repeats circles in a loop" for shapes inside loops
    function shapeSummary(calls) {
      var once = kinds(calls.filter(function (c) { return !c.inLoop; }));
      var looped = kinds(calls.filter(function (c) { return c.inLoop; }));
      var parts = [];
      var onceList = Object.keys(once).map(function (k) { return plural(once[k], k); });
      if (onceList.length) { parts.push(joinList(onceList)); }
      var loopList = Object.keys(looped).map(function (k) { return k + 's'; });
      if (loopList.length) { parts.push((onceList.length ? 'plus ' : '') + joinList(loopList) + ' repeated by a loop'); }
      return parts.join(', ');
    }
    var setupShapes = f.shapeCalls.filter(function (c) { return c.fn === 'setup'; });
    var drawShapes = f.shapeCalls.filter(function (c) { return c.fn === 'draw'; });
    var otherShapes = f.shapeCalls.filter(function (c) { return c.fn !== 'setup' && c.fn !== 'draw' && c.fn; });
    if (setupShapes.length) {
      out.push('Once, at the start (setup), it draws ' + shapeSummary(setupShapes) + '.');
    }
    if (f.handlers.indexOf('draw') >= 0) {
      var bg = (f.callsByName.background || []).some(function (c) { return c.fn === 'draw'; });
      var desc = 'Over and over, about 60 times a second (draw), it ' + (bg ? 'repaints the background' : 'draws without clearing the background, so old frames stay visible');
      if (drawShapes.length) { desc += ' and draws ' + shapeSummary(drawShapes); }
      out.push(desc + '.');
    }
    if (otherShapes.length) {
      out.push('Your own functions draw ' + shapeSummary(otherShapes) + ' each time they are called.');
    }
    var fills = (f.callsByName.fill || []).length;
    if (fills) { out.push(fills === 1 ? 'Sets a fill color once.' : 'Sets the fill color ' + fills + ' times.'); }
    if (f.animatedGlobals.length) {
      out.push('Updates ' + listNames(f.animatedGlobals) + ' inside draw(), so something animates, reacts, or keeps count.');
    }
    if (f.ifs.length) {
      out.push('Makes decisions with ' + plural(f.ifs.length, 'condition') + ' (if / else or ?:).');
    }
    if (f.loops.length) {
      out.push('Repeats work with ' + plural(f.loops.length, 'loop') + '.');
    }
    if (f.userFunctions.length) {
      out.push('Defines your own ' + (f.userFunctions.length === 1 ? 'function ' : 'functions ') +
        f.userFunctions.map(function (x) { return x.name + '(' + x.params.join(', ') + ')'; }).join(', ') + '.');
    }
    if (f.arrays || f.objects) {
      var parts = [];
      if (f.arrays) { parts.push(plural(f.arrays, 'array')); }
      if (f.objects) { parts.push(plural(f.objects, 'object')); }
      out.push('Stores data in ' + parts.join(' and ') + '.');
    }
    var inter = [];
    if (f.usesMouse) { inter.push('the mouse'); }
    if (f.usesKeys) { inter.push('the keyboard'); }
    if (inter.length) { out.push('Responds to ' + inter.join(' and ') + '.'); }
    if (f.has('describe')) { out.push('Includes a describe() text alternative for screen reader users.'); }
    return out;
  }

  function listNames(names) {
    var q = names.map(function (n) { return '"' + n + '"'; });
    if (q.length <= 1) { return q.join(''); }
    return q.slice(0, -1).join(', ') + ' and ' + q[q.length - 1];
  }

  /* ---------- Suggestions ---------- */

  function suggest(f, code) {
    var sug = [], good = [];
    function add(kind, line, msg, why) { sug.push({ kind: kind, line: line, message: msg, why: why }); }

    var setupFn = f.fn('setup'), drawFn = f.fn('draw');
    if (!setupFn) {
      add('warn', null, 'There is no function setup() { }.', 'p5 looks for setup() to run once at the start. That is where createCanvas() usually goes.');
    }
    if (!f.canvasNode) {
      add('warn', setupFn ? setupFn.line : null, 'Call createCanvas(width, height) inside setup().', 'Without a canvas, nothing you draw will appear.');
    } else if (f.canvasFn === 'draw') {
      add('warn', f.canvasNode.loc.start.line, 'createCanvas() is inside draw(), so it runs 60 times a second.', 'Create the canvas once, in setup().');
    }

    // Unknown function calls (likely typos)
    var known = P5_FUNCS.concat(f.fnNames, JS_GLOBALS);
    f.calls.forEach(function (c) {
      if (c.name.indexOf('.') >= 0) { return; }
      if (known.indexOf(c.name) >= 0 || f.declared[c.name]) { return; }
      var guess = closest(c.name, P5_FUNCS.concat(f.fnNames));
      add('warn', c.line, '"' + c.name + '" is not a p5 function or one you defined.' + (guess ? ' Did you mean "' + guess + '"?' : ''),
        'JavaScript is case-sensitive and spelling-exact. This will cause a runtime error ("is not defined").');
    });

    // Undeclared identifiers that are assigned (implicit globals)
    var reported = {};
    f.assignments.forEach(function (a) {
      if (!a.member && a.base && !f.declared[a.base] && P5_VARS.indexOf(a.base) < 0 && !reported[a.base]) {
        reported[a.base] = true;
        add('warn', a.line, '"' + a.base + '" gets a value but was never declared with let or const.', 'Declare variables (let ' + a.base + ' = ...;) so it is clear where they live and typos get caught.');
      }
    });

    // Assignment used as a condition
    f.ifs.forEach(function (i) {
      if (i.hasAssignTest) {
        add('warn', i.line, 'The condition "' + i.testSrc + '" uses = (assign) instead of === (compare).', 'A single = changes the variable and is almost always true, so the if runs when you do not expect it.');
      }
    });

    // Local variable in draw that is updated: resets every frame
    f.locals.forEach(function (l) {
      if (l.fn !== 'draw' || l.inLoop) { return; }
      var updated = f.assignments.some(function (a) { return a.fn === 'draw' && a.base === l.name && a.line > l.line; });
      if (updated) {
        add('warn', l.line, '"' + l.name + '" is declared inside draw(), so it starts over at its first value every frame.', 'If it should remember its value between frames (to move or count), declare it at the top, outside any function.');
      }
    });

    // Animation without background in draw
    if (drawFn && f.animatedGlobals.length) {
      var bgInDraw = (f.callsByName.background || []).some(function (c) { return c.fn === 'draw'; });
      if (!bgInDraw) {
        add('tip', drawFn.line, 'draw() changes things but never calls background(), so moving shapes leave trails.', 'If trails are not what you want, call background() at the start of draw().');
      }
    }

    // fill/stroke as the last thing in a function (affects nothing after it)
    f.functions.forEach(function (fn) {
      var body = fn.node.body.body;
      if (!body.length) { return; }
      var last = body[body.length - 1];
      if (last.type === 'ExpressionStatement' && last.expression.type === 'CallExpression') {
        var n = memberName(last.expression.callee);
        if (['fill', 'stroke', 'strokeWeight'].indexOf(n) >= 0 && fn.name !== 'draw') {
          add('tip', last.loc.start.line, n + '() is the last line of ' + fn.name + '(), so it only affects shapes drawn later.', 'Style settings apply to shapes drawn after them. Put ' + n + '() before the shape you want to change.');
        } else if (['fill', 'stroke'].indexOf(n) >= 0 && fn.name === 'draw' && f.shapeCalls.some(function (c) { return c.fn === 'draw'; })) {
          add('tip', last.loc.start.line, n + '() is the last line of draw(). It will only affect shapes on the next frame.', 'Put style changes right before the shape they belong to so the order is easy to explain.');
        }
      }
    });

    // Repeated magic numbers
    var nums = {};
    walk(f.functions.length ? { type: 'Program', body: f.functions.map(function (x) { return x.node; }) } : { type: 'Program', body: [] }, function (n, parent) {
      if (n.type === 'Literal' && typeof n.value === 'number' && [0, 1, 2, 255, -1].indexOf(n.value) < 0) {
        if (parent && parent.type === 'CallExpression' && memberName(parent.callee) === 'createCanvas') { return; }
        (nums[n.value] = nums[n.value] || []).push(n.loc.start.line);
      }
    });
    var repeated = Object.keys(nums).filter(function (k) { return nums[k].length >= 3; });
    if (repeated.length) {
      var k = repeated.sort(function (a, b) { return nums[b].length - nums[a].length; })[0];
      add('tip', nums[k][0], 'The number ' + k + ' appears ' + nums[k].length + ' times.', 'Give it a name (let size = ' + k + ';) so you can change it in one place and explain what it means.');
    }

    // Hard-coded center when width/height would be clearer
    if (f.canvas) {
      var halfW = f.canvas.w / 2, halfH = f.canvas.h / 2;
      var hard = f.shapeCalls.filter(function (c) {
        return c.args[0] && c.args[0].type === 'Literal' && c.args[0].value === halfW && !f.uses('width');
      });
      if (hard.length) {
        add('tip', hard[0].line, 'You use ' + halfW + ' for the middle of the canvas.', 'width / 2 says what you mean and keeps working if the canvas size changes.');
      }
      void halfH;
    }

    // var instead of let/const
    if (f.varKinds['var'] > 0) {
      add('tip', null, 'This code uses var.', 'Modern JavaScript uses let (value can change) and const (value stays the same). They have clearer rules about where a variable exists.');
    }

    // Short or unclear names
    var okShort = ['i', 'j', 'k', 'x', 'y', 'w', 'h', 'r', 'g', 'b', 'n', 'dx', 'dy', 'vx', 'vy'];
    var vague = ['thing', 'stuff', 'temp', 'data', 'foo', 'bar', 'abc', 'asdf', 'var1', 'myVar', 'test'];
    f.globals.concat(f.locals).forEach(function (v) {
      if ((v.name.length === 1 && okShort.indexOf(v.name) < 0) || vague.indexOf(v.name) >= 0) {
        add('tip', v.line, 'The name "' + v.name + '" does not say what it holds.', 'Descriptive names (ballSize, score, speedX) make code easier to read aloud and explain.');
      }
    });

    // Unused variables
    f.globals.forEach(function (g) {
      var uses = (f.identifiers[g.name] || []).filter(function (u) { return u.line !== g.line || u.parent.type !== 'VariableDeclarator'; });
      if (uses.length === 0) {
        add('tip', g.line, '"' + g.name + '" is declared but never used.', 'Remove it, or use it. Unused code makes a program harder to explain.');
      }
    });

    // Loop that never moves toward stopping
    f.loops.forEach(function (l) {
      var n = l.node;
      if (n.type === 'WhileStatement' && n.test.type === 'Literal' && n.test.value === true) {
        add('warn', l.line, 'while (true) never stops on its own.', 'p5 already repeats draw() for you. A loop that never ends freezes the sketch.');
      }
      if (n.type === 'ForStatement' && !n.update) {
        add('warn', l.line, 'This for loop has no update step (like i++).', 'Without an update, the loop variable never changes and the loop may never end.');
      }
    });

    // Long functions
    f.functions.forEach(function (fn) {
      var len = fn.endLine - fn.line;
      if (len > 30) {
        add('tip', fn.line, fn.name + '() is ' + len + ' lines long.', 'Split it into smaller functions with clear names (drawPlayer(), updateScore()). Each piece becomes easier to test and explain.');
      }
    });

    // Comments
    if (f.nonBlankLines > 12 && f.comments === 0) {
      add('tip', null, 'There are no comments yet.', 'A short comment above each section ("// move the ball") helps you and others explain the code later.');
    }

    // Indentation consistency
    var lines = code.split('\n'), depth = 0, badIndent = null;
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (!t || t.indexOf('//') === 0) { continue; }
      var startsClose = /^[}\])]/.test(t);
      var expected = Math.max(0, depth - (startsClose ? 1 : 0));
      var actual = lines[i].match(/^\s*/)[0].replace(/\t/g, '  ').length;
      if (expected > 0 && actual === 0 && badIndent === null) { badIndent = i + 1; }
      var stripped = t.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '').replace(/\/\/.*$/, '');
      depth += (stripped.split('{').length - 1) - (stripped.split('}').length - 1);
    }
    if (badIndent) {
      add('tip', badIndent, 'Line ' + badIndent + ' is inside a block but is not indented.', 'Indenting code inside { } shows which lines belong together. Reading the shape of the code is half of understanding it.');
    }

    // Accessibility
    if (f.canvasNode && !f.has('describe')) {
      add('tip', setupFn ? setupFn.line : null, 'Add describe("...") in setup() to explain the canvas to screen reader users.', 'A canvas is just pixels to assistive technology. describe() gives it a text alternative (WCAG 1.1.1).');
    }

    // Strengths
    if (f.comments > 0) { good.push('Uses comments to explain intent.'); }
    if (f.uses('width') || f.uses('height')) { good.push('Uses width/height instead of hard-coded sizes.'); }
    if (f.userFunctions.length) { good.push('Breaks work into named functions.'); }
    if (f.has('describe')) { good.push('Provides a describe() text alternative.'); }
    if (f.globals.some(function (g) { return g.name.length > 3 && /[a-z][A-Z]/.test(g.name); })) { good.push('Uses descriptive camelCase variable names.'); }
    if (f.loops.length) { good.push('Uses a loop instead of copying the same line many times.'); }

    var order = { warn: 0, tip: 1 };
    sug.sort(function (a, b) { return order[a.kind] - order[b.kind] || (a.line || 0) - (b.line || 0); });
    return { suggestions: sug, strengths: good };
  }

  /* ---------- Loop protection ----------
   * Rewrites loops so they throw instead of freezing the page. Inserts code
   * without adding new lines, so line numbers in errors still match. */
  function protectLoops(code) {
    if (!acornLib) { return code; }
    var ast;
    try { ast = acornLib.parse(code, { ecmaVersion: 'latest', locations: true }); } catch (e) { return code; }
    var inserts = [];
    var id = 0;
    walk(ast, function (node) {
      if (['ForStatement', 'WhileStatement', 'DoWhileStatement', 'ForOfStatement', 'ForInStatement'].indexOf(node.type) < 0) { return; }
      var n = id++;
      var line = node.loc.start.line;
      inserts.push({ pos: node.start, text: '{__loopReset(' + n + ');' });
      inserts.push({ pos: node.end, text: '}', after: true });
      var body = node.body;
      if (body.type === 'BlockStatement') {
        inserts.push({ pos: body.start + 1, text: '__loopTick(' + n + ',' + line + ');' });
      } else {
        inserts.push({ pos: body.start, text: '{__loopTick(' + n + ',' + line + ');' });
        inserts.push({ pos: body.end, text: '}', after: true });
      }
    });
    // Apply from the end so earlier positions stay valid. At equal positions,
    // closing braces go before opening text.
    inserts.sort(function (a, b) { return b.pos - a.pos || (a.after ? -1 : 1) - (b.after ? -1 : 1); });
    var out = code;
    inserts.forEach(function (ins) { out = out.slice(0, ins.pos) + ins.text + out.slice(ins.pos); });
    return out;
  }

  /* ---------- Explanation feedback ----------
   * ideas: [{label, keys:[regex source strings], prompt}] */
  function checkExplanation(text, ideas) {
    var t = (text || '').toLowerCase();
    var words = t.split(/\s+/).filter(Boolean).length;
    var covered = [], missing = [];
    ideas.forEach(function (idea) {
      var hit = idea.keys.some(function (k) { return new RegExp(k, 'i').test(t); });
      (hit ? covered : missing).push(idea);
    });
    return { words: words, covered: covered, missing: missing,
      ratio: ideas.length ? covered.length / ideas.length : 1 };
  }

  /* Ideas a student's own code explanation should touch on, based on what the code uses. */
  function ideasFor(facts) {
    var ideas = [];
    if (!facts) { return ideas; }
    if (facts.canvasNode) { ideas.push({ label: 'the canvas and its size', keys: ['canvas', 'createcanvas', 'pixels', 'wide', 'tall', 'size', 'width'], prompt: 'How big is the drawing area, and where is it created?' }); }
    if (facts.shapeCalls.length) { ideas.push({ label: 'what shapes are drawn and where', keys: ['ellipse', 'circle', 'rect', 'square', 'line', 'shape', 'triangle', 'quad', 'text', 'draws?'], prompt: 'Which shapes appear, and how do the arguments place them?' }); }
    if (facts.has('fill') || facts.has('stroke') || facts.has('background')) { ideas.push({ label: 'color choices', keys: ['colou?r', 'fill', 'stroke', 'background', 'rgb', 'red', 'green', 'blue', 'gr[ae]y', 'black', 'white'], prompt: 'Where do the colors come from, and what order are they set in?' }); }
    if (facts.handlers.indexOf('draw') >= 0) { ideas.push({ label: 'what repeats every frame in draw()', keys: ['draw', 'frame', 'repeat', 'over and over', 'loop', '60', 'every', 'each time', 'continu'], prompt: 'What does draw() do, and how often?' }); }
    if (facts.globals.length) { ideas.push({ label: 'what the variables store', keys: ['variable', 'store', 'value', 'let ', 'const'].concat(facts.globals.slice(0, 6).map(function (g) { return g.name.toLowerCase(); })), prompt: 'What does each variable remember?' }); }
    if (facts.changedGlobals.length) { ideas.push({ label: 'how values change over time', keys: ['increase', 'decrease', 'change', 'update', 'add', 'subtract', 'move', 'grow', '\\+', 'count'], prompt: 'Which values change, and by how much?' }); }
    if (facts.ifs.length) { ideas.push({ label: 'the decision (if) and its condition', keys: ['\\bif\\b', 'condition', 'check', 'when', 'true', 'false', 'otherwise', 'else', 'greater', 'less'], prompt: 'What condition is checked, and what happens when it is true or false?' }); }
    if (facts.loops.length) { ideas.push({ label: 'what the loop repeats', keys: ['loop', '\\bfor\\b', 'repeat', 'times', 'each', 'iterat'], prompt: 'What does the loop repeat, and how many times?' }); }
    if (facts.userFunctions.length) { ideas.push({ label: 'your own function(s) and parameters', keys: ['function', 'parameter', 'argument', 'call', 'reus'].concat(facts.userFunctions.map(function (x) { return x.name.toLowerCase(); })), prompt: 'Why did you make a function, and what do its parameters control?' }); }
    if (facts.arrays || facts.objects) { ideas.push({ label: 'how data is stored (arrays/objects)', keys: ['array', 'list', 'object', 'propert', 'index', 'item', 'element'], prompt: 'What data does the array or object hold?' }); }
    if (facts.usesMouse || facts.usesKeys) { ideas.push({ label: 'how the user interacts', keys: ['mouse', 'click', 'key', 'press', 'user', 'hover', 'type'], prompt: 'What can the user do, and how does the code respond?' }); }
    return ideas;
  }

  var api = {
    analyze: analyze,
    protectLoops: protectLoops,
    friendlyRuntime: friendlyRuntime,
    checkExplanation: checkExplanation,
    ideasFor: ideasFor,
    closest: closest,
    P5_FUNCS: P5_FUNCS,
    P5_VARS: P5_VARS,
    P5_HANDLERS: P5_HANDLERS
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.P5TrailAnalyzer = api;
})(typeof window !== 'undefined' ? window : globalThis);
