---
id: openai-platform
title: OpenAI API for Developers
short: OPENAI
category: ai
level: intermediate
language: python
color: "#10392F"
icon: "🔷"
order: 43.5
premium: true
preview: 3
summary: A developer's tour of the OpenAI platform as it works today. The Responses API, conversation state, structured outputs, function calling and built-in tools, reasoning models, embeddings, streaming, the Batch API, production practices, and the Agents SDK, with runnable exercises on real response shapes.
tags: [openai, responses api, structured outputs, function calling, reasoning models, embeddings, batch api, agents sdk, prompt caching]
---

# The Platform Map {#intro}

The OpenAI platform is a set of HTTP APIs and SDKs. Most applications need only a few pieces:

| Piece | Use it for |
|---|---|
| **Responses API** (`/v1/responses`) | The core API: text, images in, tools, reasoning, structured outputs, multi-turn state |
| **Conversations API** | Durable conversation objects that store a thread's items across sessions and devices |
| **Built-in tools** | Web search, file search over your documents, remote MCP servers, tool search, shell, computer use, image generation |
| **Embeddings** | Vectors for semantic search, clustering and RAG |
| **Batch API** | Large non-urgent jobs at about half price, finished within 24 hours |
| **Realtime / audio** | Low-latency voice agents and speech |
| **Agents SDK** | A Python/TypeScript framework for agents with tools, handoffs, guardrails and tracing |
| **Evals** | Datasets and graders to compare models and prompts |

The older **Chat Completions** API still works and many tutorials use it, but new features land in the Responses API first, and OpenAI recommends it for new projects, especially with reasoning models.

## Choosing a model

Models come in families that trade capability against speed and price. At the time of writing (October 2026) the main GPT-6 generation looked like this; always check the models and pricing pages, because names and prices change.

| Model | Positioning | Input / output per 1M tokens |
|---|---|---|
| `gpt-6-astra` | Most capable, complex reasoning and agentic work | $10 / $50 |
| `gpt-6.1-sol` | Strong general model, lower cost | $2 / $10 |
| `gpt-6.1-terra` | Fast, inexpensive everyday model | $1 / $5 |
| `gpt-6-luna` | Smallest and cheapest: classification, extraction, routing | $0.10 / $0.50 |

**Pick by evaluation, not by name**: start with a mid-sized model, build a small eval set (see the **AI Evaluations** track), then try smaller and larger models and keep the cheapest one that passes.

## Accounts, projects and keys

- Create an **API key** per project, never share it, and keep it on the **server** (environment variable or secret manager). A key in a browser or mobile app will be stolen.
- Use **projects** to separate apps, budgets and permissions; set **usage limits** and alerts.
- **Rate limits** are per model, measured in requests and tokens per minute; your usage tier raises them over time.

```bash
pip install openai
export OPENAI_API_KEY="sk-...your key..."      # PowerShell: $Env:OPENAI_API_KEY = "sk-..."
```

```quiz
- q: Which API does OpenAI recommend for new projects, especially with reasoning models?
  options: ["Completions", "Chat Completions", "Responses API", "Assistants v1"]
  answer: 2
- q: Where must your API key live?
  options: ["In the mobile app", "In frontend JavaScript", "On your server, in an environment variable or secret manager", "In a public repo with a comment"]
  answer: 2
- q: How should you choose between models?
  options: ["Always the largest", "Always the cheapest", "Run your own evals and pick the cheapest model that passes", "By the newest name"]
  answer: 2
```

# Responses API Fundamentals {#responses}


```sketch
title: "Request and response"
caption: "You send a model name, input and optional tools. The response holds an output list (messages, tool calls, reasoning) plus token usage."
cellW: 190
cellH: 100
nodes:
  - id: req
    label: "POST /v1/responses"
    col: 0
    row: 0.6
    shape: doc
    tone: sky
    sub: "model · input · tools"
  - id: m
    label: "Model"
    col: 1.7
    row: 0.6
    shape: circle
    tone: grape
  - id: out
    label: "output[]"
    col: 3.3
    row: 0
    shape: doc
    tone: teal
    sub: "message · function_call"
  - id: use
    label: "usage"
    col: 3.3
    row: 1.2
    shape: note
    tone: gold
    sub: "input · output tokens"
edges:
  - from: req
    to: m
  - from: m
    to: out
  - from: m
    to: use
```

