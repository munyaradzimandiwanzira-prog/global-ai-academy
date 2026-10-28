---
id: python-functions
title: Functions in Depth
short: FUNCTIONS
category: languages
level: intermediate
language: python
color: "#1D4E89"
icon: "ƒ"
order: 20.3
summary: Master the building block of every program, and of every AI agent tool. Parameters in all their forms, scope and closures, functions as values, decorators, generators, recursion, type hints, errors, testing and async functions, each with runnable examples and exercises.
tags: [python, functions, decorators, closures, generators, recursion, type hints, async, lambda]
---

# Functions: The Essentials {#basics}

A **function** is a named, reusable block of code that takes **inputs** (parameters), does work, and gives back an **output** (its return value). Functions let you name an idea once and use it everywhere, test it on its own, and change it in one place.

```python run title="Define, call, return"
def fee_with_discount(price, percent_off):
    """Return the price after a percentage discount, rounded to cents."""
    discounted = price * (1 - percent_off / 100)
    return round(discounted, 2)

print(fee_with_discount(35, 20))           # 28.0
yearly = fee_with_discount(35 * 12, 17)
print(f"Yearly Plus with 17% off: ${yearly}")
print(fee_with_discount.__doc__)
```

## Anatomy

```sketch
title: Anatomy of a function call
caption: Arguments are bound to parameters, the body runs in its own local scope, and return hands one value back to the caller.
cellW: 190
cellH: 105
nodes:
  - id: call
    label: "fee_with_discount(35, 20)"
    col: 0
    row: 0
    shape: round
    tone: sky
    w: 1.15
  - id: bind
    label: "price = 35\npercent_off = 20"
    col: 1.4
    row: 0
    shape: note
  - id: body
    label: Body runs
    sub: local variables live here
    col: 2.8
    row: 0
    shape: round
    tone: grape
  - id: ret
    label: return 28.0
    col: 2.8
    row: 1.2
    shape: pill
    tone: teal
  - id: back
    label: Caller gets 28.0
    col: 0
    row: 1.2
    shape: pill
    tone: gold
edges:
  - from: call
    to: bind
    label: bind args
  - from: bind
    to: body
  - from: body
    to: ret
  - from: ret
    to: back
```

## Rules worth knowing early

- A function **without** `return` (or with a bare `return`) returns **`None`**.
- `return` ends the function immediately.
- Return several values as a **tuple** and unpack them.
- Prefer **pure functions** (output depends only on inputs, no side effects such as printing or changing globals): they're easy to test and reuse. Keep side effects (I/O, database writes) at the edges.

```python run title="None, early return, multiple values"
def describe(marks):
    if not marks:
        return None                                  # early exit
    avg = sum(marks) / len(marks)
    return min(marks), max(marks), round(avg, 1)     # a tuple

result = describe([67, 82, 91, 55])
low, high, average = result
print(low, high, average)
print(describe([]))

def shout(msg):
    print(msg.upper())                               # side effect, no return

value = shout("mhoro")
print("shout returned:", value)
```

```exercise
prompt: Complete the function so it returns the area of a rectangle.
code: |
  ___ area(width, height):
      ___ width * height
answers: [def, return]
```

```quiz
- q: What does a function return if it has no return statement?
  options: ["0", "An empty string", "None", "An error"]
  answer: 2
- q: Why are pure functions easier to test?
  options: ["They run faster", "Their output depends only on their inputs, with no hidden side effects", "They have no parameters", "Python caches them"]
  answer: 1
```

# Parameters in Depth {#parameters}

Python has a rich parameter system. Knowing it lets you design functions that are hard to call wrongly.

| Kind | Syntax | Example call |
|---|---|---|
| Positional or keyword | `def f(a, b)` | `f(1, 2)` or `f(b=2, a=1)` |
| Default value | `def f(a, b=10)` | `f(1)` |
| Variable positional | `def f(*args)` | `f(1, 2, 3)` → `args = (1, 2, 3)` |
| Variable keyword | `def f(**kwargs)` | `f(x=1, y=2)` → `kwargs = {'x': 1, 'y': 2}` |
| Keyword-only | `def f(a, *, strict=False)` | `f(1, strict=True)`; `f(1, True)` is an error |
| Positional-only | `def f(a, b, /)` | `f(1, 2)`; `f(a=1, b=2)` is an error |

