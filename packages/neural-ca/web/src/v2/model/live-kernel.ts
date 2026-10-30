// The live dish, Chimera and Textures kernels with their two innermost
// loops written out. The live dish starts from the committed gated kernel
// (nca_inference.wgsl, proof/gate.ts KERNEL_WGSL); the scenes use their own WGSL.
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
// other byte is the source kernel's. If a source kernel ever changes so a loop
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

function writeOut(src: string, loop: string, body: string, kernel: string): string {
  const at = src.indexOf(loop);
  if (at < 0 || src.indexOf(loop, at + 1) >= 0) {
    throw new Error(`${kernel} changed: the live kernel's loop rewrite no longer matches it exactly once`);
  }
  return src.slice(0, at) + body + src.slice(at + loop.length);
}

/** Preserve each scalar operation and its order, including the rule's weight offset. */
function kernelSource(src: string, kernel: string, channels: number, bound: "CN" | "CH", offset: string): string {
  const dxLoop = `      for (var c : u32 = 0u; c < ${bound}; c = c + 1u) {
        dx[c] = dx[c] + weights[${offset}P.w2_off + c * HID + o] * h;
      }
`;
  let perc = "";
  for (let j = 0; j < PERC; j += 1) perc += `    acc = acc + weights[row + ${j}u] * perc[${j}];\n`;
  let dx = "";
  for (let c = 0; c < channels; c += 1) dx += `      dx[${c}] = dx[${c}] + weights[${offset}P.w2_off + ${c}u * HID + o] * h;\n`;
  return writeOut(writeOut(src, PERC_LOOP, perc, kernel), dxLoop, dx, kernel);
}

/** The gated kernel's source with its two inner loops written out (see the header). */
export function liveKernelSource(gated: string): string {
  return kernelSource(gated, "nca_inference.wgsl", 16, "CN", "");
}

/** Chimera keeps its per-cell rule's weight-bank offset in all 16 output terms. */
export function chimeraKernelSource(src: string): string {
  return kernelSource(src, "chimera.wgsl", 16, "CN", "wb + ");
}

/** Textures has 12 output channels; its perception still has 48 terms. */
export function textureKernelSource(src: string): string {
  return kernelSource(src, "texture.wgsl", 12, "CH", "");
}
