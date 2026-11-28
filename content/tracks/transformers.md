---
id: transformers
title: Transformers & Tiny LLMs
short: TF
category: ai
level: advanced
language: python
color: "#0B5D7A"
icon: "🔤"
order: 41.7
premium: true
preview: 3
summary: Open up the architecture behind ChatGPT, Claude, Llama and Gemini, and build it yourself in NumPy. Tokenizers and BPE, embeddings and positions, self-attention, multi-head attention, the transformer block, BERT versus GPT, a tiny GPT trained in your browser on Shona proverbs, sampling, how chat models are trained (SFT, RLHF, DPO), and what makes big models fast and cheap.
tags: [transformers, llm, attention, tokenizer, bpe, gpt, bert, rope, kv cache, lora, dpo, rlhf, mixture of experts]
---

# Start: Why Transformers? {#intro}

Every modern language model, from ChatGPT and Claude to Llama, Gemini and DeepSeek, is a **transformer**: an architecture introduced in the 2017 paper *Attention Is All You Need*. The same design now reads images, speech and code too.

A language model does one thing: given some text, it predicts **the next token**. Run that prediction in a loop, adding each new token to the text, and the model writes.

```sketch
title: "Inside a GPT-style language model"
caption: "Text becomes token ids, ids become vectors, a stack of transformer blocks mixes information between positions, and the last vector becomes a probability for every possible next token."
cellW: 170
nodes:
  - id: text
    label: "Text"
    sub: "\"Chara chimwe\""
    col: 0
    row: 1
    shape: doc
  - id: tok
    label: "Tokenizer"
    sub: "text → ids"
    col: 1.15
    row: 1
    shape: round
    tone: sky
  - id: emb
    label: "Embeddings"
    sub: "ids → vectors + position"
    col: 2.3
    row: 1
    shape: round
    tone: teal
  - id: blocks
    label: "N transformer blocks"
    sub: "attention + feed-forward"
    col: 3.45
    row: 1
    shape: box
    tone: grape
  - id: head
    label: "Output head"
    sub: "probability of every token"
    col: 3.45
    row: 2.3
    shape: round
    tone: gold
  - id: next
    label: "Next token"
    sub: "\"hachitswanyi\""
    col: 2.3
    row: 2.3
    shape: pill
    tone: rose
edges:
  - from: text
    to: tok
  - from: tok
    to: emb
  - from: emb
    to: blocks
  - from: blocks
    to: head
  - from: head
    to: next
  - from: next
    to: tok
    label: "append and repeat"
    dashed: true
```

## The problem transformers solved

Before 2017, language models were **recurrent networks** (RNNs and LSTMs). They read text one word at a time and squeezed everything so far into a single memory vector. That had two costs: training couldn't run in parallel, because word 100 had to wait for word 99, and information from far back faded.

A transformer lets **every position look directly at every earlier position** in one step, using **attention**. All positions are computed at once, so training uses a GPU's thousands of cores fully.

```python run title="A language model is a next-token probability table"
from collections import Counter, defaultdict

proverbs = ("chara chimwe hachitswanyi inda . kandiro kanoenda kunobva kamwe . "
            "nzou hairemerwi nenyanga dzayo . gudo guru peta muswe .").split()

# The simplest language model: count which word follows which (a bigram model).
follows = defaultdict(Counter)
for a, b in zip(proverbs, proverbs[1:]):
    follows[a][b] += 1

for word in ["chara", "kandiro", "."]:
    total = sum(follows[word].values())
    probs = {w: round(n / total, 2) for w, n in follows[word].most_common()}
    print(f"after '{word}':", probs)
```

A bigram model only looks one word back. A transformer looks back over thousands of tokens and learns which ones matter. That is the whole story of this track: we will build each part, then train a small GPT in your browser.

## What you need first

- **[Deep Learning from Scratch](/learn/deep-learning)**: layers, softmax, cross-entropy, backpropagation and Adam
- Comfort with NumPy arrays and matrix shapes

> **Credit.** This track is adapted, rewritten and extended from Phases 7 and 10 of *[AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch)* by Rohit Ghumare (MIT License). See [Credits & licenses](/credits).

```quiz
- q: What does a language model predict at each step?
  options: ["The whole answer at once", "The next token", "The previous word", "The topic of the text"]
  answer: 1
- q: Why do transformers train faster than RNNs on GPUs?
  options: ["They have fewer parameters", "All positions are processed in parallel instead of one after another", "They don't use matrices", "They skip backpropagation"]
  answer: 1
```

# Tokenizers and Byte-Pair Encoding {#tokenizers}

A model can't read letters; it reads numbers. A **tokenizer** cuts text into pieces called **tokens** and gives each one an id.

| Approach | Example: "unbelievable" | Problem |
|---|---|---|
| Characters | u, n, b, e, l, i, … | Sequences become very long |
| Whole words | unbelievable | Millions of words; any new word is unknown |
| **Subwords** (BPE) | un, believ, able | The sweet spot every modern LLM uses |

**Byte-Pair Encoding** (BPE) learns subwords from data. Start with single characters, then repeatedly find the most frequent **adjacent pair** and merge it into a new token. Frequent words end up as one token; rare words are spelled out of common pieces.

```python run title="Learn BPE merges from scratch"
from collections import Counter

text = "chara chimwe hachitswanyi inda. kandiro kanoenda kunobva kamwe. chinokura chinokotama."
tokens = list(text)
print("start:", len(tokens), "tokens")

def most_common_pair(tokens):
    pairs = Counter(zip(tokens, tokens[1:]))
    return max(pairs, key=pairs.get)

def merge(tokens, pair):
    out, i = [], 0
    while i < len(tokens):
        if i < len(tokens) - 1 and (tokens[i], tokens[i + 1]) == pair:
            out.append(tokens[i] + tokens[i + 1])
            i += 2
        else:
            out.append(tokens[i])
            i += 1
    return out

merges = []
for step in range(12):
    pair = most_common_pair(tokens)
    tokens = merge(tokens, pair)
    merges.append(pair)
    print(f"merge {step + 1:2}: {pair[0]!r} + {pair[1]!r} -> {pair[0] + pair[1]!r}   ({len(tokens)} tokens)")

print("\nresult:", tokens)
```

To **encode** new text, apply the learned merges in the same order. To **decode**, join the pieces back together. Real tokenizers learn 32,000 to 200,000 merges from terabytes of text.

## Real tokenizers

| Tokenizer | Used by | Detail |
|---|---|---|
| **Byte-level BPE** | GPT-2, GPT-4, Llama 3 | Starts from the 256 bytes, so any text, emoji or language can be encoded |
| **WordPiece** | BERT | Like BPE, but merges the pair that most increases the data's likelihood |
| **SentencePiece** | T5, Gemma, older Llama | Treats spaces as an ordinary symbol, so it works without splitting on words first |

## The multilingual tax

Tokenizers learn from their training data, which is mostly English. Text in other languages is split into more, smaller pieces. More tokens means higher API cost, a shorter effective context window and often worse answers. It is a real issue for Shona, Ndebele and most African languages.

