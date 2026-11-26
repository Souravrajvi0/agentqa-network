# Architecture (pgmpy @ 9f61170f)

## Layers

| Layer | Location | Role |
|---|---|---|
| Graphs + roles | `pgmpy/base/` (`DAG`, `PDAG`, `MAG`, `PAG`, `ADMG`, `_CoreGraph`) | Structure, d/m-separation, `do`, roles (exposures/outcomes/latents) |
| Models | `pgmpy/models/` | `DiscreteBayesianNetwork`, `LinearGaussianBayesianNetwork`, `FunctionalBayesianNetwork`, DBN, SEM, Markov/Factor/Junction |
| Factors / CPDs | `pgmpy/factors/` | `TabularCPD`, `LinearGaussianCPD`, `FunctionalCPD`, `DiscreteFactor` |
| Identification | `pgmpy/identification/` | `Adjustment`, `Frontdoor`, `ID` |
| Inference | `pgmpy/inference/` | VE, BeliefPropagation, Approx, CausalInference |
| Estimation | `pgmpy/estimators/`, `pgmpy/parameter_estimator/` | MLE/EM/Bayesian, structure learning (PC, GES, HillClimb) |
| Metrics | `pgmpy/metrics/` | SHD, Fisher-C, implied CIs |
| I/O | `pgmpy/readwrite/` | BIF, XMLBIF, NET, XDSL, UAI |

## Inheritance that matters for bugs

- `DiscreteBayesianNetwork` subclasses `DAG` and **overrides** `copy` (copies CPDs **and** roles) and `do` (mutilates edges **and** replaces CPDs).
- `LinearGaussianBayesianNetwork` subclasses `DAG` and **overrides** `copy` (CPDs only — **no roles**) but **does not override** `do`. `DAG.do` calls `self.copy()` then drops incoming edges.
- `FunctionalBayesianNetwork` subclasses `DiscreteBayesianNetwork`, overrides `add_cpds` to require `FunctionalCPD`, does **not** override `copy`. `FunctionalCPD` has **no** `copy` method.

## Do-calculus split

Discrete `simulate(do=...)` and `do()` share the CPD-replacement path.  
LGBN `simulate(do=...)` absorbs the intervention into child intercepts (valid for linear Gaussian) **without** calling `do()`. Public `LGBN.do()` is the incomplete DAG path.
