package background

import (
	"context"
	"testing"
	"time"

	"github.com/go-logr/logr"
	policiesv1beta1 "github.com/kyverno/api/api/policies.kyverno.io/v1beta1"
	"github.com/kyverno/kyverno/pkg/breaker"
	celengine "github.com/kyverno/kyverno/pkg/cel/engine"
	kyvernofake "github.com/kyverno/kyverno/pkg/client/clientset/versioned/fake"
	policiesv1beta1listers "github.com/kyverno/kyverno/pkg/client/listers/policies.kyverno.io/v1beta1"
	"github.com/kyverno/kyverno/pkg/clients/dclient"
	"github.com/kyverno/kyverno/pkg/config"
	reportresource "github.com/kyverno/kyverno/pkg/controllers/report/resource"
	"github.com/kyverno/kyverno/pkg/event"
	reportutils "github.com/kyverno/kyverno/pkg/utils/report"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	kubefake "k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/util/workqueue"
)

func TestNamespacedPolicyLeaksToClusterScopedResource(t *testing.T) {
	breaker.SetReportsBreaker(breaker.NewBreaker("t", func(context.Context) bool { return false }))
	reportutils.NewReportingConfig([]string{"pass", "fail", "warn", "error", "skip"})
	nvpol := &policiesv1beta1.NamespacedValidatingPolicy{
		ObjectMeta: metav1.ObjectMeta{Name: "team-a-policy", Namespace: "team-a", ResourceVersion: "1"},
		Spec: policiesv1beta1.ValidatingPolicySpec{
			MatchConstraints: &admissionregistrationv1.MatchResources{
				ResourceRules: []admissionregistrationv1.NamedRuleWithOperations{{
					RuleWithOperations: admissionregistrationv1.RuleWithOperations{
						Operations: []admissionregistrationv1.OperationType{admissionregistrationv1.Create},
						Rule:       admissionregistrationv1.Rule{APIGroups: []string{""}, APIVersions: []string{"v1"}, Resources: []string{"namespaces"}},
					},
				}},
			},
			Validations: []admissionregistrationv1.Validation{{Expression: "false", Message: "always fails"}},
		},
	}
	nvIdx := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	_ = nvIdx.Add(nvpol)

	emptyIdx := func() cache.Indexer {
		return cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	}

	target := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "v1", "kind": "Namespace",
		"metadata": map[string]any{"name": "other-team", "uid": "ns-uid"},
	}}
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	dyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme, map[schema.GroupVersionResource]string{{Version: "v1", Resource: "namespaces"}: "NamespaceList"}, target)
	client := dclient.NewFakeClientWithDisco(dyn, kubefake.NewSimpleClientset(), dclient.NewFakeDiscoveryClient(nil))
	kc := kyvernofake.NewSimpleClientset()
	baseQ := workqueue.NewTypedRateLimitingQueueWithConfig(workqueue.DefaultTypedControllerRateLimiter[string](), workqueue.TypedRateLimitingQueueConfig[string]{Name: "t"})

	ctrl := &controller{
		client:           client,
		kyvernoClient:    kc,
		nvpolLister:      policiesv1beta1listers.NewNamespacedValidatingPolicyLister(nvIdx),
		celpolexListener: celengine.NewPolicyExceptionLister(policiesv1beta1listers.NewPolicyExceptionLister(emptyIdx()), "*"),
		cbgscanrLister:   cache.NewGenericLister(emptyIdx(), schema.GroupResource{Group: "reports.kyverno.io", Resource: "clusterephemeralreports"}),
		bgscanrLister:    cache.NewGenericLister(emptyIdx(), schema.GroupResource{Group: "reports.kyverno.io", Resource: "ephemeralreports"}),
		metadataCache: &fakeMetadataCache{
			resource: reportresource.Resource{Name: "other-team", Namespace: "", Hash: "h"},
			gvk:      schema.GroupVersionKind{Version: "v1", Kind: "Namespace"},
			gvr:      schema.GroupVersionResource{Version: "v1", Resource: "namespaces"},
			exists:   true,
		},
		queue:         baseQ,
		forceDelay:    time.Hour,
		config:        config.NewDefaultConfiguration(true),
		policyReports: true,
		eventGen:      event.NewFake(),
	}
	if err := ctrl.reconcile(context.Background(), logr.Discard(), "ns-uid", "", "ns-uid"); err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	list, err := kc.ReportsV1().ClusterEphemeralReports().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		t.Fatal(err)
	}
	for _, r := range list.Items {
		for _, res := range r.Spec.Results {
			t.Errorf("namespaced policy %q (ns team-a) produced result %q/%s on cluster-scoped Namespace %q", res.Policy, res.Rule, res.Result, "other-team")
		}
	}
}