## The smallest call

```python
from openai import OpenAI

client = OpenAI()                                   # reads OPENAI_API_KEY
response = client.responses.create(
    model="gpt-6.1-terra",
    instructions="You are a concise tutor for Zimbabwean high-school students.",
    input="Explain photosynthesis in two sentences.",
    max_output_tokens=300,
)
print(response.output_text)
print(response.usage)
```

## Request fields you'll use most

| Field | Purpose |
|---|---|
| `model` | Which model |
| `instructions` | System-level guidance (role, rules, tone) |
| `input` | A string, or a **list of items**: messages (`role` user/assistant/developer), images, files, tool outputs |
| `max_output_tokens` | Cap on generated tokens (including reasoning tokens) |
| `tools`, `tool_choice` | Functions and built-in tools the model may call |
| `text.format` | Structured output schema |
| `reasoning` | Effort and settings for reasoning models |
| `store` | Whether OpenAI stores the response (default true, 30-day retention) |
| `previous_response_id` / `conversation` | Multi-turn state |
| `stream` | Stream events as they're generated |
| `metadata`, `prompt_cache_key` | Your tags; grouping for prompt caching |

## The response object

A response has an `id`, a `status`, an **`output` list of items**, and `usage`. Items can be messages, reasoning items, function calls, and tool results. `response.output_text` is an SDK convenience that joins all text output.

```python run title="Read a response the way the SDK does"
# A response in the shape the Responses API returns (trimmed)
response = {
    "id": "resp_abc123",
    "status": "completed",
    "model": "gpt-6.1-terra",
    "output": [
        {"type": "reasoning", "id": "rs_1", "summary": []},
        {"type": "message", "role": "assistant", "content": [
            {"type": "output_text", "text": "Plants use sunlight, water and carbon dioxide to make glucose. "},
            {"type": "output_text", "text": "Oxygen is released as a by-product."},
        ]},
    ],
    "usage": {
        "input_tokens": 1830, "input_tokens_details": {"cached_tokens": 1536},
        "output_tokens": 412, "output_tokens_details": {"reasoning_tokens": 380},
        "total_tokens": 2242,
    },
}

def output_text(resp):
    return "".join(part["text"] for item in resp["output"] if item["type"] == "message"
                   for part in item["content"] if part["type"] == "output_text")

u = response["usage"]
print("text:", output_text(response))
print(f"input {u['input_tokens']} (cached {u['input_tokens_details']['cached_tokens']}), "
      f"output {u['output_tokens']} (reasoning {u['output_tokens_details']['reasoning_tokens']}, "
      f"visible {u['output_tokens'] - u['output_tokens_details']['reasoning_tokens']})")
price_in, price_cached, price_out = 1.00, 0.10, 5.00            # $ per 1M tokens (illustrative)
cost = ((u["input_tokens"] - u["input_tokens_details"]["cached_tokens"]) * price_in
        + u["input_tokens_details"]["cached_tokens"] * price_cached + u["output_tokens"] * price_out) / 1e6
print(f"cost ≈ ${cost:.5f}")
```

Notice how much of the output budget the hidden **reasoning tokens** used: they're billed as output even though you never see them.

## Images and files as input

```python
response = client.responses.create(
    model="gpt-6.1-terra",
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "What crop disease does this leaf show? Answer in one line."},
            {"type": "input_image", "image_url": "https://example.com/maize-leaf.jpg"},
        ],
    }],
)
```

```exercise
prompt: Cap how many tokens the model may generate.
code: |
  client.responses.create(model="gpt-6.1-terra", input="Summarise this.", ___=300)
answers: [max_output_tokens]
```

```quiz
- q: What is response.output_text?
  options: ["A required request field", "An SDK convenience joining all text from output message items", "The reasoning summary", "The prompt"]
  answer: 1
- q: Where do you see how many input tokens were served from the prompt cache?
  options: ["usage.output_tokens", "usage.input_tokens_details.cached_tokens", "response.status", "response.id"]
  answer: 1
- q: Are hidden reasoning tokens billed?
  options: ["No", "Yes, as output tokens", "Yes, as input tokens", "Only on weekends"]
  answer: 1
```

