---
id: machine-learning
title: Machine Learning
short: ML
category: ai
level: intermediate
language: python
color: "#F7931E"
icon: "🧮"
order: 41
summary: Build real models with scikit-learn — right in your browser. Regression, classification, evaluation, feature engineering, decision trees and random forests, gradient boosting, KNN and SVMs, hyperparameter tuning, imbalanced data, clustering, anomaly detection and an end-to-end crop-yield project.
tags: [machine learning, scikit-learn, python, regression, classification, ml, random forest, xgboost, gradient boosting, svm, knn, anomaly detection, imbalanced data, hyperparameter tuning]
---

# The Machine Learning Workflow {#workflow}

Every ML project follows the same steps:

```sketch
title: "From question to deployed model"
caption: "Most of the time goes into data. Evaluation often sends you back a step or two before a model is good enough to use."
cellW: 190
nodes:
  - id: q
    label: "Define the question"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: d
    label: "Collect & clean data"
    col: 1.3
    row: 0
    shape: round
    tone: gold
  - id: f
    label: "Features"
    col: 2.6
    row: 0
    shape: round
    tone: gold
  - id: t
    label: "Train"
    col: 2.6
    row: 1.3
    shape: round
    tone: grape
  - id: ev
    label: "Evaluate"
    col: 1.3
    row: 1.3
    shape: diamond
    tone: rose
  - id: dep
    label: "Deploy & monitor"
    col: 0
    row: 1.3
    shape: pill
    tone: teal
edges:
  - from: q
    to: d
  - from: d
    to: f
  - from: f
    to: t
  - from: t
    to: ev
  - from: ev
    to: dep
    label: "good"
  - from: ev
    to: d
    label: "not yet"
    dashed: true
```


> **Foundations.** Want to know *why* these algorithms work? **[Statistics for AI](/learn/statistics)** and **[Mathematics & First Principles of ML](/learn/ml-math)** build the maths (probability, distributions, hypothesis tests, linear algebra, calculus, gradient descent, backpropagation) from scratch in code.

1. **Define the problem** — what will you predict, and how will you know it's good?
2. **Collect data** — and understand where it came from.
3. **Explore and clean** — fix missing values, outliers, wrong types.
4. **Engineer features** — turn raw data into useful inputs.
5. **Split** — training and test sets.
6. **Train** a model.
7. **Evaluate** on the test set with the right metric.
8. **Improve** — better features, other models, tuning.
9. **Deploy and monitor** — see the [MLOps](/learn/mlops) track.

We'll use **scikit-learn**, the most widely used ML library for tabular data. It runs right here — the first run downloads it (about 10 MB), so give it a moment.

```python run title="scikit-learn in 6 lines"
from sklearn.datasets import load_iris
from sklearn.tree import DecisionTreeClassifier

X, y = load_iris(return_X_y=True)
model = DecisionTreeClassifier(max_depth=3).fit(X, y)
print("Predicted flower species:", model.predict([[5.1, 3.5, 1.4, 0.2]]))
print("Training accuracy:", round(model.score(X, y), 3))
```

> **Features** (`X`) are the inputs, **labels/targets** (`y`) are what we predict. By convention `X` is a capital letter because it's a table (matrix) and `y` is lowercase because it's one column (vector).

```quiz
- q: In scikit-learn, what does `X` usually hold?
  options: ["The labels", "The input features", "The model", "The accuracy"]
  answer: 1
```

# Regression: Predicting Numbers {#regression}

**Regression** predicts a number: a price, a yield, a temperature.

```python run title="Predicting maize yield"
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

rng = np.random.default_rng(42)
n = 200
rainfall = rng.uniform(300, 1000, n)            # mm per season
fertiliser = rng.uniform(0, 300, n)             # kg per hectare
yield_t = 0.004 * rainfall + 0.006 * fertiliser + rng.normal(0, 0.5, n)   # tonnes/ha

X = np.column_stack([rainfall, fertiliser])
X_train, X_test, y_train, y_test = train_test_split(X, yield_t, test_size=0.25, random_state=0)

model = LinearRegression().fit(X_train, y_train)
pred = model.predict(X_test)
print(f"Mean absolute error: {mean_absolute_error(y_test, pred):.2f} t/ha")
print(f"R² score: {r2_score(y_test, pred):.2f}")
print("Prediction for 650 mm rain, 120 kg fertiliser:", round(model.predict([[650, 120]])[0], 2), "t/ha")
```

## Regression metrics

| Metric | Meaning |
|---|---|
| **MAE** (mean absolute error) | Average size of the error, in the target's units — easy to explain |
| **RMSE** | Like MAE but punishes big errors more |
| **R²** | Share of variation explained: 1 is perfect, 0 is no better than guessing the mean |

```exercise
prompt: Complete the function that splits data into training and test sets.
code: |
  from sklearn.model_selection import ___
  X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
answers: [train_test_split]
```

# Classification: Predicting Categories {#classification}

**Classification** predicts a category: spam/not spam, healthy/diseased, will repay/won't repay.

```python run title="Will a learner pass?"
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

rng = np.random.default_rng(1)
n = 400
hours = rng.uniform(0, 20, n)
attendance = rng.uniform(40, 100, n)
score = 0.25 * hours + 0.06 * attendance + rng.normal(0, 1.2, n)
passed = (score > 6.5).astype(int)

X = np.column_stack([hours, attendance])
X_tr, X_te, y_tr, y_te = train_test_split(X, passed, test_size=0.25, random_state=0, stratify=passed)
clf = LogisticRegression().fit(X_tr, y_tr)
pred = clf.predict(X_te)
print("Accuracy:", round(accuracy_score(y_te, pred), 3))
print(classification_report(y_te, pred, target_names=["fail", "pass"]))
print("Chance of passing with 6 h study, 70% attendance:", round(clf.predict_proba([[6, 70]])[0, 1], 2))
```

