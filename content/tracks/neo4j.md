---
id: neo4j
title: Neo4j & Graph Databases
short: NEO4J
category: data
level: intermediate
language: cypher
color: "#0B6E99"
icon: "🕸️"
order: 33
premium: true
preview: 3
summary: Think in connections. Model data as a graph, query it with Cypher, find paths, communities and fraud rings, and use Neo4j as the knowledge layer for GraphRAG and agent memory. Every query runs on a live practice graph in your browser.
tags: [neo4j, graph database, cypher, knowledge graph, graphrag, graph data science, nosql]
---

# Why Graph Databases? {#intro}

Most data is about **things** and the **connections** between them: students and the courses they take, accounts and the money they send, roads between towns, ideas that mention each other. A relational database stores things in tables and rebuilds the connections at query time with **JOINs**. A **graph database** stores the connections themselves, so following them is cheap.

Ask "which friends of my friends took a course I haven't?" in SQL and you write three or four JOINs that get slower as tables grow. In a graph you **walk** from one node to its neighbours: the cost depends on how much of the graph you touch, not on how big the whole database is. This property is called **index-free adjacency**.

```sketch
title: Tables vs a graph
caption: The same three facts. In tables the links are foreign keys you JOIN at query time; in a graph the links are stored relationships you walk.
cellW: 190
cellH: 120
nodes:
  - id: students
    label: Students
    sub: id, name
    col: 0
    row: 0
    shape: db
  - id: enrol
    label: Enrolments
    sub: student_id, course_id
    col: 0
    row: 1
    shape: db
  - id: courses
    label: Courses
    sub: id, title
    col: 0
    row: 2
    shape: db
  - id: tendai
    label: Tendai
    sub: ":Student"
    col: 2.2
    row: 0.4
    shape: circle
    tone: teal
  - id: py
    label: Python
    sub: ":Course"
    col: 3.6
    row: 1.2
    shape: circle
    tone: gold
  - id: farai
    label: Farai
    sub: ":Student"
    col: 2.2
    row: 2
    shape: circle
    tone: teal
edges:
  - from: students
    to: enrol
    label: JOIN
    dashed: true
  - from: enrol
    to: courses
    label: JOIN
    dashed: true
  - from: tendai
    to: py
    label: ENROLLED_IN
  - from: farai
    to: py
    label: ENROLLED_IN
  - from: tendai
    to: farai
    label: FRIENDS_WITH
groups:
  - label: Relational
    nodes: [students, enrol, courses]
  - label: Graph
    nodes: [tendai, py, farai]
    tone: teal
```

## When a graph is the right tool

| Use a graph when… | Typical examples |
|---|---|
| Questions follow **chains** of relationships of unknown length | Prerequisites, supply chains, org charts, "how are these two connected?" |
| The **shape** of connections matters | Fraud rings, communities, influencers, bottlenecks |
| Data is **highly connected** and the schema keeps changing | Knowledge graphs, master data, IT networks |
| You want AI to **reason over facts** | GraphRAG, agent memory, recommendation |

Graphs are **not** a replacement for every database. Bulk aggregates over one big table (total sales per month) are what relational and analytical databases do best. Many real systems use both: Postgres for transactions, Neo4j for connected questions.

## Neo4j in one paragraph

**Neo4j** is the most widely used graph database. It stores a **property graph**, is queried with **Cypher** (the language this track teaches), runs on your laptop, in Docker, or fully managed in the cloud as **Neo4j AuraDB** (with a free tier), and has a **Graph Data Science** library for algorithms such as PageRank and community detection. Cypher's core ideas are now also standardised as **GQL** (ISO/IEC 39075), so the skills transfer.

> **How you'll practise.** Every query block on this track runs on a small **in-browser practice graph** that behaves like Neo4j for the Cypher you learn here. Each run starts from fresh data, so experiment freely. When you're ready, the **Graph Lab** puts you in a simulated job with real tickets to solve.

```cypher run title="Your first graph query"
// dataset: skuru
// Return every student and the courses they are enrolled in.
MATCH (s:Student)-[e:ENROLLED_IN]->(c:Course)
RETURN s, e, c
```

Click the nodes in the result to see their properties.

```quiz
- q: Why are multi-hop questions fast in a graph database?
  options: ["Graphs compress data better", "Relationships are stored directly, so the database walks from node to neighbour instead of joining whole tables", "Graphs keep everything in RAM", "Cypher is compiled to C"]
  answer: 1
  explain: This is index-free adjacency. The cost depends on the part of the graph you touch, not on total table sizes.
- q: Which job is usually better suited to a relational or analytical database than a graph?
  options: ["Finding fraud rings", "Shortest route between two stops", "Total sales per month across one large table", "Course prerequisite chains"]
  answer: 2
- q: What is GQL?
  options: ["Google's query language", "An ISO standard graph query language that shares Cypher's core ideas", "A GraphQL extension", "Neo4j's admin console"]
  answer: 1
```

# The Property Graph Model {#model}

A **property graph** has four building blocks:

| Building block | What it is | Example |
|---|---|---|
| **Node** | A thing (an entity) | Tendai, Python Basics, Harare |
| **Label** | The node's type; a node can have several | `:Student`, `:Course`, `:Person:Customer` |
| **Relationship** | A directed, **typed** connection between two nodes | `(:Student)-[:ENROLLED_IN]->(:Course)` |
| **Property** | A key–value pair on a node **or** a relationship | `name: 'Tendai'`, `progress: 100` |

Relationships always have **exactly one type** and **one direction**, but you can query them in either direction. They can carry properties, which is how you store facts *about the connection*, such as when someone enrolled or how much money was sent.

```sketch
title: Anatomy of a property graph
caption: Labels say what a node is, properties describe it, and the relationship has its own type, direction and properties.
cellW: 235
nodes:
  - id: s
    label: Tendai
    sub: "name, city, year"
    col: 0
    row: 0
    shape: circle
    tone: teal
    w: 0.75
    h: 1.05
  - id: mid
    shape: dot
    col: 1
    row: 0
  - id: c
    label: Python Basics
    sub: "code, hours, level"
    col: 2
    row: 0
    shape: circle
    tone: gold
    w: 0.85
    h: 1.05
  - id: lab
    label: "label :Student"
    col: 0
    row: 1.3
    shape: note
  - id: rel
    label: "type ENROLLED_IN"
    sub: "{progress: 100}"
    col: 1
    row: 1.3
    shape: note
  - id: lab2
    label: "label :Course"
    col: 2
    row: 1.3
    shape: note
edges:
  - from: s
    to: mid
    arrow: none
  - from: mid
    to: c
    label: ENROLLED_IN
  - from: lab
    to: s
    dashed: true
    arrow: none
  - from: rel
    to: mid
    dashed: true
    arrow: none
  - from: lab2
    to: c
    dashed: true
    arrow: none
```

## Cypher is ASCII art

