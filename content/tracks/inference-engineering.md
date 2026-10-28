---
id: inference-engineering
title: Inference Engineering
short: INFERENCE
category: ai
level: advanced
language: python
color: "#5A2A27"
icon: "⚡"
order: 50.5
premium: true
preview: 2
summary: Make models fast and affordable. Understand prefill and decode, the KV cache, continuous batching, quantization, speculative decoding, serving stacks and GPUs, and the cost engineering every API user needs. Each idea comes with a back-of-the-envelope model you can run.
tags: [inference, llm serving, kv cache, batching, quantization, speculative decoding, vllm, latency, cost optimization, gpu]
---

# What Inference Engineering Is {#intro}

**Training** builds a model once. **Inference** runs it, millions of times, for every user request. For most products, inference is where the money goes and where users feel the speed. **Inference engineering** is the craft of serving models with the **latency** users need, the **throughput** the business needs, at a **cost** that makes sense, without hurting **quality**.

```sketch
title: The life of one LLM request
caption: Time to first token is queueing plus prefill. After that, each new token costs one decode step.
cellW: 160
cellH: 100
nodes:
  - id: req
    label: Request
    sub: 2,000-token prompt
    col: 0
    row: 0
    shape: pill
    tone: sky
  - id: queue
    label: Queue
    sub: wait for a slot
    col: 1.2
    row: 0
    shape: round
  - id: prefill
    label: Prefill
    sub: read whole prompt at once
    col: 2.4
    row: 0
    shape: round
    tone: gold
  - id: t1
    label: First token
    col: 3.6
    row: 0
    shape: dot
  - id: decode
    label: Decode loop
    sub: one token per step
    col: 3.6
    row: 1.1
    shape: round
    tone: grape
  - id: done
    label: Done
    sub: 300 tokens out
    col: 4.8
    row: 1.1
    shape: pill
    tone: teal
edges:
  - from: req
    to: queue
  - from: queue
    to: prefill
  - from: prefill
    to: t1
    label: TTFT
  - from: t1
    to: decode
  - from: decode
    to: decode
    label: next token
  - from: decode
    to: done
```

## The metrics that matter

| Metric | Meaning | Users feel it as… |
|---|---|---|
| **TTFT** (time to first token) | Queue + prefill time | "Did it start answering?" |
| **TPOT / ITL** (time per output token / inter-token latency) | Time between generated tokens | Reading speed of the stream |
| **End-to-end latency** | TTFT + output tokens × TPOT | Waiting for a full answer or a tool call |
| **Throughput** | Tokens (or requests) per second across all users | How many users a GPU serves |
| **Goodput** | Throughput that **meets** the latency targets | What actually counts |
| **Cost per 1M tokens / per task** | Money | The business case |

Always look at **percentiles** (p50, p95, p99), not averages: one in twenty users hitting a 20-second wait is a problem even if the average is 2 seconds.

## The triangle

You trade between **latency**, **throughput/cost** and **quality**. Bigger batches raise throughput but slow each request; smaller models are faster and cheaper but may be worse; caching helps everything but must stay correct. Every technique in this track moves you around that triangle.

```python run title="End-to-end latency from first principles"
def latency(prompt_tokens, output_tokens, prefill_tok_per_s=8000, decode_tok_per_s=60, queue_s=0.2):
    ttft = queue_s + prompt_tokens / prefill_tok_per_s
    total = ttft + output_tokens / decode_tok_per_s
    return ttft, total

for name, p, o in [("chat reply", 1500, 250), ("RAG answer", 8000, 400), ("agent tool call", 12000, 60), ("long report", 3000, 3000)]:
    ttft, total = latency(p, o)
    print(f"{name:16} prompt={p:>6} out={o:>5}  TTFT={ttft:4.1f}s  total={total:5.1f}s")
```

Notice: the agent's tool call has a long prompt but few output tokens, so TTFT dominates; the long report is all decode. Different workloads need different optimisations.

