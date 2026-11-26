"""Reproduction: SKTIME-FH-001 — irregular DatetimeIndex + integer relative fh."""
import pandas as pd
import pytest

from sktime.forecasting.base import ForecastingHorizon
from sktime.forecasting.naive import NaiveForecaster


def test_irregular_datetime_relative_fh_should_not_crash_in_to_absolute():
  idx = pd.to_datetime(["2020-01-01", "2020-01-03", "2020-01-10", "2020-01-11"])
  y = pd.Series([1, 2, 3, 4], index=idx)
  forecaster = NaiveForecaster()
  forecaster.fit(y)
  fh = ForecastingHorizon([1, 2], is_relative=True)
  pred = forecaster.predict(fh=fh)
  assert len(pred) == 2