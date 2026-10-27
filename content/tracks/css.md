---
id: css
title: CSS
short: CSS
category: web
level: beginner
language: html
color: "#1572B6"
icon: "🎨"
order: 11
summary: CSS makes web pages beautiful. Learn selectors, colours, the box model, Flexbox, Grid, responsive design and animation — and style real layouts.
tags: [css, web, design, flexbox, grid, responsive]
---

# CSS Introduction {#intro}

**CSS** (Cascading Style Sheets) controls how HTML looks: colours, fonts, spacing, layout and animation.

A CSS **rule** has a **selector** and **declarations**:

```css
h1 {
  color: teal;
  font-size: 32px;
}
```

- `h1` is the **selector** — which elements to style.
- `color: teal;` is a **declaration** — a **property** and a **value**.

```html run title="Your first styles"
<style>
  body { font-family: system-ui; background: #F5F0E6; }
  h1 { color: #23807F; }
  p { color: #142B52; font-size: 18px; }
</style>
<h1>Styled heading</h1>
<p>CSS turned this text navy and bigger.</p>
```

## Three ways to add CSS

1. **External file** (best): `<link rel="stylesheet" href="styles.css">` in the `<head>`.
2. **Internal**: a `<style>` block in the `<head>`.
3. **Inline**: `style="color: red"` on one element (avoid — hard to maintain).

```quiz
- q: In `p { color: red; }`, what is `color`?
  options: ["A selector", "A property", "A value", "A tag"]
  answer: 1
```

# Selectors {#selectors}

Selectors choose which elements a rule applies to.

```html run
<style>
  p { color: #444; }                 /* every <p> */
  .highlight { background: #F7ECD3; } /* class="highlight" */
  #top { border: 2px solid #23807F; } /* id="top" */
  ul li { margin-bottom: 4px; }      /* <li> inside <ul> */
  a:hover { color: #B88A2E; }        /* when the mouse is over a link */
  li:first-child { font-weight: bold; }
  input[type="email"] { border-color: teal; }
</style>
<p id="top">Element with an id</p>
<p class="highlight">Element with a class</p>
<ul><li>First item</li><li>Second item</li></ul>
<a href="#">Hover over me</a>
<input type="email" placeholder="email">
```

| Selector | Matches |
|---|---|
| `p` | all `<p>` elements |
| `.card` | elements with `class="card"` |
| `#logo` | the element with `id="logo"` |
| `nav a` | `<a>` inside `<nav>` |
| `a:hover` | links being hovered |
| `h1, h2` | both `<h1>` and `<h2>` |

## Specificity

When two rules clash, the more **specific** one wins: **id** beats **class**, and **class** beats **element**. If they are equally specific, the **later** rule wins. That's the "cascade" in CSS.

```exercise
prompt: Complete the selector for elements with class="card".
lang: css
code: |
  ___card { padding: 16px; }
answers: ["."]
```

# Colours and Backgrounds {#colors}

```html run
<style>
  .a { color: teal; }
  .b { color: #D4A64A; }
  .c { color: rgb(107, 58, 30); }
  .d { color: hsl(220, 60%, 20%); }
  .e { background: rgba(35, 128, 127, 0.15); padding: 8px; }
  .f { background: linear-gradient(90deg, #142B52, #23807F); color: white; padding: 12px; }
</style>
<p class="a">Named colour</p>
<p class="b">Hex colour</p>
<p class="c">RGB colour</p>
<p class="d">HSL colour</p>
<p class="e">Transparent background</p>
<p class="f">Gradient background</p>
```

## Contrast matters

Text must stand out from its background so everyone can read it — including people with low vision, and anyone reading a phone outside in bright sun. Aim for a contrast ratio of at least **4.5 : 1** for normal text.

```quiz
- q: Which colour format includes transparency?
  options: ["#FF0000", "rgb(255,0,0)", "rgba(255,0,0,0.5)", "red"]
  answer: 2
```

# The Box Model {#box-model}

Every element is a box made of four layers:

```text
+-------------------- margin --------------------+
|  +--------------- border ------------------+   |
|  |  +----------- padding --------------+   |   |
|  |  |            content               |   |   |
|  |  +----------------------------------+   |   |
|  +-----------------------------------------+   |
+------------------------------------------------+
```

```html run
<style>
  .box {
    width: 220px;
    padding: 16px;
    border: 4px solid #23807F;
    margin: 24px;
    background: #F7ECD3;
    box-sizing: border-box; /* width includes padding and border */
  }
</style>
<div class="box">Content with padding, a border and margin.</div>
<div class="box">Another box.</div>
```

> Most developers add `* { box-sizing: border-box; }` at the top of every stylesheet. It makes sizes far easier to reason about.

```exercise
prompt: Complete the property that adds space INSIDE the border.
lang: css
code: |
  .card { ___: 20px; }
answers: [padding]
```

# Text and Fonts {#text}

