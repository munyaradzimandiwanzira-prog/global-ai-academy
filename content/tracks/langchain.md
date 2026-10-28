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
summary: Build LLM applications and agents with LangChain v1 and LangGraph. Models and prompts, structured output, retrievers and tools, agents with create_agent, middleware for guardrails, summarisation and human approval, memory with checkpointers and stores, Deep Agents for long tasks, MCP tools, and tracing with LangSmith.
tags: [langchain, langgraph, deep agents, create_agent, middleware, llm, agents, python, langsmith]
---

# Why a Framework? {#intro}

You *can* build LLM apps with raw API calls (and you should understand how — see [LLM APIs](/learn/llm-apis)). Frameworks like **LangChain** add reusable building blocks:

- One interface for **many model providers** (OpenAI, Anthropic, Google, Ollama, Hugging Face…).
- **Prompt templates**, **output parsers** and **retrievers**.
- Integrations with hundreds of vector stores, document loaders and tools.
- **`create_agent`**: a production-ready agent loop with **middleware** hooks for guardrails, summarisation, retries and human approval.
- **LangGraph**: the low-level runtime underneath, for custom stateful graphs with persistence, interrupts and streaming.
- **Deep Agents**: a harness for long, multi-step tasks with planning, a virtual filesystem and subagents.
- **LangSmith**: tracing, evaluation datasets and monitoring.

| Layer | Use it when |
|---|---|
| LangChain `create_agent` | You want a reliable tool-calling agent quickly, customised with middleware |
| LangGraph | You need a custom control flow: explicit steps, branches, loops, durable execution |
| Deep Agents | Tasks run for many steps and need planning, files and subagents (research, coding) |

> Frameworks change quickly. Learn the **concepts** — they transfer to LlamaIndex, Haystack, Semantic Kernel or your own code — and check current docs for exact imports.

```bash
pip install -U langchain langchain-openai langgraph
```

# Models and Prompt Templates {#templates}

```python
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate

llm = init_chat_model("openai:gpt-6.1-terra", temperature=0.2)   # or ChatOpenAI(model=...) from langchain_openai

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

# Agents with create_agent {#create-agent}

`create_agent` is LangChain's standard agent: give it a model, tools and a system prompt, and it runs the tool-calling loop for you (model → tools → model … → answer), built on LangGraph.

```python
from langchain.agents import create_agent
from langchain.tools import tool

@tool
def get_course(code: str) -> str:
    """Look up a Skuru course by its code, e.g. PY101."""
    return {"PY101": "Python Basics, 20 hours", "DB220": "Graph Databases, 25 hours"}.get(code, "unknown course")

agent = create_agent(
    model="openai:gpt-6.1-terra",
    tools=[get_course],
    system_prompt="You are a course advisor for Skuru Learning. Use tools for facts. Be brief.",
)
result = agent.invoke({"messages": [{"role": "user", "content": "How long is DB220?"}]})
print(result["messages"][-1].content)
```

## Structured responses

```python
from pydantic import BaseModel

class Recommendation(BaseModel):
    course_code: str
    reason: str

advisor = create_agent(model="openai:gpt-6.1-terra", tools=[get_course], response_format=Recommendation)
out = advisor.invoke({"messages": [{"role": "user", "content": "I want to learn graphs. What should I take?"}]})
print(out["structured_response"])        # a validated Recommendation
```

## Streaming progress

```python
for chunk in agent.stream({"messages": [{"role": "user", "content": "Compare PY101 and DB220"}]}, stream_mode="updates"):
    print(chunk)                          # each step: model output, tool calls, tool results
```

```quiz
- q: What does create_agent run for you?
  options: ["Only one model call", "The tool-calling loop: model, tools, model … until a final answer", "A vector database", "Model training"]
  answer: 1
- q: How do you get a validated object back from an agent?
  options: ["Parse the text yourself", "Pass response_format with a Pydantic model and read structured_response", "Use temperature 0", "It's impossible"]
  answer: 1
```

# Middleware: Guardrails, Summaries and Approval {#middleware}

**Middleware** wraps the agent loop with hooks that run **before and after model calls** and **around tool calls**. It's where production concerns live, without rewriting the agent.

| Prebuilt middleware | Purpose |
|---|---|
| `SummarizationMiddleware` | Summarise older messages when the context gets long (compaction) |
| `HumanInTheLoopMiddleware` | Pause before chosen tool calls so a person can approve, edit or reject |
| `PIIMiddleware` | Detect and redact or block personal data |
| `ModelCallLimitMiddleware`, `ToolCallLimitMiddleware` | Budgets that stop runaway loops |
| `ModelFallbackMiddleware` | Switch to a backup model when one fails |
| `ToolRetryMiddleware` | Retry failing tools with backoff |
| `LLMToolSelectorMiddleware` | Pick the relevant tools when there are many |
| `ContextEditingMiddleware` | Clear old tool outputs from the context |
| `TodoListMiddleware` | Give the agent a planning/todo tool |

```python
from langchain.agents import create_agent
from langchain.agents.middleware import (
    HumanInTheLoopMiddleware, SummarizationMiddleware, ModelCallLimitMiddleware,
)
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    model="openai:gpt-6.1-terra",
    tools=[get_course, enrol_learner],
    checkpointer=InMemorySaver(),          # required: approvals pause and resume the run
    middleware=[
        SummarizationMiddleware(model="openai:gpt-6-luna", trigger=("tokens", 6000), keep=("messages", 20)),
        HumanInTheLoopMiddleware(interrupt_on={
            "enrol_learner": {"allowed_decisions": ["approve", "edit", "reject"]},
            "get_course": False,
        }),
        ModelCallLimitMiddleware(run_limit=15),
    ],
)
```

You can write **custom middleware** too (for example, to log every tool call, block certain arguments, or inject user memories into the prompt). The **Agentic AI Engineering** track explains the engineering behind each of these concerns.

```python run title="The middleware idea in plain Python"
def with_middleware(call_model, middlewares):
    def run(state):
        for m in middlewares:
            state = m.get("before", lambda s: s)(state)
        out = call_model(state)
        for m in reversed(middlewares):
            out = m.get("after", lambda s, o: o)(state, out)
        return out
    return run

