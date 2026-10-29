// Slime Mould live solver (growing colonies): after each step's agents pass,
// record how many agents were awake for that step, so the CPU can follow
// the mass balance exactly while dormant agents wake: each step adds d per
// awake agent. One thread; awake = [count, step, ring of counts…], then for
// territories (bit 7) four per-colony counts and four rings.
#import physarum/live-common

@group(1) @binding(0) var<storage, read_write> awake: array<u32>;

@compute @workgroup_size(1)
fn log_awake() {
  let step = awake[1];
  let slot = step % AWAKE_RING;
  awake[2u + slot] = awake[0];
  if ((P.flags & 128u) != 0u) {
    for (var k = 0u; k < P.species; k = k + 1u) {
      awake[SP_RING + k * AWAKE_RING + slot] = awake[SP_COUNT + k];
    }
  }
  awake[1] = step + 1u;
}
