// Eulerian smoke presentation shader (verification-demo-spec § 4.4).
//
// Presentation-only: reads the solver-owned buffers (velocity, density, dye,
// curl, divergence, pressure, and a frame-indexed density snapshot) through
// read-only bindings and draws one fullscreen triangle. The gate consumes
// buffer readbacks, never pixels — nothing here can perturb it, and no fluid
// math is re-simulated in presentation code.
//
//   view modes: 0 dye (decoupled high-res tracer) · 1 smoke (gated density
//   field) · 2 speed |u| · 3 curl (signed, diverging ramp) · 4 divergence
//   |∇·u| (the § 4.3 residual heatmap) · 5 schlieren |∇density| · 6 pressure
//   - bilinear reconstruction; raw_grid = 1 restores nearest-texel honesty
//   - relief: finite-difference gradient of the displayed field, cheap
//     diffuse + Blinn specular (the Pavel SHADING idea, house v2 form)
//   - activity glow: |density − snapshot| luminesces moving smoke fronts
//   - blue-noise-free dither: tiny hash dither on the tonemapped output to
//     kill banding in dark gradients (self-contained; no external texture)
//   - exposure tonemap + gamma-2.2 encode

struct RP {
  n: f32,          // sim grid side
  dye_n: f32,      // dye grid side
  view_mode: f32,
  raw_grid: f32,
  relief: f32,
  glow: f32,
  exposure: f32,
  gain: f32,       // field gain for density/speed views
  curl_scale: f32, // curl view normalization
  div_scale: f32,  // divergence view normalization
  mask_on: f32,    // draw obstacle mask overlay
  pad0: f32,
  cmap: array<vec4<f32>, 8>,
  cmap_meta: vec4<f32>,
  cmap2: array<vec4<f32>, 8>,
  cmap2_meta: vec4<f32>,
};

@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> vel: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> density: array<f32>;
@group(0) @binding(3) var<storage, read> curl: array<f32>;
@group(0) @binding(4) var<storage, read> divg: array<f32>;
@group(0) @binding(5) var<storage, read> pressure: array<f32>;
@group(0) @binding(6) var<storage, read> dye: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> snap: array<f32>;
@group(0) @binding(8) var<storage, read> mask: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  let xy = p[vi];
  o.pos = vec4<f32>(xy, 0.0, 1.0);
  o.uv = 0.5 * (xy + vec2<f32>(1.0, 1.0)); // 0..1, origin bottom-left (y up = +j)
  return o;
}

