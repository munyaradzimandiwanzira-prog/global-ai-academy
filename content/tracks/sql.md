---
id: sql
title: SQL
short: SQL
category: databases
level: beginner
language: sql
color: "#00758F"
icon: "🗄️"
order: 30
summary: SQL is how you ask questions of databases. Practise on a live sample database of Zimbabwean customers, products and orders — SELECT, WHERE, JOIN, GROUP BY and more.
tags: [sql, database, data, sqlite, postgresql]
---

# SQL Introduction {#intro}

**SQL** (Structured Query Language, said "S-Q-L" or "sequel") is the language for working with **relational databases** — data stored in **tables** of rows and columns, like spreadsheets that are linked together.

Almost every app you use stores its data in a database: bank balances, school results, mobile-money transactions, online orders.

## Our practice database

Every example runs on a live sample database for a made-up company, **Zim Traders**:

```sketch
title: "How the tables connect"
caption: "Each table stores one kind of thing. Matching ID columns link them: an order belongs to one customer and lists several products."
cellW: 215
cellH: 120
nodes:
  - id: cus
    label: "Customers"
    col: 0
    row: 0
    shape: db
    tone: sky
    sub: "CustomerID · Name · City"
  - id: ord
    label: "Orders"
    col: 2
    row: 0
    shape: db
    tone: gold
    sub: "OrderID · CustomerID"
  - id: oi
    label: "OrderItems"
    col: 2
    row: 1.5
    shape: db
    tone: teal
    sub: "OrderID · ProductID · Qty"
  - id: pro
    label: "Products"
    col: 0
    row: 1.5
    shape: db
    tone: grape
    sub: "ProductID · Price"
edges:
  - from: cus
    to: ord
    label: "places many"
  - from: ord
    to: oi
    label: "contains"
  - from: pro
    to: oi
    label: "appears in"
```


| Table | Holds |
|---|---|
| `Customers` | shops and companies around Zimbabwe |
| `Products` | items for sale, with prices |
| `Categories` | product categories |
| `Orders` | orders placed by customers |
| `OrderDetails` | which products (and how many) are in each order |
| `Employees` | staff, their roles and salaries |

Each run starts from a fresh copy, so experiment freely — you can't break anything.

```sql run title="Look at a whole table"
SELECT * FROM Customers;
```

## Popular database systems

**PostgreSQL**, **MySQL**, **SQLite**, **SQL Server** and **Oracle** all use SQL. The basics you learn here work in all of them. Our editor uses **SQLite**.

```quiz
- q: What does SQL stand for?
  options: ["Strong Question Language", "Structured Query Language", "Simple Query Logic", "Server Query List"]
  answer: 1
```

# SELECT {#select}

`SELECT` reads data. List the columns you want, or `*` for all of them.

```sketch
title: "The order SQL actually runs a query"
caption: "You write SELECT first, but the database starts with FROM, filters rows, groups them, and only then picks columns, sorts and limits."
cellW: 190
nodes:
  - id: f
    label: "FROM / JOIN"
    col: 0
    row: 0
    shape: round
    tone: sky
    sub: "which tables"
  - id: w
    label: "WHERE"
    col: 1
    row: 0
    shape: round
    tone: sky
    sub: "filter rows"
  - id: gb
    label: "GROUP BY"
    col: 2
    row: 0
    shape: round
    tone: gold
    sub: "make groups"
  - id: h
    label: "HAVING"
    col: 3
    row: 0
    shape: round
    tone: gold
    sub: "filter groups"
  - id: s
    label: "SELECT"
    col: 3
    row: 1.3
    shape: round
    tone: teal
    sub: "pick columns"
  - id: o
    label: "ORDER BY"
    col: 2
    row: 1.3
    shape: round
    tone: grape
    sub: "sort"
  - id: l
    label: "LIMIT"
    col: 1
    row: 1.3
    shape: pill
    tone: grape
    sub: "first n rows"
edges:
  - from: f
    to: w
  - from: w
    to: gb
  - from: gb
    to: h
  - from: h
    to: s
  - from: s
    to: o
  - from: o
    to: l
```


