---
id: ios-swift
title: iOS & Swift
short: iOS
category: mobile
level: intermediate
language: swift
color: "#F05138"
icon: "🍎"
order: 71
summary: Build iPhone apps with Swift and SwiftUI. Swift fundamentals, optionals, structs and protocols, SwiftUI views and state, lists and navigation, async networking, data persistence and App Store publishing.
tags: [ios, swift, swiftui, iphone, mobile, apple]
---

# Swift and iOS {#intro}

**Swift** is Apple's language for iPhone, iPad, Mac, Apple Watch and Apple TV apps. **SwiftUI** is Apple's modern declarative UI framework.

iOS apps are valuable for reaching diaspora users and international clients, and iOS skills are in demand for **remote work**.

## What you need

- **A Mac** with **Xcode** to build and publish iOS apps.
- No Mac yet? Learn Swift the language now: on an iPad with **Swift Playgrounds**, or on Linux/Windows with the Swift toolchain from swift.org. The language skills transfer directly.

```swift run title="Hello, Swift"
let city = "Victoria Falls"
var visitors = 1200
visitors += 300
print("Welcome to \(city)! Visitors today: \(visitors)")
```

```output
Welcome to Victoria Falls! Visitors today: 1500
```

# Swift Fundamentals {#fundamentals}

```swift run
let name = "Tariro"            // constant
var score = 82                 // variable
let price: Double = 4.20       // explicit type
let subjects = ["Maths", "CS"]
let fees = ["Term 1": 350.0, "Term 2": 350.0]

func grade(_ mark: Int) -> String {
    switch mark {
    case 75...: return "A"
    case 65..<75: return "B"
    case 50..<65: return "C"
    default: return "U"
    }
}

print("\(name): \(grade(score))")
for s in subjects { print("Studying \(s)") }
print(fees["Term 1"] ?? 0)
let doubled = [1, 2, 3].map { $0 * 2 }
print(doubled)
```

```output
Tariro: A
Studying Maths
Studying CS
350.0
[2, 4, 6]
```

Use `let` by default; use `var` only when the value changes.

# Optionals {#optionals}

An **optional** may hold a value or `nil`. Swift forces you to handle the `nil` case — preventing crashes.

```swift run
let phone: String? = nil
let email: String? = "rudo@example.com"

if let email {
    print("Email: \(email)")
}
print("Phone: \(phone ?? "not provided")")

func greet(_ name: String?) -> String {
    guard let name, !name.isEmpty else { return "Mhoro, friend!" }
    return "Mhoro, \(name)!"
}
print(greet("Sipho"))
print(greet(nil))
```

```output
Email: rudo@example.com
Phone: not provided
Mhoro, Sipho!
Mhoro, friend!
```

# Structs, Classes and Protocols {#types}

Swift favours **structs** (value types) for data, and **protocols** to describe abilities.

```swift run
protocol Payable {
    func pay(_ amount: Double) -> String
}

struct EcoCash: Payable {
    let phone: String
    func pay(_ amount: Double) -> String { "Prompted \(phone) for $\(amount)" }
}

struct Card: Payable {
    let last4: String
    func pay(_ amount: Double) -> String { "Charged card ••\(last4) $\(amount)" }
}

struct Product: Identifiable, Codable {
    let id: Int
    var name: String
    var price: Double
}

let methods: [Payable] = [EcoCash(phone: "0772123456"), Card(last4: "4242")]
for m in methods { print(m.pay(15)) }

var oil = Product(id: 1, name: "Cooking oil", price: 4.2)
oil.price = 4.5
print(oil.name, oil.price)
```

```output
Prompted 0772123456 for $15.0
Charged card ••4242 $15.0
Cooking oil 4.5
```

`Codable` lets Swift convert the struct to and from JSON automatically.

# SwiftUI Views and State {#swiftui}

```swift
import SwiftUI

struct AttendanceView: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 16) {
            Text("Learners present")
                .font(.headline)
            Text("\(count)")
                .font(.system(size: 56, weight: .bold, design: .rounded))
            HStack {
                Button("−") { if count > 0 { count -= 1 } }
                    .buttonStyle(.bordered)
                Button("+") { count += 1 }
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}

#Preview { AttendanceView() }
```

