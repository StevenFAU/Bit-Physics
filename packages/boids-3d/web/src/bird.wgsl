struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

struct RenderUniforms {
  view_projection: mat4x4<f32>,
  camera_position: vec4<f32>,
  sun_direction: vec4<f32>,
  render: vec4<f32>, // time, scale, color mode, exposure
}

@group(0) @binding(0) var<uniform> u: RenderUniforms;
@group(0) @binding(1) var<storage, read> agents: array<Agent>;

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) world_position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) alert: f32,
}

fn hash01(x0: u32) -> f32 {
  var x = x0;
  x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u;
  return f32(x) * (1.0 / 4294967296.0);
}

fn local_vertex(vertex: u32, flap: f32) -> vec3<f32> {
  var vertices = array<vec3<f32>, 24>(
    // upper and lower body wedges
    vec3<f32>(0.0, 0.08, 0.9), vec3<f32>(-0.16, 0.05, -0.45), vec3<f32>(0.16, 0.05, -0.45),
    vec3<f32>(0.0, -0.08, 0.9), vec3<f32>(0.16, -0.05, -0.45), vec3<f32>(-0.16, -0.05, -0.45),
    // left wing
    vec3<f32>(-0.05, 0.03, 0.25), vec3<f32>(-1.15, 0.0, -0.1), vec3<f32>(-0.12, 0.02, -0.42),
    vec3<f32>(-0.05, -0.01, 0.22), vec3<f32>(-0.12, -0.02, -0.42), vec3<f32>(-1.15, 0.0, -0.1),
    // right wing
    vec3<f32>(0.05, 0.03, 0.25), vec3<f32>(0.12, 0.02, -0.42), vec3<f32>(1.15, 0.0, -0.1),
    vec3<f32>(0.05, -0.01, 0.22), vec3<f32>(1.15, 0.0, -0.1), vec3<f32>(0.12, -0.02, -0.42),
    // split tail
    vec3<f32>(0.0, 0.0, -0.3), vec3<f32>(-0.34, 0.0, -0.82), vec3<f32>(0.0, 0.0, -0.62),
    vec3<f32>(0.0, 0.0, -0.3), vec3<f32>(0.0, 0.0, -0.62), vec3<f32>(0.34, 0.0, -0.82),
  );
  var v = vertices[vertex];
  if (vertex >= 6u && vertex < 12u) { v.y += (-v.x) * flap; }
  if (vertex >= 12u && vertex < 18u) { v.y += v.x * flap; }
  return v;
}

fn basis_transform(local: vec3<f32>, forward: vec3<f32>, roll: f32) -> vec3<f32> {
  var right = cross(vec3<f32>(0.0, 1.0, 0.0), forward);
  if (dot(right, right) < 1e-6) { right = vec3<f32>(1.0, 0.0, 0.0); }
  right = normalize(right);
  var up = normalize(cross(forward, right));
  let cr = cos(roll); let sr = sin(roll);
  let rolled_right = right * cr + up * sr;
  up = up * cr - right * sr;
  return rolled_right * local.x + up * local.y + forward * local.z;
}

@vertex
fn bird_vertex(@builtin(vertex_index) vertex_index: u32) -> VertexOut {
  let agent_id = vertex_index / 24u;
  let vertex = vertex_index % 24u;
  let a = agents[agent_id];
  let phase = hash01(a.identity.x) * 6.2831853;
  let flap = sin(u.render.x * (5.0 + a.position_speed.w * 1.4) + phase) * (0.24 + a.behavior.x * 0.22);
  let l0 = local_vertex((vertex / 3u) * 3u, flap);
  let l1 = local_vertex((vertex / 3u) * 3u + 1u, flap);
  let l2 = local_vertex((vertex / 3u) * 3u + 2u, flap);
  let local = local_vertex(vertex, flap) * u.render.y;
  let forward = normalize(a.heading_roll.xyz);
  let offset = basis_transform(local, forward, a.heading_roll.w);
  let world = a.position_speed.xyz + offset;
  let normal_local = normalize(cross(l1 - l0, l2 - l0));
  let normal = normalize(basis_transform(normal_local, forward, a.heading_roll.w));
  let mode = u32(u.render.z + 0.5);
  var color = vec3<f32>(0.055, 0.075, 0.105);
  if (mode == 1u) {
    color = 0.5 + 0.5 * forward;
  } else if (mode == 2u) {
    let t = clamp(a.position_speed.w / 8.0, 0.0, 1.0);
    color = mix(vec3<f32>(0.08, 0.35, 0.55), vec3<f32>(1.0, 0.42, 0.12), t);
  } else if (mode == 3u) {
    color = mix(vec3<f32>(0.07, 0.15, 0.3), vec3<f32>(1.0, 0.18, 0.05), a.behavior.x);
  }
  var out: VertexOut;
  out.position = u.view_projection * vec4<f32>(world, 1.0);
  out.world_position = world;
  out.normal = normal;
  out.color = color;
  out.alert = a.behavior.x;
  return out;
}

@fragment
fn bird_fragment(input: VertexOut) -> @location(0) vec4<f32> {
  let n = normalize(input.normal);
  let sun = normalize(-u.sun_direction.xyz);
  let view = normalize(u.camera_position.xyz - input.world_position);
  let diffuse = 0.22 + 0.78 * max(dot(n, sun), 0.0);
  let rim = pow(1.0 - abs(dot(n, view)), 2.5);
  let distance = length(u.camera_position.xyz - input.world_position);
  let fog = 1.0 - exp(-distance * 0.012);
  let lit = input.color * diffuse + vec3<f32>(0.12, 0.28, 0.38) * rim + vec3<f32>(0.7, 0.12, 0.04) * input.alert * 0.12;
  let sky = vec3<f32>(0.018, 0.028, 0.065);
  return vec4<f32>(mix(lit, sky, fog * 0.45) * u.render.w, 1.0);
}
