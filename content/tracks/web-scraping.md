---
id: web-scraping
title: Web Crawling & Scraping
short: SCRAPING
category: maths-data
level: intermediate
language: python
color: "#4A5B23"
icon: "🕷️"
order: 32
premium: true
preview: 3
summary: Collect web data responsibly and reliably. HTTP for scrapers, parsing HTML with Beautiful Soup, polite crawlers with robots.txt and rate limits, JavaScript-heavy sites, LLM-powered extraction into validated schemas, and pipelines that feed analytics and RAG, all practised on safe built-in pages.
tags: [web scraping, web crawling, beautiful soup, playwright, robots.txt, data extraction, llm extraction, rag ingestion, scrapy]
---

# Crawling vs Scraping, and the Rules {#intro}

- **Crawling** is *discovering* pages: start from some URLs, follow links, decide what to visit next. Search engines crawl.
- **Scraping** is *extracting* data from pages: prices from a product page, the text of an article, rows of a table.

Most projects do both: a crawler finds pages and a scraper pulls data from each.

```sketch
title: A scraping pipeline
caption: Discovery, polite fetching, extraction and validation are separate stages, each testable and each a place where things break.
cellW: 150
cellH: 105
nodes:
  - id: seeds
    label: Seed URLs
    sub: sitemap · start page
    col: 0
    row: 0
    shape: doc
  - id: frontier
    label: Frontier
    sub: queue of URLs
    col: 1.15
    row: 0
    shape: db
    tone: sky
  - id: rules
    label: "robots.txt\nrate limit"
    col: 1.15
    row: 1.2
    shape: diamond
    tone: rose
    w: 1
    h: 1
  - id: fetch
    label: Fetch
    sub: HTTP / browser
    col: 2.3
    row: 0
    shape: round
    tone: teal
  - id: parse
    label: Parse & extract
    sub: selectors · LLM
    col: 3.45
    row: 0
    shape: round
    tone: grape
  - id: links
    label: New links
    col: 2.3
    row: 1.2
    shape: note
  - id: valid
    label: "Validate\n& dedupe"
    col: 4.6
    row: 0
    shape: diamond
    tone: gold
    w: 0.95
    h: 1
  - id: store
    label: Store
    sub: DB · files · vectors
    col: 4.6
    row: 1.3
    shape: db
    tone: teal
edges:
  - from: seeds
    to: frontier
  - from: frontier
    to: rules
  - from: rules
    to: fetch
    label: allowed
  - from: fetch
    to: parse
  - from: parse
    to: links
  - from: links
    to: frontier
  - from: parse
    to: valid
  - from: valid
    to: store
```

## Use cases

| Use | Example |
|---|---|
| **Price and stock monitoring** | Track grocery prices across shops for a cost-of-living dashboard |
| **Research datasets** | Collect public tender notices, job adverts or news headlines |
| **RAG ingestion** | Crawl your organisation's documentation into a knowledge base |
| **Lead and market research** | Directories of businesses (mind personal-data law) |
| **Monitoring** | Get alerted when a regulation page or exam timetable changes |

## Responsible scraping: check before you collect

1. **Is there an API or a data download?** Use it: it's more reliable and clearly permitted.
2. **Read the site's terms** and **robots.txt**. Respect disallowed paths and crawl delays.
3. **Personal data** is regulated: Zimbabwe's Cyber and Data Protection Act, the EU GDPR and others limit collecting and using information about people. Avoid it unless you have a lawful basis.
4. **Copyright**: facts (prices, dates) are usually fine to collect; copying whole articles or images and republishing them usually is not.
5. **Be polite**: identify your bot in the User-Agent, rate-limit, cache, and crawl off-peak. Never overload a site.
6. **Never bypass logins, paywalls or CAPTCHAs** you aren't authorised to pass.

> When in doubt, ask the site owner. Many will give you a feed or export if you explain your project.

```quiz
- q: What's the difference between crawling and scraping?
  options: ["None", "Crawling discovers pages by following links; scraping extracts data from pages", "Scraping is illegal, crawling isn't", "Crawling uses AI"]
  answer: 1
- q: A site offers a public JSON API with the data you need. What should you do?
  options: ["Scrape the HTML anyway", "Use the API", "Use both at full speed", "Ignore its terms"]
  answer: 1
- q: Which data needs special care under data-protection law?
  options: ["Product prices", "Personal information about individuals", "Public bus timetables", "Weather data"]
  answer: 1
```

