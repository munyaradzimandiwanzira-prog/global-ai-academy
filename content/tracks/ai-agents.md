---
id: ai-agents
title: AI Agents
short: AGENTS
category: ai
level: advanced
language: python
color: "#5B3FA0"
icon: "🦾"
order: 48
summary: Become an agentic AI engineer. Learn the agent loop, tool design, planning, memory, multi-agent systems, the Model Context Protocol, evaluation and safe deployment — with agents you can run.
tags: [ai agents, agentic ai, tools, mcp, multi-agent, planning, llm]
---

# What is an AI Agent? {#intro}

A chatbot **answers**. An **agent** **acts**: it decides what to do next, uses **tools** (search, databases, code, APIs), looks at the results and keeps going until the goal is reached.

```text
            ┌───────────────────────────────┐
 Goal ───▶  │  THINK: what should I do next? │
            │  ACT:   call a tool            │ ◀──┐
            │  OBSERVE: read the result      │ ───┘ repeat
            └──────────────┬────────────────┘
                           ▼
                     Final answer
```

## Agent or workflow?

| | Workflow | Agent |
|---|---|---|
| Steps | Fixed, written by you | Chosen by the model at run time |
| Predictability | High | Lower |
| Best for | Known processes (invoice → extract → save) | Open-ended tasks (research, debugging, triage) |

Start with the **simplest thing that works**: a single prompt, then a workflow, and only then an agent. Agents are powerful but cost more, are slower and are harder to test.

```quiz
- q: What makes an agent different from a chatbot?
  options: ["It is always faster", "It chooses and uses tools in a loop to reach a goal", "It never uses an LLM", "It has a nicer UI"]
  answer: 1
```

# The Agent Loop {#agent-loop}

Here is a complete agent loop. The "LLM" is simulated with simple rules so the whole thing runs in your browser — swap `fake_llm` for a real model call and it's a real agent.

```python run title="A runnable ReAct-style agent"
import json

# ---- Tools the agent can use -------------------------------------------
INVENTORY = {"solar lantern": 12, "cooking oil": 0, "roller meal": 40}
PRICES = {"solar lantern": 15.0, "cooking oil": 4.2, "roller meal": 8.5}

def check_stock(product): return {"product": product, "in_stock": INVENTORY.get(product, 0)}
def get_price(product): return {"product": product, "price_usd": PRICES.get(product)}
def calculate(expression): return {"result": eval(expression, {"__builtins__": {}})}

TOOLS = {"check_stock": check_stock, "get_price": get_price, "calculate": calculate}

# ---- A stand-in for the LLM's decisions --------------------------------
def fake_llm(goal, history):
    seen = [h["tool"] for h in history]
    if "check_stock" not in seen:
        return {"thought": "First check stock.", "tool": "check_stock", "args": {"product": "solar lantern"}}
    if "get_price" not in seen:
        return {"thought": "In stock. Now get the price.", "tool": "get_price", "args": {"product": "solar lantern"}}
    if "calculate" not in seen:
        price = history[-1]["result"]["price_usd"]
        return {"thought": "Multiply by quantity 5.", "tool": "calculate", "args": {"expression": f"{price} * 5"}}
    total = history[-1]["result"]["result"]
    return {"final": f"Yes — 5 solar lanterns are in stock and cost ${total:.2f} in total."}

# ---- The loop -----------------------------------------------------------
def run_agent(goal, max_steps=6):
    history = []
    for step in range(1, max_steps + 1):
        decision = fake_llm(goal, history)
        if "final" in decision:
            print(f"✅ {decision['final']}")
            return
        tool, args = decision["tool"], decision["args"]
        if tool not in TOOLS:
            raise ValueError(f"unknown tool {tool}")
        result = TOOLS[tool](**args)
        print(f"step {step}: 💭 {decision['thought']}  🔧 {tool}({json.dumps(args)}) → {result}")
        history.append({"tool": tool, "args": args, "result": result})
    print("⚠️ stopped: step limit reached")

run_agent("Can I buy 5 solar lanterns, and what will it cost?")
```

Notice the essentials of every agent:

1. A **goal**.
2. A set of **tools** with clear names and inputs.
3. A **loop**: decide → act → observe.
4. A **stopping condition** and a **step limit** (agents can loop forever).

> ⚠️ The `calculate` tool uses `eval` with builtins removed for brevity. In real systems never `eval` model output — use a safe maths parser.

# Designing Good Tools {#tools}

The model chooses tools by reading their **names, descriptions and parameter schemas**. Tool design is prompt engineering.

