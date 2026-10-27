---
id: networking
title: Networking
short: NETWORKING
category: engineering
level: beginner
language: python
color: "#1F6FB2"
icon: "🛰️"
order: 61
summary: How data really moves. The OSI and TCP/IP models, IP addressing and subnetting, DNS, TCP vs UDP, routing, Wi-Fi, HTTP/TLS, firewalls, VPNs, cloud networking and troubleshooting.
tags: [networking, tcp/ip, dns, subnetting, routing, wifi, firewall, vpn, cloud]
---

# What is a Network? {#intro}

A **network** is computers connected to share data. The **internet** is a network of networks: home Wi-Fi, school LANs, mobile networks and data centres, all connected by undersea and land fibre cables, microwave links and satellites.

| Network type | Covers | Example |
|---|---|---|
| **LAN** | A building | School computer lab |
| **WLAN** | Wireless LAN | Office Wi-Fi |
| **MAN** | A city | City fibre ring |
| **WAN** | Countries | A bank linking branches in Harare, Bulawayo and Mutare |
| **Internet** | The world | Everything |

## Key hardware

| Device | Job |
|---|---|
| **Switch** | Connects devices within a LAN |
| **Router** | Moves traffic **between** networks (your LAN ↔ ISP) |
| **Access point** | Provides Wi-Fi |
| **Modem/ONT** | Connects to the ISP's line (fibre, DSL, LTE) |
| **Firewall** | Allows or blocks traffic by rules |

```quiz
- q: Which device moves traffic between different networks?
  options: ["Switch", "Router", "Keyboard", "Access point"]
  answer: 1
```

# Layers: OSI and TCP/IP {#layers}

Networking is split into **layers**, each with one job. Engineers use the layers to troubleshoot: "Is it a cable problem (layer 1) or a DNS problem (layer 7)?"

| OSI layer | TCP/IP layer | Examples |
|---|---|---|
| 7 Application | Application | HTTP, DNS, SMTP, SSH |
| 6 Presentation | Application | TLS encryption, encoding |
| 5 Session | Application | Sessions |
| 4 Transport | Transport | TCP, UDP, ports |
| 3 Network | Internet | IP addresses, routing |
| 2 Data link | Link | Ethernet, Wi-Fi, MAC addresses, switches |
| 1 Physical | Link | Cables, fibre, radio |

> Memory aid (7 → 1): **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing.

# IP Addresses {#ip}

Every device on a network has an **IP address**.

- **IPv4**: four numbers 0–255 — `192.168.1.25`. About 4.3 billion addresses — not enough for everyone.
- **IPv6**: much longer — `2001:db8::25`. Effectively unlimited.

## Private vs public

Home and office networks use **private** ranges, shared via **NAT** (network address translation) behind one public address from your ISP:

| Private range | Typical use |
|---|---|
| `10.0.0.0/8` | Large organisations, cloud |
| `172.16.0.0/12` | Organisations |
| `192.168.0.0/16` | Homes and small offices |

```python run title="Explore IP addresses"
import ipaddress

for addr in ["192.168.1.25", "10.20.30.40", "8.8.8.8", "127.0.0.1", "2001:db8::1"]:
    ip = ipaddress.ip_address(addr)
    print(f"{addr:15} version {ip.version}  private={ip.is_private!s:5}  loopback={ip.is_loopback}")
```

`127.0.0.1` (`localhost`) always means "this computer".

# Subnetting {#subnetting}

A **subnet** is a range of addresses. CIDR notation `192.168.10.0/24` means the first **24 bits** are the network part; the remaining 8 bits number the hosts.

```python run title="Subnet calculator"
import ipaddress

net = ipaddress.ip_network("192.168.10.0/24")
print("Network:   ", net.network_address)
print("Broadcast: ", net.broadcast_address)
print("Netmask:   ", net.netmask)
print("Usable hosts:", net.num_addresses - 2)

print("\nSplit into 4 subnets for 4 departments:")
for sub in net.subnets(new_prefix=26):
    hosts = list(sub.hosts())
    print(f"  {sub}  hosts {hosts[0]} – {hosts[-1]}  ({len(hosts)} usable)")

print("\nIs 192.168.10.70 in", list(net.subnets(new_prefix=26))[1], "?",
      ipaddress.ip_address("192.168.10.70") in list(net.subnets(new_prefix=26))[1])
```

