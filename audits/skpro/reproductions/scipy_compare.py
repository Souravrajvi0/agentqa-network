"""Compare scalar skpro distributions against scipy reference."""

import importlib
import inspect
import warnings

import numpy as np
from scipy import integrate, stats

warnings.filterwarnings("ignore")

# manual map: skpro class name -> scipy frozen constructor kwargs builder
SCIPY_MAP = {
    "Normal": lambda: stats.norm(loc=0.0, scale=1.0),
    "Laplace": lambda: stats.laplace(loc=0.0, scale=1.0),
    "Exponential": lambda: stats.expon(scale=2.0),
    "Gamma": lambda: stats.gamma(a=2.0, scale=2.0),
    "Lognormal": lambda: stats.lognorm(s=0.5, scale=np.exp(1.0)),
    "Weibull": lambda: stats.weibull_min(c=1.5, scale=2.0),
    "Beta": lambda: stats.beta(a=2.0, b=3.0),
    "Triangular": lambda: stats.triang(c=0.25, loc=0.0, scale=3.0),
    "Poisson": lambda: stats.poisson(mu=3.0),
    "Geometric": lambda: stats.geom(p=0.3),
    "GeneralizedPareto": lambda: stats.genpareto(c=0.1, scale=1.0),
}


def skpro_ctor(name):
    import skpro.distributions as dp

    cls = getattr(dp, name)
    params = cls.get_test_params()[-1]  # prefer scalar
    return cls(**params)


def main():
    grid = np.linspace(-2, 6, 50)
    for name, scipy_maker in SCIPY_MAP.items():
        d = skpro_ctor(name)
        if d.ndim != 0:
            continue
        rv = scipy_maker()
        mtype = d.get_tag("distr:measuretype")
        issues = []
        if "pdf" in d.get_tag("capabilities:exact", []):
            for t in grid:
                sp = rv.pdf(t)
                sk = float(d.pdf(np.array([[t]])))
                if np.isfinite(sp) and np.isfinite(sk) and abs(sp - sk) > 1e-6 * max(1, abs(sp)):
                    issues.append(("pdf", t, sp, sk))
                    break
        if "cdf" in d.get_tag("capabilities:exact", []):
            for t in grid:
                sp = rv.cdf(t)
                sk = float(d.cdf(np.array([[t]])))
                if abs(sp - sk) > 1e-6:
                    issues.append(("cdf", t, sp, sk))
                    break
        if "ppf" in d.get_tag("capabilities:exact", []):
            for p in [0.1, 0.5, 0.9]:
                sp = rv.ppf(p)
                sk = float(d.ppf(np.array([[p]])))
                if abs(sp - sk) > 1e-5:
                    issues.append(("ppf", p, sp, sk))
                    break
        if mtype == "continuous" and "pdf" in d.get_tag("capabilities:exact", []):

            def integrand(t):
                return float(d.pdf(np.array([[t]])))

            val, _ = integrate.quad(integrand, grid[0], grid[-1], limit=200)
            if not (0.99 <= val <= 1.01):
                issues.append(("norm", None, val, None))
        print(name, "OK" if not issues else issues)


if __name__ == "__main__":
    main()