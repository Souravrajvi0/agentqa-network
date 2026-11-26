"""Repro: BaseDistribution.surv uses 1-cdf; Normal tail returns exactly 0."""

import numpy as np
from scipy.stats import norm

from skpro.distributions import Laplace, Normal


def test_normal_surv_tail_vs_scipy_sf():
    d = Normal(mu=0.0, sigma=1.0)
    x = 10.0
    surv_sk = float(d.surv(x))
    surv_scipy = float(norm.sf(x))
    assert surv_scipy > 0
    assert surv_sk == 0.0  # observed bug: catastrophic cancellation via 1-cdf(8)==1.0


def test_haz_tail_infinite():
    d = Normal(mu=0.0, sigma=1.0)
    h = float(d.haz(10.0))
    assert np.isinf(h) or np.isnan(h)  # pdf>0, surv=0 => inf hazard


def test_laplace_same_path():
    d = Laplace(mu=0.0, scale=1.0)
    x = 40.0
    assert float(d.surv(x)) == 0.0


if __name__ == "__main__":
    test_normal_surv_tail_vs_scipy_sf()
    test_haz_tail_infinite()
    test_laplace_same_path()
    print("reproduced tail surv/haz failure")