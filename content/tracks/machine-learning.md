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
summary: Build real models with scikit-learn — right in your browser. Regression, classification, evaluation, feature engineering, clustering, pipelines and an end-to-end crop-yield project.
tags: [machine learning, scikit-learn, python, regression, classification, ml]
---

# The Machine Learning Workflow {#workflow}

Every ML project follows the same steps:

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

# Unsupervised Learning: Clustering {#clustering}

**Clustering** finds groups without labels — useful for customer segments, grouping farms by soil type, or spotting unusual behaviour.

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
```