```sql run
SELECT CustomerName, City FROM Customers;
```

## DISTINCT

Remove duplicate values:

```sql run
SELECT DISTINCT Province FROM Customers;
```

## Aliases

Rename columns in the result with `AS`:

```sql run
SELECT ProductName AS Item, Price AS "Price (USD)" FROM Products;
```

```exercise
prompt: Select every column from the Products table.
lang: sql
code: |
  SELECT ___ FROM Products;
answers: ["*"]
```

# WHERE {#where}

`WHERE` filters rows.

```sql run
SELECT CustomerName, City FROM Customers WHERE Province = 'Harare';
```

## Operators

| Operator | Meaning |
|---|---|
| `=`, `<>` | equal, not equal |
| `>`, `<`, `>=`, `<=` | comparisons |
| `BETWEEN a AND b` | in a range |
| `IN (...)` | matches any value in a list |
| `LIKE 'B%'` | text pattern (`%` = any characters, `_` = one character) |
| `IS NULL` | has no value |

```sql run
SELECT ProductName, Price FROM Products WHERE Price BETWEEN 5 AND 20;
```

```sql run
SELECT CustomerName FROM Customers WHERE City IN ('Bulawayo', 'Mutare', 'Gweru');
```

```sql run
SELECT CustomerName FROM Customers WHERE CustomerName LIKE '%Tech%';
```

## AND, OR, NOT

```sql run
SELECT ProductName, Price, CategoryID FROM Products
WHERE CategoryID = 2 AND Price < 200;
```

````challenge
id: sql-where-harare-orders
title: Pending orders
difficulty: easy
prompt: |
  Select **all columns** from `Orders` where the `Status` is `'Pending'`.
starter: |
  SELECT
tests: |
  SELECT * FROM Orders WHERE Status = 'Pending';
````

# ORDER BY and LIMIT {#order-by}

```sql run
SELECT ProductName, Price FROM Products ORDER BY Price DESC;
```

- `ASC` sorts ascending (default), `DESC` descending.
- Sort by several columns: `ORDER BY Province, CustomerName`.
- `LIMIT` returns only the first rows:

```sql run title="Three most expensive products"
SELECT ProductName, Price FROM Products ORDER BY Price DESC LIMIT 3;
```

```exercise
prompt: Sort from the highest salary to the lowest.
lang: sql
code: |
  SELECT FirstName, Salary FROM Employees ORDER BY Salary ___;
answers: [DESC]
```

# Aggregate Functions {#aggregates}

Aggregates calculate one value from many rows.

```sql run
SELECT COUNT(*) AS products, MIN(Price) AS cheapest, MAX(Price) AS dearest,
       ROUND(AVG(Price), 2) AS average, SUM(Price) AS total
FROM Products;
```

| Function | Returns |
|---|---|
| `COUNT()` | number of rows |
| `SUM()` | total |
| `AVG()` | average |
| `MIN()` / `MAX()` | smallest / largest |

# GROUP BY and HAVING {#group-by}

`GROUP BY` groups rows that share a value, so aggregates are calculated **per group**.

```sketch
title: "Many rows in, one row per group out"
caption: "GROUP BY puts rows with the same value together; an aggregate such as SUM or COUNT squeezes each group into a single row."
cellW: 200
cellH: 95
nodes:
  - id: r1
    label: "Harare · 8.50"
    col: 0
    row: 0
    shape: box
    tone: sky
  - id: r2
    label: "Bulawayo · 4.20"
    col: 0
    row: 1
    shape: box
    tone: teal
  - id: r3
    label: "Harare · 11.00"
    col: 0
    row: 2
    shape: box
    tone: sky
  - id: h
    label: "Harare"
    col: 1.6
    row: 0.5
    shape: round
    tone: sky
    sub: "2 rows"
  - id: b
    label: "Bulawayo"
    col: 1.6
    row: 1.8
    shape: round
    tone: teal
    sub: "1 row"
  - id: out
    label: "Result"
    col: 3.1
    row: 1.15
    shape: db
    tone: gold
    sub: "Harare 19.50 · Bulawayo 4.20"
edges:
  - from: r1
    to: h
  - from: r3
    to: h
  - from: r2
    to: b
  - from: h
    to: out
    label: "SUM"
  - from: b
    to: out
```


