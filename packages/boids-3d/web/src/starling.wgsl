struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

struct Params {
  counts: vec4<u32>,
  grid: vec4<u32>,
  grid_min: vec4<f32>,
  grid_info: vec4<f32>,
  weights: vec4<f32>,
  flight: vec4<f32>,
  zones: vec4<f32>,
  tool_position: vec4<f32>,
  tool_vector: vec4<f32>,
  world: vec4<f32>,
  time: vec4<f32>,
}

@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read> input_agents: array<Agent>;
@group(0) @binding(2) var<storage, read_write> output_agents: array<Agent>;
@group(0) @binding(3) var<storage, read_write> cell_count: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> cell_start: array<u32>;
@group(0) @binding(5) var<storage, read> sorted_index: array<u32>;

const K: u32 = 7u;

fn safe_normalize(v: vec3<f32>, fallback: vec3<f32>) -> vec3<f32> {
  let l2 = dot(v, v);
  return select(fallback, v * inverseSqrt(l2), l2 > 1e-12);
}

fn hash01(x0: u32) -> f32 {
  var x = x0;
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return f32(x) * (1.0 / 4294967296.0);
}

fn cell_of(position: vec3<f32>) -> vec3<i32> {
  let c = vec3<i32>(floor((position - p.grid_min.xyz) * p.grid_info.y));
  return vec3<i32>(
    clamp(c.x, 0, i32(p.counts.z) - 1),
    clamp(c.y, 0, i32(p.counts.w) - 1),
    clamp(c.z, 0, i32(p.grid.x) - 1),
  );
}

fn cell_id(c: vec3<i32>) -> u32 {
  return u32(c.x) + p.counts.z * (u32(c.y) + p.counts.w * u32(c.z));
}

fn pair_before(distance_a: f32, id_a: u32, distance_b: f32, id_b: u32) -> bool {
  return distance_a < distance_b || (distance_a == distance_b && id_a < id_b);
}

