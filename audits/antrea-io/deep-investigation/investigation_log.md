# Multi-pass investigation log

Persistent log for `antrea-io/antrea@3aca3e73e`. Updates append by pass.

## Pass 1 — Architecture and repository mapping (complete)

- Cloned `antrea-io/antrea`; mapped `cmd/*`, `pkg/*`, `test/*`, `multicluster/`, org repos.
- Read `docs/design/architecture.md`, `CONTRIBUTING.md`, `docs/antrea-ipam.md`, `docs/antrea-agent-simulator.md`.
- Recorded LFX mentorship links (PacketCapture #7701, Renovate #7155).
- Output: `architecture.md`, `repository-selection` (parent folder).

## Pass 2 — Function-level correctness, IPAM/CNI (complete)

- Traced `initIPAllocators`, `AntreaIPAM.Add`, `Del`, `SecondaryNetworkAllocate`.
- Compared CIDR vs start/end branch in `poolallocator/allocator.go`.
- Found ANTREA-IPAM-001, ANTREA-IPAM-002; wrote regression tests.

## Pass 3 — Cross-component state (partial)

- CNI ADD rollback (`server.go` defer `cmdDel`).
- IPPool status vs `updateIPPoolCounters` (controller).
- Agent secondary network controller → `SecondaryNetworkAllocate`.
- Policy: `AddressGroupExcludedPodFilter` vs `syncAppliedToGroup` hostNetwork split — consistent by design.

## Pass 4 — Concurrency / lifecycle (partial)

- `poolallocator` `RetryOnConflict` + stale lister test already in-tree.
- Flow aggregator ring buffer atomics; throughput guards `flowEndSecondsDiff > 0` and `timeEnd > timeStart` — no divide-by-zero bug filed.
- Agent `containerAccessArbitrator` serializes per-container CNI — no race found on IPAM for same container.

## Pass 5 — Numerical / boundary (partial)

- Flow throughput: guarded.
- IP allocator 65536 cap documented in antrea-ipam.md — not filed as bug.

## Pass 6 — Test coverage gap (complete for IPAM)

- Primary multiv4 covered; secondary multiv4 not covered — exposed ANTREA-IPAM-002.
- Gateway-in-range not covered — exposed ANTREA-IPAM-001.

## Pass 7 — GitHub deduplication (complete)

- Searched issues/PRs for gateway, secondary IPAM, ExternalIPPool, PacketCapture, overlapping pools (#7306).
- Output: `github_dedup.md`.

## Pass 8 — Skeptical review (complete)

- ANTREA-IPAM-001: Not invalidated by docs; CIDR path proves intended gateway reserve.
- ANTREA-IPAM-002: Survives review — primary tests are explicit contract; docs list one v4 + one v6 pool per NAD, not multiple v4.
- Overlapping pools: known issue #7306 — not counted as new.

## Remaining (not done)

- Full agent OVS policy orphan flow audit on rapid Pod/policy churn.
- Egress failover + memberlist cross-node e2e.
- PacketCapture BPF tcpdump parity (LFX #7701).