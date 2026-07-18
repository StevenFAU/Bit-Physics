struct EventUniform { n: u32, n2: u32, count: u32, _pad: u32 }
struct EnvironmentEvent {
  centerRadius: vec4<f32>,
  mode: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<uniform> U: EventUniform;
@group(0) @binding(1) var<storage, read> events: array<EnvironmentEvent>;
@group(0) @binding(2) var<storage, read_write> environment: array<vec4<f32>>;

fn torus_distance(a: f32, b: f32) -> f32 {
  let direct = abs(a - b);
  return min(direct, f32(U.n) - direct);
}

@compute @workgroup_size(128)
fn apply_environment_events(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n2) { return; }
  let row = f32(g.x / U.n);
  let column = f32(g.x % U.n);
  var field = environment[g.x];
  for (var eventIndex = 0u; eventIndex < U.count; eventIndex += 1u) {
    let event = events[eventIndex];
    let dr = torus_distance(row, event.centerRadius.x);
    let dc = torus_distance(column, event.centerRadius.y);
    let radius = max(event.centerRadius.z, 1.0);
    let distance = sqrt(dr * dr + dc * dc);
    if (distance <= radius) {
      let falloff = 0.5 + 0.5 * cos(3.141592653589793 * distance / radius);
      let amount = event.centerRadius.w * falloff;
      if (event.mode == 0u) {
        field.x = clamp(field.x + amount, -4.0, 4.0);
      } else if (event.mode == 1u) {
        field.y = clamp(field.y - abs(amount), -4.0, 0.0);
        field.w = clamp(field.w + abs(amount), 0.0, 4.0);
      } else {
        let removal = clamp(abs(amount), 0.0, 1.0);
        field.x *= 1.0 - removal;
        field.y *= 1.0 - removal;
        field.w *= 1.0 - removal;
      }
    }
  }
  environment[g.x] = field;
}
