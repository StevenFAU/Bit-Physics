# D1 — Citations & References (EXHAUSTIVE back-test @ HEAD 4ee0ea9)

Pin: `4ee0ea9` (3dgs-mpm Stage 2 landing audit — task-8 FINALE, Phase-3 tasks 1-8 complete).
Worktree: `/home/otacon/Projects/bp-audit-2` at HEAD `4ee0ea9`. READ-ONLY for source.
`git status` shows only 4 LFS-smudge artifacts under `tests/fixtures/legacy-captures/`
(R2/GitHub-LFS pointer smudge, NOT source edits by this audit) + the new `_audits/`
evidence dir. No source/spec/test file was modified.

Prior D1 evidence read as a checklist:
`/home/otacon/Projects/bp-audit/docs/_audits/back-test-20260529T124759Z/evidence/D1-citations.md`
(pin `869bf68`, mid-task-5; tasks 5-8 goldens were RED/absent there). Every claim
below re-confirmed AT HEAD; nothing trusted from the prior pin.

Spec authority for the ≥3-anchor rule: `docs/architecture.md` revised §2.4 +
gate-4 restatements. Operative ENFORCEMENT:
`tools/integrity/integrity/cat3_numerical/golden_values.py`. The golden VERIFIER
(`tools/testkit/golden/verifier.py`) checks numeric tolerance ONLY — it never
inspects `independent_reference`.

---

## DENOMINATOR (declared, then checked — checked == denominator per set)

| set | what | count | enumeration command |
|-----|------|-------|---------------------|
| (a)-deriv | golden DERIVATION files | **15** | `git ls-files 'tools/testkit/golden/derivations/*'` |
| (a)-table | golden TABLE files | **19** | `git ls-files 'tools/testkit/golden/tables/**'` |
| (c) | locked upstream SHAs in phase-3-plan §2.18 | **5** | `docs/phases/phase-3-plan.md:261,274,285,294,302` |
| (d) | NEW task-5–8 external cites | **9 cite-targets** (Bender/Macklin cloth; Mordvintsev Distill + growing-neural-ca repo; Raissi 2019; Evans §2.2; Strauss §6.2; physicsnemo-sym; PhysGaussian Eq.(8); PhysGaussian Eq.(9); Kerbl 3DGS + NO-LICENSE finding) | inline below |
| (e) | distinct vendored-FILE:LINE cites | **10** | `git grep -nIoE 'references/…\.(py\|cpp\|h\|comp\|json\|toml):[0-9]+(-[0-9]+)?'` |

Delta vs prior pin: derivations 13→**15** (+`3dgs-mpm-coupling.md`,
`poisson-2d-analytical.md`); tables 15→**19** (+`3dgs-mpm-coupling.json`,
`cloth-hanging.json`, `cloth-stretched.json`, `pinn-poisson-canonical.json`).
cloth-catenary-limit went from table-less-at-pin (RED) to backing 2 committed tables.

---

## (a) Golden derivations + tables — full enumeration + reconciliation

- Every table's `derivation.doc` resolves to a real derivation file: **19 / 19 OK**.
- Every table is covered by cat3's `_gather_tables` walk: the 4 NEW tables
  (`3dgs-mpm-coupling`, `cloth-hanging`, `cloth-stretched`, `pinn-poisson-canonical`)
  all sit at TOP-LEVEL of `tools/testkit/golden/tables/`, so `base.glob("*.json")`
  (golden_values.py:53) picks them up. **19 / 19 enforced — NO table escapes the gate.**
- Reconciliation (15 docs vs 19 tables): 4 docs back 2 tables each —
  `ising-onsager.md` (Tc + magnetization), `lenia-kernel.md` (kernel + orbium),
  `rigid-body-rk4-reference.md` (6dof + double-pendulum), `cloth-catenary-limit.md`
  (cloth-hanging + cloth-stretched). 15 + 4 = 19. Reconciled.

### Per-table DISTINCT-anchor census (the KEY NEW CHECK; M-3-linked)

DISTINCT = count of distinct `independent_reference` JSON values (and distinct
`source` field). cat3 mechanical count = points carrying the KEY.

