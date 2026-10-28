---
id: sagemaker
title: AWS SageMaker AI
short: SAGEMAKER
category: ai
level: advanced
language: python
color: "#7A4A00"
icon: "☁️"
order: 50.7
premium: true
preview: 2
summary: Train, deploy and operate machine-learning and generative-AI models on AWS. SageMaker AI's building blocks, IAM and S3 setup, training jobs with the Python SDK, every deployment option from real-time to batch, JumpStart and foundation models, MLOps with Pipelines and Model Monitor, and the cost and security habits that keep cloud bills sane.
tags: [aws, sagemaker, mlops, model deployment, training jobs, endpoints, jumpstart, hyperpod, cloud ml]
---

# What SageMaker AI Is {#intro}

**Amazon SageMaker AI** is AWS's managed platform for the whole machine-learning lifecycle: preparing data, training models on managed compute, deploying them behind scalable endpoints, and monitoring them in production. You bring code and data; AWS provides the machines, containers, scaling and plumbing.

> **Naming.** In late 2024 AWS renamed the original service **SageMaker AI** and launched **SageMaker Unified Studio**, a broader workspace for data, analytics and AI. This track focuses on SageMaker AI's ML capabilities, which you can use from Unified Studio, the classic Studio, notebooks, or code.

```sketch
title: The SageMaker AI lifecycle
caption: Each stage is a managed service you can use on its own or chain into a pipeline. Data and artifacts live in S3; permissions come from IAM roles.
cellW: 160
cellH: 108
nodes:
  - id: s3
    label: Amazon S3
    sub: data · models
    col: 2
    row: 2.2
    shape: db
    tone: teal
    w: 1.1
  - id: prep
    label: Prepare
    sub: Processing · Data Wrangler · Feature Store
    col: 0
    row: 0.6
    shape: round
    tone: sky
    w: 1.1
  - id: train
    label: Train & tune
    sub: training jobs · HPO · HyperPod
    col: 1.33
    row: 0
    shape: round
    tone: gold
    w: 1.1
  - id: reg
    label: Registry
    sub: versions · approval
    col: 2.66
    row: 0
    shape: round
    tone: grape
    w: 1
  - id: deploy
    label: Deploy
    sub: real-time · serverless · async · batch
    col: 4
    row: 0.6
    shape: round
    tone: teal
    w: 1.15
  - id: mon
    label: Monitor
    sub: Model Monitor · Clarify
    col: 4
    row: 1.8
    shape: round
    tone: rose
edges:
  - from: prep
    to: train
  - from: train
    to: reg
  - from: reg
    to: deploy
  - from: deploy
    to: mon
  - from: mon
    to: prep
    label: retrain
    dashed: true
    bend: 30
  - from: s3
    to: prep
    dashed: true
    arrow: both
  - from: s3
    to: train
    dashed: true
    arrow: both
  - from: s3
    to: deploy
    dashed: true
```

## The main building blocks

| Capability | What it gives you |
|---|---|
| **Studio / notebooks** | Managed JupyterLab and code editors, connected to your AWS resources |
| **Processing jobs** | Run data preparation or evaluation scripts on managed machines |
| **Training jobs** | Run training code in a container on chosen instances (CPU/GPU), with data from S3; outputs a model artifact to S3 |
| **Automatic model tuning** | Hyperparameter search across many training jobs |
| **Endpoints** | Host models for inference: real-time, serverless, asynchronous; plus batch transform |
| **JumpStart** | Catalogue of pre-trained and foundation models to deploy or fine-tune in a few clicks or lines |
| **HyperPod** | Resilient clusters for large-scale training and inference of foundation models |
| **Pipelines, Model Registry, Experiments** | MLOps: automated workflows, versioned models with approval, experiment tracking (MLflow) |
| **Model Monitor, Clarify** | Data/quality drift monitoring; bias and explainability reports |

## SageMaker AI or something else?

| Need | Often a better fit |
|---|---|
| Call a frontier model through an API, no hosting | **Amazon Bedrock** or a provider API |
| A small model for a hobby project | A single VM, a serverless function, or a hosted notebook |
| Custom training and hosting with enterprise controls on AWS | **SageMaker AI** |
| Large-scale foundation-model training | **SageMaker HyperPod** |

