struct RenderUniform {
  n: u32,
  mode: u32,
  flags: u32,
  pane_index: u32,
  canvas_width: f32,
  canvas_height: f32,
  origin_x: f32,
  origin_y: f32,
  pane_width: f32,
  pane_height: f32,
  exposure: f32,
  flow_scale: f32,
  center_row: f32,
  center_column: f32,
  zoom: f32,
  time: f32,
  inspect_row: f32,
  inspect_column: f32,
  brush_radius: f32,
  _pad0: f32,
}
struct EcosystemTransportCell {
  mass: vec4<f32>,
  displacement_x: vec4<f32>,
  displacement_y: vec4<f32>,
  growth_0: vec4<f32>,
  growth_1: vec4<f32>,
  growth_2: vec4<f32>,
}
struct FlowDiagnostic { alpha: vec4<f32>, clamp_mask: vec4<f32> }

@group(0) @binding(0) var<uniform> U: RenderUniform;
@group(0) @binding(1) var<storage, read> massIn: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> hIn: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> qIn: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> identityIn: array<vec4<u32>>;
@group(0) @binding(5) var<storage, read> transportIn: array<EcosystemTransportCell>;
@group(0) @binding(6) var<storage, read> diagnosticIn: array<FlowDiagnostic>;

struct VertexOut { @builtin(position) position: vec4<f32> }
@vertex fn vertex_main(@builtin(vertex_index) index: u32) -> VertexOut {
  var points = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var output: VertexOut;
  output.position = vec4<f32>(points[index], 0.0, 1.0);
  return output;
}

fn wrap_index(value: i32) -> u32 { return u32((value + i32(U.n)) % i32(U.n)); }
fn cell_index(row: f32, column: f32) -> u32 { return wrap_index(i32(floor(row))) * U.n + wrap_index(i32(floor(column))); }
fn density(cell: u32) -> f32 { return massIn[cell].x + massIn[cell].y + massIn[cell].z; }
fn hash32(input: u32) -> u32 {
  var value = input;
  value = (value ^ (value >> 16u)) * 0x7feb352du;
  value = (value ^ (value >> 15u)) * 0x846ca68bu;
  return value ^ (value >> 16u);
}
fn hsv(h: f32, s: f32, v: f32) -> vec3<f32> {
  let p = abs(fract(h + vec3<f32>(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
  return v * mix(vec3<f32>(1.0), clamp(p - 1.0, vec3<f32>(0.0), vec3<f32>(1.0)), s);
}
fn lineage_color(identity: vec4<u32>) -> vec3<f32> {
  if (identity.z == 0xffffffffu) {
    let mixed = f32(hash32(identity.x ^ identity.y) & 1023u) / 1023.0;
    return mix(vec3<f32>(0.36, 0.39, 0.46), vec3<f32>(0.82, 0.77, 0.90), mixed);
  }
  var hue = fract(f32(hash32(identity.z) & 0xffffu) / 65535.0 + 0.61803398875 * f32(identity.z & 7u));
  if ((identity.w & 2u) != 0u) {
    let parent_key = identity.w >> 8u;
    let parent_hue = fract(f32(parent_key & 0xffffu) / 65535.0 + 0.61803398875 * f32((parent_key >> 16u) & 7u));
    let child_offset = (f32(hash32(identity.z) & 1023u) / 1023.0 - 0.5) * 0.05;
    hue = fract(parent_hue + child_offset);
  }
  return hsv(hue, 0.72, 1.0);
}
fn phenotype_color(cell: u32) -> vec3<f32> {
  let h0 = hIn[cell * 3u];
  let h1 = hIn[cell * 3u + 1u];
  let h2 = hIn[cell * 3u + 2u];
  let q0 = qIn[cell * 3u];
  let angle = 2.2 * h0.x - 1.7 * h1.x + 1.3 * h2.x + 0.6 * q0.x;
  let hue = fract(0.5 + angle * 0.15915494);
  let saturation = clamp(0.48 + 0.18 * abs(h0.z - h1.z) + 0.12 * abs(q0.y), 0.38, 0.88);
  return hsv(hue, saturation, 1.0);
}

@fragment fn fragment_main(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
  let screen = vec2<f32>((p.x - U.origin_x) / U.pane_width - 0.5, (p.y - U.origin_y) / U.pane_height - 0.5);
  let world = vec2<f32>(
    U.center_row + screen.y * f32(U.n) / U.zoom,
    U.center_column + screen.x * f32(U.n) / U.zoom,
  );
  let cell = cell_index(world.x, world.y);
  let rho = density(cell);
  let glow = 1.0 - exp(-U.exposure * rho);
  let identity = identityIn[cell];
  let transport = transportIn[cell];
  var color = vec3<f32>(0.0);
  if (U.mode == 1u) {
    color = phenotype_color(cell) * glow;
  } else if (U.mode == 2u) {
    let channels = massIn[cell].xyz / max(rho, 1e-7);
    color = (mat3x3<f32>(vec3<f32>(0.15, 0.92, 0.77), vec3<f32>(0.82, 0.31, 1.0), vec3<f32>(1.0, 0.67, 0.16)) * channels) * glow;
  } else if (U.mode == 3u) {
    let displacement = vec2<f32>(transport.displacement_x.x, transport.displacement_y.x);
    let magnitude = clamp(length(displacement) * U.flow_scale, 0.0, 1.0);
    let direction = 0.5 + 0.5 * normalize(displacement + vec2<f32>(1e-7));
    color = mix(vec3<f32>(0.015, 0.025, 0.045), vec3<f32>(direction.x, 0.32 + 0.68 * magnitude, direction.y), magnitude) + glow * 0.12;
  } else {
    color = lineage_color(identity) * glow;
    if ((identity.w & 1u) != 0u) {
      let hatch = 0.5 + 0.5 * sin((world.x + world.y) * 2.1);
      color *= 0.72 + 0.28 * hatch;
    }
    if ((identity.w & 2u) != 0u) {
      let pulse = 0.10 + 0.08 * sin(U.time * 5.0 + f32(identity.z & 255u));
      color += pulse * vec3<f32>(0.95, 0.88, 0.50) * glow;
    }
  }
  let gradient = vec2<f32>(density(cell_index(world.x + 1.0, world.y)) - density(cell_index(world.x - 1.0, world.y)), density(cell_index(world.x, world.y + 1.0)) - density(cell_index(world.x, world.y - 1.0)));
  let relief = clamp(0.5 + dot(normalize(vec3<f32>(-gradient * 0.7, 1.0)), normalize(vec3<f32>(-0.45, -0.32, 0.84))), 0.0, 1.0);
  color *= 0.76 + 0.34 * relief;
  let clamp_hot = max(diagnosticIn[cell].clamp_mask.x, max(diagnosticIn[cell].clamp_mask.y, diagnosticIn[cell].clamp_mask.z));
  color += clamp_hot * vec3<f32>(0.8, 0.06, 0.01);
  if ((U.flags & 1u) != 0u) {
    let raw = world - vec2<f32>(U.inspect_row, U.inspect_column);
    let delta = raw - round(raw / f32(U.n)) * f32(U.n);
    let pixel_world = f32(U.n) / max(U.pane_width * U.zoom, 1.0);
    let ring = select(0.0, 1.0, abs(length(delta) - U.brush_radius) < 1.5 * pixel_world);
    color = mix(color, vec3<f32>(0.98, 0.91, 0.56), ring * 0.9);
  }
  return vec4<f32>(color, 1.0);
}