```python run title="Count the cost: tokens per word"
from collections import Counter

english = ("the farmer planted maize before the rains came and the children went to school "
           "the market was busy and the prices of bread and milk went up again this week ") * 3
shona = "murimi akadyara chibage mvura isati yanaya vana vakaenda kuchikoro musika wakanga wakazara "

def learn(text, n):
    tokens, merges = list(text), []
    for _ in range(n):
        pairs = Counter(zip(tokens, tokens[1:]))
        best = max(pairs, key=pairs.get)
        merges.append(best)
        out, i = [], 0
        while i < len(tokens):
            if i < len(tokens) - 1 and (tokens[i], tokens[i + 1]) == best:
                out.append(tokens[i] + tokens[i + 1]); i += 2
            else:
                out.append(tokens[i]); i += 1
        tokens = out
    return merges

def encode(text, merges):
    tokens = list(text)
    for pair in merges:
        out, i = [], 0
        while i < len(tokens):
            if i < len(tokens) - 1 and (tokens[i], tokens[i + 1]) == pair:
                out.append(tokens[i] + tokens[i + 1]); i += 2
            else:
                out.append(tokens[i]); i += 1
        tokens = out
    return tokens

merges = learn(english, 60)                      # a tokenizer trained on English only
for name, sample in [("English", "the children went to the market"), ("Shona", "vana vakaenda kumusika")]:
    toks = encode(sample, merges)
    print(f"{name:8} {len(sample.split())} words -> {len(toks)} tokens: {toks}")
```

The English sentence costs about 2.5 tokens per word; the Shona one costs about 7. Tokenizers trained on more balanced data, and dedicated African-language tokenizers, close much of this gap.

```exercise
prompt: Complete the BPE step. It counts every adjacent pair and returns the most frequent one.
code: |
  pairs = Counter(zip(tokens, tokens[___:]))
  best = max(pairs, key=pairs.get)
answers: ["1"]
hint: Pair each token with the one after it.
```

````challenge
id: tf-bpe-pair
title: The most frequent pair
difficulty: easy
prompt: |
  Write `most_common_pair(tokens)` that returns the most frequent **adjacent** pair in a list of tokens, as a tuple. If two pairs are equally frequent, return the one that appears **first** in the list. Return `None` if there are fewer than two tokens.
starter: |
  def most_common_pair(tokens):
      pass

  print(most_common_pair(list("banana")))
tests: |
  assert most_common_pair(list("banana")) == ("a", "n")
  assert most_common_pair(["ch", "a", "ch", "a", "r"]) == ("ch", "a")
  assert most_common_pair(list("abcd")) == ("a", "b"), "Ties go to the pair seen first"
  assert most_common_pair(["x"]) is None
  assert most_common_pair(list("aaab")) == ("a", "a")
````

```quiz
- q: What does BPE merge at each step?
  options: ["The two rarest characters", "The most frequent adjacent pair of tokens", "Every word into one token", "Tokens in alphabetical order"]
  answer: 1
- q: Why does a mostly-English tokenizer cost more for Shona text?
  options: ["Shona has more letters", "Shona words are split into more, smaller tokens", "APIs charge more for African languages", "Shona can't be encoded"]
  answer: 1
```

# Embeddings and Positions {#embeddings}

After tokenizing, each id is swapped for a **vector**: a row of an **embedding table** with one row per token in the vocabulary. The table starts random and is learned during training, so tokens used in similar ways end up with similar vectors.

```python run title="An embedding table is a lookup"
import numpy as np
rng = np.random.default_rng(0)
vocab = ["<pad>", "chi", "bage", "maize", "mvura", "water", "mu", "rimi"]
E = rng.normal(0, 1, (len(vocab), 4))        # 8 tokens x 4 dimensions (real models: 4,096+)

ids = [vocab.index(t) for t in ["chi", "bage"]]
print("ids:", ids)
print("vectors:\n", E[ids].round(2))        # embedding = indexing a row

def cosine(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))
print("similarity of random 'maize' and 'water' vectors:", round(cosine(E[3], E[5]), 2))
```

After training, the similarities stop being random: *maize* lands near *wheat* and *sorghum*, and *mvura* near *water*. The same idea powers the embedding models used in [RAG](/learn/rag).

## Where is each token?

Attention treats its inputs as a **set**: shuffle the tokens and, without extra information, it computes the same thing for each. Word order matters ("mbudzi yakadya chibage" is not "chibage chakadya mbudzi"), so models add **position** information.

| Method | Idea | Used by |
|---|---|---|
| **Learned positions** | A second table: one vector per position | GPT-2, BERT |
| **Sinusoidal** | Fixed sine and cosine waves of different speeds | The original 2017 transformer |
| **RoPE** (rotary) | Rotate each query and key vector by an angle that grows with position | Llama, Mistral, Qwen, Gemma, DeepSeek |
| **ALiBi** | Penalise attention by distance | BLOOM, MPT |

**RoPE** won because of one neat property: after rotating, the dot product between a query at position *m* and a key at position *n* depends only on the **distance** *m − n*, not on where in the text they are.

```python run title="RoPE: only the distance matters"
import numpy as np
rng = np.random.default_rng(1)

def rope(vec, pos, base=10000):
    d = len(vec)
    freqs = base ** (-np.arange(0, d, 2) / d)          # one rotation speed per pair of dimensions
    angle = pos * freqs
    x1, x2 = vec[0::2], vec[1::2]
    out = np.empty_like(vec)
    out[0::2] = x1 * np.cos(angle) - x2 * np.sin(angle)
    out[1::2] = x1 * np.sin(angle) + x2 * np.cos(angle)
    return out

q, k = rng.normal(size=8), rng.normal(size=8)
for m, n in [(5, 2), (105, 102), (1005, 1002)]:
    score = rope(q, m) @ rope(k, n)
    print(f"query at {m:4}, key at {n:4} (distance {m - n}): score {score:.6f}")
```

The score is identical at the start, middle and far end of a document, because only the distance of 3 matters.

```quiz
- q: What is an embedding table?
  options: ["A list of documents", "A learned matrix with one vector per token in the vocabulary", "A table of positions only", "The model's output probabilities"]
  answer: 1
- q: What does RoPE make the attention score depend on?
  options: ["The absolute position of each token", "Only the distance between the two positions", "The length of the vocabulary", "The batch size"]
  answer: 1
```

# Self-Attention from Scratch {#attention}

**Attention** lets each token gather information from other tokens. Think of a library search:

- Each token makes a **query** (Q): "what am I looking for?"
- Each token offers a **key** (K): "what do I contain?"
- Each token carries a **value** (V): "what will I hand over if chosen?"

A token compares its query with every key. Strong matches get large weights, and the token takes a weighted average of the values.

