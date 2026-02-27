# Beginning Python — 16-Week Introductory CS Course

---

## Course Overview

**Course Title:** Introduction to Programming with Python
**Level:** Beginner (no prior experience required)
**Duration:** 16 Weeks
**Meeting Schedule:** 2 sessions per week (75 min each) — or adaptable to one 150-min session
**Tools Required:** Python 3.x, VS Code (free), a terminal/command prompt

### Course Goals
By the end of this course, students will be able to:
- Set up a working Python development environment
- Write, run, and debug Python programs
- Apply core programming concepts: variables, conditionals, loops, functions, and data structures
- Read and write files, handle errors, and use external libraries
- Design and build a small, complete Python application

### Grading Breakdown
| Component | Weight |
|---|---|
| Weekly Assignments (14) | 35% |
| In-Class Activities (participation) | 10% |
| Quizzes (4) | 20% |
| Midterm Project | 15% |
| Final Project | 20% |

---

## WEEK 1 — Setup & Your First Program

### Learning Objectives
- Install Python and VS Code
- Understand what programming is and why Python
- Run a Python script from the terminal

### Topics
- What is programming? What is Python?
- Installing Python 3 (python.org)
- Installing VS Code + Python extension
- Using the terminal / command prompt basics
- Writing and running `hello.py`
- `print()` statements and comments (`#`)

### Setup Checklist (Students Complete Before or During Class)
1. Download Python 3 from https://www.python.org/downloads/
   - **Windows:** Check "Add Python to PATH" during install
   - **Mac:** Use the installer or `brew install python3`
2. Download VS Code from https://code.visualstudio.com/
3. Install the **Python** extension in VS Code (by Microsoft)
4. Open a terminal in VS Code (`Terminal > New Terminal`)
5. Confirm install: type `python --version` (should print `Python 3.x.x`)

### In-Class Activity
**"Hello, World!" Relay** — Each student writes a `print()` statement that outputs something about themselves. Share screens or write on the board. Discuss: what changed? What stayed the same?

```python
# Example
print("My name is Alex and I like hiking.")
print("I have 2 cats.")
```

### Assignment 1 — Due Week 2
Write a Python script called `introduction.py` that prints:
- Your name
- Your major or area of interest
- One fun fact about yourself
- The answer to: what is 2025 minus the year you were born? (hard-code the math using `print()`)

**Submission:** Upload `introduction.py` to the course portal.

---

## WEEK 2 — Variables and Data Types

### Learning Objectives
- Declare and use variables
- Identify the four basic data types: `int`, `float`, `str`, `bool`
- Use `type()` and `input()` functions

### Topics
- Variables and assignment (`=`)
- Integer, float, string, boolean
- `type()` function
- `input()` for user input
- String concatenation and f-strings
- Naming conventions (snake_case)

### In-Class Activity
**"Data Type Detective"** — Given a list of values (`42`, `3.14`, `"hello"`, `True`, `"99"`), students predict the type without running code, then verify with `type()`. Discuss: why does `type("99")` return `str` not `int`?

```python
name = input("What is your name? ")
age = int(input("How old are you? "))
print(f"Hello, {name}! You were born around {2025 - age}.")
```

### Assignment 2 — Due Week 3
Write `user_profile.py` that asks the user for:
- Their name
- Their age
- Their favorite number

Then print a formatted summary using an f-string. Calculate and print what their age will be in 10 years.

---

## WEEK 3 — Operators and Expressions

### Learning Objectives
- Use arithmetic, comparison, and logical operators
- Understand operator precedence
- Perform type conversion

### Topics
- Arithmetic: `+`, `-`, `*`, `/`, `//`, `%`, `**`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `and`, `or`, `not`
- Type conversion: `int()`, `float()`, `str()`
- Integer division vs. float division

### In-Class Activity
**"Math Quiz Machine"** — Students pair up. One student writes a math expression on paper; the other predicts the Python output before running it. Focus on tricky cases: `7 // 2`, `7 % 2`, `2 ** 10`.

```python
# Explore these expressions:
print(10 / 3)    # float division
print(10 // 3)   # integer division
print(10 % 3)    # remainder
print(2 ** 8)    # exponent
```

