---
id: kotlin
title: Kotlin
short: KOTLIN
category: languages
level: beginner
language: kotlin
color: "#7F52FF"
icon: "🟣"
order: 22
summary: Google's preferred language for Android, and a modern choice for backends. Concise syntax, null safety, functions, classes, data classes, collections and coroutines.
tags: [kotlin, android, jvm, mobile, backend]
---

# Kotlin Introduction {#intro}

**Kotlin** is a modern language that runs on the JVM (like Java) and is Google's **preferred language for Android** development. It's concise, safe and fully interoperable with Java code.

```kotlin run title="Hello, Kotlin"
fun main() {
    println("Mhoro from Kotlin!")
    val cities = listOf("Harare", "Bulawayo", "Mutare")
    for (city in cities) println("Hello, $city")
}
```

```output
Mhoro from Kotlin!
Hello, Harare
Hello, Bulawayo
Hello, Mutare
```

## Why Kotlin?

- **Less code** than Java for the same result.
- **Null safety** built into the type system — prevents the most common crash.
- **Coroutines** make async code (network calls, databases) simple.
- **Kotlin Multiplatform** shares code between Android, iOS, web and server.

Try Kotlin online at **play.kotlinlang.org**, or install **IntelliJ IDEA** / **Android Studio**.

# Variables and Types {#variables}

```kotlin run
fun main() {
    val school = "Mzilikazi High"   // val = read-only
    var learners = 820              // var = can change
    learners += 35
    val fees: Double = 350.50
    val passed: Boolean = true
    println("$school has $learners learners. Fees: $$fees. Passed: $passed")
    println("Next year: ${learners + 50} learners")
}
```

```output
Mzilikazi High has 855 learners. Fees: $350.5. Passed: true
Next year: 905 learners
```

- Prefer **`val`**; use `var` only when the value must change.
- Types are usually **inferred**, but you can write them: `val age: Int = 16`.
- **String templates**: `"$name"` or `"${expression}"`.

```exercise
prompt: Declare a read-only variable.
lang: kotlin
code: |
  ___ capital = "Harare"
answers: [val]
```

# Null Safety {#null-safety}

In Kotlin, a normal type **cannot** hold `null`. To allow null, add `?`:

```sketch
title: "Handling a value that might be null"
caption: "A String? may be null, so Kotlin makes you decide: use ?. to skip, ?: to give a default, or check it with if."
cellW: 190
cellH: 90
nodes:
  - id: v
    label: "phone: String?"
    col: 0
    row: 0.9
    shape: note
    tone: sky
  - id: safe
    label: "phone?.length"
    col: 1.7
    row: 0
    shape: round
    tone: teal
    sub: "null if missing"
  - id: elv
    label: "phone ?: \"none\""
    col: 1.7
    row: 0.9
    shape: round
    tone: gold
    sub: "default"
  - id: chk
    label: "if (phone != null)"
    col: 1.7
    row: 1.8
    shape: round
    tone: grape
    sub: "smart cast"
  - id: bang
    label: "phone!!"
    col: 3.3
    row: 0.9
    shape: pill
    tone: rose
    sub: "crash if null"
edges:
  - from: v
    to: safe
  - from: v
    to: elv
  - from: v
    to: chk
```



```kotlin run
fun main() {
    val name: String = "Tendai"
    val phone: String? = null          // may be null

    println(name.length)
    println(phone?.length)             // safe call → null instead of crash
    println(phone ?: "no phone")       // Elvis operator: default value
    val length = phone?.length ?: 0
    println(length)
}
```

```output
6
null
no phone
0
```

This catches "null pointer" bugs at **compile time** — a big reason Android apps written in Kotlin crash less.

# Control Flow {#control-flow}

`if` and `when` are **expressions** — they return values.