redact = {"before": lambda s: {**s, "input": s["input"].replace("0771234567", "[PHONE]")}}
limit = {"before": lambda s: s if s["calls"] < 3 else (_ for _ in ()).throw(RuntimeError("call limit reached"))}
audit = {"after": lambda s, o: (print("audit:", s["input"], "->", o) or o)}

model = lambda s: f"Answering: {s['input']}"
agent_call = with_middleware(model, [limit, redact, audit])
print(agent_call({"input": "Call me on 0771234567 about PY101", "calls": 0}))
```

```quiz
- q: Which middleware compacts long conversations?
  options: ["PIIMiddleware", "SummarizationMiddleware", "ToolRetryMiddleware", "ModelFallbackMiddleware"]
  answer: 1
- q: What must you configure for human-in-the-loop approvals to pause and resume?
  options: ["A vector store", "A checkpointer", "A bigger model", "Streaming"]
  answer: 1
```

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

In LangChain and LangGraph:

- **Short-term memory** = the thread's state, saved by a **checkpointer** after every step. Pass a `thread_id` to continue a conversation.
- **Long-term memory** = a **store** with namespaces (for example per user), readable and writable from tools and middleware, optionally with semantic search.

```python
from langgraph.checkpoint.memory import InMemorySaver      # use a database-backed saver in production
from langgraph.store.memory import InMemoryStore

agent = create_agent(model="openai:gpt-6.1-terra", tools=[get_course],
                     checkpointer=InMemorySaver(), store=InMemoryStore())
config = {"configurable": {"thread_id": "rudo-session-1"}}
agent.invoke({"messages": [{"role": "user", "content": "I'm Rudo and I like graphs."}]}, config)
agent.invoke({"messages": [{"role": "user", "content": "What's my name?"}]}, config)   # remembers within the thread
```

# LangGraph: Stateful Agents {#langgraph}

**LangGraph** models an application as a **graph**: nodes are steps (call the LLM, run a tool, ask a human), edges decide what happens next. Unlike a straight chain, graphs can **loop** and **branch** — what agents need.

```python
from typing import TypedDict
from langgraph.graph import StateGraph, START, END

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
graph.add_edge(START, "write")
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

LangGraph adds **checkpointing** (durable, resumable runs and time travel), **human-in-the-loop interrupts**, **streaming** of intermediate steps and **subgraphs** for multi-agent designs. Continue with the [Agentic AI Engineering](/learn/agentic-engineering) track.

# Deep Agents and MCP Tools {#deep-agents}

## Deep Agents

Simple agents struggle with long tasks: they lose track, overflow their context, and don't plan. **Deep Agents** is a harness (built on LangGraph) that adds what long-running agents need:

| Capability | How it helps |
|---|---|
| **Planning tool** (a todo list) | The agent writes and updates a plan, so it stays on track |
| **Virtual filesystem** (ls, read, write, edit) | Offload notes and large results out of the context window |
| **Subagents** | Delegate focused work to fresh contexts (context isolation) |
| **Detailed system prompt** | Tuned instructions for using the tools above |

```python
# pip install deepagents
from deepagents import create_deep_agent

research_agent = create_deep_agent(
    tools=[web_search],
    system_prompt="You are a careful researcher. Plan first, save notes to files, cite sources.",
)
result = research_agent.invoke({"messages": [{"role": "user", "content": "Compare graph databases for a fraud-detection startup in Zimbabwe."}]})
```

## Using MCP servers as tools

Any **MCP server** can supply tools to a LangChain agent: LangChain's MCP integration connects to servers (local stdio or remote HTTP), converts their tools into LangChain tools, and handles authentication. See the **MCP & Agent Protocols** track for how MCP works, and the LangChain MCP docs for the current connection API.

## Multi-agent patterns

LangChain documents several patterns: **subagents** (a supervisor calls specialist agents as tools), **handoffs** (control passes between agents), **skills** (load specialised instructions on demand), a **router**, and **custom workflows** in LangGraph. The **Agentic AI Engineering** track compares them and when each is worth its cost.

```quiz
- q: Which Deep Agents feature keeps large intermediate results out of the context window?
  options: ["The planning tool", "The virtual filesystem", "Temperature", "Streaming"]
  answer: 1
- q: What gives a subagent its main advantage?
  options: ["It's free", "A fresh, focused context for one job", "It needs no model", "It removes tools"]
  answer: 1
```

# Tracing and Evaluation {#tracing}

LLM apps are hard to debug without seeing each step. **Tracing** records every prompt, model call, tool call, latency and token count.

- **LangSmith** (from the LangChain team): set `LANGSMITH_TRACING=true` and an API key, and runs appear in a dashboard. It also stores **datasets**, runs **offline experiments** and attaches **online evaluators** to production traces (see the [AI Evaluations](/learn/ai-evaluations) track).
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