```quiz
- q: A user complains the assistant "takes ages to start answering". Which metric?
  options: ["TPOT", "TTFT", "Throughput", "Cost per token"]
  answer: 1
- q: Why report p95 latency instead of only the average?
  options: ["Averages are illegal", "Averages hide the slow tail that a meaningful share of users experience", "p95 is always lower", "It's cheaper to compute"]
  answer: 1
- q: What is goodput?
  options: ["Total tokens per second", "Throughput that meets your latency targets", "GPU utilisation", "Cache hit rate"]
  answer: 1
```

# Prefill and Decode {#prefill-decode}

Transformers generate text **autoregressively**: each new token depends on all previous tokens. Inference has two very different phases.

| Phase | What happens | Bottleneck |
|---|---|---|
| **Prefill** | The whole prompt is processed **in parallel** in one forward pass, producing the first token and the KV cache | **Compute** (lots of matrix maths, the GPU is busy) |
| **Decode** | One token per forward pass, each reading **all the model weights** and the KV cache from memory | **Memory bandwidth** (the GPU mostly waits for data) |

```sketch
title: Why decode is memory-bound
caption: Each decode step moves all weights from GPU memory to the compute units to produce a single token per sequence. Batching many sequences reuses that one read.
cellW: 190
cellH: 110
nodes:
  - id: hbm
    label: GPU memory (HBM)
    sub: weights + KV cache
    col: 0
    row: 0.5
    shape: db
    tone: teal
    w: 1.1
  - id: sm
    label: Compute units
    sub: mostly idle in decode
    col: 2
    row: 0.5
    shape: box
    tone: gold
    w: 1.1
  - id: out
    label: 1 token per sequence
    col: 3.6
    row: 0.5
    shape: pill
    tone: grape
edges:
  - from: hbm
    to: sm
    label: "~all weights per step"
  - from: sm
    to: out
```

A rule of thumb for decode speed of a single sequence: **tokens/second ≈ memory bandwidth ÷ bytes read per token** (mostly the model weights). That's why smaller and quantized models decode faster, and why batching helps: one weight read serves every sequence in the batch.

```python run title="Estimate decode speed from model size and memory bandwidth"
GPUS = {"datacentre GPU (3.3 TB/s)": 3.3e12, "workstation GPU (1.0 TB/s)": 1.0e12, "laptop (0.1 TB/s)": 0.1e12}
MODELS = {"8B params": 8e9, "70B params": 70e9}
BYTES = {"FP16": 2, "INT8": 1, "INT4": 0.5}

for gpu, bw in GPUS.items():
    print(gpu)
    for model, params in MODELS.items():
        row = []
        for fmt, b in BYTES.items():
            weights = params * b
            tok_s = bw / weights * 0.7          # ~70% of peak bandwidth is realistic
            row.append(f"{fmt} {tok_s:6.0f} tok/s")
        print(f"   {model:10} " + " | ".join(row))
```

These are **upper bounds for one sequence**; KV-cache reads, kernel overheads and batching change the picture, but the shape is right: decode speed tracks **bytes moved**, not FLOPs.

```quiz
- q: Which phase processes the whole prompt in parallel?
  options: ["Decode", "Prefill", "Sampling", "Tokenisation"]
  answer: 1
- q: Why is single-sequence decode usually memory-bandwidth bound?
  options: ["It does too much maths", "Each step must read (almost) all weights from memory to produce one token", "Networks are slow", "Prompts are long"]
  answer: 1
- q: Halving the bytes per weight (FP16 → INT8) roughly does what to decode speed?
  options: ["Halves it", "Roughly doubles the upper bound", "No change", "Makes it 10× faster"]
  answer: 1
```

# The KV Cache {#kv-cache}

During attention, each token produces a **key** and a **value** vector per layer. Decode step *t* needs the keys and values of **all previous tokens**. Recomputing them every step would be quadratic; instead servers **cache** them: the **KV cache**.

