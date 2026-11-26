"""PGMPY-ID-001 / upstream #3553."""

from pgmpy.base import DAG
from pgmpy.identification import Adjustment


def test_mediator_validates():
    d1 = DAG(
        [("X", "M"), ("M", "Y")],
        roles={"exposures": "X", "outcomes": "Y", "adjustment": ["M"]},
    )
    assert Adjustment().validate(d1) is True


def test_collider_validates():
    d2 = DAG(
        [("X", "Y"), ("X", "C"), ("Y", "C")],
        roles={"exposures": "X", "outcomes": "Y", "adjustment": ["C"]},
    )
    assert Adjustment().validate(d2) is True
