// Swarm look (03-boids-2d.md § The look): night ocean from above. Deep
// blue-black water with slow caustics; fish in three levels of detail chosen
// by their size on screen — oriented glyphs with a tail flick up close,
// motion streaks at mid zoom, and (./field.wgsl splats them) a density and
// heading field when a fish is smaller than a pixel — cross-faded by that
// size, each fish's light the same in every level so nothing pops; and the
// shark as a soft dark shadow with a faint ring at its fear radius.
// Everything is emitted into the HDR scene target and tone-mapped by
// @bp/render; nothing here feeds back into the simulation.
//
// Coordinates: world (−halfW … halfW, −halfH … halfH) is the kernel's; the
// camera's domain is world + half (0 … W, 0 … H), y down on screen. The
// domain is a torus: each fish is drawn at its image nearest the camera
// centre, repeated across `images` when the view is wider than the domain.
#import bp/fullscreen
#import bp/hash

struct View {
  cam: vec4<f32>,      // camera centre (domain units), domain units per target px, time (s)
  dims: vec4<f32>,     // target px (w, h), domain (W, H)
  half: vec4<f32>,     // world halfW, halfH, images across, images down
  fish: vec4<f32>,     // fish length (world), smallest drawn length (px), gain, colour mode (0 silver, 1 heading)
  silver: vec4<f32>,   // fish rgb (linear), tail flick
  water: vec4<f32>,    // deep water rgb, caustic gain
  caustic: vec4<f32>,  // lattice cells across, down (octave 1), drift speed, unused
  shark: vec4<f32>,    // world x, y, heading (rad), body length (world)
  shark2: vec4<f32>,   // fear radius (world), presence 0–1, lunge 0–1, ring gain
  split: vec4<f32>,    // compare split in target px (< 0 off), divider alpha, unused, unused
  lod: vec4<f32>,      // glyph weight, field weight, far light factor, field cell (target px)
  grid: vec4<f32>,     // field cells across, down, unused, unused
};

struct Boid { pos: vec2<f32>, vel: vec2<f32>, align: f32, dens: f32 };

@group(0) @binding(0) var<uniform> V: View;
@group(1) @binding(0) var<storage, read> boids: array<Boid>;
@group(2) @binding(0) var<storage, read> fieldGrid: array<u32>;

// ------------------------------------------------------------------ water --