## How big is it?

```text
KV bytes per token = 2 (K and V) × layers × kv_heads × head_dim × bytes_per_value
KV bytes per sequence = that × tokens in the sequence
```

**Grouped-query attention (GQA)** lets many query heads share fewer key/value heads, shrinking the cache several-fold, which is why modern models use it.

```python run title="KV cache memory calculator"
def kv_bytes_per_token(layers, kv_heads, head_dim, bytes_per_value=2):
    return 2 * layers * kv_heads * head_dim * bytes_per_value

models = {
    "8B, full multi-head (32 KV heads)": dict(layers=32, kv_heads=32, head_dim=128),
    "8B, GQA (8 KV heads)": dict(layers=32, kv_heads=8, head_dim=128),
    "70B, GQA (8 KV heads)": dict(layers=80, kv_heads=8, head_dim=128),
}
for name, cfg in models.items():
    per_tok = kv_bytes_per_token(**cfg)
    for ctx in (4_096, 32_768, 128_000):
        print(f"{name:34} ctx {ctx:>7,}: {per_tok * ctx / 2**30:6.2f} GiB per sequence")
    print()
```

At long contexts, **one sequence's KV cache can be bigger than a small model**. KV memory, not compute, usually limits how many users a GPU can serve at once.

## Techniques built on the KV cache

| Technique | Idea | Effect |
|---|---|---|
| **PagedAttention** (vLLM) | Store the KV cache in fixed-size blocks like virtual-memory pages | Almost no fragmentation, more sequences fit |
| **Prefix caching** | Keep KV blocks for common prefixes (system prompts, documents) and reuse them | Skips prefill for the shared part: lower TTFT and cost (this is what provider "prompt caching" is) |
| **Prefix-aware routing** | Send requests with the same prefix to the server that already caches it | Higher cache hit rate across a fleet |
| **KV cache quantization** | Store K/V in FP8 or INT8 | ~2× more context or users |
| **Tiered KV cache** | Spill cold KV blocks from GPU to CPU memory or a fast external store | Longer contexts and more reuse, at some latency cost |
| **Sliding window / eviction** | Keep only recent or important tokens' KV | Bounded memory for very long sessions |

Managed platforms now expose these directly: for example, AWS SageMaker AI added **prefix-aware routing** for endpoints and a **managed tiered KV cache** and **disaggregated prefill/decode** for HyperPod inference in 2026.

```exercise
prompt: Complete the KV cache size formula (per token).
code: |
  kv_bytes = ___ * layers * kv_heads * head_dim * bytes_per_value
answers: ["2"]
hint: One for keys, one for values.
```

```quiz
- q: What does grouped-query attention reduce?
  options: ["The vocabulary", "The number of key/value heads, and so the KV cache size", "The number of layers", "Prompt length"]
  answer: 1
- q: Provider "prompt caching" is essentially…
  options: ["Caching final answers", "Reusing the KV cache of a shared prompt prefix to skip prefill", "Caching embeddings", "Compressing prompts"]
  answer: 1
- q: What usually limits how many concurrent sequences a GPU can serve?
  options: ["Disk space", "KV cache memory", "CPU cores", "Network ports"]
  answer: 1
```

# Batching and Scheduling {#batching}

Because decode is memory-bound, processing **many sequences together** is nearly free per extra sequence until compute or memory runs out. The question is **how** to batch.

| Strategy | How | Problem / benefit |
|---|---|---|
| **Static batching** | Wait for N requests, run them together to completion | Short requests wait for the longest; GPU idles as sequences finish |
| **Dynamic batching** | Batch whatever arrived within a time window | Better, but still finishes as a group |
| **Continuous (in-flight) batching** | After **every decode step**, finished sequences leave and new ones join | GPU stays full; throughput often several times higher |
| **Chunked prefill** | Split long prompts into chunks interleaved with decode steps | Long prompts don't freeze everyone else's stream |
| **Disaggregated prefill/decode** | Separate GPU pools for prefill and decode; transfer KV between them | Each phase runs on hardware tuned for it; steadier latency |

