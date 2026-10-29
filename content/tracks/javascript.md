---
id: javascript
title: JavaScript
short: JAVASCRIPT
category: web
level: beginner
language: javascript
color: "#C9A400"
icon: "⚡"
order: 12
summary: The programming language of the web. Learn variables, functions, arrays, objects, the DOM, events, async code and fetch — then build interactive pages.
tags: [javascript, js, web, frontend, programming]
---

# JavaScript Introduction {#intro}

**JavaScript** (JS) is the programming language of the web. Every modern browser runs it. With JavaScript you can:

```sketch
title: "Three languages, three jobs"
caption: "HTML gives a page structure, CSS its look and JavaScript its behaviour. JavaScript changes the page by changing the DOM."
cellW: 180
cellH: 100
nodes:
  - id: html
    label: "HTML"
    col: 0
    row: 0
    shape: doc
    tone: sky
    sub: "structure"
  - id: css
    label: "CSS"
    col: 0
    row: 1
    shape: doc
    tone: gold
    sub: "appearance"
  - id: js
    label: "JavaScript"
    col: 0
    row: 2
    shape: doc
    tone: teal
    sub: "behaviour"
  - id: dom
    label: "DOM"
    col: 1.4
    row: 1
    shape: circle
    tone: grape
    sub: "the live page"
  - id: page
    label: "What you see"
    col: 2.7
    row: 1
    shape: pill
edges:
  - from: html
    to: dom
    label: "builds"
  - from: css
    to: dom
    label: "styles"
  - from: js
    to: dom
    label: "changes"
  - from: dom
    to: page
```


- Change a page after it loads (show menus, validate forms, update scores).
- Talk to servers and APIs (load prices, send messages).
- Build servers (Node.js), mobile apps (React Native) and desktop apps (Electron).

```javascript run title="Your first JavaScript"
console.log("Mhoro from JavaScript!");
console.log(6 * 7);
```

`console.log()` prints to the **console** — the developer's output window. In the browser you open it with **F12** (or right-click → Inspect → Console).

## JavaScript in a web page

```html run title="JavaScript changing a page"
<h1 id="greeting">Hello</h1>
<button onclick="document.getElementById('greeting').textContent = 'Salibonani! 👋'">Change greeting</button>
```

> JavaScript and Java are **completely different** languages that happen to share part of a name.

```quiz
- q: Where does JavaScript run?
  options: ["Only on servers", "In every web browser (and on servers with Node.js)", "Only on Windows", "Only in Excel"]
  answer: 1
```

# Variables {#variables}

Declare variables with `let` (can change) or `const` (cannot be reassigned). Avoid the old `var`.

```javascript run
const school = "Mzilikazi High";
let learners = 820;
learners = learners + 35;
console.log(school, "now has", learners, "learners");
```

## Types

```javascript run
const name = "Rudo";          // string
const age = 16;               // number
const price = 4.2;            // number (JS has one number type)
const isMember = true;        // boolean
let phone;                    // undefined
const empty = null;           // null — "intentionally nothing"
const subjects = ["Maths", "CS"];      // array
const learner = { name, age };         // object
console.log(typeof name, typeof age, typeof isMember, typeof phone, typeof subjects);
```

## Template literals

Use backticks to put values inside text:

```javascript run
const city = "Mutare";
const temp = 24;
console.log(`It is ${temp}°C in ${city} — ${temp > 30 ? "hot" : "pleasant"}.`);
```

```exercise
prompt: Declare a value that will never be reassigned.
code: |
  ___ capital = "Harare";
answers: [const]
```

# Operators and Comparisons {#operators}

```javascript run
console.log(10 + 3, 10 - 3, 10 * 3, 10 / 3, 10 % 3, 10 ** 3);
let count = 5;
count += 2;   // 7
count++;      // 8
console.log(count);
```

## Strict equality

Always use `===` and `!==`. The loose `==` converts types and causes bugs:

```javascript run
console.log(5 == "5");   // true  (loose — converts the string)
console.log(5 === "5");  // false (strict — different types)
console.log(null ?? "default");       // nullish coalescing
console.log(0 || "fallback", 0 ?? "fallback");
```

## Logical operators

`&&` (and), `||` (or), `!` (not).

