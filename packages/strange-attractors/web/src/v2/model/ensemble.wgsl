// Chaos — the live kernels (05-strange-attractors.md, "The model"). Not the
// gated kernel: the release gate runs the committed src/lorenz_rk4.wgsl on
// its own buffers (proof/gate.ts). Two populations, one thread per particle:
//
//   density_step   the attractor's long exposure: particles already on the
//                  attractor, plain f32 RK4. `field` and `rk4` below are the
//                  gated kernel's, character for character, so one particle
//                  started at the gate's initial condition reproduces the
//                  gated trajectory byte for byte (a Prove check).
//   ensemble_step  the released ball: offsets e from the CPU's f64 reference
//                  trajectory, stepped with that step's four RK4 stage points.
//                  Lorenz is quadratic, so f(s + e) − f(s) is written without
//                  any cancelling large terms (`deviation`), and an offset
//                  keeps f32's relative precision however small it is.
//
// No builtin sin/cos/exp in the stepping kernels (00-foundation.md § 5).
// Releasing a ball: release.wgsl; the spread reduction: reduce.wgsl.

struct Params {
  sigma: f32,
  rho: f32,
  beta: f32,
  dt: f32,
  // particles, steps this dispatch, tracked members (trail rows)
  n: u32,
  steps: u32,
  track: u32,
  // density: 1 / the speed that maps to the top of the palette
  inv_speed: f32,
};

@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> state: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> prev: array<vec4<f32>>;
// per step: the reference's four stage points (xyz)
@group(0) @binding(3) var<storage, read> stages: array<vec4<f32>>;
// tracked members after every step: trail[step * track + i]
@group(0) @binding(4) var<storage, read_write> trail: array<vec4<f32>>;

// ---- verbatim from the gated kernel (packages/strange-attractors/src/lorenz_rk4.wgsl)
fn field(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    P.sigma * (s.y - s.x),
    s.x * (P.rho - s.z) - s.y,
    s.x * s.y - P.beta * s.z,
  );
}

fn rk4(s: vec3<f32>) -> vec3<f32> {
  let k1 = field(s);
  let k2 = field(s + 0.5 * P.dt * k1);
  let k3 = field(s + 0.5 * P.dt * k2);
  let k4 = field(s + P.dt * k3);
  return s + (P.dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}
// ---- end verbatim

@compute @workgroup_size(256)
fn density_step(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= P.n) {
    return;
  }
  let q = state[i];
  prev[i] = q;
  var s = q.xyz;
  for (var k: u32 = 0u; k < P.steps; k = k + 1u) {
    s = rk4(s);
  }
  // colour attribute: the speed along the attractor (presentation only;
  // the position bytes above are the gated arithmetic's)
  state[i] = vec4<f32>(s, clamp(length(field(s)) * P.inv_speed, 0.0, 1.0));
}

/// f(s + e) − f(s) for the Lorenz field, exact algebra (no large cancelling terms).
fn deviation(s: vec3<f32>, e: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    P.sigma * (e.y - e.x),
    e.x * (P.rho - s.z) - s.x * e.z - e.y - e.x * e.z,
    s.x * e.y + s.y * e.x + e.x * e.y - P.beta * e.z,
  );
}

@compute @workgroup_size(256)
fn ensemble_step(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= P.n) {
    return;
  }
  let q = state[i];
  prev[i] = q;
  var e = q.xyz;
  let h = 0.5 * P.dt;
  for (var k: u32 = 0u; k < P.steps; k = k + 1u) {
    let s1 = stages[k * 4u].xyz;
    let s2 = stages[k * 4u + 1u].xyz;
    let s3 = stages[k * 4u + 2u].xyz;
    let s4 = stages[k * 4u + 3u].xyz;
    let d1 = deviation(s1, e);
    let d2 = deviation(s2, e + h * d1);
    let d3 = deviation(s3, e + h * d2);
    let d4 = deviation(s4, e + P.dt * d3);
    e = e + (P.dt / 6.0) * (d1 + 2.0 * d2 + 2.0 * d3 + d4);
    if (i < P.track) {
      trail[k * P.track + i] = vec4<f32>(e, q.w);
    }
  }
  state[i] = vec4<f32>(e, q.w);
}