```sketch
title: "Scaled dot-product attention"
caption: "Scores compare every query with every key; softmax turns each row of scores into weights; the output mixes the values by those weights."
cellW: 165
nodes:
  - id: x
    label: "Token vectors X"
    col: 0
    row: 1
    shape: box
    tone: sky
  - id: q
    label: "Q = X·Wq"
    col: 1.2
    row: 0
    shape: round
    tone: gold
  - id: k
    label: "K = X·Wk"
    col: 1.2
    row: 1
    shape: round
    tone: gold
  - id: v
    label: "V = X·Wv"
    col: 1.2
    row: 2
    shape: round
    tone: gold
  - id: s
    label: "Q·Kᵀ / √d"
    sub: "scores"
    col: 2.4
    row: 0.5
    shape: round
    tone: rose
  - id: sm
    label: "softmax"
    sub: "weights per row"
    col: 3.5
    row: 0.5
    shape: round
    tone: grape
  - id: out
    label: "weights · V"
    sub: "output"
    col: 3.5
    row: 1.8
    shape: pill
    tone: teal
edges:
  - from: x
    to: q
  - from: x
    to: k
  - from: x
    to: v
  - from: q
    to: s
  - from: k
    to: s
  - from: s
    to: sm
  - from: sm
    to: out
  - from: v
    to: out
```

The whole mechanism is four lines of NumPy.

```python run title="Attention on a short sentence"
import numpy as np
rng = np.random.default_rng(3)

def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V, causal=False):
    d = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d)
    if causal:                                   # a token may not look at the future
        scores = scores + np.triu(np.full(scores.shape, -1e9), k=1)
    weights = softmax(scores)
    return weights @ V, weights

words = ["mbudzi", "yakadya", "chibage", "chese"]   # "the goat ate all the maize"
d = 8
X = rng.normal(size=(len(words), d))
Wq, Wk, Wv = (rng.normal(0, d ** -0.5, (d, d)) for _ in range(3))
out, w = attention(X @ Wq, X @ Wk, X @ Wv, causal=True)

print("attention weights (row = token looking, column = token looked at):")
print(" " * 9 + "".join(f"{x:>9}" for x in words))
for word, row in zip(words, w):
    print(f"{word:>9}" + "".join(f"{v:9.2f}" for v in row))
print("output shape:", out.shape)
```

With random weights the pattern means nothing yet. Training shapes `Wq`, `Wk` and `Wv` so that, for example, *chese* ("all") learns to attend to *chibage*, the thing it describes.

## Why divide by √d?

A dot product of two random `d`-dimensional vectors grows with `d`. Large scores push softmax to put almost all weight on one token, and its gradients vanish. Dividing by `√d` keeps the scores around size 1 whatever the dimension.

```python run title="The scale of raw scores"
import numpy as np
rng = np.random.default_rng(0)
for d in [16, 64, 256, 1024]:
    q, k = rng.normal(size=(1000, d)), rng.normal(size=(1000, d))
    raw = (q * k).sum(axis=1)
    print(f"d = {d:5}: spread of raw scores {raw.std():6.1f}   after dividing by √d {(raw / np.sqrt(d)).std():.2f}")
```

## The causal mask

When a GPT learns to predict the next token, position 5 must not peek at position 6. The **causal mask** sets every score above the diagonal to minus infinity, so those weights become 0 after softmax. Look at the triangle of zeros in the weights you printed above.

````challenge
id: tf-attention
title: Scaled dot-product attention
difficulty: medium
prompt: |
  Write `attention(Q, K, V, causal=False)` that returns the attention **output** (not the weights).

  1. `scores = Q @ K.T / sqrt(d)`, where `d` is the number of columns of `Q`
  2. If `causal`, block every position from attending to later positions (set those scores to a very negative number)
  3. Softmax each row (subtract the row maximum first), then multiply by `V`
starter: |
  import numpy as np

  def attention(Q, K, V, causal=False):
      pass

  Q = K = np.eye(3)
  V = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
  print(attention(Q, K, V).round(3))
tests: |
  import numpy as np
  Q = K = np.eye(3)
  V = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
  r = attention(Q, K, V)
  assert r.shape == (3, 2)
  assert np.allclose(r[0], [0.73554, 0.52892], atol=1e-4), r[0]
  c = attention(Q, K, V, causal=True)
  assert np.allclose(c[0], [1.0, 0.0]), "With a causal mask the first token can only see itself"
  assert np.allclose(c[1], [0.35954, 0.64046], atol=1e-4), c[1]
  big = attention(np.full((2, 4), 50.0), np.full((2, 4), 50.0), np.eye(2, 3))
  assert np.all(np.isfinite(big)), "Subtract the row maximum so large scores don't overflow"
````

```quiz
- q: In attention, what does the softmax produce?
  options: ["The values", "A weight for every key, adding to 1 across each row", "New embeddings", "The token ids"]
  answer: 1
- q: Why does a GPT use a causal mask during training?
  options: ["To save memory", "So each position can't see the tokens it is trying to predict", "To speed up the tokenizer", "To make attention symmetric"]
  answer: 1
```

# Multi-Head Attention {#multi-head}

One attention pattern can't capture everything at once: which noun an adjective describes, who did what to whom, where the sentence started. **Multi-head attention** runs several smaller attentions in parallel, each with its own Q, K and V weights, then joins their outputs.

```python run title="Splitting a layer into heads"
import numpy as np
rng = np.random.default_rng(0)

def softmax(z):
    z = z - z.max(-1, keepdims=True); e = np.exp(z)
    return e / e.sum(-1, keepdims=True)

T, d_model, n_heads = 6, 32, 4
d_head = d_model // n_heads
X = rng.normal(size=(T, d_model))
Wq, Wk, Wv, Wo = (rng.normal(0, d_model ** -0.5, (d_model, d_model)) for _ in range(4))

def split(M):                                   # (T, d_model) -> (heads, T, d_head)
    return M.reshape(T, n_heads, d_head).transpose(1, 0, 2)

Q, K, V = split(X @ Wq), split(X @ Wk), split(X @ Wv)
mask = np.triu(np.full((T, T), -1e9), k=1)
weights = softmax(Q @ K.transpose(0, 2, 1) / np.sqrt(d_head) + mask)   # (heads, T, T)
heads = weights @ V                                                     # (heads, T, d_head)
out = heads.transpose(1, 0, 2).reshape(T, d_model) @ Wo                # join the heads

print("Q per head:", Q.shape, "| weights:", weights.shape, "| output:", out.shape)
print("what the last token attends to, per head:")
for h in range(n_heads):
    print(f"  head {h}:", weights[h, -1].round(2))
```

The heads together cost the same as one big head, because each works in `d_model / n_heads` dimensions. In trained models, researchers find heads that track the previous token, heads that copy names, and heads that match brackets.

## Sharing keys and values: GQA

During generation the model stores every past key and value (the **KV cache**, covered later). With many heads that cache gets huge. **Grouped-query attention** (GQA) lets several query heads share one key/value head.

| Variant | Query heads | Key/value heads | KV cache size | Used by |
|---|---|---|---|---|
| Multi-head (MHA) | 32 | 32 | 100% | GPT-2, GPT-3 |
| Grouped-query (GQA) | 32 | 8 | 25% | Llama 3, Mistral, Qwen |
| Multi-query (MQA) | 32 | 1 | 3% | PaLM, Falcon |

