"""PGMPY-FBN-001: Functional CPD/copy contract (no torch required)."""

import inspect

from pgmpy.factors.hybrid.FunctionalCPD import FunctionalCPD
from pgmpy.models.DiscreteBayesianNetwork import DiscreteBayesianNetwork
from pgmpy.models.FunctionalBayesianNetwork import FunctionalBayesianNetwork


def test_functional_cpd_has_no_copy():
    assert not hasattr(FunctionalCPD, "copy")


def test_functional_bn_does_not_override_copy():
    assert "copy" not in FunctionalBayesianNetwork.__dict__
    assert FunctionalBayesianNetwork.copy is DiscreteBayesianNetwork.copy


def test_discrete_copy_hardcodes_discrete_class():
    src = inspect.getsource(DiscreteBayesianNetwork.copy)
    assert "DiscreteBayesianNetwork()" in src
    assert "FunctionalBayesianNetwork" not in src
