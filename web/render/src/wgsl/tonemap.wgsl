// bp/tonemap — display transforms for the HDR composite (00-foundation.md § 3.1).

/// Khronos PBR Neutral (Khronos 3D Formats WG, 2024). Identity below the
/// compression knee, so colormapped fields keep their hue and value; only
/// highlights above ~0.76 roll off, desaturating towards white.
fn tonemap_neutral(c_in: vec3<f32>) -> vec3<f32> {
  let start_compression = 0.8 - 0.04;
  let desaturation = 0.15;
  var c = c_in;
  let x = min(c.r, min(c.g, c.b));
  let offset = select(0.04, x - 6.25 * x * x, x < 0.08);
  c = c - vec3<f32>(offset);
  let peak = max(c.r, max(c.g, c.b));
  if (peak < start_compression) {
    return c;
  }
  let d = 1.0 - start_compression;
  let new_peak = 1.0 - d * d / (peak + d - start_compression);
  c = c * (new_peak / peak);
  let g = 1.0 - 1.0 / (desaturation * (peak - new_peak) + 1.0);
  return mix(c, vec3<f32>(new_peak), g);
}

/// AgX-style log-sigmoid for emissive scenes (fire, glow, sky). Our own
/// implementation of the idea — a log2 encoding over a fixed EV window, a
/// smooth S-curve, and highlight desaturation — not Blender's LUT.
fn tonemap_agx(c_in: vec3<f32>) -> vec3<f32> {
  let min_ev = -10.0;
  let max_ev = 6.5;
  // gentle inset: pull channels towards their mean so bright saturated
  // light bleaches to white instead of clipping one channel
  let m = (c_in.r + c_in.g + c_in.b) / 3.0;
  let inset = mix(c_in, vec3<f32>(m), 0.12);
  let v = clamp((log2(max(inset, vec3<f32>(1e-10))) - min_ev) / (max_ev - min_ev), vec3<f32>(0.0), vec3<f32>(1.0));
  // smooth S-curve with a long toe and shoulder
  let s = v * v * v * (v * (v * 6.0 - 15.0) + 10.0);
  let curve = mix(v, s, 0.55);
  // undo the encoding's grey offset (middle grey 0.18 lands near 0.42)
  return clamp(pow(curve, vec3<f32>(2.2)) * 1.08, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn srgb_oetf(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}
