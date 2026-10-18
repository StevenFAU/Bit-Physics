// Turing Patterns — brush stamps on a surface, applied at a tick boundary.
// A stamp's centre is a cell (its index in `x`); every cell within `r` model
// units of that cell's centre (straight-line distance, scaled from the
// unit-scale shape) is pulled towards the model's seed (mode 0) or resting
// (mode 1) state, with the same soft edge as the flat brush.

struct Stamp {
  x: f32,
  y: f32,
  r: f32,
  strength: f32,
  mode: u32,
  F: f32,
  k: f32,
  _pad: f32,
};

struct Brush {
  cells: u32,
  count: u32,
  scale: f32,
  _p0: u32,
  seed: vec2<f32>,
  rest: vec2<f32>,
};

@group(0) @binding(0) var<uniform> B: Brush;
@group(0) @binding(1) var<storage, read> stamps: array<Stamp>;
@group(0) @binding(2) var<storage, read_write> state: array<f32>;
@group(0) @binding(3) var<storage, read> pos: array<vec4<f32>>;

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= B.cells) { return; }
  let p = pos[c].xyz * B.scale;
  var u = state[c * 2u];
  var v = state[c * 2u + 1u];
  var touched = false;
  for (var s = 0u; s < B.count; s = s + 1u) {
    let st = stamps[s];
    let d = distance(p, pos[u32(st.x)].xyz * B.scale);
    if (d > st.r + 1.0) { continue; }
    let a = st.strength * (1.0 - smoothstep(st.r - 1.0, st.r + 1.0, d));
    if (a <= 0.0) { continue; }
    touched = true;
    if (st.mode == 0u) {
      u = mix(u, B.seed.x, a);
      v = mix(v, B.seed.y, a);
    } else if (st.mode == 1u) {
      u = mix(u, B.rest.x, a);
      v = mix(v, B.rest.y, a);
    }
  }
  if (!touched) { return; }
  state[c * 2u] = u;
  state[c * 2u + 1u] = v;
}
