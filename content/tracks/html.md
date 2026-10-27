---
id: html
title: HTML
short: HTML
category: web
level: beginner
language: html
color: "#E34F26"
icon: "🌐"
order: 10
summary: HTML is the language every web page is written in. Learn elements, links, images, tables, lists and forms, and build your first web page.
tags: [html, web, beginner, frontend]
---

# HTML Introduction {#intro}

**HTML** (HyperText Markup Language) describes the **structure** of a web page. It tells the browser "this is a heading", "this is a paragraph", "this is an image".

HTML is made of **elements**, written with **tags** in angle brackets:

```html run title="A simple HTML document"
<!DOCTYPE html>
<html>
<head>
  <title>My First Page</title>
</head>
<body>
  <h1>Mhoro, Harare!</h1>
  <p>This is my first web page.</p>
</body>
</html>
```

## What each part means

| Part | Meaning |
|---|---|
| `<!DOCTYPE html>` | This is a modern HTML5 document |
| `<html>` | The root of the page |
| `<head>` | Information about the page (title, styles) — not shown in the page itself |
| `<title>` | Text shown in the browser tab |
| `<body>` | Everything visible on the page |
| `<h1>` | The main heading |
| `<p>` | A paragraph |

Most elements have an **opening tag** `<p>` and a **closing tag** `</p>`, with content in between.

> HTML describes **what things are**. CSS (next track) describes **how they look**. JavaScript makes them **do things**.

```quiz
- q: What does HTML stand for?
  options: ["Hyper Trainer Marking Language", "HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language"]
  answer: 1
- q: Which part of the page holds everything that is visible?
  options: ["<head>", "<title>", "<body>", "<meta>"]
  answer: 2
```

# Editors and Your First File {#editors}

You can write HTML in any text editor. We recommend **VS Code** with the **Live Server** extension, which refreshes your page every time you save.

1. Create a folder called `my-site`.
2. Inside it, create `index.html`.
3. Type `!` and press Tab in VS Code — it writes the HTML skeleton for you.
4. Right-click the file → **Open with Live Server**.

Or practise right here: every example has a **Try it yourself** button that shows the result next to your code.

```exercise
prompt: Complete the closing tag of the paragraph.
code: |
  <p>Hello world<___p>
answers: ["/"]
```

# Headings and Paragraphs {#headings}

HTML has six heading levels, `<h1>` (most important) to `<h6>` (least important). Use **one `<h1>` per page** for the main title — search engines and screen readers rely on it.

```html run
<h1>Global AI Academy</h1>
<h2>Python Track</h2>
<h3>Lesson 1: Variables</h3>
<h4>Example</h4>
<p>A paragraph is a block of text. Browsers add space before and after it.</p>
<p>This is another paragraph.<br>The br tag makes a line break.</p>
<hr>
<p>The hr tag above draws a horizontal line.</p>
```

## Text formatting

```html run
<p>This is <b>bold</b> and this is <strong>important</strong>.</p>
<p>This is <i>italic</i> and this is <em>emphasised</em>.</p>
<p>Water is H<sub>2</sub>O and 10<sup>2</sup> = 100.</p>
<p>Price: <del>$10</del> <ins>$8</ins> — <mark>sale!</mark></p>
<p>Type <code>print("hi")</code> to run Python.</p>
```

Prefer `<strong>` and `<em>`: they carry **meaning** (importance, emphasis), not only style.

```exercise
prompt: Make the most important heading on the page.
code: |
  <___>Welcome to my site</h1>
answers: [h1]
```

# Attributes {#attributes}

**Attributes** give extra information about an element. They go in the opening tag as `name="value"`.

```html run
<a href="https://www.zimparks.org.zw" title="Zimbabwe Parks">Visit ZimParks</a>
<p lang="sn">Mhoroi vese!</p>
<p style="color: teal;">Inline style (better to use CSS files)</p>
<input type="text" placeholder="Your name" required>
```

Common attributes:

| Attribute | Used for |
|---|---|
| `href` | Link destination |
| `src` | Image or script source |
| `alt` | Text description of an image |
| `id` | A unique name for one element |
| `class` | A group name for styling many elements |
| `lang` | The language of the content |
| `title` | Extra info shown on hover |

```quiz
- q: Which attribute gives an image a text description for screen readers?
  options: ["title", "src", "alt", "desc"]
  answer: 2
```

# Links {#links}

Links use the `<a>` (anchor) element with an `href`.

```html run
<a href="https://www.python.org">Python's website</a><br>
<a href="https://www.python.org" target="_blank" rel="noopener">Open in a new tab</a><br>
<a href="mailto:hello@example.com">Email us</a><br>
<a href="tel:+263770000000">Call us</a><br>
<a href="#contact">Jump to the contact section</a>
<h2 id="contact" style="margin-top:400px">Contact</h2>
```

