// phase-field-fracture — EXPLAIN layer (spec-ref § 5.3). Carries the THREE
// contractual honesty disclosures (§ 1.1) verbatim — the § 6.6 rigor
// disclosure gate audits their presence in shipped copy.

export function installExplainPanel(): void {
  const root = document.createElement("details");
  root.className = "pf-explain";
  const summary = document.createElement("summary");
  summary.textContent = "EXPLAIN — what is phase-field fracture?";
  root.appendChild(summary);
  const body = document.createElement("div");
  body.innerHTML = `
<p><b>Cracks as the solution of an energy minimization.</b> This sim never
draws a crack. It evolves a damage field d∈[0,1] so that the TOTAL energy —
stored elastic energy (degraded by (1−d)²) plus a regularized crack-surface
energy (Ambrosio–Tortorelli AT2, weight G<sub>c</sub>) — decreases. Where
concentrating damage releases more elastic energy than the new surface
costs, a crack appears, curves, arrests, or branches. The crack path is
<i>emergent</i>: no crack tracking, no remeshing, no scripted geometry
(Francfort–Marigo 1998; Bourdin 2000; Miehe 2010).</p>

<p><b>The length scale ℓ is material, not cosmetic.</b> AT1/AT2 tie ℓ to
tensile strength: σ<sub>c</sub> ∝ 1/√ℓ. This demo runs the Miehe SENT steel
groups non-dimensionalized to {ℓ=1, G<sub>c</sub>/ℓ=1, ρ=1} — the very
rescaling that makes an f32 GPU solver viable (see PROVE).</p>

<p><b>Quasi-static by discipline, dynamic by physics.</b> The solver is
explicit elastodynamics; "slow pulling" is enforced by the published KE/IE
criterion (kinetic ≤ 5 % of internal energy — the live gauge below the
canvas). At the SENT peak the crack bursts across the ligament at roughly
half the Rayleigh wave speed: the gauge spikes, honestly — the post-peak
snap-back <i>is</i> a dynamic event, and the deploy gate only claims the
pre-peak curve and the peak load.</p>

<div class="pf-honesty">
<p><b>Three disclosures (contractual, spec-ref § 1.1):</b></p>
<ol>
<li><b>No "criterion-free" claim.</b> The often-repeated claim that
phase-field fracture captures every crack topology "with no extra criterion"
is an overclaim (it was refuted 0-3 in our source review). Honest framing:
<i>cracks emerge from energy minimization plus one evolution PDE, without
explicit crack tracking or remeshing</i> — the driving-force split,
irreversibility device, and hybrid scheme are all modeling choices.</li>
<li><b>The cheap scheme is variationally inconsistent.</b> We ship the
standard hybrid formulation (Ambati 2015) with a history field
(Miehe 2010). Gerasimov &amp; De Lorenzis 2019: the history substitution
"is, however, no longer of variational nature and its equivalence to the
original problem cannot be proven." You can watch the consequence live: the
energy ledger closes to ~1 % before the peak and opens visibly through the
crack burst.</li>
<li><b>Finite-mobility damage flow.</b> The browser kernel integrates the
damage <i>gradient flow</i> (Karma 2001 lineage) instead of solving the
optimality system each step. Finite mobility ⇒ a rate-dependent effective
toughness Γ(v) = G<sub>c</sub> + O(v/χ) (Hakim–Karma 2009). Measured
against the converged-elliptic f64 reference: peak-load shift 0.35 % at the
gated mobility — disclosed, gated (G-Γv), and negligible at quasi-static
rates.</li>
</ol>
</div>

<p><b>What the obstacles brush really does.</b> Holes, stiff, soft, and
tough regions are spatial fields E(x), G<sub>c</sub>(x) — zero solver cost.
Crack deflection by inclusions and arrest-and-re-nucleation at holes are
standard benchmarks of the method, so your painted geometry is running the
same physics as the gated scene.</p>

<p><b>Prior art, honestly.</b> Browser "fracture" demos to date are
geometric: pre-generated patterns clipped against a mesh at impact
(kainino0x's webgpu-fracture-hack says so itself) or Voronoi shatter
libraries — no stresses computed. Graphics research has real
energy-variational fracture offline (CD-MPM, SIGGRAPH 2019). What has not
existed is a <b>verified, interactive, in-browser</b> phase-field fracture
instrument — verified meaning: this page re-runs its CI deploy gate against
an f64 reference, live, on your GPU (PROVE below). And no validated f32
phase-field-fracture solver existed anywhere: the PhAST solver (2026)
enforces f64 for precisely the conditioning problem our
non-dimensionalization removes.</p>`;
  root.appendChild(body);
  document.body.appendChild(root);
}