| SwiftUI | Arranges |
|---|---|
| `VStack` / `HStack` / `ZStack` | vertical / horizontal / layered |
| `List` | scrolling rows |
| `NavigationStack` | screens with back navigation |
| `TabView` | bottom tabs |

Property wrappers manage state: `@State` (local), `@Binding` (passed from a parent), `@Observable` classes (shared models), `@Environment` (app-wide values).

# Lists and Navigation {#navigation}

```swift
struct ProductListView: View {
    let products: [Product]

    var body: some View {
        NavigationStack {
            List(products) { product in
                NavigationLink(value: product.id) {
                    HStack {
                        Text(product.name)
                        Spacer()
                        Text(product.price, format: .currency(code: "USD"))
                    }
                }
            }
            .navigationTitle("Products")
            .navigationDestination(for: Int.self) { id in
                ProductDetailView(productID: id)
            }
        }
    }
}
```

# Networking with async/await {#networking}

```swift
@Observable
final class ProductStore {
    var products: [Product] = []
    var error: String?

    func load() async {
        do {
            let url = URL(string: "https://api.zimtraders.co.zw/api/products")!
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            products = try JSONDecoder().decode([Product].self, from: data)
        } catch {
            self.error = "Couldn't load products. Check your connection."
        }
    }
}

struct ProductsScreen: View {
    @State private var store = ProductStore()
    var body: some View {
        ProductListView(products: store.products)
            .task { await store.load() }
            .refreshable { await store.load() }
    }
}
```

# Saving Data {#persistence}

| Need | Use |
|---|---|
| Small settings | `@AppStorage` / `UserDefaults` |
| Structured app data | **SwiftData** (or Core Data) |
| Files | `FileManager` |
| Secrets (tokens) | **Keychain** |

```swift
import SwiftData

@Model
final class Order {
    var item: String
    var qty: Int
    var createdAt: Date
    init(item: String, qty: Int) { self.item = item; self.qty = qty; self.createdAt = .now }
}
```

Never store passwords or tokens in `UserDefaults` — use the Keychain.

# Publishing to the App Store {#publishing}

1. Join the **Apple Developer Program** (yearly fee).
2. In Xcode set your **bundle identifier**, app icon, version and signing team.
3. **Product → Archive**, then upload to **App Store Connect**.
4. Test with **TestFlight** — invite testers by email or public link.
5. Complete the listing: screenshots, description, **privacy "nutrition label"**, age rating.
6. Submit for **App Review** — follow Apple's guidelines (clear purpose, working features, privacy policy).

```quiz
- q: What does `name ?? "friend"` do in Swift?
  options: ["Throws an error", "Uses 'friend' when name is nil", "Joins two strings", "Creates an optional"]
  answer: 1
- q: Which property wrapper holds simple local view state in SwiftUI?
  options: ["@State", "@Model", "@Codable", "@Keychain"]
  answer: 0
- q: Where should an iOS app store a login token?
  options: ["UserDefaults", "Keychain", "A text file", "The app icon"]
  answer: 1
```

````challenge
id: swift-sum
title: Sum the cart
difficulty: easy
prompt: |
  Use `reduce` to print the total of the prices array.
starter: |
  let prices = [8.5, 4.25, 2.75]
  // print the total
expectedOutput: "15.5"
````

```exam
- q: "What does `let` declare in Swift?"
  options: ["A constant", "A variable", "A function", "A class"]
  answer: 0
- q: "What is an optional?"
  options: ["A value that may be nil", "A default argument", "A private method", "A loop"]
  answer: 0
- q: "What does `guard let` help with?"
  options: ["Exiting early when a value is missing", "Creating arrays", "Styling views", "Networking"]
  answer: 0
- q: "Which protocol lets Swift types convert to and from JSON?"
  options: ["Codable", "Identifiable", "Equatable", "View"]
  answer: 0
- q: "Which SwiftUI container stacks views vertically?"
  options: ["VStack", "HStack", "ZStack", "List"]
  answer: 0
- q: "Which service lets testers try your app before release?"
  options: ["TestFlight", "App Store Connect Ads", "Xcode Cloud only", "Safari"]
  answer: 0
- q: "Which framework stores structured app data in modern SwiftUI apps?"
  options: ["SwiftData", "UserDefaults", "Keychain", "URLSession"]
  answer: 0
```
