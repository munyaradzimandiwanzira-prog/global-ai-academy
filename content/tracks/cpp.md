---
id: cpp
title: C++
short: C++
category: languages
level: intermediate
language: cpp
color: "#00599C"
icon: "⚙️"
order: 24
summary: The language of games, robotics, embedded systems and high-performance software. Learn types, control flow, functions, references and pointers, classes, the STL and memory management.
tags: [c++, cpp, embedded, arduino, performance, systems]
---

# C++ Introduction {#intro}

**C++** gives you fine control over memory and hardware, which makes it fast. It's used for:

- **Embedded systems and robotics** — Arduino sketches are C++.
- **Games and game engines** — Unreal Engine.
- **High-performance software** — browsers, databases, trading systems, AI libraries (the core of PyTorch and TensorFlow).

```cpp run title="Hello, C++"
#include <iostream>

int main() {
    std::cout << "Mhoro from C++!" << std::endl;
    std::cout << 6 * 7 << "\n";
    return 0;
}
```

```output
Mhoro from C++!
42
```

## Compiling

C++ is **compiled** to machine code before it runs:

```bash
g++ -std=c++20 -Wall -O2 main.cpp -o main
./main
```

On Windows, install **MSYS2** (for `g++`) or **Visual Studio Community**. On Mac, run `xcode-select --install`.

# Variables and Types {#variables}

```cpp run
#include <iostream>
#include <string>

int main() {
    int learners = 820;
    double fees = 350.5;
    bool enrolled = true;
    char grade = 'A';
    std::string school = "Prince Edward";
    const double VAT = 0.15;
    auto total = fees * (1 + VAT);   // type deduced (double)

    std::cout << school << " has " << learners << " learners\n";
    std::cout << "Fees with VAT: " << total << "\n";
    std::cout << std::boolalpha << enrolled << " " << grade << "\n";
    std::cout << sizeof(int) << " bytes in an int\n";
}
```

```output
Prince Edward has 820 learners
Fees with VAT: 403.075
true A
4 bytes in an int
```

# Control Flow and Functions {#functions}

```cpp run
#include <iostream>
#include <string>

std::string grade(int mark) {
    if (mark >= 75) return "A";
    if (mark >= 65) return "B";
    if (mark >= 50) return "C";
    return "U";
}

double vat(double amount, double rate = 0.15) { return amount * rate; }

int main() {
    for (int mark : {81, 67, 40}) std::cout << mark << " -> " << grade(mark) << "\n";
    std::cout << vat(200) << " " << vat(200, 0.1) << "\n";

    int savings = 0, weeks = 0;
    while (savings < 100) { savings += 15; ++weeks; }
    std::cout << "Weeks: " << weeks << "\n";
}
```

```output
81 -> A
67 -> B
40 -> U
30 20
Weeks: 7
```

# References and Pointers {#pointers}

A **reference** is another name for an existing variable. A **pointer** stores a memory address.

```cpp run
#include <iostream>

void addBonus(int& xp) { xp += 50; }          // by reference: changes the original
void noEffect(int xp) { xp += 50; }           // by value: changes a copy

int main() {
    int xp = 100;
    noEffect(xp);
    std::cout << "after noEffect: " << xp << "\n";
    addBonus(xp);
    std::cout << "after addBonus: " << xp << "\n";

    int* p = &xp;             // p holds the address of xp
    *p = 999;                 // change xp through the pointer
    std::cout << "via pointer: " << xp << "\n";
}
```

```output
after noEffect: 100
after addBonus: 150
via pointer: 999
```

Pass large objects as `const T&` to avoid copying them.

# Classes {#classes}

```cpp run
#include <iostream>
#include <string>
#include <stdexcept>

class Wallet {
public:
    explicit Wallet(std::string owner) : owner_(std::move(owner)) {}

    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("amount must be positive");
        balance_ += amount;
    }
    bool send(double amount) {
        if (amount > balance_) return false;
        balance_ -= amount;
        return true;
    }
    double balance() const { return balance_; }

private:
    std::string owner_;
    double balance_ = 0;
};

int main() {
    Wallet w("Rudo");
    w.deposit(20);
    std::cout << std::boolalpha << w.send(5) << " " << w.balance() << "\n";
    std::cout << w.send(100) << " " << w.balance() << "\n";
}
```

```output
true 15
false 15
```

# The Standard Library (STL) {#stl}

