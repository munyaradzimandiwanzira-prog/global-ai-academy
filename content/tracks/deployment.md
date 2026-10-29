---
id: deployment
title: Deployment & DevOps
short: DEPLOY
category: cloud
level: intermediate
language: bash
color: "#F38020"
icon: "🚀"
order: 62
summary: Ship your work to the world. Environments and config, Docker, CI/CD with GitHub Actions, deploying to Cloudflare, servers and PaaS, domains and HTTPS, databases in production, monitoring and rollbacks.
tags: [deployment, devops, docker, ci/cd, github actions, cloudflare, hosting]
---

# From Your Laptop to the World {#intro}

"It works on my machine" isn't finished. **Deployment** puts your app on servers so anyone can use it — reliably, securely, and in a way you can update safely.

```sketch
title: "The path to production"
caption: "Code goes to Git, automated checks run, a build is made, and only a passing build is deployed where users can reach it."
cellW: 190
nodes:
  - id: dev
    label: "Your laptop"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: git
    label: "GitHub"
    col: 1.3
    row: 0
    shape: db
    sub: "git push"
  - id: ci
    label: "CI checks"
    col: 2.6
    row: 0
    shape: diamond
    tone: gold
    sub: "tests · lint"
  - id: build
    label: "Build"
    col: 2.6
    row: 1.3
    shape: round
    tone: grape
    sub: "bundle · image"
  - id: prod
    label: "Production"
    col: 1.3
    row: 1.3
    shape: pill
    tone: teal
    sub: "users"
  - id: fix
    label: "Fix it"
    col: 3.9
    row: 0
    shape: pill
    tone: rose
edges:
  - from: dev
    to: git
  - from: git
    to: ci
  - from: ci
    to: build
    label: "pass"
  - from: ci
    to: fix
    label: "fail"
  - from: build
    to: prod
    label: "deploy"
```


```text
 Code on laptop ─▶ Git push ─▶ CI: test & build ─▶ Deploy ─▶ Users
                                   │                  │
                                   └─ fail? stop ─────┘
```

## Hosting options

| Option | Good for | Examples |
|---|---|---|
| **Static hosting** | HTML/CSS/JS sites | Cloudflare Pages/Workers, GitHub Pages, Netlify |
| **Serverless / edge** | APIs that scale to zero | Cloudflare Workers, AWS Lambda |
| **PaaS** | Apps without managing servers | Render, Railway, Fly.io, Heroku |
| **Virtual servers (VPS)** | Full control | Hetzner, DigitalOcean, AWS EC2, local hosting providers |
| **Containers/Kubernetes** | Many services at scale | Docker + Kubernetes, ECS, Cloud Run |

Start simple. A static site or serverless app costs little or nothing and needs no server maintenance.

# Environments and Configuration {#config}

Run the same code in different **environments**:

| Environment | Purpose |
|---|---|
| **Development** | Your laptop |
| **Staging** | A copy of production for final testing |
| **Production** | Real users |

Anything that differs between environments — database URLs, API keys, feature flags — goes in **configuration**, not code ("12-factor app" principle):

```bash
# .env (local only — never commit)
DATABASE_URL=postgres://app:secret@localhost:5432/shop
OPENAI_API_KEY=sk-...
APP_URL=http://localhost:5173
```

In production, set them in your host's dashboard or secret manager. For Cloudflare Workers:

```bash
npx wrangler secret put OPENAI_API_KEY
```

# Docker {#docker}

**Docker** packages your app and everything it needs into an **image**. A running image is a **container**. It runs the same on your laptop, a server or the cloud.

```sketch
title: "Image vs container"
caption: "A Dockerfile is the recipe. Building it makes an image (a frozen snapshot); running the image starts containers, and every one behaves the same."
cellW: 190
cellH: 100
nodes:
  - id: df
    label: "Dockerfile"
    col: 0
    row: 0.6
    shape: doc
    tone: sky
    sub: "FROM python:3.12…"
  - id: img
    label: "Image"
    col: 1.6
    row: 0.6
    shape: db
    tone: gold
    sub: "read-only snapshot"
  - id: c1
    label: "Container"
    col: 3.2
    row: 0
    shape: round
    tone: teal
    sub: "on your laptop"
  - id: c2
    label: "Container"
    col: 3.2
    row: 1.2
    shape: round
    tone: teal
    sub: "on the server"
edges:
  - from: df
    to: img
    label: "build"
  - from: img
    to: c1
    label: "run"
  - from: img
    to: c2
```


