# WE-8

Tables: `instantiate/table.cpp` fails instantiation if `getSize() != min`.
Memories: `instantiate/memory.cpp` always succeeds; ctor sets live pages to 0 on `allocate` failure.

Expected: instantiate a `(memory 1)` that cannot be allocated → `AllocationFailed`.
Actual: success, `getPageSize()==0`, later loads trap or crash on null `DataPtr`.

Practical regression: inject a failing `Allocator::allocate` in `MemInstanceTest` / executor instantiate test, or temporarily force the null path with a test hook. Do not try to exhaust host RAM on shared CI.
