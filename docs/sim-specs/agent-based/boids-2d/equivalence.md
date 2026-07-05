# Equivalence

`boids-2d` has two equivalence surfaces.

The in-page WebGPU suite compares brute-force and counting-sort broadphase paths
on the same adapter and seed. That is the exact device-scoped equivalence claim.

The web-deploy gate checks the browser-emitted observable capture for run-twice
identity, bounded order parameters, speed clamps, and a Vicsek noise-response
trend. This keeps deployment fast while the heavier GPU proof remains available
inside the app.