### Assignment 3 — Due Week 4
Write `calculator.py` that:
- Asks the user for two numbers
- Prints the result of: addition, subtraction, multiplication, division, integer division, remainder, and the first number raised to the power of the second
- Handles the case where both numbers are provided as floats (use `float()` for input conversion)

### **Quiz 1 — End of Week 3**
**Topics:** Weeks 1–3 (setup, data types, variables, operators)
**Format:** 15 multiple-choice + 2 short answer questions (20 min)
**Sample Questions:**
- What data type does `input()` always return?
- What is the value of `17 % 5`?
- Write a line of code that stores the string "Python" in a variable called `language`.

---

## WEEK 4 — Conditional Statements

### Learning Objectives
- Write `if`, `elif`, and `else` statements
- Nest conditionals
- Understand truthy and falsy values

### Topics
- `if / elif / else` syntax
- Indentation rules (Python uses indentation, not braces)
- Nested conditionals
- Truthy/falsy values
- `in` operator for strings

### In-Class Activity
**"Choose Your Adventure"** — Students write a tiny text adventure. The program asks the user to choose a path (left or right), then a second choice, and prints one of four outcomes. Reinforces nested conditionals.

```python
direction = input("Go left or right? ").lower()
if direction == "left":
    item = input("Pick up sword or shield? ").lower()
    if item == "sword":
        print("You defeat the dragon!")
    else:
        print("You survive but retreat.")
elif direction == "right":
    print("You find a treasure chest!")
else:
    print("You stand still. Nothing happens.")
```

### Assignment 4 — Due Week 5
Write `grade_calculator.py` that:
- Asks the user to enter a numeric grade (0–100)
- Prints the letter grade (A: 90–100, B: 80–89, C: 70–79, D: 60–69, F: below 60)
- Prints "Invalid grade" if the input is outside 0–100
- Include a message like "Great job!" for A, "Keep it up!" for B/C, "See your professor." for D/F

---

## WEEK 5 — Loops: `for` and `while`

### Learning Objectives
- Use `for` loops to iterate over sequences and ranges
- Use `while` loops for condition-based repetition
- Control loops with `break` and `continue`

### Topics
- `for` loop with `range()`
- Iterating over a string
- `while` loop
- `break`, `continue`, `pass`
- Infinite loop prevention
- Loop counters and accumulators

### In-Class Activity
**"FizzBuzz"** — Classic CS exercise. Print numbers 1–50. For multiples of 3 print "Fizz", multiples of 5 print "Buzz", multiples of both print "FizzBuzz". Students first plan with pseudocode, then code.

```python
for i in range(1, 51):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```

### Assignment 5 — Due Week 6
Write `number_game.py` — a guessing game:
- The program picks a secret number between 1 and 20 (hard-code it for now, e.g., `secret = 13`)
- The user keeps guessing until they get it right
- After each wrong guess, print "Too high!" or "Too low!"
- When correct, print how many guesses it took
- Limit to 7 guesses; if they fail, reveal the number

---

## WEEK 6 — Functions

### Learning Objectives
- Define and call functions using `def`
- Understand parameters, arguments, and return values
- Recognize scope (local vs. global)

### Topics
- `def` keyword, function naming
- Parameters and default arguments
- `return` statement
- Scope: local vs. global variables
- Calling functions from functions
- Docstrings

### In-Class Activity
**"Function Factory"** — Students are given 3 small tasks (e.g., compute area of a circle, check if a number is even, convert Celsius to Fahrenheit) and must write each as its own function, then call all three in a `main()` function.

```python
def celsius_to_fahrenheit(celsius):
    """Convert Celsius to Fahrenheit."""
    return (celsius * 9/5) + 32

def main():
    temp_c = float(input("Enter temperature in Celsius: "))
    temp_f = celsius_to_fahrenheit(temp_c)
    print(f"{temp_c}°C = {temp_f}°F")

main()
```

