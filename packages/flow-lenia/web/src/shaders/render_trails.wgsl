struct TrailUniform { persistence: f32, _pad0: f32, _pad1: f32, _pad2: f32 }
@group(0) @binding(0) var<uniform> U: TrailUniform;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var currentFrame: texture_2d<f32>;
@group(0) @binding(3) var historyFrame: texture_2d<f32>;

struct VertexOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }
@vertex fn vertex_main(@builtin(vertex_index) index: u32) -> VertexOut {
  var points = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var output: VertexOut;
  output.position = vec4<f32>(points[index], 0.0, 1.0);
  output.uv = 0.5 * (points[index] + vec2<f32>(1.0));
  output.uv.y = 1.0 - output.uv.y;
  return output;
}

@fragment fn accumulate(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let current = textureSample(currentFrame, linearSampler, uv).rgb;
  let history = textureSample(historyFrame, linearSampler, uv).rgb * U.persistence;
  return vec4<f32>(max(current, history), 1.0);
}

@fragment fn display(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(textureSample(currentFrame, linearSampler, uv).rgb, 1.0);
}
