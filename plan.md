# C++ for Unreal Engine — 16-Week Course Plan

## Overview
Create `Beginning_CPP_Course.html` — a single self-contained HTML file following the exact same architecture as `Beginning_Python_Course.html`. This will be a 16-week introductory C++ course for higher education students, taught through the lens of **Unreal Engine game development**. Students learn C++ fundamentals while building toward playable Unreal Engine projects.

The file will also be linked from `index.html` in the Learning Modules section.

---

## Architecture (matching existing pattern)

The file is a single HTML document with:
1. **CSS styles** — same design system rebranded with Unreal Engine colors (dark `#1a1a2e`, accent `#00bfff` cyan-blue, Unreal teal)
2. **HTML skeleton** — sidebar with nav, main content area with topbar
3. **JavaScript `data` object** — contains all course content (goals, grading, resources, 16 weeks of structured data)
4. **JavaScript rendering functions** — `renderOverview()`, `renderSchedule()`, `renderWeek(n)`, navigation logic

---

## Course Curriculum: 16-Week C++ for Unreal Engine

### Week 1 — Setup & Your First Program
- **Topics**: What is C++, why C++ for game development, compiled vs interpreted, installing Visual Studio (with C++ game dev workload), installing Unreal Engine via Epic Games Launcher, writing/compiling/running hello.cpp in VS, `#include <iostream>`, `std::cout`, `main()` function, comments, tour of the Unreal Editor interface
- **Activity**: "Hello, Unreal!" — compile a standalone hello.cpp in VS, then create a new UE5 project and explore the editor (viewport, content browser, outliner, details panel)
- **Assignment**: `introduction.cpp` — standalone C++ program that prints personal game developer bio using `cout` and escape sequences; also submit a screenshot of their first UE5 blank project open in the editor
- **Assessment**: None

### Week 2 — Variables and Data Types
- **Topics**: `int`, `double`, `float`, `char`, `bool`, `string`, variable declaration & initialization, `const`, `sizeof()`, `cin` for input, type casting, how these map to UE types (`int32`, `float`, `FString`, `bool`)
- **Activity**: "Game Stats Designer" — design variables for a game character (health as `float`, name as `string`, level as `int`, isAlive as `bool`), predict output of mixed-type expressions
- **Assignment**: `character_stats.cpp` — standalone program that creates a game character profile using variables, takes user input for stats, displays a formatted character sheet
- **Assessment**: None

### Week 3 — Operators and Expressions
- **Topics**: Arithmetic (`+`, `-`, `*`, `/`, `%`), comparison, logical (`&&`, `||`, `!`), assignment operators (`+=`, `-=`), increment/decrement (`++`, `--`), operator precedence, integer vs float division, game math examples (damage calculation, XP thresholds)
- **Activity**: "Damage Calculator" — predict results of game damage formulas (e.g., `baseDamage * critMultiplier - armor`), explore integer vs float division in health calculations
- **Assignment**: `damage_calculator.cpp` — RPG damage calculator: user inputs base damage, crit multiplier, armor value; program computes final damage, displays if the hit is lethal based on enemy HP
- **Assessment**: **Quiz 1** — Weeks 1–3: setup, data types, variables, operators (15 MC + 2 short answer, 20 min)

### Week 4 — Conditional Statements
- **Topics**: `if`, `else if`, `else`, nested conditionals, `switch` statement, ternary operator (`? :`), truthiness in C++, game state decisions (menu selection, difficulty levels, win/lose conditions)
- **Activity**: "Text Adventure Engine" — build a console-based dungeon crawler with branching paths using nested if/else and switch for room navigation
- **Assignment**: `quest_system.cpp` — a quest decision system: player chooses a class (warrior/mage/rogue via switch), encounters a monster, program calculates outcome based on class strengths using conditionals
- **Assessment**: None

### Week 5 — Loops
- **Topics**: `for` loop, `while` loop, `do-while` loop, `break`, `continue`, nested loops, loop counters and accumulators, game loops concept (update cycle), spawning patterns
- **Activity**: "Wave Spawner" — simulate enemy wave spawning: use nested loops to spawn rows and columns of enemies, print a grid pattern representing enemy formation
- **Assignment**: `arena_battle.cpp` — turn-based arena game: player and enemy take turns attacking in a while loop, track HP, random damage range, battle continues until one falls, display round-by-round log
- **Assessment**: None

