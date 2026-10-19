/* =====================================================================
   JS Reasoning Quest: curriculum
   ---------------------------------------------------------------------
   Everything students see lives here. To add or edit a challenge, copy an
   existing one and change it. Give every challenge a unique `id` (progress
   is saved by id, so don't rename ids after students have started).

   Challenge types
   - type: 'quiz'  (variant: learn | plan | predict | bug | ai | judge)
       intro, code (runnable by default), runAfter (lock Run until answered),
       ai (the prompt someone gave an AI), symptom (bug report), difficulty 1-5,
       codes [{label, code}] (several listings), fixed (shown after a bug hunt),
       questions [...], explain {...}, takeaway
   - type: 'build'
       intro, plan [...questions], starter, tests [...], hints [...],
       solution (the "AI assistant" answer), solutionQuestions [...],
       expectReturn (function name that must return), explain {...}, takeaway
   - Any quiz or build can add
       ways: [{ topic, forms: [{ code, note }], tip }]
     an "Other ways to write it" panel. Quizzes show it under the code;
     builds show it once all checks pass.
   - type: 'open'  (capstone: student defines the problem and builds freely)

   Question kinds
   - { kind: 'mcq',  q, options: [{ t, ok, why }] }   (options are shuffled unless noShuffle)
   - { kind: 'line', q, answer: 3 | [5, 6], why, hint }  (student selects a line of the code)
   - { kind: 'text', q, answer: 'value' | ['alt1', 'alt2'], why }  (spaces/quotes/case ignored)

   Tests (build)
   - { expr: 'ticketPrice(5)', expect: 8, approx?: true, label? }
   - { log: 'text that must be printed', label? }
   - { expr: 'someCheck()', label }   (passes if truthy)

   Explain
   - { prompt, minWords, keywords: [{ label, any: ['word', ...] }], model }
   ===================================================================== */