```python run title="Every parameter kind in one signature"
def send_sms(phone, message, /, *extra_lines, sender="Skuru", retries=2, **metadata):
    body = "\n".join([message, *extra_lines])
    print(f"to={phone} from={sender} retries={retries}")
    print(f"body={body!r}")
    print(f"metadata={metadata}")

send_sms("+263771234567", "Your lesson starts at 4pm.", "Bring your laptop.", sender="Zuva", campaign="reminders")

# Unpacking at the call site
args = ["+263782223344", "Payment received."]
options = {"retries": 0, "receipt": "SKU-2026-00042"}
send_sms(*args, **options)
```

## The mutable default trap

Default values are created **once**, when the function is defined, not each time it's called. A mutable default (list, dict) is therefore **shared between calls**.

```python run title="The mutable default bug, and the fix"
def add_mark_buggy(mark, marks=[]):        # one list shared by every call!
    marks.append(mark)
    return marks

print(add_mark_buggy(90))
print(add_mark_buggy(75))                   # surprise: [90, 75]

def add_mark(mark, marks=None):             # the idiom: None, then create inside
    if marks is None:
        marks = []
    marks.append(mark)
    return marks

print(add_mark(90))
print(add_mark(75))
```

## Designing good signatures

- Put the most important inputs first, positionally.
- Make **options** keyword-only (`*, strict=False`), so calls read clearly: `parse(text, strict=True)` beats `parse(text, True)`.
- Accept `**kwargs` only when you genuinely forward them (e.g. wrappers).
- Avoid more than 4–5 parameters; group related ones into a dataclass or Pydantic model.

```exercise
prompt: Make strict a keyword-only parameter.
code: |
  def parse(text, ___, strict=False):
      ...
answers: ["*"]
```

```quiz
- q: Inside def f(*args), what type is args?
  options: ["list", "tuple", "dict", "set"]
  answer: 1
- q: Why is def f(x, items=[]) dangerous?
  options: ["Syntax error", "The same list is shared between calls, so changes leak from one call to the next", "Lists can't be defaults", "It's slow"]
  answer: 1
- q: With def f(a, *, strict=False), what happens on f(1, True)?
  options: ["strict becomes True", "TypeError: strict must be passed by keyword", "a becomes True", "It's ignored"]
  answer: 1
```

# Scope and Closures {#scope}

Python looks up names in this order: **L**ocal → **E**nclosing function → **G**lobal (module) → **B**uilt-in. This is the **LEGB** rule.

```python run title="LEGB in action"
rate = 26.8                                  # global

def make_converter():
    fee = 0.5                                # enclosing
    def convert(usd):
        result = usd * rate - fee            # local result; rate from global, fee from enclosing
        return round(result, 2)
    return convert

to_zig = make_converter()
print(to_zig(10))
print(len("Harare"))                         # len comes from built-ins
```

## Closures

A **closure** is an inner function that remembers variables from the function that created it, even after that function has returned. Closures are how you build configurable functions, counters and decorators.

```python run title="Closures remember their environment"
def make_counter(start=0):
    count = start
    def increment(step=1):
        nonlocal count                       # modify the enclosing variable
        count += step
        return count
    return increment

page_views = make_counter()
api_calls = make_counter(100)
print(page_views(), page_views(), page_views())
print(api_calls(), api_calls(10))
print(page_views())                          # independent state
```

## The late-binding trap

Closures look up variables **when they run**, not when they're created:

```python run title="Late binding in loops, and the fix"
buggy = [lambda: i * 10 for i in range(3)]
print([f() for f in buggy])                  # [20, 20, 20]: all see the final i

fixed = [lambda i=i: i * 10 for i in range(3)]   # default argument captures the current value
print([f() for f in fixed])
```

Use `global` sparingly (it makes code hard to test) and `nonlocal` when an inner function must update an enclosing variable.

```quiz
- q: In what order does Python resolve a name?
  options: ["Global, Local, Built-in", "Local, Enclosing, Global, Built-in", "Built-in first", "Alphabetically"]
  answer: 1
- q: What keyword lets an inner function change a variable of its enclosing function?
  options: ["global", "nonlocal", "static", "extern"]
  answer: 1
- q: Why do all three lambdas in the loop return 20?
  options: ["Lambdas can't use loops", "They look up i when called, after the loop finished at i = 2", "range is broken", "Multiplication bug"]
  answer: 1
```

# Functions as Values {#first-class}

In Python, functions are **objects**: you can store them in variables, put them in dicts, pass them to other functions and return them. Functions that take or return functions are **higher-order functions**.

