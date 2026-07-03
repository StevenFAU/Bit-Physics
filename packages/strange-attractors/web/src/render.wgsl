// Presentation render of the Lorenz trajectory — v3 (feature-expansion-spec § 3.1).
//
// Render-side ONLY: every entry point here reads trajectory storage buffers
// read-only and writes color attachments. The capture/gate path reads GPU
// buffers, never pixels, so nothing in this file can perturb it.
//
// Stack per frame (driven by main.ts):
//   1. scene pass (rgba16float, 4x MSAA → resolve): additive ribbon
//      (line-strip) + additive glow sprites (boids quad-decomposition
//      pattern), for the primary trajectory, optional faint wall projections,
//      and — when enabled — the butterfly ghost (paired colormap).
//   2. accum pass: fade the persistent accumulator by the trails
//      blend-constant (fs_fade), then composite the resolved frame in
//      additively (fs_composite). Trails = 0 ⇒ accumulator carries exactly
//      the current frame.
//   3. blit pass: tonemap (exposure + gamma) + vignette to the swapchain
//      (fs_blit), all uniform-driven (BlitU) — background themes included.
//
// Color is physics-honest: every color-by driver derives from the STORED
// states (finite-difference speed, raw z, sample index, wing sign, turn
// angle) — never re-implementing the ODE in presentation code. The ramp is
// the shared common-web colormap block (uniform stops + a data-driven mix()
// chain, cmap_sample, spliced in by the host at module creation) — switching
// maps is a uniform write, never a pipeline rebuild.
//
// Framing is the P-6-ratified display-only camera-fit pattern (boids):
// fit_center/fit_scale are written by the host from low-rate readbacks and
// damped per frame; buffers always hold raw physics values.

struct RU {
  aspect: f32,
  angle: f32,
  n: f32,
  head: f32,               // trace-in front index (drawn - 1)
  fit_center: vec3<f32>,
  fit_scale: f32,
  px: f32,                 // glow sprite half-size, clip units
  gain: f32,
  dt: f32,
  color_mode: f32,         // 0 speed · 1 z-height · 2 age · 3 lobe · 4 curvature
  proj: f32,               // 0 normal · 1 flatten x (YZ) · 2 flatten y (XZ) · 3 flatten z (XY)
  _p0: f32,
  _p1: f32,
  _p2: f32,
  cmap: array<vec4<f32>, 8>,  // packed colormap stops (common-web colormap.ts)
  cmap_meta: vec4<f32>,       // x = stop count
};
@group(0) @binding(0) var<uniform> ru: RU;
@group(0) @binding(1) var<storage, read> traj: array<f32>;

// post-pass resources (separate bindings — no collision with the above)
@group(0) @binding(2) var post_smp: sampler;
@group(0) @binding(3) var post_tex: texture_2d<f32>;
struct BlitU {
  exposure: f32,           // tonemap strength (1.08 = house default)
  vignette: f32,           // corner falloff (0.55 = house default)
  bg_mode: f32,            // 0 additive (deep-space / blueprint) · 1 subtractive (paper ink)
  _pad: f32,
  base: vec4<f32>,         // rgb = background base color
};
@group(0) @binding(4) var<uniform> bu: BlitU;

fn fetch(i: u32) -> vec3<f32> {
  let o = i * 3u;
  return vec3<f32>(traj[o + 0u], traj[o + 1u], traj[o + 2u]);
}

struct View {
  clip: vec3<f32>,
  persp: f32,
  depth_t: f32,
};

// display-only world → clip: fit, optional wall-flatten, orbit, mild
// perspective (camera on +z). Projections flatten one fitted-space axis to a
// wall constant BEFORE the orbit, so the shadow rides the rotating cloud.
fn view_of(p_raw: vec3<f32>) -> View {
  var p = (p_raw - ru.fit_center) * ru.fit_scale;
  let pr = u32(ru.proj);
  if (pr == 1u) { p.x = -0.98; }
  if (pr == 2u) { p.y = -0.98; }
  if (pr == 3u) { p.z = -0.98; }
  let ca = cos(ru.angle);
  let sa = sin(ru.angle);
  let rx = vec3<f32>(p.x * ca - p.z * sa, p.y, p.x * sa + p.z * ca);
  let zc = clamp(rx.z, -1.2, 1.2);
  let persp = 1.55 / (1.55 - zc * 0.9);
  var v: View;
  v.clip = vec3<f32>(rx.x * persp, rx.y * persp, clamp(0.5 - rx.z * 0.3, 0.02, 0.98));
  v.persp = persp;
  v.depth_t = clamp((zc + 1.2) / 2.4, 0.0, 1.0);
  return v;
}

// physics-honest color driver: |Δstate| / dt of adjacent stored samples,
// log-compressed so the slow lobes and fast crossings both read
fn speed_t(i: u32) -> f32 {
  let last = u32(ru.n) - 1u;
  let j = min(i + 1u, last);
  let v = length(fetch(j) - fetch(i)) / ru.dt;
  return clamp(log(1.0 + v) * 0.12, 0.0, 1.0);
}

