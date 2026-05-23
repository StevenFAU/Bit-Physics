---
date: 2026-05-23T15-37-24Z
author: capture-determinism-contract-sub-phase-plan-drafting-agent
phase: 2
artifact: block
artifact_id: sub-phase-capture-determinism-contract-plan-drafting-probe
subject: "Plan-drafting probe — anchor-source synthesis + exhaustive byte-equality test inventory + h5wasm 0.10.1 surface inventory + 9-sim determinism-contract inventory + D1-D5 surface preview for the second spec-Phase-2 sub-phase (capture-determinism-contract)"
head_sha: 412b1b90b21957ecf3c07db690e8c64ab24386f1
head_sha_at_checkpoint: 412b1b90b21957ecf3c07db690e8c64ab24386f1
parent_audits:
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - tools/testkit/schemas/capture-v1.json
  - tools/testkit/capture/writer.py
  - tools/testkit/determinism/harness.py
  - common/common-ts/examples/hello-physics/hello-physics.test.ts
  - common/common-ts/examples/hello-physics/run.ts
  - packages/lattice-boltzmann-d3q19/tests/test_determinism.py
  - packages/mpm-multimaterial/tests/test_determinism.py
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
---

# Capture-Determinism-Contract Sub-Phase — Plan-Drafting Probe

## § 1. Anchor-probe enumeration (11 steps verified)

| # | Anchor | Status | Notes |
|---|---|---|---|
| 1 | `docs/conventions/sub-phase-conventions.md` (post-refactor canonical) | **sha256 VERIFIED** `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` matches conventions-refactor landing § 3.2 + Taichi-integration landing evidence_hashes. Locked. Authoritative for charter structure. |
| 2 | `docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md` | **READ.** Cumulative shift count entering this sub-phase: **99**. D2 row 2 (common-py adoption) RESOLVED at Taichi-integration close. Newly banked items 7 (verify_evidence empty-file rejection, N6) and 8 (Taichi smoke kernel patterns) carried. The § 10 next-sub-phase recommendation (RD-2D → Stack D first; spec item 2.1.D) is **superseded by this sub-phase's existence** because the determinism contract is structurally upstream of any further Stack-D port. |
| 3 | `docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md` | **READ.** Structural template for portfolio-wide consolidation sub-phases (§ 1 scope, § 3 deliverables, § 6 test sweep at portfolio scale, § 7 integrity sweep posture, § 8 shift accounting). The capture-determinism-contract sub-phase inherits this template's shape adapted to the contract-redesign deliverable. |
| 4 | `docs/phases/sub-phase-conventions-refactor-post-phase-1.md` | **READ.** § 1 scoping discipline + § 2 8-item deliverable table + § 4 three-stage cadence (with Stage 1 monolithic + two-commit fallback) + § 11.5 operator-routable items shape. **Primary charter template** for this sub-phase, adapted. |
| 5 | Diagnostic agent's report | **NOT FOUND** as standalone markdown anywhere in `docs/`, `.claude/`, or `/tmp/`. The pre-Stage-0 diagnostic-only session's findings exist only in chat-shared form (the dispatch context). **RE-DERIVED via boundary-delay probe** by the plan-drafting-probe research subagent. Re-derived findings preserved in this report § 4 with attribution to the originating diagnostic session for the structural-correctness chain; numerical specifics here are FACT-tagged against the re-derivation. |
| 6 | `docs/architecture.md` § 2.5 (Determinism harness) + § 2.7 (Capture format) | **READ.** Section-numbering at HEAD: § 2.5 starts at line 375; § 2.7 starts at line 447. **Important correction to dispatch context:** the load-bearing determinism-contract wording lives in **§ 2.5**, not § 2.7. § 2.7 declares the capture FORMAT (manifest schema, payload structure, `payload.checksum` field). § 2.5 says the contract: *"A simulation is deterministic if it produces bit-identical output when run twice with the same seed on the same hardware."* (line 377). The phrase "bit-identical output" is ambiguous between raw-file and content-projection and is the load-bearing amendment site. § 2.7 also requires light amendment to clarify whether `payload.checksum` denotes raw-file sha256 (current) or content-normalized sha256 (post-amendment). |
| 7 | `tools/testkit/schemas/capture-v1.json` | **READ verbatim** (100 lines). `payload.checksum` pattern `^sha256:[0-9a-f]{64}$`; currently computed via `_sha256_of_file(payload_path)` at `tools/testkit/capture/writer.py:69` — i.e., raw-file sha256, which embeds HDF5 wall-clock timestamps in object headers. `determinism.claimed` enum `["bit-exact-same-hw", "epsilon", "non-deterministic"]` — unchanged surface. **Schema-amendment scope:** payload.checksum semantics description (description-only, no field-shape change). |
| 8 | Exhaustive byte-equality test inventory | **COMPLETE.** See § 2 below. **3 VULNERABLE, 7 IMMUNE, 0 UNCLEAR** across the full repo. The 7 IMMUNE consume `tools/testkit/determinism/harness.py::run_twice_and_diff` which compares parsed `Capture` objects via `np.array_equal` (NOT raw bytes), despite the docstring's "bit-exact" terminology. |
| 9 | 9-sim determinism-contract inventory | **COMPLETE.** See § 3 below. **No per-sim `determinism.md` files exist** in any of the 9 Phase-1 sim packages — determinism claims live in `<sim>/src/<sim>/sim.py` module docstrings. **7 sims content-equivalent via harness; 2 sims (LBM + MPM) byte-equivalent via `_sha256_of_file`.** |
| 10 | h5wasm 0.10.1 surface inventory | **COMPLETE.** See § 4 below. **`H5Pset_obj_track_times` is genuinely absent** from the WASM blob (confirmed via `strings | grep -i obj_track`). The h5wasm dist exposes a high-level `Module.create_dataset / create_group / ...` C-wrapper API, not direct H5P* cwraps. **Emscripten `_emscripten_date_now` is overridable** at `Module._emscripten_date_now` post-init, OR via global `Date.now` shim during the capture-write window. This is the cleanest TS-side normalization pathway. |
| 11 | Phase 4 WU-A schema-bump round-trip corpus expectation | **VERIFIED at `docs/phases/phase-4-plan.md`** lines 14, 40, 1590. The round-trip claim wording: *"every state array preserved bit-for-bit; every manifest field preserved"* (line 1590). **This is content-level**, not file-level — `state array preserved bit-for-bit` refers to the NumPy array's bytes after deserialization, which the Python harness's `np.array_equal` already implements. **Phase 4 WU-A is consistent with the content-equivalent contract** this sub-phase establishes; no amendment of WU-A scope is needed. The "additive schema bumps are non-breaking" claim survives unchanged. |

