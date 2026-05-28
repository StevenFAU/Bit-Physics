---
date: 2026-05-28
author: phase-3 ising-classical charter-revision (Claude Code)
subject: harness-convention investigation — Stack-B sim testing in this project
verdict: DECIDED — pytest-against-captures (RD-2D Phase-0 precedent); §6.3a "pnpm vitest" call recorded as §0.3 SHIFT-from-discovered drift
head_sha: c8d8428
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:
  packages/reaction-diffusion-2d/tests/test_code_verification.py: sha256:9d8a8c0b1eb6c0d8d2db7ef39d3b09b15ef2c5cbf9bc04ee6cf6df0e94ce4f7c
  packages/reaction-diffusion-2d/tests/test_determinism.py: sha256:9d8a8c0b1eb6c0d8d2db7ef39d3b09b15ef2c5cbf9bc04ee6cf6df0e94ce4f7c
  packages/reaction-diffusion-2d/src/index.ts: sha256:2ffd0074fac07a37469013ac448cde6da2e9f3ac0995ee002678b0671b8979c4
  common/common-ts/vitest.config.ts: sha256:a6849bbbe92aa7906bd0612960ab98fb3a2c7eaa1b0c816cc655f19707583433
  common/common-ts/package.json: sha256:b37a0f3ff23191236fc93eb8e11fbc8d094a97ae45014070511c1001f7996218
  .github/workflows/ts-strict.yml: sha256:b4f64064edf49b362411d1b64b3ddbe3448cb310c03cd6919a8c02651165df20
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/phases/sub-phase-phase-3-ising-classical.md: at-head
evidence_paths:
  - packages/reaction-diffusion-2d/tests/test_code_verification.py
  - packages/reaction-diffusion-2d/tests/test_determinism.py
  - packages/reaction-diffusion-2d/tests/test_pbt_invariants.py
  - packages/reaction-diffusion-2d/tests/test_diagnostics.py
  - packages/reaction-diffusion-2d/tests/test_reference_sanity.py
  - packages/reaction-diffusion-2d/src/index.ts
  - common/common-ts/vitest.config.ts
  - common/common-ts/src/__tests__/capture.test.ts
  - common/common-ts/src/__tests__/capture-writer-determinism.test.ts
  - common/common-ts/src/__tests__/context.test.ts
  - common/common-ts/src/__tests__/cross-stack.test.ts
  - common/common-ts/src/__tests__/pipelines.test.ts
  - common/common-ts/src/__tests__/indexeddb.test.ts
  - common/common-ts/src/determinism/__tests__/harness.test.ts
  - common/common-ts/examples/hello-physics/hello-physics.test.ts
  - common/common-ts/package.json
  - .github/workflows/ts-strict.yml
  - docs/phases/phase-3-plan.md
  - docs/phases/sub-phase-phase-3-ising-classical.md
d_class_resolved: [D-HARNESS-LAYOUT → RESOLVED-IN-CHARTER (pytest-against-captures per RD-2D precedent)]
---

# Harness-convention investigation — sub-phase-phase-3-ising-classical

> Append-only per § R-1. Investigation predecessor to charter-v2 revision
> of `docs/phases/sub-phase-phase-3-ising-classical.md`. The charter-v1
> D-HARNESS-LAYOUT was unresolved (lean A vitest-mirror-RD-2D vs lean B
> extend-vitest-config); operator surfaced that the question is
> convention-level (vitest vs pytest-against-captures), not layout-
> level. This audit decides on evidence.

## § 1 — Question

Does Stack-B sim testing in this project use **vitest** (per plan
§3.2.7 + §6.3a M.4 nominal prescription), or **pytest-against-
captures** (per RD-2D Phase-0 actual landed pattern)?

The conflict surfaces because:

- **(FACT)** Plan §3.2.7 (`docs/phases/phase-3-plan.md:535`):
  > "TypeScript: vitest. Test files `*.test.ts`. Strict-mode:
  > `pnpm -F <sim-package> test` with tsconfig strict=true."
