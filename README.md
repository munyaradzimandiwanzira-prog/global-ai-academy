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

**Cambridge tab: English as a Second Language with Zuva** (`/cambridge`, `/cambridge/esl`)
- A 36-week scheme (`shared/esl-curriculum.ts`) in 8 bands for ages 2–20, mapped to Cambridge English levels (Pre A1 Starters to B2 First; our own mapping, not endorsed by Cambridge). Weeks 1–4 are free; weeks 5–36 need Plus.
- 11 game types built per band and week (`shared/esl.ts`: echo, say, pick, sound-out, rhyme, spell, sentence train, gap fill, story, talk, write) with pictures, Zuva's voice (British or American) and the microphone (OpenAI transcription, never stored).
- **Zuva the English tutor** (`worker/esl/`): an agent mode (`mode: 'esl'`) with age-tuned personas (joyful early-years style for 2–6), 13 MCP-style tools (`worker/esl/mcp.ts`: learner profile and patterns, next activity, make a game, pronounce, mark writing, stories from Aesop (Project Gutenberg) and Simple English Wikipedia, notes for the teacher, preferences, sign-up), and layered memory: working (the screen and last messages), episodic (sittings and their summaries), semantic (profile and memories) and skill (mastery per skill, Leitner spaced review per word, enjoyment per game; `worker/esl/model.ts`).
- Guard rails: data fencing against prompt injection, a taint rule (after reading the web, no notes, settings or memories can change in that turn), blocklist plus moderation on everything generated, kids safety mode for under-13s, cost caps on voice and pictures.
- Teachers see an English panel per learner (mastery, struggles, pace, enjoyment, tricky words, Zuva's notes and a weekly summary), never the chats; teacher Zuva has an `esl_progress` tool.
- **Portuguese help** (`shared/esl-pt.ts`, Mozambican Portuguese): a learner setting that explains instructions, gives meanings after a try or as a hint (counted like a hint by the learner model), speaks Portuguese, and adds Sound Twins (minimal pairs), False Friends and Fix It for Portuguese speakers. Course sentences are translated once on the server, found by game and position (never free text), cached and safety-checked. Teachers see how often each learner uses it and whether that is falling. All Portuguese is marked AI-translated until a Portuguese-speaking teacher reviews it.

**Cambridge Maths with Zuva** (`/cambridge/maths`, `shared/maths.ts`, `worker/maths/`)
- Stages 1–6 (about ages 5–11) across Number, Geometry and measure, Statistics and probability, with Thinking and Working Mathematically in "Convince me" puzzles. Our own mapping to Cambridge Primary Mathematics, not endorsed by Cambridge. Units 1–2 of each stage are free.
- Seven game types (Quick Maths keypad, Pick It with clocks, shapes, charts, fractions and arrays, Number Line, Build the Number, Fraction Bars, Story Problems with bar models, Convince Me). Questions come from seeded generators, never from a language model, so every answer is correct and every practice round is fresh. Answers accept 0,5 and 0.5 and equivalent fractions.
- The same learner-model engine as English (`worker/esl/model.ts`, `course = 'maths'`, separate `maths_*` tables), a maths Zuva mode with its own tools (practice, next activity, reasoning feedback, teacher notes), Portuguese help, and a maths panel for teachers.

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
- **Teacher portal (`/teach`):** invite links, codes and QR codes (`/join/:code`); learners join free, or pick listed teachers at sign-up. A roster of every linked learner with search, filters and CSV export, and a page per learner (courses, Kids Zone stages, assignments, activity).
- **Zuva for teachers:** a separate teacher agent (`mode: 'teacher'`) with its own prompt and tools scoped to that teacher's learners. It writes learner reports (pain points with evidence, next steps with real links, a parent note), timed lesson plans grounded on the course content (edit and print at `/teach/plans/:id`), and assignment drafts that are only sent when the teacher presses Assign. Learners' private Zuva chats are never shown to teachers.
- **Assign anything:** a lesson, a Kids Zone level, a code task or a written task, to a class or chosen learners. Learners get an in-app notification (header bell) and an email; lesson and Kids work ticks off by itself.
- **Teacher wallets:** each paid plan credits the learner's teachers with a commission (default 10%, set in Admin → Finance), split equally. Teachers ask for a payout (EcoCash, OneMoney, InnBucks or bank; from $5, one request at a time) from their wallet; admins see the queue in Admin → Finance, send the money, then mark it paid with the reference, which writes the payout to the ledger and tells the teacher. Admins can also record adjustments and reassign any payment's commission; all of it is a ledger, never edited in place.
- **Capstones:** Academy learners plan, build and submit; their teacher reviews, grades and signs off (+300 XP).
- **Admin:** finance (MRR, revenue by month and plan, commission owed, manual payments, payouts, overrides), anonymous traffic (pages, sources, countries, devices; no cookies), users and a full record per learner, teachers (open any teacher's portal read-only with `?teacher=<id>`), teacher requests, classrooms, payments, promo codes, scholarships, Premium waitlist, announcements, contact inbox, a data explorer (create, read, update and delete any row; secrets hidden; every change audited) and the audit log.

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

Teaching, money, payouts and admin console end to end (88 checks), against the built worker with the local OpenAI mock:

```bash
npm run build && bash scripts/dev-mock.sh   # wrangler dev on :8787 with a scripted OpenAI mock
node tests/e2e-teaching.mjs
```

The English course end to end (43 checks: gating, the learner model, voice and pictures, Zuva's English tools and taint guard, teacher notes and reports), same setup:

```bash
node tests/e2e-esl.mjs
node tests/e2e-maths-pt.mjs   # 35 checks: Portuguese help and Cambridge Maths
```

Every page (689 public pages, at phone and desktop width) for console errors, failed requests, error screens and sideways scrolling:

```bash
npx tsx scripts/list-urls.ts > /tmp/urls.txt
node tests/e2e-crawl.cjs /tmp/urls.txt /tmp/crawl.json 390
```

Real browser flows (43: sign-up by invite, lessons, runners, quizzes, games, Zuva, teacher tools, payouts, admin forms, trial, projects, Graph Lab, challenges, class discussion and live sessions, two-step login, data export, account deletion), a click-everything test of interactive pages, and malformed input to every API route (no 5xx allowed):

```bash
node tests/e2e-ui.cjs && node tests/e2e-ui-2.cjs
node tests/e2e-fuzz.cjs /tmp/fuzz-urls.txt - 390        # games, labs, editors, quizzes
node tests/e2e-api-fuzz.mjs routes.json admin-cookie.json
```

## Deploy

See **[DEPLOY.md](DEPLOY.md)**.
