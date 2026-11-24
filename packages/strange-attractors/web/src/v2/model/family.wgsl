// The Family (05-strange-attractors.md, M3): one density kernel for the nine
// systems of the v1 registry — the fields of v1's attractors_rk4.wgsl (same
// numbering; Lorenz is 0), f32 RK4 at each system's own Δt. Not a gated
// kernel. No builtin sin/cos/exp: Thomas's sines are a range-reduced odd
// polynomial (error below 6e-8 before f32 rounding), so a Prove comparison
// against f64 measures the integration, not the GPU's sine.

#import bp/hash

struct FamParams {
  // p0…p3, then p4, p5, Δt, 1 / (speed at the top of the palette)
  p: vec4<f32>,
  q: vec4<f32>,
  // points, steps this dispatch, field id, mode (0 step, 1 seed)
  n: u32,
  steps: u32,
  id: u32,
  mode: u32,
  // points per seed, hash seed, seed jitter (model units)
  fan: u32,
  seed: u32,
  jitter: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> F: FamParams;
@group(0) @binding(1) var<storage, read_write> state: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> prev: array<vec4<f32>>;
// f64 points along one trajectory (rounded to f32): each fans out to `fan` points
@group(0) @binding(3) var<storage, read> seeds: array<vec4<f32>>;

/// sin(x) for the bounded Thomas states: x − k·2π (2π split in two parts), folded to [−π/2, π/2], Taylor to x¹¹.
fn psin(x: f32) -> f32 {
  let k = floor(x * 0.15915494309189535 + 0.5);
  var r = (x - k * 6.28125) - k * 0.0019353071795864769;
  if (r > 1.5707963267948966) {
    r = 3.141592653589793 - r;
  }
  if (r < -1.5707963267948966) {
    r = -3.141592653589793 - r;
  }
  let r2 = r * r;
  return r * (1.0 + r2 * (-0.16666666666666666 + r2 * (0.008333333333333333 + r2 * (-0.0001984126984126984 + r2 * (2.7557319223985893e-6 + r2 * -2.505210838544172e-8)))));
}

fn field(s: vec3<f32>) -> vec3<f32> {
  let p = F.p;
  let q = F.q;
  switch F.id {
    case 1u: {
      return vec3<f32>(-s.y - s.z, s.x + p.x * s.y, p.y + s.z * (s.x - p.z));
    }
    case 2u: {
      let r2 = s.x * s.x + s.y * s.y;
      return vec3<f32>(
        (s.z - p.y) * s.x - p.w * s.y,
        p.w * s.x + (s.z - p.y) * s.y,
        p.z + p.x * s.z - (s.z * s.z * s.z) / 3.0 - r2 * (1.0 + q.x * s.z) + q.y * s.z * s.x * s.x * s.x,
      );
    }
    case 3u: {
      return vec3<f32>(s.y, -s.x + s.y * s.z, 1.0 - s.y * s.y);
    }
    case 4u: {
      return vec3<f32>(psin(s.y) - p.x * s.x, psin(s.z) - p.x * s.y, psin(s.x) - p.x * s.z);
    }
    case 5u: {
      return vec3<f32>(
        -p.x * s.x - 4.0 * s.y - 4.0 * s.z - s.y * s.y,
        -p.x * s.y - 4.0 * s.z - 4.0 * s.x - s.z * s.z,
        -p.x * s.z - 4.0 * s.x - 4.0 * s.y - s.x * s.x,
      );
    }
    case 6u: {
      return vec3<f32>(s.y - p.x * s.x + p.y * s.y * s.z, p.z * s.y - s.x * s.z + s.z, p.w * s.x * s.y - q.x * s.z);
    }
    case 7u: {
      return vec3<f32>(p.x * (s.y - s.x), (p.z - p.x) * s.x - s.x * s.z + p.z * s.y, s.x * s.y - p.y * s.z);
    }
    case 8u: {
      return vec3<f32>(p.x * s.x + p.z * s.y * s.z, p.y * s.x + p.w * s.y - s.x * s.z, q.x * s.z + q.y * s.x * s.y);
    }
    default: {
      return vec3<f32>(p.x * (s.y - s.x), s.x * (p.y - s.z) - s.y, s.x * s.y - p.z * s.z);
    }
  }
}

fn rk4(s: vec3<f32>) -> vec3<f32> {
  let h = F.q.z;
  let k1 = field(s);
  let k2 = field(s + 0.5 * h * k1);
  let k3 = field(s + 0.5 * h * k2);
  let k4 = field(s + h * k3);
  return s + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}

fn seed_of(i: u32) -> vec3<f32> {
  let u = vec3<f32>(
    bp_unit(bp_hash3(F.seed, i, 0u)),
    bp_unit(bp_hash3(F.seed, i, 1u)),
    bp_unit(bp_hash3(F.seed, i, 2u)),
  ) * 2.0 - vec3<f32>(1.0);
  return seeds[i / max(F.fan, 1u)].xyz + F.jitter * u;
}

@compute @workgroup_size(256)
fn family_step(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= F.n) {
    return;
  }
  if (F.mode == 1u) {
    let s0 = seed_of(i);
    state[i] = vec4<f32>(s0, 0.0);
    prev[i] = vec4<f32>(s0, 0.0);
    return;
  }
  let q = state[i];
  prev[i] = q;
  var s = q.xyz;
  for (var k: u32 = 0u; k < F.steps; k = k + 1u) {
    s = rk4(s);
  }
  // a point that left (or lost) the flow starts again from its seed
  if (!(dot(s, s) < 1e12)) {
    s = seed_of(i);
  }
  state[i] = vec4<f32>(s, clamp(length(field(s)) * F.q.w, 0.0, 1.0));
}
