// Turing Patterns — brush stamps, applied at a tick boundary.
// mode 0 seed: (U, V) → the model's seed state (Gray–Scott: 0.5, 0.25, the
//   initial condition's own seed values)
// mode 1 erase: (U, V) → the model's resting state (Gray–Scott: 1, 0)
// mode 2 chemistry: paint (F, k) into the per-cell chemistry field
// mode 3 chemistry clear: fade the painted chemistry back to the base

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
  w: u32,
  h: u32,
  periodic: u32,
  count: u32,
  seed: vec2<f32>,
  rest: vec2<f32>,
};

@group(0) @binding(0) var<uniform> B: Brush;
@group(0) @binding(1) var<storage, read> stamps: array<Stamp>;
@group(0) @binding(2) var<storage, read_write> state: array<f32>;
@group(0) @binding(3) var<storage, read_write> paint: array<vec2<u32>>;

fn delta(a: f32, b: f32, n: f32) -> f32 {
  var d = a - b;
  if (B.periodic == 1u) {
    d = d - n * round(d / n);
  }
  return d;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= B.w || gid.y >= B.h) { return; }
  let idx = gid.y * B.w + gid.x;
  let p = vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5);
  var u = state[idx * 2u];
  var v = state[idx * 2u + 1u];
  var chem = unpack2x16float(paint[idx].x);
  var wgt = unpack2x16unorm(paint[idx].y).x;
  var touched = false;
  for (var s = 0u; s < B.count; s = s + 1u) {
    let st = stamps[s];
    let d = length(vec2<f32>(delta(p.x, st.x, f32(B.w)), delta(p.y, st.y, f32(B.h))));
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
    } else if (st.mode == 2u) {
      chem = select(vec2<f32>(st.F, st.k), mix(chem, vec2<f32>(st.F, st.k), a), wgt > 0.0);
      wgt = max(wgt, a);
    } else {
      wgt = wgt * (1.0 - a);
    }
  }
  if (!touched) { return; }
  state[idx * 2u] = u;
  state[idx * 2u + 1u] = v;
  paint[idx] = vec2<u32>(pack2x16float(chem), pack2x16unorm(vec2<f32>(wgt, 0.0)));
}
