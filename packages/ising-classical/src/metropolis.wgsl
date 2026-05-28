// 2D Ising-classical — parallel-Metropolis compute shader (Stack B / WebGPU).
//
// Spec docs/sim-specs/lattice-spin/ising-classical/spec-ref.md section 3.
//
// Checkerboard (red/black) sublattice Metropolis update. Each dispatch
// updates a single colour (params.color in {0u, 1u}); the host issues two
// dispatches per Monte-Carlo step (white, then black) so the black sweep
// observes the just-updated white spins. Because no two same-colour sites
// are nearest neighbours on a bipartite square lattice, the within-colour
// update is embarrassingly parallel and preserves detailed balance.
//
// PCG per-cell PRNG: each cell hashes (cell_index, seed, step, colour) into
// an independent uniform draw — NO atomic operations, NO subgroup
// operations, so the kernel preserves the bit-exact-same-hw determinism
// declaration (registry.toml [lattice-spin.ising-classical]).
//
// Local-only (spec section 7.8): CI runners have no GPU; the NumPy
// reference is the CI-visible oracle.

struct Params {
  n: u32,
  step: u32,
  color: u32,
  seed: u32,
  J: f32,
  h: f32,
  T: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> spins: array<i32>;

fn wrap(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

fn spin_at(i: i32, j: i32) -> i32 {
  let n = i32(params.n);
  let idx = u32(wrap(j, n)) * params.n + u32(wrap(i, n));
  return spins[idx];
}

// PCG32 hash → uniform f32 in [0, 1). Deterministic per (cell, seed, step,
// colour); no global RNG state, no atomics.
fn pcg_hash(input: u32) -> u32 {
  let state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn uniform01(i: u32, j: u32) -> f32 {
  let key = (j * params.n + i) ^ (params.seed * 2654435761u)
          ^ (params.step * 40503u) ^ (params.color * 19349663u);
  let h = pcg_hash(key);
  return f32(h) * (1.0 / 4294967296.0);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  // Only update the active colour (checkerboard parity).
  if (((gid.x + gid.y) & 1u) != params.color) { return; }

  let i = i32(gid.x);
  let j = i32(gid.y);
  let s = f32(spin_at(i, j));

  let neighbour_sum = f32(
      spin_at(i - 1, j) + spin_at(i + 1, j)
    + spin_at(i, j - 1) + spin_at(i, j + 1));

  // dE if this spin flips; accept with min(1, exp(-dE / T)).
  let delta_e = 2.0 * s * (params.J * neighbour_sum + params.h);
  let accept_prob = exp(-delta_e / params.T);
  if (uniform01(gid.x, gid.y) < accept_prob) {
    let idx = gid.y * params.n + gid.x;
    spins[idx] = -spins[idx];
  }
}
