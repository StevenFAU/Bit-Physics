# boids-2d

**Category:** agent-based. **Stack:** B / WebGPU.

This package ports the `boids-v4.html` prototype into the Bit-Physics web
deployment surface as a 2D flocking lab: Reynolds rules, Vicsek-style angular
noise, live order parameters, counting-sort broadphase, device-scoped
brute-sort equivalence checks, and the v4 two-way stable-fluid coupling.

The browser app lives at `web/`. The long-form implementation contract is
`web/verification-demo-spec.md`.
