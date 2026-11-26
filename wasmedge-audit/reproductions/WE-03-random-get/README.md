# WE-3

`Environ::randomGet` fills using `Hash::RandEngine` (rapidhash counter), not `getrandom(2)`.

```cpp
WasiExpect<void> randomGet(Span<uint8_t> Buffer) const noexcept {
  std::uniform_int_distribution<uint32_t> Distribution;
  // ...
  const uint32_t Value = Distribution(Hash::RandEngine);
```

WASI: high-quality random data.

Reference: Wasmtime `random_get` → `getrandom`.

Runtime check if a build is available: a module that calls `random_get` succeeds (errno 0) but the bytes are not from `/dev/urandom`. Prefer a unit test that the implementation calls the OS RNG, or grep CI that `getrandom` appears in `randomGet`.
