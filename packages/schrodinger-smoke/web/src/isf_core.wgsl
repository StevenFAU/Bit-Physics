// schrodinger-smoke — ISF split-step spectral core (WGSL, f32).
//
// Backend contract: packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py
// (f64 NumPy). Two-spectra rule (spec-ref § 3, golden E): the free step uses
// the CONTINUOUS Laplacian eigenvalues (paper Eq. 18), the pressure projection
// uses the DISCRETE sin^2 eigenvalues (paper Eq. 17). Both spectral multiplier
// tables are precomputed in f64 on the CPU (mod-2pi reduced) and uploaded —
// the CUDA-port trig-bound lesson; never computed with f32 trig here.
//
// Determinism: pure grid FFT + gather — no scatter, no float atomics; the
// only atomics are u32 bitcast max() reductions (order-independent), so a
// fixed Stockham pass order gives device-scoped run-twice bit-identity.
//
// Spinor packing: one vec4 per cell = (Re psi1, Im psi1, Re psi2, Im psi2) —
// every FFT sweep transforms both components at once.

struct Uni {
  n: u32,          // grid size per axis (power of two)
  half_n3: u32,    // N^3 / 2 (FFT butterflies per pass)
  dx: f32,
  hbar: f32,
  dt: f32,
  // constraint region (Alg. 4): kind 0=off 1=sphere(jet/brush) 2=cylinder-obstacle
  c_kind: u32,
  c_radius: f32,
  c_omega_t: f32,      // omega * t phase offset
  c_center: vec3<f32>,
  buoyancy: f32,       // g*dt/hbar phase rate on psi2 (0 = off)
  c_kvec: vec3<f32>,   // prescribed wave vector (u = hbar * k); 0 => obstacle
  _pad0: f32,
}

// FFT pass parameters — one 256-aligned slot per (axis, stage, dir) combo,
// bound via statically-offset bind groups created once at init (no push
// constants in WebGPU; static bind groups keep the pass order fixed).
struct PassU {
  axis: u32,
  stage: u32,
  dir: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> U: Uni;
@group(0) @binding(1) var<storage, read_write> bufA: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> bufB: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> scA: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> scB: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read> freeMul: array<vec2<f32>>;  // f64-precomputed exp(-i(hbar dt/2)|k|^2) / N^3
@group(0) @binding(6) var<storage, read> invLam: array<f32>;         // f64-precomputed 1/lambda_disc / N^3 (0 at k=0)
@group(0) @binding(7) var<storage, read_write> stats: array<atomic<u32>>; // [0] max|eta| bits, [1] max|div| bits

@group(2) @binding(0) var<uniform> P: PassU;

fn idx3(p: vec3<u32>) -> u32 {
  return (p.x * U.n + p.y) * U.n + p.z;
}

// ---------------------------------------------------------------------------
// Precision trig (Vulkan builtin sin/cos 2^-11 floor — measured 63x budget on
// lavapipe here first) + cmul + Stockham butterfly core: SHARED, promoted to
// common/common-web/src/fft-wgsl.ts (heat-equation spec § 13.2 operator
// decision 5; two consumers, one kernel). Spliced by solver.ts at pipeline
// creation. The hazard note travels with the shared code.
// ---------------------------------------------------------------------------
//__COMMON_FFT__

fn atan_poly(z_in: f32) -> f32 {
  // 0 <= z_in <= 1 — Cephes atanf reduction: fold at tan(pi/8) so the
  // polynomial only ever sees |w| <= 0.4142 (~1e-7 abs there)
  var w = z_in;
  var base = 0.0;
  if (w > 0.4142135623730951) {
    w = (w - 1.0) / (w + 1.0);
    base = 0.7853981633974483;
  }
  let z = w * w;
  return base + (((8.05374449538e-2 * z - 1.38776856032e-1) * z + 1.99777106478e-1) * z - 3.33329491539e-1) * z * w + w;
}

fn atan2_p(y: f32, x: f32) -> f32 {
  let ax = abs(x);
  let ay = abs(y);
  let hi = max(ax, ay);
  let lo = min(ax, ay);
  if (hi == 0.0) { return 0.0; }
  var a = atan_poly(lo / hi);
  if (ay > ax) { a = 1.5707963267948966 - a; }
  if (x < 0.0) { a = 3.141592653589793 - a; }
  return select(a, -a, y < 0.0);
}

// ---------------------------------------------------------------------------
// Stockham radix-2 pass along P.axis (batched over the other two axes).
// Classic autosort butterfly: with L = 2^(stage+1), Ls = L/2,
//   out[i*L + j]      = in[i*Ls + j] + w * in[i*Ls + j + N/2]
//   out[i*L + j + Ls] = in[i*Ls + j] - w * in[i*Ls + j + N/2]
//   w = exp(dir * 2*pi*i * j / L)
// Fixed pass order; twiddle angle |2*pi*j/L| < 2*pi so in-shader f32 trig is
// well-conditioned (the LARGE-angle tables are the precomputed ones).
// ---------------------------------------------------------------------------


fn coord_of(line_id: u32, e: u32) -> u32 {
  let a = line_id / U.n;
  let b = line_id % U.n;
  if (P.axis == 0u) { return idx3(vec3<u32>(e, a, b)); }
  if (P.axis == 1u) { return idx3(vec3<u32>(a, e, b)); }
  return idx3(vec3<u32>(a, b, e));
}

struct Butterfly {
  ia: u32,
  ib: u32,
  ic: u32,
  id: u32,
  w: vec2<f32>,
}

fn butterfly_indices(gid: u32) -> Butterfly {
  let half_line = U.n / 2u;
  let line_id = gid / half_line;
  let t = gid % half_line;
  let fb = fft_butterfly(t, P.stage, half_line, P.dir); // shared core (fft-wgsl.ts)
  var out: Butterfly;
  out.ia = coord_of(line_id, fb.ea);
  out.ib = coord_of(line_id, fb.eb);
  out.ic = coord_of(line_id, fb.ec);
  out.id = coord_of(line_id, fb.ed);
  out.w = fb.w;
  return out;
}

@compute @workgroup_size(256)
fn fft_pass(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.half_n3) { return; }
  let b = butterfly_indices(g.x);
  let va = bufA[b.ia];
  let vb = bufA[b.ib];
  let w1 = cmul(b.w, vb.xy);
  let w2 = cmul(b.w, vb.zw);
  bufB[b.ic] = vec4<f32>(va.xy + w1, va.zw + w2);
  bufB[b.id] = vec4<f32>(va.xy - w1, va.zw - w2);
}