(FACT — all 11 anchors verified at HEAD `412b1b90b21957ecf3c07db690e8c64ab24386f1`.)

---

## § 2. Exhaustive byte-equality test inventory

(FACT — exhaustive grep across `packages/`, `common/`, `tools/`, `tests/` for `Buffer.equals` / `.equals(` on file reads / `hashlib.sha256` on `read_bytes` / `filecmp.cmp` / `np.array_equal` on raw bytes / per-sim `test_*_bit_exact` / `test_*_deterministic` patterns. Performed by Explore subagent + verified verbatim against source files.)

### § 2.1 VULNERABLE tests (3 total)

| # | File:line | Test name | Mechanism | Rationale |
|---|---|---|---|---|
| V1 | `common/common-ts/examples/hello-physics/hello-physics.test.ts:22-28` | `is bit-deterministic across two runs at the same seed` | `payloadA.equals(payloadB)` on `readFileSync()` outputs | Compares raw HDF5 byte buffers. h5wasm 0.10.1's WASM HDF5 library embeds wall-clock mtime in every OHDR (Object Header v2; ~3 timestamps per object × ~9+ object headers visible in 51200-byte payload). 184 bytes differ across the second-boundary. **This is the CI-failing test that motivated this sub-phase.** |
| V2 | `packages/lattice-boltzmann-d3q19/tests/test_determinism.py:50-71` | `test_run_twice_bit_exact_canonical` | `_sha256_of_file(a_payload) == _sha256_of_file(b_payload)` | Direct sha256 of `.h5` file content; embeds h5py's `track_times=True` HDF5 object-header timestamps. Currently passes by chance (same wall-clock second) within the gate-13 worktree replay window; structurally vulnerable to the identical flake. |
| V3 | `packages/mpm-multimaterial/tests/test_determinism.py:45-65` | `test_run_twice_epsilon_diff` | `_sha256_of_file(a_payload) == _sha256_of_file(b_payload)` | Identical pattern to V2 (verbatim helper function `_sha256_of_file` duplicated; same file-sha256 assertion). Same structural vulnerability. |

### § 2.2 IMMUNE tests (7 total — all consume the harness)

| # | File:line | Test name | Mechanism | Rationale |
|---|---|---|---|---|
| I1 | `packages/strange-attractors/tests/test_determinism.py:20-24` | `test_run_twice_bit_exact` | `run_twice_and_diff()` → `diff_captures(mode="bit-exact")` → `np.array_equal()` on parsed Capture objects | Harness loads captures via `load_capture()`, parses `/steps/{N}/state/{field_name}` into NumPy arrays, and compares element-wise. **Timestamps in HDF5 object headers are never read.** |
| I2 | `packages/mandelbulb-explorer/tests/test_determinism.py:18-22` | `test_run_twice_bit_exact` | (same harness) | |
| I3 | `packages/boids-3d/tests/test_determinism.py:22-35` | `test_run_twice_bit_exact` | (same harness) | |
| I4 | `packages/physarum/tests/test_determinism.py:27-39` | `test_run_twice_bit_exact_zero_trail_limit` | (same harness) | |
| I5 | `packages/reaction-diffusion-3d/tests/test_determinism.py:21-27` | `test_run_twice_bit_exact` | (same harness) | |
| I6 | `packages/sph-water/tests/test_determinism.py:40-48` | `test_run_twice_epsilon_diff` | (same harness with `sim_runner_diagnostic`) | |
| I7 | `packages/eulerian-smoke/tests/test_determinism.py:48-57` | `test_run_twice_epsilon_diff` | (same harness with `sim_runner_diagnostic`) | |

### § 2.3 Inventory summary

**Total determinism-grade tests: 10.** Of these:
- **3 VULNERABLE** (hello-physics TS + LBM Python + MPM Python).
- **7 IMMUNE** (all via `run_twice_and_diff` harness).
- **0 UNCLEAR.**

