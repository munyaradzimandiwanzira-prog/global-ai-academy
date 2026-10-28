---
id: mlops
title: MLOps & AI Platform Engineering
short: MLOPS
category: ai
level: advanced
language: python
color: "#0194E2"
icon: "🏗️"
order: 50
summary: Take models and LLM apps to production and run them reliably. Experiment tracking, model registries, serving, LLM gateways, evaluation pipelines, monitoring, cost control, GPUs and platform leadership.
tags: [mlops, llmops, platform engineering, deployment, monitoring, mlflow, kubernetes]
---

# From Notebook to Production {#intro}

Most ML projects never reach users. **MLOps** is the set of practices that makes models **reproducible, deployable, observable and maintainable** — and **AI platform engineering** builds the shared systems that let every team do this easily.

> **On AWS?** The **[AWS SageMaker AI](/learn/sagemaker)** track shows managed versions of these practices: training jobs, endpoints, Pipelines, Model Registry and Model Monitor. For serving large models efficiently, see **[Inference Engineering](/learn/inference-engineering)**.

```text
 Data ─▶ Train ─▶ Evaluate ─▶ Register ─▶ Deploy ─▶ Monitor ─┐
   ▲                                                         │
   └──────────────── retrain when quality drifts ◀───────────┘
```

| Role | Focus |
|---|---|
| **ML engineer** | Builds and ships specific models |
| **Platform AI engineer** | Builds the shared platform: gateways, evaluation, serving, monitoring, cost controls |
| **Lead platform AI engineer** | Owns architecture, standards, governance, budgets and the team |

```quiz
- q: What does a platform AI engineer mainly build?
  options: ["One-off notebooks", "Shared systems that let many teams ship AI reliably", "Marketing websites", "Mobile games"]
  answer: 1
```

# Reproducibility {#reproducibility}

If you can't reproduce a model, you can't debug, audit or improve it. Record:

- **Code version** (Git commit)
- **Data version** (dataset snapshot or hash)
- **Environment** (`requirements.txt` / lock file, Docker image)
- **Parameters and random seeds**
- **Metrics**

```python run title="Fingerprint a training run"
import hashlib, json, platform, random

data = [("Harare", 820, 2.6), ("Bulawayo", 640, 2.1), ("Masvingo", 510, 1.7)]
params = {"model": "random_forest", "n_estimators": 200, "max_depth": 8, "seed": 42}

data_hash = hashlib.sha256(json.dumps(data).encode()).hexdigest()[:12]
run = {
    "data_version": data_hash,
    "params": params,
    "python": platform.python_version(),
    "git_commit": "a1b2c3d",            # from `git rev-parse --short HEAD`
}
random.seed(params["seed"])
run["metrics"] = {"mae": round(0.42 + random.random() / 100, 4)}
run["run_id"] = hashlib.sha256(json.dumps(run, sort_keys=True).encode()).hexdigest()[:10]
print(json.dumps(run, indent=2))
```

# Experiment Tracking and Model Registry {#tracking}

**Experiment trackers** (MLflow, Weights & Biases) log parameters, metrics and artefacts for every run so you can compare them.

```python
import mlflow
from sklearn.ensemble import RandomForestRegressor

with mlflow.start_run(run_name="yield-rf"):
    mlflow.log_params({"n_estimators": 200, "max_depth": 8})
    model = RandomForestRegressor(n_estimators=200, max_depth=8).fit(X_train, y_train)
    mae = mean_absolute_error(y_test, model.predict(X_test))
    mlflow.log_metric("mae", mae)
    mlflow.sklearn.log_model(model, "model", registered_model_name="maize-yield")
```

A **model registry** stores versioned models with stages or aliases (**staging**, **production**) so deployments always reference an exact, approved version — and you can roll back.

# Serving Models {#serving}

| Pattern | When |
|---|---|
| **Batch** — predictions on a schedule, saved to a table | Nightly credit scores, weekly demand forecasts |
| **Online API** — predictions on request | Fraud check during a payment |
| **Streaming** — predictions on events | Real-time sensor alerts |
| **Edge / on-device** | Phones and IoT with poor connectivity |

A minimal online model API with FastAPI:

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field
import joblib

app = FastAPI()
model = joblib.load("maize_yield_v3.joblib")

class Farm(BaseModel):
    rainfall_mm: float = Field(ge=0, le=3000)
    fertiliser_kg: float = Field(ge=0, le=1000)

@app.post("/predict")
def predict(farm: Farm):
    y = model.predict([[farm.rainfall_mm, farm.fertiliser_kg]])[0]
    return {"yield_t_per_ha": round(float(y), 2), "model_version": "v3"}

@app.get("/health")
def health():
    return {"ok": True}
