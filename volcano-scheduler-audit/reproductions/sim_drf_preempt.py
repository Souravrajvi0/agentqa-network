#!/usr/bin/env python3
"""VOL-DRF-001: DRF preemptableFn mutates simulated allocation before victim test."""
DELTA = 1e-6


def share(alloc: float, total: float = 100_000) -> float:
    return alloc / total


def victims(mutate_sub: bool) -> list[int]:
    ls = share(50_000)
    alloc = 90_000
    reqs = [80_000, 10_000]
    picked: list[int] = []
    for i, r in enumerate(reqs):
        if mutate_sub:
            ralloc = alloc - r
            alloc = alloc - r
        else:
            ralloc = alloc - r
        rs = share(ralloc)
        if ls < rs or abs(ls - rs) <= DELTA:
            picked.append(i)
            if not mutate_sub:
                alloc -= r
    return picked


if __name__ == "__main__":
    buggy, fixed = victims(True), victims(False)
    print("buggy victims:", buggy)
    print("fixed victims:", fixed)
    if buggy != fixed:
        print("CONFIRMED: buggy implementation diverges from invariant-preserving simulation")
        raise SystemExit(0)
    raise SystemExit("unexpected: implementations match")