**Critical correction to dispatch-context framing**: the structural-fix scope is **smaller than the dispatch context implies**. The Python `run_twice_and_diff` harness ALREADY implements the content-equivalent contract (parses Capture objects + `np.array_equal`), despite the harness's docstring + `DeterminismVerdict.bit_exact` field-naming using "bit-exact" terminology. The sub-phase deliverable is therefore:

1. **Elevate the Python harness as the canonical project-wide contract** (rename `bit_exact` → `content_equivalent`; update docstrings; expose the harness as the SINGLE source of truth for "two captures are determinism-equivalent").
2. **Build the TypeScript counterpart** — `CaptureReader` (parse h5wasm + extract `/steps/{N}/state/...` arrays) + `diffCaptures` + `runTwiceAndDiff` mirror of the Python API.
3. **Refactor V2 + V3 (LBM + MPM)** to consume the harness (drop `_sha256_of_file`).
4. **Refactor V1 (hello-physics.test.ts)** to consume the new TS harness.
5. **Amend spec § 2.5 + § 2.7 + capture-v1.json + conventions doc § F.3 + § A.2** to reflect the contract semantics + sweep-template extension.
6. **Optional belt-and-suspenders**: pin h5py's `track_times=False` on the Python `CaptureWriter` (cheap, principled); pin h5wasm's `_emscripten_date_now` via `Date.now` shim on the TS `CaptureWriter` (cheap, principled). This is a defense-in-depth pass — the contract amendment makes it non-load-bearing, but it eliminates the latent flake at the source rather than just at the contract surface.

The blast radius is **substantially smaller than the dispatch-context anticipated**. See § 8 (D1) for the Stage 1 monolithic vs sub-decomposition lean derivation.

---

## § 3. 9-sim determinism-contract inventory

(FACT — per-sim `sim.py` module docstrings + test files verbatim.)

| Sim | Claimed posture (sim.py docstring) | Spec posture (architecture § 2.6 table) | Test mechanism | VULNERABLE? | Refactor required? |
|---|---|---|---|---|---|
| **strange-attractors** | bit-exact-same-hw | bit-exact (Closed-form row) | harness | NO | No |
| **mandelbulb-explorer** | bit-exact-same-hw | bit-exact (Closed-form row) | harness | NO | No |
| **boids-3d** | bit-exact-same-hw | bit-exact (Boids row) | harness | NO | No |
| **physarum** | bit-exact-same-hw (zero-trail) | bit-exact (Boids/Physarum row) | harness | NO | No |
| **reaction-diffusion-3d** | bit-exact-same-hw | bit-exact (Reaction-diffusion row) | harness | NO | No |
| **sph-water** | bit-exact-same-hw (over-achievement; spec posture epsilon for Stack-C) | epsilon (SPH row) | harness | NO | No |
| **eulerian-smoke** | bit-exact-same-hw (over-achievement) | epsilon (Stam/Fedkiw row) | harness | NO | No |
| **lattice-boltzmann-d3q19** | bit-exact-effort-same-stack-same-hw (over-achievement on Python NumPy reference) | bit-exact-effort (LBM row) | **`_sha256_of_file`** | **YES** | **YES** — refactor to harness |
| **mpm-multimaterial** | epsilon-same-stack-same-hw (Stack-D Taichi posture; Python NumPy + numba reference over-achieves bit-exact per docstring) | epsilon (MPM row) | **`_sha256_of_file`** | **YES** | **YES** — refactor to harness |

**Key observations:**

- **No per-sim `determinism.md` files exist.** All determinism claims live in `<sim>/src/<sim>/sim.py` module docstrings. The dispatch context's "each sim's determinism.md declaration" framing does not match HEAD — the declarations live elsewhere. **D3 surface-count is therefore: 2 sims need TEST refactor; 0 sims need DECLARATION refactor** (the declarations don't reference byte-equality at the mechanism level; they declare posture (bit-exact / epsilon / etc.) which is mechanism-agnostic).
- **The `claimed:` field in capture-v1.json's manifest** also encodes posture, not mechanism. No schema change required for the posture surface.
- **The 2 VULNERABLE Python tests share a verbatim copy-paste of `_sha256_of_file`** (LBM lines 42-47; MPM lines 37-42; identical bodies). **This is itself worth one-line consolidation in the harness once they refactor to consume `run_twice_and_diff`** (the helper becomes dead code after the refactor; remove it).

---

## § 4. h5wasm 0.10.1 surface inventory

(FACT — re-derivation by plan-drafting-probe research subagent; cross-validated against the `node_modules/h5wasm/` dist + `strings(1)` against the WASM blob.)

### § 4.1 H5P* binding surface

The h5wasm 0.10.1 `dist/esm/hdf5_hl.js` userland API does **NOT directly bind any `H5P*` function**. The high-level surface is `Module.create_dataset / create_attribute / create_group / set_dataset_data / flush / ...` — all property-list operations are routed inside the WASM blob via a C-wrapper layer.

Full HDF5 H5P symbol set inside the compiled WASM (per `strings node_modules/h5wasm/dist/esm/hdf5_util.wasm | grep '^H5P'`): `H5Pcreate`, `H5Pset_chunk`, `H5Pset_filter`, `H5Pset_libver_bounds`, `H5Pset_relax_file_integrity_checks`, `H5Pmodify_filter`, `H5Pget_*` family, and the rest of the routine HDF5 property-list surface — **but `H5Pset_obj_track_times` is NOT present anywhere in the WASM strings table**. (Confirmed by `strings ... | grep -i obj_track` → empty.)

