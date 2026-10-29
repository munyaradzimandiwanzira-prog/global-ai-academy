---
id: graphrag
title: GraphRAG & Agentic RAG
short: GRAPHRAG
category: ai
level: advanced
language: python
color: "#0F5C4C"
icon: "🧩"
order: 46.5
premium: true
preview: 2
summary: Go beyond "top-k chunks". Build knowledge graphs from documents, retrieve with vectors plus graph traversal, answer multi-hop and global questions with community summaries, generate safe Cypher, and let agents decide what to retrieve and when. Runnable Python and live Cypher throughout.
tags: [graphrag, agentic rag, knowledge graph, neo4j, retrieval, text2cypher, rag evaluation, corrective rag]
---

# Why GraphRAG? {#intro}

Classic **vector RAG** splits documents into chunks, embeds them, and at question time fetches the *k* most similar chunks for the model to read. It works well for "find the paragraph that answers this". It struggles with three kinds of question:

| Question type | Example | Why vector RAG struggles |
|---|---|---|
| **Multi-hop** | "Can a Zuva Scholarship holder also take a tuition loan?" | The answer depends on facts in **different** chunks that are not similar to each other or to the question |
| **Global / aggregate** | "What are the main themes across all 300 student complaints?" | No single chunk is "similar" to a summary of everything |
| **Relationship-centric** | "Who approves loans, and who must sign for them?" | Relationships are implicit in text, never stored explicitly |

**GraphRAG** adds a **knowledge graph**: entities (people, products, policies) and the relationships between them, linked back to the source chunks. Retrieval can then **walk** from what the question mentions to everything connected, and every fact keeps a pointer to the text that supports it.

```sketch
title: Vector RAG vs GraphRAG retrieval
caption: Vector search finds similar chunks. GraphRAG starts there, then follows entities and relationships to connected facts, keeping source links for citations.
cellW: 150
cellH: 108
nodes:
  - id: q1
    label: Question
    col: 0
    row: 0.5
    shape: pill
    tone: sky
  - id: v1
    label: chunk 3
    col: 1.3
    row: 0
    shape: doc
  - id: v2
    label: chunk 9
    col: 1.3
    row: 1
    shape: doc
  - id: q2
    label: Question
    col: 2.8
    row: 0.5
    shape: pill
    tone: sky
  - id: c
    label: chunk 3
    col: 4
    row: 0
    shape: doc
  - id: e1
    label: "Zuva\nScholarship"
    col: 5.2
    row: 0
    shape: circle
    tone: gold
    w: 0.75
    h: 0.9
  - id: e2
    label: "Tuition\nloan"
    col: 5.2
    row: 1.4
    shape: circle
    tone: gold
    w: 0.75
    h: 0.9
  - id: c2
    label: chunk 5
    col: 4
    row: 1.4
    shape: doc
edges:
  - from: q1
    to: v1
    label: similar
  - from: q1
    to: v2
    label: similar
  - from: q2
    to: c
    label: similar
  - from: c
    to: e1
    label: MENTIONS
  - from: e1
    to: e2
    label: EXCLUDES
  - from: c2
    to: e2
    label: MENTIONS
groups:
  - label: Vector RAG
    nodes: [q1, v1, v2]
  - label: GraphRAG
    nodes: [q2, c, e1, e2, c2]
    tone: teal
```

## The two graphs inside GraphRAG

1. **Lexical graph**: the structure of your documents. `(:Document)<-[:PART_OF]-(:Chunk)-[:NEXT]->(:Chunk)`. Lets you fetch neighbouring text and cite sources.
2. **Domain graph**: what the documents are about. `(:Chunk)-[:MENTIONS]->(:Entity)-[:RELATED_TO]->(:Entity)`. Lets you answer relational and multi-hop questions.

You can explore both in the practice graph:

```cypher run title="The lexical and domain graph together"
// dataset: kg
MATCH (d:Document)<-[:PART_OF]-(c:Chunk)-[:MENTIONS]->(e:Entity)
RETURN d, c, e
```

## When is GraphRAG worth it?

✅ Your questions need **connections** (policies that interact, people and their roles, supply chains, regulations).
✅ You need **explainability**: show the path and the sources behind an answer.
✅ You need **global** answers across a whole corpus.
❌ Your questions are simple look-ups in independent documents. Plain vector or hybrid search is cheaper.

Building a graph costs LLM calls (to extract entities) and engineering time. Start with a **small domain schema** for the questions that matter most.

