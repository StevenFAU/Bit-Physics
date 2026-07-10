// Screen-space fluid rendering (pure aesthetics — never gated; spec § 3.5).
// Pipeline: half-res sphere-impostor depth -> narrow-range filter
// (Truong & Yuksel 2018; 2x separable 1D + one 2D clean-up) -> half-res
// additive thickness+foam splats -> full-res composite (choose-smaller-
// difference normals per Green GDC 2010, Schlick Fresnel F0=0.02,
// Beer-Lambert absorption, procedural environment with analytic floor
// refraction, WaterBall-style depth-gradient edge foam).

struct SsfrU {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  eye: vec4<f32>,
  // x: particle radius (world), y: foam speed norm, z: half width, w: half height
  p0: vec4<f32>,
  // x: full width, y: full height, z: filter dir x, w: filter dir y
  p1: vec4<f32>,
};

@group(0) @binding(0) var<uniform> U: SsfrU;
@group(0) @binding(1) var<storage, read> spos: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> svel: array<vec4<f32>>;
@group(0) @binding(3) var depth_in: texture_2d<f32>;
@group(0) @binding(4) var thick_in: texture_2d<f32>;

const CORNERS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
);

// ---- pass 1: sphere-impostor eye-depth --------------------------------------
struct DepthVSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) viewz: f32, // eye-space z of the sphere center (negative)
  @location(2) phase: f32,
};

@vertex
fn vs_depth(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> DepthVSOut {
  let corner = CORNERS[vid];
  let r = U.p0.x;
  let c = (U.view * vec4<f32>(spos[iid].xyz, 1.0)).xyz;
  var out: DepthVSOut;
  out.clip = U.proj * vec4<f32>(c + vec3<f32>(corner * r, 0.0), 1.0);
  out.uv = corner;
  out.viewz = c.z;
  out.phase = spos[iid].w;
  return out;
}

struct DepthFSOut {
  @location(0) eyed: vec2<f32>, // x: eye depth (positive distance)
  @builtin(frag_depth) depth: f32,
};

@fragment
fn fs_depth(in: DepthVSOut) -> DepthFSOut {
  let d2 = dot(in.uv, in.uv);
  if (d2 > 1.0) { discard; }
  let nz = sqrt(1.0 - d2);
  let zs = in.viewz + nz * U.p0.x; // sphere surface, view space (toward eye)
  let clip = U.proj * vec4<f32>(0.0, 0.0, zs, 1.0);
  var out: DepthFSOut;
  out.eyed = vec2<f32>(-zs, in.phase);
  out.depth = clip.z / clip.w;
  return out;
}

// ---- pass 2: additive thickness + foam splats --------------------------------
struct ThickVSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) phase: f32,
};