Cypher describes patterns the way you would draw them on paper:

```text
(n)                         a node, bound to the variable n
(s:Student)                 a node with the label Student
(c:Course {code: 'PY101'})  a node with a property filter
-[:ENROLLED_IN]->           a relationship of type ENROLLED_IN pointing right
<-[:TEACHES]-               a relationship pointing left
-[:FRIENDS_WITH]-           either direction
-[e:ENROLLED_IN]->          the relationship bound to the variable e
```

Put them together and you have a **pattern**: `(s:Student)-[:ENROLLED_IN]->(c:Course {level: 'advanced'})` reads "a student enrolled in an advanced course".

```cypher run title="Explore the whole practice graph"
// dataset: skuru
MATCH (n)
RETURN n
LIMIT 60
```

```cypher run title="What labels and relationship types exist?"
// dataset: skuru
MATCH (n)
RETURN labels(n) AS label, count(*) AS nodes
ORDER BY nodes DESC
```

## Naming conventions

| Element | Convention | Example |
|---|---|---|
| Labels | PascalCase, singular noun | `:Student`, `:BankAccount` |
| Relationship types | UPPER_SNAKE_CASE, a verb | `:ENROLLED_IN`, `:SENT_MONEY_TO` |
| Properties | camelCase | `firstName`, `createdAt` |

```exercise
prompt: Complete the pattern "a Teacher who TEACHES a Course".
lang: cypher
code: |
  MATCH (t:___)-[:___]->(c:Course)
  RETURN t.name, c.title
answers: [Teacher, TEACHES]
hint: Labels are PascalCase nouns; relationship types are UPPER_SNAKE_CASE verbs.
```

```quiz
- q: Where can properties be stored in a property graph?
  options: ["Only on nodes", "Only on relationships", "On both nodes and relationships", "Only in a separate table"]
  answer: 2
- q: How many types does a relationship have?
  options: ["Zero or more", "Exactly one", "One per direction", "As many as you like"]
  answer: 1
- q: What does -[:FRIENDS_WITH]- (no arrow) match?
  options: ["Nothing; arrows are required", "Relationships in either direction", "Only outgoing relationships", "Only relationships with no properties"]
  answer: 1
```

# Reading Data with MATCH {#match}

Almost every read query has this shape:

```text
MATCH   <pattern>          find matching parts of the graph
WHERE   <conditions>       keep only some of them (optional)
RETURN  <what to show>     choose columns
ORDER BY … SKIP … LIMIT …  sort and page (optional)
```

## Step by step

**1. Match a label and return properties**

```cypher run title="All students"
// dataset: skuru
MATCH (s:Student)
RETURN s.name, s.city, s.year
ORDER BY s.name
```

**2. Filter.** Inline `{key: value}` handles equality; `WHERE` handles everything else: `<`, `>=`, `<>`, `IN [...]`, `STARTS WITH`, `CONTAINS`, `ENDS WITH`, `IS NULL`, `AND`, `OR`, `NOT`.

```cypher run title="Filtering with WHERE"
// dataset: skuru
MATCH (s:Student)
WHERE s.city IN ['Harare', 'Bulawayo'] AND s.year >= 2
RETURN s.name, s.city, s.year
ORDER BY s.year DESC, s.name
```

**3. Follow a relationship.** Put the relationship in the pattern. Name it (`e`) when you need its properties.

```cypher run title="Who has finished which course?"
// dataset: skuru
MATCH (s:Student)-[e:ENROLLED_IN]->(c:Course)
WHERE e.progress = 100
RETURN s.name AS student, c.title AS course
ORDER BY student
```

**4. Chain hops.** Patterns can be as long as the question.

```cypher run title="Which teachers teach Rudo?"
// dataset: skuru
MATCH (:Student {name: 'Rudo'})-[:ENROLLED_IN]->(c:Course)<-[:TEACHES]-(t:Teacher)
RETURN DISTINCT t.name, collect(c.title) AS courses
```

**5. Check that something does *not* exist** with a pattern predicate in `WHERE`.

```cypher run title="Courses with no prerequisites"
// dataset: skuru
MATCH (c:Course)
WHERE NOT (c)-[:REQUIRES]->()
RETURN c.code, c.title
ORDER BY c.code
```

## Common mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Two unconnected patterns `MATCH (a:Student), (c:Course)` | Every student × every course (a **cartesian product**) | Connect them: `(a)-[:ENROLLED_IN]->(c)` |
| Forgetting `DISTINCT` | Duplicate rows when several paths lead to the same node | `RETURN DISTINCT …` |
| Comparing a missing property | `null` is never equal to anything, so the row is dropped | Use `IS NULL` / `coalesce()` |
| Wrong direction arrow | No results | Drop the arrow `-[:T]-` to test, then fix it |

```exercise
prompt: Return course titles longer than 20 hours, longest first.
lang: cypher
code: |
  MATCH (c:Course)
  ___ c.hours > 20
  RETURN c.title, c.hours
  ORDER BY c.hours ___
answers: [WHERE, DESC]
```

```exercise
prompt: Find students who are friends with Tendai in either direction.
lang: cypher
code: |
  MATCH (:Student {name: 'Tendai'})-[:FRIENDS_WITH]___(f:Student)
  RETURN f.name
answers: ["-"]
hint: Leave the arrow off so both directions match.
```

````challenge
id: neo4j-match-harare
title: Harare learners and their courses
difficulty: easy
lang: cypher
prompt: |
  Return each student from **Harare** and the **title** of every course they are enrolled in, one row per enrolment, sorted by student name and then course title.

  Your output must be two columns, e.g. `Farai | HTML & CSS`.
starter: |
  // dataset: skuru
  MATCH (s:Student)
  RETURN s.name
expectedOutput: |
  Farai | HTML & CSS
  Farai | Python Basics
  Tatenda | Machine Learning
  Tatenda | Python Basics
  Tatenda | RAG Systems
  Tendai | Machine Learning
  Tendai | Python Basics
  Tendai | SQL for Data
````

```quiz
- q: What does MATCH (a:Student), (c:Course) RETURN a, c produce?
  options: ["Students and the courses they take", "Every student paired with every course", "An error", "Only students with courses"]
  answer: 1
  explain: Two unconnected patterns create a cartesian product. Connect them with a relationship.
- q: Which clause removes duplicate rows?
  options: ["UNIQUE", "DISTINCT", "GROUP BY", "FILTER"]
  answer: 1
- q: How do you keep courses that have no outgoing REQUIRES relationship?
  options: ["WHERE c.REQUIRES IS NULL", "WHERE NOT (c)-[:REQUIRES]->()", "MATCH (c) WITHOUT REQUIRES", "OPTIONAL MATCH only"]
  answer: 1
```

# Aggregation and WITH {#aggregation}

Cypher has no `GROUP BY`. When `RETURN` mixes **aggregates** (`count`, `sum`, `avg`, `min`, `max`, `collect`) with plain values, the plain values become the **grouping keys** automatically.

