// Graft (M1): lift a disc of cells and set it down elsewhere, at a step
// boundary (never inside a step). `from` is a copy of the source dish's state
// taken just before this pass (the same dish, or another one in the
// Menagerie), so the source and the destination may overlap. Every cell
// within `radius` of the destination centre takes the 16 channels of the cell
// at the same offset from the source centre (zero where that falls outside
// the grid); with `move` set, the rest of the source disc is cleared, as a
// cut would clear it. The offset is a whole number of cells, so the piece
// arrives exactly as it was. On a wrap-around plane (`wrap`, Textures) the
// offsets are taken around the edges and nothing falls outside.

const CN : u32 = 16u;

struct Graft {
  grid : u32,
  move_src : u32,
  radius : f32,
  wrap : u32,
  src : vec2<i32>,
  dst : vec2<i32>,
};

@group(0) @binding(0) var<uniform> G : Graft;
@group(0) @binding(1) var<storage, read> from_state : array<f32>;
@group(0) @binding(2) var<storage, read_write> state : array<f32>;

// the shortest offset around a plane of n cells: each component in [−n/2, n/2)
fn wrap_delta(v : vec2<i32>, n : i32) -> vec2<i32> {
  let h = n / 2;
  return (((v + vec2<i32>(h)) % n) + n) % n - vec2<i32>(h);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let n = i32(G.grid);
  let p = vec2<i32>(gid.xy);
  if (p.x >= n || p.y >= n) { return; }
  let base = (gid.y * G.grid + gid.x) * CN;
  var d = p - G.dst;
  var ds = p - G.src;
  if (G.wrap == 1u) {
    d = wrap_delta(d, n);
    ds = wrap_delta(ds, n);
  }
  if (length(vec2<f32>(d)) <= G.radius) {
    var q = G.src + d;
    if (G.wrap == 1u) {
      q = ((q % n) + n) % n;
    }
    let ok = q.x >= 0 && q.y >= 0 && q.x < n && q.y < n;
    let qb = (u32(max(q.y, 0)) * G.grid + u32(max(q.x, 0))) * CN;
    for (var c : u32 = 0u; c < CN; c = c + 1u) {
      state[base + c] = select(0.0, from_state[qb + c], ok);
    }
    return;
  }
  if (G.move_src == 1u && length(vec2<f32>(ds)) <= G.radius) {
    for (var c : u32 = 0u; c < CN; c = c + 1u) {
      state[base + c] = 0.0;
    }
  }
}
