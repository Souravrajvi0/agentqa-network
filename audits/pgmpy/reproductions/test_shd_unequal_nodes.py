"""Closed #2094: SHD on unequal node sets raises ValueError (current behavior)."""

from pgmpy.base import DAG
from pgmpy.metrics import SHD


def test_unequal_node_sets_raise():
    true = DAG([("A", "B")])
    extra = DAG([("A", "B"), ("C", "D")])
    shd = SHD()
    try:
        shd(true_causal_graph=true, est_causal_graph=extra)
        raise AssertionError("expected ValueError")
    except ValueError as e:
        assert "same nodes" in str(e)
