# Confirmed findings

Audit of WasmEdge/WasmEdge @ `e0ba07fd56fe0c7a022ca884882d394c96052597`. Production code was not changed. None of these were filed upstream from this work.

Runtime execution of interpreter/AOT binaries was not available in this environment. Each item states how it was established (source vs spec, and/or a local check).

---

## WE-1 — Interpreter `memory.atomic.fence` is not sequentially consistent

| Field | Value |
|---|---|
| Category | **A** |
| Severity | Medium (memory-model; silent disagreement with AOT and the threads spec) |
| Confidence | **High** (source vs spec; AOT contrast) |
| Modes | Interpreter **wrong**; AOT/JIT **correct** (`LLVMAtomicOrderingSequentiallyConsistent`) |
| Spec | Threads proposal: `memory.atomic.fence` is an SC fence |

**Locations**

- Interpreter: `lib/executor/engine/threadInstr.cpp` `Executor::runMemoryFenceOp` — `std::atomic_thread_fence(std::memory_order_release)`
- AOT: `lib/llvm/compiler/threadInstr.cpp` `compileMemoryFence` — `Builder.createFence(LLVMAtomicOrderingSequentiallyConsistent)`

**Discrepancy**

Release fence is weaker than sequentially consistent. Concurrent Wasm using shared memory + fence can observe orderings the spec forbids, and those orderings will not match AOT.

**Reproduction**

See `reproductions/WE-01-atomic-fence/`. A single-threaded module containing `memory.atomic.fence` will **not** fail; the defect is the C++/`IR` ordering. Litmus tests need two threads and shared memory (not deterministic on x86 TSO).

**Fix direction**

Use `std::memory_order_seq_cst` in `runMemoryFenceOp`. Add a comment that it must match AOT. Optional: a unit test that the interpreter helper is compiled as seq_cst (source-level) plus a threads-proposal spectest if not already run for the interpreter.

---

## WE-2 — `path_link` checks the old fd twice

| Field | Value |
|---|---|
| Category | **A** |
| Severity | Low (currently masked by `VINode::pathLink`) |
| Confidence | **High** (typo in source) |
| Modes | All (WASI host) |
| Spec | WASI `path_link`: `badf` if either fd is invalid |

**Locations**

```686:704:include/host/wasi/environ.h
    auto OldNode = getNodeOrNull(Old);
    if (unlikely(!OldNode)) {
      return WasiUnexpect(__WASI_ERRNO_BADF);
    }
    auto NewNode = getNodeOrNull(New);
    if (unlikely(!OldNode)) {   // should be !NewNode
      return WasiUnexpect(__WASI_ERRNO_BADF);
    }
    return VINode::pathLink(std::move(OldNode), OldPath, std::move(NewNode),
```

**Discrepancy**

Invalid `new_fd` is not rejected at the `Environ` layer. `VINode::pathLink` still returns `BADF` for a null `New`, so today’s guest-visible errno is correct. The second check is dead; a future edit that removes the `VINode` guard would turn invalid `new_fd` into a null dereference (`Old->can` is fine, `New->can` would not be reached only if the VINode check stays).

**Reproduction**

`reproductions/WE-02-path-link-newfd/`. Unit test: valid `old`, invalid `new` still `BADF` today; the assertion to add is that the `Environ` guard uses `NewNode`.

**Fix direction**

Replace `!OldNode` with `!NewNode`. Add a WASI unit test that only `new` is `BADF` (already implied by `VINode`, still worth pinning).

---

## WE-3 — `random_get` is not a CSPRNG

| Field | Value |
|---|---|
| Category | **A** |
| Severity | Medium (spec quality; not a crash) |
| Confidence | **High** |
| Modes | All WASI |
| Spec | WASI `random_get`: high-quality random data, may block until available |

**Locations**

- `include/host/wasi/environ.h` `Environ::randomGet` — `std::uniform_int_distribution` over `Hash::RandEngine`
- `include/common/hash.h` — `RandomEngine` is a rapidhash counter seeded once from `std::random_device`

