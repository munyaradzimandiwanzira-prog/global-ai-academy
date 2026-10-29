---
id: postgresql
title: PostgreSQL & pgvector
short: PG
category: databases
level: intermediate
language: postgres
color: "#336791"
icon: "🐘"
order: 32.5
premium: true
preview: 3
summary: The database most AI products run on. Real PostgreSQL 18 runs in your browser, with the Zim Traders shop data. Learn types and constraints, joins, CTEs and window functions, JSONB, indexes and EXPLAIN, transactions and MVCC, full-text search, then pgvector for semantic search, hybrid search and RAG.
tags: [postgresql, postgres, pgvector, sql, jsonb, vector database, embeddings, hybrid search, rag, indexes, transactions]
---

# Why PostgreSQL? {#intro}

**PostgreSQL** (say *post-gress*, often just *Postgres*) is a free, open-source relational database that has been developed in public since 1996. It runs banks, government systems and most of the start-ups you have heard of, and it is the default database on Supabase, Neon, AWS RDS, Google Cloud SQL and Azure.

Three things make it the safe first choice:

1. **It is strict about your data.** Types, constraints and transactions stop bad data getting in.
2. **It does far more than tables.** JSON documents, full-text search, geography, time series and, through the **pgvector** extension, the embeddings that power AI search.
3. **It is SQL you already know.** Everything from the SQL track works here; Postgres adds a lot on top.

