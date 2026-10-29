---
id: backend
title: Backend Engineering
short: BACKEND
category: web
level: intermediate
language: python
color: "#009688"
icon: "🗄️"
order: 60
summary: Build the servers behind apps. HTTP, REST API design, FastAPI and Express, databases and ORMs, authentication, validation, caching, background jobs, testing and observability.
tags: [backend, api, rest, http, fastapi, express, authentication, databases]
---

# What Does a Backend Do? {#intro}

When you open a mobile-money app and check your balance, the app (the **frontend**) asks a **backend** server. The backend:

```sketch
title: "The parts behind every app"
caption: "The app sends a request. The backend checks who is asking, applies the business rules, reads or writes the database, and calls other services."
cellW: 190
cellH: 105
nodes:
  - id: app
    label: "Web or mobile app"
    col: 0
    row: 1
    shape: round
    tone: sky
  - id: api
    label: "Your API"
    col: 1.6
    row: 1
    shape: round
    tone: gold
    sub: "rules · validation"
  - id: auth
    label: "Who is this?"
    col: 1.6
    row: 0
    shape: pill
    tone: grape
    sub: "auth"
  - id: db
    label: "Database"
    col: 3.2
    row: 0.4
    shape: db
    tone: teal
  - id: ext
    label: "Other services"
    col: 3.2
    row: 1.8
    shape: box
    sub: "payments · email"
edges:
  - from: app
    to: api
    label: "request"
    arrow: both
  - from: api
    to: auth
    arrow: both
  - from: api
    to: db
  - from: api
    to: ext
```


1. **Authenticates** you — are you really you?
2. **Authorises** the request — may you see this account?
3. **Reads/writes the database**.
4. Applies **business rules** — limits, fees, fraud checks.
5. Returns a **response**, usually JSON.

```text
 Phone app ──HTTPS──▶  API server  ──▶ Database
 Web app   ──HTTPS──▶  (business logic) ──▶ Cache, queues, other APIs
```

Backend engineers care about **correctness, security, reliability and performance** — the parts users never see but always feel.

# HTTP Fundamentals {#http}

Every web request has a **method**, a **URL**, **headers** and sometimes a **body**. Every response has a **status code**, headers and a body.

```sketch
title: "One request, one response"
caption: "A request is a method, a path, headers and an optional body. The response is a status code, headers and a body, usually JSON."
cellW: 200
cellH: 100
nodes:
  - id: cl
    label: "Client"
    col: 0
    row: 0.5
    shape: person
  - id: req
    label: "POST /orders"
    col: 1.3
    row: 0
    shape: doc
    tone: sky
    sub: "headers · JSON body"
  - id: srv
    label: "Server"
    col: 2.8
    row: 0.5
    shape: db
    tone: gold
  - id: res
    label: "201 Created"
    col: 1.3
    row: 1.3
    shape: doc
    tone: teal
    sub: "{ \"id\": 1011 }"
edges:
  - from: cl
    to: req
  - from: req
    to: srv
  - from: srv
    to: res
  - from: res
    to: cl
```


```text
POST /api/orders HTTP/1.1
Host: shop.example.co.zw
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...

{"items": [{"product_id": 7, "qty": 2}]}
```

```text
HTTP/1.1 201 Created
Content-Type: application/json

{"id": 1042, "status": "pending", "total": 17.00}
```

| Method | Meaning |
|---|---|
| `GET` | Read (no side effects) |
| `POST` | Create / perform an action |
| `PUT` / `PATCH` | Replace / update |
| `DELETE` | Remove |

| Status | Meaning |
|---|---|
| `200 OK`, `201 Created`, `204 No Content` | Success |
| `400 Bad Request`, `422` | Invalid input |
| `401 Unauthorized` | Not signed in |
| `403 Forbidden` | Signed in but not allowed |
| `404 Not Found` | Doesn't exist |
| `409 Conflict` | Clashes with current state (e.g. duplicate email) |
| `429 Too Many Requests` | Rate limited |
| `500` | Server bug |

```quiz
- q: A signed-in learner tries to open the admin dashboard. Which status fits?
  options: ["401", "403", "404", "500"]
  answer: 1
  explain: 401 means not authenticated; 403 means authenticated but not allowed.
```

# Designing REST APIs {#rest}

