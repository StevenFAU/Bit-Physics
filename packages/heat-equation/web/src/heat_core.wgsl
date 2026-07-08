// heat-equation — FTCS + spectral compute core (WGSL, f32).
//
// Backend contract: packages/heat-equation/heat_equation/{reference,spectral}.py
// (f64 NumPy). Two-spectra rule (spec-ref § 3.2, golden C): the FTCS stencil
// realizes the DISCRETE 5-point symbol; the spectral path multiplies by the
// CONTINUOUS per-mode decay exp(-alpha*|k|^2*dt) — read from a COMMITTED
// f64-precomputed buffer (public/heat-gate-decay-f64.bin -> f32), never
// evaluated with WGSL builtin exp (guaranteed only 3+2|x| ULP; the
// schrodinger-smoke 63x-on-lavapipe lesson, spec-ref § 5.2).
//
// Determinism: pure grid stencil + FFT — no scatter, no float atomics on the
// gated path; a fixed Stockham pass order gives device-scoped run-twice
// bit-identity. The diagnostics reduction uses u32-bitcast atomicMax only
// (order-independent) plus a fixed-tree sum in a dedicated buffer.

struct Uni {
  n: u32,            // grid size per axis (power of two)
  half_n2: u32,      // N^2 / 2 (FFT butterflies per pass)
  r_coef: f32,       // alpha*dt/dx^2 (the FTCS r; dx = dy)
  dt: f32,
  bc_kind: u32,      // 0 = periodic, 1 = dirichlet
  wall_value: f32,
  use_material: u32, // 1 = per-cell alpha buffer (conservative face flux)
  alpha: f32,        // constant-path alpha (material path uses alphaCell)
  dx: f32,
  source_scale: f32, // multiplies the source buffer (0 disables)
  brush_x: f32,      // brush/moving-source splat center (grid units)
  brush_y: f32,
  brush_sigma: f32,  // grid units
  brush_power: f32,  // heat deposited per second (splat integrates dt)
  brush_kind: u32,   // 0 = off, 1 = add heat to T, 2 = write into source
  _pad0: u32,
}

struct PassU {
  axis: u32,   // 0: lines along x (stride n), 1: lines along y (stride 1)
  stage: u32,
  dir: f32,    // -1 forward, +1 inverse
  norm: f32,   // multiply output by this on from_complex (1/N^2 after inverse)
}

@group(0) @binding(0) var<uniform> U: Uni;
@group(0) @binding(1) var<storage, read_write> tA: array<f32>;    // T ping
@group(0) @binding(2) var<storage, read_write> tB: array<f32>;    // T pong
// aux.x = source field, aux.y = per-cell material alpha (interleaved so the
// compute stage stays within WebGPU's DEFAULT 8-storage-buffers-per-stage
// limit — no requiredLimits divergence across adapters)
@group(0) @binding(3) var<storage, read_write> aux: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> cA: array<vec2<f32>>; // complex ping
@group(0) @binding(5) var<storage, read_write> cB: array<vec2<f32>>; // complex pong
@group(0) @binding(6) var<storage, read> decayMul: array<f32>;    // committed f64->f32 table
@group(0) @binding(7) var<storage, read_write> stats: array<atomic<u32>>; // [0] max|T| [1] nan flag [2] maxT [3] minT(bits of -T)
@group(0) @binding(8) var<storage, read_write> spectrumMag: array<f32>;  // log-magnitude for the spectrum view

@group(1) @binding(0) var<uniform> P: PassU;

fn idx2(x: u32, y: u32) -> u32 {
  return x * U.n + y;
}

// ---------------------------------------------------------------------------
// Precision trig + Stockham butterfly core: SHARED (spec-ref § 5.2 precision
// rule; operator decision 5 executed — common/common-web/src/fft-wgsl.ts,
// spliced by solver.ts at pipeline creation, never forked). The hazard note
// (Vulkan builtin sin/cos 2^-11 floor, the schrodinger-smoke 63x lavapipe
// measurement) lives with the shared code.
// ---------------------------------------------------------------------------
//__COMMON_FFT__

// ---------------------------------------------------------------------------
// FTCS steppers (tA -> tB). One dispatch per substep (WebGPU has no
// cross-workgroup sync inside a dispatch — spec-ref § 5.3).
// ---------------------------------------------------------------------------

