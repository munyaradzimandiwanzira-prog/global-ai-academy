---
id: deep-learning
title: Deep Learning from Scratch
short: DL
category: ai
level: intermediate
language: python
color: "#5B3A9E"
icon: "🕸️"
order: 41.5
summary: Build deep neural networks yourself in NumPy, right in your browser. Activations, loss functions, backpropagation and autograd, optimisers from SGD to AdamW, dropout and normalisation, initialisation, learning-rate schedules, your own mini framework, debugging, and a digit recogniser you train on your phone.
tags: [deep learning, neural networks, backpropagation, autograd, adam, dropout, batch norm, layer norm, pytorch, numpy]
---

# Start: From One Neuron to Deep Networks {#intro}

In **[Mathematics & First Principles of ML](/learn/ml-math/neural-net)** you built a two-layer network that learned XOR. **Deep learning** is the same idea with more layers, better parts and a few tricks that make big networks train reliably. Those tricks are what this track is about.

A deep network is a stack of **layers**. Each layer multiplies its input by a weight matrix, adds a bias, and bends the result with an **activation function**. Early layers learn simple patterns; later layers combine them into complex ones. Nobody writes the patterns by hand: the network learns them from examples.

```sketch
title: "Training a network, one batch at a time"
caption: "Every deep learning system, from a digit recogniser to a large language model, repeats this loop millions of times."
cellW: 175
nodes:
  - id: data
    label: "A batch of examples"
    col: 0
    row: 1
    shape: db
    tone: teal
  - id: fwd
    label: "Forward pass"
    sub: "layers make a prediction"
    col: 1.2
    row: 1
    shape: round
    tone: sky
  - id: loss
    label: "Loss"
    sub: "how wrong was it?"
    col: 2.4
    row: 1
    shape: round
    tone: rose
  - id: bwd
    label: "Backward pass"
    sub: "gradient for every weight"
    col: 2.4
    row: 2.3
    shape: round
    tone: grape
  - id: upd
    label: "Update"
    sub: "optimiser nudges weights"
    col: 1.2
    row: 2.3
    shape: round
    tone: gold
edges:
  - from: data
    to: fwd
  - from: fwd
    to: loss
  - from: loss
    to: bwd
  - from: bwd
    to: upd
  - from: upd
    to: fwd
    label: "repeat"
```

Data flows through a network as a matrix: one **row per example**, one **column per feature**. Keeping track of shapes is half the work, so watch them change in this forward pass through a three-layer network that guesses maize yield.

```python run title="A forward pass through three layers"
import numpy as np
rng = np.random.default_rng(0)

# 5 farms x 4 features: rainfall (mm), fertiliser (kg/ha), seed (kg/ha), soil pH
X = np.array([[650, 200, 25, 6.1],
              [420, 120, 20, 5.4],
              [800, 250, 30, 6.5],
              [300,  50, 18, 5.0],
              [560, 180, 25, 6.0]])
X = (X - X.mean(axis=0)) / X.std(axis=0)      # put every feature on the same scale

sizes = [4, 8, 8, 1]                           # input, two hidden layers, one output
params = []
for n_in, n_out in zip(sizes[:-1], sizes[1:]):
    W = rng.normal(0, np.sqrt(2 / n_in), (n_in, n_out))
    b = np.zeros(n_out)
    params.append((W, b))

h = X
for i, (W, b) in enumerate(params):
    z = h @ W + b                              # (batch, n_in) @ (n_in, n_out) -> (batch, n_out)
    h = np.maximum(z, 0) if i < len(params) - 1 else z   # ReLU on hidden layers only
    print(f"layer {i + 1}: weights {W.shape} -> output {h.shape}")

print("parameters to learn:", sum(W.size + b.size for W, b in params))
print("untrained guesses:", h.ravel().round(2))
```

The guesses are random because the weights are random. Training is the process of finding weights that make the guesses good.

## Where deep learning wins

| Data | Deep learning? | Why |
|---|---|---|
| Images, audio, video | Yes | Patterns are built from pixels or samples; layers learn them |
| Free text in any language | Yes | Transformers (next track) are deep networks |
| A spreadsheet of a few thousand rows | Usually not first | Random forests and gradient boosting often win on tables; see [Machine Learning](/learn/machine-learning) |

## What you will build

1. Every common **activation** and why each exists
2. **Loss functions** that are numerically safe
3. **Backpropagation** as a tiny autograd engine, like the one inside PyTorch
4. **Optimisers**: SGD, momentum, RMSProp, Adam and AdamW
5. **Regularisation**: weight decay, dropout, batch, layer and RMS normalisation
6. **Initialisation** that keeps signals alive through 50 layers
7. **Learning-rate schedules** used to train real language models
8. Your own **mini framework**, then the same code in PyTorch
9. A **debugging** toolkit for networks that won't learn
10. A **digit recogniser** trained in your browser

> **Credit.** This track is adapted, rewritten and extended for Skuru from Phase 3 of *[AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch)* by Rohit Ghumare (MIT License). See [Credits & licenses](/credits).

```quiz
- q: In a layer, the input has shape (32, 64) and the weights have shape (64, 16). What is the output shape?
  options: ["(64, 16)", "(32, 16)", "(32, 64)", "(16, 32)"]
  answer: 1
- q: What does an activation function add to a layer?
  options: ["More data", "A bend (non-linearity), so layers can learn curved patterns", "A faster computer", "Labels for the examples"]
  answer: 1
```

# Activation Functions {#activations}

Without an activation, a layer is just `x @ W + b`, a straight-line transform. Stack ten of them and you still have one straight-line transform, because multiplying matrices together gives another matrix.

```python run title="Ten linear layers collapse into one"
import numpy as np
rng = np.random.default_rng(0)
x = rng.normal(size=(3, 4))

Ws = [rng.normal(size=(4, 4)) for _ in range(10)]
deep = x
for W in Ws:
    deep = deep @ W                  # ten layers, no activation

one = np.eye(4)
for W in Ws:
    one = one @ W                    # multiply the matrices together first

print("same outputs?", np.allclose(deep, x @ one))
```

So every hidden layer needs a non-linear activation. Here are the ones you will meet, with the derivative that backpropagation uses.

```python run title="Activations and their slopes"
import numpy as np
from math import erf, sqrt, pi

sigmoid = lambda z: 1 / (1 + np.exp(-z))
acts = {
    "sigmoid":    (sigmoid,                                   lambda z: sigmoid(z) * (1 - sigmoid(z))),
    "tanh":       (np.tanh,                                   lambda z: 1 - np.tanh(z) ** 2),
    "relu":       (lambda z: np.maximum(z, 0),                lambda z: (z > 0).astype(float)),
    "leaky_relu": (lambda z: np.where(z > 0, z, 0.01 * z),    lambda z: np.where(z > 0, 1.0, 0.01)),
    "gelu":       (lambda z: 0.5 * z * (1 + np.tanh(sqrt(2 / pi) * (z + 0.044715 * z ** 3))), None),
    "silu":       (lambda z: z * sigmoid(z),                  lambda z: sigmoid(z) * (1 + z * (1 - sigmoid(z)))),
}
z = np.array([-3.0, -1.0, 0.0, 1.0, 3.0])
print("z          ", z)
for name, (f, df) in acts.items():
    slope = df(z).round(3) if df else "(smooth, close to relu's)"
    print(f"{name:11}", f(z).round(3), " slope:", slope)
```

