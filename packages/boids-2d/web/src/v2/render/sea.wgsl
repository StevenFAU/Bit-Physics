// Swarm M2 look: what lives in the water besides the fish.
//   Current     — the moving water as a faint sheen (brighter where it runs,
//                 tinted by its spin), and motes: specks of drifting matter
//                 that ride the flow exactly, drawn as short streaks.
//   Food Chain  — plankton glowing where it grows (bioluminescent teal), and
//                 the hunting sharks as soft shadows, like the visitor's shark.
// Emitted into the HDR scene target (additive light; the shadows darken).
// Nothing here feeds back into the simulation.
#import bp/fullscreen

struct SV {
  cam: vec4<f32>,     // camera centre (domain units), domain units per target px, time (s)
  dims: vec4<f32>,    // target px (w, h), domain (W, H)
  half: vec4<f32>,    // world halfW, halfH, images across, images down
  grid: vec4<f32>,    // field nodes / cells across, down, cell size x, y (world)
  flow: vec4<f32>,    // sheen gain, speed scale (world/step), spin gain, mote gain
  motes: vec4<f32>,   // mote width (px), streak length (steps), unused, unused
  plank: vec4<f32>,   // glow gain, carrying capacity K, unused, unused
  shark: vec4<f32>,   // body length (world), shark slots, unused, unused
};
struct FS { u0x: f32, u0y: f32, sumX: i32, sumY: i32 };
struct Shark { pos: vec2<f32>, vel: vec2<f32>, energy: f32, alive: f32, meals: i32, age: f32 };

@group(0) @binding(0) var<uniform> V: SV;
@group(1) @binding(0) var<storage, read> psi: array<f32>;
@group(1) @binding(1) var<storage, read> omega: array<f32>;
@group(1) @binding(2) var<storage, read> state: FS;
@group(1) @binding(3) var<storage, read> motes: array<vec2<f32>>;
@group(1) @binding(4) var<storage, read> plankton: array<f32>;
@group(1) @binding(5) var<storage, read> sharks: array<Shark>;

fn wrapi(i: i32, n: i32) -> u32 { return u32(((i % n) + n) % n); }
fn node(i: i32, j: i32) -> u32 { let gw = i32(V.grid.x); let gh = i32(V.grid.y); return wrapi(j, gh) * u32(gw) + wrapi(i, gw); }

// the water's velocity at node coordinates q: the exact curl of bilinear ψ (as model/fluid.ts), plus the mean flow
fn velAt(q: vec2<f32>) -> vec2<f32> {
  let i0 = i32(floor(q.x)); let j0 = i32(floor(q.y));
  let tx = q.x - f32(i0); let ty = q.y - f32(j0);
  let p00 = psi[node(i0, j0)]; let p10 = psi[node(i0 + 1, j0)];
  let p01 = psi[node(i0, j0 + 1)]; let p11 = psi[node(i0 + 1, j0 + 1)];
  let u = ((p01 - p00) * (1.0 - tx) + (p11 - p10) * tx) / V.grid.w;
  let v = -((p10 - p00) * (1.0 - ty) + (p11 - p01) * ty) / V.grid.z;
  return vec2<f32>(u, v) + vec2<f32>(state.u0x, state.u0y);
}

fn bilin(q: vec2<f32>, which: u32) -> f32 {
  let i0 = i32(floor(q.x)); let j0 = i32(floor(q.y));
  let tx = q.x - f32(i0); let ty = q.y - f32(j0);
  var a: vec4<f32>;
  if (which == 0u) {
    a = vec4<f32>(omega[node(i0, j0)], omega[node(i0 + 1, j0)], omega[node(i0, j0 + 1)], omega[node(i0 + 1, j0 + 1)]);
  } else {
    a = vec4<f32>(plankton[node(i0, j0)], plankton[node(i0 + 1, j0)], plankton[node(i0, j0 + 1)], plankton[node(i0 + 1, j0 + 1)]);
  }
  return mix(mix(a.x, a.y, tx), mix(a.z, a.w, tx), ty);
}

// this pixel's position on the torus, in domain units (0 … W, 0 … H)
fn domainAt(uv: vec2<f32>) -> vec2<f32> {
  let px = uv * V.dims.xy;
  let q = V.cam.xy + (px - 0.5 * V.dims.xy) * V.cam.z;
  return fract(q / V.dims.zw) * V.dims.zw;
}