- **Absolute URLs** include the whole address: `https://...`
- **Relative URLs** point to files on the same site: `about.html`, `images/logo.png`.
- `target="_blank"` opens a new tab; add `rel="noopener"` for security.

```exercise
prompt: Complete the attribute that sets where a link goes.
code: |
  <a ___="https://www.example.com">Example</a>
answers: [href]
```

# Images {#images}

Images use `<img>`, which has **no closing tag**.

```html run
<img src="/learn/victoria-falls.svg"
     alt="Victoria Falls with a rainbow in the spray"
     width="320" loading="lazy">
<p>Always add <code>alt</code> text. If the image fails to load, or someone uses a screen reader, they still know what it shows.</p>
```

## Tips for fast pages

- Use `loading="lazy"` so images below the screen load only when needed — this saves data.
- Prefer modern formats like **WebP**.
- Resize images to the size you display them; don't send a 4000-pixel photo for a 300-pixel thumbnail.

## Figures with captions

```html run
<figure>
  <img src="/learn/great-zimbabwe.svg" alt="Stone walls of Great Zimbabwe" width="300">
  <figcaption>The Great Enclosure at Great Zimbabwe, built without mortar.</figcaption>
</figure>
```

```quiz
- q: Which attribute makes images load only when they are about to be seen?
  options: ['lazy="true"', 'loading="lazy"', 'defer', 'async']
  answer: 1
```

# Lists {#lists}

```html run
<h3>Unordered list (bullets)</h3>
<ul>
  <li>Python</li>
  <li>JavaScript</li>
  <li>SQL</li>
</ul>

<h3>Ordered list (numbers)</h3>
<ol>
  <li>Install VS Code</li>
  <li>Create index.html</li>
  <li>Open with Live Server</li>
</ol>

<h3>Description list</h3>
<dl>
  <dt>HTML</dt><dd>Structure of a page</dd>
  <dt>CSS</dt><dd>Style of a page</dd>
</dl>
```

Lists can be nested — put a `<ul>` inside an `<li>`.

````challenge
id: html-lists-subjects
title: My subjects list
difficulty: easy
prompt: |
  Create an **unordered list** (`<ul>`) containing **at least 3** list items with your school subjects.
starter: |
  <h2>My subjects</h2>
  <!-- add your list here -->
tests: |
  var ul = document.querySelector('ul');
  assert(ul, 'Add a <ul> element');
  assert(ul.querySelectorAll('li').length >= 3, 'The list needs at least 3 <li> items');
````

# Tables {#tables}

Tables show data in rows and columns.

```html run
<table border="1" cellpadding="6">
  <caption>Lake water levels</caption>
  <thead>
    <tr><th>Lake</th><th>Province</th><th>Area (km²)</th></tr>
  </thead>
  <tbody>
    <tr><td>Kariba</td><td>Mashonaland West</td><td>5,580</td></tr>
    <tr><td>Mutirikwi</td><td>Masvingo</td><td>90</td></tr>
    <tr><td>Chivero</td><td>Mashonaland West</td><td>26</td></tr>
  </tbody>
</table>
```

| Tag | Meaning |
|---|---|
| `<table>` | The table |
| `<tr>` | Table row |
| `<th>` | Header cell |
| `<td>` | Data cell |
| `<thead>`, `<tbody>` | Groups of rows |

Use `colspan="2"` or `rowspan="2"` to make a cell stretch.

> Use tables for **data** only — not for page layout. Layout is CSS's job.

```exercise
prompt: Complete the tag for a header cell in a table.
code: |
  <tr><___>Name</th><th>Age</th></tr>
answers: [th]
```

# Forms {#forms}

Forms collect input from users — sign-ups, searches, orders.

```html run
<form>
  <label for="name">Full name</label><br>
  <input id="name" name="name" type="text" required><br><br>

  <label for="email">Email</label><br>
  <input id="email" name="email" type="email" placeholder="you@example.com"><br><br>

  <label for="province">Province</label><br>
  <select id="province" name="province">
    <option>Harare</option><option>Bulawayo</option><option>Manicaland</option>
  </select><br><br>

  <p>Preferred track:</p>
  <input type="radio" id="py" name="track" value="python"><label for="py">Python</label>
  <input type="radio" id="web" name="track" value="web"><label for="web">Web</label><br><br>

  <input type="checkbox" id="news" name="news"><label for="news">Send me news</label><br><br>

  <label for="msg">Message</label><br>
  <textarea id="msg" name="message" rows="3"></textarea><br><br>
  <button type="submit">Sign up</button>
</form>
```

## Input types worth knowing

`text`, `email`, `password`, `number`, `tel`, `date`, `checkbox`, `radio`, `file`, `range`, `color`, `search`.

Built-in validation attributes: `required`, `min`, `max`, `minlength`, `maxlength`, `pattern`.