# Conversation State {#state}

Each request is independent unless you carry context forward. Three ways:

```sketch
title: "Three ways to keep a conversation"
caption: "Resend the history yourself, point at the previous response with previous_response_id, or keep a durable Conversation object on the platform."
cellW: 210
nodes:
  - id: m
    label: "Manual history"
    col: 0
    row: 0
    shape: round
    tone: sky
    sub: "you send every turn"
  - id: p
    label: "previous_response_id"
    col: 1.5
    row: 0
    shape: round
    tone: gold
    sub: "platform links turns"
  - id: c
    label: "Conversation"
    col: 3
    row: 0
    shape: round
    tone: teal
    sub: "durable thread"
edges: []
```


| Approach | How | Trade-offs |
|---|---|---|
| **Manual history** | Keep a list; append the model's **output items** (not just the text) and the next user message; send the whole list | Full control; works with `store=False`; you manage size |
| **`previous_response_id`** | Pass the previous response's id; OpenAI supplies the history | Simple; earlier tokens are still billed as input each turn; needs stored responses |
| **Conversations API** | Create a conversation once, pass `conversation=<id>` on each request | Durable across sessions and devices; items persist without the 30-day limit |

```python
# Manual history (works with store=False / zero data retention)
history = [{"role": "user", "content": "Give me a Python tip."}]
r1 = client.responses.create(model="gpt-6.1-terra", input=history, store=False)
history += r1.output                                    # keep ALL output items, incl. reasoning
history.append({"role": "user", "content": "Another one, about lists."})
r2 = client.responses.create(model="gpt-6.1-terra", input=history, store=False)

# Chaining with previous_response_id
r1 = client.responses.create(model="gpt-6.1-terra", input="Give me a Python tip.")
r2 = client.responses.create(model="gpt-6.1-terra", previous_response_id=r1.id, input="Another one, about lists.")

# Durable conversations
conv = client.conversations.create()
client.responses.create(model="gpt-6.1-terra", conversation=conv.id, input="Hi, I'm Rudo.")
client.responses.create(model="gpt-6.1-terra", conversation=conv.id, input="What's my name?")
```

```python run title="Why long conversations get expensive, and what trimming saves"
turn_user, turn_assistant = 60, 220          # tokens per turn
SYSTEM = 900

def input_tokens_per_turn(n_turns, keep_last=None):
    totals = []
    for t in range(1, n_turns + 1):
        history_turns = t - 1 if keep_last is None else min(t - 1, keep_last)
        totals.append(SYSTEM + history_turns * (turn_user + turn_assistant) + turn_user)
    return totals

full = input_tokens_per_turn(30)
trimmed = input_tokens_per_turn(30, keep_last=6)
print(f"turn 30 input: full history {full[-1]:,} tokens, last-6 window {trimmed[-1]:,} tokens")
print(f"whole conversation: full {sum(full):,} vs trimmed {sum(trimmed):,} input tokens "
      f"({100 - 100 * sum(trimmed) // sum(full)}% fewer)")
```

Every approach re-sends (or re-bills) earlier turns as input. For long chats, **summarise or trim** older turns and lean on **prompt caching** for the stable prefix.

```quiz
- q: You must not let OpenAI store data (store=False). Which state method do you use?
  options: ["previous_response_id", "Manual history: resend output items yourself", "Conversations API", "None is possible"]
  answer: 1
- q: When managing history manually with a reasoning model, what should you append?
  options: ["Only the output text", "All output items, including reasoning and tool-call items", "Nothing", "Only the user message"]
  answer: 1
- q: Does previous_response_id make earlier turns free?
  options: ["Yes", "No, earlier input tokens are still billed", "Only cached ones", "Only for small models"]
  answer: 1
```

# Structured Outputs {#structured}

When code consumes the output, ask for **JSON that matches a schema**. With structured outputs in **strict** mode the model's output is constrained to your schema, so parsing doesn't fail.

