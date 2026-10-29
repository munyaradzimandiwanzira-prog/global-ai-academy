---
id: android
title: Android Development
short: ANDROID
category: mobile
level: intermediate
language: kotlin
color: "#3DDC84"
icon: "🤖"
order: 70
summary: Build Android apps with Kotlin and Jetpack Compose. Project structure, composables, state, navigation, lists, ViewModels, networking, offline storage with Room, performance on low-end phones and publishing to Google Play.
tags: [android, kotlin, jetpack compose, mobile, room, retrofit]
---

# Android Development Today {#intro}

Most Zimbabweans access the internet on an **Android** phone. Apps for mobile money, farming, health, transport and learning reach people where they are.

Modern Android development uses:

| Tool | Purpose |
|---|---|
| **Kotlin** | The recommended language — see the [Kotlin](/learn/kotlin) track |
| **Jetpack Compose** | Declarative UI toolkit (like React for Android) |
| **Android Studio** | The official IDE (see [Other IDEs](/learn/ides)) |
| **Gradle** | Builds the app |
| **Jetpack libraries** | ViewModel, Navigation, Room, WorkManager, DataStore |

## Your first project

1. Install **Android Studio**.
2. **New Project → Empty Activity** (Compose), language Kotlin, minimum SDK around API 24 (covers nearly all phones in use).
3. Run on the **emulator** or a real phone with **USB debugging** turned on (Settings → About → tap *Build number* 7 times → Developer options).

```text
app/
  src/main/
    AndroidManifest.xml      app name, permissions, entry activity
    java/zw/co/academy/...   Kotlin code
      MainActivity.kt
    res/                     icons, strings, themes
  build.gradle.kts           dependencies
```

# Composables {#composables}

UI is built from **composable functions**:

```kotlin
@Composable
fun PriceCard(item: String, price: Double, inStock: Boolean) {
    Card(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item, style = MaterialTheme.typography.titleMedium)
                Text(if (inStock) "In stock" else "Sold out", color = if (inStock) Color(0xFF23807F) else Color.Red)
            }
            Text("$%.2f".format(price), style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun PriceCardPreview() = PriceCard("Roller meal 10kg", 8.50, inStock = true)
```

## Layout building blocks

| Composable | Arranges children |
|---|---|
| `Column` | vertically |
| `Row` | horizontally |
| `Box` | on top of each other |
| `LazyColumn` | a scrolling list that only renders visible items |
| `Scaffold` | standard screen with top bar, bottom bar, FAB |

**Modifiers** (`padding`, `fillMaxWidth`, `clickable`, `background`) decorate composables; their **order matters**.

# State in Compose {#state}

When state changes, Compose **recomposes** (redraws) the affected UI.

```sketch
title: "State drives the UI"
caption: "Compose draws the screen from state. When state changes, only the composables that read it are redrawn (recomposition)."
cellW: 220
cellH: 95
nodes:
  - id: st
    label: "count state"
    col: 0
    row: 0.6
    shape: db
    tone: gold
    sub: "remember { mutableStateOf(0) }"
  - id: ui
    label: "Text(\"$count\")"
    col: 1.8
    row: 0.6
    shape: round
    tone: sky
  - id: ev
    label: "Button onClick"
    col: 1.8
    row: 1.8
    shape: round
    tone: teal
    sub: "count++"
edges:
  - from: st
    to: ui
    label: "read"
  - from: ev
    to: st
    label: "change"
```


```kotlin
@Composable
fun AttendanceCounter() {
    var count by rememberSaveable { mutableIntStateOf(0) }   // survives rotation
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Learners present: $count", style = MaterialTheme.typography.headlineSmall)
        Row {
            Button(onClick = { if (count > 0) count-- }) { Text("−") }
            Spacer(Modifier.width(8.dp))
            Button(onClick = { count++ }) { Text("+") }
        }
    }
}
```

## State hoisting

Keep composables **stateless** where possible: pass the value in and send events out. This makes them reusable and testable.

```kotlin
@Composable
fun SearchBox(query: String, onQueryChange: (String) -> Unit) {
    OutlinedTextField(value = query, onValueChange = onQueryChange, label = { Text("Search products") })
}
```

