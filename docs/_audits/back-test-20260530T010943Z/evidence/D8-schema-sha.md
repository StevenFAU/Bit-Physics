# D8 — Schema / capture / vendored-SHA integrity (HEAD `4ee0ea9`)

Read-only back-test of Bit-Physics at HEAD `4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9`
(Phase-3 FINALE; tasks 1–8 landed). Re-enumeration of the prior D8 pass
(`back-test-20260529T124759Z`, pin `869bf68`) after tasks 5–8 added NEW captures +
vendored repos. All work in `/home/otacon/Projects/bp-audit-2`; source not modified.

## Denominator accounting

| Class | Count | Method |
|---|---|---|
| Capture-shaped JSON sidecars (`captures/**` + `tests/fixtures/legacy-captures/**` + `common/common-py/smoke/captures/**`) | **58** | `git ls-files` path-filter + `json.load` |
| Adversarial integrity/render TEST manifests (`tools/integrity/tests/fixtures/adversarial/**`, `tools/testkit/render_similarity/tests/fixtures/adversarial/**`) — NOT capture sidecars (no `schema_version`; check/fixture-descriptor shape) | 9 | enumerated, excluded from schema-uniformity check with cause |
| **Total tracked capture/fixture `.json`** | **67** | 58 + 9 |
| Vendored external repos under `references/<vendor>/MANIFEST.toml` | **7** | `git ls-files | grep MANIFEST.toml` |
| Queued corrigenda in `docs/spec-amendments-proposed.md` | **7** (A-1…A-7) | full read |

Prior pass counted 49 capture sidecars; HEAD has 58 (tasks 5–8 added live `captures/**`
rows for mass-spring-cloth, neural-ca (incl. `-wgsl`), ising-classical,
rigid-body-pedagogical, reaction-diffusion-2d-stack-c, plus 8 new `phase-3-*` legacy
fixtures). Prior counted 6 vendored upstreams; HEAD has **7** (tasks 6/7/8 added
`growing-neural-ca`, `PhysicsNeMo-PINN`, `PhysGaussian`-cite-only). NO `.gitmodules` —
every vendored repo is a flat sparse-copy; the committed SHA marker is `MANIFEST.toml`'s
`sha = …` field (there is no submodule gitlink to `rev-parse`).

ALL 58 sidecars, ALL 7 MANIFESTs, ALL 7 amendments were checked (full enumeration, not
sampled).

## Schema uniformity (58 capture-shaped sidecars)

- **`schema_version`:** 1 distinct value across all 58 → **`1.0.0`**. NO drift in tasks 5–8 captures.
- **`config.dtype` (required enum `["f32","f64"]`):** 50× `f64`, 8× `f32`. 0 MISSING. All in-enum.
- **`determinism.claimed` enum (schema = `["bit-exact-same-hw","epsilon","non-deterministic"]`, `tools/testkit/schemas/capture-v1.json:93`):**
  - Live `captures/**` (30 files): 29× `bit-exact-same-hw`, 1× `epsilon` — all in-enum, clean.
  - `common/common-py/smoke/captures/**` (2): 2× `bit-exact-same-hw` — in-enum.
  - `tests/fixtures/legacy-captures/**` (26): 20 in-enum + **6 OUT-OF-ENUM** legacy values
    (`epsilon-same-stack-same-hw`×3, `bit-exact-effort-same-stack-same-hw`×1,
    `bit-exact-same-stack-same-hw`×1) — see F-D8-S1 below.
- The prior pass's "lone `2.0.0`" was `tools/diagnostics/diagnostics/tier1/tests/conftest.py:106`
  (a synthetic in-test manifest, NOT a capture). Still NOT a real capture or a live schema bump.
- **Required-field completeness:** all 58 carry `schema_version, sim, stack, config, run,
  payload, determinism` (the capture-v1 required set); `config.dtype` and
  `determinism.claimed` present on all 58.

**Verdict: schema_version uniform `1.0.0` across all 58 sidecars; tasks 5–8 introduced NO
schema drift. Live `captures/**` is enum-clean. The only non-enum `claimed` values are 6
pre-existing legacy fixtures (F-D8-S1, pre-existing, not introduced by tasks 5–8).**

## Vendored-SHA verdict table (MANIFEST `sha` vs §2.18 plan pin vs spec D.3)

