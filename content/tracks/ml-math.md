---
id: ml-math
title: Mathematics & First Principles of ML
short: ML MATH
category: maths-data
level: intermediate
language: python
color: "#3D3B8E"
icon: "∑"
order: 40.5
summary: 'Understand machine learning from the ground up. What "learning" actually means, then the maths that makes it work, built in code: vectors, matrices, derivatives, the chain rule and backpropagation, gradient descent, probability, likelihood and cross-entropy, ending with a neural network written from scratch.'
tags: [mathematics, linear algebra, calculus, gradient descent, backpropagation, probability, first principles, neural networks, machine learning fundamentals]
---

# Machine Learning from First Principles {#first-principles}

**First-principles thinking** means breaking an idea down to the facts you can't reduce further, then rebuilding from there. For machine learning, those facts are surprisingly few:

1. **There's a function we want.** For example, from a photo of a maize leaf to "healthy" or "blight"; from house features to price; from a sentence to the next word.
2. **We can't write it by hand**, but we have **examples** of inputs and correct outputs.
3. We choose a **family of functions with adjustable numbers** (parameters), such as `y = w·x + b`, or a neural network with millions of weights.
4. We define a **loss**: one number that says how wrong the function is on the examples.
5. We **adjust the parameters to make the loss smaller**, using calculus (gradients) to know which way to move each one.
6. We check that it works on **new examples** it never saw (generalisation), because memorising the training data is easy and useless.

```sketch
title: The learning loop
caption: Every model, from linear regression to a large language model, is trained by this loop. Only the model family and the data change.
cellW: 170
cellH: 108
nodes:
  - id: data
    label: Examples
    sub: (x, y) pairs
    col: 0
    row: 1
    shape: db
    tone: teal
  - id: model
    label: Model f(x; θ)
    sub: parameters θ
    col: 1.3
    row: 0
    shape: round
    tone: grape
  - id: pred
    label: Prediction ŷ
    col: 2.6
    row: 0
    shape: round
    tone: sky
  - id: loss
    label: Loss L(ŷ, y)
    sub: how wrong?
    col: 2.6
    row: 1.3
    shape: diamond
    tone: rose
    w: 0.95
    h: 1
  - id: grad
    label: Gradient ∂L/∂θ
    sub: which way is downhill?
    col: 1.3
    row: 1.3
    shape: round
    tone: gold
  - id: upd
    label: "θ ← θ − η·∂L/∂θ"
    col: 0
    row: 2.5
    shape: note
edges:
  - from: data
    to: model
    label: x
  - from: model
    to: pred
  - from: pred
    to: loss
  - from: data
    to: loss
    label: y
    bend: -30
  - from: loss
    to: grad
    label: backprop
  - from: grad
    to: upd
  - from: upd
    to: model
    label: update
```

This track builds every piece of that loop from scratch. Each section answers one question:

| Question | Maths |
|---|---|
| How do we represent data and parameters? | **Vectors and matrices** (linear algebra) |
| How does a small change in a parameter change the loss? | **Derivatives and gradients** (calculus) |
| How do we get gradients through many layers? | **The chain rule** → **backpropagation** |
| How do we use gradients to learn? | **Gradient descent** (optimisation) |
| What loss should we use and why? | **Probability, likelihood, cross-entropy** |

```python run title="The whole idea in 15 lines"
# Learn the rule "price = 2 × size + 1" from examples, starting from a wrong guess.
data = [(1, 3), (2, 5), (3, 7), (4, 9)]
w, b = 0.0, 0.0                        # parameters: start knowing nothing
lr = 0.05                              # learning rate: step size

for step in range(501):
    # loss = mean squared error; its gradients tell us how to change w and b
    dw = sum(2 * (w * x + b - y) * x for x, y in data) / len(data)
    db = sum(2 * (w * x + b - y) for x, y in data) / len(data)
    w, b = w - lr * dw, b - lr * db
    if step in (0, 10, 50, 500):
        loss = sum((w * x + b - y) ** 2 for x, y in data) / len(data)
        print(f"step {step:>3}: w={w:.3f} b={b:.3f} loss={loss:.5f}")
```

```quiz
- q: What does a loss function measure?
  options: ["Training speed", "How wrong the model's predictions are, as one number to minimise", "The number of parameters", "Accuracy on new data only"]
  answer: 1
- q: Why must we test on examples the model never saw?
  options: ["To save time", "Low training loss can come from memorising; only unseen data shows generalisation", "It's a legal requirement", "Gradients need it"]
  answer: 1
```

# Vectors {#vectors}

