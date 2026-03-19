# C++ Learning Module — 16-Week Course Plan

## Overview
Create `Beginning_CPP_Course.html` — a single self-contained HTML file following the exact same architecture as `Beginning_Python_Course.html`. This will be a 16-week introductory C++ course for higher education students with no prior C++ experience.

The file will also be linked from `index.html` in the Learning Modules section.

---

## Architecture (matching existing pattern)

The file is a single HTML document with:
1. **CSS styles** — same design system (CSS variables, sidebar, topbar, cards, sections, code blocks, responsive layout) rebranded with C++ colors (blue `#00599C` / dark blue `#004482`)
2. **HTML skeleton** — sidebar with nav, main content area with topbar
3. **JavaScript `data` object** — contains all course content (goals, grading, resources, 16 weeks of structured data)
4. **JavaScript rendering functions** — `renderOverview()`, `renderSchedule()`, `renderWeek(n)`, navigation logic

---

## Course Curriculum: 16-Week C++ for Beginners

### Week 1 — Setup & Your First Program
- **Topics**: What is C++, history (Bjarne Stroustrup), compiled vs interpreted, installing g++/MinGW and VS Code with C/C++ extension, writing/compiling/running hello.cpp, `#include <iostream>`, `std::cout`, `main()` function, comments
- **Activity**: "Hello, World!" variations — each student customizes output, compiles, runs from terminal
- **Assignment**: `introduction.cpp` — print personal info using `cout` and escape sequences (`\n`, `\t`)
- **Assessment**: None

### Week 2 — Variables and Data Types
- **Topics**: `int`, `double`, `float`, `char`, `bool`, `string`, variable declaration & initialization, `const`, `sizeof()`, `cin` for input, type casting
- **Activity**: "Data Type Detective" — predict output of expressions with mixed types
- **Assignment**: `user_profile.cpp` — gather user input with `cin`, display formatted profile
- **Assessment**: None

### Week 3 — Operators and Expressions
- **Topics**: Arithmetic (`+`, `-`, `*`, `/`, `%`), comparison, logical (`&&`, `||`, `!`), assignment operators (`+=`, `-=`), increment/decrement (`++`, `--`), operator precedence, integer vs float division
- **Activity**: "Expression Explorer" — predict results of tricky expressions (e.g., `7/2` vs `7.0/2`)
- **Assignment**: `calculator.cpp` — multi-operation calculator with input validation
- **Assessment**: **Quiz 1** — Weeks 1–3: setup, data types, variables, operators (15 MC + 2 short answer, 20 min)

### Week 4 — Conditional Statements
- **Topics**: `if`, `else if`, `else`, nested conditionals, `switch` statement, ternary operator (`? :`), truthiness in C++ (0 is false, non-zero is true)
- **Activity**: "Choose Your Adventure" — text-based branching story using nested if/else and switch
- **Assignment**: `grade_calculator.cpp` — letter grade calculator with input validation and switch
- **Assessment**: None

### Week 5 — Loops
- **Topics**: `for` loop, `while` loop, `do-while` loop, `break`, `continue`, nested loops, loop counters and accumulators, avoiding infinite loops
- **Activity**: "FizzBuzz" + multiplication table using nested loops
- **Assignment**: `number_game.cpp` — guessing game with attempt limit using while loop
- **Assessment**: None

### Week 6 — Functions
- **Topics**: Function declaration & definition, prototypes, parameters (by value), return types, `void` functions, function overloading, scope (local vs global), header comments
- **Activity**: "Function Factory" — write `area_of_circle()`, `is_even()`, `celsius_to_fahrenheit()`, call from `main()`
- **Assignment**: `math_toolkit.cpp` — `is_prime()`, `factorial()`, temp converters, menu-driven main
- **Assessment**: **Quiz 2** — Weeks 4–6: conditionals, loops, functions (10 MC + 3 code-writing, 25 min)

### Week 7 — Arrays and Strings
- **Topics**: C-style arrays, `std::string`, string methods (`.length()`, `.substr()`, `.find()`, `.append()`), array traversal with loops, `sizeof` with arrays, character arrays vs `std::string`
- **Activity**: "String Surgeon" — clean and transform messy strings; build a word counter
- **Assignment**: `text_analyzer.cpp` — word count, character count, longest word, vowel count, palindrome check
- **Assessment**: None

### Week 8 — Vectors and the STL Intro
- **Topics**: `std::vector`, `.push_back()`, `.pop_back()`, `.size()`, `.at()`, range-based for loop, `#include <vector>`, `#include <algorithm>`, `sort()`, `reverse()`, intro to STL philosophy
- **Activity**: "Grade Tracker" — build a dynamic grade list, compute stats (min, max, average)
- **Assignment**: **Midterm Project** — "Student Grade Manager" — menu-driven program using vectors, functions, loops to manage a class roster with add/remove/search/stats
- **Assessment**: **Midterm Project** due Week 9

### Week 9 — References, Pointers Intro
- **Topics**: Pass by reference (`&`), pass by value vs reference, intro to pointers (`*`, `&` address-of), `nullptr`, pointer arithmetic basics, why pointers matter
- **Activity**: "Swap Shop" — implement `swap()` by value (fails) vs by reference (works), visualize memory
- **Assignment**: `reference_lab.cpp` — functions using pass-by-reference to modify arrays/vectors, pointer exercises
- **Assessment**: None

