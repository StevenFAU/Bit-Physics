// WGSL for Teach (rebuild-v2 04-neural-ca.md, M2): the NCA forward pass,
// backpropagation through time and Adam, all on the visitor's GPU.
//
// Ported from the M0 training spike (packages/neural-ca/train-spike/src/
// kernels.ts), whose numbers the spec's status note cites: same kernels, same
// arithmetic, without the spike's timing-only "dense" mode. This is NOT the
// gated kernel: the gated surface is packages/neural-ca/typescript/src/
// nca_inference.wgsl, which the live dish runs and this file never touches.
// A trained model leaves here as weights only, converted to the committed
// layout (teach/layout.ts), and grows in the dish through the gated kernel.
//
// Model (Mordvintsev et al. 2020): 16 channels; perception = identity +
// Sobel-x + Sobel-y per channel (48); dense 48 -> 128 (ReLU) -> 16; fire rate
// 0.5 from a counter hash; alive = 3x3 max-pool(alpha) > 0.1 before AND after
// the update.
//
// Layouts
//   state  : cell-major, 4 vec4 per cell, cell n = (b*G + y)*G + x
//   params : 8320 f32 = 2080 vec4 — W1 [128][12 vec4] (columns planar:
//            id c0..15 | sobel-x c0..15 | sobel-y c0..15), b1 [32 vec4],
//            W2^T [128][4 vec4]
//   scratch: per active cell 80 vec4 — gz[32] | h[32] | p[12] | gdx[4]
//   Iter.mode: bit 0 = pool draw (reset the worst sample, record pool
//              losses); bit 2 = damage (bits 8..15: how many samples).
//
// No binding exceeds the default WebGPU limits (128 MiB per binding, 16 KiB
// workgroup storage, 8 storage buffers per stage); the per-step state
// checkpoints are packed into a few large buffers and bound by range
// (teach/trainer.ts).

export const W1_OFF = 0; // vec4 index
export const B1_OFF = 1536;
export const W2_OFF = 1568;
export const NPARAM = 8320;
export const SCRATCH_VEC4 = 80;
export const GEMM_CHUNK = 256; // cells per weight-gradient workgroup
const GEMM_CH = 10; // cells staged in workgroup memory at once (10 * 1280 B)

const PRELUDE = /* wgsl */ `
#import bp/hash
struct Iter {
  G : u32, B : u32, seed : u32, N : u32,
  lossScale : f32, fireThresh : u32, mode : u32, nPool : u32,
};
struct Step { t : u32, aliveSlot : u32, p0 : u32, p1 : u32 };
@group(0) @binding(0) var<uniform> IT : Iter;
@group(0) @binding(1) var<uniform> ST : Step;
fn cellIndex(b : u32, x : u32, y : u32) -> u32 { return (b * IT.G + y) * IT.G + x; }
fn fires(n : u32) -> bool { return (bp_hash3(IT.seed, ST.t, n) >> 8u) < IT.fireThresh; }
`;

// Perception coefficients (rows dy = -1..1, cols dx = -1..1), F.conv2d is a
// cross-correlation: p(y, x) = sum K[dy][dx] * s(y + dy, x + dx).
const KX = [
  [-0.125, 0, 0.125],
  [-0.25, 0, 0.25],
  [-0.125, 0, 0.125],
];
const KY = [
  [-0.125, -0.25, -0.125],
  [0, 0, 0],
  [0.125, 0.25, 0.125],
];

const lit = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