Good APIs are **predictable**: resources are nouns, methods are verbs.

| Action | Request |
|---|---|
| List products | `GET /api/products?category=groceries&page=2` |
| Get one | `GET /api/products/7` |
| Create | `POST /api/products` |
| Update | `PATCH /api/products/7` |
| Delete | `DELETE /api/products/7` |
| Nested | `GET /api/customers/42/orders` |

## Design guidelines

- Use **plural nouns** and consistent naming (`snake_case` or `camelCase`, not both).
- Return **consistent error shapes**: `{"error": {"code": "not_found", "message": "Product 7 does not exist"}}`.
- **Paginate** lists; never return 100,000 rows.
- **Version** breaking changes (`/api/v2/...`).
- Make retries safe with **idempotency keys** for payments and orders.
- Document with **OpenAPI** (FastAPI generates it automatically).

# Building an API with FastAPI {#fastapi}

**FastAPI** is a modern Python framework with automatic validation and documentation.

```bash
pip install "fastapi[standard]"
fastapi dev main.py          # then open http://127.0.0.1:8000/docs
```

```python
# main.py
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

app = FastAPI(title="Zim Traders API")

class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    price: float = Field(gt=0)
    stock: int = Field(ge=0, default=0)

class Product(ProductIn):
    id: int

DB: dict[int, Product] = {}

@app.get("/api/products")
def list_products(max_price: float | None = Query(None, gt=0)) -> list[Product]:
    items = DB.values()
    return [p for p in items if max_price is None or p.price <= max_price]

@app.post("/api/products", status_code=201)
def create_product(body: ProductIn) -> Product:
    product = Product(id=len(DB) + 1, **body.model_dump())
    DB[product.id] = product
    return product

@app.get("/api/products/{product_id}")
def get_product(product_id: int) -> Product:
    if product_id not in DB:
        raise HTTPException(status_code=404, detail="Product not found")
    return DB[product_id]
```

FastAPI validates every request against `ProductIn` and returns a clear `422` error if, say, the price is negative — you get validation and docs for free.

## The same in Node.js (Express)

```javascript
import express from "express";
const app = express();
app.use(express.json());

app.get("/api/products/:id", (req, res) => {
  const product = db.get(Number(req.params.id));
  if (!product) return res.status(404).json({ error: { code: "not_found", message: "Product not found" } });
  res.json(product);
});

app.listen(3000);
```

