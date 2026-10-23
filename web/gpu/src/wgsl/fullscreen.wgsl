// bp/fullscreen — one oversized triangle covering the viewport.
// uv is (0,0) at the top-left of the target, (1,1) at the bottom-right.
struct FullscreenOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

fn fullscreen_vertex(vi: u32) -> FullscreenOut {
  let x = f32((vi << 1u) & 2u);
  let y = f32(vi & 2u);
  var o: FullscreenOut;
  o.pos = vec4<f32>(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  o.uv = vec2<f32>(x, y);
  return o;
}
