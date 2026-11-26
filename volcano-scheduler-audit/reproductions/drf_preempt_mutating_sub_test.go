/*
Reproduction for DRF PreemptableFn: allocations[job].Sub mutates before the victim test.
See pkg/scheduler/plugins/drf/drf.go:248-255.
*/
package reproductions

import (
	"math"
	"testing"

	"volcano.sh/volcano/pkg/scheduler/api"
)

const drfShareDelta = 0.000001

func drfShare(allocated, total *api.Resource) float64 {
	res := float64(0)
	for _, rn := range total.ResourceNames() {
		denom := total.Get(rn)
		if denom <= 0 {
			continue
		}
		share := allocated.Get(rn) / denom
		if share > res {
			res = share
		}
	}
	return res
}

func drfVictimsBuggy(preemptorAlloc, preemptorReq float64, jobAlloc float64, taskReqs []float64) []int {
	total := &api.Resource{MilliCPU: 100000}
	lalloc := &api.Resource{MilliCPU: preemptorAlloc + preemptorReq}
	ls := drfShare(lalloc, total)

	allocations := map[api.JobID]*api.Resource{"victim": {MilliCPU: jobAlloc}}
	var victims []int
	for i, tr := range taskReqs {
		ralloc := allocations["victim"].Sub(&api.Resource{MilliCPU: tr})
		rs := drfShare(ralloc, total)
		if ls < rs || math.Abs(ls-rs) <= drfShareDelta {
			victims = append(victims, i)
		}
	}
	return victims
}

func drfVictimsFixed(preemptorAlloc, preemptorReq float64, jobAlloc float64, taskReqs []float64) []int {
	total := &api.Resource{MilliCPU: 100000}
	lalloc := &api.Resource{MilliCPU: preemptorAlloc + preemptorReq}
	ls := drfShare(lalloc, total)

	allocations := map[api.JobID]*api.Resource{"victim": {MilliCPU: jobAlloc}}
	var victims []int
	for i, tr := range taskReqs {
		base := allocations["victim"].Clone()
		rs := drfShare(base.Sub(&api.Resource{MilliCPU: tr}), total)
		if ls < rs || math.Abs(ls-rs) <= drfShareDelta {
			victims = append(victims, i)
			allocations["victim"].Sub(&api.Resource{MilliCPU: tr})
		}
	}
	return victims
}

func TestDRFPreemptMutatingSub_SecondTaskWronglyExcluded(t *testing.T) {
	jobAlloc := float64(90000)
	task0 := float64(80000)
	task1 := float64(10000)
	preemptorAlloc := float64(40000)
	preemptorReq := float64(10000)

	got := drfVictimsBuggy(preemptorAlloc, preemptorReq, jobAlloc, []float64{task0, task1})
	want := drfVictimsFixed(preemptorAlloc, preemptorReq, jobAlloc, []float64{task0, task1})

	if len(want) != 1 || want[0] != 1 {
		t.Fatalf("reference impl: expected victim index 1, got %v", want)
	}
	if len(got) != len(want) {
		t.Fatalf("DRF preempt victim mismatch: buggy=%v fixed=%v (task1 should be preemptible)", got, want)
	}
}