A **vector** is an ordered list of numbers. In ML, a vector can be one example's features (`[size_m2, bedrooms, distance_km]`), a model's weights, or an **embedding** of a word or document.

| Operation | Formula | Meaning |
|---|---|---|
| Addition | (a + b)ᵢ = aᵢ + bᵢ | Combine |
| Scaling | (c·a)ᵢ = c·aᵢ | Stretch or shrink |
| **Dot product** | a·b = Σ aᵢbᵢ | How aligned two vectors are (and a weighted sum) |
| **Length (L2 norm)** | ‖a‖ = √(a·a) | Size |
| **Cosine similarity** | a·b / (‖a‖‖b‖) | Angle-based similarity, −1…1 |

The dot product is everywhere: a neuron computes `w·x + b`; attention compares queries with keys by dot products; semantic search ranks documents by cosine similarity.

```sketch
title: The dot product as alignment
caption: a·b = ‖a‖ ‖b‖ cos θ. Same direction gives a large positive value, perpendicular gives zero, opposite gives negative.
cellW: 150
cellH: 100
nodes:
  - id: o1
    shape: dot
    col: 0
    row: 1
  - id: a1
    label: a
    shape: dot
    col: 1.2
    row: 0.2
  - id: b1
    label: b
    shape: dot
    col: 1.4
    row: 0.5
  - id: o2
    shape: dot
    col: 2.2
    row: 1
  - id: a2
    label: a
    shape: dot
    col: 3.3
    row: 1
  - id: b2
    label: b
    shape: dot
    col: 2.2
    row: 0
  - id: o3
    shape: dot
    col: 4.4
    row: 1
  - id: a3
    label: a
    shape: dot
    col: 5.4
    row: 0.5
  - id: b3
    label: b
    shape: dot
    col: 3.6
    row: 1.5
  - id: t1
    label: "large +"
    col: 0.7
    row: 1.6
    shape: note
  - id: t2
    label: "zero"
    col: 2.7
    row: 1.6
    shape: note
  - id: t3
    label: "negative"
    col: 4.7
    row: 1.6
    shape: note
edges:
  - from: o1
    to: a1
  - from: o1
    to: b1
  - from: o2
    to: a2
  - from: o2
    to: b2
  - from: o3
    to: a3
  - from: o3
    to: b3
```

```python run title="Vector operations by hand, then with NumPy"
import math

a = [0.9, 0.1, 0.4]     # "tuition loan" embedding
b = [0.8, 0.2, 0.5]     # "student loan" embedding
c = [0.0, 0.9, -0.3]    # "weather" embedding

def dot(u, v): return sum(x * y for x, y in zip(u, v))
def norm(u): return math.sqrt(dot(u, u))
def cos(u, v): return dot(u, v) / (norm(u) * norm(v))

print(f"a·b = {dot(a, b):.2f}, |a| = {norm(a):.2f}")
print(f"cos(a, b) = {cos(a, b):.3f}   (similar meaning)")
print(f"cos(a, c) = {cos(a, c):.3f}   (unrelated)")

import numpy as np
A, B = np.array(a), np.array(b)
print("NumPy:", A @ B, np.linalg.norm(A), A + B, 2 * A)
```

```exercise
prompt: Complete cosine similarity.
code: |
  cos = dot(u, v) / (___(u) * ___(v))
answers: [norm, norm]
```

```quiz
- q: Two embeddings have cosine similarity 0.98. This suggests…
  options: ["They are unrelated", "Their meanings are very similar", "They are opposites", "One is longer"]
  answer: 1
- q: A single neuron computes…
  options: ["A matrix inverse", "A dot product of weights and inputs plus a bias, then an activation", "A sort", "A cosine"]
  answer: 1
```

# Matrices {#matrices}

A **matrix** is a grid of numbers: a whole dataset (rows = examples, columns = features), or a **layer of weights** that transforms one vector into another.

**Matrix–vector multiplication** `W @ x` computes one dot product per row of W: each output is a weighted sum of the inputs. A neural network layer is exactly `y = activation(W @ x + b)`.

| Rule | Detail |
|---|---|
| Shapes | (m × n) @ (n × p) → (m × p); inner sizes must match |
| Order matters | A @ B ≠ B @ A in general |
| Transpose | Aᵀ swaps rows and columns |
| Identity I | I @ x = x |
| Batching | Stack many inputs as rows of X; `X @ Wᵀ` transforms them all at once (why GPUs love matrices) |