```quiz
- q: Where do SageMaker training jobs usually read data from and write model artifacts to?
  options: ["Your laptop", "Amazon S3", "GitHub", "The model registry only"]
  answer: 1
- q: You only need to call a hosted foundation model through an API. Which service is typically simpler?
  options: ["SageMaker HyperPod", "Amazon Bedrock (or a provider API)", "A training job", "Feature Store"]
  answer: 1
```

# Setup: Accounts, IAM, S3 and the SDK {#setup}

## The pieces you must understand

| Piece | Why it matters |
|---|---|
| **AWS account + Region** | Resources live in a Region (e.g. `af-south-1` Cape Town, `eu-west-1` Ireland). Keep data and compute in the same Region |
| **IAM execution role** | SageMaker jobs and endpoints act **as this role**. It needs access to your S3 buckets, ECR images, CloudWatch logs, and nothing more |
| **S3 bucket** | Inputs, outputs, model artifacts. Organise by prefix: `s3://bucket/project/data/`, `/models/`, `/outputs/` |
| **Studio domain / space** | Your managed notebook environment and its storage |
| **Budgets & alerts** | Set an AWS Budget alarm on day one. GPU instances left running are the classic surprise bill |

```bash
# Local setup
pip install sagemaker boto3
aws configure            # or use AWS SSO: aws configure sso
aws sts get-caller-identity
```

## Least-privilege thinking

```python run title="Review an IAM policy for over-broad permissions"
policy = {
    "Statement": [
        {"Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"], "Resource": "arn:aws:s3:::skuru-ml/*"},
        {"Effect": "Allow", "Action": "s3:*", "Resource": "*"},
        {"Effect": "Allow", "Action": ["logs:CreateLogStream", "logs:PutLogEvents"], "Resource": "*"},
        {"Effect": "Allow", "Action": "iam:*", "Resource": "*"},
    ]
}

def review(policy):
    for i, st in enumerate(policy["Statement"], 1):
        actions = st["Action"] if isinstance(st["Action"], list) else [st["Action"]]
        issues = []
        if any(a.endswith(":*") or a == "*" for a in actions):
            issues.append("wildcard actions")
        if st["Resource"] == "*" and not all(a.startswith("logs:") for a in actions):
            issues.append("all resources")
        if any(a.startswith("iam:") for a in actions):
            issues.append("can change permissions (privilege escalation)")
        print(f"statement {i}: {', '.join(actions)} on {st['Resource']} -> {'; '.join(issues) or 'OK'}")

review(policy)
```

An execution role with `s3:*` on `*` can read **every** bucket in the account; one with `iam:*` can grant itself anything. Scope actions and resources to what the job needs.

```quiz
- q: Under whose permissions does a SageMaker training job run?
  options: ["Your personal login", "The IAM execution role you pass to it", "The root account always", "No permissions"]
  answer: 1
- q: What's the single most useful protection against a surprise AWS bill?
  options: ["A strong password", "An AWS Budget with alerts, plus stopping idle resources", "Using more Regions", "A bigger instance"]
  answer: 1
```

# Data Preparation and Features {#data}

## S3 layout conventions

```text
s3://skuru-ml/crop-yield/
    raw/2026-10-01/…            immutable raw drops
    processed/v3/train/…        outputs of a processing job (versioned)
    processed/v3/validation/…
    models/xgb-2026-10-27/…     training outputs (model.tar.gz)
    eval/…                      evaluation reports
```

## Processing jobs

A **processing job** runs your script (pandas, scikit-learn, Spark) on managed instances with S3 inputs mounted at local paths, writes outputs back to S3, and shuts down. Use it for repeatable data preparation and evaluation, not ad-hoc notebook cells.

```python
from sagemaker.sklearn.processing import SKLearnProcessor
from sagemaker.processing import ProcessingInput, ProcessingOutput

processor = SKLearnProcessor(framework_version="1.2-1", role=ROLE_ARN, instance_type="ml.m5.xlarge", instance_count=1)
processor.run(
    code="prepare.py",
    inputs=[ProcessingInput(source="s3://skuru-ml/crop-yield/raw/2026-10-01/", destination="/opt/ml/processing/input")],
    outputs=[ProcessingOutput(source="/opt/ml/processing/train", destination="s3://skuru-ml/crop-yield/processed/v3/train/")],
)
```

