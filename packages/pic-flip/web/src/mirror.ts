// IEEE-f64 mirror of the pic-flip NumPy reference
// (packages/pic-flip/pic_flip/reference/apic.py + sim.py). JavaScript
// numbers are IEEE-754 binary64, so a same-op-order port reproduces the
// CPython reference bit-for-bit for +,-,*,/ chains; on the DYADIC golden
// configurations every intermediate is exactly representable and the
// mirror asserts Object.is equality against the committed tables (the
// FP-honesty rule, spec-ref § 7). The WGSL f32 path shows the visitor's
// MEASURED residual against these values — never an asserted 0.0.

export function bsplineN(x: number): number {
  const ax = Math.abs(x);
  if (ax < 0.5) return 0.75 - x * x;
  if (ax < 1.5) return 0.5 * (1.5 - ax) * (1.5 - ax);
  return 0.0;
}

export function weights1d(fp: number): [number, number, number] {
  return [
    0.5 * (1.5 - fp) * (1.5 - fp),
    0.75 - (fp - 1.0) * (fp - 1.0),
    0.5 * (fp - 0.5) * (fp - 0.5),
  ];
}

export function base1d(p: number): number {
  return Math.floor(p + 0.5) - 1;
}

export function weightMoments(fp: number): { sumW: number; sumWR: number; sumWR2: number } {
  const w = weights1d(fp);
  let sumW = 0;
  let sumWR = 0;
  let sumWR2 = 0;
  for (let k = 0; k < 3; k += 1) {
    const r = k - fp;
    sumW += w[k];
    sumWR += w[k] * r;
    sumWR2 += w[k] * r * r;
  }
  return { sumW, sumWR, sumWR2 };
}

// --- angular-momentum golden mirror (Props 5.4/5.5) ------------------------

export interface AmParticle2 {
  x: [number, number];
  m: number;
  v: [number, number];
  B: number[][]; // 2x2
}

export interface AmResult2 {
  lBefore: number;
  lGrid: number;
  lAfterApic: number;
  lAfterPic: number;
}

export function mirrorAngularMomentum2d(particles: AmParticle2[], dx: number): AmResult2 {
  const N = 16;
  const ascale = 4.0 / (dx * dx);
  const mass = new Float64Array(N * N);
  const momx = new Float64Array(N * N);
  const momy = new Float64Array(N * N);
  let lBefore = 0;
  for (const p of particles) {
    lBefore += p.m * (p.x[0] * p.v[1] - p.x[1] * p.v[0]) + p.m * (p.B[1][0] - p.B[0][1]);
    const c00 = ascale * p.B[0][0];
    const c01 = ascale * p.B[0][1];
    const c10 = ascale * p.B[1][0];
    const c11 = ascale * p.B[1][1];
    const fx = p.x[0] / dx;
    const fy = p.x[1] / dx;
    const bx = base1d(fx);
    const by = base1d(fy);
    const wx = weights1d(fx - bx);
    const wy = weights1d(fy - by);
    for (let di = 0; di < 3; di += 1) {
      const rx = (di - (fx - bx)) * dx;
      for (let dj = 0; dj < 3; dj += 1) {
        const ry = (dj - (fy - by)) * dx;
        const w = wx[di] * wy[dj];
        const vax = p.v[0] + c00 * rx + c01 * ry;
        const vay = p.v[1] + c10 * rx + c11 * ry;
        const cid = bx + di + N * (by + dj);
        mass[cid] += w * p.m;
        momx[cid] += w * p.m * vax;
        momy[cid] += w * p.m * vay;
      }
    }
  }
  let lGrid = 0;
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const cid = i + N * j;
      lGrid += i * dx * momy[cid] - j * dx * momx[cid];
    }
  }
  let lAfterApic = 0;
  let lAfterPic = 0;
  for (const p of particles) {
    const fx = p.x[0] / dx;
    const fy = p.x[1] / dx;
    const bx = base1d(fx);
    const by = base1d(fy);
    const wx = weights1d(fx - bx);
    const wy = weights1d(fy - by);
    let vpx = 0;
    let vpy = 0;
    let bp01 = 0;
    let bp10 = 0;
    for (let di = 0; di < 3; di += 1) {
      const rx = (di - (fx - bx)) * dx;
      for (let dj = 0; dj < 3; dj += 1) {
        const ry = (dj - (fy - by)) * dx;
        const w = wx[di] * wy[dj];
        const cid = bx + di + N * (by + dj);
        const vix = mass[cid] > 0 ? momx[cid] / mass[cid] : 0;
        const viy = mass[cid] > 0 ? momy[cid] / mass[cid] : 0;
        vpx += w * vix;
        vpy += w * viy;
        bp01 += w * vix * ry;
        bp10 += w * viy * rx;
      }
    }
    lAfterApic += p.m * (p.x[0] * vpy - p.x[1] * vpx) + p.m * (bp10 - bp01);
    lAfterPic += p.m * (p.x[0] * vpy - p.x[1] * vpx);
  }
  return { lBefore, lGrid, lAfterApic, lAfterPic };
}

