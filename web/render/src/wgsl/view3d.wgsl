// bp/view3d — the per-frame 3D view uniform (web/render/src/view3d.ts).
struct View3D {
  view_proj: mat4x4<f32>,
  inv_view_proj: mat4x4<f32>,
  model: mat4x4<f32>,
  mvp: mat4x4<f32>,
  mv: mat4x4<f32>,
  // xyz world eye, w = time (s)
  eye: vec4<f32>,
  // xyz eye in model coordinates, w = model scale
  eye_model: vec4<f32>,
  // (w px, h px, 1/w, 1/h)
  viewport: vec4<f32>,
  // (P[0][0], P[1][1], near, far)
  proj: vec4<f32>,
};

/// Clip position to target pixels (y down).
fn view3d_to_px(clip: vec4<f32>, viewport: vec4<f32>) -> vec2<f32> {
  let ndc = clip.xy / clip.w;
  return vec2<f32>((ndc.x * 0.5 + 0.5) * viewport.x, (0.5 - ndc.y * 0.5) * viewport.y);
}

/// Target pixels (y down) and clip z, w back to a clip position.
fn view3d_from_px(px: vec2<f32>, z: f32, w: f32, viewport: vec4<f32>) -> vec4<f32> {
  let ndc = vec2<f32>(px.x * viewport.z * 2.0 - 1.0, 1.0 - px.y * viewport.w * 2.0);
  return vec4<f32>(ndc * w, z, w);
}

/// Frustum plane i (left, right, bottom, top, near, far) of a clip matrix,
/// normalised; inside where dot(plane.xyz, p) + plane.w >= 0. WebGPU depth [0, 1].
fn view3d_plane(m: mat4x4<f32>, i: u32) -> vec4<f32> {
  let r0 = vec4<f32>(m[0].x, m[1].x, m[2].x, m[3].x);
  let r1 = vec4<f32>(m[0].y, m[1].y, m[2].y, m[3].y);
  let r2 = vec4<f32>(m[0].z, m[1].z, m[2].z, m[3].z);
  let r3 = vec4<f32>(m[0].w, m[1].w, m[2].w, m[3].w);
  var p: vec4<f32>;
  switch i {
    case 0u: { p = r3 + r0; }
    case 1u: { p = r3 - r0; }
    case 2u: { p = r3 + r1; }
    case 3u: { p = r3 - r1; }
    case 4u: { p = r2; }
    default: { p = r3 - r2; }
  }
  return p / max(length(p.xyz), 1e-20);
}
