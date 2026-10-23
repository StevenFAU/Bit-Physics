// Starting fields for "On a Shape", built from the surface's own geometry so
// they are round on the shape (not stretched by its parameterisation), and
// deterministic from the seed: a share link reproduces them exactly.

import { HashStream } from "@bp/runtime";
import type { Field } from "./ic.js";
import type { ModelDef } from "./models.js";
import type { SurfaceMesh } from "./surface-mesh.js";

export type SurfaceStart = "seeds" | "noise" | "fronts";

const unitVec = (r: HashStream): [number, number, number] => {
  const z = r.range(-1, 1);
  const t = r.range(0, 2 * Math.PI);
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(t), s * Math.sin(t), z];
};

export function surfaceField(m: SurfaceMesh, model: ModelDef, start: SurfaceStart, seed: number): Field {
  const out = new Float32Array(m.cells * 2);
  const rnd = new HashStream(seed, 6);
  const noise = start === "noise" ? 0.05 : 1e-3;
  for (let c = 0; c < m.cells; c += 1) {
    out[c * 2] = model.rest[0] + (rnd.next() - 0.5) * noise;
    out[c * 2 + 1] = model.rest[1] + (rnd.next() - 0.5) * noise;
  }
  const P = (c: number): [number, number, number] => [m.pos[c * 4]! * m.scale, m.pos[c * 4 + 1]! * m.scale, m.pos[c * 4 + 2]! * m.scale];
  if (start === "seeds") {
    // round seed discs around hashed cells, about one per 2500 model units² of surface
    const total = m.area.reduce((a, b) => a + b, 0);
    const count = Math.max(3, Math.round(total / 2500));
    const centres = Array.from({ length: count }, () => P(Math.floor(rnd.next() * m.cells)));
    for (let c = 0; c < m.cells; c += 1) {
      const p = P(c);
      for (const q of centres) {
        if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 4.5) {
          out[c * 2] = model.seed[0];
          out[c * 2 + 1] = model.seed[1];
        }
      }
    }
  } else if (start === "fronts") {
    // broken fronts: a band across half of a few great circles fires, with a
    // refractory band behind it, so each free end curls into a spiral
    const fronts = Array.from({ length: 4 }, () => ({ a: unitVec(rnd), b: unitVec(rnd) }));
    for (let c = 0; c < m.cells; c += 1) {
      const p = P(c);
      const u = [m.pos[c * 4]!, m.pos[c * 4 + 1]!, m.pos[c * 4 + 2]!];
      for (const { a, b } of fronts) {
        const side = u[0]! * b[0] + u[1]! * b[1] + u[2]! * b[2];
        if (side < 0.15) continue;
        const d = p[0] * a[0] + p[1] * a[1] + p[2] * a[2];
        if (d > -3 && d < 3) out[c * 2] = 1;
        else if (d >= 3 && d < 16) out[c * 2 + 1] = model.rest[1] + 0.75;
      }
    }
  }
  return out;
}
