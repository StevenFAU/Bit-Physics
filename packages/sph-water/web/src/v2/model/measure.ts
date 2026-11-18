// Instruments on a full read-back of the live water: pressure against depth
// (hydrostatics) and how far the solver lets the water compress.
//
// DFSPH's pressure: both of the solver's solves correct velocities by
//   v_i -= dt · Σ_j m_j (κ_i/ρ_i + κ_j/ρ_j) ∇W_ij,
// which is the SPH pressure acceleration −Σ_j m_j (p_i/ρ_i² + p_j/ρ_j²) ∇W_ij
// over one step with p_i = κ_i ρ_i. Every κ the constant-density and the
// divergence-free solve apply, summed over their iterations and over a window
// of steps (lists.wgsl kappa_sum), gives the mean pressure that held each
// particle up: p_i = ρ_i Σκ_i / steps. One step's κ is not enough — the
// shipped order runs the divergence solve after the density solve, and the
// weight is carried by both. In still water p should grow with depth as ρ₀ g d.

export interface HydrostaticFit {
  /** Fitted dp/dd, Pa per m. */
  slope: number;
  /** The analytic slope ρ₀ g. */
  expected: number;
  /** slope / expected. */
  ratio: number;
  intercept: number;
  r2: number;
  /** Particles used. */
  count: number;
  /** Mean pressure per depth bin (bin centres in m). */
  bins: { depth: number; pressure: number; count: number }[];
}

/**
 * Least squares of pressure on depth below `level`, over particles with a
 * full neighbourhood (away from the free surface, the wall and the floor,
 * where a particle's summed density is low by construction).
 */
export function hydrostaticFit(
  s: { pos: Float32Array; aux: Float32Array; kappaSum: Float32Array },
  n: number,
  o: { level: number; rho0: number; g: number; minNeighbours: number; wallRadius: number; floor: number; margin: number; steps: number; bins?: number },
): HydrostaticFit {
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  let c = 0;
  const nb = o.bins ?? 12;
  const depthMax = o.level - o.floor;
  const binSum = new Float64Array(nb);
  const binN = new Float64Array(nb);
  for (let i = 0; i < n; i += 1) {
    const x = s.pos[i * 4]!;
    const y = s.pos[i * 4 + 1]!;
    const z = s.pos[i * 4 + 2]!;
    if (s.aux[i * 4 + 2]! < o.minNeighbours) continue;
    if (Math.hypot(x, z) > o.wallRadius - o.margin) continue;
    if (y < o.floor + o.margin) continue;
    const d = o.level - y;
    if (d < o.margin) continue;
    const p = (s.aux[i * 4]! * s.kappaSum[i]!) / o.steps;
    sx += d;
    sy += p;
    sxx += d * d;
    sxy += d * p;
    syy += p * p;
    c += 1;
    const b = Math.min(nb - 1, Math.max(0, Math.floor((d / depthMax) * nb)));
    binSum[b] += p;
    binN[b] += 1;
  }
  const den = c * sxx - sx * sx;
  const slope = den > 0 ? (c * sxy - sx * sy) / den : 0;
  const intercept = c > 0 ? (sy - slope * sx) / c : 0;
  const ssTot = syy - (sy * sy) / Math.max(c, 1);
  let ssRes = 0;
  // residual sum of squares from the moments: Σ(p − a − b d)²
  ssRes = syy - 2 * intercept * sy - 2 * slope * sxy + c * intercept * intercept + 2 * intercept * slope * sx + slope * slope * sxx;
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const expected = o.rho0 * o.g;
  const bins = [];
  for (let b = 0; b < nb; b += 1) {
    if (binN[b]! > 0) bins.push({ depth: ((b + 0.5) / nb) * depthMax, pressure: binSum[b]! / binN[b]!, count: binN[b]! });
  }
  return { slope, expected, ratio: slope / expected, intercept, r2, count: c, bins };
}
