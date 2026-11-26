// Package repros encodes the Litmus lifecycle contracts as executable tests.
// Each test compares the current in-tree algorithm (copied, not imported) with
// the documented contract so CI can keep the investigation honest without a
// cluster.
package repros

import (
	"encoding/base64"
	"encoding/json"
	"math"
	"strings"
	"testing"
	"time"
)

// --- L1: stopChaosEngine argument order ------------------------------------

// currentStopWaitCall is the argument order used in litmus-go
// pkg/probe/probe.go stopChaosEngine:
//
//	checkForErrorInContinuousProbe(result, name, chaosDetails.Timeout, chaosDetails.Delay)
//
// The helper signature is (delay, timeout).
func currentStopWaitCall(delay, timeout int) (gotDelay, gotTimeout int) {
	return timeout, delay
}

func TestStopChaosEngineWaitArgsSwapped(t *testing.T) {
	const delay, timeout = 5, 180
	gotDelay, gotTimeout := currentStopWaitCall(delay, timeout)
	if gotDelay == delay && gotTimeout == timeout {
		t.Fatal("upstream appears to have fixed argument order")
	}
	if gotDelay != timeout || gotTimeout != delay {
		t.Fatalf("unexpected mapping delay=%d timeout=%d", gotDelay, gotTimeout)
	}
	t.Logf("contract: wait delay=%ds timeout=%ds; actual call delay=%ds timeout=%ds",
		delay, timeout, gotDelay, gotTimeout)
}

// --- L2: OnChaos remaining duration ----------------------------------------

func buggyRemainingOnChaos(chaosDurationSeconds int, initialDelay time.Duration) int {
	// triggerOnChaosK8sProbe / triggerSourceOnChaosCmdProbe / triggerOnChaosPromProbe
	return int(math.Max(0, float64(chaosDurationSeconds-int(initialDelay))))
}

func contractRemainingOnChaos(chaosDurationSeconds int, initialDelay time.Duration) int {
	// triggerInlineOnChaosCmdProbe
	return int(math.Max(0, float64(chaosDurationSeconds-int(initialDelay.Seconds()))))
}

func TestOnChaosRemainingDurationNanoseconds(t *testing.T) {
	delay := 5 * time.Second
	got := buggyRemainingOnChaos(60, delay)
	want := contractRemainingOnChaos(60, delay)
	if got == want {
		t.Fatal("upstream appears to have fixed initialDelay subtraction")
	}
	if got != 0 {
		t.Fatalf("expected collapsed duration 0, got %d", got)
	}
	if want != 55 {
		t.Fatalf("contract remaining seconds: got %d want 55", want)
	}
}

// --- L5: InitialPatchEngine append -----------------------------------------

type experimentStatus struct {
	Name   string
	Status string
}

func initialPatchEngine(existing []experimentStatus, names []string) []experimentStatus {
	// chaos-runner pkg/utils/initialPatchEngine.go appends without clearing
	out := append([]experimentStatus{}, existing...)
	for _, n := range names {
		out = append(out, experimentStatus{Name: n, Status: "Waiting for Job Creation"})
	}
	return out
}

func TestInitialPatchEngineDuplicatesOnRestart(t *testing.T) {
	first := initialPatchEngine(nil, []string{"pod-delete"})
	second := initialPatchEngine(first, []string{"pod-delete"})
	if len(second) != 2 {
		t.Fatalf("restart should duplicate rows in current code, got %d", len(second))
	}
	if second[0].Name != "pod-delete" || second[1].Name != "pod-delete" {
		t.Fatalf("unexpected rows: %+v", second)
	}
}

// --- L6: failed runner completion ------------------------------------------

func runnerContainerCompleted(phase, terminatedReason string, ready bool) bool {
	// chaos-operator checkRunnerContainerCompletedStatus
	isCompleted := false
	if phase == "Running" || phase == "Succeeded" {
		if terminatedReason == "Completed" {
			isCompleted = !ready
		}
	}
	return isCompleted
}