**Implication:** disabling mtime tracking via `H5Pset_obj_track_times` is structurally impossible with the h5wasm 0.10.1 WASM build at HEAD. The function is genuinely absent from the binary, not merely un-bound at the JS layer. Binding it would require modifying h5wasm's C wrapper and rebuilding the WASM blob — an upstream contribution + version pin bump, NOT a one-liner.

### § 4.2 Emscripten time-source override (the principled TS-side fix)

The h5wasm WASM imports `emscripten_date_now` and `clock_time_get`. JS shim definitions in `hdf5_util.js`:
- `_emscripten_date_now = () => Date.now()`
- `_clock_time_get(clk_id, ..., ptime)` for `clk_id === 0` (CLOCK_REALTIME) routes through `_emscripten_date_now()`.

**Three viable normalization paths**, in increasing principled-ness:

| Path | Mechanism | Cost | Principled? |
|---|---|---|---|
| **(a) Global `Date.now()` monkey-patch** during the capture-write window | `const realNow = Date.now; Date.now = () => FROZEN_EPOCH_MS; try { writer.finalize(); } finally { Date.now = realNow; }` | Trivial; no h5wasm internals touched | Cheap. Affects only the calling thread's `Date.now`; the WASM JS shim closes over the global. |
| **(b) Patch `Module._emscripten_date_now` post-init** on the loaded h5wasm module | `(h5wasm.Module as any)._emscripten_date_now = () => FROZEN_EPOCH_MS;` | Trivial; touches h5wasm internals via dynamic cast | More targeted than (a); doesn't perturb host `Date.now` for callers. |
| **(c) Post-write byte-level normalization** of OHDR mtime fields in the produced `.h5` | Walk the HDF5 file, find every OHDR header (signature `"OHDR"` 0x4f48 4452), zero the 4-byte mtime + recompute checksums | Substantial; HDF5 internals + checksum recompute | Most invasive; not recommended. |

**Probe-time lean: (b)** — touches only the capture-writer module's internal h5wasm initialization; preserves caller-side `Date.now`. The plan-drafting-probe research subagent verified the mechanism works in principle. Stage 1 finalizes the choice.

**Belt-and-suspenders + Python side (h5py):** `h5py.File(..., "w").create_group("...", track_times=False)` AND `h5py.File(..., libver='earliest', track_order=False)` AND per-dataset `create_dataset(..., track_times=False)`. h5py exposes this directly; the Python fix is a one-line addition to `tools/testkit/capture/writer.py:51` + each `create_group` call within. Cheap; recommended even if the harness-based contract makes it non-load-bearing.

### § 4.3 Boundary-delay probe re-derivation (numerical confirmation)

(FACT — re-derived at HEAD `412b1b9`; preserved in re-derivation output via the plan-drafting-probe research subagent.)

- Two runs separated by 1.5 s wall-clock (Δsec = 2): **51200 bytes file size; 183 bytes differing**, clustered in 4-byte little-endian (NOT big-endian — dispatch-context correction) Unix-epoch mtime regions following each OHDR signature.
- 9+ OHDR signatures visible in first 0x4800 bytes; each carries 3 timestamps (access/mod/birth) per OHDR v2 format → ~108 mtime bytes + 75 cascade-checksum bytes ≈ 183.
- Matches the dispatch context's "~184" claim within 1 byte (counting variance).
- Reproducible across runs at HEAD; deterministic-modulo-second-boundary.

### § 4.4 Attribution

The originating diagnostic-only session is the source of the structural-causation narrative (HDF5 OHDR mtime; h5wasm 0.10.1 surface limitation; latency since `4f97e6b`). The plan-drafting-probe research subagent re-derived the empirical claims at HEAD with two corrections:
1. mtime byte-order is **little-endian** on this build, not big-endian.
2. The h5wasm 0.10.1 dist exposes **no cwrap-style H5P* surface at all** — it bundles a high-level C wrapper. The "missing binding" framing is technically more accurate as "missing WASM symbol."

Both corrections sharpen the diagnosis; neither invalidates the structural fix scope.

---

## § 5. Spec § 2.5 / § 2.7 + capture-v1.json + conventions doc § F.3 amendment scope

(FACT — verbatim section reads at HEAD `412b1b9`.)

### § 5.1 Spec § 2.5 (Determinism harness) — current verbatim

> *"A simulation is deterministic if it produces bit-identical output when run twice with the same seed on the same hardware. Cross-hardware and cross-stack determinism are looser categories, handled in §2.6."*

(architecture.md:377)

**Amendment site:** the phrase "produces bit-identical output" is ambiguous between (a) raw capture-file byte equality and (b) content-projection equality. Stage 1 deliverable: amend wording to resolve the ambiguity in favor of (b) with an explicit normalization clause.

**Candidate wordings** — surface to operator at D2 (NOT pre-committed):

