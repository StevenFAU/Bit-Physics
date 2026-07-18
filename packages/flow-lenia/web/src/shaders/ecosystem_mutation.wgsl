struct MutationUniform { n: u32, count: u32, _pad0: u32, _pad1: u32 }

@group(0) @binding(0) var<uniform> U: MutationUniform;
@group(0) @binding(1) var<storage, read> records: array<vec4<u32>>;
@group(0) @binding(2) var<storage, read_write> genomeH: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> genomeQ: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> identity: array<vec4<u32>>;
@group(0) @binding(5) var<storage, read> massIn: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> affectedMass: array<atomic<u32>>;

fn torus_distance(a: u32, b: u32) -> f32 {
  let raw = abs(i32(a) - i32(b));
  return f32(min(raw, i32(U.n) - raw));
}
fn hash32(input: u32) -> u32 {
  var value = input;
  value = (value ^ (value >> 16u)) * 0x7feb352du;
  value = (value ^ (value >> 15u)) * 0x846ca68bu;
  return value ^ (value >> 16u);
}

@compute @workgroup_size(128)
fn apply_mutation_patches(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n * U.n) { return; }
  let row = g.x / U.n;
  let column = g.x % U.n;
  for (var event = 0u; event < U.count; event += 1u) {
    let base = event * 8u;
    let header = records[base];
    let child = records[base + 1u];
    let dr = torus_distance(row, header.x);
    let dc = torus_distance(column, header.y);
    let radius = bitcast<f32>(header.z);
    if (dr * dr + dc * dc <= radius * radius && identity[g.x].z == header.w) {
      for (var bank = 0u; bank < 3u; bank += 1u) {
        let gene = g.x * 3u + bank;
        genomeH[gene] = clamp(genomeH[gene] + bitcast<vec4<f32>>(records[base + 2u + bank]), vec4<f32>(-2.0), vec4<f32>(2.0));
        genomeQ[gene] = clamp(genomeQ[gene] + bitcast<vec4<f32>>(records[base + 5u + bank]), vec4<f32>(-2.0), vec4<f32>(2.0));
      }
      let parent_hue_key = (hash32(header.w) & 0xffffu) | ((header.w & 7u) << 16u);
      identity[g.x] = vec4<u32>(child.y, child.z, child.x, identity[g.x].w | 2u | (parent_hue_key << 8u));
      let density = massIn[g.x].x + massIn[g.x].y + massIn[g.x].z;
      atomicAdd(&affectedMass[child.w], u32(round(max(density, 0.0) * 65536.0)));
    }
  }
}