| Upstream (dir) | Committed MANIFEST SHA | plan §2.18 pin | spec D.3 | MATCH? |
|---|---|---|---|---|
| Inria gaussian-splatting (`3DGS-reference`) | `54c035f7…` | `54c035f7…` | "Latest stable" | **MATCH** |
| Chakazul-Lenia (`Chakazul-Lenia`) | `adfc5429…` | `adfc5429…` | — (not in D.3) | **MATCH** |
| growing-neural-ca (`growing-neural-ca`) | `3d5547ca…` | **ABSENT** (no §2.18 row) | **ABSENT** (no D.3 row) | **MANIFEST-only** → A-4 / A-5 |
| PhysGaussian (`PhysGaussian`, cite-only) | `8339ed6a…` | `8339ed6a…` | `8339ed6a` (lic MIT, wrong) | **MATCH** (SHA); license drift → A-7 |
| physicsnemo-sym (`PhysicsNeMo-PINN`) | `acaeb6dc…` (repo `NVIDIA/physicsnemo-sym`, v2.4.0) | `766e485a…` (repo `NVIDIA/physicsnemo` CORE, v2.1.0) | `<latest 1.x>` core, Apache | **MISMATCH** (repo + SHA) → A-6 |
| Bender PositionBasedDynamics (`PositionBasedDynamics`) | `aa62c44f…` (tag 2.2.0) | `d0894bdb…` (master HEAD) | "Latest stable" | **MISMATCH** → A-3 |
| SPlisHSPlasH (`SPlisHSPlasH`) | `6bff55a6…` (2.16.1) | (Phase-1 vintage; not in §2.18) | "Latest release at Phase-0 Block-4" | OK (Phase-1) |

SHA extraction: `grep ^sha= references/*/MANIFEST.toml`. Each MANIFEST `sha` is the marker
of record (no submodule gitlink; `git -C … rev-parse HEAD` is N/A — flat sparse-copy).

## Re-tested findings (verdict)

| ID | Prior claim | HEAD observation | Verdict |
|---|---|---|---|
| **m-10 / A-3** | §2.18 pins Bender `d0894bdb` (HEAD); MANIFEST = `aa62c44f` (=2.2.0) | `phase-3-plan.md:285` = `d0894bdb…`; MANIFEST = `aa62c44f…`. BOTH confirmed at HEAD. | **LIVE** (unchanged; tracked as A-3) |
| schema uniformity | uniform `1.0.0`; lone `2.0.0` = test fixture | 58/58 sidecars `1.0.0`; conftest `2.0.0` still in-test | **RESOLVED-AT-HEAD** (consistent) |

## A-1…A-7 corrigendum reality table (each defect independently verified at HEAD)

| ID | Cited location | Asserted defect | Observed at HEAD | REAL? |
|---|---|---|---|---|
| **A-1** | `docs/architecture.md:1175` | §5.8 says "maximal-coordinate" but cites Featherstone ABA (reduced-coord) — internally inconsistent | Line 1175 reads `…implementing maximal-coordinate articulated-body dynamics … Featherstone 2008 reference.` — verbatim the asserted current text | **REAL** (not applied) |
| **A-2** | `docs/architecture.md:2509`, `:2552` | sim-id `cloth-xpbd` should be canonical `mass-spring-cloth` | `:2509` = `` `cloth-xpbd` `` row; `:2552` = `Phase 3 task-5 (cloth-xpbd)` — both stale labels present | **REAL** (not applied) |
| **A-3** | `phase-3-plan.md` §2.18 (`:285`) | Bender pinned `d0894bdb` (master HEAD) not `2.2.0`/`aa62c44f` "Latest stable" | `:285` = `SHA: d0894bdb0190…` — present | **REAL** (not applied) |
| **A-4** | `phase-3-plan.md` §2.18 block (`:259-311`) | §2.18 claims "all five" but has NO growing-neural-ca row | Plan `:257` literally says "all five"; grep of `:259-311` for growing/self-organising/neural-ca = ZERO hits | **REAL** (not applied) |
| **A-5** | `docs/architecture.md:2545-2553` | D.3 table has NO growing-neural-ca row | D.3 rows = {SPlisHSPlasH, OpenVDB, Newton, Inria GS, PhysGaussian, Bender, PhysicsNeMo}; no growing-CA row | **REAL** (not applied) |
| **A-6** | `docs/architecture.md:2553` (+ plan §2.18 `:293-300`) | D.3/§2.18 pin `NVIDIA/physicsnemo` core `766e485a` v2.1.0; PINN tutorial actually lives in `NVIDIA/physicsnemo-sym`; `<latest 1.x>` text stale | `:2553` = `NVIDIA PhysicsNeMo … pip install nvidia-physicsnemo==<latest 1.x>`; plan `:293-294` = repo `NVIDIA/physicsnemo` SHA `766e485a…`. Vendored MANIFEST = `NVIDIA/physicsnemo-sym` v2.4.0 `acaeb6dc…`. Repo + SHA + pin-text all mismatch | **REAL** (not applied) |
| **A-7** | `docs/architecture.md:2551` | PhysGaussian License column says `MIT`; actual = NONE (no LICENSE → all-rights-reserved, cite-only) | `:2551` = `… PhysGaussian (Xie 2024) … MIT …` — the wrong `MIT` is present | **REAL** (not applied) |

