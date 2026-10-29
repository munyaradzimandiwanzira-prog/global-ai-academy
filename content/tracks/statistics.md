---
id: statistics
title: Statistics for AI
short: STATS
category: maths-data
level: intermediate
language: python
color: "#2F5D2A"
icon: "📊"
order: 31.5
summary: The statistics every data scientist and AI engineer needs, explained from scratch and computed by hand in Python. Describing data, probability and Bayes, distributions, sampling and the central limit theorem, confidence intervals, hypothesis tests, correlation and regression, and the traps that fool smart people.
tags: [statistics, probability, bayes, distributions, hypothesis testing, confidence intervals, regression, machine learning fundamentals, data science]
---

# Why Statistics for AI? {#intro}

Machine learning is statistics at scale. Every time you train a model, you assume your data is a **sample** from some larger reality; every time you report "92% accuracy", you're making a **claim under uncertainty**; every A/B test or eval comparison is a **hypothesis test**. Without statistics you can't tell a real improvement from luck.

| You want to… | Statistics gives you |
|---|---|
| Understand a dataset | **Descriptive statistics**: centre, spread, shape, outliers |
| Reason about uncertainty | **Probability** and **distributions** |
| Learn from a sample | **Sampling**, **standard error**, the **central limit theorem** |
| Report how sure you are | **Confidence intervals** |
| Decide if a change is real | **Hypothesis tests** and **p-values** |
| Measure relationships | **Correlation** and **regression** |

## Populations, samples and variables

- The **population** is everything you care about (all Zimbabwean secondary students); a **sample** is the part you measured (2,000 survey responses).
- A **statistic** describes a sample (sample mean); a **parameter** describes the population (true mean). Statistics *estimate* parameters.
- Variables are **numerical** (continuous like height, discrete like number of siblings) or **categorical** (nominal like province, ordinal like satisfaction 1–5).

```sketch
title: From population to conclusion
caption: We almost never see the whole population. We sample, compute statistics, and use probability to say how far the truth could be from what we saw.
cellW: 175
cellH: 105
nodes:
  - id: pop
    label: Population
    sub: true parameter μ (unknown)
    col: 0
    row: 0.5
    shape: circle
    tone: teal
    w: 1
    h: 1.2
  - id: s
    label: Sample
    sub: n observations
    col: 1.5
    row: 0.5
    shape: circle
    tone: gold
    w: 0.7
    h: 0.9
  - id: stat
    label: Statistic
    sub: "x̄, p̂, r…"
    col: 2.8
    row: 0.5
    shape: round
    tone: sky
  - id: inf
    label: Inference
    sub: "μ is probably in [a, b]"
    col: 4.35
    row: 0.5
    shape: round
    tone: grape
edges:
  - from: pop
    to: s
    label: random sample
  - from: s
    to: stat
    label: compute
  - from: stat
    to: inf
    label: + uncertainty
  - from: inf
    to: pop
    label: about
    dashed: true
    bend: -45
```

```quiz
- q: A survey of 2,000 students reports a mean of 6.1 hours of study. The 6.1 is a…
  options: ["Parameter", "Statistic", "Population", "Distribution"]
  answer: 1
- q: Satisfaction rated 1–5 is which kind of variable?
  options: ["Continuous numerical", "Ordinal categorical", "Nominal categorical", "Binary"]
  answer: 1
```

# Describing Data {#descriptive}

## Centre

| Measure | Definition | Strength / weakness |
|---|---|---|
| **Mean** | Sum ÷ count | Uses every value; dragged by outliers |
| **Median** | Middle value when sorted | Robust to outliers |
| **Mode** | Most common value | Works for categories |

## Spread

| Measure | Definition |
|---|---|
| **Range** | max − min |
| **Variance** | Average squared distance from the mean (divide by *n − 1* for a sample) |
| **Standard deviation** (SD) | √variance, in the original units |
| **IQR** | Q3 − Q1, the middle 50% (robust) |

