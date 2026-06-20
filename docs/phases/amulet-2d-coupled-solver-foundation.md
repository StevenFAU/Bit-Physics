# Mathematical & Methodological Foundation — 2D Coupled Acoustic–Structure–Thermoviscous Solver (AMULET Figure-6 Reproduction)

> **Companion to:** `phase-6-amulet-acoustic.md` (the executable track charter). This doc is the physics/numerics foundation the charter's Rung-2 reference solver is built against. Numbers here are reconciled with the charter.
> **Source paper (in hand):** Bergey, Garg, Gadre, *AMULET: Acoustic Metastructure for Direction-of-Arrival Estimation Underwater Using a Single Hydrophone*, SenSys '26. All parameters below are taken from the paper where the paper states them; where the paper is silent (PLA elastic constants, the exact coupling model behind Fig. 6), that is called out explicitly in **Caveats**.
> **Fidelity stance:** Per owner direction — *over-resolve when uncertain.* Full thermoviscous (linearized Navier–Stokes) is the primary air-channel model, not a reduced surrogate; mesh is sized to the **96 kHz** hydrophone ceiling, not the 88 kHz band edge; boundary-layer and element counts are set at the conservative end of accepted ranges.

---

## 0. What we are building, and the deliverable

A 2D, frequency-domain (time-harmonic) finite-element solver that computes the steady-state acoustic field in a cross-section of the AMULET metastructure — water outside, PLA shell, spiral air cavity inside — for a plane wave arriving from a given angle at a given frequency. Run it over a grid of (angle, frequency) and you reproduce **Figure 6**: the paper's "2D cross-section COMSOL Multiphysics simulation across signal directions-of-arrival and frequencies [showing] diverse reverberance in the air cavity."

**Figure 6's grid, read off the paper's axes:** frequency rows at 9, 18, 27, 36, 45, 54, 63, 72, 81, 90 kHz (10 rows, 9 kHz step); angle columns at 0, 15, 30, … 180° (13 columns, 15° step). So the figure itself is ~130 single-(f, θ) solves. Each cell is **one harmonic solve** of the coupled system — not a transient run.

This is a faithful-method reproduction first; design improvement comes after.

---

## 1. Parameters — paper-stated (this is the table the charter and this doc must agree on)

| Quantity | Value | Source in paper |
|---|---|---|
| **Operating bandwidth (sensing/calibration)** | **1–88 kHz** (87 kHz-wide chirp) | §6.1, §8: "0.1 s linear chirp of 87 kHz bandwidth spanning 1 kHz to 88 kHz"; first kHz dropped (noise), >88 kHz dropped (non-uniform directional gain) |
| Hydrophone usable bandwidth | 0–96 kHz (192 kHz sampling) | §8 |
| **Figure 6 sweep grid** | 9–90 kHz × 0–180° | Fig. 6 axes |
| **Calibration angular sweep** | 0–360° at **1°** resolution | §6.1: "rotated across 360° with a resolution of 1°" |
| Excitation waveform (real system) | linear chirp, but the **sim needs the impulse response**, so excite per-frequency (harmonic) | §6.1 model `y = x ∗ h_multipath ∗ s_n°` |
| Final structure diameter | 6.2 cm (variants 4.5 / 6.2 / 7.7 cm) | §9.2 |
| Signature-extraction depth | 0.8 m (saltwater tank) | §6.1 |
| Solid material | 3D-printed PLA (Creality K1C); resin baseline = Elegoo tough resin | §8 |
| Waterproofing | Gorilla Waterproof Patch & Seal Spray, 2 coats, 24 h cure — **a thin coating layer that is acoustically present** | §8 |
| Reference solver they used | COMSOL Multiphysics **v6.3** | ref [13] |
| 3D FEA cost (their note) | "several months" on a 4090Ti / 128 GB / i9-14700K | §7 |

**The one number to get right:** the *physical* band is **1–88 kHz**; Figure 6 is sampled on a *coarser display grid* (9–90 kHz). For the design tool, cover the full 1–88 kHz finely; to reproduce Figure 6 exactly, hit their grid points. **Mesh design frequency = 96 kHz** (hydrophone ceiling) so the discretization is valid across the entire usable band with margin — the "over not under" choice.

---