```python run title="Passing functions around"
def with_vat(price): return round(price * 1.15, 2)
def with_discount(price): return round(price * 0.9, 2)

pipeline = [with_discount, with_vat]          # a list of functions
price = 100
for step in pipeline:
    price = step(price)
print("final price:", price)

# A dispatch table: the core of every tool-calling agent
TOOLS = {"vat": with_vat, "discount": with_discount}
print(TOOLS["vat"](50))

# Functions as arguments: sort by a key function
courses = [("Graph Databases", 25), ("Python Basics", 20), ("Agentic AI", 45)]
print(sorted(courses, key=lambda c: c[1]))
print(max(courses, key=lambda c: c[1])[0])
```

## lambda, map, filter and comprehensions

`lambda` makes a small anonymous function from one expression. `map` and `filter` apply functions across sequences, though a **comprehension** is usually clearer.

```python run title="Three ways to transform a list"
marks = [45, 78, 91, 33, 67]
print(list(map(lambda m: m + 5, marks)))              # map
print(list(filter(lambda m: m >= 50, marks)))         # filter
print([m + 5 for m in marks if m + 5 >= 50])          # comprehension: often clearest
```

## functools.partial

```python run title="Pre-fill arguments with partial"
from functools import partial

def convert(amount, rate, currency):
    return f"{amount * rate:,.2f} {currency}"

to_zig = partial(convert, rate=26.8, currency="ZiG")
to_rand = partial(convert, rate=17.9, currency="ZAR")
print(to_zig(35), "|", to_rand(35))
```

```quiz
- q: TOOLS = {"vat": with_vat} maps a name to…
  options: ["The result of with_vat", "The function object itself, callable later", "A string", "A copy of the code"]
  answer: 1
- q: What does sorted(items, key=f) use f for?
  options: ["To filter items", "To compute a sort key for each item", "To print", "To reverse"]
  answer: 1
- q: What does functools.partial return?
  options: ["The result immediately", "A new function with some arguments pre-filled", "A class", "A generator"]
  answer: 1
```

# Decorators {#decorators}

A **decorator** is a function that takes a function and returns a new function that adds behaviour: logging, timing, retries, caching, permission checks. `@decorator` above a `def` is shorthand for `func = decorator(func)`.

```sketch
title: What @decorator does
caption: The name now points at the wrapper, which runs extra code and calls the original.
cellW: 190
nodes:
  - id: orig
    label: get_rate(currency)
    sub: original function
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: dec
    label: "@retry(times=3)"
    col: 1.2
    row: 0
    shape: diamond
    tone: gold
    w: 0.9
    h: 0.95
  - id: wrap
    label: wrapper(*args, **kwargs)
    sub: try → call original → retry
    col: 2.5
    row: 0
    shape: round
    tone: teal
    w: 1.1
edges:
  - from: orig
    to: dec
    label: passed in
  - from: dec
    to: wrap
    label: returns
  - from: wrap
    to: orig
    label: calls
    dashed: true
    bend: 35
```

```python run title="Timing and retry decorators"
import functools, time

def timed(func):
    @functools.wraps(func)                    # keep the original name and docstring
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {(time.perf_counter() - start) * 1000:.2f} ms")
        return result
    return wrapper

def retry(times=3, exceptions=(Exception,)):
    """A decorator factory: retry(...) returns the actual decorator."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    print(f"  {func.__name__} attempt {attempt} failed: {e}")
                    if attempt == times:
                        raise
        return wrapper
    return decorator

calls = {"n": 0}

@timed
@retry(times=3, exceptions=(ConnectionError,))
def get_rate(currency):
    """Fetch an exchange rate (fails twice, then works)."""
    calls["n"] += 1
    if calls["n"] < 3:
        raise ConnectionError("network blip")
    return {"ZiG": 26.8}[currency]

print("rate:", get_rate("ZiG"))
print(get_rate.__name__, "-", get_rate.__doc__)
```

## Caching with lru_cache

```python run title="Memoise expensive pure functions"
from functools import lru_cache

calls = 0
@lru_cache(maxsize=256)
def route_minutes(a, b):
    global calls
    calls += 1
    return abs(hash((a, b))) % 40 + 10          # pretend this is an expensive computation

for _ in range(1000):
    route_minutes("Copacabana", "Budiriro")
print("computed", calls, "time(s);", route_minutes.cache_info())
```

