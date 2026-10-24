// Edits on the live state, applied at a step boundary (between two steps of
// the committed kernel; never inside one). Cut zeroes every channel of the
// cells within `radius` of a stroke — the cells die, exactly like the alive
// mask kills them. Seed plants single seed cells: colour 0, alpha and the 12
// hidden channels 1 — the canonical seed pattern. The gated kernel itself is
// not touched.

const CN : u32 = 16u;
const MAX_SEGS : u32 = 24u;

struct Brush {
  grid : u32,
  count : u32,
  mode : u32,      // 0 cut, 1 seed
  radius : f32,    // cells (cut)
  // x0, y0, x1, y1 in cells (cell centres at +0.5); a seed uses (x0, y0)
  segs : array<vec4<f32>, 24>,
};

@group(0) @binding(0) var<uniform> B : Brush;
@group(0) @binding(1) var<storage, read_write> state : array<f32>;

fn seg_dist(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>) -> f32 {
  let ab = b - a;
  let l2 = dot(ab, ab);
  var t = 0.0;
  if (l2 > 1e-8) {
    t = clamp(dot(p - a, ab) / l2, 0.0, 1.0);
  }
  return length(p - (a + ab * t));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= B.grid || gid.y >= B.grid) { return; }
  let p = vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5);
  var hit = false;
  for (var i : u32 = 0u; i < min(B.count, MAX_SEGS); i = i + 1u) {
    let s = B.segs[i];
    if (B.mode == 1u) {
      hit = hit || (floor(s.x) == f32(gid.x) && floor(s.y) == f32(gid.y));
    } else {
      hit = hit || seg_dist(p, s.xy, s.zw) <= B.radius;
    }
  }
  if (!hit) { return; }
  let base = (gid.y * B.grid + gid.x) * CN;
  for (var c : u32 = 0u; c < CN; c = c + 1u) {
    state[base + c] = select(0.0, 1.0, B.mode == 1u && c >= 3u);
  }
}
