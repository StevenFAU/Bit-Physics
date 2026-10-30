// Swarm — Eyes Only's vision model, the f64 CPU reference (03-boids-2d.md §
// The proof: "Vision-based scene: labelled as a reimplementation of a
// published model; reproduce one qualitative result from the paper (ordered
// motion emerges) as a regression test").
//
// Bastien & Romanczuk 2020, Sci. Adv. 6:eaay0792, the minimal model (no time
// derivatives, α₂ = β₂ = 0). Each fish is a disc of diameter BL = 2R with an
// eye at its centre and a full 360° view. Its visual field V(φ) is binary:
// 1 where some other fish's disc covers the direction φ (measured from its
// heading, positive to the left), 0 elsewhere — the union of the discs'
// projections, so a fish hidden behind a nearer one adds nothing. It moves by
//
//   dv/dt = γ(v₀ − v) + α₀ ∫ cos φ (−V + α₁ (∂_φ V)²) dφ
//   dψ/dt =             β₀ ∫ sin φ (−V + β₁ (∂_φ V)²) dφ
//
// For a binary field (∂_φ V)² is a sum of unit spikes at the edges of what it
// sees, so the edge terms are α₁ Σ cos φ_e and β₁ Σ sin φ_e. With one disc
// straight ahead the two terms balance where tan δ = α₁ (δ the disc's
// half-angle), i.e. at a distance BL / (2α₁) — the paper's L_eq. Nothing in
// the model reads another fish's heading or velocity: there is no alignment.
//
// The field is sampled at NB bin centres (the authors' code samples 1,025
// points; a disc always covers at least the bin its centre falls in, as
// there). Each bin's ∫cos and ∫sin are exact, so ∫V cos φ dφ over a run of
// covered bins is sin(end) − sin(start): both terms come from the transitions
// alone. The WGSL kernel (./vision.ts) does exactly this in f32; this file
// does it in f64. The authors' open plane becomes the page's torus, and a
// fish sees only out to `range` (murky water); the regression test uses a
// range wider than its school.

/** Bins in a visual field (one u32 word holds 32). */
export const VISION_BINS = 256;
export const VISION_WORDS = VISION_BINS / 32;

export interface VisionParams {
  /** Body radius R, world units (a fish is a disc of diameter BL = 2R). */
  R: number;
  /** Preferred speed v₀, world units per unit time. */
  v0: number;
  /** Speed relaxation γ, per unit time. */
  gamma: number;
  /** Speed response α₀ and its edge weight α₁. */
  a0: number;
  a1: number;
  /** Turning response β₀ and its edge weight β₁. */
  b0: number;
  b1: number;
  /** Time per step. */
  dt: number;
  /** How far a fish sees, world units. */
  range: number;
}

/** α₁ for an equilibrium distance L_eq (world units) and body radius R: L_eq = BL / (2α₁) = R / α₁. */
export const edgeWeightFor = (leq: number, R: number): number => R / leq;
/** The equilibrium distance an edge weight sets. */
export const equilibriumDistance = (a1: number, R: number): number => R / a1;

const TAU = Math.PI * 2;

/** sin and cos of each bin's lower boundary φ_k = −π + k·2π/NB, in f64. */
export function boundaryTables(nb = VISION_BINS): { sin: Float64Array; cos: Float64Array } {
  const s = new Float64Array(nb);
  const c = new Float64Array(nb);
  for (let k = 0; k < nb; k += 1) {
    const phi = -Math.PI + (k * TAU) / nb;
    s[k] = Math.sin(phi);
    c[k] = Math.cos(phi);
  }
  return { sin: s, cos: c };
}

/**
 * The bins a disc covers: centre at angle `th` ∈ [−π, π] from the heading,
 * half-angle `dl`. Returns [lo, hi] (unwrapped, lo ≤ hi; take mod NB): every
 * bin whose centre lies within [th − dl, th + dl], or — when none does — the
 * bin the centre falls in.
 */
export function discBins(th: number, dl: number, nb = VISION_BINS): [number, number] {
  const w = TAU / nb;
  const lo = Math.ceil((th - dl + Math.PI) / w - 0.5);
  const hi = Math.floor((th + dl + Math.PI) / w - 0.5);
  if (hi < lo) {
    const c = Math.floor((th + Math.PI) / w);
    return [c, c];
  }
  return [lo, hi];
}