**Discrepancy**

Output is a fast non-cryptographic mixer, not OS entropy (`getrandom` / `BCryptGenRandom` / `SecRandomCopyBytes`). It never blocks. Wasmtime/WASI implementations use the OS CSPRNG.

GitHub search for `random_get` + CSPRNG on WasmEdge/WasmEdge returned no matching correctness issue (only unrelated uses of the import name).

**Reproduction**

`reproductions/WE-03-random-get/`. Source-level: `randomGet` never calls a kernel RNG API. Statistical tests are unnecessary to show the contract miss.

**Fix direction**

Fill the buffer from the platform CSPRNG; keep `Hash::RandEngine` for fd numbers if desired. Add a test that the implementation path is the OS RNG (or that `random_get` of 16 bytes is not a linear function of a known seed).

---

## WE-4 — `fromErrNo` default is UB for `EOPNOTSUPP` on macOS

| Field | Value |
|---|---|
| Category | **A** |
| Severity | Medium on macOS (debug assert / release UB); not hit on Linux where the constants alias |
| Confidence | **High** on macOS headers; **N/A** on this Linux host (`ENOTSUP==EOPNOTSUPP==95`) |
| Modes | WASI host, macOS (and any libc with distinct `EOPNOTSUPP`) |
| Spec | WASI functions return a defined `errno` |

**Locations**

- `lib/host/wasi/macos.h` `fromErrNo`: `case ENOTSUP` only; `default: assumingUnreachable()`
- Same pattern: `linux.h`, `win.h`

On Darwin, `ENOTSUP` is 45 and `EOPNOTSUPP` is 102. Socket/FS calls commonly return `EOPNOTSUPP`. In `NDEBUG`, `assumingUnreachable()` is `__builtin_unreachable()`.

**Local check**

Linux audit machine: aliases equal (see `audit-coverage.md`). macOS not executed here.

**Reproduction**

`reproductions/WE-04-eopnotsupp/`. On macOS: trigger an operation that yields `EOPNOTSUPP` (e.g. unsupported `setsockopt`) and require `notsup` rather than a crash.

**Fix direction**

```cpp
#if defined(EOPNOTSUPP) && EOPNOTSUPP != ENOTSUP
  case EOPNOTSUPP:
#endif
  case ENOTSUP:
    return __WASI_ERRNO_NOTSUP;
```

Map unknown errno to `__WASI_ERRNO_IO` or `NOSYS` instead of `assumingUnreachable()`.

---

## WE-5 — WASI `init` / C API `InitWASI` does not reset the fd table

| Field | Value |
|---|---|
| Category | **A** (small API/lifecycle fix) |
| Severity | Medium (stale preopens and stdio after “re-init”) |
| Confidence | **High** |
| Modes | All; embedder C API |
| Contract | `WasmEdge_ModuleInstanceInitWASI` “will initialize the WASI host module with the parameters” |

**Locations**

- `lib/host/wasi/environ.cpp` `Environ::init`: `FdMap.emplace(0/1/2/…)` with **no** `fini()` / `FdMap.clear()`
- `include/host/wasi/wasimodule.h` `WasiModule::init` — forwards only
- `lib/api/wasmedge.cpp` `WasmEdge_ModuleInstanceInitWASI` / `InitWASIWithFds`

`unordered_map::emplace` does not overwrite. A second `InitWASI` keeps the old stdin/stdout/stderr and old preopen fds; new preopens starting at fd 3 fail to insert.

Unit tests usually call `Env.fini()` between inits; the C API does not.

**Reproduction**

`reproductions/WE-05-initwasi-reuse/`.

**Fix direction**

Call `fini()` (or clear `FdMap` + pollers) at the start of `init` / `initWithFds`. Make `initWithFds` roll back fds already inserted if a later stdio `fromFd` fails (WE-6).

---

## WE-6 — `initWithFds` is not atomic on stdio failure

| Field | Value |
|---|---|
| Category | **A** |
| Severity | Low–medium |
| Confidence | **High** |
| Modes | C API `InitWASIWithFds` |
| Contract | Initialization should not leave a half-open fd table |