## 2. The physics: three paths, and why pressure-acoustics alone fails

The paper states the three contributions to the received signature verbatim (§5.2): **"(1) direct path attenuated by air cavity; (2) the strongest path through the PLA with a delay; and (3) resonant reverberations of the air cavity beyond this strongest path."**

Why each demands what it demands:

- **Path 2 (the load-bearing one) is an elastic wave in a solid.** PLA's acoustic impedance is *close to water* (small contrast), so energy enters the solid instead of reflecting at the surface — that is what lets a solid path exist at all (the paper's §3 point that low contrast means energy passes into/through the structure). Once inside, the wave propagates as a **compressional (P) and shear (S) elastic wave**, both faster than sound in water, producing the delayed-but-distinct arrival. A *pressure-acoustics* model treats PLA as a fluid or an impedance boundary and **cannot carry shear**, so it structurally cannot reproduce Path 2. This is almost certainly the wall hit with the acoustic-only 2016 COMSOL license.
- **Path 3 lives in the narrow air cavity**, where viscous and thermal wall losses dominate the ring-down — this is where the thermoviscous model earns its place (§5–6).
- **Path 1** is straightforward attenuated transmission.

**Conclusion:** the correct model is full **acoustic–structure interaction** — Helmholtz pressure acoustics in water, **full elastodynamics (Navier–Cauchy)** in the PLA, **thermoviscous (linearized Navier–Stokes) acoustics** in the air cavity — fully coupled. This is "the full thing"; it is the right *method* regardless of which simplification the authors may have used for the Figure-6 illustration itself (see Caveats).

---

## 3. Governing equations, per domain (applied framing)

Convention: time-harmonic, e^{iωt}, complex fields; ω = 2πf.

### 3.1 Water (and air bulk if treated losslessly) — Helmholtz / pressure acoustics
$$\nabla\!\cdot\!\Big(-\tfrac{1}{\rho}\nabla p\Big) - \frac{\omega^2}{\rho c^2}\,p = 0 \quad\Longleftrightarrow\quad \nabla^2 p + k^2 p = 0,\ \ k=\omega/c.$$
**What it means for you:** one complex scalar unknown per node (the pressure). Cheap. This is the bulk water domain and, if you ever want a lossless air check, the air bulk. It is the easy physics; the cost is in the coupling and the air losses.

### 3.2 PLA shell — time-harmonic linear elastodynamics (Navier–Cauchy)
$$\nabla\!\cdot\!\sigma + \rho_s\,\omega^2\,\mathbf{u} = 0,\qquad \sigma = \mathbf{C}\!:\!\varepsilon,\qquad \varepsilon=\tfrac12(\nabla\mathbf{u}+\nabla\mathbf{u}^{\!\top}).$$
Isotropic form: $\mu\nabla^2\mathbf{u} + (\lambda+\mu)\nabla(\nabla\!\cdot\!\mathbf{u}) + \rho_s\omega^2\mathbf{u} = 0$.
**2D reduction — plane STRAIN (binding).** Take the cross-section under **plane strain** ($\varepsilon_{zz}=\varepsilon_{xz}=\varepsilon_{yz}=0$) — the correct reduction for a thick body extended out-of-plane and the COMSOL 2D Solid Mechanics default. Plane *stress* ($\sigma_{zz}=0$, for thin in-plane-loaded plates) is **wrong** here. The choice fixes the effective Lamé constants: in plane strain use $\lambda=E\nu/((1+\nu)(1-2\nu))$ with the dilatational modulus $\lambda+2\mu$, so $c_P=\sqrt{(\lambda+2\mu)/\rho_s}$ as written below; plane stress would substitute $\lambda^*=2\lambda\mu/(\lambda+2\mu)$ and give a different (lower) $c_P$. **Both the fluid–solid R/T-vs-angle oracle (§ 11.4) and the § 6 wavelength table are computed with the plane-strain $c_P$.** The AMULET is a compact 6.2 cm spiral (not infinitely long), so plane strain is an approximation; its error is a 2D≠3D contributor logged in the UQ budget (gate G-uq).