```sql run title="Customers per province"
SELECT Province, COUNT(*) AS Customers
FROM Customers
GROUP BY Province
ORDER BY Customers DESC;
```

`HAVING` filters **groups** (where `WHERE` filters rows):

```sql run
SELECT CategoryID, COUNT(*) AS Items, ROUND(AVG(Price), 2) AS AvgPrice
FROM Products
GROUP BY CategoryID
HAVING AVG(Price) > 10;
```

````challenge
id: sql-groupby-roles
title: Payroll by role
difficulty: medium
prompt: |
  For each `Role` in `Employees`, show the role and the **total salary** as a column called `Total`. Order by `Total` from highest to lowest.
starter: |
  SELECT Role,
tests: |
  SELECT Role, SUM(Salary) AS Total FROM Employees GROUP BY Role ORDER BY Total DESC;
````

# JOIN {#joins}

Data is split across tables to avoid repeating it. **JOIN** combines tables using matching columns (keys).

`Orders` stores a `CustomerID`, not the customer's name. Join to get both:

```sql run
SELECT Orders.OrderID, Customers.CustomerName, Orders.OrderDate, Orders.Status
FROM Orders
INNER JOIN Customers ON Orders.CustomerID = Customers.CustomerID;
```

## Table aliases

Short aliases make joins easier to read:

```sql run title="What was in each order?"
SELECT o.OrderID, c.CustomerName, p.ProductName, d.Quantity,
       ROUND(d.Quantity * p.Price, 2) AS LineTotal
FROM OrderDetails d
JOIN Orders o    ON o.OrderID = d.OrderID
JOIN Customers c ON c.CustomerID = o.CustomerID
JOIN Products p  ON p.ProductID = d.ProductID
ORDER BY o.OrderID;
```

## Types of join


```sketch
title: "INNER JOIN vs LEFT JOIN"
caption: "INNER JOIN keeps only customers that have orders. LEFT JOIN keeps every customer and fills the order columns with NULL when there is no match."
cellW: 190
cellH: 105
nodes:
  - id: c
    label: "Customers"
    col: 0
    row: 1
    shape: db
    tone: sky
  - id: o
    label: "Orders"
    col: 0
    row: 2.3
    shape: db
    tone: gold
    sub: "10 rows"
  - id: inner
    label: "INNER JOIN"
    col: 2
    row: 0.5
    shape: round
    tone: teal
    sub: "matches only"
  - id: left
    label: "LEFT JOIN"
    col: 2
    row: 2.0
    shape: round
    tone: grape
    sub: "all customers + NULLs"
  - id: ri
    label: "Only customers with orders"
    col: 3.6
    row: 0.5
    shape: note
    tone: teal
  - id: rl
    label: "Every customer, NULL if none"
    col: 3.6
    row: 2.0
    shape: note
    tone: grape
edges:
  - from: c
    to: inner
  - from: o
    to: inner
  - from: c
    to: left
  - from: o
    to: left
  - from: inner
    to: ri
  - from: left
    to: rl
```

| Join | Returns |
|---|---|
| `INNER JOIN` | only rows with a match in both tables |
| `LEFT JOIN` | all rows from the left table, plus matches (or NULL) |
| `RIGHT JOIN` | all rows from the right table, plus matches |
| `FULL JOIN` | all rows from both |

