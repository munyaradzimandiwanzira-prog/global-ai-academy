---
id: python
title: Python
short: PYTHON
category: languages
level: beginner
language: python
color: "#3776AB"
icon: "🐍"
order: 20
summary: The language of AI, data science and automation — and the best first language. Learn Python from your first print() to classes, files and a real project.
tags: [python, programming, beginner, ai, data, automation]
---

# Python Introduction {#intro}

**Python** is a popular programming language created by Guido van Rossum and first released in 1991. Today it is one of the most used languages in the world.

Python is used for:

- **Artificial intelligence and machine learning** — almost every AI library (PyTorch, scikit-learn, LangChain, Hugging Face) is Python first.
- **Data science** — cleaning, analysing and charting data with pandas and matplotlib.
- **Web development** — server-side apps with Django, Flask and FastAPI.
- **Automation** — scripts that rename files, fill spreadsheets or send reports.
- **Science and engineering** — from physics simulations to Raspberry Pi robots.

## Why Python?

- It reads almost like English, so beginners learn it quickly.
- Programs are short: you write fewer lines than in Java or C++.
- It runs on Windows, macOS, Linux and even phones and microcontrollers.
- It has a huge community and free libraries for nearly everything.

```python run title="Your first Python program"
print("Mhoro! Python is ready.")
print("2 + 3 =", 2 + 3)
```

## Python syntax compared to other languages

Python uses **new lines** to finish a command, where many languages use semicolons. It uses **indentation** (spaces at the start of a line) to group code, where other languages use curly brackets `{ }`.

```python run title="Indentation groups code"
temperature = 31
if temperature > 30:
    print("It's hot in Harare today!")
    print("Drink some water.")
print("This line always runs.")
```

> We use **Python 3** throughout. Python 2 is old and no longer supported.

```quiz
- q: Which of these is Python widely used for?
  options: ["Only video games", "AI, data science, web and automation", "Only phone apps", "Only spreadsheets"]
  answer: 1
- q: How does Python group lines of code together?
  options: ["Curly brackets", "Indentation", "Semicolons", "Capital letters"]
  answer: 1
```

# Get Started {#get-started}

You can run Python in three ways.

## 1. Right here in the browser

Every example on this site runs Python in your browser. This is the quickest way to practise — perfect on a phone or a shared computer.

## 2. Install Python on your computer

1. Go to **python.org/downloads** and download Python 3 for your computer.
2. **Windows:** tick **"Add python.exe to PATH"** on the first installer screen, then click Install.
3. Open a terminal (Command Prompt / PowerShell on Windows, Terminal on Mac/Linux) and type:

```bash
python --version
```

On macOS and Linux the command may be `python3 --version`. You should see something like `Python 3.12.4`.

## 3. Write a .py file in VS Code

1. Install **Visual Studio Code** and the **Python** extension (see our [VS Code track](/learn/vscode)).
2. Create a file called `hello.py`:

```python
print("Hello from my computer!")
```

3. Run it from the terminal:

```bash
python hello.py
```

## The Python shell (REPL)

Type `python` (or `python3`) on its own to open an interactive shell. Each line runs immediately — handy for quick experiments:

```text
>>> 7 * 6
42
>>> "Zim" + "babwe"
'Zimbabwe'
>>> exit()
```

```exercise
prompt: Complete the command that runs a Python file called hello.py from the terminal.
lang: bash
code: |
  ___ hello.py
answers: [[python, python3, py]]
```

# Python Syntax {#syntax}

## Indentation

Indentation is the space at the start of a line. In Python it is **required**, not just for looks. Use 4 spaces (VS Code does this when you press Tab).

```python run title="Correct indentation"
if 5 > 2:
    print("Five is greater than two!")
```

If you forget it, Python stops with an `IndentationError`:

```python run title="Try it: this has an error"
if 5 > 2:
print("Five is greater than two!")
```

## Comments

Comments start with `#`. Python ignores them — they are notes for humans.

```python run
# This program greets a learner
print("Welcome!")  # comments can go at the end of a line too

"""
Text in triple quotes that isn't assigned to anything
also works as a multi-line comment.
"""
```

## Case sensitivity

Python is **case-sensitive**: `print`, `Print` and `PRINT` are three different words, and only `print` exists.

```exercise
prompt: Insert the missing character to turn the first line into a comment.
code: |
  ___ This is a comment
  print("Hello")
answers: ["#"]
```

```quiz
- q: Which symbol starts a comment in Python?
  options: ["//", "#", "<!--", "--"]
  answer: 1
- q: What happens if the body of an if statement is not indented?
  options: ["It runs normally", "Python raises an IndentationError", "It is skipped", "It prints a warning only"]
  answer: 1
```

# Variables {#variables}

A **variable** is a name that stores a value. You create one the moment you assign to it with `=`.

```python run
learner = "Tendai"
age = 17
height_m = 1.72
print(learner, age, height_m)
```

