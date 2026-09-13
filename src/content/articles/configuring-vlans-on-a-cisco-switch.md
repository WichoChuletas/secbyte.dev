---
title: "Configuring VLANs on a Cisco Catalyst Switch"
description: "Step-by-step commands for creating VLANs, assigning access ports, and setting up a trunk between two Catalyst switches."
pubDate: 2026-02-03
---

VLANs let you segment a single physical switch into multiple isolated broadcast domains. Here's the minimum viable configuration for two switches with a trunk between them.

## 1. Create the VLANs

```
Switch(config)# vlan 10
Switch(config-vlan)# name ENGINEERING
Switch(config-vlan)# exit

Switch(config)# vlan 20
Switch(config-vlan)# name SALES
Switch(config-vlan)# exit
```

## 2. Assign access ports

```
Switch(config)# interface range gi1/0/1 - 10
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 10
Switch(config-if-range)# exit

Switch(config)# interface range gi1/0/11 - 20
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 20
Switch(config-if-range)# exit
```

## 3. Configure the trunk

The uplink between switches needs to carry traffic for both VLANs:

```
Switch(config)# interface gi1/0/24
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 10,20
Switch(config-if)# exit
```

Repeat the trunk configuration on the matching port of the second switch.

## 4. Verify

```
Switch# show vlan brief
Switch# show interfaces trunk
```

`show vlan brief` confirms which ports belong to which VLAN. `show interfaces trunk` confirms the trunk is up and which VLANs are allowed across it.

## Common gotcha

If two switches won't pass traffic between VLANs after a trunk is configured, check that both ends agree on native VLAN and that `switchport trunk allowed vlan` lists match — a mismatch here silently drops traffic for the missing VLAN.
