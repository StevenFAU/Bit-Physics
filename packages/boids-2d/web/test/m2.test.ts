// Swarm M2 (03-boids-2d.md): the pure pieces behind Current and Food Chain.
// The incompressibility argument is checked here in f64 — the exact curl of
// bilinear ψ has no divergence inside a cell and no jump in normal flow
// across an edge; central differences of a central-difference curl cancel —
// and the GPU solver's index conventions (the Stockham FFT passes, the
// Laplacian's eigenvalues, ψ̂ = ω̂ / λ) are mirrored on the CPU against a
// direct DFT. GPU behaviour is checked in the browser (v2-acceptance.mjs and
// the page's Prove cards).

import { describe, expect, it } from "vitest";
import seaWgsl from "../src/v2/render/sea.wgsl?raw";
import { kolmogorovOmega, tideForce } from "../src/v2/model/current.js";
import { FOOD_CHAIN, SHARK_A, SHARK_BYTES, WGSL_CENSUS, plankton0, sharks0 } from "../src/v2/model/ecology.js";
import { CURRENT_FLUID, bilinearCurl, dispersionIndex, fluidGrid, laplacianSymbol, makeMotes, twiddles } from "../src/v2/model/fluid.js";
import { CURRENT_COUNTS, FOOD_COUNTS, SCENES, sceneById } from "../src/v2/scenes.js";

/** A deterministic pseudo-random field. */
function field(n: number, seed: number): Float64Array {
  let s = seed >>> 0;
  return Float64Array.from({ length: n }, () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  });
}

/** The WGSL fftPass, one pass, in f64 (complex as [re, im] pairs) along one line of length n. */
function stockhamPass(src: Float64Array, n: number, ns: number, dir: number): Float64Array {
  const dst = new Float64Array(2 * n);
  const tw = twiddles(n);
  const half = n / 2;
  for (let j = 0; j < half; j += 1) {
    const a0 = [src[2 * j]!, src[2 * j + 1]!];
    const a1 = [src[2 * (j + half)]!, src[2 * (j + half) + 1]!];
    const k = j % ns;
    const m = k * (half / ns);
    const w = [tw[2 * m]!, dir * tw[2 * m + 1]!];
    const b = [a1[0]! * w[0]! - a1[1]! * w[1]!, a1[0]! * w[1]! + a1[1]! * w[0]!];
    const d = Math.floor(j / ns) * ns * 2 + k;
    dst[2 * d] = a0[0]! + b[0]!;
    dst[2 * d + 1] = a0[1]! + b[1]!;
    dst[2 * (d + ns)] = a0[0]! - b[0]!;
    dst[2 * (d + ns) + 1] = a0[1]! - b[1]!;
  }
  return dst;
}

function stockham(x: Float64Array, n: number, dir: number): Float64Array {
  let a = x;
  for (let ns = 1; ns < n; ns *= 2) a = stockhamPass(a, n, ns, dir);
  return a;
}

function dft(x: Float64Array, n: number, dir: number): Float64Array {
  const out = new Float64Array(2 * n);
  for (let k = 0; k < n; k += 1) {
    for (let t = 0; t < n; t += 1) {
      const ang = (dir * 2 * Math.PI * k * t) / n;
      out[2 * k] += x[2 * t]! * Math.cos(ang) - x[2 * t + 1]! * Math.sin(ang);
      out[2 * k + 1] += x[2 * t]! * Math.sin(ang) + x[2 * t + 1]! * Math.cos(ang);
    }
  }
  return out;
}

/** 2D DFT of a real field (row-major gw × gh), as the GPU does it: along x, then along y. */
function dft2(re: Float64Array, im: Float64Array, gw: number, gh: number, dir: number): [Float64Array, Float64Array] {
  const R = Float64Array.from(re);
  const I = Float64Array.from(im);
  for (let j = 0; j < gh; j += 1) {
    const line = new Float64Array(2 * gw);
    for (let i = 0; i < gw; i += 1) {
      line[2 * i] = R[j * gw + i]!;
      line[2 * i + 1] = I[j * gw + i]!;
    }
    const o = stockham(line, gw, dir);
    for (let i = 0; i < gw; i += 1) {
      R[j * gw + i] = o[2 * i]!;
      I[j * gw + i] = o[2 * i + 1]!;
    }
  }
  for (let i = 0; i < gw; i += 1) {
    const line = new Float64Array(2 * gh);
    for (let j = 0; j < gh; j += 1) {
      line[2 * j] = R[j * gw + i]!;
      line[2 * j + 1] = I[j * gw + i]!;
    }
    const o = stockham(line, gh, dir);
    for (let j = 0; j < gh; j += 1) {
      R[j * gw + i] = o[2 * j]!;
      I[j * gw + i] = o[2 * j + 1]!;
    }
  }
  return [R, I];
}