## Variables can change

```python run
bundle_mb = 500
print("Data left:", bundle_mb)
bundle_mb = bundle_mb - 120
print("After watching a video:", bundle_mb)
```

## Naming rules

- Must start with a letter or underscore: `name`, `_count`.
- Can contain letters, numbers and underscores: `score2`, `total_price`.
- Cannot start with a number (`2score` is invalid) or contain spaces or hyphens.
- Are case-sensitive: `age`, `Age` and `AGE` are different variables.

Python programmers use **snake_case**: lowercase words joined by underscores, like `exam_score`.

## Many values at once

```python run
province, capital = "Manicaland", "Mutare"
x = y = z = 0
print(province, capital, x, y, z)
```

## Casting and checking type

```python run
a = str(3)    # '3'
b = int("42") # 42
c = float(7)  # 7.0
print(a, b, c)
print(type(a), type(b), type(c))
```

```exercise
prompt: Create a variable called city and give it the value "Gweru".
code: |
  ___ = "Gweru"
  print(city)
answers: [city]
```

````challenge
id: py-variables-swap
title: Swap the values
difficulty: easy
prompt: |
  The variables `morning` and `evening` hold the wrong shifts. **Swap their values** so that `morning` becomes `"Tafadzwa"` and `evening` becomes `"Rumbi"`.

  Python has a neat one-line way to swap — but any correct way is fine.
starter: |
  morning = "Rumbi"
  evening = "Tafadzwa"

  # swap them here

  print("Morning shift:", morning)
  print("Evening shift:", evening)
tests: |
  assert morning == "Tafadzwa", f"morning should be 'Tafadzwa' but it is {morning!r}"
  assert evening == "Rumbi", f"evening should be 'Rumbi' but it is {evening!r}"
````

# Data Types {#data-types}

Every value in Python has a **type**. The type decides what you can do with it.

| Category | Types | Example |
|---|---|---|
| Text | `str` | `"Bulawayo"` |
| Numbers | `int`, `float`, `complex` | `42`, `3.14`, `2j` |
| Sequences | `list`, `tuple`, `range` | `[1, 2]`, `(1, 2)`, `range(5)` |
| Mapping | `dict` | `{"name": "Rudo"}` |
| Sets | `set`, `frozenset` | `{"a", "b"}` |
| Boolean | `bool` | `True`, `False` |
| None | `NoneType` | `None` |

```python run title="Check the type of anything"
values = ["Kariba", 1959, 5.5, True, None, [1, 2, 3], {"lake": "Kariba"}]
for v in values:
    print(repr(v), "->", type(v).__name__)
```

`None` means "no value yet" — for example, an exam score before the exam is marked.

```quiz
- q: What is the type of `3.0`?
  options: ["int", "float", "str", "bool"]
  answer: 1
- q: What type is `"25"` (with quotes)?
  options: ["int", "float", "str", "bool"]
  answer: 2
  explain: Anything in quotes is a string, even if it looks like a number.
```

# Numbers and Math {#numbers}

Python has three number types: `int` (whole numbers), `float` (decimals) and `complex`.

```python run
students = 40          # int
fee = 35.50            # float
print(students * fee)  # total fees
```

## Arithmetic operators

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+` | add | `7 + 2` | `9` |
| `-` | subtract | `7 - 2` | `5` |
| `*` | multiply | `7 * 2` | `14` |
| `/` | divide | `7 / 2` | `3.5` |
| `//` | floor divide | `7 // 2` | `3` |
| `%` | remainder (modulus) | `7 % 2` | `1` |
| `**` | power | `7 ** 2` | `49` |

```python run title="Sharing sweets"
sweets = 23
children = 5
print("Each child gets", sweets // children)
print("Left over:", sweets % children)
```

## Rounding and the math module

```python run
import math
price = 12.4567
print(round(price, 2))
print(math.sqrt(144))
print(math.pi)
print(math.ceil(4.1), math.floor(4.9))
```

## Random numbers

```python run
import random
print("Dice roll:", random.randint(1, 6))
print("Lucky learner:", random.choice(["Chipo", "Sipho", "Nyasha", "Thabo"]))
```

```exercise
prompt: Use the operator that gives the remainder of 10 divided by 3.
code: |
  print(10 ___ 3)
answers: ["%"]
```

````challenge
id: py-numbers-change
title: Kombi fare change
difficulty: easy
prompt: |
  A kombi fare is **$1**. Write a function `change(paid, passengers)` that returns how much change the conductor must give back.

  Examples:
  - `change(5, 3)` → `2`
  - `change(10, 10)` → `0`
starter: |
  def change(paid, passengers):
      # your code here
      pass

  print(change(5, 3))
tests: |
  assert change(5, 3) == 2, "change(5, 3) should be 2"
  assert change(10, 10) == 0, "change(10, 10) should be 0"
  assert change(20, 7) == 13, "change(20, 7) should be 13"
````