export interface AmParticle3 {
  x: [number, number, number];
  m: number;
  v: [number, number, number];
  B: number[][]; // 3x3
}

export interface AmResult3 {
  lBefore: [number, number, number];
  lGrid: [number, number, number];
  lAfterApic: [number, number, number];
  lAfterPic: [number, number, number];
}

function cross(a: number[], b: number[]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function mirrorAngularMomentum3d(particles: AmParticle3[], dx: number): AmResult3 {
  const N = 16;
  const ascale = 4.0 / (dx * dx);
  const mass = new Float64Array(N * N * N);
  const mom = [new Float64Array(N * N * N), new Float64Array(N * N * N), new Float64Array(N * N * N)];
  const lBefore: [number, number, number] = [0, 0, 0];
  for (const p of particles) {
    const orb = cross(p.x, p.v);
    const axial = [p.B[2][1] - p.B[1][2], p.B[0][2] - p.B[2][0], p.B[1][0] - p.B[0][1]];
    for (let a = 0; a < 3; a += 1) lBefore[a] += p.m * orb[a] + p.m * axial[a];
    const bx = base1d(p.x[0] / dx);
    const by = base1d(p.x[1] / dx);
    const bz = base1d(p.x[2] / dx);
    const fp = [p.x[0] / dx - bx, p.x[1] / dx - by, p.x[2] / dx - bz];
    const wx = weights1d(fp[0]);
    const wy = weights1d(fp[1]);
    const wz = weights1d(fp[2]);
    for (let di = 0; di < 3; di += 1) {
      for (let dj = 0; dj < 3; dj += 1) {
        for (let dk = 0; dk < 3; dk += 1) {
          const r = [(di - fp[0]) * dx, (dj - fp[1]) * dx, (dk - fp[2]) * dx];
          const w = wx[di] * wy[dj] * wz[dk];
          const cv = [
            ascale * (p.B[0][0] * r[0] + p.B[0][1] * r[1] + p.B[0][2] * r[2]),
            ascale * (p.B[1][0] * r[0] + p.B[1][1] * r[1] + p.B[1][2] * r[2]),
            ascale * (p.B[2][0] * r[0] + p.B[2][1] * r[1] + p.B[2][2] * r[2]),
          ];
          const cid = bx + di + N * (by + dj + N * (bz + dk));
          mass[cid] += w * p.m;
          for (let a = 0; a < 3; a += 1) mom[a][cid] += w * p.m * (p.v[a] + cv[a]);
        }
      }
    }
  }
  const lGrid: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < N; k += 1) {
    for (let j = 0; j < N; j += 1) {
      for (let i = 0; i < N; i += 1) {
        const cid = i + N * (j + N * k);
        const g = cross([i * dx, j * dx, k * dx], [mom[0][cid], mom[1][cid], mom[2][cid]]);
        for (let a = 0; a < 3; a += 1) lGrid[a] += g[a];
      }
    }
  }
  const lAfterApic: [number, number, number] = [0, 0, 0];
  const lAfterPic: [number, number, number] = [0, 0, 0];
  for (const p of particles) {
    const bx = base1d(p.x[0] / dx);
    const by = base1d(p.x[1] / dx);
    const bz = base1d(p.x[2] / dx);
    const fp = [p.x[0] / dx - bx, p.x[1] / dx - by, p.x[2] / dx - bz];
    const wx = weights1d(fp[0]);
    const wy = weights1d(fp[1]);
    const wz = weights1d(fp[2]);
    const vp = [0, 0, 0];
    const spin = [0, 0, 0];
    for (let di = 0; di < 3; di += 1) {
      for (let dj = 0; dj < 3; dj += 1) {
        for (let dk = 0; dk < 3; dk += 1) {
          const r = [(di - fp[0]) * dx, (dj - fp[1]) * dx, (dk - fp[2]) * dx];
          const w = wx[di] * wy[dj] * wz[dk];
          const cid = bx + di + N * (by + dj + N * (bz + dk));
          const vi =
            mass[cid] > 0
              ? [mom[0][cid] / mass[cid], mom[1][cid] / mass[cid], mom[2][cid] / mass[cid]]
              : [0, 0, 0];
          for (let a = 0; a < 3; a += 1) vp[a] += w * vi[a];
          const sp = cross(r, vi);
          for (let a = 0; a < 3; a += 1) spin[a] += w * sp[a];
        }
      }
    }
    const orb = cross(p.x, vp);
    for (let a = 0; a < 3; a += 1) {
      lAfterApic[a] += p.m * orb[a] + p.m * spin[a];
      lAfterPic[a] += p.m * orb[a];
    }
  }
  return { lBefore, lGrid, lAfterApic, lAfterPic };
}

