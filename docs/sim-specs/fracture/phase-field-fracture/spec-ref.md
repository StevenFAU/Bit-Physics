# phase-field-fracture — Reference Spec

> **Status:** Phase-6 candidate spec sheet — **research draft v0.2 (2026-07-08)**,
> deep-web-research pass (v0.1: 6 search angles, 27 sources fetched, 124 claims → 25
> adversarially verified, 24 confirmed / 1 refuted) + **first-principles verification
> review (v0.2: four parallel adversarial research passes — primary-source citation
> re-check, GPU/browser prior-art survey, showcase-preset literature sweep, and
> numerical-feasibility audit)**. NOT executed. Gate rows below are **declared
> targets** to be MEASURED at build per `docs/architecture.md` § 2.6 / Appendix D
> (measured-then-declared).
>
> **v0.2 review changes (what moved from v0.1):**
> 1. **Citation corrections from primary-source re-check** — the GPU finite-volume
>    route is **Yu, Zhao & Zhao 2025** (Computers and Geotechnics), not "Geng et al."
>    (§ 3.1); arXiv:2606.23458 (PhAST) is **unstructured P1-FEM with an implicit
>    bound-constrained PCG damage solve**, so our FD grid is a *departure inspired by*
>    it, not "the blueprint" (§ 2.1, § 3.1); the SENT reference value 0.7012 kN is the
>    **PhaseFieldX example-1711 reproduction**, not a digit printed in Miehe 2010
>    (§ 4); Borden 2012's branching benchmark ran the **monolithic generalized-α**
>    scheme — one-pass staggered was their Kalthoff-type run (§ 3.2); Borden's
>    measured tip speed is **≤ ~0.6 v_R**, stronger than "bounded by v_R" (§ 4 F);
>    Kristensen–Martínez-Pañeda numbers keep their "**up to**" qualifiers (20–40×
>    without adaptive stepping) (§ 3.4); the Ambati hybrid requires the crack-set
>    condition **∀x: ψ⁺ < ψ⁻ ⇒ d := 0** (§ 3.2); the history-field inconsistency
>    citation is pinned to **Gerasimov & De Lorenzis 2019, CMAME 354:990–1026** with
>    the exact quote (§ 3.3).
> 2. **Gradient-flow (Allen–Cahn / Karma-lineage) damage update promoted to the v1
>    baseline** (§ 3.5): fully local, no elliptic solve, one fused WGSL kernel —
>    PRL-2001 (Karma–Kessler–Levine) / Nature-2010 (Pons–Karma) / Miehe
>    viscous-regularization pedigree, plus the founding GPU-PFF paper (Ziaei-Rad &
>    Shen 2016) using exactly this structure. The staggered **elliptic solve is
>    demoted to the f64 reference + gate anchor**. The finite-mobility cost — a
>    rate-dependent effective toughness $\Gamma(v)=G_c+O(v/\chi)$ (Hakim–Karma) — is
>    **disclosed and measured**, and doubles as a PROVE lens (§ 5.4).
> 3. **Quasi-static protocol made quantitative** (new § 3.6): explicit-dynamic
>    quasi-statics is published practice (Sahin 2023; Hu–Zhuang–Rabczuk 2023) with an
>    operational criterion — **KE/IE ≤ 1–5%** and $v_{load}/c_d \lesssim 10^{-4}$,
>    smooth-step load ramps, low-passed reaction force. Cost estimate: **~10⁴–10⁵ CFL
>    steps at 256²** for a defensible SENT peak (seconds-to-a-minute of WebGPU wall
>    time). Honesty: the **post-peak snap-back branch is legitimately dynamic**
>    (~0.55 c_R crack burst) — G-SENT gates pre-peak shape + peak load only.
> 4. **f32 precision crux reframed as a units problem, not an intrinsic one** (§ 9):
>    the community-standard non-dimensionalization $\{\ell,\ G_c/\ell,\ \rho\}$
>    collapses the 6-decade spread to ≤ 4 decades (Bourdin-school scaling,
>    arXiv:2203.16467; explicit "improve numerical conditioning" precedent,
>    arXiv:2603.21811). **No validated f32 phase-field-fracture solver exists
>    anywhere** — the gated f32 kernel is itself a first, with PhAST's f64-only
>    statement as the published adversary it answers.
> 5. **FFT-PFF literature folded in** (§ 3.1, § 9): a real spectral fracture
>    literature exists (Chen–Gélébart 2019; Ernesti–Schneider–Böhlke 2020) but it is
>    periodic-BC, f64, implicit, and documents **convergence collapse at
>    zero-stiffness crack contrast** — the spectral damage option is demoted from
>    "spike candidate" to a cited curiosity; the FD decision is now literature-backed
>    from both sides.
> 6. **Moat re-scoped after the prior-art sweep** (§ 2.3, § 14): graphics already has
>    energy-variational fracture — **CD-MPM (Wolper et al., SIGGRAPH 2019) evolves
>    damage with a Ginzburg–Landau phase-field equation** — so the claim is never
>    "first energy-variational fracture"; it is the **in-browser + interactive +
>    verified conjunction**. kainino0x/webgpu-fracture-hack (live, geometric, zero
>    stress computation) is cited by name as the likeliest challenge. VisualPDE and
>    Ten Minute Physics confirmed to ship zero fracture content.
> 7. **Showcase-preset palette added** (new § 5.5): ranked, literature-anchored
>    interactive templates — draw-your-own obstacles, thermal-shock crack ladder
>    (Bourdin PRL 2014), en-passant crack pair, residual-stress "tempered glass"
>    fragmentation, spinning-ring fragmentation with the Grady $\dot\varepsilon^{-2/3}$
>    scaling, impact spiderweb, Yuse–Sano oscillating crack — plus **parameter-space
>    regime maps** where user runs drop dots onto published theory curves.
> 8. **RENDER upgraded for "many effects on screen" as a budget, not a vibe**
>    (§ 5.1): displacement-warped material with *real crack opening*, GPU
>    connected-component **fragment tinting** (simultaneously the juice and the
>    fragment-statistics observable), history-field crack-tip glow, ∇d refraction,
>    elastic-wave shimmer — one uber-composite pass per the heat-equation pattern.
> 9. **Acoustic-emission audio layer** (new § 5.6): per-frame fracture-energy
>    increments → crackle synthesis reusing the signal-workbench audio stack — the
>    portfolio's second audible sim, with avalanche (crackling-noise) statistics as a
>    PROVE histogram.
> 10. **Gates updated** (§ 6.1): G-SENT rescoped to pre-peak + peak; new **G-QS**
>     (KE/IE ceiling), **G-energy** (work = elastic + fracture + kinetic balance),
>     **G-Γv** (gradient-flow toughness vs converged-elliptic f64 reference); G-branch
>     pinned to tip speed ≤ 0.6 v_R.
> 11. **AT1 irreversibility sharpened** (§ 3.3): the lower bound must live **inside**
>     the iteration (projected sweep), not as a post-clamp — PhAST documents
>     unconstrained AT1 solves relaxing to a **fully healed d ≈ 0** after
>     post-clamping.
> 12. **Damage subcycling** (§ 11): crack fronts move at ≤ 0.6 v_R while dt is set by
>     the faster dilatational speed — the damage update can run every
>     $N_{sub}=\lfloor c_p/(0.6\,c_R)\rfloor \ge 3$ steps with H still updated every
>     step (PhAST measured 45% wall-clock saving; their damage solve was 59–71% of
>     per-step cost).
>
> **Category:** fracture / damage-mechanics — a NEW portfolio family (master catalog
> `docs/planning/bit-physics-master-catalog.md` § 11, "Fracture, Damage, and Failure
> Mechanics"). No spec `architecture.md` fracture section exists today; if banked it
> is co-authored at cluster landing per spec § G.12.
> **Primary surface:** web-deployable (Stack B / WebGPU + TypeScript, f32) driven by a
> verified **f64 reference** (JS or NumPy), matched-pair gated against published
> fracture benchmarks. Tier-0 per master catalog § 11.6 / § 4.2.
> **Strategic role:** the portfolio's first sim in which **material breaks** — cracks
> that *nucleate, propagate, curve, and branch as the emergent solution of an energy
> minimization*, not authored geometry. First **verified, interactive, in-browser**
> energy-variational fracture sim (§ 14 moat — scoped claim, see v0.2 item 6).
>
> **DECOUPLED FROM AMULET (deliberate, per owner steer 2026-07-08).** The recommended
> discretization is a **regular grid + finite differences**, NOT unstructured FEM, so
> this sim does **not** require the `common-fem` module that the AMULET waves track
> stands up. It ships standalone. (An FEM route exists and is the CPU state of the art
> — § 3.4 — but it is the wrong tool for real-time WebGPU.)
>
> **Three load-bearing honesty boundaries (repeated in web copy, § 1.1):**
> 1. The claim that phase-field fracture captures all crack topologies "with **no**
>    extra criterion" was **REFUTED 0-3** in the research pass (§ 2.2). The honest
>    framing is: *cracks emerge from energy minimization plus one evolution PDE,
>    without explicit crack tracking or remeshing* — not "with no criterion at all."
> 2. The cheap **hybrid formulation** (Ambati 2015) and the **history field** H are
>    **variationally inconsistent** (Gerasimov–De Lorenzis 2019). This is the standard
>    cheap method and it is what we ship, but the inconsistency is **disclosed, not
>    hidden** — rigor as a feature (§ 3.3, § 6.6).
> 3. The v1 baseline damage update is a **finite-mobility gradient flow** (§ 3.5): it
>    carries a **rate-dependent effective toughness** $\Gamma(v)=G_c+O(v/\chi)$
>    (Hakim–Karma 2009). Disclosed, measured against the converged-elliptic reference
>    (gate G-Γv), and surfaced as a live lens — not hidden.

---

## 1. Scope

This sim models **quasi-static and dynamic brittle fracture** of a 2D elastic solid on
a fixed regular grid, using the variational (phase-field) approach to fracture. A crack
is represented by a smooth scalar **damage field** `d ∈ [0,1]` (`d=0` intact, `d=1`
fully broken); the crack path is never tracked explicitly and the grid never remeshes.

The coupled governing system (small strain, isotropic base elasticity):

$$
\begin{aligned}
&\textbf{Momentum / elasticity:} &&\rho\,\ddot{u} = \nabla\cdot\big(g(d)\,\sigma_0^{+} + \sigma_0^{-}\big) + b
\quad\text{(dynamic)};\qquad \nabla\cdot\big(g(d)\,\sigma_0^{+} + \sigma_0^{-}\big)+b=0\ \text{(quasi-static)}\\[4pt]
&\textbf{Damage evolution (optimality form):} &&\frac{G_c}{c_w}\Big(\frac{w'(d)}{\ell} - 2\ell\,\nabla^2 d\Big) = -\,g'(d)\,\mathcal{H}
\\[4pt]
&\textbf{Damage evolution (gradient-flow form, v1 baseline — § 3.5):} &&\chi^{-1}\,\dot d = -\,g'(d)\,\mathcal{H} - \frac{G_c}{c_w}\Big(\frac{w'(d)}{\ell} - 2\ell\,\nabla^2 d\Big),\qquad \dot d \ge 0
\end{aligned}
$$

(the optimality form is the $\chi\to\infty$ steady state of the flow; the f64 reference
solves the optimality form, the browser kernel integrates the flow — § 3.5.)

with:

- **Degradation function** $g(d)=(1-d)^2$ — the intact stiffness is scaled by $g(d)$ as damage grows.
- **Crack geometric function** $w(d)$ and normalization $c_w$: **AT2** uses $w(d)=d^2$, $c_w=2$; **AT1** uses $w(d)=d$, $c_w=8/3$ (§ 8.1).
- **Tension/compression split** $\sigma_0 = \sigma_0^{+}+\sigma_0^{-}$: **only the tensile part is degraded** so cracks do not grow under compression (§ 8.2). The tensile stored energy density $\psi_0^{+}$ is the crack driving energy.
- **History field** $\mathcal{H}(x,t)=\max_{\tau\in[0,t]}\psi_0^{+}(\varepsilon(x,\tau))$ — a running maximum of tensile energy that enforces **irreversibility** ($d$ monotone; cracks do not heal) via a single per-cell `max()` (§ 3.3).
- **Regularization length** $\ell$: the diffuse-band width. In AT1/AT2 it is tied to material **strength** via $\sigma_c \propto 1/\sqrt{\ell}$ (§ 8.1) — a *material* parameter, not merely a mesh knob. As $\ell\to0$ the regularized crack-surface energy **Γ-converges** to the sharp-crack Griffith surface energy $G_c\cdot(\text{crack length})$ (verified; Miehe 2010, Ambrosio–Tortorelli 1990).

The total energy functional being minimized (Bourdin–Francfort–Marigo regularization of
Francfort–Marigo 1998):

$$
E(u,d)=\underbrace{\int_\Omega g(d)\,\psi_0^{+}(\varepsilon)+\psi_0^{-}(\varepsilon)\,dV}_{\text{stored elastic}}
\;+\;\underbrace{\frac{G_c}{c_w}\int_\Omega\Big(\frac{w(d)}{\ell}+\ell\,|\nabla d|^2\Big)dV}_{\text{regularized fracture surface}}
$$

### 1.1 Load-bearing honesty boundary (repeated in web copy)

v1 is a **verified brittle-fracture instrument**. It computes the crack path from energy
minimization and matches published force–displacement curves; it is not a
production structural-integrity tool. The three disclosures in the status block (refuted
"no-criterion" framing; variational inconsistency of hybrid/history; finite-mobility
rate-dependent toughness) appear verbatim in the EXPLAIN layer.

---

## 2. Independent-reference anchors, prior-art, and refuted claims

### 2.1 Independent-reference anchors (spec § 2.4 — ≥3 required)

1. **Miehe, Welschinger & Hofacker 2010**, *Thermodynamically consistent phase-field
   models of fracture*, IJNME 83:1273–1311 — <https://onlinelibrary.wiley.com/doi/abs/10.1002/nme.2861>.
   The thermodynamically consistent standard; diffusive crack field + Γ-converging
   crack-surface functional + tensile/compressive spectral split. *(Citation
   discipline: the SENT/SENS benchmarks also appear in the CMAME companion, Miehe,
   Hofacker & Welschinger 2010, CMAME 199:2765–2778 — the operator-split paper, which
   is ALSO the origin of the viscous-regularization idea § 3.5 builds on. PhaseFieldX
   cites the CMAME one; PhAST cites the IJNME one. We anchor benchmarks on the IJNME
   paper and viscous regularization on the CMAME paper, deliberately.)*
2. **Ambati, Gerasimov & De Lorenzis 2015**, *A review of phase-field models…*, Comput.
   Mech. 55 — <https://link.springer.com/article/10.1007/s00466-014-1109-y>. Review +
   the **hybrid** formulation that makes each staggered pass incrementally **linear**
   ("about one order of magnitude" cheaper — their words) — the load-bearing route for
   a WebGPU staggered pass structure. Requires the crack-set condition
   $\forall x:\ \psi^+ < \psi^- \Rightarrow d:=0$ (interpenetration prevention, § 3.2).
3. **Zhang, Jiang & Tonks 2022** (INL), *Assessment of four strain energy decomposition
   methods…*, J. Mater. Sci.: Mater. Theory 6 — <https://link.springer.com/article/10.1186/s41313-021-00037-1>.
   Benchmarks **four** energy splits — spectral-of-**strain**, spectral-of-**stress**,
   deviatoric-of-**strain**, deviatoric-of-**stress** — across SENT / SENS /
   three-point-bending / L-panel + dynamic tension/shear — the calculation-validation
   battery. Verdict: all fine in tension; the two spectral methods best in
   compression/mixed-mode, **stress-spectral best overall**.
4. **arXiv:2606.23458 (2026)**, *A matrix-free, differentiable PyTorch solver for
   phase-field fracture* (Ani, Molinari, Subhash & Ponnusami; code
   github.com/CEMS-Lab/PhAST) — <https://arxiv.org/abs/2606.23458>. The freshest GPU
   precedent — **explicit dynamics for mechanics + implicit bound-constrained PCG for
   damage, matrix-free, on unstructured P1-FEM meshes** (~10⁶ nodes on one A100;
   branching run ≈ 11.7 ms/step) — plus the SENT/Kalthoff benchmark numbers and **the
   f32 precision statement** (§ 9). *(v0.2 correction: our regular-grid FD scheme is a
   deliberate departure from PhAST's FEM discretization, in its dynamic lineage — not
   "the blueprint".)*

### 2.2 Refuted claim (do NOT ship this framing)

- **REFUTED 0-3:** *"Phase-field obtains initiation, propagation, coalescence and
  branching with **no extra fracture criterion needed**."* Overclaim — the driving
  force, irreversibility, and split are all modeling choices, and hybrid/history are
  variationally inconsistent. Ship: *"cracks emerge from energy minimization + one
  evolution PDE, without explicit crack tracking or remeshing."*

### 2.3 Prior-art neighbors (verified sweep 2026-07-08; see § 14 for the moat)

- **Graphics-community phase-field fracture (offline, desktop):**
  **CD-MPM** (Wolper, Fang, Li, Lu, Gao & Jiang, SIGGRAPH/TOG 2019 —
  <https://dl.acm.org/doi/10.1145/3306346.3322949>) — its PFF-MPM branch **evolves
  damage with a Ginzburg–Landau phase-field equation** coupled to MPM. 7.8–11M+
  particle showcase scenes, offline, no browser, no verification gates. **AnisoMPM**
  (Wolper 2020) and Zhao et al. 2020 (CGF, GPU plastic phase-field MPM, "interactive
  graphics" aspiration, no shipped demo) are the siblings. **These predate us on
  "energy-variational fracture in graphics" — the moat is the browser + interactive +
  verified conjunction, never the formulation (§ 14).**
- **Browser fracture demos (all geometric):** kainino0x/cis565final (2014, WebCL) and
  its live 2023 port **kainino0x/webgpu-fracture-hack**
  (<https://github.com/kainino0x/webgpu-fracture-hack>) — pre-generated fracture
  pattern clipped against the mesh at impact, authors confirm **purely geometric, no
  stresses**. three.js Voronoi shatter libs (dgreenheck/three-pinata et al.) likewise.
  Lineage: Müller–Chentanez–Kim 2013 pattern fracture.
- **Educational web PDE tools:** VisualPDE — sitemap confirmed to contain **zero**
  fracture/damage/elasticity content; Ten Minute Physics — 25 browser demos, zero
  fracture. Energy2D — no fracture model. None gates against fracture benchmarks.
- **Research GPU codes (offline):** Ziaei-Rad & Shen 2016 (founding GPU-PFF paper,
  ~12× at 2.5M DOF); Yu, Zhao & Zhao 2025 (first full-process GPU finite-volume PFF,
  up to 12×); Taichi explicit PF-MPM (Zheng et al. 2023). No interactive artifact
  shipped by any of them.
- **VFX "fracture"** (Houdini, NVIDIA Blast) — Voronoi/rigid-body shattering; crack
  path is *authored*, not computed (§ 14).

---

## 3. Solver strategy (the crux) — regular grid, explicit-dynamic, local damage flow, matrix-free

### 3.1 Discretization decision

| Route | GPU-parallel | Geometry / BC | Verdict |
|---|---|---|---|
| **Regular-grid finite difference + explicit dynamics** | Excellent — 1:1 with compute passes, no global solve | Arbitrary rectangular domains, non-periodic notch BCs | **RECOMMENDED v1** |
| FFT / spectral (reuse the repo Stockham WGSL FFT) | Excellent | Periodic BC only; **documented convergence collapse at zero-stiffness crack contrast** (Chen–Gélébart 2019; Ernesti 2020; Schneider 2025 penalizes initial-flaw phase to survive it); community is f64 + implicit | **DEMOTED (v0.2)** — cited curiosity, not a spike candidate |
| Unstructured FEM (BFGS monolithic) | Poor — global sparse indefinite solve | Any | State of the art on CPU (§ 3.4); wrong tool for browser |
| MPM-based PFF (reuse `packages/mpm-multimaterial`) | Good | Particle bookkeeping overhead | Alternate; note only (CD-MPM is the offline precedent, § 2.3) |
| Finite volume on grid | Good | Published GPU route (**Yu, Zhao & Zhao 2025**, Computers and Geotechnics — <https://www.sciencedirect.com/science/article/abs/pii/S0266352X25004306>) | Viable alternate to FD |

**Rationale for FD explicit-dynamic:** most GPU-parallel; handles the *non-periodic*
notched specimens the benchmarks require (SENT/SENS are not periodic); no global linear
solve; and a single dynamic solver delivers **both** quasi-static behavior (via slow
loading with KE/IE discipline, § 3.6) **and** the visually stunning dynamic branching /
Kalthoff regime. Dynamic lineage: Borden 2012 → Ziaei-Rad & Shen 2016 (GPU) →
arXiv:2606.23458 (matrix-free), with the v0.2 caveat that PhAST itself is FEM + implicit
damage; the fully-local FD + gradient-flow combination below is *our* synthesis, and the
spike (§ 13) is where it gets proven.

### 3.2 Per-frame pass structure (WGSL compute dispatches)

1. **Momentum update** — explicit **velocity-Verlet** with **lumped mass** (diagonal
   inverse) → *no linear solve* for elasticity. Hybrid formulation: isotropic (linear)
   stress in the momentum solve; the tension/compression split enters **only the damage
   driving force**, making the pass incrementally linear (Ambati 2015, "about one order
   of magnitude" cheaper). **Crack-set condition** enforced per cell:
   $\psi^+ < \psi^- \Rightarrow d:=0$ contribution suppressed (their interpenetration
   guard — v0.2 corrected direction: it forces $d$ *to zero*, never to one).
2. **Strain / tensile energy** — compute $\varepsilon$, split into $\psi_0^{\pm}$, update
   history `H = max(H, ψ₀⁺)` (one pass; § 3.3).
3. **Damage update** — v1 baseline: one fused **local gradient-flow step** (§ 3.5), no
   elliptic solve. Gate-reference alternative: warm-started projected red-black
   Gauss–Seidel sweeps on the optimality form (§ 3.5).
4. **CFL substep loop.** For explicit dynamics with a CFL-limited time step, **a single
   damage update per step is sufficient** — Borden 2012 § 3.3.2, verbatim: "*for the
   results presented later we use only one pass of the corrector stage*" (their
   staggered runs, e.g. the Kalthoff-type impact at $v_0=16.5$ m/s). *(v0.2 caveat: the
   branching benchmark itself was run with their monolithic generalized-α scheme — do
   not cite the branching numbers as one-pass-staggered evidence.)* The per-step load
   increment at CFL dt is ~10⁻⁵ of an implicit load increment and the tip moves ≪ 1
   cell per step, so single-pass lag is bounded by construction; the energy-balance
   monitor (§ 5.4, G-energy) is what would catch accumulated under-dissipation.

The joint energy is non-convex in $(u,d)$ but **convex in each field separately**, which
is exactly why alternating minimization (staggered) is robust and maps to sequential
passes.

### 3.3 Irreversibility via the history field (cheapest GPU enforcement)

$$\mathcal{H}(x,t)=\max_{\tau\in[0,t]}\psi_0^{+}(\varepsilon(x,\tau))$$

A single per-cell running maximum guarantees $d$ monotone (no healing) with no explicit
inequality constraint. **Disclosure (pinned v0.2):** Gerasimov & De Lorenzis 2019, CMAME
354:990–1026 (<https://arxiv.org/abs/1811.05334>) — the history substitution "*is,
however, no longer of variational nature and its equivalence to the original problem
cannot be proven*"; their conclusions: it "*is able to enforce irreversibility, however
it leads to the solution of a problem that is not equivalent to the original one*."
Surfaced in the EXPLAIN layer, not hidden.

**AT1 needs its lower bound INSIDE the iteration, not as a post-clamp (v0.2 sharpened).**
AT1's constant driving term ($w'(d)=1$) makes the RHS negative wherever $2\mathcal{H} <
3G_c/(8\ell)$; PhAST § 2.4 documents that an unconstrained AT1 solve "*produces large
negative values of d in regions far from the crack*" which "*propagate to the crack tip
through the Laplacian operator, often resulting in a fully healed solution (d ≈ 0) after
post-clamping*." Gerasimov–De Lorenzis Remark 4 states the same from theory (AT2's
minimizer is automatically in [0,1]; AT1's is not). Route: **projected sweep** — clamp
$d \ge \max(d_{prev}, 0)$ *within* each Jacobi/GS sweep (projected Jacobi) or each
gradient-flow step; conveniently, the gradient-flow update (§ 3.5) with a per-step
$\max()$ *is* exactly this projection.

### 3.4 Why NOT monolithic FEM (documented, so the choice is auditable)

Kristensen & Martínez-Pañeda 2020 (<https://arxiv.org/abs/1912.08620>) show a
quasi-Newton **BFGS monolithic** solver is **up to ~100× faster** wall-clock than
staggered (their words: "roughly 100 times faster" on SENT; **20–40× without adaptive
stepping**) and needs **up to ~3000× fewer** load increments (10⁵ staggered increments
vs 30 monolithic), converging under both stable and unstable cracking — the CPU/FEM
state of the art. But it needs a **global sparse indefinite linear solve**, which does
not parallelize onto GPU/browser. We port only their **one-shot adaptive step** idea
(small load steps triggered once during unstable growth) for quasi-static nucleation
fidelity (§ 3.6).

### 3.5 Damage update: gradient flow as v1 baseline, elliptic solve as gate reference (NEW v0.2)

**The real-time unlock.** Instead of solving the elliptic optimality condition each
step, evolve the damage field by its **energy gradient flow** (Allen–Cahn /
Ginzburg–Landau relaxation):

$$\chi^{-1}\,\dot d = 2(1-d)\mathcal{H} - \frac{G_c}{c_w}\Big(\frac{w'(d)}{\ell} - 2\ell\,\nabla^2 d\Big),\qquad d \leftarrow \max(d,\ d_{prev})$$

- **Fully local** — one fused WGSL kernel, no iteration, no linear solve,
  unconditionally GPU-parallel. This is exactly the structure of the founding GPU-PFF
  paper (Ziaei-Rad & Shen 2016: "*the phase field is updated according to a
  rate-dependent formulation, which fits nicely with GPU architecture*").
- **Pedigree, not a hack:** Karma–Kessler–Levine PRL 87:045501 (2001) *is* this model;
  Pons & Karma, Nature 464:85–89 (2010) (helical crack fronts) is its flagship result;
  Hakim & Karma JMPS 57:342 (2009) Eq. 11 gives the exact form
  ($\chi^{-1}\partial_t\phi = -\delta E/\delta\phi$, "gradient dynamics, which
  guarantees that the total energy… decreases"). Within the AT framework the same term
  is **Miehe's viscous regularization** (CMAME 2010 companion paper, $\eta\,\dot d$
  over-force, "the rate-independent limit recovered by simply setting the viscosity to
  zero"); dynamic PFF codes carry it routinely.
- **The disclosed physics cost (honesty boundary #3):** finite mobility ⇒
  velocity-dependent effective toughness. Hakim–Karma's tip force balance gives
  $\Gamma(v) = G_c + O(v/\chi)$, vanishing as $v\to0$ or $\chi\to\infty$; the
  documented side effect in AT-viscous codes is "an increased energy release rate
  during crack propagation." **Mitigation + gate:** pick $\chi$ large enough that the
  damage relaxation time is a small multiple of dt_CFL; measure the peak-load / crack
  path against the **converged-elliptic f64 reference** (gate G-Γv, § 6.1). **Lens:**
  a live "effective toughness vs crack speed" readout turns the disclosure into a
  teaching feature (§ 5.4).
- **Stability:** explicit Euler on the flow adds a local bound
  $\Delta t_d \lesssim 2/\big(\chi\,(8G_c\ell/h^2 + G_c w''/(c_w\ell) + 2\mathcal{H})\big)$
  — choose $\chi$ so this never binds below the elastic CFL (declared target, measured
  at the spike).
- **Irreversibility for free:** the per-step $\max(d, d_{prev})$ *is* the projected
  update § 3.3 requires (Hakim–Karma tested irreversibility-modified dynamics and found
  tip laws unchanged — the citable cover for clamping).

**The elliptic route is not deleted — it is the reference.** The f64 JS/NumPy reference
solves the optimality form to convergence (CG or many-sweep GS); the browser can also
run **warm-started projected red-black GS sweeps** (5–20/step is the declared-to-measure
band) as a cross-check mode. Cold-start caveat (measured honestly): with $\ell = 2$–$4h$
the reaction term is only ~1/16–1/64 of the diffusive diagonal, so *cold* Jacobi needs
~40–150 sweeps/digit; what makes a handful sufficient is warm starting (per-CFL-step
changes are O(10⁻⁵)), the $e^{-r/\ell_{scr}}$ locality of the screened operator
($\ell_{scr} \le \ell$, shrinking where H is large), and needing 2–3 digits, not 8.

### 3.6 Quasi-static protocol — KE/IE discipline (NEW v0.2)

Explicit-dynamic quasi-statics is established practice with quantitative guardrails:

- **Criterion:** dynamic effects are negligible when **kinetic energy ≤ 1–5% of
  internal energy** throughout the loading (Hu, Zhuang, Rabczuk et al. 2023, TAFM —
  their 5%; DYMAT explicit-QS practice — 1%), with **mass scaling and loading-rate
  scaling being the same dimensionless knob** (Hu et al.: "higher loading speeds
  equivalent to scaled mass/viscosity"). Direct PFF precedent: Sahin, Ren, Imrak &
  Rabczuk 2023 (Engineering with Computers) — explicit phase-field + local damping +
  examined mass scaling, validated on L-panel / three-point-bend / holed plate.
- **Numbers (SENT at 256², Miehe steel):** $dx \approx 3.9\,µm$, $c_d \approx 6$ km/s
  ⇒ $dt_{CFL} \approx 0.65$ ns. KE/IE ≤ 5% at peak ($\sigma \approx 700$ MPa ⇒ IE
  density ≈ 1.2 MJ/m³) bounds $v_{load} \lesssim 1$ m/s ($\approx 10^{-4}c_d$);
  loading 6.3 µm then takes ~6.3 µs ⇒ **~10⁴–2×10⁴ CFL steps** (a 10× slower "gold"
  run ~10⁵). At realistic WebGPU throughput (10³–10⁴ fused steps/s at 256²) that is
  **seconds to ~1 minute of wall time** — run as O(10–100) substeps per rendered
  frame, with the specimen visibly loading. 512² costs 8×.
- **Protocol details (all from published practice):** smooth-step ramps
  $S(t)=\tfrac12(1-\cos(\pi t/t_r))$ on every load application (PhAST uses these
  everywhere); reaction force low-pass filtered before the F–δ plot; **live KE/IE
  gauge** rendered in the UI — the quasi-static claim is *shown*, not asserted (and
  gated, G-QS).
- **Honesty (rescopes G-SENT):** SENT at peak is *unstable* — the real crack burst runs
  at ~0.5–0.6 $c_R$ (Borden 2012 and PhAST both measure ≈ 0.56 $c_R$), so the
  **post-peak snap-back branch is legitimately dynamic and will NOT trace the
  quasi-static backbone**. The gate is pre-peak curve shape + peak load; the post-peak
  burst is displayed as the physically dynamic event it is (with the KE/IE gauge
  spiking to prove it).
- **Adaptive step:** the Kristensen one-shot small-increment idea (§ 3.4) ports as a
  loading-rate slowdown triggered when $\max_x \dot d$ crosses a threshold.

---

## 4. Analytic & reference goldens (calculation-validation anchors)

Phase-field fracture has weak *analytic* anchors (like most fracture); verification is
primarily **calculation validation against published benchmark curves** (spec § 6.4).

| # | Benchmark | Expected result (published) | Role |
|---|---|---|---|
| A | **SENT** (single-edge-notch tension) | Peak reaction ≈ **0.70 kN** (PhaseFieldX example-1711 reproduction: 0.7012; PhAST hit 0.6936, 1.08% err — *the 0.7012 is a reproduction value, not a Miehe-2010 digit*); pre-peak monotone; brittle drop | Primary quasi-static gate — pre-peak F–δ + peak (§ 3.6 honesty) |
| B | **SENS** (single-edge-notch shear) | Curved crack to lower-right corner; published F–δ curve | Mixed-mode + split correctness |
| C | **Three-point bending** (notched beam) | Vertical crack from notch; published F–δ | Bending / mode-I |
| D | **L-shaped panel** | Crack from re-entrant corner, characteristic curve | Corner nucleation |
| E | **Kalthoff–Winkler** (dynamic impact, $v_0=16.5$ m/s) | Crack kink ≈ **70°** experimental (accept band 65–75°; PhAST got 67–73°, finest mesh 68–70°); initiation ≈ 24–25 µs | Primary dynamic gate |
| F | **Dynamic crack branching** (Borden 2012: 100×40 mm pre-notched plate, σ=1 MPa held) | Symmetric branch under high strain rate; **tip speed ≤ ~0.6 v_R** (Borden: "well below 60% of the Rayleigh wave speed", $v_R = 2125$ m/s for their glass; Ravi-Chandar–Knauss experiments agree) | Dynamic-branching visual + physics |
| G | **Γ-convergence / length-scale** | Crack-surface energy → $G_c\cdot L$ as $\ell\to0$; $\sigma_c\propto1/\sqrt{\ell}$ (AT1/AT2) | Theory-made-visible; internal convergence gate |
| H | **Thermal-shock** (quenched ceramic — § 5.5 preset 2) | Selected parallel-crack **spacing** vs quench $\Delta T$; hierarchical arrest (Bourdin et al. PRL 112:014301; Shao et al. experiments) | Stretch benchmark |
| I | **En-passant crack pair** (§ 5.5 preset 3) | Repel-then-hook trajectory, lenticular fragment (PF study: Schwaab/Spatschek lineage; theory+exp: Ghelichi & Kamrin 2015) | Morphological preset gate (stretch) |
| J | **Ring fragmentation** (§ 5.5 preset 5) | Fragment count trend vs strain rate against Grady $s \propto \dot\varepsilon^{-2/3}$ | Statistical trend gate (stretch) |

**Reference material params** (Borden glass, for benchmark reproduction): $E=32{,}000$
MPa, $\nu=0.2$, $\rho=2450$ kg/m³, $G_c=3$ J/m², $\ell=2.5\times10^{-4}$ m ⇒
$G_c\cdot\ell = 7.5\times10^{-4}$ N — see § 9 for why these SI numbers force f64 in a
naive solver. (Miehe SENT steel: $\lambda=121.15$, $\mu=80.77$ kN/mm² ⇒ $E=210$ GPa,
$\nu=0.3$; $G_c=2.7\times10^{-3}$ kN/mm.)

---

## 5. Web surface — visualization & interaction

House four-layer structure (INTERACT / EXPLAIN / PROVE / RENDER), matching the landed
rd2d / heat-equation / schrodinger demos.

### 5.1 RENDER — legible in < 5 s, many effects in ONE budget (v0.2 expanded)

All layers composite in **one uber-pass** reading each field once (heat-equation's
budget pattern), uniform-branch toggles, half-res mip bloom:

- **Displacement-warped material with real crack opening** — the killer feature the
  solver gives for free: render the material advected by $u$ (texture lookup at
  $x - u_{amp}$), so cracks visibly **open** — dark gaps appear where $d\approx1$ and
  the faces separate. Research figures only plot $d$; showing warped material + real
  opening is game-quality and 100% physical.
- **Fragment tinting via GPU connected components** — iterative label-propagation
  passes on the intact mask ($d <$ threshold), a few dispatches/frame, ungated visual:
  each fragment gets a stable tint the moment it separates, plus a **fragment
  count/area histogram** that is simultaneously the juice and the § 5.5 fragmentation
  observable.
- **Crack-tip glow driven by the physics** — color intensity from $\mathcal{H}$
  increments / energy-release density: **active tips glow hot and fade after arrest**.
  Physically meaningful, reads as premium VFX.
- **∇d refraction** — use the damage gradient as a pseudo-normal to refract/darken a
  backdrop through open cracks (the game-shader trick, driven by the real field).
- **Stress colormap** underneath (von Mises or max-principal), perceptually-uniform.
- **Elastic-wave shimmer** (dynamic mode) — faint $|v|$ or $\mathrm{tr}(\dot\sigma)$
  layer: impact rings and unloading waves *racing the cracks* — the part no pre-baked
  game effect can fake.
- **Live KE/IE gauge** (§ 3.6) — small HUD dial; quasi-static presets show it pinned
  near zero, dynamic presets slam it.

### 5.2 INTERACT

- Choose specimen (SENT / SENS / notched beam / L-panel / free plate / ring / § 5.5
  presets) and **place the notch** by clicking.
- **Draw-your-own obstacles brush** (§ 5.5 preset 1): paint **holes / stiff / soft /
  tough** regions (spatial $E(x)$, $G_c(x)$ fields — zero solver cost), then load and
  watch the crack deflect, arrest at a hole (pause → pop re-nucleation on the far
  side), or hug a soft inclusion.
- **Load it:** drag to pull / shear / bend; **click-to-strike** for dynamic impact.
- Live sliders: **$\ell$**, **$G_c$** (toughness), **$E$**, **$\nu$**, **loading rate**
  (with the KE/IE gauge showing what the rate does), mobility $\chi$ (expert drawer).
- **Material presets:** glass, ceramic, concrete, acrylic, rock (map to $E,\nu,G_c$).

### 5.3 EXPLAIN

- AT1 vs AT2, the energy split, the history field, and all three honesty disclosures
  (§ 1.1) verbatim.
- **Γ-convergence set piece** (golden G): sweep $\ell$, watch the crack band narrow and
  the failure strength change as $\sigma_c\propto1/\sqrt{\ell}$.
- **"Why the snap-back is dynamic"** panel (§ 3.6): the KE/IE gauge spike at peak is
  the honest story of why the post-peak branch differs from the implicit backbone.

### 5.4 PROVE

- **Live matched-pair panel:** the f32 GPU run vs the f64 reference on the current
  scenario; force–displacement curve overlaid on the published benchmark curve;
  peak-load %-error and (dynamic) Kalthoff kink-angle read out live.
- **Live energy plot:** elastic stored vs fracture-surface vs kinetic energy vs work
  done — the energy balance the whole method rests on (and gate G-energy's data).
- **Γ(v) lens** (v0.2, honesty boundary #3): measured effective toughness vs crack
  speed for the gradient-flow kernel, against the converged-elliptic reference — the
  disclosure turned into an instrument.
- **Regime maps** (§ 5.5): user runs drop as dots onto published theory curves
  (fragment count vs $\dot\varepsilon$ with the Grady line; thermal-shock spacing vs
  $\Delta T$; en-passant offset×overlap morphology map).
- **Comparison mode:** AT1|AT2 or split-A|split-B running side-by-side on identical
  loading.

### 5.5 Showcase presets (NEW v0.2 — ranked, literature-anchored templates)

Verified against published phase-field literature 2026-07-08; ranked by
visual-payoff × verifiability × implementation cost:

1. **Draw-your-own obstacles + perforation** *(v1 core — cheapest, most interactive).*
   Inclusions/holes are just painted $E(x), G_c(x)$ fields; crack deflection by
   stiff/soft inclusions and arrest-then-re-nucleation at holes are standard dynamic
   PFF benchmarks (Int. J. Solids Struct. 2025 stiff-vs-compliant study;
   arXiv:2402.04261 pinning). **Perforation preset:** a dotted line of holes — tear
   along the dotted line, and watch the tear *escape* the line when the pitch is too
   coarse (the real-world stamp failure); anchored to crack–hole interaction
   literature (Mang et al. arXiv:2104.14826), honestly labeled "mechanism-verified,
   stamp-geometry-unpublished."
2. **Thermal-shock crack ladder** *(v1.x — the strongest "this is real science"
   story).* Quenched-ceramic parallel crack array with hierarchical arrest — every
   other crack stalls, survivors double their spacing. Bourdin, Marigo, Maurini &
   Sicsic, PRL 112:014301 (2014) + Shao et al. quench experiments (spacing decreases
   with $\Delta T$, size-independent). **No thermal solver needed:** the quench is the
   analytic profile $T(y,t)=\Delta T\,\mathrm{erfc}(y/\sqrt{4\kappa t})$ → eigenstrain
   $\varepsilon^*=\alpha T I$ (couples conceptually to `packages/heat-equation`'s erfc
   golden — cross-sim EXPLAIN link). Observable: spacing-vs-$\Delta T$ trend (golden H).
3. **En-passant crack pair** *(v1 core — cheapest preset of all).* Two offset notches
   under tension: initial slight repulsion, then mutual attraction — the cracks hook
   into each other's wakes and release a **lenticular fragment**. PF study confirmed
   (Schwaab/Pilipenko/Spatschek lineage); theory+experiment: Ghelichi & Kamrin, Soft
   Matter 2015 (arXiv:1409.0601). Ubiquitous in nature (mud, sea ice, rifts) — a
   strong "you've seen this" moment. Geometry morphology map: offset × overlap →
   hook / bypass / merge.
4. **Residual-stress fragmentation ("tempered glass" / 2D Prince-Rupert tail)**
   *(v1.x — highest wow-per-click).* Prescribe a self-equilibrated eigenstress
   (compressive rim, tensile core, $\int\sigma_0=0$). **Scratch the compressive rim →
   nothing. Nick through to the tensile core → a fragmentation wave detonates the
   whole domain.** Anchors: tempered-glass experiments — fragment density ∝ stored
   strain-energy density (Pourmoghaddam & Schneider 2018, Glass Struct. Eng.);
   residual-stress fragmentation scaling (arXiv:2602.20443). **Honest flags:** no
   direct PF-Prince-Rupert precedent found (ship as "trend-verified"); PF over-widens
   damage bands at high fragment density — adopt the Durussel–Molnár–Molinari
   mitigation (arXiv:2512.18022).
5. **Spinning-ring / expanding-ring fragmentation** *(v1.x — the quantitative one).*
   Annulus mask + initial radial velocity $v=\dot\varepsilon r$; simultaneous
   nucleation of N necking cracks, N grows with spin rate. **Observable: fragment
   count vs $\dot\varepsilon$ against the Grady $s\propto\dot\varepsilon^{-2/3}$ line**
   (+ Glenn–Chudnovsky crossover) — the single most quantitative "the physics is real"
   demo available (golden J), feeding the fragment histogram from § 5.1.
6. **Impact spiderweb** *(v1.x poster child).* Point impulse on a plate → radial star
   cracks, circumferential linking at higher energy; branch count grows with impact
   energy. Anchored to dynamic-PFF glass-impact literature (Challenging Glass proc.;
   laminated-glass explicit-dynamic PFF 2022). **Honest caveat:** the true windshield
   pattern is a *bending* problem — ship as the 2D in-plane analog, labeled as such.
7. **Yuse–Sano oscillating crack** *(stretch — nearly free once preset 2 ships).* A
   strip pulled through a hot→cold gradient: straight crack below threshold, perfect
   sinusoid above it, chaotic/branched beyond — a textbook supercritical instability
   with measurable threshold + wavelength. PF-verified: Corson et al., IJF 2009.
   Implementation = preset 2's machinery with a *moving* temperature profile.

Deferred-with-cause: strong-anisotropy zigzag cracks (needs a 4th-order damage stencil
— § 8.5), desiccation/craquelure networks (one shared "shrinking film on Winkler
foundation" engine with mud/paint skins — § 8.10).

### 5.6 Acoustic emission — the second audible sim (NEW v0.2)

Fracture *crackles* — and the repo just shipped the audio stack
(`packages/signal-workbench/web/src/audio.ts`). The per-frame **fracture-energy
increment** $\Delta E_{frac}$ (already computed for the § 5.4 energy plot) drives grain
/ crackle synthesis: silent elastic loading, ticking micro-crack nucleation, roaring
bursts at unstable propagation. Physics tie-in: acoustic emission and **crackling
noise** — intermittent avalanche statistics (Sethna, Dahmen & Myers, Nature 410:242,
2001) — with the avalanche-size histogram surfaced in PROVE. Honesty: avalanche
*exponents* in 2D quasi-static PFF are model-dependent — the histogram ships as a
qualitative lens, not a gate; only the underlying energy trace (deterministic,
run-twice byte-identical) is gated. Same f32-trig-synthesis trap as signal-workbench:
audio synthesis stays in JS-f64.

---

## 6. Verification gates

### 6.1 Gate philosophy — a NEW tolerance category

A browser-native **f32** solver **cannot** match the f64 reference to machine precision
(§ 9). Gate instead on physically meaningful, f32-achievable criteria (new tolerance
category, same route as the repo's other new-category gates — cf. pic-flip
`picflip-observable`):

| Gate | Criterion | Declared target (MEASURE at build) |
|---|---|---|
| G-SENT | **Pre-peak** F–δ curve shape + peak-load band (§ 3.6: post-peak is legitimately dynamic) | peak within **±10%** of 0.70 kN; monotone pre-peak; brittle drop present |
| G-KW | Kalthoff crack **kink angle** band | **65°–75°** |
| G-branch | Dynamic branching: symmetric branch + **tip speed ≤ 0.6 v_R** (Borden's measured bound, v0.2) | band declared at build |
| G-split | No damage growth under pure compression (split correctness) | $d$ stays < ε in a compressed block |
| G-irrev | Damage monotone (no healing on unload) | $\dot d \ge -\varepsilon$ everywhere |
| G-QS | **KE/IE ceiling** during gated quasi-static capture (§ 3.6) | ≤ **5%** (declared; 1% gold target) |
| G-energy | **Energy balance:** $|W_{ext} - (E_{el}+E_{frac}+E_{kin})| / W_{ext}$ | band declared at build |
| G-Γv | **Gradient-flow honesty:** peak load + crack path vs converged-elliptic f64 reference at gated $\chi$ (§ 3.5) | band declared after the § 13 spike |
| G-gamma | Γ-convergence trend: crack energy → $G_c L$ as $\ell\downarrow$ | monotone approach within grid resolution |
| G-matched | f32 GPU vs f64 reference, pointwise on a fixed short scenario | **declared after the § 9 spike** |
| G-runtwice | Byte-identical re-run (determinism, spec Gate) | 0 ULP diff |

### 6.2 The `new_canonical` deploy gate

Follows the landed pattern (heat-equation / signal-workbench): capture uniforms pack
from committed IC params (never live UI state); snapshot IC **before** the mutating step
loop; run-twice byte-identity; live f64 reference re-run on the gated scenario.

### 6.6 Rigor disclosure gate

An audit check that the three § 1.1 disclosures (refuted "no-criterion" framing;
hybrid/history variational inconsistency; gradient-flow rate-dependent toughness) are
present in the shipped EXPLAIN copy. The honesty is contractual, not optional.

---

## 7. Golden tables (offline-generated, committed)

- **§ 7.A–F** — digitized published force–displacement curves (SENT, SENS, 3-pt-bend,
  L-panel) + Kalthoff kink-angle / initiation-time table + Borden branching profile,
  each with source citation and digitization-error caveat. **Provenance discipline
  (v0.2):** the SENT 0.7012 kN target is recorded as "PhaseFieldX example-1711
  reproduction of Miehe 2010," not as a Miehe digit.
- **§ 7.G** — AT1/AT2 closed-form constants: $\sigma_c=\sqrt{3G_cE/8\ell}$,
  $\mathcal{H}_{\text{crit}}=3G_c/(16\ell)$ (AT1); $c_w$, $w(d)$ for both models.
  (AT2's own homogeneous peak, if ever needed: $\sigma_c=\sqrt{27EG_c/(256\ell)}$.)
- **§ 7.H** — f64 reference short-scenario capture (the matched-pair anchor) — committed
  PLAIN, not LFS (per repo trap).
- **§ 7.I (stretch, preset anchors)** — thermal-shock spacing-vs-$\Delta T$ table
  (Bourdin/Shao), Grady $\dot\varepsilon^{-2/3}$ reference curve, en-passant
  offset×overlap morphology table — one committed table per shipped regime map (§ 5.4).

---

## 8. Model palette / full feature envelope

Everything the phase-field-fracture family can do, with Tier-0 feasibility. See § 10 for
the shipping order.

### 8.1 AT1 vs AT2 (v1 core — comparison toggle)

- **AT2** (Bourdin 2000): $w(d)=d^2$; **no elastic threshold** — damage begins under any
  load. Canonical, most-used baseline. History field + post-clamp suffices (§ 3.3).
- **AT1** (Pham 2011): $w(d)=d$; **finite elastic limit** $\mathcal{H}_{\text{crit}}=3G_c/(16\ell)$,
  strength $\sigma_c=\sqrt{3G_cE/(8\ell)}$ — nothing damages until stress reaches $\sigma_c$.
  Makes $\ell$'s tie to material strength pedagogically explicit. **Requires in-iteration
  projection** (§ 3.3, v0.2).

### 8.2 Tension/compression energy split (v1 core)

Only tensile energy is degraded so cracks don't grow in compression. Verified ranking
(Zhang–Jiang–Tonks 2022, four splits: strain-spectral, **stress-spectral**,
strain-deviatoric, stress-deviatoric): all fine in tension; the two spectral splits best
in compression/mixed-mode, **stress-spectral best overall**.

- **Miehe strain-spectral / eigen split** — DEFAULT (compression-safe, matches the
  benchmark literature's dominant choice).
- **Stress-spectral** — Zhang's best-overall; ship as a comparison option with the
  ranking cited.
- **Amor volumetric–deviatoric** — cheaper; comparison option.
- No-tension, star-convex — additional comparison entries (PhAST ships star-convex).

### 8.3 Quasi-static vs dynamic (v1 core + v1.x)

- Quasi-static via slow loading under KE/IE discipline (§ 3.6) (v1).
- **Dynamic fracture** (v1.x): crack-tip velocity ≤ ~0.6 Rayleigh speed (§ 4 F);
  branching under high strain rate; Kalthoff–Winkler (Borden 2012). The visual payoff.

### 8.4 PF-CZM — length-scale-insensitive cohesive model (headline STRETCH)

Wu 2017 / Wu–Nguyen 2018 (<https://www.sciencedirect.com/science/article/abs/pii/S0022509618302643>),
Wu 2024 unified (<https://arxiv.org/html/2412.03836>). With a linear softening law, both
failure strength and the traction–separation law are **independent of $\ell$** ($\ell$
becomes a pure numerical parameter); Γ-converges to Barenblatt CZM as $\ell\to0$, versus
AT1/AT2 → Griffith LEFM. **Moat feature:** visualize "$\ell$ is just numerical" directly
(vary $\ell$, response unchanged). Caveats (verbatim-verified v0.2): equivalence to
Barenblatt established "at least in the 1-D case"; "except for crack bandwidth" all
predictions ℓ-insensitive — i.e. **the band width still scales with $\ell$**; possible
loss of variational consistency in general.

### 8.5–8.10 Further variants (STRETCH — § 5.5 upgraded three of these to verified presets)

- **8.5 Anisotropic fracture** — split verdict (v0.2): *weak* anisotropy (2nd-order
  structural tensor in the gradient term) is nearly free on the grid → tilted cracks,
  cheap preset. *Strong* anisotropy (sawtooth/zigzag forbidden-direction paths — Li,
  Peco et al. IJNME 2015) needs a **4th-order damage operator** — on an FD grid that is
  just a wider stencil (easier than C¹ FEM), but it is a second gate-kernel variant;
  deferred-with-cause.
- **8.6 Ductile fracture** — plasticity coupling (Miehe elastoplastic). Heavier.
- **8.7 Thermo-mechanical / thermal-shock** — **PROMOTED to § 5.5 preset 2** (analytic
  erfc quench profile — no thermal solver needed for v1.x; full coupling to
  `packages/heat-equation` remains stretch). Yuse–Sano oscillating crack rides on it.
- **8.8 Fatigue** — cyclic degradation of $G_c$. Heavier.
- **8.9 Hydraulic / pressurized cracks** — pressure source on the crack. Heavier.
  (Yu, Zhao & Zhao 2025 showcase two-phase hydraulic fracturing on GPU — the cited
  route if ever scoped.)
- **8.10 Desiccation / drying-mud crack networks + thin-film craquelure** — one shared
  reduced engine: shrinkage eigenstrain + **Winkler foundation term $-k u$** (trivial
  on a regular grid) + $G_c$ disorder ⇒ hierarchical polygonal networks with
  T-junctions. Literature: Cajuhi et al. 2018 (Comput. Mech.), Heider & Sun 2020
  (CMAME); craquelure: Freddi & Mingazzi 2025 (JMPS) — canvas-weave $G_c$ modulation
  gives rectilinear vs isotropic craquelure as a skin toggle. Tier-0 feasible; stretch.

---

## 9. 🔴 The f32 precision crux (make-or-break) — reframed v0.2: a UNITS problem

**The hazard is real and citable.** PhAST § 2.4, verbatim: with the Borden glass
parameters "$G_c/\ell_0 = 0.012$ MPa is six orders of magnitude smaller than the elastic
modulus. In single precision ($\varepsilon_{mach}\approx6\times10^{-8}$) the damage
solver's residual can stagnate above the convergence tolerance due to loss of
significance in the reaction term. The solver therefore enforces 64-bit arithmetic for
all solver-critical operations" (and disables PyTorch AMP autocast).
**WebGPU/WGSL is f32-native — f64 is unavailable.**

**But the six orders are an artifact of SI units, not of the physics (v0.2).** The
mitigation, now first not fourth:

1. **Non-dimensionalize — the community-standard fix.** Choose units
   $\{\ell = 1,\ G_c/\ell = 1,\ \rho = 1\}$: then $E$ is the single large dimensionless
   group ($E\ell/G_c \sim 10^4$; Bourdin-school scaling uses exactly
   "$E_0 = 10^4\,G_c/\ell$", arXiv:2203.16467), strains near failure are
   $O(\sqrt{G_c/(\ell E)}) \sim 10^{-2}$, and scaling displacement by
   $e_0\ell = \sqrt{G_c\ell/E}$ makes stored $\tilde\psi^+$, $\tilde{\mathcal{H}}$,
   $d$, and the damage-equation coefficients all $O(1)$. Total dynamic range ≤ 4
   decades vs f32's ~7.2 digits. Direct precedent: arXiv:2603.21811 employs "a
   non-dimensionalization scheme… to improve numerical conditioning" with exactly these
   scalings ($u$ by $\sqrt{G_cL/E}$, stress by $\sqrt{G_cE/\ell}\sim\sigma_c$).
2. **Gradient-flow update side-steps residual stagnation structurally** (§ 3.5): there
   is no iterative residual to stagnate — the elliptic solve exists only in the f64
   reference. The remaining f32 risks are accumulation drift over long runs and strain
   cancellation, both covered by the matched-pair gate.
3. **Double-single (f64-emulation)** in any accumulation that measurement shows needs
   it (energy reductions are the likely candidate — they feed G-energy and the audio).
4. **Matched-pair against a JS-f64 reference** (repo pattern), gating on curve shape +
   peak-load band + kink-angle band (§ 6.1), NOT on matching f64 to 1%.

**Spectral option demoted (v0.2).** The real FFT-PFF literature (Chen, Vasiukov,
Gélébart et al. 2019 CMAME — first FFT phase-field fracture solver, >32M voxels;
Ernesti, Schneider & Böhlke 2020 CMAME — implicit ADMM formulation) is periodic-BC,
f64, implicit, and documents **convergence deterioration at the zero-stiffness crack
contrast** (the "gas phase" pathology; Schneider et al. 2025 penalize the initial-flaw
phase to survive it). Every one of those properties argues against it as our browser
baseline; it stays as a cited note, not a spike branch.

**Moat corollary (v0.2):** no validated f32 phase-field-fracture solver was found
anywhere (the FFT/HPC/GPU codes are all f64; SymPhas offers f32 for generic Allen–Cahn,
not fracture). A **gated f32 fracture kernel with a published-adversary answer** (the
PhAST quote above) is itself a first — the precision crux, solved and verified, is moat.

**This must be de-risked in a prototyping spike BEFORE v1 commits (§ 13).** It decides
whether the sim can be honest.

Also relevant (WGSL builtin-precision hazard, per repo lessons): builtin `sin/cos` are
only 2⁻¹¹-accurate and `exp` 3+2|x| ULP — any transcendental in gated math uses
CPU-f64-precomputed buffers or the committed poly-trig kernels, never naive builtins.
(The gradient-flow kernel needs none — polynomial arithmetic only — one more argument
for it.)

---

## 10. Feature roadmap (shipping order)

| Tier | Features |
|---|---|
| **v1 core** | 2D plane-strain/stress FD grid, non-dimensionalized (§ 9); AT2 + AT1 toggle; hybrid momentum + Miehe strain-spectral driving split (stress-spectral + Amor comparisons); **gradient-flow damage kernel + elliptic f64 reference** (§ 3.5); KE/IE-disciplined quasi-static loading (§ 3.6); interactive notch/pull/shear/bend; **draw-your-own obstacles brush + perforation preset + en-passant preset** (§ 5.5 #1, #3); sliders ($\ell,G_c,E,\nu$, rate); warped-material + fragment-tint + tip-glow + stress render (§ 5.1); live energy plot + KE/IE gauge; matched-pair f64 gate; SENT + SENS + 3-pt-bend gates |
| **v1.x** | Dynamic fracture (click-to-strike Kalthoff + branching, G-branch); **thermal-shock ladder, residual-stress fragmentation, spinning-ring + Grady regime map, impact spiderweb** (§ 5.5 #2, #4, #5, #6); **acoustic-emission audio** (§ 5.6); AT1-vs-AT2 & split side-by-side; Γ-convergence/length-scale set piece; Γ(v) lens; material presets; L-panel benchmark |
| **stretch** | PF-CZM (ℓ-insensitivity headline); Yuse–Sano oscillating crack; desiccation/craquelure shared engine (§ 8.10); weak→strong anisotropic cleavage (§ 8.5); ductile (plasticity); fatigue; hydraulic; 3D (64³–128³) |

---

## 11. GPU optimization & real-time budget

- **All passes matrix-free** — stencil operator action computed on the fly, no global
  assembly (matrix storage is the FEM memory bottleneck; matrix-free is the recurring
  GPU-PFF justification — Jodlbauer–Langer–Wick, PhAST).
- **Elastic solve explicit** (velocity-Verlet, lumped mass) → no linear solve; timestep
  CFL-limited by $c_d=\sqrt{E(1-\nu)/((1+\nu)(1-2\nu)\rho)}$. At 256²–512² this
  substeps comfortably within a 60 fps frame for dynamic presets; quasi-static presets
  run O(10–100) substeps/frame over seconds of wall time (§ 3.6 numbers).
- **Damage update fully local** (gradient flow, § 3.5) — fused into the same dispatch
  as the strain/history pass where bindings allow; zero iteration.
- **Damage subcycling (from PhAST, v0.2):** crack fronts move at ≤ 0.6 $v_R$ while dt
  is set by the faster $c_p$ — the damage update may run every
  $N_{sub} = \lfloor c_p/(0.6 c_R)\rfloor \ge 3$ steps, **with H still updated every
  step** so irreversibility lives on the fine timescale (PhAST measured 45% wall-clock
  saving; their damage solve was 59–71% of per-step cost — ours is cheaper, so measure
  before adopting).
- **8-storage-buffer WebGPU limit** — 2D fields needed: $u$ (vec2), $v$ (vec2), $d$, $H$,
  material ($E, G_c$ pack), fragment labels, stress-aux. **Interleave** into vec2/vec4
  packs (heat-equation's trick) rather than one buffer per scalar.
- **Fragment connected-components** — iterative label propagation, a few
  dispatches/frame, amortized across frames (labels only need to settle between
  topology changes); purely visual, ungated.
- **Determinism** — per-cell updates only (no atomics races); run-twice byte-identity is
  a gate (§ 6.1). Encoded-splat / submit-ordering traps per repo lessons; add the
  layout-auto bind-group + uncapturederror listener traps from pic-flip.
- **Adaptive loading rate** near nucleation (ported one-shot idea, § 3.4/§ 3.6) for
  quasi-static fidelity without global tiny steps.
- **Uber-composite render** (§ 5.1) — one pass, each field read once, uniform-branch
  layers, half-res mip bloom; per-layer GPU timings surfaced (heat-equation pattern).

---

## 12. Repo reuse & module posture

- **Reuses:** `common-web` capture-export + settings panel; the `new_canonical`
  deploy-gate harness; the signal-workbench audio stack
  (`packages/signal-workbench/web/src/audio.ts` lineage) for acoustic emission
  (§ 5.6); heat-equation's uber-composite render budget pattern and its erfc analytic
  profile (thermal-shock preset, § 5.5 #2); poly-trig kernels only if any gated
  transcendental appears (the baseline kernel needs none, § 9).
- **Does NOT need `common-fem`** (regular grid, not FEM) — the deliberate decoupling
  from the AMULET waves track.
- **Does NOT need the Stockham FFT** (v0.2: spectral damage option demoted, § 9).
- **Optional alternate:** an MPM route could reuse `packages/mpm-multimaterial`; noted,
  not planned (CD-MPM is the offline precedent).
- **Landing integration** (per repo workflow): hardcoded index.html card + make-posters /
  make-loops SIMS entry + `check-links.mjs` SIMS mirror; hide embedded-lab chrome; assets
  committed PLAIN not LFS; poster/loop budget traps.

---

## 13. Open decisions (judgment calls — resolve before v1)

1. **The f32 precision + solver spike is gating (§ 9, § 3.5).** One throwaway 1D/2D FD
   prototype + JS-f64 elliptic reference answering, on the SENT scenario: (a) does the
   non-dimensionalized f32 gradient-flow kernel converge, and by how much does it
   diverge from f64? (b) what $\chi$ keeps the Γ(v) toughness inflation inside the
   G-SENT ±10% band? (c) gradient-flow vs warm-started projected-GS — pick the browser
   baseline on measured error × cost. The answers set G-matched and G-Γv and unblock
   the whole build. Highest-risk item in the sim.
2. **Quasi-static loading-rate schedule:** fixed $v_{load}\approx10^{-4}c_d$ + one-shot
   slowdown at nucleation vs adaptive KE/IE-servo — resolve in the spike; gate on
   curve shape + G-QS.
3. **Tolerance category:** confirm the new f32-web fracture tolerance category and its
   declared bands (§ 6.1) with the owner, as a first-of-category gate.
4. **Category banking:** `fracture` is a NEW sim-spec category with no
   `architecture.md` section; decide whether to bank a spec § for it at cluster
   landing (spec § G.12).
5. **Preset scope for v1 vs v1.x:** § 10 puts obstacles + en-passant in v1 core and the
   four dynamic showcases in v1.x — confirm with the owner against build budget (the
   dynamic four share one solver mode; the marginal cost per preset is IC + copy).

---

## 14. Moat / differentiation (re-scoped v0.2)

**The claim, scoped to survive one Google search:** *the first **verified,
interactive, in-browser** energy-variational (phase-field) fracture sim — where the
crack path is the emergent solution of an energy minimization, gated live against
published SENT / Kalthoff benchmarks.*

What it is NOT claimed against (v0.2 prior-art sweep):

- **Not "first energy-variational fracture"** — graphics has it offline: **CD-MPM
  (SIGGRAPH 2019)** evolves damage with a Ginzburg–Landau phase-field equation;
  AnisoMPM 2020 and Zhao 2020 (GPU plastic PFF-MPM) are siblings. All offline,
  desktop, unverified, million-particle showcase scenes.
- **Not "first browser fracture"** — kainino0x's live **webgpu-fracture-hack** exists
  and its title alone is the likeliest challenge; it (and every three.js shatter lib)
  is **geometric pattern clipping with zero stress computation** (authors' own
  description), Müller-2013 lineage. Cite it by name in web copy.
- **"Verified" is the genuinely unprecedented word** — none of the GPU fracture codes
  (Ziaei-Rad & Shen, Yu/Zhao/Zhao FVM, PhAST, Taichi PF-MPM) ships user-runnable
  verification, and no surveyed educational web tool (VisualPDE: zero fracture
  content; Ten Minute Physics: zero fracture demos; Energy2D) even attempts a
  fracture model.

Stacked differentiators, all aligned with the repo's edge:

1. **It computes fracture instead of faking it** — the crack path emerges from energy
   minimization, gated against the canonical benchmarks (§ 4), with the geometric
   VFX/browser alternatives named and distinguished.
2. **First validated f32 phase-field fracture anywhere** (§ 9) — with PhAST's
   published f64-only statement as the adversary it answers.
3. **Tier-0 accessibility** — a frontier research method (Miehe/Bourdin/Karma/Wu)
   running in a browser, the master-catalog § 11.6.5 Tier-0 gap.
4. **Pedagogical legibility** — AT1/AT2, energy splits, Γ-convergence, the KE/IE
   gauge, and the Γ(v) lens shown live (§ 5.3–5.4).
5. **Honest rigor** — it *discloses* the three § 1.1 boundaries verbatim in the
   product; the disclosure is itself the differentiator.
6. **Showcase breadth with receipts** — every § 5.5 preset carries its literature
   anchor and regime map, not just a pretty IC.

---

## 15. Key citations

**Variational foundations & standard models**
- **Francfort & Marigo 1998** — variational (energy-minimization) fracture.
- **Bourdin, Francfort & Marigo 2000/2008** — numerical regularization.
- **Ambrosio & Tortorelli 1990** — Γ-convergence of the regularized functional.
- **Miehe, Welschinger & Hofacker 2010** — thermodynamically consistent PFF (IJNME 83) — <https://onlinelibrary.wiley.com/doi/abs/10.1002/nme.2861>; **Miehe, Hofacker & Welschinger 2010** — operator splits + viscous regularization (CMAME 199:2765).
- **Pham, Amor, Marigo & Maurini 2011** — AT1 / gradient-damage; **Tanné et al. 2018** (JMPS 110) — crack nucleation, σ_c–ℓ table.
- **Ambati, Gerasimov & De Lorenzis 2015** — review + hybrid ("about one order of magnitude") — <https://link.springer.com/article/10.1007/s00466-014-1109-y>.
- **Gerasimov & De Lorenzis 2019** — penalization; history-field non-variationality, AT1 bound necessity (CMAME 354:990) — <https://arxiv.org/abs/1811.05334>.

**Dynamic & kinetic (gradient-flow) lineage**
- **Karma, Kessler & Levine 2001** — phase-field model of mode-III dynamic fracture (PRL 87:045501) — <https://arxiv.org/abs/cond-mat/0105034>.
- **Hakim & Karma 2009** — laws of crack motion, gradient dynamics, Γ(v) (JMPS 57:342) — <https://arxiv.org/abs/0806.0593>.
- **Pons & Karma 2010** — helical crack-front instability (Nature 464:85) — <https://www.nature.com/articles/nature08862>.
- **Borden et al. 2012** — dynamic PFF (branching, Kalthoff; ≤0.6 v_R; one-pass staggered) — <https://www.oden.utexas.edu/media/reports/2011/1114.pdf>.

**GPU / HPC / solver strategy**
- **Ziaei-Rad & Shen 2016** — founding GPU-PFF, explicit + rate-dependent damage (CMAME 312) — <https://www.sciencedirect.com/science/article/abs/pii/S0045782516302006>.
- **Kristensen & Martínez-Pañeda 2020** — BFGS monolithic, "up to" 100×/3000× — <https://arxiv.org/abs/1912.08620>.
- **Yu, Zhao & Zhao 2025** — full-process GPU finite-volume PFF (Computers and Geotechnics) — <https://www.sciencedirect.com/science/article/abs/pii/S0266352X25004306>. *(v0.2: corrects v0.1's "Geng et al.")*
- **arXiv:2606.23458 (2026)** — PhAST matrix-free differentiable solver; benchmark numbers; f32 statement; AT1 healed-solution trap; damage subcycling — <https://arxiv.org/abs/2606.23458>.
- **FFT-PFF:** Chen, Vasiukov, Gélébart et al. 2019 (CMAME 349:167); Ernesti, Schneider & Böhlke 2020 (CMAME 363:112793) — cited for the demotion rationale (§ 9).
- **Sahin et al. 2023** — explicit quasi-static PFF + local damping + mass scaling (Eng. w/ Computers) — <https://link.springer.com/article/10.1007/s00366-022-01777-5>; **Hu, Zhuang, Rabczuk et al. 2023** — implicit/explicit overview, KE/IE ≤ 5% criterion (TAFM) — <https://www.sciencedirect.com/science/article/abs/pii/S0167844223000319>.

**Splits, cohesive, benchmarks**
- **Zhang, Jiang & Tonks 2022** — four-split assessment, stress-spectral best — <https://link.springer.com/article/10.1186/s41313-021-00037-1>.
- **Wu 2017 / Wu & Nguyen 2018** — PF-CZM ℓ-insensitivity (+ 1D-rigor & bandwidth caveats) — <https://www.sciencedirect.com/science/article/abs/pii/S0022509618302643>; **Wu 2024** — <https://arxiv.org/html/2412.03836>.
- **PhaseFieldX example 1711** — SENT 0.7012 kN reproduction provenance — <https://phasefieldx.readthedocs.io/en/latest/auto_examples/PhaseFieldFracture/plot_1711.html>.

**Showcase presets (§ 5.5)**
- **Bourdin, Marigo, Maurini & Sicsic 2014** — thermal-shock crack morphogenesis (PRL 112:014301); **Shao et al.** quench experiments.
- **Corson et al. 2009** — Yuse–Sano oscillating crack via phase field (IJF) — <https://link.springer.com/article/10.1007/s10704-009-9361-4>.
- **Ghelichi & Kamrin 2015** — en-passant crack interaction (Soft Matter) — <https://arxiv.org/abs/1409.0601>.
- **Pourmoghaddam & Schneider 2018** — tempered-glass fragment density vs strain energy (Glass Struct. Eng.) — <https://link.springer.com/article/10.1007/s40940-018-0062-0>.
- **Durussel, Molnár & Molinari 2025** — PF dynamic fragmentation band-widening + mitigation — <https://arxiv.org/abs/2512.18022>.
- **Grady lineage / Glenn–Chudnovsky** — fragment-size vs strain-rate scaling (ring benchmark).
- **Mang et al. 2021** — punctured-strip PFF experiment-vs-sim — <https://arxiv.org/abs/2104.14826>.
- **Sethna, Dahmen & Myers 2001** — crackling noise (Nature 410:242) — acoustic-emission lens framing.

**Moat contrast**
- **Wolper et al. 2019 (CD-MPM)** — Ginzburg–Landau phase-field damage in graphics, offline — <https://dl.acm.org/doi/10.1145/3306346.3322949>; **AnisoMPM 2020**; **Zhao et al. 2020** (CGF GPU plastic PFF-MPM).
- **kainino0x/webgpu-fracture-hack** — live geometric WebGPU fracture, zero stresses — <https://github.com/kainino0x/webgpu-fracture-hack>; **kainino0x/cis565final** (WebCL 2014); **Müller, Chentanez & Kim 2013** — pattern fracture (SIGGRAPH).
- **NVIDIA Blast** — authored Voronoi shattering — <https://github.com/NVIDIAGameWorks/Blast>.

> **Provenance:** v0.1 synthesized from a deep-research workflow pass (2026-07-08): 6
> search angles, 27 sources fetched, 124 claims extracted, 25 adversarially verified
> (24 confirmed, 1 refuted). **v0.2 (2026-07-08): four parallel adversarial research
> passes** — (i) primary-source re-verification of every load-bearing citation (10
> items: 8 confirmed, 1 misattribution corrected [Geng→Yu/Zhao/Zhao], several nuances
> pinned with verbatim quotes), (ii) GPU/browser prior-art survey (6 angles; moat
> re-scoped against CD-MPM and webgpu-fracture-hack), (iii) showcase-preset literature
> sweep (10 candidates + 2 discovered; 7 shipped into § 5.5 with anchors, 3
> deferred-with-cause), (iv) numerical-feasibility audit (explicit quasi-statics,
> CFL/step-count arithmetic, gradient-flow pedigree, f32 non-dimensionalization
> precedent). Remaining literature-plausible / spike-pending items are flagged
> in-line (§ 8.5–8.10 unscoped variants; § 5.5 #4 thin-precedent flag; § 13 spike
> questions).