```dockerfile
# Dockerfile for a FastAPI app
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd -m appuser
USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t market-api .
docker run -p 8000:8000 --env-file .env market-api
docker ps                 # running containers
docker logs -f <id>       # follow logs
```

## docker compose: several services together

```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: devpassword
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

`docker compose up` starts both. Good practice: small base images, run as a non-root user, no secrets baked into images.

```quiz
- q: What is a container?
  options: ["A database table", "A running instance of a Docker image", "A Git branch", "A CSS layout"]
  answer: 1
```

# CI/CD with GitHub Actions {#ci-cd}

**Continuous Integration (CI):** every push is automatically built and tested.
**Continuous Delivery/Deployment (CD):** passing code is automatically deployed.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Secrets like `CLOUDFLARE_API_TOKEN` are stored in **GitHub → Settings → Secrets**, never in the file.

# Deploying to Cloudflare {#cloudflare}

**Cloudflare** runs code and serves files from data centres around the world, including several in Africa. Its free tier is generous — ideal for student and start-up projects. Global AI Academy runs on it.

| Product | Use |
|---|---|
| **Workers** | Serverless code at the edge (APIs, full-stack apps) |
| **Static assets / Pages** | Websites and single-page apps |
| **D1** | Serverless SQLite database |
| **KV** | Key-value storage |
| **R2** | File/object storage (no egress fees) |
| **Queues**, **Cron Triggers** | Background jobs and schedules |
| **Workers AI**, **Vectorize** | AI models and vector search at the edge |

```bash
npm create cloudflare@latest my-app        # scaffold a project
cd my-app
npx wrangler login
npx wrangler d1 create my-app-db           # create a database
npx wrangler d1 migrations apply my-app-db --remote
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy                        # live at https://my-app.<you>.workers.dev
```

A minimal Worker:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/hello") {
      return Response.json({ message: "Mhoro from the edge!", colo: request.cf?.colo });
    }
    return new Response("Not found", { status: 404 });
  },
};
```

# Servers and Reverse Proxies {#servers}

On a VPS you manage the server yourself:

```sketch
title: "A reverse proxy in front of your app"
caption: "The proxy answers on ports 80 and 443, handles HTTPS certificates and compression, and forwards requests to apps listening only on the inside."
cellW: 190
cellH: 100
nodes:
  - id: u
    label: "Browser"
    col: 0
    row: 0.6
    shape: person
  - id: px
    label: "Caddy / Nginx"
    col: 1.4
    row: 0.6
    shape: round
    tone: gold
    sub: ":443 · TLS"
  - id: a1
    label: "API"
    col: 2.9
    row: 0
    shape: round
    tone: sky
    sub: "localhost:8000"
  - id: a2
    label: "Static files"
    col: 2.9
    row: 1.2
    shape: round
    tone: teal
    sub: "/var/www"
edges:
  - from: u
    to: px
    label: "HTTPS"
  - from: px
    to: a1
    label: "/api"
  - from: px
    to: a2
    label: "/"
```


1. Create a server (Ubuntu LTS), add your **SSH key**, disable password login.
2. Update it: `sudo apt update && sudo apt upgrade`.
3. Set a firewall: `sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable`.
4. Run your app (Docker or a systemd service).
5. Put a **reverse proxy** in front for HTTPS and routing — **Caddy** gets certificates automatically:

```text
# /etc/caddy/Caddyfile
api.zimtraders.co.zw {
    reverse_proxy localhost:8000
}
```

6. Set up automatic security updates and backups.

# Domains and HTTPS {#domains}

1. Register a domain (for `.co.zw`, through a ZISPA-accredited registrar; for `.com`, any registrar).
2. Point its **nameservers** to your DNS provider (e.g. Cloudflare).
3. Add DNS records:

| Record | Name | Value |
|---|---|---|
| `A` | `@` | your server's IP |
| `CNAME` | `www` | `@` |
| Custom domain | `@` | your Worker/Pages project (Cloudflare does this for you) |

4. HTTPS: Cloudflare and Caddy issue certificates automatically; otherwise use Let's Encrypt with certbot.

Always redirect HTTP → HTTPS.

# Databases in Production {#databases}

- **Use managed databases** where you can (D1, Neon, Supabase, RDS) — backups and updates handled for you.
- **Migrations** run as part of deployment, before the new code goes live.
- **Backups**: automatic, regular, and **tested** — a backup you've never restored is a hope, not a backup.
- **Least privilege**: the app's database user can't drop tables.
- **Never** point development code at the production database.

# Monitoring, Releases and Rollbacks {#operations}

## Monitor

- **Uptime checks** ping your site every minute and alert you.
- **Error tracking** (Sentry or similar) captures crashes with context.
- **Logs and metrics** — request rates, error rates, latency.

## Release safely


```sketch
title: "Canary release with a quick rollback"
caption: "Send a small share of traffic to the new version, watch errors and latency, then roll forward or roll back in one step."
cellW: 175
cellH: 100
nodes:
  - id: lb
    label: "Traffic"
    col: 0
    row: 0.6
    shape: pill
    tone: sky
  - id: v1
    label: "v1 (current)"
    col: 1.5
    row: 0
    shape: round
    tone: teal
    sub: "95%"
  - id: v2
    label: "v2 (new)"
    col: 1.5
    row: 1.2
    shape: round
    tone: gold
    sub: "5%"
  - id: mon
    label: "Healthy?"
    col: 3
    row: 1.2
    shape: diamond
    tone: grape
    sub: "errors · latency"
  - id: all
    label: "Move to 100%"
    col: 4.3
    row: 0.6
    shape: pill
    tone: teal
  - id: rb
    label: "Roll back"
    col: 4.3
    row: 1.8
    shape: pill
    tone: rose
edges:
  - from: lb
    to: v1
  - from: lb
    to: v2
  - from: v2
    to: mon
  - from: mon
    to: all
    label: "yes"
  - from: mon
    to: rb
    label: "no"
```

- Deploy small changes often.
- **Feature flags** let you turn new features on gradually.
- **Canary/gradual rollouts** send a small share of traffic to the new version first.
- Keep the previous version ready: `npx wrangler rollback`, re-deploy the last good Docker tag, or revert the Git commit.

## Incident checklist

1. **Stop the bleeding** — roll back or disable the feature.
2. **Communicate** — tell users what's happening.
3. **Fix** the root cause.
4. **Review** without blame and add a test or alert so it can't recur silently.

```quiz
- q: Where should production API keys live?
  options: ["In the Git repo", "In the host's secret manager or environment variables", "In the Docker image", "In the README"]
  answer: 1
- q: What does CI do on every push?
  options: ["Deletes old branches", "Builds and tests the code automatically", "Buys a domain", "Writes documentation"]
  answer: 1
- q: What's the first thing to do when a bad deploy breaks production?
  options: ["Write a long report", "Roll back or disable the feature", "Delete the database", "Wait and see"]
  answer: 1
```

```exam
- q: "What belongs in configuration rather than code?"
  options: ["Database URLs and API keys", "Function names", "Comments", "Loop logic"]
  answer: 0
- q: "What does `docker compose up` do?"
  options: ["Starts all services defined in the compose file", "Deletes containers", "Builds a website", "Opens SSH"]
  answer: 0
- q: "Where are CI secrets like deploy tokens stored for GitHub Actions?"
  options: ["Repository secrets", "The workflow YAML", "The README", "Commit messages"]
  answer: 0
- q: "A backup you've never restored is\u2026"
  options: ["Untested \u2014 restore it to be sure", "Perfect", "Encrypted", "Unnecessary"]
  answer: 0
- q: "Which Cloudflare product is a serverless SQLite database?"
  options: ["D1", "R2", "KV", "Queues"]
  answer: 0
- q: "What is a canary release?"
  options: ["Sending a small share of traffic to the new version first", "Releasing at night", "Deleting the old version", "A bird-themed logo"]
  answer: 0
```
