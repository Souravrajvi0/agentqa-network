"""PGMPY-CPD-001 / upstream #3744."""

from pgmpy.factors.discrete import TabularCPD


def test_list_shape_mismatch_is_attribute_error():
    try:
        TabularCPD("A", 2, [[0.5], [0.5], [0.1]])
        raise AssertionError("expected error")
    except AttributeError as exc:
        assert "shape" in str(exc)


def test_str_super_is_inverted():
    cpd = TabularCPD("A", 2, [[0.5], [0.5]])
    try:
        cpd._str()
        raise AssertionError("expected TypeError")
    except TypeError as exc:
        assert "super()" in str(exc)
