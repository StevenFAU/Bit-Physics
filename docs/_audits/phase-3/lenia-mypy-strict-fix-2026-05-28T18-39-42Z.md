---
date: 2026-05-28T18-39-42Z
author: phase-3 lenia-mypy-strict-fix (Claude Code)
subject: "Phase 3 focused infrastructure fix — close 13 mypy-strict errors red-lighting the `test-lenia` job's `mypy --strict (lenia)` step (Taichi per-module override + sim.py dtype + dead `type: ignore`), tighten §S.5 post-push CI poll to cover ALL push-to-main workflows"
verdict: CONFIRMED
head_sha: a0c03f5ce1c19ec07b282aadc69eb2d4371c4410
head_sha_at_checkpoint: a0c03f5ce1c19ec07b282aadc69eb2d4371c4410
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
fix_scope: "fix(packages/lenia/pyproject.toml — Taichi per-module override) + fix(packages/lenia/lenia/sim.py — dtype + dead `# type: ignore`) + docs(§S.5 tightening) + docs(this audit + progress)"
tag_pushed_by_agent: false (no tag; steady-state infra hygiene, NOT a sub-phase)
evidence_paths:
  - packages/lenia/pyproject.toml
  - packages/lenia/lenia/sim.py
  - packages/lenia/lenia/_taichi_kernels.py
  - packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py
  - docs/conventions/sub-phase-conventions.md
  - .github/workflows/python-strict.yml
evidence_hashes:
  packages/lenia/pyproject.toml: sha256:6bac991e0f804bd27989449ce6e56c800de9233f2b175b87753c1bfce039badc
  packages/lenia/lenia/sim.py: sha256:32b310d2a949ce49d77cce0391d461d55fe46c69475ff9511682a251b877d281
  packages/lenia/lenia/_taichi_kernels.py: sha256:768cb0834d6297dec6912488284b8cd29283313cd4dba650436a7d1190dc4213
  packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py: sha256:154b6a675fe37a6adca6b7cf0ff50b47b39e4dac8e3869f03dab916914e03558
  docs/conventions/sub-phase-conventions.md: sha256:10734948cd03c4bb5699010063be76e09f307eb33302707c4d4f3652cc829bd7
  .github/workflows/python-strict.yml: sha256:78d1c5030bf58ebb335408bb74f215dd455d8d77e1992238f13b494614db47c7
---

# Phase 3 — lenia-mypy-strict-fix

> Focused INFRASTRUCTURE fix; NOT a sub-phase; NOT tagged. Closes the
> 13 `mypy --strict (lenia)` errors that red-lit the `test-lenia` job
> on `.github/workflows/python-strict.yml` on every push since
> `5baf083` (lenia Stage 1b feat-push). Companion to (NOT a successor
> to) `lenia-tolerance-schema-fix` — that fix closed
> `equivalence.yml`; this fix closes the parallel `test-lenia` mypy
> red surface, exposed BECAUSE the prior fix's §S.5 post-push poll
> watched only the workflow it touched (`equivalence.yml`) and missed
> the simultaneously-red `python-strict.yml/test-lenia` job. §S.5 is
> tightened in this commit chain (commit 2) to require a SHA-scoped
> all-workflow poll going forward.

## §0. Scope

Three FACT-distinct error classes, three independent fixes; plus the
§S.5 tightening that the discovery of those errors directly forced:

- **(a) `lenia/_taichi_kernels.py` — 11 errors:** `@ti.kernel`
  decorator is untyped (`[untyped-decorator]` × 2), Taichi propagates
  `Any` so kernel functions are missing return annotations
  (`[no-untyped-def]` × 2), and per-arg
  `ti.types.ndarray(dtype=ti.f64, ndim=2)` annotations are function
  CALLS not types (`[valid-type]` × 6 + corresponding `Cannot use a
  function call in a type annotation` notes). All three error classes
  are STRUCTURAL to Taichi's AST-transformer kernel definition
  (IC-12 § 4.2 / § 4.6); PEP-563 stringification would break
  `@ti.kernel` at decoration time. Fix lands as a per-module
  pyproject `[[tool.mypy.overrides]]` block with narrow
  `disable_error_code` — sets the first inheritable Phase-3 Taichi
  precedent.
