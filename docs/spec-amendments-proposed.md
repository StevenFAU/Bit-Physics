# Proposed spec amendments (operator applies at phase/sub-phase close)

> The spec (`docs/architecture.md`) is **FROZEN in Phase 3** (architecture.md
> §9.6). Corrigenda discovered during execution are **proposed here**, not applied
> inline, and the operator applies them at a phase boundary. Each entry records the
> exact location, the current text, the proposed text, and the verified rationale.

## ✅ APPLIED — Phase-3 close campaign, commit `da61e86` (2026-05-30)

The §9.6 freeze lifted at the Phase-3 close boundary; all seven corrigenda were
applied to their target docs. The proposal entries below are retained as the
audit trail. Live line numbers had DRIFTED from the proposals — each was
re-located by content (discipline #8) before editing.

| # | target | applied | note |
|---|---|---|---|
| **A-1** | architecture.md §5.8 | ✅ `da61e86` | applied TOGETHER with M-6 (below): maximal→ABA + sim renamed to canonical `articulated-pedagogical`. |
| **A-2** | architecture.md §D.2.3 + Bender row | ✅ `da61e86` | `cloth-xpbd`→`mass-spring-cloth` (spec now 0 occurrences). |
| **A-3** | phase-3-plan.md §2.18 Bender | ✅ `da61e86` | d0894bdb→`aa62c44f` (tag 2.2.0) = the SHA task-5 actually vendored (MANIFEST verified) per spec D.3 "Latest stable". |
| **A-4** | phase-3-plan.md §2.18 | ✅ `da61e86` | ADDED growing-neural-ca row (3d5547ca); preamble "five"→six. |
| **A-5** | architecture.md D.3 | ✅ `da61e86` | ADDED growing-neural-ca row. |
| **A-6** | architecture.md D.3 PhysicsNeMo | ✅ `da61e86` | →PhysicsNeMo-Sym v2.4.0 (acaeb6dc), read-only. Plan §2.18 physicsnemo→sym re-point left for operator (A-6's own deferral). |
| **A-7** | architecture.md D.3 PhysGaussian | ✅ `da61e86` | License MIT→NONE (cite-only). |

**M-6 reconciliation (applied with A-1):** the `articulated-pedagogical` ↔
`rigid-body-pedagogical` split was resolved to canonical
**`articulated-pedagogical`** — the LOCKED package leaf
`packages/articulated-pedagogical/`, the §11.4 category table, the §D.2.3
descriptor, 30 files. architecture.md is now internally consistent (0
`rigid-body-pedagogical`). The remaining cross-surface uses (captures dir
`captures/rigid-body-pedagogical-ref`, CI job `test-rigid-body-pedagogical`, the
plan sim-name column, the `task-4-rigid-body-pedagogical.md` landing audit) were
NOT renamed — a heavy LFS-capture + append-only-audit rename (the M-7 class),
**surfaced for the operator**, not forced.

---

## A-1 — §5.8 rigid-body reference-sim algorithm: "maximal-coordinate" → "articulated-body (ABA, reduced-coordinate)"

- **Surfaced by:** sub-phase-phase-3-rigid-body (task-4), execution Stage 0
  (2026-05-28). D-ALGO, operator-ratified ABA.
- **Location:** `docs/architecture.md:1175` (§5.8 Rigid-body dynamics, "Reference
  sim" line).
- **Current text:**
  > **Reference sim:** **rigid-body-pedagogical** — Stack E (Warp), implementing
  > **maximal-coordinate** articulated-body dynamics from scratch. Featherstone
  > 2008 reference. Demonstrates what physics engines do under the hood.
- **Proposed text:**
  > **Reference sim:** **rigid-body-pedagogical** — Stack E (Warp), implementing
  > **articulated-body dynamics (ABA, reduced/generalized-coordinate)** from
  > scratch. Featherstone 2008 reference (Ch. 7, §7.2–§7.3, pp. 123–131).
  > Demonstrates what physics engines do under the hood.
- **Verified rationale (Convention #8 — checked at assertion, not asserted from
  memory):** Featherstone, *Rigid Body Dynamics Algorithms* (2008), **Ch. 7 §7.3
  "The Articulated-Body Algorithm" (pp. 123–131)** is the O(n)
  **reduced/generalized-coordinate** tree-topology algorithm. The
  **maximal-coordinate** formulation (a full 6-DOF-per-body state with
  Lagrange-multiplier constraint forces) is a *different* method, treated in a
  later chapter (closed-loop / constraint systems). The spec's
  "maximal-coordinate … Featherstone 2008 reference" is therefore **internally
  inconsistent**: the cited reference's articulated-body algorithm is
  reduced-coordinate. The authoritative deliverable list `docs/phases/phase-3-plan.md`
  §6.4 ("Algorithm: ABA Ch. 7") is internally coherent and is what task-4
  implements. This amendment makes the spec consistent with both the plan and the
  cited reference.
- **Disposition:** PROPOSED. task-4 implements ABA (reduced-coordinate). Spec edit
  deferred to the operator at a phase boundary (spec frozen in Phase 3).

---

## A-2 — Appendix D.2.3 + D.3 capture/vendor sim-id `cloth-xpbd` → canonical `mass-spring-cloth`

- **Surfaced by:** sub-phase-phase-3-mass-spring-cloth (task-5), execution Stage 0
  (2026-05-29). D-NAMING, operator-ratified canonical `mass-spring-cloth`.
- **Locations (grep-verified, Convention #8):**
  - `docs/architecture.md:2509` — Appendix D.2.3 capture-descriptor table, sim-id
    column.
  - `docs/architecture.md:2552` — Appendix D.3 external-pin table, "Used by" column.
- **Current text:**
  > (`:2509`) `| `cloth-xpbd` | `ref` | `flag-wind-128x128-seed42-step1000` | Phase 3 task-5 |`
  > (`:2552`) `| **Bender PositionBasedDynamics** | Phase 3 task-5 (cloth-xpbd) | Latest stable | MIT | … |`
- **Proposed text:**
  > (`:2509`) `| `mass-spring-cloth` | `ref` | `flag-wind-128x128-seed42-step1000` | Phase 3 task-5 |`
  > (`:2552`) `| **Bender PositionBasedDynamics** | Phase 3 task-5 (mass-spring-cloth) | Latest stable | MIT | … |`
- **Verified rationale (Convention #8 — grep-checked at assertion):** the spec uses
  TWO names for the one task-5 reference sim. The **canonical** id is
  `mass-spring-cloth`: it is the §5.8/§5.9 reference-sim name
  (`docs/architecture.md:1186`), the §11.4 category-table entry
  (`docs/architecture.md:2439`), and the `docs/phases/phase-3-plan.md` §3.4/§6.5
  deliverable id. The two `cloth-xpbd` occurrences (`:2509`, `:2552`) are stale
  descriptor labels. task-5 uses `mass-spring-cloth` **everywhere** —
  path/import/keys/CI-job/probe/fixture/audit-leaf/capture-manifest `sim.name`. The
  capture descriptor `flag-wind-128x128-seed42-step1000` itself carries no sim name,
  so the only artifact difference is these two table cells. Low-stakes
  (descriptor-name-agnostic); proposed for consistency, not correctness.
- **Disposition:** PROPOSED. task-5 lands `mass-spring-cloth` as the canonical id.
  Spec edit deferred to the operator at a phase boundary (spec frozen in Phase 3).

---

## A-3 — Phase-3 plan § 2.18 external-SHA registry: Bender pin `d0894bdb…` (master HEAD) → `2.2.0` (`aa62c44f…`, latest stable)

- **Surfaced by:** sub-phase-phase-3-mass-spring-cloth (task-5), execution Stage 0
  (2026-05-29). D-VENDOR-SHA, operator-ratified "Latest stable" per spec D.3.
- **Location:** `docs/phases/phase-3-plan.md` § 2.18 (Phase-3 external-SHA registry,
  Bender PositionBasedDynamics row, pinned at common-3dgs Stage 0).
- **Current pin:** `d0894bdb0190…` (master HEAD; also MIT).
- **Proposed pin:** `aa62c44f0d43956452e1f960a40333ec2d6d3ea5` (tag `2.2.0`,
  published 2022-12-13; MIT).
- **Verified rationale (Convention #8 — verified at assertion this Stage 0):** spec
  **Appendix D.3** (`docs/architecture.md:2552`) pins Bender at **"Latest stable"**,
  verification `gh release view -R InteractiveComputerGraphics/PositionBasedDynamics`.
  Re-run this Stage 0: latest stable RELEASE = **`2.2.0`** (tag commit
  `aa62c44f…`, lightweight tag → commit, verified via
  `gh api …/git/refs/tags/2.2.0`); license MIT (`gh api …/license --jq
  .license.spdx_id`). The § 2.18 registry recorded master HEAD `d0894bdb…`, which is
  **not** "Latest stable" — the common-3dgs Stage-0 agent appears to have applied
  the "latest commit on main" pattern (correct for the Inria/PhysGaussian D.3 rows)
  uniformly, but Bender's D.3 row mandates the tagged release. A tagged release is
  more reproducible than a moving master HEAD. task-5 vendors `2.2.0` (spec D.3 is the
  top authority); this amendment re-points the § 2.18 plan registry to match.
- **Disposition:** PROPOSED. task-5 vendors at `2.2.0` (`aa62c44f…`). Plan-registry
  edit deferred to the operator (the operator decides whether to correct § 2.18 or
  ratify master-HEAD as an intentional deviation; per charter §0.3 the agent does NOT
  edit the plan).

---

## A-4 — Phase-3 plan § 2.18 external-SHA registry: ADD the missing `growing-neural-ca` (task-6) pin row

- **Surfaced by:** sub-phase-phase-3-neural-ca (task-6), execution Stage 0
  (2026-05-29). D-VENDOR-SHA, operator-ratified `3d5547ca…` Apache-2.0.
- **Location:** `docs/phases/phase-3-plan.md` § 2.18 (Phase-3 external-SHA registry,
  the fenced ``` block at `:259-311`).
- **Current text:** the § 2.18 block enumerates **five** upstreams (Inria
  gaussian-splatting, PhysGaussian, Bender PositionBasedDynamics, NVIDIA
  physicsnemo, Chakazul Lenia). **There is NO row for the growing-neural-ca
  upstream** that task-6 vendors, although § 2.18's preamble (`:257`) claims it
  resolves "**all five** Phase-3 external upstreams in one place" and task-6's
  charter §6 (D-VENDOR-SHA) requires a pinned SHA.
- **Proposed text:** ADD the following row to the § 2.18 fenced block (after the
  Chakazul/Lenia row at `:301-310`):
  > ```
  > - Repo: https://github.com/google-research/self-organising-systems   # task-6 neural-ca (growing-neural-ca)
  >   SHA: 3d5547ca48b60ecac459834e2c05c9ff5df87991
  >   Released: default-branch HEAD (main). The only release tag (biomaker-v1.0.0) is a DIFFERENT
  >     sub-project within this multi-project research monorepo, NOT the growing-CA work; per spec D.3's
  >     research-repo policy (and the § 2.18 pinning rule's "otherwise default-branch HEAD") HEAD is pinned.
  >   License: Apache-2.0
  >   License-note: permissive; Apache-2.0-compatible with Bit-Physics's MIT distribution posture.
  >   Security: clean (2026-05-29; gh api repos/.../security-advisories not consulted — research monorepo;
  >     SPDX verified Apache-2.0 via gh api repos/google-research/self-organising-systems --jq .license.spdx_id)
  >   Fetched: 2026-05-29T00:26Z
  >   Citation-pointer: §3.2 references/growing-neural-ca/ + references/growing-neural-ca/MANIFEST.toml (task-6)
  > ```
- **Verified rationale (Convention #8 — verified at assertion this Stage 0):** the
  GitHub API confirms `gh api repos/google-research/self-organising-systems --jq
  .license.spdx_id` → **`Apache-2.0`** and the commit `3d5547ca…` exists on the
  default branch (authored 2026-01-09, "Replace unicode escaped characters in ipynb
  files"). The repo is a multi-project research monorepo; the canonical Distill
  "Growing Neural Cellular Automata" (Mordvintsev et al. 2020) reference is
  `notebooks/growing_ca.ipynb`. The **principled pin-policy difference vs A-3**
  (Bender, tagged-stable-release) is intentional, not an inconsistency: a research
  repo with no applicable release tag pins default-branch HEAD per D.3's research-repo
  policy (the only tag, `biomaker-v1.0.0`, is a distinct sub-project). task-6 vendored
  `references/growing-neural-ca/` (LICENSE + UPSTREAM_README.md +
  `notebooks/growing_ca.ipynb`) + `MANIFEST.toml` at this SHA this Stage 0.
- **Disposition:** PROPOSED. task-6 vendors at `3d5547ca…` (the SHA is already in the
  charter §2.18/§6 and the MANIFEST). Plan-registry edit deferred to the operator; per
  charter §0.3 the agent does NOT edit the plan.

---

## A-5 — Spec Appendix D.3 vendored-dependency-pins table: ADD the `growing-neural-ca` (task-6) row

- **Surfaced by:** sub-phase-phase-3-neural-ca (task-6), execution Stage 0
  (2026-05-29). D-VENDOR-SHA / D-VENDOR-ROLE, operator-ratified.
- **Location:** `docs/architecture.md:2545-2553` (Appendix D.3 vendored-dependency
  pins table).
- **Current text:** the D.3 table rows cover SPlisHSPlasH, OpenVDB, NVIDIA Newton,
  Inria gaussian-splatting, PhysGaussian, Bender PositionBasedDynamics, NVIDIA
  PhysicsNeMo. **There is NO row for the growing-neural-ca upstream** that task-6
  (neural-ca) vendors.
- **Proposed text:** ADD a row to the D.3 table (after the PhysicsNeMo row at `:2553`):
  > `| **Growing Neural CA (self-organising-systems)** | Phase 3 task-6 (neural-ca) | HEAD on main (no applicable release tag; biomaker-v1.0.0 is a different sub-project) | Apache-2.0 | `gh api repos/google-research/self-organising-systems --jq .license.spdx_id` |`
- **Verified rationale (Convention #8 — grep-checked at assertion):** D.3
  (`docs/architecture.md:2541-2553`) is the authoritative vendored-dependency-pins
  table; every Phase-3 vendored upstream has a row (Inria task-1, Bender task-5,
  PhysicsNeMo task-7). task-6 vendors `references/growing-neural-ca/` but D.3 has no
  corresponding row. The verification command and license match A-4 (same upstream).
  The pin policy is HEAD-on-main per D.3's stated research-repo handling, distinct
  from Bender's "Latest stable" — intentional, not an inconsistency.
- **Disposition:** PROPOSED. Spec edit deferred to the operator at a phase boundary
  (spec frozen in Phase 3 per §9.6).

---

## A-6 — Spec Appendix D.3 PhysicsNeMo row: PINN-tutorial home = `physicsnemo-sym` (not core); `<latest 1.x>` pin text stale

- **Surfaced by:** sub-phase-phase-3-pinn-poisson (task-7), execution Stage 0
  (2026-05-29). D-VENDOR-SHA/ROLE, operator-ratified: vendor `physicsnemo-sym`
  read-only (NOT the §2.18-pinned core `physicsnemo`).
- **Location:** `docs/architecture.md:2553` (Appendix D.3 vendored-dependency-pins
  table, NVIDIA PhysicsNeMo row).
- **Current text:**
  > `| **NVIDIA PhysicsNeMo** | Phase 3 task-7 (PINN); Phase 4 WU-E; Phase 4 Stage 35 | `pip install nvidia-physicsnemo==<latest 1.x>` | Apache-2.0 | `pip index versions nvidia-physicsnemo` |`
- **Proposed text:**
  > `| **NVIDIA PhysicsNeMo-Sym** (PINN/elliptic-PDE tutorials) | Phase 3 task-7 (PINN); Phase 4 WU-E; Phase 4 Stage 35 | `physicsnemo-sym` v2.4.0 (`acaeb6dc…`), Apache-2.0, vendored READ-ONLY (NOT pip-installed) | Apache-2.0 | `gh api repos/NVIDIA/physicsnemo-sym/git/refs/tags/v2.4.0` |`
- **Verified rationale (Convention #8 — verified at assertion this Stage 0):** two
  defects in the current D.3 row.
  1. **Wrong repo for the tutorial.** The PINN / elliptic-PDE example tutorials
     (`examples/helmholtz`, `examples/darcy`, `examples/ldc`, `airfoil_pinn`, …) live
     in **`NVIDIA/physicsnemo-sym`**, NOT the `NVIDIA/physicsnemo` *core* repo. Verified
     this Stage 0: `gh api repos/NVIDIA/physicsnemo-sym/contents/examples/helmholtz?ref=acaeb6dc…`
     returns `helmholtz.py` / `helmholtz_hardBC.py` / `helmholtz_ntk.py`; the core repo
     has no such PINN examples. task-7's cross-check oracle is the soft-constraint
     `examples/helmholtz/helmholtz.py` (Helmholtz at k=0 = Poisson).
  2. **Stale pin text.** `<latest 1.x>` no longer resolves to a current release: core
     `nvidia-physicsnemo` v1.x **ended at v1.3.0** (verified: `gh api
     repos/NVIDIA/physicsnemo/releases` → 1.x tags = {v1.0.0, v1.0.1, v1.1.0, v1.1.1,
     v1.2.0, v1.3.0}; latest = **v2.1.0**). The framework has moved to 2.x, so the 1.x
     pin is frozen-in-the-past.
  The spec's §2702 rule "PhysicsNeMo 1.x → 2.0: BLOCKED" is a **runtime-link** /
  pip-dependency rule; it does **not** bind a **READ-ONLY vendored** reference source
  (the vendored material is cited for independent derivation under spec §2.4/§2.8 +
  Convention #8 / §H.2 cite-don't-import, NOT pip-installed or runtime-linked). task-7
  vendored `references/PhysicsNeMo-PINN/` (LICENSE.txt + UPSTREAM_README.md +
  `examples/helmholtz/helmholtz.py` + `examples/helmholtz/helmholtz_hardBC.py`) +
  `MANIFEST.toml` at `physicsnemo-sym` v2.4.0 (`acaeb6dc38ecda58559b5286d3cb743e8cf930d3`,
  lightweight tag → commit, verified via `gh api
  repos/NVIDIA/physicsnemo-sym/git/refs/tags/v2.4.0`; Apache-2.0 via vendored
  `LICENSE.txt`).
- **Related plan defect (deferred to operator, NOT amended here — A-4 pattern, charter
  §0.3 no-plan-edit):** `docs/phases/phase-3-plan.md:293-300` (§2.18) pins task-7 at
  **`https://github.com/NVIDIA/physicsnemo`** (core) SHA `766e485a…` v2.1.0 — the **wrong
  repo** for the PINN tutorial (same defect as D.3 #1), and `:300` names the manifest
  `references/PhysicsNeMo-PINN/manifest.yaml` (the vendored manifest is `MANIFEST.toml`
  per the cloth/lenia/NCA precedent — a §0.3 SHIFT). The operator decides whether to
  re-point §2.18 to `physicsnemo-sym` `acaeb6dc…` (or ratify the core pin as an
  intentional record of the framework, with the read-only tutorial vendored separately).
- **Disposition:** PROPOSED. task-7 vendors `physicsnemo-sym` v2.4.0 (`acaeb6dc…`)
  read-only. Spec edit + §2.18 plan-registry re-point deferred to the operator at a phase
  boundary (spec frozen in Phase 3 per §9.6; agent does NOT edit the plan per §0.3).

## A-7 — Spec §2.18 dependency-registry: PhysGaussian License `MIT` → `NONE` (no-license / cite-only)

- **Surfaced by:** sub-phase-phase-3-3dgs-mpm (task-8), execution Stage 0 (2026-05-29).
  D-VENDOR-ROLE/SHA, operator-ratified: PhysGaussian is **cite-only, NO source vendoring**.
- **Location:** `docs/architecture.md:2551` (§2.18 dependency-version-pinning-policy table,
  PhysGaussian row).
- **Current text:**
  > `| **PhysGaussian (Xie 2024)** | Phase 4 Stage 19, Stage 22 | Latest stable; paper arXiv:2311.12198 | MIT | Web-fetch latest commit on main |`
- **Proposed text:**
  > `| **PhysGaussian (Xie 2024)** | Phase 4 Stage 19, Stage 22; Phase 3 task-8 (cite-only) | Latest stable; paper arXiv:2311.12198 | NONE (no LICENSE → all-rights-reserved; CITE-ONLY, no source vendored) | Web-fetch latest commit on main |`
- **Verified rationale (Convention #8 — verified at assertion this Stage 0):** the License
  column claims **MIT**, which is WRONG. Verified live 2026-05-29: `gh api
  repos/XPandora/PhysGaussian` returns `license: null`; `gh api
  repos/XPandora/PhysGaussian/contents/LICENSE` returns **404** (no LICENSE file in the root
  tree). With no license, the source is **all-rights-reserved by default** → it may be
  **cited** (facts/equations are not copyrightable) but **NOT vendored or redistributed**.
  task-8 therefore reimplements the coupling from the PAPER's published equations
  (arXiv:2311.12198) independently (spec §2.4) and records a **cite-only pointer** at
  `references/PhysGaussian/MANIFEST.toml` (no source tree). The **rest of the §2.18 row is
  correct**: the SHA pin `8339ed6aa2cd5d50e1001a254a3d95aea678a956` matches the upstream
  default-branch HEAD byte-for-byte (verified `gh api
  repos/XPandora/PhysGaussian/commits/main`), and the paper id arXiv:2311.12198 is correct.
- **Disposition:** PROPOSED. task-8 vendors NO PhysGaussian source (cite-only
  `references/PhysGaussian/MANIFEST.toml`, `source_vendored = false`). Spec edit deferred to
  the operator at a phase boundary (spec frozen in Phase 3 per §9.6; agent does NOT edit the
  plan per §0.3).

---

# ✅ APPLIED — Phase-4 close campaign (2026-05-31)

The §9.6 freeze lifted at the Phase-4 close boundary; both Phase-4 corrigenda
were applied to their target docs (the same mechanism that applied A-1..A-7 at
the Phase-3 close). The proposal entries below are retained as the audit trail.
Each target was re-located by content (discipline #8) before editing — the A-9
"`docs/architecture.md:1672` / `:2920`" dependent-occurrence refs were found to be
**mislabeled** (that content lives in `docs/phases/phase-4-plan.md`, not
architecture.md); architecture.md carried exactly one `MPL-2.0` occurrence (the
§D.3 row). The underlying fact of each was VERIFIED at application (verify-don't-trust):
OpenVDB `references/openvdb/LICENSE` = Apache-2.0 + NanoVDB SPDX = Apache-2.0;
`references/papers/` holds only `.gitkeep` (0 papers) + cat1 citation-chain GREEN.

| # | target(s) | applied | note |
|---|---|---|---|
| **A-8** | architecture.md § 12.9 + §61/§1866/Pattern-C/§F.3.5 entry-gate/LES-row; phase-4-plan.md §54/§68/§72/§2542/§2610/§2964; references/README.md | ✅ Phase-4 close | papers are CITED at Stage-0, NOT vendored (public-MIT IP). §2649 checklist RETAINED (papers pre-*identified* in §12.9 roster, *resolved* at Stage-0 — no vendoring implied). phase-0-plan.md historical scaffold prose left as landed-history record. |
| **A-9** | architecture.md §D.3 OpenVDB row; phase-4-plan.md §61/§249/§529/§1672/§1713/§1760/§2897/§2920 (+ §2881 changelog ANNOTATED not deleted); references/openvdb/MANIFEST.toml inline | ✅ Phase-4 close | OpenVDB `MPL-2.0` → `Apache-2.0` (relicensed at OpenVDB 12.0; as-vendored v13.0.0). Clears the A4 MANIFEST pin-consistency SOFT_WARN (MANIFEST + §D.3 now agree). |

**NUMBERING RECONCILIATION (one collision, reconciled forward).** The WU-B
sparse-volume foundation report + the `references/openvdb/MANIFEST.toml` inline note
recorded the OpenVDB-license corrigendum as an informal forward-reference **"A-8"**
(predating this central registry). The consolidation pass then filed the
papers-citation corrigendum as **A-8** and bumped OpenVDB to **A-9** here. The
chosen consistent numbering is the registry's: **A-8 = papers-citation, A-9 =
OpenVDB-license.** The `MANIFEST.toml` inline reference is reconciled forward to
A-9 (done at this close; no collision remains). The append-only-locked WU-B /
foundation-close / consolidation sealed audits that wrote "A-8" for OpenVDB are
**NOT retro-edited** (Convention A + D5); this note + the close landing audit are
the canonical going-forward record of the reconciliation.

---

# PROPOSED — Phase-4 corrigenda (entries retained as audit trail; APPLIED above)

> These entries were PROPOSED during Phase-4 execution while the spec was FROZEN
> mid-phase (`docs/architecture.md` §9.6); they were APPLIED at the Phase-4 close
> per the block above. Retained verbatim as the proposal/rationale record.

## A-8 — §12.9 frontier-paper vendoring → **CITED references resolved at sim Stage-0, NOT vendored binaries** (IP/redistribution correction)

- **Surfaced by:** Phase-4 consolidation pass C1 (2026-05-31), confirming the
  batch-1/2/3 banked finding B-1 ("13 frontier papers pre-vendored to
  `references/papers/`" is unrealized; `references/papers/` holds only `.gitkeep`).
- **IP-CRITICAL rationale (the load-bearing reason the resolution is "amend the
  expectation," NOT "vendor the papers"):** `bit-physics` is a **public,
  MIT-licensed** repository. Frontier papers (Kerbl 2023, Xie 2024 PhysGaussian,
  Mordvintsev 2022 Particle Lenia, Plantec 2022 Flow Lenia, Sanchez-Gonzalez 2020
  GNS, …) are **copyrighted works** distributed under publisher / arXiv
  non-redistribution terms (SIGGRAPH/ACM, CVPR/IEEE, *Complex Systems*, *Distill*,
  arXiv's non-exclusive license that does NOT grant third-party redistribution).
  Committing their PDFs to a public MIT repo is a **copyright-redistribution risk**.
  The §2.4 symmetric-bug guard ALREADY requires every reference implementation to be
  **derived independently from the published equations** (cite-don't-import, §H.2) —
  so the paper functions as a **CITATION**, never a vendored runtime/build
  dependency. The 9 landed Phase-4 sims (batches 1–3) + all Phase-3 sims resolve
  their paper citations by **web-fetch + cite-by-name with DOI/arXiv id at Stage 0**,
  and `integrity --all` cat1 (citation-chain) is **GREEN** (0 HARD_FAIL) at HEAD —
  i.e. the cite-not-vendor pattern is the *established, working* practice; §12.9's
  pre-vendoring text describes a process that was never adopted and should not be.
- **Confirmation (FACT, measured at HEAD `be29666`):** `ls references/papers/` →
  `.gitkeep` only (0 papers); `integrity --all --mode strict` → 0 HARD_FAIL / 14
  SOFT_WARN (cat1 citation chains for all 9 landed sims resolve). No landed sim ever
  read a file under `references/papers/`.

### A-8.1 — §12.9 body (`docs/architecture.md:2177-2204`)

- **Current text (`:2177-2184`, header + intent + contents):**
  > ## 12.9 Frontier paper vendoring (locked v2.2)
  >
  > Every load-bearing frontier paper (Phase 4 §§ 8.1–8.6 cited papers) is
  > pre-vendored to `references/papers/` BEFORE Phase 4 dispatches. Pre-vendoring is
  > an owner action; the agent's preflight script verifies the papers' presence.
  >
  > **Pre-vendoring contents per paper:** PDF … / cite.bib … / repo-sha.txt …
- **Proposed text:**
  > ## 12.9 Frontier paper citation (locked v2.2; **amended Phase-4 close — A-8**)
  >
  > Every load-bearing frontier paper (Phase 4 §§ 8.1–8.6 cited papers) is a **CITED
  > reference resolved at the sim's Stage-0 probe** (web-fetch; confirm
  > DOI/arXiv-id/authors/title; record a citation pointer + BibTeX metadata in the
  > sim's spec sheet / probe), **NOT a vendored binary.** The repo does **not** commit
  > copyrighted paper PDFs (public-MIT redistribution risk; §2.4 already mandates
  > independent derivation from the published equations, so the paper is a citation,
  > never a build/runtime dependency). The agent's preflight script verifies the
  > prior-phase tag + common-module presence + CUDA detection; it does **NOT** require
  > papers present under `references/papers/`.
  >
  > **Citation record per paper (in the consuming sim's spec sheet / Stage-0 probe):**
  > arXiv-id or DOI; authors + title + venue + year; the reference implementation's
  > repo SHA if one exists (pinned per Appendix D.3, vendored only if the repo's
  > LICENSE permits redistribution — papers themselves are never vendored).
- The **"Required pre-vendored papers" table (`:2186-2202`)** is RETAINED verbatim as
  the **"Phase-4 load-bearing citations"** roster (slug/stage map remains useful as a
  citation index); only the column-header word "pre-vendored" → "cited" changes.
- The fallback clause (`:2204`) is RETAINED (paper paywalled/removed → owner
  substitutes / defers / abandons) — it already describes a citation-availability
  policy, not a vendoring one.

### A-8.2 — dependent occurrences (apply consistently with A-8.1)

Grep-verified at HEAD (Convention #8); each asserts the unrealized pre-vendoring and
should read as "cited at Stage-0":
- `docs/architecture.md:61` — v2.2 changelog bullet ("every load-bearing frontier
  paper is pre-vendored … before Phase 4 dispatch" → "… is cited at the sim Stage-0
  probe").
- `docs/architecture.md:1866` — "Phase-specific gates (… Phase 4: … frontier-paper
  vendoring)" → "frontier-paper citation".
- `docs/architecture.md:2649` — checklist item 7 ("Do NOT pick research papers … at
  stage time. All pre-resolved in this appendix or the phase plan") — RETAIN intent;
  the papers are pre-*identified* in §12.9's roster, *resolved* (web-fetched) at
  Stage-0. No vendoring implied; no edit strictly required.
- `docs/architecture.md:2723` — Pattern C: "Check `references/papers/` for
  pre-vendored copy. If found, use it." → "Web-fetch the paper; confirm DOI/authors/
  title; cite by name (the §12.9 citation record). If implementation-load-bearing and
  unavailable: BLOCKED."
- `docs/architecture.md:2826` — Pattern C label "Frontier paper unavailable and not
  pre-vendored" → "Frontier paper unavailable" (drop "and not pre-vendored").
- `docs/architecture.md:2877` — the Phase-4 LES-paper row ("Owner pre-vendors specific
  paper to `references/papers/learned-les-closure/`") → "Owner pre-identifies the
  specific LES paper; agent cites it at Stage 35 Stage-0" (Stage 35 is CUDA-bound /
  deferred regardless — see C6 deferred-scope).
- `docs/architecture.md:2922` — §F.3.5 Phase-4 entry gate "**All 13 frontier papers
  pre-vendored** to `references/papers/` per spec § 12.9" → "All 13 frontier-paper
  **citations identified** in §12.9 (resolved at each sim's Stage-0)". (This is the
  entry-gate line the foundation-close pass could not satisfy as written.)
- `docs/phases/phase-4-plan.md:54,68,72,2542,2610,2964` — the plan's
  "FRONTIER PAPERS PRE-VENDORED" / "all 13 … vendored to `references/papers/`" /
  preflight "verifies … frontier paper vendoring" / "paper fetches replaced by
  pre-vendoring" prose. Re-point to "cited at Stage-0." Per §0.3 the agent does NOT
  edit the plan; the operator reconciles these at the close (A-4/A-6 deferral pattern).
- `docs/phases/phase-0-plan.md:429,731,1142-1143` — Block-1/Block-4 scaffold prose
  that created `references/papers/` and a README promising "Phase 4 pre-dispatch
  vendors frontier papers." HISTORICAL (Phase-0 landed); lowest priority. The
  `references/papers/.gitkeep` directory may stay (harmless) or be removed; the
  README stub's promise should be softened to "Phase 4 sims cite frontier papers at
  Stage-0; this directory holds only repos whose LICENSE permits redistribution."

### A-8.3 — §0.3 SHIFT record

This is a **§0.3 on-evidence SHIFT** (charter prose vs landed reality): the
phase-4-plan §2/§8.4 prose "consume from `references/papers/`" was unrealizable
(papers were never vendored, and should not be for IP reasons). The landed sims
shifted to **cite-at-Stage-0** — the sound, IP-safe, §2.4-compatible practice — with
no loss of verification rigor (independent derivation from published equations is the
anchor, not a vendored PDF). Recorded in
`docs/_audits/phase-4/mid-phase-state-*.md` (C1 disposition).

- **Disposition:** PROPOSED. No file under `references/papers/` is added (IP). The 9
  landed sims already comply (cite-at-Stage-0; cat1 GREEN). Spec + plan edits deferred
  to the operator at the Phase-4 close (spec frozen mid-phase per §9.6; agent does NOT
  edit the plan per §0.3).

## A-9 — OpenVDB license `MPL-2.0` → **`Apache-2.0`** (as-vendored v13.0.0; formalizes the WU-B inline corrigendum)

- **Surfaced by:** WU-B sparse-volume Stage 0 (2026-05-30), recorded INLINE in
  `references/openvdb/MANIFEST.toml:19-25` as "proposed corrigendum (A-8) in the WU-B
  audit" but **never transcribed to this central registry** — re-confirmed + filed by
  the Phase-4 consolidation pass C5 (2026-05-31). **Numbering note:** the WU-B audit's
  informal forward-reference "A-8" predates this central Phase-4 registry, where C1's
  papers corrigendum already took A-8; OpenVDB is **A-9** here. Both are Phase-4
  corrigenda applied together at the close.
- **Verified rationale (Convention #8 — verified at assertion, FACT):** OpenVDB
  **relicensed from MPL-2.0 to Apache-2.0** (effective OpenVDB 12.0, 2025). The
  **as-vendored v13.0.0** proves it: `references/openvdb/LICENSE` is the Apache-2.0
  text, and `references/openvdb/nanovdb/.../NanoVDB.h` carries
  `SPDX-License-Identifier: Apache-2.0`. `references/openvdb/MANIFEST.toml:6` records
  `license = "Apache-2.0"` (the as-vendored truth). The spec/plan's `MPL-2.0` is stale.
  The integrity A4 MANIFEST-pin-consistency guard **SOFT_WARNs** this drift on every
  `pytest tools/integrity/tests/` run (`references/openvdb/MANIFEST.toml: license drift
  — MANIFEST [upstream].license='Apache-2.0' but architecture.md § D.3 says 'MPL-2.0'`);
  applying this corrigendum clears the warning. **License-risk delta: NONE** — Apache-2.0
  is strictly MORE permissive than MPL-2.0 and MIT-compatible (the §12.7 portfolio-MIT
  posture is unaffected; the §F.3.5 "non-modification" MPL caveat becomes moot).
- **Primary location — `docs/architecture.md:2560`** (Appendix D.3 vendored-pins table):
  - **Current:** `| **OpenVDB (incl. NanoVDB)** | Phase 4 WU-B; Phase 4 Stages 15, 16, 18 | Latest stable at WU-B time (expect v12.x+ as of May 2026) | **MPL-2.0** | `gh release view -R AcademySoftwareFoundation/openvdb` |`
  - **Proposed:** same row with `**MPL-2.0**` → `**Apache-2.0** (relicensed from MPL-2.0 at OpenVDB 12.0; as-vendored v13.0.0 LICENSE + NanoVDB.h SPDX = Apache-2.0)`.
- **Dependent occurrences (grep-verified; reconcile to Apache-2.0):**
  - `docs/architecture.md:1672` — "License note: OpenVDB is MPL-2.0 (Mozilla Public License v2.0)."
  - `docs/architecture.md:2920` — the §12.7 "OpenVDB MPL-2.0 license implications" para
    (the MPL weak-copyleft caveat becomes a no-op under Apache-2.0; RETAIN the
    "don't-modify-vendored-source" rule on general grounds).
  - `docs/phases/phase-4-plan.md` lines 61, 249, 529, 1713, 2897 — the plan's repeated
    "MPL-2.0" / "MPL-2.0 (not Apache-2.0)" entries. **NB `docs/phases/phase-4-plan.md:2881`**
    (the v6.0 changelog) reads "OpenVDB license corrected (MPL-2.0, not Apache-2.0)" — that
    earlier "correction" is now itself stale (the relicense went MPL→Apache); the operator
    should annotate, not delete, the changelog line (audit trail). Per §0.3 the agent does
    NOT edit the plan; the operator reconciles at the close.
- **Disposition:** PROPOSED + cheap/verified. The MANIFEST already records the
  as-vendored truth (Apache-2.0); this only re-points the spec/plan registry. Spec edit
  deferred to the operator at the Phase-4 close (spec frozen mid-phase per §9.6).