# Strings {#strings}

A **string** is text inside single `'...'` or double `"..."` quotes.

```python run
school = "Prince Edward"
motto = 'Learn by doing'
poem = """Many lines
of text
are fine too."""
print(school, "-", motto)
print(poem)
```

## Strings are sequences

You can get characters by **index** (counting from 0) and **slice** a part:

```python run
word = "Zimbabwe"
print(word[0])     # Z
print(word[-1])    # e  (negative counts from the end)
print(word[0:3])   # Zim
print(len(word))   # 8
```

## Useful string methods

```python run
name = "  tatenda moyo  "
print(name.strip())            # remove spaces at the ends
print(name.strip().title())    # Tatenda Moyo
print(name.upper())
print("moyo" in name)          # True
print("Harare,Bulawayo,Mutare".split(","))
print("Mbare".replace("M", "B"))
```

## f-strings: putting values into text

The easiest way to build text from variables is an **f-string** — put `f` before the quotes and variables in `{ }`:

```python run
name = "Nyasha"
score = 87.456
print(f"{name} scored {score:.1f}% in the mock exam")
print(f"Next year {name} will be {16 + 1}")
```

## Escape characters

Use a backslash for special characters: `\n` new line, `\t` tab, `\"` a quote.

```python run
print("Line one\nLine two")
print("She said \"Mhoro!\"")
```

```exercise
prompt: Complete the f-string so it prints "Hello, Rudo".
code: |
  name = "Rudo"
  print(___"Hello, {name}")
answers: [f]
```

````challenge
id: py-strings-initials
title: Make initials
difficulty: easy
prompt: |
  Write a function `initials(full_name)` that returns the initials of a name in **capital letters, separated by dots**, ending with a dot.

  - `initials("tendai moyo")` → `"T.M."`
  - `initials("Nokuthula Grace Khumalo")` → `"N.G.K."`
starter: |
  def initials(full_name):
      # Hint: split the name into words, then take the first letter of each
      pass

  print(initials("tendai moyo"))
tests: |
  assert initials("tendai moyo") == "T.M.", f"Expected 'T.M.' but got {initials('tendai moyo')!r}"
  assert initials("Nokuthula Grace Khumalo") == "N.G.K."
  assert initials("farai") == "F."
````

# Booleans and Comparisons {#booleans}

A **boolean** is either `True` or `False`. Comparisons produce booleans.

```python run
print(10 > 9)
print(10 == 9)
print("harare" == "Harare")
```

| Operator | Meaning |
|---|---|
| `==` | equal to |
| `!=` | not equal to |
| `>` / `<` | greater / less than |
| `>=` / `<=` | greater / less than or equal |

## Combining conditions

Use `and`, `or` and `not`:

```python run
age = 16
has_id = True
print(age >= 16 and has_id)   # both must be True
print(age < 13 or has_id)     # at least one True
print(not has_id)
```

## Truthy and falsy

Empty values count as `False`: `0`, `""`, `[]`, `{}` and `None`. Everything else counts as `True`.

```python run
print(bool(0), bool(""), bool([]), bool(None))
print(bool(5), bool("hi"), bool([0]))
```

```quiz
- q: What does `5 != 5` give?
  options: ["True", "False", "5", "Error"]
  answer: 1
- q: Which value is falsy?
  options: ['"0"', "[0]", '""', "1"]
  answer: 2
  explain: An empty string is falsy. "0" is a non-empty string, so it is truthy.
```

# Lists {#lists}

A **list** stores many values in order. Lists use square brackets and can be changed.

```python run
cities = ["Harare", "Bulawayo", "Mutare"]
print(cities)
print(cities[0])
print(len(cities))
```

## Changing lists

```python run
cities = ["Harare", "Bulawayo", "Mutare"]
cities.append("Gweru")          # add to the end
cities.insert(1, "Chitungwiza") # add at position 1
cities.remove("Mutare")         # remove by value
last = cities.pop()             # remove and return the last item
print(cities, "| removed:", last)
cities[0] = "HARARE"            # replace
print(cities)
```

## Looping, sorting and checking

```python run
scores = [72, 45, 88, 91, 60]
scores.sort()
print("Sorted:", scores)
print("Highest:", max(scores), "Lowest:", min(scores))
print("Average:", sum(scores) / len(scores))
print(88 in scores)
for s in scores:
    print("Score:", s)
```

## Slicing

```python run
months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
print(months[1:4])  # Feb, Mar, Apr
print(months[:2])   # first two
print(months[-2:])  # last two
```

```exercise
prompt: Add "Kariba" to the end of the list.
code: |
  towns = ["Hwange", "Chinhoyi"]
  towns.___("Kariba")
answers: [append]
```

````challenge
id: py-lists-above-average
title: Above average
difficulty: medium
prompt: |
  Write a function `above_average(marks)` that returns a **new list** with only the marks that are **greater than the average** of the list, in their original order.

  `above_average([50, 70, 90])` → `[90]` (the average is 70)
