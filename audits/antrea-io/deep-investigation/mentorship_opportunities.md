# Mentorship-scale opportunities (Category C)

These are **not** validated single-PR bugs; they need design, tests, and often cross-component work.

## 1. IPAM admission and overlap safety

**Problem:** Overlapping `IPPool` / `ExternalIPPool` definitions (#7306) can cause ambiguous ownership of addresses across pools and agents.

**Why large:** Validating overlaps requires CRD webhook rules, possibly CNI error surfaces, migration for existing clusters, and e2e matrix across AntreaIPAM + host-local + secondary networks.

**Not the same as:** ANTREA-IPAM-001/002 (localized driver fixes).

## 2. PacketCapture BPF filter equivalence

**Tracker:** LFX / issue #7701.

**Why large:** Kernel BPF program vs tcpdump semantics, CI equivalence tests (`bpf_equivalence_test.go`), platform variance.

## 3. Unified AntreaIPAM contract tests (primary + secondary + StatefulSet)

**Problem:** Primary has rich table tests; secondary and StatefulSet paths diverged (002).

**Why large:** Extract shared “one per family + exhaustion fallback” helper; document NAD examples; e2e in `test/e2e-secondary-network`.

## 4. OVS policy + IP lifecycle under churn

**Problem:** Unproven in this audit — rapid NP/ Pod delete may leave stale flows or IPs.

**Why large:** Requires simulator/e2e harness, flow dumps, and reconciler invariants across agent restart.

## Qualification note

Mentorship projects should be confirmed with Antrea maintainers (LFX issues #6861, #6976, #7701). The two **validated** bugs remain better **first contributions** (Categories A and B).