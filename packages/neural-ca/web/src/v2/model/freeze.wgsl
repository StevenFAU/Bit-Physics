// Freeze (M1): cells in the frozen region keep their state through a step.
// Encoded right after the gated kernel's mask pass, it copies the step's
// input back over its output wherever the mask is set — the kernel itself is
// not touched, and with nothing frozen this pass is not encoded at all, so an
// unfrozen dish runs the gated kernel's exact bytes. A frozen cell still
// shows its state to its neighbours (they keep sensing it); it just never
// changes, which is what makes growth's locality visible.

const CN : u32 = 16u;

struct Freeze {
  grid : u32,
  _p0 : u32,
  _p1 : u32,
  _p2 : u32,
};

@group(0) @binding(0) var<uniform> P : Freeze;
@group(0) @binding(1) var<storage, read> cur : array<f32>;
@group(0) @binding(2) var<storage, read> frozen : array<u32>;
@group(0) @binding(3) var<storage, read_write> nxt : array<f32>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= P.grid || gid.y >= P.grid) { return; }
  let i = gid.y * P.grid + gid.x;
  if (frozen[i] == 0u) { return; }
  let base = i * CN;
  for (var c : u32 = 0u; c < CN; c = c + 1u) {
    nxt[base + c] = cur[base + c];
  }
}
