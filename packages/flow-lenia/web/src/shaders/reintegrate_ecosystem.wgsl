// Five pipelines are compiled from this module by specializing MIXING_RULE:
// 0 average, 1 whole-genome, 2 gene-wise, 3 best-affinity, 4 negotiation.
override MIXING_RULE: u32 = 1u;

struct GatherUniform {
  n: u32,
  channels: u32,
  dd: u32,
  step: u32,
  sigma: f32,
  negotiation_beta: f32,
  seed: u32,
  _pad0: u32,
}
struct EcosystemTransportCell {
  mass: vec4<f32>,
  displacement_x: vec4<f32>,
  displacement_y: vec4<f32>,
  growth_0: vec4<f32>,
  growth_1: vec4<f32>,
  growth_2: vec4<f32>,
}
struct U64 { lo: u32, hi: u32 }

@group(0) @binding(0) var<uniform> U: GatherUniform;
@group(0) @binding(1) var<storage, read> transportIn: array<EcosystemTransportCell>;
@group(0) @binding(2) var<storage, read_write> massOut: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> hIn: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> hOut: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> qIn: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> qOut: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> identityIn: array<vec4<u32>>;
@group(0) @binding(8) var<storage, read_write> identityOut: array<vec4<u32>>;

fn wrap_offset(x: u32, offset: i32) -> u32 { return u32((i32(x) + offset + i32(U.n)) % i32(U.n)); }
fn periodic_delta(destination: u32, source: u32, displacement: f32) -> f32 {
  let raw = f32(destination) - (f32(source) + displacement);
  return raw - round(raw / f32(U.n)) * f32(U.n);
}
fn overlap_1d(delta: f32) -> f32 {
  return clamp(U.sigma + 0.5 - abs(delta), 0.0, min(1.0, 2.0 * U.sigma));
}
fn overlap_weight(di: u32, dj: u32, si: u32, sj: u32, displacement: vec2<f32>) -> f32 {
  let delta_i = periodic_delta(di, si, displacement.x);
  let delta_j = periodic_delta(dj, sj, displacement.y);
  return overlap_1d(delta_i) * overlap_1d(delta_j) / (4.0 * U.sigma * U.sigma);
}

fn mul_hi_u32(a: u32, b: u32) -> u32 {
  let a0 = a & 0xffffu;
  let a1 = a >> 16u;
  let b0 = b & 0xffffu;
  let b1 = b >> 16u;
  let w0 = a0 * b0;
  let t = a1 * b0 + (w0 >> 16u);
  var w1 = t & 0xffffu;
  let w2 = t >> 16u;
  w1 += a0 * b1;
  return a1 * b1 + w2 + (w1 >> 16u);
}
fn add64(a: U64, b: U64) -> U64 {
  let lo = a.lo + b.lo;
  return U64(lo, a.hi + b.hi + select(0u, 1u, lo < a.lo));
}
fn xor64(a: U64, b: U64) -> U64 { return U64(a.lo ^ b.lo, a.hi ^ b.hi); }
fn shr64(a: U64, shift: u32) -> U64 {
  return U64((a.lo >> shift) | (a.hi << (32u - shift)), a.hi >> shift);
}
fn mul64(a: U64, b: U64) -> U64 {
  return U64(a.lo * b.lo, mul_hi_u32(a.lo, b.lo) + a.lo * b.hi + a.hi * b.lo);
}
fn splitmix64(input: U64) -> U64 {
  var value = add64(input, U64(0x7f4a7c15u, 0x9e3779b9u));
  value = mul64(xor64(value, shr64(value, 30u)), U64(0x1ce4e5b9u, 0xbf58476du));
  value = mul64(xor64(value, shr64(value, 27u)), U64(0x133111ebu, 0x94d049bbu));
  return xor64(value, shr64(value, 31u));
}
fn counter_hash(destination: u32, candidate: u32, gene: u32, negative_gene: bool) -> U64 {
  var value = U64(U.seed, 0u);
  value = splitmix64(xor64(value, U64(U.step, 0u)));
  value = splitmix64(xor64(value, U64(destination, 0u)));
  value = splitmix64(xor64(value, U64(candidate, 0u)));
  var gene_value = U64(gene, 0u);
  if (negative_gene) { gene_value = U64(0xffffffffu, 0xffffffffu); }
  value = splitmix64(xor64(value, gene_value));
  return value;
}
fn unit_float(value: U64) -> f32 {
  return clamp((f32(value.hi) + 0.5) * 2.3283064365386963e-10, 1e-7, 0.9999999);
}
fn genome_hash(h: array<f32, 9>, q: array<f32, 9>) -> vec2<u32> {
  var first = 0x811c9dc5u;
  var second = 0x9e3779b9u;
  for (var gene = 0u; gene < 9u; gene += 1u) {
    first = (first ^ bitcast<u32>(h[gene])) * 0x01000193u;
    second = (second ^ bitcast<u32>(q[gene]) ^ gene) * 0x85ebca6bu;
  }
  return vec2<u32>(first, second);
}
fn same_genome(first: u32, candidate: u32) -> bool {
  if (any(identityIn[first] != identityIn[candidate])) { return false; }
  for (var bank = 0u; bank < 3u; bank += 1u) {
    if (any(hIn[first * 3u + bank] != hIn[candidate * 3u + bank])) { return false; }
    if (any(qIn[first * 3u + bank] != qIn[candidate * 3u + bank])) { return false; }
  }
  return true;
}
fn growth_gene(context: EcosystemTransportCell, kernel: u32) -> f32 {
  if (kernel < 4u) { return context.growth_0[kernel]; }
  if (kernel < 8u) { return context.growth_1[kernel - 4u]; }
  return context.growth_2[kernel - 8u];
}
fn source_gene(buffer: ptr<storage, array<vec4<f32>>, read>, source: u32, gene: u32) -> f32 {
  return (*buffer)[source * 3u + gene / 4u][gene % 4u];
}