// ------------------------------------------------------------------ current --

@vertex
fn sea_vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn current_fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let d = domainAt(in.uv);
  let q = d / V.grid.zw;                       // node coordinates (node 0 at the domain's corner)
  let u = velAt(q);
  let s = length(u) / max(V.flow.y, 1e-9);
  let w = bilin(q, 0u) / max(V.flow.y, 1e-9) * V.grid.z;   // spin, in units of (speed scale / cell)
  let sheen = vec3<f32>(0.0010, 0.0030, 0.0052) * min(s * s, 4.0) * V.flow.x;
  let spin = clamp(w * V.flow.z, -1.0, 1.0);
  let tint = vec3<f32>(0.0004, 0.0018, 0.0032) * max(spin, 0.0) + vec3<f32>(0.0034, 0.0018, 0.0004) * max(-spin, 0.0);
  return vec4<f32>(sheen + tint * V.flow.x, 0.0);
}

// ------------------------------------------------------------------- motes --

struct MoteOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) local: vec2<f32>,                   // along (−1 … 1), across (−1 … 1)
  @location(1) @interpolate(flat) light: f32,
};

// the image of a world point nearest the camera, for instance `img`, in target px
fn imagePx(p: vec2<f32>, img: u32) -> vec2<f32> {
  let W = V.dims.zw;
  var d = p + V.half.xy - V.cam.xy;
  d = d - W * round(d / W);
  let nx = u32(V.half.z);
  let ox = f32(img % nx) - f32(nx / 2u);
  let oy = f32(img / nx) - f32(u32(V.half.w) / 2u);
  d = d + vec2<f32>(ox, oy) * W;
  return d / V.cam.z + 0.5 * V.dims.xy;
}

@vertex
fn motes_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> MoteOut {
  var o: MoteOut;
  let n = arrayLength(&motes);
  let i = ii % n;
  let img = ii / n;
  let p = motes[i];
  let c = imagePx(p, img);
  let u = velAt((p + V.half.xy) / V.grid.zw);
  let sp = length(u);
  let dir = select(vec2<f32>(1.0, 0.0), u / max(sp, 1e-12), sp > 1e-12);
  let perp = vec2<f32>(-dir.y, dir.x);
  let wpx = V.motes.x;
  let lpx = max(wpx, sp * V.motes.y / V.cam.z);
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
  );
  let k = corners[vi];
  // the streak trails behind the mote: from −length to 0 along its motion
  let along = mix(-lpx, 0.5 * wpx, k.x * 0.5 + 0.5);
  var px = c + dir * along + perp * k.y * wpx;
  if (c.x < -lpx - 4.0 || c.y < -lpx - 4.0 || c.x > V.dims.x + lpx + 4.0 || c.y > V.dims.y + lpx + 4.0) {
    px = vec2<f32>(-10.0, -10.0);
  }
  o.pos = vec4<f32>(px.x / V.dims.x * 2.0 - 1.0, 1.0 - px.y / V.dims.y * 2.0, 0.0, 1.0);
  o.local = k;
  // the same light however long the streak: spread over its length
  o.light = V.flow.w * wpx / (lpx + wpx);
  return o;
}

@fragment
fn motes_fs(in: MoteOut) -> @location(0) vec4<f32> {
  let across = in.local.y;
  let along = in.local.x * 0.5 + 0.5;               // 0 at the tail, 1 at the mote
  let a = exp(-3.0 * across * across) * mix(0.25, 1.0, along) * in.light;
  if (a < 1e-4) {
    discard;
  }
  return vec4<f32>(vec3<f32>(0.55, 0.75, 0.85) * a, 0.0);
}

// ----------------------------------------------------------------- plankton --

@fragment
fn plankton_fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let d = domainAt(in.uv);
  // cell centres: cell (i, j) covers [i, i + 1) × [j, j + 1)
  let q = d / V.grid.zw - 0.5;
  let p = clamp(bilin(q, 1u) / max(V.plank.y, 1e-9), 0.0, 2.0);
  // a cool green glow that saturates as the bloom fills its carrying capacity
  let g = p * (1.15 - 0.45 * p);
  let col = vec3<f32>(0.022, 0.135, 0.100) * g * V.plank.x;
  return vec4<f32>(col, 0.0);
}

