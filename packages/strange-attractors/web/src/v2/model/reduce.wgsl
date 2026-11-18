// Chaos — the ensemble's spread: per-workgroup sums of (x, y, z, |x|²),
// finished in f64 on the CPU.

struct Reduce {
  // x = particles, y = particles per workgroup, z = where this sample's partials start
  n: vec4<u32>,
};

@group(0) @binding(0) var<uniform> D: Reduce;
@group(0) @binding(1) var<storage, read> src: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> partial: array<vec4<f32>>;

var<workgroup> acc: array<vec4<f32>, 256>;

@compute @workgroup_size(256)
fn reduce(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let per = D.n.y;
  let base = wid.x * per;
  var a = vec4<f32>(0.0);
  for (var k = lid.x; k < per; k = k + 256u) {
    let j = base + k;
    if (j < D.n.x) {
      let p = src[j].xyz;
      a += vec4<f32>(p, dot(p, p));
    }
  }
  acc[lid.x] = a;
  workgroupBarrier();
  for (var s = 128u; s > 0u; s = s >> 1u) {
    if (lid.x < s) {
      acc[lid.x] += acc[lid.x + s];
    }
    workgroupBarrier();
  }
  if (lid.x == 0u) {
    partial[D.n.z + wid.x] = acc[0];
  }
}
