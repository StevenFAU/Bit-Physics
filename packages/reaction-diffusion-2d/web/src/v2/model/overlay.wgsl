// Turing Patterns — the chemistry overlay texture for FieldView2D: painted
// chemistry shows as a subtle tint (its regime's hue, alpha = paint weight).

struct Overlay {
  w: u32,
  h: u32,
  _p0: u32,
  _p1: u32,
  // F/k window used to colour the painted chemistry
  f_lo: f32,
  f_hi: f32,
  k_lo: f32,
  k_hi: f32,
};

@group(0) @binding(0) var<uniform> O: Overlay;
@group(0) @binding(1) var<storage, read> paint: array<vec2<u32>>;
@group(0) @binding(2) var out_tex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= O.w || gid.y >= O.h) { return; }
  let p = paint[gid.y * O.w + gid.x];
  let fk = unpack2x16float(p.x);
  let wgt = unpack2x16unorm(p.y).x;
  let tf = clamp((fk.x - O.f_lo) / (O.f_hi - O.f_lo), 0.0, 1.0);
  let tk = clamp((fk.y - O.k_lo) / (O.k_hi - O.k_lo), 0.0, 1.0);
  // feed → warm, kill → cool: a two-axis tint that stays readable without red/green
  let tint = mix(vec3<f32>(0.35, 0.55, 1.0), vec3<f32>(1.0, 0.62, 0.3), tf) * (0.8 + 0.4 * tk);
  textureStore(out_tex, vec2<i32>(gid.xy), vec4<f32>(tint, wgt));
}
