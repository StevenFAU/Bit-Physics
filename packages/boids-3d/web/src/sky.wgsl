struct SkyUniforms {
  inverse_view_projection: mat4x4<f32>,
  camera_position: vec4<f32>,
  sun_direction: vec4<f32>,
  viewport: vec4<f32>,
}
@group(0) @binding(0) var<uniform> u: SkyUniforms;

struct SkyOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32>, }

@vertex
fn sky_vertex(@builtin(vertex_index) i: u32) -> SkyOut {
  var points = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0),
  );
  var out: SkyOut;
  out.position = vec4<f32>(points[i], 1.0, 1.0);
  out.uv = points[i] * 0.5 + 0.5;
  return out;
}

@fragment
fn sky_fragment(input: SkyOut) -> @location(0) vec4<f32> {
  let horizon = pow(clamp(1.0 - abs(input.uv.y - 0.38) * 1.9, 0.0, 1.0), 4.0);
  let vertical = smoothstep(0.0, 1.0, input.uv.y);
  let night = mix(vec3<f32>(0.06, 0.025, 0.045), vec3<f32>(0.006, 0.012, 0.038), vertical);
  let amber = vec3<f32>(0.52, 0.14, 0.045) * horizon * 0.55;
  let vignette = 1.0 - 0.28 * dot(input.uv - 0.5, input.uv - 0.5);
  return vec4<f32>((night + amber) * vignette, 1.0);
}
