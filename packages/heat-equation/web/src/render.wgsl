// heat-equation — uber-composite render pass (spec-ref § 5.5).
//
// ONE fullscreen fragment pass reads the temperature field once and selects
// layers by uniform flags (coherent branches, no pipeline-permutation
// explosion, no repeated field traffic — the "many effects at once is a
// budget" architecture). Every layer reads the SAME gated state buffer; no
// separate fake simulation (the physics-honest color contract).
//
// Layers: perceptual colormap / IR palettes (shared colormap facility,
// packed stops), committed Planck-locus blackbody glow (golden F LUT — the
// physically-derived glow), fwidth-antialiased fragment isolines (IQ
// filterable-procedurals; no marching squares), analytic error heatmap
// (Fourier template: CPU-f64 premultiplied mode amplitudes, poly trig),
// Horn-style gradient relief, and the live 2D spectrum inset with predicted
// iso-decay ellipses (log|That| from the solver's own FFT).
//
// The analytic-overlay trig uses the SAME poly kernels as the compute core:
// builtin sin/cos carry a 2^-11 floor that would visually swamp the ~1e-5
// real f32 error the heatmap exists to show.

struct RenderU {
  n: f32,
  flags: u32,        // 1 iso | 2 glow | 4 relief | 8 spectrum | 16 errmap
                     // | 32 material tint | 64 raw texel
  t_lo: f32,         // display normalization range (CPU-updated from stats)
  t_hi: f32,
  iso_levels: f32,
  kelvin_offset: f32, // K = kelvin_offset + kelvin_scale * T
  kelvin_scale: f32,
  glow_gain: f32,
  err_scale: f32,     // error heatmap: full scale at |err| = err_scale
  spec_alpha_t: f32,  // alpha * t for the predicted iso-decay ellipses
  offset0: f32,       // analytic overlay: constant offset
  n_modes: f32,       // analytic overlay: active mode count (0 disables)
  modes: array<vec4<f32>, 3>, // (m, k, premultiplied amplitude, 0) — f64 CPU
  cmap_stops: array<vec4<f32>, 8>,
  cmap_meta: vec4<f32>, // x = stop count
  lut_meta: vec4<f32>,  // x = lut length, y = t_min_K, z = t_step_K
}

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> field: array<f32>;
@group(0) @binding(2) var<storage, read> spectrum: array<f32>;
@group(0) @binding(3) var<storage, read> bbLut: array<vec4<f32>>; // linear sRGB, golden F stops
@group(0) @binding(4) var<storage, read> matAux: array<vec2<f32>>; // .x source, .y alpha

//__CMAP_FN__

// --- poly trig (same kernels as heat_core.wgsl; see precision note above) ---
fn sin_poly4(r: f32) -> f32 {
  let r2 = r * r;
  return r * (1.0 + r2 * (-0.16666667 + r2 * (0.0083333310 - r2 * 0.00019840874)));
}
fn cos_poly4(r: f32) -> f32 {
  let r2 = r * r;
  return 1.0 + r2 * (-0.5 + r2 * (0.041666668 + r2 * (-0.0013888889 + r2 * 0.000024801587)));
}
fn sin_p(x: f32) -> f32 {
  let k = round(x * 0.6366197723675814);
  let r = x - k * 1.5707963267948966;
  let q = i32(k) & 3;
  let s = sin_poly4(r);
  let c = cos_poly4(r);
  if (q == 0) { return s; }
  if (q == 1) { return c; }
  if (q == 2) { return -s; }
  return -c;
}

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_full(@builtin(vertex_index) vi: u32) -> VOut {
  var out: VOut;
  let x = f32(i32(vi & 1u) * 4 - 1);
  let y = f32(i32(vi >> 1u) * 4 - 1);
  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = vec2<f32>(x, y) * 0.5 + 0.5;
  return out;
}

fn fetch(ix: i32, iy: i32) -> f32 {
  let n = i32(R.n);
  let x = (ix % n + n) % n;
  let y = (iy % n + n) % n;
  return field[u32(x) * u32(R.n) + u32(y)];
}