/** 12 vec4 locals id0..3, sx0..3, sy0..3 = perception of cell (b, x, y) from `buf`. */
function perceive(buf: string): string {
  const lines: string[] = [];
  for (const k of ["id", "sx", "sy"]) for (let q = 0; q < 4; q += 1) lines.push(`var ${k}${q} = vec4<f32>(0.0);`);
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const kx = KX[dy + 1]![dx + 1]!;
      const ky = KY[dy + 1]![dx + 1]!;
      const center = dx === 0 && dy === 0;
      if (!center && kx === 0 && ky === 0) continue;
      lines.push(`{ let xx = i32(x) + (${dx}); let yy = i32(y) + (${dy});`);
      lines.push(`  if (xx >= 0 && yy >= 0 && xx < i32(IT.G) && yy < i32(IT.G)) {`);
      lines.push(`    let m = cellIndex(b, u32(xx), u32(yy)) * 4u;`);
      for (let q = 0; q < 4; q += 1) {
        lines.push(`    { let v = ${buf}[m + ${q}u];`);
        if (center) lines.push(`      id${q} = v;`);
        if (kx !== 0) lines.push(`      sx${q} = sx${q} + v * ${lit(kx)};`);
        if (ky !== 0) lines.push(`      sy${q} = sy${q} + v * ${lit(ky)};`);
        lines.push(`    }`);
      }
      lines.push(`  } }`);
    }
  }
  return lines.join("\n");
}

const P12 = ["id0", "id1", "id2", "id3", "sx0", "sx1", "sx2", "sx3", "sy0", "sy1", "sy2", "sy3"];

/** z = b1[j] + W1[j] . p  (expects `j`, `r = j*12u` in scope). */
function preact(): string {
  const dots = P12.map((p, k) => `dot(W[r + ${k}u], ${p})`).join(" + ");
  return `var z = W[${B1_OFF}u + (j >> 2u)][j & 3u];\n z = z + ${dots};`;
}

function alphaMax(buf: string, radius: number): string {
  return /* wgsl */ `
fn amax_${buf}(b : u32, x : i32, y : i32) -> f32 {
  var m = 0.0;
  for (var dy = -${radius}; dy <= ${radius}; dy = dy + 1) {
    for (var dx = -${radius}; dx <= ${radius}; dx = dx + 1) {
      let xx = x + dx; let yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < i32(IT.G) && yy < i32(IT.G)) {
        m = max(m, ${buf}[cellIndex(b, u32(xx), u32(yy)) * 4u].w);
      }
    }
  }
  return m;
}`;
}

// ---------------------------------------------------------------- forward

/** x_mid = x + dx * fire, computed only where it can matter (alpha > 0.1
 * within 5x5: such a cell is, or neighbours, a pre-alive cell). Exact. */
export const FWD_MLP = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<uniform> W : array<vec4<f32>, 2080>;
@group(0) @binding(3) var<storage, read> xin : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> xmid : array<vec4<f32>>;
${alphaMax("xin", 2)}
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x; let y = gid.y; let b = gid.z;
  if (x >= IT.G || y >= IT.G || b >= IT.B) { return; }
  let n = cellIndex(b, x, y);
  let base = n * 4u;
  var s0 = xin[base]; var s1 = xin[base + 1u]; var s2 = xin[base + 2u]; var s3 = xin[base + 3u];
  if (fires(n) && amax_xin(b, i32(x), i32(y)) > 0.1) {
    ${perceive("xin")}
    var d0 = vec4<f32>(0.0); var d1 = vec4<f32>(0.0); var d2 = vec4<f32>(0.0); var d3 = vec4<f32>(0.0);
    for (var j = 0u; j < 128u; j = j + 1u) {
      let r = j * 12u;
      ${preact()}
      let h = max(z, 0.0);
      let w = ${W2_OFF}u + j * 4u;
      d0 = d0 + W[w] * h; d1 = d1 + W[w + 1u] * h; d2 = d2 + W[w + 2u] * h; d3 = d3 + W[w + 3u] * h;
    }
    s0 = s0 + d0; s1 = s1 + d1; s2 = s2 + d2; s3 = s3 + d3;
  }
  xmid[base] = s0; xmid[base + 1u] = s1; xmid[base + 2u] = s2; xmid[base + 3u] = s3;
}`;

/** x_{t+1} = x_mid * (pre_alive(x_t) & post_alive(x_mid)); records the mask. */
export const FWD_MASK = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<storage, read> xin : array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> xmid : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> xout : array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> alive : array<u32>;
${alphaMax("xin", 1)}
${alphaMax("xmid", 1)}
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x; let y = gid.y; let b = gid.z;
  if (x >= IT.G || y >= IT.G || b >= IT.B) { return; }
  let n = cellIndex(b, x, y);
  let a = amax_xin(b, i32(x), i32(y)) > 0.1 && amax_xmid(b, i32(x), i32(y)) > 0.1;
  alive[ST.aliveSlot * IT.N + n] = select(0u, 1u, a);
  let base = n * 4u;
  let k = select(0.0, 1.0, a);
  xout[base] = xmid[base] * k; xout[base + 1u] = xmid[base + 1u] * k;
  xout[base + 2u] = xmid[base + 2u] * k; xout[base + 3u] = xmid[base + 3u] * k;
}`;

