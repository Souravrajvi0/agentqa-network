# Invariants (expected)

1. `copy()` of a model preserves nodes, edges, CPDs, and role dicts (`latents`, `exposures`, `outcomes`, custom roles).
2. `do(X)` returns a mutilated graph: no incoming edges to `X`, and the CPD of `X` is an intervention distribution (point mass / specified / uniform). Downstream CPDs still condition on `X`.
3. After `do()`, `check_model()` succeeds and `to_joint_gaussian()` / inference use the interventional factorization.
4. `Adjustment.validate` is the adjustment criterion: no forbidden (causal-path descendant) nodes in Z, and Z blocks all proper non-causal paths (Perkovic 2018; class docstring).
5. Invalid `TabularCPD` `values` raise `ValueError`. Expected shape is `(variable_card, 1)` with no evidence, or `(variable_card, prod(evidence_card))` with evidence. `_str`/`__str__` format the table (must not raise `TypeError`).
6. Subclass `copy()` returns an instance of the subclass with that subclass’s CPD type.
7. `LinearGaussianCPD` rejects `len(beta) != len(evidence) + 1` at construction or `check_model`.
8. `Frontdoor.validate` either errors on multiple exposures/outcomes or checks every pair, not only `[0]`.
