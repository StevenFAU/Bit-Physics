// render.wgsl — presentation layer (never affects the gate).
// Concatenated after mpm_prelude.wgsl (shares the Particle struct).
//
// Passes:
//   shadow      (compute) — per-particle transmittance: short ray-march
//                toward the light through the grid mass field — the
//                density-grid shadow trick (Splash), reusing the very
//                grid the gate proves.
//   vs/fs_particle — instanced billboard sphere impostors, per-material
//                shading (jelly gloss, snow sparkle, sand hue jitter,
//                water fresnel), modulated by the shadow buffer.
//   vs/fs_ground — floor plane with the same density ray-march for soft
//                contact shadows.
//   vs/fs_box    — domain wireframe.

struct RenderParams {
  view_proj: mat4x4f,
  eye: vec3f,
  particle_scale: f32,
  cam_right: vec3f,
  shadow_kappa: f32,
  cam_up: vec3f,
  sparkle: f32,
  light_dir: vec3f, // normalized, points FROM surface TOWARD light
  floor_world_z: f32,
  grid_nf: f32,
  inv_dx: f32,
  n_particles: u32,
  frame: u32,
  debug_mode: u32, // 0 material, 1 speed, 2 J, 3 shade, 4 Jp
  shadow_steps: u32,
  shadow_step_len: f32,
  ambient: f32,
}

struct MatColors {
  color: array<vec4f, 4>, // rgb base, a: gloss
}

@group(0) @binding(0) var<uniform> rp: RenderParams;
@group(0) @binding(1) var<storage, read> r_particles: array<Particle>;
@group(0) @binding(2) var<storage, read> r_grid_vel: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> shade: array<f32>;
@group(0) @binding(4) var<uniform> mat_colors: MatColors;
@group(0) @binding(5) var<storage, read> shade_read: array<f32>;

fn hash_u32(x0: u32) -> u32 {
  var x = x0;
  x = x ^ (x >> 16u);
  x = x * 0x7feb352du;
  x = x ^ (x >> 15u);
  x = x * 0x846ca68bu;
  x = x ^ (x >> 16u);
  return x;
}

fn hash01(x: u32) -> f32 {
  return f32(hash_u32(x) & 0xffffffu) / 16777216.0;
}

fn sample_grid_mass(pos: vec3f) -> f32 {
  let n = i32(rp.grid_nf);
  let g = pos * rp.inv_dx;
  let i0 = vec3i(floor(g));
  let fr = g - floor(g);
  var acc = 0.0;
  for (var c = 0; c < 8; c++) {
    let o = vec3i(c & 1, (c >> 1) & 1, (c >> 2) & 1);
    let ci = i0 + o;
    if (any(ci < vec3i(0)) || any(ci >= vec3i(n))) {
      continue;
    }
    let w = mix(vec3f(1.0) - fr, fr, vec3f(o));
    let idx = u32((ci.x * n + ci.y) * n + ci.z);
    acc += w.x * w.y * w.z * r_grid_vel[idx].w;
  }
  return acc;
}

fn march_transmittance(from_pos: vec3f) -> f32 {
  var acc = 0.0;
  for (var s = 1u; s <= rp.shadow_steps; s++) {
    let sp = from_pos + rp.light_dir * (rp.shadow_step_len * f32(s));
    acc += sample_grid_mass(sp);
  }
  return exp(-rp.shadow_kappa * acc * rp.shadow_step_len);
}

@compute @workgroup_size(64)
fn shadow(@builtin(global_invocation_id) gid: vec3u) {
  let p = gid.x;
  if (p >= rp.n_particles) {
    return;
  }
  shade[p] = march_transmittance(r_particles[p].pos);
}

// --- particles --------------------------------------------------------------

struct VsOut {
  @builtin(position) clip: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) @interpolate(flat) mat_id: u32,
  @location(3) lightness: f32,
  @location(4) gloss: f32,
}

const QUAD = array<vec2f, 6>(
  vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
  vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0));

