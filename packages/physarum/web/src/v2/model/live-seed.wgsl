// Slime Mould live solver: a scene's starting colony from (seed, agent index).
// Live scenes only — the gated scene loads the committed seed-42 IC instead.
#import physarum/live-common
#import bp/hash

struct Seed {
  seed: u32,
  mode: u32,        // 0 whole dish, 1 disc, 2 ring
  _p0: u32,
  _p1: u32,
  centre: vec2<f32>,
  radius: f32,
  spread: f32,      // heading jitter about outward, radians (disc / ring)
};
@group(1) @binding(0) var<uniform> S: Seed;
@group(1) @binding(1) var<storage, read_write> seeded: array<vec4<f32>>;

const TAU: f32 = 6.283185307179586;

@compute @workgroup_size(256)
fn seed_agents(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n_agents) { return; }
  let u0 = bp_unit(bp_hash3(S.seed, i, 0u));
  let u1 = bp_unit(bp_hash3(S.seed, i, 1u));
  let u2 = bp_unit(bp_hash3(S.seed, i, 2u));
  var p: vec2<f32>;
  var th: f32;
  if (S.mode == 0u) {
    p = vec2<f32>(u0 * f32(P.w), u1 * f32(P.h));
    th = u2 * TAU;
  } else {
    let a = u0 * TAU;
    var r = S.radius * sqrt(u1);
    if (S.mode == 2u) { r = S.radius * (0.9 + 0.1 * u1); }
    p = S.centre + r * vec2<f32>(cos(a), sin(a));
    th = a + (u2 - 0.5) * S.spread;
  }
  let dims = vec2<f32>(f32(P.w), f32(P.h));
  p = p - floor(p / dims) * dims;
  p = min(p, dims - vec2<f32>(1e-3));
  seeded[i] = vec4<f32>(p, cos(th), sin(th));
}
