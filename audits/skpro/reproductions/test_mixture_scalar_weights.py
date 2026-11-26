"""Repro duplicate of #1191: scalar Mixture ignores weights in _mean."""

from skpro.distributions import Mixture, Normal


def test_scalar_mixture_mean_ignores_weights():
    m = Mixture(
        distributions=[Normal(mu=-1.0, sigma=1.0), Normal(mu=5.0, sigma=1.0)],
        weights=[0.75, 0.25],
    )
    assert m.ndim == 0
    assert float(m.mean()) == 2.0  # unweighted average of -1 and 5
    assert abs(float(m.mean()) - 0.5) > 1e-9  # weighted mean should be 0.5


if __name__ == "__main__":
    test_scalar_mixture_mean_ignores_weights()
    print("reproduced #1191")