| Activation | Shape | Use it for |
|---|---|---|
| **Sigmoid** | Squashes to 0…1 | The output of a yes/no classifier, and gates inside LSTMs |
| **Tanh** | Squashes to −1…1, centred on 0 | Recurrent networks |
| **ReLU** | 0 for negatives, unchanged for positives | The default for hidden layers in most networks |
| **Leaky ReLU** | Like ReLU with a small slope for negatives | When too many ReLU units "die" |
| **GELU** | A smooth ReLU | Transformers such as BERT and GPT |
| **SiLU / Swish** | `z · sigmoid(z)` | Modern vision models and LLMs (inside SwiGLU) |
| **Softmax** | Turns a vector of scores into probabilities that add to 1 | The output of a multi-class classifier |

## Vanishing gradients

Sigmoid's slope is at most 0.25. Backpropagation multiplies one slope per layer, so through 20 sigmoid layers the gradient shrinks towards zero and the early layers stop learning. ReLU's slope is exactly 1 for active units, so the signal survives.

```python run title="How much gradient reaches the first layer?"
import numpy as np
rng = np.random.default_rng(1)
sigmoid = lambda z: 1 / (1 + np.exp(-z))
acts = {
    "sigmoid": (sigmoid, lambda z: sigmoid(z) * (1 - sigmoid(z)), 1.0),
    "tanh":    (np.tanh, lambda z: 1 - np.tanh(z) ** 2, 1.0),
    "relu":    (lambda z: np.maximum(z, 0), lambda z: (z > 0).astype(float), 2.0),
}

def first_layer_gradient(f, df, gain, depth=20, width=64):
    x = rng.normal(size=(32, width))
    Ws, zs = [], []
    for _ in range(depth):                       # forward, remembering each z
        W = rng.normal(0, np.sqrt(gain / width), (width, width))
        z = x @ W
        Ws.append(W); zs.append(z)
        x = f(z)
    g = np.ones_like(x)                          # backward: pretend the loss gradient is 1
    for W, z in zip(reversed(Ws), reversed(zs)):
        g = (g * df(z)) @ W.T
    return np.abs(g).mean()

for name, (f, df, gain) in acts.items():
    print(f"{name:8} gradient at layer 1 after 20 layers: {first_layer_gradient(f, df, gain):.2e}")
```

## Dead ReLUs

A ReLU unit whose input is negative for **every** example outputs 0 and gets a gradient of 0, so it never recovers. A large learning rate or a big negative bias can kill many units at once.

```python run title="Count dead units"
import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(size=(500, 20))
W = rng.normal(0, np.sqrt(2 / 20), (20, 100))

for bias in [0.0, -2.0, -4.0, -6.0]:
    active = np.maximum(X @ W + bias, 0) > 0
    dead = (~active.any(axis=0)).mean()
    print(f"bias {bias:5}: {dead:.0%} of units are dead")
```

```exercise
prompt: Complete the ReLU derivative. It is 1 where the input is positive and 0 elsewhere.
code: |
  def relu_grad(z):
      return (z ___ 0).astype(float)
answers: [">"]
hint: Compare z with zero.
```

```quiz
- q: Why can't a deep network use no activation at all?
  options: ["It would be too slow", "Stacked linear layers collapse into a single linear layer", "Weights would become negative", "Softmax would stop working"]
  answer: 1
- q: Which activation is the usual default for the hidden layers of transformers?
  options: ["Sigmoid", "GELU", "Step function", "Softmax"]
  answer: 1
- q: Why do gradients vanish through many sigmoid layers?
  options: ["Sigmoid's slope is at most 0.25, and backprop multiplies one slope per layer", "Sigmoid outputs negative numbers", "Sigmoid has no derivative", "The learning rate is too small"]
  answer: 0
```

# Loss Functions {#losses}

The **loss** is a single number that says how wrong the network is. Training lowers it, so the loss must match the task.

| Task | Output layer | Loss |
|---|---|---|
| Predict a number (price, yield) | No activation | **Mean squared error** (MSE) |
| Yes or no (fraud, disease) | Sigmoid | **Binary cross-entropy** |
| One of many classes (digit, crop type) | Softmax | **Categorical cross-entropy** |
| Learn embeddings (search, CLIP) | Normalised vectors | **Contrastive loss** (InfoNCE) |

## Cross-entropy, safely

Cross-entropy is `−log(probability of the right class)`. A confident right answer costs almost nothing; a confident wrong answer costs a lot. Computing it naively overflows: `exp(1000)` is infinity. The fix is the **log-sum-exp trick**: subtract the biggest score before exponentiating. The answer is mathematically the same, but nothing overflows.

```python run title="Naive versus stable softmax cross-entropy"
import numpy as np

def naive_ce(logits, label):
    p = np.exp(logits) / np.exp(logits).sum()
    return -np.log(p[label])

def stable_ce(logits, label):
    shifted = logits - logits.max()
    log_probs = shifted - np.log(np.exp(shifted).sum())
    return -log_probs[label]

small = np.array([2.0, 1.0, 0.1])
huge = np.array([1000.0, 999.0, 998.0])
with np.errstate(over="ignore", invalid="ignore"):
    print("small scores  naive:", round(float(naive_ce(small, 0)), 4), " stable:", round(float(stable_ce(small, 0)), 4))
    print("huge scores   naive:", naive_ce(huge, 0), " stable:", round(float(stable_ce(huge, 0)), 4))
```

## Why not MSE for classification?

With a sigmoid output, the gradient of MSE contains the sigmoid's slope, `p(1 − p)`. When the network is confidently wrong, `p` is near 0 or 1, so that slope is tiny and learning stalls exactly when it is most needed. Cross-entropy cancels the slope: its gradient with respect to the score is simply `p − y`.

```python run title="Gradient when the model is confidently wrong"
import numpy as np
sigmoid = lambda z: 1 / (1 + np.exp(-z))
y = 1.0                                     # the truth is "yes"
for z in [-6.0, -2.0, 0.0, 2.0]:            # the model's raw score
    p = sigmoid(z)
    mse_grad = 2 * (p - y) * p * (1 - p)
    ce_grad = p - y
    print(f"score {z:5}  p={p:.3f}   MSE gradient {mse_grad:8.4f}   cross-entropy gradient {ce_grad:8.4f}")
```

## Two useful variations

- **Label smoothing** replaces a hard target of 1 with, say, 0.9 and spreads 0.1 over the other classes. The model stops chasing infinite confidence, which usually generalises better. Most image and translation models use it.
- **Focal loss** down-weights easy examples so training focuses on hard ones. It helps when one class is rare, such as fraud in mobile-money transactions.

