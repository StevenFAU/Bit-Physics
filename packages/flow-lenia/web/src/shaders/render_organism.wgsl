struct RenderUniform {
  n: u32,
  mode: u32,
  channel: u32,
  flags: u32,
  width: f32,
  height: f32,
  exposure: f32,
  flow_scale: f32,
  center_row: f32,
  center_column: f32,
  zoom: f32,
  time: f32,
  inspect_row: f32,
  inspect_column: f32,
  brush_radius: f32,
  compare_enabled: f32,
}
struct TransportCell { mass: vec4<f32>, displacement_x: vec4<f32>, displacement_y: vec4<f32> }
struct FlowDiagnostic { alpha: vec4<f32>, clamp_mask: vec4<f32> }

@group(0) @binding(0) var<uniform> U: RenderUniform;
@group(0) @binding(1) var<storage, read> massA: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> affinityA: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> transportA: array<TransportCell>;
@group(0) @binding(4) var<storage, read> diagnosticA: array<FlowDiagnostic>;
@group(0) @binding(5) var<storage, read> massB: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read> affinityB: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> transportB: array<TransportCell>;
@group(0) @binding(8) var<storage, read> diagnosticB: array<FlowDiagnostic>;

struct VertexOut { @builtin(position) position: vec4<f32> }
@vertex fn vertex_main(@builtin(vertex_index) index: u32) -> VertexOut {
  var points = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var output: VertexOut;
  output.position = vec4<f32>(points[index], 0.0, 1.0);
  return output;
}

fn wrap_coordinate(value: f32) -> f32 { return value - floor(value / f32(U.n)) * f32(U.n); }
fn wrap_index(value: i32) -> u32 { return u32((value + i32(U.n)) % i32(U.n)); }
fn cell_index(row: f32, column: f32) -> u32 {
  return wrap_index(i32(floor(row))) * U.n + wrap_index(i32(floor(column)));
}
fn mass_at(cell: u32, second: bool) -> vec4<f32> { return select(massA[cell], massB[cell], second); }
fn affinity_at(cell: u32, second: bool) -> vec4<f32> { return select(affinityA[cell], affinityB[cell], second); }
fn transport_at(cell: u32, second: bool) -> TransportCell {
  if (second) { return transportB[cell]; }
  return transportA[cell];
}
fn diagnostic_at(cell: u32, second: bool) -> FlowDiagnostic {
  if (second) { return diagnosticB[cell]; }
  return diagnosticA[cell];
}
fn density_at(row: f32, column: f32, second: bool) -> f32 {
  return dot(mass_at(cell_index(row, column), second), vec4<f32>(1.0, 1.0, 1.0, 0.0));
}
fn torus_delta(value: f32, center: f32) -> f32 {
  let raw = value - center;
  return raw - round(raw / f32(U.n)) * f32(U.n);
}
fn diverging(value: f32) -> vec3<f32> {
  let t = clamp(abs(value) / 1.5, 0.0, 1.0);
  let neutral = vec3<f32>(0.045, 0.065, 0.085);
  return select(mix(neutral, vec3<f32>(0.12, 0.72, 0.94), t), mix(neutral, vec3<f32>(1.0, 0.31, 0.24), t), value >= 0.0);
}