```python run title="A neural network layer is a matrix multiplication"
import numpy as np

x = np.array([120.0, 3.0, 5.0])          # one house: size m², bedrooms, km to CBD
W = np.array([[0.02, 0.5, -0.3],          # 2 neurons × 3 inputs
              [0.01, -0.2, 0.1]])
b = np.array([0.1, -0.5])

z = W @ x + b                             # shapes: (2×3) @ (3,) + (2,) -> (2,)
relu = np.maximum(z, 0)
print("pre-activation:", z)
print("after ReLU:   ", relu)

X = np.array([[120.0, 3.0, 5.0], [60.0, 1.0, 2.0], [250.0, 5.0, 12.0]])   # a batch of 3 houses
print("batch output shape:", (X @ W.T + b).shape)
print(X @ W.T + b)

# Shapes must line up
try:
    W @ np.array([1.0, 2.0])
except ValueError as e:
    print("shape error:", e)
```

## Transformations

Multiplying by a matrix **transforms space**: rotate, stretch, project. Deep networks stack many such transformations with non-linear activations in between, bending space until the classes become separable.

```python run title="Matrices transform space"
import numpy as np
square = np.array([[0, 0], [1, 0], [1, 1], [0, 1]]).T            # corners as columns
theta = np.pi / 4
rotate = np.array([[np.cos(theta), -np.sin(theta)], [np.sin(theta), np.cos(theta)]])
stretch = np.array([[2.0, 0.0], [0.0, 0.5]])
print("rotated 45°:\n", np.round(rotate @ square, 2))
print("stretched x2, squashed y/2:\n", stretch @ square)
print("rotate then stretch = one matrix:\n", np.round(stretch @ rotate, 2))
```

```quiz
- q: W has shape (64, 128) and x has shape (128,). What is the shape of W @ x?
  options: ["(128,)", "(64,)", "(64, 128)", "Error"]
  answer: 1
- q: Why do GPUs speed up neural networks so much?
  options: ["They have more RAM", "Training is mostly huge matrix multiplications, which GPUs do in parallel", "They run Python faster", "They compress data"]
  answer: 1
```

# Derivatives and Gradients {#derivatives}

The **derivative** of a function at a point is its **slope** there: how much the output changes for a tiny change in the input.

```text
f'(x) ≈ (f(x + h) − f(x)) / h      for a very small h
```

For a function of many inputs (a loss depends on millions of weights), the **partial derivative** ∂L/∂wᵢ measures the effect of one weight with the others held fixed. Collected together they form the **gradient** ∇L, a vector pointing **uphill**; we step the other way.

| Function | Derivative |
|---|---|
| c (constant) | 0 |
| xⁿ | n·xⁿ⁻¹ |
| eˣ | eˣ |
| ln x | 1/x |
| sum f + g | f' + g' |
| product f·g | f'g + fg' |

```python run title="Numerical derivatives match the rules"
import math

def numerical_derivative(f, x, h=1e-6):
    return (f(x + h) - f(x - h)) / (2 * h)              # central difference: more accurate

cases = [
    ("x^2 at 3", lambda x: x ** 2, 3, 2 * 3),
    ("x^3 at 2", lambda x: x ** 3, 2, 3 * 2 ** 2),
    ("e^x at 1", math.exp, 1, math.exp(1)),
    ("ln x at 4", math.log, 4, 1 / 4),
    ("sigmoid at 0", lambda x: 1 / (1 + math.exp(-x)), 0, 0.25),
]
for name, f, x, exact in cases:
    print(f"{name:13} numerical {numerical_derivative(f, x):.6f}   rule {exact:.6f}")

# A gradient: loss depends on two parameters
def loss(w, b):
    return (w * 2 + b - 7) ** 2
w, b, h = 1.0, 1.0, 1e-6
grad = ((loss(w + h, b) - loss(w - h, b)) / (2 * h), (loss(w, b + h) - loss(w, b - h)) / (2 * h))
print("gradient of loss at (1, 1):", tuple(round(g, 4) for g in grad), "-> increase both w and b to go downhill")
```

Numerical derivatives are great for **checking** your maths (gradient checking), but too slow for training: one loss evaluation per parameter. Backpropagation gets all of them in one backward pass.

```quiz
- q: What does the gradient of the loss point towards?
  options: ["The minimum", "The direction of steepest increase", "Zero", "The data"]
  answer: 1
- q: The derivative of x³ is…
  options: ["x²", "3x²", "3x", "x⁴/4"]
  answer: 1
- q: Why don't we train large networks with numerical derivatives?
  options: ["They're wrong", "They need a separate loss evaluation per parameter, far too slow for millions of weights", "They need GPUs", "They only work for x²"]
  answer: 1
```

# The Chain Rule and Backpropagation {#chain-rule}

A network is a **composition** of functions: input → layer 1 → layer 2 → … → loss. The **chain rule** says how a change ripples through a composition:

```text
if y = f(g(x)), then dy/dx = f'(g(x)) · g'(x)
```

**Backpropagation** applies the chain rule **backwards** through the computation graph: start with ∂L/∂L = 1 at the loss, and at each node multiply by the local derivative to get the gradient of every intermediate value and every parameter, in **one** pass.

```sketch
title: A computation graph, forward and backward
caption: Forward pass computes values left to right. Backward pass multiplies local derivatives right to left (the chain rule) to get every gradient.
cellW: 160
cellH: 110
nodes:
  - id: x
    label: "x = 2"
    col: 0
    row: 0
    shape: circle
    w: 0.55
    h: 0.75
  - id: w
    label: "w = 3"
    col: 0
    row: 1.2
    shape: circle
    tone: gold
    w: 0.55
    h: 0.75
  - id: mul
    label: "×"
    sub: "z = 6"
    col: 1.2
    row: 0.6
    shape: circle
    tone: sky
    w: 0.55
    h: 0.75
  - id: b
    label: "b = 1"
    col: 1.2
    row: 1.8
    shape: circle
    tone: gold
    w: 0.55
    h: 0.75
  - id: add
    label: "+"
    sub: "ŷ = 7"
    col: 2.4
    row: 1
    shape: circle
    tone: sky
    w: 0.55
    h: 0.75
  - id: loss
    label: "(ŷ − 10)²"
    sub: "L = 9"
    col: 3.7
    row: 1
    shape: circle
    tone: rose
    w: 0.75
    h: 0.9
edges:
  - from: x
    to: mul
  - from: w
    to: mul
    label: "∂L/∂w = −12"
  - from: mul
    to: add
  - from: b
    to: add
    label: "∂L/∂b = −6"
  - from: add
    to: loss
    label: "∂L/∂ŷ = 2(ŷ−10) = −6"
```

## Build a tiny autodiff engine

This is the core idea behind PyTorch's `autograd`, in about 40 lines: each value remembers how it was made and how to pass gradients back.

```python run title="Automatic differentiation from scratch"
import math

class Value:
    def __init__(self, data, parents=(), op=""):
        self.data, self.grad = data, 0.0
        self._parents, self._op = parents, op
        self._backward = lambda: None

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")
        def backward():                       # d(a+b)/da = 1, d(a+b)/db = 1
            self.grad += out.grad
            other.grad += out.grad
        out._backward = backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")
        def backward():                       # d(ab)/da = b, d(ab)/db = a
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = backward
        return out

    def __sub__(self, other): return self + (other * -1 if isinstance(other, Value) else Value(-other))
    def __pow__(self, k):
        out = Value(self.data ** k, (self,), f"**{k}")
        def backward():
            self.grad += k * self.data ** (k - 1) * out.grad
        out._backward = backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")
        def backward():
            self.grad += (1 - t * t) * out.grad
        out._backward = backward
        return out

    def backward(self):
        order, seen = [], set()
        def visit(v):                         # topological order: parents before children
            if v not in seen:
                seen.add(v)
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = 1.0
        for v in reversed(order):
            v._backward()

# The graph from the diagram: L = (w·x + b − 10)²
x, w, b = Value(2.0), Value(3.0), Value(1.0)
L = (w * x + b - 10) ** 2
L.backward()
print(f"L = {L.data}, dL/dw = {w.grad}, dL/db = {b.grad}, dL/dx = {x.grad}")

# One gradient-descent step lowers the loss
lr = 0.05
w2, b2 = Value(w.data - lr * w.grad), Value(b.data - lr * b.grad)
print("loss after one step:", ((w2 * x + b2 - 10) ** 2).data)
```

```quiz
- q: If y = f(g(x)), the chain rule gives dy/dx =
  options: ["f'(x) + g'(x)", "f'(g(x)) · g'(x)", "f(x) · g(x)", "f'(x) / g'(x)"]
  answer: 1
- q: What does backpropagation compute in one backward pass?
  options: ["Only the loss", "The gradient of the loss with respect to every parameter", "The best learning rate", "Predictions"]
  answer: 1
- q: Why does each node add (+=) to its grad rather than set it?
  options: ["A bug", "A value used in several places receives gradient from each use, and these must be summed", "To make it slower", "Python requires +="]
  answer: 1
```

# Gradient Descent {#gradient-descent}

**Gradient descent** repeats one step: **θ ← θ − η · ∇L(θ)**, where η (eta) is the **learning rate**.

