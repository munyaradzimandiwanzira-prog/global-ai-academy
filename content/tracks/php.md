---
id: php
title: PHP
short: PHP
category: languages
level: beginner
language: php
color: "#777BB4"
icon: "🐘"
order: 23
summary: PHP powers a huge share of the web, including WordPress and Laravel apps. Learn syntax, arrays, functions, forms, sessions, databases with PDO, security and modern PHP.
tags: [php, web, backend, laravel, wordpress, server]
---

# PHP Introduction {#intro}

**PHP** is a server-side language for building websites. It runs on the web server, builds HTML and sends it to the browser. It powers **WordPress** (a large share of all websites), many e-commerce sites, and modern apps built with **Laravel**.

```sketch
title: "PHP runs on the server"
caption: "The browser asks for a page; the server runs the PHP, which may query a database, and sends back plain HTML. The browser never sees your PHP code."
cellW: 190
cellH: 100
nodes:
  - id: b
    label: "Browser"
    col: 0
    row: 0.6
    shape: person
  - id: s
    label: "Web server + PHP"
    col: 1.5
    row: 0.6
    shape: round
    tone: gold
    sub: "index.php runs"
  - id: db
    label: "MySQL"
    col: 3
    row: 0
    shape: db
    tone: teal
  - id: html
    label: "HTML only"
    col: 3
    row: 1.2
    shape: doc
    tone: sky
edges:
  - from: b
    to: s
    label: "GET /"
  - from: s
    to: db
    arrow: both
  - from: s
    to: html
    label: "sends back"
```



Many Zimbabwean businesses, schools and NGOs run WordPress or PHP sites — knowing PHP means plenty of local freelance work.

```php run title="Hello, PHP"
<?php
$name = "Rudo";
echo "Mhoro, $name!\n";
echo "2 + 3 = " . (2 + 3) . "\n";
?>
```

```output
Mhoro, Rudo!
2 + 3 = 5
```

## Running PHP