// --- affine round-trip mirror (Prop 5.1, grid -> particle -> grid) ---------

export interface RoundtripInput {
  ndim: 2 | 3;
  dx: number;
  v0: number[];
  C: number[][];
  positions: number[][];
  masses: number[];
  sampleNode: number[];
}

export interface RoundtripResult {
  apicMaxAbsErr: number;
  fieldScale: number;
  nMassed: number;
  sampleV: number[];
  picMaxAbsDev: number;
}

export function mirrorRoundtrip(inp: RoundtripInput): RoundtripResult {
  const N = 16;
  const { ndim, dx } = inp;
  const ascale = 4.0 / (dx * dx);
  const nzExt = ndim === 3 ? N : 1;
  const cells = N * N * nzExt;
  const mass = new Float64Array(cells);
  const mom = [new Float64Array(cells), new Float64Array(cells), new Float64Array(cells)];
  const momPic = [new Float64Array(cells), new Float64Array(cells), new Float64Array(cells)];
  const cid = (i: number, j: number, k: number): number => i + N * (j + N * k);
  const analytic = (xn: number[]): number[] => {
    const v: number[] = [];
    for (let a = 0; a < ndim; a += 1) {
      let acc = inp.v0[a];
      for (let b = 0; b < ndim; b += 1) acc += inp.C[a][b] * xn[b];
      v.push(acc);
    }
    return v;
  };
  for (let p = 0; p < inp.positions.length; p += 1) {
    const x = inp.positions[p];
    const m = inp.masses[p];
    const bx = base1d(x[0] / dx);
    const by = base1d(x[1] / dx);
    const bz = ndim === 3 ? base1d(x[2] / dx) : 0;
    const wx = weights1d(x[0] / dx - bx);
    const wy = weights1d(x[1] / dx - by);
    const wz: [number, number, number] = ndim === 3 ? weights1d(x[2] / dx - bz) : [1, 0, 0];
    const kmax = ndim === 3 ? 3 : 1;
    // G2P from the analytic grid field.
    const vp = [0, 0, 0];
    const bp = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let di = 0; di < 3; di += 1) {
      for (let dj = 0; dj < 3; dj += 1) {
        for (let dk = 0; dk < kmax; dk += 1) {
          const w = wx[di] * wy[dj] * wz[dk];
          const xn = [(bx + di) * dx, (by + dj) * dx, (bz + dk) * dx];
          const vi = analytic(xn);
          for (let a = 0; a < ndim; a += 1) {
            vp[a] += w * vi[a];
            for (let b = 0; b < ndim; b += 1) bp[a][b] += w * vi[a] * (xn[b] - x[b]);
          }
        }
      }
    }
    // P2G back (APIC full; PIC drops B).
    for (let di = 0; di < 3; di += 1) {
      for (let dj = 0; dj < 3; dj += 1) {
        for (let dk = 0; dk < kmax; dk += 1) {
          const w = wx[di] * wy[dj] * wz[dk];
          const xn = [(bx + di) * dx, (by + dj) * dx, (bz + dk) * dx];
          const c = cid(bx + di, by + dj, bz + dk);
          mass[c] += w * m;
          for (let a = 0; a < ndim; a += 1) {
            let va = vp[a];
            for (let b = 0; b < ndim; b += 1) va += ascale * bp[a][b] * (xn[b] - x[b]);
            mom[a][c] += w * m * va;
            momPic[a][c] += w * m * vp[a];
          }
        }
      }
    }
  }
  let apicMaxAbsErr = 0;
  let picMaxAbsDev = 0;
  let fieldScale = 0;
  let nMassed = 0;
  const sampleV: number[] = [0, 0, 0];
  for (let k = 0; k < nzExt; k += 1) {
    for (let j = 0; j < N; j += 1) {
      for (let i = 0; i < N; i += 1) {
        const c = cid(i, j, k);
        if (mass[c] <= 0) continue;
        nMassed += 1;
        const vexp = analytic([i * dx, j * dx, k * dx]);
        for (let a = 0; a < ndim; a += 1) {
          const vg = mom[a][c] / mass[c];
          const vgPic = momPic[a][c] / mass[c];
          apicMaxAbsErr = Math.max(apicMaxAbsErr, Math.abs(vg - vexp[a]));
          picMaxAbsDev = Math.max(picMaxAbsDev, Math.abs(vgPic - vexp[a]));
          fieldScale = Math.max(fieldScale, Math.abs(vexp[a]));
        }
        if (
          i === inp.sampleNode[0] &&
          j === inp.sampleNode[1] &&
          (ndim === 2 || k === inp.sampleNode[2])
        ) {
          for (let a = 0; a < ndim; a += 1) sampleV[a] = mom[a][c] / mass[c];
        }
      }
    }
  }
  return { apicMaxAbsErr, fieldScale, nMassed, sampleV: sampleV.slice(0, ndim), picMaxAbsDev };
}