```quiz
- q: What does `5 === "5"` return?
  options: ["true", "false", "undefined", "An error"]
  answer: 1
  explain: Strict equality checks the type too, and a number is not a string.
```

# Functions {#functions}

```javascript run
function vat(amount, rate = 0.15) {
  return +(amount * rate).toFixed(2);
}

const toZiG = (usd) => usd * 26.8;     // arrow function

console.log(vat(200));
console.log(toZiG(10));
```

Functions are values — you can store them, pass them to other functions and return them:

```javascript run
const apply = (fn, value) => fn(value);
console.log(apply((x) => x * 2, 21));
```

````challenge
id: js-functions-grade
title: Grade calculator
difficulty: easy
prompt: |
  Write a function `grade(mark)` that returns:
  - `"A"` for 75 and above,
  - `"B"` for 65–74,
  - `"C"` for 50–64,
  - `"U"` below 50.
starter: |
  function grade(mark) {
    // your code here
  }

  console.log(grade(80));
tests: |
  assert.equal(grade(80), "A");
  assert.equal(grade(75), "A", "75 should be an A");
  assert.equal(grade(70), "B");
  assert.equal(grade(50), "C");
  assert.equal(grade(12), "U");
````

# Conditionals and Loops {#control-flow}

```javascript run
const hour = new Date().getHours();
if (hour < 12) console.log("Mangwanani (good morning)");
else if (hour < 17) console.log("Masikati (good afternoon)");
else console.log("Manheru (good evening)");

for (let i = 1; i <= 3; i++) console.log("Lap", i);

const towns = ["Gweru", "Kwekwe", "Kadoma"];
for (const town of towns) console.log(town);

let fuel = 3;
while (fuel > 0) { console.log("Driving… fuel", fuel); fuel--; }
```

## switch

```javascript run
const day = "Sat";
switch (day) {
  case "Sat":
  case "Sun":
    console.log("Weekend coding project!");
    break;
  default:
    console.log("School day");
}
```

# Arrays {#arrays}

```javascript run
const marks = [72, 45, 88, 91, 60];
marks.push(77);
console.log(marks.length, marks[0], marks.at(-1));
console.log(marks.includes(88), marks.indexOf(91));
```

## The big three: map, filter, reduce

These are used everywhere in modern JavaScript:

```sketch
title: "A data pipeline with filter, map and reduce"
caption: "Each step returns a new array (or, for reduce, one value) and leaves the original untouched."
cellW: 200
nodes:
  - id: a
    label: "[2, 8, 12, 5]"
    col: 0
    row: 0
    shape: box
    tone: sky
    sub: "prices"
  - id: f
    label: "filter(p => p > 4)"
    col: 1.3
    row: 0
    shape: round
    tone: gold
  - id: m
    label: "map(p => p * 1.15)"
    col: 2.6
    row: 0
    shape: round
    tone: teal
    sub: "add 15% VAT"
  - id: r
    label: "reduce((s, p) => s + p, 0)"
    col: 2.6
    row: 1.3
    shape: round
    tone: grape
  - id: t
    label: "28.75"
    col: 1.3
    row: 1.3
    shape: circle
    sub: "total"
    w: 0.6
    h: 0.8
edges:
  - from: a
    to: f
  - from: f
    to: m
    label: "[8, 12, 5]"
  - from: m
    to: r
    label: "[9.2, 13.8, 5.75]"
  - from: r
    to: t
```


```javascript run
const prices = [1.0, 2.5, 4.2, 8.5];
const withVat = prices.map((p) => +(p * 1.15).toFixed(2));
const cheap = prices.filter((p) => p < 3);
const total = prices.reduce((sum, p) => sum + p, 0);
console.log(withVat, cheap, total);

const learners = [{ name: "Chipo", xp: 120 }, { name: "Sipho", xp: 340 }, { name: "Farai", xp: 90 }];
learners.sort((a, b) => b.xp - a.xp);
console.log(learners.map((l) => l.name));
console.log(learners.find((l) => l.xp > 100));
```

```exercise
prompt: Keep only the even numbers.
code: |
  const evens = [1, 2, 3, 4].___((n) => n % 2 === 0);
answers: [filter]
```