```sql run title="Customers who have never ordered"
SELECT c.CustomerName
FROM Customers c
LEFT JOIN Orders o ON o.CustomerID = c.CustomerID
WHERE o.OrderID IS NULL;
```

````challenge
id: sql-join-revenue
title: Revenue per customer
difficulty: hard
prompt: |
  Show each customer's name (`CustomerName`) and their total spending as `Revenue` = sum of `Quantity * Price` across all their **Delivered** orders. Round to 2 decimals and sort by `Revenue` descending.

  You'll need `Customers`, `Orders`, `OrderDetails` and `Products`.
starter: |
  SELECT c.CustomerName,
tests: |
  SELECT c.CustomerName, ROUND(SUM(d.Quantity * p.Price), 2) AS Revenue
  FROM Customers c JOIN Orders o ON o.CustomerID = c.CustomerID
  JOIN OrderDetails d ON d.OrderID = o.OrderID
  JOIN Products p ON p.ProductID = d.ProductID
  WHERE o.Status = 'Delivered'
  GROUP BY c.CustomerID ORDER BY Revenue DESC;
````

# INSERT, UPDATE and DELETE {#modify}

## INSERT

```sql run
INSERT INTO Customers (CustomerName, ContactName, City, Province, Phone)
VALUES ('Nyanga Honey', 'Ruvimbo Sithole', 'Nyanga', 'Manicaland', '0779 111 222');

SELECT * FROM Customers WHERE City = 'Nyanga';
```

## UPDATE

```sql run
UPDATE Products SET Price = Price * 1.10 WHERE CategoryID = 3;
SELECT ProductName, Price FROM Products WHERE CategoryID = 3;
```

## DELETE

```sql run
DELETE FROM Orders WHERE Status = 'Cancelled';
SELECT * FROM Orders;
```

> ⚠️ An `UPDATE` or `DELETE` **without** a `WHERE` changes **every row**. Always write the `WHERE` first, and test it with a `SELECT`.

```quiz
- q: What happens if you run `DELETE FROM Orders;` with no WHERE?
  options: ["Nothing", "Only the first row is deleted", "Every row is deleted", "An error always occurs"]
  answer: 2
```

# Creating Tables {#create-table}

```sql run
CREATE TABLE Learners (
  LearnerID INTEGER PRIMARY KEY,
  FullName  TEXT NOT NULL,
  Email     TEXT UNIQUE,
  Province  TEXT DEFAULT 'Harare',
  XP        INTEGER CHECK (XP >= 0) DEFAULT 0,
  JoinedAt  TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Learners (FullName, Email) VALUES ('Tariro Moyo', 'tariro@example.com');
INSERT INTO Learners (FullName, Email, Province, XP) VALUES ('Sipho Ndlovu', 'sipho@example.com', 'Bulawayo', 120);
SELECT * FROM Learners;
```

## Constraints

| Constraint | Rule |
|---|---|
| `PRIMARY KEY` | uniquely identifies each row |
| `FOREIGN KEY` | must match a key in another table |
| `NOT NULL` | value required |
| `UNIQUE` | no duplicates |
| `CHECK` | value must pass a condition |
| `DEFAULT` | value used if none given |

# Subqueries and Views {#subqueries}

A **subquery** is a query inside another query.

```sql run title="Products dearer than the average"
SELECT ProductName, Price
FROM Products
WHERE Price > (SELECT AVG(Price) FROM Products)
ORDER BY Price DESC;
```

## Common table expressions (WITH)

`WITH` names a subquery so complex queries read step by step:

```sql run
WITH order_totals AS (
  SELECT d.OrderID, SUM(d.Quantity * p.Price) AS Total
  FROM OrderDetails d JOIN Products p ON p.ProductID = d.ProductID
  GROUP BY d.OrderID
)
SELECT OrderID, ROUND(Total, 2) AS Total FROM order_totals WHERE Total > 100 ORDER BY Total DESC;
```

## CASE