// ------------------------------------------------------------------ sharks --

fn tri_dist(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> f32 {
  let e0 = b - a; let e1 = c - b; let e2 = a - c;
  let v0 = p - a; let v1 = p - b; let v2 = p - c;
  let pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  let pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  let pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  let s = sign(e0.x * e2.y - e0.y * e2.x);
  let d = min(min(vec2<f32>(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                  vec2<f32>(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                  vec2<f32>(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}

// a shark from above, nose at +x, in units of its length (as ocean.wgsl's)
fn shark_dist(p0: vec2<f32>, sway: f32) -> f32 {
  var p = p0;
  let behind = max(-p.x, 0.0);
  p.y = p.y - sway * behind * behind * 1.6;
  let w = 0.085 * (1.0 - 0.35 * smoothstep(-0.1, -0.45, p.x));
  let body = length(vec2<f32>((p.x - 0.04) / 0.46, p.y / w)) - 1.0;
  var d = body * min(0.46, w);
  let fy = abs(p.y);
  d = min(d, tri_dist(vec2<f32>(p.x, fy), vec2<f32>(0.14, 0.04), vec2<f32>(-0.07, 0.21), vec2<f32>(-0.01, 0.04)));
  d = min(d, tri_dist(vec2<f32>(p.x, fy), vec2<f32>(-0.38, 0.0), vec2<f32>(-0.56, 0.13), vec2<f32>(-0.47, 0.0)));
  return d;
}

struct SharkOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) local: vec2<f32>,                         // shark frame, units of its length
  @location(1) @interpolate(flat) look: vec4<f32>,       // presence, sway phase, fed (0–1), px per length
};

@vertex
fn sharks_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> SharkOut {
  var o: SharkOut;
  let n = arrayLength(&sharks);
  let i = ii % n;
  let img = ii / n;
  let s = sharks[i];
  let L = V.shark.x;
  let c = imagePx(s.pos, img);
  let sp = length(s.vel);
  let dir = select(vec2<f32>(1.0, 0.0), s.vel / max(sp, 1e-12), sp > 1e-12);
  let perp = vec2<f32>(-dir.y, dir.x);
  let lpx = L / V.cam.z;
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
  );
  let k = corners[vi] * 0.75;
  var px = c + (dir * k.x + perp * k.y) * lpx;
  if (s.alive < 0.5 || c.x < -lpx || c.y < -lpx || c.x > V.dims.x + lpx || c.y > V.dims.y + lpx) {
    px = vec2<f32>(-10.0, -10.0);
  }
  o.pos = vec4<f32>(px.x / V.dims.x * 2.0 - 1.0, 1.0 - px.y / V.dims.y * 2.0, 0.0, 1.0);
  o.local = k;
  o.look = vec4<f32>(clamp(s.age / 40.0, 0.0, 1.0), f32(i) * 1.7, clamp(s.energy, 0.0, 1.0), lpx);
  return o;
}

@fragment
fn sharks_fs(in: SharkOut) -> @location(0) vec4<f32> {
  let sway = sin(V.cam.w * 5.0 + in.look.y) * 0.06;
  let sd = shark_dist(in.local, sway);
  let blur = max(0.025, 1.5 / max(in.look.w, 1.0));
  let shadow = 1.0 - smoothstep(-blur, blur * 2.5, sd);
  let pen = 1.0 - smoothstep(0.0, 0.12, sd);
  let alpha = in.look.x * clamp(0.9 * shadow + 0.22 * pen, 0.0, 0.95);
  // a faint rim, warmer when the shark has eaten well
  let rimW = max(0.012, 1.2 / max(in.look.w, 1.0));
  let rim = exp(-pow((sd - 0.5 * rimW) / rimW, 2.0)) * 0.05;
  let rimCol = mix(vec3<f32>(0.35, 0.75, 0.9), vec3<f32>(0.9, 0.6, 0.35), in.look.z);
  let rgb = rimCol * rim * in.look.x;
  if (alpha <= 0.002 && dot(rgb, rgb) <= 0.0) {
    discard;
  }
  return vec4<f32>(rgb, alpha);
}
