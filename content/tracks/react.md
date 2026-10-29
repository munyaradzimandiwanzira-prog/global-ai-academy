---
id: react
title: React
short: REACT
category: frameworks
level: intermediate
language: html
color: "#149ECA"
icon: "⚛️"
order: 14
summary: Build modern user interfaces from components. JSX, props, state, events, lists, effects, forms, fetching data, routing and project structure — with live examples.
tags: [react, javascript, frontend, components, ui, web]
---

# What is React? {#intro}

**React** is a JavaScript library for building user interfaces from **components** — reusable pieces like `<Button>`, `<LessonCard>` or `<Navbar>`. It's used by Meta, Netflix, Airbnb and thousands of companies; Global AI Academy's own interface is built with React.

```sketch
title: "An app is a tree of components"
caption: "Each component is a function that returns what a part of the screen should look like. Big apps are small components composed together."
cellW: 165
cellH: 100
nodes:
  - id: app
    label: "App"
    col: 1.5
    row: 0
    shape: round
    tone: gold
  - id: hd
    label: "Header"
    col: 0.3
    row: 1
    shape: round
    tone: sky
  - id: list
    label: "ProductList"
    col: 1.5
    row: 1
    shape: round
    tone: teal
  - id: cart
    label: "Cart"
    col: 2.7
    row: 1
    shape: round
    tone: grape
  - id: c1
    label: "ProductCard"
    col: 0.9
    row: 2.1
    shape: box
  - id: c2
    label: "ProductCard"
    col: 2.1
    row: 2.1
    shape: box
edges:
  - from: app
    to: hd
  - from: app
    to: list
  - from: app
    to: cart
  - from: list
    to: c1
  - from: list
    to: c2
```


Key ideas:

1. **Components** — UI is built from small, reusable functions.
2. **Declarative** — describe what the UI should look like for the current data; React updates the page.
3. **State** — when data changes, React re-renders the parts that depend on it.

The examples below load React from a CDN inside the preview so you can edit and run them here. For real projects, create an app with **Vite**:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install && npm run dev
```

# JSX and Components {#jsx}

**JSX** lets you write HTML-like markup inside JavaScript.

```html run title="Your first component"
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="text/babel">
  function Welcome({ name, city }) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1>Mhoro, {name}!</h1>
        <p>Learning React in {city}.</p>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<Welcome name="Tariro" city="Bulawayo" />);
</script>
```

## JSX rules

- Return **one** parent element (or a fragment `<>...</>`).
- Use `className` instead of `class`, `htmlFor` instead of `for`.
- Put JavaScript inside `{ }`.
- Component names start with a **capital letter**.

# Props {#props}

**Props** pass data into a component, like function arguments.

```sketch
title: "Data down, events up"
caption: "A parent passes data to children as props. Children never change props; they call a function the parent gave them, and the parent updates its state."
cellW: 220
cellH: 110
nodes:
  - id: p
    label: "ProductList"
    col: 1
    row: 0
    shape: round
    tone: gold
    sub: "state: cart"
  - id: c
    label: "ProductCard"
    col: 1
    row: 1.5
    shape: round
    tone: teal
edges:
  - from: p
    to: c
    label: "props: product, onAdd"
    bend: -30
  - from: c
    to: p
    label: "onAdd(product)"
    dashed: true
    bend: -30