# How the Web Works for Scrapers {#http}

A browser loading a page makes an **HTTP request** and receives a **response**: a status code, headers, and a body (HTML, JSON, images…). Then it runs JavaScript, which may make **more** requests to load data. A scraper does the same steps in code.

| Part | What to know |
|---|---|
| **URL** | Scheme, host, path, query string (`?page=2&q=maize`) |
| **Method** | `GET` to read; `POST` to submit forms |
| **Headers** | `User-Agent` (identify your bot), `Accept`, `Accept-Language`, cookies |
| **Status** | 200 OK, 301/302 redirect, 404 not found, 429 slow down, 5xx server errors |
| **Body** | HTML to parse, or JSON from an API |

## The data is often in an API already

Open the browser's **DevTools → Network** tab, filter by **Fetch/XHR**, and reload. Many "dynamic" pages load their data from a JSON endpoint you can call directly: cleaner and lighter than parsing HTML.

```python
# Fetching a page politely with httpx
import httpx

HEADERS = {"User-Agent": "SkuruPriceBot/1.0 (+https://skurulearning.com/bot; contact admin@skurulearning.com)"}

with httpx.Client(headers=HEADERS, timeout=httpx.Timeout(10.0, connect=5.0), follow_redirects=True) as client:
    r = client.get("https://example.com/products", params={"category": "groceries", "page": 1})
    r.raise_for_status()
    html = r.text            # or r.json() for an API
```

## URLs: join, normalise and stay in scope

Links in HTML are often **relative** (`../prices.html`). Turn them into absolute URLs, drop fragments (`#section`), and normalise them so you don't visit the same page twice.

```python run title="Resolve and normalise links"
from urllib.parse import urljoin, urlparse, urlunparse, parse_qsl, urlencode

base = "https://shop.example.co.zw/groceries/staples/index.html"
links = ["../dairy/milk.html", "/about", "roller-meal.html#reviews", "HTTPS://Shop.Example.co.zw/groceries/staples/roller-meal.html",
         "https://twitter.com/zimfresh", "oil.html?utm_source=fb&size=2L", "mailto:info@example.co.zw"]

def normalise(url):
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return None
    query = urlencode(sorted((k, v) for k, v in parse_qsl(p.query) if not k.startswith("utm_")))   # drop tracking params
    path = p.path or "/"
    return urlunparse((p.scheme.lower(), p.netloc.lower(), path, "", query, ""))                   # drop #fragment

def in_scope(url, host="shop.example.co.zw"):
    return urlparse(url).netloc == host

seen = set()
for link in links:
    absolute = urljoin(base, link)
    norm = normalise(absolute)
    status = "skip (not http)" if norm is None else "skip (other site)" if not in_scope(norm) else "skip (duplicate)" if norm in seen else "queue"
    if status == "queue":
        seen.add(norm)
    print(f"{link:62} -> {status:18} {norm or ''}")
```

```quiz
- q: Where do you often find a page's data in a cleaner form?
  options: ["In the CSS", "In JSON requests visible in DevTools → Network", "In the favicon", "In cookies"]
  answer: 1
- q: Why normalise URLs before adding them to the frontier?
  options: ["To make them shorter", "So the same page under different spellings (case, fragments, tracking params) isn't fetched twice", "It's required by HTTP", "To hide them"]
  answer: 1
- q: What should your User-Agent contain?
  options: ["A fake browser string", "Your bot's name and a way to contact you", "Nothing", "Your password"]
  answer: 1
```

# Parsing HTML with Beautiful Soup {#parsing}

**Beautiful Soup** turns HTML into a tree you can search. You find elements by **tag**, **class**, **id**, **attributes** or **CSS selectors**, then read their text and attributes.

```sketch
title: "From HTML to rows"
caption: "Beautiful Soup parses the page into a tree. CSS selectors find the elements you want; you pull out text and attributes and store clean rows."
cellW: 185
nodes:
  - id: html
    label: "HTML"
    col: 0
    row: 0
    shape: doc
    tone: sky
  - id: soup
    label: "Parse tree"
    col: 1.3
    row: 0
    shape: round
    tone: gold
    sub: "BeautifulSoup"
  - id: sel
    label: "select(\"tr.price\")"
    col: 2.6
    row: 0
    shape: round
    tone: grape
  - id: rows
    label: "Rows"
    col: 3.9
    row: 0
    shape: db
    tone: teal
    sub: "crop · market · price"
edges:
  - from: html
    to: soup
  - from: soup
    to: sel
  - from: sel
    to: rows
    label: ".get_text()"
```


