// Swarm — Current (03-boids-2d.md § The model, "Fluid"): the water as a
// solved 2D incompressible fluid, coupled two ways to the fish.
//
// The water is the 2D Navier–Stokes equations in vorticity–stream-function
// form on a periodic grid of GW × GH nodes (both powers of two):
//
//   ∂ω/∂t + u·∇ω = ν∇²ω − μω + ∇×f,    ∇²ψ = −ω,    u = U₀ + (∂ψ/∂y, −∂ψ/∂x)
//
// with ν the viscosity, μ a linear friction with the sea floor and f the
// force the fish and the visitor's brush put into the water. U₀ is the mean
// flow (the k = 0 mode a stream function on a torus cannot hold). Each step:
//
//   couple   every fish and the water at its position exchange momentum: the
//            fish's velocity relaxes towards the water's, and the opposite
//            impulse is added to the 4 nodes around it in fixed point (i32
//            atomics, 2⁻²⁰), so the sum the water gains is an exact integer;
//   stir     the visitor's brush adds a Gaussian impulse to the same sums;
//   advect   ω is carried by the flow (semi-Lagrangian, RK2 back-trace,
//            bilinear) and gains ∇×f (central differences of the impulse);
//   mean     U₀ gains the impulse's exact integer mean, then friction;
//   solve    one forward FFT of ω, then ν and μ implicitly per mode, then
//            ψ̂ = ω̂ / λ with λ the 5-point Laplacian's own eigenvalue, and
//            one inverse FFT of ω̂ + iψ̂ (both fields are real, so one
//            complex transform returns both).
//
// Why the water is incompressible (derived, then measured in-page):
//   * the node velocity is the central-difference curl of ψ, whose
//     central-difference divergence is (ψ₊₊ − ψ₊₋ − ψ₋₊ + ψ₋₋)/(4 h_x h_y)
//     minus the same sum — zero for any ψ, solved well or not;
//   * the velocity a fish or a mote feels between nodes is the exact curl of
//     the bilinear interpolant of ψ. Inside a cell that is u = c + d·x,
//     v = −(b + d·y), so ∇·u = d − d = 0; across an edge the normal
//     component is ∂ψ/∂(along) of the edge's two shared nodes, so it is
//     continuous and no water leaks between cells. The field the fish ride
//     is divergence-free everywhere, not only at the nodes.
// What is not exact: semi-Lagrangian advection is numerically diffusive (it
// smooths ω more than ν alone would), and the time step is first order in
// the splitting. The FFT solve is exact up to f32 rounding (measured).
//
// The exchange conserves momentum (derived): a fish of mass m = fb·M (M the
// water mass at one node) changes velocity by −Σq/(2²⁰·fb) and the water
// gains Σq/2²⁰ at its nodes, with Σq the same integers. The projection keeps
// the mean, so the water's total momentum is M·N·U₀ and gains exactly Σq.
// The fish's own steering and speed limit are not part of the exchange: they
// are the fish swimming, an external force on the pair.

/** Fixed point for the impulse sums (v4: FLUID_SCALE). */
export const FLUID_FP = 1048576;

export interface FluidParams {
  /** Viscosity ν, world units² per step. */
  nu: number;
  /** Sea-floor friction μ, per step. */
  mu: number;
  /** Drag: the fraction of (u − v) a fish's velocity moves towards the water's each step. */
  drag: number;
  /** Fish mass over water mass, summed over the ocean (sets fb = this · nodes / fish). */
  massRatio: number;
}

export const CURRENT_FLUID: FluidParams = { nu: 2e-4, mu: 4e-4, drag: 0.06, massRatio: 0.6 };

export interface FluidConfig {
  gw: number;
  gh: number;
  halfW: number;
  halfH: number;
  /** Fish that couple (0 = none). */
  nFish: number;
  motes: number;
  seed: number;
  params: FluidParams;
}

export interface Brush {
  x: number;
  y: number;
  /** Impulse per step at the centre (world units per step). */
  ix: number;
  iy: number;
  radius: number;
}

export interface FluidStats {
  /** max |∇·u| on the grid (central differences of the node velocity), per step. */
  maxDiv: number;
  /** max |∂u/∂x| + |∂v/∂y| — the scale the divergence is measured against. */
  maxGrad: number;
  /** max |∇²ψ + ω| / max |ω| — how exactly ψ solves for ω. */
  poisson: number;
  /** Mean ½|u|² per node, (world units / step)². */
  energy: number;
  /** max |u|, world units per step. */
  maxSpeed: number;
  /** Mean flow U₀. */
  u0: [number, number];
  /** max |ω|. */
  maxOmega: number;
}

/** The largest power of two ≤ x (at least 8). */
const pow2 = (x: number): number => Math.max(8, 2 ** Math.round(Math.log2(Math.max(x, 8))));

/** Grid for an ocean: GH rows, GW the power of two nearest square cells. */
export function fluidGrid(halfW: number, halfH: number, rows: number): { gw: number; gh: number } {
  const gh = pow2(rows);
  return { gw: pow2(gh * (halfW / halfH)), gh };
}