**What it means for you:** two complex vector-component unknowns per node in 2D (displacement $u_x, u_y$). This operator carries **both** wave speeds — $c_P=\sqrt{(\lambda+2\mu)/\rho_s}$ and $c_S=\sqrt{\mu/\rho_s}$ — which is exactly the shear physics pressure-acoustics throws away. Represent PLA damping with a **complex modulus $M(1+i\eta)$** (loss factor $\eta\approx0.01$–$0.05$): under the $e^{i\omega t}$ convention used here, the **$+i\eta$** sign gives spatial decay of a propagating wave — $M(1-i\eta)$ would give unphysical growth. This sets how fast Path 2 decays and how wide the cavity resonances are.

### 3.3 Air cavity — thermoviscous acoustics (full linearized Navier–Stokes)
Solve for pressure $p$, velocity $\mathbf{u}$, and acoustic temperature $T$ simultaneously:
$$\text{Continuity: } i\omega\rho = -\rho_0(\nabla\!\cdot\!\mathbf{u}),\quad \rho=\rho_0(\beta_T p - \alpha_p T)$$
$$\text{Momentum: } i\omega\rho_0\mathbf{u} = \nabla\!\cdot\!\Big[-pI + \mu(\nabla\mathbf{u}+\nabla\mathbf{u}^{\!\top}) + (\mu_B-\tfrac23\mu)(\nabla\!\cdot\!\mathbf{u})I\Big]$$
$$\text{Energy: } i\omega\rho_0 C_p T = \nabla\!\cdot\!(\kappa\nabla T) + i\omega\alpha_p T_0\,p$$
**What it means for you:** this is the expensive physics — **four coupled complex unknowns per node** ($p, u_x, u_y, T$) — but it is the *only* model that captures the viscous and thermal boundary-layer losses that dominate the cavity ring-down (Path 3). Given the over-not-under stance, this is the **primary** air-channel model. The efficient equivalent is Kampinga's **Sequential LNS (SLNS)** — three weakly-coupled scalar Helmholtz solves (a viscous scaling field, a thermal scaling field, and the pressure), available as COMSOL 6.3's "Thermoviscous Acoustics, SLNS Approximation" and "computationally efficient [while capturing] most thermoviscous losses correctly." Use full LNS as the truth model and SLNS as the GPU-affordable production form; the cheaper LRF / Boundary-Layer-Impedance surrogates are documented in §5 as fallbacks only. **Cross-check SLNS at curvature, not just a straight channel.** SLNS rests on a locally-1D wall-normal boundary-layer correction — an assumption most strained at the spiral's **tight curvature and corners/cusps** (the same regime that breaks the related Berggren Wentzell surrogate, §5). Since the production (θ, f) Figure-6 sweep is computed with SLNS, the FLNS↔SLNS equivalence must be established on **both** a straight canonical slit/tube **and** a curved/cornered channel representative of the spiral, with the tolerance measured in *that* geometry, before SLNS is trusted for the headline product.

---

## 4. Coupling conditions (the off-diagonal blocks that make it one problem)

### 4.1 Inviscid fluid ↔ solid (water/PLA — the Acoustic–Structure Boundary)
Two conditions, because an inviscid fluid allows slip — coupling acts **only along the normal**.

**Normal-orientation convention (pin this before assembly).** Each interface term uses its **own domain's outward normal**: $\mathbf{n}_s$ (pointing solid → fluid) for the load on the solid, $\mathbf{n}_f=-\mathbf{n}_s$ (pointing fluid → solid) for the fluid-side Neumann acceleration term. The two normals are antiparallel; that opposite-normal bookkeeping is what produces the minus sign on the right-hand side below even though the fluid's normal acceleration **physically equals** the structure's.
- **Load on solid:** $\mathbf{F} = p_t\,\mathbf{n}_s$ (surface force = total pressure × solid outward normal).
- **Normal-acceleration continuity** (fluid normal acceleration = structure normal acceleration): $-\mathbf{n}_f\!\cdot\!(-\tfrac1{\rho}\nabla p_t) = -\omega^2\,\mathbf{n}_s\!\cdot\!\mathbf{u}$.