### Week 10 — Structs and Enums
- **Topics**: `struct` definition, accessing members with `.`, arrays/vectors of structs, `enum` and `enum class`, combining structs with functions
- **Activity**: "Student Database" — define a `Student` struct, create an array, search/display records
- **Assignment**: `inventory.cpp` — product inventory system using structs and vectors
- **Assessment**: **Quiz 3** — Weeks 7–10: arrays, strings, vectors, references, pointers, structs (10 MC + 3 code-writing, 25 min)

### Week 11 — File I/O
- **Topics**: `#include <fstream>`, `ifstream`, `ofstream`, `getline()`, reading/writing text files, error checking with `.is_open()`, parsing CSV-style data
- **Activity**: "File Detective" — read a data file, extract and display specific records
- **Assignment**: `file_manager.cpp` — read student data from file, compute stats, write report to output file
- **Assessment**: None

### Week 12 — Intro to Classes and OOP
- **Topics**: `class` keyword, access specifiers (`public`, `private`), constructors, member functions, `this` pointer, encapsulation, class vs struct
- **Activity**: "BankAccount Class" — build a class with deposit/withdraw/getBalance, discuss why private data matters
- **Assignment**: `bank_account.cpp` — full BankAccount class with validation, transaction history using vector
- **Assessment**: None

### Week 13 — More OOP: Inheritance and Polymorphism
- **Topics**: Inheritance (`: public Base`), `protected` access, method overriding, `virtual` functions, abstract base classes (pure virtual), polymorphism basics
- **Activity**: "Shape Hierarchy" — base `Shape` class with `area()`, derived `Circle`, `Rectangle`, `Triangle`
- **Assignment**: `shapes.cpp` — shape hierarchy with polymorphic area/perimeter calculations
- **Assessment**: **Quiz 4** — Weeks 11–13: file I/O, classes, inheritance, polymorphism (10 MC + 3 code-writing, 25 min)

### Week 14 — Error Handling and Debugging
- **Topics**: `try`, `catch`, `throw`, `std::exception`, common runtime errors (segfault, out-of-bounds), debugging with print statements, intro to debugger (gdb/VS Code debugger), defensive programming
- **Activity**: "Bug Hunt" — given buggy code with 5+ errors (logic, runtime, syntax), find and fix all
- **Assignment**: `robust_calculator.cpp` — calculator with full exception handling for division by zero, invalid input, overflow
- **Assessment**: None

### Week 15 — Final Project Workshop
- **Topics**: Project planning, code organization (multiple functions/classes), testing strategies, code review practices
- **Activity**: Peer code review workshop — students exchange project drafts, give structured feedback
- **Assignment**: **Final Project** — work session (due Week 16)
- **Assessment**: None

### Week 16 — Final Project Presentations
- **Topics**: Presenting technical work, demo best practices, course retrospective
- **Activity**: Project presentations (5-7 min each) + Q&A
- **Assignment**: **Final Project** due — a complete C++ application demonstrating mastery of course concepts (must include: classes, file I/O, vectors, error handling, clean code organization)
- **Assessment**: **Final Project** — graded on functionality (40%), code quality (25%), OOP usage (20%), documentation (15%)

---

## Grading Breakdown
| Component | Weight |
|---|---|
| Weekly Assignments (12) | 30% |
| In-Class Activities | 10% |
| Quizzes (4) | 20% |
| Midterm Project | 15% |
| Final Project | 25% |

---

## Resources (linked in overview page)
1. **cppreference.com** — C++ standard library reference
2. **learncpp.com** — Free comprehensive C++ tutorial
3. **Compiler Explorer (godbolt.org)** — See assembly output, test code online
4. **cplusplus.com** — Tutorials and reference
5. **VS Code** — Recommended IDE with C/C++ extension
6. **MinGW / g++** — Compiler download

---

## Implementation Steps

### Step 1: Create `Beginning_CPP_Course.html`
- Copy the structural pattern from `Beginning_Python_Course.html`
- Rebrand colors: primary `#00599C` (C++ blue), accent `#004482`, badge text "C++"
- Replace the snake emoji with a C++ themed icon
- Update all CSS variables for C++ theming

### Step 2: Populate the JavaScript `data` object
- `goals[]` — 6 course learning outcomes for C++
- `grading[]` — grading breakdown (as above)
- `resources[]` — 6 C++ learning resources
- `weeks[]` — all 16 weeks with:
  - `n`, `title`, `badge` (null, "Quiz 1–4", "Midterm", or "Final")
  - `objectives[]` — 3 learning objectives per week
  - `topics[]` — 5–7 specific topics per week
  - `setup` — only Week 1 (install instructions for g++/MinGW + VS Code C/C++ extension)
  - `activity` — `{ title, desc, code }` with C++ code samples
  - `assign` — `{ n, title, due, desc, reqs[] }` with `.cpp` filenames
  - `assess` — quiz/midterm/final objects where applicable

### Step 3: JavaScript rendering functions
- Reuse the exact same rendering logic from the Python course
- Update any Python-specific references in the rendering code

### Step 4: Update `index.html`
- Add a new card in the "Learning Modules" section:
  ```html
  <a class="card learn" href="Beginning_CPP_Course.html">
    <span class="card-tag tag-learn">Course</span>
    <div class="card-name">Beginning C++</div>
    <div class="card-desc">16-week intro to C++ programming for beginners.</div>
  </a>
  ```

### Step 5: Commit and push
- Commit with descriptive message
- Push to `claude/cpp-learning-module-plan-xzlvT`
