// schrodinger-smoke — passive tracer cloud (advect compute + point render).
//
// Tracers are visualization-only: they sample the velocity texture and never
// feed back into Psi (this is what keeps the gated state a pure grid solver —
// spec-ref § 8). They are excluded from the gated hash; respawn uses a
// per-index PCG hash (the neural-ca matched-PCG precedent) so replays are
// deterministic on a device.
//
// Sampling is staggered-MAC per component (web spec § 5): the velocity
// texture stores +face velocities at each cell, so component c interpolates
// at position - 0.5*dx along the OTHER axes... concretely: u_x lives at
// (i+1/2, j, k), so sample x-component at p - (0, .5, .5)*dx offset in
// texture space; hardware trilinear does the rest. The cell-centred average
// exists only for capture parity and would smear thin-core detail.

struct TU {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  n: f32,
  dx: f32,
  dt: f32,
  count: u32,
  mode: u32,        // color: 0 phase, 1 speed, 2 age
  size: f32,        // point half-size in world units
  speed_scale: f32, // color normalization
  respawn_seed: u32,
  max_age: f32,
  rk4: u32,         // 0 = RK2 (default), 1 = RK4 toggle
  glow: f32,
  // dye seed region (incompressible flow keeps a uniform cloud uniform —
  // the iconic look needs dye seeded where the vortices are):
  // 0 = uniform box, 1 = ball, 2 = slab in x, 3 = disk facing x
  seed_type: u32,
  seed_center: vec3<f32>,
  seed_radius: f32,
  seed_thick: f32,
}

@group(0) @binding(0) var<uniform> T: TU;
@group(0) @binding(1) var<storage, read_write> tracers: array<vec4<f32>>; // xyz pos, w age (compute)
@group(0) @binding(2) var velTex: texture_3d<f32>;
@group(0) @binding(3) var velSamp: sampler;
// vertex stages cannot use read_write storage — the render path binds the
// same buffer read-only at its own slot (sph-water particles.wgsl precedent)
@group(0) @binding(4) var<storage, read> tracersR: array<vec4<f32>>;

fn pcg(v: u32) -> u32 {
  var s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}

fn rand01(seed: u32) -> f32 {
  return f32(pcg(seed)) / 4294967295.0;
}

fn sample_vel(p: vec3<f32>) -> vec3<f32> {
  // staggered-MAC per-component trilinear. Fields live on VERTICES (i*dx);
  // texel i's normalized center is (i+0.5)*dx. The x-face value u_x(i)
  // sits physically at ((i+0.5), j, k)*dx, so its x already aligns with the
  // texel center while y/z need the +0.5*dx vertex->texel-center shift —
  // and symmetrically per component.
  let h = 0.5 * T.dx;
  let ux = textureSampleLevel(velTex, velSamp, fract(p + vec3<f32>(0.0, h, h)), 0.0).x;
  let uy = textureSampleLevel(velTex, velSamp, fract(p + vec3<f32>(h, 0.0, h)), 0.0).y;
  let uz = textureSampleLevel(velTex, velSamp, fract(p + vec3<f32>(h, h, 0.0)), 0.0).z;
  return vec3<f32>(ux, uy, uz);
}

