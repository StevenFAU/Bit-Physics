// Murmuration — the flock as a medium (07-boids-3d.md, "The look"). Each
// bird adds its projected coverage to an optical-depth buffer τ, one u32 per
// pixel in fixed point (atomicAdd: exact, and the same sum in any order);
// composite.wgsl then lets the sky through as exp(−τ). Dense regions go near
// black, thin edges become lace.
//
// A bird is modelled as a flat 3D Gaussian (its wingspan, body length and
// thickness as ±2σ, banked by its roll), which projects to a 2D Gaussian with
// covariance Σ = J Σ₃ Jᵀ. Its coverage — the area it hides, in px² — is
// 2π·√det Σ times a planform factor, so it shrinks as the bird turns edge-on
// and grows as it banks towards you. The footprint is that Gaussian widened
// by a pixel filter (σ ≥ 0.75 px, added in quadrature), so a bird smaller
// than a pixel still spreads over a few pixels and slides smoothly between
// them. And the weights are normalised by their sum over the very pixels
// written, so the τ a bird adds is exactly its coverage wherever it sits:
// the total cannot flicker as birds cross pixel boundaries (measured in the
// acceptance run with a slow dolly). `mode` 1 is the control for that
// measurement: analytic normalisation, no discrete sum.
#import bp/view3d

struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

struct Splat {
  // x = wingspan, y = body length, z = thickness (model units), w = planform factor × ink
  shape: vec4<f32>,
  // x = pixel-filter σ (px), y = largest footprint σ (px), z = fixed-point scale, w = mode (0 shipped, 1 analytic)
  foot: vec4<f32>,
  // x = birds, y = target width (px), z = target height (px), w = unused
  counts: vec4<u32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> S: Splat;
@group(0) @binding(2) var<storage, read> agents: array<Agent>;
@group(0) @binding(3) var<storage, read_write> tau: array<atomic<u32>>;

fn to_px(p: vec3<f32>) -> vec3<f32> {
  let c = V.mvp * vec4<f32>(p, 1.0);
  return vec3<f32>(view3d_to_px(c, V.viewport), c.w);
}

@compute @workgroup_size(64)
fn splat(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= S.counts.x) { return; }
  let a = agents[i];
  let p = a.position_speed.xyz;
  let c0 = to_px(p);
  if (c0.z < V.proj.z * 2.0) { return; }

  // the bird's banked frame (v1's bird.wgsl basis_transform)
  let h = normalize(a.heading_roll.xyz);
  var right = cross(vec3<f32>(0.0, 1.0, 0.0), h);
  if (dot(right, right) < 1e-6) { right = vec3<f32>(1.0, 0.0, 0.0); }
  right = normalize(right);
  var up = normalize(cross(h, right));
  let cr = cos(a.heading_roll.w);
  let sr = sin(a.heading_roll.w);
  let rr = right * cr + up * sr;
  up = up * cr - right * sr;

  // projected σ-axes: half of the screen span of each ±σ segment
  let sw = rr * (S.shape.x * 0.25);
  let sf = h * (S.shape.y * 0.25);
  let su = up * (S.shape.z * 0.25);
  let jw = (to_px(p + sw).xy - to_px(p - sw).xy) * 0.5;
  let jf = (to_px(p + sf).xy - to_px(p - sf).xy) * 0.5;
  let ju = (to_px(p + su).xy - to_px(p - su).xy) * 0.5;
  var sxx = jw.x * jw.x + jf.x * jf.x + ju.x * ju.x;
  var syy = jw.y * jw.y + jf.y * jf.y + ju.y * ju.y;
  var sxy = jw.x * jw.y + jf.x * jf.y + ju.x * ju.y;
  // coverage (px²): 2π √det of the bird's own projected Gaussian
  let det0 = max(sxx * syy - sxy * sxy, 0.0);
  let cover = 6.2831853 * sqrt(det0) * S.shape.w;
  if (cover <= 0.0) { return; }

  // the footprint: add the pixel filter, cap the size (near birds are M1's meshes)
  let f2 = S.foot.x * S.foot.x;
  sxx += f2;
  syy += f2;
  let tr = 0.5 * (sxx + syy);
  let big = tr + sqrt(max(tr * tr - (sxx * syy - sxy * sxy), 0.0));
  let cap = S.foot.y * S.foot.y;
  if (big > cap) {
    let k = cap / big;
    sxx *= k;
    syy *= k;
    sxy *= k;
  }
  let det = max(sxx * syy - sxy * sxy, 1e-12);
  let ixx = syy / det;
  let iyy = sxx / det;
  let ixy = -sxy / det;

  let hx = i32(ceil(3.0 * sqrt(sxx)));
  let hy = i32(ceil(3.0 * sqrt(syy)));
  let cx = c0.x;
  let cy = c0.y;
  let x0 = i32(floor(cx)) - hx;
  let y0 = i32(floor(cy)) - hy;
  let w = i32(S.counts.y);
  let ht = i32(S.counts.z);
  if (x0 + 2 * hx + 1 < 0 || y0 + 2 * hy + 1 < 0 || x0 >= w || y0 >= ht) { return; }

  // the weights' sum over the pixels written (the whole box, on screen or not)
  var norm = 0.0;
  if (S.foot.w < 0.5) {
    for (var y = y0; y <= y0 + 2 * hy + 1; y = y + 1) {
      let dy = f32(y) + 0.5 - cy;
      for (var x = x0; x <= x0 + 2 * hx + 1; x = x + 1) {
        let dx = f32(x) + 0.5 - cx;
        norm += exp(-0.5 * (ixx * dx * dx + 2.0 * ixy * dx * dy + iyy * dy * dy));
      }
    }
  } else {
    norm = 6.2831853 * sqrt(det);
  }
  if (norm <= 0.0) { return; }
  let amp = cover / norm * S.foot.z;

  for (var y = max(y0, 0); y <= min(y0 + 2 * hy + 1, ht - 1); y = y + 1) {
    let dy = f32(y) + 0.5 - cy;
    for (var x = max(x0, 0); x <= min(x0 + 2 * hx + 1, w - 1); x = x + 1) {
      let dx = f32(x) + 0.5 - cx;
      let g = exp(-0.5 * (ixx * dx * dx + 2.0 * ixy * dx * dy + iyy * dy * dy));
      let q = u32(amp * g + 0.5);
      if (q > 0u) { atomicAdd(&tau[u32(y * w + x)], q); }
    }
  }
}