```quiz
- q: Which question is hardest for plain top-k vector RAG?
  options: ["What is the loan interest rate?", "Can a scholarship holder also take a loan? (needs facts from two different chunks)", "Define tuition", "What time does the helpdesk open?"]
  answer: 1
- q: What does the lexical graph capture?
  options: ["Who is related to whom", "Document structure: documents, chunks and their order", "User preferences", "Embedding dimensions"]
  answer: 1
- q: Why does GraphRAG help with citations?
  options: ["It stores PDFs", "Every entity and fact stays linked to the chunks that mention it", "It removes hallucinations entirely", "It uses bigger models"]
  answer: 1
```

# Building a Knowledge Graph from Documents {#kg-construction}

The pipeline from raw text to a queryable graph:

```sketch
title: Knowledge graph construction pipeline
caption: Each stage is testable on its own. Entity resolution is the step most teams underestimate.
cellW: 165
cellH: 110
nodes:
  - id: docs
    label: Documents
    col: 0
    row: 0
    shape: doc
  - id: chunk
    label: Chunk
    sub: + NEXT links
    col: 1
    row: 0
    shape: round
    tone: sky
  - id: embed
    label: Embed chunks
    col: 2
    row: 0
    shape: round
    tone: sky
  - id: extract
    label: Extract entities & relations
    sub: LLM + schema
    col: 1
    row: 1.2
    shape: round
    tone: grape
    w: 1.1
  - id: resolve
    label: Resolve duplicates
    sub: "'Bursar' = 'the bursar's office'"
    col: 2.4
    row: 1.2
    shape: round
    tone: rose
    w: 1.1
  - id: load
    label: MERGE into graph
    col: 3.6
    row: 0.6
    shape: db
    tone: teal
edges:
  - from: docs
    to: chunk
  - from: chunk
    to: embed
  - from: chunk
    to: extract
  - from: extract
    to: resolve
  - from: embed
    to: load
  - from: resolve
    to: load
```

## Step 1: chunking with structure

Split on headings and paragraphs, keep chunks around 200–500 tokens with a small overlap, and **record order** (`NEXT`) and **parentage** (`PART_OF`). Store metadata: title, page, section, date.

## Step 2: schema-guided extraction

Ask the model to extract **only** the entity and relationship types you care about, as **structured output** validated by a schema. An open-ended "extract everything" produces a messy, inconsistent graph.

```python
from pydantic import BaseModel
from typing import Literal
from openai import OpenAI

class Entity(BaseModel):
    name: str
    kind: Literal["Product", "Role", "Programme", "Service", "Team"]

class Relation(BaseModel):
    source: str
    target: str
    type: Literal["APPROVES", "SIGNS_FOR", "EXCLUDES", "TARGETS", "SUPPORTS"]

class Extraction(BaseModel):
    entities: list[Entity]
    relations: list[Relation]

client = OpenAI()
resp = client.responses.parse(
    model="gpt-6.1-terra",
    instructions="Extract entities and relations from student policy text. Use only the allowed types.",
    input=chunk_text,
    text_format=Extraction,
)
extraction = resp.output_parsed     # a validated Extraction object
```

## Step 3: entity resolution

The same thing appears under many names: "Bursar", "the bursar", "Bursar's Office". Without resolution the graph fragments and multi-hop paths break. Common techniques, cheapest first:

1. **Normalise** (lowercase, strip punctuation and stop words like "the", "office").
2. **Aliases** you maintain for known entities.
3. **Fuzzy / embedding similarity** above a threshold, then an LLM or human to confirm borderline cases.

```python run title="Extract triples, resolve entities, generate idempotent Cypher"
import re

chunks = {
    "loans-3": "A guarantor must sign the loan form; the Bursar approves every application for a tuition loan.",
    "schol-2": "Holders of the Zuva Scholarship cannot also hold a Tuition Loan in the same year.",
    "fees-1":  "The bursar's office approves payment plans and tuition loans.",
}

# A stand-in for an LLM extractor: schema-guided patterns -> (source, REL, target)
RULES = [
    (r"(the )?([\w' ]+?) approves (every application for a |payment plans and )?(tuition loans?)", "APPROVES", 2, 4),
    (r"(a )?(guarantor) must sign the (loan) form", "SIGNS_FOR", 2, 3),
    (r"holders of the ([\w ]+?) cannot also hold a ([\w ]+?) in", "EXCLUDES", 1, 2),
]
def extract(text):
    out = []
    for pattern, rel, s, t in RULES:
        for m in re.finditer(pattern, text, flags=re.I):
            out.append((m.group(s).strip(), rel, m.group(t).strip()))
    return out

ALIASES = {"loan": "tuition loan", "tuition loans": "tuition loan"}
def resolve(name):
    n = name.lower().replace("'s", "")                 # possessive: "bursar's office" -> "bursar office"
    n = re.sub(r"[^a-z ]", "", n)
    n = re.sub(r"\b(the|office)\b", " ", n)            # drop filler words
    n = re.sub(r"\s+", " ", n).strip()
    n = ALIASES.get(n, n)
    return n.title()

triples = []
for cid, text in chunks.items():
    for s, rel, t in extract(text):
        triples.append((resolve(s), rel, resolve(t), cid))

for t in triples:
    print(t)

print("\n-- Cypher (safe to re-run thanks to MERGE) --")
for s, rel, t, cid in sorted(set(triples)):
    print(f"MERGE (a:Entity {{name: '{s}'}}) MERGE (b:Entity {{name: '{t}'}}) MERGE (a)-[:{rel}]->(b) "
          f"WITH a, b MATCH (c:Chunk {{id: '{cid}'}}) MERGE (c)-[:MENTIONS]->(a) MERGE (c)-[:MENTIONS]->(b);")
```