```python
from pydantic import BaseModel, Field
from typing import Literal
from openai import OpenAI

class Ticket(BaseModel):
    category: Literal["billing", "technical", "account", "other"]
    urgency: int = Field(ge=1, le=5)
    summary: str
    needs_human: bool

client = OpenAI()
response = client.responses.parse(
    model="gpt-6.1-terra",
    instructions="Classify the support message.",
    input="I paid for Plus twice this month and I need the money back for school fees!",
    text_format=Ticket,
)
ticket = response.output_parsed          # a validated Ticket instance
print(ticket.category, ticket.urgency, ticket.needs_human)
```

Without the Pydantic helper, pass a JSON Schema directly:

```python
response = client.responses.create(
    model="gpt-6.1-terra",
    input="...",
    text={"format": {
        "type": "json_schema",
        "name": "ticket",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "enum": ["billing", "technical", "account", "other"]},
                "urgency": {"type": "integer"},
                "summary": {"type": "string"},
                "needs_human": {"type": "boolean"},
            },
            "required": ["category", "urgency", "summary", "needs_human"],
            "additionalProperties": False,
        },
    }},
)
```

## Strict-mode rules

- Every property must be listed in `required`; express "optional" as a **nullable** type (`["string", "null"]`).
- `additionalProperties: false` on every object.
- Some schema keywords aren't supported in strict mode; keep schemas simple and validate business rules (ranges, cross-field checks) in your own code.
- The model can **refuse** (for safety); handle the refusal instead of assuming a parsed object.

```python run title="Validate model output with Pydantic, and handle failures"
from typing import Literal
from pydantic import BaseModel, Field, ValidationError

class Ticket(BaseModel):
    category: Literal["billing", "technical", "account", "other"]
    urgency: int = Field(ge=1, le=5)
    summary: str
    needs_human: bool

outputs = [
    '{"category": "billing", "urgency": 5, "summary": "Charged twice for Plus", "needs_human": true}',
    '{"category": "payments", "urgency": 9, "summary": "x", "needs_human": "yes"}',
    'Sure! Here is the JSON you asked for...',
]
for raw in outputs:
    try:
        t = Ticket.model_validate_json(raw)
        print("OK   ", t.model_dump())
    except ValidationError as e:
        print("ERROR", [f"{'.'.join(map(str, err['loc'])) or 'json'}: {err['msg']}" for err in e.errors()])
```

The **Pydantic in Depth** track covers models, validators and serialization fully.

```quiz
- q: In strict structured outputs, how do you express an optional field?
  options: ["Leave it out of required", "Keep it in required and make its type nullable", "Use a comment", "You can't"]
  answer: 1
- q: What does responses.parse(text_format=MyModel) give you?
  options: ["Raw text", "output_parsed: a validated instance of your Pydantic model", "A JSON string to parse yourself", "A file"]
  answer: 1
- q: The schema guarantees valid JSON. What must your code still check?
  options: ["Nothing", "Business rules (ranges, cross-field logic) and refusals", "The model name", "Token count"]
  answer: 1
```

# Function Calling and Built-in Tools {#tools}

**Function calling** lets the model ask your code to run a function (the full loop is in the **Agentic AI Engineering** track). **Built-in tools** run on OpenAI's side, so you don't execute them yourself.

```sketch
title: "Built-in tools vs your functions"
caption: "Built-in tools such as web search and file search run on the platform. Your own functions come back to your code to run, and you send the result."
cellW: 190
nodes:
  - id: m
    label: "Model"
    col: 1.5
    row: 0
    shape: circle
    tone: grape
  - id: ws
    label: "web_search"
    col: 0
    row: 1.3
    shape: round
    tone: teal
    sub: "runs on platform"
  - id: fs
    label: "file_search"
    col: 1.5
    row: 1.3
    shape: round
    tone: teal
    sub: "runs on platform"
  - id: fn
    label: "your function"
    col: 3
    row: 1.3
    shape: round
    tone: gold
    sub: "runs in your code"
edges:
  - from: m
    to: ws
  - from: m
    to: fs
  - from: m
    to: fn
  - from: fn
    to: m
    label: "output"
    dashed: true
    bend: -35
```


| Built-in tool | Type | Use |
|---|---|---|
| **Web search** | `web_search` | Current information with cited sources |
| **File search** | `file_search` | Search your uploaded documents in a vector store (managed RAG) |
| **Remote MCP** | `mcp` | Call tools on any MCP server by URL |
| **Tool search** | `tool_search` | Load relevant tool definitions on demand when you have many |
| **Shell / computer use / image generation / skills** | various | Run commands in hosted containers, operate a computer UI, create images, reuse skill bundles |