### Assignment 6 — Due Week 7
Write `math_toolkit.py` with the following functions:
- `is_prime(n)` — returns `True` if `n` is prime, `False` otherwise
- `factorial(n)` — returns `n!` using a loop
- `celsius_to_fahrenheit(c)` and `fahrenheit_to_celsius(f)`
- A `main()` function that demonstrates all four with user input

### **Quiz 2 — End of Week 6**
**Topics:** Weeks 4–6 (conditionals, loops, functions)
**Format:** 10 multiple-choice + 3 code-writing questions (25 min)
**Sample Questions:**
- Write a while loop that prints all even numbers from 2 to 20.
- What is the difference between `break` and `continue`?
- Write a function `greet(name)` that returns "Hello, {name}!".

---

## WEEK 7 — Strings In Depth

### Learning Objectives
- Use common string methods
- Slice and index strings
- Format strings in multiple ways

### Topics
- String indexing and slicing (`s[0]`, `s[1:4]`, `s[-1]`)
- Common methods: `.upper()`, `.lower()`, `.strip()`, `.split()`, `.replace()`, `.find()`, `.count()`
- f-strings, `.format()`, `%` formatting
- String immutability
- Checking string properties: `.isdigit()`, `.isalpha()`, `.startswith()`

### In-Class Activity
**"String Surgeon"** — Given a messy string like `"  hElLo, wOrLd!  "`, students apply a chain of methods to clean and transform it step by step. Then build a simple word counter: split a sentence and count unique words.

```python
sentence = input("Enter a sentence: ")
words = sentence.lower().split()
print(f"Word count: {len(words)}")
print(f"Unique words: {len(set(words))}")
```

### Assignment 7 — Due Week 8
Write `text_analyzer.py` that:
- Asks the user to enter a sentence
- Reports: word count, character count (no spaces), the longest word, the number of vowels, and whether the sentence is a palindrome (ignoring spaces and case)

---

## WEEK 8 — Lists and Tuples + **Midterm Project**

### Learning Objectives
- Create, access, and modify lists
- Use list methods and list comprehensions
- Understand the difference between lists and tuples

### Topics
- List creation, indexing, slicing
- Methods: `.append()`, `.remove()`, `.pop()`, `.sort()`, `.reverse()`, `.index()`
- Iterating over lists
- Nested lists
- Tuples: immutability, when to use them
- List comprehensions (introduction)

### In-Class Activity
**"To-Do List App"** — Build a simple command-line to-do list. Users can add items, view all items, mark items done (remove), and quit. Uses a list to store tasks.

```python
tasks = []
while True:
    action = input("add / view / done / quit: ").lower()
    if action == "add":
        tasks.append(input("Task: "))
    elif action == "view":
        for i, task in enumerate(tasks, 1):
            print(f"{i}. {task}")
    elif action == "done":
        idx = int(input("Task # to remove: ")) - 1
        tasks.pop(idx)
    elif action == "quit":
        break
```

### Assignment 8 — Due Week 9
Write `list_stats.py` that:
- Asks the user to enter 10 numbers one at a time (store in a list)
- Computes and prints: minimum, maximum, sum, average, sorted list, and reversed list
- Bonus: use a list comprehension to create a new list of only the even numbers

---

### MIDTERM PROJECT — Due End of Week 8

**"Text-Based Adventure Game"**

Build an interactive, text-based game in Python using everything covered so far (variables, conditionals, loops, functions, strings, lists).

**Requirements:**
- At least 3 different "rooms" or scenes the player can navigate
- Player has an inventory (a list) — can pick up and drop items
- At least one puzzle or decision with consequences
- A win condition and a lose condition
- Organized using functions (at least 5 functions defined)
- Clean code with comments and a docstring for each function

**Grading Rubric:**
| Criterion | Points |
|---|---|
| Functionality (runs without errors) | 25 |
| Use of functions | 20 |
| Use of lists/strings/loops | 20 |
| Game logic and creativity | 20 |
| Code readability and comments | 15 |
| **Total** | **100** |

---

## WEEK 9 — Dictionaries and Sets

### Learning Objectives
- Create and use dictionaries to store key-value pairs
- Use dictionary methods
- Understand sets and set operations