/** The GPU's solve, in f64: ψ̂ = ω̂ / λ (the zero mode dropped), back-transformed. */
function solvePsi(omega: Float64Array, gw: number, gh: number, hx: number, hy: number): Float64Array {
  const lx = laplacianSymbol(gw, hx);
  const ly = laplacianSymbol(gh, hy);
  const [R, I] = dft2(omega, new Float64Array(gw * gh), gw, gh, -1);
  for (let q = 0; q < gh; q += 1) {
    for (let p = 0; p < gw; p += 1) {
      const k = q * gw + p;
      const l = lx[p]! + ly[q]!;
      R[k] = l > 0 ? R[k]! / l : 0;
      I[k] = l > 0 ? I[k]! / l : 0;
    }
  }
  const [r] = dft2(R, I, gw, gh, 1);
  return r.map((v) => v / (gw * gh));
}

describe("Current's water: the FFT and the solve (CPU mirror of the WGSL)", () => {
  // the twiddles and eigenvalues are f32 tables (as on the GPU), so agreement is to f32 precision
  it("the Stockham passes give the DFT, forward and inverse, in natural order", () => {
    for (const n of [2, 8, 16, 64]) {
      const x = field(2 * n, n);
      const a = stockham(x, n, -1);
      const b = dft(x, n, -1);
      for (let k = 0; k < 2 * n; k += 1) expect(Math.abs(a[k]! - b[k]!)).toBeLessThan(1e-6);
      const back = stockham(a, n, 1);
      for (let k = 0; k < 2 * n; k += 1) expect(Math.abs(back[k]! / n - x[k]!)).toBeLessThan(1e-7);
    }
  });

  it("λ is the 5-point Laplacian's own eigenvalue, so ψ = ω / λ solves the grid's ∇²ψ = −ω exactly", () => {
    const gw = 16;
    const gh = 8;
    const hx = 0.3;
    const hy = 0.25;
    const om = field(gw * gh, 11);
    const mean = om.reduce((a, v) => a + v, 0) / om.length;
    for (let k = 0; k < om.length; k += 1) om[k] -= mean;
    const psi = solvePsi(om, gw, gh, hx, hy);
    const at = (i: number, j: number): number => psi[((j + gh) % gh) * gw + ((i + gw) % gw)]!;
    let worst = 0;
    for (let j = 0; j < gh; j += 1) {
      for (let i = 0; i < gw; i += 1) {
        const lap = (at(i + 1, j) - 2 * at(i, j) + at(i - 1, j)) / (hx * hx) + (at(i, j + 1) - 2 * at(i, j) + at(i, j - 1)) / (hy * hy);
        worst = Math.max(worst, Math.abs(lap + om[j * gw + i]!));
      }
    }
    // relative to the field: f32 eigenvalues (the GPU's own table) limit it to ~1e-7
    expect(worst / Math.max(...om.map(Math.abs))).toBeLessThan(1e-6);
  });

  it("twiddles are cos, sin of 2πm/n in f64", () => {
    const t = twiddles(32);
    expect(t[2 * 8]).toBeCloseTo(0, 7); // cos(π/2)
    expect(t[2 * 8 + 1]).toBeCloseTo(1, 7);
  });
});