> SDK versions differ: classes such as `SKLearnProcessor` come from the classic (v2-style) SDK and remain common in existing projects; the v3 SDK reorganises training and serving around `ModelTrainer` and `ModelBuilder`. Check the SDK version your team uses.

## Feature Store

**Feature Store** keeps curated features (e.g. "average rainfall last 30 days per district") with an **online store** for low-latency lookups at inference time and an **offline store** in S3 for training, so training and serving use the **same** feature definitions, avoiding training/serving skew.

```quiz
- q: Why use a processing job instead of a notebook cell for data preparation?
  options: ["Notebooks can't read S3", "It's repeatable, versioned and runs on managed compute that shuts down after", "It's free", "It trains models"]
  answer: 1
- q: What problem does a feature store's shared definitions prevent?
  options: ["Overfitting", "Training/serving skew: features computed differently in training and production", "High latency", "IAM errors"]
  answer: 1
```

# Training Jobs {#training}

A **training job** = a **container image** (framework or your own) + **your code** + **input channels** from S3 + **instances** + **hyperparameters** → a **model artifact** in S3. Logs go to CloudWatch; you pay only while the job runs.

```sketch
title: Anatomy of a training job
caption: SageMaker starts instances, pulls the image, mounts your data, runs your script, uploads /opt/ml/model to S3, then shuts everything down.
cellW: 170
cellH: 105
nodes:
  - id: code
    label: train.py
    col: 0
    row: 0
    shape: doc
  - id: img
    label: Container image
    sub: e.g. XGBoost / PyTorch
    col: 0
    row: 1.2
    shape: box
    tone: sky
  - id: data
    label: "S3 channels"
    sub: train · validation
    col: 0
    row: 2.4
    shape: db
    tone: teal
  - id: job
    label: Training job
    sub: "ml.g5.xlarge × 1"
    col: 1.6
    row: 1.2
    shape: round
    tone: gold
    w: 1.1
  - id: art
    label: model.tar.gz
    sub: in S3
    col: 3.2
    row: 0.6
    shape: db
    tone: teal
  - id: logs
    label: CloudWatch logs & metrics
    col: 3.2
    row: 1.8
    shape: doc
edges:
  - from: code
    to: job
  - from: img
    to: job
  - from: data
    to: job
  - from: job
    to: art
  - from: job
    to: logs
```

## With the SageMaker Python SDK (v3 style)

```python
# Train a script on managed compute with ModelTrainer (SageMaker Python SDK v3)
from sagemaker.train import ModelTrainer
from sagemaker.train.configs import InputData, SourceCode, Compute

trainer = ModelTrainer(
    training_image=XGBOOST_IMAGE_URI,              # an AWS-provided framework image for your Region
    role=ROLE_ARN,
    source_code=SourceCode(source_dir="src", entry_script="train.py"),
    compute=Compute(instance_type="ml.m5.xlarge", instance_count=1),
    hyperparameters={"max_depth": 6, "eta": 0.2, "num_round": 300},
)
trainer.train(input_data_config=[
    InputData(channel_name="train", data_source="s3://skuru-ml/crop-yield/processed/v3/train/"),
    InputData(channel_name="validation", data_source="s3://skuru-ml/crop-yield/processed/v3/validation/"),
])
```

Inside the container, your script reads data from `/opt/ml/input/data/<channel>/`, gets hyperparameters as arguments or environment variables, and **must save the model to `/opt/ml/model/`**, which SageMaker uploads to S3.

```python
# src/train.py (runs inside the training container)
import os, glob
import pandas as pd
import xgboost as xgb

train = pd.concat(pd.read_csv(f) for f in glob.glob("/opt/ml/input/data/train/*.csv"))
X, y = train.drop(columns=["yield_t_ha"]), train["yield_t_ha"]
model = xgb.XGBRegressor(max_depth=int(os.environ.get("SM_HP_MAX_DEPTH", 6)))
model.fit(X, y)
model.save_model(os.path.join(os.environ.get("SM_MODEL_DIR", "/opt/ml/model"), "model.json"))
```