GQA keeps almost all the quality of full multi-head attention for a quarter of the memory, which is why most open models use it.

```quiz
- q: Why use several attention heads instead of one?
  options: ["Each head can learn a different kind of relationship", "It removes the need for softmax", "It makes the vocabulary bigger", "Heads replace the feed-forward layer"]
  answer: 0
- q: What does grouped-query attention share between query heads?
  options: ["The embedding table", "Key and value heads", "The output vocabulary", "The optimiser"]
  answer: 1
```

# The Transformer Block {#block}

A transformer is a stack of identical **blocks**. Each block has two parts, each wrapped in a **residual connection** (add the input back to the output) and a **normalisation**:

1. **Attention**: tokens exchange information
2. **Feed-forward network** (FFN): each token is processed on its own by a small two-layer MLP, usually 4× wider than the model

```sketch
title: "One pre-norm transformer block"
caption: "Residual connections give gradients a straight path through dozens of blocks; normalising before each part keeps training stable."
cellW: 132
cellH: 100
nodes:
  - id: in
    label: "x"
    col: 0
    row: 1
    shape: circle
    tone: sky
  - id: n1
    label: "Norm"
    col: 1
    row: 0
    shape: round
  - id: att
    label: "Multi-head attention"
    col: 2
    row: 0
    shape: box
    tone: grape
  - id: add1
    label: "+"
    col: 3
    row: 1
    shape: circle
    tone: gold
  - id: n2
    label: "Norm"
    col: 4
    row: 0
    shape: round
  - id: ffn
    label: "Feed-forward"
    sub: "d → 4d → d"
    col: 5
    row: 0
    shape: box
    tone: teal
  - id: add2
    label: "+"
    col: 6
    row: 1
    shape: circle
    tone: gold
edges:
  - from: in
    to: n1
  - from: n1
    to: att
  - from: att
    to: add1
  - from: in
    to: add1
    label: "residual"
  - from: add1
    to: n2
  - from: n2
    to: ffn
  - from: ffn
    to: add2
  - from: add1
    to: add2
    label: "residual"
```

```python run title="A transformer block in NumPy"
import numpy as np
rng = np.random.default_rng(0)
T, d = 5, 16

def layer_norm(x, eps=1e-5):
    return (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + eps)

def gelu(x):
    return 0.5 * x * (1 + np.tanh(0.7978845608 * (x + 0.044715 * x ** 3)))

def softmax(z):
    z = z - z.max(-1, keepdims=True); e = np.exp(z)
    return e / e.sum(-1, keepdims=True)

Wq, Wk, Wv, Wo = (rng.normal(0, d ** -0.5, (d, d)) for _ in range(4))
W1, W2 = rng.normal(0, d ** -0.5, (d, 4 * d)), rng.normal(0, (4 * d) ** -0.5, (4 * d, d))
mask = np.triu(np.full((T, T), -1e9), k=1)

def block(x):
    h = layer_norm(x)                                          # 1. attention, with a residual
    q, k, v = h @ Wq, h @ Wk, h @ Wv
    x = x + softmax(q @ k.T / np.sqrt(d) + mask) @ v @ Wo
    h = layer_norm(x)                                          # 2. feed-forward, with a residual
    x = x + gelu(h @ W1) @ W2
    return x

x = rng.normal(size=(T, d))
y = x
for _ in range(6):                                             # stack six blocks (sharing weights, for brevity)
    y = block(y)
print("input", x.shape, "-> output after 6 blocks", y.shape)
```

Real models give each block its own weights. The block's input and output have the same shape, which is what lets you stack 12, 32 or 126 of them.

## Counting GPT-2's parameters

GPT-2 Small has 12 blocks, 768 dimensions, a 50,257-token vocabulary and a 1,024-token context. Counting its parameters is good practice in reading an architecture:

```python run title="Where GPT-2 Small's 124 million parameters live"
V, ctx, d, layers = 50257, 1024, 768, 12

embeddings = V * d + ctx * d                         # token table + learned positions
attention = 3 * (d * d + d) + (d * d + d)            # Q, K, V projections + output projection, with biases
ffn = (d * 4 * d + 4 * d) + (4 * d * d + d)          # up to 3,072 and back down
norms = 2 * (2 * d)                                  # two layer norms per block, scale and shift
per_block = attention + ffn + norms
total = embeddings + layers * per_block + 2 * d      # plus a final layer norm; output head shares the token table

print(f"embeddings       {embeddings:>12,}")
print(f"one block        {per_block:>12,}  (attention {attention:,}, feed-forward {ffn:,})")
print(f"all 12 blocks    {layers * per_block:>12,}")
print(f"total            {total:>12,}")
```

Two-thirds of each block's parameters sit in the feed-forward network, not in attention. The output layer reuses the token embedding table (**weight tying**), which saves another 38 million parameters.

## The 2020s block

Modern open models keep the same skeleton with three upgrades: **RMSNorm** instead of LayerNorm, **SwiGLU** (a gated feed-forward using SiLU) instead of GELU, and **RoPE** instead of learned positions. Normalising before each part (**pre-norm**) is now universal because it trains deep stacks more stably than the original post-norm design.

```quiz
- q: What does a residual connection do?
  options: ["Adds the block's input to its output, giving gradients a direct path", "Removes half the neurons", "Normalises the input", "Shares keys and values"]
  answer: 0
- q: In GPT-2 Small, where are most of each block's parameters?
  options: ["In layer norms", "In the feed-forward network", "In the positional table", "In the attention softmax"]
  answer: 1
```

# BERT, GPT and T5 {#bert-gpt}

The same blocks are arranged three ways, depending on the job.

| Family | Sees | Trained to | Good at | Examples |
|---|---|---|---|---|
| **Encoder** | The whole text, both directions | Fill in masked words | Understanding: classification, search embeddings, named entities | BERT, RoBERTa, ModernBERT |
| **Decoder** | Only earlier tokens (causal mask) | Predict the next token | Generating text, chat, code | GPT, Llama, Claude, Mistral |
| **Encoder–decoder** | Encoder reads the input; decoder writes the output | Rebuild corrupted spans | Translation, summarisation | T5, BART, Whisper |

## How BERT learns: masked words

BERT hides 15% of the tokens and learns to guess them from both sides. Of the chosen tokens, 80% become `[MASK]`, 10% become a random token and 10% stay unchanged, so the model can't rely on seeing `[MASK]` at test time.

```python run title="BERT-style masking"
import numpy as np
rng = np.random.default_rng(4)
tokens = "vana vakaenda kuchikoro mangwanani vachifara uye vakadzidza zvakawanda nhasi".split()
vocab = sorted(set(tokens))

masked, targets = [], []
for tok in tokens:
    if rng.random() < 0.15 * 2:               # doubled here so this short sentence shows a few masks
        targets.append(tok)
        r = rng.random()
        masked.append("[MASK]" if r < 0.8 else rng.choice(vocab) if r < 0.9 else tok)
    else:
        targets.append("-")
        masked.append(tok)
print("input :", " ".join(masked))
print("learn :", " ".join(targets))
```

