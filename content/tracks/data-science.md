---
id: data-science
title: Data Science
short: DATA SCIENCE
category: maths-data
level: intermediate
language: python
color: "#150458"
icon: "📊"
order: 31
summary: Turn raw data into insight with NumPy, pandas and matplotlib — cleaning, grouping, joining, time series and charts — using Zimbabwean datasets, all runnable in your browser.
tags: [data science, pandas, numpy, matplotlib, analytics, python]
---

# What is Data Science? {#intro}

**Data science** uses programming, statistics and domain knowledge to answer questions with data:

- Which provinces had the highest maize yields, and why?
- Which products sell best in December?
- Is a new clinic reducing waiting times?

The core Python toolkit:

| Library | Use |
|---|---|
| **NumPy** | Fast maths on arrays of numbers |
| **pandas** | Tables (DataFrames): load, clean, filter, group, join |
| **matplotlib** / **seaborn** | Charts |
| **scikit-learn** | Machine learning |
| **Jupyter** | Notebooks to explore and share analysis |

All of them run in this browser editor (the first run downloads them).

```python run
import pandas as pd
df = pd.DataFrame({
    "province": ["Harare", "Bulawayo", "Manicaland", "Midlands", "Masvingo"],
    "schools": [210, 140, 360, 330, 320],
    "computer_labs": [150, 90, 110, 120, 80],
})
df["labs_per_school"] = (df["computer_labs"] / df["schools"]).round(2)
print(df.sort_values("labs_per_school", ascending=False))
```

> These figures are **illustrative**, made up for practice. In real projects always record where your data came from.

# NumPy Essentials {#numpy}

NumPy arrays are much faster than Python lists for maths, and operations apply to every element at once ("vectorisation").

```python run
import numpy as np

rain = np.array([180, 160, 95, 30, 8, 2, 1, 3, 15, 40, 110, 170])   # mm per month
print("Total:", rain.sum(), "mm")
print("Mean:", rain.mean().round(1), "| Std:", rain.std().round(1))
print("Wet months (>100 mm):", np.where(rain > 100)[0] + 1)
print("As percentage of year:", (rain / rain.sum() * 100).round(1))

grid = np.arange(12).reshape(3, 4)
print(grid)
print("Column sums:", grid.sum(axis=0))
```

```exercise
prompt: Get the average of the array.
code: |
  import numpy as np
  marks = np.array([60, 72, 85])
  print(marks.___())
answers: [mean]
```

# pandas DataFrames {#pandas-basics}

A **DataFrame** is a table with named columns. A **Series** is one column.

```python run
import pandas as pd
import io

csv = """date,market,item,price_usd
2026-01-05,Mbare,tomatoes,1.00
2026-01-05,Mbare,onions,1.50
2026-01-05,Sakubva,tomatoes,0.90
2026-01-12,Mbare,tomatoes,1.20
2026-01-12,Sakubva,onions,1.60
2026-01-12,Bulawayo,tomatoes,1.10
2026-01-19,Bulawayo,onions,1.30
2026-01-19,Mbare,onions,1.40"""

df = pd.read_csv(io.StringIO(csv), parse_dates=["date"])
print(df.head())
print(df.shape)          # (rows, columns)
print(df.dtypes)
print(df.describe())
```

In real projects: `pd.read_csv("prices.csv")`, `pd.read_excel("file.xlsx")`, or `pd.read_sql(query, connection)`.

## Selecting data

```python run
import pandas as pd
df = pd.DataFrame({"name": ["Chipo", "Sipho", "Farai", "Rudo"], "city": ["Harare", "Bulawayo", "Harare", "Mutare"], "xp": [120, 340, 90, 210]})
print(df["name"])                       # one column
print(df[["name", "xp"]])               # several columns
print(df[df["xp"] > 100])               # filter rows
print(df.loc[df["city"] == "Harare", "name"].tolist())
print(df.iloc[0])                       # first row by position
```

# Cleaning Data {#cleaning}

Real data is messy. Cleaning often takes most of a data scientist's time.

```python run
import pandas as pd
import numpy as np

raw = pd.DataFrame({
    "learner": ["Tendai", "sipho ", "Chipo", "Chipo", None, "Farai"],
    "province": ["Harare", "bulawayo", "Harare", "Harare", "Midlands", "MIDLANDS"],
    "score": ["78", "65", "n/a", "n/a", "70", "91"],
})

df = raw.copy()
df = df.dropna(subset=["learner"])                          # remove rows with no name
df["learner"] = df["learner"].str.strip().str.title()        # tidy text
df["province"] = df["province"].str.title()                  # consistent capitals
df["score"] = pd.to_numeric(df["score"], errors="coerce")     # "n/a" -> NaN
df = df.drop_duplicates()
df["score"] = df["score"].fillna(df["score"].median())       # fill missing scores
print(df)
```

