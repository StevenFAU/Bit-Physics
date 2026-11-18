// svdcheck.wgsl — runs the prelude's svd3 (packages/mpm-multimaterial/src/mpm_prelude.wgsl,
// concatenated first) on a batch of F so the page can check U·Σ·Vᵀ = F in f64.
// The only check that pins an SVD (the v1 Givens-sign lesson).

@group(0) @binding(0) var<storage, read> fin: array<f32>;
@group(0) @binding(1) var<storage, read_write> fout: array<f32>;

@compute @workgroup_size(64)
fn svd_check(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i * 9u >= arrayLength(&fin)) {
    return;
  }
  let o = i * 9u;
  // row-major in
  let f = mat3x3f(
    vec3f(fin[o + 0u], fin[o + 3u], fin[o + 6u]),
    vec3f(fin[o + 1u], fin[o + 4u], fin[o + 7u]),
    vec3f(fin[o + 2u], fin[o + 5u], fin[o + 8u]),
  );
  let s = svd3(f);
  let q = i * 21u;
  for (var r = 0u; r < 3u; r++) {
    for (var c = 0u; c < 3u; c++) {
      fout[q + r * 3u + c] = s.u[c][r];
      fout[q + 12u + r * 3u + c] = s.v[c][r];
    }
  }
  fout[q + 9u] = s.sigma.x;
  fout[q + 10u] = s.sigma.y;
  fout[q + 11u] = s.sigma.z;
}
