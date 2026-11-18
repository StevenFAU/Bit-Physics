// render.wgsl — qualitative-screenshot renderer for the PB-MPM spike only:
// sphere impostors coloured by material, a table plane, the colliders.
// Not the M1 look (that is LiquidSurface + per-material surfaces).

struct Cam {
  view_proj: mat4x4f,
  right: vec3f,
  radius: f32,
  up: vec3f,
  time: f32,
  eye: vec3f,
  mode: u32,       // 0 material, 1 speed, 2 plastic (aux), 3 snow Jp
  light: vec3f,
  floor_y: f32,
  extent: vec3f,
  dt: f32,
}

struct PbParticle {
  pos: vec3f,
  mat: u32,
  disp: vec3f,
  mass: f32,
  F: mat3x3f,
  D: mat3x3f,
  jp: f32,
  logjp: f32,
  t_on: f32,
  aux: f32,
}

struct Collider {
  kind: u32,
  friction: f32,
  radius: f32,
  pad0: f32,
  center: vec3f,
  pad1: f32,
  half: vec3f,
  pad2: f32,
  disp: vec3f,
  pad3: f32,
}

@group(0) @binding(0) var<uniform> cam: Cam;
@group(0) @binding(1) var<storage, read> parts: array<PbParticle>;
@group(0) @binding(2) var<uniform> colors: array<vec4f, 8>;
@group(0) @binding(3) var<uniform> cols: array<Collider, 2>;

struct VOut {
  @builtin(position) clip: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) world: vec3f,
}

const QUAD = array<vec2f, 6>(
  vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0),
);

fn ramp(t: f32) -> vec3f {
  let x = clamp(t, 0.0, 1.0);
  return mix(mix(vec3f(0.10, 0.18, 0.45), vec3f(0.95, 0.75, 0.20), smoothstep(0.0, 0.6, x)),
             vec3f(0.95, 0.20, 0.15), smoothstep(0.6, 1.0, x));
}

@vertex
fn vs_particle(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut;
  let p = parts[ii];
  let q = QUAD[vi];
  o.uv = q;
  if (p.t_on > cam.time) {
    o.clip = vec4f(2.0, 2.0, 2.0, 1.0);
    return o;
  }
  let w = p.pos + (q.x * cam.right + q.y * cam.up) * cam.radius;
  o.clip = cam.view_proj * vec4f(w, 1.0);
  o.world = p.pos;
  var c = colors[p.mat].rgb;
  if (cam.mode == 1u) {
    c = ramp(length(p.disp) / cam.dt / 400.0);
  } else if (cam.mode == 2u) {
    c = ramp(p.aux / 2.0);
  } else if (cam.mode == 3u) {
    c = ramp((1.0 - p.jp) / 0.5);
  }
  o.color = c;
  return o;
}

fn shade(base: vec3f, n: vec3f, view: vec3f) -> vec3f {
  let l = normalize(cam.light);
  let diff = max(dot(n, l), 0.0);
  let h = normalize(l + view);
  let spec = pow(max(dot(n, h), 0.0), 40.0) * 0.25;
  let amb = 0.30 + 0.15 * n.y;
  return base * (amb + 0.8 * diff) + vec3f(spec);
}

@fragment
fn fs_particle(i: VOut) -> @location(0) vec4f {
  let r2 = dot(i.uv, i.uv);
  if (r2 > 1.0) {
    discard;
  }
  let view = normalize(cam.eye - i.world);
  let n = normalize(i.uv.x * cam.right + i.uv.y * cam.up + sqrt(1.0 - r2) * view);
  return vec4f(shade(i.color, n, view), 1.0);
}

// Table: a plane at floor_y spanning the domain, faint checker every 8 cells.
@vertex
fn vs_floor(@builtin(vertex_index) vi: u32) -> VOut {
  var o: VOut;
  let q = QUAD[vi] * 0.5 + vec2f(0.5);
  let w = vec3f(q.x * cam.extent.x, cam.floor_y - 0.5, q.y * cam.extent.z);
  o.clip = cam.view_proj * vec4f(w, 1.0);
  o.world = w;
  o.uv = q;
  o.color = vec3f(0.0);
  return o;
}