```kotlin run
fun grade(mark: Int): String = when {
    mark >= 75 -> "A"
    mark >= 65 -> "B"
    mark >= 50 -> "C"
    else -> "U"
}

fun main() {
    println(grade(81))
    println(grade(55))

    val temp = 33
    val feel = if (temp > 30) "hot" else "pleasant"
    println(feel)

    for (i in 1..3) print("$i ")
    println()
    for (i in 10 downTo 0 step 5) print("$i ")
    println()
}
```

```output
A
C
hot
1 2 3 
10 5 0 
```

# Functions {#functions}

```kotlin run
fun vat(amount: Double, rate: Double = 0.15): Double = amount * rate

fun greet(name: String, title: String? = null) =
    if (title != null) "Mhoro $title $name" else "Mhoro $name"

fun main() {
    println(vat(200.0))
    println(vat(amount = 200.0, rate = 0.1))
    println(greet("Moyo", title = "Mr"))

    val double = { x: Int -> x * 2 }          // lambda
    println(listOf(1, 2, 3).map(double))
}
```

```output
30.0
20.0
Mhoro Mr Moyo
[2, 4, 6]
```

# Classes and Data Classes {#classes}


```sketch
title: "What a data class writes for you"
caption: "One line declares the properties. Kotlin generates equals, hashCode, toString and copy, which you would otherwise write by hand."
cellW: 200
cellH: 85
nodes:
  - id: dc
    label: "data class Product"
    col: 0
    row: 1
    shape: doc
    tone: gold
    sub: "(name, price)"
  - id: eq
    label: "equals / hashCode"
    col: 1.7
    row: 0
    shape: round
    tone: sky
  - id: ts
    label: "toString()"
    col: 1.7
    row: 1
    shape: round
    tone: teal
  - id: cp
    label: "copy(price = 9.0)"
    col: 1.7
    row: 2
    shape: round
    tone: grape
edges:
  - from: dc
    to: eq
  - from: dc
    to: ts
  - from: dc
    to: cp
```

```kotlin run
data class Product(val name: String, val price: Double, val stock: Int = 0)

class Cart {
    private val lines = mutableListOf<Pair<Product, Int>>()
    fun add(product: Product, qty: Int) {
        require(qty > 0) { "qty must be positive" }
        lines.add(product to qty)
    }
    val total: Double get() = lines.sumOf { (p, q) -> p.price * q }
}

fun main() {
    val oil = Product("Cooking oil 2L", 4.2, stock = 12)
    println(oil)                         // data classes print nicely
    println(oil.copy(price = 4.5))       // copy with changes
    val cart = Cart()
    cart.add(oil, 2)
    cart.add(Product("Sugar 2kg", 2.8), 1)
    println("Total: ${"%.2f".format(cart.total)}")
}
```

```output
Product(name=Cooking oil 2L, price=4.2, stock=12)
Product(name=Cooking oil 2L, price=4.5, stock=12)
Total: 11.20
```

**Data classes** automatically get `equals`, `hashCode`, `toString` and `copy` — perfect for app data.

# Collections {#collections}

```kotlin run
data class Learner(val name: String, val city: String, val xp: Int)

fun main() {
    val learners = listOf(
        Learner("Chipo", "Harare", 120), Learner("Sipho", "Bulawayo", 340),
        Learner("Farai", "Harare", 90), Learner("Rudo", "Mutare", 210),
    )
    println(learners.filter { it.xp > 100 }.map { it.name })
    println(learners.maxBy { it.xp }.name)
    println(learners.groupBy { it.city }.mapValues { (_, l) -> l.sumOf { it.xp } })
    println(learners.sortedByDescending { it.xp }.take(2).joinToString { it.name })
}
```

```output
[Chipo, Sipho, Rudo]
Sipho
{Harare=210, Bulawayo=340, Mutare=210}
Sipho, Rudo
```

`it` is the default name for a lambda's single parameter.

# Coroutines {#coroutines}

Apps must not freeze while waiting for the network. **Coroutines** run waiting work without blocking:

```sketch
title: "Suspend instead of block"
caption: "A coroutine pauses at a suspend call such as a network request, freeing the thread for other work, and resumes when the result arrives."
cellW: 190
nodes:
  - id: ui
    label: "Main thread"
    col: 0
    row: 0
    shape: round
    tone: sky
    sub: "keeps drawing"
  - id: l
    label: "launch { }"
    col: 1.5
    row: 0
    shape: round
    tone: gold
  - id: net
    label: "api.getPrices()"
    col: 3
    row: 0
    shape: round
    tone: grape
    sub: "suspends"
  - id: res
    label: "Update UI"
    col: 3
    row: 1.3
    shape: pill
    tone: teal
    sub: "resumes"
edges:
  - from: ui
    to: l
  - from: l
    to: net
  - from: net
    to: res
    label: "result"
```


```kotlin
import kotlinx.coroutines.*

suspend fun fetchPrice(item: String): Double {
    delay(500)          // pretend network call — doesn't block the thread
    return 4.20
}

fun main() = runBlocking {
    val oil = async { fetchPrice("oil") }
    val sugar = async { fetchPrice("sugar") }
    println("Total: ${oil.await() + sugar.await()}")   // both requests ran at the same time
}
```

In Android, `viewModelScope.launch { ... }` starts coroutines tied to a screen's lifetime.

# Kotlin for Android {#android}

A taste of **Jetpack Compose**, Android's modern UI toolkit:

```kotlin
@Composable
fun Greeting(name: String) {
    var count by remember { mutableIntStateOf(0) }
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Mhoro, $name!", style = MaterialTheme.typography.headlineMedium)
        Button(onClick = { count++ }) { Text("Tapped $count times") }
    }
}
```

Continue with the **[Android](/learn/android)** track to build full apps.

````challenge
id: kotlin-fizzbuzz
title: FizzBuzz in Kotlin
difficulty: easy
prompt: |
  Print the numbers 1 to 15, one per line, replacing multiples of 3 with `Fizz`, multiples of 5 with `Buzz`, and multiples of both with `FizzBuzz`. Use `when`.
starter: |
  fun main() {
      for (n in 1..15) {
          // your code
      }
  }
expectedOutput: |
  1
  2
  Fizz
  4
  Buzz
  Fizz
  7
  8
  Fizz
  Buzz
  11
  Fizz
  13
  14
  FizzBuzz
````

```quiz
- q: What does `val` mean in Kotlin?
  options: ["A variable that can change", "A read-only variable", "A function", "A loop"]
  answer: 1
- q: What does `name ?: "unknown"` do?
  options: ["Throws an error", "Uses 'unknown' when name is null", "Compares two strings", "Creates a list"]
  answer: 1
- q: What do data classes generate automatically?
  options: ["Database tables", "equals, hashCode, toString and copy", "Android screens", "Network calls"]
  answer: 1
```

```exam
- q: "Which keyword declares a value that can't be reassigned?"
  options: ["var", "val", "let", "const"]
  answer: 1
- q: "What does `String?` mean?"
  options: ["A string that may be null", "An optional parameter", "A list of strings", "A character"]
  answer: 0
- q: "What does the safe-call operator `?.` do?"
  options: ["Throws if null", "Returns null instead of crashing when the receiver is null", "Converts to string", "Creates a list"]
  answer: 1
- q: "What is `when` in Kotlin?"
  options: ["A loop", "A switch-like expression", "A coroutine", "A class"]
  answer: 1
- q: "Which function runs coroutines concurrently and returns a Deferred?"
  options: ["launch", "async", "delay", "suspend"]
  answer: 1
- q: "What is `it` in `list.map { it * 2 }`?"
  options: ["The list", "The implicit name of a lambda's single parameter", "A keyword for loops", "An index"]
  answer: 1
- q: "What is Kotlin's relationship with Java?"
  options: ["It can't call Java code", "It runs on the JVM and interoperates with Java", "It replaces the JVM", "It compiles to Python"]
  answer: 1
```
