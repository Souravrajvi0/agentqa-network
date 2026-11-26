# GitHub deduplication

Searches run 2026-11-26 against `WasmEdge/WasmEdge` (issues + PRs), plus `Changelog.md`.

## Per confirmed finding

### WE-1 `memory.atomic.fence` / `memory_order_release` / `runMemoryFenceOp`

- Issues: `fence sequentially consistent OR memory.atomic.fence` → **0**
- Code search hits only the implementation file
- **Unreported**

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
