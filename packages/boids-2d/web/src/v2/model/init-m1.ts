// Swarm — starting flocks for the M1 scenes (The Order Dial, The Mill). The
// v4 lab's own starts stay in ./init.ts, verbatim; these are new, with the
// same mulberry32 stream and the same boid layout (pos.xy, vel.xy, align, dens).

import { mulberry32 } from "./init.js";

export type M1Init = "aligned" | "disc" | "annulus";

const M1: readonly string[] = ["aligned", "disc", "annulus"];
export const isM1Init = (m: string): m is M1Init => M1.includes(m);

export function makeInitM1(n: number, seed: number, halfW: number, halfH: number, speed: number, mode: M1Init): Float32Array<ArrayBuffer> {
  const rnd = mulberry32(seed >>> 0);
  const f = new Float32Array(n * 6);
  const TAU = Math.PI * 2;
  for (let i = 0; i < n; i += 1) {
    let x: number;
    let y: number;
    let a: number;
    if (mode === "aligned") {
      // a polarized school: anywhere in the ocean, every fish heading the same way (±0.2 rad)
      x = (rnd() * 2 - 1) * halfW;
      y = (rnd() * 2 - 1) * halfH;
      a = (rnd() * 2 - 1) * 0.2;
    } else if (mode === "disc") {
      // one school in a disc at the centre, random headings
      const rr = 0.3 * halfH * Math.sqrt(rnd());
      const th = rnd() * TAU;
      x = Math.cos(th) * rr;
      y = Math.sin(th) * rr;
      a = rnd() * TAU;
    } else {
      // a band around the centre, swimming anticlockwise (seeds a mill)
      const r0 = 0.12 * halfH;
      const r1 = 0.3 * halfH;
      const rr = Math.sqrt(r0 * r0 + rnd() * (r1 * r1 - r0 * r0));
      const th = rnd() * TAU;
      x = Math.cos(th) * rr;
      y = Math.sin(th) * rr;
      a = th + Math.PI / 2 + (rnd() * 2 - 1) * 0.3;
    }
    f[i * 6] = x;
    f[i * 6 + 1] = y;
    f[i * 6 + 2] = Math.cos(a) * speed;
    f[i * 6 + 3] = Math.sin(a) * speed;
    f[i * 6 + 4] = 0.5;
    f[i * 6 + 5] = 0;
  }
  return f;
}