````challenge
id: dl-cross-entropy
title: Stable cross-entropy for a batch
difficulty: medium
prompt: |
  Write `cross_entropy(logits, labels)` for a batch. `logits` is a NumPy array of shape `(batch, classes)`; `labels` is an array of class indices. Return the **mean** cross-entropy as a float.

  It must not overflow: subtract each row's maximum before exponentiating (the log-sum-exp trick).
starter: |
  import numpy as np

  def cross_entropy(logits, labels):
      pass

  print(cross_entropy(np.array([[2.0, 1.0, 0.1], [0.5, 2.5, 0.3]]), np.array([0, 1])))
tests: |
  import numpy as np
  r = cross_entropy(np.array([[2.0, 1.0, 0.1], [0.5, 2.5, 0.3]]), np.array([0, 1]))
  assert abs(r - 0.3185) < 1e-3, r
  big = cross_entropy(np.array([[1000.0, 999.0, 998.0]]), np.array([0]))
  assert np.isfinite(big) and abs(big - 0.4076) < 1e-3, "Large scores must not overflow"
  assert abs(cross_entropy(np.zeros((4, 10)), np.array([0, 1, 2, 3])) - np.log(10)) < 1e-9, "Uniform scores should cost log(classes)"
````

```quiz
- q: A model predicting tomorrow's maize price should use which loss?
  options: ["Categorical cross-entropy", "Mean squared error", "Binary cross-entropy", "Contrastive loss"]
  answer: 1
- q: What does the log-sum-exp trick prevent?
  options: ["Overfitting", "Overflow when exponentiating large scores", "Dead ReLUs", "Slow data loading"]
  answer: 1
```

# Backpropagation and Autograd {#backprop}

**Backpropagation** finds how much each weight contributed to the loss by applying the chain rule backwards through the computation. Frameworks like PyTorch do this automatically with **autograd**: every operation remembers its inputs and how to pass a gradient back to them.

```sketch
title: "A computational graph"
caption: "The forward pass computes values left to right. The backward pass sends gradients right to left, each node multiplying by its local slope."
cellW: 150
nodes:
  - id: w
    label: "w = 0.5"
    col: 0
    row: 0
    shape: circle
    tone: sky
  - id: x
    label: "x = 2"
    col: 0
    row: 1.6
    shape: circle
    tone: sky
  - id: mul
    label: "×"
    sub: "w·x = 1"
    col: 1.3
    row: 0.8
    shape: circle
    tone: gold
  - id: b
    label: "b = −0.5"
    col: 1.3
    row: 2.2
    shape: circle
    tone: sky
  - id: add
    label: "+"
    sub: "1 − 0.5 = 0.5"
    col: 2.6
    row: 1.2
    shape: circle
    tone: gold
  - id: out
    label: "tanh"
    sub: "tanh(0.5) = 0.46"
    col: 3.9
    row: 1.2
    shape: round
    tone: grape
edges:
  - from: w
    to: mul
  - from: x
    to: mul
  - from: mul
    to: add
  - from: b
    to: add
  - from: add
    to: out
```

Here is a complete autograd engine for single numbers in about 50 lines. It is the same design that sits inside PyTorch, just one number at a time instead of whole tensors.

```python run title="A tiny autograd engine"
import math

class Value:
    def __init__(self, data, parents=(), op=""):
        self.data, self.grad = data, 0.0
        self._parents, self._op = parents, op
        self._backward = lambda: None

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")
        def backward():
            self.grad += out.grad              # d(a+b)/da = 1
            other.grad += out.grad
        out._backward = backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")
        def backward():
            self.grad += other.data * out.grad  # d(a*b)/da = b
            other.grad += self.data * out.grad
        out._backward = backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")
        def backward():
            self.grad += (1 - t ** 2) * out.grad
        out._backward = backward
        return out

    def backward(self):
        order, seen = [], set()
        def visit(v):                          # topological order: parents before children
            if v not in seen:
                seen.add(v)
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = 1.0
        for v in reversed(order):
            v._backward()

    __radd__ = __add__
    __rmul__ = __mul__

w, x, b = Value(0.5), Value(2.0), Value(-0.5)
y = (w * x + b).tanh()
y.backward()
print(f"y = {y.data:.6f}")
print(f"dy/dw = {w.grad:.6f}   dy/dx = {x.grad:.6f}   dy/db = {b.grad:.6f}")

# Check against a numerical estimate: nudge w a tiny bit and see how y moves.
h = 1e-6
numeric = (math.tanh((0.5 + h) * 2.0 - 0.5) - math.tanh(0.5 * 2.0 - 0.5)) / h
print(f"numerical dy/dw ≈ {numeric:.6f}")
```

Two details matter:

- **Gradients add up** (`+=`). If a value is used twice, both uses send gradient back to it.
- **Order matters.** A node may only pass its gradient back once every node that uses it has finished. The topological sort guarantees that.

## Gradient checking

Comparing your gradient with a numerical estimate, `(f(w + h) − f(w)) / h`, is the standard way to catch bugs in a hand-written backward pass. It is slow, so use it on tiny examples only.

```exercise
prompt: In the multiply node, the gradient for `self` is the other input's value times the output gradient. Fill it in.
code: |
  def backward():
      self.grad += ___ * out.grad
      other.grad += self.data * out.grad
answers: ["other.data"]
hint: For a·b, the derivative with respect to a is b.
```

```quiz
- q: Why does the autograd engine use `+=` when storing gradients?
  options: ["It is faster", "A value used in several places must receive gradient from all of them", "To avoid negative numbers", "Python requires it"]
  answer: 1
- q: What is gradient checking used for?
  options: ["Making training faster", "Verifying a backward pass against a numerical estimate", "Choosing the learning rate", "Removing dead neurons"]
  answer: 1
```

# Optimisers: SGD to AdamW {#optimizers}

The **optimiser** decides how to change the weights once the gradients are known. The simplest rule, **stochastic gradient descent** (SGD), steps straight downhill: `w -= lr * grad`. Real loss surfaces are full of long narrow valleys where that zigzags. Better optimisers fix this.

| Optimiser | Idea | Update in words |
|---|---|---|
| **SGD** | Step downhill | `w -= lr · g` |
| **Momentum** | Keep rolling in the direction you've been going | velocity = 0.9 · velocity + g; `w -= lr · velocity` |
| **RMSProp** | Shrink steps for weights with big, noisy gradients | divide by the root of the recent average of g² |
| **Adam** | Momentum and RMSProp together, with a start-up correction | the default for most deep learning |
| **AdamW** | Adam with weight decay applied separately | the default for transformers and LLMs |

Watch them race down a long, narrow valley: `f(x, y) = 0.01x² + 2y²`, starting from `(-10, 1)`. It is 200 times steeper across the valley than along it.

