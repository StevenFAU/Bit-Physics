// Ising presentation shader v2 (verification-demo-spec § 3.4).
//
// Presentation-only: reads the kernel-owned spin buffer (and a render-owned
// snapshot copy of it) through read-only bindings and draws one fullscreen
// triangle. The gate consumes buffer readbacks, never pixels, so nothing here
// can perturb it. Principle (spec § 3.4): every luminous element is bound to
// a physical quantity — no bloom, no unmotivated glow.
//
//   - antialiased-nearest lattice sampling (the fat-pixel idiom): crisp texel
//     interiors, texel edges antialiased over exactly one screen pixel via
//     fwidth; raw_grid = 1 restores plain nearest ("what the buffer holds")
//   - domain-boundary emphasis: the AA blend of ±1 spins is < 1 in magnitude
//     exactly on domain walls — the wall line falls out of the sampling, no
//     extra taps, and is re-blended wider for a soft luminous seam
//   - flip-activity layer: fs_activity compares spins against the render-owned
//     snapshot (copyBufferToBuffer, no compute pass) into a decaying r8unorm
//     ping-pong texture — a live acceptance-rate map: dark and frozen below
//     T_c, seething at T_c, uniform flicker above
//   - inspection lens: pointer-following magnifier resampling the raw texels
//     at lens_zoom; mode 2 tints the checkerboard parity (the red/black
//     update sets of the committed kernel — metropolis.wgsl:64)
//   - two-tone spin palette from the shared colormap module (cmap_sample is
//     appended at pipeline build by emitColormapWgsl)

struct RP {
  n: f32,          // grid size (cells per side)
  raw_grid: f32,   // 1 = plain nearest texels, boundary/activity bypassed
  boundary: f32,   // 0..1 domain-wall emphasis gain
  activity: f32,   // 0..1 flip-activity layer gain
  lens_x: f32,     // lens center, framebuffer px
  lens_y: f32,
  lens_r: f32,     // lens radius, framebuffer px (0 = lens off)
  lens_zoom: f32,
  lens_mode: f32,  // 0 off · 1 magnify raw · 2 checkerboard parity
  res_x: f32,      // framebuffer size, px
  res_y: f32,
  exposure: f32,   // tonemap exposure
  cmap: array<vec4<f32>, 8>,
  cmap_meta: vec4<f32>,
};

@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> spins: array<i32>;
@group(0) @binding(2) var activity_tex: texture_2d<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = 0.5 * (p[vi] + vec2<f32>(1.0, 1.0));
  return o;
}

