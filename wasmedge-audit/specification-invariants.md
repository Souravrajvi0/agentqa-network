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