```sketch
title: Gradient descent on a loss surface
caption: Too small a step crawls; a good step converges; too large a step overshoots and diverges.
cellW: 160
cellH: 100
nodes:
  - id: s1
    label: tiny η
    sub: slow
    col: 0
    row: 0
    shape: pill
    tone: sky
  - id: s2
    label: good η
    sub: converges
    col: 1.5
    row: 0
    shape: pill
    tone: teal
  - id: s3
    label: huge η
    sub: diverges
    col: 3
    row: 0
    shape: pill
    tone: rose
  - id: m
    label: minimum
    col: 1.5
    row: 1.3
    shape: dot
edges:
  - from: s1
    to: m
    dashed: true
    label: "…many steps"
  - from: s2
    to: m
  - from: s3
    to: m
    dashed: true
    label: overshoot
    bend: 30
```

```python run title="The learning rate decides everything"
def train(lr, steps=30):
    w = 0.0                                   # minimise L(w) = (w - 4)^2; best w = 4
    for _ in range(steps):
        grad = 2 * (w - 4)
        w -= lr * grad
    return w, (w - 4) ** 2

for lr in (0.01, 0.1, 0.5, 0.9, 1.1):
    w, loss = train(lr)
    print(f"lr={lr:<4} final w={w:12.4f}  loss={loss:.3e}")
```

## Variants used in practice

| Optimiser | Idea | Why |
|---|---|---|
| **Batch GD** | Gradient over all data each step | Exact but slow on big data |
| **Stochastic GD (SGD)** | Gradient from one example | Fast, noisy |
| **Mini-batch SGD** | Gradient from 32–4,096 examples | The standard: fast, GPU-friendly, noise helps escape bad spots |
| **Momentum** | Keep a running velocity of gradients | Rolls through small bumps, faster along consistent directions |
| **Adam / AdamW** | Momentum + per-parameter step sizes (+ decoupled weight decay) | The default for deep learning and LLM training |

```python run title="Mini-batch SGD vs momentum on a linear regression"
import random
random.seed(0)
data = [(x, 3 * x - 2 + random.gauss(0, 0.5)) for x in [i / 10 for i in range(-30, 30)]]

def fit(momentum=0.0, lr=0.01, epochs=40, batch=8):
    w = b = vw = vb = 0.0
    for _ in range(epochs):
        random.shuffle(data)
        for i in range(0, len(data), batch):
            chunk = data[i:i + batch]
            gw = sum(2 * (w * x + b - y) * x for x, y in chunk) / len(chunk)
            gb = sum(2 * (w * x + b - y) for x, y in chunk) / len(chunk)
            vw = momentum * vw - lr * gw
            vb = momentum * vb - lr * gb
            w, b = w + vw, b + vb
    mse = sum((w * x + b - y) ** 2 for x, y in data) / len(data)
    return w, b, mse

for m in (0.0, 0.9):
    w, b, mse = fit(momentum=m)
    print(f"momentum {m}: w={w:.3f} b={b:.3f} mse={mse:.3f}   (true w=3, b=-2)")
```

````challenge
id: mlmath-gradient-descent
title: Fit a line with gradient descent
difficulty: medium
prompt: |
  Write `fit_line(xs, ys, lr=0.01, steps=2000)` that starts at `w = 0, b = 0` and runs **batch gradient descent** on the **mean squared error** `mean((w·x + b − y)²)`, returning `(w, b)` rounded to 2 decimals.

  The gradients are `dw = mean(2·(w·x + b − y)·x)` and `db = mean(2·(w·x + b − y))`.
starter: |
  def fit_line(xs, ys, lr=0.01, steps=2000):
      w, b = 0.0, 0.0
      return round(w, 2), round(b, 2)

  print(fit_line([0, 1, 2, 3, 4], [1, 3, 5, 7, 9]))
tests: |
  assert fit_line([0, 1, 2, 3, 4], [1, 3, 5, 7, 9]) == (2.0, 1.0), fit_line([0, 1, 2, 3, 4], [1, 3, 5, 7, 9])
  assert fit_line([1, 2, 3, 4], [-1, -4, -7, -10], lr=0.02, steps=5000) == (-3.0, 2.0)
  w, b = fit_line([0, 1, 2], [5, 5, 5])
  assert (w, b) == (0.0, 5.0), (w, b)
````

```quiz
- q: The loss explodes to huge numbers during training. The first thing to try?
  options: ["Raise the learning rate", "Lower the learning rate", "Add more layers", "Remove the bias"]
  answer: 1
- q: Why is mini-batch SGD the standard?
  options: ["It's exact", "It's fast and GPU-friendly, and its noise can help optimisation", "It needs no learning rate", "It never overfits"]
  answer: 1
- q: Which optimiser is the common default for training deep networks and LLMs?
  options: ["Plain batch GD", "Adam / AdamW", "Newton's method", "Grid search"]
  answer: 1
```

