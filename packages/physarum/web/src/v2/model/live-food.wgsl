// Slime Mould live solver (scenes): food crumbs deposit into the trail each
// step, as whole 1/65,536ths added atomically into the same deposit buffer as
// the agents — order-independent, so a run is still byte-for-byte repeatable,
// and the total each step is an exact integer the mass balance can add.
#import physarum/live-common

@group(1) @binding(0) var<storage, read> food: array<vec2<u32>>;   // (cell index, amount ×65536)
@group(1) @binding(1) var<storage, read_write> dep: array<atomic<u32>>;

@compute @workgroup_size(64)
fn food_deposit(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= arrayLength(&food)) { return; }
  let f = food[i];
  atomicAdd(&dep[f.x], f.y);
}
