import type { RunLanguage } from '@shared/content';

/**
 * Language references, W3Schools-style: look up a keyword, function or tag, read one line about it,
 * see the syntax, run an example. Entries are [name, syntax, description, example?].
 * Examples run as-is in the matching online editor.
 */
export type RefEntry = [name: string, syntax: string, description: string, example?: string];

export interface RefSection {
  title: string;
  entries: RefEntry[];
}

export interface Reference {
  id: string;
  title: string;
  trackId: string;
  lang: RunLanguage;
  color: string;
  short: string;
  intro: string;
  sections: RefSection[];
}

const python: Reference = {
  id: 'python', title: 'Python', trackId: 'python', lang: 'python', color: '#3776AB', short: 'PYTHON',
  intro: 'Python 3 keywords, built-in functions and the methods you use most on strings, lists and dictionaries.',
  sections: [
    {
      title: 'Built-in functions',
      entries: [
        ['print()', 'print(*values, sep=" ", end="\\n")', 'Writes values to the output.', 'print("Harare", "Bulawayo", sep=" | ")'],
        ['input()', 'input(prompt)', 'Reads a line typed by the user and returns it as a string.', 'name = input("Your name? ")\nprint("Mhoro", name)'],
        ['len()', 'len(obj)', 'Returns the number of items in a string, list, tuple, set or dictionary.', 'print(len("Zimbabwe"))'],
        ['type()', 'type(obj)', 'Returns the type of an object.', 'print(type(3.5), type("hi"), type([1]))'],
        ['int()', 'int(x, base=10)', 'Converts a number or numeric string to a whole number.', 'print(int("42") + 1)'],
        ['float()', 'float(x)', 'Converts a number or numeric string to a decimal number.', 'print(float("8.50") * 2)'],
        ['str()', 'str(obj)', 'Converts an object to a string.', 'print("Score: " + str(95))'],
        ['bool()', 'bool(x)', 'Returns True or False. Empty values and 0 are False.', 'print(bool(""), bool("a"), bool(0))'],
        ['list()', 'list(iterable)', 'Creates a list from any iterable.', 'print(list("abc"))'],
        ['dict()', 'dict(**kwargs)', 'Creates a dictionary.', 'print(dict(city="Mutare", province="Manicaland"))'],
        ['set()', 'set(iterable)', 'Creates a set of unique items.', 'print(set([1, 2, 2, 3]))'],
        ['tuple()', 'tuple(iterable)', 'Creates an immutable sequence.', 'print(tuple([1, 2]))'],
        ['range()', 'range(start, stop, step)', 'A sequence of numbers, often used in for loops. Stop is not included.', 'for n in range(1, 10, 3):\n    print(n)'],
        ['enumerate()', 'enumerate(iterable, start=0)', 'Pairs each item with its position.', 'for i, c in enumerate(["Gweru", "Masvingo"], start=1):\n    print(i, c)'],
        ['zip()', 'zip(*iterables)', 'Combines iterables item by item.', 'for n, s in zip(["Tariro", "Sipho"], [88, 92]):\n    print(n, s)'],
        ['sum()', 'sum(iterable, start=0)', 'Adds up all items.', 'print(sum([8.5, 4.2, 2.8]))'],
        ['min() / max()', 'max(iterable, key=None)', 'Returns the smallest or largest item.', 'print(max([3, 9, 4]), min("dog", "cat"))'],
        ['abs()', 'abs(x)', 'Returns the absolute value.', 'print(abs(-7))'],
        ['round()', 'round(number, ndigits)', 'Rounds a number to a given precision.', 'print(round(3.14159, 2))'],
        ['sorted()', 'sorted(iterable, key=None, reverse=False)', 'Returns a new sorted list.', 'print(sorted([5, 1, 4], reverse=True))'],
        ['reversed()', 'reversed(seq)', 'Returns a reverse iterator.', 'print(list(reversed([1, 2, 3])))'],
        ['map()', 'map(function, iterable)', 'Applies a function to every item.', 'print(list(map(str.upper, ["a", "b"])))'],
        ['filter()', 'filter(function, iterable)', 'Keeps items for which the function returns True.', 'print(list(filter(lambda x: x > 2, [1, 2, 3, 4])))'],
        ['any() / all()', 'any(iterable)', 'any: True if any item is true. all: True if every item is true.', 'print(any([0, 1]), all([1, 1, 0]))'],
        ['isinstance()', 'isinstance(obj, classinfo)', 'Checks if an object is of a given type.', 'print(isinstance(5, int))'],
        ['open()', 'open(file, mode="r")', 'Opens a file and returns a file object. Use with `with`.', 'with open("notes.txt", "w") as f:\n    f.write("Shinga!")\nprint(open("notes.txt").read())'],
        ['help()', 'help(obj)', 'Shows the documentation for an object.', 'help(len)'],
      ],
    },
    {
      title: 'String methods',
      entries: [
        ['upper() / lower()', 's.upper()', 'Returns the string in upper or lower case.', 'print("Harare".upper())'],
        ['strip()', 's.strip(chars)', 'Removes spaces (or given characters) from both ends.', 'print("  hello  ".strip())'],
        ['split()', 's.split(sep=None)', 'Splits a string into a list.', 'print("maize,beans,rice".split(","))'],
        ['join()', 'sep.join(iterable)', 'Joins strings with a separator.', 'print(" - ".join(["A", "B", "C"]))'],
        ['replace()', 's.replace(old, new)', 'Replaces text.', 'print("I like tea".replace("tea", "maheu"))'],
        ['find()', 's.find(sub)', 'Returns the index of the first match, or -1.', 'print("Victoria Falls".find("Falls"))'],
        ['startswith() / endswith()', 's.startswith(prefix)', 'Checks how a string starts or ends.', 'print("077123".startswith("077"))'],
        ['count()', 's.count(sub)', 'Counts how many times text appears.', 'print("banana".count("a"))'],
        ['format() / f-strings', 'f"{value:.2f}"', 'Inserts values into a string.', 'price = 4.5\nprint(f"Price: ${price:.2f}")'],
        ['isdigit()', 's.isdigit()', 'True if all characters are digits.', 'print("2024".isdigit())'],
        ['title()', 's.title()', 'Capitalises the first letter of each word.', 'print("great zimbabwe".title())'],
      ],
    },
    {
      title: 'List methods',
      entries: [
        ['append()', 'lst.append(x)', 'Adds an item to the end.', 'a = [1, 2]\na.append(3)\nprint(a)'],
        ['extend()', 'lst.extend(iterable)', 'Adds every item from another iterable.', 'a = [1]\na.extend([2, 3])\nprint(a)'],
        ['insert()', 'lst.insert(i, x)', 'Inserts an item at a position.', 'a = ["b"]\na.insert(0, "a")\nprint(a)'],
        ['remove()', 'lst.remove(x)', 'Removes the first matching item.', 'a = [1, 2, 1]\na.remove(1)\nprint(a)'],
        ['pop()', 'lst.pop(i=-1)', 'Removes and returns an item (the last by default).', 'a = [1, 2, 3]\nprint(a.pop(), a)'],
        ['index()', 'lst.index(x)', 'Returns the position of the first match.', 'print(["a", "b"].index("b"))'],
        ['sort()', 'lst.sort(key=None, reverse=False)', 'Sorts the list in place.', 'a = [3, 1, 2]\na.sort()\nprint(a)'],
        ['reverse()', 'lst.reverse()', 'Reverses the list in place.', 'a = [1, 2, 3]\na.reverse()\nprint(a)'],
        ['copy()', 'lst.copy()', 'Returns a shallow copy.', 'a = [1]\nb = a.copy()\nb.append(2)\nprint(a, b)'],
        ['List comprehension', '[expr for x in it if cond]', 'Builds a list in one line.', 'print([n * n for n in range(6) if n % 2 == 0])'],
      ],
    },
    {
      title: 'Dictionary methods',
      entries: [
        ['get()', 'd.get(key, default=None)', 'Returns the value for a key, or a default if missing.', 'd = {"usd": 1}\nprint(d.get("zig", 0))'],
        ['keys() / values()', 'd.keys()', 'All keys or all values.', 'd = {"a": 1, "b": 2}\nprint(list(d.keys()), list(d.values()))'],
        ['items()', 'd.items()', 'Key, value pairs for looping.', 'for k, v in {"Harare": 1.5, "Gweru": 0.2}.items():\n    print(k, v)'],
        ['update()', 'd.update(other)', 'Adds or replaces keys from another dictionary.', 'd = {"a": 1}\nd.update({"b": 2})\nprint(d)'],
        ['pop()', 'd.pop(key, default)', 'Removes a key and returns its value.', 'd = {"a": 1, "b": 2}\nprint(d.pop("a"), d)'],
        ['setdefault()', 'd.setdefault(key, default)', 'Returns a value, inserting the default if the key is missing.', 'd = {}\nd.setdefault("fruits", []).append("mango")\nprint(d)'],
        ['Dictionary comprehension', '{k: v for k, v in it}', 'Builds a dictionary in one line.', 'print({n: n * n for n in range(4)})'],
      ],
    },
    {
      title: 'Keywords',
      entries: [
        ['if / elif / else', 'if cond: ... elif cond: ... else: ...', 'Runs code depending on conditions.', 'x = 7\nif x > 5:\n    print("big")\nelse:\n    print("small")'],
        ['for', 'for item in iterable:', 'Loops over items.', 'for c in "Zim":\n    print(c)'],
        ['while', 'while cond:', 'Loops while a condition is true.', 'n = 3\nwhile n:\n    print(n)\n    n -= 1'],
        ['break / continue', 'break', 'break leaves a loop; continue skips to the next round.', 'for n in range(10):\n    if n == 3: continue\n    if n == 6: break\n    print(n)'],
        ['def / return', 'def name(params): return value', 'Defines a function.', 'def vat(amount):\n    return round(amount * 0.15, 2)\nprint(vat(100))'],
        ['lambda', 'lambda args: expr', 'A small anonymous function.', 'double = lambda x: x * 2\nprint(double(21))'],
        ['class', 'class Name:', 'Defines a class.', 'class Learner:\n    def __init__(self, name):\n        self.name = name\nprint(Learner("Rudo").name)'],
        ['try / except / finally', 'try: ... except Error as e: ...', 'Handles errors.', 'try:\n    1 / 0\nexcept ZeroDivisionError as e:\n    print("Oops:", e)'],
        ['raise', 'raise Exception(msg)', 'Raises an error.', 'try:\n    raise ValueError("bad input")\nexcept ValueError as e:\n    print(e)'],
        ['import / from', 'from module import name', 'Uses code from another module.', 'from math import sqrt\nprint(sqrt(81))'],
        ['with', 'with expr as name:', 'Manages a resource (closes files automatically).', 'with open("a.txt", "w") as f:\n    f.write("hi")'],
        ['in / not in', 'x in container', 'Membership test.', 'print("a" in "cat", 5 not in [1, 2])'],
        ['is', 'a is b', 'True if both names point at the same object.', 'x = None\nprint(x is None)'],
        ['and / or / not', 'a and b', 'Logical operators.', 'print(True and not False)'],
        ['pass', 'pass', 'Does nothing; a placeholder.', 'def todo():\n    pass\nprint("ok")'],
        ['global', 'global name', 'Uses a variable from module scope inside a function.', 'count = 0\ndef inc():\n    global count\n    count += 1\ninc()\nprint(count)'],
        ['yield', 'yield value', 'Makes a generator function.', 'def countdown(n):\n    while n:\n        yield n\n        n -= 1\nprint(list(countdown(3)))'],
        ['async / await', 'async def f(): await g()', 'Writes asynchronous code.', 'import asyncio\nasync def hi():\n    return "hi"\nprint(asyncio.run(hi()))'],
      ],
    },
  ],
};

