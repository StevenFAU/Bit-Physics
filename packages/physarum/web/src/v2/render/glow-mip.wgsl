// Slime Mould render prep: one 2×2 box-filter mip level of the field texture.

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(16, 16)
fn downsample(@builtin(global_invocation_id) gid: vec3<u32>) {
  let d = textureDimensions(dst);
  if (gid.x >= d.x || gid.y >= d.y) { return; }
  let s = vec2<i32>(textureDimensions(src));
  let p = vec2<i32>(gid.xy) * 2;
  let q = min(p + vec2<i32>(1), s - vec2<i32>(1));
  let v = textureLoad(src, p, 0) + textureLoad(src, vec2<i32>(q.x, p.y), 0)
    + textureLoad(src, vec2<i32>(p.x, q.y), 0) + textureLoad(src, q, 0);
  textureStore(dst, vec2<i32>(gid.xy), v * 0.25);
}