@compute @workgroup_size(256)
fn fft_pass_sc(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.half_n3) { return; }
  let b = butterfly_indices(g.x);
  let va = scA[b.ia];
  let vb = scA[b.ib];
  let w1 = cmul(b.w, vb);
  scB[b.ic] = va + w1;
  scB[b.id] = va - w1;
}

// copy kernels for odd pass counts (result parked in the pong buffer)
@compute @workgroup_size(256)
fn copy_b_to_a(@builtin(global_invocation_id) g: vec3<u32>) {
  let n3 = U.n * U.n * U.n;
  if (g.x >= n3) { return; }
  bufA[g.x] = bufB[g.x];
}

@compute @workgroup_size(256)
fn copy_sc_b_to_a(@builtin(global_invocation_id) g: vec3<u32>) {
  let n3 = U.n * U.n * U.n;
  if (g.x >= n3) { return; }
  scA[g.x] = scB[g.x];
}

// ---------------------------------------------------------------------------
// Pointwise spectral multipliers (tables precomputed f64 on CPU)
// ---------------------------------------------------------------------------

@compute @workgroup_size(256)
fn spectral_mul_free(@builtin(global_invocation_id) g: vec3<u32>) {
  let n3 = U.n * U.n * U.n;
  if (g.x >= n3) { return; }
  let m = freeMul[g.x];
  let v = bufA[g.x];
  bufA[g.x] = vec4<f32>(cmul(v.xy, m), cmul(v.zw, m));
}

@compute @workgroup_size(256)
fn spectral_mul_invlam(@builtin(global_invocation_id) g: vec3<u32>) {
  let n3 = U.n * U.n * U.n;
  if (g.x >= n3) { return; }
  scA[g.x] = scA[g.x] * invLam[g.x];
}

@compute @workgroup_size(256)
fn normalize_psi(@builtin(global_invocation_id) g: vec3<u32>) {
  let n3 = U.n * U.n * U.n;
  if (g.x >= n3) { return; }
  let v = bufA[g.x];
  let mag = sqrt(dot(v, v));
  bufA[g.x] = v / max(mag, 1e-20);
}

// ---------------------------------------------------------------------------
// Edge phases eta_e = arg<Psi_v, Psi_{v+e}> and divergence (Alg. 3);
// div -> scA (as complex re), max|eta| -> stats[0] via u32-bitcast atomicMax
// (positive-float bit pattern is monotonic, order-independent => deterministic)
// ---------------------------------------------------------------------------

fn inner_arg(a: vec4<f32>, b: vec4<f32>) -> f32 {
  // <a,b>_C = conj(a1)b1 + conj(a2)b2
  let re = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let im = a.x * b.y - a.y * b.x + a.z * b.w - a.w * b.z;
  return atan2_p(im, re);
}

