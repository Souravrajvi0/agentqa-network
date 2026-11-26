# Rejected candidates

## ANTREA-EIP-001 — ExternalIPPool CIDR allocates gateway

**Why rejected:** Already tracked as [issue 7868](https://github.com/antrea-io/antrea/issues/7868) (`kind/bug`, open) and [PR 8531](https://github.com/antrea-io/antrea/pull/8531) (“Exclude gateway IP from ExternalIPPool allocation”). Code in `pkg/controller/externalippool/controller.go` reserves IPv4 broadcast but not `subnetInfo.gateway` for CIDRs.

This is **not** the same as ANTREA-IPAM-001 (IPPool start/end ranges).

## ANTREA-IPAM-003 — StatefulSet path skips `updateUsage`

`appendPoolUsageForStatefulSet` and `ReleaseStatefulSet` do not call `updateUsage`. `AllocateNext` / `Release` do.

**Why rejected:** `AntreaIPAMController.updateIPPoolCounters` recomputes `used = len(IPAddresses)` and patches status. Allocation decisions use `status.ipAddresses`, not `Usage`. This is eventual status lag, not a leak.

## ANTREA-CNI-001 — DEL does not release IP if `removeInterfaces` fails

**Why rejected:** CNI DEL is retried by kubelet. No evidence of a permanent leak when the interface layer later succeeds. SR-IOV `AllowCNIDelete` false returns try-again before IPAM by design (`server.go` comments).

## ANTREA-PCAP-001 — BPF vs tcpdump

**Why rejected:** LFX 2026 Term 1 / [issue 7701](https://github.com/antrea-io/antrea/issues/7701). In-tree `bpf_equivalence_test.go` already exists. No extra unreported mismatch was proven beyond that program.

## Policy hostNetwork / except CIDR / named ports

AddressGroup and AppliedTo skip hostNetwork Pods (`AddressGroupExcludedPodFilter`). `validateIPBlock` enforces strict except-subset. No discrepancy found against Kubernetes NP or Antrea docs in the paths read. Not filed.

## Agent/Controller version skew “permanent divergence”

No lock that freezes a stale computed policy after a successful resync was identified. Watch/API errors would surface. Not filed without a repro.

## IP allocator `i <= max` loop

`AllocateNext` iterates `i <= a.max`. Combined with `count >= max-len(reserved)` this does not allocate past the range in the cases checked. Not filed.
