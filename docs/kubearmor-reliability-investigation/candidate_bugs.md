# Candidate bugs (not fully re-tested)

## KA-REL-006 — Policy informer resync insert

- **Source:** [Issue #3015](https://github.com/kubearmor/KubeArmor/issues/3015)
- **File:** `KubeArmor/core/kubeUpdate.go` `WatchSecurityPolicies` UpdateFunc
- **Hypothesis:** MODIFIED event updates index only if name exists; never appends → phantom empty `dm.SecurityPolicies`
- **Confidence:** Medium (needs table-driven informer fake test)
- **Category:** B

## KA-REL-008 — `DestroyKubeArmorDaemon` logs termination before `CloseStateAgent`

- **File:** `KubeArmor/core/kubeArmor.go` L229–241
- **Hypothesis:** Misordered shutdown logging/telemetry; StateAgent closed after “Terminated KubeArmor” message
- **Impact:** Operational confusion in logs, possible lost final node events
- **Confidence:** Low–medium
- **Category:** A

## KA-REL-009 — `GetUptimeTimestamp` fragile `/proc/uptime` parse

- **File:** `KubeArmor/common/common.go` L201–224
- **Hypothesis:** Missing fractional part or short read → `ParseInt` errors logged, partial zero contribution still used
- **Not validated** with mocked `/proc` on this pass
- **Category:** A / G

## KA-REL-010 — Feeder broadcast drop counter uses map iteration order

- **File:** `KubeArmor/feeder/feeder.go` PushMessage/PushLog alerts L579–587, L907–915
- **Hypothesis:** Comment says “last uid”; actually increments per full channel until `counter == len` — drop notice only when **all** subscribers busy (may be intentional)
- **Status:** Needs maintainer intent confirmation → moved to rejected unless proven wrong

## KA-REL-011 — CRI-O 50ms polling loop on failed container start

- **Dedup:** [#3007](https://github.com/kubearmor/KubeArmor/issues/3007)
- **Category:** F / C
- **Confidence:** Medium (not load-tested here)