## Saving money and time

| Technique | Effect |
|---|---|
| **Managed Spot Training** | Use spare capacity, often a large discount; add **checkpointing** so interruptions resume |
| **Right-size instances** | Start small; use GPUs only for deep learning |
| **Local mode first** | Debug the container on your machine before paying for cloud runs |
| **Warm pools** | Reuse instances between quick experiments to skip start-up time |
| **Automatic model tuning** | Bayesian search over hyperparameters instead of manual guessing |

```python run title="Estimate training cost: on-demand vs spot"
INSTANCES = {   # illustrative $/hour; check current pricing for your Region
    "ml.m5.xlarge (CPU)": 0.23,
    "ml.g5.xlarge (1 GPU)": 1.41,
    "ml.p4d.24xlarge (8 GPUs)": 37.69,
}
def cost(rate, hours, spot_discount=0.0, interruptions=0, restart_overhead_h=0.1):
    total_hours = hours + interruptions * restart_overhead_h
    return rate * (1 - spot_discount) * total_hours

for name, rate in INSTANCES.items():
    on_demand = cost(rate, hours=6)
    spot = cost(rate, hours=6, spot_discount=0.65, interruptions=3)
    print(f"{name:26} 6h on-demand ${on_demand:8.2f}   spot (65% off, 3 interruptions) ${spot:8.2f}")
```

```quiz
- q: Where must your training script save the model so SageMaker uploads it?
  options: ["/tmp", "/opt/ml/model", "The current directory", "Directly to the endpoint"]
  answer: 1
- q: What makes Managed Spot Training safe for long jobs?
  options: ["Nothing", "Checkpointing so the job resumes after an interruption", "Bigger instances", "Turning off logs"]
  answer: 1
- q: When do you pay for a training job's instances?
  options: ["Forever", "Only while the job runs", "Only if it succeeds", "Monthly flat fee"]
  answer: 1
```

# Deploying Models {#deployment}

SageMaker AI offers several ways to serve predictions. Choose by **traffic pattern**, **latency need** and **payload size**.

| Option | How it works | Best for |
|---|---|---|
| **Real-time endpoint** | Always-on instances behind an HTTPS endpoint, with autoscaling | Steady traffic, low latency (ms–s) |
| **Serverless inference** | Scales to zero; pay per request duration | Spiky or low traffic that can tolerate cold starts |
| **Asynchronous inference** | Requests are queued; results written to S3; can scale to zero | Large payloads, long processing (minutes), bursty jobs |
| **Batch transform** | A job runs the model over a whole S3 dataset, then stops | Offline scoring of many records (nightly) |
| **Multi-model / inference components** | Many models share one endpoint's instances | Many small models (per customer, per region) |

```sketch
title: Choosing a deployment option
caption: Start from the traffic pattern; the right option often cuts cost by an order of magnitude.
cellW: 180
cellH: 108
nodes:
  - id: q1
    label: "Need answers\nimmediately?"
    col: 0
    row: 1
    shape: diamond
    tone: gold
    w: 0.9
    h: 1.05
  - id: batch
    label: Batch transform
    sub: whole dataset, then stop
    col: 0
    row: 2.4
    shape: pill
    tone: teal
  - id: q2
    label: "Long or large\nrequests?"
    col: 1.3
    row: 1
    shape: diamond
    tone: gold
    w: 0.9
    h: 1.05
  - id: async
    label: Async inference
    sub: queue + S3 results
    col: 1.3
    row: 2.4
    shape: pill
    tone: teal
  - id: q3
    label: "Steady\ntraffic?"
    col: 2.6
    row: 1
    shape: diamond
    tone: gold
    w: 0.9
    h: 1.05
  - id: rt
    label: Real-time endpoint
    sub: + autoscaling
    col: 3.9
    row: 0.4
    shape: pill
    tone: teal
  - id: sl
    label: Serverless
    sub: scales to zero
    col: 3.9
    row: 1.6
    shape: pill
    tone: teal
edges:
  - from: q1
    to: batch
    label: "no"
  - from: q1
    to: q2
    label: "yes"
  - from: q2
    to: async
    label: "yes"
  - from: q2
    to: q3
    label: "no"
  - from: q3
    to: rt
    label: "yes"
  - from: q3
    to: sl
    label: spiky / low
```