### Week 6 — Functions
- **Topics**: Function declaration & definition, prototypes, parameters (by value), return types, `void` functions, function overloading, scope (local vs global), organizing game logic into functions
- **Activity**: "Game Function Library" — write `calculateDamage()`, `isAlive()`, `levelUp()`, `displayHUD()`, call all from `main()` to simulate a game turn
- **Assignment**: `rpg_toolkit.cpp` — build a function library: `rollDice(sides)`, `calculateXP(level, enemyLevel)`, `applyDamage(hp, damage, armor)`, `displayCharacter(name, hp, level)`, demo all from a menu-driven `main()`
- **Assessment**: **Quiz 2** — Weeks 4–6: conditionals, loops, functions (10 MC + 3 code-writing, 25 min)

### Week 7 — Arrays and Strings
- **Topics**: C-style arrays, `std::string`, string methods (`.length()`, `.substr()`, `.find()`, `.append()`), array traversal with loops, `sizeof` with arrays, character arrays vs `std::string`, game applications (inventory slots, leaderboard names)
- **Activity**: "Inventory Manager" — fixed-size inventory using arrays: add items, display all slots, search for an item by name using string comparison
- **Assignment**: `leaderboard.cpp` — high score leaderboard: parallel arrays for player names and scores, display sorted leaderboard, search by name, find highest/lowest scores
- **Assessment**: None

### Week 8 — Vectors and the STL Intro
- **Topics**: `std::vector`, `.push_back()`, `.pop_back()`, `.size()`, `.at()`, range-based for loop, `#include <vector>`, `#include <algorithm>`, `sort()`, `reverse()`, intro to STL, dynamic inventory and entity lists in games
- **Activity**: "Dynamic Loot Table" — build a loot drop system using vectors: add/remove items, shuffle loot, display drop rates
- **Assignment**: **Midterm Project** — "Console RPG" — a menu-driven text RPG using vectors, functions, loops: character creation, dynamic inventory (vector of items), turn-based combat against multiple enemies (vector of structs), save game stats to display at end
- **Assessment**: **Midterm Project** due Week 9

### Week 9 — References, Pointers Intro & Unreal Engine C++ Basics
- **Topics**: Pass by reference (`&`), pass by value vs reference, intro to pointers (`*`, `&` address-of), `nullptr`, pointer arithmetic basics, why pointers matter for game engines, first look at UE5 C++ classes (`AActor`, `UCLASS`, `UPROPERTY`, `UFUNCTION` macros)
- **Activity**: "Swap Shop" — implement `swap()` by value (fails) vs by reference (works); then create a basic UE5 C++ Actor class, explore the generated .h and .cpp files
- **Assignment**: `reference_lab.cpp` — standalone: functions using pass-by-reference to modify game state (heal player, transfer items between inventories); UE5 portion: create an Actor that prints to the output log in `BeginPlay()`
- **Assessment**: None

### Week 10 — Structs and Enums
- **Topics**: `struct` definition, accessing members with `.`, arrays/vectors of structs, `enum` and `enum class`, combining structs with functions, how UE5 uses structs (`USTRUCT`) and enums for game data (weapon types, character states, item definitions)
- **Activity**: "Entity Component Prototype" — define structs for `Transform` (x, y, z), `CharacterStats` (hp, attack, defense), `Weapon` (name, damage, type enum), build a character with equipped weapon
- **Assignment**: `game_entities.cpp` — entity system: `Enemy` struct with stats, `enum class EnemyType`, vector of enemies, functions to spawn, display, sort by HP, find strongest/weakest
- **Assessment**: **Quiz 3** — Weeks 7–10: arrays, strings, vectors, references, pointers, structs (10 MC + 3 code-writing, 25 min)

### Week 11 — File I/O & Game Data
- **Topics**: `#include <fstream>`, `ifstream`, `ofstream`, `getline()`, reading/writing text files, error checking with `.is_open()`, parsing CSV-style data, game save systems, loading level data / config files
- **Activity**: "Save Game System" — write player data (name, level, HP, inventory) to a text file, then read it back and reconstruct the game state
- **Assignment**: `save_system.cpp` — full save/load system: save character stats and inventory to file, load from file to resume game, handle missing/corrupted save files gracefully
- **Assessment**: None

### Week 12 — Intro to Classes and OOP
- **Topics**: `class` keyword, access specifiers (`public`, `private`), constructors, member functions, `this` pointer, encapsulation, class vs struct, how UE5 uses classes (`AActor`, `APawn`, `ACharacter`, `APlayerController`), mapping OOP concepts to Unreal's class hierarchy
- **Activity**: "GameCharacter Class" — build a `GameCharacter` class with private HP/name, public `TakeDamage()`, `Heal()`, `GetHP()`, discuss why private data prevents cheating
- **Assignment**: `character_class.cpp` — full `Character` class with constructor, private stats, public methods for combat/healing/leveling; `Weapon` class with damage/durability; `main()` runs a combat simulation between two characters
- **Assessment**: None