// ------------------------------------------------------------------- loss

/** dL/dx_T for L = mean((x_T[:4] - target)^2); per-workgroup squared-error sums. */
export const LOSS = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<storage, read> xT : array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> tgt : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> g : array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> part : array<f32>;
var<workgroup> red : array<f32, 64>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>, @builtin(local_invocation_index) li : u32,
        @builtin(workgroup_id) wid : vec3<u32>) {
  let x = gid.x; let y = gid.y; let b = gid.z;
  var e = 0.0;
  if (x < IT.G && y < IT.G) {
    let n = cellIndex(b, x, y);
    let d = xT[n * 4u] - tgt[y * IT.G + x];
    e = dot(d, d);
    g[n * 4u] = d * IT.lossScale;
    g[n * 4u + 1u] = vec4<f32>(0.0); g[n * 4u + 2u] = vec4<f32>(0.0); g[n * 4u + 3u] = vec4<f32>(0.0);
  }
  red[li] = e;
  workgroupBarrier();
  for (var s = 32u; s > 0u; s = s >> 1u) {
    if (li < s) { red[li] = red[li] + red[li + s]; }
    workgroupBarrier();
  }
  let wpd = (IT.G + 7u) / 8u;
  if (li == 0u) { part[(b * wpd + wid.y) * wpd + wid.x] = red[0]; }
}`;

/** Per-sample losses (+ their mean in slot B); in pool mode also stores them
 * in poolLoss[idx[b]] for the next draw's worst-sample reset. */
export const LOSS_REDUCE = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<storage, read> part : array<f32>;
@group(0) @binding(3) var<storage, read_write> lossOut : array<f32>;
@group(0) @binding(4) var<storage, read> idx : array<u32>;
@group(0) @binding(5) var<storage, read_write> poolLoss : array<f32>;
@compute @workgroup_size(1)
fn main() {
  let wpd = (IT.G + 7u) / 8u;
  let per = wpd * wpd;
  var total = 0.0;
  for (var b = 0u; b < IT.B; b = b + 1u) {
    var s = 0.0;
    for (var i = 0u; i < per; i = i + 1u) { s = s + part[b * per + i]; }
    let l = s / f32(4u * IT.G * IT.G);
    lossOut[b] = l;
    total = total + l;
    if ((IT.mode & 1u) == 1u) { poolLoss[idx[b]] = l; }
  }
  lossOut[IT.B] = total / f32(IT.B);
}`;

// --------------------------------------------------------------- backward

/** Per active cell (alive & fired): recompute z, backprop the MLP, write
 * dL/dp (perception) and the vectors the weight-gradient pass needs. */