starter: |
  def above_average(marks):
      pass

  print(above_average([50, 70, 90]))
tests: |
  assert above_average([50, 70, 90]) == [90], f"got {above_average([50, 70, 90])}"
  assert above_average([10, 20, 30, 40]) == [30, 40]
  assert above_average([5, 5, 5]) == [], "When all marks are equal, none is above average"
````

# Tuples and Sets {#tuples-sets}

## Tuples

A **tuple** is like a list but **cannot be changed** after it is created. Use round brackets. Tuples are good for fixed data like coordinates.

```python run
victoria_falls = (-17.9243, 25.8572)   # latitude, longitude
lat, lon = victoria_falls               # unpacking
print(f"Latitude {lat}, longitude {lon}")
```

## Sets

A **set** holds **unique** values with no order. Duplicates disappear automatically.

```python run
visitors = ["Rudo", "Sipho", "Rudo", "Chipo", "Sipho"]
unique = set(visitors)
print(unique, len(unique))

python_class = {"Rudo", "Sipho", "Farai"}
web_class = {"Sipho", "Chipo"}
print("In both:", python_class & web_class)
print("In either:", python_class | web_class)
print("Only Python:", python_class - web_class)
```

```quiz
- q: Which collection cannot be changed after it is created?
  options: ["list", "tuple", "set", "dict"]
  answer: 1
- q: What does `len(set([1, 1, 2, 3, 3]))` return?
  options: ["5", "3", "2", "1"]
  answer: 1
```

# Dictionaries {#dictionaries}

A **dictionary** stores **key: value** pairs — like a contact list where you look up a name to get a number.

```python run
learner = {
    "name": "Thandiwe",
    "age": 15,
    "school": "Mzilikazi High",
    "subjects": ["Maths", "Computer Science"],
}
print(learner["name"])
print(learner.get("phone", "no phone saved"))
```

## Adding, changing and removing

```python run
prices = {"bread": 1.00, "milk": 1.20}
prices["sugar"] = 2.80       # add
prices["bread"] = 1.10       # change
del prices["milk"]           # remove
print(prices)
```

## Looping through a dictionary

```python run
stock = {"Roller meal": 40, "Cooking oil": 12, "Sugar": 0}
for item, qty in stock.items():
    status = "OUT OF STOCK" if qty == 0 else f"{qty} left"
    print(f"{item}: {status}")
```

```exercise
prompt: Get the value stored under the key "capital".
code: |
  country = {"name": "Zimbabwe", "capital": "Harare"}
  print(country[___])
answers: [['"capital"', "'capital'"]]
```

````challenge
id: py-dict-word-count
title: Count the words
difficulty: medium
prompt: |
  Write `word_count(text)` that returns a dictionary counting how many times each word appears. Treat words **case-insensitively** (convert to lowercase).

  `word_count("Shinga shinga Zimbabwe")` → `{"shinga": 2, "zimbabwe": 1}`
starter: |
  def word_count(text):
      counts = {}
      # your code here
      return counts

  print(word_count("Shinga shinga Zimbabwe"))
tests: |
  assert word_count("Shinga shinga Zimbabwe") == {"shinga": 2, "zimbabwe": 1}, f"got {word_count('Shinga shinga Zimbabwe')}"
  assert word_count("a b a c a") == {"a": 3, "b": 1, "c": 1}
  assert word_count("") == {}
````

# If ... Else {#if-else}

Programs make decisions with `if`, `elif` (else if) and `else`.

```python run
mark = 67
if mark >= 75:
    grade = "A"
elif mark >= 65:
    grade = "B"
elif mark >= 50:
    grade = "C"
else:
    grade = "U"
print(f"A mark of {mark} is grade {grade}")
```

## Short forms

```python run
temp = 34
print("Hot" if temp > 30 else "Pleasant")
```

## Nested conditions

```python run
has_ticket = True
age = 10
if has_ticket:
    if age < 12:
        print("Child ticket accepted")
    else:
        print("Adult ticket accepted")
else:
    print("Please buy a ticket")
```

## The match statement (Python 3.10+)

```python run
day = "Sat"
match day:
    case "Sat" | "Sun":
        print("Weekend — time for a coding project!")
    case _:
        print("School day")
```

```exercise
prompt: Complete the keyword for "else if".
code: |
  if x > 10:
      print("big")
  ___ x > 5:
      print("medium")
  else:
      print("small")
answers: [elif]
```

````challenge
id: py-if-zesa
title: Electricity units
difficulty: medium
prompt: |
  A (made-up) electricity tariff charges:
  - **$0.05** per unit for the first **50** units,
  - **$0.10** per unit for any units **above 50**.

  Write `bill(units)` that returns the total cost, rounded to 2 decimal places.

  `bill(40)` → `2.0`, `bill(70)` → `4.5`
starter: |
  def bill(units):
      pass

  print(bill(70))