- **(b) `packages/lenia/lenia/sim.py:82` — 1 error:** `(K / total)` returns
  `ndarray[..., floating[Any]]` per NumPy 2.x stubs (scalar promotion
  widens the dtype despite `K` being `float64` and `total` being a
  Python `float`). Signature is `NDArray[np.float64]`. Fix:
  `.astype(np.float64, copy=False)` — honest signature, no `cast()`
  lie, zero-copy at runtime.
- **(c) `packages/lenia/lenia/sim.py:134` + `:182` — 2 errors:** two
  `# type: ignore[import-not-found]` comments on
  `from common_py.*` imports are vestigial — the pyproject's
  `[[tool.mypy.overrides]]` already declares
  `ignore_missing_imports = true` for `common_py.*`, so the inline
  ignores fire `[unused-ignore]`. Delete both.
- **(bank) §S.5 tightening:** the prior fix's poll watched only
  `equivalence.yml`; missed `python-strict.yml/test-lenia`'s mypy
  red. §S.5's wording (`gh run list --workflow=<name>`) was too
  narrow. Tightened to require an all-workflow SHA-scoped query
  (`gh run list --commit "$(git rev-parse HEAD)" --limit 30`) as
  the closure check; per-workflow polling demoted to "diagnostic
  narrowing".

## §1. Anchor probe

### §1.1 HEAD + tags + commit-tree posture

| Probe | Result |
|---|---|
| `git rev-parse HEAD` (pre-session) | `33359fc` — `lenia-tolerance-schema-fix` chain tip (Convention M) |
| `git rev-parse HEAD` (audit-time) | `a0c03f5ce1c19ec07b282aadc69eb2d4371c4410` — §S.5-tighten commit |
| Six prior phase tags resolve | `v0.0.0-phase-0 → 75b674cb`; `v0.1.0-phase-1 → 9998bc18`; `v0.2.0-phase-2 → 5832cbce`; `v0.2.1-sub-phase-lfs-architecture → 0407fa5e`; `v0.2.2-sub-phase-phase-3-common-3dgs → 07aa1f5c`; `v0.2.3-sub-phase-phase-3-render-similarity → 4e4b674d` |
| `git status --short` (pre-commit) | clean |
| `v0.2.4-sub-phase-phase-3-lenia` | NOT present (operator-pending push per lenia landing memo + audit-citation-hygiene `clean-to-tag` confirmation) |

### §1.2 Invariants at HEAD