```sql run
SELECT ProductName, Price,
  CASE WHEN Price < 5 THEN 'Budget'
       WHEN Price < 50 THEN 'Standard'
       ELSE 'Premium' END AS Band
FROM Products;
```

# Indexes and Good Design {#design}

## Indexes

An **index** makes searches on a column fast — like the index at the back of a textbook.

```sql
CREATE INDEX idx_customers_city ON Customers(City);
```

Index columns you often search, join or sort on. Don't index everything: indexes slow down inserts and use space.

## Normalisation

Store each fact **once**. Instead of writing the customer's name and phone in every order, store a `CustomerID` and keep the details in `Customers`. If the phone number changes, you update one row.

## SQL injection

Never build SQL by gluing user input into a string:

```sketch
title: "Gluing input into SQL vs using parameters"
caption: "If you paste user input into the SQL text, the input can become SQL. With a parameter, the database treats it only as a value."
cellW: 200
cellH: 110
nodes:
  - id: in
    label: "'; DROP TABLE…"
    col: 0
    row: 0.7
    shape: note
    tone: rose
    sub: "typed by a user"
  - id: cat
    label: "f\"…WHERE name = '{x}'\""
    col: 1.7
    row: 0
    shape: round
    tone: rose
    sub: "string building"
  - id: par
    label: "\"…WHERE name = ?\", (x,)"
    col: 1.7
    row: 1.4
    shape: round
    tone: teal
    sub: "parameter"
  - id: bad
    label: "Runs their SQL"
    col: 3.4
    row: 0
    shape: pill
    tone: rose
  - id: ok
    label: "Just a strange name"
    col: 3.4
    row: 1.4
    shape: pill
    tone: teal
edges:
  - from: in
    to: cat
  - from: in
    to: par
  - from: cat
    to: bad
  - from: par
    to: ok
```


```python
# DANGEROUS — a user could type:  '; DROP TABLE Customers; --
query = "SELECT * FROM Customers WHERE City = '" + city + "'"

# SAFE — use parameters
cursor.execute("SELECT * FROM Customers WHERE City = ?", (city,))
```

```quiz
- q: How do you prevent SQL injection?
  options: ["Use uppercase SQL", "Use parameterised queries", "Use shorter table names", "Avoid WHERE clauses"]
  answer: 1
- q: Which clause filters groups after GROUP BY?
  options: ["WHERE", "HAVING", "ORDER BY", "LIMIT"]
  answer: 1
- q: Which join keeps all rows from the left table even without a match?
  options: ["INNER JOIN", "LEFT JOIN", "CROSS JOIN", "SELF JOIN"]
  answer: 1
```

> **Next: PostgreSQL.** Everything here works in Postgres, the database most products (and most AI apps) run on. **[PostgreSQL & pgvector](/learn/postgresql)** adds JSONB, window functions, indexes and transactions, then vector search for RAG, all running for real in your browser.

> **Next: graphs.** When your queries become chains of JOINs (friends of friends, supply chains, fraud rings, prerequisites), a graph database is often the better tool. Try **[Neo4j & Graph Databases](/learn/neo4j)** and the **[Graph Lab](/lab)** work placements.

```exam
- q: "Which keyword removes duplicate values from results?"
  options: ["UNIQUE", "DISTINCT", "DIFFERENT", "ONLY"]
  answer: 1
- q: "Which pattern matches names starting with B?"
  options: ["LIKE 'B%'", "LIKE '%B'", "= 'B*'", "IN ('B')"]
  answer: 0
- q: "Which function counts rows?"
  options: ["SUM()", "COUNT()", "TOTAL()", "NUM()"]
  answer: 1
- q: "Which constraint uniquely identifies each row?"
  options: ["FOREIGN KEY", "PRIMARY KEY", "CHECK", "DEFAULT"]
  answer: 1
- q: "What does `WITH ... AS (...)` define?"
  options: ["A view stored forever", "A common table expression (named subquery)", "A trigger", "An index"]
  answer: 1
```
