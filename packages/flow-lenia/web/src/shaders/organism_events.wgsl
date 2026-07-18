struct EventUniform {
  n: u32,
  count: u32,
  max_displacement: f32,
  ledger_scale: f32,
}
struct EventRecord {
  kind: u32,
  channel: u32,
  _pad0: vec2<u32>,
  brush: vec4<f32>,
  direction: vec4<f32>,
}
struct TransportCell {
  mass: vec4<f32>,
  displacement_x: vec4<f32>,
  displacement_y: vec4<f32>,
}

@group(0) @binding(0) var<uniform> U: EventUniform;
@group(0) @binding(1) var<storage, read> events: array<EventRecord>;
@group(0) @binding(2) var<storage, read_write> massState: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> eventLedger: array<atomic<u32>>;

@group(1) @binding(0) var<uniform> UI: EventUniform;
@group(1) @binding(1) var<storage, read> impulseEvents: array<EventRecord>;
@group(1) @binding(2) var<storage, read_write> transportState: array<TransportCell>;

fn torus_delta(value: f32, center: f32, n: f32) -> f32 {
  let raw = value - center;
  return raw - round(raw / n) * n;
}

fn brush_weight(delta: vec2<f32>, radius: f32) -> f32 {
  let q = dot(delta, delta) / max(radius * radius, 1.0);
  let compact = max(0.0, 1.0 - q);
  return compact * compact;
}

@compute @workgroup_size(128)
fn apply_open_events(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = U.n * U.n;
  if (g.x >= n2) { return; }
  let position = vec2<f32>(f32(g.x / U.n) + 0.5, f32(g.x % U.n) + 0.5);
  var mass = massState[g.x];
  for (var event_index = 0u; event_index < U.count; event_index += 1u) {
    let event = events[event_index];
    if (event.kind != 1u && event.kind != 2u) { continue; }
    let delta = vec2<f32>(
      torus_delta(position.x, event.brush.x, f32(U.n)),
      torus_delta(position.y, event.brush.y, f32(U.n)),
    );
    let weight = brush_weight(delta, event.brush.z);
    if (weight <= 0.0) { continue; }
    for (var channel = 0u; channel < 3u; channel += 1u) {
      if (event.channel < 3u && event.channel != channel) { continue; }
      let before = mass[channel];
      if (event.kind == 1u) {
        let mixture = select(1.0, array<f32, 3>(0.45, 0.32, 0.23)[channel], event.channel == 3u);
        mass[channel] = before + event.brush.w * weight * mixture;
        let credited = u32(round(max(0.0, mass[channel] - before) * U.ledger_scale));
        atomicAdd(&eventLedger[0], credited);
      } else {
        mass[channel] = before * (1.0 - clamp(event.brush.w * weight, 0.0, 0.95));
        let debited = u32(round(max(0.0, before - mass[channel]) * U.ledger_scale));
        atomicAdd(&eventLedger[1], debited);
      }
    }
  }
  massState[g.x] = mass;
}

@compute @workgroup_size(128)
fn apply_closed_impulses(@builtin(global_invocation_id) g: vec3<u32>) {
  let n2 = UI.n * UI.n;
  if (g.x >= n2) { return; }
  let position = vec2<f32>(f32(g.x / UI.n) + 0.5, f32(g.x % UI.n) + 0.5);
  var transport = transportState[g.x];
  for (var event_index = 0u; event_index < UI.count; event_index += 1u) {
    let event = impulseEvents[event_index];
    if (event.kind != 3u && event.kind != 4u) { continue; }
    let delta = vec2<f32>(
      torus_delta(position.x, event.brush.x, f32(UI.n)),
      torus_delta(position.y, event.brush.y, f32(UI.n)),
    );
    let distance = length(delta);
    let weight = brush_weight(delta, event.brush.z);
    if (weight <= 0.0 || distance < 0.25) { continue; }
    let radial = delta / distance;
    let polarity = select(-1.0, 1.0, event.direction.z >= 0.0);
    var direction = -radial * polarity;
    if (event.kind == 4u) {
      let drag = event.direction.xy;
      direction = select(vec2<f32>(-radial.y, radial.x), normalize(drag), length(drag) > 0.01) * polarity;
    }
    let impulse = event.brush.w * weight * direction;
    for (var channel = 0u; channel < 3u; channel += 1u) {
      if (event.channel < 3u && event.channel != channel) { continue; }
      transport.displacement_x[channel] = clamp(
        transport.displacement_x[channel] + impulse.x,
        -UI.max_displacement,
        UI.max_displacement,
      );
      transport.displacement_y[channel] = clamp(
        transport.displacement_y[channel] + impulse.y,
        -UI.max_displacement,
        UI.max_displacement,
      );
    }
  }
  transportState[g.x] = transport;
}
