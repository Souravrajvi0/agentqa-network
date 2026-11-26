# WasmEdge Runtime Audit — Bug Report

**Repository:** [WasmEdge/WasmEdge](https://github.com/WasmEdge/WasmEdge)  
**Commit audited:** `e0ba07fd56fe0c7a022ca884882d394c96052597`  
**Audit date:** 2026-11-26  
**Method:** Source trace (loader → validator → interpreter/AOT → WASI → C API), GitHub issue search, local errno checks. Full WasmEdge was not built in the audit environment (no linked `wasmedge` binary for runtime spectests).

**Scope:** Read-only investigation. Production WasmEdge code was not modified in the audit.

---

## Executive summary

| Metric | Count |
|--------|------:|
| Confirmed new bugs (WE-1 … WE-8) | **8** |
| Confirmed, already on GitHub | **1** ([#5537](https://github.com/WasmEdge/WasmEdge/issues/5537)) |
| Rejected false positives | **8** |
| GitHub issues filed from audit (intended) | **0** under @Souravrajvi0 |

**Severity mix:** No item classified as critical. Most are medium or low; several are latent or platform-specific.

**Filing policy:** Upstream issues must be opened as **@Souravrajvi0**, not `app/cursor`. Draft text for WE-1 lives in `wasmedge-audit/upstream/WE-1-issue-draft.md`. A mistaken bot file ([#5669](https://github.com/WasmEdge/WasmEdge/issues/5669)) should be closed or ignored; re-file under your account when ready.

---

## Confirmed bugs (WE-1 … WE-8)

### WE-1 — Interpreter `memory.atomic.fence` is not sequentially consistent

| Field | Value |
|-------|--------|
| Category | **A** |
| Severity | Medium |
| Confidence | High |
| Modes | Interpreter wrong; AOT/JIT correct |
| Upstream | Unreported as @Souravrajvi0 ([#5669](https://github.com/WasmEdge/WasmEdge/issues/5669) is `app/cursor`, mistaken) |

**Spec:** Threads proposal — `memory.atomic.fence` is a sequentially consistent fence.

**Locations**

- Interpreter: `lib/executor/engine/threadInstr.cpp` — `Executor::runMemoryFenceOp` uses `std::atomic_thread_fence(std::memory_order_release)`
- AOT: `lib/llvm/compiler/threadInstr.cpp` — `compileMemoryFence` uses `LLVMAtomicOrderingSequentiallyConsistent`

**Impact:** Concurrent shared-memory Wasm can see orderings the spec forbids in interpreter mode that AOT would not allow (especially on weak memory ISAs).

**Fix:** `std::memory_order_seq_cst` in `runMemoryFenceOp`; comment parity with AOT.

**Reproduction:** `wasmedge-audit/reproductions/WE-01-atomic-fence/` — needs multi-threaded litmus; single-threaded fence-only modules pass.

---

### WE-2 — `path_link` checks the old fd twice

| Field | Value |
|-------|--------|
| Category | **A** |
| Severity | Low (masked by `VINode::pathLink`) |
| Confidence | High |
| Upstream | Unreported |

**Spec:** WASI `path_link` — `badf` if either fd is invalid.

**Location:** `include/host/wasi/environ.h` ~699–701 — second check uses `!OldNode` instead of `!NewNode`.

**Impact:** Guest errno is still `BADF` today via `VINode`; Environ guard is wrong and risky if the VINode check is removed later.

**Fix:** Replace with `!NewNode`; add WASI unit test for invalid `new_fd`.

---

### WE-3 — `random_get` is not a CSPRNG

| Field | Value |
|-------|--------|
| Category | **A** |
| Severity | Medium (contract, not crash) |
| Confidence | High |
| Upstream | Unreported |

**Spec:** WASI `random_get` — high-quality random data; may block until entropy is available.

**Locations**

- `include/host/wasi/environ.h` — `Environ::randomGet`
- `include/common/hash.h` — `Hash::RandEngine` (non-crypto PRNG)

**Impact:** Predictable/non-cryptographic output; does not use OS CSPRNG or block.

**Fix:** Fill buffer from platform CSPRNG (`getrandom`, etc.).

---

### WE-4 — `fromErrNo` UB for `EOPNOTSUPP` on macOS

| Field | Value |
|-------|--------|
| Category | **A** |
| Severity | Medium on macOS; N/A on Linux (`ENOTSUP == EOPNOTSUPP`) |
| Confidence | High on Darwin |
| Upstream | Unreported |

**Location:** `lib/host/wasi/macos.h` — `fromErrNo` has `ENOTSUP` only; `default: assumingUnreachable()`.

**Impact:** Host errno `EOPNOTSUPP` (102 on Darwin) can hit unreachable / UB.

**Fix:** Add `EOPNOTSUPP` case when distinct from `ENOTSUP`; map unknown errno to `IO` or `NOSYS` instead of `assumingUnreachable()`.

---

### WE-5 — `InitWASI` / `Environ::init` does not reset fd table

| Field | Value |
|-------|--------|
| Category | **A** |
| Severity | Medium |
| Confidence | High |
| Upstream | Unreported |

**Locations:** `lib/host/wasi/environ.cpp` `Environ::init`, `lib/api/wasmedge.cpp` `WasmEdge_ModuleInstanceInitWASI`.

**Impact:** Second init keeps old stdio/preopens; `emplace` does not overwrite.

**Fix:** Call `fini()` or clear `FdMap` at start of `init` / `initWithFds`.

---

### WE-6 — `initWithFds` leaves partial stdio on failure

| Field | Value |
|-------|--------|
| Category | **A** |
| Severity | Low–medium |
| Confidence | High |
| Upstream | Unreported |

**Location:** `lib/host/wasi/environ.cpp` `Environ::initWithFds`.

**Impact:** On stdout/stderr `fromFd` failure, stdin may already be in `FdMap`.

**Fix:** Roll back on error or build fd map atomically.

---

### WE-7 — `fd_renumber` skips poller `close` on overwritten fd

| Field | Value |
|-------|--------|
| Category | **A** |
| Severity | Low–medium |
| Confidence | Medium–high |
| Upstream | Unreported (related #3040 fixed different bug; #2292 is policy) |

**Locations:** `include/host/wasi/environ.h` `fdRenumber` vs `fdClose`; Linux `epoll_ctl(DEL)` in `Environ::close`.

**Impact:** Stale epoll registration vs recycled OS fds under `poll_oneoff`.

**Fix:** `close(It2->second)` before erase in `fdRenumber`; macOS `Poller::close` if needed.

---

### WE-8 — Memory instantiate succeeds after allocation failure

| Field | Value |
|-------|--------|
| Category | **B** |
| Severity | Medium |
| Confidence | High |
| Upstream | Unreported |

**Locations**

- `include/runtime/instance/memory.h` — on allocate failure, live pages → 0, no error
- `lib/executor/instantiate/memory.cpp` — always succeeds
- Contrast: `lib/executor/instantiate/table.cpp` — `AllocationFailed`

**Impact:** Module can instantiate with `min > 0` memory but null backing store.

**Fix:** Propagate `AllocationFailed` like tables.

---

## Already reported (do not re-file)

### Failed module lifetime (`FailedMod` / `recycleModule`)

| Field | Value |
|-------|--------|
| Category | **C** |
| Upstream | [#5537](https://github.com/WasmEdge/WasmEdge/issues/5537) (open) |
| Location | `include/runtime/storemgr.h:152-173` |

Second failed instantiation can leave dangling references (SIGSEGV). Tracked upstream; do not open a duplicate issue.

---

## GitHub deduplication summary

| ID | Upstream status |
|----|-----------------|
| WE-1 | No matching issue at audit time; mistaken bot #5669 |
| WE-2 | Unreported |
| WE-3 | Unreported (#4872 / #1892 unrelated) |
| WE-4 | Unreported |
| WE-5, WE-6 | Unreported |
| WE-7 | Unreported (#3040 same-fd crash, fixed) |
| WE-8 | Unreported |
| FailedMod | **#5537** |

---

## Rejected candidates (not bugs)

| Topic | Reason |
|-------|--------|
| `f32.eq` +0/-0 | Spec behavior |
| `fmin` NaN | Spec behavior |
| Narrow atomic sizeof OOB | Guarded |
| Empty expr on load | Loader rejects |
| Linux `EOPNOTSUPP` alias | Same constant as `ENOTSUP` on audit host |
| `fd_sync` on directory | Tested required behavior |
| `StopToken` relaxed | Not confirmed as violation |
| `clock_time_get` precision | Not confirmed |

Full notes: `wasmedge-audit/rejected-candidates.md`.

---

## Classification table

| ID | Cat | One-line | Severity |
|----|-----|----------|----------|
| WE-1 | A | Interpreter atomic fence is `release`, not `seq_cst` | Medium |
| WE-2 | A | `path_link` NewNode check copies OldNode | Low |
| WE-3 | A | `random_get` uses PRNG | Medium |
| WE-4 | A | macOS `fromErrNo` misses `EOPNOTSUPP` | Medium (macOS) |
| WE-5 | A | `InitWASI` does not reset `FdMap` | Medium |
| WE-6 | A | `initWithFds` partial stdio insert | Low–medium |
| WE-7 | A | `fd_renumber` skips poller close | Low–medium |
| WE-8 | B | Memory OOM at instantiate is silent | Medium |
| — | C | `FailedMod` UAF | **#5537** |

---

## Suggested fix order (for PRs)

1. WE-2 — one-line + test  
2. WE-1 — `seq_cst` fence  
3. WE-4 — errno mapping  
4. WE-6 + WE-5 — init lifecycle  
5. WE-7 — `fd_renumber`  
6. WE-3 — CSPRNG  
7. WE-8 — memory allocation propagation  
8. Follow **#5537** for store lifetime — no new issue  

Details: `wasmedge-audit/contribution-roadmap.md`.

---

## Supporting artifacts in this repo

| Path | Contents |
|------|----------|
| `wasmedge-audit/confirmed-bugs.md` | Full per-bug write-up |
| `wasmedge-audit/candidates.json` | Machine-readable findings |
| `wasmedge-audit/github-dedup.md` | Search notes |
| `wasmedge-audit/architecture.md` | Runtime map |
| `wasmedge-audit/reproductions/` | Harness notes per ID |
| `wasmedge-audit/upstream/WE-1-issue-draft.md` | Issue template (file as @Souravrajvi0) |

---

*Report consolidated from the WasmEdge read-only audit branch `feat/wasmedge-runtime-audit-914e`.*