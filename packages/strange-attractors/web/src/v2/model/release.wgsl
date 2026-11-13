// Chaos — release a ball of offsets (or seed the density population).
#import bp/hash

struct Release {
  // xyz colour axis (unit), w = ball radius
  axis_eps: vec4<f32>,
  // x = seed, y = particles, z = first index, w = mode (0 ball, 1 density box)
  ctl: vec4<u32>,
  // density mode: box centre (xyz), w = half size
  box: vec4<f32>,
};

@group(0) @binding(0) var<uniform> R: Release;
@group(0) @binding(1) var<storage, read_write> out_state: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> out_prev: array<vec4<f32>>;

fn ball_point(seed: u32, i: u32) -> vec3<f32> {
  // rejection from the cube, deterministic per (seed, i)
  for (var t: u32 = 0u; t < 16u; t = t + 1u) {
    let u = vec3<f32>(
      bp_unit(bp_hash3(seed, i, t * 3u)),
      bp_unit(bp_hash3(seed, i, t * 3u + 1u)),
      bp_unit(bp_hash3(seed, i, t * 3u + 2u)),
    ) * 2.0 - vec3<f32>(1.0);
    if (dot(u, u) <= 1.0) {
      return u;
    }
  }
  return vec3<f32>(0.0);
}

@compute @workgroup_size(256)
fn release(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= R.ctl.y) {
    return;
  }
  let j = i + R.ctl.z;
  var q: vec4<f32>;
  if (R.ctl.w == 0u) {
    // member 0 is the reference itself (offset exactly zero)
    let u = select(ball_point(R.ctl.x, j), vec3<f32>(0.0), j == 0u);
    q = vec4<f32>(u * R.axis_eps.w, clamp(0.5 + 0.5 * dot(u, R.axis_eps.xyz), 0.0, 1.0));
  } else {
    let u = ball_point(R.ctl.x, j);
    q = vec4<f32>(R.box.xyz + u * R.box.w, bp_unit(bp_hash3(R.ctl.x, j, 99u)));
  }
  out_state[j] = q;
  out_prev[j] = q;
}