| Method | Returns | Example |
|---|---|---|
| `soup.find("h1")` | First match or `None` | The page title |
| `soup.find_all("tr")` | List of matches | All table rows |
| `soup.select("div.product .price")` | List, by CSS selector | Prices inside product cards |
| `soup.select_one("#total")` | First match by CSS selector | The element with id `total` |
| `el.get_text(" ", strip=True)` | Clean text | |
| `el.get("href")` / `el["href"]` | Attribute value | |

```python run title="Scrape product cards from a page"
from bs4 import BeautifulSoup

html = """
<html><body>
  <h1>ZimFresh Avondale: Staples</h1>
  <div class="product" data-sku="RM10">
    <h2 class="name">Roller meal 10kg</h2><span class="price">$8.50</span>
    <span class="stock in">In stock</span><a href="/p/rm10">Details</a>
  </div>
  <div class="product" data-sku="OIL2">
    <h2 class="name">Cooking oil 2L</h2><span class="price">US$ 4.20</span>
    <span class="stock out">Out of stock</span><a href="/p/oil2">Details</a>
  </div>
  <div class="product promo" data-sku="SUG2">
    <h2 class="name">Sugar 2kg</h2><span class="price"><s>$3.10</s> $2.80</span>
    <span class="stock in">In stock</span><a href="/p/sug2">Details</a>
  </div>
</body></html>
"""
soup = BeautifulSoup(html, "html.parser")
print(soup.find("h1").get_text(strip=True))

def parse_price(el):
    struck = el.find("s")
    if struck:
        struck.extract()                       # remove the old price
    digits = "".join(ch for ch in el.get_text() if ch.isdigit() or ch == ".")
    return float(digits)

for card in soup.select("div.product"):
    print({
        "sku": card["data-sku"],
        "name": card.select_one(".name").get_text(strip=True),
        "price_usd": parse_price(card.select_one(".price")),
        "in_stock": "in" in card.select_one(".stock")["class"],
        "url": card.find("a")["href"],
        "promo": "promo" in card["class"],
    })
```

## Tables to rows

```python run title="Turn an HTML table into records"
from bs4 import BeautifulSoup

html = """<table id="fuel">
<thead><tr><th>City</th><th>Petrol (USD/L)</th><th>Diesel (USD/L)</th></tr></thead>
<tbody>
<tr><td>Harare</td><td>1.55</td><td>1.52</td></tr>
<tr><td>Bulawayo</td><td>1.57</td><td>1.53</td></tr>
<tr><td>Mutare</td><td>1.58</td><td>n/a</td></tr>
</tbody></table>"""

soup = BeautifulSoup(html, "html.parser")
table = soup.select_one("table#fuel")
headers = [th.get_text(strip=True) for th in table.select("thead th")]
rows = []
for tr in table.select("tbody tr"):
    cells = [td.get_text(strip=True) for td in tr.find_all("td")]
    record = dict(zip(headers, cells))
    for k in headers[1:]:
        record[k] = float(record[k]) if record[k].replace(".", "", 1).isdigit() else None
    rows.append(record)
for r in rows:
    print(r)
```

## Writing selectors that survive redesigns

- Prefer **stable hooks**: ids, `data-*` attributes, semantic tags, over long chains like `div > div:nth-child(3) > span`.
- Extract **defensively**: check for `None` before reading text; one missing element shouldn't crash the run.
- **Test selectors** against saved HTML snapshots, so a site change shows up as a failing test instead of silently wrong data.

```exercise
prompt: Select every element with class price inside product cards, using a CSS selector.
code: |
  prices = soup.___("div.product .price")
answers: [select]
```

````challenge
id: scraping-parse-jobs
title: Scrape a job board
difficulty: medium
prompt: |
  Write `parse_jobs(html)` returning a list of dicts, one per `<li class="job">`, with keys:
  - `"title"`: text of `.title`,
  - `"company"`: text of `.company`,
  - `"city"`: text of `.city`, or `None` if missing,
  - `"salary"`: integer USD from `.salary` (e.g. `"$1,200 / month"` → `1200`), or `None` if missing or not a number,
  - `"remote"`: `True` if the job element has the class `remote`.
  Skip any job without a title.