This is exactly the sign pattern of the unsymmetric $(u,p)$ block in § 4.4 (off-diagonals $-C$ and $+\rho_f\omega^2 C^{\!\top}$ with $C=\oint_\Gamma N_u^{\!\top}\,\mathbf{n}\,N_p\,d\Gamma$, $\mathbf{n}=\mathbf{n}_s$). **Do not "fix" the minus sign by inspection** — its correctness is confirmed by the energy-balance gate (incident = reflected + transmitted + dissipated, § 11.6) and the Brekhovskikh R/T-vs-angle oracle (§ 11.4), both of which fail loudly on a wrong-sign coupling. Tangential traction on the fluid side is zero. This is the standard fluid–solid set (continuity of normal velocity/displacement; normal traction = −pressure; zero tangential traction).

### 4.2 Thermoviscous fluid ↔ solid (air/PLA — the Thermoviscous Acoustic–Structure Boundary)
A viscous fluid sticks to the wall, so the coupling is **full-vector, not just normal**:
- **No-slip velocity continuity (all components):** $\mathbf{u}_{\text{fluid}} = i\omega\,\mathbf{u}_{\text{solid}}$.
- **Full stress-tensor traction continuity** (the thermoviscous stress, including shear, loads the solid).
- **Thermal condition:** isothermal walls ($T=0$, default) or adiabatic (zero normal heat flux). Isothermal is the right default for a solid wall with much higher heat capacity than air.
**The contrast that matters:** §4.1 couples one component (normal, slip); §4.2 couples the whole velocity vector plus full stress plus temperature (no-slip). Getting §4.2 right is what makes the air-cavity losses physical.

### 4.3 Thermoviscous fluid ↔ inviscid fluid (air cavity mouth ↔ water/air bulk)
Continuity of pressure and normal velocity. Standard practice (and the only affordable practice): use thermoviscous **only** in the narrow channels, inviscid Helmholtz everywhere else, and stitch at this boundary. The energy equation also needs a **thermal condition at the mouth**: continuity of heat flux (adiabatic, $\partial T/\partial n = 0$) is the right default here — valid because the thermal boundary layer does not reach the mouth (§ 5). Tangential velocity and temperature are otherwise left natural (free) on the inviscid side, which carries neither field.

### 4.4 Weak form & assembled system (for the from-scratch build)
Multiply each strong form by a conjugate test function, integrate by parts; the interface integrals produce the coupling blocks. The non-symmetric displacement–pressure (u/p) system:
$$\begin{bmatrix} K_s - \omega^2 M_s & -C \\ \rho_f\omega^2 C^{\!\top} & K_f - \omega^2 M_f \end{bmatrix}\begin{bmatrix}\mathbf{u}\\ p\end{bmatrix} = \begin{bmatrix}\mathbf{F}_s\\ \mathbf{F}_f\end{bmatrix},\qquad C=\oint_\Gamma N_u^{\!\top}\,\mathbf{n}\,N_p\,d\Gamma.$$
**What it means for you:** per frequency you assemble and solve **one complex, non-Hermitian, indefinite sparse system**. The (u/p) form is the simplest to assemble from scratch; symmetric/spurious-mode-free variants exist (Herrmann pressure; Bermúdez–Durán–Rodríguez fluid-displacement; Morand–Ohayon) if you later hit spurious modes. With the thermoviscous block in, the air-domain rows expand to the 4-field $(p,\mathbf{u},T)$ (full LNS) or 3-scalar (SLNS) layout.

---

## 5. Thermoviscous regime — the numbers for *this* problem

The regime is set by two dimensionless groups (Beltman 1999; Tijdeman 1975): the **shear wave number** $s = h\sqrt{\rho_0\omega/\mu}$ (channel size vs viscous-layer scale) and the **reduced frequency** $k=\omega h/c$ (channel size vs wavelength).

**Boundary-layer thickness in air** (COMSOL form): $\delta_v = 0.22\,\text{mm}\,\sqrt{100\,\text{Hz}/f}$. Across the band:

| f | δ_v (viscous) | δ_t ≈ 1.2 δ_v (thermal) |
|---|---|---|
| 1 kHz | 70 µm | 84 µm |
| 9 kHz | 23 µm | 28 µm |
| 88 kHz | 7.4 µm | 8.9 µm |
| 96 kHz (mesh design) | 7.1 µm | 8.5 µm |

