---
id: hugging-face
title: Hugging Face
short: HUGGING FACE
category: ai
level: intermediate
language: python
color: "#FFB000"
icon: "🤗"
order: 44
summary: The home of open AI models. Use the Hub, pipelines, tokenizers, datasets and Spaces; run open models locally; fine-tune with transfer learning; and work with African-language models.
tags: [hugging face, transformers, open source, models, datasets, nlp, fine-tuning]
---

# What is Hugging Face? {#intro}

**Hugging Face** is the main platform for **open** AI: models, datasets and demo apps that anyone can download and use.

| Part | What it is |
|---|---|
| **Hub** (huggingface.co) | Hundreds of thousands of models and datasets, each with a "model card" explaining it |
| **transformers** | Python library to download and run models |
| **datasets** | Library to load and process datasets efficiently |
| **tokenizers** | Fast text tokenisation |
| **Spaces** | Free hosting for AI demo apps (Gradio, Streamlit) |
| **Inference API / Endpoints** | Run models on Hugging Face's servers |

## Why open models matter for Africa

- **Control and privacy:** run models on your own servers — data never leaves the country.
- **Cost:** no per-token fees once deployed.
- **Customisation:** fine-tune for Shona, Ndebele, local legal or agricultural language.
- **Community:** groups like **Masakhane** build NLP for African languages in the open.

```quiz
- q: What is a model card?
  options: ["A payment card", "Documentation describing a model, its training and limits", "A GPU", "A dataset"]
  answer: 1
```

# Pipelines: Models in 3 Lines {#pipelines}

The `pipeline` function picks a sensible model for a task and handles all the steps.

```bash
pip install transformers torch
```

```python
from transformers import pipeline

sentiment = pipeline("sentiment-analysis")
print(sentiment("The new clinic in Chitungwiza is excellent!"))
# [{'label': 'POSITIVE', 'score': 0.9998}]

summarise = pipeline("summarization", model="facebook/bart-large-cnn")
translate = pipeline("translation", model="facebook/nllb-200-distilled-600M")
print(translate("Good morning, how are you?", src_lang="eng_Latn", tgt_lang="sna_Latn"))
```

Common tasks: `sentiment-analysis`, `text-classification`, `ner` (find names/places), `question-answering`, `summarization`, `translation`, `text-generation`, `image-classification`, `automatic-speech-recognition`, `zero-shot-classification`.

> The first run downloads the model (from tens of MB to several GB). Download on Wi-Fi; models are cached in `~/.cache/huggingface`.

# Choosing a Model {#choosing}

On the Hub, filter by **task**, **language** and **licence**, then sort by downloads or trending. Read the model card for:

- **Size** (parameters) — bigger is usually better but slower and needs more memory.
- **Licence** — can you use it commercially?
- **Languages** — does it support your users' languages?
- **Benchmarks and limitations** — where does it fail?
- **Intended use** — and uses it warns against.

| Model size | Runs on |
|---|---|
| < 500M parameters | Laptop CPU |
| 1–8B (quantised) | Laptop with 16 GB RAM, or a modest GPU |
| 8–70B | One or more powerful GPUs |
| 70B+ | GPU clusters |

**Quantisation** stores weights with fewer bits (e.g. 4-bit), shrinking memory use about 4× with small quality loss — how people run large models on ordinary hardware.

# Tokenizers {#tokenizers}

Models work with **tokens**, not words. The tokenizer splits text and maps each piece to an ID.

```python
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("bert-base-uncased")
print(tok.tokenize("Mhoroi, unofara here?"))
print(tok("Mhoroi")["input_ids"])
```

Languages that were rare in a tokenizer's training data get split into **many more tokens**, which makes them slower and more expensive to process. Here is a toy tokenizer that shows the effect:

```python run title="Why some languages cost more tokens"
vocab = {"good", "morning", "how", "are", "you", "the", "school", "is", "open", "mo", "ro", "i", "ma", "ng", "wa", "na", "ni", "ku", "chi", "ko", "ro"}

def tokenize(word, vocab):
    tokens, i = [], 0
    while i < len(word):
        for j in range(len(word), i, -1):     # longest match first
            if word[i:j] in vocab:
                tokens.append(word[i:j]); i = j; break
        else:
            tokens.append(word[i]); i += 1    # unknown -> single character
    return tokens

for sentence in ["good morning how are you", "mangwanani makadii", "the school is open", "chikoro chavhurwa"]:
    toks = [t for w in sentence.split() for t in tokenize(w, vocab)]
    print(f"{len(toks):2} tokens: {sentence}")
```

Multilingual tokenizers and African-language models fix this — one reason local AI work matters.

