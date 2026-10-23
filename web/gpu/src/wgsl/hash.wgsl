// bp/hash — counter-based integer hashing (00-foundation.md § 4.2).
// Every random draw in a live shader is hash(seed, step, index): no state,
// no Math.random(), identical on replay. Mirrors @bp/runtime hash.ts.
fn bp_mix32(x0: u32) -> u32 {
  // lowbias32 (Chris Wellons' hash-prospector), full avalanche on u32.
  var x = x0;
  x = x ^ (x >> 16u);
  x = x * 0x7feb352du;
  x = x ^ (x >> 15u);
  x = x * 0x846ca68bu;
  x = x ^ (x >> 16u);
  return x;
}

fn bp_hash3(a: u32, b: u32, c: u32) -> u32 {
  return bp_mix32(a ^ bp_mix32(b ^ bp_mix32(c)));
}

/// Uniform in [0, 1) with 24 bits.
fn bp_unit(h: u32) -> f32 {
  return f32(h >> 8u) * (1.0 / 16777216.0);
}
