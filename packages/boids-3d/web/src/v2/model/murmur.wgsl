// Murmuration v2's live flock (07-boids-3d.md, "The model"; M1). A fork of v1's
// src/starling.wgsl — which stays byte-frozen for v1 — keeping its rule (seven
// nearest visible neighbours, one nearest to avoid, a rear blind cone, bounded
// and banked turning, cruise-speed relaxation) and changing what M0 measured
// did not work:
//
//  * Order. v1 pulled every bird towards the roost's centre from a fifth of the
//    way out, so the flock milled (polarization 0.007–0.06). Here the roost only
//    turns birds back once they fly past its edge (Hildenbrandt, Carere &
//    Hemelrijk 2010), and cohesion grows towards the flock's edge (a bird's
//    "centrality": how one-sided its neighbours are), so the flock stays one
//    dense, ordered body with sharp borders and folds as it turns.
//  * The alarm spreads only through the seven neighbours a bird follows, after
//    a reaction delay, then the bird is refractory (Attanasi et al. 2014: by
//    contact, never by broadcast). v1 took the most alarmed of every visible
//    bird in reach. Timers are integer steps, so the wave is exact on replay.
//  * The search. Bounding the alarm to the selected neighbours makes the result
//    depend only on the k-nearest set, so the search can stop early: cells are
//    scanned in shells around the bird's own, and it stops once the seventh
//    visible neighbour is nearer than anything in an unscanned cell. Threads
//    walk the birds in cell order and read candidates from a gathered,
//    cell-ordered array (murmur-grid.wgsl).
//
// `step_brute` is the same kernel with every bird a candidate, in id order:
// selection is lexicographic in (distance², id) and everything after it reads
// only the selected set, so the two give the same bytes (Prove, the acceptance
// run). Render-only randomness aside, no builtin trig touches a gate: this
// kernel is live, not gated, and its noise uses an integer hash.

struct Agent {
  // xyz position (model units, ~2 m), w = speed
  position_speed: vec4<f32>,
  // xyz unit heading, w = bank (rad)
  heading_roll: vec4<f32>,
  // x = alarm level (1 at onset, decays), y = neighbours followed, z = nearest distance, w = centrality
  behavior: vec4<f32>,
  // x = stable id, y = seed, z = step of the last alarm onset, top bit set when the
  // bird saw the falcon itself (0xffffffff: never), w = alarm timer
  identity: vec4<u32>,
}

#import bp/hash
#import murmur/params

@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read> agents_in: array<Agent>;
@group(0) @binding(2) var<storage, read_write> agents_out: array<Agent>;
@group(0) @binding(3) var<storage, read> cell_start: array<u32>;
@group(0) @binding(4) var<storage, read> order: array<u32>;
@group(0) @binding(5) var<storage, read> cand: array<vec4<f32>>;

const K: u32 = 7u;
const NONE: u32 = 0xffffffffu;
// alarm timer (identity.w): bit 18 = alarmed by the falcon itself, bits 16-17 mode, bits 0-15 steps left
const DIRECT: u32 = 0x40000u;
const READY: u32 = 0u;
const PENDING: u32 = 1u;
const REFRACTORY: u32 = 2u;
// world gravity in model units (2 m): 9.81 m/s² / 2
const G: f32 = 4.905;

var<private> best_d: array<f32, 7>;
var<private> best_id: array<u32, 7>;
var<private> avoid_d: f32;
var<private> avoid_id: u32;

fn before(da: f32, ia: u32, db: f32, ib: u32) -> bool {
  return da < db || (da == db && ia < ib);
}

fn safe_normalize(v: vec3<f32>, fallback: vec3<f32>) -> vec3<f32> {
  let l2 = dot(v, v);
  return select(fallback, v * inverseSqrt(l2), l2 > 1e-12);
}

fn reset_selection() {
  for (var k = 0u; k < K; k += 1u) {
    best_d[k] = 1e30;
    best_id[k] = NONE;
  }
  avoid_d = 1e30;
  avoid_id = NONE;
}

/// One candidate: the nearest bird to avoid (any direction), and the seven
/// nearest visible ones to follow, both lexicographic in (distance², id).
fn consider(i: u32, j: u32, q: vec3<f32>, pos: vec3<f32>, heading: vec3<f32>) {
  if (j == i) { return; }
  let delta = q - pos;
  let d2 = dot(delta, delta);
  if (d2 > p.grid_inv.y || d2 <= 1e-12) { return; }
  if (before(d2, j, avoid_d, avoid_id)) {
    avoid_d = d2;
    avoid_id = j;
  }
  if (dot(heading, delta * inverseSqrt(d2)) < p.grid_inv.w) { return; }
  if (!before(d2, j, best_d[6], best_id[6])) { return; }
  var at = 6u;
  while (at > 0u && before(d2, j, best_d[at - 1u], best_id[at - 1u])) {
    best_d[at] = best_d[at - 1u];
    best_id[at] = best_id[at - 1u];
    at -= 1u;
  }
  best_d[at] = d2;
  best_id[at] = j;
}