/** Set bins lo..hi (unwrapped) in a field of NB bits. */
export function setBins(V: Uint32Array, lo: number, hi: number, nb = VISION_BINS): void {
  if (hi - lo + 1 >= nb) {
    V.fill(0xffffffff);
    return;
  }
  for (let k = lo; k <= hi; k += 1) {
    const b = ((k % nb) + nb) % nb;
    V[b >>> 5]! |= 1 << (b & 31);
  }
}

export const binOf = (V: Uint32Array, k: number): number => (V[k >>> 5]! >>> (k & 31)) & 1;

export interface FieldTerms {
  /** ∫ V cos φ dφ, ∫ V sin φ dφ. */
  bc: number;
  bs: number;
  /** Σ over edges of cos φ_e, sin φ_e. */
  ec: number;
  es: number;
  /** Edges seen. */
  edges: number;
  /** Fraction of the field covered. */
  cover: number;
}

/** The body and edge integrals of a binned field, from its transitions (ascending k). */
export function fieldTerms(V: Uint32Array, tab: { sin: ArrayLike<number>; cos: ArrayLike<number> }, nb = VISION_BINS): FieldTerms {
  let bc = 0;
  let bs = 0;
  let ec = 0;
  let es = 0;
  let edges = 0;
  let covered = 0;
  for (let k = 0; k < nb; k += 1) {
    const now = binOf(V, k);
    covered += now;
    const before = binOf(V, (k + nb - 1) % nb);
    if (now === before) continue;
    const s = tab.sin[k]!;
    const c = tab.cos[k]!;
    if (now) {
      // a run starts at φ_k
      bc -= s;
      bs += c;
    } else {
      // a run ends at φ_k
      bc += s;
      bs -= c;
    }
    ec += c;
    es += s;
    edges += 1;
  }
  return { bc, bs, ec, es, edges, cover: covered / nb };
}

export interface VisionState {
  n: number;
  halfW: number;
  halfH: number;
  x: Float64Array;
  y: Float64Array;
  /** Speed (may go negative, as in the authors' code) and heading ψ. */
  v: Float64Array;
  psi: Float64Array;
}

export function visionState(n: number, halfW: number, halfH: number, init: ArrayLike<number>): VisionState {
  const s: VisionState = { n, halfW, halfH, x: new Float64Array(n), y: new Float64Array(n), v: new Float64Array(n), psi: new Float64Array(n) };
  for (let i = 0; i < n; i += 1) {
    s.x[i] = init[i * 4]!;
    s.y[i] = init[i * 4 + 1]!;
    s.v[i] = init[i * 4 + 2]!;
    s.psi[i] = init[i * 4 + 3]!;
  }
  return s;
}

/** A cell list over the torus with cells at least `cell` wide (≥ 3 per side, or a single cell). */
function cellList(s: VisionState, cell: number): { cols: number; rows: number; cw: number; ch: number; head: Int32Array; next: Int32Array } {
  const W = s.halfW * 2;
  const H = s.halfH * 2;
  let cols = Math.max(1, Math.floor(W / cell));
  let rows = Math.max(1, Math.floor(H / cell));
  if (cols < 3) cols = 1;
  if (rows < 3) rows = 1;
  const cw = W / cols;
  const ch = H / rows;
  const head = new Int32Array(cols * rows).fill(-1);
  const next = new Int32Array(s.n);
  for (let i = 0; i < s.n; i += 1) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((s.x[i]! + s.halfW) / cw)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((s.y[i]! + s.halfH) / ch)));
    const c = cy * cols + cx;
    next[i] = head[c]!;
    head[c] = i;
  }
  return { cols, rows, cw, ch, head, next };
}

