---
id: vscode
title: VS Code
short: VS CODE
category: tools
level: beginner
language: text
color: "#007ACC"
icon: "🧑‍💻"
order: 2
summary: Visual Studio Code is the most popular code editor in the world. Install it, learn the interface, shortcuts, extensions, the terminal, debugging, Git and AI assistants.
tags: [vscode, editor, ide, tools, setup, debugging]
---

# What is VS Code? {#intro}

**Visual Studio Code** (VS Code) is a free code editor made by Microsoft. It runs on Windows, macOS and Linux and works with almost every programming language through **extensions**.

Why most developers use it:

- **Free and fast**, even on older laptops.
- **IntelliSense** — smart auto-complete and inline documentation.
- **Built-in terminal**, debugger and Git.
- **Thousands of extensions** for Python, web, Java, Flutter, Docker, AI and more.
- Works **offline** — useful when your connection is unreliable.

> **Editor vs IDE:** An *editor* edits text; an *IDE* (Integrated Development Environment) adds building, running and debugging. With extensions, VS Code works like a light IDE for most languages.

```quiz
- q: How does VS Code support many programming languages?
  options: ["It only supports Python", "Through extensions", "By buying licences", "It converts everything to JavaScript"]
  answer: 1
```

# Installing VS Code {#install}

1. Go to **code.visualstudio.com** and download the installer for your system.
2. **Windows:** run the installer. On the *Select Additional Tasks* screen tick:
   - ✅ **Add "Open with Code" action** to the file and folder context menus,
   - ✅ **Add to PATH** (lets you type `code .` in a terminal).
3. **macOS:** open the downloaded `.zip`, drag **Visual Studio Code** into **Applications**. Then open VS Code, press `Cmd+Shift+P`, type **shell command** and choose **Install 'code' command in PATH**.
4. **Linux (Ubuntu/Debian):** download the `.deb` and install it with your software centre, or run `sudo apt install ./code_*.deb`.

## Low on data?

The installer is about 100 MB. Download it once (on Wi-Fi at school, a library or a hub), keep it on a flash drive and share it with classmates — it's free software.

## Check it works

Open a terminal and type:

```bash
code --version
```

```exercise
prompt: Complete the command that opens the current folder in VS Code from a terminal.
lang: bash
code: |
  code ___
answers: ["."]
```

# The Interface {#interface}

```text
┌───┬──────────────┬─────────────────────────────────────┐
│ A │  B Sidebar   │  C Editor (tabs, split views)       │
│ c │  Explorer    │                                     │
│ t │  Search      │                                     │
│ i │  Source Ctrl │                                     │
│ v │  Run & Debug ├─────────────────────────────────────┤
│ i │  Extensions  │  D Panel: Terminal, Problems, Output│
│ t │              │                                     │
│ y ├──────────────┴─────────────────────────────────────┤
│   │  E Status bar: branch, errors, language, Python env │
└───┴────────────────────────────────────────────────────┘
```

| Part | What it's for |
|---|---|
| **Activity Bar** (far left icons) | Switch between Explorer, Search, Source Control, Run & Debug, Extensions |
| **Sidebar** | The selected view — usually your files (Explorer) |
| **Editor** | Where you write code. Drag tabs to split the screen |
| **Panel** | Terminal, Problems (errors), Output, Debug Console |
| **Status bar** | Current Git branch, errors/warnings, language mode, Python version |

## Open a folder, not just a file

Always use **File → Open Folder…** for your project. VS Code then knows about all your files, your Git repository and your settings.

```quiz
- q: Where do you see errors and warnings for your project?
  options: ["The Problems panel", "The Extensions view", "The title bar", "The minimap"]
  answer: 0
```

# Essential Shortcuts {#shortcuts}

Learning a few shortcuts saves hours. (On a Mac use **Cmd** where Windows/Linux use **Ctrl**.)

| Action | Windows / Linux | macOS |
|---|---|---|
| **Command Palette** — find any command | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Quick open a file by name | `Ctrl+P` | `Cmd+P` |
| Toggle the terminal | ``Ctrl+` `` | ``Ctrl+` `` |
| Toggle the sidebar | `Ctrl+B` | `Cmd+B` |
| Save | `Ctrl+S` | `Cmd+S` |
| Find / replace in file | `Ctrl+F` / `Ctrl+H` | `Cmd+F` / `Cmd+Option+F` |
| Search in all files | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Comment / uncomment line | `Ctrl+/` | `Cmd+/` |
| Move line up/down | `Alt+↑/↓` | `Option+↑/↓` |
| Copy line up/down | `Shift+Alt+↑/↓` | `Shift+Option+↑/↓` |
| Select next match (multi-cursor) | `Ctrl+D` | `Cmd+D` |
| Add a cursor | `Alt+Click` | `Option+Click` |
| Go to definition | `F12` | `F12` |
| Rename a symbol everywhere | `F2` | `F2` |
| Format document | `Shift+Alt+F` | `Shift+Option+F` |

