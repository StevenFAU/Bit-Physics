// Weight layouts (Teach, M2). The trainer packs W1's columns planar (filter ×
// 16 + channel) and W2 transposed, which its kernels read as vec4s; weights
// files and the gated kernel use the committed layout (nca-layout.json:
// w1.bias @0, w1.weight [128][48] interleaved channel × 3 + filter @128,
// w2.weight [16][128] @6272). The two are permutations of each other, so
// converting is exact. Mirrors neural_ca/gradcheck.py to_trainer / from_trainer.

export const NPARAM = 8320;
const HID = 128;
const CN = 16;

export interface Offsets {
  b1Off: number;
  w1Off: number;
  w2Off: number;
}

/** The committed layout's offsets (packages/neural-ca/web/public/nca-layout.json). */
export const COMMITTED: Offsets = { b1Off: 0, w1Off: 128, w2Off: 6272 };

/** Committed layout → the trainer's vector. */
export function toTrainer(w: Float32Array, o: Offsets = COMMITTED): Float32Array<ArrayBuffer> {
  if (w.length !== NPARAM) throw new Error(`expected ${NPARAM} weights, got ${w.length}`);
  const v = new Float32Array(NPARAM);
  for (let j = 0; j < HID; j += 1) {
    for (let c = 0; c < CN; c += 1) {
      for (let f = 0; f < 3; f += 1) v[j * 48 + f * CN + c] = w[o.w1Off + j * 48 + c * 3 + f]!;
      v[6272 + j * CN + c] = w[o.w2Off + c * HID + j]!;
    }
    v[6144 + j] = w[o.b1Off + j]!;
  }
  return v;
}

/** The trainer's vector → committed layout. */
export function fromTrainer(v: Float32Array, o: Offsets = COMMITTED): Float32Array<ArrayBuffer> {
  if (v.length !== NPARAM) throw new Error(`expected ${NPARAM} weights, got ${v.length}`);
  const w = new Float32Array(NPARAM);
  for (let j = 0; j < HID; j += 1) {
    for (let c = 0; c < CN; c += 1) {
      for (let f = 0; f < 3; f += 1) w[o.w1Off + j * 48 + c * 3 + f] = v[j * 48 + f * CN + c]!;
      w[o.w2Off + c * HID + j] = v[6272 + j * CN + c]!;
    }
    w[o.b1Off + j] = v[6144 + j]!;
  }
  return w;
}