/** The 5-point Laplacian's eigenvalues along one axis: (2 sin(πp/n) / h)². */
export function laplacianSymbol(n: number, h: number): Float32Array {
  const out = new Float32Array(n);
  for (let p = 0; p < n; p += 1) {
    const s = (2 * Math.sin((Math.PI * p) / n)) / h;
    out[p] = s * s;
  }
  return out;
}

/** Twiddles (cos, sin)(2πm/n), m < n/2, computed in f64. */
export function twiddles(n: number): Float32Array {
  const out = new Float32Array(n);
  for (let m = 0; m < n / 2; m += 1) {
    out[2 * m] = Math.cos((2 * Math.PI * m) / n);
    out[2 * m + 1] = Math.sin((2 * Math.PI * m) / n);
  }
  return out;
}

/** Velocity a fish feels at (fx, fy) in node units: the exact curl of bilinear ψ (CPU mirror of velAt). */
export function bilinearCurl(psi: ArrayLike<number>, gw: number, gh: number, hx: number, hy: number, fx: number, fy: number): [number, number] {
  const i0 = Math.floor(fx);
  const j0 = Math.floor(fy);
  const tx = fx - i0;
  const ty = fy - j0;
  const at = (i: number, j: number): number => psi[(((j % gh) + gh) % gh) * gw + (((i % gw) + gw) % gw)]!;
  const p00 = at(i0, j0);
  const p10 = at(i0 + 1, j0);
  const p01 = at(i0, j0 + 1);
  const p11 = at(i0 + 1, j0 + 1);
  const u = ((p01 - p00) * (1 - tx) + (p11 - p10) * tx) / hy;
  const v = -((p10 - p00) * (1 - ty) + (p11 - p01) * ty) / hx;
  return [u, v];
}

const FP_STRUCT = `
struct FP {
  gw: u32, gh: u32, cells: u32, nFish: u32,
  hx: f32, hy: f32, halfW: f32, halfH: f32,
  dt: f32, nu: f32, mu: f32, scale: f32,
  drag: f32, fb: f32, stirX: f32, stirY: f32,
  stirIX: f32, stirIY: f32, stirR: f32, nMotes: u32,
  tide: f32, tideK: f32, _a: f32, _b: f32,
};`;

const FLUID_HEADER = `
${FP_STRUCT}
fn wrapi(i: i32, n: u32) -> u32 { let m = i32(n); return u32(((i % m) + m) % m); }
fn nidx(i: i32, j: i32) -> u32 { return wrapi(j, F.gh) * F.gw + wrapi(i, F.gw); }
// world position → node coordinates (node (i, j) sits at −half + (i, j)·h)
fn toNode(p: vec2<f32>) -> vec2<f32> { return vec2<f32>((p.x + F.halfW) / F.hx, (p.y + F.halfH) / F.hy); }
// the exact curl of bilinear ψ at node coordinates q, plus the mean flow
fn velAt(q: vec2<f32>) -> vec2<f32> {
  let i0 = i32(floor(q.x)); let j0 = i32(floor(q.y));
  let tx = q.x - f32(i0); let ty = q.y - f32(j0);
  let p00 = psi[nidx(i0, j0)]; let p10 = psi[nidx(i0 + 1, j0)];
  let p01 = psi[nidx(i0, j0 + 1)]; let p11 = psi[nidx(i0 + 1, j0 + 1)];
  let u = ((p01 - p00) * (1.0 - tx) + (p11 - p10) * tx) / F.hy;
  let v = -((p10 - p00) * (1.0 - ty) + (p11 - p01) * ty) / F.hx;
  return vec2<f32>(u, v) + vec2<f32>(state.u0x, state.u0y);
}
`;

const STATE = `struct FS { u0x: f32, u0y: f32, sumX: i32, sumY: i32 };`;

// ---- fish ↔ water ----------------------------------------------------------------------
const WGSL_COUPLE = `
${STATE}
struct Boid { pos: vec2<f32>, vel: vec2<f32>, align: f32, dens: f32 };
@group(0) @binding(0) var<uniform> F: FP;
@group(0) @binding(1) var<storage, read_write> boids: array<Boid>;
@group(0) @binding(2) var<storage, read> psi: array<f32>;
@group(0) @binding(3) var<storage, read_write> acc: array<atomic<i32>>;
@group(0) @binding(4) var<storage, read> state: FS;
${FLUID_HEADER}
@compute @workgroup_size(256)
fn couple(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x; if (k >= F.nFish) { return; }
  let b = boids[k];
  if (b.dens < 0.0) { return; }
  let q = toNode(b.pos);
  let u = velAt(q);
  let dv = F.drag * (u - b.vel);
  let i0 = i32(floor(q.x)); let j0 = i32(floor(q.y));
  let tx = q.x - f32(i0); let ty = q.y - f32(j0);
  let w = vec4<f32>((1.0 - tx) * (1.0 - ty), tx * (1.0 - ty), (1.0 - tx) * ty, tx * ty);
  let dep = -dv * F.fb * F.scale;
  var qx = vec4<i32>(round(dep.x * w));
  var qy = vec4<i32>(round(dep.y * w));
  let sx = qx.x + qx.y + qx.z + qx.w; let sy = qy.x + qy.y + qy.z + qy.w;
  // the fish takes exactly what the water's integers say it gave
  boids[k].vel = b.vel - vec2<f32>(f32(sx), f32(sy)) / (F.scale * F.fb);
  var a = array<u32, 4>(nidx(i0, j0), nidx(i0 + 1, j0), nidx(i0, j0 + 1), nidx(i0 + 1, j0 + 1));
  for (var c = 0u; c < 4u; c = c + 1u) {
    if (qx[c] != 0) { atomicAdd(&acc[2u * a[c]], qx[c]); }
    if (qy[c] != 0) { atomicAdd(&acc[2u * a[c] + 1u], qy[c]); }
  }
}
`;

