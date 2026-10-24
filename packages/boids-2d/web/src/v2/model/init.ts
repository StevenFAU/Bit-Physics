// Swarm — starting flocks. makeInitData is the v4 lab's (packages/boids-2d/
// web/index.html), with its two globals (S.maxSpeed, S.initMode) made
// arguments: the same mulberry32 stream, the same draws in the same order,
// stored through a Float32Array as v4 stores them. Boid stride 6 f32:
// pos.xy, vel.xy, align, dens.

export type InitMode = "random" | "seed" | "two" | "ring" | "line" | "lattice";

export const BOID_FLOATS = 6;
export const BOID_BYTES = BOID_FLOATS * 4;

// v4: function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;...}}
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeInitData(
  n: number,
  seed: number,
  halfW: number,
  halfH: number,
  maxSpeed: number,
  mode: InitMode = "random",
): Float32Array<ArrayBuffer> {
  const rnd = mulberry32(seed >>> 0);
  const f = new Float32Array(n * 6);
  const TAU = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    let x: number, y: number, vx: number, vy: number;
    const a = rnd() * TAU,
      sp = maxSpeed * (0.45 + 0.55 * rnd());
    if (mode === "seed") {
      // single dense seed blob at center, random headings
      const rr = 0.12 * halfH * Math.sqrt(rnd()),
        th = rnd() * TAU;
      x = Math.cos(th) * rr;
      y = Math.sin(th) * rr;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
    } else if (mode === "two") {
      // two colliding flocks, converging headings
      const left = i < n / 2;
      const cx = left ? -halfW * 0.55 : halfW * 0.55;
      x = cx + (rnd() * 2 - 1) * halfW * 0.22;
      y = (rnd() * 2 - 1) * halfH * 0.5;
      const dir = left ? 0 : Math.PI,
        jit = (rnd() * 2 - 1) * 0.25;
      vx = Math.cos(dir + jit) * maxSpeed;
      vy = Math.sin(dir + jit) * maxSpeed;
    } else if (mode === "ring") {
      // ring of agents, tangential velocities (seeds a mill)
      const th = (i / n) * TAU + (rnd() * 2 - 1) * 0.03,
        rr = halfH * 0.62;
      x = Math.cos(th) * rr;
      y = Math.sin(th) * rr;
      vx = -Math.sin(th) * maxSpeed;
      vy = Math.cos(th) * maxSpeed;
    } else if (mode === "line") {
      // horizontal line, all heading up
      x = ((i / n) * 2 - 1) * halfW * 0.9;
      y = (rnd() * 2 - 1) * 0.02 * halfH;
      vx = (rnd() * 2 - 1) * 0.1 * maxSpeed;
      vy = maxSpeed;
    } else if (mode === "lattice") {
      // square lattice, tiny random drift
      const cols = Math.max(1, Math.round(Math.sqrt((n * halfW) / halfH))),
        r = Math.floor(i / cols),
        c = i % cols;
      const rows = Math.ceil(n / cols);
      x = (((c + 0.5) / cols) * 2 - 1) * halfW * 0.92;
      y = (((r + 0.5) / rows) * 2 - 1) * halfH * 0.92;
      vx = Math.cos(a) * sp * 0.3;
      vy = Math.sin(a) * sp * 0.3;
    } else {
      // random (default)
      x = (rnd() * 2 - 1) * halfW;
      y = (rnd() * 2 - 1) * halfH;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
    }
    f[i * 6 + 0] = x;
    f[i * 6 + 1] = y;
    f[i * 6 + 2] = vx;
    f[i * 6 + 3] = vy;
    f[i * 6 + 4] = 0.5;
    f[i * 6 + 5] = 0.0;
  }
  return f;
}