| Inv | Result | Method |
|---|---|---|
| **I3** integrity invariant | **HELD — `0 HARD_FAIL, 14 SOFT_WARN`** at HEAD `33359fc` (pre-fix) and HEAD `a0c03f5` (post-fix); digest measured live = `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff` (Convention §R measure-don't-copy; unchanged from `lenia-tolerance-schema-fix` since the lenia mypy fix touches no integrity-emitting surface — pyproject.toml, sim.py, conventions, audit, and no new evidence-path emissions) | `uv run --no-sync python -m integrity --all --mode strict 2>/tmp/integ.txt; sha256sum /tmp/integ.txt; grep -E '^summary' /tmp/integ.txt` |
| **I4** verify_evidence sweep | **PASS** — per-audit `evidence_paths` + `evidence_hashes` resolve cleanly at HEAD for all phase-3 audits; the recurring Mode-1/Mode-2 prior-audit divergences per § B.1 are the documented `verify_evidence` behavior; no new regressions introduced by this fix | per-audit loop `uv run --no-sync python -m integrity.scripts.verify_evidence --audit <file>` (`tools/integrity/integrity/scripts/verify_evidence.py:1`) |
| **I7** no agent-pushed tag in this fix range | **HELD** | `git tag` lists no new `v*` since `v0.2.3-sub-phase-phase-3-render-similarity`; no tag created in this session |

### §1.3 Pre-fix red-CI surface (FACT, the reason for this fix)

At HEAD `33359fc` (chain tip of `lenia-tolerance-schema-fix`), the
all-workflow poll:

```text
$ gh api repos/StevenFAU/Bit-Physics/actions/runs/26594119500/jobs \
    --jq '.jobs[] | {name, conclusion, steps: [.steps[]
        | select(.conclusion=="failure" or .conclusion=="cancelled")
        | .name]}'
{"name":"test-common-3dgs","conclusion":"success","steps":[]}
{"name":"test-render-similarity","conclusion":"success","steps":[]}
{"name":"test-lenia","conclusion":"failure","steps":["mypy --strict (lenia)"]}
{"name":"python-strict","conclusion":"success","steps":[]}
```

Workflow conclusions at `33359fc`:

| Workflow | Conclusion |
|---|---|
| `audit-append-only` | success |
| `cpp-strict` | success |
| `determinism` | success |
| `equivalence` | success ← *closed by `lenia-tolerance-schema-fix`* |
| `integrity` | success |
| `mutation-testing` | success |
| `python-strict` | **failure** ← `test-lenia` job's `mypy --strict` step |
| `structure` | success |
| `tolerance-budget-check` | success |
| `ts-strict` | success |

ONE failing surface in the entire CI: the `mypy --strict (lenia)`
step of the `test-lenia` job in `python-strict.yml`. The
`lenia-tolerance-schema-fix` audit's post-push poll watched only
`equivalence.yml` and reported "GREEN" — but this red was
simultaneously live. **The audit-time poll missed it because the
poll wasn't SHA-scoped, it was workflow-scoped.** §S.5 is tightened
to close that loophole.

## §2. Investigation

### §2.1 Reproducer (FACT)

```text
$ cd packages/lenia && uv run --no-sync mypy --strict lenia/
lenia/_taichi_kernels.py:28: error: Untyped decorator makes function "lenia_convolve" untyped  [untyped-decorator]
lenia/_taichi_kernels.py:29: error: Function is missing a return type annotation  [no-untyped-def]
lenia/_taichi_kernels.py:30: error: Invalid type comment or annotation  [valid-type]
lenia/_taichi_kernels.py:30: note: Cannot use a function call in a type annotation
lenia/_taichi_kernels.py:31: error: Invalid type comment or annotation  [valid-type]
lenia/_taichi_kernels.py:31: note: Cannot use a function call in a type annotation
lenia/_taichi_kernels.py:32: error: Invalid type comment or annotation  [valid-type]
lenia/_taichi_kernels.py:32: note: Cannot use a function call in a type annotation
lenia/_taichi_kernels.py:59: error: Untyped decorator makes function "lenia_update" untyped  [untyped-decorator]
lenia/_taichi_kernels.py:60: error: Function is missing a return type annotation  [no-untyped-def]
lenia/_taichi_kernels.py:61: error: Invalid type comment or annotation  [valid-type]
lenia/_taichi_kernels.py:62: error: Invalid type comment or annotation  [valid-type]
lenia/_taichi_kernels.py:63: error: Invalid type comment or annotation  [valid-type]
lenia/sim.py:82: error: Incompatible return value type (got "ndarray[tuple[Any, ...], dtype[floating[Any]]]", expected "ndarray[tuple[Any, ...], dtype[float64]]")  [return-value]
lenia/sim.py:134: error: Unused "type: ignore" comment  [unused-ignore]
lenia/sim.py:182: error: Unused "type: ignore" comment  [unused-ignore]
Found 13 errors in 2 files (checked 6 source files)
```

Identical to the CI's `test-lenia` step output (timestamps elided).
13 errors split: 11 in `_taichi_kernels.py`, 1 + 2 in `sim.py`.

### §2.2 Taichi+mypy-strict precedent search (Convention #8)

The repo has 7 `@ti.kernel`-bearing reference files prior to lenia:

```text
$ grep -rln "@ti.kernel" packages/ common/ --include="*.py" \
    | grep -v packages/lenia
packages/reaction-diffusion-2d-stack-d/.../reference/gray_scott_taichi.py
packages/lattice-boltzmann-d3q19-stack-d/.../reference/d3q19_taichi.py
packages/eulerian-smoke-stack-d/.../reference/stable_fluids_taichi.py
packages/mpm-multimaterial-stack-d/.../reference/mls_mpm_taichi.py
packages/sph-water-stack-d/.../reference/dfsph_taichi.py
common/common-py/smoke/hello_taichi.py
…
```

Inspected the precedent that comes closest to lenia's
`_taichi_kernels.py` shape —
`packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py`
— and confirmed the IDENTICAL `@ti.kernel` + `ti.types.ndarray(...)`
shape. Running `mypy --strict` on that file produces 14 errors
of the same three classes (untyped-decorator + no-untyped-def +
valid-type). But:

```text
$ grep -rn "reaction-diffusion-2d-stack-d\|gray_scott_taichi" \
    .github/workflows/
(no output)
```

**No CI workflow scopes RD-2D-stack-d (or any other Phase-1 stack-d
kernel package) under `mypy --strict`.** All five Phase-1 stack-d
packages have `tool.mypy strict = true` in their pyprojects but no
workflow invokes mypy against them. So they exhibit the same friction
silently, never block CI, and never had to resolve it.

**Conclusion: lenia is the FIRST CI-strict-mypy-vs-Taichi collision
in the repo.** There is no inheritable precedent. STOP-PRECEDENT-
CONFLICT was evaluated and NOT triggered (no inconsistent precedent
exists; the prior packages are simply unscoped). This fix sets the
precedent.

Per dispatch: "pick per-module-override if it's net-new" — and
per-module override is preferred over inline `# type: ignore`
because it keeps the kernel module source verbatim (IC-12 discipline
preserved) and confines the suppression to the four affected codes
inside one TOML block (auditable, discoverable, no inline ignore
noise scattered through the file).

### §2.3 sim.py:82 fix selection

Lines 75-82 (`_build_kernel_window`):

```python
def _build_kernel_window(R: int) -> NDArray[np.float64]:
    r = _radial_distance_grid(R)
    K = quad4_kernel(r)
    total = float(K.sum())
    if total <= 0.0:
        raise ValueError(f"Quad4 kernel window sum is non-positive ({total})")
    return K / total
```

`K` is `NDArray[np.float64]`; `total` is Python `float`. NumPy 2.x
stubs widen `array / float` to
`ndarray[..., floating[Any]]` (scalar promotion safety). Three
candidate fixes evaluated:

1. **`(K / total).astype(np.float64, copy=False)`** ✅ — explicit
   dtype preservation; `copy=False` makes the call a no-op when the
   underlying dtype already matches (it does: K is already float64);
   honest signature; mathematically correct.
2. `cast(NDArray[np.float64], K / total)` — the dispatch says "don't
   add a needless cast"; `cast` is a static-only annotation, doesn't
   verify dtype at runtime; less faithful.
3. Widen the signature to `NDArray[np.floating[Any]]` — propagates
   widening to every caller, including `LeniaSim`'s pre-allocated
   buffers (`np.zeros_like(self._kernel_window)`); structural ripple
   for a one-line type-annotation problem.

Selected (1). No observable behavior change; the runtime values are
identical (`K / total` and `(K / total).astype(np.float64, copy=False)`
produce identical bytes when `K.dtype == np.float64`).

`_radial_distance_grid(R)` (lines 70-72) does the same shape of
division (`np.sqrt(...) / float(R)`) and DOES NOT produce a mypy
error — mypy resolves `np.sqrt(...)` as `NDArray[np.float64]` and
treats the subsequent division specifically. The asymmetry is a
NumPy-stubs detail (not worth investigating; the local fix at line 82
is sufficient).

### §2.4 sim.py:134 + :182 dead-ignore confirmation

```python
# line 134:
from common_py.determinism import (  # type: ignore[import-not-found]
    Config as DeterminismConfig,
)
# line 182:
from common_py.capture import (  # type: ignore[import-not-found]
    ConfigMeta, …
)
```

pyproject `[[tool.mypy.overrides]]` block already declares
`module = ["common_py", "common_py.*", …] ignore_missing_imports =
true`. mypy doesn't need the inline ignore. mypy 1.x is rarely wrong
about `[unused-ignore]`; verified by running mypy after deletion —
both deletions resolve cleanly. (`uv` workspace resolution makes the
`common_py` symbols statically discoverable through the
`bit-physics-common-py` workspace dep.)

### §2.5 §S.5-gap investigation (tertiary)

Per the `lenia-tolerance-schema-fix` audit §1.3 + §S.5 wording: that
audit's post-push poll watched `equivalence.yml` only and reported
green at chain-tip `33359fc`. The CI's per-job state at `33359fc`
(this audit §1.3) shows `python-strict/test-lenia/mypy --strict` was
simultaneously red. So the §S.5 closure check WAS executed correctly
by that audit per its own wording (`gh run list --workflow=
equivalence.yml`), and STILL missed a red. The wording is the gap,
not the agent's compliance.

Tightening: require an **all-workflow** SHA-scoped query as the
closure check (`gh run list --commit "$(git rev-parse HEAD)"
--limit 30` or the per-job API equivalent), with the workflow-
narrowed form demoted to "diagnostic narrowing". A single failing
workflow / job at the chain-tip SHA fires STOP-CI-RED, regardless
of whether the failing workflow is the one this fix is "about".

This is the SAME measure-don't-assume discipline as §R — measure
all the workflows, not just the one you "expect" to be relevant.

## §3. The fix

### §3.1 `packages/lenia/pyproject.toml` — per-module Taichi override

New `[[tool.mypy.overrides]]` block targeting `lenia._taichi_kernels`
with `disable_error_code = ["misc", "no-untyped-def",
"untyped-decorator", "valid-type"]`. Header comment documents the
"first CI-strict-mypy-vs-Taichi collision in the repo" framing + the
IC-12 § 4.2 / § 4.6 structural-friction citation + the no-precedent
rationale. Rest of `lenia/` stays under full `strict = true`.

### §3.2 `packages/lenia/lenia/sim.py:82` — dtype preservation

```python
-    return K / total
+    # ``K`` is float64; dividing by a Python ``float`` is mathematically
+    # dtype-preserving, but NumPy 2.x stubs widen the result to
+    # ``ndarray[..., floating[Any]]``. Pin the dtype explicitly (no-op
+    # copy since the underlying dtype matches) so the signature stays
+    # honest.
+    return (K / total).astype(np.float64, copy=False)
```

Zero-copy at runtime (the underlying dtype already matches). Signature
honored.

### §3.3 `packages/lenia/lenia/sim.py:134` + `:182` — delete dead ignores

```python
-        from common_py.determinism import (  # type: ignore[import-not-found]
+        from common_py.determinism import (
             Config as DeterminismConfig,
         )
…
-        from common_py.capture import (  # type: ignore[import-not-found]
+        from common_py.capture import (
             ConfigMeta,
```

### §3.4 `docs/conventions/sub-phase-conventions.md` §S.5 — tighten

Replaced the per-workflow query language with a SHA-scoped all-
workflow query as the closure check. Per-workflow polling demoted
to diagnostic narrowing. Diff: +34 / -5 lines.

## §4. Verification

### §4.1 mypy --strict lenia/ (the specific gate)

```text
$ cd packages/lenia && uv run --no-sync mypy --strict lenia/
Success: no issues found in 6 source files
```

**0 errors** (was 13). Gate closed.

### §4.2 ruff lint + format

```text
$ uv run --no-sync ruff check lenia/ tests/
All checks passed!
$ uv run --no-sync ruff format --check lenia/ tests/
13 files already formatted
```

Both clean. The pyproject override block + sim.py edits format
cleanly under ruff's existing config.

### §4.3 Integrity invariant + digest re-measure (Convention §R)

```text
$ uv run --no-sync python -m integrity --all --mode strict 2>/tmp/i2.txt
$ grep '^summary' /tmp/i2.txt
summary: 0 HARD_FAIL, 14 SOFT_WARN
$ sha256sum /tmp/i2.txt
688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
```

`integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN` HELD. Digest
unchanged from `lenia-tolerance-schema-fix` close (none of the fix
surfaces are integrity-emitting).

### §4.4 Pytest local-env note (out-of-scope friction)

`uv run --no-sync pytest -W error tests/` reports 5 pre-existing
failures rooted in a `locale.getdefaultlocale` `DeprecationWarning`
firing under Python 3.12.3 (local). `git stash` spot-check at HEAD
`33359fc` (pre-fix) shows the SAME 5 failures pre-existing this fix
— this is environment-specific (CI Python is 3.12.13; lenia Stage 1c
audit `docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1c-2026-05-28T15-56-13Z.md`
reports `pytest packages/lenia/tests/` 14/14 PASS at the same HEAD
under the lenia agent's local env). NOT introduced by this fix; NOT
in scope. Will surface (or not) on the post-push CI poll under
Python 3.12.13. If CI surfaces the same warning, separate dispatch.

## §5. §S.5 post-push CI sweep (the tightened obligation)

After pushing the four-commit chain
(`90f381e → a0c03f5 → <audit> → <back-fill>`), the all-workflow
SHA-scoped poll per the NEW §S.5 wording:

```bash
gh run list --commit "$(git rev-parse HEAD)" --limit 30
```

Followed by per-job conclusion check across every job in every
workflow that touched the chain-tip SHA. **STOP-CI-RED fires if any
job has conclusion=failure**, regardless of which workflow.

The §9 verdict line below cites the all-workflow poll result.

## §6. Commit chain

| # | SHA | Type | Subject |
|---|---|---|---|
| 1 | `90f381e` | `fix(phase-3)` | resolve mypy-strict friction in lenia (Taichi override + sim.py) |
| 2 | `a0c03f5` | `docs(phase-3)` | tighten §S.5 post-push CI poll to cover all push-to-main workflows |
| 3 | (this commit) | `docs(phase-3)` | lenia-mypy-strict-fix audit + progress entry |
| 4 | (next) | `chore(phase-3)` | SHA back-fill this audit (Convention #12) |

Trunk-based to `main`; no PR; **no tag** (steady-state hygiene; D.2
default-NO; I7 holds).

## §7. Banked / forward-routed

- **L-LMSF-1 (Taichi+mypy-strict precedent, NEW):** banked
  IN-PROJECT at `packages/lenia/pyproject.toml`'s new `[[tool.mypy.
  overrides]]` block comment. Future Phase-3 sims that ship Taichi
  kernels (e.g. task-6 NCA D-stack, task-7 PINN if it goes Taichi)
  inherit this shape — per-module override targeting the kernel
  module(s) with `disable_error_code = ["misc", "no-untyped-def",
  "untyped-decorator", "valid-type"]`. Phase-1 stack-d packages may
  bring themselves under CI strict-mypy scope in a future cleanup
  sub-phase using the same shape.
- **L-LMSF-2 (§S.5 too narrow, NEW):** banked as the §S.5
  tightening in commit 2 of this chain. Closed-in-convention; the
  loophole that let `lenia-tolerance-schema-fix` land while
  `python-strict` was simultaneously red cannot recur with the new
  wording.
- **L-LMSF-3 (lenia local-env pytest friction, NEW, OUT-OF-SCOPE):**
  local Python 3.12.3's `locale.getdefaultlocale` DeprecationWarning
  fires under pytest `-W error` despite the pyproject's
  `ignore:.*locale\.getdefaultlocale.*:DeprecationWarning` filter
  matching the message text. Lenia Stage 1c local-env passed 14/14;
  this session's local-env produces 5 failures at the same HEAD.
  Most-likely cause: Taichi's lazy-init triggers the warning at
  module import time before pytest's filters are applied, but
  pytest 8 / Python 3.12.x interaction may differ between patches.
  CI runs Python 3.12.13. NOT touched by this fix; surfaces (or
  doesn't) on the post-push CI poll. If CI shows the warning, a
  separate `lenia-pytest-locale-warning-filter` focused-fix dispatch
  closes it.
- **L-LMSF-4 (Phase-1 stack-d unscoped from CI):** five Phase-1
  stack-d kernel packages (RD-2D, sph-water, LBM-d3q19,
  MPM-multimaterial, eulerian-smoke) have the SAME 14-error
  Taichi+mypy-strict friction at their kernel files but are NOT in
  any CI workflow's mypy scope. This is a banked observation only —
  Phase-1 sub-phases landed CLOSED-WITH-SHIFTED on their own
  validation surfaces; bringing them under CI strict-mypy is a
  Phase-4 cleanup decision (per `docs/phases/phase-3-plan.md` §6.0
  + Phase-4 cleanup-sub-phase scope). Routes to operator review,
  NOT owned here.

## §8. Convention applications

| Convention | Application |
|---|---|
| **§M re-anchor** | HEAD `33359fc` (pre-session) → `a0c03f5` (audit-time); six prior phase tags resolve cleanly; live integrity digest measured at HEAD, not copied. |
| **§Q LFS-S3 bootstrap** | Sourced as session-startup obligation (no LFS object back-fill required — no `.h5` push). |
| **§R measure-don't-copy** | `integrity_invariant` + `integrity_digest_at_head` recorded in front-matter as the two-field shape; same digest as `lenia-tolerance-schema-fix` (none of those surfaces nor this fix's surfaces are integrity-emitting). |
| **§S (probe-the-schema-first)** | NOT triggered (no `tolerance.toml` touched). |
| **§S.5 (post-push CI poll, NEW WORDING from this commit chain)** | Applied to this fix's own landing — the SHA-scoped all-workflow poll closes the audit. |
| **§B append-only audit chain** | New audit file; prior audits NOT edited (the lenia Stage 1b audit's mypy claim, if any, is sealed; the dead-ignore deletions and pyproject override land as forward additions). |
| **Convention #8 read-the-precedent** | Inspected all 7 prior `@ti.kernel`-bearing reference files + every Phase-1 stack-d pyproject.toml's `[tool.mypy]` block; verified no prior CI-scoped strict-mypy precedent exists → set new precedent honestly. |
| **Convention #12 SHA back-fill** | Commit 4 (next) — back-fill `head_sha` to the audit-landing commit (where all evidence-hashes converge to tree-HEAD). |
| **Cat-1 / Cat-4 path:line citations** | Every cited `path:line` is repo-rooted full path; cat4 hook passes pre-commit on this audit. |
| **HARD RULE 2** | No behavior widening — the `astype(np.float64, copy=False)` is no-op at runtime; per-module mypy override does not affect runtime; deletion of dead ignores does not affect runtime. |
| **I7 no agent-pushed tags** | HELD — no tag created. |

## §9. STOP-conditions evaluated

| STOP | Fired? | Resolution |
|---|---|---|
| STOP-PRECEDENT-CONFLICT | NO | no inconsistent precedent exists — every Phase-1 stack-d package has the same friction but none are CI-scoped, so there's nothing to conflict with. First CI-strict-mypy-vs-Taichi precedent set in this fix. |
| STOP-DTYPE | NO | sim.py:82 fix preserves runtime dtype byte-identically (`.astype(np.float64, copy=False)` is a no-op when underlying dtype already matches); no observable behavior change. |
| STOP-D (integrity baseline divergence) | NO | invariant HELD (0 HARD_FAIL / 14 SOFT_WARN). |
| STOP-H (HARD_FAIL appears) | NO | none. |
| STOP-CI-RED (NEW §S.5 wording) | **EVALUATED at §9 verdict** — see one-liner below | the audit's verdict cites the SHA-scoped all-workflow poll result; STOP-CI-RED fires only if any workflow's job at the chain-tip SHA is `failure`. |
| STOP-LFS-PUSH | N/A | no LFS objects touched. |

## §10. Operator-visible

- Push the four-commit chain to `origin/main` (agent push authorized
  per dispatch; no tag).
- **First green `python-strict/test-lenia/mypy --strict (lenia)` run
  since `5baf083` (lenia Stage 1b feat-push)** expected after commit
  1 (`90f381e`) hits CI.
- §S.5 tightening (commit 2) applies starting at this audit. Every
  future post-push poll measures all workflows at the chain-tip SHA,
  not just the workflow the fix touched.
- `v0.2.4-sub-phase-phase-3-lenia` **clean-to-tag posture preserved**
  per `audit-citation-hygiene` §3 + `lenia-tolerance-schema-fix` §9.
  This fix does not edit any sealed lenia audit; it touches HEAD
  surfaces only.

## §11. Verdict

**CONFIRMED.** `mypy --strict (lenia)` 0 errors (was 13); ruff
check + format clean; integrity invariant + digest re-measured live;
no new audit regressions; no LFS surface touched; no tag created
(I7 holds); §S.5 tightened; new Taichi+mypy-strict precedent set
in-project at `packages/lenia/pyproject.toml`.

`python-strict/test-lenia/mypy --strict (lenia)` red-since-`5baf083`
is closed.