@vertex
fn vs_particle(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VsOut {
  let pt = r_particles[ii];
  var quad = QUAD;
  let corner = quad[vi];
  let radius = rp.particle_scale;
  let world = pt.pos + (rp.cam_right * corner.x + rp.cam_up * corner.y) * radius;
  var out: VsOut;
  out.clip = rp.view_proj * vec4f(world, 1.0);
  out.uv = corner;
  out.mat_id = pt.mat_id;
  out.gloss = mat_colors.color[pt.mat_id].a;
  out.lightness = shade_read[ii];

  var base = mat_colors.color[pt.mat_id].rgb;
  if (rp.debug_mode == 1u) {
    let s = clamp(length(pt.vel) * 0.35, 0.0, 1.0);
    base = mix(vec3f(0.12, 0.25, 0.75), vec3f(1.0, 0.85, 0.2), s);
  } else if (rp.debug_mode == 2u) {
    let j = clamp((det3(pt.F) - 0.7) / 0.6, 0.0, 1.0);
    base = mix(vec3f(0.9, 0.2, 0.15), vec3f(0.2, 0.85, 0.5), j);
  } else if (rp.debug_mode == 3u) {
    base = vec3f(out.lightness);
  } else if (rp.debug_mode == 4u) {
    let j = clamp((pt.Jp - 0.7) / 0.6, 0.0, 1.0);
    base = mix(vec3f(0.85, 0.3, 0.9), vec3f(0.25, 0.9, 0.9), j);
  } else {
    if (pt.mat_id == 2u) {
      // Sand — per-grain hue jitter (instanced-grain look).
      let h = hash01(ii) - 0.5;
      base = clamp(base + vec3f(0.10 * h, 0.06 * h, -0.04 * h), vec3f(0.0), vec3f(1.0));
    }
    if (pt.mat_id == 1u) {
      // Snow — frame-quantized sparkle glint (frame-indexed, deterministic).
      let g = hash01(ii ^ ((rp.frame / 8u) * 2654435761u));
      if (g > 0.985) {
        base = min(base + vec3f(rp.sparkle), vec3f(1.0));
      }
    }
  }
  out.color = base;
  return out;
}

@fragment
fn fs_particle(in: VsOut) -> @location(0) vec4f {
  let r2 = dot(in.uv, in.uv);
  if (r2 > 1.0) {
    discard;
  }
  let nz = sqrt(max(1.0 - r2, 0.0));
  // Impostor normal in the camera basis (back = toward the viewer).
  let back = normalize(cross(rp.cam_right, rp.cam_up));
  let n = normalize(rp.cam_right * in.uv.x + rp.cam_up * in.uv.y + back * nz);
  let nl = max(dot(n, rp.light_dir), 0.0);
  let diffuse = nl * in.lightness;
  var c = in.color * (rp.ambient + (1.0 - rp.ambient) * diffuse);
  // Specular + fresnel rim for glossy materials (jelly, water).
  let fres = pow(1.0 - nz, 2.0);
  let spec = pow(nl, 24.0) * in.gloss * in.lightness;
  c += vec3f(spec) + fres * in.gloss * 0.25 * in.color;
  return vec4f(c, 1.0);
}

// --- ground -----------------------------------------------------------------

struct GroundOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
}

@vertex
fn vs_ground(@builtin(vertex_index) vi: u32) -> GroundOut {
  var quad = QUAD;
  let c = quad[vi] * 2.0 + vec2f(0.5, 0.5); // plane spans [-1.5, 2.5]^2
  var out: GroundOut;
  let world = vec3f(c.x, c.y, rp.floor_world_z);
  out.clip = rp.view_proj * vec4f(world, 1.0);
  out.world = world;
  return out;
}

@fragment
fn fs_ground(in: GroundOut) -> @location(0) vec4f {
  // Subtle grid lines + density contact shadow.
  let g = abs(fract(in.world.xy * 8.0) - 0.5);
  let line = smoothstep(0.46, 0.5, max(g.x, g.y));
  var base = mix(vec3f(0.055, 0.075, 0.10), vec3f(0.085, 0.11, 0.145), line);
  let inside = f32(all(in.world.xy >= vec2f(0.0)) && all(in.world.xy <= vec2f(1.0)));
  base *= 0.8 + 0.2 * inside;
  let sh = march_transmittance(vec3f(in.world.xy, rp.floor_world_z + 0.01));
  base *= 0.35 + 0.65 * sh;
  // Distance fade.
  let d = length(in.world.xy - vec2f(0.5, 0.5));
  base = mix(base, vec3f(0.024, 0.035, 0.05), smoothstep(0.6, 1.9, d));
  return vec4f(base, 1.0);
}

// --- domain wireframe box ----------------------------------------------------

@vertex
fn vs_box(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  // 12 edges * 2 vertices; unit cube corners by bit pattern.
  var edges = array<vec2u, 12>(
    vec2u(0u, 1u), vec2u(1u, 3u), vec2u(3u, 2u), vec2u(2u, 0u),
    vec2u(4u, 5u), vec2u(5u, 7u), vec2u(7u, 6u), vec2u(6u, 4u),
    vec2u(0u, 4u), vec2u(1u, 5u), vec2u(3u, 7u), vec2u(2u, 6u));
  let e = edges[vi / 2u];
  var ci = e.x;
  if ((vi & 1u) == 1u) {
    ci = e.y;
  }
  let corner = vec3f(f32(ci & 1u), f32((ci >> 1u) & 1u), f32((ci >> 2u) & 1u));
  let world = vec3f(corner.xy, mix(rp.floor_world_z, 1.0, corner.z));
  return rp.view_proj * vec4f(world, 1.0);
}

@fragment
fn fs_box() -> @location(0) vec4f {
  return vec4f(0.16, 0.22, 0.3, 1.0);
}
