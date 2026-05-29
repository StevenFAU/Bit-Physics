# Proposed spec amendments (operator applies at phase/sub-phase close)

> The spec (`docs/architecture.md`) is **FROZEN in Phase 3** (architecture.md
> §9.6). Corrigenda discovered during execution are **proposed here**, not applied
> inline, and the operator applies them at a phase boundary. Each entry records the
> exact location, the current text, the proposed text, and the verified rationale.

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
