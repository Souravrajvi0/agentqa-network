"""PGMPY-LGBN-003: mismatched beta passes check_model then crashes in to_joint_gaussian."""

from pgmpy.factors.continuous import LinearGaussianCPD
from pgmpy.models import LinearGaussianBayesianNetwork


def test_mismatched_beta_passes_check_model():
    m = LinearGaussianBayesianNetwork([("X", "Y")])
    m.add_cpds(
        LinearGaussianCPD("X", [0], 1),
        LinearGaussianCPD("Y", [1, 2, 3], 1, evidence=["X"]),
    )
    assert m.check_model() is True
    try:
        m.to_joint_gaussian()
        raise AssertionError("expected broadcast error")
    except ValueError:
        pass