### Topics
- Dictionary syntax `{key: value}`
- Accessing, adding, updating, deleting entries
- Methods: `.keys()`, `.values()`, `.items()`, `.get()`, `.update()`
- Iterating over dictionaries
- Sets: `{1, 2, 3}`, uniqueness, `.add()`, `.discard()`
- Set operations: union, intersection, difference

### In-Class Activity
**"Word Frequency Counter"** — Given a paragraph of text, count how many times each word appears using a dictionary. Then find the 3 most common words.

```python
text = "the cat sat on the mat the cat is fat"
freq = {}
for word in text.split():
    freq[word] = freq.get(word, 0) + 1

sorted_words = sorted(freq, key=freq.get, reverse=True)
print("Top 3 words:", sorted_words[:3])
```

### Assignment 9 — Due Week 10
Write `contact_book.py`:
- Store contacts as a dictionary of `{name: phone_number}`
- Allow the user to: add a contact, look up a contact by name, delete a contact, list all contacts, and quit
- If a name is not found, print "Contact not found."

---

## WEEK 10 — File Input/Output

### Learning Objectives
- Read from and write to text files
- Use `with` statements for safe file handling
- Parse simple file formats (CSV basics)

### Topics
- Opening files: `open()` with modes `"r"`, `"w"`, `"a"`
- `with open(...) as f:` pattern
- `.read()`, `.readline()`, `.readlines()`
- Writing with `.write()`
- Appending to files
- Reading and writing CSV files with the `csv` module
- `os.path.exists()` for safety

### In-Class Activity
**"Journal App"** — Write a program that appends journal entries (with timestamp) to a file called `journal.txt`, then reads and displays all past entries.

```python
from datetime import datetime

def add_entry(text):
    with open("journal.txt", "a") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {text}\n")

def view_entries():
    with open("journal.txt", "r") as f:
        print(f.read())
```

### Assignment 10 — Due Week 11
Write `grade_book.py` that:
- Reads student names and scores from a file `grades.txt` (you create a sample file)
- Computes each student's average
- Writes a summary report to `report.txt` showing name, average, and letter grade
- Prints confirmation when done

### **Quiz 3 — End of Week 10**
**Topics:** Weeks 7–10 (strings, lists, dictionaries, files)
**Format:** 10 multiple-choice + 4 code-writing questions (30 min)
**Sample Questions:**
- What is the difference between `.read()` and `.readlines()`?
- Write a dictionary that maps three countries to their capitals.
- What does `"w"` mode do if the file already exists?

---

## WEEK 11 — Error Handling and Exceptions

### Learning Objectives
- Understand what exceptions are and why they occur
- Use `try / except / finally` blocks
- Raise custom exceptions

### Topics
- Common exceptions: `ValueError`, `TypeError`, `FileNotFoundError`, `ZeroDivisionError`, `IndexError`, `KeyError`
- `try / except` block
- Catching specific vs. generic exceptions
- `else` and `finally` clauses
- `raise` statement
- Defensive programming habits

### In-Class Activity
**"Crash-Proof Calculator"** — Take the Week 3 calculator and add full error handling: handle non-numeric input, division by zero, and any unexpected errors. Test by intentionally entering bad data.

```python
try:
    a = float(input("Enter a number: "))
    b = float(input("Enter another number: "))
    print(a / b)
except ValueError:
    print("Error: Please enter valid numbers.")
except ZeroDivisionError:
    print("Error: Cannot divide by zero.")
finally:
    print("Calculation attempt complete.")
```

### Assignment 11 — Due Week 12
Revisit `contact_book.py` from Week 9 and add:
- `try/except` around all user input that expects numbers or specific formats
- A `FileNotFoundError` handler that creates the contacts file if it doesn't exist
- At least one custom `raise` for invalid data (e.g., blank name or phone number)

---

## WEEK 12 — Modules and the Standard Library

### Learning Objectives
- Import and use built-in Python modules
- Organize code into multiple files
- Install and use a third-party package with `pip`

### Topics
- `import` statement, `from ... import ...`, aliases (`as`)
- Useful standard library modules: `math`, `random`, `datetime`, `os`, `sys`, `time`
- Creating your own module (putting functions in a `.py` file and importing it)
- `pip` and `pip install` (introduction)
- Virtual environments (brief overview, why they matter)

