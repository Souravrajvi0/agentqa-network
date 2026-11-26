# Investigation log

## Pass 1 — Map

Cloned `pgmpy/pgmpy` (skip LFS). Read README, models, identification, inference, metrics.

## Pass 2 — Copy / do contract

Compared `DAG.copy`, `DiscreteBayesianNetwork.copy/do`, `LinearGaussianBayesianNetwork.copy`. Reproduced #3746 and LGBN.do observational joint.

## Pass 3 — Factors

Reproduced TabularCPD #3744. Reclassified LGBN beta-length as a validation-gap finding (check_model passes, joint crashes).

## Pass 4 — Identification

Reproduced Adjustment.validate mediator (#3553). ID algorithm read; no new formula bug proven. Frontdoor uses `[0]` only (PGMPY-FD-001).

## Pass 5 — Inference / metrics

VE/BP MAP use joint argmax. SHD rejects unequal node sets.

## Pass 6 — Functional / DBN

FunctionalCPD has no `copy`; FBN inherits DBN.copy (static). DBN test file documents query/sampling mismatch (not re-filed).

## Pass 7 — Dedup

GitHub search as in [`github-dedup.md`](../github-dedup.md). LGBN.do matches open [#2714](https://github.com/pgmpy/pgmpy/issues/2714).