```cypher run title="Learners per course"
// dataset: skuru
MATCH (s:Student)-[:ENROLLED_IN]->(c:Course)
RETURN c.title AS course, count(s) AS learners, round(avg(s.year), 1) AS avgYear
ORDER BY learners DESC, course
```

`collect()` turns many rows into one list per group, which is handy for building JSON for an API or context for an LLM:

```cypher run title="Each teacher's courses as a list"
// dataset: skuru
MATCH (t:Teacher)-[:TEACHES]->(c:Course)
RETURN t.name, collect(c.code) AS courses, size(collect(c.code)) AS n
ORDER BY n DESC
```

## WITH: pipelines inside one query

`WITH` ends one stage and starts the next, exactly like a `RETURN` that the query keeps using. You use it to **filter on aggregates** (like SQL's `HAVING`), to **limit before expanding**, and to keep a query readable.

```sketch
title: A WITH pipeline
caption: Each stage passes only the columns named in WITH to the next stage.
cellW: 210
nodes:
  - id: m
    label: MATCH
    sub: student → course rows
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: w
    label: WITH s, count(c) AS n
    sub: one row per student
    col: 1
    row: 0
    shape: round
    tone: gold
  - id: f
    label: WHERE n >= 3
    sub: keep busy students
    col: 2
    row: 0
    shape: round
    tone: rose
  - id: r
    label: RETURN
    sub: name, n
    col: 3
    row: 0
    shape: round
    tone: teal
edges:
  - from: m
    to: w
  - from: w
    to: f
  - from: f
    to: r
```

```cypher run title="Students taking three or more courses"
// dataset: skuru
MATCH (s:Student)-[:ENROLLED_IN]->(c:Course)
WITH s, count(c) AS n
WHERE n >= 3
RETURN s.name, n
ORDER BY s.name
```

```cypher run title="Top 2 courses first, then expand to their skills"
// dataset: skuru
MATCH (s:Student)-[:ENROLLED_IN]->(c:Course)
WITH c, count(s) AS learners
ORDER BY learners DESC
LIMIT 2
MATCH (c)-[:TEACHES_SKILL]->(k:Skill)
RETURN c.title, learners, collect(k.name) AS skills
```

## UNWIND: from a list back to rows

```cypher run title="UNWIND a list"
// dataset: skuru
UNWIND ['PY101', 'SQL101', 'ZZZ999'] AS code
OPTIONAL MATCH (c:Course {code: code})
RETURN code, c.title AS title
```

`OPTIONAL MATCH` is Cypher's **outer join**: when nothing matches, the variables are `null` instead of the row disappearing.

```exercise
prompt: Count enrolments per city and keep cities with more than 3.
lang: cypher
code: |
  MATCH (s:Student)-[:ENROLLED_IN]->(:Course)
  ___ s.city AS city, count(*) AS n
  WHERE n > 3
  RETURN city, n
answers: [WITH]
```

````challenge
id: neo4j-skill-demand
title: Skill demand report
difficulty: medium
lang: cypher
prompt: |
  The school wants to know which **skills** are most in demand. For each `Skill`, count the **distinct students** enrolled in any course that teaches it. Return the skill name and the count, highest first, ties broken by skill name. Only include skills with at least 2 students.
starter: |
  // dataset: skuru
  MATCH (k:Skill)
  RETURN k.name
expectedOutput: |
  Python | 4
  Embeddings | 3
  Prompting | 3
  Statistics | 3
  Cypher | 2
  HTML | 2
  SQL | 2
  Tool calling | 2
````

```quiz
- q: In RETURN c.title, count(s), what is c.title?
  options: ["A sort key", "The grouping key", "Ignored", "An error without GROUP BY"]
  answer: 1
- q: Which is Cypher's equivalent of SQL's HAVING?
  options: ["FILTER", "WITH … WHERE", "RETURN … WHERE", "HAVING"]
  answer: 1
- q: What does OPTIONAL MATCH do when nothing matches?
  options: ["Drops the row", "Returns null for the new variables and keeps the row", "Throws an error", "Creates the missing nodes"]
  answer: 1
```

# Paths and Shortest Routes {#paths}

A **path** is an alternating chain of nodes and relationships. Graph databases shine when a question needs paths of **unknown length**.

## Variable-length patterns

| Pattern | Meaning |
|---|---|
| `-[:REQUIRES*]->` | 1 or more hops |
| `-[:REQUIRES*2]->` | exactly 2 hops |
| `-[:REQUIRES*1..3]->` | between 1 and 3 hops |
| `-[:REQUIRES*0..]->` | 0 or more (includes the start node itself) |

```cypher run title="Every prerequisite of Agentic AI, at any depth"
// dataset: skuru
MATCH p = (:Course {code: 'AI310'})-[:REQUIRES*]->(pre:Course)
RETURN pre.code, length(p) AS depth
ORDER BY depth, pre.code
```

Assign the whole path to a variable (`p = …`) and use `length(p)`, `nodes(p)` and `relationships(p)`.

## Shortest paths

`shortestPath()` finds the path with the **fewest relationships** using breadth-first search: explore everything one hop away, then two hops, and stop as soon as the target appears.

```sketch
title: Breadth-first search for the shortest path
caption: BFS explores in rings. The first time it reaches Budiriro, it has found a path with the fewest hops.
cellW: 170
cellH: 110
nodes:
  - id: a
    label: Fourth St
    col: 0
    row: 1
    shape: circle
    tone: gold
  - id: b
    label: Copa
    col: 1
    row: 1
    shape: circle
    tone: sky
  - id: m
    label: Msasa
    col: 1
    row: 2.2
    shape: circle
    tone: sky
  - id: c
    label: Mbare
    col: 2
    row: 1.6
    shape: circle
    tone: teal
  - id: w
    label: Warren Pk
    col: 2
    row: 0.3
    shape: circle
    tone: teal
  - id: g
    label: Glen View
    col: 3
    row: 1
    shape: circle
    tone: grape
  - id: z
    label: Budiriro
    col: 4
    row: 1
    shape: circle
    tone: rose
edges:
  - from: a
    to: b
    label: hop 1
  - from: a
    to: m
    label: hop 1
  - from: b
    to: c
    label: hop 2
  - from: b
    to: w
    label: hop 2
  - from: c
    to: g
    label: hop 3
  - from: w
    to: g
    dashed: true
  - from: g
    to: z
    label: hop 4
```

```cypher run title="Fewest kombi rides from Fourth Street to Budiriro"
// dataset: transit
MATCH p = shortestPath((a:Stop {name: 'Fourth Street'})-[:ROUTE*]->(b:Stop {name: 'Budiriro'}))
RETURN p, length(p) AS rides
```

```cypher run title="Add up minutes and fares along the path"
// dataset: transit
MATCH p = shortestPath((:Stop {name: 'Fourth Street'})-[:ROUTE*]->(:Stop {name: 'Budiriro'}))
UNWIND relationships(p) AS leg
RETURN sum(leg.mins) AS minutes, sum(leg.fare) AS fare
```

> **Fewest hops is not always fastest.** `shortestPath` counts relationships. To minimise **minutes**, use a **weighted** algorithm such as Dijkstra or A*, which Neo4j provides in the **Graph Data Science** library (`gds.shortestPath.dijkstra`). You'll implement Dijkstra yourself in the algorithms lesson.

## Cycles

A pattern can start and end on the same node. In payments data, money that returns to where it started is a red flag.

```cypher run title="Money that comes back in exactly three transfers"
// dataset: fraud
MATCH p = (a:Account)-[:SENT*3]->(a)
RETURN p
LIMIT 3
```

> **Performance tip.** Unbounded patterns like `*` can explode on big graphs. In production always set an upper bound (`*1..6`), filter by relationship type, and start from a specific node.

```exercise
prompt: Match prerequisites exactly two hops away from Agentic AI.
lang: cypher
code: |
  MATCH (:Course {code: 'AI310'})-[:REQUIRES*___]->(pre)
  RETURN pre.code
answers: ["2"]
```

````challenge
id: neo4j-two-hop-friends
title: Friends of friends
difficulty: medium
lang: cypher
prompt: |
  Find people **exactly two FRIENDS_WITH hops** away from **Farai** (either direction) who are **not** Farai and **not** already direct friends of Farai. Return their names, each once, sorted.
starter: |
  // dataset: skuru
  MATCH (me:Student {name: 'Farai'})
  RETURN me.name
expectedOutput: |
  Nyasha
  Tatenda
````

```quiz
- q: What does -[:R*1..3]-> match?
  options: ["Exactly 3 hops", "Between 1 and 3 hops", "1 or 3 hops only", "At least 3 hops"]
  answer: 1
- q: What does shortestPath minimise?
  options: ["Total of a weight property", "The number of relationships", "Query time", "The number of labels"]
  answer: 1
- q: Why should variable-length patterns have an upper bound in production?
  options: ["Cypher requires it", "The number of paths can grow explosively on large graphs", "Upper bounds make results sorted", "Neo4j charges per hop"]
  answer: 1
```

# Writing Data: CREATE, MERGE, SET, DELETE {#writing}

| Clause | Does | Watch out for |
|---|---|---|
| `CREATE` | Always creates new nodes/relationships | Running twice creates duplicates |
| `MERGE` | Finds the **whole pattern**, or creates it if missing | Merge on a unique key, not on many properties |
| `SET` | Adds or updates properties and labels | `SET n = {…}` replaces **all** properties; `+=` merges |
| `REMOVE` | Removes properties or labels | |
| `DELETE` | Deletes nodes/relationships | A node with relationships needs `DETACH DELETE` |

```cypher run title="Create two nodes and a relationship"
// dataset: empty
CREATE (a:Person {name: 'Rumbi', city: 'Harare'})-[:WORKS_AT {since: 2024}]->(c:Company {name: 'Skuru Learning'})
RETURN a, c
```

## MERGE makes writes safe to repeat

Data pipelines retry. Agents call tools twice. Use `MERGE` on a **unique key** so repeated runs do not create duplicates, and use `ON CREATE SET` / `ON MATCH SET` for the other properties.

```cypher run title="Idempotent upsert"
// dataset: skuru
MERGE (s:Student {name: 'Kudzai'})
  ON CREATE SET s.city = 'Chitungwiza', s.year = 1, s.created = true
  ON MATCH SET s.seenAgain = true;
MERGE (s:Student {name: 'Kudzai'})
  ON CREATE SET s.city = 'Chitungwiza', s.year = 1, s.created = true
  ON MATCH SET s.seenAgain = true;
MATCH (s:Student {name: 'Kudzai'})
RETURN count(s) AS copies, s.created, s.seenAgain
```

> **The MERGE trap.** `MERGE (a:Student {name: 'Kudzai'})-[:ENROLLED_IN]->(c:Course {code: 'PY101'})` merges the **whole pattern**: if the relationship does not exist it creates a **new** student *and* a **new** course. Instead, `MERGE` or `MATCH` each node first, then `MERGE` the relationship between the bound variables.

```cypher run title="The right way to merge a relationship"
// dataset: skuru
MATCH (c:Course {code: 'PY101'})
MERGE (s:Student {name: 'Kudzai'})
MERGE (s)-[:ENROLLED_IN {progress: 0}]->(c)
RETURN s, c
```

## Updating and deleting

```cypher run title="Update progress, then remove a course"
// dataset: skuru
MATCH (:Student {name: 'Chipo'})-[e:ENROLLED_IN]->(:Course {code: 'WEB101'})
SET e.progress = 50;
MATCH (c:Course {code: 'WEB101'})
DETACH DELETE c;
MATCH (c:Course) RETURN count(c) AS coursesLeft
```

## Loading data in real Neo4j

In a real database you load files with `LOAD CSV` (or the Data Importer in Aura), batching large files:

```cypher
LOAD CSV WITH HEADERS FROM 'file:///students.csv' AS row
CALL (row) {
  MERGE (s:Student {email: row.email})
  SET s.name = row.name, s.city = row.city
} IN TRANSACTIONS OF 1000 ROWS
```

Always **create a uniqueness constraint first** (next lessons) so `MERGE` is fast and duplicates are impossible.

```exercise
prompt: Make this enrolment safe to run twice.
lang: cypher
code: |
  MATCH (c:Course {code: 'SQL101'})
  ___ (s:Student {name: 'Rumbi'})
  ___ (s)-[:ENROLLED_IN]->(c)
answers: [MERGE, MERGE]
```

```quiz
- q: You run CREATE (:Student {name: 'Ana'}) three times. How many Ana nodes exist?
  options: ["1", "3", "0", "An error is raised"]
  answer: 1
- q: What does SET n = {name: 'X'} do to n's other properties?
  options: ["Keeps them", "Removes them, leaving only name", "Doubles them", "Converts them to strings"]
  answer: 1
  explain: "= replaces the whole property map; use += to merge."
- q: Why does MERGE (a:X {k:1})-[:R]->(b:Y {k:2}) sometimes create duplicate nodes?
  options: ["MERGE is buggy", "MERGE matches or creates the whole pattern, so if the relationship is missing it creates both nodes again", "Because of indexes", "It never does"]
  answer: 1
```

# Graph Data Modeling {#modeling}

Good models make queries short and fast. Start from the **questions** the business needs answered, not from the tables you already have.

## A step-by-step method

1. **Write the questions** in plain language ("Which customers share a phone with a flagged customer?").
2. **Circle the nouns** → candidate **node labels** (Customer, Phone, Account).
3. **Underline the verbs** → candidate **relationship types** (USES, OWNS, SENT).
4. **Sketch an example** with real data on paper, then check each question is a short walk on your sketch.
5. **Decide property vs node**: if you will *filter by it or connect through it*, make it a node; if it just describes something, keep it a property.
6. **Add constraints** for every key you `MERGE` on.
7. **Refactor** when a new question needs it. Graphs change shape easily.

```sketch
title: Modeling a mobile-money domain
caption: Phone and Device are nodes, not properties, because fraud questions connect people THROUGH them.
cellW: 180
cellH: 115
nodes:
  - id: p1
    label: Person
    col: 0
    row: 0.5
    shape: circle
    tone: teal
  - id: p2
    label: Person
    col: 0
    row: 2
    shape: circle
    tone: teal
  - id: ph
    label: Phone
    col: 1.3
    row: 1.25
    shape: circle
    tone: rose
  - id: a1
    label: Account
    col: 2.6
    row: 0.5
    shape: circle
    tone: gold
  - id: a2
    label: Account
    col: 2.6
    row: 2
    shape: circle
    tone: gold
  - id: d
    label: Device
    col: 1.3
    row: 2.75
    shape: circle
    tone: rose
edges:
  - from: p1
    to: ph
    label: USES_PHONE
  - from: p2
    to: ph
    label: USES_PHONE
  - from: p2
    to: d
    label: USES_DEVICE
  - from: p1
    to: a1
    label: OWNS
    bend: 25
  - from: p2
    to: a2
    label: OWNS
    bend: -25
  - from: a1
    to: a2
    label: "SENT {amount}"
```

## Design decisions you will meet

| Situation | Choice | Why |
|---|---|---|
| A fact about a connection (amount, date) | Relationship property | Keeps it on the edge it describes |
| A connection that itself has connections (an Order with many Products, a Payment approved by a Manager) | **Intermediate node** (`(:Order)`) | Relationships cannot point at relationships |
| A category you filter by often (`status: 'active'`) | Extra **label** (`:Active`) | Labels are indexed and cheap to filter |
| A value shared by many nodes and used to connect them (phone, city, device) | **Node** | Lets you walk *through* it |
| Time series or events | `(:Event)` nodes linked with `NEXT` | Makes ordering a walk |
| One node with millions of relationships (a "supernode", e.g. `:Country`) | Avoid traversing through it; add more specific nodes or labels | Keeps traversals small |

```sketch
title: Relationship property vs intermediate node
caption: When the connection needs its own connections, promote it to a node.
cellW: 175
nodes:
  - id: c1
    label: Customer
    col: 0
    row: 0
    shape: circle
    tone: teal
  - id: p1
    label: Product
    col: 2
    row: 0
    shape: circle
    tone: gold
  - id: c2
    label: Customer
    col: 0
    row: 1.5
    shape: circle
    tone: teal
  - id: o
    label: Order
    sub: "date, total"
    col: 1.5
    row: 1.5
    shape: circle
    tone: grape
  - id: p2
    label: Product
    col: 3
    row: 1
    shape: circle
    tone: gold
  - id: p3
    label: Product
    col: 3
    row: 2
    shape: circle
    tone: gold
edges:
  - from: c1
    to: p1
    label: "BOUGHT {date}"
  - from: c2
    to: o
    label: PLACED
  - from: o
    to: p2
    label: CONTAINS
  - from: o
    to: p3
    label: CONTAINS
```

```quiz
- q: In a fraud model, should a phone number be a property or a node?
  options: ["A property on Person", "A node, so you can find people connected through the same phone", "A label", "A relationship type"]
  answer: 1
- q: When should you introduce an intermediate node such as Order?
  options: ["Never", "When the connection itself needs to connect to other things", "When there are more than 10 properties", "Only for dates"]
  answer: 1
- q: What is a supernode?
  options: ["The first node created", "A node with a huge number of relationships that slows traversals", "A node with many labels", "Neo4j's admin node"]
  answer: 1
```

# Indexes, Constraints and Performance {#performance}

Neo4j finds the **starting nodes** of a pattern with **indexes**, then walks relationships. Fast queries come from fast starting points and short walks.

## Constraints and indexes you will use

```cypher
// Unique key: also creates an index, and makes MERGE fast and safe
CREATE CONSTRAINT student_email IF NOT EXISTS
FOR (s:Student) REQUIRE s.email IS UNIQUE;

// Range index for lookups and ranges on a property
CREATE INDEX course_level IF NOT EXISTS FOR (c:Course) ON (c.level);

// Full-text index for keyword search
CREATE FULLTEXT INDEX chunk_text IF NOT EXISTS FOR (c:Chunk) ON EACH [c.text];

// Vector index for semantic search over embeddings (GraphRAG)
CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
FOR (c:Chunk) ON c.embedding
OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine' } };

SHOW INDEXES;
```

## Reading a query plan

Prefix a query with `EXPLAIN` (plan only) or `PROFILE` (runs it and counts **db hits**). Look for:

| Operator | Good or bad? | Meaning |
|---|---|---|
| `NodeUniqueIndexSeek` / `NodeIndexSeek` | Good | Started from an index |
| `NodeByLabelScan` | OK on small labels | Read every node with that label |
| `AllNodesScan` | Usually bad | Read every node in the database |
| `CartesianProduct` | Usually a bug | Two unconnected patterns |
| `Expand(All)` with huge rows | Watch | A traversal fanning out |

## Habits of fast Cypher

1. **Anchor** every pattern on an indexed property (`{email: $email}`).
2. **Use parameters** (`$email`) instead of string-building. They are faster (cached plans) and stop **Cypher injection**.
3. **Bound** variable-length patterns and name relationship types.
4. **Filter early**, `LIMIT` early with `WITH … LIMIT`, then expand.
5. **Batch writes** (`CALL { … } IN TRANSACTIONS`) and use `UNWIND $rows` for bulk loads from code.

```quiz
- q: Which plan operator usually signals a missing index or a bad start point?
  options: ["NodeUniqueIndexSeek", "AllNodesScan", "ProduceResults", "Projection"]
  answer: 1
- q: Why use $parameters instead of putting values into the query string?
  options: ["Parameters look nicer", "Plan caching and protection against Cypher injection", "They are required by Neo4j", "They make results sorted"]
  answer: 1
- q: What does a uniqueness constraint give you besides preventing duplicates?
  options: ["Nothing else", "An index that makes lookups and MERGE fast", "Automatic backups", "Vector search"]
  answer: 1
```

# Graph Algorithms {#algorithms}

Queries answer questions you already know how to ask. **Graph algorithms** find structure you did not know was there: who is central, which groups exist, what is similar. In Neo4j they live in the **Graph Data Science (GDS)** library, run on an in-memory **projection** of the graph.

| Family | Algorithm | Answers |
|---|---|---|
| Centrality | Degree, **PageRank**, Betweenness | Who is important or a bottleneck? |
| Community | **Louvain**, Label Propagation, WCC | Which groups belong together? Fraud rings? |
| Similarity | Node Similarity (Jaccard), KNN | Who behaves alike? Recommendations |
| Path finding | **Dijkstra**, A*, BFS | Cheapest or fastest route |
| Embeddings | FastRP, Node2Vec | Turn graph position into vectors for ML |

Real GDS usage looks like this (static example):

```cypher
// 1. Project a graph into memory
CALL gds.graph.project('money', 'Account', {SENT: {properties: 'amount'}});
// 2. Run PageRank and write the score back to each node
CALL gds.pageRank.write('money', {writeProperty: 'pagerank'});
// 3. Use it like any property
MATCH (a:Account) RETURN a.number, a.pagerank ORDER BY a.pagerank DESC LIMIT 5;
```

## Build PageRank yourself

PageRank imagines a random surfer who follows links, and sometimes (probability `1 - d`) jumps to a random node. A node's score is the share of time the surfer spends there. Important nodes are those that important nodes point to.

```python run title="PageRank from first principles"
# Who receives money from well-connected accounts?
edges = [("ML-1002", "ML-1003"), ("ML-1003", "ML-1004"), ("ML-1004", "ML-1002"),
         ("ML-1007", "ML-1009"), ("ML-1009", "ML-1003"), ("ML-1001", "ML-1005"),
         ("ML-1005", "ML-1006"), ("ML-1006", "ML-1008"), ("ML-1008", "ML-1006"), ("ML-1005", "ML-1008")]
nodes = sorted({n for e in edges for n in e})
out = {n: [b for a, b in edges if a == n] for n in nodes}

d, N = 0.85, len(nodes)
rank = {n: 1 / N for n in nodes}
for step in range(50):
    new = {n: (1 - d) / N for n in nodes}
    for n in nodes:
        targets = out[n] or nodes          # a dead end shares its rank with everyone
        for t in targets:
            new[t] += d * rank[n] / len(targets)
    rank = new

for n, r in sorted(rank.items(), key=lambda x: -x[1])[:4]:
    print(f"{n}  {r:.3f}")
print("total", round(sum(rank.values()), 3))
```

## Dijkstra: the fastest route, not the fewest hops

```python run title="Dijkstra with a priority queue"
import heapq

routes = {
    "Fourth Street": {"Copacabana": 5, "Msasa": 20},
    "Copacabana": {"Avondale": 15, "Borrowdale": 25, "Mbare Musika": 10, "Warren Park": 20},
    "Mbare Musika": {"Glen View": 20},
    "Warren Park": {"Kuwadzana": 15, "Glen View": 25},
    "Glen View": {"Budiriro": 10},
}

def dijkstra(start, goal):
    queue = [(0, start, [start])]
    best = {start: 0}
    while queue:
        mins, stop, path = heapq.heappop(queue)
        if stop == goal:
            return mins, path
        for nxt, cost in routes.get(stop, {}).items():
            total = mins + cost
            if total < best.get(nxt, float("inf")):
                best[nxt] = total
                heapq.heappush(queue, (total, nxt, path + [nxt]))
    return None

mins, path = dijkstra("Fourth Street", "Budiriro")
print(" → ".join(path))
print(mins, "minutes")
```

## Communities: connected components

```python run title="Find rings of people who share phones or devices"
shared = [("Blessing", "Tapiwa"), ("Tapiwa", "Precious"), ("Blessing", "Rutendo"),
          ("Munashe", "Simba"), ("Lindiwe", "Munashe")]
people = {p for pair in shared for p in pair} | {"Kuda"}

parent = {p: p for p in people}
def find(p):
    while parent[p] != p:
        parent[p] = parent[parent[p]]   # path compression
        p = parent[p]
    return p
for a, b in shared:
    parent[find(a)] = find(b)

groups = {}
for p in people:
    groups.setdefault(find(p), []).append(p)
for g in sorted(groups.values(), key=len, reverse=True):
    print(len(g), sorted(g))
```

This is **Weakly Connected Components** (WCC), the first algorithm fraud teams run: every component with several people sharing identifiers deserves a look.

```quiz
- q: Which algorithm family would you use to find groups of accounts that transact mostly with each other?
  options: ["Centrality", "Community detection (e.g. Louvain)", "Path finding", "Sorting"]
  answer: 1
- q: In PageRank, what does the damping factor d = 0.85 model?
  options: ["The surfer follows a link 85% of the time and jumps randomly 15% of the time", "85% of nodes are ignored", "Rank is reduced by 15% per hop forever", "The graph is 85% connected"]
  answer: 0
- q: Why use Dijkstra instead of shortestPath for journey planning?
  options: ["Dijkstra is older", "Dijkstra minimises total weight such as minutes; shortestPath minimises hops", "shortestPath cannot handle directions", "Dijkstra uses less memory always"]
  answer: 1
```

# Neo4j as the Knowledge Layer for AI {#knowledge-layer}

Large language models are fluent but forgetful and sometimes wrong. They know nothing about **your** data, cannot see how facts connect, and forget each conversation. Neo4j positions the graph as a **knowledge layer** under AI systems: a shared, explainable store of facts and relationships that models and agents read from and write to.

```sketch
title: The graph as the knowledge layer
caption: Apps and agents ask questions; the graph supplies connected, explainable context; the LLM writes the answer.
cellW: 190
cellH: 120
nodes:
  - id: user
    label: User
    col: 0
    row: 1
    shape: person
  - id: agent
    label: Agent / app
    sub: plans, calls tools
    col: 1
    row: 1
    shape: round
    tone: sky
  - id: llm
    label: LLM
    sub: reasons, writes
    col: 2
    row: 0
    shape: round
    tone: gold
  - id: retr
    label: Retrievers
    sub: vector + Cypher
    col: 2
    row: 2
    shape: round
    tone: grape
  - id: kg
    label: Neo4j graph
    sub: facts · memory · lineage
    col: 3.2
    row: 1
    shape: db
    tone: teal
    w: 1.1
  - id: src
    label: Documents, DBs, APIs
    col: 3.2
    row: 2.4
    shape: doc
edges:
  - from: user
    to: agent
    label: question
  - from: agent
    to: llm
    label: prompt + context
  - from: agent
    to: retr
    label: tool call
  - from: retr
    to: kg
    label: query
  - from: kg
    to: retr
    label: subgraph
    bend: 18
  - from: src
    to: kg
    label: extract & load
  - from: agent
    to: kg
    label: write memory
    dashed: true
    bend: -40
```

## Four ways AI systems use Neo4j

| Pattern | What the graph stores | What it enables |
|---|---|---|
| **GraphRAG** | Chunks with embeddings, linked to the entities they mention and to each other | Answers that combine semantic search with multi-hop facts, with citations |
| **Agent memory** | Conversations (short-term), facts and preferences (long-term), reasoning steps and tool calls | Agents that remember users across sessions and can be audited |
| **Context graphs** | The decisions, policies, people and systems behind a process | Context engineering: give an agent exactly the relevant slice |
| **Tools via MCP** | Any graph | Agents query the graph through a standard Model Context Protocol server |

## Retrieval patterns you'll build in the GraphRAG track

1. **Vector retriever**: embed the question, find the nearest chunks with the vector index.
2. **Vector + graph traversal**: start from those chunks, then follow `MENTIONS`, `NEXT`, `PART_OF` to pull in related entities and neighbouring text.
3. **Text2Cypher**: an LLM translates the question into Cypher against your schema (powerful, but must be validated and run read-only).
4. **Cypher templates**: experts write vetted, parameterised queries; the agent only fills in the parameters. Safer and more predictable.

```cypher run title="Vector search, then expand through the graph"
// dataset: kg
// 1) semantic search over chunk embeddings
MATCH (c:Chunk)
WITH c, vector.similarity.cosine(c.embedding, [0.6, 0.7, 0.0, 0.1]) AS score
ORDER BY score DESC
LIMIT 2
// 2) graph expansion: what do those chunks mention, and how are those things related?
MATCH (c)-[:MENTIONS]->(e:Entity)
OPTIONAL MATCH (e)-[r:RELATED_TO]->(other:Entity)
RETURN c.id, round(score, 3) AS score, e.name, r.how, other.name
```

In real Neo4j you would use the vector index directly:

```cypher
CALL db.index.vector.queryNodes('chunk_embedding', 5, $questionEmbedding)
YIELD node AS chunk, score
MATCH (chunk)-[:MENTIONS]->(e:Entity)
RETURN chunk.text, score, collect(e.name) AS entities
```

## Agent memory as a graph

```cypher run title="Everything the tutor agent should know about Rudo"
// dataset: memory
MATCH (u:User {name: 'Rudo'})
OPTIONAL MATCH (u)-[:PREFERS]->(p:Preference)
OPTIONAL MATCH (u)-[k:KNOWS_FACT]->(f:Fact)
RETURN collect(DISTINCT p.key + ' = ' + p.value) AS preferences,
       collect(DISTINCT f.text) AS facts
```

The **Graph Lab** has full work placements for a GraphRAG engineer and a memory engineer.

```quiz
- q: Which retrieval pattern lets domain experts control exactly which queries an agent can run?
  options: ["Text2Cypher", "Cypher templates with parameters", "Pure vector search", "Full-text search"]
  answer: 1
- q: What does graph expansion add to vector search?
  options: ["Faster embeddings", "Connected facts (entities, neighbours, documents) that similarity alone would miss", "Lower cost per token", "Nothing"]
  answer: 1
- q: Which kind of agent memory stores the steps and tool calls an agent made?
  options: ["Short-term", "Long-term", "Reasoning memory", "Cache"]
  answer: 2
```

# Neo4j from Code, Aura and MCP {#drivers}

## Run Neo4j

| Option | Good for |
|---|---|
| **Neo4j AuraDB Free** (cloud) | Learning and prototypes, nothing to install |
| **Neo4j Desktop** | Local development with a GUI |
| **Docker** `docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/your-password neo4j:latest` | Repeatable local and CI setups |

Browser UI: `http://localhost:7474`. Applications connect with the **Bolt** protocol on port 7687 (`neo4j://` or `neo4j+s://` for encrypted cloud connections).

## The official Python driver

```python
# pip install neo4j
import os
from neo4j import GraphDatabase

URI = os.environ["NEO4J_URI"]            # e.g. neo4j+s://xxxx.databases.neo4j.io
AUTH = (os.environ["NEO4J_USERNAME"], os.environ["NEO4J_PASSWORD"])

with GraphDatabase.driver(URI, auth=AUTH) as driver:
    driver.verify_connectivity()

    # Reads: always pass values as parameters, never with f-strings
    records, summary, keys = driver.execute_query(
        "MATCH (s:Student {city: $city})-[:ENROLLED_IN]->(c:Course) "
        "RETURN s.name AS name, collect(c.title) AS courses",
        city="Harare",
        database_="neo4j",
        routing_="r",                    # send to a read replica in a cluster
    )
    for r in records:
        print(r["name"], r["courses"])

    # Bulk writes: one query, many rows, with UNWIND
    rows = [{"email": "a@x.zw", "name": "Ana"}, {"email": "b@x.zw", "name": "Ben"}]
    driver.execute_query(
        "UNWIND $rows AS row MERGE (s:Student {email: row.email}) SET s.name = row.name",
        rows=rows, database_="neo4j",
    )
```

> **Security.** Store credentials in environment variables or a secret manager. Give applications a database user with only the permissions they need, and give AI agents **read-only** access unless writing is the point.

## Neo4j for AI developers

| Tool | Use |
|---|---|
| **neo4j-graphrag** (Python) | Official GraphRAG package: `VectorRetriever`, `VectorCypherRetriever`, `Text2CypherRetriever`, a `GraphRAG` pipeline and a knowledge-graph builder that extracts entities from documents |
| **LangChain / LlamaIndex integrations** | Neo4j vector stores, graph stores and Cypher chains inside those frameworks |
| **Neo4j MCP servers** | Give any MCP-capable agent (Claude, IDE agents, your own) tools to read the schema and run Cypher |
| **Aura Agents** | Build and host agents on top of an Aura database with no-code configuration |

A typical MCP client configuration for the Cypher server looks like this:

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "uvx",
      "args": ["mcp-neo4j-cypher"],
      "env": {
        "NEO4J_URI": "neo4j://localhost:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "use-a-secret-not-this",
        "NEO4J_READ_ONLY": "true"
      }
    }
  }
}
```

The agent then gets tools such as *get schema*, *read Cypher* and (if allowed) *write Cypher*. The **MCP & Agent Protocols** track shows how such servers are built.

```quiz
- q: Which protocol and port do applications use to talk to Neo4j by default?
  options: ["HTTP 80", "Bolt 7687", "gRPC 50051", "SQL 5432"]
  answer: 1