**Read for AMULET's sub-mm channels:** with a channel on the order of a few tenths of a mm, the boundary layer is a single-digit-percent fraction of the channel at the top of the band, growing toward ~10–20% at the low end. Two consequences: (a) the channel is far below the air-wavelength cutoff (air λ = 3.6–38 mm over the band) — so the cross-section pressure is essentially uniform, and the losses are real and concentrated at the walls; (b) the boundary layers **do not overlap**, so the cheaper Boundary-Layer-Impedance (BLI, Bossart et al.) and Low-Reduced-Frequency (LRF) equivalent-fluid models are *technically valid* — but per the over-not-under stance we do **not** lean on them as the truth model.

**Model choice (over not under):**
- **Primary / truth:** full linearized Navier–Stokes (FLNS) in the air channels, with a resolved boundary-layer mesh. Most complete; most expensive.
- **Production:** SLNS (three Helmholtz solves) — captures the same losses at a fraction of the DOF; GPU-friendly. Cross-check against FLNS on **both a straight canonical channel and a curved/cornered channel representative of the spiral** (§ 3.3) — its locally-1D boundary-layer assumption is weakest at curvature.
- **Documented fallbacks (not primary):** LRF "slit" equivalent fluid (complex wavenumber $k_c$, complex impedance $Z_c$ via the $\Psi_v$, $\Psi_h$, $\gamma$ functions) embedded in pressure acoustics; or the thermoviscous-boundary-layer-impedance wall condition; or the Berggren–Bernland–Noreland single-field Wentzell-BC method (note: it "does not apply to surfaces with large curvatures" — relevant given the spiral). Keep these for fast design sweeps once FLNS/SLNS has validated them.

**Signature of correctness:** when thermoviscous losses are switched on, cavity resonances **shift down in frequency and broaden** — the canonical thermoviscous effect (COMSOL: losses are "most pronounced at resonances, broadening them and shifting them down in frequency"). If your resonances don't move when you add losses, the coupling is wrong. **This is verified quantitatively, not qualitatively** (gate G-coupling): the *magnitudes* of the downward shift Δf and the broadening ΔQ must **converge against the FLNS truth model** within a measured-then-declared tolerance — "they moved" is necessary but **not sufficient**, since a miscalibrated § 4.2 stress/thermal coupling can still produce *some* shift. Where reachable, a thermoviscous channel terminated by a **compliant (elastic) wall** provides an additional semi-analytic oracle for § 4.2 — the only coupling that otherwise lacks the quantitative angle-resolved oracle that § 4.1 gets from Brekhovskikh (§ 11.4).

---

## 6. Finite-element discretization (sized for 96 kHz, conservative end)

**Wavelengths at the 96 kHz mesh design frequency** (over-resolves the whole 1–88 kHz band):

| Medium | speed | λ at 96 kHz | governs |
|---|---|---|---|
| Water | ~1481 m/s | 15.4 mm | water mesh |
| Air | ~343 m/s | 3.6 mm | air-bulk mesh |
| PLA P-wave | ~1680–2167 m/s | 17.5–22.6 mm | — |
| **PLA S-wave** | ~790–1000 m/s | **8.2–10.4 mm** | **solid mesh (shortest elastic λ)** |

The PLA P/S speeds are the literature ranges (§ 10) used here as conservative **mesh-sizing** bounds; the elastic *operator* and the fluid–solid R/T oracle (§ 11.4) use the **plane-strain** $c_P,c_S$ of § 3.2, which fall within these ranges and are calibrated against measured samples (Caveats).

- **Element order & density:** quadratic (P2) Lagrange minimum, **6–8 elements per shortest wavelength** (above the standard 5–6; over not under), i.e. $h_{\max}\le \lambda_{\min}/6$. The shortest controlling wavelength is the **PLA shear wave (~8 mm)** and **air (~3.6 mm)** — air's short wavelength plus the fine cavity features make the air region the densest. Consider P3 in the water if the high-frequency Helmholtz **pollution (dispersion) error** shows up over the many-wavelength water box (Ihlenburg) — verify with a convergence study at 96 kHz.
- **Thermoviscous region — mixed elements:** P2 velocity + P2 temperature + **P1 pressure** (Taylor–Hood-type) to satisfy the inf-sup / LBB condition and avoid spurious pressure modes — the same stability requirement as incompressible Stokes. Equal-order interpolation requires stabilization; don't.
- **Boundary-layer mesh (the expensive, non-negotiable part):** a structured graded mesh on **all** channel walls. Over-not-under: **≥8 graded layers** within the viscous penetration depth, first-layer thickness ≪ δ_v at 96 kHz (target ~1 µm, i.e. ≲ δ_v/7), growth ratio ~1.2–1.3. This is the single biggest mesh cost and the main reason SLNS exists.