```


```html run
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="text/babel">
  function TrackCard({ title, lessons, level = "Beginner" }) {
    return (
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, width: 180 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p>{lessons} lessons · {level}</p>
      </div>
    );
  }
  function App() {
    return (
      <div style={{ display: "flex", gap: 12, fontFamily: "system-ui" }}>
        <TrackCard title="Python" lessons={25} />
        <TrackCard title="RAG" lessons={10} level="Advanced" />
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
</script>
```

Props flow **down** from parent to child and are **read-only**.

# State and Events {#state}

**State** is data that changes over time. `useState` returns the current value and a function to update it. Updating state re-renders the component.

```sketch
title: "Why the screen updates"
caption: "Calling the setter stores a new value and asks React to run the component again. React compares the new output with the old and changes only what differs."
cellW: 180
nodes:
  - id: ev
    label: "Click"
    col: 0
    row: 0
    shape: person
  - id: set
    label: "setCount(c + 1)"
    col: 1.2
    row: 0
    shape: round
    tone: gold
  - id: render
    label: "Component runs again"
    col: 2.5
    row: 0
    shape: round
    tone: teal
  - id: diff
    label: "Compare old vs new"
    col: 2.5
    row: 1.3
    shape: diamond
    tone: grape
    sub: "virtual DOM"
  - id: dom
    label: "Update only changes"
    col: 1.2
    row: 1.3
    shape: pill
    tone: sky
edges:
  - from: ev
    to: set
  - from: set
    to: render
  - from: render
    to: diff
  - from: diff
    to: dom
```


```html run
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="text/babel">
  function Counter() {
    const [count, setCount] = React.useState(0);
    return (
      <div style={{ fontFamily: "system-ui" }}>
        <p>Learners present: <strong>{count}</strong></p>
        <button onClick={() => setCount((c) => Math.max(0, c - 1))}>−</button>{" "}
        <button onClick={() => setCount((c) => c + 1)}>+</button>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<Counter />);
</script>
```

> Never change state directly (`count = count + 1`). Always use the setter, and use the **function form** `setCount(c => c + 1)` when the new value depends on the old one.

# Lists and Conditional Rendering {#lists}

```html run
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="text/babel">
  const products = [
    { id: 1, name: "Roller meal 10kg", price: 8.5, stock: 40 },
    { id: 2, name: "Cooking oil 2L", price: 4.2, stock: 0 },
    { id: 3, name: "Sugar 2kg", price: 2.8, stock: 15 },
  ];
  function ProductList() {
    const [showAll, setShowAll] = React.useState(true);
    const visible = showAll ? products : products.filter((p) => p.stock > 0);
    return (
      <div style={{ fontFamily: "system-ui" }}>
        <label><input type="checkbox" checked={!showAll} onChange={() => setShowAll(!showAll)} /> In stock only</label>
        <ul>
          {visible.map((p) => (
            <li key={p.id}>
              {p.name} — ${p.price.toFixed(2)} {p.stock === 0 && <em style={{ color: "crimson" }}>(sold out)</em>}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<ProductList />);
</script>
```

Every item in a list needs a stable, unique **`key`** (usually an ID — not the array index if the list can change).

# Forms {#forms}

**Controlled inputs** keep form values in state:

```html run
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="text/babel">
  function SignUp() {
    const [form, setForm] = React.useState({ name: "", email: "" });
    const [sent, setSent] = React.useState(false);
    const valid = form.name.length > 1 && /\S+@\S+\.\S+/.test(form.email);
    const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    if (sent) return <p style={{ fontFamily: "system-ui" }}>Ndatenda, {form.name}! Check {form.email}.</p>;
    return (
      <form style={{ fontFamily: "system-ui", display: "grid", gap: 8, maxWidth: 260 }} onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
        <input name="name" placeholder="Name" value={form.name} onChange={update} />
        <input name="email" placeholder="Email" value={form.email} onChange={update} />
        <button disabled={!valid}>Join</button>
      </form>
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<SignUp />);
</script>
```

# Effects and Fetching Data {#effects}

`useEffect` runs code **after** render — for fetching data, timers and subscriptions.

```sketch
title: "The life of an effect"
caption: "React renders first, then runs your effect. When the effect sets state, React renders again. The cleanup runs before the next effect or when the component leaves."
cellW: 185
nodes:
  - id: r1
    label: "Render"
    col: 0
    row: 0
    shape: round
    tone: sky
    sub: "loading…"
  - id: eff
    label: "useEffect runs"
    col: 1.3
    row: 0
    shape: round
    tone: gold
    sub: "fetch(url)"
  - id: set
    label: "setData(json)"
    col: 2.6
    row: 0
    shape: round
    tone: teal
  - id: r2
    label: "Render again"
    col: 2.6
    row: 1.3
    shape: round
    tone: sky
    sub: "shows data"
  - id: clean
    label: "Cleanup"
    col: 1.3
    row: 1.3
    shape: pill
    tone: rose
    sub: "abort · unsubscribe"
edges:
  - from: r1
    to: eff
  - from: eff
    to: set
    label: "response"
  - from: set
    to: r2
  - from: r2
    to: clean
    label: "deps change\nor unmount"
    dashed: true
```


```jsx
function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => !cancelled && setLeaders(data.leaders))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };      // cleanup
  }, []);                                    // [] = run once

  if (error) return <p>Could not load: {error}</p>;
  return <ol>{leaders.map((l) => <li key={l.name}>{l.name} — {l.xp} XP</li>)}</ol>;
}
```

In real apps, libraries like **TanStack Query** handle caching, loading states and retries for you (this site uses it).

```html run title="A timer with cleanup"
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="text/babel">
  function Clock() {
    const [now, setNow] = React.useState(new Date());
    React.useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
    return <h2 style={{ fontFamily: "system-ui" }}>Harare time: {now.toLocaleTimeString("en-ZW")}</h2>;
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<Clock />);
</script>
```

# Structuring a Real App {#architecture}

```text
src/
  components/      reusable UI (Button, Card, Dialog)
  features/        feature folders (auth, lessons, payments)
  pages/           one component per route
  lib/             api client, helpers
  hooks/           custom hooks (useAuth, useProgress)
  main.tsx         entry point
```

## The essential toolbox

| Need | Common choice |
|---|---|
| Build tool | Vite |
| Routing | React Router |
| Server data | TanStack Query |
| Styling | Tailwind CSS or CSS modules |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Testing Library |
| Full-stack framework | Next.js, Remix/React Router framework mode |

## Performance on slow connections

- **Code-split** routes with `lazy()` so users download only what they open.
- Optimise images; use `loading="lazy"`.
- Avoid huge libraries for small jobs.

```quiz
- q: How should you update state that depends on the previous value?
  options: ["count = count + 1", "setCount(c => c + 1)", "this.count++", "React.update(count)"]
  answer: 1
- q: Why do list items need a key?
  options: ["For styling", "So React can track items efficiently between renders", "Keys are optional decoration", "To sort the list"]
  answer: 1
- q: When does useEffect with an empty dependency array run?
  options: ["On every render", "Once, after the first render", "Never", "Before render"]
  answer: 1
```

```exam
- q: "What is a React component?"
  options: ["A CSS file", "A function that returns UI", "A database table", "A server"]
  answer: 1
- q: "How does data flow into a child component?"
  options: ["Through props", "Through global CSS", "Through localStorage only", "It can't"]
  answer: 0
- q: "What happens when state changes?"
  options: ["Nothing", "React re-renders the component", "The page reloads", "The server restarts"]
  answer: 1
- q: "Which hook runs side effects such as fetching data?"
  options: ["useState", "useEffect", "useMemo", "useRef"]
  answer: 1
- q: "In JSX, which attribute sets a CSS class?"
  options: ["class", "className", "cssClass", "style"]
  answer: 1
- q: "What should a cleanup function in useEffect do for a timer?"
  options: ["Start another timer", "Clear the interval", "Reload the page", "Nothing"]
  answer: 1
- q: "Why code-split routes with lazy()?"
  options: ["Users download only the code for pages they open", "It removes bugs", "It's required by JSX", "To use more data"]
  answer: 0
```
