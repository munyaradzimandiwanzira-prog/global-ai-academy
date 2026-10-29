---
id: git
title: Git & GitHub
short: GIT
category: tools
level: beginner
language: bash
color: "#F05032"
icon: "🌳"
order: 5
summary: Track every change to your code, undo mistakes and collaborate with a team. Learn commits, branches, merging, GitHub, pull requests and a professional workflow.
tags: [git, github, version control, collaboration]
---

# What is Git? {#intro}

**Git** is a **version control system**: it records snapshots of your project over time, so you can:

- see **what** changed, **when** and **why**,
- go **back** to any earlier version,
- work on new features without breaking the working version,
- **collaborate** with other developers without overwriting each other's work.

**GitHub** (and alternatives like GitLab and Bitbucket) host Git projects online so teams can share them. Your GitHub profile also works as your **portfolio** — employers look at it.

## Install and set up

Install from **git-scm.com** (Windows: this includes Git Bash). Then tell Git who you are — once per computer:

```bash
git --version
git config --global user.name "Tariro Moyo"
git config --global user.email "tariro@example.com"
git config --global init.defaultBranch main
```

```quiz
- q: What is the main job of Git?
  options: ["Hosting websites", "Tracking changes to files over time", "Writing code for you", "Running Python"]
  answer: 1
```

# Your First Repository {#first-repo}

A **repository** (repo) is a project folder tracked by Git.

```bash
mkdir market-app && cd market-app
git init                       # start tracking this folder
echo "# Market App" > README.md
git status                     # what has changed?
git add README.md              # stage the file
git commit -m "Add README"     # save a snapshot
git log --oneline              # history
```

## The three areas



```sketch
title: "Working folder, staging area, history"
caption: "You edit files in the working folder, choose changes with git add, and save a snapshot with git commit. git push copies commits to GitHub; git pull brings other people's commits down."
cellW: 200
nodes:
  - id: wd
    label: "Working folder"
    col: 0
    row: 0
    shape: round
    tone: sky
    sub: "your edits"
  - id: st
    label: "Staging area"
    col: 1.5
    row: 0
    shape: round
    tone: gold
    sub: "next snapshot"
  - id: repo
    label: "Local history"
    col: 3
    row: 0
    shape: db
    tone: teal
    sub: "commits"
  - id: rem
    label: "GitHub"
    col: 3
    row: 1.3
    shape: db
    tone: grape
    sub: "remote"
edges:
  - from: wd
    to: st
    label: "git add"
  - from: st
    to: repo
    label: "git commit"
  - from: repo
    to: rem
    label: "git push"
```

```text
 Working folder  --git add-->  Staging area  --git commit-->  Repository (history)
 (your files)                  (next snapshot)                 (saved snapshots)
```

- **Working folder** — files as you edit them.
- **Staging area** — the changes you've chosen to include in the next commit.
- **Repository** — every commit, permanently stored.

```exercise
prompt: Stage every changed file in the current folder.
lang: bash
code: |
  git add ___
answers: ["."]
```

# Good Commits {#commits}

A **commit** is a snapshot with a message. Make commits **small** and messages **clear**.

```bash
git add src/prices.py
git commit -m "Add VAT calculation to price list"
```

| ❌ Unhelpful | ✅ Helpful |
|---|---|
| `fix` | `Fix crash when price list is empty` |
| `stuff` | `Add login form validation` |
| `final final v2` | `Update Harare market prices for March` |

Write the message as an instruction: "Add…", "Fix…", "Update…".

## Seeing changes

```bash
git diff                 # unstaged changes
git diff --staged        # staged changes
git show HEAD            # the most recent commit
git log --oneline --graph --all
```

## .gitignore

Some files should **never** be committed: secrets, installed packages, build output. List them in `.gitignore`:

```text
.env
.venv/
node_modules/
__pycache__/
dist/
*.log
```

```quiz
- q: Which file tells Git to ignore certain files?
  options: [".gitkeep", ".gitignore", "ignore.txt", ".env"]
  answer: 1
```

# Undoing Things {#undo}

| Situation | Command |
|---|---|
| Throw away unstaged changes to a file | `git restore app.py` |
| Unstage a file (keep the changes) | `git restore --staged app.py` |
| Fix the last commit message | `git commit --amend -m "Better message"` |
| Undo a pushed commit safely (adds a new commit) | `git revert <commit-id>` |
| Go back and look at an old version | `git switch --detach <commit-id>` |
| Save work-in-progress temporarily | `git stash` then later `git stash pop` |

> `git reset --hard` deletes uncommitted work permanently. Prefer `revert` for anything already shared.

# Branches {#branches}

A **branch** is a separate line of development. Build a feature on its own branch; `main` keeps working.

```sketch
title: "A feature branch"
caption: "A branch is a movable label on a commit. Work on a branch without touching main, then merge it back when it is ready."
cellW: 165
cellH: 110
nodes:
  - id: a
    label: "A"
    col: 0
    row: 0
    shape: circle
    tone: sky
  - id: b
    label: "B"
    col: 1
    row: 0
    shape: circle
    tone: sky
  - id: e
    label: "E"
    col: 3
    row: 0
    shape: circle
    tone: sky
    sub: "merge"
  - id: c
    label: "C"
    col: 1.7
    row: 1
    shape: circle
    tone: gold
  - id: d
    label: "D"
    col: 2.4
    row: 1
    shape: circle
    tone: gold
  - id: m
    label: "main"
    col: 4
    row: 0
    shape: note
    tone: teal
  - id: f
    label: "feature"
    col: 3.3
    row: 1
    shape: note
    tone: gold
edges:
  - from: a
    to: b
  - from: b
    to: e
  - from: b
    to: c
  - from: c
    to: d
  - from: d
    to: e
  - from: m
    to: e
    dashed: true
  - from: f
    to: d
    dashed: true
```