## Cleaning checklist

- Missing values: `isna().sum()`, then `dropna` or `fillna`.
- Wrong types: `pd.to_numeric`, `pd.to_datetime`.
- Inconsistent text: `.str.strip()`, `.str.lower()`, `.replace()`.
- Duplicates: `drop_duplicates()`.
- Outliers: check with `describe()` and charts before removing anything.

````challenge
id: ds-clean-prices
title: Clean a price list
difficulty: medium
prompt: |
  Write `clean(df)` that returns a **new** DataFrame where:
  1. the `item` column is stripped of spaces and lowercase,
  2. `price` is numeric (invalid values become NaN) and rows with missing prices are **removed**,
  3. duplicate rows are removed,
  4. the index is reset (`reset_index(drop=True)`).
starter: |
  import pandas as pd

  df = pd.DataFrame({
      "item": [" Tomatoes", "onions", "ONIONS ", "sugar", "Tomatoes"],
      "price": ["1.00", "1.50", "1.50", "free", "1.00"],
  })

  def clean(df):
      pass

  print(clean(df))
tests: |
  out = clean(df)
  assert out is not None, "Return the cleaned DataFrame"
  assert list(out["item"]) == ["tomatoes", "onions"], f"Expected items ['tomatoes', 'onions'], got {list(out['item'])}"
  assert list(out["price"]) == [1.0, 1.5]
  assert list(out.index) == [0, 1], "Reset the index"
  assert df.loc[0, "item"] == " Tomatoes", "Don't modify the original DataFrame"
````

# Grouping and Aggregating {#groupby}

`groupby` splits data into groups, applies a calculation, and combines the results — like SQL's GROUP BY.

```python run
import pandas as pd
sales = pd.DataFrame({
    "branch": ["Harare", "Harare", "Bulawayo", "Bulawayo", "Mutare", "Harare", "Mutare"],
    "product": ["bread", "milk", "bread", "milk", "bread", "bread", "milk"],
    "units": [120, 80, 90, 60, 40, 150, 30],
    "revenue": [132, 96, 99, 72, 44, 165, 36],
})

print(sales.groupby("branch")["revenue"].sum().sort_values(ascending=False))
print(sales.groupby(["branch", "product"]).agg(units=("units", "sum"), revenue=("revenue", "sum")))
print(sales.pivot_table(index="branch", columns="product", values="units", aggfunc="sum", fill_value=0))
```

# Joining Data {#merging}

Combine tables that share a key:

```python run
import pandas as pd
learners = pd.DataFrame({"learner_id": [1, 2, 3, 4], "name": ["Chipo", "Sipho", "Farai", "Rudo"], "school_id": [10, 20, 10, 30]})
schools = pd.DataFrame({"school_id": [10, 20], "school": ["Prince Edward", "Mzilikazi"], "city": ["Harare", "Bulawayo"]})

print(learners.merge(schools, on="school_id", how="left"))
print(pd.concat([learners.head(2), learners.tail(1)]))   # stack rows
```

| `how=` | Keeps |
|---|---|
| `inner` | only matching rows |
| `left` | all left rows |
| `right` | all right rows |
| `outer` | everything |

# Time Series {#time-series}

Data indexed by time: prices, rainfall, transactions, website visits.

```python run
import pandas as pd
import numpy as np

days = pd.date_range("2026-01-01", periods=90, freq="D")
rng = np.random.default_rng(0)
visits = pd.Series(200 + np.arange(90) * 2 + rng.normal(0, 25, 90).round(), index=days)

weekly = visits.resample("W").sum()
print(weekly.head())
print("7-day rolling average (last 3 days):")
print(visits.rolling(7).mean().tail(3).round(1))
print("Best day of week:", visits.groupby(visits.index.day_name()).mean().idxmax())
```

# Visualisation {#visualisation}

Choose the chart for the question:

| Question | Chart |
|---|---|
| How does a value change over time? | Line |
| How do categories compare? | Bar |
| How is a value distributed? | Histogram / box plot |
| Are two variables related? | Scatter |