### In-Class Activity
**"Random Utilities Playground"** — Students explore `math`, `random`, and `datetime` by writing a program that:
- Picks a random number
- Computes its square root with `math.sqrt()`
- Prints today's date formatted with `datetime`

```python
import math
import random
from datetime import datetime

num = random.randint(1, 100)
print(f"Random number: {num}")
print(f"Square root: {math.sqrt(num):.2f}")
print(f"Today is: {datetime.now().strftime('%B %d, %Y')}")
```

### Assignment 12 — Due Week 13
Write `utilities.py` as your own module containing at least 5 utility functions (e.g., `clamp(value, min, max)`, `is_palindrome(s)`, `roll_dice(sides)`). Then write `main.py` that imports from `utilities.py` and demonstrates all five functions. Use at least two standard library modules in your utility functions.

---

## WEEK 13 — Object-Oriented Programming: Introduction

### Learning Objectives
- Understand the concept of classes and objects
- Define classes with attributes and methods
- Use `__init__`, `self`, and instance methods

### Topics
- What is OOP and why does it matter?
- Defining a class with `class`
- `__init__` constructor
- `self` parameter
- Instance attributes and methods
- Creating and using objects
- `__str__` method for readable representation

### In-Class Activity
**"Build a `BankAccount` Class"** — Students implement a class together with: `balance`, `owner`, `deposit(amount)`, `withdraw(amount)`, and `__str__()`. Test by creating 2 accounts and running transactions.

```python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

    def withdraw(self, amount):
        if amount > self.balance:
            print("Insufficient funds.")
        else:
            self.balance -= amount

    def __str__(self):
        return f"{self.owner}'s account: ${self.balance:.2f}"
```

### Assignment 13 — Due Week 14
Create a `Student` class with:
- Attributes: `name`, `student_id`, `grades` (a list)
- Methods: `add_grade(score)`, `get_average()`, `get_letter_grade()`, `__str__()`
- Then write a program that creates at least 3 Student objects, adds grades, and prints a formatted report for each

---

## WEEK 14 — OOP: Inheritance and Encapsulation

### Learning Objectives
- Create subclasses that inherit from parent classes
- Override methods in subclasses
- Understand encapsulation with private attributes

### Topics
- Inheritance with `class Child(Parent):`
- `super().__init__()`
- Method overriding
- `isinstance()` and `issubclass()`
- Name mangling for "private" attributes (`__attribute`)
- Class vs. instance attributes
- Polymorphism (same method name, different behavior)

### In-Class Activity
**"Animal Kingdom"** — Build an `Animal` base class, then create `Dog`, `Cat`, and `Bird` subclasses. Each overrides a `speak()` method. Demonstrate polymorphism by putting all animals in a list and calling `speak()` on each.

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

class Dog(Animal):
    def speak(self):
        return f"{self.name} says: Woof!"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says: Meow!"

animals = [Dog("Rex"), Cat("Whiskers"), Dog("Buddy")]
for animal in animals:
    print(animal.speak())
