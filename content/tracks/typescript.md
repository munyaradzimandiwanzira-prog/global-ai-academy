---
id: typescript
title: TypeScript
short: TYPESCRIPT
category: languages
level: intermediate
language: typescript
color: "#3178C6"
icon: "🔷"
order: 13
summary: JavaScript with types — catch bugs before your code runs. Types, interfaces, unions, generics, narrowing, utility types and typing real apps and APIs.
tags: [typescript, javascript, types, web, frontend, backend]
---

# Why TypeScript? {#intro}

**TypeScript** is JavaScript plus **types**. You describe what shape your data has, and the TypeScript compiler warns you about mistakes **before** the code runs.

```sketch
title: "Types are checked, then erased"
caption: "tsc checks your types before the code runs and removes them, leaving plain JavaScript. Mistakes are caught in the editor, not by users."
cellW: 175
nodes:
  - id: ts
    label: "app.ts"
    col: 0
    row: 1
    shape: doc
    tone: sky
    sub: "code + types"
  - id: tsc
    label: "tsc"
    col: 1.3
    row: 1
    shape: diamond
    tone: gold
    sub: "type check"
  - id: err
    label: "Errors in editor"
    col: 1.3
    row: 2.4
    shape: pill
    tone: rose
  - id: js
    label: "app.js"
    col: 2.6
    row: 1
    shape: doc
    tone: teal
    sub: "types removed"
  - id: run
    label: "Runs anywhere"
    col: 3.9
    row: 1
    shape: pill
edges:
  - from: ts
    to: tsc
  - from: tsc
    to: err
    label: "problem"
  - from: tsc
    to: js
    label: "ok"
  - from: js
    to: run
```


```typescript run title="Types catch mistakes"
function total(prices: number[]): number {
  return prices.reduce((sum, p) => sum + p, 0);
}

console.log(total([1.5, 2.25, 4]));
// total(["1.5", "2"]);  ← TypeScript would flag this: string is not a number
```

Why teams use it:

- **Fewer bugs** in production — typos and wrong data shapes are caught early.
- **Better editor help** — auto-complete knows every property.
- **Safer refactoring** — rename a field and the compiler lists every place to update.
- **Self-documenting** code.

TypeScript compiles to plain JavaScript, so it runs anywhere JavaScript runs.

> Our editor removes the types and runs the JavaScript, so you can try every example. Install TypeScript locally (`npm install -D typescript`) and run `npx tsc --noEmit` to see the full type checking.

# Basic Types {#basic-types}

```typescript run
let learner: string = "Tariro";
let age: number = 16;
let isEnrolled: boolean = true;
let subjects: string[] = ["Maths", "Computer Science"];
let point: [number, number] = [-17.92, 25.85];       // tuple
let anything: unknown = JSON.parse('{"x": 1}');      // safer than any

const greet = (name: string, title?: string): string =>
  title ? `Mhoro ${title} ${name}` : `Mhoro ${name}`;

console.log(greet(learner), "|", greet("Moyo", "Mr"));
```

TypeScript often **infers** types, so you don't need to write them everywhere: `let city = "Gweru"` is already a `string`.

Avoid `any` — it switches off checking. Use `unknown` and check the value before using it.

```exercise
prompt: Add the type for a list of numbers.
lang: typescript
code: |
  const marks: ___ = [72, 85, 91];
answers: [["number[]", "Array<number>"]]
```

# Objects and Interfaces {#interfaces}

```typescript run
interface Learner {
  id: number;
  name: string;
  city: string;
  email?: string;          // optional
  readonly joinedAt: Date; // can't be changed
}

const tendai: Learner = { id: 1, name: "Tendai", city: "Harare", joinedAt: new Date() };

function describe(l: Learner): string {
  return `${l.name} from ${l.city}${l.email ? ` <${l.email}>` : ""}`;
}
console.log(describe(tendai));
```

`type` aliases can describe the same shapes and much more:

```typescript
type Province = "Harare" | "Bulawayo" | "Manicaland" | "Midlands";
type Point = { lat: number; lng: number };
```