| # | table | sim | #pts | #anchored | cat3 mech count | DISTINCT refs | verdict |
|---|-------|-----|------|-----------|-----------------|---------------|---------|
| 1 | 3dgs-mpm-coupling.json | 3dgs-mpm | 3 | 3 | PASS (≥3) | **3** (Eq.8 / Eq.9 same-theory caveat / F=I) | PASS-mech; **MINOR** Anchor 2 self-declares "NOT fully-independent (same theory, PhysGaussian Eq.9)". 2 fully-independent + 1 same-theory. See F-D1-07 |
| 2 | agent-based/boids-3agent-step1.json | (phase-2) | 3 | 3 | PASS | 3 (hand / Reynolds 1987 / Reynolds 1999) | PASS |
| 3 | agent-based/physarum-deposit-step1.json | (phase-2) | 3 | 3 | PASS | 3 (hand / Jones 2010 / Py regen) | PASS |
| 4 | closed-form/lorenz-structural.json | (phase-2) | 3 | 3 | PASS | 3 (Lorenz 1963 / Sparrow 1982+Strogatz / Lorenz 1963 p137) | PASS |
| 5 | closed-form/mandelbulb-de-samples.json | (phase-2) | 3 | 3 | PASS | 3 (Quilez 2009 / hand §2 / hand §3) | PASS |
| 6 | **cloth-hanging.json** | cloth | 32 | 3 | PASS | **3** (Beer&Johnston catenary / hand force-balance / Marion&Thornton variational) | PASS — 3 genuinely distinct |
| 7 | **cloth-stretched.json** | cloth | 8 | 3 | PASS | **3** (Hooke superposition / series-spring k_eq / energy-min convexity) | PASS — 3 distinct methods (all elementary statics; no published-paper anchor, but 3 distinct derivations). MINOR-note only |
| 8 | cubic-spline-kernel.json | (phase-0) | 9 | 3 | PASS | 3 strings BUT 2 distinct WORKS / 1 AUTHOR (Monaghan 2005 Eq.2.7 ×2 + Monaghan 1992) | **MINOR** STILL-LIVE (F-D1-04 prior). See F-D1-04 |
| 9 | hybrid-pg/mls-mpm-shape-functions.json | (phase-2) | 4 | 4 | PASS | 4 (hand / Hu 2018 / Steffen-Kirby-Berzins 2008 / Py regen) | PASS |
| 10 | ising-classical-critical-temperature.json | ising | 3 | 3 | PASS | 3 (Onsager 1944 / Kramers-Wannier 1941 / Landau-Binder) | PASS |
| 11 | ising-classical-magnetization.json | ising | 6 | 3 | PASS | 3 (Baxter 1982 / Newman-Barkema 1999 / Yang 1952) | PASS |
| 12 | lattice/d3q19-equilibrium.json | (phase-2) | 4 | 4 | PASS | 4 (hand / Qian 1992 / Krüger 2017 / Py regen) | PASS |
| 13 | lenia-kernel.json | lenia | 9 | 3 | PASS | 3 hand-derivs of K(r), ALL cross-checked vs SAME vendored Chakazul; no 2nd published source | **MINOR** STILL-LIVE (F-D1-05 prior) |
| 14 | lenia-orbium-trajectory.json | lenia | 5 | 4 | PASS | 4 seed-pinned self-reproductions of THIS repo's own sim/IC | **MINOR** STILL-LIVE (F-D1-05 prior) |
| 15 | particle-fluids/dfsph-density-evolution.json | (phase-2) | 3 | 3 | PASS | 3 (hand / Bender-Koschier 2015+Monaghan / cross-anchor cubic-spline) | PASS |
| 16 | **pinn-poisson-canonical.json** | pinn | 12 | 3 | PASS | **3** (Evans §2.2 fundamental-soln / Strauss §6.2 separation / hand MMS) | PASS — 3 distinct, 2 published textbooks + 1 MMS |
| 17 | rigid-body-6dof-trajectory.json | rigid-body | 4 | 4 | PASS (mech) | **1** ("independent physical invariant; E(0)…" ×4) | **MAJOR** STILL-LIVE = M-4. See F-D1-02 |
| 18 | rigid-body-double-pendulum-trajectory.json | rigid-body | 5 | 5 | PASS (mech) | **1** ("standard planar double-pendulum equations…" ×5) | **MAJOR** STILL-LIVE = M-5. See F-D1-03 |
| 19 | rigid-body-pendulum-trajectory.json | rigid-body | 7 | 7 | PASS | 3 (Marion&Thornton §3.2 / DLMF §19.2 / DLMF §22.19; 5 of 7 repeat DLMF 22.19) | PASS |