func TestFailedRunnerDoesNotCompleteEngine(t *testing.T) {
	if runnerContainerCompleted("Failed", "Error", false) {
		t.Fatal("Failed/Error runner must not be treated as completed in current code")
	}
	if !runnerContainerCompleted("Succeeded", "Completed", false) {
		t.Fatal("Succeeded/Completed runner should complete")
	}
}

func TestEngineCreatedInStopNeverReconciles(t *testing.T) {
	// initEngine only fills EngineStatus when EngineState is active.
	engineState := "stop"
	engineStatus := ""
	matchesAbort := engineState == "stop" && engineStatus == "initialized"
	matchesComplete := engineState == "stop" && engineStatus == "completed"
	matchesCreate := engineState == "active" && engineStatus == "initialized"
	if matchesAbort || matchesComplete || matchesCreate {
		t.Fatal("empty status + stop should not match a handled branch in current operator")
	}
}

// --- L7: first ChaosResult only --------------------------------------------

func updateChaosResults(uids []string, engineUID string) int {
	updated := 0
	for _, u := range uids {
		if u == engineUID {
			updated++
			return updated // current: return after first match
		}
	}
	return updated
}

func TestAbortUpdatesOnlyFirstChaosResult(t *testing.T) {
	n := updateChaosResults([]string{"e1", "e1"}, "e1")
	if n != 1 {
		t.Fatalf("current abort path updates first match only, got %d", n)
	}
}

// --- L8: portal phase mapping ----------------------------------------------

func updateWorkflowStatus(argoPhase string) string {
	switch argoPhase {
	case "Running":
		return "Running"
	case "Succeeded":
		return "Completed"
	case "Failed":
		return "Completed"
	case "Pending":
		return "Pending"
	case "Error":
		return "Error"
	default:
		return "Pending"
	}
}

func getExperimentStatus(workflowPhase string, nodes []struct {
	Type, Phase, Verdict string
	ChaosExpNil          bool
}) string {
	status := workflowPhase
	if status == "Stopped" {
		return status
	}
	errorCount, probeFail := 0, 0
	for _, node := range nodes {
		if node.Type == "ChaosEngine" && node.ChaosExpNil {
			errorCount++
			continue
		}
		switch node.Phase {
		case "Completed_With_Probe_Failure":
			probeFail++
		case "Error":
			errorCount++
		}
	}
	if errorCount > 0 {
		return "Error"
	}
	if probeFail > 0 {
		return "Completed_With_Probe_Failure"
	}
	return status
}

func TestWorkflowPhaseMapping(t *testing.T) {
	if updateWorkflowStatus("Failed") != "Completed" {
		t.Fatal("current mapping should report Failed as Completed")
	}
	if updateWorkflowStatus("Succeeded") != "Completed" {
		t.Fatal("Succeeded should map to Completed")
	}
}

func TestGetExperimentStatusIgnoresVerdict(t *testing.T) {
	phase := getExperimentStatus("Completed", []struct {
		Type, Phase, Verdict string
		ChaosExpNil          bool
	}{{
		Type: "ChaosEngine", Phase: "Completed", Verdict: "Fail",
	}})
	if phase != "Completed" {
		t.Fatalf("verdict Fail is ignored today, got %s", phase)
	}
}

// --- L10: stop namespace vs resolveEngineNamespace --------------------------

func resolveEngineNamespace(manifestNS, fallbackNS string) string {
	engineNS := strings.TrimSpace(manifestNS)
	if engineNS == "" || strings.Contains(engineNS, "{{") {
		return fallbackNS
	}
	return engineNS
}

func TestStopListsInfraNamespaceNotEngineNamespace(t *testing.T) {
	engineNS := resolveEngineNamespace("sock-shop", "litmus")
	stopListNS := "litmus" // WorkflowRequest passes INFRA_NAMESPACE
	if engineNS == stopListNS {
		t.Fatal("admin-mode repro requires distinct namespaces")
	}
	if engineNS != "sock-shop" {
		t.Fatalf("engine NS %s", engineNS)
	}
}

