// Road to Chaos (05-strange-attractors.md, "The model": bifurcation
// diagram): columns of trajectories, each column at its own ρ (from
// `rhos`), integrated by f32 RK4 at the gated Δt. After a warm-up the local
// maxima of z (a three-point parabola through the samples around each peak)
// are binned by z / ρ into the column's histogram; the diagram fills in as
// the frames go by. Not the gated kernel; no builtin sin/cos/exp.
#import bp/hash

struct BifParams {
  sigma: f32,
  beta: f32,
  dt: f32,
  // y range of the histogram: z_peak / ρ in [y0, y1)
  y0: f32,
  y1: f32,
  _f0: f32,
  _f1: f32,
  _f2: f32,
  // trajectories, per column, columns, bins per column
  n: u32,
  per: u32,
  cols: u32,
  bins: u32,
  // steps this dispatch, warm-up steps before peaks count, seed, mode (0 step, 1 init)
  steps: u32,
  warm: u32,
  seed: u32,
  mode: u32,
};

@group(0) @binding(0) var<uniform> B: BifParams;
@group(0) @binding(1) var<storage, read> rhos: array<f32>;
// xyz state, w unused
@group(0) @binding(2) var<storage, read_write> state: array<vec4<f32>>;
// the last two z samples (x, y) and the steps taken so far (z, a float: exact to 2^24)
@group(0) @binding(3) var<storage, read_write> hist: array<vec4<f32>>;
// counts[bin * cols + col]
@group(0) @binding(4) var<storage, read_write> counts: array<atomic<u32>>;
// peaks counted per column
@group(0) @binding(5) var<storage, read_write> totals: array<atomic<u32>>;

fn field(s: vec3<f32>, rho: f32) -> vec3<f32> {
  return vec3<f32>(B.sigma * (s.y - s.x), s.x * (rho - s.z) - s.y, s.x * s.y - B.beta * s.z);
}

fn rk4(s: vec3<f32>, rho: f32) -> vec3<f32> {
  let k1 = field(s, rho);
  let k2 = field(s + 0.5 * B.dt * k1, rho);
  let k3 = field(s + 0.5 * B.dt * k2, rho);
  let k4 = field(s + B.dt * k3, rho);
  return s + (B.dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}

/// The start of trajectory i: near the attractor's scale for its ρ, from the counter hash.
fn start_of(i: u32, rho: f32) -> vec3<f32> {
  let u = vec3<f32>(
    bp_unit(bp_hash3(B.seed, i, 0u)),
    bp_unit(bp_hash3(B.seed, i, 1u)),
    bp_unit(bp_hash3(B.seed, i, 2u)),
  ) * 2.0 - vec3<f32>(1.0);
  let a = sqrt(max(B.beta * (rho - 1.0), 1.0));
  return vec3<f32>(u.x * a, u.y * a, max(rho - 1.0, 1.0) * (1.0 + 0.3 * u.z));
}

@compute @workgroup_size(256)
fn bif_step(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= B.n) {
    return;
  }
  let col = i / B.per;
  let rho = rhos[col];
  if (B.mode == 1u) {
    let s0 = start_of(i, rho);
    state[i] = vec4<f32>(s0, 0.0);
    hist[i] = vec4<f32>(s0.z, s0.z, 0.0, 0.0);
    return;
  }
  var s = state[i].xyz;
  let hq = hist[i];
  var z0 = hq.x;
  var z1 = hq.y;
  var age = u32(hq.z);
  let span = B.y1 - B.y0;
  for (var k: u32 = 0u; k < B.steps; k = k + 1u) {
    s = rk4(s, rho);
    let z2 = s.z;
    if (age >= B.warm && z1 > z0 && z1 >= z2) {
      let d = z0 - 2.0 * z1 + z2;
      var zp = z1;
      if (d < 0.0) {
        zp = z1 - (z2 - z0) * (z2 - z0) / (8.0 * d);
      }
      let y = zp / rho;
      let b = i32(floor((y - B.y0) / span * f32(B.bins)));
      if (b >= 0 && b < i32(B.bins)) {
        atomicAdd(&counts[u32(b) * B.cols + col], 1u);
        atomicAdd(&totals[col], 1u);
      }
    }
    z0 = z1;
    z1 = z2;
    age = age + 1u;
  }
  state[i] = vec4<f32>(s, 0.0);
  hist[i] = vec4<f32>(z0, z1, f32(min(age, 16000000u)), 0.0);
}