fn sample_bilinear(uv: vec2<f32>) -> f32 {
  let p = uv * R.n - 0.5;
  let i0 = vec2<i32>(floor(p));
  let f = p - floor(p);
  let a = fetch(i0.x, i0.y);
  let b = fetch(i0.x + 1, i0.y);
  let c = fetch(i0.x, i0.y + 1);
  let d = fetch(i0.x + 1, i0.y + 1);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

fn blackbody(kelvin: f32) -> vec3<f32> {
  let idx = clamp((kelvin - R.lut_meta.y) / R.lut_meta.z, 0.0, R.lut_meta.x - 1.001);
  let i = u32(floor(idx));
  let f = idx - floor(idx);
  return mix(bbLut[i].rgb, bbLut[i + 1u].rgb, f);
}

fn gamma_encode(c: vec3<f32>) -> vec3<f32> {
  // IEC 61966-2-1 forward transfer
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}

@fragment
fn fs_composite(in: VOut) -> @location(0) vec4<f32> {
  // sim field uses (x*n + y) with x = row; map uv.x -> x, uv.y -> y (flip y up)
  let uv = vec2<f32>(in.uv.x, 1.0 - in.uv.y);
  let t_raw = sample_bilinear(uv);
  let t_norm = clamp((t_raw - R.t_lo) / max(R.t_hi - R.t_lo, 1e-20), 0.0, 1.0);

  // Derivatives MUST be evaluated in uniform control flow (WGSL rule): all
  // fwidth() calls are hoisted here, consumed inside the layer branches.
  let iso_v = t_norm * R.iso_levels;
  let iso_w = fwidth(iso_v);
  let box0 = vec2<f32>(0.64, 0.02);
  let box1 = vec2<f32>(0.98, 0.36);
  let suv = (in.uv - box0) / (box1 - box0);
  let fk = (suv - 0.5) * R.n; // signed mode index in the spectrum inset
  let k2 = (fk.x * fk.x + fk.y * fk.y) * 39.478417604357434; // (2pi)^2
  let rings = R.spec_alpha_t * k2 / 2.302585;
  let rings_w = fwidth(rings);

  var rgb: vec3<f32>;
  if ((R.flags & 64u) != 0u) {
    rgb = vec3<f32>(t_norm); // raw/honest texel
  } else {
    rgb = cmap_sample(t_norm);
  }

  // material tint (circuit template): darken insulator, brush metal
  if ((R.flags & 32u) != 0u) {
    let n = u32(R.n);
    let gx = min(u32(uv.x * R.n), n - 1u);
    let gy = min(u32(uv.y * R.n), n - 1u);
    let a = matAux[gx * n + gy].y;
    let rel = clamp(a / 0.05, 0.0, 1.0);
    rgb = rgb * (0.55 + 0.45 * rel);
  }

  // analytic error heatmap (replaces the base when enabled)
  if ((R.flags & 16u) != 0u && R.n_modes > 0.0) {
    var exact = R.offset0;
    for (var m = 0u; m < 3u; m++) {
      if (f32(m) >= R.n_modes) { break; }
      let mm = R.modes[m];
      exact += mm.z * sin_p(6.283185307179586 * mm.x * uv.x) * sin_p(6.283185307179586 * mm.y * uv.y);
    }
    let err = abs(t_raw - exact) / R.err_scale;
    // log-ish ramp: 0 at err=0, saturates at err_scale
    rgb = cmap_sample(clamp(sqrt(err), 0.0, 1.0));
  }

  // relief (Horn-style lambert shade on the temperature "height field")
  if ((R.flags & 4u) != 0u) {
    let e = 1.0 / R.n;
    let gx = (sample_bilinear(uv + vec2<f32>(e, 0.0)) - sample_bilinear(uv - vec2<f32>(e, 0.0))) / (2.0 * e);
    let gy = (sample_bilinear(uv + vec2<f32>(0.0, e)) - sample_bilinear(uv - vec2<f32>(0.0, e))) / (2.0 * e);
    let h = 0.15 / max(R.t_hi - R.t_lo, 1e-20);
    let nrm = normalize(vec3<f32>(-gx * h, -gy * h, 1.0));
    let shade = clamp(dot(nrm, normalize(vec3<f32>(-0.5, 0.35, 0.8))), 0.0, 1.0);
    rgb = rgb * (0.45 + 0.65 * shade);
  }

  // fwidth-antialiased isolines (IQ filterable procedurals)
  if ((R.flags & 1u) != 0u) {
    let d = abs(fract(iso_v) - 0.5);
    let line = 1.0 - smoothstep(0.5 * iso_w, 1.5 * iso_w, d);
    rgb = mix(rgb, vec3<f32>(0.02, 0.02, 0.03), line * 0.55);
  }

  // committed Planck-locus blackbody glow (additive, physically-derived hue;
  // relative Stefan-Boltzmann T^4 emphasis)
  if ((R.flags & 2u) != 0u) {
    let kelvin = R.kelvin_offset + R.kelvin_scale * t_raw;
    if (kelvin > R.lut_meta.y) {
      // relative Stefan-Boltzmann emphasis, normalized at 1500 K so the
      // incandescent range (LUT floor 800 K .. ~3000 K) actually glows
      let rel = kelvin / 1500.0;
      let intensity = R.glow_gain * rel * rel * rel * rel;
      rgb += blackbody(kelvin) * intensity;
    }
  }

  // live 2D spectrum inset (bottom-right 34%): log|That| + predicted
  // iso-decay ellipses alpha*|k|^2*t = const (circles in k, fftshifted)
  if ((R.flags & 8u) != 0u) {
    let inBox = in.uv.x > box0.x && in.uv.x < box1.x && in.uv.y > box0.y && in.uv.y < box1.y;
    if (inBox) {
      let n = u32(R.n);
      // fftshift: center of the box = k = 0
      let kx = (u32(clamp(suv.x, 0.0, 0.999) * R.n) + n / 2u) % n;
      let ky = (u32(clamp(suv.y, 0.0, 0.999) * R.n) + n / 2u) % n;
      let mag = spectrum[kx * n + ky];
      var srgbv = vec3<f32>(0.04, 0.05, 0.08) + cmap_sample(clamp(mag * 0.12, 0.0, 1.0)) * 0.95;
      // predicted iso-decay rings: alpha*|k|^2*t in units of ln(10) decades
      let rd = abs(fract(rings) - 0.5);
      let ring = 1.0 - smoothstep(0.5 * rings_w, 1.5 * rings_w, rd);
      srgbv = mix(srgbv, vec3<f32>(1.0, 0.85, 0.3), ring * 0.35 * step(rings, 12.0));
      rgb = mix(rgb, srgbv, 0.92);
    }
  }

  return vec4<f32>(gamma_encode(clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0))), 1.0);
}

