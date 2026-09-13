---
title: "Setting Up a WireGuard VPN on Linux"
description: "Generate keys, write a minimal config, and get a WireGuard tunnel running between a server and a client in under ten minutes."
pubDate: 2026-03-18
---

WireGuard trades the configuration sprawl of OpenVPN/IPsec for a small, auditable codebase and a config file you can actually read end to end. Here's a minimal server + client setup.

## Install

```
sudo apt install wireguard
```

## 1. Generate key pairs

Run this on both the server and the client:

```
wg genkey | tee privatekey | wg pubkey > publickey
```

You'll end up with a `privatekey` and `publickey` on each machine. Keep the private key secret; the public key gets shared with the other side.

## 2. Server config — `/etc/wireguard/wg0.conf`

```
[Interface]
PrivateKey = <server-private-key>
Address = 10.8.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <client-public-key>
AllowedIPs = 10.8.0.2/32
```

## 3. Client config — `wg0.conf`

```
[Interface]
PrivateKey = <client-private-key>
Address = 10.8.0.2/24

[Peer]
PublicKey = <server-public-key>
Endpoint = <server-public-ip>:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

`AllowedIPs = 0.0.0.0/0` on the client routes all traffic through the tunnel — narrow this if you only need access to specific subnets.

## 4. Bring the interface up

```
sudo wg-quick up wg0
```

Check the connection:

```
sudo wg show
```

You should see a recent handshake timestamp on both ends — that's the signal the tunnel is actually passing traffic, not just configured.

## Don't forget

- Open UDP port 51820 (or whatever `ListenPort` you chose) on the server's firewall.
- Enable IP forwarding on the server if it's meant to route client traffic onward: `sysctl -w net.ipv4.ip_forward=1`.
