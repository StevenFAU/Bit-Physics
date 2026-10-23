// FieldView2D prep: a scalar state buffer → an rgba16float field texture
// (primary, secondary, d primary/dx, d primary/dy) at grid resolution, so the
// fragment pass can use hardware-filtered bicubic taps and get a smooth
// relief normal for free. Read-only on the simulation state.

struct Prep {
  w: u32,
  h: u32,
  stride: u32,    // floats per cell
  primary: u32,   // channel offsets within a cell
  secondary: u32,
  periodic: u32,
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> P: Prep;
@group(0) @binding(1) var<storage, read> state: array<f32>;
@group(0) @binding(2) var out_tex: texture_storage_2d<rgba16float, write>;

// Offsets here are only −1, 0, +1: wrap with a compare, not %, which is
// several times slower on GPUs.
fn edge(i: i32, n: i32) -> i32 {
  if (P.periodic == 1u) {
    return select(select(i, i - n, i >= n), i + n, i < 0);
  }
  return clamp(i, 0, n - 1);
}

fn at(i: i32, j: i32, ch: u32) -> f32 {
  let x = edge(i, i32(P.w));
  let y = edge(j, i32(P.h));
  return state[(u32(y) * P.w + u32(x)) * P.stride + ch];
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.w || gid.y >= P.h) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let a = at(i, j, P.primary);
  let b = at(i, j, P.secondary);
  let gx = 0.5 * (at(i + 1, j, P.primary) - at(i - 1, j, P.primary));
  let gy = 0.5 * (at(i, j + 1, P.primary) - at(i, j - 1, P.primary));
  textureStore(out_tex, vec2<i32>(i, j), vec4<f32>(a, b, gx, gy));
}