Notice "Bursar" and "bursar's office" both resolved to **Bursar**, and "loan" / "Tuition Loan" to **Tuition Loan**, so the graph has one node for each real thing.

> In production, generate Cypher with **parameters** (`MERGE (a:Entity {name: $source})`), not string formatting, to avoid injection from document text.

## Tools that do this for you

| Tool | What it does |
|---|---|
| **neo4j-graphrag** `SimpleKGPipeline` | Chunking, embedding, schema-guided extraction, resolution and loading into Neo4j |
| **LangChain** graph transformers | LLM-based graph extraction into graph stores |
| **Microsoft GraphRAG** | Extraction + community detection + community summaries (next lessons) |

```exercise
prompt: Make the load step safe to re-run.
lang: cypher
code: |
  ___ (a:Entity {name: $source})
  ___ (b:Entity {name: $target})
  ___ (a)-[:RELATED_TO {how: $type}]->(b)
answers: [MERGE, MERGE, MERGE]
```

```quiz
- q: Why give the extraction model a fixed schema of entity and relation types?
  options: ["It's required by Neo4j", "It produces a consistent graph that matches the questions you need to answer", "It's faster to type", "Schemas reduce embedding cost"]
  answer: 1
- q: What breaks if you skip entity resolution?
  options: ["Nothing", "The same real thing becomes several nodes, so paths and counts are wrong", "Embeddings fail", "Chunks disappear"]
  answer: 1
- q: Why use parameters instead of formatting values into Cypher strings?
  options: ["It looks nicer", "Document text could inject Cypher; parameters are also faster to cache", "Parameters are required for MERGE", "To hide data"]
  answer: 1
```

# Retrieval Patterns {#retrievers}

A **retriever** takes a question and returns context. GraphRAG systems combine several.

| Retriever | How | Strength | Weakness |
|---|---|---|---|
| **Vector** | Nearest chunks by embedding | Semantic matches, paraphrases | Misses connected facts |
| **Full-text / keyword** | BM25 over chunk text | Exact names, codes, rare words | Misses paraphrases |
| **Hybrid** | Combine vector and keyword scores | Best of both | Needs score fusion |
| **Vector + graph traversal** | Vector hits, then walk `MENTIONS`, `RELATED_TO`, `NEXT` | Multi-hop context with sources | Traversal must be bounded |
| **Text2Cypher** | LLM writes Cypher from the question | Precise, aggregate answers | Must be validated; can be wrong |
| **Cypher templates** | Vetted queries with parameters | Safe, predictable | Only covers anticipated questions |

## Step by step on the practice graph

**1. Vector search.** The question "Can I hold the scholarship and a loan together?" embeds to `[0.6, 0.7, 0.0, 0.1]` in our toy 4-dimensional space.

```cypher run title="1. Top chunks by vector similarity"
// dataset: kg
MATCH (c:Chunk)
WITH c, vector.similarity.cosine(c.embedding, [0.6, 0.7, 0.0, 0.1]) AS score
RETURN c.id, round(score, 3) AS score, c.text
ORDER BY score DESC
LIMIT 3
```

**2. Expand through the graph.** From the top chunks, follow what they mention and how those entities relate.

```cypher run title="2. Graph expansion from the vector hits"
// dataset: kg
MATCH (c:Chunk)
WITH c, vector.similarity.cosine(c.embedding, [0.6, 0.7, 0.0, 0.1]) AS score
ORDER BY score DESC LIMIT 2
MATCH (c)-[:MENTIONS]->(e:Entity)-[r:RELATED_TO]-(other:Entity)
RETURN DISTINCT e.name, type(r) AS rel, r.how, other.name
```

**3. Assemble context with sources.** Gather the chunk text plus the facts, each tagged with where it came from.

```cypher run title="3. Context block for the LLM"
// dataset: kg
MATCH (c:Chunk)
WITH c, vector.similarity.cosine(c.embedding, [0.6, 0.7, 0.0, 0.1]) AS score
ORDER BY score DESC LIMIT 2
MATCH (c)-[:PART_OF]->(d:Document)
OPTIONAL MATCH (c)-[:MENTIONS]->(:Entity)-[r:RELATED_TO]->(o:Entity)
RETURN d.title AS source, c.id AS chunk, c.text AS text, collect(DISTINCT r.how + ' ' + o.name) AS facts
```

