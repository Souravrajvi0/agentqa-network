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
