# reaction-diffusion-3d

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.6. Implementation
> deferred to Phase 2+.

**Category:** continuous-CA (spec § 5.2.1). Stack C (Vulkan).
**Variant:** `gray-scott-3d`.

**Summary.** 3D extension of Phase 0's Gray-Scott RD-2D. Stack C
explicit forward Euler in time + 7-point Laplacian in space, periodic
BCs. Visualization is ray-marched iso-surface. The RD-3D bundle
co-ships a 2D Gray-Scott MMS (the **same** manufactured-solution
structure dropped to 2D) so Phase 0's RD-2D can also gain an
MMS-based code-verification anchor at Phase 2+; this co-bundle is
explicit in charter R8 amendment.

See [`spec-ref.md`](./spec-ref.md), [`algebraic.md`](./algebraic.md),
the MMS solutions at
[`tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`](../../../../tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/)
and
[`tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`](../../../../tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/).