```cpp run
#include <algorithm>
#include <iostream>
#include <map>
#include <numeric>
#include <string>
#include <vector>

int main() {
    std::vector<int> marks{72, 45, 88, 91, 60};
    std::sort(marks.begin(), marks.end());
    double avg = std::accumulate(marks.begin(), marks.end(), 0.0) / marks.size();
    std::cout << "lowest " << marks.front() << ", highest " << marks.back() << ", avg " << avg << "\n";

    std::map<std::string, double> prices{{"bread", 1.10}, {"milk", 1.20}};
    prices["sugar"] = 2.80;
    for (const auto& [item, price] : prices) std::cout << item << ": " << price << "\n";

    auto passes = std::count_if(marks.begin(), marks.end(), [](int m) { return m >= 50; });
    std::cout << passes << " passes\n";
}
```

```output
lowest 45, highest 91, avg 71.2
bread: 1.1
milk: 1.2
sugar: 2.8
4 passes
```

| Container | Use |
|---|---|
| `std::vector` | Dynamic array — the default choice |
| `std::map` / `std::unordered_map` | Key → value |
| `std::set` | Unique sorted values |
| `std::string` | Text |
| `std::array` | Fixed-size array |

# Memory Management {#memory}

C++ lets you manage memory yourself — powerful but risky. Modern C++ uses **RAII** and **smart pointers** so memory is freed automatically.

```cpp run
#include <iostream>
#include <memory>
#include <string>

struct Sensor {
    std::string name;
    explicit Sensor(std::string n) : name(std::move(n)) { std::cout << "open " << name << "\n"; }
    ~Sensor() { std::cout << "close " << name << "\n"; }   // destructor runs automatically
};

int main() {
    {
        auto soil = std::make_unique<Sensor>("soil-moisture");
        std::cout << "reading " << soil->name << "\n";
    }   // soil is destroyed here — no leak, no delete needed
    std::cout << "done\n";
}
```

```output
open soil-moisture
reading soil-moisture
close soil-moisture
done
```

> Avoid raw `new` and `delete`. Use `std::vector`, `std::string`, `std::unique_ptr` and `std::shared_ptr`.

# C++ on Microcontrollers {#embedded}

Arduino code is C++ with a simple structure:

```cpp
const int LED = 13;
const int SOIL = A0;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int moisture = analogRead(SOIL);        // 0–1023
  Serial.println(moisture);
  digitalWrite(LED, moisture > 600 ? HIGH : LOW);   // dry soil → LED on
  delay(1000);
}
```

Memory on a microcontroller is tiny (an Arduino Uno has 2 KB of RAM), so efficient C++ matters. Continue with **[Mechatronics](/learn/mechatronics)**.

````challenge
id: cpp-max
title: Largest mark
difficulty: easy
prompt: |
  The vector `marks` holds exam marks. Print the **largest** mark.
starter: |
  #include <iostream>
  #include <vector>

  int main() {
      std::vector<int> marks{64, 91, 58, 77, 85};
      // print the largest mark
  }
expectedOutput: "91"
````

```quiz
- q: What does `int& x` in a parameter mean?
  options: ["x is a copy", "x is a reference to the caller's variable", "x is a pointer", "x is constant"]
  answer: 1
- q: Which is the safest way to own heap memory in modern C++?
  options: ["new and delete", "malloc", "std::unique_ptr", "Global variables"]
  answer: 2
```

```exam
- q: "Which header provides std::cout?"
  options: ["<stdio>", "<iostream>", "<string>", "<vector>"]
  answer: 1
- q: "What is the default container to use for a dynamic array in C++?"
  options: ["std::list", "std::vector", "std::map", "std::array"]
  answer: 1
- q: "What does `&x` give?"
  options: ["The value of x", "The address of x", "A copy of x", "x squared"]
  answer: 1
- q: "What does RAII mean in practice?"
  options: ["Resources are released automatically when objects go out of scope", "Random access is impossible", "Raw arrays only", "Run all instructions immediately"]
  answer: 0
- q: "Why pass large objects as `const T&`?"
  options: ["To avoid copying while preventing changes", "To make them global", "To allocate on the heap", "Because it's required"]
  answer: 0
- q: "Which function runs repeatedly in an Arduino sketch?"
  options: ["setup()", "loop()", "main()", "repeat()"]
  answer: 1
- q: "Which smart pointer has a single owner?"
  options: ["std::shared_ptr", "std::unique_ptr", "std::weak_ptr", "void*"]
  answer: 1
- q: "What does `-Wall` do when compiling with g++?"
  options: ["Enables common warnings", "Builds for Windows", "Deletes object files", "Adds debug symbols"]
  answer: 0
```