---

## 7. Open-domain truncation — PML

Use a **frequency-domain Perfectly Matched Layer** wrapping the water box (and the elastic PML form on any solid that reaches the boundary). PML applies complex coordinate stretching so the layer is reflectionless at matched impedance and absorbs at all incidence angles, "not only plane waves… also efficient at very oblique angles." Settings (conservative): polynomial stretching, scaling factor 1, curvature parameter 3, **8–10 mesh layers** across the PML, regular element shape. In the frequency domain the PML's physical thickness is unimportant (real stretching scales it to wavelength); mesh regularity is what matters. Verify spurious reflection < −40 dB on a plane-wave-through-box test before trusting anything coupled. Alternatives if PML misbehaves on the elastic side: first-order absorbing BCs (cheaper, worse at grazing) or infinite elements (what Actran/Simcenter use).

**Elastic PML — verify it separately, and note what is NOT a risk here.** Because PLA's impedance is close to water, real energy enters the solid (Path 2), so the elastic field genuinely reaches the truncation boundary; the **elastic PML must carry its own absorption gate**, not inherit the water-side one. Run a plane-wave-through-box reflection test on the elastic PML with **separate P-wave and S-wave** incidence, swept to **grazing** angles (S near grazing is the worst case), spurious reflection < −40 dB (verification ladder § 11.2). The classic elastic-PML *instability* (exponential blow-up that motivates a Multiaxial PML / M-PML) is a **time-domain** failure mode of the PML time-integration ODEs; **this is a frequency-domain solver, so that instability is moot — no M-PML is needed.** The only residual frequency-domain risk is grazing-incidence *accuracy*, mitigated by added PML layers / stretching and verified by the P/S grazing-reflection gate above.

---

## 8. Plane-wave excitation and the sweep

**Scattered-field formulation.** Write total field $p_t = p_b + p_s$ and solve for the scattered field $p_s$; impose the incident plane wave as the **background** $p_b = p_0\,e^{-i\mathbf{k}\cdot\mathbf{x}}$ with $\mathbf{k} = (\omega/c)(\cos\theta,\sin\theta)$, $\theta$ = angle of arrival. The governing/coupling equations are written in $p_t$, so the incident wave enters as a source automatically and the **PML only ever sees the outgoing scattered field** — which is what makes the truncation clean. The thermoviscous and acoustic-structure backgrounds extend the same idea (background $p,\mathbf{u},T$).

**Building Figure 6 / the design map.** Double loop: outer over $\theta$, inner over $f$.
- *Reproduce Fig. 6 exactly:* $\theta \in \{0,15,…,180°\}$, $f\in\{9,18,…,90\}$ kHz — ~130 solves.
- *Full design tool:* $\theta\in[0,360°]$ at 1° (matching their calibration) over $f\in[1,88]$ kHz at fine, resonance-resolving steps (e.g. 0.5–1 kHz, adaptive near resonances). Record the in-cavity field (and the virtual-hydrophone pressure) and assemble the (θ, f) amplitude/phase map. Re-mesh per frequency band to keep DOF bounded.
- **The big efficiency win:** at fixed $f$ the system matrix is **identical across all angles** — only the background-field RHS changes. Factor once per frequency, back-substitute per angle. The entire 0–360° angular sweep is then nearly free per frequency. This single fact makes the full 1° calibration map tractable.

---

## 9. How the enterprise tools formulate it (reference, not runtime)

