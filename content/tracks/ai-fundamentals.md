---
id: ai-fundamentals
title: AI Fundamentals
short: AI
category: ai
level: beginner
language: python
color: "#7A4FB8"
icon: "🧠"
order: 40
summary: What AI really is, how machines learn, what large language models do, where AI fails, and how to use it responsibly — with runnable examples and Zimbabwean case studies.
tags: [ai, artificial intelligence, machine learning, llm, ethics, beginner]
---

# What is Artificial Intelligence? {#intro}

**Artificial Intelligence (AI)** is the field of building computer systems that do tasks we normally associate with human intelligence: recognising images, understanding language, making predictions and decisions.

AI is not one thing. It's a family of techniques:

```text
Artificial Intelligence
 └─ Machine Learning — systems that learn patterns from data
     └─ Deep Learning — machine learning with large neural networks
         └─ Generative AI — models that create text, images, audio, code
             └─ Large Language Models (LLMs) — GPT, Claude, Gemini, Llama…
```

## Traditional programming vs machine learning

- **Traditional programming:** you write the **rules**. Data + rules → answers.
- **Machine learning:** you give **examples** with answers, and the computer finds the rules. Data + answers → rules (a **model**).

```python run title="Rules written by a human"
def is_spam(message):
    rules = ["win", "free", "click", "prize"]
    return any(word in message.lower() for word in rules)

print(is_spam("You WIN a free phone! Click now"))
print(is_spam("Class starts at 8 tomorrow"))
```

Rules like these break easily — spammers just change the words. Machine learning learns the patterns from thousands of real examples instead.

## AI around you in Zimbabwe

- **Mobile money fraud detection** flags unusual transactions.
- **Crop disease apps** identify maize and tomato diseases from a phone photo.
- **Credit scoring** for small loans uses airtime and transaction patterns.
- **Translation and speech** tools are starting to support Shona and Ndebele.
- **Chat assistants** answer customer questions for banks and telecoms.

```quiz
- q: In machine learning, what does the computer learn from?
  options: ["Only rules written by programmers", "Examples (data)", "The internet automatically", "Random guesses"]
  answer: 1
- q: Which is a subset of machine learning?
  options: ["Spreadsheets", "Deep learning", "HTML", "Databases"]
  answer: 1
```

# How Machines Learn {#how-machines-learn}

There are three main kinds of machine learning.

| Type | Learns from | Example |
|---|---|---|
| **Supervised** | Examples **with** the right answer (labels) | Photos labelled "healthy leaf" / "diseased leaf" |
| **Unsupervised** | Examples **without** labels — finds groups | Grouping customers by shopping habits |
| **Reinforcement** | Rewards and penalties from trying things | A robot learning to walk, game-playing AIs |

## A model is a function with adjustable knobs

Training means adjusting the knobs (called **parameters** or **weights**) until the model's answers match the examples. Here's the simplest possible "model" — a straight line — learned from data:

```python run title="Learning a line from data"
# Hours studied -> exam mark
hours = [1, 2, 3, 4, 5, 6]
marks = [35, 45, 52, 61, 68, 79]

# Start with a guess and improve it step by step (gradient descent)
w, b = 0.0, 0.0
lr = 0.01
for step in range(5000):
    dw = db = 0
    for x, y in zip(hours, marks):
        error = (w * x + b) - y
        dw += 2 * error * x / len(hours)
        db += 2 * error / len(hours)
    w -= lr * dw
    b -= lr * db

print(f"Learned rule: mark ≈ {w:.1f} × hours + {b:.1f}")
print(f"Prediction for 7 hours: {w * 7 + b:.0f}")
```

That loop is the heart of **all** machine learning — including the training of huge language models. They just have billions of knobs instead of two.

## Training, validation and testing

Always split your data:

- **Training set** — the model learns from it.
- **Validation set** — you use it to tune settings.
- **Test set** — touched only once at the end, to measure real performance.

If a model does brilliantly on training data but badly on new data, it has **overfitted** — memorised instead of learned, like a learner who memorises past exam papers but can't answer a new question.

```quiz
- q: A model scores 99% on training data but 60% on new data. What happened?
  options: ["Underfitting", "Overfitting", "Perfect training", "Data leakage is impossible"]
  answer: 1
- q: Which learning type uses labelled examples?
  options: ["Supervised", "Unsupervised", "Reinforcement", "Random"]
  answer: 0
```

# Neural Networks and Deep Learning {#neural-networks}

A **neural network** is made of layers of simple units ("neurons"). Each neuron multiplies its inputs by weights, adds them up, and passes the result through an **activation function**.