All 7 corrigenda describe defects that are **REAL at HEAD** and **NOT yet applied** (spec
frozen in Phase 3 per §9.6; agent does NOT edit plan per §0.3). **Zero stale / wrong /
already-applied amendments.**

## NEW checks (key)

### NC-1 — PhysGaussian cite-only / `source_vendored=false` matches on-disk reality — **CONFIRMED**
- `references/PhysGaussian/MANIFEST.toml` declares `source_vendored = false`, `license = "NONE"`.
- `git ls-files references/PhysGaussian/` → **only `MANIFEST.toml`** (no source). On-disk dir = `MANIFEST.toml` alone.
- Repo-wide grep for PhysGaussian source markers (`XPandora`, `mpm_solver`, `gs_simulation`,
  `import physgaussian`) → only hit is `tools/testkit/probes/reports/3dgs-mpm.md:101,145`
  (`gh api repos/XPandora/PhysGaussian` — a verification CITATION, not source).
- `packages/3dgs-mpm/gs_mpm/coupling.py:1-23` header cites the PAPER (arXiv:2311.12198v3
  Eq. 8/9/10) for independent derivation, not vendored code. SH-update (Eq. 9) FROZEN/deferred.
- **No PhysGaussian or Inria source is committed anywhere outside `references/3DGS-reference/`
  (the licensed Inria oracle). `source_vendored=false` is truthful.**

### NC-2 — growing-neural-ca pin (task-6) — MANIFEST `3d5547ca…` matches itself; **NOT in §2.18 / D.3**
- MANIFEST `sha = 3d5547ca48b60ecac459834e2c05c9ff5df87991`, Apache-2.0, repo
  `google-research/self-organising-systems`. Internally consistent.
- Plan §2.18 and spec D.3 have **NO** row for this upstream (verified). The SHA lives ONLY in
  the MANIFEST + the A-4/A-5 amendment bodies. This is exactly the A-4 (plan) + A-5 (spec)
  defect — REAL, queued, unapplied.

### NC-3 — physicsnemo-sym pin (task-7) — REPO + SHA mismatch vs §2.18 — **A-6 territory confirmed**
- Vendored MANIFEST = `NVIDIA/physicsnemo-sym` v2.4.0 `acaeb6dc38ecda58559b5286d3cb743e8cf930d3`,
  Apache-2.0 (`LICENSE.txt`). Internally consistent.
- Plan §2.18 (`:293-294`) pins `NVIDIA/physicsnemo` (CORE) `766e485a…` v2.1.0 — a DIFFERENT
  REPO. The PINN/elliptic-PDE tutorials (`examples/helmholtz`) live in `-sym`, not core. This
  is corrigendum A-6 (REAL, queued, unapplied). The vendored material self-cites A-6 in its
  MANIFEST `purpose`. Spec D.3 (`:2553`) carries the same core-repo + stale `<latest 1.x>` text.

### NC-4 — A-1…A-7 reality — see the table above. **7/7 REAL, 0 stale, 0 applied.**