// ---------------------------------------------------------------------------
// Heat-flux arrows: line-list pass over a decimated grid; each instance is a
// shaft segment along -grad T (data-derived, no separate ODE — spec § 5.5).
// ---------------------------------------------------------------------------

struct AVOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) tint: f32,
}

@vertex
fn vs_arrows(@builtin(vertex_index) vi: u32, @builtin(instance_index) inst: u32) -> AVOut {
  let grid = 24u;
  let gx = inst % grid;
  let gy = inst / grid;
  let uv = (vec2<f32>(f32(gx), f32(gy)) + 0.5) / f32(grid);
  let n = i32(R.n);
  let ix = i32(uv.x * R.n);
  let iy = i32(uv.y * R.n);
  let e = 1.0 / R.n;
  let tx1 = field[u32((ix + 1) % n) * u32(R.n) + u32(iy)];
  let tx0 = field[u32((ix + n - 1) % n) * u32(R.n) + u32(iy)];
  let ty1 = field[u32(ix) * u32(R.n) + u32((iy + 1) % n)];
  let ty0 = field[u32(ix) * u32(R.n) + u32((iy + n - 1) % n)];
  var flux = -vec2<f32>(tx1 - tx0, ty1 - ty0) / (2.0 * e); // -grad T
  let mag = length(flux);
  let span = max(R.t_hi - R.t_lo, 1e-20);
  let len = 0.85 * min(mag * 0.35 / (span * R.n), 1.0) / f32(grid);
  var dir = vec2<f32>(0.0);
  if (mag > 1e-12) { dir = flux / mag; }
  let tip = uv + dir * len * f32(vi); // vi 0 = base, 1 = tip
  var out: AVOut;
  // uv (x=row axis pointing right, y up): match composite mapping
  let clip = vec2<f32>(tip.x * 2.0 - 1.0, (1.0 - tip.y) * -2.0 + 1.0);
  out.pos = vec4<f32>(clip, 0.0, 1.0);
  out.tint = min(mag / (span * R.n * 0.5), 1.0);
  return out;
}

@fragment
fn fs_arrows(in: AVOut) -> @location(0) vec4<f32> {
  return vec4<f32>(0.95, 0.97, 1.0, 0.28 + 0.5 * in.tint);
}
