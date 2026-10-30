// The live dish's kernel: the gated kernel (the committed nca_inference.wgsl,
// proof/gate.ts KERNEL_WGSL) with its two innermost loops written out.
//
// Why: Firefox's WebGPU (wgpu/naga) gives every loop a hidden 64-bit
// iteration counter, so that no shader can loop forever. The driver's
// compiler (Mesa RADV here) then cannot tell how many times the loop runs and
// no longer unrolls it. `perc[j]` and `dx[c]` stay indexes into a register
// array chosen at run time: a chain of compares and selects for every read,
// 48 × 128 times per cell. The gated kernel stepped 10× slower in Firefox 158
// than in Chromium 156 (Dawn/Tint, no counter) on the same RX 6800 XT; with
// these two loops written out the two browsers run level. Measured in
// docs/planning/rebuild-v2/04-neural-ca.md ("Firefox step cost").
//
// The rewrite is exact and mechanical: each loop is matched verbatim and
// replaced by its iterations, in order, with the same expressions; every
// other byte is the gated kernel's. If the gated kernel ever changes so a loop
// no longer matches, this throws and the page refuses to boot, rather than
// run something unmeasured. Bit identity with the gate path is measured, not
// assumed: Prove's "The live dish is the gated kernel" (21 frames, on the
// visitor's GPU) and v2-acceptance.mjs.

/** w1 · perception: 48 terms, summed in order (j = 0 … 47). */
const PERC_LOOP = `    for (var j : u32 = 0u; j < PERC; j = j + 1u) {
      acc = acc + weights[row + j] * perc[j];
    }
`;
const PERC = 48;

/** dx += w2[:, o] · h: one term per channel (c = 0 … 15). */
const DX_LOOP = `      for (var c : u32 = 0u; c < CN; c = c + 1u) {
        dx[c] = dx[c] + weights[P.w2_off + c * HID + o] * h;
      }
`;
const CN = 16;

function writeOut(src: string, loop: string, body: string): string {
  const at = src.indexOf(loop);
  if (at < 0 || src.indexOf(loop, at + 1) >= 0) {
    throw new Error("nca_inference.wgsl changed: the live kernel's loop rewrite no longer matches it exactly once");
  }
  return src.slice(0, at) + body + src.slice(at + loop.length);
}

/** The gated kernel's source with its two inner loops written out (see the header). */
export function liveKernelSource(gated: string): string {
  let perc = "";
  for (let j = 0; j < PERC; j += 1) perc += `    acc = acc + weights[row + ${j}u] * perc[${j}];\n`;
  let dx = "";
  for (let c = 0; c < CN; c += 1) dx += `      dx[${c}] = dx[${c}] + weights[P.w2_off + ${c}u * HID + o] * h;\n`;
  return writeOut(writeOut(gated, PERC_LOOP, perc), DX_LOOP, dx);
}