```python
# Web search with citations
response = client.responses.create(
    model="gpt-6.1-terra",
    tools=[{"type": "web_search"}],
    input="What changed in the latest Zimbabwe budget for education? Cite sources.",
)
print(response.output_text)

# File search over your own documents (managed RAG)
vs = client.vector_stores.create(name="student-policies")
client.vector_stores.files.upload_and_poll(vector_store_id=vs.id, file=open("loans_policy.pdf", "rb"))
response = client.responses.create(
    model="gpt-6.1-terra",
    tools=[{"type": "file_search", "vector_store_ids": [vs.id]}],
    input="Can a scholarship holder also take a tuition loan?",
)

# Your own function next to built-in tools
tools = [
    {"type": "web_search"},
    {"type": "function", "name": "get_course", "description": "Look up a Skuru course by code.",
     "parameters": {"type": "object", "properties": {"code": {"type": "string"}}, "required": ["code"], "additionalProperties": False},
     "strict": True},
]
```

## Rules for tool loops with reasoning models

- Append **all** output items (reasoning, function calls) plus your `function_call_output` items to the next request, or use `previous_response_id`. Dropping reasoning items hurts quality.
- Use `tool_choice` to force (`"required"`) or forbid (`"none"`) tool use for a turn.
- Validate arguments before executing; require approval for side effects.

```quiz
- q: Which built-in tool gives you managed RAG over uploaded documents?
  options: ["web_search", "file_search", "mcp", "tool_search"]
  answer: 1
- q: Who executes a built-in web_search call?
  options: ["Your server", "OpenAI's platform", "The user's browser", "Nobody"]
  answer: 1
- q: You have 300 possible tools. Which built-in helps keep them out of the context until needed?
  options: ["file_search", "tool_search", "web_search", "image generation"]
  answer: 1
```

# Reasoning Models {#reasoning}

Reasoning models think (with hidden **reasoning tokens**) before answering. They're stronger at maths, coding, planning and multi-step tool use, at the cost of latency and tokens.

| Setting | Values | Guidance |
|---|---|---|
| `reasoning.effort` | e.g. `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` (support varies by model) | Start at `medium`; compare with `high` on your evals before going higher |
| Reasoning **mode** | `standard` (default) or `pro` on supporting models | Pro does more work: higher quality, latency and cost |
| `max_output_tokens` | Cap including reasoning | Reserve generously (OpenAI suggests ~25,000 when starting) or responses can come back `incomplete` |
| `reasoning.context` | `auto`, `current_turn`, `all_turns` | Whether earlier turns' reasoning is carried forward |

```python
response = client.responses.create(
    model="gpt-6-astra",
    reasoning={"effort": "medium"},
    input="Plan a 6-week Neo4j study schedule for a learner with 5 hours a week.",
    max_output_tokens=25000,
)
if response.status == "incomplete":
    print("Ran out of tokens:", response.incomplete_details)     # raise the cap or lower effort
else:
    print(response.output_text)
    print("reasoning tokens:", response.usage.output_tokens_details.reasoning_tokens)
```

```python run title="Handle incomplete responses and pick an effort level"
def call(effort, max_output_tokens, task_difficulty):
    """A simulator: harder tasks and higher effort use more reasoning tokens."""
    reasoning = {"low": 800, "medium": 3000, "high": 9000}[effort] * task_difficulty
    visible = 600
    if reasoning + visible > max_output_tokens:
        return {"status": "incomplete", "reason": "max_output_tokens", "text": ""}
    quality = {"low": 0.70, "medium": 0.86, "high": 0.90}[effort]
    return {"status": "completed", "text": "plan...", "reasoning": reasoning, "quality": quality}

for effort in ("low", "medium", "high"):
    r = call(effort, max_output_tokens=12000, task_difficulty=2)
    if r["status"] == "incomplete":
        print(f"{effort:6}: INCOMPLETE ({r['reason']}) -> raise max_output_tokens or lower effort")
    else:
        print(f"{effort:6}: quality {r['quality']:.2f}, reasoning tokens {r['reasoning']:,}")
```

