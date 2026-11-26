// Reference regression for kubearmor/KubeArmor/KubeArmor/common/common.go
// Copy into that package to run: go test -run TestMatchExpIdentities_InAndNotIn -v
//
// Executed 2026-11-26 on commit a95bfe7 — FAILED.

package common

import (
	"testing"

	tp "github.com/kubearmor/KubeArmor/KubeArmor/types"
)

func TestMatchExpIdentities_InAndNotIn(t *testing.T) {
	selector := tp.SelectorType{
		MatchExpIdentities: []string{"app=web"},
		NonIdentities:      []string{"env=dev"},
	}

	got := MatchExpIdentities(selector, []string{"namespaceName=default", "app=api", "env=prod"})
	if got {
		t.Fatalf("expected false when In label missing but NotIn satisfied; got true")
	}
}