- q: What is the safest default permission for an AI agent connected to your graph?
  options: ["Admin", "Read-only, with write tools only when needed", "No authentication", "Write-only"]
  answer: 1
- q: Why use UNWIND $rows in a bulk write from Python?
  options: ["It sorts the rows", "One round trip and one query plan for many rows instead of one query per row", "It is required for MERGE", "It encrypts the data"]
  answer: 1
```

# Case Study: Uncovering a Fraud Ring {#fraud-case}

You're the analyst at MoneyLink, a (fictional) mobile-money company. Account `ML-1003` was flagged for moving money it could not explain. Your job: find out who else is involved. Work through the steps; each builds on the last.

```sketch
title: How fraud rings show up in a graph
caption: Synthetic identities share phones and devices; money cycles between their accounts to disguise its origin.
cellW: 165
cellH: 110
nodes:
  - id: b
    label: Blessing
    col: 0
    row: 0
    shape: circle
    tone: teal
  - id: t
    label: Tapiwa
    col: 0
    row: 1.3
    shape: circle
    tone: teal
  - id: p
    label: Precious
    col: 0
    row: 2.6
    shape: circle
    tone: teal
  - id: ph
    label: Shared phone
    col: 1.3
    row: 1.3
    shape: circle
    tone: rose
    w: 0.75
    h: 0.95
  - id: a2
    label: ML-1002
    col: 2.6
    row: 0
    shape: round
    tone: gold
  - id: a3
    label: ML-1003
    col: 3.6
    row: 1.3
    shape: round
    tone: rose
  - id: a4
    label: ML-1004
    col: 2.6
    row: 2.6
    shape: round
    tone: gold
