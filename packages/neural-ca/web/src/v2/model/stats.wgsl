// Live instruments (display only, never gated): how many cells are alive
// (alpha > 0.1, the kernel's own threshold), the alpha mass, and the
// alpha-weighted centre of the organism. One workgroup reduces the dish.

const CN : u32 = 16u;

struct StatsParams {
  grid : u32,
  _p0 : u32,
  _p1 : u32,
  _p2 : u32,
};

@group(0) @binding(0) var<uniform> P : StatsParams;
@group(0) @binding(1) var<storage, read> state : array<f32>;
@group(0) @binding(2) var<storage, read_write> out_stats : array<f32>;

var<workgroup> w_alive : array<f32, 256>;
var<workgroup> w_mass : array<f32, 256>;
var<workgroup> w_mx : array<f32, 256>;
var<workgroup> w_my : array<f32, 256>;

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li : u32) {
  let n = P.grid * P.grid;
  var alive = 0.0;
  var mass = 0.0;
  var mx = 0.0;
  var my = 0.0;
  for (var i : u32 = li; i < n; i = i + 256u) {
    let a = state[i * CN + 3u];
    if (a > 0.1) { alive = alive + 1.0; }
    let m = clamp(a, 0.0, 1.0);
    mass = mass + m;
    mx = mx + m * (f32(i % P.grid) + 0.5);
    my = my + m * (f32(i / P.grid) + 0.5);
  }
  w_alive[li] = alive;
  w_mass[li] = mass;
  w_mx[li] = mx;
  w_my[li] = my;
  workgroupBarrier();
  for (var s : u32 = 128u; s > 0u; s = s >> 1u) {
    if (li < s) {
      w_alive[li] = w_alive[li] + w_alive[li + s];
      w_mass[li] = w_mass[li] + w_mass[li + s];
      w_mx[li] = w_mx[li] + w_mx[li + s];
      w_my[li] = w_my[li] + w_my[li + s];
    }
    workgroupBarrier();
  }
  if (li == 0u) {
    out_stats[0] = w_alive[0];
    out_stats[1] = w_mass[0];
    out_stats[2] = w_mx[0];
    out_stats[3] = w_my[0];
  }
}