(function () {
  'use strict';

  // Standard "what kind of error is this?" question
  function classify(kind, why) {
    const WRONG = {
      syntax: 'A syntax error stops everything before the first line runs: JavaScript can\'t even read the program. Did this program get far enough to print or crash on a specific line?',
      runtime: 'A runtime error happens while the program is running: it crashes with an error message, or never finishes. Is that what happened here?',
      logic: 'A logic error means the program finishes normally but gives the wrong result. Did this program finish normally?'
    };
    return {
      kind: 'mcq', noShuffle: true, q: 'What kind of error is this?',
      options: [
        { t: '<strong>Syntax error</strong>: the code can\'t be read, so nothing runs', ok: kind === 'syntax', why: kind === 'syntax' ? why : WRONG.syntax },
        { t: '<strong>Runtime error</strong>: the code starts, then crashes (or never finishes)', ok: kind === 'runtime', why: kind === 'runtime' ? why : WRONG.runtime },
        { t: '<strong>Logic error</strong>: the code runs without crashing but gives the wrong result', ok: kind === 'logic', why: kind === 'logic' ? why : WRONG.logic }
      ]
    };
  }

  const LEVELS = [
  /* ================================================================ */
  {
    id: 'L0', title: 'Start Here: Think Before You Type',
    blurb: 'How this quest works, how to use AI responsibly, and why understanding the problem comes first.',
    concepts: ['problem solving', 'responsible AI use', 'requirements'],
    challenges: [
      {
        id: 'L0-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'How This Quest Works',
        intro: '<p>This isn\'t a speed game. There are no timers. You make progress by getting better at four things: <strong>understanding</strong> problems, <strong>building</strong> code, <strong>debugging</strong> it, and <strong>explaining</strong> it.</p>' +
          '<p>AI assistants can write code in seconds. That makes a different skill more valuable: being the person who can tell whether code is <em>right</em>, and say why.</p>' +
          '<h2>The Try-First Ladder</h2><ol><li>Understand the problem: inputs, outputs, rules, edge cases.</li><li>Try it yourself. A wrong attempt is useful data.</li><li>Take a hint.</li><li>Ask an AI assistant a specific question.</li><li>Explain it back: always, no matter who wrote the code.</li></ol>',
        questions: [
          { kind: 'mcq', q: 'You\'re stuck on a challenge. According to the Try-First Ladder, what\'s the best next step?',
            options: [
              { t: 'Write down the inputs and the output you expect, then make an attempt', ok: true, why: 'Getting clear on the problem is often what unsticks you, and an attempt shows exactly where your understanding breaks.' },
              { t: 'Paste the whole problem into an AI and submit what it gives you', ok: false, why: 'That skips the struggle where the learning actually happens, and you\'d have no way to judge whether the answer is right.' },
              { t: 'Skip it and hope it doesn\'t come up again', ok: false, why: 'Skipping leaves a gap that later levels build on.' },
              { t: 'Copy a classmate\'s answer', ok: false, why: 'Same problem as copying an AI: you get the code without the understanding.' }
            ] },
          { kind: 'mcq', q: 'An AI gives you code that runs without errors. When are you actually done?',
            options: [
              { t: 'When you can explain what each part does and why it solves the problem', ok: true, why: 'Running is not the same as correct. You\'re done when you could defend the code to a reviewer.' },
              { t: 'As soon as it runs without errors', ok: false, why: 'Lots of wrong code runs perfectly. You\'ll see plenty of it in this quest.' },
              { t: 'When it\'s longer than your own attempt', ok: false, why: 'Length says nothing about correctness.' },
              { t: 'When it has comments', ok: false, why: 'Comments can be wrong too. Understanding is what counts.' }
            ] },
          { kind: 'mcq', q: 'Which of these is a responsible way to use an AI assistant on a class exercise?',
            options: [
              { t: 'Asking it to explain an error message you don\'t understand', ok: true, why: 'This uses AI as a tutor: you stay in charge of the solution, and you learn to read errors yourself.' },
              { t: 'Having it write the solution, then deleting its comments so it looks like yours', ok: false, why: 'That\'s misrepresenting the work, and you still can\'t explain it.' },
              { t: 'Never using AI under any circumstances', ok: false, why: 'Avoiding AI isn\'t the goal. Using it in ways that build your skill (and being honest about it) is.' },
              { t: 'Asking it to finish the whole level for you', ok: false, why: 'Then the AI learned the material, not you.' }
            ] }
        ],
        takeaway: 'Running code isn\'t the finish line. Understanding it is.'
      },
      {
        id: 'L0-2', type: 'quiz', variant: 'plan', skill: 'understand',
        title: 'Coffee Shop: Understand Before You Build',
        intro: '<p>A campus coffee shop asks you for a program that tells customers their total.</p><ul><li>Every drink costs <strong>$4</strong>.</li><li>Customers with a loyalty card get <strong>10% off</strong>.</li></ul><p>No code yet. First, make sure you understand the problem.</p>',
        questions: [
          { kind: 'mcq', q: 'What are the <strong>inputs</strong>: the things that change from customer to customer?',
            options: [
              { t: 'How many drinks they buy, and whether they have a loyalty card', ok: true, why: 'These change for every customer, so the program has to be given them.' },
              { t: 'The $4 price', ok: false, why: 'The price is a fixed rule (a constant), not something each customer provides.' },
              { t: 'The total', ok: false, why: 'The total is what we\'re calculating: the output.' },
              { t: 'The customer\'s name', ok: false, why: 'None of the rules use the name, so the program doesn\'t need it.' }
            ] },
          { kind: 'text', q: 'Work an example by hand: <strong>3 drinks, with a loyalty card</strong>. What\'s the total in dollars?', answer: ['10.80', '10.8'],
            why: '3 × $4 = $12, and 10% of $12 is $1.20, so $12 − $1.20 = $10.80. You now have a known-correct answer to test any code against.',
            miss: 'Start with 3 × $4. Then take 10% off that amount.' },
          { kind: 'mcq', q: 'Which question should you ask the shop owner <em>before</em> anyone writes code?',
            options: [
              { t: 'Does the 10% apply to the whole order, or only to some drinks?', ok: true, why: 'Requirements are often ambiguous. Clearing it up now is far cheaper than rewriting code later.' },
              { t: 'Should the code use <code>let</code> or <code>const</code>?', ok: false, why: 'That\'s a programming decision: yours to make, not the owner\'s.' },
              { t: 'How fast will the program run?', ok: false, why: 'For a program this size, speed isn\'t a real concern.' },
              { t: 'What color should the screen be?', ok: false, why: 'It might matter eventually, but it doesn\'t affect the calculation.' }
            ] },
          { kind: 'mcq', q: 'You want help from an AI assistant. Which prompt is most likely to get correct code?',
            options: [
              { t: '“Write a JavaScript function that takes a number of drinks and a true/false loyalty flag. Drinks are $4 each; loyalty members get 10% off the whole order. Return the total. Example: 3 drinks with a card → 10.80.”', ok: true, why: 'It names the inputs, the output, the rules, and gives a worked example to check against.' },
              { t: '“Write coffee shop code.”', ok: false, why: 'The AI has to guess the rules, and it will guess confidently.' },
              { t: '“Make a really good total calculator, as advanced as possible.”', ok: false, why: '“Advanced” isn\'t a requirement. You\'ll get something long that you have to untangle.' },
              { t: '“Fix my code.” (with no code attached)', ok: false, why: 'There\'s nothing for it to work with. Be specific.' }
            ] }
        ],
        explain: {
          prompt: 'Why is it worth working one example by hand (3 drinks with a card = $10.80) <em>before</em> you write or generate any code?',
          minWords: 15,
          keywords: [
            { label: 'It gives you something to test or check the code against', any: ['test', 'check', 'verify', 'compare', 'confirm'] },
            { label: 'It makes you understand the rules', any: ['understand', 'rule', 'requirement', 'discount', 'problem'] },
            { label: 'It helps you catch mistakes', any: ['mistake', 'wrong', 'error', 'bug', 'catch', 'incorrect'] }
          ],
          model: 'Working it by hand gives me a known-correct answer. When I (or an AI) write the code, I can run it with 3 drinks and a card and check that it says 10.80. It also forces me to actually understand the discount rule, so I\'d notice if the code applied it wrong.'
        },
        takeaway: 'A worked example is a test you can run before any code exists.'
      },
      {
        id: 'L0-3', type: 'quiz', variant: 'judge', skill: 'explain',
        title: 'Judge the AI: Bonus Lives',
        intro: '<p>Here\'s your first piece of AI-written code. You don\'t need to know JavaScript yet. Read it like a recipe. <code>/</code> means divide.</p>',
        ai: 'Write a function that gives the player one bonus life for every 1000 points.',
        code: 'function bonusLives(score) {\n  return score / 1000;\n}\n\nconsole.log(bonusLives(2500));',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'Predict: what does <code>bonusLives(2500)</code> give back?', answer: ['2.5'], why: '2500 ÷ 1000 = 2.5.', miss: 'It returns score divided by 1000. What\'s 2500 ÷ 1000?' },
          { kind: 'mcq', q: 'Does that match the game rule, “one bonus life for every 1000 points”?',
            options: [
              { t: 'No, a player can\'t earn half a life. Only complete 1000s should count.', ok: true, why: '2500 points means two full thousands, so 2 lives.' },
              { t: 'Yes, it runs without any errors', ok: false, why: 'Running without errors and being correct are different things. This is the most important idea in the whole quest.' },
              { t: 'Yes, JavaScript rounds 2.5 up to 3 automatically', ok: false, why: 'JavaScript doesn\'t round for you. You get exactly 2.5.' },
              { t: 'No, it should multiply by 1000', ok: false, why: '2500 × 1000 would be 2.5 million lives. Division is right; it just needs to drop the fraction.' }
            ] },
          { kind: 'line', q: 'Which line needs to change?', answer: 2, why: 'Line 2 does the calculation. That\'s where the fraction comes from.' },
          { kind: 'mcq', q: 'Which change matches the rule?',
            options: [
              { t: '<code>return Math.floor(score / 1000);</code>: round <em>down</em> to a whole number', ok: true, why: 'Math.floor(2.5) is 2, Math.floor(999 / 1000) is 0. Only complete thousands count.' },
              { t: '<code>return Math.round(score / 1000);</code>', ok: false, why: 'Rounding would give 3 lives for 2500 points, and 1 life for just 500 points. Too generous.' },
              { t: '<code>return score % 1000;</code>', ok: false, why: '<code>%</code> gives the remainder (500 here): the points left over, not the lives.' },
              { t: 'Leave it, players will like the extra fraction', ok: false, why: 'The code has to follow the rule the game designer set.' }
            ] }
        ],
        explain: {
          prompt: 'This code ran with no errors, but it was still wrong. How did you figure out it was wrong, and what does that tell you about trusting AI-generated code?',
          minWords: 15,
          keywords: [
            { label: 'Compared it to the rule or requirement', any: ['rule', 'requirement', 'every 1000', 'supposed to', 'should'] },
            { label: 'Used a specific example', any: ['2500', '2.5', 'example', 'tested', 'test', 'predict'] },
            { label: 'Running isn\'t the same as correct', any: ['run', 'error', 'works', 'correct', 'trust', 'check'] }
          ],
          model: 'I predicted the output for 2500 and got 2.5, then compared that to the rule: you can only earn whole lives, so it should be 2. The code runs fine, so the only way to catch the mistake is to check it against what the problem actually asks for. I can\'t trust AI code just because it runs. I have to test it with an example.'
        },
        takeaway: 'Code that runs can still be wrong. The requirement is the judge.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L1', title: 'Values & Variables',
    blurb: 'Store information with let and const, print it with console.log, and read your first error messages.',
    concepts: ['console.log', 'let', 'const', 'strings', 'numbers', 'booleans'],
    challenges: [
      {
        id: 'L1-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'Labeled Boxes',
        intro: '<p>A <strong>variable</strong> is a name for a value. You create one by <em>declaring</em> it: a keyword, a name, and a starting value, like <code>let score = 0;</code></p><ul>' +
          '<li><code>let</code> declares a variable whose value you can change later (“reassign”). Once it exists, you change it <em>without</em> the keyword: <code>score = 10;</code>. Use <code>let</code> for things that change, like a score, a counter, or a running total.</li>' +
          '<li><code>const</code> declares a variable that always holds the same value. Trying to reassign it is an error. Use it by default, and switch to <code>let</code> only when the value has to change.</li>' +
          '<li>You\'ll also see <code>var</code> in older code and in some AI answers. It was the only keyword before 2015. The next challenge shows why <code>let</code> replaced it.</li>' +
          '<li><strong>Strings</strong> are text in quotes: <code>"Ada"</code>. <strong>Numbers</strong> have no quotes: <code>42</code>. <strong>Booleans</strong> are <code>true</code> or <code>false</code>.</li>' +
          '<li><code>console.log(...)</code> prints a value so you can see it.</li></ul><p>Run the example, then answer the questions.</p>',
        code: 'const playerName = "Ada";\nlet score = 0;\nscore = score + 10;\nconsole.log(playerName);\nconsole.log(score);',
        questions: [
          { kind: 'mcq', q: 'On line 2, what does <code>let score = 0;</code> tell JavaScript?',
            options: [
              { t: 'Create a new variable named <code>score</code>, start it at 0, and allow it to change later', ok: true, why: 'That\'s a declaration: the keyword, the name, and the starting value.' },
              { t: 'Check whether <code>score</code> equals 0', ok: false, why: 'A single <code>=</code> stores a value. Comparing uses <code>===</code>.' },
              { t: 'Lock <code>score</code> at 0 forever', ok: false, why: 'That\'s what <code>const</code> is for. <code>let</code> means it can change.' },
              { t: 'Print 0', ok: false, why: 'Only <code>console.log</code> prints.' }
            ] },
          { kind: 'line', q: 'Which line <strong>changes</strong> the value of a variable that already exists?', answer: 3, why: '<code>score = score + 10;</code> takes the old value (0), adds 10, and stores the result back in <code>score</code>. There\'s no <code>let</code> because the variable already exists.' },
          { kind: 'mcq', q: 'Why is <code>playerName</code> a <code>const</code> but <code>score</code> a <code>let</code>?',
            options: [
              { t: 'The score changes during the game; the name doesn\'t', ok: true, why: 'Choosing <code>const</code> tells readers “this won\'t change.” <code>let</code> warns them “watch this one.”' },
              { t: '<code>const</code> is for text and <code>let</code> is for numbers', ok: false, why: 'Either keyword can hold any kind of value. The question is whether it will change.' },
              { t: '<code>let</code> runs faster', ok: false, why: 'There\'s no meaningful speed difference. It\'s about meaning.' },
              { t: 'No reason: they\'re interchangeable', ok: false, why: 'Try changing a <code>const</code> and the program crashes. You\'ll see that soon.' }
            ] },
          { kind: 'text', q: 'What is printed <strong>second</strong>?', answer: ['10'], why: 'Line 5 prints <code>score</code>, which is 10 after line 3.' }
        ],
        ways: [
          { topic: 'Changing a number that\'s stored in a variable', forms: [
            { code: 'score = score + 10;', note: 'Spelled out: take the old value, add 10, store the result back in <code>score</code>.' },
            { code: 'score += 10;', note: 'Shorthand for the same thing, read as “add 10 to score.” There are partners for the other operators: <code>-=</code>, <code>*=</code>, <code>/=</code>.' }
          ], tip: 'Both leave <code>score</code> at 10. You\'ll see both in real code, so learn to read both.' }
        ],
        takeaway: 'Use const unless the value really needs to change.'
      },
      {
        id: 'L1-1b', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'let vs var: Why the Old Way Changed',
        intro: '<p>Before 2015, JavaScript only had <code>var</code>. It still works, but it has two habits that cause bugs:</p><ol>' +
          '<li><strong>It ignores blocks.</strong> A <code>var</code> created inside <code>{ }</code> (like an <code>if</code> or a loop) leaks out and stays visible after the block ends. A <code>let</code> exists only inside the block where it was declared. Where a variable can be seen is called its <strong>scope</strong>.</li>' +
          '<li><strong>It lets you declare the same name twice.</strong> <code>var score = 1; var score = 2;</code> runs silently, so a typo or a pasted snippet can overwrite a variable with no warning. With <code>let</code>, declaring the same name twice is a syntax error, so you find out right away.</li></ol>' +
          '<p>Style guides (and this game\'s code coach) recommend <code>const</code> and <code>let</code> over <code>var</code>. If an AI gives you code full of <code>var</code>, it will still run, but it\'s a hint that the code may follow older habits.</p>' +
          '<p>Predict, then run. <code>typeof</code> tells you what kind of value something is, and it gives <code>"undefined"</code> for a name that doesn\'t exist in that spot.</p>',
        code: 'let lives = 3;\nif (lives > 0) {\n  var leaked = "I escaped the block";\n  let contained = "I stay inside";\n}\nconsole.log(leaked);\nconsole.log(typeof contained);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What does line 6 print?', answer: ['I escaped the block'], why: '<code>var</code> ignores the block, so <code>leaked</code> is still visible after the closing <code>}</code>.' },
          { kind: 'text', q: 'What does line 7 print?', answer: ['undefined'], why: '<code>contained</code> only exists inside the <code>{ }</code>. Out here there\'s no such name, so <code>typeof</code> gives "undefined". Writing <code>console.log(contained)</code> instead would crash with a ReferenceError.' },
          { kind: 'mcq', q: 'Why do style guides prefer <code>let</code> over <code>var</code>?',
            options: [
              { t: '<code>let</code> stays inside its block and refuses duplicate declarations, so mistakes show up instead of hiding', ok: true, why: 'Both habits of <code>var</code> let bugs slip by silently. <code>let</code> turns them into visible errors.' },
              { t: '<code>var</code> is no longer allowed', ok: false, why: 'It still runs. Browsers keep it so older websites keep working.' },
              { t: '<code>let</code> runs faster', ok: false, why: 'Speed isn\'t the reason. Predictability is.' },
              { t: '<code>var</code> can\'t hold text', ok: false, why: 'Any keyword can hold any kind of value.' }
            ] },
          { kind: 'mcq', q: 'An AI gives you working code that uses <code>var</code> everywhere. What\'s a reasonable response?',
            options: [
              { t: 'Check for variables that leak out of blocks or get declared twice, then switch to <code>let</code>/<code>const</code> where it\'s safe', ok: true, why: 'The code may be fine. Reviewing it with the two <code>var</code> habits in mind tells you whether it is.' },
              { t: 'Reject it: code with <code>var</code> never works', ok: false, why: 'It usually works. The risk is the hidden bugs.' },
              { t: 'Leave it: the keyword doesn\'t matter', ok: false, why: 'This challenge just showed that it changes what the code can see.' }
            ] }
        ],
        explain: {
          prompt: 'In your own words: what is <code>let</code>, and why is it usually a better choice than <code>var</code>?',
          minWords: 15,
          keywords: [
            { label: 'let declares a variable that can change', any: ['change', 'reassign', 'update'] },
            { label: 'let stays inside its block (scope)', any: ['block', 'scope', 'inside', 'leak', '{'] },
            { label: 'var allows duplicate declarations', any: ['twice', 'duplicate', 'same name', 'redeclare', 'again'] }
          ],
          model: '<code>let</code> creates a variable whose value can change later. It\'s safer than <code>var</code> because it only exists inside the block where it was declared, so it can\'t leak out and get mixed up with other code, and declaring the same name twice is an error instead of silently overwriting the first one.'
        },
        takeaway: 'Use const by default, let when the value must change, and avoid var.'
      },
      {
        id: 'L1-2', type: 'quiz', variant: 'predict', skill: 'explain',
        title: 'Predict the Output: Coin Purse',
        intro: '<p>Predicting output <em>before</em> running is how you check your mental model. Trace the code line by line and keep track of what <code>coins</code> holds. <code>console.log</code> with two values prints them separated by a space.</p>',
        code: 'let coins = 5;\ncoins = coins + 3;\nconst label = "Coins:";\nconsole.log(label, coins);\ncoins = 1;\nconsole.log(coins);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What does line 4 print?', answer: ['Coins: 8'], why: 'coins starts at 5, then 5 + 3 = 8. The label and the number are printed with a space between.' },
          { kind: 'text', q: 'What does line 6 print?', answer: ['1'], why: 'Line 5 replaced the 8 with 1. A variable only remembers its latest value.' },
          { kind: 'mcq', q: 'Line 5 sets <code>coins</code> to 1. Why is that allowed?',
            options: [
              { t: '<code>coins</code> was declared with <code>let</code>', ok: true, why: '<code>let</code> variables can be reassigned as often as you like.' },
              { t: 'Numbers can always be changed', ok: false, why: 'It\'s the keyword, not the type of value. A <code>const</code> number can\'t be reassigned.' },
              { t: 'Because it\'s smaller than before', ok: false, why: 'The size of the value doesn\'t matter.' }
            ] }
        ],
        takeaway: 'Trace one line at a time and write down each variable\'s current value.'
      },
      {
        id: 'L1-3', type: 'build', skill: 'build',
        title: 'Build: Your First Variables',
        intro: '<p>The campus store, <strong>Griz Goods</strong>, wants to count visitors.</p><ol><li>Create a <code>const</code> named <code>shopName</code> holding the text <code>"Griz Goods"</code>.</li><li>Create a <code>let</code> named <code>visitors</code> that starts at <code>0</code>.</li><li>A customer walks in: add 1 to <code>visitors</code>.</li><li>Print <code>visitors</code> with <code>console.log</code>.</li></ol>',
        starter: '// 1. Create a const named shopName with the text "Griz Goods"\n\n// 2. Create a let named visitors that starts at 0\n\n// 3. A customer walks in: add 1 to visitors\n\n// 4. Print visitors\n\n',
        tests: [
          { expr: 'shopName', expect: 'Griz Goods', label: 'shopName holds "Griz Goods"' },
          { expr: 'visitors', expect: 1, label: 'visitors ends up as 1' },
          { log: '1', label: 'prints 1' }
        ],
        hints: [
          'Restate it: you need two variables. One never changes (which keyword?) and one does (which keyword?).',
          'Text needs quotes: <code>"Griz Goods"</code>. Numbers don\'t: <code>0</code>.',
          'To add 1, store the variable\'s value plus one back into itself: <code>visitors = visitors + 1;</code>'
        ],
        solution: 'const shopName = "Griz Goods";\nlet visitors = 0;\nvisitors = visitors + 1;\nconsole.log(visitors);',
        solutionQuestions: [
          { kind: 'mcq', q: 'In the AI\'s solution, what would happen if <code>visitors</code> were declared with <code>const</code>?',
            options: [
              { t: 'The program would crash on line 3 when it tries to change visitors', ok: true, why: 'Reassigning a <code>const</code> is a runtime error: “Assignment to constant variable.”' },
              { t: 'Nothing, it would work the same', ok: false, why: '<code>const</code> can\'t be reassigned, and line 3 reassigns it.' },
              { t: 'It would print 0', ok: false, why: 'It never gets that far: line 3 crashes first.' }
            ] }
        ],
        explain: {
          prompt: 'Explain your code: why did you use <code>const</code> for one variable and <code>let</code> for the other?',
          minWords: 12,
          keywords: [
            { label: 'const: the shop name doesn\'t change', any: ['const'] },
            { label: 'let: the visitor count changes', any: ['let'] },
            { label: 'Adding 1 / reassigning', any: ['change', 'reassign', 'update', 'add', 'increase', '+ 1', '+1'] }
          ],
          model: 'The shop\'s name never changes, so it\'s a const. The number of visitors goes up when someone walks in, so it has to be a let. Line 3 takes the current value, adds 1, and stores it back in visitors, then console.log prints 1.'
        },
        ways: [
          { topic: 'Adding 1 to <code>visitors</code>', forms: [
            { code: 'visitors = visitors + 1;', note: 'Spelled out: take the old value, add 1, store it back. Clearest when you\'re starting out.' },
            { code: 'visitors += 1;', note: '“Add and assign.” Works with any amount (<code>visitors += 5;</code>), and has partners: <code>-=</code>, <code>*=</code>, <code>/=</code>.' },
            { code: 'visitors++;', note: '“Increment.” Adds exactly 1. You\'ll see it in almost every loop as <code>i++</code>. Its partner <code>visitors--</code> subtracts 1.' }
          ], tip: 'All three leave <code>visitors</code> at 1. Pick the one your team reads most easily, and be ready to recognize all three in AI-written code.' },
          { topic: 'Printing the result', forms: [
            { code: 'console.log(visitors);', note: 'Prints just the value: <code>1</code>.' },
            { code: 'console.log("Visitors:", visitors);', note: 'A label plus the value, separated by a space: <code>Visitors: 1</code>. Handy when you print several things.' },
            { code: 'console.log(`${shopName} has ${visitors} visitor`);', note: 'A template literal (Level 2) builds a full sentence: <code>Griz Goods has 1 visitor</code>.' }
          ] }
        ],
        takeaway: 'Choosing const or let is a statement about what will change.'
      },
      {
        id: 'L1-4', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 1,
        title: 'Bug Hunt: The Missing Piece',
        intro: '<p>In every bug hunt you\'ll find the line, name the kind of error, and choose a fix. Run the code to see what happens.</p>',
        symptom: 'The program won\'t run at all. Nothing is printed, just an error.',
        code: 'const greeting = "Hello, world;\nconsole.log(greeting);',
        questions: [
          { kind: 'line', q: 'Which line has the mistake?', answer: 1, why: 'The string opens with <code>"</code> but never closes, so JavaScript reads the rest of the line as text and never finds the end.' },
          classify('syntax', 'Nothing ran at all, not even line 2. JavaScript couldn\'t read the program, which is what a syntax error is.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: '<code>const greeting = "Hello, world";</code>', ok: true, why: 'Now the string has a closing quote before the semicolon.' },
              { t: '<code>Const greeting = "Hello, world;</code>', ok: false, why: 'JavaScript is case-sensitive, and the quote is still missing.' },
              { t: 'Change line 2 to <code>console.log("greeting");</code>', ok: false, why: 'That would print the word “greeting”, and line 1 is still broken.' }
            ] }
        ],
        fixed: 'const greeting = "Hello, world";\nconsole.log(greeting);',
        explain: {
          prompt: 'Explain the bug to a teammate in a sentence or two.',
          minWords: 8,
          keywords: [{ label: 'The string / quote', any: ['quote', 'string', '"'] }, { label: 'It was never closed', any: ['close', 'end', 'missing', 'forgot', 'never'] }],
          model: 'The string on line 1 starts with a quote but never ends with one, so JavaScript can\'t tell where the text stops. Adding the closing quote fixes it.'
        },
        takeaway: 'Syntax errors stop everything. Look at the reported line and the one before it.'
      },
      {
        id: 'L1-5', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 1,
        title: 'Bug Hunt: The Unchangeable Total',
        symptom: 'The program crashes with <code>TypeError: Assignment to constant variable.</code>',
        code: 'const total = 20;\ntotal = total + 5;\nconsole.log(total);',
        questions: [
          { kind: 'line', q: 'Which line <strong>throws</strong> the error?', answer: 2, why: 'Line 2 tries to put a new value into <code>total</code>.' },
          classify('runtime', 'Line 1 ran fine; the program crashed while running line 2. That\'s a runtime error.'),
          { kind: 'mcq', q: 'Which fix is best?',
            options: [
              { t: 'Change <code>const</code> to <code>let</code> on line 1', ok: true, why: 'The error appears on line 2, but its cause is the choice made on line 1. Errors often show up downstream of their real cause.' },
              { t: 'Delete line 2', ok: false, why: 'That stops the crash, but now the total is never increased. You\'ve fixed the error and broken the program.' },
              { t: 'Change line 2 to <code>total = 25;</code>', ok: false, why: 'That still reassigns a <code>const</code>, so it still crashes.' },
              { t: 'Change line 2 to <code>Total = total + 5;</code>', ok: false, why: '<code>Total</code> (capital T) is a different name that was never declared, so this crashes too.' }
            ] }
        ],
        fixed: 'let total = 20;\ntotal = total + 5;\nconsole.log(total);',
        explain: {
          prompt: 'Explain the bug: where did the error appear, and where was its real cause?',
          minWords: 10,
          keywords: [{ label: 'const can\'t be changed', any: ['const'] }, { label: 'Use let instead', any: ['let'] }, { label: 'Error on line 2, cause on line 1', any: ['line 1', 'line 2', 'cause', 'declared'] }],
          model: 'Line 2 crashes because it tries to change total, but total was declared with const on line 1, so it can\'t be reassigned. The real fix is on line 1: declare it with let.'
        },
        takeaway: 'The line that crashes isn\'t always the line that\'s wrong.'
      },
      {
        id: 'L1-6', type: 'quiz', variant: 'ai', skill: 'explain',
        title: 'Read the AI\'s Code: Character Sheet',
        ai: 'Make some variables for a game character and print a status message.',
        code: 'const heroName = "Kestrel";\nlet health = 100;\nconst maxHealth = 100;\nlet isAlive = true;\nhealth = health - 35;\nconsole.log(heroName + " has " + health + " of " + maxHealth + " HP");',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'Predict exactly what line 6 prints.', answer: ['Kestrel has 65 of 100 HP'], why: '<code>+</code> joins the text pieces and numbers into one string. Health is 100 − 35 = 65.', miss: 'Work out <code>health</code> first (line 5), then join the pieces in order, keeping the spaces inside the quotes.' },
          { kind: 'mcq', q: 'What kind of value is <code>isAlive</code>?',
            options: [
              { t: 'A boolean (true or false)', ok: true, why: 'Booleans are for yes/no facts like “is the hero alive?”' },
              { t: 'A string', ok: false, why: 'There are no quotes around <code>true</code>, so it isn\'t text.' },
              { t: 'A number', ok: false, why: '<code>true</code> isn\'t a number.' }
            ] },
          { kind: 'mcq', q: 'Why did the AI make <code>maxHealth</code> a <code>const</code> but <code>health</code> a <code>let</code>?',
            options: [
              { t: 'The maximum is a fixed rule; current health goes up and down', ok: true, why: 'Good AI code (and good human code) uses the keyword to signal intent.' },
              { t: 'It was random', ok: false, why: 'There\'s a clear reason: look at which one changes.' },
              { t: 'Because maxHealth is bigger', ok: false, why: 'The size of the number doesn\'t matter.' }
            ] },
          { kind: 'mcq', q: '<code>isAlive</code> is created but never used. What should a responsible reviewer do?',
            options: [
              { t: 'Ask why it\'s there. Maybe a requirement (like checking for defeat) is missing, or it\'s leftover and should go', ok: true, why: 'Unused code is a clue. Either something was forgotten, or it\'s clutter.' },
              { t: 'Leave it, AI always has a reason', ok: false, why: 'AI tools often add plausible-looking extras. You\'re the reviewer.' },
              { t: 'Delete every line you don\'t understand', ok: false, why: 'Deleting without understanding can break things. Ask first.' }
            ] }
        ],
        explain: {
          prompt: 'Explain what this program does, as if a classmate asked you.',
          minWords: 15,
          keywords: [
            { label: 'Variables for name, health, max health, alive', any: ['variable', 'const', 'let', 'store'] },
            { label: 'Health drops by 35', any: ['35', 'subtract', 'damage', 'lose', 'minus', 'decrease'] },
            { label: 'Prints a status message', any: ['print', 'log', 'message', 'output'] }
          ],
          model: 'It stores a hero\'s name, current health, max health and whether they\'re alive. Then the hero takes 35 damage, so health goes from 100 to 65. Finally it joins everything into one message and prints “Kestrel has 65 of 100 HP”. isAlive is never used.'
        },
        takeaway: 'Reading code means noticing what\'s there, and what\'s there for no reason.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L2', title: 'Expressions & Types',
    blurb: 'Math, joining text, template literals, and the surprises when strings and numbers mix.',
    concepts: ['operators', '%', 'template literals', 'typeof', 'type conversion'],
    challenges: [
      {
        id: 'L2-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'Operators and Types',
        intro: '<ul><li>Math: <code>+</code> <code>-</code> <code>*</code> <code>/</code>, and <code>%</code> gives the <strong>remainder</strong> of a division.</li>' +
          '<li>If either side of <code>+</code> is a string, JavaScript <strong>joins</strong> them as text instead of adding.</li>' +
          '<li>A <strong>template literal</strong> uses backticks and <code>${ }</code> to drop values into text: <code>`Hi ${name}`</code>.</li>' +
          '<li><code>typeof</code> tells you what kind of value something is.</li></ul>',
        code: 'const price = 12;\nconst qty = 3;\nconsole.log(price * qty);\nconsole.log("5" + 3);\nconsole.log(`Total: ${price * qty}`);\nconsole.log(typeof "5", typeof 5);\nconsole.log(10 % 3);',
        questions: [
          { kind: 'mcq', q: 'Why does <code>"5" + 3</code> print <code>53</code>?',
            options: [
              { t: 'When either side of <code>+</code> is a string, JavaScript joins them as text', ok: true, why: 'The 3 is converted to "3" and stuck onto "5". This is a classic source of bugs with form input.' },
              { t: 'JavaScript is bad at math', ok: false, why: 'It\'s doing exactly what the rules say; the rules are just surprising.' },
              { t: '5 + 3 equals 53 in JavaScript', ok: false, why: '<code>5 + 3</code> (two numbers) is 8. The quotes are what change things.' }
            ] },
          { kind: 'line', q: 'Which line uses a template literal?', answer: 5, why: 'The backticks and <code>${price * qty}</code> mark a template literal. The math inside runs first.' },
          { kind: 'text', q: 'What does <code>10 % 3</code> print?', answer: ['1'], why: '10 ÷ 3 is 3 with 1 left over. <code>%</code> gives the leftover.' }
        ],
        takeaway: '+ means “add” for numbers and “join” for strings, so check which one you have.'
      },
      {
        id: 'L2-2', type: 'quiz', variant: 'predict', skill: 'explain',
        title: 'Predict the Output: Mixed Types',
        code: 'const a = "7";\nconst b = 2;\nconsole.log(a + b);\nconsole.log(a * b);\nconsole.log(`${b + b}${a}`);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What does line 3 print?', answer: ['72'], why: '<code>a</code> is the string "7", so <code>+</code> joins: "7" + "2" = "72".' },
          { kind: 'text', q: 'What does line 4 print?', answer: ['14'], why: '<code>*</code> only works on numbers, so JavaScript converts "7" to 7. 7 × 2 = 14.' },
          { kind: 'text', q: 'What does line 5 print?', answer: ['47'], why: '<code>b + b</code> is 2 + 2 = 4 (both numbers), then the text "7" is placed right after it.' }
        ],
        explain: {
          prompt: 'Why do lines 3 and 4 treat the same two values so differently?',
          minWords: 12,
          keywords: [{ label: 'a is a string', any: ['string', 'text', 'quote'] }, { label: '+ joins (concatenates)', any: ['join', 'concat', 'combine', 'glue', 'stick'] }, { label: '* converts to a number', any: ['convert', 'number', 'multipl'] }],
          model: 'a is the string "7". With +, if either side is a string JavaScript joins them, so you get "72". With *, multiplication only makes sense for numbers, so JavaScript converts "7" into 7 and gives 14.'
        },
        takeaway: 'Know your types. The same operator can do different things.'
      },
      {
        id: 'L2-3', type: 'build', skill: 'build',
        title: 'Build: Receipt Line',
        intro: '<p>A receipt needs a line like <code>Notebook x4 = $14</code>. Use the variables provided. Don\'t type the 14 yourself; <em>calculate</em> it, so the line stays right when the price changes.</p>',
        starter: 'const item = "Notebook";\nconst price = 3.5;\nconst qty = 4;\n\n// Create a const named line that reads: Notebook x4 = $14\n// Use a template literal (backticks) and calculate the total.\n\n// Then print line.\n',
        tests: [
          { expr: 'line', expect: 'Notebook x4 = $14', label: 'line is "Notebook x4 = $14"' },
          { log: 'Notebook x4 = $14', label: 'prints the line' }
        ],
        hints: [
          'Restate it: one string, built from three variables and one calculation.',
          'Template literals use backticks: <code>`${item} x${qty}`</code> gives <code>Notebook x4</code>.',
          'You can do math inside <code>${ }</code>: <code>${price * qty}</code>. For a literal dollar sign before it, write <code>$${price * qty}</code>.'
        ],
        solution: 'const item = "Notebook";\nconst price = 3.5;\nconst qty = 4;\n\nconst line = `${item} x${qty} = $${price * qty}`;\nconsole.log(line);',
        solutionQuestions: [
          { kind: 'mcq', q: 'In <code>$${price * qty}</code>, what does the first <code>$</code> do?',
            options: [
              { t: 'It\'s a plain dollar sign in the text; the <code>${ }</code> after it inserts the calculated number', ok: true, why: 'Only <code>${</code> starts an insertion. A lone <code>$</code> is just a character.' },
              { t: 'It makes the number a currency type', ok: false, why: 'JavaScript has no currency type. It\'s just text.' },
              { t: 'It\'s a typo', ok: false, why: 'Remove it and the receipt loses its dollar sign.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your <code>line</code> gets built. Where does the 14 come from?',
          minWords: 12,
          keywords: [{ label: 'Template literal / backticks', any: ['template', 'backtick', '${'] }, { label: 'Calculated from price × qty', any: ['price', 'qty', 'multipl', '*', 'calculat'] }, { label: 'Why not type 14 directly', any: ['hard', 'change', 'type', 'automatic', 'update'] }],
          model: 'I used a template literal so the variables go straight into the text. The 14 is calculated with ${price * qty} (3.5 × 4), so if the price or quantity changes, the receipt updates automatically instead of showing a stale number.'
        },
        ways: [
          { topic: 'Building the receipt line', forms: [
            { code: 'const line = `${item} x${qty} = $${price * qty}`;', note: 'Template literal: the text reads the way it will print.' },
            { code: 'const line = item + " x" + qty + " = $" + price * qty;', note: 'Joining with <code>+</code>. Same result, because <code>*</code> happens before <code>+</code>. It\'s easy to lose a space inside the quotes.' },
            { code: 'const total = price * qty;\nconst line = `${item} x${qty} = $${total}`;', note: 'Name the calculation first. One extra line, but each line does one job.' }
          ] }
        ],
        takeaway: 'Calculate values from data instead of typing them in.'
      },
      {
        id: 'L2-4', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 2,
        title: 'Bug Hunt: The Form That Can\'t Add',
        symptom: 'The scores are 40 and 35, so the page should show <code>Total score: 75</code>. Instead it shows <code>Total score: 4035</code>.',
        code: '// Values from a web form always arrive as strings\nconst firstScore = "40";\nconst secondScore = "35";\nconst total = firstScore + secondScore;\nconsole.log(`Total score: ${total}`);',
        questions: [
          { kind: 'line', q: 'Which line produces the wrong value?', answer: 4, why: 'Both values are strings, so <code>+</code> joins them into "4035".' },
          classify('logic', 'Nothing crashed. The program finished and printed something, just the wrong something.'),
          { kind: 'mcq', q: 'Which fix is best?',
            options: [
              { t: '<code>const total = Number(firstScore) + Number(secondScore);</code>', ok: true, why: 'Convert each string to a number first, then add. Clear and intentional.' },
              { t: '<code>const total = firstScore - -secondScore;</code>', ok: false, why: 'This happens to work (subtraction converts to numbers) but it\'s a puzzle for whoever reads it. Code is for humans too.' },
              { t: 'Change line 5 to <code>${firstScore + secondScore}</code>', ok: false, why: 'Same join, different place. Still "4035".' },
              { t: 'Remove the comment on line 1', ok: false, why: 'Comments never affect what code does.' }
            ] }
        ],
        fixed: '// Values from a web form always arrive as strings\nconst firstScore = "40";\nconst secondScore = "35";\nconst total = Number(firstScore) + Number(secondScore);\nconsole.log(`Total score: ${total}`);',
        explain: {
          prompt: 'Explain the bug to a teammate who built the form.',
          minWords: 12,
          keywords: [{ label: 'The values are strings', any: ['string', 'text'] }, { label: '+ joined them', any: ['join', 'concat', 'combine', 'glue'] }, { label: 'Convert with Number()', any: ['number(', 'convert', 'number'] }],
          model: 'Form values come in as strings, so "40" + "35" joins the text into "4035" instead of adding. Converting each one with Number() first makes + do real addition and gives 75.'
        },
        takeaway: 'Data from outside (forms, files, the web) often arrives as text. Convert before doing math.'
      },
      {
        id: 'L2-5', type: 'quiz', variant: 'judge', skill: 'explain',
        title: 'Judge the AI: Average Score',
        ai: 'Calculate the average of three test scores: 60, 90, and 90.',
        code: 'const a = 60;\nconst b = 90;\nconst c = 90;\nconst average = a + b + c / 3;\nconsole.log(average);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'First, the correct average by hand: what is (60 + 90 + 90) ÷ 3?', answer: ['80'], why: '240 ÷ 3 = 80. Now you have something to judge the AI against.' },
          { kind: 'text', q: 'Now predict: what does the AI\'s code actually print?', answer: ['180'], why: 'Division happens before addition, so it computes 60 + 90 + (90 ÷ 3) = 60 + 90 + 30 = 180.', miss: 'Remember the order of operations from math class: which happens first, + or /?' },
          { kind: 'line', q: 'Which line is wrong?', answer: 4, why: 'Line 4 divides only <code>c</code> by 3.' },
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: '<code>const average = (a + b + c) / 3;</code>', ok: true, why: 'Parentheses force the addition to happen first.' },
              { t: '<code>const average = a + b + c / 3 / 3;</code>', ok: false, why: 'That divides <code>c</code> even more; the other two are still never divided.' },
              { t: '<code>const average = a / 3 + b + c;</code>', ok: false, why: 'Now only <code>a</code> is divided.' }
            ] },
          { kind: 'mcq', q: 'The code works once fixed. What would make it easier to review?',
            options: [
              { t: 'Descriptive names, like <code>score1</code>, or putting the scores in a list', ok: true, why: '<code>a</code>, <code>b</code>, <code>c</code> say nothing. Good names let a reader check the code against the problem.' },
              { t: 'Adding more blank lines', ok: false, why: 'Spacing helps a little, but names carry the meaning.' },
              { t: 'Nothing: shorter names are always better', ok: false, why: 'Short isn\'t the same as clear.' }
            ] }
        ],
        explain: {
          prompt: 'If you hadn\'t calculated the real average first, would you have caught this? Explain what the AI got wrong and how you\'ll check AI math in the future.',
          minWords: 15,
          keywords: [{ label: 'Order of operations / parentheses', any: ['order', 'precedence', 'parenthes', 'bracket', 'first', 'before'] }, { label: 'Only c was divided', any: ['only c', 'divid', '/ 3'] }, { label: 'Check against a hand calculation', any: ['hand', 'check', 'calculat', 'example', 'test', 'expected', '80'] }],
          model: 'Division happens before addition, so the AI\'s code only divided c by 3 and got 180 instead of 80. It needed parentheses around the sum. I only caught it because I worked out 80 by hand first. In future I\'ll calculate one example myself and compare.'
        },
        takeaway: 'Order of operations still applies. When in doubt, use parentheses.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L3', title: 'Decisions',
    blurb: 'if / else, comparisons, and logical operators, and why the order of your checks matters.',
    concepts: ['if / else', '=== vs ==', '&& || !', 'boundaries'],
    challenges: [
      {
        id: 'L3-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'Making Choices',
        intro: '<ul><li><code>if (condition) { … } else if (…) { … } else { … }</code> runs the <strong>first</strong> branch whose condition is true, and skips the rest.</li>' +
          '<li>Comparisons: <code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> <code>===</code> (equal) <code>!==</code> (not equal).</li>' +
          '<li>Combine with <code>&amp;&amp;</code> (and), <code>||</code> (or), <code>!</code> (not).</li></ul>',
        code: 'const temperature = 28;\nif (temperature > 30) {\n  console.log("Hot");\n} else if (temperature > 15) {\n  console.log("Nice");\n} else {\n  console.log("Cold");\n}\nconsole.log(5 == "5", 5 === "5");',
        questions: [
          { kind: 'text', q: 'What\'s printed first?', answer: ['Nice'], why: '28 > 30 is false, so it moves on. 28 > 15 is true, so it prints "Nice" and skips the else.' },
          { kind: 'mcq', q: 'If <code>temperature</code> were exactly <code>30</code>, what would print?',
            options: [
              { t: 'Nice', ok: true, why: '30 > 30 is false (30 isn\'t <em>greater</em> than itself), and 30 > 15 is true.' },
              { t: 'Hot', ok: false, why: '<code>&gt;</code> means strictly greater. For “30 or more” you\'d need <code>&gt;=</code>.' },
              { t: 'Cold', ok: false, why: 'The second condition, 30 > 15, is true, so it never reaches else.' },
              { t: 'Nothing', ok: false, why: 'With an else at the end, exactly one branch always runs.' }
            ] },
          { kind: 'mcq', q: 'Line 9 prints <code>true false</code>. Why do most teams prefer <code>===</code>?',
            options: [
              { t: '<code>===</code> checks the value <em>and</em> the type, so "5" and 5 aren\'t treated as equal by surprise', ok: true, why: '<code>==</code> converts types first, which hides bugs like the form-input one from Level 2.' },
              { t: '<code>===</code> is faster to type', ok: false, why: 'It\'s actually one character longer.' },
              { t: 'They do the same thing', ok: false, why: 'Line 9 shows they don\'t.' }
            ] }
        ],
        takeaway: 'The first true branch wins. Boundaries like exactly 30 are where bugs hide.'
      },
      {
        id: 'L3-2', type: 'quiz', variant: 'plan', skill: 'understand',
        title: 'Movie Tickets: Find the Edges',
        intro: '<p>The campus theater\'s pricing rules:</p><ul><li>Under 12: <strong>$8</strong></li><li>65 and over: <strong>$9</strong></li><li>Everyone else: <strong>$12</strong></li></ul><p>Before building it, figure out how you\'d know it works.</p>',
        questions: [
          { kind: 'mcq', q: 'Which set of test ages checks the rules best?',
            options: [
              { t: '11, 12, 64, 65', ok: true, why: 'These are the boundaries: the exact ages where the price changes. Off-by-one mistakes show up right there.' },
              { t: '5, 30, 80', ok: false, why: 'One age per group is a start, but it would miss a mistake like <code>age &lt;= 12</code>.' },
              { t: '12 and 65 only', ok: false, why: 'Close! But you also want the age just on the other side of each edge.' },
              { t: 'Any random ages', ok: false, why: 'Random tests rarely land on the edges where bugs live.' }
            ] },
          { kind: 'text', q: 'What should a 12-year-old pay? (number only)', answer: ['12'], why: '“Under 12” means 11 and younger. A 12-year-old pays the regular $12.' },
          { kind: 'mcq', q: 'Translate “65 and over” into a condition:',
            options: [
              { t: '<code>age &gt;= 65</code>', ok: true, why: '“And over” includes 65 itself.' },
              { t: '<code>age &gt; 65</code>', ok: false, why: 'That leaves out someone who is exactly 65.' },
              { t: '<code>age = 65</code>', ok: false, why: 'A single <code>=</code> assigns a value; it doesn\'t compare.' },
              { t: '<code>age === 65</code>', ok: false, why: 'That only matches exactly 65, not 70 or 80.' }
            ] },
          { kind: 'mcq', q: 'The rules don\'t mention an age of −3 or 200. What\'s the responsible move?',
            options: [
              { t: 'Ask whoever owns the rules how invalid ages should be handled', ok: true, why: 'Edge cases are business decisions. Surface them; don\'t guess silently.' },
              { t: 'Let the AI decide when it writes the code', ok: false, why: 'The AI will pick something, and nobody will know it made a decision.' },
              { t: 'Ignore it, people always type their age correctly', ok: false, why: 'They don\'t.' }
            ] }
        ],
        explain: {
          prompt: 'In your own words: why are boundary ages like 12 and 65 the most important tests?',
          minWords: 12,
          keywords: [{ label: 'That\'s where the price changes', any: ['boundary', 'edge', 'exactly', 'border', 'change', 'switch'] }, { label: 'Easy to get < vs <= wrong', any: ['<', '>=', 'off by one', 'off-by-one', 'equal', 'mistake', 'wrong'] }],
          model: 'Boundaries are where the price switches from one rule to another, and that\'s exactly where it\'s easy to write > when you meant >=. Ages in the middle of a group will almost always work, so they don\'t tell you much.'
        },
        takeaway: 'Test the edges, not just the middle.'
      },
      {
        id: 'L3-3', type: 'build', skill: 'build',
        title: 'Build: Ticket Price',
        intro: '<p>Now build it. The function wrapper is written for you (you\'ll learn functions properly in Level 5). You write the <code>if</code> / <code>else</code> inside and <code>return</code> the price.</p><ul><li>Under 12: 8</li><li>65 and over: 9</li><li>Everyone else: 12</li></ul>',
        starter: '// Return the ticket price for the given age.\nfunction ticketPrice(age) {\n  // your if / else if / else goes here\n\n}\n\nconsole.log(ticketPrice(30)); // try other ages too!\n',
        expectReturn: 'ticketPrice',
        tests: [
          { expr: 'ticketPrice(5)', expect: 8 }, { expr: 'ticketPrice(11)', expect: 8 }, { expr: 'ticketPrice(12)', expect: 12 },
          { expr: 'ticketPrice(40)', expect: 12 }, { expr: 'ticketPrice(64)', expect: 12 }, { expr: 'ticketPrice(65)', expect: 9 }, { expr: 'ticketPrice(80)', expect: 9 }
        ],
        hints: [
          'Restate it: three groups, so three branches: <code>if</code>, <code>else if</code>, <code>else</code>.',
          'Use the conditions you worked out in the planning challenge: <code>age &lt; 12</code> and <code>age &gt;= 65</code>.',
          '<code>return 8;</code> hands the price back and exits the function immediately.'
        ],
        solution: 'function ticketPrice(age) {\n  if (age < 12) {\n    return 8;\n  } else if (age >= 65) {\n    return 9;\n  } else {\n    return 12;\n  }\n}\n\nconsole.log(ticketPrice(30));',
        solutionQuestions: [
          { kind: 'mcq', q: 'Would the AI\'s solution still work if it checked <code>age &gt;= 65</code> first and <code>age &lt; 12</code> second?',
            options: [
              { t: 'Yes, those two groups never overlap, so the order doesn\'t matter here', ok: true, why: 'Order matters when ranges overlap (you\'ll see that in the next bug hunt). Here no age is both under 12 and over 65.' },
              { t: 'No, the first check always has to be the smallest number', ok: false, why: 'There\'s no such rule. What matters is whether the conditions overlap.' },
              { t: 'No, it would crash', ok: false, why: 'Reordering conditions doesn\'t cause a crash.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your function decides the price. Mention how you handled ages 12 and 65.',
          minWords: 15,
          keywords: [{ label: 'if / else if / else', any: ['if', 'else', 'condition', 'branch'] }, { label: 'The boundaries 12 and 65', any: ['12', '65'] }, { label: 'return hands back the price', any: ['return'] }],
          model: 'It checks age < 12 first and returns 8. Otherwise it checks age >= 65 and returns 9. Anyone left gets 12 from the else. Because I used < 12, a 12-year-old falls through to the regular price, and >= 65 makes sure exactly 65 gets the senior price.'
        },
        ways: [
          { topic: 'Choosing between three prices', forms: [
            { code: 'if (age < 12) {\n  return 8;\n} else if (age >= 65) {\n  return 9;\n} else {\n  return 12;\n}', note: 'if / else if / else: every branch is visible.' },
            { code: 'if (age < 12) return 8;\nif (age >= 65) return 9;\nreturn 12;', note: 'Early returns. <code>return</code> leaves the function, so no <code>else</code> is needed. Popular for short rules.' },
            { code: 'return age < 12 ? 8 : age >= 65 ? 9 : 12;', note: 'Chained ternaries (<code>condition ? yes : no</code>). Compact, but harder to read and to check against the rules.' }
          ], tip: 'All three pass the same tests. Readability is what decides between them.' }
        ],
        takeaway: 'Translate each rule into one condition, then test the edges.'
      },
      {
        id: 'L3-4', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 2,
        title: 'Bug Hunt: Everyone Gets a D',
        symptom: '<code>grade(95)</code> should be <code>"A"</code>, but it prints <code>"D"</code>. In fact every passing score gets a D.',
        code: 'function grade(score) {\n  if (score >= 60) {\n    return "D";\n  } else if (score >= 70) {\n    return "C";\n  } else if (score >= 80) {\n    return "B";\n  } else if (score >= 90) {\n    return "A";\n  }\n  return "F";\n}\nconsole.log(grade(95));',
        questions: [
          { kind: 'line', q: 'Which line is the root of the problem?', answer: 2, why: 'The first true branch wins. 95 >= 60 is true, so it returns "D" before ever checking for an A.' },
          classify('logic', 'No crash. It printed a grade. Just the wrong one.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: 'Check from highest to lowest: <code>&gt;= 90</code> first, then 80, 70, 60', ok: true, why: 'Then each score lands in the first (highest) bracket it qualifies for.' },
              { t: 'Change every <code>&gt;=</code> to <code>&gt;</code>', ok: false, why: '95 > 60 is still true, so it still returns "D".' },
              { t: 'Remove all the <code>return</code>s', ok: false, why: 'Then every score falls through to the last line and gets "F".' },
              { t: 'Use <code>==</code> instead of <code>&gt;=</code>', ok: false, why: 'Then only exactly 60, 70, 80 or 90 would get a letter.' }
            ] }
        ],
        fixed: 'function grade(score) {\n  if (score >= 90) {\n    return "A";\n  } else if (score >= 80) {\n    return "B";\n  } else if (score >= 70) {\n    return "C";\n  } else if (score >= 60) {\n    return "D";\n  }\n  return "F";\n}\nconsole.log(grade(95));',
        explain: {
          prompt: 'Explain why the order of the checks matters here.',
          minWords: 12,
          keywords: [{ label: 'The first true condition wins', any: ['first', 'stops', 'skip', 'return'] }, { label: 'Ranges overlap', any: ['overlap', 'also', 'any score', 'every', 'true for'] }, { label: 'Check highest first', any: ['highest', 'largest', '90', 'reverse', 'top', 'order'] }],
          model: 'An if/else chain stops at the first true condition. Any score of 90 is also >= 60, so checking 60 first catches every passing score and returns D. Checking from the highest bracket down fixes it.'
        },
        takeaway: 'When conditions overlap, order them from most specific to least.'
      },
      {
        id: 'L3-5', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 3,
        title: 'Bug Hunt: Lives Wiped Out',
        symptom: 'With 3 lives, this should print <code>Keep playing! Lives: 3</code>. Instead it prints <code>Keep playing! Lives: 0</code>. The lives have vanished.',
        code: 'let lives = 3;\nif (lives = 0) {\n  console.log("Game over");\n} else {\n  console.log("Keep playing! Lives: " + lives);\n}',
        questions: [
          { kind: 'line', q: 'Which line has the bug?', answer: 2, why: 'There\'s a single <code>=</code> inside the condition.' },
          { kind: 'mcq', q: 'What does <code>lives = 0</code> actually do inside the <code>if</code>?',
            options: [
              { t: 'It <em>assigns</em> 0 to lives, and then the if checks that value, and 0 counts as false', ok: true, why: 'So it quietly destroys the data and then takes the else branch.' },
              { t: 'It checks whether lives equals 0', ok: false, why: 'That\'s what <code>===</code> does. One <code>=</code> always assigns.' },
              { t: 'Nothing: JavaScript ignores it', ok: false, why: 'If it did nothing, lives would still be 3 in the output.' }
            ] },
          classify('logic', 'It\'s sneaky: no crash, no error message. JavaScript allows assignment inside a condition, so the program finishes with corrupted data.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: '<code>if (lives === 0) {</code>', ok: true, why: 'Three equals signs compare; they never change the variable.' },
              { t: '<code>if (lives = 3) {</code>', ok: false, why: 'Still assigning, and now it always says "Game over".' },
              { t: '<code>if (lives) {</code>', ok: false, why: 'That swaps the meaning: 3 lives would print "Game over".' }
            ] }
        ],
        fixed: 'let lives = 3;\nif (lives === 0) {\n  console.log("Game over");\n} else {\n  console.log("Keep playing! Lives: " + lives);\n}',
        explain: {
          prompt: 'Explain the bug, including why there was no error message.',
          minWords: 12,
          keywords: [{ label: '= assigns, === compares', any: ['assign', '===', 'compar'] }, { label: 'It changed lives to 0', any: ['changed', 'set', 'wiped', 'became 0', 'zero', 'to 0'] }, { label: 'Allowed, so no error', any: ['allowed', 'no error', 'valid', 'silent', 'legal'] }],
          model: 'A single = assigns, so the condition set lives to 0 and then treated 0 as false, which sent it to the else branch with lives already wiped out. JavaScript allows assignment there, so there\'s no error. You have to use === to compare.'
        },
        takeaway: '= assigns, === compares. Linters and code coaches catch this; your eyes should too.'
      },
      {
        id: 'L3-6', type: 'quiz', variant: 'ai', skill: 'explain',
        title: 'Read the AI\'s Code: Who Gets In?',
        ai: 'Write a function that decides if someone can enter the concert. Adults with a ticket can enter. VIPs can always enter.',
        code: 'function canEnter(age, hasTicket, isVIP) {\n  if (isVIP) {\n    return true;\n  }\n  return age >= 18 && hasTicket;\n}\nconsole.log(canEnter(16, true, false));\nconsole.log(canEnter(16, false, true));\nconsole.log(canEnter(30, false, false));',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'Predict the three printed values, separated by spaces.', answer: ['false true false'], why: '16 isn\'t an adult → false. A VIP always gets in → true. 30 but no ticket → false.', miss: 'Take each call separately. Does the VIP check return early? If not, are BOTH parts of the && true?' },
          { kind: 'mcq', q: 'What does <code>&amp;&amp;</code> on line 5 require?',
            options: [
              { t: 'Both sides must be true', ok: true, why: 'Age 18+ AND a ticket.' },
              { t: 'At least one side must be true', ok: false, why: 'That\'s <code>||</code> (or).' },
              { t: 'Neither side can be true', ok: false, why: 'That would be <code>!a &amp;&amp; !b</code>.' }
            ] },
          { kind: 'mcq', q: 'A 16-year-old VIP gets in. Is that a bug?',
            options: [
              { t: 'It depends on the business rule: you\'d need to ask whether VIPs skip the age check', ok: true, why: 'The code does exactly what the prompt said (“VIPs can always enter”). Whether that\'s <em>right</em> is a question about the requirements, not the syntax.' },
              { t: 'Yes, definitely: nobody under 18 should get in', ok: false, why: 'Maybe! But the prompt said VIPs can <em>always</em> enter. You can\'t know without asking.' },
              { t: 'No, AI code is always right if it runs', ok: false, why: 'Running and being right are still different things.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how <code>canEnter</code> decides, and what question you\'d bring back to whoever wrote the requirements.',
          minWords: 18,
          keywords: [{ label: 'VIP returns true early', any: ['vip', 'early', 'first'] }, { label: 'Adults need a ticket (&&)', any: ['&&', 'and', 'both', '18', 'ticket'] }, { label: 'A question about the requirement', any: ['ask', 'question', 'requirement', 'rule', 'should', 'under 18', 'age'] }],
          model: 'If the person is a VIP, the function returns true right away and never looks at age. Otherwise it returns true only if they are 18 or older AND have a ticket. I\'d ask the organizers whether VIPs under 18 are really allowed in, because the code follows the prompt but the prompt might not match what they want.'
        },
        takeaway: 'Some “bugs” are really unclear requirements. Ask.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L4', title: 'Loops',
    blurb: 'Repeat work with for and while, collect results with accumulators, and avoid loops that never end.',
    concepts: ['for', 'while', 'accumulator', 'infinite loops', 'scope'],
    challenges: [
      {
        id: 'L4-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'Doing Things Again',
        intro: '<p>A <code>for</code> loop has three parts: <code>for (start; keep-going condition; step)</code>. A <code>while</code> loop just has a condition. An <strong>accumulator</strong> is a variable that collects a result across passes, like a running total.</p>',
        code: 'let total = 0;\nfor (let i = 1; i <= 4; i++) {\n  total = total + i;\n  console.log(`i is ${i}, total is ${total}`);\n}\nconsole.log("Done:", total);',
        questions: [
          { kind: 'text', q: 'How many times does the loop body (lines 3–4) run?', answer: ['4'], why: 'i takes the values 1, 2, 3, 4. When i becomes 5, 5 <= 4 is false and the loop stops.' },
          { kind: 'text', q: 'What does the last line print?', answer: ['Done: 10'], why: '1 + 2 + 3 + 4 = 10.' },
          { kind: 'mcq', q: 'What\'s the job of <code>total</code>?',
            options: [
              { t: 'It\'s an accumulator: it collects a running sum across passes', ok: true, why: 'It\'s created <em>before</em> the loop so it survives from one pass to the next.' },
              { t: 'It counts how many times the loop ran', ok: false, why: 'That\'s closer to what <code>i</code> does. <code>total</code> adds up the values of <code>i</code>.' },
              { t: 'It controls when the loop stops', ok: false, why: 'The condition <code>i &lt;= 4</code> controls that.' }
            ] }
        ],
        ways: [
          { topic: 'Updating the counter and the total', forms: [
            { code: 'i++', note: 'Adds 1. The usual way to step a <code>for</code> loop.' },
            { code: 'i += 1', note: 'Same thing. Use <code>i += 2</code> to count by twos.' },
            { code: 'total = total + i;  // or: total += i;', note: 'The accumulator update, long and short form.' }
          ] },
          { topic: 'The same loop written with while', forms: [
            { code: 'let total = 0;\nlet i = 1;\nwhile (i <= 4) {\n  total += i;\n  i++;\n}', note: 'A <code>for</code> loop puts start, condition, and step on one line. With <code>while</code> they\'re spread out, which makes it easier to forget the <code>i++</code> (Level 4\'s Endless Flight bug).' }
          ] }
        ],
        takeaway: 'Accumulators live outside the loop; the loop updates them.'
      },
      {
        id: 'L4-2', type: 'quiz', variant: 'predict', skill: 'explain',
        title: 'Predict the Output: Counting Down by Threes',
        code: 'let count = 10;\nwhile (count > 0) {\n  count = count - 3;\n}\nconsole.log(count);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What is printed?', answer: ['-2'], why: '10 → 7 → 4 → 1 → −2. At −2 the condition fails.', miss: 'Write down count after each pass: 10, then 7, then…' },
          { kind: 'text', q: 'How many times did the loop body run?', answer: ['4'], why: 'Four subtractions: 10→7, 7→4, 4→1, 1→−2.' },
          { kind: 'mcq', q: 'Why didn\'t it stop at exactly 0?',
            options: [
              { t: 'The condition is only checked before each pass. 1 > 0 was true, so it subtracted 3 once more', ok: true, why: 'Loops don\'t watch the variable continuously; they check at the top of each pass.' },
              { t: 'Because of a bug in JavaScript', ok: false, why: 'It\'s doing exactly what the code says.' },
              { t: 'Because 0 counts as true', ok: false, why: '0 counts as false, but count never equals 0 here anyway.' }
            ] }
        ],
        takeaway: 'Trace loops pass by pass. Write the values down.'
      },
      {
        id: 'L4-3', type: 'build', skill: 'build',
        title: 'Build: Countdown to Liftoff',
        intro: '<p>Write <code>countdown(n)</code> that <strong>returns</strong> a string counting down from <code>n</code>, followed by <code>Liftoff!</code>.</p><p><code>countdown(3)</code> → <code>"3 2 1 Liftoff!"</code></p>',
        plan: [
          { kind: 'mcq', q: 'What should <code>countdown(0)</code> return?',
            options: [
              { t: '<code>"Liftoff!"</code>', ok: true, why: 'There are no numbers to count, so the loop body never runs and only "Liftoff!" is left.' },
              { t: '<code>"0 Liftoff!"</code>', ok: false, why: 'The countdown goes down to 1, so 0 isn\'t included.' },
              { t: 'An error', ok: false, why: 'Nothing about 0 is invalid. The loop just runs zero times.' }
            ] },
          { kind: 'mcq', q: 'What pattern fits this problem?',
            options: [
              { t: 'Start with an empty string, add each number in a loop, then add "Liftoff!"', ok: true, why: 'It\'s the accumulator pattern, with text instead of a sum.' },
              { t: 'One big if / else for every possible n', ok: false, why: 'n could be anything. Repetition calls for a loop.' },
              { t: 'Print each number with console.log', ok: false, why: 'The function must <em>return</em> one string, not print pieces.' }
            ] }
        ],
        starter: '// countdown(3) should return "3 2 1 Liftoff!"\nfunction countdown(n) {\n\n}\n\nconsole.log(countdown(3));\n',
        expectReturn: 'countdown',
        tests: [
          { expr: 'countdown(3)', expect: '3 2 1 Liftoff!' }, { expr: 'countdown(1)', expect: '1 Liftoff!' },
          { expr: 'countdown(0)', expect: 'Liftoff!' }, { expr: 'countdown(5)', expect: '5 4 3 2 1 Liftoff!' }
        ],
        hints: [
          'Restate it: build a string piece by piece: an accumulator, but with text.',
          'A loop that counts <em>down</em>: <code>for (let i = n; i &gt;= 1; i--)</code>',
          'Inside the loop: <code>result = result + i + " ";</code> After the loop: <code>return result + "Liftoff!";</code>'
        ],
        solution: 'function countdown(n) {\n  let result = "";\n  for (let i = n; i >= 1; i--) {\n    result = result + i + " ";\n  }\n  return result + "Liftoff!";\n}\n\nconsole.log(countdown(3));',
        solutionQuestions: [
          { kind: 'mcq', q: 'In the AI\'s solution, why does <code>result</code> start as <code>""</code> (an empty string)?',
            options: [
              { t: 'So there\'s something to add the first number onto, and adding numbers to a string makes text', ok: true, why: 'Starting with "" means <code>"" + 3 + " "</code> gives "3 ", not a number.' },
              { t: 'Because strings must always start empty', ok: false, why: 'Strings can start with anything. Empty is just the right starting point here.' },
              { t: 'It doesn\'t matter what it starts as', ok: false, why: 'Starting at 0 would give "03 2 1 Liftoff!".' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your countdown is built, step by step.',
          minWords: 15,
          keywords: [{ label: 'A loop counting down', any: ['loop', 'for', 'while', 'down', 'i--'] }, { label: 'Building up a string', any: ['string', 'result', 'add', 'build', 'accumul'] }, { label: 'Returning the result', any: ['return'] }],
          model: 'I start with an empty string. The loop starts i at n and counts down to 1, adding each number and a space onto the string. After the loop ends I add "Liftoff!" and return the whole thing. If n is 0 the loop never runs, so it just returns "Liftoff!".'
        },
        ways: [
          { topic: 'Counting down', forms: [
            { code: 'let result = "";\nfor (let i = n; i >= 1; i--) {\n  result += i + " ";\n}\nreturn result + "Liftoff!";', note: '<code>for</code> loop counting down with <code>i--</code>, and <code>+=</code> to add to the string.' },
            { code: 'let result = "";\nlet i = n;\nwhile (i >= 1) {\n  result += i + " ";\n  i--;\n}\nreturn result + "Liftoff!";', note: '<code>while</code> version. Same steps, spread over more lines.' },
            { code: 'const numbers = [];\nfor (let i = n; i >= 1; i--) {\n  numbers.push(i);\n}\nnumbers.push("Liftoff!");\nreturn numbers.join(" ");', note: 'Collect the pieces in an array (Level 6), then <code>join</code> them with spaces. No trailing-space bookkeeping.' }
          ] }
        ],
        takeaway: 'Accumulators work for text too.'
      },
      {
        id: 'L4-4', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 2,
        title: 'Bug Hunt: The Endless Flight',
        symptom: 'The page freezes. It prints <code>Flying... fuel: 5</code> over and over, and <code>Landed</code> never appears. (Run it; the game stops it for you after a couple of seconds.)',
        code: 'let fuel = 5;\nwhile (fuel > 0) {\n  console.log("Flying... fuel:", fuel);\n}\nconsole.log("Landed");',
        questions: [
          { kind: 'line', q: 'Which line holds the condition that never becomes false?', answer: 2, why: '<code>fuel &gt; 0</code> stays true forever because nothing inside the loop changes fuel.' },
          classify('runtime', 'The program starts and never finishes. There\'s no error message; it just hangs. That\'s a runtime problem.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: 'Add <code>fuel = fuel - 1;</code> inside the loop', ok: true, why: 'Now each pass moves the loop toward its exit.' },
              { t: 'Change <code>while</code> to <code>if</code>', ok: false, why: 'It wouldn\'t freeze, but it would only “fly” once.' },
              { t: 'Change <code>&gt;</code> to <code>&lt;</code>', ok: false, why: 'Then the loop never runs at all.' },
              { t: 'Delete the <code>console.log</code> on line 3', ok: false, why: 'It would still loop forever, just silently.' }
            ] }
        ],
        fixed: 'let fuel = 5;\nwhile (fuel > 0) {\n  console.log("Flying... fuel:", fuel);\n  fuel = fuel - 1;\n}\nconsole.log("Landed");',
        explain: {
          prompt: 'Explain the bug: what does every loop need so that it can end?',
          minWords: 12,
          keywords: [{ label: 'fuel never changes', any: ['never change', 'never decrease', 'stays', 'same', 'never goes down', 'nothing changes'] }, { label: 'The condition stays true', any: ['condition', 'true', 'forever', 'infinite'] }, { label: 'Decrease fuel inside the loop', any: ['decrease', 'subtract', '- 1', '-1', 'fuel--', 'reduce'] }],
          model: 'Nothing in the loop changes fuel, so fuel > 0 stays true forever and the loop never ends. Every loop needs something inside it that moves toward making the condition false: here, subtracting 1 from fuel each time.'
        },
        takeaway: 'Every loop needs a way out. Find the variable that should change.'
      },
      {
        id: 'L4-5', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 3,
        title: 'Bug Hunt: Steps That Vanish',
        symptom: 'Calling <code>weeklySteps(1000)</code> should give <code>7000</code>. Instead: <code>ReferenceError: total is not defined</code>.',
        code: 'function weeklySteps(dailySteps) {\n  for (let day = 1; day <= 7; day++) {\n    let total = 0;\n    total = total + dailySteps;\n  }\n  return total;\n}\nconsole.log(weeklySteps(1000));',
        questions: [
          { kind: 'line', q: 'Which line <strong>throws</strong> the error?', answer: 6, why: 'Line 6 asks for <code>total</code>, but there\'s no <code>total</code> out here.' },
          { kind: 'line', q: 'Which line is the real <strong>cause</strong>?', answer: 3, why: 'A <code>let</code> only exists inside the <code>{ }</code> block where it\'s declared. Declared inside the loop, <code>total</code> disappears when the loop ends.' },
          classify('runtime', 'The program starts, runs the loop, then crashes on line 6 with an error message.'),
          { kind: 'mcq', q: 'Suppose <code>return</code> <em>could</em> see <code>total</code>. There\'s a second bug hiding here. What is it?',
            options: [
              { t: '<code>total</code> is reset to 0 on every pass, so it would never get past one day\'s steps', ok: true, why: 'Moving the declaration above the loop fixes both problems at once.' },
              { t: 'The loop should run 6 times, not 7', ok: false, why: 'day goes 1 through 7: seven days in a week. That part\'s fine.' },
              { t: 'dailySteps should be declared with let', ok: false, why: 'Parameters are already variables. No keyword needed.' }
            ] },
          { kind: 'mcq', q: 'Which fix solves both bugs?',
            options: [
              { t: 'Move <code>let total = 0;</code> to just above the <code>for</code> loop', ok: true, why: 'Now total is created once, survives every pass, and is still visible at return.' },
              { t: 'Change <code>let</code> to <code>const</code> on line 3', ok: false, why: 'Still inside the loop (still invisible to return), and now line 4 would crash too.' },
              { t: 'Return 7000', ok: false, why: 'That only works for one input. Never hard-code the answer.' }
            ] }
        ],
        fixed: 'function weeklySteps(dailySteps) {\n  let total = 0;\n  for (let day = 1; day <= 7; day++) {\n    total = total + dailySteps;\n  }\n  return total;\n}\nconsole.log(weeklySteps(1000));',
        explain: {
          prompt: 'Explain both bugs, using the word “scope” or “block” in your answer.',
          minWords: 15,
          keywords: [{ label: 'Scope: let lives inside its block', any: ['scope', 'block', 'inside the loop', 'only exists'] }, { label: 'Reset to 0 each pass', any: ['reset', 'every time', 'each time', 'each pass', 'every pass', 'starts over'] }, { label: 'Declare it before the loop', any: ['before', 'outside', 'above', 'move'] }],
          model: 'total is declared with let inside the loop\'s block, so its scope is only that block, so return on line 6 can\'t see it. It\'s also reset to 0 every pass, so it could never accumulate. Declaring it once above the loop fixes both.'
        },
        takeaway: 'A variable lives only inside the { } where it was declared.'
      },
      {
        id: 'L4-6', type: 'quiz', variant: 'ai', skill: 'explain',
        title: 'Read the AI\'s Code: Lucky Seven',
        ai: 'Find the first number above 50 that is divisible by 7.',
        code: 'let n = 51;\nwhile (n % 7 !== 0) {\n  n++;\n}\nconsole.log(n);',
        runAfter: true,
        questions: [
          { kind: 'mcq', q: 'What does <code>n % 7 !== 0</code> mean?',
            options: [
              { t: '“Dividing n by 7 leaves a remainder”: n is not divisible by 7', ok: true, why: 'So the loop keeps going until it finds a number with no remainder.' },
              { t: '“n is not equal to 7”', ok: false, why: '<code>%</code> is the remainder operator, not part of the comparison.' },
              { t: '“n divided by 7 is not 0”', ok: false, why: 'That would be <code>n / 7</code>. <code>%</code> gives what\'s left over.' }
            ] },
          { kind: 'text', q: 'What does it print?', answer: ['56'], why: '51, 52, 53, 54, 55 all leave remainders. 56 = 7 × 8.' },
          { kind: 'text', q: 'If line 1 were <code>let n = 49;</code>, what would print?', answer: ['49'], why: '49 % 7 is already 0, so the condition is false on the first check and the loop body never runs.' },
          { kind: 'mcq', q: 'Is <code>while</code> a good choice here?',
            options: [
              { t: 'Yes, we don\'t know ahead of time how many steps it will take', ok: true, why: 'That\'s exactly what <code>while</code> is for. <code>for</code> fits best when the count is known.' },
              { t: 'No, you should always use for', ok: false, why: 'Both have their place.' },
              { t: 'No, loops are slow', ok: false, why: 'Performance isn\'t a concern for a handful of steps.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how this code finds its answer. Would it work if it started at a number already divisible by 7?',
          minWords: 15,
          keywords: [{ label: 'Remainder check with %', any: ['%', 'remainder', 'divisible'] }, { label: 'Adds 1 until it finds one', any: ['n++', 'add 1', 'adds one', 'increase', 'next number', 'counts up'] }, { label: 'Starting value matters', any: ['start', '51', '49', 'never runs', 'already'] }],
          model: 'It starts at 51 and keeps adding 1 while the remainder of n ÷ 7 isn\'t 0. As soon as it finds a number with no remainder (56) the loop stops and prints it. If it started at a multiple of 7 like 49, the loop wouldn\'t run at all and it would print 49, which matters, because the prompt said “above 50”, so the starting value has to be chosen carefully.'
        },
        takeaway: 'while = “keep going until…”. Check what happens on the very first check.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L5', title: 'Functions',
    blurb: 'Package logic into reusable functions. Learn the difference between returning and printing, and catch names AI made up.',
    concepts: ['parameters', 'return', 'arrow functions', 'default parameters'],
    challenges: [
      {
        id: 'L5-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'Reusable Recipes',
        intro: '<p>A <strong>function</strong> is a named, reusable piece of code. <strong>Parameters</strong> are its inputs; <code>return</code> hands back its output. Arrow functions are a shorter way to write them: <code>(x) =&gt; x * 2</code>.</p>',
        code: 'function area(width, height) {\n  return width * height;\n}\nconst double = (x) => x * 2;\nconst room = area(3, 4);\nconsole.log(room);\nconsole.log(double(room));',
        questions: [
          { kind: 'line', q: 'Which line <strong>calls</strong> (runs) <code>area</code>?', answer: 5, why: 'Lines 1–3 only <em>define</em> the function. Line 5 runs it with width 3 and height 4.' },
          { kind: 'text', q: 'What does line 7 print?', answer: ['24'], why: 'room is 3 × 4 = 12, and double(12) is 24.' },
          { kind: 'mcq', q: 'What\'s the difference between <code>return</code> and <code>console.log</code>?',
            options: [
              { t: '<code>return</code> hands a value back to the code that called the function; <code>console.log</code> only displays it for a human', ok: true, why: 'Because area <em>returns</em>, line 5 can store the result and line 7 can reuse it.' },
              { t: 'They\'re the same thing', ok: false, why: 'The next challenge shows exactly how they differ.' },
              { t: '<code>return</code> prints in a different color', ok: false, why: '<code>return</code> doesn\'t print anything.' }
            ] }
        ],
        ways: [
          { topic: 'Three ways to write the same function', forms: [
            { code: 'function area(width, height) {\n  return width * height;\n}', note: 'Function declaration. Can be called from anywhere in the file, even above where it\'s written.' },
            { code: 'const area = function (width, height) {\n  return width * height;\n};', note: 'Function expression: a function stored in a variable.' },
            { code: 'const area = (width, height) => width * height;', note: 'Arrow function. With a single expression after <code>=&gt;</code>, the value is returned automatically. Common in AI-written code and with <code>map</code>/<code>filter</code>.' }
          ], tip: 'All three are called the same way: <code>area(3, 4)</code>.' }
        ],
        takeaway: 'Functions take inputs and return outputs. Printing is a side effect.'
      },
      {
        id: 'L5-2', type: 'quiz', variant: 'predict', skill: 'explain',
        title: 'Predict the Output: Print vs Return',
        code: 'function greet(name) {\n  console.log("Hi " + name);\n}\nconst result = greet("Sam");\nconsole.log(result);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What is printed first?', answer: ['Hi Sam'], why: 'Calling greet on line 4 runs line 2.' },
          { kind: 'text', q: 'What is printed second?', answer: ['undefined'], why: 'greet never returns anything, so <code>result</code> is <code>undefined</code>.', miss: 'What does greet hand back? Look for a return statement.' },
          { kind: 'mcq', q: 'How would you make <code>result</code> hold <code>"Hi Sam"</code>?',
            options: [
              { t: 'Change line 2 to <code>return "Hi " + name;</code>', ok: true, why: 'Then the caller gets the text and decides what to do with it.' },
              { t: 'Add another console.log', ok: false, why: 'Printing more doesn\'t give the caller anything.' },
              { t: 'Change <code>const result</code> to <code>let result</code>', ok: false, why: 'The keyword doesn\'t matter; greet still returns nothing.' }
            ] }
        ],
        takeaway: 'No return → the function gives back undefined.'
      },
      {
        id: 'L5-3', type: 'build', skill: 'build',
        title: 'Build: Discount Calculator',
        intro: '<p>The campus store needs <code>applyDiscount(price, percent)</code>, which <strong>returns</strong> the price after taking <code>percent</code>% off, rounded to cents.</p><p><code>applyDiscount(100, 10)</code> → <code>90</code></p>',
        plan: [
          { kind: 'mcq', q: 'Should <code>applyDiscount</code> print the new price, or return it?',
            options: [
              { t: 'Return it, so other code (a cart total, a receipt) can use it', ok: true, why: 'Functions that return values can be combined. Printing is a dead end.' },
              { t: 'Print it, so the customer can see it', ok: false, why: 'Showing it to the customer is a separate job. Keep the calculation reusable.' }
            ] },
          { kind: 'text', q: 'By hand: what should <code>applyDiscount(19.99, 25)</code> be, rounded to cents?', answer: ['14.99'], why: '25% off means paying 75%: 19.99 × 0.75 = 14.9925, which rounds to 14.99.' }
        ],
        starter: '// applyDiscount(100, 10) should return 90\n// Round the result to 2 decimal places (cents).\nfunction applyDiscount(price, percent) {\n\n}\n\nconsole.log(applyDiscount(100, 10));\n',
        expectReturn: 'applyDiscount',
        tests: [
          { expr: 'applyDiscount(100, 10)', expect: 90 }, { expr: 'applyDiscount(50, 0)', expect: 50 },
          { expr: 'applyDiscount(19.99, 25)', expect: 14.99 }, { expr: 'applyDiscount(80, 100)', expect: 0 }
        ],
        hints: [
          'Restate it: two inputs, one number out. “percent% off” means you pay (100 − percent)%.',
          'Turn the percent into a multiplier: <code>1 - percent / 100</code>. For 25 that\'s 0.75.',
          'To round to cents and keep a <em>number</em>: <code>Math.round(value * 100) / 100</code>. (<code>.toFixed(2)</code> returns a string, which won\'t match.)'
        ],
        solution: 'function applyDiscount(price, percent) {\n  const discounted = price * (1 - percent / 100);\n  return Math.round(discounted * 100) / 100;\n}\n\nconsole.log(applyDiscount(100, 10));',
        solutionQuestions: [
          { kind: 'mcq', q: 'Why does the AI multiply by 100, round, then divide by 100?',
            options: [
              { t: 'Math.round only rounds to whole numbers, so it shifts to cents, rounds, then shifts back', ok: true, why: '14.9925 → 1499.25 → 1499 → 14.99.' },
              { t: 'To convert dollars to percent', ok: false, why: 'It\'s purely about rounding to two decimal places.' },
              { t: 'It cancels out, so it does nothing', ok: false, why: 'The rounding in the middle is the whole point.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your function calculates and rounds the discounted price.',
          minWords: 15,
          keywords: [{ label: 'Convert the percent', any: ['percent', '/ 100', '/100', 'multipl', '0.75'] }, { label: 'Round to cents', any: ['round', 'cent', 'decimal'] }, { label: 'Return the number', any: ['return'] }],
          model: 'It turns the percent into a multiplier (1 − percent/100), so 25% off means multiplying by 0.75. Then it rounds to cents by multiplying by 100, rounding to a whole number, and dividing by 100. It returns a number, not a string, so other code can keep doing math with it.'
        },
        takeaway: 'Return values (not printed text) so functions can be combined.'
      },
      {
        id: 'L5-4', type: 'build', skill: 'build',
        title: 'Build: Damage Calculator',
        intro: '<p>In a battle game, an attack does <code>attack − defense</code> damage, but every hit does <strong>at least 1</strong> damage. Write <code>damage(attack, defense)</code>.</p>',
        plan: [
          { kind: 'text', q: 'What should <code>damage(5, 9)</code> return?', answer: ['1'], why: '5 − 9 is −4, but the rule says at least 1.' }
        ],
        starter: 'function damage(attack, defense) {\n\n}\n\nconsole.log(damage(10, 3)); // 7\n',
        expectReturn: 'damage',
        tests: [{ expr: 'damage(10, 3)', expect: 7 }, { expr: 'damage(5, 5)', expect: 1 }, { expr: 'damage(2, 9)', expect: 1 }, { expr: 'damage(20, 0)', expect: 20 }],
        hints: [
          'Restate it: subtract, then make sure the answer is never below 1.',
          'An <code>if</code> works: if the result is less than 1, return 1.',
          'Or use <code>Math.max(1, value)</code>: it returns whichever is larger.'
        ],
        solution: 'function damage(attack, defense) {\n  return Math.max(1, attack - defense);\n}\n\nconsole.log(damage(10, 3));',
        solutionQuestions: [
          { kind: 'mcq', q: 'How does <code>Math.max(1, attack - defense)</code> guarantee at least 1?',
            options: [
              { t: 'It returns the larger of the two values, so a result below 1 is replaced by 1', ok: true, why: 'Math.max(1, −4) is 1; Math.max(1, 7) is 7.' },
              { t: 'It adds 1 to the result', ok: false, why: 'Then damage(10, 3) would be 8.' },
              { t: 'It rounds the result up', ok: false, why: 'That\'s Math.ceil.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your function enforces the “at least 1” rule.',
          minWords: 12,
          keywords: [{ label: 'Subtract defense from attack', any: ['subtract', 'minus', '-', 'attack', 'defense'] }, { label: 'Minimum of 1', any: ['at least', 'minimum', 'max', 'below 1', 'less than 1', 'never'] }],
          model: 'It subtracts defense from attack, then uses Math.max to pick whichever is bigger: that result or 1. So a strong defense can reduce damage, but never below 1.'
        },
        ways: [
          { topic: 'Enforcing a minimum of 1', forms: [
            { code: 'return Math.max(1, attack - defense);', note: 'One line. Reads as “the bigger of 1 and the difference.”' },
            { code: 'const result = attack - defense;\nif (result < 1) {\n  return 1;\n}\nreturn result;', note: 'The rule written out. Longer, but the “at least 1” rule is easy to spot.' },
            { code: 'const result = attack - defense;\nreturn result < 1 ? 1 : result;', note: 'Ternary. A middle ground.' }
          ] }
        ],
        takeaway: 'Game rules often mean clamping values: Math.max for a floor, Math.min for a ceiling.'
      },
      {
        id: 'L5-5', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 2,
        title: 'Bug Hunt: The Function That Isn\'t There',
        symptom: '<code>ReferenceError: calcTax is not defined</code>',
        ai: 'Add 8% tax to a $50 subtotal and print the total.',
        code: 'function calculateTax(amount) {\n  return amount * 0.08;\n}\nconst subtotal = 50;\nconst tax = calcTax(subtotal);\nconsole.log(subtotal + tax);',
        questions: [
          { kind: 'line', q: 'Which line throws the error?', answer: 5, why: 'Line 5 calls <code>calcTax</code>, but the function is named <code>calculateTax</code>.' },
          classify('runtime', 'Lines 1–4 ran fine, then the program crashed on line 5.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: 'Call <code>calculateTax(subtotal)</code> on line 5', ok: true, why: 'Use the name that was actually defined.' },
              { t: 'Add <code>let calcTax;</code> above line 5', ok: false, why: 'Now calcTax exists but it\'s undefined, so calling it is a different crash: “calcTax is not a function”.' },
              { t: 'Delete line 5', ok: false, why: 'Then line 6 crashes because tax doesn\'t exist.' }
            ] },
          { kind: 'mcq', q: 'AI assistants sometimes call helpers that were never written, or use a slightly different name. What habit catches this?',
            options: [
              { t: 'Run the code, and check that every function it calls is actually defined', ok: true, why: 'Read the error message too; it names exactly what\'s missing.' },
              { t: 'Assume the AI knows a library you don\'t', ok: false, why: 'Sometimes true, often not. Verify.' },
              { t: 'Ask the AI to promise it\'s correct', ok: false, why: 'An AI saying it\'s correct isn\'t evidence.' }
            ] }
        ],
        fixed: 'function calculateTax(amount) {\n  return amount * 0.08;\n}\nconst subtotal = 50;\nconst tax = calculateTax(subtotal);\nconsole.log(subtotal + tax);',
        explain: {
          prompt: 'Explain the bug and how the error message pointed you to it.',
          minWords: 12,
          keywords: [{ label: 'Names don\'t match', any: ['name', 'calculatetax', 'different', 'match', 'misspell', 'spell'] }, { label: 'The error message said what was missing', any: ['error', 'message', 'not defined', 'referenceerror'] }],
          model: 'The function is defined as calculateTax but line 5 calls calcTax, which doesn\'t exist. The ReferenceError says exactly that (“calcTax is not defined”), so the fix is to call the real name.'
        },
        takeaway: 'Error messages name the problem. Read them before guessing.'
      },
      {
        id: 'L5-6', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 3,
        title: 'Bug Hunt: The Missing Brace',
        symptom: '<code>SyntaxError: Unexpected token</code>, reported at the very <em>end</em> of the code, not where the mistake is.',
        code: 'function checkAnswer(answer) {\n  if (answer === 42) {\n    return "Correct!";\n  } else {\n    return "Try again";\n  }\nconsole.log(checkAnswer(42));',
        questions: [
          { kind: 'line', q: 'After which line is a closing <code>}</code> missing?', answer: [5, 6], why: 'Count the braces: line 1 opens the function, line 2 opens the if, line 4 closes the if and opens the else, line 6 closes the else. The function is never closed.', hint: 'Count every { and every }. Which opening brace never gets its partner?' },
          { kind: 'mcq', q: 'Why is the error reported at the end of the file instead of where the brace is missing?',
            options: [
              { t: 'JavaScript keeps reading, assuming the function continues. It only gives up when it runs out of code', ok: true, why: 'That\'s why the reported line is often <em>after</em> the real mistake. Look upward.' },
              { t: 'The last line is the one with the mistake', ok: false, why: 'Line 7 is fine on its own.' },
              { t: 'Error messages are random', ok: false, why: 'They\'re precise about where the parser gave up, just not always about where you went wrong.' }
            ] },
          classify('syntax', 'Nothing ran, not even the console.log. JavaScript couldn\'t read the structure.')
        ],
        fixed: 'function checkAnswer(answer) {\n  if (answer === 42) {\n    return "Correct!";\n  } else {\n    return "Try again";\n  }\n}\nconsole.log(checkAnswer(42));',
        explain: {
          prompt: 'Explain the bug and what you\'ll do next time an error points somewhere that looks fine.',
          minWords: 12,
          keywords: [{ label: 'The function\'s } is missing', any: ['brace', '}', 'bracket', 'close', 'function'] }, { label: 'Error is reported later than the cause', any: ['end', 'later', 'after', 'look up', 'above', 'before'] }, { label: 'Count / match the braces', any: ['count', 'match', 'pair', 'indent'] }],
          model: 'The function\'s closing brace is missing, so JavaScript thinks line 7 is still inside the function and only realizes something is wrong when the code ends. Next time the reported line looks fine, I\'ll look above it and count or match up the braces; consistent indentation makes this easy to spot.'
        },
        takeaway: 'Syntax errors are often reported after the real mistake. Look up.'
      },
      {
        id: 'L5-7', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 3,
        title: 'Bug Hunt: Not a Number',
        symptom: 'The order total should be <code>45</code>. It prints <code>Shipping: 5</code> and then <code>NaN</code>.',
        code: 'function shippingCost(weight) {\n  let cost = 5;\n  if (weight > 10) {\n    cost = 15;\n  }\n  console.log("Shipping:", cost);\n}\nconst total = 40 + shippingCost(3);\nconsole.log(total);',
        questions: [
          { kind: 'line', q: 'Which line should be different?', answer: 6, why: 'The function prints the cost instead of returning it.' },
          { kind: 'mcq', q: 'Why does it print <code>NaN</code>?',
            options: [
              { t: 'shippingCost returns undefined, and 40 + undefined is NaN (“Not a Number”)', ok: true, why: 'NaN is often the clue that something upstream gave back undefined.' },
              { t: 'Because 3 is less than 10', ok: false, why: 'The weight check works: cost is correctly 5.' },
              { t: 'Because cost is a let', ok: false, why: 'let is right here: cost might change.' }
            ] },
          classify('logic', 'No crash. JavaScript happily calculates 40 + undefined; it just gets a useless answer.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: 'Change line 6 to <code>return cost;</code>', ok: true, why: 'Now the caller receives 5, and 40 + 5 = 45.' },
              { t: 'Change line 8 to <code>const total = 40 + cost;</code>', ok: false, why: '<code>cost</code> only exists inside the function, so that\'s a ReferenceError.' },
              { t: 'Print the total inside the function', ok: false, why: 'Then the function only works for one order total.' }
            ] }
        ],
        fixed: 'function shippingCost(weight) {\n  let cost = 5;\n  if (weight > 10) {\n    cost = 15;\n  }\n  return cost;\n}\nconst total = 40 + shippingCost(3);\nconsole.log(total);',
        explain: {
          prompt: 'Explain the bug. What does NaN usually tell you?',
          minWords: 12,
          keywords: [{ label: 'Printing instead of returning', any: ['return', 'console.log', 'print'] }, { label: 'undefined in math gives NaN', any: ['undefined', 'nan', 'not a number'] }],
          model: 'shippingCost prints the cost but never returns it, so calling it gives undefined. 40 + undefined is NaN. When I see NaN, I look for a value that came back undefined, often a missing return or a misspelled property.'
        },
        takeaway: 'NaN usually means undefined snuck into some math.'
      },
      {
        id: 'L5-8', type: 'quiz', variant: 'ai', skill: 'explain',
        title: 'Read the AI\'s Code: Price Formatter',
        ai: 'Write a function that formats a price with 2 decimals and a currency code. Default to USD.',
        code: 'const formatPrice = (amount, currency = "USD") => {\n  const rounded = amount.toFixed(2);\n  return `${rounded} ${currency}`;\n};\nconsole.log(formatPrice(5));\nconsole.log(formatPrice(3.456, "CAD"));',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What does line 5 print?', answer: ['5.00 USD'], why: 'toFixed(2) makes "5.00", and currency falls back to "USD".' },
          { kind: 'text', q: 'What does line 6 print?', answer: ['3.46 CAD'], why: 'toFixed(2) rounds 3.456 to "3.46", and "CAD" replaces the default.' },
          { kind: 'mcq', q: 'What does <code>currency = "USD"</code> in the parameter list mean?',
            options: [
              { t: 'A default value, used when the caller doesn\'t pass a currency', ok: true, why: 'Line 5 passes only an amount, so currency becomes "USD".' },
              { t: 'currency must always be "USD"', ok: false, why: 'Line 6 passes "CAD" and it\'s used.' },
              { t: 'It compares currency to "USD"', ok: false, why: 'One = assigns; here it sets a default.' }
            ] },
          { kind: 'mcq', q: 'A form passes the amount as the string <code>"5"</code>. What happens with <code>formatPrice("5")</code>?',
            options: [
              { t: 'It crashes: strings don\'t have a toFixed method (TypeError: amount.toFixed is not a function)', ok: true, why: 'The AI assumed amount is always a number. A reviewer should ask: where does this value come from?' },
              { t: 'It prints "5.00 USD"', ok: false, why: 'Only numbers have toFixed. JavaScript doesn\'t convert automatically here.' },
              { t: 'It prints "5 USD"', ok: false, why: 'It never gets as far as returning.' }
            ] }
        ],
        explain: {
          prompt: 'Explain what formatPrice does, and describe one assumption the AI made that could break it.',
          minWords: 18,
          keywords: [{ label: 'Rounds to 2 decimals with toFixed', any: ['tofixed', 'decimal', 'round'] }, { label: 'Default currency', any: ['default', 'usd'] }, { label: 'Assumes amount is a number', any: ['number', 'string', 'assum', 'crash', 'typeerror'] }],
          model: 'It turns the amount into text with exactly two decimals using toFixed, then returns that with a currency code, which defaults to "USD" if none is given. It assumes amount is a number. If it gets a string like "5" from a form, toFixed doesn\'t exist and it crashes.'
        },
        takeaway: 'Ask what every function assumes about its inputs.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L6', title: 'Arrays',
    blurb: 'Work with lists: indexes, length, loops over arrays, map and filter, and the classic off-by-one.',
    concepts: ['index', 'length', 'push', 'for...of', 'map', 'filter'],
    challenges: [
      {
        id: 'L6-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'Lists of Things',
        intro: '<p>An <strong>array</strong> is an ordered list: <code>["sword", "shield"]</code>. Items are numbered from <strong>0</strong>. <code>.length</code> is how many items there are. <code>.push()</code> adds to the end. <code>for (const item of list)</code> visits each item.</p>',
        code: 'const inventory = ["sword", "shield", "potion"];\nconsole.log(inventory[0]);\nconsole.log(inventory.length);\ninventory.push("map");\nfor (const item of inventory) {\n  console.log(item);\n}\nconsole.log(inventory[inventory.length - 1]);',
        questions: [
          { kind: 'text', q: 'What does line 2 print?', answer: ['sword'], why: 'Index 0 is the first item.' },
          { kind: 'line', q: 'Which line adds an item?', answer: 4, why: '<code>push</code> adds "map" to the end.' },
          { kind: 'mcq', q: 'Why is the last item at <code>length - 1</code>?',
            options: [
              { t: 'Counting starts at 0, so 4 items are at indexes 0, 1, 2, 3', ok: true, why: 'This one fact causes a huge share of real-world bugs.' },
              { t: 'The last item is always empty', ok: false, why: 'There\'s no hidden empty item.' },
              { t: 'Because push added one', ok: false, why: 'It\'s true for every array, push or not.' }
            ] },
          { kind: 'text', q: 'What does the last line print?', answer: ['map'], why: 'After the push, the array has 4 items; index 3 is "map".' }
        ],
        takeaway: 'Indexes start at 0. The last one is length − 1.'
      },
      {
        id: 'L6-2', type: 'quiz', variant: 'predict', skill: 'explain',
        title: 'Predict the Output: Filter and Map',
        intro: '<p><code>filter</code> keeps the items that pass a test. <code>map</code> transforms every item. Both return a <em>new</em> array. <code>p =&gt; p &gt; 10</code> is a tiny arrow function that runs on each item.</p>',
        code: 'const prices = [5, 12, 8, 20];\nconst big = prices.filter(p => p > 10);\nconst doubled = big.map(p => p * 2);\nconsole.log(big);\nconsole.log(doubled);\nconsole.log(prices.length);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What does line 4 print?', answer: ['[12, 20]'], why: 'Only 12 and 20 pass the test p > 10.' },
          { kind: 'text', q: 'What does line 5 print?', answer: ['[24, 40]'], why: 'map doubles each item in big.' },
          { kind: 'text', q: 'What does line 6 print?', answer: ['4'], why: 'filter and map make new arrays; prices is untouched.' }
        ],
        explain: {
          prompt: 'Explain the difference between filter and map, using this code as the example.',
          minWords: 15,
          keywords: [{ label: 'filter keeps items that pass a test', any: ['filter', 'keep', 'test', 'condition', '> 10'] }, { label: 'map transforms every item', any: ['map', 'transform', 'every', 'each', 'double'] }, { label: 'Original array unchanged', any: ['new array', 'original', 'unchanged', 'still 4', "doesn't change"] }],
          model: 'filter goes through prices and keeps only the items where p > 10 is true, giving [12, 20]. map takes every item of that array and transforms it (here doubling), giving [24, 40]. Both return new arrays, so prices still has 4 items.'
        },
        takeaway: 'filter chooses, map transforms, and neither changes the original.'
      },
      {
        id: 'L6-3', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 3,
        title: 'Bug Hunt: One Step Too Far',
        symptom: 'The total of the scores should be <code>255</code>. It prints <code>NaN</code>.',
        code: 'const scores = [88, 92, 75];\nlet total = 0;\nfor (let i = 0; i <= scores.length; i++) {\n  total = total + scores[i];\n}\nconsole.log(total);',
        questions: [
          { kind: 'line', q: 'Which line has the bug?', answer: 3, why: '<code>i &lt;= scores.length</code> lets i reach 3.' },
          { kind: 'mcq', q: 'On the last pass <code>i</code> is 3. What is <code>scores[3]</code>?',
            options: [
              { t: 'undefined: there is no item at index 3', ok: true, why: 'The items are at 0, 1, 2. And 255 + undefined is NaN.' },
              { t: '75', ok: false, why: '75 is at index 2.' },
              { t: '0', ok: false, why: 'JavaScript doesn\'t fill missing items with 0.' }
            ] },
          classify('logic', 'No crash. Reading a missing array item just gives undefined, and the math quietly becomes NaN.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: 'Use <code>i &lt; scores.length</code>', ok: true, why: 'Now i goes 0, 1, 2 and stops.' },
              { t: 'Start at <code>i = 1</code>', ok: false, why: 'Then it skips 88 and still reads index 3.' },
              { t: 'Use <code>i &lt;= scores.length - 2</code>', ok: false, why: 'That stops at 1 and misses 75.' }
            ] }
        ],
        fixed: 'const scores = [88, 92, 75];\nlet total = 0;\nfor (let i = 0; i < scores.length; i++) {\n  total = total + scores[i];\n}\nconsole.log(total);',
        explain: {
          prompt: 'Explain this off-by-one bug. How could <code>for...of</code> avoid it entirely?',
          minWords: 15,
          keywords: [{ label: '<= goes one past the end', any: ['<=', 'one too', 'past the end', 'index 3', 'extra'] }, { label: 'undefined makes NaN', any: ['undefined', 'nan'] }, { label: 'for...of has no index to get wrong', any: ['for...of', 'for of', 'no index', 'each item'] }],
          model: 'With <=, i reaches 3, but the last index is 2, so scores[3] is undefined and the total becomes NaN. Using < fixes it. A for...of loop visits each item directly with no index to manage, so this mistake can\'t happen.'
        },
        takeaway: 'Use < length, or skip indexes with for...of.'
      },
      {
        id: 'L6-4', type: 'build', skill: 'build',
        title: 'Build: Average Score',
        intro: '<p>Write <code>averageScore(scores)</code> that returns the average of an array of numbers. If the array is empty, return <code>0</code>.</p>',
        plan: [
          { kind: 'mcq', q: 'Without special handling, what would an average of <code>[]</code> calculate?',
            options: [
              { t: '0 ÷ 0, which is NaN', ok: true, why: 'Sum 0, count 0. That\'s why the requirement says to return 0: someone had to decide.' },
              { t: '0', ok: false, why: 'Only if you handle it. The raw math is 0 / 0.' },
              { t: 'An error', ok: false, why: 'JavaScript doesn\'t crash on 0 / 0; it gives NaN.' }
            ] },
          { kind: 'mcq', q: 'Which plan works?',
            options: [
              { t: 'If empty, return 0. Otherwise add every score, then divide by the number of scores', ok: true, why: 'Handle the edge case first, then the normal case.' },
              { t: 'Add the first and last score and divide by 2', ok: false, why: 'That ignores everything in the middle.' },
              { t: 'Return the middle item', ok: false, why: 'That\'s the median, not the average.' }
            ] }
        ],
        starter: 'function averageScore(scores) {\n\n}\n\nconsole.log(averageScore([80, 90, 100])); // 90\n',
        expectReturn: 'averageScore',
        tests: [
          { expr: 'averageScore([80, 90, 100])', expect: 90 }, { expr: 'averageScore([50])', expect: 50 },
          { expr: 'averageScore([1, 2])', expect: 1.5 }, { expr: 'averageScore([])', expect: 0 }
        ],
        hints: [
          'Restate it: the average is the sum divided by the count, except for an empty list.',
          'Check the edge case first: <code>if (scores.length === 0) return 0;</code>',
          'Sum with an accumulator: <code>let total = 0; for (const s of scores) { total += s; }</code>, then <code>return total / scores.length;</code>'
        ],
        solution: 'function averageScore(scores) {\n  if (scores.length === 0) {\n    return 0;\n  }\n  let total = 0;\n  for (const score of scores) {\n    total += score;\n  }\n  return total / scores.length;\n}\n\nconsole.log(averageScore([80, 90, 100]));',
        solutionQuestions: [
          { kind: 'mcq', q: 'In the AI\'s solution, why is the empty-array check at the top?',
            options: [
              { t: 'It handles the special case first, so the rest of the function can assume there\'s at least one score', ok: true, why: 'This “guard clause” pattern keeps the main logic simple.' },
              { t: 'All if statements must go at the top', ok: false, why: 'There\'s no such rule; it\'s a design choice.' },
              { t: 'To make the function faster', ok: false, why: 'It\'s about correctness, not speed.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your function works, including how it handles an empty array and why that matters.',
          minWords: 15,
          keywords: [{ label: 'Handles the empty case', any: ['empty', 'length === 0', '0', 'nan'] }, { label: 'Sums with a loop', any: ['sum', 'total', 'add', 'loop'] }, { label: 'Divides by the count', any: ['divide', 'length', 'count'] }],
          model: 'First it checks for an empty array and returns 0, because otherwise it would divide 0 by 0 and return NaN. For a normal array it adds every score into total with a loop, then divides by the number of scores.'
        },
        ways: [
          { topic: 'Adding up the scores', forms: [
            { code: 'let total = 0;\nfor (const score of scores) {\n  total += score;\n}', note: '<code>for...of</code>: visits each score directly.' },
            { code: 'let total = 0;\nfor (let i = 0; i < scores.length; i++) {\n  total += scores[i];\n}', note: 'Classic indexed loop. Use it when you need the position <code>i</code>. Watch the <code>&lt;</code> (Level 6\'s One Step Too Far bug).' },
            { code: 'const total = scores.reduce((sum, score) => sum + score, 0);', note: '<code>reduce</code> folds a list into one value. Very common in AI answers. The <code>0</code> is the starting total, which also makes an empty list safe.' }
          ] }
        ],
        takeaway: 'Handle edge cases on purpose, before the main logic.'
      },
      {
        id: 'L6-5', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 3,
        title: 'Bug Hunt: The Third Player',
        symptom: '<code>TypeError: Cannot read properties of undefined (reading \'toUpperCase\')</code>',
        code: 'const players = ["Mo", "Lee"];\nconst third = players[2];\nconsole.log(third.toUpperCase());',
        questions: [
          { kind: 'line', q: 'Which line <strong>throws</strong> the error?', answer: 3, why: 'Calling <code>.toUpperCase()</code> on undefined crashes.' },
          { kind: 'line', q: 'Which line is the real <strong>cause</strong>?', answer: 2, why: 'There are only 2 players (indexes 0 and 1). <code>players[2]</code> quietly gives undefined.' },
          classify('runtime', 'The program crashes partway through, on line 3.'),
          { kind: 'mcq', q: 'Which fix is best?',
            options: [
              { t: 'Use the right index (players[1] for the last player), or check that the item exists before using it', ok: true, why: 'Decide what the code <em>meant</em>, then either correct it or guard against a missing value.' },
              { t: 'Wrap line 3 in try/catch and ignore the error', ok: false, why: 'That hides the bug instead of fixing it.' },
              { t: 'Add a third player so the code works', ok: false, why: 'That only fixes this exact data, not the code.' }
            ] }
        ],
        fixed: 'const players = ["Mo", "Lee"];\nconst last = players[players.length - 1];\nif (last !== undefined) {\n  console.log(last.toUpperCase());\n}',
        explain: {
          prompt: 'Explain why the error message mentions <code>undefined</code> when the code never typed the word undefined.',
          minWords: 12,
          keywords: [{ label: 'Index 2 doesn\'t exist', any: ['index', '[2]', 'two players', 'only 2', "doesn't exist", 'missing'] }, { label: 'Missing items give undefined', any: ['undefined'] }, { label: 'Can\'t call methods on undefined', any: ['method', 'touppercase', 'call', 'crash'] }],
          model: 'There\'s no item at index 2 because the array only has two players, so players[2] gives undefined instead of an error. The crash comes a line later, when the code tries to call toUpperCase on that undefined value.'
        },
        takeaway: 'Missing data fails quietly first and loudly later. Trace back.'
      },
      {
        id: 'L6-6', type: 'quiz', variant: 'judge', skill: 'explain',
        title: 'Judge the AI: High Score',
        ai: 'Write a function that returns the highest score in an array. Scores can be negative (it\'s a golf-style game).',
        code: 'function highScore(scores) {\n  let max = 0;\n  for (const s of scores) {\n    if (s > max) {\n      max = s;\n    }\n  }\n  return max;\n}\nconsole.log(highScore([40, 95, 72]));\nconsole.log(highScore([-5, -2, -9]));',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'Predict what the second call prints.', answer: ['0'], why: 'No score is greater than 0, so max never changes. But 0 isn\'t even in the list!', miss: 'Start with max = 0. Is −5 > 0? Is −2 > 0?' },
          { kind: 'mcq', q: 'What\'s wrong?',
            options: [
              { t: 'Starting max at 0 assumes at least one score is positive', ok: true, why: 'The prompt even warned that scores can be negative. The AI ignored that requirement.' },
              { t: 'The loop skips the first score', ok: false, why: 'for...of visits every score.' },
              { t: 'Nothing: 0 is the highest', ok: false, why: '0 isn\'t one of the scores. The answer should be −2.' }
            ] },
          { kind: 'line', q: 'Which line needs to change?', answer: 2, why: 'The starting value is the problem.' },
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: '<code>let max = scores[0];</code>: start with a real score', ok: true, why: 'Then max is always one of the actual values. (Or use <code>-Infinity</code>, or <code>Math.max(...scores)</code>.)' },
              { t: '<code>let max = -1;</code>', ok: false, why: 'Still fails if every score is below −1.' },
              { t: '<code>let max = 100;</code>', ok: false, why: 'Then nothing ever beats 100 and it always returns 100.' }
            ] },
          { kind: 'mcq', q: 'What test would have caught this before it shipped?',
            options: [
              { t: 'An array where every score is negative', ok: true, why: 'Test the requirement you were explicitly told about.' },
              { t: '[40, 95, 72] again', ok: false, why: 'That already passes, so it can\'t reveal the bug.' },
              { t: 'A very long array', ok: false, why: 'Length isn\'t the issue; the sign of the numbers is.' }
            ] }
        ],
        explain: {
          prompt: 'The AI\'s code passed the first example. Explain the bug, and what that teaches you about testing AI code.',
          minWords: 15,
          keywords: [{ label: 'Starting at 0 is the bug', any: ['0', 'zero', 'start'] }, { label: 'Negative scores never beat it', any: ['negative'] }, { label: 'Test the stated requirements / edge cases', any: ['test', 'edge', 'requirement', 'prompt', 'case'] }],
          model: 'max starts at 0, so when every score is negative none of them is greater, and it returns 0, a number that isn\'t even in the list. The fix is to start with scores[0]. The prompt said scores can be negative, but the AI ignored it, so I should always test the specific requirements and edge cases I gave it.'
        },
        takeaway: 'Test the edge case you told the AI about. It may have ignored you.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L7', title: 'Objects',
    blurb: 'Group related data into objects, work with lists of objects, and learn why copying is trickier than it looks.',
    concepts: ['properties', 'methods', 'this', 'arrays of objects', 'references', 'spread'],
    challenges: [
      {
        id: 'L7-1', type: 'quiz', variant: 'learn', skill: 'understand',
        title: 'Bundles of Data',
        intro: '<p>An <strong>object</strong> groups related values under names (<strong>properties</strong>): <code>{ name: "Rook", health: 80 }</code>. Read them with a dot (<code>hero.health</code>) or brackets (<code>hero["health"]</code>). A function stored in an object is a <strong>method</strong>; inside it, <code>this</code> means “the object this was called on.”</p>',
        code: 'const hero = {\n  name: "Rook",\n  health: 80,\n  items: ["torch"],\n  heal(amount) {\n    this.health = this.health + amount;\n  }\n};\nhero.heal(15);\nhero.items.push("rope");\nconsole.log(hero.health);\nconsole.log(hero.items.length);\nconsole.log(hero["name"]);',
        questions: [
          { kind: 'text', q: 'What does line 11 print?', answer: ['95'], why: 'heal(15) adds 15 to 80.' },
          { kind: 'mcq', q: 'Inside <code>heal</code>, what is <code>this</code>?',
            options: [
              { t: 'The hero object: the object heal was called on', ok: true, why: '<code>hero.heal(15)</code> means “run heal with this = hero.”' },
              { t: 'The heal function', ok: false, why: 'this refers to the object, not the method.' },
              { t: 'The number 15', ok: false, why: '15 is the <code>amount</code> parameter.' }
            ] },
          { kind: 'mcq', q: 'Wait, <code>hero</code> is a <code>const</code>. How can its health change?',
            options: [
              { t: 'const stops you from replacing the whole object, not from changing what\'s inside it', ok: true, why: '<code>hero = {}</code> would crash; <code>hero.health = 95</code> is fine.' },
              { t: 'Methods are allowed to break the rules', ok: false, why: 'Line 10 changes items without any method.' },
              { t: 'It\'s a bug in JavaScript', ok: false, why: 'It\'s how const works for objects and arrays.' }
            ] }
        ],
        takeaway: 'const protects the variable, not the contents of the object.'
      },
      {
        id: 'L7-2', type: 'quiz', variant: 'predict', skill: 'explain',
        title: 'Predict the Output: Shopping Cart',
        code: 'const cart = [\n  { name: "pen", price: 2, qty: 3 },\n  { name: "pad", price: 5, qty: 1 }\n];\nlet total = 0;\nfor (const line of cart) {\n  total += line.price * line.qty;\n}\nconsole.log(total);\nconsole.log(cart[1].name);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What does line 9 print?', answer: ['11'], why: '2 × 3 = 6 for pens, 5 × 1 = 5 for the pad. 6 + 5 = 11.' },
          { kind: 'text', q: 'What does line 10 print?', answer: ['pad'], why: 'cart[1] is the second object; its name is "pad".' },
          { kind: 'mcq', q: 'What does <code>total += x</code> mean?',
            options: [
              { t: 'The same as <code>total = total + x</code>', ok: true, why: 'A shortcut for updating an accumulator.' },
              { t: 'Compare total to x', ok: false, why: 'Comparison uses <code>===</code>.' },
              { t: 'Set total to x', ok: false, why: 'That would be <code>total = x</code>.' }
            ] }
        ],
        takeaway: 'Loop over objects, read their properties, accumulate.'
      },
      {
        id: 'L7-3', type: 'build', skill: 'build',
        title: 'Build: Low Stock Alert',
        intro: '<p>The store wants a reorder list. Write <code>lowStock(items, threshold)</code> that returns an array of the <strong>names</strong> of products whose <code>stock</code> is <strong>below</strong> the threshold.</p>',
        plan: [
          { kind: 'text', q: 'By hand: with the sample products and a threshold of 3, which names should be returned? (comma-separated)', answer: ['Mug, Pin', 'Mug,Pin'], why: 'Mug (2) and Pin (0) are below 3. Cap (10) isn\'t.' },
          { kind: 'mcq', q: 'What should the function return, exactly?',
            options: [
              { t: 'An array of name strings, like <code>["Mug", "Pin"]</code>', ok: true, why: 'Read the requirement carefully: names, not whole objects.' },
              { t: 'The product objects themselves', ok: false, why: 'Close, but the requirement says names.' },
              { t: 'The number of low-stock products', ok: false, why: 'That\'s a count, not a list.' }
            ] }
        ],
        starter: 'const products = [\n  { name: "Mug", stock: 2 },\n  { name: "Cap", stock: 10 },\n  { name: "Pin", stock: 0 }\n];\n\n// lowStock(products, 3) should return ["Mug", "Pin"]\nfunction lowStock(items, threshold) {\n\n}\n\nconsole.log(lowStock(products, 3));\n',
        expectReturn: 'lowStock',
        tests: [
          { expr: 'lowStock(products, 3)', expect: ['Mug', 'Pin'] }, { expr: 'lowStock(products, 1)', expect: ['Pin'] },
          { expr: 'lowStock(products, 0)', expect: [] }, { expr: 'lowStock([], 5)', expect: [] }
        ],
        hints: [
          'Restate it: keep some products (which?), then turn each one into just its name.',
          'Keeping some items is a job for <code>filter</code>: <code>items.filter(p =&gt; p.stock &lt; threshold)</code>',
          'Turning each item into something else is a job for <code>map</code>: <code>.map(p =&gt; p.name)</code>. You can chain them.'
        ],
        solution: 'const products = [\n  { name: "Mug", stock: 2 },\n  { name: "Cap", stock: 10 },\n  { name: "Pin", stock: 0 }\n];\n\nfunction lowStock(items, threshold) {\n  return items\n    .filter(item => item.stock < threshold)\n    .map(item => item.name);\n}\n\nconsole.log(lowStock(products, 3));',
        solutionQuestions: [
          { kind: 'mcq', q: 'What does the AI\'s <code>.filter(...)</code> give to <code>.map(...)</code>?',
            options: [
              { t: 'A new array containing only the low-stock product objects', ok: true, why: 'Each step hands its result to the next, like an assembly line.' },
              { t: 'The original products array', ok: false, why: 'filter returns a new, smaller array.' },
              { t: 'An array of names', ok: false, why: 'Names only appear after map.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your function builds the reorder list.',
          minWords: 15,
          keywords: [{ label: 'Keeps only low-stock items', any: ['filter', 'keep', 'below', 'less than', '<', 'if'] }, { label: 'Turns them into names', any: ['map', 'name', 'push'] }, { label: 'Returns a new array', any: ['return', 'array', 'list'] }],
          model: 'It goes through every product and keeps only the ones whose stock is less than the threshold (filter). Then it turns each of those objects into just its name (map) and returns that new array. An empty list or a threshold of 0 naturally gives back an empty array.'
        },
        ways: [
          { topic: 'Building the reorder list', forms: [
            { code: 'return items\n  .filter(item => item.stock < threshold)\n  .map(item => item.name);', note: 'Chain <code>filter</code> then <code>map</code>. Each step does one job.' },
            { code: 'const names = [];\nfor (const item of items) {\n  if (item.stock < threshold) {\n    names.push(item.name);\n  }\n}\nreturn names;', note: 'A loop with <code>push</code>. More lines, but every step is explicit, which some teams prefer.' }
          ] }
        ],
        takeaway: 'filter then map: choose the items, then shape them.'
      },
      {
        id: 'L7-4', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 3,
        title: 'Bug Hunt: The Silent Typo',
        symptom: 'The order total should be <code>45</code>. It prints <code>NaN</code>, and there\'s no error message at all.',
        code: 'const order = { subtotal: 40, shipping: 5 };\nconst total = order.subtotal + order.shiping;\nconsole.log(total);',
        questions: [
          { kind: 'line', q: 'Which line has the bug?', answer: 2, why: '<code>shiping</code> is missing a “p”.' },
          classify('logic', 'Surprising but true: reading a property that doesn\'t exist isn\'t an error in JavaScript. You just get undefined, and 40 + undefined is NaN.'),
          { kind: 'mcq', q: 'Why didn\'t JavaScript warn you?',
            options: [
              { t: 'Objects can have any property; asking for a missing one just returns undefined', ok: true, why: 'This is why editor autocomplete, linters and TypeScript are popular: they catch typos JavaScript lets through.' },
              { t: 'Because it\'s a const', ok: false, why: 'const has nothing to do with property names.' },
              { t: 'It did warn: the NaN is the warning', ok: false, why: 'NaN is a clue, but it\'s not an error message. Nothing stopped the program.' }
            ] },
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: '<code>order.subtotal + order.shipping</code>', ok: true, why: 'Spell it exactly as it was defined.' },
              { t: 'Add <code>shiping: 5</code> to the object', ok: false, why: 'Now there are two names for the same thing: a future bug waiting to happen.' },
              { t: '<code>Number(order.shiping)</code>', ok: false, why: 'Number(undefined) is still NaN.' }
            ] }
        ],
        fixed: 'const order = { subtotal: 40, shipping: 5 };\nconst total = order.subtotal + order.shipping;\nconsole.log(total);',
        explain: {
          prompt: 'Explain the bug and why it\'s harder to find than a crash.',
          minWords: 12,
          keywords: [{ label: 'Misspelled property', any: ['typo', 'spell', 'shiping', 'missing p'] }, { label: 'Gives undefined → NaN', any: ['undefined', 'nan'] }, { label: 'No error message', any: ['no error', 'silent', 'quiet', 'no warning', "doesn't crash"] }],
          model: 'shipping is misspelled as shiping, so it reads a property that doesn\'t exist and gets undefined; 40 + undefined is NaN. It\'s harder than a crash because there\'s no error message pointing at the line, so you have to notice the NaN and trace it back.'
        },
        takeaway: 'Missing properties don\'t crash; they return undefined. NaN is your clue.'
      },
      {
        id: 'L7-5', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 4,
        title: 'Bug Hunt: Settings That Spread',
        symptom: 'A player turned their volume to 10, and the <em>default</em> settings changed too. <code>defaultSettings.volume</code> prints <code>10</code>, not <code>5</code>.',
        code: 'const defaultSettings = { volume: 5, music: true };\nconst playerSettings = defaultSettings;\nplayerSettings.volume = 10;\nconsole.log(defaultSettings.volume);',
        questions: [
          { kind: 'line', q: 'Which line causes the problem?', answer: 2, why: 'This line doesn\'t copy the object.' },
          { kind: 'mcq', q: 'What does line 2 actually do?',
            options: [
              { t: 'It makes <code>playerSettings</code> a second name for the <em>same</em> object', ok: true, why: 'Variables hold a reference (an arrow) to an object. Now two arrows point at one object.' },
              { t: 'It copies the object', ok: false, why: 'If it were a copy, changing one wouldn\'t affect the other.' },
              { t: 'It locks defaultSettings', ok: false, why: 'Nothing is locked; that\'s the problem.' }
            ] },
          classify('logic', 'Nothing crashes. The program does exactly what it says; it just isn\'t what was meant.'),
          { kind: 'mcq', q: 'Which fix makes a real copy?',
            options: [
              { t: '<code>const playerSettings = { ...defaultSettings };</code>', ok: true, why: 'Spread (<code>...</code>) copies every property into a brand-new object.' },
              { t: '<code>let playerSettings = defaultSettings;</code>', ok: false, why: 'let vs const doesn\'t matter; it\'s still the same object.' },
              { t: '<code>const playerSettings = defaultSettings.volume;</code>', ok: false, why: 'That copies just the number 5, not the settings object.' }
            ] }
        ],
        fixed: 'const defaultSettings = { volume: 5, music: true };\nconst playerSettings = { ...defaultSettings };\nplayerSettings.volume = 10;\nconsole.log(defaultSettings.volume);',
        explain: {
          prompt: 'Explain the difference between “two variables pointing at one object” and “a copy.” Why does it matter in a game?',
          minWords: 15,
          keywords: [{ label: 'Same object / reference', any: ['same object', 'reference', 'point', 'alias', 'same thing'] }, { label: 'A copy is independent', any: ['copy', 'spread', '...', 'new object', 'separate'] }, { label: 'Consequence in the game', any: ['default', 'other player', 'everyone', 'reset', 'affect'] }],
          model: 'Line 2 doesn\'t copy anything: both variables point at the same object, so changing one changes the other. Spread creates a new, separate object. In a game it matters because changing one player\'s settings would silently change the defaults for everyone who starts later.'
        },
        takeaway: '= on an object shares it. Use spread to copy.'
      },
      {
        id: 'L7-6', type: 'quiz', variant: 'ai', skill: 'explain',
        title: 'Read the AI\'s Code: Leaderboard',
        ai: 'Show the player names ranked from highest to lowest score, without changing the original list.',
        code: 'const players = [\n  { name: "Ava", score: 120 },\n  { name: "Ben", score: 95 },\n  { name: "Cy", score: 140 }\n];\nconst ranked = [...players].sort((a, b) => b.score - a.score);\nconst names = ranked.map(p => p.name);\nconsole.log(names.join(", "));\nconsole.log(players[0].name);',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'What does line 8 print?', answer: ['Cy, Ava, Ben'], why: 'Sorted high to low: 140, 120, 95.' },
          { kind: 'text', q: 'What does line 9 print?', answer: ['Ava'], why: 'The original list wasn\'t changed, so Ava is still first.' },
          { kind: 'mcq', q: 'Why does the AI write <code>[...players].sort(...)</code> instead of <code>players.sort(...)</code>?',
            options: [
              { t: '<code>sort</code> rearranges the array it\'s called on, so the AI copies it first to keep the original intact', ok: true, why: 'That\'s exactly the “without changing the original list” requirement.' },
              { t: 'Spread makes sorting faster', ok: false, why: 'It\'s about not changing the original.' },
              { t: 'sort doesn\'t work without spread', ok: false, why: 'It works; it just changes the original.' }
            ] },
          { kind: 'mcq', q: 'What does <code>(a, b) =&gt; b.score - a.score</code> tell sort?',
            options: [
              { t: 'Put the higher score first (descending order)', ok: true, why: 'A positive result means “b goes before a.” Swapping to a.score − b.score would sort low to high.' },
              { t: 'Subtract all the scores', ok: false, why: 'It compares two players at a time.' },
              { t: 'Sort alphabetically by name', ok: false, why: 'It only looks at score.' }
            ] }
        ],
        explain: {
          prompt: 'Explain, line by line, how this code produces the ranked list, and how it satisfies “without changing the original list.”',
          minWords: 20,
          keywords: [{ label: 'Copies with spread', any: ['copy', 'spread', '...'] }, { label: 'Sorts by score, high to low', any: ['sort', 'descending', 'highest', 'b.score'] }, { label: 'map to names, join for display', any: ['map', 'name', 'join'] }, { label: 'Original unchanged', any: ['original', 'unchanged', 'ava'] }],
          model: 'It copies the players array with spread, then sorts the copy using b.score − a.score so the highest score comes first. map pulls out just the names, and join turns them into “Cy, Ava, Ben”. Because only the copy was sorted, players[0] is still Ava, which proves the original list wasn\'t changed.'
        },
        takeaway: 'Know which methods change their array (sort, push) and which make new ones (map, filter).'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L8', title: 'Business Systems: Model the Problem',
    blurb: 'Turn real business rules into code: clarify requirements, model data, handle money carefully, and judge AI against the spec.',
    concepts: ['requirements', 'data modeling', 'money & rounding', 'mutation', 'named constants'],
    challenges: [
      {
        id: 'L8-1', type: 'quiz', variant: 'plan', skill: 'understand',
        title: 'Montana Bike Rentals: The Spec',
        intro: '<p>A bike shop near campus wants a price calculator. The owner\'s rules:</p><ul><li>Bikes are <strong>$15 per hour</strong>.</li><li>The rental charge is <strong>capped at $60</strong> per day.</li><li>Members get <strong>20% off the rental charge</strong>, applied after the cap.</li><li>A helmet is a flat <strong>$3</strong>, never discounted.</li></ul>',
        questions: [
          { kind: 'mcq', q: 'What\'s the best way to represent one rental in code?',
            options: [
              { t: 'An object: <code>{ hours: 5, helmet: true, member: true }</code>', ok: true, why: 'One value holding everything about this rental, with named parts.' },
              { t: 'Three unrelated variables', ok: false, why: 'That works for one rental, but gets messy with many.' },
              { t: 'A string like <code>"5 hours, helmet, member"</code>', ok: false, why: 'Then every function has to pick the text apart.' }
            ] },
          { kind: 'text', q: 'By hand: <strong>5 hours, helmet, member</strong>. What\'s the total?', answer: ['51', '51.00'], why: '5 × $15 = $75, capped to $60. Members get 20% off: $48. Plus the $3 helmet: $51.', miss: 'Step by step: hours × 15, then the cap, then the discount, then the helmet.' },
          { kind: 'mcq', q: 'At first the owner only said “members get 20% off” but not whether it was before or after the cap. Why does that matter?',
            options: [
              { t: 'It changes the price: discount first gives $75 × 0.8 = $60 (then capped → $60); cap first gives $60 × 0.8 = $48', ok: true, why: 'Same rules, different order, different money. Ambiguity in a spec turns into bugs in code.' },
              { t: 'It doesn\'t matter: math is math', ok: false, why: 'Work out both orders. They differ by $12.' },
              { t: 'It only matters for members renting under an hour', ok: false, why: 'It matters whenever the cap is reached.' }
            ] },
          { kind: 'mcq', q: 'Which prompt gives an AI assistant enough to build this correctly?',
            options: [
              { t: 'One that lists all four rules (including “discount after the cap”), describes the input object, and gives the 5-hour example = $51', ok: true, why: 'Complete rules plus a worked example. You can check its output against $51.' },
              { t: '“Write a bike rental price calculator.”', ok: false, why: 'The AI will invent its own rules.' },
              { t: '“Calculate bike rental prices with discounts.”', ok: false, why: 'Which discounts? Before or after what?' }
            ] }
        ],
        explain: {
          prompt: 'Write the steps your program should follow, in order, in plain English (pseudocode). No code needed.',
          minWords: 20,
          keywords: [{ label: 'Hours × $15', any: ['15', 'hour', 'multipl'] }, { label: 'Cap at $60', any: ['60', 'cap', 'limit', 'maximum', 'max', 'min'] }, { label: 'Member discount after the cap', any: ['member', 'discount', '20', '0.8'] }, { label: 'Add helmet last', any: ['helmet', '3'] }],
          model: '1) Multiply hours by $15. 2) If that\'s more than $60, use $60 instead. 3) If they\'re a member, take 20% off that rental charge. 4) If they want a helmet, add $3. 5) Return the total.'
        },
        takeaway: 'Write the steps in order before writing code. Order is part of the requirement.'
      },
      {
        id: 'L8-2', type: 'build', skill: 'build',
        title: 'Build: Rental Price',
        intro: '<p>Implement the spec from the last challenge as <code>rentalCost(rental)</code>, where <code>rental</code> is an object like <code>{ hours: 5, helmet: true, member: true }</code>.</p><ul><li>$15 per hour, rental charge capped at $60</li><li>Members: 20% off the rental charge, after the cap</li><li>Helmet: $3 flat, never discounted</li></ul>',
        starter: '// rental looks like: { hours: 5, helmet: true, member: true }\nfunction rentalCost(rental) {\n\n}\n\nconsole.log(rentalCost({ hours: 5, helmet: true, member: true })); // 51\n',
        expectReturn: 'rentalCost',
        tests: [
          { expr: 'rentalCost({ hours: 2, helmet: false, member: false })', expect: 30, approx: true, label: '2 hours → 30' },
          { expr: 'rentalCost({ hours: 5, helmet: false, member: false })', expect: 60, approx: true, label: '5 hours (capped) → 60' },
          { expr: 'rentalCost({ hours: 5, helmet: true, member: true })', expect: 51, approx: true, label: '5 hours, helmet, member → 51' },
          { expr: 'rentalCost({ hours: 1, helmet: true, member: false })', expect: 18, approx: true, label: '1 hour + helmet → 18' },
          { expr: 'rentalCost({ hours: 3, helmet: false, member: true })', expect: 36, approx: true, label: '3 hours, member → 36' },
          { expr: 'rentalCost({ hours: 0, helmet: false, member: false })', expect: 0, approx: true, label: '0 hours → 0' }
        ],
        hints: [
          'Follow your pseudocode from the last challenge, one step per line.',
          'For the cap: <code>Math.min(rental.hours * 15, 60)</code>, whichever is smaller.',
          'Use <code>let</code> for the running charge so each step can update it. Consider naming the numbers: <code>const HOURLY_RATE = 15;</code>'
        ],
        solution: 'const HOURLY_RATE = 15;\nconst DAILY_CAP = 60;\nconst MEMBER_DISCOUNT = 0.2;\nconst HELMET_FEE = 3;\n\nfunction rentalCost(rental) {\n  let charge = Math.min(rental.hours * HOURLY_RATE, DAILY_CAP);\n  if (rental.member) {\n    charge = charge * (1 - MEMBER_DISCOUNT);\n  }\n  if (rental.helmet) {\n    charge = charge + HELMET_FEE;\n  }\n  return charge;\n}\n\nconsole.log(rentalCost({ hours: 5, helmet: true, member: true }));',
        solutionQuestions: [
          { kind: 'mcq', q: 'Why does the AI put 15, 60, 0.2 and 3 in named constants?',
            options: [
              { t: 'When prices change there\'s one obvious place to update, and the names explain what each number means', ok: true, why: 'Unnamed “magic numbers” are a common code review comment.' },
              { t: 'JavaScript requires numbers to be in constants', ok: false, why: 'It doesn\'t; this is about readability and maintenance.' },
              { t: 'It makes the code run faster', ok: false, why: 'No meaningful difference.' }
            ] },
          { kind: 'mcq', q: 'The owner changes the rule: members now get 20% off the helmet too. What\'s the smallest correct change to the AI\'s code?',
            options: [
              { t: 'Move the helmet <code>if</code> above the member discount <code>if</code>', ok: true, why: 'Then the helmet fee is part of the charge before the discount is applied. The order of steps encodes the business rule.' },
              { t: 'Change <code>HELMET_FEE</code> to 2.4', ok: false, why: 'That would discount the helmet for non-members too.' },
              { t: 'Rewrite the whole function', ok: false, why: 'Because each rule is its own step, only the order needs to change.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your code follows the spec, step by step, and how you made sure the discount happens after the cap.',
          minWords: 20,
          keywords: [{ label: 'Hourly charge', any: ['15', 'hour'] }, { label: 'Cap', any: ['cap', '60', 'math.min', 'min', 'limit'] }, { label: 'Discount after cap', any: ['after', 'member', 'discount', '0.8', '20'] }, { label: 'Helmet added, not discounted', any: ['helmet', '3'] }],
          model: 'It multiplies hours by 15 and uses Math.min to cap it at 60. Then, only if they\'re a member, it takes 20% off that capped charge. Doing the cap first is what makes the discount apply after the cap. Finally it adds the $3 helmet fee, after the discount, so the helmet is never discounted.'
        },
        takeaway: 'Code that mirrors the spec step by step is easy to check against it.'
      },
      {
        id: 'L8-3', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 4,
        title: 'Bug Hunt: The Thirty-Three Cents',
        symptom: 'Three friends split a $100 bill. The receipt says: <code>Each pays $33.333333333333336</code>',
        code: 'function splitBill(total, people) {\n  return total / people;\n}\nconst share = splitBill(100, 3);\nconsole.log("Each pays $" + share);',
        questions: [
          { kind: 'line', q: 'Where would you fix this?', answer: [2, 5], why: 'Either round the amount when it\'s calculated (line 2) or when it\'s displayed (line 5). For money, rounding the calculation is usually safer.' },
          classify('logic', 'No crash, just a result no business can charge. Computers store most decimals approximately, so money needs deliberate rounding.'),
          { kind: 'mcq', q: 'Which fix is right?',
            options: [
              { t: '<code>return Math.round((total / people) * 100) / 100;</code>', ok: true, why: 'Rounds to whole cents: 33.33.' },
              { t: '<code>return Math.floor(total / people);</code>', ok: false, why: 'That gives $33 each, so the restaurant is short $1.' },
              { t: 'Nothing: computers are exact', ok: false, why: 'That trailing …336 shows they aren\'t, for decimals.' }
            ] },
          { kind: 'mcq', q: 'After rounding, 3 × $33.33 = $99.99. What about the missing cent?',
            options: [
              { t: 'That\'s a business decision (e.g. one person pays $33.34). Ask the stakeholder; code can\'t decide alone', ok: true, why: 'Real payment systems have explicit rules for leftover cents.' },
              { t: 'Ignore it: it\'s only a cent', ok: false, why: 'Across thousands of bills, missing cents add up, and the books won\'t balance.' },
              { t: 'Round up for everyone', ok: false, why: 'Then the restaurant collects $100.02. Overcharging is a problem too.' }
            ] }
        ],
        fixed: 'function splitBill(total, people) {\n  return Math.round((total / people) * 100) / 100;\n}\nconst share = splitBill(100, 3);\nconsole.log("Each pays $" + share.toFixed(2));',
        explain: {
          prompt: 'Explain the bug, the fix, and the business question it raises.',
          minWords: 18,
          keywords: [{ label: 'Decimals are approximate', any: ['decimal', 'float', 'approximate', 'precise', 'exact'] }, { label: 'Round to cents', any: ['round', 'cent'] }, { label: 'Leftover cent needs a business rule', any: ['cent', 'business', 'ask', 'decide', 'leftover', 'remainder', '99.99'] }],
          model: '100 ÷ 3 doesn\'t come out even, and computers store decimals approximately, so it prints a long ugly number. Rounding to cents fixes the display, but then 3 × 33.33 is 99.99. Someone in the business has to decide who pays the extra cent, and the code should follow that rule, not guess.'
        },
        takeaway: 'Money needs explicit rounding, and explicit rules for leftovers.'
      },
      {
        id: 'L8-4', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 4,
        title: 'Bug Hunt: The Shrinking Prices',
        symptom: 'Every time the sale receipt is generated, the store\'s real prices drop. After two receipts, the Helmet\'s original price shows <code>32.4</code> instead of <code>40</code>.',
        code: 'const cart = [\n  { item: "Helmet", price: 40 },\n  { item: "Lock", price: 20 }\n];\nfunction applySale(items) {\n  for (const entry of items) {\n    entry.price = entry.price * 0.9;\n  }\n  return items;\n}\nconst saleCart = applySale(cart);\nconst receiptAgain = applySale(cart);\nconsole.log(cart[0].price);',
        questions: [
          { kind: 'line', q: 'Which line changes data it shouldn\'t?', answer: 7, why: '<code>entry</code> isn\'t a copy; it\'s the actual object inside <code>cart</code>.' },
          { kind: 'mcq', q: 'Why is the original cart affected?',
            options: [
              { t: 'Each <code>entry</code> refers to the same object stored in <code>cart</code>, so changing it changes the cart', ok: true, why: 'Same idea as the settings bug in Level 7, now inside a function. This is called mutation.' },
              { t: 'Because applySale returns items', ok: false, why: 'Returning is fine. The change happened before the return.' },
              { t: 'Because 0.9 is a magic number', ok: false, why: 'Naming it would help readability, but wouldn\'t fix this.' }
            ] },
          classify('logic', 'No crash. Data is quietly corrupted: the most expensive kind of bug in business software.'),
          { kind: 'mcq', q: 'Which fix is best?',
            options: [
              { t: '<code>return items.map(e =&gt; ({ ...e, price: e.price * 0.9 }));</code>', ok: true, why: 'Builds brand-new objects with the sale price. The original cart is never touched.' },
              { t: 'Only call applySale once', ok: false, why: 'Even once, it permanently changes the store\'s real prices.' },
              { t: 'Change <code>const entry</code> to <code>let entry</code>', ok: false, why: 'Still the same objects.' }
            ] }
        ],
        fixed: 'const cart = [\n  { item: "Helmet", price: 40 },\n  { item: "Lock", price: 20 }\n];\nfunction applySale(items) {\n  return items.map(entry => ({ ...entry, price: entry.price * 0.9 }));\n}\nconst saleCart = applySale(cart);\nconst receiptAgain = applySale(cart);\nconsole.log(cart[0].price);',
        explain: {
          prompt: 'Explain the bug to a store manager who doesn\'t code, then to a developer.',
          minWords: 20,
          keywords: [{ label: 'Changes the original prices', any: ['original', 'real price', 'cart', 'permanent'] }, { label: 'Mutation / same object', any: ['mutat', 'same object', 'reference', 'not a copy'] }, { label: 'Return new objects instead', any: ['new', 'copy', 'map', 'spread'] }],
          model: 'Manager: printing a sale receipt was secretly lowering the store\'s real prices, a bit more each time. Developer: the loop variable entry refers to the same objects stored in cart, so assigning entry.price mutates the original data. Returning new objects with map and spread keeps the cart unchanged.'
        },
        takeaway: 'Functions that calculate shouldn\'t secretly change their inputs.'
      },
      {
        id: 'L8-5', type: 'quiz', variant: 'judge', skill: 'explain',
        title: 'Judge the AI: Coupon Checker',
        ai: 'Write a function that checks whether a coupon code is valid. Codes are case-insensitive. Expired codes are invalid. Today\'s date is passed in.',
        code: 'const coupons = [\n  { code: "SPRING10", expires: "2026-05-01" },\n  { code: "GRIZ20", expires: "2026-12-31" }\n];\nfunction isValidCoupon(input, today) {\n  const match = coupons.find(c => c.code === input);\n  return match !== undefined;\n}\nconsole.log(isValidCoupon("GRIZ20", "2026-10-19"));\nconsole.log(isValidCoupon("griz20", "2026-10-19"));\nconsole.log(isValidCoupon("SPRING10", "2026-10-19"));',
        runAfter: true,
        questions: [
          { kind: 'text', q: 'Predict the three printed values, separated by spaces.', answer: ['true false true'], why: 'Exact match → true. Lowercase doesn\'t match exactly → false. SPRING10 exists → true, even though it expired in May.' },
          { kind: 'mcq', q: 'Which requirements does the AI\'s code miss?',
            options: [
              { t: 'Both: it\'s case-sensitive, and it never checks expiry', ok: true, why: '“griz20” should be valid; SPRING10 should be expired.' },
              { t: 'Only the case-insensitive rule', ok: false, why: 'Look at the third result: SPRING10 expired on May 1.' },
              { t: 'Only the expiry rule', ok: false, why: 'Look at the second result: “griz20” should match.' },
              { t: 'None: it runs fine', ok: false, why: 'Runs fine; meets the spec? Check each requirement.' }
            ] },
          { kind: 'mcq', q: 'The parameter <code>today</code> is never used. What does that tell you?',
            options: [
              { t: 'A requirement was probably forgotten: an unused input is a red flag', ok: true, why: 'Why accept a date and never look at it? The code coach in this game flags unused parameters for exactly this reason.' },
              { t: 'Nothing: extra parameters are harmless', ok: false, why: 'Harmless to run, but a strong hint that something\'s missing.' },
              { t: 'JavaScript will use it automatically', ok: false, why: 'JavaScript never uses a parameter by itself.' }
            ] },
          { kind: 'line', q: 'Which line ignores the case-insensitive rule?', answer: 6, why: '<code>c.code === input</code> is an exact comparison. Comparing <code>input.toUpperCase()</code> would fix it.' },
          { kind: 'mcq', q: 'What\'s the best follow-up prompt to the AI?',
            options: [
              { t: '“Your function fails two requirements: \'griz20\' should be valid (case-insensitive), and SPRING10 expired on 2026-05-01 so it should be invalid for 2026-10-19. Please fix both and keep the same function signature.”', ok: true, why: 'Specific failures, concrete examples, and a constraint. Then re-test it yourself.' },
              { t: '“It\'s wrong, fix it.”', ok: false, why: 'The AI has to guess what\'s wrong, and may “fix” the wrong thing.' },
              { t: '“Write it again from scratch.”', ok: false, why: 'You\'ll likely get the same misses. Tell it what failed.' }
            ] }
        ],
        explain: {
          prompt: 'Write a short code review for this AI-generated function: what works, what fails, and how you know.',
          minWords: 25,
          keywords: [{ label: 'Case sensitivity', any: ['case', 'lowercase', 'uppercase', 'griz20'] }, { label: 'Expiry never checked', any: ['expir', 'date', 'today', 'spring10'] }, { label: 'Evidence from tests', any: ['test', 'output', 'printed', 'false', 'true', 'example'] }, { label: 'Unused parameter', any: ['unused', 'never used', 'parameter'] }],
          model: 'It correctly finds exact codes. But it fails two requirements: it\'s case-sensitive (“griz20” returns false), and it never checks the expiry date (the today parameter is unused, which was the giveaway), so the expired SPRING10 returns true. I confirmed both with the three test calls. It needs to compare uppercase codes and check that today is before the expiry date.'
        },
        takeaway: 'Check AI code against every requirement, one by one, with a test for each.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L9', title: 'Game Systems: State & Rules',
    blurb: 'Model game state, protect rules that must always be true, and hunt the hardest bugs: state changing at the wrong time.',
    concepts: ['state', 'invariants', 'immutability', 'bounds checks', 'state machines'],
    challenges: [
      {
        id: 'L9-1', type: 'quiz', variant: 'plan', skill: 'understand',
        title: 'Forest Guardian: Design the Rules',
        intro: '<p>You\'re designing the potion system for a turn-based game, <em>Forest Guardian</em>.</p><ul><li>A player has <strong>health</strong> (0 to 100) and a number of <strong>potions</strong>.</li><li>A potion heals <strong>25</strong>, but health can never go above <strong>100</strong>.</li><li>You need at least one potion to drink one.</li><li>A defeated player (health 0) can\'t heal.</li></ul>',
        questions: [
          { kind: 'mcq', q: 'What is the player\'s <strong>state</strong>?',
            options: [
              { t: 'The data that changes over time: health and potions', ok: true, why: 'State is a snapshot of everything that can change. Game logic is mostly “given this state and this action, what\'s the new state?”' },
              { t: 'The rules about potions', ok: false, why: 'Rules stay the same; state changes.' },
              { t: 'The player\'s name', ok: false, why: 'A name rarely changes, and it isn\'t part of these rules.' }
            ] },
          { kind: 'mcq', q: 'Which statement must <strong>always</strong> be true (an <em>invariant</em>)?',
            options: [
              { t: '0 ≤ health ≤ 100', ok: true, why: 'Every function that changes health must protect this. Many game bugs are broken invariants.' },
              { t: 'Health is always 100', ok: false, why: 'Health changes. That\'s the point.' },
              { t: 'Potions is always more than 0', ok: false, why: 'You can run out.' }
            ] },
          { kind: 'text', q: 'Health is 90 and the player drinks a potion (+25). What\'s the new health?', answer: ['100'], why: '90 + 25 = 115, but the cap is 100.' },
          { kind: 'mcq', q: 'Should <code>usePotion</code> change the player object it receives, or return a new one?',
            options: [
              { t: 'Return a new object, and let the caller decide when to replace the old state', ok: true, why: 'It avoids the surprise-mutation bugs from Levels 7 and 8, makes changes easy to trace, and is how many game and UI frameworks expect state to work.' },
              { t: 'Change it directly: it\'s simpler', ok: false, why: 'Simpler to write, harder to debug. You saw why in the Shrinking Prices bug.' },
              { t: 'It doesn\'t matter', ok: false, why: 'It matters a lot once several parts of a game share the same player.' }
            ] }
        ],
        explain: {
          prompt: 'List the rules usePotion must enforce and the test cases you\'d use to check each one.',
          minWords: 20,
          keywords: [{ label: 'Cap at 100 (e.g. 90 → 100)', any: ['100', 'cap', 'max', '90'] }, { label: 'No potions → no change', any: ['no potion', '0 potion', 'zero potion', 'out of', 'potions is 0', 'potions: 0'] }, { label: 'Defeated → no healing', any: ['defeat', 'health 0', 'health is 0', 'dead', 'health: 0'] }, { label: 'Doesn\'t change the original', any: ['original', 'new object', 'copy', 'mutat'] }],
          model: 'Normal case: 50 health with 2 potions becomes 75 with 1. Cap: 90 health becomes 100, not 115. No potions: 40 health with 0 potions stays the same. Defeated: 0 health with 3 potions stays the same. And in every case the original player object must not be changed.'
        },
        takeaway: 'Name your invariants, then write a test for each one.'
      },
      {
        id: 'L9-2', type: 'build', skill: 'build',
        title: 'Build: Use a Potion',
        intro: '<p>Write <code>usePotion(player)</code>, where <code>player</code> looks like <code>{ health: 50, potions: 2 }</code>.</p><ul><li>A potion heals 25; health can\'t go above 100.</li><li>It uses up one potion.</li><li>With 0 potions, or 0 health, nothing changes.</li><li><strong>Return a new object</strong>; don\'t change the one passed in.</li></ul>',
        starter: '// player looks like: { health: 50, potions: 2 }\nfunction usePotion(player) {\n\n}\n\nconsole.log(usePotion({ health: 50, potions: 2 }));\n',
        expectReturn: 'usePotion',
        tests: [
          { expr: 'usePotion({ health: 50, potions: 2 })', expect: { health: 75, potions: 1 } },
          { expr: 'usePotion({ health: 90, potions: 1 })', expect: { health: 100, potions: 0 }, label: 'caps at 100: { health: 90, potions: 1 } → { health: 100, potions: 0 }' },
          { expr: 'usePotion({ health: 40, potions: 0 })', expect: { health: 40, potions: 0 }, label: 'no potions → unchanged' },
          { expr: 'usePotion({ health: 0, potions: 3 })', expect: { health: 0, potions: 3 }, label: 'defeated → unchanged' },
          { expr: '(function () { const p = { health: 50, potions: 2 }; usePotion(p); return p.health === 50 && p.potions === 2; })()', label: 'doesn\'t change the original player object' }
        ],
        hints: [
          'Restate it: check the two “nothing happens” cases first, then build the healed player.',
          'Guard clause: <code>if (player.potions === 0 || player.health === 0) { return { ...player }; }</code>',
          'Build a new object with spread and override what changes: <code>{ ...player, health: Math.min(player.health + 25, 100), potions: player.potions - 1 }</code>'
        ],
        solution: 'const POTION_HEAL = 25;\nconst MAX_HEALTH = 100;\n\nfunction usePotion(player) {\n  if (player.potions === 0 || player.health === 0) {\n    return { ...player };\n  }\n  return {\n    ...player,\n    health: Math.min(player.health + POTION_HEAL, MAX_HEALTH),\n    potions: player.potions - 1\n  };\n}\n\nconsole.log(usePotion({ health: 50, potions: 2 }));',
        solutionQuestions: [
          { kind: 'mcq', q: 'In <code>{ ...player, health: … }</code>, what happens to properties the AI didn\'t list, say, a <code>name</code>?',
            options: [
              { t: 'They\'re copied over unchanged by the spread', ok: true, why: 'Spread copies everything, then the listed properties override. That makes the function safe even if the player object grows later.' },
              { t: 'They\'re deleted', ok: false, why: 'Spread copies all properties first.' },
              { t: 'The code crashes', ok: false, why: 'Extra properties are fine.' }
            ] }
        ],
        explain: {
          prompt: 'Explain how your function enforces each rule, and how it avoids changing the original player.',
          minWords: 20,
          keywords: [{ label: 'Guard for no potions / defeated', any: ['potions === 0', 'no potion', 'health === 0', 'defeat', 'guard', 'unchanged'] }, { label: 'Cap at 100', any: ['100', 'math.min', 'cap', 'max'] }, { label: 'Uses a potion', any: ['- 1', '-1', 'potions'] }, { label: 'New object, not mutation', any: ['new object', 'spread', '...', 'copy', 'original'] }],
          model: 'First it checks the two cases where nothing should happen (no potions, or health 0) and returns an unchanged copy. Otherwise it returns a new object built with spread: health goes up by 25 but Math.min keeps it at 100 or less, and potions goes down by 1. Because it always builds a new object, the original player is never modified.'
        },
        ways: [
          { topic: 'Making a changed copy of an object', forms: [
            { code: 'return { ...player, potions: player.potions - 1 };', note: 'Spread copies every property, then the ones you list replace them.' },
            { code: 'return Object.assign({}, player, { potions: player.potions - 1 });', note: 'The older way to do the same thing. Still common in existing code.' },
            { code: 'player.potions = player.potions - 1;\nreturn player;', note: 'Not a copy. This changes the caller\'s object (mutation), which this challenge\'s rules forbid.' }
          ] }
        ],
        takeaway: 'Guard the special cases, then build new state from old state.'
      },
      {
        id: 'L9-3', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 4,
        title: 'Bug Hunt: The Slime Strikes Back',
        symptom: 'The hero defeats the slime in one hit (score goes to 100), but still loses 8 health. Prints <code>22 100</code>. Expected <code>30 100</code>.',
        code: 'function takeTurn(player, enemy) {\n  enemy.health -= player.attack;\n  if (enemy.health <= 0) {\n    player.score += 100;\n  }\n  player.health -= enemy.attack;\n  return player;\n}\nconst hero = { health: 30, attack: 12, score: 0 };\nconst slime = { health: 10, attack: 8 };\ntakeTurn(hero, slime);\nconsole.log(hero.health, hero.score);',
        questions: [
          { kind: 'line', q: 'Which line runs when it shouldn\'t?', answer: 6, why: 'The enemy counter-attacks even after it\'s been defeated.' },
          classify('logic', 'The game keeps running and the numbers look plausible. Only someone who knows the rules notices.'),
          { kind: 'mcq', q: 'Which fix matches the rule “defeated enemies don\'t attack”?',
            options: [
              { t: 'Only let the enemy attack if it\'s still alive, e.g. wrap line 6 in <code>if (enemy.health &gt; 0)</code>, or <code>return</code> early after the enemy is defeated', ok: true, why: 'Make the order of events match the game\'s rules.' },
              { t: 'Swap lines 2 and 6 so the enemy attacks first', ok: false, why: 'Then a defeated enemy still attacks; it just goes first. And it changes who strikes first.' },
              { t: 'Give the hero 8 extra health', ok: false, why: 'That patches one symptom and breaks every other fight.' }
            ] },
          { kind: 'mcq', q: 'This function also changes <code>player</code> and <code>enemy</code> directly. When could that cause a <em>different</em> bug?',
            options: [
              { t: 'If the game wants to preview a move (“what would happen if…”) without actually doing it', ok: true, why: 'A preview would permanently change the real hero and slime. Returning new state avoids that.' },
              { t: 'Never: games always change state directly', ok: false, why: 'Many games and frameworks avoid it for exactly the preview/undo/replay reasons.' },
              { t: 'Only when health is negative', ok: false, why: 'The issue is who else holds the same objects, not the values.' }
            ] }
        ],
        fixed: 'function takeTurn(player, enemy) {\n  enemy.health -= player.attack;\n  if (enemy.health <= 0) {\n    player.score += 100;\n    return player;\n  }\n  player.health -= enemy.attack;\n  return player;\n}\nconst hero = { health: 30, attack: 12, score: 0 };\nconst slime = { health: 10, attack: 8 };\ntakeTurn(hero, slime);\nconsole.log(hero.health, hero.score);',
        explain: {
          prompt: 'Explain the bug in terms of the game\'s rules and the order of events in the code.',
          minWords: 15,
          keywords: [{ label: 'Enemy attacks after being defeated', any: ['defeat', 'dead', 'still attack', 'after'] }, { label: 'Order of events', any: ['order', 'sequence', 'before', 'after', 'then'] }, { label: 'Fix: skip the attack / return early', any: ['return', 'if', 'skip', 'only if', 'alive'] }],
          model: 'The code always runs the enemy\'s attack on line 6, even when line 3 has already decided the enemy is defeated. In the game\'s rules a defeated enemy can\'t attack, so the order of events in the code doesn\'t match the rules. Returning early after the enemy is defeated fixes it.'
        },
        takeaway: 'When state changes, ask: should the next step still happen?'
      },
      {
        id: 'L9-4', type: 'quiz', variant: 'bug', skill: 'debug', difficulty: 5,
        title: 'Bug Hunt: Off the Edge of the Map',
        symptom: 'The first call prints <code>grass</code>. The second crashes: <code>TypeError: Cannot read properties of undefined (reading \'0\')</code>',
        code: 'const map = [\n  ["grass", "tree", "water"],\n  ["grass", "rock", "grass"]\n];\nfunction tileAt(row, col) {\n  return map[row][col];\n}\nconsole.log(tileAt(1, 2));\nconsole.log(tileAt(2, 0));',
        questions: [
          { kind: 'line', q: 'Which line throws the error?', answer: 6, why: '<code>map[2]</code> is undefined, and <code>undefined[0]</code> crashes.' },
          { kind: 'mcq', q: 'Here\'s a puzzle: <code>tileAt(1, 5)</code> would <em>not</em> crash. Why does <code>tileAt(2, 0)</code>?',
            options: [
              { t: 'map[2] doesn\'t exist (it\'s undefined), and you can\'t index into undefined. map[1][5] reads a missing item from a real array, which just gives undefined', ok: true, why: 'Same mistake (out of bounds), two different symptoms: one crashes, one silently returns undefined. That inconsistency is what makes bounds bugs nasty.' },
              { t: 'Columns are allowed to be out of range, rows aren\'t', ok: false, why: 'Neither is “allowed”; one just fails more loudly.' },
              { t: 'Because 0 is falsy', ok: false, why: 'The 0 is fine. The row is the problem.' }
            ] },
          classify('runtime', 'The program ran the first call, then crashed during the second.'),
          { kind: 'mcq', q: 'Which fix is best?',
            options: [
              { t: 'Check bounds first: if the row or column is outside the map, return <code>null</code> (and decide with the designer what “off the map” means)', ok: true, why: 'A clear, intentional answer for every input, including the ones you didn\'t expect.' },
              { t: 'Make the map bigger', ok: false, why: 'A player can always walk one step further.' },
              { t: 'Wrap it in try/catch and return "grass"', ok: false, why: 'Silently inventing terrain hides the bug and can let players walk off the world.' }
            ] }
        ],
        fixed: 'const map = [\n  ["grass", "tree", "water"],\n  ["grass", "rock", "grass"]\n];\nfunction tileAt(row, col) {\n  if (row < 0 || row >= map.length) return null;\n  if (col < 0 || col >= map[row].length) return null;\n  return map[row][col];\n}\nconsole.log(tileAt(1, 2));\nconsole.log(tileAt(2, 0));',
        explain: {
          prompt: 'Explain why out-of-bounds row and column mistakes behave differently, and what a bounds check does.',
          minWords: 20,
          keywords: [{ label: 'Missing row is undefined', any: ['map[2]', 'row', 'undefined'] }, { label: 'Indexing into undefined crashes', any: ['crash', 'typeerror', "can't", 'cannot'] }, { label: 'Missing column just gives undefined', any: ['column', 'col', 'silent', 'quiet'] }, { label: 'Bounds check before reading', any: ['bounds', 'check', 'length', 'null', 'inside'] }],
          model: 'There is no row 2, so map[2] is undefined, and trying to read [0] from undefined crashes. A bad column on a real row just returns undefined quietly, which is worse because nothing tells you. A bounds check compares row and column against the lengths first and returns null for anything off the map.'
        },
        takeaway: 'Check bounds before you index. Decide what “outside” means.'
      },
      {
        id: 'L9-5', type: 'quiz', variant: 'ai', skill: 'explain',
        title: 'Read the AI\'s Code: Game State Machine',
        intro: '<p>A <strong>state machine</strong> is a common game pattern: the game is always in one named state (menu, playing, gameover), and events move it between states.</p>',
        ai: 'Write a simple state machine for my game: menu → playing → gameover. "start" begins or restarts the game. Each "hit" costs a life; at 0 lives it\'s game over. Log the state after every event.',
        code: 'const game = { state: "menu", lives: 3, log: [] };\nfunction handle(event) {\n  if (game.state === "menu" && event === "start") {\n    game.state = "playing";\n  } else if (game.state === "playing" && event === "hit") {\n    game.lives -= 1;\n    if (game.lives === 0) game.state = "gameover";\n  } else if (game.state === "gameover" && event === "start") {\n    game.state = "playing";\n  }\n  game.log.push(game.state);\n}\n["hit", "start", "hit", "hit", "hit", "start"].forEach(handle);\nconsole.log(game.log.join(" > "));\nconsole.log(game.lives);',
        runAfter: true,
        questions: [
          { kind: 'mcq', q: 'Why does the very first <code>"hit"</code> do nothing?',
            options: [
              { t: 'The game is in "menu", and no rule handles "hit" in that state', ok: true, why: 'State machines ignore events that don\'t apply to the current state. That\'s usually what you want.' },
              { t: 'Because lives starts at 3', ok: false, why: 'It never gets as far as touching lives.' },
              { t: 'It\'s a crash', ok: false, why: 'No crash. It falls through every branch and just logs "menu".' }
            ] },
          { kind: 'text', q: 'Predict line 14\'s output exactly.', answer: ['menu > playing > playing > playing > gameover > playing'], why: 'hit (ignored) → start → hit (2 lives) → hit (1) → hit (0, gameover) → start (playing again).', miss: 'Track two things for each event: the state and the lives. Log the state after each one.' },
          { kind: 'text', q: 'What does line 15 print?', answer: ['0'], why: 'Lives are never reset when the game restarts.' },
          { kind: 'mcq', q: 'What\'s wrong with the restart?',
            options: [
              { t: 'Restarting from gameover doesn\'t reset lives, so the player is “playing” with 0 lives', ok: true, why: 'The next hit would take lives to −1, and since −1 isn\'t 0, the game would never end again. A broken invariant.' },
              { t: 'Nothing: that\'s what the prompt asked for', ok: false, why: 'The prompt said "start" restarts the game. A restart with 0 lives isn\'t a real restart.' },
              { t: 'gameover should be a dead end', ok: false, why: 'The prompt explicitly says start can restart the game.' }
            ] },
          { kind: 'line', q: 'Which line should also reset the lives?', answer: [9, 8], why: 'In the gameover → playing transition (line 9), add <code>game.lives = 3;</code>.' }
        ],
        fixed: 'const STARTING_LIVES = 3;\nconst game = { state: "menu", lives: STARTING_LIVES, log: [] };\nfunction handle(event) {\n  if (game.state === "menu" && event === "start") {\n    game.state = "playing";\n  } else if (game.state === "playing" && event === "hit") {\n    game.lives -= 1;\n    if (game.lives <= 0) game.state = "gameover";\n  } else if (game.state === "gameover" && event === "start") {\n    game.lives = STARTING_LIVES;\n    game.state = "playing";\n  }\n  game.log.push(game.state);\n}\n["hit", "start", "hit", "hit", "hit", "start"].forEach(handle);\nconsole.log(game.log.join(" > "));\nconsole.log(game.lives);',
        explain: {
          prompt: 'Explain how this state machine works, the bug you found, and why <code>lives === 0</code> is more fragile than <code>lives &lt;= 0</code>.',
          minWords: 25,
          keywords: [{ label: 'States and events', any: ['state', 'event', 'menu', 'playing', 'gameover'] }, { label: 'Restart doesn\'t reset lives', any: ['reset', 'restart', 'lives'] }, { label: '=== 0 misses negatives', any: ['negative', '-1', 'below', '<=', 'skip past', 'never end'] }],
          model: 'The game is always in one state and each event either moves it to another state or is ignored. When a hit brings lives to 0 it switches to gameover. The bug: start from gameover switches back to playing without resetting lives, so the player has 0 lives. The next hit makes lives −1, and since the check is lives === 0 it never triggers again, so the game can\'t end. Using <= 0 is more robust, and resetting lives on restart fixes the root cause.'
        },
        takeaway: 'Every state transition should leave the game in a valid state.'
      }
    ]
  },

  /* ================================================================ */
  {
    id: 'L10', title: 'Capstone: Own Your Code',
    blurb: 'Compare competing solutions like a code reviewer, then design, build, test and defend a program of your own.',
    concepts: ['code review', 'trade-offs', 'design', 'testing', 'responsible AI use'],
    challenges: [
      {
        id: 'L10-1', type: 'quiz', variant: 'judge', skill: 'explain',
        title: 'Judge the AI: Two Solutions',
        intro: '<p><strong>Requirement:</strong> return the names of players with a score of <strong>100 or more</strong>, sorted alphabetically.</p><p>Two different AI assistants produced two different solutions. Run both.</p>',
        codes: [
          { label: 'Solution A', code: 'function qualifiers(players) {\n  const result = [];\n  for (let i = 0; i < players.length; i++) {\n    if (players[i].score >= 100) {\n      result.push(players[i].name);\n    }\n  }\n  return result.sort();\n}\nconsole.log(qualifiers([\n  { name: "Zed", score: 100 },\n  { name: "Amy", score: 150 },\n  { name: "Bo", score: 90 }\n]));' },
          { label: 'Solution B', code: 'const qualifiers = (p) => p.filter(x => x.score > 100).map(x => x.name).sort();\nconsole.log(qualifiers([\n  { name: "Zed", score: 100 },\n  { name: "Amy", score: 150 },\n  { name: "Bo", score: 90 }\n]));' }
        ],
        questions: [
          { kind: 'mcq', q: 'Which solution meets the requirement?',
            options: [
              { t: 'Only A: B uses <code>&gt; 100</code>, so Zed (exactly 100) is left out', ok: true, why: 'The boundary test case (a score of exactly 100) is what reveals it. Sound familiar?' },
              { t: 'Only B: it\'s shorter', ok: false, why: 'Run it: B prints ["Amy"] and misses Zed.' },
              { t: 'Both', ok: false, why: 'Check the output for Zed, who scored exactly 100.' },
              { t: 'Neither', ok: false, why: 'A prints ["Amy", "Zed"], which is correct.' }
            ] },
          { kind: 'mcq', q: 'Someone on your team says, “B is better because it\'s one line.” What\'s the best response?',
            options: [
              { t: 'Correctness comes first; after that, choose whatever your team can read and maintain most easily. Short isn\'t automatically better', ok: true, why: 'B\'s style is fine (many developers prefer filter/map), but it\'s wrong, and names like p and x make it harder to review.' },
              { t: 'Agree: fewer lines is always better', ok: false, why: 'Then the shorter wrong answer would win.' },
              { t: 'Disagree: loops are always better than filter and map', ok: false, why: 'Both styles are valid. The bug is the issue, not the style.' }
            ] },
          { kind: 'mcq', q: 'Which change to B fixes it <em>and</em> makes it easier to review?',
            options: [
              { t: '<code>const qualifiers = (players) =&gt; players.filter(player =&gt; player.score &gt;= 100).map(player =&gt; player.name).sort();</code>', ok: true, why: 'Correct boundary, and the names say what they hold.' },
              { t: '<code>const q = (p) =&gt; p.filter(x =&gt; x.score &gt;= 100).map(x =&gt; x.name).sort();</code>', ok: false, why: 'Fixed, but even harder to read.' },
              { t: '<code>... x.score &gt; 99 ...</code>', ok: false, why: 'Works for whole numbers, but 99.5 would qualify. Say what you mean: >= 100.' }
            ] }
        ],
        explain: {
          prompt: 'Which version would you submit, and how would you justify it to a code reviewer? Mention correctness, readability, and how you tested.',
          minWords: 30,
          keywords: [{ label: 'Correctness (>= vs >)', any: ['>=', '>', '100', 'zed', 'boundary', 'correct'] }, { label: 'Readability / names', any: ['read', 'name', 'clear', 'understand', 'maintain'] }, { label: 'How you tested', any: ['test', 'ran', 'run', 'output', 'example'] }],
          model: 'I\'d submit A, or B with the fix. A is correct: it uses >= 100, so Zed (exactly 100) qualifies. I confirmed this by running both with a player at the boundary, and B left Zed out. Once corrected, I\'d pick whichever style my team reads most easily, and use descriptive names like players and player instead of p and x so a reviewer can check the logic against the requirement.'
        },
        takeaway: 'Correct first, then clear. Prove correctness with boundary tests.'
      },
      {
        id: 'L10-2', type: 'open', skill: 'build',
        title: 'Capstone: Build Your Own System',
        intro: '<p>Design and build a small program of your own that solves a real problem, from business or from games. You decide the rules.</p><p><strong>Ideas:</strong> a tip splitter with rounding rules, a grade book that drops the lowest score, a store inventory with reorder alerts, a dice game with scoring rules, a quiz scorer, a loot-drop table, a parking-fee calculator.</p>' +
          '<p>You may use AI however you like; just record how honestly, and make sure you can explain every line. Your program should print at least one result so you can see it working.</p>',
        starter: '// Capstone: describe your program in a comment here.\n\n',
        takeaway: 'You defined a problem, built a solution, tested it, and defended it. That\'s the job.'
      }
    ]
  }
  ];

  window.JSRQ_LEVELS = LEVELS;
})();
