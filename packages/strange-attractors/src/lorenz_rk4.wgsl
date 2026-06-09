// Lorenz strange attractor — classical RK4 fixed-step integrator (Stack B WGSL).
//
// Ports strange_attractors.integrator.rk4_step + reference.lorenz.lorenz_field
// (sigma=10, rho=28, beta=8/3). A single invocation integrates the whole
// trajectory and writes every state to `traj` (cur step major, 3 f32 per step).
//
// f32 on a chaotic system diverges pointwise from the f64 canonical within a few
// Lyapunov times — the web-build gate is therefore new-canonical (run-twice
// byte-identical + structural attractor invariants), NOT a pointwise round-trip.

struct Params {
  n_steps: u32,
  _pad0: u32,
  sigma: f32,
  rho: f32,
  beta: f32,
  dt: f32,
  x0: f32,
  y0: f32,
  z0: f32,
  _pad1: f32,
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> traj: array<f32>;  // (n_steps+1) * 3

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

@compute @workgroup_size(1)
fn main() {
  var s = vec3<f32>(P.x0, P.y0, P.z0);
  traj[0] = s.x; traj[1] = s.y; traj[2] = s.z;
  for (var i: u32 = 1u; i <= P.n_steps; i = i + 1u) {
    s = rk4(s);
    let o = i * 3u;
    traj[o + 0u] = s.x;
    traj[o + 1u] = s.y;
    traj[o + 2u] = s.z;
  }
}