**Tables with <3 DISTINCT `independent_reference` (the M-3 hole exploited):**
- `rigid-body-6dof-trajectory.json` — **1 distinct** (M-4, MAJOR).
- `rigid-body-double-pendulum-trajectory.json` — **1 distinct** (M-5, MAJOR).
- `cubic-spline-kernel.json` — 3 distinct strings but 1 distinct AUTHOR (MINOR, F-D1-04).

**NEW task-5–8 tables (cloth/nca/pinn/3dgs-mpm) vs the M-3 hole — KEY NEW CHECK:**
- cloth `cloth-hanging.json` = **3 distinct** ✓; `cloth-stretched.json` = **3 distinct** ✓.
- pinn `pinn-poisson-canonical.json` = **3 distinct** (2 published textbooks + MMS) ✓.
- 3dgs-mpm `3dgs-mpm-coupling.json` = **3 distinct** but Anchor 2 self-declares
  same-theory-not-fully-independent (F-D1-07, MINOR — caveat is IN the derivation,
  honest, not a hidden defect).
- nca = **NO golden table** in `tables/` (NCA uses `golden_checkpoint_match` L2 +
  statistical render-similarity on committed captures; D-ANCHOR re-shaped because the
  published Distill PSNR/SSIM anchors DO NOT EXIST). So nca CANNOT exploit the M-3
  golden-table hole — there is no golden table to exploit.
**Verdict on the KEY NEW CHECK: tasks 5–8 do NOT exploit the M-3 hole the way
rigid-body (task-4) does.** Each NEW golden table that exists carries ≥3 genuinely
distinct `independent_reference` values. The lone same-theory softness (3dgs-mpm
Anchor 2) is self-disclosed in its derivation doc.

**Checked (a): 15 / 15 derivations + 19 / 19 tables = denominator met.**

---

## (c) Locked upstreams (phase-3-plan §2.18) — citation + web-verification

| upstream | §2.18 line / SHA | web-verify | verdict |
|----------|------------------|-----------|---------|
| Inria gaussian-splatting (task-1) | `:261` `54c035f7…` HEAD, NOASSERTION non-commercial | repo `graphdeco-inria/gaussian-splatting` exists; Kerbl 2023 3DGS = arXiv:2308.04079, ACM TOG SIGGRAPH 2023 VERIFIED (Kerbl/Kopanas/Leimkühler/Drettakis) | PASS |
| PhysGaussian (task-8) | `:274` `8339ed6a…` HEAD; License: **NONE (all-rights-reserved)** | arXiv:2311.12198 (CVPR 2024 Highlight) VERIFIED; **NO-LICENSE re-confirmed AT HEAD** via github.com/XPandora/PhysGaussian — no LICENSE/COPYING/license declaration visible | PASS — NO-LICENSE finding STILL-LIVE/accurate |
| Bender PositionBasedDynamics (task-5) | `:285` `d0894bdb…` (master HEAD) | repo exists; vendored MANIFEST pins `aa62c44f…` (=tag 2.2.0). **TWO SHAs DIFFER** (m-10). Basis Macklin/Müller/Chentanez 2016 XPBD (MIG 2016, DOI 10.1145/2994258.2994272) VERIFIED | PASS-cite; m-10 SHA-drift STILL-LIVE (tracked A-3). See F-D1-06 |
| PhysicsNeMo (task-7) | `:294` `766e485a…` (core `NVIDIA/physicsnemo` v2.1.0) | **the §2.18 pin is the WRONG repo.** task-7 vendored `references/PhysicsNeMo-PINN/MANIFEST.toml` = `physicsnemo-sym` v2.4.0 `acaeb6dc38ecda58559b5286d3cb743e8cf930d3` (Apache-2.0). PINN tutorials live in physicsnemo-**sym**, not core. Raissi 2019 basis VERIFIED (378:686-707, ADS 2019JCoPh.378..686R) | PASS-cite (Raissi resolves); **§2.18↔vendored SHA+repo MISMATCH** tracked A-6. See F-D1-08 |
| Lenia Chakazul (task-3) | `:302` `adfc5429…` (master HEAD), MIT | repo exists; vendored MANIFEST `references/Chakazul-Lenia/` SHA == `adfc5429…` MATCH; Chan 2019 basis (arXiv:1812.05433) | PASS |

