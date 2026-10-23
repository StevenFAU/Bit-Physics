// Slime Mould live solver: reorder agents into tile order (CountingSort's
// order). A pure permutation: no agent's state changes, so neither does the
// trail.
#import physarum/live-common

@group(1) @binding(0) var<storage, read> agents_src: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> order: array<u32>;
@group(1) @binding(2) var<storage, read_write> agents_dst: array<vec4<f32>>;

@compute @workgroup_size(256)
fn gather(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n_agents) { return; }
  agents_dst[i] = agents_src[order[i]];
}
