# Failing-tests evidence ledger

Per `docs/architecture.md` § 1.3 step 4 + Appendix G § G.7.5. At every
sim's failing-tests commit (per Convention-A), the agent:

1. Runs the test suite and pipes verbatim stdout+stderr to
   `tools/testkit/failing-tests-evidence/<sim>-<variant>-<UTC>.txt`.
2. Computes the SHA-256 of the file:
   `sha256sum tools/testkit/failing-tests-evidence/<sim>-<variant>-<UTC>.txt`.
3. Commits the test files AND the evidence file in a single commit. The
   commit message footer carries:

   ```
   Failing-tests-output: tools/testkit/failing-tests-evidence/<sim>-<variant>-<UTC>.txt
   Failing-tests-output-hash: sha256:<full-64-char-hex>
   ```

4. The implementation commit's footer references the failing-tests commit
   and witnesses the same hash:

   ```
   Implements-failing-tests-from: <failing-tests-commit-sha>
   Failing-tests-output-hash-witnessed: sha256:<same-hex>
   ```

Phase-closing audits use `tools/integrity/scripts/replay_failing_tests.py`
(Block 5) to re-run the test suite at the failing-tests commit and
confirm the recorded output hash matches.

Phase 0 Block 8 produces the first real entry (RD-2D).
