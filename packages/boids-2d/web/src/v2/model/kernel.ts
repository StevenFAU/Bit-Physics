// Swarm — the gated GPU kernel, ported from the v4 lab (packages/boids-2d/web/index.html).
//
// FROZEN: the constants from WGSL_BOID to WGSL_REDUCE below are the v4 lab's
// single-source WGSL, byte for byte (test/kernel-port.test.ts reads the v4
// page and compares). WGSL_RULE_STATE / _ACCUM / _INTEGRATE are the rule body
// (Reynolds separation / alignment / cohesion summed as i32 fixed point, the
// steering, the fear term, the speed clamp, Vicsek-style angular noise from a
// counter hash, the torus wrap); WGSL_COMPUTE is the brute-force O(n²) wrapper
// — the verification oracle; WGSL_REDUCE is the exact integer order-parameter
// reduction (φ, m).
//
// NEW in v2 (WGSL_SORT_V2, below the frozen block): the counting-sort wrapper
// now walks the shared @bp/gpu CountingSort's output (cellStart[c] ..
// cellStart[c + 1], order[s]) instead of v4's own scan buffers. Only the
// neighbour enumeration changed; the rule body is interpolated unchanged, and
// the in-page brute ≡ sort trajectory hash re-earns its exactness.
//
// Determinism (v4's claim, kept): on the single-species metric path every
// neighbour sum is an i32 in units of 2⁻²⁰, so the order neighbours are
// visited in — and the unspecified order within a CountingSort bucket — cannot
// change a bit of the trajectory. Same device, same browser ⇒ same bytes.
// Builtin sin/cos/exp in this kernel feed the noise rotation and the optional
// flow fields only; nothing here is compared with an f64 reference (the CI
// gate is the JS f64 capture in ../proof/gate.ts), so their 2⁻¹¹ accuracy on
// some Vulkan drivers changes no claim. They are kept exactly as v4 has them.