```sketch
title: Static vs continuous batching
caption: With continuous batching, a finished slot is refilled at the next step instead of idling until the whole batch ends.
cellW: 120
cellH: 70
nodes:
  - id: s1
    label: "A ▇▇▇▇▇▇▇▇"
    col: 0
    row: 0
    shape: box
    w: 1.5
    h: 0.7
  - id: s2
    label: "B ▇▇░░░░░░"
    col: 0
    row: 1
    shape: box
    w: 1.5
    h: 0.7
  - id: s3
    label: "C ▇▇▇▇░░░░"
    col: 0
    row: 2
    shape: box
    w: 1.5
    h: 0.7
  - id: c1
    label: "A ▇▇▇▇▇▇▇▇"
    col: 2.6
    row: 0
    shape: box
    tone: teal
    w: 1.5
    h: 0.7
  - id: c2
    label: "B ▇▇ D ▇▇▇▇▇▇"
    col: 2.6
    row: 1
    shape: box
    tone: teal
    w: 1.5
    h: 0.7
  - id: c3
    label: "C ▇▇▇▇ E ▇▇▇▇"
    col: 2.6
    row: 2
    shape: box
    tone: teal
    w: 1.5
    h: 0.7
groups:
  - label: "Static: ░ = idle slot"
    nodes: [s1, s2, s3]
    tone: rose
  - label: "Continuous: slots refilled"
    nodes: [c1, c2, c3]
    tone: teal
```

```python run title="Simulate static vs continuous batching"
import random

random.seed(3)
requests = [random.choice([20, 40, 80, 200]) for _ in range(40)]   # output tokens per request
SLOTS = 8                                                          # max sequences in a batch

def static(reqs):
    steps = 0
    for i in range(0, len(reqs), SLOTS):
        steps += max(reqs[i:i + SLOTS])          # the batch runs until its longest member finishes
    return steps

def continuous(reqs):
    queue, active, steps = list(reqs), [], 0
    while queue or active:
        while queue and len(active) < SLOTS:     # refill free slots every step
            active.append(queue.pop(0))
        active = [r - 1 for r in active if r > 1]
        steps += 1
    return steps

total_tokens = sum(requests)
for name, fn in (("static", static), ("continuous", continuous)):
    steps = fn(requests)
    print(f"{name:10}: {steps:5} decode steps, {total_tokens / steps:4.1f} tokens per step (max {SLOTS})")
```

## Schedulers make trade-offs

- **Max batch size / max tokens in flight**: higher throughput vs higher per-request latency and KV pressure.
- **Priority**: interactive chat before background batch jobs.
- **Preemption**: when KV memory runs out, pause (and later recompute or swap) some sequences.
- **SLO-aware scheduling**: admit work only while p95 TTFT and TPOT targets hold. That's maximising **goodput**.

```quiz
- q: What does continuous batching change compared with static batching?
  options: ["It uses a bigger model", "Sequences join and leave the batch at every step, so slots never sit idle", "It removes the KV cache", "It batches users by country"]
  answer: 1
- q: A very long prompt arrives and everyone else's stream stutters. Which technique helps?
  options: ["Speculative decoding", "Chunked prefill (or disaggregated prefill/decode)", "Lower temperature", "Smaller vocabulary"]
  answer: 1
- q: Why not simply use the largest possible batch?
  options: ["GPUs can't batch", "Per-request latency and KV memory grow; at some point SLOs break", "Batching lowers quality", "It's illegal"]
  answer: 1
```

# Quantization {#quantization}

**Quantization** stores weights (and sometimes activations or the KV cache) with fewer bits. Fewer bytes means less memory, faster decode, and cheaper hardware, at some cost in quality.

