// Water in Hand — the glass: a thin refractive shell with a thick base.
// Screen-space liquid cannot see through glass drawn before it (the known
// SSFR limit), so the shell is drawn in two halves: the half beyond the
// glass's axis (as seen from the eye) with the opaque scene, where the water
// refracts it; the near half after the water, depth-tested against it.
// Transparent: Schlick Fresnel (F0 0.04) reflection of the room probe, the
// key light's highlight, a faint grey-green body; premultiplied alpha.
#import bp/view3d

struct GlassLook {
  // xyz world direction towards the key light, w = 0 far half / 1 near half
  light: vec4<f32>,
  // rgb highlight radiance, w = Blinn exponent
  spec: vec4<f32>,
  // rgb body tint (premultiplied), w = base opacity
  tint: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> G: GlassLook;
@group(0) @binding(2) var env: texture_cube<f32>;
@group(0) @binding(3) var lin: sampler;

struct VIn {
  @location(0) pos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  // 0 = wall (split by halves), 1 = always behind the water (the inner floor)
  @location(2) kind: f32,
};

struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) world: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) kind: f32,
};

@vertex
fn vs(v: VIn) -> VOut {
  var o: VOut;
  o.clip = V.view_proj * vec4<f32>(v.pos, 1.0);
  o.world = v.pos;
  o.normal = v.normal;
  o.kind = v.kind;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let eye = V.eye.xyz;
  // which half: the radial direction against the eye's azimuth
  let toward = eye.xz;
  let radial = in.world.xz;
  let far = in.kind > 0.5 || dot(radial, toward) < 0.0;
  if (far != (G.light.w < 0.5)) {
    discard;
  }
  var n = normalize(in.normal);
  let v = normalize(eye - in.world);
  if (dot(n, v) < 0.0) {
    n = -n;
  }
  let c = clamp(dot(n, v), 0.0, 1.0);
  let f = 0.04 + 0.96 * pow(1.0 - c, 5.0);
  let r = reflect(-v, n);
  let refl = textureSampleLevel(env, lin, r, 0.0).rgb;
  let hv = normalize(v + normalize(G.light.xyz));
  let hl = G.spec.rgb * f * pow(max(dot(n, hv), 0.0), G.spec.w);
  let a = clamp(f + G.tint.w, 0.0, 1.0);
  return vec4<f32>(refl * f + hl + G.tint.rgb * G.tint.w, a);
}
