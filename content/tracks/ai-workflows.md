---
id: ai-workflows
title: AI Workflows & Automation
short: WORKFLOWS
category: agentic
level: intermediate
language: python
color: "#EA4B71"
icon: "⚙️"
order: 49
summary: Automate real business processes with AI — triggers, webhooks, APIs, n8n-style workflows, document extraction, WhatsApp intake, human review, error handling and measuring ROI.
tags: [automation, workflows, n8n, webhooks, apis, ai, business]
---

# What is AI Workflow Automation? {#intro}

Many businesses lose hours every day to repetitive work: copying orders from WhatsApp into a spreadsheet, typing invoice details into accounting software, answering the same questions, chasing payments.

A **workflow** connects apps so work flows automatically:

```text
TRIGGER          →  STEPS                                 →  OUTPUT
New WhatsApp msg    1. AI extracts customer, items, address   Order in the system
                    2. Look up prices in the database          Confirmation message
                    3. If total > $500 → manager approval      Manager notified
```

**AI** adds the steps that used to need a person: reading messy text, classifying, summarising, drafting replies.

## Tools

| Tool | Notes |
|---|---|
| **n8n** | Open source, self-hostable, visual, strong AI nodes |
| **Make**, **Zapier** | Hosted, easy, many integrations |
| **Code** (Python/Node + a scheduler/queue) | Most control and lowest cost at scale |
| **Cloudflare Workers / serverless functions** | Webhooks and small automations |

The ideas are the same in every tool; this track teaches them with Python you can run.

```quiz
- q: What starts a workflow?
  options: ["A trigger", "A database", "A model", "A chart"]
  answer: 0
```

# Triggers and Webhooks {#triggers}

| Trigger | Example |
|---|---|
| **Schedule** | Every weekday at 07:00, email yesterday's sales summary |
| **Webhook** | A payment provider calls your URL when a payment succeeds |
| **New item** | New row in a sheet, new email, new form submission |
| **Manual** | A button in an internal tool |

A **webhook** is an HTTP request another service sends to your URL when something happens. Always **verify** it really came from that service (signature or shared secret) — the [Payments flow on this site](/pricing) verifies Paynow's SHA-512 hash before activating a plan.

```python run title="Verifying a webhook signature"
import hmac, hashlib, json

SECRET = b"shared-secret-from-provider"

def sign(body: bytes) -> str:
    return hmac.new(SECRET, body, hashlib.sha256).hexdigest()

def verify(body: bytes, signature: str) -> bool:
    return hmac.compare_digest(sign(body), signature)

body = json.dumps({"event": "payment.succeeded", "amount": 15}).encode()
good_sig = sign(body)
print("genuine:", verify(body, good_sig))
tampered = body.replace(b"15", b"1500")
print("tampered:", verify(tampered, good_sig))
```

# Working with APIs {#apis}

Most workflow steps call an **API**: read a spreadsheet, create an invoice, send a message.

```python
import requests

resp = requests.post(
    "https://api.example-crm.com/v1/contacts",
    headers={"Authorization": f"Bearer {CRM_TOKEN}"},
    json={"name": "Chiedza Mhlanga", "phone": "0772123456", "source": "WhatsApp"},
    timeout=10,
)
resp.raise_for_status()
contact = resp.json()
```

Key habits: **timeouts** on every request, **check status codes**, **retry** temporary failures (429, 5xx) with backoff, and keep tokens in environment variables.

# AI Extraction Steps {#extraction}

The most valuable AI step in business workflows: turning messy text into **structured data**.

```python run title="Extracting an order from a chat message"
import json, re

message = "Hi it's Rumbi from Glen View 3. Pls send 2 bags roller meal, 1 cooking oil 2L and 3 sugar. My no 0772 123 456"

def fake_llm_extract(text):
    # A real step calls an LLM with a JSON schema; this stand-in mimics its output.
    return json.dumps({
        "customer": "Rumbi", "phone": "0772123456", "address": "Glen View 3",
        "items": [{"item": "roller meal", "qty": 2}, {"item": "cooking oil 2L", "qty": 1}, {"item": "sugar", "qty": 3}],
    })

PRICES = {"roller meal": 8.50, "cooking oil 2L": 4.20, "sugar": 2.80}

order = json.loads(fake_llm_extract(message))
assert re.fullmatch(r"07\d{8}", order["phone"]), "invalid phone"
unknown = [l["item"] for l in order["items"] if l["item"] not in PRICES]
total = sum(PRICES[l["item"]] * l["qty"] for l in order["items"] if l["item"] in PRICES)
print(f"Order for {order['customer']} ({order['address']}): ${total:.2f}")
print("Needs review:" if unknown else "All items recognised", unknown or "")
```

Always **validate** the AI's output against your real data (price list, customer list) before acting on it.

# Branching, Loops and Human Review {#branching}

Real processes have decisions:

```text
                     ┌─ total ≤ $500 ─▶ auto-confirm ─▶ send confirmation
 extract order ─▶ IF ┤
                     └─ total > $500 ─▶ manager approval ─┬─ approved ─▶ confirm
                                                          └─ rejected ─▶ notify customer
```

**Human-in-the-loop** steps are essential when:

- the AI's confidence is low,
- money, legal commitments or customer relationships are at stake,
- something unusual happens (unknown item, new customer, large amount).