describe("Current's water is incompressible (derived; the page measures it too)", () => {
  const gw = 16;
  const gh = 8;
  const hx = 0.37;
  const hy = 0.29;
  const psi = field(gw * gh, 5);

  it("the curl of bilinear ψ has no divergence inside a cell", () => {
    let worst = 0;
    const e = 1e-5;
    for (let k = 0; k < 200; k += 1) {
      // points well inside cells, so the finite differences stay in one cell
      const fx = Math.floor(k * 0.37) % gw + 0.2 + 0.6 * ((k * 0.61) % 1);
      const fy = Math.floor(k * 0.23) % gh + 0.2 + 0.6 * ((k * 0.43) % 1);
      const [ua] = bilinearCurl(psi, gw, gh, hx, hy, fx + e, fy);
      const [ub] = bilinearCurl(psi, gw, gh, hx, hy, fx - e, fy);
      const [, va] = bilinearCurl(psi, gw, gh, hx, hy, fx, fy + e);
      const [, vb] = bilinearCurl(psi, gw, gh, hx, hy, fx, fy - e);
      const div = (ua - ub) / (2 * e * hx) + (va - vb) / (2 * e * hy);
      worst = Math.max(worst, Math.abs(div));
    }
    expect(worst).toBeLessThan(1e-8);
  });

  it("and the flow through every cell edge is the same from both sides (no leak)", () => {
    for (let i = 0; i < gw; i += 1) {
      for (const ty of [0.1, 0.5, 0.9]) {
        const y = 3 + ty;
        const [uL] = bilinearCurl(psi, gw, gh, hx, hy, i - 1e-9, y);
        const [uR] = bilinearCurl(psi, gw, gh, hx, hy, i + 1e-9, y);
        expect(uL).toBeCloseTo(uR, 6);
      }
    }
    for (let j = 0; j < gh; j += 1) {
      const [, vB] = bilinearCurl(psi, gw, gh, hx, hy, 5.4, j - 1e-9);
      const [, vT] = bilinearCurl(psi, gw, gh, hx, hy, 5.4, j + 1e-9);
      expect(vB).toBeCloseTo(vT, 6);
    }
  });

  it("the central-difference divergence of the central-difference curl cancels at every node", () => {
    const at = (i: number, j: number): number => psi[((j + gh) % gh) * gw + ((i + gw) % gw)]!;
    const u = (i: number, j: number): number => (at(i, j + 1) - at(i, j - 1)) / (2 * hy);
    const v = (i: number, j: number): number => -(at(i + 1, j) - at(i - 1, j)) / (2 * hx);
    for (let j = 0; j < gh; j += 1) {
      for (let i = 0; i < gw; i += 1) {
        const div = (u(i + 1, j) - u(i - 1, j)) / (2 * hx) + (v(i, j + 1) - v(i, j - 1)) / (2 * hy);
        expect(Math.abs(div)).toBeLessThan(1e-12);
      }
    }
  });
});

describe("Current's push and start", () => {
  it("the laminar balance: F = U (μ + ν k²)", () => {
    const H = 23;
    const k = (2 * Math.PI) / H;
    const F = tideForce(0.0065, CURRENT_FLUID, H);
    expect(F / (CURRENT_FLUID.mu + CURRENT_FLUID.nu * k * k)).toBeCloseTo(0.0065, 12);
  });

  it("the start is the Kolmogorov current: solved, u peaks near U, the ripple small", () => {
    const halfW = 8;
    const halfH = 4;
    const { gw, gh } = fluidGrid(halfW, halfH, 32);
    expect([gw, gh]).toEqual([64, 32]);
    const hx = (2 * halfW) / gw;
    const hy = (2 * halfH) / gh;
    const om = Float64Array.from(kolmogorovOmega(gw, gh, halfW, halfH, 0.0065, 1));
    const mean = om.reduce((a, v) => a + v, 0) / om.length;
    expect(Math.abs(mean)).toBeLessThan(1e-9);
    const psi = solvePsi(om, gw, gh, hx, hy);
    let umax = 0;
    for (let j = 0; j < gh; j += 1) {
      for (let i = 0; i < gw; i += 1) umax = Math.max(umax, Math.abs(bilinearCurl(psi, gw, gh, hx, hy, i + 0.5, j + 0.5)[0]));
    }
    // the grid's Laplacian and the bilinear curl shave a little off; the ripple adds ε = 8 %
    expect(umax).toBeGreaterThan(0.0065 * 0.95);
    expect(umax).toBeLessThan(0.0065 * 1.12);
  });

  it("grids are powers of two with cells near square", () => {
    for (const [hw, hh] of [
      [28, 16],
      [16, 28],
      [20, 20],
    ] as const) {
      const g = fluidGrid(hw, hh, 128);
      expect(Math.log2(g.gw) % 1).toBe(0);
      expect(Math.log2(g.gh) % 1).toBe(0);
      const aspect = (2 * hw) / g.gw / ((2 * hh) / g.gh);
      expect(aspect).toBeGreaterThan(0.7);
      expect(aspect).toBeLessThan(1.42);
    }
  });
});

