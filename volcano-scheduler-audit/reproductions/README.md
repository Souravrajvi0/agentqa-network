# Reproductions

Run from this directory unless noted.

## VOL-DRF-001

```bash
python3 sim_drf_preempt.py
# Expected: buggy victims [], fixed victims [1]
```

## VOL-STMT-001 (known upstream #5362)

```bash
./run_statement_recover_test.sh
```

Requires Volcano checkout at `../../../volcano`. Script writes a temporary test under `pkg/scheduler/framework/` and deletes it on exit.

## VOL-CAP-001

```bash
bash capacity_gang_reclaim_nil_job_test.sh
```

Static excerpt showing missing nil guard vs legacy reclaim.

## VOL-RES-001

See `resource_scalar_nil_req_test.go` — run inside volcano module:

```bash
cd ../../../volcano/pkg/scheduler/api
go test -run TestAuditLessEqualScalarNil -count=1
```

(Add one-off test locally or use cited logic in `confirmed-bugs.md`.)