````challenge
id: js-arrays-top-learners
title: Top learners
difficulty: medium
prompt: |
  Write `topNames(learners, n)` that returns an array with the **names** of the `n` learners with the **most XP**, highest first.

  ```js
  topNames([{name:"A", xp:5}, {name:"B", xp:9}, {name:"C", xp:7}], 2) // ["B", "C"]
  ```

  Don't change the original array.
starter: |
  function topNames(learners, n) {
  }
tests: |
  const list = [{name:"A", xp:5}, {name:"B", xp:9}, {name:"C", xp:7}];
  assert.deepEqual(topNames(list, 2), ["B", "C"]);
  assert.deepEqual(topNames(list, 1), ["B"]);
  assert.equal(list[0].name, "A", "Don't change (sort) the original array — copy it first");
````

# Objects {#objects}

Objects group related data and behaviour.

```javascript run
const learner = {
  name: "Tatenda",
  city: "Chinhoyi",
  tracks: ["HTML", "CSS"],
  greet() { return `Hi, I'm ${this.name} from ${this.city}`; },
};
learner.xp = 50;
console.log(learner.greet());
console.log(Object.keys(learner));

const { name, city } = learner;            // destructuring
const copy = { ...learner, city: "Harare" }; // spread
console.log(name, city, copy.city);
```

## JSON

APIs send data as JSON text:

```javascript run
const text = JSON.stringify({ item: "bread", price: 1.1 });
console.log(text);
console.log(JSON.parse(text).price);
```

# Classes {#classes}

```javascript run
class Account {
  #balance = 0;   // private field
  constructor(owner) { this.owner = owner; }
  deposit(amount) { if (amount <= 0) throw new Error("Amount must be positive"); this.#balance += amount; return this; }
  get balance() { return this.#balance; }
}

class SavingsAccount extends Account {
  addInterest(rate) { return this.deposit(this.balance * rate); }
}

const acc = new SavingsAccount("Rudo");
acc.deposit(100).addInterest(0.05);
console.log(acc.owner, acc.balance);
```

# The DOM {#dom}

The **DOM** (Document Object Model) is the browser's live model of your page. JavaScript can read and change it.

```sketch
title: "JavaScript and the DOM"
caption: "document.querySelector finds a node in the tree; changing its properties updates the page immediately."
cellW: 160
cellH: 100
nodes:
  - id: doc
    label: "document"
    col: 1.3
    row: 0
    shape: round
    tone: gold
  - id: body
    label: "body"
    col: 1.3
    row: 1
    shape: round
    tone: sky
  - id: h1
    label: "h1#title"
    col: 0.3
    row: 2
    shape: box
  - id: btn
    label: "button"
    col: 1.3
    row: 2
    shape: box
    tone: teal
  - id: ul
    label: "ul.list"
    col: 2.3
    row: 2
    shape: box
  - id: js
    label: "JavaScript"
    col: 3.6
    row: 1
    shape: doc
    tone: grape
    sub: "querySelector · textContent"
edges:
  - from: doc
    to: body
  - from: body
    to: h1
  - from: body
    to: btn
  - from: body
    to: ul
  - from: js
    to: ul
    label: "append item"
    dashed: true
```


```html run
<h2 id="title">Market prices</h2>
<ul id="list"></ul>
<input id="item" placeholder="Item"> <button id="add">Add</button>
<script>
  const list = document.querySelector('#list');
  const input = document.querySelector('#item');
  document.querySelector('#add').addEventListener('click', () => {
    if (!input.value.trim()) return;
    const li = document.createElement('li');
    li.textContent = input.value;
    list.append(li);
    input.value = '';
    input.focus();
  });
  document.querySelector('#title').style.color = '#23807F';
</script>
```

| Task | Code |
|---|---|
| Find one element | `document.querySelector('.card')` |
| Find many | `document.querySelectorAll('li')` |
| Change text | `el.textContent = 'Hi'` |
| Change style/class | `el.classList.add('active')` |
| Create and add | `document.createElement('li')`, `parent.append(child)` |

> Use `textContent`, not `innerHTML`, when showing user input — `innerHTML` can run malicious code (XSS).

# Events {#events}


```sketch
title: "From a click to a changed page"
caption: "An event listener waits for something to happen; its handler runs, changes data and updates the DOM. Events also bubble up to parent elements."
cellW: 170
nodes:
  - id: click
    label: "User clicks"
    col: 0
    row: 0
    shape: person
  - id: btn
    label: "button"
    col: 1.2
    row: 0
    shape: box
    tone: teal
  - id: h
    label: "handler()"
    col: 2.4
    row: 0
    shape: round
    tone: gold
    sub: "addEventListener"
  - id: dom
    label: "Update DOM"
    col: 3.6
    row: 0
    shape: pill
    tone: sky
  - id: parent
    label: "parent <ul>"
    col: 1.2
    row: 1.3
    shape: box
    sub: "hears it too"
edges:
  - from: click
    to: btn
    label: "click"
  - from: btn
    to: h
  - from: h
    to: dom
  - from: btn
    to: parent
    label: "bubbles"
    dashed: true
```

```html run
<button id="btn">Clicked 0 times</button>
<input id="name" placeholder="Type your name">
<p id="hello"></p>
<form id="f"><input name="q" placeholder="Search"><button>Go</button></form>
<script>
  let clicks = 0;
  const btn = document.getElementById('btn');
  btn.addEventListener('click', () => { btn.textContent = `Clicked ${++clicks} times`; });
  document.getElementById('name').addEventListener('input', (e) => {
    document.getElementById('hello').textContent = e.target.value ? `Mhoro, ${e.target.value}!` : '';
  });
  document.getElementById('f').addEventListener('submit', (e) => {
    e.preventDefault(); // stop the page reloading
    console.log('Searching for', new FormData(e.target).get('q'));
  });
</script>
```

Common events: `click`, `input`, `change`, `submit`, `keydown`, `load`, `scroll`.

````challenge
id: js-dom-counter
title: Build a counter
difficulty: medium
prompt: |
  Make the **+** button increase the number in `#count` by 1 and the **−** button decrease it by 1. The number must never go **below 0**.
lang: html
starter: |
  <p>Learners present: <span id="count">0</span></p>
  <button id="minus">−</button>
  <button id="plus">+</button>
  <script>
    // your code here
  </script>
tests: |
  var c = document.getElementById('count'), plus = document.getElementById('plus'), minus = document.getElementById('minus');
  plus.click(); plus.click();
  assert(c.textContent.trim() === '2', 'Clicking + twice should show 2');
  minus.click(); minus.click(); minus.click();
  assert(c.textContent.trim() === '0', 'The count must not go below 0');
````

# Async JavaScript {#async}

Some things take time — loading data, waiting for a timer. JavaScript handles these **asynchronously** so the page doesn't freeze.

```sketch
title: "The event loop"
caption: "JavaScript runs one thing at a time. Slow work (timers, fetch) is handed to the browser; when it finishes, its callback waits in a queue until the call stack is empty."
cellW: 185
cellH: 105
nodes:
  - id: stack
    label: "Call stack"
    col: 0
    row: 1
    shape: db
    tone: gold
    sub: "running now"
  - id: apis
    label: "Browser APIs"
    col: 1.4
    row: 0
    shape: round
    tone: sky
    sub: "fetch · setTimeout"
  - id: queue
    label: "Task queue"
    col: 2.8
    row: 1
    shape: db
    tone: teal
    sub: "finished callbacks"
  - id: loop
    label: "Event loop"
    col: 1.4
    row: 2.1
    shape: circle
    tone: grape
edges:
  - from: stack
    to: apis
    label: "hand off"
  - from: apis
    to: queue
    label: "done"
  - from: queue
    to: loop
  - from: loop
    to: stack
    label: "stack empty? run next"
```


```javascript run
console.log("1. Order placed");
setTimeout(() => console.log("3. Food delivered (after 1 second)"), 1000);
console.log("2. Meanwhile, keep chatting");
```

## Promises and async/await

A **Promise** is a value that arrives later. `async`/`await` lets you write async code that reads top to bottom:

```javascript run
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendMoney(amount) {
  console.log(`Sending $${amount}…`);
  await wait(800);
  if (amount > 100) throw new Error("Daily limit exceeded");
  return `Sent $${amount} ✔`;
}

(async () => {
  try {
    console.log(await sendMoney(20));
    console.log(await sendMoney(500));
  } catch (err) {
    console.log("Failed:", err.message);
  }
})();
```

# Fetch and APIs {#fetch}

`fetch()` requests data from a server. Most APIs return JSON.

```sketch
title: "A fetch round trip"
caption: "fetch returns a promise; await it, check response.ok, parse the JSON (another promise), then update the page. Handle errors at every step."
cellW: 200
nodes:
  - id: js
    label: "await fetch(url)"
    col: 0
    row: 0
    shape: round
    tone: teal
  - id: api
    label: "API server"
    col: 1.5
    row: 0
    shape: db
    tone: sky
  - id: res
    label: "Response"
    col: 1.5
    row: 1.3
    shape: doc
    sub: "status · headers · body"
  - id: json
    label: "await res.json()"
    col: 0
    row: 1.3
    shape: round
    tone: gold
  - id: ui
    label: "Render data"
    col: 0
    row: 2.5
    shape: pill
    tone: grape
edges:
  - from: js
    to: api
    label: "HTTP GET"
  - from: api
    to: res
  - from: res
    to: json
    label: "res.ok?"
  - from: json
    to: ui
```


```javascript
async function loadLearners() {
  const res = await fetch("https://api.example.com/learners");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const learners = await res.json();
  return learners;
}

// Sending data
await fetch("/api/contact", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Rudo", message: "Hello" }),
});
```

> Fetching other websites from the browser is limited by **CORS** — the other server must allow it. Our editor runs code in a locked-down sandbox, so try fetch on your own computer.

```quiz
- q: What does `await` do?
  options: ["Pauses the whole browser", "Waits for a Promise to finish inside an async function", "Repeats code", "Deletes a variable"]
  answer: 1
- q: Which method turns JSON text into a JavaScript object?
  options: ["JSON.stringify", "JSON.parse", "JSON.text", "Object.json"]
  answer: 1
```

# Errors and Debugging {#debugging}

```javascript run
function parseScore(text) {
  const n = Number(text);
  if (Number.isNaN(n)) throw new TypeError(`"${text}" is not a number`);
  return n;
}

for (const input of ["85", "eighty"]) {
  try {
    console.log("Score:", parseScore(input));
  } catch (e) {
    console.log(`${e.name}: ${e.message}`);
  } finally {
    console.log("checked", input);
  }
}
```

## Debugging tips

1. Read the error message — it names the problem and the line.
2. `console.log()` values to see what your code actually has.
3. Use the browser **DevTools**: set breakpoints in the **Sources** tab and step through.
4. Check spelling and capital letters — `getElementByID` is wrong; `getElementById` is right.

# Modules and Next Steps {#modules}

Modern JavaScript splits code into **modules**:

```javascript
// prices.js
export const VAT = 0.15;
export function withVat(amount) { return amount * (1 + VAT); }

// main.js
import { withVat } from "./prices.js";
console.log(withVat(100));
```

In HTML: `<script type="module" src="main.js"></script>`.

## Where next?

- **[TypeScript](/learn/typescript)** — JavaScript with types; used by most professional teams.
- **[React](/learn/react)** — build component-based user interfaces.
- **[Backend Engineering](/learn/backend)** — build APIs with Node.js or Python.

```quiz
- q: Which array method transforms every item and returns a new array?
  options: ["filter", "map", "reduce", "forEach"]
  answer: 1
- q: Which keyword declares a variable that can be reassigned?
  options: ["const", "let", "static", "final"]
  answer: 1
- q: Why prefer textContent over innerHTML for user input?
  options: ["It is faster to type", "It prevents injected HTML/scripts (XSS)", "It supports colours", "It is newer"]
  answer: 1
```

```exam
- q: "What does `[1, 2, 3].map(x => x * 2)` return?"
  options: ["[1, 2, 3]", "[2, 4, 6]", "12", "6"]
  answer: 1
- q: "What does `typeof null` return in JavaScript?"
  options: ["\"null\"", "\"object\"", "\"undefined\"", "\"number\""]
  answer: 1
  explain: "A famous historical quirk."
- q: "Which keyword waits for a Promise inside an async function?"
  options: ["wait", "await", "then", "yield"]
  answer: 1
- q: "Which method stops a form submission from reloading the page?"
  options: ["e.stop()", "e.preventDefault()", "return false only", "form.cancel()"]
  answer: 1
- q: "What does `0 ?? 'x'` evaluate to?"
  options: ["'x'", "0", "null", "undefined"]
  answer: 1
  explain: "?? only replaces null or undefined."
```