## How GPT learns: shift by one

A GPT learns from every position at once. The targets are simply the input shifted one place left, and the causal mask stops each position from seeing its own answer.

```python run title="One sentence, many training examples"
tokens = ["Kuziva", "mbuya", "huudzwa", "."]
inputs, targets = tokens[:-1], tokens[1:]
for i in range(len(inputs)):
    print(f"sees {inputs[:i + 1]!s:35} -> should predict {targets[i]!r}")
```

Training is parallel, because every position is predicted in one pass. Generation is serial, because each new token depends on the last. That asymmetry is why inference speed tricks matter so much (lesson 11).

```quiz
- q: Which family would you choose to turn documents into embeddings for search?
  options: ["Decoder only", "Encoder (BERT-style)", "None: use a tokenizer", "A diffusion model"]
  answer: 1
- q: For GPT training, what are the targets?
  options: ["The input reversed", "The input shifted one position to the left", "Random tokens", "The masked tokens only"]
  answer: 1
```

# Train a Tiny GPT in Your Browser {#tiny-gpt}

Now the real thing: a working GPT, written in NumPy with its backward pass by hand, trained on **Shona proverbs** (tsumo). It is tiny (one block, one head, 32 dimensions, about 15,000 parameters) and it reads **characters**, not BPE tokens, so you can watch it learn spelling from nothing. Training takes a few seconds.

```python run title="A one-block GPT, trained from scratch"
import numpy as np

text = """Chara chimwe hachitswanyi inda.
Kandiro kanoenda kunobva kamwe.
Nzou hairemerwi nenyanga dzayo.
Rina manyanga hariputirwe.
Mwana asingachemi anofira mumbereko.
Gudo guru peta muswe.
Kure kwegava ndokusina mutsubvu.
Chisi hachieri musi wacharimwa.
Mbudzi kudya mufenje hufana nyina.
Zano marairwa.
Kuziva mbuya huudzwa.
Seka urema wafa.
Chinokura chinokotama.
"""
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}
data = np.array([stoi[c] for c in text])
V, T, D, H = len(chars), 24, 32, 128          # vocabulary, context, model width, feed-forward width
rng = np.random.default_rng(0)

def w(*shape, fan):
    return rng.normal(0, fan ** -0.5, shape)
p = {"E": rng.normal(0, 0.1, (V, D)), "P": rng.normal(0, 0.1, (T, D)),
     "Wq": w(D, D, fan=D), "Wk": w(D, D, fan=D), "Wv": w(D, D, fan=D), "Wo": w(D, D, fan=D) * 0.5,
     "W1": w(D, H, fan=D), "b1": np.zeros(H), "W2": w(H, D, fan=H) * 0.5, "b2": np.zeros(D),
     "Wout": w(D, V, fan=D), "bout": np.zeros(V)}
MASK = np.triu(np.full((T, T), -1e9), k=1)

def forward(idx, targets=None):
    t = idx.shape[1]
    x = p["E"][idx] + p["P"][:t]                                   # token + position embeddings
    q, k, v = x @ p["Wq"], x @ p["Wk"], x @ p["Wv"]
    s = q @ k.transpose(0, 2, 1) / np.sqrt(D) + MASK[:t, :t]       # causal self-attention
    A = np.exp(s - s.max(-1, keepdims=True)); A /= A.sum(-1, keepdims=True)
    a = A @ v
    x2 = x + a @ p["Wo"]                                           # residual
    hpre = x2 @ p["W1"] + p["b1"]; h = np.maximum(hpre, 0)
    x3 = x2 + h @ p["W2"] + p["b2"]                                # feed-forward + residual
    logits = x3 @ p["Wout"] + p["bout"]
    if targets is None:
        return logits, None, None
    z = np.exp(logits - logits.max(-1, keepdims=True)); probs = z / z.sum(-1, keepdims=True)
    n = idx.size
    loss = -np.log(probs.reshape(n, V)[np.arange(n), targets.ravel()]).mean()
    return logits, loss, (idx, x, q, k, v, A, a, x2, hpre, h, x3, probs, targets)

def backward(cache):
    idx, x, q, k, v, A, a, x2, hpre, h, x3, probs, targets = cache
    B, t = idx.shape
    g = {}
    dl = probs.reshape(B * t, V).copy(); dl[np.arange(B * t), targets.ravel()] -= 1
    dl = dl.reshape(B, t, V) / (B * t)
    g["Wout"], g["bout"] = x3.reshape(-1, D).T @ dl.reshape(-1, V), dl.sum((0, 1))
    dx3 = dl @ p["Wout"].T
    g["W2"], g["b2"] = h.reshape(-1, H).T @ dx3.reshape(-1, D), dx3.sum((0, 1))
    dh = dx3 @ p["W2"].T * (hpre > 0)
    g["W1"], g["b1"] = x2.reshape(-1, D).T @ dh.reshape(-1, H), dh.sum((0, 1))
    dx2 = dx3 + dh @ p["W1"].T
    g["Wo"] = a.reshape(-1, D).T @ dx2.reshape(-1, D)
    da = dx2 @ p["Wo"].T
    dA, dv = da @ v.transpose(0, 2, 1), A.transpose(0, 2, 1) @ da
    ds = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(D)   # backward through softmax
    dq, dk = ds @ k, ds.transpose(0, 2, 1) @ q
    xf = x.reshape(-1, D)
    g["Wq"], g["Wk"], g["Wv"] = xf.T @ dq.reshape(-1, D), xf.T @ dk.reshape(-1, D), xf.T @ dv.reshape(-1, D)
    dx = dx2 + dq @ p["Wq"].T + dk @ p["Wk"].T + dv @ p["Wv"].T
    g["E"] = np.zeros_like(p["E"]); np.add.at(g["E"], idx, dx)
    g["P"] = np.zeros_like(p["P"]); g["P"][:t] = dx.sum(0)
    return g

print(f"vocabulary {V} characters, {sum(v.size for v in p.values()):,} parameters")
m = {n: np.zeros_like(v) for n, v in p.items()}; s2 = {n: np.zeros_like(v) for n, v in p.items()}
for step in range(1, 601):                                         # Adam, batches of 16 windows
    ix = rng.integers(0, len(data) - T - 1, 16)
    idx = np.stack([data[i:i + T] for i in ix]); tg = np.stack([data[i + 1:i + T + 1] for i in ix])
    _, loss, cache = forward(idx, tg)
    g = backward(cache)
    for n in p:
        m[n] = 0.9 * m[n] + 0.1 * g[n]; s2[n] = 0.99 * s2[n] + 0.01 * g[n] ** 2
        p[n] -= 6e-3 * (m[n] / (1 - 0.9 ** step)) / (np.sqrt(s2[n] / (1 - 0.99 ** step)) + 1e-8)
    if step % 150 == 0:
        print(f"step {step}: loss {loss:.3f}")

def generate(start, n=100, temperature=0.8):
    out = [stoi[c] for c in start]
    for _ in range(n):
        logits = forward(np.array([out[-T:]]))[0][0, -1] / temperature
        pr = np.exp(logits - logits.max()); pr /= pr.sum()
        out.append(rng.choice(V, p=pr))
    return "".join(chars[i] for i in out)

print("\n" + generate("Mwana "))
```