edges:
  - from: b
    to: ph
  - from: t
    to: ph
  - from: p
    to: ph
  - from: a2
    to: a3
    label: "$480"
  - from: a3
    to: a4
    label: "$470"
  - from: a4
    to: a2
    label: "$460"
```

**Step 1.** Who owns the flagged account, and what identifiers do they use?

```cypher run title="Step 1: start from the evidence"
// dataset: fraud
MATCH (a:Account {flagged: true})<-[:OWNS]-(p:Person)
OPTIONAL MATCH (p)-[:USES_PHONE|USES_DEVICE]->(id)
RETURN p.name, a.number, labels(id)[0] AS kind, coalesce(id.number, id.imei) AS identifier
```

**Step 2.** Who else shares those identifiers?

```cypher run title="Step 2: one hop out through shared identifiers"
// dataset: fraud
MATCH (:Account {flagged: true})<-[:OWNS]-(suspect:Person)-[:USES_PHONE|USES_DEVICE]->(id)<-[:USES_PHONE|USES_DEVICE]-(other:Person)
RETURN DISTINCT other.name, other.joined, labels(id)[0] AS via
ORDER BY other.name
```

**Step 3.** Follow the money in a cycle.

```cypher
// Real Neo4j: list comprehension and reduce()
MATCH p = (a:Account)-[:SENT*2..4]->(a)
WITH DISTINCT [n IN nodes(p) | n.number] AS loop, reduce(t = 0, r IN relationships(p) | t + r.amount) AS moved
RETURN loop, moved
```

That query uses two Cypher features our practice graph does not support: list comprehensions and `reduce`. Real Neo4j runs it fine. Here is the equivalent in our sandbox:

```cypher run title="Step 3 (sandbox version)"
// dataset: fraud
MATCH p = (a:Account)-[:SENT*3]->(a)
UNWIND relationships(p) AS t
WITH DISTINCT t
RETURN count(t) AS transfers, sum(t.amount) AS moved
```

**Step 4.** Put it together: the people who share identifiers **and** own accounts on the cycle are your ring.

````challenge
id: neo4j-fraud-ring
title: Name the ring
difficulty: hard
lang: cypher
prompt: |
  Return the **names** of every person who owns an account that sits on a **3-step money cycle** (`(a)-[:SENT*3]->(a)`), together with the **number of other people** they share any phone or device with. Sort by name.

  Output two columns, e.g. `Name | 2`.
starter: |
  // dataset: fraud
  MATCH (a:Account)-[:SENT*3]->(a)
  RETURN DISTINCT a.number
expectedOutput: |
  Blessing Sithole | 3
  Precious Zhou | 2
  Tapiwa Gora | 3
````

**Step 5.** In production you would now flag the accounts, open a case, and keep watching: run community detection nightly, alert when a new account joins an existing ring, and feed graph features (shared-device count, PageRank in the money graph) into your fraud model.

```quiz
- q: Why are shared phones and devices strong fraud signals?
  options: ["Phones are expensive", "Real customers rarely share identifiers, while synthetic identities controlled by one person often do", "Devices store money", "Regulators require it"]
  answer: 1