// ---- the visitor's brush, advection with forcing, the mean flow ---------------------
const WGSL_ADVECT = `
${STATE}
@group(0) @binding(0) var<uniform> F: FP;
@group(0) @binding(1) var<storage, read> omega: array<f32>;
@group(0) @binding(2) var<storage, read> psi: array<f32>;
@group(0) @binding(3) var<storage, read_write> acc: array<atomic<i32>>;
@group(0) @binding(4) var<storage, read_write> state: FS;
@group(0) @binding(5) var<storage, read_write> cplx: array<vec2<f32>>;
@group(0) @binding(6) var<storage, read_write> partials: array<vec2<i32>>;
${FLUID_HEADER}
var<workgroup> sh: array<vec2<i32>, 256>;
@compute @workgroup_size(256)
fn stir(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x; if (k >= F.cells) { return; }
  let imp = vec2<f32>(F.stirIX, F.stirIY);
  if (dot(imp, imp) <= 0.0) { return; }
  let i = k % F.gw; let j = k / F.gw;
  var d = vec2<f32>(-F.halfW + f32(i) * F.hx, -F.halfH + f32(j) * F.hy) - vec2<f32>(F.stirX, F.stirY);
  let W = 2.0 * F.halfW; let H = 2.0 * F.halfH;
  d = d - vec2<f32>(W, H) * round(d / vec2<f32>(W, H));
  let r = max(F.stirR, 1e-4);
  let g = exp(-dot(d, d) / (r * r));
  if (g < 1e-3) { return; }
  let q = vec2<i32>(round(imp * g * F.scale));
  atomicAdd(&acc[2u * k], q.x);
  atomicAdd(&acc[2u * k + 1u], q.y);
}
fn sampleOmega(q: vec2<f32>) -> f32 {
  let i0 = i32(floor(q.x)); let j0 = i32(floor(q.y));
  let tx = q.x - f32(i0); let ty = q.y - f32(j0);
  return mix(mix(omega[nidx(i0, j0)], omega[nidx(i0 + 1, j0)], tx), mix(omega[nidx(i0, j0 + 1)], omega[nidx(i0 + 1, j0 + 1)], tx), ty);
}
fn dU(i: i32, j: i32) -> vec2<f32> {
  let c = nidx(i, j);
  return vec2<f32>(f32(atomicLoad(&acc[2u * c])), f32(atomicLoad(&acc[2u * c + 1u]))) / F.scale;
}
@compute @workgroup_size(256)
fn advect(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let k = gid.x;
  var s = vec2<i32>(0);
  if (k < F.cells) {
    let i = i32(k % F.gw); let j = i32(k / F.gw);
    let node = vec2<f32>(f32(i), f32(j));
    let scale = vec2<f32>(F.dt / F.hx, F.dt / F.hy);
    // RK2 back-trace along the bilinear-curl velocity
    let u1 = velAt(node);
    let mid = node - 0.5 * u1 * scale;
    let u2 = velAt(mid);
    let w = sampleOmega(node - u2 * scale);
    // ∇ × (the impulse), central differences
    let curl = (dU(i + 1, j).y - dU(i - 1, j).y) / (2.0 * F.hx) - (dU(i, j + 1).x - dU(i, j - 1).x) / (2.0 * F.hy);
    // the steady push f_x = F sin(k y): ∇ × f = −F k cos(k y)
    let y = -F.halfH + f32(j) * F.hy;
    let tide = -F.tide * F.tideK * cos(F.tideK * y);
    cplx[k] = vec2<f32>(w + curl + tide, 0.0);
    s = vec2<i32>(atomicLoad(&acc[2u * k]), atomicLoad(&acc[2u * k + 1u]));
  }
  sh[lid.x] = s;
  var st = 128u;
  loop { if (st == 0u) { break; } workgroupBarrier(); if (lid.x < st) { sh[lid.x] = sh[lid.x] + sh[lid.x + st]; } st = st >> 1u; }
  workgroupBarrier();
  if (lid.x == 0u) { partials[wid.x] = sh[0]; }
}
// one thread: the impulse's exact integer total → the mean flow, then friction
@compute @workgroup_size(1)
fn meanFlow() {
  let m = arrayLength(&partials);
  var t = vec2<i32>(0);
  for (var w = 0u; w < m; w = w + 1u) { t = t + partials[w]; }
  state.sumX = t.x; state.sumY = t.y;
  let gain = vec2<f32>(f32(t.x), f32(t.y)) / (F.scale * f32(F.cells));
  let u0 = (vec2<f32>(state.u0x, state.u0y) + gain) / (1.0 + F.mu * F.dt);
  state.u0x = u0.x; state.u0y = u0.y;
}
`;