// --- transfer-error 1/9 mirror (Zhu thesis eq. 3.8 discrete ladder) --------
// All ladder inputs are dyadic rationals, so the f64 midpoint sums are
// EXACT and must Object.is-match the committed table values.

export function mirrorTransferErrorLadder(a: number, b: number, c: number, n: number): number {
  // particles at y_k = -1/2 + (k + 1/2)/n; tent weight w = 1 - |y|;
  // linear interpolation of f between integer nodes.
  const f = (x: number): number => a + b * x + c * x * x;
  let num = 0;
  let den = 0;
  for (let k = 0; k < n; k += 1) {
    const y = -0.5 + (k + 0.5) / n;
    const w = 1 - Math.abs(y);
    const fI = y >= 0 ? (1 - y) * f(0) + y * f(1) : (1 + y) * f(0) - y * f(-1);
    num += w * fI;
    den += w;
  }
  return num / den;
}

// --- rotating disk (2D transfer-cycle, the flagship PROVE preset) ----------
// f64 port of sim.make_rotating_disk_2d + sim.transfer_cycle_step_2d
// (P2G -> G2P(mode) -> RK2 advect; no gravity/projection/regularizers) —
// isolates the transfer dissipation. Same lattice, same loop order.

export interface Disk2D {
  pos: Float64Array; // 2 per particle
  vel: Float64Array;
  cmat: Float64Array; // 4 per particle (row-major 2x2)
  n: number;
  dx: number;
  nGrid: number;
  center: [number, number];
}

