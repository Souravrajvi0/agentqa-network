//go:build integration

package reproductions

// Statement partial-recover test lives in run_statement_recover_test.sh because it
// must compile inside the volcano module (nested module replace cannot resolve volcano.sh/apis).