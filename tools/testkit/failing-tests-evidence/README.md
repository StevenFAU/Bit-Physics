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

## Re-captured evidence — the landing audit is the authoritative anchor (N-2)

If RED evidence is **re-captured after** the original failing-tests commit (e.g.
a gate-13 format fix that changes the evidence body — L-PINN-1, 3dgs-mpm
`ad09c51`, pinn-poisson re-capture), the original commit's `Failing-tests-output-hash:`
footer is now SUPERSEDED and **cannot be amended** (git history is immutable).
The N-2 back-test finding flagged this gap. The durable rule:

- The sub-phase **landing audit** MUST anchor the CURRENT evidence body — either
  a `failing_tests_output_hash:` front-matter field (see
  `docs/_audits/phase-3/task-7-pinn-poisson.md`) or an `evidence_hashes:` entry
  for the `.txt` file (see `docs/_audits/phase-3/task-8-3dgs-mpm.md`). That pin
  is verified by `python -m integrity.scripts.verify_evidence --audit <landing>`,
  which is the authoritative witness once the historical commit footer is stale.
- A re-capture commit SHOULD still carry a fresh `Failing-tests-output-hash:`
  footer matching the new body, but where it didn't, the landing-audit pin
  governs. Both Phase-3 task-7/8 audits anchor the live shas (`49c865ad`,
  `6053e228`) — verified at HEAD.

Phase 0 Block 8 produces the first real entry (RD-2D).