```python run title="Four optimisers in a narrow valley"
import numpy as np

def grad(p):                       # gradient of 0.01x² + 2y²
    return np.array([0.02 * p[0], 4 * p[1]])
loss = lambda p: 0.01 * p[0] ** 2 + 2 * p[1] ** 2

def run(name, lr, steps=500):
    p = np.array([-10.0, 1.0]); m = np.zeros(2); v = np.zeros(2)
    for t in range(1, steps + 1):
        g = grad(p)
        if name == "sgd":
            p -= lr * g
        elif name == "momentum":
            m = 0.9 * m + g
            p -= lr * m
        elif name == "rmsprop":
            v = 0.9 * v + 0.1 * g ** 2
            p -= lr * g / (np.sqrt(v) + 1e-8)
        elif name == "adam":
            m = 0.9 * m + 0.1 * g
            v = 0.999 * v + 0.001 * g ** 2
            m_hat, v_hat = m / (1 - 0.9 ** t), v / (1 - 0.999 ** t)
            p -= lr * m_hat / (np.sqrt(v_hat) + 1e-8)
        if loss(p) < 1e-3:
            return t, p
    return None, p

for name, lr in [("sgd", 0.45), ("momentum", 0.1), ("rmsprop", 0.3), ("adam", 0.5)]:
    steps, p = run(name, lr)
    result = f"reached the bottom in {steps} steps" if steps else f"still at loss {loss(p):.3g} after 500 steps"
    print(f"{name:9} lr={lr:<5} {result}")
```

SGD needs almost 400 steps; Adam needs about 25. Now try `lr=0.55` for SGD: it overshoots across the steep side of the valley and blows up, yet anything smaller crawls along the shallow side. One learning rate can't suit both directions. That is exactly the problem RMSProp and Adam solve by scaling each weight's step separately.

## Weight decay: Adam versus AdamW

**Weight decay** pulls every weight slightly towards zero each step, which keeps the network simple. In Adam, adding the decay to the gradient means it also gets divided by Adam's scaling, so heavily-updated weights barely decay. **AdamW** applies the decay directly to the weights instead: `w -= lr · (adam_step + λ · w)`. That small change made Adam work well for transformers, and AdamW is now the standard.

## Good starting settings

| Training | Optimiser and settings |
|---|---|
| Don't know yet | AdamW, lr 3e-4, weight decay 0.01 |
| Transformer or LLM from scratch | AdamW, lr around 1e-4 to 6e-4, weight decay 0.01–0.1, with warmup |
| Fine-tuning a pre-trained model | AdamW, lr around 2e-5, weight decay 0.01 |
| Image CNN (ResNet) | SGD with momentum 0.9, lr 0.1, with a schedule |

````challenge
id: dl-adam-step
title: One Adam step
difficulty: medium
prompt: |
  Write `adam_step(w, g, m, v, t, lr=0.001, b1=0.9, b2=0.999, eps=1e-8)` that performs **one** Adam update and returns `(w, m, v)`.

  1. `m = b1·m + (1 − b1)·g` and `v = b2·v + (1 − b2)·g²`
  2. Bias-correct: `m_hat = m / (1 − b1**t)`, `v_hat = v / (1 − b2**t)`
  3. `w = w − lr · m_hat / (√v_hat + eps)`

  `t` counts steps starting at 1. Work with NumPy arrays and don't modify the inputs in place.
starter: |
  import numpy as np

  def adam_step(w, g, m, v, t, lr=0.001, b1=0.9, b2=0.999, eps=1e-8):
      pass

  w, m, v = adam_step(np.array([1.0, -2.0]), np.array([0.5, -0.1]), np.zeros(2), np.zeros(2), 1)
  print(w, m, v)
tests: |
  import numpy as np
  w0 = np.array([1.0, -2.0])
  w, m, v = adam_step(w0, np.array([0.5, -0.1]), np.zeros(2), np.zeros(2), 1)
  assert np.allclose(w, [0.999, -1.999]), w
  assert np.allclose(m, [0.05, -0.01]) and np.allclose(v, [0.00025, 0.00001]), (m, v)
  assert np.allclose(w0, [1.0, -2.0]), "Don't change the input array in place"
  w2, m2, v2 = adam_step(w, np.array([0.2, 0.3]), m, v, 2, lr=0.01)
  assert np.allclose(w2, [0.99001, -2.00394], atol=1e-4), w2
````

```quiz
- q: What does momentum add to plain SGD?
  options: ["A memory of past gradients, so steps keep their direction", "Random noise", "A bigger dataset", "A second learning rate for biases only"]
  answer: 0
- q: Why is AdamW preferred over Adam with L2 penalty for transformers?
  options: ["It uses less memory", "It applies weight decay directly to the weights instead of through Adam's scaling", "It needs no learning rate", "It removes the bias correction"]
  answer: 1
```

# Regularisation and Normalisation {#regularisation}

A network with enough parameters can memorise its training data and still fail on new data. That is **overfitting**. **Regularisation** is anything that pushes the network towards simpler solutions that generalise.

```python run title="Memorising versus learning"
import numpy as np
from sklearn.datasets import make_moons
from sklearn.neural_network import MLPClassifier
import warnings; warnings.filterwarnings("ignore")

X_train, y_train = make_moons(n_samples=60, noise=0.35, random_state=0)   # small, noisy training set
X_test, y_test = make_moons(n_samples=1000, noise=0.35, random_state=1)

for alpha in [0.0, 0.3]:                       # alpha is L2 weight decay
    net = MLPClassifier(hidden_layer_sizes=(200, 200), alpha=alpha, max_iter=2000, random_state=0)
    net.fit(X_train, y_train)
    print(f"weight decay {alpha}: train accuracy {net.score(X_train, y_train):.0%}, test accuracy {net.score(X_test, y_test):.0%}")
```

The unregularised network scores near 100% on its 60 training points but worse on new data. Weight decay gives up a little training accuracy to do better on the test set, which is the only score that matters.

## The main tools

| Technique | What it does | Where you see it |
|---|---|---|
| **Weight decay** (L2) | Pulls weights towards zero | Almost every model |
| **Dropout** | Randomly switches off units during training | MLPs, older transformers |
| **Early stopping** | Stops when validation loss stops improving | Small datasets |
| **Data augmentation** | Flips, crops and noise make "new" examples | Images and audio |
| **Batch norm** | Normalises each feature across the batch | CNNs |
| **Layer norm** | Normalises each example across its features | Transformers |
| **RMSNorm** | Layer norm without subtracting the mean | Llama, Mistral and most new LLMs |

## Dropout

During training, dropout zeroes each unit with probability `p` and scales the survivors by `1/(1 − p)`, so the average signal stays the same. At test time it does nothing. Because any unit might vanish, the network can't rely on one fragile path.

```python run title="Inverted dropout, train and test mode"
import numpy as np
rng = np.random.default_rng(0)

def dropout(x, p, training):
    if not training or p == 0:
        return x
    mask = rng.random(x.shape) >= p
    return x * mask / (1 - p)

h = np.ones((4, 8))
out = dropout(h, p=0.5, training=True)
print(out)
print("average while training:", out.mean().round(2), " average at test time:", dropout(h, 0.5, False).mean())
```

## Normalisation

Normalising keeps each layer's inputs at a steady scale, which makes training faster and more stable. The difference between the three is **which numbers get averaged**.