```python run title="One artificial neuron"
import math

def neuron(inputs, weights, bias):
    total = sum(i * w for i, w in zip(inputs, weights)) + bias
    return 1 / (1 + math.exp(-total))   # sigmoid activation squashes to 0..1

# Should we irrigate today? inputs: [soil dryness 0-1, temperature/40, chance of rain 0-1]
weights = [2.5, 1.5, -3.0]
print(f"Irrigate score: {neuron([0.9, 0.85, 0.1], weights, -1.0):.2f}")   # dry, hot, no rain
print(f"Irrigate score: {neuron([0.3, 0.6, 0.9], weights, -1.0):.2f}")    # moist, rain coming
```

Stack thousands of these in many layers and you get **deep learning**, which powers:

- **Computer vision** (CNNs, vision transformers) — recognising images.
- **Speech recognition** — turning audio into text.
- **Transformers** — the architecture behind modern language models.

# Large Language Models {#llms}

A **large language model** (LLM) is a neural network trained on huge amounts of text to do one thing: **predict the next token** (a word or piece of a word).

When you chat with an LLM, it generates one token at a time, each time choosing a likely next token given everything before it.

```python run title="A tiny next-word predictor"
from collections import Counter, defaultdict
import random

text = """learning to code is fun . learning to code takes practice .
python is fun . practice makes progress . code every day ."""
words = text.split()

next_words = defaultdict(Counter)
for a, b in zip(words, words[1:]):
    next_words[a][b] += 1

print("After 'learning' comes:", dict(next_words["learning"]))
print("After 'is' comes:", dict(next_words["is"]))

random.seed(4)
word, sentence = "learning", ["learning"]
for _ in range(8):
    options = next_words[word]
    word = random.choices(list(options), weights=options.values())[0]
    sentence.append(word)
print("Generated:", " ".join(sentence))
```

Real LLMs do the same thing with far more context, billions of parameters and trillions of training tokens.

## Key terms

| Term | Meaning |
|---|---|
| **Token** | A chunk of text (≈ ¾ of an English word on average) |
| **Context window** | How many tokens the model can consider at once |
| **Prompt** | The input text you give the model |
| **Temperature** | Randomness: low = focused and repeatable, high = creative |
| **Fine-tuning** | Extra training on specific data |
| **Hallucination** | Confident output that is false |
| **Embedding** | A list of numbers that represents meaning |

## What LLMs are good and bad at

✅ Drafting, summarising, explaining, translating, writing and reviewing code, extracting data from text.
❌ Guaranteed facts, exact arithmetic on large numbers, recent events (unless given search), knowing what they don't know.

> **Rule of thumb:** treat LLM output like a capable but overconfident intern's work — useful, fast, and always worth checking.

```quiz
- q: What does an LLM fundamentally do?
  options: ["Looks up answers in a database", "Predicts the next token", "Searches Google", "Runs Python code"]
  answer: 1
- q: What is a hallucination?
  options: ["A slow response", "Confident output that is false", "An image the model draws", "A type of token"]
  answer: 1
```

# Data: The Fuel of AI {#data}

Models are only as good as their data. "Garbage in, garbage out."

## Data quality questions

- **Is it representative?** A crop model trained only on photos from Mashonaland may fail in Matabeleland's different conditions.
- **Is it labelled correctly?** Wrong labels teach wrong lessons.
- **Is it balanced?** If 99% of transactions are normal, a model that always says "normal" is 99% accurate — and useless at catching fraud.
- **Is it recent?** Prices, language and behaviour change over time.
- **Was it collected fairly and legally?** With consent, following data protection law.

```python run title="Why accuracy can lie"
transactions = ["ok"] * 990 + ["fraud"] * 10
predictions = ["ok"] * 1000       # a lazy model that never flags fraud

accuracy = sum(p == t for p, t in zip(predictions, transactions)) / len(transactions)
caught = sum(p == t == "fraud" for p, t in zip(predictions, transactions))
print(f"Accuracy: {accuracy:.1%}")
print(f"Fraud cases caught: {caught} of 10")
```

That's why data scientists also measure **precision** and **recall** — see the [Machine Learning](/learn/machine-learning) track.

# AI Ethics and Safety {#ethics}

AI decisions affect real people: who gets a loan, which CV is shortlisted, what news people see.

## Key risks

| Risk | Example |
|---|---|
| **Bias** | A face-recognition system that works worse on darker skin because its training photos were mostly of lighter-skinned people |
| **Privacy** | Training on personal messages or medical records without consent |
| **Misinformation** | Fake but convincing images, audio or news |
| **Over-reliance** | Trusting AI answers in health, law or finance without checking |
| **Security** | Prompt injection, leaked data, AI-written malware |
| **Jobs** | Tasks change; people need new skills |

## Responsible AI principles

