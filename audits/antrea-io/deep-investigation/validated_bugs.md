# Validated software correctness bugs

Upstream: `antrea-io/antrea@3aca3e73e6d5461146b748eb7e5a31c4b7576ee3`.  
Structured mirror: `findings.json`.  
No upstream issues or PRs opened by this audit.

---

## ANTREA-IPAM-001 — IPPool start/end range allocates the gateway

| Field | Value |
|---|---|
| Bug ID | ANTREA-IPAM-001 |
| Category | A |
| Confidence | High |
| Dedup | Previously unreported candidate (#7868 is ExternalIPPool CIDR, not IPPool range) |
| Subsystem | `pkg/ipam/poolallocator` |

**Files:** `pkg/ipam/poolallocator/allocator.go` lines 127–152, function `initIPAllocators`.

**Expected:** Gateway not assigned to Pods (`docs/antrea-ipam.md`).

**Actual:** `NewIPRangeAllocator(start,end)` without reserving `subnetInfo.Gateway`; first `AllocateNext` may equal gateway.

**Test:** `TestAllocateNextSkipsGatewayInIPRange` — FAIL on unmodified `main`.

```text
FAIL: TestAllocateNextSkipsGatewayInIPRange
    Messages: gateway must not be allocated from an IP range
    actual  : 10.2.2.1
    expected: 10.2.2.2
FAIL antrea.io/antrea/v2/pkg/ipam/poolallocator 0.112s
```

**Repro:** `reproductions/ippool-gateway-in-range/`.

---

## ANTREA-IPAM-002 — Secondary IPAM allocates from every same-family pool

| Field | Value |
|---|---|
| Bug ID | ANTREA-IPAM-002 |
| Category | B |
| Confidence | High |
| Dedup | No matching GitHub issue found |
| Subsystem | `pkg/agent/cniserver/ipam` |

**Files:** `antrea_ipam.go` `SecondaryNetworkAllocate` 372–419 vs `Add` 206–272.

**Expected:** At most one IPv4 and one IPv6 (primary `multiv4-1` test).

**Actual:** Two IPv4s from `multiv4-pool-a` and `multiv4-pool-b` on one secondary attach.

**Test:** `TestSecondaryNetworkAllocateAtMostOneIPPerFamily` — FAIL on unmodified `main`.

```text
FAIL: TestSecondaryNetworkAllocateAtMostOneIPPerFamily
    should have 1 item(s), but has 2
    [{Address:10.10.0.10/24 ...} {Address:10.10.0.20/24 ...}]
```

**Repro:** `reproductions/secondary-ipam-same-family/`.