# Probability, Likelihood and Cross-Entropy {#probability-ml}

Why do classifiers use **cross-entropy** loss? From first principles:

1. A classifier outputs a **probability** for each class (via **softmax** over raw scores called **logits**).
2. The **likelihood** of the data is the probability the model assigned to the **correct** labels. We want it as **high** as possible: **maximum likelihood estimation** (MLE).
3. Multiplying many probabilities underflows, so we take **logs**; maximising log-likelihood = minimising **negative log-likelihood**.
4. For one example with true class *c*, that's **−log p(c)**: the **cross-entropy loss**. Confident and right ≈ 0; confident and wrong → large.

```python run title="Softmax, cross-entropy and why confident mistakes hurt"
import math

def softmax(logits):
    m = max(logits)                                   # subtract max for numerical stability
    exps = [math.exp(z - m) for z in logits]
    s = sum(exps)
    return [e / s for e in exps]

classes = ["healthy", "blight", "rust"]
for logits, truth in (([4.0, 1.0, 0.5], "healthy"), ([1.0, 1.1, 0.9], "healthy"), ([0.2, 5.0, 0.1], "healthy")):
    p = softmax(logits)
    loss = -math.log(p[classes.index(truth)])
    print(f"logits {logits} -> probs {[round(x, 3) for x in p]}  true={truth:8} loss={loss:.3f}")
```

## Entropy and KL divergence

- **Entropy** H(p) = −Σ p log p measures uncertainty: a fair coin has more than a loaded coin.
- **Cross-entropy** H(p, q) = −Σ p log q: the cost of using predictions *q* when the truth is *p*.
- **KL divergence** KL(p‖q) = H(p, q) − H(p) ≥ 0: how far *q* is from *p*. Minimising cross-entropy with fixed labels is minimising KL.

Language models are trained exactly this way: at every position, cross-entropy between the model's next-token distribution and the actual next token. **Perplexity** is just e^(average cross-entropy).

```python run title="Entropy, cross-entropy, KL and perplexity"
import math

def H(p): return -sum(x * math.log(x) for x in p if x > 0)
def cross(p, q): return -sum(x * math.log(y) for x, y in zip(p, q) if x > 0)

fair, loaded = [0.5, 0.5], [0.9, 0.1]
print(f"entropy fair coin {H(fair):.3f}, loaded coin {H(loaded):.3f}")
truth, model = [0.7, 0.2, 0.1], [0.5, 0.3, 0.2]
print(f"cross-entropy {cross(truth, model):.3f} = entropy {H(truth):.3f} + KL {cross(truth, model) - H(truth):.3f}")

# A language model's probabilities for the actual next tokens in a sentence
probs_of_actual_tokens = [0.6, 0.35, 0.8, 0.12, 0.5]
avg_ce = -sum(math.log(p) for p in probs_of_actual_tokens) / len(probs_of_actual_tokens)
print(f"average cross-entropy {avg_ce:.3f} nats -> perplexity {math.exp(avg_ce):.2f}")
```

```quiz
- q: Cross-entropy loss for one example is…
  options: ["The probability of the wrong class", "−log of the probability assigned to the correct class", "The squared error", "The entropy of the labels"]
  answer: 1
- q: What does softmax do?
  options: ["Picks the largest logit", "Turns logits into probabilities that sum to 1", "Normalises vectors to length 1", "Removes negatives"]
  answer: 1
- q: Training a model with cross-entropy is equivalent to…
  options: ["Minimising accuracy", "Maximum likelihood estimation", "Maximising entropy", "Random search"]
  answer: 1
```

# Logistic Regression: One Neuron {#logistic}

**Logistic regression** is a single neuron with a **sigmoid** activation: σ(z) = 1/(1 + e⁻ᶻ), z = w·x + b. It outputs the probability of class 1, is trained with binary cross-entropy, and draws a straight **decision boundary**. A beautiful fact: its gradient is simply **(prediction − label) × input**.

