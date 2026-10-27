---
id: java
title: Java
short: JAVA
category: languages
level: beginner
language: java
color: "#E76F00"
icon: "☕"
order: 21
summary: The language behind banking systems, enterprise backends and Android. Learn syntax, types, control flow, methods, OOP, collections, exceptions, streams and how real Java projects are built.
tags: [java, oop, backend, enterprise, android, spring]
---

# Java Introduction {#intro}

**Java** is one of the most widely used programming languages, especially for:

- **Enterprise and banking systems** — reliable, long-lived backends.
- **Android** — Android's original language (Kotlin is now preferred, and both run on the same platform).
- **Big data** tools like Hadoop, Spark and Kafka.

Java is **compiled** to bytecode that runs on the **Java Virtual Machine (JVM)** — "write once, run anywhere".

```java run title="Hello, Java"
public class Main {
  public static void main(String[] args) {
    System.out.println("Mhoro from Java!");
    System.out.println(6 * 7);
  }
}
```

```output
Mhoro from Java!
42
```

## Every Java program needs

- A **class** (`public class Main`) — the file must be named `Main.java`.
- A **main method** — the starting point: `public static void main(String[] args)`.
- **Semicolons** at the end of statements and **curly braces** for blocks.

## Setting up

Install a **JDK** (Java Development Kit) — for example Eclipse Temurin 21 LTS from adoptium.net. Then:

```bash
javac Main.java   # compile
java Main         # run
```

Use **IntelliJ IDEA** or VS Code with the **Extension Pack for Java** (see [Other IDEs](/learn/ides)).

```exercise
prompt: Complete the statement that prints a line of text.
lang: java
code: |
  System.out.___("Hello");
answers: [println]
```

# Variables and Types {#variables}

Java is **statically typed**: every variable has a fixed type.

```java run
public class Main {
  public static void main(String[] args) {
    String learner = "Chipo";
    int age = 17;
    double fees = 350.50;
    boolean enrolled = true;
    char grade = 'A';
    long population = 15_000_000L;

    var city = "Gweru";   // type inferred (String)
    final double VAT = 0.15;   // constant

    System.out.println(learner + " (" + age + ") from " + city + ", grade " + grade);
    System.out.printf("Fees with VAT: $%.2f%n", fees * (1 + VAT));
  }
}
```

```output
Chipo (17) from Gweru, grade A
Fees with VAT: $403.08
```

| Type | Holds | Example |
|---|---|---|
| `int` | whole numbers | `42` |
| `long` | big whole numbers | `15000000L` |
| `double` | decimals | `3.14` |
| `boolean` | true/false | `true` |
| `char` | one character | `'Z'` |
| `String` | text (an object) | `"Harare"` |

> For money in real systems, use `BigDecimal`, not `double` — decimals in binary can't represent cents exactly.

# Operators and Strings {#strings}

```java run
public class Main {
  public static void main(String[] args) {
    String town = "  Victoria Falls  ";
    String t = town.trim();
    System.out.println(t.toUpperCase());
    System.out.println(t.length());
    System.out.println(t.contains("Falls"));
    System.out.println(t.substring(0, 8));
    System.out.println("Zim".equals("zim") + " " + "Zim".equalsIgnoreCase("zim"));
    System.out.println(17 / 5 + " " + 17 % 5 + " " + 17 / 5.0);
  }
}
```

```output
VICTORIA FALLS
14
true
Victoria
false true
3 2 3.4
```