> If you remember only one shortcut, make it the **Command Palette**. Every feature in VS Code can be found from there by typing its name.

```quiz
- q: Which shortcut opens the Command Palette on Windows?
  options: ["Ctrl+P", "Ctrl+Shift+P", "Ctrl+B", "Alt+F4"]
  answer: 1
- q: What does Ctrl+D (Cmd+D) do?
  options: ["Deletes the line", "Selects the next occurrence of the selection", "Duplicates the file", "Opens the debugger"]
  answer: 1
```

# Extensions {#extensions}

Open the **Extensions** view (`Ctrl+Shift+X` / `Cmd+Shift+X`), search, and click **Install**.

## Recommended starter set

| Extension | Why |
|---|---|
| **Python** (Microsoft) | Run, lint and debug Python; includes Pylance for smart completion |
| **Jupyter** | Run notebooks (`.ipynb`) for data science and AI |
| **Live Server** | Instantly preview HTML/CSS with auto-refresh |
| **Prettier** | Automatically formats JS, HTML, CSS, JSON, Markdown |
| **ESLint** | Finds bugs in JavaScript/TypeScript |
| **GitLens** | See who changed each line and why |
| **Error Lens** | Shows errors right on the line |
| **Docker** | Manage containers (later tracks) |
| **Extension Pack for Java** | Java development |
| **Kotlin** / **Flutter** | Mobile development |

> Only install extensions from well-known publishers with many downloads. Extensions can read your files.

## Profiles

Use **Profiles** (gear icon → Profiles) to keep separate setups — for example a light "Python" profile and a "Web" profile — so VS Code stays fast.

# Settings and Themes {#settings}

Open **Settings** with `Ctrl+,` (`Cmd+,`). Useful ones:

| Setting | Suggested value |
|---|---|
| Editor: Format On Save | ✅ on |
| Files: Auto Save | `afterDelay` |
| Editor: Font Size | 15–16 |
| Editor: Word Wrap | `on` |
| Editor: Tab Size | 4 for Python, 2 for web |
| Workbench: Color Theme | try *Dark Modern* or *Light Modern* |

## settings.json

Every setting can be written in JSON. Open it via the Command Palette → **Preferences: Open User Settings (JSON)**:

```json
{
  "editor.formatOnSave": true,
  "files.autoSave": "afterDelay",
  "editor.fontSize": 15,
  "editor.wordWrap": "on",
  "[python]": { "editor.tabSize": 4 },
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

Project-specific settings go in a `.vscode/settings.json` file inside the project folder, so your whole team shares them.

## Settings Sync

Sign in with GitHub or Microsoft (accounts icon, bottom-left) and turn on **Settings Sync** to get the same setup on every computer.

# The Integrated Terminal {#terminal}

Press ``Ctrl+` `` to open a terminal **inside** VS Code, already in your project folder.

```bash
python --version
python main.py
pip install requests
git status
npm run dev
```

- Click **+** to open more terminals; use the dropdown to pick PowerShell, Command Prompt, Git Bash, zsh or bash.
- **Split** the terminal to run a server in one and commands in the other.
- `Ctrl+C` stops a running program.

See the **[Terminal & Command Line](/learn/terminal)** track to master the commands themselves.

# Python in VS Code {#python}

1. Install **Python** (python.org) and the **Python** extension.
2. Open your project folder.
3. Create a virtual environment: Command Palette → **Python: Create Environment** → **Venv**. VS Code creates `.venv` and selects it.
4. Check the **status bar** shows your `.venv` interpreter. Change it with **Python: Select Interpreter**.
5. Open `main.py` and press the ▶ **Run** button (top-right), or `F5` to debug.

```python
# main.py
def greet(name: str) -> str:
    return f"Mhoro, {name}!"

if __name__ == "__main__":
    print(greet("Tariro"))
```

## Jupyter notebooks

Create a file ending in `.ipynb`. You get cells you can run one at a time — the standard tool for data science and AI experiments. Choose your `.venv` as the **kernel** (top-right).

```exercise
prompt: Complete the command that creates a virtual environment called .venv.
lang: bash
code: |
  python -m ___ .venv
answers: [venv]
```

# Web Development in VS Code {#web}