const javascript: Reference = {
  id: 'javascript', title: 'JavaScript', trackId: 'javascript', lang: 'javascript', color: '#C9A400', short: 'JAVASCRIPT',
  intro: 'Modern JavaScript: array and string methods, objects, numbers, dates, JSON and the statements you use every day.',
  sections: [
    {
      title: 'Array methods',
      entries: [
        ['push() / pop()', 'arr.push(x)', 'Adds to or removes from the end.', 'const a = [1, 2];\na.push(3);\nconsole.log(a, a.pop());'],
        ['shift() / unshift()', 'arr.unshift(x)', 'Removes from or adds to the start.', 'const a = [2];\na.unshift(1);\nconsole.log(a);'],
        ['map()', 'arr.map(fn)', 'Returns a new array with fn applied to each item.', 'console.log([1, 2, 3].map((n) => n * 10));'],
        ['filter()', 'arr.filter(fn)', 'Keeps items where fn returns true.', 'console.log([5, 12, 8].filter((n) => n > 6));'],
        ['reduce()', 'arr.reduce(fn, start)', 'Combines items into one value.', 'console.log([8.5, 4.2, 2.8].reduce((s, p) => s + p, 0));'],
        ['find() / findIndex()', 'arr.find(fn)', 'The first item (or its index) that matches.', 'console.log(["Harare", "Gweru"].find((c) => c.startsWith("G")));'],
        ['some() / every()', 'arr.some(fn)', 'Whether any / all items match.', 'console.log([1, 3].every((n) => n % 2));'],
        ['includes()', 'arr.includes(x)', 'True if the array contains x.', 'console.log(["USD", "ZiG"].includes("ZiG"));'],
        ['forEach()', 'arr.forEach(fn)', 'Runs fn for every item.', '["a", "b"].forEach((x, i) => console.log(i, x));'],
        ['sort()', 'arr.sort(compareFn)', 'Sorts in place. Pass a compare function for numbers.', 'console.log([10, 2, 33].sort((a, b) => a - b));'],
        ['slice()', 'arr.slice(start, end)', 'Returns a portion without changing the array.', 'console.log([1, 2, 3, 4].slice(1, 3));'],
        ['splice()', 'arr.splice(start, count, ...items)', 'Removes or inserts items in place.', 'const a = [1, 2, 3];\na.splice(1, 1);\nconsole.log(a);'],
        ['join()', 'arr.join(sep)', 'Joins items into a string.', 'console.log(["a", "b"].join(" + "));'],
        ['flat()', 'arr.flat(depth)', 'Flattens nested arrays.', 'console.log([1, [2, [3]]].flat(2));'],
        ['Spread', '[...a, ...b]', 'Copies or combines arrays.', 'const a = [1], b = [2];\nconsole.log([...a, ...b]);'],
        ['Destructuring', 'const [x, y] = arr', 'Unpacks values into variables.', 'const [first, second] = ["Tariro", "Sipho"];\nconsole.log(second);'],
      ],
    },
    {
      title: 'String methods',
      entries: [
        ['length', 'str.length', 'Number of characters.', 'console.log("Zimbabwe".length);'],
        ['toUpperCase() / toLowerCase()', 'str.toUpperCase()', 'Changes case.', 'console.log("mhoro".toUpperCase());'],
        ['trim()', 'str.trim()', 'Removes whitespace from both ends.', 'console.log("[" + "  hi  ".trim() + "]");'],
        ['split()', 'str.split(sep)', 'Splits into an array.', 'console.log("a,b,c".split(","));'],
        ['includes()', 'str.includes(sub)', 'True if the text contains sub.', 'console.log("Victoria Falls".includes("Falls"));'],
        ['indexOf()', 'str.indexOf(sub)', 'Position of sub, or -1.', 'console.log("banana".indexOf("n"));'],
        ['replaceAll()', 'str.replaceAll(a, b)', 'Replaces every match.', 'console.log("a-b-c".replaceAll("-", "/"));'],
        ['padStart()', 'str.padStart(len, ch)', 'Pads the start to a length.', 'console.log("7".padStart(3, "0"));'],
        ['Template literals', '`Hello ${name}`', 'Strings with embedded expressions.', 'const city = "Mutare";\nconsole.log(`Welcome to ${city}!`);'],
      ],
    },
    {
      title: 'Objects, numbers, JSON and dates',
      entries: [
        ['Object.keys() / values() / entries()', 'Object.entries(obj)', 'Keys, values or pairs of an object.', 'console.log(Object.entries({ usd: 1, zig: 26.8 }));'],
        ['Optional chaining', 'obj?.a?.b', 'Reads nested values safely; undefined instead of an error.', 'const user = {};\nconsole.log(user.profile?.city ?? "unknown");'],
        ['Nullish coalescing', 'a ?? b', 'Uses b only when a is null or undefined.', 'console.log(0 ?? 5, null ?? 5);'],
        ['toFixed()', 'num.toFixed(digits)', 'Formats a number with fixed decimals.', 'console.log((4.567).toFixed(2));'],
        ['Number() / parseInt()', 'parseInt(str, 10)', 'Converts strings to numbers.', 'console.log(Number("3.5") + parseInt("10", 10));'],
        ['Math.round / floor / ceil / random', 'Math.floor(x)', 'Common maths helpers.', 'console.log(Math.floor(Math.random() * 6) + 1);'],
        ['JSON.stringify()', 'JSON.stringify(value, null, 2)', 'Turns a value into JSON text.', 'console.log(JSON.stringify({ city: "Kariba" }));'],
        ['JSON.parse()', 'JSON.parse(text)', 'Reads JSON text into a value.', 'console.log(JSON.parse(\'{"x": 1}\').x);'],
        ['Date', 'new Date()', 'Dates and times.', 'const d = new Date("2026-04-18");\nconsole.log(d.toDateString());'],
        ['Intl.NumberFormat', 'new Intl.NumberFormat(locale, opts)', 'Formats currency and numbers.', 'console.log(new Intl.NumberFormat("en-ZW", { style: "currency", currency: "USD" }).format(35));'],
      ],
    },
    {
      title: 'Statements and functions',
      entries: [
        ['let / const', 'const x = 1', 'Declares variables. Prefer const; use let when it changes.', 'let n = 1;\nn += 1;\nconsole.log(n);'],
        ['if / else', 'if (cond) {} else {}', 'Runs code conditionally.', 'const t = 31;\nif (t > 30) console.log("Hot!"); else console.log("Nice");'],
        ['switch', 'switch (x) { case 1: ... }', 'Chooses between many cases.', 'const day = 6;\nswitch (day) { case 6: case 7: console.log("Weekend"); break; default: console.log("Weekday"); }'],
        ['for...of', 'for (const x of iterable)', 'Loops over values.', 'for (const c of ["Harare", "Bulawayo"]) console.log(c);'],
        ['for...in', 'for (const k in obj)', 'Loops over object keys.', 'for (const k in { a: 1, b: 2 }) console.log(k);'],
        ['Arrow functions', '(a, b) => a + b', 'Short function syntax.', 'const add = (a, b) => a + b;\nconsole.log(add(2, 3));'],
        ['try / catch', 'try {} catch (e) {}', 'Handles errors.', 'try { JSON.parse("{bad"); } catch (e) { console.log("Invalid JSON"); }'],
        ['async / await', 'async function f() { await p }', 'Waits for promises without callbacks.', 'const wait = (ms) => new Promise((r) => setTimeout(r, ms));\n(async () => { await wait(100); console.log("done"); })();'],
        ['class', 'class Name { constructor() {} }', 'Defines a class.', 'class Kombi { constructor(seats) { this.seats = seats; } }\nconsole.log(new Kombi(15).seats);'],
      ],
    },
  ],
};

