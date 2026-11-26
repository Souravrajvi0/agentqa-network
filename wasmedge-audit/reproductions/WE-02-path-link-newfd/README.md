# WE-2

Snippet matching `include/host/wasi/environ.h`:

```cpp
auto NewNode = getNodeOrNull(New);
if (unlikely(!OldNode)) {  // bug: should be !NewNode
```

GTest sketch (add to `test/host/wasi/wasi.cpp`):

```cpp
TEST(WasiTest, PathLinkInvalidNewFd) {
  WasmEdge::Host::WASI::Environ Env;
  Env.init({"/:."s}, "test"s, {}, {});
  // fd 3 is preopen; 99 is not open
  auto Res = Env.pathLink(3, "a"sv, 99, "b"sv, 0);
  EXPECT_FALSE(Res);
  EXPECT_EQ(Res.error(), __WASI_ERRNO_BADF);
  Env.fini();
}
```

Expected: `BADF` (today this still holds via `VINode::pathLink`).
The source-level expected change is the second predicate using `NewNode`.