> Always connect a `<label>` to its input with `for` and `id`. It makes the form accessible and lets people tap the label to focus the field.

````challenge
id: html-forms-login
title: Build a login form
difficulty: medium
prompt: |
  Build a form with:
  - an **email** input (`type="email"`) that is **required**,
  - a **password** input (`type="password"`),
  - a **submit** button.
starter: |
  <form>

  </form>
tests: |
  var f = document.querySelector('form');
  assert(f, 'Keep the <form> element');
  var email = f.querySelector('input[type=email]');
  assert(email, 'Add an input with type="email"');
  assert(email.required, 'The email input must be required');
  assert(f.querySelector('input[type=password]'), 'Add an input with type="password"');
  assert(f.querySelector('button, input[type=submit]'), 'Add a submit button');
````

# Semantic HTML {#semantic}

**Semantic** elements describe their meaning. They help search engines, screen readers and other developers understand your page.

```html run
<header>
  <h1>Bulawayo Bakers</h1>
  <nav><a href="#menu">Menu</a> | <a href="#visit">Visit us</a></nav>
</header>
<main>
  <section id="menu">
    <h2>Today's bread</h2>
    <article>
      <h3>Brown loaf</h3>
      <p>Fresh every morning at 6.</p>
    </article>
  </section>
  <aside>Order before 8 pm for next-day delivery.</aside>
</main>
<footer>© 2026 Bulawayo Bakers</footer>
```

| Element | Use for |
|---|---|
| `<header>` | Intro or top of a page/section |
| `<nav>` | Main navigation links |
| `<main>` | The main content (one per page) |
| `<section>` | A themed group of content |
| `<article>` | Self-contained content (a post, a product) |
| `<aside>` | Side information |
| `<footer>` | Bottom of a page/section |

```quiz
- q: Which element should wrap the main navigation links?
  options: ["<div>", "<nav>", "<menu>", "<links>"]
  answer: 1
- q: How many <main> elements should a page have?
  options: ["None", "One", "One per section", "As many as you like"]
  answer: 1
```

# Head, Meta and SEO {#head-meta}

The `<head>` holds information for browsers, search engines and social media.

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulawayo Bakers — Fresh bread daily</title>
  <meta name="description" content="Family bakery in Bulawayo since 1998.">
  <meta property="og:image" content="https://example.com/share.jpg">
  <link rel="icon" href="favicon.png">
  <link rel="stylesheet" href="styles.css">
</head>
```

- `charset="UTF-8"` makes all characters display correctly.
- The **viewport** meta tag makes pages work on phones — never forget it.
- A good `<title>` and `description` help your page appear in Google.

```exercise
prompt: Complete the meta tag that makes pages fit phone screens.
code: |
  <meta name="___" content="width=device-width, initial-scale=1.0">
answers: [viewport]
```

# Project: Your Profile Page {#project}

Put it all together and build a personal profile page.

````challenge
id: html-project-profile
title: Personal profile page
difficulty: medium
prompt: |
  Build a profile page that has:
  1. a `<header>` containing an `<h1>` with your name,
  2. a `<main>` with at least one `<section>` that has an `<h2>`,
  3. an image with **alt text**,
  4. a link (`<a>` with an `href`),
  5. a `<footer>`.
starter: |
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>My profile</title>
  </head>
  <body>

  </body>
  </html>
tests: |
  assert(document.querySelector('header h1'), 'Add a <header> with an <h1> inside');
  assert(document.querySelector('main section h2'), 'Add a <main> containing a <section> with an <h2>');
  var img = document.querySelector('img');
  assert(img, 'Add an <img>');
  assert(img.getAttribute('alt') && img.getAttribute('alt').trim().length > 2, 'Give your image meaningful alt text');
  var a = document.querySelector('a[href]');
  assert(a && a.getAttribute('href').length > 1, 'Add a link with an href');
  assert(document.querySelector('footer'), 'Add a <footer>');
````

When you're done, continue with **[CSS](/learn/css)** to make it beautiful.

```exam
- q: "Which tag creates a hyperlink?"
  options: ["<link>", "<a>", "<href>", "<url>"]
  answer: 1
- q: "Which element holds the most important heading?"
  options: ["<h6>", "<head>", "<h1>", "<header>"]
  answer: 2
- q: "Which input type validates an email address?"
  options: ["type=\"text\"", "type=\"email\"", "type=\"mail\"", "type=\"address\""]
  answer: 1
- q: "How do you connect a <label> to its input?"
  options: ["Put them in the same line", "Use for= on the label matching the input's id", "Use the same class", "It happens automatically"]
  answer: 1
- q: "Which tag has no closing tag?"
  options: ["<p>", "<img>", "<div>", "<ul>"]
  answer: 1
- q: "What should tables be used for?"
  options: ["Page layout", "Tabular data", "Navigation menus", "Images"]
  answer: 1
```
