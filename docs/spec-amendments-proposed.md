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
