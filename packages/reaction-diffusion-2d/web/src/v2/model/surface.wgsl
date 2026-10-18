// Turing Patterns — "On a Shape": the live solver on a closed surface
// (model/surface-mesh.ts). The same reaction terms as live.wgsl, chosen by the
// same MODEL constant; the 5-point Laplacian is replaced by the surface's
// finite-volume Laplace–Beltrami operator, Σ_k w_k (f_k − f), over up to six
// neighbours (padding slots point at the cell itself with weight 0). Display
// only: not gated, never captured.

override MODEL: u32 = 0u;

struct Surf {
  cells: u32,
  _p0: u32,
  _p1: u32,
  _p2: u32,
  Du: f32,
  Dv: f32,
  dt: f32,      // the model step divided by the substep count
  F: f32,
  k: f32,
  c: f32,
  _p3: f32,
  _p4: f32,
};

@group(0) @binding(0) var<uniform> S: Surf;
@group(0) @binding(1) var<storage, read> state_in: array<f32>;
@group(0) @binding(2) var<storage, read_write> state_out: array<f32>;
@group(0) @binding(3) var<storage, read> nbr: array<vec4<u32>>;
@group(0) @binding(4) var<storage, read> wts: array<vec4<f32>>;

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= S.cells) { return; }
  let n0 = nbr[c * 2u];
  let n1 = nbr[c * 2u + 1u];
  let w0 = wts[c * 2u];
  let w1 = wts[c * 2u + 1u];
  let u = state_in[c * 2u];
  let v = state_in[c * 2u + 1u];
  let lap_u = w0.x * (state_in[n0.x * 2u] - u) + w0.y * (state_in[n0.y * 2u] - u)
            + w0.z * (state_in[n0.z * 2u] - u) + w0.w * (state_in[n0.w * 2u] - u)
            + w1.x * (state_in[n1.x * 2u] - u) + w1.y * (state_in[n1.y * 2u] - u);
  let lap_v = w0.x * (state_in[n0.x * 2u + 1u] - v) + w0.y * (state_in[n0.y * 2u + 1u] - v)
            + w0.z * (state_in[n0.z * 2u + 1u] - v) + w0.w * (state_in[n0.w * 2u + 1u] - v)
            + w1.x * (state_in[n1.x * 2u + 1u] - v) + w1.y * (state_in[n1.y * 2u + 1u] - v);
  let F = S.F;
  let k = S.k;
  var du: f32;
  var dv: f32;
  if (MODEL == 0u) {
    let uvv = u * v * v;
    du = S.Du * lap_u - uvv + F * (1.0 - u);
    dv = S.Dv * lap_v + uvv - (F + k) * v;
  } else if (MODEL == 1u) {
    let uuv = u * u * v;
    du = S.Du * lap_u + (F - (k + 1.0) * u + uuv);
    dv = S.Dv * lap_v + (k * u - uuv);
  } else if (MODEL == 2u) {
    let uu = u * u;
    du = S.Du * lap_u + (uu / v - F * u + S.c);
    dv = S.Dv * lap_v + (uu - k * v);
  } else {
    du = S.Du * lap_u + (u - u * u * u - v);
    dv = S.Dv * lap_v + F * (u - k * v - S.c);
  }
  state_out[c * 2u] = u + S.dt * du;
  state_out[c * 2u + 1u] = v + S.dt * dv;
}