## Popular classifiers

| Model | Strengths |
|---|---|
| Logistic regression | Simple, fast, explainable baseline |
| Decision tree | Easy to visualise; can overfit |
| Random forest | Many trees voting — strong default for tabular data |
| Gradient boosting (XGBoost, LightGBM) | Often the best for tabular data |
| k-nearest neighbours | Simple; slow on big data |
| Neural networks | Images, text, audio, very large data |

# Evaluating Classifiers {#evaluation}

Accuracy alone can mislead, especially with **imbalanced** data like fraud or disease.

```sketch
title: "The confusion matrix"
caption: "Rows are what really happened, columns what the model said. Precision asks how many flagged cases were real; recall asks how many real cases were caught."
cellW: 190
cellH: 95
nodes:
  - id: tp
    label: "True positive"
    col: 1
    row: 0
    shape: box
    tone: teal
    sub: "said yes · was yes"
  - id: fn
    label: "False negative"
    col: 2
    row: 0
    shape: box
    tone: rose
    sub: "said no · was yes"
  - id: fp
    label: "False positive"
    col: 1
    row: 1
    shape: box
    tone: rose
    sub: "said yes · was no"
  - id: tn
    label: "True negative"
    col: 2
    row: 1
    shape: box
    tone: teal
    sub: "said no · was no"
  - id: ay
    label: "Actually yes"
    col: 0
    row: 0
    shape: note
  - id: an
    label: "Actually no"
    col: 0
    row: 1
    shape: note
edges: []
```


```python run title="The confusion matrix"
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score

actual    = [1, 0, 1, 1, 0, 0, 1, 0, 0, 1]   # 1 = diseased leaf
predicted = [1, 0, 0, 1, 0, 1, 1, 0, 0, 1]

tn, fp, fn, tp = confusion_matrix(actual, predicted).ravel()
print(f"True positives {tp}, false positives {fp}, false negatives {fn}, true negatives {tn}")
print("Precision:", precision_score(actual, predicted))
print("Recall:   ", recall_score(actual, predicted))
print("F1 score: ", round(f1_score(actual, predicted), 3))
```

