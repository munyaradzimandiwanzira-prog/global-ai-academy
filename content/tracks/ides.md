---
id: ides
title: Other IDEs
short: IDEs
category: tools
level: beginner
language: text
color: "#6B3A1E"
icon: "🛠️"
order: 3
summary: Optional but useful — PyCharm, IntelliJ IDEA, Android Studio, Xcode, Jupyter, Thonny, Arduino IDE and AI-first editors. Know which tool fits which job.
tags: [ide, pycharm, intellij, android studio, xcode, jupyter, tools]
---

# Choosing the Right Tool {#choosing}

VS Code covers most needs, but some jobs have a specialised tool that does them better. You **don't** need to install all of these — pick the one for the path you're following.

| Tool | Best for | Cost |
|---|---|---|
| **VS Code** | Almost everything: Python, web, scripting | Free |
| **Thonny** | Absolute beginners and kids learning Python | Free |
| **PyCharm** | Larger Python and Django projects | Free Community / paid Pro |
| **Jupyter / JupyterLab** | Data science and AI experiments | Free |
| **Google Colab** | Jupyter in the cloud with free GPUs | Free tier |
| **IntelliJ IDEA** | Java and Kotlin backends | Free Community / paid Ultimate |
| **Android Studio** | Android apps (Kotlin, Compose) | Free |
| **Xcode** | iPhone/iPad/Mac apps (Swift) — **Mac only** | Free |
| **Arduino IDE** | Microcontrollers and robotics | Free |
| **AI-first editors** | Editors built around an AI assistant | Free tiers / paid |

> Students can often get professional tools free: JetBrains offers free educational licences, and GitHub has a Student Developer Pack.

```quiz
- q: Which IDE do you need to build iPhone apps?
  options: ["Android Studio", "Xcode", "Thonny", "Arduino IDE"]
  answer: 1
```

# Thonny — for Beginners {#thonny}

**Thonny** is a tiny Python IDE designed for learners.

- Comes with Python built in — one download and you're coding.
- **Step-through debugger** shows exactly how each line changes variables.
- A simple screen with no distractions.
- Runs well on old computers and Raspberry Pi.

Download it from **thonny.org**. Great for primary and secondary school computer labs.

# PyCharm {#pycharm}

**PyCharm** by JetBrains is a full Python IDE.

- Excellent **refactoring** (rename and move code safely across a project).
- Built-in test runner, database tools and virtual-environment management.
- **Community** edition is free; **Professional** adds web frameworks and data tools.

It's heavier than VS Code — it needs at least 8 GB of RAM to feel smooth.

# Jupyter and Google Colab {#jupyter}

**Notebooks** mix code, results, charts and notes in one document — the standard for data science and AI research.

```python
# A cell — run it with Shift+Enter
import pandas as pd
df = pd.DataFrame({"province": ["Harare", "Bulawayo"], "learners": [1200, 640]})
df
```

- **JupyterLab:** `pip install jupyterlab` then `jupyter lab`.
- **VS Code:** open any `.ipynb` file with the Jupyter extension.
- **Google Colab** (colab.research.google.com): notebooks in your browser, nothing to install, with **free GPU** time — ideal for training ML models when your laptop is slow.

> Notebooks are great for exploring. When your code works, move it into `.py` files with tests so it can be reused and deployed.

# IntelliJ IDEA {#intellij}

**IntelliJ IDEA** is the leading IDE for **Java** and **Kotlin**.

- Understands huge codebases: jump to any class, find every usage, refactor safely.
- Built-in support for **Maven** and **Gradle** build tools.
- **Ultimate** edition adds Spring Boot, databases and web tools.

Used by most banks and enterprise teams that run Java.

# Android Studio {#android-studio}

**Android Studio** (developer.android.com/studio) is Google's official IDE for Android, built on IntelliJ.

- **Layout preview** for Jetpack Compose screens.
- **Android Emulator** — run a virtual phone on your computer.
- Device manager, profiler and Play Store publishing tools.

## Hardware tips

The emulator is heavy. With less than 8 GB of RAM:
- turn on **Developer options → USB debugging** on a real Android phone and run your app directly on it,
- close browsers and other apps while building.

# Xcode {#xcode}

**Xcode** (free in the Mac App Store) is required to build apps for iPhone, iPad, Apple Watch and Mac.

- **SwiftUI previews** update as you type.
- **Simulator** for every iPhone model.
- Publishing to the App Store needs an Apple Developer account (paid yearly).

> No Mac? You can still learn Swift's language basics on Linux/Windows, or with **Swift Playgrounds** on an iPad. To publish iOS apps you'll eventually need macOS (a cloud Mac service also works).

# Arduino IDE {#arduino-ide}

The **Arduino IDE** writes C++ "sketches" for microcontrollers like the Arduino Uno and ESP32.

1. Install from **arduino.cc/en/software**.
2. Plug in your board with USB and choose it under **Tools → Board** and **Tools → Port**.
3. Write a sketch and click **Upload** (→).

```cpp
void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  digitalWrite(LED_BUILTIN, HIGH); delay(500);
  digitalWrite(LED_BUILTIN, LOW);  delay(500);
}
```

**Wokwi** (wokwi.com) simulates Arduino and ESP32 boards in your browser — practise electronics with no hardware.

See the **[Mechatronics](/learn/mechatronics)** track.

# AI-First Editors {#ai-editors}

A new generation of editors puts an AI assistant at the centre: chat with your codebase, ask for multi-file changes, and run agents that plan and edit code. Many are based on VS Code, so your skills transfer.

How to evaluate one:

- **Privacy:** where does your code go? Can you turn off training on your code?
- **Cost:** what do you get on the free tier?
- **Control:** can you review every change before it's applied?
- **Offline:** does it work without the internet, or with local models?

Professional engineers use these tools daily — but the engineers who benefit most are the ones who understand the code the AI writes. Learn fundamentals first.

```quiz
- q: Which tool simulates Arduino boards in the browser?
  options: ["Wokwi", "Xcode", "PyCharm", "Colab"]
  answer: 0
- q: What is Google Colab especially useful for?
  options: ["Building iPhone apps", "Running notebooks with free GPU time", "Editing Word documents", "Designing logos"]
  answer: 1
```

```exam
- q: "Which IDE is designed for absolute Python beginners?"
  options: ["Xcode", "Thonny", "IntelliJ IDEA", "Android Studio"]
  answer: 1
- q: "Which tool is required to publish iPhone apps?"
  options: ["Android Studio", "Xcode on macOS", "Arduino IDE", "Thonny"]
  answer: 1
- q: "What is Android Studio's emulator?"
  options: ["A virtual Android phone on your computer", "A Python library", "A database", "A web browser"]
  answer: 0
- q: "Which IDE is the leading choice for Java and Kotlin backends?"
  options: ["IntelliJ IDEA", "Thonny", "Jupyter", "Wokwi"]
  answer: 0
- q: "Why move working notebook code into .py files?"
  options: ["Notebooks can't run code", "So it can be tested, reused and deployed", "To make it slower", "Because .py files are prettier"]
  answer: 1
- q: "What does the Arduino IDE's Upload button do?"
  options: ["Sends your sketch to the microcontroller", "Posts code to GitHub", "Downloads a library", "Formats the code"]
  answer: 0
- q: "Which is a key question when evaluating an AI-first editor?"
  options: ["Its colour theme", "Where your code is sent and how it is used", "Its logo", "How many fonts it has"]
  answer: 1
```
