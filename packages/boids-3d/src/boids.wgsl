// Boids 3D — Reynolds 1987/1999 flocking compute (Stack B WGSL).
//
// Ports boids_3d.reference._flock_accel + the explicit-Euler integrate with
// v_max clamp. One invocation per agent; the neighbour reduction is a single
// sorted-by-index (j = 0..n-1) loop, matching the NumPy reference's left-to-
// right traversal (determinism strategy clause 4) — no parallel reduction tree.
//
// State buffers are flat f32 (3 per agent). f32 vs the f64 canonical is a pure
// precision question (no chaos-amplifying RNG in the dynamics); the web-build
// gate MEASURES the cross-stack round-trip and falls back to new-canonical only
// if no sound tolerance holds.

struct Params {
  n: u32,
  perception: f32,
  v_max: f32,
  w_sep: f32,
  w_align: f32,
  w_cohere: f32,
  dt: f32,
  _pad: f32,
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read>       pos_in: array<f32>;
@group(0) @binding(2) var<storage, read>       vel_in: array<f32>;
@group(0) @binding(3) var<storage, read_write>  pos_out: array<f32>;
@group(0) @binding(4) var<storage, read_write>  vel_out: array<f32>;

fn pos_of(i: u32) -> vec3<f32> {
  return vec3<f32>(pos_in[i * 3u], pos_in[i * 3u + 1u], pos_in[i * 3u + 2u]);
}
fn vel_of(i: u32) -> vec3<f32> {
  return vec3<f32>(vel_in[i * 3u], vel_in[i * 3u + 1u], vel_in[i * 3u + 2u]);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let p_i = pos_of(i);
  let v_i = vel_of(i);
  let perc2 = P.perception * P.perception;

  var w_sum: f32 = 0.0;
  var sep_accum = vec3<f32>(0.0);
  var v_sum = vec3<f32>(0.0);
  var p_sum = vec3<f32>(0.0);
  var count: f32 = 0.0;

  for (var j: u32 = 0u; j < P.n; j = j + 1u) {
    if (j == i) { continue; }
    let p_j = pos_of(j);
    let d = p_i - p_j;
    let d2 = dot(d, d);
    if (d2 <= perc2) {
      let invd2 = 1.0 / d2;
      w_sum = w_sum + invd2;
      sep_accum = sep_accum + invd2 * p_j;
      v_sum = v_sum + vel_of(j);
      p_sum = p_sum + p_j;
      count = count + 1.0;
    }
  }

  let sep = p_i * w_sum - sep_accum;
  var align = vec3<f32>(0.0);
  var cohere = vec3<f32>(0.0);
  if (count > 0.0) {
    align = v_sum / count - v_i;
    cohere = p_sum / count - p_i;
  }
  let accel = P.w_sep * sep + P.w_align * align + P.w_cohere * cohere;
  var v_new = v_i + P.dt * accel;
  let vmag = length(v_new);
  if (vmag > P.v_max) { v_new = v_new * (P.v_max / vmag); }
  let p_new = p_i + P.dt * v_new;

  pos_out[i * 3u + 0u] = p_new.x;
  pos_out[i * 3u + 1u] = p_new.y;
  pos_out[i * 3u + 2u] = p_new.z;
  vel_out[i * 3u + 0u] = v_new.x;
  vel_out[i * 3u + 1u] = v_new.y;
  vel_out[i * 3u + 2u] = v_new.z;
}