Only cache **pure** functions whose arguments are hashable; never cache results that depend on time, users or permissions without including those in the key.

```exercise
prompt: Keep the wrapped function's name and docstring.
code: |
  def logged(func):
      @functools.___(func)
      def wrapper(*args, **kwargs):
          return func(*args, **kwargs)
      return wrapper
answers: [wraps]
```

````challenge
id: functions-retry-decorator
title: Build a retry decorator
difficulty: medium
prompt: |
  Write a decorator factory `retry(times)` so that a decorated function is called up to `times` times. If it raises, try again; if the last attempt raises, re-raise that exception. Record how many attempts the **last call** used in an attribute `wrapper.attempts`. Use `functools.wraps`.
starter: |
  import functools

  def retry(times):
      pass

  @retry(times=3)
  def flaky():
      return "ok"

  print(flaky(), flaky.attempts)
tests: |
  import functools
  state = {"n": 0}
  @retry(times=4)
  def sometimes():
      """Fails twice."""
      state["n"] += 1
      if state["n"] < 3:
          raise ValueError("nope")
      return "done"
  assert sometimes() == "done" and sometimes.attempts == 3, sometimes.attempts
  assert sometimes.__name__ == "sometimes" and sometimes.__doc__ == "Fails twice.", "Use functools.wraps"
  @retry(times=2)
  def always():
      raise KeyError("x")
  try:
      always()
      assert False, "should re-raise"
  except KeyError:
      pass
  assert always.attempts == 2
````

```quiz
- q: '@timed above def f is equivalent to…'
  options: ["timed()", "f = timed(f)", "f(timed)", "import timed"]
  answer: 1
- q: Why use functools.wraps in a decorator?
  options: ["Speed", "To keep the original function's name, docstring and metadata", "It's required syntax", "To cache results"]
  answer: 1
- q: Which functions are safe to cache with lru_cache?
  options: ["Any function", "Pure functions with hashable arguments", "Functions that print", "Functions that read the clock"]
  answer: 1
```

# Generators {#generators}

A **generator function** uses `yield` instead of `return`. Calling it doesn't run the body; it returns a **generator** that produces values **one at a time, on demand**. Generators handle huge or endless streams in tiny memory, which is exactly how LLM APIs stream tokens.

```python run title="yield produces values lazily"
def read_sms_log():
    print("  (opening log)")
    for line in ["+263771 paid 35", "+263782 failed", "+263773 paid 55"]:
        print("  (yielding a line)")
        yield line

gen = read_sms_log()
print("generator created, nothing has run yet")
print(next(gen))
for line in gen:                             # continues where it left off
    print(line)
```

## Pipelines of generators

```python run title="A streaming pipeline that never holds everything in memory"
def tokens(text):
    for word in text.split():
        yield word

def drop_stopwords(words, stop={"the", "a", "of", "and"}):
    for w in words:
        if w.lower() not in stop:
            yield w

def in_batches(items, size):
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch

text = "The spirit of Great Zimbabwe and the wisdom of a nation"
for batch in in_batches(drop_stopwords(tokens(text)), size=3):
    print(batch)

squares = (n * n for n in range(1_000_000))   # a generator expression: no million-item list
print(sum(squares))
```

| | List | Generator |
|---|---|---|
| Memory | All items at once | One item at a time |
| Reuse | Iterate many times | Exhausted after one pass |
| Start-up | Builds everything first | Produces the first item immediately |

```quiz
- q: What does calling a generator function return?
  options: ["The first value", "A generator object; the body runs as you iterate", "A list", "None"]
  answer: 1
- q: Why use a generator for a 10 GB log file?
  options: ["It's faster to type", "It processes one line at a time instead of loading everything into memory", "Generators compress files", "Lists can't hold strings"]
  answer: 1
- q: What happens if you loop over the same generator twice?
  options: ["It restarts", "The second loop gets nothing; it's exhausted", "Error", "It doubles the values"]
  answer: 1
```

# Type Hints and Docstrings {#type-hints}

Type hints document what a function expects and returns. Python doesn't enforce them at run time, but **editors**, **type checkers** (mypy, pyright) and libraries like **Pydantic**, **FastAPI** and **FastMCP** use them, the last ones to build **JSON schemas for AI tools** straight from your function signature.