/** Fish i's visual field from the state (every fish within range). */
export function visualField(s: VisionState, i: number, p: VisionParams, V = new Uint32Array(VISION_WORDS), list?: ReturnType<typeof cellList>): Uint32Array {
  V.fill(0);
  const W = s.halfW * 2;
  const H = s.halfH * 2;
  const xi = s.x[i]!;
  const yi = s.y[i]!;
  const hx = Math.cos(s.psi[i]!);
  const hy = Math.sin(s.psi[i]!);
  const r2 = p.range * p.range;
  const visit = (j: number): void => {
    if (j === i) return;
    let dx = s.x[j]! - xi;
    let dy = s.y[j]! - yi;
    dx -= W * Math.round(dx / W);
    dy -= H * Math.round(dy / H);
    const d2 = dx * dx + dy * dy;
    if (d2 >= r2) return;
    const d = Math.sqrt(d2);
    const fx = dx * hx + dy * hy;
    const fy = dy * hx - dx * hy;
    const th = Math.atan2(fy, fx);
    const dl = Math.asin(Math.min(p.R / Math.max(d, 1e-12), 1));
    const [lo, hi] = discBins(th, dl);
    setBins(V, lo, hi);
  };
  if (!list) {
    for (let j = 0; j < s.n; j += 1) visit(j);
    return V;
  }
  const { cols, rows, cw, ch, head, next } = list;
  const gx = Math.min(cols - 1, Math.max(0, Math.floor((xi + s.halfW) / cw)));
  const gy = Math.min(rows - 1, Math.max(0, Math.floor((yi + s.halfH) / ch)));
  const oy0 = rows === 1 ? 0 : -1;
  const oy1 = rows === 1 ? 0 : 1;
  const ox0 = cols === 1 ? 0 : -1;
  const ox1 = cols === 1 ? 0 : 1;
  for (let oy = oy0; oy <= oy1; oy += 1) {
    const yy = (gy + oy + rows) % rows;
    for (let ox = ox0; ox <= ox1; ox += 1) {
      const xx = (gx + ox + cols) % cols;
      for (let j = head[yy * cols + xx]!; j >= 0; j = next[j]!) visit(j);
    }
  }
  return V;
}

/** One Euler step of the whole school (positions move with the updated velocity, as the authors' code does). */
export function visionStep(s: VisionState, p: VisionParams, tab = boundaryTables()): void {
  const n = s.n;
  const list = cellList(s, p.range);
  const V = new Uint32Array(VISION_WORDS);
  const nv = new Float64Array(n);
  const np = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    visualField(s, i, p, V, list);
    const t = fieldTerms(V, tab);
    const v = s.v[i]!;
    nv[i] = v + p.dt * (p.gamma * (p.v0 - v) + p.a0 * (-t.bc + p.a1 * t.ec));
    let psi = s.psi[i]! + p.dt * p.b0 * (-t.bs + p.b1 * t.es);
    if (psi > Math.PI) psi -= TAU;
    else if (psi < -Math.PI) psi += TAU;
    np[i] = psi;
  }
  const W = s.halfW * 2;
  const H = s.halfH * 2;
  for (let i = 0; i < n; i += 1) {
    s.v[i] = nv[i]!;
    s.psi[i] = np[i]!;
    let x = s.x[i]! + nv[i]! * Math.cos(np[i]!) * p.dt;
    let y = s.y[i]! + nv[i]! * Math.sin(np[i]!) * p.dt;
    if (x > s.halfW) x -= W;
    else if (x < -s.halfW) x += W;
    if (y > s.halfH) y -= H;
    else if (y < -s.halfH) y += H;
    s.x[i] = x;
    s.y[i] = y;
  }
}

export interface VisionRun {
  n: number;
  halfW: number;
  halfH: number;
  params: VisionParams;
  /** n × [x, y, v, ψ]. */
  init: Float64Array;
  steps: number;
  /** Take φ after every `every` steps. */
  every: number;
}

/** Run the reference; returns φ (the direction of motion's polarization) after every `every` steps. */
export function runVisionCpu(o: VisionRun): Float64Array {
  const s = visionState(o.n, o.halfW, o.halfH, o.init);
  const tab = boundaryTables();
  const out = new Float64Array(Math.floor(o.steps / o.every));
  let k = 0;
  for (let t = 1; t <= o.steps; t += 1) {
    visionStep(s, o.params, tab);
    if (t % o.every === 0) out[k++] = statePolarization(s);
  }
  return out;
}

/** The f32 boids of a vision flock (pos, step displacement v·dt·(cos ψ, sin ψ), ψ) as the reference's n × [x, y, v, ψ]. */
export function stateFromBoids(b: ArrayLike<number>, n: number, dt: number): Float64Array {
  const out = new Float64Array(n * 4);
  for (let i = 0; i < n; i += 1) {
    const psi = b[i * 6 + 4]!;
    out[i * 4] = b[i * 6]!;
    out[i * 4 + 1] = b[i * 6 + 1]!;
    out[i * 4 + 2] = (b[i * 6 + 2]! * Math.cos(psi) + b[i * 6 + 3]! * Math.sin(psi)) / dt;
    out[i * 4 + 3] = psi;
  }
  return out;
}

