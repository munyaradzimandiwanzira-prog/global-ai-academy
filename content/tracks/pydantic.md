---
id: pydantic
title: Pydantic in Depth
short: PYDANTIC
category: frameworks
level: intermediate
language: python
color: "#7A1F5C"
icon: "🛡️"
order: 20.6
summary: Turn type hints into guarantees. Models, fields and constraints, strict and lax validation, custom validators, nested models and discriminated unions, serialization, JSON Schema, settings, and the patterns that make Pydantic the backbone of FastAPI, LLM structured outputs and agent tools.
tags: [pydantic, python, validation, type hints, json schema, fastapi, structured outputs, data models]
---

# Why Pydantic? {#intro}

Python type hints like `age: int` are **not enforced**: nothing stops `age = "twelve"`. Bugs appear far from where the bad data entered. **Pydantic** checks data **at the boundary** (an API request, a file, a model's JSON, a config file) and either gives you a clean, typed object or a precise list of what's wrong.

```sketch
title: Validate at the boundary
caption: Untrusted data is checked once on the way in. Inside your code, every object is already the right shape.
cellW: 175
cellH: 105
nodes:
  - id: api
    label: HTTP request
    col: 0
    row: 0
    shape: doc
  - id: llm
    label: LLM JSON output
    col: 0
    row: 1
    shape: doc
  - id: env
    label: Env vars / config
    col: 0
    row: 2
    shape: doc
  - id: model
    label: Pydantic model
    sub: parse · coerce · validate
    col: 1.5
    row: 1
    shape: round
    tone: grape
    w: 1.1
  - id: ok
    label: Typed object
    col: 3
    row: 0.4
    shape: pill
    tone: teal
  - id: err
    label: ValidationError
    sub: every problem, with location
    col: 3
    row: 1.6
    shape: pill
    tone: rose
edges:
  - from: api
    to: model
  - from: llm
    to: model
  - from: env
    to: model
  - from: model
    to: ok
    label: valid
  - from: model
    to: err
    label: invalid
```

Pydantic (version 2) has its core written in Rust, so it's fast, and it's used inside **FastAPI**, the **OpenAI** and **Anthropic** SDKs, **LangChain**, **FastMCP** and many more. Learning it well pays off everywhere.

```python run title="Your first model"
from pydantic import BaseModel, ValidationError

class Learner(BaseModel):
    name: str
    age: int
    city: str = "Harare"          # a default makes the field optional

rudo = Learner(name="Rudo", age="16")     # "16" is converted to 16
print(rudo)
print(rudo.age + 1, type(rudo.age).__name__)

try:
    Learner(name="Tino", age="sixteen")
except ValidationError as e:
    print(e)
```

```quiz
- q: Does a plain Python type hint like age int stop you assigning a string?
  options: ["Yes, Python enforces it", "No; hints are not checked at run time unless a tool like Pydantic validates them", "Only in Python 3.12", "Only for ints"]
  answer: 1
- q: Where should validation happen?
  options: ["Deep inside business logic", "At the boundary where untrusted data enters", "Only in tests", "Never"]
  answer: 1
- q: What did Learner(name="Rudo", age="16") do with "16"?
  options: ["Raised an error", "Converted it to the integer 16", "Kept it as a string", "Ignored it"]
  answer: 1
```

# Models and Fields {#models}

A model is a class that inherits from `BaseModel`. Each annotated attribute becomes a **field**.

| Annotation | Meaning |
|---|---|
| `name: str` | Required string |
| `city: str = "Harare"` | Optional, with a default |
| `phone: str \| None = None` | Optional, may be `None` |
| `tags: list[str] = []` | A list (Pydantic copies mutable defaults safely) |
| `level: Literal["beginner", "advanced"]` | One of fixed values |
| `when: datetime` | Parses ISO strings into `datetime` |

## Constraints with Field

```python run title="Constraints, aliases and defaults with Field"
from datetime import date
from pydantic import BaseModel, Field, ValidationError

class Enrolment(BaseModel):
    student_id: str = Field(pattern=r"^STU-\d{4}$", description="Student id like STU-0042")
    course_code: str = Field(min_length=5, max_length=8)
    progress: int = Field(default=0, ge=0, le=100)
    fee_usd: float = Field(gt=0, alias="feeUSD")          # JSON key differs from the Python name
    tags: list[str] = Field(default_factory=list)
    started: date = Field(default_factory=date.today)

e = Enrolment(student_id="STU-0042", course_code="PY101", feeUSD=35)
print(e.model_dump())
print(e.model_dump(by_alias=True)["feeUSD"])

try:
    Enrolment(student_id="42", course_code="PY", progress=150, feeUSD=0)
except ValidationError as err:
    for problem in err.errors():
        print(f"{problem['loc'][0]:12} {problem['msg']}")
```

| Field option | Works on | Example |
|---|---|---|
| `gt`, `ge`, `lt`, `le` | numbers | `Field(ge=0, le=100)` |
| `min_length`, `max_length` | strings, lists | `Field(min_length=1)` |
| `pattern` | strings | `Field(pattern=r"^\+263")` |
| `default`, `default_factory` | any | `Field(default_factory=list)` |
| `alias` | any | JSON key `feeUSD` → attribute `fee_usd` |
| `description`, `examples` | any | Appear in JSON Schema (great for LLM tools) |

## Model methods you'll use daily

| Method | Does |
|---|---|
| `Model(**data)` / `Model.model_validate(dict)` | Validate a dict |
| `Model.model_validate_json(text)` | Parse and validate JSON in one fast step |
| `obj.model_dump()` / `obj.model_dump_json()` | Back to dict / JSON |
| `obj.model_copy(update={...})` | A changed copy |
| `Model.model_json_schema()` | The JSON Schema |

```exercise
prompt: Require progress between 0 and 100 inclusive.
code: |
  progress: int = Field(default=0, ___=0, ___=100)
answers: [ge, le]
```

```quiz
- q: Which makes a field optional with no value?
  options: ["phone: str", "phone: str | None = None", "phone = str", "phone: Optional"]
  answer: 1
- q: Why use default_factory=list instead of = [] in plain classes?
  options: ["It's faster", "Each instance gets its own new list rather than sharing one", "Lists aren't allowed", "It validates items"]
  answer: 1
- q: The JSON uses feeUSD but you want fee_usd in Python. What do you use?
  options: ["A comment", "Field(alias='feeUSD')", "A validator", "Rename the JSON"]
  answer: 1
```

# Validation Modes and Errors {#validation}

By default Pydantic runs in **lax mode**: it converts compatible values (`"16"` → `16`, `"true"` → `True`, `"2026-03-01"` → `date`). **Strict mode** refuses conversions, which is safer when types must be exact (money, ids, LLM output you want to catch drifting).

```python run title="Lax vs strict"
from pydantic import BaseModel, ConfigDict, Field, ValidationError

class LaxPayment(BaseModel):
    amount: float
    paid: bool

class StrictPayment(BaseModel):
    model_config = ConfigDict(strict=True)
    amount: float
    paid: bool

data = {"amount": "12.50", "paid": "yes"}
print("lax   :", LaxPayment.model_validate(data))
try:
    StrictPayment.model_validate(data)
except ValidationError as e:
    print("strict:", [f"{x['loc'][0]}: {x['msg']}" for x in e.errors()])

# Strict for one field only
class Mixed(BaseModel):
    amount: float = Field(strict=True)
    paid: bool
print("mixed :", Mixed.model_validate({"amount": 12.5, "paid": "yes"}))
```

## Reading ValidationError

`ValidationError` collects **every** problem, not just the first. Each item in `e.errors()` has:

| Key | Meaning |
|---|---|
| `loc` | Where: a tuple path such as `('items', 2, 'qty')` |
| `msg` | Human-readable message |
| `type` | Machine-readable code (`int_parsing`, `missing`, `greater_than_equal`…) |
| `input` | The offending value |

```python run title="Errors with paths into nested data"
from pydantic import BaseModel, Field, ValidationError

class Item(BaseModel):
    sku: str
    qty: int = Field(gt=0)

class Order(BaseModel):
    customer: str
    items: list[Item]

bad = {"items": [{"sku": "RM10", "qty": 2}, {"sku": "OIL2", "qty": 0}, {"qty": "three"}]}
try:
    Order.model_validate(bad)
except ValidationError as e:
    print(f"{e.error_count()} problems")
    for err in e.errors():
        path = ".".join(str(p) for p in err["loc"])
        print(f"  {path:14} {err['type']:22} {err['msg']}")
```

These paths are perfect for returning helpful API errors, or for telling an LLM exactly what to fix (see the AI lesson).

```quiz
- q: In lax mode, what happens to "true" for a bool field?
  options: ["Error", "Converted to True", "Kept as a string", "Converted to 1"]
  answer: 1
- q: When is strict mode a good idea?
  options: ["Never", "When exact types matter and silent conversion could hide bugs", "Only for strings", "Only for tests"]
  answer: 1
- q: What does err['loc'] tell you?
  options: ["The line of Python code", "The path to the bad value inside the input data", "The Pydantic version", "The time"]
  answer: 1
```

# Custom Validators {#validators}

When constraints aren't enough, write validators.

| Tool | Runs on | Use for |
|---|---|---|
| `@field_validator("x")` (after, the default) | One field, after type conversion | Normalising and checking a value |
| `@field_validator("x", mode="before")` | One field, before conversion | Cleaning raw input ("$35" → 35) |
| `@model_validator(mode="after")` | The whole model | Rules across fields (end after start) |
| `Annotated[T, AfterValidator(fn)]` | A reusable type | The same rule on many fields |
| `@computed_field` | Derived values | Values calculated from other fields, included in dumps |

```python run title="Field, model and reusable validators"
from datetime import date
from typing import Annotated
from pydantic import AfterValidator, BaseModel, ValidationError, computed_field, field_validator, model_validator

def zim_mobile(v: str) -> str:
    digits = "".join(ch for ch in v if ch.isdigit())
    if digits.startswith("0"):
        digits = "263" + digits[1:]
    if not (digits.startswith("2637") and len(digits) == 12):
        raise ValueError("must be a Zimbabwe mobile number like 077 123 4567")
    return "+" + digits

ZimMobile = Annotated[str, AfterValidator(zim_mobile)]       # reusable type

class Booking(BaseModel):
    name: str
    phone: ZimMobile
    price: float
    check_in: date
    check_out: date

    @field_validator("name")
    @classmethod
    def tidy_name(cls, v: str) -> str:
        return " ".join(part.capitalize() for part in v.split())

    @field_validator("price", mode="before")
    @classmethod
    def strip_currency(cls, v):
        return v.replace("$", "").replace(",", "") if isinstance(v, str) else v

    @model_validator(mode="after")
    def dates_in_order(self):
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")
        return self

    @computed_field
    @property
    def nights(self) -> int:
        return (self.check_out - self.check_in).days

b = Booking(name="  rudo   moyo ", phone="077 123 4567", price="$1,140", check_in="2026-12-20", check_out="2026-12-23")
print(b.model_dump())

for bad in ({"phone": "12345"}, {"check_out": "2026-12-19"}):
    try:
        Booking(**{"name": "x", "phone": "0771234567", "price": 10, "check_in": "2026-12-20", "check_out": "2026-12-23", **bad})
    except ValidationError as e:
        print("error:", e.errors()[0]["msg"])
```

Validators must **return** the (possibly changed) value, or raise `ValueError` with a clear message.

```quiz
- q: You receive prices like "$1,140". Which validator mode cleans them before the float conversion?
  options: ["after", "before", "wrap only", "computed"]
  answer: 1
- q: Which validator checks that check_out is after check_in?
  options: ["field_validator on check_in", "model_validator(mode='after')", "Field(gt=...)", "computed_field"]
  answer: 1
- q: What must a field validator do on success?
  options: ["Return None", "Return the value (possibly modified)", "Print it", "Raise"]
  answer: 1
```

# Nested Models, Lists and Unions {#nested}

Models compose. Lists, dicts and optional nested models all validate recursively.

## Discriminated unions

When a field can hold **different shapes**, add a **discriminator** field (a `Literal`) so Pydantic picks the right model instantly and gives clear errors. This is how you model events, messages and tool calls.

```python run title="A discriminated union of payment methods"
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field, ValidationError

class EcoCash(BaseModel):
    method: Literal["ecocash"]
    phone: str

class Card(BaseModel):
    method: Literal["card"]
    last4: str = Field(pattern=r"^\d{4}$")

class Bank(BaseModel):
    method: Literal["bank"]
    bank: str
    reference: str

Payment = Annotated[Union[EcoCash, Card, Bank], Field(discriminator="method")]

class Checkout(BaseModel):
    plan: Literal["plus", "academy"]
    payment: Payment

for data in (
    {"plan": "plus", "payment": {"method": "ecocash", "phone": "+263771234567"}},
    {"plan": "academy", "payment": {"method": "card", "last4": "4242"}},
    {"plan": "plus", "payment": {"method": "card", "last4": "42"}},
    {"plan": "plus", "payment": {"method": "bitcoin"}},
):
    try:
        c = Checkout.model_validate(data)
        print("OK   ", type(c.payment).__name__, c.payment.model_dump())
    except ValidationError as e:
        print("ERROR", [(".".join(map(str, x["loc"])), x["msg"]) for x in e.errors()])
```

Without the discriminator Pydantic would try each model in turn and report errors from all of them, which is slower and confusing.

```quiz
- q: What does a discriminator field do in a union?
  options: ["Encrypts it", "Tells Pydantic which model to use based on one Literal field", "Sorts the union", "Makes fields optional"]
  answer: 1
- q: A list[Item] field contains one bad item at index 2. Where is the error reported?
  options: ["Nowhere", "With a loc path like ('items', 2, 'qty')", "Only the first item", "As a warning"]
  answer: 1
```

# Serialization and JSON Schema {#serialization}

## Dumping data out

```python run title="Control what goes out"
from datetime import datetime
from pydantic import BaseModel, Field, field_serializer

class User(BaseModel):
    id: int
    email: str
    password_hash: str = Field(exclude=True)          # never serialised
    created: datetime
    balance_cents: int

    @field_serializer("balance_cents")
    def as_dollars(self, v: int) -> str:
        return f"${v / 100:,.2f}"

u = User(id=7, email="rudo@example.com", password_hash="pbkdf2$...", created="2026-10-01T09:30:00", balance_cents=350000)
print(u.model_dump())
print(u.model_dump(mode="json"))                       # JSON-safe types (datetime -> string)
print(u.model_dump_json(include={"id", "balance_cents"}))
```

| Option | Effect |
|---|---|
| `mode="json"` | Convert to JSON-compatible types |
| `include=` / `exclude=` | Pick fields |
| `exclude_none=True`, `exclude_unset=True` | Drop empty / never-set fields (handy for PATCH) |
| `by_alias=True` | Use aliases as keys |
| `Field(exclude=True)` | Never output this field (secrets) |
| `@field_serializer` | Custom output format for a field |

## JSON Schema

`Model.model_json_schema()` produces a standard **JSON Schema**, the same format used by OpenAPI (FastAPI's docs), LLM structured outputs, tool definitions and MCP. Descriptions you write in `Field(description=...)` become instructions the model reads.

```python run title="One model, many uses: the JSON Schema"
import json
from typing import Literal
from pydantic import BaseModel, Field

class SearchCourses(BaseModel):
    """Search the Skuru course catalogue."""
    query: str = Field(description="Words to search for, e.g. 'graph databases'")
    level: Literal["beginner", "intermediate", "advanced"] | None = Field(default=None, description="Optional level filter")
    max_results: int = Field(default=5, ge=1, le=20)

print(json.dumps(SearchCourses.model_json_schema(), indent=2))
```

```quiz
- q: How do you make sure password_hash never appears in API output?
  options: ["Delete it", "Field(exclude=True)", "Name it _password", "Use strict mode"]
  answer: 1
- q: model_dump(mode='json') does what to a datetime?
  options: ["Keeps it as datetime", "Converts it to an ISO string", "Removes it", "Converts to seconds"]
  answer: 1
- q: Why does model_json_schema() matter for AI work?
  options: ["It doesn't", "Tool definitions and structured outputs are JSON Schemas, so one model defines and validates both", "It speeds up Python", "It compresses data"]
  answer: 1
```

# Configuration and Settings {#settings}

## Model configuration

```python run title="ConfigDict: forbid surprises"
from pydantic import BaseModel, ConfigDict, ValidationError

class CreateCourse(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, frozen=True)
    code: str
    title: str

c = CreateCourse(code="  DB220 ", title=" Graph Databases ")
print(repr(c.code), repr(c.title))
try:
    CreateCourse(code="X1", title="Y", is_admin=True)          # an attacker adds a field
except ValidationError as e:
    print("rejected:", e.errors()[0]["loc"], e.errors()[0]["msg"])
try:
    c.title = "changed"
except ValidationError as e:
    print("frozen:", e.errors()[0]["msg"])
```

| Setting | Effect |
|---|---|
| `extra="forbid"` | Unknown fields are errors (stops mass-assignment bugs) |
| `extra="ignore"` (default) / `"allow"` | Drop / keep unknown fields |
| `frozen=True` | Instances are immutable (and hashable) |
| `str_strip_whitespace=True` | Trim strings |
| `strict=True` | No type coercion |

## Application settings from the environment

The `pydantic-settings` package validates configuration from environment variables and `.env` files, so a missing or malformed setting fails fast at start-up instead of at 3 a.m.

```python
# pip install pydantic-settings
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="SKURU_")
    database_url: str
    openai_api_key: SecretStr                      # repr shows '**********'
    max_ai_requests_per_day: int = Field(default=15, ge=1)
    debug: bool = False

settings = Settings()                              # reads SKURU_DATABASE_URL, SKURU_OPENAI_API_KEY, ...
```

## TypeAdapter: validate without a model

```python run title="Validate plain types with TypeAdapter"
from pydantic import TypeAdapter, ValidationError

scores = TypeAdapter(list[int])
print(scores.validate_python(["90", 85, "77"]))
try:
    scores.validate_json('[90, "eighty"]')
except ValidationError as e:
    print(e.errors()[0]["loc"], e.errors()[0]["msg"])
```

```quiz
- q: Which setting stops a client sneaking in an unexpected is_admin field?
  options: ["frozen=True", "extra='forbid'", "strict=True", "str_strip_whitespace=True"]
  answer: 1
- q: Why use SecretStr for API keys in settings?
  options: ["It encrypts the key", "It hides the value in reprs and logs", "It rotates keys", "It's faster"]
  answer: 1
- q: How do you validate a list[int] without writing a model?
  options: ["You can't", "TypeAdapter(list[int])", "json.loads", "Field(list)"]
  answer: 1
```

# Pydantic for AI Engineering {#ai}

Pydantic is the glue between language models and your code:

| Use | How |
|---|---|
| **Structured outputs** | Pass a model as the output format (`responses.parse(text_format=Model)`); get a validated object back |
| **Tool / function definitions** | Generate the parameter schema from a model; validate arguments with the same model |
| **Agent state** | Typed state for LangGraph graphs and agent memory records |
| **Self-correction** | When validation fails, send the error list back to the model and retry |

```python run title="Tool arguments: one model for schema and validation, with a repair loop"
import json
from typing import Literal
from pydantic import BaseModel, Field, ValidationError

class RefundArgs(BaseModel):
    """Refund a delivered order. Use only after confirming the order belongs to the user."""
    order_id: str = Field(pattern=r"^ORD-\d{4}$", description="Order id like ORD-1234")
    amount_usd: float = Field(gt=0, le=500)
    reason: Literal["damaged", "late", "wrong_item", "other"]

tool = {"type": "function", "name": "refund", "description": RefundArgs.__doc__,
        "parameters": RefundArgs.model_json_schema()}
print("tool schema properties:", list(tool["parameters"]["properties"]))

# Simulated model attempts: the first is invalid, the second fixes it after seeing the errors
attempts = iter([
    '{"order_id": "1234", "amount_usd": 0, "reason": "broken"}',
    '{"order_id": "ORD-1234", "amount_usd": 20, "reason": "damaged"}',
])
def fake_model(feedback=None):
    if feedback:
        print("model received feedback:", feedback)
    return next(attempts)

feedback = None
for attempt in range(1, 3):
    raw = fake_model(feedback)
    try:
        args = RefundArgs.model_validate_json(raw)
        print(f"attempt {attempt}: valid ->", args.model_dump())
        break
    except ValidationError as e:
        feedback = "; ".join(f"{err['loc'][0]}: {err['msg']}" for err in e.errors())
        print(f"attempt {attempt}: invalid")
```

> Even when the API guarantees schema-valid JSON (strict structured outputs), keep Pydantic validation in your code: it enforces business rules the schema can't express, and protects you if you switch providers or models.

````challenge
id: pydantic-mobile-payment
title: Validate a mobile-money webhook
difficulty: medium
prompt: |
  A payment provider sends webhooks like `{"reference": "SKU-2026-00042", "amount": "35.00", "currency": "usd", "status": "Paid", "phone": "0771234567"}`.

  Create a Pydantic model `Webhook` so that:
  - `reference` must match `SKU-YYYY-NNNNN` (regex `^SKU-\d{4}-\d{5}$`),
  - `amount` is a `float` greater than 0,
  - `currency` is normalised to **upper case** and must be `"USD"` or `"ZWG"`,
  - `status` is normalised to **lower case** and must be one of `"paid"`, `"failed"`, `"pending"`,
  - `phone` is normalised to the form `+2637XXXXXXXX` (accept `07…` or `2637…` or `+2637…`); anything else is invalid.
  - unknown extra fields are **rejected**.
starter: |
  from pydantic import BaseModel, ConfigDict, Field, field_validator

  class Webhook(BaseModel):
      pass

  print(Webhook.model_validate({"reference": "SKU-2026-00042", "amount": "35.00", "currency": "usd", "status": "Paid", "phone": "0771234567"}))
tests: |
  from pydantic import ValidationError
  w = Webhook.model_validate({"reference": "SKU-2026-00042", "amount": "35.00", "currency": "usd", "status": "Paid", "phone": "0771234567"})
  assert w.currency == "USD" and w.status == "paid" and w.amount == 35.0 and w.phone == "+263771234567", w
  assert Webhook.model_validate({"reference": "SKU-2026-00001", "amount": 1, "currency": "ZWG", "status": "PENDING", "phone": "+263 78 222 3344"}).phone == "+263782223344"
  def bad(**over):
      base = {"reference": "SKU-2026-00042", "amount": "35.00", "currency": "usd", "status": "paid", "phone": "0771234567"}
      try:
          Webhook.model_validate({**base, **over})
          return False
      except ValidationError:
          return True
  assert bad(reference="SKU-26-42"), "reference format"
  assert bad(amount="0"), "amount must be > 0"
  assert bad(currency="eur"), "currency must be USD or ZWG"
  assert bad(status="refunded"), "status must be paid/failed/pending"
  assert bad(phone="12345"), "phone must be a Zimbabwe mobile"
  assert bad(extra_field="x"), "extra fields must be rejected"
````

```exam
- q: Which method parses and validates a JSON string in one step?
  options: ["Model.model_validate_json", "json.loads", "Model.parse", "Model.from_json"]
  answer: 0
- q: Which Field option enforces a regular expression?
  options: ["regex_only", "pattern", "match", "format"]
  answer: 1
- q: Lax mode converts "42" to 42 for an int field. What does strict mode do?
  options: ["Same", "Raises a validation error", "Converts to 42.0", "Ignores the field"]
  answer: 1
- q: Which decorator validates a rule across several fields?
  options: ["field_validator", "model_validator", "computed_field", "field_serializer"]
  answer: 1
- q: What makes Pydantic choose the right model in a union quickly with clear errors?
  options: ["Ordering the union", "A discriminator field", "Strict mode", "Aliases"]
  answer: 1
- q: How do you keep a secret field out of model_dump()?
  options: ["Field(exclude=True)", "Field(alias='x')", "frozen=True", "extra='forbid'"]
  answer: 0
- q: What does model_json_schema() return?
  options: ["Example data", "A JSON Schema describing the model", "SQL", "A Python class"]
  answer: 1
- q: Which ConfigDict setting rejects unknown fields?
  options: ["extra='forbid'", "strict=True", "frozen=True", "validate_default=True"]
  answer: 0
```
