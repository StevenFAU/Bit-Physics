// Mandelbulb sphere-tracing display shader (visual only).
//
// Ray-marches the Quilez p8 distance estimator for an orbiting camera. The DE
// here mirrors ../../src/mandelbulb_de.wgsl (the gate/capture shader); display
// fidelity — not canonical agreement — is its job, so the iteration count is
// raised for smoother surfaces. The capture-export path uses the committed
// mandelbulb_de.wgsl compute kernel, which is what the wgpu-native gate runs.

struct RU { aspect: f32, angle: f32, _p0: f32, _p1: f32, };
@group(0) @binding(0) var<uniform> ru: RU;

const P: f32 = 8.0;
const ER: f32 = 2.0;
const NMAX: u32 = 24u;
const TINY: f32 = 1.0e-30;

fn pow_z(z: vec3<f32>, p: f32) -> vec3<f32> {
  let r2 = dot(z, z);
  if (r2 < TINY) { return vec3<f32>(0.0); }
  let r = sqrt(r2);
  let theta = acos(z.z / r);
  let phi = atan2(z.y, z.x);
  let rp = pow(r, p);
  return vec3<f32>(rp * sin(p * theta) * cos(p * phi),
                   rp * sin(p * theta) * sin(p * phi),
                   rp * cos(p * theta));
}

fn de(c: vec3<f32>) -> f32 {
  var z = c;
  var dz: f32 = 1.0;
  let er2 = ER * ER;
  for (var i: u32 = 0u; i < NMAX; i = i + 1u) {
    let r2 = dot(z, z);
    if (r2 > er2) {
      let r = sqrt(r2);
      return 0.5 * r * log(r) / dz;
    }
    let r = select(0.0, sqrt(r2), r2 > 0.0);
    dz = P * pow(r, P - 1.0) * dz + 1.0;
    z = pow_z(z, P) + c;
  }
  return 0.0;
}

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = p[vi];
  return o;
}

fn normal(p: vec3<f32>) -> vec3<f32> {
  let e = vec2<f32>(0.0008, 0.0);
  return normalize(vec3<f32>(
    de(p + e.xyy) - de(p - e.xyy),
    de(p + e.yxy) - de(p - e.yxy),
    de(p + e.yyx) - de(p - e.yyx)));
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let uv = vec2<f32>(in.uv.x * ru.aspect, in.uv.y);
  let a = ru.angle;
  let ro = vec3<f32>(2.4 * sin(a), 0.9, 2.4 * cos(a));
  let ta = vec3<f32>(0.0, 0.0, 0.0);
  let ww = normalize(ta - ro);
  let uu = normalize(cross(ww, vec3<f32>(0.0, 1.0, 0.0)));
  let vv = cross(uu, ww);
  let rd = normalize(uv.x * uu + uv.y * vv + 1.6 * ww);

  var t: f32 = 0.0;
  var hit = false;
  for (var i: u32 = 0u; i < 96u; i = i + 1u) {
    let p = ro + rd * t;
    let d = de(p);
    if (d < 0.0008 * t) { hit = true; break; }
    t = t + max(d, 0.0006);
    if (t > 6.0) { break; }
  }
  if (!hit) {
    let g = 0.5 + 0.5 * in.uv.y;
    return vec4<f32>(0.02 * g, 0.03 * g, 0.05 * g, 1.0);
  }
  let p = ro + rd * t;
  let n = normal(p);
  let lit = clamp(dot(n, normalize(vec3<f32>(0.6, 0.8, 0.4))), 0.0, 1.0);
  let base = 0.5 + 0.5 * n;
  let col = base * (0.25 + 0.85 * lit);
  return vec4<f32>(pow(col, vec3<f32>(0.85)), 1.0);
}