// ---- the FFT (Stockham radix 2, f64 twiddles) and the spectral step --------------
const WGSL_FFT = `
struct PP { n: u32, ns: u32, axis: u32, lines: u32, gw: u32, twOff: u32, dir: f32, _p: u32 };
@group(0) @binding(0) var<uniform> P: PP;
@group(0) @binding(1) var<storage, read> src: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> dst: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> tw: array<vec2<f32>>;
fn addr(line: u32, e: u32) -> u32 { return select(e * P.gw + line, line * P.gw + e, P.axis == 0u); }
@compute @workgroup_size(256)
fn fftPass(@builtin(global_invocation_id) gid: vec3<u32>) {
  let half = P.n / 2u;
  let t = gid.x; if (t >= half * P.lines) { return; }
  let j = t % half; let line = t / half;
  let a0 = src[addr(line, j)]; let a1 = src[addr(line, j + half)];
  let k = j % P.ns;
  let w0 = tw[P.twOff + k * (half / P.ns)];
  let w = vec2<f32>(w0.x, P.dir * w0.y);
  let b = vec2<f32>(a1.x * w.x - a1.y * w.y, a1.x * w.y + a1.y * w.x);
  let d = (j / P.ns) * P.ns * 2u + k;
  dst[addr(line, d)] = a0 + b;
  dst[addr(line, d + P.ns)] = a0 - b;
}
`;

const WGSL_SPECTRAL = `
${STATE}
${FP_STRUCT}
@group(0) @binding(0) var<uniform> F: FP;
@group(0) @binding(1) var<storage, read_write> cplx: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> lam: array<f32>;
@group(0) @binding(3) var<storage, read_write> omega: array<f32>;
@group(0) @binding(4) var<storage, read_write> psi: array<f32>;
@group(0) @binding(5) var<storage, read_write> acc: array<atomic<i32>>;
@compute @workgroup_size(256)
fn spectral(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x; if (k >= F.cells) { return; }
  let p = k % F.gw; let q = k / F.gw;
  let l = lam[p] + lam[F.gw + q];
  var w = cplx[k] / (1.0 + F.dt * (F.nu * l + F.mu));
  var s = vec2<f32>(0.0);
  if (l > 0.0) { s = w / l; } else { w = vec2<f32>(0.0); }
  // ω̂ + i ψ̂
  cplx[k] = vec2<f32>(w.x - s.y, w.y + s.x);
}
@compute @workgroup_size(256)
fn unpack(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x; if (k >= F.cells) { return; }
  let z = cplx[k] / f32(F.cells);
  omega[k] = z.x;
  psi[k] = z.y;
  atomicStore(&acc[2u * k], 0);
  atomicStore(&acc[2u * k + 1u], 0);
}
`;

// ---- motes: passive particles that ride the water (RK2) ------------------------------
const WGSL_MOTES = `
${STATE}
@group(0) @binding(0) var<uniform> F: FP;
@group(0) @binding(1) var<storage, read_write> motes: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> psi: array<f32>;
@group(0) @binding(3) var<storage, read> state: FS;
${FLUID_HEADER}
fn wrapW(p0: vec2<f32>) -> vec2<f32> {
  let W = vec2<f32>(2.0 * F.halfW, 2.0 * F.halfH);
  return p0 - W * floor((p0 + vec2<f32>(F.halfW, F.halfH)) / W);
}
@compute @workgroup_size(256)
fn drift(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x; if (k >= F.nMotes) { return; }
  let p = motes[k];
  let u1 = velAt(toNode(p));
  let u2 = velAt(toNode(p + 0.5 * F.dt * u1));
  motes[k] = wrapW(p + F.dt * u2);
}
`;