```python run title="Hints, docstrings and introspection"
import inspect
from typing import Callable, Literal

def quote_fee(plan: Literal["plus", "academy"], months: int = 1, *, promo: str | None = None) -> float:
    """Quote the fee in USD for a plan.

    Args:
        plan: Which plan to quote.
        months: Number of months (12 gets two months free).
        promo: Optional promo code.
    """
    base = {"plus": 35, "academy": 55}[plan]
    charged = 10 if months == 12 else months
    return float(base * charged)

def apply_twice(f: Callable[[float], float], x: float) -> float:
    return f(f(x))

print(quote_fee("academy", 12))
print(apply_twice(lambda v: v * 0.9, 100))
sig = inspect.signature(quote_fee)
for name, p in sig.parameters.items():
    print(f"{name:7} kind={p.kind.name:22} annotation={p.annotation} default={p.default}")
print("returns:", sig.return_annotation)
print(inspect.getdoc(quote_fee).splitlines()[0])
```

That `inspect.signature` output is exactly what tool frameworks read to describe your function to a model. Good names, hints and docstrings make better tools.

```quiz
- q: Does Python stop you from passing a str to a parameter hinted as int?
  options: ["Yes", "No; hints aren't enforced at run time (tools and libraries may check them)", "Only for ints", "Only in strict mode"]
  answer: 1
- q: How do agent frameworks turn a Python function into a tool definition?
  options: ["They guess", "They read its signature, type hints and docstring", "They run it", "They need YAML"]
  answer: 1
```

# Recursion {#recursion}

A **recursive** function calls itself on a smaller version of the problem until it reaches a **base case**. It suits naturally recursive data: trees, nested folders, nested JSON, graphs.

```python run title="Recursion over nested data"
def total_size(item):
    """Sum file sizes in a nested folder structure."""
    if isinstance(item, int):                 # base case: a file
        return item
    return sum(total_size(child) for child in item.values())   # recursive case: a folder

folders = {"notes": {"python.md": 12, "sql.md": 8}, "videos": {"intro.mp4": 900, "week1": {"a.mp4": 450}}, "cv.pdf": 40}
print(total_size(folders), "MB")

def flatten(data, prefix=""):
    """Flatten nested JSON keys: {"a": {"b": 1}} -> {"a.b": 1}."""
    out = {}
    for k, v in data.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, key + "."))
        else:
            out[key] = v
    return out

print(flatten({"user": {"name": "Rudo", "plan": {"id": "plus", "months": 12}}, "active": True}))
```

## Memoisation turns exponential into linear

```python run title="Fibonacci: naive vs memoised"
from functools import lru_cache

calls = 0
def fib_naive(n):
    global calls
    calls += 1
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)

fib_naive(25)
print("naive calls for fib(25):", calls)

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print("fib(90) =", fib(90), "| cached calls:", fib.cache_info().misses)
```

Python limits recursion depth (about 1,000 frames by default). For very deep structures, convert recursion to a loop with an explicit stack.

```quiz
- q: What stops recursion from running forever?
  options: ["A while loop", "A base case that returns without recursing", "Python's garbage collector", "return None"]
  answer: 1
- q: Why is naive recursive Fibonacci so slow?
  options: ["Python is slow", "It recomputes the same subproblems an exponential number of times", "Recursion is always slow", "Integers are large"]
  answer: 1
```

# Errors and Testing {#testing}

## Raise clear errors

```python run title="Validate inputs and raise specific exceptions"
class InsufficientFunds(Exception):
    """Raised when a wallet doesn't have enough money."""

def withdraw(balance: float, amount: float) -> float:
    if amount <= 0:
        raise ValueError(f"amount must be positive, got {amount}")
    if amount > balance:
        raise InsufficientFunds(f"balance {balance:.2f} is less than {amount:.2f}")
    return balance - amount

for amount in (20, -5, 500):
    try:
        print("new balance:", withdraw(100, amount))
    except InsufficientFunds as e:
        print("declined:", e)
    except ValueError as e:
        print("bad request:", e)
```

## Test functions with plain asserts

Pure functions are trivial to test: call them with inputs and assert on outputs, including **edge cases** and **error cases**. In real projects you'd use **pytest**, which runs functions named `test_*` and reports failures nicely.

