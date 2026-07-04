# pic-flip

Phase-6 Lane-C sim #1 (full posture) — hybrid particle-grid free-surface
fluid. **APIC** (Jiang et al. 2015) is the primary verified transfer;
**PIC** and **FLIP** are first-class comparison modes.

- Reference spec: `docs/sim-specs/particle-fluids/pic-flip/spec-ref.md` (v0.2)
- Derivation docs: `docs/sim-specs/particle-fluids/pic-flip/algebraic.md`,
  `determinism.md`, `equivalence.md`
- Golden tables: `tools/testkit/golden/tables/particle-fluids/`
  (`apic-transfer-weights.json`, `apic-angular-momentum.json`,
  `apic-affine-roundtrip.json`, `pic-flip-transfer-error.json`) — all
  generated + re-proven in exact rational arithmetic by the generators
  under `tools/testkit/golden/generator/`.
- Web frontend spec (Stack B): `packages/pic-flip/web/verification-demo-spec.md`

Layout: `pic_flip/reference/{apic.py, poisson_masked.py, regularizers.py}`
(transfers + step; NEW masked free-surface Poisson; Muller's two
"necessary" regularizers), `pic_flip/sim.py` (canonical 3D dam-break
capture + diagnostics), `pic_flip/invariants.py` (gate-12 PBT).

```bash
# reference tests (TDD-first)
cd packages/pic-flip && uv run --no-sync pytest tests/ -v
# golden regeneration/verification (idempotent at HEAD)
python3 tools/testkit/golden/generator/apic_angular_momentum.py --verify
```
