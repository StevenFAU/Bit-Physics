struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

struct Params {
  counts: vec4<u32>,       // agents, cells, nx, ny
  grid: vec4<u32>,         // nz, tool, preset, frame
  grid_min: vec4<f32>,
  grid_info: vec4<f32>,    // cell size, inverse, padding
  weights: vec4<f32>,      // separation, alignment, cohesion, roost
  flight: vec4<f32>,       // min speed, max speed, max turn rad/s, dt
  zones: vec4<f32>,        // hard radius, social radius, blind cosine, noise
  tool_position: vec4<f32>,// xyz, radius
  tool_vector: vec4<f32>,  // xyz, strength
  world: vec4<f32>,        // radii xyz, preferred altitude
  time: vec4<f32>,         // simulation time, bank response, threat decay, spare
}

@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read> agents: array<Agent>;
@group(0) @binding(2) var<storage, read_write> cell_count: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> cell_start: array<u32>;
@group(0) @binding(4) var<storage, read_write> cell_cursor: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> sorted_index: array<u32>;

const WG: u32 = 256u;
var<workgroup> block_totals: array<u32, 256>;

fn cell_of(position: vec3<f32>) -> vec3<u32> {
  let c = vec3<i32>(floor((position - p.grid_min.xyz) * p.grid_info.y));
  return vec3<u32>(vec3<i32>(
    clamp(c.x, 0, i32(p.counts.z) - 1),
    clamp(c.y, 0, i32(p.counts.w) - 1),
    clamp(c.z, 0, i32(p.grid.x) - 1),
  ));
}

fn cell_id(c: vec3<u32>) -> u32 {
  return c.x + p.counts.z * (c.y + p.counts.w * c.z);
}

@compute @workgroup_size(256)
fn clear_grid(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i < p.counts.y) {
    atomicStore(&cell_count[i], 0u);
    atomicStore(&cell_cursor[i], 0u);
    cell_start[i] = 0u;
  }
}

@compute @workgroup_size(256)
fn histogram(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.counts.x) { return; }
  _ = atomicAdd(&cell_count[cell_id(cell_of(agents[i].position_speed.xyz))], 1u);
}

@compute @workgroup_size(256)
fn scan_cells(@builtin(local_invocation_id) lid3: vec3<u32>) {
  let lid = lid3.x;
  let chunk = (p.counts.y + WG - 1u) / WG;
  let begin = lid * chunk;
  let end = min(begin + chunk, p.counts.y);
  var total = 0u;
  for (var i = begin; i < end; i += 1u) {
    total += atomicLoad(&cell_count[i]);
  }
  block_totals[lid] = total;
  workgroupBarrier();

  var offset = 1u;
  while (offset < WG) {
    let index = (lid + 1u) * offset * 2u - 1u;
    if (index < WG) {
      block_totals[index] += block_totals[index - offset];
    }
    offset *= 2u;
    workgroupBarrier();
  }
  if (lid == 0u) { block_totals[WG - 1u] = 0u; }
  workgroupBarrier();

  offset = WG / 2u;
  while (offset > 0u) {
    let index = (lid + 1u) * offset * 2u - 1u;
    if (index < WG) {
      let left = block_totals[index - offset];
      block_totals[index - offset] = block_totals[index];
      block_totals[index] += left;
    }
    offset /= 2u;
    workgroupBarrier();
  }

  var prefix = block_totals[lid];
  for (var i = begin; i < end; i += 1u) {
    cell_start[i] = prefix;
    atomicStore(&cell_cursor[i], prefix);
    prefix += atomicLoad(&cell_count[i]);
  }
}

@compute @workgroup_size(256)
fn scatter(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.counts.x) { return; }
  let cell = cell_id(cell_of(agents[i].position_speed.xyz));
  let slot = atomicAdd(&cell_cursor[cell], 1u);
  sorted_index[slot] = i;
}