```python run title="Rainfall and yield"
import matplotlib.pyplot as plt
import numpy as np

months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"]
rain = [25, 85, 160, 190, 170, 95, 30]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9, 3.5))
ax1.bar(months, rain, color="#23807F")
ax1.set_title("Season rainfall (mm)")

rng = np.random.default_rng(2)
season_rain = rng.uniform(350, 950, 60)
yields = 0.005 * season_rain + rng.normal(0, 0.5, 60)
ax2.scatter(season_rain, yields, color="#D4A64A", edgecolor="#6B3A1E")
ax2.set_xlabel("Season rainfall (mm)")
ax2.set_ylabel("Maize yield (t/ha)")
ax2.set_title("More rain, more maize")
plt.tight_layout()
plt.show()
```

> Good charts have a clear title, labelled axes with units, and no unnecessary decoration. Start bar charts at zero.

# Statistics You Need {#statistics}

```python run
import numpy as np
from statistics import median, mode

waits = np.array([12, 15, 14, 10, 95, 13, 16, 12, 11, 14])   # clinic waiting times (minutes)
print("Mean:", waits.mean(), "| Median:", median(waits), "| Mode:", mode(waits))
print("Std dev:", waits.std().round(1))
q1, q3 = np.percentile(waits, [25, 75])
print("IQR:", q3 - q1, "→ outlier threshold:", q3 + 1.5 * (q3 - q1))
```

- **Mean** is pulled by outliers (that 95-minute wait); the **median** isn't — report the median for skewed data like incomes or waiting times.
- **Correlation is not causation:** ice-cream sales and sunburn rise together because of hot weather, not because one causes the other.
- A difference in a **small sample** may just be chance — test it before drawing conclusions.

# Project: Market Price Report {#project}

````challenge
id: ds-project-report
title: Weekly price report
difficulty: hard
prompt: |
  Write `report(df)` that takes a DataFrame with columns `market`, `item`, `price` and returns a DataFrame indexed by `item`, with columns:
  - `cheapest_market` — the market with the lowest price for that item,
  - `min_price` — that lowest price,
  - `avg_price` — the average price across markets, rounded to 2 decimals.

  Sort the result by item name.
starter: |
  import pandas as pd

  df = pd.DataFrame({
      "market": ["Mbare", "Mbare", "Sakubva", "Sakubva", "Bulawayo", "Bulawayo"],
      "item": ["tomatoes", "onions", "tomatoes", "onions", "tomatoes", "onions"],
      "price": [1.00, 1.50, 0.90, 1.60, 1.20, 1.30],
  })

  def report(df):
      pass

  print(report(df))
tests: |
  r = report(df)
  assert list(r.index) == ["onions", "tomatoes"], f"Index should be the sorted items, got {list(r.index)}"
  assert r.loc["tomatoes", "cheapest_market"] == "Sakubva"
  assert r.loc["onions", "cheapest_market"] == "Bulawayo"
  assert r.loc["onions", "min_price"] == 1.30
  assert r.loc["tomatoes", "avg_price"] == 1.03, f"avg tomatoes should be 1.03, got {r.loc['tomatoes', 'avg_price']}"
````

```quiz
- q: Which is better for summarising skewed data like incomes?
  options: ["Mean", "Median", "Maximum", "Sum"]
  answer: 1
- q: Which pandas method groups rows to calculate totals per category?
  options: ["merge", "groupby", "concat", "pivot"]
  answer: 1
- q: Which chart best shows how a value changes over time?
  options: ["Pie chart", "Line chart", "Scatter plot", "Histogram"]
  answer: 1
```

```exam
- q: "Which library provides DataFrames?"
  options: ["NumPy", "pandas", "matplotlib", "requests"]
  answer: 1
- q: "Which method shows the first rows of a DataFrame?"
  options: ["first()", "head()", "top()", "show()"]
  answer: 1
- q: "How do you convert a text column with bad values to numbers?"
  options: ["int(column)", "pd.to_numeric(col, errors='coerce')", "col.astype(str)", "col.fix()"]
  answer: 1
- q: "Which pandas function joins two tables on a key?"
  options: ["concat", "merge", "append", "stack"]
  answer: 1
- q: "What does `resample('W').sum()` do on a daily time series?"
  options: ["Sums values per week", "Removes weekends", "Sorts by week", "Counts weeks"]
  answer: 0
- q: "A strong correlation between two variables proves\u2026"
  options: ["One causes the other", "Nothing about causation by itself", "The data is wrong", "The mean is high"]
  answer: 1
- q: "Which chart best shows the distribution of one numeric variable?"
  options: ["Histogram", "Pie chart", "Line chart", "Table"]
  answer: 0
```
