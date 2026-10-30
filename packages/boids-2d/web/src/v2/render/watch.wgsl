// Watch one (03-boids-2d.md § Tools): the watched fish ringed in amber, the
// reach it senses as a faint circle (and its inner zones), and a thread to
// every neighbour inside it — drawn straight from the GPU record the tracker
// wrote this frame (../model/watch.ts), so it sits exactly on the drawn fish.
// Instance 0 is the fish and its rings; instance k > 0 is neighbour k − 1.
// In Eyes Only (View.grid.z = 1) there are no threads: instance 0 also draws
// the fish's visual field as a band around it, straight from the vision
// kernel's record (../model/brains-m3.ts): lit where its eye sees a fish,
// with the edges it is drawn to in amber.

struct View {
  cam: vec4<f32>,      // camera centre (domain units), domain units per target px, time (s)
  dims: vec4<f32>,     // target px (w, h), domain (W, H)
  half: vec4<f32>,     // world halfW, halfH, images across, images down
  fish: vec4<f32>,     // fish length (world), smallest drawn length (px), gain, colour mode (0 silver, 1 heading, 2 species)
  silver: vec4<f32>,   // fish rgb (linear), tail flick
  water: vec4<f32>,    // deep water rgb, caustic gain
  caustic: vec4<f32>,  // lattice cells across, down (octave 1), drift speed, unused
  shark: vec4<f32>,    // world x, y, heading (rad), body length (world)
  shark2: vec4<f32>,   // fear radius (world), presence 0–1, lunge 0–1, ring gain
  split: vec4<f32>,    // compare split in target px (< 0 off), divider alpha, unused, unused
  lod: vec4<f32>,      // glyph weight, field weight, far light factor, field cell (target px)
  grid: vec4<f32>,     // field cells across, down, watch mode (1 = Eyes Only's retina band), unused
  species: array<vec4<f32>, 6>, // colour mode 2: each species' rgb (linear); the species rides in the boid's align
};

struct Rec {
  found: u32, slot: u32, id: u32, count: u32,
  pos: vec2<f32>, vel: vec2<f32>,
  align: f32, dens: f32, radius: f32, total: u32,
  rings: vec4<f32>,
};
struct Watch { rec: Rec, list: array<vec4<f32>> };

@group(0) @binding(0) var<uniform> V: View;
@group(1) @binding(0) var<storage, read> watch: Watch;
@group(1) @binding(1) var<storage, read> retina: array<u32>;

const MAX_LIST: u32 = 256u;

struct WatchOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) px: vec2<f32>,                         // target px
  @location(1) @interpolate(flat) a: vec2<f32>,        // the fish (target px)
  @location(2) @interpolate(flat) b: vec2<f32>,        // the neighbour (target px), or the fish
  @location(3) @interpolate(flat) kind: vec4<f32>,     // 0 fish / 1 neighbour, reach (px), ring 1 (px), ring 2 (px)
};

fn fish_px() -> vec2<f32> {
  let W = V.dims.zw;
  var d = watch.rec.pos + V.half.xy - V.cam.xy;
  d = d - W * round(d / W);
  return d / V.cam.z + 0.5 * V.dims.xy;
}

@vertex
fn watch_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> WatchOut {
  var o: WatchOut;
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
  );
  let c = corners[vi];
  let listed = min(watch.rec.count, MAX_LIST);
  let eyes = V.grid.z > 0.5;
  if (watch.rec.found == 0u || (ii > 0u && (ii > listed || eyes))) {
    o.pos = vec4<f32>(-2.0, -2.0, 0.0, 1.0);
    return o;
  }
  let a = fish_px();
  let reach = watch.rec.radius / V.cam.z;
  let mark = max(0.9 * V.fish.x / V.cam.z, 7.0);
  o.a = a;
  var p = a;
  if (ii == 0u) {
    let R = max(max(reach, mark), select(0.0, band_r(mark) + 8.0, eyes)) + 4.0;
    p = a + c * R;
    o.b = a;
    o.kind = vec4<f32>(0.0, reach, watch.rec.rings.x / V.cam.z, watch.rec.rings.y / V.cam.z);
  } else {
    let e = watch.list[ii - 1u];
    let b = a + e.xy / V.cam.z;
    let t = b - a;
    let L = max(length(t), 1e-3);
    let u = t / L;
    let n = vec2<f32>(-u.y, u.x);
    // a quad along the thread, padded round the neighbour's dot
    let along = select(-2.0, L + 6.0, c.x > 0.0);
    p = a + u * along + n * c.y * 6.0;
    o.b = b;
    o.kind = vec4<f32>(1.0, reach, 0.0, 0.0);
  }
  o.px = p;
  o.pos = vec4<f32>(p.x / V.dims.x * 2.0 - 1.0, 1.0 - p.y / V.dims.y * 2.0, 0.0, 1.0);
  return o;
}