```json
{
  "name": "search_orders",
  "description": "Find a customer's orders by phone number. Use when the customer asks about delivery or order status. Returns at most 5 recent orders.",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {"type": "string", "description": "Local format, e.g. 0771234567"},
      "status": {"type": "string", "enum": ["pending", "delivered", "cancelled"]}
    },
    "required": ["phone"]
  }
}
```

## Tool design checklist

- **One clear job** per tool, with a descriptive name (`search_orders`, not `tool2`).
- Say **when to use it** in the description.
- Use **enums** and **formats** to constrain arguments.
- Return **concise, structured** results — not 10,000 rows.
- Return **helpful errors** the model can recover from ("phone must be 10 digits").
- Make dangerous tools **require confirmation** (see [Guardrails](/learn/guardrails)).

````challenge
id: agents-dispatch
title: Safe tool dispatcher
difficulty: medium
prompt: |
  Write `dispatch(call, tools)` where `call` is a dict like `{"tool": "get_price", "args": {"product": "oil"}}` and `tools` maps names to functions.

  - If the tool name isn't in `tools`, return `{"error": "unknown tool: <name>"}`.
  - If calling the function raises an exception, return `{"error": "<the exception message>"}`.
  - Otherwise return `{"result": <the function's return value>}`.
starter: |
  def dispatch(call, tools):
      pass

  tools = {"add": lambda a, b: a + b}
  print(dispatch({"tool": "add", "args": {"a": 2, "b": 3}}, tools))
tests: |
  def boom(x):
      raise ValueError("x must be positive")
  tools = {"add": lambda a, b: a + b, "boom": boom}
  assert dispatch({"tool": "add", "args": {"a": 2, "b": 3}}, tools) == {"result": 5}
  assert dispatch({"tool": "nope", "args": {}}, tools) == {"error": "unknown tool: nope"}
  assert dispatch({"tool": "boom", "args": {"x": -1}}, tools) == {"error": "x must be positive"}
  assert dispatch({"tool": "add", "args": {"a": 1}}, tools)["error"], "Missing arguments should return an error, not crash"
````

# Planning {#planning}

For bigger goals, agents **plan** before acting.

| Pattern | How it works | Good for |
|---|---|---|
| **ReAct** | Think → act → observe, one step at a time | Most tasks |
| **Plan-and-execute** | Write a full plan, then run each step | Long tasks with clear stages |
| **Reflection** | Review its own output and fix mistakes | Writing, coding |
| **Routing** | Classify the request, send it to a specialist | Support desks |

```python run title="Plan-and-execute with re-planning"
plan = ["find supplier price list", "compare prices for 50 bags of cement", "draft purchase order"]
done, notes = [], []

def execute(step):
    if step == "find supplier price list" and not notes:
        notes.append("Supplier A site down")
        return False
    return True

while plan:
    step = plan.pop(0)
    ok = execute(step)
    print(("✅" if ok else "❌"), step)
    if ok:
        done.append(step)
    else:
        print("   ↳ re-plan: try a different source first")
        plan = ["check supplier B price list", "compare prices for 50 bags of cement", "draft purchase order"]
print("Completed:", done)
```

# Memory {#memory}

| Memory type | What it holds | Example |
|---|---|---|
| **Short-term** (working) | The current task's messages and tool results | Steps so far |
| **Long-term (semantic)** | Facts about the user or domain, in a database or vector store | "Customer prefers deliveries after 4pm" |
| **Episodic** | Records of past tasks and outcomes | "Last time, supplier B was cheapest" |
| **Procedural** | Learned instructions or skills | Updated playbooks |

Keep the working context **small and relevant** — summarise long tool outputs, and retrieve long-term memories only when needed.

# Multi-Agent Systems {#multi-agent}

Some tasks split naturally across **specialist agents**:

```text
                ┌──────────────┐
  Customer ───▶ │  Supervisor  │  routes and combines
                └──┬───┬───┬───┘
        ┌──────────┘   │   └───────────┐
   ┌────▼────┐   ┌─────▼────┐   ┌──────▼─────┐
   │ Orders  │   │ Billing  │   │ Tech help  │
   │ agent   │   │ agent    │   │ agent      │
   └─────────┘   └──────────┘   └────────────┘
```

Common patterns: **supervisor/worker**, **sequential hand-offs** (researcher → writer → editor), and **debate/critique**.

