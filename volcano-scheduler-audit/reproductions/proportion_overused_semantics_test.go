package reproductions

import (
	"testing"

	"volcano.sh/volcano/pkg/scheduler/api"
)

// Documents proportion OverusedFn vs updateQueueAttrShare inconsistency (known: volcano#3695).
func TestProportionOverused_AllDimensionsVsMaxShare(t *testing.T) {
	deserved := &api.Resource{MilliCPU: 4000, Memory: 8 * 1024 * 1024 * 1024}
	allocated := &api.Resource{MilliCPU: 8000, Memory: 4 * 1024 * 1024 * 1024}

	overusedFN := deserved.LessEqual(allocated, api.Zero)
	maxShare := 0.0
	for _, rn := range deserved.ResourceNames() {
		d := deserved.Get(rn)
		if d <= 0 {
			continue
		}
		s := allocated.Get(rn) / d
		if s > maxShare {
			maxShare = s
		}
	}

	if maxShare <= 1.0 {
		t.Fatalf("expected max share > 1, got %v", maxShare)
	}
	if !overusedFN {
		t.Fatalf("OverusedFn returned false while max share=%v > 1 (issue #3695 semantics)", maxShare)
	}
}