- q: Which pattern finds money returning to its starting account in exactly three transfers?
  options: ["(a)-[:SENT*3]->(b)", "(a)-[:SENT*3]->(a)", "(a)<-[:SENT]-(a)", "(a)-[:SENT]->(a)"]
  answer: 1
```

# Next Steps {#next}

You can now model connected data, query it with Cypher, find paths and cycles, run graph algorithms and connect a graph to AI systems.

## Practise like it's your job

Open the **[Graph Lab](/lab)**. Each placement is a fictional company with a manager and a queue of tickets checked against live data:

| Placement | You will |
|---|---|
| Skuru Learning: junior data analyst | Answer course questions, recommend courses, enrol learners |
| ZimFresh: supply-chain analyst | Trace stock-outs, find cheapest suppliers and single points of failure |
| MoneyLink: fraud analyst | Uncover and flag a fraud ring |
| City Transit Lab: route planner | Shortest paths, journey times, coverage gaps |
| GraphRAG engineer | Vector search, graph expansion and multi-hop answers |
| Memory engineer | Agent memory reads and idempotent writes |

## Keep learning

- **GraphRAG & Agentic RAG** track: build full retrieval pipelines on top of Neo4j.
- **MCP & Agent Protocols** track: give agents tools, including your graph.
- **Neo4j GraphAcademy** (graphacademy.neo4j.com): free official courses and the **Neo4j Certified Professional** exam, a good CV signal once you've finished this track.
- Create a free **AuraDB** instance and rebuild one of our practice datasets with `CREATE` and `MERGE`.

```exam
- q: Which Cypher clause starts a new stage and lets you filter on aggregates?
  options: ["RETURN", "WITH", "UNWIND", "CALL"]
  answer: 1