- **D2-a (narrow):** *"A simulation is deterministic if its captured state — when read back via the canonical Capture reader — is bit-identical across two runs at the same seed on the same hardware. Equivalent term: content-deterministic. Wall-clock-influenced metadata in the underlying storage format (e.g., HDF5 object-header timestamps) is explicitly OUTSIDE the content projection and is NOT required to match between runs."*
- **D2-b (mechanism-explicit):** *"A simulation is deterministic if `tools/testkit/determinism::run_twice_and_diff` (Python) or `@bit-physics/common-ts::runTwiceAndDiff` (TypeScript) returns `content_equivalent = true` across two runs at the same seed on the same hardware. The harness is the canonical determinism contract; mechanism details (which fields are projected, how arrays are compared) are documented at `tools/testkit/determinism/policy.md`."*
- **D2-c (project-onto-Capture):** *"A simulation is deterministic if every state array and diagnostic entry in its canonical Capture is bit-identical (`np.array_equal` / equivalent) across two runs at the same seed on the same hardware. Storage-format metadata (HDF5 object-header timestamps, file-system mtime, compression headers) is excluded from the comparison."*

### § 5.2 Spec § 2.7 (Capture format) — current verbatim relevant clauses

> *"**Payload structure** (HDF5): `/steps/{N}/state/{field_name}` — array per simulated field per captured step. `/steps/{N}/diagnostics/{check_name}` — Tier 1 diagnostic values per step. `/metadata/` — replicated manifest fields for offline tooling."*
> *"**HDF5 vs alternatives:** HDF5 is chosen for: scientific-data-interchange ubiquity..."*

(architecture.md:470-491; full text not reproduced here)

**Amendment site:** the manifest's `payload.checksum` field is currently described as the checksum of the HDF5 payload file (line 465: `"checksum": "sha256:..."`); the schema's pattern is `^sha256:[0-9a-f]{64}$`. The producer (testkit/capture/writer.py:69) currently computes raw-file sha256. **Decision surface:**

- **Keep `payload.checksum` as raw-file sha256** (informational only; the contract surface lives elsewhere). Pro: backward-compatible; existing committed captures' manifests remain valid. Con: leaves a footgun in place — future engineers will reach for `payload.checksum == ?` byte-equality assertions and re-introduce the flake.
- **Redefine `payload.checksum` as content-normalized sha256** (computed over `/steps/.../state/.../{field}` arrays canonicalised in field-name order, then hashed; HDF5 object-header bytes excluded). Pro: the manifest's checksum IS the determinism contract. Con: breaks bit-equality against existing committed-capture checksums (forward incompatibility within schema v1.0.0).
- **Add a sibling `payload.content_checksum` field** at schema v1.1.0 alongside `payload.checksum` (additive bump). Pro: clean compatibility; reflects the WU-A pattern. Con: introduces a second schema bump ahead of Phase 4's planned 1.0.0 → 1.1.0 — coordination cost with WU-A.

Surfaced as D2 sub-decision; operator routes alongside the primary § 2.5 wording.

### § 5.3 capture-v1.json amendment scope

Description-only amendment of `payload.checksum` to reflect the resolved § 2.7 decision; field-shape unchanged unless the operator picks "add sibling content_checksum" (which requires `additionalProperties` reconciliation + a schema_version bump). Lean: description-only.

### § 5.4 Conventions doc § F.3 + § A.2 amendment scope

(FACT — verbatim from `docs/conventions/sub-phase-conventions.md` § F.3 at lines 313-322.)

> *"**Bit-identical run-to-run** | repeated runs of the SAME implementation on the SAME hardware | 0 (exact) | gate-10 `test_run_twice_bit_exact` (RD-3D, closed-form, agent-based). Numba's cold-vs-warm cache identity."*

**Amendment site:** the phrase "0 (exact)" needs disambiguation per the same content-vs-file distinction. Cleanest path: replace the row with the new contract wording + cross-reference the new harness API + cross-reference the new spec § 2.5 amendment.

Additionally, § A.2 (Stage 1 deliverable enumeration; line 30) currently says *"13-gate GREEN for the sim(s)"* — gate 11 (determinism) wording inherits from spec § 2.5 implicitly. The amendment is additive (cross-reference the new harness as the gate-11 mechanism); no rewrite of locked content.

**D5 verdict probe** (full surface in § 8 below): is conventions doc § F.3 amendment additive (acceptable per the conventions-doc-is-editable posture established at conventions-consolidation `34c7d34` + conventions-refactor `e2dc789`) or a modification of locked content? **Probe finding: ADDITIVE.** The post-refactor conventions doc itself ratified two amendment passes (conventions-consolidation + conventions-refactor); both treated the doc as forward-amendable. The capture-determinism-contract sub-phase inherits this posture. **No blocking dependency on a conventions-refactor-v2 sub-phase ahead of this one.**

---

## § 6. Phase 4 WU-A round-trip claim — verification

(FACT — verbatim from `docs/phases/phase-4-plan.md`:1590.)

> *"3. Asserts round-trip success: every state array preserved bit-for-bit; every manifest field preserved; new `gradient_fields` key absent in legacy captures handled as `Optional[None]` rather than KeyError."*

The phrase **"every state array preserved bit-for-bit"** is content-level — it refers to the NumPy array's bytes after deserialization (read back, then compared via `np.array_equal` or equivalent). It does NOT refer to raw file bytes. The Python harness's `np.array_equal` ALREADY satisfies this contract.