@compute @workgroup_size(128)
fn step(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.counts.x) { return; }
  let source = input_agents[i];
  let position = source.position_speed.xyz;
  let heading = safe_normalize(source.heading_roll.xyz, vec3<f32>(0.0, 0.0, 1.0));
  let social2 = p.zones.y * p.zones.y;
  let hard2 = p.zones.x * p.zones.x;
  let own_cell = cell_of(position);

  var best_distance = array<f32, 7>(
    1e30, 1e30, 1e30, 1e30, 1e30, 1e30, 1e30,
  );
  var best_id = array<u32, 7>(
    0xffffffffu, 0xffffffffu, 0xffffffffu, 0xffffffffu,
    0xffffffffu, 0xffffffffu, 0xffffffffu,
  );
  var avoid_distance = 1e30;
  var avoid_id = 0xffffffffu;
  var alerted_neighbor = 0.0;

  for (var dz = -1; dz <= 1; dz += 1) {
    for (var dy = -1; dy <= 1; dy += 1) {
      for (var dx = -1; dx <= 1; dx += 1) {
        let c = own_cell + vec3<i32>(dx, dy, dz);
        if (c.x < 0 || c.y < 0 || c.z < 0 ||
            c.x >= i32(p.counts.z) || c.y >= i32(p.counts.w) || c.z >= i32(p.grid.x)) {
          continue;
        }
        let cell = cell_id(c);
        let begin = cell_start[cell];
        let count = atomicLoad(&cell_count[cell]);
        for (var slot = 0u; slot < count; slot += 1u) {
          let j = sorted_index[begin + slot];
          if (j == i) { continue; }
          let other = input_agents[j];
          let delta = other.position_speed.xyz - position;
          let distance2 = dot(delta, delta);
          if (distance2 > social2 || distance2 <= 1e-12) { continue; }
          if (pair_before(distance2, j, avoid_distance, avoid_id)) {
            avoid_distance = distance2;
            avoid_id = j;
          }
          let direction = delta * inverseSqrt(distance2);
          let visible = dot(heading, direction) >= p.zones.z;
          if (!visible) { continue; }
          alerted_neighbor = max(alerted_neighbor, other.behavior.x);
          if (!pair_before(distance2, j, best_distance[6], best_id[6])) { continue; }
          var insert = 6u;
          while (insert > 0u && pair_before(distance2, j, best_distance[insert - 1u], best_id[insert - 1u])) {
            best_distance[insert] = best_distance[insert - 1u];
            best_id[insert] = best_id[insert - 1u];
            insert -= 1u;
          }
          best_distance[insert] = distance2;
          best_id[insert] = j;
        }
      }
    }
  }

  var alignment = vec3<f32>(0.0);
  var center = vec3<f32>(0.0);
  var neighbors = 0.0;
  for (var k = 0u; k < K; k += 1u) {
    if (best_id[k] == 0xffffffffu) { continue; }
    alignment += input_agents[best_id[k]].heading_roll.xyz;
    center += input_agents[best_id[k]].position_speed.xyz;
    neighbors += 1.0;
  }

  var desired = heading;
  if (avoid_id != 0xffffffffu && avoid_distance < hard2) {
    let away = position - input_agents[avoid_id].position_speed.xyz;
    desired = safe_normalize(heading * 0.2 + safe_normalize(away, heading) * p.weights.x, heading);
  } else {
    var steering = heading * 0.15;
    if (neighbors > 0.0) {
      steering += p.weights.y * safe_normalize(alignment / neighbors, heading);
      steering += p.weights.z * safe_normalize(center / neighbors - position, heading);
    }
    let radii = max(p.world.xyz, vec3<f32>(1.0));
    let normalized_position = position / radii;
    let edge = dot(normalized_position, normalized_position);
    let altitude = vec3<f32>(0.0, (p.world.w - position.y) / radii.y, 0.0);
    steering += p.weights.w * (-normalized_position * smoothstep(0.2, 1.2, edge) + altitude * 0.35);

    let to_tool = p.tool_position.xyz - position;
    let tool_distance = length(to_tool);
    let influence = 1.0 - smoothstep(0.0, p.tool_position.w, tool_distance);
    if (p.grid.y == 1u) {
      steering += safe_normalize(to_tool, heading) * p.tool_vector.w * influence;
    } else if (p.grid.y == 2u || p.grid.y == 3u) {
      steering -= safe_normalize(to_tool, heading) * p.tool_vector.w * influence;
    } else if (p.grid.y == 4u) {
      let vortex = cross(safe_normalize(p.tool_vector.xyz, vec3<f32>(0.0, 1.0, 0.0)), to_tool);
      steering += safe_normalize(vortex, heading) * p.tool_vector.w * influence;
    }

    if (p.grid.z == 6u) {
      let obstacle = vec3<f32>(0.0, -2.0, 0.0);
      let away = position - obstacle;
      let d = length(away);
      steering += safe_normalize(away, heading) * (1.0 - smoothstep(5.0, 13.0, d)) * 3.0;
    }
    desired = safe_normalize(steering, heading);
  }

  var alert = max(0.0, source.behavior.x - p.time.z * p.flight.w);
  let to_threat = position - p.tool_position.xyz;
  if (p.grid.y == 3u && length(to_threat) < p.tool_position.w) { alert = 1.0; }
  alert = max(alert, max(0.0, alerted_neighbor - 0.10));
  if (alert > 0.01) {
    let escape = safe_normalize(to_threat, desired);
    desired = safe_normalize(mix(desired, escape, min(0.85, alert)), desired);
  }

  if (p.zones.w > 0.0) {
    let phase = hash01(source.identity.x ^ (p.grid.w * 0x9e3779b9u)) * 6.2831853;
    let right_noise = safe_normalize(cross(heading, vec3<f32>(0.0, 1.0, 0.0)), vec3<f32>(1.0, 0.0, 0.0));
    desired = safe_normalize(desired + right_noise * sin(phase) * p.zones.w, desired);
  }

  let tangent = desired - heading * dot(desired, heading);
  let tangent_length = length(tangent);
  let max_delta = p.flight.z * p.flight.w;
  let delta = select(vec3<f32>(0.0), tangent * min(1.0, max_delta / tangent_length), tangent_length > 1e-8);
  let new_heading = safe_normalize(heading + delta, heading);
  let target_speed = mix(p.flight.x, p.flight.y, clamp(0.35 + alert * 0.65, 0.0, 1.0));
  let speed = mix(source.position_speed.w, target_speed, min(1.0, p.flight.w * 1.6));
  let turn_sign = dot(cross(heading, new_heading), vec3<f32>(0.0, 1.0, 0.0));
  let target_roll = clamp(turn_sign * 5.0, -1.05, 1.05);
  let roll = mix(source.heading_roll.w, target_roll, min(1.0, p.time.y * p.flight.w));
  var new_position = position + new_heading * speed * p.flight.w;
  new_position.y -= (1.0 - cos(roll)) * 0.35 * p.flight.w;

  var result = source;
  result.position_speed = vec4<f32>(new_position, speed);
  result.heading_roll = vec4<f32>(new_heading, roll);
  result.behavior = vec4<f32>(alert, neighbors, sqrt(avoid_distance), source.behavior.w);
  output_agents[i] = result;
}
