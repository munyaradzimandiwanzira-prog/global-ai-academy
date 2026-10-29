---
id: llm-apis
title: LLM APIs
short: LLM APIs
category: ai
level: intermediate
language: python
color: "#412991"
icon: "🔌"
order: 43
summary: Call large language models from your own code. API keys, chat messages, streaming, structured outputs, function calling, embeddings, cost control, errors and production best practice.
tags: [openai, llm, api, python, embeddings, function calling, structured output]
---

# How LLM APIs Work {#intro}

Chat apps are built on **APIs** — web services your code calls over HTTPS. You send messages; the API returns the model's reply.

```sketch
title: "An API call, end to end"
caption: "Your server sends the conversation and settings with a secret key. The model returns generated text, and you pay for input and output tokens."
cellW: 190
nodes:
  - id: ui
    label: "Your app"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: srv
    label: "Your server"
    col: 1.5
    row: 0
    shape: round
    tone: gold
    sub: "holds the API key"
  - id: api
    label: "Model API"
    col: 3
    row: 0
    shape: db
    tone: grape
    sub: "messages · model · settings"
  - id: tok
    label: "Tokens in / out"
    col: 3
    row: 1.3
    shape: note
    tone: teal
    sub: "this is the bill"
edges:
  - from: ui
    to: srv
    arrow: both
  - from: srv
    to: api
    label: "HTTPS"
    arrow: both
  - from: api
    to: tok
    dashed: true
```


> **Go deeper.** The **[OpenAI API for Developers](/learn/openai-platform)** track covers the Responses API, conversation state, structured outputs, built-in tools, reasoning models, embeddings and the Batch API in detail; **[Inference Engineering](/learn/inference-engineering)** explains latency and cost.

Major providers include **OpenAI**, **Anthropic**, **Google**, **Mistral** and **Cohere**, and you can also run **open models** (Llama, Qwen, Gemma, Mistral) yourself with tools like **Ollama** or through Hugging Face. Their APIs look very similar, so what you learn here transfers.

```text
Your app ──HTTPS POST──▶ LLM API (model) ──▶ JSON response
          messages,                         reply text,
          model name,                       token usage
          settings
```

## You pay per token

APIs charge per **input** token and per **output** token (output usually costs more). A token is about ¾ of an English word. Always check current prices on the provider's pricing page and set spending limits in your account.

```python run title="Estimate a monthly bill"
def monthly_cost(requests_per_day, in_tokens, out_tokens, price_in_per_m, price_out_per_m):
    per_request = in_tokens / 1e6 * price_in_per_m + out_tokens / 1e6 * price_out_per_m
    return per_request * requests_per_day * 30

# Example prices (USD per million tokens) — check the provider for real numbers
print(f"${monthly_cost(2000, 800, 300, 0.40, 1.60):,.2f} per month")
```

# API Keys and Setup {#setup}

1. Create an account with a provider and generate an **API key**.
2. Store it in an **environment variable** — never in your code or Git.
3. Install the SDK.

```bash
pip install openai python-dotenv
```

```text
# .env  (add .env to .gitignore!)
OPENAI_API_KEY=sk-...
```

```python
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()            # reads .env into environment variables
client = OpenAI()        # picks up OPENAI_API_KEY automatically
```

> **Never call an LLM API directly from browser JavaScript or a mobile app with your key inside.** Anyone can extract it. Your frontend calls **your** backend; your backend holds the key and calls the LLM. That's exactly how Global AI Academy's own AI coach works.

```quiz
- q: Where should your API key live?
  options: ["In frontend JavaScript", "In an environment variable on your server", "In a public GitHub repo", "In the prompt"]
  answer: 1
```

# Your First API Call {#first-call}

```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="gpt-6.1-terra",                      # check the models page for current names
    instructions="You are a concise tutor for Zimbabwean high-school learners.",
    input="Explain photosynthesis in 3 sentences.",
    max_output_tokens=200,
)

print(response.output_text)
print(response.usage)   # input_tokens, output_tokens (incl. reasoning), cached tokens…
```

This uses OpenAI's **Responses API**, the recommended API for new projects. You'll still see the older **Chat Completions** style (`client.chat.completions.create(messages=[...])`) in many tutorials and in other providers' OpenAI-compatible APIs; the ideas are the same. Model names change often — check your provider's model list and pick one by **quality, speed and price** for your task. Small, fast models are fine for classification and extraction; larger ones for complex reasoning.

## Conversations are stateless

The API doesn't remember previous calls. To continue a conversation you send the **history** each time:

```sketch
title: "The model remembers nothing between calls"
caption: "Each request must carry the history you want the model to see. Long chats cost more because the whole history is sent again every turn."
cellW: 210
nodes:
  - id: c1
    label: "Call 1"
    col: 0
    row: 0
    shape: box
    tone: sky
    sub: "system · user 1"
  - id: c2
    label: "Call 2"
    col: 1.3
    row: 0
    shape: box
    tone: gold
    sub: "… + reply 1 · user 2"
  - id: c3
    label: "Call 3"
    col: 2.6
    row: 0
    shape: box
    tone: teal
    sub: "… + reply 2 · user 3"
  - id: m
    label: "Model"
    col: 1.3
    row: 1.3
    shape: circle
    tone: grape
    sub: "no memory"
edges:
  - from: c1
    to: m
    dashed: true
  - from: c2
    to: m
    dashed: true
  - from: c3
    to: m
    dashed: true
```


```python
history = []

def chat(user_text):
    history.append({"role": "user", "content": user_text})
    reply = client.responses.create(model="gpt-6.1-terra", instructions="You are a helpful tutor.", input=history)
    history.extend(reply.output)          # keep the model's output items (text, reasoning, tool calls)
    return reply.output_text

# Or let the platform keep the thread: previous_response_id=reply.id, or a Conversation object.
```

Long histories cost more and eventually exceed the context window — trim or summarise old messages.

```python run title="Keep history within a budget"
def trim_history(messages, max_chars=400):
    system, rest = messages[0], messages[1:]
    while rest and sum(len(m["content"]) for m in rest) > max_chars:
        rest.pop(0)          # drop the oldest turn first
    return [system] + rest

msgs = [{"role": "system", "content": "tutor"}] + [{"role": "user", "content": f"question {i} " * 10} for i in range(8)]
print(len(msgs), "→", len(trim_history(msgs)), "messages")
```

# Streaming {#streaming}

Long answers feel slow if you wait for the whole thing. **Streaming** sends tokens as they're generated, so users see text appear immediately.

```python
stream = client.responses.create(
    model="gpt-6.1-terra",
    input="Give me 5 tips for learning to code.",
    stream=True,
)
for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="", flush=True)
```

On the web, your backend relays the stream to the browser (Server-Sent Events or a streamed HTTP response). Professor Zuva, the tutor on every lesson here, works this way.

# Structured Outputs {#structured-outputs}

When your code needs data, ask for JSON that matches a **schema**. With Pydantic you define the shape once and get validated Python objects back:

```python
from pydantic import BaseModel
from openai import OpenAI

class OrderLine(BaseModel):
    item: str
    qty: int

class Order(BaseModel):
    customer: str
    phone: str | None
    lines: list[OrderLine]

client = OpenAI()
response = client.responses.parse(
    model="gpt-6.1-terra",
    instructions="Extract the order. Use null when unknown.",
    input="Rumbi here, 0772123456 — 2 roller meal and 1 cooking oil please",
    text_format=Order,
)
order = response.output_parsed
print(order.customer, [(l.item, l.qty) for l in order.lines])
```

SDK method names evolve — always check the current documentation for your provider. The **[OpenAI API for Developers](/learn/openai-platform)** track goes deeper into every part of this.

```python run title="Validating JSON with Python dataclasses"
import json
from dataclasses import dataclass

@dataclass
class OrderLine:
    item: str
    qty: int

    def __post_init__(self):
        if not self.item or self.qty <= 0:
            raise ValueError(f"invalid line: {self}")

raw = '{"customer": "Rumbi", "lines": [{"item": "roller meal", "qty": 2}, {"item": "cooking oil", "qty": 1}]}'
data = json.loads(raw)
lines = [OrderLine(**l) for l in data["lines"]]
print(data["customer"], lines)
```

# Function Calling (Tools) {#function-calling}

**Function calling** lets the model ask your code to run a function — check stock, look up a price, book a slot. The model never runs code itself: it returns a request, **your code** runs the function, and you send the result back.

```sketch
title: "The tool-calling loop"
caption: "The model cannot run code. It asks for a tool with arguments; your code runs it and sends the result back; the model then writes the answer."
cellW: 180
cellH: 110
nodes:
  - id: u
    label: "User question"
    col: 0
    row: 0
    shape: note
    tone: sky
    sub: "ZiG price of maize?"
  - id: m
    label: "Model"
    col: 1.6
    row: 0
    shape: circle
    tone: grape
  - id: call
    label: "Tool call"
    col: 3.2
    row: 0
    shape: doc
    tone: gold
    sub: "get_rate(\"ZiG\")"
  - id: run
    label: "Your code runs it"
    col: 3.2
    row: 1.4
    shape: round
    tone: teal
    sub: "returns 26.8"
  - id: ans
    label: "Final answer"
    col: 1.6
    row: 1.4
    shape: pill
    tone: sky
edges:
  - from: u
    to: m
  - from: m
    to: call
  - from: call
    to: run
  - from: run
    to: m
    label: "result"
  - from: m
    to: ans
    label: "done"
```