/// Exact k-nearest by shells of cells: after the cube of half-width r around
/// the bird's cell, every unscanned bird is at least r·cell + (distance to the
/// own cell's nearest face) away; stop when the seventh is nearer, or the
/// reach is exhausted. A bird outside the box (clamped) takes no face credit.
fn search_grid(i: u32, pos: vec3<f32>, heading: vec3<f32>) {
  let cf = (pos - p.grid_min.xyz) * p.grid_inv.x;
  let raw = vec3<i32>(floor(cf));
  let own = cell_of(pos);
  let fr = cf - floor(cf);
  let face = min(min(min(fr.x, 1.0 - fr.x), min(fr.y, 1.0 - fr.y)), min(fr.z, 1.0 - fr.z)) * p.grid_min.w;
  let inside = all(raw == own);
  let credit = select(0.0, face, inside);
  let dims = vec3<i32>(i32(p.counts.z), i32(p.counts.w), i32(p.grid.x));
  let rmax = i32(p.grid.y);
  for (var r = 0; r <= rmax; r += 1) {
    let lo = max(own - vec3<i32>(r), vec3<i32>(0));
    let hi = min(own + vec3<i32>(r), dims - vec3<i32>(1));
    for (var z = lo.z; z <= hi.z; z += 1) {
      for (var y = lo.y; y <= hi.y; y += 1) {
        for (var x = lo.x; x <= hi.x; x += 1) {
          let off = abs(vec3<i32>(x, y, z) - own);
          if (max(max(off.x, off.y), off.z) != r) { continue; }
          let cell = cell_id(vec3<i32>(x, y, z));
          let end = cell_start[cell + 1u];
          for (var k = cell_start[cell]; k < end; k += 1u) {
            let c = cand[k];
            consider(i, bitcast<u32>(c.w), c.xyz, pos, heading);
          }
        }
      }
    }
    let reach = f32(r) * p.grid_min.w + credit;
    if (reach * reach >= p.grid_inv.y) { break; }
    if (best_id[6] != NONE && best_d[6] <= reach * reach) { break; }
  }
}

fn search_brute(i: u32, pos: vec3<f32>, heading: vec3<f32>) {
  for (var j = 0u; j < p.counts.x; j += 1u) {
    consider(i, j, agents_in[j].position_speed.xyz, pos, heading);
  }
}

fn rand(i: u32, salt: u32) -> f32 {
  return bp_unit(bp_hash3(i, p.grid.z, salt)) * 2.0 - 1.0;
}