// ---- live statistics (per-workgroup partials; the page reduces them) ----------------
const WGSL_STATS = `
${STATE}
@group(0) @binding(0) var<uniform> F: FP;
@group(0) @binding(1) var<storage, read> omega: array<f32>;
@group(0) @binding(2) var<storage, read> psi: array<f32>;
@group(0) @binding(3) var<storage, read> state: FS;
@group(0) @binding(4) var<storage, read_write> out: array<vec4<f32>>;
${FLUID_HEADER}
var<workgroup> sa: array<vec4<f32>, 256>;
var<workgroup> sb: array<vec4<f32>, 256>;
fn nodeVel(i: i32, j: i32) -> vec2<f32> {
  return vec2<f32>((psi[nidx(i, j + 1)] - psi[nidx(i, j - 1)]) / (2.0 * F.hy), -(psi[nidx(i + 1, j)] - psi[nidx(i - 1, j)]) / (2.0 * F.hx));
}
@compute @workgroup_size(256)
fn stats(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let k = gid.x;
  var a = vec4<f32>(0.0); var b = vec4<f32>(0.0);
  if (k < F.cells) {
    let i = i32(k % F.gw); let j = i32(k / F.gw);
    let ux = (nodeVel(i + 1, j).x - nodeVel(i - 1, j).x) / (2.0 * F.hx);
    let vy = (nodeVel(i, j + 1).y - nodeVel(i, j - 1).y) / (2.0 * F.hy);
    let u = nodeVel(i, j) + vec2<f32>(state.u0x, state.u0y);
    let lap = (psi[nidx(i + 1, j)] - 2.0 * psi[k] + psi[nidx(i - 1, j)]) / (F.hx * F.hx)
            + (psi[nidx(i, j + 1)] - 2.0 * psi[k] + psi[nidx(i, j - 1)]) / (F.hy * F.hy);
    a = vec4<f32>(abs(ux + vy), abs(ux) + abs(vy), abs(lap + omega[k]), abs(omega[k]));
    b = vec4<f32>(0.5 * dot(u, u), length(u), 0.0, 0.0);
  }
  sa[lid.x] = a; sb[lid.x] = b;
  var st = 128u;
  loop {
    if (st == 0u) { break; }
    workgroupBarrier();
    if (lid.x < st) { sa[lid.x] = max(sa[lid.x], sa[lid.x + st]); let o = sb[lid.x + st]; sb[lid.x] = vec4<f32>(sb[lid.x].x + o.x, max(sb[lid.x].y, o.y), 0.0, 0.0); }
    st = st >> 1u;
  }
  workgroupBarrier();
  if (lid.x == 0u) { out[2u * wid.x] = sa[0]; out[2u * wid.x + 1u] = sb[0]; }
}
`;

type BindKind = GPUBufferBindingType;
const STORAGE = (): number => GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

interface Kernel {
  layout: GPUBindGroupLayout;
  pipe: GPUComputePipeline;
}

/** Fluid pipelines shared by every Fluid on a device. */
export class FluidKernels {
  private constructor(
    readonly couple: Kernel,
    readonly stir: Kernel,
    readonly advect: Kernel,
    readonly meanFlow: Kernel,
    readonly fft: Kernel,
    readonly spectral: Kernel,
    readonly unpack: Kernel,
    readonly drift: Kernel,
    readonly stats: Kernel,
  ) {}

  static async create(device: GPUDevice): Promise<FluidKernels> {
    const C = GPUShaderStage.COMPUTE;
    const layout = (label: string, kinds: BindKind[], dynamic0 = false): GPUBindGroupLayout =>
      device.createBindGroupLayout({
        label,
        entries: kinds.map((type, binding) => ({ binding, visibility: C, buffer: { type, hasDynamicOffset: dynamic0 && binding === 0 } })),
      });
    const mods = new Map<string, GPUShaderModule>();
    const mod = async (label: string, code: string): Promise<GPUShaderModule> => {
      let m = mods.get(label);
      if (!m) {
        m = device.createShaderModule({ label, code });
        mods.set(label, m);
        const info = await m.getCompilationInfo();
        const errs = info.messages.filter((x) => x.type === "error");
        if (errs.length) throw new Error(`${label} shader: ${errs.map((e) => `${e.lineNum}:${e.message}`).join(" | ")}`);
      }
      return m;
    };
    const k = async (label: string, code: string, entry: string, kinds: BindKind[], dynamic0 = false): Promise<Kernel> => {
      const l = layout(`swarm-fluid-${entry}`, kinds, dynamic0);
      const pipe = await device.createComputePipelineAsync({
        label: `swarm-fluid-${entry}`,
        layout: device.createPipelineLayout({ bindGroupLayouts: [l] }),
        compute: { module: await mod(label, code), entryPoint: entry },
      });
      return { layout: l, pipe };
    };
    const U: BindKind = "uniform";
    const R: BindKind = "read-only-storage";
    const W: BindKind = "storage";
    const [couple, stir, advect, meanFlow, fft, spectral, unpack, drift, stats] = await Promise.all([
      k("fluid-couple", WGSL_COUPLE, "couple", [U, W, R, W, R]),
      k("fluid-advect", WGSL_ADVECT, "stir", [U, R, R, W, W, W, W]),
      k("fluid-advect", WGSL_ADVECT, "advect", [U, R, R, W, W, W, W]),
      k("fluid-advect", WGSL_ADVECT, "meanFlow", [U, R, R, W, W, W, W]),
      k("fluid-fft", WGSL_FFT, "fftPass", [U, R, W, R], true),
      k("fluid-spectral", WGSL_SPECTRAL, "spectral", [U, W, R, W, W, W]),
      k("fluid-spectral", WGSL_SPECTRAL, "unpack", [U, W, R, W, W, W]),
      k("fluid-motes", WGSL_MOTES, "drift", [U, W, R, R]),
      k("fluid-stats", WGSL_STATS, "stats", [U, R, R, R, W]),
    ]);
    return new FluidKernels(couple, stir, advect, meanFlow, fft, spectral, unpack, drift, stats);
  }
}

const FFT_SLOT = 256;

