// Shared WGSL fragments for gated spectral math (Stockham radix-2 FFT core
// + precision polynomial trig). Promoted from packages/schrodinger-smoke
// (3D ISF) and packages/heat-equation (2D heat) per heat-equation spec-ref
// § 13.2 operator decision 5 — two consumers, one kernel, never forked.
//
// Consumers splice `FFT_COMMON_WGSL` into their compute source at a
// `//__COMMON_FFT__` marker (the colormap emitColormapWgsl pattern) and keep
// their own coord mapping (2D vs 3D line addressing) and buffer types. The
// spliced text is byte-stable: both sims' gates are run-twice byte-identical
// and their gated numerics must not move when this file changes — treat any
// edit here as a gated-numerics change and re-run both web gates.

/**
 * Precision trig (load-bearing, CI-measured): the Vulkan/WGSL spec only
 * guarantees builtin sin/cos to 2^-11 (~4.9e-4) ABSOLUTE error on [-pi, pi]
 * (and nothing outside), and llvmpipe/lavapipe implements exactly that floor
 * — schrodinger-smoke measured in-shader builtin trig accumulating to a
 * 1.26e-2 field error over its 24-step gate (63x the [defaults.isf] budget,
 * run-twice still byte-identical) while RADV's hardware trig masked it.
 * Every trig call in a GATED path uses these range-reduced polynomial forms
 * (~1e-7 abs — Taylor to r^7/r^8 after quadrant reduction), which are
 * deterministic per device AND uniformly accurate across drivers.
 */
export const FFT_PRECISION_TRIG_WGSL = `
fn sin_poly4(r: f32) -> f32 {
  // |r| <= pi/4
  let r2 = r * r;
  return r * (1.0 + r2 * (-0.16666667 + r2 * (0.0083333310 - r2 * 0.00019840874)));
}

fn cos_poly4(r: f32) -> f32 {
  // |r| <= pi/4
  let r2 = r * r;
  return 1.0 + r2 * (-0.5 + r2 * (0.041666668 + r2 * (-0.0013888889 + r2 * 0.000024801587)));
}

// returns vec2(cos x, sin x) with quadrant reduction (accurate for |x| <~ 64)
fn cs_p(x: f32) -> vec2<f32> {
  let k = round(x * 0.6366197723675814); // x / (pi/2)
  let r = x - k * 1.5707963267948966;
  let q = i32(k) & 3;
  let s = sin_poly4(r);
  let c = cos_poly4(r);
  if (q == 0) { return vec2<f32>(c, s); }
  if (q == 1) { return vec2<f32>(-s, c); }
  if (q == 2) { return vec2<f32>(-c, -s); }
  return vec2<f32>(s, -c);
}
`;

/**
 * Stockham radix-2 butterfly core (Lloyd et al., MSR TR-2008-62: autosort —
 * no bit-reversal, fixed ping-pong pass order = the determinism property).
 * With L = 2^(stage+1), Ls = L/2:
 *   out[i*L + j]      = in[i*Ls + j] + w * in[i*Ls + j + N/2]
 *   out[i*L + j + Ls] = in[i*Ls + j] - w * in[i*Ls + j + N/2]
 *   w = exp(dir * 2*pi*i * j / L)
 * Twiddle |angle| < 2*pi so the poly trig is well-conditioned; LARGE-exponent
 * / large-angle multiplier tables must stay CPU-f64-precomputed buffers.
 * Element indices are line-local; the host maps them into its 2D/3D buffers
 * via its own coord_of().
 */
export const FFT_BUTTERFLY_WGSL = `
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

struct FftButterfly {
  ea: u32,  // input element a (line-local)
  eb: u32,  // input element b
  ec: u32,  // output element c
  ed: u32,  // output element d
  w: vec2<f32>,
}

fn fft_butterfly(t: u32, stage: u32, half_line: u32, dir: f32) -> FftButterfly {
  let ls = 1u << stage;       // half butterfly span
  let l = ls << 1u;
  let j = t % ls;
  let i = t / ls;
  let ang = dir * 6.283185307179586 * f32(j) / f32(l);
  var out: FftButterfly;
  out.ea = i * ls + j;
  out.eb = i * ls + j + half_line;
  out.ec = i * l + j;
  out.ed = i * l + j + ls;
  out.w = cs_p(ang);
  return out;
}
`;

/** The full splice for `//__COMMON_FFT__` markers. */
export const FFT_COMMON_WGSL = FFT_PRECISION_TRIG_WGSL + FFT_BUTTERFLY_WGSL;