// cellular (Worley) noise on a lattice that wraps every `period` cells, so it
// is periodic in the domain: F2 − F1 is small along the cell edges, which is
// where light gathers in a caustic network. Feature points circle slowly.
fn cell_edges(x: vec2<f32>, period: vec2<f32>, seed: u32, t: f32) -> f32 {
  let i = floor(x);
  let f = x - i;
  let p = vec2<i32>(period);
  var d1 = 9.0;
  var d2 = 9.0;
  for (var oy = -1; oy <= 1; oy = oy + 1) {
    for (var ox = -1; ox <= 1; ox = ox + 1) {
      let c = vec2<i32>(i) + vec2<i32>(ox, oy);
      let w = vec2<u32>(((c % p) + p) % p);
      let h = bp_hash3(w.x, w.y, seed);
      let ang = bp_unit(h) * 6.2831853 + t * (0.6 + 0.5 * bp_unit(h ^ 0x9e3779b9u));
      let r = 0.18 + 0.12 * bp_unit(h ^ 0x85ebca6bu);
      let fp = vec2<f32>(f32(ox), f32(oy)) + 0.5 + r * vec2<f32>(cos(ang), sin(ang)) - f;
      let d = dot(fp, fp);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return sqrt(d2) - sqrt(d1);
}

// value noise on a lattice that wraps every `period` cells (periodic in the domain)
fn pnoise(x: vec2<f32>, period: vec2<f32>, seed: u32) -> f32 {
  let i = floor(x);
  let f = x - i;
  let u = f * f * (3.0 - 2.0 * f);
  let p = vec2<i32>(period);
  let a0 = vec2<u32>(((vec2<i32>(i) % p) + p) % p);
  let a1 = vec2<u32>(((vec2<i32>(i) + vec2<i32>(1)) % p + p) % p);
  let h00 = bp_unit(bp_hash3(a0.x, a0.y, seed));
  let h10 = bp_unit(bp_hash3(a1.x, a0.y, seed));
  let h01 = bp_unit(bp_hash3(a0.x, a1.y, seed));
  let h11 = bp_unit(bp_hash3(a1.x, a1.y, seed));
  return mix(mix(h00, h10, u.x), mix(h01, h11, u.x), u.y);
}

// caustic network: cell edges of a warped, drifting lattice in two layers,
// soft lines that brighten where the layers cross
fn caustic(u: vec2<f32>, t: f32, px: f32) -> f32 {
  let m = V.caustic.xy;
  let s = t * V.caustic.z;
  let x = u * m;
  // a smooth periodic warp bends the cells into an organic web
  let wm = max(floor(m * 0.5), vec2<f32>(1.0));
  let wu = u * wm + vec2<f32>(0.11 * s, -0.07 * s);
  let warp = vec2<f32>(pnoise(wu, wm, 5u), pnoise(wu + 17.3, wm, 9u)) - 0.5;
  let e1 = cell_edges(x + warp * 1.4 + vec2<f32>(s, 0.3 * s), m, 11u, t);
  let e2 = cell_edges(x * 2.0 - warp * 2.2 - vec2<f32>(0.7 * s, s), m * 2.0, 23u, t * 1.3);
  // soft line profile, never thinner than about a pixel (px = one target pixel in cell units)
  let w1 = max(0.06, px * 1.2);
  let w2 = max(0.05, px * 2.4);
  let l1 = exp(-(e1 * e1) / (w1 * w1));
  let l2 = exp(-(e2 * e2) / (w2 * w2));
  return l1 * 0.6 + l2 * 0.25 + l1 * l2 * 1.4;
}

@vertex
fn water_vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn water_fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let px = in.uv * V.dims.xy;
  let q = V.cam.xy + (px - 0.5 * V.dims.xy) * V.cam.z;   // domain units
  let u = fract(q / V.dims.zw);                           // the torus
  // one target pixel is cam.z domain units: fade the caustics out where they would alias
  let cellPx = V.dims.z / max(V.caustic.x, 1.0) / max(V.cam.z, 1e-6);
  let visible = smoothstep(5.0, 20.0, cellPx);
  let c = caustic(u, V.cam.w, 1.0 / max(cellPx, 1e-3)) * visible;
  // a gentle falloff away from the screen centre (light from above)
  let r = length(in.uv - 0.5);
  let light = 1.0 - 0.45 * r * r;
  let col = V.water.rgb * light * (1.0 + V.water.a * c * 5.0);
  return vec4<f32>(col, 1.0);
}

// ------------------------------------------------------------------- fish --

struct FishOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) pxo: vec2<f32>,                              // px from the fish's centre: x along its heading, y across
  @location(1) col: vec3<f32>,
  @location(2) @interpolate(flat) shape: vec4<f32>,         // glyph half length (px), streak length, streak width (px), flick phase
  @location(3) @interpolate(flat) mixw: vec4<f32>,          // glyph weight, streak light scale, (1 − field weight), unused
};

fn oklab_to_linear(lab: vec3<f32>) -> vec3<f32> {
  let l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  let m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  let s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  let l3 = l * l * l;
  let m3 = m * m * m;
  let s3 = s * s * s;
  return vec3<f32>(
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076127010 * s3,
  );
}

// heading on a cyclic perceptual map: constant OKLab lightness and chroma, hue = direction
fn heading_colour(dir: vec2<f32>) -> vec3<f32> {
  let c = 0.11;
  return max(oklab_to_linear(vec3<f32>(0.80, c * dir.x, c * dir.y)), vec3<f32>(0.0));
}

// The light one fish emits in every level of detail, in (radiance · px²):
// far ⇒ 0.498 · gain · len² (a soft dot of the fish's true area, as Swarm's
// M0 drew it), near ⇒ the glyph's own area, 0.168 · gain · len².
fn fish_energy_k(lenPx: f32) -> f32 {
  return mix(V.lod.z, 0.168, smoothstep(1.5, 8.0, lenPx));
}