**Checked (c): 5 / 5 locked upstreams.** All 5 SHAs present at the cited lines; all
basis papers web-resolved. ZERO unresolvable. 2 SHA-consistency defects surfaced
(m-10 Bender; §2.18 PhysicsNeMo wrong-repo) — both pre-tracked corrigenda (A-3, A-6).

---

## (d) NEW task-5–8 external cites — web-resolution

| cite | where (repo) | claim | web-resolution | verdict |
|------|--------------|-------|----------------|---------|
| Macklin/Müller/Chentanez 2016 "XPBD" | `references/PositionBasedDynamics/MANIFEST.toml:10`; `docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md` | basis for cloth XPBD α=1/(k·dt²), Δλ=−(C+αλ)/(K+α) | MIG 2016, DOI 10.1145/2994258.2994272, Macklin/Müller/Chentanez VERIFIED | PASS |
| Mordvintsev et al. 2020 "Growing Neural Cellular Automata", Distill | `references/growing-neural-ca/MANIFEST.toml:10,59` | per-cell rule anchors; **publishes NO PSNR/SSIM/LPIPS, only pixel L2/MSE** | Distill 2020 (distill.pub/2020/growing-ca) VERIFIED; MANIFEST states "zero occurrences of psnr/ssim/lpips in the notebook" → drove D-ANCHOR re-shape | PASS — NO-PSNR/SSIM finding STILL-LIVE/CONFIRMED |
| growing-neural-ca vendored repo | `references/growing-neural-ca/MANIFEST.toml:4` SHA `3d5547ca…` Apache-2.0 | google-research/self-organising-systems HEAD | repo exists; SHA+notebook vendored; Apache-2.0 | PASS |
| Raissi/Perdikaris/Karniadakis 2019 (PINN) | `references/PhysicsNeMo-PINN/MANIFEST.toml:10`; `poisson-2d-analytical.md` | J.Comput.Phys 378:686-707 | VERIFIED (ADS 2019JCoPh.378..686R; ScienceDirect S0021999118307125) | PASS |
| Evans PDE 2e §2.2 "Laplace's Equation" §2.2.1 | `poisson-2d-analytical.md` Anchor 1; `pinn-poisson-canonical.json` | 2D fundamental soln Φ=−1/(2π)ln\|x\| | Evans Ch.2 §2.2 = Laplace's Equation, §2.2.1 = Fundamental Solution; n=2 form −1/(2π)log\|x\| is the standard 2D result VERIFIED | PASS — section EXISTS, content correct |
| Strauss PDE 2e §6.2 "Rectangles and Cubes" | `poisson-2d-analytical.md` Anchor 2 (SHIFT §6.1→§6.2); `pinn-poisson-canonical.json` | separation-of-variables on rectangle, sinh(πx)sin(πy) | Strauss Ch.6 "Harmonic Functions" §6.2 "Rectangles and Cubes" = separation on rectangles VERIFIED. The derivation's SHIFT (plan said §6.1; §6.1 is general Laplace, §6.2 is the rectangle construction) is the CORRECT fix | PASS — SHIFT is correct, section EXISTS |
| PhysGaussian Eq.(8) Σ'=F·A·Fᵀ | `3dgs-mpm-coupling.md`; `3dgs-mpm-coupling.json` upstream | covariance transform under F | arXiv:2311.12198 Eq.(8) = `a_p(t)=F_p(t)A_p F_p(t)^T` VERIFIED VERBATIM | PASS — equation EXISTS, matches |
| PhysGaussian Eq.(9) polar decomp F=R·S | `3dgs-mpm-coupling.md` Anchor 2 | rotation×stretch | arXiv:2311.12198 Eq.(9) = "polar decomposition F_p=R_p S_p" VERIFIED | PASS — equation EXISTS, matches |
| Kerbl et al. 3DGS SIGGRAPH 2023 | spec §12 / Inria upstream | basis for common-3dgs | arXiv:2308.04079, ACM TOG VERIFIED | PASS |

