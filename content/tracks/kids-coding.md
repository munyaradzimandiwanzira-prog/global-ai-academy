---
id: kids-coding
title: My First Python (Kids)
short: KIDS
category: kids
level: kids
language: python
color: "#F2B544"
icon: "🐣"
order: 90
summary: Real coding for ages 9–14. Make the computer talk, do maths, ask questions, make decisions, repeat things and draw — with Zuva the robot cheering you on.
tags: [kids, python, beginner, stem, fun]
---

# Make the Computer Talk {#talk}

Hi, I'm **Zuva**! ☀️🤖 Let's write **real code** — the same Python that grown-up engineers use.

The `print()` command makes the computer show words on the screen. Press **Try it yourself**, then **Run**!

```python run title="Say hello"
print("Mhoro! My name is Zuva.")
print("I am a robot from Zimbabwe.")
print("🚀🚀🚀")
```

Now change the words inside the "quote marks" to your own name and run it again. You just programmed a computer!

> 💡 Words in code must be inside quote marks. If you forget them, Python gets confused and shows a red error message. That's okay — every coder sees errors every day!

```exercise
prompt: Fill in the missing word to make the computer say Hello.
code: |
  ___("Hello!")
answers: [print]
hint: It starts with p and means "show on the screen".
```

# Computer Maths {#maths}

Computers are super-fast calculators. Try these:

```python run
print(3 + 4)
print(10 - 6)
print(5 * 6)      # * means times
print(20 / 4)     # / means divided by
print(2 ** 10)    # ** means "to the power of"
```

```python run title="How many legs?"
cows = 7
chickens = 12
legs = cows * 4 + chickens * 2
print("Total legs on the farm:", legs)
```

Change the number of cows and chickens and run it again!

```quiz
- q: What does `5 * 3` give?
  options: ["8", "15", "53", "2"]
  answer: 1
- q: Which symbol means "times" in Python?
  options: ["x", "*", "+", "#"]
  answer: 1
```

# Boxes Called Variables {#variables}

A **variable** is like a labelled box where the computer keeps something.

```python run
name = "Chipo"
age = 10
favourite_food = "sadza and chicken"

print(name, "is", age, "years old.")
print(name, "loves", favourite_food + "!")
```

You can change what's in the box:

```python run
mangoes = 5
print("I have", mangoes, "mangoes")
mangoes = mangoes + 3
print("Gogo gave me 3 more. Now I have", mangoes)
mangoes = mangoes - 2
print("I shared 2 with my friend. Now I have", mangoes)
```

````challenge
id: kids-variables
title: Pocket money
difficulty: easy
prompt: |
  You have **$4**. You earn **$3** more by helping at home.

  Make a variable called `money` that starts at 4, add 3 to it, then print it. The program should print just the number **7**.
starter: |
  money = 4
  # add 3 here

  print(money)
expectedOutput: "7"
````

# Ask a Question {#input}

`input()` lets the computer ask **you** something!

In the editor, press the keyboard button ⌨️ and type your answer in the **Input** box first. Then press Run.

```python run title="Chat with Zuva"
name = input("What is your name? ")
print("Mhoro", name, "! Nice to meet you.")
food = input("What is your favourite food? ")
print("Yum!", food, "is delicious!")
```

# Making Decisions {#decisions}

Computers can decide what to do with `if` and `else`.

```python run
temperature = 32

if temperature > 30:
    print("It's hot! Let's drink water. 💧")
else:
    print("Nice weather for football! ⚽")
```

See the spaces before the `print` lines? They tell Python which lines belong to the `if`. Always use **4 spaces**.

```python run title="Guess the number"
secret = 7
guess = 5

if guess == secret:
    print("🎉 You got it!")
elif guess < secret:
    print("Too low! Try a bigger number.")
else:
    print("Too high! Try a smaller number.")
```

Change `guess` until you win! (`==` means "is equal to".)