```python run title="Train logistic regression from scratch"
import math, random
random.seed(1)

# Will a learner finish the course? Features: hours/week studied, lessons completed in week 1
def make(n):
    data = []
    for _ in range(n):
        hours, lessons = random.uniform(0, 10), random.randint(0, 8)
        p = 1 / (1 + math.exp(-(0.8 * hours + 0.6 * lessons - 6)))
        data.append(((hours, lessons), 1 if random.random() < p else 0))
    return data
train, test = make(400), make(200)

def sigmoid(z): return 1 / (1 + math.exp(-z))
w, b, lr = [0.0, 0.0], 0.0, 0.2
for epoch in range(1000):
    gw, gb = [0.0, 0.0], 0.0
    for (x1, x2), y in train:
        err = sigmoid(w[0] * x1 + w[1] * x2 + b) - y        # prediction - label
        gw[0] += err * x1; gw[1] += err * x2; gb += err
    n = len(train)
    w = [w[0] - lr * gw[0] / n, w[1] - lr * gw[1] / n]
    b -= lr * gb / n

def accuracy(data):
    return sum((sigmoid(w[0] * x1 + w[1] * x2 + b) >= 0.5) == bool(y) for (x1, x2), y in data) / len(data)
print(f"weights {w[0]:.2f}, {w[1]:.2f}, bias {b:.2f}   (data was generated with 0.8, 0.6, -6)")
print(f"train accuracy {accuracy(train):.2%}, test accuracy {accuracy(test):.2%}")
print(f"P(finish | 6 h/week, 4 lessons) = {sigmoid(w[0] * 6 + w[1] * 4 + b):.2f}")
```

```quiz
- q: What shape is logistic regression's decision boundary?
  options: ["A circle", "A straight line (hyperplane)", "Any curve", "A tree"]
  answer: 1
- q: For logistic regression with cross-entropy, the gradient for weight wᵢ on one example is…
  options: ["(prediction − label) × xᵢ", "label × xᵢ", "prediction²", "0"]
  answer: 0
```

# A Neural Network from Scratch {#neural-net}

One neuron draws a straight line. **XOR** (output 1 when exactly one input is 1) can't be separated by a line, so we add a **hidden layer** with a non-linear activation. Below, every piece you've learned comes together: matrices for the layers, tanh and sigmoid activations, cross-entropy loss, the chain rule for backprop, and gradient descent.

```sketch
title: A 2-4-1 network for XOR
caption: The hidden layer bends the input space so that one final neuron can separate the classes.
cellW: 150
cellH: 75
nodes:
  - id: x1
    label: x₁
    col: 0
    row: 1
    shape: circle
    w: 0.45
    h: 0.75
  - id: x2
    label: x₂
    col: 0
    row: 2.5
    shape: circle
    w: 0.45
    h: 0.75
  - id: h1
    label: h₁
    col: 1.5
    row: 0
    shape: circle
    tone: sky
    w: 0.45
    h: 0.75
  - id: h2
    label: h₂
    col: 1.5
    row: 1.2
    shape: circle
    tone: sky
    w: 0.45
    h: 0.75
  - id: h3
    label: h₃
    col: 1.5
    row: 2.4
    shape: circle
    tone: sky
    w: 0.45
    h: 0.75
  - id: h4
    label: h₄
    col: 1.5
    row: 3.6
    shape: circle
    tone: sky
    w: 0.45
    h: 0.75
  - id: y
    label: ŷ
    sub: sigmoid
    col: 3
    row: 1.8
    shape: circle
    tone: gold
    w: 0.55
    h: 0.85
edges:
  - { from: x1, to: h1, arrow: none }
  - { from: x1, to: h2, arrow: none }
  - { from: x1, to: h3, arrow: none }
  - { from: x1, to: h4, arrow: none }
  - { from: x2, to: h1, arrow: none }
  - { from: x2, to: h2, arrow: none }
  - { from: x2, to: h3, arrow: none }
  - { from: x2, to: h4, arrow: none }
  - { from: h1, to: y }
  - { from: h2, to: y }
  - { from: h3, to: y }
  - { from: h4, to: y }
groups:
  - label: "W₁ (2→4) + tanh"
    nodes: [h1, h2, h3, h4]
    tone: sky
```

```python run title="A two-layer network learns XOR"
import numpy as np
rng = np.random.default_rng(2)               # try seed 0: the network gets stuck in a local minimum

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([[0], [1], [1], [0]], dtype=float)

W1, b1 = rng.normal(0, 1, (2, 4)), np.zeros((1, 4))
W2, b2 = rng.normal(0, 1, (4, 1)), np.zeros((1, 1))
lr = 0.5
sigmoid = lambda z: 1 / (1 + np.exp(-z))

for step in range(3001):
    # forward
    h = np.tanh(X @ W1 + b1)                 # (4×2)@(2×4) -> hidden activations
    p = sigmoid(h @ W2 + b2)                 # (4×4)@(4×1) -> predictions
    loss = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))
    # backward (chain rule, layer by layer)
    dz2 = (p - y) / len(X)                   # sigmoid + cross-entropy simplify to this
    dW2, db2 = h.T @ dz2, dz2.sum(axis=0, keepdims=True)
    dh = dz2 @ W2.T
    dz1 = dh * (1 - h ** 2)                  # derivative of tanh
    dW1, db1 = X.T @ dz1, dz1.sum(axis=0, keepdims=True)
    # update
    W1 -= lr * dW1; b1 -= lr * db1; W2 -= lr * dW2; b2 -= lr * db2
    if step % 1000 == 0:
        print(f"step {step:4}: loss {loss:.4f}")

print("predictions:", np.round(p.ravel(), 3), "targets:", y.ravel())
```