- Install PHP (php.net) and run `php -S localhost:8000` in a folder to start a development server.
- Or use **XAMPP**/**Laragon**, which bundle PHP, Apache and MySQL.

# Variables, Strings and Numbers {#basics}

```php run
<?php
$learner = "Tendai";
$age = 17;
$fees = 350.5;
$enrolled = true;

echo "$learner is $age\n";                      // variables inside double quotes
echo 'Single quotes are literal: $learner' . "\n";
echo strtoupper($learner) . " " . strlen($learner) . "\n";
printf("Fees with VAT: $%.2f\n", $fees * 1.15);
echo intdiv(17, 5) . " " . 17 % 5 . " " . 17 / 5 . "\n";
var_dump($enrolled);
?>
```

```output
Tendai is 17
Single quotes are literal: $learner
TENDAI 6
Fees with VAT: $403.07
3 2 3.4
bool(true)
```

Notice **$403.07**, not $403.08: 350.5 × 1.15 is stored in binary as 403.07499999…, so it rounds down. For money, work in whole **cents** (integers) or use a decimal library such as `brick/money`.

# Arrays {#arrays}

PHP arrays are both lists and dictionaries.

```php run
<?php
$cities = ["Harare", "Bulawayo", "Mutare"];
$cities[] = "Gweru";
echo count($cities) . " cities, first: {$cities[0]}\n";

$prices = ["bread" => 1.10, "milk" => 1.20, "sugar" => 2.80];
$prices["salt"] = 0.50;
foreach ($prices as $item => $price) {
    echo str_pad($item, 6) . " $" . number_format($price, 2) . "\n";
}

$expensive = array_filter($prices, fn($p) => $p > 1);
echo implode(", ", array_keys($expensive)) . "\n";
echo "Total: $" . array_sum($prices) . "\n";
?>
```

```output
4 cities, first: Harare
bread  $1.10
milk   $1.20
sugar  $2.80
salt   $0.50
bread, milk, sugar
Total: $5.6
```

# Control Flow and Functions {#functions}

```php run
<?php
declare(strict_types=1);

function grade(int $mark): string {
    return match (true) {
        $mark >= 75 => "A",
        $mark >= 65 => "B",
        $mark >= 50 => "C",
        default => "U",
    };
}

function vat(float $amount, float $rate = 0.15): float {
    return round($amount * $rate, 2);
}

foreach ([81, 67, 52, 30] as $m) {
    echo "$m → " . grade($m) . "\n";
}
echo vat(200) . "\n";
?>
```

```output
81 → A
67 → B
52 → C
30 → U
30
```

Add `declare(strict_types=1);` and **type hints** to catch mistakes early.

# Forms and Superglobals {#forms}

PHP reads form data from **superglobals**: `$_GET`, `$_POST`, `$_SERVER`, `$_SESSION`.

```php
<!-- contact.php -->
<?php
$errors = [];
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name = trim($_POST["name"] ?? "");
    $email = filter_var($_POST["email"] ?? "", FILTER_VALIDATE_EMAIL);
    if ($name === "") $errors[] = "Name is required";
    if (!$email) $errors[] = "Enter a valid email";
    if (!$errors) {
        // save to database, send email…
        header("Location: thanks.php");   // redirect after POST
        exit;
    }
}
?>
<form method="post">
  <input name="name" value="<?= htmlspecialchars($_POST['name'] ?? '') ?>">
  <input name="email" type="email">
  <button>Send</button>
</form>
<?php foreach ($errors as $e): ?>
  <p class="error"><?= htmlspecialchars($e) ?></p>
<?php endforeach; ?>
```

> **Always** escape output with `htmlspecialchars()` — otherwise users can inject scripts into your page (XSS).

# Sessions and Login {#sessions}


```sketch
title: "How a PHP session works"
caption: "session_start gives the browser a cookie with a random ID. On every later request PHP uses that ID to load the same $_SESSION data."
cellW: 190
nodes:
  - id: lg
    label: "Login form"
    col: 0
    row: 0
    shape: doc
    tone: sky
  - id: chk
    label: "password_verify()"
    col: 1.5
    row: 0
    shape: round
    tone: gold
  - id: ss
    label: "$_SESSION"
    col: 3
    row: 0
    shape: db
    tone: teal
    sub: "user_id = 7"
  - id: ck
    label: "Cookie PHPSESSID"
    col: 1.5
    row: 1.3
    shape: note
    tone: grape
    sub: "random ID only"
  - id: next
    label: "Next request"
    col: 3
    row: 1.3
    shape: round
    tone: sky
edges:
  - from: lg
    to: chk
  - from: chk
    to: ss
    label: "ok"
  - from: chk
    to: ck
  - from: ck
    to: next
  - from: next
    to: ss
    label: "load"
```

```php
<?php
session_start();

// Registration: store a HASH, never the password
$hash = password_hash($_POST["password"], PASSWORD_DEFAULT);

// Login
if (password_verify($_POST["password"], $user["password_hash"])) {
    session_regenerate_id(true);       // prevent session fixation
    $_SESSION["user_id"] = $user["id"];
}

// Protecting a page
if (empty($_SESSION["user_id"])) {
    header("Location: login.php");
    exit;
}
```

# Databases with PDO {#pdo}

**PDO** connects PHP to MySQL, PostgreSQL, SQLite and more. Always use **prepared statements**:

```sketch
title: "Prepared statements"
caption: "The SQL and the values travel separately. The database compiles the SQL first, so a value can never change what the query does."
cellW: 210
cellH: 95
nodes:
  - id: sql
    label: "prepare(\"…WHERE id = ?\")"
    col: 0
    row: 0
    shape: round
    tone: gold
  - id: val
    label: "execute([$id])"
    col: 0
    row: 1.2
    shape: round
    tone: sky
  - id: db
    label: "Database"
    col: 2
    row: 0.6
    shape: db
    tone: teal
    sub: "SQL fixed first"
  - id: rows
    label: "fetchAll()"
    col: 3.4
    row: 0.6
    shape: pill
    tone: grape
edges:
  - from: sql
    to: db
  - from: val
    to: db
    label: "value only"
  - from: db
    to: rows
```


```php
<?php
$pdo = new PDO("mysql:host=localhost;dbname=shop;charset=utf8mb4", "app", getenv("DB_PASSWORD"), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$stmt = $pdo->prepare("SELECT name, price FROM products WHERE category = :cat AND price < :max");
$stmt->execute(["cat" => "groceries", "max" => 10]);
foreach ($stmt as $row) {
    echo htmlspecialchars($row["name"]) . " $" . $row["price"] . "<br>";
}

$insert = $pdo->prepare("INSERT INTO orders (customer_id, total) VALUES (?, ?)");
$insert->execute([42, 18.50]);
```

Prepared statements prevent **SQL injection** — see the [SQL](/learn/sql) track.

# Classes and Modern PHP {#oop}

```php run
<?php
declare(strict_types=1);

final class Product {
    public function __construct(
        public readonly string $name,
        public readonly float $price,
    ) {}
    public function withVat(): float { return round($this->price * 1.15, 2); }
}

enum Status: string {
    case Pending = 'pending';
    case Delivered = 'delivered';
}

$oil = new Product("Cooking oil 2L", 4.20);
echo "{$oil->name}: {$oil->withVat()}\n";
echo Status::Delivered->value . "\n";
?>
```

```output
Cooking oil 2L: 4.83
delivered
```

## The modern PHP ecosystem

- **Composer** — dependency manager (`composer require guzzlehttp/guzzle`).
- **Laravel** — full-featured framework: routing, ORM (Eloquent), auth, queues.
- **Symfony** — robust components and framework.
- **WordPress** — CMS; build themes and plugins for clients.
- **PHPUnit** / **Pest** — testing.

````challenge
id: php-countdown
title: Countdown
difficulty: easy
prompt: |
  Write a PHP program that prints the numbers from **5 down to 1**, one per line, and then `Lift off!`.
starter: |
  <?php
  // your loop here
  ?>
expectedOutput: |
  5
  4
  3
  2
  1
  Lift off!
````

```quiz
- q: Which function prevents XSS when printing user input in HTML?
  options: ["strip_tags only", "htmlspecialchars", "echo", "print_r"]
  answer: 1
- q: How should passwords be stored in PHP?
  options: ["As plain text", "With md5()", "With password_hash()", "In a cookie"]
  answer: 2
- q: Which PHP extension provides prepared statements for many databases?
  options: ["PDO", "GD", "cURL", "JSON"]
  answer: 0
```

```exam
- q: "Where does PHP code run?"
  options: ["In the browser", "On the server", "On the GPU", "In the database"]
  answer: 1
- q: "Which superglobal holds submitted POST form data?"
  options: ["$_GET", "$_POST", "$_SESSION", "$_FORM"]
  answer: 1
- q: "Which tool manages PHP packages?"
  options: ["pip", "Composer", "npm", "Maven"]
  answer: 1
- q: "Which function checks a password against a stored hash?"
  options: ["password_verify", "md5", "hash_equals_password", "crypt_check"]
  answer: 0
- q: "What does `declare(strict_types=1);` do?"
  options: ["Enforces scalar type declarations strictly", "Turns off errors", "Enables sessions", "Minifies code"]
  answer: 0
- q: "Which popular framework is built with PHP?"
  options: ["Django", "Laravel", "Spring", "Rails"]
  answer: 1
- q: "Why call session_regenerate_id(true) after login?"
  options: ["To prevent session fixation", "To log out the user", "To speed up PHP", "To clear the cache"]
  answer: 0
```
