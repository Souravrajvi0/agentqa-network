# Confirmed bugs

Both findings are on `antrea-io/antrea@3aca3e73e`. No upstream PR was opened (investigation only). Tests below failed on unmodified `main`.

---

## ANTREA-IPAM-001 — IPPool start/end range allocates the gateway

**Class:** A (small IPAM fix)  
**Confidence:** high  
**Permanent incorrect state:** yes (Pod can hold the gateway until DEL)

### Contract

`docs/antrea-ipam.md` (IPPool CRD):

> when using a range with a start and end IP address, both of these IPs will be allocatable (except if one of them corresponds to the gateway).

CIDR ranges already pass the gateway into `NewCIDRAllocator` as `reservedIPs`.

### Implementation discrepancy

`pkg/ipam/poolallocator/allocator.go` `initIPAllocators`:

- CIDR branch: `reservedIPs := []net.IP{gateway}` (+ IPv4 broadcast when masks match).
- Start/end branch: `NewIPRangeAllocator(start, end)` with **no reserved IPs**.

`AllocateNext` therefore returns the gateway when it is inside `[start, end]`.

### Minimal repro

IPPool:

```yaml
apiVersion: crd.antrea.io/v1beta1
kind: IPPool
metadata:
  name: gw-range
spec:
  ipRanges:
    - start: "10.2.2.1"
      end: "10.2.2.3"
  subnetInfo:
    gateway: "10.2.2.1"
    prefixLength: 24
```

First `AllocateNext` returns `10.2.2.1`.

### Test

See `reproductions/ippool-gateway-in-range/`. Actual output:

```
--- FAIL: TestAllocateNextSkipsGatewayInIPRange (0.10s)
    allocator_test.go:843:
        Error: Should not be: ... 10.2.2.1
        Messages: gateway must not be allocated from an IP range
    actual: 10.2.2.1
    expected next: 10.2.2.2
```

This is the first allocation, not a later convergence. Status records the gateway as `Allocated` to the Pod.

### Impact

A Pod (or secondary NIC) can be assigned the subnet gateway. Underlay routing/ARP for that VLAN/subnet breaks; other Pods using that gateway fail. Same class of production pain as ExternalIPPool #7868, but **IPPool range path**, which #7868 even suggested as a workaround for ExternalIPPool CIDRs.

### Fix direction

Pass `subnetInfo.Gateway` (if it `Has()` in the range) as `reservedIPs` on the range allocator, matching the CIDR constructor. Optionally also skip IPv4 broadcast when the range includes it and `prefixLength` matches the subnet. Add the unit test in this folder to `allocator_test.go`. Do not count the gateway in `status.ipAddresses`.

Related but not the same: #7868 / PR #8531 (ExternalIPPool CIDR).

---

## ANTREA-IPAM-002 — Secondary IPAM allocates from every same-family pool

**Class:** B (IPAM + secondary CNI / NAD)  
**Confidence:** high  
**Permanent incorrect state:** yes until DEL; also consumes extra pool capacity

### Contract

`AntreaIPAM.Add` (primary) documents and tests: at most one IP per address family; extra same-family pools are fallback on `ErrPoolExhausted`. Test `multiv4-1` asserts `multiv4-pool-b` stays empty.

`SecondaryNetworkAllocate` shares the driver and the same `ErrPoolExhausted` fallback, but after a successful IPv4 allocation it still calls `AllocateNext` on the next IPv4 pool.

### Implementation discrepancy

`pkg/agent/cniserver/ipam/antrea_ipam.go`:

- `Add`: `if allocatedIPv4 { continue }` / `if allocatedIPv6 { continue }`.
- `SecondaryNetworkAllocate`: sets `allocatedIPv4`/`allocatedIPv6` but **never continues** on them; it only `continue`s on exhaustion.

Result for `ippools: [multiv4-pool-a, multiv4-pool-b]`: two IPv4 addresses on one secondary interface (`10.10.0.10` and `10.10.0.20`).

### Minimal repro

NAD IPAM config with two IPv4 pools (each with one address). Call `SecondaryNetworkAllocate` once.

### Test

See `reproductions/secondary-ipam-same-family/`. Actual output:

```
--- FAIL: TestSecondaryNetworkAllocateAtMostOneIPPerFamily (0.00s)
    Error: "[{Address:10.10.0.10/24 ...} {Address:10.10.0.20/24 ...}]" should have 1 item(s), but has 2
```

### Impact

- Extra IPs consumed from fallback pools (capacity leak / double allocation vs primary).
- Interface may receive two IPv4s; routing/policy matching on “the” Pod IP becomes ambiguous.
- Dual-stack NADs that accidentally list two IPv4 pools (copy-paste) are a realistic config.

If maintainers intend secondary `ippools` to mean “assign all listed pools”, the `ErrPoolExhausted` fallback is still inconsistent with that reading. The primary tests are the stronger contract.

### Fix direction

Copy the `allocatedIPv4` / `allocatedIPv6` `continue` from `Add` into `SecondaryNetworkAllocate`. Keep exhaustion fallback. Add the unit test to `antrea_ipam_test.go`.