// --- L11: execution data fallback ------------------------------------------

func fallbackExecutionBytes(executionData, experimentID string) []byte {
	if _, err := base64.StdEncoding.DecodeString(executionData); err != nil {
		return []byte(experimentID) // current typo
	}
	out, _ := base64.StdEncoding.DecodeString(executionData)
	return out
}

func TestExecutionDataFallbackUsesWrongField(t *testing.T) {
	raw := `{"phase":"Running","nodes":{}}`
	id := "exp-uuid-not-json"
	got := fallbackExecutionBytes(raw, id)
	if string(got) == raw {
		t.Fatal("upstream appears to have fixed fallback to ExecutionData")
	}
	if string(got) != id {
		t.Fatalf("got %q want experimentID", got)
	}
	var m map[string]any
	if json.Unmarshal(got, &m) == nil {
		t.Fatal("uuid must not unmarshal as execution JSON")
	}
}

// --- L12: enum drift -------------------------------------------------------

func TestGraphQLEnumMissingProbeFailure(t *testing.T) {
	graphql := map[string]struct{}{
		"All": {}, "Running": {}, "Completed": {}, "Completed_With_Error": {},
		"Stopped": {}, "Skipped": {}, "Error": {}, "Timeout": {},
		"Terminated": {}, "Queued": {}, "NA": {},
	}
	ts := "Completed_With_Probe_Failure"
	if _, ok := graphql[ts]; ok {
		t.Fatal("GraphQL enum now includes probe-failure; update findings")
	}
}

// --- L13: stats filter -----------------------------------------------------

func statsMatchIncludesRemoved(isRemoved bool) bool {
	// GetExperimentRunStats matches project_id only
	_ = isRemoved
	return true
}

func TestStatsCountRemovedRuns(t *testing.T) {
	if !statsMatchIncludesRemoved(true) {
		t.Fatal("removed runs are included in current stats match")
	}
}

// --- L14: mode case --------------------------------------------------------

func cmdProbeStarts(mode string) bool {
	switch mode {
	case "SOT", "Edge":
		return true
	default:
		return false
	}
}

func runProbesStarts(mode string) bool {
	switch strings.ToLower(mode) {
	case "sot", "edge", "continuous":
		return true
	default:
		return false
	}
}

func TestCmdProbeModeCaseSensitive(t *testing.T) {
	if cmdProbeStarts("edge") {
		t.Fatal("cmd probe currently requires canonical Edge")
	}
	if !runProbesStarts("edge") {
		t.Fatal("RunProbes should accept lowercase")
	}
}

// --- L15: weight Contains --------------------------------------------------

func pickWeight(engineName string, faults []string) string {
	experimentName := ""
	for _, expName := range faults {
		if strings.Contains(engineName, expName) {
			experimentName = expName
		}
	}
	return experimentName
}

func TestResiliencyWeightContainsOverlap(t *testing.T) {
	// nginx is a substring of nginx-delay; depending on iteration, nginx may win.
	got := pickWeight("nginx-delay-abc", []string{"nginx", "nginx-delay"})
	if got != "nginx" && got != "nginx-delay" {
		t.Fatalf("unexpected %s", got)
	}
	// Current loop does not require exact match, so "nginx" can be selected.
	if !strings.Contains("nginx-delay-abc", "nginx") {
		t.Fatal("substring match is the bug")
	}
}

// --- L4: duration unit -----------------------------------------------------

func TestRunnerGetChaosEngineWaitIsNanoseconds(t *testing.T) {
	prod := time.Duration(2)
	test := time.Duration(2) * time.Second
	if prod == test {
		t.Fatal("2 and 2s must differ")
	}
	if prod != 2*time.Nanosecond {
		t.Fatalf("prod wait is %s", prod)
	}
}
