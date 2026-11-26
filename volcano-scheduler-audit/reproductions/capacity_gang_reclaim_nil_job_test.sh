#!/usr/bin/env bash
# Demonstrates missing nil job guard in capacity UnifiedEvictableFn gang reclaim path.
set -euo pipefail
VOLCANO_ROOT="$(cd "$(dirname "$0")/../../../volcano" && pwd)"
grep -n 'for _, reclaimee := range candidates' "$VOLCANO_ROOT/pkg/scheduler/plugins/capacity/capacity.go" | head -3
echo "--- legacy reclaim (has nil guard) ---"
sed -n '488,496p' "$VOLCANO_ROOT/pkg/scheduler/plugins/capacity/capacity.go"
echo "--- gang reclaim path (no nil guard; panics on orphaned task) ---"
sed -n '628,635p' "$VOLCANO_ROOT/pkg/scheduler/plugins/capacity/capacity.go"