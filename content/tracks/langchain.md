---
id: langchain
title: LangChain & LangGraph
short: LANGCHAIN
category: ai
level: intermediate
language: python
color: "#1C3C3C"
icon: "🦜"
order: 45
summary: Build LLM applications with LangChain — models, prompt templates, output parsers, LCEL chains, retrievers, tools and memory — then stateful agent workflows with LangGraph.
tags: [langchain, langgraph, llm, chains, agents, python]
---

# Why a Framework? {#intro}

You *can* build LLM apps with raw API calls (and you should understand how — see [LLM APIs](/learn/llm-apis)). Frameworks like **LangChain** add reusable building blocks:

- One interface for **many model providers** (OpenAI, Anthropic, Google, Ollama, Hugging Face…).
- **Prompt templates**, **output parsers** and **retrievers**.
- Integrations with hundreds of vector stores, document loaders and tools.
- **LangGraph** for multi-step, stateful agents with loops and human approval.
- **LangSmith** for tracing and evaluation.

> Frameworks change quickly. Learn the **concepts** — they transfer to LlamaIndex, Haystack, Semantic Kernel or your own code — and check current docs for exact imports.

```bash
pip install langchain langchain-openai langchain-community langgraph
```

# Models and Prompt Templates {#templates}

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.2)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful tutor for {level} learners in Zimbabwe. Answer in under {words} words."),
    ("user", "{question}"),
])

messages = prompt.invoke({"level": "Form 3", "words": 80, "question": "What is a variable in programming?"})
print(llm.invoke(messages).content)
```

Templates keep prompts **reusable and testable**: the wording lives in one place, and values are filled in at run time.

```python run title="How a prompt template works"
class PromptTemplate:
    def __init__(self, template):
        self.template = template
    def format(self, **values):
        missing = [k for k in self._variables() if k not in values]
        if missing:
            raise KeyError(f"missing values: {missing}")
        return self.template.format(**values)
    def _variables(self):
        import string
        return [f for _, f, _, _ in string.Formatter().parse(self.template) if f]

tutor = PromptTemplate("You are a tutor for {level} learners. Explain {topic} in {words} words.")
print(tutor.format(level="Form 2", topic="photosynthesis", words=60))
try:
    tutor.format(level="Form 2")
except KeyError as e:
    print("Error:", e)
```

# Chains with LCEL {#lcel}

The **LangChain Expression Language** (LCEL) connects components with the `|` operator: the output of one becomes the input of the next.

```python
from langchain_core.output_parsers import StrOutputParser

chain = prompt | llm | StrOutputParser()
print(chain.invoke({"level": "Form 1", "words": 50, "question": "What is the internet?"}))

# Every chain gets these for free:
chain.batch([...])          # many inputs in parallel
for token in chain.stream({...}): print(token, end="")
```

Here's the idea behind `|`, simplified so you can run it:

```python run title="The pipe idea"
class Step:
    def __init__(self, fn): self.fn = fn
    def __or__(self, other): return Step(lambda x: other.fn(self.fn(x)))
    def invoke(self, x): return self.fn(x)

make_prompt = Step(lambda d: f"Translate to Shona: {d['text']}")
fake_llm = Step(lambda p: {"content": "Mhoro, wakadini?" if "Hello" in p else "?"})
parse = Step(lambda msg: msg["content"].strip())

chain = make_prompt | fake_llm | parse
print(chain.invoke({"text": "Hello, how are you?"}))
```

# Structured Output and Parsers {#parsers}

```python
from pydantic import BaseModel, Field

class Lead(BaseModel):
    name: str
    business: str | None = Field(description="Type of business, if mentioned")
    budget_usd: float | None
    interested_in: list[str]

extractor = llm.with_structured_output(Lead)
lead = extractor.invoke("Hi, I'm Chiedza. I run a poultry farm in Marondera and want an app for orders, budget around $800.")
print(lead.model_dump())
```

`with_structured_output` uses the provider's native structured-output or tool-calling features, so you get validated Python objects instead of free text.

# Retrievers and RAG Chains {#retrievers}

```python
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.runnables import RunnablePassthrough