export function makeRotatingDisk2d(nGrid = 32, omega = 2.0, radiusFrac = 0.3): Disk2D {
  const dx = 1.0 / nGrid;
  const center: [number, number] = [0.5, 0.5];
  const lo = 2 * dx;
  const hi = 1.0 - 2 * dx;
  const xs: number[] = [];
  for (let v = lo + 0.25 * dx; v < hi; v += 0.5 * dx) xs.push(v);
  const px: number[] = [];
  const py: number[] = [];
  for (const x of xs) {
    for (const y of xs) {
      const rx = x - center[0];
      const ry = y - center[1];
      if (Math.sqrt(rx * rx + ry * ry) <= radiusFrac) {
        px.push(x);
        py.push(y);
      }
    }
  }
  const n = px.length;
  const pos = new Float64Array(n * 2);
  const vel = new Float64Array(n * 2);
  const cmat = new Float64Array(n * 4);
  for (let i = 0; i < n; i += 1) {
    pos[2 * i] = px[i];
    pos[2 * i + 1] = py[i];
    vel[2 * i] = -omega * (py[i] - center[1]);
    vel[2 * i + 1] = omega * (px[i] - center[0]);
    cmat[4 * i + 1] = -omega; // C01
    cmat[4 * i + 2] = omega; // C10
  }
  return { pos, vel, cmat, n, dx, nGrid, center };
}

function samplePoint2d(
  gridVel: Float64Array,
  nx: number,
  ny: number,
  px: number,
  py: number,
  dx: number,
): [number, number] {
  const fx = px / dx;
  const fy = py / dx;
  const bx = base1d(fx);
  const by = base1d(fy);
  const wx = weights1d(fx - bx);
  const wy = weights1d(fy - by);
  let vx = 0;
  let vy = 0;
  for (let di = 0; di < 3; di += 1) {
    const gi = bx + di;
    if (gi < 0 || gi >= nx) continue;
    for (let dj = 0; dj < 3; dj += 1) {
      const gj = by + dj;
      if (gj < 0 || gj >= ny) continue;
      const w = wx[di] * wy[dj];
      vx += w * gridVel[2 * (gi + nx * gj)];
      vy += w * gridVel[2 * (gi + nx * gj) + 1];
    }
  }
  return [vx, vy];
}