| Format | Bytes / weight | 70B model weights | Typical use |
|---|---|---|---|
| FP32 | 4 | 280 GB | Training master copies |
| BF16 / FP16 | 2 | 140 GB | Standard inference |
| FP8 | 1 | 70 GB | Modern data-centre GPUs, near-lossless for many models |
| INT8 | 1 | 70 GB | Widely supported |
| INT4 (AWQ, GPTQ, GGUF Q4) | ~0.5 | ~35 GB | Local and edge serving; check quality carefully |

```python run title="Quantize weights to INT8 and INT4 and measure the error"
import random, math

random.seed(0)
weights = [random.gauss(0, 0.02) for _ in range(4096)] + [0.31, -0.27]   # a few outliers, as in real models

def quantize(ws, bits, group=None):
    group = group or len(ws)
    levels = 2 ** (bits - 1) - 1                     # symmetric: e.g. -127..127 for INT8
    out = []
    for i in range(0, len(ws), group):
        g = ws[i:i + group]
        scale = max(abs(w) for w in g) / levels      # one scale per group
        out += [round(w / scale) * scale for w in g]
    return out

def rel_error(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)) / sum(x * x for x in a))

for bits in (8, 4):
    per_tensor = rel_error(weights, quantize(weights, bits))
    per_group = rel_error(weights, quantize(weights, bits, group=64))
    print(f"INT{bits}: relative error per-tensor {per_tensor:.3f} | per-group(64) {per_group:.3f}")
```

Two lessons from the numbers: **INT4 is much lossier than INT8**, and **outliers ruin a single scale**: grouping weights (one scale per 64 or 128 weights), as AWQ, GPTQ and GGUF do, keeps error low. Always **evaluate** a quantized model on your own eval set before shipping it.

```quiz
- q: Roughly how much GPU memory do the weights of a 70B model need in FP16?
  options: ["14 GB", "70 GB", "140 GB", "1.4 TB"]
  answer: 2
- q: Why do quantization methods use per-group scales?
  options: ["To add more bits", "So outlier weights don't force a coarse scale on everything else", "To speed up training", "Groups are required by GPUs"]
  answer: 1
- q: Before shipping an INT4 model, you should…
  options: ["Trust the vendor's average benchmark", "Run your own evals and compare with the FP16 baseline", "Raise the temperature", "Nothing"]
  answer: 1
```

# Decoding: Sampling and Speculation {#decoding}

## Sampling parameters

| Parameter | Effect | Typical use |
|---|---|---|
| **temperature** | Flattens (high) or sharpens (low) the token distribution | 0–0.3 for extraction and code; 0.7–1.0 for creative text |
| **top_p** (nucleus) | Sample only from the smallest set of tokens whose probabilities sum to p | Trim unlikely tokens |
| **max_output_tokens** | Hard cap on output length | Always set it: it caps latency and cost |
| **stop sequences** | End generation at a string | Stop at a delimiter |
| **structured outputs** | Constrain decoding so output matches a JSON schema | Reliable parsing without retries |

Some reasoning models fix or ignore sampling parameters and expose a **reasoning effort** setting instead; check your model's documentation.

## Speculative decoding

Decode is slow because each step produces one token. **Speculative decoding** uses a small, fast **draft** model (or extra prediction heads) to guess several tokens ahead, then the big model **verifies them all in one forward pass**. Accepted guesses are free speed-ups; the output distribution is unchanged when the verification follows the standard acceptance rule.

```sketch
title: Speculative decoding
caption: The draft proposes k tokens cheaply; the target model checks them in one pass and keeps the longest correct prefix plus one token of its own.
cellW: 175
cellH: 100
nodes:
  - id: d
    label: Draft model
    sub: small, fast
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: guess
    label: "the · loan · is · approved"
    col: 1.3
    row: 0
    shape: box
    w: 1.2
  - id: t
    label: Target model
    sub: verifies 4 at once
    col: 2.8
    row: 0
    shape: round
    tone: grape
  - id: keep
    label: "keep 'the loan is' + its own 'not'"
    col: 2.8
    row: 1.2
    shape: note
    w: 1.3
edges:
  - from: d
    to: guess
  - from: guess
    to: t
  - from: t
    to: keep
```