**Checked (d): 9 / 9 NEW external cite-targets web-resolved. ZERO cite to a
non-existent section/equation/page.** Every flagged section/equation EXISTS and
matches the claim. The one prior NCA "fabricated published PSNR/SSIM anchors"
finding is RESOLVED-AT-HEAD: task-6's D-ANCHOR was re-shaped to L2 + statistical
floors precisely because those metrics don't exist (no fabricated cite survives).

---

## (e) Vendored FILE:LINE citations — verified at HEAD

Universe = `git grep -nIoE` over all tracked files (excl. `_audits`, `CHANGELOG.md`).
**10 distinct vendored-file:line targets** (multiple citing sites collapse to these):

| # | vendored file:line | actual content @ HEAD | matches? |
|---|--------------------|----------------------|----------|
| 1 | references/Chakazul-Lenia/Python/LeniaF.py:493 | `1: lambda r: (r>0)*(r<1) * (4 * r * (1-r))**4,  # polynomial (quad4)` | YES |
| 2 | references/Chakazul-Lenia/Python/LeniaF.py:500 | `1: lambda n, m, s: np.maximum(0, 1 - (n-m)**2 / (9 * s**2) )**4 * 2 - 1,  # polynomial (quad4)` | YES |
| 3 | references/Chakazul-Lenia/Python/LeniaND.py:273 | `0: lambda r: (4 * r * (1-r))**4,  # polynomial (quad4)` | YES |
| 4 | references/Chakazul-Lenia/Python/LeniaND.py:279 | `0: lambda n, m, s: np.maximum(0, 1 - (n-m)**2 / (9 * s**2) )**4 * 2 - 1,  # polynomial (quad4)` | YES |
| 5 | references/Chakazul-Lenia/Python/animals.json:5 | `{"code":"O2u","name":"Orbium unicaudatus",…"params":{"R":13,"T":10,"b":"1","m":0.15,"s":0.015,"kn":1,"gn":1},…}` | YES |
| 6 | references/PositionBasedDynamics/PositionBasedDynamics/XPBD.cpp:36-58 (RANGE, cited by `cloth_xpbd.comp:14`) | line36=`Real alpha = 0.0;` line39=`alpha = …/(stiffness*dt*dt)` line53=`const Real delta_lambda = -Kinv * (C + alpha * lambda);` | YES — range start+region correct |
| 7 | references/PositionBasedDynamics/PositionBasedDynamics/XPBD.cpp:39 (cited by `spec-ref.md:40`) | `alpha = static_cast<Real>(1.0) / (stiffness * dt * dt);` | YES |
| 8 | references/SPlisHSPlasH/MANIFEST.toml:3 (probe self-cite) | `version      = "2.16.1"` | YES |
| 9 | references/SPlisHSPlasH/MANIFEST.toml:4 | `sha          = "6bff55a6eaf14083d34650f22a268ce156b62b54"` | YES |
| 10 | references/SPlisHSPlasH/MANIFEST.toml:6 | `license      = "MIT"` | YES |

Vendored MANIFEST SHAs at HEAD: Chakazul-Lenia `adfc5429…`, PositionBasedDynamics
`aa62c44f…` (=2.2.0), SPlisHSPlasH `6bff55a6…` (=2.16.1), growing-neural-ca
`3d5547ca…` (Apache-2.0), PhysicsNeMo-PINN `acaeb6dc…` (physicsnemo-sym v2.4.0).

**Checked (e): 10 / 10 vendored file:line cites. ZERO wrong lines.**

---

## RE-TESTED PRIOR FINDINGS — verdict table