/// Everything after the search: it reads only the selected neighbours.
fn finish(i: u32) {
  let source = agents_in[i];
  let pos = source.position_speed.xyz;
  let heading = safe_normalize(source.heading_roll.xyz, vec3<f32>(0.0, 0.0, -1.0));
  let dt = p.time.x;

  var align = vec3<f32>(0.0);
  var centre = vec3<f32>(0.0);
  var side = vec3<f32>(0.0);
  var nb = 0.0;
  var alarm_nb = 0.0;
  for (var k = 0u; k < K; k += 1u) {
    let j = best_id[k];
    if (j == NONE) { continue; }
    let o = agents_in[j];
    align += o.heading_roll.xyz;
    centre += o.position_speed.xyz;
    side += safe_normalize(o.position_speed.xyz - pos, heading);
    alarm_nb = max(alarm_nb, o.behavior.x);
    nb += 1.0;
  }
  // how one-sided the neighbours are: ~0 deep inside, towards 1 at the edge
  let centrality = select(1.0, length(side) / max(nb, 1.0), nb > 0.0);

  var desired = heading;
  let sep2 = p.grid_inv.z * p.grid_inv.z;
  if (avoid_id != NONE && avoid_d < sep2) {
    let away = pos - agents_in[avoid_id].position_speed.xyz;
    desired = safe_normalize(heading * 0.35 + safe_normalize(away, heading) * p.weights.z, heading);
  } else {
    var steer = heading * 0.25;
    if (nb > 0.0) {
      steer += p.weights.x * safe_normalize(align, heading);
      steer += p.weights.y * (1.0 + p.alarm_f.w * centrality * centrality) * safe_normalize(centre / nb - pos, heading);
    }
    // the roost: turn back once past its edge (horizontally), keep to a band of heights
    let hd = length(pos.xz);
    let beyond = max(hd - p.roost.x, 0.0) / p.roost.x;
    steer += p.weights.w * min(beyond * 4.0, 2.0) * vec3<f32>(-pos.x, 0.0, -pos.z) / max(hd, 1e-3);
    steer.y += 0.12 * clamp((p.roost.y - pos.y) / 12.0, -1.0, 1.0);
    steer.y += 2.0 * clamp((p.roost.z - pos.y) / 4.0, 0.0, 1.0) - 2.0 * clamp((pos.y - p.roost.w) / 4.0, 0.0, 1.0);
    // the tools (v1's codes): 2 repel, 4 gust (a vortex); 3 startles (below)
    let code = (p.grid.w >> 8u) & 0xffu;
    let to_tool = p.tool.xyz - pos;
    let influence = 1.0 - smoothstep(0.0, p.tool.w, length(to_tool));
    if (code == 2u || code == 3u) {
      steer -= safe_normalize(to_tool, heading) * p.tool_v.w * influence;
    } else if (code == 4u) {
      let vortex = cross(safe_normalize(p.tool_v.xyz, vec3<f32>(0.0, 1.0, 0.0)), to_tool);
      steer += safe_normalize(vortex, heading) * p.tool_v.w * influence;
    }
    // a little independent wobble (integer hash, not a global RNG)
    steer += vec3<f32>(rand(i, 1u), rand(i, 2u) * 0.4, rand(i, 3u)) * p.time.z;
    desired = safe_normalize(steer, heading);
  }

  // the falcon: dodge it close up; alarmed birds flee it, diving a little
  let falcon_on = (p.grid.w & 1u) == 1u;
  let from_falcon = pos - p.falcon.xyz;
  let df = length(from_falcon);
  var alarm = max(0.0, source.behavior.x - p.alarm_f.x * dt);
  if (falcon_on && alarm > 0.02) {
    let escape = safe_normalize(safe_normalize(from_falcon, heading) + vec3<f32>(0.0, -0.2, 0.0), heading);
    desired = safe_normalize(mix(desired, escape, min(0.9, alarm * p.alarm_f.z)), desired);
  }
  if (falcon_on && df < p.falcon_v.w) {
    desired = safe_normalize(desired + safe_normalize(from_falcon, heading) * 3.0 * (1.0 - df / p.falcon_v.w), desired);
  }

  // bounded, banked turning (v1's controller, with the bank from the lateral acceleration)
  let tangent = desired - heading * dot(desired, heading);
  let tl = length(tangent);
  let max_delta = p.flight.w * dt;
  let delta = select(vec3<f32>(0.0), tangent * min(1.0, max_delta / tl), tl > 1e-8);
  let new_heading = safe_normalize(heading + delta, heading);
  let target_speed = mix(p.flight.y, p.flight.z, clamp(alarm, 0.0, 1.0));
  let speed = clamp(mix(source.position_speed.w, target_speed, min(1.0, dt * 1.5)), p.flight.x, p.flight.z);
  let omega = min(tl, max_delta) / dt;
  let turn_sign = sign(dot(cross(heading, new_heading), vec3<f32>(0.0, 1.0, 0.0)));
  let target_roll = clamp(turn_sign * atan(omega * speed / G), -1.15, 1.15);
  let roll = mix(source.heading_roll.w, target_roll, min(1.0, p.time.w * dt));
  var new_pos = pos + new_heading * speed * dt;
  new_pos.y -= (1.0 - cos(roll)) * 0.35 * dt;

  // the alarm: integer-step timers, so the wave is exact on replay
  var timer = source.identity.w;
  var onset = source.identity.z;
  let mode = (timer >> 16u) & 3u;
  let left = timer & 0xffffu;
  let direct = timer & DIRECT;
  let sees_falcon = falcon_on && df < p.falcon.w;
  let code = (p.grid.w >> 8u) & 0xffu;
  let startled = code == 3u && length(p.tool.xyz - pos) < p.tool.w;
  if (mode == READY) {
    if (sees_falcon || startled) {
      timer = DIRECT | (PENDING << 16u) | p.alarm.x;
    } else if (alarm_nb >= p.alarm_f.y) {
      timer = (PENDING << 16u) | p.alarm.y;
    }
  } else if (mode == PENDING) {
    if (left <= 1u) {
      alarm = 1.0;
      onset = (p.grid.z & 0x7fffffffu) | select(0u, 0x80000000u, direct != 0u);
      timer = (REFRACTORY << 16u) | p.alarm.z;
    } else {
      timer = direct | (PENDING << 16u) | (left - 1u);
    }
  } else {
    timer = select((REFRACTORY << 16u) | (left - 1u), READY, left <= 1u);
  }

  var result = source;
  result.position_speed = vec4<f32>(new_pos, speed);
  result.heading_roll = vec4<f32>(new_heading, roll);
  result.behavior = vec4<f32>(alarm, nb, sqrt(avoid_d), centrality);
  result.identity = vec4<u32>(source.identity.x, source.identity.y, onset, timer);
  agents_out[i] = result;
}

@compute @workgroup_size(64)
fn step(@builtin(global_invocation_id) gid: vec3<u32>) {
  let t = gid.x;
  if (t >= p.counts.x) { return; }
  // cell order: a workgroup's birds are neighbours and read the same cells
  let i = order[t];
  let source = agents_in[i];
  reset_selection();
  search_grid(i, source.position_speed.xyz, safe_normalize(source.heading_roll.xyz, vec3<f32>(0.0, 0.0, -1.0)));
  finish(i);
}

@compute @workgroup_size(64)
fn step_brute(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.counts.x) { return; }
  let source = agents_in[i];
  reset_selection();
  search_brute(i, source.position_speed.xyz, safe_normalize(source.heading_roll.xyz, vec3<f32>(0.0, 0.0, -1.0)));
  finish(i);
}
