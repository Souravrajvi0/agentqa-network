package reproductions

import (
	"testing"

	v1 "k8s.io/api/core/v1"

	"volcano.sh/volcano/pkg/scheduler/api"
)

func TestLessEqualWithDimension_ScalarNilSkipsReqScalars(t *testing.T) {
	r := &api.Resource{MilliCPU: 1000}
	rr := &api.Resource{MilliCPU: 4000, Memory: 8000}
	req := &api.Resource{
		ScalarResources: map[v1.ResourceName]float64{"nvidia.com/gpu": 1000},
	}

	ok, names := r.LessEqualWithDimensionAndResourcesName(rr, req)
	if ok {
		t.Fatalf("expected false: r has no GPU scalar map but req demands GPU; got ok=true names=%v", names)
	}
}