# Lists {#lists}

```kotlin
data class Product(val id: Int, val name: String, val price: Double, val stock: Int)

@Composable
fun ProductList(products: List<Product>, onClick: (Product) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(8.dp)) {
        items(products, key = { it.id }) { p ->
            ListItem(
                headlineContent = { Text(p.name) },
                supportingContent = { Text("${p.stock} in stock") },
                trailingContent = { Text("$%.2f".format(p.price)) },
                modifier = Modifier.clickable { onClick(p) },
            )
            HorizontalDivider()
        }
    }
}
```

Always provide a stable **`key`** so Compose can track items efficiently.

# ViewModels and Architecture {#architecture}

Recommended architecture separates concerns:

```sketch
title: "Recommended app architecture"
caption: "The UI shows state and sends events. The ViewModel holds UI state and survives rotation. The repository decides whether data comes from the network or the local database."
cellW: 190
cellH: 110
nodes:
  - id: ui
    label: "Composable screen"
    col: 0
    row: 0
    shape: round
    tone: sky
  - id: vm
    label: "ViewModel"
    col: 1.5
    row: 0
    shape: round
    tone: gold
    sub: "StateFlow"
  - id: repo
    label: "Repository"
    col: 3
    row: 0
    shape: round
    tone: grape
  - id: api
    label: "Retrofit API"
    col: 2.4
    row: 1.3
    shape: db
    tone: teal
  - id: room
    label: "Room DB"
    col: 3.6
    row: 1.3
    shape: db
    tone: teal
edges:
  - from: ui
    to: vm
    label: "events · state"
    arrow: both
  - from: vm
    to: repo
  - from: repo
    to: api
  - from: repo
    to: room
```



```text
 UI (Composables)  ──events──▶  ViewModel  ──▶  Repository  ──▶  Network (Retrofit)
        ▲                          │                    └────▶  Database (Room)
        └────── UI state ──────────┘
```

```kotlin
data class ProductsUiState(val loading: Boolean = true, val products: List<Product> = emptyList(), val error: String? = null)

class ProductsViewModel(private val repo: ProductRepository) : ViewModel() {
    private val _state = MutableStateFlow(ProductsUiState())
    val state: StateFlow<ProductsUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        runCatching { repo.getProducts() }
            .onSuccess { list -> _state.update { it.copy(loading = false, products = list) } }
            .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
    }
}

@Composable
fun ProductsScreen(vm: ProductsViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    when {
        state.loading -> CircularProgressIndicator()
        state.error != null -> Text("Couldn't load products. Pull to retry.")
        else -> ProductList(state.products, onClick = {})
    }
}
```

The ViewModel **survives screen rotation** and keeps network calls off the UI.

# Networking with Retrofit {#networking}

```kotlin
interface ShopApi {
    @GET("api/products")
    suspend fun products(@Query("max_price") maxPrice: Double? = null): List<Product>

    @POST("api/orders")
    suspend fun createOrder(@Body order: OrderRequest): OrderResponse
}

val api: ShopApi = Retrofit.Builder()
    .baseUrl("https://api.zimtraders.co.zw/")
    .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
    .build()
    .create(ShopApi::class.java)
```

Add `<uses-permission android:name="android.permission.INTERNET"/>` to the manifest. Never put secret API keys inside an app — anyone can extract them. Call **your own backend**.

# Offline-First with Room {#offline}

Connectivity can be patchy and data is expensive. **Offline-first** apps read from a local database and sync when online.

```sketch
title: "The database is the source of truth"
caption: "The UI always reads from Room. The network refreshes Room in the background, so the app works offline and updates when data arrives."
cellW: 175
nodes:
  - id: ui
    label: "UI"
    col: 0
    row: 0.6
    shape: round
    tone: sky
  - id: room
    label: "Room"
    col: 1.5
    row: 0.6
    shape: db
    tone: gold
    sub: "source of truth"
  - id: sync
    label: "Sync worker"
    col: 3
    row: 0.6
    shape: round
    tone: grape
    sub: "when online"
  - id: api
    label: "Server"
    col: 4.3
    row: 0.6
    shape: db
    tone: teal
edges:
  - from: room
    to: ui
    label: "Flow"
  - from: sync
    to: room
    label: "write"
  - from: api
    to: sync
    label: "fetch"
```