fn eta_at(p: vec3<u32>) -> vec3<f32> {
  let np = U.n;
  let v = bufA[idx3(p)];
  let ex = inner_arg(v, bufA[idx3(vec3<u32>((p.x + 1u) % np, p.y, p.z))]);
  let ey = inner_arg(v, bufA[idx3(vec3<u32>(p.x, (p.y + 1u) % np, p.z))]);
  let ez = inner_arg(v, bufA[idx3(vec3<u32>(p.x, p.y, (p.z + 1u) % np))]);
  return vec3<f32>(ex, ey, ez);
}

fn eta_minus(p: vec3<u32>) -> vec3<f32> {
  let np = U.n;
  let xm = vec3<u32>((p.x + np - 1u) % np, p.y, p.z);
  let ym = vec3<u32>(p.x, (p.y + np - 1u) % np, p.z);
  let zm = vec3<u32>(p.x, p.y, (p.z + np - 1u) % np);
  let v = bufA[idx3(p)];
  return vec3<f32>(
    inner_arg(bufA[idx3(xm)], v),
    inner_arg(bufA[idx3(ym)], v),
    inner_arg(bufA[idx3(zm)], v),
  );
}

@compute @workgroup_size(4, 4, 4)
fn eta_div(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n || g.z >= U.n) { return; }
  let ep = eta_at(g);
  let em = eta_minus(g);
  let div = (ep.x - em.x + ep.y - em.y + ep.z - em.z) / (U.dx * U.dx);
  scA[idx3(g)] = vec2<f32>(div, 0.0);
  let m = max(max(abs(ep.x), abs(ep.y)), abs(ep.z));
  atomicMax(&stats[0], bitcast<u32>(m));
  atomicMax(&stats[1], bitcast<u32>(abs(div)));
}

// gauge shift Psi <- Psi * exp(-i*phi), phi = scA.x (post inverse FFT)
@compute @workgroup_size(256)
fn gauge_apply(@builtin(global_invocation_id) g: vec3<u32>) {
  let n3 = U.n * U.n * U.n;
  if (g.x >= n3) { return; }
  let phi = scA[g.x].x;
  let csv = cs_p(phi);
  let w = vec2<f32>(csv.x, -csv.y);
  let v = bufA[g.x];
  bufA[g.x] = vec4<f32>(cmul(v.xy, w), cmul(v.zw, w));
}

// ---------------------------------------------------------------------------
// Beyond-canonical (UNGATED — overwrites Psi; the UI flips the gate badge):
// Alg-4 constraint blend + psi2 buoyancy phase (paper § 3.3)
// ---------------------------------------------------------------------------

@compute @workgroup_size(4, 4, 4)
fn constraint_blend(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n || g.z >= U.n) { return; }
  if (U.c_kind == 0u) { return; }
  let pos = (vec3<f32>(g) + vec3<f32>(0.0)) * U.dx;
  var inside = false;
  if (U.c_kind == 1u) {
    inside = distance(pos, U.c_center) < U.c_radius;
  } else {
    // axis-aligned cylinder along z (vortex-street obstacle)
    let d = pos.xy - U.c_center.xy;
    inside = dot(d, d) < U.c_radius * U.c_radius;
  }
  if (!inside) { return; }
  let phase = dot(U.c_kvec, pos) - U.c_omega_t;
  let w = cs_p(phase);
  let i = idx3(g);
  let v = bufA[i];
  let m1 = length(v.xy);
  let m2 = length(v.zw);
  bufA[i] = vec4<f32>(m1 * w, m2 * w);
}

@compute @workgroup_size(256)
fn buoyancy_apply(@builtin(global_invocation_id) g: vec3<u32>) {
  let n3 = U.n * U.n * U.n;
  if (g.x >= n3) { return; }
  if (U.buoyancy == 0.0) { return; }
  // linear potential on psi2 only (paper § 3.3): psi2 *= exp(-i * g*y * dt / hbar)
  let y = f32((g.x / U.n) % U.n) * U.dx;
  let ang = -U.buoyancy * y;
  let w = cs_p(ang);
  let v = bufA[g.x];
  bufA[g.x] = vec4<f32>(v.xy, cmul(v.zw, w));
}

// ---------------------------------------------------------------------------
// Velocity readout -> 3D texture (rgba16float): xyz = MAC face velocities at
// this cell's + faces (hbar * eta / dx), w = arg(psi1) for phase coloring.
// ---------------------------------------------------------------------------

@group(1) @binding(0) var velOut: texture_storage_3d<rgba16float, write>;

@compute @workgroup_size(4, 4, 4)
fn velocity_write(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n || g.z >= U.n) { return; }
  let e = eta_at(g);
  let u = e * (U.hbar / U.dx);
  let v = bufA[idx3(g)];
  textureStore(velOut, vec3<i32>(g), vec4<f32>(u, atan2_p(v.y, v.x)));
}