```python run title="Routing by rules and confidence"
def route(order):
    if order["confidence"] < 0.8:
        return "human review (low confidence)"
    if order["total"] > 500:
        return "manager approval (large order)"
    if order["new_customer"]:
        return "auto-confirm + welcome message"
    return "auto-confirm"

orders = [
    {"id": 1, "total": 42.0, "confidence": 0.95, "new_customer": False},
    {"id": 2, "total": 760.0, "confidence": 0.93, "new_customer": False},
    {"id": 3, "total": 18.5, "confidence": 0.55, "new_customer": True},
    {"id": 4, "total": 99.0, "confidence": 0.91, "new_customer": True},
]
for o in orders:
    print(o["id"], "→", route(o))
```

# Error Handling and Reliability {#reliability}

Workflows run unattended, so plan for failure:

| Practice | Why |
|---|---|
| **Retries with backoff** | Networks and APIs fail temporarily |
| **Idempotency keys** | A retried "create invoice" mustn't create two invoices |
| **Dead-letter queue** | Failed items are parked for review, not lost |
| **Alerts** | Someone hears about failures (email, WhatsApp, Slack) |
| **Logs** | You can see what happened to every item |
| **Timeouts** | One slow API can't block everything |

```python run title="Idempotent processing"
processed = set()
invoices = []

def create_invoice(order_id, amount):
    key = f"invoice:{order_id}"          # idempotency key
    if key in processed:
        return "skipped (already created)"
    invoices.append((order_id, amount))
    processed.add(key)
    return "created"

for attempt in range(3):                 # simulate retries of the same event
    print("attempt", attempt + 1, create_invoice(1042, 42.0))
print("invoices:", invoices)
```

# Case Study: WhatsApp Order Intake {#case-study}

A Harare wholesaler receives 200 WhatsApp orders a day. Two staff spend most of their time copying them into the system.

**Workflow:**

1. **Trigger:** WhatsApp Business API webhook receives a message.
2. **Classify:** order, question, complaint or other.
3. **Extract** (orders): customer, items, quantities, address → JSON.
4. **Validate:** match items to the price list; phone format; stock check.
5. **Decide:** auto-confirm small known orders; route others to staff with the extraction pre-filled.
6. **Act:** create the order, reply with the total and a payment link.
7. **Log and measure:** time saved, error rate, staff corrections.

**Questions to agree with the business first:** What counts as a mistake? What must always go to a human? How will customers reach a person?

# Measuring ROI {#roi}

Automation is worth it when it saves more than it costs.

```python run title="Is this automation worth it?"
def monthly_roi(tasks_per_day, minutes_saved_each, staff_cost_per_hour, run_cost_per_task, build_cost, months=12):
    hours_saved = tasks_per_day * minutes_saved_each / 60 * 22          # 22 working days
    savings = hours_saved * staff_cost_per_hour
    running = tasks_per_day * 22 * run_cost_per_task
    monthly_net = savings - running
    payback = build_cost / monthly_net if monthly_net > 0 else float("inf")
    return round(hours_saved), round(monthly_net, 2), round(payback, 1)

hours, net, payback = monthly_roi(tasks_per_day=200, minutes_saved_each=3, staff_cost_per_hour=3.0, run_cost_per_task=0.01, build_cost=1500)
print(f"Hours saved per month: {hours}")
print(f"Net saving per month: ${net}")
print(f"Pays back in {payback} months")
```

Also count **quality** (fewer typing errors), **speed** (customers served faster) and **staff time** moved to higher-value work.

````challenge
id: workflow-router
title: Message router
difficulty: medium
prompt: |
  Write `route_message(text)` that returns one of `"order"`, `"payment"`, `"complaint"` or `"other"`:
  - `"complaint"` if it contains any of: `late`, `broken`, `wrong`, `angry`
  - else `"payment"` if it contains any of: `paid`, `ecocash`, `receipt`, `invoice`
  - else `"order"` if it contains any of: `send`, `order`, `buy`, `bags`
  - else `"other"`

  Matching is **case-insensitive**. Complaints take priority over everything else.
starter: |
  def route_message(text):
      pass

  print(route_message("Please send 3 bags of cement"))
tests: |
  assert route_message("Please send 3 bags of cement") == "order"
  assert route_message("I paid via EcoCash, where is my receipt?") == "payment"
  assert route_message("You sent the WRONG order and it's late!") == "complaint", "Complaints take priority"
  assert route_message("What time do you open?") == "other"
````

```quiz
- q: Why use idempotency keys in workflows?
  options: ["To encrypt data", "So retries don't create duplicate records", "To speed up the AI", "To compress logs"]
  answer: 1
- q: When should a workflow route an item to a human?
  options: ["Never", "When confidence is low or stakes are high", "Only on weekends", "When the AI is fast"]
  answer: 1
```

```exam
- q: "What is a webhook?"
  options: ["An HTTP request a service sends to your URL when an event happens", "A type of database", "A spreadsheet", "A model"]
  answer: 0
- q: "Why verify a webhook's signature?"
  options: ["To be sure it really came from the provider", "To make it faster", "It's decorative", "To compress it"]
  answer: 0
- q: "Where should failed workflow items go?"
  options: ["A dead-letter queue for review", "Nowhere", "Directly to customers", "The recycle bin"]
  answer: 0
- q: "What should you validate AI-extracted orders against?"
  options: ["Your real price list and customer data", "Nothing", "The model's confidence alone", "The weather"]
  answer: 0
- q: "What does a schedule trigger do?"
  options: ["Runs a workflow at set times", "Waits for a user click", "Deletes old data", "Calls a webhook only"]
  answer: 0
- q: "Besides money, what else should ROI include?"
  options: ["Quality, speed and freed staff time", "Only electricity", "Nothing else", "The logo"]
  answer: 0
- q: "Why set timeouts on every API call in a workflow?"
  options: ["So one slow service can't block everything", "To save storage", "Timeouts are optional decoration", "To retry forever"]
  answer: 0
```