Read the output carefully. Most lines are proverbs the model memorised. But look for **new** lines that stitch the start of one proverb to the end of another: the model learned which characters tend to follow which, not a list of sentences. That is generation, at the smallest possible scale.

## What makes a real LLM different

| | This tiny GPT | GPT-2 Small | Llama 3 8B |
|---|---|---|---|
| Tokens | 34 characters | 50,257 BPE tokens | 128,256 BPE tokens |
| Blocks × heads | 1 × 1 | 12 × 12 | 32 × 32 |
| Width | 32 | 768 | 4,096 |
| Context | 24 characters | 1,024 tokens | 8,192 tokens (128K in 3.1) |
| Parameters | about 15 thousand | 124 million | 8 billion |
| Training text | 359 characters | about 40 GB of web pages | over 15 trillion tokens |

The code is the same in spirit. What changes is scale, the tokenizer, normalisation, many blocks and heads, and a lot of engineering to spread the work across thousands of GPUs.

## Experiments

1. Raise `temperature` to 1.5, then lower it to 0.3. What changes?
2. Replace the proverbs with your own text: song lyrics you wrote, a school essay, a list of names. Keep it under a few thousand characters so training stays quick.
3. Set `T = 8`. With a shorter context, does it still finish proverbs correctly?
4. Train for only 150 steps and generate. What does a half-trained language model produce?

```quiz
- q: Why does the tiny GPT sometimes write a "proverb" that isn't in its training text?
  options: ["It is broken", "It learned which characters follow which, and can combine patterns in new ways", "It searches the internet", "Random tokens are added on purpose"]
  answer: 1
- q: Which change does NOT make this model more like a real LLM?
  options: ["A BPE tokenizer", "More blocks and heads", "Training on far more text", "Removing the causal mask"]
  answer: 3
```

# Sampling: Choosing the Next Token {#sampling}

The model outputs a probability for every token. How you pick from those probabilities changes the text completely.

| Strategy | How it picks | Effect |
|---|---|---|
| **Greedy** | Always the most likely token | Safe but repetitive; can loop |
| **Temperature** | Divide the scores by `T` before softmax | `T < 1` sharper and safer, `T > 1` flatter and more creative |
| **Top-k** | Sample only from the `k` most likely tokens | Cuts off nonsense from the long tail |
| **Top-p** (nucleus) | Sample from the smallest set of tokens whose probabilities add up to `p` | Adapts: few choices when sure, many when unsure |

```python run title="The same scores, four ways"
import numpy as np
rng = np.random.default_rng(0)
tokens = ["sadza", "rice", "chips", "bread", "porridge", "pizza", "cake", "grass"]
scores = np.array([3.0, 2.2, 1.6, 1.5, 1.2, 0.3, 0.1, -2.0])   # "For dinner we ate ..."

def softmax(z):
    e = np.exp(z - z.max()); return e / e.sum()

def top_p(probs, p):
    order = np.argsort(probs)[::-1]
    keep = order[: np.searchsorted(np.cumsum(probs[order]), p) + 1]
    out = np.zeros_like(probs); out[keep] = probs[keep]
    return out / out.sum()

for temp in [0.5, 1.0, 2.0]:
    pr = softmax(scores / temp)
    print(f"temperature {temp}: " + "  ".join(f"{t} {v:.2f}" for t, v in zip(tokens, pr) if v >= 0.02))

pr = softmax(scores)
print("\ngreedy always picks:", tokens[int(pr.argmax())])
nucleus = top_p(pr, 0.8)
print("top-p 0.8 keeps:", [t for t, v in zip(tokens, nucleus) if v > 0])
print("10 samples from top-p:", [str(t) for t in rng.choice(tokens, size=10, p=nucleus)])
```

Most chat products use a temperature around 0.7 with top-p around 0.9. For code, maths and data extraction, use a low temperature (0 to 0.3) so answers are repeatable.

````challenge
id: tf-top-p
title: Nucleus (top-p) filtering
difficulty: medium
prompt: |
  Write `top_p(probs, p)`. Keep the **smallest** set of the most likely tokens whose probabilities add up to **at least** `p`; set every other probability to 0; then renormalise so the result sums to 1. Return a NumPy array the same length as `probs`.
starter: |
  import numpy as np

  def top_p(probs, p):
      pass

  print(top_p(np.array([0.5, 0.2, 0.2, 0.1]), 0.7))
tests: |
  import numpy as np
  r = top_p(np.array([0.5, 0.2, 0.2, 0.1]), 0.7)
  assert np.isclose(r.sum(), 1.0)
  assert (r > 0).sum() == 2 and np.isclose(r[0], 0.5 / 0.7), r
  assert np.allclose(top_p(np.array([0.1, 0.6, 0.3]), 0.5), [0, 1, 0]), "Only the top token is needed for p = 0.5"
  assert np.allclose(top_p(np.array([0.25, 0.25, 0.25, 0.25]), 1.0), [0.25] * 4)
  r = top_p(np.array([0.05, 0.4, 0.15, 0.4]), 0.9)
  assert (r > 0).sum() == 3 and r[0] == 0, r
````

```quiz
- q: Which setting suits extracting invoice totals into JSON?
  options: ["Temperature 1.5", "Temperature close to 0", "Top-k = 1,000", "Removing softmax"]
  answer: 1
- q: What does top-p sampling keep?
  options: ["Exactly p tokens", "The smallest set of likely tokens whose probabilities add up to p", "Only tokens with probability above p", "A random p% of the vocabulary"]
  answer: 1
```

# How Chat Models Are Made {#training-llms}

A raw model trained on web text is a **base model**: brilliant at continuing text, useless at following instructions. Ask it a question and it may answer with three more questions. Chat models go through three stages.

```sketch
title: "From base model to assistant"
caption: "Pre-training gives knowledge; supervised fine-tuning teaches the assistant format; preference training teaches which answers people prefer."
cellW: 190
nodes:
  - id: pt
    label: "Pre-training"
    sub: "trillions of tokens, next-token loss"
    col: 0
    row: 0
    shape: box
    tone: sky
  - id: base
    label: "Base model"
    col: 0
    row: 1.3
    shape: pill
  - id: sft
    label: "Supervised fine-tuning"
    sub: "thousands of example chats"
    col: 1.3
    row: 0
    shape: box
    tone: teal
  - id: inst
    label: "Instruction model"
    col: 1.3
    row: 1.3
    shape: pill
  - id: pref
    label: "Preference training"
    sub: "RLHF, DPO or GRPO"
    col: 2.6
    row: 0
    shape: box
    tone: gold
  - id: chat
    label: "Assistant"
    col: 2.6
    row: 1.3
    shape: pill
    tone: grape
edges:
  - from: pt
    to: base
  - from: base
    to: sft
  - from: sft
    to: inst
  - from: inst
    to: pref
  - from: pref
    to: chat
```