/** One transfer-only cycle (sim.transfer_cycle_step_2d). Mutates disk. */
export function transferCycleStep2d(disk: Disk2D, dt: number, mode: "pic" | "flip" | "apic"): void {
  const { n, dx, nGrid } = disk;
  const nx = nGrid;
  const ny = nGrid;
  const gridMass = new Float64Array(nx * ny);
  const gridMom = new Float64Array(nx * ny * 2);
  const ascale = 4.0 / (dx * dx);
  for (let p = 0; p < n; p += 1) {
    const px = disk.pos[2 * p];
    const py = disk.pos[2 * p + 1];
    const vx = disk.vel[2 * p];
    const vy = disk.vel[2 * p + 1];
    const useC = mode === "apic";
    const c00 = useC ? disk.cmat[4 * p] : 0;
    const c01 = useC ? disk.cmat[4 * p + 1] : 0;
    const c10 = useC ? disk.cmat[4 * p + 2] : 0;
    const c11 = useC ? disk.cmat[4 * p + 3] : 0;
    const fx = px / dx;
    const fy = py / dx;
    const bx = base1d(fx);
    const by = base1d(fy);
    const wx = weights1d(fx - bx);
    const wy = weights1d(fy - by);
    for (let di = 0; di < 3; di += 1) {
      const gi = bx + di;
      if (gi < 0 || gi >= nx) continue;
      const rx = (di - (fx - bx)) * dx;
      for (let dj = 0; dj < 3; dj += 1) {
        const gj = by + dj;
        if (gj < 0 || gj >= ny) continue;
        const ry = (dj - (fy - by)) * dx;
        const w = wx[di] * wy[dj];
        const vax = vx + c00 * rx + c01 * ry;
        const vay = vy + c10 * rx + c11 * ry;
        const cid = gi + nx * gj;
        gridMass[cid] += w;
        gridMom[2 * cid] += w * vax;
        gridMom[2 * cid + 1] += w * vay;
      }
    }
  }
  const gridVel = new Float64Array(nx * ny * 2);
  for (let c = 0; c < nx * ny; c += 1) {
    if (gridMass[c] > 0) {
      gridVel[2 * c] = gridMom[2 * c] / gridMass[c];
      gridVel[2 * c + 1] = gridMom[2 * c + 1] / gridMass[c];
    }
  }
  // G2P per mode (FLIP in a force-free cycle reduces to carrying v_p).
  for (let p = 0; p < n; p += 1) {
    const px = disk.pos[2 * p];
    const py = disk.pos[2 * p + 1];
    const fx = px / dx;
    const fy = py / dx;
    const bx = base1d(fx);
    const by = base1d(fy);
    const wx = weights1d(fx - bx);
    const wy = weights1d(fy - by);
    let vx = 0;
    let vy = 0;
    let b00 = 0;
    let b01 = 0;
    let b10 = 0;
    let b11 = 0;
    for (let di = 0; di < 3; di += 1) {
      const gi = bx + di;
      if (gi < 0 || gi >= nx) continue;
      const rx = (di - (fx - bx)) * dx;
      for (let dj = 0; dj < 3; dj += 1) {
        const gj = by + dj;
        if (gj < 0 || gj >= ny) continue;
        const ry = (dj - (fy - by)) * dx;
        const w = wx[di] * wy[dj];
        const vix = gridVel[2 * (gi + nx * gj)];
        const viy = gridVel[2 * (gi + nx * gj) + 1];
        vx += w * vix;
        vy += w * viy;
        if (mode === "apic") {
          b00 += w * vix * rx;
          b01 += w * vix * ry;
          b10 += w * viy * rx;
          b11 += w * viy * ry;
        }
      }
    }
    if (mode === "apic") {
      disk.vel[2 * p] = vx;
      disk.vel[2 * p + 1] = vy;
      disk.cmat[4 * p] = ascale * b00;
      disk.cmat[4 * p + 1] = ascale * b01;
      disk.cmat[4 * p + 2] = ascale * b10;
      disk.cmat[4 * p + 3] = ascale * b11;
    } else {
      if (mode === "pic") {
        disk.vel[2 * p] = vx;
        disk.vel[2 * p + 1] = vy;
      }
      // FLIP: force-free cycle => S(new) == S(old), v_p carried unchanged.
      disk.cmat[4 * p] = 0;
      disk.cmat[4 * p + 1] = 0;
      disk.cmat[4 * p + 2] = 0;
      disk.cmat[4 * p + 3] = 0;
    }
  }
  // RK2 advect (1 substep; clamp box [2dx, (n-3)dx] per transfer_cycle_step_2d).
  const lo = 2 * dx;
  const hiX = (nx - 3) * dx;
  const hiY = (ny - 3) * dx;
  for (let p = 0; p < n; p += 1) {
    let px = disk.pos[2 * p];
    let py = disk.pos[2 * p + 1];
    const [v1x, v1y] = samplePoint2d(gridVel, nx, ny, px, py, dx);
    const mx = px + 0.5 * dt * v1x;
    const my = py + 0.5 * dt * v1y;
    const [v2x, v2y] = samplePoint2d(gridVel, nx, ny, mx, my, dx);
    px += dt * v2x;
    py += dt * v2y;
    disk.pos[2 * p] = Math.min(Math.max(px, lo), hiX);
    disk.pos[2 * p + 1] = Math.min(Math.max(py, lo), hiY);
  }
}