// ---- FROZEN (v4 lab, verbatim) ---------------------------------------------
export const WGSL_BOID = `struct Boid { pos: vec2<f32>, vel: vec2<f32>, align: f32, dens: f32 };`;
export const WGSL_PARAMS = `struct Params {
  dt:f32, maxSpeed:f32, maxForce:f32, minSpeed:f32,
  rSep:f32, rAli:f32, rCoh:f32,
  wSep:f32, wAli:f32, wCoh:f32,
  mx:f32, my:f32, mMode:f32, mR:f32, mStr:f32,
  halfW:f32, halfH:f32,
  windX:f32, windY:f32, swirl:f32,
  colorMode:f32, obsCount:f32,
  noise:f32, fovCos:f32,
  topo:f32, kNN:f32, frameSeed:f32,
  gridCols:f32, gridRows:f32, cellX:f32, cellY:f32,
  pixelWorld:f32, agentN:f32,
  camX:f32, camY:f32, camZoom:f32,
  vcmX:f32, vcmY:f32,
  flowType:f32, flowAmp:f32, flowScale:f32, flowTime:f32,
  nfType:f32, nfAmp:f32,
  nSpecies:f32,
  prevComX:f32, prevComY:f32, _pa:f32,
  gc: array<vec4<f32>, 4>,
  ga: array<vec4<f32>, 4>,
  spd: vec4<f32>,
};`;
export const WGSL_HELPERS = `
// --- bit-exact fixed-point accumulation (D-2) ------------------------------
// Neighbour reductions (separation / alignment / cohesion) are summed as i32 in
// units of 1/FP, then rescaled to f32 once. Integer addition is associative, so
// the result is INDEPENDENT of the order neighbours are visited -> bit-identical
// across reduction orders AND across the brute / sort backends on the same GPU.
// FP = 2^20: the reciprocal 2^-20 is exact in f32 so the rescale loses no bits.
const FP: f32 = 1048576.0;
// NaN=0 / Inf=0 guard: x*0 is 0 for any finite x but NaN for NaN or +/-Inf, so
// (x*0 != 0) flags exactly the non-finite values. Avoids relying on the x!=x
// self-compare which an aggressive optimizer may fold to false.
fn fin(x: f32) -> f32 { let z = x * 0.0; return select(x, 0.0, z != 0.0); }
fn fin2(p: vec2<f32>) -> vec2<f32> { return vec2<f32>(fin(p.x), fin(p.y)); }
fn wrapDelta(d0: vec2<f32>) -> vec2<f32> {
  var d = d0; let w = P.halfW*2.0; let h = P.halfH*2.0;
  if (d.x >  P.halfW) { d.x = d.x - w; } if (d.x < -P.halfW) { d.x = d.x + w; }
  if (d.y >  P.halfH) { d.y = d.y - h; } if (d.y < -P.halfH) { d.y = d.y + h; }
  return d;
}
fn limitV(v: vec2<f32>, m: f32) -> vec2<f32> { let l = length(v); if (l > m) { return v / l * m; } return v; }
fn hash1(s0: u32) -> f32 { var x = s0; x = x ^ (x >> 16u); x = x * 2246822519u; x = x ^ (x >> 13u); x = x * 3266489917u; x = x ^ (x >> 16u); return f32(x) / 4294967296.0; }
fn nAngle(i: u32, fs: u32) -> f32 { return hash1(i * 747796405u + fs * 2891336453u) * 2.0 - 1.0; }
fn hash2(ix:i32, iy:i32) -> f32 { var hh:u32 = u32(ix) * 374761393u + u32(iy) * 668265263u; hh = (hh ^ (hh >> 13u)) * 1274126177u; return f32(hh ^ (hh >> 16u)) / 4294967296.0; }
fn vnoise(x:f32, y:f32) -> f32 {
  let x0=floor(x); let y0=floor(y); let fx=x-x0; let fy=y-y0;
  let u=fx*fx*(3.0-2.0*fx); let v=fy*fy*(3.0-2.0*fy); let ix=i32(x0); let iy=i32(y0);
  let a=hash2(ix,iy); let b=hash2(ix+1,iy); let c=hash2(ix,iy+1); let d=hash2(ix+1,iy+1);
  return (a*(1.0-u)+b*u)*(1.0-v)+(c*(1.0-u)+d*u)*v;
}
fn flowField(p: vec2<f32>) -> vec2<f32> {
  let ty=u32(P.flowType);
  if (ty==0u || P.flowAmp==0.0) { return vec2<f32>(0.0,0.0); }
  let amp=P.flowAmp; let s=max(P.flowScale,1e-3); let hW=P.halfW; let hH=P.halfH;
  if (ty==1u) { return vec2<f32>(amp*(p.y/hH), 0.0); }
  if (ty==2u) { let r2=p.x*p.x+p.y*p.y; let g=exp(-r2/(hH*hH*s*s)); let r=max(sqrt(r2),1e-6); return vec2<f32>(amp*(-p.y/r)*g, amp*(p.x/r)*g); }
  if (ty==3u) { let X=(p.x/hW+1.0)*3.14159265; let Y=(p.y/hH)*3.14159265; return vec2<f32>(amp*sin(X)*cos(Y), -amp*(hH/hW)*cos(X)*sin(Y)); }
  if (ty==4u) { let sx=-hW*0.5; let kx=hW*0.5; let dxs=p.x-sx; let dys=p.y; let ds2=dxs*dxs+dys*dys+0.01; let dxk=p.x-kx; let dyk=p.y; let dk2=dxk*dxk+dyk*dyk+0.01; return vec2<f32>(amp*(dxs/ds2 - dxk/dk2), amp*(dys/ds2 - dyk/dk2)); }
  if (ty==5u) { let k=2.2/max(hH,1e-3)/s; let e=0.001*max(hH,1e-3);
    let a1=vnoise(p.x*k*hH+11.3,(p.y+e)*k*hH+5.7); let a2=vnoise(p.x*k*hH+11.3,(p.y-e)*k*hH+5.7);
    let b1=vnoise((p.x+e)*k*hH+11.3,p.y*k*hH+5.7); let b2=vnoise((p.x-e)*k*hH+11.3,p.y*k*hH+5.7);
    return vec2<f32>(amp*((a1-a2)/(2.0*e))*hH, -amp*((b1-b2)/(2.0*e))*hH); }
  return vec2<f32>(0.0,0.0);
}
fn noiseScale(p: vec2<f32>) -> f32 {
  let ty=u32(P.nfType);
  if (ty==0u || P.nfAmp==0.0) { return 1.0; }
  if (ty==1u) { return max(0.0, 1.0 + P.nfAmp*(p.x/P.halfW)); }
  if (ty==2u) { let r=length(p)/P.halfH; return max(0.0, 1.0 + P.nfAmp*(1.0-2.0*min(r,1.0))); }
  if (ty==3u) { return max(0.0, 1.0 + P.nfAmp*sign(p.x)); }
  return 1.0;
}
fn segClosest(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> vec2<f32> { let ab=b-a; let t=clamp(dot(p-a,ab)/max(dot(ab,ab),1e-9),0.0,1.0); return a+ab*t; }`;
export const WGSL_RULE_STATE = `
  var sep = vec2<f32>(0.0, 0.0);
  var aliSum = vec2<f32>(0.0, 0.0);
  var cohSum = vec2<f32>(0.0, 0.0);
  var nAli = 0.0;
  var nCoh = 0.0;
  var nSep = 0.0;
  var vortSum = 0.0;
  // fixed-point (i32) accumulators for the order-independent neighbour sums (D-2)
  var sepXi: i32 = 0; var sepYi: i32 = 0;
  var aliXi: i32 = 0; var aliYi: i32 = 0;
  var cohXi: i32 = 0; var cohYi: i32 = 0;
  let multi = P.nSpecies > 1.5;
  let si = select(0u, specIn[i], multi);
  var cohB: array<vec2<f32>, 4>;
  var aliB: array<vec2<f32>, 4>;
  var nCohB: array<f32, 4>;
  var nAliB: array<f32, 4>;
  for (var b = 0u; b < 4u; b = b + 1u) { cohB[b] = vec2<f32>(0.0,0.0); aliB[b] = vec2<f32>(0.0,0.0); nCohB[b] = 0.0; nAliB[b] = 0.0; }
  let rSep2 = P.rSep*P.rSep;
  let rAli2 = P.rAli*P.rAli;
  let rCoh2 = P.rCoh*P.rCoh;
  let useTopo = (P.topo > 0.5) && !multi;
  let K = clamp(u32(P.kNN), 1u, 12u);
  var kd:  array<f32,12>;
  var kvx: array<f32,12>;
  var kvy: array<f32,12>;
  var kdx: array<f32,12>;
  var kdy: array<f32,12>;
  for (var q = 0u; q < 12u; q = q + 1u) { kd[q] = 1e30; }
  var kmaxv = 1e30;
  var kmaxi = 0u;
  var kn = 0u;`;