Other popular choices: **Hono** (runs on Cloudflare Workers — this site's API uses it), **NestJS**, **Django**, **Spring Boot**, **Laravel**, **Go**.

# A Router You Can Run {#router}

Frameworks map a method + path to a handler. Here's the core idea in plain Python:

```sketch
title: "What happens inside the server"
caption: "Middleware runs on every request (logging, auth, parsing). The router matches method and path to one handler, which builds the response."
cellW: 185
nodes:
  - id: req
    label: "Request"
    col: 0
    row: 0
    shape: pill
    tone: sky
    sub: "GET /products/7"
  - id: mw
    label: "Middleware"
    col: 1.3
    row: 0
    shape: round
    tone: grape
    sub: "log · auth · parse"
  - id: rt
    label: "Router"
    col: 2.6
    row: 0
    shape: diamond
    tone: gold
    sub: "match path"
  - id: h
    label: "Handler"
    col: 2.6
    row: 1.3
    shape: round
    tone: teal
    sub: "get_product(7)"
  - id: nf
    label: "404"
    col: 3.9
    row: 0
    shape: pill
    tone: rose
    sub: "no match"
  - id: res
    label: "Response"
    col: 1.3
    row: 1.3
    shape: pill
    tone: sky
    sub: "200 JSON"
edges:
  - from: req
    to: mw
  - from: mw
    to: rt
  - from: rt
    to: h
    label: "found"
  - from: rt
    to: nf
  - from: h
    to: res
```


```python run title="How web frameworks route requests"
import json, re

routes = []
def route(method, pattern):
    def register(fn):
        routes.append((method, re.compile("^" + re.sub(r"{(\w+)}", r"(?P<\1>[^/]+)", pattern) + "$"), fn))
        return fn
    return register

PRODUCTS = {7: {"id": 7, "name": "Cement 50kg", "price": 11.0}}

@route("GET", "/api/products/{pid}")
def get_product(pid):
    p = PRODUCTS.get(int(pid))
    return (200, p) if p else (404, {"error": "not found"})

@route("POST", "/api/products")
def create_product(body):
    if not body.get("name") or body.get("price", 0) <= 0:
        return 422, {"error": "name and positive price required"}
    pid = max(PRODUCTS) + 1
    PRODUCTS[pid] = {"id": pid, **body}
    return 201, PRODUCTS[pid]

def handle(method, path, body=None):
    for m, rx, fn in routes:
        match = rx.match(path)
        if m == method and match:
            return fn(body, **match.groupdict()) if body is not None else fn(**match.groupdict())
    return 404, {"error": "no route"}

print(handle("GET", "/api/products/7"))
print(handle("GET", "/api/products/99"))
print(handle("POST", "/api/products", {"name": "Hammer", "price": 6}))
print(handle("POST", "/api/products", {"name": "", "price": -1}))
print(handle("DELETE", "/api/products/7"))
```

# Databases and ORMs {#databases}

Most backends store data in a relational database (**PostgreSQL**, MySQL, SQLite) — see the [SQL](/learn/sql) track.

An **ORM** (Object-Relational Mapper) lets you work with database rows as objects:

```python
from sqlmodel import SQLModel, Field, Session, create_engine, select

class Product(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    price: float

engine = create_engine("postgresql://app:secret@localhost/shop")
with Session(engine) as session:
    cheap = session.exec(select(Product).where(Product.price < 5)).all()
```

## Must-knows

- **Migrations** (Alembic, Prisma, Flyway) version your schema changes like code.
- **Transactions** keep related changes all-or-nothing (debit AND credit, or neither).
- **Indexes** on columns you filter and join by.
- **Connection pooling** — don't open a new connection per request.
- **Never build SQL from strings** — use parameters or the ORM.

```python run title="Transactions: all or nothing"
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE wallets (owner TEXT PRIMARY KEY, balance REAL CHECK (balance >= 0))")
db.executemany("INSERT INTO wallets VALUES (?, ?)", [("Rudo", 50), ("Sipho", 10)])

def transfer(src, dst, amount):
    try:
        with db:   # one transaction: commits on success, rolls back on error
            db.execute("UPDATE wallets SET balance = balance + ? WHERE owner = ?", (amount, dst))
            db.execute("UPDATE wallets SET balance = balance - ? WHERE owner = ?", (amount, src))
        return "ok"
    except sqlite3.IntegrityError:
        return "failed — rolled back"

print(transfer("Rudo", "Sipho", 20), dict(db.execute("SELECT * FROM wallets")))
print(transfer("Sipho", "Rudo", 500), dict(db.execute("SELECT * FROM wallets")))
```

# Authentication and Authorisation {#auth}

**Authentication** = who are you? **Authorisation** = what may you do?

## Passwords

- Store only a **slow, salted hash**: bcrypt, scrypt, Argon2 or PBKDF2. Never plain text, never MD5/SHA-1 alone.
- Rate-limit login attempts.
- Offer password reset by single-use, expiring email links.

```python run title="Salted, slow password hashing"
import hashlib, os, hmac

def hash_password(password, iterations=200_000):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2${iterations}${salt.hex()}${digest.hex()}"

def verify(password, stored):
    _, it, salt, digest = stored.split("$")
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(it))
    return hmac.compare_digest(check.hex(), digest)

stored = hash_password("Harare2026!")
print(stored[:60] + "…")
print(verify("Harare2026!", stored), verify("harare2026!", stored))
```

## Sessions vs tokens


```sketch
title: "Two ways to remember who logged in"
caption: "A session keeps the login on the server and gives the browser a random ID in a cookie. A token (such as a JWT) carries signed claims the server can check without a lookup."
cellW: 190
cellH: 105
nodes:
  - id: login
    label: "POST /login"
    col: 0
    row: 1
    shape: round
    tone: sky
    sub: "password checked"
  - id: sid
    label: "Session cookie"
    col: 1.7
    row: 0.3
    shape: note
    tone: gold
    sub: "random ID"
  - id: store
    label: "Session store"
    col: 3.3
    row: 0.3
    shape: db
    tone: gold
    sub: "ID → user"
  - id: jwt
    label: "Signed token"
    col: 1.7
    row: 1.7
    shape: note
    tone: teal
    sub: "user_id · role · expiry"
  - id: ver
    label: "Verify signature"
    col: 3.3
    row: 1.7
    shape: round
    tone: teal
    sub: "no lookup needed"
edges:
  - from: login
    to: sid
  - from: login
    to: jwt
  - from: sid
    to: store
    label: "look up"
  - from: jwt
    to: ver
    label: "check"
```

| | Session cookie | Bearer token (e.g. JWT) |
|---|---|---|
| Stored | Server-side session; browser holds an HttpOnly cookie | Client holds the token |
| Revoking | Easy — delete the session | Harder — needs short expiry or a deny-list |
| Best for | Web apps | Mobile apps, service-to-service |

Cookies should be **HttpOnly**, **Secure** and **SameSite**. Global AI Academy uses hashed session tokens in HttpOnly cookies.

## Authorisation: role-based access control (RBAC)

```python run title="RBAC in a few lines"
PERMISSIONS = {
    "student": {"lesson:read", "assignment:submit"},
    "teacher": {"lesson:read", "assignment:create", "assignment:grade"},
    "admin": {"lesson:read", "assignment:create", "assignment:grade", "user:manage"},
}

def can(role, permission):
    return permission in PERMISSIONS.get(role, set())

for role in ["student", "teacher", "admin"]:
    print(f"{role:8} grade? {can(role, 'assignment:grade')!s:5}  manage users? {can(role, 'user:manage')}")
```

Always check authorisation **on the server** for every request — hiding a button in the UI is not security.

# Validation, Errors and Security {#security}

- **Validate every input** (types, lengths, ranges, formats) at the boundary.
- **Never trust the client** — prices, roles and totals are computed on the server.
- Return **helpful but safe** errors — no stack traces or SQL in responses.
- **Rate-limit** expensive and sensitive endpoints.
- **CORS:** only allow origins you trust.
- **CSRF:** protect cookie-based forms (SameSite cookies + origin checks).
- Keep **secrets** in environment variables or a secret manager.
- Keep dependencies **updated** (`npm audit`, `pip-audit`).

See the [Security](/learn/security) track for the full picture.

# Caching and Background Jobs {#performance}

## Caching

Store expensive results so you don't recompute them: in memory, **Redis**, or a CDN for public responses.

```sketch
title: "Check the cache before the database"
caption: "A cache keeps recent answers in fast memory. A hit skips the slow work; a miss does the work once and stores the result with an expiry time."
cellW: 185
cellH: 110
nodes:
  - id: req
    label: "Request"
    col: 0
    row: 0.6
    shape: pill
    tone: sky
  - id: hit
    label: "In cache?"
    col: 1.4
    row: 0.6
    shape: diamond
    tone: gold
  - id: fast
    label: "Return cached"
    col: 2.9
    row: 0
    shape: pill
    tone: teal
    sub: "~1 ms"
  - id: db
    label: "Query database"
    col: 2.9
    row: 1.4
    shape: db
    tone: grape
    sub: "~50 ms"
  - id: save
    label: "Save with TTL"
    col: 4.2
    row: 1.4
    shape: note
edges:
  - from: req
    to: hit
  - from: hit
    to: fast
    label: "hit"
  - from: hit
    to: db
    label: "miss"
  - from: db
    to: save
```


```python run title="A time-limited cache"
import time
from functools import wraps

def ttl_cache(seconds):
    def decorator(fn):
        store = {}
        @wraps(fn)
        def wrapper(*args):
            now = time.time()
            if args in store and now - store[args][0] < seconds:
                return store[args][1]
            value = fn(*args)
            store[args] = (now, value)
            return value
        return wrapper
    return decorator

calls = {"n": 0}
@ttl_cache(seconds=60)
def exchange_rate(currency):
    calls["n"] += 1           # pretend this is a slow API call
    return {"ZiG": 26.8, "ZAR": 17.9}[currency]

for _ in range(5):
    exchange_rate("ZiG")
print("API calls made:", calls["n"])
```

## Background jobs

Slow work (sending emails, generating PDFs, processing uploads, AI calls) shouldn't block the request. Put it on a **queue** (Redis + Celery/RQ, BullMQ, Cloudflare Queues) and let **workers** process it.

```sketch
title: "Answer fast, do the slow part later"
caption: "The API puts a job on a queue and replies straight away. A worker picks jobs off the queue and retries the ones that fail."
cellW: 190
nodes:
  - id: api
    label: "API"
    col: 0
    row: 0
    shape: round
    tone: sky
    sub: "POST /signup"
  - id: q
    label: "Queue"
    col: 1.5
    row: 0
    shape: db
    tone: gold
    sub: "send_welcome(17)"
  - id: w
    label: "Worker"
    col: 3
    row: 0
    shape: round
    tone: teal
    sub: "sends the email"
  - id: ok
    label: "201 in 40 ms"
    col: 0
    row: 1.3
    shape: pill
    tone: grape
edges:
  - from: api
    to: q
    label: "enqueue"
  - from: q
    to: w
    label: "pick up"
  - from: api
    to: ok
  - from: w
    to: q
    label: "retry on failure"
    dashed: true
    bend: 40
```


# Testing and Observability {#testing}

## Tests

```python
# test_api.py — run with: pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_and_get_product():
    r = client.post("/api/products", json={"name": "Hammer", "price": 6})
    assert r.status_code == 201
    pid = r.json()["id"]
    assert client.get(f"/api/products/{pid}").json()["name"] == "Hammer"

def test_rejects_negative_price():
    assert client.post("/api/products", json={"name": "Bad", "price": -1}).status_code == 422
```

Test the **happy path**, **invalid input**, **permissions** (a student can't grade) and **edge cases**.

## Observability

- **Logs** — structured (JSON), with a request ID, no passwords or tokens.
- **Metrics** — request rate, error rate, latency (p50/p95/p99).
- **Traces** — follow one request across services.
- **Health checks** — `/health` for load balancers and monitoring.
- **Alerts** — wake someone only for things that need action.

````challenge
id: backend-validate
title: Validate an order request
difficulty: medium
prompt: |
  Write `validate_order(body)` that returns a **list of error messages** (empty if valid). Check:
  - `body` has an `items` list with **at least one** item → else `"items required"`,
  - each item has an integer `product_id` and an integer `qty` between **1 and 100** → else `"invalid item at index N"` (N = position),
  - `phone` (if present) matches `07` followed by 8 digits → else `"invalid phone"`.
starter: |
  import re

  def validate_order(body):
      errors = []
      return errors

  print(validate_order({"items": [{"product_id": 7, "qty": 2}], "phone": "0772123456"}))
tests: |
  assert validate_order({"items": [{"product_id": 7, "qty": 2}], "phone": "0772123456"}) == []
  assert validate_order({}) == ["items required"]
  assert validate_order({"items": []}) == ["items required"]
  assert validate_order({"items": [{"product_id": 7, "qty": 0}, {"product_id": "x", "qty": 1}]}) == ["invalid item at index 0", "invalid item at index 1"]
  assert validate_order({"items": [{"product_id": 1, "qty": 1}], "phone": "12345"}) == ["invalid phone"]
````

```quiz
- q: Where must authorisation checks happen?
  options: ["Only in the UI", "On the server for every request", "Only at login", "In the database backup"]
  answer: 1
- q: Why use a database transaction for a money transfer?
  options: ["It's faster", "Both updates succeed or neither does", "It encrypts data", "It avoids indexes"]
  answer: 1
- q: Which is the best way to store passwords?
  options: ["Plain text", "MD5", "A slow salted hash like bcrypt, Argon2 or PBKDF2", "Base64"]
  answer: 2
```

```exam
- q: "Which status code means 'created'?"
  options: ["200", "201", "204", "302"]
  answer: 1
- q: "Which method should never change data?"
  options: ["GET", "POST", "DELETE", "PATCH"]
  answer: 0
- q: "Why paginate list endpoints?"
  options: ["To avoid huge slow responses", "To hide data", "It's required by JSON", "To use more memory"]
  answer: 0
- q: "Where should business rules like prices be enforced?"
  options: ["On the server", "Only in the browser", "In CSS", "In the URL"]
  answer: 0
- q: "What is a database migration?"
  options: ["A versioned change to the schema", "Moving servers", "A backup", "A query"]
  answer: 0
- q: "Why use background jobs for sending emails?"
  options: ["So slow work doesn't block the request", "Emails require it", "To skip validation", "To avoid logging"]
  answer: 0
```
