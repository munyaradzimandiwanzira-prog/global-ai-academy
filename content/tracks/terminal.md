---
id: terminal
title: Terminal & Command Line
short: TERMINAL
category: tools
level: beginner
language: bash
color: "#2B2B2B"
icon: "⌨️"
order: 4
summary: Every engineer lives in the terminal. Learn to navigate folders, manage files, run programs, use pipes, environment variables, SSH and simple shell scripts.
tags: [terminal, bash, linux, command line, shell, powershell]
---

# Why the Terminal? {#intro}

The **terminal** (also called the command line, shell or console) lets you control your computer by typing commands. It looks old-fashioned, but it's how professionals:

- run and install programs (`python`, `pip`, `npm`, `git`),
- work on servers that have no screen at all,
- automate repetitive tasks in seconds.

## Opening a terminal

| System | How |
|---|---|
| **Windows** | Start → "Terminal" or "PowerShell". For Linux commands, install **Git Bash** or **WSL** (Windows Subsystem for Linux). |
| **macOS** | `Cmd+Space` → "Terminal" |
| **Linux** | `Ctrl+Alt+T` |
| **VS Code** | ``Ctrl+` `` |

This track teaches **bash/zsh** commands, used on Linux, macOS, servers, Git Bash and WSL. PowerShell equivalents are shown where they differ.

## Anatomy of a command

```bash
ls -la ~/projects
```

- `ls` — the **command** (list files)
- `-la` — **options/flags** that change its behaviour
- `~/projects` — the **argument** (what to act on)

```quiz
- q: In `ls -la ~/projects`, what is `-la`?
  options: ["The command", "Options (flags)", "The argument", "A comment"]
  answer: 1
```

# Navigating Folders {#navigation}

```bash
pwd                 # print working directory: where am I?
ls                  # list files here
ls -la              # long list, including hidden files
cd projects         # change into the "projects" folder
cd ..               # go up one level
cd ~                # go to your home folder
cd /                # go to the root of the file system
cd -                # go back to the previous folder
```

## Paths

- **Absolute path**: from the root — `/home/tariro/projects/app` (Windows: `C:\Users\Tariro\projects`).
- **Relative path**: from where you are — `projects/app`, `../notes`.
- `.` means "this folder", `..` means "the parent folder", `~` means "my home folder".

> **Tab completion:** type the first few letters of a file or folder and press **Tab**. The shell finishes it for you — faster and no typos.

```exercise
prompt: Go up one folder.
lang: bash
code: |
  cd ___
answers: [".."]
```

# Files and Folders {#files}

```bash
mkdir my-app                # make a folder
mkdir -p src/components     # make nested folders
touch notes.txt             # create an empty file (PowerShell: New-Item notes.txt)
cp notes.txt backup.txt     # copy
mv backup.txt old/          # move (also used to rename)
mv old.txt new.txt          # rename
rm notes.txt                # delete a file — there is NO recycle bin!
rm -r old/                  # delete a folder and everything in it
```

## Reading files

```bash
cat README.md        # print a whole file
less big.log         # scroll through a long file (q to quit)
head -n 5 data.csv   # first 5 lines
tail -n 20 app.log   # last 20 lines
tail -f app.log      # follow a log as it grows (Ctrl+C to stop)
```

> ⚠️ `rm -rf` deletes instantly and permanently. Double-check the path before pressing Enter. Never run `rm -rf /` or commands from the internet you don't understand.

```quiz
- q: Which command renames a file?
  options: ["rn", "mv", "cp", "rename-file"]
  answer: 1
- q: What happens to files deleted with rm?
  options: ["They go to the recycle bin", "They are deleted permanently", "They are hidden", "They are zipped"]
  answer: 1
```

# Searching and Pipes {#pipes}

## Finding things

```bash
grep "TODO" app.py              # lines containing TODO
grep -rn "api_key" src/         # search a whole folder, show line numbers
find . -name "*.py"             # all Python files below this folder
```

## Pipes: connect commands

The **pipe** `|` sends one command's output into another command:

```bash
cat sales.csv | grep "Harare" | wc -l       # how many Harare sales?
history | grep git                          # git commands you ran before
ls -la | sort -k5 -n | tail -n 3            # three biggest files
```

## Redirection

```bash
python report.py > report.txt     # save output to a file (overwrite)
echo "new line" >> log.txt        # append to a file
python app.py 2> errors.txt       # save only error messages
```

```exercise
prompt: Send the output of one command into another.
lang: bash
code: |
  cat names.txt ___ sort
