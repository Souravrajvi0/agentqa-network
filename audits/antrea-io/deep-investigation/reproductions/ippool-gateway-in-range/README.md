# Repro: IPPool start/end range assigns the gateway

Upstream tree: `antrea-io/antrea` @ `3aca3e73e`.

## Fixture

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

## Unit test (drop into `pkg/ipam/poolallocator/allocator_test.go`)

See `TestAllocateNextSkipsGatewayInIPRange.go`.

```bash
cd antrea
go test -count=1 -timeout 120s ./pkg/ipam/poolallocator/ -run TestAllocateNextSkipsGatewayInIPRange
```

## Observed on this machine (unpatched main)

```
--- FAIL: TestAllocateNextSkipsGatewayInIPRange (0.10s)
    Messages: gateway must not be allocated from an IP range
    expected: 10.2.2.2
    actual:   10.2.2.1
FAIL	antrea.io/antrea/v2/pkg/ipam/poolallocator	0.112s
```

Not eventual: first `AllocateNext` returns the gateway and writes it to `status.ipAddresses`.
