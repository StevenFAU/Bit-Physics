// lbm-multiphase — uber-composite render (one fragment pass over the live
// sim buffers, spec § 5.1) + tracer point sprites. Ungated cosmetics: the
// deploy gate never reads pixels.

struct RU {
  nx : u32,
  ny : u32,
  layers : u32,      // bit0 phase, bit1 curl, bit2 speed, bit3 schlieren,
                     // bit4 refraction, bit5 walls, bit6 parasite, bit7 iso
  pad0 : u32,
  rho_v : f32,       // scene vapor / liquid anchors for the ramp
  rho_l : f32,
  exposure : f32,
  time : f32,
  speed_gain : f32,
  curl_gain : f32,
  parasite_gain : f32,
  pad1 : f32,
}

@group(0) @binding(0) var<uniform> ru : RU;
@group(0) @binding(1) var<storage, read> macro_in : array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> rhopsi_in : array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> flags_in : array<u32>;

struct VOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
}

@vertex
fn vs_full(@builtin(vertex_index) vi : u32) -> VOut {
  var out : VOut;
  let x = f32((vi << 1u) & 2u);
  let y = f32(vi & 2u);
  out.pos = vec4<f32>(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  out.uv = vec2<f32>(x, y);
  return out;
}

fn cell(i : i32, j : i32) -> u32 {
  let ii = (i + i32(ru.nx)) % i32(ru.nx);
  let jj = (j + i32(ru.ny)) % i32(ru.ny);
  return u32(ii) * ru.ny + u32(jj);
}

fn rho_at(i : i32, j : i32) -> f32 {
  return macro_in[cell(i, j)].x;
}

// dual-tone liquid/vapor ramp (rainbow banned): deep abyss -> teal -> ice
fn phase_color(t : f32) -> vec3<f32> {
  let abyss = vec3<f32>(0.016, 0.043, 0.078);
  let vapor = vec3<f32>(0.055, 0.113, 0.184);
  let inter = vec3<f32>(0.086, 0.462, 0.502);
  let liquid = vec3<f32>(0.686, 0.894, 0.925);
  if (t < 0.35) {
    return mix(abyss, vapor, t / 0.35);
  } else if (t < 0.62) {
    return mix(vapor, inter, (t - 0.35) / 0.27);
  }
  return mix(inter, liquid, (t - 0.62) / 0.38);
}

// diverging curl map: cool blue <- dark -> warm amber
fn curl_color(c : f32) -> vec3<f32> {
  let neg = vec3<f32>(0.25, 0.55, 0.95);
  let pos = vec3<f32>(0.98, 0.62, 0.20);
  let a = clamp(abs(c), 0.0, 1.0);
  if (c < 0.0) {
    return neg * a;
  }
  return pos * a;
}

fn bg_pattern(p : vec2<f32>) -> f32 {
  // drifting diagonal stripe field (pure polynomial-ish: triangle wave)
  let s = p.x * 0.55 + p.y * 0.35 + ru.time * 2.0;
  let tri = abs(fract(s * 0.12) - 0.5) * 2.0;
  let grid = abs(fract(p.x * 0.08) - 0.5) * abs(fract(p.y * 0.08) - 0.5);
  return 0.25 + 0.5 * tri * tri + 0.6 * smoothstep(0.22, 0.25, grid);
}

@fragment
fn fs_composite(in : VOut) -> @location(0) vec4<f32> {
  let gx = in.uv.x * f32(ru.nx) - 0.5;
  let gy = in.uv.y * f32(ru.ny) - 0.5;
  let i = i32(round(gx));
  let j = i32(round(gy));
  let idx = cell(i, j);
  let m = macro_in[idx];
  let solid = (flags_in[idx] & 1u) != 0u;

  // central-difference gradients on rho (periodic)
  let rxp = rho_at(i + 1, j);
  let rxm = rho_at(i - 1, j);
  let ryp = rho_at(i, j + 1);
  let rym = rho_at(i, j - 1);
  let grad = vec2<f32>(rxp - rxm, ryp - rym) * 0.5;
  let curl = 0.5 * ((macro_in[cell(i + 1, j)].z - macro_in[cell(i - 1, j)].z)
                  - (macro_in[cell(i, j + 1)].y - macro_in[cell(i, j - 1)].y));
  let speed = length(vec2<f32>(m.y, m.z));

  var col = vec3<f32>(0.0);
  let t = clamp((m.x - ru.rho_v) / (ru.rho_l - ru.rho_v), 0.0, 1.0);

  if ((ru.layers & 1u) != 0u) {
    col = phase_color(t);
    if ((ru.layers & 16u) != 0u) {
      // screen-space refraction of the background through grad(rho),
      // with a cheap 2-tap chromatic offset — droplets read as glass
      let ofs = grad * 14.0;
      let p = vec2<f32>(gx, gy);
      let b1 = bg_pattern(p + ofs);
      let b2 = bg_pattern(p + ofs * 1.35);
      let glass = smoothstep(0.45, 1.0, t);
      col = col + glass * (vec3<f32>(b1, mix(b1, b2, 0.5), b2) - 0.5) * 0.28;
      // fresnel-ish rim sparkle on the interface
      let rim = smoothstep(0.06, 0.35, length(grad));
      col = col + rim * vec3<f32>(0.30, 0.52, 0.56) * 0.9;
    }
  }
  if ((ru.layers & 128u) != 0u) {
    // iso-band droplet outline at the mid density
    let mid = 0.5 * (ru.rho_v + ru.rho_l);
    let d = abs(m.x - mid);
    let w = max(length(grad), 1e-4) * 1.2;
    let band = 1.0 - smoothstep(w * 0.6, w * 1.6, d);
    col = mix(col, vec3<f32>(0.92, 0.98, 1.0), band * 0.55);
  }
  if ((ru.layers & 2u) != 0u) {
    col = col + curl_color(curl * ru.curl_gain);
  }
  if ((ru.layers & 4u) != 0u) {
    let s = clamp(speed * ru.speed_gain, 0.0, 1.0);
    col = col + vec3<f32>(0.9, 0.86, 0.55) * s * s;
  }
  if ((ru.layers & 8u) != 0u) {
    // schlieren |grad rho| — interfaces are real density shocks here
    let s = clamp(length(grad) * 3.5, 0.0, 1.0);
    col = col + vec3<f32>(s) * 0.85;
  }
  if ((ru.layers & 64u) != 0u) {
    // parasite view (honesty-as-feature): exaggerated spurious currents
    let s = clamp(speed * ru.parasite_gain, 0.0, 1.0);
    col = mix(col, vec3<f32>(0.95, 0.35, 0.42), s * 0.85);
  }
  if (solid && (ru.layers & 32u) != 0u) {
    // walls tinted by wettability: hydrophobic rust -> hydrophilic sky
    let rw = f32(flags_in[idx] >> 16u) * (4.0 / 65535.0);
    let w01 = clamp((rw - 0.6) / 1.6, 0.0, 1.0);
    col = mix(vec3<f32>(0.42, 0.27, 0.18), vec3<f32>(0.35, 0.58, 0.78), w01);
  }

  col = col * ru.exposure;
  // filmic-ish soft clip
  col = col / (1.0 + max(max(col.r, col.g), col.b) * 0.18);
  return vec4<f32>(col, 1.0);
}

// ---------------------------------------------------------------- tracers

struct TU {
  nx : f32,
  ny : f32,
  size : f32,
  alpha : f32,
}

@group(0) @binding(0) var<uniform> tu : TU;
@group(0) @binding(1) var<storage, read> tracer_pts : array<vec4<f32>>;

struct TOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) q : vec2<f32>,
  @location(1) fade : f32,
}

@vertex
fn vs_tracer(@builtin(vertex_index) vi : u32, @builtin(instance_index) inst : u32) -> TOut {
  var corner = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));
  let p = tracer_pts[inst];
  let c = corner[vi];
  var out : TOut;
  let clip = vec2<f32>(p.x / tu.nx * 2.0 - 1.0, 1.0 - p.y / tu.ny * 2.0);
  out.pos = vec4<f32>(clip + c * tu.size, 0.0, 1.0);
  out.q = c;
  // dye rides the liquid phase only (p.w = local rho): fade in vapor
  out.fade = clamp(p.w, 0.0, 1.2) * (1.0 - smoothstep(4.5, 6.0, p.z));
  return out;
}

@fragment
fn fs_tracer(in : TOut) -> @location(0) vec4<f32> {
  let r2 = dot(in.q, in.q);
  let a = max(0.0, 1.0 - r2);
  return vec4<f32>(vec3<f32>(0.62, 0.86, 0.92) * a * a * in.fade * tu.alpha, 0.0);
}