| Metric | Question it answers | Care most when… |
|---|---|---|
| **Precision** | Of everything flagged, how much was right? | False alarms are costly (blocking a real customer's payment) |
| **Recall** | Of all real cases, how many did we catch? | Missing a case is costly (missing a sick patient) |
| **F1** | Balance of both | You need one number |

## Cross-validation

One train/test split can be lucky or unlucky. **Cross-validation** trains and tests several times on different splits:

```python run
from sklearn.datasets import load_wine
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

X, y = load_wine(return_X_y=True)
scores = cross_val_score(RandomForestClassifier(n_estimators=100, random_state=0), X, y, cv=5)
print("Accuracy per fold:", scores.round(3))
print(f"Mean {scores.mean():.3f} ± {scores.std():.3f}")
```

```quiz
- q: A cancer screening model must miss as few real cases as possible. Which metric matters most?
  options: ["Precision", "Recall", "Training speed", "R²"]
  answer: 1
```

# Feature Engineering and Pipelines {#features}

Models need numbers. **Feature engineering** turns raw data into good inputs.

```sketch
title: "A pipeline keeps every step together"
caption: "Fit the scaler and encoder on training data only, then apply the same fitted steps to new data. A Pipeline makes that automatic."
cellW: 180
nodes:
  - id: raw
    label: "Raw columns"
    col: 0
    row: 0
    shape: db
    tone: sky
    sub: "rain · soil · district"
  - id: imp
    label: "Fill gaps"
    col: 1.3
    row: 0
    shape: round
  - id: sc
    label: "Scale / encode"
    col: 2.6
    row: 0
    shape: round
    tone: gold
  - id: mdl
    label: "Model"
    col: 3.9
    row: 0
    shape: circle
    tone: grape
  - id: new
    label: "New farm data"
    col: 0
    row: 1.3
    shape: note
    tone: teal
edges:
  - from: raw
    to: imp
  - from: imp
    to: sc
  - from: sc
    to: mdl
  - from: new
    to: imp
    label: "same steps"
    dashed: true
groups:
  - label: "Pipeline"
    nodes: [imp, sc, mdl]
    tone: gold
```


- **Scaling** — put numbers on similar ranges (`StandardScaler`).
- **Encoding** — turn categories like province into numbers (`OneHotEncoder`).
- **Missing values** — fill them (`SimpleImputer`) rather than dropping rows.
- **New features** — e.g. `price_per_m2 = price / area`, or month from a date.

A **pipeline** bundles preprocessing and the model so the exact same steps run in training and in production:

```python run title="A production-style pipeline"
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor

df = pd.DataFrame({
    "suburb": ["Borrowdale", "Avondale", "Mbare", "Borrowdale", "Hillside", "Mbare", "Avondale", "Hillside"],
    "bedrooms": [4, 3, 2, 5, 3, None, 2, 4],
    "area_m2": [420, 260, 110, 600, 240, 95, 180, 380],
    "price_k": [320, 180, 55, 470, 150, 45, 120, 260],
})
X, y = df.drop(columns="price_k"), df["price_k"]

prep = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["suburb"]),
    ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), ["bedrooms", "area_m2"]),
])
model = Pipeline([("prep", prep), ("rf", RandomForestRegressor(n_estimators=200, random_state=0))]).fit(X, y)

new_house = pd.DataFrame([{"suburb": "Avondale", "bedrooms": 3, "area_m2": 230}])
print(f"Estimated price: ${model.predict(new_house)[0]:.0f}k")
```

> **Data leakage** is when information from the test set (or the future) sneaks into training — for example, scaling using the whole dataset before splitting. Pipelines prevent most leakage because they learn preprocessing from training data only.

# Decision Trees and Random Forests {#trees}

A **decision tree** predicts by asking yes/no questions, like a loan officer working through a checklist: *Is monthly income above $300? Has the customer missed more than two payments?* Each answer leads to another question until a **leaf** gives the prediction.

```sketch
title: "A small loan decision tree"
caption: "Each split asks one question about one feature. Training picks the questions that best separate the people who repaid from those who didn't."
cellW: 190
cellH: 100
nodes:
  - id: root
    label: "Income > $300?"
    col: 1
    row: 0
    shape: diamond
    tone: gold
  - id: missed
    label: "Missed > 2 payments?"
    col: 0
    row: 1.3
    shape: diamond
    tone: gold
  - id: yes1
    label: "Repays"
    sub: "92% of 180"
    col: 2
    row: 1.3
    shape: pill
    tone: teal
  - id: no
    label: "Defaults"
    sub: "81% of 60"
    col: -0.5
    row: 2.6
    shape: pill
    tone: rose
  - id: yes2
    label: "Repays"
    sub: "70% of 90"
    col: 0.6
    row: 2.6
    shape: pill
    tone: teal
edges:
  - from: root
    to: missed
    label: "no"
  - from: root
    to: yes1
    label: "yes"
  - from: missed
    to: no
    label: "yes"
  - from: missed
    to: yes2
    label: "no"
```

## How a tree picks its questions

At each step the tree tries every feature and every threshold, and keeps the split that makes the two groups **purest**. Purity is usually measured with **Gini impurity**: the chance that two random people from the group have different labels. A group that all repaid has Gini 0; a 50/50 group has Gini 0.5.

```python run title="Find the best first question"
import numpy as np

income = np.array([120, 450, 300, 800, 210, 650, 90, 520, 380, 150])   # USD per month
missed = np.array([4, 0, 1, 0, 3, 1, 5, 0, 2, 3])                      # missed payments last year
repaid = np.array([0, 1, 1, 1, 0, 1, 0, 1, 1, 0])

def gini(labels):
    if len(labels) == 0:
        return 0.0
    p = labels.mean()
    return 1 - p ** 2 - (1 - p) ** 2

def best_split(feature, labels):
    best = (None, 1.0)
    for t in np.unique(feature):
        left, right = labels[feature <= t], labels[feature > t]
        score = (len(left) * gini(left) + len(right) * gini(right)) / len(labels)   # weighted impurity
        if score < best[1]:
            best = (t, score)
    return best

print("impurity before splitting:", round(gini(repaid), 3))
for name, col in [("income", income), ("missed payments", missed)]:
    t, score = best_split(col, repaid)
    print(f"best split on {name:16} <= {t:4}: impurity after = {score:.3f}")
```

Both features separate this tiny dataset perfectly, so either could be the first question. On real data the tree keeps splitting each group the same way until a stopping rule (maximum depth, minimum samples per leaf) says stop.

## Trees in scikit-learn

```python run title="A readable tree, and an overgrown one"
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text

data = load_breast_cancer()
X_tr, X_te, y_tr, y_te = train_test_split(data.data, data.target, test_size=0.3, random_state=0, stratify=data.target)

small = DecisionTreeClassifier(max_depth=2, random_state=0).fit(X_tr, y_tr)
print(export_text(small, feature_names=list(data.feature_names)))

for depth in [2, 4, None]:
    tree = DecisionTreeClassifier(max_depth=depth, random_state=0).fit(X_tr, y_tr)
    print(f"max_depth={str(depth):4}  leaves {tree.get_n_leaves():3}  train {tree.score(X_tr, y_tr):.0%}  test {tree.score(X_te, y_te):.1%}")
```

Going deeper takes training accuracy to 100% but buys nothing on the test set: the extra leaves only memorise training examples. A single tree overfits easily, and that is its main weakness.

## Random forests: many trees vote

A **random forest** trains hundreds of trees, each on a random sample of the rows (drawn with replacement, called **bagging**) and each split choosing from a random subset of the features. Every tree overfits in its own way; averaging their votes cancels much of the noise.

```python run title="One tree versus a forest"
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
from sklearn.tree import DecisionTreeClassifier

data = load_breast_cancer()
X, y = data.data, data.target
for name, model in [("one tree", DecisionTreeClassifier(random_state=0)),
                    ("random forest (200 trees)", RandomForestClassifier(n_estimators=200, random_state=0))]:
    scores = cross_val_score(model, X, y, cv=5)
    print(f"{name:26} accuracy {scores.mean():.1%} ± {scores.std():.1%}")

forest = RandomForestClassifier(n_estimators=200, random_state=0).fit(X, y)
top = forest.feature_importances_.argsort()[::-1][:4]
print("\nmost useful features:")
for i in top:
    print(f"  {data.feature_names[i]:22} {forest.feature_importances_[i]:.3f}")
```

| Choose trees or forests when… | Choose a neural network when… |
|---|---|
| Data is a table of a few hundred to a few million rows | Data is images, audio or free text |
| Features mix numbers and categories | You have a lot of data and a GPU |
| You need to explain decisions (a single tree) | Patterns are built from raw signals |

````challenge
id: ml-gini
title: Gini impurity
difficulty: easy
prompt: |
  Write `gini(labels)` for a list of class labels (any number of classes). Gini impurity is `1 − Σ pₖ²`, where `pₖ` is the share of labels in class *k*. Return `0.0` for an empty list. Round nothing.
starter: |
  def gini(labels):
      pass

  print(gini(["repaid", "repaid", "default", "repaid"]))
tests: |
  assert gini(["a", "a", "a"]) == 0.0
  assert abs(gini(["repaid", "repaid", "default", "repaid"]) - 0.375) < 1e-9
  assert abs(gini([0, 1, 2]) - (1 - 3 * (1 / 3) ** 2)) < 1e-9, "It must work for more than two classes"
  assert gini([]) == 0.0
````

```quiz
- q: Why does an unlimited-depth decision tree score 100% on training data?
  options: ["It is a perfect model", "It keeps splitting until it memorises every training example", "Trees can't overfit", "It uses the test data"]
  answer: 1
- q: What makes the trees in a random forest different from one another?
  options: ["Each sees a random sample of rows and random subsets of features", "They use different labels", "Each is trained on the test set", "They have different loss functions"]
  answer: 0
```

# Gradient Boosting {#boosting}

A random forest builds trees **independently** and averages them. **Boosting** builds trees **one after another**, each one trying to fix the mistakes the previous trees still make. On tabular data, gradient boosting (XGBoost, LightGBM, CatBoost) wins more competitions and powers more production models than any other method.

## Boosting from scratch

For regression, "fixing mistakes" means fitting each new small tree to the **residuals**: how far off the current prediction is. Each tree's prediction is added in, scaled down by a **learning rate** so no single tree dominates.

```python run title="Gradient boosting in a dozen lines"
import numpy as np
from sklearn.tree import DecisionTreeRegressor

rng = np.random.default_rng(0)
rain = rng.uniform(300, 1000, 300)                                     # mm per season
yield_t = 0.5 + 3 * np.sin((rain - 300) / 300) + rng.normal(0, 0.3, 300)   # a curved relationship
X = rain.reshape(-1, 1)

prediction = np.full_like(yield_t, yield_t.mean())                      # start from the average
lr, trees = 0.3, []
for step in range(1, 31):
    residual = yield_t - prediction                                     # what is still wrong
    tree = DecisionTreeRegressor(max_depth=2).fit(X, residual)          # a small tree learns it
    prediction += lr * tree.predict(X)
    trees.append(tree)
    if step in (1, 3, 10, 30):
        print(f"after {step:2} trees: average error {np.abs(yield_t - prediction).mean():.3f} t/ha")
```

Each tree is weak (just two levels of questions), but 30 of them added together fit a curve no single small tree could. The name **gradient** boosting comes from the fact that residuals are the gradient of squared error; other losses (like log-loss for classification) plug into the same loop.

## Boosting in practice

```python run title="Forest versus boosting versus a linear model"
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_breast_cancer(return_X_y=True)
models = {
    "logistic regression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)),
    "random forest": RandomForestClassifier(n_estimators=200, random_state=0),
    "gradient boosting": HistGradientBoostingClassifier(learning_rate=0.1, max_iter=200, random_state=0),
}
for name, model in models.items():
    scores = cross_val_score(model, X, y, cv=5)
    print(f"{name:20} {scores.mean():.1%} ± {scores.std():.1%}")
```

On this small, clean dataset all three are close, and a well-scaled linear model holds its own. Always compare against a simple baseline. Boosting's lead grows on larger, messier tables with non-linear interactions.

| Setting | What it does | Typical start |
|---|---|---|
| `learning_rate` | How much each tree adds | 0.05–0.1 |
| `n_estimators` / `max_iter` | How many trees | 100–1,000 with early stopping |
| `max_depth` / `max_leaf_nodes` | How complex each tree is | Depth 3–8 |
| Early stopping | Stop when validation score stops improving | Always on for large data |

A smaller learning rate with more trees almost always generalises better, at the cost of training time.

| Library | Known for |
|---|---|
| **XGBoost** | The library that made boosting famous; very configurable |
| **LightGBM** | Very fast on large data; grows trees leaf by leaf |
| **CatBoost** | Handles text categories (district, crop type) without manual encoding |
| **HistGradientBoosting** (scikit-learn) | LightGBM-style speed, built in, runs in this browser |

```quiz
- q: How does boosting differ from a random forest?
  options: ["Boosting trains trees one after another, each fixing earlier mistakes", "Boosting uses only one tree", "Boosting can't do regression", "Boosting trains trees on the test set"]
  answer: 0
- q: In gradient boosting for regression, what does each new tree learn?
  options: ["The original targets", "The residuals the current model still gets wrong", "Random noise", "The feature names"]
  answer: 1
```

# k-Nearest Neighbours and Support Vector Machines {#knn-svm}

Two classic methods that think about **distance and geometry** rather than questions or equations.

## k-nearest neighbours

**KNN** stores the training data and, for a new point, looks at the *k* closest examples and takes a vote (or an average, for regression). There is no training step at all.

Because it works on distances, **feature scale matters**. If one feature is in thousands (income) and another in single digits (household size), the big one drowns out the small one. Always scale first.

```python run title="KNN with and without scaling"
from sklearn.datasets import load_wine
from sklearn.model_selection import cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)          # 13 chemical measurements on very different scales
print("feature ranges, smallest to largest:", round(X.max(axis=0).min(), 2), "...", round(X.max(axis=0).max(), 1))

for k in [1, 5, 15]:
    raw = cross_val_score(KNeighborsClassifier(n_neighbors=k), X, y, cv=5).mean()
    scaled = cross_val_score(make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=k)), X, y, cv=5).mean()
    print(f"k = {k:2}: unscaled {raw:.1%}   scaled {scaled:.1%}")
```

Small *k* follows the data closely and is noisy; large *k* is smoother. Choose it with cross-validation.

## The curse of dimensionality

In many dimensions, every point is almost equally far from every other point, so "nearest" stops meaning much. This is why KNN struggles on raw, high-dimensional data, and why search systems first compress data into good **embeddings**.

```python run title="Nearest and farthest become alike"
import numpy as np
rng = np.random.default_rng(0)
for dims in [2, 10, 100, 1000]:
    points = rng.random((500, dims))
    d = np.linalg.norm(points - points[0], axis=1)[1:]
    print(f"{dims:5} dimensions: nearest / farthest distance = {d.min() / d.max():.2f}")
```

## Support vector machines

An **SVM** draws the boundary between classes with the **widest possible margin**. Only the points closest to the boundary, the **support vectors**, decide where it goes. The setting `C` trades margin width against training mistakes: small `C` gives a wide, forgiving margin; large `C` tries to classify every training point correctly.

The **kernel trick** lets an SVM draw curved boundaries by comparing points with a similarity function, such as the RBF (radial) kernel, as if the data had been mapped into many more dimensions, without ever computing that mapping.

```python run title="Linear versus RBF kernel"
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC

X, y = make_moons(n_samples=400, noise=0.2, random_state=0)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=0)

for kernel in ["linear", "rbf"]:
    svm = SVC(kernel=kernel, C=1.0).fit(X_tr, y_tr)
    print(f"{kernel:6} kernel: test accuracy {svm.score(X_te, y_te):.1%}, support vectors {len(svm.support_)} of {len(X_tr)}")
```

| Method | Strengths | Weaknesses |
|---|---|---|
| **KNN** | No training; simple; works for regression too | Slow to predict on big data; needs scaling; struggles in high dimensions |
| **SVM** | Strong on small and medium datasets; good with many features | Slow beyond about 100,000 rows; needs scaling and tuning of `C` and kernel |

```exercise
prompt: KNN needs scaled features. Complete the pipeline so the data is standardised before the classifier sees it.
code: |
  model = make_pipeline(___(), KNeighborsClassifier(n_neighbors=5))
answers: ["StandardScaler"]
hint: It rescales each feature to mean 0 and standard deviation 1.
```

```quiz
- q: Why must you scale features before using KNN?
  options: ["KNN only accepts integers", "Distances are dominated by features with large numbers", "Scaling adds more neighbours", "It makes training faster"]
  answer: 1
- q: Which training points decide an SVM's boundary?
  options: ["All of them equally", "The support vectors closest to the boundary", "Only the outliers", "The first k points"]
  answer: 1
```

# Hyperparameter Tuning {#tuning}

**Parameters** are learned from data (a tree's split thresholds, a network's weights). **Hyperparameters** are settings you choose before training: the number of trees, the depth, the learning rate. Tuning means searching for good hyperparameters without fooling yourself.

## The rule that matters most

Tune on **validation** data, never on the test set. If you try 100 settings and keep the one with the best test score, that score is now optimistic: you've fitted the test set by selection. Use cross-validation on the training data to choose, then report the test score **once**, at the end.

```sketch
title: "Honest tuning"
caption: "Cross-validation inside the training data picks the settings; the test set is opened once, for the final score."
cellW: 190
nodes:
  - id: all
    label: "All data"
    col: 0
    row: 1
    shape: db
  - id: train
    label: "Training data"
    col: 1.2
    row: 0.4
    shape: db
    tone: teal
  - id: test
    label: "Test set"
    sub: "locked away"
    col: 1.2
    row: 1.8
    shape: db
    tone: rose
  - id: cv
    label: "Search + cross-validation"
    sub: "try many settings"
    col: 2.5
    row: 0.4
    shape: round
    tone: gold
  - id: final
    label: "Final score"
    sub: "reported once"
    col: 2.5
    row: 1.8
    shape: pill
    tone: grape
edges:
  - from: all
    to: train
  - from: all
    to: test
  - from: train
    to: cv
  - from: cv
    to: final
    label: "best model"
  - from: test
    to: final
```

## Grid search versus random search

**Grid search** tries every combination from lists you give. **Random search** samples combinations at random. With the same budget, random search usually finds settings as good or better, because only a few hyperparameters really matter and random search tries more distinct values of each.

```python run title="Grid search versus random search"
import time
from scipy.stats import loguniform, randint
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, train_test_split

X, y = load_breast_cancer(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
model = HistGradientBoostingClassifier(max_iter=60, random_state=0)

grid = {"learning_rate": [0.05, 0.2], "max_depth": [2, 4, 8]}                 # 6 combinations
space = {"learning_rate": loguniform(0.01, 0.5), "max_depth": randint(2, 10)}

for name, search in [("grid", GridSearchCV(model, grid, cv=3)),
                     ("random", RandomizedSearchCV(model, space, n_iter=6, cv=3, random_state=0))]:
    t = time.time()
    search.fit(X_tr, y_tr)
    params = {k: round(float(v), 3) if k == "learning_rate" else int(v) for k, v in search.best_params_.items()}
    print(f"{name:6} search: best CV accuracy {search.best_score_:.1%} with {params} ({time.time() - t:.1f}s)")

print(f"\nfinal test accuracy of the random-search model: {search.score(X_te, y_te):.1%}")
```

## A practical strategy

1. Start with library defaults and a simple baseline. Record the score.
2. Tune the one or two hyperparameters that matter most (for boosting: learning rate and number of trees; for forests: depth and features per split).
3. Use random search over wide ranges, then a narrower search around the best region.
4. For expensive models, use **Bayesian optimisation** (for example the Optuna library), which picks the next setting to try based on the results so far.
5. Report the test score once. If you go back and tune again after seeing it, you need a new test set.

```quiz
- q: Which is a hyperparameter rather than a learned parameter?
  options: ["A tree's split threshold", "A network's weight", "The number of trees in a forest", "A linear model's coefficient"]
  answer: 2
- q: Why is choosing settings by their test-set score a mistake?
  options: ["It's slower", "The test score becomes optimistic because you selected for it", "Test sets can't be scored", "It always picks the smallest model"]
  answer: 1
```

# Imbalanced Data {#imbalanced}

In many real problems the interesting class is rare: fraud is maybe 1 in 500 mobile-money transactions; a disease may affect 2% of patients; most loan applicants repay. A model can be **99% accurate and useless**.

```python run title="The accuracy trap"
import numpy as np
from sklearn.datasets import make_classification
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, recall_score
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=5000, n_features=10, n_informative=5, weights=[0.98], flip_y=0, class_sep=1.0, random_state=0)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
print(f"fraud rate: {y.mean():.1%}")

lazy = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)        # always says "not fraud"
pred = lazy.predict(X_te)
print(f"always 'not fraud': accuracy {accuracy_score(y_te, pred):.1%}, frauds caught {recall_score(y_te, pred):.0%}")
```

For rare classes, look at **precision** (of the alarms, how many were real?) and **recall** (of the real cases, how many did we catch?), or the **precision-recall curve**. Review them with the [confusion matrix](/learn/machine-learning/evaluation).

## Three fixes

| Fix | How | Notes |
|---|---|---|
| **Class weights** | Make mistakes on the rare class cost more during training | `class_weight="balanced"` in scikit-learn; usually the first thing to try |
| **Threshold tuning** | Flag a case when its probability is above 0.2, not 0.5 | Free, after training; choose using real costs |
| **Resampling** | Duplicate or synthesise rare examples (SMOTE), or drop common ones | Only resample the **training** set, never the test set |

```python run title="Class weights and a better threshold"
import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score, recall_score
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=5000, n_features=10, n_informative=5, weights=[0.98], flip_y=0, class_sep=1.0, random_state=0)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)

def report(name, pred):
    print(f"{name:34} precision {precision_score(y_te, pred, zero_division=0):5.1%}   recall {recall_score(y_te, pred):5.1%}   alarms {pred.sum():4}")

plain = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)
report("plain model, threshold 0.5", plain.predict(X_te))
weighted = LogisticRegression(max_iter=1000, class_weight="balanced").fit(X_tr, y_tr)
report("class_weight='balanced'", weighted.predict(X_te))
report("plain model, threshold 0.2", (plain.predict_proba(X_te)[:, 1] >= 0.2).astype(int))
```

The plain model is precise but misses half the fraud. Class weights catch almost all of it, at the price of many more false alarms. A lower threshold sits in between. There is no free lunch: catching more fraud means more false alarms. The right balance depends on **costs**. If a missed fraud costs $200 and checking a false alarm costs $2, you should accept many false alarms.

````challenge
id: ml-threshold
title: Choose the cheapest threshold
difficulty: medium
prompt: |
  Write `best_threshold(y_true, scores, cost_fn, cost_fp)`. A case is flagged when `score >= threshold`. Try every distinct value in `scores` as the threshold, and compute the total cost: `cost_fn` for each missed positive plus `cost_fp` for each false alarm. Return the threshold with the **lowest** cost; if several tie, return the **highest** of them.
starter: |
  def best_threshold(y_true, scores, cost_fn, cost_fp):
      pass

  y = [0, 0, 1, 0, 1, 0, 0, 1]
  s = [0.1, 0.3, 0.35, 0.4, 0.6, 0.65, 0.2, 0.9]
  print(best_threshold(y, s, cost_fn=200, cost_fp=2))
tests: |
  y = [0, 0, 1, 0, 1, 0, 0, 1]
  s = [0.1, 0.3, 0.35, 0.4, 0.6, 0.65, 0.2, 0.9]
  assert best_threshold(y, s, cost_fn=200, cost_fp=2) == 0.35, "Missing fraud is expensive: flag down to 0.35"
  assert best_threshold(y, s, cost_fn=1, cost_fp=100) == 0.9, "False alarms are expensive: only flag the surest case"
  assert best_threshold([1, 1, 0], [0.9, 0.8, 0.1], 10, 10) == 0.8
````

```quiz
- q: Only 1% of transactions are fraud. A model says "not fraud" every time. What is its accuracy?
  options: ["1%", "50%", "About 99%", "0%"]
  answer: 2
- q: When should you resample to balance classes?
  options: ["On the whole dataset before splitting", "On the training set only", "On the test set only", "Never"]
  answer: 1
```

# Unsupervised Learning: Clustering {#clustering}

**Clustering** finds groups without labels — useful for customer segments, grouping farms by soil type, or spotting unusual behaviour.

```sketch
title: "k-means in three steps"
caption: "Pick k centres, assign every point to its nearest centre, move each centre to the middle of its points, and repeat until nothing changes."
cellW: 180
nodes:
  - id: init
    label: "Place k centres"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: asg
    label: "Assign points"
    col: 1.5
    row: 0
    shape: round
    tone: gold
    sub: "nearest centre"
  - id: mv
    label: "Move centres"
    col: 3
    row: 0
    shape: round
    tone: teal
    sub: "to the mean"
  - id: chg
    label: "Changed?"
    col: 2.25
    row: 1.3
    shape: diamond
  - id: done
    label: "Clusters"
    col: 3.6
    row: 1.3
    shape: pill
    tone: grape
edges:
  - from: init
    to: asg
  - from: asg
    to: mv
  - from: mv
    to: chg
  - from: chg
    to: asg
    label: "yes"
  - from: chg
    to: done
    label: "no"
```


```python run title="Segmenting mobile-money customers"
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(7)
small = rng.normal([5, 20], [2, 5], (40, 2))      # few, small transactions
traders = rng.normal([40, 60], [6, 10], (40, 2))  # many, medium
business = rng.normal([15, 400], [4, 60], (40, 2))# fewer, large
data = np.vstack([small, traders, business])      # columns: transactions/week, avg amount ($)

scaled = StandardScaler().fit_transform(data)
km = KMeans(n_clusters=3, n_init=10, random_state=0).fit(scaled)
for k in range(3):
    group = data[km.labels_ == k]
    print(f"Segment {k}: {len(group)} customers, ~{group[:,0].mean():.0f} tx/week, ~${group[:,1].mean():.0f} each")
```

Other unsupervised tools: **PCA** (reduce many columns to a few), **anomaly detection** (Isolation Forest) for fraud.

# Anomaly Detection {#anomaly}

**Anomaly detection** finds the cases that don't fit: a mobile-money account suddenly sending 40 transfers at 3 a.m., a sensor reading on a solar pump that jumps, a pharmacy order ten times bigger than usual. Usually you have few or no labelled examples of anomalies, so the methods learn what **normal** looks like and flag whatever is far from it.

| Type | Example |
|---|---|
| **Point** | One transaction of $9,000 from an account that usually sends $20 |
| **Contextual** | 35 °C is normal in October in Kariba, strange in July in Nyanga |
| **Collective** | Fifty small transfers to new numbers within an hour, each normal on its own |

## Simple statistical rules

For a single number, a **z-score** (how many standard deviations from the mean) or the **IQR rule** (beyond 1.5 × the interquartile range) is often enough. You practised z-scores in [Statistics for AI](/learn/statistics). They break down when several features interact: an amount can be normal and a time can be normal, while that amount at that time for that account is not.

## Isolation Forest and Local Outlier Factor

- **Isolation Forest** builds random trees that split on random features at random thresholds. Anomalies are few and different, so they get isolated in very few splits. A short average path means "probably anomalous".
- **Local Outlier Factor** (LOF) compares how crowded each point's neighbourhood is with its neighbours' neighbourhoods. A point in a much emptier area than its neighbours is an outlier, even if it sits between two dense clusters.

```python run title="Find the suspicious transactions"
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(0)
n = 1000
amount = rng.lognormal(3, 0.6, n)                       # most transfers are $10–$60
hour = np.clip(rng.normal(13, 3.5, n), 0, 23)           # mostly during the day
per_hour = rng.poisson(1.5, n)                          # transfers from the same account this hour
X = np.column_stack([amount, hour, per_hour])

fraud = np.array([[850, 3, 1], [40, 2, 35], [1200, 23, 8], [25, 4, 40], [600, 1, 12]])   # planted cases
X = np.vstack([X, fraud])
is_fraud = np.r_[np.zeros(n), np.ones(len(fraud))]
Xs = StandardScaler().fit_transform(X)

iso = IsolationForest(n_estimators=200, contamination=0.01, random_state=0).fit(Xs)
iso_score = -iso.score_samples(Xs)                      # higher = more anomalous
lof = LocalOutlierFactor(n_neighbors=20)
lof.fit(Xs)
lof_score = -lof.negative_outlier_factor_

for name, score in [("Isolation Forest", iso_score), ("LOF", lof_score)]:
    top10 = np.argsort(score)[::-1][:10]
    print(f"{name:17} found {int(is_fraud[top10].sum())} of 5 planted frauds in its top 10 alerts")

print("\nIsolation Forest's top 5 alerts (amount $, hour, transfers this hour):")
for i in np.argsort(iso_score)[::-1][:5]:
    print(f"  {X[i, 0]:7.0f}  {X[i, 1]:4.0f}h  {X[i, 2]:3.0f}   {'planted fraud' if is_fraud[i] else 'normal data'}")
```

## Evaluating without labels

With no labels, you can't compute accuracy. In practice teams:

1. Rank cases by anomaly score and have a person review the **top few** each day.
2. Record their verdicts. Over time those become labels, and you can measure **precision at k**: of the top *k* alerts, how many were real.
3. Once you have enough labelled fraud, add a supervised model (gradient boosting with class weights) and keep the anomaly detector for **new** kinds of attack it hasn't seen.

| Method | Good for | Watch out for |
|---|---|---|
| z-score / IQR | One feature at a time | Misses combinations |
| **Isolation Forest** | Many features, large data; fast | Struggles with anomalies hidden inside dense clusters |
| **LOF** | Clusters of different density | Slower; sensitive to the neighbour count |
| Autoencoder (a neural network) | Images, sensor streams, very high dimensions | Needs more data and tuning |

```quiz
- q: Why does Isolation Forest flag anomalies?
  options: ["They have the largest values", "They are isolated by fewer random splits than normal points", "They appear most often", "They have labels"]
  answer: 1
- q: Fifty transfers to new numbers in an hour, each small and normal on its own, is which kind of anomaly?
  options: ["Point", "Contextual", "Collective", "Not an anomaly"]
  answer: 2
```

# Visualising Models {#visualising}

Charts help you understand data and explain models to non-technical people.

```python run title="Feature importance"
import matplotlib.pyplot as plt
from sklearn.datasets import load_diabetes
from sklearn.ensemble import RandomForestRegressor

data = load_diabetes()
rf = RandomForestRegressor(n_estimators=200, random_state=0).fit(data.data, data.target)
order = rf.feature_importances_.argsort()

plt.figure(figsize=(6, 4))
plt.barh([data.feature_names[i] for i in order], rf.feature_importances_[order], color="#23807F")
plt.title("Which inputs matter most?")
plt.xlabel("Importance")
plt.tight_layout()
plt.show()
```

# Project: Crop Yield Advisor {#project}

Bring it together: train a model, evaluate it honestly, and use it.

````challenge
id: ml-project-yield
title: Train and evaluate a yield model
difficulty: hard
prompt: |
  Complete `train_model(X, y)` so that it:
  1. splits the data with `train_test_split(X, y, test_size=0.2, random_state=42)`,
  2. trains a `RandomForestRegressor(n_estimators=100, random_state=42)` on the training part,
  3. returns a tuple `(model, mae)` where `mae` is the **mean absolute error on the test set**.

  The tests check that your model is a fitted random forest and that its test MAE is below **0.6** t/ha.
starter: |
  import numpy as np
  from sklearn.ensemble import RandomForestRegressor
  from sklearn.model_selection import train_test_split
  from sklearn.metrics import mean_absolute_error

  rng = np.random.default_rng(3)
  n = 300
  rain = rng.uniform(300, 1000, n)
  fert = rng.uniform(0, 300, n)
  X = np.column_stack([rain, fert])
  y = 0.004 * rain + 0.006 * fert + rng.normal(0, 0.4, n)

  def train_model(X, y):
      pass

  model, mae = train_model(X, y)
  print("Test MAE:", round(mae, 3))
tests: |
  m, err = train_model(X, y)
  assert isinstance(m, RandomForestRegressor), "Return a RandomForestRegressor as the first value"
  assert hasattr(m, "estimators_"), "The model must be trained (call .fit)"
  assert 0 < err < 0.6, f"Test MAE should be below 0.6, got {err:.3f}"
````

```quiz
- q: Why use a Pipeline in scikit-learn?
  options: ["It makes the model bigger", "It applies the same preprocessing in training and prediction and prevents leakage", "It removes the need for data", "It only works with images"]
  answer: 1
- q: Which algorithm groups data without labels?
  options: ["Linear regression", "K-means", "Logistic regression", "Decision tree classifier"]
  answer: 1
- q: Which metric is in the same units as the target?
  options: ["R²", "MAE", "F1", "Recall"]
  answer: 1
```

```exam
- q: "Which task predicts a number?"
  options: ["Classification", "Regression", "Clustering", "Tokenisation"]
  answer: 1
- q: "What does cross-validation do?"
  options: ["Trains and tests on several different splits", "Deletes bad data", "Speeds up training", "Encrypts the model"]
  answer: 0
- q: "What is data leakage?"
  options: ["Test or future information sneaking into training", "Losing data on disk", "A slow network", "Too many features"]
  answer: 0
- q: "Which encoder turns categories like 'suburb' into numbers?"
  options: ["StandardScaler", "OneHotEncoder", "SimpleImputer", "KMeans"]
  answer: 1
- q: "Which model is a strong default for tabular data?"
  options: ["Random forest / gradient boosting", "A spreadsheet", "Linear regression only", "A CNN"]
  answer: 0
- q: "What does R\u00b2 of 0 mean?"
  options: ["Perfect predictions", "No better than predicting the mean", "Negative errors", "100% accuracy"]
  answer: 1
- q: "What makes a random forest stronger than a single decision tree?"
  options: ["Many trees trained on different random samples vote, cancelling individual overfitting", "It uses deeper trees", "It needs no data", "It ignores features"]
  answer: 0
- q: "In gradient boosting, what does each new tree fit?"
  options: ["The original labels", "The errors the current model still makes", "Random noise", "The test set"]
  answer: 1
- q: "Why must features be scaled before k-nearest neighbours?"
  options: ["Distances are dominated by features with large values", "KNN can't read decimals", "It doubles the neighbours", "Scaling labels the data"]
  answer: 0
- q: "Only 1% of cases are fraud. Which number best shows whether a model catches fraud?"
  options: ["Accuracy", "Recall on the fraud class", "Training time", "Number of features"]
  answer: 1
```