answers: ["|"]
```

# Running Programs and Processes {#processes}

```bash
python main.py              # run a Python script
node server.js              # run JavaScript with Node
./build.sh                  # run a script in this folder
```

- **Ctrl+C** stops the running program.
- **Ctrl+Z** pauses it; `fg` resumes it.
- `command &` runs it in the background.

```bash
ps aux | grep python    # list running Python processes
kill 12345              # stop process number 12345
top                     # live view of CPU and memory (q to quit)
```

## Installing software

| System | Package manager |
|---|---|
| Ubuntu/Debian | `sudo apt update && sudo apt install git` |
| macOS | Homebrew: `brew install git` |
| Windows | `winget install Git.Git` |
| Python packages | `pip install requests` |
| JavaScript packages | `npm install express` |

`sudo` runs a command as the administrator — use it only when needed.

# Environment Variables and PATH {#env}

**Environment variables** are settings available to every program you start.

```bash
echo $HOME                      # your home folder
echo $PATH                      # where the shell looks for programs
export OPENAI_API_KEY="sk-..."  # set for this terminal session
python -c "import os; print(os.environ.get('OPENAI_API_KEY', 'not set')[:6])"
```

PowerShell:

```powershell
$env:OPENAI_API_KEY = "sk-..."
```

## Keep secrets out of code

Store API keys in environment variables or a `.env` file, and add `.env` to `.gitignore` so it never reaches GitHub. Leaked keys get abused within minutes — and you pay the bill.

## PATH

When you type `python`, the shell searches each folder listed in `PATH`. "Command not found" usually means the program isn't installed or its folder isn't in `PATH`.

```quiz
- q: Where should you keep API keys?
  options: ["Directly in your code", "In environment variables or an ignored .env file", "In the README", "In a public GitHub issue"]
  answer: 1
```

# Permissions, SSH and Servers {#ssh}

## File permissions (Linux/macOS)

```bash
ls -l deploy.sh          # -rw-r--r-- means not executable
chmod +x deploy.sh       # make it executable
./deploy.sh
```

## SSH: control another computer

**SSH** gives you a secure terminal on a remote server — how you manage cloud machines and Raspberry Pis.

```bash
ssh tariro@203.0.113.10                 # log in to a server
ssh-keygen -t ed25519 -C "you@email"    # create a key pair (do this once)
cat ~/.ssh/id_ed25519.pub               # your PUBLIC key — safe to share
scp report.csv tariro@server:/data/     # copy a file to the server
```

> Your **private** key (`id_ed25519`, no `.pub`) must never be shared. Treat it like a password.

# Shell Scripts {#scripts}

A **shell script** saves a list of commands to run together.

```bash
#!/usr/bin/env bash
# backup.sh — copy a project folder into a dated backup
set -euo pipefail          # stop on errors

SOURCE="${1:-$HOME/projects}"
DEST="$HOME/backups/$(date +%Y-%m-%d)"

mkdir -p "$DEST"
cp -r "$SOURCE" "$DEST"
echo "Backed up $SOURCE to $DEST"

for file in "$DEST"/*; do
  echo " - $(basename "$file")"
done
```

Run it:

```bash
chmod +x backup.sh
./backup.sh ~/projects/market-app
```

## Scheduling with cron

`crontab -e` lets you run scripts on a schedule — for example every night at 2 am:

```text
0 2 * * * /home/tariro/backup.sh >> /home/tariro/backup.log 2>&1
```

```quiz
- q: What does `chmod +x script.sh` do?
  options: ["Deletes the script", "Makes the script executable", "Copies the script", "Opens it in an editor"]
  answer: 1
- q: Which key stops a running program in the terminal?
  options: ["Ctrl+S", "Ctrl+C", "Ctrl+V", "Esc"]
  answer: 1
```

```exam
- q: "Which command shows the folder you are in?"
  options: ["ls", "pwd", "cd", "cat"]
  answer: 1
- q: "Which command creates nested folders in one go?"
  options: ["mkdir -p a/b/c", "touch a/b/c", "cd -p a/b/c", "rm -r a/b/c"]
  answer: 0
- q: "What does `>>` do in `echo hi >> log.txt`?"
  options: ["Overwrites the file", "Appends to the file", "Deletes the file", "Reads the file"]
  answer: 1
- q: "What does `grep -rn TODO src/` do?"
  options: ["Deletes TODO lines", "Searches src/ recursively for TODO and shows line numbers", "Renames files", "Counts files"]
  answer: 1
- q: "Which key in the shell completes file names?"
  options: ["Tab", "Esc", "F5", "Ctrl+Z"]
  answer: 0
```