| ID | prior claim | HEAD verdict | evidence @ 4ee0ea9 |
|----|-------------|--------------|--------------------|
| **M-3** | `_anchor_count` field-presence-only; no distinctness check | **STILL-LIVE** | `golden_values.py:61-65` `_anchor_count` = `sum(1 for p in points if isinstance(p,dict) and "independent_reference" in p)` — pure KEY-presence count. Gate `:86-98` HARD_FAILs only if `<3`. No distinctness, no upstream-independence, no source-normalization. verifier.py checks tolerance only. 3 identical anchors PASS. |
| **M-4** | rigid-body-6dof: all anchors IDENTICAL "conservation of energy" → 1 distinct | **STILL-LIVE** | `rigid-body-6dof-trajectory.json` — 4 anchors, all `source="independent physical invariant; E(0) computed from the IC"`; **distinct=1**. Backing `rigid-body-rk4-reference.md:11-15` self-declares the RK4 ref "does **not** count toward the '≥3 independent analytic anchors' requirement". |
| **M-5** | double-pendulum: all anchors IDENTICAL "double-pendulum EOM" → 1 distinct | **STILL-LIVE** | `rigid-body-double-pendulum-trajectory.json` — 5 anchors, all `source="standard planar double-pendulum equations; independent of the production ABA"`; **distinct=1**. Same self-declaration in the backing derivation. |
| **m-10** | Bender SHA: §2.18 `d0894bdb` vs MANIFEST `aa62c44f`(=2.2.0) | **STILL-LIVE** (tracked A-3) | `phase-3-plan.md:285` = `d0894bdb0190c5f273c0500ecad0e8c2bf21fc5f`; `references/PositionBasedDynamics/MANIFEST.toml:3-4` = version 2.2.0 / sha `aa62c44f0d43956452e1f960a40333ec2d6d3ea5`. Both confirmed; differ. |
| NCA-fabricated-anchors | (prior NCA finding) plan's "published Distill PSNR/SSIM anchors" don't exist | **RESOLVED-AT-HEAD** | task-6 landed with D-ANCHOR re-shaped to L2 + statistical floors. `references/growing-neural-ca/MANIFEST.toml:10,59` verifies "zero occurrences of psnr/ssim/lpips in the notebook". No fabricated cite remains in a landed artifact. |

---

## NEW FINDINGS (file:line | claim | observed | remediation | severity)