export const BWD_MLP = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<uniform> W : array<vec4<f32>, 2080>;
@group(0) @binding(3) var<storage, read> xin : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> gnext : array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> alive : array<u32>;
@group(0) @binding(6) var<storage, read_write> scratch : array<vec4<f32>>;
@group(0) @binding(7) var<storage, read_write> gp : array<vec4<f32>>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x; let y = gid.y; let b = gid.z;
  if (x >= IT.G || y >= IT.G || b >= IT.B) { return; }
  let n = cellIndex(b, x, y);
  let gpb = n * 12u;
  if (alive[ST.aliveSlot * IT.N + n] == 0u || !fires(n)) {
    for (var k = 0u; k < 12u; k = k + 1u) { gp[gpb + k] = vec4<f32>(0.0); }
    return;
  }
  let base = n * 4u;
  let g0 = gnext[base]; let g1 = gnext[base + 1u]; let g2 = gnext[base + 2u]; let g3 = gnext[base + 3u];
  ${perceive("xin")}
  ${P12.map((_, k) => `var q${k} = vec4<f32>(0.0);`).join(" ")}
  let sb = n * ${SCRATCH_VEC4}u;
  for (var jb = 0u; jb < 32u; jb = jb + 1u) {
    var gzv = vec4<f32>(0.0); var hv = vec4<f32>(0.0);
    ${["x", "y", "z", "w"]
      .map(
        (c, jj) => `{
      let j = jb * 4u + ${jj}u;
      let r = j * 12u;
      ${preact()}
      let w = ${W2_OFF}u + j * 4u;
      let gh = dot(W[w], g0) + dot(W[w + 1u], g1) + dot(W[w + 2u], g2) + dot(W[w + 3u], g3);
      let gz = select(0.0, gh, z > 0.0);
      ${P12.map((_, k) => `q${k} = q${k} + W[r + ${k}u] * gz;`).join(" ")}
      gzv.${c} = gz; hv.${c} = max(z, 0.0);
    }`,
      )
      .join("\n")}
    scratch[sb + jb] = gzv;
    scratch[sb + 32u + jb] = hv;
  }
  ${P12.map((p, k) => `scratch[sb + ${64 + k}u] = ${p};`).join(" ")}
  scratch[sb + 76u] = g0; scratch[sb + 77u] = g1; scratch[sb + 78u] = g2; scratch[sb + 79u] = g3;
  ${P12.map((_, k) => `gp[gpb + ${k}u] = q${k};`).join(" ")}
}`;

/** dL/dx_t = alive * dL/dx_{t+1} + perception^T (dL/dp). */
export const BWD_GATHER = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<storage, read> gnext : array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> alive : array<u32>;
@group(0) @binding(4) var<storage, read> gp : array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> gout : array<vec4<f32>>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x; let y = gid.y; let b = gid.z;
  if (x >= IT.G || y >= IT.G || b >= IT.B) { return; }
  let n = cellIndex(b, x, y);
  let base = n * 4u;
  let a = select(0.0, 1.0, alive[ST.aliveSlot * IT.N + n] != 0u);
  var o0 = gnext[base] * a; var o1 = gnext[base + 1u] * a; var o2 = gnext[base + 2u] * a; var o3 = gnext[base + 3u] * a;
  ${(() => {
    const out: string[] = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const kx = KX[dy + 1]![dx + 1]!;
        const ky = KY[dy + 1]![dx + 1]!;
        const center = dx === 0 && dy === 0;
        if (!center && kx === 0 && ky === 0) continue;
        // contribution of perception at i = j - d
        out.push(`{ let xx = i32(x) - (${dx}); let yy = i32(y) - (${dy});`);
        out.push(`  if (xx >= 0 && yy >= 0 && xx < i32(IT.G) && yy < i32(IT.G)) {`);
        out.push(`    let m = cellIndex(b, u32(xx), u32(yy)) * 12u;`);
        for (let q = 0; q < 4; q += 1) {
          const terms: string[] = [];
          if (center) terms.push(`gp[m + ${q}u]`);
          if (kx !== 0) terms.push(`gp[m + ${4 + q}u] * ${lit(kx)}`);
          if (ky !== 0) terms.push(`gp[m + ${8 + q}u] * ${lit(ky)}`);
          out.push(`    o${q} = o${q} + ${terms.join(" + ")};`);
        }
        out.push(`  } }`);
      }
    }
    return out.join("\n");
  })()}
  gout[base] = o0; gout[base + 1u] = o1; gout[base + 2u] = o2; gout[base + 3u] = o3;
}`;

