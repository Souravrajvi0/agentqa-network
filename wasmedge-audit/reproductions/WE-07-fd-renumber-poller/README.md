# WE-7

`fdClose` calls `Environ::close` (poller `epoll_ctl` DEL). `fdRenumber` only `FdMap.erase`s the destination.

Linux sequence (needs a built test binary):

1. `pipe()`; WASI stdin = read end (see existing poll tests).
2. `poll_oneoff` on that fd (level trigger, short clock timeout).
3. `fd_renumber(other, that_fd)` so the destination is overwritten.
4. Close/reopen host fds so the kernel recycles the number.
5. `poll_oneoff` again on the new guest fd.

Expected: no `EPOLL_CTL_MOD` against a stale `OldFdDatas` entry for a recycled OS fd.
Actual: `close()` not run; `OldFdDatas` may still contain the number until `wait()` rebuild.

#3040 (same-fd SIGSEGV) is already fixed and is a different path.