Change the seed to `0` and run it again: the loss stalls around 0.35 and two predictions sit at 0.5. The network fell into a **local minimum**, a reminder that training depends on initialisation. Wider layers, better initialisation schemes and optimisers like Adam make this rare in practice.

That's a complete neural network: the same algorithm, scaled up to billions of parameters and trillions of tokens, trains modern language models.

```quiz
- q: Why can't a single neuron learn XOR?
  options: ["Not enough data", "XOR isn't linearly separable, and one neuron draws only a straight boundary", "Sigmoid is wrong", "Learning rate too small"]
  answer: 1
- q: What makes a hidden layer useful?
  options: ["More weights alone", "A non-linear activation, so stacked layers can represent curved boundaries", "It removes the bias", "It sorts inputs"]
  answer: 1
- q: The derivative of tanh(z) is…
  options: ["tanh(z)", "1 − tanh²(z)", "z", "e^z"]
  answer: 1
```

# Dimensionality and PCA {#pca}

Real data has many features, often correlated. **Principal Component Analysis (PCA)** finds the directions (**principal components**) along which the data varies most: the **eigenvectors** of the data's **covariance matrix**, ordered by their **eigenvalues** (the variance along each). Projecting onto the top few components compresses data while keeping most of its information, and is used for visualisation, denoising and speeding up models.

```python run title="PCA from the covariance matrix"
import numpy as np
rng = np.random.default_rng(42)

# 200 learners: hours studied and lessons completed are strongly correlated; quiz score adds a bit more
hours = rng.normal(6, 2, 200)
lessons = 1.5 * hours + rng.normal(0, 0.8, 200)
quiz = 0.5 * hours + rng.normal(0, 2.0, 200)
X = np.column_stack([hours, lessons, quiz])

Xc = X - X.mean(axis=0)                      # centre the data
cov = Xc.T @ Xc / (len(X) - 1)
eigvals, eigvecs = np.linalg.eigh(cov)       # symmetric matrix -> eigh
order = np.argsort(eigvals)[::-1]
eigvals, eigvecs = eigvals[order], eigvecs[:, order]

explained = eigvals / eigvals.sum()
print("variance explained by each component:", np.round(explained, 3))
print("first component direction (hours, lessons, quiz):", np.round(eigvecs[:, 0], 3))
Z = Xc @ eigvecs[:, :2]                      # 3 features -> 2
print("compressed shape:", Z.shape, f"keeping {explained[:2].sum():.1%} of the variance")
```

```quiz
- q: What do PCA's principal components point along?
  options: ["Random directions", "Directions of greatest variance in the data", "The axes of the original features", "The labels"]
  answer: 1
- q: An eigenvalue in PCA represents…
  options: ["A data point", "The variance along its component", "A learning rate", "The mean"]
  answer: 1
```

```exam
- q: A neural network layer computes…
  options: ["activation(W @ x + b)", "x²", "softmax(x) only", "sort(x)"]
  answer: 0
- q: Cosine similarity of two vectors pointing in opposite directions is…
  options: ["1", "0", "−1", "Undefined"]
  answer: 2
- q: The gradient of the loss points…
  options: ["Downhill", "Uphill: we move against it", "Towards the data", "Nowhere"]
  answer: 1
- q: Backpropagation is an application of…
  options: ["The product of matrices only", "The chain rule", "Bayes' theorem", "The central limit theorem"]
  answer: 1
- q: Loss jumps around and grows each epoch. Likely cause?
  options: ["Learning rate too high", "Too little data", "Too many epochs", "Bias set to zero"]
  answer: 0
- q: Minimising cross-entropy loss is the same as…
  options: ["Maximising the likelihood of the correct labels", "Maximising accuracy directly", "Minimising weights", "Maximising entropy"]
  answer: 0
- q: Perplexity of a language model is…
  options: ["The number of parameters", "e raised to the average cross-entropy per token", "Accuracy", "Training time"]
  answer: 1
- q: Why does XOR need a hidden layer?
  options: ["It has 4 examples", "It isn't linearly separable", "It uses binary inputs", "Sigmoid can't output 0"]
  answer: 1
```