export class Fluid {
  readonly gw: number;
  readonly gh: number;
  readonly cells: number;
  readonly hx: number;
  readonly hy: number;
  readonly halfW: number;
  readonly halfH: number;
  readonly nFish: number;
  readonly nMotes: number;
  params: FluidParams;
  /** Impulse per step from the visitor's brush (null = none). */
  brush: Brush | null = null;
  readonly omega: GPUBuffer;
  readonly psi: GPUBuffer;
  readonly motes: GPUBuffer;
  readonly state: GPUBuffer;
  private readonly device: GPUDevice;
  private readonly k: FluidKernels;
  private readonly acc: GPUBuffer;
  private readonly cA: GPUBuffer;
  private readonly cB: GPUBuffer;
  private readonly lam: GPUBuffer;
  private readonly tw: GPUBuffer;
  private readonly partials: GPUBuffer;
  private readonly statsOut: GPUBuffer;
  private readonly uni: GPUBuffer;
  private readonly fftUni: GPUBuffer;
  private readonly fwdPasses: number;
  private readonly groups: number;
  private readonly advectBG: GPUBindGroup;
  private readonly fftBG: [GPUBindGroup, GPUBindGroup];
  private readonly spectralBG: [GPUBindGroup, GPUBindGroup];
  private readonly driftBG: GPUBindGroup;
  private readonly statsBG: GPUBindGroup;
  private readonly coupleBGs = new Map<GPUBuffer, GPUBindGroup>();
  private readonly U = new ArrayBuffer(96);
  /** Kolmogorov forcing amplitude F (f_x = F sin(2πy/H)), world units per step². */
  tide = 0;