const html: Reference = {
  id: 'html', title: 'HTML', trackId: 'html', lang: 'html', color: '#E34F26', short: 'HTML',
  intro: 'The HTML elements you need for real pages, grouped by what they do.',
  sections: [
    {
      title: 'Document and metadata',
      entries: [
        ['<!DOCTYPE html>', '<!DOCTYPE html>', 'Tells the browser this is an HTML5 document. Always the first line.'],
        ['<html>', '<html lang="en">', 'The root element. Set lang for screen readers and search engines.'],
        ['<head>', '<head>…</head>', 'Holds metadata: title, styles, scripts, links.'],
        ['<title>', '<title>Page name</title>', 'The text shown in the browser tab and search results.'],
        ['<meta>', '<meta name="viewport" content="width=device-width, initial-scale=1">', 'Metadata. The viewport tag makes pages work on phones.'],
        ['<link>', '<link rel="stylesheet" href="style.css">', 'Connects external resources such as stylesheets.'],
        ['<style>', '<style>p { color: teal; }</style>', 'CSS written inside the page.', '<style>p { color: teal; }</style>\n<p>Styled text</p>'],
        ['<script>', '<script src="app.js"></script>', 'JavaScript, inline or from a file.', '<p id="t"></p>\n<script>document.getElementById("t").textContent = "Set by JavaScript";</script>'],
      ],
    },
    {
      title: 'Text',
      entries: [
        ['<h1> – <h6>', '<h1>Title</h1>', 'Headings, from most to least important. One h1 per page.', '<h1>Great Zimbabwe</h1>\n<h2>History</h2>\n<h3>The Great Enclosure</h3>'],
        ['<p>', '<p>Text</p>', 'A paragraph.', '<p>The Zambezi is Zimbabwe’s longest river.</p>'],
        ['<a>', '<a href="url">Link</a>', 'A link to another page or place.', '<a href="https://www.zimparks.org.zw" target="_blank" rel="noopener">ZimParks</a>'],
        ['<strong> / <em>', '<strong>bold</strong>', 'Strong importance and emphasis.', '<p><strong>Warning:</strong> this is <em>important</em>.</p>'],
        ['<br> / <hr>', '<br>', 'A line break / a thematic break.', '<p>Line one<br>Line two</p>'],
        ['<code> / <pre>', '<pre><code>…</code></pre>', 'Code, inline or as a block.', '<p>Use <code>print()</code> in Python.</p>'],
        ['<blockquote>', '<blockquote>…</blockquote>', 'A quotation from another source.', '<blockquote>Shinga! Usaneta!</blockquote>'],
        ['<span>', '<span>…</span>', 'An inline container for styling part of text.', '<p>Price: <span style="color:green">$35</span></p>'],
      ],
    },
    {
      title: 'Lists and tables',
      entries: [
        ['<ul> / <ol> / <li>', '<ul><li>Item</li></ul>', 'Unordered (bullets) and ordered (numbered) lists.', '<ol>\n  <li>Harare</li>\n  <li>Bulawayo</li>\n</ol>'],
        ['<dl> / <dt> / <dd>', '<dl><dt>Term</dt><dd>Meaning</dd></dl>', 'A description list.', '<dl><dt>ZiG</dt><dd>Zimbabwe Gold currency</dd></dl>'],
        ['<table>', '<table>…</table>', 'Tabular data.', '<table border="1">\n  <tr><th>City</th><th>Province</th></tr>\n  <tr><td>Mutare</td><td>Manicaland</td></tr>\n</table>'],
        ['<thead> / <tbody> / <tr> / <th> / <td>', '<tr><td>…</td></tr>', 'Table sections, rows, header cells and data cells.'],
      ],
    },
    {
      title: 'Media and layout',
      entries: [
        ['<img>', '<img src="a.jpg" alt="Description">', 'An image. Always describe it with alt.', '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Flag_of_Zimbabwe.svg/320px-Flag_of_Zimbabwe.svg.png" alt="Flag of Zimbabwe" width="160">'],
        ['<video> / <audio>', '<video src="v.mp4" controls>', 'Media players.'],
        ['<header> / <nav> / <main> / <footer>', '<main>…</main>', 'Landmarks that describe page structure.'],
        ['<section> / <article> / <aside>', '<section>…</section>', 'Group related content.'],
        ['<div>', '<div>…</div>', 'A generic block container.'],
        ['<figure> / <figcaption>', '<figure><img><figcaption>…</figcaption></figure>', 'A picture with its caption.'],
        ['<iframe>', '<iframe src="url"></iframe>', 'Embeds another page.'],
        ['<canvas>', '<canvas id="c" width="200" height="100">', 'A drawing surface for JavaScript.', '<canvas id="c" width="200" height="80"></canvas>\n<script>const x = document.getElementById("c").getContext("2d"); x.fillStyle = "#23807F"; x.fillRect(10, 10, 180, 60);</script>'],
      ],
    },
    {
      title: 'Forms',
      entries: [
        ['<form>', '<form action="/send" method="post">', 'Collects input to send to a server.'],
        ['<label>', '<label for="id">Name</label>', 'A caption tied to a form control. Required for accessibility.'],
        ['<input>', '<input type="text" name="n">', 'Text, email, number, date, checkbox, radio and more.', '<label for="p">Phone</label>\n<input id="p" type="tel" placeholder="0771234567">'],
        ['<select> / <option>', '<select><option>…</option></select>', 'A drop-down list.', '<select><option>EcoCash</option><option>OneMoney</option></select>'],
        ['<textarea>', '<textarea rows="4"></textarea>', 'Multi-line text.'],
        ['<button>', '<button type="submit">Send</button>', 'A clickable button.', '<button onclick="alert(\'Mhoro!\')">Say hello</button>'],
      ],
    },
  ],
};

