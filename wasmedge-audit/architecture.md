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
