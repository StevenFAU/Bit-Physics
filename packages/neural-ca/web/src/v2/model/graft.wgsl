// Graft (M1): lift a disc of cells and set it down elsewhere, at a step
// boundary (never inside a step). `from` is a copy of the source dish's state
// taken just before this pass (the same dish, or another one in the
// Menagerie), so the source and the destination may overlap. Every cell
// within `radius` of the destination centre takes the 16 channels of the cell
// at the same offset from the source centre (zero where that falls outside
// the grid); with `move` set, the rest of the source disc is cleared, as a
// cut would clear it. The offset is a whole number of cells, so the piece
// arrives exactly as it was.

const CN : u32 = 16u;

struct Graft {
  grid : u32,
  move_src : u32,
  radius : f32,
  _p : u32,
  src : vec2<i32>,
  dst : vec2<i32>,
};

@group(0) @binding(0) var<uniform> G : Graft;
@group(0) @binding(1) var<storage, read> from_state : array<f32>;
@group(0) @binding(2) var<storage, read_write> state : array<f32>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let n = i32(G.grid);
  let p = vec2<i32>(gid.xy);
  if (p.x >= n || p.y >= n) { return; }
  let base = (gid.y * G.grid + gid.x) * CN;
  let to_dst = vec2<f32>(p - G.dst);
  if (length(to_dst) <= G.radius) {
    let q = p - G.dst + G.src;
    let ok = q.x >= 0 && q.y >= 0 && q.x < n && q.y < n;
    let qb = (u32(max(q.y, 0)) * G.grid + u32(max(q.x, 0))) * CN;
    for (var c : u32 = 0u; c < CN; c = c + 1u) {
      state[base + c] = select(0.0, from_state[qb + c], ok);
    }
    return;
  }
  if (G.move_src == 1u && length(vec2<f32>(p - G.src)) <= G.radius) {
    for (var c : u32 = 0u; c < CN; c = c + 1u) {
      state[base + c] = 0.0;
    }
  }
}
