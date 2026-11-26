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