```python run title="Batch norm, layer norm and RMSNorm"
import numpy as np
rng = np.random.default_rng(0)
x = rng.normal(5, 3, size=(4, 6))          # 4 examples, 6 features, far from mean 0 / std 1
eps = 1e-5

batch_norm = (x - x.mean(axis=0)) / np.sqrt(x.var(axis=0) + eps)                    # per feature, across the batch
layer_norm = (x - x.mean(axis=1, keepdims=True)) / np.sqrt(x.var(axis=1, keepdims=True) + eps)   # per example
rms_norm = x / np.sqrt((x ** 2).mean(axis=1, keepdims=True) + eps)                  # per example, no centring

print("batch norm, each column:  mean", batch_norm.mean(axis=0).round(2), " std", batch_norm.std(axis=0).round(2))
print("layer norm, each row:     mean", layer_norm.mean(axis=1).round(2), " std", layer_norm.std(axis=1).round(2))
print("RMS norm, each row:       rms ", np.sqrt((rms_norm ** 2).mean(axis=1)).round(2))
```

Layer norm and RMSNorm work on one example at a time, so they behave the same with a batch of 1 as with a batch of 1,000. That is why language models, which often run one sequence at a time, use them instead of batch norm. Real layers also learn a scale `γ` and shift `β` after normalising.

````challenge
id: dl-layer-norm
title: Layer normalisation
difficulty: easy
prompt: |
  Write `layer_norm(x, gamma, beta, eps=1e-5)`. For **each row** of `x`, subtract the row's mean and divide by `sqrt(row variance + eps)`. Then multiply by `gamma` and add `beta` (both have one value per column). Return the result.
starter: |
  import numpy as np

  def layer_norm(x, gamma, beta, eps=1e-5):
      pass

  x = np.array([[1.0, 2.0, 3.0], [10.0, 10.0, 40.0]])
  print(layer_norm(x, np.ones(3), np.zeros(3)))
tests: |
  import numpy as np
  x = np.array([[1.0, 2.0, 3.0], [10.0, 10.0, 40.0]])
  r = layer_norm(x, np.ones(3), np.zeros(3))
  assert r.shape == (2, 3)
  assert np.allclose(r.mean(axis=1), 0, atol=1e-6), "Each row should have mean 0"
  assert np.allclose(r[0], [-1.22474, 0.0, 1.22474], atol=1e-4), r[0]
  r2 = layer_norm(x, np.array([2.0, 2.0, 2.0]), np.array([1.0, 0.0, -1.0]))
  assert np.allclose(r2[0], [-1.44949, 0.0, 1.44949], atol=1e-4), r2[0]
````

```quiz
- q: A model scores 99% on training data and 70% on test data. What is happening?
  options: ["Underfitting", "Overfitting", "Vanishing gradients", "A perfect model"]
  answer: 1
- q: Why do transformers use layer norm rather than batch norm?
  options: ["Layer norm is older", "Layer norm works per example, so it doesn't depend on batch size", "Batch norm can't be differentiated", "Layer norm removes the need for an optimiser"]
  answer: 1
- q: What does dropout do at test time?
  options: ["Drops half the units", "Nothing: every unit is used", "Doubles every weight", "Adds noise to the input"]
  answer: 1
```

# Weight Initialisation {#initialisation}

Training starts from random weights, and the scale of that randomness decides whether the network can learn at all.

**Never start every weight at the same value.** If two hidden units start identical, they compute the same thing, receive the same gradient and stay identical forever. Randomness breaks that symmetry.

```python run title="Identical starting weights stay identical"
import numpy as np
X = np.array([[0.2, 0.7], [0.9, 0.1], [0.4, 0.4]])
y = np.array([[1.0], [0.0], [1.0]])
W1 = np.full((2, 3), 0.5)                    # every hidden unit starts the same
W2 = np.full((3, 1), 0.5)
for _ in range(100):
    h = np.tanh(X @ W1)
    p = 1 / (1 + np.exp(-(h @ W2)))
    dz2 = (p - y) / len(X)
    dW2 = h.T @ dz2
    dW1 = X.T @ ((dz2 @ W2.T) * (1 - h ** 2))
    W1 -= 0.5 * dW1; W2 -= 0.5 * dW2
print("hidden weights after 100 steps:\n", W1.round(3))
print("All three units learned the same thing:", np.allclose(W1[:, 0], W1[:, 1]) and np.allclose(W1[:, 1], W1[:, 2]))
```

## Keeping the signal alive

Each layer multiplies by its weights. If the weights are too small, the signal shrinks layer after layer until it is zero; too big, and it explodes. The fix is to choose the weight scale from the layer's size:

| Scheme | Standard deviation of weights | Pair it with |
|---|---|---|
| **Xavier / Glorot** | `sqrt(1 / n_in)` (or `sqrt(2 / (n_in + n_out))`) | tanh, sigmoid |
| **He / Kaiming** | `sqrt(2 / n_in)` | ReLU and its relatives |

The 2 in He initialisation is there because ReLU zeroes about half its inputs, which halves the signal's variance.

```python run title="The signal after 50 ReLU layers"
import numpy as np
rng = np.random.default_rng(0)
width = 256

for name, std in [("too small (0.01)", 0.01), ("Xavier", np.sqrt(1 / width)), ("He", np.sqrt(2 / width)), ("too big (0.15)", 0.15)]:
    x = rng.normal(size=(64, width))
    for layer in range(50):
        x = np.maximum(x @ rng.normal(0, std, (width, width)), 0)
    print(f"{name:17} spread of activations at layer 50: {x.std():.3g}")
```

Only He initialisation keeps the signal near its starting size. With Xavier the signal halves at every ReLU layer; with the wrong scale it vanishes to almost nothing or explodes to astronomical numbers. Frameworks choose sensible defaults for you, but this is why they matter, and why very deep networks also add normalisation and residual connections.

```exercise
prompt: Complete He initialisation for a ReLU layer with `n_in` inputs and `n_out` outputs.
code: |
  W = rng.normal(0, np.sqrt(___ / n_in), (n_in, n_out))
answers: ["2"]
hint: ReLU zeroes about half its inputs, so the variance needs doubling.
```

```quiz
- q: What goes wrong if every weight starts at 0.5?
  options: ["Nothing", "Hidden units stay identical, so the layer acts like a single unit", "Training becomes faster", "The loss becomes negative"]
  answer: 1
- q: Which initialisation suits a deep ReLU network?
  options: ["All zeros", "He (Kaiming): std sqrt(2 / n_in)", "Xavier with a sigmoid output only", "Std 1.0 everywhere"]
  answer: 1
```

# Learning-Rate Schedules {#schedules}

The learning rate is the most important setting in deep learning. Too high and training explodes; too low and it crawls. The best value also changes during training: big steps help early, small steps help settle into a good minimum at the end. A **schedule** changes the learning rate as training goes on.