export const WGSL_RULE_ACCUM = `
        let d = wrapDelta(inB[j].pos - p);
        let dist2 = dot(d, d);
        if (P.fovCos > -0.9999) { if (dist2 > 1e-12) { if (dot(d, hdir) < P.fovCos * sqrt(dist2)) { continue; } } }
        if (useTopo) {
          if (dist2 > 1e-12 && dist2 < kmaxv) {
            kd[kmaxi] = dist2; kdx[kmaxi] = d.x; kdy[kmaxi] = d.y; kvx[kmaxi] = inB[j].vel.x; kvy[kmaxi] = inB[j].vel.y;
            if (kn < K) { kn = kn + 1u; }
            kmaxv = 0.0; kmaxi = 0u;
            for (var q = 0u; q < K; q = q + 1u) { if (kd[q] > kmaxv) { kmaxv = kd[q]; kmaxi = q; } }
          }
        } else {
          if (multi) {
            let sj = specIn[j];
            if (dist2 < rCoh2) { cohB[sj] = cohB[sj] + d; nCohB[sj] = nCohB[sj] + 1.0; }
            if (dist2 < rAli2) { aliB[sj] = aliB[sj] + inB[j].vel; nAliB[sj] = nAliB[sj] + 1.0; vortSum = vortSum + (d.x*(inB[j].vel.y - v.y) - d.y*(inB[j].vel.x - v.x)) / max(dist2, 1e-9); }
          } else {
            if (dist2 < rCoh2) { cohXi = cohXi + i32(round(d.x * FP)); cohYi = cohYi + i32(round(d.y * FP)); nCoh = nCoh + 1.0; }
            if (dist2 < rAli2) { aliXi = aliXi + i32(round(inB[j].vel.x * FP)); aliYi = aliYi + i32(round(inB[j].vel.y * FP)); nAli = nAli + 1.0; vortSum = vortSum + (d.x*(inB[j].vel.y - v.y) - d.y*(inB[j].vel.x - v.x)) / max(dist2, 1e-9); }
          }
        }
        if (dist2 < rSep2 && dist2 > 1e-9) { let dist = sqrt(dist2); let w = (1.0 - dist / P.rSep) / dist; sepXi = sepXi - i32(round(d.x * w * FP)); sepYi = sepYi - i32(round(d.y * w * FP)); nSep = nSep + 1.0; }`;