describe("motes and the dispersion index", () => {
  it("random motes score ≈ 1 (Poisson); a clumped set scores far higher", () => {
    const m = makeMotes(65536, 7, 20, 11);
    const idx = dispersionIndex(m, 20, 11, 32, 18);
    expect(Math.abs(idx - 1)).toBeLessThan(4 * Math.sqrt(2 / (32 * 18)));
    const clumped = new Float32Array(m.length);
    for (let i = 0; i < m.length / 2; i += 1) {
      clumped[2 * i] = Math.round(m[2 * i]! / 4) * 4;
      clumped[2 * i + 1] = Math.round(m[2 * i + 1]! / 4) * 4;
    }
    expect(dispersionIndex(clumped, 20, 11, 32, 18)).toBeGreaterThan(10);
  });
});

describe("Food Chain", () => {
  it("the renderer reads the sharks with the ecology's own layout", () => {
    const fields = (src: string, name: string): string =>
      src
        .slice(src.indexOf(`struct ${name} {`))
        .split("}")[0]!
        .replace(/atomic<u32>/g, "u32")
        .replace(/\s+/g, " ")
        .replace(`struct ${name} {`, "")
        .trim();
    const eco = fields(SHARK_A, "Shark");
    expect(fields(seaWgsl, "Shark")).toBe(eco);
    expect(fields(WGSL_CENSUS, "SharkR")).toBe(eco);
    expect(eco.split(",").filter((f) => f.trim()).length).toBe(10); // two vec2 + eight words = 48 bytes
    expect(SHARK_BYTES).toBe(48);
  });

  it("the first sharks: the asked-for count alive, every catch key empty", () => {
    const ab = sharks0(64, 6, 1, 7, 4, 0.0065);
    const f = new Float32Array(ab);
    const u = new Uint32Array(ab);
    let alive = 0;
    for (let k = 0; k < 64; k += 1) {
      const o = (k * SHARK_BYTES) / 4;
      alive += f[o + 5]!;
      expect(u[o + 9]).toBe(0xffffffff);
      expect(u[o + 10]).toBe(0xffffffff);
      expect(Math.abs(f[o]!)).toBeLessThanOrEqual(7);
      expect(Math.abs(f[o + 1]!)).toBeLessThanOrEqual(4);
    }
    expect(alive).toBe(6);
  });

  it("the plankton starts patchy, inside [K/4, K]", () => {
    const p = plankton0(137, 77, 1, 1);
    const lo = Math.min(...p);
    const hi = Math.max(...p);
    expect(lo).toBeGreaterThanOrEqual(0.25);
    expect(hi).toBeLessThanOrEqual(1);
    expect(hi - lo).toBeGreaterThan(0.3);
  });

  it("the rates leave room to live: fish break even on plankton below its ceiling; a hunting shark can", () => {
    const p = FOOD_CHAIN;
    const breakEven = p.fishCost / (p.efficiency * p.graze);
    expect(breakEven).toBeGreaterThan(0);
    expect(breakEven).toBeLessThan(0.5 * p.K);
    // measured: one catch per ~46 steps (handling included); break-even needs one per gain / cost steps
    expect(p.sharkGain / p.sharkCost).toBeGreaterThan(46);
  });

  it("scenes: Current and Food Chain are listed, with their own counts", () => {
    const listed = SCENES.filter((s) => s.listed).map((s) => s.id);
    expect(listed).toEqual(["open-water", "order-dial", "mill", "current", "food-chain"]);
    expect(sceneById("current").counts).toBe(CURRENT_COUNTS);
    expect(sceneById("food-chain").counts).toBe(FOOD_COUNTS);
    expect(sceneById("food-chain").sortEvery).toBe(0);
    for (const n of Object.values(FOOD_COUNTS)) expect(n).toBeLessThan(1 << 20); // the catch key's index field
  });
});