### Week 13 — Inheritance, Polymorphism & UE5 Class Hierarchy
- **Topics**: Inheritance (`: public Base`), `protected` access, method overriding, `virtual` functions, abstract base classes (pure virtual), polymorphism basics, UE5's `AActor` → `APawn` → `ACharacter` hierarchy, overriding `BeginPlay()` and `Tick()`
- **Activity**: "Character Class Hierarchy" — base `GameEntity` class with virtual `Update()` and `Render()`, derived `Player`, `Enemy`, `NPC` classes with unique behaviors; store in a `vector<GameEntity*>` and iterate polymorphically
- **Assignment**: `game_hierarchy.cpp` — `Entity` base class, derived `Player` (user-controlled stats), `MeleeEnemy` (high HP), `RangedEnemy` (high damage), `BossEnemy` (special abilities); polymorphic combat loop processing a vector of entity pointers
- **Assessment**: **Quiz 4** — Weeks 11–13: file I/O, classes, inheritance, polymorphism (10 MC + 3 code-writing, 25 min)

### Week 14 — Error Handling, Debugging & UE5 Workflows
- **Topics**: `try`, `catch`, `throw`, `std::exception`, common runtime errors (segfault, out-of-bounds, null pointer), debugging with breakpoints in Visual Studio, UE5 `UE_LOG` macro, `check()` and `ensure()` macros, common UE5 C++ pitfalls, packaging and testing
- **Activity**: "Bug Hunt" — given buggy game code with 5+ errors (null pointer access, off-by-one, logic errors, bad casts), find and fix all; then practice setting breakpoints in VS and UE5 output log
- **Assignment**: `robust_game.cpp` — combat system with full exception handling: validate all inputs, handle null pointers, out-of-bounds inventory access, division by zero in damage formulas; submit clean, defensive code
- **Assessment**: None

### Week 15 — Final Project Workshop & UE5 Integration
- **Topics**: Project planning, code organization (multiple classes), UE5 Blueprint-C++ hybrid workflow, creating C++ Actors with Blueprint-exposed properties (`UPROPERTY(EditAnywhere)`), testing strategies, code review best practices
- **Activity**: Peer code review workshop — students exchange project drafts, give structured feedback; in-class UE5 demo: create a collectible pickup Actor in C++ with Blueprint-exposed variables
- **Assignment**: **Final Project** — work session (due Week 16)
- **Assessment**: None

### Week 16 — Final Project Presentations
- **Topics**: Presenting technical work, demo best practices, course retrospective, paths forward (UE5 Gameplay Framework, Blueprints + C++, multiplayer, AI)
- **Activity**: Project presentations (5-7 min each) + Q&A
- **Assignment**: **Final Project** due — a complete C++ game application demonstrating mastery of course concepts. **Option A**: Console RPG (must include classes with inheritance, file I/O save system, vectors, error handling, polymorphism). **Option B**: UE5 Prototype (a small playable UE5 level with at least 2 custom C++ Actor classes, Blueprint integration, and documented code)
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
1. **Unreal Engine Docs** — Official UE5 C++ documentation (docs.unrealengine.com)
2. **learncpp.com** — Free comprehensive C++ tutorial
3. **cppreference.com** — C++ standard library reference
4. **Unreal Engine Learning** — Epic's free courses (dev.epicgames.com/community/learning)
5. **Visual Studio** — Recommended IDE for UE5 development
6. **Compiler Explorer (godbolt.org)** — Test standalone C++ code online

---

## Implementation Steps

### Step 1: Create `Beginning_CPP_Course.html`
- Copy the structural pattern from `Beginning_Python_Course.html`
- Rebrand colors: primary Unreal-inspired dark theme (`#1a1a2e` dark, `#00bfff` cyan accent, `#0d47a1` deep blue)
- Badge text "C++" with Unreal Engine subtitle
- Update all CSS variables for UE/C++ theming

### Step 2: Populate the JavaScript `data` object
- `goals[]` — 6 course learning outcomes for C++ with Unreal Engine
- `grading[]` — grading breakdown (as above)
- `resources[]` — 6 C++/UE learning resources
- `weeks[]` — all 16 weeks with:
  - `n`, `title`, `badge` (null, "Quiz 1–4", "Midterm", or "Final")
  - `objectives[]` — 3 learning objectives per week
  - `topics[]` — 5–7 specific topics per week
  - `setup` — only Week 1 (install Visual Studio + Unreal Engine)
  - `activity` — `{ title, desc, code }` with C++ code samples (game-themed)
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
    <div class="card-name">C++ for Unreal Engine</div>
    <div class="card-desc">16-week intro to C++ programming through Unreal Engine game development.</div>
  </a>
  ```

### Step 5: Commit and push
- Commit with descriptive message
- Push to `claude/cpp-learning-module-plan-xzlvT`
