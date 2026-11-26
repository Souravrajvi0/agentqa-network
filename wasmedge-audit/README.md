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