```python run title="Speed-up from speculative decoding vs acceptance rate"
def expected_tokens_per_target_pass(accept, k):
    # Expected accepted draft tokens + 1 bonus token from the target, per verification pass
    return sum(accept ** i for i in range(1, k + 1)) + 1

def speedup(accept, k, draft_cost=0.05):
    tokens = expected_tokens_per_target_pass(accept, k)
    cost = 1 + k * draft_cost                 # one target pass + k cheap draft passes
    return tokens / cost

for accept in (0.5, 0.7, 0.85):
    best = max(range(1, 9), key=lambda k: speedup(accept, k))
    print(f"acceptance {accept:.2f}: best k={best}, speed-up ≈ {speedup(accept, best):.2f}x")
```

Speculation pays off when the draft agrees with the target often: predictable text such as code, JSON, or rewriting a given document.

```quiz
- q: You're extracting fields into JSON. Which settings fit?
  options: ["temperature 1.2, no schema", "Low temperature plus structured outputs with a JSON schema", "top_p 0.1 and no max tokens", "Highest reasoning effort always"]
  answer: 1
- q: Does standard speculative decoding change the output distribution of the target model?
  options: ["Yes, always", "No, the verification step preserves it", "Only for code", "Only at temperature 0"]
  answer: 1
- q: When does speculative decoding help most?
  options: ["When the draft rarely agrees with the target", "When the text is predictable, so many draft tokens are accepted", "When the prompt is long", "Never"]
  answer: 1
```

# Serving Stacks and Hardware {#serving}

## Build vs buy

| Option | You manage | Good when |
|---|---|---|
| **Model APIs** (OpenAI, Anthropic, Google…) | Prompts, caching, routing | Fastest start; frontier quality; variable load |
| **Managed open-model endpoints** (Bedrock, SageMaker AI, Vertex, Azure, Together, Fireworks…) | Model choice, scaling settings | Open models without running GPUs yourself |
| **Self-hosted servers** on your GPUs | Everything | Data must stay in-house, steady high volume, custom models |

## Common serving engines

| Engine | Known for |
|---|---|
| **vLLM** | PagedAttention, continuous batching, prefix caching, wide model support, OpenAI-compatible server |
| **SGLang** | Fast structured generation and prefix reuse (RadixAttention) |
| **TensorRT-LLM** (+ Triton) | Maximum performance on NVIDIA GPUs |
| **Hugging Face TGI** | Easy deployment of Hub models |
| **llama.cpp / Ollama** | CPU and laptop inference with GGUF quantized models |

```bash
# Self-hosting an open model with vLLM (OpenAI-compatible API on port 8000)
pip install vllm
vllm serve meta-llama/Llama-3.1-8B-Instruct --max-model-len 16384 --enable-prefix-caching
curl http://localhost:8000/v1/chat/completions -H "Content-Type: application/json" \
  -d '{"model": "meta-llama/Llama-3.1-8B-Instruct", "messages": [{"role": "user", "content": "Mhoro!"}]}'
```

## Fitting a model on GPUs

GPU memory must hold **weights + KV cache + activations/overhead**. When one GPU isn't enough:

- **Tensor parallelism**: split each layer's matrices across GPUs in one machine (needs fast links).
- **Pipeline parallelism**: put different layers on different GPUs or machines.
- **Expert parallelism**: for mixture-of-experts models, place different experts on different GPUs.

