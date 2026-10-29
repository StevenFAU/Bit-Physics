// Slime Mould live solver: a scene's starting colony from (seed, agent index).
// Live scenes only — the gated scene loads the committed seed-42 IC instead.
// Territories (flag bit 7): mode 0 deals each agent to a colony at random;
// mode 3 releases one awake disc per colony (centres `colony`) on a dormant
// dish. The colony rides in the heading's length, 1 + k/8.
#import physarum/live-common
#import bp/hash

struct Seed {
  seed: u32,
  mode: u32,        // 0 whole dish, 1 disc, 2 ring, 3 whole dish dormant outside a disc
  _p0: u32,
  _p1: u32,
  centre: vec2<f32>,
  radius: f32,
  spread: f32,      // heading jitter about outward, radians (disc / ring)
  colony: array<vec4<f32>, 2>,   // territories, mode 3: the colonies' disc centres (xy, zw)
};
@group(1) @binding(0) var<uniform> S: Seed;
@group(1) @binding(1) var<storage, read_write> seeded: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read_write> awake: array<atomic<u32>>;
@group(1) @binding(3) var<storage, read> env: array<f32>;   // a scene's walls (WALL), else anything

fn in_wall(q: vec2<f32>) -> bool {
  if ((P.flags & 8u) == 0u) { return false; }
  let c = vec2<u32>(min(vec2<f32>(max(q, vec2<f32>(0.0))), vec2<f32>(f32(P.w) - 1.0, f32(P.h) - 1.0)));
  return env[c.y * P.w + c.x] <= WALL;
}

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
  var dormant = false;
  let colonies = (P.flags & 128u) != 0u;
  var col = 0u;
  if (S.mode == 0u || S.mode == 3u) {
    p = vec2<f32>(u0 * f32(P.w), u1 * f32(P.h));
    th = u2 * TAU;
    // never start inside a wall: draw again (a few tries) from the same agent's stream
    for (var k = 3u; k < 35u && in_wall(p); k = k + 2u) {
      p = vec2<f32>(bp_unit(bp_hash3(S.seed, i, k)) * f32(P.w), bp_unit(bp_hash3(S.seed, i, k + 1u)) * f32(P.h));
    }
    if (colonies && S.mode == 3u) {
      // one awake disc per colony; everyone else waits for a colony's trail
      dormant = true;
      for (var j = 0u; j < P.species; j = j + 1u) {
        let c4 = S.colony[j / 2u];
        let c = select(c4.xy, c4.zw, (j & 1u) == 1u);
        let d = p - c;
        if (dot(d, d) <= S.radius * S.radius) {
          dormant = false;
          col = j;
          th = atan2(d.y, d.x) + (u2 - 0.5) * S.spread;
        }
      }
    } else if (colonies) {
      col = bp_hash3(S.seed, i, 101u) % P.species;
    } else if (S.mode == 3u) {
      let d = p - S.centre;
      dormant = dot(d, d) > S.radius * S.radius;
      if (!dormant) { th = atan2(d.y, d.x) + (u2 - 0.5) * S.spread; }
    }
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
  var hd = vec2<f32>(cos(th), sin(th));
  if (dormant) {
    hd.x = hd.x + 3.0;
  } else {
    if (S.mode == 3u || colonies) { atomicAdd(&awake[0], 1u); }
    if (colonies) {
      atomicAdd(&awake[SP_COUNT + col], 1u);
      hd = hd * (1.0 + f32(col) * SPECIES_STEP);
    }
  }
  seeded[i] = vec4<f32>(p, hd);
}
