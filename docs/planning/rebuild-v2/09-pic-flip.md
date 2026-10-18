# 09 — Wave Tank (PIC / FLIP / APIC)

> Part of [Rebuild v2](README.md). Replaces `packages/pic-flip/web`. Wave C.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

## Verdict on the prototype

- **Keep:** APIC with the PIC/FLIP/APIC switch as the signature control; the masked
  free-surface Poisson; the exact-rational closed-form goldens (Props 5.1/5.4/5.5); the
  on-device atomic == lexicographic-oracle transfer identity; the robust-observable web gate
  at the 12³ tier with the `picflip-observable` budget; drift compensation and push-apart
  as honest, toggleable fixes.
- **Drop:** a 40³ box whose default view is a thin teal slab under a floor grid seen from
  below; ten scene chips; the claim *"the first browser APIC fluid"* until verified — a
  WebGL 3D PIC/FLIP demo (David Li, 2016) already exists, so "first FLIP" is false and
  "first APIC" needs checking.
- **Lesson:** FLIP is what film studios use for *big* water. A small box hides everything
  that makes it the industry standard: breaking waves, spray, foam, scale.

## The experience

**Pitch:** *Make waves in a tank and watch them break — with spray, foam, and the transfer
scheme you can switch live.*

**First ten seconds:** a long glass wave flume seen from a low three-quarter angle. A paddle
at the far end pushes a train of waves down the tank; they steepen over a sloped beach,
curl and break, throwing spray and leaving lines of foam that drift back. It is loud
visually and calm in palette — slate water, white foam, pale beach.

**Signature moment — Switch the Physics:** a three-way switch *PIC · FLIP · APIC* in the
transport bar. On PIC the waves go syrupy and die; on FLIP the surface fizzes with noise;
on APIC the breaking crest keeps its curl. Split-screen mode runs two schemes side by side
from the same state.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **The Flume** (default) | paddle + beach slope | "Make bigger waves. Make them break." |
| **Harbour** | breakwater, pier pilings, a moored box | "Protect the harbour." |
| **Rogue Wave** | focused wave group (dispersive focusing) | "Many small waves become one huge one." |
| **Spinning Bucket** | rotating disk of fluid; angular-momentum plot per scheme | "Which scheme keeps the spin?" |
| **Dam Break** | the classic, kept as the comparison benchmark | "The textbook test, three ways." |
| **Ripple Tank** (Learn) | small-amplitude waves; wavelength vs frequency readout | "Measure a wave. Check the theory." |

### Tools

*Paddle* (amplitude and period; drag to push by hand), *Drop* (a block or sphere),
*Wall* (place breakwater blocks), *Probe* (velocity, pressure, surface height at a point;
a wave gauge plots height vs time), *Camera* (orbit; ride a wave).

## The model

- 3D MAC grid, particles carry velocity and the APIC affine matrix C; P2G with fixed-point
  atomics (the shipped deterministic transfer), G2P with PIC/FLIP blend or APIC.
- **Pressure:** multigrid-preconditioned CG (MGPCG, McAdams et al. 2010) on the masked
  free-surface domain — the shipped RBGS+SOR does not converge at the new grid sizes.
  The multigrid code is shared with Plume.
- **Moving boundaries:** the paddle and placed objects as solid cells with prescribed
  velocity in the Poisson boundary conditions; dropped objects as one-way (scripted) or
  simple two-way rigid bodies (stretch).
- **Narrow-band FLIP** (Ferstl et al. 2016): particles only within a band of the surface;
  the deep interior is represented by the grid and a level set, cutting particle count
  several-fold for a long tank.
- **Whitewater:** spray, foam and bubble diffuse particles emitted from trapped-air, wave
  crest and kinetic-energy potentials (Ihmsen et al. 2012), advected by the grid velocity,
  classified by height relative to the surface; render-only.
- Grids (target): T3 192×64×64 + ~1.5M band particles + ~1M diffuse; T2 128×48×48;
  T1 96×32×32.

## The look

- Art direction: **coastal research lab**. A glass flume on a dark floor, cool overcast
  light, a pale concrete beach. Water absorbs to slate green with depth; foam is
  near-white, spray is fine and backlit.
- Surface via `LiquidSurface` (narrow-range filter tuned for FLIP's noisier particles,
  plus per-particle anisotropy where affordable); M3 evaluates a smoothed level-set
  ray-march for a cleaner large surface.
- Foam as a texture-space layer (density splats with lifetime fade); spray as tiny motion-
  blurred points; bubbles as faint specks under the surface.
- Split-screen and the PIC/FLIP/APIC switch use a consistent label colour per scheme.

## The proof

- Keep the `new_canonical` gate (robust-observable reproduction at the 12³ tier, closed-
  form golden suite, transfer identity, run-twice) and port the gated kernels exactly.
- **Linear wave dispersion (new analytic gate):** small-amplitude paddle waves; measured
  wavelength at the gauge vs the exact relation ω² = g k tanh(k h), within a declared
  tolerance. One of the cleanest analytic checks a free-surface solver can pass.
- **Angular momentum (Spinning Bucket):** APIC conserves it in the transfers (Jiang et al.
  2015); the plot shows APIC flat, PIC decaying — measured each run.
- **Volume:** liquid volume drift over a 5-minute run, live.
- Copy rule: "first" claims only after the verification note above is resolved.

## Performance targets

| Tier | Grid | Band particles | Target |
|---|---|---|---|
| T3 | 192×64×64 | ~1.5M | 60 fps |
| T2 | 128×48×48 | ~500k | 60 fps |
| T1 | 96×32×32 | ~150k | 30 fps |

## Risks and open questions

- MGPCG on WebGPU (no global sync inside a dispatch) costs several dispatches per V-cycle;
  measure iterations × dispatch overhead early (M0 spike, shared with Plume).
- Narrow-band FLIP adds a level-set reinitialisation step and band maintenance; ship the
  dense-particle version first if the band slips.
- Breaking waves need enough resolution near the crest; check the beach slope and paddle
  stroke that produce plunging breakers at T2, not only T3.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Shipped APIC kernels in the shell; MGPCG spike measured; gate ported |
| M1 | The Flume (paddle, beach) with `LiquidSurface`; Ripple Tank dispersion gate |
| M2 | Whitewater; scheme switch + split-screen; Spinning Bucket |
| M3 | Narrow band; Harbour; Rogue Wave; posters/loops |

## References

- Zhu & Bridson 2005, *Animating sand as a fluid*, SIGGRAPH (PIC/FLIP for graphics)
- Jiang et al. 2015, *The affine particle-in-cell method*, ACM TOG 34(4)
- McAdams, Sifakis & Teran 2010, *A parallel multigrid Poisson solver for fluids simulation on large grids*, SCA
- Ferstl et al. 2016, *Narrow band FLIP for liquid simulations*, Computer Graphics Forum 35(2)
- Ihmsen et al. 2012, *Unified spray, foam and air bubbles for particle-based fluids*, The Visual Computer 28
- David Li, *Fluid Particles* (2016, WebGL PIC/FLIP; prior art) — [github.com/dli/fluid](https://github.com/dli/fluid)
- Müller, *Ten Minute Physics 18: FLIP water in the browser* — [demo](https://matthias-research.github.io/pages/tenMinutePhysics/18-flip.html)
