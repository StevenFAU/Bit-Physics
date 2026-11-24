// Murmuration v2 — the grid's two own passes around @bp/gpu's CountingSort:
//   keys    each bird's dense cell id (clamped into the box, as v1's grid did)
//   gather  the birds' positions in cell order, with their ids: the step's
//           candidate loop then reads 16 contiguous bytes per candidate
// The step itself is murmur.wgsl.

struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

#import murmur/params

@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read> agents: array<Agent>;
@group(0) @binding(2) var<storage, read_write> keys: array<u32>;
@group(0) @binding(3) var<storage, read> order: array<u32>;
@group(0) @binding(4) var<storage, read_write> cand: array<vec4<f32>>;

@compute @workgroup_size(256)
fn cell_keys(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.counts.x) { return; }
  keys[i] = cell_id(cell_of(agents[i].position_speed.xyz));
}

@compute @workgroup_size(256)
fn gather(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x;
  if (k >= p.counts.x) { return; }
  let id = order[k];
  cand[k] = vec4<f32>(agents[id].position_speed.xyz, bitcast<f32>(id));
}
