# Contribution strategy

Recommended order for a new contributor (no upstream PRs from this audit).

## Phase 1 — Category A (establish trust)

**ANTREA-IPAM-001**

1. Copy `reproductions/ippool-gateway-in-range/TestAllocateNextSkipsGatewayInIPRange.go` into `pkg/ipam/poolallocator/allocator_test.go`.
2. Confirm FAIL on `main`.
3. In `initIPAllocators` start/end branch, reserve `subnetInfo.Gateway` when it falls within `[start,end]` (mirror CIDR `reservedIPs` pattern; consider broadcast for full-subnet IPv4 per existing CIDR logic).
4. Re-run package tests: `go test ./pkg/ipam/poolallocator/...`
5. Open issue + PR on `antrea-io/antrea`; cite `docs/antrea-ipam.md` and contrast with CIDR branch.

**Estimated diff:** &lt;30 lines + test.

## Phase 2 — Category B

**ANTREA-IPAM-002**

1. Add `TestSecondaryNetworkAllocateAtMostOneIPPerFamily` beside existing `multiv4-1` primary test.
2. Align `SecondaryNetworkAllocate` loop with `Add()` (`continue` after family allocated; optional `break` when v4+v6 done).
3. Run `go test ./pkg/agent/cniserver/ipam/...`
4. Mention parity with primary AntreaIPAM in PR description.

**Estimated diff:** ~15 lines logic + test table.

## Phase 3 — Community

- Ask on Slack/issue whether overlapping pools (#7306) should be revived or validated in webhook.
- Do **not** bundle gateway fix with secondary fix in one PR (easier review).

## AI / policy

Follow Antrea `CONTRIBUTING.md` for AI disclosure if required. This audit did not modify upstream sources.