// the visual field's band: well outside the fish's ring
fn band_r(mark: f32) -> f32 {
  return max(3.2 * mark, 34.0);
}

fn seen(k: u32) -> u32 {
  return (retina[k >> 5u] >> (k & 31u)) & 1u;
}

fn line(d: f32, w: f32) -> f32 {
  return 1.0 - smoothstep(w * 0.5, w * 0.5 + 1.0, abs(d));
}

@fragment
fn watch_fs(in: WatchOut) -> @location(0) vec4<f32> {
  let amber = vec3<f32>(1.0, 0.72, 0.32);
  let cool = vec3<f32>(0.62, 0.86, 1.0);
  var rgb = vec3<f32>(0.0);
  if (in.kind.x < 0.5) {
    let r = length(in.px - in.a);
    let mark = max(0.9 * V.fish.x / V.cam.z, 7.0);
    // the watched fish: a bright ring and a faint glow inside it
    rgb = amber * (1.5 * line(r - mark, 1.5) + 0.12 * (1.0 - smoothstep(0.0, mark, r)));
    if (V.grid.z > 0.5 && retina[13] == watch.rec.slot) {
      // its visual field: the direction from the fish, measured from its heading ψ. World and
      // screen share axes (y down on screen), so the world angle of this pixel is atan2(q.y, q.x).
      let br = band_r(mark);
      let q = in.px - in.a;
      let phiW = atan2(q.y, q.x);
      var phi = phiW - watch.rec.align;
      phi = phi - 6.28318530718 * floor((phi + 3.14159265359) / 6.28318530718);
      let fk = (phi + 3.14159265359) / (6.28318530718 / 256.0);
      let k = min(u32(max(fk, 0.0)), 255u);
      let inBand = 1.0 - smoothstep(4.0, 5.2, abs(r - br));
      let lit = f32(seen(k));
      rgb = rgb + cool * inBand * mix(0.06, 0.75, lit);
      // an edge: the bin differs from its neighbour below (within a quarter bin of the boundary)
      let kb = u32(round(fk)) % 256u;
      let edge = select(0.0, 1.0, seen(kb) != seen((kb + 255u) % 256u)) * (1.0 - smoothstep(0.0, 0.35, abs(fk - round(fk))));
      rgb = rgb + amber * edge * (1.0 - smoothstep(6.0, 7.5, abs(r - br))) * 1.4;
      // ahead
      let ahead = 1.0 - smoothstep(0.0, 0.06, abs(phi));
      rgb = rgb + amber * 0.5 * ahead * (1.0 - smoothstep(8.0, 9.0, abs(r - br - 9.0)));
    }
    // its reach, and the inner zones where the brain has them
    rgb = rgb + cool * 0.32 * line(r - in.kind.y, 1.3);
    if (in.kind.z > 0.5) { rgb = rgb + cool * 0.18 * line(r - in.kind.z, 1.0); }
    if (in.kind.w > 0.5) { rgb = rgb + cool * 0.18 * line(r - in.kind.w, 1.0); }
  } else {
    let t = in.b - in.a;
    let L = max(length(t), 1e-3);
    let u = t / L;
    let q = in.px - in.a;
    let along = dot(q, u);
    let across = q.x * u.y - q.y * u.x;
    let mark = max(0.9 * V.fish.x / V.cam.z, 7.0);
    // a thread from the fish's ring to the neighbour, fading with distance
    let fade = 1.0 - 0.6 * clamp(L / max(in.kind.y, 1.0), 0.0, 1.0);
    let inside = step(mark + 1.0, along) * step(along, L - 3.5);
    let thread = line(across, 1.0) * inside * 0.28 * fade;
    let dot_ = line(length(in.px - in.b) - 3.0, 1.2) * 0.7;
    rgb = cool * (thread + dot_);
  }
  if (dot(rgb, rgb) <= 1e-6) {
    discard;
  }
  return vec4<f32>(rgb, 0.0);
}