@vertex
fn fish_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> FishOut {
  var o: FishOut;
  let n = arrayLength(&boids);
  let i = ii % n;
  let img = ii / n;
  let b = boids[i];
  let W = V.dims.zw;
  // the image nearest the camera centre, then this instance's image offset
  var d = b.pos + V.half.xy - V.cam.xy;
  d = d - W * round(d / W);
  let nx = u32(V.half.z);
  let ox = f32(img % nx) - f32(nx / 2u);
  let oy = f32(img / nx) - f32(u32(V.half.w) / 2u);
  d = d + vec2<f32>(ox, oy) * W;
  let centre = d / V.cam.z + 0.5 * V.dims.xy;              // target px

  let sp = length(b.vel);
  let dir = select(vec2<f32>(1.0, 0.0), b.vel / max(sp, 1e-12), sp > 1e-12);
  let perp = vec2<f32>(-dir.y, dir.x);
  let lenPx = V.fish.x / V.cam.z;
  let g = V.lod.x;
  // the glyph: the fish at its true size; the streak: a soft line a little longer than the fish
  let hlg = 0.5 * lenPx;
  let Ls = max(1.8 * lenPx, 3.0);
  let Ws = max(0.32 * lenPx, 1.1);
  let hl = max(select(0.0, hlg, g > 0.0), 0.5 * Ls) + 1.0;
  let hw = max(select(0.0, hlg * 0.62, g > 0.0), 1.6 * Ws) + 1.0;

  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
  );
  let c = corners[vi];
  let off = vec2<f32>(c.x * hl, c.y * hw);
  var p = centre + dir * off.x + perp * off.y;
  // off-screen fish collapse to a degenerate point (no fragments)
  let margin = hl + 2.0;
  if (centre.x < -margin || centre.y < -margin || centre.x > V.dims.x + margin || centre.y > V.dims.y + margin) {
    p = vec2<f32>(-10.0, -10.0);
  }
  o.pos = vec4<f32>(p.x / V.dims.x * 2.0 - 1.0, 1.0 - p.y / V.dims.y * 2.0, 0.0, 1.0);
  o.pxo = off;
  var col = V.silver.rgb;
  if (V.fish.w > 0.5) {
    col = heading_colour(dir);
  }
  o.col = col * V.fish.z;
  // the streak's profile integrates to 0.245 · Ws · Ls px²; scale it to this size's light
  let streakScale = fish_energy_k(lenPx) * lenPx * lenPx / (0.245 * Ws * Ls);
  let phase = bp_unit(bp_hash3(i, 7u, 3u)) * 6.2831853;
  o.shape = vec4<f32>(hlg, Ls, Ws, phase);
  o.mixw = vec4<f32>(g, streakScale, 1.0 - V.lod.y, 0.0);
  return o;
}

@fragment
fn fish_fs(in: FishOut) -> @location(0) vec4<f32> {
  let g = in.mixw.x;
  var a = 0.0;
  if (g < 0.999) {
    // streak: brightest at the head, a soft tail behind
    let Ls = in.shape.y;
    let Ws = in.shape.z;
    let t = (in.pxo.x + 0.5 * Ls) / Ls;
    let across = in.pxo.y / (0.5 * Ws);
    let ramp = mix(0.2, 1.0, clamp(t, 0.0, 1.0)) * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.92, 1.0, t));
    a = a + (1.0 - g) * exp(-4.0 * across * across) * ramp * in.mixw.y;
  }
  if (g > 0.001) {
    // glyph: an ellipse body and a forked tail that flicks
    let hlg = max(in.shape.x, 1e-3);
    let f = in.pxo / hlg;
    let px = 1.0 / hlg;
    let flick = sin(V.cam.w * 9.0 + in.shape.w) * V.silver.a;
    let be = length(vec2<f32>((f.x - 0.12) / 0.78, f.y / 0.26)) - 1.0;
    let body = 1.0 - smoothstep(-px * 0.26, px * 0.26, be * 0.26);
    let tx = -f.x - 0.62;
    let ty = abs(f.y - flick * max(tx, 0.0) * 1.2);
    let tailW = 0.04 + tx * 0.75;
    let inTail = (1.0 - smoothstep(tailW - px, tailW + px, ty)) * step(0.0, tx) * (1.0 - smoothstep(0.30, 0.38, tx));
    a = a + g * max(body, inTail * 0.85);
  }
  a = a * in.mixw.z;
  if (a < 0.002) {
    discard;
  }
  return vec4<f32>(in.col * a, 0.0);
}

// ------------------------------------------------------------------ field --
// Far away a fish is smaller than a pixel: ./field.wgsl adds every fish's
// colour (fixed point, 1/1024) into a grid of `lod.w`-px cells, and this pass
// spreads each cell's light over its pixels with a bilinear tent, scaled by the
// same light per fish as the streaks it fades from.

fn field_cell(x: i32, y: i32) -> vec3<f32> {
  let gw = i32(V.grid.x);
  let gh = i32(V.grid.y);
  let cx = clamp(x, 0, gw - 1);
  let cy = clamp(y, 0, gh - 1);
  let k = u32(cy * gw + cx) * 3u;
  return vec3<f32>(f32(fieldGrid[k]), f32(fieldGrid[k + 1u]), f32(fieldGrid[k + 2u])) / 1024.0;
}

@vertex
fn field_vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn field_fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let px = in.uv * V.dims.xy;
  let C = V.lod.w;
  let q = px / C - 0.5;
  let i0 = vec2<i32>(floor(q));
  let f = q - floor(q);
  let s = mix(mix(field_cell(i0.x, i0.y), field_cell(i0.x + 1, i0.y), f.x), mix(field_cell(i0.x, i0.y + 1), field_cell(i0.x + 1, i0.y + 1), f.x), f.y);
  let lenPx = V.fish.x / V.cam.z;
  let e = V.fish.z * fish_energy_k(lenPx) * lenPx * lenPx / (C * C);
  let rgb = s * e * V.lod.y;
  if (dot(rgb, rgb) <= 0.0) {
    discard;
  }
  return vec4<f32>(rgb, 0.0);
}