| Prefix | Addresses | Usable hosts |
|---|---|---|
| /24 | 256 | 254 |
| /25 | 128 | 126 |
| /26 | 64 | 62 |
| /27 | 32 | 30 |
| /30 | 4 | 2 (point-to-point links) |

````challenge
id: net-hosts
title: Hosts in a subnet
difficulty: medium
prompt: |
  Write `usable_hosts(cidr)` that returns the number of **usable host addresses** in an IPv4 network written like `"10.1.0.0/22"`.

  Usable = total addresses − 2 (network and broadcast), except **/31** has 2 usable and **/32** has 1.
starter: |
  def usable_hosts(cidr):
      pass

  print(usable_hosts("192.168.1.0/24"))
tests: |
  assert usable_hosts("192.168.1.0/24") == 254
  assert usable_hosts("10.1.0.0/22") == 1022
  assert usable_hosts("172.16.5.4/30") == 2
  assert usable_hosts("10.0.0.0/31") == 2
  assert usable_hosts("10.0.0.7/32") == 1
````

# DNS {#dns}

**DNS** (Domain Name System) translates names like `www.zimparks.org.zw` into IP addresses.

```text
Browser → resolver (ISP or 1.1.1.1/8.8.8.8)
            → root server: "ask the .zw servers"
            → .zw server: "ask the .org.zw servers"
            → zimparks.org.zw's name server: "it's 203.0.113.50"
Browser ← 203.0.113.50 (cached for its TTL)
```

| Record | Purpose |
|---|---|
| `A` / `AAAA` | Name → IPv4 / IPv6 address |
| `CNAME` | Alias to another name |
| `MX` | Mail servers for the domain |
| `TXT` | Text — domain verification, SPF/DKIM email security |
| `NS` | Which servers are authoritative |

```bash
nslookup globalaiacademy.co.zw
dig +short MX example.co.zw
```

> "The site is down for me" is often a DNS problem. Try another resolver (`1.1.1.1`) or check the record with `dig`.

# TCP, UDP and Ports {#transport}

| | TCP | UDP |
|---|---|---|
| Connection | Yes (handshake) | No |
| Reliable, ordered | Yes — lost packets are resent | No |
| Speed | Slower | Faster, less overhead |
| Used for | Web, email, SSH, file transfer | Video calls, gaming, DNS, live streams |

**Ports** identify which program on a computer gets the traffic:

| Port | Service |
|---|---|
| 22 | SSH |
| 53 | DNS |
| 80 / 443 | HTTP / HTTPS |
| 25 / 587 | SMTP email |
| 3306 / 5432 | MySQL / PostgreSQL |

```python run title="A TCP-style handshake, simulated"
def handshake():
    client_seq, server_seq = 100, 300
    yield f"client → server  SYN      seq={client_seq}"
    yield f"server → client  SYN-ACK  seq={server_seq} ack={client_seq + 1}"
    yield f"client → server  ACK      ack={server_seq + 1}"
    yield "connection ESTABLISHED — data can flow"

for step in handshake():
    print(step)
```

# Routing and NAT {#routing}

Routers forward packets hop by hop toward the destination using **routing tables**. Each entry says "for this network, send packets to this next hop". The **default route** (`0.0.0.0/0`) catches everything else — usually your ISP.

```python run title="Longest-prefix routing"
import ipaddress

table = [
    ("10.0.0.0/8", "HQ core router"),
    ("10.20.0.0/16", "Bulawayo branch VPN"),
    ("10.20.5.0/24", "Bulawayo server room"),
    ("0.0.0.0/0", "ISP (internet)"),
]

def next_hop(dest):
    ip = ipaddress.ip_address(dest)
    matches = [(ipaddress.ip_network(n), hop) for n, hop in table if ip in ipaddress.ip_network(n)]
    net, hop = max(matches, key=lambda m: m[0].prefixlen)    # most specific wins
    return hop, str(net)

for d in ["10.20.5.9", "10.20.9.1", "10.3.3.3", "8.8.8.8"]:
    print(d, "→", next_hop(d))
```

