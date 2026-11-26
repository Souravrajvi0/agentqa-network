# WasmEdge Implementation Audit — Full Report

**Repository:** [WasmEdge/WasmEdge](https://github.com/WasmEdge/WasmEdge)  
**Commit:** `e0ba07fd56fe0c7a022ca884882d394c96052597`  
**Audit date:** 2026-11-26  
**Audit repo branch:** `feat/wasmedge-runtime-audit-914e` (Souravrajvi0/agentqa-network)

This file is the **complete** audit deliverable: architecture, invariants, coverage, confirmed bugs, rejections, GitHub deduplication, contribution roadmap, machine-readable findings, and reproduction notes. Production WasmEdge code was not modified.

**Upstream filing:** Open issues as **@Souravrajvi0**, never `app/cursor`. Do not re-file [#5537](https://github.com/WasmEdge/WasmEdge/issues/5537).

---

## Table of contents

1. [Overview](#1-overview)
2. [Architecture map](#2-architecture-map)
3. [Specification invariants](#3-specification-invariants)
4. [Audit coverage](#4-audit-coverage)
5. [Confirmed findings](#5-confirmed-findings)
6. [Rejected candidates](#6-rejected-candidates)
7. [GitHub deduplication](#7-github-deduplication)
8. [Contribution roadmap](#8-contribution-roadmap)
9. [Machine-readable findings (`candidates.json`)](#9-machine-readable-findings-candidatesjson)
10. [Reproduction harnesses](#10-reproduction-harnesses)
11. [Upstream issue draft (WE-1)](#11-upstream-issue-draft-we-1)

---

## 1. Overview

# WasmEdge implementation audit (read-only)

Investigation of [WasmEdge/WasmEdge](https://github.com/WasmEdge/WasmEdge) at `e0ba07fd56fe0c7a022ca884882d394c96052597`.

No production WasmEdge code was modified. No GitHub issues were filed. No exploit payloads.

| File | Contents |
|---|---|
| [architecture.md](architecture.md) | Loader, validator, interpreter, AOT, memory/tables, store, WASI, C API, tests |
| [specification-invariants.md](specification-invariants.md) | Wasm / WASI / C API contracts used in the audit |
| [audit-coverage.md](audit-coverage.md) | What was traced, skipped, and locally checked |
| [candidates.json](candidates.json) | Machine-readable finding list |
| [confirmed-bugs.md](confirmed-bugs.md) | WE-1 … WE-8 with locations, spec, fix direction |
| [rejected-candidates.md](rejected-candidates.md) | False positives and upstream duplicates |
| [github-dedup.md](github-dedup.md) | Issue/PR search notes |
| [contribution-roadmap.md](contribution-roadmap.md) | A/B/C PR order; #5537 is not a new issue |
| [reproductions/](reproductions/) | Local harness notes |

Highest-value unreported A-fixes: interpreter `memory.atomic.fence` (WE-1), WASI `InitWASI` fd-table reuse (WE-5), `random_get` (WE-3), macOS `EOPNOTSUPP` (WE-4).

Already open and **must not** be re-filed: [WasmEdge#5537](https://github.com/WasmEdge/WasmEdge/issues/5537) (`FailedMod` UAF).

**Filing upstream:** Issues must be opened as **@Souravrajvi0**, never as `app/cursor` (Cloud Agent `gh` is the Cursor app). Use drafts in [upstream/](upstream/) or the GitHub issue composer under your account.

---

## 2. Architecture map

# WasmEdge architecture map

Audit target: [WasmEdge/WasmEdge](https://github.com/WasmEdge/WasmEdge) at `e0ba07fd56fe0c7a022ca884882d394c96052597` (master, 2026-11-26).

This document is a read-only map of the runtime. Production code was not modified.

## Pipeline

```
.wasm / AOT artifact
        │
        ▼
  FileMgr  ── LEB128, UTF-8, mmap / in-memory bytes
        │
        ▼
  Loader   ── AST::Module / AST::Component  (lib/loader, include/ast)
        │
        ▼
  Validator + FormChecker  ── types, limits, instruction stack
        │
        ▼
  Executor instantiate  ── ModuleInstance in StoreManager
        │
        ├── Interpreter  (lib/executor/engine)
        └── AOT / JIT    (lib/llvm) via Intrinsics / proxy.cpp
                │
                ▼
        Host / WASI / plugins
```

VM (`lib/vm/vm.cpp`) owns Loader, Validator, Executor, Statistics, and either an owned `StoreManager` or a reference to a caller-supplied store.

## Binary loading and parsing

| Piece | Location | Role |
|---|---|---|
| `FileMgr` | `include/loader/filemgr.h`, `lib/loader/filemgr.cpp` | Byte stream, LEB128 `readU32`/`readS33`/`readS64`, UTF-8 `readName` |
| `Loader` | `include/loader/loader.h`, `lib/loader/loader.cpp` | Preamble, `loadModule` / `loadComponent`, `loadVecCnt`, `loadSectionContent` |
| AST decode | `lib/loader/ast/*.cpp` | Sections, segments, types, expressions, `loadInstrSeq` |
| Component decode | `lib/loader/ast/component/*.cpp` | Component-model binary (version `{0x0d,0x00,0x01,0x00}`) |
| AOT object | `lib/loader/aot_section.cpp`, `shared_library.cpp` | Universal WASM / shared-library artifacts |

Core module load loop (`lib/loader/ast/module.cpp`): magic/version, ordered non-custom sections `0x01`–`0x0D`, function/code count match, data-count vs data segments.

When `RunMode::AOT` and the input is not plain WASM, `Loader::loadSegment(CodeSegment)` seeks past the function body instead of decoding it (`lib/loader/ast/segment.cpp`).

## Module validation

| Piece | Location | Role |
|---|---|---|
| `Validator` | `lib/validator/validator.cpp` | Section/segment checks, limits, const expr, GC subtype depth |
| `FormChecker` | `lib/validator/formchecker.cpp` | Operand-stack type checking |
| Component validator | `lib/validator/component_*.cpp` | Incomplete vs core; spectest skips many execute commands |

`FormChecker::checkExpr` returns success immediately when the instruction list is empty. Combined with AOT body-skip, bytecode of AOT artifacts is not stack-checked.

## Interpreter and execution engine

`Executor::execute` (`lib/executor/engine/engine.cpp`) is a large opcode switch. Helpers live in:

- `controlInstr.cpp`, `memoryInstr.cpp`, `tableInstr.cpp`, `refInstr.cpp`, `threadInstr.cpp`, `variableInstr.cpp`
- templates in `include/executor/engine/*.ipp` (numeric, cast, memory, atomics, SIMD)
- `helper.cpp`: `enterFunction`, exception throw/catch, `checkOffsetOverflow`

Traps are `Expect` / `ErrCode`. Native AOT faults go through `lib/system/fault.cpp` (`setjmp` / SIGSEGV / SIGFPE).

## AOT compilation

| Piece | Location |
|---|---|
| IR | `lib/llvm/compiler/{function_compiler,memoryInstr,numericInstr,threadInstr,vectorInstr,refInstr}.cpp` |
| Intrinsics | `lib/llvm/compiler/context.cpp` → `Executor::proxy*` in `lib/executor/engine/proxy.cpp` |
| Object / JIT | `lib/llvm/codegen.cpp`, `jit.cpp`, `lazyjit.cpp` |
| Cache | `lib/aot/` (Blake3; not instruction semantics) |

Compiled functions receive module context pointers (`MemoryPtrs`, table live-size pointers) snapshotted in `ModuleInstance::buildContext()`.

## Linear memory and tables

Header-only instances under `include/runtime/instance/`:

- `MemoryInstance`: 64 KiB pages, `growPage` / `shrinkPage`, `checkAccessBound`, shared-memory waiters
- `TableInstance`: `realloc` of `RefVariant`, `growTable`, `setRefs` uses `memmove` for overlap
- Instantiation: `lib/executor/instantiate/{memory,table,elem,data,module}.cpp`

Table instantiation fails with `AllocationFailed` if live size ≠ declared min. Memory instantiation always returns success even if `Allocator::allocate` returns null (live pages forced to 0).

## Runtime instances and store

- `ModuleInstance` (`include/runtime/instance/module.h`): owns functions/memories/tables/globals/tags/elems/data; `terminate()` may `delete this` when the owner bit is released
- `StoreManager` (`include/runtime/storemgr.h`): named modules/components; `recycleModule` keeps **one** failed instance (`FailedMod`)
- `StackManager` (`include/runtime/stackmgr.h`): value and call stacks

Instantiation order (`lib/executor/instantiate/module.cpp`): types → imports → functions → memories → tags → globals → tables → exports → elems → data → `buildContext()` → active elem/data init → start → `finalizeInstantiation()`. On failure the module is recycled into `FailedMod`.

## WASI

`wasi_snapshot_preview1` is a built-in host module, not a dynamic plugin.

| Layer | Location |
|---|---|
| ABI | `lib/host/wasi/wasifunc.cpp`, `wasimodule.cpp` |
| `Environ` | `include/host/wasi/environ.h`, `lib/host/wasi/environ.cpp` |
| Capability FS | `vinode.cpp` / `vinode.h` |
| Host FD | `inode-linux.cpp`, `inode-macos.cpp`, `inode-win.cpp` |
| Errno map | `linux.h`, `macos.h`, `win.h` (`fromErrNo`) |
| Clocks | `clock-linux.cpp` (and macOS/Win) |

FD table: `unordered_map<__wasi_fd_t, shared_ptr<VINode>>` under `FdMutex`. Stdio is 0–2; preopens start at 3; `path_open` / sockets use `generateRandomFdToNode` (`< 2^31`). Pollers are pooled (`PollerPool`).

## Host functions and plugins

- Host functions: `Runtime::HostFunction<T>` plus C API `CAPIHostFunc`
- Plugin load: `lib/plugin/plugin.cpp` (process-global registry, no unload)
- Built-in `wasi_logging`; optional `plugins/wasi_*`, ffmpeg, NN, crypto, etc.

## C API and public runtime interfaces

- `include/api/wasmedge/*.h`, implementation `lib/api/wasmedge.cpp`
- Standard `wasm.h` shim: `lib/api/wasm_c.cpp`
- Bindings: `bindings/rust`, `bindings/java` (thin over C API)

Ownership is documented per type (`WasmEdge_StringCreate*` vs `Wrap`, VM-owned store vs `StoreCreate`, `ModuleInstanceDelete` → `terminate()`).

## Threading and asynchronous execution

- Interpreter interrupt: `Executor::stop()` stores `StopToken` (`memory_order_relaxed`) and notifies waiters
- Atomics / `memory.atomic.wait|notify|fence`: `atomic.ipp`, `threadInstr.cpp`
- AOT fences: LLVM `SequentiallyConsistent`
- Async C API: `WasmEdge_Async*` wrapping `WasmEdge::Async`

## Resource allocation and destruction

- Linear memory: `lib/system/allocator.cpp`
- Module teardown: `terminate()` / unique_ptr destructors / store `reset()` unlinks named modules
- WASI `fini()` clears `FdMap` and args/env; destructor calls `fini()`
- VM `unsafeCleanup()` terminates the active instance, `StoreRef.reset()`, rebuilds builtin/plugin hosts

## Tests

| Tree | What it covers |
|---|---|
| `test/loader` | LEB128, sections, serialize round-trip |
| `test/validator` | Targeted GC / regression, not a full section matrix |
| `test/spec` | Official suites via `spectest.cpp` (WAT-only, some component/NaN/thread commands skipped) |
| `test/executor`, `test/llvm` | Spectest + `ExecutorRegressionTest.cpp` |
| `test/aot` | Cache paths, not opcode semantics |
| `test/instance` | Memory/table/module lifetime |
| `test/host/wasi`, `test/host/socket` | WASI and sockets |
| `test/api`, `test/vm` | C API and VM reuse |
| `test/thread` | Custom threads tests, not the full spec matrix |

## Component model

Present end-to-end (loader, validator, instantiate, canon ABI in `lib/executor/instantiate/component/`) behind `--enable-component`. Execution coverage in `test/spec` is intentionally partial (`checkComponentSupported`).

---

## 3. Specification invariants

# Specification and API invariants

Sources used in this audit (normative unless noted):

- [WebAssembly Core Specification](https://webassembly.github.io/spec/core/) (Wasm 2.0 / 3.0 drafts as implemented by WasmEdge proposal flags)
- [Threads proposal](https://github.com/WebAssembly/threads/blob/main/proposals/threads/Overview.md)
- [Exception handling](https://github.com/WebAssembly/exception-handling/)
- [Bulk memory / reference types / memory64 / GC](https://github.com/WebAssembly/)
- [WASI snapshot preview1](https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md)
- WasmEdge C API comments in `include/api/wasmedge/*.h`

## Core module binary

- Magic `\0asm` and a supported version.
- Non-custom sections appear in order and at most once.
- Each section payload length equals the number of bytes consumed.
- Vectors, names, and LEB128 encodings are well-formed (no overlong LEB, UTF-8 names).
- Function section count equals code section count.
- Each `expr` is `instr* 0x0B` (`end`).
- Code entry `size` covers locals plus the expression exactly.

## Validation

- Types, imports, and indices are in range.
- Instruction sequences are stack-polymorphic according to the spec validation algorithm.
- Memory/table limits: `min ≤ max` when max is present; 32-bit memory min/max ≤ 2^16 pages; 64-bit ≤ 2^48 when Memory64 is on.
- Shared memory **requires** a maximum (`shared memory must have maximum`).
- Start function type is `[] -> []`.
- Const expressions only allow the spec-listed instructions.

## Execution — numeric

- Integer wraparound modulo 2^N; `div_s` of `INT_MIN / -1` traps (`integer overflow`); `rem_s` of `x % -1` is `0` (no trap).
- `div`/`rem` by zero traps (`integer divide by zero`).
- IEEE-754 floating point with:
  - `+0` equals `-0` for `eq` / `ne` (they compare equal / not-equal respectively).
  - `fmin`/`fmax`: if either operand is NaN, result is a canonical NaN; opposite-sign zeros: min is `-0`, max is `+0`.
- `trunc` of NaN traps `invalid conversion to integer`; overflow traps `integer overflow`.
- `trunc_sat` of NaN is 0; infinities saturate.

## Execution — memory and tables

- Effective address is `offset + i`; access of `N` bytes traps iff it is not contained in `[0, memsize)`.
- `memory.grow` / `table.grow` return previous size or `-1` on failure; grow-by-zero succeeds and returns current size.
- Bulk `copy`/`fill`/`init` trap if any byte/element of the range is out of bounds **before** mutation (or as specified: failed ops leave the destination unchanged).
- Overlapping `memory.copy` / `table.copy` must behave as if using an intermediate buffer (`memmove` semantics).

## Execution — threads

- `memory.atomic.fence` is a **sequentially consistent** fence (threads proposal).
- Narrow atomics (`i32.atomic.load8_u`, `rmw8`, …) check bounds and alignment of the **access width** (1 or 2 bytes), not the stack type width.
- `memory.atomic.wait` requires shared memory; unaligned atomics trap `unaligned atomic`.

## Traps and exceptions

- Traps abort the current invocation; they do not execute `end` of enclosing blocks.
- `try_table` / `throw` / `throw_ref` follow the exception-handling proposal: unmatched throw is `uncaught exception`.
- Instantiation that fails after writing into an **imported** table or memory must leave those writes observable, and the producing functions must remain callable (`linking.wast`).

## WASI snapshot preview1

- Every host function returns a `__wasi_errno_t` (or, for `proc_exit`, does not return). Unmapped host `errno` must still become a defined WASI errno, not UB.
- `random_get`: “Write **high-quality random data** into a buffer. This function blocks when the implementation is unable to immediately provide sufficient high-quality random data.”
- `fd_close` closes the descriptor. `fd_renumber` atomically overwrites `to` with `fd` (source is then unused). Overwritten descriptors must not keep poll interest.
- `path_link`: `badf` if either directory fd is invalid.
- Path resolution is relative to a directory fd; escaping the capability sandbox is `notcapable` / `perm`.
- `clock_time_get(id, precision, …)`: `precision` is the maximum lag the implementation is allowed; clocks in `{realtime, monotonic, process_cputime_id, thread_cputime_id}`.
- Initialization of the WASI environment should be all-or-nothing from the embedder’s point of view (`WasmEdge_ModuleInstanceInitWASI*` “will initialize the WASI host module with the parameters”).

## C API

- `WasmEdge_StringCreate*` allocations are freed with `WasmEdge_StringDelete`; `WasmEdge_StringWrap` must not be deleted.
- `WasmEdge_VMGetStoreContext` is non-owning; do not `StoreDelete`.
- `WasmEdge_VMCleanup` clears loaded/instantiated/registered modules **except** WASI and plugins, then rebuilds those hosts.
- `WasmEdge_ModuleInstanceDelete` destroys the instance (implementation: `terminate()`, which may delay `delete` while dependents exist).
- Repeated create/destroy of VMs must not leak process-global plugin mappings beyond documented process lifetime; WASI fd tables must not leak across `InitWASI` calls.

## Interpreter vs AOT

For any instruction the spec defines, interpreter and AOT/JIT must agree on:

- result values (including NaN canonicalization where the spec requires it),
- trap vs success,
- memory/table mutations.

Differences that are only scheduling/ordering under a weaker fence than the spec are still spec failures for the weaker side.

---

## 4. Audit coverage

# Audit coverage

Repository: WasmEdge/WasmEdge @ `e0ba07fd56fe0c7a022ca884882d394c96052597`.

Method: read-only source tracing (loader → validator → executor/AOT → WASI → C API), GitHub issue/PR search, local errno alias check. Full WasmEdge was **not** built in this environment (no LLVM/dev packages, no `wasmedge` binary). Instruction-level findings are confirmed by source vs specification; WASI/C API findings are confirmed by control-flow on the current tree. Items that need a linked `wasmedge` to observe at runtime are marked in `confirmed-bugs.md`.

## Covered

| Area | Depth | Notes |
|---|---|---|
| Loader / FileMgr / LEB128 / UTF-8 | High | `filemgr.cpp`, `loadInstrSeq`, section size, AOT body skip |
| Validator / FormChecker | High | empty `checkExpr`, limits, shared memory max |
| Interpreter numeric / rem / trunc | High | `binary_numeric.ipp`, `cast_numeric.ipp`, `unary_numeric.ipp` |
| Interpreter vs AOT fence | High | `threadInstr.cpp` vs LLVM `createFence(seq_cst)` |
| Atomics bounds helper | Medium | `checkOffsetOverflow` is overflow-only; real OOB is `getPointer` |
| Memory/table instantiate | High | allocation-failure mismatch |
| Store `FailedMod` | High | already upstream #5537 |
| WASI fd table, init/fini, pathLink, random_get | High | |
| WASI errno maps Linux/macOS/Win | High | Linux `ENOTSUP==EOPNOTSUPP`; macOS they differ |
| WASI poll + `fd_renumber` | Medium | close vs rebuild fallback |
| C API InitWASI / String / ModuleDelete / VMCleanup | High | |
| Plugin registry | Medium | no unload; duplicate-name paths |
| Spectest skip matrix | Medium | `test/spec/spectest.cpp` |
| Component canon ABI | Low | not fully traced for new bugs |
| SIMD | Low | swizzle comment matches spec; no new defect isolated |
| Windows inode | Low | errno map only |
| Java/Rust bindings | Low | ownership follows C API |

## Not covered / weak

- Differential interpreter vs AOT execution of the official spec suite (requires `WASMEDGE_USE_LLVM` build).
- AddressSanitizer / leak sanitizer on create/destroy loops.
- Full wasi-testsuite and wasmtime comparison runs.
- GC, exception-handling, and component-model execute paths beyond structural reading.
- Fuzzing of `loadVecCnt` / adversarial section sizes.
- Security-sensitive sandbox escapes (out of scope; not developed).

## Local diagnostics that did run

```
ENOTSUP=95 EOPNOTSUPP=95 equal=1   # Linux host used for this audit
EAGAIN=11 EWOULDBLOCK=11 equal=1
```

macOS values (from public headers, not executed here): `ENOTSUP=45`, `EOPNOTSUPP=102`.

---

## 5. Confirmed findings

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

---

## 6. Rejected candidates

# Rejected candidates

False positives, already-fixed, already-filed, or not user-visible enough to treat as new bugs.

## Spec misunderstandings (rejected)

| Claim | Why rejected |
|---|---|
| Interpreter `f32.eq(+0,-0)` is wrong because C++ `==` | Wasm and IEEE-754 ordered equality treat `+0` and `-0` as equal. Interpreter is correct. LLVM `fcmp oeq` is also equal. |
| Interpreter `fmin` of `(NaN, x)` should return `x` | Wasm `fmin`/`fmax` return a NaN if **either** operand is NaN. Interpreter copies the NaN then canonicalizes (`binary_numeric.ipp`). That matches the spec. LLVM `minnum` would be the non-NaN; if AOT used raw MinNum without a NaN check it would be AOT’s bug, not the interpreter’s. Not confirmed as AOT-wrong without executing IR. |
| Narrow atomics `checkOffsetOverflow(..., sizeof(T))` over-traps | `checkOffsetOverflow` only detects `offset+addr` wrapping in 64 bits; `Size` is for the error log. Real bounds use `getPointer<atomic<I>*>` with the access type `I`. |
| Empty function body always accepted as a load of core WASM | `loadInstrSeq` requires a top-level `end`. Empty `checkExpr` matters for **AOT artifacts** (bodies not decoded) or hand-built AST, not a normal `.wasm` without `end`. |
| `fromErrNo(EOPNOTSUPP)` is UB on Linux | On this Linux host `ENOTSUP == EOPNOTSUPP == 95`, so the `ENOTSUP` case matches. The hole is **macOS** (and any libc where the constants differ). |
| `fd_sync` on directories returning `BADF` | Project test `WasiTest.FdSyncDirectory` **requires** `BADF`. Treat as intentional WasmEdge policy, not a new bug. |
| `getPointerOrNull(Offset==0)` | Host-pointer convention (null), not Wasm load-at-zero. Loads use `getPointer`. |
| `randomFilename` produces NUL bytes | Dead code (no callers). |
| `StopToken` relaxed atomics never observed | C++ requires eventual visibility of atomic stores. May delay interrupts on weak memory; not a deterministic functional bug on x86. |
| `clock_time_get` ignores `precision` | Common WASI practice; spec allows waiting up to precision, not a hard “must round” rule. Weak. |

## Already reported upstream (not claimed as new)

| Topic | Upstream |
|---|---|
| `StoreManager::recycleModule` keeps one `FailedMod`; second failure `terminate()`s a module whose functions still sit in an imported table → SIGSEGV | Open issue [#5537](https://github.com/WasmEdge/WasmEdge/issues/5537) (also #5073, LFX #4692). **Do not re-file.** |
| `fd_renumber` same-fd segfault | Fixed [#3040](https://github.com/WasmEdge/WasmEdge/issues/3040) (`Fd == To` early return). |
| `return_call` to host / `runLocalGetOp` overflow | Closed [#4872](https://github.com/WasmEdge/WasmEdge/issues/4872); regressions live in `ExecutorRegressionTest.cpp`. |
| `fd_renumber` on preopen fds | Closed [#2292](https://github.com/WasmEdge/WasmEdge/issues/2292). Current `fdRenumber` still has no preopen guard; if wasi-testsuite still forbids it, that is a **reopen** of 2292, not a new ID. |

## Intentional / documented API edges

| Topic | Notes |
|---|---|
| `WasmEdge_StringDelete` on a wrapped string | Documented: wrap vs create. Misuse is embedder UB, not a silent runtime contract break. |
| `WasmEdge_VMGetStoreContext` must not be deleted | Documented. |
| Plugin `.so` never unloaded | Documented process-global registry. |
| Component spectest skips | Explicit in `test/spec/spectest.cpp`. |
| `IntegerTooLong` for some malformed type encodings without GC | Loader tests assert this code. Spec-test *text* may differ; not a semantic accept/reject flip if the module is still rejected. |

## Not reproduced here (insufficient evidence)

| Topic | Why not confirmed |
|---|---|
| AOT guard-page vs interpreter explicit OOB at last bytes of a page | Platform/allocator dependent; no local AOT binary. |
| `throw` null `TagInst` | Validator should reject bad tagidx; only UB if validation is skipped. |
| `shrinkTable` leaving stale `RefVariant` past `LiveSize` | Bounds checks use `LiveSize`; restore path may care, not shown. |
| `fini()` leaving `PollerPool` | Vector still destroyed in `~Environ`. Harmful only if the same `Environ` is `init`’d again **without** `fini` of pollers — overlapping with the InitWASI finding, not a separate leak after destructor. |

---

## 7. GitHub deduplication

# GitHub deduplication

Searches run 2026-11-26 against `WasmEdge/WasmEdge` (issues + PRs), plus `Changelog.md`.

## Per confirmed finding

### WE-1 `memory.atomic.fence` / `memory_order_release` / `runMemoryFenceOp`

- Issues: `fence sequentially consistent OR memory.atomic.fence` → **0** (at audit time)
- **Unreported** under user account (#[5669](https://github.com/WasmEdge/WasmEdge/issues/5669) was closed — opened as `app/cursor` by mistake)

### WE-2 `pathLink` / `path_link` NewNode

- Issues: `pathLink OR path_link NewNode` → no match on the double `OldNode` check
- **Unreported**

### WE-3 `random_get` CSPRNG

- Issues: `random_get` → #4872 (host `return_call` crash, import name only), #1892 (survey)
- No issue asking for `getrandom` / CSPRNG
- Changelog mentions tests for `random_get`, not entropy source
- **Unreported**

### WE-4 `EOPNOTSUPP` / `fromErrNo` / `assumingUnreachable`

- Broad search hits many `assumingUnreachable` files, no WASI errno-mapping bug
- **Unreported**

### WE-5 / WE-6 InitWASI / `initWithFds` / FdMap

- `VMCleanup OR StoreReset` → 0
- No issue on second `InitWASI` keeping old fds
- **Unreported**

### WE-7 `fd_renumber` poller

- #3040 (closed): same-fd SIGSEGV — **fixed**, different bug
- #2292 (closed): preopen `fd_renumber` should fail — **not** poller close
- **Unreported** as poller/`close` skip

### WE-8 memory instantiate OOM

- No issue on `Unable to find usable memory address` vs `AllocationFailed`
- **Unreported**

## Already open — do not file

| Issue | Overlap |
|---|---|
| [#5537](https://github.com/WasmEdge/WasmEdge/issues/5537) | `FailedMod` / `recycleModule` UAF after second failed instantiate. Matches our store-lifetime trace. Author plans a PR keeping only referenced failed modules. |
| [#5073](https://github.com/WasmEdge/WasmEdge/issues/5073) | Earlier “keep every failed module” approach; closed in favor of reference-aware retention (#5537). |
| [#4692](https://github.com/WasmEdge/WasmEdge/issues/4692) | LFX dependency tree; related lifecycle, not a substitute for #5537. |

## Closed, related, not reopened as new IDs

| Issue | Notes |
|---|---|
| #3040 | `fd_renumber(fd, fd)` — current code returns success |
| #4872 | `return_call` + host — `ExecutorRegressionTest` |
| #2292 | preopen renumber policy — verify wasi-testsuite before reopening |
| SecretVec rvalue | Fixed in HEAD `e0ba07fd` (#5327) |

## Search notes

GitHub issue search is keyword-based; absence of a hit is not proof, but each finding was queried by **symptom**, **instruction/API name**, and **function name**. #5537 is the only high-severity lifecycle crash already on the tracker that this audit independently rediscovered.

---

## 8. Contribution roadmap

# Contribution roadmap

Do **not** auto-file GitHub issues from this audit. Propose patches against WasmEdge/WasmEdge after a maintainer agrees the item is still unfixed on master.

## A — small, independently reviewable PRs

Order by ease and testability:

1. **WE-2** — one-line `!NewNode` plus a WASI unit test with invalid `new_fd`.
2. **WE-1** — `memory_order_seq_cst` in `runMemoryFenceOp`; mention AOT parity in the commit body.
3. **WE-4** — `EOPNOTSUPP` cases + default `return __WASI_ERRNO_IO` (or `NOSYS`) in `fromErrNo` on all three OS headers.
4. **WE-6** then **WE-5** — `fini()` at the start of `init`/`initWithFds`, rollback on `fromFd` failure; C API test: `InitWASI` twice with different preopens, assert fd 3 is the new directory.
5. **WE-7** — `close(dest)` in `fd_renumber`; optional macOS `Poller::close`.
6. **WE-3** — platform `getrandom`/`BCryptGenRandom` behind `randomGet`; keep `RandEngine` for fd allocation.

Each PR should add a test next to `test/host/wasi/wasi.cpp`, `test/executor/`, or `test/api/APIUnitTest.cpp` in WasmEdge style (no new comments explaining the patch).

## B — cross-component

7. **WE-8** — instantiate memory like tables: `AllocationFailed` if live pages ≠ min. Needs an allocator failure injection or a test-only hook; touches `MemoryInstance` + `instantiate/memory.cpp` + possibly AOT null `DataPtr` guards.

## C — already tracked systemic work

8. **Do not open a new issue** for `FailedMod`. Follow [#5537](https://github.com/WasmEdge/WasmEdge/issues/5537): retain failed modules **only while other instances still reference their functions/tables/memories** (not an unbounded vector of every failure — that was rejected in #5073).

Larger follow-ups if maintainers want them (not claimed as new unique bugs here):

- Interpreter vs AOT differential job in CI for threads + SIMD NaNs.
- Replace `assumingUnreachable()` on host ABI boundaries with defined errno/traps.
- Component-model execute coverage (`spectest.cpp` skips).

## Suggested first upstream issue text (WE-1)

If filing one issue first, WE-1 is the cleanest spec mismatch:

- Title: `interpreter memory.atomic.fence uses a release fence; spec and AOT are seq_cst`
- Point at `runMemoryFenceOp` vs `compileMemoryFence`
- Note that a sequential module will not fail; ask for a code fix + threads spectest in interpreter CI

File **one issue per A-item** rather than a bundle, matching WasmEdge practice.

---

## 9. Machine-readable findings (`candidates.json`)

```json
{
  "repo": "WasmEdge/WasmEdge",
  "commit": "e0ba07fd56fe0c7a022ca884882d394c96052597",
  "audit_date": "2026-11-26",
  "findings": [
    {
      "id": "WE-1",
      "status": "confirmed",
      "category": "A",
      "title": "Interpreter memory.atomic.fence uses memory_order_release instead of seq_cst",
      "severity": "medium",
      "confidence": "high",
      "modes": ["interpreter"],
      "aot_match": false,
      "locations": [
        "lib/executor/engine/threadInstr.cpp:40-42",
        "lib/llvm/compiler/threadInstr.cpp:356-357"
      ],
      "upstream": "https://github.com/WasmEdge/WasmEdge/issues/5669 (author app/cursor — re-file as Souravrajvi0)"
    },
    {
      "id": "WE-2",
      "status": "confirmed",
      "category": "A",
      "title": "Environ::pathLink re-checks OldNode instead of NewNode",
      "severity": "low",
      "confidence": "high",
      "modes": ["wasi"],
      "masked_by": "VINode::pathLink null New -> BADF",
      "locations": ["include/host/wasi/environ.h:699-701"],
      "upstream": "unreported"
    },
    {
      "id": "WE-3",
      "status": "confirmed",
      "category": "A",
      "title": "WASI random_get uses Hash::RandEngine rather than OS CSPRNG",
      "severity": "medium",
      "confidence": "high",
      "modes": ["wasi"],
      "locations": [
        "include/host/wasi/environ.h:946-956",
        "include/common/hash.h:41-58"
      ],
      "upstream": "unreported"
    },
    {
      "id": "WE-4",
      "status": "confirmed",
      "category": "A",
      "title": "fromErrNo default assumingUnreachable; EOPNOTSUPP missing when distinct from ENOTSUP",
      "severity": "medium",
      "confidence": "high",
      "modes": ["wasi-macos"],
      "linux_alias": "ENOTSUP==EOPNOTSUPP (verified locally)",
      "locations": [
        "lib/host/wasi/macos.h:154-191",
        "lib/host/wasi/linux.h:181-218"
      ],
      "upstream": "unreported"
    },
    {
      "id": "WE-5",
      "status": "confirmed",
      "category": "A",
      "title": "Environ::init / InitWASI does not fini FdMap; second init keeps old fds",
      "severity": "medium",
      "confidence": "high",
      "modes": ["wasi", "c-api"],
      "locations": [
        "lib/host/wasi/environ.cpp:109-155",
        "lib/api/wasmedge.cpp:2374-2410"
      ],
      "upstream": "unreported"
    },
    {
      "id": "WE-6",
      "status": "confirmed",
      "category": "A",
      "title": "initWithFds leaves stdin mapped if stdout/stderr fromFd fails",
      "severity": "low",
      "confidence": "high",
      "modes": ["wasi", "c-api"],
      "locations": ["lib/host/wasi/environ.cpp:161-178"],
      "upstream": "unreported"
    },
    {
      "id": "WE-7",
      "status": "confirmed",
      "category": "A",
      "title": "fd_renumber erases destination without Environ::close poller cleanup",
      "severity": "low",
      "confidence": "medium-high",
      "modes": ["wasi-linux"],
      "locations": [
        "include/host/wasi/environ.h:521-534",
        "include/host/wasi/environ.h:262-270",
        "lib/host/wasi/inode-linux.cpp:1740-1749",
        "lib/host/wasi/inode-macos.cpp:1519"
      ],
      "upstream": "unreported (3040 was same-fd SIGSEGV only)"
    },
    {
      "id": "WE-8",
      "status": "confirmed",
      "category": "B",
      "title": "MemoryInstance allocation failure zeros pages but instantiate succeeds",
      "severity": "medium",
      "confidence": "high",
      "modes": ["interpreter", "aot", "jit"],
      "locations": [
        "include/runtime/instance/memory.h:73-77",
        "lib/executor/instantiate/memory.cpp:31-44",
        "lib/executor/instantiate/table.cpp:59-64"
      ],
      "upstream": "unreported"
    },
    {
      "id": "WE-DUP-5537",
      "status": "already_reported",
      "category": "C",
      "title": "recycleModule keeps one FailedMod; second failure UAF via imported table",
      "upstream": "https://github.com/WasmEdge/WasmEdge/issues/5537",
      "locations": ["include/runtime/storemgr.h:152-173"]
    }
  ],
  "rejected": [
    "f32.eq +0/-0",
    "fmin NaN returns other operand",
    "narrow atomic sizeof(T) OOB",
    "empty expr on core wasm load",
    "Linux EOPNOTSUPP alias",
    "fd_sync directory BADF (tested as required)",
    "StopToken relaxed as hard bug",
    "clock_time_get precision"
  ]
}
```

---

## 10. Reproduction harnesses

# Reproductions

These are **local** harnesses for the confirmed findings. They do not exploit remote systems.

This audit environment did not contain a built `wasmedge` or LLVM. To execute:

```bash
git clone https://github.com/WasmEdge/WasmEdge.git
# configure with -DWASMEDGE_BUILD_TESTS=ON
# Interpreter-only: -DWASMEDGE_USE_LLVM=OFF
cmake --build build -j"$(nproc)"
```

WE-1 needs `--enable-threads` (or the threads proposal in Configure). WE-4 needs macOS. WE-8 needs an allocator failure hook.

Expected vs actual for each ID is in the subdirectory and in `../confirmed-bugs.md`.

### WE-01-atomic-fence

# WE-1

Interpreter (`lib/executor/engine/threadInstr.cpp`):

```cpp
std::atomic_thread_fence(std::memory_order_release);
```

AOT (`lib/llvm/compiler/threadInstr.cpp`):

```cpp
Builder.createFence(LLVMAtomicOrderingSequentiallyConsistent);
```

Spec: sequentially consistent.

`fence.wat` loads and runs without trapping (single-threaded). That is **not** a pass/fail for the memory model. The regression is changing the interpreter fence to `memory_order_seq_cst` and, if CI has a threads spectest, enabling it for the interpreter target.

**`fence.wat`:**

```wat
;; Threads proposal. Convert with: wasm-tools parse fence.wat -o fence.wasm
;; Expected: memory.atomic.fence is a sequentially consistent fence.
;; Actual (interpreter): std::atomic_thread_fence(memory_order_release)
;; Actual (AOT): LLVM fence seq_cst
(module
  (memory 1 1 shared)
  (func (export "fence")
    memory.atomic.fence)
)
```

### WE-02-path-link-newfd

# WE-2

Snippet matching `include/host/wasi/environ.h`:

```cpp
auto NewNode = getNodeOrNull(New);
if (unlikely(!OldNode)) {  // bug: should be !NewNode
```

GTest sketch (add to `test/host/wasi/wasi.cpp`):

```cpp
TEST(WasiTest, PathLinkInvalidNewFd) {
  WasmEdge::Host::WASI::Environ Env;
  Env.init({"/:."s}, "test"s, {}, {});
  // fd 3 is preopen; 99 is not open
  auto Res = Env.pathLink(3, "a"sv, 99, "b"sv, 0);
  EXPECT_FALSE(Res);
  EXPECT_EQ(Res.error(), __WASI_ERRNO_BADF);
  Env.fini();
}
```

Expected: `BADF` (today this still holds via `VINode::pathLink`).
The source-level expected change is the second predicate using `NewNode`.

### WE-03-random-get

# WE-3

`Environ::randomGet` fills using `Hash::RandEngine` (rapidhash counter), not `getrandom(2)`.

```cpp
WasiExpect<void> randomGet(Span<uint8_t> Buffer) const noexcept {
  std::uniform_int_distribution<uint32_t> Distribution;
  // ...
  const uint32_t Value = Distribution(Hash::RandEngine);
```

WASI: high-quality random data.

Reference: Wasmtime `random_get` → `getrandom`.

Runtime check if a build is available: a module that calls `random_get` succeeds (errno 0) but the bytes are not from `/dev/urandom`. Prefer a unit test that the implementation calls the OS RNG, or grep CI that `getrandom` appears in `randomGet`.

### WE-04-eopnotsupp

# WE-4

Linux (this audit VM):

```
ENOTSUP=95 EOPNOTSUPP=95 equal=1
```

macOS (public headers): `ENOTSUP=45`, `EOPNOTSUPP=102`.

`macos.h` `fromErrNo` has `case ENOTSUP` only; `default: assumingUnreachable()`.

On macOS, an unsupported socket option that sets `errno = EOPNOTSUPP` hits the default.

Expected WASI errno: `notsup` (`__WASI_ERRNO_NOTSUP`).
Actual: debug assert / release UB.

Compile-time guard to add:

```cpp
#if defined(EOPNOTSUPP) && (!defined(ENOTSUP) || EOPNOTSUPP != ENOTSUP)
  case EOPNOTSUPP:
    return __WASI_ERRNO_NOTSUP;
#endif
```

### WE-05-initwasi-reuse

# WE-5

`Environ::init` uses `FdMap.emplace` and never `clear`s.

C API sketch:

```c
WasmEdge_ModuleInstanceContext *M = WasmEdge_ModuleInstanceCreateWASI(NULL, 0, NULL, 0, NULL, 0);
const char *pre1[] = { "/tmp:/tmp" };
WasmEdge_ModuleInstanceInitWASI(M, NULL, 0, NULL, 0, pre1, 1);
const char *pre2[] = { "/var:/var" };
WasmEdge_ModuleInstanceInitWASI(M, NULL, 0, NULL, 0, pre2, 1);
/* Expected: fd 3 is /var. Actual: emplace(3) fails; fd 3 remains /tmp (if first init mapped it). */
```

`WasiModule` constructed by `CreateWASI` already called `init` once; the first `InitWASI` is already a **second** insert into a non-empty `FdMap` unless `CreateWASI` left it empty.

`CreateWASI` in `wasmedge.cpp` calls `init` on a fresh module (empty map) — first init works. A later `InitWASI` on that same module is the failing reuse.

### WE-06-initwithfds-rollback

# WE-6

```cpp
FdMap.emplace(0, std::move(*StdInVNode));
auto StdOutVNode = VINode::fromFd(StdOutFd, ...);
if (!StdOutVNode) {
  return WasiUnexpect(StdOutVNode.error());  // fd 0 already inserted
}
```

Existing tests (`test/host/wasi/wasi.cpp` invalid stdout) only check that `initWithFds` returns an error, not that fd 0 is absent.

After `initWithFds({}, ..., stdin_ok, stdout=-1, stderr_ok)`:

- Expected: no entries in `FdMap` (or equivalent `fd_fdstat_get(0) == badf`)
- Actual: fd 0 present

### WE-07-fd-renumber-poller

# WE-7

`fdClose` calls `Environ::close` (poller `epoll_ctl` DEL). `fdRenumber` only `FdMap.erase`s the destination.

Linux sequence (needs a built test binary):

1. `pipe()`; WASI stdin = read end (see existing poll tests).
2. `poll_oneoff` on that fd (level trigger, short clock timeout).
3. `fd_renumber(other, that_fd)` so the destination is overwritten.
4. Close/reopen host fds so the kernel recycles the number.
5. `poll_oneoff` again on the new guest fd.

Expected: no `EPOLL_CTL_MOD` against a stale `OldFdDatas` entry for a recycled OS fd.
Actual: `close()` not run; `OldFdDatas` may still contain the number until `wait()` rebuild.

#3040 (same-fd SIGSEGV) is already fixed and is a different path.

### WE-08-memory-alloc-fail

# WE-8

Tables: `instantiate/table.cpp` fails instantiation if `getSize() != min`.
Memories: `instantiate/memory.cpp` always succeeds; ctor sets live pages to 0 on `allocate` failure.

Expected: instantiate a `(memory 1)` that cannot be allocated → `AllocationFailed`.
Actual: success, `getPageSize()==0`, later loads trap or crash on null `DataPtr`.

Practical regression: inject a failing `Allocator::allocate` in `MemInstanceTest` / executor instantiate test, or temporarily force the null path with a test hook. Do not try to exhaust host RAM on shared CI.

---

## 11. Upstream issue draft (WE-1)

# File under **your** GitHub account: WasmEdge/WasmEdge

Use: https://github.com/WasmEdge/WasmEdge/issues/new

**Title:** Interpreter `memory.atomic.fence` uses release ordering instead of sequentially consistent

---

## Summary

The **interpreter** implementation of WebAssembly `memory.atomic.fence` issues a **release** C++ thread fence. The [Threads proposal](https://github.com/WebAssembly/threads/blob/main/proposals/threads/Overview.md) defines the instruction as a **sequentially consistent** fence. WasmEdge’s **AOT/JIT** path already lowers the opcode to `LLVMAtomicOrderingSequentiallyConsistent`.

Running the same module in interpreter mode vs AOT/JIT can therefore observe different memory orderings for concurrent shared-memory programs.

## Affected code

**Interpreter** (`lib/executor/engine/threadInstr.cpp`):

```cpp
Expect<void> Executor::runMemoryFenceOp() {
  std::atomic_thread_fence(std::memory_order_release);
  return {};
}
```

**AOT** (`lib/llvm/compiler/threadInstr.cpp`):

```cpp
void FunctionCompiler::compileMemoryFence() noexcept {
  Builder.createFence(LLVMAtomicOrderingSequentiallyConsistent);
}
```

## Expected behavior

`memory.atomic.fence` must behave as a sequentially consistent fence in all execution modes (interpreter and compiled), consistent with the threads specification and with WasmEdge’s own AOT lowering.

## Actual behavior

Interpreter mode uses `std::memory_order_release`, which is weaker than sequentially consistent. On platforms with weak memory models this can permit orderings that the spec disallows and that AOT would not permit.

## Suggested fix

```cpp
std::atomic_thread_fence(std::memory_order_seq_cst);
```

A short comment noting parity with `compileMemoryFence()` would help prevent regressions.

## Reproduction notes

A single-threaded module that only executes `memory.atomic.fence` will not show a failure. Validation typically requires multi-threaded shared-memory litmus tests; behavior also differs from AOT on non-x86 weakly ordered ISAs.

## Severity

Medium — spec violation and interpreter/AOT semantic mismatch; impact is mainly concurrent Wasm using shared memory + fence.

---

**Note about #5669:** If that issue is still open, comment there that you are the intended reporter (`@Souravrajvi0`) and ask maintainers to treat your follow-up issue as canonical, or close #5669 after you re-file.
---

*End of full report. Source tree: `wasmedge-audit/` in agentqa-network.*
