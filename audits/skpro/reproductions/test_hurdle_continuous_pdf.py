"""Repro: Hurdle with continuous base assigns atom mass via pdf(0) without integrating."""

import numpy as np
from scipy import integrate

from skpro.distributions import Hurdle, Normal


def test_hurdle_pdf_not_a_density():
    p = 0.6
    base = Normal(mu=2.0, sigma=1.0)
    h = Hurdle(p=p, distribution=base)

    def integrand(t):
        return float(h.pdf(np.array([[t]])))

    total, _ = integrate.quad(integrand, -10, 10, limit=300)
  # Continuous part integrates to ~p (0.6). pdf(0) adds (1-p) as height at one point.
    atom = float(h.pdf(np.array([[0.0]])))
    print("integrated_pdf=", total, "pdf(0)=", atom, "p=", p, "1-p=", 1 - p)
    assert atom == 1 - p
    # total excludes the Dirac atom — under-estimates total probability
    assert total < p + 0.01


if __name__ == "__main__":
    test_hurdle_pdf_not_a_density()
    print("reproduced: hurdle pdf integrates to p only, atom at 0 not in integral")