# Wi-Fi and Physical Networks {#wifi}

- **Bands:** 2.4 GHz travels further through walls; 5/6 GHz is faster but shorter range.
- **Standards:** Wi-Fi 5 (ac), Wi-Fi 6/6E (ax), Wi-Fi 7 (be).
- **Security:** use **WPA3** (or WPA2-AES); never WEP or open networks for staff.
- **Placement:** central, high, away from metal and microwaves.
- **Cabling:** Cat6 Ethernet for fixed devices; fibre between buildings.
- **Power:** a UPS or solar + battery keeps routers up during load-shedding — often the single biggest reliability win for Zimbabwean offices and schools.

# Security: Firewalls, TLS and VPNs {#security}

- **Firewalls** allow only the traffic you need ("default deny"). Example: allow 443 to the web server; allow 22 only from the admin VPN.
- **TLS (HTTPS)** encrypts traffic between browser and server. Certificates prove the server's identity. Free certificates come from Let's Encrypt or your CDN (e.g. Cloudflare).
- **VPNs** create encrypted tunnels between sites or from remote workers into the office network. **WireGuard** is modern and fast.
- **Segmentation** — put cameras, guest Wi-Fi, servers and staff on separate VLANs so one compromised device can't reach everything.

# Cloud Networking {#cloud}

Cloud providers give you virtual networks:

| Concept | What it is |
|---|---|
| **VPC / VNet** | Your private network in the cloud |
| **Subnets** | Public (internet-facing) and private (databases) |
| **Security groups** | Firewalls per server |
| **Load balancer** | Spreads traffic across servers |
| **CDN** | Copies of your site near users worldwide — faster and cheaper |
| **Edge network** | Run code close to users (Cloudflare Workers) |

Using a CDN with points of presence in Africa means users in Harare download your site from nearby — less latency, less international bandwidth.

# Troubleshooting {#troubleshooting}

Work up the layers:

```bash
ip addr            # (Windows: ipconfig) — do I have an IP address?
ping 192.168.1.1   # can I reach the router?
ping 1.1.1.1       # can I reach the internet by IP?
nslookup google.com    # does DNS work?
traceroute google.com  # (Windows: tracert) — where does the path break?
curl -I https://example.com   # does the web server answer?
```

| Symptom | Likely layer |
|---|---|
| No IP / `169.254.x.x` address | DHCP or cable/Wi-Fi |
| Can ping 1.1.1.1 but not google.com | DNS |
| Website slow, others fine | That server or its route |
| Everything slow at 8 am | Congestion — check bandwidth use |

```quiz
- q: You can ping 1.1.1.1 but websites won't load by name. What's the likely problem?
  options: ["Broken cable", "DNS", "Wi-Fi password", "Monitor settings"]
  answer: 1
- q: Which transport protocol suits a live video call best?
  options: ["TCP", "UDP", "FTP", "SMTP"]
  answer: 1
- q: How many usable hosts does a /26 network have?
  options: ["64", "62", "30", "254"]
  answer: 1
- q: Which port does HTTPS use by default?
  options: ["22", "80", "443", "3306"]
  answer: 2
```

```exam
- q: "Which address always means 'this computer'?"
  options: ["127.0.0.1", "8.8.8.8", "192.168.1.1", "0.0.0.0/0"]
  answer: 0
- q: "Which DNS record points a name to an IPv4 address?"
  options: ["A", "MX", "TXT", "NS"]
  answer: 0
- q: "What does NAT do?"
  options: ["Lets many private devices share one public IP", "Encrypts traffic", "Speeds up Wi-Fi", "Assigns domain names"]
  answer: 0
- q: "Which Wi-Fi security should you use?"
  options: ["WPA3 or WPA2-AES", "WEP", "Open network", "MAC filtering only"]
  answer: 0
- q: "Which router entry handles everything not matched elsewhere?"
  options: ["The default route 0.0.0.0/0", "The loopback", "The DNS server", "The broadcast address"]
  answer: 0
```