```python
tools = [{
    "type": "function",
    "name": "get_price",
    "description": "Get the current price of a product in USD",
    "parameters": {
        "type": "object",
        "properties": {"product": {"type": "string"}},
        "required": ["product"],
        "additionalProperties": False,
    },
    "strict": True,
}]

items = [{"role": "user", "content": "How much is cooking oil?"}]
first = client.responses.create(model="gpt-6.1-terra", input=items, tools=tools)
items += first.output                                    # keep the model's function_call item
for call in (o for o in first.output if o.type == "function_call"):
    args = json.loads(call.arguments)                    # {"product": "cooking oil"}
    result = get_price(**args)                           # YOUR function
    items.append({"type": "function_call_output", "call_id": call.call_id, "output": json.dumps(result)})

final = client.responses.create(model="gpt-6.1-terra", input=items, tools=tools)
print(final.output_text)
```

Here's the full loop simulated so you can run it:

```python run title="Tool-calling loop (simulated model)"
import json

PRICES = {"cooking oil": 4.20, "roller meal": 8.50}
def get_price(product):
    return {"product": product, "price_usd": PRICES.get(product.lower())}

def fake_llm(messages):
    last = messages[-1]
    if last["role"] == "user":                 # model decides to call a tool
        return {"tool_call": {"name": "get_price", "arguments": json.dumps({"product": "cooking oil"})}}
    result = json.loads(last["content"])       # model answers using the tool result
    return {"content": f"{result['product'].title()} costs ${result['price_usd']:.2f}."}

messages = [{"role": "user", "content": "How much is cooking oil?"}]
reply = fake_llm(messages)
if "tool_call" in reply:
    call = reply["tool_call"]
    print("Model asked to run:", call["name"], call["arguments"])
    output = {"get_price": get_price}[call["name"]](**json.loads(call["arguments"]))
    messages.append({"role": "tool", "content": json.dumps(output)})
    reply = fake_llm(messages)
print("Assistant:", reply["content"])
```

> **Validate tool arguments** before running anything. Treat them like user input — the model can be wrong or manipulated.

# Embeddings {#embeddings}

An **embedding** turns text into a list of numbers (a vector) that captures its meaning. Texts with similar meaning have vectors that point in similar directions.

```python
emb = client.embeddings.create(model="text-embedding-3-small", input=["school fees", "tuition payment"])
vectors = [d.embedding for d in emb.data]   # each is a list of ~1,500 numbers
```

Similarity is measured with **cosine similarity**:

```python run title="Cosine similarity"
import numpy as np

def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# Tiny made-up 4-dimensional "embeddings": [money, education, weather, farming]
vec = {
    "school fees":      np.array([0.8, 0.9, 0.0, 0.1]),
    "tuition payment":  np.array([0.9, 0.8, 0.0, 0.0]),
    "rainfall forecast":np.array([0.0, 0.0, 0.9, 0.6]),
    "maize planting":   np.array([0.1, 0.0, 0.5, 0.9]),
}
query = vec["school fees"]
for text, v in sorted(vec.items(), key=lambda kv: -cosine(query, kv[1])):
    print(f"{cosine(query, v):.2f}  {text}")
```

Embeddings power **semantic search**, **recommendations**, **clustering** and **RAG** — see the [RAG](/learn/rag) track.

# Errors, Retries and Limits {#errors}

Production code must expect failures.

```sketch
title: "Retry with exponential backoff"
caption: "Retry only errors that may pass (429 rate limit, 5xx, timeouts). Wait longer each time, add randomness, and give up after a few tries."
cellW: 185
cellH: 110
nodes:
  - id: call
    label: "Call API"
    col: 0
    row: 0.6
    shape: round
    tone: sky
  - id: ok
    label: "Status?"
    col: 1.4
    row: 0.6
    shape: diamond
    tone: gold
  - id: use
    label: "Use reply"
    col: 2.9
    row: 0
    shape: pill
    tone: teal
    sub: "200"
  - id: fail
    label: "Show error"
    col: 2.9
    row: 1.2
    shape: pill
    tone: rose
    sub: "400 · 401 · gave up"
  - id: wait
    label: "Wait 1s, 2s, 4s…"
    col: 1.4
    row: 2.0
    shape: round
    tone: grape
    sub: "+ jitter"
edges:
  - from: call
    to: ok
  - from: ok
    to: use
    label: "ok"
  - from: ok
    to: fail
    label: "no retry"
  - from: ok
    to: wait
    label: "429 · 5xx"
  - from: wait
    to: call
    label: "retry"
```


