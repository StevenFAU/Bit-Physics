---
sub_phase: phase-3-mass-spring-cloth
task: task-5 (plan §6.5)
sim_identity: mass-spring-cloth                 # task/sim id — CI job, probe, fixture, audit-report leaf, package, import, keys
package_leaf: mass-spring-cloth                  # NO separate package-leaf (unlike rigid-body's articulated-pedagogical); flat packages/ per §0.3
stack: C (Vulkan / C++20)
category: soft-body                              # NEW category (first soft-body sim); flat packages/ per §0.3
stage: execution (Stage 0 → 2 combined)
verdict: RESOLVED (all five operator-pending D-classes ratified; execution underway)
author: phase-3 mass-spring-cloth plan-drafting (Claude Code)
date: 2026-05-29
prior_sub_phase: sub-phase-phase-3-rigid-body-pedagogical (task-4)
prior_sub_phase_landed_at: be3e468
prior_phase_tag: v0.2.0-phase-2
d_tag: NO (per-sub-phase tagging discontinued mid-Phase-3; one operator-pushed annotated tag v0.3.0-phase-3 at Phase-3 close, task-10)
revisions:
  - v1 2026-05-29 — initial charter; FIRST Stack-C (Vulkan/C++) sim of Phase 3; five substantive D-classes surfaced
    (D-VENDOR-ROLE, D-VENDOR-SHA, D-DET, D-ANCHOR, D-PBT). Anchor probe 0 HF / 14 SW, digest f5b7eea1…070bb3 at be3e468.
  - v2 2026-05-29 — execution Stage 0. Operator RATIFIED all five D-classes (dispatch-locked): D-VENDOR-ROLE =
    vendored READ-ONLY reference-oracle + reimplement XPBD from Macklin 2016 (no FetchContent/runtime-link);
    D-VENDOR-SHA = latest STABLE release `2.2.0` (`aa62c44f…`) per spec D.3 (re-verified `gh release view`; MIT),
    §2.18 master-HEAD discrepancy → spec-amendments A-3 (operator reconciles, NO plan edit); D-DET = MEASURE,
    default bit-exact / same-stack-same-hw row at 1a, lavapipe serial Gauss-Seidel, re-characterize honestly if
    intractable; D-ANCHOR = corrected catenary cites grep-verified at 1b + catenary-LIMIT regime note (no widening);
    D-PBT = `length_bounded_above` + `momentum_conservation_free_no_gravity` (FREE cloth), wiring =
    Hypothesis→subprocess-capture-binary→.h5→assert. Corrigenda routed: A-2 (cloth-xpbd→mass-spring-cloth),
    A-3 (§2.18 Bender SHA) appended to `docs/spec-amendments-proposed.md`. Anchor probe re-measured 0 HF / 14 SW,
    digest f5b7eea1…070bb3 at e9e83a0. Bender 2.2.0 vendored read-only; MANIFEST schema-precedent (Lenia) + license MIT.
---

# Sub-phase: Phase-3 mass-spring-cloth (task-5, sub-phase 3.4) — CHARTER

> **Plan-drafting artifact.** This charter is the design target for a later
> single combined execution session (Stage 0 → 1a/1b/1c → 2). It does NOT
> implement the sim. Authorities, in precedence order: `docs/architecture.md`
> (spec v2.4) → `docs/phases/phase-3-plan.md` §6.5 (authoritative deliverable
> list A–L + v9 addendum) → `docs/conventions/sub-phase-conventions.md`
> (cross-cutting §A–§S) → the most-recent sibling charters
> (`sub-phase-phase-3-rigid-body.md`, `sub-phase-phase-3-ising-classical.md`,
> `sub-phase-phase-3-lenia.md`). Where the plan prose and an existing
> Phase-0/1/2/3 convention disagree, **§0.3**
> (`docs/phases/phase-3-plan.md:138`,`:968`) gives the existing convention
> precedence and the charter documents the SHIFT — no plan edit.
>
> **The execution session does NOT begin until the operator ratifies this
> charter** (in particular the five open D-classes in §6: D-VENDOR-ROLE,
> D-VENDOR-SHA, D-DET, D-ANCHOR, D-PBT). The two load-bearing decisions are
> **D-VENDOR-ROLE** (it drives the entire build + verification design) and
> **D-DET** (Vulkan iterative Gauss-Seidel — do NOT pre-declare bit-exact).

---

## § 1 — Scope and posture

### 1.1 First-Stack-C-SIM-in-Phase-3 — friction surfacing (CONTEXT-BRIDGE, load-bearing)