starter: |
  from bs4 import BeautifulSoup

  def parse_jobs(html):
      soup = BeautifulSoup(html, "html.parser")
      return []

  print(parse_jobs('<ul><li class="job"><span class="title">Data Analyst</span><span class="company">MoneyLink</span></li></ul>'))
tests: |
  html = """<ul>
  <li class="job remote"><span class="title"> Python Developer </span><span class="company">Skuru</span><span class="city">Harare</span><span class="salary">$1,200 / month</span></li>
  <li class="job"><span class="title">Data Analyst</span><span class="company">MoneyLink</span><span class="salary">Negotiable</span></li>
  <li class="job"><span class="company">Ghost Ltd</span></li>
  <li class="job"><span class="title">Graph Engineer</span><span class="company">ZimFresh</span><span class="city">Bulawayo</span><span class="salary">$2000</span></li>
  </ul>"""
  r = parse_jobs(html)
  assert len(r) == 3, r
  assert r[0] == {"title": "Python Developer", "company": "Skuru", "city": "Harare", "salary": 1200, "remote": True}, r[0]
  assert r[1] == {"title": "Data Analyst", "company": "MoneyLink", "city": None, "salary": None, "remote": False}, r[1]
  assert r[2]["salary"] == 2000 and r[2]["city"] == "Bulawayo"
````

```quiz
- q: soup.find('h2') returns what if there is no h2?
  options: ["An empty string", "None", "An exception always", "A list"]
  answer: 1
- q: Which selector is most robust to redesigns?
  options: ["div > div:nth-child(3) > span", "[data-sku] or an id", "The 7th span on the page", "A full XPath from the root"]
  answer: 1
```

# Building a Polite Crawler {#crawler}

A crawler keeps a **frontier** (URLs to visit) and a **visited** set, fetches pages, extracts links, and adds new in-scope links to the frontier. **Breadth-first** order visits pages closest to the start first, which usually finds the most important pages early.

```sketch
title: "A crawler's frontier"
caption: "Take a URL from the queue, check robots.txt and the rate limit, fetch and parse it, then add new in-scope links you have not seen."
cellW: 185
cellH: 95
nodes:
  - id: q
    label: "URL queue"
    col: 0
    row: 0.6
    shape: db
    tone: sky
  - id: ok
    label: "Allowed?"
    col: 1.4
    row: 0.6
    shape: diamond
    tone: gold
    sub: "robots.txt · scope"
  - id: f
    label: "Fetch + wait"
    col: 2.8
    row: 0
    shape: round
    tone: teal
    sub: "1 req / sec"
  - id: p
    label: "Parse links"
    col: 2.8
    row: 1.3
    shape: round
    tone: grape
  - id: seen
    label: "Seen set"
    col: 1.4
    row: 2
    shape: db
edges:
  - from: q
    to: ok
  - from: ok
    to: f
    label: "yes"
  - from: f
    to: p
  - from: p
    to: seen
    label: "new?"
  - from: seen
    to: q
    label: "add"
```


## Politeness rules

| Rule | Implementation |
|---|---|
| Obey **robots.txt** | `urllib.robotparser`; skip disallowed paths; honour `Crawl-delay` |
| **Rate-limit** per host | At most one request every N seconds per domain |
| **Limit scope** | Stay on allowed domains; cap depth and total pages |
| **Retry carefully** | Back off on 429/5xx; give up after a few tries |
| **Cache** | Don't re-download unchanged pages (use `ETag` / `Last-Modified`) |
| **Use sitemaps** | `sitemap.xml` lists pages the owner wants found |

```python run title="Read robots.txt rules"
from urllib.robotparser import RobotFileParser

robots_txt = """
User-agent: *
Disallow: /checkout/
Disallow: /account/
Crawl-delay: 2

User-agent: BadBot
Disallow: /
"""
rp = RobotFileParser()
rp.parse(robots_txt.splitlines())
agent = "SkuruPriceBot"
for path in ("/groceries/staples/", "/checkout/cart", "/account/orders", "/p/rm10"):
    print(f"{path:22} allowed={rp.can_fetch(agent, 'https://shop.example.co.zw' + path)}")
print("crawl delay:", rp.crawl_delay(agent), "seconds;  BadBot may fetch /p/rm10:", rp.can_fetch("BadBot", "https://shop.example.co.zw/p/rm10"))
```

