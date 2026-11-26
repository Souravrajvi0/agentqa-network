# Repro: secondary IPAM assigns two IPv4s from two IPv4 pools

Upstream tree: `antrea-io/antrea` @ `3aca3e73e`.

Primary `Add()` already tests this (`multiv4-1` uses `multiv4-pool-a` + `multiv4-pool-b` and expects a single IPv4). `SecondaryNetworkAllocate` does not skip after a successful same-family allocation.

## Fixture

Use the existing test pools in `createIPPools` (`multiv4-pool-a` = `10.10.0.10`, `multiv4-pool-b` = `10.10.0.20`), or:

```json
{
  "cniVersion": "0.3.0",
  "type": "macvlan",
  "ipam": {
    "type": "antrea",
    "ippools": ["multiv4-pool-a", "multiv4-pool-b"]
  }
}
```

## Unit test

Drop `TestSecondaryNetworkAllocateAtMostOneIPPerFamily.go` into `pkg/agent/cniserver/ipam/antrea_ipam_test.go`.

```bash
cd antrea
go test -count=1 -timeout 180s ./pkg/agent/cniserver/ipam/ -run TestSecondaryNetworkAllocateAtMostOneIPPerFamily
```

## Observed on this machine (unpatched main)

```
--- FAIL: TestSecondaryNetworkAllocateAtMostOneIPPerFamily (0.00s)
    Error: "[{Address:10.10.0.10/24 Gateway:10.10.0.1} {Address:10.10.0.20/24 Gateway:10.10.0.1}]" should have 1 item(s), but has 2
FAIL	antrea.io/antrea/v2/pkg/agent/cniserver/ipam	0.020s
```