tests: |
  assert bill(40) == 2.0, f"bill(40) should be 2.0, got {bill(40)}"
  assert bill(50) == 2.5, f"bill(50) should be 2.5, got {bill(50)}"
  assert bill(70) == 4.5, f"bill(70) should be 4.5, got {bill(70)}"
  assert bill(0) == 0
````

# While Loops {#while-loops}

A `while` loop repeats as long as its condition is `True`.

```python run
countdown = 5
while countdown > 0:
    print(countdown)
    countdown -= 1
print("Lift off! 🚀")
```

> Always make sure something inside the loop changes so the condition eventually becomes `False` — otherwise you get an **infinite loop**. (Our editor stops runaway programs after 10 seconds.)

## break and continue

```python run
savings = 0
week = 0
while True:
    week += 1
    savings += 15
    if savings >= 100:
        break
print(f"You reach $100 after {week} weeks")

n = 0
while n < 10:
    n += 1
    if n % 2 == 0:
        continue   # skip even numbers
    print(n)
```

```quiz
- q: What does `break` do inside a loop?
  options: ["Skips to the next iteration", "Stops the loop completely", "Pauses the program", "Restarts the loop"]
  answer: 1
```

# For Loops {#for-loops}

A `for` loop goes through each item in a sequence.

```python run
for city in ["Harare", "Bulawayo", "Mutare"]:
    print("Hello,", city)
```

## range()

`range(n)` gives the numbers 0 to n-1. `range(start, stop, step)` gives more control.

```python run
for i in range(5):
    print(i, end=" ")
print()
for i in range(2, 21, 4):
    print(i, end=" ")
print()
```

## enumerate() and zip()

```python run
learners = ["Chipo", "Sipho", "Farai"]
marks = [81, 74, 90]
for position, name in enumerate(learners, start=1):
    print(position, name)
for name, mark in zip(learners, marks):
    print(f"{name}: {mark}")
```

## Nested loops

```python run title="Times table"
for row in range(1, 4):
    for col in range(1, 4):
        print(row * col, end="\t")
    print()
```

```exercise
prompt: Complete the loop so it prints the numbers 0 to 4.
code: |
  for i in ___(5):
      print(i)
answers: [range]
```

````challenge
id: py-for-fizzbuzz
title: FizzBuzz (a classic interview question)
difficulty: medium
prompt: |
  Print the numbers from **1 to 15**, one per line, but:
  - print `Fizz` instead of numbers divisible by 3,
  - print `Buzz` instead of numbers divisible by 5,
  - print `FizzBuzz` for numbers divisible by both.
starter: |
  for n in range(1, 16):
      pass
expectedOutput: |
  1
  2
  Fizz
  4
  Buzz
  Fizz
  7
  8
  Fizz
  Buzz
  11
  Fizz
  13
  14
  FizzBuzz
````

# Functions {#functions}

A **function** is a named block of code you can run whenever you need it. Define it with `def`.

> **Go deeper.** The **[Functions in Depth](/learn/python-functions)** track covers every parameter kind, closures, decorators, generators, recursion, type hints and async; **[Pydantic in Depth](/learn/pydantic)** shows how to validate data at the boundaries of your programs.

```python run
def greet(name):
    print(f"Mhoro, {name}!")

greet("Tariro")
greet("Sipho")
```

## Returning values

```python run
def vat(amount, rate=0.15):
    """Return the VAT on an amount (15% by default)."""
    return round(amount * rate, 2)

print(vat(100))
print(vat(100, rate=0.10))
```

## Parameters

- **Default values** — `rate=0.15` is used if you don't pass a rate.
- **Keyword arguments** — `vat(amount=50, rate=0.1)` makes calls clearer.
- **Any number of arguments** — `*args` collects extra positional values, `**kwargs` collects named ones.

```python run
def total(*amounts):
    return sum(amounts)

def profile(**info):
    for key, value in info.items():
        print(f"{key}: {value}")

print(total(5, 10, 2.5))
profile(name="Rudo", city="Masvingo", track="Python")
```

## Why functions?

Functions let you **reuse** code, give a **name** to an idea, and **test** small pieces separately. Professional code is built from many small functions.

```exercise
prompt: Complete the keyword used to send a value back from a function.
code: |
  def double(x):
      ___ x * 2
answers: [return]
```

````challenge
id: py-functions-is-leap
title: Leap years
difficulty: medium
prompt: |
  Write `is_leap(year)` that returns `True` if the year is a leap year:
  - divisible by 4, **except**
  - years divisible by 100 are **not** leap years, **unless**
  - they are also divisible by 400.

  `is_leap(2024)` → `True`, `is_leap(1900)` → `False`, `is_leap(2000)` → `True`
starter: |
  def is_leap(year):
      pass
tests: |
  for y, expected in [(2024, True), (2023, False), (1900, False), (2000, True), (1980, True)]:
      assert is_leap(y) == expected, f"is_leap({y}) should be {expected}"
