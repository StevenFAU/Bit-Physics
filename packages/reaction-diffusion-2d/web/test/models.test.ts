// The extra models' CPU mirror (src/v2/model/models.ts) against the committed
// f64 goldens written by reaction_diffusion_2d/reference/goldens.py: the same
// canonical starting field (sha256 of its f64 bytes), the same parameters as
// the model registry, and the same final state within the declared
// mirror tolerance (tolerance.toml [golden_tolerance.continuous-ca.reaction-diffusion-2d]).

import { describe, expect, it } from "vitest";
import type { ModelId } from "../src/v2/model/models.js";
import { MODELS, canonicalField, stepCpu } from "../src/v2/model/models.js";
import V from "../src/generated/verification.json";

// the committed goldens, loaded through Vite (sidecars as JSON, payloads inlined as base64)
const sidecars: Golden[] = Object.entries(import.meta.glob<Golden>("../public/goldens/*.json", { eager: true, import: "default" }))
  .filter(([path]) => !path.includes("/turing-"))
  .map(([, g]) => g);
const payloads = import.meta.glob<string>("../public/goldens/*.bin", { eager: true, query: "?inline", import: "default" });

function payload(descriptor: string): Float64Array {
  const entry = Object.entries(payloads).find(([path]) => path.endsWith(`/${descriptor}.bin`));
  if (!entry) throw new Error(`no payload for ${descriptor}`);
  const bin = atob(entry[1].slice(entry[1].indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Float64Array(bytes.buffer);
}

interface Golden {
  descriptor: string;
  model: ModelId;
  grid: [number, number];
  steps: number;
  params: { F: number; k: number; c: number; Du: number; Dv: number; dx: number; dt: number };
  ic: { seed: number; amp: number; bump: number; bits: number; rest: [number, number]; seed_state: [number, number] };
  ic_sha256: string;
  final_sha256: string;
}

async function sha(a: Float64Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(a.buffer as ArrayBuffer, a.byteOffset, a.byteLength)));
  return `sha256:${Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

describe("model goldens", () => {
  it("one golden per extra model", () => {
    expect(sidecars.map((g) => g.model).sort()).toEqual(["brusselator", "fitzhugh-nagumo", "gierer-meinhardt"]);
  });

  for (const g of sidecars) {
    describe(g.descriptor, () => {
      const m = MODELS[g.model];
      it("the registry carries the golden's parameters and states", () => {
        expect([m.p[0], m.p[1], m.c, m.Du, m.Dv, m.dx, m.dt]).toEqual([g.params.F, g.params.k, g.params.c, g.params.Du, g.params.Dv, g.params.dx, g.params.dt]);
        expect([...m.rest]).toEqual(g.ic.rest);
        expect([...m.seed]).toEqual(g.ic.seed_state);
      });

      it("the canonical starting field is byte-identical to the reference's, and exact in f32", async () => {
        const f = canonicalField(m, g.grid[0], g.grid[1], g.ic);
        expect(await sha(f)).toBe(g.ic_sha256);
        expect(Float64Array.from(Float32Array.from(f))).toEqual(f);
      });

      it("the f64 CPU mirror reproduces the golden within the declared mirror tolerance", async () => {
        const f = canonicalField(m, g.grid[0], g.grid[1], g.ic);
        stepCpu({ model: g.model, w: g.grid[0], h: g.grid[1], ...g.params }, f, g.steps);
        const ref = payload(g.descriptor);
        let worst = 0;
        for (const ch of [0, 1]) {
          let maxAbs = 0;
          let maxRef = 0;
          for (let i = ch; i < ref.length; i += 2) {
            maxAbs = Math.max(maxAbs, Math.abs(f[i]! - ref[i]!));
            maxRef = Math.max(maxRef, Math.abs(ref[i]!));
          }
          worst = Math.max(worst, maxAbs / maxRef);
        }
        expect(worst).toBeLessThanOrEqual(V.models.tolerance.mirror_rel);
        if (V.models.tolerance.mirror_rel === 0) expect(await sha(f)).toBe(g.final_sha256);
      });
    });
  }
});