```html run
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
  h1 { font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.02em; }
  p { font-family: system-ui, sans-serif; font-size: 18px; line-height: 1.6; max-width: 60ch; }
  .center { text-align: center; text-transform: uppercase; font-weight: 600; }
  .quote { font-style: italic; color: #6B3A1E; }
</style>
<h1>Typography matters</h1>
<p>Comfortable reading needs a good font size, generous line height and lines that aren't too long — about 60 to 75 characters.</p>
<p class="center">centred and uppercase</p>
<p class="quote">“Kure kwegava ndokusina mutsubvu.” — Shona proverb</p>
```

Useful properties: `font-family`, `font-size`, `font-weight`, `line-height`, `text-align`, `text-decoration`, `letter-spacing`.

# Display and Position {#display-position}

## display

- `block` — takes the full width, starts on a new line (`div`, `p`, `h1`).
- `inline` — sits inside text, width is ignored (`span`, `a`).
- `inline-block` — sits inline but respects width and height.
- `none` — hidden completely.

## position

```html run
<style>
  .parent { position: relative; height: 140px; background: #EDE5D3; }
  .badge { position: absolute; top: 8px; right: 8px; background: #D4A64A; padding: 4px 10px; border-radius: 999px; }
  .sticky { position: sticky; top: 0; background: #142B52; color: white; padding: 8px; }
</style>
<div class="sticky">I stick to the top when you scroll</div>
<div class="parent">
  A relative parent
  <span class="badge">NEW</span>
</div>
<p style="height:300px">Scroll down…</p>
```

| Value | Behaviour |
|---|---|
| `static` | Normal flow (default) |
| `relative` | Normal flow, but can be nudged; becomes the anchor for absolute children |
| `absolute` | Removed from flow, placed relative to the nearest positioned ancestor |
| `fixed` | Stays in the same place on the screen |
| `sticky` | Normal until you scroll past it, then sticks |

# Flexbox {#flexbox}

**Flexbox** lays out items in a **row** or **column** and handles spacing and alignment.

```html run
<style>
  .row { display: flex; gap: 12px; justify-content: space-between; align-items: center; background: #142B52; padding: 12px; }
  .row a { color: white; text-decoration: none; }
  .cards { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
  .card { flex: 1 1 160px; background: white; border: 1px solid #ddd; border-radius: 10px; padding: 12px; }
</style>
<nav class="row"><strong style="color:#D4A64A">GAA</strong><div style="display:flex;gap:16px"><a href="#">Learn</a><a href="#">Practise</a><a href="#">Plans</a></div></nav>
<div class="cards">
  <div class="card">Python</div><div class="card">HTML</div><div class="card">SQL</div><div class="card">AI</div>
</div>
```

| Property (on the container) | What it does |
|---|---|
| `display: flex` | Turn on Flexbox |
| `flex-direction` | `row` or `column` |
| `justify-content` | Spacing along the main axis (`center`, `space-between`) |
| `align-items` | Alignment on the cross axis (`center`, `stretch`) |
| `gap` | Space between items |
| `flex-wrap: wrap` | Let items move to a new line |

````challenge
id: css-flex-center
title: Centre the box
difficulty: easy
prompt: |
  Use **Flexbox** on `.stage` to centre `.box` both horizontally and vertically.