## Deploy with ModelBuilder (SDK v3) and invoke with boto3

```python
from sagemaker.serve import ModelBuilder

builder = ModelBuilder(model="xgboost-crop-yield", model_path="s3://skuru-ml/crop-yield/models/xgb-2026-10-27/model.tar.gz")
model = builder.build(model_name="crop-yield-v7")
endpoint = builder.deploy(endpoint_name="crop-yield", instance_type="ml.m5.large", initial_instance_count=1)
print(endpoint.invoke(body={"inputs": [[612, 24.5, 6.1, 1]]}, content_type="application/json"))
```

```python
# Any application (Lambda, a web backend) can call the endpoint with boto3
import json, boto3

runtime = boto3.client("sagemaker-runtime", region_name="af-south-1")
response = runtime.invoke_endpoint(
    EndpointName="crop-yield",
    ContentType="application/json",
    Body=json.dumps({"inputs": [[612, 24.5, 6.1, 1]]}),
)
print(json.loads(response["Body"].read()))
```

## Newer inference capabilities (2026)

AWS added a series of inference features in 2026, including automated **inference recommendations and benchmarking** to pick instance types, **capacity-aware instance pools** with fallback instance types, **OpenAI-compatible APIs** on endpoints, **container caching** for faster scale-out, richer **observability** dashboards, larger **inline async payloads**, and **prefix-aware routing**; and for **HyperPod inference**, managed **tiered KV caching**, **disaggregated prefill/decode**, and model caching. The **Inference Engineering** track explains what these techniques do.

```python run title="Monthly cost: real-time vs serverless for your traffic"
def realtime_cost(instance_per_hour, instances=1, hours=730):
    return instance_per_hour * instances * hours

def serverless_cost(requests_per_month, seconds_per_request, memory_gb, price_per_gb_second=0.00002):
    return requests_per_month * seconds_per_request * memory_gb * price_per_gb_second

for monthly_requests in (20_000, 500_000, 20_000_000):
    rt = realtime_cost(0.115)                        # one small CPU instance, always on (illustrative)
    sl = serverless_cost(monthly_requests, 0.15, 2)   # 150 ms at 2 GB (illustrative)
    print(f"{monthly_requests:>11,} requests/month: real-time ${rt:7.2f}  serverless ${sl:8.2f}  -> {'serverless' if sl < rt else 'real-time'}")
```

````challenge
id: sagemaker-choose-deployment
title: Recommend a deployment option
difficulty: easy
prompt: |
  Write `recommend(realtime_needed, max_seconds, payload_mb, steady_traffic)` returning one of `"batch"`, `"async"`, `"realtime"` or `"serverless"`:

  1. If answers are **not** needed in real time → `"batch"`.
  2. Else if a request can take **more than 60 seconds** or the payload is **larger than 4 MB** → `"async"`.
  3. Else if traffic is steady → `"realtime"`.
  4. Otherwise → `"serverless"`.
starter: |
  def recommend(realtime_needed, max_seconds, payload_mb, steady_traffic):
      pass

  print(recommend(True, 0.2, 0.01, True))
tests: |
  assert recommend(False, 1, 1, True) == "batch"
  assert recommend(True, 300, 1, True) == "async"
  assert recommend(True, 2, 50, False) == "async"
  assert recommend(True, 0.2, 0.01, True) == "realtime"
  assert recommend(True, 0.2, 0.01, False) == "serverless"
  assert recommend(True, 60, 4, False) == "serverless", "Exactly 60 s and 4 MB are still within limits"
````

```quiz
- q: You score 5 million records every night. Which option?
  options: ["Real-time endpoint", "Batch transform", "Serverless", "Async with webhooks"]
  answer: 1
- q: A video-analysis request takes 4 minutes. Which option?
  options: ["Real-time", "Serverless", "Asynchronous inference", "Batch transform per request"]
  answer: 2
- q: Traffic is a few hundred requests a day at random times. Which is usually cheapest?
  options: ["An always-on GPU endpoint", "Serverless inference", "HyperPod", "Two real-time instances"]
  answer: 1
```

