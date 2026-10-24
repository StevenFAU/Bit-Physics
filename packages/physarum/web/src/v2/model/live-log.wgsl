// Slime Mould live solver (growing colonies): after each step's agents pass,
// record how many agents were awake for that step, so the CPU can follow
// the mass balance exactly while dormant agents wake: each step adds d per
// awake agent. One thread; awake = [count, step, ring of counts…].
#import physarum/live-common

@group(1) @binding(0) var<storage, read_write> awake: array<u32>;

const RING: u32 = 16384u;

@compute @workgroup_size(1)
fn log_awake() {
  let step = awake[1];
  awake[2u + (step % RING)] = awake[0];
  awake[1] = step + 1u;
}
