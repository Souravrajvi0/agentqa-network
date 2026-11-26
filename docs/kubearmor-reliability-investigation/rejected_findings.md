# Rejected findings (skeptical review)

## R1 — `Feeder.Warnf` uses `kg.Warnf(str)` instead of `kg.Warn(str)`

- **Reason:** `str` is already `fmt.Sprintf`’d; zap SugaredLogger accepts a single formatted string. Behavior matches `Errf` pattern. No demonstrated log corruption.
- **Verdict:** Cosmetic / style, not a reliability bug.

## R2 — PushMessage “last uid” comment vs drop logging

- **Reason:** Code drops telemetry only when **all** subscriber channels are full (`counter == lenMsg`). Comment is misleading, not behaviorally wrong.
- **Verdict:** Docs-only if anything.

## R3 — Separate `core` vs `monitor` StopChan as immediate bug

- **Partially rejected as duplicate root:** Primary shutdown defect is tracked in #2652/#2295; monitor channel never closed is **accepted** as KA-REL-003 but not filed as separate CVE-class issue.

## R4 — Empty KubeArmorPolicy reconciler as “security gap”

- **Reason:** This investigation scoped **operational** status bookkeeping only. Empty reconciler is a known scaffold gap (KA-REL-004), not a bypass.
- **Verdict:** Valid ops issue; excluded from security framing.

## R5 — MatchPatterns not in BPF

- **Reason:** Prior enforcement-focused investigation finding; **out of scope** for this reliability pass unless telemetry shows silent no-ops without CRD warning.
- **Verdict:** Deferred to policy-semantics track, not counted here.

## R6 — Fabricated Ginkgo / kind results

- **Reason:** No cluster on VM.
- **Verdict:** No findings claimed from k8s_env tests.