```

Package it in a **Docker** image and deploy it behind a load balancer — see the [Deployment](/learn/deployment) track.

# LLMOps: Running LLM Applications {#llmops}

LLM apps add new operational concerns:

| Concern | Practice |
|---|---|
| **Prompts are code** | Version them, review changes, test them |
| **Model changes** | Providers update models; pin versions and re-run evaluations |
| **Cost** | Track tokens per feature and per user; set budgets and alerts |
| **Latency** | Stream; cache; choose smaller models where quality allows |
| **Quality** | Automated evals + human review + user feedback |
| **Safety** | Guardrails, red-teaming, incident response |

## The LLM gateway

Platforms usually put an **LLM gateway** between apps and model providers:

```text
 App A ─┐                         ┌─▶ Provider 1 (primary)
 App B ─┼─▶  LLM GATEWAY  ────────┼─▶ Provider 2 (fallback)
 App C ─┘   • auth & quotas       └─▶ Self-hosted open model
            • routing & fallback
            • caching
            • PII redaction
            • logging, cost tracking
```

```python run title="A tiny gateway: routing, fallback, caching and cost tracking"
import hashlib, time

class ProviderDown(Exception): pass

def primary(prompt):
    if "outage" in prompt: raise ProviderDown("primary unavailable")
    return f"[primary] answer to: {prompt[:30]}"
def fallback(prompt):
    return f"[fallback] answer to: {prompt[:30]}"

PRICE = {"primary": 0.002, "fallback": 0.001}   # $ per call (illustrative)

class Gateway:
    def __init__(self):
        self.cache, self.spend, self.calls = {}, {}, []
    def complete(self, team, prompt):
        key = hashlib.sha256(prompt.encode()).hexdigest()
        if key in self.cache:
            self.calls.append((team, "cache", 0.0)); return self.cache[key]
        for name, fn in (("primary", primary), ("fallback", fallback)):
            try:
                start = time.perf_counter()
                out = fn(prompt)
                self.spend[team] = self.spend.get(team, 0) + PRICE[name]
                self.calls.append((team, name, round((time.perf_counter() - start) * 1000, 3)))
                self.cache[key] = out
                return out
            except ProviderDown as e:
                print("  ↳", e, "— trying next provider")
        raise RuntimeError("all providers failed")

gw = Gateway()
print(gw.complete("support", "How do I reset my password?"))
print(gw.complete("support", "How do I reset my password?"))       # cached
print(gw.complete("finance", "Summarise the outage report"))        # falls back
print("Spend by team:", gw.spend)
print("Calls:", gw.calls)
```

# Evaluation Pipelines {#evaluation}

Every model or prompt change should pass an automated **evaluation gate** before release — just like unit tests for code.

```python run title="An evaluation gate"
golden = [
    {"q": "fees due date", "must_contain": ["15 January"]},
    {"q": "late penalty", "must_contain": ["10%"]},
    {"q": "bus time", "must_contain": ["6:45"]},
]

def candidate_system(q):          # stand-in for the new prompt/model version
    answers = {"fees due date": "Fees are due by 15 January.", "late penalty": "A 10% penalty applies.", "bus time": "Buses leave at 7:00."}
    return answers[q]

def evaluate(system, threshold=0.9):
    passed = 0
    for case in golden:
        ok = all(s in system(case["q"]) for s in case["must_contain"])
        passed += ok
        if not ok: print("FAIL:", case["q"], "→", system(case["q"]))
    score = passed / len(golden)
    print(f"score {score:.0%} (threshold {threshold:.0%}) →", "RELEASE" if score >= threshold else "BLOCKED")

evaluate(candidate_system)
```

Combine **deterministic checks** (contains facts, valid JSON, latency budget), **model-graded checks** (LLM-as-judge for faithfulness and tone) and **human review** of samples.

# Monitoring and Drift {#monitoring}

After launch, watch:

| Signal | Example metric |
|---|---|
| **System health** | Error rate, latency (p50/p95), throughput |
| **Data drift** | Input distribution changes (new suburbs, new product types) |
| **Prediction drift** | Output distribution changes |
| **Quality** | Accuracy against delayed ground truth; user thumbs-down rate |
| **Cost** | Tokens and $ per request, per feature, per team |
| **Safety** | Guardrail triggers, flagged content |

```python run title="Detecting data drift with PSI"
import numpy as np

