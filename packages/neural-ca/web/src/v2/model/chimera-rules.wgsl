// Grow — Chimera (M3): passes over the per-cell rule ids (u32 per cell).
// Three entry points with their own bindings (one module, distinct binding
// numbers so no two share an address):
//   graft_rules — a graft carries its cells' rules (graft.wgsl's geometry);
//   paint_rules — set the rule of the cells in a stroke (Seed, Rewrite);
//   view_rules  — the overlay texture (r = runs a rule other than the dish's
//                 own) and the living cells counted per rule (atomics).

const CN : u32 = 16u;
const MAX_SEGS : u32 = 24u;
const MAX_RULES : u32 = 8u;

struct Graft {
  grid : u32,
  move_src : u32,
  radius : f32,
  _p : u32,
  src : vec2<i32>,
  dst : vec2<i32>,
};

@group(0) @binding(0) var<uniform> G : Graft;
@group(0) @binding(1) var<storage, read> from_rules : array<u32>;
@group(0) @binding(2) var<storage, read_write> graft_out : array<u32>;

@compute @workgroup_size(8, 8)
fn graft_rules(@builtin(global_invocation_id) gid : vec3<u32>) {
  let n = i32(G.grid);
  let p = vec2<i32>(gid.xy);
  if (p.x >= n || p.y >= n) { return; }
  if (length(vec2<f32>(p - G.dst)) <= G.radius) {
    let q = p - G.dst + G.src;
    if (q.x >= 0 && q.y >= 0 && q.x < n && q.y < n) {
      graft_out[gid.y * G.grid + gid.x] = from_rules[u32(q.y) * G.grid + u32(q.x)];
    }
  }
}

struct Paint {
  grid : u32,
  count : u32,
  rule : u32,
  radius : f32,    // cells; < 0.5: the cells the points fall in (seeds)
  segs : array<vec4<f32>, 24>,
};

@group(0) @binding(3) var<uniform> B : Paint;
@group(0) @binding(4) var<storage, read_write> paint_out : array<u32>;

fn seg_dist(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>) -> f32 {
  let ab = b - a;
  let l2 = dot(ab, ab);
  var t = 0.0;
  if (l2 > 1e-8) {
    t = clamp(dot(p - a, ab) / l2, 0.0, 1.0);
  }
  return length(p - (a + ab * t));
}

@compute @workgroup_size(8, 8)
fn paint_rules(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= B.grid || gid.y >= B.grid) { return; }
  let p = vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5);
  var hit = false;
  for (var i : u32 = 0u; i < min(B.count, MAX_SEGS); i = i + 1u) {
    let s = B.segs[i];
    if (B.radius < 0.5) {
      hit = hit || (floor(s.x) == f32(gid.x) && floor(s.y) == f32(gid.y));
    } else {
      hit = hit || seg_dist(p, s.xy, s.zw) <= B.radius;
    }
  }
  if (hit) {
    paint_out[gid.y * B.grid + gid.x] = B.rule;
  }
}

struct ViewP {
  grid : u32,
  home : u32,
  _p0 : u32,
  _p1 : u32,
};

@group(0) @binding(5) var<uniform> Q : ViewP;
@group(0) @binding(6) var<storage, read> view_rules_in : array<u32>;
@group(0) @binding(7) var<storage, read> view_state : array<f32>;
@group(0) @binding(8) var view_out : texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(9) var<storage, read_write> counts : array<atomic<u32>, 8>;

@compute @workgroup_size(8, 8)
fn view_rules(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= Q.grid || gid.y >= Q.grid) { return; }
  let i = gid.y * Q.grid + gid.x;
  let r = view_rules_in[i];
  let a = view_state[i * CN + 3u];
  let foreign = select(0.0, 1.0, r != Q.home);
  textureStore(view_out, vec2<i32>(gid.xy), vec4<f32>(foreign, f32(min(r, 7u)) / 7.0, 0.0, 1.0));
  if (a > 0.1) {
    atomicAdd(&counts[min(r, MAX_RULES - 1u)], 1u);
  }
}
