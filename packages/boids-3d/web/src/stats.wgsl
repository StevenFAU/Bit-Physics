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

var<workgroup> pos_sum: array<vec4<f32>, 256>;
var<workgroup> heading_sum: array<vec4<f32>, 256>;
var<workgroup> metric_sum: array<vec4<f32>, 256>;

@compute @workgroup_size(256)
fn reduce_stats(@builtin(local_invocation_id) lid3: vec3<u32>) {
  let lid = lid3.x;
  var ps = vec4<f32>(0.0);
  var hs = vec4<f32>(0.0);
  var ms = vec4<f32>(0.0);
  for (var i = lid; i < params.count; i += 256u) {
    let a = agents[i];
    ps += vec4<f32>(a.position_speed.xyz, 1.0);
    hs += vec4<f32>(a.heading_roll.xyz, 0.0);
    ms += vec4<f32>(a.position_speed.w, a.behavior.x, a.behavior.y, a.heading_roll.w * a.heading_roll.w);
  }
  pos_sum[lid] = ps;
  heading_sum[lid] = hs;
  metric_sum[lid] = ms;
  workgroupBarrier();
  var stride = 128u;
  while (stride > 0u) {
    if (lid < stride) {
      pos_sum[lid] += pos_sum[lid + stride];
      heading_sum[lid] += heading_sum[lid + stride];
      metric_sum[lid] += metric_sum[lid + stride];
    }
    stride /= 2u;
    workgroupBarrier();
  }
  if (lid == 0u) {
    let inv = 1.0 / max(pos_sum[0].w, 1.0);
    let centroid = pos_sum[0].xyz * inv;
    stats[0] = vec4<f32>(centroid, length(heading_sum[0].xyz) * inv);
    stats[1] = metric_sum[0] * inv;
    stats[2] = vec4<f32>(heading_sum[0].xyz * inv, pos_sum[0].w);
  }
}

@compute @workgroup_size(256)
fn reduce_shape(@builtin(local_invocation_id) lid3: vec3<u32>) {
  let lid = lid3.x;
  let centroid = stats[0].xyz;
  var radius2 = 0.0;
  var angular = vec3<f32>(0.0);
  var vertical2 = 0.0;
  for (var i = lid; i < params.count; i += 256u) {
    let a = agents[i];
    let r = a.position_speed.xyz - centroid;
    radius2 = max(radius2, dot(r, r));
    let rlen = length(r);
    if (rlen > 1e-6) { angular += cross(r / rlen, a.heading_roll.xyz); }
    vertical2 += r.y * r.y;
  }
  pos_sum[lid] = vec4<f32>(angular, radius2);
  metric_sum[lid] = vec4<f32>(vertical2, 0.0, 0.0, 0.0);
  workgroupBarrier();
  var stride = 128u;
  while (stride > 0u) {
    if (lid < stride) {
      let left = pos_sum[lid];
      let right = pos_sum[lid + stride];
      pos_sum[lid] = vec4<f32>(left.xyz + right.xyz, max(left.w, right.w));
      metric_sum[lid] += metric_sum[lid + stride];
    }
    stride /= 2u;
    workgroupBarrier();
  }
  if (lid == 0u) {
    let inv = 1.0 / max(f32(params.count), 1.0);
    stats[3] = vec4<f32>(length(pos_sum[0].xyz) * inv, sqrt(pos_sum[0].w), sqrt(metric_sum[0].x * inv), 0.0);
  }
}