@fragment
fn fs_floor(i: VOut) -> @location(0) vec4f {
  let c = floor(i.world.xz / 8.0);
  let chk = (i32(c.x) + i32(c.y)) & 1;
  let base = select(vec3f(0.42, 0.30, 0.20), vec3f(0.46, 0.34, 0.23), chk == 1);
  return vec4f(shade(base, vec3f(0.0, 1.0, 0.0), normalize(cam.eye - i.world)), 1.0);
}

// Colliders: sphere impostor (6 verts) or a 36-vertex box.
const CUBE = array<vec3f, 8>(
  vec3f(-1.0, -1.0, -1.0), vec3f(1.0, -1.0, -1.0), vec3f(1.0, 1.0, -1.0), vec3f(-1.0, 1.0, -1.0),
  vec3f(-1.0, -1.0, 1.0), vec3f(1.0, -1.0, 1.0), vec3f(1.0, 1.0, 1.0), vec3f(-1.0, 1.0, 1.0),
);
const CUBE_IDX = array<u32, 36>(
  0u, 2u, 1u, 0u, 3u, 2u, 4u, 5u, 6u, 4u, 6u, 7u, 0u, 1u, 5u, 0u, 5u, 4u,
  3u, 6u, 2u, 3u, 7u, 6u, 0u, 4u, 7u, 0u, 7u, 3u, 1u, 2u, 6u, 1u, 6u, 5u,
);

struct COut {
  @builtin(position) clip: vec4f,
  @location(0) uv: vec2f,
  @location(1) world: vec3f,
  @location(2) @interpolate(flat) kind: u32,
  @location(3) normal: vec3f,
}

@vertex
fn vs_collider(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> COut {
  var o: COut;
  let c = cols[ii];
  o.kind = c.kind;
  if (c.kind == 1u) {
    if (vi >= 6u) {
      o.clip = vec4f(2.0, 2.0, 2.0, 1.0);
      return o;
    }
    let q = QUAD[vi];
    let w = c.center + (q.x * cam.right + q.y * cam.up) * c.radius;
    o.clip = cam.view_proj * vec4f(w, 1.0);
    o.uv = q;
    o.world = c.center;
    return o;
  }
  if (c.kind == 2u) {
    let corner = CUBE[CUBE_IDX[vi]];
    let w = c.center + corner * c.half;
    o.clip = cam.view_proj * vec4f(w, 1.0);
    o.world = w;
    let face = vi / 6u;
    var n = vec3f(0.0, 0.0, -1.0);
    if (face == 1u) { n = vec3f(0.0, 0.0, 1.0); }
    if (face == 2u) { n = vec3f(0.0, -1.0, 0.0); }
    if (face == 3u) { n = vec3f(0.0, 1.0, 0.0); }
    if (face == 4u) { n = vec3f(-1.0, 0.0, 0.0); }
    if (face == 5u) { n = vec3f(1.0, 0.0, 0.0); }
    o.normal = n;
    return o;
  }
  o.clip = vec4f(2.0, 2.0, 2.0, 1.0);
  return o;
}

@fragment
fn fs_collider(i: COut) -> @location(0) vec4f {
  let base = vec3f(0.55, 0.57, 0.62);
  if (i.kind == 1u) {
    let r2 = dot(i.uv, i.uv);
    if (r2 > 1.0) {
      discard;
    }
    let view = normalize(cam.eye - i.world);
    let n = normalize(i.uv.x * cam.right + i.uv.y * cam.up + sqrt(1.0 - r2) * view);
    return vec4f(shade(base, n, view), 1.0);
  }
  return vec4f(shade(base, i.normal, normalize(cam.eye - i.world)), 1.0);
}