```python run title="Compute the summary statistics by hand"
import math

prices = [8.5, 8.0, 9.0, 8.5, 8.7, 8.4, 25.0, 8.6, 8.2, 8.9]   # roller meal 10kg in 10 shops; one typo/outlier

def mean(xs): return sum(xs) / len(xs)
def median(xs):
    s, n = sorted(xs), len(xs)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2
def variance(xs):
    m = mean(xs)
    return sum((x - m) ** 2 for x in xs) / (len(xs) - 1)      # n - 1: sample variance
def quantile(xs, q):
    s = sorted(xs)
    pos = (len(s) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)

q1, q3 = quantile(prices, 0.25), quantile(prices, 0.75)
iqr = q3 - q1
print(f"mean {mean(prices):.2f}   median {median(prices):.2f}")
print(f"SD {math.sqrt(variance(prices)):.2f}   IQR {iqr:.2f} (Q1 {q1:.2f}, Q3 {q3:.2f})")
outliers = [p for p in prices if p < q1 - 1.5 * iqr or p > q3 + 1.5 * iqr]
print("outliers (Tukey 1.5×IQR rule):", outliers)
clean = [p for p in prices if p not in outliers]
print(f"without outliers: mean {mean(clean):.2f}, SD {math.sqrt(variance(clean)):.2f}")
```

One wrong value moved the mean by almost $2 and tripled the SD; the median barely moved. **Always look at the median and the spread, not just the mean.**

## Shape

```python run title="See the shape with a text histogram"
import random
random.seed(4)
incomes = [round(random.lognormvariate(5.5, 0.6)) for _ in range(400)]    # right-skewed, like real incomes

bins = [0, 100, 200, 300, 400, 500, 700, 1000, 5000]
for lo, hi in zip(bins, bins[1:]):
    n = sum(lo <= x < hi for x in incomes)
    print(f"${lo:>4}–{hi:<5} {'█' * (n // 4)} {n}")
s = sorted(incomes)
print(f"mean ${sum(s) / len(s):.0f}  median ${s[len(s) // 2]}  -> right skew pulls the mean above the median")
```

| Shape | Signs | Example |
|---|---|---|
| Symmetric | mean ≈ median | Heights, measurement error |
| Right-skewed | mean > median, long right tail | Incomes, response times, house prices |
| Left-skewed | mean < median | Exam scores on an easy test |
| Bimodal | two peaks | Mixed groups (two shifts, two products) |

```exercise
prompt: Sample variance divides by n minus one.
code: |
  var = sum((x - m) ** 2 for x in xs) / (len(xs) ___ 1)
answers: ["-"]
```

```quiz
- q: Which measure of centre is least affected by an extreme outlier?
  options: ["Mean", "Median", "Range", "Variance"]
  answer: 1
- q: Response times have mean 2.4 s and median 0.9 s. The distribution is probably…
  options: ["Symmetric", "Right-skewed", "Left-skewed", "Uniform"]
  answer: 1
- q: What does the IQR measure?
  options: ["The spread of the middle 50% of values", "The full range", "The mean deviation", "The mode"]
  answer: 0
```

# Probability and Bayes' Theorem {#probability}