@compute @workgroup_size(16, 8)
fn ftcs_step(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  let np = U.n;
  let c = tA[idx2(g.x, g.y)];

  var txp: f32;
  var txm: f32;
  var typ: f32;
  var tym: f32;
  if (U.bc_kind == 0u) {
    txp = tA[idx2((g.x + 1u) % np, g.y)];
    txm = tA[idx2((g.x + np - 1u) % np, g.y)];
    typ = tA[idx2(g.x, (g.y + 1u) % np)];
    tym = tA[idx2(g.x, (g.y + np - 1u) % np)];
  } else {
    txp = select(U.wall_value, tA[idx2(min(g.x + 1u, np - 1u), g.y)], g.x + 1u < np);
    txm = select(U.wall_value, tA[idx2(max(g.x, 1u) - 1u, g.y)], g.x > 0u);
    typ = select(U.wall_value, tA[idx2(g.x, min(g.y + 1u, np - 1u))], g.y + 1u < np);
    tym = select(U.wall_value, tA[idx2(g.x, max(g.y, 1u) - 1u)], g.y > 0u);
  }

  var v: f32;
  if (U.use_material == 1u) {
    // Conservative face flux with harmonic-mean face diffusivity
    // (reference.material_flux_step twin; alpha folded into r per face).
    let a = aux[idx2(g.x, g.y)].y;
    let axp = aux[idx2((g.x + 1u) % np, g.y)].y;
    let axm = aux[idx2((g.x + np - 1u) % np, g.y)].y;
    let ayp = aux[idx2(g.x, (g.y + 1u) % np)].y;
    let aym = aux[idx2(g.x, (g.y + np - 1u) % np)].y;
    let hxp = 2.0 * a * axp / max(a + axp, 1e-20);
    let hxm = 2.0 * a * axm / max(a + axm, 1e-20);
    let hyp = 2.0 * a * ayp / max(a + ayp, 1e-20);
    let hym = 2.0 * a * aym / max(a + aym, 1e-20);
    let rr = U.dt / (U.dx * U.dx);
    v = c + rr * (hxp * (txp - c) - hxm * (c - txm) + hyp * (typ - c) - hym * (c - tym));
  } else {
    v = c + U.r_coef * (txp - 2.0 * c + txm) + U.r_coef * (typ - 2.0 * c + tym);
  }
  v = v + U.dt * U.source_scale * aux[idx2(g.x, g.y)].x;

  if (U.bc_kind == 1u && (g.x == 0u || g.y == 0u || g.x == np - 1u || g.y == np - 1u)) {
    v = U.wall_value;
  }
  tB[idx2(g.x, g.y)] = v;
}

// ---------------------------------------------------------------------------
// DuFort-Frankel 3-level kernel — NEGATIVE-LESSON mode, ungated (spec § 3.6):
// at dt = O(dx) the scheme converges to a telegraph-type equation, not the
// heat equation. u^{n-1} lives in cA.x (the complex ping is idle in DFF
// mode — DFF and the spectrum view are mutually exclusive), u^n in tA;
// writes u^{n+1} to tB and parks u^n in cB.x — the host swaps BOTH pings.
// Bootstrap: to_complex (copies u^0 into cA.x) + one FTCS step.
// ---------------------------------------------------------------------------

@compute @workgroup_size(16, 8)
fn dff_step(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  let np = U.n;
  let i = idx2(g.x, g.y);
  let curr = tA[i];
  let prev = cA[i].x;
  let txp = tA[idx2((g.x + 1u) % np, g.y)];
  let txm = tA[idx2((g.x + np - 1u) % np, g.y)];
  let typ = tA[idx2(g.x, (g.y + 1u) % np)];
  let tym = tA[idx2(g.x, (g.y + np - 1u) % np)];
  let r = U.r_coef;
  let next = ((1.0 - 4.0 * r) * prev + 2.0 * r * (txp + txm + typ + tym)) / (1.0 + 4.0 * r);
  tB[i] = next;
  cB[i] = vec2<f32>(curr, 0.0);
}

// ---------------------------------------------------------------------------
// Stockham radix-2 FFT, 2D-batched (port of isf_core.wgsl fft_pass_sc from
// 3D to 2D). Fixed pass order; twiddle |angle| < 2*pi so the poly trig is
// well-conditioned; the LARGE-exponent tables (decayMul) are precomputed.
// ---------------------------------------------------------------------------

