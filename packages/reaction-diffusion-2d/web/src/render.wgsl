// Gray-Scott presentation shader v2 (verification-demo-spec § 3.4).
//
// Presentation-only: reads the kernel-owned state buffer (and a render-owned
// snapshot copy of it) through read-only bindings and draws one fullscreen
// triangle. The gate consumes buffer readbacks, never pixels, so nothing here
// can perturb it. Everything below derives strictly from data already in the
// buffers — no reaction-diffusion math is re-implemented in presentation code.
//
//   - bilinear reconstruction of the 128² field (raw_grid = 1 restores the
//     honest nearest-cell texel view: "what the buffer actually holds")
//   - channel views: V through the primary colormap, U through the secondary,
//     or a duotone composite (V primary + consumed-U secondary)
//   - gradient-lit relief: finite-difference gradient of the displayed field
//     drives cheap diffuse + Blinn specular emboss
//   - activity glow: |field − snapshot| (the snapshot is a frame-indexed
//     copyBufferToBuffer of the same state buffer) luminesces living fronts
//   - exposure tonemap + gamma encode (colormap stops arrive linearized from
//     common-web/src/colormap.ts; cmap_sample/cmap2_sample are appended at
//     pipeline build by emitColormapWgsl)

struct RP {
  n: f32,          // grid size (cells per side)
  view_mode: f32,  // 0 = V field · 1 = U field · 2 = duotone composite
  raw_grid: f32,   // 1 = nearest-cell texels, lighting/glow bypassed
  relief: f32,     // 0..1 gradient-lit relief strength
  glow: f32,       // 0..1 activity glow gain
  exposure: f32,   // tonemap exposure
  gain: f32,       // V-channel colormap gain
  _pad0: f32,
  cmap: array<vec4<f32>, 8>,
  cmap_meta: vec4<f32>,
  cmap2: array<vec4<f32>, 8>,
  cmap2_meta: vec4<f32>,
};

@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> state: array<f32>;
@group(0) @binding(2) var<storage, read> snap: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  // Oversized triangle covering the viewport.
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  let xy = p[vi];
  o.pos = vec4<f32>(xy, 0.0, 1.0);
  o.uv = 0.5 * (xy + vec2<f32>(1.0, 1.0)); // 0..1, origin bottom-left
  return o;
}

fn wrap_i(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

fn cell_of(buf_sel: u32, i: i32, j: i32, ch: u32) -> f32 {
  let n = i32(rp.n);
  let idx = (u32(wrap_i(j, n)) * u32(rp.n) + u32(wrap_i(i, n))) * 2u + ch;
  if (buf_sel == 1u) { return snap[idx]; }
  return state[idx];
}

// Bilinear reconstruction at grid coords p (cell centers at integer + 0.5),
// periodic in both axes — the same wrap the kernel's stencil uses.
fn sample_field(buf_sel: u32, p: vec2<f32>, ch: u32) -> f32 {
  let q = p - vec2<f32>(0.5, 0.5);
  let i0 = i32(floor(q.x));
  let j0 = i32(floor(q.y));
  let f = q - vec2<f32>(floor(q.x), floor(q.y));
  let a = cell_of(buf_sel, i0, j0, ch);
  let b = cell_of(buf_sel, i0 + 1, j0, ch);
  let c = cell_of(buf_sel, i0, j0 + 1, ch);
  let d = cell_of(buf_sel, i0 + 1, j0 + 1, ch);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let n = rp.n;
  // screen top = grid row 0 (matches the cursor-seed pointerToCell mapping)
  let p = vec2<f32>(in.uv.x, 1.0 - in.uv.y) * n;
  let view = u32(rp.view_mode);
  let raw = rp.raw_grid > 0.5;

  var u: f32;
  var v: f32;
  if (raw) {
    let i = i32(clamp(p.x, 0.0, n - 0.001));
    let j = i32(clamp(p.y, 0.0, n - 0.001));
    u = cell_of(0u, i, j, 0u);
    v = cell_of(0u, i, j, 1u);
  } else {
    u = sample_field(0u, p, 0u);
    v = sample_field(0u, p, 1u);
  }

  // channel views — V is the pattern carrier; U's depletion mirrors it
  var col: vec3<f32>;
  if (view == 1u) {
    col = cmap2_sample(u);
  } else if (view == 2u) {
    col = cmap_sample(v * rp.gain) + 0.3 * cmap2_sample(clamp(1.0 - u, 0.0, 1.0));
  } else {
    col = cmap_sample(v * rp.gain);
  }

  // The raw view is the honesty escape hatch: exact texels, no lighting, no
  // glow — only exposure/gamma so the two views stay comparable.
  if (!raw) {
    // gradient-lit relief from the displayed field's finite-difference slope
    if (rp.relief > 0.001) {
      let ch = select(1u, 0u, view == 1u);
      let e = 0.75;
      let gx = (sample_field(0u, p + vec2<f32>(e, 0.0), ch) - sample_field(0u, p - vec2<f32>(e, 0.0), ch)) / (2.0 * e);
      let gy = (sample_field(0u, p + vec2<f32>(0.0, e), ch) - sample_field(0u, p - vec2<f32>(0.0, e), ch)) / (2.0 * e);
      let hs = rp.relief * 40.0;
      let nrm = normalize(vec3<f32>(-gx * hs, -gy * hs, 1.0));
      let light = normalize(vec3<f32>(-0.45, -0.55, 0.62));
      let half_v = normalize(light + vec3<f32>(0.0, 0.0, 1.0));
      let ambient = mix(1.0, 0.38, rp.relief);
      let diffuse = max(dot(nrm, light), 0.0);
      let spec = pow(max(dot(nrm, half_v), 0.0), 24.0);
      col = col * (ambient + (1.0 - ambient) * diffuse * 1.6)
          + vec3<f32>(0.9, 0.95, 1.0) * spec * rp.relief * 0.3;
    }
    // activity glow: fronts are alive — |V − V_snapshot| in the companion hue
    if (rp.glow > 0.001) {
      let act = abs(v - sample_field(1u, p, 1u));
      col += rp.glow * min(act * 28.0, 1.0) * cmap2_sample(0.82);
    }
  }

  // exposure tonemap + gamma-2.2 encode (stops are linear-light)
  let mapped = vec3<f32>(1.0) - exp(-col * rp.exposure);
  return vec4<f32>(pow(mapped, vec3<f32>(1.0 / 2.2)), 1.0);
}
