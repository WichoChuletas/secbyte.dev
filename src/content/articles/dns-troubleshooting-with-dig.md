---
title: "DNS Troubleshooting with dig and nslookup"
description: "The handful of dig and nslookup commands that solve most day-to-day DNS problems, from missing records to stale caches."
pubDate: 2026-04-05
---

Most "the site is down" reports that turn out to be DNS follow the same short list of checks. Here's the order to run them in.

## 1. Confirm what's actually being returned

```
dig example.com
```

Look at the `ANSWER SECTION` — is there a record at all, and does the IP match what you expect? An empty answer section with `NOERROR` status usually means the record type you queried doesn't exist for that name (try `dig example.com MX` or `dig example.com TXT` if you meant a different record type).

## 2. Query a specific nameserver directly

If you suspect propagation lag, bypass your resolver and ask the authoritative server directly:

```
dig @ns1.example.com example.com
```

Comparing this against a query through your default resolver tells you whether the authoritative data has updated but your resolver's cache hasn't caught up yet.

## 3. Check the TTL

```
dig example.com +noall +answer
```

The number in the answer line is the TTL in seconds — how long resolvers are allowed to cache that record. A TTL of 3600 means a change you just made can take up to an hour to be visible everywhere, which explains a lot of "I changed it but nothing happened" tickets.

## 4. Trace the full resolution path

```
dig +trace example.com
```

This walks the delegation chain from the root servers down, which is invaluable when a domain resolves inconsistently — it'll show you exactly which nameserver in the chain is returning something unexpected.

## 5. nslookup as a quick sanity check

`dig` is more detailed, but `nslookup` is fine for a fast check, especially on Windows where it's available without extra tooling:

```
nslookup example.com
nslookup example.com 8.8.8.8
```

The second form queries Google's public resolver directly, which is a good way to rule out "is this just my local resolver being weird."

## Quick reference

| Symptom | Command |
|---|---|
| Wrong/missing IP returned | `dig example.com` |
| Suspected propagation delay | `dig @ns1.example.com example.com` |
| "Change isn't showing up" | `dig example.com +noall +answer` (check TTL) |
| Inconsistent resolution | `dig +trace example.com` |
