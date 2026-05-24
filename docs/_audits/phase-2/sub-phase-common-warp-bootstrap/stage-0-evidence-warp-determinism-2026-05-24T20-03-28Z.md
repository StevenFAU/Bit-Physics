---
date: 2026-05-24T20-03-28Z
author: common-warp-bootstrap-stage-0-agent
phase: 2
artifact: task
artifact_id: sub-phase-common-warp-bootstrap-stage-0-evidence-warp-determinism
subject: "Stage-0 Task 0.2 empirical-verification evidence — Warp 1.13.0 CPU-mode bit-determinism. EPHEMERAL verification kernel source (NOT committed to common/common-warp/; reproduced here for audit reference per dispatch SECTION 6) + 6-run sha256 evidence (3 pairs, identical seed+inputs, device=cpu): all six bit-identical -> 24d44c7e...0746f314. This is the W-2 baseline under D4 (bit-exact-same-hw on CPU single-device). Cited from Stage-0 checkpoint § 5."
head_sha: dd7106e71fb9d27343c5d758b4c1e289ce83871d
head_sha_at_checkpoint: 090ac940dec42c3c4821e8f35ec2358745e0cc5d
parent_audits:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/plan-drafting-landing-2026-05-24T18-47-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-checkpoint-2026-05-24T20-03-28Z.md
---

# Stage-0 Evidence — Warp 1.13.0 CPU-Mode Determinism (Task 0.2)

(FACT — empirical run on this runner, 2026-05-24. Ephemeral environment:
`uv venv /tmp/warp-probe --python 3.12` + `uv pip install 'warp-lang>=1.13,<2.0'
'numpy>=2.0'` → `warp-lang==1.13.0`, `numpy==2.4.6`, CPython 3.12.3, x86_64.
**No tracked-file edit** — Convention A: the verification install is ephemeral
and the kernel below is NOT committed to `common/common-warp/` per dispatch
SECTION 6; it is reproduced here for audit reference only.)

## § 1. Verification kernel source (ephemeral; reference-only)

The kernel exercises the three surfaces the dispatch Task 0.2(b) enumerates on
`device="cpu"`: pure-literal numerical constants (banked #7 / O-W2 f64-seed
surface), a scalar reduction via `wp.atomic_add` (atomic surface), and an
array-to-array write — plus a seeded per-thread RNG fill (`wp.rand_init` /
`wp.randf`) to exercise the seed mechanism the §1.9.1 `set_seed` wrapper will
thread.

```python
"""Stage-0 Task 0.2 — Warp CPU-mode determinism empirical verification.
EPHEMERAL verification scaffolding (NOT committed to common/common-warp/)."""
from __future__ import annotations
import hashlib
import numpy as np
import warp as wp

N = 4096
SEED = 42
wp.init()

@wp.kernel
def fill_seeded(seed: wp.int32, out: wp.array(dtype=wp.float64)):
    i = wp.tid()
    state = wp.rand_init(seed, i)
    out[i] = wp.float64(wp.randf(state))            # seeded RNG -> array write

@wp.kernel
def transform_reduce(inp: wp.array(dtype=wp.float64),
                     out: wp.array(dtype=wp.float64),
                     acc: wp.array(dtype=wp.float64)):
    i = wp.tid()
    # banked #7: pure-literal non-power-of-2 f64 constant (1.0/3.0) + 0.1
    v = inp[i] * (wp.float64(1.0) / wp.float64(3.0)) + wp.float64(0.1)
    out[i] = v                                       # array-to-array write
    wp.atomic_add(acc, 0, v)                         # scalar reduction (atomic)

def one_run() -> str:
    with wp.ScopedDevice("cpu"):
        seeded = wp.zeros(N, dtype=wp.float64)
        wp.launch(fill_seeded, dim=N, inputs=[wp.int32(SEED), seeded])
        out = wp.zeros(N, dtype=wp.float64)
        acc = wp.zeros(1, dtype=wp.float64)
        wp.launch(transform_reduce, dim=N, inputs=[seeded, out, acc])
        wp.synchronize()
        out_np = out.numpy().astype(np.float64)
        acc_np = acc.numpy().astype(np.float64)
    h = hashlib.sha256()
    h.update(out_np.tobytes())
    h.update(acc_np.tobytes())
    return h.hexdigest()

def main() -> None:
    hashes = [one_run() for _ in range(6)]
    ...
    # VERDICT: DETERMINISTIC iff len(set(hashes)) == 1
```

## § 2. Protocol

6 independent in-process runs (3 pairs), identical `SEED=42` + identical
inputs, `device="cpu"`, run under `python -W error` (so any compile-time or
runtime Python `Warning` would abort before the verdict — Task 0.3(b)
compile-time check folded in). sha256 over `(out.tobytes() || acc.tobytes())`
per run. Acceptance: all six sha256 identical (bit-exact-same-hw, D4).

## § 3. Raw 6-run result

```
run 1: 24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314
run 2: 24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314
run 3: 24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314
run 4: 24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314
run 5: 24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314
run 6: 24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314
unique_hashes=1
VERDICT: DETERMINISTIC (6/6 bit-identical) digest=24d44c7e...0746f314
```

**Output digest (all 6 runs):**
`24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314`

**6/6 bit-identical. CPU bit-exact-same-hw VERIFIED.** Hard Rule 2 (CPU
bit-determinism failure) NOT triggered — Stage 1a may proceed under the D4
posture. This digest is the empirical **W-2 baseline**.

## § 4. Atomic-ordering note (R-W1 / D4)

`wp.atomic_add` to a scalar accumulator is the surface where GPU atomics would
be non-deterministic (atomic update order varies by hardware/runtime — probe
§ 6 / R-W1). On the Warp **CPU** backend the kernel launch executes serially
over the launch dimension in a single thread (no cross-thread atomic-order
race), so the f64 reduction is order-deterministic and bit-identical run to
run — the Warp analog of Taichi `cpu_max_num_threads=1` / numba `parallel=False`.
This empirically grounds the D4 CPU single-device determinism path and the
`docs/common/warp.md` (Stage 1c) ban on atomic-dependent nondeterministic
kernels on GPU.

## § 5. Compile-time warning observation (feeds Task 0.3)

Running under `python -W error`, no Python `Warning` (SyntaxWarning /
DeprecationWarning) was raised at kernel decoration / compilation / launch —
the verdict printed and the process exited 0. A single `ResourceWarning`
(implicit cleanup of Warp's precompiled-header `TemporaryDirectory`
`/tmp/wp_pch_*`) fires in the interpreter-shutdown weakref finalizer
(`_exitfunc`) AFTER the verdict; it does not abort the run and (see Stage-0
checkpoint § 6) does not reach pytest's `filterwarnings` gate. The
"Warp CUDA warning: Could not find or load the NVIDIA CUDA driver" line is
Warp's own stdout logger output (not a Python `warnings.warn()`), expected on
a CPU-only runner.

---

*End of Stage-0 determinism evidence. Cited from Stage-0 checkpoint § 5.*