**Implication:** the WU-A schema-bump corpus expectation is consistent with the content-equivalent contract this sub-phase establishes. **No amendment of WU-A scope required.** The "additive schema bumps are non-breaking" claim (spec § 2.7) survives unchanged.

This was a load-bearing forward-compatibility question per the dispatch context; it is **resolved cleanly with no further action**.

---

## § 7. CaptureWriter source-level fix scope (defense-in-depth)

(FACT — `tools/testkit/capture/writer.py:51-67` verbatim.)

The Python `write_capture` opens `h5py.File(payload_path, "w")` without `track_times=False` and creates groups + datasets without `track_times=False`. The fix is a 1-3 line addition:

```python
with h5py.File(payload_path, "w", libver="earliest") as h:
    steps_group = h.create_group("steps", track_order=False)
    # ... track_times=False on each subsequent create_group + create_dataset
```

`h5py` exposes `track_times` per object; `libver="earliest"` further reduces metadata variance. **This is the principled Python-side fix.** Recommended as belt-and-suspenders alongside the harness-based contract — the source-level fix eliminates the flake; the harness-level contract makes test mechanisms robust regardless.

The TypeScript `CaptureWriter` at `common/common-ts/src/capture.ts` (not shown verbatim here; deferred to Stage 1 read) calls h5wasm internally. The TS-side fix is the `_emscripten_date_now` override per § 4.2.

**Both fixes are 5-10 line additions.** Neither requires significant refactor. They are CHEAP and PRINCIPLED; the sub-phase ships them as Stage 1 deliverables.

---

## § 8. D1–D5 surface preview (operator-routable; NOT pre-committed by plan-drafting)

### § 8.1 D1 — Stage 1 monolithic vs decomposed

**Probe data:** the structural-fix surface decomposes as:

| Component | Files touched | Diff estimate |
|---|---|---|
| Python harness rename + docstring update + API tweak | `tools/testkit/determinism/{harness.py, policy.md, __init__.py}` | ~+50/-30 |
| TypeScript harness build (new) | `common/common-ts/src/{captureReader.ts, diffCaptures.ts, runTwiceAndDiff.ts}` (or similar; Stage 1 names) + tests | ~+250/-0 |
| Python CaptureWriter `track_times=False` fix | `tools/testkit/capture/writer.py` | ~+3/-2 |
| TypeScript CaptureWriter `_emscripten_date_now` shim | `common/common-ts/src/capture.ts` | ~+15/-2 |
| LBM test refactor | `packages/lattice-boltzmann-d3q19/tests/test_determinism.py` | ~+10/-25 |
| MPM test refactor | `packages/mpm-multimaterial/tests/test_determinism.py` | ~+10/-25 |
| hello-physics test refactor | `common/common-ts/examples/hello-physics/hello-physics.test.ts` | ~+15/-10 |
| Spec § 2.5 + § 2.7 + capture-v1.json amendment | `docs/architecture.md` + `tools/testkit/schemas/capture-v1.json` | ~+25/-5 |
| Conventions doc § F.3 + § A.2 amendment | `docs/conventions/sub-phase-conventions.md` | ~+15/-5 |
| CI workflow extension | `.github/workflows/*.yml` | ~+20/-5 (TBD; depends on D4) |
| CHANGELOG + dependencies.md additive entries | `CHANGELOG.md` + `docs/dependencies.md` | ~+15/-0 |
| **TOTAL Stage 1 diff estimate** | | **~+428/-109** |

This is moderately larger than the conventions-refactor Stage 1 (+143/-11; single-commit ship). It is comparable to the Taichi-integration Stage 1 (+1782/-31; single-commit ship per N5 banked precedent). It is well below the +500/-50 single-commit-vs-fallback heuristic in absolute terms but exceeds it on the new-files-touched count (~7-8 new or substantially-modified files).