@compute @workgroup_size(256)
fn advect(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= T.count) { return; }
  var t = tracers[g.x];
  var p = t.xyz;
  var age = t.w + T.dt;
  if (T.rk4 == 1u) {
    let k1 = sample_vel(p);
    let k2 = sample_vel(fract(p + 0.5 * T.dt * k1));
    let k3 = sample_vel(fract(p + 0.5 * T.dt * k2));
    let k4 = sample_vel(fract(p + T.dt * k3));
    p = fract(p + (T.dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4));
  } else {
    let k1 = sample_vel(p);
    let k2 = sample_vel(fract(p + 0.5 * T.dt * k1));
    p = fract(p + T.dt * k2);
  }
  if (age > T.max_age) {
    let base = g.x * 3u + T.respawn_seed * 2654435761u;
    let r0 = rand01(base);
    let r1 = rand01(base + 1u);
    let r2 = rand01(base + 2u);
    if (T.seed_type == 1u) {
      // ball: cbrt-radial for uniform density
      let th = 6.283185307 * r0;
      let cz = 2.0 * r1 - 1.0;
      let sz = sqrt(max(0.0, 1.0 - cz * cz));
      let rr = T.seed_radius * pow(r2, 1.0 / 3.0);
      p = T.seed_center + rr * vec3<f32>(sz * cos(th), sz * sin(th), cz);
    } else if (T.seed_type == 2u) {
      // slab in x (nozzle / upstream emission)
      p = vec3<f32>(T.seed_center.x + (r0 - 0.5) * 2.0 * T.seed_thick, r1, r2);
    } else if (T.seed_type == 3u) {
      // disk facing x (smoke-ring launch sheet)
      let th = 6.283185307 * r0;
      let rr = T.seed_radius * sqrt(r1);
      p = T.seed_center + vec3<f32>((r2 - 0.5) * 2.0 * T.seed_thick, rr * cos(th), rr * sin(th));
    } else {
      p = vec3<f32>(r0, r1, r2);
    }
    p = fract(p);
    age = T.max_age * rand01(base + 3u) * 0.25;
  }
  tracers[g.x] = vec4<f32>(p, age);
}

// --- render: additive no-sort billboards (CUDA-port lesson: at millions of
// points the RENDER, not the solver, is the bottleneck; additive blending is
// order-independent so no sort is needed) --------------------------------

struct VSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) scalar: f32,
}

const CORNERS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
);

@vertex
fn vs_tracer(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let corner = CORNERS[vid];
  let t = tracersR[iid];
  let center = (T.view * vec4<f32>(t.xyz - vec3<f32>(0.5), 1.0)).xyz;
  let offs = center + vec3<f32>(corner * T.size, 0.0);
  var out: VSOut;
  out.clip = T.proj * vec4<f32>(offs, 1.0);
  out.uv = corner;
  if (T.mode == 0u) {
    // phase hue: arg(psi1) stored in velTex.w at the tracer position
    out.scalar = textureSampleLevel(velTex, velSamp, t.xyz, 0.0).w / 6.283185307179586 + 0.5;
  } else if (T.mode == 1u) {
    out.scalar = clamp(length(sample_vel(t.xyz)) / max(T.speed_scale, 1e-6), 0.0, 1.0);
  } else {
    out.scalar = clamp(t.w / T.max_age, 0.0, 1.0);
  }
  return out;
}

fn hue(h: f32) -> vec3<f32> {
  let k = vec3<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0);
  return clamp(abs(fract(vec3<f32>(h) + k) * 6.0 - 3.0) - 1.0, vec3<f32>(0.0), vec3<f32>(1.0));
}

@fragment
fn fs_tracer(in: VSOut) -> @location(0) vec4<f32> {
  let d2 = dot(in.uv, in.uv);
  if (d2 > 1.0) { discard; }
  let fall = (1.0 - d2) * (1.0 - d2);
  var base: vec3<f32>;
  if (T.mode == 0u) {
    base = hue(in.scalar) * 0.85 + vec3<f32>(0.15);
  } else if (T.mode == 1u) {
    base = mix(vec3<f32>(0.15, 0.35, 0.9), vec3<f32>(1.0, 0.85, 0.35), in.scalar);
  } else {
    base = mix(vec3<f32>(0.9, 0.9, 1.0), vec3<f32>(0.2, 0.4, 0.8), in.scalar);
  }
  return vec4<f32>(base * fall * T.glow, 1.0);
}

// --- box outline ------------------------------------------------------------

@group(0) @binding(1) var<storage, read> line_verts: array<vec4<f32>>;

@vertex
fn vs_line(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
  return T.proj * (T.view * vec4<f32>(line_verts[vid].xyz - vec3<f32>(0.5), 1.0));
}

@fragment
fn fs_line() -> @location(0) vec4<f32> {
  return vec4<f32>(0.35, 0.42, 0.5, 0.6);
}
