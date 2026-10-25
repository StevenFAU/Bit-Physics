// Slime Mould live solver (territories): each colony's strength per tile.
// The dish is cut into 32 × 32-cell tiles (TILE). Each workgroup sums one
// tile, each thread a 2 × 2 block, and writes every colony's tile mean
// against that colony's own mean (`mean`): 1 = as much trail as a colony
// holds per cell when the dish's agents are shared equally. Who holds which
// tile is decided on the CPU from these (model/territory.ts).
#import physarum/live-common

struct Shares {
  mean: vec4<f32>,   // per colony: its mean trail per cell
  tiles_x: u32,
  _p0: u32,
  _p1: u32,
  _p2: u32,
};

@group(1) @binding(0) var<storage, read> T: array<f32>;
@group(1) @binding(1) var<storage, read_write> out: array<vec4<f32>>;   // per tile, row-major
@group(1) @binding(2) var<uniform> Q: Shares;

var<workgroup> part: array<vec4<f32>, 256>;
var<workgroup> count: array<u32, 256>;

@compute @workgroup_size(16, 16)
fn shares(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let plane = P.w * P.h;
  var s = vec4<f32>(0.0);
  var n = 0u;
  for (var dy = 0u; dy < 2u; dy = dy + 1u) {
    for (var dx = 0u; dx < 2u; dx = dx + 1u) {
      let x = wid.x * 32u + lid.x * 2u + dx;
      let y = wid.y * 32u + lid.y * 2u + dy;
      if (x < P.w && y < P.h) {
        let idx = y * P.w + x;
        for (var k = 0u; k < P.species; k = k + 1u) { s[k] = s[k] + T[k * plane + idx]; }
        n = n + 1u;
      }
    }
  }
  part[li] = s;
  count[li] = n;
  workgroupBarrier();
  for (var stride = 128u; stride > 0u; stride = stride >> 1u) {
    if (li < stride) {
      part[li] = part[li] + part[li + stride];
      count[li] = count[li] + count[li + stride];
    }
    workgroupBarrier();
  }
  if (li == 0u) {
    out[wid.y * Q.tiles_x + wid.x] = part[0] / (f32(max(count[0], 1u)) * Q.mean);
  }
}
