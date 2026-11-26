# Candidate findings (not validated as new bugs)

## ANTREA-IPAM-CAND-001 — Overlapping IPPool CIDRs / ranges

**Status:** Known issue, not a new discovery.  
**GitHub:** [#7306](https://github.com/antrea-io/antrea/issues/7306) (closed `not_planned`).  
**Related:** [#7307](https://github.com/antrea-io/antrea/issues/7307) start>end validation (may address partial overlap).

**Hypothesis:** Without admission validation, two pools can claim the same addresses; agents may double-allocate or fight on status patches.

**Why not validated here:** Maintainers already discussed; no minimal new repro beyond issue thread. Suitable for **Category C** mentorship if reopened.

---

## Secondary multiv4 — intentional multi-address?

**Status:** Hypothesis rejected if product intent is “all pools = all addresses.”

**Evidence against intent:** Primary `Add()` explicitly skips second IPv4 pool after success; documentation describes fallback on exhaustion, not multi-homing via multiple pools on one interface.

**Action:** If maintainers clarify multi-pool secondary as feature, ANTREA-IPAM-002 would be reclassified; until then, inconsistency with primary is a correctness bug.

---

## IPPool status vs StatefulSet `Usage` counter lag

**Status:** Rejected as bug (eventual consistency).

**Notes:** `updateIPPoolCounters` may briefly lag; DEL paths eventually reconcile. Not a permanent leak in traced code.