```python run title="Five common schedules"
import math

TOTAL, PEAK, WARMUP = 1000, 0.001, 100

def constant(t):  return PEAK
def step(t):      return PEAK * (0.1 ** (t // 400))                  # drop 10x every 400 steps
def cosine(t):    return PEAK * 0.5 * (1 + math.cos(math.pi * t / TOTAL))
def warmup_cosine(t):
    if t < WARMUP:
        return PEAK * t / WARMUP                                       # climb linearly from 0
    progress = (t - WARMUP) / (TOTAL - WARMUP)
    return PEAK * 0.1 + (PEAK - PEAK * 0.1) * 0.5 * (1 + math.cos(math.pi * progress))   # decay to 10%
def one_cycle(t):
    half = TOTAL * 0.3
    return PEAK * t / half if t < half else PEAK * 0.5 * (1 + math.cos(math.pi * (t - half) / (TOTAL - half)))

steps = [0, 50, 100, 300, 500, 800, 999]
print("step        " + "".join(f"{s:>9}" for s in steps))
for f in [constant, step, cosine, warmup_cosine, one_cycle]:
    print(f"{f.__name__:13}" + "".join(f"{f(s):9.5f}" for s in steps))
```

## Why warm up?

At step 0 the weights are random and Adam's running averages are empty, so early gradients are wild. A full-size learning rate at that moment can throw the model somewhere it never recovers from. **Warmup** starts near zero and climbs over the first few hundred or thousand steps. Every large transformer is trained with warmup followed by a decay.

| Model | Peak learning rate | Warmup | Then |
|---|---|---|---|
| ResNet-50 (images) | 0.1 with SGD | none | Divide by 10 at fixed epochs |
| BERT | 1e-4 | 10,000 steps | Linear decay |
| GPT-3 (175B) | 6e-5 to 6e-4, smaller for bigger models | 375 million tokens | Cosine decay |
| Llama 3 (405B) | 8e-5 | 8,000 steps | Cosine decay |

Published papers report these settings, and they are worth copying as starting points.

## Comparing schedules on a real task

With a gentle learning rate, the schedule hardly matters on a small problem. Push the peak learning rate high, as you would to train faster, and the difference shows: a constant rate keeps bouncing around the minimum, while a decaying one settles into it.

```python run title="Train the same network with three schedules"
import numpy as np, math
from sklearn.datasets import make_moons
X, y = make_moons(n_samples=400, noise=0.25, random_state=0)
y = y.reshape(-1, 1)

def train(schedule, steps=600, peak=16.0):
    rng = np.random.default_rng(0)
    W1, b1 = rng.normal(0, 1, (2, 32)), np.zeros(32)
    W2, b2 = rng.normal(0, 0.25, (32, 1)), np.zeros(1)
    losses = []
    for t in range(steps):
        lr = schedule(t, steps, peak)
        h = np.tanh(X @ W1 + b1)
        p = np.clip(1 / (1 + np.exp(-(h @ W2 + b2))), 1e-9, 1 - 1e-9)
        losses.append(float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))))
        dz2 = (p - y) / len(X)
        dh = (dz2 @ W2.T) * (1 - h ** 2)
        W2 -= lr * h.T @ dz2; b2 -= lr * dz2.sum(0)
        W1 -= lr * X.T @ dh;  b1 -= lr * dh.sum(0)
    return losses[-1], float(np.std(losses[-50:]))

schedules = {
    "constant":        lambda t, T, peak: peak,
    "cosine":          lambda t, T, peak: peak * 0.5 * (1 + math.cos(math.pi * t / T)),
    "warmup + cosine": lambda t, T, peak: peak * t / 50 if t < 50 else peak * 0.5 * (1 + math.cos(math.pi * (t - 50) / (T - 50))),
}
for name, s in schedules.items():
    loss, wobble = train(s)
    print(f"{name:16} final loss {loss:.3f}   bounce over the last 50 steps {wobble:.3f}")
```

```quiz
- q: What is learning-rate warmup?
  options: ["Running the model on a GPU", "Starting with a small learning rate and increasing it over the first steps", "Training on easy examples first", "Raising the learning rate at the end"]
  answer: 1
- q: Why lower the learning rate near the end of training?
  options: ["To use less memory", "Smaller steps let the weights settle into a good minimum", "To add more data", "Because the loss becomes negative"]
  answer: 1
```

# Build Your Own Mini Framework {#framework}

You now have every piece. A **framework** organises them so that building a new network takes five lines instead of fifty. PyTorch, Keras and JAX's Flax all share the same few ideas:

| Idea | What it is |
|---|---|
| **Module** | Anything with `forward` (compute the output) and `backward` (pass gradients back) |
| **Sequential** | A list of modules run one after another |
| **Loss** | A module whose output is the loss and whose backward starts the chain |
| **Optimiser** | Walks over every parameter and applies an update rule |
| **Data loader** | Shuffles the data and serves it in mini-batches |

```python run title="A mini framework in NumPy"
import numpy as np
from sklearn.datasets import make_circles
rng = np.random.default_rng(0)

class Linear:
    def __init__(self, n_in, n_out):
        self.W = rng.normal(0, np.sqrt(2 / n_in), (n_in, n_out)); self.b = np.zeros(n_out)
        self.dW = np.zeros_like(self.W); self.db = np.zeros_like(self.b)
    def forward(self, x):
        self.x = x
        return x @ self.W + self.b
    def backward(self, g):
        self.dW, self.db = self.x.T @ g, g.sum(axis=0)
        return g @ self.W.T
    def params(self):
        return [(self.W, self.dW), (self.b, self.db)]

class ReLU:
    def forward(self, x):
        self.mask = x > 0
        return x * self.mask
    def backward(self, g):
        return g * self.mask
    def params(self):
        return []

class Sequential:
    def __init__(self, *layers):
        self.layers = layers
    def forward(self, x):
        for layer in self.layers:
            x = layer.forward(x)
        return x
    def backward(self, g):
        for layer in reversed(self.layers):
            g = layer.backward(g)
    def params(self):
        return [p for layer in self.layers for p in layer.params()]

class SoftmaxCrossEntropy:
    def forward(self, logits, labels):
        shifted = logits - logits.max(axis=1, keepdims=True)
        self.probs = np.exp(shifted) / np.exp(shifted).sum(axis=1, keepdims=True)
        self.labels = labels
        return -np.log(self.probs[np.arange(len(labels)), labels]).mean()
    def backward(self):
        g = self.probs.copy()
        g[np.arange(len(self.labels)), self.labels] -= 1
        return g / len(self.labels)

class Adam:
    def __init__(self, params, lr=0.01, b1=0.9, b2=0.999):
        self.params, self.lr, self.b1, self.b2, self.t = params, lr, b1, b2, 0
        self.m = [np.zeros_like(p) for p, _ in params]; self.v = [np.zeros_like(p) for p, _ in params]
    def step(self, params):
        self.t += 1
        for i, (p, g) in enumerate(params):
            self.m[i] = self.b1 * self.m[i] + (1 - self.b1) * g
            self.v[i] = self.b2 * self.v[i] + (1 - self.b2) * g ** 2
            m_hat = self.m[i] / (1 - self.b1 ** self.t); v_hat = self.v[i] / (1 - self.b2 ** self.t)
            p -= self.lr * m_hat / (np.sqrt(v_hat) + 1e-8)       # updates the array in place

def batches(X, y, size):
    order = rng.permutation(len(X))
    for i in range(0, len(X), size):
        idx = order[i:i + size]
        yield X[idx], y[idx]

# --- using the framework: five lines to define and train a network ---
X, y = make_circles(n_samples=600, noise=0.1, factor=0.4, random_state=0)
model = Sequential(Linear(2, 32), ReLU(), Linear(32, 32), ReLU(), Linear(32, 2))
loss_fn, opt = SoftmaxCrossEntropy(), Adam(model.params(), lr=0.01)

for epoch in range(30):
    for xb, yb in batches(X, y, 32):
        loss = loss_fn.forward(model.forward(xb), yb)
        model.backward(loss_fn.backward())
        opt.step(model.params())
    if epoch % 10 == 9:
        acc = (model.forward(X).argmax(axis=1) == y).mean()
        print(f"epoch {epoch + 1}: loss {loss:.3f}, accuracy {acc:.1%}")
```

