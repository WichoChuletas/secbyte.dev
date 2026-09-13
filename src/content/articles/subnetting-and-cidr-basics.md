---
title: "Subnetting and CIDR Notation: A Practical Refresher"
description: "A no-nonsense walkthrough of subnet masks, CIDR notation, and how to carve a network into smaller pieces without reaching for a calculator every time."
pubDate: 2026-01-12
---

If you've ever stared at `192.168.1.0/24` and blanked on what the `/24` actually means, this is for you.

## What CIDR notation is really saying

CIDR (Classless Inter-Domain Routing) notation is just a compact way of writing a subnet mask. The number after the slash tells you how many bits, counting from the left, are fixed as the **network** portion of the address. Everything after that is up for grabs as **host** addresses.

- `/24` → `255.255.255.0` → 256 addresses, 254 usable hosts
- `/25` → `255.255.255.128` → 128 addresses, 126 usable hosts
- `/30` → `255.255.255.252` → 4 addresses, 2 usable hosts (common for point-to-point links)

## A quick mental shortcut

Every time you add one bit to the prefix, you cut the address space in half. Starting from `/24` (256 addresses), each additional bit halves it: `/25` = 128, `/26` = 64, `/27` = 32, and so on. Working backwards from a `/32` (a single host) doubles it each time.

## Worked example

Say you're handed `10.0.0.0/22` and need to split it into four equal subnets for four office floors.

A `/22` gives you 1024 addresses. Splitting into four means moving to a `/24` for each subnet:

- `10.0.0.0/24`
- `10.0.1.0/24`
- `10.0.2.0/24`
- `10.0.3.0/24`

Each floor gets 254 usable hosts — plenty for a typical office segment, with room to grow.

## Why this still matters

Even with DHCP and cloud VPCs doing a lot of the heavy lifting, understanding subnetting is what lets you reason about routing tables, firewall rules, and "why can't this host reach that one" without guessing.
