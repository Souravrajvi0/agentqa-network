"""Repro: TruncatedDistribution accepts lower > upper and returns nonsense."""

from skpro.distributions import Normal, TruncatedDistribution


def test_inverted_bounds_should_raise():
    base = Normal(mu=0.0, sigma=1.0)
    t = TruncatedDistribution(base, lower=2.0, upper=1.0)
    pl, pu = t._get_low_high_prob()
    assert pu < pl, "interval probability mass is negative"
    cdf_mid = float(t.cdf(1.5))
    pdf_mid = float(t.pdf(1.5))
    # Observed on main: cdf_mid ~ 0.32, pdf_mid == 0.0
    assert 0.0 <= cdf_mid <= 1.0  # passes incorrectly — not a proper CDF of any distribution
    assert pdf_mid >= 0.0


if __name__ == "__main__":
    test_inverted_bounds_should_raise()
    print("inverted bounds accepted; normalizer=", end=" ")
    base = Normal(0, 1)
    t = TruncatedDistribution(base, lower=2.0, upper=1.0)
    pl, pu = t._get_low_high_prob()
    print(pu - pl)