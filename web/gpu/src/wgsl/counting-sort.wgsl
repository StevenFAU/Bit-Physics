// bp counting sort — bucket items by a u32 key (a grid cell, a tile):
//   clear     counts[0..keys] = 0
//   histogram rank[i] = atomicAdd(&counts[key[i]], 1)   (count per key)
//   (scan.wgsl turns counts into exclusive offsets: cell_start, plus the total)
//   scatter   order[cell_start[key[i]] + rank[i]] = i
// Counts and cell_start are exact and deterministic. The order of items
// WITHIN one key comes from atomic arrival and is unspecified: consumers must
// be invariant to it (integer-atomic deposits, i32 neighbour sums).

struct SortParams {
  count: u32,     // items
  keys: u32,      // key range; counts has keys + 1 entries
  stride: u32,    // threads per row of the 2D dispatch (groups_x · 256)
  _p0: u32,
};

@group(0) @binding(0) var<uniform> P: SortParams;
@group(0) @binding(1) var<storage, read> key: array<u32>;
@group(0) @binding(2) var<storage, read_write> counts: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> rank: array<u32>;
@group(0) @binding(4) var<storage, read_write> order: array<u32>;

fn item(gid: vec3<u32>) -> u32 {
  return gid.x + gid.y * P.stride;
}

@compute @workgroup_size(256)
fn clear(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = item(gid);
  if (i <= P.keys) { atomicStore(&counts[i], 0u); }
}

@compute @workgroup_size(256)
fn histogram(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = item(gid);
  if (i >= P.count) { return; }
  let k = min(key[i], P.keys - 1u);
  rank[i] = atomicAdd(&counts[k], 1u);
}

@compute @workgroup_size(256)
fn scatter(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = item(gid);
  if (i >= P.count) { return; }
  let k = min(key[i], P.keys - 1u);
  order[atomicLoad(&counts[k]) + rank[i]] = i;
}