1. **Fairness** — test performance across groups (gender, region, language).
2. **Transparency** — tell people when AI is involved and how decisions are made.
3. **Privacy** — collect only what you need, protect it, follow the law (Zimbabwe's **Cyber and Data Protection Act**).
4. **Human oversight** — keep a person in the loop for high-stakes decisions.
5. **Safety and security** — test for misuse and failure before launch.
6. **Accountability** — someone is responsible when things go wrong.

The [Guardrails & AI Safety](/learn/guardrails) track shows how engineers build these protections into real systems.

```quiz
- q: A loan model approves far fewer women than men with the same income. What is this?
  options: ["Overfitting", "Bias", "Hallucination", "Latency"]
  answer: 1
- q: Which principle keeps people involved in high-stakes AI decisions?
  options: ["Human oversight", "Speed", "Temperature", "Tokenisation"]
  answer: 0
```

# Using AI Tools Well {#using-ai}

You don't need to build AI to benefit from it. Everyone should know how to use AI assistants well.

## A good prompt has

1. **Role/context** — who the AI should act as and what the situation is.
2. **Task** — exactly what you want.
3. **Constraints** — length, format, audience, what to avoid.
4. **Examples** — show the style you want.

```text
❌  "Write about farming."

✅  "You are an agricultural extension officer in Masvingo.
     Write a 150-word WhatsApp message for small-scale farmers
     explaining 3 ways to conserve soil moisture during a dry spell.
     Use simple English, short sentences and a numbered list."
```

## Check before you trust

- Ask for **sources** and open them.
- Cross-check facts, figures and dates.
- Run and test any code it writes.
- Never paste passwords, ID numbers or private data.

Continue with **[Prompt Engineering](/learn/prompt-engineering)** to go deeper, or **[Machine Learning](/learn/machine-learning)** to start building models.

# AI Careers and Your Path {#careers}

AI has created many new roles — and changed existing ones.

| Role | What they do | Start with |
|---|---|---|
| **AI Engineer** | Builds products on top of LLMs (chatbots, RAG, assistants) | Python → Prompt Engineering → LLM APIs → RAG |
| **Agentic AI Engineer** | Builds AI agents that use tools and complete tasks | AI Engineer path → AI Agents → Guardrails |
| **Workflow/Automation AI Engineer** | Automates business processes with AI | Python → AI Workflows |
| **Machine Learning Engineer** | Trains and deploys models | Python → Data Science → ML → MLOps |
| **Data Scientist** | Finds insights and predictions in data | Python → SQL → Data Science → ML |
| **Platform AI Engineer** | Runs the infrastructure for AI at scale | Backend → Deployment → MLOps |
| **AI Product Manager** | Decides what AI to build and why | AI Fundamentals → Prompt Engineering |

See all paths on the **[Careers](/careers)** page.

````challenge
id: ai-fund-precision
title: Measure a spam filter
difficulty: medium
prompt: |
  A spam filter labelled 8 messages. Write `precision_recall(predicted, actual)` that returns a tuple `(precision, recall)` for the label `"spam"`, each rounded to 2 decimals.

  - **precision** = correctly predicted spam ÷ everything predicted as spam
  - **recall** = correctly predicted spam ÷ all actual spam
starter: |
  def precision_recall(predicted, actual):
      pass

  predicted = ["spam", "ok", "spam", "spam", "ok", "ok", "spam", "ok"]
  actual    = ["spam", "ok", "ok",   "spam", "spam", "ok", "spam", "ok"]
  print(precision_recall(predicted, actual))
tests: |
  p = ["spam", "ok", "spam", "spam", "ok", "ok", "spam", "ok"]
  a = ["spam", "ok", "ok", "spam", "spam", "ok", "spam", "ok"]
  assert precision_recall(p, a) == (0.75, 0.75), f"Expected (0.75, 0.75), got {precision_recall(p, a)}"
  assert precision_recall(["spam", "spam"], ["spam", "ok"]) == (0.5, 1.0)
````

```exam
- q: "What is training a model?"
  options: ["Writing rules by hand", "Adjusting parameters so outputs match examples", "Installing software", "Buying data"]
  answer: 1
- q: "What is a token?"
  options: ["A password", "A chunk of text a model processes", "A GPU", "A type of database"]
  answer: 1
- q: "Why can accuracy be misleading for fraud detection?"
  options: ["Fraud data is always perfect", "The classes are imbalanced", "Accuracy is always low", "Models can't detect fraud"]
  answer: 1
- q: "Which is an example of unsupervised learning?"
  options: ["Grouping customers by behaviour without labels", "Predicting house prices from labelled sales", "Spam filtering with labelled emails", "A chess engine"]
  answer: 0
- q: "What should you do before trusting an LLM's factual answer?"
  options: ["Nothing", "Check it against reliable sources", "Ask it to be confident", "Increase temperature"]
  answer: 1
```