task-5 is the **first Stack C (Vulkan / C++20) sim of Phase 3**. Per plan §6.5
CONTEXT-BRIDGE ("You're the first Stack C sim of Phase 3. Validates Stack C sim
flow."), the execution session is the end-to-end validation of the
C++/Vulkan-sim → golden → tier-3 → C++ capture → CI(cpp-strict) → LFS-R2
pipeline, exactly as lenia was for Stack D (Taichi), ising-classical for Stack B
(WebGPU), and rigid-body for Stack E (Warp). Phase-3 has **one** Phase-1 Stack-C
precedent — the Phase-2 port `packages/reaction-diffusion-2d-stack-c/`
(Gray-Scott, Vulkan f64) — which establishes the CMake/doctest/ctest/lavapipe
patterns; but cloth is the **first NEW Stack-C sim** (RD-2D-Stack-C is a port of
a Phase-1 sim), the **first C++ sim with a Python PBT surface**, and the **first
`soft-body` category + first `[golden_tolerance.soft-body.*]` + first Stack-C
determinism-registry row**. The friction this sub-phase surfaces is inherited by
every later Stack-C work (Phase-4 frontier soft-body §5.9 JGS2/MGPBD/Newton-VBD;
any later `common-cpp` consumer).

| # | Predicted friction (first Stack-C Phase-3 sim) | Resolution / where it lands |
|---|---|---|
| 1 | First C++/Vulkan **new sim** of Phase 3 — full Stack-C pipeline (CMake + FetchContent + doctest + ctest + `cpp-strict.yml` + lavapipe ICD pin + C++ `Hdf5Writer` capture + Python PBT + LFS .h5) | Mirror `packages/reaction-diffusion-2d-stack-c/` end-to-end (the only built Stack-C precedent); this charter maps every surface in §3 + §8. |
| 2 | Capture API is **C++ `common_cpp::capture::Hdf5Writer` + `Manifest`** (batch `write_step`/`finalize` → `.h5` + `.json` sidecar w/ sha256), NOT lenia's Python `common_py.capture.Writer` nor rigid-body's Warp `Capture`+`write_capture` | **D-CAPTURE-API §6** — `Hdf5Writer(manifest_path, Manifest)`; HDF5 capture-v1 layout `/steps/{N}/state/{field}` (spec D.2.5). |
| 3 | **First C++ sim needing a Python PBT** — `tools/testkit/property/sims/<sim>/invariants.py` verifies post-hoc on captures the C++ sim emits (§6.5 v9 note); no C++/Python PBT precedent exists (ising/lenia/rigid-body PBTs verify a same-language reference) | **D-PBT §6 — operator-routed (wiring lean: Hypothesis generates IC params → subprocess the C++ capture binary → read `.h5` → assert invariants).** |
| 4 | **First Stack-C determinism-registry row** (registry introduced in Phase 3; no `C` row exists). Vulkan compute + **iterative Gauss-Seidel** constraint projection is order/atomic/subgroup-sensitive (spec §2.5) | **D-DET §6 — operator-routed; do NOT pre-declare bit-exact; MEASURE at 1b.** |
| 5 | **First `soft-body` category + first `[golden_tolerance.soft-body.mass-spring-cloth]` tolerance row** | **D-TOL §6 — RESOLVED-IN-CHARTER** (§S.3 already enumerates `mass-spring-cloth: position_abs, catenary_shape_rel`). |
| 6 | **First vendored C++ reference-oracle reimplemented from a paper** (Bender PBD → XPBD per Macklin 2016), analogous to SPlisHSPlasH→SPH but for cloth | **D-VENDOR-ROLE §6 — operator-routed (lean vendored-reference-oracle + reimplement).** |
| 7 | TDD output-hash for **C++/ctest** (doctest), not Python pytest — capture via `ctest --output-on-failure 2>&1 \| tee` then sha256; normalize ctest timing lines | §S6 + §2; failing-tests evidence `tools/testkit/failing-tests-evidence/mass-spring-cloth-<UTC>.txt`; footer hash; gate-3/gate-13. |
| 8 | New top-level CI job in **`cpp-strict.yml`** (NOT plan's `build-cpp.yml`, which does not exist) + selective LFS pull for the committed capture | **D-CI §6** — mirror the RD-2D-Stack-C ctest job shape (§8). |

### 1.2 Inheritance and re-frames

**Layer-authority re-frame (per §0.3).** The plan §6.5 prompt carries five stale
anchors superseded by the live repo + matured cadence; all five were caught at
probe and are pre-resolved here:

| Plan §6.5 prose | Live / convention reality | Disposition |
|---|---|---|
| "BASE BRANCH: phase-3-integration / YOUR BRANCH / MERGE PROTOCOL §4.3" | trunk-based to `main`, no PR (plan v8 amendment `docs/phases/phase-3-plan.md:46`) | Superseded; ignore (as task-4). |
| "NEW top-level `soft-body/` folder"; "`soft-body/mass-spring-cloth/cpp/`" | those category dirs do not exist; convention is flat `packages/<sim>/` with NO `cpp/` subdir (`packages/reaction-diffusion-2d-stack-c/` uses `src/`,`include/`,`shaders/`,`tests/` directly) | **D-LAYOUT** — `packages/mass-spring-cloth/` per §0.3 (LOCKED). |
| ".github/workflows/build-cpp.yml (test-mass-spring-cloth job)" | `build-cpp.yml` does not exist; Stack-C per-sim ctest runs in `cpp-strict.yml` | **D-CI** — `cpp-strict.yml` per §0.3. |
| "`references/PositionBasedDynamics/manifest.yaml`" (deliverable G); plan §2.11 "per-upstream `manifest.yaml`" | live format is **`MANIFEST.toml`** validated against `tools/testkit/schemas/reference-manifest-v1.json` (SPlisHSPlasH, 3DGS-reference, Chakazul-Lenia all use it) | **D-MANIFEST-FMT** — `MANIFEST.toml` per §0.3. |
| "justfile (`just run-cloth`, `just test-cloth`)" used in CI | §2.14 (`docs/phases/phase-3-plan.md:237-239`): CI calls commands directly (`ctest …`), `just` recipes are local-human convenience | RESOLVED — CI uses `ctest`; justfile recipes are wrappers only. |

**Naming map (documented to prevent execution-session confusion).** The spec
uses TWO names; both appear in frozen surfaces — this is a genuine drift, not an
intentional code/spec-leaf split like rigid-body's:

| Name | Where used |
|---|---|
| `mass-spring-cloth` (canonical) | spec §5.9 reference-sim; spec §11.4 category table (`docs/architecture.md:2439`); plan §3.4 canonical-naming + §6.5; the directory path; **this charter's sim-id/path/keys** |
| `cloth-xpbd` (descriptor label) | spec Appendix D.2.3 capture-descriptor row (`docs/architecture.md:2509`); spec D.3 vendor-pin "used by" (`:2552`); `phase4-plan.md` |

**D-NAMING (resolved-in-charter, lean `mass-spring-cloth`).** Canonical sim-id is
`mass-spring-cloth` everywhere (path/import/keys/CI-job/probe/fixture/audit-leaf
+ capture-manifest `sim.name`). The two `cloth-xpbd` occurrences are
**spec-frozen descriptor labels**; the capture descriptor
`flag-wind-128x128-seed42-step1000` itself carries no sim name, so the only
artifact difference is the Appendix-D.2.3 row's sim-id column. Routes a
corrigendum to `spec-amendments-proposed.md` (spec FROZEN in Phase 3 per §9.6 —
operator applies at phase boundary) to alias/reconcile `cloth-xpbd` ↔
`mass-spring-cloth`. Low-stakes (descriptor name-agnostic). **NO plan edit** (§0.3).

---

## § 2 — Stage cadence (single combined execution session)

Mirrors rigid-body/ising/lenia: Stage 0 → 1a → 1b → 1c → 2, trunk-based to
`main`, Convention-A new-files-first, ≤500-line commits, TDD with failing-output-
hash footer (§S6 — real sha256, no placeholders). C++/ctest output captured via
`2>&1 | tee`. Estimated ~25–55 commits (C++ build surface is larger than the
Python/Warp sims).

- **Stage 0 — Pre-flight + anchor probe + §Q LFS bootstrap + vendoring.**
  - `uv run python tools/dispatch/preflight-phase.py 3` — **now genuinely exit 0**
    (F1/F2 hardened at `1793b83`; the stale-tooling false-positive no longer
    applies). A real exit 1 → STOP-PREFLIGHT-NEW and surface.
  - Anchor probe: `uv run python -m integrity --all --mode strict` (§R: expect
    0 HF / 14 SW; **measure** the digest, do NOT copy — at `be3e468` it is
    `f5b7eea1…070bb3`).
  - **§Q.3 first action after anchor probe:** `source tools/lfs/setup-lfs-s3-local.sh`
    (this sub-phase commits a new `.h5` fixture + canonical capture → LFS-touching).
    Non-zero return → STOP-LFS-PUSH surfaced.
  - Cross-phase replay `--prior-phase phase-2` → expect `ok=True`; LFS-smudge
    recovery from byte-identical working-tree content (OID == sha256) if needed.
  - verify_evidence sweep across all prior phase-3 audits → 0-fail (no regression).
  - **Vendor Bender PositionBasedDynamics** (per D-VENDOR-ROLE + D-VENDOR-SHA):
    sparse-checkout at the operator-ratified SHA → `references/PositionBasedDynamics/`
    (read-only) + `MANIFEST.toml` (schema-validated) + license/security check.
    This is a Stage-0/1a step (the vendored source is the cross-check oracle, not
    a build dependency — D-VENDOR-ROLE).
  - Resolve the operator-ratified D-class outcomes into the spec-ref + tolerance
    + determinism landing before 1a.
- **Stage 1a — Scaffold + RED.** `packages/mass-spring-cloth/` (new C++ subdir
  registered in the top-level `CMakeLists.txt` after `common-cpp`); spec-ref +
  derivation skeletons; CMakeLists.txt gated on
  `TARGET bit_physics_common_cpp_vulkan AND TARGET bit_physics_common_cpp_hdf5`;
  failing doctest TDD (hanging-cloth catenary-limit / stretched linear-elastic /
  at-rest zero-motion) committed with failing **ctest** output captured to
  `tools/testkit/failing-tests-evidence/mass-spring-cloth-<UTC>.txt`, sha256 in
  the commit footer (gate-3). Determinism registry row (DEFAULT, measured 1b).
- **Stage 1b — Implementation + thirteen-gate + D-DET measure.** Vulkan compute
  XPBD (distance + bending constraints; shear optional; Gauss-Seidel projection;
  compliance↔stiffness mapping per Macklin 2016); semi-implicit Euler substeps;
  CLI per §3.2.6; golden tables E (catenary-limit 32×32) + derivation F; Tier-3
  diagnostic H; PBT invariants (Python, post-hoc on captures); shared-file
  updates J (README, CHANGELOG, glossary, justfile, `cpp-strict.yml` test job,
  tolerance.toml, determinism registry); RED→GREEN witness footer
  `sha256:<same-hex>`. **§S.2: read `tolerance-schema.json` + one existing
  `golden_tolerance` entry BEFORE writing the row.** MEASURE D-DET
  (`assert_deterministic_run` with `tolerance=0.0` → sha256 bit-exact over two
  runs; lavapipe `LP_NUM_THREADS=0` serial). Characterize honestly.
- **Stage 1c — Closing sweep + landing prep.** PBT confirmation; verify_evidence;
  append-only; integrity sweep (§R two-field); canonical capture
  `captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.{h5,json}` +
  schema-corpus fixture `tests/fixtures/legacy-captures/phase-3-mass-spring-cloth.{h5,json}`
  + §Q.3/§Q.5 R2 push & back-fill (same-shell). **No mutation baseline** (sim,
  not testkit surface — §6.0 item 12). Perf-ledger row (gate-12).
- **Stage 2 — Landing audit.** §R two-field integrity, replay, append-only,
  verify_evidence; closes per §2.15 (`closed-with-shifted-N` if any SHIFTED
  item — e.g. a D-DET re-characterization or a D-PBT regime re-declaration). NO
  tag (D-TAG NO). progress.md final entry.

---

## § 3 — Deliverables (maps to plan §6.5 A–L + v9 addendum)

| ID | Deliverable | Path / note |
|----|-------------|-------------|
| A | sim-spec | `docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md` (§3.2.8) — sim-spec doc path keeps the `soft-body/` category (mirrors lenia/ising/rigid-body sim-spec category dirs) |
| B | probe report | `tools/testkit/probes/reports/mass-spring-cloth.md` |
| C | failing TDD tests | `packages/mass-spring-cloth/tests/` (doctest) — hanging cloth (catenary-limit equilibrium); stretched cloth between fixed points (linear-elastic limit); cloth at rest (zero-motion preservation) |
| D | Vulkan impl | `packages/mass-spring-cloth/src/` + `include/bit_physics/mass_spring_cloth/` + `shaders/*.comp` — C++20; XPBD distance + bending (structural), shear (optional); Gauss-Seidel projection; compliance↔stiffness per Macklin 2016; CLI per §3.2.6 |
| E | golden tables | `tools/testkit/golden/tables/cloth-hanging.json` (catenary-limit, 32×32), `cloth-stretched.json` (linear-elastic limit, 32×32) — golden positions; ≥3 independent-reference anchors per §2.4 (D-ANCHOR); `independent_reference` field per anchor point |
| F | golden derivation | `tools/testkit/golden/derivations/cloth-catenary-limit.md` — catenary `y(x)=a·cosh(x/a)`, `a=T₀/(ρg)`; corrected anchor cites (D-ANCHOR); **explicit catenary-LIMIT regime note** (elastic cloth ≠ ideal inextensible catenary) |
| G | vendored reference | `references/PositionBasedDynamics/` (read-only sparse-checkout) + `MANIFEST.toml` (schema-validated) at the operator-ratified SHA + license/security check (D-VENDOR-ROLE / D-VENDOR-SHA / D-MANIFEST-FMT) |
| H | Tier-3 diagnostic | `tools/diagnostics/tier3/mass-spring-cloth/` (mirror lenia/ising: `Report` classes + `check_*` fns) (§3.2.9) |
| I | Cat-1 / Cat-2 | Cat 1: `cat1.upstream-citation` (vendored Bender + Macklin 2016 cite) passes; Cat 2 green |
| J | shared-file updates | README, CHANGELOG, `docs/glossary.md` (XPBD, PBD, Gauss-Seidel projection, compliance, stiffness, catenary, distance/bending/shear constraints, substep), justfile (`run-cloth`/`test-cloth` CMake wrappers), `.github/workflows/cpp-strict.yml` (`test-mass-spring-cloth` ctest job), `tools/testkit/equivalence/tolerance.toml` (per D-TOL), `tools/testkit/determinism/registry.toml` (`[soft-body.mass-spring-cloth]`) |
| K | progress.md entry | `docs/_audits/phase-3/progress.md` |
| L | report | `docs/_audits/phase-3/task-5-mass-spring-cloth.md` (+ per-stage audits) |
| M | canonical capture | `captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.{h5,json}` — descriptor **fits** spec Appendix D.2.3 (lists it as the task-5 canonical example); 128×128 mesh, seed 42, 1000 steps. (Golden mesh is 32×32; canonical capture is 128×128 — per plan.) |
| N | perf-ledger row | `docs/perf-ledger.md` (gate-12) — `\| mass-spring-cloth \| cpp (Vulkan) \| flag-wind-128x128-seed42-step1000 \| <wall_clock> \| <hw> \| <sha> \| <date> \| baseline \|` |
| O | schema-corpus seed | `tests/fixtures/legacy-captures/phase-3-mass-spring-cloth.{h5,json}` (§6.0 item 10) |

**PBT invariants (≥2, plan §6.5 line 1714):** `length_bounded_above` (XPBD
constraint solver: no spring exceeds `rest_length × (1 + max_stretch_ratio)`
under random valid ICs — valid for any configuration) + **`momentum_conservation_free_no_gravity`**
(RE-DECLARED — see D-PBT: linear momentum preserved only for a **FREE (unpinned)**
cloth with gravity disabled and no external forces; a corner-pinned cloth does
NOT conserve linear momentum even gravity-off because the pins supply external
force). Impl at `tools/testkit/property/sims/mass_spring_cloth/invariants.py`
(mirror lenia/ising predicate-function shape), verifying post-hoc on captures the
C++ sim emits (D-PBT-WIRING).

---

## § 4 — Out of scope (Phase 4+)

Per plan §6.5 OUT OF SCOPE + spec §5.9 frontier variants: JGS2 / MGPBD / C5D
(SIGGRAPH 2025 elastodynamics, spec §5.9); Newton VBD (Vertex Block Descent,
Stack E); differentiable cloth (inverse design / garment fitting); volumetric
soft-bodies; self-collision beyond baseline XPBD; runtime linking against
PositionBasedDynamics (D-VENDOR-ROLE — it is a read-only reference oracle, not a
dependency). **USD export is cleanly OUT and needs NO D-class:** spec §2.5 /
plan §2.5 bind USD export to **Stack E** sims (3.3, 3.5, 3.6); cloth is **Stack C**.
(This differs from task-4 rigid-body, where D-USD was a live decision because
rigid-body is Stack E.)

---

## § 5 — Pre-flight checks (preconditions discharged)

`preflight-phase.py 3` now returns **genuine exit 0** (F1/F2 hardened at
`1793b83`; verified this session: all 8 checks PASS — prior-phase-tag,
common-warp + warp.md, all four Phase-2 ports, integrity-all-green). Verified
state at `be3e468`: prior tag `v0.2.0-phase-2` present; integrity **0 HF / 14 SW**
(digest `f5b7eea1…070bb3`) via `uv run`; clean tree.

**common-cpp consumability (Convention I / rule-of-three).** The mature Phase-2
`common-cpp` package exposes everything the cloth sim needs (probe-verified
verbatim, §8 of the probe report):
- **Vulkan compute substrate** (`vulkan_compute.hpp`): `vkcompute::ComputeContext`,
  `StorageBuffer`, `ComputePipeline` (with `pipeline_pnext` FloatControls hook),
  `dispatch(...)`. Target `bit_physics::common_cpp_vulkan`.
- **Determinism socket** (`determinism.hpp`): `DeterministicContext`,
  `assert_deterministic_run(sim_fn, runs, tolerance)` (tolerance=0.0 → sha256
  bit-exact; >0 → epsilon-bounded), `Config`, `from_args`. Target
  `bit_physics::common_cpp`.
- **Capture I/O** (`capture.hpp`): `Hdf5Writer`, `Manifest`, `FieldData`,
  `StepData`, `manifest_to_json`. Target `bit_physics::common_cpp_hdf5`.
- **Hashing** (`hash.hpp`): `sha256_hex`.

These cover the sim's infrastructure needs in full — **no Hard-Rule-2
missing-surface block.** ImGui (`imgui_hooks.hpp`) and export (`export_hooks.hpp`
incl. `export_scene_to_usd`) are inline/throwing **stubs** — not consumed by a
headless capture-only cloth sim. The XPBD solver, constraint kernels, and cloth
data structures are the **sim's own physics deliverable** per §6.5-D, NOT missing
shared infrastructure (cloth is the FIRST soft-body consumer; extraction to a
shared cloth/constraint surface happens only on the rule-of-three).

---

## § 6 — D-class decision routing

> **RESOLVED (v2, operator-ratified Stage 0 2026-05-29).** All five formerly-open
> D-classes are now operator-locked (dispatch outcomes below). The rest were
> RESOLVED-IN-CHARTER (lean stated) per §0.3 + precedent. The two load-bearing
> decisions were **D-VENDOR-ROLE** and **D-DET**. Each lean below was ratified
> as-stated (with the SHA re-verified live at Stage 0).

### D-VENDOR-ROLE ✅ RESOLVED — vendored READ-ONLY reference-oracle + reimplement XPBD (Macklin 2016)
**LEAN: vendored READ-ONLY reference-oracle + reimplement XPBD from Macklin 2016.**
- **Evidence (probe FACT):** all three currently-vendored upstreams
  (`references/SPlisHSPlasH`, `references/3DGS-reference`, `references/Chakazul-Lenia`)
  are **read-only sparse-checkout reference-oracles**, NOT runtime-linked: `references/`
  is excluded from `end-of-file-fixer`/`trailing-whitespace`/`ruff` pre-commit
  hooks (byte-identical to upstream) and from Cat-2 (`tools/integrity/integrity/common/repo.py:18`:
  `"references/" # vendored upstreams are read-only`); `docs/testkit/references.md`
  ("an agent that modifies vendored source is HALTED").
- **Spec authority:** §2.3 "Vendor … at pinned SHA. Cite Macklin 2016 in spec §12."
  §2.4 (REVISED v2.4, `docs/architecture.md:357`): "A golden table derived only
  from a vendored upstream inherits any bugs in that upstream symmetrically …
  every golden table MUST include at least one independent-reference anchor."
  The catenary analytic form + hand-derivation ARE the independent anchors;
  Bender is the cross-check oracle, NOT the golden source.
- **Consequence for the build:** the cloth sim does **NOT** `FetchContent` or
  link PositionBasedDynamics; it reimplements XPBD in its own Vulkan compute
  shaders + C++20 from Macklin 2016; Bender cross-checks (manually, at derivation
  time) that the constraint formulation matches. This mirrors SPlisHSPlasH→SPH
  (Python/C++ re-derived from Monaghan; SPlisHSPlasH cited as anchor).
- **Operator confirms reference-oracle**, OR explicitly elects runtime-linking
  (which would re-shape the entire build + introduce an MIT redistribution
  posture — a much larger change; not recommended).

### D-VENDOR-SHA ✅ RESOLVED — Bender `2.2.0` (`aa62c44f…`) latest stable (re-verified Stage 0); §2.18 → A-3
**LEAN: vendor at the latest STABLE RELEASE `2.2.0` = `aa62c44f0d43956452e1f960a40333ec2d6d3ea5` per spec Appendix D.3.**
- **Spec Appendix D.3** (`docs/architecture.md:2552`): pin = **"Latest stable"**,
  verification `gh release view -R InteractiveComputerGraphics/PositionBasedDynamics`.
  Web-verified this session: latest stable RELEASE = **`2.2.0`** (tag `aa62c44f…`,
  published 2022-12-13), **license MIT** (confirmed via `gh api … --jq .license.spdx_id`).
- **Conflict:** the Phase-3 external-SHA registry (`phase-3-plan.md` §2.18, pinned
  at common-3dgs Stage 0) recorded Bender PBD `d0894bdb0190…` = **master HEAD**
  (also MIT). master HEAD ≠ "Latest stable" — the common-3dgs agent appears to
  have applied the "latest commit on main" pattern (correct for Inria/PhysGaussian
  per their D.3 rows) uniformly, but Bender's D.3 row says "Latest stable" via
  `gh release view`.
- **LEAN:** vendor the tagged stable release **`2.2.0` (`aa62c44f…`)** — spec D.3
  is the top authority and explicitly says "Latest stable"; a tagged release is
  more reproducible than a moving master HEAD; the choice is about citation
  reproducibility, not runtime correctness (D-VENDOR-ROLE = oracle). **This
  contradicts §2.18's recorded pin;** per Hard-Rule-2 (file the conflict with both
  citations, do not silently adapt) the operator either ratifies the `2.2.0`
  re-pin (recommended; re-point §2.18) OR ratifies master-HEAD `d0894bdb` as an
  intentional deviation from "Latest stable". D.3's reverify rule
  (`docs/architecture.md:2543`) governs at the consuming-stage probe regardless.

### D-DET ✅ RESOLVED — MEASURE; default bit-exact row at 1a, lavapipe serial GS, re-characterize honestly
**LEAN: DEFAULT a bit-exact / same-stack-same-hw row at 1a; MEASURE at 1b; characterize honestly.**
- **Spec §2.5** flags atomics / subgroups / reductions as determinism risks —
  directly relevant to Vulkan compute. Plan §6.5 VERIFICATION POSTURE
  (`docs/phases/phase-3-plan.md:1754`): "bit-exact same-stack-same-driver via Vulkan."
- **Evidence (probe FACT):** the Stack-C precedent `reaction-diffusion-2d-stack-c`
  achieves **bit-exact** on the lavapipe CPU backend via f64 + `NoContraction`
  decoration + serial dispatch (`LP_NUM_THREADS=0`, `VK_DRIVER_FILES=…/lvp_icd.json`
  pinned via CTest `ENVIRONMENT`); `common_cpp::determinism::assert_deterministic_run`
  with `tolerance=0.0` asserts byte-equality via sha256. `docs/common/cpp.md` §4
  defines the lavapipe-CPU bit-exact-same-hw contract.
- **The risk specific to cloth:** XPBD constraint projection is **iterative
  Gauss-Seidel** — order-sensitive. A **serial** GS sweep (single workgroup,
  fixed constraint order, f64, NoContraction, no atomic scatter) on the lavapipe
  CPU backend should be bit-exact same-driver; a **parallel** GS (graph-colored
  constraint batches with atomic accumulation) would introduce order/atomic
  non-determinism. The pedagogical reference should use serial-order GS — but
  this is a 1b MEASUREMENT, not a charter assertion.
- **LEAN:** register `[soft-body.mass-spring-cloth]` (FIRST Stack-C registry row)
  at 1a: `stack="C"`, `class="bit-exact"`, `scope="same-stack-same-hw"`,
  `atomic_ops` + `subgroup_ops` measured (lean "none" for serial GS),
  `seed_pinned=true`. **MEASURE at 1b** via `assert_deterministic_run(…, tolerance=0.0)`.
  If GS projection requires atomic scatter / parallel reduction → **re-characterize
  honestly** (epsilon / distributional with EFECT bound) — the smoke-stack-e
  gate-14 + the dispatch's explicit "do NOT pre-declare bit-exact" discipline.
  **Scope-enum caveat (§0.3):** the registry `scope` enum has no `same-driver`
  value; cloth uses `same-stack-same-hw` (the closest enum) with the lavapipe-ICD
  pin documented as the realization mechanism in spec-ref §6 + the capture sidecar.

### D-ANCHOR ✅ RESOLVED — corrected catenary anchors; grep-cite-verify at 1b; catenary-LIMIT regime note; NO plan edit
**LEAN: catenary equation is correct; CORRECT the section cites; re-verify at Stage 1b (grep-cite); corrected anchors in spec-ref §6 + derivation F; NO plan edit (§0.3).**
- **Plan §6.5** (`docs/phases/phase-3-plan.md:1715`) proposes: Anchor 1 catenary
  `y(x)=a·cosh(x/a)`, `a=T₀/(ρg)`, cite *Marion & Thornton §6.4* or *Symon
  Mechanics (3rd ed.) §10.2*; Anchor 2 hand-derivation of equilibrium force
  balance at midpoint; Anchor 3 cross-check vs *Beer & Johnston Statics (12th ed.)
  Table 7.2*.
- **Web-verified this session (FACT) — 2 of 3 cites are wrong/suspect** (the same
  failure mode as task-4's Goldstein §4.3):
  - **Marion & Thornton §6.4** — Ch 6 = "Some Methods in the Calculus of
    Variations"; §6.4 (5th ed) is "The Second Form of the Euler Equation" (used
    for the minimal-surface-of-revolution / catenoid). The **hanging-chain**
    catenary with a fixed-length constraint is the auxiliary-conditions
    (Lagrange-multiplier) section, **§6.6** — not §6.4. **SUSPECT/wrong** for the
    hanging cable.
  - **Symon Mechanics 3rd ed §10.2** — Ch 10 = "Tensor algebra. Inertia and
    stress tensors"; the continuous-media / hanging-cable content is **Ch 8**
    ("Introduction to the mechanics of continuous media"). **§10.2 is WRONG**
    (tensors, not the catenary).
  - **Beer & Johnston, *Vector Mechanics for Engineers: Statics*** — the catenary
    IS in **Ch 7** ("Forces in Beams and Cables"), as a section/equation (§7.5 in
    the 12th-ed reorganization, §7.11 in older editions), **not a numbered
    "Table 7.2"**. The chapter is right; the "Table 7.2" label is **dubious** —
    verify exact §/edition at execution.
- **LEAN (corrected ≥3 independent anchors, to be grep-cite-re-verified at 1b):**
  - **Anchor 1** — analytic catenary shape `y(x)=a·cosh(x/a)`, `a=H/w=T₀/(ρg)`:
    cite **Beer & Johnston *Statics*, Ch 7 (Cables: the Catenary)** — the
    cable-statics derivation (verify exact §/edition).
  - **Anchor 2** — independent **hand-derivation**: equilibrium force balance on a
    differential cable element (`dH=0`, `dV=w·ds` ⇒ `dy/dx=sinh(x/a)`), integrate
    to `y=a·cosh(x/a)`. No external cite; this is the §2.4 independent anchor
    (does NOT derive from Bender). (Matches plan Anchor 2.)
  - **Anchor 3** — variational cross-check: minimize gravitational PE subject to
    fixed arc length (Lagrange multiplier) ⇒ same catenary — cite **Marion &
    Thornton §6.6** ("Euler's Equations When Auxiliary Conditions Are Imposed",
    NOT §6.4). OR the small-sag parabolic-limit consistency check (cosh Taylor
    expansion ⇒ `y≈a+x²/(2a)`).
- **Load-bearing physics-regime caveat (HARD RULE 2 discipline — the lenia-Quad4
  / ising-aligned-IC / rigid-body-D-PBT precedent):** an **elastic** mass-spring/
  XPBD cloth does NOT settle to the **ideal inextensible** catenary
  `y=a·cosh(x/a)` (the catenary assumes a 1D inextensible chain; cloth springs
  stretch and the 2D sheet has shear/bending coupling). The golden is explicitly
  the **catenary LIMIT** (plan: golden = `cloth-hanging.json` "catenary-LIKE",
  derivation = `cloth-catenary-limit.md`): a single hanging strip/edge in the
  high-stiffness limit approaches the catenary. Stage 1b must characterize the
  residual (finite-elasticity deviation) honestly and set `catenary_shape_rel`
  to the measured stiff-limit tolerance — and **converge the XPBD solver
  (iteration count)** rather than widening `catenary_shape_rel` to mask an
  under-converged solve (§2.6 no-widening; convergence is the solution-verification
  axis per §6.5 VERIFICATION POSTURE).
- **Operator confirms the corrected anchor set** (and whether to file a plan
  corrigendum at `docs/phases/phase-3-plan.md:1715`).

### D-PBT ✅ RESOLVED — `length_bounded_above` + `momentum_conservation_free_no_gravity`; subprocess-capture-binary wiring
**LEAN: `length_bounded_above` (any IC) + re-declared `momentum_conservation_free_no_gravity` (FREE cloth only); wiring = Hypothesis→subprocess-capture-binary→read-.h5→assert.**
- **Regime (resolve-on-evidence, rigid-body D-PBT precedent):** plan §6.5 suggests
  `length_bounded_above` + `momentum_conservation_no_gravity`. The first is valid
  for any configuration. The second **must be qualified to the FREE (unpinned)
  cloth**: a corner-pinned cloth (the hanging-cloth test) does NOT conserve linear
  momentum even with gravity disabled, because the pin constraints supply external
  force (exactly the rigid-body precedent: `momentum_conservation` →
  `angular_momentum_about_pivot_conserved` for the pinned chain). RE-DECLARE
  `momentum_conservation_free_no_gravity`: gravity off + no pins + no external
  forces ⇒ total linear momentum preserved per step under random ICs.
- **Wiring (D-PBT-WIRING — first C++-sim Python-PBT in Phase 3, NO precedent):**
  `tools/testkit/property/sims/<sim>/invariants.py` ships predicate functions
  (mirror lenia/ising); the §6.5 v9 note says "PBT in Python; C++ sim exposes via
  the Stack C capture-replay API so Python PBT can verify post-hoc on captures."
  ising/lenia/rigid-body PBTs verify a **same-language** reference (NumPy/Taichi/
  Warp); cloth's reference is a C++ binary. **LEAN:** Hypothesis generates valid
  IC parameters → subprocess the C++ capture binary (CLI/config per example) →
  read the emitted `.h5` → assert the invariant on the captured state. This tests
  the ACTUAL C++ sim (faithful to "verify post-hoc on captures") at the cost of
  per-example subprocess latency — bound Hypothesis `max_examples` accordingly.
  (Alternative — a thin Python XPBD reference for PBT only — re-implements physics
  in Python and risks divergence; NOT preferred.) Decide the exact mechanism at
  Stage 1a probe; surface STOP-PBT-WIRING only if neither is reconcilable.

### D-LAYOUT — `packages/mass-spring-cloth/`  ✅ LOCKED (§0.3 + RD-2D-Stack-C precedent)
Flat `packages/mass-spring-cloth/` with `src/` + `include/bit_physics/mass_spring_cloth/`
+ `shaders/*.comp` + `tests/` (NO `cpp/` subdir; NO top-level `soft-body/` code
folder), registered in the top-level `CMakeLists.txt` after `common-cpp`. Sim-spec
doc path keeps the category: `docs/sim-specs/soft-body/mass-spring-cloth/`.

### D-CI — `cpp-strict.yml` `test-mass-spring-cloth` job  ✅ RESOLVED-IN-CHARTER (§0.3)
`build-cpp.yml` does not exist. Mirror the RD-2D-Stack-C ctest job in
`.github/workflows/cpp-strict.yml`: apt toolchain (cmake/g++/mesa-vulkan-drivers/
vulkan-tools/libvulkan-dev/glslang-tools/libhdf5-dev) → setup-uv + testkit
`uv sync --extra dev` → lavapipe probe → `cmake -S . -B build/cpp` →
`cmake --build build/cpp -j` → `ctest --test-dir build/cpp --output-on-failure`
(lavapipe `VK_DRIVER_FILES`/`LP_NUM_THREADS=0` via CTest `ENVIRONMENT`) → selective
LFS pull for `captures/mass-spring-cloth-ref/**` guarded by §Q.4 R2 opt-in.

### D-MANIFEST-FMT — `references/PositionBasedDynamics/MANIFEST.toml`  ✅ RESOLVED-IN-CHARTER (§0.3)
TOML, validated against `tools/testkit/schemas/reference-manifest-v1.json`
(required sections `[upstream]` {name,version,sha,url,license,license_file},
`[scope]` {purpose,used_by_sims,used_by_checks}, `[vendoring]` {fetched_utc,
fetched_by,fetch_command}; optional `[[citations]]` rows for the Macklin-2016
constraint refs). Mirror the Chakazul-Lenia citation-anchor style.
`used_by_sims = ["soft-body/mass-spring-cloth"]`, `used_by_checks = ["cat1.upstream-citation"]`.
NOT `manifest.yaml` (the stale §6.5 G / plan §2.11 prose).

### D-TOL — single-stack `golden_tolerance` (§S.3, cloth EXPLICITLY enumerated)  ✅ RESOLVED-IN-CHARTER (§S.3)
§S.3 shape 3 (`docs/conventions/sub-phase-conventions.md`) **explicitly names**
`mass-spring-cloth: position_abs, catenary_shape_rel` as a single-stack
golden-table sim landing under `[golden_tolerance.<category>.<sim>]`. The schema
(`tolerance-schema.json` `golden_tolerance` branch) already accepts the
(category, sim) two-level nesting with bespoke number/bool/string keys — **no
schema extension needed**. Land `[golden_tolerance.soft-body.mass-spring-cloth]`
with `position_abs` + `catenary_shape_rel` (+ any convergence/energy key Stage 1b
finds necessary). **NO `[budgets.soft-body.cross_stack]` cap** (single-stack
terminal sim, no cross-stack pair — exactly like rigid-body/ising/lenia); **NO
§2.6 amendment** (no-widening governs the values, no budget edit triggers the
ceremony). §S.2: read schema + one existing `golden_tolerance` entry BEFORE
writing the row (Stage 1b).

### D-CAPTURE-API — common-cpp C++ `Hdf5Writer` + `Manifest`  ✅ RESOLVED-IN-CHARTER
NOT Python `common_py.capture.Writer` (lenia) nor Warp `Capture`+`write_capture`
(rigid-body). Stage 1: accumulate per-step pose arrays; build
`capture::Manifest` (schema_version "1.0.0"; dtype "f64"; determinism.claimed per
D-DET); `Hdf5Writer(manifest_path, m)` → `write_step(step, StepData)` per step →
`finalize()` (writes `.h5` + `.json` sidecar w/ sha256). HDF5 layout per spec
D.2.5 (`/steps/{N}/state/{field}`).

### D-TAG — NO  ✅ LOCKED
Per-sub-phase tagging discontinued mid-Phase-3. One operator-pushed annotated tag
`v0.3.0-phase-3` at Phase-3 close (task-10). Agent stages/pushes no tag.

---

## § 7 — Thirteen-gate acceptance map (spec §3.5 v2.4)

This is a **sim** (not a testkit surface) → it introduces **no new
mutation-testing target** (mutation = task-1/2/9 territory; §6.0 item 12). There
is **no gate-14**: cloth is a **single-stack terminal** sim (no cross-stack
equivalence pair; absent from Phase 1/2; no downstream consumer per plan §3.1).
(RD-2D-Stack-C ships a gate-14 ctest only because it is a *port* of a Phase-1 sim
with an existing other-stack twin; cloth has none.)

| Gate | Spec §3.5 | Specialization for mass-spring-cloth |
|------|-----------|--------------------------------------|
| 1 | spec sheet + §6 verification posture | spec-ref §6: golden positions / XPBD-iteration convergence / catenary-limit model-validation / determinism class |
| 2 | pre-impl probe report | `tools/testkit/probes/reports/mass-spring-cloth.md` |
| 3 | failing acceptance suite + output sha256 in footer | `failing-tests-evidence/mass-spring-cloth-<UTC>.txt` (ctest output); footer hash; gate-13 replays |
| 4 | golden-value tests pass (Cat 3), ≥3 independent anchors | E goldens; **3 anchors per D-ANCHOR** (Beer&Johnston Ch7 cable / hand-derivation / M&T §6.6 variational); Bender ≠ an anchor (oracle only, §2.4) |
| 5 | Tier-1 diagnostics | inherited testkit Tier-1 |
| 6 | category Tier-2 diagnostics | soft-body / particle Tier-2 as applicable |
| 7 | citation chain (Cat 1) | `cat1.upstream-citation` — vendored Bender SHA + Macklin 2016 cite resolve |
| 8 | public API (Cat 2) | `mass_spring_cloth` C++ public surface + CMake targets resolve |
| 9 | ships replayable capture | `flag-wind-128x128-seed42-step1000.{h5,json}` |
| 10 | determinism decl consistent w/ capture | D-DET registry row ↔ capture sidecar `claimed` |
| 11 | PBT of declared invariants (§2.14) | `length_bounded_above` + `momentum_conservation_free_no_gravity` |
| 12 | first-landing wall-clock in perf-ledger | `docs/perf-ledger.md` row (do NOT silently omit — S2-RD2C1 lesson) |
| 13 | landing replays failing tests; hash matches | gate-3 ctest hash re-witnessed at Stage 2 |

(**Mutation gate: N/A** — sim, not testkit surface. **Gate-14: N/A** — single-stack terminal.)

---

## § 8 — Convention operationalization (§Q / §R / §S / §S.5 / §S6)

**§Q — R2-LFS Stage-0 bootstrap.** This sub-phase commits
`phase-3-mass-spring-cloth.h5` (schema-corpus fixture) + the canonical
`captures/mass-spring-cloth-ref/flag-wind-128x128…h5` → it **IS LFS-touching** →
§Q.3 bootstrap (`source tools/lfs/setup-lfs-s3-local.sh`) is the Stage-0 first
action after the anchor probe; non-zero return = STOP-LFS-PUSH surfaced. §Q.4
wires the CI selective-pull opt-in in the `cpp-strict.yml` `test-mass-spring-cloth`
job; §Q.5 back-fills R2 by landing — **`git -c lfs.standalonetransferagent= push`
for GitHub + `source … && git lfs push --object-id --stdin origin` for R2, in the
SAME shell command** (the ising-classical FRICTION #4 root-cause fix; fresh shells
don't inherit the creds env). (Plan-drafting commits are docs-only → no §Q action
at THIS stage.)

**§R — integrity measure-don't-copy (two-field).** The **count (0 HF / 14 SW) is
the invariant**; `integrity_digest_at_head` is a **per-HEAD measurement,
informational, expected to drift** as this sub-phase adds golden tables + a
fixture + a vendored reference. Every audit measures the digest live (sha256 of
the full `--all --mode strict` **stderr** report) and records BOTH
`integrity_invariant` + `integrity_digest_at_head`; never copies a prior digest.
(Measured this session: `0 HF / 14 SW`, digest `f5b7eea1…070bb3` at `be3e468`.)

**§S — tolerance-schema follows the schema, not plan prose.** §S.2 — read
`tolerance-schema.json` + ≥1 existing `golden_tolerance` entry BEFORE appending.
Pre-resolved as **D-TOL** (§6): the landing slot is the existing `golden_tolerance`
branch (cloth's keys are §S.3-enumerated) — no new top-level block, no STOP-SCHEMA-FIT.

**§S.5 — post-push CI sweep (full workflow set).** At every Stage-1b/landing push:
`gh run list --commit "$(git rev-parse HEAD)" --limit 30` + per-job conclusion
sweep; investigate ANY red (incl. `cpp-strict.yml/test-mass-spring-cloth`,
`integrity.yml`, `equivalence.yml`, `tolerance-budget-check.yml`) before declaring
the stage landed. STOP-CI-RED on any red at the chain-tip SHA, regardless of
relevance.

**§S6 — real sha256 in evidence_hashes, no placeholders.** Every audit's
`evidence_hashes` is a YAML **mapping** (path → real measured sha256, or the
`at-head` sentinel `verify_evidence` resolves at the audit commit); **never** a
fabricated/placeholder hash and **never** the `: self` sentinel (verify_evidence
rejects it — common-3dgs BLOCKED-audit precedent). The failing-tests ctest-output-
hash footer carries a real sha256.

---

## § 9 — Execution-session agent prompts (operator pastes next)

### Stage 0 prompt
```
RESUME — task-5 mass-spring-cloth EXECUTION, Stage 0 (operator-ratified charter).
Charter: docs/phases/sub-phase-phase-3-mass-spring-cloth.md. Trunk-based to main; D-TAG NO.
Ratified D-class outcomes (operator fills in): D-VENDOR-ROLE=<oracle|runtime-link>;
  D-VENDOR-SHA=<2.2.0 aa62c44f | master d0894bdb>; D-DET=<measure; default bit-exact>;
  D-ANCHOR=<corrected set: Beer Ch7 / hand-deriv / M&T §6.6>; D-PBT=<length_bounded_above +
  momentum_conservation_free_no_gravity; wiring=subprocess-capture-binary>.
ACTION 1: preflight-phase.py 3 (expect genuine exit 0, hardened 1793b83; real exit 1 → STOP-PREFLIGHT-NEW).
ACTION 2: anchor probe — `uv run python -m integrity --all --mode strict` (expect 0 HF / 14 SW;
  measure digest, §R two-field; do NOT copy — at be3e468 it was f5b7eea1…070bb3).
ACTION 3 (§Q.3, FIRST after probe): `source tools/lfs/setup-lfs-s3-local.sh` — non-zero → STOP-LFS-PUSH.
ACTION 4: cross-phase replay --prior-phase phase-2 (expect ok=True; LFS-smudge recovery if needed).
ACTION 5: verify_evidence sweep across prior phase-3 audits (0-fail).
ACTION 6: vendor Bender at the ratified SHA → references/PositionBasedDynamics/ (read-only) + MANIFEST.toml
  (schema-validated) + license(MIT)/security check. License change → BLOCKED.
Then proceed to Stage 1a (scaffold + RED). STOP and surface on any STOP-* fired.
```

### Stage 1 prompt (1a → 1b → 1c)
```
Stage 1 — implement mass-spring-cloth per charter §3 + ratified D-classes.
1a: packages/mass-spring-cloth/ (src/include/shaders/tests; CMake gated on common_cpp_vulkan+hdf5,
  registered in top-level CMakeLists.txt); spec-ref + derivation skeletons; RED doctest TDD
  (hanging catenary-limit / stretched linear-elastic / at-rest) → failing-tests-evidence (ctest
  2>&1|tee) + sha256 footer (gate-3); determinism registry DEFAULT row [soft-body.mass-spring-cloth].
1b: Vulkan XPBD (distance+bending; Gauss-Seidel; compliance↔stiffness per Macklin 2016) + substeps +
  CLI; golden tables E (32×32 catenary-limit) + derivation F (3 anchors per D-ANCHOR; catenary-LIMIT
  regime note; Bender≠anchor); Tier-3 H; PBT (length_bounded_above, momentum_conservation_free_no_gravity)
  via subprocess-capture-binary wiring; shared-file J updates. §S.2: read tolerance-schema.json + one
  golden_tolerance entry BEFORE the row; land [golden_tolerance.soft-body.mass-spring-cloth] (per D-TOL).
  MEASURE D-DET (assert_deterministic_run tolerance=0.0, LP_NUM_THREADS=0); re-characterize if GS forces it.
  RED→GREEN witness footer. NO mutation baseline (sim, not testkit surface).
1c: PBT confirm; verify_evidence; integrity §R two-field; perf-ledger row (gate-12, do NOT omit);
  canonical capture + fixture .h5 + §Q.3/§Q.5 R2 push & back-fill (SAME shell); §S.5 full-workflow sweep.
STOP and surface on HARD RULE 2 (anchor falsified, surface missing, schema mis-fit, threshold-widen
  pressure, determinism re-characterization, PBT regime falsification).
```

### Stage 2 prompt
```
Stage 2 — landing audit docs/_audits/phase-3/task-5-mass-spring-cloth.md.
§R two-field integrity (0 HF / 14 SW invariant + measured digest); replay; append-only; verify_evidence
(incl. this sub-phase's prior stage audits, 0-fail); §S.5 full-workflow CI sweep green at HEAD (incl.
test-mass-spring-cloth + R2/LFS capture pull). Close per §2.15 (closed-with-shifted-N if D-DET
re-characterized, D-PBT re-declared, D-NAMING corrigendum, or any SHIFTED item). NO tag (D-TAG NO).
progress.md final entry. Convention-#12 SHA back-fill.
```

---

## § 10 — Audit / report paths (spec §8.1, mirror rigid-body/ising/lenia)

- Charter: `docs/phases/sub-phase-phase-3-mass-spring-cloth.md` (this file).
- Plan-drafting: probe `…mass-spring-cloth-probe-<UTC>.md`; landing audit
  `…mass-spring-cloth-plan-drafting-<UTC>.md`; both under `docs/_audits/phase-3/`.
- Execution per-stage: `…mass-spring-cloth-stage-{0,1a,1b,1c}-<UTC>.md`.
- Final report: `docs/_audits/phase-3/task-5-mass-spring-cloth.md`.
- sim-spec: `docs/sim-specs/soft-body/mass-spring-cloth/{spec-ref.md, …}`; golden
  derivation `tools/testkit/golden/derivations/cloth-catenary-limit.md`.
- Audit front-matter: §R two-field + §7.5 fields; `evidence_hashes` as a YAML
  **mapping** (not a list); `at-head` sentinel accepted by verify_evidence.

---

## § 11 — Closing criteria & operator-ratification items

**Charter verdict (v2): RESOLVED** — all five formerly-open D-classes operator-
ratified at execution Stage 0 (2026-05-29); execution underway (Stage 0 → 2
combined):
1. **D-VENDOR-ROLE** ✅ — vendored READ-ONLY reference-oracle + reimplement XPBD
   from Macklin 2016 (no FetchContent/runtime-link). Bender 2.2.0 vendored
   read-only at Stage 0; cross-check oracle only.
2. **D-VENDOR-SHA** ✅ — Bender `2.2.0` (`aa62c44f…`, spec D.3 "Latest stable",
   re-verified live `gh release view`, MIT); §2.18 master-HEAD `d0894bdb`
   discrepancy → spec-amendments **A-3** (operator reconciles; NO plan edit).
3. **D-DET** ✅ — MEASURE; DEFAULT bit-exact / same-stack-same-hw row at 1a,
   lavapipe serial Gauss-Seidel (`LP_NUM_THREADS=0`), MEASURE at 1b, characterize
   honestly (re-characterization is a legitimate closed-with-shifted outcome).
4. **D-ANCHOR** ✅ — catenary equation correct; corrected cites grep-verified at
   1b (Symon §10.2 WRONG, M&T §6.4→§6.6, Beer Ch7 not "Table 7.2"); catenary-LIMIT
   regime caveat (converge stiffness, NO widening); NO plan edit.
5. **D-PBT** ✅ — `length_bounded_above` + `momentum_conservation_free_no_gravity`
   (FREE cloth only); wiring = Hypothesis→subprocess-capture-binary→.h5→assert
   (first C++-sim Python-PBT). D-NAMING corrigendum → **A-2**.

RESOLVED-IN-CHARTER (no operator action): D-LAYOUT (`packages/mass-spring-cloth/`),
D-CI (`cpp-strict.yml`), D-MANIFEST-FMT (`MANIFEST.toml`), D-TOL
(`[golden_tolerance.soft-body.mass-spring-cloth]`, §S.3-enumerated), D-CAPTURE-API
(C++ `Hdf5Writer`), D-NAMING (canonical `mass-spring-cloth`; `cloth-xpbd`
corrigendum), D-TAG (NO). No new mutation target. No gate-14 (single-stack
terminal). No new tolerance-schema branch. No tolerance-budget amendment. USD
cleanly out-of-scope (cloth is Stack C, not Stack E — §2.5 does not bind). One new
`.h5` fixture + one canonical capture → LFS-touching (§Q applies at execution).
**Cloth is TERMINAL** — no downstream consumer-site obligation (plan §3.1). Sub-phase
closes `closed-with-shifted-N` per §2.15 if any of D-DET-recharacterize /
D-PBT-redeclare / D-NAMING-corrigendum / D-ANCHOR-cite-correction lands as a SHIFT.
No tag.