@fragment fn fragment_main(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
  let comparison = U.compare_enabled > 0.5;
  let second = comparison && p.x >= U.width * 0.5;
  let pane_width = select(U.width, U.width * 0.5, comparison);
  let pane_x = select(p.x, p.x - select(0.0, U.width * 0.5, second), comparison);
  let screen = vec2<f32>(pane_x / pane_width - 0.5, p.y / U.height - 0.5);
  let vertical_scale = select(1.0, 0.5, comparison);
  let world = vec2<f32>(
    wrap_coordinate(U.center_row + screen.y * f32(U.n) * vertical_scale / U.zoom),
    wrap_coordinate(U.center_column + screen.x * f32(U.n) / U.zoom),
  );
  let cell = cell_index(world.x, world.y);
  let mass = mass_at(cell, second);
  let affinity = affinity_at(cell, second);
  let transport = transport_at(cell, second);
  let flow_diag = diagnostic_at(cell, second);
  let rho = mass.x + mass.y + mass.z;
  let displacement = vec2<f32>(transport.displacement_x[U.channel], transport.displacement_y[U.channel]);
  var color = vec3<f32>(0.0);
  if (U.mode == 1u) {
    color = 1.0 - exp(-U.exposure * mass.xyz);
  } else if (U.mode == 2u) {
    color = diverging(affinity[U.channel]);
  } else if (U.mode == 3u) {
    let magnitude = clamp(length(displacement) * U.flow_scale, 0.0, 1.0);
    let direction = 0.5 + 0.5 * normalize(displacement + vec2<f32>(1e-7));
    color = mix(vec3<f32>(0.02, 0.03, 0.045), vec3<f32>(direction.x, 0.28 + 0.72 * magnitude, direction.y), magnitude) + 0.10 * min(rho, 1.0);
  } else if (U.mode == 4u) {
    let alpha = flow_diag.alpha[U.channel];
    let body = 1.0 - exp(-U.exposure * rho);
    let gradient = vec2<f32>(
      density_at(world.x + 1.0, world.y, second) - density_at(world.x - 1.0, world.y, second),
      density_at(world.x, world.y + 1.0, second) - density_at(world.x, world.y - 1.0, second),
    );
    let pressure = clamp(length(gradient) * alpha * 0.32, 0.0, 1.0);
    color = body * vec3<f32>(0.08, 0.25, 0.29) + alpha * vec3<f32>(0.92, 0.34, 0.08) + pressure * vec3<f32>(0.85, 0.18, 0.08);
  } else if (U.mode == 5u) {
    let flux = clamp(dot(mass.xyz, vec3<f32>(length(vec2<f32>(transport.displacement_x.x, transport.displacement_y.x)), length(vec2<f32>(transport.displacement_x.y, transport.displacement_y.y)), length(vec2<f32>(transport.displacement_x.z, transport.displacement_y.z)))) * 1.5, 0.0, 1.0);
    let hot = max(flow_diag.clamp_mask.x, max(flow_diag.clamp_mask.y, flow_diag.clamp_mask.z));
    color = mix(vec3<f32>(0.015, 0.03, 0.055), vec3<f32>(0.20, 0.82, 0.93), flux) + hot * vec3<f32>(1.0, 0.12, 0.04);
  } else {
    let channels = mass.xyz / max(rho, 1e-6);
    let palette = mat3x3<f32>(vec3<f32>(0.19, 0.93, 0.74), vec3<f32>(0.83, 0.28, 1.0), vec3<f32>(1.0, 0.67, 0.18));
    let hue = palette * channels;
    let glow = 1.0 - exp(-U.exposure * rho);
    color = hue * glow + vec3<f32>(0.03, 0.07, 0.08) * glow * glow;
  }

  if ((U.flags & 1u) != 0u) {
    let spacing = 0.25;
    let phase = abs(fract((affinity[U.channel] + 1.5) / spacing) - 0.5) * spacing;
    let contour = 1.0 - smoothstep(0.008, 0.022, phase);
    color += contour * vec3<f32>(0.25, 0.32, 0.34);
  }
  if ((U.flags & 2u) != 0u) {
    let spacing = max(5.0, 18.0 / U.zoom);
    let glyph_center = floor(world / spacing + vec2<f32>(0.5)) * spacing;
    let glyph_transport = transport_at(cell_index(glyph_center.x, glyph_center.y), second);
    let glyph_vector = vec2<f32>(glyph_transport.displacement_x[U.channel], glyph_transport.displacement_y[U.channel]);
    let magnitude = length(glyph_vector);
    let direction = glyph_vector / max(magnitude, 1e-6);
    let relative = vec2<f32>(torus_delta(world.x, glyph_center.x), torus_delta(world.y, glyph_center.y));
    let along = dot(relative, direction);
    let across = abs(relative.x * direction.y - relative.y * direction.x);
    let length_world = min(spacing * 0.38, 1.5 + magnitude * 7.0);
    let shaft = select(0.0, 1.0, abs(along) < length_world && across < 0.42 / U.zoom && magnitude > 0.01);
    let head = select(0.0, 1.0, abs(along - length_world) + across * 0.8 < 1.4 / U.zoom && magnitude > 0.01);
    color = mix(color, vec3<f32>(0.82, 0.98, 0.92), 0.78 * max(shaft, head));
  }
  if ((U.flags & 4u) != 0u) {
    let inspect_delta = vec2<f32>(torus_delta(world.x, U.inspect_row), torus_delta(world.y, U.inspect_column));
    let inspect_distance = length(inspect_delta);
    let pixel_world = f32(U.n) / max(pane_width * U.zoom, 1.0);
    let ring = select(0.0, 1.0, abs(inspect_distance - U.brush_radius) < 1.4 * pixel_world);
    let cross = select(0.0, 1.0, inspect_distance < 2.5 * pixel_world);
    color = mix(color, vec3<f32>(0.96, 0.91, 0.56), 0.85 * max(ring, cross));
  }
  if (comparison && abs(p.x - U.width * 0.5) < 1.5) { color = vec3<f32>(0.72, 0.88, 0.83); }
  return vec4<f32>(color, 1.0);
}
