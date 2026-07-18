// Flow Lenia M0 — faithful dd=5 destination gather for a finite square cell.
// No float atomics or source scatter. Candidate order is lexicographically fixed.

struct GatherUniform {
  n: u32,
  channels: u32,
  dd: u32,
  _pad0: u32,
  sigma: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

struct TransportCell {
  mass: vec4<f32>,
  displacement_x: vec4<f32>,
  displacement_y: vec4<f32>,
}

struct GenomeCell {
  a: vec4<f32>,
  b: vec4<f32>,
  c: vec4<f32>,
}

@group(0) @binding(0) var<uniform> U: GatherUniform;
@group(0) @binding(1) var<storage, read> transportIn: array<TransportCell>;
@group(0) @binding(2) var<storage, read_write> massOut: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> hIn: array<GenomeCell>;
@group(0) @binding(4) var<storage, read_write> hOut: array<GenomeCell>;
@group(0) @binding(5) var<storage, read> qIn: array<GenomeCell>;
@group(0) @binding(6) var<storage, read_write> qOut: array<GenomeCell>;
@group(0) @binding(7) var<storage, read> identityIn: array<vec4<u32>>;
@group(0) @binding(8) var<storage, read_write> identityOut: array<vec4<u32>>;

fn wrap_offset(x: u32, offset: i32) -> u32 {
  return u32((i32(x) + offset + i32(U.n)) % i32(U.n));
}

fn periodic_delta(destination: u32, source: u32, displacement: f32) -> f32 {
  let raw = f32(destination) - (f32(source) + displacement);
  return raw - round(raw / f32(U.n)) * f32(U.n);
}

fn overlap_1d(delta: f32) -> f32 {
  return clamp(U.sigma + 0.5 - abs(delta), 0.0, min(1.0, 2.0 * U.sigma));
}

fn overlap_weight(
  destination_x: u32,
  destination_y: u32,
  source_x: u32,
  source_y: u32,
  displacement_x: f32,
  displacement_y: f32,
) -> f32 {
  let dx = periodic_delta(destination_x, source_x, displacement_x);
  let dy = periodic_delta(destination_y, source_y, displacement_y);
  return overlap_1d(dx) * overlap_1d(dy) / (4.0 * U.sigma * U.sigma);
}

fn candidate_mass(destination_x: u32, destination_y: u32) -> vec4<f32> {
  var result = vec4<f32>(0.0);
  for (var oy = -5; oy <= 5; oy += 1) {
    let sy = wrap_offset(destination_y, oy);
    for (var ox = -5; ox <= 5; ox += 1) {
      let sx = wrap_offset(destination_x, ox);
      let source_index = sy * U.n + sx;
      let source = transportIn[source_index];
      for (var channel = 0u; channel < 3u; channel += 1u) {
        let weight = overlap_weight(
          destination_x,
          destination_y,
          sx,
          sy,
          source.displacement_x[channel],
          source.displacement_y[channel],
        );
        result[channel] += source.mass[channel] * weight;
      }
    }
  }
  return result;
}

@compute @workgroup_size(8, 8)
fn gather_mass(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  massOut[g.y * U.n + g.x] = candidate_mass(g.x, g.y);
}

@compute @workgroup_size(8, 8)
fn gather_full(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  let destination_index = g.y * U.n + g.x;
  var result = vec4<f32>(0.0);
  var ha = vec4<f32>(0.0);
  var hb = vec4<f32>(0.0);
  var hc = vec4<f32>(0.0);
  var qa = vec4<f32>(0.0);
  var qb = vec4<f32>(0.0);
  var qc = vec4<f32>(0.0);
  var genome_weight = 0.0;
  var best_weight = -1.0;
  var chosen_identity = vec4<u32>(0u);

  for (var oy = -5; oy <= 5; oy += 1) {
    let sy = wrap_offset(g.y, oy);
    for (var ox = -5; ox <= 5; ox += 1) {
      let sx = wrap_offset(g.x, ox);
      let source_index = sy * U.n + sx;
      let source = transportIn[source_index];
      var contribution = 0.0;
      for (var channel = 0u; channel < 3u; channel += 1u) {
        let weight = overlap_weight(
          g.x,
          g.y,
          sx,
          sy,
          source.displacement_x[channel],
          source.displacement_y[channel],
        );
        let incoming = source.mass[channel] * weight;
        result[channel] += incoming;
        contribution += incoming;
      }
      if (contribution > 0.0) {
        let h = hIn[source_index];
        let q = qIn[source_index];
        ha += contribution * h.a;
        hb += contribution * h.b;
        hc += contribution * h.c;
        qa += contribution * q.a;
        qb += contribution * q.b;
        qc += contribution * q.c;
        genome_weight += contribution;
        if (contribution > best_weight) {
          best_weight = contribution;
          chosen_identity = identityIn[source_index];
        }
      }
    }
  }

  let inv_weight = select(0.0, 1.0 / genome_weight, genome_weight > 0.0);
  massOut[destination_index] = result;
  hOut[destination_index] = GenomeCell(ha * inv_weight, hb * inv_weight, hc * inv_weight);
  qOut[destination_index] = GenomeCell(qa * inv_weight, qb * inv_weight, qc * inv_weight);
  identityOut[destination_index] = chosen_identity;
}
