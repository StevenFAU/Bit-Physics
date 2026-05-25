---
artifact: plan-drafting-landing
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-plan-drafting
stage: plan-drafting
phase: 2
date: 2026-05-25T18-00-00Z
head_sha: f772f71454e0b6b1ab0e41aab7a5f98d4c65ae91
head_sha_at_checkpoint: 15453bb5698ce31b109fb711444e335ffab488ac
verdict: HELD — NOT MATURE; common-cpp-bootstrap precondition surfaced; awaiting operator routing (NO charter, NO Stage 0 dispatch)
evidence_paths:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-probe-2026-05-25T18-00-00Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/common-cpp-bootstrap-precondition-recommendation-2026-05-25T18-00-00Z.md
---

# Plan-drafting landing — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

8th and final spec § 11.3 cross-stack port; FIRST Stack-C port. The load-bearing
common-cpp maturity gate resolved **NOT MATURE** (probe § 4). Per the
IF-NOT-MATURE branch of the dispatch + Hard Rule 2, this plan-drafting stage
produces probe + precondition recommendation (in lieu of a charter) and **HOLDS**
for operator routing of a `common-cpp-bootstrap` precondition sub-phase. No
charter, no Stage-0 dispatch, no source touched.

---

## § 1. Deliverables + commit SHAs

| # | Artifact | Commit | head_sha (back-filled) |
|---|---|---|---|
| 1 | `plan-drafting-probe-2026-05-25T18-00-00Z.md` | COMMIT 1 — `docs(reaction-diffusion-2d-stack-c-plan-drafting): plan-drafting probe report` | `4f9e523aea6481fb32b71e3ee32bb2f7e16e0f65` |
| 2 | `common-cpp-bootstrap-precondition-recommendation-2026-05-25T18-00-00Z.md` | COMMIT 2 — `docs(reaction-diffusion-2d-stack-c-plan-drafting): common-cpp-bootstrap precondition recommendation` | `8605a31f2e65f64dd4d45826aa578fc96f44d17e` |
| 3 | `plan-drafting-landing-2026-05-25T18-00-00Z.md` (this file) | COMMIT 3 — `docs(reaction-diffusion-2d-stack-c-plan-drafting): plan-drafting landing audit` | `f772f71454e0b6b1ab0e41aab7a5f98d4c65ae91` |
| 4 | `plan-drafting-sha-back-fill-2026-05-25T18-00-00Z.md` | COMMIT 4 — `chore(reaction-diffusion-2d-stack-c-plan-drafting-sha-backfill): …` | (the ledger; its own commit not back-filled) |

