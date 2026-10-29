---
id: start-here
title: Start Here
short: START
category: start
level: beginner
language: python
color: "#D4A64A"
icon: "🧭"
order: 1
summary: New to coding? Learn what programming is, how computers follow instructions, how the internet works, and how to learn effectively on this platform.
tags: [beginner, programming, computers, internet, how to learn]
---

# Welcome to Global AI Academy {#welcome}

Mhoroi, Salibonani, welcome! This short track takes you from "I have never coded" to running your first programs. It takes about an hour.

Every lesson on this site follows the same pattern:

1. **Read** a short explanation.
2. **Try it yourself** — press the green button under any example to run and change the code. Nothing can break.
3. **Practise** with a quick exercise and, in many lessons, a coding challenge that checks your answer automatically.

> **Tip:** Learning to code is like learning to drive a kombi through Harare traffic — reading about it helps, but you only get good by doing it. Type the examples yourself instead of only reading them.

## Your first program

Below is a real Python program. Press **Try it yourself**, then press **Run**.

```python run title="Say hello"
print("Mhoro, Zimbabwe!")
print("I am learning to code.")
```

Now change the words inside the quotes and run it again. Congratulations — you are programming.

## What you will find here

| Area | What it teaches |
|---|---|
| Tutorials | Step-by-step lessons for 30+ technologies |
| Exercises | Quick fill-in-the-blank checks |
| Challenges | Small coding problems with automatic tests |
| Coach Zuva | AI hints when your code doesn't work |
| Career paths | Which tracks to take for jobs like AI Engineer or Android Engineer |

```quiz
- q: What should you do with the examples in each lesson?
  options: ["Only read them", "Run and change them yourself", "Copy them to paper", "Skip them"]
  answer: 1
  explain: You learn fastest by running code and changing it to see what happens.
```

# What is programming? {#what-is-programming}

A **program** is a list of instructions that a computer follows exactly, one after another. **Programming** (or **coding**) is writing those instructions.

```sketch
title: "From your code to a result"
caption: "You write instructions in a language people can read. An interpreter or compiler turns them into the simple steps a processor can carry out, one after another."
cellW: 175
nodes:
  - id: code
    label: "Your code"
    col: 0
    row: 1
    shape: doc
    tone: sky
    sub: "print(\"Mhoro\")"
  - id: tr
    label: "Interpreter / compiler"
    col: 1.3
    row: 1
    shape: round
    tone: grape
    sub: "translates"
  - id: mc
    label: "Machine instructions"
    col: 2.6
    row: 1
    shape: box
    sub: "tiny numbered steps"
  - id: cpu
    label: "CPU"
    col: 3.8
    row: 1
    shape: circle
    tone: gold
  - id: out
    label: "Output"
    col: 3.8
    row: 2.3
    shape: pill
    tone: teal
    sub: "Mhoro"
edges:
  - from: code
    to: tr
  - from: tr
    to: mc
  - from: mc
    to: cpu
    label: "runs"
  - from: cpu
    to: out
```


Computers are very fast but not clever on their own: they do *exactly* what you say, even when it is silly. If a recipe for sadza said "add water" but forgot "boil it", a computer would serve you cold maize meal.

## Instructions run in order

```python run title="Order matters"
print("1. Fill the pot with water")
print("2. Boil the water")
print("3. Add mealie-meal slowly while stirring")
print("4. Serve with relish")
```

## Programming languages

People write programs in **programming languages**. Each has its own rules (called **syntax**) but they share the same big ideas:

- **Python** — easy to read; used for AI, data and automation.
- **JavaScript** — runs in every web browser.
- **HTML & CSS** — describe and style web pages.
- **SQL** — asks questions of databases.
- **Java & Kotlin** — banks, big systems and Android apps.
- **Swift** — iPhone apps.
- **C++** — games, robots and microcontrollers.

You don't need to learn them all. Pick one (we suggest Python) and the others become much easier later.

```exercise
prompt: Complete the instruction so Python prints a greeting.
code: |
  ___("Hello!")
answers: [print]
hint: The command that shows text on the screen starts with "p".
```

```quiz
- q: What is a program?
  options: ["A TV show", "A list of instructions a computer follows", "A type of computer", "A website"]
  answer: 1
- q: What do we call the rules of a programming language?
  options: ["Grammar points", "Syntax", "Spelling", "Laws"]
  answer: 1
  explain: Syntax is the set of rules for how code must be written.
```

# How computers work {#how-computers-work}

Every computer — a laptop, a phone, even a smart TV — has the same main parts:

