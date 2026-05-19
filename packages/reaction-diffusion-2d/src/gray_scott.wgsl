// Gray-Scott reaction-diffusion 2D — compute shader (Stack B / WebGPU).
//
// Spec § 5.2.1 + docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md.
//
// Two double-buffered storage arrays interleave U and V; each cell reads
// the 5-point Laplacian neighborhood from the "read" buffer and writes
// the new value to the "write" buffer. No atomic operations, no
// subgroup operations — preserves the bit-exact-same-hw determinism
// declaration.
//
// Per-cell layout: state[idx*2] = U, state[idx*2 + 1] = V.

struct Params {
  n: u32,
  step: u32,
  Du: f32,
  Dv: f32,
  F: f32,
  k: f32,
  dx: f32,
  dt: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read>      state_in:  array<f32>;
@group(0) @binding(2) var<storage, read_write> state_out: array<f32>;

fn wrap(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

fn cell(i: i32, j: i32, channel: u32) -> f32 {
  let n  = i32(params.n);
  let ii = wrap(i, n);
  let jj = wrap(j, n);
  let idx = (u32(jj) * params.n + u32(ii)) * 2u + channel;
  return state_in[idx];
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let i  = i32(gid.x);
  let j  = i32(gid.y);
  let u  = cell(i, j, 0u);
  let v  = cell(i, j, 1u);

  let lap_u = (cell(i - 1, j, 0u) + cell(i + 1, j, 0u)
             + cell(i, j - 1, 0u) + cell(i, j + 1, 0u)
             - 4.0 * u) / (params.dx * params.dx);
  let lap_v = (cell(i - 1, j, 1u) + cell(i + 1, j, 1u)
             + cell(i, j - 1, 1u) + cell(i, j + 1, 1u)
             - 4.0 * v) / (params.dx * params.dx);

  let uvv = u * v * v;
  let du  = params.Du * lap_u - uvv + params.F * (1.0 - u);
  let dv  = params.Dv * lap_v + uvv - (params.F + params.k) * v;

  let idx = (gid.y * params.n + gid.x) * 2u;
  state_out[idx + 0u] = u + params.dt * du;
  state_out[idx + 1u] = v + params.dt * dv;
}