````

# Scope and Lambda {#scope-lambda}

## Scope

A variable created inside a function only exists inside that function (**local scope**). Variables created outside are **global**.

```python run
rate = 26.8   # global

def to_zig(usd):
    result = usd * rate   # result is local
    return result

print(to_zig(10))
# print(result)  # would fail: result only exists inside to_zig
```

## Lambda functions

A **lambda** is a tiny, unnamed function written in one line. They're handy for sorting.

```python run
square = lambda x: x * x
print(square(9))

learners = [("Chipo", 81), ("Sipho", 74), ("Farai", 90)]
learners.sort(key=lambda pair: pair[1], reverse=True)
print(learners)
```

```quiz
- q: Where can a variable created inside a function be used?
  options: ["Anywhere in the program", "Only inside that function", "Only after the function ends", "In other files"]
  answer: 1
- q: "What does `(lambda x: x + 1)(4)` return?"
  options: ["4", "5", "x + 1", "Error"]
  answer: 1
```

# Errors and Try/Except {#errors}

Errors (called **exceptions**) stop your program. You can **catch** them with `try` / `except` so your program can recover.

```python run
try:
    number = int("twelve")
except ValueError:
    print("That isn't a number. Please type digits like 12.")
```

## Common errors

| Error | Usual cause |
|---|---|
| `SyntaxError` | A typo in the code: missing `:` or bracket |
| `NameError` | Using a variable that doesn't exist (often a spelling mistake) |
| `TypeError` | Mixing types, e.g. `"5" + 5` |
| `IndexError` | List position that doesn't exist |
| `KeyError` | Dictionary key that doesn't exist |
| `ZeroDivisionError` | Dividing by zero |

```python run title="else and finally"
def safe_divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("Cannot divide by zero")
        return None
    else:
        return result
    finally:
        print("Calculation attempted")

print(safe_divide(10, 2))
print(safe_divide(10, 0))
```

## Raising your own errors

```python run
def set_age(age):
    if age < 0:
        raise ValueError("Age cannot be negative")
    return age

try:
    set_age(-3)
except ValueError as e:
    print("Error:", e)
```

````challenge
id: py-errors-safe-int
title: Safe number reader
difficulty: easy
prompt: |
  Write `to_number(text)` that converts text to an `int`. If the text is not a valid whole number, return `0` instead of crashing.

  `to_number("42")` → `42`, `to_number("forty")` → `0`
starter: |
  def to_number(text):
      pass
tests: |
  assert to_number("42") == 42
  assert to_number("forty") == 0, "Invalid text should return 0"
  assert to_number("-7") == -7
  assert to_number("") == 0
````

# Modules and pip {#modules}

A **module** is a file of Python code you can reuse. Python comes with a large **standard library** of modules.

```python run
import math
from datetime import date
import statistics as stats

print(math.factorial(5))
print(date.today().year)
print(stats.mean([60, 75, 90]))
```

## Your own modules

If you save functions in `helpers.py`, another file in the same folder can use them:

```python
# helpers.py
def greet(name):
    return f"Mhoro, {name}!"
```

```python
# main.py
from helpers import greet
print(greet("Kudzai"))
```

## Installing packages with pip

**pip** downloads packages from PyPI, the Python Package Index (over 500,000 packages).

```bash
pip install requests
pip install pandas matplotlib
pip list
```

> **Use a virtual environment** for each project so packages don't clash:
>
> `python -m venv .venv` then activate it — `.venv\Scripts\activate` on Windows or `source .venv/bin/activate` on Mac/Linux.

In this browser editor, popular packages like `numpy` and `pandas` install automatically when you import them:

```python run title="NumPy in your browser"
import numpy as np
rainfall_mm = np.array([190, 170, 90, 30, 5, 0])
print("Total:", rainfall_mm.sum(), "mm")
print("Wettest month index:", rainfall_mm.argmax())
```

```quiz
- q: Which command installs a package from PyPI?
  options: ["python get requests", "pip install requests", "import requests", "npm install requests"]
  answer: 1
```

# File Handling {#files}

Programs often read and write files. Use `open()` with a **mode**: `"r"` read, `"w"` write (replaces), `"a"` append.

The `with` statement closes the file for you automatically.

```python run
with open("shopping.txt", "w") as f:
    f.write("Roller meal\n")
    f.write("Cooking oil\n")

with open("shopping.txt", "a") as f:
    f.write("Sugar\n")

with open("shopping.txt") as f:
    for line in f:
        print("-", line.strip())
```

## CSV files

CSV (comma-separated values) is the most common way to share table data — every spreadsheet can save it.

```python run
import csv

rows = [["name", "town", "score"], ["Chipo", "Harare", 81], ["Sipho", "Bulawayo", 74]]
with open("results.csv", "w", newline="") as f:
    csv.writer(f).writerows(rows)

with open("results.csv") as f:
    for record in csv.DictReader(f):
        print(record["name"], "from", record["town"], "scored", record["score"])
```

