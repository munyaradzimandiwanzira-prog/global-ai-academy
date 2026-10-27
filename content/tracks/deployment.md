---
id: deployment
title: Deployment & DevOps
short: DEPLOY
category: engineering
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