Effort is a **knob you evaluate**: if `medium` scores 0.86 and `high` 0.90 at three times the tokens, decide whether 4 points is worth it for this feature.

```quiz
- q: A reasoning model returns status incomplete with no text. Most likely cause?
  options: ["The key is invalid", "max_output_tokens was too small for reasoning plus answer", "The model is down", "Wrong temperature"]
  answer: 1
- q: Where do you see how many tokens a model spent reasoning?
  options: ["usage.output_tokens_details.reasoning_tokens", "response.reasoning.text", "usage.input_tokens", "Headers"]
  answer: 0
- q: What's a sensible way to choose reasoning effort?
  options: ["Always max", "Start at medium and compare levels on your evals, weighing quality against cost and latency", "Always none", "Random"]
  answer: 1
```

# Embeddings {#embeddings}

Embeddings turn text into vectors so that **similar meanings are close together**: the basis of semantic search, RAG, deduplication, clustering and recommendations.

| Model | Default dimensions | Notes |
|---|---|---|
| `text-embedding-3-small` | 1536 | Cheap, good default |
| `text-embedding-3-large` | 3072 | Higher quality, larger vectors |

Both accept a **`dimensions`** parameter to return shorter vectors (smaller indexes, faster search) with modest quality loss.

```python
emb = client.embeddings.create(
    model="text-embedding-3-small",
    input=["How do I reset my password?", "I forgot my password"],
    dimensions=512,
)
vectors = [d.embedding for d in emb.data]
```

```python run title="Cosine similarity, and why truncated vectors must be re-normalised"
import math

def norm(v): return math.sqrt(sum(x * x for x in v))
def normalise(v): return [x / norm(v) for x in v]
def cosine(a, b): return sum(x * y for x, y in zip(a, b)) / (norm(a) * norm(b))
def dot(a, b): return sum(x * y for x, y in zip(a, b))

a = normalise([0.62, 0.11, 0.48, 0.30, 0.05, 0.52])     # full-length unit vectors (as the API returns)
b = normalise([0.58, 0.20, 0.41, 0.35, 0.40, 0.42])
print(f"full vectors: cosine {cosine(a, b):.4f}, dot {dot(a, b):.4f}  (equal: unit length)")

a4, b4 = a[:4], b[:4]                                     # truncated by hand
print(f"truncated, not re-normalised: norm(a4)={norm(a4):.3f}, dot {dot(a4, b4):.4f}  <- wrong as a similarity")
a4n, b4n = normalise(a4), normalise(b4)
print(f"truncated and re-normalised: dot {dot(a4n, b4n):.4f} = cosine {cosine(a4, b4):.4f}")
```

OpenAI embeddings come back **normalised to length 1**, so a plain dot product equals cosine similarity, which vector databases exploit. If you shorten vectors yourself, **re-normalise** them; better, use the `dimensions` parameter.

```quiz
- q: Why is the dot product of two OpenAI embeddings equal to their cosine similarity?
  options: ["Coincidence", "The vectors are normalised to unit length", "They are integers", "They are sorted"]
  answer: 1
- q: You cut 1536-d vectors to 512-d yourself. What must you do?
  options: ["Nothing", "Re-normalise each vector", "Square them", "Add zeros"]
  answer: 1
- q: You need a cheap, solid default for RAG embeddings. Which model?
  options: ["text-embedding-3-small", "gpt-6-astra", "text-embedding-ada-002", "A reasoning model"]
  answer: 0
```

# Streaming, Batch and Production Practice {#production}

## Streaming

```python
stream = client.responses.create(model="gpt-6.1-terra", input="Write a haiku about Great Zimbabwe.", stream=True)
for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="", flush=True)
    elif event.type == "response.completed":
        print("\nusage:", event.response.usage)
```

Stream user-facing text; for tool calls and JSON you usually wait for completion.

## The Batch API: half price for patient jobs

For evaluations, back-fills, classification of thousands of records, or nightly summaries: write requests to a JSONL file, upload it, and collect results within 24 hours at about **50% off**.