export const WGSL_RULE_INTEGRATE = `
  // rescale the fixed-point sums once (division by 2^20 is exact in f32)
  sep = vec2<f32>(f32(sepXi), f32(sepYi)) / FP;
  if (!useTopo && !multi) {
    aliSum = vec2<f32>(f32(aliXi), f32(aliYi)) / FP;
    cohSum = vec2<f32>(f32(cohXi), f32(cohYi)) / FP;
  }
  if (useTopo) {
    for (var q = 0u; q < K; q = q + 1u) { if (kd[q] < 1e29) { aliSum = aliSum + vec2<f32>(kvx[q], kvy[q]); cohSum = cohSum + vec2<f32>(kdx[q], kdy[q]); vortSum = vortSum + (kdx[q]*(kvy[q]-v.y) - kdy[q]*(kvx[q]-v.x)) / max(kd[q], 1e-9); } }
    nAli = f32(kn); nCoh = f32(kn);
  }
  // D-6 saturation detector: i32 capacity at FP=2^20 is ±2048 accumulated units (separation
  // saturates first). Flag at >2^30 (headroom 2x before wrap); the nSep>2000 term backstops
  // single-frame pile-ups whose wrapped sum could alias back under the threshold — counted on
  // the separation gate itself so it works in every interaction mode (sep is always fixed-point).
  var satM = max(abs(sepXi), abs(sepYi));
  if (!useTopo && !multi) { satM = max(satM, max(max(abs(aliXi), abs(aliYi)), max(abs(cohXi), abs(cohYi)))); }
  if (satM > 1073741824 || nSep > 2000.0) { satHit(); }
  var acc = vec2<f32>(0.0, 0.0);
  let ms = select(P.maxSpeed, P.maxSpeed * P.spd[si], multi);
  let mns = select(P.minSpeed, P.minSpeed * P.spd[si], multi);
  if (length(sep) > 1e-6) { let des = normalize(sep) * P.maxSpeed; acc = acc + limitV(des - v, P.maxForce) * P.wSep; }
  if (!multi) {
    if (nAli > 0.0) { let des = normalize(aliSum) * P.maxSpeed; acc = acc + limitV(des - v, P.maxForce) * P.wAli; }
    if (nCoh > 0.0) { let des = normalize(cohSum) * P.maxSpeed; acc = acc + limitV(des - v, P.maxForce) * P.wCoh; }
  } else {
    for (var b = 0u; b < 4u; b = b + 1u) {
      if (nAliB[b] > 0.0) { let des = normalize(aliB[b]) * ms; acc = acc + limitV(des - v, P.maxForce) * P.ga[si][b]; }
      if (nCohB[b] > 0.0) { let des = normalize(cohB[b]) * ms; acc = acc + limitV(des - v, P.maxForce) * P.gc[si][b]; }
    }
  }
  if (P.mMode != 0.0) {
    let md = vec2<f32>(P.mx, P.my) - p;
    let mdist = length(md);
    if (mdist < P.mR && mdist > 1e-5) { let fall = 1.0 - mdist / P.mR; acc = acc + (md / mdist) * P.mMode * P.mStr * fall; }
  }
  acc = acc + vec2<f32>(P.windX, P.windY);
  if (P.swirl != 0.0) { let rl = max(length(p), 1e-4); acc = acc + (vec2<f32>(-p.y, p.x) / rl) * P.swirl; }
  acc = acc + flowField(p);
  let oc = u32(P.obsCount);
  for (var k: u32 = 0u; k < oc; k = k + 1u) {
    let o = obs[k]; var cpt = o.ab.xy; if (o.p0.z > 0.5) { cpt = segClosest(p, o.ab.xy, o.ab.zw); }
    let od = p - cpt; let dd = length(od); let rr = o.p0.x + 0.02;
    if (dd < rr && dd > 1e-5) { acc = acc + (od / dd) * ((rr - dd) / rr) * P.maxForce * 8.0 * o.p0.y; }
  }
  v = v + acc * P.dt;
  let sp = length(v);
  if (sp > ms) { v = v / sp * ms; }
  else if (sp > 1e-6 && sp < mns) { v = v / sp * mns; }
  else if (sp <= 1e-6) { v = vec2<f32>(mns, 0.0); }
  let eta = P.noise * noiseScale(p);
  if (eta > 0.0) { let ang = nAngle(i, u32(P.frameSeed)) * eta * 3.14159265; let cs = cos(ang); let sn = sin(ang); v = vec2<f32>(v.x*cs - v.y*sn, v.x*sn + v.y*cs); }
  var np = p + v * P.dt;
  if (np.x >  P.halfW) { np.x = np.x - P.halfW*2.0; }
  if (np.x < -P.halfW) { np.x = np.x + P.halfW*2.0; }
  if (np.y >  P.halfH) { np.y = np.y - P.halfH*2.0; }
  if (np.y < -P.halfH) { np.y = np.y + P.halfH*2.0; }
  var localAlign = 0.5;
  if (nAli > 0.0) { let avgDir = normalize(aliSum); let myDir = normalize(v); localAlign = clamp(dot(myDir, avgDir) * 0.5 + 0.5, 0.0, 1.0); }
  let density = clamp(nCoh / 30.0, 0.0, 1.0);
  let vortAvg = vortSum / max(nAli, 1.0);
  let vortColor = clamp(0.5 + vortAvg * (P.rCoh / max(P.maxSpeed, 1e-6)) * 1.5, 0.0, 1.0);
  // fin2 NaN/Inf output guard (bitexact): non-finite pos/vel flush to 0, never propagate
  outB[i].pos = fin2(np);
  outB[i].vel = fin2(v);
  outB[i].align = localAlign;
  outB[i].dens = density;
  vortOut[i] = vortColor;`;