```quiz
- q: Which word does Python use for "otherwise"?
  options: ["then", "else", "or", "stop"]
  answer: 1
- q: What does `==` check?
  options: ["If two things are equal", "Adds two numbers", "Makes a variable", "Prints text"]
  answer: 0
```

# Repeat with Loops {#loops}

A **loop** repeats things so you don't have to type them again and again. (Remember the Repeat block in Robo Maze? Same idea!)

```python run
for i in range(5):
    print("I love coding!")
```

```python run title="Count down to blast off"
for number in range(10, 0, -1):
    print(number)
print("BLAST OFF! 🚀")
```

```python run title="Times table"
table = 7
for n in range(1, 11):
    print(table, "x", n, "=", table * n)
```

Change `table` to any number to make a new times table!

````challenge
id: kids-loop-stars
title: Star ladder
difficulty: easy
prompt: |
  Use a loop to print a ladder of stars, 5 rows high:

  ```
  *
  **
  ***
  ****
  *****
  ```
  Hint: in Python, `"*" * 3` makes `"***"`.
starter: |
  for row in range(1, 6):
      # print the right number of stars
      pass
expectedOutput: |
  *
  **
  ***
  ****
  *****
````

# Lists of Things {#lists}

A **list** keeps many things together, in order.

```python run
animals = ["lion", "elephant", "giraffe", "zebra", "rhino"]
print("The first animal is", animals[0])     # computers count from 0!
print("There are", len(animals), "animals")

for animal in animals:
    print("I saw a", animal, "at Hwange!")
```

```python run title="Pick a random team captain"
import random
friends = ["Tendai", "Nomsa", "Farai", "Ruvimbo", "Sipho"]
print("Today's captain is", random.choice(friends), "🏆")
```

# Make Your Own Quiz {#project}

Let's put everything together and make a quiz game!

```python run title="Zuva's Zimbabwe Quiz"
score = 0

answer = input("What is the capital city of Zimbabwe? ")
if answer.lower() == "harare":
    print("✅ Correct!")
    score = score + 1
else:
    print("❌ It's Harare.")

answer = input("How many legs does a spider have? ")
if answer == "8":
    print("✅ Correct!")
    score = score + 1
else:
    print("❌ Spiders have 8 legs.")

answer = input("What is 6 x 7? ")
if answer == "42":
    print("✅ Correct!")
    score = score + 1
else:
    print("❌ It's 42.")

print("You scored", score, "out of 3!")
if score == 3:
    print("🌟 Superstar! 🌟")
```

Type your three answers in the **Input** box (one per line) before you run it. Then add your own questions!

## What's next?

- Play more games in the **[Kids Zone](/kids)**.
- When you're ready, try the grown-up **[Python](/learn/python)** track — you already know a lot of it!

```quiz
- q: In a list, what number does the first item have?
  options: ["1", "0", "-1", "First"]
  answer: 1
  explain: Computers start counting from 0.
- q: Which command repeats code?
  options: ["print", "for", "input", "if"]
  answer: 1
- q: What does `input()` do?
  options: ["Shows text", "Asks the user to type something", "Repeats code", "Does maths"]
  answer: 1
```

```exam
- q: "What does `print(\"Hi\")` do?"
  options: ["Shows Hi on the screen", "Deletes Hi", "Asks a question", "Draws a picture"]
  answer: 0
- q: "What is a variable?"
  options: ["A labelled box that stores a value", "A type of computer", "A loop", "A mistake"]
  answer: 0
- q: "What does `for i in range(3):` do?"
  options: ["Repeats 3 times", "Prints 3", "Stops the program", "Asks for a number"]
  answer: 0
- q: "Which word starts a decision in Python?"
  options: ["if", "loop", "print", "go"]
  answer: 0
- q: "What does `10 - 4` give?"
  options: ["6", "14", "40", "104"]
  answer: 0
```
