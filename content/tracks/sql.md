---
id: sql
title: SQL
short: SQL
category: data
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
