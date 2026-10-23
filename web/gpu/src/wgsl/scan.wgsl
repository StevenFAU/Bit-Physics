// bp scan — exclusive prefix sum of u32, in place, 1024 values per workgroup
// (256 threads × 4). One level of the multi-level scan in scan.ts: each block
// is scanned locally and its total written to `sums`; the next level scans
// `sums`, and `add_offsets` folds the scanned block totals back down.
// Integer adds: the result is exact and independent of execution order.

struct ScanParams {
  n: u32,        // values at this level
  groups_x: u32, // workgroups along x (2D dispatch past 65535 groups)
  _p0: u32,
  _p1: u32,
};

@group(0) @binding(0) var<uniform> S: ScanParams;
@group(0) @binding(1) var<storage, read_write> data: array<u32>;
@group(0) @binding(2) var<storage, read_write> sums: array<u32>;

const WG: u32 = 256u;
const PER: u32 = 4u;
const BLOCK: u32 = 1024u;

var<workgroup> part: array<u32, 256>;

fn block_index(wid: vec3<u32>) -> u32 {
  return wid.x + wid.y * S.groups_x;
}

@compute @workgroup_size(256)
fn scan_blocks(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let b = block_index(wid);
  let base = b * BLOCK + lid.x * PER;
  var local_excl: array<u32, 4>;
  var acc = 0u;
  for (var k = 0u; k < PER; k = k + 1u) {
    let i = base + k;
    var x = 0u;
    if (i < S.n) { x = data[i]; }
    local_excl[k] = acc;
    acc = acc + x;
  }
  part[lid.x] = acc;
  workgroupBarrier();
  // inclusive Hillis–Steele over the 256 thread totals
  for (var off = 1u; off < WG; off = off << 1u) {
    var t = 0u;
    if (lid.x >= off) { t = part[lid.x - off]; }
    workgroupBarrier();
    part[lid.x] = part[lid.x] + t;
    workgroupBarrier();
  }
  var excl = 0u;
  if (lid.x > 0u) { excl = part[lid.x - 1u]; }
  for (var k = 0u; k < PER; k = k + 1u) {
    let i = base + k;
    if (i < S.n) { data[i] = excl + local_excl[k]; }
  }
  if (lid.x == WG - 1u) { sums[b] = part[WG - 1u]; }
}

@compute @workgroup_size(256)
fn add_offsets(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let b = block_index(wid);
  let off = sums[b];
  let base = b * BLOCK + lid.x * PER;
  for (var k = 0u; k < PER; k = k + 1u) {
    let i = base + k;
    if (i < S.n) { data[i] = data[i] + off; }
  }
}
