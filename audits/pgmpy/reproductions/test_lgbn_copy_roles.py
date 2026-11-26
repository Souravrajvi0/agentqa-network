"""PGMPY-LGBN-002 / upstream #3746."""

from pgmpy.models import DiscreteBayesianNetwork, LinearGaussianBayesianNetwork


def test_lgbn_copy_drops_roles():
    lgbn = LinearGaussianBayesianNetwork(
        [("U", "X"), ("X", "Y")],
        latents={"U"},
        exposures={"X"},
        outcomes={"Y"},
    )
    assert lgbn.copy().get_role_dict() == {}


def test_discrete_copy_keeps_roles():
    dbn = DiscreteBayesianNetwork(
        [("U", "X"), ("X", "Y")],
        latents={"U"},
        exposures={"X"},
        outcomes={"Y"},
    )
    copied = dict(sorted(dbn.copy().get_role_dict().items()))
    assert copied["exposures"] == ["X"]
    assert copied["latents"] == ["U"]
    assert copied["outcomes"] == ["Y"]