/** Weight gradients, split-K over cells: workgroup w owns cells
 * [w*256, w*256+256), compacts the active ones (deterministic scan), and
 * accumulates sum gz (x) p, gz, gdx (x) h into its own partial slot. */
export const BWD_GEMM = /* wgsl */ `${PRELUDE}
const CH : u32 = ${GEMM_CH}u;
@group(0) @binding(2) var<storage, read> alive : array<u32>;
@group(0) @binding(3) var<storage, read> scratch : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> partial : array<vec4<f32>>;
var<workgroup> sh : array<vec4<f32>, ${GEMM_CH * SCRATCH_VEC4}>;
var<workgroup> scan : array<u32, 256>;
var<workgroup> list : array<u32, 256>;
var<workgroup> total : u32;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) tid : u32, @builtin(workgroup_id) wid : vec3<u32>) {
  let w = wid.x;
  let cell = w * ${GEMM_CHUNK}u + tid;
  var flag = 0u;
  if (cell < IT.N) {
    if (alive[ST.aliveSlot * IT.N + cell] != 0u) {
      if (fires(cell)) { flag = 1u; }
    }
  }
  scan[tid] = flag;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off = off << 1u) {
    var v = scan[tid];
    if (tid >= off) { v = v + scan[tid - off]; }
    workgroupBarrier();
    scan[tid] = v;
    workgroupBarrier();
  }
  if (flag == 1u) { list[scan[tid] - 1u] = cell; }
  if (tid == 255u) { total = scan[255]; }
  let cnt = workgroupUniformLoad(&total);

  let r0 = (tid >> 2u) * 2u;   // W1 rows r0, r0+1  (= W2^T rows)
  let cq = tid & 3u;           // W1 vec4 columns 3cq..3cq+2; W2^T vec4 column cq
  let hi = (r0 & 3u) != 0u;
  var a00 = vec4<f32>(0.0); var a01 = vec4<f32>(0.0); var a02 = vec4<f32>(0.0);
  var a10 = vec4<f32>(0.0); var a11 = vec4<f32>(0.0); var a12 = vec4<f32>(0.0);
  var c0 = vec4<f32>(0.0); var c1 = vec4<f32>(0.0);
  var bias = vec4<f32>(0.0);
  for (var base = 0u; base < cnt; base = base + CH) {
    let m = min(CH, cnt - base);
    workgroupBarrier();
    for (var i = tid; i < m * ${SCRATCH_VEC4}u; i = i + 256u) {
      let c = i / ${SCRATCH_VEC4}u;
      sh[i] = scratch[list[base + c] * ${SCRATCH_VEC4}u + (i - c * ${SCRATCH_VEC4}u)];
    }
    workgroupBarrier();
    for (var c = 0u; c < m; c = c + 1u) {
      let o = c * ${SCRATCH_VEC4}u;
      let gzq = sh[o + (r0 >> 2u)];
      let hq = sh[o + 32u + (r0 >> 2u)];
      var gz0 = gzq.x; var gz1 = gzq.y; var h0 = hq.x; var h1 = hq.y;
      if (hi) { gz0 = gzq.z; gz1 = gzq.w; h0 = hq.z; h1 = hq.w; }
      let p0 = sh[o + 64u + cq * 3u]; let p1 = sh[o + 65u + cq * 3u]; let p2 = sh[o + 66u + cq * 3u];
      a00 = a00 + p0 * gz0; a01 = a01 + p1 * gz0; a02 = a02 + p2 * gz0;
      a10 = a10 + p0 * gz1; a11 = a11 + p1 * gz1; a12 = a12 + p2 * gz1;
      let gd = sh[o + 76u + cq];
      c0 = c0 + gd * h0; c1 = c1 + gd * h1;
      bias = bias + gzq;
    }
  }
  let pw = w * 2080u;
  let ra = pw + r0 * 12u + cq * 3u;
  let rb = ra + 12u;
  partial[ra] = partial[ra] + a00; partial[ra + 1u] = partial[ra + 1u] + a01; partial[ra + 2u] = partial[ra + 2u] + a02;
  partial[rb] = partial[rb] + a10; partial[rb + 1u] = partial[rb + 1u] + a11; partial[rb + 2u] = partial[rb + 2u] + a12;
  let wa = pw + ${W2_OFF}u + r0 * 4u + cq;
  partial[wa] = partial[wa] + c0;
  partial[wa + 4u] = partial[wa + 4u] + c1;
  if ((tid & 7u) == 0u) {
    let bo = pw + ${B1_OFF}u + (r0 >> 2u);
    partial[bo] = partial[bo] + bias;
  }
}`;