# Datasets {#datasets}

```python
from datasets import load_dataset

ds = load_dataset("imdb", split="train[:1%]")
print(ds)
print(ds[0]["text"][:200], ds[0]["label"])

ds = ds.map(lambda row: {"length": len(row["text"])})
short = ds.filter(lambda row: row["length"] < 1000)
```

Datasets on the Hub include text, images, audio and tables — including African language corpora for translation, speech and named-entity recognition. Always check the **licence** and how the data was collected.

# Transfer Learning and Fine-Tuning {#fine-tuning}

Training a big model from scratch costs millions. **Transfer learning** starts from a **pre-trained** model and continues training on your smaller, specific dataset.

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
from datasets import load_dataset

model_id = "distilbert-base-uncased"
tok = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSequenceClassification.from_pretrained(model_id, num_labels=2)

ds = load_dataset("csv", data_files={"train": "sms_train.csv", "test": "sms_test.csv"})
ds = ds.map(lambda b: tok(b["text"], truncation=True, padding="max_length", max_length=64), batched=True)

args = TrainingArguments(output_dir="sms-scam-model", num_train_epochs=3, per_device_train_batch_size=16, eval_strategy="epoch")
trainer = Trainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds["test"])
trainer.train()
trainer.push_to_hub()   # share it (or keep it private)
```

## Parameter-efficient fine-tuning

**LoRA** (via the `peft` library) trains a small set of extra weights instead of the whole model — fine-tuning LLMs on a single GPU, or free GPUs in Google Colab.

## When to fine-tune vs prompt vs RAG

| Need | Best approach |
|---|---|
| A different style, format or narrow skill | Fine-tuning |
| Up-to-date or private facts | RAG |
| Quick prototype | Prompting |
| Small, fast, cheap classifier | Fine-tune a small model |

# Running Models Locally {#local}

**Ollama** makes running open LLMs on your own computer simple:

```bash
# install from ollama.com, then:
ollama pull llama3.2
ollama run llama3.2 "Explain what a byte is in one sentence."
```

It exposes an OpenAI-compatible API at `http://localhost:11434/v1`, so the code from the [LLM APIs](/learn/llm-apis) track works with a local model by changing the base URL:

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
reply = client.chat.completions.create(model="llama3.2", messages=[{"role": "user", "content": "Mhoro!"}])
```

Local models work **offline** — valuable where connectivity is expensive or unreliable.

# Spaces: Share a Demo {#spaces}

**Gradio** builds a web interface for a model in a few lines; **Spaces** hosts it for free.

```python
import gradio as gr
from transformers import pipeline

classify = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def triage(message):
    labels = ["billing", "delivery", "technical problem", "other"]
    result = classify(message, candidate_labels=labels)
    return {l: s for l, s in zip(result["labels"], result["scores"])}

gr.Interface(fn=triage, inputs=gr.Textbox(label="Customer message"), outputs=gr.Label()).launch()
```

Create a Space on huggingface.co, choose **Gradio**, and push `app.py` plus `requirements.txt`. A live demo link on your CV is far more convincing than a description.

```quiz
- q: What does LoRA help with?
  options: ["Fine-tuning large models cheaply", "Drawing charts", "Hosting websites", "Writing SQL"]
  answer: 0
- q: Why might Shona text cost more tokens than English in some models?
  options: ["Shona is longer", "The tokenizer saw little Shona in training, so it splits words into many pieces", "Shona needs images", "It never costs more"]
  answer: 1
- q: Which tool runs open LLMs locally with an OpenAI-compatible API?
  options: ["Ollama", "Excel", "Figma", "Postman"]
  answer: 0
```

```exam
- q: "What is the Hugging Face Hub?"
  options: ["A hosting site for models, datasets and demos", "A GPU brand", "A programming language", "A database"]
  answer: 0
- q: "Which function runs a model for a task in a few lines?"
  options: ["pipeline()", "train()", "fetch()", "deploy()"]
  answer: 0
- q: "Why read a model's licence?"
  options: ["To know whether you may use it commercially", "To find its colour", "Licences don't matter", "To learn Python"]
  answer: 0
- q: "What does quantisation do?"
  options: ["Stores weights in fewer bits to save memory", "Adds more layers", "Translates text", "Creates datasets"]
  answer: 0
- q: "What is transfer learning?"
  options: ["Starting from a pre-trained model and training further on your data", "Moving files between computers", "Copying a model's licence", "Training from scratch"]
  answer: 0
- q: "Which library hosts quick demo UIs on Spaces?"
  options: ["Gradio", "Django", "Pandas", "Flask-Login"]
  answer: 0
```