```sketch
title: "Batch jobs"
caption: "Upload a file of requests, wait up to 24 hours, and download a file of results at about half the price. Good for evals, tagging and embeddings."
cellW: 200
nodes:
  - id: f
    label: "requests.jsonl"
    col: 0
    row: 0
    shape: doc
    tone: sky
    sub: "1 request per line"
  - id: b
    label: "Batch job"
    col: 1.5
    row: 0
    shape: db
    tone: gold
    sub: "≤ 24 h"
  - id: o
    label: "results.jsonl"
    col: 3
    row: 0
    shape: doc
    tone: teal
    sub: "match by custom_id"
edges:
  - from: f
    to: b
    label: "upload"
  - from: b
    to: o
    label: "download"
```


```python run title="Build a Batch API input file"
import json

reviews = {"r-101": "Lessons are clear but the app is slow on my phone.",
           "r-102": "Professor Zuva helped me pass my SQL exam!",
           "r-103": "Payment failed twice with EcoCash."}

lines = []
for rid, text in reviews.items():
    lines.append(json.dumps({
        "custom_id": rid,                                   # unique: results come back in any order
        "method": "POST",
        "url": "/v1/responses",
        "body": {"model": "gpt-6-luna", "max_output_tokens": 50,
                 "instructions": "Label the review: praise, bug, payment_issue or other. Reply with the label only.",
                 "input": text},
    }))
jsonl = "\n".join(lines)
print(jsonl.split("\n")[0][:160] + " …")
print(f"{len(lines)} requests, {len(jsonl.encode())} bytes")
```

```python
batch_file = client.files.create(file=open("reviews.jsonl", "rb"), purpose="batch")
batch = client.batches.create(input_file_id=batch_file.id, endpoint="/v1/responses", completion_window="24h")
# later…
batch = client.batches.retrieve(batch.id)
if batch.status == "completed":
    for line in client.files.content(batch.output_file_id).text.splitlines():
        result = json.loads(line)
        print(result["custom_id"], result["response"]["body"]["output"][0])
```

## Production checklist

| Area | Practice |
|---|---|
| **Keys & access** | Server-side keys per project; rotate; least-privilege project roles |
| **Reliability** | Timeouts; SDK retries with backoff; handle 429/5xx; idempotent writes |
| **Cost** | `max_output_tokens`; prompt caching (static prefix first, `prompt_cache_key`); smallest passing model; Batch for offline work |
| **Quality** | Eval suite run on every prompt or model change; pin model versions |
| **Safety** | Validate tool arguments; moderation for user content where appropriate; guardrails; human approval for risky actions |
| **Data** | Choose `store` and retention deliberately; don't send secrets or unnecessary personal data |
| **Observability** | Log request ids, model, latency, tokens (incl. cached and reasoning) and cost per feature |

```quiz
- q: Results of a batch arrive in a different order from your input. How do you match them?
  options: ["By line number", "By custom_id", "By timestamp", "You can't"]
  answer: 1
- q: Which job suits the Batch API?
  options: ["A live chat reply", "Classifying 200,000 reviews overnight", "A voice call", "Streaming a story"]
  answer: 1
- q: Which practice reduces cost without changing the model?
  options: ["Putting the date at the start of the prompt", "Static content first for prompt caching, and capping output tokens", "Removing timeouts", "Higher reasoning effort"]
  answer: 1
```

# The Agents SDK and Evals {#agents-sdk}

## Agents SDK

The **OpenAI Agents SDK** packages the agent loop: you declare agents, tools and handoffs; the `Runner` runs the loop, calls tools, follows handoffs, applies guardrails and records a trace.

```python
# pip install openai-agents
from agents import Agent, Runner, function_tool, input_guardrail, GuardrailFunctionOutput

@function_tool
def get_course(code: str) -> str:
    """Look up a Skuru course by code."""
    return {"PY101": "Python Basics, 20h", "DB220": "Graph Databases, 25h"}.get(code, "unknown course")

@input_guardrail
async def no_payment_details(ctx, agent, user_input):
    flagged = any(w in str(user_input).lower() for w in ("card number", "cvv", "pin"))
    return GuardrailFunctionOutput(output_info={"flagged": flagged}, tripwire_triggered=flagged)

advisor = Agent(
    name="Course advisor",
    instructions="Recommend Skuru courses. Use get_course for facts. Keep answers short.",
    model="gpt-6.1-terra",
    tools=[get_course],
    input_guardrails=[no_payment_details],
)
result = Runner.run_sync(advisor, "Is DB220 a long course?")
print(result.final_output)
```