// -------------------------------------------------------------- optimiser

/** grad[k] = sum over weight-gradient workgroups of partial[w][k]. */
export const GRAD_REDUCE = /* wgsl */ `
struct R { slots : u32, p0 : u32, p1 : u32, p2 : u32 };
@group(0) @binding(0) var<uniform> RP : R;
@group(0) @binding(1) var<storage, read> partial : array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> grad : array<vec4<f32>>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let k = gid.x;
  if (k >= 2080u) { return; }
  var s = vec4<f32>(0.0);
  for (var w = 0u; w < RP.slots; w = w + 1u) { s = s + partial[w * 2080u + k]; }
  grad[k] = s;
}`;

/** Per-tensor gradient normalisation (g / (|g| + 1e-8), Distill) then Adam. */
export const ADAM = /* wgsl */ `
struct A { lr : f32, b1 : f32, b2 : f32, eps : f32, bc1 : f32, bc2 : f32, normalize : u32, p0 : u32 };
@group(0) @binding(0) var<uniform> AP : A;
@group(0) @binding(1) var<storage, read> grad : array<f32>;
@group(0) @binding(2) var<storage, read_write> theta : array<f32>;
@group(0) @binding(3) var<storage, read_write> mom : array<f32>;
@group(0) @binding(4) var<storage, read_write> vel : array<f32>;
var<workgroup> red : array<vec4<f32>, 256>;
fn seg(k : u32) -> u32 { return select(select(2u, 1u, k < 6272u), 0u, k < 6144u); }
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) tid : u32) {
  var acc = vec4<f32>(0.0);
  for (var k = tid; k < ${NPARAM}u; k = k + 256u) {
    let g = grad[k];
    let s = seg(k);
    if (s == 0u) { acc.x = acc.x + g * g; } else if (s == 1u) { acc.y = acc.y + g * g; } else { acc.z = acc.z + g * g; }
  }
  red[tid] = acc;
  workgroupBarrier();
  for (var st = 128u; st > 0u; st = st >> 1u) {
    if (tid < st) { red[tid] = red[tid] + red[tid + st]; }
    workgroupBarrier();
  }
  let nrm = sqrt(red[0].xyz) + vec3<f32>(1e-8);
  for (var k = tid; k < ${NPARAM}u; k = k + 256u) {
    var g = grad[k];
    if (AP.normalize == 1u) { g = g / nrm[seg(k)]; }
    let m = AP.b1 * mom[k] + (1.0 - AP.b1) * g;
    let v = AP.b2 * vel[k] + (1.0 - AP.b2) * g * g;
    mom[k] = m; vel[k] = v;
    theta[k] = theta[k] - AP.lr * (m / AP.bc1) / (sqrt(v / AP.bc2) + AP.eps);
  }
}`;

// ------------------------------------------------------------------- pool

