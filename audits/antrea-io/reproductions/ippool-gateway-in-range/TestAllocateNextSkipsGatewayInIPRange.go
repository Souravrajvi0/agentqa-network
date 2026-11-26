// Drop this function into pkg/ipam/poolallocator/allocator_test.go (same package).
// TestAllocateNextSkipsGatewayInIPRange records the IPPool contract from
// docs/antrea-ipam.md: when using a start/end range, both ends are allocatable
// except if an address in the range is the gateway. CIDR ranges already reserve
// the gateway via NewCIDRAllocator; start/end ranges do not.
func TestAllocateNextSkipsGatewayInIPRange(t *testing.T) {
	stopCh := make(chan struct{})
	defer close(stopCh)

	poolName := uuid.NewV4().String()
	ipRange := crdv1b1.IPRange{
		Start: "10.2.2.1",
		End:   "10.2.2.3",
	}
	subnetInfo := crdv1b1.SubnetInfo{
		Gateway:      "10.2.2.1",
		PrefixLength: 24,
	}
	pool := crdv1b1.IPPool{
		ObjectMeta: metav1.ObjectMeta{Name: poolName},
		Spec:       crdv1b1.IPPoolSpec{IPRanges: []crdv1b1.IPRange{ipRange}, SubnetInfo: subnetInfo},
	}

	allocator := newTestIPPoolAllocator(&pool, stopCh)
	require.NotNil(t, allocator)

	ip, _, err := allocator.AllocateNext(crdv1b1.IPAddressPhaseAllocated, fakePodOwner)
	require.NoError(t, err)
	assert.NotEqual(t, net.ParseIP("10.2.2.1"), ip, "gateway must not be allocated from an IP range")
	assert.Equal(t, net.ParseIP("10.2.2.2"), ip)
}
