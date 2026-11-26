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
