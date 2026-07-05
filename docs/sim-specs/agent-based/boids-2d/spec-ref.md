# Boids 2D Spec Reference

## 1. Scope

`boids-2d` is a Stack-B WebGPU simulation for 2D flocking and active-matter
observables. It ports the project-local `boids-v4.html` prototype into the
standard web deployment surface.

## 2. Model

Agents carry position and velocity on a periodic 2D domain. The visible model
combines Reynolds separation, alignment, and cohesion with Vicsek-style angular
noise. The demo reports polarization, normalized angular momentum, correlation
length, susceptibility, nearest-neighbor structure, and fluid-field statistics.

## 3. Verification Posture

The shipped page contains the v4 in-page proof rows: deterministic reference-rule
checks, counting-sort scan/permutation checks, trajectory hashes, brute-sort
device-scoped equality on the single-species metric path, fixed-point saturation
reporting, and coupled-fluid rows for gate, exchange, projection, MMS order,
advection stability, and coupled hashes.

The browser deploy gate uses a smaller deterministic capture emitted through the
standard `exposeCapture` hook. It is intentionally an observable/new-canonical
gate, not a replacement for the heavy in-page GPU proof suite.

## 4. Fluid Coupling

The v1 fluid path is the v4 drag-coupled stable-fluid medium: agents sample a
periodic Eulerian velocity field, exchange equal-and-opposite fixed-point
momentum with the field, and the field runs a stable-fluids solve with
projection. It is a wet-inspired active medium, not a full stresslet or
biological suspension model.