### NC-5 — per-repo vendored-SHA reconciliation — see the verdict table above (7 repos).
No `.gitmodules` (flat sparse copies), so `rev-parse` is N/A; the committed `MANIFEST.toml
sha` is the marker. 4 MATCH (Inria, Lenia, PhysGaussian-SHA, SPlisHSPlasH-Phase1); 1
MANIFEST-only (growing-CA, A-4/A-5); 2 MISMATCH (PhysicsNeMo repo+SHA A-6; Bender SHA A-3).

## NEW findings

| ID | Severity | file:line | Claim | Observed | Remediation |
|---|---|---|---|---|---|
| **F-D8-S1** | INFO (pre-existing; not tasks-5–8) | `tests/fixtures/legacy-captures/{eulerian-smoke-ref,mpm-multimaterial-ref,physarum-ref,sph-water-ref}.json` (`claimed=epsilon-same-stack-same-hw`), `…/lattice-boltzmann-d3q19-ref.json` (`bit-exact-effort-same-stack-same-hw`), `…/reaction-diffusion-3d-ref.json` (`bit-exact-same-stack-same-hw`) | schema `claimed` enum = `[bit-exact-same-hw, epsilon, non-deterministic]` | 6 legacy fixtures carry `claimed` strings OUTSIDE the capture-v1 enum | Legacy fixtures predate the determinism-contract sub-phase and are NOT validated against capture-v1 (they are integrity/replay test inputs, not live captures). Live `captures/**` is enum-clean. No source change owned by D8; carry-forward note for a fixture-modernization sub-phase if the operator wants legacy fixtures schema-conformant. |
| **F-D8-A6** | MINOR (already-tracked A-6) | `phase-3-plan.md:293-294`, `docs/architecture.md:2553` | §2.18/D.3 pin `NVIDIA/physicsnemo` core `766e485a` v2.1.0 | Vendored is `NVIDIA/physicsnemo-sym` v2.4.0 `acaeb6dc` (different repo) | Apply A-6 at phase boundary (re-point §2.18 + D.3 to `-sym`, or ratify the core pin as a separate record). |
| **F-D8-A3** | MINOR (already-tracked A-3) | `phase-3-plan.md:285` | §2.18 pins Bender `d0894bdb` master HEAD | MANIFEST/reality = `aa62c44f` (=2.2.0, "Latest stable" per D.3) | Apply A-3 (re-point §2.18 to `2.2.0`/`aa62c44f`). |
| **F-D8-A4/A5** | MINOR (already-tracked) | `phase-3-plan.md:257,259-311`; `docs/architecture.md:2545-2553` | growing-neural-ca vendored but absent from §2.18 ("all five") + D.3 | MANIFEST-only SHA `3d5547ca`; no plan/spec row | Apply A-4 (add §2.18 row) + A-5 (add D.3 row). |
| **F-D8-A7** | MINOR (already-tracked A-7) | `docs/architecture.md:2551` | §2.18/D.3 PhysGaussian License = `MIT` | Actual upstream license = NONE (all-rights-reserved); cite-only, `source_vendored=false` on-disk | Apply A-7 (License `MIT`→`NONE`). |

## Verdict

D8 at HEAD `4ee0ea9` is **clean on the dimensions D8 owns**: schema_version uniform `1.0.0`
across all 58 capture-shaped sidecars (zero drift from tasks 5–8); `config.dtype` and
`determinism.claimed` enum-clean across all 30 live `captures/**` + 2 smoke; every vendored
SHA reconciles to its `MANIFEST.toml`; the PhysGaussian cite-only declaration
(`source_vendored=false`) matches on-disk reality byte-for-byte (no Inria/PhysGaussian source
leaked into the 3dgs-mpm package or anywhere outside the licensed `references/3DGS-reference/`
oracle). Every divergence between MANIFEST-reality and the plan §2.18 / spec D.3 registries is
already captured as a queued corrigendum (A-3 Bender, A-4/A-5 growing-CA, A-6 physicsnemo-sym,
A-7 PhysGaussian-license), and **all 7 A-1…A-7 defects are REAL at HEAD, none stale, none
already-applied**. The lone schema-vs-data residue (F-D8-S1, 6 legacy fixtures with
out-of-enum `claimed`) is pre-existing, not introduced by tasks 5–8, and lives in
test-fixture paths not validated against capture-v1.