/** Seed state: every sample (mode 0), or only the batch's worst pool sample
 * (mode 1: highest poolLoss[idx[b]], first on ties). */
export const SEED_FILL = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<storage, read> idx : array<u32>;
@group(0) @binding(3) var<storage, read> poolLoss : array<f32>;
@group(0) @binding(4) var<storage, read_write> x0 : array<vec4<f32>>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x; let y = gid.y; let b = gid.z;
  if (x >= IT.G || y >= IT.G || b >= IT.B) { return; }
  if ((IT.mode & 1u) == 1u) {
    var worst = 0u; var wl = poolLoss[idx[0]];
    for (var i = 1u; i < IT.B; i = i + 1u) { let l = poolLoss[idx[i]]; if (l > wl) { wl = l; worst = i; } }
    if (b != worst) { return; }
  }
  let n = cellIndex(b, x, y) * 4u;
  let mid = IT.G / 2u;
  let s = select(0.0, 1.0, x == mid && y == mid);
  x0[n] = vec4<f32>(0.0, 0.0, 0.0, s);
  x0[n + 1u] = vec4<f32>(s); x0[n + 2u] = vec4<f32>(s); x0[n + 3u] = vec4<f32>(s);
}`;

// ----------------------------------------------------------------- damage
// Added for the Menagerie (rebuild-v2 M1): the Distill "Regenerating"
// experiment. Iter.mode bit 2 turns it on; bits 8..15 hold how many samples
// to damage. Before the rollout the batch's current losses are written to
// poolLoss (a loss + lossReduce pass on states[0]), SEED_FILL resets the
// worst sample to the seed, and this kernel cuts a random disc out of the
// `n` samples with the lowest loss (the reset one excluded): centre in the
// middle half of the grid, radius 0.05–0.2 of the grid (Distill's
// make_circle_masks, r ∈ [0.1, 0.4] of the half-width). Circles are drawn
// from the iteration seed, so a run is reproducible.

export const DAMAGE = /* wgsl */ `${PRELUDE}
@group(0) @binding(2) var<storage, read> idx : array<u32>;
@group(0) @binding(3) var<storage, read> poolLoss : array<f32>;
@group(0) @binding(4) var<storage, read_write> x0 : array<vec4<f32>>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x; let y = gid.y; let b = gid.z;
  if (x >= IT.G || y >= IT.G || b >= IT.B) { return; }
  let nd = (IT.mode >> 8u) & 255u;
  var worst = 0u; var wl = poolLoss[idx[0]];
  for (var i = 1u; i < IT.B; i = i + 1u) { let l = poolLoss[idx[i]]; if (l > wl) { wl = l; worst = i; } }
  if (b == worst) { return; }
  let lb = poolLoss[idx[b]];
  var rank = 0u;
  for (var i = 0u; i < IT.B; i = i + 1u) {
    if (i == worst || i == b) { continue; }
    let l = poolLoss[idx[i]];
    if (l < lb || (l == lb && i < b)) { rank = rank + 1u; }
  }
  if (rank >= nd) { return; }
  let g = f32(IT.G);
  let cx = g * (0.25 + 0.5 * bp_unit(bp_hash3(IT.seed ^ 0xda3a6e5u, b, 0u)));
  let cy = g * (0.25 + 0.5 * bp_unit(bp_hash3(IT.seed ^ 0xda3a6e5u, b, 1u)));
  let r = g * (0.05 + 0.15 * bp_unit(bp_hash3(IT.seed ^ 0xda3a6e5u, b, 2u)));
  let d = vec2<f32>(f32(x) + 0.5 - cx, f32(y) + 0.5 - cy);
  if (dot(d, d) >= r * r) { return; }
  let n = cellIndex(b, x, y) * 4u;
  x0[n] = vec4<f32>(0.0); x0[n + 1u] = vec4<f32>(0.0); x0[n + 2u] = vec4<f32>(0.0); x0[n + 3u] = vec4<f32>(0.0);
}`;