@compute @workgroup_size(8, 8)
fn gather_ecosystem(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  let destination = g.x * U.n + g.y;
  let context = transportIn[destination];
  var result = vec4<f32>(0.0);
  var total = 0.0;
  var first_source = 0u;
  var selected_source = 0u;
  var has_source = false;
  var all_same = true;
  var best_score = -1.0e30;
  var negotiation_score = -1.0e30;
  var average_h: array<f32, 9>;
  var average_q: array<f32, 9>;
  var gene_sources: array<u32, 18>;
  var gene_has_source: array<bool, 18>;
  for (var gene = 0u; gene < 9u; gene += 1u) {
    average_h[gene] = 0.0;
    average_q[gene] = 0.0;
  }
  for (var gene = 0u; gene < 18u; gene += 1u) { gene_has_source[gene] = false; }

  var candidate = 0u;
  for (var oi = -5; oi <= 5; oi += 1) {
    let si = wrap_offset(g.x, oi);
    for (var oj = -5; oj <= 5; oj += 1) {
      let sj = wrap_offset(g.y, oj);
      let source_index = si * U.n + sj;
      let source = transportIn[source_index];
      var arrivals = vec4<f32>(0.0);
      for (var channel = 0u; channel < 3u; channel += 1u) {
        let weight = overlap_weight(g.x, g.y, si, sj, vec2<f32>(source.displacement_x[channel], source.displacement_y[channel]));
        arrivals[channel] = source.mass[channel] * weight;
      }
      result += arrivals;
      let incoming = arrivals.x + arrivals.y + arrivals.z;
      if (incoming > 0.0) {
        total += incoming;
        if (!has_source) {
          first_source = source_index;
          selected_source = source_index;
          has_source = true;
        } else if (all_same && !same_genome(first_source, source_index)) {
          all_same = false;
        }
        var affinity_score = 0.0;
        var negotiation_affinity = 0.0;
        for (var gene = 0u; gene < 9u; gene += 1u) {
          let h = source_gene(&hIn, source_index, gene);
          let q = source_gene(&qIn, source_index, gene);
          average_h[gene] += incoming * h;
          average_q[gene] += incoming * q;
          affinity_score += growth_gene(context, gene) * h;
          negotiation_affinity += growth_gene(context, gene) * q;
        }
        let reservoir_u = unit_float(counter_hash(destination, candidate, 0xffffffffu, true));
        if (reservoir_u < incoming / total) { selected_source = source_index; }
        for (var gene = 0u; gene < 18u; gene += 1u) {
          let gene_u = unit_float(counter_hash(destination, candidate, gene, false));
          if (!gene_has_source[gene] || gene_u < incoming / total) {
            gene_sources[gene] = source_index;
            gene_has_source[gene] = true;
          }
        }
        if (affinity_score > best_score) {
          best_score = affinity_score;
          if (MIXING_RULE == 3u) { selected_source = source_index; }
        }
        let gumbel_u = unit_float(counter_hash(destination, candidate, 18u, false));
        let score = U.negotiation_beta * incoming * negotiation_affinity - log(-log(gumbel_u));
        if (score > negotiation_score) {
          negotiation_score = score;
          if (MIXING_RULE == 4u) { selected_source = source_index; }
        }
      }
      candidate += 1u;
    }
  }
  massOut[destination] = result;
  if (!has_source || total <= 0.0) {
    for (var bank = 0u; bank < 3u; bank += 1u) {
      hOut[destination * 3u + bank] = vec4<f32>(0.0);
      qOut[destination * 3u + bank] = vec4<f32>(0.0);
    }
    identityOut[destination] = vec4<u32>(0u);
    return;
  }
  if (all_same) {
    selected_source = first_source;
    for (var bank = 0u; bank < 3u; bank += 1u) {
      hOut[destination * 3u + bank] = hIn[selected_source * 3u + bank];
      qOut[destination * 3u + bank] = qIn[selected_source * 3u + bank];
    }
    identityOut[destination] = identityIn[selected_source];
    return;
  }
  if (MIXING_RULE == 0u) {
    var mixed_h: array<f32, 9>;
    var mixed_q: array<f32, 9>;
    for (var gene = 0u; gene < 9u; gene += 1u) {
      mixed_h[gene] = average_h[gene] / total;
      mixed_q[gene] = average_q[gene] / total;
    }
    hOut[destination * 3u] = vec4<f32>(mixed_h[0], mixed_h[1], mixed_h[2], mixed_h[3]);
    hOut[destination * 3u + 1u] = vec4<f32>(mixed_h[4], mixed_h[5], mixed_h[6], mixed_h[7]);
    hOut[destination * 3u + 2u] = vec4<f32>(mixed_h[8], 0.0, 0.0, 0.0);
    qOut[destination * 3u] = vec4<f32>(mixed_q[0], mixed_q[1], mixed_q[2], mixed_q[3]);
    qOut[destination * 3u + 1u] = vec4<f32>(mixed_q[4], mixed_q[5], mixed_q[6], mixed_q[7]);
    qOut[destination * 3u + 2u] = vec4<f32>(mixed_q[8], 0.0, 0.0, 0.0);
    let fingerprint = genome_hash(mixed_h, mixed_q);
    identityOut[destination] = vec4<u32>(fingerprint, 0xffffffffu, 1u);
  } else if (MIXING_RULE == 2u) {
    var mixed_h: array<f32, 9>;
    var mixed_q: array<f32, 9>;
    var parent_h: array<f32, 9>;
    var parent_q: array<f32, 9>;
    for (var gene = 0u; gene < 9u; gene += 1u) {
      let h_parent = gene_sources[gene];
      let q_parent = gene_sources[gene + 9u];
      mixed_h[gene] = source_gene(&hIn, h_parent, gene);
      mixed_q[gene] = source_gene(&qIn, q_parent, gene);
      parent_h[gene] = bitcast<f32>(identityIn[h_parent].x ^ identityIn[h_parent].y);
      parent_q[gene] = bitcast<f32>(identityIn[q_parent].x ^ identityIn[q_parent].y);
    }
    hOut[destination * 3u] = vec4<f32>(mixed_h[0], mixed_h[1], mixed_h[2], mixed_h[3]);
    hOut[destination * 3u + 1u] = vec4<f32>(mixed_h[4], mixed_h[5], mixed_h[6], mixed_h[7]);
    hOut[destination * 3u + 2u] = vec4<f32>(mixed_h[8], 0.0, 0.0, 0.0);
    qOut[destination * 3u] = vec4<f32>(mixed_q[0], mixed_q[1], mixed_q[2], mixed_q[3]);
    qOut[destination * 3u + 1u] = vec4<f32>(mixed_q[4], mixed_q[5], mixed_q[6], mixed_q[7]);
    qOut[destination * 3u + 2u] = vec4<f32>(mixed_q[8], 0.0, 0.0, 0.0);
    let fingerprint = genome_hash(parent_h, parent_q);
    identityOut[destination] = vec4<u32>(fingerprint, 0xffffffffu, 1u);
  } else {
    for (var bank = 0u; bank < 3u; bank += 1u) {
      hOut[destination * 3u + bank] = hIn[selected_source * 3u + bank];
      qOut[destination * 3u + bank] = qIn[selected_source * 3u + bank];
    }
    identityOut[destination] = identityIn[selected_source];
  }
}
