# WE-4

Linux (this audit VM):

```
ENOTSUP=95 EOPNOTSUPP=95 equal=1
```

macOS (public headers): `ENOTSUP=45`, `EOPNOTSUPP=102`.

`macos.h` `fromErrNo` has `case ENOTSUP` only; `default: assumingUnreachable()`.

On macOS, an unsupported socket option that sets `errno = EOPNOTSUPP` hits the default.

Expected WASI errno: `notsup` (`__WASI_ERRNO_NOTSUP`).
Actual: debug assert / release UB.

Compile-time guard to add:

```cpp
#if defined(EOPNOTSUPP) && (!defined(ENOTSUP) || EOPNOTSUPP != ENOTSUP)
  case EOPNOTSUPP:
    return __WASI_ERRNO_NOTSUP;
#endif
```