fn wrap_i(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

fn sim_idx(i: i32, j: i32) -> u32 {
  let n = i32(rp.n);
  return u32(wrap_i(i, n)) * u32(rp.n) + u32(wrap_i(j, n));
}

// field selector at sim resolution: 1 smoke · 2 speed · 3 curl · 4 div ·
// 5 schlieren-source(density) · 6 pressure · 7 snapshot(density)
fn field_at(sel: u32, i: i32, j: i32) -> f32 {
  let idx = sim_idx(i, j);
  switch (sel) {
    case 2u: { return length(vel[idx]); }
    case 3u: { return curl[idx]; }
    case 4u: { return abs(divg[idx]); }
    case 6u: { return pressure[idx]; }
    case 7u: { return snap[idx]; }
    default: { return density[idx]; }
  }
}

// bilinear reconstruction at sim-grid coords (cell centers at integer + 0.5),
// periodic — the same wrap the kernel stencils use
fn sample_field(sel: u32, p: vec2<f32>) -> f32 {
  let q = p - vec2<f32>(0.5, 0.5);
  let i0 = i32(floor(q.x));
  let j0 = i32(floor(q.y));
  let f = q - vec2<f32>(floor(q.x), floor(q.y));
  let a = field_at(sel, i0, j0);
  let b = field_at(sel, i0 + 1, j0);
  let c = field_at(sel, i0, j0 + 1);
  let d = field_at(sel, i0 + 1, j0 + 1);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

fn dye_at(i: i32, j: i32) -> vec4<f32> {
  let n = i32(rp.dye_n);
  return dye[u32(wrap_i(i, n)) * u32(rp.dye_n) + u32(wrap_i(j, n))];
}

fn sample_dye(p: vec2<f32>) -> vec4<f32> {
  let q = p - vec2<f32>(0.5, 0.5);
  let i0 = i32(floor(q.x));
  let j0 = i32(floor(q.y));
  let f = q - vec2<f32>(floor(q.x), floor(q.y));
  return mix(mix(dye_at(i0, j0), dye_at(i0 + 1, j0), f.x),
             mix(dye_at(i0, j0 + 1), dye_at(i0 + 1, j0 + 1), f.x), f.y);
}

// tiny hash dither (banding killer; presentation-only)
fn hash12(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, vec3<f32>(p3.y, p3.z, p3.x) + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let n = rp.n;
  // grid coords: x -> i, y -> j (y up; splat pointer mapping matches)
  let p = vec2<f32>(in.uv.x, in.uv.y) * n;
  let view = u32(rp.view_mode);
  let raw = rp.raw_grid > 0.5;

  var col: vec3<f32>;
  var shade_sel = 1u; // field driving relief lighting

  if (view == 0u) {
    // dye view — the decoupled high-res tracer, straight RGB
    let pd = vec2<f32>(in.uv.x, in.uv.y) * rp.dye_n;
    var c: vec4<f32>;
    if (raw) {
      c = dye_at(i32(clamp(pd.x, 0.0, rp.dye_n - 0.001)), i32(clamp(pd.y, 0.0, rp.dye_n - 0.001)));
    } else {
      c = sample_dye(pd);
    }
    col = c.rgb;
    shade_sel = 1u;
  } else if (view == 3u) {
    // signed curl through the diverging pairing: primary(+) / secondary(−)
    var w: f32;
    if (raw) {
      w = field_at(3u, i32(clamp(p.x, 0.0, n - 0.001)), i32(clamp(p.y, 0.0, n - 0.001)));
    } else {
      w = sample_field(3u, p);
    }
    let t = clamp(w * rp.curl_scale, -1.0, 1.0);
    if (t >= 0.0) { col = cmap_sample(t); } else { col = cmap2_sample(-t); }
    shade_sel = 3u;
  } else if (view == 5u) {
    // schlieren: |∇density| magnitude (wind-tunnel look), data-derived
    let e = 0.75;
    let gx = (sample_field(1u, p + vec2<f32>(e, 0.0)) - sample_field(1u, p - vec2<f32>(e, 0.0))) / (2.0 * e);
    let gy = (sample_field(1u, p + vec2<f32>(0.0, e)) - sample_field(1u, p - vec2<f32>(0.0, e))) / (2.0 * e);
    col = cmap_sample(clamp(sqrt(gx * gx + gy * gy) * rp.gain * 4.0, 0.0, 1.0));
    shade_sel = 1u;
  } else {
    var sel = 1u;
    var scale = rp.gain;
    if (view == 2u) { sel = 2u; }
    if (view == 4u) { sel = 4u; scale = rp.div_scale; }
    if (view == 6u) { sel = 6u; }
    var f: f32;
    if (raw) {
      f = field_at(sel, i32(clamp(p.x, 0.0, n - 0.001)), i32(clamp(p.y, 0.0, n - 0.001)));
    } else {
      f = sample_field(sel, p);
    }
    if (view == 6u) {
      // pressure is signed: diverging pairing like curl
      let t = clamp(f * scale, -1.0, 1.0);
      if (t >= 0.0) { col = cmap_sample(t); } else { col = cmap2_sample(-t); }
    } else {
      col = cmap_sample(clamp(f * scale, 0.0, 1.0));
    }
    shade_sel = sel;
  }

  if (!raw) {
    // relief: gradient-lit emboss of the displayed field (Pavel SHADING idea)
    if (rp.relief > 0.001) {
      let e = 0.75;
      let gx = (sample_field(shade_sel, p + vec2<f32>(e, 0.0)) - sample_field(shade_sel, p - vec2<f32>(e, 0.0))) / (2.0 * e);
      let gy = (sample_field(shade_sel, p + vec2<f32>(0.0, e)) - sample_field(shade_sel, p - vec2<f32>(0.0, e))) / (2.0 * e);
      let hs = rp.relief * 30.0;
      let nrm = normalize(vec3<f32>(-gx * hs, -gy * hs, 1.0));
      let light = normalize(vec3<f32>(-0.45, -0.55, 0.62));
      let half_v = normalize(light + vec3<f32>(0.0, 0.0, 1.0));
      let ambient = mix(1.0, 0.42, rp.relief);
      let diffuse = max(dot(nrm, light), 0.0);
      let spec = pow(max(dot(nrm, half_v), 0.0), 24.0);
      col = col * (ambient + (1.0 - ambient) * diffuse * 1.6)
          + vec3<f32>(0.9, 0.95, 1.0) * spec * rp.relief * 0.25;
    }
    // activity glow: |density − snapshot| — moving smoke fronts luminesce
    if (rp.glow > 0.001) {
      let act = abs(sample_field(1u, p) - sample_field(7u, p));
      col += rp.glow * min(act * 20.0, 1.0) * cmap_sample(0.9);
    }
  }

  // obstacle mask overlay (Kármán scene): solid cells as a flat slate
  if (rp.mask_on > 0.5) {
    let m = mask[sim_idx(i32(p.x), i32(p.y))];
    col = mix(col, vec3<f32>(0.22, 0.25, 0.3), clamp(m, 0.0, 1.0) * 0.9);
  }

  // exposure tonemap + hash dither + gamma-2.2 encode
  var mapped = vec3<f32>(1.0) - exp(-col * rp.exposure);
  mapped += (hash12(in.pos.xy) - 0.5) * (1.0 / 255.0);
  return vec4<f32>(pow(clamp(mapped, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2)), 1.0);
}