**No charter** (cf. the per-sim ports' COMMIT 2 = charter). COMMIT 2 here is the
precondition recommendation, the correct substitute under NOT MATURE.

---

## § 2. Load-bearing maturity verdict + Hard Rule 2 STOP

**common-cpp is NOT MATURE** (probe § 4). It is a Phase-1-Stage-1 scaffold:
Vulkan device-init is **declarations-only** (render-oriented, no compute
substrate); capture is **`raw-binary-v1`, not HDF5** (`SHIFTED-NEEDS-HDF5-VENDOR`);
determinism is a **`Config` struct + argv parser** with no execution-enforced
analog of `assert_deterministic_run`. All three blocking sockets a Vulkan/C++ sim
must consume are absent / declarations-only / wrong-format, by the package's own
explicit "Out of scope this stage" design.

**Hard Rule 2 STOP** (probe § 4.4): the phase-2 plan ASSUMES common-cpp is mature
("Phase 1 … so it must be mature"; row 2.1.C "consumes common-cpp"; "do NOT
extend the common module … outside Phase 2 scope"), contradicting the landed
scaffold. The probe STOPS and surfaces a `common-cpp-bootstrap` precondition
(probe § 10 + the recommendation artifact) rather than chartering RD-2D-Stack-C
against an incomplete socket.

---

## § 3. Believed-state reconciliation — verdict on each dispatch PROBE-MUST-HONOR item

| Item | Verdict |
|---|---|
| (a) common-cpp maturity (LOAD-BEARING) | **NOT MATURE** → bootstrap precondition (probe § 4 + § 10). |
| (b) S6-trajectory discipline (§ L.4) | On-Stack-C simulation DEFERRED (no substrate); Phase-1 reference behavior documented (chaotic λ-region, `gray-scott-lambda-128sq-seed42-step2000`, f32, fields u/v). Probe § 5(b). |
| (c) step-1 cross-stack seed-difference | UNMEASURABLE on Stack-C (no substrate); prior Stack-D data point (step-0 bit-identical, step-1 FP-round-off ~1.9e-14, shape (b)) documented; Stack-C measurement deferred. Probe § 5(c). |
| (d) Vulkan compute determinism | Web-researched (probe § 5(d) + § 11): correctly-rounded add/sub/mul GUARANTEED; FMA-contraction ON by default (suppress via `NoContraction`); f32 guaranteed / fp64 optional; same-device run-to-run bit-identity achievable for no-atomics stencil; cross-device NOT guaranteed; lavapipe pinned recommendation. |
| (e) § 6.8 non-inheritance | EXPLICITLY documented (probe § 5(e)): Warp-CPU-f64↔NumPy n=2 does NOT port to the Vulkan/C++↔NumPy pair. |
| (f) tolerance reuse | VERIFIED at HEAD (`[overrides.reaction-diffusion-2d]` rel=1e-4); Stack-C inherits; Stage-1c edit no-op. Moot under NOT MATURE. Probe § 5(f). |
| (g) inheritance of 5 amendment sets (§ L.4/5/6/7/8) | Documented with per-set applicability (probe § 5(g)); § L.6 O-W7 Warp-only. |
| (h) Vulkan/C++ quirks catalog | Needed (§ L.6 is Warp-only); initiate at bootstrap; banked (probe § 8 R-RD2C5 / D5). |
| (i) § L.7 O-2 four-checkpoint chain | PATTERN ports; IMPLEMENTATION (R-A1 anchor) needs Vulkan compute substrate → post-bootstrap Stage-0. Probe § 5(i). |
| (j) stage-decomposition authority | DEFERRED (no charter); bootstrap decomposition proposed (recommendation § 3). |

---

## § 4. Closing-commit anchor re-check (Convention M)

Entering HEAD re-verified `15453bb5698ce31b109fb711444e335ffab488ac` at probe
time. This stage is **additive doc-only**: 3 new audit files + 1 sha-back-fill
ledger under `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/`; **0
source edits, 0 charter, 0 tolerance.toml change**. Doc-anchor blob shas recorded
in probe § 2. No drift introduced into tracked source/state.

---

## § 5. Plan-drafting shifts surfaced (S-RD2C*)

| Shift | Description |
|---|---|
| S-RD2C1 | **phase-2-plan-vs-reality (load-bearing).** Plan assumes common-cpp "mature from Phase 1" + "do NOT extend in Phase 2"; landed common-cpp is a Phase-1-Stage-1 scaffold → bootstrap precondition surfaced. |
| S-RD2C2 | **architecture-sha drift.** Dispatch cited `e82b7b8e`; HEAD blob is `2aa8f227…`. HEAD wins (Convention M); substance unchanged. |
| S-RD2C3 | **dangling `_staging/deps.md`.** `docs/common/cpp.md` + `capture.hpp` cite `common/common-cpp/_staging/deps.md`, which does not exist (never tracked). |
| S-RD2C4 | **canonical-descriptor discrepancy.** phase-2 plan table cites Stack-D descriptor `gray-scott-lambda-512sq-seed42-step1000`; RD-2D-Stack-D LANDED `gray-scott-lambda-128sq-seed42-step2000`. Resolve via § N at the (post-bootstrap) charter. |
| S-RD2C5 | **bootstrap-registration nuance.** common-cpp is CMake (not a uv member); a `common-cpp-bootstrap` does NOT change the uv member count (stays 23) — diverges from `common-warp-bootstrap`'s "20th member at Stage 1a" precedent. |

**Cumulative shifts: entering 218 → this plan-drafting 5 (S-RD2C1..S-RD2C5) → 223.**

---

## § 6. Hard Rule 2 + blocking-dependency assessment

- **BLOCKING dependency:** RD-2D-Stack-C charter is blocked on a matured
  common-cpp (probe § 4 + recommendation § 5). This is the only blocker; it is
  structural, not a defect in the dispatch or the prior ports.
- **HOLD posture:** NO charter, NO Stage-0 dispatch this sub-phase. The
  sub-phase HOLDS at plan-drafting until the operator routes the precondition
  (or selects the D2 inline alternative).
- **Replay invariant + integrity baseline:** not re-run (doc-only additive
  stage; no source/state touched). HELD as of the LBM-E Stage-2 sweep
  (`9399fc33…718909f34` replay; `c19492ad…d22cb52` integrity, 0 HF / 14 SW).
  The post-bootstrap RD-2D-Stack-C stages re-assert them per cadence.

---

## § 7. D-class routing summary (D1–D8)

Surfaced in probe § 9; routed to operator (none pre-committed). Lead decision:
**D2 — route `sub-phase-common-cpp-bootstrap` as the precondition** (lean:
bootstrap, precedent-aligned; alternative: inline). D3 (HDF5-vendor vs harness
raw-binary), D4 (lavapipe pinned backend), D5 (Vulkan quirks catalog), D6 (CMake
registration; uv count stays 23) are bootstrap-charter decisions. D7 (RD-2D-
Stack-C 6-stage decomposition) + D8 (§ N canonical-descriptor) are deferred to
the post-bootstrap RD-2D-Stack-C charter.

---

## § 8. Cleanup-banked inventory (§ 13 form — carry-in + new)

Per the cleanup-sub-phase posture, banked in probe-able form for the post-Phase-2
cleanup sub-phase. **Carry-in NOT acted this stage** (dispatch discipline).

**Carry-in (LBM-E § 13):**
- `S0-LBME1` — coordinator dispatch-hygiene drift (stale anchor shas in dispatch
  headers). This stage's S-RD2C2 (architecture-sha) is a fresh instance of the
  same class. STAY-BANKED.
- `uv sync --all-packages --all-extras` dev-extras-prune nuance (refines § L.8
  `uv sync` `.venv`-prune hazard). STAY-BANKED.
- methodology § 6 header staleness compounded ("Fifth-pair refinements" now also
  holds § 6.7 + § 6.8). STAY-BANKED.
- warp.md § 6.1 trailing "predictions pending" line stale (Smoke § 6.2 + LBM
  § 6.3 landed). STAY-BANKED.
- **stray untracked canonical captures** — `captures/eulerian-smoke-stack-{d,e}/
  taylor-green-128cube-seed42-step500.{h5,json}` — **CONFIRMED present in this
  working tree** (`git status`). Not this sub-phase's; NOT removed here.
  `.gitignore`/remove candidate. STAY-BANKED.
- integrity baseline-digest derivation undocumented (sha256 of full
  `integrity --all --mode strict` stdout) — one-line convention-note candidate.
  STAY-BANKED.

**Carry-in (smoke-E § 13):**
- missing `[Unreleased]` CHANGELOG entries: `eulerian-smoke-stack-d` /
  `common-warp-bootstrap` / `mpm-multimaterial-stack-e`. STAY-BANKED.
- stale section titles: methodology § 6 "Fifth-pair", conventions § L.7
  attribution. STAY-BANKED.
- D17 — Phase-1-canonical 2D-ref re-characterization candidate. STAY-BANKED.

**NEW (surfaced this stage):**
- **B-RD2C1 — dangling `common/common-cpp/_staging/deps.md` reference.**
  `docs/common/cpp.md` (§ Dependencies) + `capture.hpp` header cite a file that
  does not exist. Either create the deps budget file or update both references.
  Cross-cuts the bootstrap's D3 (HDF5/OpenVDB/Alembic/USD/ImGui deps budget).
- **B-RD2C2 — common-cpp scaffold de-scaffolding.** When `common-cpp-bootstrap`
  lands, `docs/common/cpp.md`'s "Out of scope this stage" deferrals + the
  README/header "Phase 1 Stage 1 scaffold" banners must be de-scaffolded. The
  bootstrap owns this; banked as a forward pointer.
- **B-RD2C3 — canonical-descriptor discrepancy** (S-RD2C4): plan table
  `512sq/step1000` vs landed `128sq/step2000`. Charter § N item; banked.

---

## § 9. Boundary + verify-self-check

- **Additive-only (Convention A):** 3 new audit files + 1 ledger; 0 source
  edits, 0 charter, 0 `tolerance.toml` edit, 0 state-doc edit. ✓
- **Convention M:** entering HEAD `15453bb` re-verified; doc-anchor blob shas
  recorded; architecture-sha drift surfaced (HEAD wins). ✓
- **Convention #8:** FACT/INFERENCE/SHIFTED tagged; common-cpp + common-warp
  socket read at HEAD (not memory); Vulkan determinism web-fetched at probe time
  + cited (probe § 11). ✓
- **Convention #12 / N1:** four-commit chain (probe / recommendation / landing /
  sha-back-fill); SHA back-fill is a SEPARATE commit; never `--amend`; the ledger
  enumerates every placeholder-bearing audit + token. ✓ (executed at COMMIT 4).
- **Hard Rule 2:** structural blocker (common-cpp NOT MATURE vs plan "mature")
  surfaced; STOPPED before charter. ✓
- **Terminal discipline:** NO push, NO tag (operator action per spec § 7.12 +
  standing D12). ✓

---

## § 10. Next step

**Operator routes `sub-phase-common-cpp-bootstrap`** (the recommendation
artifact's § 3 stage decomposition is the proposed anchor), or selects the D2
inline alternative. Once the precondition lands with the three sockets mature +
the Vulkan-compute smoke GREEN, **RD-2D-Stack-C charters** (post-bootstrap;
6-stage per-sim port; S6 + step-1 + R-A1 become executable/measurable) and spec
§ 11.3 enumeration closes on its landing. This sub-phase HOLDS until then.