export const WGSL_COMPUTE = `
${WGSL_BOID}
${WGSL_PARAMS}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> outB: array<Boid>;
struct Obstacle { ab: vec4<f32>, p0: vec4<f32> };
@group(0) @binding(3) var<uniform> obs: array<Obstacle, 16>;
@group(0) @binding(4) var<storage, read_write> vortOut: array<f32>;
@group(0) @binding(5) var<storage, read> specIn: array<u32>;
@group(0) @binding(6) var<storage, read_write> diagFlags: array<atomic<u32>>; // [0] bit0 = fpSaturated (sticky; JS clears on reseed)
${WGSL_HELPERS}
fn satHit() { atomicOr(&diagFlags[0], 1u); }
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  let n = arrayLength(&inB);
  if (i >= n) { return; }
  let p = inB[i].pos;
  var v = inB[i].vel;
  let hv = max(length(v), 1e-9);
  let hdir = v / hv;
${WGSL_RULE_STATE}
  for (var j: u32 = 0u; j < n; j = j + 1u) {
    if (j == i) { continue; }
${WGSL_RULE_ACCUM}
  }
${WGSL_RULE_INTEGRATE}
}`;
export const WGSL_REDUCE = `
${WGSL_BOID}
${WGSL_PARAMS}
struct RPart { vhx:i32, vhy:i32, px:i32, py:i32, cr:i32, rd:i32, vx:i32, vy:i32, ke:i32, cnt:u32 };
struct RGlobal { comX:f32, comY:f32, cnt:u32, _pad:u32 };
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> partials: array<RPart>;
@group(0) @binding(3) var<storage, read_write> rg: RGlobal;
const RFV: f32 = 1048576.0;    // 2^20: unit velocity, cross  (|sum| <= 256*2^20 = 2^28, fits i32)
const RFP: f32 = 16384.0;      // 2^14: position, dispersion  (|pos| <= ~28 at 1M -> 28*256*2^14 ~ 1.2e8)
const RFS: f32 = 67108864.0;   // 2^26: raw velocity          (|v| <= 0.013*1.7 -> ~3.8e8 worst-case sum)
const RFK: f32 = 268435456.0;  // 2^28: kinetic energy        (0.5|v|^2 <= ~2.5e-4 -> ~1.7e7 sum)
var<workgroup> sV: array<vec2<i32>, 256>;
var<workgroup> sP2: array<vec2<i32>, 256>;
var<workgroup> sC: array<vec2<i32>, 256>;
var<workgroup> sW: array<vec2<i32>, 256>;
var<workgroup> sK: array<vec2<i32>, 256>;
var<workgroup> sPF: array<vec2<f32>, 256>;
var<workgroup> sU: array<u32, 256>;
@compute @workgroup_size(256)
fn reduceOrder(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); let t = lid.x;
  var vh = vec2<i32>(0, 0); var ps = vec2<i32>(0, 0); var cd = vec2<i32>(0, 0); var vw = vec2<i32>(0, 0); var kc = vec2<i32>(0, 0);
  if (i < n) {
    let b = inB[i];
    let spd = max(length(b.vel), 1e-9);
    let u = b.vel / spd;
    vh = vec2<i32>(i32(round(u.x * RFV)), i32(round(u.y * RFV)));
    ps = vec2<i32>(i32(round(b.pos.x * RFP)), i32(round(b.pos.y * RFP)));
    let r = b.pos - vec2<f32>(rg.comX, rg.comY);
    let rl = max(length(r), 1e-9);
    let rh = r / rl;
    cd = vec2<i32>(i32(round((rh.x * u.y - rh.y * u.x) * RFV)), i32(round(rl * RFP)));
    vw = vec2<i32>(i32(round(b.vel.x * RFS)), i32(round(b.vel.y * RFS)));
    kc = vec2<i32>(i32(round(0.5 * dot(b.vel, b.vel) * RFK)), 1);
  }
  sV[t] = vh; sP2[t] = ps; sC[t] = cd; sW[t] = vw; sK[t] = kc;
  var s = 128u;
  loop {
    if (s == 0u) { break; }
    workgroupBarrier();
    if (t < s) { sV[t] += sV[t+s]; sP2[t] += sP2[t+s]; sC[t] += sC[t+s]; sW[t] += sW[t+s]; sK[t] += sK[t+s]; }
    s = s >> 1u;
  }
  workgroupBarrier();
  if (t == 0u) {
    partials[wid.x] = RPart(sV[0].x, sV[0].y, sP2[0].x, sP2[0].y, sC[0].x, sC[0].y, sW[0].x, sW[0].y, sK[0].x, u32(sK[0].y));
  }
}
@compute @workgroup_size(256)
fn finalizeCom(@builtin(local_invocation_id) lid: vec3<u32>) {
  let t = lid.x;
  var ps = vec2<f32>(0.0, 0.0);
  var cnt = 0u;
  var k = t;
  let m = arrayLength(&partials);
  loop {
    if (k >= m) { break; }
    let p = partials[k];
    ps = ps + vec2<f32>(f32(p.px), f32(p.py));
    cnt = cnt + p.cnt;
    k = k + 256u;
  }
  sPF[t] = ps;
  sU[t] = cnt;
  var s = 128u;
  loop {
    if (s == 0u) { break; }
    workgroupBarrier();
    if (t < s) {
      sPF[t] = sPF[t] + sPF[t+s];
      sU[t] = sU[t] + sU[t+s];
    }
    s = s >> 1u;
  }
  workgroupBarrier();
  if (t == 0u) {
    let c = max(f32(sU[0]), 1.0);
    rg.comX = sPF[0].x / RFP / c;
    rg.comY = sPF[0].y / RFP / c;
    rg.cnt = sU[0];
    rg._pad = 0u;
  }
}`;
// ---- end of the frozen block -------------------------------------------------