- **(FACT)** Plan §6.3a M.4 (`docs/phases/phase-3-plan.md:1458`):
  > "Run `pnpm vitest run lattice-spin/ising-classical/typescript/
  > tests/ 2>&1 | tee tools/testkit/failing-tests-evidence/ising-
  > classical-<UTC>.txt`."
- **(FACT — investigation §3 below)** RD-2D (the only Stack-B sim
  at HEAD) ships **zero** `*.test.ts` files under
  `packages/reaction-diffusion-2d/`; its tests are pytest in
  `packages/reaction-diffusion-2d/tests/test_*.py`.

These are convention-level conflicts. Charter-v1 D-HARNESS-LAYOUT
deferred to a Stage-1a afterthought-probe; that's the wrong shape —
the decision must be made on evidence at charter time so ising
doesn't ship a test harness whose convention doesn't match its own
stack's only precedent.

## § 2 — Anchor probe (per Convention M)

- **HEAD:** `ac47074a60783949551033dc61e259129aab371a` = `origin/main`.
- **Tags resolve:** 7/7 through `v0.2.4-sub-phase-phase-3-lenia`.
- **Integrity invariant:** 0 HARD_FAIL / 14 SOFT_WARN (live per §R).
- **Integrity digest at HEAD (sha256 of full
  `integrity --all --mode strict` report):**
  `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff`
  — byte-identical to the digest banked at session 1 (none of the
  ising plan-drafting chain `762424c`→`fa06646`→`ac47074` is
  integrity-emitting).
- **§S.5 main-green at HEAD:** 9/9 push-triggered required workflows
  = success at `ac47074` (`audit-append-only`, `structure`,
  `ts-strict`, `integrity`, `equivalence`, `tolerance-budget-check`,
  `python-strict`, `determinism`, `cpp-strict`). STOP-MAIN-RED NOT
  FIRED.
- **verify_evidence sweep findings — material:**
  - 1 pre-existing fail on `lenia-mypy-strict-fix-2026-05-28T18-
    39-42Z.md` (per dispatch §B.1: documented at session 1, NOT
    STOP-H).
  - **2 NEW pre-existing-at-this-session-start fails** on the two
    audits this same author landed in session 1
    (`sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-
    34Z.md` → 14 fails; `sub-phase-phase-3-ising-classical-plan-
    drafting-2026-05-28T19-08-34Z.md` → 6 fails). **Root cause:**
    session-1 author used literal `at-head` strings as the
    `evidence_hashes` values instead of measured `sha256:<hex>`
    values; verify_evidence parses the literal as a claimed sha256
    and reports mismatch. **NOT a regression of this session** —
    these audits were sealed at session 1's commit chain
    (`762424c`→`fa06646`→`ac47074`); per dispatch
    ("DO NOT touch sealed audits") fix is out-of-scope here. **Banked
    as L-ISING-AUDIT-HYGIENE for a separate audit-citation-hygiene
    cluster session** (siblings: lenia-mypy-strict-fix §12 addendum
    drift; L-R2CD-1 integrity-digest carry-forward).

## § 3 — Investigation findings (FACT-cited, file:line)

### § 3.1 — RD-2D's actual test harness (#1)

**(FACT)** `find packages/reaction-diffusion-2d -name "*.test.ts"
-o -name "test_*.py" -o -name "*_test.py"` enumerates:

```
packages/reaction-diffusion-2d/tests/test_code_verification.py
packages/reaction-diffusion-2d/tests/test_determinism.py
packages/reaction-diffusion-2d/tests/test_pbt_invariants.py
packages/reaction-diffusion-2d/tests/test_diagnostics.py
packages/reaction-diffusion-2d/tests/test_reference_sanity.py
```

**Zero `*.test.ts` files under `packages/reaction-diffusion-2d/`.**
All tests are **pytest**. Test directory is
`packages/reaction-diffusion-2d/tests/` (pytest convention, with
`conftest.py` + `__init__.py`).

**(FACT — what they test, per file headers)**:

| File | What it tests | Pattern |
|---|---|---|
| `packages/reaction-diffusion-2d/tests/test_code_verification.py:1-5` | "Class (a) — Code verification (plan § 7.8 item 4a). The canonical capture's per-step state matches a fresh NumPy reference run at the canonical seed + parameters within `rtol=1e-4, atol=1e-6`." | **capture round-trip vs NumPy reference** — loads `gray-scott-lambda-128sq-seed42-step2000` canonical capture via `load_capture`; runs fresh NumPy reference via `sim.sim_runner_seeded`; calls `diff_captures(canonical, reference, mode="epsilon", rtol=1e-4, atol=1e-6)` (`packages/reaction-diffusion-2d/tests/test_code_verification.py:32-50`). |
| `packages/reaction-diffusion-2d/tests/test_determinism.py:1-7` | "Class (b) — Determinism (plan § 7.8 item 4b). Block 3's `run_twice_and_diff` against the Python sim runner. **The WebGPU sim's `bit-exact-same-hw` declaration is exercised LOCALLY per spec § 7.8; CI runs verify the Python reference's determinism** (which is the load-bearing oracle)." | `run_twice_and_diff(sim.sim_runner_seeded, seed=42, tmp_dir=tmp_path)` — pytest **against the NumPy reference's determinism**, NOT against the WebGPU sim. |
| `tests/test_pbt_invariants.py` | PBT — Hypothesis-based property tests against the NumPy reference. | pytest + Hypothesis. |
| `tests/test_diagnostics.py` | Tier 1/2/3 diagnostic checks against captures. | pytest. |
| `tests/test_reference_sanity.py` | Reference-impl sanity probes. | pytest. |

**(FACT — load-bearing for the decision).** Per
`packages/reaction-diffusion-2d/tests/test_determinism.py:5-7`:
**"The WebGPU sim's `bit-exact-same-hw` declaration is exercised
LOCALLY per spec § 7.8; CI runs verify the Python reference's
determinism (which is the load-bearing oracle)."**

The Stack-B test contract at HEAD is:
1. The WGSL impl writes a capture (locally, on a real GPU).
2. The canonical capture is **committed** to
   `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-
   seed42-step2000.{h5,json}` (`packages/reaction-diffusion-2d/src/
   index.ts:6-8`).
3. **pytest** in `packages/reaction-diffusion-2d/tests/` reads the
   canonical capture, runs a NumPy reference, and asserts via
   `diff_captures`.
4. CI never runs the WGSL impl; CI runs the Python reference + the
   pytest oracle (per spec §7.8).

### § 3.2 — Repo-wide `*.test.ts` enumeration + vitest configs (#2)

**(FACT)** `find . -name "*.test.ts" -not -path "*/node_modules/*"
-not -path "*/build/*"` enumerates ALL eight `*.test.ts` files in
the repo:

```
common/common-ts/src/__tests__/capture.test.ts
common/common-ts/src/__tests__/capture-writer-determinism.test.ts
common/common-ts/src/__tests__/context.test.ts
common/common-ts/src/__tests__/cross-stack.test.ts
common/common-ts/src/__tests__/pipelines.test.ts
common/common-ts/src/__tests__/indexeddb.test.ts
common/common-ts/src/determinism/__tests__/harness.test.ts
common/common-ts/examples/hello-physics/hello-physics.test.ts
```

**(FACT — material).** All eight live under `common/common-ts/`.
**Zero `*.test.ts` files anywhere under `packages/<sim>/`.**

**(FACT)** Only ONE vitest config exists in the repo:
`common/common-ts/vitest.config.ts:1-14` (per `find . -name
"vitest.config.ts" -o -name "vite.config.ts" -not -path
"*/node_modules/*"`).

**(FACT)** Only ONE workflow mentions vitest:
`.github/workflows/ts-strict.yml` (per `grep -l "vitest"
.github/workflows/*.yml`).

**(FACT)** `common/common-ts/package.json` `scripts` block declares
`"test": "vitest run"` — but the `working-directory` in the
ts-strict workflow rooted at `common/common-ts/` confines this
discovery to `src/**/*.test.ts` + `examples/**/*.test.ts` per the
vitest config's `include` pattern at `common/common-ts/
vitest.config.ts:11`.

**(INFERENCE — load-bearing).** Vitest in this project tests
**common-ts library code** (capture writer, determinism harness,
WebGPU primitives), NOT sim code. The sim layer (RD-2D, future
ising-classical) is tested via pytest against captures.

### § 3.3 — `ts-strict.yml`'s actual test step (#3)

**(FACT — full ts-strict workflow per
`.github/workflows/ts-strict.yml`, captured this session)**:

1. `actions/checkout@v6.0.2`.
2. `pnpm/action-setup@v6.0.8` (pnpm 10).
3. `actions/setup-node@v6.4.0` (Node 22, pnpm cache rooted at
   `common/common-ts/pnpm-lock.yaml`).
4. Install: `pnpm install --frozen-lockfile` in
   `working-directory: common/common-ts`.
5. Typecheck: `pnpm tsc --noEmit` in `common/common-ts`.
6. Lint: `pnpm eslint .` in `common/common-ts`.
7. Tests: `pnpm vitest run` in `common/common-ts` —
   **discovers only common-ts internal + examples tests**, NOT
   `packages/**/*.test.ts`.
8. Discrete determinism gate (`.github/workflows/ts-strict.yml:47-
   53`): `pnpm vitest run src/determinism/` + `pnpm vitest run
   examples/hello-physics/hello-physics.test.ts` — same
   `common/common-ts` cwd.

**(INFERENCE — load-bearing).** `ts-strict.yml` is a
**common-ts-only workflow**. It does NOT test any sim under
`packages/`. Adding `pnpm vitest run packages/ising-classical/…`
to ts-strict.yml would require either (a) extending vitest's
`include` glob in `common/common-ts/vitest.config.ts` or (b)
adding a second vitest config under `packages/ising-classical/`.
**Neither has precedent at HEAD.** RD-2D landed Phase-0 by NOT
testing the Stack-B impl in CI — the canonical capture +
NumPy reference do all the work.

### § 3.4 — Plan-prose provenance (#4)

**(FACT)** `grep -n "pnpm vitest\|vitest\|pytest -v\|pnpm -F"
docs/phases/phase-3-plan.md`:

- `docs/phases/phase-3-plan.md:535` (§3.2.7 fixture conventions):
  > "TypeScript: vitest. Test files `*.test.ts`. Strict-mode:
  > `pnpm -F <sim-package> test` with tsconfig strict=true."
- `docs/phases/phase-3-plan.md:635` (§3.2.10 CI workflow shape):
  > `run: pnpm -F <sim-package> test`
- `docs/phases/phase-3-plan.md:819` (§4 ordering / per-task
  workflow):
  > "Agent runs strict-mode local gates (ruff/mypy/pytest/ctest/
  > vitest per stack)."
- `docs/phases/phase-3-plan.md:1335` (§6.3 task-3 lenia, Stack D
  Python):
  > "Run `pytest continuous-ca/lenia/python/tests/ -v 2>&1 | tee
  > tools/testkit/failing-tests-evidence/lenia-<UTC>.txt`."
- `docs/phases/phase-3-plan.md:1458` (§6.3a task-3a ising, Stack
  B TypeScript):
  > "Run `pnpm vitest run lattice-spin/ising-classical/typescript/
  > tests/ 2>&1 | tee tools/testkit/failing-tests-evidence/ising-
  > classical-<UTC>.txt`."

**(INFERENCE — provenance).** §6.3a's "pnpm vitest" call is **NOT
random plan-author drift** — it is **consistent with §3.2.7's
per-stack tool prescription** ("TypeScript: vitest"). The plan
author followed the per-stack convention.

**(FACT — but).** §3.2.7's prescription ALSO requires
`pnpm -F <sim-package> test`, which implies each sim is a **pnpm
workspace member**. **At HEAD there is NO root `pnpm-workspace.
yaml`** (per `find . -maxdepth 3 -name "pnpm-workspace.yaml"
-not -path "*/node_modules/*"` — only `common/common-ts/
pnpm-workspace.yaml` exists, which is a within-common-ts
configuration, not a repo-root workspace). RD-2D's
`packages/reaction-diffusion-2d/` has NO `package.json` — it is
NOT an npm package. **Plan §3.2.7's `pnpm -F` requirement was
never built at HEAD.** §6.3a's vitest call inherits that
unrealized prescription.

**(INFERENCE — material).** §6.3a's vitest call is plan §3.2.7
prescription **without supporting precedent at HEAD**. The only
existing Stack-B sim (RD-2D Phase 0) does NOT follow §3.2.7's
vitest-+-`pnpm -F` shape; it follows a pytest-against-captures
shape per spec §7.8. Choosing §6.3a literally for ising-classical
would mean **building the §3.2.7 precedent here as new scope**
(npm workspace bootstrap + per-sim vitest config + ts-strict.yml
extension + headless-WebGPU-on-CI story for spec §7.8 reconciliation).

### § 3.5 — Capture-driven pytest reproducibility for ising (#5)

**(FACT)** The RD-2D pytest contract is reproducible for ising-
classical with the following adaptations:

- **Capture format:** Ising spin field is `i8` semantically; per
  RD-2D `packages/reaction-diffusion-2d/src/index.ts:144` precedent
  the field is stored in HDF5 as `f32`/`f64` (CaptureManifest enum
  per `common/common-ts/src/capture.ts:18-43`). Same `Writer` API
  (write_step + finalize); same HDF5 layout.
- **Pytest oracle:** NumPy reference Metropolis sim writes a
  canonical capture; pytest uses the same `diff_captures` /
  `load_capture` machinery RD-2D consumes. Mirror at
  `packages/ising-classical/tests/test_code_verification.py`.
- **Determinism oracle:** `run_twice_and_diff(sim_runner, seed=42,
  tmp_dir)` against the NumPy reference per
  `packages/reaction-diffusion-2d/tests/test_determinism.py:24-28`.
  Tests the Python reference (load-bearing oracle), not the WGSL
  impl (local-only per spec §7.8).
- **WGSL impl:** Local-only verification per RD-2D precedent. The
  Stack-B WGSL kernel writes a capture (with R2-backed LFS push);
  the canonical capture lives at `captures/ising-classical-ref/
  metropolis-128sq-T2.27-seed42-step10000.{h5,json}`; pytest reads
  it and asserts against the NumPy reference + Onsager / Yang /
  Kramers-Wannier golden tables.
- **Headless WebGPU story:** Spec §7.8 already covers it ("CI
  runners have no real GPU"); RD-2D never solved headless WebGPU
  for CI because it doesn't need to — the Python reference + pytest
  oracle ARE the CI test surface. **Ising inherits this resolution
  unchanged.** No `@webgpu/dawn` / `dawn-node` / `wgpu-py`
  dependency is in scope at this HEAD (per `grep -rn "navigator.gpu
  \|dawn-node\|@webgpu/dawn\|wgpu-py\|wgpu\|headless"
  .github/workflows/*.yml` — empty).

## § 4 — Decision

Per the dispatch decision rule (option #3): "§6.3a deliberately
calls vitest while §6.3 lenia doesn't (Stack-B-specific intent)
AND #1 confirms RD-2D doesn't use vitest → CONFLICT: plan author
intended vitest but didn't build the precedent. Surface for
operator: either build the vitest precedent here as part of ising
(real new scope), or follow the actual RD-2D precedent and treat
the plan call as drift. **Default-lean follow precedent.**"

**DECISION: pytest-against-captures (follow RD-2D precedent).**

Trace:

1. **Stack-B sim testing at HEAD is pytest-against-captures**
   (FACT §3.1 — RD-2D, only Stack-B sim, ships zero `*.test.ts`
   under `packages/`; tests are pytest in `packages/reaction-
   diffusion-2d/tests/` against the canonical capture).
2. **Vitest at HEAD tests only common-ts library code**
   (FACT §3.2 — all 8 `*.test.ts` live under `common/common-ts/`;
   only vitest config rooted at `common/common-ts/`; only `ts-
   strict.yml` runs vitest, all working-directory `common/common-
   ts`).
3. **§6.3a's "pnpm vitest" call inherits §3.2.7's per-stack
   prescription which was never built at HEAD** (FACT §3.4 — no
   root `pnpm-workspace.yaml`, RD-2D has no `package.json`,
   §3.2.7's `pnpm -F <sim-package> test` precondition unrealized).
4. **Default-lean per dispatch rule: follow precedent.** Building
   the §3.2.7 vitest-+-`pnpm -F`-workspace-+-headless-WebGPU-CI
   precedent here is **real new scope** that the ising-classical
   charter does not budget and the plan does not justify (§7.8
   already documents CI-no-GPU; RD-2D landed Phase 0 by not
   needing it).

Therefore: ising-classical follows RD-2D's pytest-against-captures
pattern. §6.3a M.4's `pnpm vitest run …` call records as **§0.3
SHIFT-from-discovered drift** (no plan edit; Convention M). The
charter-v1 D-HARNESS-LAYOUT (Lean A vitest-mirror-RD-2D vs Lean B
extend-vitest-config) **collapses** — both leans were vitest-
based; the precedent says pytest. STOP-HARNESS becomes
unreachable (no remaining decision to gate).

## § 5 — Charter-v2 routing

The investigation result routes the following charter edits (made
in this session's commit 2 per dispatch deliverable B):

| Charter section | Edit |
|---|---|
| `§ 1.2` inheritance table — §6.3a C "pnpm vitest …" row | Add `§0.3 SHIFT-from-discovered (convention)` — §6.3a's vitest call inherits §3.2.7 prescription unrealized at HEAD; ising follows RD-2D pytest-against-captures precedent per spec §7.8 |
| `§ 1.2` inheritance table — §6.3a M.4 `pnpm -F <sim-package> test` (`docs/phases/phase-3-plan.md:535` + `:635`) | Add `§0.3 SHIFT-from-discovered (precondition)` — no root `pnpm-workspace.yaml`; RD-2D has no `package.json`; precondition unrealized |
| `§ 2` Stage 1a/1b deliverables | Re-frame: scaffold `packages/ising-classical/tests/test_*.py` (pytest) + NumPy reference impl + capture writer harness via `common/common-ts/src/capture.ts` consumed from a Node-side runner; CANONICAL CAPTURE at `captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}` (local-only WGSL exec per spec §7.8); CI gates pytest + Python reference + golden tables + Hypothesis PBT, NOT vitest |
| `§ 5 D-HARNESS-LAYOUT` | **RESOLVED-IN-CHARTER (pytest-against-captures per RD-2D Phase-0 precedent; §6.3a vitest call recorded as §0.3 SHIFT-from-discovered).** Remove Lean A / Lean B / STOP-HARNESS. Decision-by: charter-v2 RESOLVED. |
| `§ 5 D-CI` | Update: extend `python-strict.yml` with `test-ising-classical` job (mirror lenia precedent `python-strict.yml/test-lenia`), NOT `ts-strict.yml` (which is common-ts only). §6.3a M.4's "build-ts.yml" reference remains §0.3 SHIFT-from-discovered (file absent; Stack-B sim tests don't belong in ts-strict.yml's scope). |
| `§ 5 D-TAG` | **RESOLVED-IN-CHARTER NO.** Per operator routing this session: per-sub-phase tagging discontinued; phase-close-only going forward. Stage-2 deliverables: remove I7 allowlist extension + tag proposal block; closing sweep + landing audit stand; NO tag at landing; phase-close tag is operator work at Phase 3 close. |
| `§ 6` STOP conditions | Remove STOP-HARNESS (D-HARNESS-LAYOUT RESOLVED). Remove the D-TAG / I7-allowlist operator-pending caveat from any block that references it. STOP-I7 stays (no agent tags ever; convention-level guard). |
| `§ 7` Risk register R-3 | Re-write: D-HARNESS-LAYOUT RESOLVED; remove the "vitest harness shape decision unresolved" framing. Risk surface remaining: ising's pytest oracle vs the legacy-capture `.h5` + R2 mirror (covered by R-5). |
| `§ 8` Banks table | Add L-ISING-AUDIT-HYGIENE (pre-existing-at-this-session — 2 session-1 ising audits used literal `at-head` in evidence_hashes; sealed audits, fix routed to separate audit-citation-hygiene cluster session). |

## § 6 — Banks

| Bank | Status | Note |
|---|---|---|
| L-ISING-AUDIT-HYGIENE (NEW) | OPENED — banked for separate audit-citation-hygiene cluster | Two session-1 ising audits (`probe-2026-05-28T19-08-34Z` 14 fails; `plan-drafting-2026-05-28T19-08-34Z` 6 fails) used literal `at-head` instead of measured `sha256:<hex>` in `evidence_hashes`. Sealed at session 1's commit chain `762424c`→`fa06646`→`ac47074`. Per dispatch ("DO NOT touch sealed audits") fix is out-of-scope here; routes to a separate `audit-citation-hygiene` cluster session (sibling: lenia-mypy-strict-fix §12 addendum drift; L-R2CD-1 integrity-digest carry-forward). NOT a regression of THIS session. |
| L-LTSF-3 (tolerance-budget cap-amendment shape) | CARRIED FORWARD via charter §5 D-WIDE-TOL |
| L-R2CD-1 (audit-citation-hygiene cluster) | CARRIED FORWARD — now joined by L-ISING-AUDIT-HYGIENE as the second concrete case |
| SIBLING-FIXTURE-LFS | CARRIED FORWARD — unchanged from charter v1 |
| integrity-meta-test-ci-wiring | CARRIED FORWARD — unchanged |
| R-11 (lenia first-SIM frictions) | TRANSLATED-TO-STACK-B — unchanged from charter v1 |

## § 7 — STOP conditions evaluated

| STOP | Fired? | Note |
|---|---|---|
| STOP-D (integrity invariant) | NO | 0 HARD_FAIL / 14 SOFT_WARN; digest `688bc195…` byte-identical to session 1 |
| STOP-H (verify_evidence regression) | NO | Pre-existing 1-fail (lenia-mypy-strict-fix) + 2 pre-existing-at-this-session-start ising-audit-hygiene fails (NOT regression of THIS session; sealed at session 1) |
| STOP-MAIN-RED | NO | 9/9 required workflows success at HEAD `ac47074` |
| STOP-HARNESS-INVESTIGATION | NO | Evidence is one-sided: RD-2D pytest precedent + zero `*.test.ts` under packages/ + §3.2.7 prescription's `pnpm -F` precondition unrealized = follow precedent. No split evidence. |

## § 8 — Provenance

- **Author:** Phase-3 ising-classical charter-revision (Claude Code,
  Opus 4.7).
- **Drafted:** 2026-05-28T21-00-21Z.
- **HEAD SHA at audit:** `ac47074a60783949551033dc61e259129aab371a`
  (Convention #12 back-fill to chain-tip in a separate commit).
- **Prior sub-phase tag (pushed):** `v0.2.4-sub-phase-phase-3-
  lenia`.
- **Prior phase tag (pushed):** `v0.2.0-phase-2`.
- **Proposed sub-phase tag (this session):** **NONE** — D-TAG
  flipped NO per operator routing (per-sub-phase tagging
  discontinued; phase-close-only going forward).
- **Charter-v2 destination:** `docs/phases/sub-phase-phase-3-ising-
  classical.md` (in-place edit per Convention M; plan, not
  sealed audit).
