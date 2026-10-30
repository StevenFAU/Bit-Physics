// Grow — prep pass: the 16-channel state → two small filterable textures.
//   look : the organism as the model paints it — premultiplied RGB and alpha,
//          clamped to [0, 1] exactly as the capture clamps them
//   tint : the 12 hidden channels projected on three principal axes (÷ each
//          axis's spread), for the iridescent tint; w = alive (alpha > 0.1)
// Display only: reads the state, never writes it.

const CN : u32 = 16u;

struct Prep {
  grid : u32,
  has_basis : u32,
  plane : u32,      // Textures (M3): RGB = channels 0..2 + 0.5, opaque; tint = channels 3..5 raw
  _p1 : u32,
  mean : array<vec4<f32>, 3>,   // 12 hidden means
  axes : array<vec4<f32>, 9>,   // 3 × 12 principal axes
  scale : vec4<f32>,            // spread on each axis
};

@group(0) @binding(0) var<uniform> P : Prep;
@group(0) @binding(1) var<storage, read> state : array<f32>;
@group(0) @binding(2) var look_out : texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var tint_out : texture_storage_2d<rgba16float, write>;

fn mean_at(k : u32) -> f32 {
  return P.mean[k / 4u][k % 4u];
}

fn axis_at(r : u32, k : u32) -> f32 {
  let i = r * 12u + k;
  return P.axes[i / 4u][i % 4u];
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= P.grid || gid.y >= P.grid) { return; }
  let base = (gid.y * P.grid + gid.x) * CN;
  if (P.plane == 1u) {
    let rgb = clamp(vec3<f32>(state[base], state[base + 1u], state[base + 2u]) + 0.5, vec3<f32>(0.0), vec3<f32>(1.0));
    textureStore(look_out, vec2<i32>(gid.xy), vec4<f32>(rgb, 1.0));
    textureStore(tint_out, vec2<i32>(gid.xy), vec4<f32>(state[base + 3u], state[base + 4u], state[base + 5u], 1.0));
    return;
  }
  let rgba = clamp(
    vec4<f32>(state[base], state[base + 1u], state[base + 2u], state[base + 3u]),
    vec4<f32>(0.0),
    vec4<f32>(1.0),
  );
  textureStore(look_out, vec2<i32>(gid.xy), rgba);
  var proj = vec3<f32>(0.0);
  if (P.has_basis == 1u) {
    for (var k : u32 = 0u; k < 12u; k = k + 1u) {
      let d = state[base + 4u + k] - mean_at(k);
      proj = proj + d * vec3<f32>(axis_at(0u, k), axis_at(1u, k), axis_at(2u, k));
    }
    proj = proj / max(P.scale.xyz, vec3<f32>(1e-6));
  }
  let alive = select(0.0, 1.0, state[base + 3u] > 0.1);
  textureStore(tint_out, vec2<i32>(gid.xy), vec4<f32>(proj, alive));
}