## The same network in PyTorch

PyTorch replaces your `backward` methods with autograd, runs on GPUs, and ships hundreds of ready-made layers. The shape of the code is the same as yours.

```python
import torch
from torch import nn

model = nn.Sequential(nn.Linear(2, 32), nn.ReLU(), nn.Linear(32, 32), nn.ReLU(), nn.Linear(32, 2))
loss_fn = nn.CrossEntropyLoss()
opt = torch.optim.AdamW(model.parameters(), lr=0.01)

for epoch in range(30):
    for xb, yb in loader:                 # a torch DataLoader
        loss = loss_fn(model(xb), yb)
        opt.zero_grad()                   # clear last step's gradients
        loss.backward()                   # autograd fills every .grad
        opt.step()
```

| Your framework | PyTorch |
|---|---|
| `Linear`, `ReLU`, `Sequential` | `nn.Linear`, `nn.ReLU`, `nn.Sequential` |
| `SoftmaxCrossEntropy` | `nn.CrossEntropyLoss` (takes raw scores, applies softmax inside) |
| `model.backward(...)` | `loss.backward()` |
| `Adam(...).step(...)` | `torch.optim.AdamW(...).step()` |
| `batches(X, y, 32)` | `torch.utils.data.DataLoader(dataset, batch_size=32, shuffle=True)` |
| Arrays on the CPU | `tensor.to("cuda")` for a GPU |

PyTorch doesn't run in this browser editor. To try it, open a free hosted notebook such as Google Colab or Kaggle, which give you a GPU for free. **JAX**, from Google, is the other major framework: it writes models as pure functions and compiles them with `jax.jit`, and is popular for research and TPUs.

```quiz
- q: In PyTorch, what does `opt.zero_grad()` prevent?
  options: ["Overfitting", "Gradients from the last step adding onto this step's", "The model running on a GPU", "Weights becoming zero"]
  answer: 1
- q: Which PyTorch class matches the `Sequential` you built?
  options: ["nn.Linear", "nn.Sequential", "torch.optim.Adam", "DataLoader"]
  answer: 1
```

# Debugging Neural Networks {#debugging}

A broken network rarely crashes. It just trains badly, and the loss curve is your main clue. Use this table first.

| What you see | Likely cause | Try first |
|---|---|---|
| Loss stuck at `log(number of classes)` | The model predicts the same for everything | Check that inputs and labels line up |
| Loss becomes `nan` after some steps | Learning rate too high | Divide the learning rate by 10 |
| Loss is `nan` from the start | `log(0)` or division by zero | Add a small epsilon, use a stable loss |
| Loss jumps up and down wildly | Learning rate too high or batches too small | Lower the learning rate, use bigger batches |
| Training accuracy high, test accuracy low | Overfitting | Weight decay, dropout, more data |
| Both accuracies low and equal | Underfitting, or nothing is learning | Run the overfit-one-batch test |
| Gradients are all zero | Dead ReLUs or a broken backward pass | Leaky ReLU, gradient checking |

## Test 1: overfit one small batch

A healthy network can memorise 8 examples almost perfectly. If it can't, the bug is in the code, not the data or the model size. This is the first test to run on any new model.

```python run title="The overfit-one-batch test catches a bug"
import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(size=(8, 5))
y = rng.integers(0, 3, size=8)

def train(X, y, buggy):
    W1, W2 = rng.normal(0, 0.5, (5, 32)), rng.normal(0, 0.5, (32, 3))
    losses = []
    for _ in range(500):
        h = np.maximum(X @ W1, 0)
        s = h @ W2
        p = np.exp(s - s.max(1, keepdims=True)); p /= p.sum(1, keepdims=True)
        losses.append(-np.log(np.clip(p[np.arange(8), y], 1e-12, 1)).mean())
        g = p.copy()
        if not buggy:
            g[np.arange(8), y] -= 1          # the line the buggy version forgot: subtract 1 at the true class
        g /= 8
        dW2 = h.T @ g
        dh = (g @ W2.T) * (h > 0)
        W1 -= 0.5 * X.T @ dh; W2 -= 0.5 * dW2
    return losses[0], losses[-1]

for buggy in [False, True]:
    start, end = train(X, y, buggy)
    print(f"{'buggy' if buggy else 'correct':7} network: loss {start:.3f} at the start, {end:.4f} after 500 steps")
```

The correct network drives the loss on 8 examples to almost zero. The buggy one makes it **worse** with every step, because one missing line in the softmax gradient points every update the wrong way. Bugs like this don't crash; only a test like this one catches them.

## Test 2: find a learning rate

The **learning-rate finder** trains briefly while increasing the learning rate step by step. The loss falls, flattens, then explodes. A good learning rate is a little below where it falls fastest, roughly a tenth of where it explodes.

```python run title="A learning-rate finder"
import numpy as np
from sklearn.datasets import make_moons
X, y = make_moons(n_samples=300, noise=0.2, random_state=0)
y = y.reshape(-1, 1)
rng = np.random.default_rng(0)
W1, W2 = rng.normal(0, 1, (2, 16)), rng.normal(0, 0.25, (16, 1))

for lr in np.logspace(-3, 1.5, 10):
    for _ in range(20):
        h = np.tanh(X @ W1)
        p = np.clip(1 / (1 + np.exp(-(h @ W2))), 1e-9, 1 - 1e-9)
        dz = (p - y) / len(X)
        dW2 = h.T @ dz
        dW1 = X.T @ ((dz @ W2.T) * (1 - h ** 2))
        W1 -= lr * dW1; W2 -= lr * dW2
    loss = float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
    print(f"lr {lr:8.4f}   loss {loss:.4f}  " + "#" * int(min(loss, 3) * 15))
```

## Test 3: watch the numbers inside

Print the spread of each layer's activations and gradients. Activations near zero everywhere suggest dead units or a bad initialisation; huge values suggest an explosion on the way. Tools like **TensorBoard** and **Weights & Biases** chart these for you during long training runs.