# Unions and Narrowing {#unions}

A **union** says a value can be one of several types. **Narrowing** checks which one you have.

```sketch
title: "Narrowing a union"
caption: "A value of type string | number could be either. A check like typeof tells TypeScript which one you have inside each branch."
cellW: 180
nodes:
  - id: v
    label: "id: string | number"
    col: 0
    row: 1
    shape: box
    tone: sky
  - id: chk
    label: "typeof id === \"string\"?"
    col: 1.5
    row: 1
    shape: diamond
    tone: gold
  - id: s
    label: "id.toUpperCase()"
    col: 3
    row: 0.3
    shape: round
    tone: teal
    sub: "here id is string"
  - id: nm
    label: "id.toFixed(0)"
    col: 3
    row: 1.7
    shape: round
    tone: grape
    sub: "here id is number"
edges:
  - from: v
    to: chk
  - from: chk
    to: s
    label: "yes"
  - from: chk
    to: nm
    label: "no"
```


```typescript run
type PaymentMethod =
  | { kind: "ecocash"; phone: string }
  | { kind: "card"; last4: string }
  | { kind: "cash" };

function describePayment(p: PaymentMethod): string {
  switch (p.kind) {
    case "ecocash": return `EcoCash ${p.phone}`;
    case "card": return `Card ending ${p.last4}`;
    case "cash": return "Cash on delivery";
  }
}

console.log(describePayment({ kind: "ecocash", phone: "0772123456" }));
console.log(describePayment({ kind: "card", last4: "4242" }));
```

This pattern — a **discriminated union** with a `kind` field — is one of the most useful in TypeScript. If you add a new payment kind, the compiler shows every `switch` that needs updating.

# Generics {#generics}

**Generics** write code that works with many types while keeping type safety.

```sketch
title: "One generic, many types"
caption: "A generic is a type with a blank to fill in. ApiResult<T> describes any result; T is decided where you use it."
cellW: 200
nodes:
  - id: gen
    label: "ApiResult<T>"
    col: 0
    row: 1
    shape: round
    tone: gold
    sub: "{ ok: boolean; data: T }"
  - id: a
    label: "ApiResult<Product>"
    col: 1.6
    row: 0.3
    shape: box
    tone: teal
  - id: b
    label: "ApiResult<User[]>"
    col: 1.6
    row: 1.7
    shape: box
    tone: sky
edges:
  - from: gen
    to: a
    label: "T = Product"
  - from: gen
    to: b
    label: "T = User[]"
```


```typescript run
function first<T>(items: T[]): T | undefined {
  return items[0];
}

interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const city = first(["Harare", "Bulawayo"]);      // string | undefined
const n = first([10, 20]);                        // number | undefined
const res: ApiResult<{ total: number }> = { ok: true, data: { total: 42 } };
console.log(city, n, res.data?.total);
```

# Utility Types {#utility-types}

```typescript run
interface Product { id: number; name: string; price: number; stock: number }

type ProductPreview = Pick<Product, "id" | "name">;
type ProductUpdate = Partial<Omit<Product, "id">>;
type PriceList = Record<string, number>;

const update: ProductUpdate = { price: 9.5 };
const prices: PriceList = { "roller meal": 8.5, sugar: 2.8 };
const preview: ProductPreview = { id: 7, name: "Cement 50kg" };
console.log(update, prices, preview);
```

| Utility | Does |
|---|---|
| `Partial<T>` | All properties optional |
| `Required<T>` | All properties required |
| `Pick<T, K>` | Keep some properties |
| `Omit<T, K>` | Remove some properties |
| `Record<K, V>` | Object with keys K and values V |
| `ReturnType<F>` | The return type of a function |

# Typing Real Apps {#real-apps}

## Typing API responses — and validating them

Types disappear at run time, so data from APIs and users must be **validated**. Libraries like **Zod** give you both a validator and a type from one definition:

