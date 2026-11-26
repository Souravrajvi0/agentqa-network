# Phase 1 — Architecture

Source: `docs/design/architecture.md`, `docs/antrea-ipam.md`, `docs/antrea-network-policy.md`, and code under `pkg/` at `3aca3e73e`.

## Control / data plane split

```
kubectl / CNI ADD-DEL
        |                    |
        v                    v
 kube-apiserver         antrea-cni (node)
        |                    |
        v                    v gRPC
 antrea-controller      antrea-agent
  (NetworkPolicy,         (OVS bridge, flows,
   IPPool status,          IPAM, proxy, capture)
   ExternalIPPool)
        |                    |
        +-- watch/protobuf --+
        v
   Open vSwitch datapath
```

### CNI plugin and interface configuration

- Binary: `cmd/antrea-cni` → gRPC client in `pkg/cni`.
- Server: `pkg/agent/cniserver` (`CmdAdd` / `CmdDel` / `CmdCheck`).
- ADD allocates IP (infra container only), configures veth/OVS port, programs Pod flows.
- Failed ADD rolls back via `cmdDel` while holding the per-container lock (`containerAccessArbitrator`).
- DEL removes OVS/host interfaces first, then IPAM release. SR-IOV secondary NICs can force DEL retry before IPAM release.

### Antrea Agent

- Per-Node DaemonSet: Agent + OVS.
- Owns: OVS bridge, tunnel/encap, NetworkPolicy flow install, Antrea Proxy, multicast, Traceflow/PacketCapture, local IPAM for AntreaIPAM.
- Interface store + OpenFlow client assume serialized CNI ops per container ID.

### Antrea Controller

- Single replica. Watches K8s NP / AntreaPolicy / Pods / Namespaces / Groups.
- Computes AddressGroups / AppliedToGroups; streams protobuf to Agents via aggregated API.
- Also runs NodeIPAM (optional), ExternalIPPool, Egress assignment, IPPool usage counters, Traceflow validation.

### IPAM

- Default: host-local / Node PodCIDR (kube or Antrea NodeIPAM).
- AntreaIPAM: `IPPool` CRD; Agent `pkg/agent/cniserver/ipam` + `pkg/ipam/poolallocator` updates `IPPool.status.ipAddresses`.
- Secondary networks: same AntreaIPAM driver via NAD `ipam.ippools` (`SecondaryNetworkAllocate`).
- StatefulSet: pre-reserve contiguous IPs; DEL keeps reservation until the StatefulSet is deleted.

### NetworkPolicy → OVS

- Controller: `pkg/controller/networkpolicy` (K8s NP, ANNP, ACNP, AdminNetworkPolicy, Groups).
- Agent: `pkg/agent/controller/networkpolicy` + `pkg/agent/openflow/network_policy.go`.
- HostNetwork Pods are excluded from AppliedTo and AddressGroups (`AddressGroupExcludedPodFilter`).
- Named ports, `endPort`, FQDN, L7, Node NP are additional paths.

### Other subsystems in this tree

- Service proxy: `docs/antrea-proxy.md`, Agent proxy.
- Multicast, Traceflow, PacketCapture CRDs + Agent controllers.
- CRD defaulting/validation: webhooks in `pkg/controller/networkpolicy/validate.go`, `mutate.go`, Traceflow/IPPool validators.
- Informers + workqueues: standard client-go; IPPool status uses `RetryOnConflict` with custom backoff.
- Version skew: Agents watch Controller API; no separate permanent “skew lock” was found that would freeze policy; mismatches surface as API/watch errors. Not treated as a confirmed correctness bug without a repro.

## Tests mapped to components

- IPAM allocator: `pkg/ipam/poolallocator/allocator_test.go`, `pkg/ipam/ipallocator/allocator_test.go`
- AntreaIPAM CNI: `pkg/agent/cniserver/ipam/antrea_ipam_test.go` (primary fallback, dual-stack, secondary add)
- Policy: `pkg/controller/networkpolicy/*_test.go`, `pkg/agent/controller/networkpolicy/*_test.go`, `pkg/agent/openflow/network_policy_test.go`
- PacketCapture BPF: `pkg/agent/packetcapture/capture/bpf_test.go`, `bpf_equivalence_test.go`
- e2e: `test/e2e` (policy, IPAM, secondary IPAM, Traceflow, PacketCapture, proxy)
