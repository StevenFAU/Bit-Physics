// Swarm's far level of detail (ocean.wgsl § field): when a fish is smaller
// than a pixel, every fish adds its colour — silver, or its heading on the
// cyclic OKLab circle — into a screen-space grid of `lod.w`-px cells, as
// fixed-point u32 (units of 1/1024) with atomics. ocean.wgsl's field_fs
// spreads each cell's light over its pixels. The View struct is ocean.wgsl's,
// verbatim (test/render-lod.test.ts checks).

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

struct Boid { pos: vec2<f32>, vel: vec2<f32>, align: f32, dens: f32 };

@group(0) @binding(0) var<uniform> V: View;
@group(1) @binding(0) var<storage, read> boids: array<Boid>;
@group(2) @binding(0) var<storage, read_write> grid: array<atomic<u32>>;

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

fn heading_colour(dir: vec2<f32>) -> vec3<f32> {
  let c = 0.11;
  return max(oklab_to_linear(vec3<f32>(0.80, c * dir.x, c * dir.y)), vec3<f32>(0.0));
}

@compute @workgroup_size(256)
fn field_splat(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  let n = arrayLength(&boids);
  if (i >= n) {
    return;
  }
  let b = boids[i];
  // Food Chain's empty slots carry dens < 0
  if (b.dens < 0.0) {
    return;
  }
  let W = V.dims.zw;
  var d = b.pos + V.half.xy - V.cam.xy;
  d = d - W * round(d / W);
  let sp = length(b.vel);
  let dir = select(vec2<f32>(1.0, 0.0), b.vel / max(sp, 1e-12), sp > 1e-12);
  var col = V.silver.rgb;
  if (V.fish.w > 1.5) {
    col = V.species[min(u32(max(b.align, 0.0)), 5u)].rgb;
  } else if (V.fish.w > 0.5) {
    col = heading_colour(dir);
  }
  let q = vec3<u32>(round(col * 1024.0));
  let gw = u32(V.grid.x);
  let gh = u32(V.grid.y);
  let C = V.lod.w;
  let nx = u32(V.half.z);
  let ny = u32(V.half.w);
  for (var img = 0u; img < nx * ny; img = img + 1u) {
    let ox = f32(img % nx) - f32(nx / 2u);
    let oy = f32(img / nx) - f32(ny / 2u);
    let px = (d + vec2<f32>(ox, oy) * W) / V.cam.z + 0.5 * V.dims.xy;
    if (px.x < 0.0 || px.y < 0.0 || px.x >= V.dims.x || px.y >= V.dims.y) {
      continue;
    }
    let cx = min(u32(px.x / C), gw - 1u);
    let cy = min(u32(px.y / C), gh - 1u);
    let k = (cy * gw + cx) * 3u;
    atomicAdd(&grid[k], q.x);
    atomicAdd(&grid[k + 1u], q.y);
    atomicAdd(&grid[k + 2u], q.z);
  }
}