fn wrap_i(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

fn spin_of(i: i32, j: i32) -> f32 {
  let n = i32(rp.n);
  return f32(spins[u32(wrap_i(j, n)) * u32(rp.n) + u32(wrap_i(i, n))]);
}

// t-coordinates into the two-tone palette: near-black down spins, mid-accent
// up spins — the dark-theme two-tone (spec § 3.4); walls and activity sit
// higher on the same ramp so every hue stays in-family per colormap.
const T_DN: f32 = 0.10;
const T_UP: f32 = 0.52;
const T_WALL: f32 = 0.88;
const T_ACT: f32 = 0.72;

fn spin_color(s: f32) -> vec3<f32> {
  // the down tone is the ramp's base hue pulled to near-black so the lattice
  // reads dark; the up tone is the ramp's accent
  return select(cmap_sample(T_DN) * 0.22, cmap_sample(T_UP), s > 0.0);
}

// Antialiased-nearest blend weights: a linear ramp of width w (one screen
// pixel in grid units) centered on the texel border — nearest everywhere
// else. w → 1 degrades gracefully to bilinear when cells are subpixel.
fn aa_weight(f: f32, w: f32) -> f32 {
  return clamp((f - 0.5) / w + 0.5, 0.0, 1.0);
}

struct LatticeSample {
  color: vec3<f32>,
  blend: f32,   // signed spin blend in [-1, 1] — |blend| < 1 only on walls
};

fn sample_lattice(p: vec2<f32>, w: vec2<f32>) -> LatticeSample {
  let q = p - vec2<f32>(0.5, 0.5);
  let i0 = i32(floor(q.x));
  let j0 = i32(floor(q.y));
  let f = q - floor(q);
  let wx = aa_weight(f.x, w.x);
  let wy = aa_weight(f.y, w.y);
  let s00 = spin_of(i0, j0);
  let s10 = spin_of(i0 + 1, j0);
  let s01 = spin_of(i0, j0 + 1);
  let s11 = spin_of(i0 + 1, j0 + 1);
  var out: LatticeSample;
  out.color = mix(
    mix(spin_color(s00), spin_color(s10), wx),
    mix(spin_color(s01), spin_color(s11), wx),
    wy,
  );
  out.blend = mix(mix(s00, s10, wx), mix(s01, s11, wx), wy);
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let n = rp.n;
  let res = vec2<f32>(rp.res_x, rp.res_y);
  let px = in.pos.xy;
  // screen top = lattice row 0 (framebuffer y is already top-down)
  var p = px / res * n;
  // derivatives must be taken in uniform control flow — before any branch
  let w = clamp(fwidth(p), vec2<f32>(1.0e-4), vec2<f32>(1.0));

  // --- inspection lens (mode 1 raw magnify, mode 2 checkerboard parity) ----
  let lens_on = rp.lens_mode > 0.5 && rp.lens_r > 0.5;
  let lens_c = vec2<f32>(rp.lens_x, rp.lens_y);
  let lens_d = distance(px, lens_c);
  if (lens_on && lens_d < rp.lens_r) {
    let pc = lens_c / res * n;
    let pl = pc + (p - pc) / rp.lens_zoom;
    let i = i32(floor(pl.x));
    let j = i32(floor(pl.y));
    let s = spin_of(i, j);
    var col = spin_color(s);
    if (rp.lens_mode > 1.5) {
      // the committed kernel's red/black update sets (metropolis.wgsl:64)
      let parity = f32((wrap_i(i, i32(n)) + wrap_i(j, i32(n))) & 1);
      let tint = mix(vec3<f32>(0.9, 0.25, 0.2), vec3<f32>(0.2, 0.45, 0.95), parity);
      col = mix(col, tint, 0.28);
    }
    // texel grid inside the lens: hairline at magnified cell borders
    let fl = fract(pl);
    let gl = step(fl.x, 0.035) + step(0.965, fl.x) + step(fl.y, 0.035) + step(0.965, fl.y);
    col = mix(col, col * 0.55, clamp(gl, 0.0, 1.0) * 0.6);
    // rim
    let rim = smoothstep(rp.lens_r - 2.5, rp.lens_r - 0.5, lens_d);
    col = mix(col, cmap_sample(0.9), rim * 0.65);
    let mapped = vec3<f32>(1.0) - exp(-col * rp.exposure);
    return vec4<f32>(pow(mapped, vec3<f32>(1.0 / 2.2)), 1.0);
  }

  // --- raw view: the honesty escape hatch — plain nearest, nothing else ----
  if (rp.raw_grid > 0.5) {
    let i = i32(clamp(p.x, 0.0, n - 0.001));
    let j = i32(clamp(p.y, 0.0, n - 0.001));
    let col = spin_color(spin_of(i, j));
    let mapped = vec3<f32>(1.0) - exp(-col * rp.exposure);
    return vec4<f32>(pow(mapped, vec3<f32>(1.0 / 2.2)), 1.0);
  }

  // --- antialiased-nearest base ---------------------------------------------
  let s = sample_lattice(p, w);
  var col = s.color;

  // --- domain-wall emphasis: |blend| < 1 exactly on walls -------------------
  if (rp.boundary > 0.001) {
    // re-blend over a wider kernel for a soft seam either side of the wall
    let sw = sample_lattice(p, min(w * 3.0, vec2<f32>(1.0)));
    let edge = 1.0 - abs(sw.blend);
    col += rp.boundary * pow(clamp(edge, 0.0, 1.0), 1.3) * cmap_sample(T_WALL) * 0.85;
  }

  // --- flip-activity layer: the live acceptance-rate map --------------------
  if (rp.activity > 0.001) {
    let ci = vec2<i32>(i32(clamp(p.x, 0.0, n - 0.001)), i32(clamp(p.y, 0.0, n - 0.001)));
    let act = textureLoad(activity_tex, ci, 0).r;
    col += rp.activity * act * act * cmap_sample(T_ACT) * 0.9;
  }

  let mapped = vec3<f32>(1.0) - exp(-col * rp.exposure);
  return vec4<f32>(pow(mapped, vec3<f32>(1.0 / 2.2)), 1.0);
}

// --- activity update pass (render-owned; no compute, no kernel change) ------
// Rendered into the 128² r8unorm ping-pong target: cells that flipped since
// the render-owned snapshot light to 1, everything decays multiplicatively.

struct AP {
  n: f32,
  decay: f32,
  _pad0: f32,
  _pad1: f32,
};

@group(0) @binding(0) var<uniform> ap: AP;
@group(0) @binding(1) var<storage, read> act_spins: array<i32>;
@group(0) @binding(2) var<storage, read> act_snap: array<i32>;
@group(0) @binding(3) var prev_activity: texture_2d<f32>;

@fragment
fn fs_activity(in: VSOut) -> @location(0) vec4<f32> {
  let cell = vec2<i32>(floor(in.pos.xy));
  let idx = u32(cell.y) * u32(ap.n) + u32(cell.x);
  let flipped = act_spins[idx] != act_snap[idx];
  let prev = textureLoad(prev_activity, cell, 0).r;
  let act = max(select(0.0, 1.0, flipped), prev * ap.decay);
  return vec4<f32>(act, 0.0, 0.0, 1.0);
}