# Foundation Models, JumpStart and HyperPod {#jumpstart}

## JumpStart

**SageMaker JumpStart** is a catalogue of pre-trained models (open LLMs, embedding models, vision models) with ready-made deployment and fine-tuning recipes. You pick a model, choose an instance, and get an endpoint, keeping data and inference inside your AWS account.

## Fine-tuning

The v3 SDK includes trainers for common fine-tuning methods (for example supervised fine-tuning and preference optimisation). Before fine-tuning, try **prompting and RAG** first: they're cheaper, faster to change, and often enough. Fine-tune when you need a consistent style or format, a specialised skill, or a smaller, cheaper model that matches a larger one on **your** task, and measure the gain with evals.

## Bedrock vs SageMaker for generative AI

| | Amazon Bedrock | SageMaker AI |
|---|---|---|
| Model access | Managed APIs to many foundation models | You deploy models onto instances you choose |
| Infrastructure | None to manage | You size, scale and pay for endpoints |
| Customisation | Managed fine-tuning for supported models, knowledge bases, agents | Full control: any model, any container, custom training |
| Best for | Fast, serverless use of hosted models | Custom or open models, strict control, existing ML teams |

## HyperPod

**SageMaker HyperPod** provides persistent, resilient clusters (orchestrated with Slurm or Amazon EKS) for training and serving foundation models across many GPUs: it detects and replaces faulty nodes and resumes from checkpoints automatically, which matters when a training run spans weeks.

```quiz
- q: Before fine-tuning a model, what should you usually try first?
  options: ["Training from scratch", "Better prompting and RAG, measured with evals", "A bigger instance", "Nothing"]
  answer: 1
- q: What does HyperPod add for large training runs?
  options: ["Free GPUs", "Resilient clusters that replace faulty nodes and resume from checkpoints", "A notebook UI only", "Batch transform"]
  answer: 1
```

# MLOps on SageMaker AI {#mlops}

```sketch
title: An automated ML pipeline with a quality gate
caption: Every retrain runs the same steps. Only models that beat the current one get registered; deployment needs approval; monitoring triggers the next run.
cellW: 150
cellH: 105
nodes:
  - id: trig
    label: Trigger
    sub: schedule · new data · drift
    col: 0
    row: 0.6
    shape: pill
    tone: sky
  - id: proc
    label: Process
    col: 1
    row: 0
    shape: round
  - id: train
    label: Train
    col: 2
    row: 0
    shape: round
  - id: eval
    label: Evaluate
    col: 3
    row: 0
    shape: round
  - id: gate
    label: "Better than\nproduction?"
    col: 4
    row: 0.6
    shape: diamond
    tone: gold
    w: 0.95
    h: 1.05
  - id: reg
    label: Register
    sub: pending approval
    col: 3
    row: 1.4
    shape: db
    tone: grape
  - id: dep
    label: Deploy
    sub: canary / blue-green
    col: 2
    row: 1.4
    shape: round
    tone: teal
  - id: mon
    label: Monitor
    col: 1
    row: 1.4
    shape: round
    tone: rose
edges:
  - from: trig
    to: proc
  - from: proc
    to: train
  - from: train
    to: eval
  - from: eval
    to: gate
  - from: gate
    to: reg
    label: "yes"
  - from: reg
    to: dep
    label: approved
  - from: dep
    to: mon
  - from: mon
    to: trig
    label: drift
```

| Service | Role |
|---|---|
| **SageMaker Pipelines** | Define steps (process, train, evaluate, condition, register) as a DAG; run on schedule or events |
| **Model Registry** | Versions of each model with metrics and an approval status; deployments pull approved versions |
| **Experiments (managed MLflow)** | Track runs, parameters, metrics and artifacts to compare experiments |
| **Model Monitor** | Capture endpoint traffic; compare data and predictions with a baseline; alarm on drift |
| **Clarify** | Bias metrics before and after training; feature attributions (SHAP) for explanations |
| **CI/CD** | Infrastructure as code (CloudFormation/CDK/Terraform) and pipelines triggered from Git |