## Hybrid scores: reciprocal rank fusion

When you have two ranked lists (vector and keyword), **Reciprocal Rank Fusion** combines them without needing comparable scores: each item gets `Σ 1 / (k + rank)`.

```python run title="Reciprocal rank fusion of vector and keyword results"
vector_ranked  = ["schol-2", "loans-1", "schol-1", "loans-2"]
keyword_ranked = ["loans-3", "schol-2", "loans-1"]           # e.g. BM25 for "guarantor loan scholarship"

def rrf(*lists, k=60):
    scores = {}
    for ranked in lists:
        for rank, doc in enumerate(ranked, start=1):
            scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    return sorted(scores.items(), key=lambda x: -x[1])

for doc, s in rrf(vector_ranked, keyword_ranked):
    print(f"{doc:8} {s:.4f}")
```

## With the neo4j-graphrag package

```python
from neo4j import GraphDatabase
from neo4j_graphrag.embeddings import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.retrievers import VectorCypherRetriever
from neo4j_graphrag.generation import GraphRAG

driver = GraphDatabase.driver(URI, auth=AUTH)

# After the vector search finds `node` (a Chunk) with `score`, this Cypher expands the context.
retrieval_query = """
MATCH (node)-[:PART_OF]->(d:Document)
OPTIONAL MATCH (node)-[:MENTIONS]->(e:Entity)-[r:RELATED_TO]->(o:Entity)
RETURN node.text AS text, d.title AS source, score,
       collect(DISTINCT e.name + ' ' + r.how + ' ' + o.name) AS facts
"""
retriever = VectorCypherRetriever(driver, index_name="chunk_embedding",
                                  retrieval_query=retrieval_query,
                                  embedder=OpenAIEmbeddings(model="text-embedding-3-large"))
rag = GraphRAG(retriever=retriever, llm=OpenAILLM(model_name="gpt-6.1-terra"))
answer = rag.search(query_text="Can a Zuva scholar also take a tuition loan?", retriever_config={"top_k": 3})
print(answer.answer)
```

```quiz
- q: Which retriever is best for an exact product code like "RM10"?
  options: ["Pure vector search", "Full-text / keyword search (or hybrid)", "Community summaries", "None"]
  answer: 1
- q: What does reciprocal rank fusion need from each retriever?
  options: ["Comparable scores", "Only the rank order of results", "Embeddings", "Cypher"]
  answer: 1
- q: In a VectorCypherRetriever, what does the retrieval query do?
  options: ["Creates the vector index", "Expands each vector hit through the graph to gather connected context", "Trains embeddings", "Deletes old chunks"]
  answer: 1
```

# Global Questions: Communities and Summaries {#global}

"What are the main complaints across all feedback?" has no single relevant chunk. **Microsoft's GraphRAG** approach answers such questions by:

1. Building the entity graph.
2. Detecting **communities** (clusters of densely connected entities) with an algorithm such as **Leiden**, often hierarchically.
3. Having an LLM write a **summary of each community** ahead of time.
4. At question time, **map**: ask each relevant community summary for a partial answer; **reduce**: combine the partial answers into one.

```sketch
title: Global search over community summaries
caption: Expensive summarisation happens once at indexing time; questions map over summaries and reduce to one answer.
cellW: 165
cellH: 105
nodes:
  - id: g
    label: Entity graph
    col: 0
    row: 1
    shape: db
    tone: teal
  - id: c1
    label: Community A
    col: 1.2
    row: 0
    shape: circle
    tone: gold
    w: 0.7
    h: 0.85
  - id: c2
    label: Community B
    col: 1.2
    row: 1
    shape: circle
    tone: gold
    w: 0.7
    h: 0.85
  - id: c3
    label: Community C
    col: 1.2
    row: 2
    shape: circle
    tone: gold
    w: 0.7
    h: 0.85
  - id: s
    label: Summaries
    sub: written once
    col: 2.4
    row: 1
    shape: doc
  - id: q
    label: Global question
    col: 3.6
    row: 0
    shape: pill
    tone: sky
  - id: m
    label: Map
    sub: partial answers
    col: 3.6
    row: 1
    shape: round
    tone: grape
  - id: r
    label: Reduce
    sub: final answer
    col: 3.6
    row: 2
    shape: round
    tone: grape
edges:
  - from: g
    to: c1
  - from: g
    to: c2
  - from: g
    to: c3
  - from: c1
    to: s
  - from: c2
    to: s
  - from: c3
    to: s
  - from: q
    to: m
  - from: s
    to: m
  - from: m
    to: r
```