## 1. Pre-training: how much data?

The 2022 **Chinchilla** paper found that, for a fixed compute budget, the best results come from about **20 training tokens per parameter**. Its 70-billion-parameter model, trained on 1.4 trillion tokens, beat much bigger models trained on less. Today's open models train far longer than that (Llama 3 8B saw over 15 trillion tokens), because a smaller model that has read more is cheaper to run for millions of users.

```python run title="Tokens per parameter"
models = [("Chinchilla 70B", 70e9, 1.4e12), ("Llama 2 7B", 7e9, 2e12), ("Llama 3 8B", 8e9, 15e12)]
for name, params, tokens in models:
    print(f"{name:15} {tokens / params:7,.0f} tokens per parameter")
```

## 2. Supervised fine-tuning (SFT)

SFT trains on example conversations written or checked by people. The trick is in the loss: the model learns only from the **assistant's** tokens. The user's words are part of the input but contribute nothing to the loss, so the model learns to answer, not to imitate users.

```python run title="The SFT loss mask"
tokens = ["<user>", "What", "is", "sadza", "?", "<assistant>", "A", "thick", "maize", "porridge", ".", "<end>"]
start = tokens.index("<assistant>") + 1
for i, t in enumerate(tokens):
    print(f"{t:12} {'learn from this' if i >= start else '(no loss)'}")
```

## 3. Learning from preferences

People compare two answers and pick the better one. Two ways to learn from those comparisons:

- **RLHF** (used for InstructGPT and the first ChatGPT): train a **reward model** to score answers, then improve the language model with reinforcement learning (PPO) to earn higher scores, while a penalty keeps it close to the SFT model. In OpenAI's InstructGPT paper, people preferred a 1.3-billion-parameter tuned model over the 175-billion-parameter GPT-3.
- **DPO** (Direct Preference Optimisation, 2023): skip the reward model and the RL loop. A single loss directly raises the probability of the chosen answer relative to the rejected one, measured against a frozen copy of the starting model. It is simpler and cheaper, and widely used for open models.

```python run title="The DPO loss for one preference pair"
import math

def dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, beta=0.1):
    # inputs are log-probabilities of each full answer
    margin = beta * ((policy_chosen - ref_chosen) - (policy_rejected - ref_rejected))
    return -math.log(1 / (1 + math.exp(-margin))), margin

ref = (-12.0, -11.0)                      # the frozen model slightly prefers the worse answer
for policy in [(-12.0, -11.0), (-10.0, -13.0), (-8.0, -16.0)]:
    loss, margin = dpo_loss(*policy, *ref)
    print(f"policy log-probs chosen {policy[0]}, rejected {policy[1]} -> margin {margin:+.2f}, loss {loss:.3f}")
```

As training moves probability towards the chosen answer, the margin grows and the loss falls.

**Reasoning models** add a fourth stage: reinforcement learning on problems with checkable answers, such as maths and code. DeepSeek's **GRPO** samples a group of answers to each question and rewards the ones better than the group's average, with no separate reward model.

```quiz
- q: In supervised fine-tuning, which tokens contribute to the loss?
  options: ["Every token", "Only the assistant's reply tokens", "Only the user's tokens", "Only special tokens"]
  answer: 1
- q: What does DPO remove compared with RLHF?
  options: ["The preference data", "The separate reward model and reinforcement-learning loop", "The tokenizer", "Supervised fine-tuning"]
  answer: 1
- q: Roughly how many training tokens per parameter did Chinchilla find compute-optimal?
  options: ["1", "20", "1,000", "1 million"]
  answer: 1
```

# Making Big Models Fast and Cheap {#efficient}

Four ideas make large models practical to run and adapt. **[Inference Engineering](/learn/inference-engineering)** goes deeper into serving them.

## 1. The KV cache

When generating, each new token needs the keys and values of **every** earlier token. Recomputing them every step would waste almost all the work, so the model stores them: the **KV cache**. It makes generation fast but uses a lot of memory.

```python run title="KV cache memory for Llama 3 8B"
layers, kv_heads, head_dim, bytes_per_number = 32, 8, 128, 2      # 16-bit numbers
per_token = 2 * layers * kv_heads * head_dim * bytes_per_number      # 2 = one key + one value
print(f"KV cache per token: {per_token / 1024:.0f} KB")
for context in [1_000, 8_000, 128_000]:
    print(f"  {context:>7,} tokens of context -> {per_token * context / 2**30:5.1f} GB per conversation")
print("Without grouped-query attention (32 KV heads) it would be 4x larger.")
```

## 2. Quantisation

Storing each weight in 8 or 4 bits instead of 16 cuts memory by 2 to 4 times, usually with a small quality loss. That is how 8-billion-parameter models run on laptops and phones. The simplest scheme scales each row of weights into the integer range.

```python run title="8-bit quantisation of a weight matrix"
import numpy as np
rng = np.random.default_rng(0)
W = rng.normal(0, 0.02, (256, 256)).astype(np.float32)

scale = np.abs(W).max(axis=1, keepdims=True) / 127          # one scale per row
W_int8 = np.round(W / scale).astype(np.int8)
W_back = W_int8.astype(np.float32) * scale

x = rng.normal(size=(1, 256)).astype(np.float32)
err = np.abs(x @ W - x @ W_back).mean() / np.abs(x @ W).mean()
print(f"memory: {W.nbytes // 1024} KB -> {W_int8.nbytes // 1024} KB (+ a few scales)")
print(f"average output error: {err:.2%}")
```

## 3. LoRA: fine-tune without touching the weights

Fine-tuning all 8 billion weights needs huge GPUs. **LoRA** freezes the original weights and learns a small update `B·A`, where `A` and `B` are thin matrices of **rank** `r`. For a 4,096 × 4,096 layer with `r = 8`, that is 65,536 trainable numbers instead of 16.8 million. **QLoRA** adds 4-bit quantisation of the frozen weights, which lets people fine-tune large models on a single GPU.

```python run title="LoRA in a few lines"
import numpy as np
rng = np.random.default_rng(0)
d, r = 4096, 8
W = rng.normal(0, 0.02, (d, d))          # frozen pre-trained weights
A = rng.normal(0, 0.01, (r, d))          # trainable, small
B = np.zeros((d, r))                     # trainable, starts at zero so training begins exactly at W

x = rng.normal(size=(1, d))
y = x @ W + (x @ A.T) @ B.T              # the low-rank detour adds B·A to W without building it
print(f"full layer: {W.size:,} weights   LoRA adds: {A.size + B.size:,} ({(A.size + B.size) / W.size:.2%})")
print("output unchanged at the start:", np.allclose(y, x @ W))
```

## 4. Mixture of experts