```sketch
title: "Every computer, from a phone to a server"
caption: "Input goes in, the CPU works on data held in fast memory (RAM), slow storage keeps it when the power is off, and results come out."
cellW: 180
nodes:
  - id: in
    label: "Input"
    col: 0
    row: 1
    shape: pill
    tone: sky
    sub: "keyboard · touch · mic"
  - id: cpu
    label: "CPU"
    col: 1.4
    row: 1
    shape: circle
    tone: gold
    sub: "does the work"
  - id: ram
    label: "Memory (RAM)"
    col: 1.4
    row: 0
    shape: db
    tone: teal
    sub: "fast, forgets"
  - id: disk
    label: "Storage"
    col: 1.4
    row: 2.2
    shape: db
    sub: "SSD · keeps files"
  - id: out
    label: "Output"
    col: 2.8
    row: 1
    shape: pill
    tone: sky
    sub: "screen · speaker"
edges:
  - from: in
    to: cpu
  - from: cpu
    to: ram
    label: "read / write"
    arrow: both
  - from: disk
    to: cpu
    label: "load"
    arrow: both
  - from: cpu
    to: out
```


| Part | Job | Everyday comparison |
|---|---|---|
| **CPU** (processor) | Follows instructions, billions per second | The cook |
| **Memory (RAM)** | Holds what is being worked on right now | The kitchen counter |
| **Storage** (SSD / disk) | Keeps files when the power is off | The pantry |
| **Input** | Keyboard, mouse, touch screen, microphone | Orders coming in |
| **Output** | Screen, speakers, printer | Food going out |

## Everything is numbers

Inside, computers store everything — text, photos, music — as numbers made of **bits**: tiny switches that are either **0 (off)** or **1 (on)**. Eight bits make a **byte**.

```sketch
title: "One letter, three ways"
caption: "The computer only stores numbers. A standard table (ASCII, then Unicode) says which number means which character, and every number is stored as bits."
cellW: 190
nodes:
  - id: ch
    label: "\"A\""
    col: 0
    row: 0
    shape: circle
    tone: sky
    w: 0.6
    h: 0.75
  - id: num
    label: "65"
    col: 1.2
    row: 0
    shape: circle
    tone: gold
    sub: "its code"
    w: 0.6
    h: 0.75
  - id: bits
    label: "01000001"
    col: 2.5
    row: 0
    shape: box
    tone: teal
    sub: "8 bits = 1 byte"
edges:
  - from: ch
    to: num
    label: "Unicode table"
  - from: num
    to: bits
    label: "in binary"
```


```python run title="Letters are numbers"
for letter in "ZIM":
    print(letter, "is stored as", ord(letter), "which is", bin(ord(letter)))
```

> Try the **Binary Bulbs** game in the Kids Zone to see how bits make numbers. It's fun at any age!

```quiz
- q: Which part of the computer follows the instructions?
  options: ["The screen", "The CPU", "The keyboard", "The storage"]
  answer: 1
- q: How many bits are in one byte?
  options: ["2", "4", "8", "10"]
  answer: 2
```

# How the internet works {#how-the-internet-works}

The internet is a giant network of computers that send messages to each other.

```sketch
title: "What happens when you open a website"
caption: "Your browser asks DNS for the server's address, then sends an HTTP request across many networks. The server answers with HTML, CSS, JavaScript and images."
cellW: 190
cellH: 112
nodes:
  - id: you
    label: "Your browser"
    col: 0
    row: 1
    shape: round
    tone: sky
  - id: dns
    label: "DNS"
    col: 1.3
    row: 0
    shape: db
    tone: gold
    sub: "name → IP address"
  - id: net
    label: "Routers & networks"
    col: 1.3
    row: 1.6
    shape: round
    sub: "ISP · undersea cables"
  - id: srv
    label: "Web server"
    col: 2.7
    row: 1
    shape: db
    tone: teal
    sub: "skurulearning.com"
edges:
  - from: you
    to: dns
    label: "1. where is it?"
  - from: you
    to: net
    label: "2. request"
  - from: net
    to: srv
  - from: srv
    to: you
    label: "3. HTML, CSS, JS"
    dashed: true
    bend: 45
```


When you open a website:

1. You type an address like `globalaiacademy.co.zw` into your browser.
2. **DNS** (the internet's phone book) turns that name into a number called an **IP address**.
3. Your browser sends a **request** over your network — Wi‑Fi, fibre or mobile data from your network provider.
4. A **server** (a computer that is always on) sends back a **response**: the HTML, CSS, JavaScript and images for the page.
5. Your browser puts it all together and shows the page.

All of this usually takes less than a second.

## Key words

- **Client** — the device asking for something (your phone's browser).
- **Server** — the computer answering.
- **HTTP/HTTPS** — the language browsers and servers use. The **S** means the connection is encrypted (secure).
- **Data / bundles** — every request and response uses data. Smaller pages load faster and cost less.

```quiz
- q: What does DNS do?
  options: ["Speeds up your phone", "Turns website names into IP addresses", "Stores your photos", "Blocks viruses"]
  answer: 1
- q: What does the S in HTTPS mean?
  options: ["Speed", "Secure", "Server", "Simple"]
  answer: 1
  explain: HTTPS encrypts the connection so others on the network can't read it.
```

# Your first Python programs {#first-python}

Let's write some real code. Python runs right here in your browser — no installation needed.

## Printing

`print()` shows text or numbers.

```python run
print("Hello, Bulawayo!")
print(5 + 3)
print("5 + 3")
```

Notice the difference: `5 + 3` is calculated, but `"5 + 3"` in quotes is just text.

## Variables

A **variable** is a labelled box that stores a value.

```python run title="Variables"
name = "Farai"
age = 15
city = "Masvingo"
print(name, "is", age, "years old and lives in", city)
```

## Asking for input

`input()` lets the user type something. In our editor, press the keyboard icon ⌨️ and type your answer in the **Input** box before you run.

```python run title="Input"
name = input("What is your name? ")
print("Mhoro,", name + "!")
```

````challenge
id: start-here-first-program
title: Your first challenge
difficulty: easy
prompt: |
  Write a program that prints **exactly** these two lines:

  ```
  I am learning Python
  at Global AI Academy
  ```
starter: |
  # Write two print() lines below
expectedOutput: |
  I am learning Python
  at Global AI Academy
````

# How to learn effectively {#how-to-learn}

Learning to code is a skill, and there are proven ways to get better faster.

```sketch
title: "The learning loop"
caption: "Reading is the smallest part. Real learning happens when you run code, break it on purpose, fix it, and then use it in something of your own."
cellW: 180
nodes:
  - id: read
    label: "Read a little"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: run
    label: "Run the example"
    col: 1.3
    row: 0
    shape: round
    tone: teal
  - id: brk
    label: "Change & break it"
    col: 2.6
    row: 0
    shape: round
    tone: rose
  - id: fix
    label: "Fix it"
    col: 2.6
    row: 1.3
    shape: round
    tone: gold
  - id: build
    label: "Build something"
    col: 1.3
    row: 1.3
    shape: round
    tone: grape
edges:
  - from: read
    to: run
  - from: run
    to: brk
  - from: brk
    to: fix
  - from: fix
    to: build
  - from: build
    to: read
    label: "next lesson"
    dashed: true
```


## 1. Little and often

Twenty minutes a day beats four hours once a week. Your **streak** on the dashboard helps you build the habit.

## 2. Type it, break it, fix it

Change examples on purpose. What happens if you delete a quote mark? Read the error message — errors are clues, not failures.

## 3. Use the AI coach the right way

When a challenge fails, **Coach Zuva** gives hints in three steps: a nudge, a focused hint, then a walkthrough. Try to solve it after each hint before asking for the next. You remember what you work out yourself.

## 4. Build something real

After a few tracks, build a small project for someone you know: a price list for a tuck-shop, a quiz for your younger sibling, a budget tracker for your family.

## 5. Learn with others

Join a class, explain what you learned to a friend, or ask questions in your class discussion. Teaching others is one of the best ways to learn.

## Where next?

- Totally new? Continue with **[VS Code](/learn/vscode)** to set up your tools, then **[Python](/learn/python)**.
- Want to build websites? Start **[HTML](/learn/html)**.
- Curious about AI? Read **[AI Fundamentals](/learn/ai-fundamentals)**.
- Have a career in mind? See **[Career paths](/careers)**.

```quiz
- q: Which study habit works best?
  options: ["One long session a month", "A little every day", "Only reading, never typing", "Copying answers"]
  answer: 1
- q: Your code shows an error message. What should you do first?
  options: ["Give up", "Read the error message carefully", "Delete everything", "Restart the computer"]
  answer: 1
  explain: Error messages usually tell you the line and the kind of problem.
```

```exam
- q: "What is a computer program?"
  options: ["A list of instructions a computer follows", "A type of keyboard", "A website address", "A video file"]
  answer: 0
  explain: "Programs are ordered instructions."
- q: "Which part of a computer keeps files when the power is off?"
  options: ["RAM", "CPU", "Storage (SSD/disk)", "Screen"]
  answer: 2
  explain: "RAM is temporary; storage persists."
- q: "What does a server do?"
  options: ["Displays pages to the user", "Answers requests from clients", "Charges your phone", "Prints documents"]
  answer: 1
  explain: "Clients request; servers respond."
- q: "Which language is best known for styling web pages?"
  options: ["Python", "CSS", "SQL", "Java"]
  answer: 1
  explain: "CSS controls how HTML looks."
- q: "What is the best response to an error message?"
  options: ["Ignore it", "Read it to find the line and kind of problem", "Uninstall Python", "Restart the internet"]
  answer: 1
  explain: "Errors are clues."
- q: "In Python, what does print(\"5 + 3\") show?"
  options: ["8", "5 + 3", "53", "An error"]
  answer: 1
  explain: "Text in quotes is printed as-is."
```
