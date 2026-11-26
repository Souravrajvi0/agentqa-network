"""Reproduction: SKTIME-RED-001 — recursive reduction edge-pads short future X."""
import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LinearRegression

from sktime.forecasting.base import ForecastingHorizon
from sktime.forecasting.compose import make_reduction


def test_recursive_edge_pad_changes_forecasts_when_future_X_short():
  y = pd.Series(np.arange(20.0), index=pd.RangeIndex(20))
  X = pd.DataFrame({"x": np.arange(20.0)}, index=y.index)
  fh = ForecastingHorizon([1, 2, 3], is_relative=True)

  forecaster = make_reduction(
      LinearRegression(), window_length=5, strategy="recursive"
  )
  forecaster.fit(y, X=X, fh=fh)

  pred_full = forecaster.predict(fh=fh, X=X)
  pred_short = forecaster.predict(fh=fh, X=X.iloc[:10])

  assert not np.allclose(pred_full.values, pred_short.values), (
      "sanity check: short X should not match full X in this synthetic setup"
  )
  # Bug: short X silently matches or diverges due to np.pad(..., 'edge')
  # Expected: raise ValueError or require future rows; not reuse last observed X.
  np.testing.assert_allclose(
      pred_short.values,
      pred_full.values,
      err_msg=(
          "recursive strategy should not silently edge-pad missing future "
          "exogenous rows (sktime/forecasting/compose/_reduce.py ~1107-1112)"
      ),
  )


def test_direct_strategy_unaffected_by_short_future_X():
  y = pd.Series(np.arange(20.0), index=pd.RangeIndex(20))
  X = pd.DataFrame({"x": np.arange(20.0)}, index=y.index)
  fh = ForecastingHorizon([1, 2, 3], is_relative=True)

  forecaster = make_reduction(LinearRegression(), window_length=5, strategy="direct")
  forecaster.fit(y, X=X, fh=fh)

  pred_full = forecaster.predict(fh=fh, X=X)
  pred_short = forecaster.predict(fh=fh, X=X.iloc[:10])
  np.testing.assert_allclose(pred_full.values, pred_short.values)