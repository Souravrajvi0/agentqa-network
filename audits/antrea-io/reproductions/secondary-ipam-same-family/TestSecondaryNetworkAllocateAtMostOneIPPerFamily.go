// Drop this function into pkg/agent/cniserver/ipam/antrea_ipam_test.go (same package).
// TestSecondaryNetworkAllocateAtMostOneIPPerFamily mirrors primary Add(): when
// two IPv4 IPPools are listed, only one IPv4 address should be assigned. Exhausted
// pools of the same family are a fallback, not a source of extra addresses.
func TestSecondaryNetworkAllocateAtMostOneIPPerFamily(t *testing.T) {
	stopCh := make(chan struct{})
	defer close(stopCh)

	k8sClient, crdClient := initTestClients()
	informerFactory := informers.NewSharedInformerFactory(k8sClient, 0)
	crdInformerFactory := crdinformers.NewSharedInformerFactory(crdClient, 0)
	listOptions := func(options *metav1.ListOptions) {
		options.FieldSelector = fields.OneTermEqualSelector("spec.nodeName", "fakeNode").String()
	}
	localPodInformer := coreinformers.NewFilteredPodInformer(
		k8sClient,
		metav1.NamespaceAll,
		0,
		cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc},
		listOptions,
	)
	controller, err := InitializeAntreaIPAMController(crdClient,
		informerFactory.Core().V1().Namespaces(),
		crdInformerFactory.Crd().V1beta1().IPPools(),
		localPodInformer,
		true,
	)
	require.NoError(t, err)
	createIPPools(crdClient)
	go controller.Run(stopCh)
	crdInformerFactory.Start(stopCh)
	crdInformerFactory.WaitForCacheSync(stopCh)

	d := &AntreaIPAM{controller: controller}
	result, err := d.SecondaryNetworkAllocate(&crdv1b1.PodOwner{
		Name:        "test-pod",
		Namespace:   "test-ns",
		ContainerID: "container-id",
		IFName:      "eth1",
	}, &argtypes.NetworkConfig{
		CNIVersion: testCNIVersion,
		IPAM: &argtypes.IPAMConfig{
			IPPools: []string{"multiv4-pool-a", "multiv4-pool-b"},
		},
	})
	require.NoError(t, err)
	require.Len(t, result.IPs, 1, "secondary IPAM must allocate at most one IP per address family")
	assert.Equal(t, "10.10.0.10", result.IPs[0].Address.IP.String())
}