| Search mode | Starts from | Good for |
|---|---|---|
| **Local search** | Entities matching the question, then neighbours and their chunks | Specific questions about known things |
| **Global search** | Community summaries (map-reduce) | Themes, trends, "what are the main…" |
| **DRIFT / hybrid** | Global context to orient, then local drill-down | Broad questions that need specifics |

```python run title="Communities, summaries and a map-reduce answer"
feedback = [
    ("Wi-Fi", "drops in hostel"), ("Wi-Fi", "slow at night"), ("Helpdesk", "password reset took days"),
    ("Helpdesk", "Wi-Fi tickets ignored"), ("Loans", "forms confusing"), ("Loans", "guarantor rule unclear"),
    ("Bursar", "loan approval slow"), ("Bursar", "fees statement wrong"),
]
links = [("Wi-Fi", "Helpdesk"), ("Loans", "Bursar")]   # entities that co-occur often

# 1. Communities via connected components (Leiden/Louvain find finer clusters on real graphs)
parent = {e: e for e, _ in feedback}
def find(x):
    while parent[x] != x:
        x = parent[x]
    return x
for a, b in links:
    parent[find(a)] = find(b)
communities = {}
for entity, _ in feedback:
    communities.setdefault(find(entity), set()).add(entity)

# 2. Summarise each community once (an LLM writes these at indexing time)
summaries = {}
for root, members in communities.items():
    issues = [txt for e, txt in feedback if e in members]
    summaries[" + ".join(sorted(members))] = f"{len(issues)} complaints: " + "; ".join(issues)

# 3. Map: each summary gives a partial answer with an importance score
def map_step(summary):
    n = int(summary.split()[0])
    return {"points": summary.split(": ", 1)[1], "importance": n}
partials = {name: map_step(s) for name, s in summaries.items()}

# 4. Reduce: combine, most important first
print("Q: What are the main issues students raise?\n")
for name, p in sorted(partials.items(), key=lambda kv: -kv[1]["importance"]):
    print(f"- {name} ({p['importance']} complaints): {p['points']}")
```

```quiz
- q: Why are community summaries written at indexing time rather than at question time?
  options: ["They are free", "Summarising the whole corpus per question would be far too slow and expensive", "Questions can't use LLMs", "Neo4j requires it"]
  answer: 1
- q: Which search mode suits "Who approves tuition loans?"
  options: ["Global search", "Local search starting from the matching entities", "No retrieval", "Random sampling"]
  answer: 1
- q: What is the 'reduce' step in global search?
  options: ["Deleting communities", "Combining partial answers from many summaries into one final answer", "Shrinking embeddings", "Lowering temperature"]
  answer: 1
```

# Agentic RAG {#agentic-rag}

In classic RAG the pipeline is fixed: retrieve once, then answer. In **agentic RAG**, an agent **decides** whether to retrieve, **which** retriever to use, **rewrites** the query, **checks** whether the results are good enough, and **retrieves again** if not.

```sketch
title: An agentic RAG loop with self-correction
caption: The agent routes, grades what it found, rewrites or switches source when context is weak, and only answers when it can ground every claim.
cellW: 158
cellH: 110
nodes:
  - id: q
    label: Question
    col: 0
    row: 1
    shape: pill
    tone: sky
  - id: route
    label: Route
    sub: which source?
    col: 1.1
    row: 1
    shape: diamond
    tone: gold
    w: 0.9
    h: 1
  - id: vec
    label: Vector / hybrid
    col: 2.3
    row: 0
    shape: round
  - id: graph
    label: Graph / Cypher
    col: 2.3
    row: 1
    shape: round
  - id: web
    label: Web search
    col: 2.3
    row: 2
    shape: round
  - id: grade
    label: Grade context
    sub: relevant? enough?
    col: 3.5
    row: 1
    shape: diamond
    tone: rose
    w: 0.95
    h: 1
  - id: rewrite
    label: "Rewrite /\ndecompose"
    col: 1.1
    row: 3
    shape: round
    tone: grape
  - id: ans
    label: "Answer with\ncitations"
    col: 4.7
    row: 1
    shape: pill
    tone: teal
edges:
  - from: q
    to: route
  - from: route
    to: vec
  - from: route
    to: graph
  - from: route
    to: web
  - from: vec
    to: grade
  - from: graph
    to: grade
  - from: web
    to: grade
  - from: grade
    to: ans
    label: good
  - from: grade
    to: rewrite
    label: weak
    bend: -60
  - from: rewrite
    to: route
    label: retry (max 2)
```

## Techniques

