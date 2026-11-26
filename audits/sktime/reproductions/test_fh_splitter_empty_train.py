"""Reproduction: SKTIME-SPLIT-001 — int fh expands to 1..n and can empty train."""
import pandas as pd
import pytest

from sktime.split import ForecastingHorizonSplitter, temporal_train_test_split


@pytest.mark.parametrize(
    "n,expected_train_len",
    [
        (1, 4),
        (4, 1),
        (5, 0),
    ],
)
def test_positive_int_fh_expands_to_range_and_can_empty_train(n, expected_train_len):
  y = pd.Series(range(5), index=pd.RangeIndex(5))
  splitter = ForecastingHorizonSplitter(fh=n)
  train, test = next(splitter.split(y))
  assert len(train) == expected_train_len


def test_fh_equals_series_length_puts_index_zero_in_test_set():
  y = pd.Series(range(10), index=pd.RangeIndex(10))
  train, test = temporal_train_test_split(y, fh=10)
  assert len(train) == 0
  assert test.tolist() == list(range(10)), (
      "when fh=int n becomes steps 1..n and n==len(y), "
      "test contains the first observation — not a valid hold-out split"
  )