- **F-D1-01** (= M-3) | BLOCKER-of-the-gate / METHOD | `tools/integrity/integrity/cat3_numerical/golden_values.py:61-98` | spec §2.4 requires ≥3 anchors from sources independent of the vendored upstream; gate-4 enforces it | `_anchor_count` counts test-points carrying the `independent_reference` KEY only; never checks distinctness, never checks upstream-independence; verifier.py checks tolerance only. A table with one source pasted 3× PASSES. Confirmed UNCHANGED across the 4 NEW task-5–8 tables. | TOOLING. Add a distinctness check: HARD/SOFT on `len({normalize(p["independent_reference"]["source"]) for anchored p}) < 3`, and flag any anchor whose source substring-matches `derivation.upstream`. | **MAJOR** (gate-design gap; enables F-D1-02/03) |
- **F-D1-02** (= M-4) | DATA | `tools/testkit/golden/tables/rigid-body-6dof-trajectory.json` test_points[0..3] | 4 anchors ⇒ ≥3 satisfied | all 4 `independent_reference.source` IDENTICAL = "independent physical invariant; E(0) computed from the IC"; **1 distinct source, 0 published refs**. Backing derivation self-declares these do NOT count toward §2.4. | (a) re-characterize as numerical-regression baseline + cat3 explicit exemption (matches the derivation's own stance), OR (b) add ≥3 genuinely-distinct anchors. | **MAJOR** |
- **F-D1-03** (= M-5) | DATA | `tools/testkit/golden/tables/rigid-body-double-pendulum-trajectory.json` test_points[0..4] | 5 anchors ⇒ ≥3 satisfied | all 5 IDENTICAL = "standard planar double-pendulum equations; independent of the production ABA"; **1 distinct source, 0 published refs**; double pendulum is chaotic (no closed form), so the honest fix is exemption+relabel. | exempt-and-relabel as numerical baseline (mirror the derivation doc), OR supply 3 distinct anchors. | **MAJOR** |
- **F-D1-04** | DATA | `tools/testkit/golden/tables/cubic-spline-kernel.json` test_points[0],[4],[8] | 3 independent anchors | anchor[0]==anchor[4] both "Monaghan 2005 …Eq.(2.7)"; anchor[8]=Monaghan 1992. 3 distinct STRINGS, 2 distinct WORKS, **1 distinct AUTHOR (Monaghan)**. Price 2012 is cited in the derivation (`cubic-spline-kernel.md:104`) but not promoted to an anchor. | promote Price 2012 (DOI 10.1016/j.jcp.2010.12.011) or Dehnen-Aly 2012 as the 3rd anchor → 3 distinct authors. | **MINOR** STILL-LIVE |
- **F-D1-05** | DATA | `lenia-kernel.json` test_points[0],[4],[8] + `lenia-orbium-trajectory.json` test_points[0..3] | ≥3 anchors independent of vendored upstream | lenia-kernel: 3 hand-derivs of K(r)=(4r(1-r))⁴ all cross-checked vs the SAME vendored Chakazul; no 2nd published source. lenia-orbium: 4 seed-pinned self-reproductions of this repo's own sim — cross-stack/regression independence, not external. | optionally add a Chan 2019 (Complex Systems 28(3), arXiv:1812.05433) published anchor. | **MINOR** STILL-LIVE |
- **F-D1-06** (= m-10) | DOC | `docs/phases/phase-3-plan.md:285` vs `references/PositionBasedDynamics/MANIFEST.toml:4` | §2.18 pins Bender at `d0894bdb…` | vendored tree pins `aa62c44f…` (=tag 2.2.0). Differ. | already tracked as corrigendum A-3 (`docs/spec-amendments-proposed.md`); operator applies. Both SHAs web-exist, both J.Bender; all XPBD.cpp vendored-line cites verify against the 2.2.0 tree. | **MINOR (note-only)** STILL-LIVE/tracked |
- **F-D1-07** | DATA | `tools/testkit/golden/tables/3dgs-mpm-coupling.json` test_points[1] + `3dgs-mpm-coupling.md` Anchor 2 | 3 independent anchors | 3 DISTINCT anchors, but Anchor 2 (polar decomp F=R·S) self-declares "independent of PhysGaussian's *implementation* but cites the same *theory* — PhysGaussian Eq.(9)… NOT a fully-independent reference. (Anchor 3 is.)" So strictly 2 fully-independent + 1 same-theory. | NONE required — the caveat is honestly disclosed IN the derivation; Anchor 3 (F=I) is fully independent and Anchor 1 (Eq.8) + Anchor 3 already give 2 independent. If §2.4 strict-3-independent is demanded, add a 3rd fully-independent anchor (e.g. a numerical eig-decomposition cross-run of a random SPD A). | **MINOR** NEW |
- **F-D1-08** | DOC | `docs/phases/phase-3-plan.md:294` vs `references/PhysicsNeMo-PINN/MANIFEST.toml:2-4` | §2.18 pins PhysicsNeMo `NVIDIA/physicsnemo` core `766e485a…` (v2.1.0) for task-7 | task-7 actually vendored `physicsnemo-**sym**` v2.4.0 `acaeb6dc38ecda58559b5286d3cb743e8cf930d3` — DIFFERENT repo AND different SHA. The §2.18 pin is the wrong repo (PINN tutorials live in physicsnemo-sym, not core). | already tracked as corrigendum A-6 (`docs/spec-amendments-proposed.md:170-213`); re-point §2.18 to physicsnemo-sym `acaeb6dc…` (or ratify the core pin as a separate dependency). Both SHAs/repos web-exist; Raissi 2019 basis resolves. | **MINOR (tracked)** NEW-since-prior-pin |

---

## Coverage summary

| set | denominator | checked | unresolved/wrong |
|-----|-------------|---------|------------------|
| (a) derivations | 15 | 15 | 0 |
| (a) tables | 19 | 19 | 0 missing; 2 MAJOR + 4 MINOR distinctness flags |
| (c) locked upstreams | 5 | 5 | 0 unresolvable (2 SHA-consistency defects, both tracked) |
| (d) NEW external cites | 9 | 9 | 0 cite-to-nonexistent-section/eq |
| (e) vendored file:line | 10 | 10 | 0 wrong lines |

## DEFERRED / UNKNOWN / BLOCKED
- NONE BLOCKED. Every denominator element executed and verdicted. All 5 §2.18 SHAs,
  all 9 NEW external cites (Raissi 2019, Evans §2.2, Strauss §6.2, PhysGaussian
  Eq.8/9, Kerbl 3DGS, Macklin XPBD 2016, Mordvintsev Distill, growing-neural-ca,
  physicsnemo-sym), and all 4 vendored MANIFEST SHAs web-resolved. No source
  unresolvable.
- Textbook section EXISTENCE (Evans §2.2, Strauss §6.2, Monaghan 2005 Eq.2.7) was
  confirmed by web search of the published table-of-contents/standard-results, not by
  reading the physical pages — content-correctness of the n=2 fundamental solution
  and the rectangle separation construction is mathematically self-evident and
  matches the cited claim.