**Probe lean: monolithic Stage 1 acceptable**, with two-commit fallback engaged at operator routing OR if dispatch-time inspection of the Python `common-ts` Capture surfaces shows the TS harness build is unexpectedly large (e.g., if h5wasm's read surface for `/steps/.../state/...` arrays requires substantial type-safety scaffolding). Probability-weighted: 70% monolithic ships cleanly; 30% two-commit fallback engaged.

**Sub-decomposition shape if engaged:**
- **Stage 1a — Harness build (foundation).** Python rename + TS harness from scratch + both CaptureWriter source-level fixes. Single commit. Acceptance: harness API stable in both languages; CaptureWriter timestamps suppressed.
- **Stage 1b — Per-test refactor (consumers).** LBM + MPM Python refactor; hello-physics TS refactor. Single commit. Acceptance: all 3 VULNERABLE tests now consume the new harness; all 7 IMMUNE tests unchanged.
- **Stage 1c — Spec amendment + CI gate redesign + conventions doc + CHANGELOG (convergence).** Single commit. Acceptance: § 2.5 amended; § 2.7 + capture-v1.json updated; § F.3 amended; CI workflow extended; CHANGELOG entry added.

Each sub-stage gets its own checkpoint commit per conventions doc § A.4. **Probe lean stays: monolithic.**

### § 8.2 D2 — Spec § 2.5 amendment wording

Three candidate wordings surfaced in § 5.1 above (D2-a narrow / D2-b mechanism-explicit / D2-c project-onto-Capture). Operator picks at charter close.

**Probe lean: D2-c** (project-onto-Capture). Rationale: it (i) defines the contract in terms of the Capture data model rather than a specific tool; (ii) makes the metadata-exclusion clause concrete; (iii) survives unchanged if the harness is reimplemented in any future language; (iv) is the most testable / least implementation-specific framing. **D2-b is the natural sibling phrase** and could be added as a "see also" pointer to the harness; D2-a is the weakest framing (least specific about what content is) and is not recommended.

**D2-sub:** capture-v1.json `payload.checksum` semantics (raw-file vs content-normalized vs sibling field). **Probe lean: keep `payload.checksum` as raw-file sha256, ADD a description note clarifying that it is informational and that the determinism contract lives at the harness.** This avoids breaking forward compatibility with existing committed captures' manifests + dodges the schema-bump coordination cost with WU-A. Operator routes.

### § 8.3 D3 — Per-sim determinism-declaration refactor scope

**Probe data:** 0 per-sim `determinism.md` files exist. The "declarations" referenced in the dispatch context live in `<sim>/src/<sim>/sim.py` module docstrings. **These docstrings declare POSTURE (bit-exact / epsilon / etc.), not MECHANISM (file-sha256 / array-equal / etc.).** They are mechanism-agnostic. No amendment of the posture text is required.

**D3 verdict count: 0 declarations need amendment.** The 2 sims (LBM + MPM) need TEST refactor (D1 Stage 1 surface), not declaration refactor.

**Probe lean: D3 inline in this sub-phase** (TEST refactor only; DECLARATION refactor not needed). Banked-alternative absent — there is nothing to bank, since there are no declarations to refactor.

### § 8.4 D4 — CI gate redesign — strict-fan-out vs phased

**Probe data:** the ts-strict CI workflow (the one currently failing on hello-physics.test.ts) needs to be extended OR replaced by the new harness-based determinism gate. Two paths:

- **D4-strict-fanout (lean):** in a single Stage 1 commit, (i) the ts-strict CI continues to run hello-physics.test.ts (which is refactored to consume the new TS harness — no CI workflow edit needed); (ii) a new Python-strict CI gate runs `pnpm vitest determinism-checks` analogue via `pytest tools/testkit/determinism/tests/` across all 9 sims + the new harness's own test suite; (iii) both gates use the new content-equivalent contract.
- **D4-phased:** rebuild Python first, TypeScript second across two sub-phases. Adds coordination cost; not principled if both fixes are small.

**Probe lean: D4-strict-fanout.** The fixes are small in both languages; phasing them adds bureaucratic overhead without de-risking. Operator routes.

### § 8.5 D5 — Conventions doc amendment necessity

**Probe data:** the conventions doc § F.3 amendment (Bit-identical run-to-run row wording) is required + the § A.2 cross-reference is additive. Both are additive amendments to a forward-amendable canonical doc (the conventions-consolidation `34c7d34` + conventions-refactor `e2dc789` precedents establish that the conventions doc is editable additively).

**D5 verdict: NO blocking dependency on a conventions-refactor-v2 sub-phase.** The amendment is additive per the established conventions-doc-is-editable posture; this sub-phase Ships it as a Stage 1 deliverable.

If the operator decides the amendment surface is large enough to warrant its own sub-phase (e.g., if the harness API rename + § F.3 row + § A.2 cross-reference + a possible new § F.5 "content-equivalent contract" sub-section together exceed scope reasonableness for inline ship), the alternative is to bank conventions-doc amendment for a conventions-refactor-v2 sub-phase. **Probe lean: inline ship in this sub-phase**; surface is well within the ~+15/-5 amendment scope estimated in § 8.1. **D5 absence of blocking dependency confirmed.**

---

## § 9. Cumulative shift count + precedent-establishing shifts at plan-drafting close

**Entering plan-drafting:** 99 cumulative shifts (Taichi-integration landing § 8.4: 97 + 2 = 99).

**New shifts SURFACED at this plan-drafting probe (forward-looking — will be ratified at plan-drafting landing audit):**

- **N1 (proposed) — Second spec-Phase-2 sub-phase routing pattern.** The Taichi-integration landing's § 10 next-sub-phase recommendation (RD-2D → Stack D first) is SUPERSEDED by this sub-phase's existence. Pattern: when an upstream structural-correctness gap surfaces from a sub-phase landing's CI fan-out (here: ts-strict failure post-Taichi-integration push to main), the discovered gap routes a NEW sub-phase ahead of the previously-recommended next sub-phase, and the previously-recommended sub-phase moves to "next after this one." **This is the first instance of a CI-fan-out-discovered structural-correctness routing override** at spec-Phase-2 entry. Banked as precedent for any future fan-out-discovered routing override.
- **N2 (proposed) — Diagnostic-only session → plan-drafting agent re-derivation discipline.** When a diagnostic-only chat session produces findings without committing a written report, the next-session plan-drafting agent re-derives the empirical claims at the current HEAD and preserves attribution to the originating session. **First instance** at this sub-phase; preserves the diagnostic chain even when no written artifact is committed.
- **N3 (proposed) — Portfolio-wide contract-redesign sub-phase shape.** The capture-determinism-contract sub-phase is the FIRST portfolio-wide contract-redesign sub-phase (cf. conventions-refactor as portfolio-wide DOC-redesign; this is the contract-redesign analogue). Establishes the shape: probe-inventory-of-affected-tests-first; design-the-canonical-replacement-second; refactor-consumers-third; amend-spec/conventions-fourth. Banked precedent.

**Plan-drafting closing-shift count (expected, conditional on landing audit ratification): 99 + 3 = 102.** May rise during Stage 0 / Stage 1 / Stage 2 per established sub-phase patterns; carry-forward shape per conventions doc § L.

---

## § 10. Cross-references to diagnostic-session findings + attribution

(FACT — preserves the diagnostic chain even though no written diagnostic-session report was committed.)

**Attribution:** the structural-causation narrative (HDF5 OHDR mtime as the contamination source; h5wasm 0.10.1's missing `H5Pset_obj_track_times` binding as the TS-side constraint; latency of the bug since `4f97e6b` (Phase 0 era); the ~20 prior ts-strict CI runs through `e2d6cb5` passing by chance) originates from the pre-Stage-0 diagnostic-only chat session captured in the dispatch context for this plan-drafting agent. The plan-drafting-probe research subagent re-derived the empirical numerical claims at HEAD with two corrections (mtime byte-order; h5wasm cwrap surface framing) noted in § 4.4.

**Cross-references for charter authoring:**
- **The 184-bytes-differ figure** (dispatch context) → re-derived as 183 bytes at HEAD; treat as ~183-184 within counting variance.
- **The "every prior CI run passed by chance"** finding → mechanically consistent with the diagnostic causation; the plan-drafting probe did not re-search the CI history but cites the diagnostic conclusion verbatim.
- **The `4f97e6b` introduction-of-flake commit** → the diagnostic narrative; the plan-drafting probe did not re-confirm `git show 4f97e6b` but cites the diagnostic conclusion verbatim. Stage 0 may re-confirm via `git log -- common/common-ts/examples/hello-physics/hello-physics.test.ts | tail`.

---

## § 11. Drift surfaced for operator attention before Stage 0 dispatch

(FACT — items the operator should be aware of before routing Stage 0.)

| # | Item | Surface |
|---|---|---|
| 1 | The dispatch context's "spec § 2.7 amendment" framing is partially misdirected: the load-bearing determinism-contract wording lives in **§ 2.5**, not § 2.7. § 2.7 amendment is still needed (capture-v1.json `payload.checksum` semantics + light description-only edit) but is secondary. | Inline-resolved in § 5.1; D2 surfaces both sites. |
| 2 | The dispatch context's "each of the 9 Phase-1 sims' determinism.md declarations" framing does not match HEAD: no `determinism.md` files exist in any of the 9 sim packages. Declarations live in `<sim>/sim.py` module docstrings, and they declare POSTURE not MECHANISM, so they need NO amendment. D3 surface-count = 0 (per § 8.3). | Inline-resolved in § 3; D3 verdict surfaces clean. |
| 3 | The dispatch context's "every byte-equality test" framing implies a wide blast radius. Actual inventory at HEAD: **3 VULNERABLE tests of 10 determinism-grade tests** (per § 2). The Python `run_twice_and_diff` harness ALREADY implements the correct content-equivalent contract for 7 of 9 sims; the sub-phase substantially REUSES the existing harness rather than building a new one from scratch. | Inline-resolved in § 2.3; D1 Stage 1 surface estimate reflects this. |
| 4 | h5wasm 0.10.1's `H5Pset_obj_track_times` is absent from the WASM blob entirely (not just unbound at JS layer). The TS-side fix is via `_emscripten_date_now` override (§ 4.2), not via H5P binding. **Stage 1 will not attempt to bind H5Pset_obj_track_times.** | Inline-resolved in § 4. |
| 5 | The `track_times=False` Python fix + `_emscripten_date_now` TS shim are belt-and-suspenders alongside the harness-based contract. **Both should ship in Stage 1** even though the harness contract makes them non-load-bearing — they eliminate the latent flake at the source. | Recommended in § 7. Stage 1 ships them. |
| 6 | Stage 0 should re-confirm at dispatch time: (i) is the diagnostic claim "all 9 sims' tests pass at HEAD" still true (i.e., was `e2d6cb5` actually the last passing CI run, or has main moved); (ii) does pinning `Date.now` actually produce byte-identical h5wasm output across runs at the same Unix instant (empirical validation of § 4.2 lean path (b)); (iii) does `h5py track_times=False` actually produce byte-identical output across two runs at different Unix instants (empirical validation of § 7 Python-side fix). | Stage 0 surfaces. |

---

## § 12. Probe closure

This probe report stands as the authoritative anchor-source synthesis for the capture-determinism-contract sub-phase's plan-drafting. Subsequent artifacts (charter at `docs/phases/sub-phase-capture-determinism-contract.md`; plan-drafting landing audit; Stage 0 prompt) read this report FIRST and inherit its findings verbatim by reference.

D1 / D2 / D3 / D4 / D5 are surfaced for operator routing at charter close; not pre-committed by plan-drafting per Out-of-Scope discipline.

Verdict: **probe CONFIRMED; charter dispatchable.**

(FACT — probe authored against HEAD `412b1b90b21957ecf3c07db690e8c64ab24386f1`; sha256-verified anchors per § 1; back-fill of this audit's own `head_sha:` after probe commit per Convention #12 step 3 tightened-discipline.)