- q: Which statement about relationships in Neo4j is true?
  options: ["They have no direction", "They have exactly one type and one direction, and can be queried either way", "They cannot have properties", "They can connect to other relationships"]
  answer: 1
- q: Which index do you need for semantic search over embeddings?
  options: ["Range index", "Full-text index", "Vector index", "Lookup index"]
  answer: 2
- q: You MERGE a relationship between two existing nodes. What should you do first?
  options: ["CREATE both nodes again", "MATCH or MERGE each node on its unique key, then MERGE the relationship between the variables", "DELETE the old relationship", "Nothing; MERGE the whole pattern"]
  answer: 1
- q: Which GDS algorithm family finds tightly knit groups?
  options: ["Centrality", "Community detection", "Path finding", "Embeddings"]
  answer: 1
- q: What does PROFILE show that EXPLAIN does not?
  options: ["The query text", "Actual rows and db hits from running the query", "The schema", "Index names"]
  answer: 1
- q: Why should AI agents usually get read-only graph access?
  options: ["Writes are slow", "To limit damage from mistakes or prompt injection", "Agents cannot write Cypher", "Neo4j forbids it"]
  answer: 1
- q: What does shortestPath((a)-[:ROUTE*]->(b)) return?
  options: ["The path with the lowest total minutes", "A path with the fewest ROUTE relationships", "All paths", "The longest path"]
  answer: 1
```