const css: Reference = {
  id: 'css', title: 'CSS', trackId: 'css', lang: 'html', color: '#1572B6', short: 'CSS',
  intro: 'CSS properties and selectors for layout, type, colour and motion. Examples open as a small page.',
  sections: [
    {
      title: 'Selectors',
      entries: [
        ['element', 'p { }', 'Selects every element of that type.'],
        ['.class', '.card { }', 'Selects elements with a class.'],
        ['#id', '#header { }', 'Selects the element with that id.'],
        ['descendant', 'nav a { }', 'Elements inside another element.'],
        [':hover / :focus-visible', 'a:hover { }', 'States: pointer over, keyboard focus.', '<style>button:hover { background: #23807F; color: white; }</style>\n<button>Hover me</button>'],
        [':nth-child()', 'li:nth-child(odd) { }', 'Selects by position.', '<style>li:nth-child(odd) { color: #B88A2E; }</style>\n<ul><li>One</li><li>Two</li><li>Three</li></ul>'],
        ['::before / ::after', 'p::before { content: "→ "; }', 'Inserts generated content.'],
      ],
    },
    {
      title: 'Box model and layout',
      entries: [
        ['display', 'display: flex | grid | block | inline | none', 'How an element is laid out.'],
        ['margin / padding', 'margin: 16px 24px;', 'Space outside / inside the border.'],
        ['width / max-width', 'max-width: 65ch;', 'Element size. max-width keeps text readable.'],
        ['box-sizing', 'box-sizing: border-box;', 'Include padding and border in the width.'],
        ['flex', 'display: flex; gap: 1rem; justify-content: space-between;', 'One-dimensional layout.', '<style>.row { display: flex; gap: 8px; } .row div { background: #142B52; color: white; padding: 12px; }</style>\n<div class="row"><div>A</div><div>B</div><div>C</div></div>'],
        ['grid', 'display: grid; grid-template-columns: repeat(3, 1fr);', 'Two-dimensional layout.', '<style>.g { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; } .g div { background: #D4A64A; padding: 16px; }</style>\n<div class="g"><div>1</div><div>2</div><div>3</div><div>4</div></div>'],
        ['position', 'position: relative | absolute | fixed | sticky;', 'Positioning scheme.'],
        ['@media', '@media (min-width: 768px) { }', 'Styles for certain screen sizes.'],
        ['overflow', 'overflow: auto;', 'What happens when content is too big.'],
      ],
    },
    {
      title: 'Type and colour',
      entries: [
        ['color / background', 'color: #142B52; background: #F3F2EE;', 'Text and background colour.'],
        ['font-family', 'font-family: system-ui, sans-serif;', 'The typeface, with fallbacks.'],
        ['font-size / line-height', 'font-size: 1.125rem; line-height: 1.6;', 'Text size and spacing between lines.'],
        ['font-weight', 'font-weight: 700;', 'Thickness of letters.'],
        ['text-align', 'text-align: left;', 'Horizontal alignment.'],
        ['letter-spacing', 'letter-spacing: -0.02em;', 'Space between letters.'],
        ['border / border-radius', 'border: 1px solid; border-radius: 9999px;', 'Edges and rounded corners.'],
        ['opacity', 'opacity: .5;', 'Transparency of the whole element.'],
        ['CSS variables', ':root { --ink: #142B52; } p { color: var(--ink); }', 'Reusable values.', '<style>:root { --brand: #23807F; } h1 { color: var(--brand); }</style>\n<h1>Variables</h1>'],
      ],
    },
    {
      title: 'Motion',
      entries: [
        ['transition', 'transition: transform 200ms ease-out;', 'Animates changes between states.', '<style>.b { transition: transform 200ms; } .b:hover { transform: scale(1.1); }</style>\n<button class="b">Hover</button>'],
        ['transform', 'transform: translateY(-4px) rotate(5deg);', 'Moves, scales or rotates without affecting layout.'],
        ['@keyframes / animation', '@keyframes spin { to { transform: rotate(1turn); } }', 'Multi-step animations.', '<style>@keyframes spin { to { transform: rotate(1turn); } } .s { width: 40px; height: 40px; background: #D4A64A; animation: spin 2s linear infinite; }</style>\n<div class="s"></div>'],
        ['prefers-reduced-motion', '@media (prefers-reduced-motion: reduce) { }', 'Respect users who turn off motion.'],
      ],
    },
  ],
};