```quiz
- q: Your new model's loss starts as nan on the very first step. What is the most likely cause?
  options: ["Too much data", "A log of zero or a division by zero", "The learning rate is too low", "Too few layers"]
  answer: 1
- q: Why run the overfit-one-batch test before full training?
  options: ["It makes the model more accurate", "If a network can't memorise 8 examples, the code has a bug", "It replaces the test set", "It chooses the activation function"]
  answer: 1
```

# Capstone: A Digit Recogniser in Your Browser {#capstone}

Time to put it all together. You will train a network to read handwritten digits, the "hello world" of deep learning. The dataset ships with scikit-learn: 1,797 images of 8×8 pixels, each labelled 0 to 9. Everything runs in your browser in a few seconds.

```python run title="Look at the data"
import numpy as np
from sklearn.datasets import load_digits
digits = load_digits()
print("images:", digits.images.shape, " labels:", np.bincount(digits.target))
shades = " .:-=+*#%@"
for row in digits.images[0]:
    print("".join(shades[int(v * 9 / 16)] * 2 for v in row))
print("label:", digits.target[0])
```

Now the full pipeline: split the data, scale it, build a 64-64-10 network with He initialisation and ReLU, train it with Adam and mini-batches, and measure it on images it has never seen.

```python run title="Train and test the digit recogniser"
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
rng = np.random.default_rng(0)

digits = load_digits()
X = digits.data / 16.0                                     # pixels 0..16 -> 0..1
X_train, X_test, y_train, y_test = train_test_split(X, digits.target, test_size=0.25, random_state=0, stratify=digits.target)

sizes = [64, 64, 10]
W = [rng.normal(0, np.sqrt(2 / a), (a, b)) for a, b in zip(sizes[:-1], sizes[1:])]
b = [np.zeros(n) for n in sizes[1:]]
params = W + b
m = [np.zeros_like(p) for p in params]; v = [np.zeros_like(p) for p in params]
lr, wd, t = 0.003, 1e-4, 0

def forward(x):
    h = np.maximum(x @ W[0] + b[0], 0)
    return h, h @ W[1] + b[1]

for epoch in range(25):
    order = rng.permutation(len(X_train))
    for i in range(0, len(order), 32):
        idx = order[i:i + 32]
        xb, yb = X_train[idx], y_train[idx]
        h, s = forward(xb)
        p = np.exp(s - s.max(1, keepdims=True)); p /= p.sum(1, keepdims=True)
        g = p.copy(); g[np.arange(len(yb)), yb] -= 1; g /= len(yb)
        dh = (g @ W[1].T) * (h > 0)
        grads = [xb.T @ dh, h.T @ g, dh.sum(0), g.sum(0)]
        t += 1
        for k, (prm, gr) in enumerate(zip(params, grads)):     # AdamW
            m[k] = 0.9 * m[k] + 0.1 * gr
            v[k] = 0.999 * v[k] + 0.001 * gr ** 2
            prm -= lr * ((m[k] / (1 - 0.9 ** t)) / (np.sqrt(v[k] / (1 - 0.999 ** t)) + 1e-8) + wd * prm)
    if epoch % 5 == 4:
        train_acc = (forward(X_train)[1].argmax(1) == y_train).mean()
        test_acc = (forward(X_test)[1].argmax(1) == y_test).mean()
        print(f"epoch {epoch + 1:2}: train {train_acc:.1%}  test {test_acc:.1%}")

pred = forward(X_test)[1].argmax(1)
wrong = np.flatnonzero(pred != y_test)
print(f"\n{len(wrong)} of {len(y_test)} test digits misread. Most common mix-ups:")
pairs = {}
for i in wrong:
    key = (int(y_test[i]), int(pred[i]))
    pairs[key] = pairs.get(key, 0) + 1
for (real, said), n in sorted(pairs.items(), key=lambda kv: -kv[1])[:3]:
    print(f"  true {real}, read as {said}: {n}x")
```

## Make it yours

Change one thing at a time and record the test accuracy:

1. Remove the scaling (`/ 16.0`). What happens to training, and why?
2. Replace He initialisation with `std = 1.0`. Does it still learn?
3. Add a second hidden layer of 64 units. Is it worth it on 1,797 images?
4. Try learning rates 0.0003, 0.003 and 0.03.
5. Add dropout with `p = 0.2` to the hidden layer during training only.

When you're happy with your model, the next step is the architecture behind every modern language model: **[Transformers & Tiny LLMs](/learn/transformers)**.

> **Credit.** Adapted and extended from Phase 3 of *[AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch)* by Rohit Ghumare (MIT License).

```quiz
- q: Why divide the pixel values by 16 before training?
  options: ["To make the images smaller", "To put inputs on a small, steady scale so training is stable", "To remove the labels", "Because the network needs integers"]
  answer: 1
- q: Which accuracy tells you how well the recogniser will do on new handwriting?
  options: ["Training accuracy", "Test accuracy on images it never trained on", "The loss on the first batch", "The number of parameters"]
  answer: 1
```

```exam
- q: "Why does every hidden layer need a non-linear activation?"
  options: ["To make training faster", "Without one, stacked layers collapse into a single linear layer", "To reduce memory", "So the output adds to 1"]
  answer: 1
  explain: "A product of matrices is still one matrix."
- q: "Which activation is the usual choice inside transformers?"
  options: ["Sigmoid", "Step", "GELU", "Softmax"]
  answer: 2
- q: "A classifier's loss is stuck at log(10) on a 10-class problem. What does that suggest?"
  options: ["It is predicting the same probability for every class", "It has overfitted", "The learning rate is perfect", "The model is too big"]
  answer: 0
  explain: "log(classes) is the loss of a uniform guess."
- q: "What does the log-sum-exp trick protect against?"
  options: ["Overfitting", "Overflow when exponentiating large scores", "Dead ReLUs", "Slow data loading"]
  answer: 1
- q: "What does Adam add on top of momentum?"
  options: ["Per-weight step sizes from a running average of squared gradients", "A bigger batch", "Dropout", "A learning-rate warmup"]
  answer: 0
- q: "How does AdamW differ from Adam with an L2 penalty?"
  options: ["It has no learning rate", "It applies weight decay directly to the weights", "It ignores the gradient", "It only works on CPUs"]
  answer: 1
- q: "Which normalisation works per example and is used in Llama-style LLMs?"
  options: ["Batch norm", "RMSNorm", "Dropout", "Min-max scaling"]
  answer: 1
- q: "Which weight initialisation suits deep ReLU networks?"
  options: ["All zeros", "He: std sqrt(2 / n_in)", "Std 1.0", "Xavier for the output only"]
  answer: 1
- q: "Why use learning-rate warmup for transformers?"
  options: ["Early gradients are noisy, so starting small avoids a damaging first update", "It saves memory", "It removes the need for a test set", "It replaces the optimiser"]
  answer: 0
- q: "What is the first test to run on a new network?"
  options: ["Train for a week", "Overfit one small batch", "Add more layers", "Remove the activation functions"]
  answer: 1
  explain: "If it can't memorise 8 examples, the code has a bug."
```
