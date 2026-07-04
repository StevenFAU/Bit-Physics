// Physarum presentation shader v2 (verification-demo-spec § 3.4).
//
// Presentation-only: reads the kernel-owned trail buffer and a render-owned
// snapshot of the deposit channel through read-only bindings and draws one
// fullscreen triangle. The gate consumes buffer readbacks, never pixels, so
// nothing here can perturb it. Principle (spec § 3.4): every luminous element
// is bound to a physical quantity — no arbitrary bloom.
//
//   - bilinear reconstruction of the trail (the honest premium look for a
//     CONTINUOUS concentration field; raw_grid = 1 restores nearest texels)
//   - concentration colormap via the shared module (cmap_sample appended at
//     pipeline build by emitColormapWgsl)
//   - gradient-lit relief: the trail's own log-brightness gradient drives cheap
//     emboss lighting — veins rise into glowing ridges (data-derived, no
//     re-implementation of the kernel)
//   - flow layer: the render-owned snapshot of the u32 deposit channel (copied
//     after the agents pass, before apply clears it) — where agents are moving
//     right now, the living pulse of the network
//   - inspection lens: pointer-following magnifier reading local trail values

struct RP {
  n: f32,          // grid side (cells)
  raw_grid: f32,   // 1 = nearest texels, relief/flow bypassed
  relief: f32,     // 0..1 relief-lighting gain
  flow: f32,       // 0..1 flow-layer gain
  lens_x: f32,     // lens center, framebuffer px
  lens_y: f32,
  lens_r: f32,     // lens radius, framebuffer px (0 = lens off)
  lens_zoom: f32,
  res_x: f32,      // framebuffer size, px
  res_y: f32,
  exposure: f32,   // tonemap exposure
  gain: f32,       // trail log-brightness gain (density-adaptive)
  cmap: array<vec4<f32>, 8>,
  cmap_meta: vec4<f32>,
};

@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> trail: array<f32>;
@group(0) @binding(2) var<storage, read> flow: array<u32>;

const DEP_SCALE: f32 = 65536.0;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = 0.5 * (p[vi] + vec2<f32>(1.0, 1.0));
  return o;
}

fn wrap_i(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

// trail T[x*H + y]; the fragment maps uv.x -> x, (1-uv.y) -> y (screen top = y 0)
fn trail_at(ix: i32, iy: i32) -> f32 {
  let n = i32(rp.n);
  return trail[u32(wrap_i(ix, n)) * u32(rp.n) + u32(wrap_i(iy, n))];
}

fn flow_at(ix: i32, iy: i32) -> f32 {
  let n = i32(rp.n);
  return f32(flow[u32(wrap_i(ix, n)) * u32(rp.n) + u32(wrap_i(iy, n))]) / DEP_SCALE;
}

fn bright(t: f32) -> f32 {
  return clamp(log(1.0 + max(t, 0.0)) * rp.gain, 0.0, 1.0);
}

// bilinear trail at grid coords (gx, gy) in cell units (cell centres at .5)
fn trail_bilinear(gx: f32, gy: f32) -> f32 {
  let qx = gx - 0.5;
  let qy = gy - 0.5;
  let i0 = i32(floor(qx));
  let j0 = i32(floor(qy));
  let fx = qx - floor(qx);
  let fy = qy - floor(qy);
  let t00 = trail_at(i0, j0);
  let t10 = trail_at(i0 + 1, j0);
  let t01 = trail_at(i0, j0 + 1);
  let t11 = trail_at(i0 + 1, j0 + 1);
  return mix(mix(t00, t10, fx), mix(t01, t11, fx), fy);
}

fn shade(gx: f32, gy: f32) -> vec3<f32> {
  let t = select(trail_bilinear(gx, gy), trail_at(i32(gx), i32(gy)), rp.raw_grid > 0.5);
  let b = bright(t);
  var col = cmap_sample(b);

  if (rp.raw_grid < 0.5) {
    // --- gradient-lit relief: emboss from the trail's own brightness field ---
    if (rp.relief > 0.001) {
      let ix = i32(gx);
      let iy = i32(gy);
      let bl = bright(trail_at(ix - 1, iy));
      let br = bright(trail_at(ix + 1, iy));
      let bd = bright(trail_at(ix, iy - 1));
      let bu = bright(trail_at(ix, iy + 1));
      let hscale = 2.4;
      let nrm = normalize(vec3<f32>(-(br - bl) * hscale, -(bu - bd) * hscale, 1.0));
      let ldir = normalize(vec3<f32>(-0.45, -0.6, 0.66));
      let lambert = clamp(dot(nrm, ldir), 0.0, 1.0);
      let spec = pow(lambert, 22.0);
      col = col * (0.72 + 0.5 * lambert * rp.relief) + cmap_sample(0.95) * spec * rp.relief * 0.55;
    }
    // --- flow layer: the live deposit pulse, in-family warm ------------------
    if (rp.flow > 0.001) {
      let fv = flow_at(i32(gx), i32(gy));
      let g = clamp(fv * 0.22, 0.0, 1.0);
      col += rp.flow * g * cmap_sample(0.88) * 0.9;
    }
  }
  return col;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let n = rp.n;
  let res = vec2<f32>(rp.res_x, rp.res_y);
  let px = in.pos.xy;
  // fragment -> grid: uv.x -> x, (1 - uv.y) -> y
  let gx = clamp(in.uv.x, 0.0, 0.99999) * n;
  let gy = clamp(1.0 - in.uv.y, 0.0, 0.99999) * n;

  // --- inspection lens: magnify the local trail ----------------------------
  let lens_on = rp.lens_r > 0.5;
  let lens_c = vec2<f32>(rp.lens_x, rp.lens_y);
  let lens_d = distance(px, lens_c);
  if (lens_on && lens_d < rp.lens_r) {
    let cu = clamp(rp.lens_x / res.x, 0.0, 0.99999) * n;
    let cv = clamp(1.0 - rp.lens_y / res.y, 0.0, 0.99999) * n;
    let lx = cu + (gx - cu) / rp.lens_zoom;
    let ly = cv + (gy - cv) / rp.lens_zoom;
    var col = shade(lx, ly);
    let rim = smoothstep(rp.lens_r - 2.5, rp.lens_r - 0.5, lens_d);
    col = mix(col, cmap_sample(0.9), rim * 0.6);
    let m = vec3<f32>(1.0) - exp(-col * rp.exposure);
    return vec4<f32>(pow(m, vec3<f32>(1.0 / 2.2)), 1.0);
  }

  let col = shade(gx, gy);
  let mapped = vec3<f32>(1.0) - exp(-col * rp.exposure);
  return vec4<f32>(pow(mapped, vec3<f32>(1.0 / 2.2)), 1.0);
}
