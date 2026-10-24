// Slime Mould live solver (scenes): the environment the agents sense on top
// of the trail, rebuilt only when a scene's food, light or walls change.
//   * food scent: each crumb's long-range pull, s·exp(−r/λ) (flat inside the
//     crumb), a stand-in for the chemoattractant real food gives off — the
//     trail's own reach is only ~√(D/α) ≈ 2 cells, so without it a colony
//     never finds food it cannot already touch;
//   * light: a strong repellent under a soft disc;
//   * walls: cells marked WALL (solid when flag bit 3 is set).
// Distances are the shortest way round the periodic dish.
#import physarum/live-common

struct Src {
  pos: vec2<f32>,    // cells
  radius: f32,       // crumb / light radius, cells
  kind: u32,         // 0 food scent, 1 light
  strength: f32,     // trail units (food: at the crumb; light: depth of the repellent)
  range: f32,        // food: scent length λ, cells; light: soft edge, cells
  _p0: f32,
  _p1: f32,
};

struct EnvInfo {
  count: u32,
  _p0: u32,
  _p1: u32,
  _p2: u32,
};

@group(1) @binding(0) var<uniform> I: EnvInfo;
@group(1) @binding(1) var<storage, read> srcs: array<Src>;
@group(1) @binding(2) var<storage, read> walls: array<u32>;   // bitmask, one bit per cell (the wall plane)
@group(1) @binding(3) var<storage, read_write> env_out: array<f32>;

@compute @workgroup_size(16, 16)
fn build_env(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.w || gid.y >= P.h) { return; }
  let idx = gid.y * P.w + gid.x;
  if ((walls[idx >> 5u] & (1u << (idx & 31u))) != 0u) {
    env_out[idx] = WALL;
    return;
  }
  let dims = vec2<f32>(f32(P.w), f32(P.h));
  let q = vec2<f32>(f32(gid.x), f32(gid.y));
  var e = 0.0;
  for (var k = 0u; k < I.count; k = k + 1u) {
    let s = srcs[k];
    var d = q - s.pos;
    d = d - round(d / dims) * dims;
    let r = length(d);
    if (s.kind == 0u) {
      e = e + s.strength * exp(-max(r - s.radius, 0.0) / s.range);
    } else {
      e = e - s.strength * (1.0 - smoothstep(s.radius - s.range, s.radius, r));
    }
  }
  env_out[idx] = e;
}