1. Install **Live Server** and **Prettier**.
2. Create `index.html`, type `!` and press **Tab** — that's **Emmet**, which expands abbreviations into HTML.
3. Right-click the file → **Open with Live Server**. The page reloads every time you save.

## Emmet shortcuts

| Type | Press Tab to get |
|---|---|
| `!` | Full HTML skeleton |
| `ul>li*3` | A list with three items |
| `div.card` | `<div class="card"></div>` |
| `a:link` | `<a href="http://"></a>` |
| `p{Hello}` | `<p>Hello</p>` |

## Browser DevTools

Press **F12** in your browser to inspect elements, edit CSS live, read console errors and simulate phone screens (the device toolbar).

# Debugging {#debugging}

Debugging means stepping through code to find out **why** it behaves the way it does.

1. Click in the margin left of a line number to add a **breakpoint** (a red dot).
2. Press **F5** (Run → Start Debugging) and pick your language.
3. The program stops at the breakpoint. Now you can:
   - see every variable in the **Variables** panel,
   - hover over a variable to see its value,
   - type expressions in the **Debug Console**.
4. Use the debug toolbar:

| Button | Key | Does |
|---|---|---|
| Continue | `F5` | Run to the next breakpoint |
| Step Over | `F10` | Run the current line |
| Step Into | `F11` | Go inside the function being called |
| Step Out | `Shift+F11` | Finish the current function |
| Stop | `Shift+F5` | End debugging |

> **Conditional breakpoints:** right-click a breakpoint → *Edit Breakpoint* → enter a condition like `i == 50` to stop only when it matters.

```quiz
- q: Which key steps over the current line while debugging?
  options: ["F5", "F10", "F11", "F12"]
  answer: 1
- q: What is a breakpoint?
  options: ["A syntax error", "A marked line where the debugger pauses", "A broken extension", "The end of a file"]
  answer: 1
```

# Git in VS Code {#git}

VS Code has Git built in (install Git from **git-scm.com** first).

1. Open the **Source Control** view (`Ctrl+Shift+G`).
2. Click **Initialize Repository** (or **Publish to GitHub** to create the repo online too).
3. Changed files appear under **Changes**. Click **+** to **stage** them.
4. Type a message and press **Commit**.
5. Press **Sync** to push and pull with GitHub.

The status bar shows your current **branch**; click it to switch or create branches. Clicking a changed file shows a **diff** — the old and new versions side by side.

Learn the details in the **[Git & GitHub](/learn/git)** track.

# AI Assistants in VS Code {#ai-assistants}

AI coding assistants suggest code, explain errors and write tests. Popular options include **GitHub Copilot** (free tier available, and free for verified students), **Continue** (open source, can use local models with Ollama), and other assistant extensions.

## Use AI the smart way while learning

- **Write it yourself first.** Use AI to check, explain or improve — not to skip the thinking.
- **Ask "why".** "Explain this error" teaches more than "fix this".
- **Read every line** it generates. AI can be confidently wrong and sometimes suggests insecure code.
- **Never paste secrets** (API keys, passwords) into AI chats.
- In graded work, follow your teacher's rules about AI use.

## Remote and cloud development

- **Remote - SSH**: edit code on a server or Raspberry Pi as if it were local.
- **Dev Containers**: develop inside a Docker container with all tools pre-installed.
- **vscode.dev / github.dev**: VS Code in the browser — press `.` on any GitHub repository.

```quiz
- q: What is the best way to use an AI assistant while you're learning?
  options: ["Let it write everything", "Try first, then use it to explain and review", "Never read its suggestions", "Paste your passwords so it can help"]
  answer: 1
- q: Which shortcut opens Source Control?
  options: ["Ctrl+Shift+G", "Ctrl+Shift+X", "Ctrl+Shift+D", "Ctrl+Shift+E"]
  answer: 0
```

```exam
- q: "What should you open in VS Code to work on a project?"
  options: ["A single file", "The project folder", "A zip file", "The Recycle Bin"]
  answer: 1
  explain: "Open Folder gives VS Code the full project context."
- q: "Which view installs extensions?"
  options: ["Explorer", "Extensions (Ctrl+Shift+X)", "Run and Debug", "Search"]
  answer: 1
- q: "Where do project-specific settings live?"
  options: [".vscode/settings.json", "C:/Windows", "package-lock.json", "README.md"]
  answer: 0
- q: "What does F12 do on a function name?"
  options: ["Deletes it", "Goes to its definition", "Runs the file", "Opens the terminal"]
  answer: 1
- q: "Which Python extension feature selects your virtual environment?"
  options: ["Python: Select Interpreter", "Format Document", "Toggle Sidebar", "Live Server"]
  answer: 0
```
