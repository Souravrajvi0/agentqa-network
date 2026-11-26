"""Minimal reproductions for pyGAM correctness audit (requires pygam==0.12.0)."""
# See audits/pygam-correctness-audit.md for interpretation.

import warnings
import numpy as np
from pygam import LinearGAM, LogisticGAM, PoissonGAM, s, f

warnings.filterwarnings("ignore", category=UserWarning)


def main():
    # C-01 Poisson gridsearch exposure
    rng = np.random.default_rng(0)
    n = 5000
    x = rng.uniform(0, 1, n)
    e = rng.uniform(0.1, 1.0, n)
    y = rng.poisson(e * np.exp(-2.0 + np.sin(2 * np.pi * x))).astype(float)
    X = x[:, None]
    gs = PoissonGAM(s(0)).gridsearch(X, y, exposure=e, lam=[1.0], progress=False)
    ref = PoissonGAM(s(0), lam=1.0).fit(X, y, exposure=e)
    print("C-01 gridsearch coef match fit:", np.allclose(gs.coef_, ref.coef_, rtol=1e-4))

    # C-02 McFadden
    rng = np.random.default_rng(42)
    n = 200
    x = rng.normal(size=n)
    p = 1 / (1 + np.exp(-(0.5 * x)))
    y = rng.binomial(1, p)
    gam = LogisticGAM(s(0), lam=1.0).fit(x[:, None], y)
    null_ll = gam.distribution.log_pdf(y, np.full_like(y, y.mean())).sum()
    full_ll = gam.statistics_["loglikelihood"]
    mcf = gam.statistics_["pseudo_r2"]["McFadden"]
    print("C-02 McFadden ratio bug:", np.isclose(mcf, full_ll / null_ll))
    print("    expected McFadden:", 1.0 - full_ll / null_ll, "reported:", mcf)

    # C-03 edof length
    n = 50
    gam = LinearGAM(s(0, n_splines=60, spline_order=3), lam=0.6).fit(X[:n], y[:n])
    print("C-03 edof len mismatch:", len(gam.statistics_["edof_per_coef"]) != len(gam.coef_))

    # C-07 factor rank
    cat = rng.integers(0, 3, 100)
    xx = rng.normal(size=100)
    yy = xx + rng.normal(0, 0.1, 100)
    Xf = np.column_stack([xx, cat])
    g2 = LinearGAM(s(0) + f(1)).fit(Xf, yy)
    rank = np.linalg.matrix_rank(g2._modelmat(Xf).toarray())
    print("C-07 rank deficient:", rank < g2._modelmat(Xf).shape[1])


if __name__ == "__main__":
    main()