// color-by driver (feature-expansion-spec § 3.1.b): every mode derives from
// data already in the buffer — no ODE re-implementation in presentation code
fn color_t(i: u32) -> f32 {
  let mode = u32(ru.color_mode);
  if (mode == 1u) {
    // z-height, fit-normalized (raw data z; fitted span ≈ ±0.78)
    let z = (fetch(i).z - ru.fit_center.z) * ru.fit_scale;
    return clamp(0.5 + z * 0.64, 0.0, 1.0);
  }
  if (mode == 2u) {
    // time/age: index along the trajectory
    return f32(i) / max(ru.n - 1.0, 1.0);
  }
  if (mode == 3u) {
    // lobe: which wing (sign of x) — two well-separated ramp samples
    return select(0.18, 0.85, fetch(i).x >= 0.0);
  }
  if (mode == 4u) {
    // curvature: turn angle between adjacent stored segments
    let last = u32(ru.n) - 1u;
    let im = select(i - 1u, 0u, i == 0u);
    let ip = min(i + 1u, last);
    let v1 = fetch(i) - fetch(im);
    let v2 = fetch(ip) - fetch(i);
    let l = length(v1) * length(v2);
    if (l < 1e-12) { return 0.0; }
    let c = clamp(dot(v1, v2) / l, -1.0, 1.0);
    return clamp(acos(c) * 2.2, 0.0, 1.0);
  }
  return speed_t(i);
}

// trace-in comet head: points near the draw front glow brighter
fn head_boost(i: u32) -> f32 {
  let d = ru.head - f32(i);
  if (d < 0.0) { return 1.0; }
  return 1.0 + 3.0 * exp(-d * 0.02);
}

// ---------------------------------------------------------------- ribbon --

struct LineOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) col: vec3<f32>,
};

@vertex
fn vs_line(@builtin(vertex_index) vi: u32) -> LineOut {
  let v = view_of(fetch(vi));
  let bright = mix(0.45, 1.25, v.depth_t) * head_boost(vi) * ru.gain;
  var o: LineOut;
  o.pos = vec4<f32>(v.clip.x / ru.aspect, v.clip.y, v.clip.z, 1.0);
  o.col = cmap_sample(color_t(vi)) * bright;
  return o;
}

@fragment
fn fs_line(in: LineOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.col * 0.30, 1.0);
}

// ------------------------------------------------------------------ glow --

struct GlowOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) col: vec3<f32>,
  @location(1) uv: vec2<f32>,
};

@vertex
fn vs_glow(@builtin(vertex_index) vi: u32) -> GlowOut {
  let i = vi / 6u;
  let corner = vi % 6u;
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
  );
  let v = view_of(fetch(i));
  let boost = head_boost(i);
  // head sprite swells: the comet head of the trace-in
  let size = ru.px * v.persp * (0.8 + 0.55 * boost);
  let d = corners[corner] * size;
  // sample-density compensation: fast segments space their samples widely, so
  // per-sprite intensity drops to keep luminance ~uniform per arc length —
  // kills the beading without touching the data
  let last = u32(ru.n) - 1u;
  let spacing = length(fetch(min(i + 1u, last)) - fetch(i)) * ru.fit_scale;
  let dens = clamp(ru.px * 1.4 / max(spacing, 1e-6), 0.18, 1.0);
  let bright = mix(0.40, 1.20, v.depth_t) * boost * dens * ru.gain;
  var o: GlowOut;
  o.pos = vec4<f32>(v.clip.x / ru.aspect + d.x, v.clip.y + d.y, v.clip.z, 1.0);
  o.col = cmap_sample(color_t(i)) * bright;
  o.uv = corners[corner];
  return o;
}

@fragment
fn fs_glow(in: GlowOut) -> @location(0) vec4<f32> {
  let d2 = dot(in.uv, in.uv);
  let fall = max(1.0 - d2, 0.0);
  return vec4<f32>(in.col * fall * fall * 0.11, 1.0);
}

// ----------------------------------------------------- fullscreen passes --

struct FSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_fs(@builtin(vertex_index) vi: u32) -> FSOut {
  let xy = vec2<f32>(f32((vi << 1u) & 2u), f32(vi & 2u));
  var o: FSOut;
  o.pos = vec4<f32>(xy * 2.0 - 1.0, 0.0, 1.0);
  o.uv = vec2<f32>(xy.x, 1.0 - xy.y);
  return o;
}

// trails fade: pipeline blend is (src·zero + dst·constant); the host sets the
// blend constant to the trails factor, so this draw multiplies the
// accumulator in place — no shader math, no compute pass
@fragment
fn fs_fade(in: FSOut) -> @location(0) vec4<f32> {
  return vec4<f32>(0.0);
}

// composite of the resolved frame into the accumulator. Blend is
// (src·constant + dst·one) with the host setting constant = 1 − trail, so the
// steady-state luminance (1−t)·f / (1−t) = f is trail-INVARIANT: the slider
// changes temporal texture, never exposure.
@fragment
fn fs_composite(in: FSOut) -> @location(0) vec4<f32> {
  return vec4<f32>(textureSample(post_tex, post_smp, in.uv).rgb, 1.0);
}

// HDR → swapchain: exponential exposure, gamma, vignette, themed base —
// all uniform-driven (BlitU; the former magic constants are its defaults).
// bg_mode 1 (paper) composites the stroke as hue-preserving ink: blend from
// the light stock toward the stroke's own hue by its coverage, so the
// attractor reads dark on paper without flipping to the complement color.
@fragment
fn fs_blit(in: FSOut) -> @location(0) vec4<f32> {
  let hdr = textureSample(post_tex, post_smp, in.uv).rgb;
  let mapped = vec3<f32>(1.0) - exp(-hdr * bu.exposure);
  let g = pow(mapped, vec3<f32>(1.0 / 2.2));
  let r = in.uv - vec2<f32>(0.5);
  let vig = 1.0 - bu.vignette * dot(r, r);
  if (u32(bu.bg_mode) == 1u) {
    let luma = dot(g, vec3<f32>(0.2126, 0.7152, 0.0722));
    let a = clamp(luma * 1.35, 0.0, 1.0) * vig;
    let ink = g / max(max(g.r, max(g.g, g.b)), 1e-4) * 0.42;
    return vec4<f32>(mix(bu.base.rgb, ink, a), 1.0);
  }
  return vec4<f32>(bu.base.rgb + g * vig, 1.0);
}