docs = PyPDFLoader("school_handbook.pdf").load()
chunks = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120).split_documents(docs)
store = Chroma.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))
retriever = store.as_retriever(search_kwargs={"k": 4})

rag_prompt = ChatPromptTemplate.from_template(
    "Answer only from the context. Cite page numbers.\n\nContext:\n{context}\n\nQuestion: {question}"
)
format_docs = lambda ds: "\n\n".join(f"(p.{d.metadata.get('page')}) {d.page_content}" for d in ds)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt | llm | StrOutputParser()
)
print(rag_chain.invoke("What is the policy on mobile phones?"))
```

See the [RAG](/learn/rag) track for chunking, hybrid search and evaluation in depth.

# Tools {#tools}

Turn any Python function into a tool the model can call:

```python
from langchain_core.tools import tool

@tool
def zig_to_usd(amount_zig: float) -> float:
    """Convert an amount in ZiG to US dollars using today's rate."""
    return round(amount_zig / get_rate("ZiG"), 2)

@tool
def check_stock(product: str) -> int:
    """Return how many units of a product are in stock."""
    return inventory.get(product.lower(), 0)

llm_with_tools = llm.bind_tools([zig_to_usd, check_stock])
msg = llm_with_tools.invoke("Do we have cooking oil in stock?")
print(msg.tool_calls)   # [{'name': 'check_stock', 'args': {'product': 'cooking oil'}, ...}]
```

The **docstring and type hints** become the tool's description and schema — write them carefully; the model reads them to decide when to call the tool.

# Memory and Conversation State {#memory}

Chat apps must remember earlier turns. Options:

| Approach | When |
|---|---|
| Send the **full history** | Short conversations |
| **Window**: last N messages | Most chatbots |
| **Summary** of older turns + recent messages | Long conversations |
| **Long-term memory** in a database (facts about the user) | Personal assistants |

```python run title="Window + summary memory"
class ConversationMemory:
    def __init__(self, window=4):
        self.window, self.messages, self.summary = window, [], ""
    def add(self, role, text):
        self.messages.append((role, text))
        if len(self.messages) > self.window:
            old = self.messages.pop(0)
            self.summary += f" {old[0]} said '{old[1][:30]}'."   # a real app asks the LLM to summarise
    def context(self):
        return {"summary": self.summary.strip(), "recent": self.messages}

m = ConversationMemory(window=2)
for i, text in enumerate(["I live in Gweru", "I study Python", "I like football", "What should I build?"]):
    m.add("user", text)
print(m.context())
```

In LangGraph, a **checkpointer** saves state per conversation thread automatically.

# LangGraph: Stateful Agents {#langgraph}

**LangGraph** models an application as a **graph**: nodes are steps (call the LLM, run a tool, ask a human), edges decide what happens next. Unlike a straight chain, graphs can **loop** and **branch** — what agents need.

```python
from typing import TypedDict
from langgraph.graph import StateGraph, END

class State(TypedDict):
    question: str
    draft: str
    approved: bool

def write_draft(state: State):
    return {"draft": llm.invoke(f"Draft a reply to: {state['question']}").content}

def review(state: State):
    ok = "refund" not in state["draft"].lower()    # e.g. refunds need a human
    return {"approved": ok}

graph = StateGraph(State)
graph.add_node("write", write_draft)
graph.add_node("review", review)
graph.set_entry_point("write")
graph.add_edge("write", "review")
graph.add_conditional_edges("review", lambda s: END if s["approved"] else "write")
app = graph.compile()

print(app.invoke({"question": "Where is my order 1042?", "draft": "", "approved": False}))
```

```python run title="A graph runner in plain Python"
def run_graph(nodes, edges, state, start, max_steps=10):
    current = start
    for step in range(max_steps):
        state.update(nodes[current](state))
        print(f"step {step + 1}: ran '{current}' → {state}")
        nxt = edges[current](state)
        if nxt == "END":
            return state
        current = nxt
    raise RuntimeError("too many steps — possible infinite loop")

