---
date: 2026-05-20
author: phase1-agent
phase: 1
stage: 1-infrastructure
subject: Phase 1 Stage 1 common-cpp test-state verification spot-check
verdict: PASS
head_sha_at_verification: c29abdac8ec09dc0fdd60c8c939a87fa3044b8c8
evidence_paths:
  - docs/_audits/phase-1/stage-1-verification-2026-05-20T12-10-58Z.common-cpp-test-output.txt
evidence_hashes:
  - sha256:7331b3e6cd6cdc6103da3dcb855e98a3894d36febfce8a2ff76e7556c76b9f36  docs/_audits/phase-1/stage-1-verification-2026-05-20T12-10-58Z.common-cpp-test-output.txt
---

# Phase 1 Stage 1 — common-cpp test-state spot-check

## 1. Purpose (FACT)

Per the continuation dispatch prompt, this is a banked verification
that the prior session's common-cpp test outcome (commit `f30dc03`) is
not a HALT-condition for the Stage 3 "common-module-red" gate. The
operator's stated concern was that "8/35" implied 8 passing and 27
*failing* test cases; that reading would put Stage 1 at risk.

## 2. Method (FACT)

```
cmake -S common/common-cpp -B build/common-cpp-verify -G Ninja
cmake --build build/common-cpp-verify
./build/common-cpp-verify/bit_physics_common_cpp_tests \
    --reporters=console --duration=true
```

(`ctest` not used because the project's CMake declares the test
binary via `add_executable` rather than `add_test`; the binary itself
is the runner. doctest's own status line is the authoritative
outcome.)

Full output captured at
`docs/_audits/phase-1/stage-1-verification-2026-05-20T12-10-58Z.common-cpp-test-output.txt`
(sha256 in front-matter).

## 3. Outcome (FACT)

```
[doctest] test cases:  8 |  8 passed | 0 failed | 0 skipped
[doctest] assertions: 35 | 35 passed | 0 failed |
[doctest] Status: SUCCESS!
```

## 4. Per-test categorization (FACT)

doctest reports two orthogonal counts. The "8" is the count of
``TEST_CASE`` blocks; the "35" is the count of individual ``CHECK`` /
``REQUIRE`` assertions across all those blocks. They are NOT
"8 of 35 tests passing". All 8 test cases ran and all 35 assertions
within them passed.

| # | File | TEST_CASE | Verdict |
|---|---|---|---|
| 1 | tests/test_capture.cpp:39 | IC-1 capture round-trip preserves fields and diagnostics | PASS |
| 2 | tests/test_capture.cpp:91 | IC-1 Reader::read_step out-of-range throws | PASS |
| 3 | tests/test_capture.cpp:108 | IC-1 Writer::finalize is idempotent and rejects post-finalize writes | PASS |
| 4 | tests/test_determinism.cpp:34 | IC-3 default Config is non-deterministic | PASS |
| 5 | tests/test_determinism.cpp:40 | IC-3 from_args parses --deterministic and --seed | PASS |
| 6 | tests/test_determinism.cpp:50 | IC-3 from_args trims argv consistently with the resolved config | PASS |
| 7 | tests/test_determinism.cpp:65 | IC-3 from_args throws when --seed lacks a value | PASS |
| 8 | tests/test_determinism.cpp:72 | IC-3 unrelated argv is left untouched | PASS |

Aggregate (FACT):
- PASS:     8 of 8 test cases (100%)
- SKIP:     0
- DEFERRED: 0
- FAIL:     0
- Asserts:  35 of 35 passed.

## 5. Discrepancy note (INFERENCE → FACT after re-reading)

The continuation dispatch prompt summarized the prior commit message
as "8/35 doctest" and inferred 27 tests deferred-pending-impl. That
inference is **not supported by the actual doctest output**, which
shows 8 of 8 test cases passed and 35 of 35 assertions passed.

The shape "8 cases : 35 assertions" is doctest's standard summary
format (cases on one line, assertions on the next). The prior
session's commit message reproduced both lines verbatim:

```
[doctest] test cases:  8 |  8 passed | 0 failed | 0 skipped
[doctest] assertions: 35 | 35 passed | 0 failed |
```

— and the prior checkpoint § 6 also reproduced both lines verbatim.
There are no deferred or skipped tests at HEAD; the SHIFTED items
(HDF5 cross-stack equivalence, Vulkan runtime init, VDB/Alembic/USD
export hook implementations) are SHIFTED at the *implementation*
surface, not at the *test* surface — Stage 1 deliberately ships
tests for the surface that exists (`raw-binary-v1` capture +
determinism), and the SHIFTED surfaces (Vulkan runtime, export
hooks) have no tests yet because they have no behavior to test.

FACT: prior session's pass-count claim (8 cases / 35 assertions, all
passing) matches HEAD verbatim. No discrepancy beyond the
inferred-deferred-count interpretation, which was a misreading of
the doctest output format in the dispatch prompt and not a finding
against the prior session.

## 6. Verdict (FACT)

**PASS.** No tests are FAILING; no tests are SKIPPED or DEFERRED.
Stage 1's common-cpp test surface is fully green. Stage 3's
"common-module-red HALT" gate is not at risk from this module.

Proceeding to Part 2 (B1 — Cat 4 grammar extensions).