You can't license these, so they serve as authoritative confirmation that the skeleton above is correct.
- **COMSOL Multiphysics v6.3** (what the authors used): the interfaces are *Pressure Acoustics (Frequency Domain)*, *Thermoviscous Acoustics (Frequency Domain)* + its *SLNS Approximation*, *Solid Mechanics*, and the predefined multiphysics couplings *Acoustic–Solid Interaction (Frequency Domain)*, *Acoustic–Structure Boundary*, and *Thermoviscous Acoustic–Structure Boundary*. Directly relevant tutorial models to mirror: *Acoustic–Structure Interaction* (solid cylinder in water — the canonical scattering coupling: "normal acceleration of the fluid set equal to the normal acceleration of the solid," "F = p·n_s"); *Acoustic Scattering off an Ellipsoid* (scattered-field + PML + far field); *Generic 711 Coupler* (thermoviscous coupled to pressure acoustics).
- **Actran (Hexagon/Cadence):** FE + infinite-element vibro-acoustics with explicit underwater-acoustics/sonar use; confirms the coupled-field approach for submerged structures and the infinite-element radiation alternative.
- **Siemens Simcenter 3D Acoustics:** coupled FEM/BEM vibro-acoustics with automatically-matched fluid–structure meshes and AML absorbing boundaries.
All three reduce to: Helmholtz fluid + elastodynamic solid + interface coupling + radiation truncation — the structure you're building.

---

## 10. Open-source / from-scratch references and material properties

- **FEniCS/FEniCSx:** documented Helmholtz tutorials (dolfinx-tutorial ch. 2; UK Acoustics Knowledge Base FEniCSx Helmholtz); the "Computational Acoustics with Open Source Software" series (weak vibro-acoustic coupling); 2025 NAFEMS open-source FEniCSx vibro-acoustics with non-conforming fluid–structure coupling + PML; spurious-mode-free elastoacoustic formulations (Bermúdez–Durán–Rodríguez; multiphenics implementations).
- **Thermoviscous open source:** SLNS three-Helmholtz formulation (Kampinga; Noguchi & Yamada, arXiv:2108.06116) — the GPU-friendly route; Berggren–Bernland–Noreland Wentzell-BC single-field surrogate (J. Comput. Phys. 2018, arXiv:1801.04177); OpenBEM viscothermal BEM reference.
- **Textbooks:** Atalla & Sgard, *Finite Element and Boundary Methods in Structural Acoustics and Vibration* (coupled u/p FEM); Marburg & Nolte (eds.), *Computational Acoustics of Noise Propagation in Fluids* (Springer 2008); Ihlenburg, *Finite Element Analysis of Acoustic Scattering* (Springer 1998 — the rigorous source on Helmholtz pollution and elements-per-wavelength).
- **Material properties (defaults — calibrate against your own samples):**
  - **Water** (~20 °C): ρ ≈ 998 kg/m³, c ≈ 1481 m/s, μ ≈ 1.0×10⁻³ Pa·s, κ ≈ 0.6 W/m·K, C_p ≈ 4186 J/kg·K, μ_B ≈ 2.5×10⁻³ Pa·s.
  - **Air** (20 °C, 1 atm): ρ₀ ≈ 1.2 kg/m³, c ≈ 343 m/s, μ ≈ 1.8×10⁻⁵ Pa·s, κ ≈ 0.025 W/m·K, C_p ≈ 1005 J/kg·K, γ ≈ 1.4, Pr ≈ 0.7.
  - **PLA (FDM):** ρ ≈ 1240–1252 kg/m³; E ≈ 2.0–3.4 GPa; ν ≈ 0.35–0.36; longitudinal speed ≈ 1860–2260 m/s. A published 3D-printed-PLA acoustic model (Tarrazó-Serrano et al., arXiv:1805.10007) used c = 2167 m/s, ρ = 1252 kg/m³, attenuation α = 10 Np/m, ν = 0.36 — a reasonable starting point. **PLA is lossy and anisotropic when FDM-printed; include a loss factor (η ≈ 0.01–0.05) — it sets Path-2 decay and resonance width.**

---

## 11. Verification — build confidence block-by-block (each with an analytic oracle)