| Technique | What the agent does |
|---|---|
| **Routing** | Picks the right source: policy docs, the graph, a SQL database, the web |
| **Query rewriting** | Turns "and what about the other one?" into a standalone search query using conversation history |
| **Decomposition** | Splits "Compare loan and scholarship rules" into two sub-questions, retrieves for each |
| **Corrective RAG (CRAG)** | Grades retrieved documents; if they're irrelevant, rewrites the query or falls back to another source |
| **Self-RAG / reflection** | Checks its own draft: is each claim supported by the context? Removes or flags unsupported claims |
| **Iterative multi-hop** | Uses facts from the first retrieval to form the next query ("who approves loans?" → "Bursar" → "what does the Bursar require?") |

```python run title="Agentic RAG: route, grade, rewrite, answer with citations"
DOCS = {
    "loans-1": "Students in good standing may apply for a tuition loan of up to 1,500 USD per year.",
    "loans-3": "A guarantor must sign the loan form; the Bursar approves every application.",
    "schol-2": "Scholarship holders cannot also hold a tuition loan in the same year.",
    "it-2": "The IT Helpdesk resets passwords within one working day.",
}
GRAPH = {("Zuva Scholarship", "EXCLUDES", "Tuition loan"): "schol-2",
         ("Bursar", "APPROVES", "Tuition loan"): "loans-3"}

def keyword_search(query):
    words = {w.strip("?.,").lower() for w in query.split()} - {"a", "the", "can", "i", "my", "do", "and", "also", "how"}
    scored = sorted(((len(words & set(t.lower().replace(";", "").replace(",", "").split())), k) for k, t in DOCS.items()), reverse=True)
    return [k for s, k in scored if s >= 2][:2]

def graph_search(query):
    q = query.lower()
    return [(f"{a} {rel} {b}", src) for (a, rel, b), src in GRAPH.items() if a.lower() in q or b.lower() in q]

def route(query):
    return "graph" if any(w in query.lower() for w in ("scholarship", "who approves", "relationship")) else "docs"

def grade(context):          # an LLM grader in production
    return "good" if context else "weak"

def rewrite(query):          # an LLM rewriter in production: turn user wording into policy wording
    return query.replace("borrow tuition money", "apply for a tuition loan")

def agentic_rag(question, max_tries=2):
    query = question
    for attempt in range(1, max_tries + 1):
        source = route(query)
        context = graph_search(query) if source == "graph" else [(DOCS[k], k) for k in keyword_search(query)]
        verdict = grade(context)
        print(f"try {attempt}: route={source:5} query={query!r} -> {verdict} ({len(context)} items)")
        if verdict == "good":
            claims = "; ".join(f"{text} [{src}]" for text, src in context)
            return f"Answer based on: {claims}"
        query = rewrite(query)
    return "I couldn't find this in the policies. Please ask the Bursar's office."

print(agentic_rag("How do I borrow tuition money?"), "\n")
print(agentic_rag("I have the Zuva Scholarship, can I also get a tuition loan?"), "\n")
print(agentic_rag("What is the cafeteria menu?"))
```

## In LangGraph

Agentic RAG maps naturally onto a graph: nodes for `route`, `retrieve`, `grade_documents`, `rewrite_query`, `generate`, and conditional edges for the decisions. LangGraph's checkpointer lets the loop pause for a human or resume after a failure. The simplest version is a `create_agent` whose **tools are retrievers**: the model decides when to call `search_policies` or `query_graph`.

```quiz
- q: Retrieved chunks are irrelevant to the question. What does corrective RAG do?
  options: ["Answers anyway", "Rewrites the query or switches to another source, then retrieves again", "Deletes the index", "Raises an error to the user immediately"]
  answer: 1
- q: Turning "and what about the other one?" into a standalone query is called…
  options: ["Routing", "Query rewriting", "Embedding", "Chunking"]
  answer: 1
- q: Why cap the number of retrieval retries?
  options: ["Retrieval is free", "To bound latency and cost; after a few tries, admit the answer isn't available", "LangGraph requires 2", "Caching"]
  answer: 1
```

# Text2Cypher, Safely {#text2cypher}

**Text2Cypher** lets an LLM translate a question into a Cypher query against your schema. It's powerful for precise and aggregate questions ("How many students in Harare finished an advanced course?") but generated queries can be **wrong**, **slow**, or **dangerous**.

## The safe pipeline

1. **Give the schema** (labels, relationship types, properties) and **few-shot examples** of question → Cypher for your domain.
2. **Validate** before running: read-only clauses only, required `LIMIT`, known labels and types, no procedures you haven't allowed.
3. **Run with a read-only database user**, a timeout and a row cap.
4. **On error, retry once** with the error message in the prompt.
5. **Prefer Cypher templates** for frequent questions; use Text2Cypher for the long tail.

