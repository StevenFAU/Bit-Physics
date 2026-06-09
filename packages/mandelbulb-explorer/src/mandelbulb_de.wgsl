// Mandelbulb distance estimator (Quilez 2009 / Hubbard-Douady) — WGSL port of
// reference/quilez.py. Evaluates DE for the iterated map z_{n+1}=z^p+c (z0=c).
// One invocation per probe point. f32 GPU path.

struct Params { n_points: u32, p: u32, escape_radius: f32, n_max: u32, };
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read>       points: array<f32>; // 3 per point
@group(0) @binding(2) var<storage, read_write>  de_out: array<f32>;

const TINY: f32 = 1.0e-30;

fn pow_z(z: vec3<f32>, p: f32) -> vec3<f32> {
  let r2 = dot(z, z);
  if (r2 < TINY) { return vec3<f32>(0.0, 0.0, 0.0); }
  let r = sqrt(r2);
  let theta = acos(z.z / r);
  let phi = atan2(z.y, z.x);
  let rp = pow(r, p);
  let pt = p * theta;
  let pphi = p * phi;
  let sin_pt = sin(pt);
  return vec3<f32>(rp * sin_pt * cos(pphi), rp * sin_pt * sin(pphi), rp * cos(pt));
}

fn distance_estimator(c: vec3<f32>) -> f32 {
  var z = c;
  let p = f32(params.p);
  var dz: f32 = 1.0;
  let er2 = params.escape_radius * params.escape_radius;
  for (var i: u32 = 0u; i < params.n_max; i = i + 1u) {
    let r2 = dot(z, z);
    if (r2 > er2) {
      let r = sqrt(r2);
      return 0.5 * r * log(r) / dz;
    }
    let r = select(0.0, sqrt(r2), r2 > 0.0);
    dz = p * pow(r, p - 1.0) * dz + 1.0;
    z = pow_z(z, p) + c;
  }
  return 0.0;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= params.n_points) { return; }
  let c = vec3<f32>(points[idx*3u+0u], points[idx*3u+1u], points[idx*3u+2u]);
  de_out[idx] = distance_estimator(c);
}