@vertex
fn vs_thick(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> ThickVSOut {
  let corner = CORNERS[vid];
  let r = U.p0.x * 1.4;
  let c = (U.view * vec4<f32>(spos[iid].xyz, 1.0)).xyz;
  var out: ThickVSOut;
  out.clip = U.proj * vec4<f32>(c + vec3<f32>(corner * r, 0.0), 1.0);
  out.uv = corner;
  out.phase = spos[iid].w;
  return out;
}

@fragment
fn fs_thick(in: ThickVSOut) -> @location(0) vec4<f32> {
  let d2 = dot(in.uv, in.uv);
  if (d2 > 1.0) { discard; }
  let w = exp(-2.4 * d2);
  let t = w * U.p0.x * 2.0;
  return select(vec4<f32>(t, 0.0, 0.0, 0.0), vec4<f32>(0.0, t, 0.0, 0.0), in.phase > 0.5);
}

// ---- fullscreen triangle -------------------------------------------------------
struct FsVSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_fullscreen(@builtin(vertex_index) vid: u32) -> FsVSOut {
  let xy = vec2<f32>(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: FsVSOut;
  out.clip = vec4<f32>(xy * 2.0 - 1.0, 0.0, 1.0);
  out.uv = xy;
  return out;
}

// ---- pass 3: narrow-range filter ------------------------------------------------
// Separable 1D (direction in U.p1.zw) with the narrow-range clamp: samples
// far BEHIND the center are pulled to center + mu (background leak guard),
// samples far in FRONT are rejected (they belong to a nearer surface).
@fragment
fn fs_nrf(in: FsVSOut) -> @location(0) vec4<f32> {
  let px = vec2<i32>(in.clip.xy);
  let dc = textureLoad(depth_in, px, 0).x;
  let pc = textureLoad(depth_in, px, 0).y;
  if (dc <= 0.0) { return vec4<f32>(0.0); }
  let r = U.p0.x;
  let delta = 10.0 * r;
  let mu = 1.0 * r;
  // depth-adaptive world-constant kernel radius (px), clamped
  let f = U.proj[1][1];
  var radius = i32(clamp(r * f * U.p0.w / dc, 1.0, 24.0));
  var sum = 0.0;
  var wsum = 0.0;
  let sigma = f32(radius) / 2.5;
  let dir = vec2<i32>(vec2<f32>(U.p1.zw));
  let size = vec2<i32>(i32(U.p0.z), i32(U.p0.w));
  for (var k = -radius; k <= radius; k = k + 1) {
    let q = px + dir * k;
    if (q.x < 0 || q.y < 0 || q.x >= size.x || q.y >= size.y) { continue; }
    let texel = textureLoad(depth_in, q, 0);
    var ds = texel.x;
    if (ds <= 0.0) { continue; }
    if (abs(texel.y - pc) > 0.25) { continue; }
    if (ds - dc > delta) { ds = dc + mu; }       // far behind -> clamp (narrow range)
    if (dc - ds > delta) { continue; }            // far in front -> other surface
    let w = exp(-f32(k * k) / (2.0 * sigma * sigma));
    sum = sum + ds * w;
    wsum = wsum + w;
  }
  return vec4<f32>(sum / max(wsum, 1e-6), pc, 0.0, 0.0);
}

// 2D clean-up (5x5) — same range logic, small fixed window.
@fragment
fn fs_nrf2d(in: FsVSOut) -> @location(0) vec4<f32> {
  let px = vec2<i32>(in.clip.xy);
  let dc = textureLoad(depth_in, px, 0).x;
  let pc = textureLoad(depth_in, px, 0).y;
  if (dc <= 0.0) { return vec4<f32>(0.0); }
  let r = U.p0.x;
  let delta = 10.0 * r;
  let mu = 1.0 * r;
  var sum = 0.0;
  var wsum = 0.0;
  let size = vec2<i32>(i32(U.p0.z), i32(U.p0.w));
  for (var dy = -2; dy <= 2; dy = dy + 1) {
    for (var dx = -2; dx <= 2; dx = dx + 1) {
      let q = px + vec2<i32>(dx, dy);
      if (q.x < 0 || q.y < 0 || q.x >= size.x || q.y >= size.y) { continue; }
      let texel = textureLoad(depth_in, q, 0);
      var ds = texel.x;
      if (ds <= 0.0) { continue; }
      if (abs(texel.y - pc) > 0.25) { continue; }
      if (ds - dc > delta) { ds = dc + mu; }
      if (dc - ds > delta) { continue; }
      let w = exp(-f32(dx * dx + dy * dy) / 4.0);
      sum = sum + ds * w;
      wsum = wsum + w;
    }
  }
  return vec4<f32>(sum / max(wsum, 1e-6), pc, 0.0, 0.0);
}

// ---- pass 4: composite ------------------------------------------------------------
// Procedural environment: sky gradient + sun + analytic checker floor at z=0
// (world). Refraction perturbs the view ray by the surface normal and
// re-evaluates the environment — no environment texture, fully self-contained
// (standalone-serve constraint).
fn env_color(origin: vec3<f32>, dir: vec3<f32>) -> vec3<f32> {
  let sun = normalize(vec3<f32>(0.45, 0.35, 0.62));
  let horizon = vec3<f32>(0.13, 0.19, 0.24);
  let zenith = vec3<f32>(0.015, 0.035, 0.06);
  var sky = mix(horizon, zenith, clamp(dir.z * 1.6 + 0.35, 0.0, 1.0));
  sky = sky + vec3<f32>(1.0, 0.92, 0.75) * pow(max(dot(dir, sun), 0.0), 180.0) * 2.2;
  sky = sky + vec3<f32>(0.35, 0.42, 0.5) * pow(max(dot(dir, sun), 0.0), 6.0) * 0.16;
  if (dir.z < -1e-4) {
    let t = -origin.z / dir.z;
    let hit = origin + dir * t;
    // analytic grid falloff (no fwidth — env_color runs in non-uniform flow);
    // line width grows with distance to approximate pixel-space antialiasing
    let g = abs(fract(hit.xy * 4.0 - 0.5) - 0.5);
    let w = 0.02 * (1.0 + 0.6 * t);
    let linew = 1.0 - smoothstep(0.0, w * 4.0, min(g.x, g.y));
    let inbox = step(-0.35, hit.x) * step(hit.x, 1.35) * step(-0.35, hit.y) * step(hit.y, 1.35);
    var floorc = vec3<f32>(0.035, 0.05, 0.062);
    floorc = floorc + vec3<f32>(0.06, 0.085, 0.095) * linew * inbox;
    let fade = exp(-0.25 * max(t - 1.0, 0.0));
    return mix(sky * 0.4, floorc, clamp(fade, 0.0, 1.0) * step(0.0, t));
  }
  if (dir.z > 1e-4) {
    // faint ceiling light-grid at z = 2.2 so calm surfaces have something
    // to reflect (the classic indoor-pool look) — additive over the sky
    let t = (2.2 - origin.z) / dir.z;
    let hit = origin + dir * t;
    let g = abs(fract(hit.xy * 1.6 - 0.5) - 0.5);
    let lw = 1.0 - smoothstep(0.0, 0.05 * (1.0 + 0.4 * t), min(g.x, g.y));
    let fade = exp(-0.12 * max(t - 1.0, 0.0));
    sky = sky + vec3<f32>(0.10, 0.14, 0.16) * lw * fade;
  }
  return sky;
}

fn view_pos(px: vec2<f32>, eyeDepth: f32) -> vec3<f32> {
  // reconstruct view-space position from half-res pixel coords + eye depth
  let ndc = vec2<f32>((px.x / U.p0.z) * 2.0 - 1.0, 1.0 - (px.y / U.p0.w) * 2.0);
  let fx = U.proj[0][0];
  let fy = U.proj[1][1];
  return vec3<f32>(ndc.x * eyeDepth / fx, ndc.y * eyeDepth / fy, -eyeDepth);
}

fn load_depth(px: vec2<i32>) -> f32 {
  let size = vec2<i32>(i32(U.p0.z), i32(U.p0.w));
  let q = clamp(px, vec2<i32>(0), size - 1);
  return textureLoad(depth_in, q, 0).x;
}

struct CompFSOut {
  @location(0) color: vec4<f32>,
  @builtin(frag_depth) depth: f32,
};

@fragment
fn fs_composite(in: FsVSOut) -> CompFSOut {
  // full-res pixel -> half-res coordinates
  let hp = vec2<f32>(in.clip.x * U.p0.z / U.p1.x, in.clip.y * U.p0.w / U.p1.y);
  let px = vec2<i32>(hp);
  let dc = load_depth(px);
  let frontPhase = textureLoad(depth_in, px, 0).y;

  // primary camera ray (world space) for the background
  let ndc = vec2<f32>(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0);
  let fx = U.proj[0][0];
  let fy = U.proj[1][1];
  let dirView = normalize(vec3<f32>(ndc.x / fx, ndc.y / fy, -1.0));
  // rows of the view rotation = world->view basis; transpose to go view->world
  let vx = vec3<f32>(U.view[0][0], U.view[1][0], U.view[2][0]);
  let vy = vec3<f32>(U.view[0][1], U.view[1][1], U.view[2][1]);
  let vz = vec3<f32>(U.view[0][2], U.view[1][2], U.view[2][2]);
  let dirWorld = normalize(vx * dirView.x + vy * dirView.y + vz * dirView.z);

  var out: CompFSOut;
  if (dc <= 0.0) {
    out.color = vec4<f32>(env_color(U.eye.xyz, dirWorld), 1.0);
    out.depth = 1.0;
    return out;
  }

  // choose-smaller-difference normals (Green GDC 2010)
  let p_c = view_pos(hp, dc);
  let dR = load_depth(px + vec2<i32>(1, 0));
  let dL = load_depth(px - vec2<i32>(1, 0));
  let dU2 = load_depth(px + vec2<i32>(0, 1));
  let dD = load_depth(px - vec2<i32>(0, 1));
  var ddx = view_pos(hp + vec2<f32>(1.0, 0.0), select(dR, dc, dR <= 0.0)) - p_c;
  let ddx2 = p_c - (view_pos(hp - vec2<f32>(1.0, 0.0), select(dL, dc, dL <= 0.0)));
  if (abs(ddx2.z) < abs(ddx.z)) { ddx = ddx2; }
  var ddy = view_pos(hp + vec2<f32>(0.0, 1.0), select(dU2, dc, dU2 <= 0.0)) - p_c;
  let ddy2 = p_c - (view_pos(hp - vec2<f32>(0.0, 1.0), select(dD, dc, dD <= 0.0)));
  if (abs(ddy2.z) < abs(ddy.z)) { ddy = ddy2; }
  var nView = normalize(cross(ddx, ddy));
  if (nView.z < 0.0) { nView = -nView; }
  let nWorld = normalize(vx * nView.x + vy * nView.y + vz * nView.z);

  let tf = textureLoad(thick_in, px, 0);
  let thickA = tf.x;
  let thickB = tf.y;
  let thick = thickA + thickB;

  // Relative-index Fresnel: outer A/air and B/air differ; the bright overlap
  // band marks the reconstructed internal A/B interface.
  let cosv = clamp(dot(-dirWorld, nWorld), 0.0, 1.0);
  let f0 = select(0.021, 0.034, frontPhase > 0.5);
  let fres = f0 + (1.0-f0) * pow(1.0 - cosv, 5.0);

  // reflection + refraction against the procedural environment
  let pWorld = U.eye.xyz + dirWorld * dc; // approx world hit point
  let reflDir = reflect(dirWorld, nWorld);
  let refl = env_color(pWorld, reflDir);
  let refrDir = normalize(dirWorld - nWorld * 0.28 * clamp(thick * 6.0, 0.0, 1.0));
  var refr = env_color(pWorld, refrDir);
  // Beer-Lambert per-channel absorption (k ratio ~ 9 : 3.4 : 1.2)
  let transA = exp(-vec3<f32>(3.2, 1.15, 0.35) * thickA);
  let transB = exp(-vec3<f32>(0.35, 1.45, 3.6) * thickB);
  let trans = transA * transB;
  let absorb = (vec3<f32>(0.02,0.28,0.36)*thickA + vec3<f32>(0.62,0.025,0.18)*thickB)/max(thick,1e-6);
  refr = refr * trans + absorb * (1.0-trans);

  var col = mix(refr, refl, fres);
  col += absorb * (1.0-trans) * 0.42;
  // sun specular
  let sun = normalize(vec3<f32>(0.45, 0.35, 0.62));
  col = col + vec3<f32>(1.0, 0.95, 0.8) * pow(max(dot(reflDir, sun), 0.0), 240.0) * 1.4;

  // A/B overlap is the internal-interface cue; depth-gradient adds a restrained
  // free-surface rim without pretending diffuse particles are a third fluid.
  let maxdz = max(max(abs(dR - dc), abs(dL - dc)), max(abs(dU2 - dc), abs(dD - dc)));
  let edge = clamp((maxdz / max(U.p0.x, 1e-5) - 1.5) * 0.22, 0.0, 0.4);
  let internal = clamp(min(thickA,thickB)*35.0,0.0,0.62);
  col = mix(col, vec3<f32>(1.0,0.28,0.72), internal);
  col = mix(col, vec3<f32>(0.82,0.92,0.96), edge*0.45);

  out.color = vec4<f32>(col, 1.0);
  let clip = U.proj * vec4<f32>(0.0, 0.0, -dc, 1.0);
  out.depth = clamp(clip.z / clip.w, 0.0, 1.0);
  return out;
}
