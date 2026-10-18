# 12 — Vortex Rings (Schrödinger's smoke)

> Part of [Rebuild v2](README.md). Replaces `packages/schrodinger-smoke/web`. Wave D.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

## Verdict on the prototype

- **Keep:** incompressible Schrödinger flow (Chern et al. 2016) with spectral steps; the live
  f64 reference gate on the non-chaotic translating ring at the 32³ tier, run-twice
  byte-identical, `[defaults.isf]` budget; the **WGSL builtin-trig hazard fix** (Vulkan
  only guarantees ~2⁻¹¹ for `sin`/`cos`; polynomial trig in-shader made lavapipe and RADV
  both pass); the two-spectra trap note; tracer throughput (4.19M at well over 60 fps on
  the RX 6800 XT); the scene ideas (leapfrog, collide, Hopf link, trefoil).
- **Drop:** the white blob. Millions of tracers are additively splatted into an 8-bit
  target with no tone map, so the scene clips even at minimum glow — the vortex ring, the
  whole point, is invisible. Also drop: jargon controls (`ħ (core thickness)`, `Δt`), a
  "headroom 1%" readout that reads as a brightness warning but is the phase-aliasing meter.
- **Lesson:** grid smoke cannot keep thin vortex filaments; ISF can. So the picture must
  show the filaments themselves, and the smoke must be exposed, not clipped.

## The experience

**Pitch:** *Smoke rings that leapfrog, collide and untie knots — a wavefunction as a fluid.*

**First ten seconds:** a dark tank with soft side light. Two smoke rings travel together;
the rear one shrinks, speeds up, slips through the front one, and they swap — again and
again. Thin glowing tubes trace the vortex cores inside the smoke. It is mesmerising and
legible.

**Signature moment — Untie the Knot:** a trefoil-knotted vortex. Over a few seconds it
stretches, its strands touch, *reconnect*, and it breaks into separate linked rings — the
behaviour seen in laboratory knotted-vortex experiments (Kleckner & Irvine 2013).

**Second signature — See the Phase:** a slice plane coloured by the phase of the
wavefunction. Every vortex core pierces it as a point where all colours meet. "The fluid's
velocity *is* the gradient of this phase."

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **Leapfrog** (default) | two coaxial rings | "They take turns passing through each other." |
| **Ring Cannon** | aim and fire rings at each other | "Fire two rings head-on." |
| **Untie the Knot** | trefoil vortex | "Knots in a fluid don't last. Watch how it escapes." |
| **Linked Rings** | Hopf link | "Two linked rings, swimming together." |
| **Jet** | a nozzle shedding a train of rings | "Change the pulse; change the train." |
| **The Phase** (Learn) | slice plane of phase, singularities marked | "Vortices are where the phase has no value." |

### Tools

*Ring cannon* (drag to aim; drag length sets ring size), *Kick* (the shipped impulse brush,
labelled as leaving the gated regime), *Slice* (phase / speed / vorticity plane), *Camera*
(orbit; ride a ring). Tune: *Core thickness* (ħ), *Speed*, *Resolution*.

## The model

- ISF: two-component wavefunction ψ ∈ ℂ² on a periodic grid; per step a spectral
  Schrödinger evolution (FFT), normalisation, and a pressure projection (FFT Poisson);
  velocity from ψ; tracers advected by RK2/RK4 (RK4 the paper-faithful option).
- Grids: T3 128³, T2 64³ (the shipped default), T1 48³ or 64³ at a reduced tracer count;
  3D FFT shared with heat-equation's Stockham implementation.
- **Ring generation:** phase-jump construction across a disk (as in the paper) for the
  cannon and the scripted scenes; knots and links from their analytic phase fields.
- **Vortex core extraction:** cores are where the first spinor component vanishes; compute
  |ψ₁|² on the grid, extract a thin isosurface (GPU marching cubes, or ray-march the scalar
  field directly) and render it as tubes. Colour tubes per connected component so
  reconnection events are visible as colour changes.

## The look

- Art direction: **schlieren tank**. Deep blue-black water tank with a single soft side
  light; smoke as cool white tracers with gentle density, cores as thin warm glowing tubes.
- Tracers accumulate in float with **measured exposure** (shared HDR pipeline) and are
  weighted by local tracer density, so a dense ring core never clips; AgX tone map.
- Phase slice: cyclic perceptual colour wheel on a glass plane, singularities marked with
  small rings.
- Ride-a-ring camera follows a ring's centroid; off under reduced motion.

## The proof

- Keep the `new_canonical` gate (live f64 reference of the translating ring at 32³,
  per-checkpoint, run-twice) and port the gated kernels exactly, polynomial trig included.
- **Circulation (new, measured):** circulation around a loop linking a core vs 2πħ. For a
  single-component wavefunction this is exactly quantised; ISF's two-component spinor makes
  it only approximately so (the second component is what gives cores their smooth profile),
  so the readout shows the measured value and its deviation against a declared band —
  verify the expected value against Chern's thesis before writing the card's copy.
- **Kelvin ring speed (new, analytic with a declared band):** measured ring translation
  speed vs the thin-core formula U = Γ/(4πR)·(ln(8R/a) − 1/4), with the ISF core size a set
  by ħ; the band is declared after measurement because the core model differs from the
  formula's assumptions.
- The resolution margin (formerly "headroom") moves to Learn with a plain explanation:
  how close the phase gradient is to the grid's aliasing limit.
- The Kick tool and cannon-fired scenes are labelled *outside the gated scene*.

## Performance targets

| Tier | Grid | Tracers | Target |
|---|---|---|---|
| T3 | 128³ | 4M | 60 fps (sim may run at 30 Hz with interpolated tracers) |
| T2 | 64³ | 1M | 60 fps |
| T1 | 64³ | 250k | 30 fps |

## Risks and open questions

- 128³ complex 3D FFTs (several per step) at 60 fps: measure; the shipped 64³ already runs
  well, so T3 can fall back to 96³/64³ with more tracers.
- Isosurface extraction every frame on 128³ is affordable with marching cubes into an
  indirect draw, but tube smoothness needs a small ħ-dependent threshold; tune per scene.
- Knot scenes are sensitive to resolution; verify the trefoil reconnects (rather than
  dissipating) at T2.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Shipped ISF in the shell with HDR tracers + measured exposure (no white-out); gate ported |
| M1 | Core extraction as tubes; Leapfrog and Linked Rings; circulation check in Prove |
| M2 | Ring Cannon; Untie the Knot; The Phase slice |
| M3 | Jet, Kelvin speed check, 128³ T3, posters/loops |

## References

- Chern, Knöppel, Pinkall, Schröder & Weißmann 2016, *Schrödinger's smoke*, ACM TOG 35(4)
- Chern 2017, *Fluid Dynamics with Incompressible Schrödinger Flow*, PhD thesis, Caltech — [thesis](https://thesis.library.caltech.edu/10278/)
- Chern, Knöppel, Pinkall & Schröder 2017, *Inside fluids: Clebsch maps for visualization and processing*, ACM TOG 36(4)
- Kleckner & Irvine 2013, *Creation and dynamics of knotted vortices*, Nature Physics 9
- Prior art: a Unity/compute-shader ISF implementation with interacting rings exists; no browser implementation was found in this research (verify before claiming "first browser ISF")