const sql: Reference = {
  id: 'sql', title: 'SQL', trackId: 'sql', lang: 'sql', color: '#00758F', short: 'SQL',
  intro: 'SQL keywords and functions. Examples run against the Zim Traders sample database.',
  sections: [
    {
      title: 'Querying',
      entries: [
        ['SELECT', 'SELECT col1, col2 FROM table;', 'Reads columns from a table.', 'SELECT CustomerName, City FROM Customers;'],
        ['DISTINCT', 'SELECT DISTINCT col FROM table;', 'Removes duplicate rows.', 'SELECT DISTINCT Province FROM Customers;'],
        ['WHERE', 'WHERE condition', 'Filters rows.', "SELECT * FROM Customers WHERE City = 'Harare';"],
        ['AND / OR / NOT', 'WHERE a AND (b OR c)', 'Combines conditions.', "SELECT * FROM Products WHERE Price > 5 AND Price < 20;"],
        ['ORDER BY', 'ORDER BY col DESC', 'Sorts results.', 'SELECT ProductName, Price FROM Products ORDER BY Price DESC;'],
        ['LIMIT', 'LIMIT n', 'Returns at most n rows.', 'SELECT * FROM Products LIMIT 3;'],
        ['LIKE', "WHERE col LIKE 'Ha%'", 'Pattern matching. % is any text, _ is one character.', "SELECT * FROM Customers WHERE City LIKE 'B%';"],
        ['IN', 'WHERE col IN (a, b)', 'Matches any value in a list.', "SELECT * FROM Customers WHERE City IN ('Gweru', 'Mutare');"],
        ['BETWEEN', 'WHERE col BETWEEN a AND b', 'Within a range, inclusive.', 'SELECT * FROM Products WHERE Price BETWEEN 2 AND 6;'],
        ['IS NULL', 'WHERE col IS NULL', 'Finds missing values.'],
        ['AS', 'SELECT col AS name', 'Renames a column or table in the result.', 'SELECT ProductName AS Item FROM Products;'],
      ],
    },
    {
      title: 'Grouping and functions',
      entries: [
        ['COUNT()', 'COUNT(*)', 'Number of rows.', 'SELECT COUNT(*) AS Total FROM Customers;'],
        ['SUM() / AVG()', 'SUM(col)', 'Total and average.', 'SELECT AVG(Price) AS AveragePrice FROM Products;'],
        ['MIN() / MAX()', 'MAX(col)', 'Smallest and largest value.', 'SELECT MIN(Price), MAX(Price) FROM Products;'],
        ['GROUP BY', 'GROUP BY col', 'Groups rows to aggregate per group.', 'SELECT City, COUNT(*) AS Customers FROM Customers GROUP BY City;'],
        ['HAVING', 'HAVING condition', 'Filters groups after GROUP BY.', 'SELECT Province, COUNT(*) AS n FROM Customers GROUP BY Province HAVING n > 1;'],
        ['ROUND()', 'ROUND(x, digits)', 'Rounds a number.', 'SELECT ProductName, ROUND(Price * 1.15, 2) AS WithVAT FROM Products;'],
        ['UPPER() / LOWER() / LENGTH()', 'UPPER(col)', 'Text functions.', 'SELECT UPPER(City) FROM Customers LIMIT 3;'],
        ['CASE', 'CASE WHEN c THEN a ELSE b END', 'If-then logic inside a query.', "SELECT ProductName, CASE WHEN Price > 10 THEN 'premium' ELSE 'everyday' END AS Band FROM Products;"],
      ],
    },
    {
      title: 'Joins',
      entries: [
        ['INNER JOIN', 'FROM a JOIN b ON a.id = b.a_id', 'Rows that match in both tables.', 'SELECT o.OrderID, c.CustomerName FROM Orders o JOIN Customers c ON c.CustomerID = o.CustomerID LIMIT 5;'],
        ['LEFT JOIN', 'FROM a LEFT JOIN b ON …', 'Every row from the left table, matched rows from the right.', 'SELECT c.CustomerName, o.OrderID FROM Customers c LEFT JOIN Orders o ON o.CustomerID = c.CustomerID LIMIT 8;'],
        ['UNION', 'SELECT … UNION SELECT …', 'Combines results of two queries.'],
        ['Subquery', 'WHERE col IN (SELECT …)', 'A query inside another query.', 'SELECT ProductName FROM Products WHERE Price > (SELECT AVG(Price) FROM Products);'],
      ],
    },
    {
      title: 'Changing data and tables',
      entries: [
        ['INSERT INTO', 'INSERT INTO t (a, b) VALUES (1, 2);', 'Adds a row.', "INSERT INTO Customers (CustomerName, City, Province) VALUES ('Rudo Moyo', 'Kariba', 'Mashonaland West');\nSELECT * FROM Customers WHERE City = 'Kariba';"],
        ['UPDATE', 'UPDATE t SET a = 1 WHERE …;', 'Changes rows. Always use WHERE.'],
        ['DELETE', 'DELETE FROM t WHERE …;', 'Removes rows. Always use WHERE.'],
        ['CREATE TABLE', 'CREATE TABLE t (id INTEGER PRIMARY KEY, …);', 'Creates a table.', 'CREATE TABLE Kombis (id INTEGER PRIMARY KEY, route TEXT, fare REAL);\nINSERT INTO Kombis (route, fare) VALUES (\'CBD–Avondale\', 1);\nSELECT * FROM Kombis;'],
        ['ALTER TABLE', 'ALTER TABLE t ADD COLUMN c TEXT;', 'Changes a table’s structure.'],
        ['PRIMARY KEY / FOREIGN KEY', 'id INTEGER PRIMARY KEY', 'Uniquely identifies rows / links tables.'],
        ['CREATE INDEX', 'CREATE INDEX idx ON t(col);', 'Speeds up lookups on a column.'],
      ],
    },
  ],
};

