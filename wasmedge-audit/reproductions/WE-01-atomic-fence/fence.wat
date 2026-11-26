;; Threads proposal. Convert with: wasm-tools parse fence.wat -o fence.wasm
;; Expected: memory.atomic.fence is a sequentially consistent fence.
;; Actual (interpreter): std::atomic_thread_fence(memory_order_release)
;; Actual (AOT): LLVM fence seq_cst
(module
  (memory 1 1 shared)
  (func (export "fence")
    memory.atomic.fence)
)