```bash
git branch                       # list branches
git switch -c feature/login      # create and switch to a new branch
# ...edit and commit...
git switch main                  # go back to main
git merge feature/login          # bring the feature into main
git branch -d feature/login      # delete the merged branch
```

```text
main:      A---B-----------E   (merge)
                \         /
feature/login:   C-------D
```

## Merge conflicts

If two branches change the **same lines**, Git asks you to decide:

```text
<<<<<<< HEAD
price = 8.50
=======
price = 8.00
>>>>>>> feature/discount
```

Edit the file to keep the right version, remove the markers, then `git add` and `git commit`. VS Code shows **Accept Current / Accept Incoming / Accept Both** buttons to make this easier.

```exercise
prompt: Create a new branch called feature/search and switch to it.
lang: bash
code: |
  git switch ___ feature/search
answers: ["-c"]
```

# GitHub and Remotes {#github}

A **remote** is a copy of your repository on a server like GitHub.

1. Create a free account at **github.com**.
2. Click **New repository**, name it, and leave it empty.
3. Connect and push:

```bash
git remote add origin https://github.com/tariro/market-app.git
git push -u origin main        # upload; -u remembers the link
```

Day to day:

```bash
git pull        # download others' changes
git push        # upload your commits
git clone https://github.com/someone/project.git   # copy someone's repo
```

## Authentication

GitHub doesn't accept your account password for Git. Use either:

- **GitHub CLI**: `gh auth login` (easiest), or
- **SSH keys**: add your public key at GitHub → Settings → SSH keys, then use `git@github.com:...` URLs.

# Pull Requests and Teamwork {#pull-requests}

Professional teams don't push straight to `main`. They use **pull requests (PRs)**:

```sketch
title: "The pull request flow"
caption: "Push a branch, open a pull request, let checks and a reviewer look at it, fix what they find, and merge into main."
cellW: 185
nodes:
  - id: br
    label: "Push branch"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: pr
    label: "Open PR"
    col: 1.3
    row: 0
    shape: round
    tone: gold
  - id: ci
    label: "CI + review"
    col: 2.6
    row: 0
    shape: diamond
    tone: grape
  - id: fix
    label: "Push fixes"
    col: 2.6
    row: 1.3
    shape: round
    tone: rose
  - id: mg
    label: "Merge to main"
    col: 3.9
    row: 0
    shape: pill
    tone: teal
edges:
  - from: br
    to: pr
  - from: pr
    to: ci
  - from: ci
    to: mg
    label: "approved"
  - from: ci
    to: fix
    label: "changes"
  - from: fix
    to: ci
    bend: -40
```


1. Create a branch: `git switch -c fix/empty-cart`.
2. Commit your changes and push the branch: `git push -u origin fix/empty-cart`.
3. On GitHub, open a **Pull Request** describing *what* and *why*.
4. Teammates **review** the code and comment.
5. Automated checks (tests) run.
6. Once approved, **merge** into `main`.

## Contributing to open source

1. **Fork** the project (your own copy on GitHub).
2. Clone your fork, branch, commit, push.
3. Open a PR to the original project.

Look for issues labelled **good first issue**. Contributing to open source is one of the best ways for a Zimbabwean developer to build a global reputation.

```quiz
- q: What is a pull request?
  options: ["Downloading code with git pull", "A request to merge a branch, with review", "Deleting a repository", "A bug report"]
  answer: 1
- q: What does forking a repository do?
  options: ["Deletes it", "Makes your own copy on GitHub", "Merges two branches", "Creates a tag"]
  answer: 1
```

# Professional Workflow {#workflow}

A simple, reliable workflow for small teams (often called **GitHub Flow**):

1. `main` is always deployable.
2. Every change happens on a short-lived branch.
3. Open a PR early; push often.
4. Automated tests run on every PR (GitHub Actions).
5. Review, merge, deploy.

## Useful extras

```bash
git tag v1.0.0 && git push --tags      # mark a release
git blame app.py                       # who last changed each line
git log -S "VAT"                       # find commits that added/removed "VAT"
```

## Your GitHub profile as a CV

- Pin your 4–6 best projects.
- Give every project a **README** with a screenshot, what it does, and how to run it.
- Commit regularly — consistent activity shows discipline.

```quiz
- q: In GitHub Flow, what should always be true about main?
  options: ["It is empty", "It is always deployable", "Only the boss commits to it", "It has no tests"]
  answer: 1
- q: Which command uploads your commits to GitHub?
  options: ["git pull", "git push", "git fetch", "git upload"]
  answer: 1
```

```exam
- q: "Which command shows what has changed but isn't committed?"
  options: ["git log", "git status", "git push", "git clone"]
  answer: 1
- q: "What does `git commit` save?"
  options: ["Only unstaged changes", "The staged changes as a snapshot", "Everything on your computer", "Your password"]
  answer: 1
- q: "How do you safely undo a commit that's already been pushed?"
  options: ["git reset --hard", "git revert <commit>", "Delete the repo", "git stash"]
  answer: 1
- q: "What causes a merge conflict?"
  options: ["Two branches changing the same lines", "A slow internet connection", "Too many files", "A missing README"]
  answer: 0
- q: "Which file should list .env and node_modules/?"
  options: [".gitignore", "package.json", "README.md", ".env"]
  answer: 0
```
