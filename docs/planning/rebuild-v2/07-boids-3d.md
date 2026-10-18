# 07 — Murmuration (3D starlings)

> Part of [Rebuild v2](README.md). Replaces `packages/boids-3d/web` (Murmuration Lab).
> Wave B. Status: planning, v0.1, 2026-10-17. Unmeasured targets.

## Verdict on the prototype

The July rebuild spec ([feature-expansion-spec.md](../../../packages/boids-3d/web/feature-expansion-spec.md))
got the science right — topological neighbours (k ≈ 7), a separate one-neighbour avoidance,
bank-coupled flight, roost attraction, propagating threat response — and the shipped lab
implements much of it at 32k birds and 60 fps. What fails is the **picture**:

- Birds render as dim blue specks on a dark field with a muddy red smear; there is no
  contrast, so the flock's density — the thing people recognise — is invisible.
- No sense of scale or place: no horizon, no ground, no sky.
- Tools and cinematography live in a dropdown panel; the falcon is a mode, not a character.
- **Keep:** the model and its spec, the counting-sort grid with brute oracle, GPU
  observables without readback, the legacy Reynolds canonical as a regression path, the
  lavapipe observable-gate posture.

## The experience

**Pitch:** *A dusk sky, a hundred thousand starlings, and a falcon you fly.*

**First ten seconds:** standing in a reed bed at sunset. The sky is a bright gradient from
amber to violet; a dark cloud of birds pulses and folds above the horizon, thickening to
near-black where it turns, thinning to lace at the edges. Wind in the reeds. No UI but a
quiet title.

**Signature moment — The Falcon:** press F and you are the falcon, a small dark shape you
steer with the pointer (or WASD). Diving at the flock tears a dark wave through it; the
flock splits around you and heals behind. The escape wave propagating away from the attack
point is the money shot.

**The story (default scene director, ~3 minutes, loops):** small groups arrive and merge →
the murmuration displays and grows → a falcon attack (auto, if the visitor hasn't
attacked) → the sun sets further, the sky deepens → the flock descends in a funnel into the
reeds and the sky is empty → birds rise again. Never settles; every phase is natural.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **Dusk** (default) | 100k birds, the story director | "Watch, or press F to hunt." |
| **The Attack** | falcon-focused, replays an attack from a saved state | "Where does the wave start? Where does it go?" |
| **Ride Along** | camera inside the flock, following one bird | "Seven neighbours. That's all it sees." |
| **Rules Lab** | split screen: topological vs metric neighbours | "Same birds, different rule. Which looks real?" |
| **Couzin States** | swarm → torus → parallel as zones change | "Turn the dial: a ball, a ring, a river." |
| **Roost** | the descent into the reeds, slowed | "How do 100k birds land at once?" |

### Tools

*Falcon* (fly it), *Gust* (paint wind), *Watch one* (follow a bird; shows its 7 neighbours
as faint lines), *Camera* (ground / orbit / ride), *Time of day* (sun angle).

## The model

- Keep `starling-topological-v1` from the July spec: kSocial = 7, kAvoid = 1, blind rear
  cone, max turn rate, bank-coupled turning, cruise-speed relaxation, altitude preference
  over a roost, reaction delay, threat state with propagation and refractory time.
- Falcon: a kinematic agent with speed and turn limits (player-controlled or scripted);
  birds within detection range enter the alarmed state; alarm propagates by neighbour
  contact, not by global broadcast (Attanasi et al. 2014).
- Roost descent: a time-varying roost attractor plus a landing state (birds that reach the
  reed band below a height are parked and fade; they re-enter on rise).
- Neighbour search: counting-sort grid, exact k-nearest within a cap (from the July spec),
  brute oracle for small N.

## The look

The flock is rendered **as a medium**, not as dots:

- **Far field:** each bird contributes projected coverage to a float *optical depth*
  buffer (an anti-aliased splat sized to its projected wingspan, minimum sub-pixel
  coverage preserved). The sky is composited through transmittance `exp(−τ)`, so dense
  regions go near-black and edges become lace — exactly how murmurations look, with no
  aliasing or popping.
- **Near field** (< ~40 m): instanced low-poly birds with procedural wingbeat and bank,
  dark silhouette shading with a faint rim light from the sky.
- **Sky:** analytic dusk sky (sun below the horizon, Rayleigh/Mie-style gradient), a
  high cirrus noise layer lit from below, haze towards the horizon.
- **Ground:** silhouetted reeds/trees/pier in the foreground (procedural or a small SVG
  set), slight parallax; optional water reflection of the sky.
- Motion blur on near birds only; no bloom. Colour palette is the sky's — chrome stays
  neutral and minimal (Dusk shows only a title and the transport).
- Audio (opt-in): wind bed; a soft whoosh when the flock passes near the camera.

## The proof

- Keep the existing gates (legacy Reynolds canonical; the shipped lab's observable gate on
  lavapipe) and port the gated kernels exactly.
- Keep the in-page grid ≡ brute neighbour identity for small N.
- Observables (shown in Learn, not gated): polarization, milling, flock thickness/aspect,
  nearest-neighbour distance, alarm propagation speed (measured from the attack point),
  compared qualitatively with the cited field results and labelled *model behaviour*.

## Performance targets

| Tier | Birds | Target |
|---|---|---|
| T3 | 100,000 | 60 fps (sim + optical-depth render) |
| T2 | 32,000 | 60 fps |
| T1 | 10,000 | 30–60 fps |

## Risks and open questions

- Optical-depth splatting must keep total coverage stable as birds move between pixel
  footprints, or the flock flickers; test with a slow camera dolly.
- The story director must never fight the visitor: any input pauses scripted events for
  a minute.
- Foreground silhouettes need a licence-clean source (procedural preferred).

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Existing model in the shell with the sky, ground and optical-depth flock; gates ported |
| M1 | Falcon as a playable agent with alarm propagation; near-field instanced birds |
| M2 | Story director (arrival → display → attack → roost); Ride Along; Watch one |
| M3 | Rules Lab, Couzin States, audio, posters/loops |

## References

- Ballerini et al. 2008, *Interaction ruling animal collective behavior depends on topological rather than metric distance*, PNAS — [PMC2234121](https://pmc.ncbi.nlm.nih.gov/articles/PMC2234121/)
- Hildenbrandt, Carere & Hemelrijk 2010, *Self-organized aerial displays of thousands of starlings* — [arXiv:0908.2677](https://arxiv.org/abs/0908.2677)
- Attanasi et al. 2014, *Information transfer and behavioural inertia in starling flocks*, Nat. Phys. — [PMC4173114](https://pmc.ncbi.nlm.nih.gov/articles/PMC4173114/)
- Papadopoulou et al. 2026, *Mechanisms driving collective escape patterns in starling flocks* (preprint) — [bioRxiv 2024.10.27.620514](https://www.biorxiv.org/content/10.1101/2024.10.27.620514.full.pdf)
- Couzin et al. 2002, *Collective memory and spatial sorting in animal groups*, J. Theor. Biol. 218