> The browser editor has a temporary file system — files disappear when you reload. On your own computer they are saved to disk.

```exercise
prompt: Complete the mode to add to the end of a file without deleting what is already there.
code: |
  with open("log.txt", ___) as f:
      f.write("new line\n")
answers: [['"a"', "'a'"]]
```

# Classes and Objects {#classes}

Python is **object-oriented**. A **class** is a blueprint; an **object** is something built from it.

```python run
class Learner:
    def __init__(self, name, city):
        self.name = name
        self.city = city
        self.xp = 0

    def complete_lesson(self, points=10):
        self.xp += points
        return f"{self.name} now has {self.xp} XP"

chipo = Learner("Chipo", "Harare")
sipho = Learner("Sipho", "Bulawayo")
print(chipo.complete_lesson())
print(chipo.complete_lesson(25))
print(sipho.name, sipho.xp)
```

- `__init__` runs when an object is created and sets its starting data.
- `self` refers to the object itself.
- Functions inside a class are called **methods**.

## A nicer printout with __str__

```python run
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price

    def __str__(self):
        return f"{self.name} (${self.price:.2f})"

print(Product("Solar lantern", 15))
```

````challenge
id: py-classes-account
title: Mobile wallet
difficulty: medium
prompt: |
  Create a class `Wallet` with:
  - a `balance` attribute that starts at `0`,
  - a method `deposit(amount)` that adds to the balance,
  - a method `send(amount)` that subtracts from the balance **only if there is enough money** and returns `True`; otherwise it leaves the balance unchanged and returns `False`.
starter: |
  class Wallet:
      def __init__(self):
          pass

  w = Wallet()
  w.deposit(20)
  print(w.send(5), w.balance)
tests: |
  w = Wallet()
  assert w.balance == 0, "A new wallet should have a balance of 0"
  w.deposit(20)
  assert w.balance == 20
  assert w.send(5) is True and w.balance == 15, "Sending 5 from 20 should succeed and leave 15"
  assert w.send(100) is False and w.balance == 15, "Sending more than the balance should fail and change nothing"
````

# Inheritance {#inheritance}

**Inheritance** lets a class reuse another class's code and add its own.

```python run
class Vehicle:
    def __init__(self, name, seats):
        self.name = name
        self.seats = seats

    def describe(self):
        return f"{self.name} with {self.seats} seats"

class Kombi(Vehicle):
    def __init__(self, route):
        super().__init__("Kombi", 15)
        self.route = route

    def describe(self):   # override
        return super().describe() + f" on the {self.route} route"

print(Vehicle("Bicycle", 1).describe())
print(Kombi("Town–Mbare").describe())
```

`super()` calls the parent class. A child class can **override** a method by defining one with the same name.

```quiz
- q: What does `super().__init__(...)` do?
  options: ["Deletes the parent class", "Calls the parent class's constructor", "Creates a new class", "Imports a module"]
  answer: 1
```

# Comprehensions and Iterators {#comprehensions}

A **list comprehension** builds a list in one readable line.

```python run
prices_usd = [1.00, 2.50, 4.20]
prices_zig = [round(p * 26.8, 2) for p in prices_usd]
print(prices_zig)

marks = [45, 82, 67, 90, 38]
passes = [m for m in marks if m >= 50]
print(passes)
```

Dictionary and set comprehensions work the same way:

```python run
names = ["chipo", "sipho", "farai"]
lengths = {n.title(): len(n) for n in names}
print(lengths)
```

## Generators

A **generator** produces values one at a time with `yield`, saving memory for large data:

```python run
def even_numbers(limit):
    n = 0
    while n <= limit:
        yield n
        n += 2

print(list(even_numbers(10)))
print(sum(x * x for x in range(1, 4)))
```

```exercise
prompt: Complete the comprehension that makes a list of squares of 1 to 5.
code: |
  squares = [n * n ___ n in range(1, 6)]
answers: [for]
```

# Dates and JSON {#dates-json}

## Dates

```python run
from datetime import date, datetime, timedelta

today = date.today()
independence = date(today.year, 4, 18)
if independence < today:
    independence = date(today.year + 1, 4, 18)
print("Days until Independence Day:", (independence - today).days)

now = datetime.now()
print(now.strftime("%A %d %B %Y, %H:%M"))
print("In 30 days:", today + timedelta(days=30))
```

## JSON

**JSON** is the text format almost every web API uses. Python's `json` module converts between JSON text and Python dictionaries/lists.

```python run
import json

learner = {"name": "Rudo", "tracks": ["Python", "SQL"], "active": True}
text = json.dumps(learner, indent=2)
print(text)

data = json.loads('{"city": "Kwekwe", "population": 100000}')
print(data["city"])
```

```quiz
- q: Which function turns a Python dictionary into JSON text?
  options: ["json.loads", "json.dumps", "json.read", "dict.to_json"]
  answer: 1
  explain: dumps = "dump to string". loads = "load from string".
```