> **This track runs real PostgreSQL 18 in your browser** (it's called PGlite: Postgres compiled to WebAssembly). The first run takes a few seconds to start the database; after that, queries come back instantly. Every run starts from a fresh copy of the Zim Traders sample data, so you cannot break anything.

```sketch
title: What happens when you send a query
caption: Every client gets its own backend process. Changes go to the write-ahead log (WAL) first, so a crash never loses a committed transaction.
cellW: 158
cellH: 112
nodes:
  - id: app
    label: Your app
    sub: psql · Python · Node
    col: 0
    row: 1
    shape: round
    tone: sky
  - id: pool
    label: Connection pool
    sub: PgBouncer
    col: 1.2
    row: 1
    shape: pill
  - id: be
    label: Backend process
    sub: parse → plan → execute
    col: 2.5
    row: 1
    shape: round
    tone: grape
  - id: buf
    label: Shared buffers
    sub: pages in RAM
    col: 3.8
    row: 0.3
    shape: db
    tone: gold
  - id: wal
    label: Write-ahead log
    sub: every change, in order
    col: 3.8
    row: 1.7
    shape: doc
    tone: rose
  - id: disk
    label: Data files
    col: 5.1
    row: 1
    shape: db
    tone: teal
edges:
  - from: app
    to: pool
    label: SQL
  - from: pool
    to: be
  - from: be
    to: buf
    label: read/write
  - from: be
    to: wal
    label: log first
  - from: buf
    to: disk
    label: checkpoint
    dashed: true
  - from: wal
    to: disk
    label: "replay\nafter crash"
    dashed: true
```

Run your first query. The sample database has `customers`, `categories`, `products`, `orders`, `order_items` and `documents` (help-centre articles with embeddings, used later).

```postgres run title="Your first PostgreSQL query"
SELECT name, city, province
FROM customers
WHERE province = 'Harare'
ORDER BY name;
```

```postgres run title="What tables and columns exist?"
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

That second query reads the **information schema**: Postgres describes itself with tables you can query like any other.

```quiz
- q: Why do AI teams often choose PostgreSQL for embeddings?
  options: ["It is the only database that supports vectors", "pgvector keeps embeddings next to the rest of the data, so one query can filter, join and rank by similarity", "Postgres stores vectors on GPUs", "Vectors cannot be stored anywhere else"]
  answer: 1
  explain: One system, one transaction, one backup, and SQL joins between vectors and your business data.
- q: What is the write-ahead log for?
  options: ["Caching query results", "Recording every change before it reaches the data files, so the database can recover after a crash", "Storing passwords", "Logging slow queries only"]
  answer: 1
- q: What does PGlite, used in this track, give you?
  options: ["A PostgreSQL-like toy", "Real PostgreSQL compiled to WebAssembly, running in the browser", "A remote server in Harare", "SQLite with a Postgres skin"]
  answer: 1
```

# Types, Tables and Constraints {#tables}

Postgres makes you say what each column holds, then holds you to it. That strictness is a feature: the database rejects bad data before your app ever sees it.

| Type | Use it for | Example |
|---|---|---|
| `integer`, `bigint` | counts, IDs | `42` |
| `numeric(10,2)` | **money** (exact) | `8.50` |
| `double precision` | measurements (approximate) | `0.1 + 0.2` |
| `text` | any string (no length needed) | `'Harare'` |
| `boolean` | yes/no | `true` |
| `date`, `timestamptz` | days, moments in time (with time zone) | `'2026-03-01 16:20+02'` |
| `uuid` | public IDs | `gen_random_uuid()` |
| `jsonb` | flexible documents | `'{"brand":"Gold Leaf"}'` |
| `text[]` | small lists | `'{solar,lighting}'` |
| `vector(n)` | embeddings (pgvector) | `'[0.1,0.9,0,0]'` |

```postgres run title="Why money is numeric, never float"
SELECT 0.1::double precision + 0.2::double precision AS float_sum,
       0.1::numeric + 0.2::numeric                   AS numeric_sum;
```

`::type` is the Postgres **cast** operator. Floats store binary approximations; `numeric` stores exact decimals, which is why prices, balances and tax always use it.

```sketch
title: Constraints guard the door
caption: Every INSERT and UPDATE is checked before it is stored. A row that breaks any rule is rejected with a clear error, and nothing is written.
cellW: 200
cellH: 108
nodes:
  - id: row
    label: New row
    sub: "price = -5"
    col: 0
    row: 1
    shape: doc
    tone: sky
  - id: nn
    label: NOT NULL
    sub: value present?
    col: 1.25
    row: 0
    shape: round
  - id: ck
    label: CHECK
    sub: "price > 0?"
    col: 1.25
    row: 1
    shape: round
    tone: rose
  - id: fk
    label: FOREIGN KEY
    sub: category exists?
    col: 1.25
    row: 2
    shape: round
  - id: tbl
    label: products
    col: 2.6
    row: 1
    shape: db
    tone: teal
  - id: err
    label: ERROR, nothing saved
    col: 2.6
    row: 2.3
    shape: pill
    tone: rose
edges:
  - from: row
    to: nn
  - from: row
    to: ck
  - from: row
    to: fk
  - from: ck
    to: tbl
    label: all pass
  - from: ck
    to: err
    label: fails
    dashed: true
```

```postgres run title="A constraint in action"
INSERT INTO products (product_id, name, category_id, price)
VALUES (13, 'Free Sample', 1, 0);
```

The `CHECK (price > 0)` on `products` rejects it. Now make your own table with an **identity** column (Postgres generates the IDs) and sensible constraints:

```postgres run title="Create, insert, read back"
-- dataset: empty
CREATE TABLE learners (
  learner_id  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  full_name   text NOT NULL,
  level       text NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  joined_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO learners (email, full_name) VALUES
  ('rudo@example.com', 'Rudo Chikore'),
  ('sipho@example.com', 'Sipho Ndlovu');

INSERT INTO learners (email, full_name, level)
VALUES ('farai@example.com', 'Farai Mutasa', 'advanced')
RETURNING learner_id, level;
```

`RETURNING` hands back the inserted row, so your app gets the new ID without a second query. The `-- dataset: empty` comment at the top starts that block from an empty database.

```exercise
prompt: Make the price column exact to the cent and refuse zero or negative prices.
lang: postgres
code: |
  CREATE TABLE menu (
    item  text PRIMARY KEY,
    price ___(8,2) NOT NULL ___ (price > 0)
  );
answers: [numeric, CHECK]
hint: Exact decimals, then a rule the database enforces.
```

```quiz
- q: Which type should a mobile-money balance use?
  options: ["double precision", "real", "numeric(12,2)", "text"]
  answer: 2
  explain: Money needs exact decimal arithmetic.
- q: What does RETURNING do on an INSERT?
  options: ["Undoes the insert", "Returns the inserted rows, including generated values like IDs", "Returns the number of rows only", "Commits the transaction"]
  answer: 1
- q: Why prefer timestamptz over timestamp for events?
  options: ["It is smaller", "It records an absolute moment, so times stay correct across time zones", "It is faster to index", "timestamp is deprecated"]
  answer: 1
```

````challenge
id: pg-tables-cheap-instock
title: In stock and under $20
difficulty: easy
prompt: |
  List the `name` and `price` of products that are **in stock** and cost **less than 20**, cheapest first.
starter: |
  SELECT name, price
  FROM products
tests: |
  SELECT name, price FROM products WHERE in_stock AND price < 20 ORDER BY price;
````

# Postgres-Flavoured Querying {#querying}

Everything from the SQL track works. These are the Postgres extras you will use every day.

```postgres run title="ILIKE, COALESCE and string functions"
SELECT upper(name)                    AS shop,
       coalesce(phone, 'no phone')    AS phone,
       length(contact_name)           AS name_length
FROM customers
WHERE name ILIKE '%tech%' OR name ILIKE '%books%';
```

- `ILIKE` matches without caring about case; `LIKE` cares.
- `coalesce(a, b)` returns the first value that is not NULL.
- `||` joins strings: `city || ', ' || province`.

```postgres run title="Dates and intervals"
SELECT order_id,
       ordered_at,
       date_trunc('month', ordered_at)::date AS month,
       now() - ordered_at                    AS age
FROM orders
WHERE ordered_at >= '2026-03-01'
ORDER BY ordered_at;
```

`date_trunc` rounds a timestamp down to the hour, day, week or month. Subtracting two timestamps gives an **interval**.

```postgres run title="DISTINCT ON: the latest order per customer"
SELECT DISTINCT ON (customer_id)
       customer_id, order_id, ordered_at
FROM orders
ORDER BY customer_id, ordered_at DESC;
```

`DISTINCT ON (x)` keeps the **first** row for each `x`, according to `ORDER BY`. It is the shortest way to say "the latest per group", which is a question you will ask constantly.

```postgres run title="CASE and FILTER"
SELECT count(*)                                       AS orders,
       count(*) FILTER (WHERE status = 'delivered')   AS delivered,
       count(*) FILTER (WHERE status = 'cancelled')   AS cancelled,
       CASE WHEN count(*) FILTER (WHERE status = 'pending') > 1
            THEN 'chase pending orders' ELSE 'all good' END AS note
FROM orders;
```

```exercise
prompt: Find shops whose name contains "fresh", in any case.
lang: postgres
code: |
  SELECT name FROM customers WHERE name ___ '%fresh%';
answers: [ILIKE]
```

```quiz
- q: What does DISTINCT ON (customer_id) with ORDER BY customer_id, ordered_at DESC return?
  options: ["Every order", "Each customer's newest order", "Each customer's oldest order", "Customers with one order"]
  answer: 1
- q: What does count(*) FILTER (WHERE status = 'pending') count?
  options: ["All rows", "Only rows where status is pending", "Distinct statuses", "NULL values"]
  answer: 1
- q: What is now() - ordered_at?
  options: ["A number of seconds", "An interval", "A date", "An error"]
  answer: 1
```

````challenge
id: pg-query-monthly
title: Orders per month
difficulty: medium
prompt: |
  Count orders per month. Return `month` (the month as a `date`, using `date_trunc`) and `orders`, oldest month first.
starter: |
  SELECT
tests: |
  SELECT date_trunc('month', ordered_at)::date AS month, count(*) AS orders
  FROM orders GROUP BY 1 ORDER BY 1;
````

# Joins and CTEs {#joins-ctes}

A **join** combines rows from two tables on a matching key. A **CTE** (Common Table Expression, `WITH name AS (...)`) names a step of your query so you can build complicated answers one readable stage at a time.

```sketch
title: How the shop's tables connect
caption: Every arrow is a foreign key. To get from a customer to the categories they buy, you walk orders, then order_items, then products.
cellW: 190
cellH: 105
nodes:
  - id: c
    label: customers
    sub: customer_id · city
    col: 0
    row: 0
    shape: db
    tone: sky
  - id: o
    label: orders
    sub: order_id · status
    col: 1.2
    row: 0
    shape: db
    tone: sky
  - id: oi
    label: order_items
    sub: quantity
    col: 2.4
    row: 0
    shape: db
    tone: gold
  - id: p
    label: products
    sub: price · attributes
    col: 2.4
    row: 1.3
    shape: db
    tone: teal
  - id: cat
    label: categories
    col: 1.2
    row: 1.3
    shape: db
    tone: teal
edges:
  - from: o
    to: c
    label: customer_id
  - from: oi
    to: o
    label: order_id
  - from: oi
    to: p
    label: product_id
  - from: p
    to: cat
    label: category_id
```

```postgres run title="Revenue per customer, with USING"
SELECT c.name,
       sum(oi.quantity * p.price) AS revenue
FROM customers c
JOIN orders o       USING (customer_id)
JOIN order_items oi USING (order_id)
JOIN products p     USING (product_id)
WHERE o.status = 'delivered'
GROUP BY c.name
ORDER BY revenue DESC;
```

`USING (customer_id)` is shorthand for `ON c.customer_id = o.customer_id` when both columns share a name.

```postgres run title="LEFT JOIN: customers with no orders too"
SELECT c.name, count(o.order_id) AS orders
FROM customers c
LEFT JOIN orders o USING (customer_id)
GROUP BY c.name
ORDER BY orders, c.name;
```

A `LEFT JOIN` keeps every row from the left table, filling the right side with NULLs when there is no match. `count(o.order_id)` counts only real orders.

```postgres run title="A CTE in stages"
WITH delivered AS (
  SELECT order_id, customer_id FROM orders WHERE status = 'delivered'
),
lines AS (
  SELECT d.customer_id, oi.quantity * p.price AS amount
  FROM delivered d
  JOIN order_items oi USING (order_id)
  JOIN products p USING (product_id)
)
SELECT customer_id, round(avg(amount), 2) AS avg_line, sum(amount) AS total
FROM lines
GROUP BY customer_id
ORDER BY total DESC
LIMIT 3;
```

A **recursive CTE** walks a hierarchy, such as an organisation chart or category tree, whatever its depth:

```postgres run title="Recursive CTE: who reports to whom"
-- dataset: empty
CREATE TABLE staff (id int PRIMARY KEY, name text, manager_id int REFERENCES staff);
INSERT INTO staff VALUES
  (1,'Rumbi',NULL),(2,'Blessing',1),(3,'Tafadzwa',2),(4,'Lindiwe',2),(5,'Takudzwa',1),(6,'Precious',5);

WITH RECURSIVE chain AS (
  SELECT id, name, 0 AS depth, name AS path FROM staff WHERE manager_id IS NULL
  UNION ALL
  SELECT s.id, s.name, c.depth + 1, c.path || ' → ' || s.name
  FROM staff s JOIN chain c ON s.manager_id = c.id
)
SELECT repeat('  ', depth) || name AS org_chart, path FROM chain ORDER BY path;
```

```quiz
- q: When does LEFT JOIN give a different result from JOIN?
  options: ["Never", "When some left rows have no match; LEFT JOIN keeps them with NULLs", "Only with GROUP BY", "When the tables are large"]
  answer: 1
- q: What is a CTE?
  options: ["A temporary table saved to disk", "A named sub-query introduced with WITH, used to build a query in readable steps", "A type of index", "A trigger"]
  answer: 1
- q: What does a recursive CTE need?
  options: ["A starting query, UNION ALL, and a step that joins back to the CTE", "Two tables only", "A WHILE loop", "An index on every column"]
  answer: 0
```

````challenge
id: pg-joins-category-revenue
title: Revenue per category
difficulty: medium
prompt: |
  For **delivered** orders only, return each category `name` and its `revenue` (sum of `quantity * price`), highest revenue first.
starter: |
  SELECT
tests: |
  SELECT cat.name, sum(oi.quantity * p.price) AS revenue
  FROM orders o JOIN order_items oi USING (order_id) JOIN products p USING (product_id)
  JOIN categories cat USING (category_id)
  WHERE o.status = 'delivered'
  GROUP BY cat.name ORDER BY revenue DESC;
````

# Window Functions {#window}

`GROUP BY` collapses rows into one per group. A **window function** computes across a group of rows but **keeps every row**: a rank, a running total, the previous value.

```sketch
title: GROUP BY collapses; a window keeps every row
caption: OVER (PARTITION BY …) defines the window. Each row sees its own partition and gets an extra column; no rows disappear.
cellW: 200
cellH: 105
nodes:
  - id: rows
    label: 15 order lines
    col: 0
    row: 1
    shape: db
    tone: sky
  - id: gb
    label: GROUP BY order_id
    col: 1.3
    row: 0.3
    shape: round
    tone: gold
  - id: few
    label: 10 rows
    sub: one per order
    col: 2.6
    row: 0.3
    shape: db
  - id: win
    label: OVER (PARTITION BY order_id)
    col: 1.3
    row: 1.7
    shape: round
    tone: teal
    w: 1.15
  - id: all
    label: 15 rows
    sub: + rank · total · share
    col: 2.6
    row: 1.7
    shape: db
    tone: teal
edges:
  - from: rows
    to: gb
  - from: gb
    to: few
  - from: rows
    to: win
  - from: win
    to: all
```

```postgres run title="Rank products by price inside each category"
SELECT c.name AS category, p.name, p.price,
       rank() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) AS price_rank
FROM products p JOIN categories c USING (category_id)
ORDER BY category, price_rank;
```

```postgres run title="Running total and previous order"
SELECT order_id,
       ordered_at::date AS day,
       count(*) OVER (ORDER BY ordered_at)              AS running_orders,
       lag(ordered_at::date) OVER (ORDER BY ordered_at) AS previous_day
FROM orders
ORDER BY ordered_at;
```

| Function | Gives you |
|---|---|
| `row_number()` | 1, 2, 3 … no ties |
| `rank()` / `dense_rank()` | ranks with ties (gaps / no gaps) |
| `sum() / avg() / count() OVER (…)` | running or per-group totals on every row |
| `lag(x)` / `lead(x)` | the previous / next row's value |
| `first_value(x)` | the first value in the window |
| `ntile(4)` | which quarter a row falls in |

```postgres run title="Each line's share of its order"
SELECT oi.order_id, p.name,
       oi.quantity * p.price AS line_total,
       round(100 * oi.quantity * p.price / sum(oi.quantity * p.price) OVER (PARTITION BY oi.order_id), 1) AS pct_of_order
FROM order_items oi JOIN products p USING (product_id)
ORDER BY oi.order_id, pct_of_order DESC;
```

```exercise
prompt: Number each customer's orders 1, 2, 3 from oldest to newest.
lang: postgres
code: |
  SELECT customer_id, order_id,
         ___() OVER (PARTITION BY customer_id ORDER BY ordered_at) AS nth
  FROM orders;
answers: [row_number]
```

```quiz
- q: How is a window function different from GROUP BY?
  options: ["It is slower", "It adds a computed column while keeping every row", "It only works on dates", "It removes duplicates"]
  answer: 1
- q: Two products cost the same. rank() gives 1, 1 … what comes next?
  options: ["2", "3", "1", "NULL"]
  answer: 1
  explain: rank() leaves a gap after ties; dense_rank() would give 2.
- q: Which function returns the value from the previous row?
  options: ["prev()", "lead()", "lag()", "first_value()"]
  answer: 2
```

````challenge
id: pg-window-top-per-category
title: Most expensive product per category
difficulty: hard
prompt: |
  Return the single most expensive product in each category: `category` (category name), `name` and `price`, ordered by `category`. Use a window function or `DISTINCT ON`.
starter: |
  SELECT
tests: |
  SELECT DISTINCT ON (c.name) c.name AS category, p.name, p.price
  FROM products p JOIN categories c USING (category_id)
  ORDER BY c.name, p.price DESC;
````

# JSONB: Documents Inside Tables {#jsonb}

Some data does not fit fixed columns: product specifications differ for a laptop and a bag of cement. **JSONB** stores a JSON document in a column, in a binary form Postgres can index and query.

```postgres run title="Reading JSONB"
SELECT name,
       attributes                      AS everything,
       attributes->>'brand'            AS brand,
       (attributes->>'weight_kg')::int AS kg,
       attributes->'tags'              AS tags
FROM products
ORDER BY product_id;
```

| Operator | Meaning | Returns |
|---|---|---|
| `->'key'` | get a field | `jsonb` |
| `->>'key'` | get a field as text | `text` |
| `? 'key'` | does the key exist? | `boolean` |
| `@> '{"k":v}'` | does it **contain** this JSON? | `boolean` |
| `#>> '{a,b}'` | get a nested path as text | `text` |

```postgres run title="Containment and key tests"
SELECT name FROM products WHERE attributes @> '{"tags": ["solar"]}';
SELECT name FROM products WHERE attributes ? 'storage_gb';
SELECT name, attributes->>'storage_gb' AS gb
FROM products
WHERE (attributes->>'storage_gb')::int >= 128;
```

Each query's result appears as its own table, in order.

```postgres run title="Build JSON for an API in one query"
SELECT jsonb_build_object(
         'customer', c.name,
         'orders', jsonb_agg(jsonb_build_object('id', o.order_id, 'status', o.status) ORDER BY o.order_id)
       ) AS payload
FROM customers c JOIN orders o USING (customer_id)
WHERE c.customer_id IN (1, 2)
GROUP BY c.name;
```

```postgres run title="Update one key without touching the rest"
UPDATE products
SET attributes = attributes || '{"on_promo": true}'
WHERE product_id = 4
RETURNING name, attributes;
```

> **When to use JSONB:** for attributes that vary per row, raw API payloads and settings. **When not to:** anything you join on, filter on constantly, or need constraints for. Those deserve real columns. A common pattern is real columns for the core fields plus one `attributes jsonb` for the long tail, exactly like our `products` table.

A **GIN index** makes `@>` and `?` fast on large tables:

```postgres
CREATE INDEX products_attributes_gin ON products USING gin (attributes);
```

```exercise
prompt: Get the brand as text, and find products that have a brand key.
lang: postgres
code: |
  SELECT name, attributes___'brand' AS brand
  FROM products
  WHERE attributes ___ 'brand';
answers: ["->>", "?"]
```

```quiz
- q: What is the difference between -> and ->>?
  options: ["None", "-> returns jsonb, ->> returns text", "->> is faster", "-> only works on arrays"]
  answer: 1
- q: Which index type speeds up @> containment queries on JSONB?
  options: ["B-tree", "Hash", "GIN", "BRIN"]
  answer: 2
- q: A field is used in every WHERE and JOIN. Where should it live?
  options: ["Inside JSONB", "In a real, typed (and probably indexed) column", "In a text column as JSON", "In a separate database"]
  answer: 1
```

````challenge
id: pg-jsonb-art
title: Art for sale
difficulty: medium
prompt: |
  Return the `name` and `price` of products whose `attributes` contain the tag `"art"`, most expensive first.
starter: |
  SELECT name, price FROM products
tests: |
  SELECT name, price FROM products WHERE attributes @> '{"tags":["art"]}' ORDER BY price DESC;
````

# Indexes and EXPLAIN {#indexes}

An **index** is a separate, sorted structure that lets Postgres find rows without reading the whole table, like the index at the back of a book. The default kind is a **B-tree**.

```sketch
title: A B-tree index finds one row in three steps
caption: Looking up 'Mutare' reads the root, one branch and one leaf, then jumps straight to the row. Without the index Postgres would scan every row.
cellW: 175
cellH: 108
nodes:
  - id: root
    label: "root: < K | ≥ K"
    col: 1.5
    row: 0
    shape: round
    tone: gold
  - id: b1
    label: "A … J"
    col: 0.5
    row: 1
    shape: round
  - id: b2
    label: "K … Z"
    col: 2.5
    row: 1
    shape: round
    tone: teal
  - id: l1
    label: "K … Mb"
    col: 2
    row: 2
    shape: box
  - id: l2
    label: "Mu … Z"
    col: 3
    row: 2
    shape: box
    tone: teal
  - id: row
    label: "row: Mutare Timber Co"
    col: 3
    row: 3.1
    shape: doc
    tone: sky
    w: 1.25
edges:
  - from: root
    to: b1
  - from: root
    to: b2
    label: "M ≥ K"
  - from: b2
    to: l1
  - from: b2
    to: l2
    label: "Mu"
  - from: l2
    to: row
    label: pointer
```

`EXPLAIN` shows the **plan**: how Postgres intends to run your query. `EXPLAIN ANALYZE` actually runs it and reports real timings.

```postgres run title="Seq Scan, then Index Scan"
-- dataset: empty
CREATE TABLE payments AS
SELECT g AS id,
       'ML-' || (g % 50000) AS account,
       round((random() * 500)::numeric, 2) AS amount
FROM generate_series(1, 200000) g;
ANALYZE payments;

EXPLAIN ANALYZE SELECT * FROM payments WHERE account = 'ML-42';
```

Read the plan: **Seq Scan** means every one of the 200,000 rows was checked. Now add an index and run the same query:

```postgres run title="With an index"
-- dataset: empty
CREATE TABLE payments AS
SELECT g AS id, 'ML-' || (g % 50000) AS account, round((random() * 500)::numeric, 2) AS amount
FROM generate_series(1, 200000) g;
CREATE INDEX payments_account_idx ON payments (account);
ANALYZE payments;

EXPLAIN ANALYZE SELECT * FROM payments WHERE account = 'ML-42';
```

Compare the **Execution Time** lines; the index version is typically hundreds of times faster.

| Index | Good for |
|---|---|
| **B-tree** (default) | `=`, `<`, `>`, `BETWEEN`, `ORDER BY`, prefix `LIKE 'abc%'` |
| **GIN** | JSONB, arrays, full-text search |
| **HNSW / IVFFlat** (pgvector) | nearest-neighbour vector search |
| **BRIN** | huge, naturally ordered tables (time series) |
| **Partial** `WHERE status = 'pending'` | indexing only the rows you query |
| **Composite** `(customer_id, ordered_at)` | filters on the first column, then sorts by the second |

> **Indexes are not free.** Each one slows every `INSERT` and `UPDATE` a little and takes disk space. Add them for the queries you actually run, measured with `EXPLAIN ANALYZE`; don't index every column "just in case".

```quiz
- q: What does "Seq Scan" in a plan mean?
  options: ["The index was used", "Postgres read every row of the table", "The query failed", "Rows were sorted"]
  answer: 1
- q: You often run WHERE customer_id = $1 ORDER BY ordered_at DESC. Which index helps most?
  options: ["(ordered_at)", "(customer_id, ordered_at)", "(ordered_at, customer_id)", "A GIN index"]
  answer: 1
  explain: Equality column first, then the sort column. The index returns rows already in order.
- q: What is the cost of adding an index?
  options: ["Nothing", "Slower writes and more disk space", "Slower reads", "It locks the table forever"]
  answer: 1
```

# Transactions, MVCC and Upserts {#transactions}

A **transaction** groups statements so they succeed or fail **together**. Moving money between two accounts must never debit one and fail to credit the other.

```postgres run title="ROLLBACK undoes everything since BEGIN"
BEGIN;
UPDATE products SET price = price * 2;
SELECT name, price FROM products WHERE product_id = 1;
ROLLBACK;

SELECT name, price FROM products WHERE product_id = 1;
```

The last query shows the original price: the doubling never happened. Use `COMMIT` instead of `ROLLBACK` to keep changes.

**ACID** names the guarantees:

- **Atomic**: all statements or none.
- **Consistent**: constraints hold before and after.
- **Isolated**: concurrent transactions don't see each other's half-done work.
- **Durable**: once committed, it survives a crash (thanks to the WAL).

```sketch
title: MVCC — readers never block writers
caption: An UPDATE writes a new version of the row. Transactions that started earlier keep reading the old version; new ones see the new one. VACUUM later removes versions nobody can see.
cellW: 195
cellH: 110
nodes:
  - id: v1
    label: "row v1: price 8.50"
    col: 1.3
    row: 0
    shape: doc
  - id: v2
    label: "row v2: price 9.00"
    col: 1.3
    row: 1.3
    shape: doc
    tone: teal
  - id: ta
    label: "Tx A (started earlier)"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: tb
    label: "Tx B: UPDATE …"
    col: 0
    row: 1.3
    shape: round
    tone: gold
  - id: tc
    label: "Tx C (after commit)"
    col: 2.6
    row: 1.3
    shape: round
    tone: sky
  - id: vac
    label: VACUUM
    sub: removes dead v1 later
    col: 2.6
    row: 0
    shape: pill
    tone: grape
edges:
  - from: ta
    to: v1
    label: sees
  - from: tb
    to: v2
    label: writes
  - from: tc
    to: v2
    label: sees
  - from: vac
    to: v1
    dashed: true
```

**Savepoints** let you undo part of a transaction:

```postgres run title="SAVEPOINT"
BEGIN;
UPDATE products SET price = 9.00 WHERE product_id = 1;
SAVEPOINT before_mistake;
DELETE FROM order_items;            -- oops
ROLLBACK TO SAVEPOINT before_mistake;
COMMIT;

SELECT (SELECT price FROM products WHERE product_id = 1) AS new_price,
       (SELECT count(*) FROM order_items)                AS order_lines_kept;
```

An **upsert** inserts a row, or updates it if the key already exists: one atomic statement, safe even when two requests race.

```postgres run title="INSERT … ON CONFLICT"
INSERT INTO products (product_id, name, category_id, price)
VALUES (2, 'Cooking Oil 2L', 1, 4.50)
ON CONFLICT (product_id) DO UPDATE SET price = EXCLUDED.price
RETURNING product_id, name, price;
```

`EXCLUDED` is the row you tried to insert.

To stop two transactions both selling the last laptop, lock the row while you decide: `SELECT … FOR UPDATE`. The second transaction waits until the first commits.

```exercise
prompt: Insert a category, or rename it if the ID already exists.
lang: postgres
code: |
  INSERT INTO categories (category_id, name) VALUES (4, 'Arts & Crafts')
  ON CONFLICT (category_id) DO ___ SET name = ___.name;
answers: [UPDATE, EXCLUDED]
```

```quiz
- q: A transfer debits account A, then the credit to B fails. What should happen?
  options: ["Keep the debit", "Roll back the whole transaction so A is untouched", "Retry the credit forever", "Delete account B"]
  answer: 1
- q: Under MVCC, what does an UPDATE do?
  options: ["Overwrites the row in place", "Writes a new row version; older transactions keep seeing the old one", "Locks the whole table for readers", "Deletes the table"]
  answer: 1
- q: What does SELECT … FOR UPDATE do?
  options: ["Updates the selected rows", "Locks the selected rows until the transaction ends, so others wait", "Creates an index", "Nothing in Postgres"]
  answer: 1
```

# Full-Text Search {#full-text}

`LIKE '%refund%'` finds exact substrings, but it doesn't understand words: it misses "refunded" and can't rank results. Postgres has a real search engine built in.

```postgres run title="tsvector and tsquery"
SELECT to_tsvector('english', 'Cancelled orders are refunded within 5 days') AS document,
       websearch_to_tsquery('english', 'refund order')                AS query;
```

The **tsvector** stores normalised word stems ("refund", "order", "cancel") with positions; the **tsquery** is the search. `@@` tests whether they match:

```postgres run title="Search the help centre, best first"
SELECT title,
       ts_rank(to_tsvector('english', title || ' ' || body), q) AS score
FROM documents,
     websearch_to_tsquery('english', 'refund or card') AS q
WHERE to_tsvector('english', title || ' ' || body) @@ q
ORDER BY score DESC;
```

`websearch_to_tsquery` accepts what people type into search boxes: `refund card` (both words), `refund or card`, `"exact phrase"`, `-excluded`.

For speed, store the vector in a **generated column** and index it with GIN:

```postgres run title="A searchable column that maintains itself"
ALTER TABLE documents
  ADD COLUMN search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;
CREATE INDEX documents_search_idx ON documents USING gin (search);

SELECT title FROM documents
WHERE search @@ websearch_to_tsquery('english', 'solar');
```

```quiz
- q: Why is full-text search better than LIKE '%word%' for a help centre?
  options: ["It is shorter to type", "It matches word forms (refund/refunded), ignores stop words, ranks results and can use an index", "LIKE doesn't work in Postgres", "It searches images"]
  answer: 1
- q: Which index makes tsvector search fast?
  options: ["B-tree", "GIN", "HNSW", "Hash"]
  answer: 1
- q: Full-text search fails on "how do I pay with my phone" when the article says "EcoCash". Why?
  options: ["A bug", "Keyword search matches words, not meaning; there is no shared word", "The index is missing", "Postgres can't search phones"]
  answer: 1
  explain: That gap is exactly what vector search fills, next lesson.
```

# pgvector: Semantic Search in SQL {#pgvector}

An **embedding** is a list of numbers that captures the meaning of a text (or image). Texts that mean similar things get vectors that point in similar directions, even with no words in common. **pgvector** adds a `vector` type, distance operators and vector indexes to Postgres.

Our `documents` table has toy 4-dimensional embeddings so you can read them. Each number roughly means: *payments, delivery, solar & power, accounts*. Real models produce 384 to 3,072 dimensions; the SQL is identical.

```sketch
title: Similar meaning, nearby vectors
caption: The question and the EcoCash article point the same way (small angle, small cosine distance) even though they share no words. The solar article points elsewhere.
cellW: 180
cellH: 110
nodes:
  - id: q
    label: "“How do I pay with my phone?”"
    sub: "[0.9, 0.1, 0.0, 0.1]"
    col: 0
    row: 1
    shape: pill
    tone: sky
    w: 1.4
  - id: o
    label: origin
    shape: dot
    col: 2
    row: 1
  - id: eco
    label: Paying with EcoCash
    sub: "[0.95, 0.10, 0.02, 0.15]"
    col: 3.3
    row: 0.2
    shape: doc
    tone: teal
  - id: solar
    label: Solar lantern care
    sub: "[0.02, 0.05, 0.97, 0.01]"
    col: 3.3
    row: 2
    shape: doc
    tone: rose
edges:
  - from: o
    to: eco
    label: "cosine distance ≈ 0.01"
  - from: o
    to: solar
    label: "≈ 0.97"
    dashed: true
  - from: q
    to: o
    label: embed
```

```postgres run title="Nearest articles to a question"
-- the question "How do I pay with my phone?", embedded
SELECT title,
       round((embedding <=> '[0.9,0.1,0,0.1]')::numeric, 3) AS cosine_distance
FROM documents
ORDER BY embedding <=> '[0.9,0.1,0,0.1]'
LIMIT 3;
```

| Operator | Distance | Use when |
|---|---|---|
| `<=>` | cosine distance (1 − cosine similarity) | most text embeddings |
| `<->` | Euclidean (L2) | embeddings trained for L2, images |
| `<#>` | negative inner product | normalised vectors (fastest) |
| `<+>` | L1 (taxicab) | specialised cases |

Smaller distance means more similar. Always `ORDER BY` the **same** operator your index uses.

```postgres run title="Filter and rank in one query"
SELECT title, round((embedding <=> '[0.1,0.9,0,0.2]')::numeric, 3) AS distance
FROM documents
WHERE body ILIKE '%order%'                        -- ordinary SQL filter
ORDER BY embedding <=> '[0.1,0.9,0,0.2]'          -- "where is my parcel?"
LIMIT 2;
```

This is pgvector's superpower: metadata filters, joins, permissions and similarity in **one** SQL statement, inside one transaction.

## Vector indexes

Without an index, `ORDER BY embedding <=> $1` compares the query with every row (exact, but slow past ~100k rows). Approximate indexes trade a little recall for a lot of speed:

```sketch
title: HNSW — a layered graph you descend
caption: Search starts in the sparse top layer, hops greedily toward the query, then drops down a layer and repeats. It visits a tiny fraction of the vectors.
cellW: 160
cellH: 100
nodes:
  - id: t1
    shape: circle
    label: entry
    col: 0
    row: 0
    tone: gold
    w: 0.62
    h: 0.75
  - id: t2
    shape: circle
    label: " "
    col: 2.5
    row: 0
    w: 0.62
    h: 0.75
  - id: m1
    shape: circle
    label: " "
    col: 0.6
    row: 1.2
    w: 0.62
    h: 0.75
  - id: m2
    shape: circle
    label: " "
    col: 2.5
    row: 1.2
    w: 0.62
    h: 0.75
  - id: m3
    shape: circle
    label: " "
    col: 3.6
    row: 1.2
    w: 0.62
    h: 0.75
  - id: b1
    shape: circle
    label: " "
    col: 2
    row: 2.4
    w: 0.62
    h: 0.75
  - id: b2
    shape: circle
    label: nearest
    col: 3.2
    row: 2.4
    tone: teal
    w: 0.62
    h: 0.75
  - id: q
    label: query
    shape: pill
    tone: sky
    col: 4.6
    row: 2.4
edges:
  - from: t1
    to: t2
    label: layer 2
  - from: t2
    to: m2
    label: drop down
    dashed: true
  - from: m2
    to: m3
    label: layer 1
  - from: m3
    to: b2
    label: drop down
    dashed: true
  - from: b2
    to: q
    arrow: none
    dashed: true
  - from: m1
    to: m2
    arrow: none
  - from: b1
    to: b2
    arrow: none
```

```postgres run title="Create an HNSW index"
CREATE INDEX documents_embedding_hnsw
  ON documents USING hnsw (embedding vector_cosine_ops);

SET hnsw.ef_search = 40;   -- higher = better recall, slower

EXPLAIN SELECT title FROM documents
ORDER BY embedding <=> '[0.9,0.1,0,0.1]' LIMIT 3;
```

On eight rows the planner may still choose a scan; on a real table you will see the index used.

| | **HNSW** | **IVFFlat** |
|---|---|---|
| Build | slower, more memory | faster |
| Query speed / recall | best | good (tune `ivfflat.probes`) |
| Empty table OK? | yes | needs data first (it clusters) |
| Default choice | ✔ | for very large, rarely updated sets |

> **Production tips:** use the operator class that matches your distance (`vector_cosine_ops`, `vector_l2_ops`, `vector_ip_ops`); indexes support up to 2,000 dimensions for `vector` (4,000 with `halfvec`, which also halves storage); with selective `WHERE` filters, pgvector 0.8 can keep scanning the index until it finds enough matches (`SET hnsw.iterative_scan = relaxed_order`).

```exercise
prompt: Return the 3 articles closest by cosine distance to the query vector.
lang: postgres
code: |
  SELECT title FROM documents
  ORDER BY embedding ___ '[0,0,1,0]'
  ___ 3;
answers: ["<=>", LIMIT]
```

```quiz
- q: Which pgvector operator is cosine distance?
  options: ["<->", "<#>", "<=>", "@>"]
  answer: 2
- q: What do HNSW and IVFFlat trade away for speed?
  options: ["Nothing", "A little recall: results are approximate", "Durability", "The ability to filter"]
  answer: 1
- q: Why store embeddings in Postgres instead of a separate vector database?
  options: ["It is always faster", "Vectors live next to the data they describe, so filters, joins, permissions and transactions work in one query", "Vector databases can't do search", "Postgres has more dimensions"]
  answer: 1
- q: What is halfvec?
  options: ["A vector with half the dimensions", "A 16-bit float vector type that halves storage and allows indexing up to 4,000 dimensions", "A sparse vector", "An index type"]
  answer: 1
```

````challenge
id: pg-vector-delivery
title: Where is my parcel?
difficulty: medium
prompt: |
  A learner asks "Where is my parcel?", embedded as `'[0.1,0.9,0,0.2]'`. Return the `title` of the **2** most similar documents by **cosine distance**, nearest first.
starter: |
  SELECT title FROM documents
tests: |
  SELECT title FROM documents ORDER BY embedding <=> '[0.1,0.9,0,0.2]' LIMIT 2;
````

# Hybrid Search and RAG on Postgres {#hybrid-rag}

Vector search understands meaning but can miss exact terms like product codes and names. Keyword search nails exact terms but misses paraphrases. **Hybrid search** runs both and merges the rankings. The usual merge is **Reciprocal Rank Fusion (RRF)**: each result scores `1 / (k + rank)` in every list it appears in, with `k` usually 60.

```sketch
title: Hybrid retrieval for RAG, all in Postgres
caption: Two rankings from one table, merged with RRF, then the top chunks go to the model with their sources so it can cite them.
cellW: 162
cellH: 108
nodes:
  - id: q
    label: Question
    col: 0
    row: 1
    shape: pill
    tone: sky
  - id: emb
    label: Embed question
    col: 1.15
    row: 0.3
    shape: round
    tone: grape
  - id: vec
    label: Vector ranking
    sub: "ORDER BY <=>"
    col: 2.35
    row: 0.3
    shape: db
    tone: teal
  - id: kw
    label: Keyword ranking
    sub: "ts_rank · @@"
    col: 2.35
    row: 1.7
    shape: db
    tone: gold
  - id: rrf
    label: RRF merge
    sub: "Σ 1/(60 + rank)"
    col: 3.55
    row: 1
    shape: diamond
  - id: llm
    label: LLM answers
    sub: with citations
    col: 4.75
    row: 1
    shape: round
    tone: grape
edges:
  - from: q
    to: emb
  - from: emb
    to: vec
  - from: q
    to: kw
    label: words
  - from: vec
    to: rrf
  - from: kw
    to: rrf
  - from: rrf
    to: llm
    label: top k
```

```postgres run title="Hybrid search with Reciprocal Rank Fusion"
-- "card refund", embedded as roughly [0.85, 0.3, 0, 0.1]
WITH semantic AS (
  SELECT doc_id, row_number() OVER (ORDER BY embedding <=> '[0.85,0.3,0,0.1]') AS rank
  FROM documents
  ORDER BY embedding <=> '[0.85,0.3,0,0.1]'
  LIMIT 5
),
keyword AS (
  SELECT doc_id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', title || ' ' || body), q) DESC) AS rank
  FROM documents, websearch_to_tsquery('english', 'card or refund') AS q
  WHERE to_tsvector('english', title || ' ' || body) @@ q
  LIMIT 5
)
SELECT d.title,
       round(coalesce(1.0 / (60 + s.rank), 0) + coalesce(1.0 / (60 + k.rank), 0), 4) AS rrf_score,
       s.rank AS semantic_rank,
       k.rank AS keyword_rank
FROM semantic s
FULL OUTER JOIN keyword k USING (doc_id)
JOIN documents d USING (doc_id)
ORDER BY rrf_score DESC;
```

Documents found by **both** methods rise to the top. A full outer join keeps items that only one method found.

## A RAG schema that scales

In a real system you split long documents into **chunks** and embed each chunk, keeping a link back to the source for citations and permissions:

```postgres run title="Documents and chunks"
-- dataset: empty
CREATE TABLE sources (
  source_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      text NOT NULL,
  url        text,
  tenant_id  int  NOT NULL,          -- whose data is this? (filter on every query)
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chunks (
  chunk_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id  bigint NOT NULL REFERENCES sources ON DELETE CASCADE,
  position   int    NOT NULL,        -- order within the source
  content    text   NOT NULL,
  embedding  vector(4) NOT NULL,     -- vector(1536) for a real model
  search     tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks USING gin (search);

INSERT INTO sources (title, url, tenant_id) VALUES ('Fees policy', '/policies/fees', 1);
INSERT INTO chunks (source_id, position, content, embedding) VALUES
  (1, 1, 'Tuition is due in two instalments each term.', '[0.9,0.1,0,0]'),
  (1, 2, 'Late payment adds a 5% fee after 14 days.',    '[0.85,0.2,0,0.1]');

SELECT s.title, c.position, c.content
FROM chunks c JOIN sources s USING (source_id)
WHERE s.tenant_id = 1
ORDER BY c.embedding <=> '[0.88,0.15,0,0.05]'
LIMIT 2;
```

From application code it's one parameterised query. In Python with `psycopg` and the `pgvector` package:

```python
from pgvector.psycopg import register_vector
import psycopg

with psycopg.connect(DATABASE_URL) as conn:
    register_vector(conn)
    question_vec = embed("How much is the late fee?")      # your embedding model
    rows = conn.execute(
        """SELECT c.content, s.title, s.url
           FROM chunks c JOIN sources s USING (source_id)
           WHERE s.tenant_id = %s
           ORDER BY c.embedding <=> %s
           LIMIT 5""",
        (tenant_id, question_vec),
    ).fetchall()
```

Never build SQL by gluing strings together: always pass values as **parameters** (`%s`, `$1`), so a question like `'; DROP TABLE chunks; --` stays harmless text.

```quiz
- q: What problem does hybrid search solve?
  options: ["It makes indexes smaller", "Vector search misses exact terms and keyword search misses paraphrases; merging both catches more relevant results", "It removes the need for embeddings", "It encrypts queries"]
  answer: 1
- q: In RRF with k = 60, a document is rank 1 in both lists. What is its score?
  options: ["2", "1/61 + 1/61 ≈ 0.0328", "0.5", "60"]
  answer: 1
- q: Why keep tenant_id on sources and filter by it in every retrieval query?
  options: ["For speed only", "So one customer's documents can never be retrieved into another customer's answer", "Postgres requires it", "To sort results"]
  answer: 1
```

````challenge
id: pg-rag-tenant
title: Tenant-safe retrieval
difficulty: medium
prompt: |
  Using the sample `documents` table, return the `title` of the 3 documents nearest (cosine) to `'[0.2,0.1,0.9,0.1]'` **whose body mentions "sun"** (case-insensitive), nearest first.
starter: |
  SELECT title FROM documents
tests: |
  SELECT title FROM documents WHERE body ILIKE '%sun%' ORDER BY embedding <=> '[0.2,0.1,0.9,0.1]' LIMIT 3;
````

# PostgreSQL in Production {#production}

Running Postgres for real users adds a few responsibilities. This lesson is the checklist.

```sketch
title: A production Postgres setup
caption: Apps reach the primary through a pooler; replicas take read traffic; WAL streams to replicas and to backups for point-in-time recovery.
cellW: 185
cellH: 110
nodes:
  - id: apps
    label: App servers
    col: 0
    row: 1
    shape: round
    tone: sky
  - id: pool
    label: PgBouncer
    sub: pooled connections
    col: 1.2
    row: 1
    shape: pill
  - id: pri
    label: Primary
    sub: reads + writes
    col: 2.45
    row: 1
    shape: db
    tone: teal
  - id: rep
    label: Read replica
    col: 3.7
    row: 0.2
    shape: db
  - id: bak
    label: Backups + WAL archive
    sub: point-in-time recovery
    col: 3.7
    row: 1.8
    shape: db
    tone: gold
edges:
  - from: apps
    to: pool
  - from: pool
    to: pri
  - from: pri
    to: rep
    label: WAL stream
  - from: pri
    to: bak
    label: WAL archive
```

**Roles and least privilege.** Your app should not connect as a superuser. Give it only what it needs:

```postgres run title="A restricted application role with row-level security"
CREATE ROLE shop_app;
GRANT SELECT ON orders TO shop_app;

-- Each customer may only see their own orders.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_orders ON orders FOR SELECT TO shop_app
  USING (customer_id = current_setting('app.customer_id')::int);

SET app.customer_id = '1';   -- your app sets this per request
SET ROLE shop_app;
SELECT order_id, status FROM orders;   -- only customer 1's orders
```

**Row-level security** (RLS) puts the "whose data is this?" rule inside the database, so a missing `WHERE` in application code can't leak another customer's data. Supabase builds its whole security model on it.

The rest of the checklist:

- **Connection pooling.** Each Postgres connection is a process using memory. Put **PgBouncer** (or your platform's pooler) in front, and keep app pools small.
- **Migrations.** Change the schema with versioned migration files (Alembic, Prisma, Flyway, or plain SQL files) reviewed like code. Never edit production by hand.
- **Backups.** Nightly `pg_dump` for small databases; WAL archiving for **point-in-time recovery** on anything important. Test a restore at least once a quarter.
- **Monitoring.** `pg_stat_statements` shows your slowest and most frequent queries; watch connections, replication lag, disk and table bloat.
- **Maintenance.** Autovacuum cleans dead row versions (MVCC); leave it on and tune it for busy tables.
- **Managed options.** Supabase and Neon (generous free tiers, pgvector included), AWS RDS / Aurora, Google Cloud SQL / AlloyDB, Azure Database for PostgreSQL. All handle backups, failover and upgrades.

```quiz
- q: Why put PgBouncer in front of Postgres?
  options: ["To encrypt data", "Each connection is a process; pooling lets many app requests share a few connections", "It adds pgvector", "It replaces backups"]
  answer: 1
- q: What does row-level security protect against?
  options: ["Slow queries", "Application bugs that forget a WHERE clause and expose other users' rows", "Disk failure", "SQL syntax errors"]
  answer: 1
- q: What gives point-in-time recovery?
  options: ["pg_dump once a month", "Base backups plus an archive of the WAL", "A read replica alone", "VACUUM"]
  answer: 1
```

# Capstone: Search for the Help Centre {#capstone}

You are building the help-centre search for Zim Traders. Put the track together: JSONB, joins, windows, full-text and vector search.

```postgres run title="Explore before you build"
SELECT doc_id, title, embedding FROM documents ORDER BY doc_id;
```

````challenge
id: pg-capstone-best-sellers
title: Best seller in each category
difficulty: hard
prompt: |
  For **delivered** orders, find the product with the most **units sold** in each category. Return `category`, `product` and `units`, ordered by `category`. If two products tie, either may win.
starter: |
  WITH units AS (
    SELECT
  )
  SELECT
tests: |
  WITH units AS (
    SELECT c.name AS category, p.name AS product, sum(oi.quantity) AS units
    FROM orders o JOIN order_items oi USING (order_id) JOIN products p USING (product_id)
    JOIN categories c USING (category_id)
    WHERE o.status = 'delivered'
    GROUP BY c.name, p.name
  )
  SELECT DISTINCT ON (category) category, product, units
  FROM units ORDER BY category, units DESC;
````

````challenge
id: pg-capstone-hybrid
title: Hybrid help search
difficulty: hard
prompt: |
  The user types "late refund", embedded as `'[0.8,0.4,0,0.1]'`. Combine a **vector** ranking (cosine, top 4) and a **keyword** ranking (`websearch_to_tsquery('english', 'late or refund')` with `ts_rank`, top 4) using RRF with k = 60. Return `title` and `score` (rounded to 4 decimals), best first.
starter: |
  WITH semantic AS (
    SELECT doc_id, row_number() OVER (ORDER BY embedding <=> '[0.8,0.4,0,0.1]') AS rank
    FROM documents ORDER BY embedding <=> '[0.8,0.4,0,0.1]' LIMIT 4
  ),
  keyword AS (
    -- your keyword ranking here
  )
  SELECT
tests: |
  WITH semantic AS (
    SELECT doc_id, row_number() OVER (ORDER BY embedding <=> '[0.8,0.4,0,0.1]') AS rank
    FROM documents ORDER BY embedding <=> '[0.8,0.4,0,0.1]' LIMIT 4
  ),
  keyword AS (
    SELECT doc_id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', title || ' ' || body), q) DESC) AS rank
    FROM documents, websearch_to_tsquery('english', 'late or refund') q
    WHERE to_tsvector('english', title || ' ' || body) @@ q
    LIMIT 4
  )
  SELECT d.title, round(coalesce(1.0/(60+s.rank),0) + coalesce(1.0/(60+k.rank),0), 4) AS score
  FROM semantic s FULL OUTER JOIN keyword k USING (doc_id) JOIN documents d USING (doc_id)
  ORDER BY score DESC, d.title;
````

```exam
- q: Which type stores money exactly?
  options: ["double precision", "numeric", "real", "money as text"]
  answer: 1
- q: What does DISTINCT ON (a) … ORDER BY a, b DESC return?
  options: ["All rows", "The row with the largest b for each a", "The smallest b for each a", "Distinct values of b"]
  answer: 1
- q: Which clause names a sub-query so a long query can be read in stages?
  options: ["WINDOW", "WITH (a CTE)", "LATERAL", "USING"]
  answer: 1
- q: A window function differs from GROUP BY because it…
  options: ["only works with dates", "adds a computed column while keeping every row", "is always faster", "cannot use ORDER BY"]
  answer: 1
- q: Which operator returns a JSONB field as text?
  options: ["->", "->>", "@>", "?"]
  answer: 1
- q: Which index type suits JSONB containment and full-text search?
  options: ["B-tree", "GIN", "BRIN", "Hash"]
  answer: 1
- q: EXPLAIN shows "Seq Scan" on a 10-million-row table for a lookup by email. What is the likely fix?
  options: ["Add RAM", "Create an index on email", "Use LIMIT", "Run VACUUM FULL"]
  answer: 1
- q: What does MVCC let Postgres do?
  options: ["Store vectors", "Let readers and writers work concurrently without blocking each other, using row versions", "Compress tables", "Shard data"]
  answer: 1
- q: Which statement inserts or updates atomically?
  options: ["INSERT … ON CONFLICT … DO UPDATE", "UPSERT INTO", "MERGE ONLY", "REPLACE INTO"]
  answer: 0
- q: Which pgvector operator is cosine distance?
  options: ["<->", "<=>", "<#>", "<+>"]
  answer: 1
- q: What does an HNSW index trade for speed?
  options: ["Durability", "A little recall (approximate results)", "The ability to filter", "Nothing at all"]
  answer: 1
- q: In hybrid search, what does Reciprocal Rank Fusion combine?
  options: ["Two tables", "Rankings from different retrievers, scoring each item 1/(k + rank) per list", "Embeddings of two models", "Two indexes into one"]
  answer: 1
- q: Why use row-level security in a multi-tenant RAG app?
  options: ["It speeds up vectors", "The database itself stops one tenant's rows being read for another, even if app code forgets a filter", "It is required by pgvector", "It replaces authentication"]
  answer: 1
- q: Your app opens hundreds of connections and Postgres runs out of memory. What helps?
  options: ["More indexes", "A connection pooler such as PgBouncer", "A larger WAL", "Turning off autovacuum"]
  answer: 1
```
