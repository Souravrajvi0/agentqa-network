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
