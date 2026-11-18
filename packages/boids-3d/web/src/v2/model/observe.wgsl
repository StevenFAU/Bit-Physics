// Murmuration v2 — extra flock observables for Learn (labelled model
// behaviour, never gated). Runs after v1's reduce_stats / reduce_shape
// (src/stats.wgsl) in the same bind group: stats[0].xyz is the centroid they
// wrote. One workgroup loops over every bird (the low-rate instrument path,
// a few times a second).
//
//   stats[4] = centred second moments xx, yy, zz, count
//   stats[5] = centred second moments xy, xz, yz, 0
//   stats[6] = (Σ nearest-neighbour distance over birds with one in reach,
//               how many have one, Σ speed², 0)

struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

struct StatsParams { count: u32, _a: u32, _b: u32, _c: u32, }
@group(0) @binding(0) var<uniform> params: StatsParams;
@group(0) @binding(1) var<storage, read> agents: array<Agent>;
@group(0) @binding(2) var<storage, read_write> stats: array<vec4<f32>>;

var<workgroup> diag: array<vec4<f32>, 256>;
var<workgroup> off: array<vec4<f32>, 256>;
var<workgroup> nnd: array<vec4<f32>, 256>;

// The nearest neighbour (behavior.z = sqrt of the closest candidate's squared
// distance) only counts when one was inside the social reach; otherwise the
// kernel leaves 1e15 there.
const REACH: f32 = 1e6;

@compute @workgroup_size(256)
fn reduce_extra(@builtin(local_invocation_id) lid3: vec3<u32>) {
  let lid = lid3.x;
  let c = stats[0].xyz;
  var d = vec4<f32>(0.0);
  var o = vec4<f32>(0.0);
  var m = vec4<f32>(0.0);
  for (var i = lid; i < params.count; i += 256u) {
    let a = agents[i];
    let r = a.position_speed.xyz - c;
    d += vec4<f32>(r * r, 1.0);
    o += vec4<f32>(r.x * r.y, r.x * r.z, r.y * r.z, 0.0);
    let near = a.behavior.z;
    if (near < REACH) { m += vec4<f32>(near, 1.0, 0.0, 0.0); }
    m.z += a.position_speed.w * a.position_speed.w;
  }
  diag[lid] = d;
  off[lid] = o;
  nnd[lid] = m;
  workgroupBarrier();
  var stride = 128u;
  while (stride > 0u) {
    if (lid < stride) {
      diag[lid] += diag[lid + stride];
      off[lid] += off[lid + stride];
      nnd[lid] += nnd[lid + stride];
    }
    stride /= 2u;
    workgroupBarrier();
  }
  if (lid == 0u) {
    stats[4] = diag[0];
    stats[5] = off[0];
    stats[6] = nnd[0];
  }
}