```python run title="Validate generated Cypher before it touches the database"
import re

SCHEMA = {"labels": {"Student", "Course", "Teacher", "Skill"},
          "rels": {"ENROLLED_IN", "TEACHES", "TEACHES_SKILL", "REQUIRES", "FRIENDS_WITH"}}
FORBIDDEN = r"\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|LOAD\s+CSV|CALL\s+dbms|CALL\s+apoc|FOREACH)\b"

def validate(cypher, max_limit=100):
    problems = []
    if re.search(FORBIDDEN, cypher, flags=re.I):
        problems.append("write or admin clause not allowed")
    labels = set(re.findall(r"\(\s*\w*\s*:\s*(\w+)", cypher))
    rels = set(re.findall(r"\[\s*\w*\s*:\s*(\w+)", cypher))
    if labels - SCHEMA["labels"]:
        problems.append(f"unknown labels {sorted(labels - SCHEMA['labels'])}")
    if rels - SCHEMA["rels"]:
        problems.append(f"unknown relationship types {sorted(rels - SCHEMA['rels'])}")
    m = re.search(r"\bLIMIT\s+(\d+)", cypher, flags=re.I)
    if not m:
        cypher = cypher.rstrip().rstrip(";") + f"\nLIMIT {max_limit}"
    elif int(m.group(1)) > max_limit:
        problems.append(f"LIMIT above {max_limit}")
    return (not problems), problems, cypher

candidates = [
    "MATCH (s:Student)-[:ENROLLED_IN]->(c:Course {level: 'advanced'}) RETURN s.name",
    "MATCH (s:Student) DETACH DELETE s",
    "MATCH (s:Learner)-[:TAKES]->(c:Course) RETURN s.name LIMIT 10",
    "MATCH (n) RETURN n LIMIT 100000",
]
for q in candidates:
    ok, problems, safe = validate(q)
    print("OK " if ok else "BAD", q[:60], "->", problems or safe.split("\n")[-1])
```

```cypher run title="A Cypher template: experts write it once, the agent supplies parameters"
// dataset: skuru
// Template: "learners_needing_prereq" with parameter $course (here inlined as 'AI301')
MATCH (s:Student)-[:ENROLLED_IN]->(c:Course {code: 'AI301'})-[:REQUIRES]->(pre:Course)
WHERE NOT (s)-[:ENROLLED_IN {progress: 100}]->(pre)
RETURN s.name AS learner, pre.title AS missingPrerequisite
ORDER BY learner
```

```quiz
- q: What is the single most important safety control for Text2Cypher?
  options: ["A longer prompt", "Running generated queries as a read-only user with validation, timeouts and row limits", "Using a bigger model", "Lower temperature"]
  answer: 1
- q: When are Cypher templates better than Text2Cypher?
  options: ["Never", "For frequent, well-understood questions where safety and predictability matter", "Only for writes", "Only on weekends"]
  answer: 1
- q: The model generated a query using a label that doesn't exist. Best response?
  options: ["Run it anyway", "Reject it and retry once, telling the model the valid labels", "Create the label", "Give up on graphs"]
  answer: 1
```

# Evaluating GraphRAG and Agentic RAG {#evaluation}

Evaluate **retrieval** and **generation** separately, then end to end. The **AI Evaluations** track covers methods in depth; here are the metrics that matter for RAG.

| Stage | Metric | Question it answers |
|---|---|---|
| Retrieval | **Recall@k** | Did the right sources appear in the top k? |
| Retrieval | **MRR** (mean reciprocal rank) | How high did the first right source appear? |
| Retrieval | **Context precision** | How much of what we retrieved was relevant? |
| Graph | **Path correctness** | For multi-hop questions, did we find the connecting facts? |
| Generation | **Faithfulness** | Is every claim supported by the retrieved context? |
| Generation | **Answer relevance / correctness** | Does it answer the question, and correctly? |
| System | **Latency, cost per answer, refusal rate** | Is it usable and affordable? |

```python run title="Retrieval metrics on a small golden set"
golden = [
    {"q": "Can a Zuva scholar take a loan?", "relevant": {"schol-2"}},
    {"q": "Who approves loans?", "relevant": {"loans-3"}},
    {"q": "How fast are password resets?", "relevant": {"it-2"}},
    {"q": "Loan repayment terms?", "relevant": {"loans-2"}},
]
system_output = {
    "Can a Zuva scholar take a loan?": ["schol-1", "schol-2", "loans-1"],
    "Who approves loans?": ["loans-3", "loans-1"],
    "How fast are password resets?": ["it-1", "it-2"],
    "Loan repayment terms?": ["loans-1", "schol-2", "it-1"],
}
def recall_at_k(k):
    return sum(bool(set(system_output[g["q"]][:k]) & g["relevant"]) for g in golden) / len(golden)
def mrr():
    total = 0
    for g in golden:
        for rank, doc in enumerate(system_output[g["q"]], start=1):
            if doc in g["relevant"]:
                total += 1 / rank
                break
    return total / len(golden)

for k in (1, 2, 3):
    print(f"Recall@{k}: {recall_at_k(k):.2f}")
print(f"MRR: {mrr():.2f}")
missed = [g["q"] for g in golden if not set(system_output[g["q"]]) & g["relevant"]]
print("Never retrieved:", missed)
```

