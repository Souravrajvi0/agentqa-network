"""Scan skpro distributions for statistical invariant violations vs SciPy."""

from __future__ import annotations

import importlib
import inspect
import warnings
from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy import integrate, stats

warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)


@dataclass
class Finding:
    dist_name: str
    check: str
    detail: str
    max_err: float | None = None


def iter_distribution_classes():
    import skpro.distributions as dist_pkg

    for name in sorted(dir(dist_pkg)):
        if name.startswith("_"):
            continue
        obj = getattr(dist_pkg, name)
        if inspect.isclass(obj) and hasattr(obj, "get_test_params"):
            yield name, obj


def make_instance(cls, params):
  try:
      return cls(**params)
  except Exception as e:
      return e


def eval_grid(d, n=11):
    if d.ndim == 0:
        shape = (1, 1)
    else:
        shape = d.shape
    if hasattr(d, "mean"):
        m = np.asarray(d.mean())
        if m.ndim == 0:
            m = np.array([[float(m)]])
        elif m.ndim == 1:
            m = m.reshape(-1, 1)
    else:
        m = np.zeros(shape)
    lo = m - 3
    hi = m + 3
    xs = []
    for t in np.linspace(0, 1, n):
        xs.append(lo + t * (hi - lo))
    x = np.stack(xs, axis=0).mean(axis=0)
    return x


def check_instance(name, d) -> list[Finding]:
    findings: list[Finding] = []
    exact = set(d.get_tag("capabilities:exact", []))
    approx = set(d.get_tag("capabilities:approx", []))

    if d.ndim == 0:
        x = np.array([[0.0]])
        p = np.array([[0.5]])
    else:
        x = eval_grid(d)
        p = np.full(d.shape, 0.5)

    # CDF bounds
    if "cdf" in exact or "cdf" in approx:
        try:
            cdf = d.cdf(x)
            vals = np.asarray(cdf).astype(float)
            if np.any(vals < -1e-9) or np.any(vals > 1 + 1e-9):
                findings.append(
                    Finding(
                        name,
                        "cdf_bounds",
                        f"cdf outside [0,1]: min={vals.min()}, max={vals.max()}",
                    )
                )
        except Exception as e:
            findings.append(Finding(name, "cdf_error", repr(e)))

    # ppf(cdf(x)) ≈ x for continuous
    mtype = d.get_tag("distr:measuretype", "mixed")
    if mtype == "continuous" and "cdf" in exact and "ppf" in exact:
        try:
            cdf_x = np.asarray(d.cdf(x), dtype=float)
            back = np.asarray(d.ppf(cdf_x), dtype=float)
            err = np.nanmax(np.abs(back - x))
            if err > 1e-4:
                findings.append(
                    Finding(
                        name,
                        "ppf_cdf_roundtrip",
                        f"max |ppf(cdf(x))-x|={err}",
                        max_err=float(err),
                    )
                )
        except Exception as e:
            findings.append(Finding(name, "ppf_cdf_roundtrip_error", repr(e)))

    # pdf integrates to ~1 via quadrature (scalar continuous only)
    if (
        mtype == "continuous"
        and "pdf" in exact
        and d.ndim == 0
        and name not in {"HalfCauchy", "Cauchy", "Levy"}
    ):
        try:

            def integrand(t):
                return float(d.pdf(np.array([[t]])))

            a, b = -50.0, 50.0
            val, _ = integrate.quad(integrand, a, b, limit=200)
            if not (0.98 <= val <= 1.02):
                findings.append(
                    Finding(
                        name,
                        "pdf_normalization",
                        f"quad pdf on [{a},{b}]={val}",
                        max_err=abs(val - 1),
                    )
                )
        except Exception as e:
            findings.append(Finding(name, "pdf_normalization_error", repr(e)))

    # log_pdf vs log(pdf)
    if "log_pdf" in exact and "pdf" in exact:
        try:
            lp = np.asarray(d.log_pdf(x), dtype=float)
            p = np.asarray(d.pdf(x), dtype=float)
            mask = np.isfinite(lp) & (p > 0)
            if mask.any():
                err = np.nanmax(np.abs(lp[mask] - np.log(p[mask])))
                if err > 1e-6:
                    findings.append(
                        Finding(
                            name,
                            "log_pdf_consistency",
                            f"max |log_pdf - log pdf|={err}",
                            max_err=float(err),
                        )
                    )
        except Exception as e:
            findings.append(Finding(name, "log_pdf_consistency_error", repr(e)))

    # hazard = pdf/surv when available
    if all(k in exact for k in ("pdf", "surv", "haz")):
        try:
            h = np.asarray(d.haz(x), dtype=float)
            pdf = np.asarray(d.pdf(x), dtype=float)
            surv = np.asarray(d.surv(x), dtype=float)
            mask = surv > 1e-12
            if mask.any():
                expect = pdf[mask] / surv[mask]
                err = np.nanmax(np.abs(h[mask] - expect))
                if err > 1e-6:
                    findings.append(
                        Finding(
                            name,
                            "haz_identity",
                            f"max |haz - pdf/surv|={err}",
                            max_err=float(err),
                        )
                    )
        except Exception as e:
            findings.append(Finding(name, "haz_identity_error", repr(e)))

    return findings


def main():
    all_findings: list[Finding] = []
    skipped: list[tuple[str, str]] = []

    for name, cls in iter_distribution_classes():
        for params in cls.get_test_params():
            inst = make_instance(cls, params)
            if isinstance(inst, Exception):
                skipped.append((name, repr(inst)))
                continue
            all_findings.extend(check_instance(name, inst))

    print("=== INVARIANT SCAN FINDINGS ===")
    for f in all_findings:
        print(f"{f.dist_name}\t{f.check}\t{f.detail}")

    print(f"\nTotal findings: {len(all_findings)}")
    print(f"Skipped instances: {len(skipped)}")
    if skipped:
        for s in skipped[:15]:
            print("SKIP", s[0], s[1])


if __name__ == "__main__":
    main()