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
