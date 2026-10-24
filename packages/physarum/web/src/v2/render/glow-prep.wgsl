// Slime Mould render prep: the trail buffer (row-major f32) → a filterable
// rgba16float field texture, then a box-filtered mip chain for zoomed-out
// views (the dish can hold more cells than the screen has pixels).
//   r = trail / mean trail at equilibrium (d·ρ·(1−α)/α — exact, so the look
//       does not depend on the deposit, the decay or the density)
//   g = agents that deposited in the cell on the last step
//   b = 1 in a wall cell (scenes with walls), else 0

struct Prep {
  w: u32,
  h: u32,
  walls: u32,        // 1: read the wall mark from env
  _p1: u32,
  inv_mean: f32,     // 1 / mean trail
  inv_agent: f32,    // 1 / (deposit · 65536): u32 deposit → agent count
  _p2: f32,
  _p3: f32,
};

@group(0) @binding(0) var<uniform> R: Prep;
@group(0) @binding(1) var<storage, read> trail: array<f32>;
@group(0) @binding(2) var<storage, read> dep: array<u32>;
@group(0) @binding(3) var field: texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var<storage, read> env: array<f32>;

@compute @workgroup_size(16, 16)
fn prep(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= R.w || gid.y >= R.h) { return; }
  let i = gid.y * R.w + gid.x;
  let t = trail[i] * R.inv_mean;
  let a = f32(dep[i]) * R.inv_agent;
  var wall = 0.0;
  if (R.walls != 0u && env[i] <= -1.0e30) { wall = 1.0; }
  textureStore(field, vec2<i32>(gid.xy), vec4<f32>(t, a, wall, 1.0));
}