```python run title="A tiny test suite"
def to_cents(amount_text: str) -> int:
    """'$1,234.50' -> 123450"""
    cleaned = amount_text.replace("$", "").replace(",", "").strip()
    dollars, _, cents = cleaned.partition(".")
    return int(dollars or 0) * 100 + int((cents + "00")[:2])

tests = [("$35", 3500), ("$1,234.50", 123450), ("0.5", 50), ("  12.345 ", 1234), (".99", 99)]
failed = 0
for given, expected in tests:
    got = to_cents(given)
    status = "ok " if got == expected else "FAIL"
    failed += got != expected
    print(f"{status} to_cents({given!r}) = {got} (expected {expected})")
print(f"{len(tests) - failed}/{len(tests)} passed")
```

```quiz
- q: Why define a custom exception like InsufficientFunds?
  options: ["It's required", "Callers can catch that specific case and handle it differently from other errors", "It's faster", "To hide errors"]
  answer: 1
- q: Which functions are easiest to unit test?
  options: ["Ones that read global state", "Pure functions", "Ones that print", "Ones that call the network"]
  answer: 1
```

# Async Functions {#async}

`async def` creates a **coroutine function**. Inside it, `await` pauses the coroutine while something slow happens (a network call), letting the event loop run **other** coroutines meanwhile. It's how you call many APIs **concurrently** without threads: essential for agents that call several tools or models at once.

```python
import asyncio
import httpx

async def fetch_rate(client: httpx.AsyncClient, currency: str) -> float:
    r = await client.get(f"https://api.example.com/rates/{currency}", timeout=10)
    r.raise_for_status()
    return r.json()["rate"]

async def main():
    async with httpx.AsyncClient() as client:
        # Three requests in flight at once: total time ≈ the slowest, not the sum
        rates = await asyncio.gather(*(fetch_rate(client, c) for c in ("ZiG", "ZAR", "BWP")))
        print(dict(zip(("ZiG", "ZAR", "BWP"), rates)))

asyncio.run(main())
```

| Concept | Meaning |
|---|---|
| `async def` | Defines a coroutine function; calling it returns a coroutine (nothing runs yet) |
| `await x` | Pause here until `x` finishes; other tasks run meanwhile |
| `asyncio.gather(...)` | Run several coroutines concurrently and collect results |
| `asyncio.run(main())` | Start the event loop in a script |

> **Use async for I/O-bound work** (HTTP, databases, files): many waits overlap. It does **not** speed up CPU-heavy maths; use processes or vectorised libraries (NumPy) for that.

The browser editor runs Python synchronously, so the async example above is for your own machine. The core idea, overlapping waits, can still be simulated:

```python run title="Why concurrency helps I/O: total time = slowest, not sum"
waits = {"rates API": 0.8, "weather API": 1.2, "news API": 0.5}
sequential = sum(waits.values())
concurrent = max(waits.values())
print(f"one after another: {sequential:.1f}s")
print(f"concurrently (asyncio.gather): ~{concurrent:.1f}s  ({sequential / concurrent:.1f}x faster)")
```

```quiz
- q: What does asyncio.gather do?
  options: ["Runs coroutines one after another", "Runs several coroutines concurrently and returns all their results", "Creates threads", "Sorts results"]
  answer: 1
- q: Async helps most with…
  options: ["Heavy CPU maths", "Waiting on I/O such as network calls", "Printing", "Recursion"]
  answer: 1
- q: Calling an async function without await returns…
  options: ["Its result", "A coroutine object that hasn't run yet", "None", "An error always"]
  answer: 1
```

```exam
- q: What does def f(*args, **kwargs) collect in kwargs?
  options: ["Positional extras as a tuple", "Keyword extras as a dict", "Nothing", "Defaults"]
  answer: 1
- q: Which idiom fixes the mutable default problem?
  options: ["items=[]", "items=None, then create a new list inside", "items=list", "global items"]
  answer: 1
- q: A closure is…
  options: ["A finished function", "An inner function that remembers variables from its enclosing scope", "A class", "A loop"]
  answer: 1
- q: Which statement lets an inner function rebind an enclosing variable?
  options: ["global", "nonlocal", "return", "yield"]
  answer: 1
- q: What does a decorator receive and return?
  options: ["A class and an object", "A function and a (usually wrapped) function", "Strings", "Nothing"]
  answer: 1
- q: Which keyword makes a function a generator?
  options: ["return", "yield", "async", "lambda"]
  answer: 1
- q: Every recursive function needs…
  options: ["A loop", "A base case", "Global variables", "Type hints"]
  answer: 1
- q: Which is the best use of async/await?
  options: ["Sorting a big list", "Calling ten web APIs concurrently", "Matrix multiplication", "Reading a small config once"]
  answer: 1
```
