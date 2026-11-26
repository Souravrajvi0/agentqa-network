"""PGMPY-LGBN-001: LGBN.do() does not change the joint Gaussian."""

import numpy as np
from pgmpy.factors.continuous import LinearGaussianCPD
from pgmpy.models import LinearGaussianBayesianNetwork


def _model():
    model = LinearGaussianBayesianNetwork([("x1", "x2"), ("x2", "x3")])
    model.add_cpds(
        LinearGaussianCPD("x1", [1], 4),
        LinearGaussianCPD("x2", [-5, 0.5], 4, ["x1"]),
        LinearGaussianCPD("x3", [4, -1], 3, ["x2"]),
    )
    return model


def test_do_leaves_cpd_parents_and_observational_mean():
    model = _model()
    obs_mean, _ = model.to_joint_gaussian()
    intervened = model.do(["x2"])
    assert ("x1", "x2") not in intervened.edges()
    x2_cpd = intervened.get_cpds("x2")
    assert x2_cpd.evidence == ["x1"]
    do_mean, _ = intervened.to_joint_gaussian()
    assert np.allclose(obs_mean, do_mean)
    try:
        intervened.check_model()
        raise AssertionError("check_model should fail after do()")
    except ValueError as exc:
        assert "proper parents" in str(exc)


def test_simulate_do_is_not_the_do_method():
    model = _model()
    samples = model.simulate(n_samples=20, rng=0, do={"x2": 0.0})
    assert (samples["x2"] == 0.0).all()