  constructor(device: GPUDevice, kernels: FluidKernels, cfg: FluidConfig) {
    this.device = device;
    this.k = kernels;
    this.gw = cfg.gw;
    this.gh = cfg.gh;
    this.cells = cfg.gw * cfg.gh;
    this.halfW = cfg.halfW;
    this.halfH = cfg.halfH;
    this.hx = (2 * cfg.halfW) / cfg.gw;
    this.hy = (2 * cfg.halfH) / cfg.gh;
    this.nFish = cfg.nFish;
    this.nMotes = cfg.motes;
    this.params = { ...cfg.params };
    const n = this.cells;
    const buf = (size: number, label: string, usage = STORAGE()): GPUBuffer => device.createBuffer({ size: Math.max(16, size), usage, label: `swarm-fluid-${label}` });
    this.omega = buf(n * 4, "omega");
    this.psi = buf(n * 4, "psi");
    this.acc = buf(n * 8, "acc");
    this.cA = buf(n * 8, "complex-a");
    this.cB = buf(n * 8, "complex-b");
    this.lam = buf((this.gw + this.gh) * 4, "lambda");
    this.tw = buf((this.gw + this.gh) * 4, "twiddles");
    this.state = buf(16, "state");
    this.motes = buf(Math.max(1, this.nMotes) * 8, "motes");
    this.groups = Math.ceil(n / 256);
    this.partials = buf(this.groups * 8, "partials");
    this.statsOut = buf(this.groups * 32, "stats");
    this.uni = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "swarm-fluid-params" });

    const lam = new Float32Array(this.gw + this.gh);
    lam.set(laplacianSymbol(this.gw, this.hx), 0);
    lam.set(laplacianSymbol(this.gh, this.hy), this.gw);
    device.queue.writeBuffer(this.lam, 0, lam);
    const tw = new Float32Array(this.gw + this.gh);
    tw.set(twiddles(this.gw), 0);
    tw.set(twiddles(this.gh), this.gw);
    device.queue.writeBuffer(this.tw, 0, tw);

    // the FFT passes: forward x then y, inverse x then y; one uniform slot each
    const lx = Math.log2(this.gw);
    const ly = Math.log2(this.gh);
    this.fwdPasses = lx + ly;
    const slots = new ArrayBuffer(2 * this.fwdPasses * FFT_SLOT);
    let s = 0;
    for (const dir of [-1, 1]) {
      for (const axis of [0, 1]) {
        const len = axis === 0 ? this.gw : this.gh;
        const lines = axis === 0 ? this.gh : this.gw;
        for (let ns = 1; ns < len; ns *= 2) {
          const u = new Uint32Array(slots, s * FFT_SLOT, 8);
          const f = new Float32Array(slots, s * FFT_SLOT, 8);
          u[0] = len;
          u[1] = ns;
          u[2] = axis;
          u[3] = lines;
          u[4] = this.gw;
          u[5] = axis === 0 ? 0 : this.gw / 2;
          f[6] = dir;
          s += 1;
        }
      }
    }
    this.fftUni = device.createBuffer({ size: slots.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "swarm-fluid-fft-params" });
    device.queue.writeBuffer(this.fftUni, 0, slots);

    const e = (bufs: GPUBuffer[], first?: GPUBufferBinding): GPUBindGroupEntry[] =>
      bufs.map((b, i) => ({ binding: i, resource: i === 0 && first ? first : { buffer: b } }));
    const kk = this.k;
    this.advectBG = device.createBindGroup({ layout: kk.advect.layout, entries: e([this.uni, this.omega, this.psi, this.acc, this.state, this.cA, this.partials]) });
    const fslot = { buffer: this.fftUni, offset: 0, size: 32 };
    this.fftBG = [
      device.createBindGroup({ layout: kk.fft.layout, entries: e([this.fftUni, this.cA, this.cB, this.tw], fslot) }),
      device.createBindGroup({ layout: kk.fft.layout, entries: e([this.fftUni, this.cB, this.cA, this.tw], fslot) }),
    ];
    this.spectralBG = [
      device.createBindGroup({ layout: kk.spectral.layout, entries: e([this.uni, this.cA, this.lam, this.omega, this.psi, this.acc]) }),
      device.createBindGroup({ layout: kk.spectral.layout, entries: e([this.uni, this.cB, this.lam, this.omega, this.psi, this.acc]) }),
    ];
    this.driftBG = device.createBindGroup({ layout: kk.drift.layout, entries: e([this.uni, this.motes, this.psi, this.state]) });
    this.statsBG = device.createBindGroup({ layout: kk.stats.layout, entries: e([this.uni, this.omega, this.psi, this.state, this.statsOut]) });
    this.reseed(cfg.seed);
  }

  /** Still water, motes spread uniformly at random from `seed`. */
  reseed(seed: number): void {
    const q = this.device.queue;
    q.writeBuffer(this.omega, 0, new Float32Array(this.cells));
    q.writeBuffer(this.psi, 0, new Float32Array(this.cells));
    q.writeBuffer(this.acc, 0, new Int32Array(this.cells * 2));
    q.writeBuffer(this.state, 0, new Float32Array(4));
    q.writeBuffer(this.motes, 0, makeMotes(this.nMotes, seed, this.halfW, this.halfH));
  }

  /** Load a vorticity field (and ψ solved on the CPU in f64 by the caller, or zeros — the next step solves). */
  loadOmega(omega: Float32Array<ArrayBuffer>, psi?: Float32Array<ArrayBuffer>, u0: [number, number] = [0, 0]): void {
    this.device.queue.writeBuffer(this.omega, 0, omega);
    this.device.queue.writeBuffer(this.psi, 0, psi ?? new Float32Array(this.cells));
    this.device.queue.writeBuffer(this.state, 0, new Float32Array([u0[0], u0[1], 0, 0]));
  }

  /** Fish mass over one node's water mass. */
  get fb(): number {
    return this.nFish > 0 ? (this.params.massRatio * this.cells) / this.nFish : 0;
  }

  /** Write the step uniform (once per frame: the brush is a force per step). */
  prepare(pure = false): void {
    const u = new Uint32Array(this.U);
    const f = new Float32Array(this.U);
    const p = this.params;
    const b = pure ? null : this.brush;
    u[0] = this.gw;
    u[1] = this.gh;
    u[2] = this.cells;
    u[3] = this.nFish;
    f[4] = this.hx;
    f[5] = this.hy;
    f[6] = this.halfW;
    f[7] = this.halfH;
    f[8] = 1;
    f[9] = p.nu;
    f[10] = p.mu;
    f[11] = FLUID_FP;
    f[12] = p.drag;
    f[13] = this.fb;
    f[14] = b ? b.x : 0;
    f[15] = b ? b.y : 0;
    f[16] = b ? b.ix : 0;
    f[17] = b ? b.iy : 0;
    f[18] = b ? b.radius : 1;
    u[19] = this.nMotes;
    f[20] = this.tide;
    f[21] = (2 * Math.PI) / (2 * this.halfH);
    this.device.queue.writeBuffer(this.uni, 0, this.U);
  }

  private coupleBG(boids: GPUBuffer): GPUBindGroup {
    let bg = this.coupleBGs.get(boids);
    if (!bg) {
      bg = this.device.createBindGroup({
        layout: this.k.couple.layout,
        entries: [this.uni, boids, this.psi, this.acc, this.state].map((b, i) => ({ binding: i, resource: { buffer: b } })),
      });
      this.coupleBGs.set(boids, bg);
    }
    return bg;
  }

  /** One coupled step: fish (if given) ↔ water, the brush, advection, the solve, the motes. */
  encodeStep(pass: GPUComputePassEncoder, boids: GPUBuffer | null, drag = true): void {
    const kk = this.k;
    const g = this.groups;
    if (boids && drag && this.nFish > 0 && this.params.drag > 0) {
      pass.setPipeline(kk.couple.pipe);
      pass.setBindGroup(0, this.coupleBG(boids));
      pass.dispatchWorkgroups(Math.ceil(this.nFish / 256));
    }
    pass.setBindGroup(0, this.advectBG);
    if (this.brush) {
      pass.setPipeline(kk.stir.pipe);
      pass.dispatchWorkgroups(g);
    }
    pass.setPipeline(kk.advect.pipe);
    pass.dispatchWorkgroups(g);
    pass.setPipeline(kk.meanFlow.pipe);
    pass.dispatchWorkgroups(1);
    // forward FFT A ⇄ B, the spectral step in place, inverse FFT
    let cur = 0;
    pass.setPipeline(kk.fft.pipe);
    const fft = (from: number, count: number): void => {
      for (let s = from; s < from + count; s += 1) {
        pass.setBindGroup(0, this.fftBG[cur]!, [s * FFT_SLOT]);
        pass.dispatchWorkgroups(Math.ceil(this.cells / 2 / 256));
        cur = 1 - cur;
      }
    };
    fft(0, this.fwdPasses);
    pass.setPipeline(kk.spectral.pipe);
    pass.setBindGroup(0, this.spectralBG[cur]!);
    pass.dispatchWorkgroups(g);
    pass.setPipeline(kk.fft.pipe);
    fft(this.fwdPasses, this.fwdPasses);
    pass.setPipeline(kk.unpack.pipe);
    pass.setBindGroup(0, this.spectralBG[cur]!);
    pass.dispatchWorkgroups(g);
    if (this.nMotes > 0) {
      pass.setPipeline(kk.drift.pipe);
      pass.setBindGroup(0, this.driftBG);
      pass.dispatchWorkgroups(Math.ceil(this.nMotes / 256));
    }
  }

  /** Record the statistics reduction; read it with `readStats`. */
  encodeStats(enc: GPUCommandEncoder): void {
    const p = enc.beginComputePass({ label: "swarm-fluid-stats" });
    p.setPipeline(this.k.stats.pipe);
    p.setBindGroup(0, this.statsBG);
    p.dispatchWorkgroups(this.groups);
    p.end();
  }

  get statsBuffer(): GPUBuffer {
    return this.statsOut;
  }

  get statsBytes(): number {
    return this.groups * 32;
  }

  /** Reduce the per-workgroup partials (and the state) into stats. */
  reduceStats(parts: Float32Array, state: Float32Array): FluidStats {
    let maxDiv = 0;
    let maxGrad = 0;
    let maxRes = 0;
    let maxOmega = 0;
    let e = 0;
    let maxSpeed = 0;
    for (let w = 0; w < this.groups; w += 1) {
      const o = w * 8;
      maxDiv = Math.max(maxDiv, parts[o]!);
      maxGrad = Math.max(maxGrad, parts[o + 1]!);
      maxRes = Math.max(maxRes, parts[o + 2]!);
      maxOmega = Math.max(maxOmega, parts[o + 3]!);
      e += parts[o + 4]!;
      maxSpeed = Math.max(maxSpeed, parts[o + 5]!);
    }
    return {
      maxDiv,
      maxGrad,
      poisson: maxOmega > 0 ? maxRes / maxOmega : 0,
      energy: e / this.cells,
      maxSpeed,
      u0: [state[0]!, state[1]!],
      maxOmega,
    };
  }

  /** Copies of ω, ψ, the state and the motes (for save points). */
  checkpoint(): GPUBuffer[] {
    const enc = this.device.createCommandEncoder({ label: "swarm-fluid-checkpoint" });
    const out = [this.omega, this.psi, this.state, this.motes].map((b) => {
      const c = this.device.createBuffer({ size: b.size, usage: STORAGE(), label: "swarm-fluid-save" });
      enc.copyBufferToBuffer(b, 0, c, 0, b.size);
      return c;
    });
    this.device.queue.submit([enc.finish()]);
    return out;
  }

  restore(c: GPUBuffer[]): void {
    const enc = this.device.createCommandEncoder({ label: "swarm-fluid-restore" });
    [this.omega, this.psi, this.state, this.motes].forEach((b, i) => enc.copyBufferToBuffer(c[i]!, 0, b, 0, b.size));
    enc.clearBuffer(this.acc);
    this.device.queue.submit([enc.finish()]);
  }

  destroy(): void {
    for (const b of [this.omega, this.psi, this.acc, this.cA, this.cB, this.lam, this.tw, this.state, this.motes, this.partials, this.statsOut, this.uni, this.fftUni]) b.destroy();
  }
}

