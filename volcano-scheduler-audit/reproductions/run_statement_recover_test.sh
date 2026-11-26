#!/usr/bin/env bash
# Runs partial RecoverOperations reproduction inside volcano module (no upstream file changes).
set -euo pipefail
VOLCANO_ROOT="$(cd "$(dirname "$0")/../../../volcano" && pwd)"
TMP_PKG="$VOLCANO_ROOT/pkg/scheduler/framework/audit_recover_partial_test.go"

cleanup() { rm -f "$TMP_PKG"; }
trap cleanup EXIT

cat >"$TMP_PKG" <<'EOF'
package framework

import (
	"testing"

	"github.com/stretchr/testify/assert"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"volcano.sh/volcano/pkg/scheduler/api"
)

func TestAudit_RecoverOperations_PartialFailureLeavesSessionMutated(t *testing.T) {
	victimJob := api.JobID("ns/victim")
	victimTask := &api.TaskInfo{
		UID: "victim", Job: victimJob, Name: "victim", Namespace: "ns",
		Resreq: (&api.Resource{MilliCPU: 1000}).Clone(),
		InitResreq: (&api.Resource{MilliCPU: 1000}).Clone(),
		Pod: &v1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "victim", Namespace: "ns", UID: types.UID("victim")}},
		NumaInfo: &api.TopologyInfo{ResMap: map[int]v1.ResourceList{}},
		TransactionContext: api.TransactionContext{Status: api.Running, NodeName: "n1"},
	}
	job := api.NewJobInfo(victimJob, victimTask)
	job.UpdateTaskStatus(victimTask, api.Running)
	node := api.NewNodeInfo(nil)
	node.Name = "n1"
	node.Idle = (&api.Resource{MilliCPU: 2000}).Clone()
	node.Used = (&api.Resource{MilliCPU: 1000}).Clone()
	assert.NoError(t, node.AddTask(victimTask))
	ssn := &Session{Jobs: map[api.JobID]*api.JobInfo{victimJob: job}, Nodes: map[string]*api.NodeInfo{node.Name: node}}

	pl := &api.TaskInfo{
		UID: "pl", Job: "ns/x", Name: "pl", Namespace: "ns",
		Resreq: (&api.Resource{MilliCPU: 500}).Clone(),
		InitResreq: (&api.Resource{MilliCPU: 500}).Clone(),
		Pod: &v1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "pl", Namespace: "ns", UID: types.UID("pl")}},
		NumaInfo: &api.TopologyInfo{ResMap: map[int]v1.ResourceList{}},
		TransactionContext: api.TransactionContext{Status: api.Pending},
	}
	src := NewStatement(ssn)
	src.Evict(victimTask, "test")
	assert.NoError(t, src.Pipeline(pl, "missing-node", false))
	plan := SaveOperations(src)
	src.Discard()
	rec := NewStatement(ssn)
	assert.Error(t, rec.RecoverOperations(plan))
	if len(job.TaskStatusIndex[api.Releasing]) != 1 {
		t.Fatalf("victim should remain Releasing after partial replay")
	}
	assert.True(t, rec.HasEvictions())
}
EOF

cd "$VOLCANO_ROOT/pkg/scheduler/framework"
go test -run TestAudit_RecoverOperations_PartialFailureLeavesSessionMutated -count=1 -v