/**
 * The counting-sort wrapper on the shared CountingSort (keys → clear →
 * histogram → scan → scatter, in @bp/gpu), then simSort: each agent walks the
 * 3×3 wrapped block of cells around it as contiguous ranges of `order`.
 * cellOf is v4's, unchanged. Storage buffers: inB outB vortOut specIn
 * diagFlags cellStart order keys = 8 (the WebGPU default per-stage limit);
 * cellKeys and simSort get their own explicit layouts.
 */
export const WGSL_SORT_V2 = `
${WGSL_BOID}
${WGSL_PARAMS}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> outB: array<Boid>;
struct Obstacle { ab: vec4<f32>, p0: vec4<f32> };
@group(0) @binding(3) var<uniform> obs: array<Obstacle, 16>;
@group(0) @binding(4) var<storage, read_write> vortOut: array<f32>;
@group(0) @binding(5) var<storage, read> specIn: array<u32>;
@group(0) @binding(6) var<storage, read_write> diagFlags: array<atomic<u32>>; // [0] bit0 = fpSaturated (sticky; cleared on reseed)
@group(0) @binding(7) var<storage, read> cellStart: array<u32>;   // CountingSort: keyCount + 1 bucket offsets
@group(0) @binding(8) var<storage, read> order: array<u32>;       // CountingSort: agent indices grouped by cell
@group(0) @binding(9) var<storage, read_write> keys: array<u32>;  // cellKeys: one cell index per agent
${WGSL_HELPERS}
fn satHit() { atomicOr(&diagFlags[0], 1u); }
fn cellOf(pp: vec2<f32>) -> u32 {
  let cols = u32(P.gridCols);
  let cx = u32(clamp(floor((pp.x + P.halfW) / P.cellX), 0.0, P.gridCols - 1.0));
  let cy = u32(clamp(floor((pp.y + P.halfH) / P.cellY), 0.0, P.gridRows - 1.0));
  return cy * cols + cx;
}
// ---- keys for the shared counting sort ----
@compute @workgroup_size(256)
fn cellKeys(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); if (i >= n) { return; }
  keys[i] = cellOf(inB[i].pos);
}
// ---- sim: walk the 3x3 wrapped cell block as contiguous sorted ranges ----
@compute @workgroup_size(256)
fn simSort(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); if (i >= n) { return; }
  let p = inB[i].pos;
  var v = inB[i].vel;
  let hv = max(length(v), 1e-9);
  let hdir = v / hv;
${WGSL_RULE_STATE}
  let cols = i32(P.gridCols); let rows = i32(P.gridRows);
  let gx = i32(clamp(floor((p.x + P.halfW) / P.cellX), 0.0, P.gridCols - 1.0));
  let gy = i32(clamp(floor((p.y + P.halfH) / P.cellY), 0.0, P.gridRows - 1.0));
  for (var oy = -1; oy <= 1; oy = oy + 1) {
    var yy = gy + oy;
    if (rows >= 3) { if (yy < 0) { yy = yy + rows; } else if (yy >= rows) { yy = yy - rows; } } else { if (yy < 0 || yy >= rows) { continue; } }
    for (var ox = -1; ox <= 1; ox = ox + 1) {
      var xx = gx + ox;
      if (cols >= 3) { if (xx < 0) { xx = xx + cols; } else if (xx >= cols) { xx = xx - cols; } } else { if (xx < 0 || xx >= cols) { continue; } }
      let c = u32(yy * cols + xx);
      let start = cellStart[c];
      let end = cellStart[c + 1u];
      for (var s = start; s < end; s = s + 1u) {
        let j = order[s];
        if (j == i) { continue; }
${WGSL_RULE_ACCUM}
      }
    }
  }
${WGSL_RULE_INTEGRATE}
}`;