// ------------------------------------------------------- shark and overlay --

fn seg_dist(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

fn tri_dist(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> f32 {
  // signed distance to a triangle (negative inside)
  let e0 = b - a;
  let e1 = c - b;
  let e2 = a - c;
  let v0 = p - a;
  let v1 = p - b;
  let v2 = p - c;
  let pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  let pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  let pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  let s = sign(e0.x * e2.y - e0.y * e2.x);
  let d = min(min(vec2<f32>(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                  vec2<f32>(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                  vec2<f32>(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}

// a shark seen from above, nose at +x, in units of its length; tail sways with `sway`
fn shark_dist(p0: vec2<f32>, sway: f32) -> f32 {
  var p = p0;
  let behind = max(-p.x, 0.0);
  p.y = p.y - sway * behind * behind * 1.6;
  // body: a long ellipse, fuller towards the head
  let w = 0.085 * (1.0 - 0.35 * smoothstep(-0.1, -0.45, p.x));
  let body = length(vec2<f32>((p.x - 0.04) / 0.46, p.y / w)) - 1.0;
  var d = body * min(0.46, w);
  // pectoral fins
  let fy = abs(p.y);
  d = min(d, tri_dist(vec2<f32>(p.x, fy), vec2<f32>(0.14, 0.04), vec2<f32>(-0.07, 0.21), vec2<f32>(-0.01, 0.04)));
  // caudal fin: a crescent-ish fork
  d = min(d, tri_dist(vec2<f32>(p.x, fy), vec2<f32>(-0.38, 0.0), vec2<f32>(-0.56, 0.13), vec2<f32>(-0.47, 0.0)));
  // dorsal ridge reads as a thin line from above
  d = min(d, seg_dist(p, vec2<f32>(0.05, 0.0), vec2<f32>(-0.1, 0.0)) - 0.012);
  return d;
}

@vertex
fn overlay_vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn overlay_fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let px = in.uv * V.dims.xy;
  var rgb = vec3<f32>(0.0);
  var alpha = 0.0;
  let presence = V.shark2.y;
  if (presence > 0.001) {
    // the shark's image nearest this pixel
    let W = V.dims.zw;
    let q = V.cam.xy + (px - 0.5 * V.dims.xy) * V.cam.z;
    var d = q - (V.shark.xy + V.half.xy);
    d = d - W * round(d / W);
    let r = length(d);
    let R = V.shark2.x;
    let L = V.shark.w;
    let pxW = V.cam.z;                                     // one target pixel in world units
    if (r < max(R, L) * 1.3 + 4.0 * pxW) {
      // shadow: rotate into the shark's frame
      let h = V.shark.z;
      let cs = cos(h);
      let sn = sin(h);
      let local = vec2<f32>(d.x * cs + d.y * sn, -d.x * sn + d.y * cs) / L;
      let sway = sin(V.cam.w * (4.0 + 5.0 * V.shark2.z)) * 0.06;
      let sd = shark_dist(local, sway) * L;
      let blur = max(0.025 * L, 1.5 * pxW);
      let shadow = 1.0 - smoothstep(-blur, blur * 2.5, sd);
      // a wide, faint penumbra (the shark is deeper than the fish)
      let pen = 1.0 - smoothstep(0.0, 0.12 * L, sd);
      alpha = presence * clamp(0.92 * shadow + 0.25 * pen, 0.0, 0.95);
      // the fear radius: a thin ring, brighter while lunging
      let ringW = max(1.2 * pxW, 0.006 * R);
      let ring = exp(-pow((r - R) / ringW, 2.0));
      let inside = (1.0 - smoothstep(R * 0.6, R, r)) * 0.035;
      let g = V.shark2.w * (1.0 + 2.0 * V.shark2.z);
      // a faint cool rim so the silhouette reads over dark water
      let rimW = max(0.012 * L, 1.2 * pxW);
      let rim = exp(-pow((sd - 0.5 * rimW) / rimW, 2.0)) * 0.05;
      rgb = vec3<f32>(0.35, 0.75, 0.9) * presence * (g * (ring + inside) + rim);
    }
  }
  if (V.split.x >= 0.0) {
    let dd = abs(px.x - V.split.x);
    let line = V.split.y * (1.0 - smoothstep(0.5, 1.5, dd));
    rgb = rgb + vec3<f32>(0.9, 0.95, 1.0) * line * 0.6;
  }
  if (alpha <= 0.0 && dot(rgb, rgb) <= 0.0) {
    discard;
  }
  // premultiplied: the shadow darkens what is below, the ring and divider add
  return vec4<f32>(rgb, alpha);
}