fn coord_of(line_id: u32, e: u32) -> u32 {
  if (P.axis == 0u) { return idx2(e, line_id); }
  return idx2(line_id, e);
}

@compute @workgroup_size(128)
fn fft_pass(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.half_n2) { return; }
  let half_line = U.n / 2u;
  let line_id = g.x / half_line;
  let t = g.x % half_line;
  let fb = fft_butterfly(t, P.stage, half_line, P.dir);
  let va = cA[coord_of(line_id, fb.ea)];
  let vb = cmul(fb.w, cA[coord_of(line_id, fb.eb)]);
  cB[coord_of(line_id, fb.ec)] = va + vb;
  cB[coord_of(line_id, fb.ed)] = va - vb;
}

@compute @workgroup_size(128)
fn copy_c_b_to_a(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  cA[g.x] = cB[g.x];
}

@compute @workgroup_size(128)
fn to_complex(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  cA[g.x] = vec2<f32>(tA[g.x], 0.0);
}

// from_complex: writes the (normalized) real part back into tA and refreshes
// the spectrum-view magnitude ONLY when norm != 1 is not enough to tell —
// magnitude capture happens in spectral_mul (post-forward-FFT).
@compute @workgroup_size(128)
fn from_complex(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  tA[g.x] = cA[g.x].x * P.norm;
}

// Per-mode multiply by the COMMITTED decay table (pure mul — spec-ref § 3.2)
// + capture log|That| for the live 2D spectrum view (§ 5.5).
@compute @workgroup_size(128)
fn spectral_mul(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  let v = cA[g.x] * decayMul[g.x];
  cA[g.x] = v;
  spectrumMag[g.x] = log(1.0 + length(v)) ;
}

// Spectrum capture without a solver step (FTCS mode, low cadence).
@compute @workgroup_size(128)
fn spectrum_capture(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  spectrumMag[g.x] = log(1.0 + length(cA[g.x]));
}

// ---------------------------------------------------------------------------
// Brush / moving-source splat (UNGATED interactive path — the gate scene
// never dispatches these).
// ---------------------------------------------------------------------------

@compute @workgroup_size(16, 8)
fn splat(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  if (U.brush_kind == 0u) { return; }
  // Periodic minimum-image distance so laser tracks wrap cleanly.
  let nf = f32(U.n);
  var dxp = abs(f32(g.x) - U.brush_x);
  var dyp = abs(f32(g.y) - U.brush_y);
  dxp = min(dxp, nf - dxp);
  dyp = min(dyp, nf - dyp);
  let r2 = dxp * dxp + dyp * dyp;
  let s2 = U.brush_sigma * U.brush_sigma;
  if (r2 > 12.0 * s2) { return; }
  let amp = U.brush_power / (6.2831853 * s2);
  let dep = amp * exp(-r2 / (2.0 * s2));
  let i = idx2(g.x, g.y);
  if (U.brush_kind == 1u) {
    tA[i] = tA[i] + U.dt * dep;
  } else if (U.brush_kind == 2u) {
    aux[i].x = aux[i].x + dep;
  } else {
    // 3: cool (subtract heat)
    tA[i] = tA[i] - U.dt * dep;
  }
}

@compute @workgroup_size(128)
fn clear_source(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  aux[g.x].x = 0.0;
}

// ---------------------------------------------------------------------------
// Tier-1 diagnostics reduction: u32-bitcast atomic max/min (order-independent
// => deterministic) + NaN flag. Signed floats: flip the bit pattern so the
// unsigned compare orders correctly over negatives.
// ---------------------------------------------------------------------------

fn order_bits(x: f32) -> u32 {
  let b = bitcast<u32>(x);
  return select(b | 0x80000000u, ~b, (b & 0x80000000u) != 0u);
}

@compute @workgroup_size(128)
fn reduce_stats(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  let v = tA[g.x];
  if (v != v) { atomicStore(&stats[1], 1u); }
  atomicMax(&stats[0], bitcast<u32>(abs(v)));
  atomicMax(&stats[2], order_bits(v));
  atomicMax(&stats[3], order_bits(-v));
}