lang: html
starter: |
  <style>
    .stage { height: 200px; background: #EDE5D3; }
    .box { width: 80px; height: 80px; background: #23807F; }
  </style>
  <div class="stage"><div class="box"></div></div>
tests: |
  var s = getComputedStyle(document.querySelector('.stage'));
  assert(s.display === 'flex', 'Set display: flex on .stage');
  assert(s.justifyContent === 'center', 'Use justify-content: center');
  assert(s.alignItems === 'center', 'Use align-items: center');
````

# CSS Grid {#grid}

**Grid** lays out items in rows **and** columns at the same time — ideal for page layouts and galleries.

```html run
<style>
  .layout {
    display: grid;
    grid-template-columns: 200px 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas: "head head" "side main" "foot foot";
    gap: 8px; min-height: 260px;
  }
  .layout > * { padding: 10px; border-radius: 8px; color: white; }
  header { grid-area: head; background: #142B52; }
  aside { grid-area: side; background: #6B3A1E; }
  main { grid-area: main; background: #23807F; }
  footer { grid-area: foot; background: #B88A2E; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; margin-top: 12px; }
  .gallery div { aspect-ratio: 1; background: #D4A64A; border-radius: 8px; }
</style>
<div class="layout"><header>Header</header><aside>Sidebar</aside><main>Main content</main><footer>Footer</footer></div>
<div class="gallery"><div></div><div></div><div></div><div></div><div></div><div></div></div>
```

`repeat(auto-fill, minmax(90px, 1fr))` creates as many columns as fit — a responsive gallery with **no media queries**.

```quiz
- q: Which unit means "one share of the remaining space" in Grid?
  options: ["px", "%", "fr", "em"]
  answer: 2
```

# Responsive Design {#responsive}

Most Zimbabwean internet users browse on phones. **Responsive** pages adapt to any screen.

1. Always include the viewport meta tag.
2. Use flexible units: `%`, `rem`, `fr`, `vw`.
3. Make images flexible: `img { max-width: 100%; height: auto; }`.
4. Use **media queries** to change layout at certain widths.

```html run
<style>
  .grid { display: grid; gap: 10px; grid-template-columns: 1fr; }
  .grid div { background: #23807F; color: white; padding: 20px; border-radius: 8px; }
  @media (min-width: 600px) { .grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 900px) { .grid { grid-template-columns: repeat(4, 1fr); } }
</style>
<p>Resize the result panel (or rotate your phone) to see the columns change.</p>
<div class="grid"><div>1</div><div>2</div><div>3</div><div>4</div></div>
```

> **Mobile first:** write styles for small screens first, then add `min-width` media queries for bigger screens. It keeps phone pages lighter and faster.

# Transitions and Animation {#animation}

```html run
<style>
  .btn { background: #23807F; color: white; border: none; padding: 12px 20px; border-radius: 8px; transition: transform .2s, background .2s; cursor: pointer; }
  .btn:hover { background: #1C6B6A; transform: translateY(-3px); }
  @keyframes spin { to { transform: rotate(360deg); } }
  .sun { width: 60px; height: 60px; border-radius: 50%; background: #F2B544; box-shadow: 0 0 30px #F2B544; animation: pulse 2s ease-in-out infinite; margin: 20px; }
  @keyframes pulse { 50% { transform: scale(1.15); } }
  @media (prefers-reduced-motion: reduce) { .sun { animation: none; } }
</style>
<button class="btn">Hover me</button>
<div class="sun"></div>
```

- **Transitions** animate between two states (like hover).
- **Keyframe animations** run on their own.
- Respect `prefers-reduced-motion` for people who get dizzy from motion.

# CSS Variables {#variables}

**Custom properties** (CSS variables) store values you reuse — perfect for brand colours and dark mode.

```html run
<style>
  :root { --brand: #142B52; --accent: #D4A64A; --radius: 12px; }
  .dark { --brand: #F5F0E6; --accent: #23807F; background: #0E1A30; }
  .card { color: var(--brand); border: 3px solid var(--accent); border-radius: var(--radius); padding: 14px; margin: 8px 0; }
</style>
<div class="card">Light card using variables</div>
<div class="dark" style="padding:8px"><div class="card">Same CSS, different variables</div></div>
```

# Project: A Product Card {#project}

````challenge
id: css-project-card
title: Style a product card
difficulty: medium
prompt: |
  Style the `.card` so that it:
  1. has **rounded corners** (`border-radius` greater than 0),
  2. has **padding** of at least 12px,
  3. uses **Flexbox** (`display: flex`) with `flex-direction: column`,
  4. makes the `.price` text **bold** (`font-weight` 600 or more).
lang: html
starter: |
  <style>
    .card { width: 220px; border: 1px solid #ddd; }
    .price { color: #23807F; }
  </style>
  <div class="card">
    <img src="/learn/great-zimbabwe.svg" alt="Stone sculpture" style="max-width:100%">
    <h3>Serpentine sculpture</h3>
    <p class="price">$75.00</p>
    <button>Add to cart</button>
  </div>
tests: |
  var c = getComputedStyle(document.querySelector('.card'));
  assert(parseFloat(c.borderTopLeftRadius) > 0, 'Give .card rounded corners with border-radius');
  assert(parseFloat(c.paddingTop) >= 12, 'Give .card padding of at least 12px');
  assert(c.display === 'flex' && c.flexDirection === 'column', 'Use display: flex and flex-direction: column on .card');
  assert(Number(getComputedStyle(document.querySelector('.price')).fontWeight) >= 600, 'Make .price bold (font-weight: 600 or more)');
````

Next: make it interactive with **[JavaScript](/learn/javascript)**.

```exam
- q: "Which selector targets an element with id=\"logo\"?"
  options: [".logo", "#logo", "logo", "*logo"]
  answer: 1
- q: "What does `box-sizing: border-box` do?"
  options: ["Hides the border", "Makes width include padding and border", "Adds a shadow", "Centres the box"]
  answer: 1
- q: "Which property spaces items in a flex or grid container?"
  options: ["margin-all", "gap", "spacing", "padding-items"]
  answer: 1
- q: "Which display value lays children out in rows AND columns?"
  options: ["block", "inline", "grid", "flex"]
  answer: 2
- q: "A mobile-first stylesheet adds larger-screen styles using\u2026"
  options: ["max-width media queries", "min-width media queries", "JavaScript", "!important"]
  answer: 1
- q: "Which wins: a class selector or an id selector?"
  options: ["Class", "Id", "Whichever is first", "Neither"]
  answer: 1
  explain: "Ids are more specific than classes."
- q: "How do you reuse a value stored as `--brand`?"
  options: ["$brand", "var(--brand)", "@brand", "brand()"]
  answer: 1
- q: "Which position value keeps an element on screen while scrolling past it, then sticks?"
  options: ["absolute", "sticky", "static", "relative"]
  answer: 1
```