const git: Reference = {
  id: 'git', title: 'Git', trackId: 'git', lang: 'bash', color: '#F05032', short: 'GIT',
  intro: 'The Git commands you use every week, from your first commit to a pull request.',
  sections: [
    {
      title: 'Start and save',
      entries: [
        ['git init', 'git init', 'Turns the current folder into a Git repository.'],
        ['git clone', 'git clone <url>', 'Copies a repository to your computer.'],
        ['git status', 'git status', 'Shows changed, staged and untracked files.'],
        ['git add', 'git add <file> | git add .', 'Stages changes for the next commit.'],
        ['git commit', 'git commit -m "message"', 'Saves staged changes with a message.'],
        ['git log', 'git log --oneline', 'Lists commits.'],
        ['git diff', 'git diff', 'Shows changes not yet staged.'],
        ['.gitignore', 'node_modules/\n.env', 'Files Git should never track, like secrets.'],
      ],
    },
    {
      title: 'Branches and teams',
      entries: [
        ['git branch', 'git branch <name>', 'Lists or creates branches.'],
        ['git switch', 'git switch -c <name>', 'Changes branch (-c creates it).'],
        ['git merge', 'git merge <branch>', 'Combines another branch into the current one.'],
        ['git pull', 'git pull', 'Downloads and merges changes from the remote.'],
        ['git push', 'git push -u origin <branch>', 'Uploads your commits.'],
        ['git remote', 'git remote add origin <url>', 'Connects your repository to GitHub.'],
        ['git stash', 'git stash / git stash pop', 'Puts work aside and brings it back.'],
        ['git restore', 'git restore <file>', 'Discards changes in a file.'],
        ['git revert', 'git revert <commit>', 'Undoes a commit with a new commit (safe on shared branches).'],
      ],
    },
  ],
};

export const REFERENCES: Reference[] = [python, javascript, html, css, sql, git];
export const getReference = (id: string) => REFERENCES.find((r) => r.id === id);