```sketch
title: "Types end at the network"
caption: "TypeScript cannot check data that arrives at run time. Validate it at the boundary (for example with zod); after that, your types are true."
cellW: 190
nodes:
  - id: net
    label: "JSON from API"
    col: 0
    row: 1
    shape: doc
    tone: rose
    sub: "type: unknown"
  - id: val
    label: "Validate"
    col: 1.4
    row: 1
    shape: diamond
    tone: gold
    sub: "schema.parse()"
  - id: typed
    label: "Typed object"
    col: 2.8
    row: 0.3
    shape: round
    tone: teal
    sub: "safe to use"
  - id: bad
    label: "Clear error"
    col: 2.8
    row: 1.7
    shape: pill
    tone: rose
edges:
  - from: net
    to: val
  - from: val
    to: typed
    label: "valid"
  - from: val
    to: bad
    label: "invalid"
```


```typescript
import { z } from "zod";

const Order = z.object({
  id: z.number(),
  customer: z.string().min(2),
  items: z.array(z.object({ product: z.string(), qty: z.number().int().positive() })),
});
type Order = z.infer<typeof Order>;

const res = await fetch("/api/orders/1042");
const order: Order = Order.parse(await res.json());   // throws if the shape is wrong
```

Global AI Academy itself uses this pattern: one Zod schema validates input on the server and types the client.

## tsconfig.json essentials

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  }
}
```

Always turn on `strict`.

````challenge
id: ts-cart-total
title: Typed shopping cart
difficulty: medium
lang: typescript
prompt: |
  Implement `cartTotal(cart, prices)`:
  - `cart` is an array of `{ product: string; qty: number }`,
  - `prices` is a `Record<string, number>`.

  Return the total. If a product has **no price**, throw an `Error` with the message `Unknown product: <name>`.
starter: |
  type CartLine = { product: string; qty: number };

  function cartTotal(cart: CartLine[], prices: Record<string, number>): number {
    // your code here
    return 0;
  }

  console.log(cartTotal([{ product: "sugar", qty: 2 }], { sugar: 2.8 }));
tests: |
  assert(Math.abs(cartTotal([{ product: "sugar", qty: 2 }, { product: "oil", qty: 1 }], { sugar: 2.8, oil: 4.2 }) - 9.8) < 1e-9, "2 × sugar (2.8) + 1 × oil (4.2) should total 9.8");
  assert.equal(cartTotal([], {}), 0);
  let message = "";
  try { cartTotal([{ product: "salt", qty: 1 }], {}); } catch (e) { message = e.message; }
  assert.equal(message, "Unknown product: salt");
````

```quiz
- q: What happens to TypeScript types when the code runs?
  options: ["They are checked by the browser", "They are removed — validation at run time needs code like Zod", "They slow the code down", "They become comments in HTML"]
  answer: 1
- q: Which utility type makes every property optional?
  options: ["Required", "Pick", "Partial", "Record"]
  answer: 2
```

```exam
- q: "What is the main benefit of TypeScript?"
  options: ["Faster code at run time", "Catching type errors before the code runs", "Smaller images", "Automatic CSS"]
  answer: 1
- q: "Which type should you prefer over `any` for values you haven't checked?"
  options: ["unknown", "never", "object", "void"]
  answer: 0
- q: "What does `email?: string` mean in an interface?"
  options: ["email is required", "email is optional", "email can be a number", "email is private"]
  answer: 1
- q: "What is a discriminated union?"
  options: ["A union of types sharing a literal field like `kind` used to narrow", "A database join", "Two interfaces merged", "A type with no fields"]
  answer: 0
- q: "What does `Pick<Product, 'id' | 'name'>` produce?"
  options: ["Product without id and name", "A type with only id and name", "An array of products", "A string"]
  answer: 1
- q: "Which compiler option should always be turned on?"
  options: ["strict", "allowJs", "noEmit", "sourceMap"]
  answer: 0
- q: "What do generics let you write?"
  options: ["Code that works for many types while staying type-safe", "Only string functions", "CSS styles", "SQL queries"]
  answer: 0
- q: "Why validate API responses with Zod even in TypeScript?"
  options: ["Types are removed at run time", "Zod is faster than TypeScript", "TypeScript can't type JSON", "It's required by browsers"]
  answer: 0
```