# Project: Market Price Tracker {#project}

Let's combine everything into a small but real program: a tracker for prices at different markets.

```python run title="Market price tracker"
from statistics import mean

prices = {
    "Mbare": {"tomatoes": 1.00, "onions": 1.50, "maize meal": 8.50},
    "Bulawayo Market": {"tomatoes": 1.20, "onions": 1.30, "maize meal": 8.00},
    "Sakubva": {"tomatoes": 0.90, "onions": 1.60, "maize meal": 8.80},
}

def cheapest(item):
    market = min(prices, key=lambda m: prices[m][item])
    return market, prices[market][item]

def average_price(item):
    return round(mean(p[item] for p in prices.values()), 2)

for item in ["tomatoes", "onions", "maize meal"]:
    market, price = cheapest(item)
    print(f"{item.title():12} cheapest at {market:16} ${price:.2f} (avg ${average_price(item):.2f})")
```

## Your turn

Extend the project in the challenge below.

````challenge
id: py-project-basket
title: Cheapest basket
difficulty: hard
prompt: |
  Using the same `prices` structure, write `basket_cost(prices, market, shopping)` where `shopping` is a dict of item → quantity. Return the total cost at that market, rounded to 2 decimals.

  Then write `best_market(prices, shopping)` that returns the **name** of the market with the lowest total.
starter: |
  prices = {
      "Mbare": {"tomatoes": 1.00, "onions": 1.50, "maize meal": 8.50},
      "Bulawayo Market": {"tomatoes": 1.20, "onions": 1.30, "maize meal": 8.00},
      "Sakubva": {"tomatoes": 0.90, "onions": 1.60, "maize meal": 8.80},
  }

  def basket_cost(prices, market, shopping):
      pass

  def best_market(prices, shopping):
      pass

  print(best_market(prices, {"tomatoes": 2, "maize meal": 1}))
tests: |
  shop = {"tomatoes": 2, "maize meal": 1}
  assert basket_cost(prices, "Mbare", shop) == 10.5, f"Mbare basket should cost 10.5, got {basket_cost(prices, 'Mbare', shop)}"
  assert basket_cost(prices, "Bulawayo Market", shop) == 10.4
  assert best_market(prices, shop) == "Bulawayo Market"
  assert best_market(prices, {"onions": 3}) == "Bulawayo Market"
  assert best_market(prices, {"tomatoes": 10}) == "Sakubva"
````

# Next Steps {#next-steps}

You now know the core of Python. Here is where to go next, depending on your goals:

| If you want to… | Take this track |
|---|---|
| Analyse data and make charts | [Data Science](/learn/data-science) |
| Build web APIs | [Backend Engineering](/learn/backend) |
| Store data properly | [SQL](/learn/sql) |
| Get into AI | [AI Fundamentals](/learn/ai-fundamentals) → [Machine Learning](/learn/machine-learning) |
| Build with LLMs | [LLM APIs](/learn/llm-apis) → [RAG](/learn/rag) → [AI Agents](/learn/ai-agents) |
| Share your code | [Git & GitHub](/learn/git) |

## Practise every day

- Solve one small problem a day (try the **Exercises** page).
- Rebuild something you use: a timetable, a quiz, a budget tracker.
- Read other people's code on GitHub.
- When stuck, ask **Coach Zuva** for a hint — but try first!

When you have finished most lessons, take the **Python certification exam** from the track page to earn a certificate you can add to your CV.

```quiz
- q: Which data structure stores key–value pairs?
  options: ["list", "tuple", "dict", "set"]
  answer: 2
- q: What keyword defines a function?
  options: ["func", "def", "function", "lambda"]
  answer: 1
- q: What does `len([1, 2, 3])` return?
  options: ["2", "3", "6", "[1, 2, 3]"]
  answer: 1
- q: Which loop is best when you know you want to go through every item in a list?
  options: ["while", "for", "repeat", "do-while"]
  answer: 1
- q: What does `"Harare"[1:3]` give?
  options: ['"Ha"', '"ar"', '"arar"', '"Har"']
  answer: 1
```

```exam
- q: "What is the output of `print(type(3.0).__name__)`?"
  options: ["int", "float", "str", "double"]
  answer: 1
- q: "Which method adds an item to the end of a list?"
  options: ["add()", "push()", "append()", "insert_end()"]
  answer: 2
- q: "What does `\"zim\".upper()` return?"
  options: ["\"Zim\"", "\"ZIM\"", "\"zim\"", "An error"]
  answer: 1
- q: "Which keyword handles an exception?"
  options: ["catch", "except", "rescue", "handle"]
  answer: 1
- q: "What does `range(2, 8, 2)` produce?"
  options: ["2, 4, 6", "2, 4, 6, 8", "2, 8", "0, 2, 4, 6"]
  answer: 0
```
