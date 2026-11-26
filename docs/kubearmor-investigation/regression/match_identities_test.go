// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Authors of KubeArmor
//
// Intended for KubeArmor/KubeArmor/common/ (not this Go module).
// Ran 2026-11-26 against kubearmor/KubeArmor main:
//   TestMatchExpIdentities_InAndNotIn/not_in-set_and_not_excluded FAILED
//   MatchExpIdentities([namespaceName=default app=api env=prod]) = true, want false

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

	cases := []struct {
		name    string
		labels  []string
		want    bool
		comment string
	}{
		{
			name:    "in-set and not excluded",
			labels:  []string{"namespaceName=default", "app=web", "env=prod"},
			want:    true,
			comment: "app=web is In, env=prod is not NotIn",
		},
		{
			name:    "in-set but excluded",
			labels:  []string{"namespaceName=default", "app=web", "env=dev"},
			want:    false,
			comment: "NotIn env=dev should reject",
		},
		{
			name:    "not in-set and not excluded",
			labels:  []string{"namespaceName=default", "app=api", "env=prod"},
			want:    false,
			comment: "app=api is not in In list; should not match",
		},
		{
			name:    "not in-set and excluded",
			labels:  []string{"namespaceName=default", "app=api", "env=dev"},
			want:    false,
			comment: "fails both In and NotIn",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := MatchExpIdentities(selector, tc.labels)
			if got != tc.want {
				t.Errorf("MatchExpIdentities(%v) = %v, want %v (%s)", tc.labels, got, tc.want, tc.comment)
			}
		})
	}
}