| Error | Meaning | What to do |
|---|---|---|
| `401` | Bad or missing key | Check your environment variable |
| `429` | Rate limit or quota exceeded | Wait and retry with backoff; check billing |
| `400` | Bad request (e.g. too many tokens) | Fix the input; trim context |
| `5xx` | Provider problem | Retry with backoff |
| Timeout | Slow response | Set a timeout; retry once |

```python run title="Exponential backoff with jitter"
import random, time

class RateLimitError(Exception): pass

attempts = {"n": 0}
def flaky_api():
    attempts["n"] += 1
    if attempts["n"] < 3:
        raise RateLimitError("429 Too Many Requests")
    return "OK: model reply"

def call_with_retries(fn, max_tries=5, base=0.2):
    for i in range(max_tries):
        try:
            return fn()
        except RateLimitError as e:
            wait = base * (2 ** i) + random.uniform(0, base)
            print(f"attempt {i + 1} failed ({e}); retrying in {wait:.2f}s")
            time.sleep(wait)
    raise RuntimeError("gave up")

print(call_with_retries(flaky_api))
```

# Production Best Practice {#production}

1. **Key on the server only**, in a secret manager or environment variable.
2. **Rate-limit your users** so one person can't drain your budget (this site limits AI requests per day per plan).
3. **Set max tokens** and **timeouts** on every call.
4. **Cache** answers to repeated questions.
5. **Log** prompts, token counts, latency and errors — but **redact personal data**.
6. **Evaluate** before and after every prompt or model change.
7. **Choose the smallest model** that passes your evaluation — it's cheaper and faster.
8. **Have a fallback**: a second model/provider, or a graceful "AI is busy" message.
9. **Tell users** when they're talking to AI.

````challenge
id: llm-cost-estimator
title: Token cost estimator
difficulty: medium
prompt: |
  Write `cost_usd(input_tokens, output_tokens, price_in, price_out)` where prices are **USD per 1 million tokens**. Return the cost rounded to 6 decimal places.

  Then write `cheapest(models, input_tokens, output_tokens)` where `models` is a dict of `name → (price_in, price_out)`. Return the **name** of the cheapest model for that workload.
starter: |
  def cost_usd(input_tokens, output_tokens, price_in, price_out):
      pass

  def cheapest(models, input_tokens, output_tokens):
      pass

  models = {"small": (0.15, 0.60), "medium": (0.40, 1.60), "large": (2.00, 8.00)}
  print(cost_usd(1000, 500, 0.40, 1.60))
  print(cheapest(models, 1000, 500))
tests: |
  assert cost_usd(1000, 500, 0.40, 1.60) == 0.0012, f"got {cost_usd(1000, 500, 0.40, 1.60)}"
  assert cost_usd(0, 0, 1, 1) == 0
  m = {"small": (0.15, 0.60), "medium": (0.40, 1.60), "large": (2.00, 8.00)}
  assert cheapest(m, 1000, 500) == "small"
  assert cheapest({"a": (1, 10), "b": (5, 1)}, 100, 10000) == "b", "Output-heavy workloads favour cheap output tokens"
````

```quiz
- q: Why must you never put your LLM API key in frontend JavaScript?
  options: ["It makes the page slow", "Anyone can extract and abuse it", "Browsers block JSON", "It breaks streaming"]
  answer: 1
- q: What does HTTP 429 usually mean?
  options: ["Bad key", "Rate limit exceeded", "Server crashed", "Success"]
  answer: 1
- q: In function calling, who actually runs the function?
  options: ["The model", "Your code", "The browser", "The provider's server"]
  answer: 1
- q: What does an embedding represent?
  options: ["The cost of a request", "The meaning of text as a vector of numbers", "A password", "An image file"]
  answer: 1
```

```exam
- q: "Why must you send the conversation history with each chat request?"
  options: ["The API is stateless", "To make it faster", "For billing", "To encrypt it"]
  answer: 0
- q: "What does streaming improve?"
  options: ["Accuracy", "Perceived speed \u2014 text appears as it's generated", "Cost", "Security"]
  answer: 1
- q: "Which is a good first response to HTTP 429?"
  options: ["Retry with exponential backoff", "Delete your key", "Increase max tokens", "Switch to HTTP"]
  answer: 0
- q: "Structured outputs are most useful when\u2026"
  options: ["Your code needs predictable data", "You want poetry", "You need images", "The model is offline"]
  answer: 0
- q: "Which similarity measure is common for embeddings?"
  options: ["Cosine similarity", "String length", "Alphabetical order", "File size"]
  answer: 0
```
