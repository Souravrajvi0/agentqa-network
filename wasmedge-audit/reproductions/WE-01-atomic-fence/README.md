# WE-1

Interpreter (`lib/executor/engine/threadInstr.cpp`):

```cpp
std::atomic_thread_fence(std::memory_order_release);
```

AOT (`lib/llvm/compiler/threadInstr.cpp`):

```cpp
Builder.createFence(LLVMAtomicOrderingSequentiallyConsistent);
```

Spec: sequentially consistent.

`fence.wat` loads and runs without trapping (single-threaded). That is **not** a pass/fail for the memory model. The regression is changing the interpreter fence to `memory_order_seq_cst` and, if CI has a threads spectest, enabling it for the interpreter target.