```python run title="A supervisor routing to specialists"
def orders_agent(msg): return "Order 1042 is out for delivery and should arrive today."
def billing_agent(msg): return "Your last payment of $15 was received on 3 March."
def tech_agent(msg): return "Try restarting the app and updating to the latest version."

ROUTES = {
    "orders": (orders_agent, ["order", "delivery", "parcel"]),
    "billing": (billing_agent, ["payment", "bill", "refund", "charge"]),
    "tech": (tech_agent, ["app", "login", "error", "crash"]),
}

def supervisor(message):
    text = message.lower()
    scores = {name: sum(w in text for w in words) for name, (_, words) in ROUTES.items()}
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "human", "Let me connect you to a person."
    return best, ROUTES[best][0](message)

for m in ["Where is my parcel?", "I was charged twice", "The app crashes at login", "Can I visit your office?"]:
    print(supervisor(m), "←", m)
```

> Multi-agent systems multiply cost and failure points. Use them when specialisation clearly helps — not by default.

# The Model Context Protocol (MCP) {#mcp}

The **Model Context Protocol (MCP)** is an open standard for connecting AI applications to tools and data. Instead of writing custom integrations for every app, you build an **MCP server** once (for your database, files, CRM, GitHub…) and any MCP-compatible AI client can use it.

```text
 AI app (MCP client)  ◀──── MCP ────▶  MCP server
 e.g. an assistant                     exposes: tools, resources, prompts
                                       e.g. "query_inventory", "create_invoice"
```

A minimal server with the Python SDK:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("zim-traders")

@mcp.tool()
def check_stock(product: str) -> int:
    """Return the number of units of a product in stock."""
    return inventory.get(product.lower(), 0)

@mcp.resource("prices://today")
def todays_prices() -> str:
    """Today's price list as CSV."""
    return load_price_csv()

if __name__ == "__main__":
    mcp.run()
```

MCP servers deserve the same security care as any API: authentication, least privilege, input validation and audit logs.

# Evaluating Agents {#evaluation}

Agents can reach the right answer the wrong way (or the wrong answer confidently). Evaluate:

| What | How |
|---|---|
| **Task success** | Did it achieve the goal? (automated checks on final state) |
| **Trajectory** | Did it use sensible tools in a sensible order? |
| **Efficiency** | Steps, tokens, time and cost per task |
| **Safety** | Did it ever call a forbidden tool or skip approval? |
| **Robustness** | Does it recover from tool errors and bad data? |

Build a set of realistic tasks with known outcomes, run them on every change, and **trace** every step (LangSmith, Langfuse, OpenTelemetry).

# Shipping Agents Safely {#production}

- **Bound everything:** max steps, max tool calls, max tokens, max wall-clock time.
- **Least privilege** tools and credentials; separate read and write tools.
- **Human-in-the-loop** for irreversible or expensive actions.
- **Idempotent tools** (safe to retry) — use request IDs so a retried payment doesn't pay twice.
- **Observability:** trace every decision; alert on unusual behaviour.
- **Graceful failure:** when stuck, hand over to a human with a summary of what was tried.
- **Start narrow:** one well-defined job done reliably beats a "do anything" agent.

```quiz
- q: Why must an agent loop have a step limit?
  options: ["To save disk space", "Agents can loop forever and burn time and money", "Because tools are slow", "It is required by Python"]
  answer: 1
- q: What does MCP standardise?
  options: ["Image formats", "How AI apps connect to tools and data", "Payment processing", "CSS styles"]
  answer: 1
- q: Which tasks are best for a fixed workflow rather than an agent?
  options: ["Open-ended research", "Known, repeatable processes", "Debugging unknown errors", "Creative brainstorming"]
  answer: 1
```

```exam
- q: "What is the basic agent loop?"
  options: ["Decide \u2192 act (tool) \u2192 observe \u2192 repeat", "Train \u2192 test \u2192 deploy", "Read \u2192 write \u2192 delete", "Ask \u2192 wait \u2192 stop"]
  answer: 0
- q: "When is a fixed workflow better than an agent?"
  options: ["When the steps are known and repeatable", "Never", "When tasks are open-ended", "When there are no tools"]
  answer: 0
- q: "Why make tools idempotent?"
  options: ["So retries don't repeat side effects like payments", "To make them slower", "To hide errors", "To use more tokens"]
  answer: 0
- q: "In a supervisor pattern, what does the supervisor do?"
  options: ["Routes work to specialist agents and combines results", "Trains models", "Stores data", "Writes CSS"]
  answer: 0
- q: "Which is an agent safety control?"
  options: ["Human approval for irreversible actions", "Unlimited tool calls", "Sharing API keys", "Removing logs"]
  answer: 0
- q: "What does an MCP server expose?"
  options: ["Tools, resources and prompts for AI clients", "Only images", "A database engine", "A web browser"]
  answer: 0
```
