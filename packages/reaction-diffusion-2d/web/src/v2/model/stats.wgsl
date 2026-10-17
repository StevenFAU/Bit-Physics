// Turing Patterns — a half-resolution copy of V for the pattern statistics
// (spot count, coverage, mass), read back a couple of times a second.

struct Stats {
  w: u32,
  h: u32,
  ow: u32,
  oh: u32,
};

@group(0) @binding(0) var<uniform> S: Stats;
@group(0) @binding(1) var<storage, read> state: array<f32>;
@group(0) @binding(2) var<storage, read_write> out_v: array<f32>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= S.ow || gid.y >= S.oh) { return; }
  var acc = 0.0;
  for (var dy = 0u; dy < 2u; dy = dy + 1u) {
    for (var dx = 0u; dx < 2u; dx = dx + 1u) {
      let x = min(gid.x * 2u + dx, S.w - 1u);
      let y = min(gid.y * 2u + dy, S.h - 1u);
      acc = acc + state[(y * S.w + x) * 2u + 1u];
    }
  }
  out_v[gid.y * S.ow + gid.x] = acc * 0.25;
}