The **MLOps** track covers these practices tool-independently; SageMaker supplies managed versions of each.

```quiz
- q: Which service stores model versions with an approval status?
  options: ["Feature Store", "Model Registry", "Clarify", "Processing jobs"]
  answer: 1
- q: What does Model Monitor compare production data against?
  options: ["Random data", "A baseline computed from training or a reference period", "Other customers", "The test set labels only"]
  answer: 1
```

# Cost and Security Habits {#cost-security}

## Cost

| Habit | Why |
|---|---|
| **Budgets and alarms** from day one | Catch mistakes within hours, not at month end |
| **Stop idle notebooks and endpoints** | An idle GPU endpoint bills every hour |
| **Spot for training**, with checkpoints | Large discounts |
| **Serverless / async / batch** where traffic allows | Pay per use instead of always-on |
| **Autoscaling** with sensible minimums | Match capacity to demand |
| **Right-size** using inference recommendations | Don't pay for a bigger instance than benchmarks justify |
| **Tag resources** by project and owner | Know who spends what |
| **Savings Plans** for steady usage | Lower rates for committed use |

## Security

| Area | Practice |
|---|---|
| **IAM** | Separate execution roles per project, least privilege |
| **Network** | Run jobs and endpoints in your **VPC**, use VPC endpoints for S3, disable internet access where possible |
| **Encryption** | KMS keys for S3, volumes and endpoints; TLS in transit |
| **Data** | Don't put personal data into training sets without a lawful basis; mask it in logs and captured traffic |
| **Audit** | CloudTrail for API activity; tag and review resources regularly |

```python run title="Find idle endpoints before they burn money"
endpoints = [
    {"name": "crop-yield", "instance": "ml.m5.large", "count": 2, "rate": 0.115, "invocations_7d": 48_200},
    {"name": "fraud-scoring", "instance": "ml.c6i.xlarge", "count": 1, "rate": 0.204, "invocations_7d": 3_900},
    {"name": "llm-demo-old", "instance": "ml.g5.12xlarge", "count": 1, "rate": 7.09, "invocations_7d": 0},
    {"name": "test-endpoint", "instance": "ml.m5.large", "count": 1, "rate": 0.115, "invocations_7d": 12},
]
waste = 0
for e in endpoints:
    monthly = e["rate"] * e["count"] * 730
    idle = e["invocations_7d"] < 100
    waste += monthly if idle else 0
    flag = "IDLE: delete or switch to serverless" if idle else "in use"
    print(f"{e['name']:15} {e['instance']:16} ${monthly:9.2f}/month  {e['invocations_7d']:>7,} calls/7d  {flag}")
print(f"potential monthly saving: ${waste:,.2f}")
```

```exam
- q: Which IAM principle should SageMaker execution roles follow?
  options: ["Admin access for convenience", "Least privilege: only the S3 paths and services the job needs", "No permissions", "Shared across all projects"]
  answer: 1
- q: Where does a training job write its model artifact?
  options: ["CloudWatch", "Amazon S3", "IAM", "The notebook only"]
  answer: 1
- q: Which deployment option scales to zero and suits spiky, low traffic?
  options: ["Real-time endpoint", "Serverless inference", "Batch transform", "HyperPod"]
  answer: 1
- q: Results for multi-minute requests are written to S3 by…
  options: ["Asynchronous inference", "Real-time endpoints", "Feature Store", "Clarify"]
  answer: 0
- q: Which tool reports bias metrics and feature attributions?
  options: ["Model Monitor", "SageMaker Clarify", "JumpStart", "Pipelines"]
  answer: 1
- q: Managed Spot Training reduces cost; what makes it reliable?
  options: ["Bigger instances", "Checkpointing", "Disabling logs", "Using serverless"]
  answer: 1
- q: Which service gives serverless API access to many foundation models without hosting?
  options: ["SageMaker HyperPod", "Amazon Bedrock", "Batch transform", "Feature Store"]
  answer: 1
- q: An endpoint has had zero invocations for a week. Best action?
  options: ["Add instances", "Delete it or move to serverless", "Ignore it", "Enable Clarify"]
  answer: 1
```