/** Polarization: |Σ of the unit direction of motion| / N (a fish at rest adds nothing). */
export function polarization(vx: ArrayLike<number>, vy: ArrayLike<number>, n: number): number {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    const l = Math.hypot(vx[i]!, vy[i]!);
    if (l > 0) {
      sx += vx[i]! / l;
      sy += vy[i]! / l;
    }
  }
  return Math.hypot(sx, sy) / Math.max(n, 1);
}

export function statePolarization(s: VisionState): number {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < s.n; i += 1) {
    const sg = Math.sign(s.v[i]!);
    sx += sg * Math.cos(s.psi[i]!);
    sy += sg * Math.sin(s.psi[i]!);
  }
  return Math.hypot(sx, sy) / Math.max(s.n, 1);
}

export interface SchoolStats {
  /** Groups of at least `minSize` fish (linked within `link`). */
  schools: number;
  /** Fish in those groups. */
  schooled: number;
  /** Polarization of each group, averaged over their fish. */
  order: number;
  /** The largest group. */
  largest: number;
  /** Group sizes, largest first. */
  sizes: number[];
}

/**
 * Schools: groups of fish linked by chains of neighbours closer than `link`
 * (union–find over a cell list, on the torus), and each group's own
 * polarization. Positions and velocities are read as world x, y, vx, vy.
 */
export function schoolStats(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  vx: ArrayLike<number>,
  vy: ArrayLike<number>,
  n: number,
  halfW: number,
  halfH: number,
  link: number,
  minSize = 5,
  alive?: (i: number) => boolean,
): SchoolStats {
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i += 1) parent[i] = i;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]!]!;
      a = parent[a]!;
    }
    return a;
  };
  const W = halfW * 2;
  const H = halfH * 2;
  let cols = Math.max(1, Math.floor(W / link));
  let rows = Math.max(1, Math.floor(H / link));
  if (cols < 3) cols = 1;
  if (rows < 3) rows = 1;
  const cw = W / cols;
  const ch = H / rows;
  const head = new Int32Array(cols * rows).fill(-1);
  const next = new Int32Array(n);
  const cell = new Int32Array(n);
  for (let i = 0; i < n; i += 1) {
    if (alive && !alive(i)) {
      cell[i] = -1;
      continue;
    }
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((x[i]! + halfW) / cw)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((y[i]! + halfH) / ch)));
    const c = cy * cols + cx;
    cell[i] = c;
    next[i] = head[c]!;
    head[c] = i;
  }
  const l2 = link * link;
  for (let i = 0; i < n; i += 1) {
    const c = cell[i]!;
    if (c < 0) continue;
    const gx = c % cols;
    const gy = (c / cols) | 0;
    for (let oy = rows === 1 ? 0 : -1; oy <= (rows === 1 ? 0 : 1); oy += 1) {
      for (let ox = cols === 1 ? 0 : -1; ox <= (cols === 1 ? 0 : 1); ox += 1) {
        const k = ((gy + oy + rows) % rows) * cols + ((gx + ox + cols) % cols);
        for (let j = head[k]!; j >= 0; j = next[j]!) {
          if (j <= i) continue;
          let dx = x[j]! - x[i]!;
          let dy = y[j]! - y[i]!;
          dx -= W * Math.round(dx / W);
          dy -= H * Math.round(dy / H);
          if (dx * dx + dy * dy < l2) {
            const a = find(i);
            const b = find(j);
            if (a !== b) parent[a] = b;
          }
        }
      }
    }
  }
  const size = new Map<number, number>();
  const sx = new Map<number, number>();
  const sy = new Map<number, number>();
  for (let i = 0; i < n; i += 1) {
    if (cell[i]! < 0) continue;
    const r = find(i);
    size.set(r, (size.get(r) ?? 0) + 1);
    const l = Math.hypot(vx[i]!, vy[i]!);
    if (l > 0) {
      sx.set(r, (sx.get(r) ?? 0) + vx[i]! / l);
      sy.set(r, (sy.get(r) ?? 0) + vy[i]! / l);
    }
  }
  let schools = 0;
  let schooled = 0;
  let weighted = 0;
  const sizes: number[] = [];
  for (const [r, m] of size) {
    if (m < minSize) continue;
    schools += 1;
    schooled += m;
    sizes.push(m);
    weighted += Math.hypot(sx.get(r) ?? 0, sy.get(r) ?? 0);
  }
  sizes.sort((a, b) => b - a);
  return { schools, schooled, order: schooled > 0 ? weighted / schooled : 0, largest: sizes[0] ?? 0, sizes };
}