```python run title="Will it fit? Weights + KV cache on one GPU"
def fits(params_b, bytes_per_weight, gpu_gb, layers, kv_heads, head_dim, ctx, users, kv_bytes=2, overhead=0.10):
    weights_gb = params_b * 1e9 * bytes_per_weight / 1e9
    kv_gb = 2 * layers * kv_heads * head_dim * kv_bytes * ctx * users / 1e9
    need = (weights_gb + kv_gb) * (1 + overhead)
    return weights_gb, kv_gb, need, need <= gpu_gb

scenarios = [
    ("8B FP16, 16 users × 8k ctx on 80 GB", dict(params_b=8, bytes_per_weight=2, gpu_gb=80, layers=32, kv_heads=8, head_dim=128, ctx=8192, users=16)),
    ("70B FP16, 8 users × 8k on 80 GB", dict(params_b=70, bytes_per_weight=2, gpu_gb=80, layers=80, kv_heads=8, head_dim=128, ctx=8192, users=8)),
    ("70B INT4, 8 users × 8k on 80 GB", dict(params_b=70, bytes_per_weight=0.5, gpu_gb=80, layers=80, kv_heads=8, head_dim=128, ctx=8192, users=8)),
]
for name, s in scenarios:
    w, kv, need, ok = fits(**s)
    print(f"{name:38} weights {w:5.1f} GB + KV {kv:5.1f} GB → {need:5.1f} GB  {'fits' if ok else 'does NOT fit'}")
```

```quiz
- q: Which engine introduced PagedAttention?
  options: ["llama.cpp", "vLLM", "TGI", "Ollama"]
  answer: 1
- q: A model's weights don't fit on one GPU in a single server. A common first step?
  options: ["Pipeline parallelism across continents", "Tensor parallelism across the GPUs in that machine (or quantization)", "Lower the temperature", "Shorter prompts only"]
  answer: 1
- q: Which costs GPU memory per active user?
  options: ["Model weights", "The KV cache", "The tokenizer", "The system prompt file"]
  answer: 1
```

# Cost Engineering for API Users {#cost}

Most teams call APIs rather than run GPUs. Inference engineering still applies: you control **how many tokens**, **which model**, and **how much is cached**.

## Token maths

```text
cost = input_tokens × input_price + cached_input_tokens × cached_price + output_tokens × output_price
```

Output tokens usually cost **4–5×** more than input tokens, and reasoning models also bill their hidden reasoning tokens as output.

## Levers, in order of effort

| Lever | Typical saving |
|---|---|
| **Set `max_output_tokens`** and ask for concise outputs | Caps the expensive side |
| **Prompt caching**: static content first | Large discount on repeated prefixes |
| **Pick the smallest model that passes your evals** | Often 5–20× cheaper |
| **Cascade / routing**: try a small model, escalate only hard cases | Big savings at similar quality |
| **Batch API** for non-urgent jobs | Providers typically offer about 50% off for asynchronous batches |
| **Trim context**: retrieve less, compact history, summarise tool outputs | Fewer input tokens per step |
| **Cache answers and tool results** where safe | Removes calls entirely |

```python run title="Cost per 1,000 tasks: single model vs a cascade"
# Prices per 1M tokens (illustrative, Oct 2026 list prices for one provider; check the current pricing page)
PRICES = {
    "large":  {"in": 10.00, "cached": 1.00, "out": 50.00},
    "medium": {"in": 1.00,  "cached": 0.10, "out": 5.00},
    "small":  {"in": 0.10,  "cached": 0.01, "out": 0.50},
}
def task_cost(model, prompt=3000, cached_share=0.7, output=400):
    p = PRICES[model]
    cached = prompt * cached_share
    return ((prompt - cached) * p["in"] + cached * p["cached"] + output * p["out"]) / 1e6

single = 1000 * task_cost("large")
# Cascade: small model answers everything; a cheap check escalates 15% to large
cascade = 1000 * task_cost("small") + 150 * task_cost("large") + 1000 * task_cost("small", output=20)

print(f"large model only:  ${single:7.2f} per 1,000 tasks")
print(f"medium model only: ${1000 * task_cost('medium'):7.2f} per 1,000 tasks")
print(f"small→large cascade (15% escalated): ${cascade:7.2f} per 1,000 tasks")
print(f"no caching, large model: ${1000 * task_cost('large', cached_share=0):7.2f} per 1,000 tasks")
```