```python run title="A breadth-first crawler over a simulated site"
from collections import deque
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
from bs4 import BeautifulSoup

SITE = {   # path -> HTML (a tiny website kept in memory)
    "/": '<a href="/groceries/">Groceries</a> <a href="/about">About</a> <a href="https://facebook.com/zf">FB</a>',
    "/groceries/": '<a href="staples/">Staples</a> <a href="dairy/">Dairy</a> <a href="/checkout/">Cart</a>',
    "/groceries/staples/": '<div class="product">Roller meal $8.50</div><a href="/p/rm10">RM10</a><a href="/groceries/">Back</a>',
    "/groceries/dairy/": '<div class="product">Milk 1L $0.95</div><a href="/p/mlk1">MLK1</a>',
    "/p/rm10": '<h1>Roller meal 10kg</h1><span class="price">$8.50</span>',
    "/p/mlk1": '<h1>Milk 1L</h1><span class="price">$0.95</span>',
    "/about": "<p>Family-owned since 1998.</p>",
    "/checkout/": "<p>Cart</p>",
}
HOST = "https://shop.example.co.zw"
rp = RobotFileParser()
rp.parse(["User-agent: *", "Disallow: /checkout/"])

def fetch(url):
    path = urlparse(url).path
    return (200, SITE[path]) if path in SITE else (404, "")

def crawl(start, max_pages=20, max_depth=3):
    frontier, seen, results = deque([(start, 0)]), {start}, []
    while frontier and len(results) < max_pages:
        url, depth = frontier.popleft()
        if not rp.can_fetch("SkuruBot", url):
            print(f"  robots.txt blocks {url}")
            continue
        status, html = fetch(url)              # real crawler: sleep(crawl_delay) per host here
        results.append((depth, urlparse(url).path, status))
        if status != 200 or depth == max_depth:
            continue
        for a in BeautifulSoup(html, "html.parser").find_all("a", href=True):
            link = urljoin(url, a["href"]).split("#")[0]
            if urlparse(link).netloc == urlparse(start).netloc and link not in seen:
                seen.add(link)
                frontier.append((link, depth + 1))
    return results

for depth, path, status in crawl(HOST + "/"):
    print(f"depth {depth}  {status}  {path}")
```

```quiz
- q: Which data structure gives breadth-first crawling?
  options: ["A stack (LIFO)", "A queue (FIFO)", "A set", "A heap of random numbers"]
  answer: 1
- q: robots.txt says Crawl-delay 2. What should your crawler do?
  options: ["Ignore it", "Wait at least 2 seconds between requests to that site", "Crawl twice as fast", "Stop crawling"]
  answer: 1
- q: Why keep a seen set separate from the frontier?
  options: ["To sort URLs", "To avoid queueing and fetching the same URL more than once", "To store HTML", "For robots.txt"]
  answer: 1
```

# JavaScript-Heavy Sites {#dynamic}

Some pages arrive almost empty and build their content with JavaScript. If `httpx` returns HTML without the data you see in the browser:

1. **Look for the API** in DevTools → Network (Fetch/XHR). Calling that JSON endpoint is best.
2. Look for **embedded JSON** in the HTML (`<script type="application/ld+json">`, `window.__INITIAL_STATE__ = {...}`).
3. Only then use a **headless browser** such as **Playwright**, which runs the page's JavaScript like a real browser.

```python run title="Data hiding in embedded JSON"
import json, re
from bs4 import BeautifulSoup

html = """<html><head>
<script type="application/ld+json">{"@type": "Product", "name": "Solar lantern", "sku": "SL-01",
  "offers": {"price": "15.00", "priceCurrency": "USD", "availability": "InStock"}}</script>
</head><body><div id="app"></div>
<script>window.__INITIAL_STATE__ = {"reviews": [{"stars": 5, "text": "Bright!"}, {"stars": 4, "text": "Good value"}]};</script>
</body></html>"""

soup = BeautifulSoup(html, "html.parser")
product = json.loads(soup.find("script", type="application/ld+json").string)
print(product["name"], product["offers"]["price"], product["offers"]["availability"])

state_js = soup.find("script", string=re.compile("__INITIAL_STATE__")).string
state = json.loads(re.search(r"__INITIAL_STATE__\s*=\s*(\{.*\});", state_js, re.S).group(1))
print("average stars:", sum(r["stars"] for r in state["reviews"]) / len(state["reviews"]))
```