| Concept | What it is |
|---|---|
| **Agent** | Instructions + model + tools (+ handoffs, guardrails, output type) |
| **Tools** | Python functions (`@function_tool`), built-in tools, other agents as tools, MCP servers |
| **Handoffs** | Transfer control to a specialist agent |
| **Guardrails** | Input/output checks that can stop a run |
| **Sessions** | Automatic conversation memory between runs |
| **Tracing** | Built-in traces of every model call, tool call and handoff |

## Evals on the platform

The platform's **Evals** let you upload a dataset, define graders (string checks, model-based graders, Python), and run models or prompts against it to compare results. The concepts are exactly those of the **AI Evaluations** track; the platform saves you building the harness.

# Capstone: A Response Parser for Your App {#capstone}

````challenge
id: openai-parse-response
title: Parse any Responses API result
difficulty: medium
prompt: |
  Write `summarise(resp)` that takes a Responses-API result as a **dict** and returns a dict with:

  - `"status"`: the response status,
  - `"text"`: all `output_text` parts from `message` items joined with no separator,
  - `"calls"`: a list of `(name, arguments_dict)` for every `function_call` item (parse the JSON `arguments` string),
  - `"cached"`: `usage.input_tokens_details.cached_tokens` (0 if missing),
  - `"reasoning"`: `usage.output_tokens_details.reasoning_tokens` (0 if missing).
starter: |
  import json

  def summarise(resp):
      pass
tests: |
  r1 = {"status": "completed", "output": [
          {"type": "reasoning", "id": "rs"},
          {"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "Hello "}, {"type": "output_text", "text": "Rudo"}]}],
        "usage": {"input_tokens": 10, "input_tokens_details": {"cached_tokens": 4}, "output_tokens": 30, "output_tokens_details": {"reasoning_tokens": 20}}}
  assert summarise(r1) == {"status": "completed", "text": "Hello Rudo", "calls": [], "cached": 4, "reasoning": 20}, summarise(r1)
  r2 = {"status": "completed", "output": [
          {"type": "function_call", "call_id": "c1", "name": "get_course", "arguments": "{\"code\": \"PY101\"}"},
          {"type": "function_call", "call_id": "c2", "name": "get_balance", "arguments": "{\"account\": \"ML-1\"}"}],
        "usage": {"input_tokens": 50, "output_tokens": 12}}
  assert summarise(r2) == {"status": "completed", "text": "", "calls": [("get_course", {"code": "PY101"}), ("get_balance", {"account": "ML-1"})], "cached": 0, "reasoning": 0}, summarise(r2)
  r3 = {"status": "incomplete", "output": [], "usage": {}}
  assert summarise(r3)["status"] == "incomplete" and summarise(r3)["text"] == ""
````

```exam
- q: Which field gives system-level guidance in a Responses API call?
  options: ["input", "instructions", "metadata", "store"]
  answer: 1
- q: What does store=False change?
  options: ["Nothing", "OpenAI does not store the response, so manage history yourself", "It disables tools", "It caches prompts"]
  answer: 1
- q: Which method returns a validated Pydantic object?
  options: ["responses.create", "responses.parse with text_format", "embeddings.create", "batches.create"]
  answer: 1
- q: A built-in tool that searches your uploaded PDFs is…
  options: ["web_search", "file_search", "mcp", "shell"]
  answer: 1
- q: Reasoning tokens are…
  options: ["Free", "Visible in output_text", "Hidden but billed as output and they use context", "Billed as input"]
  answer: 2
- q: Which embedding model returns 3072 dimensions by default?
  options: ["text-embedding-3-small", "text-embedding-3-large", "gpt-6-luna", "ada-001"]
  answer: 1
- q: The Batch API typically costs…
  options: ["Double", "About 50% less, with results within 24 hours", "The same", "Nothing"]
  answer: 1
- q: In the Agents SDK, what moves the conversation to a specialist agent?
  options: ["A guardrail", "A handoff", "A session", "A trace"]
  answer: 1
```