def psi(expected, actual, bins=5):
    edges = np.quantile(expected, np.linspace(0, 1, bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    e = np.histogram(expected, edges)[0] / len(expected)
    a = np.histogram(actual, edges)[0] / len(actual)
    e, a = np.clip(e, 1e-6, None), np.clip(a, 1e-6, None)
    return float(np.sum((a - e) * np.log(a / e)))

rng = np.random.default_rng(0)
training_rain = rng.normal(700, 120, 5000)
this_season_normal = rng.normal(705, 125, 1000)
drought_season = rng.normal(420, 100, 1000)
print("PSI normal season:", round(psi(training_rain, this_season_normal), 3))
print("PSI drought season:", round(psi(training_rain, drought_season), 3), "(> 0.25 = significant drift → investigate / retrain)")
```

# Infrastructure, GPUs and Cost {#infrastructure}

- **Containers** (Docker) make environments identical everywhere.
- **Kubernetes** schedules containers, scales them and restarts failures; GPU node pools for training and inference.
- **Serverless** (Cloudflare Workers, cloud functions) for lightweight APIs and gateways.
- **Inference servers** (vLLM, TGI, Triton) serve open models efficiently with batching.
- **Quantisation** and **smaller models** cut GPU memory and cost.
- **Autoscaling** and **scale-to-zero** avoid paying for idle GPUs.

## Cost controls

1. Budgets and alerts per team and project.
2. Route simple requests to small/cheap models; reserve large models for hard ones.
3. Cache aggressively.
4. Trim prompts and context.
5. Review the biggest spenders weekly.

> In regions with expensive or unreliable connectivity, consider **regional hosting**, **edge inference** and **offline-capable** clients as part of the architecture.

# Leading an AI Platform {#leadership}

Senior and lead platform engineers own more than code:

- **Architecture and standards:** reference designs, approved models, golden paths ("the easy way is the right way").
- **Governance:** model inventory, risk tiers, approval process, documentation, audit trails, data protection compliance.
- **Reliability:** SLOs (e.g. 99.9% availability, p95 latency < 2 s), on-call, incident reviews.
- **Economics:** forecast spend, negotiate with vendors, show cost per business outcome.
- **Enablement:** templates, internal docs, training, office hours.
- **People:** hiring, mentoring, growing engineers into leads.
- **Strategy:** a 12–18 month roadmap aligned with business goals — build vs buy, open vs closed models, where to invest.

```quiz
- q: What does an evaluation gate do?
  options: ["Speeds up training", "Blocks a release if quality drops below a threshold", "Encrypts the model", "Adds more data"]
  answer: 1
- q: A PSI of 0.6 on an input feature most likely means…
  options: ["No change", "Significant data drift", "The model is faster", "The data is encrypted"]
  answer: 1
- q: Which is NOT usually a job of an LLM gateway?
  options: ["Routing and fallback", "Caching", "Cost tracking", "Designing the company logo"]
  answer: 3
```

````challenge
id: mlops-slo
title: Check an SLO
difficulty: medium
prompt: |
  Write `slo_report(latencies_ms, errors, total, p95_target=2000, availability_target=0.999)` that returns a dict:
  - `"p95"`: the 95th percentile latency using **nearest-rank**: sort the list and take the value at index `ceil(0.95 * n) - 1`,
  - `"availability"`: `(total - errors) / total`, rounded to 4 decimals,
  - `"ok"`: `True` only if p95 ≤ target **and** availability ≥ target.
starter: |
  import math

  def slo_report(latencies_ms, errors, total, p95_target=2000, availability_target=0.999):
      pass

  print(slo_report([100, 200, 300, 400, 2500], errors=1, total=2000))
tests: |
  r = slo_report(list(range(1, 101)), errors=0, total=1000)
  assert r["p95"] == 95, f"p95 of 1..100 should be 95, got {r['p95']}"
  assert r["availability"] == 1.0 and r["ok"] is True
  r2 = slo_report([100, 200, 300, 400, 2500], errors=5, total=1000)
  assert r2["p95"] == 2500 and r2["availability"] == 0.995 and r2["ok"] is False
````

```exam
- q: "What does a model registry provide?"
  options: ["Versioned models with stages for safe deployment and rollback", "Free GPUs", "Datasets", "User accounts"]
  answer: 0
- q: "Which serving pattern suits nightly credit scores?"
  options: ["Batch", "Streaming", "Edge", "Manual"]
  answer: 0
- q: "Why pin LLM model versions?"
  options: ["Provider updates can change behaviour; you need to re-evaluate first", "Pinning is cheaper", "It encrypts prompts", "It's required by law"]
  answer: 0
- q: "What is data drift?"
  options: ["Input distributions changing over time", "Disk errors", "Model files moving", "Network latency"]
  answer: 0
- q: "What are SLOs?"
  options: ["Targets for reliability like availability and latency", "Secret keys", "Model sizes", "Prompt formats"]
  answer: 0
- q: "Which practice reduces LLM costs most directly?"
  options: ["Routing simple requests to smaller models and caching", "Increasing max tokens", "Removing logs", "Using higher temperature"]
  answer: 0
```