/** Motes spread uniformly at random (a counter hash of the seed). */
export function makeMotes(n: number, seed: number, halfW: number, halfH: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.max(1, n) * 2);
  let s = (seed ^ 0x6d2b79f5) >>> 0;
  const rnd = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i += 1) {
    out[2 * i] = (rnd() * 2 - 1) * halfW;
    out[2 * i + 1] = (rnd() * 2 - 1) * halfH;
  }
  return out;
}

/**
 * Index of dispersion of points over a coarse grid: Var(n) / mean(n) over
 * cx × cy cells. Uniform random points give ≈ 1 (Poisson); a compressible
 * flow gathers them and the index rises.
 */
export function dispersionIndex(pts: Float32Array, halfW: number, halfH: number, cx: number, cy: number): number {
  const counts = new Float64Array(cx * cy);
  const n = pts.length / 2;
  for (let i = 0; i < n; i += 1) {
    const x = Math.min(cx - 1, Math.max(0, Math.floor(((pts[2 * i]! + halfW) / (2 * halfW)) * cx)));
    const y = Math.min(cy - 1, Math.max(0, Math.floor(((pts[2 * i + 1]! + halfH) / (2 * halfH)) * cy)));
    counts[y * cx + x] += 1;
  }
  const mean = n / counts.length;
  let v = 0;
  for (const c of counts) v += (c - mean) * (c - mean);
  return v / counts.length / mean;
}