1. **Helmholtz (water) alone:** Method of Manufactured Solutions — expect **L² observed order $O(h^{3})$ for P2** (the H¹/energy-norm rate is one order lower, $O(h^{2})$; **measure and report the norm** so a correct H¹ rate is not misread as a failed L²); plane-wave-through-PML box (spurious reflection < −40 dB); oscillating-cylinder Hankel-function analytic field.
2. **Elastodynamics (PLA) alone:** MMS for Navier (plane strain, § 3.2); analytic P/S dispersion; rod/plate eigenfrequencies; **elastic-PML plane-wave-through-box reflection — separate P- and S-wave incidence swept to grazing, spurious reflection < −40 dB** (§ 7; PLA≈water means energy reaches the elastic boundary, so this gate is not optional).
3. **Thermoviscous (air) alone:** analytic LRF slit/tube complex wavenumber and impedance (Kirchhoff/Zwikker–Kosten) vs FLNS solve; reproduce the Stokes boundary-layer velocity profile.
4. **Fluid–solid interface — the most important coupling check:** analytic plane-wave **reflection/transmission coefficients at a fluid–solid interface vs incidence angle** (Brekhovskikh), including mode conversion to P and S and the P/S critical angles. This directly tests the "solid path" physics — if R/T and critical angles match, Path 2 is right.
5. **Cavity modes:** Bessel-function eigenmodes of a cylindrical/annular cavity — validates the resonant reverberance (Path 3) and your forced-response machinery.
6. **End-to-end:** mesh- and PML-convergence at 96 kHz; energy balance (incident = reflected + transmitted + dissipated); reciprocity (swap source/receiver). Then compare the assembled (θ, f) map to Figure 6.

> **No direct analytic oracle for the spiral thermoviscous field.** None exists for the spiral geometry; its correctness rests on the chain *verified-FLNS on canonical channels (item 3) + mesh/PML convergence (item 6) + FLNS↔SLNS agreement including a curved/cornered channel (§ 3.3)*. State this dependency explicitly in the Unit-C / Unit-E reports — the absence of a direct oracle is a known, bounded limitation, not an oversight.

---

## 12. Solver / GPU notes

Per frequency: one **complex, non-Hermitian, indefinite, large** sparse system. Practical path on the stack: (a) FLNS for truth on small canonical cases, SLNS (three scalar Helmholtz) for production — keeps it tractable; (b) matrix-free element assembly + complex sparse **direct** solve for 2D (feasible to ~10⁶ DOF), or GMRES with a shifted-Laplacian/sweeping preconditioner if iterative. Taichi/Warp suit matrix-free assembly + custom complex kernels; WebGPU/Vulkan/GLSL can assemble but will likely hand off to a CPU/GPU complex sparse solver. **Reuse the factorization across angle at fixed frequency** (§8) — the dominant speedup for the full 1° calibration map.

---

## Caveats (the real ones)

- **PLA elastic constants are not given by the paper and FDM prints are process-dependent and anisotropic.** The paper specifies PLA and the Creality K1C printer but no E, ν, or wave speeds. The published spread (E ≈ 2.0–3.4 GPa, c ≈ 1860–2260 m/s) is wide, prints are layer-anisotropic (an isotropic model is an approximation), and the **damping/loss factor — which directly sets Path-2 decay and resonance width — is poorly characterized.** These must be calibrated against your own measured samples; this is a genuine physical unknown, not a documentation gap.
- **The paper does not state the coupling model behind Figure 6 itself.** Figure 6 is captioned a "2D cross-section COMSOL Multiphysics simulation" but the text doesn't say whether that specific figure used full acoustic–structure coupling or pressure-acoustics with PLA as an impedance boundary. You are (correctly, for the three-path physics and for the outcome-#2 design goal) committing to the **full coupled model**, which may be *more* rigorous than what generated their illustration. That's fine and intended — just don't treat "matches Figure 6 qualitatively" as proof their figure used the same model.
- **The Gorilla seal-coat is acoustically present and unmodeled by default.** Two spray coats form a thin layer on the PLA with its own impedance; it's part of the real structure and will perturb signatures. Decide whether to model it as a thin coating layer or fold it into a calibrated effective PLA-surface property.
- **Helmholtz pollution at the high end.** Over the many-wavelength water box at 88–96 kHz, P2 dispersion error grows with kL (Ihlenburg). The 6–8 elements/λ and P3-in-water options above are the mitigation; always run the convergence study at 96 kHz, not at a mid-band frequency.
- **2D ≠ 3D.** A cross-section reproduces Figure 6 (which is itself 2D) but cannot capture out-of-plane scattering or the true 3D spiral; absolute levels and some mode structure will differ from 3D and from tank measurement. The paper itself notes full 3D FEA is a "several months" job — which is exactly why 2D is the right first rung.
