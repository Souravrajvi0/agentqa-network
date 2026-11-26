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