```python
# Headless browser with Playwright (pip install playwright; playwright install chromium)
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(user_agent="SkuruPriceBot/1.0 (+https://skurulearning.com/bot)")
    page.goto("https://example.com/deals", wait_until="networkidle")
    page.wait_for_selector(".deal-card")                     # wait for JS to render
    for _ in range(3):                                        # infinite scroll: load more, politely
        page.mouse.wheel(0, 4000)
        page.wait_for_timeout(1500)
    deals = page.locator(".deal-card").evaluate_all(
        "cards => cards.map(c => ({title: c.querySelector('h3')?.innerText, price: c.querySelector('.price')?.innerText}))"
    )
    browser.close()
```

Headless browsers are **10–100× heavier** than plain HTTP requests: slower, more memory, more load on the site. Use them only when necessary, and keep rate limits strict.

```quiz
- q: The HTML you fetch has an empty div id="app" but the browser shows products. First step?
  options: ["Give up", "Check DevTools Network for the JSON API, and look for embedded JSON", "Increase the timeout", "Use a different User-Agent"]
  answer: 1
- q: Why prefer an API or embedded JSON over a headless browser?
  options: ["Headless browsers can't read text", "They're far lighter, faster and more stable than rendering the whole page", "APIs are always free", "Browsers ignore robots.txt"]
  answer: 1
```

# Extracting Structured Data with LLMs {#llm-extraction}

Selectors are precise but brittle, and every site is different. **LLM extraction** reads cleaned page text and fills a **schema**, which works across many layouts with one prompt. It costs tokens and can hallucinate, so **validate** and **verify**.

```sketch
title: LLM-powered extraction
caption: Clean the HTML down to text, ask for a strict schema, validate with Pydantic, and verify key values against the source text.
cellW: 165
cellH: 100
nodes:
  - id: html
    label: Raw HTML
    sub: 120 KB
    col: 0
    row: 0
    shape: doc
  - id: clean
    label: Clean to text
    sub: drop scripts, nav, ads
    col: 1.2
    row: 0
    shape: round
    tone: sky
  - id: llm
    label: LLM + schema
    sub: structured output
    col: 2.4
    row: 0
    shape: round
    tone: grape
  - id: val
    label: Pydantic validation
    col: 3.6
    row: 0
    shape: diamond
    tone: gold
    w: 0.95
    h: 1
  - id: verify
    label: Verify in source
    sub: "is '$8.50' really there?"
    col: 3.6
    row: 1.3
    shape: diamond
    tone: rose
    w: 0.95
    h: 1
  - id: out
    label: Clean records
    col: 2.4
    row: 1.3
    shape: db
    tone: teal
edges:
  - from: html
    to: clean
    label: "→ 3 KB"
  - from: clean
    to: llm
  - from: llm
    to: val
  - from: val
    to: verify
  - from: verify
    to: out
```

```python run title="Clean HTML, extract with a (simulated) LLM, validate, verify"
import re
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field, ValidationError

html = """<html><head><script>trackEverything()</script><style>.x{}</style></head><body>
<nav>Home | Deals | Login</nav>
<article><h1>Hwange Solar 200W panel</h1>
<p>Now only <b>US$ 145</b> (was $180). Warranty: 5 years. Ships from Bulawayo in 3 days.</p></article>
<footer>© ZimSolar · Privacy</footer></body></html>"""

def clean(html):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()

class Offer(BaseModel):
    product: str
    price_usd: float = Field(gt=0)
    was_usd: float | None = None
    warranty_years: int | None = Field(default=None, ge=0, le=30)
    ships_from: str | None = None

def fake_llm_extract(text):        # in production: responses.parse(..., text_format=Offer)
    return '{"product": "Hwange Solar 200W panel", "price_usd": 145, "was_usd": 180, "warranty_years": 5, "ships_from": "Bulawayo"}'

text = clean(html)
print(f"cleaned: {len(html)} -> {len(text)} characters:", text)
offer = Offer.model_validate_json(fake_llm_extract(text))
print("validated:", offer.model_dump())
# Verify: numbers the model returned must literally appear in the source text
for field in ("price_usd", "was_usd"):
    value = getattr(offer, field)
    found = re.search(rf"\b{int(value)}\b", text) is not None
    print(f"verify {field}={value}: {'found in source' if found else 'NOT IN SOURCE: flag for review'}")
```