The missed question is your next engineering task: maybe "repayment" needs a keyword retriever, or the chunk needs better metadata.

```quiz
- q: Recall@3 is 1.0 but answers are often wrong. Where should you look?
  options: ["Retrieval", "Generation: faithfulness and how the context is assembled into the prompt", "The embedding dimensions", "Nowhere"]
  answer: 1
- q: What does MRR reward?
  options: ["Retrieving many documents", "Placing the first relevant document near the top", "Short answers", "Low latency"]
  answer: 1
```

# Capstone: Graph-Expanded Retrieval {#capstone}

Implement the core of a GraphRAG retriever in plain Python.

````challenge
id: graphrag-expand
title: Vector hits plus graph expansion
difficulty: hard
prompt: |
  Implement `retrieve(query_vec, k)` that:
  1. scores every chunk in `CHUNKS` by **cosine similarity** between `query_vec` and the chunk's `vec`,
  2. keeps the top `k` chunk ids (highest score first; break ties by id A→Z),
  3. collects the entities those chunks mention (`MENTIONS`), then adds every entity **directly related** to them in `RELATED` (either direction),
  4. returns a dict `{"chunks": [ids in rank order], "entities": sorted list of unique entity names}`.
starter: |
  import math

  CHUNKS = {
      "c1": {"vec": [0.9, 0.1, 0.0], "text": "Tuition loans up to 1,500 USD."},
      "c2": {"vec": [0.6, 0.7, 0.1], "text": "Scholars cannot hold a loan."},
      "c3": {"vec": [0.0, 0.2, 0.9], "text": "Wi-Fi needs an account."},
  }
  MENTIONS = {"c1": ["Tuition loan"], "c2": ["Zuva Scholarship", "Tuition loan"], "c3": ["Campus Wi-Fi"]}
  RELATED = [("Bursar", "Tuition loan"), ("Zuva Scholarship", "STEM tracks"), ("IT Helpdesk", "Campus Wi-Fi")]

  def retrieve(query_vec, k):
      pass

  print(retrieve([0.7, 0.6, 0.0], 2))
tests: |
  r = retrieve([0.7, 0.6, 0.0], 2)
  assert r["chunks"] == ["c2", "c1"], r
  assert r["entities"] == ["Bursar", "STEM tracks", "Tuition loan", "Zuva Scholarship"], r
  r = retrieve([0.0, 0.1, 1.0], 1)
  assert r == {"chunks": ["c3"], "entities": ["Campus Wi-Fi", "IT Helpdesk"]}, r
  r = retrieve([1.0, 0.0, 0.0], 1)
  assert r["chunks"] == ["c1"] and r["entities"] == ["Bursar", "Tuition loan"], "Follow RELATED in both directions, one hop only"
````

Then try the **GraphRAG engineer** placement in the [Graph Lab](/lab/graphrag-retriever) to do the same thing in Cypher on a live graph.

```exam
- q: Which kind of question most benefits from community summaries?
  options: ["A specific fact lookup", "A global question about themes across the whole corpus", "A math problem", "A greeting"]
  answer: 1
- q: What does a VectorCypherRetriever add to plain vector search?
  options: ["Faster embeddings", "A Cypher traversal from each hit to collect connected context", "A cache", "Fine-tuning"]
  answer: 1
- q: Which step merges 'Bursar' and "the bursar's office" into one node?
  options: ["Chunking", "Entity resolution", "Embedding", "Reranking"]
  answer: 1
- q: What does corrective RAG do when retrieved context is weak?
  options: ["Answers anyway", "Rewrites the query or switches sources and retrieves again", "Stops the server", "Increases k to 1,000"]
  answer: 1
- q: Generated Cypher contains DETACH DELETE. What should the validator do?
  options: ["Run it", "Reject it: only read-only clauses are allowed", "Add LIMIT", "Ask the user"]
  answer: 1
- q: Which metric checks that every claim in the answer is supported by the retrieved context?
  options: ["Recall@k", "Faithfulness", "MRR", "Latency"]
  answer: 1
- q: Reciprocal rank fusion combines…
  options: ["Two embedding models", "Ranked lists from different retrievers using 1/(k+rank)", "Chunks and documents", "Prompts"]
  answer: 1
- q: Why use a lexical graph with NEXT relationships?
  options: ["To store users", "To fetch neighbouring chunks for context and cite sources in order", "To train the model", "To compress text"]
  answer: 1
```