nodes = {
    "draft": lambda s: {"draft": f"Reply v{s.get('attempt', 0) + 1}", "attempt": s.get("attempt", 0) + 1},
    "review": lambda s: {"approved": s["attempt"] >= 2},
}
edges = {"draft": lambda s: "review", "review": lambda s: "END" if s["approved"] else "draft"}
run_graph(nodes, edges, {}, "draft")
```

LangGraph adds **checkpointing**, **human-in-the-loop interrupts**, **streaming** of intermediate steps and **multi-agent** patterns. Continue with the [AI Agents](/learn/ai-agents) track.

# Tracing and Evaluation {#tracing}

LLM apps are hard to debug without seeing each step. **Tracing** records every prompt, model call, tool call, latency and token count.

- **LangSmith** (from the LangChain team): set `LANGSMITH_TRACING=true` and an API key, and runs appear in a dashboard.
- Open-source alternatives: **Langfuse**, **Arize Phoenix**, **OpenTelemetry**-based tools.

Use traces to find slow steps, expensive prompts and the exact input that caused a bad answer — then add it to your evaluation set.

````challenge
id: langchain-pipe
title: Build a tiny chain
difficulty: medium
prompt: |
  Write a function `chain(*steps)` that returns a **new function**. When called with an input, it passes the input through each step in order and returns the final result.

  ```python
  upper = lambda s: s.upper()
  exclaim = lambda s: s + "!"
  shout = chain(upper, exclaim)
  shout("mhoro")   # "MHORO!"
  ```
  `chain()` with no steps should return the input unchanged.
starter: |
  def chain(*steps):
      pass
tests: |
  shout = chain(lambda s: s.upper(), lambda s: s + "!")
  assert shout("mhoro") == "MHORO!", f"got {shout('mhoro')!r}"
  assert chain()(5) == 5, "An empty chain returns its input"
  assert chain(lambda x: x + 1, lambda x: x * 10)(2) == 30, "Steps run in order"
````

```quiz
- q: What does the `|` operator do in LCEL?
  options: ["Logical OR", "Pipes one component's output into the next", "Comments code", "Runs in parallel only"]
  answer: 1
- q: Why use LangGraph instead of a simple chain for agents?
  options: ["It is shorter", "It supports loops, branches, state and human approval", "It needs no model", "It only works offline"]
  answer: 1
```

```exam
- q: "What does a prompt template provide?"
  options: ["Reusable prompts with variables filled at run time", "A trained model", "A vector database", "A GPU"]
  answer: 0
- q: "What does StrOutputParser do?"
  options: ["Turns a model message into plain text", "Embeds text", "Splits documents", "Calls tools"]
  answer: 0
- q: "Which component fetches relevant documents for RAG?"
  options: ["Retriever", "Tokenizer", "Parser", "Template"]
  answer: 0
- q: "How does LangChain turn a Python function into a tool?"
  options: ["The @tool decorator, using its docstring and type hints", "By renaming it", "By deleting it", "It can't"]
  answer: 0
- q: "Which LangGraph feature lets a person approve a step?"
  options: ["Human-in-the-loop interrupts", "Temperature", "Embeddings", "Chunking"]
  answer: 0
- q: "Why use tracing (e.g. LangSmith or Langfuse)?"
  options: ["To see every step, prompt, latency and token count", "To speed up the model", "To store passwords", "To draw charts"]
  answer: 0
- q: "Which memory approach suits long conversations?"
  options: ["Summarise older turns and keep recent messages", "Send every message forever", "Never remember anything", "Store only the system prompt"]
  answer: 0
- q: "What do LangGraph checkpointers do?"
  options: ["Save state per conversation thread", "Train models", "Compress images", "Validate JSON"]
  answer: 0
```