> Compare strings with `.equals()`, **never** `==` (which compares whether they're the same object in memory).

# Control Flow {#control-flow}

```java run
public class Main {
  public static void main(String[] args) {
    int mark = 68;
    String grade;
    if (mark >= 75) grade = "A";
    else if (mark >= 65) grade = "B";
    else if (mark >= 50) grade = "C";
    else grade = "U";
    System.out.println("Grade: " + grade);

    String day = "SAT";
    String kind = switch (day) {
      case "SAT", "SUN" -> "weekend";
      default -> "school day";
    };
    System.out.println(kind);

    for (int i = 1; i <= 3; i++) System.out.println("Lap " + i);

    int savings = 0, weeks = 0;
    while (savings < 100) { savings += 15; weeks++; }
    System.out.println("Weeks to $100: " + weeks);
  }
}
```

```output
Grade: B
weekend
Lap 1
Lap 2
Lap 3
Weeks to $100: 7
```

# Methods {#methods}

```java run
public class Main {
  static double vat(double amount) {
    return vat(amount, 0.15);
  }

  static double vat(double amount, double rate) {   // overloading
    return Math.round(amount * rate * 100) / 100.0;
  }

  static boolean isLeap(int year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
  }

  public static void main(String[] args) {
    System.out.println(vat(200));
    System.out.println(vat(200, 0.1));
    System.out.println(isLeap(2028) + " " + isLeap(1900));
  }
}
```

```output
30.0
20.0
true false
```

`static` methods belong to the class; you call them without creating an object.

# Classes and Objects {#classes}

Java is built around **object-oriented programming (OOP)**.

```java run
class Learner {
  private final String name;
  private int xp;

  Learner(String name) { this.name = name; }

  void completeLesson(int points) {
    if (points <= 0) throw new IllegalArgumentException("points must be positive");
    xp += points;
  }

  String getName() { return name; }
  int getXp() { return xp; }

  @Override
  public String toString() { return name + " (" + xp + " XP)"; }
}

public class Main {
  public static void main(String[] args) {
    Learner rudo = new Learner("Rudo");
    rudo.completeLesson(10);
    rudo.completeLesson(25);
    System.out.println(rudo);
  }
}
```

```output
Rudo (35 XP)
```

## The four pillars of OOP

| Pillar | Meaning |
|---|---|
| **Encapsulation** | Keep fields `private`; expose behaviour through methods |
| **Inheritance** | A class extends another (`class Kombi extends Vehicle`) |
| **Polymorphism** | One interface, many implementations |
| **Abstraction** | Hide details behind simple interfaces |

## Records

For simple data carriers, use a **record** (Java 16+):

```java
record Product(String name, double price) {}
var p = new Product("Sugar 2kg", 2.80);
System.out.println(p.name() + " $" + p.price());
```

# Inheritance and Interfaces {#interfaces}

```java run
interface PaymentMethod {
  String pay(double amount);
}

class EcoCash implements PaymentMethod {
  private final String phone;
  EcoCash(String phone) { this.phone = phone; }
  public String pay(double amount) { return String.format("Prompted %s for $%.2f", phone, amount); }
}

class Card implements PaymentMethod {
  public String pay(double amount) { return String.format("Charged card $%.2f", amount); }
}

public class Main {
  public static void main(String[] args) {
    PaymentMethod[] methods = { new EcoCash("0772123456"), new Card() };
    for (PaymentMethod m : methods) System.out.println(m.pay(15));   // polymorphism
  }
}
```

```output
Prompted 0772123456 for $15.00
Charged card $15.00
```

Code that depends on the `PaymentMethod` **interface** works with any payment type — including ones added later.

# Collections {#collections}

```java run
import java.util.*;

public class Main {
  public static void main(String[] args) {
    List<String> cities = new ArrayList<>(List.of("Harare", "Bulawayo", "Mutare"));
    cities.add("Gweru");
    Collections.sort(cities);
    System.out.println(cities);

    Map<String, Double> prices = new HashMap<>();
    prices.put("bread", 1.10);
    prices.put("milk", 1.20);
    prices.merge("bread", 0.10, Double::sum);
    System.out.println(prices.get("bread") + " " + prices.getOrDefault("salt", 0.0));

    Set<String> visitors = new TreeSet<>(List.of("Sipho", "Rudo", "Sipho"));
    System.out.println(visitors);
  }
}
```

```output
[Bulawayo, Gweru, Harare, Mutare]
1.2000000000000002 0.0
[Rudo, Sipho]
```

Notice `1.2000000000000002` — that's the floating-point issue mentioned earlier, and why money needs `BigDecimal`.

| Collection | Use |
|---|---|
| `ArrayList` | Ordered list |
| `HashMap` | Key → value lookup |
| `HashSet` / `TreeSet` | Unique values (TreeSet keeps them sorted) |
| `ArrayDeque` | Queue / stack |

# Exceptions {#exceptions}

```java run
public class Main {
  static int parseScore(String text) {
    try {
      int n = Integer.parseInt(text);
      if (n < 0 || n > 100) throw new IllegalArgumentException("score out of range: " + n);
      return n;
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("not a number: " + text, e);
    }
  }

  public static void main(String[] args) {
    for (String s : new String[] {"85", "abc", "150"}) {
      try {
        System.out.println("OK " + parseScore(s));
      } catch (IllegalArgumentException e) {
        System.out.println("Error: " + e.getMessage());
      } finally {
        System.out.println("checked " + s);
      }
    }
  }
}
```

```output
OK 85
checked 85
Error: not a number: abc
checked abc
Error: score out of range: 150
checked 150
```

# Streams and Lambdas {#streams}

Streams process collections in a readable, functional style:

```java run
import java.util.*;
import java.util.stream.*;

record Sale(String branch, String product, int units, double price) {}

public class Main {
  public static void main(String[] args) {
    List<Sale> sales = List.of(
      new Sale("Harare", "bread", 120, 1.1), new Sale("Bulawayo", "bread", 90, 1.1),
      new Sale("Harare", "milk", 80, 1.2), new Sale("Mutare", "milk", 30, 1.2));

    double total = sales.stream().mapToDouble(s -> s.units() * s.price()).sum();
    System.out.printf("Total revenue: $%.2f%n", total);

    Map<String, Integer> unitsByBranch = sales.stream()
      .collect(Collectors.groupingBy(Sale::branch, TreeMap::new, Collectors.summingInt(Sale::units)));
    System.out.println(unitsByBranch);

    List<String> bigSellers = sales.stream().filter(s -> s.units() >= 90).map(Sale::branch).distinct().toList();
    System.out.println(bigSellers);
  }
}
```

```output
Total revenue: $363.00
{Bulawayo=90, Harare=200, Mutare=30}
[Harare, Bulawayo]
```

# Real Java Projects {#projects}

## Build tools

**Maven** and **Gradle** manage dependencies and builds:

```bash
mvn archetype:generate -DgroupId=zw.co.academy -DartifactId=market-api
mvn test
mvn package        # builds a .jar
java -jar target/market-api-1.0.jar
```

## Spring Boot

**Spring Boot** is the most popular framework for Java web services:

```java
@RestController
@RequestMapping("/api/products")
class ProductController {
  private final ProductRepository repo;
  ProductController(ProductRepository repo) { this.repo = repo; }

  @GetMapping
  List<Product> all() { return repo.findAll(); }

  @PostMapping
  Product create(@Valid @RequestBody Product p) { return repo.save(p); }
}
```

## Testing with JUnit

```java
class VatTest {
  @Test
  void addsFifteenPercent() {
    assertEquals(30.0, Main.vat(200), 0.001);
  }
}
```

## Where next?

- **[Kotlin](/learn/kotlin)** — modern JVM language for Android and backends.
- **[Backend Engineering](/learn/backend)** — APIs, databases, auth.
- **[SQL](/learn/sql)** — every Java backend talks to a database.

````challenge
id: java-even-sum
title: Sum of even numbers
difficulty: easy
prompt: |
  Write a program that prints the **sum of all even numbers from 1 to 100** (inclusive).

  The output should be just the number.
starter: |
  public class Main {
    public static void main(String[] args) {
      int sum = 0;
      // your loop here
      System.out.println(sum);
    }
  }
expectedOutput: "2550"
````

```quiz
- q: How should you compare two Strings in Java?
  options: ["==", ".equals()", "===", "compare()"]
  answer: 1
- q: What does the JVM do?
  options: ["Edits code", "Runs compiled Java bytecode", "Stores databases", "Designs UIs"]
  answer: 1
- q: Which type should be used for money amounts in real systems?
  options: ["double", "float", "BigDecimal", "int"]
  answer: 2
- q: Which OOP pillar keeps fields private behind methods?
  options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"]
  answer: 2
```

```exam
- q: "What is the entry point of a Java program?"
  options: ["start()", "public static void main(String[] args)", "init()", "run()"]
  answer: 1
- q: "Which keyword makes a variable's value unchangeable?"
  options: ["static", "final", "const", "fixed"]
  answer: 1
- q: "Which collection stores key-value pairs?"
  options: ["ArrayList", "HashMap", "HashSet", "LinkedList"]
  answer: 1
- q: "What is a Java record good for?"
  options: ["Simple immutable data carriers", "Playing audio", "Threads", "Database migrations"]
  answer: 0
- q: "Which keyword makes a class follow an interface?"
  options: ["extends", "implements", "inherits", "uses"]
  answer: 1
- q: "What does `17 / 5` evaluate to in Java (both ints)?"
  options: ["3.4", "3", "4", "2"]
  answer: 1
  explain: "Integer division drops the remainder."
- q: "Which build tools manage Java dependencies?"
  options: ["npm and pip", "Maven and Gradle", "Composer", "Cargo"]
  answer: 1
```
