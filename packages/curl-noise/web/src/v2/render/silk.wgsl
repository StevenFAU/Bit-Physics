// Flow Sculpture — Silk: every tracer's recent path as a thin ribbon of
// light, lit like a silk thread (06-curl-noise.md, "The look").
//
// The history ring is the live kernel's (model/live.wgsl): slot-major,
// ring[slot * strands + strand], slot `head` newest, w = the strand's epoch
// (integer part, +1 at every respawn) plus its life fraction. One instance
// is one segment, drawn as a 4-vertex strip of constant pixel width (the F3
// Ribbons expansion, web/render/src/wgsl/ribbons.wgsl). Differences from F3
// Ribbons, which is why Silk has its own pass: a segment across a respawn
// (two epochs) is not drawn; a strand fades in and out over its life; width
// follows the flow's speed (a tube of incompressible flow narrows where it
// speeds up); a Kajiya–Kay sheen lights the thread by its tangent; the
// cloud's edge (where particles enter and leave the flow's ball) fades out;
// and a strand's colour is the f₂ surface its particle is confined to.
#import bp/view3d

struct Silk {
  // x = strands, y = slots, z = head slot, w = valid slots
  dims: vec4<u32>,
  // x = width px, y = age fade exponent, z = energy per segment, w = sheen strength
  look: vec4<f32>,
  // x = reference step length (model units), y = width exponent, z = min width factor, w = max
  speed: vec4<f32>,
  // xyz = key light direction (view space, towards the light), w = ambient
  light: vec4<f32>,
  // x = depth fade start, y = end (view units), z = brightness at the end, w = sheen exponent
  fade: vec4<f32>,
  // xyz = the flow's ball centre (model units), w = its radius: the cloud's edge fades out
  ball: vec4<f32>,
  // palette position = clamp(f₂ · x + y, 0, 1)
  hue: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> S: Silk;
@group(0) @binding(2) var<storage, read> ring: array<vec4<f32>>;
@group(0) @binding(3) var palette: texture_2d<f32>;
@group(0) @binding(4) var palette_s: sampler;
// each tracer's iso anchors (f₁, f₂): the pair of surfaces it is confined to
@group(0) @binding(5) var<storage, read> anchors: array<vec2<f32>>;

struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) across: f32,
  @location(1) color: vec3<f32>,
};

fn ring_at(strand: u32, age: u32) -> vec4<f32> {
  let slots = S.dims.y;
  let slot = (S.dims.z + slots - (age % slots)) % slots;
  return ring[slot * S.dims.x + strand];
}

/**
 * A strand's colour: which f₂ surface its particle rides on. Particles on one
 * surface share a colour, so the surfaces the flow is confined to show as
 * sheets of colour.
 */
fn strand_hue(i: u32) -> f32 {
  return clamp(anchors[i].y * S.hue.x + S.hue.y, 0.0, 1.0);
}

fn off_screen() -> VOut {
  var o: VOut;
  o.clip = vec4<f32>(2.0, 2.0, 2.0, 1.0);
  o.across = 0.0;
  o.color = vec3<f32>(0.0);
  return o;
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let segs = S.dims.y - 1u;
  let strand = ii / segs;
  let seg = ii % segs; // 0 = newest segment
  if (seg + 1u >= S.dims.w) {
    return off_screen();
  }
  let a = ring_at(strand, seg);
  let b = ring_at(strand, seg + 1u);
  // a respawn between the two points: the strand restarted, no segment
  if (floor(a.w) != floor(b.w)) {
    return off_screen();
  }
  let step_len = length(a.xyz - b.xyz);
  if (step_len < 1e-7) {
    return off_screen();
  }
  let ca = V.mvp * vec4<f32>(a.xyz, 1.0);
  let cb = V.mvp * vec4<f32>(b.xyz, 1.0);
  if (ca.w <= V.proj.z || cb.w <= V.proj.z) {
    return off_screen();
  }
  let sa = view3d_to_px(ca, V.viewport);
  let sb = view3d_to_px(cb, V.viewport);
  let d = sb - sa;
  let len = length(d);
  let ax = select(vec2<f32>(1.0, 0.0), d / len, len > 1e-4);
  let ay = vec2<f32>(-ax.y, ax.x);
  // width by speed: a step's length is the flow's speed × Δt
  let wf = clamp(pow(step_len / S.speed.x, S.speed.y), S.speed.z, S.speed.w);
  let hw = S.look.x * 0.5 * wf;
  // a 4-vertex strip: (a−, a+, b−, b+); the ends overlap a little to close joints
  let end_b = vi >= 2u;
  let side = select(-1.0, 1.0, (vi & 1u) == 1u);
  let base = select(sa - ax * hw * 0.3, sb + ax * hw * 0.3, end_b);
  let c = select(ca, cb, end_b);
  var o: VOut;
  o.clip = view3d_from_px(base + ay * side * hw, c.z, c.w, V.viewport);
  o.across = side;

  // fades: along the strand (age), over the particle's life, with depth
  let age = (f32(seg) + select(0.0, 1.0, end_b)) / f32(max(S.dims.w - 1u, 1u));
  let fa = pow(max(1.0 - age, 0.0), S.look.y);
  let life = fract(select(a.w, b.w, end_b));
  let env = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.78, 0.999, life));
  let fd = mix(1.0, S.fade.z, clamp((c.w - S.fade.x) / max(S.fade.y - S.fade.x, 1e-4), 0.0, 1.0));
  let rb = length(select(a.xyz, b.xyz, end_b) - S.ball.xyz) / S.ball.w;
  let edge = 1.0 - smoothstep(0.8, 1.0, rb);

  // Kajiya–Kay: a thread is lit by its tangent, not a normal
  let tv = (V.mv * vec4<f32>(a.xyz - b.xyz, 0.0)).xyz;
  let t = tv / max(length(tv), 1e-12);
  let pv = (V.mv * vec4<f32>(select(a.xyz, b.xyz, end_b), 1.0)).xyz;
  let vdir = -pv / max(length(pv), 1e-12);
  let l = normalize(S.light.xyz);
  let hv = normalize(l + vdir);
  let tl = dot(t, l);
  let th = dot(t, hv);
  let diffuse = sqrt(max(1.0 - tl * tl, 0.0));
  let spec = pow(sqrt(max(1.0 - th * th, 0.0)), S.fade.w);
  let shade = S.light.w + (1.0 - S.light.w) * diffuse + S.look.w * spec;

  let col = textureSampleLevel(palette, palette_s, vec2<f32>(strand_hue(strand), 0.5), 0.0).rgb;
  // a thinner ribbon carries the same light per unit length
  o.color = col * (S.look.z / wf) * fa * env * fd * edge * shade;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let x = 1.0 - in.across * in.across;
  let e = x * x;
  return vec4<f32>(in.color * e, e);
}
