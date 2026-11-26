# Contribution roadmap

Do **not** auto-open issues or PRs on `antrea-io/antrea` from this audit. File only after a human maintainer-facing review of the two confirmed items.

## Class A — ANTREA-IPAM-001

**Scope:** `pkg/ipam/poolallocator/allocator.go` + `NewIPRangeAllocator` reserved IPs + one unit test.

**Steps:**

1. Extend range allocator construction so `SubnetInfo.Gateway` is reserved when it lies in `[start, end]` (same mechanism as CIDR `reservedIPs`).
2. Decide whether IPv4 broadcast inside a start/end range should also be reserved when `prefixLength` matches the subnet (docs currently call that out for CIDR only).
3. Land `TestAllocateNextSkipsGatewayInIPRange`.
4. Mention #7868 in the PR body as related (ExternalIPPool CIDR), not as a duplicate.

**Risk:** low. Existing range tests use gateways *outside* the range (`10.2.2.1` vs `10.2.2.100–120`), so they should stay green.

## Class B — ANTREA-IPAM-002

**Scope:** `SecondaryNetworkAllocate` in `pkg/agent/cniserver/ipam/antrea_ipam.go` + unit test.

**Steps:**

1. After a successful allocation, `continue` when that family is already satisfied (copy `Add()`).
2. Keep `ErrPoolExhausted` fallback.
3. Land `TestSecondaryNetworkAllocateAtMostOneIPPerFamily`.
4. Confirm with maintainers that NAD `ippools` listing two IPv4 pools is fallback, not “assign both”. If they want “assign all listed pools”, remove the exhaustion-as-fallback behavior instead and document it — do not leave both interpretations.

**Risk:** medium. Anyone relying on two IPv4s from two pools on one secondary NIC would see a behavior change. Docs examples never show that.

## Class C

No systemic Agent/Controller/OVS consistency bug was confirmed in this pass. PacketCapture BPF vs tcpdump is already Class-C mentorship (#7701). Do not duplicate it.

## Suggested PR split (when permission exists)

1. `fix: reserve IPPool gateway in start/end ranges` (A)
2. `fix: allocate at most one IP per family for secondary AntreaIPAM` (B)

Each PR: failing test first or together with the fix; no drive-by refactors.

## Mentorship overlap

Prefer IPAM PRs over PacketCapture BPF work unless joining LFX #7701 explicitly.