```kotlin
@Entity data class ProductEntity(@PrimaryKey val id: Int, val name: String, val price: Double, val updatedAt: Long)

@Dao interface ProductDao {
    @Query("SELECT * FROM ProductEntity ORDER BY name") fun observeAll(): Flow<List<ProductEntity>>
    @Upsert suspend fun upsertAll(items: List<ProductEntity>)
}

class ProductRepository(private val api: ShopApi, private val dao: ProductDao) {
    val products: Flow<List<ProductEntity>> = dao.observeAll()          // UI always reads local data
    suspend fun sync() = dao.upsertAll(api.products().map { it.toEntity() })  // refresh when online
}
```

Use **WorkManager** to sync in the background when the phone has a connection (optionally only on Wi-Fi), and **DataStore** for small settings.

# Performance on Everyday Phones {#performance}

Many users have entry-level phones with little RAM and storage:

- Keep the **APK small**: enable R8/minification, use vector icons, compress images (WebP).
- Load images efficiently with **Coil** and appropriate sizes.
- Avoid heavy work on the main thread — use coroutines.
- Cache network responses; let users choose "Wi-Fi only" for big downloads.
- Test on a **low-end device**, not just your best phone.
- Support **dark mode** and **large font sizes** for accessibility.

# Publishing to Google Play {#publishing}

1. Create a **Google Play Console** account (one-time registration fee).
2. Generate a signed **Android App Bundle** (`.aab`): Build → Generate Signed App Bundle. **Back up your upload key.**
3. Complete the store listing: description, screenshots, privacy policy, content rating, data-safety form.
4. Release to **internal testing**, then **closed testing** with real users, then **production**.
5. Monitor **Android vitals** (crashes, ANRs) and reviews.

New personal developer accounts must run a closed test with testers before production — plan time for this.

```quiz
- q: Which component survives screen rotation and holds UI state?
  options: ["Activity", "ViewModel", "Composable", "Manifest"]
  answer: 1
- q: Why is offline-first important for apps in Zimbabwe?
  options: ["It looks nicer", "Connectivity can be patchy and data expensive", "Google requires it", "It makes apps bigger"]
  answer: 1
- q: Where should secret API keys live for an Android app?
  options: ["In the app's code", "In strings.xml", "On your own backend server", "In the app icon"]
  answer: 2
```

````challenge
id: android-cart-logic
title: Cart logic (Kotlin)
difficulty: easy
prompt: |
  Business logic is written and tested separately from the UI. Write a Kotlin program that calculates the total of this cart and prints it with **2 decimals**: 2 × roller meal at $8.50 and 3 × sugar at $2.80.
starter: |
  fun main() {
      val cart = listOf(Pair(8.50, 2), Pair(2.80, 3))
      // print the total with 2 decimals
  }
expectedOutput: "25.40"
````

```exam
- q: "Which UI toolkit is modern Android's default?"
  options: ["Jetpack Compose", "Swing", "UIKit", "jQuery"]
  answer: 0
- q: "Which composable renders long scrolling lists efficiently?"
  options: ["LazyColumn", "Column", "Box", "Row"]
  answer: 0
- q: "What does rememberSaveable add over remember?"
  options: ["State survives configuration changes like rotation", "Encryption", "Network access", "Animation"]
  answer: 0
- q: "Which library is commonly used for local databases on Android?"
  options: ["Room", "Retrofit", "Coil", "Gradle"]
  answer: 0
- q: "Which library schedules background sync when connectivity is available?"
  options: ["WorkManager", "Room", "Compose", "Coil"]
  answer: 0
- q: "What file format do you upload to Google Play?"
  options: [".aab (Android App Bundle)", ".exe", ".ipa", ".zip"]
  answer: 0
- q: "Why test on a low-end phone?"
  options: ["Many users have entry-level devices", "Emulators are banned", "It's faster", "Google requires it"]
  answer: 0
```