/** Total L (2D, about `center`) incl. the APIC spin term (sim.py). */
export function totalAngularMomentum2d(disk: Disk2D): number {
  let orbital = 0;
  let spin = 0;
  const q = 0.25 * disk.dx * disk.dx;
  for (let p = 0; p < disk.n; p += 1) {
    const rx = disk.pos[2 * p] - disk.center[0];
    const ry = disk.pos[2 * p + 1] - disk.center[1];
    orbital += rx * disk.vel[2 * p + 1] - ry * disk.vel[2 * p];
    spin += q * (disk.cmat[4 * p + 2] - disk.cmat[4 * p + 1]);
  }
  return orbital + spin;
}

export function kineticEnergy2d(disk: Disk2D): number {
  let ke = 0;
  for (let p = 0; p < disk.n; p += 1) {
    ke += 0.5 * (disk.vel[2 * p] ** 2 + disk.vel[2 * p + 1] ** 2);
  }
  return ke;
}

// --- 3D observables (gate checkpoints; unit masses) ------------------------

export interface Observables {
  kineticEnergy: number;
  momentum: [number, number, number];
  com: [number, number, number];
  maxSpeed: number;
  fluidNodeCount: number;
  maxColumnHeight: number;
}

export function computeObservables(
  pos: Float32Array | Float64Array,
  vel: Float32Array | Float64Array,
  n: number,
  nx: number,
  ny: number,
  nz: number,
  dx: number,
  nWall: number,
): Observables {
  let ke = 0;
  const mom: [number, number, number] = [0, 0, 0];
  const com: [number, number, number] = [0, 0, 0];
  let maxSpeed = 0;
  const count = new Int32Array(nx * ny * nz);
  for (let p = 0; p < n; p += 1) {
    const vx = vel[3 * p];
    const vy = vel[3 * p + 1];
    const vz = vel[3 * p + 2];
    ke += 0.5 * (vx * vx + vy * vy + vz * vz);
    mom[0] += vx;
    mom[1] += vy;
    mom[2] += vz;
    com[0] += pos[3 * p];
    com[1] += pos[3 * p + 1];
    com[2] += pos[3 * p + 2];
    maxSpeed = Math.max(maxSpeed, Math.abs(vx), Math.abs(vy), Math.abs(vz));
    const gi = Math.floor(pos[3 * p] / dx + 0.5);
    const gj = Math.floor(pos[3 * p + 1] / dx + 0.5);
    const gk = Math.floor(pos[3 * p + 2] / dx + 0.5);
    if (gi >= 0 && gi < nx && gj >= 0 && gj < ny && gk >= 0 && gk < nz) {
      count[gi + nx * (gj + ny * gk)] += 1;
    }
  }
  if (n > 0) {
    com[0] /= n;
    com[1] /= n;
    com[2] /= n;
  }
  // fluid_volume_metrics_3d: labels = fluid iff count>0 and not wall.
  let fluidNodes = 0;
  let maxCol = 0;
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < ny; j += 1) {
      let colTop = -1;
      for (let k = 0; k < nz; k += 1) {
        const wall =
          i < nWall || i >= nx - nWall || j < nWall || j >= ny - nWall || k < nWall || k >= nz - nWall;
        if (!wall && count[i + nx * (j + ny * k)] > 0) {
          fluidNodes += 1;
          colTop = k;
        }
      }
      if (colTop >= 0) maxCol = Math.max(maxCol, colTop);
    }
  }
  return {
    kineticEnergy: ke,
    momentum: mom,
    com,
    maxSpeed,
    fluidNodeCount: fluidNodes,
    maxColumnHeight: maxCol,
  };
}

/** SHA-256 hex of a typed array (run-twice determinism receipts). */
export async function sha256hex(data: Float32Array | Int32Array | Uint8Array | Uint32Array): Promise<string> {
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const buf = await crypto.subtle.digest("SHA-256", ab);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