**Locations**

`lib/host/wasi/environ.cpp` `Environ::initWithFds`: stdin is `emplace`d before stdout is validated; on stdout failure the function returns with fd 0 already in `FdMap`. Existing test `WasiTest` invalid-stdout case does **not** `fini()` and does not assert `FdMap` is empty.

**Reproduction**

`reproductions/WE-06-initwithfds-rollback/`. After failed init with invalid stdout, `fd_write(0, …)` should be `badf` if rollback is implemented; today fd 0 may exist.

**Fix direction**

Insert into a temporary map, or `fini()`/`erase` on every error path.

---

## WE-7 — `fd_renumber` does not run poller `close` on the overwritten fd

| Field | Value |
|---|---|
| Category | **A** |
| Severity | Low–medium (Linux poller `OldFdDatas` vs recycled OS fds; rebuild mitigates some cases) |
| Confidence | **Medium–high** (code difference vs `fdClose` is certain; user-visible race is situational) |
| Modes | WASI, especially Linux `poll_oneoff` |
| Spec | Overwriting `to` must drop the previous descriptor |

**Locations**

- `fdClose`: `close(It->second); FdMap.erase(It);` (`environ.h`)
- `fdRenumber`: `FdMap.erase(It2)` **without** `Environ::close`
- `Environ::close` iterates `PollerPool` and `epoll_ctl(DEL)` (`inode-linux.cpp`)

macOS `Poller::close` is a no-op (`inode-macos.cpp`), a related platform inconsistency.

**Reproduction**

`reproductions/WE-07-fd-renumber-poller/`. Sequence: poll a pipe, `fd_renumber` over that fd, open a new file that reuses the OS fd, poll again. Expected: no spurious events from the overwritten node; MOD vs ADD should not confuse `OldFdDatas`.

**Fix direction**

Call `close(It2->second)` before erasing in `fdRenumber` (when `Fd != To`). Implement macOS `Poller::close`.

---

## WE-8 — Memory instantiation swallows allocation failure

| Field | Value |
|---|---|
| Category | **B** |
| Severity | Medium (module reports success with 0 pages vs declared min) |
| Confidence | **High** |
| Modes | Interpreter and AOT instantiate |
| Spec | Instantiation of a memory with `min > 0` must provide that many pages or fail instantiation |

**Locations**

- `include/runtime/instance/memory.h` ctor: on `allocate` failure, `setLivePageCount(0)` and **return**
- `lib/executor/instantiate/memory.cpp`: always `return {}`
- Contrast `lib/executor/instantiate/table.cpp`: `getSize() != Lim.getMin()` → `AllocationFailed`

**Reproduction**

`reproductions/WE-08-memory-alloc-fail/`. Hard to force host OOM; the invariant to test is: if `DataPtr == nullptr` after construct, instantiate must not succeed for `min > 0`. A test double/allocator hook is the practical regression.

**Fix direction**

Propagate allocation failure like tables. Do not advertise a non-zero min with a null `DataPtr`.

---

## Classification summary

| ID | Cat | One-line |
|---|---|---|
| WE-1 | A | Interpreter atomic fence is `release`, not `seq_cst` |
| WE-2 | A | `path_link` NewNode check is a copy-paste of OldNode |
| WE-3 | A | `random_get` uses rapidhash PRNG |
| WE-4 | A | macOS `fromErrNo` misses `EOPNOTSUPP` |
| WE-5 | A | `InitWASI` / `Environ::init` does not reset `FdMap` |
| WE-6 | A | `initWithFds` partial stdio insert |
| WE-7 | A | `fd_renumber` skips poller close |
| WE-8 | B | Memory OOM at instantiate is silent |

**C — systemic (not a new unique bug ID here):** failed-instance lifetime (`FailedMod`) is real and **already** [#5537](https://github.com/WasmEdge/WasmEdge/issues/5537). See `github-dedup.md` and `contribution-roadmap.md`.
