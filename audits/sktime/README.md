# sktime correctness audit (sktime/sktime)

Investigation only. No patches were pushed to `sktime/sktime`.

| Deliverable | File |
|---|---|
| Architecture | [architecture.md](architecture.md) |
| Confirmed bugs | [confirmed-bugs.md](confirmed-bugs.md) |
| Deep report | [deep-investigation/validated_bugs.md](deep-investigation/validated_bugs.md) |
| Dedup | [github-dedup.md](github-dedup.md) |
| Coverage | [audit-coverage.md](audit-coverage.md) |
| Repros | [reproductions/](reproductions/) |

**Upstream:** [sktime/sktime](https://github.com/sktime/sktime)  
**Revision:** `c2be801ec7c3183457c2ec9bd7109266a41d9e35` (main, 2026-03-27)

Reproduced on unmodified main at this SHA:

1. **SKTIME-RED-001** — recursive reduction edge-pads short future `X` (new).
2. **SKTIME-SPLIT-001** — int `fh=n` on short series → empty train / polluted test (new guard needed).
3. **SKTIME-FH-001** — irregular datetime + integer relative `fh` → `TypeError` in `_to_absolute` (related to #4159).

Run repros:

```bash
cd /path/to/sktime && python -m venv .venv && .venv/bin/pip install -e ".[dev]"
PYTHONPATH=/path/to/sktime .venv/bin/python -m pytest /path/to/audits/sktime/reproductions/ -v
```