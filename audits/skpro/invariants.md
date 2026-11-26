# Statistical invariants used in this audit

## Continuous distributions

1. **CDF bounds:** \(0 \le F(x) \le 1\).
2. **Survival:** \(S(x) = 1 - F(x)\) in exact arithmetic; numerically compare to SciPy `sf` in tails.
3. **Quantile consistency:** \(F^{-1}(F(x)) \approx x\) for interior \(x\).
4. **Log-density:** \(\log f(x) = \log(\max(f(x), \varepsilon))\) where finite.
5. **Hazard:** \(h(x) = f(x)/S(x)\) where \(S(x) > 0\).
6. **Normalization (scalar):** \(\int f(x)\,dx \approx 1\) on bounded quadrature grid (skip infinite-variance test params).

## Discrete / mixed

1. **PMF non-negativity** and \(\sum_k m(k) \approx 1\) (where applicable).
2. **Mixed atoms:** point mass at 0 should appear in `cdf`, not as a finite `pdf` height unless API documents composite measure.

## Composites

1. **Mixture mean:** \(\mathbb{E}[X] = \sum_k w_k \mathbb{E}[X_k]\) (scalar and array).
2. **Location-scale:** \(\mathbb{E}[\mu + \sigma X] = \mu + \sigma \mathbb{E}[X]\).
3. **Truncation:** require \(P(X \in I) > 0\) for interval \(I\).

## Parameters

1. Scale, rate, shape constraints as documented (strict positivity where stated).