> **Measure quality with every cost change.** A 90% cheaper pipeline that fails your evals is not a saving. Track **cost per successful task**, not just cost per call.

```quiz
- q: Which side of the bill is usually more expensive per token?
  options: ["Input", "Output", "They are equal", "Cached input"]
  answer: 1
- q: What is a model cascade?
  options: ["Running all models and averaging", "Trying a cheap model first and escalating only hard cases to a stronger one", "Chaining prompts", "A GPU cluster"]
  answer: 1
- q: Which metric best captures cost-effectiveness?
  options: ["Cost per call", "Cost per successful task (with quality measured by evals)", "Tokens per second", "Cache size"]
  answer: 1
```

# Capstone: Capacity Planning {#capstone}

````challenge
id: inference-capacity
title: How many users fit on this GPU?
difficulty: medium
prompt: |
  Write `max_concurrent(gpu_gb, params_b, bytes_per_weight, layers, kv_heads, head_dim, ctx, kv_bytes=2, reserve=0.1)` that returns the **maximum whole number of sequences** (each using the full `ctx` tokens) whose KV cache fits on the GPU.

  - Weights take `params_b × 1e9 × bytes_per_weight` bytes.
  - Keep `reserve` (a fraction of `gpu_gb`) free for activations and overhead.
  - KV bytes per sequence = `2 × layers × kv_heads × head_dim × kv_bytes × ctx`.
  - Use 1 GB = 1e9 bytes. Return `0` if the weights alone don't fit.
starter: |
  def max_concurrent(gpu_gb, params_b, bytes_per_weight, layers, kv_heads, head_dim, ctx, kv_bytes=2, reserve=0.1):
      pass

  print(max_concurrent(80, 8, 2, 32, 8, 128, 8192))
tests: |
  assert max_concurrent(80, 8, 2, 32, 8, 128, 8192) == 52, max_concurrent(80, 8, 2, 32, 8, 128, 8192)
  assert max_concurrent(80, 70, 2, 80, 8, 128, 8192) == 0, "140 GB of weights cannot fit in 80 GB"
  assert max_concurrent(80, 70, 0.5, 80, 8, 128, 8192) == 13
  assert max_concurrent(80, 8, 2, 32, 8, 128, 8192, kv_bytes=1) == 104, "FP8 KV cache roughly doubles capacity"
````

```exam
- q: TTFT is made up mainly of…
  options: ["Decode time", "Queueing plus prefill", "Network upload of the answer", "Tokenizer loading"]
  answer: 1
- q: Single-sequence decode speed is mostly limited by…
  options: ["Compute FLOPs", "Memory bandwidth", "Disk", "Python"]
  answer: 1
- q: What does the KV cache store?
  options: ["Final answers", "Attention keys and values for previous tokens", "Embeddings of documents", "Model weights"]
  answer: 1
- q: Continuous batching improves throughput because…
  options: ["It uses smaller models", "Finished sequences are replaced immediately, keeping the GPU busy", "It skips prefill", "It removes attention"]
  answer: 1
- q: Moving from FP16 to INT4 weights reduces weight memory by about…
  options: ["2×", "4×", "8×", "No change"]
  answer: 1
- q: Prefix-aware routing increases…
  options: ["Temperature", "Prefix-cache hit rates across a fleet of servers", "Model size", "Context length"]
  answer: 1
- q: A batch job of 1 million classifications is not urgent. Cheapest sensible option?
  options: ["Largest model, real-time API", "A small model via a batch API, validated by evals", "Run on a laptop", "Ask users to wait"]
  answer: 1
- q: Disaggregated prefill/decode means…
  options: ["Skipping prefill", "Running prefill and decode on separate GPU pools and transferring the KV cache", "Two models voting", "Caching outputs"]
  answer: 1
```
