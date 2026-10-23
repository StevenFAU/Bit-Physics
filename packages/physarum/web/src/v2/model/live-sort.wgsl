// Slime Mould live solver: one tile key per agent for the counting sort
// (tiles are 2^tile_shift cells square, row-major).
#import physarum/live-common

@group(1) @binding(0) var<storage, read> agents_src: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read_write> keys: array<u32>;

@compute @workgroup_size(256)
fn sort_keys(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n_agents) { return; }
  let p = agents_src[i].xy;
  let cx = u32(wrapi(i32(round(p.x)), i32(P.w)));
  let cy = u32(wrapi(i32(round(p.y)), i32(P.h)));
  keys[i] = (cy >> P.tile_shift) * P.tiles_x + (cx >> P.tile_shift);
}
