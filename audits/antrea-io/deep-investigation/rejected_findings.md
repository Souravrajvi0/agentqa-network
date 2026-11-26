# Rejected hypotheses

Skeptical review (Pass 8). Each entry: why it is not reported as a validated bug.

| Hypothesis | Reason rejected |
|---|---|
| ExternalIPPool gateway in CIDR allocatable | Known #7868; fix in PR #8531 |
| Flow aggregator divide-by-zero on throughput | Guarded: `flowEndSecondsDiff > 0`, `timeEnd > timeStart` |
| Primary multiv4 double allocation | Tested `multiv4-1` — behavior correct |
| CNI DEL skips IPAM after interface remove failure | By design; DEL retried |
| PacketCapture BPF vs tcpdump mismatch | LFX mentorship #7701; not re-validated |
| Controller AppliedTo includes hostNetwork Pods | `AddressGroupExcludedPodFilter` excludes them |
| Stale IPPool lister causes permanent leak | `RetryOnConflict` + tests for stale cache |
| Antrea Proxy EndpointSlice full correctness audit | Insufficient evidence of concrete bug without repro |
| OVS orphan flows on rapid NP delete | No traced counterexample; out of audit scope |
| Cosmetic / lint / naming issues | Out of scope per charter |
| Overlapping IPPools | Duplicate of #7306 — candidate only |
| Gateway range “works if start excludes gateway” | User can misconfigure; code should still reserve per docs |