```

### Assignment 14 — Due Week 15
Extend the `BankAccount` class from Week 13's activity:
- Create a `SavingsAccount` subclass with an `interest_rate` attribute and an `apply_interest()` method
- Create a `CheckingAccount` subclass with a `transaction_fee` that is deducted on each withdrawal
- Write a program that creates one of each account type and runs 5+ transactions, printing the balance after each

### **Quiz 4 — End of Week 14**
**Topics:** Weeks 11–14 (exceptions, modules, OOP)
**Format:** 10 multiple-choice + 3 code-writing questions (30 min)
**Sample Questions:**
- What does `super().__init__()` do?
- Write a class `Rectangle` with `width`, `height`, an `area()` method, and `__str__()`.
- What is the difference between a class attribute and an instance attribute?

---

## WEEK 15 — Final Project Workshop & Review

### Learning Objectives
- Apply the full course curriculum to a larger project
- Debug and refine code independently
- Give and receive peer feedback

### Topics
- Final project work time (guided)
- Common debugging strategies: print debugging, reading tracebacks, using VS Code's debugger
- Code review best practices
- Q&A and exam review

### In-Class Activity
**"Peer Code Review"** — Students share their in-progress final projects (or a portion) with a partner. Partners complete a structured review form:
1. Does the code run? What errors occur?
2. Is the code readable? Are variables named clearly?
3. Are there any obvious bugs or edge cases missed?
4. What is one thing you liked about the code?

### Assignment 15 — Due Week 16
**Final Project Checkpoint:** Submit your final project in its current state along with:
- A short description of what your project does
- A list of features that are complete and features still in progress
- Any questions you have for the instructor

*(This is graded on completion/effort, not correctness — it is a progress check.)*

---

## WEEK 16 — Final Project Presentations & Final Exam

### Final Exam

**Format:** 60 minutes
**Sections:**
1. **Multiple Choice** (20 questions, 1 pt each) — Covers all topics
2. **Code Reading** (10 pts) — Read a program and answer questions about its output/behavior
3. **Bug Fix** (10 pts) — Given a buggy program, identify and fix 3–5 errors
4. **Code Writing** (20 pts) — Write two short programs from scratch (one using functions, one using a class)

**Topics Covered:** All 16 weeks — setup through OOP

---

### Final Project

**"Build Something You Care About"**

Students build and present a Python application of their choice. Projects must be meaningful, complete, and demonstrate skills from the course.

**Project Ideas (students may propose their own):**
- A quiz game with a high score tracker (file I/O)
- A contact manager with CSV storage
- A simple calculator with history log
- A weather data analyzer (reads a CSV dataset)
- A flashcard study tool
- A personal expense tracker

**Requirements:**
- At least 150 lines of meaningful Python code
- Uses at least: functions, one data structure (list or dict), file I/O, and error handling
- Bonus points for using OOP (at least one class)
- A `README.txt` describing the project and how to run it

**Final Presentation (Week 16, in-class):**
Each student gets 5 minutes to demo their project and explain:
- What the program does
- One challenge they overcame
- One thing they would add with more time

**Grading Rubric:**
| Criterion | Points |
|---|---|
| Functionality (works as described) | 30 |
| Code quality (readable, organized, commented) | 20 |
| Use of course concepts | 25 |
| README / documentation | 10 |
| Presentation | 15 |
| **Total** | **100** |

---

## Course Schedule Summary

| Week | Topic | Assignment | Assessment |
|---|---|---|---|
| 1 | Setup & Hello World | A1: introduction.py | — |
| 2 | Variables & Data Types | A2: user_profile.py | — |
| 3 | Operators & Expressions | A3: calculator.py | **Quiz 1** |
| 4 | Conditionals | A4: grade_calculator.py | — |
| 5 | Loops | A5: number_game.py | — |
| 6 | Functions | A6: math_toolkit.py | **Quiz 2** |
| 7 | Strings In Depth | A7: text_analyzer.py | — |
| 8 | Lists & Tuples | A8: list_stats.py | **Midterm Project** |
| 9 | Dictionaries & Sets | A9: contact_book.py | — |
| 10 | File I/O | A10: grade_book.py | **Quiz 3** |
| 11 | Error Handling | A11: contact_book (revised) | — |
| 12 | Modules & Libraries | A12: utilities.py | — |
| 13 | OOP Introduction | A13: Student class | — |
| 14 | OOP Inheritance | A14: BankAccount hierarchy | **Quiz 4** |
| 15 | Project Workshop & Review | A15: Project Checkpoint | — |
| 16 | Presentations & Final Exam | Final Project Due | **Final Exam** |

---

## Recommended Resources

- **Official Docs:** https://docs.python.org/3/
- **Free Tutorial:** https://www.learnpython.org/
- **Practice Problems:** https://www.codewars.com (filter: Python, Beginner)
- **Visual Debugger:** https://pythontutor.com (paste code, step through visually)
- **VS Code Python Tutorial:** https://code.visualstudio.com/docs/python/python-tutorial

---

*Course designed for 16 weeks of instruction. All activities, assignments, and assessments may be adjusted based on class pace and student needs.*