## Cost and quality tips

- **Shrink the input**: strip boilerplate; keep only the main content block; convert to Markdown or text.
- Use a **small model** with **structured outputs**; batch pages with the Batch API when latency doesn't matter.
- **Hybrid**: selectors for stable fields (price, SKU), the LLM for messy ones (specs, descriptions).
- **Verify** extracted numbers and names against the source text; send mismatches to review.

```quiz
- q: What's the main risk of LLM extraction compared with CSS selectors?
  options: ["It's slower to write", "It can invent values, so outputs must be validated and verified", "It can't read HTML", "It needs JavaScript"]
  answer: 1
- q: Which step most reduces LLM extraction cost?
  options: ["Sending raw HTML with scripts", "Cleaning the page down to the main text before sending", "Using the largest model", "Asking twice"]
  answer: 1
```

# Scraping for RAG and Data Pipelines {#pipelines}

Scraped data is only useful if it's **clean, deduplicated, fresh and traceable**.

| Concern | Technique |
|---|---|
| **Exact duplicates** | Hash the normalised content (SHA-256) |
| **Near duplicates** (same article, different ads) | Shingling + Jaccard similarity, or MinHash at scale |
| **Change detection** | Compare content hashes between crawls; re-embed only changed pages |
| **Provenance** | Store URL, fetch time, HTTP status, and content hash with every record |
| **Freshness** | Re-crawl important pages more often (sitemaps' `lastmod` helps) |
| **For RAG** | Chunk by headings, keep titles and URLs as metadata for citations |

```python run title="Exact and near-duplicate detection"
import hashlib, re

pages = {
    "a": "Exam timetable 2026: Maths Paper 1 on 3 June, Physics on 5 June. Advert: buy textbooks!",
    "b": "Exam timetable 2026: Maths Paper 1 on 3 June, Physics on 5 June. Advert: cheap phones!",
    "c": "Exam timetable 2026: Maths Paper 1 on 3 June, Physics on 5 June. Advert: buy textbooks!",
    "d": "Bus routes in Harare are changing from July; see the new map.",
}

def content_hash(text):
    return hashlib.sha256(re.sub(r"\s+", " ", text.lower()).strip().encode()).hexdigest()[:12]

def shingles(text, k=3):
    words = re.findall(r"\w+", text.lower())
    return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}

def jaccard(a, b):
    return len(a & b) / len(a | b)

hashes = {}
for pid, text in pages.items():
    h = content_hash(text)
    print(f"{pid}: hash {h}" + (f"  EXACT duplicate of {hashes[h]}" if h in hashes else ""))
    hashes.setdefault(h, pid)

ids = list(pages)
for i in range(len(ids)):
    for j in range(i + 1, len(ids)):
        s = jaccard(shingles(pages[ids[i]]), shingles(pages[ids[j]]))
        if s > 0.6:
            print(f"near-duplicates {ids[i]}~{ids[j]}: Jaccard {s:.2f}")
```

```quiz
- q: Two pages share an article but differ in their adverts. What detects them as duplicates?
  options: ["Exact content hash", "Near-duplicate detection such as shingling + Jaccard", "Comparing URLs", "Status codes"]
  answer: 1
- q: Why store a content hash with each scraped page?
  options: ["Security", "To detect changes and re-process only pages that changed", "To compress it", "For robots.txt"]
  answer: 1
```

# Reliability and Scale {#scale}

## Frameworks

**Scrapy** is the standard Python framework for large crawls: it schedules requests, enforces per-domain concurrency and delays (including AutoThrottle), retries, follows robots.txt, and pipes items through cleaning and storage stages.

```python
# A Scrapy spider (run with: scrapy runspider prices_spider.py -O prices.jsonl)
import scrapy

class PricesSpider(scrapy.Spider):
    name = "prices"
    allowed_domains = ["shop.example.co.zw"]
    start_urls = ["https://shop.example.co.zw/groceries/"]
    custom_settings = {
        "ROBOTSTXT_OBEY": True,
        "DOWNLOAD_DELAY": 2,
        "AUTOTHROTTLE_ENABLED": True,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
        "USER_AGENT": "SkuruPriceBot/1.0 (+https://skurulearning.com/bot)",
    }

    def parse(self, response):
        for card in response.css("div.product"):
            yield {
                "sku": card.attrib.get("data-sku"),
                "name": card.css(".name::text").get(default="").strip(),
                "price": card.css(".price::text").re_first(r"[\d.]+"),
                "url": response.url,
            }
        yield from response.follow_all(css="a.category", callback=self.parse)
```

## Operating scrapers

- **Monitor yield**: alert when a scraper suddenly returns 0 items or many `None` fields (the site changed).
- **Snapshot tests**: save sample pages and test parsers against them in CI.
- **Respect blocks**: if a site rate-limits or blocks you, slow down or ask for access. Rotating proxies to evade a site's explicit wishes is unethical and may be illegal.
- **Schedule** with cron or a workflow tool; make runs idempotent and resumable.

# Capstone: A Rule-Following Crawler {#capstone}

````challenge
id: scraping-polite-crawler
title: Crawl within the rules
difficulty: hard
prompt: |
  Implement `crawl(site, start, disallow, max_depth)`:

  - `site` maps a path (like `"/a"`) to a **list of linked paths** on that page.
  - Crawl **breadth-first** from `start`. A page's depth is the number of links followed from `start` (start is depth 0).
  - Never visit a path that **starts with** any prefix in `disallow`.
  - Don't follow links from pages at `max_depth`.
  - Paths not present in `site` count as visited (they are "404"), but have no links.
  - Visit each path at most once.
  Return the list of visited paths **in visit order**.
starter: |
  from collections import deque

  def crawl(site, start, disallow, max_depth):
      return []

  site = {"/": ["/a", "/b"], "/a": ["/c"], "/b": ["/c", "/admin"], "/c": []}
  print(crawl(site, "/", ["/admin"], 2))
tests: |
  site = {"/": ["/a", "/b"], "/a": ["/c"], "/b": ["/c", "/admin"], "/c": ["/d"], "/d": []}
  assert crawl(site, "/", ["/admin"], 2) == ["/", "/a", "/b", "/c"], crawl(site, "/", ["/admin"], 2)
  assert crawl(site, "/", ["/admin"], 3) == ["/", "/a", "/b", "/c", "/d"]
  assert crawl(site, "/", ["/admin", "/b"], 5) == ["/", "/a", "/c", "/d"]
  assert crawl(site, "/", [], 0) == ["/"]
  assert crawl({"/": ["/missing", "/"]}, "/", [], 3) == ["/", "/missing"], "404s are visited once, loops are ignored"
````

```exam
- q: Which file tells crawlers which paths they may not fetch?
  options: ["sitemap.xml", "robots.txt", "index.html", ".htaccess"]
  answer: 1
- q: Beautiful Soup's select() takes…
  options: ["XPath only", "A CSS selector", "A regex", "SQL"]
  answer: 1
- q: Breadth-first crawling uses…
  options: ["A FIFO queue", "Recursion only", "A random order", "A priority by file size"]
  answer: 0
- q: The browser shows data, but your HTTP fetch doesn't contain it. Best next step?
  options: ["Headless browser immediately", "Look for the JSON API or embedded JSON first", "Give up", "Fetch faster"]
  answer: 1
- q: An LLM extracted price 145. How do you guard against hallucination?
  options: ["Trust it", "Validate with a schema and check the value appears in the source text", "Ask the model if it's sure", "Use temperature 2"]
  answer: 1
- q: Which technique finds near-duplicate pages?
  options: ["Exact SHA-256 match", "Shingling with Jaccard similarity", "URL length", "Status codes"]
  answer: 1
- q: A site starts returning 429. The right response?
  options: ["Rotate proxies to evade it", "Back off, slow down, and respect the limit", "Retry instantly", "Ignore it"]
  answer: 1
- q: Which is a lawful-use concern specific to people's data?
  options: ["Copyright of prices", "Data-protection law such as Zimbabwe's Cyber and Data Protection Act", "robots.txt", "HTTP/2"]
  answer: 1
```
