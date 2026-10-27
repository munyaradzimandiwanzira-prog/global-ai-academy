# Global AI Academy

A hands-on AI and software engineering school for Zimbabwean learners, from a child's first loop to lead AI platform engineer. It follows the W3Schools model (a tutorial with a live editor on every page, plus references, exercises, quizzes and certificates) and adds AI coaching, teacher-led classrooms and an animated Kids Zone.

**Contact:** munyaradzimandiwanzira@gmail.com · WhatsApp +263 77 977 9062 · 7 Kenilworth Avenue, Highlands, Harare

## What is in it

**Learn (free for everyone)**
- **36 tracks, 346 lessons:** Python, Java, Kotlin, PHP, C++, JavaScript/TypeScript, React, HTML/CSS, SQL, data science, ML, prompt engineering, LLM APIs, Hugging Face, LangChain, RAG, guardrails, AI agents and workflows, MLOps, backend, networking, deployment, security, Android, iOS, mechatronics, plus VS Code, other IDEs, terminal and Git.
- **Live editors** with no install: Python (Pyodide), JavaScript, TypeScript, HTML/CSS and SQL (sample "Zim Traders" database) run in the browser. Java, Kotlin, C++, PHP, Go and more run through Judge0 when it is configured.
- **W3Schools-style practice:** references for Python, JavaScript, HTML, CSS, SQL and Git (138 runnable examples, all verified), exercises, scored quizzes per track, 46 code challenges with a challenge of the week, online editors at `/compiler/:lang`, and a "Where to start" pathfinder.
- **Coach Zuva** gives three levels of hints on a failed challenge without handing over the answer.
- **Kids Zone:** Zuva's journey across Zimbabwe, with 8 games (Robo Maze, Bug Hunt, Turtle Art, Pixel Painter, Binary Bulbs, Circuit Lab, Math Sprint, STEM Safari). It has drawn art, sound and read-aloud, and needs no account.

**Plans** (`shared/config.ts`; yearly billing is 10 months for 12)

| Plan | Monthly | Yearly | Adds |
|---|---|---|---|
| Free | $0 | $0 | Everything above, 15 AI hints a day, 3 saved projects |
| Plus | $35 | $350 | Professor Zuva AI tutor, goals, certificates, shareable projects, 150 AI requests a day |
| Academy | $55 | $550 | Classrooms, live sessions, graded assignments, mentor-reviewed capstone, 400 AI requests a day |
| Premium (coming soon) | $400 | $4,000 | 1:1 mentorship, small cohort, GPU credits, placement support. Shown with a waitlist. |

- A one-off **7-day Plus trial** per account.
- **Promo codes** (percentage, scoped to plan and billing period, with use limits and expiry; a 100% code activates the plan without payment).
- **Scholarships** granted by admins.
- **Paynow** checkout (EcoCash, OneMoney, cards). Prices are always calculated on the server.

**Teach and run the school**
- Roles: student, teacher, admin, enforced on the server (`shared/rbac.ts`), plus plan-based permissions.
- **Classrooms:** join codes, assignments with AI-drafted briefs and AI pre-marking, announcements, discussion, class insights.
- **Live sessions:** Zoom, Meet or Teams links on learners' dashboards. After class the teacher pastes notes and AI writes the recap: where the class stopped and what to do next.
- **AI learner reports:** strengths, gaps with evidence, and a two-week plan for each learner, private to teachers.
- **Capstones:** Academy learners plan, build and submit; their teacher reviews, grades and signs off (+300 XP).
- **Admin:** users and roles, teacher requests, classrooms, payments, promo codes, scholarships, Premium waitlist (CSV export), announcements, contact inbox and audit log.

**Design:** the brand is navy ink on Great Zimbabwe granite, with teal for actions and gold for Zuva. The site uses self-hosted Bricolage Grotesque, Inter and JetBrains Mono (Fredoka in the Kids Zone), a pill-shaped button system (`src/components/ui/Button.tsx`) and drawn track marks instead of emoji. The homepage idea is a dry-stone wall of real tracks, laid course by course from the Kids Zone ground up to lead engineer. The rules come from the `premium-frontend` skill.

## Run locally

```bash
npm install
npm run db:migrate:local
npm run dev                # http://localhost:5173
```

Create `.dev.vars` (copy `.dev.vars.example`) to add your OpenAI key locally. In development, when no email provider is set, the verification and reset links are returned to the browser so you can test those flows.

## Project layout

| Path | What lives there |
|---|---|
| `content/tracks/*.md` | Curriculum. One Markdown file per track. |
| `src/` | React app: pages, lesson renderer, code runners, editor, Kids Zone, references (`src/data/references.ts`) |
| `worker/` | Cloudflare Worker API built with Hono: auth, progress, AI, classrooms, exams, payments, admin |
| `shared/` | Code shared by both sides: plans and pricing, RBAC, zod schemas, content types |
| `migrations/` | D1 (SQLite) schema |
| `plugins/` | Vite plugin that compiles the Markdown curriculum |
| `tests/`, `scripts/` | Unit tests and content checks (every runnable example and challenge solution is verified) |

## Writing lessons

Each `# Heading {#slug}` in a track file starts a lesson. Fenced blocks become interactive:

````markdown
```python run title="Try it"
print("Mhoro!")
```

```exercise
prompt: Fill the blank to show text.
code: |
  ___("Hello")
answers: [print]
```

````challenge
id: unique-id
title: Pocket money
prompt: |
  Print 7.
starter: |
  print(0)
expectedOutput: "7"
````

```quiz
- q: Which keyword handles errors?
  options: [catch, except, rescue]
  answer: 1
```
````

- **`challenge` validation:** use `expectedOutput` or `tests` (Python asserts / JS checks).
- **Exam questions:** an `exam` block holds extra certification questions. Its answers never reach the browser.

Check content with:

```bash
npx tsx scripts/check-content.ts
```

## Checks

```bash
npm run typecheck && npm test && npm run build   # 85 unit tests: content, runners, security, pricing, RBAC, games
```

End-to-end API checks against a running dev server (38 checks: sign-up, RBAC, CSRF, trial, projects and sharing, waitlist, promo codes, scholarships, classrooms, live sessions, capstones):

```bash
npm run dev
npx wrangler d1 execute global_ai_academy --local --command "DELETE FROM rate_limits"
node tests/e2e-api.mjs
```

## Deploy

See **[DEPLOY.md](DEPLOY.md)**.
