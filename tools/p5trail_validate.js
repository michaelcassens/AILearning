#!/usr/bin/env node
/* Static checks for p5.js Code Trail content (js/p5trail_levels.js).
 * Usage: node tools/p5trail_validate.js
 * Confirms that every example parses, every build solution passes its static
 * checks, every bug fails before the fix and passes after, and every judge
 * checklist lines up with its spec. Runtime probes are checked in the browser.
 */
'use strict';
var path = require('path');
var A = require(path.join(__dirname, '..', 'js', 'p5trail_analyzer.js'));
var L = require(path.join(__dirname, '..', 'js', 'p5trail_levels.js'));

var problems = 0;
function fail(where, msg) { problems++; console.log('  ✗ ' + where + ': ' + msg); }
function parses(where, code) {
  var r = A.analyze(code);
  if (!r.ok) { fail(where, 'does not parse: ' + r.syntaxError.message + ' (line ' + r.syntaxError.line + ')'); }
  return r;
}
function staticChecks(checks, r, code) {
  return checks.filter(function (c) { return !c.runtime; }).map(function (c) {
    var ok = false;
    try { ok = !!c.test(r.facts, code); } catch (e) { ok = false; }
    return { label: c.label, ok: ok };
  });
}
function mcq(where, q) {
  if (!q || !q.options || typeof q.answer !== 'number' || q.answer >= q.options.length) { fail(where, 'bad multiple-choice question'); }
  if (Array.isArray(q.why) && q.why.length !== q.options.length) { fail(where, 'per-option explanations do not match options'); }
}

L.LEVELS.forEach(function (lv) {
  console.log('Level ' + lv.id + ': ' + lv.title);
  parses('learn.example', lv.learn.example);
  mcq('learn.predict', lv.learn.predict);

  var b = lv.build;
  var sol = parses('build.solution', b.solution);
  if (sol.ok) {
    staticChecks(b.checks, sol, b.solution).forEach(function (c) { if (!c.ok) { fail('build.solution', 'fails check "' + c.label + '"'); } });
  }
  var st = A.analyze(b.starter);
  if (st.ok && staticChecks(b.checks, st, b.starter).every(function (c) { return c.ok; }) && b.checks.every(function (c) { return !c.runtime; })) {
    fail('build.starter', 'already passes every check');
  }
  if (b.hints.length !== 3) { fail('build.hints', 'expected 3 hints'); }
  b.solutionQuiz.forEach(function (q, i) { mcq('build.solutionQuiz[' + i + ']', q); });

  parses('read.code', lv.read.code);
  lv.read.questions.forEach(function (q, i) { mcq('read.questions[' + i + ']', q); });
  var cov = A.checkExplanation(lv.read.model, lv.read.ideas);
  if (cov.missing.length) { fail('read.model', 'model explanation misses idea(s): ' + cov.missing.map(function (m) { return m.label; }).join('; ')); }

  lv.bugs.forEach(function (bug, i) {
    var w = 'bugs[' + i + '] "' + bug.title + '"';
    var r = A.analyze(bug.code);
    if (bug.type === 'syntax' && r.ok) { fail(w, 'marked syntax but parses'); }
    if (bug.type !== 'syntax' && !r.ok) { fail(w, 'marked ' + bug.type + ' but does not parse'); }
    if (bug.type === 'syntax' && !r.ok && bug.lines.indexOf(r.syntaxError.line) < 0) {
      console.log('  · ' + w + ': parser reports line ' + r.syntaxError.line + ', bug lines ' + bug.lines.join(','));
    }
    mcq(w + '.causes', { options: bug.causes, answer: bug.cause });
    var fx = parses(w + '.fixed', bug.fixed);
    if (fx.ok && !bug.fix.test(fx.facts, bug.fixed)) { fail(w, 'fixed code fails fix.test'); }
    if (r.ok && !(bug.fix.probes && bug.fix.probes.length) && bug.fix.test(r.facts, bug.code)) { fail(w, 'buggy code already passes fix.test and has no runtime probe'); }
    bug.lines.forEach(function (n) { if (n < 1 || n > bug.code.split('\n').length) { fail(w, 'line ' + n + ' out of range'); } });
  });

  if (lv.judge) {
    var j = lv.judge;
    parses('judge.aiCode', j.aiCode);
    if (j.checklist.length !== j.spec.length) { fail('judge', 'checklist and spec lengths differ'); }
    mcq('judge.issue', j.issue);
    ['accept', 'revise', 'reject'].forEach(function (k) { if (!j.verdicts[k]) { fail('judge', 'missing verdict text for ' + k); } });
  }
});

console.log('Capstone');
var cap = A.analyze(L.CAPSTONE.starter);
if (!cap.ok) { fail('capstone.starter', 'does not parse'); }

console.log(problems ? '\n' + problems + ' problem(s) found.' : '\nAll content checks passed.');
process.exit(problems ? 1 : 0);