A **mixture-of-experts** (MoE) layer replaces one feed-forward network with many "experts" and a **router** that sends each token to only the top few. The model has many parameters but uses only a fraction per token. Mixtral 8×7B has about 47 billion parameters and uses about 13 billion per token; DeepSeek-V3 has 671 billion and uses 37 billion.

```python run title="A top-2 router"
import numpy as np
rng = np.random.default_rng(0)
n_experts, d = 8, 16
tokens = rng.normal(size=(6, d))
W_router = rng.normal(0, d ** -0.5, (d, n_experts))

scores = tokens @ W_router
for i, s in enumerate(scores):
    top2 = np.argsort(s)[-2:][::-1]
    gate = np.exp(s[top2]) / np.exp(s[top2]).sum()
    print(f"token {i}: experts {top2.tolist()} with weights {gate.round(2).tolist()}")
```

Routers are trained with an extra loss that balances the load, so no expert is overworked while others sit idle.

```quiz
- q: What does the KV cache store?
  options: ["The training data", "Keys and values of earlier tokens, so they aren't recomputed", "The tokenizer's merges", "Gradients"]
  answer: 1
- q: Why does LoRA make fine-tuning cheap?
  options: ["It deletes layers", "It trains only small low-rank matrices and freezes the original weights", "It skips the forward pass", "It uses a smaller vocabulary"]
  answer: 1
- q: In a mixture-of-experts model, how many experts does each token use?
  options: ["All of them", "Only the few chosen by the router", "None", "Exactly one per layer, always the same"]
  answer: 1
```

# Capstone: Read a Real Model {#capstone}

You can now read the architecture of any open model. Every one keeps the same core and turns a handful of knobs.

| Model | Year | Parameters (used per token) | Norm | Feed-forward | Positions | Attention |
|---|---|---|---|---|---|---|
| GPT-2 Small | 2019 | 124M | LayerNorm | GELU | Learned | Multi-head |
| Llama 3 8B | 2024 | 8B | RMSNorm | SwiGLU | RoPE | GQA (32 query, 8 KV heads) |
| Mistral 7B | 2023 | 7.3B | RMSNorm | SwiGLU | RoPE | GQA + sliding window |
| Mixtral 8×7B | 2023 | 47B (13B) | RMSNorm | SwiGLU experts, top-2 of 8 | RoPE | GQA |
| DeepSeek-V3 | 2024 | 671B (37B) | RMSNorm | Experts, top-8 of 256 + 1 shared | RoPE | Multi-head latent attention |

## Reading a config.json

Every model on the Hugging Face Hub ships a `config.json`. From it you can work out the size, the memory it needs and the cost of its KV cache before downloading anything.

```python run title="Llama 3 8B from its config"
config = {                               # the key fields from Meta-Llama-3-8B/config.json
    "vocab_size": 128256, "hidden_size": 4096, "intermediate_size": 14336,
    "num_hidden_layers": 32, "num_attention_heads": 32, "num_key_value_heads": 8,
    "tie_word_embeddings": False,
}
d, L = config["hidden_size"], config["num_hidden_layers"]
head_dim = d // config["num_attention_heads"]
kv_dim = config["num_key_value_heads"] * head_dim

embed = config["vocab_size"] * d * (1 if config["tie_word_embeddings"] else 2)    # input table + output head
attn = d * d + 2 * d * kv_dim + d * d               # Q, K, V (smaller, thanks to GQA), output
mlp = 3 * d * config["intermediate_size"]           # SwiGLU has gate, up and down projections
norms = 2 * d
total = embed + L * (attn + mlp + norms) + d

print(f"parameters: {total / 1e9:.2f} billion")
for name, bytes_per in [("16-bit", 2), ("8-bit", 1), ("4-bit", 0.5)]:
    print(f"  weights in {name}: {total * bytes_per / 2**30:5.1f} GB")
```

That is why an 8B model needs a 16 GB GPU in 16-bit but fits a laptop once quantised to 4 bits.

## Your project

Pick one and write up what you found in your own notes or a GitHub repo:

1. **Your own tiny GPT.** Train the model from lesson 8 on a few thousand characters of text you care about. Compare temperatures 0.3, 0.8 and 1.2, and explain the differences.
2. **The multilingual tax.** Using lesson 2's BPE code, train on English and test on Shona or Ndebele, then train on a mix and test again. How many tokens per word in each case?
3. **Model sizing.** Find the `config.json` of two open models on the Hugging Face Hub. Compute their parameters, their weight memory at 4 bits, and their KV cache for 8,000 tokens.

> **Credit.** Adapted and extended from Phases 7 and 10 of *[AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch)* by Rohit Ghumare (MIT License).

```quiz
- q: Which three choices do almost all modern open LLMs share?
  options: ["LayerNorm, ReLU, learned positions", "RMSNorm, SwiGLU, RoPE", "BatchNorm, sigmoid, ALiBi", "No normalisation, tanh, sinusoidal"]
  answer: 1
- q: Roughly how much memory do Llama 3 8B's weights need in 16-bit?
  options: ["About 1.5 GB", "About 15 GB", "About 150 GB", "About 1.5 TB"]
  answer: 1
```

```exam
- q: "What does a GPT-style model predict at each step?"
  options: ["The whole answer", "The next token", "A summary", "The previous token"]
  answer: 1
- q: "Why do modern LLMs use subword tokenizers like BPE?"
  options: ["They avoid both very long character sequences and unknown words", "They are the only way to store text", "They remove punctuation", "They translate text"]
  answer: 0
- q: "In attention, what are queries compared with?"
  options: ["Values", "Keys", "Gradients", "Positions only"]
  answer: 1
- q: "Why are attention scores divided by the square root of the head dimension?"
  options: ["To keep scores near size 1 so softmax doesn't saturate", "To save memory", "To make the mask work", "To reduce the vocabulary"]
  answer: 0
- q: "What does the causal mask stop?"
  options: ["Positions attending to later positions", "Tokens attending to themselves", "Gradients flowing", "The model using GPUs"]
  answer: 0
- q: "Which positional method rotates queries and keys so scores depend only on distance?"
  options: ["Learned positions", "ALiBi", "RoPE", "Sinusoidal"]
  answer: 2
- q: "Which model family is best suited to producing embeddings for search?"
  options: ["Encoder (BERT-style)", "Decoder (GPT-style)", "Diffusion", "None"]
  answer: 0
- q: "In SFT, why are the user's tokens excluded from the loss?"
  options: ["So the model learns to answer, not to imitate users", "To save memory", "They can't be tokenized", "To speed up sampling"]
  answer: 0
- q: "What does the KV cache trade?"
  options: ["Memory for speed: stored keys and values avoid recomputation", "Accuracy for vocabulary size", "Training data for parameters", "Speed for safety"]
  answer: 0
- q: "A mixture-of-experts model has 47B parameters but uses about 13B per token because..."
  options: ["A router sends each token to only a few experts", "Most weights are zero", "It is quantised", "It skips attention"]
  answer: 0
```