A **probability** is a number from 0 (impossible) to 1 (certain). You can think of it as a long-run frequency (flip a coin many times) or a degree of belief (how sure am I it'll rain?).

| Rule | Formula | In words |
|---|---|---|
| Complement | P(not A) = 1 − P(A) | |
| Addition | P(A or B) = P(A) + P(B) − P(A and B) | Don't double-count the overlap |
| Conditional | P(A \| B) = P(A and B) / P(B) | Probability of A **given** B happened |
| Multiplication | P(A and B) = P(A \| B) · P(B) | |
| Independence | P(A \| B) = P(A) | Knowing B tells you nothing about A |

## Bayes' theorem

```text
P(A | B) = P(B | A) · P(A) / P(B)
```

It turns "how likely is the evidence if the hypothesis is true?" into "how likely is the hypothesis given the evidence?". It's the maths behind spam filters, medical tests, fraud alerts, and how a classifier's **precision** depends on the **base rate**.

```sketch
title: Bayes as counting 10,000 transactions
caption: A detector catches 95% of fraud with a 2% false-alarm rate, but fraud is only 0.5% of transactions. Most alarms are still false.
cellW: 190
cellH: 108
nodes:
  - id: all
    label: "10,000 transactions"
    col: 1
    row: 0
    shape: round
    tone: sky
  - id: f
    label: "50 fraud (0.5%)"
    col: 0
    row: 1
    shape: round
    tone: rose
  - id: ok
    label: "9,950 legit"
    col: 2
    row: 1
    shape: round
    tone: teal
  - id: tp
    label: "48 flagged ✔"
    sub: 95% caught
    col: 0
    row: 2.1
    shape: note
  - id: fp
    label: "199 flagged ✘"
    sub: 2% false alarms
    col: 2
    row: 2.1
    shape: note
  - id: res
    label: "P(fraud | flagged) ≈ 48 / 246 ≈ 19%"
    col: 1
    row: 3.1
    shape: pill
    tone: gold
    w: 1.4
edges:
  - from: all
    to: f
  - from: all
    to: ok
  - from: f
    to: tp
  - from: ok
    to: fp
  - from: tp
    to: res
  - from: fp
    to: res
```

```python run title="Bayes three ways: formula, counting and simulation"
import random

p_fraud = 0.005           # base rate (prior)
p_flag_given_fraud = 0.95 # sensitivity / recall
p_flag_given_legit = 0.02 # false positive rate

# 1. Formula
p_flag = p_flag_given_fraud * p_fraud + p_flag_given_legit * (1 - p_fraud)
posterior = p_flag_given_fraud * p_fraud / p_flag
print(f"formula:    P(fraud | flagged) = {posterior:.3f}")

# 2. Counting
n = 10_000
fraud = n * p_fraud
tp, fp = fraud * p_flag_given_fraud, (n - fraud) * p_flag_given_legit
print(f"counting:   {tp:.0f} true alarms / {tp + fp:.0f} alarms = {tp / (tp + fp):.3f}")

# 3. Simulation
random.seed(0)
flags = frauds_flagged = 0
for _ in range(200_000):
    is_fraud = random.random() < p_fraud
    flagged = random.random() < (p_flag_given_fraud if is_fraud else p_flag_given_legit)
    flags += flagged
    frauds_flagged += flagged and is_fraud
print(f"simulation: {frauds_flagged / flags:.3f}")
```

This is the **base-rate fallacy**: with rare events, even an accurate detector produces mostly false alarms. In ML terms, **precision** collapses when positives are rare, which is why you must look at precision and recall, not accuracy, for imbalanced problems.

```quiz
- q: Two events are independent when…
  options: ["P(A and B) = 0", "P(A | B) = P(A)", "P(A) = P(B)", "They happen at the same time"]
  answer: 1
- q: A test is 99% accurate for a disease that 1 in 10,000 people have. A random person tests positive. Is it likely they have the disease?
  options: ["Yes, 99%", "No; with such a low base rate most positives are false", "Exactly 50%", "Can't say anything"]
  answer: 1
- q: In Bayes' theorem, P(A) before seeing evidence is called the…
  options: ["Posterior", "Prior", "Likelihood", "Evidence"]
  answer: 1
```

# Random Variables and Distributions {#distributions}

A **random variable** assigns numbers to random outcomes. Its **distribution** says how likely each value is.

| Distribution | Models | Mean | Variance |
|---|---|---|---|
| **Bernoulli(p)** | One yes/no trial (click or not) | p | p(1 − p) |
| **Binomial(n, p)** | Number of successes in n trials | np | np(1 − p) |
| **Poisson(λ)** | Counts of events per interval (calls per hour) | λ | λ |
| **Uniform(a, b)** | Every value equally likely | (a + b)/2 | (b − a)²/12 |
| **Normal(μ, σ)** | Sums of many small effects; measurement noise | μ | σ² |

```python run title="Simulate distributions and check their theoretical mean and variance"
import random, statistics as st
random.seed(1)

def simulate(name, draw, mean, var, n=40_000):
    xs = [draw() for _ in range(n)]
    print(f"{name:22} sim mean {st.mean(xs):7.3f} (theory {mean:7.3f})  sim var {st.pvariance(xs):7.3f} (theory {var:7.3f})")

p, trials, lam = 0.3, 20, 4
simulate("Bernoulli(0.3)", lambda: int(random.random() < p), p, p * (1 - p))
simulate("Binomial(20, 0.3)", lambda: sum(random.random() < p for _ in range(trials)), trials * p, trials * p * (1 - p))
def poisson():                     # count events in one unit of time with exponential gaps
    t, k = random.expovariate(lam), 0
    while t < 1:
        k += 1
        t += random.expovariate(lam)
    return k
simulate("Poisson(4)", poisson, lam, lam)
simulate("Normal(170, 8)", lambda: random.gauss(170, 8), 170, 64)
```

## The normal distribution and z-scores

For a normal distribution, about **68%** of values fall within 1 SD of the mean, **95%** within 2 SD, **99.7%** within 3 SD. A **z-score**, z = (x − μ) / σ, says how many SDs a value is from the mean, letting you compare across scales.

```python run title="The 68-95-99.7 rule and z-scores"
import random
random.seed(2)
heights = [random.gauss(170, 8) for _ in range(100_000)]
for k in (1, 2, 3):
    share = sum(abs(h - 170) <= k * 8 for h in heights) / len(heights)
    print(f"within {k} SD: {share:.1%}")

# Which result is more exceptional?
maths = (82, 60, 10)      # (score, class mean, class SD)
english = (74, 55, 6)
for subject, (x, mu, sd) in (("Maths", maths), ("English", english)):
    print(f"{subject}: score {x}, z = {(x - mu) / sd:.2f}")
```

```quiz
- q: Calls to a helpdesk per hour are best modelled by…
  options: ["Normal", "Poisson", "Uniform", "Bernoulli"]
  answer: 1
- q: Roughly what share of a normal distribution lies within 2 standard deviations of the mean?
  options: ["50%", "68%", "95%", "99.7%"]
  answer: 2
- q: A z-score of −1.5 means…
  options: ["1.5 below zero", "1.5 standard deviations below the mean", "A 1.5% probability", "An error"]
  answer: 1
```

# Sampling and the Central Limit Theorem {#clt}

If you take many samples and compute the mean of each, those sample means form their own distribution: the **sampling distribution**. Two facts make statistics work:

1. Its centre is the true mean (the sample mean is **unbiased**).
2. Its spread, the **standard error**, is **σ / √n**: bigger samples give more precise estimates.

The **Central Limit Theorem (CLT)**: for large enough *n* (often 30+), the sampling distribution of the mean is approximately **normal**, *whatever the shape of the original data*. That's why normal-based confidence intervals and tests work so widely.

```python run title="Watch the CLT turn skewed data into a bell curve"
import random, statistics as st
random.seed(5)
population = [random.expovariate(1 / 30) for _ in range(100_000)]     # very skewed: waiting times, mean ~30
mu, sigma = st.mean(population), st.pstdev(population)

for n in (2, 10, 50):
    means = [st.mean(random.sample(population, n)) for _ in range(3000)]
    print(f"n={n:>2}: mean of means {st.mean(means):5.1f} (μ={mu:.1f})  SD of means {st.stdev(means):5.2f} (σ/√n={sigma / n ** 0.5:5.2f})")
    lo, hi = min(means), max(means)
    width = (hi - lo) / 12
    for i in range(12):
        c = sum(lo + i * width <= m < lo + (i + 1) * width for m in means)
        print(f"     {lo + i * width:6.1f} {'▇' * (c // 25)}")
```

As *n* grows the histograms become symmetric and bell-shaped, and the SD of the means matches **σ/√n**.

```quiz
- q: The standard error of the mean shrinks with…
  options: ["n", "√n", "n²", "It doesn't"]
  answer: 1
- q: What does the central limit theorem say?
  options: ["All data is normal", "Sample means are approximately normal for large n, whatever the data's shape", "Large samples remove bias", "Means equal medians"]
  answer: 1
```

# Confidence Intervals {#confidence}

A **95% confidence interval** is a range built by a method that captures the true parameter in 95% of repeated samples. For a mean with large *n*:

```text
x̄ ± 1.96 × s / √n
```

For a proportion: **p̂ ± 1.96 × √(p̂(1 − p̂)/n)** (or the more reliable **Wilson** interval for small samples or extreme rates).

```python run title="Confidence intervals, and what '95%' really means"
import random, math, statistics as st
random.seed(7)
TRUE_MEAN = 6.0                                        # true average study hours (unknown in real life)

def ci_mean(xs, z=1.96):
    m, se = st.mean(xs), st.stdev(xs) / math.sqrt(len(xs))
    return m - z * se, m + z * se

covered = 0
for trial in range(1000):
    sample = [random.gauss(TRUE_MEAN, 2.5) for _ in range(60)]
    lo, hi = ci_mean(sample)
    covered += lo <= TRUE_MEAN <= hi
    if trial < 3:
        print(f"sample {trial + 1}: 95% CI {lo:.2f} – {hi:.2f}")
print(f"intervals that contained the true mean: {covered / 10:.1f}%")

# Proportion: 412 of 1,000 learners finished a course
p, n = 412 / 1000, 1000
half = 1.96 * math.sqrt(p * (1 - p) / n)
print(f"completion rate {p:.1%} ± {half:.1%}")
```

Interpretation: "We're 95% confident the true mean is between a and b" means the **procedure** works 95% of the time; it does **not** mean there's a 95% probability for this particular interval.

## The bootstrap

When there's no simple formula (a median, a ratio, an F1 score), **resample your data with replacement** many times and take the middle 95% of the recomputed statistic.

```python run title="Bootstrap a confidence interval for the median"
import random, statistics as st
random.seed(11)
times = [0.4, 0.5, 0.6, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 1.8, 2.5, 4.0, 7.5]   # response times (s)
boot = sorted(st.median(random.choices(times, k=len(times))) for _ in range(10_000))
print(f"median {st.median(times)} s, 95% bootstrap CI {boot[250]} – {boot[9750]} s")
```

```quiz
- q: To halve the width of a confidence interval, you need roughly…
  options: ["Twice the data", "Four times the data", "Half the data", "The same data"]
  answer: 1
- q: Which method gives an interval for a median without a formula?
  options: ["Bootstrap", "z-score", "Mode", "Bayes' theorem"]
  answer: 0
- q: A 95% CI is 5.4–6.6 hours. Which statement is correct?
  options: ["There's a 95% chance the true mean is in this exact interval", "The method used captures the true mean in 95% of repeated samples", "95% of students study 5.4–6.6 hours", "The mean is 6.0 for sure"]
  answer: 1
```

# Hypothesis Testing {#hypothesis}

A hypothesis test asks: **if nothing interesting were going on, how surprising is what I observed?**

1. **Null hypothesis H₀**: no effect (the new prompt is no better; the coin is fair).
2. **Alternative H₁**: there is an effect.
3. Compute a **test statistic** from the data.
4. The **p-value** is the probability of a result at least this extreme **if H₀ were true**.
5. If p < α (commonly 0.05), **reject H₀**.

| | H₀ actually true | H₀ actually false |
|---|---|---|
| Reject H₀ | **Type I error** (false positive), rate α | Correct (power) |
| Keep H₀ | Correct | **Type II error** (false negative), rate β |

**Power** (1 − β) is the chance of detecting a real effect; it grows with sample size and effect size.

## A permutation test: the idea with no formulas

If the group labels don't matter (H₀), shuffling them shouldn't change the difference much. Count how often a shuffle gives a difference as large as the real one.

```python run title="Did the new teaching method raise scores? A permutation test"
import random, statistics as st
random.seed(3)
old = [62, 58, 71, 65, 60, 55, 68, 63, 59, 66, 61, 57]
new = [70, 66, 74, 61, 72, 69, 75, 64, 71, 68, 73, 67]
observed = st.mean(new) - st.mean(old)

pooled = old + new
extreme = 0
for _ in range(20_000):
    random.shuffle(pooled)
    diff = st.mean(pooled[len(old):]) - st.mean(pooled[:len(old)])
    extreme += diff >= observed
p_value = extreme / 20_000
print(f"observed difference {observed:.2f} points, one-sided p = {p_value:.4f}")
print("reject H0 at 5%" if p_value < 0.05 else "not enough evidence")
```

## Welch's t-test by hand

```python run title="Welch's t statistic for two means"
import math, statistics as st
old = [62, 58, 71, 65, 60, 55, 68, 63, 59, 66, 61, 57]
new = [70, 66, 74, 61, 72, 69, 75, 64, 71, 68, 73, 67]
m1, m2 = st.mean(old), st.mean(new)
v1, v2 = st.variance(old), st.variance(new)
n1, n2 = len(old), len(new)
t = (m2 - m1) / math.sqrt(v1 / n1 + v2 / n2)
df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1))
print(f"t = {t:.2f} with ~{df:.1f} degrees of freedom (|t| > ~2.07 is significant at 5% for this df)")
```

## Traps

- **p-hacking**: trying many analyses and reporting the one with p < 0.05. Test 20 useless prompt tweaks and one will "win" by chance.
- **Multiple comparisons**: when testing *k* things, use a stricter threshold (e.g. Bonferroni: α / *k*).
- **Statistical vs practical significance**: with a million users, a 0.01% change can be "significant" and worthless. Report **effect sizes** and intervals.
- **Absence of evidence ≠ evidence of absence**: a non-significant result with a small sample may just lack power.

```quiz
- q: What is a p-value?
  options: ["The probability H0 is true", "The probability of data at least this extreme if H0 were true", "The effect size", "The power"]
  answer: 1
- q: You test 20 prompt variants against a baseline at α = 0.05 and one 'wins'. What's the concern?
  options: ["None", "With 20 tests you'd expect about one false positive by chance; correct for multiple comparisons", "The baseline is wrong", "p-values can't be used"]
  answer: 1
- q: A Type II error is…
  options: ["Rejecting a true null", "Failing to detect a real effect", "A coding bug", "A large p-value always"]
  answer: 1
```

# Correlation and Regression {#correlation}

**Covariance** measures whether two variables move together; **Pearson's correlation r** scales it to −1…+1. **Regression** fits a line to predict one variable from another.

```python run title="Correlation and least-squares regression from scratch"
import math, statistics as st

hours = [2, 4, 5, 6, 8, 9, 10, 12, 13, 15]          # study hours per week
marks = [48, 55, 58, 62, 67, 66, 74, 78, 80, 88]     # exam marks

mx, my = st.mean(hours), st.mean(marks)
cov = sum((x - mx) * (y - my) for x, y in zip(hours, marks)) / (len(hours) - 1)
r = cov / (st.stdev(hours) * st.stdev(marks))
slope = cov / st.variance(hours)
intercept = my - slope * mx
pred = [intercept + slope * x for x in hours]
ss_res = sum((y - p) ** 2 for y, p in zip(marks, pred))
ss_tot = sum((y - my) ** 2 for y in marks)
print(f"r = {r:.3f}")
print(f"marks ≈ {intercept:.1f} + {slope:.2f} × hours")
print(f"R² = {1 - ss_res / ss_tot:.3f} (share of variation in marks explained by hours)")
print(f"prediction for 11 hours: {intercept + slope * 11:.0f}")
```

## Correlation is not causation

Ice-cream sales and drownings are correlated: both rise in hot weather (a **confounder**). Students who use the AI tutor more may score higher because motivated students do both. To claim causation, you need a **randomised experiment** (an A/B test) or careful causal methods.

## Simpson's paradox

A trend can reverse when data is split into groups.

```python run title="Simpson's paradox in course completion"
# (completed, enrolled) by track difficulty for two teaching formats
data = {
    "video":  {"beginner": (80, 100), "advanced": (20, 100)},
    "live":   {"beginner": (18, 20),  "advanced": (60, 180)},
}
for fmt, groups in data.items():
    total_c = sum(c for c, n in groups.values())
    total_n = sum(n for c, n in groups.values())
    per_group = ", ".join(f"{g} {c / n:.0%}" for g, (c, n) in groups.items())
    print(f"{fmt:5}: overall {total_c / total_n:.0%} | {per_group}")
print("Live wins in EVERY group but loses overall, because it mostly taught the hard track.")
```

```quiz
- q: r = −0.85 means…
  options: ["No relationship", "A strong negative linear relationship", "A weak positive one", "85% causation"]
  answer: 1
- q: Tutor usage correlates with higher marks. What's the best way to test whether the tutor causes better marks?
  options: ["Compute r again", "A randomised experiment (A/B test)", "Ask students", "Use a bigger sample of the same observational data"]
  answer: 1
- q: R² = 0.9 in a regression means…
  options: ["90% of predictions are perfect", "The model explains 90% of the variation in the outcome", "The slope is 0.9", "The correlation is 0.9 exactly"]
  answer: 1
```

# Statistics in Machine Learning Practice {#ml-practice}

| ML practice | The statistical idea behind it |
|---|---|
| Train/validation/test split | Estimate performance on **unseen** data from the same population |
| Cross-validation | Average over several splits to reduce the **variance** of the estimate |
| Reporting accuracy with an interval | Your test set is a **sample**; scores have **standard error** |
| Class imbalance, precision vs recall | **Base rates** and conditional probability (Bayes) |
| Calibrated probabilities | When the model says 70%, it should be right 70% of the time |
| A/B testing models | **Hypothesis testing** and **power** |
| Data drift | Comparing **distributions** over time |
| Overfitting | Fitting noise in the sample instead of signal in the population |

```python run title="Is the model calibrated?"
# (predicted probability, actual outcome) for 20 loan-default predictions
preds = [(0.1, 0), (0.1, 0), (0.15, 0), (0.2, 0), (0.2, 1), (0.25, 0), (0.3, 0), (0.35, 1), (0.4, 0), (0.45, 1),
         (0.55, 1), (0.6, 0), (0.65, 1), (0.7, 1), (0.75, 1), (0.8, 1), (0.85, 1), (0.9, 1), (0.9, 1), (0.95, 1)]
bins = [(0.0, 0.3), (0.3, 0.6), (0.6, 1.01)]
for lo, hi in bins:
    group = [(p, y) for p, y in preds if lo <= p < hi]
    avg_pred = sum(p for p, _ in group) / len(group)
    actual = sum(y for _, y in group) / len(group)
    print(f"predicted {lo:.1f}–{min(hi, 1):.1f}: avg prediction {avg_pred:.2f}, actual rate {actual:.2f}  (n={len(group)})")
```

When predicted and actual rates match in each bin, the model is **calibrated**, and its probabilities can be used for decisions (e.g. expected loss). Here the low-risk bin matches, but in the middle and high bins actual defaults are higher than predicted: the model **under-estimates** risk there and should be recalibrated (for example with Platt scaling or isotonic regression) before its probabilities drive lending decisions. With so few examples per bin, collect more data before drawing firm conclusions.

````challenge
id: stats-zscore-outliers
title: Flag unusual transactions
difficulty: medium
prompt: |
  Write `flag_outliers(amounts, threshold=2.0)` that returns the list of `(index, amount, z)` for every amount whose **z-score** (using the **sample** standard deviation, n − 1) has absolute value **greater than** `threshold`. Round `z` to 2 decimals. Return them in the original order. If fewer than 2 amounts, return `[]`.
starter: |
  import math

  def flag_outliers(amounts, threshold=2.0):
      pass

  print(flag_outliers([20, 22, 19, 21, 250, 23, 18, 20]))
tests: |
  r = flag_outliers([20, 22, 19, 21, 250, 23, 18, 20])
  assert r == [(4, 250, 2.47)], r
  assert flag_outliers([5, 5, 5, 5]) == [], "Zero spread: nothing is unusual"
  assert flag_outliers([1]) == []
  r = flag_outliers([10, 12, 11, 13, 12, 40, -15, 11], threshold=1.5)
  assert [i for i, _, _ in r] == [5, 6], r
````

```exam
- q: Which is most robust to outliers?
  options: ["Mean", "Standard deviation", "Median", "Range"]
  answer: 2
- q: P(A | B) is read as…
  options: ["A and B", "A or B", "A given B", "A times B"]
  answer: 2
- q: Counts of events per time interval usually follow a…
  options: ["Poisson distribution", "Uniform distribution", "Normal distribution", "Bernoulli distribution"]
  answer: 0
- q: The standard error of a sample mean is…
  options: ["σ", "σ / √n", "σ²", "n / σ"]
  answer: 1
- q: A small p-value means…
  options: ["H0 is definitely false", "The data would be surprising if H0 were true", "The effect is large", "The study is perfect"]
  answer: 1
- q: Correlation between two variables proves causation when…
  options: ["r > 0.9", "Never on its own; you need an experiment or causal analysis", "n > 1000", "p < 0.05"]
  answer: 1
- q: Why do rare positives hurt precision even for accurate classifiers?
  options: ["Bugs", "Base rates: false positives from the large negative class outnumber true positives", "Overfitting", "Calibration"]
  answer: 1
- q: The bootstrap estimates uncertainty by…
  options: ["Collecting new data", "Resampling the existing data with replacement many times", "Using the normal formula", "Removing outliers"]
  answer: 1
```
