// Ribbons (F3) GPU feed: copy `rows` rows of `count` vec4 points from a
// source buffer into the ring's next slots, adding each row's origin.
struct PushParams {
  // x = strands (ring row width), y = slots, z = first slot to write, w = rows
  dims: vec4<u32>,
  // x = count per row, y = source offset (vec4s), z = source row stride (vec4s), w = first strand
  src: vec4<u32>,
};

@group(0) @binding(0) var<uniform> U: PushParams;
@group(0) @binding(1) var<storage, read> src: array<vec4<f32>>;
// xyz origin per row (w unused)
@group(0) @binding(2) var<storage, read> origins: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> ring: array<vec4<f32>>;

@compute @workgroup_size(64)
fn push(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  let row = id.y;
  if (i >= U.src.x || row >= U.dims.w) {
    return;
  }
  let p = src[U.src.y + row * U.src.z + i];
  let slot = (U.dims.z + row) % U.dims.y;
  ring[slot * U.dims.x + U.src.w + i] = vec4<f32>(p.xyz + origins[row].xyz, p.w);
}
